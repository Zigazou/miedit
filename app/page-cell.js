"use strict"

/**
 * A Cell.
 * This class is meant to be inherited.
 * @class Cell
 */
class Cell {
    /**
     * @param {number} value the character ordinal number
     * @param {number} fgColor the foreground color (0 to 7)
     */
    constructor(value, fgColor) {
        /**
         * The character ordinal number
         * @member {number}
         */
        this.value = value

        /**
         * The foreground color (0 to 7)
         * @member {number}
         */
        this.fgColor = fgColor
    }

    /**
     * Returns a copy of the Cell.
     * This method must be implemented by the children of this class
     * @return {Cell} a copy of the cell
     */
    copy() {
    
    }
}

/**
 * @class CharCell
 */
class CharCell extends Cell {
    constructor() {
        super(0x20, 7)

        /**
         * Does the character blink?
         * @member {boolean}
         */
        this.blink = false

        /**
         * Is the character displayed with foreground and background colors
         * inverted
         * @member {boolean}
         */
        this.invert = false

        /**
         * Character size multiplier
         * @member {object}
         * @property {number} width width multiplier (1 or 2)
         * @property {number} height height multiplier (1 or 2)
         */
        this.mult = { width: 1, height: 1 }

        /**
         * Character part to be displayed. 
         * @member {object}
         * @property {number} x x part to display (0 for left, 1 for right)
         * @property {number} y y part to display (0 for bottom, 1 top)
         */
        this.part = { x: 0, y: 0 }

        /**
         * Whether the DRCS version of the character should by displayed or not
         * @member {boolean}
         */
        this.drcs = false

        Object.preventExtensions(this)
    }

    /**
     * Returns a copy of the CharCell.
     * @return {CharCell} a copy of the CharCell
     */
    copy() {
        const cell = new CharCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.blink = this.blink
        cell.invert = this.invert
        cell.mult = { width: this.mult.width, height: this.mult.height }
        cell.part = { x: this.part.x, y: this.part.y }
        cell.drcs = this.drcs

        return cell
    }
}

/**
 * @class CharCell
 */
class MosaicCell extends Cell {
    constructor() {
        super(0x40, 7)

        /**
         * The background color (0 to 7)
         * @member {number}
         */
        this.bgColor = 0

        /**
         * Does the character blink?
         * @member {boolean}
         */
        this.blink = false

        /**
         * Whether the separated version of the character should by displayed or
         * not
         * @member {boolean}
         */
        this.separated = false

        /**
         * Whether the DRCS version of the character should by displayed or not
         * @member {boolean}
         */
        this.drcs = false

        Object.preventExtensions(this)
    }

    /**
     * Returns a copy of the MosaicCell.
     * @return {MosaicCell} a copy of the MosaicCell
     */
    copy() {
        const cell = new MosaicCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.bgColor = this.bgColor
        cell.blink = this.blink
        cell.separated = this.separated
        cell.drcs = this.drcs

        return cell
    }
}

/**
 * @class DelimiterCell
 */
class DelimiterCell extends Cell {
    constructor() {
        super(0x20, 7)

        /**
         * The background color (0 to 7)
         * @member {number}
         */
        this.bgColor = 0

        /**
         * Is the character displayed with foreground and background colors
         * inverted
         * @member {boolean}
         */
        this.invert = false

        /**
         * Does the delimiter annonciate an underlined zone?
         * @member {boolean=}
         */
        this.zoneUnderline = undefined

        /**
         * Are attributes masked?
         * @member {boolean=}
         */
        this.mask = undefined

        /**
         * Character size multiplier
         * @member {object}
         * @property {number} width width multiplier (1 or 2)
         * @property {number} height height multiplier (1 or 2)
         */
        this.mult = { width: 1, height: 1 }

        Object.preventExtensions(this)
    }

    /**
     * Returns a copy of the DelimiterCell.
     * @return {DelimiterCell} a copy of the DelimiterCell
     */
    copy() {
        const cell = new DelimiterCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.bgColor = this.bgColor
        cell.invert = this.invert
        cell.zoneUnderline = this.zoneUnderline
        cell.mask = false
        cell.mult = { width: this.mult.width, height: this.mult.height }

        return cell
    }
}
