function MiTree(container) {
    "use strict";

    // Properties
    this.container = container;
    this.treeWidget = $(container).find('.miedit-tree');
    this.tree = undefined;

    // Initialize the tree widget
    var children = ['group', 'string', 'block', 'smgraph', 'delay'];
    var widgetTypes = {
            '#': {
                'max_children': 100,
                'max_depth': 5,
                'valid_children': children,
            }
        };

    children.forEach(function(child) {
        widgetTypes[child] = { 'icon': './icon/miicon-' + child + '.png' };
        if(child != 'group') widgetTypes[child]['valid_children'] = [];
    });

    var treeConfig = {
        'core': { 'check_callback': true, 'animation': 0 },
        'types': widgetTypes,
        'plugins': [ "dnd" , "types" ],
    };

    this.treeWidget.jstree(treeConfig);
    this.tree = $.jstree.reference(this.treeWidget);

    // Disable default behaviour of forms
    $(container).find('form').submit(function(e) { e.preventDefault(); });

    $(container).autocallback(this);
    this.treeWidget.on('select_node.jstree', this, this.onSelect);
}

MiTree.prototype.hideForms = function() {
    $(this.container).find(".miedit-forms form").hide();
}

MiTree.prototype.showForm = function(selector, selected) {
    // Load form with node values
    var form = $(this.container).find(selector);
    form[0].reset();
    form.unserialize(selected.data['miedit-value']);

    // Show the form
    form.show();
}

MiTree.prototype.serialize = function() {
    return JSON.stringify(this.tree.get_json());
}

MiTree.prototype.onSerialize = function(event) {
    console.log(event.data.serialize());

    return false;
}

MiTree.prototype.onCreate = function(event) {
    "use strict";

    var that = event.data;
    var tType = $(that.container).find('.tidget-type').val();
    var tName = $(that.container).find('.tidget-type option:selected').text();
    var currents = that.tree.get_selected(true);
    var parent = null;

    if (currents.length > 0) parent = currents[0];
    that.tree.create_node(
        parent,
        { 'text': tName, 'type': tType, 'data': {} },
        'after'
    );

    return false;
}

MiTree.prototype.onDelete = function(event) {
    "use strict";

    var currents = event.data.tree.get_selected(true);
    currents.forEach(function(e) { event.data.tree.delete_node(e); });
    event.data.hideForms();

    return false;
}

MiTree.prototype.onSelect = function(event, data) {
    "use strict";

    var selected = data.instance.get_node(data.selected[0]);

    event.data.hideForms();
    event.data.showForm(".miedit-forms .miform-" + selected.type, selected);
}

MiTree.prototype.onSubmit = function(event) {
    "use strict";

    // Save node values
    var currents = event.data.tree.get_selected(true);
    currents[0].data['miedit-value'] = $(this).serialize();
}

