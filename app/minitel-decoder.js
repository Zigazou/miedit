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

        this.waiting = {
            bgColor: undefined,
            mask: undefined,
            underline: undefined
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
            separated: false
        }
    }

    serialAttributesDefined() {
        return this.waiting.bgColor !== undefined
            || this.waiting.underline !== undefined
            || this.waiting.mask !== undefined
    }

    moveCursor(direction) {
        switch(direction) {
            case "char":
                this.pm.cursor.x += this.current.mult.width
                if(this.pm.cursor.x >= this.pm.grid.cols) {
                    if(this.pm.cursor.y == 0) {
                        // No overflow on status line
                        this.pm.cursor.x = this.pm.grid.cols - 1
                    } else {
                        // Go to start of next row
                        this.pm.cursor.x = 0
                        for(let i = 0; i < this.current.mult.height; i++) {
                            this.moveCursor("down")
                        }
                    }
                }

                break

            case "left":
                this.pm.cursor.x--
                if(this.pm.cursor.x < 0) {
                    this.pm.cursor.x = this.pm.grid.cols - 1
                    this.moveCursor("up")
                }

                break

            case "right":
                this.pm.cursor.x++
                if(this.pm.cursor.x >= this.pm.grid.cols) {
                    this.pm.cursor.x = 0
                    this.moveCursor("down")
                }

                break

            case "up":
                if(this.pm.cursor.y == 0) break

                this.pm.cursor.y--

                if(this.pm.cursor.y == 0) {
                    if(this.pageMode) {
                        this.pm.cursor.y = this.pm.grid.rows - 1
                    } else {
                        this.pm.cursor.y = 1
                        this.pm.scroll("down")
                    }
                }
                break

            case "down":
                if(this.pm.cursor.y == 0) break

                this.pm.cursor.y++

                if(this.pm.cursor.y == this.pm.grid.rows) {
                    if(this.pageMode) {
                        this.pm.cursor.y = 1
                    } else {
                        this.pm.cursor.y = this.pm.grid.rows - 1
                        this.pm.scroll("up")
                    }
                }
                break


            case "firstColumn":
                this.pm.cursor.x = 0
                break

            case "home":
                this.pm.cursor.x = 0
                this.pm.cursor.y = 1
                this.resetCurrent()
                break
        }
    }

    clear(range) {
        if(range === "page") {
            this.pm.clear()
            this.pm.cursor.x = 0
            this.pm.cursor.y = 1
            this.resetCurrent()
            return
        }

        if(range === "status") {
            let row = []
            for(let i = 0; i < this.pm.grid.cols; i++) {
                this.pm.set(i, 0, new MosaicCell())
            }
            return
        }

        if(range === "eol") {
            const saveX = this.pm.cursor.x
            const saveY = this.pm.cursor.y
            for(let i = this.pm.cursor.x; i < this.pm.grid.cols; i++) {
                this.print(0x20)
            }
            this.pm.cursor = { x: saveX, y: saveY }
            return
        }
    }

    setPageMode(bool) {
        this.pageMode = bool
    }

    setCharType(charPage) {
        if(charPage === "G0" && this.current.charType === CharCell) return
        if(charPage === "G1" && this.current.charType === MosaicCell) return

        if(charPage === "G0") {
            this.current.charType = CharCell
            this.current.separated = false
        } else if(charPage === "G1") {
            this.current.charType = MosaicCell
            this.current.underline = false
            this.current.invert = false
            this.current.mult = { width: 1, height: 1 }
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
        x -= 0x40
        y -= 0x40

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

        for(let j = 0; j < cell.mult.height; j++) {
            for(let i = 0; i < cell.mult.width; i++) {
                const newCell = cell.copy()
                this.pm.set(x + i, y - j, newCell)
            }
        }
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

        for(let j = 0; j < cell.mult.height; j++) {
            for(let i = 0; i < cell.mult.width; i++) {
                const newCell = cell.copy()
                newCell.part = { x: i, y: cell.mult.height - j - 1 }
                this.pm.set(x + i, y - j, newCell)
            }
        }
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

        if(cell.value >= 0x20 && cell.value <= 0x5F) {
            cell.value += 0x20
        }

        if(cell.separated === true) {
            cell.value -= 0x40
        }

        this.pm.set(x, y, cell)
    }

    print(charCode) {
        if(charCode === 0x20 && this.serialAttributesDefined()) {
            this.printDelimiter(charCode)
        } else if(this.current.charType === CharCell) {
            this.printG0Char(charCode)
        } else if(this.current.charType === MosaicCell) {
            this.printG1Char(charCode)
        }

        this.charCode = charCode
        this.moveCursor("char")
    }

    repeat(count) {
        count -= 0x40
        for(let i = 0; i < count; i++) {
            this.print(this.charCode)
        }
    }

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
            for(let i = 0; i < items.length; i++) {
                this.decode(items[i])
            }
        } else {
            for(let i = 0; i < items.length; i++) {
                this.decode(String.fromCharCode(items[i]))
            }
        }
    }
}
