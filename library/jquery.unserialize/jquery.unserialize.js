// Unserialize previously serialized form values into a form
Element.prototype.unserialize = function(serialized) {
    if(serialized === undefined || serialized === "") return

    serialized.split("&").map(elem => {
        const pairs = elem.split("=")
        const value = decodeURIComponent(pairs[1].replace(/\+/g, "%20"))

        for(let node of this.querySelectorAll("[name=" + pairs[0] + "]")) {
            switch(node.getAttribute("type")) {
                case "checkbox":
                    node.checked = true
                    break
                case "radio":
                    if(value == node.value) node.checked = true
                    break
                default:
                    node.value = value
            }
        }
    })
}

