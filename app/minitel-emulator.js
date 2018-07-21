"use strict"
/**
 * @file MinitelEmulator
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @class MinitelEmulator
 */
class MinitelEmulator {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Keyboard} keyboard The keyboard emulator.
     * @param {WebSocket} socket The socket to communicate with.
     */
    constructor(canvas, keyboard, socket) {
        const grid = { cols: Minitel.columns, rows: Minitel.rows }
        const char = { width: Minitel.charWidth, height: Minitel.charHeight }

        // Resize canvas based on Minitel characteristics
        canvas.width = char.width * grid.cols
        canvas.height = char.height * grid.rows

        /**
         * Should we show colors or black and white?
         * @param {boolean}
         */
        this.color = undefined

        /**
         * The page memory
         * @member {PageMemory}
         * @private
         */
        this.pageMemory = new PageMemory(grid, char, canvas, Minitel.greys)

        /**
         * The socket associated to the emulator
         * @member {Socket}
         */
        this.socket = null

        if(socket !== null) {
            socket.onopen = openEvent => {
                this.socket = socket

                socket.onmessage = messageEvent => {
                    const message = []
                    range(messageEvent.data.length).forEach(offset => {
                        message.push(messageEvent.data[offset].charCodeAt(0))
                    })

                    this.send(message)
                }
            }
        }

        const sender = message => {
            if(this.socket !== null) {
                this.socket.send(message)
            }
        }

        /**
         * The decoder
         * @member {MinitelDecoder}
         * @private
         */
        this.decoder = new MinitelDecoder(
            this.pageMemory,
            keyboard,
            socket !== null ? sender : null
        )

        /**
         * The queue
         * @member {number[]}
         * @private
         */
        this.queue = []

        /**
         * How many bytes are sent to the page memory each refresh time
         * @member {number}
         */
        this.chunkSize = 0

        /**
         * The ID value of the timer used to refresh the Minitel screen
         * @param {number}
         */
        this.timer = undefined

        /**
         * Should the cursor position be shown?
         * @param {boolean}
         */
        this.cursorShown = false

        /**
         * Keyboard associated with the emulator
         * @member {Keyboard}
         * @private
         */
        this.keyboard = keyboard

        /**
         * Current speed, 0 for maximum speed
         * @param {number}
         */
        this.bandwidth = -1

        this.setColor(false)
        this.setRefresh(Minitel.B1200)

        canvas.addEventListener("click", event => this.onClick(event, keyboard))

        keyboard.setConfig(settings => {
            this.setColor(settings.color)
            this.setRefresh(settings.speed)
        })
    }

    /**
     * Initializes the timer used to refresh the Minitel screen
     *
     * @param {number} bandwidth Bandwidth in bits per second
     * @param {number} rate Refresh rate in milliseconds
     */
    initRefresh(bandwidth, rate) {
        // Stop any existing timer
        if(this.timer) window.clearInterval(this.timer)

        // Minitel uses 9 bits for each code (7 bit of data, 1 parity bit and
        // 1 stop bit)
        this.chunkSize = bandwidth === 0
                       ? 2048
                       : (bandwidth / 9) / (1000 / rate)

        this.timer = window.setInterval(() => { this.sendChunk() }, rate)
    }

    /**
     * Push values in the queue for future send
     * @param {number[]} items Values to send
     */
    send(items) {
        this.queue = this.queue.concat(items)
    }

    /**
     * Directly send values to the page memory, bypassing the refresh rate.
     * @param {number[]} items Values to send
     */
    directSend(items) {
        this.queue = []
        this.decoder.decodeList(items)
    }

    /**
     * Generate a thumbnail of the current display.
     * @param {number} width Width of the thumbnail
     * @param {number} height Height of the thumbnail
     */
    generateThumbnail(width, height) {
        return this.pageMemory.generateThumbnail(width, height)
    }

    /**
     * Send a chunk of the queue to the page memory. This method is called by
     * the timer.
     * @private
     */
    sendChunk() {
        // Nothing to do?
        if(this.queue.length === 0) return

        const chunk = this.queue.slice(0, this.chunkSize)
        this.queue = this.queue.slice(this.chunkSize)
        this.decoder.decodeList(chunk)
    }

    /**
     * Tells the emulator to use color (true) or black & white (false)
     * @param {boolean} color 
     */
    setColor(color) {
        if(this.color !== color) {
            this.color = color
            this.pageMemory.changeColors(color)
            this.keyboard.selectColor(color ? "true" : "false")
        }

        return this
    }

    /**
     * 
     * @param {number} bandwidth Bits per second or 0 for maximum speed
     * @param {?number} rate Refresh rate of the screen in hertz, 25 by default
     */
    setRefresh(bandwidth, rate) {
        if(this.bandwidth !== bandwidth) {
            // Refresh rate, 25 Hz by default
            if(rate === undefined) rate = 25

            this.bandwidth = bandwidth
            this.initRefresh(bandwidth, rate)
            this.keyboard.selectSpeed(
                bandwidth === 0 ? "FULL" : bandwidth.toString()
            )
        }

        return this
    }

    /**
     * Handles clicks on the Minitel screen.
     * @param {HTMLEvent} event The event
     * @param {Keyboard} keyboard Keyboard which will receive the keys
     */
    onClick(event, keyboard) {
        // Get the word where the user clicked
        const rect = event.target.getBoundingClientRect()
        const keyword = this.pageMemory.getWordAt(
            event.pageX - rect.left - window.scrollX,
            event.pageY - rect.top - window.scrollY
        )

        if(keyword === "") return true

        // The keyword can designate a special Minitel key.
        let message = []
        switch(keyword) {
            case 'SOMMAIRE':
                message = Minitel.keys['Videotex']['Sommaire']
                break
            case 'ANNULATION':
                message = Minitel.keys['Videotex']['Annulation']
                break
            case 'RETOUR':
                message = Minitel.keys['Videotex']['Retour']
                break
            case 'GUIDE':
                message = Minitel.keys['Videotex']['Guide']
                break
            case 'CORRECTION':
                message = Minitel.keys['Videotex']['Correction']
                break
            case 'SUITE':
                message = Minitel.keys['Videotex']['Suite']
                break
            case 'ENVOI':
                message = Minitel.keys['Videotex']['Envoi']
                break

            default:
                // Convert the string to a code sequence
                range(keyword.length).forEach(offset => {
                    message.push(keyword.charCodeAt(offset))
                })

                // Append the ENVOI key code sequence
                message = message.concat(Minitel.keys['Videotex']['Envoi'])
        }

        keyboard.keypress(message)

        return false
    }
}
