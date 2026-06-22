(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.UpgradePanel = {
    mount(root) {
      root.innerHTML = "";
      const upgrade = document.createElement("button");
      upgrade.className = "arena-upgrade-card";
      upgrade.textContent = "Helper cursor - Cost 25 energy";
      root.appendChild(upgrade);
    }
  };
})();
