"use strict"
/**
 * @file actions-to-stream.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * The data object is a dictionary whose keys are identifiers of the tidget
 * form. A tidget form containing a "width" field will give a data object with
 * a width key. Values contained in the dictionary are strings, they need to
 * be converted to number of anything else before using them.
 *
 * @callback actionCallback
 * @param {Stream} stream The Minitel Stream to which add the Videotex codes
 * @param {Object} data Data object
 * @param {?number} offsetX X offset
 * @param {?number} offsetY Y offset
 */

/**
 * Converts an array of actions to a Minitel Stream
 * @param {Action[]} actions Actions to convert
 * @param {?number} offsetX X offset to add to absolute positionning
 * @param {?number} offsetY Y offset to add to absolute positionning
 * @return {Stream} The generated Minitel Stream
 */
Minitel.actionsToStream = function(actions, offsetX, offsetY) {
    if(offsetX === undefined) offsetX = 0
    if(offsetY === undefined) offsetY = 0
    const stream = new Minitel.Stream()

    actions.forEach(action => {
        // Can we easily convert the action?
        if(action.type in Minitel.directStream) {
            stream.push(Minitel.directStream[action.type])
            return
        }

        // Is there a dedicated conversion for this action type?
        if(Minitel.actions[action.type]) {
            Minitel.actions[action.type](stream, action.data, offsetX, offsetY)
            return
        }

        // If the action is not a content group, ignore it
        if(action.type !== "content-group") return

        // Is the content group disabled?
        if(action.data.disabled) return

        // Parse the relative offsets
        const [ relOffsetX, relOffsetY ] = [
            action.data.offsetX, action.data.offsetY
        ].map(v => parseInt(v, 10)
        ).map(v => isNaN(v) ? 0 : v)

        // Recursive call to generate stream from the group children but with
        // specified offsets
        stream.push(Minitel.actionsToStream(
            action.children,
            offsetX + relOffsetX,
            offsetY + relOffsetY
        ))
    })

    return stream
}

/**
 * Action callbacks
 * @member {Object.<string, actionCallback>}
 */
Minitel.actions = {}

/**
 * Handles "content-string" actions. The value should already be ready to be
 * sent in the stream.
 * @function
 */
Minitel.actions["content-string"] = function(stream, data, offsetX) {
    if(data.value === undefined) {
        return
    }

    const unoptimized = new Minitel.Stream()
    unoptimized.push(data.value)

    stream.push(unoptimized.optimizeRow())

    // Should we introduce a line return?
    if(data.return) {
        // Go one row down + Go to the first column
        stream.push([0x0D, 0x0A])

        // Take a possible X offset into account
        stream.push(Array(offsetX).fill(0x09))
    }
}

/**
 * Handles "content-block" actions. It formats a block of text by doing
 * automatic line returns according to the width of the block. It only supports
 * left, center and right alignments at the moment.
 * @function
 */
Minitel.actions["content-block"] = function(stream, data, offsetX, offsetY) {
    if(data.value === undefined || data.align === undefined) return

    // Parse coordinates and dimensions
    const [ relX, relY, width, height ] = [
        data.x, data.y, data.width, data.height
    ].map(v => parseInt(v, 10))

    if([relX, relY, width, height].some(isNaN)) {
        return
    }

    const [x, y] = [offsetX + relX + 1, offsetY + relY]

    // Clean the value. HTML forms work with \r\n convention while we work with
    // \n Unix convention. We also need to replace multiple spaces with one.
    const value = data.value.replace(/\r/g, "").replace(/ +/g, " ")

    splitRows(value, width).slice(0, height).forEach((row, index) => {
        // Do nothing with empty lines
        if(row.length === 0) return

        // Do the alignment
        let px = x
        if(data.align === "center") {
            px += Math.floor((width - row.length) / 2)
        } else if(data.align === "right") {
            px += width - row.length
        }

        // Position the cursor and output the row
        stream.push([0x1f, 0x40 + y + index, 0x40 + px])
        stream.push(row)
    })
}

/**
 * Handles "content-box" actions. It draws a filled rectangle.
 * @function
 */
Minitel.actions["content-box"] = function(stream, data, offsetX, offsetY) {
    // Parse coordinates, dimensions and color
    const [ relX, relY, width, height, bgcolor ] = [
        data.x, data.y, data.width, data.height, data.bgcolor
    ].map(v => parseInt(v, 10))

    if([relX, relY, width, height, bgcolor].some(isNaN)) {
        return
    }

    if(bgcolor < 0 || bgcolor > 7) {
        return
    }

    const [x, y] = [offsetX + relX + 1, offsetY + relY]
    range(y, y + height).forEach(row => {
        stream.push([
            0x1f, 0x40 + row, 0x40 + x,
            0x0e, 0x1b, 0x50 + bgcolor,
            0x20, 0x12, 0x40 + width - 1
        ])
    })
}

/**
 * Handles "content-graphics" actions. Sends a mosaic drawing.
 * @function
 */
Minitel.actions["content-graphics"] = function(stream, data, offsetX, offsetY) {
    if(data.value === undefined) return

    // Parse the coordinates
    const [x, y] = [data.x, data.y].map(v => parseInt(v, 10))
    if([x, y].some(isNaN)) {
        return
    }

    // The value contains an encoded string which is converted to a Minitel
    // stream by a more complex function
    stream.push(Minitel.graphicsToStream(data.value, x + offsetX, y + offsetY))
}

/**
 * Handles "content-ceefax" actions. Sends a mosaic drawing.
 * @function
 */
Minitel.actions["content-ceefax"] = function(stream, data) {
    if(data.value === undefined) {
        return
    }

    // Ceefax drawings are full screen, they cannot be placed elsewhere.
    stream.push([0x1f, 0x41, 0x41])

    // The value contains an encoded string which is converted to a Minitel
    // stream by a more complex function
    stream.push(Minitel.ceefaxToStream(data.value))
}

/**
 * Handles "move-home" actions. It is not handled in a direct stream way in
 * order to take a possible offset in account.
 * @function
 */
Minitel.actions["move-home"] = function(stream, data, offsetX, offsetY) {
    if(offsetX !== 0 || offsetY !== 0) {
        stream.push([0x1f, 0x40 + offsetY, 0x40 + offsetX + 1])
    } else {
        stream.push(0x1e)
    }
}

/**
 * Handles "move-locate" actions. It takes a possible offset into account.
 * @function
 */
Minitel.actions["move-locate"] = function(stream, data, offsetX, offsetY) {
    // Parse the coordinates
    const [x, y] = [data.x, data.y].map(v => parseInt(v, 10))
    if([x, y].some(isNaN)) {
        return
    }

    stream.push([0x1f, 0x40 + y + offsetY, 0x40 + x + offsetX + 1])
}

/**
 * Handles "content-delay" actions. Because the Minitel has no such delay
 * functionality, it is emulated by sending padding characters (0x00).
 * @function
 */
Minitel.actions["content-delay"] = function(stream, data) {
    if(data.value === undefined) return

    stream.push(repeat(0, parseInt(data.value, 10)))
}

/**
 * Handles "drcs-create" actions. Redefines one character.
 * @function
 */
Minitel.actions["drcs-create"] = function(stream, data) {
    if(data.char === undefined) return

    // The character can either be specified as a character or as an ordinal
    const charCode = data.char.length === 1
                   ? data.char.charCodeAt(0)
                   : parseInt(data.char, 10)

    // The character code must be within visual ASCII characters
    if(charCode === undefined || charCode <= 32 || charCode >= 127) return

    // Pixels are contained in checkboxes, we need to extract them.
    const bits = []
    range2([10, 8]).forEach((y, x) => {
        bits.push(data["px-" + x + "-" + y] ? 1 : 0)
    })

    // The character design is pushed 6 bits by 6 bits in the stream
    const sextets = []
    let bitCount = 0
    let sextet = 0
    bits.forEach(bit => {
        sextet = sextet << 1 | bit
        bitCount++
        if(bitCount === 6) {
            sextets.push(0x40 + sextet)
            bitCount = 0
            sextet = 0
        }
    })
    sextets.push(0x40 + (sextet << 4))

    // Remove unnecessary values at the end of the sequence
    while(sextets.length > 0 && sextets[sextets.length - 1] === 0x40) {
        sextets.pop()
    }

    // Two character sets are available
    const charset = data.charset !== "G1" ? 0x42 : 0x43

    // Send all the bytes
    stream.push([0x1f, 0x23, 0x20, 0x20, 0x20, charset, 0x49])
    stream.push([0x1f, 0x23, charCode, 0x30])
    stream.push(sextets)
    stream.push([0x30, 0x1f, 0x41, 0x41])
}

/**
 * Handles "drcs-advanced-start" actions. Initializes character redefinition.
 * @function
 */
Minitel.actions["drcs-advanced-start"] = function(stream, data) {
    // Two character sets are available
    const charset = data.charset !== "G1" ? 0x42 : 0x43
    stream.push([0x1f, 0x23, 0x20, 0x20, 0x20, charset, 0x49])
}

/**
 * Handles "drcs-advanced-char" actions. Set starting character.
 * @function
 */
Minitel.actions["drcs-advanced-char"] = function(stream, data) {
    if(data.char === undefined) return

    // The character can either be specified as a character or as an ordinal
    const charCode = data.char.length === 1
                   ? data.char.charCodeAt(0)
                   : parseInt(data.char, 10)

    // The character code must be within visual ASCII characters
    if(charCode === undefined || charCode <= 32 || charCode >= 127) return

    // Send all the bytes
    stream.push([0x1f, 0x23, charCode, 0x30])
}

/**
 * Handles "drcs-advanced-def" actions. Redefines one character.
 * @function
 */
Minitel.actions["drcs-advanced-def"] = function(stream, data) {
    // Pixels are contained in checkboxes, we need to extract them.
    const bits = []
    range2([10, 8]).forEach((y, x) => {
        bits.push(data["apx-" + x + "-" + y] ? 1 : 0)
    })

    // The character design is pushed 6 bits by 6 bits in the stream
    const sextets = []
    let bitCount = 0
    let sextet = 0
    bits.forEach(bit => {
        sextet = sextet << 1 | bit
        bitCount++
        if(bitCount === 6) {
            sextets.push(0x40 + sextet)
            bitCount = 0
            sextet = 0
        }
    })
    sextets.push(0x40 + (sextet << 4))

    // Remove unnecessary values at the end of the sequence
    while(sextets.length > 0 && sextets[sextets.length - 1] === 0x40) {
        sextets.pop()
    }

    // Send all the bytes
    stream.push(sextets)
    stream.push([0x30])
}

/**
 * Handles "drcs-advanced-end" actions. Ends character redefinition.
 * @function
 */
Minitel.actions["drcs-advanced-end"] = function(stream) {
    stream.push([0x1f, 0x41, 0x41])
}

/**
 * Handles "drcs-black-white" actions. Converts an image into a black and white
 * DRCS image.
 * @function
 */
Minitel.actions["drcs-black-white"] = function(stream, data, offsetX, offsetY) {
    // Parse the coordinates
    const [x, y] = [data.x, data.y].map(v => parseInt(v, 10))
    if([x, y].some(isNaN)) return
    if(data.image === undefined) return

    let drcsImage

    // The image should have already been parsed and analyzed
    try {
        drcsImage = JSON.parse(data.image)
    } catch(SyntaxError) {
        return
    }

    // Define characters
    stream.push([0x1f, 0x23, 0x20, 0x20, 0x20, 0x42, 0x49])
    stream.push([0x1f, 0x23, 0x21, 0x30])

    drcsImage.designs.forEach(bits => {
        const sextets = []
        let bitCount = 0
        let sextet = 0

        // Each character design is pushed 6 bits by 6 bits in the stream
        bits.split("").forEach(bit => {
            sextet = sextet << 1 | bit
            bitCount++
            if(bitCount === 6) {
                sextets.push(0x40 + sextet)
                bitCount = 0
                sextet = 0
            }
        })
        sextets.push(0x40 + (sextet << 4))

        // Remove unnecessary values at the end of the sequence
        while(sextets.length > 0 && sextets[sextets.length - 1] === 0x40) {
            sextets.pop()
        }

        stream.push(sextets)
        stream.push(0x30)
    })

    // Send image
    drcsImage.chars.forEach((row, offset) => {
        stream.push([0x1f, 0x40 + y + offset + offsetY, 0x40 + x + offsetX + 1])
        stream.push([0x1b, 0x28, 0x20, 0x42])
        stream.push([0x1b, 0x50, 0x1b, 0x47])

        const unoptimized = new Minitel.Stream()
        unoptimized.push(row)

        stream.push(unoptimized.optimizeRow())
    })
}

/**
 * List of identifiers and their corresponding Videotex bytes used with Minitel.
 * @member {Object.<string, number[]>}
 */
Minitel.rawKeywords = {
    NUL: [0x00],
    SOH: [0x01],
    EOT: [0x04],
    ENQ: [0x05],
    BEL: [0x07],
    BS: [0x08],
    HT: [0x09],
    LF: [0x0A],
    VT: [0x0B],
    FF: [0x0C],
    CR: [0x0D],
    SO: [0x0E],
    SI: [0x0F],
    DLE: [0x10],
    CON: [0x11],
    REP: [0x12],
    SEP: [0x13],
    COFF: [0x14],
    NACK: [0x15],
    SYN: [0x16],
    CAN: [0x18],
    SS2: [0x19],
    SUB: [0x1A],
    ESC: [0x1B],
    SS3: [0x1D],
    RS: [0x1E],
    US: [0x1F],
    CSI: [0x1B, 0x5B],
    PRO1: [0x1B, 0x39],
    PRO2: [0x1B, 0x3A],
    PRO3: [0x1B, 0x3B]
}

/**
 * Handles "content-raw" actions. Converts hexadecimal bytes to Minitel Stream.
 * @function
 */
Minitel.actions["content-raw"] = function(stream, data) {
    if(data.value === undefined) return

    const keywords = data.value.split(/\s+/)

    keywords.forEach(keyword => {
        if(keyword.length === 0) return

        const keywordUppercase = keyword.toUpperCase()

        if(Minitel.rawKeywords[keywordUppercase]) {
            stream.push(Minitel.rawKeywords[keywordUppercase])
        } else if(keyword[0] === "!" && keyword.length === 2) {
            stream.push(keyword[1])
        } else if(keyword.length === 2) {
            const number = parseInt(keyword, 16)
            if(isNaN(number)) {
                return
            }

            stream.push(number)
        }
    })
}
