"use strict"
var Minitel = Minitel || {}

Minitel.graphicsToStream = function(string, col, row) {
    function isSeparated(sextet) {
        let separated = 0
        let full = 0
        for(let i = 0; i < 6; i++) {
            let c = sextet[i]
            if(c >= "a" && c <= "h") full++
            if(c >= "A" && c <= "H") separated++
        }

        return separated >= full
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

        if(cardinals[bg] === 0) bg = "-"
        return [Minitel.color2int[fg], Minitel.color2int[bg]]
    }

    function sextet2char(sextet) {
        if(sextet === "------") return [0x09]

        let separated = isSeparated(sextet)
        sextet = sextet.toLowerCase()

        let fg = 7
        let bg = 0

        if(separated) {
            [fg, bg] = twoColors(sextet)
        } else {
            [bg, fg] = twoColors(sextet)
        }

        let char = 0
        let bit = 1
        for(let c of sextet) {
            if(Minitel.color2int[c] !== bg) char += bit
            bit *= 2
        }
        char = 0x20 + char

        if(separated) {
            return [0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x5a, char]
        } else {
            return [0x1b, 0x40 + fg, 0x1b, 0x50 + bg, 0x1b, 0x59, char]
        }
    }

    function optimizeRow(row) {
        let bg = 0x50
        let fg = 0x47
        let separated = false
        let char = 0x00
        let count = 0

        const optimized = []
        for(let i = 0; i < row.length; i++) {
            let moveRight = row[i] === 0x09
            let changeFG = row[i] === 0x1b
                        && row[i + 1] >= 0x40
                        && row[i + 1] <= 0x47
                        && row[i + 1] !== fg
            let changeBG = row[i] === 0x1b
                        && row[i + 1] >= 0x50
                        && row[i + 1] <= 0x57
                        && row[i + 1] !== bg
            let changeSep = row[i] === 0x1b
                         && (   (row[i + 1] === 0x5a && !separated)
                             || (row[i + 1] === 0x59 && separated))
            let changeChar = row[i] >= 0x20 && row[i] !== char

            if(count > 0 && (moveRight || changeFG || changeBG || changeSep || changeChar)) {
                if(count == 1) {
                    optimized.push(char)
                } else {
                    optimized.push(0x12, 0x40 + count)
                }
                count = 0
            }

            if(moveRight) {
                optimized.push(0x09)
            } else if(changeFG) {
                // Change foreground color
                fg = row[i + 1]
                optimized.push(0x1b, fg)
            } else if(changeBG) {
                // Change background color
                bg = row[i + 1]
                optimized.push(0x1b, bg)
            } else if(changeSep) {
                // Change separated
                separated = !separated
                optimized.push(0x1b, row[i + 1])
            } else if(changeChar) {
                // Change character
                optimized.push(row[i])
                char = row[i]
            } else if(row[i] >= 0x20) {
                // Same character
                count++
            }

            if(row[i] === 0x1b) i++
        }
        if(count > 0) optimized.push(0x12, 0x40 + count)

        return optimized
    }

    const stream = new Minitel.Stream()
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

        codes = codes.optimizeRow().trimRow()

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

