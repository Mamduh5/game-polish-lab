(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ArenaHud = {
    mount(stats) {
      document.getElementById("arenaEnergy").textContent = `Energy: ${stats.energy}`;
      document.getElementById("arenaWave").textContent = `Wave: ${ARENA.BALANCE_CONFIG.wave}`;
      document.getElementById("arenaDefeated").textContent = `Defeated: ${stats.totalDefeated}`;
      document.getElementById("arenaCombo").textContent = `Combo: ${stats.combo}`;
    }
  };
})();
