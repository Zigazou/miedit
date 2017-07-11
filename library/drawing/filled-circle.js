"use strict"
var Drawing = Drawing || {}

Drawing.filledCircle = function(center, radius, pixelRatio) {
    const [ width, height ] = [ radius, Math.floor(radius * pixelRatio) ]

    let [a2, b2] = [ width * width, height * height ]
    let [fa2, fb2] = [ 4 * a2, 4 * b2 ]
    let [x, y] = [ 0, 0 ]
    let sigma = 0

    const points = []

    y = height
    sigma = 2 * b2 + a2 * (1 - 2 * height)
    for (x = 0; b2 * x <= a2 * y; x++) {
        for(let lx = -x; lx <= x; lx++) {
            points.push(
                { x: center.x + lx, y: center.y + y },
                { x: center.x + lx, y: center.y - y }
            )
        }

        if(sigma >= 0) {
            sigma += fa2 * (1 - y)
            y--
        }
        sigma += b2 * (4 * x + 6)
    }

    x = width
    sigma = 2 * a2 + b2 * (1 - 2 * width)
    for (y = 0; a2 * y <= b2 * x; y++) {
        for(let lx = -x; lx <= x; lx++) {
            points.push(
                { x: center.x + lx, y: center.y + y },
                { x: center.x + lx, y: center.y - y }
            )
        }

        if(sigma >= 0) {
            sigma += fb2 * (1 - x)
            x--
        }
        sigma += a2 * (4 * y + 6)
    }

    return points
}

