"use strict"
window.addEventListener("load", function(event) {
    const canvas = document.getElementById("minitel-screen")
    const screen = new MinitelScreen(canvas)

    const socket = new WebSocket("ws://minitel.ouep.eu/ws/")

    socket.onopen = event => {
        const standardKey = new KeySimulator(
            document.getElementById("minitel-standardkey-down"),
            document.getElementById("minitel-standardkey-up")
        )

        document.addEventListener("keydown", event => {
            standardKey.pressKey(event.key)
            event.preventDefault()
            socket.send(event.key)
        })

        document.addEventListener("keyup", event => {
            standardKey.releaseKey(event.key)
            event.preventDefault()
        })

        socket.onmessage = function(event) {
            const message = []
            range(event.data.length).forEach(offset => {
                message.push(event.data[offset].charCodeAt(0))
            })

            screen.send(message)
        }
    }
})
