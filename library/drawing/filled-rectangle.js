"use strict"
var Drawing = Drawing || {}

Drawing.filledRectangle = function(start, end) {
    const points = []

    let [ up, down, left, right ] = [ 0, 0, 0, 0 ]

    if(start.x < end.x) {
        [ left, right ] = [ start.x, end.x ]
    } else {
        [ left, right ] = [ end.x, start.x ]
    }
    
    if(start.y < end.y) {
        [ up, down ] = [ start.y, end.y ]
    } else {
        [ up, down ] = [ end.y, start.y ]
    }

    for(let y = up; y <= down; y++) {
        for(let x = left; x <= right; x++) {
            points.push({ x: x, y: y })
        }
    }

    return points
}

