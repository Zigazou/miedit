"use strict"
var Minitel = Minitel || {}

Minitel.rows = 25
Minitel.columns = 40
Minitel.charWidth = 8
Minitel.charHeight = 10
Minitel.B1200 = 1200 // bits per second
Minitel.B4800 = 4800 // bits per second
Minitel.B9600 = 9600 // bits per second

Minitel.grays = [
    "#000000", // 0%
    "#7F7F7F", // 50%
    "#B2B2B2", // 70%
    "#E5E5E5", // 90%
    "#666666", // 40% 
    "#999999", // 60%
    "#CCCCCC", // 80%
    "#FFFFFF", // 100%
]

Minitel.colors = [
    "#000000", // black
    "#FF0000", // red
    "#00FF00", // green
    "#FFFF00", // yellow
    "#0000FF", // blue
    "#FF00FF", // magenta
    "#00FFFF", // cyan
    "#FFFFFF", // white
]

Minitel.contrasts = [ 7, 7, 0, 0, 7, 7, 0, 0 ]

Minitel.directStream = {
    "clear-screen": [0x0c],
    "clear-status": [0x1f, 0x40, 0x41, 0x18, 0x0a],
    "clear-eol": [0x18],
    "clear-end-of-screen": [0x1b, 0x5b, 0x4a],
    "clear-start-of-screen": [0x1b, 0x5b, 0x31, 0x4a],
    "clear-start-of-line": [0x1b, 0x5b, 0x31, 0x4b],
    "clear-complete-line": [0x1b, 0x5b, 0x32, 0x4b],
    "clear-complete-screen": [0x1b, 0x5b, 0x32, 0x4a],
    "move-up": [0x0b],
    "move-down": [0x0a],
    "move-left": [0x08],
    "move-right": [0x09],
    "move-sol": [0x0d],
    "content-g0": [0x0f],
    "content-g1": [0x0e],
    "effect-underline-on": [0x1b, 0x5a],
    "effect-underline-off": [0x1b, 0x59],
    "effect-invert-on": [0x1b, 0x5d],
    "effect-invert-off": [0x1b, 0x5c],
    "effect-blink-on": [0x1b, 0x48],
    "effect-blink-off": [0x1b, 0x49],
    "effect-normal-size": [0x1b, 0x4c],
    "effect-double-height": [0x1b, 0x4d],
    "effect-double-width": [0x1b, 0x4e],
    "effect-double-size": [0x1b, 0x4f],
    "cursor-on": [0x11],
    "cursor-off": [0x14],
    "color-fg-0": [0x1b, 0x40],
    "color-fg-1": [0x1b, 0x41],
    "color-fg-2": [0x1b, 0x42],
    "color-fg-3": [0x1b, 0x43],
    "color-fg-4": [0x1b, 0x44],
    "color-fg-5": [0x1b, 0x45],
    "color-fg-6": [0x1b, 0x46],
    "color-fg-7": [0x1b, 0x47],
    "color-bg-0": [0x1b, 0x50],
    "color-bg-1": [0x1b, 0x51],
    "color-bg-2": [0x1b, 0x52],
    "color-bg-3": [0x1b, 0x53],
    "color-bg-4": [0x1b, 0x54],
    "color-bg-5": [0x1b, 0x55],
    "color-bg-6": [0x1b, 0x56],
    "color-bg-7": [0x1b, 0x57],
    "drcs-std-g0": [0x1b, 0x28, 0x40],
    "drcs-drcs-g0": [0x1b, 0x28, 0x20, 0x42],
    "drcs-std-g1": [0x1b, 0x29, 0x63],
    "drcs-drcs-g1": [0x1b, 0x29, 0x20, 0x43],
    "mask-zone-on": [0x1b, 0x58],
    "mask-zone-off": [0x1b,0x5f],
    "mask-global-on": [0x1b, 0x23, 0x20, 0x58],
    "mask-global-off": [0x1b, 0x23, 0x20, 0x5f],
}

Minitel.specialChars = {
    163: [0x19, 0x23], // £
    176: [0x19, 0x30], // °
    177: [0x19, 0x31], // ±
    8592: [0x19, 0x2C], // ←
    8593: [0x19, 0x2D], // ↑
    8594: [0x19, 0x2E], // →
    8595: [0x19, 0x2F], // ↓
    188: [0x19, 0x3C], // ¼
    189: [0x19, 0x3D], // ½
    190: [0x19, 0x3E], // ¾
    231: [0x19, 0x4B, 0x63], // ç
    8217: [0x27], // ’
    224: [0x19, 0x41, 0x61], // à
    225: [0x19, 0x42, 0x61], // á
    226: [0x19, 0x43, 0x61], // â
    228: [0x19, 0x48, 0x61], // ä
    232: [0x19, 0x41, 0x65], // è
    233: [0x19, 0x42, 0x65], // é
    234: [0x19, 0x43, 0x65], // ê
    235: [0x19, 0x48, 0x65], // ë
    236: [0x19, 0x41, 0x69], // ì
    237: [0x19, 0x42, 0x69], // í
    238: [0x19, 0x43, 0x69], // î
    239: [0x19, 0x48, 0x69], // ï
    242: [0x19, 0x41, 0x6F], // ò
    243: [0x19, 0x42, 0x6F], // ó
    244: [0x19, 0x43, 0x6F], // ô
    246: [0x19, 0x48, 0x6F], // ö
    249: [0x19, 0x41, 0x75], // ù
    250: [0x19, 0x42, 0x75], // ú
    251: [0x19, 0x43, 0x75], // û
    252: [0x19, 0x48, 0x75], // ü
    338: [0x19, 0x6A], // Œ
    339: [0x19, 0x7A], // œ
    223: [0x19, 0x7B], // ß
    946: [0x19, 0x7B] // β
}

Minitel.color2int = {
    "a": 0,
    "b": 1,
    "c": 2,
    "d": 3,
    "e": 4,
    "f": 5,
    "g": 6,
    "h": 7,
    "-": 0,
}

Minitel.states =  {
    "start": {
        0x01: { error: "unrecognized01" },
        0x02: { error: "unrecognized02" },
        0x03: { error: "unrecognized03" },
        0x04: { error: "unrecognized04" },
        0x05: { notImplemented: "askId" },
        0x06: { error: "unrecognized06" },
        0x07: { notImplemented: "beep" },
        0x08: { func: "moveCursor", arg: "left" },
        0x09: { func: "moveCursor", arg: "right" },
        0x0A: { func: "moveCursor", arg: "down" },
        0x0B: { func: "moveCursor", arg: "up" },
        0x0C: { func: "clear", arg: "page" },
        0x0D: { func: "moveCursor", arg: "firstColumn" },
        0x0E: { func: "setCharType", arg: "G1" },
        0x0F: { func: "setCharType", arg: "G0" },
        0x10: { error: "unrecognized10" },
        0x11: { func: "showCursor", arg: true },
        0x12: { goto: "repeat" },
        0x13: { goto: "sep" },
        0x14: { func: "showCursor", arg: false },
        0x15: { error: "unrecognized15" },
        0x16: { goto: "g2" },
        0x17: { error: "unrecognized17" },
        0x18: { func: "clear", arg: "eol" },
        0x19: { goto: "g2" },
        0x1A: { notImplemented: "errorSignal" },
        0x1B: { goto: "esc"},
        0x1C: { error: "unrecognized1C" },
        0x1D: { error: "unrecognized1D" },
        0x1E: { func: "moveCursor", arg: "home" },
        0x1F: { goto: "us" },
        "*": { func: "print", dynarg: 1 }
    },

    "repeat": {
        "*": { func: "repeat", dynarg: 1 }
    },

    "g2": {
        0x23: { func: "print", arg: 0x03 }, // £
        0x24: { func: "print", arg: 0x24 }, // $
        0x26: { func: "print", arg: 0x23 }, // #
        0x2C: { func: "print", arg: 0x0C }, // ←
        0x2D: { func: "print", arg: 0x5E }, // ↑
        0x2E: { func: "print", arg: 0x0E }, // →
        0x2F: { func: "print", arg: 0x0F }, // ↓
        0x30: { func: "print", arg: 0x10 }, // °
        0x31: { func: "print", arg: 0x11 }, // ±
        0x38: { func: "print", arg: 0x18 }, // ÷
        0x3C: { func: "print", arg: 0x1C }, // ¼
        0x3D: { func: "print", arg: 0x1D }, // ½
        0x3E: { func: "print", arg: 0x1E }, // ¾
        0x6A: { func: "print", arg: 0x0A }, // Œ
        0x7A: { func: "print", arg: 0x1A }, // œ
        0x41: { goto: "g2grave" }, // grave
        0x42: { goto: "g2acute" }, // acute
        0x43: { goto: "g2circ" }, // circ
        0x48: { goto: "g2trema" }, // trema
        0x4B: { goto: "g2cedila" }, // cedila
        "*": { func: "print", arg: 0x5F }
    },

    "g2grave": {
        0x41: { func: "print", arg: 0x07 }, // À
        0x61: { func: "print", arg: 0x17 }, // à
        0x45: { func: "print", arg: 0x09 }, // È
        0x65: { func: "print", arg: 0x19 }, // è
        0x75: { func: "print", arg: 0x08 }, // ù
        "*": { func: "print", arg: 0x5F }
    },

    "g2acute": {
        0x45: { func: "print", arg: 0x02 }, // É
        0x65: { func: "print", arg: 0x12 }, // é
        "*": { func: "print", arg: 0x5F }
    },

    "g2circ": {
        0x41: { func: "print", arg: 0x01 }, // Â
        0x61: { func: "print", arg: 0x04 }, // â
        0x45: { func: "print", arg: 0x0B }, // Ê
        0x65: { func: "print", arg: 0x1B }, // ê
        0x75: { func: "print", arg: 0x16 }, // û
        0x69: { func: "print", arg: 0x0D }, // î
        0x6F: { func: "print", arg: 0x1F }, // ô
        "*": { func: "print", arg: 0x5F }
    },

    "g2trema": {
        0x45: { func: "print", arg: 0x06 }, // Ë
        0x65: { func: "print", arg: 0x13 }, // ë
        0x69: { func: "print", arg: 0x14 }, // ï
        "*": { func: "print", arg: 0x5F }
    },

    "g2cedila": {
        0x43: { func: "print", arg: 0x05 }, // Ç
        0x63: { func: "print", arg: 0x15 }, // ç
        "*": { func: "print", arg: 0x5F }
    },


    "sep": {
        "*": { notImplemented: "sepCommand" }
    },

    "esc": {
        0x23: { goto: "mask-global" },
        0x28: { goto: "drcs-g0-use" },
        0x29: { goto: "drcs-g1-use" },
        0x37: { notImplemented: "saveContext" },
        0x38: { notImplemented: "restoreContext" },
        0x39: { goto: "pro1" },
        0x3A: { goto: "pro2" },
        0x3B: { goto: "pro3" },
        0x40: { func: "setFgColor", arg: 0 },
        0x41: { func: "setFgColor", arg: 1 },
        0x42: { func: "setFgColor", arg: 2 },
        0x43: { func: "setFgColor", arg: 3 },
        0x44: { func: "setFgColor", arg: 4 },
        0x45: { func: "setFgColor", arg: 5 },
        0x46: { func: "setFgColor", arg: 6 },
        0x47: { func: "setFgColor", arg: 7 },
        0x48: { func: "setBlink", arg: true },
        0x49: { func: "setBlink", arg: false },
        0x4A: { notImplemented: "setInsertOff" },
        0x4B: { notImplemented: "setInsertOn" },
        0x4C: { func: "setSize", arg: "normalSize" },
        0x4D: { func: "setSize", arg: "doubleHeight" },
        0x4E: { func: "setSize", arg: "doubleWidth" },
        0x4F: { func: "setSize", arg: "doubleSize" },
        0x50: { func: "setBgColor", arg: 0 },
        0x51: { func: "setBgColor", arg: 1 },
        0x52: { func: "setBgColor", arg: 2 },
        0x53: { func: "setBgColor", arg: 3 },
        0x54: { func: "setBgColor", arg: 4 },
        0x55: { func: "setBgColor", arg: 5 },
        0x56: { func: "setBgColor", arg: 6 },
        0x57: { func: "setBgColor", arg: 7 },
        0x58: { func: "setMask", arg: true },
        0x59: { func: "setUnderline", arg: false },
        0x5A: { func: "setUnderline", arg: true },
        0x5B: { goto: "csi" },
        0x5C: { func: "setInvert", arg: false },
        0x5D: { func: "setInvert", arg: true },
        0x5F: { func: "setMask", arg: false },
    },

    "us": {
        0x23: { goto: "drcs-define" },
        "*": { goto: "us-2" }
    },
    "us-2": { "*": { func: "locate", dynarg: 2 } },

    "drcs-define": {
        0x20: { goto: "drcs-define-2" },
        "*": { func: "drcsSetStartChar", dynarg: 1, goto: "drcs-start" }
    },

    // Select charset on which some chars will be defined
    "drcs-define-2": { 0x20: { goto: "drcs-define-3" } },
    "drcs-define-3": { 0x20: { goto: "drcs-define-gselect" } },
    "drcs-define-gselect": {
        0x42: { goto: "drcs-define-validate-g0" },
        0x43: { goto: "drcs-define-validate-g1" }
    },
    "drcs-define-validate-g0": { 0x49: { func: "drcsDefineCharset", arg: "G0" } },
    "drcs-define-validate-g1": { 0x49: { func: "drcsDefineCharset", arg: "G1" } },

    // Define a character
    "drcs-start": { 0x30: { func: "drcsStart", goto: "drcs-read" } },
    "drcs-read": {
        0x30: { func: "drcsDefineChar", goto: "drcs-read" },
        0x1f: { func: "drcsDefineChar", goto: "us" },
        "*": { func: "drcsInc", goto: "drcs-read" }
    },

    // Select use or not of DRCS charsets
    "drcs-g0-use": {
        0x40: { func: "drcsUseG0", arg: false },
        0x20: { goto: "drcs-g0-unuse" }
    },
    "drcs-g0-unuse": { 0x42: { func: "drcsUseG0", arg: true } },

    "drcs-g1-use": {
        0x63: { func: "drcsUseG1", arg: false },
        0x20: { goto: "drcs-g1-unuse" }
    },
    "drcs-g1-unuse": { 0x43: { func: "drcsUseG1", arg: true } },

    "mask-global": {
        0x20: { goto: "mask-global-set" },
    },

    "mask-global-set": {
        0x58: { func: "setGlobalMask", arg: true },
        0x5f: { func: "setGlobalMask", arg: false }
    },

    "csi": {
        0x4a: { func: "clear", arg: "endofscreen" },
        0x31: { goto: "clearStart" },
        0x32: { goto: "clearAll" },
        /*0x41: { func: "moveCursorN
        0x42: { func: "moveCursorN", arg:"", csi: },
        "*": { goto: "csi" }*/
        "*": { notImplemented: "csiSequence" }
     },

    "clearStart": {
        0x4a: { func: "clear", arg: "startofscreen" },
        0x4b: { func: "clear", arg: "startofline" },
    },

    "clearAll": {
        0x4a: { func: "clear", arg: "completescreen" },
        0x4b: { func: "clear", arg: "completeline" },
    },

    "pro1": { "*": { notImplemented: "pro1Sequence" } },
    "pro2": {
        0x69: { goto: "startScreenMode" },
        0x6A: { goto: "stopScreenMode" },
    },

    "startScreenMode": {
        0x43: { func: "setPageMode", arg: false },
        0x46: { notImplemented: "startUpZoom" },
        0x47: { notImplemented: "startDownZoom" },
    },

    "stopScreenMode": {
        0x43: { func: "setPageMode", arg: true },
        0x46: { notImplemented: "stopUpZoom" },
        0x47: { notImplemented: "stopDownZoom" },
    },

    "pro3": { "*": { goto: "pro3-2" } },
    "pro3-2": { "*": { goto: "pro3-3" } },
    "pro3-3": { "*": { notImplemented: "pro3Sequence" } },
}

