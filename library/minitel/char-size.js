"use strict"
/**
 * @file char-size.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * CharSize is a simple class used to describe the dimensions of a character.
 */
Minitel.CharSize = class {
    /**
     * @param {int} width Width in pixels of a character.
     * @param {int} height Height in pixels of a character.
     */
    constructor(width, height) {
        /**
         * Width in pixels of a character.
         * @member {int}
         */
        this.width = width

        /**
         * Height in pixels of a character.
         * @member {int}
         */
        this.height = height
    }

    /**
     * Returns a copy of the Char Size.
     * @return {Minitel.CharSize} a copy of the Char Size
     */
    copy() {
        return new Minitel.CharSize(this.width, this.height)
    }
}
