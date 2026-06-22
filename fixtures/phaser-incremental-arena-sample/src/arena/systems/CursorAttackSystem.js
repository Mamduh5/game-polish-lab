(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.CursorAttack = {
    attack(scene, x, y, stats) {
      const hit = Math.random() > 0.25;
      if (hit) {
        stats.combo += 1;
        stats.energy += ARENA.BALANCE_CONFIG.energyPerHit;
        stats.totalDefeated += stats.combo % 5 === 0 ? 1 : 0;
        ARENA.ImpactEffects.showImpact(scene, x, y, {
          clickDamage: stats.clickDamage,
          clickRadius: stats.clickRadius,
          hitImpactScale: ARENA.BALANCE_CONFIG.feedback.hitImpactScale,
          helperClick: false
        });
        ARENA.ImpactEffects.showCursorFlash(scene, x, y);
      } else {
        ARENA.ImpactEffects.showMiss(scene, x, y, ARENA.BALANCE_CONFIG.feedback.missImpactScale);
      }
    }
  };
})();
