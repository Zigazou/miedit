"use strict"
/**
 * @file vram
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * VRAM simulates video memory for the VDU class.
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * PageMemory is a rendering of a page memory in a canvas
 */
Minitel.VRAM = class {
    /**
     * @param {Minitel.TextGrid} grid How the page is organized.
     */
    constructor(grid) {
        /**
         * @member {Grid}
         * @private
         */
        this.grid = grid

        /**
         * A two dimension array of Cells
         * @member {Cell[][]}
         */
        this.memory = []

        // Initializes the page memory with default mosaic cells
        range(0, this.grid.rows).forEach(j => {
            let row = []
            range(0, this.grid.cols).forEach(i => {
                row[i] = new Minitel.MosaicCell()
            })
            this.memory[j] = row
        })
    }

    /**
     * Set the Cell at (X, Y) position in video memory
     *
     * @param {number} x X position of the cell
     * @param {number} y Y position of the cell
     * @param {Cell} cell The cell
     */
    set(x, y, cell) {
        this.memory[y][x] = cell
    }

    /**
     * Get the Cell at (X, Y) position in video memory. If only one parameter
     * is given, it returns the entire row selected by this parameter.
     *
     * @param {number} x X position of the cell
     * @param {number?} y Y position of the cell
     * @return {Cell} The cell
     */
    get(x, y) {
        if(y === undefined) {
            return this.memory[x]
        } else {
            return this.memory[y][x]
        }
    }

    /**
     * Clear the page
     */
    clear() {
        range(1, this.grid.rows).forEach(y => {
            range(0, this.grid.cols).forEach(x => {
                this.memory[y][x] = new Minitel.MosaicCell()
            })
        })
    }

    /**
     * Scroll the page memory in a direction. It takes the page mode into
     * account.
     * @param {string} direction "up" or "down"
     */
    scroll(direction) {
        const newRow = new Array(this.grid.cols)
        range(0, this.grid.cols).forEach(col => {
            newRow[col] = new Minitel.MosaicCell()
        })

        if(direction === "up") {
            range(1, this.grid.rows).forEach(row => {
                this.memory[row] = this.memory[row + 1]
            })

            this.memory[this.grid.rows - 1] = newRow
        } else if(direction === "down") {
            range(this.grid.rows - 1, 1).forEach(row => {
                this.memory[row] = this.memory[row - 1]
            })

            this.memory[1] = newRow
        }
    }

    /**
     * Get the word at a specific point
     * @param {int} col Column of a character in the vram
     * @param {int} row Row of a charcter in the vram
     */
    getWordAt(col, row) {
        // Ensures coordinates are valid
        if(col < 0 || col >= this.grid.cols) return ""
        if(row < 0 || row >= this.grid.rows) return ""

        // A word cannot be retrieved from anything else than a CharCell
        const origin = this.memory[row][col]
        if(!(origin instanceof Minitel.CharCell)) return ""
        if(!origin.isAlphanumerical()) return ""

        // Find the first readable character on the left
        let first = col - 1
        while(   first >= 0
              && this.memory[row][first] instanceof Minitel.CharCell
              && this.memory[row][first].hasSameAttributes(origin)
              && this.memory[row][first].isAlphanumerical()
        ) first--

        // Find the last readable character on the right
        let last = col + 1
        while(   last < this.grid.cols
            && this.memory[row][last] instanceof Minitel.CharCell
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

    load(screen) {
        if(screen === null || screen === undefined) return

        const sizes = { C: 11, M: 8, D: 10 }
        let offset = 0

        range(1, this.grid.rows).forEach(y => {
            range(0, this.grid.cols).forEach(x => {
                const cellType = screen.substr(offset, 1)

                if(!(cellType in sizes)) {
                    throw new SyntaxError(
                        "Unknown cell type " + cellType + " @" + offset
                    )
                }

                this.set(
                    x, y,
                    Minitel.Cell.fromString(
                        screen.substr(offset, sizes[cellType])
                    )
                )

                offset += sizes[cellType]
            })
        })
    }

    save() {
        let save = ""

        range(1, this.grid.rows).forEach(y => {
            range(0, this.grid.cols).forEach(x => {
                save += this.memory[y][x].toString()
            })
        })

        return save
    }
}
