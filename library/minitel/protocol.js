"use strict"
/**
 * @file Videotex automaton
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */ 
var Minitel = Minitel || {}

/**
 * Class implementing an automaton to read Videotex stream. What to do with the
 * decoded stream must be implemented in a child class.
 */
Minitel.Protocol = class {
    /**
     * Create a new Protocol.
     */
    constructor() {
        /**
         * The current state of the decoder
         * @member {string}
         * @private
         */
        this.state = "start"

        /**
         * A finite stack holding the previous bytes encountered by the
         * automaton. 128 bytes should be enough for any Minitel up to Minitel 2
         * @member {FiniteStack}
         * @protected
         */
        this.previousBytes = new FiniteStack(128)
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
     * @protected
     */
    moveCursor(direction) {
    }

    /**
     * Clear a portion of the screen.
     * @param {string} clearRange Which part of the screen should be cleared, it
     *                            can be either page, status, eol, endofscreen,
     *                            startofscreen, startofline, completescreen or
     *                            completeline
     * @protected
     */
    clear(clearRange) {
    }

    /**
     * Set the current page mode
     * @param {boolean} bool true indicates the screen is in page mode while
     *                       false indicates the screen is in roll mode
     * @protected
     */
    setPageMode(bool) {
    }

    /**
     * Emits a beep sound
     * @protected
     */
    beep() {
    }

    /**
     * Set the uppercase mode of the keyboard
     * @param {boolean} bool true indicates the keyboard operates in uppercase
     *                       false indicates the keyboard operates in lowercase
     * @protected
     */
    setUppercaseMode(bool) {
    }

    /**
     * Set the extended mode of the keyboard
     * @param {boolean} bool true indicates the keyboard works extended
     *                       false indicates the keyboard works standard
     * @protected
     */
    setExtendedMode(bool) {
    }

    /**
     * Set the cursor keys of the keyboard
     * @param {boolean} bool true indicates keyboard use cursor keys
     *                       false indicates keyboard does not use cursor keys
     * @protected
     */
    setCursorKeys(bool) {
    }

    /**
     * Set the current character type.
     * Doing so resets some attributes even if the current character type does
     * not change.
     * @param {string} charPage either G0 or G1
     * @protected
     */
    setCharType(charPage) {
    }

    /**
     * Sets the cursor visibility
     * @param {boolean} visibility true for a visibile cursor, false otherwise
     * @protected
     */
    showCursor(visibility) {
    }

    /**
     * Sets the foreground color
     * @param {number} color the foreground color (0 to 7)
     * @protected
     */
    setFgColor(color) {
    }

    /**
     * Sets the background color
     * @param {number} color the background color (0 to 7)
     * @protected
     */
    setBgColor(color) {
    }

    /**
     * Sets the character size.
     * This is valid only for alphanumerical character and when not in the
     * status row.
     * @param {string} sizeName the size can be either: normalSize, doubleWidth,
     *                          doubleHeight or doubleSize.
     * @protected
     */
    setSize(sizeName) {
    }

    /**
     * Sets the text blinking
     * @param {boolean} blink true for blinking text, false otherwise
     * @protected
     */
    setBlink(blink) {
    }

    /**
     * Sets the masking of attributes
     * @param {boolean} mask true for attributes masking, false otherwise
     * @protected
     */
    setMask(mask) {
    }

    /**
     * Enables or disables the use of zone masking
     * @param {boolean} enabled true enables the use of zone masking, false
     *                          disables the use of zone masking
     * @protected
     */
    setGlobalMask(enabled) {
    }

    /**
     * Set underline of text or separation of mosaic characters
     * @param {boolean} underline true for text underlining, false otherwise
     * @protected
     */
    setUnderline(underline) {
    }

    /**
     * Set video inversion of alphanumerical characters
     * @param {boolean} invert true for video inverse, false otherwise
     * @protected
     */
    setInvert(invert) {
    }

    /**
     * Move the cursor at an absolute position.
     * Doing so resets the current attributes.
     * @param {boolean} invert true for video inverse, false otherwise
     * @protected
     */
    locate(y, x) {
    }

    /**
     * Prints a delimiter at the current cursor position.
     * Printing a delimiter will apply the waiting attributes.
     * @param {number} charCode the delimiter code to print (usually 0x20)
     * @protected
     */
    printDelimiter(charCode) {
    }

    /**
     * Prints a G0 character.
     * G0 characters are standard alphanumerical characters.
     * @param {number} charCode the character code of the character to print
     * @protected
     */
    printG0Char(charCode) {
    }

    /**
     * Prints a G1 character.
     * G1 characters are semigraphic characters (mosaic).
     * @param {number} charCode the character code of the character to print
     * @protected
     */
    printG1Char(charCode) {
    }

    /**
     * Prints a character and moves the cursor.
     * @param {number} charCode the character code of the character to print
     * @protected
     */
    print(charCode) {
    }

    /**
     * Repeat the last printed character.
     * @param {number} count the number of repetitions
     * @protected
     */
    repeat(count) {
    }

    /**
     * Set the charset to define
     * @param {string} charsetToDefine charset to define, "G0" or "G1"
     * @protected
     */
    drcsDefineCharset(charset) {
    }

    /**
     * Set the ordinal number of the first character to redefine
     * @param {number} startChar starting character (ord) to define
     * @protected
     */
    drcsSetStartChar(startChar) {
    }

    /**
     * Start a new serie of redefinition bytes
     * @protected
     */
    drcsStart() {
    }

    /**
     * Increment the count of redefinition bytes
     * @protected
     */
    drcsInc() {
    }

    /**
     * Redefine one character based on previous redefinition bytes
     * @protected
     */
    drcsDefineChar() {
    }

    /**
     * Sets the character set used for G0
     * @param {boolean} bool true for the DRCS set, false for the standard set
     * @protected
     */
    drcsUseG0(bool) {
    }

    /**
     * Sets the character set used for G1
     * @param {boolean} bool true for the DRCS set, false for the standard set
     * @protected
     */
    drcsUseG1(bool) {
    }

    /**
     * Enable the extended keyboard
     * @param {boolean} bool true to enable, false to disable.
     * @protected
     */
    setExtendedKeyboard(bool) {
    }
    
    /**
     * Change the handling of cursor keys
     * @param {boolean} bool true to use C0, false to use standard codes.
     * @protected
     */
    setCursorKeyboard(bool) {
    }

    /**
     * Set switch between two part of the Minitel architecture.
     * @param {boolean} switchOn true to enable, false to disable.
     * @param {string} destination may be only "screen" for the moment.
     * @param {string} source may be only "keyboard" for the moment.
     * @protected
     */
    setSwitch(switchOn, destination, source) {
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
        if(c === 0x00) return

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
