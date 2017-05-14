function PageCell() {
    "use strict";

    this.charPage = 'G1'; // G0, G1
    this.value = 0x40;
    this.fgColor = 7;
    this.bgColor = 0;
    this.mult = { width: 1, height: 1 };
    this.part = { x: 0, y: 0 };
    this.invert = undefined;
    this.blink = false;
    this.mask = false;
    this.underline = undefined;
    this.separated = false;
    this.delimiter = false;
}

PageCell.prototype.copy = function() {
    "use strict";
    const cell = new PageCell();

    cell.charPage = this.charPage;
    cell.value = this.value;
    cell.fgColor = this.fgColor;
    cell.bgColor = this.bgColor;
    cell.mult = { width: this.mult.width, height: this.mult.height };
    cell.part = { x: this.part.x, y: this.part.y };
    cell.invert = this.invert;
    cell.blink = this.blink;
    cell.mask = this.mask;
    cell.underline = this.underline;
    cell.separated = this.separated;
    cell.delimiter = this.delimiter;

    return cell;
}

/*
grid = { cols: …, rows: … }
char = { width: …, height: … }
zoom = { x: …, y: … }
*/
function PageMemory(grid, char, zoom, canvas) {
    "use strict";

    this.grid = grid;
    this.char = char;
    this.zoom = zoom;
    this.canvas = canvas;
    this.context = this.createContext();
    this.colors = this.minitelColors;

    this.font = {
        'G0': this.loadFont('font/ef9345-g0.png'),
        'G1': this.loadFont('font/ef9345-g1.png'),
    };

    this.cursor = {
        x: 0,
        y: 1,
        visible: false,
    };

    this.memory = [];

    for(let j = 0; j < this.grid.rows; j++) {
        let row = [];
        for(let i = 0; i < this.grid.cols; i++) {
            row[i] = new PageCell();
        }
        this.memory[j] = row;
    }
}

PageMemory.prototype.createContext = function() {
    "use strict";

    const ctx = this.canvas.getContext("2d");

    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.scale(this.zoom.x, this.zoom.y);
    ctx.fillStyle = "#000000";
    ctx.fillRect(
        0,
        0,
        this.char.width * this.grid.cols * this.zoom.x,
        this.char.height * this.grid.rows * this.zoom.y
    );
    
    return ctx;
};

PageMemory.prototype.loadFont = function(url) {
    "use strict";
    return new FontSprite(
        url,
        { cols: 8, rows: 16 },
        this.char,
        this.zoom,
        this.colors
    );
};

PageMemory.prototype.scroll = function(direction) {
    "use strict";

    const newRow = []
    for(let col = 0; col < this.grid.cols; col++) {
        newRow[col] = new PageCell();
    }

    switch(direction) {
        case 'up':
            for(let row = 2; row < this.grid.rows; row++) {
                this.memory[row] = this.memory[row + 1];
            }

            this.memory[this.grid.rows - 1] = newRow;

            break;
            
        case 'down':
            for(let row = this.grid.rows - 1; row > 1; row--) {
                this.memory[row] = this.memory[row - 1];
            }

            this.memory[1] = newRow;

            break;
    }
}

PageMemory.prototype.minitelGrays = [
    '#000000', // 0%
    '#7F7F7F', // 50%
    '#B2B2B2', // 70%
    '#E5E5E5', // 90%
    '#666666', // 40% 
    '#999999', // 60%
    '#CCCCCC', // 80%
    '#FFFFFF', // 100%
];

PageMemory.prototype.minitelColors = [
    '#000000', // black
    '#FF0000', // red
    '#00FF00', // green
    '#FFFF00', // yellow
    '#0000FF', // blue
    '#FF00FF', // magenta
    '#00FFFF', // cyan
    '#FFFFFF', // white
];

PageMemory.prototype.render = function() {
    "use strict";

    // Add the inverted F on the status line
    const fCell = new PageCell();
    fCell.charPage = 'G0';
    fCell.value = 0x46;
    fCell.invert = true;
    this.memory[0][38] = fCell;

    // Draw each cell
    for(let row = 0; row < this.grid.rows; row++) {
        // Zone attributes
        let bgColor = 0;
        let mask = false;
        let underline = false;
        let charPage = 'G1';

        for(let col = 0; col < this.grid.cols; col++) {
            const cell = this.memory[row][col];
            const x = col * this.char.width;
            const y = row * this.char.height;

            let finalFgColor = cell.fgColor;
            let finalBgColor = bgColor;

            if(cell.charPage == 'G1' || cell.delimiter) {
                finalBgColor = cell.bgColor;
            }

            if(cell.invert && cell.charPage == 'G0') {
                let swap = finalBgColor;
                finalBgColor = finalFgColor;
                finalFgColor = swap;
            }

            // Draw background
            this.context.fillStyle = this.colors[finalBgColor];
            this.context.fillRect(
                x, y,
                this.char.width, this.char.height
            );

            // Draw character
            if(!mask) {
                this.font[cell.charPage].writeChar(
                    this.context,
                    cell.value,
                    x, y,
                    cell.part,
                    cell.mult,
                    finalFgColor,
                    cell.underline && !cell.delimiter
                );
            }

            if(cell.delimiter) {
                mask = cell.mask;
                bgColor = cell.bgColor;
            }
        }
    }
}

