"use strict"
const importHTML = {
    import: function(element) {
        return new Promise((resolve, reject) => {
            const src = element.getAttribute("src")
            const xhr = new XMLHttpRequest()
            xhr.onerror = function(e) {
                reject("Error " + e.target.status + " while importing " + src)
            }

            xhr.onloadend = function onLoadEnd(event) {
                const template = document.createElement("div")
                template.innerHTML = event.target.responseText

                for(let child of template.children) {
                    element.parentElement.insertBefore(child, element)
                }
                element.parentElement.removeChild(element)
                resolve()
            }

            xhr.open("GET", src, true)
            xhr.send()
        })
    },

    install: function() {
        const importTags = Array.prototype.slice.call(
            document.getElementsByTagName("import")
        )
        return Promise.all(importTags.map(importHTML.import))
    },
}
