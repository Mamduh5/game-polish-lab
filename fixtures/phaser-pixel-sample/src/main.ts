import Phaser from "phaser";

import { hitSparkConfig } from "./config/vfxConfig";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 180,
  parent: "game",
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false
  },
  scene: []
};

console.log(hitSparkConfig.durationMs);

new Phaser.Game(config);
