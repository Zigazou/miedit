"use strict"

function getParameter(varName) {
    function decode(str) { return decodeURIComponent(str.replace('+', ' ')) }

    const value = window.location.search.substring(1)
        .split("&")
        .filter(function(cpl) { return cpl.startsWith(varName + '=') })
        .map(function(cpl) { return cpl.substr(varName.length + 1) })

    return (value.length === 1 ? decode(value[0]) : undefined)
}
