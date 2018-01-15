/**
 * This function helps to extract and restore a form state by unserializing
 * previously serialized values. The serialized string is of the form
 *
 *     key=value&key=value&key=value...
 *
 * 
 *
 * @param {string} serialized The serialized values
 */
Element.prototype.unserialize = function(serialized) {
    if(serialized === undefined || serialized === "") return

    // Split the string on the ampersand
    serialized.split("&").map(elem => {
        // Split the string on the equal sign
        const pairs = elem.split("=")

        // Decode the value
        const value = decodeURIComponent(pairs[1].replace(/\+/g, "%20"))

        // Look for an element with the given name
        for(let node of this.querySelectorAll("[name=" + pairs[0] + "]")) {
            switch(node.getAttribute("type")) {
                case "checkbox":
                    // Checkboxes use the checked attribute
                    node.checked = true
                    break
                case "radio":
                    // Radio boxes are a group of element
                    if(value == node.value) node.checked = true
                    break
                default:
                    // Any other type of input element
                    node.value = value
            }
        }
    })
}

