"use strict"
window.addEventListener("load", function() {
    const emulator = Minitel.startEmulators()[0]

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

    for(let i = 0; i < stream.length; i++) {
        emulator.send([stream.charCodeAt(i)])
    }
})
