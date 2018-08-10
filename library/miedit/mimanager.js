"use strict"
/**
 * @file mimanager.js
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * Manager allows the user to manage pages stored in the local storage.
 */

/**
 * @namespace MiEdit
 */
var MiEdit = MiEdit || {}

/**
 * GUI for managing pages kept in the local storage.
 */
MiEdit.MiManager = class {
    /**
     * @param {jQuery} container
     */
    constructor(container) {
        /**
         * The jQuery object pointing to the DOM element containing our
         * widget.
         * @member {jQuery}
         * @private
         */
        this.container = container

        /**
         * The storage manager
         * @member {MiStorage}
         * @private
         */
        this.mistorage = new MiEdit.MiStorage("page")

        this.refreshList()
    }

    /**
     * Refresh the list of pages found in the local storage.
     */
    refreshList() {
        this.container.empty()

        const inside = $('<div class="page-list"></div>')
        this.mistorage.keys().forEach(key => {
            const page = this.mistorage.load(key)
            const img = page !== null && page.thumbnail
                      ? page.thumbnail
                      : "image/missing-thumbnail.svg"

            inside.append($(this.pageListItem(key, img, key)))
        })

        this.container.append(inside)
        this.container[0].autocallback(this)
    }

    /**
     * Delete handler asking user confirmation, deleting the page and refreshing
     * the list.
     * @private
     */
    onDelete(event, param) {
        if(window.confirm("Are you sure you want to delete " + param)) {
            this.mistorage.delete(param)
            this.refreshList()
        }
    }

    /**
     * Geneates the HTML structure for presenting one page and its managing
     * links.
     * @private
     */
    pageListItem(pageTitle, thumbnail, key) {
        return `
          <div class="page-list-item">
            <h2>${pageTitle}</h2>
            <div class="thumbnail">
              <img src="${thumbnail}" width="160" height="125"/>
            </div>
            <div class="actions">
              <a href="miedit-page.html?page=${key}">
                <img src="icon/miicons.svg#manage-edit" title="Edit ${key}" />
              </a>
              <button data-call="onDelete" data-param="${key}">
                <img src="icon/miicons.svg#manage-delete" title="Delete {$key}" />
              </button>
            </div>
          </div>`
    }
}

new MiEdit.MiManager($('#miedit'))
