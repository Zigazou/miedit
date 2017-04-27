function MiTree(container, nodes) {
    "use strict";

    // Properties
    this.container = container;
    this.treeWidget = $(container).find('.miedit-tree');
    this.tree = undefined;

    // Initialize the tree widget
    const children = ['group', 'string', 'block', 'smgraph', 'delay'];
    const widgetTypes = {
        '#': {
            'max_children': 100,
            'max_depth': 5,
            'valid_children': children,
        },
    };

    children.forEach(function(child) {
        widgetTypes[child] = { 'icon': './icon/miicon-' + child + '.png' };
        if(child != 'group') widgetTypes[child].valid_children = [];
    });

    this.treeWidget.jstree({
        'core': { 'check_callback': true, 'animation': 0, 'data': nodes },
        'types': widgetTypes,
        'plugins': [ "dnd" , "types" ],
    });
    this.tree = $.jstree.reference(this.treeWidget);

    // Disable default behaviour of forms
    $(container).find('form').submit(function(e) { e.preventDefault(); });

    $(container).autocallback(this);
    this.treeWidget.on('select_node.jstree', this, this.onSelect);
    
    $(container).find('.info-block').each(function() {
        $(this).text(this.pageName);
    });
}

MiTree.prototype.hideForms = function() {
    $(this.container).find(".miedit-forms form").hide();
};

MiTree.prototype.showForm = function(selector, selected) {
    // Load form with node values
    const form = $(this.container).find(selector);
    form[0].reset();
    form.unserialize(selected.data['miedit-value']);

    // Show the form
    form.show();
};

MiTree.prototype.serialize = function() {
    return JSON.stringify(this.tree.get_json());
};

MiTree.prototype.unserialize = function(nodes) {
    this.tree.core.data = nodes;
}

MiTree.prototype.onSave = function(event) {
    
    console.log(event.data.serialize());

    return false;
};

MiTree.prototype.onCreate = function(event) {
    "use strict";

    const that = event.data;
    const newNode = {
        'text': $(that.container).find('.tidget-type option:selected').text(),
        'type': $(that.container).find('.tidget-type').val(),
        'data': {},
    };
    const currents = that.tree.get_selected(true);
    const parent = currents.length > 0 ? currents[0] : null;
    that.tree.create_node(parent, newNode, 'after');

    return false;
};

MiTree.prototype.onDelete = function(event) {
    "use strict";

    const currents = event.data.tree.get_selected(true);
    currents.forEach(function(e) { event.data.tree.delete_node(e); });
    event.data.hideForms();

    return false;
};

MiTree.prototype.onSelect = function(event, data) {
    "use strict";

    const selected = data.instance.get_node(data.selected[0]);

    event.data.hideForms();
    event.data.showForm(".miedit-forms .miform-" + selected.type, selected);
};

MiTree.prototype.onSubmit = function(event) {
    "use strict";

    // Save node values
    const currents = event.data.tree.get_selected(true);
    currents[0].data['miedit-value'] = $(this).serialize();
};

