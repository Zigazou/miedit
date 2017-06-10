"use strict"

const directStream = {
    "content-delay": [0x00],
    "clear-screen": [0x0c],
    "move-up": [0x0b],
    "move-down": [0x0a],
    "move-left": [0x08],
    "move-right": [0x09],
    "move-sol": [0x0d],
    "content-g0": [0x0f],
    "content-g1": [0x0e],
    "effect-underline-on": [0x1b, 0x5a],
    "effect-underline-off": [0x1b, 0x59],
    "effect-invert-on": [0x1b, 0x5d],
    "effect-invert-off": [0x1b, 0x5c],
    "effect-blink-on": [0x1b, 0x48],
    "effect-blink-off": [0x1b,0x49],
    "effect-normal-size": [0x1b, 0x4c],
    "effect-double-height": [0x1b, 0x4d],
    "effect-double-width": [0x1b, 0x4e],
    "effect-double-size": [0x1b, 0x4f],
    "color-fg-0": [0x1b, 0x40],
    "color-fg-1": [0x1b, 0x41],
    "color-fg-2": [0x1b, 0x42],
    "color-fg-3": [0x1b, 0x43],
    "color-fg-4": [0x1b, 0x44],
    "color-fg-5": [0x1b, 0x45],
    "color-fg-6": [0x1b, 0x46],
    "color-fg-7": [0x1b, 0x47],
    "color-bg-0": [0x1b, 0x50],
    "color-bg-1": [0x1b, 0x51],
    "color-bg-2": [0x1b, 0x52],
    "color-bg-3": [0x1b, 0x53],
    "color-bg-4": [0x1b, 0x54],
    "color-bg-5": [0x1b, 0x55],
    "color-bg-6": [0x1b, 0x56],
    "color-bg-7": [0x1b, 0x57],
}

const specialChars = {
    163: [0x19, 0x23], // £
    176: [0x19, 0x30], // °
    177: [0x19, 0x31], // ±
    8592: [0x19, 0x2C], // ←
    8593: [0x19, 0x2D], // ↑
    8594: [0x19, 0x2E], // →
    8595: [0x19, 0x2F], // ↓
    188: [0x19, 0x3C], // ¼
    189: [0x19, 0x3D], // ½
    190: [0x19, 0x3E], // ¾
    231: [0x19, 0x4B, 0x63], // ç
    8217: [0x27], // ’
    224: [0x19, 0x41, 0x61], // à
    225: [0x19, 0x42, 0x61], // á
    226: [0x19, 0x43, 0x61], // â
    228: [0x19, 0x48, 0x61], // ä
    232: [0x19, 0x41, 0x65], // è
    233: [0x19, 0x42, 0x65], // é
    234: [0x19, 0x43, 0x65], // ê
    235: [0x19, 0x48, 0x65], // ë
    236: [0x19, 0x41, 0x69], // ì
    237: [0x19, 0x42, 0x69], // í
    238: [0x19, 0x43, 0x69], // î
    239: [0x19, 0x48, 0x69], // ï
    242: [0x19, 0x41, 0x6F], // ò
    243: [0x19, 0x42, 0x6F], // ó
    244: [0x19, 0x43, 0x6F], // ô
    246: [0x19, 0x48, 0x6F], // ö
    249: [0x19, 0x41, 0x75], // ù
    250: [0x19, 0x42, 0x75], // ú
    251: [0x19, 0x43, 0x75], // û
    252: [0x19, 0x48, 0x75], // ü
    338: [0x19, 0x6A], // Œ
    339: [0x19, 0x7A], // œ
    223: [0x19, 0x7B], // ß
    946: [0x19, 0x7B] // β
}

function splitRows(str, width) {
    str = str.replace(/ +/g, " ")

    const rows = []
    for(let bit of str.split("\n")) {
        let row = ""
        for(let word of bit.split(" ")) {
            if(row.length + 1 + word.length > width) {
                rows.push(row)
                row = ""
            } else if(row.length !== 0) {
                row = row + " "
            }
            row = row + word
        }
        rows.push(row)
    }

    return rows
}

class Stream {
    constructor() {
        this.reset()
    }

    reset() {
        this.items = []
        this.length = 0
    }

    push(item) {
        if(item === null || item === undefined) return

        if(item instanceof Stream) {
            this.items = this.items.concat(item.items)
        } else if(typeof item[Symbol.iterator] === "function") {
            for(let value of item) {
                if(typeof value === "number") {
                    this._pushValue(value)
                } else {
                    this._pushValue(value.charCodeAt(0))
                }
            }
        } else if(typeof item === "number") {
            this._pushValue(item)
        }
        this.length = this.items.length
    }

    _pushValue(value) {
        if(specialChars[value]) {
            for(let v of specialChars[value]) {
                this.items.push(v)
            }
        } else if(value > 0x7f) {
            return
        } else {
            this.items.push(value)
        }
    }
}

function actions2stream(actions, offsetX, offsetY) {
    if(offsetX === undefined) offsetX = 0
    if(offsetY === undefined) offsetY = 0
    const stream = new Stream()

    for(let action of actions) {
        if(action.type in directStream) {
            stream.push(directStream[action.type])
            continue
        }

        if(action.type === "content-group") {
            if(action.data.disabled) break
            stream.push(actions2stream(
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
        }
    }

    return stream
}

class MiEditPage {
    constructor(container, pageName) {
        this.container = container
        this.pageName = pageName
        this.mistorage = new MiStorage("page")

        const ribbon = $("#ribbon")
        ribbon.simpleRibbon()

        this.mitree = new MiTree(
            container.find(".mitree-container"),
            ribbon,
            this.mistorage.load(pageName)
        )

        container.find("#ribbon")[0].autocallback(this)
        container.find("#page-name").val(pageName)

        const canvas = container.find("#minitel-screen")[0]
        this.miscreen = new MinitelScreen(canvas)
    }

    onSave(event, param) {
        event.preventDefault()
        this.mistorage.save(this.pageName, this.mitree.serialize())
    }

    onRunSlow(event, param) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.send(actions2stream(actions, 0, 0).items)
    }

    onRunFast(event) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.directSend(actions2stream(actions, 0, 0).items)
    }
}

importHTML.install()
          .then(inputNumberButton.install)
          .then(() => { new MiEditPage($("#miedit"), queryParameters("page")) })

