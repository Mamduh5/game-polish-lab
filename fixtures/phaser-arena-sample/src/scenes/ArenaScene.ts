import Phaser from "phaser";

import { applyDamage } from "../combat/damage";
import { combatFeel } from "../config/combatFeel";
import { spawnHitSpark } from "../effects/hitSpark";
import { Enemy } from "../enemies/Enemy";
import { PlayerController } from "../player/PlayerController";

export class ArenaScene extends Phaser.Scene {
  private player?: PlayerController;
  private enemy?: Enemy;

  create(): void {
    this.player = new PlayerController(this);
    this.enemy = new Enemy(this, 160, 90);
  }

  update(): void {
    if (!this.player || !this.enemy) {
      return;
    }
    if (this.player.attackPressed()) {
      applyDamage(this.enemy, combatFeel.playerDamage);
      spawnHitSpark(this, this.enemy.x, this.enemy.y);
    }
  }
}
