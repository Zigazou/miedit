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
    constructor(grid, char, canvas) {
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
         * @member {string[]}
         * @private
         */
        this.colors = Minitel.colors

        // Helper array
        const rows = []
        rows.length = this.grid.rows

        /**
         * G0 is the alphanumeric character set, G1 is the mosaic character set
         * @member {Object}
         * @private
         */
        this.font = {
            "G0": this.loadFont("font/ef9345-g0.png"),
            "G1": this.loadFont("font/ef9345-g1.png"),
        }

        /**
         * Cursor position and visibility
         * @member {Cursor}
         * @private
         */
        this.cursor = { x: 0, y: 1, visible: false }

        /**
         * A two dimension array of Cells
         * @member {Cell[][]}
         * @private
         */
        this.memory = []

        // Initializes the page memory with default mosaic cells
        for(let j = 0; j < this.grid.rows; j++) {
            let row = []
            for(let i = 0; i < this.grid.cols; i++) {
                row[i] = new MosaicCell()
            }
            this.memory[j] = row
        }

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
        for(let y = 1; y < this.grid.rows; y++) {
            for(let x = 0; x < this.grid.cols; x++) {
                this.memory[y][x] = new MosaicCell()
            }
            this.changed[y] = true
        }
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
    loadFont(url) {
        return new FontSprite(
            url,
            { cols: 8, rows: 16 },
            this.char,
            this.colors
        )
    }

    /**
     * Scroll the page memory in a direction. It takes the page mode into
     * account.
     * @param {string} direction "up" or "down"
     */
    scroll(direction) {
        const newRow = new Array(this.grid.cols)
        for(let col = 0; col < this.grid.cols; col++) {
            newRow[col] = new MosaicCell()
        }

        if(direction === "up") {
            for(let row = 2; row < this.grid.rows; row++) {
                this.memory[row] = this.memory[row + 1];
                this.changed[row] = true;
            }

            this.memory[this.grid.rows - 1] = newRow
            this.changed[this.grid.rows - 1] = true
        } else if(direction === "down") {
            for(let row = this.grid.rows - 1; row > 1; row--) {
                this.memory[row] = this.memory[row - 1]
                this.changed[row] = true
            }

            this.memory[1] = newRow
            this.changed[1] = true
        }
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
        ctx.mozImageSmoothingEnabled = false

        ctx.drawImage(this.canvas, 0, 0, width, height)

        return thumbnail.toDataURL("image/png")
    }

    /**
     * Render the screen.
     * @private
     */
    render() {
        // Do not render if the fonts are not ready
        if(this.font["G0"].isReady === false) return
        if(this.font["G1"].isReady === false) return

        // Add the inverted F on the status line
        const fCell = new CharCell()
        fCell.value = 0x46
        fCell.invert = true
        this.memory[0][38] = fCell

        const [ defaultFgColor, defaultBgColor ] = [ 7, 0 ]
        const ctx = this.context
        const blink = this.getBlink()

        let page = this.font["G0"]
        let part = { x: 0, y: 0 }
        let mult = { width: 1, height: 1 }
        let unde = false

        let [ front, back ] = [ 7, 0 ]

        // Draw each cell
        for(let row = 0; row < this.grid.rows; row++) {
            // Draw the row only if needed
            if(!this.changed[row]) {
                if(!this.blinking[row]) continue
                if(this.lastBlink === blink) continue
            }

            // Zone attributes
            let bgColor = defaultBgColor
            let mask = false
            let underline = false
            this.changed[row] = false

            const y = row * this.char.height

            let blinkRow = false
            for(let col = 0; col < this.grid.cols; col++) {
                const cell = this.memory[row][col]
                const x = col * this.char.width

                if(!(cell instanceof CharCell)) {
                    bgColor = cell.bgColor
                    underline = false
                }
                
                if(!(cell instanceof DelimiterCell) && cell.blink === true) {
                    blinkRow = true
                }

                if(!(cell instanceof MosaicCell) && cell.invert === true) {
                    [ front, back ] = [ bgColor, cell.fgColor ]
                } else {
                    [ front, back ] = [ cell.fgColor, bgColor ]
                }

                // Draw background
                ctx.fillStyle = this.colors[back]
                ctx.fillRect(x, y, this.char.width, this.char.height)

                // Draw character
                if(   mask !== true
                   && !(   !(cell instanceof DelimiterCell)
                        && cell.blink === true
                        && blink === (cell instanceof MosaicCell
                                      || !cell.invert))
                                     ) {
                    if(cell instanceof CharCell) {
                        page = this.font["G0"]
                        part = cell.part
                        mult = cell.mult
                        unde = underline
                    } else if(cell instanceof DelimiterCell) {
                        page = this.font["G0"]
                        part = { x: 0, y: 0 }
                        mult = cell.mult
                        unde = underline
                    } else {
                        page = this.font["G1"]
                        part = { x: 0, y: 0 }
                        mult = { width: 1, height: 1 }
                        unde = false
                    }

                    page.writeChar(ctx, cell.value, x, y, part, mult, front, unde)
                }

                if(cell instanceof DelimiterCell) {
                    if(cell.mask !== undefined) {
                        mask = cell.mask
                    }

                    if(cell.zoneUnderline !== undefined) {
                        underline = cell.zoneUnderline
                    }
                }
            }

            this.blinking[row] = blinkRow
        }

        this.lastBlink = blink
    }
}
