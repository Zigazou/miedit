function MiEditPage(container, pageName) {
    "use strict";

    this.container = container;
    this.pageName = pageName;
    this.mistorage = new MiStorage('page');
    this.mitree = new MiTree(
        container.find('.mitree-container'),
        this.mistorage.load(pageName)
    );
    container.find('.miedit-page').autocallback(this);
}

MiEditPage.prototype.onSave = function(event) {
    "use strict";
    event.preventDefault();

    event.data.mistorage.save(
        event.data.pageName,
        event.data.mitree.serialize()
    );
}

mieditpage = new MiEditPage($('#miedit'), getParameter('page'));

