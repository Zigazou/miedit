"use strict"

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
    }

    onRunFast(event) {
        const el = event.data.that
        el.miscreen.directSend("Hello")
    }
}

new MiEditPage($("#miedit"), getParameter("page"))

