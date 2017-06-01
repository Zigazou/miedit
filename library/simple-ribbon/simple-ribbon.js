"use strict"
class SimpleRibbon {
    constructor(ribbon) {
        this.selectedTabIndex = -1
        this.tabNames = []
        this.ribbon = ribbon

        this.ribbon.find(".rbn-window-title")
                   .after('<div id="rbn-tab-header-strip"></div>')

        this.header = this.ribbon.find("#rbn-tab-header-strip")

        const self = this
        this.ribbon.find(".rbn-tab").each(function(index) {
            self.initTab(index, this)
        })

        this.ribbon.find(".rbn-btn").each(function(index) {
           self.initButton(index, this)
        })

        this.ribbon.find(".rbn-section").each(function(index) {
           self.initSection(index, this)
        })

        this.ribbon.find("div").attr("unselectable", "on")
        this.ribbon.find("span").attr("unselectable", "on")
        this.ribbon.attr("unselectable", 'on')

        this.switchToTabByIndex(this.selectedTabIndex)
    }

    goToBackstage() {
        this.ribbon.addClass('backstage')
    }

    returnFromBackstage() {
        this.ribbon.removeClass('backstage')
    }

    initSection(index, obj) {
        $(obj).after('<div class="rbn-section-sep"></div>')
    }

    initTab(index, obj) {
        const el = $(obj)
        let id = el.attr('id')
        if (id === undefined || id === null) {
            el.attr("id", "tab-" + index)
            id = "tab-" + index
        }
        this.tabNames[index] = id

        const title = el.find(".rbn-title")
        const isBackstage = el.hasClass("file")
        this.header.append(
            '<div id="rbn-tab-header-'
            + index
            + '" class="rbn-tab-header"></div>'
        )

        const thisTabHeader = this.header.find("#rbn-tab-header-" + index)
        thisTabHeader.append(title)
        if (isBackstage) {
            thisTabHeader.addClass("file")

            thisTabHeader.click(() => {
                this.switchToTabByIndex(index)
                this.goToBackstage()
            })
        } else {
            if (this.selectedTabIndex === -1) {
                this.selectedTabIndex = index
                thisTabHeader.addClass("sel")
            }

            thisTabHeader.click(() => {
                this.returnFromBackstage()
                this.switchToTabByIndex(index)
            })
        }

        el.hide()
    }

    initButton(index, obj) {
        const el = $(obj)
        const title = el.find(".btn-title").detach()
        el.append(title)

        if (el.find(".rbn-hot").length === 0) {
            el.find(".rbn-normal").addClass("rbn-hot")
        }
    }

    switchToTabByIndex(index) {
        const headerStrip = this.ribbon.find("#rbn-tab-header-strip")
        headerStrip.find(".rbn-tab-header").removeClass("sel")
        headerStrip.find("#rbn-tab-header-" + index).addClass("sel")

        this.ribbon.find(".rbn-tab").hide()
        this.ribbon.find("#" + this.tabNames[index]).show()
    }
}

(function($) {
    $.fn.simpleRibbon = function() {
        $.fn.simpleRibbon = new SimpleRibbon($(this))
    }
})( jQuery )
