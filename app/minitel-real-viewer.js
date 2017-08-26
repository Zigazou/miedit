"use strict"
window.addEventListener("load", function(event) {
    const canvas = document.getElementById("minitel-screen")
    const viewer = document.getElementById("minitel-viewer")
    const screen = new MinitelScreen(canvas)
    let stream = ""
    const cstream = queryParameters("cstream")

    if(cstream) {
        stream = LZString.decompressFromBase64(
            cstream.replace(new RegExp('\\.', 'g'), '+')
                   .replace(new RegExp('_', 'g'), '/')
                   .replace(new RegExp('-', 'g'), '=')
        )
    } else {
        stream = queryParameters("stream")    
    }

    function findBestScaling() {
        if(window.innerWidth/window.innerHeight > 2065/2160) {
            viewer.classList.add("scale-height")
        } else {
            viewer.classList.remove("scale-height")
        }
    }

    findBestScaling()
    window.addEventListener("resize", findBestScaling, false)

    const vdt = []
    for(let i = 0; i < stream.length; i++) vdt.push(stream.charCodeAt(i))

    screen.send(vdt)
})
