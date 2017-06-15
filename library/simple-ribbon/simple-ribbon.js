"use strict"
class SimpleRibbon {
    constructor(ribbon) {
        this.root = ribbon
        this.current = undefined

        const tabs = this.root.getElementsByTagName("h3")
        for(let i = 0; i < tabs.length; i++) {
            tabs[i].nextElementSibling.classList.add("hidden")
            tabs[i].addEventListener("click", (e) => { this.onClick(e) })
        }

        this.openTab(this.root.getElementsByClassName("first")[0])
    }

    openTab(element) {
        if(element === null || element === undefined) return

        if(this.current !== undefined) {
            this.current.nextElementSibling.classList.add("hidden")
            this.current.classList.remove("selected")
        }
        element.nextElementSibling.classList.remove("hidden")
        element.classList.add("selected")
        this.current = element
    }

    onClick(event) {
        this.openTab(event.target)
    }
}
