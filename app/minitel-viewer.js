(function() {
    "use strict"
    const canvas = document.getElementById("minitel-screen")
    const screen = new MinitelScreen(canvas)
    const stream = queryParameters("stream")

    function findBestScaling() {
        if(window.innerWidth/window.innerHeight > canvas.width/canvas.height) {
            canvas.classList.add("scale-height")
        } else {
            canvas.classList.remove("scale-height")
        }
    }

    findBestScaling()
    window.addEventListener("resize", findBestScaling, false)

    const vdt = []
    for(let i = 0; i < stream.length; i++) vdt.push(stream.charCodeAt(i))

    screen.send(vdt)
}) ()
