"use strict"

class MiEditManage {
    constructor(container) {
        this.container = container
        this.mistorage = new MiStorage("page")

        this.refreshList()
    }

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

    onDelete(event, param) {
        if(!confirm("Are you sure you want to delete " + param)) {
            return
        }

        this.mistorage.delete(param)
        this.refreshList()
    }

    pageListItem(pageTitle, thumbnail, key) {
        return `
          <div class="page-list-item">
            <h2>${pageTitle}</h2>
            <div class="thumbnail">
              <img src="${thumbnail}" width="160" height="125"/>
            </div>
            <div class="actions">
              <a href="miedit-page.html?page=${key}">
                <img src="icon/manage-edit.svg" title="Edit ${key}" />
              </a>
              <button data-call="onDelete" data-param="${key}">
                <img src="icon/manage-delete.svg" title="Delete {$key}" />
              </button>
            </div>
          </div>`
    }
}

new MiEditManage($('#miedit'))

