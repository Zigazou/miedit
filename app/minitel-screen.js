"use strict"
/**
 * @file MinitelScreen
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @class MinitelScreen
 */
class MinitelScreen {
    constructor(canvas) {
        const zoom = { x: 2, y: 2 }
        const grid = { cols: Minitel.columns, rows: Minitel.rows }
        const char = { width: Minitel.charWidth, height: Minitel.charHeight }

        // Resize canvas based on Minitel characteristics
        canvas.width = char.width * grid.cols * zoom.x
        canvas.height = char.height * grid.rows * zoom.y

        this.bandwidth = Minitel.B1200 // bits per second
        this.refreshRate = 20 // milliseconds
        this.pageMemory = new PageMemory(grid, char, zoom, canvas)
        this.decoder = new MinitelDecoder(this.pageMemory)

        this.queue = []
        this.chunkSize = (this.bandwidth / 10) / (1000 / this.refreshRate)

        window.setInterval(() => { this.sendChunk() }, this.refreshRate)
    }

    send(items) {
        this.queue = this.queue.concat(items)
    }

    directSend(items) {
        this.queue = []
        this.decoder.decodeList(items)
    }

    sendChunk() {
        // Nothing to do?
        if(this.queue.length === 0) return

        const chunk = this.queue.slice(0, this.chunkSize)
        this.queue = this.queue.slice(this.chunkSize)
        this.decoder.decodeList(chunk)
    }
}

class MinitelScreenTest {
    constructor(canvas) {
        const zoom = { x: 2, y: 2 }
        const grid = { cols: 40, rows: 4 }
        const char = { width: 8, height: 10 }

        canvas.width = char.width * grid.cols * zoom.x
        canvas.height = char.height * grid.rows * zoom.y

        this.pageMemory = new PageMemory(grid, char, zoom, canvas)
        this.decoder = new MinitelDecoder(this.pageMemory)
    }

    send(items) {
        this.decoder.decodeList(items)
    }
}
