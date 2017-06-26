"use strict"
Element.prototype.autocallback = function(that) {
    const tagEvents = {
        "form": "submit",
        "button": "click",
        "div": "click"
    }

    // Handles data-call attributes
    const dataCalls = Array.prototype.slice.call(
        this.querySelectorAll("[data-call]")
    )

    dataCalls.map(element => {
        // The specified handler must exist
        const handler = element.getAttribute("data-call")
        if(that[handler] === undefined) return

        // Works only on supported tags
        const tagName = element.tagName.toLowerCase()
        if(tagEvents[tagName] === undefined) return

        // Is there a parameter?
        let param = element.getAttribute("data-param")

        // Is it an object?
        if(param && param.startsWith("{")) param = JSON.parse(param)

        // Apply callback to the event
        element.addEventListener(tagEvents[tagName], event => {
            event.preventDefault()
            that[handler](event, param)
        })
    })

    // Handles data-change attributes
    const dataChanges = Array.prototype.slice.call(
        this.querySelectorAll("[data-change]")
    )

    dataChanges.map(element => {
        // The specified handler must exist
        const handler = element.getAttribute("data-change")
        if(that[handler] === undefined) return

        // Is there a parameter?
        let param = element.getAttribute("data-param")

        // Is it an object?
        if(param && param.startsWith("{")) param = JSON.parse(param)

        // Apply callback to the event
        const formInputs = Array.prototype.slice.call(
            element.querySelectorAll("input, textarea, select")
        )

        formInputs.map(input => {
            let eventType = "input"

            if(["radio", "checkbox", "select"].indexOf(input.localName) >= 0) {
                // Radio/check boxes/select do not fire "input" events
                eventType = "change"
            }

            input.addEventListener(eventType, event => {
                event.preventDefault()
                that[handler]({target: element}, param)
            })
        })
    })
}

