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
         * Number of pixels per width in a mosaic character
         *
         * @member {number}
         * @private
         */
        this.pixelsPerWidth = 2

        /**
         * Number of pixels per height in a mosaic character
         *
         * @member {number}
         * @private
         */
        this.pixelsPerHeight = 3

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

        /**
         * Next keypress will be identified as a character or mosaic (false) or
         * as an attribute (true).
         *
         * @member {boolean}
         * @private
         */
        this.modeAttribute = false

        /**
         * Previous keypress handler.
         */
        this.previousOnkeypress = undefined

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
     * Enable the old style editor.
     */
    enable() {
        this.previousOnKeypress = document.onkeypress
        document.onkeypress = event => this.onKeypress(event)
        this.modeAttribute = false
        this.root.classList.remove("hidden")
    }

    /**
     * Disable the old style editor.
     */
    disable() {
        this.root.classList.add("hidden")
        document.onkeypress = this.previousOnKeypress
    }

    /**
     * When the user clicks on the Ignore changes button.
     */
    onExitOldStyle() {
        this.disable()
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
            this.attributes.backgrounds[cell.bgColor].checked = true
            this.attributes.blink.checked = cell.blink
            this.attributes.separated.checked = cell.separated
            this.attributes.drcs.checked = cell.drcs
        } else {
            this.attributes.types[2].checked = true
            this.attributes.value.value = 0x20
            this.attributes.backgrounds[cell.bgColor].checked = true
            this.attributes.invert.checked = cell.invert
            this.attributes.underline.checked = cell.zoneUnderline
            this.attributes.mask.checked = cell.mask
            this.attributes.doubleWidth.checked = cell.mult.width === 2
            this.attributes.doubleHeight.checked = cell.mult.height === 2
        }

        this.attributes.foregrounds[cell.fgColor].checked = true
    }

    /**
     * When a key is pressed.
     *
     * @param {HTMLEvent} event Key event.
     */
    onKeypress(event) {
        const cell = this.vdu.get(this.cursor.x, this.cursor.y)
        // console.log(event)

        if(this["onKey" + event.key]) {
            this["onKey" + event.key](event)
        } else if(this.modeAttribute) {
            this.onKeyAttribute(event)
        } else {
            if(cell instanceof Minitel.CharCell) {
                this.onKeyCharacter(event)
            } else if(cell instanceof Minitel.MosaicCell) {
                this.onKeyMosaic(event)
            } else {
                this.onKeyDelimiter(event)
            }
        }

        this.updateAttributes(
            this.vdu.get(this.cursor.x, this.cursor.y)
        )
    }

    onKeyCharacter(event) {
        this.emulator.send(event.charCode)
    }

    onKeyMosaic(event) {
        this.emulator.send(event.charCode)
    }

    onKeyDelimiter(event) {
        this.onKeyCharacter(event)
    }

    onKeyAttribute(event) {

    }

    onKeyEscape() {
        this.modeCharacter = !this.modeCharacter
    }

    onKeyArrowDown() {
        if(!this.cursor.isOnLastRow()) this.cursor.down()
        this.updateAttributes()
    }

    onKeyArrowUp() {
        if(!this.cursor.isOnFirstRow()) this.cursor.up()
    }

    onKeyArrowRight() {
        if(!this.cursor.isOnLastCol()) this.cursor.right()
    }

    onKeyArrowLeft() {
        if(!this.cursor.isOnFirstCol()) this.cursor.left()
    }

    /**
     * When the user changes something on the attribute panel.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onAttribute(event) {
        const form = event.target

        const ctype = form.querySelector('input[name=cell-type]:checked').value

    }
}
