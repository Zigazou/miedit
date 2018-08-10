"use strict"
/**
 * @file minitel-emulator.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * @class Emulator
 */
Minitel.Emulator = class {
    /**
     * @param {HTMLElement} container Element containing all the needed elements
     *                                for the emulator.
     * @param {boolean?} color Should we use color (true) or grayscale (false).
     * @param {int?} speed Speed in bits per second, -1 for full speed.
     */
    constructor(container, color, speed) {
        // Initializes basic properties
        const grid = new Minitel.TextGrid(Minitel.columns, Minitel.rows)
        const char = new Minitel.CharSize(Minitel.charWidth, Minitel.charHeight)

        // Look for all elements
        const elements = new Minitel.Elements()
        elements.add('screen')
                .add('cursor')
                .add('keyboard')
                .add('beep')
                .foundIn(container)

        // The screen canvas is the only mandatory element
        if(elements.screen === undefined) {
            console.error("The emulator container has no canvas for screen.")
            return
        }

        // Resize canvas based on Minitel characteristics
        elements.screen.width = char.width * grid.cols
        elements.screen.height = char.height * grid.rows

        // Resize the cursor canvas to the Minitel canvas size.
        if(elements.cursor !== undefined) {
            elements.cursor.width = elements.screen.width
            elements.cursor.height = elements.screen.height
        }

        /**
         * Should we show colors or grayscale?
         * @param {boolean}
         */
        this.color = color

        /**
         * The visual display unit
         * @member {Minitel.VDU}
         * @private
         */
        this.vdu = new Minitel.VDU(
            grid,
            char,
            elements.screen,
            this.color ? Minitel.colors : Minitel.greys,
            elements.cursor
        )

        /**
         * Keyboard associated with the emulator
         * @member {Keyboard}
         * @private
         */
        this.keyboard = elements.keyboard
                      ? new Minitel.Keyboard(elements.keyboard)
                      : undefined

        /**
         * The socket associated to the emulator
         * @member {Socket}
         */
        const socketURL = container.getAttribute("data-socket") || undefined
        this.socket = socketURL ? new WebSocket(socketURL) : undefined

        if(this.socket) {
            this.socket.onopen = () => {
                // Add a link: network → decoder
                this.socket.onmessage = messageEvent => {
                    const message = []
                    range(messageEvent.data.length).forEach(offset => {
                        message.push(messageEvent.data[offset].charCodeAt(0))
                    })

                    this.send(message)
                }

                // Add a link: keyboard → network
                if(this.keyboard) {
                    this.keyboard.setEmitter(
                        keycodes => this.socket.send(
                            keycodes.map(c => String.fromCharCode(c)).join("")
                        )
                    )
                }
            }

            this.socket.onclose = () => {
                this.vdu.setStatusCharacter(0x46)
                if(this.keyboard) this.keyboard.setEmitter(undefined)
            }
        }

        // Add a link: decoder → network
        const sender = message => {
            if(this.socket) {
                this.socket.send(message)
            }
        }

        /**
         * The decoder
         * @member {MinitelDecoder}
         * @private
         */
        this.decoder = new Minitel.Decoder(
            this.vdu,
            this.keyboard,
            sender,
            elements.beep
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
         * Current speed, 0 for maximum speed
         * @param {number}
         */
        this.bandwidth = -1

        // Sets colors
        const colorSetting = new BooleanSettingsSuite([true, false])
        this.setColor(
            colorSetting.setDefault(false)
                        .add(queryParameters("color"))
                        .add(color)
                        .add(container.getAttribute("data-color"))
                        .getValue()
        )

        // Sets speed
        const speedSetting = new IntegerSettingsSuite([1200, 4800, 9600, 0])
        this.setRefresh(
            speedSetting.setDefault(Minitel.B1200)
                        .add(queryParameters("speed"))
                        .add(speed)
                        .add(container.getAttribute("data-speed"))
                        .getValue()
        )

        // Add event listeners
        elements.screen.addEventListener("click", event => this.onClick(event))

        // Add a link: keyboard → emulator
        if(this.keyboard) {
            this.keyboard.setConfig(settings => {
                this.setColor(settings.color)
                this.setRefresh(settings.speed)
            })
        }
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
                       : bandwidth / 9 / (1000 / rate)

        this.timer = window.setInterval(() => this.sendChunk(), rate)
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
        return this.vdu.generateThumbnail(width, height)
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
            this.vdu.changeColors(color)
            if(this.keyboard) {
                this.keyboard.selectColor(color ? "true" : "false")
            }
        }

        return this
    }

    /**
     * Set refresh rate
     * @param {number} bandwidth Bits per second or 0 for maximum speed
     * @param {?number} rate Refresh rate of the screen in hertz, 25 by default
     */
    setRefresh(bandwidth, rate) {
        if(this.bandwidth !== bandwidth) {
            // Refresh rate, 25 Hz by default
            if(rate === undefined) rate = 25

            this.bandwidth = bandwidth
            this.initRefresh(bandwidth, rate)
            if(this.keyboard) {
                this.keyboard.selectSpeed(
                    bandwidth === 0 ? "FULL" : bandwidth.toString()
                )
            }
        }

        return this
    }

    /**
     * Handles clicks on the Minitel screen.
     * @param {HTMLEvent} event The event
     */
    onClick(event) {
        // Get the word where the user clicked
        const rect = event.target.getBoundingClientRect()
        const keyword = this.vdu.getWordAt(
            event.pageX - rect.left - window.scrollX,
            event.pageY - rect.top - window.scrollY
        )

        if(keyword === "") return true

        // The keyword can designate a special Minitel key.
        let message = []
        switch(keyword.toUpperCase()) {
            case 'SOMMAIRE':
            case 'SOMM':
                message = Minitel.keys.Videotex.Sommaire
                break
            case 'ANNULATION':
            case 'ANNUL':
                message = Minitel.keys.Videotex.Annulation
                break
            case 'RETOUR':
                message = Minitel.keys.Videotex.Retour
                break
            case 'GUIDE':
                message = Minitel.keys.Videotex.Guide
                break
            case 'CORRECTION':
            case 'CORR':
                message = Minitel.keys.Videotex.Correction
                break
            case 'SUITE':
                message = Minitel.keys.Videotex.Suite
                break
            case 'ENVOI':
                message = Minitel.keys.Videotex.Envoi
                break
            case 'REPETITION':
            case 'REPET':
                message = Minitel.keys.Videotex.Repetition
                break

            default:
                // Convert the string to a code sequence
                range(keyword.length).forEach(offset => {
                    message.push(keyword.charCodeAt(offset))
                })

                // Append the ENVOI key code sequence
                message = message.concat(Minitel.keys.Videotex.Envoi)
        }

        if(this.keyboard) this.keyboard.keypress(message)

        return false
    }
}
