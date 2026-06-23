(function () {
  "use strict";

  const phaserRoot = document.createElement("div");
  phaserRoot.id = "phaser-root";
  phaserRoot.style.position = "absolute";
  phaserRoot.style.left = "-9999px";
  phaserRoot.style.top = "-9999px";
  phaserRoot.style.width = "1px";
  phaserRoot.style.height = "1px";
  phaserRoot.style.opacity = "0";
  phaserRoot.style.pointerEvents = "none";
  document.body.appendChild(phaserRoot);

  new Phaser.Game({
    type: Phaser.AUTO,
    width: 1,
    height: 1,
    parent: "phaser-root",
    scene: {
      create() {
        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback() {
            document.body.dataset.timerRoute = "active";
          }
        });
      }
    }
  });
})();
