"use strict"

class FiniteStack {
    constructor(maxLength) {
        this.maxLength = maxLength
        this.stack = []
    }

    push(value) {
        this.stack.push(value)
        if(this.stack.length > this.maxLength) {
            this.stack.shift()
        }
    }

    lastValue() {
        if(this.stack.length == 0) {
            return null
        }

        return this.stack[this.stack.length - 1]
    }

    lastValues(count) {
        return this.stack.slice(-count)
    }
}

