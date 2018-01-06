"use strict"
/**
 * Autocallback is a method added to HTML DOM elements that allows you to
 * connect events occuring on elements to callback methods contained in an
 * object.
 *
 * Examples of attribute uses:
 *
 *     <form class="content-box" data-change="onChange">
 *         ...
 *     </form>
 * 
 *     <button class="large" data-call="onCreateTidget" data-param="color-bg-3">
 *         <img src="icon/miicons.svg#color-bg-3" /><br/>Yellow<br/>90%
 *     </button>
 *
 * Examples of calls to the autocallback method:
 *
 *     this.ribbon.root.autocallback(this)
 *     container.find(".content-graphics")[0].autocallback(this)
 *     container.find(".drcs-black-white")[0].autocallback(this)
 *     container.find(".mosaic-exit")[0].autocallback(this)
 *
 * If the method indicated in the attribute does not exist in the object, it is
 * simply ignored.
 *
 * This methods looks for children elements having "data-call" and "data-change"
 * attributes.
 *
 * The child element may have a "data-param" attributes to pass specific
 * values to the callback.
 *
 * It works only on form (submit event), button (click event) and div (click
 * event) when using "data-call" attribute.
 *
 * When using "data-change" attribute on a form, every change occuring in the
 * form elements will fire the callback method.
 *
 * @param {} that The object containing the callback methods
 */
Element.prototype.autocallback = function(that) {
    const tagEvents = {
        "form": "submit",
        "button": "click",
        "div": "click"
    }

    // Handles data-call attributes
    const dataCalls = [].slice.call(this.querySelectorAll("[data-call]"))

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
    const dataChanges = [].slice.call(this.querySelectorAll("[data-change]"))

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

