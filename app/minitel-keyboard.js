"use strict"

class MiKeyboard {
    constructor(keydown, keyup) {
        this.kCtrl = false
        this.kShift = false
        this.kFnct = false

        this.standardKey = new KeySimulator(keydown, keyup)

        document.addEventListener("keydown", event => this.onkeydown(event))
        document.addEventListener("keyup", event => this.onkeyup(event))
    }

    onkeydown(event) {
        this.standardKey.pressKey(event.key)
        event.preventDefault()
        this.onkeypress(event.key)
    }

    onkeyup(event) {
        this.standardKey.releaseKey(event.key)
        event.preventDefault()
    }

    onkeypress(keycode) {
    
    }
}
/*
MiKeyboard.specialKeys = [ "Ctrl", "Alt", "Shift", "AltGraph", "CapsLock" ]

MiKeyboard.keys = {
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Tab",
    "Backspace",
    "PageUp",
    "PageDown",
    "Delete",
    "Insert",
    "Home",
    "End",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "ScrollLock",
    "Pause",
    "Escape",
    "NumLock",
}
*/
window.addEventListener("load", function(event) {
    const canvas = document.getElementById("minitel-screen")
    const screen = new MinitelScreen(canvas)

    const socket = new WebSocket("wss://minitel.ouep.eu/ws/")

    socket.onopen = event => {
        const keyboard = new MiKeyboard(
            document.getElementById("minitel-standardkey-down"),
            document.getElementById("minitel-standardkey-up")
        )

        keyboard.onkeypress = function(keycode) {
            socket.send(keycode)
        }

        socket.onmessage = function(event) {
            const message = []
            range(event.data.length).forEach(offset => {
                message.push(event.data[offset].charCodeAt(0))
            })

            screen.send(message)
        }
    }
})
