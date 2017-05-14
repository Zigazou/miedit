function FiniteStack(maxLength) {
    "use strict";
    this.maxLength = maxLength;
    this.stack = [];
}

FiniteStack.prototype.push = function(value) {
    "use strict";
    this.stack.push(value);
    if(this.stack.length > this.maxLength) this.stack.shift();
}

FiniteStack.prototype.lastValue = function() {
    "use strict";
    if(this.stack.length == 0) return null;

    return this.stack[this.stack.length - 1];
};

FiniteStack.prototype.lastValues = function(count) {
    "use strict";
    return this.stack.slice(-count);
};

function MinitelDecoder(pageMemory) {
    "use strict";
    this.state = 'start';
    this.pageMode = true;

    this.pm = pageMemory;
    this.clear('page');
    this.clear('status');

    this.previousBytes = new FiniteStack(128);

    const aPageCell = new PageCell();
    this.charPage = 'G0';
    this.lastValue = null;
    this.fgColor = aPageCell.fgColor;
    this.bgColor = aPageCell.bgColor;
    this.mult = aPageCell.mult
    this.invert = aPageCell.invert;
    this.blink = aPageCell.blink;
    this.mask = aPageCell.mask;
    this.underline = aPageCell.underline;
    this.separated = aPageCell.separated;

    this.attributesDefined = true;
}

MinitelDecoder.prototype.landingZoneAttributes = function() {
    const x = this.pm.cursor.x;
    const y = this.pm.cursor.y;

    if(x == 0) {
        this.underline = false;
        this.bgColor = 0;
    } else {
        if(this.pm.memory[y][x - 1].charPage == 'G0') {
            this.underline = this.pm.memory[y][x - 1].underline;
        } else {
            this.underline = false;
        }

        this.bgColor = this.pm.memory[y][x - 1].bgColor;
    }
};

MinitelDecoder.prototype.moveCursor = function(direction) {
    "use strict";
    switch(direction) {
        case 'char':
            this.pm.cursor.x += this.mult.width;
            if(this.pm.cursor.x >= this.pm.grid.cols) {
                if(this.pm.cursor.y == 0) {
                    // No overflow on status line
                    this.pm.cursor.x = this.pm.grid.cols - 1;
                } else {
                    // Go to start of next row
                    this.pm.cursor.x = 0;
                    for(let i = 0; i < this.mult.height; i++) {
                        this.moveCursor('down');
                    }
                }
            }

            break;

        case 'left':
            this.pm.cursor.x--;
            if(this.pm.cursor.x < 0) {
                this.pm.cursor.x = this.pm.grid.cols - 1;
                this.moveCursor('up');
            }

            break;

        case 'right':
            this.pm.cursor.x++;
            if(this.pm.cursor.x >= this.pm.grid.cols) {
                this.pm.cursor.x = 0;
                this.moveCursor('down');
            }

            break;

        case 'up':
            if(this.pm.cursor.y == 0) break;

            this.pm.cursor.y--;

            if(this.pm.cursor.y == 0) {
                if(this.pageMode) {
                    this.pm.cursor.y = this.pm.grid.rows - 1;
                } else {
                    this.pm.cursor.y = 1;
                    this.pm.scroll('down');
                }
            }
            break;

        case 'down':
            if(this.pm.cursor.y == 0) break;

            this.pm.cursor.y++;

            if(this.pm.cursor.y == this.pm.grid.rows) {
                if(this.pageMode) {
                    this.pm.cursor.y = 1;
                } else {
                    this.pm.cursor.y = this.pm.grid.rows - 1;
                    this.pm.scroll('up');
                }
            }
            break;


        case 'firstColumn':
            this.pm.cursor.x = 0;
            break;

        case 'home':
            this.pm.cursor.x = 0;
            this.pm.cursor.y = 1;
            break;
    }

    if(direction != 'char') {
        this.underline = undefined;
        this.mask = undefined;
        this.bgColor = undefined;
        this.landingZoneAttributes();
    }
};

MinitelDecoder.prototype.clear = function(range) {
    "use strict";
    switch(range) {
        case 'page':
            for(let j = 1; j < this.pm.grid.rows; j++) {
                for(let i = 0; i < this.pm.grid.cols; i++) {
                    this.pm.memory[j][i] = new PageCell();
                }
            }

            break;

        case 'status':
            let row = [];
            for(let i = 0; i < this.pm.grid.cols; i++) {
                this.pm.memory[0][i] = new PageCell();
            }

            break;            

        case 'eol':
            break;
    };
};

MinitelDecoder.prototype.setPageMode = function(bool) {
    "use strict";
    this.pageMode = bool;
};

MinitelDecoder.prototype.setCharPage = function(charPage) {
    "use strict";
    this.charPage = charPage;

    switch(charPage) {
        case 'G0': this.separated = undefined; break;
        case 'G1': this.underline = undefined; break;
    }

    this.bgColor = undefined;
    this.invert = false;
    this.mult = { width: 1, height: 1 };
};

MinitelDecoder.prototype.showCursor = function(visibility) {
    "use strict";
    this.pm.cursor.visible = visibility;
};

MinitelDecoder.prototype.setFgColor = function(color) {
    "use strict";
    this.fgColor = color;
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setBgColor = function(color) {
    "use strict";
    this.bgColor = color;
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setSize = function(sizeName) {
    "use strict";
    const sizes = {
        'normalSize': { width: 1, height: 1 },
        'doubleWidth': { width: 2, height: 1 },
        'doubleHeight': { width: 1, height: 2 },
        'doubleSize': { width: 2, height: 2 },
    };

    if(!(sizeName in sizes)) return;
    this.mult = sizes[sizeName];    
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setBlink = function(blink) {
    "use strict";
    this.blink = blink;
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setInsert = function(insert) {
    "use strict";
    this.insert = insert;
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setMask = function(mask) {
    "use strict";
    this.mask = mask;
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setUnderline = function(underline) {
    "use strict";
    if(this.charPage == 'G0') {
        this.underline = underline;
    } else {
        this.separated = underline;
    }
    this.attributesDefined = true;
};

MinitelDecoder.prototype.setInvert = function(invert) {
    "use strict";
    this.invert = invert;
    this.attributesDefined = true;
};

MinitelDecoder.prototype.locate = function(y, x) {
    "use strict";
    x -= 0x40;
    y -= 0x40;

    if(x < 1 || x > 40) return;
    if(y < 0 || y > 24) return;

    this.pm.cursor.x = x - 1;
    this.pm.cursor.y = y;

    this.charPage = 'G0';
    this.mult = { width: 1, height: 1 };
    this.fgColor = 7;
    this.bgColor = undefined;
    this.underline = false;
    this.blink = false;
    this.invert = false;
    this.mask = false;
    this.separated = undefined;
};

MinitelDecoder.prototype.print = function(charCode) {
    "use strict";
    const x = this.pm.cursor.x;
    const y = this.pm.cursor.y;

    const cell = new PageCell();
    cell.value = charCode;

    cell.charPage = this.charPage;
    cell.mult = this.mult
    cell.fgColor = this.fgColor;
    cell.bgColor = this.bgColor;
    cell.underline = this.underline;
    cell.blink = this.blink;
    cell.invert = this.invert;
    cell.mask = this.mask;
    cell.separated = this.separated;
    
    if(y == 0) {
        cell.mult = { width: 1, height: 1 };
        cell.charPage = 'G0';
        cell.fgColor = 7;
        cell.bgColor = 0;
        cell.underline = false;
        cell.blink = false;
        cell.invert = this.invert;
        cell.mask = false;
        cell.separated = false;
    }

    if(y == 1 && cell.mult.height > 1) {
        cell.mult = { width: 1, height: 1 };
    }

    if(cell.charPage == 'G1') {
        if(cell.value >= 0x20 && cell.value <= 0x3F) {
            cell.value += 0x20;
        } else if(cell.value == 0x5F) {
            cell.value = 0x7F;
        } else if(cell.value >= 0x40 && cell.value <= 0x5E) {
            cell.value = 0x40;
        }

        if(cell.separated) {
            cell.value -= 0x40;
        }
    } else {
        cell.delimiter = (cell.value == 0x20) && this.attributesDefined;
    }

    for(let j = 0; j < cell.mult.height; j++) {
        for(let i = 0; i < cell.mult.width; i++) {
            const newCell = cell.copy();
            newCell.part = { x: i, y: cell.mult.height - j - 1 };
            this.pm.memory[y - j][x + i] = newCell;
        }
    }

    this.lastValue = charCode;
    this.moveCursor('char');
    this.attributesDefined = false;
};

MinitelDecoder.prototype.repeat = function(count) {
    "use strict";

    count -= 0x40;
    for(let i = 0; i < count; i++) {
        this.print(this.lastValue);
    }
};

MinitelDecoder.prototype.states = {
    'start': {
        0x01: { error: 'unrecognized01' },
        0x02: { error: 'unrecognized02' },
        0x03: { error: 'unrecognized03' },
        0x04: { error: 'unrecognized04' },
        0x05: { notImplemented: 'askId' },
        0x06: { error: 'unrecognized06' },
        0x07: { notImplemented: 'beep' },
        0x08: { func: 'moveCursor', arg: 'left' },
        0x09: { func: 'moveCursor', arg: 'right' },
        0x0A: { func: 'moveCursor', arg: 'down' },
        0x0B: { func: 'moveCursor', arg: 'up' },
        0x0C: { func: 'clear', arg: 'page' },
        0x0D: { func: 'moveCursor', arg: 'firstColumn' },
        0x0E: { func: 'setCharPage', arg: 'G1' },
        0x0F: { func: 'setCharPage', arg: 'G0' },
        0x10: { error: 'unrecognized10' },
        0x11: { func: 'showCursor', arg: true },
        0x12: { goto: 'repeat' },
        0x13: { goto: 'sep' },
        0x14: { func: 'showCursor', arg: false },
        0x15: { error: 'unrecognized15' },
        0x16: { goto: 'g2' },
        0x17: { error: 'unrecognized17' },
        0x18: { func: 'clear', arg: 'eol' },
        0x19: { goto: 'g2' },
        0x1A: { notImplemented: 'errorSignal' },
        0x1B: { goto: 'esc'},
        0x1C: { error: 'unrecognized1C' },
        0x1D: { error: 'unrecognized1D' },
        0x1E: { func: 'moveCursor', arg: 'home' },
        0x1F: { goto: 'us' },
        '*': { func: 'print', dynarg: 1 }
    },

    'repeat': {
        '*': { func: 'repeat', dynarg: 1 }
    },

    'g2': {
        0x23: { func: 'print', arg: 0x03 }, // £
        0x24: { func: 'print', arg: 0x24 }, // $
        0x26: { func: 'print', arg: 0x23 }, // #
        0x2C: { func: 'print', arg: 0x0C }, // ←
        0x2D: { func: 'print', arg: 0x5E }, // ↑
        0x2E: { func: 'print', arg: 0x0E }, // →
        0x2F: { func: 'print', arg: 0x0F }, // ↓
        0x30: { func: 'print', arg: 0x10 }, // °
        0x31: { func: 'print', arg: 0x11 }, // ±
        0x38: { func: 'print', arg: 0x18 }, // ÷
        0x3C: { func: 'print', arg: 0x1C }, // ¼
        0x3D: { func: 'print', arg: 0x1D }, // ½
        0x3E: { func: 'print', arg: 0x1E }, // ¾
        0x6A: { func: 'print', arg: 0x0A }, // Œ
        0x7A: { func: 'print', arg: 0x1A }, // œ
        0x41: { goto: 'g2grave' }, // grave
        0x42: { goto: 'g2acute' }, // acute
        0x43: { goto: 'g2circ' }, // circ
        0x48: { goto: 'g2trema' }, // trema
        0x4B: { goto: 'g2cedila' }, // cedila
        '*': { func: 'print', arg: 0x5F }
    },

    'g2grave': {
        0x41: { func: 'print', arg: 0x07 }, // À
        0x61: { func: 'print', arg: 0x17 }, // à
        0x45: { func: 'print', arg: 0x09 }, // È
        0x65: { func: 'print', arg: 0x19 }, // è
        0x75: { func: 'print', arg: 0x08 }, // ù
        '*': { func: 'print', arg: 0x5F }
    },
    
    'g2acute': {
        0x45: { func: 'print', arg: 0x09 }, // É
        0x65: { func: 'print', arg: 0x12 }, // é
        '*': { func: 'print', arg: 0x5F }
    },
    
    'g2circ': {
        0x41: { func: 'print', arg: 0x01 }, // Â
        0x61: { func: 'print', arg: 0x04 }, // â
        0x45: { func: 'print', arg: 0x0B }, // Ê
        0x65: { func: 'print', arg: 0x1B }, // ê
        0x75: { func: 'print', arg: 0x16 }, // û
        0x69: { func: 'print', arg: 0x0D }, // î
        0x6F: { func: 'print', arg: 0x1F }, // ô
        '*': { func: 'print', arg: 0x5F }
    },
    
    'g2trema': {
        0x45: { func: 'print', arg: 0x06 }, // Ë
        0x65: { func: 'print', arg: 0x13 }, // ë
        0x69: { func: 'print', arg: 0x14 }, // ï
        '*': { func: 'print', arg: 0x5F }
    },
    
    'g2cedila': {
        0x43: { func: 'print', arg: 0x05 }, // Ç
        0x63: { func: 'print', arg: 0x15 }, // ç
        '*': { func: 'print', arg: 0x5F }
    },
    

    'sep': {
        '*': { notImplemented: 'sepCommand' }
    },
    
    'esc': {
        0x23: { goto: 'attribute' },
        0x28: { goto: 'selectG0charset' },
        0x29: { goto: 'selectG1charset' },
        0x39: { goto: 'pro1' },
        0x3A: { goto: 'pro2' },
        0x3B: { goto: 'pro3' },
        0x40: { func: 'setFgColor', arg: 0 },
        0x41: { func: 'setFgColor', arg: 1 },
        0x42: { func: 'setFgColor', arg: 2 },
        0x43: { func: 'setFgColor', arg: 3 },
        0x44: { func: 'setFgColor', arg: 4 },
        0x45: { func: 'setFgColor', arg: 5 },
        0x46: { func: 'setFgColor', arg: 6 },
        0x47: { func: 'setFgColor', arg: 7 },
        0x48: { func: 'setBlink', arg: true },
        0x49: { func: 'setBlink', arg: false },
        0x4A: { func: 'setInsert', arg: false },
        0x4B: { func: 'setInsert', arg: true },
        0x4C: { func: 'setSize', arg: 'normalSize' },
        0x4D: { func: 'setSize', arg: 'doubleHeight' },
        0x4E: { func: 'setSize', arg: 'doubleWidth' },
        0x4F: { func: 'setSize', arg: 'doubleSize' },
        0x50: { func: 'setBgColor', arg: 0 },
        0x51: { func: 'setBgColor', arg: 1 },
        0x52: { func: 'setBgColor', arg: 2 },
        0x53: { func: 'setBgColor', arg: 3 },
        0x54: { func: 'setBgColor', arg: 4 },
        0x55: { func: 'setBgColor', arg: 5 },
        0x56: { func: 'setBgColor', arg: 6 },
        0x57: { func: 'setBgColor', arg: 7 },
        0x58: { func: 'setMask', arg: true },
        0x59: { func: 'setUnderline', arg: false },
        0x5A: { func: 'setUnderline', arg: true },
        0x5B: { goto: 'csi' },
        0x5C: { func: 'setInvert', arg: false },
        0x5D: { func: 'setInvert', arg: true },
        0x5F: { func: 'setMask', arg: false },
    },

    'us': { '*': { goto: 'us-2' } },
    'us-2': { '*': { func: 'locate', dynarg: 2 } },

    'attribute': {
        0x20: { goto: 'attributeOn' },
        0x21: { goto: 'attributeOff' },
    },

    'attributeOn': { '*': { notImplemented: 'attributeOn' } },
    'attributeOff': { '*': { notImplemented: 'attributeOff' } },

    'csi': {
        /*0x41: { func: 'moveCursorN
        0x42: { func: 'moveCursorN', arg:'', csi: },
        '*': { goto: 'csi' }*/
        '*': { notImplemented: 'csiSequence' }
     },

    'pro1': { '*': { notImplemented: 'pro1Sequence' } },
    'pro2': {
        0x69: { goto: 'startScreenMode' },
        0x6A: { goto: 'stopScreenMode' },
    },

    'startScreenMode': {
        0x43: { func: 'setPageMode', arg: false },
        0x46: { notImplemented: 'startUpZoom' },
        0x47: { notImplemented: 'startDownZoom' },
    },

    'stopScreenMode': {
        0x43: { func: 'setPageMode', arg: true },
        0x46: { notImplemented: 'stopUpZoom' },
        0x47: { notImplemented: 'stopDownZoom' },
    },

    'pro3': { '*': { goto: 'pro3-2' } },
    'pro3-2': { '*': { goto: 'pro3-3' } },
    'pro3-3': { '*': { notImplemented: 'pro3Sequence' } },
};

MinitelDecoder.prototype.decode = function(char) {
    "use strict";
    const c = char.charCodeAt(0);

    if(c == 0x00) return;

    this.previousBytes.push(c);

    if(!(this.state in this.states)) {
        console.log('Unknown state: ' + this.state);
        this.state = 'start';
        return;
    }

    const st = c in this.states[this.state] ? c : '*';
    const action = st in this.states[this.state]
                 ? this.states[this.state][st]
                 : null;

    if(action === null) {
        console.log('unexpectedChar: ' + c);
    } else if('notImplemented' in action) {
        console.log('Not implemented: ' + action.notImplemented);
    } else if('error' in action) {
        console.log('Error: ' + action.error);
    } else if('func' in action && !(action.func in this)) {
        console.log('Error: developer forgot to write ' + action.func);
    } else if('func' in action) {
        let args = [];
        if('arg' in action) {
            args = [action.arg];
        } else if('dynarg' in action) {
            args = this.previousBytes.lastValues(action.dynarg);
        }

        //console.log(this.state, st, action.func, args);

        this[action.func].apply(this, args);
    }

    this.state = action && 'goto' in action ? action.goto : 'start';
}

MinitelDecoder.prototype.decodeList = function(items) {
    if (typeof items === 'string' || items instanceof String) {
        for(let i = 0; i < items.length; i++) {
            this.decode(items[i]);
        }
    } else {
        for(let i = 0; i < items.length; i++) {
            this.decode(String.fromCharCode(items[i]));
        }
    }
}

