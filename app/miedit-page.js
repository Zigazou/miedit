"use strict"
/**
 * @file miedit-page.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * MiEditPage is a GUI allowing the user to create Videotex pages meant for the
 * Minitel.
 *
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * A Minitel Page Editor composed of a view (Videotex emulation), a ribbon and
 * a tree holding the page structure.
 */
MiEdit.MiEditPage = class {
    /**
     * @param {jQuery} container the element containing all our widgets
     * @param {string} pageName name of the page currently edited
     */
    constructor(container, pageName) {
        /**
         * The jQuery object pointing to the DOM element containing our
         * widgets.
         * @member {jQuery}
         * @private
         */
        this.container = container

        /**
         * The page name which is used when saving the page in the local storage
         * @member {string=}
         * @private
         */
        this.pageName = pageName

        /**
         * The storage manager
         * @member {MiStorage}
         * @private
         */
        this.mistorage = new MiEdit.MiStorage("page")

        /**
         * The HTML input field holding a text value representing a mosaic
         * drawing.
         * @member {HTMLElement=}
         * @private
         */
        this.inputGraphics = undefined

        /**
         * The ribbon menu
         * @member {SimpleRibbon}
         * @private
         */
        this.ribbon = new SimpleRibbon(document.getElementById("ribbon"))

        const mosaicRoot = document.getElementsByClassName("mosaic-root")[0]

        /**
         * A Mosaic editor widget which will be hidden/revealed when the user
         * needs it.
         * @member {MiEdit.MiMosaic}
         * @private
         */
        this.graphics = new MiEdit.MiMosaic(mosaicRoot, 4)

        const page = this.mistorage.load(pageName)

        /**
         * The tree widget holding our page structure
         * @member {MiTree}
         * @private
         */
        this.mitree = new MiEdit.MiTree(
            container.find(".mitree-container"),
            this.ribbon,
            page !== null && page.tree ? page.tree : page
        )

        // Automatically attach events to handlers of this class
        this.ribbon.root.autocallback(this)
        container.find(".content-graphics").map((i, o) => o.autocallback(this))
        container.find(".drcs-black-white").map((i, o) => o.autocallback(this))
        container.find(".drcs-actions").map((i, o) => o.autocallback(this))
        container.find(".mosaic-exit").map((i, o) => o.autocallback(this))

        /**
         * A Minitel.Emulator widget handling the emulation part and stream sent
         * to it.
         * @member {Minitel.Emulator}
         * @private
         */
        this.miscreen = Minitel.startEmulators()[0]

        const events = [
            "value_changed.mitree",
            "redraw.jstree",
            "create_node.jstree",
            "move_node.jstree",
            "delete_node.jstree"
        ]

        // Whenever something occurs on the currently edited page will trigger
        // a fast redraw.
        this.mitree.treeWidget.on(events.join(" "), event => {
            this.onRunFast(event)
        })
    }

    /**
     * When the user clicks on the save button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onSave() {
        // Ask for a page name if it has not been already defined
        if(this.pageName === undefined) {
            const value = window.prompt("Type in the name of this new page", "")
            if(value === null) return
            if(value.trim() === "") {
                window.alert("No page name, saving ignored")
                return
            }

            this.pageName = value

            // Change the history so that a click on the browser refresh button
            // won't loose changes on the page.
            window.history.replaceState(
                history.state,
                this.pageName,
                window.location.href + "?page=" + this.pageName
            )
        }

        const objSave = {
            "thumbnail": this.miscreen.generateThumbnail(320, 250),
            "tree": this.mitree.serialize()
        }

        // Save the page in the local storage
        this.mistorage.save(this.pageName, objSave)
    }

    /**
     * When the user clicks on the import button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onImport() {
        const value = window.prompt("Paste the code in the field", "")
        const obj = JSON.parse(value)
        if(obj !== null) this.mitree.loadTree(obj.tree)
    }

    /**
     * When the user clicks on the export button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onExport() {
        const objSave = {
            "thumbnail": this.miscreen.generateThumbnail(320, 250),
            "tree": this.mitree.serialize()
        }

        window.prompt("Copy the following code", JSON.stringify(objSave))
    }

    /**
     * When the user clicks on the compile button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onCompile() {
        // Retrieves the DOM elements of the links we will change
        const dlLink = document.getElementById("link-download-vdt")
        const vwLink = document.getElementById("link-view-vdt")
        const rlLink = document.getElementById("link-real-vdt")

        // Converts the tree structure of our page to a Videotex stream
        const actions = MiEdit.mieditActions(this.mitree.serialize())
        const bytes = Minitel.actionsToStream(actions, 0, 0).toArray()
        const vdt = String.fromCharCode.apply(null, bytes)

        // Create a textual date so the user will know something has changed
        const time = new Date()
        const timeString = ("0" + time.getHours()).slice(-2)   + ":"
                         + ("0" + time.getMinutes()).slice(-2) + ":"
                         + ("0" + time.getSeconds()).slice(-2)

        // Compress the Videotex stream to Base64 format but modifies it so that
        // the generated can be included in a URL
        const compressed = LZString.compressToBase64(vdt)
            .replace(new RegExp('\\+', 'g'), '.')
            .replace(new RegExp('/', 'g'), '_')
            .replace(new RegExp('=', 'g'), '-')

        // Create the Download VDT link
        dlLink.href = "data:text/plain;charset=ascii,"
                    + encodeURIComponent(vdt)
        dlLink.setAttribute("download", this.pageName + ".vdt")
        dlLink.innerHTML = "Download VDT [" + timeString + "]"

        // Create the View VDT link
        vwLink.href = "minitel-viewer.html"
                    + "?cstream=" + compressed
        vwLink.innerHTML = "View VDT [" + timeString + "]"

        // Create the View VDT link
        rlLink.href = "minitel-real-viewer.html"
                    + "?cstream=" + compressed
        rlLink.innerHTML = "Real view VDT [" + timeString + "]"
    }

    /**
     * When the user clicks on a set speed button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param The user selected speed
     * @private
     */
    onSetSpeed(event, param) {
        this.miscreen.setRefresh(parseInt(param))
    }

    /**
     * When the user clicks on a set color button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param "true" for color, "false" for grayscale.
     * @private
     */
    onSetColor(event, param) {
        this.miscreen.setColor(param === "true")
    }

    /**
     * When the user clicks on a show position button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param "true" for showing, "false" for hiding.
     * @private
     */
    onShowPosition(event, param) {
        this.miscreen.vdu.cursor.setIndicator(param === "true")
    }

    /**
     * When the user clicks on the run slow button (run at the standard speed of
     * the Minitel which is 1200 bps).
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onRunSlow() {
        const actions = MiEdit.mieditActions(this.mitree.serialize())
        this.miscreen.send(Minitel.actionsToStream(actions, 0, 0).toArray())
    }

    /**
     * When the user clicks on the run fast button (run at the maximum speed
     * which gives the impression the rendering is instantaneous).
     * @param {HTMLEvent} event Event that generated the call
     * @private
     */
    onRunFast() {
        const actions = MiEdit.mieditActions(this.mitree.serialize())
        this.miscreen.directSend(
            Minitel.actionsToStream(actions, 0, 0).toArray()
        )
    }

    /**
     * When the user clicks on the edit button of a currently selected mosaic
     * drawing. This then shows the mosaic editor.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onEditGraphics(event, param) {
        // Retrieve the encoded value of the mosaic drawing
        this.inputGraphics = document.getElementById(param)

        // Sends it to the mosaic editor
        this.graphics.reset(
            this.inputGraphics.value,
            document.getElementById("content-graphics-background").value
        )

        // Show the mosaic editor
        this.graphics.root.classList.remove("hidden")
    }

    /**
     * When the user clicks on the import BW image button.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onImportBWImage(event, param) {
        const [fileID, imageID] = param.split('|')
        const fileElement = document.getElementById(fileID)
        const imageElement = document.getElementById(imageID)
        const image = new Image()

        // Get a list of the selected files in a FileList object
        const files = fileElement.files

        if(files.length !== 1) return

        const imageFile = files[0]

        // Only process image files.
        if(!imageFile.type.match('image.*')) return

        const reader = new FileReader()

        let loaded = false

        reader.onload = (event) => {
            image.src = event.target.result
            image.onload = () => {
                if(loaded) return

                loaded = true

                // Inserts the encoded value in the BW input field
                imageElement.value = JSON.stringify(Drawing.bwdrcs(image))
                imageElement.dispatchEvent(new Event("input"))
            }

            if(image.complete) image.onload()
        }

        // Read in the image file as a data URL.
        reader.readAsDataURL(imageFile);
    }

    /**
     * When the user clicks on the save button of the mosaic editor form.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onSaveGraphics() {
        // Converts the mosaic drawing to an encoded string placed in the
        // input field of the mosaic editor form
        this.inputGraphics.value = this.graphics.toString()

        // Signals that the input field has been modified
        this.inputGraphics.dispatchEvent(new Event("input"))

        // Hides the mosaic editor
        this.graphics.root.classList.add("hidden")
    }

    /**
     * When the user clicks on the exit button of the mosaic editor form.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onExitGraphics() {
        // Forgets every change and hides the mosaic editor
        this.graphics.root.classList.add("hidden")
    }

    /**
     * When the user does an action a the DRCS character being edited.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onDRCSAction(event, param) {
        MiEdit.MiEditPage[param]("px")

        // Fire an Event for signalling that something has changed
        const evt = new Event("input", {"bubbles": true, "cancelable": false});
        document.getElementById("px-0-0").dispatchEvent(evt)
    }

    /**
     * When the user does an action a the DRCS character being edited.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onDRCSAdvAction(event, param) {
        MiEdit.MiEditPage[param]("apx")

        // Fire an Event for signalling that something has changed
        const evt = new Event("input", {"bubbles": true, "cancelable": false});
        document.getElementById("apx-0-0").dispatchEvent(evt)
    }
}

MiEdit.MiEditPage.pixID = (base, x, y) => base + "-" + x + "-" + y

MiEdit.MiEditPage.drcsSwap = (base, start, end, fnSwap) => {
    range2(start, end).forEach((x, y) => {
        const [ x2, y2 ] = fnSwap(x, y)
        const chb1 = document.getElementById(
            MiEdit.MiEditPage.pixID(base, x, y)
        )
        const chb2 = document.getElementById(
            MiEdit.MiEditPage.pixID(base, x2, y2)
        )

        const swap = chb1.checked
        chb1.checked = chb2.checked
        chb2.checked = swap
    })
}

MiEdit.MiEditPage["drcs-vertical-symmetry"] = function(base) {
    MiEdit.MiEditPage.drcsSwap(
        base, [0, 0], [8, 5], (x, y) => [x, 9 - y]
    )
}

MiEdit.MiEditPage["drcs-horizontal-symmetry"] = function(base) {
    MiEdit.MiEditPage.drcsSwap(
        base, [0, 0], [4, 10], (x, y) => [7 - x, y]
    )
}

MiEdit.MiEditPage.drcsShift = function(base, start, end, fnSrc, fnDst,
                                       clear, fnClear
) {
    range2(start, end).forEach((x, y) => {
        const [ xSrc, ySrc ] = fnSrc(x, y)
        const [ xDst, yDst ] = fnDst(x, y)
        const src = document.getElementById(
            MiEdit.MiEditPage.pixID(base, xSrc, ySrc)
        )

        const dst = document.getElementById(
            MiEdit.MiEditPage.pixID(base, xDst, yDst)
        )

        dst.checked = src.checked
    })

    range(clear).forEach(x => {
        const [ xDst, yDst ] = fnClear(x)
        const dst = document.getElementById(
            MiEdit.MiEditPage.pixID(base, xDst, yDst)
        )
        dst.checked = false
    })
}

MiEdit.MiEditPage["drcs-shift-up"] = function(base) {
    MiEdit.MiEditPage.drcsShift(
        base,
        [0, 1], [8, 10],
        (x, y) => [x, y], (x, y) => [x, y - 1],
        8, x => [x, 9]
    )
}

MiEdit.MiEditPage["drcs-shift-down"] = function(base) {
    MiEdit.MiEditPage.drcsShift(
        base,
        [0, 9], [8, 0],
        (x, y) => [x, y - 1], (x, y) => [x, y],
        8, x => [x, 0]
    )
}

MiEdit.MiEditPage["drcs-shift-left"] = function(base) {
    MiEdit.MiEditPage.drcsShift(
        base,
        [0, 0], [7, 10],
        (x, y) => [x + 1, y], (x, y) => [x, y],
        10, x => [7, x]
    )
}

MiEdit.MiEditPage["drcs-shift-right"] = function(base) {
    MiEdit.MiEditPage.drcsShift(
        base,
        [7, 0], [0, 10],
        (x, y) => [x - 1, y], (x, y) => [x, y],
        10, x => [0, x]
    )
}

importHTML.install()
          .then(inputNumberButton.install)
          .then(() =>
                new MiEdit.MiEditPage($("#miedit"), queryParameters("page"))
          )
          .catch(reason => console.error(reason))
