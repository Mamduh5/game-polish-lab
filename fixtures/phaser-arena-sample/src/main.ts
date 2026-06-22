import Phaser from "phaser";

import { ArenaScene } from "./scenes/ArenaScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 180,
  parent: "game",
  pixelArt: true,
  roundPixels: true,
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false
  },
  scene: [ArenaScene]
};

new Phaser.Game(config);
