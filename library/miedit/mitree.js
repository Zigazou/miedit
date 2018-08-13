"use strict"
/**
 * @file mitree.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * Represents a Minitel page with a tree that the user can interact with.
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * @typedef {Object} Action
 * @property {string} type Name of the action
 * @property {Object} data URIfied data of the action
 * @property {Action[]} children
 *
 */

/**
 * MiTree is a jstree based tree for manipulating tidget (textual gadget) for
 * the Minitel.
 */
MiEdit.MiTree = class {
    /**
     * @param {jQuery} container
     * @param {SimpleRibbon} ribbon
     * @param {Object[]} nodes
     */
    constructor(container, ribbon, nodes) {
        /**
         * The jQuery object pointing to the DOM element containing our
         * widget. This includes the jstree and the forms associated to each
         * kind of node in the tree.
         * @member {jQuery}
         * @private
         */
        this.container = container

        /**
         * The jQuery object pointing to the DOM element of the actual tree.
         * @member {jQuery}
         */
        this.treeWidget = container.find(".miedit-tree")

        /**
         * The jstree object.
         * @member {Object}
         * @private
         */
        this.tree = undefined

        /**
         * Children types that the tree can handle.
         * @member {Object}
         * @private
         */
        this.children = this.availableChildren()

        // Initialize the tree widget
        const widgetTypes = {
            "#": {
                "max_children": 100,
                "max_depth": 5,
                "valid_children": Object.keys(this.children)
            }
        }

        Object.keys(this.children).forEach(child => {
            widgetTypes[child] = { "icon": "./icon/miicons.svg#" + child }
            if(child !== "content-group") widgetTypes[child].valid_children = []
        })

        this.widgetTypes = widgetTypes
        this.loadTree(nodes)

        // Disable default behaviour of forms
        container.find("form").submit(e => e.preventDefault())

        container.get()[0].autocallback(this)

        ribbon.root.autocallback(this)

        container.find(".info-block").each(function() {
            $(this).text(this.pageName)
        })
    }

    loadTree(nodes) {
        this.treeWidget.jstree("destroy")

        if(nodes) {
            nodes.forEach(node => {
                node.icon = "./icon/miicons.svg#" + node.type
            })
        }

        this.treeWidget.jstree({
            "core": { "check_callback": true, "data": nodes },
            "types": this.widgetTypes,
            "contextmenu": {
                "show_at_node": false,
                "items": this.contextualMenu()
            },
            "plugins": ["dnd", "types", "contextmenu"]
        })
        this.tree = $.jstree.reference(this.treeWidget)
        this.treeWidget.on("select_node.jstree", this, this.onSelect)

        /**
         * At the time of this writing, I have not found a way to trigger an
         * event after the tree is completely and really loaded. The workaround
         * consists of waiting 200 milliseconds before firing the event, hoping
         * for it to be completely loaded and ready for display.
         *
         * @todo have an event triggered when the tree is completely and really
         *       loaded.
         */
        setTimeout(() => this.treeWidget.trigger("load_tree.mitree"), 200)
    }

    /**
     * An Object containing key-name pairs of the children the tree will handle.
     * @return {Object}
     */
    availableChildren() {
        return {
            "move-locate": "Move cursor to an absolute position",
            "move-home": "Move cursor to first row, first column",
            "move-left": "Move cursor on the left",
            "move-up": "Move cursor on the preceding row",
            "move-down": "Move cursor on the next row",
            "move-right": "Move cursor on the right",
            "move-sol": "Move cursor to the first column of the current row",
            "clear-screen": "Clear screen",
            "clear-status": "Clear status row",
            "clear-eol": "Clear till the end of the current row",
            "clear-start-of-screen": "Clear start of screen (cursor included)",
            "clear-end-of-screen": "Clear end of screen (cursor included)",
            "clear-start-of-line": "Clear start of line (cursor included)",
            "clear-complete-screen": "Clear complete screen (no cursor move)",
            "clear-complete-line": "Clear complete line (no cursor move)",
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
            "mask-zone-on": "Mask zone",
            "mask-zone-off": "Unmask zone",
            "mask-global-on": "Enable masking",
            "mask-global-off": "Disable masking",
            "cursor-on": "Show cursor",
            "cursor-off": "Hide cursor",
            "content-group": "Group",
            "content-g0": "Switch to standard characters",
            "content-g1": "Switch to mosaic characters",
            "content-string": "String",
            "content-ceefax": "Ceefax",
            "content-block": "Block",
            "content-graphics": "Graphics",
            "content-box": "Box",
            "content-raw": "Raw stream",
            "drcs-create": "Create DRCS character",
            "drcs-std-g0": "Use standard G0",
            "drcs-drcs-g0": "Use DRCS G0",
            "drcs-std-g1": "Use standard G1",
            "drcs-drcs-g1": "Use DRCS G1",
            "drcs-black-white": "Black and white image to DRCS",
            "drcs-advanced-start": "Start DRCS creation",
            "drcs-advanced-char": "Select DRCS start character",
            "drcs-advanced-def": "Define a DRCS character",
            "drcs-advanced-end": "End DRCS creation",
            "smgraph": "Semigraphic characters",
            "content-delay": "Delay"
        }
    }

    /**
     * Definition of the tree contextual menu which allows to rename or delete
     * a node directly in the tree.
     * @return {Object}
     */
    contextualMenu() {
        return {
            "rename" : {
                "separator_before": false,
                "separator_after": false,
                "_disabled": false,
                "label": "Rename",
                "icon": "./icon/miicons.svg#edit-rename",
                "action": data => {
                    const inst = $.jstree.reference(data.reference)
                    const obj = inst.get_node(data.reference)
                    inst.edit(obj)
                }
            },
            "duplicate" : {
                "separator_before": false,
                "separator_after": false,
                "_disabled": false,
                "label": "Duplicate",
                "icon": "./icon/miicons.svg#edit-duplicate",
                "action": data => {
                    const inst = $.jstree.reference(data.reference)
                    const obj = inst.get_node(data.reference)
                    inst.copy_node(
                        obj,
                        obj,
                        "after",
                        node => {
                            node.data = {}
                            node.data["miedit-value"] = obj.data["miedit-value"]
                            this.treeWidget.trigger("value_changed.mitree")
                        }
                    )
                }
            },
            "remove" : {
                "separator_before": false,
                "separator_after": false,
                "_disabled": false,
                "label": "Delete",
                "icon": "./icon/miicons.svg#edit-delete",
                "action": data => {
                    const inst = $.jstree.reference(data.reference)
                    const obj = inst.get_node(data.reference)
                    if(inst.is_selected(obj)) {
                        inst.delete_node(inst.get_selected())
                    } else {
                        inst.delete_node(obj)
                    }
                    this.hideForms()
                }
            }
        }
    }

    /**
     * Hides all tidget forms.
     */
    hideForms() {
        this.container.find(".miedit-forms>*").hide()
    }

    /**
     * Show a specific tidget form.
     * @param {string} selector A selector to find the tidget form.
     * @param {Object} selected The currently selected node in the tree which
     *                          will give the data to fill in the form.
     */
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

    /**
     * Returns an array of Objects describing all data needed to build the same
     * tree.
     * @return {Object[]}
     */
    serialize() {
        return this.tree.get_json()
    }

    /**
     * Given an object returned by the serialize method, build a tree
     * @param {Object} nodes
     */
    unserialize(nodes) {
        this.tree.core.data = nodes
    }

    /**
     * Event used to create a tidget and insert it in the tree.
     * @param event not used.
     * @param {string} param The type of tidget to create.
     */
    onCreateTidget(event, param) {
        const newNode = {
            "text": this.children[param],
            "type": param,
            "data": {}
        }
        const currents = this.tree.get_selected(true)
        const parent = currents.length > 0 ? currents[0] : "#"
        const newNodeId = this.tree.create_node(parent, newNode, "after")

        this.tree.deselect_all(true)
        this.tree.select_node(newNodeId)

        return false
    }

    /**
     * Event used to delete the currently selected tidget in the tree.
     * @param event not used.
     * @param param not used.
     */
    onDelete() {
        const currents = this.tree.get_selected(true)
        currents.map(node => this.tree.delete_node(node))
        this.hideForms()

        return false
    }

    /**
     * Show the tidget form associated with the newly selected tidget in the
     * tree.
     * @param event
     * @param event.data This object.
     * @param {Object} data
     */
    onSelect(event, data) {
        const selected = data.instance.get_node(data.selected[0])
        event.data.hideForms()
        event.data.showForm(".miedit-forms ." + selected.type, selected)
    }

    /**
     * @param event
     * @param param not used.
     */
    onChange(event) {
        // Save node values
        const currents = this.tree.get_selected(true)
        currents[0].data["miedit-value"] = $(event.target).serialize()
        this.treeWidget.trigger("value_changed.mitree")
    }
}

/**
 * Prepare actions to be executed by extracting all needed information from the
 * MiTree.serialize() method.
 *
 * @param {Object[]} objs Objects as returned by MiTree.serialize()
 * @return {Action[]}
 */
MiEdit.mieditActions = function(objs) {
    /**
     * Converts URI query parameters to an object. We need it because jstree
     * stores custom values in URI query parameters.
     * @param {string} query
     * @return {Object}
     */
    function parseQuery(query) {
        const queryParsed = {}

        if(query === undefined) return queryParsed

        for(let arg of query.split("&")) {
            if(arg.indexOf("=") === -1) {
                queryParsed[decodeURIComponent(arg)] = true
            } else {
                const kvp = arg.split("=")
                const key = decodeURIComponent(kvp[0])
                const value = decodeURIComponent(kvp[1].replace(/\+/g, " "))
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
            action.children = MiEdit.mieditActions(obj.children)
        }

        stream.push(action)
    }

    return stream
}
