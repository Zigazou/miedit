"use strict"
var Drawing = Drawing || {}

Drawing.bwdrcs = function(image) {
    function intRound(value, step) {
        const remainder = value % step

        return remainder === 0 ? value : value + step - remainder
    }

    function getImageData(image, cellWidth, cellHeight) {
        const canvas = document.createElement("canvas")
        canvas.width = intRound(image.width, cellWidth)
        canvas.height = intRound(image.height, cellHeight)

        const ctx = canvas.getContext("2d")
        ctx.drawImage(image, 0, 0)

        return ctx.getImageData(0, 0, canvas.width, canvas.height)
    }

    function getPavement(imageData, cellW, cellH) {
        const designs = []
        const [ width, height ] = [ imageData.width, imageData.height ]

        range2([0, 0], [height, width], [cellH, cellW]).forEach((row, col) => {
            let design = ""
            range2([cellH, cellW]).forEach((y, x) => {
                const offset = ((row + y) * width + col + x) * 4
                design += imageData.data[offset] > 128 ? "1" : "0"
            })

            designs.push(design)
        })

        return designs
    }

    const imageData = getImageData(image, 8, 10)
    const pavement = getPavement(imageData, 8, 10)

    const bwdrcs = {
        chars: [],
        designs: []
    }

    const charsPerRow = Math.floor(imageData.width / 8)

    let row = ""
    let startChar = 33
    const designs = {}
    pavement.forEach(design => {
        const char = designs[design]
        if(char) {
            row += char
        } else if(startChar === 127) {
            row += String.fromCharCode(127)
        } else {
            row += String.fromCharCode(startChar)
            bwdrcs.designs.push(design)
            designs[design] = String.fromCharCode(startChar)
            startChar++
        }

        if(row.length === charsPerRow) {
            bwdrcs.chars.push(row)
            row = ""
        }
    })

    return bwdrcs
}

