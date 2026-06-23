import Phaser from "phaser";
import { FarmScene } from "./scenes/FarmScene";

class BootScene extends Phaser.Scene {}
class PreloadScene extends Phaser.Scene {}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 540,
  height: 960,
  pixelArt: true,
  scene: [BootScene, PreloadScene, FarmScene]
});
