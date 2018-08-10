"use strict"
/**
 * @file mistorage.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * MiStorage is an interface to the web storage of a browser. It adds the notion
 * of context, allowing to simulate a simple hierarchy. It also handles storage
 * of objects and not just strings.
 */
MiEdit.MiStorage = class {
    /**
     * @param {string} context A string prepended before every key name so that
     *                         multiple applications can use the same storage
     *                         facility without side effect.
     */
    constructor(context) {
        /**
         * @member {string} context A string prepended before every key name so
         *                          that multiple applications can use the same
         *                          storage facility without side effect.
         * @private
         */
        this.context = context.replace("/", "-") + "/"
    }

    /**
     * Returns the keys of the web storage attached to the context
     */
    keys() {
        const context = this.context
        return Object.keys(localStorage)
                     .filter(key => key.startsWith(context))
                     .map(key => key.substr(context.length))
    }

    /**
     * Deletes all elements attached to the context
     */
    reset() {
        this.keys().forEach(function(key) {
            this.delete(key)
        })
    }

    /**
     * Returns a key name ready for use in our web storage
     *
     * @param {string} key A raw key name
     * @private
     */
    prepareKey(key) {
        return this.context + key.replace("/", "-")
    }

    /**
     * Stores a value in our web storage. As web storage supports only strings,
     * the value must be stringified before behind recorder.
     *
     * @param {string} key A raw key name
     * @param value A stringifiable value
     */
    save(key, value) {
        localStorage.setItem(this.prepareKey(key), JSON.stringify(value))
    }

    /**
     * Deletes a key in our web storage.
     *
     * @param {string} key A raw key name
     */
    delete(key) {
        localStorage.removeItem(this.prepareKey(key))
    }

    /**
     * Returns the value stored at a key. Returns null if the key is unknown.
     *
     * @param {string} key A raw key name
     */
    load(key) {
        try {
            return JSON.parse(localStorage.getItem(this.prepareKey(key)))
        } catch(err) {
            return null
        }
    }
}
