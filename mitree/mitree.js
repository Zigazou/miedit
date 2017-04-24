function mitree(container) {
    // Initialize the tree widget
    var treeWidget = $(container).find('.miedit-tree')
        children = ['group', 'string', 'block', 'smgraph', 'delay']
        widgetTypes = {
            '#': {
                'max_children': 100,
                'max_depth': 5,
                'valid_children': children,
            }
        };

    for(var i = 0; i < children.length; i++) {
        var child = children[i];
        widgetTypes[child] = { 'icon': '/icon/miicon-' + child + '.png' };
        if(child != 'group') widgetTypes[child]['valid_children'] = [];
    }

    var treeConfig = {
            'core': { 'check_callback': true, 'animation': 0 },
            'types': widgetTypes,
            'plugins': [ "dnd" , "types" ],
        };

    treeWidget.jstree(treeConfig);
    var tree = $.jstree.reference(treeWidget);

    // Create button
    $(container).find('.tidget-create').on('click', function() {
        var tidgetType = $(container).find('.tidget-type').val(),
            tidgetName = $(container).find('.tidget-type option:selected').text(),
            currents = tree.get_selected(true),
            parent = null;

        if (currents.length > 0) parent = currents[0];
        tree.create_node(
            parent,
            { "text": tidgetName, "type": tidgetType },
            "after"
        );
    });

    // Delete button
    $(container).find('.tidget-delete').on('click', function() {
        var currents = tree.get_selected(true);
        for (var i = 0; i < currents.length; i++) {
            tree.delete_node(currents[i]);
        }
    });

    jQuery.fn.extend({
        unserialize: function(serialized) {
            if(serialized === undefined) return;
            var form = $(this);

            $.each(serialized.split('&'), function (index, elem) {
                var pairs = elem.split('=')
                    key = pairs[0]
                    value = decodeURIComponent(pairs[1]);

                form.find("[name=" + key + "]").each(function() {
                    switch($(this).attr('type')) {
                        case 'checkbox': $(this).prop('checked', true); break;
                        case 'radio': $(this).val([value]); break;
                        default: $(this).val(value);
                    }
                });
            });
        }
    });

    // Select event
    treeWidget.on('select_node.jstree', function(event, data) {
        var selected = data.instance.get_node(data.selected[0])
            selector = ".miedit-forms .miform-" + selected.type;

        $(container).find(".miedit-forms form").hide();

        var form = $(container).find(selector);
        form[0].reset();
        form.unserialize($(selected).data('miedit-value'));
        form.show();
    });

    // Apply button
    $(container).find('.miedit-forms form').on('submit', function(event) {
        var currents = tree.get_selected(true);
        $(currents[0]).data('miedit-value', $(this).serialize());
    });
}
