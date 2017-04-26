// Unserialize previously serialized form values into a form
jQuery.fn.extend({
    unserialize: function(serialized) {
        if(serialized === undefined || serialized === "") return;
        var form = $(this);

        $.each(serialized.split('&'), function (index, elem) {
            var pairs = elem.split('=')
                key = pairs[0]
                value = decodeURIComponent(pairs[1].replace(/\+/g, '%20'));

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

