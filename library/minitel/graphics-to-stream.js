"use strict"
var Minitel = Minitel || {}

Minitel.graphicsToStream = function(string, col, row) {
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

    function attributes(pixels) {
        const separated = pixels.find(pixel => {
            return pixel.separated && (pixel.color !== pixel.back)
        })

        const blink = pixels.find(pixel => { return pixel.blink })

        let [ foreground, background ] = [ 7, 0 ]

        if(separated) {
            foreground = mostFrequent(pixels, pixel => {
                return pixel.separated && (pixel.color !== pixel.back)
                     ? pixel.color : undefined
            }).color

            background = mostFrequent(pixels, pixel => {
                return pixel.separated ? pixel.back : pixel.color
            })
            
            if(background.separated) {
                background = background.back
            } else {
                background = background.color
            }
        } else if(blink) {
            foreground = mostFrequent(pixels, pixel => {
                return pixel.blink ? pixel.color : undefined
            }).color

            background = mostFrequent(pixels, pixel => {
                return pixel.color === foreground ? undefined : pixel.color
            })

            if(background === undefined) {
                background = 0
            } else {
                background = background.color
            }
        } else {
            background = mostFrequent(pixels, pixel => {
                return pixel.color
            }).color

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

    function sextetToChar(sextet) {
        if(sextet.every(pixel => { return pixel.transparent })) return [0x09]

        const [ foreground, background, separated, blink ] = attributes(sextet)

        const charCode = sextet.reduce((code, pixel, position) => {
            if(separated && !pixel.separated) return code
            if(pixel.color !== background) return code | (1 << position)
            return code
        }, 0)

        const sequence = []
        sequence.push(0x1b, 0x40 + foreground)
        sequence.push(0x1b, 0x50 + background)
        sequence.push(0x1b, separated ? 0x5a : 0x59)
        sequence.push(0x1b, blink ? 0x48 : 0x49)
        sequence.push(0x20 + charCode)

        return sequence
    }

    function stringToPixels(string) {
        const codeChars = "abcdefghijklmnopqrstuvwxyz012345"

        const rows = []
        let row = []

        for(i = 0; i < string.length; i+= 2) {
            const value = codeChars.indexOf(string[i])
                        | (codeChars.indexOf(string[i + 1]) << 5)

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
        }

        return rows
    }

    function pixelsToSextets(pixels) {
        const rows = []
        for(let y = 0; y < pixels.length; y += 3) {
            const row = []
            for(let x = 0; x < pixels[y].length; x += 2) {
                row.push([
                    pixels[y][x], pixels[y][x + 1],
                    pixels[y + 1][x], pixels[y + 1][x + 1],
                    pixels[y + 2][x], pixels[y + 2][x + 1],
                ])
            }
            rows.push(row)
        }

        return rows
    }

    const stream = new Minitel.Stream()

    if(string === undefined) return stream
    if(string.length === 80 * 72) string = MosaicMemory.oldToNewFormat(string)
    if(string.length !== 80 * 72 * 2) return stream

    const sextets = pixelsToSextets(stringToPixels(string))

    for(let y = 0; y <= 24 - row; y++) {
        // Converts pixels to mosaic characters
        let codes = new Minitel.Stream()
        for(let x = 0; x < 40 - col; x++) {
            codes.push(sextetToChar(sextets[y][x]))
        }

        codes = codes.optimizeRow(true).trimRow()

        // Get rid of empty characters at the beginning
        let startX = 0
        while(codes.length > 0 && codes.items[0] === 0x09) {
            startX++
            codes.shift()
        }

        if(codes.length === 0) continue

        stream.push([
            0x1f,
            0x40 + y + row,
            0x40 + col + startX + 1,
            0x0e,
            codes
        ])
    }

    return stream
}

