jQuery.fn.extend({
    autocallback: function(that) {
        var tagEvents = {
            'form': 'submit',
            'button': 'click',
        }

        $(this).find('[data-call]').each(function() {
            // The specified handler must exist
            var handler = $(this).data('call');
            if(that[handler] === undefined) return;

            // Works only on supported tags
            var tagName = $(this).prop("tagName").toLowerCase();
            if(tagEvents[tagName] === undefined) return;

            // Apply callback to the event
            $(this).on(tagEvents[tagName], that, that[handler]);
        });
    }
});

