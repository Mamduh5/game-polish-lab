import Phaser from "phaser";

export class Enemy extends Phaser.GameObjects.Sprite {
  hp = 3;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemy");
    scene.add.existing(this);
  }
}
