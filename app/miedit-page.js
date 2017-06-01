"use strict"

class MiEditPage{
    constructor(container, pageName) {
        this.container = container
        this.pageName = pageName
        this.mistorage = new MiStorage('page')

        const ribbon = $('#ribbon')
        ribbon.simpleRibbon()

        this.mitree = new MiTree(
            container.find('.mitree-container'),
            ribbon,
            this.mistorage.load(pageName)
        )
        container.find('.miedit-page').autocallback(this)
    }

    onSave(event) {
        event.preventDefault()

        event.data.mistorage.save(
            event.data.pageName,
            event.data.mitree.serialize()
        )
    }
}

let mieditpage = new MiEditPage($('#miedit'), getParameter('page'))

