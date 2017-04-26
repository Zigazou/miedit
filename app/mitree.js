function MiTree(container) {
    this.container = container;
    this.treeWidget = $(container).find('.miedit-tree');

    // Initialize the tree widget
    var children = ['group', 'string', 'block', 'smgraph', 'delay']
        widgetTypes = {
            '#': {
                'max_children': 100,
                'max_depth': 5,
                'valid_children': children,
            }
        };

    for(var i = 0; i < children.length; i++) {
        var child = children[i];
        widgetTypes[child] = { 'icon': './icon/miicon-' + child + '.png' };
        if(child != 'group') widgetTypes[child]['valid_children'] = [];
    }

    var treeConfig = {
            'core': { 'check_callback': true, 'animation': 0 },
            'types': widgetTypes,
            'plugins': [ "dnd" , "types" ],
        };

    this.treeWidget.jstree(treeConfig);
    this.tree = $.jstree.reference(this.treeWidget);

    $(container).find('form').submit(function(e) { e.preventDefault(); });

    $(container).find('.tidget-create').on('click', this, this.onCreate);
    $(container).find('.tidget-delete').on('click', this, this.onDelete);
    this.treeWidget.on('select_node.jstree', this, this.onSelect);
    $(container).find('.miedit-forms form').on('submit', this, this.onSubmit);    
}

MiTree.prototype.onCreate = function(event) {
    var that = event.data
        tType = $(that.container).find('.tidget-type').val(),
        tName = $(that.container).find('.tidget-type option:selected').text(),
        currents = that.tree.get_selected(true),
        parent = null;

    if (currents.length > 0) parent = currents[0];
    that.tree.create_node(parent, { "text": tName, "type": tType }, "after");
}

MiTree.prototype.onDelete = function(event) {
    var that = event.data
        currents = that.tree.get_selected(true);

    for (var i = 0; i < currents.length; i++) {
        that.tree.delete_node(currents[i]);
    }
}

MiTree.prototype.onSelect = function(event, data) {
    var that = event.data
        selected = data.instance.get_node(data.selected[0])
        selector = ".miedit-forms .miform-" + selected.type;

    $(that.container).find(".miedit-forms form").hide();

    var form = $(that.container).find(selector);
    form[0].reset();
    form.unserialize($(selected).data('miedit-value'));
    form.show();
}

MiTree.prototype.onSubmit = function(event) {
    var that = event.data
        currents = that.tree.get_selected(true);

    $(currents[0]).data('miedit-value', $(this).serialize());
}

