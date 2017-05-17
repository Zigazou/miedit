function defaultValue(value) {
    if(value1 === undefined) return value2;
    return value1;
}

function CharCell() {
    "use strict";
    this.type = 'C';
    this.value = 0x20;

    this.fgColor = 7;
    this.blink = false;
    this.invert = false;
    this.mult = { width: 1, height: 1 };
    this.part = { x: 0, y: 0 };

    Object.preventExtensions(this);
}

CharCell.prototype.copy = function() {
    "use strict";
    const cell = new CharCell();

    cell.type = this.type;
    cell.value = this.value;

    cell.fgColor = this.fgColor;
    cell.blink = this.blink;
    cell.invert = this.invert;
    cell.mult = { width: this.mult.width, height: this.mult.height };
    cell.part = { x: this.part.x, y: this.part.y };

    return cell;
}

function MosaicCell() {
    "use strict";
    this.type = 'M';
    this.value = 0x40;

    this.fgColor = 7;
    this.bgColor = 0;
    this.blink = false;
    this.separated = false;

    Object.preventExtensions(this);
}

MosaicCell.prototype.copy = function() {
    "use strict";
    const cell = new MosaicCell();

    cell.type = this.type;
    cell.value = this.value;

    cell.fgColor = this.fgColor;
    cell.bgColor = this.bgColor;
    cell.blink = this.blink;
    cell.separated = this.separated;

    return cell;
}

function DelimiterCell() {
    "use strict";
    this.type = 'D';
    this.value = 0x20;    

    this.fgColor = 7;
    this.bgColor = 0;
    this.invert = false;
    this.blink = false;
    this.zoneUnderline = undefined;
    this.mask = undefined;
    this.mult = { width: 1, height: 1 };
    this.part = { x: 0, y: 0 };

    Object.preventExtensions(this);
}

MosaicCell.prototype.copy = function() {
    "use strict";
    const cell = new DelimiterCell();

    cell.type = this.type;
    cell.value = this.value;

    cell.fgColor = this.fgColor;
    cell.bgColor = this.bgColor;
    cell.invert = this.invert;
    cell.blink = this.blink;
    cell.mask = false;
    cell.mult = { width: this.mult.width, height: this.mult.height };
    cell.part = { x: this.part.x, y: this.part.y };

    return cell;
}

