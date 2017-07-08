/**
 * @file MosaicMemory
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @class MosaicZone
 */
class MozaicZone {
    constructor(width, height, bitmap) {
        if(bitmap === undefined || bitmap.length !== width * height) {
            bitmap = new Array(width * height).fill(-1)
        }

        this.bitmap = bitmap
        this.width = width
        this.height = height
    }

    forEach(func) {
        this.bitmap.forEach((value, offset) => {
            const x = offset % this.width
            const y = Math.floor(offset / this.width)
            func(value, x, y)
        })
    }
}

/**
 * @class MosaicMemory
 */
class MosaicMemory {
    /**
     * @param {number} width
     * @param {number} height
     */
    constructor(width, height) {
        this.width = width
        this.height = height
        this.size = width * height
        this.memory = new Array(this.size)

        this.changedPoints = new Set()
        this.backupMemory = new Array(this.size)
    }

    validCoordinates(x, y) {
        if(x < 0 || x >= this.width) return false
        if(y < 0 || y >= this.height) return false

        return true
    }

    setPoint(x, y, color, separated) {
        if(!this.validCoordinates(x, y)) return

        const offset = x + y * this.width
        const value = MosaicMemory.colorToValue(color, separated)

        this._setPoint(offset, value)
    }

    _setPoint(offset, value) {
        if(this.memory[offset] === value) return

        if(!this.changedPoints.has(offset)) {
            this.changedPoints.add(offset)
            this.backupMemory[offset] = this.memory[offset]
        }

        this.memory[offset] = value
    }

    getChangedPoints() {
        const points = Array.from(this.changedPoints.values(), offset => {
            const pixel = MosaicMemory.toPixel(this.backupMemory[offset])
            return {
                x: offset % this.width,
                y: Math.floor(offset / this.width),
                color: pixel.color,
                separated: pixel.separated
            }
        })
        
        this.changedPoints = new Set()
        return points
    }
    
    reset(string) {
        if(string === undefined || string.length !== this.size) {
            string = "-".repeat(this.size)
        }

        string.split("").forEach((char, offset) => {
            this.memory[offset] = MosaicMemory.charToValue(char)
        }
    }

    toString() {
        return this.memory.map(MosaicMemory.toChar).join()
    }

    shiftUp(offset) {
        for(let i = 0; i < offset; i++) {
            this.memory.push(this.memory.shift())
        }
    }

    shiftDown(offset) {
        for(let i = 0; i < offset; i++) {
            this.memory.unshift(this.memory.pop())
        }
    }

    shiftLeft(offset) {
        for(let y = 0; y < this.resolution.height; y++) {
            for(let i = 0; i < offset; i++) {
                this.memory[y].push(this.memory[y].shift())
            }
        }
    }

    shiftRight(offset) {
        for(let y = 0; y < this.resolution.height; y++) {
            for(let i = 0; i < offset; i++) {
                this.memory[y].unshift(this.memory[y].pop())
            }
        }
    }

    getRect(start, end) {
        const yStart = Math.min(start.y * this.width, end.y * this.width)
        const yEnd = Math.max(start.y * this.width, end.y * this.width)
        const xStart = Math.min(start.x, end.x)
        const xEnd = Math.max(start.x, end.x)

        const [ width, height ] = [ xEnd - xStart + 1, yEnd - yStart + 1 ]

        if(width === 0 || height === 0) return

        const rows = []
        for(let y = yStart; y <= yEnd; y+= this.width) {
            rows.push(this.memory.slice(y + xStart, y + xEnd))
        }

        return new MosaicZone(width, height, rows.concat())
    }

    putRect(zone, destination) {
        zone.forEach((value, x, y) => {
            if(value < 0) return

            const pixel = MosaicMemory.toPixel(value)
            this.setPoint(
                x + destination.x,
                y + destination.y,
                pixel.color,
                pixel.separated
            )
        })
    }

    getArea(startX, startY) {
        if(!this.validPoint(startX, startY) return

        const exploring = new Set()
        const explored = new Set()
        const points = []

        const startOffset = x + y * this.width
        const startColor = this.memory[startOffset].color

        exploring.add(startOffset)

        while(exploring.size !== 0) {
            const offset = exploring.values().next().value
            exploring.delete(offset)
            explored.add(offset)

            const color = this.memory[offset]
            if(color !== startColor) continue

            points.push({
                x: x % this.width,
                y: Math.floor(y / this.width)
            })

            const offsetUp = offset - this.width
            if(offsetUp >= 0 && !explored.has(offsetUp)) {
                exploring.add(offsetUp)
            }

            const offsetDown = offset + this.width
            if(offsetDown < this.size && !explored.has(offsetDown)) {
                exploring.add(offsetDown)
            }

            const offsetLeft = offset - 1
            if(offset % this.width !== 0 && !explored.has(offsetLeft)) {
                exploring.add(offsetLeft)
            }

            const offsetRight = offset + 1
            if(offsetRight % this.width !== 0 && !explored.has(offsetRight) {
                exploring.add(offsetRight)
            }
        }

        return points
    }
}

MosaicMemory.fullCahrs = "abcdefgh"
MosaicMemory.sepChars = "ABCDEFGH"

MosaicMemory.toPixel = function(value) {
    if(value < 0) return { color: -1, separated: false }
    if(value & 0x100) return { color: value & 0xff, separated: true }
    return { color: value, separated: false }
}

MosaicMemory.toChar = function(value) {
    if(value < 0) return "-"
    if(value & 0x100) return MosaicMemory.sepChars[value & 0xff]
    return MosaicMemory.fullChars[value]
}

MosaicMemory.pixelToValue = function(pixel) {
    if(pixel.color < 0) return -1
    if(pixel.separated) return pixel.color + 256
    return pixel.color
}

MosaicMemory.colorToValue = function(color, separated) {
    if(color < 0) return -1
    if(separated) return color + 256
    return color
}

MosaicMemory.charToValue = function(char) {
    if(char === "-") return -1
    let value = MosaicMemory.fullChars.indexOf(char)
    if(value < 0) value = 0x100 | MosaicMemory.sepChars.indexOf(char)

    return value
}
