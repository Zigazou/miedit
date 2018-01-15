"use strict"

/**
 * Take a string and slice it into strings of specified length. Multiple spaces
 * are merged into one space. This function keeps line returns. Line returns
 * must follow the Unix convention.
 *
 * @param {string} str The string to slice
 * @param {number} width The maximum length of a resulting string
 * @return {string[]}
 */
function splitRows(str, width) {
    // Merge spaces
    str = str.replace(/ +/g, " ")

    const rows = []
    // The string may contain many rows
    for(let bit of str.split("\n")) {
        let row = ""

        // The row may contain many words
        for(let word of bit.split(" ")) {
            // Verify the next word won't make the string exceed its max length
            if(row.length + 1 + word.length > width) {
                rows.push(row)
                row = ""
            } else if(row.length !== 0) {
                row = row + " "
            }
            row = row + word
        }
        rows.push(row)
    }

    return rows
}
