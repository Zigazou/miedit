"use strict"
/**
 * @file minitel
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * Create and run a Minitel emulation with its keyboard.
 */

/**
 * Create and run a Minitel emulation with its keyboard.
 *
 * @param {string} screenCanvasId Identifier of the canvas element which will
 *                                show the Minitel screen.
 * @param {boolean} color true if emulation is in color, false for b&w.
 * @param {string} keyboardId Identifier of an HTML element which contains the
 *                            keyboard grid.
 * @param {string} webSocketURL URL of the web socket to connect to.
 */
function minitel(screenCanvasId, color, keyboardId, webSocketURL) {
    importHTML
        .install()
        .then(() => {
            const socket = new WebSocket(webSocketURL)
            const canvas = document.getElementById(screenCanvasId)
            const screen = new MinitelScreen(canvas)
            const keyboard = new Keyboard(document.getElementById(keyboardId))

            new MinitelEmulator(canvas, color, keyboard, socket)
        })
}

minitel("minitel-screen", false, "miedit", "wss://minitel.ouep.eu/ws/")
