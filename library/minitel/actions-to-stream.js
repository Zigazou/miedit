"use strict"
var Minitel = Minitel || {}

Minitel.actionsToStream = function(actions, offsetX, offsetY) {
    if(offsetX === undefined) offsetX = 0
    if(offsetY === undefined) offsetY = 0
    const stream = new Minitel.Stream()

    for(let action of actions) {
        if(action.type in Minitel.directStream) {
            stream.push(Minitel.directStream[action.type])
            continue
        }

        if(action.type === "content-group") {
            if(action.data.disabled) continue
            stream.push(Minitel.actionsToStream(
                action.children,
                offsetX + parseInt(action.data.offsetX),
                offsetY + parseInt(action.data.offsetY)
            ))
        } else if(action.type === "content-string") {
            stream.push(action.data.value)
        } else if(action.type === "content-block") {
            const x = offsetX + parseInt(action.data.x) + 1
            const y = offsetY + parseInt(action.data.y)
            const width = parseInt(action.data.width)
            const height = parseInt(action.data.height)
            const maxHeight = y + height - 1
            const value = action.data.value.replace(/\r/g, "")
                                           .replace(/ +/g, " ")

            const rows = splitRows(value, width).slice(0, height)
            let py = y - 1
            for(let row of rows) {
                py += 1
                if(row.length === 0) continue
                let px = x
                if(action.data.align === "center") {
                    px += Math.floor((width - row.length) / 2)
                } else if(action.data.align === "right") {
                    px += width - row.length
                }
                stream.push([0x1f, 0x40 + py, 0x40 + px])
                stream.push(row)
            }
        } else if(action.type === "content-box") {
            const x = offsetX + parseInt(action.data.x) + 1
            const y = offsetY + parseInt(action.data.y)
            const width = parseInt(action.data.width)
            const height = parseInt(action.data.height)
            const bgcolor = parseInt(action.data.bgcolor)

            for(let row = y; row < y + height; row++) {
                stream.push([0x1f, 0x40 + row, 0x40 + x])
                stream.push([0x0e, 0x1b, 0x50 + bgcolor])
                stream.push(0x20)
                stream.push([0x12, 0x40 + width - 1])
            }
        } else if(action.type === "content-graphics") {
            const x = offsetX + parseInt(action.data.x)
            const y = offsetY + parseInt(action.data.y)
            stream.push(Minitel.graphicsToStream(action.data.value, x, y))
        } else if(action.type === "content-ceefax") {
            stream.push([0x1f, 0x41, 0x41])
            stream.push(Minitel.ceefaxToStream(action.data.value))
        } else if(action.type === "move-home") {
            if(offsetX !== 0 || offsetY !== 0) {
                stream.push(0x1f)
                stream.push(0x40 + parseInt(offsetY))
                stream.push(0x40 + parseInt(offsetX) + 1)
            } else {
                stream.push(0x1e)
            }
        } else if(action.type === "move-locate") {
            stream.push(0x1f)
            stream.push(0x40 + parseInt(action.data.y) + offsetY)
            stream.push(0x40 + parseInt(action.data.x) + offsetX + 1)
        } else if(action.type === "content-delay") {
            for(let i = 0; i < parseInt(action.data.value); i++) {
                stream.push(0x00)
            }
        }
    }

    return stream
}
