"use strict"
/**
 * @file finite-stack
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * A finite stack is a stack that has a maximum number of elements. Pushing
 * elements when the stack is full just deletes the oldest values to make room
 * for the newest.
 *
 */

/**
 * @class FiniteStack
 */
class FiniteStack {
    /**
     * @param {number} maxLength Maximum length of our finite stack.
     */
    constructor(maxLength) {
        this.maxLength = maxLength
        this.stack = []
    }

    /**
     * @param value A value to push on the stack
     */
    push(value) {
        this.stack.push(value)
        if(this.stack.length > this.maxLength) {
            this.stack.shift()
        }
    }

    /**
     * Returns the last value pushed on the stack, null if the stack is empty.
     * This does not pop the value from the stack.
     */
    lastValue() {
        if(this.stack.length == 0) {
            return null
        }

        return this.stack[this.stack.length - 1]
    }

    /**
     * Returns the last values pushed on the stack, [] if the stack is empty.
     * This does not pop the values from the stack. If the stack has less
     * elements than what is requested, it returns only theses elements.
     *
     * @param {number} count Number of values to return
     */
    lastValues(count) {
        return this.stack.slice(-count)
    }
}

