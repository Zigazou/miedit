"use strict"
/**
 * @file vdu-cursor.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * A callback that is called for a position.
 * @callback execForXY
 * @param {int} X position.
 * @param {int} Y position.
 */

/**
 * VDUCursor simulates a blinking cursor on a canvas.
 */
Minitel.VDUCursor = class {
    /**
     * @param {Minitel.TextGrid} grid The text grid.
     * @param {Minitel.CharSize} char The char size.
     * @param {HTMLCanvasElement} cancur Canvas displaying the cursor.
     */
    constructor(grid, char, cancur) {
        const frameRate = 50

        /**
         * The text grid.
         * @member {Minitel.TextGrid}
         */
        this.grid = grid

        /**
         * The char size.
         * @member {Minitel.CharSize}
         */
        this.char = char

        /**
         * X position.
         * @member {int}
         */
        this.x = 0

        /**
         * Y position.
         * @member {int}
         */
        this.y = 0

        /**
         * Cursor visibility.
         * @member {boolean}
         */
        this.visible = false

        /**
         * Cursor color.
         * @member {string}
         * @private
         */
        this.color = "#FFFFFF"

        /**
         * Canvas on which to draw cursor.
         * @member {HTMLCanvasElement}
         */
        this.canvas = cancur

        /**
         * Previous state
         * @member {string}
         * @private
         */
        this.previousState = ""

        /**
         * The indicator helps locating the cursor when developping or editing.
         * @member {boolean}
         * @private
         */
        this.indicator = false

        /**
         * Timer ID of the screen refresh timer.
         * @member {number}
         * @private
         */
        this.refresh = undefined

        if(this.canvas !== undefined) {
            this.refresh = window.setInterval(
                () => this.draw(),
                1000 / frameRate
            )
        }
    }

    /**
     * Enable or disable the indicator
     * @param {boolean} indicator true to enable the indicator, false otherwise.
     */
    setIndicator(indicator) {
        this.indicator = indicator
        return this
    }

    /**
     * Set cursor position.
     * This method does not check that coordinates are in rage of the text grid.
     * @param {int} x X position.
     * @param {int} y Y position.
     */
    set(x, y) {
        this.x = x
        this.y = y

        return this
    }

    /**
     * Move the cursor on the left.
     * This method does not check that coordinates are in rage of the text grid.
     * @return {int?} offset Offset to subtract from X position, 1 if not given.
     */
    left(offset) {
        this.set(this.x - (offset || 1), this.y)
    }

    /**
     * Move the cursor on the right.
     * This method does not check that coordinates are in rage of the text grid.
     * @return {int?} offset Offset to add to X position, 1 if not given.
     */
    right(offset) {
        this.set(this.x + (offset || 1), this.y)
    }

    /**
     * Move the cursor up.
     * This method does not check that coordinates are in rage of the text grid.
     * @return {int?} offset Offset to subtract from Y position, 1 if not given.
     */
    up(offset) {
        this.set(this.x, this.y - (offset || 1))
    }

    /**
     * Move the cursor down
     * This method does not check that coordinates are in rage of the text grid.
     * @return {int?} offset Offset to add to Y position, 1 if not given.
     */
    down(offset) {
        this.set(this.x, this.y + (offset || 1))
    }

    /**
     * Set cursor color.
     * @param {string} color Cursor color (#RRGGBB).
     */
    setColor(color) {
        this.color = color

        return this
    }

    /**
     * Set cursor visiblity.
     * @param {boolean} visible Cursor visibility
     */
    setVisible(visible) {
        this.visible = visible
    }

    /**
     * Get cursor blink state.
     * @return {boolean}
     */
    getBlink() {
        const msecs = (new Date()).getTime()
        return msecs % 900 >= 450
    }

    /**
     * Move the cursor to the first column of the first row.
     */
    home() {
        this.set(0, 1)
    }

    /**
     * Move the cursor to the last column of the current row.
     */
    lastColumn() {
        this.set(this.grid.cols - 1, this.y)
    }

    /**
     * Move the cursor to the first column of the current row.
     */
    firstColumn() {
        this.set(0, this.y)
    }

    /**
     * Move the cursor to the last row.
     */
    lastRow() {
        this.set(this.x, this.grid.rows - 1)
    }

    /**
     * Move the cursor to the status row.
     */
    statusRow() {
        this.set(this.x, 0)
    }

    /**
     * Move the cursor to the first row.
     */
    firstRow() {
        this.set(this.x, 1)
    }

    /**
     * Test if the cursor is on the status row.
     * @return {boolean}
     */
    isOnStatusRow() {
        return this.y === 0
    }

    /**
     * Test if the cursor is on the first row.
     * @return {boolean}
     */
    isOnFirstRow() {
        return this.y === 1
    }

    /**
     * Test if the cursor is on the last row.
     * @return {boolean}
     */
    isOnLastRow() {
        return this.y === this.grid.rows - 1
    }

    /**
     * Test if the cursor is on the first column.
     * @return {boolean}
     */
    isOnFirstCol() {
        return this.x === 0
    }

    /**
     * Test if the cursor is on the last column.
     * @return {boolean}
     */
    isOnLastCol() {
        return this.x === this.grid.cols - 1
    }

    /**
     * Call a function for each position from home to cursor.
     * @param {execForXY} func Function to call for each coordinate.
     */
    homeToCursor(func) {
        range(0, this.x + 1).forEach(x => func(x, this.y))

        const [cols, rows] = [this.grid.cols, this.y]
        range2([0, 0], [rows, cols]).forEach((y, x) => func(x, y))
    }

    /**
     * Call a function for each position from cursor to end of screen.
     * @param {execForXY} func Function to call for each coordinate.
     */
    cursorToEndOfScreen(func) {
        range(this.x, this.grid.cols).forEach(x => func(x, this.y))

        const [cols, rows] = [this.grid.cols, this.grid.rows]
        range2([this.y + 1, 0], [rows, cols]).forEach((y, x) => func(x, y))
    }

    /**
     * Call a function for each position from cursor to end of line.
     * @param {execForXY} func Function to call for each coordinate.
     */
    cursorToEndOfLine(func) {
        range(this.x, this.grid.cols).forEach(x => func(x, this.y))
    }

    /**
     * Call a function for each position in the status row.
     * @param {execForXY} func Function to call for each coordinate.
     */
    allStatusRow(func) {
        range(this.grid.cols).forEach(x => func(x, 0))
    }

    /**
     * Call a function for each position from first column to cursor.
     * @param {execForXY} func Function to call for each coordinate.
     */
    firstColumnToCursor(func) {
        range(0, this.x + 1).forEach(x => func(x, this.y))
    }

    /**
     * Call a function for each position on the current row.
     * @param {execForXY} func Function to call for each coordinate.
     */
    allCurrentRow(func) {
        range(0, this.grid.cols).forEach(x => func(x, this.y))
    }

    /**
     * Test if the current Y position is out of range.
     * @return {boolean}
     */
    overflowY() {
        return this.y < 0 || this.y >= this.grid.rows
    }

    /**
     * Test if the current X position is out of range.
     * @return {boolean}
     */
    overflowX() {
        return this.x < 0 || this.x >= this.grid.cols
    }

    /**
     * Calculate a string identifying the current state
     * @return {string}
     * @private
     */
    currentState() {
        return String(this.x) + "-"
             + String(this.y) + "-"
             + String(this.color) + "-"
             + String(this.visible) + "-"
             + String(this.indicator) + "-"
             + String(this.getBlink())
    }

    /**
     * Draw the cursor
     */
    draw() {
        // Compare current and previous states to avoid unneeded drawing
        const currentState = this.currentState()
        if(currentState === this.previousState) {
            return
        } else {
            this.previousState = currentState
        }

        // Clear the cursor canvas
        const ctx = this.canvas.getContext('2d')
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Should the Minitel cursor be shown
        if(!this.isOnStatusRow() && this.visible && !this.getBlink()) {
            // Draw the cursor
            ctx.fillStyle = this.color
            ctx.fillRect(
                this.x * this.char.width,
                this.y * this.char.height,
                this.char.width,
                this.char.height
            )
        }

        // Should the indicator be shown
        if(this.indicator) {
            // Draw the indicator
            ctx.beginPath()

            ctx.strokeStyle = '#FFFF00'
            ctx.setLineDash([2, 1])

            ctx.moveTo(0, this.y * this.char.height)
            ctx.lineTo(1000, this.y * this.char.height)

            ctx.moveTo(0, (this.y + 1) * this.char.height)
            ctx.lineTo(1000, (this.y + 1) * this.char.height)

            ctx.moveTo(this.x * this.char.width, 0)
            ctx.lineTo(this.x * this.char.width, 1000)

            ctx.moveTo((this.x + 1) * this.char.width, 0)
            ctx.lineTo((this.x + 1) * this.char.width, 1000)

            ctx.stroke()
        }
    }

    /**
     * Get the cursor state
     * @return {object} The current cursor state
     */
    saveState() {
        return {
            x: this.x,
            y: this.y,
            color: this.color,
            visible: this.visible
        }
    }

    /**
     * Restore the cursor state
     * @param {object} state The cursor state to restore
     */
    restoreState(state) {
        this.x = state.x
        this.y = state.y
        this.color = state.color
        this.visible = state.visible
    }
}
