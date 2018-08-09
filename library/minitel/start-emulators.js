"use strict"
/**
 * @file start-emulators.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * Find and run any Minitel emulator in the current document.
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

Minitel.startEmulators = function() {
    const emulators = []
    document.querySelectorAll('x-minitel').forEach(
        container => emulators.push(new Minitel.Emulator(container))
    )
    return emulators
}
