"use strict"

/**
 * @file slimerjs-vdt.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * Given a path to a Videotex stream file, generates two screenshots of them
 * stream file rendering.
 * @param {string} filePath A (full or not) path to the Videotex stream file
 */
function renderStream(filePath) {
    const page = require('webpage').create()
    const fs = require('fs')

    if(!fs.isReadable(filePath)) {
        // The Videotex page is not readable
        console.log("Unable to read " + filePath)
        slimer.exit(2)
        return
    }

    // Minitel is 320×250px, we want pixel perfect rendering
    page.viewportSize = { width: 320, height : 250 }

    page.open("../minitel-slimerjs.html")
        .then(function(status) {
            if(status !== "success") {
                // Something went wrong while loading the Videotex page
                console.log("Unable to load minitel-slimerjs.html")
                slimer.exit(3)
                return
            }

            // Load the stream into the Minitel emulator
            page.evaluate(function(stream) {
                loadStream(stream)
            }, fs.read(filePath))

            // Wait for the initial rendering of the page
            setTimeout(function() {
                page.render(filePath + '.1.png')
            }, 300)

            // Compute another rendering for a possible blink
            setTimeout(function() {
                page.render(filePath + '.2.png')
                slimer.exit(0)
            }, 800)
        })
}

const system = require('system')

// Verify arguments are okay
if(system.args.length !== 2) {
    // This script must be called with exactly one argument
    console.log("slimerjs-vdt.js requires one argument: the VDT file path")
    slimer.exit(1)
} else {
    renderStream(system.args[1])
}
