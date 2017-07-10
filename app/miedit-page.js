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
        container.find(".content-graphics")[0].autocallback(this)
        container.find(".mosaic-exit")[0].autocallback(this)

        const canvas = container.find("#minitel-screen")[0]
        this.miscreen = new MinitelScreen(canvas)

        const events = [
            "value_changed.mitree",
            "redraw.jstree",
            "create_node.jstree",
            "move_node.jstree",
            "delete_node.jstree"
        ]

        this.mitree.treeWidget.on(events.join(" "), event => {
            this.onRunFast(event)
        })
    }

    onSave(event, param) {
        if(this.pageName === undefined) {
            const value = window.prompt("Type in the name of this new page", "")
            if(value === null) return
            if(value.trim() === "") {
                alert("No page name, saving ignored")
                return
            }

            this.pageName = value
        }

        const objSave = {
            "thumbnail": this.miscreen.generateThumbnail(320, 250),
            "tree": this.mitree.serialize()
        }

        this.mistorage.save(this.pageName, objSave)

        window.history.replaceState(
            history.state,
            this.pageName,
            window.location.href + "?page=" + this.pageName
        )
    }

    onImport(event, param) {
        const value = window.prompt("Paste the code in the field", "")
        const obj = JSON.parse(value)
        if(obj !== null) this.mitree.loadTree(obj.tree)
    }

    onExport(event, param) {
        const objSave = {
            "thumbnail": this.miscreen.generateThumbnail(320, 250),
            "tree": this.mitree.serialize()
        }

        window.prompt("Copy the following code", JSON.stringify(objSave))
    }

    onCompile(event, param) {
        const dlLink = document.getElementById("link-download-vdt")
        const vwLink = document.getElementById("link-view-vdt")
        const rlLink = document.getElementById("link-real-vdt")

        const actions = mieditActions(this.mitree.serialize())
        const bytes = Minitel.actionsToStream(actions, 0, 0).toArray()
        const vdt = String.fromCharCode.apply(null, bytes)

        const time = new Date()
        const timeString = ("0" + time.getHours()).slice(-2)   + ":"
                         + ("0" + time.getMinutes()).slice(-2) + ":"
                         + ("0" + time.getSeconds()).slice(-2)

        // Download VDT link
        dlLink.href = "data:text/plain;charset=ascii,"
                    + encodeURIComponent(vdt)
        dlLink.setAttribute("download", this.pageName + ".vdt")
        dlLink.innerHTML = "Download VDT [" + timeString + "]"

        // View VDT link
        vwLink.href = "minitel-viewer.html"
                    + "?stream=" + encodeURIComponent(vdt)
        vwLink.innerHTML = "View VDT [" + timeString + "]"

        // View VDT link
        rlLink.href = "minitel-real-viewer.html"
                    + "?stream=" + encodeURIComponent(vdt)
        rlLink.innerHTML = "Real view VDT [" + timeString + "]"
    }

    onRunSlow(event, param) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.send(Minitel.actionsToStream(actions, 0, 0).toArray())
    }

    onRunFast(event) {
        const actions = mieditActions(this.mitree.serialize())
        this.miscreen.directSend(Minitel.actionsToStream(actions, 0, 0).toArray())
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

