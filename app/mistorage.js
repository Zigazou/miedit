"use strict"

class MiStorage {
    constructor(context) {
        this.context = context.replace("/", "-") + "/"
    }

    keys() {
        const context = this.context
        return Object.keys(localStorage)
                     .filter(key => { return key.startsWith(context) })
                     .map(key => { return key.substr(context.length) })
    }

    reset() {
        this.keys().forEach(function(key) { this.delete(key) })
    }

    prepareKey(key) {
        return this.context + key.replace("/", "-")
    }

    save(key, value) {
        localStorage.setItem(this.prepareKey(key), JSON.stringify(value))
    }

    delete(key) {
        localStorage.removeItem(this.prepareKey(key))
    }

    load(key) {
        try {
            return JSON.parse(localStorage.getItem(this.prepareKey(key)))
        } catch(err) {
            return null
        }
    }
}
