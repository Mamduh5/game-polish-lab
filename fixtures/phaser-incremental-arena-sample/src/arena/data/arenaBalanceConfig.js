(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.BALANCE_CONFIG = {
    wave: 1,
    energyPerHit: 1,
    helperClick: {
      intervalMs: 1200
    },
    feedback: {
      hitImpactScale: 1.05,
      missImpactScale: 0.7,
      hitTextMs: 420
    },
    arenaUpgradeList: ["helperCursor", "clickDamage", "clickRadius"],
    persistentProgress: true
  };
})();
