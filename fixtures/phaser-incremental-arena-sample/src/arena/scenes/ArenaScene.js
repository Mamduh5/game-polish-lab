(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ArenaScene = class ArenaScene extends Phaser.Scene {
    constructor() {
      super("ArenaScene");
      this.stats = {
        clickDamage: 2,
        clickRadius: 34,
        combo: 0,
        energy: 0,
        totalDefeated: 0
      };
    }

    create() {
      ARENA.ArenaHud.mount(this.stats);
      ARENA.UpgradePanel.mount(document.getElementById("arenaUpgradeList"));
      this.input.on("pointerdown", this.handlePointerDown, this);
    }

    handlePointerDown(pointer) {
      const point = pointer.positionToCamera(this.cameras.main);
      ARENA.CursorAttack.attack(this, point.x, point.y, this.stats);
    }
  };
})();
