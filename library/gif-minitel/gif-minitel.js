/**
 * @file gifminitel.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * @description GifMinitel is a Gif89a Encoder for Minitel images.
 */

/**
 * A GifString is a string of numbers. It is used as a way of generating keys
 * for the LZW dictionary.
 */
class GifString {
    /**
     * Constructor.
     *
     * @param {number} item An item to initialize the GifString with.
     */
    constructor(item) {
        /**
         * The current hash of the GifString.
         *
         * @member {string}
         * @readonly
         */
        this.hash = ""

        /**
         * Current length of the GifString.
         *
         * @member {number}
         * @readonly
         */
        this.length = 0

        /**
         * Keep track of the first item.
         *
         * @member {number}
         * @readonly
         */
        this.first = item

        this.push(item)
    }

    /**
     * Create the hash the GifString would have if the item were pushed.
     *
     * @param {number} item Element to concatenate.
     * @returns {string}
     */
    hashplus(item) {
        return this.hash + String.fromCharCode(item)
    }

    /**
     * Add an element to the current GifString.
     *
     * @param {number} item An item to add.
     */
    push(item) {
        this.hash += String.fromCharCode(item)
        this.length++
    }
}

/**
 * A Gif bits is a string of words of varying size which can then be packed in a
 * series of bytes.
 */
class GifBits {
    /**
     * Initializes a GifBits.
     *
     * @param {number} wordSize Size of a word in bits.
     */
    constructor(wordSize) {
        /**
         * Word size.
         *
         * @member {number}
         */
        this.wordSize = wordSize

        /**
         * Bit string being constructed. The bits are stored as string of "0"
         * and "1" characters.
         *
         * @member {string}
         * @private
         */
        this.bitString = ""
    }

    /**
     * Add a word to the bits. Bits are stored reversed order.
     *
     * @param {number} value Word to add
     */
    push(value) {
        this.bitString = Number(value).toString(2).padStart(this.wordSize, "0")
                       + this.bitString
    }

    /**
     * Packs all words into bytes.
     *
     * @returns {Uint8Array}
     */
    bytes() {
        // Calculate pad bits
        const orphanBits = this.bitString.length % GifBits.BYTESIZE
        if(orphanBits !== 0) {
            this.bitString = this.bitString.padStart(
                this.bitString.length + GifBits.BYTESIZE - orphanBits, "0"
            )
        }

        const bytes = new Uint8Array(this.bitString.length / 8)

        let destination = 0
        for(let offset = this.bitString.length - GifBits.BYTESIZE;
            offset >= 0;
            offset -= GifBits.BYTESIZE
        ) {
            bytes[destination] = parseInt(
                this.bitString.substr(offset, GifBits.BYTESIZE), 2
            )
            destination++
        }

        return bytes
    }
}

/**
 * Size of a byte in bits.
 *
 * @member {number}
 * @readonly
 */
GifBits.BYTESIZE = 8

/**
 * Implementation of the LZW encoder algorithm à la GIF.
 */
class GifCompress {
    /**
     * Constructor.
     */
    constructor() {
        /**
         * The last code being created in the dictionary. It starts at 18
         * because code 16 and 17 are reserved.
         *
         * @member {number}
         * @private
         */
        this.nextCode = GifCompress.FIRSTFREECODE

        /**
         * The dictionary of our LZW encoder.
         *
         * @member {Map}
         * @private
         */
        this.dictionary = new Map()

        /**
         * The current phrase being read.
         *
         * @member {GifString}
         * @private
         */
        this.phrase = undefined

        /**
         * The output starts with words of 5 bits length since the color palette
         * will always have 16 colors max.
         *
         * @member {GifBits}
         * @private
         */
        this.output = new GifBits(GifCompress.MINCODESIZE)
        this.output.push(GifCompress.CLEARCODE)

        /**
         * Maximum code value for the current code size.
         *
         * @member {number}
         * @private
         */
        this.maxcodevalue = 1 << GifCompress.MINCODESIZE
    }

    /**
     * Restart the encoding automaton from start. It is generally used when the
     * code size will exceed the 12 bits limit.
     */
    restart() {
        if(this.output.wordSize > GifCompress.MAXCODESIZE) {
            this.output.wordSize = GifCompress.MAXCODESIZE
            this.maxcodevalue = 1 << GifCompress.MINCODESIZE
        }

        this.output.push(GifCompress.CLEARCODE)
        this.nextCode = GifCompress.FIRSTFREECODE
        this.dictionary = new Map()
        this.phrase = undefined
        this.output.wordSize = GifCompress.MINCODESIZE
        this.maxcodevalue = 1 << GifCompress.MINCODESIZE
    }

    /**
     * Push computes a pixels from the stream. It implements an iteration from
     * the LZW compression algorithm.
     *
     * @param {number} colorIndex The color index.
     */
    push(colorIndex) {
        // Initial state.
        if(this.phrase === undefined) {
            this.phrase = new GifString(colorIndex)
            return
        }

        // The next phrase is the current phrase plus the character being read.
        const nextPhrase = this.phrase.hashplus(colorIndex)

        if(this.dictionary.has(nextPhrase)) {
            // If the next phrase is known, it becomes the current phrase.
            this.phrase.push(colorIndex)
            return
        }

        // Output the current phrase.
        this.outPhrase()

        if(this.nextCode >= GifCompress.MAXCODEVALUE) {
            // Gif only supports 12 bits max, the limit has been reached, the
            // encoder needs to restart.
            this.restart()
        } else {
            // One more phrase in the dictionary.
            this.dictionary.set(nextPhrase, this.nextCode)
            this.nextCode++
        }

        // The new phrase contains only the character being read.
        this.phrase = new GifString(colorIndex)
    }

    /**
     * Place codes in the output stream.
     *
     * @private
     */
    outPhrase() {
        if(this.phrase.length === 1) {
            // A raw value is its own index.
            this.output.push(this.phrase.first)
        } else {
            // Find the index of the phrase in the dictionary.
            this.output.push(this.dictionary.get(this.phrase.hash))
        }

        if(this.nextCode >= this.maxcodevalue) {
            // We are getting short of bits to store the codes.
            this.output.wordSize++
            this.maxcodevalue += this.maxcodevalue
        }
    }

    /**
     * Returns the LZW encoded stream.
     *
     * @returns {Uint8Array}
     */
    encode() {
        // Flush the last phrase in the output stream.
        this.outPhrase()

        // Add the end of information code at the end of the output stream.
        this.output.push(GifCompress.ENDOFINFORMATION)

        // Packs the bits string in bytes.
        return this.output.bytes()
    }
}

/**
 * GIF uses a variable length code. For this specialized encoder, it starts at
 * 5 bits for a palette of 16 colors (8 Minitel colors + 1 transparency color).
 *
 * @member {number}
 * @readonly
 */
GifCompress.MINCODESIZE = 5

/**
 * The variable length code in GIF has a limit of 12 bits.
 *
 * @member {number}
 * @readonly
 */
GifCompress.MAXCODESIZE = 12

/**
 * GIF uses a modified version of the LZW algorithm in which two codes are
 * reserved: the clear code and the end of information code. Clear code is the
 * first number after the last palette index.
 *
 * @member {number}
 * @readonly
 */
GifCompress.CLEARCODE = 1 << GifCompress.MINCODESIZE - 1

/**
 * The end of information code is juste one number after the clear code.
 *
 * @member {number}
 * @readonly
 */
GifCompress.ENDOFINFORMATION = 1 + GifCompress.CLEARCODE

/**
 * The first free code the LZW encoder will use starts two after the clear code.
 *
 * @member {number}
 * @readonly
 */
GifCompress.FIRSTFREECODE = 2 + GifCompress.CLEARCODE

/**
 * The maximum code value is the maximum value a 12 bits value can hold.
 *
 * @member {number}
 * @readonly
 */
GifCompress.MAXCODEVALUE = (1 << GifCompress.MAXCODESIZE) - 1

/**
 * GifMinitel is a Gif89a Encoder for Minitel images.
 */
class GifMinitel {
    /**
     * @param {int?} width Width in pixels of the resulting image, 320 by
     *                     default.
     * @param {int?} height Height in pixels of the resulting image, 250 by
     *                      default.
     * @param {int?} delay Delay in milliseconds used between images, 40 ms by
     *                     default (25 Hz).
     * @param {boolean?} monochrome true for monochrome colors, false or
     *                              undefined for actual colors.
     */
    constructor(width, height, delay, monochrome) {
        /**
         * Width in pixels of the resulting image.
         * @member {int}
         * @private
         */
        this.width = width || GifMinitel.WIDTH

        /**
         * Height in pixels of the resulting image.
         * @member {int}
         * @private
         */
        this.height = height || GifMinitel.HEIGHT

        /**
         * Default delay in milliseconds between each image.
         * @member {int}
         * @private
         */
        this.delay = delay || GifMinitel.DELAY

        /**
         * Default delay in milliseconds between each image.
         *
         * @member {int}
         * @private
         */
        this.monochrome = monochrome || GifMinitel.MONOCHROME

        /**
         * List of all the encoded streams. This list grows after each added
         * image.
         *
         * @member {Uint8Array[]}
         * @private
         */
        this.images = []

        /**
         * Copy of the previous encoded frame. It is used to create a delta
         * image which will require much less memory to be encoded in Gif.
         *
         * @member {}
         * @private
         */
        this.previous = undefined
    }

    /**
     * Add an image to the animation.
     *
     * @param {ImageData} image Image to add.
     * @param {number?} delay Delay in milliseconds.
     */
    add(rgbaImage, delay) {
        const current = GifMinitel.rgba2indexed(rgbaImage.data)
        let indexedImage = current

        let boundaries = {
            left: 0,
            top: 0,
            width: rgbaImage.width,
            height: rgbaImage.height
        }

        if(this.previous !== undefined) {
            const difference = GifMinitel.imageDifference(
                this.previous, current
            )

            indexedImage = difference.image
            boundaries = difference.boundaries
        }

        this.images.push(
            GifMinitel.graphicControlExtension(delay || this.delay),
            GifMinitel.imageDescriptor(
                boundaries.left,
                boundaries.top,
                boundaries.width,
                boundaries.height
            ),
            GifMinitel.imageData(indexedImage)
        )

        this.previous = current
    }

    /**
     * Generates a GIF file from all images that have been added to the
     * animation.
     *
     * @returns {Uint8Array}
     */
    save() {
        return GifMinitel.concatArray([
            GifMinitel.header,
            GifMinitel.logicalScreenDescriptor(this.width, this.height),
            GifMinitel.globalColorTable(this.monochrome),
            GifMinitel.netscapeLoopingApplicationExtension,
            GifMinitel.concatArray(this.images),
            GifMinitel.trailer
        ])
    }
}

/**
 * The GIF file format splits all data into chunks whose length might not exceed
 * 255 bytes.
 *
 * @member {number}
 * @readonly
 */
GifMinitel.BLOCKSIZE = 255

/**
 * Index of the transparent color, it is specific to the GIF encoder.
 *
 * @member {number}
 * @readonly
 */
GifMinitel.TRANSPARENT = 0x0F

/**
 * Default delay in milliseconds between two frames.
 *
 * @member {number}
 * @readonly
 */
GifMinitel.DELAY = 40

/**
 * Default width in pixels (Minitel screen width).
 *
 * @member {number}
 * @readonly
 */
GifMinitel.WIDTH = 320

/**
 * Default height in pixels (Minitel screen height).
 *
 * @member {number}
 * @readonly
 */
GifMinitel.HEIGHT = 250

/**
 * Default color mode.
 *
 * @member {boolean}
 * @readonly
 */
GifMinitel.MONOCHROME = false

/**
 * Concatenate multiple Uint8Array.
 *
 * @param {Uint8Array[]} arrays Arrays to concatenate.
 * @returns {Uint8Array}
 */
GifMinitel.concatArray = function(arrays) {
    // Calculates total length.
    let totalLength = 0
    for(let array of arrays) {
        totalLength += array.length
    }

    const result = new Uint8Array(totalLength)
    let offset = 0

    for(let arr of arrays) {
        result.set(arr, offset)
        offset += arr.length
    }

    return result
}

/**
 * Put an array into blocks. Gif data must be contained into blocks preceded by
 * their size. The size of a block is 255 bytes at most.
 *
 * @param {Uint8Array} array Arrays to slice into blocks.
 * @returns {Uint8Array}
 */
GifMinitel.arrayBlock = function(array) {
    // GIF supports blocks up to 254 bytes.
    const nbBlock = Math.ceil(array.length / GifMinitel.BLOCKSIZE)
    const arrayBlock = new Uint8Array(array.length + nbBlock)

    let src = 0
    let dst = 0
    let size = 0
    while(src < array.length) {
        // How many bytes in this block?
        size = Math.min(GifMinitel.BLOCKSIZE, array.length - src)

        // Insert the length of the block.
        arrayBlock.set(new Uint8Array([size]), dst)

        // Copy the block from the source array.
        arrayBlock.set(array.slice(src, src + size), dst + 1)

        // Next block.
        src += GifMinitel.BLOCKSIZE
        dst += GifMinitel.BLOCKSIZE + 1
    }

    return arrayBlock
}

/**
 * GIF89a header.
 *
 * @member {Uint8Array}
 */
GifMinitel.header = new Uint8Array([
    0x47, 0x49, 0x46, // "GIF"
    0x38, 0x39, 0x61  // "89a"
])

/**
 * Generate a logical screen descriptor.
 *
 * @param {number} width Width in pixels.
 * @param {number} height Height in pixels.
 * @returns {Uint8Array}
 */
GifMinitel.logicalScreenDescriptor = function(width, height) {
    return new Uint8Array([
        width & 0x00FF, width >> 8, // Width (16 bits)
        height & 0x00FF, height >> 8, // Height (16 bits)
        0b10000011, // global color table, 1 bit color resolution, no sort
                    // 16 entries in the global color table
        0x08, // Background color index
        0x00 // No pixel aspect ratio information
    ])
}

/**
 * A global color table designed specifically for Minitel images.
 *
 * @member {Uint8Array}
 */
GifMinitel.globalColorTable = function(monochrome) {
    if(monochrome) {
        return new Uint8Array([
            0x00, 0x00, 0x00, // Black
            0x00, 0x00, 0xFF, // Blue
            0x00, 0xFF, 0x00, // Green
            0x00, 0xFF, 0xFF, // Cyan
            0xFF, 0x00, 0x00, // Red
            0xFF, 0x00, 0xFF, // Magenta
            0xFF, 0xFF, 0x00, // Yellow
            0xFF, 0xFF, 0xFF, // White
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB  // Transparent color
        ])
    } else {
        return new Uint8Array([
            0x00, 0x00, 0x00, // Black
            0x00, 0x00, 0xFF, // Blue
            0x00, 0xFF, 0x00, // Green
            0x00, 0xFF, 0xFF, // Cyan
            0xFF, 0x00, 0x00, // Red
            0xFF, 0x00, 0xFF, // Magenta
            0xFF, 0xFF, 0x00, // Yellow
            0xFF, 0xFF, 0xFF, // White
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB,
            0xFB, 0xFB, 0xFB  // Transparent color
        ])
    }
}

/**
 * Generate a graphic control extension block.
 *
 * @param {number} delay Delay between images in millisecondes.
 * @returns {Uint8Array}
 */
GifMinitel.graphicControlExtension = function(delay) {
    delay = Math.floor(delay / 10)

    return new Uint8Array([
        0x21, // Extension introducer
        0xF9, // Graphic Control Extension
        0x04, // Block size
        0b00000001, // Do not dispose, user input not expected, transparent
                    // index given.
        delay & 0x00FF, delay >> 8, // Delay time in 1/100th seconds
        GifMinitel.TRANSPARENT, // Transparent color index
        0x00 // Block terminator
    ])
}

/**
 * Generate an image description block.
 *
 * @param {number} left Left image position in pixels.
 * @param {number} top Top image position in pixels.
 * @param {number} width Width in pixels.
 * @param {number} height Height in pixels.
 * @returns {Uint8Array}
 */
GifMinitel.imageDescriptor = function(left, top, width, height) {
    return new Uint8Array([
        0x2C, // Image separator
        left & 0x00FF, left >> 8, // Image left position (16 bits)
        top & 0x00FF, top >> 8, // Image top position (16 bits)
        width & 0x00FF, width >> 8, // Width (16 bits)
        height & 0x00FF, height >> 8, // Height (16 bits)
        0b00000000 // No local color table, not interlaced, not sorted
    ])
}

/**
 * Generate an image data block.
 *
 * @param {number[][]} image Image from which to extract data.
 * @returns {Uint8Array}
 */
GifMinitel.imageData = function(image) {
    const gifc = new GifCompress()

    image.forEach(color => gifc.push(color))

    return GifMinitel.concatArray([
        new Uint8Array([GifCompress.MINCODESIZE - 1]),
        GifMinitel.arrayBlock(gifc.encode()),
        new Uint8Array([0x00])
    ])
}

/**
 * A trailer block.
 *
 * @member {Uint8Array}
 */
GifMinitel.trailer = new Uint8Array([0x3B]) // Trailer

/**
 * Netscape Extension (for infinite loop).
 *
 * @member {Uint8Array}
 */
GifMinitel.netscapeLoopingApplicationExtension = new Uint8Array([
    0x21, // Extension introducer
    0xFF, // Application label
    0x0B, // Block size
    0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, // "NETSCAPE"
    0x32, 0x2E, 0x30, // "2.0" Application extension label
    0x03, // Sub-block data size
    0x01, // Sub-block ID
    0x00, 0x00, // Loop count (0=infinite loop)
    0x00 // Block terminator
])

/**
 * Converts an RGBA image of a Minitel screen to an indexed image.
 *
 * @param {Uint8Array} rgbas raw bytes of the RGBA image [R, G, B, A, R, G…]
 * @returns {Uint8Array}
 */
GifMinitel.rgba2indexed = function(rgbas) {
    // The indexed version uses 1 byte instead of 4 to store color.
    const indexeds = new Uint8Array(rgbas.length / 4)

    let dst = 0
    for(let src = 0; src < rgbas.length; src += 4) {
        if(rgbas[src + 3] === 0) {
            indexeds[dst] = GifMinitel.TRANSPARENT
        } else {
            // The palette is organized in such a way that the index can be
            // determined by computation.
            indexeds[dst] = rgbas[src] & 4
                          | rgbas[src + 1] & 2
                          | rgbas[src + 2] & 1
        }

        dst++
    }

    return indexeds
}

/**
 * Find the left column where two images first differ.
 *
 * @param {Uint8Array} previous The previous image.
 * @param {Uint8Array} current The current image.
 * @returns {number}
 */
GifMinitel.leftBoundary = function(previous, current) {
    let offset
    for(let x = 0; x < GifMinitel.WIDTH; x++) {
        offset = x
        for(let y = 0; y < GifMinitel.HEIGHT; y++) {
            if(previous[offset] !== current[offset]) return x
            offset += GifMinitel.WIDTH
        }
    }

    return GifMinitel.WIDTH - 1
}

/**
 * Find the right column where two images last differ.
 *
 * @param {Uint8Array} previous The previous image.
 * @param {Uint8Array} current The current image.
 * @returns {number}
 */
GifMinitel.rightBoundary = function(previous, current) {
    let offset
    for(let x = GifMinitel.WIDTH - 1; x >= 0; x--) {
        offset = x
        for(let y = 0; y < GifMinitel.HEIGHT; y++) {
            if(previous[offset] !== current[offset]) return x
            offset += GifMinitel.WIDTH
        }
    }

    return 0
}

/**
 * Find the top row where two images first differ.
 *
 * @param {Uint8Array} previous The previous image.
 * @param {Uint8Array} current The current image.
 * @returns {number}
 */
GifMinitel.topBoundary = function(previous, current) {
    let offset = 0
    for(let y = 0; y < GifMinitel.HEIGHT; y++) {
        for(let x = 0; x < GifMinitel.WIDTH; x++) {
            if(previous[offset] !== current[offset]) return y
            offset++
        }
    }

    return GifMinitel.HEIGHT - 1
}

/**
 * Find the bottom row where two images last differ.
 *
 * @param {Uint8Array} previous The previous image.
 * @param {Uint8Array} current The current image.
 * @returns {number}
 */
GifMinitel.bottomBoundary = function(previous, current) {
    let offset = GifMinitel.WIDTH * GifMinitel.HEIGHT - 1
    for(let y = GifMinitel.HEIGHT - 1; y >= 0; y--) {
        for(let x = 0; x < GifMinitel.WIDTH; x++) {
            if(previous[offset] !== current[offset]) return y
            offset--
        }
    }

    return 0
}

/**
 * Crop a current image and make transparent pixels that do not change from the
 * previous image.
 *
 * @param {Uint8Array} previous The previous image.
 * @param {Uint8Array} current The current image.
 * @param {Object} boundaries The boundaries on which the current image should
 *                            be cropped.
 */
GifMinitel.cropAndDifference = function(previous, current, boundaries) {
    const difference = new Uint8Array(boundaries.width * boundaries.height)

    let destination = 0
    let source
    for(let y = boundaries.top; y <= boundaries.bottom; y++) {
        source = y * GifMinitel.WIDTH + boundaries.left
        for(let x = boundaries.left; x <= boundaries.right; x++) {
            if(current[source] !== previous[source]) {
                difference[destination] = current[source]
            } else {
                difference[destination] = GifMinitel.TRANSPARENT
            }
            source++
            destination++
        }
    }

    return difference
}

/**
 * Calculate the differences between 2 images.
 *
 * @param {Uint8Array} previous The previous image
 * @param {Uint8Array} current The current image
 * @returns {Uint8Array}
 */
GifMinitel.imageDifference = function(previous, current) {
    const boundaries = {
        left: GifMinitel.leftBoundary(previous, current),
        right: GifMinitel.rightBoundary(previous, current),
        top: GifMinitel.topBoundary(previous, current),
        bottom: GifMinitel.bottomBoundary(previous, current),
        width: undefined,
        height: undefined
    }

    // Calculate width and height of the zone
    boundaries.width = Math.max(1, boundaries.right - boundaries.left + 1)
    boundaries.height = Math.max(1, boundaries.bottom - boundaries.top + 1)

    // Compute the difference only in the zone
    return {
        boundaries: boundaries,
        image: GifMinitel.cropAndDifference(previous, current, boundaries)
    }
}
