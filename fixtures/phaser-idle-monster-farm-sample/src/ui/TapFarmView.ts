import type Phaser from "phaser";
import { getTapFarmRewardAmount, type TapFarmState } from "../state/tapFarmState";

export class TapFarmView {
  constructor(scene: Phaser.Scene, state: TapFarmState, onTapFarmClick: (amount: number) => void) {
    const panel = scene.add.rectangle(120, 120, 180, 72, 0x224466);
    const energyFill = scene.add.rectangle(70, 150, state.energy, 8, 0x66ffcc);
    scene.add.text(52, 98, "Tap Farm");
    panel.setInteractive().on("pointerdown", () => onTapFarmClick(getTapFarmRewardAmount(state)));
    energyFill.setAlpha(0.8);
  }
}
