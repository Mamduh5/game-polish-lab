import Phaser from "phaser";

import { coinsPerSecond } from "../economy/currency";
import { EconomyHud } from "../ui/EconomyHud";
import { UpgradePanel } from "../ui/UpgradePanel";

export class IdleScene extends Phaser.Scene {
  create(): void {
    new EconomyHud(this, coinsPerSecond);
    new UpgradePanel(this);
  }
}
