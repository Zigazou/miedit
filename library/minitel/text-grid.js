"use strict"
/**
 * @file text-grid.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * TextGrid is a simple class used to describe the dimensions of a text grid.
 */
Minitel.TextGrid = class {
    /**
     * @param {int} cols Number of characters per width.
     * @param {int} rows Number of characters per height.
     */
    constructor(cols, rows) {
        /**
         * Number of characters per width.
         * @member {string}
         */
        this.cols = cols

        /**
         * Number of characters per height.
         * @member {string}
         */
        this.rows = rows
    }

    /**
     * Returns a copy of the Text Grid.
     * @return {Minitel.TextGrid} a copy of the Text Grid
     */
    copy() {
        return new Minitel.TextGrid(this.cols, this.rows)
    }
}
