"use strict"

importHTML
    .install()
    .then(() => {
        const canvas = document.getElementById("minitel-screen")
        const screen = new MinitelScreen(canvas)

        const socket = new WebSocket("wss://minitel.ouep.eu/ws/")

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

