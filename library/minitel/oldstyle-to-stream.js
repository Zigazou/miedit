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
            && cell.bgColor === 0
            && cell.fgColor === 1
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
    const attributes = {
        fgColor: 0x07,
        bgColor: 0x00,
        blink: false,
        invert: false,
        separated: false,
        zoneUnderline: false,
        mask: false,
        multWidth: 1,
        multHeight: 1,
        drcs: false
    }

    range(vram.grid.rows).forEach(y => {
        const row = vram.get(y)

        // Ignore empty rows.
        if(emptyRow(row)) return

        const first = firstCell(row)

        // Move the cursor to the first cell of the row.
        stream.push([0x1f, 0x40 + y, 0x40 + first + 1])

        range(first, vram.grid.cols).forEach(x => {
            if(emptyCell(row[x])) {
                stream.push(0x09)
                return
            }
        })
    })

    return stream
}
