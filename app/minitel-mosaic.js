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
        this.isDrawing = false
        this.previous = { x: undefined, y: undefined }
        this.lastPoint = { x: undefined, y: undefined }
        this.color = 7
        this.separated = false
        this.bitmap = []
        this.fullChars = "abcdefgh"
        this.sepChars = "ABCDEFGH"
        this.primaryGrid = "#D0D000"
        this.secondaryGrid = "#707000"
        this.errorColor = "#FFFFFF"
        this.tool = "pencil"
        this.pointsToCheck = new Set()
        this.clipboard = {
            bitmap: [],
            width: 0,
            height: 0,
        }

        this.root = root
        this.configureDOMElements()
        this.setCursor("", this.tool)

        this.drawGrid()
        this.drawBackground()

        new SimpleRibbon(document.getElementById("mosaic-ribbon"))

        this.drawing.addEventListener("mouseup", e => this.onMouseUp(e))
        this.drawing.addEventListener("mousedown", e => this.onMouseDown(e))
        this.drawing.addEventListener("mousemove", e => this.onMouseMove(e))
        this.drawing.addEventListener("mouseout", e => this.onMouseOut(e))

        this.root.autocallback(this)
    }

    setCursor(oldTool, newTool) {
        this.drawing.classList.remove("cursor-" + oldTool)
        this.drawing.classList.add("cursor-" + newTool)
    }

    reset(string, background) {
        this.overlay.style.backgroundImage = "url(" + background + ")"

        const pixelCount = this.resolution.width * this.resolution.height
        if(string === undefined || string.length !== pixelCount) {
            string = "-".repeat(pixelCount)
        }

        this.bitmap = []
        for(let y = 0; y < this.resolution.height; y++) {
            const row = []
            for(let x = 0; x < this.resolution.width; x++) {
                row.push({ color: -1, separated: false })
            }
            this.bitmap.push(row)
        }

        let i = 0
        for(let y = 0; y < this.resolution.height; y++) {
            for(let x = 0; x < this.resolution.width; x++) {
                const char = string[i]
                let color = -1
                let separated = false

                color = this.fullChars.indexOf(char)
                if(color < 0) {
                    color = this.sepChars.indexOf(char)
                    separated = true
                }

                this.drawPoint(x, y, color, separated)

                i++
            }
        }

        this.drawError()
    }

    refresh() {
        const ctx = this.drawing.getContext("2d")
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        for(let y = 0; y < this.resolution.height; y++) {
            for(let x = 0; x < this.resolution.width; x++) {
                const pixel = this.bitmap[y][x]
                if(pixel.color < 0) continue
                this.drawPoint(x, y, pixel.color, pixel.separated)
            }
        }

        this.drawError()
    }

    toString() {
        let string = ""
        for(let y = 0; y < this.resolution.height; y++) {
            for(let x = 0; x < this.resolution.width; x++) {
                const pixel = this.bitmap[y][x]

                if(pixel.color < 0) {
                    string += "-"
                } else if(pixel.separated) {
                    string += this.sepChars[pixel.color]
                } else {
                    string += this.fullChars[pixel.color]
                }
            }
        }

        return string
    }

    onImportEditTf(event, param) {
        this.bitmap = Minitel.drawCeefax(event.target[0].value)
        this.refresh()
    }

    onToolChange(event, param) {
        this.setCursor(this.tool, param)
        this.tool = param
    }

    onColorChange(event, param) {
        event.preventDefault()
        this.color = parseInt(param)
    }

    onNormalMosaic(event) {
        this.separated = false
    }

    onSeparatedMosaic(event) {
        this.separated = true
    }

    callHandler(event, actionType) {
        const point = this.translate(event)

        const handlerName = "onTool"
                          + this.tool[0].toUpperCase()
                          + this.tool.substr(1)

        if(this[handlerName]) this[handlerName](actionType, point, event)
    }

    onMouseUp(event) { this.callHandler(event, "up") }
    onMouseDown(event) { this.callHandler(event, "down") }
    onMouseMove(event) { this.callHandler(event, "move") }
    onMouseOut(event) { this.callHandler(event, "out") }

    onToolPencil(actionType, point, event) {
        if(actionType === "down") {
            this.isDrawing = true
            
            if(event.shiftKey && this.lastPoint.x !== undefined) {
                this.drawLine(this.lastPoint, point, this.color, this.separated)
            } else {
                this.drawLine(this.previous, point, this.color, this.separated)
            }

            this.lastPoint = { x: point.x, y: point.y }
        } else if(actionType === "move" && this.isDrawing) {
            this.drawLine(this.previous, point, this.color, this.separated)
            this.lastPoint = { x: point.x, y: point.y }
        } else if(actionType === "up" || actionType === "out") {
            this.isDrawing = false
        }

        if(actionType === "move") this.previous = { x: point.x, y: point.y }
    }

    onToolFill(actionType, point, event) {
        if(actionType === "down") {
            this.fillArea(point, this.color, this.separated)
        }
    }

    onToolCircle(actionType, point, event) {
        if(actionType === "down") {
            this.isDrawing = true
            this.previous = point
        } else if(actionType === "move" && this.isDrawing) {
            const radius = Math.sqrt(
                Math.pow(point.realX - this.previous.realX, 2) +
                Math.pow(point.realY - this.previous.realY, 2)
            )

            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.strokeStyle = Minitel.colors[this.color]
            ctx.arc(
                this.previous.realX, this.previous.realY,
                radius, 0, 2 * Math.PI,
                false
            )
            ctx.stroke()
            ctx.closePath()
        } else if(   this.isDrawing
                  && (actionType === "up" || actionType === "out")
            ) {
            this.isDrawing = false

            const radius = Math.floor(Math.sqrt(
                Math.pow(point.realX - this.previous.realX, 2) +
                Math.pow(point.realY - this.previous.realY, 2)
            ) / this.zoom)

            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.closePath()

            this.drawCircle(this.previous, radius, this.color, this.separated)
        }
    }

    onToolCurve(actionType, point, event) {
        if(actionType === "down" && this.startPoint === undefined) {
            this.startPoint = point
        } else if(actionType === "move" && this.startPoint !== undefined) {
            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.strokeStyle = Minitel.colors[this.color]

            if(this.endPoint === undefined) {
                ctx.moveTo(this.startPoint.realX, this.startPoint.realY)
                ctx.quadraticCurveTo(
                    this.startPoint.realX, this.startPoint.realY,
                    point.realX, point.realY
                )
            } else {
                ctx.moveTo(this.startPoint.realX, this.startPoint.realY)
                ctx.quadraticCurveTo(
                    point.realX, point.realY,
                    this.endPoint.realX, this.endPoint.realY
                )
            }

            ctx.stroke()
            ctx.closePath()
        } else if(   actionType === "up"
                  && this.startPoint !== undefined
                  && this.endPoint === undefined
            ) {
            this.endPoint = point
        } else if(actionType === "down" && this.endPoint !== undefined) {
            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.closePath()

            this.drawCurve(
                this.startPoint, this.endPoint, point,
                this.color, this.separated
            )

            this.startPoint = undefined
            this.endPoint = undefined
        }
    }

    onToolCopy(actionType, point, event) {
        if(actionType === "down") {
            this.isDrawing = true
            this.startPoint = point
        } else if(actionType === "move" && this.isDrawing) {
            const fromCoords = this.convertCoordinates(
                this.startPoint.x, this.startPoint.y, 0, false
            )

            const toCoords = this.convertCoordinates(
                point.x, point.y, 0, false
            )

            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.strokeStyle = "#FFFFFF"
            ctx.rect(
                fromCoords.x, fromCoords.y,
                toCoords.x - fromCoords.x, toCoords.y - fromCoords.y
            )
            ctx.stroke()
            ctx.closePath()
        } else if(actionType === "up") {
            this.isDrawing = false
            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.closePath()
            this.copyRect(this.startPoint, point)
        }
    }

    onToolPaste(actionType, point, event) {
        if(actionType === "down") {
            point.x = Math.floor(point.x - this.clipboard.width / 2)
            point.y = Math.floor(point.y - this.clipboard.height / 2)
        
            this.pasteRect(point)
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

            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.strokeStyle = "#FFFFFF"
            ctx.rect(
                fromCoords.x, fromCoords.y,
                toCoords.x - fromCoords.x, toCoords.y - fromCoords.y
            )
            ctx.stroke()
            ctx.closePath()
        } else if(actionType === "out") {
            const ctx = this.preview.getContext("2d")
            ctx.beginPath()
            ctx.clearRect(0, 0, this.preview.width, this.preview.height)
            ctx.closePath()
        }
    }

    shiftUp(offset) {
        for(let i = 0; i < offset; i++) {
            this.bitmap.push(this.bitmap.shift())
        }
    }

    shiftDown(offset) {
        for(let i = 0; i < offset; i++) {
            this.bitmap.unshift(this.bitmap.pop())
        }
    }

    shiftLeft(offset) {
        for(let y = 0; y < this.resolution.height; y++) {
            for(let i = 0; i < offset; i++) {
                this.bitmap[y].push(this.bitmap[y].shift())
            }
        }
    }

    shiftRight(offset) {
        for(let y = 0; y < this.resolution.height; y++) {
            for(let i = 0; i < offset; i++) {
                this.bitmap[y].unshift(this.bitmap[y].pop())
            }
        }
    }

    onMoveGraphics(event, param) {
        if(param === "center") return

        if(param.x < 0) {
            this.shiftLeft(Math.abs(param.x))
        } else if(param.x > 0) {
            this.shiftRight(param.x)
        }

        if(param.y < 0) {
            this.shiftUp(Math.abs(param.y))
        } else if(param.y > 0) {
            this.shiftDown(param.y)
        }

        this.refresh()
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
        this.background = this.root.getElementsByClassName("mosaic-background")[0]
        this.drawing = this.root.getElementsByClassName("mosaic-drawing")[0]
        this.preview = this.root.getElementsByClassName("mosaic-preview")[0]
        this.grid = this.root.getElementsByClassName("mosaic-grid")[0]
        this.overlay = this.root.getElementsByClassName("mosaic-overlay")[0]
        this.error = this.root.getElementsByClassName("mosaic-error")[0]

        const canvases = [
            this.background,
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
            coords.width--
            coords.height--
            coords.x++
        }

        return coords
    }

    copyRect(start, end) {
        const yStart = Math.floor(Math.min(start.y, end.y))
        const yEnd = Math.floor(Math.max(start.y, end.y))
        const xStart = Math.floor(Math.min(start.x, end.x))
        const xEnd = Math.floor(Math.max(start.x, end.x))

        const [ width, height ] = [ xEnd - xStart, yEnd - yStart ]

        if(width === 0 || height === 0) {
            return
        }

        this.clipboard.bitmap = []

        this.clipboard.width = width
        this.clipboard.height = height

        for(let y = yStart; y < yEnd; y++) {
            const row = []
            for(let x = xStart; x < xEnd; x++) {
                const pixel = this.bitmap[y][x]
                row.push({
                    color: pixel.color,
                    separated: pixel.separated,
                })
            }

            this.clipboard.bitmap.push(row)
        }
    }

    pasteRect(destination) {
        if(this.clipboard.width === 0 || this.clipboard.height === 0) {
            return
        }

        let y = destination.y
        for(let row of this.clipboard.bitmap) {
            let x = destination.x
            for(let pixel of row) {
                if(pixel.color >= 0) {
                    this.drawPoint(x, y, pixel.color, pixel.separated)
                }
                x++
            }
            y++
        }
        this.drawError()
    }

    drawPoint(x, y, color, separated) {
        if(   x < 0 || x >= this.resolution.width
           || y < 0 || y >= this.resolution.height
        ) {
            return
        }

        const ctx = this.drawing.getContext("2d")
        const coords = this.convertCoordinates(x, y, color, separated)

        this.bitmap[y][x] = {
            color: color,
            separated: separated,
        }

        if(color < 0) {
            ctx.clearRect(coords.x, coords.y, coords.width, coords.height)
        } else {
            ctx.fillStyle = Minitel.colors[color]
            ctx.fillRect(coords.x, coords.y, coords.width, coords.height)
        }

        this.pointsToCheck.add(
            Math.floor(y / this.pixelsPerHeight) * 1000 +
            Math.floor(x / this.pixelsPerWidth)
        )
    }

    drawLine(first, last, color, separated) {
        // Bresenham algorithm
        let x0 = first.x
        let y0 = first.y
        let x1 = last.x
        let y1 = last.y
        const dx = Math.abs(x1 - x0)
        const dy = Math.abs(y1 - y0)
        const sx = (x0 < x1) ? 1 : -1
        const sy = (y0 < y1) ? 1 : -1
        let err = dx - dy

        while(true) {
            this.drawPoint(x0, y0, color, separated)

            if(x0 === x1 && y0 === y1) break
            let e2 = 2 * err
            if(e2 > -dy) {
                err -= dy
                x0 += sx
            }

            if(e2 < dx) {
                err += dx
                y0 += sy
            }
        }

        this.drawError()
    }

    drawCircle(center, radius, color, separated) {
        // Minitel mosaic pixels are not square...
        const [width, height] = [ radius, Math.floor(radius * 1.25) ]

        let [a2, b2] = [ width * width, height * height ]
        let [fa2, fb2] = [ 4 * a2, 4 * b2 ]
        let [x, y] = [ 0, 0 ]
        let sigma = 0

        y = height
        sigma = 2 * b2 + a2 * (1 - 2 * height)
        for (x = 0; b2 * x <= a2 * y; x++) {
            this.drawPoint(center.x + x, center.y + y, color, separated)
            this.drawPoint(center.x - x, center.y + y, color, separated)
            this.drawPoint(center.x + x, center.y - y, color, separated)
            this.drawPoint(center.x - x, center.y - y, color, separated)
            if(sigma >= 0) {
                sigma += fa2 * (1 - y)
                y--
            }
            sigma += b2 * (4 * x + 6)
        }

        x = width
        sigma = 2 * a2 + b2 * (1 - 2 * width)
        for (y = 0; a2 * y <= b2 * x; y++) {
            this.drawPoint(center.x + x, center.y + y, color, separated)
            this.drawPoint(center.x - x, center.y + y, color, separated)
            this.drawPoint(center.x + x, center.y - y, color, separated)
            this.drawPoint(center.x - x, center.y - y, color, separated)
            if(sigma >= 0) {
                sigma += fb2 * (1 - x)
                x--
            }
            sigma += a2 * (4 * y + 6)
        }

        this.drawError()
    }

    drawCurve(start, end, control, color, separated) {
        let next = start
        let previous = start
        for(let t = 0.05; t <= 1.05; t += 0.05) {
            const omt = 1 - t

            next = {
                "x": Math.floor(
                    omt * omt * start.x +
                    2 * omt * t * control.x +
                    t * t * end.x
                ),
                "y": Math.floor(
                    omt * omt * start.y +
                    2 * omt * t * control.y +
                    t * t * end.y
                )
            }

            this.drawLine(previous, next, color, separated)
            previous = next
        }
    }

    fillArea(startPoint, finalColor, separated) {
        const startColor = this.bitmap[startPoint.y][startPoint.x].color
        if(finalColor === startColor) return

        const stack = [startPoint]

        while(stack.length !== 0) {
            let point = stack.shift()

            const color = this.bitmap[point.y][point.x].color
            if(color !== startColor) continue

            this.drawPoint(point.x, point.y, finalColor, separated)

            if(point.x > 0) {
                stack.push({ x: point.x - 1, y: point.y })
            }

            if(point.x < this.resolution.width - 1) {
                stack.push({ x: point.x + 1, y: point.y })
            }

            if(point.y > 0) {
                stack.push({ x: point.x, y: point.y - 1 })
            }

            if(point.y < this.resolution.height - 1) {
                stack.push({ x: point.x, y: point.y + 1 })
            }
        }

        this.drawError()
    }

    drawBackground() {
        const skew = 500
        const inc = 4

        const ctx = this.background.getContext("2d")
        ctx.lineWidth = 1 / this.zoom
        ctx.strokeStyle = "#404040"
        ctx.beginPath()
        for(let x = -skew; x < this.canvas.width; x += inc) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x + skew, this.canvas.height)
        }
        ctx.stroke()
        ctx.closePath()
    }

    drawError() {
        function hasError(colors) {
            let fg = 1000
            let bg = 1000
            for(let color of colors) {
                if(fg === 1000) {
                    fg = color
                } else if(bg === 1000 && fg !== color) {
                    bg = color
                } else if(fg !== color && bg !== color) {
                    return true
                }
            }

            return false
        }

        const ctx = this.error.getContext("2d")

        ctx.clearRect(0, 0, this.error.width, this.error.height)

        ctx.lineWidth = 1
        ctx.strokeStyle = this.errorColor

        this.pointsToCheck.forEach(value => {
            const x = (value % 1000) * this.pixelsPerWidth
            const y = Math.floor(value / 1000) * this.pixelsPerHeight
            const points = [
                this.bitmap[y][x].color,
                this.bitmap[y][x + 1].color,
                this.bitmap[y + 1][x].color,
                this.bitmap[y + 1][x + 1].color,
                this.bitmap[y + 2][x].color,
                this.bitmap[y + 2][x + 1].color
            ]

            if(hasError(points)) {
                ctx.beginPath()

                const coords = this.convertCoordinates(x, y, 0, false)
                ctx.rect(
                    coords.x, coords.y,
                    Minitel.charWidth, Minitel.charHeight
                )

                ctx.stroke()
                ctx.closePath()
            } else {
                this.pointsToCheck.delete(value)
            }
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

