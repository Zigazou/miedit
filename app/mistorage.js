function MiStorage(context) {
    this.context = context.replace('/', '-') + '/';
}

MiStorage.prototype.keys = function() {
    "use strict";

    var context = this.context;
    return Object.keys(localStorage)
                 .filter(function(key) { return key.startsWith(context); });
}

MiStorage.prototype.reset = function() {
    "use strict";
    this.keys().forEach(function(key) { this.delete(key); });
}

MiStorage.prototype.prepareKey = function(key) {
    "use strict";
    return this.context + key.replace('/', '-');
}

MiStorage.prototype.save = function(key, value) {
    "use strict";
    localStorage.setItem(this.prepareKey(key), value);
}

MiStorage.prototype.delete = function(key) {
    "use strict";
    localStorage.removeItem(this.prepareKey(key));
}

MiStorage.prototype.load = function(key) {
    "use strict";
    return localStorage.getItem(this.prepareKey(key));
}

