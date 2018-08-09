"use strict"
/**
 * @namespace inputNumberButton
 */
const inputNumberButton = {
    /**
     * Adds plus and minus buttons to an input element of type number.
     * @param {Element} element An input element of type number
     * @private
     */
    patchElement: function(element) {
        // Create the plus button
        const bPlus = document.createElement("button")
        bPlus.className = "fa fa-plus btn btn-info"
        bPlus.innerHTML = '<span class="btn-hidden">+</span>'

        // Create the minus button
        const bMinus = document.createElement("button")
        bMinus.className = "fa fa-minus btn btn-info"
        bMinus.innerHTML = '<span class="btn-hidden">-</span>'

        // Add the buttons
        element.parentNode.insertBefore(bPlus, element.nextSibling)
        element.parentNode.insertBefore(bMinus, element.nextSibling)

        // Handle click event on the plus button
        bPlus.addEventListener("click", event => {
            event.preventDefault()
            element.stepUp()
            element.dispatchEvent(new Event("input"))
        })

        // Handle click event on the minus button
        bMinus.addEventListener("click", event => {
            event.preventDefault()
            element.stepDown()
            element.dispatchEvent(new Event("input"))
        })
    },

    /**
     * Adds plus and minus buttons to all input elements of type number.
     */
    install: function() {
        const inputTags = Array.prototype.slice.call(
            document.querySelectorAll("input[type=number]")
        )

        inputTags.map(inputNumberButton.patchElement)
    }
}
