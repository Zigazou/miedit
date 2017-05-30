class Cell {
    constructor(type, value, fgColor) {
        "use strict"
        this.type = type
        this.value = value
        this.fgColor = fgColor
    }

    copy() {
    
    }
}

class CharCell extends Cell {
    constructor() {
        "use strict";
        super('C', 0x20, 7)

        this.blink = false
        this.invert = false
        this.mult = { width: 1, height: 1 }
        this.part = { x: 0, y: 0 }

        Object.preventExtensions(this)
    }

    copy() {
        "use strict"
        const cell = new CharCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.blink = this.blink
        cell.invert = this.invert
        cell.mult = { width: this.mult.width, height: this.mult.height }
        cell.part = { x: this.part.x, y: this.part.y }

        return cell
    }
}

class MosaicCell extends Cell {
    constructor() {
        "use strict"
        super('M', 0x40, 7)

        this.bgColor = 0
        this.blink = false
        this.separated = false

        Object.preventExtensions(this)
    }

    copy() {
        "use strict"
        const cell = new MosaicCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.bgColor = this.bgColor
        cell.blink = this.blink
        cell.separated = this.separated

        return cell
    }
}

class DelimiterCell extends Cell {
    constructor() {
        "use strict"
        super('D', 0x20, 7)

        this.bgColor = 0
        this.invert = false
        this.zoneUnderline = undefined
        this.mask = undefined
        this.mult = { width: 1, height: 1 }

        Object.preventExtensions(this)
    }

    copy() {
        "use strict"
        const cell = new DelimiterCell()

        cell.value = this.value

        cell.fgColor = this.fgColor
        cell.bgColor = this.bgColor
        cell.invert = this.invert
        cell.zoneUnderline = this.zoneUnderline
        cell.mask = false
        cell.mult = { width: this.mult.width, height: this.mult.height }

        return cell
    }
}
