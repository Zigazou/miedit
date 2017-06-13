"use strict"

function splitRows(str, width) {
    str = str.replace(/ +/g, " ")

    const rows = []
    for(let bit of str.split("\n")) {
        let row = ""
        for(let word of bit.split(" ")) {
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
