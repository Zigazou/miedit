"use strict"

class MiEditManage {
    constructor(container) {
        this.container = container
        this.mistorage = new MiStorage("page")

        const inside = $('<table class="table"></table>')
        inside.append($("<tr><th>Thumbnail</th><th>Page</th><th>Actions</th></tr>"))
        this.mistorage.keys().forEach(key => {
            const page = this.mistorage.load(key)
            const img = page !== null && page.thumbnail ? page.thumbnail : ""
            inside.append($(this.page_list_item(key, img, key)))
        })

        this.container.append(inside)
    }

    page_list_item(page_title, thumbnail, key) {
        return `
          <tr class="page-list-item">
            <td><img src="${thumbnail}" width="160" height="125"/></td>
            <td>${page_title}</td>
            <td>
              <a href="miedit-page.html?page=${key}" class="btn btn-primary">
                edit
              </a>
              <a href="miedit-delete.html?page=${key}" class="btn btn-danger">
                delete
              </a>
              <a href="miedit-duplicate.html?page=${key}" class="btn btn-primary">
                duplicate
              </a>
            </td>
          </tr>`
    }
}

mieditmanage = new MiEditManage($('#miedit'))

