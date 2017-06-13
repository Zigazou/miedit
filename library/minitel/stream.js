"use strict"
var Minitel = Minitel || {}

Minitel.Stream = class {
    constructor() {
        this.reset()
    }

    reset() {
        this.items = []
        this.length = 0
    }

    push(item) {
        if(item === null || item === undefined) return

        if(item instanceof Minitel.Stream) {
            this.items = this.items.concat(item.items)
        } else if(typeof item === "string" && item.length === 1) {
            this._pushValue(item.charCodeAt(0))
        } else if(typeof item[Symbol.iterator] === "function") {
            for(let value of item) this.push(value)
        } else if(typeof item === "number") {
            this._pushValue(item)
        }
        this.length = this.items.length
    }

    _pushValue(value) {
        if(Minitel.specialChars[value]) {
            for(let v of Minitel.specialChars[value]) {
                this.items.push(v)
            }
        } else if(value > 0x7f) {
            return
        } else {
            this.items.push(value)
        }
    }
}

