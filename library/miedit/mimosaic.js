/**
 * @file mimosaic.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * A mosaic drawing is a drawing made of special characters meant to simulate
 * real graphic with character based only screen. In the case of Videotex and
 * the Minitel, a mosaic character holds 6 pixels (2 per width, 3 per height).
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * @typedef {Object} Point
 * @property {number} x X coordinate
 * @property {number} y Y coordinate
 * @property {number} color foreground color of the point (0 to 7)
 * @property {number} back background color of the point (0 to 7)
 * @property {boolean} separated whether the pixel is disjoint or not
 * @property {boolean} blink whether the pixel is blinking or not
 */

/**
 * @callback previewCallback
 * @param {CanvasRenderingContext2D} ctx Canvas context with which the function
 *                                       can draw
 */

/**
 * MiEdit.MiMosaic is the GUI allowing the user to draw and import/export a mosaic
 * drawing.
 */
MiEdit.MiMosaic = class {
    /**
     * @param {HTMLElement} root DOM element containing all the other elements
     *                           making the GUI of the mosaic drawing editor
     * @param {number} zoom Zoom level to apply, because the user needs to
     *                      click precisely, it is easier if the pixels are
     *                      bigger
     */
    constructor(root, zoom) {
        /**
         * Number of pixels per width in a mosaic character
         * @member {number}
         * @private
         */
        this.pixelsPerWidth = 2

        /**
         * Number of pixels per height in a mosaic character
         * @member {number}
         * @private
         */
        this.pixelsPerHeight = 3

        /**
         * Canvas dimensions in real pixels
         * @member {Object}
         * @property {number} width Width of the canvas in pixels
         * @property {number} height Height of the canvas in pixels
         * @private
         */
        this.canvas = {
            width: Minitel.columns * Minitel.charWidth,
            height: (Minitel.rows - 1) * Minitel.charHeight
        }

        /**
         * Canvas dimensions in mosaic pixels
         * @member {Object}
         * @property {number} width Width of the canvas in mosaic pixels
         * @property {number} height Height of the canvas in mosaic pixels
         * @private
         */
        this.resolution = {
            width: Minitel.columns * this.pixelsPerWidth,
            height: (Minitel.rows - 1) * this.pixelsPerHeight
        }

        /**
         * Zoom level (1, 2, 3...)
         * @member {number}
         * @private
         */
        this.zoom = zoom

        // Default state for drawing tools
        /**
         * Foreground color used for drawing (0 to 7)
         * @member {number}
         */
        this.color = 7

        /**
         * Background color used for drawing (0 to 7)
         * @member {number}
         */
        this.back = 0

        /**
         * Whether the next drawn pixels will be disjoint or not
         * @member {boolean}
         */
        this.separated = false

        /**
         * Whether the next drawn pixels will be blinking or not
         * @member {boolean}
         */
        this.blink = false

        /**
         * Point size used when drawing (1 to 3)
         * @member {number}
         */
        this.pointSize = 1

        /**
         * The MosaicMemory used to hold the mosaic drawing in memory
         * @member {MosaicMemory}
         * @private
         */
        this.memory = new Minitel.MosaicMemory(
            this.resolution.width,
            this.resolution.height
        )

        /**
         * Color used to draw the primary grid in #RRGGBB format
         * @member {string}
         */
        this.primaryGrid = "#D0D000"

        /**
         * Color used to draw the secondary grid in #RRGGBB format
         * @member {string}
         */
        this.secondaryGrid = "#707000"

        /**
         * Color used to draw the border on cells in error in #RRGGBB format
         * @member {string}
         */
        this.errorColor = "#FFFFFF"

        /**
         * Current selected tool
         * @member {Object}
         * @private
         */
        this.tool = { name: "pencil" }

        /**
         * Clipboard structure
         * @member {Object}
         * @property {number[]} bitmap
         * @property {number} width Width of the drawing in the clipboard
         * @property {number} height Height of the drawing in the clipboard
         * @private
         */
        this.clipboard = {
            bitmap: [],
            width: 0,
            height: 0
        }

        /**
         * Set of points to check for proximity errors
         * @member {Set}
         * @private
         */
        this.pointsToCheck = new Set()

        this.clearUndo()

        /**
         * The DOM element containing all the DOM elements which are needed for
         * the mosaic drawing editor.
         * @member {HTMLElement}
         * @private
         */
        this.root = root

        this.configureDOMElements()
        this.setCursor("", this.tool.name)

        this.drawGrid()

        new SimpleRibbon(document.getElementById("mosaic-ribbon"))

        this.drawing.addEventListener("mouseup", e => this.onMouseUp(e))
        this.drawing.addEventListener("mousedown", e => this.onMouseDown(e))
        this.drawing.addEventListener("mousemove", e => this.onMouseMove(e))
        this.drawing.addEventListener("mouseout", e => this.onMouseOut(e))

        this.root.autocallback(this)
    }

    /**
     * Initializes the undo stack
     * @private
     */
    clearUndo() {
        /**
         * Undo structure holding every action the user has done on the drawing.
         * @member {Object}
         * @property {Point[][]} stack The undo stack
         * @property {Point[]} current Current modifications in an undo
         *                             transaction
         * @property {boolean} active Whether an undo transaction is active
         * @property {number} index Current index in the undo stack, it allows
         *                          to redo steps
         * @private
         */
        this.undo = {
            stack: [],
            current: [],
            active: false,
            index: -1
        }
    }

    /**
     * Sets the cursor icon
     * @param {string} oldTool The current tool identifier
     * @param {string} newTool The next tool identifier
     */
    setCursor(oldTool, newTool) {
        this.drawing.classList.remove("cursor-" + oldTool)
        this.drawing.classList.add("cursor-" + newTool)
    }

    /**
     * Reset the mosaic drawing editor with an encoded string generated by the
     * toString method.
     * @param {string} string Encoded string of the mosaic drawing
     * @param {string} background URL of a background image helping the user to
     *                            draw its own image
     */
    reset(string, background) {
        this.clearUndo()

        this.overlay.style.backgroundImage = "url(" + background + ")"

        this.memory.reset(string)

        this.drawPoints()
    }

    /**
     * Converts the current mosaic drawing to an encoded string which can then
     * be used by the reset method.
     * @return {string} The encoded string of the mosaic drawing
     */
    toString() {
        return this.memory.toString()
    }

    /**
     * Starts an undo transaction
     * @private
     */
    startUndo() {
        this.undo.current = []
        this.undo.active = true
    }

    /**
     * Ends an undo transaction.
     * @private
     */
    stopUndo() {
        if(this.undo.active) {
            this.undo.active = false
            this.pushUndo(this.undo.current)
            this.undo.current = []
        }
    }

    /**
     * Adds an undo step to the undo stack.
     * @param {Point[]} points Points to add to the undo stack
     * @private
     */
    pushUndo(points) {
        // Clears the redo steps after the current index
        if(this.undo.index > 0) {
            const remaining = this.undo.stack.length - this.undo.index - 1

            for(let i = 0; i < remaining; i++) {
                this.undo.stack.pop()
            }
        }

        // Push the points on the undo stack
        this.undo.stack.push(points)

        // Force the undo stack to have at most 100 undo steps
        if(this.undo.stack.length > 100) this.undo.stack.shift()

        // Update the index
        this.undo.index = this.undo.stack.length - 1
    }

    /**
     * Do an undo.
     */
    doUndo() {
        // There must be something to undo
        if(this.undo.stack[this.undo.index]) {
            // Draw the points of the undo step
            this.undo.stack[this.undo.index].forEach(point => {
                this.memory.setPoint(
                    point.x,
                    point.y,
                    point.color,
                    point.back,
                    point.separated,
                    point.blink,
                    1
                )
            })

            this.undo.index--
        }

        this.drawPoints()
    }

    /**
     * Do a redo.
     */
    doRedo() {
        // There must be something to redo
        if(this.undo.stack[this.undo.index + 1]) {
            this.undo.index++

            // Draw the points of the redo step
            this.undo.stack[this.undo.index].forEach(point => {
                this.memory.setPoint(
                    point.x,
                    point.y,
                    point.newColor,
                    point.newBack,
                    point.newSeparated,
                    point.newBlink,
                    1
                )
            })
        }

        this.drawPoints()
    }

    /**
     * Change the current tool used for drawing
     * @param {string} newToolName New tool identifier
     * @param {} fromElement
     */
    changeTool(newToolName, fromElement) {
        this.setCursor(this.tool.name, newToolName)
        this.tool = { name: newToolName }
        this.setCurrentIcon("mosaic-current-tool", fromElement)
    }

    /**
     * When the user clicks on the import Ceefax button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onImportEditTf(event) {
        this.memory = Minitel.ceefaxToStream(event.target[0].value)
        this.drawPoints()
    }

    /**
     * Retrieve the icon URL of a button from our ribbon
     * @param {HTMLElement} domElement the DOM element to analyze
     * @return {string} the URL of the icon of the button
     */
    getButtonIcon(domElement) {
        const icons = domElement.getElementsByTagName("img")
        return icons.length > 0 ? icons[0].src : ""
    }

    /**
     * Set current icon
     * @param {string} id The id of the DOM element to set icon to
     * @param {HTMLElement} fromElement the DOM element to get the icon URL from
     */
    setCurrentIcon(id, fromElement) {
        if(fromElement === undefined) {
            return
        }

        document.getElementById(id).src = this.getButtonIcon(fromElement)
    }

    /**
     * When the user clicks on a point size button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onPointSize(event, param) {
        this.pointSize = parseInt(param)
        this.setCurrentIcon("mosaic-current-size", event.target)
    }

    /**
     * When the user clicks on a tool button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onToolChange(event, param) {
        this.changeTool(param, event.target)
    }

    /**
     * When the user clicks on the erase button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onErase(event) {
        this.color = -1
        this.setCurrentIcon("mosaic-current-foreground", event.target)
    }

    /**
     * When the user clicks on a foreground color button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onForegroundChange(event, param) {
        this.color = parseInt(param)
        this.setCurrentIcon("mosaic-current-foreground", event.target)
    }

    /**
     * When the user clicks on a background color button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onBackgroundChange(event, param) {
        this.back = parseInt(param)
        this.setCurrentIcon("mosaic-current-background", event.target)
    }

    /**
     * When the user clicks on a separated button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onSeparated(event, param) {
        this.separated = param === "on"
        this.setCurrentIcon("mosaic-current-separated", event.target)
    }

    /**
     * When the user clicks on a blinking button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onBlink(event, param) {
        this.blink = param === "on"
        this.setCurrentIcon("mosaic-current-blink", event.target)
    }

    /**
     * When the user clicks on the text button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onText(event) {
        // Show the text editor form
        document.getElementById("graphics-text-form").classList.add("visible")

        this.setCurrentIcon("mosaic-current-tool", event.target)
    }

    /**
     * When the user clicks on the Paste the text button of the text editor form
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onSetText(event) {
        document.getElementById("graphics-text-form")
                .classList.remove("visible")

        const form = event.target

        // Generate the pixels composing the text given the parameters from
        // the text editor form
        const drawing = Drawing.text(
            form["text-value"].value,
            form["text-font"].value,
            form["text-style"].value,
            parseInt(form["text-size"].value),
            this.color,
            this.back,
            this.separated,
            this.blink,
            form["text-compress"].checked
        )

        // Copy the generated image in the clipboard
        this.clipboard = new Minitel.MosaicZone(
            drawing.width, drawing.height,
            drawing.bitmap.map(Minitel.MosaicMemory.pixelToValue)
        )

        // Switch to the paste tool
        this.changeTool("paste")
    }

    /**
     * Draws a preview on the preview layer given a user drawing function.
     *
     * @param {previewCallback} func Function called which will do the actual
     *                               drawing of the preview. The function does
     *                               not have to take care of context opening
     *                               or closing nor of stroking.
     * @private
     */
    previewDo(func) {
        const ctx = this.preview.getContext("2d")
        ctx.clearRect(0, 0, this.preview.width, this.preview.height)
        if(func) {
            ctx.beginPath()
            func(ctx)
            ctx.stroke()
            ctx.closePath()
        }
    }

    /**
     * Facility method for handling actions depending on a specific tool.
     * It converts the click screen position to a coordinates in the mosaic
     * drawing system. Handler methods must begin with "onTool" followed by
     * the identifier of the tool.
     *
     * @param {HTMLEvent} event The event that generated the call
     * @param {string} actionType The action to execute
     * @private
     */
    callHandler(event, actionType) {
        const point = this.translate(event)

        const handlerName = "onTool"
                          + this.tool.name[0].toUpperCase()
                          + this.tool.name.substr(1)

        if(this[handlerName]) this[handlerName](actionType, point, event)
    }

    /**
     * When the user release a mouse button
     * @param {HTMLEvent} event Event that generated the call
     */
    onMouseUp(event) {
        this.callHandler(event, "up")
    }

    /**
     * When the user press a mouse button
     * @param {HTMLEvent} event Event that generated the call
     */
    onMouseDown(event) {
        this.callHandler(event, "down")
    }

    /**
     * When the user moves the mouse on the mosaic drawing editor
     * @param {HTMLEvent} event Event that generated the call
     */
    onMouseMove(event) {
        this.callHandler(event, "move")
    }

    /**
     * When the user moves the mouse outside the mosaic drawing editor
     * @param {HTMLEvent} event Event that generated the call
     */
    onMouseOut(event) {
        this.callHandler(event, "out")
    }

    /**
     * When the user clicks on the undo button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onUndo() {
        this.doUndo()
    }

    /**
     * When the user clicks on redo button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onRedo() {
        this.doRedo()
    }

    /**
     * Handles mouse actions when using the pencil tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolPencil(actionType, point, event) {
        if(actionType === "down") {
            this.startUndo()
            this.tool.isDrawing = true

            const origin = event.shiftKey && this.tool.last && this.tool.last.x
                         ? this.tool.last
                         : this.tool.previous

            this.drawLine(origin, point)

            this.tool.last = { x: point.x, y: point.y }
        } else if(actionType === "move" && this.tool.isDrawing) {
            this.drawLine(this.tool.previous, point)
            this.tool.last = { x: point.x, y: point.y }
        } else if(actionType === "up" || actionType === "out") {
            this.stopUndo()
            this.tool.isDrawing = false
        }

        if(actionType === "move") {
            this.tool.previous = { x: point.x, y: point.y }
        }
    }

    /**
     * Handles mouse actions when using the fill tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolFill(actionType, point) {
        if(actionType === "down") {
            this.startUndo()
            this.fillArea(point, this.color, this.separated)
            this.stopUndo()
        }
    }

    /**
     * Handles mouse actions when using the circle tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolCircle(actionType, point, event, filled) {
        if(actionType === "down") {
            this.tool.isDrawing = true
            this.tool.center = point
        } else if(actionType === "move" && this.tool.isDrawing) {
            const radius = Math.sqrt(
                Math.pow(point.realX - this.tool.center.realX, 2) +
                Math.pow(point.realY - this.tool.center.realY, 2)
            )

            this.previewDo(ctx => {
                ctx.strokeStyle = Minitel.colors[this.color]
                ctx.arc(
                    this.tool.center.realX, this.tool.center.realY,
                    radius, 0, 2 * Math.PI,
                    false
                )
                if(filled) {
                    ctx.fillStyle = Minitel.colors[this.color]
                    ctx.fill()
                } else {
                    ctx.stroke()
                }
            })
        } else if(this.tool.isDrawing
                  && (actionType === "up" || actionType === "out")
            ) {
            this.tool.isDrawing = false

            const radius = Math.floor(Math.sqrt(
                Math.pow(point.realX - this.tool.center.realX, 2) +
                Math.pow(point.realY - this.tool.center.realY, 2)
            ) / this.zoom)

            this.previewDo()

            this.startUndo()
            this.drawCircle(this.tool.center, radius, filled)
            this.stopUndo()
        }
    }

    /**
     * Handles mouse actions when using the filled circle tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolFilledCircle(actionType, point, event) {
        this.onToolCircle(actionType, point, event, true)
    }

    /**
     * Handles mouse actions when using the curve tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolCurve(actionType, point) {
        if(actionType === "down" && this.tool.start === undefined) {
            this.tool.start = point
        } else if(actionType === "move" && this.tool.start !== undefined) {
            this.previewDo(ctx => {
                ctx.strokeStyle = Minitel.colors[this.color]

                if(this.endPoint === undefined) {
                    ctx.moveTo(this.tool.start.realX, this.tool.start.realY)
                    ctx.quadraticCurveTo(
                        this.tool.start.realX, this.tool.start.realY,
                        point.realX, point.realY
                    )
                } else {
                    ctx.moveTo(this.tool.start.realX, this.tool.start.realY)
                    ctx.quadraticCurveTo(
                        point.realX, point.realY,
                        this.endPoint.realX, this.endPoint.realY
                    )
                }

                ctx.stroke()
            })
        } else if(actionType === "up"
                  && this.tool.start !== undefined
                  && this.endPoint === undefined
            ) {
            this.endPoint = point
        } else if(actionType === "down" && this.endPoint !== undefined) {
            this.previewDo()

            this.startUndo()
            this.drawCurve(this.tool.start, this.endPoint, point)
            this.stopUndo()

            this.tool.start = undefined
            this.endPoint = undefined
        }
    }

    /**
     * Handles mouse actions when using the copy tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolCopy(actionType, point) {
        if(actionType === "down") {
            this.tool.isDrawing = true
            this.tool.start = point
        } else if(actionType === "move" && this.tool.isDrawing) {
            const fromCoords = this.convertCoordinates(
                this.tool.start.x, this.tool.start.y, 0, false
            )

            const toCoords = this.convertCoordinates(point.x, point.y, 0, false)

            this.previewDo(ctx => {
                ctx.strokeStyle = "#FFFFFF"
                ctx.rect(
                    fromCoords.x, fromCoords.y,
                    toCoords.x - fromCoords.x, toCoords.y - fromCoords.y
                )
                ctx.stroke()
            })
        } else if(actionType === "up") {
            this.tool.isDrawing = false
            this.previewDo()
            this.copyRect(this.tool.start, point)
        }
    }

    /**
     * Handles mouse actions when using the paste tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolPaste(actionType, point) {
        if(actionType === "down") {
            point.x = Math.floor(point.x - this.clipboard.width / 2)
            point.y = Math.floor(point.y - this.clipboard.height / 2)

            this.startUndo()
            this.pasteRect(point)
            this.stopUndo()
        } else if(actionType === "move") {
            const fromCoords = this.convertCoordinates(
                Math.floor(point.x - this.clipboard.width / 2),
                Math.floor(point.y - this.clipboard.height / 2),
                0, false
            )

            const toCoords = this.convertCoordinates(
                Math.floor(point.x + this.clipboard.width / 2),
                Math.floor(point.y + this.clipboard.height / 2),
                0, false
            )

            this.previewDo(ctx => {
                ctx.strokeStyle = "#FFFFFF"
                ctx.rect(
                    fromCoords.x, fromCoords.y,
                    toCoords.x - fromCoords.x, toCoords.y - fromCoords.y
                )
                ctx.stroke()
            })
        } else if(actionType === "out") {
            this.previewDo()
        }
    }

    /**
     * Handles mouse actions when using the rectangle tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolRectangle(actionType, point, event, filled) {
        if(actionType === "down") {
            this.tool.isDrawing = true
            this.tool.start = point
        } else if(actionType === "move" && this.tool.isDrawing) {
            this.previewDo(ctx => {
                ctx.fillStyle = Minitel.colors[this.color]
                ctx.strokeStyle = Minitel.colors[this.color]
                ctx[filled ? "fillRect" : "rect"](
                    this.tool.start.realX,
                    this.tool.start.realY,
                    point.realX - this.tool.start.realX,
                    point.realY - this.tool.start.realY
                )
                ctx.stroke()
            })
        } else if(actionType === "up") {
            this.tool.isDrawing = false
            this.previewDo()
            this.startUndo()
            this.drawRect(this.tool.start, point, filled)
            this.stopUndo()
        }
    }

    /**
     * Handles mouse actions when using the filled rectangle tool
     * @param {string} actionType Type of mouse action
     * @param {Point} point Coordinates of the point where the action occured
     * @param {HTMLEvent} event The event that initiated the call
     */
    onToolFilledRectangle(actionType, point, event) {
        this.onToolRectangle(actionType, point, event, true)
    }

    /**
     * When the user clicks on a move button
     * @param {HTMLEvent} event Event that generated the call
     * @param {mixed} param Parameters of the event
     */
    onMoveGraphics(event, param) {
        if(param === "center") return

        this.startUndo()

        if(param.x < 0) {
            this.memory.shiftLeft(Math.abs(param.x))
        } else if(param.x > 0) {
            this.memory.shiftRight(param.x)
        }

        if(param.y < 0) {
            this.memory.shiftUp(Math.abs(param.y))
        } else if(param.y > 0) {
            this.memory.shiftDown(param.y)
        }

        this.drawPoints()

        this.stopUndo()
    }

    /**
     * Translates coordinates given with a mouse event to coordinates in the
     * mosaic drawing or relative to the mosaic drawing editor
     * @param {HTMLEvent} event Event that generated the call
     * @return {Object} An object with x, y, realX, realY members
     */
    translate(event) {
        const rect = this.drawing.getBoundingClientRect()
        const charWidth = Minitel.charWidth * this.zoom / this.pixelsPerWidth
        const charHeight = Minitel.charHeight * this.zoom / this.pixelsPerHeight
        const col = Math.floor((event.clientX - rect.left) / charWidth)
        const row = Math.floor((event.clientY - rect.top) / charHeight)
        const realX = Math.floor((event.clientX - rect.left) / this.zoom)
        const realY = Math.floor((event.clientY - rect.top) / this.zoom)

        return {
            "x": col,
            "y": row,
            "realX": realX,
            "realY": realY
        }
    }

    /**
     * Configure the layers of the mosaic drawing editor
     * @private
     */
    configureDOMElements() {
        /**
         * DOM element of the drawing layer
         * @member {HTMLElement}
         * @private
         */
        this.drawing = this.root.getElementsByClassName("mosaic-drawing")[0]

        /**
         * DOM element of the preview layer
         * @member {HTMLElement}
         * @private
         */
        this.preview = this.root.getElementsByClassName("mosaic-preview")[0]

        /**
         * DOM element of the grid layer
         * @member {HTMLElement}
         * @private
         */
        this.grid = this.root.getElementsByClassName("mosaic-grid")[0]

        /**
         * DOM element of the overlay layer
         * @member {HTMLElement}
         * @private
         */
        this.overlay = this.root.getElementsByClassName("mosaic-overlay")[0]

        /**
         * DOM element of the error layer
         * @member {HTMLElement}
         * @private
         */
        this.error = this.root.getElementsByClassName("mosaic-error")[0]

        const canvases = [
            this.drawing,
            this.preview,
            this.grid,
            this.error
        ]

        // Apply the zoom to the layers
        for(let obj of canvases) {
            obj.width  = this.canvas.width * this.zoom
            obj.height = this.canvas.height * this.zoom
            const ctx = obj.getContext("2d")
            ctx.scale(this.zoom, this.zoom)
        }

        // Configure preview layer
        const ctx = this.preview.getContext("2d")
        ctx.lineWidth = 2
    }

    /**
     * Converts coordinates in the mosaic system to coordinates in screen
     * coordinates.
     * @param {number} x X coordinate to convert
     * @param {number} y Y coordinate to convert
     * @param {number} color Color to convert (0 to 7)
     * @param {boolean} separated Whether the pixel is disjoint or not
     * @return {Object} An object with x, y, width and height properties
     */
    convertCoordinates(x, y, color, separated) {
        const coords = {}

        coords.x = x * (Minitel.charWidth / this.pixelsPerWidth)
        coords.width = Minitel.charWidth / this.pixelsPerWidth
        coords.y = Math.floor(y / this.pixelsPerHeight) * Minitel.charHeight

        const vPosition = y % this.pixelsPerHeight
        if(vPosition === 0) {
            coords.height = 3
        } else if(vPosition === 1) {
            coords.y += 3
            coords.height = 4
        } else if(vPosition === 2) {
            coords.y += 7
            coords.height = 3
        }

        // Take separated attribute and color into account
        if(separated && color >= 0) {
            coords.fullWidth = coords.width
            coords.fullHeight = coords.height
            coords.width--
            coords.height--
            coords.x++
        }

        return coords
    }

    /**
     * Draw points that has been changed since the previous call to this method
     */
    drawPoints() {
        this.memory.getChangedPoints().forEach(point => {
            this.pointsToCheck.add(
                point.x / this.pixelsPerWidth & 0x3ff +
                (point.y / this.pixelsPerHeight << 10)
            )
            this.drawPoint(point)
        })
        this.drawError()
    }

    /**
     * Draw a point
     * @param {ChangedPoint} The point to draw
     * @private
     */
    drawPoint(point) {
        const ctx = this.drawing.getContext("2d")

        if(this.undo.active) {
            // We are currently inside an undo transaction, add this point to it
            this.undo.current.unshift({
                x: point.x,
                y: point.y,
                color: point.oldColor,
                separated: point.oldSeparated,
                newColor: point.color,
                newSeparated: point.separated
            })
        }

        const coords = this.convertCoordinates(
            point.x, point.y, point.color, point.separated
        )

        if(point.color < 0) {
            // Make the pixel transparent
            ctx.clearRect(coords.x, coords.y, coords.width, coords.height)
            return
        }

        if(point.separated) {
            // Draw the background for a separated mosaic pixel
            ctx.fillStyle = Minitel.colors[point.back]
            ctx.fillRect(
                coords.x - 1, coords.y, coords.fullWidth, coords.fullHeight
            )
        }

        ctx.fillStyle = Minitel.colors[point.color]
        ctx.fillRect(coords.x, coords.y, coords.width, coords.height)

        if(point.blink) {
            // Cross the pixel to indicate it is blinking
            ctx.beginPath()
            ctx.lineWidth = 1 / this.zoom
            ctx.strokeStyle = Minitel.colors[Minitel.contrasts[point.color]]
            ctx.moveTo(coords.x, coords.y)
            ctx.lineTo(coords.x + coords.width, coords.y + coords.height)
            ctx.moveTo(coords.x + coords.width, coords.y)
            ctx.lineTo(coords.x, coords.y + coords.height)
            ctx.stroke()
            ctx.closePath()
        }
    }

    /**
     * Copy an area into the clipboard
     * @param {Coordinates} start Coordinates of the starting point
     * @param {Coordinates} end Coordinates of ending point
     */
    copyRect(start, end) {
        this.clipboard = this.memory.getRect(start, end)
    }

    /**
     * Paste an area from the clipboard
     * @param {Coordinates} destination Coordinates of the upper left corner
     */
    pasteRect(destination) {
        this.memory.putRect(this.clipboard, destination)
        this.drawPoints()
    }

    /**
     * Draw a line with the current foreground color
     * @param {Coordinates} first Coordinates of the starting point
     * @param {Coordinates} last Coordinates of the ending point
     */
    drawLine(first, last) {
        Drawing.line(first, last).forEach(point => {
            this.memory.setPoint(
                point.x,
                point.y,
                this.color,
                this.back,
                this.separated,
                this.blink,
                this.pointSize
            )
        })

        this.drawPoints()
    }

    /**
     * Draw a circle with the current foreground color.
     * @param {Coordinates} center Coordinates of the circle center
     * @param {number} radius Circle radius in mosaic pixels
     * @param {boolean} filled Whether the circle is filled or not
     */
    drawCircle(center, radius, filled) {
        const draw = filled ? Drawing.filledCircle : Drawing.circle

        // Minitel mosaic pixels are not square...
        draw(center, radius, 1.25).map(point => {
            this.memory.setPoint(
                point.x,
                point.y,
                this.color,
                this.back,
                this.separated,
                this.blink,
                filled ? 1 : this.pointSize
            )
        })

        this.drawPoints()
    }

    /**
     * Draw a rectangle with the current foreground color.
     * @param {Coordinates} start Coordinates of the starting point
     * @param {Coordinates} end Coordinates of ending point
     * @param {boolean} filled Whether the rectangle is filled or not
     */
    drawRect(start, end, filled) {
        const draw = filled ? Drawing.filledRectangle : Drawing.rectangle

        draw(start, end).forEach(point => {
            this.memory.setPoint(
                point.x,
                point.y,
                this.color,
                this.back,
                this.separated,
                this.blink,
                filled ? 1 : this.pointSize
            )
        })

        this.drawPoints()
    }

    /**
     * Draw a Bezier curve, the simplest kind with just one control point, with
     * the current foreground color.
     * @param {Coordinates} start Coordinates of the starting point
     * @param {Coordinates} end Coordinates of ending point
     * @param {Coordinates} control Coordinates of the control point
     */
    drawCurve(start, end, control) {
        Drawing.quadBezierCurve(start, end, control).forEach(point => {
            this.memory.setPoint(
                point.x,
                point.y,
                this.color,
                this.back,
                this.separated,
                this.blink,
                this.pointSize
            )
        })

        this.drawPoints()
    }

    /**
     * Flood fill an area given a starting point with the current foreground
     * color.
     * @param {Coordinates} start Coordinates of the starting point
     */
    fillArea(start) {
        this.memory.getArea(start.x, start.y).forEach(point => {
            this.memory.setPoint(
                point.x,
                point.y,
                this.color,
                this.back,
                this.separated,
                this.blink
            )
        })

        this.drawPoints()
    }

    /**
     * Draw the error layer
     */
    drawError() {
        const ctx = this.error.getContext("2d")

        // Empty the error layer
        ctx.clearRect(0, 0, this.error.width, this.error.height)

        ctx.lineWidth = 1
        ctx.strokeStyle = this.errorColor

        this.pointsToCheck.forEach(value => {
            const x = (value & 0x3ff) * this.pixelsPerWidth
            const y = (value >> 10) * this.pixelsPerHeight

            const valid = MiEdit.MiMosaic.validCombination(
                this.memory.getColor(x, y),
                this.memory.getColor(x + 1, y),
                this.memory.getColor(x, y + 1),
                this.memory.getColor(x + 1, y + 1),
                this.memory.getColor(x, y + 2),
                this.memory.getColor(x + 1, y + 2)
            )

            if(valid) {
                this.pointsToCheck.delete(value)
                return
            }

            ctx.beginPath()

            const coords = this.convertCoordinates(x, y, 0, false)
            ctx.rect(
                coords.x, coords.y,
                Minitel.charWidth, Minitel.charHeight
            )

            ctx.stroke()
            ctx.closePath()
        })
    }

    /**
     * Draw the grid layer.
     */
    drawGrid() {
        const ctx = this.grid.getContext("2d")
        const lineWidth = 1 / this.zoom

        // Secondary grid
        ctx.beginPath()

        ctx.fillStyle = this.secondaryGrid
        range(0, this.canvas.width, Minitel.charWidth).forEach(x => {
            ctx.fillRect(x + 4, 0, lineWidth, this.canvas.height)
        })

        range(0, this.canvas.height, Minitel.charHeight).forEach(y => {
            ctx.fillRect(0, y + 3, this.canvas.width, lineWidth)
            ctx.fillRect(0, y + 7, this.canvas.width, lineWidth)
        })

        ctx.stroke()
        ctx.closePath()

        // Primary grid
        ctx.beginPath()
        ctx.fillStyle = this.primaryGrid
        range(0, this.canvas.width, Minitel.charWidth).forEach(x => {
            ctx.fillRect(x, 0, lineWidth, this.canvas.height)
        })

        range(0, this.canvas.height, Minitel.charHeight).forEach(y => {
            ctx.fillRect(0, y, this.canvas.width, lineWidth)
        })

        ctx.stroke()
        ctx.closePath()
    }
}

/**
 * A few prime numbers used for detecting invalid combinations
 */
MiEdit.MiMosaic.primes = [3, 5, 7, 11, 13, 17, 19, 23, 29]

/**
 * List of all valid combinations.
 *
 * The algorithm associates a color with a prime number. A combination is
 * represented by a number resulting from the multiplication of six colors or
 * six prime numbers.
 *
 * Since prime numbers are used, each valid combination will generate a number
 * that no other distribution can generate.
 *
 * A Set is used to store the combination, therefore it wont’t store duplicate
 * numbers caused by permutation of colors (for example, blue on red will
 * generate the same value than red on blue).
 */
MiEdit.MiMosaic.validCombinations = (function () {
    const valids = new Set()

    // Generate every possible colors couple (81 couples)
    range2([-1, -1], [8, 8], [1, 1]).forEach((color1, color2) => {
        // For every colors couple, there are only 6 distributions possible:
        // 0 color1 + 6 color2, 1 color1 + 5 color2, etc.
        range(6).forEach(i => {
            valids.add(
                Math.pow(MiEdit.MiMosaic.primes[color1 + 1], i) *
                Math.pow(MiEdit.MiMosaic.primes[color2 + 1], 6 - i)
            )
        })
    })

    return valids
})()

/**
 * Tells if a combination of colors is valid for a mosaic character
 * @return {boolean} true if the combination is valid, false otherwise
 */
MiEdit.MiMosaic.validCombination = function(a, b, c, d, e, f) {
    return MiEdit.MiMosaic.validCombinations.has(
        MiEdit.MiMosaic.primes[a + 1] *
        MiEdit.MiMosaic.primes[b + 1] *
        MiEdit.MiMosaic.primes[c + 1] *
        MiEdit.MiMosaic.primes[d + 1] *
        MiEdit.MiMosaic.primes[e + 1] *
        MiEdit.MiMosaic.primes[f + 1]
    )
}
