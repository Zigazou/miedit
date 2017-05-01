function MiStorage(context) {
    "use strict";

    this.context = context.replace('/', '-') + '/';
}

MiStorage.prototype.keys = function() {
    "use strict";

    const context = this.context;
    return Object.keys(localStorage)
                 .filter(function(key) { return key.startsWith(context); })
                 .map(function(key) { return key.substr(context.length); });
};

MiStorage.prototype.reset = function() {
    "use strict";
    this.keys().forEach(function(key) { this.delete(key); });
};

MiStorage.prototype.prepareKey = function(key) {
    "use strict";
    return this.context + key.replace('/', '-');
};

MiStorage.prototype.save = function(key, value) {
    "use strict";
    localStorage.setItem(this.prepareKey(key), JSON.stringify(value));
};

MiStorage.prototype.delete = function(key) {
    "use strict";
    localStorage.removeItem(this.prepareKey(key));
};

MiStorage.prototype.load = function(key) {
    "use strict";
    try {
        return JSON.parse(localStorage.getItem(this.prepareKey(key)));
    } catch(err) {
        return null;
    }
};

