"use strict"

class MinitelDecoder {
    constructor(pageMemory) {
        this.state = "start"
        this.pageMode = true

        this.pm = pageMemory
        this.clear("page")
        this.clear("status")

        this.previousBytes = new FiniteStack(128)

        this.resetCurrent()
        this.charCode = 0x20

        this.drcs = {
            g0: false,
            g1: false,
            charsetToDefine: undefined,
            startChar: undefined,
            count: 0,
        }
    }

    resetCurrent() {
        this.current = {
            charType: CharCell,
            mult: { width: 1, height: 1 },
            fgColor: 7,
            bgColor: 0,
            underline: false,
            blink: false,
            invert: false,
            mask: false,
            separated: false,
        }

        this.waiting = {
            bgColor: undefined,
            mask: undefined,
            underline: undefined
        }
    }

    serialAttributesDefined() {
        return this.waiting.bgColor !== undefined
            || this.waiting.underline !== undefined
            || this.waiting.mask !== undefined
    }

    moveCursor(direction) {
        if(direction === "char") {
            this.pm.cursor.x += this.current.mult.width
            if(this.pm.cursor.x >= this.pm.grid.cols) {
                if(this.pm.cursor.y == 0) {
                    // No overflow on status line
                    this.pm.cursor.x = this.pm.grid.cols - 1
                } else {
                    // Go to start of next row
                    this.pm.cursor.x = 0
                    range(this.current.mult.height).forEach(i => {
                        this.moveCursor("down")
                    })
                }
            }
        } else if(direction === "left") {
            this.pm.cursor.x--
            if(this.pm.cursor.x < 0) {
                this.pm.cursor.x = this.pm.grid.cols - 1
                this.moveCursor("up")
            }
        } else if(direction === "right") {
            this.pm.cursor.x++
            if(this.pm.cursor.x >= this.pm.grid.cols) {
                this.pm.cursor.x = 0
                this.moveCursor("down")
            }
        } else if(direction === "up") {
            if(this.pm.cursor.y == 0) return;

            this.pm.cursor.y--

            if(this.pm.cursor.y == 0) {
                if(this.pageMode) {
                    this.pm.cursor.y = this.pm.grid.rows - 1
                } else {
                    this.pm.cursor.y = 1
                    this.pm.scroll("down")
                }
            }
        } else if(direction === "down") {
            this.pm.cursor.y++

            if(this.pm.cursor.y == this.pm.grid.rows) {
                if(this.pageMode) {
                    this.pm.cursor.y = 1
                } else {
                    this.pm.cursor.y = this.pm.grid.rows - 1
                    this.pm.scroll("up")
                }
            }
        } else if(direction === "firstColumn") {
            this.pm.cursor.x = 0
        } else if(direction === "home") {
            this.pm.cursor.x = 0
            this.pm.cursor.y = 1
            this.resetCurrent()
        }
    }

    clear(clearRange) {
        if(clearRange === "page") {
            this.pm.clear()
            this.pm.cursor.x = 0
            this.pm.cursor.y = 1
            this.resetCurrent()
            return
        }

        if(clearRange === "status") {
            let row = []
            range(this.pm.grid.cols).forEach(i => {
                this.pm.set(i, 0, new MosaicCell())
            })
            return
        }

        if(clearRange === "eol") {
            const saveX = this.pm.cursor.x
            const saveY = this.pm.cursor.y
            const savePageMode = this.pageMode

            // Clearing must not scroll the screen
            this.pageMode = true
            range(this.pm.cursor.x, this.pm.grid.cols).forEach(i => {
                this.print(0x20)
            })
            this.pm.cursor.x = saveX
            this.pm.cursor.y = saveY
            this.pageMode = savePageMode
            return
        }

        // CSI sequences do not work on status row
        if(this.pm.cursor.y === 0) return

        if(clearRange === "endofscreen") {
            range(this.pm.cursor.x, this.pm.grid.cols).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })

            const [cols, rows] = [this.pm.grid.cols, this.pm.grid.rows]
            range2([this.pm.cursor.y + 1, 0], [rows, cols]).forEach((y, x) => {
                this.pm.set(x, y, new MosaicCell())
            })

            return
        }

        if(clearRange === "startofscreen") {
            range(0, this.pm.cursor.x + 1).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })
        
            const [cols, rows] = [this.pm.grid.cols, this.pm.cursor.y]
            range2([0, 0], [rows, cols]).forEach((y, x) => {
                this.pm.set(x, y, new MosaicCell())
            })

            return
        }

        if(clearRange === "startofline") {
            range(0, this.pm.cursor.x + 1).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })

            return
        }

        if(clearRange === "completescreen") {
            this.pm.clear()
            return        
        }

        if(clearRange === "completeline") {
            range(0, this.pm.grid.cols).forEach(x => {
                this.pm.set(x, this.pm.cursor.y, new MosaicCell())
            })

            return
        }
    }

    setPageMode(bool) {
        this.pageMode = bool
    }

    setCharType(charPage) {
        this.current.separated = false
        this.current.invert = false
        this.current.mult = { width: 1, height: 1 }

        if(charPage === "G0") {
            this.current.charType = CharCell
        } else if(charPage === "G1") {
            this.current.charType = MosaicCell
            this.current.underline = false
            if(this.waiting.bgColor !== undefined) {
                this.current.bgColor = this.waiting.bgColor
                this.waiting.bgColor = undefined
            }
        }
    }

    showCursor(visibility) {
        this.pm.cursor.visible = visibility
    }

    setFgColor(color) {
        this.current.fgColor = color
    }

    setBgColor(color) {
        if(this.current.charType === CharCell) {
            this.waiting.bgColor = color
        } else if(this.current.charType === MosaicCell) {
            this.current.bgColor = color
        }
    }

    setSize(sizeName) {
        if(this.pm.cursor.y === 0) return
        if(this.current.charType !== CharCell) return

        const sizes = {
            "normalSize": { width: 1, height: 1 },
            "doubleWidth": { width: 2, height: 1 },
            "doubleHeight": { width: 1, height: 2 },
            "doubleSize": { width: 2, height: 2 },
        }

        if(!(sizeName in sizes)) return
        if(this.pm.cursor.y === 1 && sizes[sizeName].height === 2) return
        this.current.mult = sizes[sizeName]
    }

    setBlink(blink) {
        this.current.blink = blink
    }

    setMask(mask) {
        this.waiting.mask = mask
    }

    setUnderline(underline) {
        if(this.current.charType === CharCell) {
            this.waiting.underline = underline
        } else if(this.current.charType === MosaicCell) {
            this.current.separated = underline
        }
    }

    setInvert(invert) {
        if(this.current.charType === MosaicCell) return

        this.current.invert = invert
    }

    locate(y, x) {
        if(y === 0x30 || y === 0x31 || y === 0x32) {
            y = 10 * (y - 0x30) + (x - 0x30)
            x = 1
        } else {
            x -= 0x40
            y -= 0x40
        }

        if(x < 1 || x > 40) return
        if(y < 0 || y > 24) return

        this.pm.cursor.x = x - 1
        this.pm.cursor.y = y

        this.resetCurrent()
    }

    printDelimiter(charCode) {
        const x = this.pm.cursor.x
        const y = this.pm.cursor.y

        const cell = new DelimiterCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.invert = this.current.invert
        cell.mult = this.current.mult

        // Background color
        if(this.waiting.bgColor === undefined) {
            cell.bgColor = this.current.bgColor
        } else {
            cell.bgColor = this.waiting.bgColor
            this.waiting.bgColor = undefined
        }
        this.current.bgColor = cell.bgColor

        // Underline
        if(this.waiting.underline !== undefined) {
            cell.zoneUnderline = this.waiting.underline
            this.current.underline = this.waiting.underline
            this.waiting.underline = undefined
        }

        // Mask
        if(this.waiting.mask !== undefined) {
            cell.mask = this.waiting.mask
            this.current.mask = this.waiting.mask
            this.waiting.mask = undefined
        }

        range2([cell.mult.height, cell.mult.width]).forEach((j, i) => {
            const newCell = cell.copy()
            this.pm.set(x + i, y - j, newCell)
        })
    }

    printG0Char(charCode) {
        const x = this.pm.cursor.x
        const y = this.pm.cursor.y

        const cell = new CharCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.blink = this.current.blink
        cell.invert = this.current.invert
        cell.mult = this.current.mult
        cell.drcs = this.drcs.g0

        range2([cell.mult.height, cell.mult.width]).forEach((j, i) => {
            const newCell = cell.copy()
            newCell.part = { x: i, y: cell.mult.height - j - 1 }
            this.pm.set(x + i, y - j, newCell)
        })
    }

    printG1Char(charCode) {
        const x = this.pm.cursor.x
        const y = this.pm.cursor.y

        const cell = new MosaicCell()
        cell.value = charCode
        cell.fgColor = this.current.fgColor
        cell.bgColor = this.current.bgColor
        cell.blink = this.current.blink
        cell.separated = this.current.separated
        cell.drcs = this.drcs.g1

        if(cell.value >= 0x20 && cell.value <= 0x5F && !cell.drcs) {
            cell.value += 0x20
        }

        if(cell.separated === true) {
            cell.value -= 0x40
        }

        this.pm.set(x, y, cell)
    }

    print(charCode, dontMove) {
        if(this.current.charType === MosaicCell) {
            this.printG1Char(charCode)
        } else if(charCode === 0x20 && this.serialAttributesDefined()) {
            this.printDelimiter(charCode)
        } else if(this.current.charType === CharCell) {
            this.printG0Char(charCode)
        }

        this.charCode = charCode
        if(!dontMove) {
            this.moveCursor("char")
        }
    }

    repeat(count) {
        count -= 0x40
        range(count).forEach(i => this.print(this.charCode))
    }

    drcsDefineCharset(charset) { this.drcs.charsetToDefine = charset }
    drcsSetStartChar(startChar) { this.drcs.startChar = startChar }
    drcsStart() { this.drcs.count = 0 }
    drcsInc() { this.drcs.count++ }

    drcsDefineChar() {
        const sextets = this.previousBytes.lastValues(this.drcs.count + 1)
                      .slice(0, -1)
                      .map(value => { return (value - 0x40) & 0x3f })

        // Converts 14 6-bits values to 10 8-bits values
        // 0      1      2      3     !4      5      6      7     !8
        // 543210 543210 543210 543210 543210 543210 543210 543210 543210...
        // 765432 107654 321076 543210 765432 107654 321076 543210 765432...

        const bytes = [
            sextets[0] << 2 | sextets[1] >> 4,
            (sextets[1] & 0xf) << 4 | sextets[2] >> 2,
            (sextets[2] & 3) << 6 | sextets[3],

            sextets[4] << 2 | sextets[5] >> 4,
            (sextets[5] & 0xf) << 4 | sextets[6] >> 2,
            (sextets[6] & 3) << 6 | sextets[7],

            sextets[8] << 2 | sextets[9] >> 4,
            (sextets[9] & 0xf) << 4 | sextets[10] >> 2,
            (sextets[10] & 3) << 6 | sextets[11],

            sextets[12] << 2 | sextets[13] >> 4,
        ]

        if(this.drcs.charsetToDefine === "G0") {
            this.pm.defineCharG0(this.drcs.startChar, bytes)
        } else {
            this.pm.defineCharG1(this.drcs.startChar, bytes)
        }

        this.drcs.startChar++
        this.drcs.count = 0
    }

    drcsUseG0(bool) { this.drcs.g0 = bool }
    drcsUseG1(bool) { this.drcs.g1 = bool }

    decode(char) {
        const c = char.charCodeAt(0)

        if(c == 0x00) return

        this.previousBytes.push(c)

        if(!(this.state in Minitel.states)) {
            console.log("Unknown state: " + this.state)
            this.state = "start"
            return
        }

        let action = null
        if(c in Minitel.states[this.state]) {
            action = Minitel.states[this.state][c]
        } else if('*' in Minitel.states[this.state]) {
            action = Minitel.states[this.state]['*']
        }

        if(action === null) {
            console.log("unexpectedChar: " + c)
        } else if("notImplemented" in action) {
            console.log("Not implemented: " + action.notImplemented)
        } else if("error" in action) {
            console.log("Error: " + action.error)
        } else if("func" in action && !(action.func in this)) {
            console.log("Error: developer forgot to write " + action.func)
        } else if("func" in action) {
            let args = []
            if("arg" in action) {
                args = [action.arg]
            } else if("dynarg" in action) {
                args = this.previousBytes.lastValues(action.dynarg)
            }

            this[action.func].apply(this, args)
        }

        this.state = action && "goto" in action ? action.goto : "start"
    }

    decodeList(items) {
        if (typeof items === "string" || items instanceof String) {
            range(items.length).forEach(i => this.decode(items[i]))
        } else {
            range(items.length).forEach(i =>
                this.decode(String.fromCharCode(items[i]))
            )
        }
    }
}
