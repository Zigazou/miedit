"use strict"
var Drawing = Drawing || {}

Drawing.line = function(first, last) {
    // Bresenham algorithm
    let x0 = first.x
    let y0 = first.y
    let x1 = last.x
    let y1 = last.y
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = (x0 < x1) ? 1 : -1
    const sy = (y0 < y1) ? 1 : -1
    let err = dx - dy

    const points = []

    while(true) {
        points.push( { x: x0, y: y0 })

        if(x0 === x1 && y0 === y1) break

        let e2 = 2 * err
        if(e2 > -dy) {
            err -= dy
            x0 += sx
        }

        if(e2 < dx) {
            err += dx
            y0 += sy
        }
    }

    return points
}

