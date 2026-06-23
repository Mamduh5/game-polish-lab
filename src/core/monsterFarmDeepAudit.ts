import type { InspectedFile } from "../types/audit";
import type { ProjectType } from "../types/profile";

export type MonsterFarmRenderingStyle = "pixel_art" | "shape_vector_ui" | "mixed_phaser_shapes_and_sprites" | "unknown";

export interface MonsterFarmAuditDetails {
  isMonsterFarm: boolean;
  projectFamily: "idle_monster_farm";
  strongestSubmode: ProjectType | "unknown";
  majorSurfaceModes: string[];
  renderingStyle: MonsterFarmRenderingStyle;
  detected: {
    farmScene: boolean;
    typeScriptModule: boolean;
    phaserUiHeavyRuntime: boolean;
    uiViewCount: number;
    stateEconomySaveSystemCount: number;
    monsterRenderer: boolean;
    tapFarmView: boolean;
    hatchMerge: boolean;
    quest: boolean;
    boss: boolean;
    coinBug: boolean;
  };
}

export const monsterFarmProjectTypes: ProjectType[] = ["idle_monster_farm", "monster_merge_idle", "phaser_ui_heavy_idle", "tap_farm_idle"];

export const monsterFarmMajorSurfaceModes = [
  "monster_farm_slots",
  "monster_identity",
  "hatch_merge_loop",
  "tap_farm_idle",
  "ui_panel_hierarchy",
  "quest_reward_guidance",
  "boss_battle_secondary"
];

export const monsterFarmFinishStagePriorities = [
  "farm_slot_state_readability",
  "monster_identity_readability",
  "hatch_panel_readiness",
  "merge_feedback",
  "tap_farm_feedback",
  "coin_bug_feedback",
  "hud_resource_readability",
  "panel_hierarchy",
  "quest_and_next_action_clarity",
  "boss_battle_feedback"
];

export const monsterFarmRecommendedKitOrder = [
  "monster_farm_slot_readability",
  "monster_identity_readability",
  "hatch_feedback",
  "merge_feedback",
  "tap_farm_feedback",
  "coin_bug_feedback",
  "farm_hud_readability",
  "panel_readability",
  "quest_widget_readability",
  "toast_reward_feedback",
  "boss_battle_feedback"
];

export const monsterFarmManualTestMatrix = [
  "fresh save first 2 minutes",
  "hatch ready",
  "hatch cooldown",
  "cannot afford hatch",
  "farm full",
  "drag monster",
  "valid merge candidate",
  "invalid merge/drop",
  "tap farm with energy",
  "tap farm blocked/cooldown/empty energy",
  "coin bug appears/pickup/reward",
  "quest widget visible",
  "open/close navigation/panels",
  "toast reward visible",
  "save/reload"
];

export const monsterFarmStrongGuardrail = "This is a nearly finished TypeScript Phaser UI-heavy idle monster farm. Treat visual polish as finish-stage work: diagnose first, patch one small reversible surface at a time, and never modify economy, save, hatch odds, upgrade costs, quest rewards, ad/monetization, or progression formulas unless explicitly requested.";

export function isMonsterFarmType(projectType: ProjectType | "unknown"): boolean {
  return monsterFarmProjectTypes.includes(projectType as ProjectType);
}

export function buildMonsterFarmAuditDetails(files: InspectedFile[], strongestSubmode: ProjectType | "unknown", runtimePresentationModel: string, codeStyle: string): MonsterFarmAuditDetails {
  const uiViewCount = countFiles(files, /^src\/ui\/.+View\.ts$/i) + countFiles(files, /^src\/ui\/Panel(?:Chrome|Controls)\.ts$/i);
  const stateEconomySaveSystemCount = countFiles(files, /^src\/state\/.+\.ts$/i)
    + countFiles(files, /^src\/systems\/(?:progressionSystem|monsterMergeSystem|saveSystem)\.ts$/i)
    + countFiles(files, /^src\/services\/rewardedAdService\.ts$/i)
    + countFiles(files, /^src\/data\/(?:economy|upgrades|quests|bossBattles|monsters|elements|zones)\.ts$/i);

  return {
    isMonsterFarm: true,
    projectFamily: "idle_monster_farm",
    strongestSubmode,
    majorSurfaceModes: monsterFarmMajorSurfaceModes,
    renderingStyle: classifyMonsterFarmRenderingStyle(files),
    detected: {
      farmScene: hasPath(files, "src/scenes/FarmScene.ts"),
      typeScriptModule: codeStyle === "typescript_module",
      phaserUiHeavyRuntime: runtimePresentationModel === "phaser_rendered_ui_heavy",
      uiViewCount,
      stateEconomySaveSystemCount,
      monsterRenderer: hasPath(files, "src/rendering/MonsterRenderer.ts"),
      tapFarmView: hasPath(files, "src/ui/TapFarmView.ts"),
      hatchMerge: hasAnySignal(files, ["src/ui/HatchPanelView.ts", "src/state/hatchState.ts", "src/systems/monsterMergeSystem.ts", "getMonsterMergeResult", "HATCH_COOLDOWN_MS"]),
      quest: hasAnySignal(files, ["src/state/questState.ts", "src/data/quests.ts", "QUEST_DEFINITIONS", "NextQuestWidgetView"]),
      boss: hasAnySignal(files, ["src/state/bossBattleState.ts", "src/data/bossBattles.ts", "BOSS_BATTLE_DEFINITIONS"]),
      coinBug: hasAnySignal(files, ["src/state/coinBugState.ts", "coin bug", "coinBug"])
    }
  };
}

export function renderMonsterFarmPromptGuardrail(): string {
  return `## Monster Farm Finish-Stage Guardrail

${monsterFarmStrongGuardrail}

- Do not rewrite FarmScene.
- Prefer UI view files or config files.
- State/data/system files are inspect-only unless the task explicitly says gameplay logic.
- If unsure, stop at diagnosis and propose a plan.
- Do not globally boost effects.
- Do not add mechanics.
- Do not change balance.
- Do not touch Capacitor/AdMob unless explicitly asked.
- Run \`npm run build\` after implementation.`;
}

export function renderMonsterFarmFinishStagePlanPrompt(): string {
  return `# Game Polish Lab Finish-Stage Polish Plan

Project family: idle_monster_farm

${renderMonsterFarmPromptGuardrail()}

## Instructions

- Inspect first.
- Produce the top 5 polish opportunities.
- Do not patch yet.
- Avoid economy/save/ad/formula systems.
- Prefer one patch at a time.
- Do not create a broad "make it polished" implementation plan.

## For Each Opportunity Include

- Surface
- Likely files
- Visible improvement
- Risk
- Files not to touch
- Tiny patch idea
- Rollback
- Manual tests

## Priority Order

${formatList(monsterFarmFinishStagePriorities)}

## Manual Test Matrix

${formatList(monsterFarmManualTestMatrix)}`;
}

export function renderMonsterFarmAuditMarkdownSections(audit: MonsterFarmAuditDetails): string {
  return `## Monster Farm Confidence

- FarmScene detected: ${yesNo(audit.detected.farmScene)}
- TypeScript module detected: ${yesNo(audit.detected.typeScriptModule)}
- Phaser UI-heavy runtime detected: ${yesNo(audit.detected.phaserUiHeavyRuntime)}
- UI views detected count: ${audit.detected.uiViewCount}
- state/economy/save systems detected count: ${audit.detected.stateEconomySaveSystemCount}
- MonsterRenderer detected: ${yesNo(audit.detected.monsterRenderer)}
- TapFarmView detected: ${yesNo(audit.detected.tapFarmView)}
- hatch/merge detected: ${yesNo(audit.detected.hatchMerge)}
- quest detected: ${yesNo(audit.detected.quest)}
- boss detected: ${yesNo(audit.detected.boss)}
- coin bug detected: ${yesNo(audit.detected.coinBug)}
- Combat/shooter/moba keywords are not dominant because the detected architecture is FarmScene plus Phaser UI views, monster rendering, hatch/merge/tap farm state, save/economy systems, and farm-specific panels.

## Monster Farm Surface Map

### Primary visual owners

- \`src/rendering/MonsterRenderer.ts\`
- \`src/ui/TapFarmView.ts\`
- \`src/ui/HudView.ts\`
- \`src/ui/HatchPanelView.ts\`
- \`src/ui/GameplayActionBarView.ts\`
- \`src/ui/NavigationControlView.ts\`
- \`src/ui/NavigationMenuPanelView.ts\`
- \`src/ui/NextQuestWidgetView.ts\`
- \`src/ui/ToastView.ts\`
- \`src/ui/PanelChrome.ts\`
- \`src/ui/PanelControls.ts\`
- small visual-only regions of \`src/scenes/FarmScene.ts\`

### State/economy/save/ad risk files

Usually inspect-only for visual polish:

- \`src/state/*.ts\`
- \`src/systems/progressionSystem.ts\`
- \`src/systems/monsterMergeSystem.ts\`
- \`src/systems/saveSystem.ts\`
- \`src/services/rewardedAdService.ts\`

### Data/formula risk files

Do not touch unless explicit gameplay/content task:

- \`src/data/economy.ts\`
- \`src/data/monsters.ts\`
- \`src/data/upgrades.ts\`
- \`src/data/quests.ts\`
- \`src/data/bossBattles.ts\`
- \`src/data/elements.ts\`
- \`src/data/zones.ts\`

### Main integration file

- \`src/scenes/FarmScene.ts\`: Large integration scene. Prefer reading it for wiring/layout ownership. Patch only tiny visual/config wiring sections when unavoidable.

## Finish-Stage Polish Priorities

${monsterFarmFinishStagePriorities.map((item, index) => `${index + 1}. \`${item}\``).join("\n")}

## File Role Map

- \`src/main.ts\`: app boot / Phaser config
- \`src/scenes/FarmScene.ts\`: integration scene / layout / event wiring
- \`src/rendering/MonsterRenderer.ts\`: monster visual identity owner
- \`src/ui/*.ts\`: Phaser UI surface owners
- \`src/state/*.ts\`: gameplay state/formulas, mostly inspect-only
- \`src/systems/saveSystem.ts\`: save persistence, do not touch for visual polish
- \`src/services/rewardedAdService.ts\`: ad/monetization behavior, do not touch
- \`src/data/*.ts\`: definitions/formulas/content, do not touch unless explicit

## Non-Dominant Keyword Noise

Combat/action keywords may appear in boss battle, audio, translations, or UI language, but they are not the dominant game identity. Do not let \`arena_combat\`, \`top_down_shooter\`, \`survivor_like\`, \`moba_like\`, or \`incremental_arena\` keyword noise drive recommended kits for this project.

## Rendering Style Readiness

- Rendering style: \`${audit.renderingStyle}\`
- Pixel renderer flags are secondary unless the game intends crisp pixel art. Main risk is UI-heavy visual hierarchy and state readability.`;
}

function classifyMonsterFarmRenderingStyle(files: InspectedFile[]): MonsterFarmRenderingStyle {
  const source = files.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
  const shapeSignals = countMatches(source, /\b(?:graphics|add\.graphics|fillstyle|linestyle|fillroundedrect|stroke(?:rounded)?rect|add\.text|textstyle)\b/g);
  const spriteSignals = countMatches(source, /\b(?:add\.sprite|add\.image|sprite|spritesheet|texture|frame)\b/g);
  const pixelSignals = countMatches(source, /\b(?:pixelart\s*:\s*true|roundpixels\s*:\s*true|image-rendering\s*:\s*pixelated)\b/g);

  if (shapeSignals >= 4 && spriteSignals >= 2) {
    return "mixed_phaser_shapes_and_sprites";
  }
  if (shapeSignals >= 4) {
    return "shape_vector_ui";
  }
  if (pixelSignals >= 2 && spriteSignals > shapeSignals) {
    return "pixel_art";
  }
  return "unknown";
}

function hasPath(files: InspectedFile[], relativePath: string): boolean {
  const normalized = relativePath.toLowerCase();
  return files.some((file) => file.relativePath.replace(/\\/g, "/").toLowerCase() === normalized);
}

function countFiles(files: InspectedFile[], pattern: RegExp): number {
  return files.filter((file) => pattern.test(file.relativePath.replace(/\\/g, "/"))).length;
}

function hasAnySignal(files: InspectedFile[], signals: string[]): boolean {
  const haystack = files.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
  return signals.some((signal) => haystack.includes(signal.toLowerCase()));
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}
