"use strict"
function loadStream(stream) {
    const canvas = document.getElementById("minitel-screen")
    const screen = new MinitelScreen(canvas, false)

    setTimeout(() => {
        screen.directSend(stream)
    }, 200)
}
