function MinitelScreen(canvas) {
    "use strict";
    
    const zoom = { x: 2, y: 2 };
    const grid = { cols: 40, rows: 25 };
    const char = { width: 8, height: 10 };

    canvas.width = char.width * grid.cols * zoom.x;
    canvas.height = char.height * grid.rows * zoom.y;

    this.bandwidth = 1200; // bits per second
    this.refreshRate = 20; // milliseconds
    this.pageMemory = new PageMemory(grid, char, zoom, canvas);
    this.decoder = new MinitelDecoder(this.pageMemory);

    this.queue = [];
    this.chunkSize = (this.bandwidth / 10) / (1000 / this.refreshRate);

    const that = this;
    window.setInterval(function() { that.sendChunk(); }, this.refreshRate);
}

MinitelScreen.prototype.send = function(items) {
    "use strict";

    this.queue = this.queue.concat(items);
};

MinitelScreen.prototype.sendChunk = function() {
    // Nothing to do?
    if(this.queue.length === 0) return;

    const chunk = this.queue.slice(0, this.chunkSize);
    this.queue = this.queue.slice(this.chunkSize);
    this.decoder.decodeList(chunk);
}

function MinitelScreenTest(canvas) {
    "use strict";
    
    const zoom = { x: 2, y: 2 };
    const grid = { cols: 40, rows: 4 };
    const char = { width: 8, height: 10 };

    canvas.width = char.width * grid.cols * zoom.x;
    canvas.height = char.height * grid.rows * zoom.y;

    this.pageMemory = new PageMemory(grid, char, zoom, canvas);
    this.decoder = new MinitelDecoder(this.pageMemory);

    const that = this;
}

MinitelScreenTest.prototype.send = function(items) {
    "use strict";
    
    this.decoder.decodeList(items);
};

