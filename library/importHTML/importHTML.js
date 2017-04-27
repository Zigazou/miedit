$('import').each(function(index, element) {
    "use strict";

    $.ajax({
        url: element.getAttribute('src'),
        success: function(html) {
            const template = document.createElement('template');

            template.innerHTML = html;
            $(template.content).children().each(function() {
                element.parentElement.insertBefore(this, element);
            });
            element.parentElement.removeChild(element);
        },
        dataType: 'html',
        async: false
    });
});

