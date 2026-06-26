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
import { analyzeButtonDetection, analyzeButtonStyleConnection } from "../core/buttonAdapterAnalysis";
import { analyzeFarmSlotDetection, analyzeFarmSlotStyleConnection } from "../core/farmSlotAdapterAnalysis";
import { analyzePanelDetection, analyzePanelStyleConnection } from "../core/panelAdapterAnalysis";
import { analyzeRewardToastDetection, analyzeRewardToastStyleConnection } from "../core/rewardToastAdapterAnalysis";
import { checkV05VisualScope, isForbiddenV05Path } from "../core/v05VisualScopeGuard";
import {
  checkVisualScopeGuard,
  normalizeVisualScopePath,
  renderVisualScopeGuardMessage,
  visualScopeGuardRulesSummary,
  visualScopeGuardWarnings
} from "../core/visualScopeGuard";
import {
  buildGenericAssetTarget,
  buildGenericFallbackTask,
  detectGenericPhaserProject,
  genericFallbackTaskRelativePath,
  genericGeneratedStyleModulePath,
  genericStyleConfigRelativePath,
  normalizeGenericSelectedFiles,
  shouldOfferGenericPhaserAdapter
} from "../core/genericPhaserAdapterModel";
import {
  buildVisualTuningAttemptIndex,
  createVisualTuningAttempt,
  escapeMarkdown,
  extractFieldNoteTreatmentSummary,
  fieldNoteGuidanceForFallback,
  queryAttemptIndex,
  renderVisualTuningFieldNote,
  safeAttemptRelativePath,
  updateAttemptResultModel,
  validateVisualTuningAttempt,
  visualTuningResultStatuses
} from "../core/tuningAttemptModel";
import {
  buildDashboardRow,
  buildVisualTuningDashboardModel,
  calculateAppliedStatus,
  configPathForDashboard,
  dashboardManualChecklist,
  recipeFileStatus
} from "../core/visualTuningDashboardModel";
import {
  buildVisualPreviewRenderRequest,
  getVisualPreviewAnimations,
  getVisualPreviewStates,
  visualPreviewViewports
} from "../core/visualPreviewModel";
import {
  assetReplacementRecipeNote,
  getVisualSurfaceRecipe,
  getVisualSurfaceRecipes,
  validateVisualStyleToken,
  validateVisualSurfaceRecipe,
  visualRecipeRelativePath,
  visualSurfacePickerOrder
} from "../core/visualRecipeRegistry";
import {
  buildAssetRollbackSnapshotName,
  inspectAssetImage,
  normalizeAssetFileName,
  validateReplacementAsset
} from "../core/assetReplacement";
import {
  assetContractRelativePath,
  assetContractSchemaVersion,
  assetContractWritePaths,
  buildMonsterFarmAssetContractFile,
  formatVisualAssetContractFile,
  loadVisualAssetContractFileFromText,
  resolveAssetContractFilePath,
  summarizeVisualAssetContractStatuses,
  validateVisualAssetSlotContractSync,
  writeVisualAssetContractFileSync
} from "../core/visualAssetContracts";
import {
  buildVisualAssetContactSheetFromContractFile,
  buildVisualAssetContactSheetFromText,
  resolveContactSheetAssetPreviewPath
} from "../core/visualAssetContactSheet";
import {
  buildVisualRollbackFallbackTask,
  discoverVisualRollbackSnapshots,
  restoreVisualRollbackSnapshot,
  visualRollbackFallbackTaskRelativeDir,
  visualRollbackRelativeDir
} from "../core/visualRollback";
import {
  backgroundReadabilityStyleConfigRelativePath,
  buildBackgroundReadabilityStyleConfig,
  buildButtonStyleConfig,
  buildPanelStyleConfig,
  buildRewardToastStyleConfig,
  buildRollbackSnapshotName,
  buildSlotCardStyleConfig,
  farmSlotStyleConfigRelativePath,
  loadBackgroundReadabilityStyleConfigFromText,
  loadButtonStyleConfigFromText,
  loadPanelStyleConfigFromText,
  panelStyleConfigRelativePath,
  buttonStyleConfigRelativePath,
  rewardToastStyleConfigRelativePath,
  loadRewardToastStyleConfigFromText,
  loadSlotCardStyleConfigFromText
} from "../core/visualSurfaceConfig";
import { detectMonsterFarmAssetTargets, monsterFarmAssetTargets } from "../core/monsterFarmAssetTargets";
import { backgroundReadabilityPresets, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { buttonStylePresets, defaultButtonStyle } from "../presets/buttonStylePresets";
import { defaultPanelStyle, panelStylePresets } from "../presets/panelStylePresets";
import { pixelPolishKitPresets } from "../presets/pixelPolishKitPresets";
import { defaultRewardToastStyle, rewardToastPresets } from "../presets/rewardToastPresets";
import { defaultSlotCardStyle, slotCardPresets, slotCardStyleBounds } from "../presets/slotCardPresets";
import {
  applyVisualStylePresetToDraft,
  getVisualStylePresetByName,
  getVisualStylePresetsForSurface,
  visualPresetLibrary,
  visualStylePresetFamilies
} from "../presets/visualStylePresetLibrary";
import { InspectedFile } from "../types/audit";
import { visualRecipeSchemaVersion } from "../types/visualRecipe";

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
  "Clean Mobile",
  "Dark Arcade",
  "Soft Pastel",
  "Premium Idle UI"
]);

const requiredStylePresetFamilies = [
  "Cozy Wood",
  "Chunky Pixel",
  "Magic Glow",
  "Clean Mobile",
  "Dark Arcade",
  "Soft Pastel",
  "Premium Idle UI"
];
assert.deepStrictEqual(visualStylePresetFamilies.map((family) => family.name), requiredStylePresetFamilies);
assert.deepStrictEqual(
  [...getVisualStylePresetsForSurface("slot_card").map((preset) => preset.familyName)].sort(),
  [...requiredStylePresetFamilies].sort()
);
assert.strictEqual(visualPresetLibrary.presets.length, requiredStylePresetFamilies.length);
for (const familyName of requiredStylePresetFamilies) {
  const preset = getVisualStylePresetsForSurface("slot_card").find((candidate) => candidate.familyName === familyName);
  assert.ok(preset, `missing slot_card preset for ${familyName}`);
  assert.strictEqual(preset.supportedSurfaces.some((support) => support.surfaceType === "slot_card"), true);
  assert.strictEqual(typeof preset.description, "string");
  assert.ok(preset.description.length > 0);
  const stylePatch = preset.stylePatch as typeof defaultSlotCardStyle;
  for (const key of Object.keys(defaultSlotCardStyle) as Array<keyof typeof defaultSlotCardStyle>) {
    assert.ok(key in stylePatch, `${familyName} missing ${key}`);
    const value = stylePatch[key];
    if (key === "fillColor" || key === "borderColor") {
      assert.strictEqual(typeof value, "string");
      assert.match(String(value), /^#[0-9a-f]{6}$/i);
    } else {
      const bound = slotCardStyleBounds[key];
      assert.strictEqual(typeof value, "number");
      assert.ok(Number(value) >= bound.min, `${familyName} ${key} below min`);
      assert.ok(Number(value) <= bound.max, `${familyName} ${key} above max`);
    }
  }
}
assert.strictEqual(getVisualStylePresetByName("Cozy Wood", "slot_card")?.displayName, "Cozy Wood");
assert.strictEqual(getVisualStylePresetByName("Magic Glow", "slot_card")?.displayName, "Magic Glow");
assert.strictEqual(getVisualStylePresetByName("Chunky Pixel", "slot_card")?.displayName, "Chunky Pixel");
assert.strictEqual(getVisualStylePresetByName("Clean Mobile", "slot_card")?.displayName, "Clean Mobile");
const draftBeforePreset = { ...defaultSlotCardStyle, slotWidth: 72 };
const appliedBeforePreset = { ...defaultSlotCardStyle, fillColor: "#111111" };
const presetDraftApply = applyVisualStylePresetToDraft({
  surfaceType: "slot_card",
  draftStyle: draftBeforePreset,
  presetName: "Dark Arcade"
});
assert.strictEqual(presetDraftApply.applied, true);
assert.strictEqual(presetDraftApply.draftStyle.slotWidth, (getVisualStylePresetByName("Dark Arcade", "slot_card")?.stylePatch as typeof defaultSlotCardStyle | undefined)?.slotWidth);
assert.strictEqual(draftBeforePreset.slotWidth, 72);
assert.strictEqual(appliedBeforePreset.fillColor, "#111111");
const presetPreviewRequest = buildVisualPreviewRenderRequest({
  surfaceType: "slot_card",
  adapterId: "idle_monster_farm.farm_slots",
  currentStyle: appliedBeforePreset,
  draftStyle: presetDraftApply.draftStyle,
  appliedStyleExists: true
});
assert.strictEqual(presetPreviewRequest.comparison.beforeStyle, appliedBeforePreset);
assert.strictEqual(presetPreviewRequest.comparison.afterStyle, presetDraftApply.draftStyle);
assert.deepStrictEqual(getVisualStylePresetsForSurface("background_readability"), []);
assert.deepStrictEqual(getVisualStylePresetsForSurface("asset_replacement"), []);
const unsupportedPresetApply = applyVisualStylePresetToDraft({
  surfaceType: "panel",
  draftStyle: { fillColor: "#000000" },
  presetName: "Dark Arcade"
});
assert.strictEqual(unsupportedPresetApply.applied, false);
assert.deepStrictEqual(unsupportedPresetApply.draftStyle, { fillColor: "#000000" });

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

assert.strictEqual(normalizeVisualScopePath(".\\src\\config\\farmSlotStyle.ts"), "src/config/farmSlotStyle.ts");
const visualScopeSafe = checkVisualScopeGuard({
  operationType: "visual_config_write",
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  candidatePaths: [
    ".game-polish-lab/styles/farm-slot-style.json",
    ".game-polish-lab/visual-recipes/slot-card.json",
    ".game-polish-lab/assets/asset-contracts.json",
    "src/config/farmSlotStyle.ts"
  ]
});
assert.strictEqual(visualScopeSafe.recommendedAction, "allow");
assert.strictEqual(visualScopeSafe.counts.safe, 4);
assert.strictEqual(visualScopeSafe.counts.total, 4);
assert.ok(visualScopeSafe.summaryMessage.includes("4 safe"));

const visualScopeForbidden = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  targetId: "farm_slots",
  candidatePaths: [
    "src/systems/saveSystem.ts",
    "src/data/economy.ts",
    "src/systems/progressionSystem.ts",
    "src/systems/monsterMergeSystem.ts",
    "src/state/hatchState.ts",
    "src/data/quests.ts",
    "src/services/rewardedAdService.ts",
    "src/data/levels.ts"
  ]
});
assert.strictEqual(visualScopeForbidden.recommendedAction, "block");
assert.strictEqual(visualScopeForbidden.counts.forbidden, 8);
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "save_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "economy_or_balance_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "progression_or_unlock_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "merge_rule_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "hatch_rule_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "quest_reward_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "ad_or_sdk_file"));
assert.ok(visualScopeForbidden.violations.some((violation) => violation.reasonCode === "level_data_file"));
assert.ok(renderVisualScopeGuardMessage(visualScopeForbidden).includes("block"));

const visualScopeSuspicious = checkVisualScopeGuard({
  operationType: "fallback_task_generation",
  adapterId: "generic_phaser",
  surfaceType: "button",
  candidatePaths: [
    "src/scenes/MenuScene.ts",
    "src/ui/ButtonView.ts",
    "src/scenes/PreloadScene.ts",
    "src/loader/AssetLoader.ts"
  ]
});
assert.strictEqual(visualScopeSuspicious.recommendedAction, "warn");
assert.strictEqual(visualScopeSuspicious.counts.suspicious, 4);
assert.ok(visualScopeGuardWarnings(visualScopeSuspicious).some((warning) => warning.includes("scene_file")));

const visualScopeUnknown = checkVisualScopeGuard({
  operationType: "direct_apply",
  candidatePaths: ["tools/custom-script.txt"]
});
assert.strictEqual(visualScopeUnknown.recommendedAction, "warn");
assert.strictEqual(visualScopeUnknown.counts.unknown, 1);

const visualScopeDirectPreflight = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "generic_phaser",
  surfaceType: "button",
  candidatePaths: ["src/data/economy.ts"]
});
assert.strictEqual(visualScopeDirectPreflight.recommendedAction, "block");

const visualScopeFallbackPreflight = checkVisualScopeGuard({
  operationType: "fallback_task_generation",
  adapterId: "generic_phaser",
  surfaceType: "button",
  candidatePaths: ["src/systems/saveSystem.ts"]
});
assert.strictEqual(visualScopeFallbackPreflight.recommendedAction, "block");

const visualRollbackScopeSafe = checkVisualScopeGuard({
  operationType: "rollback_restore",
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  candidatePaths: [farmSlotStyleConfigRelativePath]
});
assert.strictEqual(visualRollbackScopeSafe.recommendedAction, "allow");

const visualRollbackScopeForbidden = checkVisualScopeGuard({
  operationType: "rollback_restore",
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  candidatePaths: ["src/systems/saveSystem.ts", "src/data/economy.ts"]
});
assert.strictEqual(visualRollbackScopeForbidden.recommendedAction, "block");
assert.strictEqual(visualRollbackScopeForbidden.counts.forbidden, 2);

const visualRollbackFallbackScope = checkVisualScopeGuard({
  operationType: "rollback_fallback_task_generation",
  adapterId: "generic_phaser",
  surfaceType: "button",
  candidatePaths: ["src/scenes/MenuScene.ts"]
});
assert.strictEqual(visualRollbackFallbackScope.recommendedAction, "warn");

const contactSheetReadScope = checkVisualScopeGuard({
  operationType: "asset_contact_sheet_read",
  adapterId: "idle_monster_farm.assets",
  surfaceType: "asset_replacement",
  candidatePaths: ["src/data/economy.ts", "src/assets/monsters/sprout.png"]
});
assert.strictEqual(contactSheetReadScope.recommendedAction, "warn");
assert.strictEqual(contactSheetReadScope.counts.forbidden, 0);
assert.strictEqual(contactSheetReadScope.counts.safe, 1);
assert.ok(contactSheetReadScope.violations.some((violation) => violation.reasonCode === "read_only_economy_or_balance_file"));
assert.ok(visualScopeGuardRulesSummary().some((line) => line.includes("forbidden")));

const missingRollbackWorkspace = makeTempWorkspace("missing-rollback");
try {
  const missingRollback = discoverVisualRollbackSnapshots(missingRollbackWorkspace);
  assert.deepStrictEqual(missingRollback.snapshots, []);
  assert.deepStrictEqual(missingRollback.warnings, []);
} finally {
  cleanupTempWorkspace(missingRollbackWorkspace);
}

const rollbackWorkspace = makeTempWorkspace("rollback-history");
try {
  writeWorkspaceFile(rollbackWorkspace, `${visualRollbackRelativeDir}/bad.rollback.json`, "{ nope");
  writeWorkspaceFile(rollbackWorkspace, `${visualRollbackRelativeDir}/2026-06-25T01-02-03-004Z-panel-style.json`, "{\"old\":true}");
  writeWorkspaceFile(rollbackWorkspace, `${visualRollbackRelativeDir}/2026-06-26T01-02-03-004Z-farm-slot-style.json`, "{\"new\":true}");
  writeWorkspaceFile(rollbackWorkspace, `${visualRollbackRelativeDir}/loose-unknown.txt`, "legacy");
  const discovered = discoverVisualRollbackSnapshots(rollbackWorkspace);
  assert.ok(discovered.warnings.some((warning) => warning.includes("malformed rollback metadata")));
  assert.strictEqual(discovered.snapshots[0].createdAt, "2026-06-26T01:02:03.004Z");
  assert.strictEqual(discovered.snapshots[0].files[0].originalPath, farmSlotStyleConfigRelativePath);
  assert.strictEqual(discovered.snapshots[0].files[0].fileKind, "style_config");
  assert.strictEqual(discovered.snapshots[0].files[0].scopeClassification.classification, "safe");
  assert.strictEqual(discovered.snapshots[0].files[0].restoreEligible, true);
  assert.strictEqual(discovered.snapshots[1].createdAt, "2026-06-25T01:02:03.004Z");
  assert.strictEqual(discovered.snapshots[2].sourceOperation, "legacy_raw_snapshot");
  assert.strictEqual(discovered.snapshots[2].files[0].restoreEligible, false);
} finally {
  cleanupTempWorkspace(rollbackWorkspace);
}

const restoreWorkspace = makeTempWorkspace("rollback-restore");
try {
  writeWorkspaceFile(restoreWorkspace, `${visualRollbackRelativeDir}/safe-style.json`, "{\"preset\":\"rollback\"}");
  writeWorkspaceFile(restoreWorkspace, farmSlotStyleConfigRelativePath, "{\"preset\":\"current\"}");
  writeWorkspaceFile(restoreWorkspace, `${visualRollbackRelativeDir}/safe-style.rollback.json`, JSON.stringify({
    id: "safe-style",
    createdAt: "2026-06-26T02:00:00.000Z",
    sourceOperation: "visual_config_write",
    adapterId: "idle_monster_farm",
    surfaceType: "slot_card",
    targetId: "farm_slots",
    files: [{
      originalPath: farmSlotStyleConfigRelativePath,
      snapshotPath: `${visualRollbackRelativeDir}/safe-style.json`,
      fileKind: "style_config"
    }]
  }));
  const result = restoreVisualRollbackSnapshot(restoreWorkspace, { snapshotId: "safe-style", now: new Date("2026-06-26T03:00:00.000Z") });
  assert.strictEqual(result.status, "restored");
  assert.strictEqual(result.restoredFiles.length, 1);
  assert.ok(result.restoredFiles[0].preRestoreBackupPath?.startsWith(`${visualRollbackRelativeDir}/2026-06-26T03-00-00-000Z-pre-restore-`));
  assert.strictEqual(readWorkspaceFile(restoreWorkspace, farmSlotStyleConfigRelativePath), "{\"preset\":\"rollback\"}");
  assert.ok(fs.existsSync(path.join(restoreWorkspace, ".game-polish-lab", "rollback", "2026-06-26T03-00-00-000Z-pre-restore-farm-slot-style.json")));
} finally {
  cleanupTempWorkspace(restoreWorkspace);
}

const createParentWorkspace = makeTempWorkspace("rollback-parent");
try {
  writeWorkspaceFile(createParentWorkspace, `${visualRollbackRelativeDir}/style.json`, "{}");
  writeWorkspaceFile(createParentWorkspace, `${visualRollbackRelativeDir}/style.rollback.json`, JSON.stringify({
    id: "create-parent",
    createdAt: "2026-06-26T02:00:00.000Z",
    files: [{
      originalPath: farmSlotStyleConfigRelativePath,
      snapshotPath: `${visualRollbackRelativeDir}/style.json`,
      fileKind: "style_config"
    }]
  }));
  const result = restoreVisualRollbackSnapshot(createParentWorkspace, { snapshotId: "create-parent", now: new Date("2026-06-26T03:00:00.000Z") });
  assert.strictEqual(result.status, "restored");
  assert.strictEqual(readWorkspaceFile(createParentWorkspace, farmSlotStyleConfigRelativePath), "{}");
} finally {
  cleanupTempWorkspace(createParentWorkspace);
}

const blockedRollbackWorkspace = makeTempWorkspace("rollback-blocked");
try {
  writeWorkspaceFile(blockedRollbackWorkspace, `${visualRollbackRelativeDir}/save.ts`, "unsafe");
  writeWorkspaceFile(blockedRollbackWorkspace, `${visualRollbackRelativeDir}/save.rollback.json`, JSON.stringify({
    id: "forbidden-save",
    createdAt: "2026-06-26T02:00:00.000Z",
    files: [{
      originalPath: "src/systems/saveSystem.ts",
      snapshotPath: `${visualRollbackRelativeDir}/save.ts`,
      fileKind: "unknown"
    }]
  }));
  const discovered = discoverVisualRollbackSnapshots(blockedRollbackWorkspace).snapshots[0];
  assert.strictEqual(discovered.files[0].scopeClassification.classification, "forbidden");
  assert.strictEqual(discovered.files[0].restoreEligible, false);
  const result = restoreVisualRollbackSnapshot(blockedRollbackWorkspace, { snapshotId: "forbidden-save", now: new Date("2026-06-26T03:00:00.000Z") });
  assert.strictEqual(result.status, "blocked");
  assert.strictEqual(result.blockedFiles.length, 1);
  assert.strictEqual(fs.existsSync(path.join(blockedRollbackWorkspace, "src", "systems", "saveSystem.ts")), false);
} finally {
  cleanupTempWorkspace(blockedRollbackWorkspace);
}

const fallbackRollbackWorkspace = makeTempWorkspace("rollback-fallback");
try {
  writeWorkspaceFile(fallbackRollbackWorkspace, `${visualRollbackRelativeDir}/farm-scene.ts`, "visual source snapshot");
  writeWorkspaceFile(fallbackRollbackWorkspace, `${visualRollbackRelativeDir}/farm-style.ts`, "style bridge snapshot");
  writeWorkspaceFile(fallbackRollbackWorkspace, `${visualRollbackRelativeDir}/source.rollback.json`, JSON.stringify({
    id: "source-fallback",
    createdAt: "2026-06-26T02:00:00.000Z",
    adapterId: "idle_monster_farm",
    surfaceType: "slot_card",
    files: [
      {
        originalPath: "src/scenes/FarmScene.ts",
        snapshotPath: `${visualRollbackRelativeDir}/farm-scene.ts`,
        fileKind: "unknown"
      },
      {
        originalPath: "src/config/farmSlotStyle.ts",
        snapshotPath: `${visualRollbackRelativeDir}/farm-style.ts`,
        fileKind: "generated_style_module"
      }
    ]
  }));
  const discovered = discoverVisualRollbackSnapshots(fallbackRollbackWorkspace).snapshots[0];
  assert.strictEqual(discovered.files[0].restoreEligible, false);
  assert.strictEqual(discovered.files[1].restoreEligible, false);
  const task = buildVisualRollbackFallbackTask(discovered, discovered.files, new Date("2026-06-26T03:00:00.000Z"));
  assert.strictEqual(task.scope, "visual_rollback");
  assert.ok(task.blockedReasons.some((reason) => reason.includes("FarmScene")));
  assert.ok(task.instructions.some((instruction) => instruction.includes("Do not edit save, economy, progression")));
  const result = restoreVisualRollbackSnapshot(fallbackRollbackWorkspace, { snapshotId: "source-fallback", now: new Date("2026-06-26T03:00:00.000Z") });
  assert.strictEqual(result.status, "fallback_task");
  assert.ok(result.fallbackTaskPath?.startsWith(`${visualRollbackFallbackTaskRelativeDir}/2026-06-26T03-00-00-000Z-rollback-source-fallback`));
  assert.strictEqual(fs.existsSync(path.join(fallbackRollbackWorkspace, "src", "scenes", "FarmScene.ts")), false);
  assert.strictEqual(fs.existsSync(path.join(fallbackRollbackWorkspace, "src", "config", "farmSlotStyle.ts")), false);
} finally {
  cleanupTempWorkspace(fallbackRollbackWorkspace);
}

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
  ".game-polish-lab/assets/asset-contracts.json",
  "src/assets/monsters/monster.png",
  "src/config/monsterFarmAssetManifest.ts",
  "src/systems/saveSystem.ts",
  "src/data/levels.ts",
  "src/gameplay/rules.ts"
], { throughAdapter: true });
assert.ok(assetScope.allowedFiles.includes(".game-polish-lab/assets/imported.png"));
assert.ok(assetScope.allowedFiles.includes(".game-polish-lab/assets/asset-contracts.json"));
assert.ok(assetScope.allowedFiles.includes("src/assets/monsters/monster.png"));
assert.ok(assetScope.allowedFiles.includes("src/config/monsterFarmAssetManifest.ts"));
assert.ok(assetScope.forbiddenFiles.includes("src/systems/saveSystem.ts"));
assert.ok(assetScope.forbiddenFiles.includes("src/data/levels.ts"));
assert.ok(assetScope.forbiddenFiles.includes("src/gameplay/rules.ts"));

assert.strictEqual(
  buildAssetRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), "src/assets/monsters/monster.png", "monster_art"),
  "2026-06-24T10-11-12-123Z-monster_art-monster.png"
);

assert.strictEqual(assetContractRelativePath, ".game-polish-lab/assets/asset-contracts.json");
assert.strictEqual(assetContractSchemaVersion, 1);
assert.ok(resolveAssetContractFilePath("project-root").replace(/\\/g, "/").endsWith(".game-polish-lab/assets/asset-contracts.json"));
const missingAssetContractLoad = loadVisualAssetContractFileFromText(undefined, "2026-06-26T00:00:00.000Z");
assert.strictEqual(missingAssetContractLoad.status, "missing");
assert.strictEqual(missingAssetContractLoad.file.schemaVersion, 1);
assert.deepStrictEqual(missingAssetContractLoad.file.contracts, []);
const malformedAssetContractLoad = loadVisualAssetContractFileFromText("{ nope", "2026-06-26T00:00:00.000Z");
assert.strictEqual(malformedAssetContractLoad.status, "malformed");
assert.ok(malformedAssetContractLoad.warnings.some((warning) => warning.includes("invalid JSON")));
const generatedAssetContracts = buildMonsterFarmAssetContractFile("2026-06-26T00:00:00.000Z");
assert.strictEqual(generatedAssetContracts.schemaVersion, 1);
assert.strictEqual(generatedAssetContracts.contracts.length, 1);
assert.strictEqual(generatedAssetContracts.contracts[0].adapterId, "idle_monster_farm.assets");
assert.strictEqual(generatedAssetContracts.contracts[0].targetSurfaceType, "asset_replacement");
assert.ok(generatedAssetContracts.contracts[0].slots.some((slot) => slot.assetSlotId === "monster_art" && slot.validation.status === "unknown"));
assert.ok(generatedAssetContracts.contracts[0].slots.every((slot) => !slot.expectedPath));
const generatedAssetContractCounts = summarizeVisualAssetContractStatuses(generatedAssetContracts);
assert.strictEqual(generatedAssetContractCounts.unknown, generatedAssetContractCounts.total);
assert.strictEqual(generatedAssetContractCounts.total, monsterFarmTargets.length);
assert.deepStrictEqual(assetContractWritePaths(), [".game-polish-lab/assets/asset-contracts.json"]);
const formattedAssetContracts = formatVisualAssetContractFile(generatedAssetContracts);
assert.ok(formattedAssetContracts.endsWith("\n"));
assert.ok(formattedAssetContracts.includes('"schemaVersion": 1'));
assert.ok(formattedAssetContracts.includes('"assetSlotId": "background_image"'));

const tempAssetContractRoot = fs.mkdtempSync(path.join(process.cwd(), ".tmp-asset-contracts-"));
try {
  fs.mkdirSync(path.join(tempAssetContractRoot, "src", "assets", "monsters"), { recursive: true });
  fs.writeFileSync(path.join(tempAssetContractRoot, "src", "assets", "monsters", "monster.png"), opaquePng);
  const validSlot = validateVisualAssetSlotContractSync(tempAssetContractRoot, {
    assetSlotId: "monster_art",
    expectedPath: "src/assets/monsters/monster.png",
    expectedWidth: 4,
    expectedHeight: 4,
    expectedFormat: "PNG",
    transparencyRequirement: "required",
    visibleBoundsRequired: true,
    loaderHint: "manifest",
    validation: { status: "unknown", warnings: [], errors: [] }
  }, "2026-06-26T00:00:00.000Z");
  assert.strictEqual(validSlot.validation.status, "valid");
  const missingSlot = validateVisualAssetSlotContractSync(tempAssetContractRoot, {
    ...validSlot,
    expectedPath: "src/assets/monsters/missing.png",
    validation: { status: "unknown", warnings: [], errors: [] }
  }, "2026-06-26T00:00:00.000Z");
  assert.strictEqual(missingSlot.validation.status, "missing");
  const unsafeSlot = validateVisualAssetSlotContractSync(tempAssetContractRoot, {
    ...validSlot,
    expectedPath: "../outside.png",
    validation: { status: "unknown", warnings: [], errors: [] }
  }, "2026-06-26T00:00:00.000Z");
  assert.strictEqual(unsafeSlot.validation.status, "invalid");
  assert.ok(unsafeSlot.validation.errors.some((error) => error.includes("Unsafe")));
  const globOnlySlot = validateVisualAssetSlotContractSync(tempAssetContractRoot, generatedAssetContracts.contracts[0].slots[0], "2026-06-26T00:00:00.000Z");
  assert.strictEqual(globOnlySlot.validation.status, "unknown");
  assert.ok(globOnlySlot.validation.warnings.some((warning) => warning.includes("not concrete")));
  const writePath = writeVisualAssetContractFileSync(tempAssetContractRoot, generatedAssetContracts);
  assert.strictEqual(path.relative(tempAssetContractRoot, writePath).replace(/\\/g, "/"), ".game-polish-lab/assets/asset-contracts.json");
  const written = fs.readFileSync(writePath, "utf8");
  assert.strictEqual(written, formatVisualAssetContractFile(generatedAssetContracts));
} finally {
  fs.rmSync(tempAssetContractRoot, { recursive: true, force: true });
}

assert.strictEqual(buildVisualAssetContactSheetFromText("D:/sample", undefined, new Date("2026-06-26T01:00:00.000Z")).state, "empty");
const malformedContactSheet = buildVisualAssetContactSheetFromText("D:/sample", "{ nope", new Date("2026-06-26T01:00:00.000Z"));
assert.strictEqual(malformedContactSheet.state, "error");
assert.strictEqual(malformedContactSheet.sourceStatus, "malformed");
assert.ok(malformedContactSheet.warnings.some((warning) => warning.includes("invalid JSON")));

const tempContactSheetRoot = fs.mkdtempSync(path.join(process.cwd(), ".tmp-contact-sheet-"));
try {
  fs.mkdirSync(path.join(tempContactSheetRoot, "src", "assets", "monsters"), { recursive: true });
  fs.mkdirSync(path.join(tempContactSheetRoot, "src", "assets", "rewards"), { recursive: true });
  fs.writeFileSync(path.join(tempContactSheetRoot, "src", "assets", "monsters", "sprout.png"), opaquePng);
  const contactSheetContract = {
    schemaVersion: 1 as const,
    generatedBy: "game-polish-lab" as const,
    updatedAt: "2026-06-26T01:00:00.000Z",
    contracts: [
      {
        contractId: "z-last",
        adapterId: "generic_phaser.assets",
        targetSurfaceType: "background_readability" as const,
        targetId: "background",
        targetLabel: "Background Assets",
        slots: [
          {
            assetSlotId: "backdrop",
            expectedGlob: "src/assets/backgrounds/*.{png,webp}",
            expectedWidth: 960,
            expectedHeight: 540,
            expectedFormats: ["PNG" as const, "WebP" as const],
            transparencyRequirement: "optional" as const,
            loaderHint: "unknown" as const,
            validation: { status: "unknown" as const, warnings: [], errors: [] }
          }
        ]
      },
      {
        contractId: "a-first",
        adapterId: "idle_monster_farm.assets",
        targetSurfaceType: "asset_replacement" as const,
        targetId: "assets",
        targetLabel: "Monster Farm Assets",
        slots: [
          {
            assetSlotId: "slot_frame",
            label: "Slot Frame",
            expectedPath: "src/assets/monsters/missing-frame.png",
            expectedWidth: 4,
            expectedHeight: 4,
            expectedFormat: "PNG" as const,
            transparencyRequirement: "required" as const,
            visibleBoundsRequired: true,
            loaderHint: "manifest" as const,
            validation: { status: "missing" as const, warnings: ["frame warning"], errors: ["frame missing"] }
          },
          {
            assetSlotId: "monster_art",
            label: "Monster Art",
            expectedPath: "src/assets/monsters/sprout.png",
            expectedWidth: 4,
            expectedHeight: 4,
            expectedFormat: "PNG" as const,
            transparencyRequirement: "required" as const,
            visibleBoundsRequired: true,
            loaderHint: "manifest" as const,
            validation: { status: "valid" as const, warnings: ["readability note"], errors: [] }
          },
          {
            assetSlotId: "reward_icon",
            label: "Reward Icon",
            expectedPath: "src/assets/rewards/coin.png",
            expectedWidth: 64,
            expectedHeight: 64,
            expectedFormats: ["PNG" as const, "WebP" as const],
            transparencyRequirement: "required" as const,
            visibleBoundsRequired: true,
            loaderHint: "manual_required" as const,
            validation: { status: "missing" as const, warnings: [], errors: ["reward missing"] }
          }
        ]
      }
    ]
  };
  const contactSheet = buildVisualAssetContactSheetFromContractFile(tempContactSheetRoot, contactSheetContract, {
    generatedAt: new Date("2026-06-26T01:00:00.000Z"),
    sourceStatus: "valid",
    sourceContractPath: ".game-polish-lab/assets/asset-contracts.json"
  });
  assert.strictEqual(contactSheet.schemaVersion, "visual-asset-contact-sheet/v1");
  assert.strictEqual(contactSheet.state, "ready");
  assert.deepStrictEqual(contactSheet.groups.map((group) => group.adapterId), ["generic_phaser.assets", "idle_monster_farm.assets"]);
  assert.deepStrictEqual(contactSheet.groups.map((group) => group.contractId), ["z-last", "a-first"]);
  assert.deepStrictEqual(contactSheet.groups[1].items.map((item) => item.assetSlotId), ["monster_art", "reward_icon", "slot_frame"]);
  const monsterContactItem = contactSheet.groups[1].items.find((item) => item.assetSlotId === "monster_art")!;
  assert.strictEqual(monsterContactItem.assetExists, true);
  assert.strictEqual(monsterContactItem.actualWidth, 4);
  assert.strictEqual(monsterContactItem.actualHeight, 4);
  assert.strictEqual(monsterContactItem.format, "PNG");
  assert.strictEqual(monsterContactItem.transparencyStatus, "has_alpha");
  assert.ok(monsterContactItem.warnings.includes("readability note"));
  assert.ok(monsterContactItem.mockupContexts.some((context) => context.type === "raw_asset"));
  assert.ok(monsterContactItem.mockupContexts.some((context) => context.type === "slot_card"));
  const missingFrameContactItem = contactSheet.groups[1].items.find((item) => item.assetSlotId === "slot_frame")!;
  assert.strictEqual(missingFrameContactItem.assetExists, false);
  assert.strictEqual(missingFrameContactItem.validationStatus, "missing");
  assert.ok(missingFrameContactItem.warnings.includes("frame warning"));
  assert.ok(missingFrameContactItem.errors.includes("frame missing"));
  assert.ok(missingFrameContactItem.mockupContexts.some((context) => context.type === "slot_card"));
  const rewardContactItem = contactSheet.groups[1].items.find((item) => item.assetSlotId === "reward_icon")!;
  assert.ok(rewardContactItem.mockupContexts.some((context) => context.type === "reward_icon"));
  const backgroundContactItem = contactSheet.groups[0].items[0];
  assert.deepStrictEqual(backgroundContactItem.mockupContexts.map((context) => context.type), ["raw_asset"]);
  assert.strictEqual(resolveContactSheetAssetPreviewPath(tempContactSheetRoot, "src/assets/monsters/sprout.png")?.endsWith(path.join("src", "assets", "monsters", "sprout.png")), true);
  assert.strictEqual(resolveContactSheetAssetPreviewPath(tempContactSheetRoot, "../outside.png"), undefined);
} finally {
  fs.rmSync(tempContactSheetRoot, { recursive: true, force: true });
}

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

assert.deepStrictEqual(rewardToastPresets.map((preset) => preset.name), [
  "Soft Pop",
  "Juicy Bounce",
  "Magic Sparkle",
  "Clean Reward"
]);
assert.strictEqual(defaultRewardToastStyle.durationMs, 1200);
assert.strictEqual(defaultRewardToastStyle.toastFillColor, "#2e3a2f");

const validRewardToastConfig = buildRewardToastStyleConfig("Soft Pop", rewardToastPresets[0].values);
const validRewardToastLoad = loadRewardToastStyleConfigFromText(JSON.stringify(validRewardToastConfig));
assert.strictEqual(validRewardToastLoad.status, "valid");
assert.strictEqual(validRewardToastLoad.existingConfigDetected, true);
assert.strictEqual(validRewardToastLoad.initializedFromExistingConfig, true);
assert.strictEqual(validRewardToastLoad.config.surfaceType, "reward_toast");

const missingRewardToastLoad = loadRewardToastStyleConfigFromText(undefined);
assert.strictEqual(missingRewardToastLoad.status, "missing");
assert.strictEqual(missingRewardToastLoad.existingConfigDetected, false);
assert.strictEqual(missingRewardToastLoad.initializedFromExistingConfig, false);
assert.strictEqual(missingRewardToastLoad.config.values.durationMs, rewardToastPresets[0].values.durationMs);

const invalidRewardToastJsonLoad = loadRewardToastStyleConfigFromText("{ nope");
assert.strictEqual(invalidRewardToastJsonLoad.status, "invalid_json");
assert.strictEqual(invalidRewardToastJsonLoad.existingConfigDetected, true);
assert.strictEqual(invalidRewardToastJsonLoad.initializedFromExistingConfig, false);
assert.ok(invalidRewardToastJsonLoad.warning?.includes("invalid JSON"));

const invalidRewardToastSchemaLoad = loadRewardToastStyleConfigFromText(JSON.stringify({ schemaVersion: 99 }));
assert.strictEqual(invalidRewardToastSchemaLoad.status, "schema_invalid");
assert.strictEqual(invalidRewardToastSchemaLoad.initializedFromExistingConfig, false);
assert.ok(invalidRewardToastSchemaLoad.warning?.includes("unsupported schema"));

for (const preset of rewardToastPresets) {
  const loadedPreset = loadRewardToastStyleConfigFromText(JSON.stringify(buildRewardToastStyleConfig(preset.name, preset.values)));
  assert.strictEqual(loadedPreset.status, "valid");
  assert.strictEqual(typeof loadedPreset.config.values.sparkleCount, "number");
  assert.strictEqual(typeof loadedPreset.config.values.glowStrength, "number");
}

const rewardToastScope = checkV05VisualScope([
  rewardToastStyleConfigRelativePath,
  ".game-polish-lab/rollback/2026-06-24-reward-toast-style.json",
  "src/config/rewardToastStyle.ts",
  "src/ui/ToastView.ts",
  "src/data/rewardAmounts.ts",
  "src/systems/saveSystem.ts",
  "src/data/economy.ts",
  "src/systems/progressionSystem.ts",
  "src/data/quests.ts",
  "src/services/rewardedAdService.ts",
  "src/state/inventoryState.ts",
  "src/gameplay/rules.ts"
], { throughAdapter: true });
assert.ok(rewardToastScope.allowedFiles.includes(rewardToastStyleConfigRelativePath));
assert.ok(rewardToastScope.allowedFiles.includes("src/config/rewardToastStyle.ts"));
assert.ok(rewardToastScope.adapterOnlyFiles.includes("src/ui/ToastView.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/data/rewardAmounts.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/systems/saveSystem.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/data/economy.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/systems/progressionSystem.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/data/quests.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/services/rewardedAdService.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/state/inventoryState.ts"));
assert.ok(rewardToastScope.forbiddenFiles.includes("src/gameplay/rules.ts"));

const disconnectedRewardToastFiles = [
  {
    relativePath: "src/ui/ToastView.ts",
    text: "export class ToastView { showReward(label: string) { this.add.text(0, 0, label); this.tweens.add({ y: -30, alpha: 0 }); } }"
  },
  {
    relativePath: "src/scenes/FarmScene.ts",
    text: "toastView.showReward('+25 Coins');"
  },
  {
    relativePath: "src/config/rewardToastStyle.ts",
    text: "export const REWARD_TOAST_STYLE = {};"
  }
];
const rewardToastDetection = analyzeRewardToastDetection(disconnectedRewardToastFiles);
assert.strictEqual(rewardToastDetection.target, "idle_monster_farm.reward_toast");
assert.strictEqual(rewardToastDetection.detected, true);
assert.strictEqual(rewardToastDetection.confidence, "high");
assert.ok(rewardToastDetection.ownerFiles.includes("src/ui/ToastView.ts"));
assert.ok(rewardToastDetection.targetFeedback.includes("reward_toast"));
assert.ok(rewardToastDetection.targetFeedback.includes("coin_reward_feedback"));
assert.ok(rewardToastDetection.targetFeedback.includes("floating_reward_text"));
assert.ok(rewardToastDetection.reasons.some((reason) => reason.includes("toast/reward feedback")));
assert.ok(rewardToastDetection.warnings.some((warning) => warning.includes("animation")));

const disconnectedRewardToast = analyzeRewardToastStyleConnection(disconnectedRewardToastFiles);
assert.strictEqual(disconnectedRewardToast.connected, false);
assert.strictEqual(disconnectedRewardToast.connectionType, "none");
assert.ok(disconnectedRewardToast.missingPieces.some((piece) => piece.includes("Reward feedback owner/rendering files")));

const connectedRewardToastFiles = [
  {
    relativePath: "src/ui/ToastView.ts",
    text: "import { REWARD_TOAST_STYLE } from '../config/rewardToastStyle'; export class ToastView { showReward() { return REWARD_TOAST_STYLE.durationMs; } }"
  },
  {
    relativePath: "src/config/rewardToastStyle.ts",
    text: "export const REWARD_TOAST_STYLE = { durationMs: 1200 };"
  }
];
const connectedRewardToastDetection = analyzeRewardToastDetection(connectedRewardToastFiles);
assert.strictEqual(connectedRewardToastDetection.detected, true);
assert.strictEqual(connectedRewardToastDetection.confidence, "high");
const connectedRewardToast = analyzeRewardToastStyleConnection(connectedRewardToastFiles);
assert.strictEqual(connectedRewardToast.connected, true);
assert.strictEqual(connectedRewardToast.connectionType, "style_module");
assert.deepStrictEqual(connectedRewardToast.connectedFiles, ["src/ui/ToastView.ts"]);
const connectedRewardToastAfterRepeatedApply = analyzeRewardToastStyleConnection(connectedRewardToastFiles);
assert.strictEqual(connectedRewardToastAfterRepeatedApply.connected, true);
assert.strictEqual(connectedRewardToastAfterRepeatedApply.connectionType, "style_module");

assert.strictEqual(
  buildRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), rewardToastStyleConfigRelativePath),
  "2026-06-24T10-11-12-123Z-reward-toast-style.json"
);

assert.deepStrictEqual(buttonStylePresets.map((preset) => preset.name), [
  "Clean Mobile Button",
  "Chunky Game Button",
  "Cozy Action Bar",
  "Magic Press"
]);
assert.strictEqual(defaultButtonStyle.width, 126);
assert.strictEqual(defaultButtonStyle.fillColor, "#2f4650");

const validButtonConfig = buildButtonStyleConfig("Clean Mobile Button", buttonStylePresets[0].values);
const validButtonLoad = loadButtonStyleConfigFromText(JSON.stringify(validButtonConfig));
assert.strictEqual(validButtonLoad.status, "valid");
assert.strictEqual(validButtonLoad.existingConfigDetected, true);
assert.strictEqual(validButtonLoad.initializedFromExistingConfig, true);
assert.strictEqual(validButtonLoad.config.surfaceType, "button");

const missingButtonLoad = loadButtonStyleConfigFromText(undefined);
assert.strictEqual(missingButtonLoad.status, "missing");
assert.strictEqual(missingButtonLoad.existingConfigDetected, false);
assert.strictEqual(missingButtonLoad.initializedFromExistingConfig, false);
assert.strictEqual(missingButtonLoad.config.values.width, buttonStylePresets[0].values.width);

const invalidButtonJsonLoad = loadButtonStyleConfigFromText("{ nope");
assert.strictEqual(invalidButtonJsonLoad.status, "invalid_json");
assert.strictEqual(invalidButtonJsonLoad.existingConfigDetected, true);
assert.strictEqual(invalidButtonJsonLoad.initializedFromExistingConfig, false);
assert.ok(invalidButtonJsonLoad.warning?.includes("invalid JSON"));

const invalidButtonSchemaLoad = loadButtonStyleConfigFromText(JSON.stringify({ schemaVersion: 99 }));
assert.strictEqual(invalidButtonSchemaLoad.status, "schema_invalid");
assert.strictEqual(invalidButtonSchemaLoad.initializedFromExistingConfig, false);
assert.ok(invalidButtonSchemaLoad.warning?.includes("unsupported schema"));

for (const preset of buttonStylePresets) {
  const loadedPreset = loadButtonStyleConfigFromText(JSON.stringify(buildButtonStyleConfig(preset.name, preset.values)));
  assert.strictEqual(loadedPreset.status, "valid");
  assert.strictEqual(typeof loadedPreset.config.values.activePressScale, "number");
  assert.strictEqual(typeof loadedPreset.config.values.hoverGlowStrength, "number");
}

const buttonScope = checkV05VisualScope([
  buttonStyleConfigRelativePath,
  ".game-polish-lab/rollback/2026-06-24-button-style.json",
  "src/config/buttonStyle.ts",
  "src/ui/GameplayActionBarView.ts",
  "src/ui/HatchPanelView.ts",
  "src/ui/UpgradePanelView.ts",
  "src/input/buttonActions.ts",
  "src/systems/saveSystem.ts",
  "src/data/economy.ts",
  "src/systems/progressionSystem.ts",
  "src/state/hatchState.ts",
  "src/systems/upgradeSystem.ts",
  "src/data/quests.ts",
  "src/services/rewardedAdService.ts",
  "src/state/inventoryState.ts",
  "src/gameplay/rules.ts"
], { throughAdapter: true });
assert.ok(buttonScope.allowedFiles.includes(buttonStyleConfigRelativePath));
assert.ok(buttonScope.allowedFiles.includes("src/config/buttonStyle.ts"));
assert.ok(buttonScope.adapterOnlyFiles.includes("src/ui/GameplayActionBarView.ts"));
assert.ok(buttonScope.adapterOnlyFiles.includes("src/ui/HatchPanelView.ts"));
assert.ok(buttonScope.adapterOnlyFiles.includes("src/ui/UpgradePanelView.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/input/buttonActions.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/systems/saveSystem.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/data/economy.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/systems/progressionSystem.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/state/hatchState.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/systems/upgradeSystem.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/data/quests.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/services/rewardedAdService.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/state/inventoryState.ts"));
assert.ok(buttonScope.forbiddenFiles.includes("src/gameplay/rules.ts"));

const disconnectedButtonFiles = [
  {
    relativePath: "src/ui/GameplayActionBarView.ts",
    text: "export class GameplayActionBarView { drawActionBarButton(label: string) { return label; } }"
  },
  {
    relativePath: "src/ui/HatchPanelView.ts",
    text: "export class HatchPanelView { drawHatchButton() { return 'hatch cooldown locked'; } }"
  },
  {
    relativePath: "src/ui/UpgradePanelView.ts",
    text: "export class UpgradePanelView { drawUpgradeButton() { return 'buy upgrade disabled'; } }"
  },
  {
    relativePath: "src/config/buttonStyle.ts",
    text: "export const BUTTON_STYLE = {};"
  }
];
const buttonDetection = analyzeButtonDetection(disconnectedButtonFiles);
assert.strictEqual(buttonDetection.target, "idle_monster_farm.buttons");
assert.strictEqual(buttonDetection.detected, true);
assert.strictEqual(buttonDetection.confidence, "high");
assert.ok(buttonDetection.ownerFiles.includes("src/ui/GameplayActionBarView.ts"));
assert.ok(buttonDetection.targetButtons.includes("action_bar_button"));
assert.ok(buttonDetection.targetButtons.includes("hatch_button"));
assert.ok(buttonDetection.targetButtons.includes("upgrade_button"));
assert.ok(buttonDetection.targetButtons.includes("disabled_locked_button"));
assert.ok(buttonDetection.reasons.some((reason) => reason.includes("action-bar button")));
assert.ok(buttonDetection.warnings.some((warning) => warning.includes("hatch logic")));
assert.ok(buttonDetection.warnings.some((warning) => warning.includes("upgrade logic")));

const disconnectedButton = analyzeButtonStyleConnection(disconnectedButtonFiles);
assert.strictEqual(disconnectedButton.connected, false);
assert.strictEqual(disconnectedButton.connectionType, "none");
assert.ok(disconnectedButton.missingPieces.some((piece) => piece.includes("Button/action-bar owner/rendering files")));

const connectedButtonFiles = [
  {
    relativePath: "src/ui/GameplayActionBarView.ts",
    text: "import { BUTTON_STYLE } from '../config/buttonStyle'; export class GameplayActionBarView { draw() { return BUTTON_STYLE.width; } }"
  },
  {
    relativePath: "src/config/buttonStyle.ts",
    text: "export const BUTTON_STYLE = { width: 126 };"
  }
];
const connectedButtonDetection = analyzeButtonDetection(connectedButtonFiles);
assert.strictEqual(connectedButtonDetection.detected, true);
assert.strictEqual(connectedButtonDetection.confidence, "high");
const connectedButton = analyzeButtonStyleConnection(connectedButtonFiles);
assert.strictEqual(connectedButton.connected, true);
assert.strictEqual(connectedButton.connectionType, "style_module");
assert.deepStrictEqual(connectedButton.connectedFiles, ["src/ui/GameplayActionBarView.ts"]);
const connectedButtonAfterRepeatedApply = analyzeButtonStyleConnection(connectedButtonFiles);
assert.strictEqual(connectedButtonAfterRepeatedApply.connected, true);
assert.strictEqual(connectedButtonAfterRepeatedApply.connectionType, "style_module");

assert.strictEqual(
  buildRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), buttonStyleConfigRelativePath),
  "2026-06-24T10-11-12-123Z-button-style.json"
);

const recipes = getVisualSurfaceRecipes();
assert.deepStrictEqual(visualSurfacePickerOrder, [
  "slot_card",
  "background_readability",
  "asset_replacement",
  "panel",
  "reward_toast",
  "button"
]);
assert.strictEqual(recipes.length, 5);
assert.ok(assetReplacementRecipeNote.includes("asset_replacement remains an asset replacement model"));
for (const recipe of recipes) {
  const validation = validateVisualSurfaceRecipe(recipe);
  assert.strictEqual(validation.ok, true, `${recipe.recipeId}: ${validation.errors.join("; ")}`);
  assert.strictEqual(recipe.schemaVersion, visualRecipeSchemaVersion);
  assert.ok(recipe.configPath.startsWith(".game-polish-lab/styles/"));
  assert.ok(recipe.generatedStyleModulePath?.startsWith("src/config/"));
  assert.strictEqual(recipe.adapterMappings.length, 2);
  const monsterFarmMapping = recipe.adapterMappings.find((mapping) => mapping.adapterId === "idle_monster_farm");
  const genericMapping = recipe.adapterMappings.find((mapping) => mapping.adapterId === "generic_phaser");
  assert.ok(monsterFarmMapping);
  assert.ok(genericMapping);
  assert.ok(monsterFarmMapping.targetLabel.includes("Monster Farm"));
  assert.ok(monsterFarmMapping.targetSurface.length > 0);
  assert.strictEqual(monsterFarmMapping.configPath, recipe.configPath);
  assert.strictEqual(monsterFarmMapping.generatedStyleModulePath, recipe.generatedStyleModulePath);
  assert.ok(genericMapping.configPath.startsWith(".game-polish-lab/styles/generic-"));
  assert.ok(genericMapping.generatedStyleModulePath?.startsWith("src/config/gamePolishLab/generic"));
  assert.strictEqual(genericMapping.setupSupported, false);
  assert.ok(genericMapping.manualTestChecklist.some((item) => item.includes("Generic Phaser")));
  assert.ok(recipe.fallbackTaskMetadata.userVisibleMessage.length > 0);
  assert.strictEqual(recipe.fallbackTaskMetadata.requiredConsent, true);
  assert.ok(recipe.fallbackTaskMetadata.exactScopeSummary.includes("gameplay"));
}

const firstRecipeToken = recipes[0].supportedStyleTokens[0];
assert.strictEqual(validateVisualStyleToken(firstRecipeToken).ok, true);
assert.strictEqual(validateVisualStyleToken({ ...firstRecipeToken, valueType: "bad" }).ok, false);
assert.strictEqual(validateVisualSurfaceRecipe({ ...recipes[0], schemaVersion: "visual-recipe/v999" }).ok, false);
assert.strictEqual(visualRecipeRelativePath("slot-card"), ".game-polish-lab/visual-recipes/slot-card.json");

const slotRecipe = getVisualSurfaceRecipe("slot_card")!;
assert.strictEqual(slotRecipe.recipeId, "slot-card");
assert.strictEqual(slotRecipe.configPath, farmSlotStyleConfigRelativePath);
assert.strictEqual(slotRecipe.generatedStyleModulePath, "src/config/farmSlotStyle.ts");
assert.ok(slotRecipe.supportedStyleTokens.some((token) => token.tokenId === "slotWidth" && token.valueType === "number"));
assert.ok(slotRecipe.supportedStyleTokens.some((token) => token.tokenId === "fillColor" && token.valueType === "color"));

const backgroundRecipe = getVisualSurfaceRecipe("background_readability")!;
assert.strictEqual(backgroundRecipe.recipeId, "background-readability");
assert.strictEqual(backgroundRecipe.configPath, backgroundReadabilityStyleConfigRelativePath);
assert.ok(backgroundRecipe.supportedStyleTokens.some((token) => token.tokenId === "contrastOverlayOpacity"));

const panelRecipe = getVisualSurfaceRecipe("panel")!;
assert.strictEqual(panelRecipe.recipeId, "panel");
assert.strictEqual(panelRecipe.configPath, panelStyleConfigRelativePath);
assert.ok(panelRecipe.supportedStyleTokens.some((token) => token.tokenId === "headerAccentColor"));

const rewardToastRecipe = getVisualSurfaceRecipe("reward_toast")!;
assert.strictEqual(rewardToastRecipe.recipeId, "reward-toast");
assert.strictEqual(rewardToastRecipe.configPath, rewardToastStyleConfigRelativePath);
assert.ok(rewardToastRecipe.supportedStyleTokens.some((token) => token.tokenId === "durationMs" && token.unit === "ms"));

const buttonRecipe = getVisualSurfaceRecipe("button")!;
assert.strictEqual(buttonRecipe.recipeId, "button");
assert.strictEqual(buttonRecipe.configPath, buttonStyleConfigRelativePath);
assert.ok(buttonRecipe.supportedStyleTokens.some((token) => token.tokenId === "activePressScale" && token.unit === "scale"));

const genericDetected = detectGenericPhaserProject([
  { relativePath: "package.json", text: JSON.stringify({ dependencies: { phaser: "^3.90.0" } }) },
  { relativePath: "src/main.ts", text: "import Phaser from 'phaser';" },
  { relativePath: "src/scenes/BootScene.ts", text: "export class BootScene extends Phaser.Scene {}" },
  { relativePath: "public/assets/sprites/slime.png", text: "" }
]);
assert.strictEqual(genericDetected.detected, true);
assert.strictEqual(genericDetected.confidence, "high");
assert.ok(genericDetected.likelySceneFiles.includes("src/scenes/BootScene.ts"));
assert.ok(genericDetected.likelyAssetFolders.includes("public/assets"));

const genericSceneUsage = detectGenericPhaserProject([
  { relativePath: "src/scenes/MenuScene.ts", text: "export class MenuScene extends Phaser.Scene {}" }
]);
assert.strictEqual(genericSceneUsage.detected, true);
assert.strictEqual(genericSceneUsage.confidence, "medium");
assert.deepStrictEqual(genericSceneUsage.likelySceneFiles, ["src/scenes/MenuScene.ts"]);

const genericPartial = detectGenericPhaserProject([
  { relativePath: "src/main.ts", text: "bootstrap();" }
]);
assert.strictEqual(genericPartial.detected, true);
assert.strictEqual(genericPartial.confidence, "low");
assert.ok(genericPartial.warnings.some((warning) => warning.includes("partial")));

assert.strictEqual(shouldOfferGenericPhaserAdapter({ knownAdapterDetected: false }), true);
assert.strictEqual(shouldOfferGenericPhaserAdapter({ knownAdapterDetected: true, knownAdapterConfidence: "low" }), true);
assert.strictEqual(shouldOfferGenericPhaserAdapter({ knownAdapterDetected: true, knownAdapterConfidence: "high" }), false);
assert.strictEqual(shouldOfferGenericPhaserAdapter({ knownAdapterDetected: true, knownAdapterConfidence: "high", manualSelected: true }), true);

assert.deepStrictEqual(normalizeGenericSelectedFiles([" src/scenes/A.ts ", "src/scenes/A.ts", "src/ui/ButtonView.ts"]), [
  "src/scenes/A.ts",
  "src/ui/ButtonView.ts"
]);
assert.strictEqual(genericStyleConfigRelativePath("button"), ".game-polish-lab/styles/generic-button-style.json");
assert.strictEqual(genericGeneratedStyleModulePath("slot_card"), "src/config/gamePolishLab/genericSlotCardStyle.ts");
assert.ok(genericFallbackTaskRelativePath(new Date("2026-06-25T01:02:03.004Z"), "button", "Action Buttons").includes("generic-button-action-buttons.json"));

const genericFallback = buildGenericFallbackTask({
  surfaceType: "button",
  targetLabel: "Action Buttons",
  selectedFiles: ["src/ui/ButtonView.ts"],
  generatedStyleConfigPath: genericStyleConfigRelativePath("button"),
  generatedStyleModulePath: genericGeneratedStyleModulePath("button"),
  fieldNoteGuidance: {
    preserve: ["Clean Mobile on button/Action Buttons"],
    avoid: ["Magic Glow on button/Action Buttons"],
    mixed: ["Dark Arcade Panel on button/Action Buttons"]
  }
});
assert.strictEqual(genericFallback.ok, true);
assert.ok(genericFallback.task?.allowedFiles.includes("src/ui/ButtonView.ts"));
assert.strictEqual(genericFallback.task?.allowedFiles.includes("src/ui/OtherButtonView.ts"), false);
assert.ok(genericFallback.task?.codexMustNotDo.some((line) => line.includes("loaders/manifests")));
assert.ok(genericFallback.task?.codexMayDo.some((line) => line.includes("Preserve prior proven-good")));
assert.ok(genericFallback.task?.codexMustNotDo.some((line) => line.includes("Avoid prior failed")));
assert.ok(genericFallback.task?.fieldNoteGuidance?.avoid.includes("Magic Glow on button/Action Buttons"));

const directAttempt = createVisualTuningAttempt({
  createdAt: new Date("2026-06-25T02:03:04.005Z"),
  attemptId: "attempt-direct",
  adapterId: "idle_monster_farm",
  surfaceType: "button",
  targetLabel: "Monster Farm buttons",
  recipeId: "button",
  configPath: buttonStyleConfigRelativePath,
  presetName: "Clean Mobile Button",
  styleSnapshot: { width: 120, fillColor: "#112233" },
  applyMode: "direct_apply",
  connectionState: "connected",
  rollbackPaths: [".game-polish-lab/rollback/button.json"],
  manualChecklist: ["direct apply metadata recorded"]
});
assert.strictEqual(validateVisualTuningAttempt(directAttempt).ok, true);
assert.strictEqual(directAttempt.resultStatus, "unreviewed");
assert.deepStrictEqual(directAttempt.changedTokens, ["fillColor", "width"]);
assert.ok(directAttempt.styleValueSummary?.includes("width=120"));

const fallbackAttempt = createVisualTuningAttempt({
  createdAt: new Date("2026-06-25T02:04:04.005Z"),
  attemptId: "attempt-fallback",
  adapterId: "generic_phaser",
  surfaceType: "button",
  targetLabel: "Action Buttons",
  recipeId: "button",
  configPath: genericStyleConfigRelativePath("button"),
  generatedStyleModulePath: genericGeneratedStyleModulePath("button"),
  fallbackTaskPath: ".game-polish-lab/fallback-tasks/task.json",
  presetName: "Magic Glow",
  styleSnapshot: { glowStrength: 0.9 },
  applyMode: "fallback_task",
  connectionState: "unknown",
  warnings: ["Previous field notes marked Magic Glow worse."]
});
assert.strictEqual(validateVisualTuningAttempt(fallbackAttempt).ok, true);
assert.strictEqual(fallbackAttempt.fallbackTaskPath, ".game-polish-lab/fallback-tasks/task.json");

assert.deepStrictEqual(visualTuningResultStatuses, ["unreviewed", "better", "worse", "same", "mixed"]);
assert.strictEqual(validateVisualTuningAttempt({ ...directAttempt, resultStatus: "bad" }).ok, false);
assert.strictEqual(
  safeAttemptRelativePath(new Date("2026-06-25T02:03:04.005Z"), "button", "Action Buttons", "attempt-direct"),
  ".game-polish-lab/tuning-attempts/2026-06-25T02-03-04-005Z-button-action-buttons-t-direct.json"
);

const betterAttempt = updateAttemptResultModel(directAttempt, "better", "Clean mobile button improved repeat taps.", new Date("2026-06-25T02:05:04.005Z"));
const worseAttempt = updateAttemptResultModel(fallbackAttempt, "worse", "Magic glow reduced readability.", new Date("2026-06-25T02:06:04.005Z"));
const sameAttempt = updateAttemptResultModel(createVisualTuningAttempt({
  createdAt: new Date("2026-06-25T02:07:04.005Z"),
  attemptId: "attempt-same",
  adapterId: "generic_phaser",
  surfaceType: "button",
  targetLabel: "Action Buttons",
  presetName: "Flat Gray",
  applyMode: "fallback_task",
  connectionState: "unknown"
}), "same", "No meaningful button contrast change.");
const mixedAttempt = updateAttemptResultModel(createVisualTuningAttempt({
  createdAt: new Date("2026-06-25T02:08:04.005Z"),
  attemptId: "attempt-mixed",
  adapterId: "generic_phaser",
  surfaceType: "button",
  targetLabel: "Action Buttons",
  presetName: "Dark Arcade",
  applyMode: "fallback_task",
  connectionState: "unknown"
}), "mixed", "Hover improved but disabled state got muddy.");
assert.deepStrictEqual(betterAttempt.resultNotes, ["Clean mobile button improved repeat taps."]);

const attemptIndex = buildVisualTuningAttemptIndex([
  { attempt: betterAttempt, attemptPath: ".game-polish-lab/tuning-attempts/better.json" },
  { attempt: worseAttempt, attemptPath: ".game-polish-lab/tuning-attempts/worse.json" },
  { attempt: sameAttempt, attemptPath: ".game-polish-lab/tuning-attempts/same.json" },
  { attempt: mixedAttempt, attemptPath: ".game-polish-lab/tuning-attempts/mixed.json" }
], new Date("2026-06-25T02:09:04.005Z"));
assert.strictEqual(attemptIndex.schemaVersion, "visual-tuning-attempt-index/v1");
assert.strictEqual(attemptIndex.attempts.length, 4);
assert.strictEqual(queryAttemptIndex(attemptIndex, { surfaceType: "button", adapterId: "generic_phaser", targetLabel: "Action Buttons" }).length, 3);
assert.strictEqual(queryAttemptIndex(attemptIndex, { resultStatus: "worse", presetName: "Magic Glow" })[0].attemptId, "attempt-fallback");

const treatmentSummary = extractFieldNoteTreatmentSummary(attemptIndex, { surfaceType: "button", adapterId: "generic_phaser", targetLabel: "Action Buttons" });
assert.strictEqual(treatmentSummary.knownBad.length, 1);
assert.strictEqual(treatmentSummary.noMeaningfulEffect.length, 1);
assert.strictEqual(treatmentSummary.mixed.length, 1);
assert.ok(treatmentSummary.warnings.some((warning) => warning.includes("worse")));
assert.ok(treatmentSummary.warnings.some((warning) => warning.includes("no meaningful")));

const directTreatmentSummary = extractFieldNoteTreatmentSummary(attemptIndex, { surfaceType: "button", adapterId: "idle_monster_farm" });
assert.strictEqual(directTreatmentSummary.knownGood.length, 1);
assert.ok(directTreatmentSummary.successes.some((success) => success.includes("better")));

const fallbackGuidance = fieldNoteGuidanceForFallback(attemptIndex, { surfaceType: "button", adapterId: "generic_phaser", targetLabel: "Action Buttons" });
assert.ok(fallbackGuidance.avoid.some((line) => line.includes("Magic Glow")));
assert.ok(fallbackGuidance.avoid.some((line) => line.includes("no meaningful effect")));
assert.ok(fallbackGuidance.mixed.some((line) => line.includes("Dark Arcade")));

const fieldNoteEntry = renderVisualTuningFieldNote(worseAttempt, ".game-polish-lab/tuning-attempts/worse.json", "Magic glow reduced readability.");
const existingFieldNotes = "# Game Polish Lab Field Notes\n\nExisting note\n";
const appendedFieldNotes = `${existingFieldNotes.trimEnd()}\n\n${fieldNoteEntry}`;
assert.ok(appendedFieldNotes.includes("Existing note"));
assert.ok(appendedFieldNotes.includes("Magic glow reduced readability"));
assert.ok(escapeMarkdown("Magic *Glow* [bad]").includes("\\*Glow\\*"));

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { version: string; activationEvents: string[]; contributes: { commands: Array<{ command: string; title: string }> } };
assert.strictEqual(packageJson.version, "0.6.6");
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.openAssetContactSheet"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.openRollbackHistory"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.openVisualTuningDashboard"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.refreshAssetContracts"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openAssetContactSheet" && command.title === "Game Polish Lab: Open Asset Contact Sheet"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openRollbackHistory" && command.title === "Game Polish Lab: Open Rollback History"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openVisualTuningDashboard" && command.title === "Game Polish Lab: Open Visual Tuning Dashboard"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.refreshAssetContracts" && command.title === "Game Polish Lab: Refresh Asset Contracts"));
const tuneVisualSurfaceSource = fs.readFileSync(path.join(process.cwd(), "src", "commands", "tuneVisualSurface.ts"), "utf8");
assert.ok(tuneVisualSurfaceSource.includes("stylePresetLibrary: visualPresetLibrary"));
assert.ok(tuneVisualSurfaceSource.includes("presetDescription"));
assert.ok(tuneVisualSurfaceSource.includes("Game Polish Lab v0.62"));

const desktopPreviewFrame = visualPreviewViewports.find((frame) => frame.mode === "desktop")!;
const mobilePreviewFrame = visualPreviewViewports.find((frame) => frame.mode === "mobile")!;
assert.strictEqual(desktopPreviewFrame.orientation, "landscape");
assert.strictEqual(mobilePreviewFrame.orientation, "portrait");
assert.ok(desktopPreviewFrame.width > mobilePreviewFrame.width);
assert.ok(mobilePreviewFrame.height > desktopPreviewFrame.height);

const slotPreviewStates = getVisualPreviewStates("slot_card");
assert.deepStrictEqual(slotPreviewStates.map((state) => state.stateId), ["empty", "occupied", "selected", "locked", "merge_candidate"]);
assert.ok(slotPreviewStates.every((state) => state.supported));
const customPreviewStates = getVisualPreviewStates("slot_card", ["empty", "boss warning"]);
assert.strictEqual(customPreviewStates[0].supported, true);
assert.strictEqual(customPreviewStates[1].stateId, "boss_warning");
assert.strictEqual(customPreviewStates[1].supported, false);

const slotPreviewAnimations = getVisualPreviewAnimations("slot_card");
assert.strictEqual(slotPreviewAnimations[0].kind, "merge_candidate_pulse");
assert.ok(slotPreviewAnimations[0].tokenIds.includes("mergeCandidatePulseScale"));
assert.strictEqual(slotPreviewAnimations[0].defaultEnabled, true);

const baselinePreviewRequest = buildVisualPreviewRenderRequest({
  surfaceType: "slot_card",
  adapterId: "idle_monster_farm.farm_slots",
  targetId: "farm_slots",
  targetLabel: "Monster Farm Slots",
  currentStyle: defaultSlotCardStyle,
  draftStyle: slotCardPresets[1].values,
  appliedStyleExists: false
});
assert.strictEqual(baselinePreviewRequest.comparison.beforeSource, "baseline_default");
assert.strictEqual(baselinePreviewRequest.comparison.beforeLabel, "Before: baseline default");
assert.strictEqual(baselinePreviewRequest.defaultFrameMode, "desktop");
assert.strictEqual(baselinePreviewRequest.states.some((state) => state.stateId === "merge_candidate"), true);

const appliedPreviewRequest = buildVisualPreviewRenderRequest({
  surfaceType: "slot_card",
  adapterId: "idle_monster_farm.farm_slots",
  targetId: "farm_slots",
  targetLabel: "Monster Farm Slots",
  currentStyle: validFarmSlotConfig.values,
  draftStyle: slotCardPresets[1].values,
  appliedStyleExists: true
});
assert.strictEqual(appliedPreviewRequest.comparison.beforeSource, "applied_config");
assert.strictEqual(appliedPreviewRequest.comparison.beforeStyle, validFarmSlotConfig.values);

const dashboardSlotRecipe = getVisualSurfaceRecipe("slot_card")!;
const dashboardButtonRecipe = getVisualSurfaceRecipe("button")!;
const validRecipeFile = recipeFileStatus(dashboardSlotRecipe, true);
const missingRecipeFile = recipeFileStatus(dashboardButtonRecipe, false);
assert.strictEqual(validRecipeFile.status, "valid");
assert.strictEqual(missingRecipeFile.status, "missing");
assert.strictEqual(configPathForDashboard("idle_monster_farm", "slot_card", dashboardSlotRecipe), farmSlotStyleConfigRelativePath);
assert.strictEqual(configPathForDashboard("generic_phaser", "button", dashboardButtonRecipe), genericStyleConfigRelativePath("button"));
assert.strictEqual(configPathForDashboard("idle_monster_farm", "asset_replacement"), "src/config/monsterFarmAssetManifest.ts");

const connectedIdleSlotSurface = {
  surfaceType: "slot_card" as const,
  displayName: "Farm Slots",
  adapter: {
    adapterId: "idle_monster_farm" as const,
    targetId: "farm_slots",
    targetLabel: "Monster Farm farm slots",
    connectedState: "connected" as const,
    detected: true,
    confidence: "high" as const,
    directApplySupported: true,
    generatedStyleModulePath: "src/config/farmSlotStyle.ts",
    ownerFiles: ["src/scenes/FarmScene.ts"],
    warnings: []
  },
  recipe: dashboardSlotRecipe,
  config: { status: "valid" as const, path: farmSlotStyleConfigRelativePath, exists: true },
  recipeFile: validRecipeFile,
  fallbackTaskCount: 1,
  scopeFiles: [farmSlotStyleConfigRelativePath, "src/config/farmSlotStyle.ts", "src/scenes/FarmScene.ts", visualRecipeRelativePath("slot-card")]
};
const connectedIdleSlotRow = buildDashboardRow(connectedIdleSlotSurface, attemptIndex);
assert.strictEqual(connectedIdleSlotRow.appliedStatus, "applied");
assert.strictEqual(connectedIdleSlotRow.configStatus, "valid");
assert.strictEqual(connectedIdleSlotRow.recipeStatus, "valid");
assert.strictEqual(connectedIdleSlotRow.connectedState, "connected");
assert.strictEqual(connectedIdleSlotRow.actions.tune.enabled, true);
assert.strictEqual(connectedIdleSlotRow.actions.openConfig.enabled, true);
assert.strictEqual(connectedIdleSlotRow.actions.directApply.enabled, true);
assert.strictEqual(connectedIdleSlotRow.actions.runScopeCheck.enabled, true);
assert.strictEqual(connectedIdleSlotRow.fallbackTaskCount, 1);

const genericButtonSurface = {
  surfaceType: "button" as const,
  displayName: "Generic Button",
  adapter: {
    adapterId: "generic_phaser" as const,
    targetId: "manual_target",
    targetLabel: "Action Buttons",
    connectedState: "unknown" as const,
    detected: true,
    confidence: "low" as const,
    directApplySupported: true,
    generatedStyleModulePath: genericGeneratedStyleModulePath("button"),
    ownerFiles: ["src/ui/ButtonView.ts"],
    warnings: ["Only partial Phaser evidence was found."]
  },
  recipe: dashboardButtonRecipe,
  config: { status: "valid" as const, path: genericStyleConfigRelativePath("button"), exists: true },
  recipeFile: missingRecipeFile,
  fallbackTaskCount: 2,
  scopeFiles: [genericStyleConfigRelativePath("button"), genericGeneratedStyleModulePath("button"), "src/ui/ButtonView.ts", visualRecipeRelativePath("button")]
};
const genericButtonRow = buildDashboardRow(genericButtonSurface, attemptIndex);
assert.strictEqual(genericButtonRow.appliedStatus, "config_only");
assert.strictEqual(genericButtonRow.lastTunedAt, "2026-06-25T02:08:04.005Z");
assert.strictEqual(genericButtonRow.lastResult, "mixed");
assert.ok(genericButtonRow.knownBad.some((note) => note.includes("Magic Glow")));
assert.ok(genericButtonRow.knownBad.some((note) => note.includes("no meaningful effect")));
assert.ok(genericButtonRow.knownMixed.some((note) => note.includes("Dark Arcade")));
assert.strictEqual(genericButtonRow.actions.directApply.enabled, false);
assert.ok(genericButtonRow.actions.directApply.reason?.includes("not connected"));
assert.strictEqual(genericButtonRow.actions.generateFallbackTask.enabled, true);
assert.strictEqual(genericButtonRow.actions.markLatestResult.enabled, true);
assert.strictEqual(genericButtonRow.scopeSummary.recommendedAction, "warn");
assert.strictEqual(genericButtonRow.scopeSummary.classificationCounts.suspicious, 1);
assert.ok(genericButtonRow.scopeSummary.summaryMessage.includes("suspicious"));

const disconnectedIdlePanelSurface = {
  ...connectedIdleSlotSurface,
  surfaceType: "panel" as const,
  displayName: "Panels",
  adapter: {
    ...connectedIdleSlotSurface.adapter,
    targetId: "panels",
    targetLabel: "Monster Farm panels",
    connectedState: "not_connected" as const,
    generatedStyleModulePath: "src/config/panelStyle.ts"
  },
  recipe: getVisualSurfaceRecipe("panel")!,
  config: { status: "valid" as const, path: panelStyleConfigRelativePath, exists: true },
  recipeFile: recipeFileStatus(getVisualSurfaceRecipe("panel")!, true),
  fallbackTaskCount: 0,
  scopeFiles: [panelStyleConfigRelativePath, "src/config/panelStyle.ts", "src/ui/PanelChrome.ts", visualRecipeRelativePath("panel")]
};
const disconnectedPanelRow = buildDashboardRow(disconnectedIdlePanelSurface, attemptIndex);
assert.strictEqual(disconnectedPanelRow.appliedStatus, "config_only");
assert.strictEqual(disconnectedPanelRow.actions.directApply.enabled, false);
assert.strictEqual(disconnectedPanelRow.actions.generateFallbackTask.enabled, true);

const invalidButtonSurface = {
  ...genericButtonSurface,
  config: { status: "invalid_json" as const, path: genericStyleConfigRelativePath("button"), exists: true }
};
assert.strictEqual(buildDashboardRow(invalidButtonSurface, attemptIndex).appliedStatus, "invalid");

const unsupportedAssetSurface = {
  surfaceType: "asset_replacement" as const,
  displayName: "Generic Asset Replacement",
  adapter: {
    adapterId: "generic_phaser" as const,
    targetId: "manual_target",
    targetLabel: "Generic Asset Replacement",
    connectedState: "not_applicable" as const,
    detected: true,
    confidence: "low" as const,
    directApplySupported: false,
    ownerFiles: [],
    warnings: []
  },
  config: { status: "not_applicable" as const, exists: false },
  recipeFile: { status: "not_applicable" as const, exists: false },
  fallbackTaskCount: 0,
  scopeFiles: []
};
assert.strictEqual(buildDashboardRow(unsupportedAssetSurface, attemptIndex).appliedStatus, "unsupported");

const unknownSurface = {
  ...connectedIdleSlotSurface,
  adapter: {
    ...connectedIdleSlotSurface.adapter,
    connectedState: "unknown" as const,
    detected: false,
    confidence: "low" as const
  },
  config: { status: "missing" as const, path: farmSlotStyleConfigRelativePath, exists: false }
};
assert.strictEqual(buildDashboardRow(unknownSurface, attemptIndex).appliedStatus, "unknown");

assert.strictEqual(calculateAppliedStatus(connectedIdleSlotSurface, connectedIdleSlotRow.scopeSummary), "applied");
assert.strictEqual(calculateAppliedStatus(disconnectedIdlePanelSurface, disconnectedPanelRow.scopeSummary), "config_only");
assert.strictEqual(calculateAppliedStatus(invalidButtonSurface, buildDashboardRow(invalidButtonSurface, attemptIndex).scopeSummary), "invalid");

const dashboardModel = buildVisualTuningDashboardModel({
  workspaceFolder: "D:/sample",
  generatedAt: new Date("2026-06-25T03:00:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "idle_monster_farm",
  adapterConfidence: "high",
  surfaces: [connectedIdleSlotSurface, genericButtonSurface, disconnectedIdlePanelSurface, unsupportedAssetSurface],
  attemptIndex,
  assetContracts: {
    status: "valid",
    path: ".game-polish-lab/assets/asset-contracts.json",
    statusCounts: {
      valid: 1,
      warning: 1,
      invalid: 1,
      missing: 1,
      unknown: 1,
      total: 5
    },
    warningCount: 3
  }
});
assert.strictEqual(dashboardModel.schemaVersion, "visual-tuning-dashboard/v1");
assert.strictEqual(dashboardModel.summary.totalSurfaces, 4);
assert.strictEqual(dashboardModel.summary.appliedCount, 1);
assert.strictEqual(dashboardModel.summary.configOnlyCount, 2);
assert.ok(dashboardModel.summary.warningCount > 0);
assert.strictEqual(dashboardModel.summary.assetContractStatus, "valid");
assert.strictEqual(dashboardModel.summary.assetContractStatusCounts.total, 5);
assert.strictEqual(dashboardModel.summary.assetContractStatusCounts.valid, 1);
assert.strictEqual(dashboardModel.summary.assetContractWarningCount, 3);
assert.strictEqual(dashboardModel.summary.assetContactSheetAvailable, true);
assert.strictEqual(dashboardModel.fieldNotes.fieldNotesPath, ".game-polish-lab/field-notes.md");
assert.ok(dashboardModel.fieldNotes.knownBad.some((note) => note.includes("Magic Glow")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("dashboard opens without writing files")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("asset contract summary")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("Asset Contact Sheet")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("Rollback History")));
assert.strictEqual(getVisualSurfaceRecipes().length, 5);
assert.deepStrictEqual(visualSurfacePickerOrder, ["slot_card", "background_readability", "asset_replacement", "panel", "reward_toast", "button"]);
assert.ok(dashboardModel.rows.some((row) => row.adapterId === "idle_monster_farm" && row.surfaceType === "slot_card"));
assert.ok(dashboardModel.rows.some((row) => row.adapterId === "generic_phaser" && row.surfaceType === "button"));
assert.ok(genericButtonRow.scopeSummary.allowedFiles.includes(genericStyleConfigRelativePath("button")));
assert.ok(genericButtonRow.scopeSummary.forbiddenFiles.includes("src/ui/ButtonView.ts") || genericButtonRow.scopeSummary.suspiciousFiles.includes("src/ui/ButtonView.ts"));

const dashboardWithoutContactSheet = buildVisualTuningDashboardModel({
  workspaceFolder: "D:/sample",
  generatedAt: new Date("2026-06-25T03:00:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "idle_monster_farm",
  adapterConfidence: "high",
  surfaces: [connectedIdleSlotSurface],
  attemptIndex,
  assetContracts: {
    status: "missing",
    path: ".game-polish-lab/assets/asset-contracts.json",
    statusCounts: { valid: 0, warning: 0, invalid: 0, missing: 0, unknown: 0, total: 0 },
    warningCount: 0
  }
});
assert.strictEqual(dashboardWithoutContactSheet.summary.assetContactSheetAvailable, false);

const vagueGenericFallback = buildGenericFallbackTask({
  surfaceType: "panel",
  targetLabel: "Panels",
  selectedFiles: ["src/scenes/*.ts"],
  generatedStyleConfigPath: genericStyleConfigRelativePath("panel"),
  generatedStyleModulePath: genericGeneratedStyleModulePath("panel")
});
assert.strictEqual(vagueGenericFallback.ok, false);
assert.ok(vagueGenericFallback.errors.some((error) => error.includes("wildcards")));

const emptyGenericFallback = buildGenericFallbackTask({
  surfaceType: "reward_toast",
  targetLabel: "Toast",
  selectedFiles: [],
  generatedStyleConfigPath: genericStyleConfigRelativePath("reward_toast"),
  generatedStyleModulePath: genericGeneratedStyleModulePath("reward_toast")
});
assert.strictEqual(emptyGenericFallback.ok, false);
assert.ok(emptyGenericFallback.errors.some((error) => error.includes("At least one selected")));

const genericAssetTarget = buildGenericAssetTarget("src/assets/ui");
const validGenericAsset = validateReplacementAsset({ fileName: "button.png", bytes: Buffer.from("not-real-png") }, genericAssetTarget);
assert.strictEqual(validGenericAsset.model.destinationPath, "src/assets/ui/button.png");
const genericAssetTraversal = validateReplacementAsset({ fileName: "../button.png", bytes: Buffer.from("not-real-png") }, genericAssetTarget);
assert.strictEqual(genericAssetTraversal.ok, false);
assert.ok(genericAssetTraversal.model.validationErrors.some((error) => error.includes("path traversal")));

const genericFallbackScope = checkV05VisualScope([
  ".game-polish-lab/fallback-tasks/2026-generic-button-action-buttons.json",
  ".game-polish-lab/tuning-attempts/2026-button-action-buttons.json",
  ".game-polish-lab/field-notes.md",
  genericStyleConfigRelativePath("button"),
  genericGeneratedStyleModulePath("button")
], { throughAdapter: true });
assert.strictEqual(genericFallbackScope.ok, true);
assert.ok(genericFallbackScope.allowedFiles.includes(".game-polish-lab/tuning-attempts/2026-button-action-buttons.json"));
assert.ok(genericFallbackScope.allowedFiles.includes(".game-polish-lab/field-notes.md"));

const unsafeGenericDirectScope = checkV05VisualScope([
  "src/scenes/MenuScene.ts",
  "src/rendering/ButtonView.ts",
  "src/scenes/PreloadScene.ts"
], { throughAdapter: false });
assert.strictEqual(unsafeGenericDirectScope.ok, false);
assert.ok(unsafeGenericDirectScope.forbiddenFiles.includes("src/scenes/MenuScene.ts"));
assert.ok(unsafeGenericDirectScope.forbiddenFiles.includes("src/rendering/ButtonView.ts"));
assert.ok(unsafeGenericDirectScope.forbiddenFiles.includes("src/scenes/PreloadScene.ts"));

const recipeScope = checkV05VisualScope([
  ".game-polish-lab/visual-recipes/slot-card.json",
  "src/core/visualRecipeRegistry.ts",
  "src/types/visualRecipe.ts",
  "src/systems/saveSystem.ts",
  "src/data/economy.ts",
  "src/systems/progressionSystem.ts",
  "src/services/rewardedAdService.ts",
  "src/gameplay/rules.ts"
], { throughAdapter: true });
assert.ok(recipeScope.allowedFiles.includes(".game-polish-lab/visual-recipes/slot-card.json"));
assert.ok(recipeScope.allowedFiles.includes("src/core/visualRecipeRegistry.ts"));
assert.ok(recipeScope.allowedFiles.includes("src/types/visualRecipe.ts"));
assert.ok(recipeScope.forbiddenFiles.includes("src/systems/saveSystem.ts"));
assert.ok(recipeScope.forbiddenFiles.includes("src/data/economy.ts"));
assert.ok(recipeScope.forbiddenFiles.includes("src/systems/progressionSystem.ts"));
assert.ok(recipeScope.forbiddenFiles.includes("src/services/rewardedAdService.ts"));
assert.ok(recipeScope.forbiddenFiles.includes("src/gameplay/rules.ts"));

assert.strictEqual(loadSlotCardStyleConfigFromText(JSON.stringify(validFarmSlotConfig)).status, "valid");
assert.strictEqual(loadBackgroundReadabilityStyleConfigFromText(JSON.stringify(validBackgroundConfig)).status, "valid");
assert.strictEqual(loadPanelStyleConfigFromText(JSON.stringify(validPanelConfig)).status, "valid");
assert.strictEqual(loadRewardToastStyleConfigFromText(JSON.stringify(validRewardToastConfig)).status, "valid");
assert.strictEqual(loadButtonStyleConfigFromText(JSON.stringify(validButtonConfig)).status, "valid");

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

function makeTempWorkspace(name: string): string {
  return fs.mkdtempSync(path.join(process.cwd(), `.tmp-${name}-`));
}

function writeWorkspaceFile(root: string, relativePath: string, text: string): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, "utf8");
}

function readWorkspaceFile(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8");
}

function cleanupTempWorkspace(root: string): void {
  if (root.startsWith(process.cwd())) {
    fs.rmSync(root, { recursive: true, force: true });
  }
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
