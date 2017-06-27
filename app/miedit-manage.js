"use strict"

class MiEditManage {
    constructor(container) {
        this.container = container
        this.mistorage = new MiStorage("page")

        const inside = $('<div class="page-list"></div>')
        this.mistorage.keys().forEach(key => {
            const page = this.mistorage.load(key)
            const img = page !== null && page.thumbnail
                      ? page.thumbnail
                      : "image/missing-thumbnail.svg"

            inside.append($(this.pageListItem(key, img, key)))
        })

        this.container.append(inside)
    }

    pageListItem(pageTitle, thumbnail, key) {
        return `
          <div class="page-list-item">
            <h2>${pageTitle}</h2>
            <div class="thumbnail">
              <img src="${thumbnail}" width="160" height="125"/>
            </div>
            <div class="actions">
              <a href="miedit-page.html?page=${key}">edit</a>
              -
              <a href="miedit-delete.html?page=${key}">delete</a>
            </div>
          </div>`
    }
}

new MiEditManage($('#miedit'))

