$('input[type=number]').each(function(index, element) {
    var bPlus = $('<button class="glyphicon glyphicon-plus btn btn-info"><span class="hidden">+</span></button>')
        bMinus = $('<button class="glyphicon glyphicon-minus btn btn-info"><span class="hidden">-</span></button>');

    bPlus.insertAfter(element);
    bMinus.insertAfter(element);

    bPlus.on('click', function(event) {
        element.stepUp();
        return false;
    });
    bMinus.on('click', function(event) {
        element.stepDown();
        return false;
    });
});

