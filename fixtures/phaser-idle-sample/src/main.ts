import Phaser from "phaser";

import { IdleScene } from "./scenes/IdleScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  parent: "game",
  pixelArt: true,
  roundPixels: true,
  scene: [IdleScene]
};

new Phaser.Game(config);
