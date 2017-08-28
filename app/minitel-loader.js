"use strict"
window.addEventListener("load", function(event) {
    const canvas = document.getElementById("minitel-screen")
    const screen = new MinitelScreen(canvas, false)
    const urls = queryParameters("url").split(",")

    for (let u = 0; u < urls.length; u++) {
      console.log(urls[u])
      $.get(urls[u], function(data, status){
        var vdt = []
        for(let i = 0; i < data.length; i++)
            vdt.push(data.charCodeAt(i))

        screen.send(vdt)
      })
    };

    function findBestScaling() {
        if(window.innerWidth/window.innerHeight > canvas.width/canvas.height) {
            canvas.classList.add("scale-height")
        } else {
            canvas.classList.remove("scale-height")
        }
    }

    findBestScaling()
    window.addEventListener("resize", findBestScaling, false)

})
