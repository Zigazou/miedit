"use strict"
var Drawing = Drawing || {}

Drawing.quadBezierCurve = function(start, end, control) {
    function quadBezier(step) {
        return {
            "x": Math.round(
                Math.pow(1 - step, 2) * start.x +
                2 * (1 - step) * step * control.x +
                Math.pow(step, 2) * end.x
            ),
            "y": Math.round(
                Math.pow(1 - step, 2) * start.y +
                2 * (1 - step) * step * control.y +
                Math.pow(step, 2) * end.y
            )
        }
    }

    const increment = 0.001
    let previous = start
    const points = []
    for(let t = increment; t <= 1 + increment; t += increment) {
        const point = quadBezier(t)

        // Increment is small enough to not let appear gaps but this can
        // generate duplicates
        if(previous.x === point.x && previous.y === point.y) continue

        points.push(point)
        previous = point
    }

    const result = []
    for(let i = 0; i < points.length; i++) {
        result.push(points[i])

        // Three successive points must not form an "L"
        if(   points[i + 2]
           && Math.abs(points[i + 2].x - points[i].x) === 1
           && Math.abs(points[i + 2].y - points[i].y) === 1) {
           i++
        }
    }

    return result
}

