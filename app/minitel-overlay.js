"use strict"

class MinitelOverlay {
    constructor(canvas, screen) {
        this.overlay = canvas
        this.overlay.width = screen.pageMemory.canvas.width
        this.overlay.height = screen.pageMemory.canvas.height

        this.charWidth = screen.pageMemory.char.width * screen.pageMemory.zoom.x
        this.charHeight = screen.pageMemory.char.height * screen.pageMemory.zoom.y

        this.overlay.style = "pointer-events: none"

        this.previousX = 0
        this.previousY = 0

        screen.pageMemory.canvas.addEventListener("minimove", event => {
            event.preventDefault()

            this.hideGuide()
            this.showGuide(event.detail.x, event.detail.y)
        })

        screen.pageMemory.canvas.addEventListener("miniclick", event => {
            event.preventDefault()
            console.log(event.detail.col, event.detail.row)
        })

        screen.pageMemory.canvas.addEventListener("miniout", event => {
            event.preventDefault()
            that.hideGuide()
        })
    }

    drawGuide(x, y, color) {
        const ctx = this.overlay.getContext("2d")

        ctx.beginPath()

        if(color === "") {
            ctx.globalCompositeOperation = "destination-out"
            ctx.strokeStyle = "#000000"
            ctx.lineWidth = 2
        } else {
            ctx.globalCompositeOperation = "source-over"
            ctx.strokeStyle = color
            ctx.lineWidth = 1
        }

        ctx.rect(x - 1, -1, this.charWidth + 2, this.overlay.height + 2)
        ctx.rect(-1, y - 1, this.overlay.width + 2, this.charHeight + 2)

        ctx.stroke()
    }

    showGuide(x, y) {
        this.drawGuide(x, y, "#FFFF00")
        this.previousX = x
        this.previousY = y
    }

    hideGuide() {
        this.drawGuide(this.previousX, this.previousY, "")
    }

    showInfo() {
    }
}

