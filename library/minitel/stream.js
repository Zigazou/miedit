"use strict"
/**
 * @file Stream
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * A Minitel Stream is an helper class which transforms any kind of JavaScript
 * type (string, number, array etc.) to an array of integers.
 *
 * A Minitel Stream is a queue.
 *
 */

var Minitel = Minitel || {}

/**
 * @class Stream
 */
Minitel.Stream = class {

    /**
     * Constructor
     */
    constructor() {
        this.reset()
    }

    /**
     * Reset the stream
     */
    reset() {
        this.items = []
        this.length = 0
    }

    /**
     * 
     * @param item Any value to insert in the queue.
     */
    push(item) {
        if(item === null || item === undefined) return

        if(item instanceof Minitel.Stream) {
            // Stream
            this.items = this.items.concat(item.items)
        } else if(typeof item === "string" && item.length === 1) {
            // String
            this._pushValue(item.charCodeAt(0))
        } else if(typeof item[Symbol.iterator] === "function") {
            // Iterable object
            for(let value of item) this.push(value)
        } else if(typeof item === "number") {
            // Number
            this._pushValue(item)
        }
        this.length = this.items.length
    }

    /**
     * In
     * @param value {number} An integer value to insert in the queue
     * @private
     */
    _pushValue(value) {
        value = parseInt(value)

        if(Minitel.specialChars[value]) {
            // Convert special characters to Minitel codes
            Minitel.specialChars[value].map(v => this.items.push(v))
        } else if(value > 0x7f) {
            // Minitel does not understand values above 0x7f 
            return
        } else {
            this.items.push(value)
        }
    }
}

