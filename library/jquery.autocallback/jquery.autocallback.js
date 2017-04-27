jQuery.fn.extend({
    autocallback: function(that) {
        "use strict";

        const tagEvents = { 'form': 'submit', 'button': 'click' };

        $(this).find('[data-call]').each(function() {
            // The specified handler must exist
            const handler = $(this).data('call');
            if(that[handler] === undefined) return;

            // Works only on supported tags
            const tagName = $(this).prop("tagName").toLowerCase();
            if(tagEvents[tagName] === undefined) return;

            // Apply callback to the event
            $(this).on(tagEvents[tagName], that, that[handler]);
        });
    }
});

