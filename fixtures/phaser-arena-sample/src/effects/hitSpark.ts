import Phaser from "phaser";

import { vfxConfig } from "../config/vfxConfig";

export function spawnHitSpark(scene: Phaser.Scene, x: number, y: number): void {
  console.log("hit spark", scene.scene.key, x, y, vfxConfig.hitSparkMs);
}
