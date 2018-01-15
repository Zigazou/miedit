"use strict"
const importHTML = {
    /**
     * Create a promise loading an HTML file into the DOM.
     * The import tag has one attribute "src" which holds a URL pointing to
     * the HTML file to import. The import tag is replaced with a div tag.
     *
     * @param {Element} element The DOM element of the import tag
     * @return {Promise}
     */
    import: function(element) {
        return new Promise((resolve, reject) => {
            // Retrieve the URL of the file to import
            const src = element.getAttribute("src")

            // Use an XMLHttpRequest to retrieve the content of the file
            const xhr = new XMLHttpRequest()

            // Reject the promise on any error of the XMLHttpRequest
            xhr.onerror = function(e) {
                reject("Error " + e.target.status + " while importing " + src)
            }

            // Insert every tag into a new div element
            xhr.onloadend = function onLoadEnd(event) {
                const template = document.createElement("div")
                template.innerHTML = event.target.responseText

                for(let child of template.children) {
                    element.parentElement.insertBefore(child, element)
                }
                element.parentElement.removeChild(element)
                resolve()
            }

            // Run the XMLHttpRequest
            xhr.open("GET", src, true)
            xhr.send()
        })
    },

    /**
     * Look for every import tag in the current document and replace them with
     * the content of the specified files.
     * @return {Promise} A Promise containing the Promises for each import tags
     */
    install: function() {
        // Retrieve every import tag in an array
        const importTags = Array.prototype.slice.call(
            document.getElementsByTagName("import")
        )

        // Return the global Promise
        return Promise.all(importTags.map(importHTML.import))
    },
}
