"use strict"
/**
 * @file minitel-keyboard
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * Install and run a Minitel emulation with its keyboard.
 */

/**
 * Install and run a Minitel emulation with its keyboard.
 *
 * @param {string} webSocketURL URL of the web socket to connect to.
 */
function runMinitelWithKeyboard(webSocketURL) {
    importHTML
        .install()
        .then(() => {
            const canvas = document.getElementById("minitel-screen")
            const screen = new MinitelScreen(canvas)

            const socket = new WebSocket(webSocketURL)

            const keyboard = new Keyboard(
                document.getElementById("miedit"),
                null
            )

            keyboard.onkeypress = function(keycode) {
                socket.send(keycode)
            }

            socket.onopen = event => {

                socket.onmessage = function(event) {
                    const message = []
                    range(event.data.length).forEach(offset => {
                        message.push(event.data[offset].charCodeAt(0))
                    })

                    screen.send(message)
                }
            }
        })
}

runMinitelWithKeyboard("wss://minitel.ouep.eu/ws/")
