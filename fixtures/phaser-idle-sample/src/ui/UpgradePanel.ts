import Phaser from "phaser";

import { uiTheme } from "../config/uiTheme";

export class UpgradePanel {
  constructor(scene: Phaser.Scene) {
    scene.add.text(20, 96, "Generator Upgrade", { color: uiTheme.primaryText });
    scene.add.text(20, 120, "Cost: 50 coins", { color: uiTheme.mutedText });
  }
}
