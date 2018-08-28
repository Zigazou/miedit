/**
 * @file mioldstyle.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * An old style Videotex editor in which you use the keyboard to modify each
 * cell on a Minitel screen.
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * MiEdit.MiOldStyle is the GUI allowing the user to create and modify a
 * Videotex page like in the good old days.
 */
MiEdit.MiOldStyle = class {
    /**
     * @param {HTMLElement} root DOM element containing all the other elements
     *                           making the GUI of the old style editor.
     */
    constructor(root) {
        /**
         * The DOM element containing all the DOM elements which are needed for
         * the mosaic drawing editor.
         *
         * @member {HTMLElement}
         * @private
         */
        this.root = root

        /**
         * The old style editor emulator.
         *
         * @member {Minitel.Emulator}
         * @private
         */
        this.emulator = new Minitel.Emulator(
            this.root.querySelector("x-minitel")
        )

        /**
         * The old style editor cursor.
         *
         * @member {Minitel.VDUCursor}
         */
        this.cursor = this.emulator.vdu.cursor

        /**
         * The old style editor VDU.
         *
         * @member {Minitel.VDU}
         */
        this.vdu = this.emulator.vdu

        // Show the Minitel cursor.
        this.cursor.setIndicator(true)

        // Connect every callback.
        this.root.autocallback(this)

        this.root.querySelector("x-minitel").addEventListener(
            "keydown", event => this.onKeypress(event)
        )

        this.root.querySelector("x-minitel .minitel-screen").addEventListener(
            "mousedown", event => this.onMouseDown(event)
        )

        this.root.querySelector("x-minitel .minitel-screen").addEventListener(
            "mousemove", event => this.onMouseMove(event)
        )

        /**
         * Next keypress will be identified as a character or mosaic (false) or
         * as an attribute (true).
         *
         * @member {boolean}
         * @private
         */
        this.attributeMode = false

        /**
         * Current cell mode. Values allowed: "character", "mosaic",
         * "delimiter", "diagonal".
         *
         * @member {string}
         * @private
         */
        this.cellMode = "character"

        /**
         * Direction of diagonal drawing.
         *
         * @member {string} "NW", "NE", "SW", "SE" or undefined
         * @private
         */
        this.diagonalDirection = undefined

        /**
         * Direct access to attributes form elements.
         *
         * @member {}
         * @private
         */
        const container = this.root.querySelector(".oldstyle-attributes")
        this.attributes = {
            container: container,
            types: container.querySelectorAll("input[name=cell-type]"),
            value: container.querySelector("input[name=cell-value]"),
            foregrounds: container.querySelectorAll("input[name=attr-fg]"),
            backgrounds: container.querySelectorAll("input[name=attr-bg]"),
            blink: container.querySelector(".attr-blink"),
            invert: container.querySelector(".attr-invert"),
            separated: container.querySelector(".attr-separated"),
            underline: container.querySelector(".attr-underline"),
            mask: container.querySelector(".attr-mask"),
            doubleWidth: container.querySelector(".attr-double-width"),
            doubleHeight: container.querySelector(".attr-double-height"),
            drcs: container.querySelector(".attr-drcs")
        }
    }

    /**
     * Returns a range object used to apply actions on the cursor zone.
     *
     * @returns {Object}
     * @private
     */
    rangeZone() {
        const start = [this.cursor.x, this.cursor.y]
        const end = [
            this.cursor.x + this.cursor.indicatorWidth,
            this.cursor.y + this.cursor.indicatorHeight
        ]

        return range2(start, end)
    }

    /**
     * Enable the old style editor.
     *
     * @param {string} cvalue An LZ-string of a loadable JSON structure.
     */
    enable(cvalue) {
        // Set default modes.
        this.modeAttribute = false
        this.cellMode = "character"

        // Load the memory
        const value = LZString.decompressFromBase64(
            cvalue.replace(new RegExp('\\.', 'g'), '+')
                  .replace(new RegExp('_', 'g'), '/')
                  .replace(new RegExp('-', 'g'), '=')
        )

        this.vdu.clear()
        this.vdu.vram.load(value)

        // Show the old style editor.
        this.root.classList.remove("hidden")
    }

    /**
     * Disable the old style editor.
     */
    disable() {
        this.root.classList.add("hidden")
    }

    /**
     * Updates the mode panels (cell mode and attribute mode) accordingly to
     * the current state of the editor.
     */
    updateModes() {
        // Attribute mode.
        if(this.attributeMode) {
            this.root.querySelector("#set-attribute").checked = true
        } else {
            this.root.querySelector("#set-character").checked = true
        }

        // Cell mode.
        if(this.cellMode === "character") {
            this.root.querySelector("#character-mode").checked = true
        } else if(this.cellMode === "mosaic") {
            this.root.querySelector("#mosaic-mode").checked = true
        } else if(this.cellMode === "delimiter") {
            this.root.querySelector("#delimiter-mode").checked = true
        } else if(this.cellMode === "diagonal") {
            this.root.querySelector("#diagonal-mode").checked = true
        }
    }

    /**
     * Update the attributes panel.
     *
     * @param {Minitel.Cell} cell Cell used to update the attribute panel.
     */
    updateAttributes(cell) {
        // Unchecks all checkbox/radiobox
        this.root.querySelectorAll(".oldstyle-attributes input").forEach(
            element => element.checked = false
        )

        // Disable all form elements
        this.attributes.container.querySelectorAll(
            '.class-character input, .class-mosaic input, .class-delimiter input'
        ).forEach(node => node.disabled = true)

        if(cell === undefined) return

        let typeClass
        if(cell instanceof Minitel.CharCell) {
            typeClass = ".class-character"
        } else if(cell instanceof Minitel.MosaicCell) {
            typeClass = ".class-mosaic"
        } else {
            typeClass = ".class-delimiter"
        }

        // Enable form elements which must be enabled for this kind of cell.
        this.attributes.container.querySelectorAll(typeClass + " input")
                                 .forEach(node => node.disabled = false)


        // Gradient colors are not the same as raw colors.
        const colorToInput = [0, 2, 4, 6, 1, 3, 5, 7]

        // Select the cell type
        if(cell instanceof Minitel.CharCell) {
            this.attributes.types[0].checked = true
            this.attributes.value.value = cell.value
            this.attributes.blink.checked = cell.blink
            this.attributes.invert.checked = cell.invert
            this.attributes.doubleWidth.checked = cell.mult.width === 2
            this.attributes.doubleHeight.checked = cell.mult.height === 2
            this.attributes.drcs.checked = cell.drcs
        } else if(cell instanceof Minitel.MosaicCell) {
            this.attributes.types[1].checked = true
            this.attributes.value.value = cell.value
            this.attributes.backgrounds[colorToInput[cell.bgColor]]
                           .checked = true
            this.attributes.blink.checked = cell.blink
            this.attributes.separated.checked = cell.separated
            this.attributes.drcs.checked = cell.drcs
        } else {
            this.attributes.types[2].checked = true
            this.attributes.value.value = 0x20
            this.attributes.backgrounds[colorToInput[cell.bgColor]]
                           .checked = true
            this.attributes.invert.checked = cell.invert
            this.attributes.underline.checked = cell.zoneUnderline
            this.attributes.mask.checked = cell.mask
            this.attributes.doubleWidth.checked = cell.mult.width === 2
            this.attributes.doubleHeight.checked = cell.mult.height === 2
        }

        this.attributes.foregrounds[colorToInput[cell.fgColor]].checked = true
    }

    /**
     * When a key is pressed.
     *
     * @param {HTMLEvent} event Key event.
     */
    onKeypress(event) {
        if(event.key === "Escape") {
            this.onKeyCellMode()
        } else if(event.key === "²") {
            this.onKeyAttributeMode()
        } else if(this["onKey" + (event.shiftKey ? "Shift" : "") + event.key]) {
            this["onKey" + (event.shiftKey ? "Shift" : "") + event.key](event)
        } else if(this.attributeMode) {
            this.onKeyAttribute(event)
        } else if(event.key.length === 1) {
            const charCode = event.key in Minitel.rawChars
                           ? Minitel.rawChars[event.key]
                           : 0x7F

            if(this.cellMode === "character") {
                this.onKeyCharacter(charCode)
            } else if(this.cellMode === "mosaic") {
                this.onKeyMosaic(charCode)
            } else if(this.cellMode === "delimiter") {
                this.onKeyDelimiter(charCode)
            } else if(this.cellMode === "diagonal") {
                this.onKeyDiagonal(charCode)
            }
        } else {
            // The key is not handled by our editor, give it to the browser.
            return
        }

        event.preventDefault()
        this.updateModes()
        this.updateAttributes(
            this.vdu.get(this.cursor.x, this.cursor.y)
        )
    }

    onKeyCharacter(charCode) {
        this.rangeZone().forEach((x, y) => {
            // Change the charcode on the current character cell.
            const currentCell = this.vdu.get(x, y)

            const cell = new Minitel.CharCell()
            cell.value = charCode
            cell.fgColor = currentCell.fgColor

            // Merge the current cell with the new one.
            if(currentCell instanceof Minitel.CharCell) {
                cell.blink = currentCell.blink
                cell.invert = currentCell.invert
                cell.drcs = currentCell.drcs
            } else if(currentCell instanceof Minitel.MosaicCell) {
                cell.blink = currentCell.blink
                cell.drcs = currentCell.drcs
            } else {
                cell.invert = currentCell.invert
            }

            this.vdu.set(x, y, cell)
        })

        // If zone is only one cell, move the cursor.
        if(this.cursor.indicatorWidth * this.cursor.indicatorHeight === 1) {
            // Move the cursor to the next character.
            if(this.cursor.isOnLastCol()) {
                if(this.cursor.isOnLastRow()) {
                    this.cursor.home()
                } else {
                    this.cursor.firstColumn()
                    this.cursor.down()
                }
            } else {
                this.cursor.right()
            }
        }
    }

    onKeyDiagonal(charCode) {
        // 7, 9, 1 and 3 are the only keys that are allowed.
        const directions = { 0x37: "NW", 0x39: "NE", 0x31: "SW", 0x33: "SE" }
        if(!(charCode in directions)) return
        const chars = { NW: 0x5C, NE: 0x2F, SW: 0x2F, SE: 0x5C }

        const fromDirections = {
            NW: {
                NW: { dx: -1, dy: -1 },
                NE: { dx: 0, dy: -1 },
                SW: { dx: -1, dy: 0 },
                SE: { dx: 0, dy: 0 }
            },
            NE: {
                NW: { dx: 0, dy: -1 },
                NE: { dx: 1, dy: -1 },
                SW: { dx: 0, dy: 0 },
                SE: { dx: 1, dy: 0 }
            },
            SW: {
                NW: { dx: -1, dy: 0 },
                NE: { dx: 0, dy: 0 },
                SW: { dx: -1, dy: 1 },
                SE: { dx: 0, dy: 1 }
            },
            SE: {
                NW: { dx: 0, dy: 0 },
                NE: { dx: 1, dy: 0 },
                SW: { dx: 0, dy: 1 },
                SE: { dx: 1, dy: 1 }
            }
        }

        const fromNowhere = {
            NW: { dx: 0, dy: 0 },
            NE: { dx: 0, dy: 0 },
            SW: { dx: 0, dy: 0 },
            SE: { dx: 0, dy: 0 }
        }

        const actions = this.diagonalDirection
                      ? fromDirections[this.diagonalDirection]
                      : fromNowhere
        const action = actions[directions[charCode]]

        const x = this.cursor.x + action.dx
        const y = this.cursor.y + action.dy

        if(x < 0 || x >= this.vdu.grid.cols) return
        if(y < 1 || y >= this.vdu.grid.rows) return

        const cell = new Minitel.CharCell()
        cell.value = chars[directions[charCode]]
        this.vdu.set(x, y, cell)
        this.cursor.set(x, y)

        this.diagonalDirection = directions[charCode]
    }

    onKeyMosaic(charCode) {
        // 1, 2, 4, 5, 7 and 8 are the only keys that are allowed.
        const bit = [0x37, 0x38, 0x34, 0x35, 0x31, 0x32].indexOf(charCode)
        if(bit === -1) return

        this.rangeZone().forEach((x, y) => {
            const currentCell = this.vdu.get(x, y)
            const cell = new Minitel.MosaicCell()

            // Bit 0 is attached to '7', bit 1 to '8', bit 2 to '4'...
            cell.value = currentCell.value ^ 1 << bit
            cell.fgColor = currentCell.fgColor

            // Merge the new cell with the current one.
            if(currentCell instanceof Minitel.CharCell) {
                cell.value = 0x40 ^ 1 << bit
                cell.blink = currentCell.blink
                cell.drcs = currentCell.drcs
            } else if(currentCell instanceof Minitel.MosaicCell) {
                cell.blink = currentCell.blink
                cell.bgColor = currentCell.bgColor
                cell.separated = currentCell.separated
                cell.drcs = currentCell.drcs
            } else {
                cell.value = 0x40 ^ 1 << bit
                cell.bgColor = currentCell.bgColor
            }

            this.vdu.set(x, y, cell)
        })
    }

    onKeyDelimiter() {
        this.rangeZone().forEach((x, y) => {
            const currentCell = this.vdu.get(x, y)

            const cell = new Minitel.DelimiterCell()
            cell.fgColor = currentCell.fgColor

            if(currentCell instanceof Minitel.CharCell) {
                cell.invert = currentCell.invert
            } else if(currentCell instanceof Minitel.MosaicCell) {
                cell.bgColor = currentCell.bgColor
            } else {
                cell.invert = currentCell.invert
                cell.zoneUnderline = currentCell.zoneUnderline
                cell.mask = currentCell.mask
            }

            this.vdu.set(x, y, cell)
        })
    }

    onKeyAttribute(event) {
        this.rangeZone().forEach((x, y) => {
            const cell = this.vdu.get(x, y)

            // Foreground color.
            const indexFG = "aetuzryi".indexOf(event.key)
            if(indexFG >= 0) cell.fgColor = indexFG

            // Background color.
            if(!(cell instanceof Minitel.CharCell)) {
                const indexBG = "qdgjsfhk".indexOf(event.key)
                if(indexBG >= 0) cell.bgColor = indexBG
            }

            // Blinking.
            if(!(cell instanceof Minitel.MosaicCell)) {
                if(event.key === "w") cell.blink = !cell.blink
            }

            // Invert.
            if(!(cell instanceof Minitel.MosaicCell)) {
                if(event.key === "x") cell.invert = !cell.invert
            }

            // Separated.
            if(cell instanceof Minitel.MosaicCell) {
                if(event.key === "c") {
                    cell.separated = !cell.separated
                    cell.value = cell.value ^ 0x40
                }
            }

            // Underline.
            if(cell instanceof Minitel.DelimiterCell) {
                if(event.key === "v") cell.zoneUnderline = !cell.zoneUnderline
            }

            // Mask.
            if(cell instanceof Minitel.DelimiterCell) {
                if(event.key === "b") cell.mask = !cell.mask
            }

            // Underline.
            if(cell instanceof Minitel.DelimiterCell) {
                if(event.key === "n") cell.drcs = !cell.drcs
            }

            this.vdu.set(x, y, cell)
        })
    }

    /**
     * When the user press the switch cell key.
     *
     * @private
     */
    onKeyCellMode() {
        const modes = ["character", "mosaic", "delimiter", "diagonal"]
        const index = modes.indexOf(this.cellMode)

        this.cellMode = modes[(index + 1) % modes.length]

        this.attributeMode = false
    }

    /**
     * When the user press the switch attribute key.
     *
     * @private
     */
    onKeyAttributeMode() {
        this.attributeMode = !this.attributeMode
    }

    onKeyDelete() {
        this.rangeZone().forEach((x, y) => {
            const cell = new Minitel.MosaicCell()
            cell.value = 0x40
            this.vdu.set(x, y, cell)
        })
    }

    /**
     * When the user uses the down key of the cursor keys.
     *
     * @private
     */
    onKeyArrowDown(event) {
        this.diagonalDirection = undefined
        this.cursor.setDimension()
        if(!this.cursor.isOnLastRow()) this.cursor.down()
    }

    /**
     * When the user uses the shift down key of the cursor keys.
     *
     * @private
     */
    onKeyShiftArrowDown(event) {
        this.diagonalDirection = undefined
        this.cursor.setDimension(
            this.cursor.indicatorWidth,
            this.cursor.indicatorHeight + 1
        )
    }

    /**
     * When the user uses the up key of the cursor keys.
     *
     * @private
     */
    onKeyArrowUp() {
        this.diagonalDirection = undefined
        this.cursor.setDimension()
        if(!this.cursor.isOnFirstRow()) this.cursor.up()
    }

    /**
     * When the user uses the shift up key of the cursor keys.
     *
     * @private
     */
    onKeyShiftArrowUp() {
        this.diagonalDirection = undefined
        this.cursor.setDimension(
            this.cursor.indicatorWidth,
            this.cursor.indicatorHeight - 1
        )
    }

    /**
     * When the user uses the right key of the cursor keys.
     *
     * @private
     */
    onKeyArrowRight() {
        this.diagonalDirection = undefined
        this.cursor.setDimension()
        if(!this.cursor.isOnLastCol()) this.cursor.right()
    }

    /**
     * When the user uses the shift right key of the cursor keys.
     *
     * @private
     */
    onKeyShiftArrowRight() {
        this.diagonalDirection = undefined
        this.cursor.setDimension(
            this.cursor.indicatorWidth + 1,
            this.cursor.indicatorHeight
        )
    }

    /**
     * When the user uses the left key of the cursor keys.
     *
     * @private
     */
    onKeyArrowLeft() {
        this.diagonalDirection = undefined
        this.cursor.setDimension()
        if(!this.cursor.isOnFirstCol()) this.cursor.left()
    }

    /**
     * When the user uses the shift left key of the cursor keys.
     *
     * @private
     */
    onKeyShiftArrowLeft() {
        this.diagonalDirection = undefined
        this.cursor.setDimension(
            this.cursor.indicatorWidth - 1,
            this.cursor.indicatorHeight
        )
    }

    /**
     * When the user changes something on the attribute panel.
     *
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onAttribute() {
    }

    onAttributeMode() {
        const input = this.root.querySelector("input[name=attr-mode]:checked")
        this.attributeMode = input.value === "a"
    }

    onCellMode() {
        const input = this.root.querySelector("input[name=cell-mode]:checked")
        const modes = {
            c: "character",
            m: "mosaic",
            d: "delimiter",
            g: "diagonal"
        }

        this.cellMode = input.value in modes ? modes[input.value] : "delimiter"
    }

    onMouseDown(event) {
        if(event.buttons !== 1) return

        this.cursor.setDimension()
        this.cursor.set(
            Math.floor(
                this.vdu.grid.cols * event.layerX / event.target.scrollWidth
            ),
            Math.floor(
                this.vdu.grid.rows * event.layerY / event.target.scrollHeight
            ),
        )
    }

    onMouseMove(event) {
        if(event.buttons !== 1) return

        this.cursor.setDimension(
            Math.floor(
                this.vdu.grid.cols * event.layerX / event.target.scrollWidth
            ) - this.cursor.x + 1,
            Math.floor(
                this.vdu.grid.rows * event.layerY / event.target.scrollHeight
            ) - this.cursor.y + 1,
        )

        event.preventDefault()
    }

    toString() {
        return LZString.compressToBase64(this.vdu.vram.save())
                       .replace(new RegExp('\\+', 'g'), '.')
                       .replace(new RegExp('/', 'g'), '_')
                       .replace(new RegExp('=', 'g'), '-')
    }
}
