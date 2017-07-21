"use strict"
var Minitel = Minitel || {}

/** 
 * Convert a Ceefax row to a Minitel row
 * @param {number[]} row Ceefax codes for one row
 * @return {Stream}
 */
Minitel.convertCeefaxRow = function(row) {
    /**
     * Generates code for attributes setting
     * @param {number[]} array Array on which codes will be pushed
     * @param {number} fg Foreground color (0-7)
     * @param {number} bg Background color (0-7)
     * @param {boolean} sep Separated or not
     */
    function setColors(array, fg, bg, sep) {
        array.push([0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x59 + (sep ? 1 : 0)])
    }

    const destination = new Minitel.Stream()
    let gfx = false
    let sep = false
    let fg = 7
    let bg = 0
    let hold = false
    let held = 0x20

    // Each line in Teletext starts with default attributes
    destination.push([0x1b, 0x47, 0x1b, 0x50, 0x0f])

    // If an empty row, go to next row
    if(row.length === 0) {
        destination.push(0x0d, 0x0a)
        return destination
    }

    for(let c of row) {
        const control = []

        switch(c) {
            // Set text mode and color
            case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06:
            case 0x07:
                gfx = false
                fg = c
                control.push(0x0f)
                setColors(control, fg, bg, sep && gfx)
                break

            case 0x08: case 0x09: case 0x0b: case 0x0c: case 0x0d:
                control.push(0x1b, 0x40 + c)
                break

            // Ignore...
            case 0x0a: case 0x0e: case 0x0f: break

            // Set graphics mode and color
            case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
            case 0x16: case 0x17:
                gfx = true
                fg = c - 0x10
                control.push(0x0e)
                setColors(control, fg, bg, sep && gfx)
                break

            case 0x18:
                control.push(0x1b, 0x40 + c)
                break

            // Set continuous graphics
            case 0x19:
                sep = false
                control.push(0x1b, 0x59)
                break

            // Set separated graphics
            case 0x1a:
                sep = true
                control.push(0x1b, 0x5a)
                break

            // Set black background
            case 0x1c:
                bg = 0
                setColors(control, fg, bg, sep && gfx)
                break

            // Swap foreground and background colors
            case 0x1d:
                //[bg, fg] = [fg, bg]
                bg = fg
                setColors(control, fg, bg, sep && gfx)
                break

            // Hold graphics
            case 0x1e:
                hold = true
                break

            // Release graphics            
            case 0x1f:
                hold = false
                break
        }

        // Handles attributes
        if(c < 0x20) {
            if(hold || held != 0x20) {
                if(c === 0x1d || c === 0x1c) {
                    // Swap colors must be applied before held character
                    destination.push(control)
                    destination.push(held)
                } else {
                    // Held character is inserted before new attributes
                    destination.push(held)
                    destination.push(control)
                }
            } else {
                // Apply attributes before space
                destination.push(control)
                destination.push(0x20)
            }

            if(!hold) held = 0x20

            continue
        }

        // Every alpha characters is copied as is
        if(!gfx) {
            destination.push(c)
            continue
        }

        // In graphics mode capital letters are still characters
        if(c >= 0x40 && c <=0x5f) {
            destination.push([0x0f, c, 0x0e])
            if(hold && c & 0x20) held = c
            continue
        }

        // Convert Teletext mosaic chars to Minitel mosaic chars
        if(c >= 0x60) {
            destination.push(c - 0x20)
            if(hold && c & 0x20) held = c - 0x20
            continue
        }

        // Everything else is copied as is
        destination.push(c)
        if(hold && c & 0x20) held = c
    }

    return destination
}

/** 
 * Draw a Ceefax row in an array of numbers
 * @param {number[]} row Ceefax codes for one row
 * @return {number[][]}
 */
Minitel.drawCeefaxRow = function(row) {
    /**
     * Draw a character in the array
     * @param {number[][]} array Array on which pixels will be drawn
     * @param {number} col Column
     * @param {number} fg Foreground color (0-7)
     * @param {number} bg Background color (0-7)
     * @param {boolean} sep Separated or not
     * @param {integer} char Character code
     */
    function drawPixels(array, col, fg, bg, sep, char) {
        const bits = ("000000" + (char - 0x20).toString(2)).slice(-6)
        let pos = 0
        for(let y = 2; y >= 0; y--) {
            for(let x = (col + 1) * 2 - 1; x >= col * 2; x--) {
                array[y][x] = {
                    color: bits[pos] === "0" ? bg : fg,
                    separated: sep
                }

                pos++
            }
        }
    }

    const destination = [[], [], []]
    let gfx = false
    let hold = false
    let held = 0x20

    let next = { fg: 7, bg: 0, sep: false }
    let current = { fg: 7, bg: 0, sep: false }
    let col = -1
    for(let c of row) {
        col++
        switch(c) {
            // Set text mode and color
            case 0x01: case 0x02: case 0x03: case 0x04: case 0x05: case 0x06:
            case 0x07:
                gfx = false
                next.fg = c
                break

            // Ignore...
            case 0x08: case 0x09: case 0x0b: case 0x0c: case 0x0d: break
            case 0x0a: case 0x0e: case 0x0f: break

            // Set graphics mode and color
            case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
            case 0x16: case 0x17:
                gfx = true
                next.fg = c - 0x10
                break

            case 0x18: break

            // Set continuous graphics
            case 0x19:
                next.sep = false
                break

            // Set separated graphics
            case 0x1a:
                next.sep = true
                break

            // Set black background
            case 0x1c:
                next.bg = 0
                break

            // Swap foreground and background colors
            case 0x1d:
                //[next.bg, next.fg] = [next.fg, next.bg]
                next.bg = next.fg
                break

            // Hold graphics
            case 0x1e:
                hold = true
                break

            // Release graphics            
            case 0x1f:
                hold = false
                break
        }

        // Handles attributes
        if(c < 0x20) {
            if(hold || held != 0x20) {
                if(c === 0x1d || c === 0x1c) {
                    // Swap colors must be applied before held character
                    current = { fg: next.fg, bg: next.bg, sep: next.sep }
                    drawPixels(
                        destination,
                        col,
                        current.fg, current.bg, current.sep,
                        held
                    )
                } else {
                    // Held character is inserted before new attributes
                    drawPixels(
                        destination,
                        col,
                        current.fg, current.bg, current.sep,
                        held
                    )
                    current = { fg: next.fg, bg: next.bg, sep: next.sep }
                }
            } else {
                // Apply attributes before space
                current = { fg: next.fg, bg: next.bg, sep: next.sep }
                drawPixels(
                    destination,
                    col,
                    current.fg, current.bg, current.sep,
                    0x20
                )
            }

            if(!hold) held = 0x20

            continue
        }

        // Every alpha characters is ignored
        if(!gfx) {
            drawPixels(
                destination,
                col,
                current.fg, current.bg, current.sep,
                0x20
            )
            continue
        }

        // In graphics mode capital letters are still characters
        if(c >= 0x40 && c <=0x5f) {
            drawPixels(
                destination,
                col,
                current.fg, current.bg, current.sep,
                0x20
            )
            if(hold && c & 0x20) held = c
            continue
        }

        // Convert Teletext mosaic chars to Minitel mosaic chars
        if(c >= 0x60) {
            drawPixels(
                destination,
                col,
                current.fg, current.bg, current.sep,
                c - 0x20
            )
            if(hold && c & 0x20) held = c - 0x20
            continue
        }

        // Everything else is copied as is
        drawPixels(
            destination,
            col,
            current.fg, current.bg, current.sep,
            c
        )
        if(hold && c & 0x20) held = c
    }

    return destination
}


/**
 * @param {string} url URL to decode
 * @return {number[][]} An array of row containing codes
 */
Minitel.decodeEditTfURL = function(url) {
    // Valid headers
    const headerStrings = [
        "http://edit.tf/#",
        "https://edit.tf/#"
    ]

    // Verify the header is valid
    let header = -1
    for(let i = 0; i < headerStrings.length; i++) {
        if(url.startsWith(headerStrings[i])) {
            header = i
            break
        }
    }

    if(header === -1) return null

    url = url.substring(headerStrings[header].length + 2)

    // Convert URL to an array of 6 bits codes
    const src = []
    const base64urlchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                         + "abcdefghijklmnopqrstuvwxyz"
                         + "0123456789-_"
    for(let c of url) src.push(base64urlchars.indexOf(c))

    // Extract 7 bits codes from the 6 bits codes array
    const codes = []
    for(let p = 0; p < src.length; p += 7) {
        for(let i = 1; i < 7 && p + i <= src.length; i++) {
            codes.push((src[p + i - 1] << i | src[p + i] >> (6 - i)) & 0x7f)
        }
    }

    // Split the decoded codes into chunks of 40 codes
    const decoded = []
    for(let i = 0; i < codes.length; i += 40) {
        decoded.push(codes.slice(i, i + 40))
    }

    return decoded
}

Minitel.drawCeefax = function(url) {
    const page = Minitel.decodeEditTfURL(url)

    if(page === null) return null

    // Trim the first line
    page.shift()

    let destination = []
    let ignoreNext = false
    for(let row of page) {
        destination = destination.concat(Minitel.drawCeefaxRow(row))
    }

    return destination
}

Minitel.ceefaxToStream = function(url) {
    const page = Minitel.decodeEditTfURL(url)

    if(page === null) return null

    // Trim the first line
    page.shift()

    const destination = new Minitel.Stream()
    let ignoreNext = false
    for(let row of page) {
        if(ignoreNext) {
            ignoreNext = false
            continue
        }

        if(row.indexOf(0x0d) !== -1) {
            destination.push(Minitel.convertCeefaxRow([]))
            destination.push(Minitel.convertCeefaxRow(row))
            ignoreNext = true
        } else {
            destination.push(Minitel.convertCeefaxRow(row))
        }
    }

    return destination
}
