"use strict"
/**
 * @file minitel
 * @author Frédéric BISSON <zigazou@free.fr>
 * @version 1.0
 *
 * Create and run a Minitel emulation with its keyboard.
 */

importHTML.install()
          .then(() => Minitel.startEmulators())
          .catch(reason => console.log(reason))
