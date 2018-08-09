"use strict"
/**
 * Return a specific parameter value from the current URL
 * @param {string} varName Name of the parameter from which value will be read
 * @return {?string} The value or undefined if not available
 */
function queryParameters(varName) {
    function decode(str) {
        return decodeURIComponent(str.replace('+', ' '))
    }

    const value = window.location.search.substring(1)
        .split("&")
        .filter(cpl => cpl.startsWith(varName + '='))
        .map(cpl => cpl.substr(varName.length + 1))

    return value.length === 1 ? decode(value[0]) : undefined
}
