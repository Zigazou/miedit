"use strict"
var Drawing = Drawing || {}

Drawing.text = function(text, font, style, size, color, back, separated, blink,
                        compress)
{
    const minLum = 192

    function isEmptyRow(image, row) {
        for(let x = 0; x < canvas.width; x++) {
            if(image[ (x + row * canvas.width) * 4 ] > minLum) return false
        }

        return true    
    }

    function isEmptyColumn(image, column) {
        for(let y = 0; y < canvas.height; y++) {
            if(image[ (column + y * canvas.width) * 4 ] > minLum) return false
        }

        return true    
    }

    function findLimits(image) {
        let [ firstColumn, lastColumn ] = [ 0, canvas.width - 1 ]
        let [ firstRow, lastRow ] = [ 0, canvas.height - 1 ]

        for(let x = 0; x < canvas.width; x++) {
            if(!isEmptyColumn(image, x)) {
                firstColumn = x
                break
            }
        }

        for(let x = canvas.width - 1; x >= 0; x--) {
            if(!isEmptyColumn(image, x)) {
                lastColumn = x
                break
            }
        }

        for(let y = 0; y < canvas.height; y++) {
            if(!isEmptyRow(image, y)) {
                firstRow = y
                break
            }
        }

        for(let y = canvas.height - 1; y >= 0; y--) {
            if(!isEmptyRow(image, y)) {
                lastRow = y
                break
            }
        }

        return [ firstColumn, lastColumn, firstRow, lastRow ]    
    }

    // Set canvas size to the maximum of the Minitel
    const canvas = document.createElement("canvas")

    canvas.width = 160
    canvas.height = size * 3

    // Draw text
    const ctx = canvas.getContext("2d")

    ctx.font = (style ? '"' + style + '"' : "normal") + " " // style
             + "normal" + " "                               // variant
             + "normal" + " "                               // weight
             + size + "px" + " "                            // size
             + (font ? '"' + font + '"' : "sans-serif")     // family
     
    ctx.fillStyle = "#FFFFFF"
    ctx.fillText(text, 4, size * 2);

    // Get the pixels
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const rowLength = canvas.width * 4

    // Look for real dimensions
    const [ firstColumn, lastColumn, firstRow, lastRow ] = findLimits(image)

    // Look for ignorable columns when compress is enabled
    let previousEmptyColumn = false
    const ignoreColumns = []
    let realWidth = 0
    for(let x = firstColumn; x <= lastColumn; x++) {
        if(isEmptyColumn(image, x)) {
            if(previousEmptyColumn) {
                ignoreColumns[x] = true
            } else {
                ignoreColumns[x] = false
                previousEmptyColumn = true
                realWidth++
            }
        } else {
            ignoreColumns[x] = false
            previousEmptyColumn = false
            realWidth++
        }
    }

    // Converts image data to points
    const bitmap = []
    for(let y = firstRow; y <= lastRow; y++) {
        for(let x = firstColumn; x <= lastColumn; x++) {
            if(compress && ignoreColumns[x]) continue

            const point = {
                color: 0,
                back: 0,
                separated: false,
                blink: false,
                transparent: true
            }

            if(image[ (x + y * canvas.width) * 4 ] > minLum) {
                point.color = color
                point.back = back
                point.separated = separated
                point.blink = blink
                point.transparent = false
            }

            bitmap.push(point)
        }
    }

    return {
        bitmap: bitmap,
        width: compress ? realWidth : lastColumn - firstColumn + 1,
        height: lastRow - firstRow + 1,
    }
}

