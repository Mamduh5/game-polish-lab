import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  buildMonsterFarmAuditDetails,
  monsterFarmMajorSurfaceModes,
  monsterFarmRecommendedKitOrder,
  renderMonsterFarmAuditMarkdownSections,
  renderMonsterFarmFinishStagePlanPrompt,
  renderMonsterFarmPromptGuardrail,
  splitMonsterFarmProjectTypeEvidence
} from "../core/monsterFarmDeepAudit";
import { analyzeBackgroundDetection, analyzeBackgroundStyleConnection } from "../core/backgroundAdapterAnalysis";
import { analyzeFarmSlotDetection, analyzeFarmSlotStyleConnection } from "../core/farmSlotAdapterAnalysis";
import { analyzePanelDetection, analyzePanelStyleConnection } from "../core/panelAdapterAnalysis";
import { checkV05VisualScope, isForbiddenV05Path } from "../core/v05VisualScopeGuard";
import {
  buildAssetRollbackSnapshotName,
  inspectAssetImage,
  normalizeAssetFileName,
  validateReplacementAsset
} from "../core/assetReplacement";
import {
  backgroundReadabilityStyleConfigRelativePath,
  buildBackgroundReadabilityStyleConfig,
  buildPanelStyleConfig,
  buildRollbackSnapshotName,
  buildSlotCardStyleConfig,
  loadBackgroundReadabilityStyleConfigFromText,
  loadPanelStyleConfigFromText,
  panelStyleConfigRelativePath,
  loadSlotCardStyleConfigFromText
} from "../core/visualSurfaceConfig";
import { detectMonsterFarmAssetTargets, monsterFarmAssetTargets } from "../core/monsterFarmAssetTargets";
import { backgroundReadabilityPresets, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { defaultPanelStyle, panelStylePresets } from "../presets/panelStylePresets";
import { pixelPolishKitPresets } from "../presets/pixelPolishKitPresets";
import { slotCardPresets } from "../presets/slotCardPresets";
import { InspectedFile } from "../types/audit";

const fixtureRoot = path.join(process.cwd(), "fixtures", "phaser-idle-monster-farm-sample");
const files = readFixtureFiles(fixtureRoot);
const audit = buildMonsterFarmAuditDetails(files, "tap_farm_idle", "phaser_rendered_ui_heavy", "typescript_module");
const sections = renderMonsterFarmAuditMarkdownSections(audit);
const guardrail = renderMonsterFarmPromptGuardrail();
const finishPlanPrompt = renderMonsterFarmFinishStagePlanPrompt();

assert.strictEqual(audit.projectFamily, "idle_monster_farm");
assert.strictEqual(audit.strongestSubmode, "tap_farm_idle");
assert.strictEqual(audit.detected.typeScriptModule, true);
assert.strictEqual(audit.detected.phaserUiHeavyRuntime, true);
assert.strictEqual(audit.detected.farmScene, true);
assert.strictEqual(audit.detected.monsterRenderer, true);
assert.strictEqual(audit.detected.tapFarmView, true);
assert.strictEqual(audit.detected.hatchMerge, true);
assert.strictEqual(audit.detected.quest, true);
assert.strictEqual(audit.detected.boss, true);
assert.strictEqual(audit.detected.coinBug, true);
assert.ok(sections.includes("- FarmScene detected: yes"));

const validFarmSlotConfig = buildSlotCardStyleConfig("Cozy Wood", slotCardPresets[0].values);
const validConfigLoad = loadSlotCardStyleConfigFromText(JSON.stringify(validFarmSlotConfig));
assert.strictEqual(validConfigLoad.status, "valid");
assert.strictEqual(validConfigLoad.existingConfigDetected, true);
assert.strictEqual(validConfigLoad.initializedFromExistingConfig, true);
assert.strictEqual(validConfigLoad.config.surfaceType, "slot_card");

const missingConfigLoad = loadSlotCardStyleConfigFromText(undefined);
assert.strictEqual(missingConfigLoad.status, "missing");
assert.strictEqual(missingConfigLoad.existingConfigDetected, false);
assert.strictEqual(missingConfigLoad.initializedFromExistingConfig, false);
assert.strictEqual(missingConfigLoad.config.values.slotWidth, slotCardPresets[0].values.slotWidth);

const invalidJsonConfigLoad = loadSlotCardStyleConfigFromText("{ nope");
assert.strictEqual(invalidJsonConfigLoad.status, "invalid_json");
assert.strictEqual(invalidJsonConfigLoad.existingConfigDetected, true);
assert.strictEqual(invalidJsonConfigLoad.initializedFromExistingConfig, false);
assert.ok(invalidJsonConfigLoad.warning?.includes("invalid JSON"));

const invalidSchemaConfigLoad = loadSlotCardStyleConfigFromText(JSON.stringify({ schemaVersion: 99 }));
assert.strictEqual(invalidSchemaConfigLoad.status, "schema_invalid");
assert.strictEqual(invalidSchemaConfigLoad.existingConfigDetected, true);
assert.strictEqual(invalidSchemaConfigLoad.initializedFromExistingConfig, false);
assert.ok(invalidSchemaConfigLoad.warning?.includes("unsupported schema"));

assert.deepStrictEqual(slotCardPresets.map((preset) => preset.name), [
  "Cozy Wood",
  "Magic Glow",
  "Chunky Pixel",
  "Clean Mobile"
]);

const v05Scope = checkV05VisualScope([
  ".game-polish-lab/styles/farm-slot-style.json",
  ".game-polish-lab/rollback/2026-06-24-farm-slot-style.json",
  "src/config/farmSlotStyle.ts",
  "src/state/farmSlotState.ts",
  "src/systems/monsterMergeSystem.ts",
  "src/services/rewardedAdService.ts"
], { throughAdapter: true });
assert.ok(v05Scope.allowedFiles.includes(".game-polish-lab/styles/farm-slot-style.json"));
assert.ok(v05Scope.allowedFiles.includes("src/config/farmSlotStyle.ts"));
assert.ok(v05Scope.forbiddenFiles.includes("src/state/farmSlotState.ts"));
assert.ok(v05Scope.forbiddenFiles.includes("src/systems/monsterMergeSystem.ts"));
assert.ok(v05Scope.forbiddenFiles.includes("src/services/rewardedAdService.ts"));
assert.strictEqual(isForbiddenV05Path("src/ui/Leaderboard.ts"), false);

const disconnectedFiles = [
  {
    relativePath: "src/scenes/FarmScene.ts",
    text: "import { farmSlotState } from '../state/farmSlotState'; const slots = farmSlotState.slots; monsterMergeSystem.findMergeCandidate(farmSlotState); writeSaveData({ farmSlotState });"
  },
  {
    relativePath: "src/config/farmSlotStyle.ts",
    text: "export const FARM_SLOT_STYLE = {};"
  }
];
const detection = analyzeFarmSlotDetection(disconnectedFiles);
assert.strictEqual(detection.target, "idle_monster_farm.farm_slots");
assert.strictEqual(detection.detected, true);
assert.strictEqual(detection.confidence, "medium");
assert.deepStrictEqual(detection.ownerFiles, ["src/scenes/FarmScene.ts"]);
assert.ok(detection.reasons.some((reason) => reason.includes("FarmScene")));
assert.ok(detection.warnings.some((warning) => warning.includes("save schema")));
assert.ok(detection.warnings.some((warning) => warning.includes("merge behavior")));

const disconnected = analyzeFarmSlotStyleConnection(disconnectedFiles);
assert.strictEqual(disconnected.connected, false);
assert.strictEqual(disconnected.connectionType, "none");
assert.deepStrictEqual(disconnected.connectedFiles, []);
assert.ok(disconnected.missingPieces.some((piece) => piece.includes("owner/rendering files")));

const connectedFiles = [
  {
    relativePath: "src/ui/FarmSlotView.ts",
    text: "import { FARM_SLOT_STYLE } from '../config/farmSlotStyle'; export function drawSlot() { return FARM_SLOT_STYLE.slotWidth; }"
  },
  {
    relativePath: "src/config/farmSlotStyle.ts",
    text: "export const FARM_SLOT_STYLE = { slotWidth: 100 };"
  }
];
const connectedDetection = analyzeFarmSlotDetection(connectedFiles);
assert.strictEqual(connectedDetection.detected, true);
assert.strictEqual(connectedDetection.confidence, "high");
const connected = analyzeFarmSlotStyleConnection(connectedFiles);
assert.strictEqual(connected.connected, true);
assert.strictEqual(connected.connectionType, "style_module");
assert.deepStrictEqual(connected.connectedFiles, ["src/ui/FarmSlotView.ts"]);
const connectedAfterRepeatedApply = analyzeFarmSlotStyleConnection(connectedFiles);
assert.strictEqual(connectedAfterRepeatedApply.connected, true);
assert.strictEqual(connectedAfterRepeatedApply.connectionType, "style_module");

assert.strictEqual(
  buildRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), ".game-polish-lab/styles/farm-slot-style.json"),
  "2026-06-24T10-11-12-123Z-farm-slot-style.json"
);

assert.deepStrictEqual(backgroundReadabilityPresets.map((preset) => preset.name), [
  "Soft Farm Morning",
  "Cozy Dusk",
  "Clean Contrast",
  "Dark Readable"
]);
assert.strictEqual(defaultBackgroundReadabilityStyle.backgroundColor, "#6f9f5f");
assert.strictEqual(defaultBackgroundReadabilityStyle.backgroundImageOpacity, 0.78);

const validBackgroundConfig = buildBackgroundReadabilityStyleConfig("Soft Farm Morning", backgroundReadabilityPresets[0].values);
const validBackgroundLoad = loadBackgroundReadabilityStyleConfigFromText(JSON.stringify(validBackgroundConfig));
assert.strictEqual(validBackgroundLoad.status, "valid");
assert.strictEqual(validBackgroundLoad.existingConfigDetected, true);
assert.strictEqual(validBackgroundLoad.initializedFromExistingConfig, true);
assert.strictEqual(validBackgroundLoad.config.surfaceType, "background_readability");

const missingBackgroundLoad = loadBackgroundReadabilityStyleConfigFromText(undefined);
assert.strictEqual(missingBackgroundLoad.status, "missing");
assert.strictEqual(missingBackgroundLoad.existingConfigDetected, false);
assert.strictEqual(missingBackgroundLoad.config.values.backgroundColor, backgroundReadabilityPresets[0].values.backgroundColor);

const invalidBackgroundJsonLoad = loadBackgroundReadabilityStyleConfigFromText("{ nope");
assert.strictEqual(invalidBackgroundJsonLoad.status, "invalid_json");
assert.strictEqual(invalidBackgroundJsonLoad.existingConfigDetected, true);
assert.strictEqual(invalidBackgroundJsonLoad.initializedFromExistingConfig, false);
assert.ok(invalidBackgroundJsonLoad.warning?.includes("invalid JSON"));

const invalidBackgroundSchemaLoad = loadBackgroundReadabilityStyleConfigFromText(JSON.stringify({ schemaVersion: 99 }));
assert.strictEqual(invalidBackgroundSchemaLoad.status, "schema_invalid");
assert.strictEqual(invalidBackgroundSchemaLoad.initializedFromExistingConfig, false);
assert.ok(invalidBackgroundSchemaLoad.warning?.includes("unsupported schema"));

const backgroundScope = checkV05VisualScope([
  backgroundReadabilityStyleConfigRelativePath,
  ".game-polish-lab/rollback/2026-06-24-background-readability-style.json",
  "src/config/backgroundReadabilityStyle.ts",
  "src/data/levels.ts",
  "src/systems/progressionSystem.ts",
  "src/services/rewardedAdService.ts"
], { throughAdapter: true });
assert.ok(backgroundScope.allowedFiles.includes(backgroundReadabilityStyleConfigRelativePath));
assert.ok(backgroundScope.allowedFiles.includes("src/config/backgroundReadabilityStyle.ts"));
assert.ok(backgroundScope.forbiddenFiles.includes("src/data/levels.ts"));
assert.ok(backgroundScope.forbiddenFiles.includes("src/systems/progressionSystem.ts"));
assert.ok(backgroundScope.forbiddenFiles.includes("src/services/rewardedAdService.ts"));

const disconnectedBackgroundFiles = [
  {
    relativePath: "src/scenes/FarmScene.ts",
    text: "this.add.rectangle(0, 0, 800, 600, 0x335533); this.cameras.main.setBounds(0, 0, 800, 600);"
  },
  {
    relativePath: "src/config/backgroundReadabilityStyle.ts",
    text: "export const BACKGROUND_READABILITY_STYLE = {};"
  }
];
const backgroundDetection = analyzeBackgroundDetection(disconnectedBackgroundFiles);
assert.strictEqual(backgroundDetection.target, "idle_monster_farm.background");
assert.strictEqual(backgroundDetection.detected, true);
assert.strictEqual(backgroundDetection.confidence, "medium");
assert.deepStrictEqual(backgroundDetection.ownerFiles, ["src/scenes/FarmScene.ts"]);
assert.ok(backgroundDetection.reasons.some((reason) => reason.includes("FarmScene")));
assert.ok(backgroundDetection.warnings.some((warning) => warning.includes("camera or world bounds")));

const disconnectedBackground = analyzeBackgroundStyleConnection(disconnectedBackgroundFiles);
assert.strictEqual(disconnectedBackground.connected, false);
assert.strictEqual(disconnectedBackground.connectionType, "none");
assert.ok(disconnectedBackground.missingPieces.some((piece) => piece.includes("Background owner/rendering files")));

const connectedBackgroundFiles = [
  {
    relativePath: "src/ui/BackgroundView.ts",
    text: "import { BACKGROUND_READABILITY_STYLE } from '../config/backgroundReadabilityStyle'; export function drawBackground() { return BACKGROUND_READABILITY_STYLE.backgroundColor; }"
  },
  {
    relativePath: "src/config/backgroundReadabilityStyle.ts",
    text: "export const BACKGROUND_READABILITY_STYLE = { backgroundColor: '#000000' };"
  }
];
const connectedBackgroundDetection = analyzeBackgroundDetection(connectedBackgroundFiles);
assert.strictEqual(connectedBackgroundDetection.detected, true);
assert.strictEqual(connectedBackgroundDetection.confidence, "high");
const connectedBackground = analyzeBackgroundStyleConnection(connectedBackgroundFiles);
assert.strictEqual(connectedBackground.connected, true);
assert.strictEqual(connectedBackground.connectionType, "style_module");
assert.deepStrictEqual(connectedBackground.connectedFiles, ["src/ui/BackgroundView.ts"]);
const connectedBackgroundAfterRepeatedApply = analyzeBackgroundStyleConnection(connectedBackgroundFiles);
assert.strictEqual(connectedBackgroundAfterRepeatedApply.connected, true);
assert.strictEqual(connectedBackgroundAfterRepeatedApply.connectionType, "style_module");

assert.strictEqual(
  buildRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), backgroundReadabilityStyleConfigRelativePath),
  "2026-06-24T10-11-12-123Z-background-readability-style.json"
);

const monsterFarmTargets = monsterFarmAssetTargets();
const monsterArtTarget = monsterFarmTargets.find((target) => target.targetId === "monster_art");
const rewardIconTarget = monsterFarmTargets.find((target) => target.targetId === "reward_icon");
assert.ok(monsterArtTarget, "monster_art target missing");
assert.ok(rewardIconTarget, "reward_icon target missing");
assert.strictEqual(monsterArtTarget.directApplySupported, true);
assert.strictEqual(monsterArtTarget.assignmentMode, "manifest");
assert.strictEqual(rewardIconTarget.directApplySupported, false);
assert.strictEqual(rewardIconTarget.assignmentMode, "manual_required");
const targetDetection = detectMonsterFarmAssetTargets();
assert.strictEqual(targetDetection.adapterId, "idle_monster_farm.assets");
assert.ok(targetDetection.targets.length >= 4);

const opaquePng = makeTestRgbaPng(4, 4, () => 255);
const transparentPng = makeTestRgbaPng(4, 4, () => 0);
const tinyPng = makeTestRgbaPng(20, 20, (x, y) => x === 0 && y === 0 ? 255 : 0);
const webp = makeTestWebP(32, 24, true);
assert.strictEqual(inspectAssetImage(opaquePng).fileType, "image/png");
assert.strictEqual(inspectAssetImage(webp).fileType, "image/webp");
assert.strictEqual(inspectAssetImage(new Uint8Array([1, 2, 3])).fileType, "unsupported");

assert.strictEqual(normalizeAssetFileName("Happy Monster.PNG"), "happy-monster.png");
assert.strictEqual(normalizeAssetFileName("../evil.png"), "");
assert.strictEqual(normalizeAssetFileName("folder/evil.png"), "");

const validMonsterAsset = validateReplacementAsset({ fileName: "monster.png", bytes: opaquePng }, monsterArtTarget);
assert.strictEqual(validMonsterAsset.ok, true);
assert.strictEqual(validMonsterAsset.model.destinationPath, "src/assets/monsters/monster.png");
assert.strictEqual(validMonsterAsset.imageInfo.visiblePixelCount, 16);

const invalidTypeAsset = validateReplacementAsset({ fileName: "monster.txt", bytes: new Uint8Array([1, 2, 3]) }, monsterArtTarget);
assert.strictEqual(invalidTypeAsset.ok, false);
assert.ok(invalidTypeAsset.model.validationErrors.some((error) => error.includes("PNG and WebP")));

const traversalAsset = validateReplacementAsset({ fileName: "../monster.png", bytes: opaquePng }, monsterArtTarget);
assert.strictEqual(traversalAsset.ok, false);
assert.ok(traversalAsset.model.validationErrors.some((error) => error.includes("path traversal")));

const transparentAsset = validateReplacementAsset({ fileName: "empty.png", bytes: transparentPng }, monsterArtTarget);
assert.strictEqual(transparentAsset.ok, false);
assert.ok(transparentAsset.model.validationErrors.some((error) => error.includes("fully transparent")));

const tinyAsset = validateReplacementAsset({ fileName: "tiny.png", bytes: tinyPng }, monsterArtTarget);
assert.strictEqual(tinyAsset.ok, false);
assert.ok(tinyAsset.model.validationErrors.some((error) => error.includes("tiny relative")));

const noAlphaBackground = validateReplacementAsset({ fileName: "background.webp", bytes: webp }, monsterFarmTargets.find((target) => target.targetId === "background_image")!);
assert.strictEqual(noAlphaBackground.ok, true);
assert.strictEqual(noAlphaBackground.model.transparencyRequired, false);

const assetScope = checkV05VisualScope([
  ".game-polish-lab/assets/imported.png",
  "src/assets/monsters/monster.png",
  "src/config/monsterFarmAssetManifest.ts",
  "src/systems/saveSystem.ts",
  "src/data/levels.ts",
  "src/gameplay/rules.ts"
], { throughAdapter: true });
assert.ok(assetScope.allowedFiles.includes(".game-polish-lab/assets/imported.png"));
assert.ok(assetScope.allowedFiles.includes("src/assets/monsters/monster.png"));
assert.ok(assetScope.allowedFiles.includes("src/config/monsterFarmAssetManifest.ts"));
assert.ok(assetScope.forbiddenFiles.includes("src/systems/saveSystem.ts"));
assert.ok(assetScope.forbiddenFiles.includes("src/data/levels.ts"));
assert.ok(assetScope.forbiddenFiles.includes("src/gameplay/rules.ts"));

assert.strictEqual(
  buildAssetRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), "src/assets/monsters/monster.png", "monster_art"),
  "2026-06-24T10-11-12-123Z-monster_art-monster.png"
);

assert.deepStrictEqual(panelStylePresets.map((preset) => preset.name), [
  "Cozy Card",
  "Clean Mobile Panel",
  "Magic Frame",
  "Dark Arcade Panel"
]);
assert.strictEqual(defaultPanelStyle.fillColor, "#3a2a1f");
assert.strictEqual(defaultPanelStyle.titleTextSize, 18);

const validPanelConfig = buildPanelStyleConfig("Cozy Card", panelStylePresets[0].values);
const validPanelLoad = loadPanelStyleConfigFromText(JSON.stringify(validPanelConfig));
assert.strictEqual(validPanelLoad.status, "valid");
assert.strictEqual(validPanelLoad.existingConfigDetected, true);
assert.strictEqual(validPanelLoad.initializedFromExistingConfig, true);
assert.strictEqual(validPanelLoad.config.surfaceType, "panel");

const missingPanelLoad = loadPanelStyleConfigFromText(undefined);
assert.strictEqual(missingPanelLoad.status, "missing");
assert.strictEqual(missingPanelLoad.existingConfigDetected, false);
assert.strictEqual(missingPanelLoad.config.values.fillColor, panelStylePresets[0].values.fillColor);

const invalidPanelJsonLoad = loadPanelStyleConfigFromText("{ nope");
assert.strictEqual(invalidPanelJsonLoad.status, "invalid_json");
assert.strictEqual(invalidPanelJsonLoad.existingConfigDetected, true);
assert.strictEqual(invalidPanelJsonLoad.initializedFromExistingConfig, false);
assert.ok(invalidPanelJsonLoad.warning?.includes("invalid JSON"));

const invalidPanelSchemaLoad = loadPanelStyleConfigFromText(JSON.stringify({ schemaVersion: 99 }));
assert.strictEqual(invalidPanelSchemaLoad.status, "schema_invalid");
assert.strictEqual(invalidPanelSchemaLoad.initializedFromExistingConfig, false);
assert.ok(invalidPanelSchemaLoad.warning?.includes("unsupported schema"));

const panelScope = checkV05VisualScope([
  panelStyleConfigRelativePath,
  ".game-polish-lab/rollback/2026-06-24-panel-style.json",
  "src/config/panelStyle.ts",
  "src/ui/HatchPanelView.ts",
  "src/ui/NextQuestWidgetView.ts",
  "src/state/hatchState.ts",
  "src/state/questState.ts",
  "src/navigation/routes.ts",
  "src/gameplay/rules.ts"
], { throughAdapter: true });
assert.ok(panelScope.allowedFiles.includes(panelStyleConfigRelativePath));
assert.ok(panelScope.allowedFiles.includes("src/config/panelStyle.ts"));
assert.ok(panelScope.adapterOnlyFiles.includes("src/ui/HatchPanelView.ts"));
assert.ok(panelScope.adapterOnlyFiles.includes("src/ui/NextQuestWidgetView.ts"));
assert.ok(panelScope.forbiddenFiles.includes("src/state/hatchState.ts"));
assert.ok(panelScope.forbiddenFiles.includes("src/state/questState.ts"));
assert.ok(panelScope.forbiddenFiles.includes("src/navigation/routes.ts"));
assert.ok(panelScope.forbiddenFiles.includes("src/gameplay/rules.ts"));

const disconnectedPanelFiles = [
  {
    relativePath: "src/ui/NavigationMenuPanelView.ts",
    text: "export class NavigationMenuPanelView { openMenu() { this.navigate('hatch'); } }"
  },
  {
    relativePath: "src/ui/HatchPanelView.ts",
    text: "export class HatchPanelView { draw() { return 'hatch cooldown'; } }"
  },
  {
    relativePath: "src/ui/NextQuestWidgetView.ts",
    text: "export class NextQuestWidgetView { draw() { return 'quest reward'; } }"
  },
  {
    relativePath: "src/config/panelStyle.ts",
    text: "export const PANEL_STYLE = {};"
  }
];
const panelDetection = analyzePanelDetection(disconnectedPanelFiles);
assert.strictEqual(panelDetection.target, "idle_monster_farm.panels");
assert.strictEqual(panelDetection.detected, true);
assert.strictEqual(panelDetection.confidence, "high");
assert.deepStrictEqual(panelDetection.targetPanels, ["hatch_panel", "navigation_panel", "quest_panel"]);
assert.ok(panelDetection.ownerFiles.includes("src/ui/NavigationMenuPanelView.ts"));
assert.ok(panelDetection.reasons.some((reason) => reason.includes("dedicated panel")));
assert.ok(panelDetection.warnings.some((warning) => warning.includes("navigation logic")));
assert.ok(panelDetection.warnings.some((warning) => warning.includes("hatch logic")));
assert.ok(panelDetection.warnings.some((warning) => warning.includes("quest logic")));

const disconnectedPanel = analyzePanelStyleConnection(disconnectedPanelFiles);
assert.strictEqual(disconnectedPanel.connected, false);
assert.strictEqual(disconnectedPanel.connectionType, "none");
assert.ok(disconnectedPanel.missingPieces.some((piece) => piece.includes("Panel owner/rendering files")));

const connectedPanelFiles = [
  {
    relativePath: "src/ui/PanelChrome.ts",
    text: "import { PANEL_STYLE } from '../config/panelStyle'; export function drawPanel() { return PANEL_STYLE.fillColor; }"
  },
  {
    relativePath: "src/config/panelStyle.ts",
    text: "export const PANEL_STYLE = { fillColor: '#000000' };"
  }
];
const connectedPanelDetection = analyzePanelDetection(connectedPanelFiles);
assert.strictEqual(connectedPanelDetection.detected, true);
assert.strictEqual(connectedPanelDetection.confidence, "high");
const connectedPanel = analyzePanelStyleConnection(connectedPanelFiles);
assert.strictEqual(connectedPanel.connected, true);
assert.strictEqual(connectedPanel.connectionType, "style_module");
assert.deepStrictEqual(connectedPanel.connectedFiles, ["src/ui/PanelChrome.ts"]);
const connectedPanelAfterRepeatedApply = analyzePanelStyleConnection(connectedPanelFiles);
assert.strictEqual(connectedPanelAfterRepeatedApply.connected, true);
assert.strictEqual(connectedPanelAfterRepeatedApply.connectionType, "style_module");

assert.strictEqual(
  buildRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), panelStyleConfigRelativePath),
  "2026-06-24T10-11-12-123Z-panel-style.json"
);

const farmSceneFallbackAudit = buildMonsterFarmAuditDetails([
  {
    relativePath: "src/main.ts",
    text: "import { FarmScene } from './scenes/FarmScene'; new Phaser.Game({ scene: [BootScene, FarmScene] });"
  }
], "tap_farm_idle", "phaser_rendered_ui_heavy", "typescript_module");
assert.strictEqual(farmSceneFallbackAudit.detected.farmScene, true);

for (const mode of [
  "monster_farm_slots",
  "monster_identity",
  "hatch_merge_loop",
  "tap_farm_idle",
  "ui_panel_hierarchy",
  "quest_reward_guidance",
  "boss_battle_secondary"
]) {
  assert.ok(monsterFarmMajorSurfaceModes.includes(mode), `missing surface mode: ${mode}`);
}

for (const heading of [
  "## Monster Farm Confidence",
  "## Monster Farm Surface Map",
  "## Finish-Stage Polish Priorities",
  "## File Role Map",
  "## Non-Dominant Keyword Noise",
  "## Rendering Style Readiness"
]) {
  assert.ok(sections.includes(heading), `missing audit heading: ${heading}`);
}

assert.deepStrictEqual(monsterFarmRecommendedKitOrder, [
  "monster_farm_slot_readability",
  "panel_readability",
  "merge_feedback",
  "tap_farm_feedback",
  "coin_bug_feedback",
  "farm_hud_readability",
  "quest_widget_readability",
  "toast_reward_feedback",
  "boss_battle_feedback",
  "monster_identity_readability",
  "hatch_feedback"
]);

for (const forbiddenKit of ["cursor_attack_feedback", "arena_hud_readability", "projectile_readability", "hit_feedback"]) {
  assert.ok(!monsterFarmRecommendedKitOrder.includes(forbiddenKit), `forbidden Monster Farm kit recommended: ${forbiddenKit}`);
}

const evidenceSplit = splitMonsterFarmProjectTypeEvidence([
  "idle_monster_farm: farmscene, monsterrenderer in src/scenes/FarmScene.ts",
  "tap_farm_idle: tapfarmview in src/ui/TapFarmView.ts",
  "arena_combat: boss, attack in src/data/bossBattles.ts",
  "top_down_shooter: projectile in src/audio/translations.ts",
  "survivor_like: wave, pickup in src/ui/ToastView.ts",
  "moba_like: skill, cooldown in src/state/bossBattleState.ts",
  "incremental_arena: reward, combo in src/scenes/FarmScene.ts"
]);
assert.deepStrictEqual(evidenceSplit.mainEvidence, [
  "idle_monster_farm: farmscene, monsterrenderer in src/scenes/FarmScene.ts",
  "tap_farm_idle: tapfarmview in src/ui/TapFarmView.ts"
]);
assert.deepStrictEqual(evidenceSplit.nonDominantKeywordEvidence, [
  "arena_combat: boss, attack in src/data/bossBattles.ts",
  "top_down_shooter: projectile in src/audio/translations.ts",
  "survivor_like: wave, pickup in src/ui/ToastView.ts",
  "moba_like: skill, cooldown in src/state/bossBattleState.ts",
  "incremental_arena: reward, combo in src/scenes/FarmScene.ts"
]);

const mainSuggestedProjectTypeSection = evidenceSplit.mainEvidence.map((item) => `- ${item}`).join("\n");
for (const noisyBucket of ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "incremental_arena"]) {
  assert.ok(!mainSuggestedProjectTypeSection.includes(`${noisyBucket}:`), `noisy bucket leaked into main Suggested Project Type: ${noisyBucket}`);
}

for (const phrase of [
  "nearly finished TypeScript Phaser UI-heavy idle monster farm",
  "diagnose first",
  "one small reversible surface at a time",
  "never modify economy, save, hatch odds, upgrade costs, quest rewards, ad/monetization, or progression formulas",
  "Do not rewrite FarmScene.",
  "Prefer UI view files or config files.",
  "State/data/system files are inspect-only unless the task explicitly says gameplay logic.",
  "If unsure, stop at diagnosis and propose a plan.",
  "Do not globally boost effects.",
  "Do not add mechanics.",
  "Do not change balance.",
  "Do not touch Capacitor/AdMob unless explicitly asked.",
  "Run `npm run build` after implementation.",
  "Proven-good first patch: farm_slot_state_readability",
  "Proven-good low-risk polish target: panel_hierarchy",
  "Do not add family initials, level badges, metadata chips, or extra labels to the main farm grid by default.",
  "Exact monster metadata belongs in compendium/detail UI, not on farm slots.",
  "Hatch panel style-only polish was neutral"
]) {
  assert.ok(guardrail.includes(phrase), `missing guardrail phrase: ${phrase}`);
}

assert.ok(finishPlanPrompt.includes("- Do not patch yet."));
assert.ok(finishPlanPrompt.includes("- Produce the top 5 polish opportunities."));
assert.ok(finishPlanPrompt.includes("- fresh save first 2 minutes"));
assert.ok(finishPlanPrompt.includes("Prioritize `farm_slot_state_readability` and `panel_hierarchy` as proven safe early polish targets."));
assert.ok(finishPlanPrompt.includes("Treat `hatch_panel_readiness` as optional unless the user reports the hatch panel feels unclear."));
assert.ok(finishPlanPrompt.includes("warn against badge/chip metadata overlays on farm slots"));
assert.ok(finishPlanPrompt.includes("Proven-good first patch: farm_slot_state_readability"));
assert.ok(finishPlanPrompt.includes("Proven-good low-risk polish target: panel_hierarchy"));

const identityKit = pixelPolishKitPresets.find((preset) => preset.kitId === "monster_identity_readability");
assert.ok(identityKit, "monster_identity_readability kit missing");
const identityPromptSource = [
  identityKit.targetFeel,
  ...identityKit.acceptanceCriteria,
  ...identityKit.antiPatterns,
  ...identityKit.codexImplementationNotes,
  ...identityKit.manualTuningAdvice
].join("\n");
for (const phrase of [
  "No family initials, level badges, metadata chips, or extra labels are added to the main farm grid by default.",
  "Exact monster metadata belongs in compendium/detail UI",
  "Prefer silhouette/readability/art contrast/spacing/outline improvements",
  "recommend skipping this surface instead of adding UI metadata",
  "Keep data/state/save/economy files inspect-only."
]) {
  assert.ok(identityPromptSource.includes(phrase), `missing identity prompt warning: ${phrase}`);
}

const cursorArenaFixture = readFixtureFiles(path.join(process.cwd(), "fixtures", "phaser-incremental-arena-sample"));
const cursorArenaText = cursorArenaFixture.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
assert.ok(cursorArenaText.includes("cursorattacksystem"));
assert.ok(cursorArenaText.includes("arenahud"));
assert.ok(cursorArenaText.includes("arena.html"));

const sortPuzzleFixture = readFixtureFiles(path.join(process.cwd(), "fixtures", "phaser-sort-puzzle-sample"));
const sortPuzzleText = sortPuzzleFixture.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
assert.ok(sortPuzzleText.includes("spiritsortscene"));
assert.ok(sortPuzzleText.includes("sortrules"));
assert.ok(sortPuzzleText.includes("spiritsortlevels"));

function makeTestRgbaPng(width: number, height: number, alphaForPixel: (x: number, y: number) => number): Uint8Array {
  const rowLength = 1 + width * 4;
  const idat = new Uint8Array(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowLength;
    idat[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixelStart = rowStart + 1 + x * 4;
      idat[pixelStart] = 80;
      idat[pixelStart + 1] = 160;
      idat[pixelStart + 2] = 80;
      idat[pixelStart + 3] = alphaForPixel(x, y);
    }
  }
  return concatBytes(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", concatBytes(uint32BE(width), uint32BE(height), new Uint8Array([8, 6, 0, 0, 0]))),
    pngChunk("IDAT", idat),
    pngChunk("IEND", new Uint8Array())
  );
}

function makeTestWebP(width: number, height: number, alpha: boolean): Uint8Array {
  const bytes = new Uint8Array(30);
  writeAscii(bytes, 0, "RIFF");
  writeAscii(bytes, 8, "WEBP");
  writeAscii(bytes, 12, "VP8X");
  bytes[20] = alpha ? 0x10 : 0;
  writeUint24LE(bytes, 24, width - 1);
  writeUint24LE(bytes, 27, height - 1);
  return bytes;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  return concatBytes(uint32BE(data.length), asciiBytes(type), data, new Uint8Array([0, 0, 0, 0]));
}

function uint32BE(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function writeUint24LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
}

function writeAscii(bytes: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
}

function asciiBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  writeAscii(bytes, 0, value);
  return bytes;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function readFixtureFiles(root: string): InspectedFile[] {
  const results: InspectedFile[] = [];
  for (const absolutePath of walk(root)) {
    if (!/\.(ts|js|json|html|css)$/i.test(absolutePath)) {
      continue;
    }
    results.push({
      relativePath: path.relative(root, absolutePath).replace(/\\/g, "/"),
      text: fs.readFileSync(absolutePath, "utf8"),
      sizeBytes: fs.statSync(absolutePath).size
    });
  }
  return results;
}

function walk(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(root, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}
