"use strict"
var Minitel = Minitel || {}

Minitel.actionsToStream = function(actions, offsetX, offsetY) {
    if(offsetX === undefined) offsetX = 0
    if(offsetY === undefined) offsetY = 0
    const stream = new Minitel.Stream()

    actions.forEach(action => {
        if(action.type in Minitel.directStream) {
            stream.push(Minitel.directStream[action.type])
            return
        }

        if(Minitel.actions[action.type]) {
            Minitel.actions[action.type](stream, action.data, offsetX, offsetY)
            return
        }

        if(action.type !== "content-group") return

        if(action.data.disabled) return

        const [ relOffsetX, relOffsetY ] = [
            action.data.offsetX, action.data.offsetY 
        ].map(v => parseInt(v, 10))

        if([ relOffsetX, relOffsetY ].some(isNaN)) { return }

        stream.push(Minitel.actionsToStream(
            action.children,
            offsetX + relOffsetX,
            offsetY + relOffsetY
        ))
    })

    return stream
}

Minitel.actions = {}

Minitel.actions["content-string"] = function(stream, data) {
    if(data.value === undefined) { return }

    stream.push(data.value)
}

Minitel.actions["content-block"] = function(stream, data, offsetX, offsetY) {
    if(data.value === undefined || data.align === undefined) return

    const [ relX, relY, width, height ] = [
        data.x, data.y, data.width, data.height
    ].map(v => parseInt(v, 10))

    if([ relX, relY, width, height ].some(isNaN)) { return }

    const [ x, y ] = [ offsetX + relX + 1, offsetY + relY ]
    const value = data.value.replace(/\r/g, "").replace(/ +/g, " ")

    splitRows(value, width).slice(0, height).forEach((row, index) => {
        if(row.length === 0) return

        let px = x
        if(data.align === "center") {
            px += Math.floor((width - row.length) / 2)
        } else if(data.align === "right") {
            px += width - row.length
        }

        stream.push([0x1f, 0x40 + y + index, 0x40 + px])
        stream.push(row)
    })
}

Minitel.actions["content-box"] = function(stream, data, offsetX, offsetY) {
    const [ relX, relY, width, height, bgcolor ] = [
        data.x, data.y, data.width, data.height, data.bgcolor
    ].map(v => parseInt(v, 10))

    if([relX, relY, width, height, bgcolor].some(isNaN)) { return }
    if(bgcolor < 0 || bgcolor > 7) { return }

    const [ x, y ] = [ offsetX + relX + 1, offsetY + relY ]
    range(y, y + height).forEach(row => {
        stream.push([
            0x1f, 0x40 + row, 0x40 + x,
            0x0e, 0x1b, 0x50 + bgcolor,
            0x20, 0x12, 0x40 + width - 1
        ])
    })
}

Minitel.actions["content-graphics"] = function(stream, data, offsetX, offsetY) {
    if(data.value === undefined) return

    const [ x, y ] = [ data.x, data.y ].map(v => parseInt(v, 10))
    if([ x, y ].some(isNaN)) { return }

    stream.push(Minitel.graphicsToStream(data.value, x + offsetX, y + offsetY))
}

Minitel.actions["content-ceefax"] = function(stream, data) {
    if(data.value === undefined) { return }

    stream.push([0x1f, 0x41, 0x41])
    stream.push(Minitel.ceefaxToStream(data.value))
}

Minitel.actions["move-home"] = function(stream, data, offsetX, offsetY) {
    if(offsetX !== 0 || offsetY !== 0) {
        stream.push([0x1f, 0x40 + offsetY, 0x40 + offsetX + 1])
    } else {
        stream.push(0x1e)
    }
}

Minitel.actions["move-locate"] = function(stream, data, offsetX, offsetY) {
    const [ x, y ] = [ data.x, data.y ].map(v => parseInt(v, 10))
    if([ x, y ].some(isNaN)) { return }

    stream.push([0x1f, 0x40 + y + offsetY, 0x40 + x + offsetX + 1])
}

Minitel.actions["content-delay"] = function(stream, data) {
    if(data.value === undefined) return

    stream.push(repeat(0, parseInt(data.value, 10)))
}

Minitel.actions["drcs-create"] = function(stream, data) {
    if(data.char === undefined) return

    const charCode = data.char.length === 1
                   ? data.char.charCodeAt(0)
                   : parseInt(data.char, 10)

    if(charCode === undefined || charCode <= 32 || charCode >= 127) return

    const bits = []
    range2([ 10, 8 ]).forEach((y, x) => {
        bits.push(data["px-" + x + "-" + y] ? 1 : 0)
    })

    const sextets = []
    let bitCount = 0
    let sextet = 0
    bits.forEach(bit => {
        sextet = (sextet << 1) | bit
        bitCount++
        if(bitCount === 6) {
            sextets.push(0x40 + sextet)
            bitCount = 0
            sextet = 0
        }
    })
    sextets.push(0x40 + (sextet << 4))

    const charset = data.charset === "G0" ? 0x42 : 0x43

    stream.push([0x1f, 0x23, 0x20, 0x20, 0x20, charset, 0x49])
    stream.push([0x1f, 0x23, charCode, 0x30])
    stream.push(sextets)
    stream.push([0x30, 0x1f, 0x41, 0x41])
}

Minitel.actions["drcs-black-white"] = function(stream, data, offsetX, offsetY) {
    const [ x, y ] = [ data.x, data.y ].map(v => parseInt(v, 10))
    if([ x, y ].some(isNaN)) { return }
    if(data.image === undefined) return

    let drcsImage = undefined

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
        bits.split("").forEach(bit => {
            sextet = (sextet << 1) | bit
            bitCount++
            if(bitCount === 6) {
                sextets.push(0x40 + sextet)
                bitCount = 0
                sextet = 0
            }
        })
        sextets.push(0x40 + (sextet << 4))

        stream.push(sextets)
        stream.push(0x30)
    })
        
    // Send image
    drcsImage.chars.forEach((row, offset) => {
        stream.push([0x1f, 0x40 + y + offset + offsetY, 0x40 + x + offsetX + 1])
        stream.push([0x1b, 0x28, 0x20, 0x42])
        stream.push([0x1b, 0x50, 0x1b, 0x47])
        stream.push(row)
    })
}

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
    PRO3: [0x1B, 0x3B],
}

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
            if(isNaN(number)) { return }
            stream.push(number)
        }
    })
}
