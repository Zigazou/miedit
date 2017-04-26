$('input[type=number]').each(function(index, element) {
    "use strict";
    var bPlus = $(
        '<button class="fa fa-plus btn btn-info">'
        + '<span class="btn-hidden">+</span>'
        + '</button>'
    );

    var bMinus = $(
        '<button class="fa fa-minus btn btn-info">'
        + '<span class="btn-hidden">-</span>'
        + '</button>'
    );

    bPlus.insertAfter(element);
    bMinus.insertAfter(element);

    bPlus.on('click', function(event) { element.stepUp(); return false; });
    bMinus.on('click', function(event) { element.stepDown(); return false; });
});

