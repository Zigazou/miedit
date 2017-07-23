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
            range(item.length).forEach(i => {
                this.items[this.length] = item.items[i]
                this.length++
            })
        } else if(item !== undefined && typeof item[Symbol.iterator] === "function") {
            // Iterable object
            for(let value of item) this.push(value)
        }

        if(toPush !== undefined) {
            if(Minitel.specialChars[toPush]) {
                // Convert special characters to Minitel codes
                Minitel.specialChars[toPush].forEach(v => {
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
        let esc = false
        let count = 0
        let char = 0x00

        const current = {
            bg: undefined,
            fg: undefined,
            separated: undefined,
            blink: undefined,
            charset: undefined,
        }

        const next = {
            bg: moveFirst ? 0x50 : undefined,
            fg: moveFirst ? 0x47 : undefined,
            separated: undefined,
            blink: undefined,
            charset: undefined,
        }

        const optimized = new Minitel.Stream()

        range(this.length).forEach(i => {
            const item = this.items[i]

            if(item === 0x1b) {
                esc = true
                return
            }

            if(esc) {
                if(item >= 0x40 && item <= 0x47) {
                    next.fg = item
                } else if(item >= 0x50 && item <= 0x57) {
                    next.bg = item
                } else if(item === 0x59 || item === 0x5a) {
                    next.separated = item
                } else if(item === 0x49 || item === 0x48) {
                    next.blink = item
                }

                esc = false
            } else if(item < 0x20) {
                if(item === 0x0e || item === 0x0f) {
                    next.charset = item
                } else {
                    if(count > 0) {
                        if(count == 1) {
                            optimized.push(char)
                        } else {
                            optimized.push([0x12, 0x40 + count])
                        }
                        count = 0
                    }

                    optimized.push(item)
                }
            } else {
                let attributeChange = false
                for(let attr in next) {
                    if(next[attr] === undefined) continue
                    if(next[attr] === current[attr]) continue
                    attributeChange = true
                }

                if(count > 0 && (attributeChange || char !== item)) {
                    if(count == 1) {
                        optimized.push(char)
                    } else {
                        optimized.push([0x12, 0x40 + count])
                    }
                    count = 0
                }

                ["charset", "bg", "fg", "separated", "blink"].forEach(attr => {
                    if(next[attr] === undefined) return
                    if(current[attr] === next[attr]) return

                    if(attr !== "charset") optimized.push(0x1b)
                    optimized.push(next[attr])

                    current[attr] = next[attr]

                    next[attr] = undefined
                })

                if(char !== item) {
                    optimized.push(item)
                    char = item
                } else {
                    count++
                }
            }
        })

        if(count > 0) {
            if(count == 1) {
                optimized.push(char)
            } else {
                optimized.push([0x12, 0x40 + count])
            }
        }

        return optimized
    }
}

