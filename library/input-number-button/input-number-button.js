"use strict"
const inputNumberButton = {
    _patch: function(element) {
        const bPlus = document.createElement("button")
        bPlus.className = "fa fa-plus btn btn-info"
        bPlus.innerHTML = '<span class="btn-hidden">+</span>'

        const bMinus = document.createElement("button")
        bMinus.className = "fa fa-minus btn btn-info" 
        bMinus.innerHTML = '<span class="btn-hidden">-</span>'

        element.parentNode.insertBefore(bPlus, element.nextSibling)
        element.parentNode.insertBefore(bMinus, element.nextSibling)

        bPlus.addEventListener("click", event => {
            event.preventDefault()
            element.stepUp()
            element.dispatchEvent(new Event("input"))
        })

        bMinus.addEventListener("click", event => {
            event.preventDefault()
            element.stepDown()
            element.dispatchEvent(new Event("input"))
        })
    },

    install: function() {
        const inputTags = Array.prototype.slice.call(
            document.querySelectorAll("input[type=number]")
        )

        inputTags.map(inputNumberButton._patch)
    },
}
