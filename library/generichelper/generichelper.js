"use strict"

function* range(start, end, step) {
    if(start === undefined || start === end) return

    if(end === undefined) {
        end = start
        start = 0
    }

    if(step === undefined) step = 1

    step = Math.abs(step)

    if(end < start) {
        for(let i = end; i > start; i -= step) yield i
    } else {
        for(let i = start; i < end; i += step) yield i
    }
}

range().__proto__.forEach = function(func) {
    for(let i of this) func(i)
}

function* range2(starts, ends, steps) {
    if(starts === undefined) return

    if(ends === undefined) {
        ends = starts
        starts = [ 0, 0 ]
    }

    if(steps === undefined) steps = [ 1, 1 ]

    const [ jStart, iStart ] = starts
    const [ jEnd, iEnd ] = ends
    const [ jStep, iStep ] = steps

    for(let j = jStart; j < jEnd; j += jStep) {
        for(let i = iStart; i < iEnd; i += iStep) {
            yield [j, i]
        }
    }
}

range2().__proto__.forEach = function(func) {
    for(let [ j, i ] of this) func(j, i)
}

function repeat(item, count) {
    const array = new Array(count)
    for(let i = 0; i < count; i++) array[i] = item
    return array
}
