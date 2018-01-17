"use strict"
var Drawing = Drawing || {}
/**
 * @typedef {Object} TextPoint
 * @property {number} color Foreground color (0 to 7)
 * @property {number} back Background color (0 to 7)
 * @property {boolean} separated Use disjoint mosaic character or not
 * @property {boolean} blink Point is blinking or not
 * @property {boolean} transparent Point is transparent or not
 */

/**
 * @typedef {Object} RenderedText
 * @property {TextPoint[]} bitmap A one-dimension array of all points
 * @property {number} width Width of the bitmap
 * @property {number} height Height of the bitmap
 */

/**
 * The text to render
 * @param {string} text The string to render
 * @param {string} font The font identifier
 * @param {string} style The style of the font
 * @param {number} size Point size
 * @param {number} color Foreground color (0 to 7)
 * @param {number} back Background color (0 to 7)
 * @param {boolean} separated Use disjoint mosaic character or not
 * @param {boolean} blink Points are blinking or not
 * @param {boolean} compress Reduce space between letters or not
 * @return {RenderedText}
 */
Drawing.text = function(text, font, style, size, color, back, separated, blink,
                        compress)
{
    // Any value above minLum is considered set
    const minLum = 192

    /**
     * Test if a row is empty or not
     * @param {} image
     * @param {number} row Row index
     * @return {boolean} True if the row is empty, False otherwise
     */
    function isEmptyRow(image, row) {
        for(let x = 0; x < canvas.width; x++) {
            if(image[ (x + row * canvas.width) * 4 ] > minLum) return false
        }

        return true    
    }

    /**
     * Test if a column is empty or not
     * @param {number[]} image
     * @param {number} column Column index
     * @return {boolean} True if the column is empty, False otherwise
     */
    function isEmptyColumn(image, column) {
        for(let y = 0; y < canvas.height; y++) {
            if(image[ (column + y * canvas.width) * 4 ] > minLum) return false
        }

        return true    
    }

    /**
     * Find limits
     * @param {number[]} image The image to analyze
     * @return {number[]} An array of the 4 non empty columns and rows: first
     *                    column, last column, first row and last row
     */
    function findLimits(image) {
        let [ firstColumn, lastColumn ] = [ 0, canvas.width - 1 ]
        let [ firstRow, lastRow ] = [ 0, canvas.height - 1 ]

        // Find first non empty column
        for(let x = 0; x < canvas.width; x++) {
            if(!isEmptyColumn(image, x)) {
                firstColumn = x
                break
            }
        }

        // Find last non empty column
        for(let x = canvas.width - 1; x >= 0; x--) {
            if(!isEmptyColumn(image, x)) {
                lastColumn = x
                break
            }
        }

        // Find first non empty row
        for(let y = 0; y < canvas.height; y++) {
            if(!isEmptyRow(image, y)) {
                firstRow = y
                break
            }
        }

        // Find last non empty row
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

    // Generate the font selector
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
            // Test if the column can be ignored
            if(compress && ignoreColumns[x]) continue

            // Create a default point
            const point = {
                color: 0,
                back: 0,
                separated: false,
                blink: false,
                transparent: true
            }

            // If the point is set, update the point
            if(image[ (x + y * canvas.width) * 4 ] > minLum) {
                point.color = color
                point.back = back
                point.separated = separated
                point.blink = blink
                point.transparent = false
            }

            // Add the point to our bitmap
            bitmap.push(point)
        }
    }

    return {
        bitmap: bitmap,
        width: compress ? realWidth : lastColumn - firstColumn + 1,
        height: lastRow - firstRow + 1,
    }
}

