"use strict"
var Minitel = Minitel || {}

Minitel.graphicsToStream = function(string, col, row) {
    function isSeparated(sextet) {
        for(let c of sextet) {
            if(c >= "A" && c <= "H") return c.toLowerCase()
        }

        return undefined
    }

    let lastBg = "-"
    function twoColors(sextet, separatedColor) {
        const cardinals = {
            "a": 0,
            "b": 0,
            "c": 0,
            "d": 0,
            "e": 0,
            "f": 0,
            "g": 0,
            "h": 0,
            "-": 0,
            "*": -1
        }

        for(let char of sextet) cardinals[char]++

        // Find most often used color
        let fg = "*"
        for(let key in cardinals) {
            if(cardinals[key] > cardinals[fg]) fg = key
        }

        delete cardinals[fg]

        // Find second most often used color
        let bg = "*"
        for(let key in cardinals) {
            if(cardinals[key] > cardinals[bg]) bg = key
        }

        if(fg === "-" || fg === "a") {
            fg = bg
            bg = "-"
        }

        if(bg === separatedColor) {
            const swap = fg
            fg = bg
            bg = swap
        }

        // Current system does not handle background color of separated mosaic
        // when each point has foreground color
        if(cardinals[bg] === 0) {
            if(separatedColor) {
                bg = lastBg
            } else {
                const swap = fg
                fg = bg
                bg = swap
            }
        }

        lastBg = bg
        return [Minitel.color2int[fg], Minitel.color2int[bg]]
    }

    function sextet2char(sextet) {
        if(sextet === "------") return [0x09]

        const separatedColor = isSeparated(sextet)
        sextet = sextet.toLowerCase()

        const [fg, bg] = twoColors(sextet, separatedColor)

        let char = 0
        let bit = 1
        for(let c of sextet) {
            if(Minitel.color2int[c] !== bg) char += bit
            bit *= 2
        }
        char = 0x20 + char

        if(separatedColor) {
            return [0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x5a, char]
        } else {
            lastBg = bg
            return [0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x59, char]
        }
    }

    const stream = new Minitel.Stream()

    if(string === undefined || string.length !== 80 * 72) return stream

    for(let y = 0; y <= 72 - row * 3; y += 3) {
        // Converts pixels to mosaic characters
        let codes = new Minitel.Stream()
        for(let x = 0; x < 80 - col * 2; x += 2) {
            const sextet = string[x + y * 80]
                         + string[x + 1 + y * 80]
                         + string[x + (y + 1) * 80]
                         + string[x + 1 + (y + 1) * 80]
                         + string[x + (y + 2) * 80]
                         + string[x + 1 + (y + 2) * 80]

            codes.push(sextet2char(sextet))
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
            0x40 + y / 3 + row,
            0x40 + col + startX + 1,
            0x0e,
            codes
        ])
    }

    return stream
}

