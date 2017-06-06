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

function actions2stream(actions, offsetX, offsetY) {
    const stream = []

    for(let action of actions) {
        if(action.type in directStream) {
            for(let byte of directStream[action.type]) stream.push(byte)
            continue
        }

        switch(action.type) {
            case "content-group":
                if(action.data.disabled) break
                let bytes = actions2stream(
                    action.children,
                    offsetX + parseInt(action.data.offsetX),
                    offsetY + parseInt(action.data.offsetY)
                )

                for(let byte of bytes) stream.push(byte)
                break

            case "content-string":
                for(let i = 0; i < action.data.value.length; i++) {
                    stream.push(action.data.value.charCodeAt(i))
                }
                break

            case "content-block":/*
                for(let i = 0; i < action.data.value.length; i++) {
                    stream.push(action.data.value.charCodeAt(i))
                }*/
                break

            case "content-box":
                const x = offsetX + parseInt(action.data.x)
                const y = offsetY + parseInt(action.data.y)
                const width = parseInt(action.data.width)
                const height = parseInt(action.data.height)
                const bgcolor = parseInt(action.data.bgcolor)

                for(let row = y; row < y + height; row++) {
                    stream.push(0x1f, 0x40 + row, 0x40 + x)
                    stream.push(0x0e, 0x1b, 0x50 + bgcolor)
                    stream.push(0x20)
                    stream.push(0x12, 0x40 + width - 1)
                }
                break

            case "move-home":
                if(offsetX !== 0 || offsetY !== 0) {
                    stream.push(0x1f)
                    stream.push(0x40 + parseInt(offsetY))
                    stream.push(0x40 + parseInt(offsetX))
                } else {
                    stream.push(0x1e)
                }
                break

            case "move-locate":
                stream.push(0x1f)
                stream.push(0x40 + parseInt(action.data.y) + offsetY)
                stream.push(0x40 + parseInt(action.data.x) + offsetX)
                break
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

        container.find("#ribbon").autocallback(this)
        container.find("#page-name").val(pageName)

        const canvas = container.find("#minitel-screen")[0]
        this.miscreen = new MinitelScreen(canvas)
    }

    onSave(event) {
        const el = event.data.that
        event.preventDefault()
        el.mistorage.save(el.pageName, el.mitree.serialize())
    }

    onRunSlow(event) {
        const el = event.data.that
        const actions = mieditActions(el.mitree.serialize())
        el.miscreen.send(actions2stream(actions, 0, 0))
    }

    onRunFast(event) {
        const el = event.data.that
        const actions = mieditActions(el.mitree.serialize())
        el.miscreen.directSend(actions2stream(actions, 0, 0))
    }
}

new MiEditPage($("#miedit"), getParameter("page"))

