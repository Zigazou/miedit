"use strict"

class MiEditPage {
    constructor(container, pageName) {
        this.container = container
        this.pageName = pageName
        this.mistorage = new MiStorage("page")
        this.inputGraphics = undefined

        const ribbon = $("#ribbon")
        ribbon.simpleRibbon()

        const mosaicRoot = document.getElementsByClassName("mosaic-root")[0]
        this.graphics = new MinitelMosaic(mosaicRoot, 4)

        this.mitree = new MiTree(
            container.find(".mitree-container"),
            ribbon,
            this.mistorage.load(pageName)
        )

        container.find("#ribbon")[0].autocallback(this)
        container.find("#page-name").val(pageName)
        container.find(".content-graphics")[0].autocallback(this)
        container.find(".mosaic-exit")[0].autocallback(this)

        const canvas = container.find("#minitel-screen")[0]
        this.miscreen = new MinitelScreen(canvas)
    }

    onSave(event, param) {
        event.preventDefault()
        this.mistorage.save(this.pageName, this.mitree.serialize())
    }

    onRunSlow(event, param) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.send(Minitel.actionsToStream(actions, 0, 0).items)
    }

    onRunFast(event) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.directSend(Minitel.actionsToStream(actions, 0, 0).items)
    }

    onEditGraphics(event, param) {
        this.inputGraphics = document.getElementById(param)
        this.graphics.reset(
            this.inputGraphics.value,
            document.getElementById("content-graphics-background").value
        )
        this.graphics.root.classList.remove("hidden")
        
    }

    onSaveGraphics(event, param) {
        this.inputGraphics.value = this.graphics.toString()
        this.graphics.root.classList.add("hidden")
    }

    onExitGraphics(event, param) {
        this.graphics.root.classList.add("hidden")
    }
}

importHTML.install()
          .then(inputNumberButton.install)
          .then(() => { new MiEditPage($("#miedit"), queryParameters("page")) })

