"use strict"

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * A Cell contains one character and its visual attributes.
 *
 * @abstract
 */
Minitel.Cell = class {
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
        return new Minitel.Cell(this.value, this.fgColor)
    }

    /**
     * Returns a string version of the Cell.
     * This method must be implemented by the children of this class
     * @return {string} the string version.
     * @abstract
     */
    toString() {
        return ""
    }

    /**
     * Import cell's data from a string.
     * @param {string} image String to parse.
     * @abstract
     */
    fromString(image) {
    }
}

/**
 * A CharCell is a particular Cell which holds alphanumerical characters.
 * Such characters only have blink, invert, size multiplier and DRCS
 * attributes.
 * @extends Cell
 */
Minitel.CharCell = class extends Minitel.Cell {
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
        return this.value >= 0x41 && this.value <= 0x5A // A-Z
            || this.value >= 0x61 && this.value <= 0x7A // a-z
            || this.value >= 0x30 && this.value <= 0x39 // 0-9
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
        const cell = new Minitel.CharCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.blink = this.blink
        cell.invert = this.invert
        cell.mult = { width: this.mult.width, height: this.mult.height }
        cell.part = { x: this.part.x, y: this.part.y }
        cell.drcs = this.drcs

        return cell
    }

    /**
     * Returns a string version of the Cell.
     * This method must be implemented by the children of this class
     * @return {string} the string version.
     */
    toString() {
        return "C"
             + this.value.toString(16).padStart(2, "0")
             + this.fgColor.toString()
             + (this.blink ? "1" : "0")
             + (this.invert ? "1" : "0")
             + this.mult.width.toString()
             + this.mult.height.toString()
             + this.part.x.toString()
             + this.part.y.toString()
             + (this.drcs ? "1" : "0")
    }

    /**
     * Import cell's data from a string.
     * @param {string} image String to parse.
     * @abstract
     */
    fromString(image) {
        if(image.substr(0, 1) !== 'C') return false
        if(image.length !== 11) return false

        this.value = parseInt(image.substr(1, 2), 16)
        this.fgColor = parseInt(image.substr(3, 1))
        this.blink = image.substr(4, 1) === "1"
        this.invert = image.substr(5, 1) === "1"
        this.mult.width = parseInt(image.substr(6, 1))
        this.mult.height = parseInt(image.substr(7, 1))
        this.part.x = parseInt(image.substr(8, 1))
        this.part.y = parseInt(image.substr(9, 1))
        this.drcs = image.substr(10, 1) === "1"
    }
}

/**
 * A MosaicCell is a particular Cell which holds mosaic characters.
 * Such characters only have background color, blink, separation and DRCS
 * attributes.
 * @extends Cell
 */
Minitel.MosaicCell = class extends Minitel.Cell {
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
        const cell = new Minitel.MosaicCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.bgColor = this.bgColor
        cell.blink = this.blink
        cell.separated = this.separated
        cell.drcs = this.drcs

        return cell
    }

    /**
     * Returns a string version of the Cell.
     * This method must be implemented by the children of this class
     * @return {string} the string version.
     */
    toString() {
        return "M"
             + this.value.toString(16).padStart(2, "0")
             + this.fgColor.toString()
             + this.bgColor.toString()
             + (this.blink ? "1" : "0")
             + (this.separated ? "1" : "0")
             + (this.drcs ? "1" : "0")
    }

    /**
     * Import cell's data from a string.
     * @param {string} image String to parse.
     * @abstract
     */
    fromString(image) {
        if(image.substr(0, 1) !== 'M') return false
        if(image.length !== 8) return false

        this.value = parseInt(image.substr(1, 2), 16)
        this.fgColor = parseInt(image.substr(3, 1))
        this.bgColor = parseInt(image.substr(4, 1))
        this.blink = image.substr(5, 1) === "1"
        this.separated = image.substr(6, 1) === "1"
        this.drcs = image.substr(7, 1) === "1"
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
Minitel.DelimiterCell = class extends Minitel.Cell {
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
        const cell = new Minitel.DelimiterCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.bgColor = this.bgColor
        cell.invert = this.invert
        cell.zoneUnderline = this.zoneUnderline
        cell.mask = this.mask
        cell.mult = { width: this.mult.width, height: this.mult.height }

        return cell
    }

    /**
     * Returns a string version of the Cell.
     * This method must be implemented by the children of this class
     * @return {string} the string version.
     */
    toString() {
        return "D"
             + this.value.toString(16).padStart(2, "0")
             + this.fgColor.toString()
             + this.bgColor.toString()
             + (this.invert ? "1" : "0")
             + (this.zoneUnderline ? "1" : "0")
             + (this.mask ? "1" : "0")
             + this.mult.width.toString()
             + this.mult.height.toString()
    }

    /**
     * Import cell's data from a string.
     * @param {string} image String to parse.
     * @abstract
     */
    fromString(image) {
        if(image.substr(0, 1) !== 'D') return false
        if(image.length !== 10) return false

        this.value = parseInt(image.substr(1, 2), 16)
        this.fgColor = parseInt(image.substr(3, 1))
        this.bgColor = parseInt(image.substr(4, 1))
        this.invert = image.substr(5, 1) === "1"
        this.zoneUnderline = image.substr(6, 1) === "1"
        this.mask = image.substr(7, 1) === "1"
        this.mult.width = parseInt(image.substr(8, 1))
        this.mult.height = parseInt(image.substr(9, 1))
    }
}

/**
 * Parse a string into a Cell. Automatically determines which class to use.
 *
 * @param {string} image String to parse into a Cell.
 * @returns {Minitel.Cell}
 */
Minitel.Cell.fromString = function(image) {
    let cell
    if(image.substr(0, 1) === 'C') {
        cell = new Minitel.CharCell()
    } else if(image.substr(0, 1) === 'M') {
        cell = new Minitel.MosaicCell()
    } else {
        cell = new Minitel.DelimiterCell()
    }

    cell.fromString(image)

    return cell
}