/**
 * @file MinitelMosaic
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @class MinitelMosaic
 */
class MinitelMosaic {
    /**
     * @param {HTMLCanvasElement} root
     * @param {number} zoom
     */
    constructor(root, zoom) {
        this.pixelsPerWidth = 2
        this.pixelsPerHeight = 3

        this.canvas = {
            width: Minitel.columns * Minitel.charWidth,
            height: (Minitel.rows - 1) * Minitel.charHeight
        }

        this.resolution = {
            width: Minitel.columns * this.pixelsPerWidth,
            height: (Minitel.rows - 1) * this.pixelsPerHeight
        }

        this.zoom = zoom

        // Default state for drawing tools
        this.color = 7
        this.back = 0
        this.separated = false
        this.blink = false
        this.pointSize = 1

        this.memory = new MosaicMemory(
            this.resolution.width,
            this.resolution.height
        )

        this.primaryGrid = "#D0D000"
        this.secondaryGrid = "#707000"
        this.errorColor = "#FFFFFF"
        this.tool = { name: "pencil" }
        this.clipboard = {
            bitmap: [],
            width: 0,
            height: 0,
        }

        this.pointsToCheck = new Set()

        this.clearUndo()

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

    clearUndo() {
        this.undo = {
            stack: [],
            current: [],
            active: false,
            index: -1
        }
    }

    setCursor(oldTool, newTool) {
        this.drawing.classList.remove("cursor-" + oldTool)
        this.drawing.classList.add("cursor-" + newTool)
    }

    reset(string, background) {
        this.clearUndo()

        this.overlay.style.backgroundImage = "url(" + background + ")"

        this.memory.reset(string)

        this.drawPoints()
    }

    toString() {
        return this.memory.toString()
    }

    startUndo() {
        this.undo.current = []
        this.undo.active = true
    }

    stopUndo() {
        if(this.undo.active) {
            this.undo.active = false
            this.pushUndo(this.undo.current)
            this.undo.current = []
        }
    }

    pushUndo(points) {
        if(this.undo.index > 0) {
            const remaining = this.undo.stack.length - this.undo.index - 1
            
            for(let i = 0; i < remaining; i++) {
                this.undo.stack.pop()
            }
        }

        this.undo.stack.push(points)

        if(this.undo.stack.length > 100) this.undo.stack.shift()

        this.undo.index = this.undo.stack.length - 1        
    }

    doUndo() {
        if(this.undo.stack[this.undo.index]) {
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

    doRedo() {
        if(this.undo.stack[this.undo.index + 1]) {
            this.undo.index++
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

    changeTool(newToolName, fromElement) {
        this.setCursor(this.tool.name, newToolName)
        this.tool = { name: newToolName }
        this.setCurrentIcon("mosaic-current-tool", fromElement)
    }

    onImportEditTf(event, param) {
        this.memory = Minitel.drawCeefax(event.target[0].value)
        this.drawPoints()
    }

    getButtonIcon(domElement) {
        const icons = domElement.getElementsByTagName("img")
        return icons.length > 0 ? icons[0].src : ""
    }

    setCurrentIcon(id, fromElement) {
        if(fromElement === undefined) {
            return
        }

        document.getElementById(id).src = this.getButtonIcon(fromElement)
    }

    onPointSize(event, param) {
        this.pointSize = parseInt(param)
        this.setCurrentIcon("mosaic-current-size", event.target)
    }

    onToolChange(event, param) {
        this.changeTool(param, event.target)
    }

    onErase(event, param) {
        this.color = -1
        this.setCurrentIcon("mosaic-current-foreground", event.target)
    }

    onForegroundChange(event, param) {
        this.color = parseInt(param)
        this.setCurrentIcon("mosaic-current-foreground", event.target)
    }

    onBackgroundChange(event, param) {
        this.back = parseInt(param)
        this.setCurrentIcon("mosaic-current-background", event.target)
    }

    onSeparated(event, param) {
        this.separated = param === "on"
        this.setCurrentIcon("mosaic-current-separated", event.target)
    }

    onBlink(event, param) {
        this.blink = param === "on"
        this.setCurrentIcon("mosaic-current-blink", event.target)
    }

    onText(event, param) {
        document.getElementById("graphics-text-form").classList.add("visible")
        this.setCurrentIcon("mosaic-current-tool", event.target)
    }

    onSetText(event, param) {
        document.getElementById("graphics-text-form")
                .classList.remove("visible")

        const form = event.target

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
        
        this.clipboard = new MosaicZone(
            drawing.width, drawing.height,
            drawing.bitmap.map(MosaicMemory.pixelToValue)
        )
    
        this.changeTool("paste")
    }

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

    callHandler(event, actionType) {
        const point = this.translate(event)

        const handlerName = "onTool"
                          + this.tool.name[0].toUpperCase()
                          + this.tool.name.substr(1)

        if(this[handlerName]) this[handlerName](actionType, point, event)
    }

    onMouseUp(event) { this.callHandler(event, "up") }
    onMouseDown(event) { this.callHandler(event, "down") }
    onMouseMove(event) { this.callHandler(event, "move") }
    onMouseOut(event) { this.callHandler(event, "out") }

    onUndo(event, param) { this.doUndo() }
    onRedo(event, param) { this.doRedo() }

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

    onToolFill(actionType, point, event) {
        if(actionType === "down") {
            this.startUndo()
            this.fillArea(point, this.color, this.separated)
            this.stopUndo()
        }
    }

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
        } else if(   this.tool.isDrawing
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

    onToolFilledCircle(actionType, point, event) {
        this.onToolCircle(actionType, point, event, true)
    }

    onToolCurve(actionType, point, event) {
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
        } else if(   actionType === "up"
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

    onToolCopy(actionType, point, event) {
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

    onToolPaste(actionType, point, event) {
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

    onToolRectangle(actionType, point, event, filled) {
        if(actionType === "down") {
            this.tool.isDrawing = true
            this.tool.start = point
        } else if(actionType === "move" && this.tool.isDrawing) {
            const fromCoords = this.convertCoordinates(
                this.tool.start.x, this.tool.start.y, 0, false
            )

            const toCoords = this.convertCoordinates(
                point.x, point.y, 0, false
            )

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

    onToolFilledRectangle(actionType, point, event) {
        this.onToolRectangle(actionType, point, event, true)
    }

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

    translate(event) {
        const rect = this.drawing.getBoundingClientRect()
        const charWidth = Minitel.charWidth * this.zoom / this.pixelsPerWidth
        const charHeight = Minitel.charHeight * this.zoom / this.pixelsPerHeight
        const col = Math.floor((event.clientX - rect.left) / charWidth)
        const row = Math.floor((event.clientY - rect.top) / charHeight)
        const realX = Math.floor((event.clientX - rect.left) / this.zoom)
        const realY = Math.floor((event.clientY - rect.top) / this.zoom)

        return({
            "x": col,
            "y": row,
            "realX": realX,
            "realY": realY
        })
    }

    configureDOMElements() {
        this.drawing = this.root.getElementsByClassName("mosaic-drawing")[0]
        this.preview = this.root.getElementsByClassName("mosaic-preview")[0]
        this.grid = this.root.getElementsByClassName("mosaic-grid")[0]
        this.overlay = this.root.getElementsByClassName("mosaic-overlay")[0]
        this.error = this.root.getElementsByClassName("mosaic-error")[0]

        const canvases = [
            this.drawing,
            this.preview,
            this.grid,
            this.error
        ]

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

        if(separated && color >= 0) {
            coords.fullWidth = coords.width
            coords.fullHeight = coords.height
            coords.width--
            coords.height--
            coords.x++
        }

        return coords
    }

    drawPoints() {
        this.memory.getChangedPoints().forEach(point => {
            this.pointsToCheck.add(
                ((point.x / this.pixelsPerWidth) & 0x3ff) +
                ((point.y / this.pixelsPerHeight) << 10)
            )
            this.drawPoint(point)
        })
        this.drawError()
    }

    drawPoint(point) {
        const ctx = this.drawing.getContext("2d")

        if(this.undo.active) {
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

        if(point.transparent) {
            ctx.clearRect(coords.x, coords.y, coords.width, coords.height)
            return
        }

        if(point.separated) {
            ctx.fillStyle = Minitel.colors[point.back]
            ctx.fillRect(
                coords.x, coords.y, coords.fullWidth, coords.fullHeight
            )
        }
        ctx.fillStyle = Minitel.colors[point.color]
        ctx.fillRect(coords.x, coords.y, coords.width, coords.height)

        if(point.blink) {
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

    copyRect(start, end) {
        this.clipboard = this.memory.getRect(start, end)
    }

    pasteRect(destination) {
        this.memory.putRect(this.clipboard, destination)
        this.drawPoints()
    }

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

    drawError() {
        const ctx = this.error.getContext("2d")

        ctx.clearRect(0, 0, this.error.width, this.error.height)

        ctx.lineWidth = 1
        ctx.strokeStyle = this.errorColor

        this.pointsToCheck.forEach(value => {
            const x = (value & 0x3ff) * this.pixelsPerWidth
            const y = (value >> 10) * this.pixelsPerHeight

            const valid = MinitelMosaic.validCombination(
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

    drawGrid() {
        const ctx = this.grid.getContext("2d")

        // Secondary grid
        ctx.beginPath()

        ctx.lineWidth = 1 / this.zoom

        ctx.strokeStyle = this.secondaryGrid
        for(let x = Minitel.charWidth / this.pixelsPerWidth;
            x < this.canvas.width;
            x+= Minitel.charWidth
        ) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, this.canvas.height)
        }

        for(let y = 0; y < this.canvas.height; y+= Minitel.charHeight) {
            ctx.moveTo(0, y + 3)
            ctx.lineTo(this.canvas.width, y + 3)
            ctx.moveTo(0, y + 7)
            ctx.lineTo(this.canvas.width, y + 7)
        }

        ctx.stroke()
        ctx.closePath()

        // Primary grid
        ctx.beginPath()
        ctx.lineWidth = 1 / this.zoom
        ctx.strokeStyle = this.primaryGrid
        for(let x = 0; x < this.canvas.width; x+= Minitel.charWidth) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, this.canvas.height)
        }

        for(let y = 0; y < this.canvas.height; y+= Minitel.charHeight) {
            ctx.moveTo(0, y)
            ctx.lineTo(this.canvas.width, y)
        }

        ctx.stroke()
        ctx.closePath()
    }
}

MinitelMosaic.primes = [3, 5, 7, 11, 13, 17, 19, 23, 29]
MinitelMosaic.validCombinations = (function () {
    const colors = [-1, 0, 1, 2, 3, 4, 5, 6, 7]

    const valids = new Set()
    for(let color1 of colors) {
        for(let color2 of colors) {
            for(i = 0; i < 6; i++) {
                valids.add(
                    Math.pow(MinitelMosaic.primes[color1 + 1], i) *
                    Math.pow(MinitelMosaic.primes[color2 + 1], 6 - i)
                )
            }
        }
    }
    
    return valids
})()

MinitelMosaic.validCombination = function(a, b, c, d, e, f) {
    return MinitelMosaic.validCombinations.has(
        MinitelMosaic.primes[a + 1] *
        MinitelMosaic.primes[b + 1] *
        MinitelMosaic.primes[c + 1] *
        MinitelMosaic.primes[d + 1] *
        MinitelMosaic.primes[e + 1] *
        MinitelMosaic.primes[f + 1]
    )
}

