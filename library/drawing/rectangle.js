"use strict"
var Drawing = Drawing || {}
/**
 * @typedef {Object} Coordinates
 * @property {number} x X coordinates
 * @property {number} y Y coordinates
 */

/**
 * Returns the points drawing a rectangle. Coordinates can be given in any order
 *
 * @param {Coordinates} start
 * @param {Coordinates} end
 * @return {Coordinates[]}
 */
Drawing.rectangle = function(start, end) {
    const points = []

    // First row, last row, first column, last column
    let [ up, down, left, right ] = [ 0, 0, 0, 0 ]

    // Determines first and last column
    if(start.x < end.x) {
        [ left, right ] = [ start.x, end.x ]
    } else {
        [ left, right ] = [ end.x, start.x ]
    }
    
    // Determines first and last row
    if(start.y < end.y) {
        [ up, down ] = [ start.y, end.y ]
    } else {
        [ up, down ] = [ end.y, start.y ]
    }

    // Draw the first and last row
    for(let x = left; x <= right; x++) {
        points.push({ x: x, y: up }, { x: x, y: down })
    }

    // Draw the first and last column
    for(let y = up; y <= down; y++) {
        points.push({ x: left, y: y }, { x: right, y: y })
    }    

    return points
}

