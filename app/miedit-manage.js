"use strict"

class MiEditManage {
    constructor(container) {
        this.container = container
        this.mistorage = new MiStorage('page')

        const inside = $('<table class="table"></table>')
        inside.append($('<tr><th>Page</th><th>Actions</th></tr>'))
        const that = this
        this.mistorage.keys().forEach(function(key) {
            inside.append($(that.page_list_item(key, key)))
        })

        this.container.append(inside)
    }

    page_list_item(page_title, key) {
        return `
          <tr class="page-list-item">
            <td><span class="">${page_title}</span></td>
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

