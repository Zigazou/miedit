"use strict"
function loadStream(stream) {
    const emulator = Minitel.startEmulators()[0]

    setTimeout(() => emulator.directSend(stream), 200)
}
