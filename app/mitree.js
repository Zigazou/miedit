"use strict"

class MiTree {
    constructor(container, nodes) {
        // Properties
        this.container = container
        this.treeWidget = container.find('.miedit-tree')
        this.tree = undefined

        // Initialize the tree widget
        const children = [
            'fgcolor',
            'bgcolor',
            'group',
            'string',
            'block',
            'smgraph',
            'delay'
        ]

        const widgetTypes = {
            '#': {
                'max_children': 100,
                'max_depth': 5,
                'valid_children': children,
            },
        }

        children.forEach(function(child) {
            widgetTypes[child] = { 'icon': './icon/miicon-' + child + '.png' }
            if(child != 'group') widgetTypes[child].valid_children = []
        })

        this.treeWidget.jstree({
            'core': { 'check_callback': true, 'data': nodes },
            'types': widgetTypes,
            'plugins': [ "dnd" , "types" ],
        })
        this.tree = $.jstree.reference(this.treeWidget)

        // Disable default behaviour of forms
        container.find('form').submit(e => { e.preventDefault() })

        container.autocallback(this)
        this.treeWidget.on('select_node.jstree', this, this.onSelect)
        
        container.find('.info-block').each(function() {
            $(this).text(this.pageName)
        })
    }

    hideForms() {
        this.container.find(".miedit-forms form").hide()
    }

    showForm(selector, selected) {
        // Load form with node values
        const form = this.container.find(selector)
        form[0].reset()
        form.unserialize(selected.data['miedit-value'])

        // Show the form
        form.show()
    }

    serialize() {
        return this.tree.get_json()
    }

    unserialize(nodes) {
        this.tree.core.data = nodes
    }

    onSave(event) {
        console.log(event.data.serialize())
        return false
    }

    onCreate(event) {
        const that = event.data
        const newNode = {
            'text': that.container.find('.tidget-type option:selected').text(),
            'type': that.container.find('.tidget-type').val(),
            'data': {},
        }
        const currents = that.tree.get_selected(true)
        const parent = currents.length > 0 ? currents[0] : '#'
        that.tree.create_node(parent, newNode, 'after')

        return false
    }

    onDelete(event) {
        const currents = event.data.tree.get_selected(true)
        currents.forEach(function(e) { event.data.tree.delete_node(e); })
        event.data.hideForms()

        return false
    }

    onSelect(event, data) {
        const selected = data.instance.get_node(data.selected[0])

        event.data.hideForms()
        event.data.showForm(".miedit-forms .miform-" + selected.type, selected)
    }

    onSubmit(event) {
        // Save node values
        const currents = event.data.tree.get_selected(true)
        currents[0].data['miedit-value'] = $(this).serialize()
    }
}
