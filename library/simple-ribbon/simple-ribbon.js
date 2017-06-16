"use strict"
/**
 * @file SimpleRibbon
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 * 
 * Simple Ribbon is a basic implementation of the Microsoft ribbon which does
 * not require any external library like jQuery.
 *
 * To create a simple ribbon:
 *
 *     const ribbon = new SimpleRibbon(document.getElementById(...))
 * 
 * This library waits for structures like the following pattern:
 *
 *       <!-- The element containing all the tags of our simple ribbon --> 
 *       <div class="simple-ribbon">
 *         <h2>Ribbon title</h2>
 *       
 *         <!-- Section -->
 *         <h3 class="file">Special tab</h3>
 *         <div>
 *           <div>
 *               <!-- The content of this block -->
 *           </div>
 *         </div>
 *       
 *         <!-- Section -->
 *         <h3 class="first">Block opened automatically</h3>
 *         <div>
 *           <!-- Sub section -->
 *           <div>
 *             <h4>Sub section title</h4>
 *             <button class="large">
 *               <img src="image.svg" /><br/>1st line<br/>2nd line
 *             </button>
 *           </div>
 *       
 *           <!-- Separator -->
 *           <hr/>
 *       
 *           <!-- Another sub section -->
 *           <div>
 *             <h4>Sub section title</h4>
 *             <button class="large">
 *               <img src="image.svg" /><br/>1st line<br/>2nd line
 *             </button>
 *           </div>
 *         </div>
 *       </div>
 */

/**
 * @class SimpleRibbon
 */
class SimpleRibbon {

    /**
     * @param {HTMLElement} ribbon The element containing all the tags of our
     *                             simple ribbon.
     */
    constructor(ribbon) {
        this.root = ribbon
        this.current = undefined

        // Hides every block
        const tabs = this.root.getElementsByTagName("h3")
        for(let i = 0; i < tabs.length; i++) {
            tabs[i].nextElementSibling.classList.add("hidden")
            tabs[i].addEventListener("click", (e) => { this.onClick(e) })
        }

        this.openTab(this.root.getElementsByClassName("first")[0])
    }

    /**
     * Open the block preceded by an h3 element, closing the previous selected
     * block.
     * @param {HTMLElement} element The h3 element preceding the block to open.
     */
    openTab(element) {
        if(element === null || element === undefined) return

        // Closes any previously opened tab
        if(this.current !== undefined) {
            this.current.nextElementSibling.classList.add("hidden")
            this.current.classList.remove("selected")
        }

        // Open the tab
        element.nextElementSibling.classList.remove("hidden")
        element.classList.add("selected")
        this.current = element
    }

    /**
     * @event event An event object
     */
    onClick(event) {
        this.openTab(event.target)
    }
}
