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
 * A Minitel Page Editor composed of a view (Videotex emulation), a ribbon and
 * a tree holding the page structure.
 */
class MiEditPage {
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
        this.mistorage = new MiStorage("page")

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
         * @member {MinitelMosaic}
         * @private
         */
        this.graphics = new MinitelMosaic(mosaicRoot, 4)

        const page = this.mistorage.load(pageName)

        /**
         * The tree widget holding our page structure
         * @member {MiTree}
         * @private
         */
        this.mitree = new MiTree(
            container.find(".mitree-container"),
            this.ribbon,
            page !== null && page.tree ? page.tree : page
        )

        // Automatically attach events to handlers of this class
        this.ribbon.root.autocallback(this)
        container.find(".content-graphics")[0].autocallback(this)
        container.find(".drcs-black-white")[0].autocallback(this)
        container.find(".drcs-actions")[0].autocallback(this)
        container.find(".mosaic-exit")[0].autocallback(this)

        const canvas = container.find("#minitel-screen")[0]

        /**
         * A MinitelScreen widget handling the emulation part and stream sent
         * to it.
         * @member {MinitelScreen}
         * @private
         */
        this.miscreen = new MinitelScreen(canvas, true)

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
    onSave(event, param) {
        // Ask for a page name if it has not been already defined
        if(this.pageName === undefined) {
            const value = window.prompt("Type in the name of this new page", "")
            if(value === null) return
            if(value.trim() === "") {
                alert("No page name, saving ignored")
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
    onImport(event, param) {
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
    onExport(event, param) {
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
    onCompile(event, param) {
        // Retrieves the DOM elements of the links we will change
        const dlLink = document.getElementById("link-download-vdt")
        const vwLink = document.getElementById("link-view-vdt")
        const rlLink = document.getElementById("link-real-vdt")

        // Converts the tree structure of our page to a Videotex stream
        const actions = mieditActions(this.mitree.serialize())
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
     * When the user clicks on the run slow button (run at the standard speed of
     * the Minitel which is 1200 bps).
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onRunSlow(event, param) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.send(Minitel.actionsToStream(actions, 0, 0).toArray())
    }

    /**
     * When the user clicks on the run fast button (run at the maximum speed
     * which gives the impression the rendering is instantaneous).
     * @param {HTMLEvent} event Event that generated the call
     * @private
     */
    onRunFast(event) {
        const actions = mieditActions(this.mitree.serialize())
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
        const image = new Image()

        let loaded = false

        // Since the image loading can take some time, the image conversion
        // is held asynchronously.
        function loadHandler() {
            if(loaded) { return }

            loaded = true

            // Converts the image to DRCS characters
            const data = Drawing.bwdrcs(image)

            // Inserts the encoded value in the BW input field
            document.getElementById(param).value = JSON.stringify(data)
        }

        // Asks for the URL of the image to import and convert
        const url = window.prompt("Input the URL of the image to import", "")

        if(url) {
            image.src = url
            image.onload = loadHandler
            if(image.complete) loadHandler()
        }
    }

    /**
     * When the user clicks on the save button of the mosaic editor form.
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     * @private
     */
    onSaveGraphics(event, param) {
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
    onExitGraphics(event, param) {
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
        if(param === "drcs-vertical-symmetry") {
            range2([0, 0], [8, 5]).forEach((x, y) => {
                const chb1 = document.getElementById("px-" + x + "-" + y)
                const chb2 = document.getElementById("px-" + x + "-" + (9 - y))

                const swap = chb1.checked
                chb1.checked = chb2.checked
                chb2.checked = swap
            })

            return
        }

        if(param === "drcs-horizontal-symmetry") {
            range2([0, 0], [4, 10]).forEach((x, y) => {
                const chb1 = document.getElementById("px-" + x + "-" + y)
                const chb2 = document.getElementById("px-" + (7 - x) + "-" + y)

                const swap = chb1.checked
                chb1.checked = chb2.checked
                chb2.checked = swap
            })

            return
        }

        if(param === "drcs-shift-up") {
            range2([0, 1], [8, 10]).forEach((x, y) => {
                const src = document.getElementById("px-" + x + "-" + y)
                const dst = document.getElementById("px-" + x + "-" + (y - 1))

                dst.checked = src.checked
            })

            range(8).forEach(x => {
                const dst = document.getElementById("px-" + x + "-9")
                dst.checked = false
            })

            return
        }

        if(param === "drcs-shift-down") {
            range2([0, 9], [8, 0]).forEach((x, y) => {
                const src = document.getElementById("px-" + x + "-" + (y - 1))
                const dst = document.getElementById("px-" + x + "-" + y)

                dst.checked = src.checked
            })

            range(8).forEach(x => {
                const dst = document.getElementById("px-" + x + "-0")
                dst.checked = false
            })

            return
        }

        if(param === "drcs-shift-left") {
            range2([0, 0], [7, 10]).forEach((x, y) => {
                const src = document.getElementById("px-" + (x + 1) + "-" + y)
                const dst = document.getElementById("px-" + x + "-" + y)

                dst.checked = src.checked
            })

            range(10).forEach(y => {
                const dst = document.getElementById("px-7-" + y)
                dst.checked = false
            })

            return
        }

        if(param === "drcs-shift-right") {
            range2([7, 0], [0, 10]).forEach((x, y) => {
                const src = document.getElementById("px-" + (x - 1) + "-" + y)
                const dst = document.getElementById("px-" + x + "-" + y)

                dst.checked = src.checked
            })

            range(10).forEach(y => {
                const dst = document.getElementById("px-0-" + y)
                dst.checked = false
            })

            return
        }
    }
}

importHTML.install()
          .then(inputNumberButton.install)
          .then(() => { new MiEditPage($("#miedit"), queryParameters("page")) })

