"use strict"

class MiEditPage {
    constructor(container, pageName) {
        this.container = container
        this.pageName = pageName
        this.mistorage = new MiStorage("page")
        this.inputGraphics = undefined

        this.ribbon = new SimpleRibbon(document.getElementById("ribbon"))

        const mosaicRoot = document.getElementsByClassName("mosaic-root")[0]
        this.graphics = new MinitelMosaic(mosaicRoot, 4)

        const page = this.mistorage.load(pageName)

        this.mitree = new MiTree(
            container.find(".mitree-container"),
            this.ribbon,
            page !== null && page.tree ? page.tree : page
        )

        this.ribbon.root.autocallback(this)
        container.find("#page-name").val(pageName)
        container.find(".content-graphics")[0].autocallback(this)
        container.find(".mosaic-exit")[0].autocallback(this)

        const canvas = container.find("#minitel-screen")[0]
        this.miscreen = new MinitelScreen(canvas)

        const events = [
            "value_changed.mitree",
            "create_node.jstree",
            "move_node.jstree",
            "delete_node.jstree"
        ]

        this.mitree.treeWidget.on(events.join(" "), event => {
            this.onRunFast(event)
        })
    }

    onSave(event, param) {
        event.preventDefault()
        const objSave = {
            "thumbnail": this.miscreen.generateThumbnail(320, 250),
            "tree": this.mitree.serialize()
        }
        this.mistorage.save(this.pageName, objSave)
    }

    onImport(event, param) {
        event.preventDefault()
        const value = window.prompt("Paste the code in the field", "")
        const obj = JSON.parse(value)
        if(obj !== null) this.mitree.loadTree(obj.tree)
    }

    onExport(event, param) {
        event.preventDefault()
        const objSave = {
            "thumbnail": this.miscreen.generateThumbnail(320, 250),
            "tree": this.mitree.serialize()
        }

        window.prompt("Copy the following code", JSON.stringify(objSave))
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
        this.inputGraphics.dispatchEvent(new Event("input"))
        this.graphics.root.classList.add("hidden")
    }

    onExitGraphics(event, param) {
        this.graphics.root.classList.add("hidden")
    }
}

importHTML.install()
          .then(inputNumberButton.install)
          .then(() => { new MiEditPage($("#miedit"), queryParameters("page")) })

