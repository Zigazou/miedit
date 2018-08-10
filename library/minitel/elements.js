"use strict"
/**
 * @file elements.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * A class to facilitate search of HTML elements needed for the Minitel
 * emulator.
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * @class Elements
 */
Minitel.Elements = class {
    /**
     * Initializes an element to undefined.
     * @param {string} elementName The name of the element to add.
     * @return {Minitel.Elements}
     */
    add(elementName) {
        this[elementName] = undefined

        return this
    }

    /**
     * Look for each element of our object in an HTMLElement.
     *
     * @param {HTMLElement} container The HTMLElement to look from.
     * @return {Minitel.Elements}
     */
    foundIn(container) {
        for(let element in this) {
            if(!this.hasOwnProperty(element)) continue

            this[element] = container.querySelector(
                '[data-minitel="' + element + '"]'
            ) || undefined
        }

        return this
    }
}
