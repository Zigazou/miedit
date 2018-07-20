"use strict"

/**
 * A Cell contains one character and its visual attributes.
 *
 * @abstract
 */
class Cell {
    /**
     * Create a Cell.
     *
     * @param {number} value the character ordinal number
     * @param {number} fgColor the foreground color (0 to 7)
     * @constructor
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
     * @abstract
     */
    copy() {
    
    }
}

/**
 * A CharCell is a particular Cell which holds alphanumerical characters.
 * Such characters only have blink, invert, size multiplier and DRCS
 * attributes.
 * @extends Cell
 */
class CharCell extends Cell {
    /**
     * Create a CharCell.
     *
     * The CharCell is initialized with the following values:
     * 
     * - character code set to 0x20 (a space)
     * - foreground color set to 7 (white)
     * - no blinking
     * - no video inverse
     * - no size multiplying
     * - not using DRCS
     */
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
         * @property {number} x X part to display (0 for left, 1 for right)
         * @property {number} y Y part to display (0 for bottom, 1 top)
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
     * Tests if the character in the cell is alphanumeric (true) or not (false).
     * @return {boolean}
     */
    isAlphanumerical() {
        return (this.value >= 0x41 && this.value <= 0x5A)
            || (this.value >= 0x61 && this.value <= 0x7A)
            || (this.value >= 0x31 && this.value <= 0x39)
    }

    /**
     * Verify that two cells have the same attributes values (true) or not
     * (false).
     * @param {CharCell} cell 
     * @return {boolean}
     */
    hasSameAttributes(cell) {
        return cell.fgColor === this.fgColor
            && cell.blink === this.blink
            && cell.invert === this.invert
            && cell.mult.width === this.mult.width
            && cell.mult.height === this.mult.height
            && cell.part.x === this.part.x
            && cell.part.y === this.part.y
            && cell.drcs === this.drcs
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
 * A MosaicCell is a particular Cell which holds mosaic characters.
 * Such characters only have background color, blink, separation and DRCS
 * attributes.
 * @extends Cell
 */
class MosaicCell extends Cell {
    /**
     * Create a MosaicCell with the following attributes:
     *
     * - character code set to 0x40
     * - background color set to 0 (black)
     * - no blinking
     * - no separation
     * - not using DRCS
     */
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
 * A DelimiterCell is a particular Cell which contains a delimiter character.
 * Such characters only have background color, invertion, underlining, masking,
 * and size multiplier attributes.
 *
 * A DelimiterCell is an empty "character".
 *
 * They generally contains attributes that CharacterCell characters cannot
 * contain such as background color, masking or underlining.
 * @extends Cell
 */
class DelimiterCell extends Cell {
    /**
     * Create a DelimiterCell with the following attributes:
     *
     * - character code set to 0x20 (a space)
     * - foregorund color set to 7 (white)
     * - background color set to 0 (black)
     * - no video inverse
     * - no underlining
     * - no masking
     * - no size multiplier
     */
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
        cell.mask = this.mask
        cell.mult = { width: this.mult.width, height: this.mult.height }

        return cell
    }
}
