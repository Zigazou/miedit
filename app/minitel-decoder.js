"use strict"
/**
 * @file minitel-decoder.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * Class decoding a Videotex stream and updating a PageMemory
 */
class MinitelDecoder {
    /**
     * Create a new MinitelDecoder.
     * @param {PageMemory} pageMemory The PageMemory against which apply the
     *                                decoded stream.
     * @param {Keyboard} keyboard The keyboard emulator.
     * @param {} sender The function to use to send message to the network.
     */
    constructor(pageMemory, keyboard = null, sender = null) {
        /**
         * The current state of the decoder
         * @member {string}
         * @private
         */
        this.state = "start"

        /**
         * Indicates whether the screen should be automatically scrolled
         * when reaching the bottom of the screen (roll mode) or if the cursor
         * should be put on the first row (page mode)
         * @member {string}
         * @private
         */
        this.pageMode = true

        /**
         * The page memory to which the decoded character must be applied
         * @member {PageMemory}
         * @private
         */
        this.pm = pageMemory

        this.clear("page")
        this.clear("status")

        /**
         * A finite stack holding the previous bytes encountered by the
         * automaton. 128 bytes should be enough for any Minitel up to Minitel 2
         * @member {FiniteStack}
         * @private
         */
        this.previousBytes = new FiniteStack(128)

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
            count: 0,
        }

        /**
         * A function to communicate with if any, null if no connection.
         * @member {}
         * @private
         */
        this.sender = sender

        if(sender !== null) {
            this.pm.setStatusCharacter(0x43)
        }

        /**
         * Indicates if keyboard keys must be sent to the screen (true) or not
         * (false).
         * @member {boolean} true for keys being sent to the screen (default for
         *                   a Minitel), false otherwise.
         * @private
         */
        this.keyboardToScreen = true

        if(sender !== null) {
            this.keyboardToScreen = false
        }

        /**
         * The keyboard emulator if any, null if no keyboard emulator available.
         * @member {Keyboard}
         * @private
         */
        this.keyboard = keyboard

        if(keyboard !== null) {
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
            cursor: { x: this.pm.cursor.x, y: this.pm.cursor.y },
        }
    }

    /**
     * Restore state after leaving the status row
     * @private
     */
    restoreState() {
        this.current = Object.assign({}, this.savedState.current)
        this.waiting = Object.assign({}, this.savedState.waiting)
        this.pm.cursor.x = this.savedState.cursor.x
        this.pm.cursor.y = this.savedState.cursor.y
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
            charType: CharCell,
            mult: { width: 1, height: 1 },
            fgColor: 7,
            bgColor: 0,
            underline: false,
            blink: false,
            invert: false,
            mask: false,
            separated: false,
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
        return this.waiting.bgColor !== undefined
            || this.waiting.underline !== undefined
            || this.waiting.mask !== undefined
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
            this.pm.cursor.x += this.current.mult.width
            if(this.pm.cursor.x >= this.pm.grid.cols) {
                if(this.pm.cursor.y == 0) {
                    // No overflow on status line
                    this.pm.cursor.x = this.pm.grid.cols - 1
                } else {
                    // Go to start of next row
                    this.pm.cursor.x = 0
                    range(this.current.mult.height).forEach(i => {
                        this.moveCursor("down")
                    })
                }
            }
        } else if(direction === "left") {
            // Moves the cursor one column the left
            this.pm.cursor.x--
            if(this.pm.cursor.x < 0) {
                this.pm.cursor.x = this.pm.grid.cols - 1
                this.moveCursor("up")
            }
        } else if(direction === "right") {
            // Moves the cursor one column on the right
            this.pm.cursor.x++
            if(this.pm.cursor.x >= this.pm.grid.cols) {
                this.pm.cursor.x = 0
                this.moveCursor("down")
            }
        } else if(direction === "up") {
            // Moves the cursor one row up
            if(this.pm.cursor.y == 0) return;

            this.pm.cursor.y--

            if(this.pm.cursor.y == 0) {
                if(this.pageMode) {
                    this.pm.cursor.y = this.pm.grid.rows - 1
                } else {
                    this.pm.cursor.y = 1
                    this.pm.scroll("down")
                }
            }
        } else if(direction === "down") {
            // Move the cursor one row down
            if(this.pm.cursor.y === 0) {
                // Restore the state before leaving the status row
                this.restoreState()
            } else {
                this.pm.cursor.y++

                if(this.pm.cursor.y == this.pm.grid.rows) {
                    if(this.pageMode) {
                        this.pm.cursor.y = 1
                    } else {
                        this.pm.cursor.y = this.pm.grid.rows - 1
                        this.pm.scroll("up")
                    }
                }
            }
        } else if(direction === "firstColumn") {
            // Moves the cursor on the first column of the current row
            this.pm.cursor.x = 0
        } else if(direction === "home") {
            // Moves the cursor on the first column, first row and reset
            // current attributes.
            this.pm.cursor.x = 0
            this.pm.cursor.y = 1
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
            this.pm.clear()
            this.pm.cursor.x = 0
            this.pm.cursor.y = 1
            this.resetCurrent()
            return
        }

        if(clearRange === "status") {
            // Clear status row
            let row = []
            range(this.pm.grid.cols).forEach(i => {
                this.pm.set(i, 0, new MosaicCell())
            })
            return
        }

        if(clearRange === "eol") {
            // Clear from the current cursor position till the end of the line
            const saveX = this.pm.cursor.x
            const saveY = this.pm.cursor.y
            const savePageMode = this.pageMode

            // Clearing must not scroll the screen
            this.pageMode = true
            range(this.pm.cursor.x, this.pm.grid.cols).forEach(i => {
                this.print(0x20)
            })
            this.pm.cursor.x = saveX
            this.pm.cursor.y = saveY
            this.pageMode = savePageMode
            return
        }

        // CSI sequences do not work on status row
        if(this.pm.cursor.y === 0) return

        if(clearRange === "endofscreen") {
            // Clear from the current cursor position till the end of the screen
            range(this.pm.cursor.x, this.pm.grid.cols).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })

            const [cols, rows] = [this.pm.grid.cols, this.pm.grid.rows]
            range2([this.pm.cursor.y + 1, 0], [rows, cols]).forEach((y, x) => {
                this.pm.set(x, y, new MosaicCell())
            })

            return
        }

        if(clearRange === "startofscreen") {
            // Clear from the current cursor position till the start of the
            // screen
            range(0, this.pm.cursor.x + 1).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })
        
            const [cols, rows] = [this.pm.grid.cols, this.pm.cursor.y]
            range2([0, 0], [rows, cols]).forEach((y, x) => {
                this.pm.set(x, y, new MosaicCell())
            })

            return
        }

        if(clearRange === "startofline") {
            // Clear from the start of the row till the current cursor position
            range(0, this.pm.cursor.x + 1).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })

            return
        }

        if(clearRange === "completescreen") {
            // Clear complete screen without moving the cursor nor losing
            // current attributes
            this.pm.clear()
            return        
        }

        if(clearRange === "completeline") {
            // Clear the current line
            range(0, this.pm.grid.cols).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
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
            this.current.charType = CharCell
        } else if(charPage === "G1") {
            this.current.charType = MosaicCell
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
        this.pm.cursor.visible = visibility
    }

    /**
     * Sets the foreground color
     * @param {number} color the foreground color (0 to 7)
     * @private
     */
    setFgColor(color) {
        if(this.pm.cursor.y === 0) return

        this.current.fgColor = color
    }

    /**
     * Sets the background color
     * @param {number} color the background color (0 to 7)
     * @private
     */
    setBgColor(color) {
        if(this.pm.cursor.y === 0) return

        if(this.current.charType === CharCell) {
            this.waiting.bgColor = color
        } else if(this.current.charType === MosaicCell) {
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
        if(this.pm.cursor.y === 0) return
        if(this.current.charType !== CharCell) return

        const sizes = {
            "normalSize": { width: 1, height: 1 },
            "doubleWidth": { width: 2, height: 1 },
            "doubleHeight": { width: 1, height: 2 },
            "doubleSize": { width: 2, height: 2 },
        }

        if(!(sizeName in sizes)) return
        if(this.pm.cursor.y === 1 && sizes[sizeName].height === 2) return
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
        this.pm.setGlobalMask(enabled)
    }

    /**
     * Set underline of text or separation of mosaic characters
     * @param {boolean} underline true for text underlining, false otherwise
     * @private
     */
    setUnderline(underline) {
        if(this.current.charType === CharCell) {
            this.waiting.underline = underline
        } else if(this.current.charType === MosaicCell) {
            this.current.separated = underline
        }
    }

    /**
     * Set video inversion of alphanumerical characters
     * @param {boolean} invert true for video inverse, false otherwise
     * @private
     */
    setInvert(invert) {
        if(this.current.charType === MosaicCell) return

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
        if(y === 0) this.saveState()

        // Minitel works from 1 to 40 while the PageMemory works with 0 to 39
        this.pm.cursor.x = x - 1
        this.pm.cursor.y = y

        this.resetCurrent()
    }

    /**
     * Prints a delimiter at the current cursor position.
     * Printing a delimiter will apply the waiting attributes.
     * @param {number} charCode the delimiter code to print (usually 0x20)
     * @private
     */
    printDelimiter(charCode) {
        const x = this.pm.cursor.x
        const y = this.pm.cursor.y

        const cell = new DelimiterCell()
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
            this.pm.set(x + i, y - j, newCell)
        })
    }

    /**
     * Prints a G0 character.
     * G0 characters are standard alphanumerical characters.
     * @param {number} charCode the character code of the character to print
     * @private
     */
    printG0Char(charCode) {
        const x = this.pm.cursor.x
        const y = this.pm.cursor.y

        const cell = new CharCell()
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
            this.pm.set(x + i, y - j, newCell)
        })
    }

    /**
     * Prints a G1 character.
     * G1 characters are semigraphic characters (mosaic).
     * @param {number} charCode the character code of the character to print
     * @private
     */
    printG1Char(charCode) {
        const x = this.pm.cursor.x
        const y = this.pm.cursor.y

        const cell = new MosaicCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.bgColor = this.current.bgColor
        cell.blink = this.current.blink
        cell.separated = this.current.separated
        cell.drcs = y === 0 ? false : this.drcs.g1

        // Adjust the character code when not printing DRCS characters
        if(cell.value >= 0x20 && cell.value <= 0x5F && !cell.drcs) {
            cell.value += 0x20
        }

        if(cell.separated === true) {
            cell.value -= 0x40
        }

        this.pm.set(x, y, cell)
    }

    /**
     * Prints a character and moves the cursor.
     * @param {number} charCode the character code of the character to print
     * @private
     */
    print(charCode) {
        if(this.current.charType === MosaicCell) {
            // MosaicCell are tested first because there is no delimiter for
            // this character types (no serial attributes)
            this.printG1Char(charCode)
        } else if(charCode === 0x20 && this.serialAttributesDefined()) {
            // A space is a delimiter only if there are serial attributes
            // waiting to be applied
            this.printDelimiter(charCode)
        } else if(this.current.charType === CharCell) {
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
        range(count).forEach(i => this.print(this.charCode))
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
                      .map(value => { return (value - 0x40) & 0x3f })

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

            sextets[12] << 2 | sextets[13] >> 4,
        ]

        // Two sets can be redefined, the standard and the mosaic sets
        if(this.drcs.charsetToDefine === "G0") {
            this.pm.defineCharG0(this.drcs.startChar, bytes)
        } else {
            this.pm.defineCharG1(this.drcs.startChar, bytes)
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

    /**
     * Execute one character in the automaton
     * @param {string} char the character to execute
     * @private
     */
    decode(char) {
        // Get the ordinal value of the character
        const c = char.charCodeAt(0)

        // NUL character is always ignored, whenever it happens
        if(c == 0x00) return

        // Keep memory of each executed character
        this.previousBytes.push(c)

        // Verify that the current state exists in the automaton
        if(!(this.state in Minitel.states)) {
            // Error! Restart at the initial state of the automaton
            console.log("Unknown state: " + this.state)
            this.state = "start"
            return
        }

        // Look for an action for the character to execute
        let action = null
        if(c in Minitel.states[this.state]) {
            // Found an action for this specific character
            action = Minitel.states[this.state][c]
        } else if('*' in Minitel.states[this.state]) {
            // A generic action has been found
            action = Minitel.states[this.state]['*']
        }

        if(action === null) {
            // The automaton does not know what to do with the character
            console.log("unexpectedChar: " + c)
        } else if("notImplemented" in action) {
            // The automaton recognizes the character but has no action for it
            console.log("Not implemented: " + action.notImplemented)
        } else if("error" in action) {
            // The character should not have occured at this particuliar moment
            // in the stream
            console.log("Error: " + action.error)
        } else if("func" in action && !(action.func in this)) {
            // The automaton is fine but the specified function has not been
            // written in the MinitelDecoder class
            console.log("Error: developer forgot to write " + action.func)
        } else if("func" in action) {
            // The action has a function ready to be executed
            let args = []
            if("arg" in action) {
                // The function has predefined arguments
                if(Array.isArray(action.arg)) {
                    args = action.arg
                } else {
                    args = [action.arg]
                }
            } else if("dynarg" in action) {
                // The function should take its arguments in the previously
                // executed characters
                args = this.previousBytes.lastValues(action.dynarg)
            }

            // Excute the function
            this[action.func].apply(this, args)
        }

        // Determine the next state of the automaton based on the existence of
        // a "goto" attribute, otherwise it sets the automaton to its initial
        // state.
        this.state = action && "goto" in action ? action.goto : "start"
    }

    /**
     * Decode a list of characters
     * @param {mixed} items Either a string, an instance of a String or anything
     *                      iterable containing numbers
     */
    decodeList(items) {
        if(typeof items === "string" || items instanceof String) {
            // Items are a string of an instance of a String
            range(items.length).forEach(i => this.decode(items[i]))
        } else {
            // Items are iterable
            range(items.length).forEach(i =>
                this.decode(String.fromCharCode(items[i]))
            )
        }
    }
}
