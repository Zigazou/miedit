function FontSprite(sheetURL, grid, char, zoom, colors) {
    "use strict";
    this.grid = grid;
    this.char = char;
    this.colors = colors;

    this.spriteSheet = new Image();
    this.spriteSheet.src = sheetURL;

    this.spriteSheetColors = [];
    this.generateColors();
}

FontSprite.prototype.generateColors = function() {
    "use strict";
    for(let color = 0; color < 8; color++) {
        const canvas = document.createElement("canvas");
        canvas.width = this.spriteSheet.width;
        canvas.height = this.spriteSheet.height;

        const ctx = canvas.getContext("2d");
        const wid = canvas.width;
        const hei = canvas.height;

        ctx.clearRect(0, 0, wid, hei);
        ctx.drawImage(this.spriteSheet, 0, 0, wid, hei, 0, 0, wid, hei);
        ctx.fillStyle = this.colors[color];
        ctx.globalCompositeOperation = "source-in";
        ctx.fillRect(0, 0, wid, hei);

        this.spriteSheetColors[color] = canvas;
    }
};

FontSprite.prototype.toCoordinates = function(ord) {
    "use strict";
    if(ord < 0 || ord >= this.grid.cols * this.grid.rows) {
        ord = this.grid.cols * this.grid.rows - 1;
    }

    return {
        'x': Math.floor(ord / this.grid.rows) * this.char.width,
        'y': (ord % this.grid.rows) * this.char.height,
    };
};

FontSprite.prototype.writeChar = function(ctx, ord, x, y, prt, mult, color, u) {
    "use strict";
    const srcCoords = this.toCoordinates(ord);

    const offset = {
        x: Math.floor(prt.x * this.char.width / mult.width),
        y: Math.floor(prt.y * this.char.height / mult.height),
    };

    if(color === undefined) color = 0;
    
    ctx.drawImage(
        // Source
        this.spriteSheetColors[color],
        srcCoords.x + offset.x, srcCoords.y + offset.y,
        this.char.width / mult.width, this.char.height / mult.height,

        // Destination
        x, y,
        this.char.width, this.char.height
    );

    if(u && prt.y == mult.height - 1) {
        ctx.fillStyle = this.colors[color];
        ctx.fillRect(
            x,
            y + this.char.height - 1,
            this.char.width,
            mult.height
        );
    }
};

