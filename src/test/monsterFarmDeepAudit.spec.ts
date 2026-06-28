import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

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
  buildGenericManualSurfaceSelection,
  detectGenericPhaserProject,
  discoverGenericPhaserOwnerFileSuggestions,
  genericFallbackTaskRelativePath,
  genericGeneratedStyleModulePath,
  genericManualStyleConfigRelativePath,
  genericStyleConfigRelativePath,
  manualSurfaceIdToVisualSurfaceType,
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
  buildCursorArenaDashboardSurfaceInputs,
  buildGenericPhaserDashboardSurfaceInputs,
  buildSortPuzzleDashboardSurfaceInputs,
  buildVisualTuningDashboardModel,
  calculateAppliedStatus,
  configPathForDashboard,
  dashboardAdapterFilterOptions,
  DashboardSurfaceInput,
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
  buildVisualDirectApplyFallbackTask,
  buildVisualDirectApplyPlan,
  cursorArenaBackgroundReadabilityConfigRelativePath,
  cursorArenaFeedbackStyleConfigRelativePath,
  cursorArenaHudStyleConfigRelativePath,
  cursorArenaUpgradeCardStyleConfigRelativePath,
  executeVisualDirectApplyPlan,
  getVisualDirectApplyTemplateRegistry,
  resolveVisualDirectApplyTemplate,
  sortPuzzleFeedbackStyleConfigRelativePath,
  sortPuzzleShelfStyleConfigRelativePath,
  sortPuzzleSpiritPresentationConfigRelativePath
} from "../core/visualDirectApplyTemplates";
import {
  buildCursorArenaVisualFallbackTask,
  buildSortPuzzleSpiritSortSceneFallbackTask,
  detectCursorArenaProject,
  detectSortPuzzleProject,
  getVisualGameAdapter,
  getVisualGameAdapterScopeMetadata,
  getVisualGameAdapterSupportedSurfaces,
  getVisualGameAdapterSurfaceTargets,
  listVisualGameAdapters,
  summarizeRegisteredVisualGameAdapterContracts,
  summarizeVisualGameAdapterContract,
  validateRegisteredVisualGameAdapters,
  validateVisualAdapterSurfaceTarget,
  validateVisualGameAdapter
} from "../core/visualGameAdapters";
import {
  buildVisualThemeFile,
  exportVisualThemeFile,
  exportVisualThemeFromStyleConfigs,
  importVisualThemeToAdapter,
  planVisualThemeImportForAdapter,
  importVisualThemeFile,
  planVisualThemeImport,
  safeVisualThemeRelativePath,
  validateVisualThemeFile,
  visualThemeIndexRelativePath,
  visualThemeFolderRelativePath
} from "../core/visualThemeTransfer";
import {
  buildScreenshotAnnotationFallbackTask,
  buildScreenshotAnnotationNote,
  buildScreenshotAnnotationTaskMarkdown,
  mapScreenshotAnnotationSurfaceToTarget,
  normalizeScreenshotAnnotationRect,
  readScreenshotImageMetadata,
  saveScreenshotAnnotationBundle,
  screenshotAnnotationIndexRelativePath,
  screenshotAnnotationRelativePath,
  screenshotAnnotationTasksFolderRelativePath,
  screenshotAnnotationsFolderRelativePath,
  screenshotNotesFolderRelativePath,
  validateScreenshotAnnotationRect,
  validateScreenshotImagePath,
  writeScreenshotAnnotationNote
} from "../core/screenshotAnnotation";
import {
  assignVisualAssetCandidate,
  buildVisualAssetDashboardModel,
  buildVisualAssetFallbackTask,
  checkAssetPipelineScope,
  discoverVisualAssetSlots,
  importVisualAssetCandidate,
  validateImportedVisualAssetCandidate,
  visualAssetDashboardRelativePath,
  visualAssetImportedRelativeDir,
  visualAssetAssignmentsRelativeDir
} from "../core/visualAssetPipeline";
import {
  buildVisualRollbackFallbackTask,
  discoverVisualRollbackSnapshots,
  restoreVisualRollbackSnapshot,
  visualRollbackFallbackTaskRelativeDir,
  visualRollbackRelativeDir
} from "../core/visualRollback";
import {
  buildPolishDevOverlayInstallPlan,
  createOptionalPolishDevOverlaySpike,
  devOverlayWritePaths,
  executePolishDevOverlayInstallPlan,
  inspectPolishDevOverlayStatus,
  polishDevOverlayGeneratedMarker,
  polishDevOverlayManifestRelativePath,
  polishDevOverlayReadmeRelativePath,
  polishDevOverlayRelativeDir,
  polishDevOverlayScriptRelativePath,
  polishDevOverlayStyleRelativePath
} from "../core/visualDevOverlay";
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
import { VisualAdapterSurfaceTarget, VisualGameAdapter } from "../types/visualGameAdapter";
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

const genericV2Scope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "generic_phaser",
  surfaceType: "panel",
  targetId: "manual_hud",
  candidatePaths: [
    genericManualStyleConfigRelativePath("hud")!,
    ".game-polish-lab/rollback/hud.json",
    "src/scenes/HudScene.ts",
    "src/data/economy.ts",
    "package.json"
  ]
});
assert.strictEqual(genericV2Scope.recommendedAction, "block");
assert.ok(genericV2Scope.classifiedFiles.some((file) => file.path === genericManualStyleConfigRelativePath("hud") && file.classification === "safe"));
assert.ok(genericV2Scope.classifiedFiles.some((file) => file.path === "src/scenes/HudScene.ts" && file.classification === "suspicious"));
assert.ok(genericV2Scope.classifiedFiles.some((file) => file.path === "src/data/economy.ts" && file.classification === "forbidden"));
assert.ok(genericV2Scope.classifiedFiles.some((file) => file.path === "package.json" && file.classification === "forbidden"));

const sortPuzzleForbiddenScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "sort_puzzle",
  surfaceType: "slot_card",
  targetId: "shelf_card",
  candidatePaths: [
    "src/rules/SortRules.ts",
    "src/data/spiritSortLevels.ts",
    "src/solver/SortSolver.ts",
    "src/systems/saveSystem.ts",
    "src/systems/progressionSystem.ts"
  ]
});
assert.strictEqual(sortPuzzleForbiddenScope.recommendedAction, "block");
assert.strictEqual(sortPuzzleForbiddenScope.counts.forbidden, 5);
assert.ok(sortPuzzleForbiddenScope.violations.some((violation) => violation.reasonCode === "sort_puzzle_rule_file"));
assert.ok(sortPuzzleForbiddenScope.violations.some((violation) => violation.reasonCode === "level_data_file"));
assert.ok(sortPuzzleForbiddenScope.violations.some((violation) => violation.reasonCode === "save_file"));
assert.ok(sortPuzzleForbiddenScope.violations.some((violation) => violation.reasonCode === "progression_or_unlock_file"));

const sortPuzzleSceneScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "sort_puzzle",
  surfaceType: "slot_card",
  targetId: "shelf_card",
  candidatePaths: ["src/scenes/SpiritSortScene.ts"]
});
assert.strictEqual(sortPuzzleSceneScope.recommendedAction, "warn");
assert.strictEqual(sortPuzzleSceneScope.counts.suspicious, 1);

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

const directApplyRegistry = getVisualDirectApplyTemplateRegistry();
const registeredVisualAdapters = listVisualGameAdapters();
assert.deepStrictEqual(registeredVisualAdapters.map((adapter) => adapter.id), ["idle_monster_farm", "generic_phaser", "sort_puzzle", "cursor_arena"]);
assert.strictEqual(new Set(registeredVisualAdapters.map((adapter) => adapter.id)).size, registeredVisualAdapters.length);
assert.deepStrictEqual(getVisualGameAdapterSupportedSurfaces("idle_monster_farm"), visualSurfacePickerOrder);
assert.deepStrictEqual(getVisualGameAdapterSupportedSurfaces("generic_phaser"), visualSurfacePickerOrder);
assert.deepStrictEqual(getVisualGameAdapterSupportedSurfaces("sort_puzzle"), ["slot_card", "reward_toast", "asset_replacement"]);
assert.deepStrictEqual(getVisualGameAdapterSupportedSurfaces("cursor_arena"), ["panel", "slot_card", "reward_toast", "background_readability"]);
const registeredAdapterValidation = validateRegisteredVisualGameAdapters();
assert.strictEqual(registeredAdapterValidation.ok, true);
assert.deepStrictEqual(registeredAdapterValidation.errors, []);
const idleContract = getVisualGameAdapter("idle_monster_farm")!;
const genericContract = getVisualGameAdapter("generic_phaser")!;
const sortPuzzleContract = getVisualGameAdapter("sort_puzzle")!;
const cursorArenaContract = getVisualGameAdapter("cursor_arena")!;
assert.ok(idleContract);
assert.ok(genericContract);
assert.ok(sortPuzzleContract);
assert.ok(cursorArenaContract);
assert.strictEqual(getVisualGameAdapter("generic_phaser_v2"), undefined);
const idleSlotTargets = getVisualGameAdapterSurfaceTargets("idle_monster_farm", "slot_card");
assert.strictEqual(idleSlotTargets.length, 1);
assert.strictEqual(idleSlotTargets[0].targetId, "farm_slots");
assert.strictEqual(idleSlotTargets[0].styleConfigPath, farmSlotStyleConfigRelativePath);
assert.strictEqual(idleSlotTargets[0].directApply.support, "executable");
assert.ok(idleSlotTargets[0].directApply.templateId?.includes("idle-monster-farm.slot_card"));
const genericButtonTargets = getVisualGameAdapterSurfaceTargets("generic_phaser", "button");
assert.strictEqual(genericButtonTargets[0].targetId, "manual_button");
assert.strictEqual(genericButtonTargets[0].styleConfigPath, genericStyleConfigRelativePath("button"));
assert.strictEqual(genericButtonTargets[0].directApply.support, "executable");
assert.ok(genericButtonTargets[0].likelyOwnerFiles.some((file) => file.includes("selected UI/render files")));
assert.ok(genericButtonTargets[0].supportedStyleTokens?.includes("hoverGlowStrength"));
const genericPanelTargets = getVisualGameAdapterSurfaceTargets("generic_phaser", "panel");
assert.ok(genericPanelTargets.some((target) => target.targetId === "manual_hud" && target.styleConfigPath === genericManualStyleConfigRelativePath("hud")));
const genericFeedbackTargets = getVisualGameAdapterSurfaceTargets("generic_phaser", "reward_toast");
assert.ok(genericFeedbackTargets.some((target) => target.targetId === "manual_impact_feedback" && target.styleConfigPath === genericManualStyleConfigRelativePath("impact_feedback")));
const idleAssetContractTargets = getVisualGameAdapterSurfaceTargets("idle_monster_farm", "asset_replacement");
assert.strictEqual(idleAssetContractTargets.length, 1);
assert.strictEqual(idleAssetContractTargets[0].directApply.support, "unsupported");
assert.strictEqual(idleAssetContractTargets[0].assetReplacementSupport, "supported");
assert.ok(idleAssetContractTargets[0].limitations.some((limitation) => limitation.includes("direct-apply template")));
const genericAssetContractTargets = getVisualGameAdapterSurfaceTargets("generic_phaser", "asset_replacement");
assert.strictEqual(genericAssetContractTargets[0].directApply.support, "unsupported");
assert.strictEqual(genericAssetContractTargets[0].assetReplacementSupport, "manual_required");
const sortPuzzleDetection = detectSortPuzzleProject([
  { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"latest\"}}" },
  { relativePath: "src/scenes/SpiritSortScene.ts", text: "export class SpiritSortScene extends Phaser.Scene { drawShelf(); drawSpirit(); }" }
]);
assert.strictEqual(sortPuzzleDetection.detected, true);
assert.strictEqual(sortPuzzleDetection.confidence, "high");
assert.ok(sortPuzzleDetection.evidence.some((entry) => entry.includes("SpiritSortScene")));
const weakSortPuzzleDetection = detectSortPuzzleProject([{ relativePath: "src/scenes/MenuScene.ts", text: "sort options" }]);
assert.strictEqual(weakSortPuzzleDetection.detected, false);
const sortPuzzleSlotTargets = getVisualGameAdapterSurfaceTargets("sort_puzzle", "slot_card");
assert.deepStrictEqual(sortPuzzleSlotTargets.map((target) => target.targetId), ["shelf_card", "spirit_slot", "completed_shelf", "selected_shelf_state", "invalid_move_feedback"]);
assert.strictEqual(sortPuzzleSlotTargets.find((target) => target.targetId === "shelf_card")?.styleConfigPath, sortPuzzleShelfStyleConfigRelativePath);
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "shelf_card")?.supportedStyleTokens?.includes("shelfWidth"));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "selected_shelf_state")?.manualChecks.some((check) => check.description.includes("valid target preview")));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "selected_shelf_state")?.supportedStyleTokens?.includes("targetOutlineWidth"));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "invalid_move_feedback")?.supportedStyleTokens?.includes("invalidFeedbackDurationMs"));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "invalid_move_feedback")?.limitations.some((limitation) => limitation.includes("presentation-only")));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "completed_shelf")?.supportedStyleTokens?.includes("completedGlowStrength"));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "spirit_slot")?.supportedStyleTokens?.includes("spiritDisplayScale"));
assert.ok(sortPuzzleSlotTargets.find((target) => target.targetId === "spirit_slot")?.supportedStyleTokens?.includes("spiritVerticalOffset"));
const sortPuzzleToastTargets = getVisualGameAdapterSurfaceTargets("sort_puzzle", "reward_toast");
assert.strictEqual(sortPuzzleToastTargets[0].targetId, "win_reward_toast");
assert.strictEqual(sortPuzzleToastTargets[0].styleConfigPath, sortPuzzleFeedbackStyleConfigRelativePath);
const sortPuzzleAssetTargets = getVisualGameAdapterSurfaceTargets("sort_puzzle", "asset_replacement");
assert.strictEqual(sortPuzzleAssetTargets[0].targetId, "spirit_asset_presentation");
assert.strictEqual(sortPuzzleAssetTargets[0].directApply.support, "unsupported");
assert.strictEqual(sortPuzzleAssetTargets[0].assetReplacementSupport, "manual_required");
assert.strictEqual(sortPuzzleContract.getStyleConfigPath("slot_card", "spirit_slot"), sortPuzzleSpiritPresentationConfigRelativePath);
const cursorArenaDetection = detectCursorArenaProject([
  { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"latest\"}}" },
  { relativePath: "arena.html", text: "<script src=\"src/arena/systems/CursorAttackSystem.js\"></script>" },
  { relativePath: "src/arena/data/arenaBalanceConfig.js", text: "window.ARENA = { BALANCE_CONFIG: {} };" },
  { relativePath: "src/arena/systems/CursorAttackSystem.ts", text: "export class CursorAttackSystem { hit(enemy); combo(); }" },
  { relativePath: "src/arena/scenes/ArenaScene.ts", text: "export class ArenaScene extends Phaser.Scene { enemy cursor combo hit }" }
]);
assert.strictEqual(cursorArenaDetection.detected, true);
assert.strictEqual(cursorArenaDetection.confidence, "high");
assert.ok(cursorArenaDetection.evidence.some((entry) => entry.includes("CursorAttackSystem")));
const weakCursorArenaDetection = detectCursorArenaProject([{ relativePath: "src/scenes/MenuScene.ts", text: "arena settings" }]);
assert.strictEqual(weakCursorArenaDetection.detected, false);
const cursorArenaPanelTargets = getVisualGameAdapterSurfaceTargets("cursor_arena", "panel");
assert.deepStrictEqual(cursorArenaPanelTargets.map((target) => target.targetId), ["arena_hud_panel"]);
assert.strictEqual(cursorArenaPanelTargets[0].styleConfigPath, cursorArenaHudStyleConfigRelativePath);
assert.ok(cursorArenaPanelTargets[0].supportedStyleTokens?.includes("fillOpacity"));
assert.ok(cursorArenaPanelTargets[0].supportedStyleTokens?.includes("compactHudGuard"));
assert.ok(cursorArenaPanelTargets[0].limitations.some((limitation) => limitation.includes("compact enough")));
const cursorArenaCardTargets = getVisualGameAdapterSurfaceTargets("cursor_arena", "slot_card");
assert.deepStrictEqual(cursorArenaCardTargets.map((target) => target.targetId), ["upgrade_card"]);
assert.ok(cursorArenaCardTargets[0].manualChecks.some((check) => check.description.includes("affordable card")));
assert.ok(cursorArenaCardTargets[0].supportedStyleTokens?.includes("priceEmphasis"));
assert.ok(cursorArenaCardTargets[0].supportedStyleTokens?.includes("crowdingGuard"));
assert.ok(cursorArenaCardTargets[0].limitations.some((limitation) => limitation.includes("without changing upgrade cost")));
const cursorArenaFeedbackTargets = getVisualGameAdapterSurfaceTargets("cursor_arena", "reward_toast");
assert.deepStrictEqual(cursorArenaFeedbackTargets.map((target) => target.targetId), ["cursor_hit_feedback", "cursor_miss_feedback", "enemy_kill_feedback", "combo_feedback"]);
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "cursor_hit_feedback")?.supportedStyleTokens?.includes("enemyReadabilityGuard"));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "cursor_hit_feedback")?.supportedStyleTokens?.includes("impactScaleMax"));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "cursor_hit_feedback")?.limitations.some((limitation) => limitation.includes("do not obscure enemies")));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "cursor_miss_feedback")?.supportedStyleTokens?.includes("avoidErrorRedByDefault"));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "cursor_miss_feedback")?.limitations.some((limitation) => limitation.includes("subtle/neutral")));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "enemy_kill_feedback")?.limitations.some((limitation) => limitation.includes("enemy HP")));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "enemy_kill_feedback")?.supportedStyleTokens?.includes("sparkCountMax"));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "combo_feedback")?.supportedStyleTokens?.includes("positionOffsetY"));
assert.ok(cursorArenaFeedbackTargets.find((target) => target.targetId === "combo_feedback")?.supportedStyleTokens?.includes("gameplayOcclusionGuard"));
const cursorArenaBackgroundTargets = getVisualGameAdapterSurfaceTargets("cursor_arena", "background_readability");
assert.strictEqual(cursorArenaBackgroundTargets[0].targetId, "arena_background_readability");
assert.strictEqual(cursorArenaBackgroundTargets[0].styleConfigPath, cursorArenaBackgroundReadabilityConfigRelativePath);
assert.ok(cursorArenaBackgroundTargets[0].supportedStyleTokens?.includes("washoutGuard"));
assert.ok(cursorArenaBackgroundTargets[0].limitations.some((limitation) => limitation.includes("without washing out")));
assert.strictEqual(cursorArenaContract.getStyleConfigPath("slot_card", "upgrade_card"), cursorArenaUpgradeCardStyleConfigRelativePath);
assert.strictEqual(cursorArenaContract.getStyleConfigPath("reward_toast", "cursor_hit_feedback"), cursorArenaFeedbackStyleConfigRelativePath);
const cursorFallback = buildCursorArenaVisualFallbackTask({
  targetFile: "src/arena/ui/ArenaHud.ts",
  targetId: "arena_hud_panel",
  styleConfigPath: cursorArenaHudStyleConfigRelativePath
});
assert.deepStrictEqual(cursorFallback.allowedFiles, [cursorArenaHudStyleConfigRelativePath, "src/arena/ui/ArenaHud.ts"]);
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("Do not change economy")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("upgrade costs/effects/values")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("enemy HP/speed/spawn/damage")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("save schema/state persistence")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("Do not add player systems")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("auto-shooter behavior")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("unrelated Sort Puzzle")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("unrelated Monster Farm")));
assert.ok(cursorFallback.forbiddenFiles.some((file) => file.includes("projectile")));
assert.ok(cursorFallback.forbiddenFiles.some((file) => file.includes("upgrade cost/effect")));
assert.ok(cursorFallback.forbiddenFiles.some((file) => file.includes("enemy HP/speed/spawn/damage")));
assert.ok(cursorFallback.forbiddenFiles.some((file) => file.includes("ad/monetization")));
const spiritFallback = buildSortPuzzleSpiritSortSceneFallbackTask({
  targetFile: "src/scenes/SpiritSortScene.ts",
  targetId: "shelf_card",
  styleConfigPath: sortPuzzleShelfStyleConfigRelativePath
});
assert.deepStrictEqual(spiritFallback.allowedFiles, [sortPuzzleShelfStyleConfigRelativePath, "src/scenes/SpiritSortScene.ts"]);
assert.ok(spiritFallback.instructions.some((instruction) => instruction.includes("visual style integration")));
assert.ok(spiritFallback.instructions.some((instruction) => instruction.includes("Do not change SortRules")));
assert.ok(spiritFallback.forbiddenFiles.some((file) => file.includes("level data")));
const idleScopeContract = getVisualGameAdapterScopeMetadata("idle_monster_farm", "slot_card")!;
assert.ok(idleScopeContract.safe.some((group) => group.paths.includes(farmSlotStyleConfigRelativePath)));
assert.ok(idleScopeContract.suspicious.some((group) => group.paths.includes("src/scenes/FarmScene.ts")));
assert.ok(idleScopeContract.forbidden.some((group) => group.paths.includes("src/systems/saveSystem.ts")));
const sortPuzzleScopeContract = getVisualGameAdapterScopeMetadata("sort_puzzle", "slot_card")!;
assert.ok(sortPuzzleScopeContract.safe.some((group) => group.paths.includes(sortPuzzleShelfStyleConfigRelativePath)));
assert.ok(sortPuzzleScopeContract.suspicious.some((group) => group.paths.includes("src/**/SpiritSortScene.*")));
assert.ok(sortPuzzleScopeContract.forbidden.some((group) => group.paths.includes("src/**/SortRules.*")));
const cursorArenaScopeContract = getVisualGameAdapterScopeMetadata("cursor_arena", "panel")!;
assert.ok(cursorArenaScopeContract.safe.some((group) => group.paths.includes(cursorArenaHudStyleConfigRelativePath)));
assert.ok(cursorArenaScopeContract.suspicious.some((group) => group.paths.includes("src/**/ArenaScene.*")));
assert.ok(cursorArenaScopeContract.forbidden.some((group) => group.paths.includes("src/**/projectile/**")));
const adapterSummaries = summarizeRegisteredVisualGameAdapterContracts();
assert.deepStrictEqual(adapterSummaries.map((summary) => summary.adapterId), ["idle_monster_farm", "generic_phaser", "sort_puzzle", "cursor_arena"]);
assert.ok(adapterSummaries.every((summary) => summary.valid));
assert.strictEqual(adapterSummaries.find((summary) => summary.adapterId === "idle_monster_farm")?.supportedSurfaceCount, visualSurfacePickerOrder.length);
assert.strictEqual(adapterSummaries.find((summary) => summary.adapterId === "generic_phaser")?.supportedSurfaceCount, visualSurfacePickerOrder.length);
assert.strictEqual(adapterSummaries.find((summary) => summary.adapterId === "sort_puzzle")?.supportedSurfaceCount, 3);
assert.strictEqual(adapterSummaries.find((summary) => summary.adapterId === "cursor_arena")?.supportedSurfaceCount, 4);
assert.strictEqual(adapterSummaries.find((summary) => summary.adapterId === "sort_puzzle")?.directApplyCapableSurfaceCount, 2);
assert.strictEqual(adapterSummaries.find((summary) => summary.adapterId === "cursor_arena")?.directApplyCapableSurfaceCount, 4);
assert.ok(adapterSummaries.filter((summary) => summary.adapterId !== "cursor_arena").every((summary) => summary.fallbackOnlySurfaceCount >= 1));
assert.strictEqual(summarizeVisualGameAdapterContract(idleContract).knownLimitationsCount > 0, true);
const duplicateTargetAdapter: VisualGameAdapter = {
  ...idleContract,
  getSurfaceTargets: () => [idleSlotTargets[0], { ...idleSlotTargets[0] }]
};
assert.strictEqual(validateVisualGameAdapter(duplicateTargetAdapter).ok, false);
assert.ok(validateVisualGameAdapter(duplicateTargetAdapter).errors.some((error) => error.code === "duplicate_target_id"));
const forbiddenSafeAdapter: VisualGameAdapter = {
  ...idleContract,
  getSafeScopes: () => ({
    safe: [{ paths: ["src/systems/saveSystem.ts"], reason: "bad safe path" }],
    suspicious: [],
    forbidden: []
  })
};
assert.ok(validateVisualGameAdapter(forbiddenSafeAdapter).errors.some((error) => error.code === "forbidden_path_marked_safe"));
const invalidExecutableTarget: VisualAdapterSurfaceTarget = {
  ...idleSlotTargets[0],
  styleConfigPath: undefined,
  directApply: { support: "executable" }
};
assert.ok(validateVisualAdapterSurfaceTarget(idleContract, invalidExecutableTarget).errors.some((error) => error.code === "direct_apply_missing_safe_config"));
const invalidStateTarget: VisualAdapterSurfaceTarget = {
  ...idleSlotTargets[0],
  directApply: { support: "surprise" as VisualAdapterSurfaceTarget["directApply"]["support"] }
};
assert.ok(validateVisualAdapterSurfaceTarget(idleContract, invalidStateTarget).errors.some((error) => error.code === "direct_apply_state_unknown"));
const missingManualCheckTarget: VisualAdapterSurfaceTarget = {
  ...idleSlotTargets[0],
  manualChecks: []
};
assert.ok(validateVisualAdapterSurfaceTarget(idleContract, missingManualCheckTarget).errors.some((error) => error.code === "manual_checks_missing"));
const idleFarmSlotTemplate = resolveVisualDirectApplyTemplate({
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  targetId: "farm_slots",
  intent: "style_config_direct_apply"
});
assert.ok(idleFarmSlotTemplate);
assert.strictEqual(idleFarmSlotTemplate.templateId, "idle-monster-farm.slot_card.style-config.v1");
assert.ok(idleFarmSlotTemplate.supportedOperationTypes.includes("write_style_config"));
assert.ok(idleFarmSlotTemplate.requiredStyleConfigPaths.includes(farmSlotStyleConfigRelativePath));

const genericSafeTemplate = resolveVisualDirectApplyTemplate({
  adapterId: "generic_phaser",
  surfaceType: "button",
  targetId: "manual_target",
  intent: "style_config_direct_apply"
});
assert.ok(genericSafeTemplate);
assert.strictEqual(genericSafeTemplate.templateId, "generic-phaser.button.safe-style-config.v1");
assert.ok(directApplyRegistry.fallbackTemplates.some((template) => template.templateId === "generic-phaser.fallback-task.v1"));

const unsupportedAssetTemplate = resolveVisualDirectApplyTemplate({
  adapterId: "generic_phaser",
  surfaceType: "asset_replacement",
  targetId: "manual_target",
  intent: "style_config_direct_apply"
});
assert.strictEqual(unsupportedAssetTemplate, undefined);

const sortPuzzleShelfTemplate = resolveVisualDirectApplyTemplate({
  adapterId: "sort_puzzle",
  surfaceType: "slot_card",
  targetId: "shelf_card",
  intent: "style_config_direct_apply"
});
assert.ok(sortPuzzleShelfTemplate);
assert.strictEqual(sortPuzzleShelfTemplate.templateId, "sort-puzzle.slot_card.shelf_card.safe-style-config.v1");
assert.deepStrictEqual(sortPuzzleShelfTemplate.requiredStyleConfigPaths, [sortPuzzleShelfStyleConfigRelativePath]);
const sortPuzzleAssetTemplate = resolveVisualDirectApplyTemplate({
  adapterId: "sort_puzzle",
  surfaceType: "asset_replacement",
  targetId: "spirit_asset_presentation",
  intent: "style_config_direct_apply"
});
assert.strictEqual(sortPuzzleAssetTemplate, undefined);

const safeDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  targetId: "farm_slots",
  styleConfigPath: farmSlotStyleConfigRelativePath,
  candidatePaths: [farmSlotStyleConfigRelativePath]
});
assert.strictEqual(safeDirectApplyPlan.executable, true);
assert.strictEqual(safeDirectApplyPlan.steps.find((step) => step.operationType === "run_scope_guard")?.order, 1);
assert.ok((safeDirectApplyPlan.steps.find((step) => step.operationType === "create_rollback_snapshot")?.order ?? 0) < (safeDirectApplyPlan.steps.find((step) => step.operationType === "write_style_config")?.order ?? 0));
assert.strictEqual(safeDirectApplyPlan.scopeGuardResult.recommendedAction, "allow");
assert.deepStrictEqual(safeDirectApplyPlan.writePaths, [farmSlotStyleConfigRelativePath]);

const sortPuzzleDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "sort_puzzle",
  surfaceType: "slot_card",
  targetId: "shelf_card",
  candidatePaths: [sortPuzzleShelfStyleConfigRelativePath]
});
assert.strictEqual(sortPuzzleDirectApplyPlan.executable, true);
assert.deepStrictEqual(sortPuzzleDirectApplyPlan.writePaths, [sortPuzzleShelfStyleConfigRelativePath]);
assert.strictEqual(sortPuzzleDirectApplyPlan.scopeGuardResult.recommendedAction, "allow");

const sortPuzzleSceneDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "sort_puzzle",
  surfaceType: "slot_card",
  targetId: "shelf_card",
  candidatePaths: [sortPuzzleShelfStyleConfigRelativePath, "src/scenes/SpiritSortScene.ts"]
});
assert.strictEqual(sortPuzzleSceneDirectApplyPlan.executable, false);
assert.strictEqual(sortPuzzleSceneDirectApplyPlan.scopeGuardResult.recommendedAction, "warn");
assert.ok(sortPuzzleSceneDirectApplyPlan.blockingReasons.some((reason) => reason.includes("Direct apply stays disabled")));

const cursorArenaDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "cursor_arena",
  surfaceType: "panel",
  targetId: "arena_hud_panel",
  candidatePaths: [cursorArenaHudStyleConfigRelativePath]
});
assert.strictEqual(cursorArenaDirectApplyPlan.executable, true);
assert.deepStrictEqual(cursorArenaDirectApplyPlan.writePaths, [cursorArenaHudStyleConfigRelativePath]);
assert.strictEqual(cursorArenaDirectApplyPlan.scopeGuardResult.recommendedAction, "allow");
const cursorArenaSceneDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "cursor_arena",
  surfaceType: "panel",
  targetId: "arena_hud_panel",
  candidatePaths: [cursorArenaHudStyleConfigRelativePath, "src/arena/scenes/ArenaScene.ts"]
});
assert.strictEqual(cursorArenaSceneDirectApplyPlan.executable, false);
assert.strictEqual(cursorArenaSceneDirectApplyPlan.scopeGuardResult.recommendedAction, "warn");
const cursorArenaForbiddenDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "cursor_arena",
  surfaceType: "reward_toast",
  targetId: "cursor_hit_feedback",
  candidatePaths: [cursorArenaFeedbackStyleConfigRelativePath, "src/arena/config/enemyHpConfig.js"]
});
assert.strictEqual(cursorArenaForbiddenDirectApplyPlan.executable, false);
assert.strictEqual(cursorArenaForbiddenDirectApplyPlan.scopeGuardResult.recommendedAction, "block");
assert.ok(cursorArenaForbiddenDirectApplyPlan.scopeGuardResult.violations.some((violation) => violation.reasonCode === "cursor_arena_balance_file"));

const cursorArenaSafeConfigScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "reward_toast",
  targetId: "combo_feedback",
  candidatePaths: [cursorArenaFeedbackStyleConfigRelativePath]
});
assert.strictEqual(cursorArenaSafeConfigScope.recommendedAction, "allow");
assert.strictEqual(cursorArenaSafeConfigScope.counts.safe, 1);

const cursorArenaSceneScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "background_readability",
  targetId: "arena_background_readability",
  candidatePaths: ["src/arena/scenes/ArenaScene.js", "src/arena/systems/ImpactEffectSystem.js"]
});
assert.strictEqual(cursorArenaSceneScope.recommendedAction, "warn");
assert.strictEqual(cursorArenaSceneScope.counts.suspicious, 2);

const cursorArenaUpgradeEconomyScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "slot_card",
  targetId: "upgrade_card",
  candidatePaths: ["src/arena/data/upgradeCostConfig.js", "src/arena/economy/energyBank.js"]
});
assert.strictEqual(cursorArenaUpgradeEconomyScope.recommendedAction, "block");
assert.ok(cursorArenaUpgradeEconomyScope.violations.some((violation) => violation.reasonCode === "cursor_arena_balance_file"));
assert.ok(cursorArenaUpgradeEconomyScope.violations.some((violation) => violation.reasonCode === "economy_or_balance_file"));

const cursorArenaEnemyBalanceScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "reward_toast",
  targetId: "enemy_kill_feedback",
  candidatePaths: ["src/arena/data/enemySpeedConfig.js", "src/arena/systems/EnemySpawnSystem.js", "src/arena/data/arenaBalanceConfig.js"]
});
assert.strictEqual(cursorArenaEnemyBalanceScope.recommendedAction, "block");
assert.strictEqual(cursorArenaEnemyBalanceScope.counts.forbidden, 3);

const cursorArenaPlayerProjectileScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "reward_toast",
  targetId: "cursor_hit_feedback",
  candidatePaths: ["src/arena/player/PlayerController.js", "src/arena/systems/ProjectileSystem.js", "src/arena/systems/AutoShooterSystem.js"]
});
assert.strictEqual(cursorArenaPlayerProjectileScope.recommendedAction, "block");
assert.ok(cursorArenaPlayerProjectileScope.violations.every((violation) => violation.reasonCode === "cursor_arena_player_projectile_file"));

const unrelatedSortAndMonsterFarmScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "panel",
  targetId: "arena_hud_panel",
  candidatePaths: ["src/solver/SortSolver.ts", "src/data/spiritSortLevels.ts", "src/systems/saveSystem.ts", "src/systems/monsterMergeSystem.ts", "src/data/quests.ts"]
});
assert.strictEqual(unrelatedSortAndMonsterFarmScope.recommendedAction, "block");
assert.ok(unrelatedSortAndMonsterFarmScope.violations.some((violation) => violation.reasonCode === "sort_puzzle_rule_file"));
assert.ok(unrelatedSortAndMonsterFarmScope.violations.some((violation) => violation.reasonCode === "merge_rule_file"));
assert.ok(unrelatedSortAndMonsterFarmScope.violations.some((violation) => violation.reasonCode === "quest_reward_file"));

const forbiddenDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "idle_monster_farm",
  surfaceType: "slot_card",
  targetId: "farm_slots",
  styleConfigPath: "src/systems/saveSystem.ts",
  candidatePaths: ["src/systems/saveSystem.ts"]
});
assert.strictEqual(forbiddenDirectApplyPlan.executable, false);
assert.strictEqual(forbiddenDirectApplyPlan.scopeGuardResult.recommendedAction, "block");
assert.ok(forbiddenDirectApplyPlan.blockingReasons.some((reason) => reason.includes("Scope guard blocked direct apply")));
assert.ok(forbiddenDirectApplyPlan.blockingReasons.some((reason) => reason.includes("src/systems/saveSystem.ts")));

const suspiciousDirectApplyPlan = buildVisualDirectApplyPlan({
  adapterId: "generic_phaser",
  surfaceType: "button",
  targetId: "manual_target",
  styleConfigPath: genericStyleConfigRelativePath("button"),
  candidatePaths: [genericStyleConfigRelativePath("button"), "src/ui/ButtonView.ts"]
});
assert.strictEqual(suspiciousDirectApplyPlan.executable, false);
assert.strictEqual(suspiciousDirectApplyPlan.scopeGuardResult.recommendedAction, "warn");
assert.ok(suspiciousDirectApplyPlan.blockingReasons.some((reason) => reason.includes("Direct apply stays disabled")));
assert.ok(suspiciousDirectApplyPlan.fallbackAvailable);

const fallbackTask = buildVisualDirectApplyFallbackTask(suspiciousDirectApplyPlan);
assert.ok(fallbackTask);
assert.strictEqual(fallbackTask.templateId, "generic-phaser.fallback-task.v1");
assert.ok(fallbackTask.suspiciousFiles.some((file) => file.includes("src/ui/ButtonView.ts")));
assert.ok(fallbackTask.instructions.some((instruction) => instruction.includes("not part of the normal polish loop")));
assert.ok(fallbackTask.instructions.some((instruction) => instruction.includes("Do not touch gameplay")));

const directApplyWorkspace = makeTempWorkspace("direct-apply");
try {
  writeWorkspaceFile(directApplyWorkspace, farmSlotStyleConfigRelativePath, "{\"preset\":\"before\"}");
  const runnerResult = executeVisualDirectApplyPlan(directApplyWorkspace, safeDirectApplyPlan, [{
    relativePath: farmSlotStyleConfigRelativePath,
    text: "{\"preset\":\"after\"}\n"
  }], new Date("2026-06-26T04:00:00.000Z"));
  assert.strictEqual(runnerResult.ok, true);
  assert.deepStrictEqual(runnerResult.changedFiles, [farmSlotStyleConfigRelativePath]);
  assert.ok(runnerResult.rollbackPaths[0].startsWith(`${visualRollbackRelativeDir}/2026-06-26T04-00-00-000Z-farm-slot-style.json`));
  assert.strictEqual(readWorkspaceFile(directApplyWorkspace, farmSlotStyleConfigRelativePath), "{\"preset\":\"after\"}\n");
  assert.strictEqual(fs.existsSync(path.join(directApplyWorkspace, "src", "systems", "saveSystem.ts")), false);
} finally {
  cleanupTempWorkspace(directApplyWorkspace);
}

const sortPuzzleDirectApplyWorkspace = makeTempWorkspace("sort-puzzle-direct-apply");
try {
  writeWorkspaceFile(sortPuzzleDirectApplyWorkspace, sortPuzzleShelfStyleConfigRelativePath, "{\"preset\":\"before\"}");
  const runnerResult = executeVisualDirectApplyPlan(sortPuzzleDirectApplyWorkspace, sortPuzzleDirectApplyPlan, [{
    relativePath: sortPuzzleShelfStyleConfigRelativePath,
    text: "{\"surfaceType\":\"slot_card\",\"targetId\":\"shelf_card\",\"values\":{\"completedGlowStrength\":1.2}}\n"
  }], new Date("2026-06-26T06:00:00.000Z"));
  assert.strictEqual(runnerResult.ok, true);
  assert.deepStrictEqual(runnerResult.changedFiles, [sortPuzzleShelfStyleConfigRelativePath]);
  assert.ok(runnerResult.rollbackPaths[0].startsWith(`${visualRollbackRelativeDir}/2026-06-26T06-00-00-000Z-sort-puzzle-shelf-style.json`));
  assert.strictEqual(fs.existsSync(path.join(sortPuzzleDirectApplyWorkspace, "src", "scenes", "SpiritSortScene.ts")), false);
  assert.strictEqual(readWorkspaceFile(sortPuzzleDirectApplyWorkspace, sortPuzzleShelfStyleConfigRelativePath).includes("completedGlowStrength"), true);
} finally {
  cleanupTempWorkspace(sortPuzzleDirectApplyWorkspace);
}

const cursorArenaDirectApplyWorkspace = makeTempWorkspace("cursor-arena-direct-apply");
try {
  writeWorkspaceFile(cursorArenaDirectApplyWorkspace, cursorArenaHudStyleConfigRelativePath, "{\"preset\":\"before\"}");
  const runnerResult = executeVisualDirectApplyPlan(cursorArenaDirectApplyWorkspace, cursorArenaDirectApplyPlan, [{
    relativePath: cursorArenaHudStyleConfigRelativePath,
    text: "{\"surfaceType\":\"panel\",\"targetId\":\"arena_hud_panel\",\"values\":{\"panelFillColor\":\"#121212\"}}\n"
  }], new Date("2026-06-26T07:00:00.000Z"));
  assert.strictEqual(runnerResult.ok, true);
  assert.deepStrictEqual(runnerResult.changedFiles, [cursorArenaHudStyleConfigRelativePath]);
  assert.ok(runnerResult.rollbackPaths[0].startsWith(`${visualRollbackRelativeDir}/2026-06-26T07-00-00-000Z-cursor-arena-hud-style.json`));
  assert.strictEqual(fs.existsSync(path.join(cursorArenaDirectApplyWorkspace, "src", "arena", "data", "arenaBalanceConfig.js")), false);
  assert.strictEqual(readWorkspaceFile(cursorArenaDirectApplyWorkspace, cursorArenaHudStyleConfigRelativePath).includes("panelFillColor"), true);
  const rerunResult = executeVisualDirectApplyPlan(cursorArenaDirectApplyWorkspace, cursorArenaDirectApplyPlan, [{
    relativePath: cursorArenaHudStyleConfigRelativePath,
    text: "{\"surfaceType\":\"panel\",\"targetId\":\"arena_hud_panel\",\"values\":{\"fillOpacity\":0.82}}\n"
  }], new Date("2026-06-26T07:05:00.000Z"));
  assert.strictEqual(rerunResult.ok, true);
  assert.ok(rerunResult.rollbackPaths[0].startsWith(`${visualRollbackRelativeDir}/2026-06-26T07-05-00-000Z-cursor-arena-hud-style.json`));
  assert.strictEqual(readWorkspaceFile(cursorArenaDirectApplyWorkspace, cursorArenaHudStyleConfigRelativePath).includes("fillOpacity"), true);
} finally {
  cleanupTempWorkspace(cursorArenaDirectApplyWorkspace);
}

const unplannedWriteWorkspace = makeTempWorkspace("direct-apply-unplanned");
try {
  const runnerResult = executeVisualDirectApplyPlan(unplannedWriteWorkspace, safeDirectApplyPlan, [{
    relativePath: "src/systems/saveSystem.ts",
    text: "unsafe"
  }], new Date("2026-06-26T04:00:00.000Z"));
  assert.strictEqual(runnerResult.ok, false);
  assert.ok(runnerResult.errors.some((error) => error.includes("not in the approved direct-apply plan")));
  assert.strictEqual(fs.existsSync(path.join(unplannedWriteWorkspace, "src", "systems", "saveSystem.ts")), false);
} finally {
  cleanupTempWorkspace(unplannedWriteWorkspace);
}

const blockedRunnerWorkspace = makeTempWorkspace("direct-apply-blocked");
try {
  const blockedRunnerResult = executeVisualDirectApplyPlan(blockedRunnerWorkspace, suspiciousDirectApplyPlan, [{
    relativePath: genericStyleConfigRelativePath("button"),
    text: "{}"
  }]);
  assert.strictEqual(blockedRunnerResult.ok, false);
  assert.ok(blockedRunnerResult.fallbackTask);
} finally {
  cleanupTempWorkspace(blockedRunnerWorkspace);
}

const theme = buildVisualThemeFile({
  themeName: "Readable Cards",
  sourceAdapterId: "idle_monster_farm",
  surfaces: [{
    surfaceType: "slot_card",
    sourceTargetId: "farm_slots",
    styleConfigPath: farmSlotStyleConfigRelativePath,
    styleTokens: { fillColor: "#172033", borderColor: "#f8d36a", cornerRadius: 8 }
  }],
  createdAt: new Date("2026-06-26T08:00:00.000Z"),
  notes: "portable card readability"
});
assert.strictEqual(theme.schemaVersion, "visual-theme/v1");
assert.deepStrictEqual(theme.compatibleSurfaceIds, ["slot_card"]);
assert.strictEqual(safeVisualThemeRelativePath("Readable Cards"), `${visualThemeFolderRelativePath}/readable-cards.json`);
assert.strictEqual(validateVisualThemeFile(theme).ok, true);
assert.strictEqual(validateVisualThemeFile({ ...theme, schemaVersion: "visual-theme/v999" }).ok, false);
const themeScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  candidatePaths: [`${visualThemeFolderRelativePath}/readable-cards.json`, visualThemeIndexRelativePath, ".game-polish-lab/styles/imported-card.json"]
});
assert.strictEqual(themeScope.recommendedAction, "allow");
const incompatibleThemePlan = planVisualThemeImport(theme, { targetAdapterId: "cursor_arena", targetSurfaceType: "panel", targetId: "arena_hud_panel" });
assert.strictEqual(incompatibleThemePlan.ok, false);
assert.ok(incompatibleThemePlan.reasons.some((reason) => reason.includes("no compatible panel")));
const cursorThemePlan = planVisualThemeImport(theme, { targetAdapterId: "cursor_arena", targetSurfaceType: "slot_card", targetId: "upgrade_card" });
assert.strictEqual(cursorThemePlan.ok, true);
assert.strictEqual(cursorThemePlan.targetStyleConfigPath, cursorArenaUpgradeCardStyleConfigRelativePath);
const assetTheme = buildVisualThemeFile({
  themeName: "Asset Review",
  sourceAdapterId: "idle_monster_farm",
  surfaces: [{ surfaceType: "asset_replacement", styleTokens: { expectedKind: "enemy" } }]
});
assert.strictEqual(planVisualThemeImport(assetTheme, { targetAdapterId: "cursor_arena", targetSurfaceType: "asset_replacement", targetId: "arena_asset_presentation" }).ok, false);
const themeWorkspace = makeTempWorkspace("theme-transfer");
try {
  const exportedPath = exportVisualThemeFile(themeWorkspace, theme);
  assert.strictEqual(exportedPath, `${visualThemeFolderRelativePath}/readable-cards.json`);
  assert.ok(fs.existsSync(path.join(themeWorkspace, ...visualThemeIndexRelativePath.split("/"))));
  const themeIndex = JSON.parse(readWorkspaceFile(themeWorkspace, visualThemeIndexRelativePath)) as { themes: Array<{ themeId: string; path: string }> };
  assert.deepStrictEqual(themeIndex.themes.map((entry) => entry.themeId), ["readable-cards"]);
  assert.strictEqual(themeIndex.themes[0].path, `${visualThemeFolderRelativePath}/readable-cards.json`);
  assert.strictEqual(fs.existsSync(path.join(themeWorkspace, "src", "scenes", "FarmScene.ts")), false);
  writeWorkspaceFile(themeWorkspace, cursorArenaUpgradeCardStyleConfigRelativePath, "{\"preset\":\"before\"}");
  const imported = importVisualThemeFile(themeWorkspace, theme, cursorThemePlan, new Date("2026-06-26T08:30:00.000Z"));
  assert.strictEqual(imported.ok, true);
  assert.deepStrictEqual(imported.changedFiles, [cursorArenaUpgradeCardStyleConfigRelativePath]);
  assert.ok(imported.rollbackPaths[0].startsWith(`${visualRollbackRelativeDir}/2026-06-26T08-30-00-000Z-cursor-arena-upgrade-card-style.json`));
  assert.strictEqual(fs.existsSync(path.join(themeWorkspace, "src", "arena", "scenes", "ArenaScene.ts")), false);
  const importedConfig = JSON.parse(readWorkspaceFile(themeWorkspace, cursorArenaUpgradeCardStyleConfigRelativePath)) as { presetName: string; importStatus: string; runtimeApplied: boolean; values: Record<string, unknown> };
  assert.strictEqual(importedConfig.presetName, "Readable Cards");
  assert.strictEqual(importedConfig.importStatus, "config_only");
  assert.strictEqual(importedConfig.runtimeApplied, false);
  assert.deepStrictEqual(Object.keys(importedConfig.values).sort(), ["borderColor", "cornerRadius", "fillColor"]);
} finally {
  cleanupTempWorkspace(themeWorkspace);
}

const forbiddenTheme = buildVisualThemeFile({
  themeName: "Unsafe Values",
  sourceAdapterId: "sort_puzzle",
  surfaces: [{
    surfaceType: "slot_card",
    sourceTargetId: "shelf_card",
    styleTokens: { fillColor: "#112233", economyBalance: 9, saveStateVersion: 2, levelRules: ["bad"] }
  }]
});
const forbiddenThemeValidation = validateVisualThemeFile(forbiddenTheme);
assert.strictEqual(forbiddenThemeValidation.ok, true);
assert.ok(forbiddenThemeValidation.warnings.some((warning) => warning.includes("economyBalance")));
assert.ok(!Object.keys(forbiddenTheme.surfaces[0].normalizedStyleTokens).includes("economyBalance"));
assert.ok(!JSON.stringify(forbiddenTheme.surfaces[0].normalizedStyleTokens).includes("saveStateVersion"));

const generatedThemeWorkspace = makeTempWorkspace("theme-generated-configs");
try {
  writeWorkspaceFile(generatedThemeWorkspace, sortPuzzleShelfStyleConfigRelativePath, JSON.stringify({
    schemaVersion: 1,
    surfaceType: "slot_card",
    adapterTarget: "sort_puzzle.shelf_card",
    presetName: "Shelf Candy",
    updatedAt: "2026-06-26T08:40:00.000Z",
    values: {
      shelfWidth: 88,
      shelfHeight: 128,
      fillColor: "#203040",
      borderColor: "#ffd166",
      cornerRadius: 10,
      invalidMoveRule: "must-not-export"
    }
  }));
  writeWorkspaceFile(generatedThemeWorkspace, cursorArenaHudStyleConfigRelativePath, JSON.stringify({
    schemaVersion: 1,
    surfaceType: "panel",
    adapterTarget: "cursor_arena.arena_hud_panel",
    presetName: "Readable HUD",
    updatedAt: "2026-06-26T08:41:00.000Z",
    values: {
      fillColor: "#0f172a",
      borderColor: "#67e8f9",
      cornerRadius: 6,
      titleTextSize: 16
    }
  }));
  writeWorkspaceFile(generatedThemeWorkspace, cursorArenaBackgroundReadabilityConfigRelativePath, JSON.stringify({
    schemaVersion: 1,
    surfaceType: "background_readability",
    adapterTarget: "cursor_arena.arena_background_readability",
    presetName: "Readable Arena",
    updatedAt: "2026-06-26T08:42:00.000Z",
    values: {
      contrastOverlayColor: "#000000",
      contrastOverlayOpacity: 0.35,
      brightness: 0.9,
      contrast: 1.1
    }
  }));
  const exportedFromConfigs = exportVisualThemeFromStyleConfigs(generatedThemeWorkspace, {
    themeName: "Cross Game Pack",
    sourceAdapterId: "sort_puzzle",
    sourceWorkspaceLabel: "phaser-sort-puzzle-sample",
    selections: [{
      surfaceType: "slot_card",
      targetId: "shelf_card",
      targetLabel: "Sort Puzzle Shelf Card",
      styleConfigPath: sortPuzzleShelfStyleConfigRelativePath
    }, {
      surfaceType: "panel",
      targetId: "arena_hud_panel",
      targetLabel: "Cursor Arena HUD",
      styleConfigPath: cursorArenaHudStyleConfigRelativePath
    }, {
      surfaceType: "background_readability",
      targetId: "arena_background_readability",
      targetLabel: "Cursor Arena Background",
      styleConfigPath: cursorArenaBackgroundReadabilityConfigRelativePath
    }],
    createdAt: new Date("2026-06-26T08:45:00.000Z"),
    exportSource: "style_config"
  });
  assert.strictEqual(exportedFromConfigs.relativePath, `${visualThemeFolderRelativePath}/cross-game-pack.json`);
  assert.ok(fs.existsSync(path.join(generatedThemeWorkspace, ...visualThemeIndexRelativePath.split("/"))));
  assert.deepStrictEqual(exportedFromConfigs.theme.genericSurfaceTypes.sort(), ["background_readability", "hud", "slot_card"]);
  assert.ok(exportedFromConfigs.theme.surfaces.some((surface) => surface.surfaceType === "slot_card" && surface.sourceTargetId === "shelf_card"));
  assert.ok(exportedFromConfigs.theme.surfaces.some((surface) => surface.surfaceType === "hud" && surface.compatibleSurfaceTypes.includes("panel")));
  const shelfThemeSurface = exportedFromConfigs.theme.surfaces.find((surface) => surface.sourceTargetId === "shelf_card")!;
  assert.ok(!JSON.stringify(shelfThemeSurface.normalizedStyleTokens).includes("invalidMoveRule"));
  assert.ok(!JSON.stringify(shelfThemeSurface.styleConfigEntries).includes("invalidMoveRule"));
  assert.ok(!JSON.stringify(shelfThemeSurface.adapterSpecificConfig).includes("invalidMoveRule"));
  const adapterPlans = planVisualThemeImportForAdapter(exportedFromConfigs.theme, { targetAdapterId: "generic_phaser" });
  assert.ok(adapterPlans.plans.some((plan) => plan.targetStyleConfigPath === genericStyleConfigRelativePath("slot_card")));
  assert.ok(adapterPlans.plans.some((plan) => plan.targetStyleConfigPath === genericManualStyleConfigRelativePath("hud")));
  assert.ok(adapterPlans.plans.some((plan) => plan.targetStyleConfigPath === genericStyleConfigRelativePath("background_readability")));
  const partialSortPuzzlePlans = planVisualThemeImportForAdapter(exportedFromConfigs.theme, { targetAdapterId: "sort_puzzle" });
  assert.ok(partialSortPuzzlePlans.plans.some((plan) => plan.targetStyleConfigPath === sortPuzzleShelfStyleConfigRelativePath));
  assert.ok(partialSortPuzzlePlans.skipped.some((skipped) => skipped.surfaceType === "hud"));
  assert.ok(partialSortPuzzlePlans.skipped.some((skipped) => skipped.surfaceType === "background_readability"));
  writeWorkspaceFile(generatedThemeWorkspace, genericStyleConfigRelativePath("slot_card"), "{\"preset\":\"before generic\"}");
  const genericImportResult = importVisualThemeToAdapter(generatedThemeWorkspace, exportedFromConfigs.theme, {
    targetAdapterId: "generic_phaser",
    now: new Date("2026-06-26T08:50:00.000Z")
  });
  assert.strictEqual(genericImportResult.ok, true);
  assert.ok(genericImportResult.changedFiles.includes(genericStyleConfigRelativePath("slot_card")));
  assert.ok(genericImportResult.changedFiles.includes(genericManualStyleConfigRelativePath("hud")!));
  assert.ok(genericImportResult.changedFiles.includes(genericStyleConfigRelativePath("background_readability")));
  assert.ok(genericImportResult.rollbackPaths.some((rollbackPath) => rollbackPath.includes("generic-slot-card-style.json")));
  const genericSlotImport = JSON.parse(readWorkspaceFile(generatedThemeWorkspace, genericStyleConfigRelativePath("slot_card"))) as { importStatus: string; runtimeApplied: boolean; values: Record<string, unknown> };
  assert.strictEqual(genericSlotImport.importStatus, "config_only");
  assert.strictEqual(genericSlotImport.runtimeApplied, false);
  assert.strictEqual(genericSlotImport.values.fillColor, "#203040");
  assert.strictEqual(fs.existsSync(path.join(generatedThemeWorkspace, "src", "systems", "ProgressSave.js")), false);
} finally {
  cleanupTempWorkspace(generatedThemeWorkspace);
}

assert.deepStrictEqual(validateScreenshotAnnotationRect({ x: 0, y: 1, width: 120, height: 80 }), []);
assert.ok(validateScreenshotAnnotationRect({ x: -1, y: 0, width: 0, height: 10 }).length >= 2);
assert.ok(validateScreenshotAnnotationRect({ x: 90, y: 0, width: 20, height: 10 }, { width: 100, height: 100 }).some((error) => error.includes("width")));
assert.deepStrictEqual(normalizeScreenshotAnnotationRect({ x: 10, y: 20, width: 50, height: 40 }, { width: 200, height: 100 }), {
  xPct: 0.05,
  yPct: 0.2,
  widthPct: 0.25,
  heightPct: 0.4
});
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "idle_monster_farm", surfaceType: "slot_card" }).targetId, "farm_slots");
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "sort_puzzle", surfaceType: "slot_card" }).ambiguous, true);
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "sort_puzzle", surfaceType: "slot_card", targetSurfaceId: "shelf_card" }).styleConfigPath, sortPuzzleShelfStyleConfigRelativePath);
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "cursor_arena", surfaceType: "hud" }).targetId, "arena_hud_panel");
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "cursor_arena", surfaceType: "impact_feedback" }).ambiguous, true);
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "generic_phaser", surfaceType: "impact_feedback", targetSurfaceId: "manual_impact_feedback" }).styleConfigPath, genericManualStyleConfigRelativePath("impact_feedback"));
const screenshotWorkspace = makeTempWorkspace("screenshot-note");
try {
  writeWorkspaceBinaryFile(screenshotWorkspace, "captures/problem.png", makePngHeader(200, 100));
  assert.deepStrictEqual(validateScreenshotImagePath(screenshotWorkspace, "captures/problem.png"), []);
  assert.ok(validateScreenshotImagePath(screenshotWorkspace, "captures/missing.gif").some((error) => error.includes("does not exist")));
  assert.strictEqual(readScreenshotImageMetadata(screenshotWorkspace, "captures/problem.png")?.width, 200);
  const noteResult = buildScreenshotAnnotationNote({
    screenshotPath: "captures/problem.png",
    markedRect: { x: 4, y: 8, width: 120, height: 90 },
    surfaceType: "hud",
    adapterId: "cursor_arena",
    targetSurfaceId: "arena_hud_panel",
    note: "HUD too crowded over the boss timer",
    severity: "high",
    createdAt: new Date("2026-06-26T09:00:00.000Z"),
    workspaceLabel: "arena-sample",
    imageMetadata: readScreenshotImageMetadata(screenshotWorkspace, "captures/problem.png")
  });
  assert.strictEqual(noteResult.ok, true);
  assert.ok(noteResult.note);
  assert.strictEqual(noteResult.note?.annotationId, "2026-06-26t09-00-00-000z-hud-cursor_arena");
  assert.strictEqual(noteResult.note?.status, "draft");
  assert.strictEqual(noteResult.note?.severity, "high");
  assert.strictEqual(noteResult.note?.targetMapping?.targetId, "arena_hud_panel");
  assert.strictEqual(noteResult.note?.generatedConfigPath, cursorArenaHudStyleConfigRelativePath);
  assert.strictEqual(noteResult.note?.normalizedRect?.xPct, 0.02);
  assert.strictEqual(noteResult.note?.suggestedNextAction.visualOnly, true);
  assert.strictEqual(screenshotAnnotationRelativePath(noteResult.note!), `${screenshotAnnotationsFolderRelativePath}/2026-06-26t09-00-00-000z-hud-cursor_arena.json`);
  assert.strictEqual(screenshotNotesFolderRelativePath, screenshotAnnotationsFolderRelativePath);
  const notePath = writeScreenshotAnnotationNote(screenshotWorkspace, noteResult.note!);
  assert.strictEqual(notePath, `${screenshotAnnotationsFolderRelativePath}/2026-06-26t09-00-00-000z-hud-cursor_arena.json`);
  assert.strictEqual(fs.existsSync(path.join(screenshotWorkspace, ...screenshotAnnotationIndexRelativePath.split("/"))), true);
  const taskText = buildScreenshotAnnotationTaskMarkdown(noteResult.note!);
  assert.ok(taskText.includes("HUD too crowded over the boss timer"));
  assert.ok(taskText.includes("Marked rectangle: x 4, y 8, width 120, height 90"));
  assert.ok(taskText.includes("Do not change save schema"));
  const fallbackTask = buildScreenshotAnnotationFallbackTask(noteResult.note!);
  assert.ok(JSON.stringify(fallbackTask).includes("Use the screenshot annotation as visual context only"));
  assert.ok(JSON.stringify(fallbackTask).includes("projectile/shooter/auto-shooter"));
  const bundleResult = saveScreenshotAnnotationBundle(screenshotWorkspace, {
    annotation: noteResult.note!,
    createConfigStub: true,
    createFallbackTask: true,
    now: new Date("2026-06-26T09:05:00.000Z")
  });
  assert.strictEqual(bundleResult.ok, true);
  assert.strictEqual(bundleResult.annotationPath, `${screenshotAnnotationsFolderRelativePath}/2026-06-26t09-00-00-000z-hud-cursor_arena.json`);
  assert.strictEqual(bundleResult.configPath, cursorArenaHudStyleConfigRelativePath);
  assert.ok(bundleResult.taskPath?.startsWith(`${screenshotAnnotationTasksFolderRelativePath}/2026-06-26t09-05-00-000z-2026-06-26t09-00-00-000z-hud-cursor_arena`));
  assert.ok(bundleResult.fallbackTaskPath?.startsWith(".game-polish-lab/fallback-tasks/2026-06-26t09-05-00-000z-2026-06-26t09-00-00-000z-hud-cursor_arena-fallback"));
  assert.strictEqual(fs.existsSync(path.join(screenshotWorkspace, "src", "arena", "ui", "ArenaHud.ts")), false);
  const annotationIndex = JSON.parse(readWorkspaceFile(screenshotWorkspace, screenshotAnnotationIndexRelativePath)) as { annotations: Array<{ annotationId: string; status: string; generatedConfigPath?: string; generatedTaskPath?: string }> };
  assert.strictEqual(annotationIndex.annotations[0].annotationId, "2026-06-26t09-00-00-000z-hud-cursor_arena");
  assert.strictEqual(annotationIndex.annotations[0].status, "converted_to_tuning_task");
  assert.strictEqual(annotationIndex.annotations[0].generatedConfigPath, cursorArenaHudStyleConfigRelativePath);
  assert.ok(annotationIndex.annotations[0].generatedTaskPath?.includes("hud-cursor_arena"));
  const configStub = JSON.parse(readWorkspaceFile(screenshotWorkspace, cursorArenaHudStyleConfigRelativePath)) as { runtimeApplied: boolean; configOnly: boolean; annotationSource: { note: string } };
  assert.strictEqual(configStub.runtimeApplied, false);
  assert.strictEqual(configStub.configOnly, true);
  assert.strictEqual(configStub.annotationSource.note, "HUD too crowded over the boss timer");
  const annotationScope = checkVisualScopeGuard({
    operationType: "visual_config_write",
    candidatePaths: [
      `${screenshotAnnotationsFolderRelativePath}/sample.json`,
      screenshotAnnotationIndexRelativePath,
      ".game-polish-lab/screenshots/problem.png",
      cursorArenaHudStyleConfigRelativePath,
      ".game-polish-lab/tasks/annotation.md",
      ".game-polish-lab/fallback-tasks/annotation.json"
    ]
  });
  assert.strictEqual(annotationScope.recommendedAction, "allow");
} finally {
  cleanupTempWorkspace(screenshotWorkspace);
}

assert.deepStrictEqual(devOverlayWritePaths(), [
  polishDevOverlayScriptRelativePath,
  polishDevOverlayStyleRelativePath,
  polishDevOverlayReadmeRelativePath,
  polishDevOverlayManifestRelativePath
]);
assert.ok(devOverlayWritePaths().every((relativePath) => relativePath.startsWith(`${polishDevOverlayRelativeDir}/`)));

const devOverlayPlan = buildPolishDevOverlayInstallPlan({ generatedAt: new Date("2026-06-26T05:00:00.000Z") });
assert.strictEqual(devOverlayPlan.executable, true);
assert.strictEqual(devOverlayPlan.scopeGuardResult.recommendedAction, "allow");
assert.ok(devOverlayPlan.files.find((file) => file.relativePath === polishDevOverlayScriptRelativePath)?.text.includes("URLSearchParams"));
assert.ok(devOverlayPlan.files.find((file) => file.relativePath === polishDevOverlayScriptRelativePath)?.text.includes("params.get(\"polish\") !== \"1\""));
assert.ok(devOverlayPlan.files.every((file) => file.text.includes(polishDevOverlayGeneratedMarker)));

const forbiddenDevOverlayPlan = buildPolishDevOverlayInstallPlan({
  candidatePaths: ["src/systems/saveSystem.ts"]
});
assert.strictEqual(forbiddenDevOverlayPlan.executable, false);
assert.strictEqual(forbiddenDevOverlayPlan.scopeGuardResult.recommendedAction, "block");
assert.ok(forbiddenDevOverlayPlan.blockingReasons.some((reason) => reason.includes("limited to .game-polish-lab/dev-overlay")));

const unknownDevOverlayPlan = buildPolishDevOverlayInstallPlan({
  candidatePaths: ["tools/custom-overlay.txt"]
});
assert.strictEqual(unknownDevOverlayPlan.executable, false);
assert.strictEqual(unknownDevOverlayPlan.scopeGuardResult.recommendedAction, "warn");
assert.ok(unknownDevOverlayPlan.blockingReasons.some((reason) => reason.includes("suspicious or unknown")));

const cancelledDevOverlayWorkspace = makeTempWorkspace("dev-overlay-cancelled");
try {
  const cancelled = createOptionalPolishDevOverlaySpike(cancelledDevOverlayWorkspace, false, new Date("2026-06-26T05:00:00.000Z"));
  assert.strictEqual(cancelled.approved, false);
  assert.strictEqual(fs.existsSync(path.join(cancelledDevOverlayWorkspace, ".game-polish-lab")), false);
} finally {
  cleanupTempWorkspace(cancelledDevOverlayWorkspace);
}

const devOverlayWorkspace = makeTempWorkspace("dev-overlay-approved");
try {
  const created = createOptionalPolishDevOverlaySpike(devOverlayWorkspace, true, new Date("2026-06-26T05:00:00.000Z"));
  assert.strictEqual(created.approved, true);
  assert.strictEqual(created.result?.ok, true);
  assert.deepStrictEqual(created.result?.changedFiles, devOverlayWritePaths());
  assert.ok(created.result?.changedFiles.every((relativePath) => relativePath.startsWith(`${polishDevOverlayRelativeDir}/`)));
  const scriptText = readWorkspaceFile(devOverlayWorkspace, polishDevOverlayScriptRelativePath);
  assert.ok(scriptText.includes("game-polish-lab:tune-change"));
  assert.ok(scriptText.includes("params.get(\"polish\") !== \"1\""));
  assert.ok(readWorkspaceFile(devOverlayWorkspace, polishDevOverlayReadmeRelativePath).includes("production builds should exclude"));
  const status = inspectPolishDevOverlayStatus(devOverlayWorkspace);
  assert.strictEqual(status.exists, true);
  assert.strictEqual(status.generated, true);
  assert.strictEqual(status.fileCount, 4);
  assert.strictEqual(status.generatedFileCount, 4);
  assert.deepStrictEqual(status.warnings, []);

  let domTouched = false;
  vm.runInNewContext(scriptText, {
    URLSearchParams,
    CustomEvent: class {},
    window: {
      location: { search: "" },
      dispatchEvent: () => {
        domTouched = true;
      }
    },
    document: {
      createElement: () => {
        domTouched = true;
        throw new Error("DOM should not be touched without polish=1.");
      },
      documentElement: {
        classList: {
          add: () => {
            domTouched = true;
          }
        }
      },
      body: {
        append: () => {
          domTouched = true;
        }
      }
    }
  });
  assert.strictEqual(domTouched, false);
} finally {
  cleanupTempWorkspace(devOverlayWorkspace);
}

const devOverlayRollbackWorkspace = makeTempWorkspace("dev-overlay-rollback");
try {
  writeWorkspaceFile(devOverlayRollbackWorkspace, polishDevOverlayScriptRelativePath, "legacy overlay");
  const overwriteResult = executePolishDevOverlayInstallPlan(devOverlayRollbackWorkspace, devOverlayPlan, new Date("2026-06-26T05:10:00.000Z"));
  assert.strictEqual(overwriteResult.ok, true);
  assert.strictEqual(overwriteResult.rollbackPaths.length, 1);
  assert.ok(overwriteResult.rollbackPaths[0].startsWith(`${visualRollbackRelativeDir}/2026-06-26T05-10-00-000Z-polish-dev-overlay.js`));
  assert.strictEqual(readWorkspaceFile(devOverlayRollbackWorkspace, overwriteResult.rollbackPaths[0]), "legacy overlay");
} finally {
  cleanupTempWorkspace(devOverlayRollbackWorkspace);
}

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
assert.ok(genericDetected.ownerFileSuggestions.some((suggestion) => suggestion.path === "src/scenes/BootScene.ts" && suggestion.recommendedSurfaceTypes.includes("background_readability")));
const genericOwnerSuggestions = discoverGenericPhaserOwnerFileSuggestions([
  { relativePath: "src/scenes/HudScene.ts", text: "export class HudScene extends Phaser.Scene { create(){ this.add.rectangle(0,0,10,10); this.add.text(0,0,'HUD'); } }" },
  { relativePath: "src/ui/ShopButton.ts", text: "button.setTint(0xffffff).setScale(1.1);" },
  { relativePath: "src/effects/HitImpact.ts", text: "particle.emitParticleAt(x,y); showHit(); damageText();" },
  { relativePath: "src/preload/AssetLoader.ts", text: "this.load.image('button','assets/button.png');" },
  { relativePath: "node_modules/phaser/Scene.ts", text: "export class Scene {}" },
  { relativePath: "coverage/tmp/Hud.ts", text: "add.rectangle();" }
]);
assert.ok(genericOwnerSuggestions.some((suggestion) => suggestion.path === "src/scenes/HudScene.ts" && suggestion.recommendedSurfaceTypes.includes("hud") && suggestion.safetyLevel === "suspicious"));
assert.ok(genericOwnerSuggestions.some((suggestion) => suggestion.path === "src/ui/ShopButton.ts" && suggestion.recommendedSurfaceTypes.includes("button")));
assert.ok(genericOwnerSuggestions.some((suggestion) => suggestion.path === "src/effects/HitImpact.ts" && suggestion.recommendedSurfaceTypes.includes("impact_feedback")));
assert.ok(genericOwnerSuggestions.some((suggestion) => suggestion.path === "src/preload/AssetLoader.ts" && suggestion.recommendedSurfaceTypes.includes("asset_slot")));
assert.strictEqual(genericOwnerSuggestions.some((suggestion) => suggestion.path.includes("node_modules")), false);
assert.strictEqual(genericOwnerSuggestions.some((suggestion) => suggestion.path.includes("coverage")), false);
const genericManualSelection = buildGenericManualSurfaceSelection({
  surfaceId: "hud",
  label: "Main HUD",
  chosenOwnerFilePath: "src/scenes/HudScene.ts",
  confidence: "high",
  safetyLevel: "suspicious"
});
assert.strictEqual(genericManualSelection.surfaceType, "panel");
assert.strictEqual(genericManualSelection.directApplyMode, "config_only");
assert.strictEqual(manualSurfaceIdToVisualSurfaceType("impact_feedback"), "reward_toast");
assert.strictEqual(genericManualStyleConfigRelativePath("asset_slot"), ".game-polish-lab/styles/generic-asset-presentation-style.json");

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
assert.strictEqual(packageJson.version, "0.7.9");
const packageLockJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8")) as { version: string; packages: Record<string, { version?: string }> };
assert.strictEqual(packageLockJson.version, "0.7.9");
assert.strictEqual(packageLockJson.packages[""].version, "0.7.9");
const requiredV06Commands = [
  "gamePolishLab.openVisualTuningDashboard",
  "gamePolishLab.tuneVisualSurface",
  "gamePolishLab.exportVisualTheme",
  "gamePolishLab.importVisualTheme",
  "gamePolishLab.annotateScreenshotVisualIssue",
  "gamePolishLab.refreshAssetContracts",
  "gamePolishLab.openAssetContactSheet",
  "gamePolishLab.checkCodexScope",
  "gamePolishLab.openRollbackHistory",
  "gamePolishLab.markLatestTuningResult",
  "gamePolishLab.createOptionalDevOverlaySpike"
];
for (const commandId of requiredV06Commands) {
  assert.ok(packageJson.activationEvents.includes(`onCommand:${commandId}`), `missing activation event for ${commandId}`);
  assert.ok(packageJson.contributes.commands.some((command) => command.command === commandId), `missing command contribution for ${commandId}`);
}
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.createOptionalDevOverlaySpike"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.openAssetContactSheet"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.openRollbackHistory"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.openVisualTuningDashboard"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.exportVisualTheme"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.importVisualTheme"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.annotateScreenshotVisualIssue"));
assert.ok(packageJson.activationEvents.includes("onCommand:gamePolishLab.refreshAssetContracts"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openAssetContactSheet" && command.title === "Game Polish Lab: Open Asset Contact Sheet"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openRollbackHistory" && command.title === "Game Polish Lab: Open Rollback History"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openVisualTuningDashboard" && command.title === "Game Polish Lab: Open Visual Tuning Dashboard"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.exportVisualTheme" && command.title === "Game Polish Lab: Export Visual Theme"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.importVisualTheme" && command.title === "Game Polish Lab: Import Visual Theme"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.annotateScreenshotVisualIssue" && command.title === "Game Polish Lab: Annotate Screenshot"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.refreshAssetContracts" && command.title === "Game Polish Lab: Refresh Asset Contracts"));
assert.ok(packageJson.contributes.commands.some((command) => command.command === "gamePolishLab.createOptionalDevOverlaySpike" && command.title === "Game Polish Lab: Create Optional In-game Dev Overlay Spike"));
const stabilizationGuide = fs.readFileSync(path.join(process.cwd(), "docs", "v0.6-stabilization.md"), "utf8");
for (const requiredSection of [
  "# Game Polish Lab v0.6 User Guide",
  "## v0.6 Features",
  "## Dashboard",
  "## Preview Renderer",
  "## Style Presets",
  "## Asset Contracts and Contact Sheets",
  "## Scope Guard",
  "## Rollback History",
  "## Direct Apply Templates",
  "## Optional Dev Overlay",
  "## Fallback Tasks",
  "## Known Limitations"
]) {
  assert.ok(stabilizationGuide.includes(requiredSection), `missing guide section ${requiredSection}`);
}
for (const limitation of [
  "No executable direct apply template exists for `asset_replacement`",
  "dev overlay is experimental",
  "Manual VS Code webview/dashboard testing may still be needed",
  "Generic Phaser support is safe-config-first",
  "Direct applies are limited to known safe style config paths",
  "Structural gameplay/layout changes are intentionally out of scope"
]) {
  assert.ok(stabilizationGuide.includes(limitation), `missing limitation ${limitation}`);
}
assert.ok(stabilizationGuide.includes("?polish=1"));
assert.ok(stabilizationGuide.includes("Choose a visual surface"));
assert.ok(stabilizationGuide.includes("Direct apply templates are intentionally narrow"));
const readmeText = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");
assert.ok(readmeText.includes("docs/v0.6-stabilization.md"));
assert.ok(readmeText.includes("docs/v0.7-adapter-stabilization.md"));
assert.ok(readmeText.includes("screenshot annotation handoffs"));
assert.ok(readmeText.includes("Current Limitations"));
assert.ok(readmeText.includes("Theme import/export and screenshot annotation do not apply runtime source changes"));
assert.ok(!readmeText.includes("or provide a dashboard webview"));
const adapterContractDoc = fs.readFileSync(path.join(process.cwd(), "docs", "adapter-contract.md"), "utf8");
assert.ok(adapterContractDoc.includes("# Visual Game Adapter Contract"));
assert.ok(adapterContractDoc.includes("Idle Monster Farm"));
assert.ok(adapterContractDoc.includes("Generic Phaser"));
assert.ok(adapterContractDoc.includes("Sort Puzzle"));
assert.ok(adapterContractDoc.includes("Cursor Arena"));
assert.ok(adapterContractDoc.includes("Future game families are intentionally not registered yet"));
assert.ok(adapterContractDoc.includes("safe/suspicious/forbidden"));
assert.ok(adapterContractDoc.includes("Direct apply is allowed only when a registered direct-apply template exists"));
assert.ok(adapterContractDoc.includes("Game-specific adapters win over Generic Phaser"));
assert.ok(adapterContractDoc.includes("Dashboard rows for those adapters must not claim runtime/source integration"));
const sortPuzzleAdapterDoc = fs.readFileSync(path.join(process.cwd(), "docs", "sort-puzzle-adapter.md"), "utf8");
assert.ok(sortPuzzleAdapterDoc.includes("Adapter id: `sort_puzzle`"));
assert.ok(sortPuzzleAdapterDoc.includes(".game-polish-lab/styles/sort-puzzle-shelf-style.json"));
assert.ok(sortPuzzleAdapterDoc.includes("Fallback tasks for `SpiritSortScene` are visual-only"));
assert.ok(sortPuzzleAdapterDoc.includes("SortRules"));
assert.ok(sortPuzzleAdapterDoc.includes("Spirit scale and offsets"));
assert.ok(sortPuzzleAdapterDoc.includes("Dashboard rows remain `config_only`"));
const cursorArenaAdapterDoc = fs.readFileSync(path.join(process.cwd(), "docs", "cursor-arena-adapter.md"), "utf8");
assert.ok(cursorArenaAdapterDoc.includes("Adapter id: `cursor_arena`"));
assert.ok(cursorArenaAdapterDoc.includes(".game-polish-lab/styles/cursor-arena-hud-style.json"));
assert.ok(cursorArenaAdapterDoc.includes(".game-polish-lab/styles/cursor-arena-background-style.json"));
assert.ok(cursorArenaAdapterDoc.includes("CursorAttackSystem"));
assert.ok(cursorArenaAdapterDoc.includes("Do not add player or projectile systems"));
assert.ok(cursorArenaAdapterDoc.includes("Dashboard rows remain `config_only`"));
assert.ok(cursorArenaAdapterDoc.includes("Upgrade values, costs, effects"));
const genericPhaserV2Doc = fs.readFileSync(path.join(process.cwd(), "docs", "generic-phaser-v2.md"), "utf8");
assert.ok(genericPhaserV2Doc.includes("Generic Phaser v2"));
assert.ok(genericPhaserV2Doc.includes("preview-first"));
assert.ok(genericPhaserV2Doc.includes("Do not auto-edit unknown scene files"));
assert.ok(genericPhaserV2Doc.includes("Non-Phaser projects should not receive high-confidence Generic Phaser behavior"));
const themeTransferDoc = fs.readFileSync(path.join(process.cwd(), "docs", "theme-export-import.md"), "utf8");
assert.ok(themeTransferDoc.includes(".game-polish-lab/themes"));
assert.ok(themeTransferDoc.includes("compatibility"));
assert.ok(themeTransferDoc.includes("rollback"));
const screenshotAnnotationDoc = fs.readFileSync(path.join(process.cwd(), "docs", "screenshot-annotation.md"), "utf8");
assert.ok(screenshotAnnotationDoc.includes(".game-polish-lab/annotations"));
assert.ok(screenshotAnnotationDoc.includes("does not run OCR"));
assert.ok(screenshotAnnotationDoc.includes("do not apply runtime changes"));
const regressionFixturesDoc = fs.readFileSync(path.join(process.cwd(), "docs", "regression-fixtures.md"), "utf8");
assert.ok(regressionFixturesDoc.includes("src/test/fixtures"));
assert.ok(regressionFixturesDoc.includes("not full games"));
assert.ok(regressionFixturesDoc.includes("large assets"));
assert.ok(regressionFixturesDoc.includes("real model code paths"));
assert.ok(regressionFixturesDoc.includes("compile-neutral JavaScript"));
const migrationDoc = fs.readFileSync(path.join(process.cwd(), "docs", "v0.7-migration-notes.md"), "utf8");
assert.ok(migrationDoc.includes("v0.7"));
assert.ok(migrationDoc.includes("normal polish loop does not require Codex"));
assert.ok(migrationDoc.includes("direct apply is limited"));
assert.ok(migrationDoc.includes(".game-polish-lab/annotations/**"));
assert.ok(!migrationDoc.includes(".game-polish-lab/screenshot-notes/**"));
assert.ok(migrationDoc.includes("v0.8 asset pipeline work"));
const v07StabilizationDoc = fs.readFileSync(path.join(process.cwd(), "docs", "v0.7-adapter-stabilization.md"), "utf8");
assert.ok(v07StabilizationDoc.includes("Game-specific adapters win over Generic Phaser"));
assert.ok(v07StabilizationDoc.includes("Generic Phaser remains fallback-only"));
assert.ok(v07StabilizationDoc.includes("Sort Puzzle, Cursor Arena, and Generic Phaser write generated configs only"));
assert.ok(v07StabilizationDoc.includes("does not run OCR"));
assert.ok(v07StabilizationDoc.includes("v0.8 asset pipeline work has not started"));
assert.ok(v07StabilizationDoc.includes("Manual Smoke Checklist"));
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
assert.strictEqual(connectedIdleSlotRow.actions.exportTheme.enabled, true);
assert.strictEqual(connectedIdleSlotRow.actions.importTheme.enabled, true);
assert.strictEqual(connectedIdleSlotRow.actions.annotateScreenshot.enabled, true);
assert.strictEqual(connectedIdleSlotRow.actions.runScopeCheck.enabled, true);
assert.strictEqual(connectedIdleSlotRow.fallbackTaskCount, 1);
assert.strictEqual(connectedIdleSlotRow.directApplyTemplate.available, true);
assert.strictEqual(connectedIdleSlotRow.directApplyTemplate.templateId, "idle-monster-farm.slot_card.style-config.v1");
assert.strictEqual(connectedIdleSlotRow.directApplyTemplate.executable, true);
assert.deepStrictEqual(Object.values(connectedIdleSlotRow.actions).map((action) => action.label), [
  "Tune",
  "Open Config",
  "Direct Apply",
  "Export Theme",
  "Import Theme",
  "Annotate Screenshot",
  "Generate Fallback Task",
  "Run Scope Check",
  "Mark Latest Result"
]);

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
assert.notStrictEqual(genericButtonRow.appliedStatus, "applied");
assert.strictEqual(genericButtonRow.lastTunedAt, "2026-06-25T02:08:04.005Z");
assert.strictEqual(genericButtonRow.lastResult, "mixed");
assert.ok(genericButtonRow.knownBad.some((note) => note.includes("Magic Glow")));
assert.ok(genericButtonRow.knownBad.some((note) => note.includes("no meaningful effect")));
assert.ok(genericButtonRow.knownMixed.some((note) => note.includes("Dark Arcade")));
assert.strictEqual(genericButtonRow.actions.directApply.enabled, true);
assert.strictEqual(genericButtonRow.actions.directApply.reason, undefined);
assert.strictEqual(genericButtonRow.actions.exportTheme.enabled, true);
assert.strictEqual(genericButtonRow.actions.importTheme.enabled, true);
assert.strictEqual(genericButtonRow.actions.annotateScreenshot.enabled, true);
assert.strictEqual(genericButtonRow.actions.generateFallbackTask.enabled, true);
assert.strictEqual(genericButtonRow.actions.markLatestResult.enabled, true);
assert.strictEqual(genericButtonRow.directApplyTemplate.available, true);
assert.strictEqual(genericButtonRow.directApplyTemplate.fallbackAvailable, true);
assert.strictEqual(genericButtonRow.scopeSummary.recommendedAction, "warn");
assert.strictEqual(genericButtonRow.scopeSummary.classificationCounts.suspicious, 1);
assert.ok(genericButtonRow.scopeSummary.summaryMessage.includes("suspicious"));

const sortPuzzleShelfSurface = {
  surfaceType: "slot_card" as const,
  displayName: "Sort Puzzle Shelf",
  adapter: {
    adapterId: "sort_puzzle" as const,
    targetId: "shelf_card",
    targetLabel: "Shelf Card",
    connectedState: "connected" as const,
    detected: true,
    confidence: "high" as const,
    directApplySupported: true,
    ownerFiles: ["src/scenes/SpiritSortScene.ts"],
    warnings: []
  },
  recipe: dashboardSlotRecipe,
  config: { status: "valid" as const, path: sortPuzzleShelfStyleConfigRelativePath, exists: true },
  recipeFile: validRecipeFile,
  fallbackTaskCount: 1,
  scopeFiles: [sortPuzzleShelfStyleConfigRelativePath]
};
const sortPuzzleShelfRow = buildDashboardRow(sortPuzzleShelfSurface, attemptIndex);
assert.strictEqual(sortPuzzleShelfRow.appliedStatus, "config_only");
assert.notStrictEqual(sortPuzzleShelfRow.appliedStatus, "applied");
assert.strictEqual(sortPuzzleShelfRow.adapterId, "sort_puzzle");
assert.strictEqual(sortPuzzleShelfRow.directApplyTemplate.available, true);
assert.strictEqual(sortPuzzleShelfRow.directApplyTemplate.executable, true);
assert.strictEqual(sortPuzzleShelfRow.actions.directApply.enabled, true);
assert.strictEqual(sortPuzzleShelfRow.actions.generateFallbackTask.enabled, true);
assert.ok(sortPuzzleShelfRow.scopeSummary.allowedFiles.includes(sortPuzzleShelfStyleConfigRelativePath));

const cursorArenaHudSurface = {
  surfaceType: "panel" as const,
  displayName: "Cursor Arena HUD",
  adapter: {
    adapterId: "cursor_arena" as const,
    targetId: "arena_hud_panel",
    targetLabel: "Arena HUD Panel",
    connectedState: "connected" as const,
    detected: true,
    confidence: "high" as const,
    directApplySupported: true,
    ownerFiles: ["src/arena/ui/ArenaHud.ts"],
    warnings: []
  },
  recipe: getVisualSurfaceRecipe("panel")!,
  config: { status: "valid" as const, path: cursorArenaHudStyleConfigRelativePath, exists: true },
  recipeFile: recipeFileStatus(getVisualSurfaceRecipe("panel")!, true),
  fallbackTaskCount: 0,
  scopeFiles: [cursorArenaHudStyleConfigRelativePath]
};
const cursorArenaHudRow = buildDashboardRow(cursorArenaHudSurface, attemptIndex);
assert.strictEqual(cursorArenaHudRow.appliedStatus, "config_only");
assert.notStrictEqual(cursorArenaHudRow.appliedStatus, "applied");
assert.strictEqual(cursorArenaHudRow.adapterId, "cursor_arena");
assert.strictEqual(cursorArenaHudRow.directApplyTemplate.available, true);
assert.strictEqual(cursorArenaHudRow.directApplyTemplate.executable, true);
assert.strictEqual(cursorArenaHudRow.actions.directApply.enabled, true);
assert.strictEqual(cursorArenaHudRow.actions.generateFallbackTask.enabled, true);
assert.ok(cursorArenaHudRow.scopeSummary.allowedFiles.includes(cursorArenaHudStyleConfigRelativePath));

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
assert.ok(disconnectedPanelRow.actions.directApply.reason?.includes("not connected"));
assert.notStrictEqual(disconnectedPanelRow.appliedStatus, "fallback_ready");

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
const unsupportedAssetRow = buildDashboardRow(unsupportedAssetSurface, attemptIndex);
assert.strictEqual(unsupportedAssetRow.appliedStatus, "unsupported");
assert.strictEqual(unsupportedAssetRow.directApplyTemplate.available, false);
assert.strictEqual(unsupportedAssetRow.actions.directApply.enabled, false);
assert.strictEqual(unsupportedAssetRow.actions.exportTheme.enabled, false);
assert.strictEqual(unsupportedAssetRow.actions.importTheme.enabled, false);
assert.strictEqual(unsupportedAssetRow.actions.annotateScreenshot.enabled, true);
assert.strictEqual(unsupportedAssetRow.actions.generateFallbackTask.enabled, true);
assert.notStrictEqual(unsupportedAssetRow.appliedStatus, "fallback_ready");

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
assert.strictEqual(calculateAppliedStatus(sortPuzzleShelfSurface, sortPuzzleShelfRow.scopeSummary), "config_only");
assert.strictEqual(calculateAppliedStatus(cursorArenaHudSurface, cursorArenaHudRow.scopeSummary), "config_only");
assert.strictEqual(calculateAppliedStatus(disconnectedIdlePanelSurface, disconnectedPanelRow.scopeSummary), "config_only");
assert.strictEqual(calculateAppliedStatus(invalidButtonSurface, buildDashboardRow(invalidButtonSurface, attemptIndex).scopeSummary), "invalid");

const sortPuzzleFixtureFiles = readFixtureFiles(path.join(process.cwd(), "fixtures", "phaser-sort-puzzle-sample"));
const fixtureSortPuzzleDetection = detectSortPuzzleProject(sortPuzzleFixtureFiles);
assert.strictEqual(fixtureSortPuzzleDetection.detected, true);
assert.strictEqual(fixtureSortPuzzleDetection.confidence, "high");
const sortPuzzleFixtureSurfaces = buildSortPuzzleDashboardSurfaceInputs({
  detection: fixtureSortPuzzleDetection,
  configs: {
    sort_puzzle_shelf_card: { status: "valid", path: sortPuzzleShelfStyleConfigRelativePath, exists: true },
    sort_puzzle_spirit_slot: { status: "valid", path: sortPuzzleSpiritPresentationConfigRelativePath, exists: true },
    sort_puzzle_completed_shelf: { status: "valid", path: sortPuzzleShelfStyleConfigRelativePath, exists: true },
    sort_puzzle_selected_shelf_state: { status: "valid", path: sortPuzzleShelfStyleConfigRelativePath, exists: true },
    sort_puzzle_invalid_move_feedback: { status: "valid", path: sortPuzzleFeedbackStyleConfigRelativePath, exists: true },
    sort_puzzle_win_reward_toast: { status: "valid", path: sortPuzzleFeedbackStyleConfigRelativePath, exists: true },
    sort_puzzle_spirit_asset_presentation: { status: "valid", path: sortPuzzleSpiritPresentationConfigRelativePath, exists: true }
  },
  recipeFiles: {
    "slot-card": recipeFileStatus(getVisualSurfaceRecipe("slot_card")!, true),
    "reward-toast": recipeFileStatus(getVisualSurfaceRecipe("reward_toast")!, true)
  },
  fallbackCounts: {},
  ownerFiles: sortPuzzleFixtureFiles.map((file) => file.relativePath).filter((file) => file.includes("SpiritSortScene"))
});
const sortPuzzleFixtureDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(process.cwd(), "fixtures", "phaser-sort-puzzle-sample"),
  generatedAt: new Date("2026-06-26T09:00:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "sort_puzzle",
  adapterConfidence: fixtureSortPuzzleDetection.confidence,
  surfaces: sortPuzzleFixtureSurfaces,
  attemptIndex
});
assert.strictEqual(sortPuzzleFixtureDashboard.summary.detectedAdapter, "sort_puzzle");
assert.strictEqual(sortPuzzleFixtureDashboard.summary.adapterConfidence, "high");
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "shelf_card" && row.displayName === "Sort Puzzle Shelf Card"));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "spirit_slot" && row.configPath === sortPuzzleSpiritPresentationConfigRelativePath));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "selected_shelf_state"));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "invalid_move_feedback" && row.configPath === sortPuzzleFeedbackStyleConfigRelativePath));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "completed_shelf"));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "win_reward_toast"));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "spirit_asset_presentation" && row.appliedStatus === "unsupported"));
assert.ok(sortPuzzleFixtureDashboard.rows.filter((row) => row.adapterId === "sort_puzzle" && row.surfaceType !== "asset_replacement").every((row) => row.appliedStatus === "config_only"));
assert.ok(sortPuzzleFixtureDashboard.rows.filter((row) => row.adapterId === "sort_puzzle" && row.surfaceType !== "asset_replacement").every((row) => row.actions.directApply.enabled));
assert.ok(sortPuzzleFixtureDashboard.rows.filter((row) => row.adapterId === "sort_puzzle").every((row) => row.actions.generateFallbackTask.enabled));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.configPath === sortPuzzleShelfStyleConfigRelativePath));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.configPath === sortPuzzleSpiritPresentationConfigRelativePath));
assert.ok(sortPuzzleFixtureDashboard.rows.some((row) => row.configPath === sortPuzzleFeedbackStyleConfigRelativePath));

const cursorArenaFixtureFiles = readFixtureFiles(path.join(process.cwd(), "fixtures", "phaser-incremental-arena-sample"));
const fixtureCursorArenaDetection = detectCursorArenaProject(cursorArenaFixtureFiles);
assert.strictEqual(fixtureCursorArenaDetection.detected, true);
assert.strictEqual(fixtureCursorArenaDetection.confidence, "high");
assert.ok(fixtureCursorArenaDetection.evidence.some((entry) => entry.includes("arena.html")));
assert.strictEqual(detectCursorArenaProject(sortPuzzleFixtureFiles).detected, false);
assert.strictEqual(detectCursorArenaProject(files).detected, false);
const weakCursorGenericFallbackDetection = detectCursorArenaProject([
  { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"latest\"}}" },
  { relativePath: "src/scenes/MenuScene.ts", text: "export class MenuScene extends Phaser.Scene { showArenaOption(); }" }
]);
assert.strictEqual(weakCursorGenericFallbackDetection.detected, false);
assert.strictEqual(detectGenericPhaserProject([
  { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"latest\"}}" },
  { relativePath: "src/scenes/MenuScene.ts", text: "export class MenuScene extends Phaser.Scene {}" }
]).detected, true);
const cursorArenaFixtureSurfaces = buildCursorArenaDashboardSurfaceInputs({
  detection: fixtureCursorArenaDetection,
  configs: {
    cursor_arena_arena_hud_panel: { status: "valid", path: cursorArenaHudStyleConfigRelativePath, exists: true },
    cursor_arena_upgrade_card: { status: "valid", path: cursorArenaUpgradeCardStyleConfigRelativePath, exists: true },
    cursor_arena_cursor_hit_feedback: { status: "valid", path: cursorArenaFeedbackStyleConfigRelativePath, exists: true },
    cursor_arena_cursor_miss_feedback: { status: "valid", path: cursorArenaFeedbackStyleConfigRelativePath, exists: true },
    cursor_arena_enemy_kill_feedback: { status: "valid", path: cursorArenaFeedbackStyleConfigRelativePath, exists: true },
    cursor_arena_combo_feedback: { status: "valid", path: cursorArenaFeedbackStyleConfigRelativePath, exists: true },
    cursor_arena_arena_background_readability: { status: "valid", path: cursorArenaBackgroundReadabilityConfigRelativePath, exists: true }
  },
  recipeFiles: {
    panel: recipeFileStatus(getVisualSurfaceRecipe("panel")!, true),
    "slot-card": recipeFileStatus(getVisualSurfaceRecipe("slot_card")!, true),
    "reward-toast": recipeFileStatus(getVisualSurfaceRecipe("reward_toast")!, true),
    "background-readability": recipeFileStatus(getVisualSurfaceRecipe("background_readability")!, true)
  },
  fallbackCounts: {},
  ownerFiles: cursorArenaFixtureFiles.map((file) => file.relativePath).filter((file) => file.startsWith("src/arena/") || file === "arena.html")
});
const cursorArenaFixtureDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(process.cwd(), "fixtures", "phaser-incremental-arena-sample"),
  generatedAt: new Date("2026-06-26T10:00:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "cursor_arena",
  adapterConfidence: fixtureCursorArenaDetection.confidence,
  surfaces: cursorArenaFixtureSurfaces,
  attemptIndex
});
assert.doesNotThrow(() => buildVisualTuningDashboardModel({
  workspaceFolder: path.join(process.cwd(), "fixtures", "phaser-incremental-arena-sample"),
  phaserDetected: true,
  detectedAdapter: "cursor_arena",
  adapterConfidence: "high",
  surfaces: cursorArenaFixtureSurfaces,
  attemptIndex
}));
assert.ok(dashboardAdapterFilterOptions().some((option) => option.value === "cursor_arena" && option.label === "Cursor Arena"));
assert.strictEqual(cursorArenaFixtureDashboard.summary.detectedAdapter, "cursor_arena");
assert.strictEqual(cursorArenaFixtureDashboard.summary.adapterConfidence, "high");
assert.deepStrictEqual(cursorArenaFixtureDashboard.rows.map((row) => row.targetId), ["arena_hud_panel", "upgrade_card", "cursor_hit_feedback", "cursor_miss_feedback", "enemy_kill_feedback", "combo_feedback", "arena_background_readability"]);
assert.deepStrictEqual(cursorArenaFixtureDashboard.rows.map((row) => row.displayName), ["Cursor Arena HUD Panel", "Cursor Arena Upgrade Card", "Cursor Hit Feedback", "Cursor Miss Feedback", "Enemy Kill Feedback", "Combo Feedback", "Arena Background Readability"]);
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.displayName === "Cursor Arena HUD Panel"));
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.displayName === "Cursor Arena Upgrade Card"));
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.targetId === "cursor_hit_feedback" && row.configPath === cursorArenaFeedbackStyleConfigRelativePath));
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.targetId === "cursor_miss_feedback" && row.configPath === cursorArenaFeedbackStyleConfigRelativePath));
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.targetId === "enemy_kill_feedback" && row.configPath === cursorArenaFeedbackStyleConfigRelativePath));
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.targetId === "combo_feedback" && row.configPath === cursorArenaFeedbackStyleConfigRelativePath));
assert.ok(cursorArenaFixtureDashboard.rows.some((row) => row.targetId === "arena_background_readability" && row.configPath === cursorArenaBackgroundReadabilityConfigRelativePath));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.adapterId === "cursor_arena"));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.appliedStatus === "config_only"));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.actions.directApply.enabled));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.actions.generateFallbackTask.enabled));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.actions.directApply.label === "Direct Apply"));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.actions.generateFallbackTask.label === "Generate Fallback Task"));
assert.ok(cursorArenaFixtureDashboard.rows.every((row) => row.connectedState === "connected"));
assert.strictEqual(cursorArenaFixtureDashboard.summary.appliedCount, 0);
assert.strictEqual(cursorArenaFixtureDashboard.summary.configOnlyCount, cursorArenaFixtureDashboard.rows.length);

const genericPhaserV2Surfaces = buildGenericPhaserDashboardSurfaceInputs({
  detection: {
    detected: true,
    confidence: "high",
    evidence: ["package.json: package.json dependency references phaser."],
    warnings: [],
    likelySceneFiles: ["src/scenes/HudScene.ts"],
    ownerFileSuggestions: genericOwnerSuggestions
  },
  configs: {
    generic_phaser_button: { status: "valid", path: genericStyleConfigRelativePath("button"), exists: true },
    generic_phaser_hud: { status: "valid", path: genericManualStyleConfigRelativePath("hud")!, exists: true },
    generic_phaser_impact_feedback: { status: "valid", path: genericManualStyleConfigRelativePath("impact_feedback")!, exists: true }
  },
  recipeFiles: {
    panel: recipeFileStatus(getVisualSurfaceRecipe("panel")!, true),
    button: recipeFileStatus(getVisualSurfaceRecipe("button")!, true),
    "reward-toast": recipeFileStatus(getVisualSurfaceRecipe("reward_toast")!, true),
    "slot-card": recipeFileStatus(getVisualSurfaceRecipe("slot_card")!, true),
    "background-readability": recipeFileStatus(getVisualSurfaceRecipe("background_readability")!, true)
  },
  fallbackCounts: {}
});
const genericHudRow = buildDashboardRow(genericPhaserV2Surfaces.find((surface) => surface.adapter.targetId === "manual_hud")!, attemptIndex);
const genericImpactRow = buildDashboardRow(genericPhaserV2Surfaces.find((surface) => surface.adapter.targetId === "manual_impact_feedback")!, attemptIndex);
assert.ok(genericPhaserV2Surfaces.some((surface) => surface.adapter.targetLabel.includes("HudScene.ts")));
assert.ok(genericPhaserV2Surfaces.some((surface) => surface.adapter.ownerFiles.includes("src/effects/HitImpact.ts")));
assert.strictEqual(genericHudRow.appliedStatus, "config_only");
assert.strictEqual(genericHudRow.actions.directApply.enabled, true);
assert.strictEqual(genericImpactRow.configPath, genericManualStyleConfigRelativePath("impact_feedback"));
assert.strictEqual(genericImpactRow.actions.generateFallbackTask.enabled, true);
assert.strictEqual(genericHudRow.connectedState, "not_connected");
assert.strictEqual(genericHudRow.scopeSummary.suspiciousFiles.includes("src/scenes/HudScene.ts"), true);

const dashboardModel = buildVisualTuningDashboardModel({
  workspaceFolder: "D:/sample",
  generatedAt: new Date("2026-06-25T03:00:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "idle_monster_farm",
  adapterConfidence: "high",
  surfaces: [connectedIdleSlotSurface, genericButtonSurface, sortPuzzleShelfSurface, cursorArenaHudSurface, disconnectedIdlePanelSurface, unsupportedAssetSurface],
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
  },
  devOverlay: {
    exists: true,
    generated: true,
    path: polishDevOverlayRelativeDir,
    fileCount: 4,
    generatedFileCount: 4,
    files: devOverlayWritePaths().map((relativePath) => ({ relativePath, exists: true, generated: true })),
    warnings: []
  }
});
assert.strictEqual(dashboardModel.schemaVersion, "visual-tuning-dashboard/v1");
assert.strictEqual(dashboardModel.summary.totalSurfaces, 6);
assert.strictEqual(dashboardModel.summary.appliedCount, 1);
assert.strictEqual(dashboardModel.summary.configOnlyCount, 4);
assert.ok(dashboardModel.summary.warningCount > 0);
assert.strictEqual(dashboardModel.summary.assetContractStatus, "valid");
assert.strictEqual(dashboardModel.summary.assetContractStatusCounts.total, 5);
assert.strictEqual(dashboardModel.summary.assetContractStatusCounts.valid, 1);
assert.strictEqual(dashboardModel.summary.assetContractWarningCount, 3);
assert.strictEqual(dashboardModel.summary.assetContactSheetAvailable, true);
assert.strictEqual(dashboardModel.summary.devOverlay?.path, polishDevOverlayRelativeDir);
assert.strictEqual(dashboardModel.summary.devOverlay?.generated, true);
assert.strictEqual(dashboardModel.summary.devOverlay?.generatedFileCount, 4);
assert.deepStrictEqual(dashboardModel.summary.adapterContracts.map((contract) => contract.adapterId), ["idle_monster_farm", "generic_phaser", "sort_puzzle", "cursor_arena"]);
assert.ok(dashboardModel.summary.adapterContracts.every((contract) => contract.valid));
assert.strictEqual(dashboardModel.summary.adapterContracts.find((contract) => contract.adapterId === "sort_puzzle")?.supportedSurfaceCount, 3);
assert.strictEqual(dashboardModel.summary.adapterContracts.find((contract) => contract.adapterId === "cursor_arena")?.supportedSurfaceCount, 4);
assert.strictEqual(dashboardModel.fieldNotes.fieldNotesPath, ".game-polish-lab/field-notes.md");
assert.ok(dashboardModel.fieldNotes.knownBad.some((note) => note.includes("Magic Glow")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("dashboard opens without writing files")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("asset contract summary")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("Asset Contact Sheet")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("Rollback History")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("optional dev overlay status")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("adapter contract summary")));
assert.ok(dashboardManualChecklist().some((item) => item.includes("template availability")));
assert.strictEqual(getVisualSurfaceRecipes().length, 5);
assert.deepStrictEqual(visualSurfacePickerOrder, ["slot_card", "background_readability", "asset_replacement", "panel", "reward_toast", "button"]);
assert.ok(dashboardModel.rows.some((row) => row.adapterId === "idle_monster_farm" && row.surfaceType === "slot_card"));
assert.ok(dashboardModel.rows.some((row) => row.adapterId === "generic_phaser" && row.surfaceType === "button"));
assert.ok(dashboardModel.rows.some((row) => row.adapterId === "sort_puzzle" && row.targetId === "shelf_card"));
assert.ok(dashboardModel.rows.some((row) => row.adapterId === "cursor_arena" && row.targetId === "arena_hud_panel"));
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
assert.strictEqual(dashboardWithoutContactSheet.summary.devOverlay, undefined);

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
const sortPuzzleFixtureDetection = detectSortPuzzleProject(sortPuzzleFixture);
assert.strictEqual(sortPuzzleFixtureDetection.detected, true);
assert.ok(sortPuzzleFixtureDetection.confidence === "high" || sortPuzzleFixtureDetection.confidence === "medium");

const v078FixtureRoot = path.join(process.cwd(), "src", "test", "fixtures");
const v078IdleFixture = readFixtureFiles(path.join(v078FixtureRoot, "idle-monster-farm"));
const v078SortFixture = readFixtureFiles(path.join(v078FixtureRoot, "sort-puzzle"));
const v078CursorFixture = readFixtureFiles(path.join(v078FixtureRoot, "cursor-arena"));
const v078GenericFixture = readFixtureFiles(path.join(v078FixtureRoot, "generic-phaser"));
const v078NonPhaserFixture = readFixtureFiles(path.join(v078FixtureRoot, "non-phaser"));
const v078MixedFixture = readFixtureFiles(path.join(v078FixtureRoot, "mixed-signals"));

const v078IdleDetection = getVisualGameAdapter("idle_monster_farm")!.detectProject(v078IdleFixture);
const v078SortDetection = detectSortPuzzleProject(v078SortFixture);
const v078CursorDetection = detectCursorArenaProject(v078CursorFixture);
const v078GenericDetection = detectGenericPhaserProject(v078GenericFixture);
const v078NonPhaserGenericDetection = detectGenericPhaserProject(v078NonPhaserFixture);
const v078MixedIdleDetection = getVisualGameAdapter("idle_monster_farm")!.detectProject(v078MixedFixture);
const v078MixedSortDetection = detectSortPuzzleProject(v078MixedFixture);
const v078MixedCursorDetection = detectCursorArenaProject(v078MixedFixture);
const v078MixedGenericDetection = detectGenericPhaserProject(v078MixedFixture);

assert.strictEqual(v078IdleDetection.detected, true);
assert.ok(v078IdleDetection.confidence === "medium" || v078IdleDetection.confidence === "high");
assert.strictEqual(detectSortPuzzleProject(v078IdleFixture).detected, false);
assert.strictEqual(detectCursorArenaProject(v078IdleFixture).detected, false);
assert.strictEqual(regressionDetectedAdapter(v078IdleFixture), "idle_monster_farm");
assert.strictEqual(v078SortDetection.detected, true);
assert.strictEqual(v078SortDetection.confidence, "high");
assert.strictEqual(getVisualGameAdapter("idle_monster_farm")!.detectProject(v078SortFixture).detected, false);
assert.strictEqual(detectCursorArenaProject(v078SortFixture).detected, false);
assert.strictEqual(regressionDetectedAdapter(v078SortFixture), "sort_puzzle");
assert.strictEqual(v078CursorDetection.detected, true);
assert.strictEqual(v078CursorDetection.confidence, "high");
assert.strictEqual(detectSortPuzzleProject(v078CursorFixture).detected, false);
assert.strictEqual(getVisualGameAdapter("idle_monster_farm")!.detectProject(v078CursorFixture).detected, false);
assert.strictEqual(regressionDetectedAdapter(v078CursorFixture), "cursor_arena");
assert.strictEqual(v078GenericDetection.detected, true);
assert.ok(v078GenericDetection.ownerFileSuggestions.some((suggestion) => suggestion.path === "src/scenes/HudScene.js" && suggestion.recommendedSurfaceTypes.includes("hud")));
assert.ok(v078GenericDetection.ownerFileSuggestions.some((suggestion) => suggestion.path === "src/effects/HitImpact.js" && suggestion.recommendedSurfaceTypes.includes("impact_feedback")));
assert.strictEqual(regressionDetectedAdapter(v078GenericFixture), "generic_phaser");
assert.strictEqual(v078NonPhaserGenericDetection.detected, false);
assert.strictEqual(v078NonPhaserGenericDetection.confidence, "low");
assert.strictEqual(regressionDetectedAdapter(v078NonPhaserFixture), "unknown");
assert.strictEqual(v078MixedIdleDetection.detected, true);
assert.strictEqual(v078MixedSortDetection.detected, false);
assert.strictEqual(v078MixedCursorDetection.detected, false);
assert.strictEqual(v078MixedGenericDetection.detected, true);
assert.strictEqual(regressionDetectedAdapter(v078MixedFixture), "idle_monster_farm");
assert.strictEqual(shouldOfferGenericPhaserAdapter({ knownAdapterDetected: true, knownAdapterConfidence: "high" }), false);
assert.strictEqual(shouldOfferGenericPhaserAdapter({ knownAdapterDetected: true, knownAdapterConfidence: "low" }), true);

const v078IdleDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(v078FixtureRoot, "idle-monster-farm"),
  generatedAt: new Date("2026-06-28T01:00:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "idle_monster_farm",
  adapterConfidence: v078IdleDetection.confidence,
  surfaces: buildFixtureDashboardSurfaces("idle_monster_farm", v078IdleDetection, path.join(v078FixtureRoot, "idle-monster-farm"), v078IdleFixture),
  attemptIndex
});
assert.ok(v078IdleDashboard.rows.some((row) => row.adapterId === "idle_monster_farm" && row.targetId === "farm_slots"));
assert.ok(v078IdleDashboard.rows.some((row) => row.actions.directApply.enabled));
assert.ok(v078IdleDashboard.rows.every((row) => row.actions.runScopeCheck.enabled && row.actions.annotateScreenshot.enabled));
assert.strictEqual(v078IdleDashboard.rows.find((row) => row.targetId === "farm_slots")?.configPath, farmSlotStyleConfigRelativePath);

const v078SortDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(v078FixtureRoot, "sort-puzzle"),
  generatedAt: new Date("2026-06-28T01:05:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "sort_puzzle",
  adapterConfidence: v078SortDetection.confidence,
  surfaces: buildSortPuzzleDashboardSurfaceInputs({
    detection: v078SortDetection,
    configs: fixtureConfigInfoForTargets("sort_puzzle", path.join(v078FixtureRoot, "sort-puzzle")),
    recipeFiles: fixtureRecipeInfos(),
    fallbackCounts: {},
    ownerFiles: v078SortFixture.map((file) => file.relativePath).filter((file) => file.includes("SpiritSortScene"))
  }),
  attemptIndex
});
assert.ok(v078SortDashboard.rows.some((row) => row.targetId === "shelf_card" && row.appliedStatus === "config_only"));
assert.ok(v078SortDashboard.rows.some((row) => row.targetId === "spirit_asset_presentation" && row.appliedStatus === "unsupported"));
assert.ok(v078SortDashboard.rows.every((row) => row.appliedStatus !== "applied"));

const v078CursorDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(v078FixtureRoot, "cursor-arena"),
  generatedAt: new Date("2026-06-28T01:10:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "cursor_arena",
  adapterConfidence: v078CursorDetection.confidence,
  surfaces: buildCursorArenaDashboardSurfaceInputs({
    detection: v078CursorDetection,
    configs: fixtureConfigInfoForTargets("cursor_arena", path.join(v078FixtureRoot, "cursor-arena")),
    recipeFiles: fixtureRecipeInfos(),
    fallbackCounts: {},
    ownerFiles: v078CursorFixture.map((file) => file.relativePath).filter((file) => file.startsWith("src/arena/") || file === "arena.html")
  }),
  attemptIndex
});
assert.deepStrictEqual(v078CursorDashboard.rows.map((row) => row.targetId), ["arena_hud_panel", "upgrade_card", "cursor_hit_feedback", "cursor_miss_feedback", "enemy_kill_feedback", "combo_feedback", "arena_background_readability"]);
assert.ok(v078CursorDashboard.rows.some((row) => row.targetId === "arena_hud_panel" && row.appliedStatus === "config_only"));
assert.ok(v078CursorDashboard.rows.every((row) => row.appliedStatus !== "applied"));
assert.ok(v078CursorDashboard.rows.some((row) => row.configPath === cursorArenaHudStyleConfigRelativePath));
assert.ok(v078CursorDashboard.rows.some((row) => row.configPath === cursorArenaUpgradeCardStyleConfigRelativePath));
assert.ok(v078CursorDashboard.rows.some((row) => row.configPath === cursorArenaFeedbackStyleConfigRelativePath));
assert.ok(v078CursorDashboard.rows.some((row) => row.configPath === cursorArenaBackgroundReadabilityConfigRelativePath));

const v078GenericDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(v078FixtureRoot, "generic-phaser"),
  generatedAt: new Date("2026-06-28T01:15:00.000Z"),
  phaserDetected: true,
  detectedAdapter: "generic_phaser",
  adapterConfidence: v078GenericDetection.confidence,
  surfaces: buildGenericPhaserDashboardSurfaceInputs({
    detection: v078GenericDetection,
    configs: fixtureConfigInfoForTargets("generic_phaser", path.join(v078FixtureRoot, "generic-phaser")),
    recipeFiles: fixtureRecipeInfos(),
    fallbackCounts: {}
  }),
  attemptIndex
});
assert.ok(v078GenericDashboard.rows.some((row) => row.adapterId === "generic_phaser" && row.targetLabel.includes("HudScene.js")));
assert.ok(v078GenericDashboard.rows.some((row) => row.adapterId === "generic_phaser" && row.targetLabel.includes("HitImpact.js")));
assert.ok(v078GenericDashboard.rows.every((row) => row.appliedStatus !== "applied"));

const v078NonPhaserDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: path.join(v078FixtureRoot, "non-phaser"),
  generatedAt: new Date("2026-06-28T01:20:00.000Z"),
  phaserDetected: false,
  detectedAdapter: "unknown",
  adapterConfidence: "unknown",
  surfaces: [],
  attemptIndex
});
assert.strictEqual(v078NonPhaserDashboard.rows.length, 0);
assert.strictEqual(v078NonPhaserDashboard.summary.phaserDetected, false);

assert.strictEqual(farmSlotStyleConfigRelativePath, ".game-polish-lab/styles/farm-slot-style.json");
assert.strictEqual(sortPuzzleShelfStyleConfigRelativePath, ".game-polish-lab/styles/sort-puzzle-shelf-style.json");
assert.strictEqual(sortPuzzleSpiritPresentationConfigRelativePath, ".game-polish-lab/styles/sort-puzzle-spirit-presentation.json");
assert.strictEqual(sortPuzzleFeedbackStyleConfigRelativePath, ".game-polish-lab/styles/sort-puzzle-feedback-style.json");
assert.strictEqual(cursorArenaHudStyleConfigRelativePath, ".game-polish-lab/styles/cursor-arena-hud-style.json");
assert.strictEqual(cursorArenaUpgradeCardStyleConfigRelativePath, ".game-polish-lab/styles/cursor-arena-upgrade-card-style.json");
assert.strictEqual(cursorArenaFeedbackStyleConfigRelativePath, ".game-polish-lab/styles/cursor-arena-feedback-style.json");
assert.strictEqual(cursorArenaBackgroundReadabilityConfigRelativePath, ".game-polish-lab/styles/cursor-arena-background-style.json");
assert.strictEqual(genericStyleConfigRelativePath("button"), ".game-polish-lab/styles/generic-button-style.json");
assert.strictEqual(genericManualStyleConfigRelativePath("hud"), ".game-polish-lab/styles/generic-hud-style.json");
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "cursor_arena", surfaceType: "hud" }).styleConfigPath, cursorArenaHudStyleConfigRelativePath);
assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "sort_puzzle", surfaceType: "slot_card" }).ambiguous, true);

for (const planInput of [
  { adapterId: "sort_puzzle" as const, surfaceType: "slot_card" as const, targetId: "shelf_card", path: sortPuzzleShelfStyleConfigRelativePath },
  { adapterId: "cursor_arena" as const, surfaceType: "panel" as const, targetId: "arena_hud_panel", path: cursorArenaHudStyleConfigRelativePath },
  { adapterId: "generic_phaser" as const, surfaceType: "button" as const, targetId: "manual_button", path: genericStyleConfigRelativePath("button") }
]) {
  const plan = buildVisualDirectApplyPlan({
    adapterId: planInput.adapterId,
    surfaceType: planInput.surfaceType,
    targetId: planInput.targetId,
    styleConfigPath: planInput.path,
    candidatePaths: [planInput.path],
    intent: "dashboard_direct_apply"
  });
  assert.strictEqual(plan.executable, true);
  assert.deepStrictEqual(plan.writePaths, [planInput.path]);
  assert.ok(plan.writePaths.every((writePath) => writePath.startsWith(".game-polish-lab/styles/")));
}

const v078RollbackWorkspace = makeTempWorkspace("v078-regression-rollback");
try {
  const plan = buildVisualDirectApplyPlan({
    adapterId: "generic_phaser",
    surfaceType: "button",
    targetId: "manual_button",
    styleConfigPath: genericStyleConfigRelativePath("button"),
    candidatePaths: [genericStyleConfigRelativePath("button")],
    intent: "dashboard_direct_apply"
  });
  writeWorkspaceFile(v078RollbackWorkspace, genericStyleConfigRelativePath("button"), "{\"preset\":\"before\"}");
  const result = executeVisualDirectApplyPlan(v078RollbackWorkspace, plan, [{
    relativePath: genericStyleConfigRelativePath("button"),
    text: "{\"preset\":\"after\"}\n"
  }], new Date("2026-06-28T01:25:00.000Z"));
  assert.strictEqual(result.ok, true);
  assert.ok(result.rollbackPaths.some((rollbackPath) => rollbackPath.includes("generic-button-style.json")));
  assert.strictEqual(fs.existsSync(path.join(v078RollbackWorkspace, "src", "scenes", "Scene.ts")), false);
} finally {
  cleanupTempWorkspace(v078RollbackWorkspace);
}

const v078ScopeCases = [
  { path: ".game-polish-lab/styles/generic-button-style.json", expected: "safe" },
  { path: ".game-polish-lab/themes/theme.json", expected: "safe" },
  { path: ".game-polish-lab/annotations/annotation.json", expected: "safe" },
  { path: ".game-polish-lab/screenshots/capture.png", expected: "safe" },
  { path: ".game-polish-lab/tasks/annotation.md", expected: "safe" },
  { path: ".game-polish-lab/fallback-tasks/annotation.json", expected: "safe" },
  { path: "docs/regression-fixtures.md", expected: "safe" },
  { path: "src/test/fixtures/generic-phaser/src/scenes/HudScene.js", expected: "safe" },
  { path: "src/scenes/FarmScene.ts", expected: "suspicious" },
  { path: "src/ui/HudView.ts", expected: "suspicious" },
  { path: "src/systems/SpiritAssetLoader.js", expected: "suspicious" },
  { path: "src/systems/saveSystem.ts", expected: "forbidden" },
  { path: "src/data/economy.ts", expected: "forbidden" },
  { path: "src/data/spiritSortLevels.js", expected: "forbidden" },
  { path: "src/systems/SortRules.js", expected: "forbidden" },
  { path: "src/services/rewardedAdService.ts", expected: "forbidden" },
  { path: "src/arena/systems/ProjectileSystem.js", expected: "forbidden" },
  { path: "src/arena/data/arenaBalanceConfig.js", expected: "forbidden" },
  { path: "package.json", expected: "forbidden" }
];
for (const scopeCase of v078ScopeCases) {
  const result = checkVisualScopeGuard({ operationType: "direct_apply", candidatePaths: [scopeCase.path] });
  assert.strictEqual(result.classifiedFiles[0].classification, scopeCase.expected, scopeCase.path);
}
assert.ok(visualScopeGuardRulesSummary().some((line) => line.includes("src/test/fixtures")));

assert.ok(spiritFallback.instructions.some((instruction) => instruction.includes("Do not change SortRules")));
assert.ok(spiritFallback.forbiddenFiles.some((file) => file.includes("undo/hint")));
assert.ok(cursorFallback.instructions.some((instruction) => instruction.includes("Do not add player systems")));
assert.ok(cursorFallback.forbiddenFiles.some((file) => file.includes("projectile")));
assert.ok(genericFallback.task?.allowedFiles.includes("src/ui/ButtonView.ts"));
assert.ok(genericFallback.task?.codexMustNotDo.some((line) => line.includes("package")));
const v078ScreenshotFallback = buildScreenshotAnnotationFallbackTask({
  ...buildScreenshotAnnotationNote({
    screenshotPath: "captures/problem.png",
    markedRect: { x: 2, y: 4, width: 40, height: 20 },
    surfaceType: "impact_feedback",
    adapterId: "generic_phaser",
    targetSurfaceId: "manual_impact_feedback",
    note: "hit effect hides enemy",
    createdAt: new Date("2026-06-28T01:30:00.000Z")
  }).note!,
  generatedConfigPath: genericManualStyleConfigRelativePath("impact_feedback")
});
assert.ok(JSON.stringify(v078ScreenshotFallback).includes("captures/problem.png"));
assert.ok(JSON.stringify(v078ScreenshotFallback).includes("hit effect hides enemy"));
assert.ok(JSON.stringify(v078ScreenshotFallback).includes("Preserve gameplay behavior"));

const v078ThemeWorkspace = makeTempWorkspace("v078-theme-fixture");
try {
  writeWorkspaceFile(v078ThemeWorkspace, sortPuzzleShelfStyleConfigRelativePath, readFixtureText(path.join(v078FixtureRoot, "sort-puzzle"), sortPuzzleShelfStyleConfigRelativePath));
  const exported = exportVisualThemeFromStyleConfigs(v078ThemeWorkspace, {
    themeName: "v078 Shelf",
    sourceAdapterId: "sort_puzzle",
    selections: [{ surfaceType: "slot_card", targetId: "shelf_card", targetLabel: "Sort Puzzle Shelf", styleConfigPath: sortPuzzleShelfStyleConfigRelativePath }],
    createdAt: new Date("2026-06-28T01:35:00.000Z")
  });
  assert.strictEqual(exported.relativePath, `${visualThemeFolderRelativePath}/v078-shelf.json`);
  assert.strictEqual(fs.existsSync(path.join(v078ThemeWorkspace, ...visualThemeIndexRelativePath.split("/"))), true);
  const importResult = importVisualThemeToAdapter(v078ThemeWorkspace, exported.theme, {
    targetAdapterId: "generic_phaser",
    targetSurfaceType: "slot_card",
    targetId: "manual_slot_card",
    now: new Date("2026-06-28T01:36:00.000Z")
  });
  assert.strictEqual(importResult.ok, true);
  assert.deepStrictEqual(importResult.changedFiles, [genericStyleConfigRelativePath("slot_card")]);
  const importedConfig = JSON.parse(readWorkspaceFile(v078ThemeWorkspace, genericStyleConfigRelativePath("slot_card"))) as { runtimeApplied: boolean; values: Record<string, unknown> };
  assert.strictEqual(importedConfig.runtimeApplied, false);
  assert.strictEqual(importedConfig.values.fillColor, "#203040");
  const unsafeTheme = buildVisualThemeFile({
    themeName: "v078 Unsafe",
    sourceAdapterId: "sort_puzzle",
    surfaces: [{ surfaceType: "slot_card", styleTokens: { fillColor: "#112233", saveStateVersion: 1, economyBalance: 99 } }]
  });
  assert.ok(!JSON.stringify(unsafeTheme.surfaces[0].normalizedStyleTokens).includes("saveStateVersion"));
  assert.ok(validateVisualThemeFile(unsafeTheme).warnings.some((warning) => warning.includes("economyBalance")));
} finally {
  cleanupTempWorkspace(v078ThemeWorkspace);
}

const v078AnnotationWorkspace = makeTempWorkspace("v078-annotation-fixture");
try {
  writeWorkspaceBinaryFile(v078AnnotationWorkspace, "captures/problem.png", makePngHeader(100, 50));
  const annotation = buildScreenshotAnnotationNote({
    screenshotPath: "captures/problem.png",
    markedRect: { x: 10, y: 5, width: 40, height: 20 },
    surfaceType: "impact_feedback",
    adapterId: "generic_phaser",
    targetSurfaceId: "manual_impact_feedback",
    note: "hit effect hides enemy",
    createdAt: new Date("2026-06-28T01:40:00.000Z"),
    imageMetadata: readScreenshotImageMetadata(v078AnnotationWorkspace, "captures/problem.png")
  });
  assert.strictEqual(annotation.ok, true);
  assert.strictEqual(annotation.note?.targetMapping?.styleConfigPath, genericManualStyleConfigRelativePath("impact_feedback"));
  assert.strictEqual(annotation.note?.normalizedRect?.widthPct, 0.4);
  const saved = saveScreenshotAnnotationBundle(v078AnnotationWorkspace, { annotation: annotation.note!, createConfigStub: true, createFallbackTask: true });
  assert.strictEqual(saved.ok, true);
  assert.ok(saved.annotationPath?.startsWith(`${screenshotAnnotationsFolderRelativePath}/`));
  assert.strictEqual(fs.existsSync(path.join(v078AnnotationWorkspace, ...screenshotAnnotationIndexRelativePath.split("/"))), true);
  assert.ok(readWorkspaceFile(v078AnnotationWorkspace, saved.taskPath!).includes("hit effect hides enemy"));
  assert.ok(readWorkspaceFile(v078AnnotationWorkspace, saved.fallbackTaskPath!).includes("visual context only"));
  const savedConfig = JSON.parse(readWorkspaceFile(v078AnnotationWorkspace, genericManualStyleConfigRelativePath("impact_feedback")!)) as { runtimeApplied: boolean; configOnly: boolean };
  assert.strictEqual(savedConfig.runtimeApplied, false);
  assert.strictEqual(savedConfig.configOnly, true);
  assert.strictEqual(mapScreenshotAnnotationSurfaceToTarget({ adapterId: "cursor_arena", surfaceType: "impact_feedback" }).ambiguous, true);
} finally {
  cleanupTempWorkspace(v078AnnotationWorkspace);
}

const v080PackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
  activationEvents: string[];
  contributes: { commands: Array<{ command: string; title: string }> };
};
assert.ok(v080PackageJson.activationEvents.includes("onCommand:gamePolishLab.openAssetPipelineDashboard"));
assert.ok(v080PackageJson.contributes.commands.some((command) => command.command === "gamePolishLab.openAssetPipelineDashboard" && command.title === "Game Polish Lab: Open Asset Pipeline Dashboard"));

const v080IdleSlots = discoverVisualAssetSlots(v078IdleFixture);
assert.ok(v080IdleSlots.some((slot) => slot.slotId === "idle_monster_farm.monster_art" && slot.expectedAssetType === "image"));
assert.ok(v080IdleSlots.some((slot) => slot.slotId === "idle_monster_farm.slot_frame" && slot.expectedAssetType === "ui-frame"));
assert.ok(v080IdleSlots.some((slot) => slot.slotId === "idle_monster_farm.reward_icon" && slot.directApplyCapability === "fallback_required"));
assert.ok(v080IdleSlots.every((slot) => slot.expectedFileExtensions.includes(".png") && slot.expectedFileExtensions.includes(".webp")));

const v080SortSlots = discoverVisualAssetSlots(v078SortFixture);
assert.ok(v080SortSlots.some((slot) => slot.slotId === "sort_puzzle.spirit_art" && slot.safetyStatus === "unsupported" && slot.directApplyCapability === "fallback_required"));
assert.ok(v080SortSlots.some((slot) => slot.slotLabel.includes("Shelf")));
assert.ok(v080SortSlots.some((slot) => slot.slotLabel.includes("reward")));

const v080CursorSlots = discoverVisualAssetSlots(v078CursorFixture);
assert.ok(v080CursorSlots.some((slot) => slot.slotId === "cursor_arena.enemy_icon"));
assert.ok(v080CursorSlots.some((slot) => slot.slotId === "cursor_arena.cursor_effect_sprite"));
assert.ok(v080CursorSlots.some((slot) => slot.slotId === "cursor_arena.hit_kill_combo_sprite"));
assert.ok(v080CursorSlots.some((slot) => slot.slotId === "cursor_arena.hud_upgrade_icon"));
assert.ok(v080CursorSlots.every((slot) => slot.directApplyCapability === "fallback_required"));

const v080GenericSlots = discoverVisualAssetSlots(v078GenericFixture);
assert.ok(v080GenericSlots.some((slot) => slot.currentAssetPath?.includes("assets/ui/hud-frame.png") || slot.ownerSourceFileHints.some((hint) => hint.includes("HudScene"))));
assert.ok(v080GenericSlots.some((slot) => slot.currentAssetPath?.includes("assets/effects/hit-spark.png") || slot.ownerSourceFileHints.some((hint) => hint.includes("HitImpact"))));
assert.ok(v080GenericSlots.every((slot) => slot.adapterId === "generic_phaser"));
assert.deepStrictEqual(discoverVisualAssetSlots(v078NonPhaserFixture), []);

const v080DashboardWorkspace = makeTempWorkspace("v080-asset-dashboard");
try {
  const dashboard = buildVisualAssetDashboardModel({
    workspaceRoot: v080DashboardWorkspace,
    files: v078CursorFixture,
    updatedAt: "2026-06-28T02:00:00.000Z"
  });
  assert.strictEqual(dashboard.schemaVersion, "visual-asset-pipeline-dashboard/v1");
  assert.strictEqual(dashboard.activeAdapter, "cursor_arena");
  assert.ok(dashboard.groupedSurfaceIds.includes("reward_toast"));
  assert.ok(dashboard.rows.some((row) => row.actions.importAsset && row.actions.generateFallbackTask && row.actions.runScopeCheck));
  assert.ok(dashboard.rows.every((row) => row.runtimeApplied === false));
  assert.ok(dashboard.rows.every((row) => row.slot.directApplyCapability !== "manifest_supported"));
  assert.ok(dashboard.warnings.some((warning) => warning.includes("fallback-required")));
} finally {
  cleanupTempWorkspace(v080DashboardWorkspace);
}

const v080AssetWorkspace = makeTempWorkspace("v080-asset-import");
try {
  writeWorkspaceBinaryFile(v080AssetWorkspace, "incoming/monster.png", Buffer.from(makeTestRgbaPng(128, 128, () => 255)));
  const slot = v080IdleSlots.find((candidate) => candidate.slotId === "idle_monster_farm.monster_art")!;
  const pendingCandidate = importVisualAssetCandidate({
    workspaceRoot: v080AssetWorkspace,
    sourcePath: path.join(v080AssetWorkspace, "incoming", "monster.png"),
    slot,
    now: new Date("2026-06-28T02:10:00.000Z")
  });
  assert.ok(pendingCandidate.copiedAssetPath.startsWith(`${visualAssetImportedRelativeDir}/`));
  assert.strictEqual(fs.existsSync(path.join(v080AssetWorkspace, ...pendingCandidate.copiedAssetPath.split("/"))), true);
  assert.strictEqual(fs.existsSync(path.join(v080AssetWorkspace, "src", "assets", "monsters", "monster.png")), false);
  assert.strictEqual(pendingCandidate.approvalStatus, "pending");
  assert.strictEqual(pendingCandidate.fileType, "image/png");
  assert.deepStrictEqual(pendingCandidate.dimensions, { width: 128, height: 128 });
  const validAsset = validateImportedVisualAssetCandidate(v080AssetWorkspace, slot, pendingCandidate, "2026-06-28T02:11:00.000Z");
  assert.strictEqual(validAsset.status, "valid");

  const missingAsset = validateImportedVisualAssetCandidate(v080AssetWorkspace, slot, {
    ...pendingCandidate,
    copiedAssetPath: `${visualAssetImportedRelativeDir}/missing.png`
  }, "2026-06-28T02:12:00.000Z");
  assert.strictEqual(missingAsset.status, "missing");

  const unapproved = assignVisualAssetCandidate({
    workspaceRoot: v080AssetWorkspace,
    slot,
    candidate: pendingCandidate,
    now: new Date("2026-06-28T02:13:00.000Z")
  });
  assert.strictEqual(unapproved.result.status, "blocked");
  assert.ok(unapproved.result.errors.some((error) => error.includes("approved")));

  const approvedCandidate = { ...pendingCandidate, approvalStatus: "approved" as const };
  const assigned = assignVisualAssetCandidate({
    workspaceRoot: v080AssetWorkspace,
    slot,
    candidate: approvedCandidate,
    now: new Date("2026-06-28T02:14:00.000Z")
  });
  assert.notStrictEqual(assigned.result.status, "blocked");
  assert.strictEqual(assigned.assignment.runtimeApplied, false);
  assert.strictEqual(assigned.assignment.fallbackRequired, false);
  assert.ok(assigned.result.changedFiles.includes(`${visualAssetAssignmentsRelativeDir}/idle-monster-farm-monster_art.json`));
  assert.strictEqual(fs.existsSync(path.join(v080AssetWorkspace, ...visualAssetDashboardRelativePath.split("/"))), true);

  const reassigned = assignVisualAssetCandidate({
    workspaceRoot: v080AssetWorkspace,
    slot,
    candidate: approvedCandidate,
    now: new Date("2026-06-28T02:15:00.000Z")
  });
  assert.ok(reassigned.result.rollbackPaths.some((rollbackPath) => rollbackPath.startsWith(".game-polish-lab/rollback/")));

  const fallbackSlot = v080IdleSlots.find((candidate) => candidate.slotId === "idle_monster_farm.reward_icon")!;
  const fallbackTask = buildVisualAssetFallbackTask({
    slot: fallbackSlot,
    candidate: approvedCandidate,
    validation: validAsset,
    now: new Date("2026-06-28T02:16:00.000Z")
  });
  assert.strictEqual(fallbackTask.instruction, "wire this approved imported asset into this selected visual asset slot only.");
  assert.ok(fallbackTask.allowedFiles.includes(approvedCandidate.copiedAssetPath));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("save schema")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("economy")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("ad/monetization")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("projectile/shooter/auto-shooter")));
  assert.ok(!JSON.stringify(fallbackTask).includes("make the assets better"));
} finally {
  cleanupTempWorkspace(v080AssetWorkspace);
}

const v080AssetScope = checkVisualScopeGuard({
  operationType: "asset_pipeline_assignment",
  adapterId: "generic_phaser",
  surfaceType: "asset_replacement",
  candidatePaths: [
    ".game-polish-lab/assets/imported/button.png",
    ".game-polish-lab/assets/assignments/button.json",
    ".game-polish-lab/fallback-tasks/asset.json",
    "src/scenes/PreloadScene.ts",
    "src/assets/manifest.json",
    "src/systems/saveSystem.ts",
    "src/data/economy.ts",
    "src/arena/data/arenaBalanceConfig.js",
    "package.json"
  ]
});
assert.strictEqual(v080AssetScope.recommendedAction, "block");
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === ".game-polish-lab/assets/imported/button.png" && file.classification === "safe"));
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === "src/scenes/PreloadScene.ts" && file.classification === "suspicious"));
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === "src/assets/manifest.json" && file.classification === "suspicious"));
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === "src/systems/saveSystem.ts" && file.classification === "forbidden"));
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === "src/data/economy.ts" && file.classification === "forbidden"));
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === "src/arena/data/arenaBalanceConfig.js" && file.classification === "forbidden"));
assert.ok(v080AssetScope.classifiedFiles.some((file) => file.path === "package.json" && file.classification === "forbidden"));
assert.ok(checkAssetPipelineScope(v080GenericSlots[0]).recommendedAction !== "allow");
assert.ok(visualScopeGuardRulesSummary().some((line) => line.includes(".game-polish-lab/assets/**")));
assert.ok(visualScopeGuardRulesSummary().some((line) => line.includes("selected asset manifests")));

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

function writeWorkspaceBinaryFile(root: string, relativePath: string, bytes: Buffer): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bytes);
}

function readWorkspaceFile(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8");
}

function cleanupTempWorkspace(root: string): void {
  if (root.startsWith(process.cwd())) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function makePngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function regressionDetectedAdapter(files: InspectedFile[]): "idle_monster_farm" | "sort_puzzle" | "cursor_arena" | "generic_phaser" | "unknown" {
  const idle = getVisualGameAdapter("idle_monster_farm")!.detectProject(files);
  const sort = detectSortPuzzleProject(files);
  const cursor = detectCursorArenaProject(files);
  const generic = detectGenericPhaserProject(files);
  const idleScore = idle.detected ? regressionConfidenceScore(idle.confidence) : 0;
  const sortScore = sort.detected ? regressionConfidenceScore(sort.confidence) : 0;
  const cursorScore = cursor.detected ? regressionConfidenceScore(cursor.confidence) : 0;
  if (idleScore > 0 && idleScore >= sortScore && idleScore >= cursorScore) {
    return "idle_monster_farm";
  }
  if (sortScore >= regressionConfidenceScore("medium") && sortScore >= cursorScore && sortScore > idleScore) {
    return "sort_puzzle";
  }
  if (cursorScore >= regressionConfidenceScore("medium") && cursorScore > idleScore && cursorScore > sortScore) {
    return "cursor_arena";
  }
  return generic.detected ? "generic_phaser" : "unknown";
}

function regressionConfidenceScore(confidence: "high" | "medium" | "low" | "unknown"): number {
  if (confidence === "high") {
    return 3;
  }
  if (confidence === "medium") {
    return 2;
  }
  if (confidence === "low") {
    return 1;
  }
  return 0;
}

function fixtureConfigInfoForTargets(adapterId: "idle_monster_farm" | "generic_phaser" | "sort_puzzle" | "cursor_arena", fixtureRoot: string): Record<string, { status: "valid" | "missing"; path: string; exists: boolean }> {
  const configs: Record<string, { status: "valid" | "missing"; path: string; exists: boolean }> = {};
  for (const target of getVisualGameAdapterSurfaceTargets(adapterId)) {
    if (!target.styleConfigPath) {
      continue;
    }
    const exists = fs.existsSync(path.join(fixtureRoot, ...target.styleConfigPath.split("/")));
    configs[`${adapterId}_${target.targetId}`] = {
      status: exists ? "valid" : "missing",
      path: target.styleConfigPath,
      exists
    };
  }
  return configs;
}

function fixtureRecipeInfos(): Record<string, ReturnType<typeof recipeFileStatus>> {
  const infos: Record<string, ReturnType<typeof recipeFileStatus>> = {};
  for (const recipe of getVisualSurfaceRecipes()) {
    infos[recipe.recipeId] = recipeFileStatus(recipe, true);
  }
  return infos;
}

function buildFixtureDashboardSurfaces(adapterId: "idle_monster_farm" | "generic_phaser" | "sort_puzzle" | "cursor_arena", detection: { detected: boolean; confidence: "high" | "medium" | "low" | "unknown"; warnings: string[] }, fixtureRoot: string, files: InspectedFile[]): DashboardSurfaceInput[] {
  return getVisualGameAdapterSurfaceTargets(adapterId).map((target) => {
    const recipe = target.surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(target.surfaceType);
    const configPath = target.styleConfigPath;
    const configExists = configPath ? fs.existsSync(path.join(fixtureRoot, ...configPath.split("/"))) : false;
    const config = configPath
      ? { status: configExists ? "valid" as const : "missing" as const, path: configPath, exists: configExists }
      : { status: "not_applicable" as const, exists: false };
    return {
      surfaceType: target.surfaceType,
      displayName: target.displayName,
      adapter: {
        adapterId,
        targetId: target.targetId,
        targetLabel: target.displayName,
        connectedState: target.surfaceType === "asset_replacement" ? "not_applicable" as const : "connected" as const,
        detected: detection.detected,
        confidence: detection.confidence,
        directApplySupported: target.directApply.support === "executable",
        generatedStyleModulePath: target.generatedStyleModulePath,
        ownerFiles: Array.from(new Set([...target.likelyOwnerFiles, ...files.map((file) => file.relativePath).filter((file) => file.includes("Scene") || file.includes("ui/"))])).sort(),
        warnings: [...detection.warnings, ...target.limitations]
      },
      recipe,
      config,
      recipeFile: recipe ? recipeFileStatus(recipe, true) : { status: "not_applicable" as const, exists: false },
      fallbackTaskCount: 0,
      scopeFiles: [config.path, target.generatedStyleModulePath, ...target.likelyOwnerFiles].filter((value): value is string => Boolean(value))
    };
  });
}

function readFixtureText(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8");
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
