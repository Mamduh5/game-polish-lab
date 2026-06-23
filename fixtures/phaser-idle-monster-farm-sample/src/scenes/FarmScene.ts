import { MonsterRenderer } from "../rendering/MonsterRenderer";
import { GameplayActionBarView } from "../ui/GameplayActionBarView";
import { HatchPanelView } from "../ui/HatchPanelView";
import { HudView } from "../ui/HudView";
import { NextQuestWidgetView } from "../ui/NextQuestWidgetView";
import { NavigationControlView } from "../ui/NavigationControlView";
import { NavigationMenuPanelView } from "../ui/NavigationMenuPanelView";
import { PanelChrome } from "../ui/PanelChrome";
import { PanelControls } from "../ui/PanelControls";
import { TapFarmView } from "../ui/TapFarmView";
import { ToastView } from "../ui/ToastView";
import { BOSS_BATTLE_DEFINITIONS } from "../data/bossBattles";
import { ECONOMY_CONFIG } from "../data/economy";
import { ELEMENT_DEFINITIONS } from "../data/elements";
import { MONSTER_DEFINITIONS } from "../data/monsters";
import { QUEST_DEFINITIONS as QUEST_DATA_DEFINITIONS } from "../data/quests";
import { UPGRADE_DEFINITIONS as UPGRADE_DATA_DEFINITIONS } from "../data/upgrades";
import { ZONE_DEFINITIONS } from "../data/zones";
import { bossBattleState } from "../state/bossBattleState";
import { farmSlotState } from "../state/farmSlotState";
import { hatchState, HATCH_COOLDOWN_MS } from "../state/hatchState";
import { tapFarmState } from "../state/tapFarmState";
import { coinBugState } from "../state/coinBugState";
import { upgradeState, UPGRADE_DEFINITIONS } from "../state/upgradeState";
import { questState, QUEST_DEFINITIONS } from "../state/questState";
import { getTotalIncomePerSecond } from "../systems/progressionSystem";
import { getMonsterMergeResult, monsterMergeSystem } from "../systems/monsterMergeSystem";
import { writeSaveData } from "../systems/saveSystem";
import { showRewardedAd } from "../services/rewardedAdService";

export class FarmScene extends Phaser.Scene {
  renderer = new MonsterRenderer();
  create() {
    new HudView(this, getTotalIncomePerSecond(farmSlotState));
    new HatchPanelView(this, hatchState, HATCH_COOLDOWN_MS);
    new GameplayActionBarView(this);
    new NavigationControlView(this);
    new NavigationMenuPanelView(this);
    new NextQuestWidgetView(this, questState, QUEST_DEFINITIONS);
    new TapFarmView(this, tapFarmState, (amount) => this.onTapFarmClick(amount));
    new ToastView(this, "Reward ready");
    PanelChrome.draw(this);
    PanelControls.drawCloseButton(this);
    monsterMergeSystem.findMergeCandidate(farmSlotState);
    getMonsterMergeResult(farmSlotState.slots[0], farmSlotState.slots[1]);
    coinBugState.spawned = true;
    upgradeState.definitions = UPGRADE_DEFINITIONS;
    bossBattleState.currentBossId = BOSS_BATTLE_DEFINITIONS[0].id;
    showRewardedAd("double-hatch");
    writeSaveData({
      farmSlotState,
      hatchState,
      tapFarmState,
      economy: ECONOMY_CONFIG,
      monsters: MONSTER_DEFINITIONS,
      upgrades: UPGRADE_DATA_DEFINITIONS,
      quests: QUEST_DATA_DEFINITIONS,
      elements: ELEMENT_DEFINITIONS,
      zones: ZONE_DEFINITIONS
    });
  }
  onTapFarmClick(amount: number) {
    this.add.text(10, 10, `+${amount}`);
  }
}
