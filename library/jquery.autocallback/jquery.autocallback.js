"use strict"

jQuery.fn.extend({
    autocallback: function(that) {
        const tagEvents = {
            'form': 'submit',
            'button': 'click',
            'div': 'click'
        }

        $(this).find('[data-call]').each(function() {
            // The specified handler must exist
            const handler = $(this).data('call')
            if(that[handler] === undefined) return

            // Works only on supported tags
            const tagName = $(this).prop("tagName").toLowerCase()
            if(tagEvents[tagName] === undefined) return

            // Is there a parameter?
            let param = $(this).data('param')

            // Is it an object?
            if(param && param.startsWith("{")) {
                param = JSON.parse(param)
            }

            // Apply callback to the event
            $(this).on(
                tagEvents[tagName],
                { 'that': that, 'param': param },
                that[handler]
            )
        })
    }
})

