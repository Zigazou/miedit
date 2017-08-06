"use strict"
window.addEventListener("load", function(event) {
    const canvas = document.getElementById("minitel-screen")
    const screen = new MinitelScreen(canvas)

    const standardKey = new KeySimulator(
        document.getElementById("minitel-standardkey-down"),
        document.getElementById("minitel-standardkey-up")
    )

    document.addEventListener("keydown", event => {
        standardKey.pressKey(event.key)
        event.preventDefault()
        screen.send([event.key.charCodeAt(0)])
    })

    document.addEventListener("keyup", event => {
        standardKey.releaseKey(event.key)
        event.preventDefault()
    })
})
