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
        /**
         * An array of integer codes
         * @member {number[]}
         */
        this.items = new Array(10000)
        this.length = 0
    }

    toArray() {
        return this.items.slice(0, this.length)
    }

    /**
     * 
     * @param item Any value to insert in the queue.
     */
    push(item) {
        let toPush = undefined

        if(typeof item === "number") {
            // Number
            toPush = item
        } else if(typeof item === "string" && item.length === 1) {
            // String
            toPush = item.charCodeAt(0)
        } else if(item instanceof Minitel.Stream) {
            // Stream
            for(let i = 0; i < item.length; i++) {
                this.items[this.length] = item.items[i]
                this.length++
            }
        } else if(item !== undefined && typeof item[Symbol.iterator] === "function") {
            // Iterable object
            for(let value of item) this.push(value)
        }

        if(toPush !== undefined) {
            if(Minitel.specialChars[toPush]) {
                // Convert special characters to Minitel codes
                Minitel.specialChars[toPush].map(v => {
                    this.items[this.length] = v
                    this.length++
                })
            } else if(toPush > 0x7f) {
                // Minitel does not understand values above 0x7f 
                return
            } else {
                this.items[this.length] = toPush
                this.length++
            }
        }
    }

    /**
     * The shift method
     */
    shift() {
        this.length--
        return this.items.shift()
    }

    /**
     * The pop method
     */
    pop() {
        this.length--
        return this.items.pop()
    }

    /**
     * Generates a trimmed version of the current stream by removing every
     * control codes. It won't properly work when used on anything else than a
     * row.
     * @return {Stream} The trimmed version of the current stream
     */
    trimRow() {
        let lastChar = -1
        for(let i = 0; i < this.length; i++) {
            if(this.items[i] >= 0x20) {
                lastChar = i
                continue
            }

            if(this.items[i] === 0x12) {
                i++
                lastChar = i
                continue
            }

            if(this.items[i] === 0x1b) i++
            if(this.items[i] === 0x1f) i+= 2
        }

        const trimmed = new Minitel.Stream()
        trimmed.push(this.items.slice(0, lastChar + 1))

        return trimmed
    }

    /**
     * Generates an optimized version of the current stream. It won't properly
     * work when used on anything else than a row.
     *
     * @param {boolean} moveFirst If True, the row is considered to be preceded
     *                            by a locate command. If false, the row is part
     *                            of a bigger stream.
     * @return {Stream} An optimized version of the current stream
     */
    optimizeRow(moveFirst) {
        function identity(x) { return x }
        let bg = moveFirst ? 0x50 : -1
        let fg = moveFirst ? 0x47 : -1
        let separated = false
        let char = 0x00
        let count = 0
        let currentSet = -1

        const optimized = new Minitel.Stream()
        for(let i = 0; i < this.length; i++) {
            let moveRight = this.items[i] === 0x09
            let chgFG = this.items[i] === 0x1b
                     && this.items[i + 1] >= 0x40
                     && this.items[i + 1] <= 0x47
                     && this.items[i + 1] !== fg
            let chgBG = this.items[i] === 0x1b
                     && this.items[i + 1] >= 0x50
                     && this.items[i + 1] <= 0x57
                     && this.items[i + 1] !== bg
            let chgSep = this.items[i] === 0x1b
                      && (   (this.items[i + 1] === 0x5a && !separated)
                          || (this.items[i + 1] === 0x59 && separated))
            let chgChar = this.items[i] >= 0x20 && this.items[i] !== char
            let chgSet = (this.items[i] === 0x0e && currentSet !== 0x0e)
                      || (this.items[i] === 0x0f && currentSet !== 0x0f) 

            const changes = [ moveRight, chgFG, chgBG, chgSep, chgChar, chgSet ]

            if(count > 0 && changes.some(identity)) {
                if(count == 1) {
                    optimized.push(char)
                } else {
                    optimized.push([0x12, 0x40 + count])
                }
                count = 0
            }

            if(moveRight) {
                optimized.push(0x09)
            } else if(chgFG) {
                // Change foreground color
                fg = this.items[i + 1]
                optimized.push([0x1b, fg])
            } else if(chgBG) {
                // Change background color
                bg = this.items[i + 1]
                optimized.push([0x1b, bg])
            } else if(chgSep) {
                // Change separated
                separated = !separated
                optimized.push([0x1b, this.items[i + 1]])
            } else if(chgChar) {
                if(currentSet !== -1) {
                    optimized.push(currentSet)
                    currentSet = -1
                }

                // Change character
                optimized.push(this.items[i])
                char = this.items[i]
            } else if(chgSet) {
                currentSet = this.items[i]
            } else if(this.items[i] >= 0x20) {
                // Same character
                count++
            } else if([0x1b, 0x0e, 0x0f].indexOf(this.items[i]) < 0) {
                optimized.push(this.items[i])
            }

            if(this.items[i] === 0x1b) i++
        }
        if(count > 0) optimized.push([0x12, 0x40 + count])

        return optimized
    }
}

