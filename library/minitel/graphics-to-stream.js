"use strict"
/**
 * @file graphics-to-stream.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */ 
var Minitel = Minitel || {}

/** 
 * Convert a mosaic image in an encoded string to a Minitel Stream
 * @param {string} string Encoded string of the image
 * @param {number} col Starting column
 * @param {number} row Starting row
 * @return {Stream} The Minitel Stream
 */
Minitel.graphicsToStream = function(string, col, row) {
    /** 
     * Find the most frequent pixel kind occuring by comparing them with a hash
     * function.
     * @param {Pixel[]} pixels An array of Pixel where to look at
     * @param {} hashFunc A function which takes a Pixel as parameter
     * @return {Pixel} The most frequent pixel
     */
    function mostFrequent(pixels, hashFunc) {
        const counts = []
        let bestPixel = undefined
        let bestCount = 0

        for(let pixel of pixels) {
            const hash = hashFunc(pixel)
            if(hash === undefined) continue

            if(counts[hash]) {
                counts[hash]++
            } else {
                counts[hash] = 1
            }

            if(counts[hash] > bestCount) {
                bestCount = counts[hash]
                bestPixel = pixel
            }

            if(bestCount >= pixels.length / 2) break
        }        

        return bestPixel
    }

    /**
     * Find the most used colors and attributes
     * @param {Pixel[]} pixels List of pixels to look at
     * @return {Array} List of foreground color, background color, separated
     *                 and blink attributes
     */
    function attributes(pixels) {
        // Find pixels which are disjoint and for which foreground color is
        // different from the background color
        const separated = pixels.find(pixel => {
            return pixel.separated && (pixel.color !== pixel.back)
        })

        // Find pixels which are blinking
        const blink = pixels.find(pixel => { return pixel.blink })

        let [ foreground, background ] = [ 7, 0 ]

        if(separated) {
            // Find foreground color of the most frequent separated pixels
            foreground = mostFrequent(pixels, pixel => {
                return pixel.separated && (pixel.color !== pixel.back)
                     ? pixel.color : undefined
            }).color

            // Find background color of the most frequent separated pixels
            background = mostFrequent(pixels, pixel => {
                return pixel.separated ? pixel.back : pixel.color
            })
            
            if(background.separated) {
                background = background.back
            } else {
                background = background.color
            }
        } else if(blink) {
            // Find foreground color of the most frequent blinking pixels
            foreground = mostFrequent(pixels, pixel => {
                return pixel.blink ? pixel.color : undefined
            }).color

            // Find background color of the most frequent blinking pixels
            background = mostFrequent(pixels, pixel => {
                return pixel.color === foreground ? undefined : pixel.color
            })

            if(background === undefined) {
                background = 0
            } else {
                background = background.color
            }
        } else {
            // Find background color of the most frequent pixels
            background = mostFrequent(pixels, pixel => {
                return pixel.color
            }).color

            // Find foreground color of the most frequent pixels
            foreground = mostFrequent(pixels, pixel => {
                return pixel.color === background ? undefined : pixel.color
            })

            if(foreground === undefined) {
                foreground = 7
            } else {
                foreground = foreground.color
            }
        }        

        return [ foreground, background, separated, blink ]
    }

    /**
     * Converts a sextet to a list of Videotex codes
     * @param {Pixel[]} sextet 6 pixels to convert
     * @return {number[]} Videotex codes
     */
    function sextetToChar(sextet) {
        // If all pixels are transparent, returns the Videotex code for right
        if(sextet.every(pixel => { return pixel.transparent })) return [0x09]

        // Find the best colors and attributes
        const [ foreground, background, separated, blink ] = attributes(sextet)

        // The character code is based on a 6 bits value representing set or
        // unset pixels.
        const charCode = sextet.reduce((code, pixel, position) => {
            if(separated && !pixel.separated) {
                // Do not set the pixel
                return code
            }

            if(pixel.color !== background) {
                // Set the pixel
                return code | (1 << position)
            }

            return code
        }, 0)

        return [
            0x1b, 0x40 + foreground,
            0x1b, 0x50 + background,
            0x1b, separated ? 0x5a : 0x59,
            0x1b, blink ? 0x48 : 0x49,
            0x20 + charCode
        ]
    }

    /**
     * Convert an encoded string to an array of pixels
     * @param {string} string The encoded string
     * @return {Pixel[][]} The pixels
     */
    function stringToPixels(string) {
        // Characters used to encode pixel values
        const codeChars = "abcdefghijklmnopqrstuvwxyz012345"

        const rows = []
        let row = []

        // Read two characters by two characters
        range(0, string.length, 2).forEach(i => {
            // Merge two characters into a 9 bits value
            const value = codeChars.indexOf(string[i])
                        | (codeChars.indexOf(string[i + 1]) << 5)

            // Extract colors and attributes from the 9 bits value
            row.push({
                color: value & 0x100 ? 0 : value & 0x7,
                back: value & 0x100 ? 0 : (value & 0x38) >> 3,
                separated: value & 0x40 ? true : false,
                blink: value & 0x80 ? true : false,
                transparent: value & 0x100 ? true : false
            })

            if(row.length === 80) {
                rows.push(row)
                row = []
            }
        })

        return rows
    }

    /**
     * Group pixels by sextet
     * @param {Pixel[][]} pixels The pixels to group
     * @return {Pixel[][]} Pixels organized by sextet
     */
    function pixelsToSextets(pixels) {
        const rows = []
        range(0, pixels.length, 3).forEach(y => {
            const row = []
            range(0, pixels[y].length, 2).forEach(x => {
                row.push([
                    pixels[y][x], pixels[y][x + 1],
                    pixels[y + 1][x], pixels[y + 1][x + 1],
                    pixels[y + 2][x], pixels[y + 2][x + 1],
                ])
            })
            rows.push(row)
        })

        return rows
    }

    const stream = new Minitel.Stream()

    if(string === undefined) return stream

    // Old format uses one characters per pixel
    if(string.length === 80 * 72) string = MosaicMemory.oldToNewFormat(string)

    // New format uses two characters per pixel
    if(string.length !== 80 * 72 * 2) return stream

    const sextets = pixelsToSextets(stringToPixels(string))

    range(25 - row).forEach(y => {
        // Converts pixels to mosaic characters
        let codes = new Minitel.Stream()
        range(0, 40 - col).forEach(x => {
            codes.push(sextetToChar(sextets[y][x]))
        })

        codes = codes.optimizeRow(true).trimRow()

        // Get rid of empty characters at the beginning
        let startX = 0
        while(codes.length > 0 && codes.items[0] === 0x09) {
            startX++
            codes.shift()
        }

        if(codes.length === 0) return;

        stream.push([
            0x1f,
            0x40 + y + row,
            0x40 + col + startX + 1,
            0x0e,
            codes
        ])
    })

    return stream
}

