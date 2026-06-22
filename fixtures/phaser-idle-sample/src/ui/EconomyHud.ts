import Phaser from "phaser";

import { rewardFeel } from "../config/rewardFeel";

export class EconomyHud {
  constructor(scene: Phaser.Scene, rate: number) {
    scene.add.text(16, 16, `Coins/sec: ${rate}`, { color: rewardFeel.positiveColor });
  }
}
