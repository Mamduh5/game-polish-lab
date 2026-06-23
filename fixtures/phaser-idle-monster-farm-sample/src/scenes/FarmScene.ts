import { MonsterRenderer } from "../rendering/MonsterRenderer";
import { GameplayActionBarView } from "../ui/GameplayActionBarView";
import { HatchPanelView } from "../ui/HatchPanelView";
import { HudView } from "../ui/HudView";
import { NextQuestWidgetView } from "../ui/NextQuestWidgetView";
import { PanelChrome } from "../ui/PanelChrome";
import { TapFarmView } from "../ui/TapFarmView";
import { farmSlotState } from "../state/farmSlotState";
import { hatchState, HATCH_COOLDOWN_MS } from "../state/hatchState";
import { tapFarmState } from "../state/tapFarmState";
import { coinBugState } from "../state/coinBugState";
import { upgradeState, UPGRADE_DEFINITIONS } from "../state/upgradeState";
import { questState, QUEST_DEFINITIONS } from "../state/questState";
import { getTotalIncomePerSecond } from "../systems/progressionSystem";
import { monsterMergeSystem } from "../systems/monsterMergeSystem";
import { writeSaveData } from "../systems/saveSystem";

export class FarmScene extends Phaser.Scene {
  renderer = new MonsterRenderer();
  create() {
    new HudView(this, getTotalIncomePerSecond(farmSlotState));
    new HatchPanelView(this, hatchState, HATCH_COOLDOWN_MS);
    new GameplayActionBarView(this);
    new NextQuestWidgetView(this, questState, QUEST_DEFINITIONS);
    new TapFarmView(this, tapFarmState, (amount) => this.onTapFarmClick(amount));
    PanelChrome.draw(this);
    monsterMergeSystem.findMergeCandidate(farmSlotState);
    coinBugState.spawned = true;
    upgradeState.definitions = UPGRADE_DEFINITIONS;
    writeSaveData({ farmSlotState, hatchState, tapFarmState });
  }
  onTapFarmClick(amount: number) {
    this.add.text(10, 10, `+${amount}`);
  }
}
