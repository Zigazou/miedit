/**
 * @file mosaic-memory.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @typedef {Object} ChangedPoint
 * @property {number} x X coordinate of the pixel
 * @property {number} y Y coordinate of the pixel
 * @property {number} color foreground color of the pixel (0 to 7)
 * @property {number} back background color of the pixel (0 to 7)
 * @property {boolean} separated whether the pixel is disjoint or not
 * @property {boolean} blink whether the pixel is blinking or not
 * @property {number} oldColor Previous foreground color of the pixel (0 to 7)
 * @property {number} oldBack Previous background color of the pixel (0 to 7)
 * @property {boolean} oldSeparated Previous value of separated
 * @property {boolean} oldBlink Previous value of blink
 */

/**
 * @typedef {Object} Pixel
 * @property {number} color foreground color of the pixel (0 to 7)
 * @property {number} back background color of the pixel (0 to 7)
 * @property {boolean} separated whether the pixel is disjoint or not
 * @property {boolean} blink whether the pixel is blinking or not
 * @property {boolean} transparent whether the pixel is transparent or not
 */

/**
 * @typedef {Object} Coordinates
 * @property {number} x X coordinate
 * @property {number} y Y coordinate
 */

/**
 * @callback zoneCallback 
 * @param {number} value Value representing the attributes of the pixel
 * @param {number} x X coordinate of the pixel
 * @param {number} y Y coordinate of the pixel
 *
 */

/**
 * A MosaicZone is an object containing pixel values.
 * It is used to then copy and paste values in a MosaicMemory.
 */
class MosaicZone {
    /**
     * @param {number} width Width in pixels of the zone
     * @param {number} height Height in pixel of the zone
     * @param {number[]} bitmap Array of values
     */
    constructor(width, height, bitmap) {
        if(bitmap === undefined || bitmap.length !== width * height) {
            bitmap = new Array(width * height).fill(-1)
        }

        /**
         * @member {number} Width in pixels of the zone
         * @private
         */
        this.bitmap = bitmap

        /**
         * @member {number} Height in pixel of the zone
         * @private
         */
        this.width = width

        /**
         * @member {number[]} Array of values
         * @private
         */
        this.height = height
    }

    /**
     * Executes a function on each pixel of the MosaicZone
     * @param {zoneCallback} func Function to be executed on each pixel
     */
    forEach(func) {
        this.bitmap.forEach((value, offset) => {
            const x = offset % this.width
            const y = Math.floor(offset / this.width)
            func(value, x, y)
        })
    }
}

/**
 * A MosaicMemory object gives tools to manipulate a mosaic drawing. It does
 * not give a user inteface.
 *
 * To generate compact encoded strings, it stores the attributes of pixels in
 * an integer which has the following format:
 *
 *       8   7   6   5   4   3   2   1   0
 *     .---.---.---.---.---.---.---.---.---.
 *     |TRP|BLK|SEP| background| foreground|
 *     `---'---'---'---'---'---'---'---'---’
 *       |   |   |  \_________/ \_________/                      mask
 *       |   |   |       |            `-------- foreground color 0x7
 *       |   |   |       `--------------------- background color 0x38
 *       |   |   `----------------------------- separated        0x40
 *       |   `--------------------------------- blink            0x80
 *       `------------------------------------- transparent      0x100
 *
 */
class MosaicMemory {
    /**
     * @param {number} width Width in pixels of the mosaic drawing
     * @param {number} height Height in pixels of the mosaic drawing
     */
    constructor(width, height) {
        /**
         * @member {number} Width in pixels of the mosaic drawing
         * @private
         */
        this.width = width

        /**
         * @member {number} Height in pixels of the mosaic drawing
         * @private
         */
        this.height = height

        /**
         * @member {number} Number of pixels of the mosaic drawinging
         * @private
         */
        this.size = width * height

        /**
         * @member {number[]} Holds every pixels of the mosaic drawing. -1 means
         *                    no pixel has been set at this offset
         * @private
         */
        this.memory = new Array(this.size).fill(-1)

        /**
         * @member {Set} List all points that have been changed
         * @private
         */
        this.changedPoints = new Set()

        /**
         * @member {number[]} Holds the value of the changed points before they
         *                    were modified
         * @private
         */
        this.backupMemory = new Array(this.size)
    }

    /**
     * Checks that the X and Y coordinates are valid for this mosaic drawing
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @return {boolean} true if coordinates are valide, false if one or both
     *                   are invalid
     */
    validCoordinates(x, y) {
        if(x < 0 || x >= this.width) return false
        if(y < 0 || y >= this.height) return false

        return true
    }

    /**
     * Returns the pixel value at specific coordinates. The caller must ensure
     * the coordinates are valid before calling this method.
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @return {number} the color of the pixel (0 to 7) 
     */
    getColor(x, y) {
        const value = this.memory[x + y * this.width]
        return (value & 0x100 ? -1 : value & 7)
    }

    /**
     * Draw a point in the mosaic drawing.
     * @param {number} x X coordinate
     * @param {number} y Y coordinate
     * @param {number} color Foreground color (0 to 7)
     * @param {number} back Background color (0 to 7)
     * @param {boolean} separated true if the pixel is disjoint, false if not
     * @param {boolean} blink true if the pixel is blinking, false otherwise
     * @param {number} pointSize size of the point in pixels (1 to 3)
     */
    setPoint(x, y, color, back, separated, blink, pointSize) {
        // Corrects the point size if needed
        if(pointSize === undefined || pointSize < 1 || pointSize > 3) {
            pointSize = 1
        }

        // Defines coordinates of all the pixels making our point
        let points = undefined
        if(pointSize === 1) {
            points = [ [x, y] ]
        } else if(pointSize === 2) {
            points = [ [x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1] ]
        } else {
            points = [ [ x, y], [x + 1, y], [x - 1, y], [x, y - 1], [x, y + 1] ]
        }

        // Draw each pixel if its coordinates are valid
        points.filter(xy => { return this.validCoordinates(xy[0], xy[1]) })
              .forEach(point => {
            const offset = point[0] + point[1] * this.width
            const value = MosaicMemory.colorToValue(
                color, back, separated, blink
            )

            this._setPoint(offset, value)
        })
    }

    /**
     * Draw a pixel in the mosaic drawing.
     * @param {number} offset Offset of the pixel to draw
     * @param {number} value Value of the pixel to draw
     * @private
     */
    _setPoint(offset, value) {
        // Do nothing if the pixel has already the same value
        if(this.memory[offset] === value) return

        // Adds the pixels to the list of changed points if not already done
        if(!this.changedPoints.has(offset)) {
            this.changedPoints.add(offset)

            // Saves its value in the backup memory
            this.backupMemory[offset] = this.memory[offset]
        }

        this.memory[offset] = value
    }

    /**
     * Returns a list of the changed points since last call of this method.
     * @return {ChangedPoint[]}
     */
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

        // Clears the list of changed points        
        this.changedPoints = new Set()

        return points
    }
    
    /**
     * Resets the mosaic drawing with an encoded string.
     * @param {string=} string the encoded string.
     */
    reset(string) {
        if(string === undefined) {
            // No string? Sets an empty mosaic drawing
            string = "ai".repeat(this.size)
        } else if(string.length === this.size) {
            // Old format? Converts it to the new format
            string = MosaicMemory.oldToNewFormat(string)
        } else if(string.length !== 2 * this.size) {
            // Invalid string size? Sets an empty mosaic drawing
            string = "ai".repeat(this.size)
        }

        // Draws each pixels
        range(0, string.length, 2).forEach(offset => {
            this._setPoint(
                offset >> 1,
                MosaicMemory.charToValue(string[offset] + string[offset + 1])
            )
        })
    }

    /**
     * Converts the mosaic drawing to an encoded string.
     * @return {string} the encoded string.
     */
    toString() {
        return this.memory.map(MosaicMemory.toChar).join("")
    }

    /**
     * Moves the mosaic drawing up
     * @param {number} offset Offset to shift
     */
    shiftUp(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            this._setPoint(offset, source[(offset + this.width) % this.size])
        })
    }

    /**
     * Moves the mosaic drawing down
     * @param {number} offset Offset to shift
     */
    shiftDown(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            offset += this.width
            this._setPoint(offset % this.size, source[offset - this.width])
        })
    }

    /**
     * Moves the mosaic drawing left
     * @param {number} offset Offset to shift
     */
    shiftLeft(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            const srcOffset = (offset + 1) % this.width === 0
                            ? offset + 1 - this.width
                            : offset + 1
            this._setPoint(offset, source[srcOffset])
        })
    }

    /**
     * Moves the mosaic drawing right
     * @param {number} offset Offset to shift
     */
    shiftRight(offset) {
        const source = this.memory.slice()
        this.memory.forEach((value, offset) => {
            const srcOffset = offset % this.width === 0
                            ? offset - 1 + this.width
                            : offset - 1
            this._setPoint(offset, source[srcOffset])
        })
    }

    /**
     * Returns pixels in a rectangular area in a MosaicZone
     * @param {Coordinates} start The starting point (included)
     * @param {Coordinates} end The ending point (included)
     * @return {MosaicZone} Offset to shift
     */
    getRect(start, end) {
        // Reorganize coordinates so that start < end
        const yStart = Math.min(start.y * this.width, end.y * this.width)
        const yEnd = Math.max(start.y * this.width, end.y * this.width)
        const xStart = Math.min(start.x, end.x)
        const xEnd = Math.max(start.x, end.x)

        // Calculates width and height of the area
        const width = xEnd - xStart
        const height = yEnd / this.width - yStart / this.width

        // Do nothing if area is null
        if(width === 0 || height === 0) return

        // Copy each point
        const points = []
        range(yStart, yEnd, this.width).forEach(y => {
            this.memory.slice(y + xStart, y + xEnd).forEach(point => {
                points.push(point)
            })
        })

        return new MosaicZone(width, height, points)
    }

    /**
     * Paste a MosaicZone on the current mosaic drawing
     * @param {MosaicZone} zone The MosaicZone to paste
     * @param {Coordinates} destination Where to paste
     */
    putRect(zone, destination) {
        zone.forEach((value, x, y) => {
            const pixel = MosaicMemory.toPixel(value)
            if(pixel.transparent) { return }

            this.setPoint(
                x + destination.x,
                y + destination.y,
                pixel.color,
                pixel.back,
                pixel.separated,
                pixel.blink
            )
        })
    }

    /**
     * Given a starting point, find all points which are adjacents to it or its
     * adjacents points while having the same color
     * @param {number} startX X coordinate of the starting point
     * @param {number} startY Y coordinate of the starting point
     * @return {Coordinates[]} An array of all such points coordinates
     */
    getArea(startX, startY) {
        // Starting point must be valid
        if(!this.validCoordinates(startX, startY)) return

        // Set of points to explore
        const exploring = new Set()

        // Set of already explored points
        const explored = new Set()

        // Points satisfying our conditions
        const points = []

        // The algorithm works with offsets, not with coordinates
        const startOffset = startX + startY * this.width

        // Starting color
        const startColor = this.memory[startOffset]

        // The starting point is the first point to explore
        exploring.add(startOffset)

        while(exploring.size !== 0) {
            // Get the offset to explore
            const offset = exploring.values().next().value

            // Removes this offset from the set of offsets to explore and add
            // it to the set of offsets that have been explored
            exploring.delete(offset)
            explored.add(offset)

            // If the offset does not contain the desired color, ignore it
            const color = this.memory[offset]
            if(color !== startColor) continue

            // The offset contains the desired color, adds it to the points we
            // will be returning
            points.push({
                x: offset % this.width,
                y: Math.floor(offset / this.width)
            })

            // Tests the offset one line above this one
            const offsetUp = offset - this.width
            if(offsetUp >= 0 && !explored.has(offsetUp)) {
                exploring.add(offsetUp)
            }

            // Tests the offset one line below this one
            const offsetDown = offset + this.width
            if(offsetDown < this.size && !explored.has(offsetDown)) {
                exploring.add(offsetDown)
            }

            // Tests the offset one pixel left this one
            const offsetLeft = offset - 1
            if(offset % this.width !== 0 && !explored.has(offsetLeft)) {
                exploring.add(offsetLeft)
            }

            // Tests the offset one pixel right this one
            const offsetRight = offset + 1
            if(offsetRight % this.width !== 0 && !explored.has(offsetRight)) {
                exploring.add(offsetRight)
            }
        }

        return points
    }
}

/**
 * Characters used to encode a MosaicMemory to a string (32 values)
 * @static
 */
MosaicMemory.codeChars = "abcdefghijklmnopqrstuvwxyz012345"

/**
 * Converts a value to a Pixel object.
 *
 * @param {number} value Value to convert
 * @return {Pixel} the pixel corresponding to the value
 * @static
 */
MosaicMemory.toPixel = function(value) {
    return {
        color: value & 0x100 ? -1 : value & 0x7,
        back: value & 0x100 ? -1 : (value & 0x38) >> 3,
        separated: value & 0x40 ? true : false,
        blink: value & 0x80 ? true : false,
        transparent: value & 0x100 ? true : false
    }
}

/**
 * Converts a value to an encoded string.
 *
 * @param {number} value Value to convert
 * @return {string} A 2 characters string
 * @static
 */
MosaicMemory.toChar = function(value) {
    return MosaicMemory.codeChars[value & 0x1f]
         + MosaicMemory.codeChars[value >> 5]
}

/**
 * Converts a Pixel to a value.
 *
 * @param {Pixel} pixel Pixel to convert
 * @return {number} The value
 * @static
 */
MosaicMemory.pixelToValue = function(pixel) {
    const transparent = pixel.color < 0 || pixel.transparent
    if(transparent) {
        return 0x100
    } else {
        return (pixel.color & 0x7)
             | (((pixel.separated ? pixel.back : pixel.color) & 0x7) << 3)
             | (pixel.separated ? 0x40 : 0)
             | (pixel.blink ? 0x80 : 0)
    }
}

/**
 * Converts attributes to a value.
 *
 * @param {number} color The foreground color (0 to 7)
 * @param {number} back The background color (0 to 7)
 * @param {boolean} separated Whether the pixel is disjoint or not
 * @param {boolean} blink Whether the pixel is blinking or not
 * @return {number} The value
 * @static
 */
MosaicMemory.colorToValue = function(color, back, separated, blink) {
    if(color < 0) {
        return 0x100
    } else {
        return (color & 0x7)
             | (((separated ? back : color) & 0x7) << 3)
             | (separated ? 0x40 : 0)
             | (blink ? 0x80 : 0)
    }
}

/**
 * Converts an encoded 2 characters string to a value.
 *
 * @param {string} char 2 characters string to convert
 * @return {number} The value
 * @static
 */
MosaicMemory.charToValue = function(char) {
    if(char.length !== 2) return 0x100

    const first = MosaicMemory.codeChars.indexOf(char[0])
    const second = MosaicMemory.codeChars.indexOf(char[1])

    if(first < 0 || second < 0) return 0x100
    return first | (second << 5)
}

/**
 * Converts the old encoded string format to the new format.
 *
 * @param {string} oldFormat A string encoded in the old format
 * @return {string} The encoded string
 * @static
 */
MosaicMemory.oldToNewFormat = function(oldFormat) {
    const fullChars = "abcdefgh"
    const sepChars = "ABCDEFGH"

    let newFormat = ""
    oldFormat.split("").forEach(char => {
        const pixel = {
            color: 0,
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
