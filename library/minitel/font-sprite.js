"use strict"
/**
 * @file font-sprite
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * FontSprite uses a sprite sheet (usually a PNG image) to print characters
 * on a canvas. It handles colors.
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * @typedef {Object} Point
 * @property {number} x The X Coordinate
 * @property {number} y The Y Coordinate
 */

/**
 * @typedef {Object} Grid
 * @property {number} cols Number of characters per width.
 * @property {number} rows Number of characters per height.
 */

/**
 * @typedef {Object} Char
 * @property {number} width Width in pixels of a character.
 * @property {number} height Height in pixels of a character.
 */

/**
 * A FontSprite is a facility which draws bitmap characters on a canvas based
 * on a sprite map, a PNG image with white pixels and background transparency.
 */
Minitel.FontSprite = class {
    /**
     * Create a FontSprite.
     * @param {string} sheetURL The URL of the sprite sheet to use.
     * @param {Grid} grid How the sprite sheet is organized.
     * @param {Char} char Character characteristics.
     */
    constructor(sheetURL, grid, char) {
        /**
         * How the sprite sheet is organized.
         * @member {Grid}
         */
        this.grid = grid

        /**
         * Character characteristics.
         * @member {Char}
         */
        this.char = char

        /**
         * Whether sprites are rendered in color or black and white
         * @member {boolean}
         */
        this.color = true

        /**
         * The pre-renderd sprite sheets for each color.
         * @member {HTMLCanvasElement[]}
         * @private
         */
        this.spriteSheetColors = { gray: [], color: [] }

        /**
         * Coordinates are pre-computed.
         * @member
         * @private
         */
        this.allCoordinates = []

        /**
         * How many sprites.
         * @member {number}
         * @private
         */
        this.spriteNumber = 0

        /**
         * Indicates whether the sprite sheet can be used or not.
         * @member {boolean}
         */
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
        function generateColor(source, color) {
            const canvas = document.createElement("canvas")
            canvas.width = source.width
            canvas.height = source.height

            const ctx = canvas.getContext("2d")
            const [width, height] = [canvas.width, canvas.height]

            ctx.clearRect(0, 0, width, height)
            ctx.drawImage(source, 0, 0, width, height, 0, 0, width, height)
            ctx.fillStyle = color
            ctx.globalCompositeOperation = "source-in"
            ctx.fillRect(0, 0, width, height)

            return canvas
        }

        this.spriteSheetColors.color = Minitel.colors.map(
            color => generateColor(this.spriteSheet, color)
        )

        this.spriteSheetColors.gray = Minitel.grays.map(
            gray => generateColor(this.spriteSheet, gray)
        )

        this.generateCoordinates()

        this.isReady = true
    }

    /**
     * Pre-computes all coordinates
     *
     * @private
     */
    generateCoordinates() {
        this.spriteNumber = this.grid.cols * this.grid.rows

        range(this.spriteNumber).forEach(ord => {
            this.allCoordinates.push({
                "x": Math.floor(ord / this.grid.rows) * this.char.width,
                "y": ord % this.grid.rows * this.char.height
            })
        })
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

        return this.allCoordinates[ord]
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
     * @param {boolean} underline true if a line must be drawn on the bottom
     *                            of the character, false otherwise
     */
    writeChar(ctx, ord, x, y, part, mult, color, underline) {
        if(ord < 0 || ord >= this.spriteNumber) ord = this.spriteNumber - 1
        const srcCoords = this.allCoordinates[ord]

        const offset = {
            x: Math.floor(part.x * this.char.width / mult.width),
            y: Math.floor(part.y * this.char.height / mult.height)
        }

        if(color === undefined) color = 0

        const source = this.color
                     ? this.spriteSheetColors.color[color]
                     : this.spriteSheetColors.gray[color]

        ctx.save()

        // Create clipping
        ctx.beginPath()
        ctx.rect(x, y, this.char.width, this.char.height)
        ctx.clip()

        if(mult.height === 2) {
            // When height is doubled, first line is three pixel height and
            // last line is one pixel height
            if(part.y === 0) {
                ctx.drawImage(
                    // Source
                    source,
                    srcCoords.x + offset.x, srcCoords.y + offset.y,
                    this.char.width / mult.width,
                    1 / mult.height,

                    // Destination
                    x, y,
                    this.char.width, 1
                )

                ctx.drawImage(
                    // Source
                    source,
                    srcCoords.x + offset.x, srcCoords.y + offset.y,
                    this.char.width / mult.width,
                    this.char.height / mult.height,

                    // Destination
                    x, y + 1,
                    this.char.width, this.char.height
                )
            } else {
                ctx.drawImage(
                    // Source
                    source,
                    srcCoords.x + offset.x, srcCoords.y + offset.y - 1,
                    this.char.width / mult.width,
                    1 / mult.height,

                    // Destination
                    x, y,
                    this.char.width, 1
                )

                ctx.drawImage(
                    // Source
                    source,
                    srcCoords.x + offset.x, srcCoords.y + offset.y,
                    this.char.width / mult.width,
                    this.char.height / mult.height,

                    // Destination
                    x, y + 1,
                    this.char.width, this.char.height
                )
            }
        } else {
            // Generic case
            ctx.drawImage(
                // Source
                source,
                srcCoords.x + offset.x, srcCoords.y + offset.y,
                this.char.width / mult.width, this.char.height / mult.height,

                // Destination
                x, y,
                this.char.width, this.char.height
            )
        }

        // Draw the underline if needed
        if(underline && part.y === mult.height - 1) {
            ctx.fillStyle = this.color
                          ? Minitel.colors[color]
                          : Minitel.grays[color]

            ctx.fillRect(x, y + this.char.height - 1, this.char.width, 1)
        }

        ctx.restore()
    }

    /**
     * Redefine a character (DRCS)
     * @param {number} ord Character ordinal
     * @param {number[]} design An array of 10 bytes defining the character, one
     *                          byte corresponding to 8 pixels of a line.
     */
    defineChar(ord, design) {
        if(ord <= 32 || ord >= 127) return
        if(design.length !== 10) return

        const coords = this.toCoordinates(ord)

        const defineOneChar = (spriteSheetColor, color) => {
            const ctx = spriteSheetColor.getContext("2d")
            ctx.globalCompositeOperation = "source-over"

            ctx.clearRect(coords.x, coords.y, this.char.width, this.char.height)

            ctx.fillStyle = color
            design.forEach((byte, offsetY) => {
                byte = byte & 0xff

                range(8).forEach(bitPosition => {
                    if(byte & 1 << 7 - bitPosition) {
                        ctx.fillRect(
                            coords.x + bitPosition, coords.y + offsetY,
                            1, 1
                        )
                    }
                })
            })
        }

        this.spriteSheetColors.color.forEach((spriteSheetColor, index) => {
            defineOneChar(spriteSheetColor, Minitel.colors[index])
        })

        this.spriteSheetColors.gray.forEach((spriteSheetColor, index) => {
            defineOneChar(spriteSheetColor, Minitel.grays[index])
        })
    }
}
