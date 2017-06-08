"use strict"

const minitelGrays = [
    '#000000', // 0%
    '#7F7F7F', // 50%
    '#B2B2B2', // 70%
    '#E5E5E5', // 90%
    '#666666', // 40% 
    '#999999', // 60%
    '#CCCCCC', // 80%
    '#FFFFFF', // 100%
]

const minitelColors = [
    '#000000', // black
    '#FF0000', // red
    '#00FF00', // green
    '#FFFF00', // yellow
    '#0000FF', // blue
    '#FF00FF', // magenta
    '#00FFFF', // cyan
    '#FFFFFF', // white
]

class PageMemory {
    /*
    grid = { cols: …, rows: … }
    char = { width: …, height: … }
    zoom = { x: …, y: … }
    */
    constructor(grid, char, zoom, canvas) {
        this.grid = grid
        this.char = char
        this.zoom = zoom
        this.canvas = canvas
        this.context = this.createContext()
        this.colors = minitelColors
        this.frameRate = 50 // Frame per second

        this.font = {
            "G0": this.loadFont("font/ef9345-g0.png"),
            "G1": this.loadFont("font/ef9345-g1.png"),
        }

        this.cursor = { x: 0, y: 1, visible: false }

        this.memory = []

        // Initializes the page memory with default mosaic cells
        for(let j = 0; j < this.grid.rows; j++) {
            let row = []
            for(let i = 0; i < this.grid.cols; i++) {
                row[i] = new MosaicCell()
            }
            this.memory[j] = row
        }

        // Initializes blinking handling
        this.lastblink = this.getBlink()
        this.blinking = []
        for(let j = 0; j < this.grid.rows; j++) {
            this.blinking[j] = false
        }

        // Marks all rows as changed
        this.changed = []
        for(let j = 0; j < this.grid.rows; j++) {
            this.changed[j] = true
        }

        [ this.previousX, this.previousY ] = [ 0, 0 ]

        this.refresh = window.setInterval(
            () => { this.render() },
            1000 / this.frameRate
        )

        this.canvas.addEventListener("mousemove", (event) => {
            event.preventDefault()
            const detail = this.eventDetail(event)

            if(   this.previousX === detail.detail.x
               && this.previousY === detail.detail.y) {
                return
            }

            this.previousX = detail.detail.x
            this.previousY = detail.detail.y
            this.canvas.dispatchEvent(new CustomEvent("minimove", detail))
        })

        this.canvas.addEventListener("click", function(event) {
            event.preventDefault()
            const detail = this.eventDetail(event)
            this.canvas.dispatchEvent(
                new CustomEvent("miniclick", this.eventDetail(detail))
            )
        })
    }

    eventDetail(event) {
        const rect = this.canvas.getBoundingClientRect()
        const charWidth = this.char.width * this.zoom.x
        const charHeight = this.char.height * this.zoom.y
        const x = Math.floor((event.clientX - rect.left) / charWidth)
        const y = Math.floor((event.clientY - rect.top) / charHeight)
        const subx = Math.floor(2 * (rect.left - x * charWidth) / charWidth)
        const suby = Math.floor(3 * (rect.top - y * charHeight) / charHeight)

        return({
            "detail":
                {
                    "x": x * charWidth,
                    "y": y * charHeight,
                    "row": y,
                    "col": x,
                    "subx": subx,
                    "suby": suby,
                }
        })
    }

    set(x, y, cell) {
        this.memory[y][x] = cell
        this.changed[y] = true
    }

    getBlink() {
        const msecs = (new Date()).getTime()
        return (msecs % 1500) >= 750
    }

    createContext() {
        const ctx = this.canvas.getContext("2d")

        ctx.imageSmoothingEnabled = false
        ctx.mozImageSmoothingEnabled = false
        ctx.scale(this.zoom.x, this.zoom.y)
        ctx.fillStyle = "#000000"
        ctx.fillRect(
            0,
            0,
            this.char.width * this.grid.cols * this.zoom.x,
            this.char.height * this.grid.rows * this.zoom.y
        )

        return ctx
    }

    loadFont(url) {
        return new FontSprite(
            url,
            { cols: 8, rows: 16 },
            this.char,
            this.zoom,
            this.colors
        )
    }

    scroll(direction) {
        const newRow = []
        for(let col = 0; col < this.grid.cols; col++) {
            newRow[col] = new MosaicCell()
        }

        switch(direction) {
            case 'up':
                for(let row = 2; row < this.grid.rows; row++) {
                    this.memory[row] = this.memory[row + 1];
                    this.changed[row] = true;
                }

                this.memory[this.grid.rows - 1] = newRow
                this.changed[this.grid.rows - 1] = true

                break

            case 'down':
                for(let row = this.grid.rows - 1; row > 1; row--) {
                    this.memory[row] = this.memory[row - 1]
                    this.changed[row] = true
                }

                this.memory[1] = newRow
                this.changed[1] = true

                break
        }
    }

    render() {
        if(this.font["G0"].isReady === false) return
        if(this.font["G1"].isReady === false) return

        // Add the inverted F on the status line
        const fCell = new CharCell()
        fCell.value = 0x46
        fCell.invert = true
        this.memory[0][38] = fCell

        const [ defaultFgColor, defaultBgColor ] = [ 7, 0 ]
        const ctx = this.context
        const blink = this.getBlink()

        let page = this.font["G0"]
        let part = { x: 0, y: 0}
        let mult = { width: 1, height: 1}
        let unde = false

        let [ front, back ] = [ 7, 0 ]

        // Draw each cell
        for(let row = 0; row < this.grid.rows; row++) {
            // Draw the row only if needed
            if(!this.changed[row]) {
                if(!this.blinking[row]) continue
                if(this.lastBlink === blink) continue
            }

            // Zone attributes
            let bgColor = defaultBgColor
            let mask = false
            let underline = false
            this.changed[row] = false

            const y = row * this.char.height

            let blinkRow = false
            for(let col = 0; col < this.grid.cols; col++) {
                const cell = this.memory[row][col]
                const x = col * this.char.width

                if(!(cell instanceof CharCell)) {
                    bgColor = cell.bgColor
                    underline = false
                }
                
                if(!(cell instanceof DelimiterCell) && cell.blink === true) {
                    blinkRow = true
                }

                if(!(cell instanceof MosaicCell) && cell.invert === true) {
                    [ front, back ] = [ bgColor, cell.fgColor ]
                } else {
                    [ front, back ] = [ cell.fgColor, bgColor ]
                }

                // Draw background
                ctx.fillStyle = this.colors[back]
                ctx.fillRect(x, y, this.char.width, this.char.height)

                // Draw character
                if(   mask !== true
                   && !(   !(cell instanceof DelimiterCell)
                        && cell.blink === true
                        && blink === (cell instanceof MosaicCell
                                      || !cell.invert))
                                     ) {
                    if(cell instanceof CharCell) {
                        page = this.font["G0"]
                        part = cell.part
                        mult = cell.mult
                        unde = underline
                    } else if(cell instanceof DelimiterCell) {
                        page = this.font["G0"]
                        part = { x: 0, y: 0 }
                        mult = cell.mult
                        unde = underline
                    } else {
                        page = this.font["G1"]
                        part = { x: 0, y: 0 }
                        mult = { width: 1, height: 1 }
                        unde = false
                    }

                    page.writeChar(ctx, cell.value, x, y, part, mult, front, unde)
                }

                if(cell instanceof DelimiterCell) {
                    if(cell.mask !== undefined) {
                        mask = cell.mask
                    }

                    if(cell.zoneUnderline !== undefined) {
                        underline = cell.zoneUnderline
                    }
                }
            }

            this.blinking[row] = blinkRow
        }

        this.lastBlink = blink
    }
}
