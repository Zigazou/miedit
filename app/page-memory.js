"use strict"
/**
 * @file page-memory
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * PageMemory simulates a Minitel page memory connected to a screen using a 
 * canvas.
 *
 * @typedef {Object} Grid
 * @property {number} cols Number of characters per width.
 * @property {number} rows Number of characters per height.
 *
 * @typedef {Object} Char
 * @property {number} width Width in pixels of a character.
 * @property {number} height Height in pixels of a character.
 *
 */

/**
 * @class PageMemory
 */
class PageMemory {
    /**
     * @param {Object} grid How the page is organized.
     * @param {Object} char Character characteristics.
     * @param {HTMLCanvasElement} canvas The canvas which will be used as the
     *                                   screen.
     */
    constructor(grid, char, canvas, color) {
        const frameRate = 50 // Frame per second

        /**
         * @member {Grid}
         * @private
         */
        this.grid = grid

        /**
         * @member {Char}
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

        // Helper array
        const rows = []
        rows.length = this.grid.rows

        /**
         * Cursor position and visibility
         * @member {Cursor}
         * @private
         */
        const bgSave = document.createElement("canvas")
        bgSave.width = this.char.width
        bgSave.height = this.char.height
        const cursorCtx = bgSave.getContext("2d")
        cursorCtx.imageSmoothingEnabled = false

        this.cursor = {
            x: 0,
            y: 1,
            visible: false,
            ctx: cursorCtx,
            bgSave: bgSave,
            lastX: undefined,
            lastY: undefined
        }

        /**
         * A two dimension array of Cells
         * @member {Cell[][]}
         * @private
         */
        this.memory = []

        // Initializes the page memory with default mosaic cells
        range(0, this.grid.rows).forEach(j => {
            let row = []
            range(0, this.grid.cols).forEach(i => {
                row[i] = new MosaicCell()
            })
            this.memory[j] = row
        })

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
         * @private
         */
        this.changed = rows.map(() => true)

        /**
         * G0 is the alphanumeric character set, G1 is the mosaic character set
         * G'0 and G'1 are the DRCS counterpart
         * @member {Object}
         * @private
         */
        this.font = {
            "G0": this.loadFont("font/ef9345-g0.png"),
            "G1": this.loadFont("font/ef9345-g1.png"),
            "G'0": this.loadFont("font/blank.png"),
            "G'1": this.loadFont("font/blank.png"),
        }

        this.changeColors(color)

        /**
         * Timer ID of the refresh timer.
         * @member {number}
         * @private
         */
        this.refresh = window.setInterval(
            () => { this.render() },
            1000 / frameRate
        )
    }

    /**
     * Set the Cell at (X, Y) position in page memory
     *
     * @param {number} x X position of the cell
     * @param {number} y Y position of the cell
     * @param {Cell} cell The cell
     */
    set(x, y, cell) {
        this.memory[y][x] = cell
        this.changed[y] = true
    }

    /**
     * Clear the page
     */
    clear() {
        range(1, this.grid.rows).forEach(y => {
            range(0, this.grid.cols).forEach(x => {
                this.memory[y][x] = new MosaicCell()
            })
            this.changed[y] = true
        })
    }

    /**
     * Get blink state.
     * @return {boolean}
     */
    getBlink() {
        const msecs = (new Date()).getTime()
        return (msecs % 1500) >= 750
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
     * @return {FontSprite}
     */
    loadFont(url, colors) {
        return new FontSprite(
            url,
            { cols: 8, rows: 16 },
            this.char
        )
    }

    /**
     * Redefine a character (DRCS)
     * @param {number} ord Character ordinal
     * @param {Array[number]} design An array of 10 bytes defining the character
     */
    defineCharG0(ord, design) {
        this.font["G'0"].defineChar(ord, design)
    }

    /**
     * Redefine a character (DRCS)
     * @param {number} ord Character ordinal
     * @param {Array[number]} design An array of 10 bytes defining the character
     */
    defineCharG1(ord, design) {
        this.font["G'1"].defineChar(ord, design)
    }

    /**
     * Scroll the page memory in a direction. It takes the page mode into
     * account.
     * @param {string} direction "up" or "down"
     */
    scroll(direction) {
        const newRow = new Array(this.grid.cols)
        range(0, this.grid.cols).forEach(col => {
            newRow[col] = new MosaicCell()
        })

        if(direction === "up") {
            range(2, this.grid.rows).forEach(row => {
                this.memory[row] = this.memory[row + 1]
                this.changed[row] = true
            })

            this.memory[this.grid.rows - 1] = newRow
            this.changed[this.grid.rows - 1] = true
        } else if(direction === "down") {
            range(this.grid.rows - 1, 1).forEach(row => {
                this.memory[row] = this.memory[row - 1]
                this.changed[row] = true
            })

            this.memory[1] = newRow
            this.changed[1] = true
        }
    }

    /**
     * Change colors (black and white or color)
     */
    changeColors(color) {
        this.colors = color ? Minitel.colors : Minitel.grays
        for(let index in this.font) this.font[index].color = color

        // Force redraw of the whole screen
        this.changed = this.changed.map(() => true)
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
        if(!this.font["G0"].isReady) return
        if(!this.font["G1"].isReady) return
        if(!this.font["G'0"].isReady) return
        if(!this.font["G'1"].isReady) return

        // Add the inverted F on the status line
        const fCell = new CharCell()
        fCell.value = 0x46
        fCell.invert = true
        this.memory[0][38] = fCell

        const blink = this.getBlink()

        this.cursorRestore()

        // Draw each cell
        range(0, this.grid.rows).forEach(row => {
            // Draw the row only if needed
            if(!this.changed[row]) {
                if(!this.blinking[row]) return
                if(this.lastBlink === blink) return
            }

            this.changed[row] = false

            let blinkRow = this.drawRow(this.memory[row], row, blink)

            this.blinking[row] = blinkRow
        })

        this.cursorSave()
        this.drawCursor()

        this.lastBlink = blink
    }

    drawRow(memoryRow, row, blink) {
        let bgColor = 0
        let mask = false
        let underline = false

        const y = row * this.char.height

        let blinkRow = false

        range(0, this.grid.cols).forEach(col => {
            const cell = memoryRow[col]
            const x = col * this.char.width

            if(!(cell instanceof CharCell)) {
                bgColor = cell.bgColor
                underline = false
            }

            if(!(cell instanceof DelimiterCell) && cell.blink === true) {
                blinkRow = true
            }

            let front = 7
            let back = 0
            if(!(cell instanceof MosaicCell) && cell.invert === true) {
                [ front, back ] = [ bgColor, cell.fgColor ]
            } else {
                [ front, back ] = [ cell.fgColor, bgColor ]
            }

            this.drawCharacter(
                x, y, cell, front, back, mask, blink, underline
            )

            if(cell instanceof DelimiterCell) {
                if(cell.mask) mask = cell.mask
                if(cell.zoneUnderline) underline = cell.zoneUnderline
            }
        })

        return blinkRow
    }

    drawCharacter(x, y, cell, front, back, mask, blink, underline) {
        const ctx = this.context

        // Draw background    
        ctx.fillStyle = this.colors[back]
        ctx.fillRect(x, y, this.char.width, this.char.height)

        if(mask) return
        if(   !(cell instanceof DelimiterCell)
           && cell.blink
           && blink === (cell instanceof MosaicCell || !cell.invert)
        ) return

        // Draw character
        let page = undefined
        let part = { x: 0, y: 0 }
        let mult = { width: 1, height: 1 }
        let unde = false

        if(cell instanceof CharCell) {
            page = cell.drcs ? this.font["G'0"] : this.font["G0"]
            part = cell.part
            mult = cell.mult
            unde = underline
        } else if(cell instanceof DelimiterCell) {
            page = cell.drcs ? this.font["G'0"] : this.font["G0"]
            mult = cell.mult
            unde = underline
        } else {
            page = cell.drcs ? this.font["G'1"] : this.font["G1"]
        }

        page.writeChar(ctx, cell.value, x, y, part, mult, front, unde)
    }

    cursorSave() {
        this.cursor.ctx.drawImage(
            // Source
            this.canvas,
            this.cursor.x * this.char.width,
            this.cursor.y * this.char.height,
            this.char.width,
            this.char.height,

            // Destination
            0, 0,
            this.char.width,
            this.char.height
        )

        this.cursor.lastX = this.cursor.x
        this.cursor.lastY = this.cursor.y
    }

    cursorRestore() {
        this.context.drawImage(
            // Source
            this.cursor.bgSave,
            0, 0,
            this.char.width,
            this.char.height,

            // Destination
            this.cursor.lastX * this.char.width,
            this.cursor.lastY * this.char.height,
            this.char.width,
            this.char.height
        )
    }

    drawCursor() {
        if(!this.cursor.visible || !this.getBlink()) return

        const cell = this.memory[this.cursor.y][this.cursor.x]
        this.context.fillStyle = this.colors[cell.fgColor]
        this.context.fillRect(
            this.cursor.x * this.char.width,
            this.cursor.y * this.char.height,
            this.char.width,
            this.char.height
        )
    }
}
