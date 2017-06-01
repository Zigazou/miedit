"use strict"

const canvas = document.getElementById("minitel-screen")
let ms = new MinitelScreen(canvas)
ms.directSend(vdtAtari)

