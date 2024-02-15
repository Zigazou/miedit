"use strict"
/**
 * @file decoder.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * Class decoding a Videotex stream and updating a PageMemory
 */
Minitel.Decoder = class extends Minitel.Protocol {
    /**
     * Create a new Decoder.
     * @param {Minitel.VDU} vdu The visual display unit used to draw.
     * @param {Minitel.Keyboard} keyboard The keyboard emulator.
     * @param {} sender The function to use to send message to the network.
     * @param {HTMLAudioElement} bip The bip sound.
     */
    constructor(vdu, keyboard = null, sender = null, bip = null) {
        super()

        /**
         * Indicates whether the screen should be automatically scrolled
         * when reaching the bottom of the screen (roll mode) or if the cursor
         * should be put on the first row (page mode)
         * @member {string}
         * @private
         */
        this.pageMode = true

        /**
         * The visual display unit to which the decoded character must be
         * applied.
         * @member {Minitel.VDU}
         * @private
         */
        this.vdu = vdu

        this.clear("page")
        this.clear("status")

        this.resetCurrent()

        /**
         * Last drawn character, mainly used by the repeat functionality.
         * @member {number}
         * @private
         */
        this.charCode = 0x20

        /**
         * A structure holding information about characters being currently
         * redefined.
         * @member {Object}
         * @property {boolean} g0 showing DRCS G0 (true) or standard G0 (false)?
         * @property {boolean} g1 showing DRCS G1 (true) or standard G1 (false)?
         * @property {string} charsetToDefine charset to define "G0" or "G1"
         * @property {number} startChar starting character (ord) to define
         * @property {number} count number of defining bytes read
         * @private
         */
        this.drcs = {
            g0: false,
            g1: false,
            charsetToDefine: undefined,
            startChar: undefined,
            count: 0
        }

        /**
         * A function to communicate with if any, null if no connection.
         * @member {}
         * @private
         */
        this.sender = sender

        if(sender) {
            this.vdu.setStatusCharacter(0x43)
        }

        /**
         * Indicates if keyboard keys must be sent to the screen (true) or not
         * (false).
         * @member {boolean} true for keys being sent to the screen (default for
         *                   a Minitel), false otherwise.
         * @private
         */
        this.keyboardToScreen = sender ? false : true

        /**
         * The keyboard emulator if any, null if no keyboard emulator available.
         * @member {Keyboard}
         * @private
         */
        this.keyboard = keyboard

        if(keyboard) {
            const that = this
            keyboard.setEmitter(function(keycodes) {
                // Keyboard keys are sent to the screen if the Minitel is
                // configured to do this.
                if(that.keyboardToScreen) {
                    that.decodeList(keycodes)
                }

                // Keyboard keys are to be sent to the network if it has been
                // properly open.
                if(that.sender !== null) {
                    that.sender(keycodes.reduce(
                        (accum, curr) => accum + String.fromCharCode(curr),
                        ""
                    ))
                }
            })
        }

        /**
         * The bip sound
         * @member {HTMLAudioElement}
         * @private
         */
        this.bip = bip
    }

    /**
     * Save state before entering the status row
     * @private
     */
    saveState() {
        /**
         * A structure holding the state
         * @member {Object}
         * @property {Object} current current attributes
         * @property {Object} waiting waiting attributes
         * @property {Object} cursor current cursor position
         * @private
         */
        this.savedState = {
            current: Object.assign({}, this.current),
            waiting: Object.assign({}, this.waiting),
            cursor: this.vdu.cursor.saveState()
        }
    }

    /**
     * Restore state after leaving the status row
     * @private
     */
    restoreState() {
        this.current = Object.assign({}, this.savedState.current)
        this.waiting = Object.assign({}, this.savedState.waiting)
        this.vdu.cursor.restoreState(this.savedState.cursor)
    }

    /**
     * Reset current attributes to default values
     * @private
     */
    resetCurrent() {
        /**
         * A structure holding the current attributes
         * @member {Object}
         * @property {Cell} charType current character type (CharCell or
         *                           SeparatedCell)
         * @property {Object} mult
         * @property {number} mult.width width multiplier (1 or 2)
         * @property {number} mult.height height multiplier (1 or 2)
         * @property {number} fgColor foreground color (0 to 7)
         * @property {number} bgColor background color (0 to 7)
         * @property {boolean} underline is underlining enabled?
         * @property {boolean} blink is blinking enabled?
         * @property {boolean} invert is video inverse enabled?
         * @property {boolean} mask is attribute masking enabled?
         * @property {boolean} separated is mosaic character separation enabled?
         * @private
         */
        this.current = {
            charType: Minitel.CharCell,
            mult: { width: 1, height: 1 },
            fgColor: 7,
            bgColor: 0,
            underline: false,
            blink: false,
            invert: false,
            mask: false,
            separated: false
        }

        /**
         * A structure holding attributes waiting to be applied (serial
         * attributes)
         * @member {Object}
         * @property {number=} bgColor
         * @property {boolean=} mask
         * @property {boolean=} underline
         * @private
         */
        this.waiting = {
            bgColor: undefined,
            mask: undefined,
            underline: undefined
        }
    }

    /**
     * Checks if serial attributes have been defined which are waiting to be
     * applied.
     * @private
     * @return {boolean} true if serial attributes are waiting to be applied,
     *                   false otherwise
     */
    serialAttributesDefined() {
        return this.waiting.bgColor !== undefined ||
               this.waiting.underline !== undefined ||
               this.waiting.mask !== undefined
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
        if(direction === "char") {
            // Moves the cursor after printing a character
            this.vdu.cursor.right(this.current.mult.width)
            if(this.vdu.cursor.overflowX()) {
                if(this.vdu.cursor.isOnStatusRow()) {
                    // No overflow on status line
                    this.vdu.cursor.lastColumn()
                } else {
                    // Go to start of next row
                    this.vdu.cursor.firstColumn()
                    range(this.current.mult.height).forEach(
                        () => this.moveCursor("down")
                    )
                }
            }
        } else if(direction === "left") {
            // Moves the cursor one column the left
            this.vdu.cursor.left()
            if(this.vdu.cursor.overflowX()) {
                this.vdu.cursor.lastColumn()
                this.moveCursor("up")
            }
        } else if(direction === "right") {
            // Moves the cursor one column on the right
            this.vdu.cursor.right()
            if(this.vdu.cursor.overflowX()) {
                this.vdu.cursor.firstColumn()
                this.moveCursor("down")
            }
        } else if(direction === "up") {
            // Moves the cursor one row up
            if(this.vdu.cursor.isOnStatusRow()) return;

            this.vdu.cursor.up()

            if(this.vdu.cursor.isOnStatusRow()) {
                if(this.pageMode) {
                    this.vdu.cursor.lastRow()
                } else {
                    this.vdu.cursor.firstRow()
                    this.vdu.scroll("down")
                }
            }
        } else if(direction === "down") {
            // Move the cursor one row down
            if(this.vdu.cursor.isOnStatusRow()) {
                // Restore the state before leaving the status row
                this.restoreState()
            } else {
                this.vdu.cursor.down()

                if(this.vdu.cursor.overflowY()) {
                    if(this.pageMode) {
                        this.vdu.cursor.firstRow()
                    } else {
                        this.vdu.cursor.lastRow()
                        this.vdu.scroll("up")
                    }
                }
            }
        } else if(direction === "firstColumn") {
            // Moves the cursor on the first column of the current row
            this.vdu.cursor.firstColumn()
        } else if(direction === "home") {
            // Moves the cursor on the first column, first row and reset
            // current attributes.
            this.vdu.cursor.home()
            this.resetCurrent()
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
        if(clearRange === "page") {
            // Clear the whole screen except the status row ,reset current
            // attributes and place the cursor on the first column, first row
            this.vdu.clear()
            this.vdu.cursor.home()
            this.resetCurrent()
            return
        }

        if(clearRange === "status") {
            // Clear status row
            this.vdu.cursor.allStatusRow((x, y) => {
                this.vdu.set(x, y, new Minitel.MosaicCell())
            })

            return
        }

        if(clearRange === "eol") {
            // Clear from the current cursor position till the end of the line
            const saveX = this.vdu.cursor.x
            const saveY = this.vdu.cursor.y
            const savePageMode = this.pageMode

            // Clearing must not scroll the screen
            this.pageMode = true
            this.vdu.cursor.cursorToEndOfLine(() => this.print(0x20))
            this.vdu.cursor.x = saveX
            this.vdu.cursor.y = saveY
            this.pageMode = savePageMode
            return
        }

        // CSI sequences do not work on status row
        if(this.vdu.cursor.isOnStatusRow()) return

        if(clearRange === "endofscreen") {
            // Clear from the current cursor position till the end of the screen
            this.vdu.cursor.cursorToEndOfScreen((x, y) => {
                this.vdu.set(x, y, new Minitel.MosaicCell())
            })

            return
        }

        if(clearRange === "startofscreen") {
            // Clear from the current cursor position till the start of the
            // screen
            this.vdu.cursor.homeToCursor((x, y) => {
                this.vdu.set(x, y, new Minitel.MosaicCell())
            })

            return
        }

        if(clearRange === "startofline") {
            // Clear from the start of the row till the current cursor position
            this.vdu.cursor.firstColumnToCursor((x, y) => {
                this.vdu.set(x, y, new Minitel.MosaicCell())
            })

            return
        }

        if(clearRange === "completescreen") {
            // Clear complete screen without moving the cursor nor losing
            // current attributes
            this.vdu.clear()
            return
        }

        if(clearRange === "completeline") {
            // Clear the current line
            this.vdu.cursor.allCurrentRow((x, y) => {
                this.vdu.set(x, y, new Minitel.MosaicCell())
            })

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
        this.pageMode = bool
    }

    /**
     * Emits a beep sound
     * @private
     */
    beep() {
        if(this.bip !== null) {
            this.bip.currentTime = 0
            this.bip.play()
        }
    }

    /**
     * Set the uppercase mode of the keyboard
     * @param {boolean} bool true indicates the keyboard operates in uppercase
     *                       false indicates the keyboard operates in lowercase
     * @private
     */
    setUppercaseMode(bool) {
        this.keyboard.setUppercaseMode(bool)
    }

    /**
     * Set the extended mode of the keyboard
     * @param {boolean} bool true indicates the keyboard works extended
     *                       false indicates the keyboard works standard
     * @private
     */
    setExtendedMode(bool) {
        this.keyboard.setExtendedMode(bool)
    }

    /**
     * Set the cursor keys of the keyboard
     * @param {boolean} bool true indicates keyboard use cursor keys
     *                       false indicates keyboard does not use cursor keys
     * @private
     */
    setCursorKeys(bool) {
        this.keyboard.setCursorKeys(bool)
    }

    /**
     * Set the current character type.
     * Doing so resets some attributes even if the current character type does
     * not change.
     * @param {string} charPage either G0 or G1
     * @private
     */
    setCharType(charPage) {
        this.current.separated = false
        this.current.invert = false
        this.current.mult = { width: 1, height: 1 }

        if(charPage === "G0") {
            this.current.charType = Minitel.CharCell
        } else if(charPage === "G1") {
            this.current.charType = Minitel.MosaicCell
            this.current.underline = false
            if(this.waiting.bgColor !== undefined) {
                this.current.bgColor = this.waiting.bgColor
                this.waiting.bgColor = undefined
            }
        }
    }

    /**
     * Sets the cursor visibility
     * @param {boolean} visibility true for a visibile cursor, false otherwise
     * @private
     */
    showCursor(visibility) {
        this.vdu.cursor.setVisible(visibility)
    }

    /**
     * Sets the foreground color
     * @param {number} color the foreground color (0 to 7)
     * @private
     */
    setFgColor(color) {
        this.current.fgColor = color
    }

    /**
     * Sets the background color
     * @param {number} color the background color (0 to 7)
     * @private
     */
    setBgColor(color) {
        if(this.current.charType === Minitel.CharCell) {
            this.waiting.bgColor = color
        } else if(this.current.charType === Minitel.MosaicCell) {
            this.current.bgColor = color
        }
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
        if(this.vdu.cursor.isOnStatusRow()) return
        if(this.current.charType !== Minitel.CharCell) return

        const sizes = {
            "normalSize": { width: 1, height: 1 },
            "doubleWidth": { width: 2, height: 1 },
            "doubleHeight": { width: 1, height: 2 },
            "doubleSize": { width: 2, height: 2 }
        }

        if(!(sizeName in sizes)) return
        if(this.vdu.cursor.isOnFirstRow() && sizes[sizeName].height === 2)
            return

        this.current.mult = sizes[sizeName]
    }

    /**
     * Sets the text blinking
     * @param {boolean} blink true for blinking text, false otherwise
     * @private
     */
    setBlink(blink) {
        this.current.blink = blink
    }

    /**
     * Sets the masking of attributes
     * @param {boolean} mask true for attributes masking, false otherwise
     * @private
     */
    setMask(mask) {
        this.waiting.mask = mask
    }

    /**
     * Enables or disables the use of zone masking
     * @param {boolean} enabled true enables the use of zone masking, false
     *                          disables the use of zone masking
     * @private
     */
    setGlobalMask(enabled) {
        this.vdu.setGlobalMask(enabled)
    }

    /**
     * Set underline of text or separation of mosaic characters
     * @param {boolean} underline true for text underlining, false otherwise
     * @private
     */
    setUnderline(underline) {
        if(this.current.charType === Minitel.CharCell) {
            this.waiting.underline = underline
        } else if(this.current.charType === Minitel.MosaicCell) {
            this.current.separated = underline
        }
    }

    /**
     * Set video inversion of alphanumerical characters
     * @param {boolean} invert true for video inverse, false otherwise
     * @private
     */
    setInvert(invert) {
        if(this.current.charType === Minitel.MosaicCell) return

        this.current.invert = invert
    }

    /**
     * Move the cursor at an absolute position.
     * Doing so resets the current attributes.
     * @param {boolean} invert true for video inverse, false otherwise
     * @private
     */
    locate(y, x) {
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

        // Save current state before going on row 0
        if(y === 0) {
            this.saveState()
            this.showCursor(false)
        }

        // Minitel works from 1 to 40 while the PageMemory works with 0 to 39
        this.vdu.cursor.set(x - 1, y)

        this.resetCurrent()
    }

    /**
     * Prints a delimiter at the current cursor position.
     * Printing a delimiter will apply the waiting attributes.
     * @param {number} charCode the delimiter code to print (usually 0x20)
     * @private
     */
    printDelimiter(charCode) {
        const x = this.vdu.cursor.x
        const y = this.vdu.cursor.y

        const cell = new Minitel.DelimiterCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.invert = this.current.invert
        cell.mult = this.current.mult

        // Background color
        if(this.waiting.bgColor === undefined) {
            cell.bgColor = this.current.bgColor
        } else {
            cell.bgColor = this.waiting.bgColor
            this.waiting.bgColor = undefined
        }
        this.current.bgColor = cell.bgColor

        // Underline
        cell.zoneUnderline = this.current.underline
        if(this.waiting.underline !== undefined) {
            cell.zoneUnderline = this.waiting.underline
            this.current.underline = this.waiting.underline
            this.waiting.underline = undefined
        }

        // Mask
        cell.mask = this.current.mask
        if(this.waiting.mask !== undefined) {
            cell.mask = this.waiting.mask
            this.current.mask = this.waiting.mask
            this.waiting.mask = undefined
        }

        range2([cell.mult.height, cell.mult.width]).forEach((j, i) => {
            const newCell = cell.copy()
            this.vdu.set(x + i, y - j, newCell)
        })
    }

    /**
     * Prints a G0 character.
     * G0 characters are standard alphanumerical characters.
     * @param {number} charCode the character code of the character to print
     * @private
     */
    printG0Char(charCode) {
        const x = this.vdu.cursor.x
        const y = this.vdu.cursor.y

        const cell = new Minitel.CharCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.blink = this.current.blink
        cell.invert = this.current.invert
        cell.mult = this.current.mult

        // DRCS is ineffictive on the status row
        cell.drcs = y === 0 ? false : this.drcs.g0

        range2([cell.mult.height, cell.mult.width]).forEach((j, i) => {
            const newCell = cell.copy()
            newCell.part = { x: i, y: cell.mult.height - j - 1 }
            this.vdu.set(x + i, y - j, newCell)
        })
    }

    /**
     * Prints a G1 character.
     * G1 characters are semigraphic characters (mosaic).
     * @param {number} charCode the character code of the character to print
     * @private
     */
    printG1Char(charCode) {
        const cell = new Minitel.MosaicCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.bgColor = this.current.bgColor
        cell.blink = this.current.blink
        cell.separated = this.current.separated
        cell.drcs = this.vdu.cursor.isOnStatusRow() ? false : this.drcs.g1

        // Adjust the character code when not printing DRCS characters
        if(cell.value >= 0x20 && cell.value <= 0x5F && !cell.drcs) {
            cell.value += 0x20
        }

        if(cell.separated === true) {
            cell.value -= 0x40
        }

        this.vdu.set(this.vdu.cursor.x, this.vdu.cursor.y, cell)
    }

    /**
     * Prints a character and moves the cursor.
     * @param {number} charCode the character code of the character to print
     * @private
     */
    print(charCode) {
        if(this.current.charType === Minitel.MosaicCell) {
            // MosaicCell are tested first because there is no delimiter for
            // this character types (no serial attributes)
            this.printG1Char(charCode)
        } else if(charCode === 0x20 && this.serialAttributesDefined()) {
            // A space is a delimiter only if there are serial attributes
            // waiting to be applied
            this.printDelimiter(charCode)
        } else if(this.current.charType === Minitel.CharCell) {
            this.printG0Char(charCode)
        }

        this.charCode = charCode
        this.moveCursor("char")
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
        this.drcs.charsetToDefine = charset
    }

    /**
     * Set the ordinal number of the first character to redefine
     * @param {number} startChar starting character (ord) to define
     * @private
     */
    drcsSetStartChar(startChar) {
        this.drcs.startChar = startChar
    }

    /**
     * Start a new serie of redefinition bytes
     * @private
     */
    drcsStart() {
        this.drcs.count = 0
    }

    /**
     * Increment the count of redefinition bytes
     * @private
     */
    drcsInc() {
        this.drcs.count++
    }

    /**
     * Redefine one character based on previous redefinition bytes
     * @private
     */
    drcsDefineChar() {
        // Do not take the last byte into account (usually 0x30 or 0x1F used
        // as separator).
        const sextets = this.previousBytes.lastValues(this.drcs.count + 1)
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

        // Two sets can be redefined, the standard and the mosaic sets
        if(this.drcs.charsetToDefine === "G0") {
            this.vdu.defineCharG0(this.drcs.startChar, bytes)
        } else {
            this.vdu.defineCharG1(this.drcs.startChar, bytes)
        }

        // Prepare for the next redefinition
        this.drcs.startChar++
        this.drcs.count = 0
    }

    /**
     * Sets the character set used for G0
     * @param {boolean} bool true for the DRCS set, false for the standard set
     * @private
     */
    drcsUseG0(bool) {
        this.drcs.g0 = bool
    }

    /**
     * Sets the character set used for G1
     * @param {boolean} bool true for the DRCS set, false for the standard set
     * @private
     */
    drcsUseG1(bool) {
        this.drcs.g1 = bool
    }

    /**
     * Enable the extended keyboard
     * @param {boolean} bool true to enable, false to disable.
     * @private
     */
    setExtendedKeyboard(bool) {
        if(this.keyboard !== null) {
            this.keyboard.setExtendedMode(bool)
        }
    }

    /**
     * Change the handling of cursor keys
     * @param {boolean} bool true to use C0, false to use standard codes.
     * @private
     */
    setCursorKeyboard(bool) {
        if(this.keyboard !== null) {
            this.keyboard.setCursorKeyboard(bool)
        }
    }

    /**
     * Set switch between two part of the Minitel architecture.
     * @param {boolean} switchOn true to enable, false to disable.
     * @param {string} destination may be only "screen" for the moment.
     * @param {string} source may be only "keyboard" for the moment.
     * @private
     */
    setSwitch(switchOn, destination, source) {
        if(destination === "screen" && source === "keyboard") {
            this.keyboardToScreen = switchOn
        }
    }
}
