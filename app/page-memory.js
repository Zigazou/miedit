"use strict"
/**
 * @file page-memory
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * PageMemory simulates a Minitel page memory connected to a screen using a 
 * canvas.
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
 * PageMemory is a rendering of a page memory in a canvas
 */
class PageMemory {
    /**
     * @param {Object} grid How the page is organized.
     * @param {Object} char Character characteristics.
     * @param {HTMLCanvasElement} canvas The canvas which will be used as the
     *                                   screen.
     * @param {boolean} color true for color, false for black and white
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

        /**
         * @member {boolean}
         * @private
         */
        this.globalMask = true

        /**
         * The status character shown in the upper right corner of the screen
         * @member {int}
         * @private
         */
        this.statusCharacter = 0x46

        // Helper array
        const rows = []
        rows.length = this.grid.rows

        const bgSave = document.createElement("canvas")
        bgSave.width = this.char.width
        bgSave.height = this.char.height
        const cursorCtx = bgSave.getContext("2d")
        cursorCtx.imageSmoothingEnabled = false

        /**
         * Cursor position and visibility
         * @member {Object}
         * @property {integer} x X position
         * @property {integer} y Y position
         * @property {boolean} visible Is the cursor visible or not?
         * @property {CanvasRenderingContext2D} ctx Cursor context
         * @property {HTMLCanvasElement} bgSave Cursor saving area
         * @property {integer=} lastX Last X position
         * @property {integer=} lastY Last Y position
         * @private
         */
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
         * @property {FontSprite} G0 Standard font sprites
         * @property {FontSprite} G1 Mosaic font sprites
         * @property {FontSprite} G'0 DRCS standard font sprites
         * @property {FontSprite} G'1 DRCS mosaic font sprites
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
     * Force redraw of the entire page.
     */
    forceRedraw() {
        this.changed = this.changed.map(() => true)
    }

    /**
     * Clear the page
     */
    clear() {
        range(1, this.grid.rows).forEach(y => {
            range(0, this.grid.cols).forEach(x => {
                this.memory[y][x] = new MosaicCell()
            })
        })
        this.forceRedraw()
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
     * @param {string[]} colors List of colors to use in #RRGGBB format
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
     * @param {number[]} design An array of 10 bytes defining the character
     */
    defineCharG0(ord, design) {
        this.font["G'0"].defineChar(ord, design)
        this.forceRedraw()
    }

    /**
     * Redefine a character (DRCS)
     * @param {number} ord Character ordinal
     * @param {number[]} design An array of 10 bytes defining the character
     */
    defineCharG1(ord, design) {
        this.font["G'1"].defineChar(ord, design)
        this.forceRedraw()
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
            range(1, this.grid.rows).forEach(row => {
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
     * Enable or disable the use of zone masking.
     * @param {boolean} enabled true enables the use of zone masking, false
     *                          disables the use of zone masking.
     */
    setGlobalMask(enabled) {
        this.globalMask = enabled
        this.forceRedraw()
    }

    /**
     * Change colors (black and white or color)
     * @param {boolean} color true for color, false for black and white
     */
    changeColors(color) {
        this.colors = color ? Minitel.colors : Minitel.grays
        for(let index in this.font) this.font[index].color = color
        this.forceRedraw()
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
     * Defines the status character shown in the upper right corner of the
     * Minitel screen.
     * @param {int} code the Minitel code to display.
     */
    setStatusCharacter(code) {
        this.statusCharacter = code;
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
        fCell.value = this.statusCharacter
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
                if(cell.mask !== undefined ) {
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

    /**
     * Save the cursor area
     * @private
     */
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

    /**
     * Restore the cursor area
     * @private
     */
    cursorRestore() {
        if(!this.cursor.visible && !this.getBlink()) {
            return
        }

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

    /**
     * Draw the cursor
     * @private
     */
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

    /**
     * Get the word at a specific point
     * @param {int} x X position of a pixel on the canvas
     * @param {int} y Y position of a pixel on the canvas
     */
    getWordAt(x, y) {
        // Ensures coordinates are valid
        if(x < 0 || x >= this.canvas.offsetWidth) return ""
        if(y < 0 || y >= this.canvas.offsetHeight) return ""

        // Computes row and column
        const col = Math.floor(x * this.grid.cols / this.canvas.offsetWidth)
        const row = Math.floor(y * this.grid.rows / this.canvas.offsetHeight)

        // A word cannot be retrieved from anything else than a CharCell
        const origin = this.memory[row][col]
        if(!(origin instanceof CharCell)) return ""
        if(!origin.isAlphanumerical()) return ""

        // Find the first readable character on the left
        let first = col - 1
        while(   first >= 0
              && this.memory[row][first] instanceof CharCell
              && this.memory[row][first].hasSameAttributes(origin)
              && this.memory[row][first].isAlphanumerical()
        ) first--

        // Find the last readable character on the right
        let last = col + 1
        while(   last < this.grid.cols
            && this.memory[row][last] instanceof CharCell
            && this.memory[row][last].hasSameAttributes(origin)
            && this.memory[row][last].isAlphanumerical()
        ) last++

        // Concat each character from first to last
        let string = ""
        this.memory[row].slice(first + 1, last).forEach(cell => {
            string += String.fromCharCode(cell.value)
        })

        return string
    }
}
