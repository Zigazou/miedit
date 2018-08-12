"use strict"
/**
 * @file midecompiler.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * Class decoding a Videotex stream
 */
MiEdit.MiDecompiler = class extends Minitel.Protocol {
    /**
     * Create a new MiDecompiler.
     */
    constructor() {
        super()

        /**
         * Last drawn character, mainly used by the repeat functionality.
         * @member {number}
         * @private
         */
        this.charCode = 0x20

        /**
         * Current character type.
         * @member {Minitel.Cell}
         * @private
         */
        this.charType = Minitel.CharCell

        /**
         * How many bytes have been read while redefining a DRCS character.
         * @member {number}
         * @private
         */
        this.drcsCount = 0

        /**
         * The tree being built.
         * @member {mixed[]}
         * @private
         */
        this.tree = []

        /**
         * Visible characters that should be collected into one element
         * @member {string}
         * @private
         */
        this.content = ""
    }

    /**
     * Add an element to the current tree.
     * @param {string} title Title of the element
     * @param {string} elementType Element type
     * @param {Object?} attributes The attributes of the element
     */
    addElement(title, elementType, attributes) {
        const id = Math.floor(Math.random() * 0x10000000).toString(16)

        const mieditValue = attributes === undefined
                          ? ""
                          : Object
                              .keys(attributes)
                              .map(key => encodeURIComponent(key)
                                        + "="
                                        + encodeURIComponent(attributes[key]))
                              .join('&')

        const newElement = {
            id: "j1_" + id,
            text: title,
            type: elementType,
            li_attr: { id: "j1_" + id },
            a_attr: {
                href: "#",
                id: "j1_" + id + "_anchor"
            },
            state: {
                loaded: true,
                opened: false,
                selected: false,
                disabled: false
            },
            children: [],
            data: {}
        }

        if(mieditValue !== "") newElement.data["miedit-value"] = mieditValue

        this.tree.push(newElement)
    }

    /**
     * Generate a tree from what the automaton has read.
     * @return {object}
     */
    export() {
        this.flushContent()

        return { tree: this.tree }
    }

    /**
     * Move the cursor at a relative position
     * This method takes into account:
     * - whether the cursor is in the status row or not
     * - whether the width or height multiplier are used
     * - the current page mode
     * - whether the cursor is at the last column
     * @param {string} direction The direction to move the cursor to, can be
     *                           char, left, right, up, down, firstColumn or
     *                           home
     * @private
     */
    moveCursor(direction) {
        this.flushContent()

        if(direction === "left") {
            // Moves the cursor one column the left
            this.addElement("Move cursor on the left", "move-left")
            return
        }

        if(direction === "right") {
            // Moves the cursor one column on the right
            this.addElement("Move cursor on the right", "move-right")
            return
        }

        if(direction === "up") {
            // Moves the cursor one row up
            this.addElement("Move cursor on the preceding row", "move-up")
            return
        }

        if(direction === "down") {
            // Move the cursor one row down
            this.addElement("Move cursor on the next row", "move-down")
            return
        }

        if(direction === "firstColumn") {
            // Moves the cursor on the first column of the current row
            this.addElement(
                "Move cursor on the first column of the current row",
                "move-sol"
            )
            return
        }

        if(direction === "home") {
            // Moves the cursor on the first column, first row
            this.addElement(
                "Move cursor to first row, first column",
                "move-home"
            )
            return
        }
    }

    /**
     * Clear a portion of the screen.
     * @param {string} clearRange Which part of the screen should be cleared, it
     *                            can be either page, status, eol, endofscreen,
     *                            startofscreen, startofline, completescreen or
     *                            completeline
     * @private
     */
    clear(clearRange) {
        this.flushContent()

        if(clearRange === "page") {
            // Clear the whole screen except the status row ,reset current
            // attributes and place the cursor on the first column, first row
            this.addElement("Clear screen", "clear-screen")
            return
        }

        if(clearRange === "status") {
            // Clear status row
            this.addElement("Clear status row", "clear-status")
            return
        }

        if(clearRange === "eol") {
            // Clear from the current cursor position till the end of the line
            this.addElement(
                "Clear till the end of the current row",
                "clear-eol"
            )
            return
        }

        if(clearRange === "endofscreen") {
            // Clear from the current cursor position till the end of the screen
            this.addElement(
                "Clear end of screen (cursor included)",
                "clear-end-of-screen"
            )

            return
        }

        if(clearRange === "startofscreen") {
            // Clear from the current cursor position till the start of the
            // screen
            this.addElement(
                "Clear start of screen (cursor included)",
                "clear-start-of-screen"
            )

            return
        }

        if(clearRange === "startofline") {
            // Clear from the start of the row till the current cursor position
            this.addElement(
                "Clear start of line (cursor included)",
                "clear-start-of-line"
            )

            return
        }

        if(clearRange === "completescreen") {
            // Clear complete screen without moving the cursor nor losing
            // current attributes
            this.addElement(
                "Clear complete screen (no cursor move)",
                "clear-complete-screen"
            )

            return
        }

        if(clearRange === "completeline") {
            // Clear the current line
            this.addElement(
                "Clear complete line (no cursor move)",
                "clear-complete-line"
            )

            return
        }
    }

    /**
     * Set the current page mode
     * @param {boolean} bool true indicates the screen is in page mode while
     *                       false indicates the screen is in roll mode
     * @private
     */
    setPageMode(bool) {
        this.flushContent()
        console.warning("NotImplemented: setPageMode", bool)
    }

    /**
     * Emits a beep sound
     * @private
     */
    beep() {
        this.flushContent()
        this.addElement("Raw stream", "content-raw", { value: "BEL" })
    }

    /**
     * Set the uppercase mode of the keyboard
     * @param {boolean} bool true indicates the keyboard operates in uppercase
     *                       false indicates the keyboard operates in lowercase
     * @private
     */
    setUppercaseMode(bool) {
        this.flushContent()
        console.warning("NotImplemented: setUppercaseMode", bool)
    }

    /**
     * Set the extended mode of the keyboard
     * @param {boolean} bool true indicates the keyboard works extended
     *                       false indicates the keyboard works standard
     * @private
     */
    setExtendedMode(bool) {
        this.flushContent()
        console.warning("NotImplemented: setExtendedMode", bool)
    }

    /**
     * Set the cursor keys of the keyboard
     * @param {boolean} bool true indicates keyboard use cursor keys
     *                       false indicates keyboard does not use cursor keys
     * @private
     */
    setCursorKeys(bool) {
        this.flushContent()
        console.warning("NotImplemented: setCursorKeys", bool)
    }

    /**
     * Set the current character type.
     * Doing so resets some attributes even if the current character type does
     * not change.
     * @param {string} charPage either G0 or G1
     * @private
     */
    setCharType(charType) {
        this.flushContent()

        if(charType === "G0") {
            this.addElement("Switch to standard characters", "content-g0")
        } else {
            this.addElement("Switch to mosaic characters", "content-g1")
        }

        this.charType = charType
    }

    /**
     * Sets the cursor visibility
     * @param {boolean} visibility true for a visibile cursor, false otherwise
     * @private
     */
    showCursor(visibility) {
        this.flushContent()

        if(visibility) {
            this.addElement("Show cursor", "cursor-on")
        } else {
            this.addElement("Hide cursor", "cursor-off")
        }
    }

    /**
     * Sets the foreground color
     * @param {number} color the foreground color (0 to 7)
     * @private
     */
    setFgColor(color) {
        this.flushContent()

        const colors = [
            "black", "red", "green", "yellow",
            "blue", "magenta", "cyan", "white"
        ]

        this.addElement(
            "Set foreground color to " + colors[color],
            "color-fg-" + color
        )
    }

    /**
     * Sets the background color
     * @param {number} color the background color (0 to 7)
     * @private
     */
    setBgColor(color) {
        this.flushContent()

        const colors = [
            "black", "red", "green", "yellow",
            "blue", "magenta", "cyan", "white"
        ]

        this.addElement(
            "Set background color to " + colors[color],
            "color-bg-" + color
        )
    }

    /**
     * Sets the character size.
     * This is valid only for alphanumerical character and when not in the
     * status row.
     * @param {string} sizeName the size can be either: normalSize, doubleWidth,
     *                          doubleHeight or doubleSize.
     * @private
     */
    setSize(sizeName) {
        this.flushContent()

        const sizes = {
            "normalSize": "effect-normal-size",
            "doubleWidth": "effect-double-width",
            "doubleHeight": "effect-double-height",
            "doubleSize": "effect-double-size"
        }

        const labels = {
            "normalSize": "Set normal size",
            "doubleWidth": "Set double width",
            "doubleHeight": "Set double height",
            "doubleSize": "Set double size"
        }

        if(!(sizeName in sizes)) return

        this.addElement(labels[sizeName], sizes[sizeName])
    }

    /**
     * Sets the text blinking
     * @param {boolean} blink true for blinking text, false otherwise
     * @private
     */
    setBlink(blink) {
        this.flushContent()

        if(blink) {
            this.addElement("Blink on", "effect-blink-on")
        } else {
            this.addElement("Blink off", "effect-blink-off")
        }
    }

    /**
     * Sets the masking of attributes
     * @param {boolean} mask true for attributes masking, false otherwise
     * @private
     */
    setMask(mask) {
        this.flushContent()

        if(mask) {
            this.addElement("Mask zone", "mask-zone-on")
        } else {
            this.addElement("Unmask zone", "mask-zone-off")
        }
    }

    /**
     * Enables or disables the use of zone masking
     * @param {boolean} enabled true enables the use of zone masking, false
     *                          disables the use of zone masking
     * @private
     */
    setGlobalMask(enabled) {
        this.flushContent()

        if(enabled) {
            this.addElement("Enable masking", "mask-global-on")
        } else {
            this.addElement("Disable masking", "mask-global-off")
        }
    }

    /**
     * Set underline of text or separation of mosaic characters
     * @param {boolean} underline true for text underlining, false otherwise
     * @private
     */
    setUnderline(underline) {
        this.flushContent()

        if(underline) {
            this.addElement("Underline on", "effect-underline-on")
        } else {
            this.addElement("Underline off", "effect-underline-off")
        }
    }

    /**
     * Set video inversion of alphanumerical characters
     * @param {boolean} invert true for video inverse, false otherwise
     * @private
     */
    setInvert(invert) {
        this.flushContent()

        if(invert) {
            this.addElement("Invert on", "effect-invert-on")
        } else {
            this.addElement("Invert off", "effect-invert-off")
        }
    }

    /**
     * Move the cursor at an absolute position.
     * Doing so resets the current attributes.
     * @param {boolean} invert true for video inverse, false otherwise
     * @private
     */
    locate(y, x) {
        this.flushContent()

        if(y === 0x30 || y === 0x31 || y === 0x32) {
            // This form of absolute positionning is indicated as deprecated
            // but is nonetheless supported by every Minitel. It moves the
            // cursor at the first column of a specific row
            y = 10 * (y - 0x30) + (x - 0x30)
            x = 1
        } else {
            // Standard absolute positionning of the cursor
            x -= 0x40
            y -= 0x40
        }

        // Ignores everything that is outside of the screen
        if(x < 1 || x > 40) return
        if(y < 0 || y > 24) return

        this.addElement(
            "Move cursor to an absolute position",
            "move-locate",
            { x: x - 1, y: y }
        )
    }

    /**
     * Flush everything that should be visible characters.
     */
    flushContent() {
        if(this.content !== "") {
            const label = this.content.substr(0, 40).trim()
            this.addElement(
                label.length === 0 ? "Spaces (" + this.content.length + ")"
                                   : label,
                "content-string",
                { value: this.content }
            )
            this.content = ""
        }
    }

    /**
     * Prints a character and moves the cursor.
     * @param {number} charCode the character code of the character to print
     * @private
     */
    print(charCode) {
        this.content += String.fromCharCode(charCode)
        this.charCode = charCode
    }

    /**
     * Repeat the last printed character.
     * @param {number} count the number of repetitions
     * @private
     */
    repeat(count) {
        count -= 0x40
        range(count).forEach(() => this.print(this.charCode))
    }

    /**
     * Set the charset to define
     * @param {string} charsetToDefine charset to define, "G0" or "G1"
     * @private
     */
    drcsDefineCharset(charset) {
        this.addElement(
            "Start DRCS creation",
            "drcs-advanced-start",
            { charset: charset }
        )
    }

    /**
     * Set the ordinal number of the first character to redefine
     * @param {number} startChar starting character (ord) to define
     * @private
     */
    drcsSetStartChar(startChar) {
        this.addElement(
            "Select DRCS start character",
            "drcs-advanced-char",
            { char: startChar }
        )
    }

    /**
     * Start a new serie of redefinition bytes
     * @private
     */
    drcsStart() {
        this.drcsCount = 0
    }

    /**
     * Increment the count of redefinition bytes
     * @private
     */
    drcsInc() {
        this.drcsCount++
    }

    /**
     * Redefine one character based on previous redefinition bytes
     * @private
     */
    drcsDefineChar() {
        // Do not take the last byte into account (usually 0x30 or 0x1F used
        // as separator).
        const sextets = this.previousBytes.lastValues(this.drcsCount + 1)
                      .slice(0, -1)
                      .map(value => value - 0x40 & 0x3f)

        // Converts 14 6-bits values to 10 8-bits values
        // 0      1      2      3     !4      5      6      7     !8
        // 543210 543210 543210 543210 543210 543210 543210 543210 543210...
        // 765432 107654 321076 543210 765432 107654 321076 543210 765432...
        const bytes = [
            sextets[0] << 2 | sextets[1] >> 4,
            (sextets[1] & 0xf) << 4 | sextets[2] >> 2,
            (sextets[2] & 3) << 6 | sextets[3],

            sextets[4] << 2 | sextets[5] >> 4,
            (sextets[5] & 0xf) << 4 | sextets[6] >> 2,
            (sextets[6] & 3) << 6 | sextets[7],

            sextets[8] << 2 | sextets[9] >> 4,
            (sextets[9] & 0xf) << 4 | sextets[10] >> 2,
            (sextets[10] & 3) << 6 | sextets[11],

            sextets[12] << 2 | sextets[13] >> 4
        ]

        // Extract pixels that are set
        const pixels = {}
        range2([10, 8]).forEach((y, x) => {
            if(bytes[y] & 1 >> x !== 0) {
                pixels["apx-" + y + "-" + x] = "on"
            }
        })

        this.addElement("Define a DRCS character", "drcs-advanced-def", pixels)

        // Prepare for the next redefinition
        this.drcsCount = 0
    }

    /**
     * Sets the character set used for G0
     * @param {boolean} bool true for the DRCS set, false for the standard set
     * @private
     */
    drcsUseG0(bool) {
        if(bool) {
            this.addElement("Use DRCS G0", "drcs-drcs-g0")
        } else {
            this.addElement("Use standard G0", "drcs-std-g0")
        }
    }

    /**
     * Sets the character set used for G1
     * @param {boolean} bool true for the DRCS set, false for the standard set
     * @private
     */
    drcsUseG1(bool) {
        if(bool) {
            this.addElement("Use DRCS G1", "drcs-drcs-g1")
        } else {
            this.addElement("Use standard G1", "drcs-std-g1")
        }
    }

    /**
     * Enable the extended keyboard
     * @param {boolean} bool true to enable, false to disable.
     * @private
     */
    setExtendedKeyboard(bool) {
        console.warning("NotImplemented: setExtendedKeyboard", bool)
    }

    /**
     * Change the handling of cursor keys
     * @param {boolean} bool true to use C0, false to use standard codes.
     * @private
     */
    setCursorKeyboard(bool) {
        console.warning("NotImplemented: setCursorKeyboard", bool)
    }

    /**
     * Set switch between two part of the Minitel architecture.
     * @param {boolean} switchOn true to enable, false to disable.
     * @param {string} destination may be only "screen" for the moment.
     * @param {string} source may be only "keyboard" for the moment.
     * @private
     */
    setSwitch(switchOn, destination, source) {
        console.warning(
            "NotImplemented: setSwitch",
            switchOn,
            destination,
            source
        )
    }
}
