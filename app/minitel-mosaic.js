"use strict"
class MinitelMosaic {
    constructor(root, zoom) {
        this.width = 320
        this.height = 240
        this.zoom = zoom
        this.isDrawing = false
        this.previous = { x: undefined, y: undefined }
        this.lastpoint = { x: undefined, y: undefined }

        this.color = 7
        this.separated = true

        this.root = root
        this.configureDOMElements()

        this.drawGrid()
        this.drawBackground()

        this.drawing.addEventListener("mouseup", e => this.onMouseUp(e))
        this.drawing.addEventListener("mousedown", e => this.onMouseDown(e))
        this.drawing.addEventListener("mousemove", e => this.onMouseMove(e))

        for(let obj of this.root.getElementsByClassName("mosaic-color")) {
            obj.autocallback(this)
        }
    }

    onColorChange(event) {
        event.preventDefault()
        this.color = event.target.value
        if(this.color !== "transparent") this.color = parseInt(this.color)
    }

    onMouseUp(event) {
        event.preventDefault()
        this.isDrawing = false
    }

    onMouseDown(event) {
        event.preventDefault()
        const point = this.translate(event)
        this.isDrawing = true
        
        if(event.shiftKey) {
            this.drawLine(this.lastPoint, point, this.color)
        } else {
            this.drawLine(this.previous, point, this.color)
        }

        this.lastPoint = { x: point.x, y: point.y }
    }

    onMouseMove(event) {
        event.preventDefault()

        const point = this.translate(event)

        if(this.isDrawing) {
            this.drawLine(this.previous, point, this.color)
            this.lastPoint = { x: point.x, y: point.y }
        }

        this.previous = { x: point.x, y: point.y }
    }

    translate(event) {
        const rect = this.drawing.getBoundingClientRect()
        const charWidth = 8 * this.zoom / 2
        const charHeight = 10 * this.zoom / 3
        const col = Math.floor((event.clientX - rect.left) / charWidth)
        const row = Math.floor((event.clientY - rect.top) / charHeight)

        return({ "x": col, "y": row })
    }

    configureDOMElements() {
        this.background = this.root.getElementsByClassName("mosaic-background")[0]
        this.drawing = this.root.getElementsByClassName("mosaic-drawing")[0]
        this.grid = this.root.getElementsByClassName("mosaic-grid")[0]
        this.grid.style = "pointer-events: none"

        for(let obj of [ this.background, this.drawing, this.grid ]) {
            obj.width  = this.width * this.zoom
            obj.height = this.height * this.zoom
            const ctx = obj.getContext("2d")
            ctx.scale(this.zoom, this.zoom)
        }
    }

    convertCoordinates(x, y) {
        const coords = {}

        coords.x = x * 4
        coords.width = 4
        coords.y = Math.floor(y / 3) * 10
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

        if(this.separated && this.color !== "transparent") {
            coords.width--
            coords.height--
            coords.x++
        }

        return coords
    }

    drawPoint(x, y, color) {
        const ctx = this.drawing.getContext("2d")
        const coords = this.convertCoordinates(x, y)

        if(color === "transparent") {
            ctx.clearRect(coords.x, coords.y, coords.width, coords.height)
        } else {
            ctx.fillStyle = minitelPalette.colors[color]
            ctx.fillRect(coords.x, coords.y, coords.width, coords.height)
        }
    }

    drawLine(first, last, color) {
        let x0 = first.x
        let y0 = first.y
        let x1 = last.x
        let y1 = last.y
        const dx = Math.abs(x1 - x0)
        const dy = Math.abs(y1 - y0)
        const sx = (x0 < x1) ? 1 : -1
        const sy = (y0 < y1) ? 1 : -1
        let err = dx - dy

        while(true){
            this.drawPoint(x0, y0, color)

            if(x0 === x1 && y0 === y1) break
            var e2 = 2 * err
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

    drawBackground() {
        const skew = 500
        const inc = 20

        const ctx = this.background.getContext("2d")
        ctx.lineWidth = 10 / this.zoom
        ctx.strokeStyle = "#202020"
        ctx.beginPath()
        for(let x = -skew; x < this.width; x += inc) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x + skew, this.height)
        }
        ctx.stroke()
        ctx.closePath()
    }

    drawGrid() {
        const ctx = this.grid.getContext("2d")

        ctx.beginPath()

        ctx.lineWidth = 1 / this.zoom
        ctx.imageSmoothingEnabled = false
        ctx.mozImageSmoothingEnabled = false

        ctx.strokeStyle = "#404000"
        for(let x = 4; x < this.width; x+= 8) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, this.height)
        }

        for(let y = 0; y < this.height; y+= 10) {
            ctx.moveTo(0, y + 3)
            ctx.lineTo(this.width, y + 3)
            ctx.moveTo(0, y + 7)
            ctx.lineTo(this.width, y + 7)
        }

        ctx.stroke()
        ctx.closePath()

        ctx.beginPath()
        ctx.strokeStyle = "#808000"
        for(let x = 0; x < this.width; x+= 8) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, this.height)
        }

        for(let y = 0; y < this.height; y+= 10) {
            ctx.moveTo(0, y)
            ctx.lineTo(this.width, y)
        }

        ctx.stroke()
        ctx.closePath()
    }
}

