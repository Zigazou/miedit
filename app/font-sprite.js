"use strict"

class FontSprite {
    constructor(sheetURL, grid, char, zoom, colors) {
        this.grid = grid
        this.char = char
        this.colors = colors
        this.spriteSheetColors = []
        this.isReady = false

        this.spriteSheet = new Image()
        this.spriteSheet.onload = () => this.generateColors()
        this.spriteSheet.src = sheetURL
    }

    generateColors() {
        for(let color = 0; color < this.colors.length; color++) {
            const canvas = document.createElement("canvas")
            canvas.width = this.spriteSheet.width
            canvas.height = this.spriteSheet.height

            const ctx = canvas.getContext("2d")
            const [ wid, hei ] = [ canvas.width, canvas.height ]

            ctx.clearRect(0, 0, wid, hei)
            ctx.drawImage(this.spriteSheet, 0, 0, wid, hei, 0, 0, wid, hei)
            ctx.fillStyle = this.colors[color]
            ctx.globalCompositeOperation = "source-in"
            ctx.fillRect(0, 0, wid, hei)

            this.spriteSheetColors[color] = canvas
        }

        this.isReady = true
    }

    toCoordinates(ord) {
        if(ord < 0 || ord >= this.grid.cols * this.grid.rows) {
            ord = this.grid.cols * this.grid.rows - 1
        }

        return {
            "x": Math.floor(ord / this.grid.rows) * this.char.width,
            "y": (ord % this.grid.rows) * this.char.height,
        }
    }

    writeChar(ctx, ord, x, y, part, mult, color, underline) {
        const srcCoords = this.toCoordinates(ord)

        const offset = {
            x: Math.floor(part.x * this.char.width / mult.width),
            y: Math.floor(part.y * this.char.height / mult.height),
        }

        if(color === undefined) color = 0

        ctx.drawImage(
            // Source
            this.spriteSheetColors[color],
            srcCoords.x + offset.x, srcCoords.y + offset.y,
            this.char.width / mult.width, this.char.height / mult.height,

            // Destination
            x, y,
            this.char.width, this.char.height
        )

        // Draw the underline if needed
        if(underline && part.y === mult.height - 1) {
            ctx.fillStyle = this.colors[color]
            ctx.fillRect(x, y + this.char.height - 1, this.char.width, 1)
        }
    }
}
