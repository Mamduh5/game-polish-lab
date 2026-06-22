import Phaser from "phaser";

export class PlayerController {
  constructor(private readonly scene: Phaser.Scene) {}

  attackPressed(): boolean {
    return Boolean(this.scene.input.keyboard?.checkDown(this.scene.input.keyboard.addKey("SPACE"), 250));
  }
}
