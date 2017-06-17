"use strict"
/**
 * @file font-sprite
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * FontSprite uses a sprite sheet (usually a PNG image) to print characters
 * on a canvas. It handles colors.
 *
 * @typedef {Object} Point
 * @property {number} x The X Coordinate
 * @property {number} y The Y Coordinate
 */

/**
 * @class FontSprite
 */
class FontSprite {
    /**
     * @param {string} sheetURL The URL of the sprite sheet to use.
     * @param {Object} grid How the sprite sheet is organized
     * @param {number} grid.cols Number of characters per width
     * @param {number} grid.rows Number of characters per height
     * @param {Object} char Character characteristics
     * @param {number} char.width Width in pixels of a character
     * @param {number} char.height Height in pixels of a character
     * @param {Object} zoom Zoom values
     * @param {number} zoom.x Horizontal multiplier
     * @param {number} zoom.y Vertical multiplier
     * @param {Array} colors The color palette containing the hex colors to use
     */
    constructor(sheetURL, grid, char, zoom, colors) {
        this.grid = grid
        this.char = char
        this.colors = colors
        this.spriteSheetColors = []
        this.isReady = false

        // Load the source sprite sheet, optimization will occur when loaded
        this.spriteSheet = new Image()
        this.spriteSheet.onload = () => this.generateColors()
        this.spriteSheet.src = sheetURL
    }

    /**
     * Generates a sprite sheet for each available color, speeding up the
     * rendering.
     * @private
     */
    generateColors() {
        for(let color = 0; color < this.colors.length; color++) {
            const canvas = document.createElement("canvas")
            canvas.width = this.spriteSheet.width
            canvas.height = this.spriteSheet.height

            const ctx = canvas.getContext("2d")
            const [ wid, hei ] = [ canvas.width, canvas.height ]

            ctx.clearRect(0, 0, wid, hei)
            ctx.drawImage(this.spriteSheet, 0, 0, wid, hei, 0, 0, wid, hei)
            ctx.fillStyle = this.colors[color]
            ctx.globalCompositeOperation = "source-in"
            ctx.fillRect(0, 0, wid, hei)

            this.spriteSheetColors[color] = canvas
        }

        this.isReady = true
    }

    /**
     * Converts a character ordinal to its position in the sprite sheet. An
     * out of range ordinal will be considered like the last available
     * character.
     *
     * @param {number} ord The ordinal of the character
     * @return {Point} The position of the character in the sprite sheet
     * @private
     */
    toCoordinates(ord) {
        if(ord < 0 || ord >= this.grid.cols * this.grid.rows) {
            ord = this.grid.cols * this.grid.rows - 1
        }

        return {
            "x": Math.floor(ord / this.grid.rows) * this.char.width,
            "y": (ord % this.grid.rows) * this.char.height,
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx Context used for drawing
     * @param {number} ord Character ordinal
     * @param {number} x Destination x coordinate 
     * @param {number} y Destination y coordinate 
     * @param {Object} part Part of the character (when doubling is used)
     * @param {number} part.x 0=left part
     * @param {number} part.y 0=bottom part
     * @param {Object} mult
     * @param {number} mult.width Width multiplier
     * @param {number} mult.height Height multiplier
     * @param {number} color Index of the color to use as character foreground
     * @param {boolean} underline
     */
    writeChar(ctx, ord, x, y, part, mult, color, underline) {
        const srcCoords = this.toCoordinates(ord)

        const offset = {
            x: Math.floor(part.x * this.char.width / mult.width),
            y: Math.floor(part.y * this.char.height / mult.height),
        }

        if(color === undefined) color = 0

        ctx.drawImage(
            // Source
            this.spriteSheetColors[color],
            srcCoords.x + offset.x, srcCoords.y + offset.y,
            this.char.width / mult.width, this.char.height / mult.height,

            // Destination
            x, y,
            this.char.width, this.char.height
        )

        // Draw the underline if needed
        if(underline && part.y === mult.height - 1) {
            ctx.fillStyle = this.colors[color]
            ctx.fillRect(x, y + this.char.height - 1, this.char.width, 1)
        }
    }
}
