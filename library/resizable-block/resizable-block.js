/**
 * @file resizable-block.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 */

/**
 * A end user resizable block. Works only for blocks stacked vertically.
 */
class ResizableBlock {
    /**
     * Create a ResizableBlock.
     * @param {HTMLElement} container The container element.
     */
    constructor(container) {
        /**
         * The HTMLElement containing all the elements of the resizable block.
         * @member {HTMLElement}
         * @private
         */
        this.root = container

        /**
         * The blocks within the container.
         *
         * @member {HTMLElement[]}
         * @private
         */
        this.blocks = Array.from(this.root.querySelectorAll(":scope>*"))

        /**
         * Default sizes.
         *
         * @member {number[]}
         * @private
         */
        this.sizes = []
        this.calculateDefaultSizes()

        this.initTags()
    }

    /**
     * Calculate default sizes.
     *
     * @private
     */
    calculateDefaultSizes() {
        const userSizes = this.root.getAttribute("data-sizes")

        this.sizes = Array(this.blocks.length).fill(1 / this.blocks.length)

        if(userSizes !== "") {
            this.sizes = Array(this.blocks.length)
            userSizes.split(",").forEach(
                (value, index) => this.sizes[index] = Number(value)
            )
        }
    }

    /**
     * Initializes attributes and classes of the accordion elements.
     *
     * @private
     */
    initTags() {
        // Creates the rulers.
        this.blocks.forEach((block, index) => {
            block.classList.add("x-resizable-block")

            if(block.nextElementSibling) this.createRuler(block, index)
        })

        // Set sizes of blocks with rulers excluded.
        const availableHeight = this.getAvailableHeight()
        this.blocks.forEach((block, index) => {
            block.style.height = this.sizes[index] * availableHeight + "%"
        })
    }

    /**
     * Calculates the rulers height.
     *
     * @returns {number}
     * @private
     */
    getRulersHeight() {
        let rulersHeight = 0
        this.root.querySelectorAll("x-resizable-ruler").forEach(
            ruler => rulersHeight += ruler.offsetHeight
        )

        return rulersHeight
    }

    /**
     * Calculates the available height for each blocks excluding the rulers.
     *
     * @returns {number}
     * @private
     */
    getAvailableHeight() {
        return 100 - 100 * this.getRulersHeight() / this.root.clientHeight
    }

    /**
     * Element before which a ruler will be inserted.
     *
     * @param {HTMLElement} block Block before which the ruler will be inserted.
     * @private
     */
    createRuler(block, index) {
        const ruler = document.createElement("x-resizable-ruler")
        let startY

        block.parentNode.insertBefore(ruler, block.nextElementSibling)

        ruler.addEventListener("mousedown", event => {
            ruler.setAttribute("data-resizing", true)
            startY = event.clientY
        })

        this.root.addEventListener("mousemove", event => {
            // This ruler is not resizing, ignore the mouse move.
            if(ruler.getAttribute("data-resizing") !== "true") return

            const next = block.nextElementSibling.nextElementSibling
            const difference = event.clientY - startY

            // Stop resizing if one of the block being resized reaches 0 pixel.
            if(block.offsetHeight + difference <= 0 ||
                next.offsetHeight - difference <= 0) {
                ruler.setAttribute("data-resizing", false)
            }

            const availableHeight = this.getAvailableHeight()
            const rulersHeight = this.getRulersHeight()

            // Updates the relative sizes
            this.sizes[index] += difference
                               / (this.root.clientHeight - rulersHeight)
            this.sizes[index + 1] -= difference
                                   / (this.root.clientHeight - rulersHeight)

            // Apply new sizes to the 2 consecutive blocks.
            block.style.height = availableHeight * this.sizes[index] + "%"
            next.style.height = availableHeight * this.sizes[index + 1] + "%"

            startY = event.clientY
        })

        this.root.addEventListener("mouseup", () => {
            ruler.setAttribute("data-resizing", false)
        })
    }
}

/**
 * Initializes every resizable block in the current document.
 *
 * @return {ResizableBlock[]} An array of ResizableBlock.
 */
ResizableBlock.init = function() {
    const containers = Array.from(document.querySelectorAll("x-resizable"))

    return containers.map(container => new ResizableBlock(container))
}
