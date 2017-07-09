/**
 * @file MosaicMemory
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @class MosaicZone
 */
class MosaicZone {
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
        this.memory = new Array(this.size).fill(-1)

        this.changedPoints = new Set()
        this.backupMemory = new Array(this.size)
    }

    validCoordinates(x, y) {
        if(x < 0 || x >= this.width) return false
        if(y < 0 || y >= this.height) return false

        return true
    }

    getColor(x, y) {
        const value = this.memory[x + y * this.width]
        return (value & 0x100 ? -1 : value & 7)
    }

    setPoint(x, y, color, back, separated, blink, pointSize) {
        if(pointSize === undefined || pointSize < 0 || pointSize > 3) {
            pointSize = 1
        }

        let points = undefined
        if(pointSize === 1) {
            points = [ [x, y] ]
        } else if(pointSize === 2) {
            points = [ [x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1] ]
        } else {
            points = [ [ x, y], [x + 1, y], [x - 1, y], [x, y - 1], [x, y + 1] ]
        }

        points = points

        points.filter(xy => { return this.validCoordinates(xy[0], xy[1]) })
              .forEach(point => {
            const offset = point[0] + point[1] * this.width
            const value = MosaicMemory.colorToValue(
                color, back, separated, blink
            )

            this._setPoint(offset, value)
        })
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
            const oldPixel = MosaicMemory.toPixel(this.backupMemory[offset])
            const newPixel = MosaicMemory.toPixel(this.memory[offset])
            return {
                x: offset % this.width,
                y: Math.floor(offset / this.width),
                color: newPixel.color,
                back: newPixel.back,
                separated: newPixel.separated,
                blink: newPixel.blink,
                oldColor: oldPixel.color,
                oldBack: oldPixel.back,
                oldSeparated: oldPixel.separated,
                oldBlink: oldPixel.blink
            }
        })
        
        this.changedPoints = new Set()
        return points
    }
    
    reset(string) {
        if(string === undefined) {
            string = "ai".repeat(this.size)
        } else if(string.length === this.size) {
            string = MosaicMemory.oldToNewFormat(string)
        } else if(string.length !== 2 * this.size) {
            string = "ai".repeat(this.size)
        }

        for(let offset = 0; offset < string.length; offset += 2) {
            this._setPoint(
                offset >> 1,
                MosaicMemory.charToValue(string[offset] + string[offset + 1])
            )
        }
    }

    toString() {
        return this.memory.map(MosaicMemory.toChar).join("")
    }

    shiftUp(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            this._setPoint(offset, source[(offset + this.width) % this.size])
        })
    }

    shiftDown(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            offset += this.width
            this._setPoint(offset % this.size, source[offset - this.width])
        })
    }

    shiftLeft(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            const srcOffset = (offset + 1) % this.width === 0
                            ? offset + 1 - this.width
                            : offset + 1
            this._setPoint(offset, source[srcOffset])
        })
    }

    shiftRight(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            const srcOffset = offset % this.width === 0
                            ? offset - 1 + this.width
                            : offset - 1
            this._setPoint(offset, source[srcOffset])
        })
    }

    getRect(start, end) {
        const yStart = Math.min(start.y * this.width, end.y * this.width)
        const yEnd = Math.max(start.y * this.width, end.y * this.width)
        const xStart = Math.min(start.x, end.x)
        const xEnd = Math.max(start.x, end.x)

        const width = xEnd - xStart
        const height = yEnd / this.width - yStart / this.width

        if(width === 0 || height === 0) return

        const points = []
        for(let y = yStart; y < yEnd; y+= this.width) {
            this.memory.slice(y + xStart, y + xEnd).forEach(point => {
                points.push(point)
            })
        }

        return new MosaicZone(width, height, points)
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
        if(!this.validCoordinates(startX, startY)) return

        const exploring = new Set()
        const explored = new Set()
        const points = []

        const startOffset = startX + startY * this.width
        const startColor = this.memory[startOffset]

        exploring.add(startOffset)

        while(exploring.size !== 0) {
            const offset = exploring.values().next().value
            exploring.delete(offset)
            explored.add(offset)

            const color = this.memory[offset]
            if(color !== startColor) continue

            points.push({
                x: offset % this.width,
                y: Math.floor(offset / this.width)
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
            if(offsetRight % this.width !== 0 && !explored.has(offsetRight)) {
                exploring.add(offsetRight)
            }
        }

        return points
    }
}

MosaicMemory.codeChars = "abcdefghijklmnopqrstuvwxyz012345"

/*
 *   8   7   6   5   4   3   2   1   0
 * .---.---.---.---.---.---.---.---.---.
 * |TRP|BLK|SEP| background| foreground|
 * `---'---'---'---'---'---'---'---'---’
 *   |   |   |  \_________/ \_________/                      mask
 *   |   |   |       |            `-------- foreground color 0x7
 *   |   |   |       `--------------------- background color 0x38 >> 3
 *   |   |   `----------------------------- separated        0x40
 *   |   `--------------------------------- blink            0x80
 *   `------------------------------------- transparent      0x100
 */
MosaicMemory.toPixel = function(value) {
    return {
        color: value & 0x100 ? 0 : value & 0x7,
        back: value & 0x100 ? 0 : (value & 0x38) >> 3,
        separated: value & 0x40 ? true : false,
        blink: value & 0x80 ? true : false,
        transparent: value & 0x100 ? true : false
    }
}

MosaicMemory.toChar = function(value) {
    return MosaicMemory.codeChars[value & 0x1f]
         + MosaicMemory.codeChars[value >> 5]
}

MosaicMemory.pixelToValue = function(pixel) {
    return (pixel.color < 0 ? -1 : pixel.color & 0x7)
         | (pixel.back < 0 ? -1 : (pixel.back & 0x7) << 3)
         | (pixel.separated ? 0x40 : 0)
         | (pixel.blink ? 0x80 : 0)
         | (pixel.color < 0 ? 0x100 : 0)
}

MosaicMemory.colorToValue = function(color, back, separated, blink) {
    return (color < 0 ? -1 : color & 0x7)
         | (back < 0 ? -1 : (back & 0x7) << 3)
         | (separated ? 0x40 : 0)
         | (blink ? 0x80 : 0)
         | (color < 0 ? 0x100 : 0)
}

MosaicMemory.charToValue = function(char) {
    if(char.length !== 2) return 0x100

    const first = MosaicMemory.codeChars.indexOf(char[0])
    const second = MosaicMemory.codeChars.indexOf(char[1])

    if(first < 0 || second < 0) return 0x100
    return first | (second << 5)
}

MosaicMemory.oldToNewFormat = function(oldFormat) {
    const fullChars = "abcdefg"
    const sepChars = "ABCDEFG"

    let newFormat = ""
    oldFormat.split("").forEach(char => {
        const pixel = {
            color: 0 ,
            back: 0,
            separated: false,
            blink: false,
            transparent: true
        }
            
        if(char !== "-") {
            let value = fullChars.indexOf(char)
            if(value >= 0) {
                pixel.color = value
                pixel.transparent = false
            } else {
                value = sepChars.indexOf(char)
                if(value >= 0) {
                    pixel.color = value
                    pixel.separated = true
                    pixel.transparent = false
                }
            }
        }
 
        newFormat += MosaicMemory.toChar(MosaicMemory.pixelToValue(pixel))
   })

    return newFormat
}
