class MinitelMosaic {
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
        this.tool = "pencil"

        this.root = root
        this.configureDOMElements()
        this.setCursor()

        this.drawGrid()
        this.drawBackground()

        new SimpleRibbon(document.getElementById("mosaic-ribbon"))

        this.drawing.addEventListener("mouseup", e => this.onMouseUp(e))
        this.drawing.addEventListener("mousedown", e => this.onMouseDown(e))
        this.drawing.addEventListener("mousemove", e => this.onMouseMove(e))

        this.root.autocallback(this)
    }

    setCursor() {
        this.drawing.classList.remove("cursor-pencil")
        this.drawing.classList.remove("cursor-fill")
        this.drawing.classList.add("cursor-" + this.tool)
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
        this.tool = param
        this.setCursor()
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

    onMouseUp(event) {
        event.preventDefault()
        this.isDrawing = false
    }

    onMouseDown(event) {
        event.preventDefault()
        const point = this.translate(event)

        if(this.tool === "pencil") {
            this.isDrawing = true
            
            if(event.shiftKey && this.lastPoint.x !== undefined) {
                this.drawLine(this.lastPoint, point, this.color, this.separated)
            } else {
                this.drawLine(this.previous, point, this.color, this.separated)
            }

            this.lastPoint = { x: point.x, y: point.y }
        } else if(this.tool === "fill") {
            this.fillArea(point, this.color, this.separated)
        }
    }

    onMouseMove(event) {
        event.preventDefault()

        const point = this.translate(event)

        if(this.isDrawing) {
            this.drawLine(this.previous, point, this.color, this.separated)
            this.lastPoint = { x: point.x, y: point.y }
        }

        this.previous = { x: point.x, y: point.y }
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

        return({ "x": col, "y": row })
    }

    configureDOMElements() {
        this.background = this.root.getElementsByClassName("mosaic-background")[0]
        this.drawing = this.root.getElementsByClassName("mosaic-drawing")[0]
        this.grid = this.root.getElementsByClassName("mosaic-grid")[0]
        this.grid.style = "pointer-events: none"
        this.overlay = this.root.getElementsByClassName("mosaic-overlay")[0]
        this.overlay.style = "pointer-events: none"

        for(let obj of [ this.background, this.drawing, this.grid ]) {
            obj.width  = this.canvas.width * this.zoom
            obj.height = this.canvas.height * this.zoom
            const ctx = obj.getContext("2d")
            ctx.scale(this.zoom, this.zoom)
        }
    }

    convertCoordinates(x, y, color, separated) {
        const coords = {}

        coords.x = x * (Minitel.charWidth / this.pixelsPerWidth)
        coords.width = Minitel.charWidth / this.pixelsPerWidth
        coords.y = Math.floor(y / 3) * Minitel.charHeight
        switch(y % 3) {
            case 0:
                coords.height = 3
                break
            case 1:
                coords.y += 3
                coords.height = 4
                break
            case 2:
                coords.y += 7
                coords.height = 3
                break
        }

        if(separated && color >= 0) {
            coords.width--
            coords.height--
            coords.x++
        }

        return coords
    }

    drawPoint(x, y, color, separated) {
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

    drawGrid() {
        const ctx = this.grid.getContext("2d")

        // Secondary grid
        ctx.beginPath()

        ctx.lineWidth = 1 / this.zoom
        ctx.imageSmoothingEnabled = false
        ctx.mozImageSmoothingEnabled = false

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

