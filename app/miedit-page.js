"use strict"

function actions2stream(actions) {
    const stream = []

    for(let action of actions) {
        switch(action.type) {
            case "clear-screen": stream.push(0x0c); break

            case "content-string":
                for(let i = 0; i < action.data.value.length; i++) {
                    stream.push(action.data.value.charCodeAt(i))
                }
                break

            case "move-home": stream.push(0x1e); break
            case "move-up": stream.push(0x0b); break
            case "move-down": stream.push(0x0a); break
            case "move-left": stream.push(0x08); break
            case "move-right": stream.push(0x09); break
            case "move-sol": stream.push(0x0d); break

            case "effect-underline-on": stream.push(0x1b, 0x5a); break
            case "effect-underline-off": stream.push(0x1b, 0x59); break
            case "effect-invert-on": stream.push(0x1b, 0x5d); break
            case "effect-invert-off": stream.push(0x1b, 0x5c); break
            case "effect-blink-on": stream.push(0x1b, 0x48); break
            case "effect-blink-off": stream.push(0x1b,0x49); break
            case "effect-normal-size": stream.push(0x1b, 0x4c); break
            case "effect-double-height": stream.push(0x1b, 0x4d); break
            case "effect-double-width": stream.push(0x1b, 0x4e); break
            case "effect-double-size": stream.push(0x1b, 0x4f); break
            // case "": stream.push(); break

            case "move-locate":
                stream.push(0x1f)
                stream.push(0x40 + parseInt(action.data.y))
                stream.push(0x40 + parseInt(action.data.x))
                break

            case "color-fg-0": stream.push(0x1b, 0x40); break
            case "color-fg-1": stream.push(0x1b, 0x41); break
            case "color-fg-2": stream.push(0x1b, 0x42); break
            case "color-fg-3": stream.push(0x1b, 0x43); break
            case "color-fg-4": stream.push(0x1b, 0x44); break
            case "color-fg-5": stream.push(0x1b, 0x45); break
            case "color-fg-6": stream.push(0x1b, 0x46); break
            case "color-fg-7": stream.push(0x1b, 0x47); break

            case "color-bg-0": stream.push(0x1b, 0x50); break
            case "color-bg-1": stream.push(0x1b, 0x51); break
            case "color-bg-2": stream.push(0x1b, 0x52); break
            case "color-bg-3": stream.push(0x1b, 0x53); break
            case "color-bg-4": stream.push(0x1b, 0x54); break
            case "color-bg-5": stream.push(0x1b, 0x55); break
            case "color-bg-6": stream.push(0x1b, 0x56); break
            case "color-bg-7": stream.push(0x1b, 0x57); break
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
        el.miscreen.send(actions2stream(actions))
    }

    onRunFast(event) {
        const el = event.data.that
        const actions = mieditActions(el.mitree.serialize())
        el.miscreen.directSend(actions2stream(actions))
    }
}

new MiEditPage($("#miedit"), getParameter("page"))

