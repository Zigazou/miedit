"use strict"

class MiTree {
    constructor(container, ribbon, nodes) {
        // Properties
        this.container = container
        this.treeWidget = container.find(".miedit-tree")
        this.tree = undefined
        this.children = {
            "move-locate": "Move cursor to an absolute position",
            "move-home": "Move cursor to first row, first column",
            "move-left": "Move cursor on the left",
            "move-up": "Move cursor on the preceding row",
            "move-down": "Move cursor on the next row",
            "move-right": "Move cursor on the right",
            "move-sol": "Move cursor to the first column of the current row",
            "clear-screen": "Clear screen",
            "clear-eol": "Clear till the end of the current row",
            "color-fg-0": "Set foreground color to black",
            "color-fg-1": "Set foreground color to red",
            "color-fg-2": "Set foreground color to green",
            "color-fg-3": "Set foreground color to yellow",
            "color-fg-4": "Set foreground color to blue",
            "color-fg-5": "Set foreground color to magenta",
            "color-fg-6": "Set foreground color to cyan",
            "color-fg-7": "Set foreground color to white",
            "color-bg-0": "Set background color to black",
            "color-bg-1": "Set background color to red",
            "color-bg-2": "Set background color to green",
            "color-bg-3": "Set background color to yellow",
            "color-bg-4": "Set background color to blue",
            "color-bg-5": "Set background color to magenta",
            "color-bg-6": "Set background color to cyan",
            "color-bg-7": "Set background color to white",
            "effect-normal-size": "Set normal size",
            "effect-double-size": "Set double size",
            "effect-double-width": "Set double width",
            "effect-double-height": "Set double height",
            "effect-blink-on": "Blink on",
            "effect-blink-off": "Blink off",
            "effect-invert-on": "Invert on",
            "effect-invert-off": "Invert off",
            "effect-underline-on": "Underline on",
            "effect-underline-off": "Underline off",
            "content-group": "Group",
            "content-g0": "Switch to standard characters",
            "content-g1": "Switch to mosaic characters",
            "content-string": "String",
            "content-block": "Block",
            "content-graphics": "Graphics",
            "content-box": "Box",
            "smgraph": "Semigraphic characters",
            "content-delay": "Delay"
        }

        // Initialize the tree widget
        const widgetTypes = {
            "#": {
                "max_children": 100,
                "max_depth": 5,
                "valid_children": Object.keys(this.children),
            },
        }

        Object.keys(this.children).forEach(child => {
            widgetTypes[child] = { "icon": "./icon/" + child + ".svg" }
            if(child !== "content-group") widgetTypes[child].valid_children = []
        })

        this.treeWidget.jstree({
            "core": { "check_callback": true, "data": nodes },
            "types": widgetTypes,
            "contextmenu": {
                "show_at_node": false,
                "items": this.contextualMenu()
            },
            "plugins": [ "dnd" , "types", "contextmenu" ],
        })
        this.tree = $.jstree.reference(this.treeWidget)

        // Disable default behaviour of forms
        container.find("form").submit(e => { e.preventDefault() })

        container.get()[0].autocallback(this)
        this.treeWidget.on("select_node.jstree", this, this.onSelect)

        ribbon.get()[0].autocallback(this)

        container.find(".info-block").each(function() {
            $(this).text(this.pageName)
        })
    }

    contextualMenu() {
        return {
            "rename" : {
                "separator_before": false,
                "separator_after": false,
                "_disabled": false,
                "label": "Rename",
                "icon": "./icon/edit-rename.svg",
                "action": function (data) {
                    const inst = $.jstree.reference(data.reference)
                    const obj = inst.get_node(data.reference)
                    inst.edit(obj)
                }
            },
            "remove" : {
                "separator_before": false,
                "icon": false,
                "separator_after": false,
                "_disabled": false,
                "label": "Delete",
                "icon": "./icon/edit-delete.svg",
                "action": function (data) {
                    const inst = $.jstree.reference(data.reference)
                    const obj = inst.get_node(data.reference)
                    if(inst.is_selected(obj)) {
                        inst.delete_node(inst.get_selected())
                    } else {
                        inst.delete_node(obj)
                    }
                }
            }
        }
    }

    hideForms() {
        this.container.find(".miedit-forms>*").hide()
    }

    showForm(selector, selected) {
        // Load form with node values
        let form = this.container.find(selector)
        if(form.length > 0) {
            if(form[0].reset) {
                form[0].reset()
                form[0].unserialize(selected.data["miedit-value"])
            }
        } else {
            // No form available, defaults to empty form
            form = this.container.find(".miedit-forms .empty")
        }

        // Show the form
        form.show()
    }

    serialize() {
        return this.tree.get_json()
    }

    unserialize(nodes) {
        this.tree.core.data = nodes
    }

    onCreateTidget(event, param) {
        const newNode = {
            "text": this.children[param],
            "type": param,
            "data": {},
        }
        const currents = this.tree.get_selected(true)
        const parent = currents.length > 0 ? currents[0] : "#"
        const newNodeId = this.tree.create_node(parent, newNode, "after")

        this.tree.deselect_all(true)
        this.tree.select_node(newNodeId)

        return false
    }

    onDelete(event, param) {
        const currents = this.tree.get_selected(true)
        //currents.forEach(e => { this.tree.delete_node(e) })
        currents.map(this.tree.delete_node)
        this.hideForms()

        return false
    }

    onSelect(event, data) {
        const selected = data.instance.get_node(data.selected[0])
        event.data.hideForms()
        event.data.showForm(".miedit-forms ." + selected.type, selected)
    }

    onSubmit(event, param) {
        // Save node values
        const currents = this.tree.get_selected(true)
        currents[0].data["miedit-value"] = $(event.target).serialize()
    }
}

function mieditActions(objs) {
    function parseQuery(query) {
        const queryParsed = {}

        if(query === undefined) {
            return queryParsed
        }

        for(let arg of query.split("&")) {
            if(arg.indexOf("=") === -1) {
                queryParsed[decodeURIComponent(arg)] = true
            } else {
                const kvp = arg.split("=")
                const key = decodeURIComponent(kvp[0])
                const value = decodeURIComponent(kvp[1]).replace(/\+/g, " ")
                queryParsed[key] = value
            }
        }

        return queryParsed
    }

    const stream = []

    for(let obj of objs) {
        const action = {
            "type": obj.type,
            "data": parseQuery(obj.data["miedit-value"]),
            "children": []
        }

        if(obj.children.length !== 0) {
            action.children = mieditActions(obj.children)
        }

        stream.push(action)
    }

    return stream
}

