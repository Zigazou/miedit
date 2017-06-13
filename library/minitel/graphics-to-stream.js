"use strict"
var Minitel = Minitel || {}

Minitel.graphicsToStream = function(string, col, row) {
    function isSeparated(sextet) {
        let separated = 0
        let full = 0
        for(let c of sextet) {
            if(c >= "a" && c <= "h") full++
            if(c >= "A" && c <= "H") separated++
        }

        return separated > full
    }

    function twoColors(sextet) {
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
        }

        for(let char of sextet) cardinals[char]++

        // Find most often used color
        let fg = Object.keys(cardinals)[0]
        for(let key in cardinals) {
            if(cardinals[key] > cardinals[fg]) fg = key
        }

        delete cardinals[fg]

        // Find second most often used color
        let bg = Object.keys(cardinals)[0]
        for(let key in cardinals) {
            if(cardinals[key] > cardinals[bg]) bg = key
        }

        if(fg === "-") {
            fg = bg
            bg = "-"
        }

        if(cardinals[bg] === 0) bg = "-"
        return [Minitel.color2int[fg], Minitel.color2int[bg]]
    }

    function sextet2char(sextet) {
        if(sextet === "------") return 0x09

        let separated = isSeparated(sextet)
        sextet = sextet.toLowerCase()

        let [bg, fg] = twoColors(sextet)        

        let char = ""
        for(let c of sextet) {
            char = (Minitel.color2int[c] === bg ? "0" : "1") + char
        }
        char = 0x20 + parseInt(char, 2)

        if(separated) {
            return [0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x5a, char]
        } else {
            return [0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x59, char]
        }
    }

    const stream = new Minitel.Stream()
    for(let y = 0; y < 72 - row * 3; y += 3) {
        // Converts pixels to mosaic characters
        let sextets = []
        for(let x = 0; x < 80 - col * 2; x += 2) {
            const sextet = string[x + y * 80]
                         + string[x + 1 + y * 80]
                         + string[x + (y + 1) * 80]
                         + string[x + 1 + (y + 1) * 80]
                         + string[x + (y + 2) * 80]
                         + string[x + 1 + (y + 2) * 80]

            sextets.push(sextet2char(sextet))
        }

        // Get rid of empty characters at the beginning
        let startX = 0
        while(sextets.length > 0 && sextets[0] === 0x09) {
            startX++
            sextets.shift()
        }

        // Get rid of empty characters at the end
        while(sextets.length > 0 && sextets[sextets.length - 1] === 0x09) {
            sextets.pop()
        }

        if(sextets.length === 0) continue

        stream.push([0x1f, 0x40 + y / 3 + 1, 0x40 + col + startX + 1, 0x0e])
        stream.push(sextets)
    }

    return stream
}

