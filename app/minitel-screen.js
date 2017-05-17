function MinitelScreen(canvas) {
    "use strict";
    
    const zoom = { x: 2, y: 2 };
    const grid = { cols: 40, rows: 25 };
    const char = { width: 8, height: 10 };

    canvas.width = char.width * grid.cols * zoom.x;
    canvas.height = char.height * grid.rows * zoom.y;

    this.pageMemory = new PageMemory(grid, char, zoom, canvas);
    this.decoder = new MinitelDecoder(this.pageMemory);

    const that = this;
}

MinitelScreen.prototype.send = function(items) {
    "use strict";
    
    this.decoder.decodeList(items);
    this.pageMemory.render();
};

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
    this.pageMemory.render();
};

