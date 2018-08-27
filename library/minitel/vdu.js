"use strict"
/**
 * @file vdu
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * VDU simulates a Minitel video display unit connected to a screen (a canvas)
 * and video memory (VRAM).
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * Video display unit is a rendering of a video memory in a canvas
 */
Minitel.VDU = class {
    /**
     * @param {Minitel.TextGrid} grid How the page is organized.
     * @param {Minitel.CharSize} char Character characteristics.
     * @param {HTMLCanvasElement} canvas The canvas which will be used as the
     *                                   screen.
     * @param {boolean} color true for color, false for black and white
     * @param {?HTMLCanvasElement} cancur The canvas which will be used to draw
     *                                    the cursor.
     */
    constructor(grid, char, canvas, color, cancur) {
        const frameRate = 50 // Frame per second

        /**
         * @member {TextGrid}
         * @private
         */
        this.grid = grid

        /**
         * @member {CharSize}
         * @private
         */
        this.char = char

        /**
         * @member {HTMLCanvasElement}
         * @private
         */
        this.canvas = canvas

        /**
         * @member {CanvasRenderingContext2D}
         * @private
         */
        this.context = this.createContext()

        /**
         * The status character shown in the upper right corner of the screen
         * @member {int}
         * @private
         */
        this.statusCharacter = 0x46

        /**
         * @member {boolean}
         * @private
         */
        this.globalMask = true

        // Helper array
        const rows = []
        rows.length = this.grid.rows

        /**
         * Cursor position and visibility
         * @member {Minitel.VDUCursor}
         */
        this.cursor = new Minitel.VDUCursor(grid, char, cancur)

        /**
         * The video memory
         * @member {Minitel.VRAM}
         * @private
         */
        this.vram = new Minitel.VRAM(grid)

        /**
         * Keeps the last blink state
         * @member {boolean}
         * @private
         */
        this.lastblink = this.getBlink()

        /**
         * List indicating which row contains blinking characters.
         * @member {boolean[]}
         * @private
         */
        this.blinking = rows.map(() => false)

        // Marks all rows as changed
        /**
         * List indicating which row has been changed.
         * @member {boolean[]}
         */
        this.changed = rows.map(() => true)

        /**
         * G0 is the alphanumeric character set, G1 is the mosaic character set
         * G0d and G1d are the DRCS counterpart
         * @member {Object}
         * @property {FontSprite} G0 Standard font sprites
         * @property {FontSprite} G1 Mosaic font sprites
         * @property {FontSprite} G0d DRCS standard font sprites
         * @property {FontSprite} G1d DRCS mosaic font sprites
         * @private
         */
        this.font = {
            "G0": this.loadFont("font/ef9345-g0.png"),
            "G1": this.loadFont("font/ef9345-g1.png"),
            "G0d": this.loadFont("font/blank.png"),
            "G1d": this.loadFont("font/blank.png")
        }

        this.changeColors(color)

        /**
         * Timer ID of the screen refresh timer.
         * @member {number}
         * @private
         */
        this.refresh = window.setInterval(
            () => {
                this.render()
                const cell = this.vram.get(this.cursor.x, this.cursor.y)
                this.cursor.setColor(this.colors[cell.fgColor])
            },
            1000 / frameRate
        )
    }

    /**
     * Force redraw of the entire page.
     * @param {int?} row Index of row to redraw
     */
    redraw(row) {
        if(row === undefined) {
            this.changed = this.changed.map(() => true)
        } else {
            this.changed[row] = true
        }
    }

    /**
     * Defines the status character shown in the upper right corner of the
     * Minitel screen.
     * @param {int} code the Minitel code to display.
     */
    setStatusCharacter(code) {
        this.statusCharacter = code;
    }

    /**
     * Set the Cell at (X, Y) position in page memory
     *
     * @param {number} x X position of the cell
     * @param {number} y Y position of the cell
     * @param {Cell} cell The cell
     */
    set(x, y, cell) {
        this.vram.set(x, y, cell)
        this.changed[y] = true
    }

    /**
     * Get the Cell at (X, Y) position in page memory
     *
     * @param {number} x X position of the cell
     * @param {number} y Y position of the cell
     */
    get(x, y) {
        return this.vram.get(x, y)
    }

    /**
     * Clear the page
     */
    clear() {
        this.vram.clear()
        this.redraw()
    }

    /**
     * Scroll the video memory in a direction. It takes the page mode into
     * account.
     * @param {string} direction "up" or "down"
     */
    scroll(direction) {
        this.vram.scroll(direction)
        this.redraw()
    }

    /**
     * Get blink state.
     * @return {boolean}
     */
    getBlink() {
        const msecs = (new Date()).getTime()
        return msecs % 1500 >= 750
    }

    /**
     * Initializes a context for rendering.
     * @return {CanvasRenderingContext2D}
     */
    createContext() {
        const ctx = this.canvas.getContext("2d")

        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = "#000000"
        ctx.fillRect(
            0,
            0,
            this.char.width * this.grid.cols,
            this.char.height * this.grid.rows
        )

        return ctx
    }

    /**
     * Load a font.
     * @param {string} url URL of the font to load.
     * @param {string[]} colors List of colors to use in #RRGGBB format
     * @return {FontSprite}
     */
    loadFont(url) {
        return new Minitel.FontSprite(
            url,
            { cols: 8, rows: 16 },
            this.char
        )
    }

    /**
     * Redefine a character (DRCS)
     * @param {number} ord Character ordinal
     * @param {number[]} design An array of 10 bytes defining the character
     */
    defineCharG0(ord, design) {
        this.font.G0d.defineChar(ord, design)
        this.redraw()
    }

    /**
     * Redefine a character (DRCS)
     * @param {number} ord Character ordinal
     * @param {number[]} design An array of 10 bytes defining the character
     */
    defineCharG1(ord, design) {
        this.font.G1d.defineChar(ord, design)
        this.redraw()
    }

    /**
     * Enable or disable the use of zone masking.
     * @param {boolean} enabled true enables the use of zone masking, false
     *                          disables the use of zone masking.
     */
    setGlobalMask(enabled) {
        this.globalMask = enabled
        this.redraw()
    }

    /**
     * Change colors (black and white or color)
     * @param {boolean} color true for color, false for black and white
     */
    changeColors(color) {
        this.colors = color ? Minitel.colors : Minitel.grays

        for(let index in this.font) {
            if(this.font.hasOwnProperty(index)) {
                this.font[index].color = color
            }
        }

        this.redraw()
    }

    /**
     * Generate a thumbnail of the current display.
     *
     * @param {number} width Width of the thumbnail
     * @param {number} height Height of the thumbnail
     * @return {string} The data URL of the thumbnail in PNG format
     */
    generateThumbnail(width, height) {
        const thumbnail = document.createElement("canvas")

        thumbnail.width = width
        thumbnail.height = height

        const ctx = thumbnail.getContext("2d")
        ctx.imageSmoothingEnabled = false

        ctx.drawImage(this.canvas, 0, 0, width, height)

        return thumbnail.toDataURL("image/png")
    }

    /**
     * Render the screen.
     * @private
     */
    render() {
        // Do not render if the fonts are not ready
        if(!this.font.G0.isReady
           || !this.font.G1.isReady
           || !this.font.G0d.isReady
           || !this.font.G1d.isReady) {
            return
        }

        // Add the inverted F on the status line
        const fCell = new Minitel.CharCell()
        fCell.value = this.statusCharacter
        fCell.invert = true
        this.vram.set(38, 0, fCell)

        const blink = this.getBlink()

        // Draw each cell
        range(0, this.grid.rows).forEach(row => {
            // Draw the row only if needed
            if(!this.changed[row]) {
                if(!this.blinking[row] || this.lastBlink === blink) {
                    return
                }
            }

            this.changed[row] = false

            let blinkRow = this.drawRow(this.vram.get(row), row, blink)

            this.blinking[row] = blinkRow
        })

        this.lastBlink = blink
    }

    /**
     * Render one row.
     * @param {Cell[]} memoryRow list of Cell of the row to render
     * @param {integer} row row index
     * @param {boolean} blink
     * @return {boolean}
     * @private
     */
    drawRow(memoryRow, row, blink) {
        let bgColor = 0
        let mask = false
        let underline = false

        const y = row * this.char.height

        let blinkRow = false

        range(0, this.grid.cols).forEach(col => {
            const cell = memoryRow[col]
            const x = col * this.char.width

            if(!(cell instanceof Minitel.CharCell)) {
                bgColor = cell.bgColor
                underline = false
            }

            if(!(cell instanceof Minitel.DelimiterCell)
               && cell.blink === true) {
                blinkRow = true
            }

            let front = 7
            let back = 0
            if(!(cell instanceof Minitel.MosaicCell) && cell.invert === true) {
                [front, back] = [bgColor, cell.fgColor]
            } else {
                [front, back] = [cell.fgColor, bgColor]
            }

            this.drawCharacter(
                x, y, cell, front, back, mask, blink, underline
            )

            if(cell instanceof Minitel.DelimiterCell) {
                if(cell.mask !== undefined) {
                    mask = this.globalMask && cell.mask
                }

                if(cell.zoneUnderline !== undefined) {
                    underline = cell.zoneUnderline
                }
            }
        })

        return blinkRow
    }

    /**
     * Render one character.
     * @param {integer} x x coordinate
     * @param {integer} y y coordinate
     * @param {Cell} cell Cell to render
     * @param {integer} front Foreground color (0 to 7)
     * @param {integer} back Background color (0 to 7)
     * @param {boolean} mask masking or not ?
     * @param {boolean} blink blinking or not ?
     * @param {boolean} underline underlining or not ?
     * @private
     */
    drawCharacter(x, y, cell, front, back, mask, blink, underline) {
        const ctx = this.context

        // Draw background
        ctx.fillStyle = this.colors[back]
        ctx.fillRect(x, y, this.char.width, this.char.height)

        if(mask) {
            return
        }

        if(!(cell instanceof Minitel.DelimiterCell)
           && cell.blink
           && blink === (cell instanceof Minitel.MosaicCell || !cell.invert)
        ) {
            return
        }

        // Draw character
        let page
        let part = { x: 0, y: 0 }
        let mult = { width: 1, height: 1 }
        let unde = false

        if(cell instanceof Minitel.CharCell) {
            page = cell.drcs ? this.font.G0d : this.font.G0
            part = cell.part
            mult = cell.mult
            unde = underline
        } else if(cell instanceof Minitel.DelimiterCell) {
            page = cell.drcs ? this.font.G0d : this.font.G0
            mult = cell.mult
            unde = underline
        } else {
            page = cell.drcs ? this.font.G1d : this.font.G1
        }

        page.writeChar(ctx, cell.value, x, y, part, mult, front, unde)
    }

    /**
     * Get the word at a specific point
     * @param {int} x X position of a pixel on the canvas
     * @param {int} y Y position of a pixel on the canvas
     */
    getWordAt(x, y) {
        // Computes row and column
        const col = Math.floor(x * this.grid.cols / this.canvas.offsetWidth)
        const row = Math.floor(y * this.grid.rows / this.canvas.offsetHeight)

        return this.vram.getWordAt(col, row)
    }
}
