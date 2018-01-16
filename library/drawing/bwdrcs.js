"use strict"
var Drawing = Drawing || {}
/**
 * @typedef {Object} BWDRCS
 * @property {string[]} chars Black and white DRCS image organized by rows
 * @property {string[]} designs Characters designs
 */

/**
 * Convert a black and white image to a list of DRCS character definitions.
 * @param {Image} image The image to convert
 * @return {BWDRCS}
 */
Drawing.bwdrcs = function(image) {
    /**
     * Round an integer on a multiple of the step parameter.
     *
     *     intRound(2, 3) → 3
     *     intRound(3, 3) → 3
     *     intRound(4, 3) → 6
     *
     * @param {number} value The value to round
     * @param {number} step The multiple
     * @return {number} The rounded value
     */
    function intRound(value, step) {
        const remainder = value % step

        return remainder === 0 ? value : value + step - remainder
    }

    /**
     * Copy an image into a canvas in order to be able to retrieve pixel values.
     * The resulting image data will also be on multiple bounds of a cell's 
     * dimensions.
     *
     * @param {Image} image The source image
     * @param {number} cellWidth One cell's width
     * @param {number} cellHeight One cell's height
     * @return {ImageData} Image data
     */
    function getImageData(image, cellWidth, cellHeight) {
        // Create a canvas whose width and height are multiples of a cell's
        // width and cell's height.
        const canvas = document.createElement("canvas")
        canvas.width = intRound(image.width, cellWidth)
        canvas.height = intRound(image.height, cellHeight)

        // Copy the image on the canvas
        const ctx = canvas.getContext("2d")
        ctx.drawImage(image, 0, 0)

        // Returns image data
        return ctx.getImageData(0, 0, canvas.width, canvas.height)
    }

    /**
     * Slice image data into cells.
     *
     * For one cell which would represent a square, it would give the
     * following string:
     *
     *     "11111111\
     *     \10000001\
     *     \10000001\
     *     \10000001\
     *     \10000001\
     *     \10000001\
     *     \10000001\
     *     \10000001\
     *     \10000001\
     *     \11111111"
     *
     * @param {ImageData} imageData Image data
     * @param {number} cellW The cell's width
     * @param {number} cellH The cell's height
     * @return {string[]} The characters design, each string holding bits for
     *                    one character
     */
    function getPavement(imageData, cellW, cellH) {
        const designs = []
        const [ width, height ] = [ imageData.width, imageData.height ]

        // Slice the image
        range2([0, 0], [height, width], [cellH, cellW]).forEach((row, col) => {
            let design = ""

            // Converts each rectangle into a string
            range2([cellH, cellW]).forEach((y, x) => {
                const offset = ((row + y) * width + col + x) * 4
                design += imageData.data[offset] > 128 ? "1" : "0"
            })

            designs.push(design)
        })

        return designs
    }

    /**
     * Calculate proximity between 2 character designs
     *
     * @param {string} str1 The first design
     * @param {string} str2 The second design
     * @return {number} Number of matching pixels divided by the number of
     *                  total pixels.
     */
    function proxim(str1, str2) {
        let matching = 0
        range(str1.length).forEach(i => { if(str1[i] === str2[i]) matching++ })

        return matching / str1.length
    }

    /**
     * For a given design, find the best matching design in a list of designs.
     *
     * @param {string[]} designs List of existing character designs
     * @param {string} wanted The character design to look for
     * @return {Array} An array containing the best proximity and the best
     *                 design found
     */
    function findBestMatching(designs, wanted) {
        // Calculate all proximities for the wanted design
        const proxims = designs.map(design => proxim(design, wanted))

        // Find the best proximity
        let bestIndex = 0
        proxims.map((proxim, i) => {
            if(proxim >= proxims[bestIndex]) bestIndex = i
        })

        return [ proxims[bestIndex], designs[bestIndex] ]
    }

    const imageData = getImageData(image, 8, 10)
    const pavement = getPavement(imageData, 8, 10)

    const bwdrcs = {
        chars: [],
        designs: []
    }

    const charsPerRow = Math.floor(imageData.width / 8)
    const filledRectangle = "1".repeat(8 * 10)
    const emptyRectangle = "0".repeat(8 * 10)

    let row = ""
    let startChar = 33
    const designs = {}
    pavement.forEach(design => {
        // Check if the design has already been found
        const char = designs[design]
        if(char) {
            // Design already exists, use it!
            row += char
        } else if(design === filledRectangle) {
            // Design is a filled rectangle
            row += String.fromCharCode(127)
        } else if(design === emptyRectangle) {
            // Design is an empty rectangle
            row += String.fromCharCode(32)
        } else if(startChar === 127) {
            // Design doesn't exist but every available character has already
            // been used, look for the best approaching design
            const [ bestProxim, bestDesign ] = findBestMatching(
                bwdrcs.designs.concat([filledRectangle, emptyRectangle]),
                design
            )

            if(bestDesign === filledRectangle) {
                row += String.fromCharCode(127)
            } else if(bestDesign === emptyRectangle) {
                row += String.fromCharCode(32)
            } else {
                row += designs[bestDesign]
            }
        } else {
            // Add a new design
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

