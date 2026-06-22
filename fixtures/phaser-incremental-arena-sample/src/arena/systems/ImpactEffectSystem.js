(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ImpactEffects = {
    showCursorFlash(scene, x, y) {
      scene.add.circle(x, y, 14, 0xffffff, 0.45).setDepth(10);
    },

    showImpact(scene, x, y, data) {
      scene.add.text(x, y - 18, `-${data.clickDamage}`, { color: "#fff" }).setDepth(11);
      scene.add.circle(x, y, 18 * data.hitImpactScale, 0xfff066, 0.35).setDepth(9);
      this.showComboPopup(scene, x, y);
    },

    showMiss(scene, x, y, missImpactScale) {
      scene.add.circle(x, y, 16 * missImpactScale, 0x8899aa, 0.35).setDepth(9);
    },

    showComboPopup(scene, x, y) {
      scene.add.text(x + 16, y - 30, "COMBO", { color: "#ffe066" }).setDepth(12);
    }
  };
})();
