"use strict"
/**
 * @file oldstyle-to-stream.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 */

/**
 * @namespace Minitel
 */
var Minitel = Minitel || {}

/**
 * Convert an old style editor screen to a Minitel Stream
 * @param {string} string Encoded string of the screen
 * @return {Stream} The Minitel Stream
 */
Minitel.oldstyleToStream = function(string) {
    function emptyCell(cell) {
        return cell instanceof Minitel.MosaicCell
            && cell.value === 0x40
            && cell.bgColor === 0x00
            && cell.fgColor === 0x07
            && cell.blink === false
            && cell.separated === false
    }

    function emptyRow(row) {
        return row.find(cell => !emptyCell(cell)) === undefined
    }

    function firstCell(row) {
        return row.findIndex(cell => !emptyCell(cell))
    }

    const stream = new Minitel.Stream()

    if(string === undefined) return stream

    const vram = new Minitel.VRAM(
        new Minitel.TextGrid(Minitel.columns, Minitel.rows)
    )

    // Load the screen into the VRAM.
    vram.load(string)

    // All the available attributes in one record.
    range(1, vram.grid.rows).forEach(y => {
        const row = vram.get(y)

        // Ignore empty rows.
        if(emptyRow(row)) return

        const first = firstCell(row)

        // Move the cursor to the first cell of the row.
        stream.push([0x1f, 0x40 + y, 0x40 + first + 1])

        const rowStream = new Minitel.Stream()
        let ignore = 0
        range(first, vram.grid.cols).forEach(x => {
            const cell = row[x]
            let value = cell.value

            // Ignore empty cells
            if(emptyCell(cell)) {
                ignore++
                return
            }

            // Empty cells have been ignored, we must move the cursor on the
            // right.
            if(ignore > 0) {
                rowStream.push(Array(ignore).fill(0x09))
                ignore = 0
            }

            rowStream.push([0x1B, 0x40 + cell.fgColor])

            if(cell instanceof Minitel.CharCell) {
                if(value < 0x20) {
                    for(let char in Minitel.rawChars) {
                        if(Minitel.rawChars[char] === value) {
                            value = Minitel.keys.Videotex[char]
                            break
                        }
                    }
                }

                rowStream.push(0x0F)
                rowStream.push([0x1B, cell.blink ? 0x48 : 0x49])
                rowStream.push([0x1B, cell.invert ? 0x5D : 0x5C])

                if(cell.rootPart()) {
                    rowStream.push([
                        0x1B,
                        0x4C + cell.mult.height - 1 + (cell.mult.width - 1) * 2
                    ])
                } else {
                    if(cell.upperPart()) {
                        value = 0x09
                    } else {
                        if(cell.mult.width !== 1) value = 0x00
                    }
                }

                // TODO: drcs
            } else if(cell instanceof Minitel.MosaicCell) {
                // Raw values for mosaic are not the same as Videotex values.
                if(cell.separated) value += 64

                value = value < 96
                      ? value - 32
                      : value

                rowStream.push(0x0E)
                rowStream.push([0x1B, 0x50 + cell.bgColor])
                rowStream.push([0x1B, cell.blink ? 0x48 : 0x49])
                rowStream.push([0x1B, cell.separated ? 0x5A : 0x59])
                // TODO: drcs
            } else {
                value = 0x20
                rowStream.push(0x0F)
                rowStream.push([0x1B, 0x50 + cell.bgColor])
                rowStream.push([0x1B, cell.invert ? 0x5D : 0x5C])
                rowStream.push([0x1B, cell.zoneUnderline ? 0x5A : 0x59])
                rowStream.push([0x1B, cell.mask ? 0x58 : 0x5F])
            }

            rowStream.push(value)
        })

        stream.push(rowStream.optimizeRow(true))
    })

    return stream
}
