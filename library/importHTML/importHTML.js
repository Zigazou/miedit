$('import').each(function(index, element) {
    $.ajax({
        url: element.getAttribute('src'),
        success: function(html) {
            var parent = element.parentElement
                template = document.createElement('template');

            template.innerHTML = html;
            for(var i = 0; i < template.content.childNodes.length; i++) {
                parent.insertBefore(template.content.childNodes[i], element);
            }
            parent.removeChild(element);
        },
        dataType: 'html',
        async: false
    });
});

