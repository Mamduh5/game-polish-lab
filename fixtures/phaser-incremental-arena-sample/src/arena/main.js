(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 480,
    height: 270,
    parent: "arenaMount",
    pixelArt: true,
    roundPixels: true,
    scene: [ARENA.ArenaScene]
  });
})();
