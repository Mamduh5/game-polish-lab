import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  buildVisualDirectApplyFallbackTask,
  buildVisualDirectApplyPlan
} from "../core/visualDirectApplyTemplates";
import {
  getVisualGameAdapter,
  getVisualGameAdapterSurfaceTargets,
  summarizeRegisteredVisualGameAdapterContracts
} from "../core/visualGameAdapters";
import {
  buildVisualTuningDashboardModel,
  DashboardConfigInfo,
  DashboardRecipeInfo,
  DashboardSurfaceInput
} from "../core/visualTuningDashboardModel";
import { buildMonsterFarmAssetContractFile, summarizeVisualAssetContractStatuses } from "../core/visualAssetContracts";
import { getVisualSurfaceRecipe, visualRecipeRelativePath } from "../core/visualRecipeRegistry";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import { VisualAdapterProjectDetection, VisualAdapterSurfaceTarget } from "../types/visualGameAdapter";
import { DashboardAdapterId, VisualTuningDashboardModel } from "../types/visualTuningDashboard";
import { VisualSurfaceType } from "../types/visualSurface";
import { VisualTuningAttemptIndex } from "../types/visualTuningAttempt";

type MainDogfoodFamily = "idle_monster_farm" | "sort_puzzle" | "cursor_arena";

const fixtureRoots: Record<MainDogfoodFamily, string> = {
  idle_monster_farm: "fixtures/phaser-idle-monster-farm-sample",
  sort_puzzle: "fixtures/phaser-sort-puzzle-sample",
  cursor_arena: "fixtures/phaser-incremental-arena-sample"
};

const familyLabels: Record<MainDogfoodFamily, string> = {
  idle_monster_farm: "Idle Monster Farm",
  sort_puzzle: "Sort Puzzle",
  cursor_arena: "Cursor Arena"
};

for (const family of Object.keys(fixtureRoots) as MainDogfoodFamily[]) {
  const adapter = getVisualGameAdapter(family);
  assert.ok(adapter, `${family} adapter must be registered`);

  const files = collectFixtureFiles(fixtureRoots[family]);
  const detection = adapter.detectProject(files);
  assert.strictEqual(detection.detected, true, `${family} fixture should be detected`);
  assert.notStrictEqual(detection.confidence, "unknown", `${family} fixture should have usable confidence`);
  assert.ok(detection.evidence.length > 0, `${family} detection should include evidence`);

  const targets = getVisualGameAdapterSurfaceTargets(family);
  assert.ok(targets.length > 0, `${family} should expose surface targets`);
  assert.ok(targets.some((target) => target.previewSupport === "supported"), `${family} should expose previewable targets`);
  assert.ok(targets.every((target) => target.manualChecks.length > 0), `${family} targets should carry manual checks`);
  assert.ok(targets.some((target) => target.styleConfigPath || target.surfaceType === "asset_replacement"), `${family} should expose config or asset rows`);

  const model = buildDogfoodDashboardModel(family, detection, targets);
  assert.strictEqual(model.summary.detectedAdapter, family);
  assert.strictEqual(model.summary.phaserDetected, true);
  assert.strictEqual(model.summary.totalSurfaces, targets.length);
  assert.ok(model.rows.length >= 1, `${family} dashboard should have rows`);
  assert.ok(model.rows.some((row) => row.actions.tune.enabled), `${family} should expose tuning entry paths`);
  assert.ok(model.rows.every((row) => row.actions.runScopeCheck.enabled), `${family} should expose scope checks`);
  assert.ok(model.rows.every((row) => row.scopeSummary.forbiddenFiles.length === 0), `${family} normal dogfood rows should not include forbidden files`);
  assert.ok(model.rows.some((row) => row.configPath || row.configStatus === "not_applicable"), `${family} should show config path or not-applicable state`);
  assert.ok(model.fieldNotes.fieldNotesPath.endsWith("field-notes.md"), `${family} should expose field notes path`);
  assert.ok(model.fieldNotes.knownGood.length > 0, `${family} should summarize recorded field-note results`);
  assert.ok(model.rows.some((row) => row.lastResult === "better" && row.actions.markLatestResult.enabled), `${family} should support result tracking`);

  const styleRows = model.rows.filter((row) => row.surfaceType !== "asset_replacement");
  assert.ok(styleRows.length > 0, `${family} should have at least one style row`);
  assert.ok(styleRows.some((row) => row.directApplyTemplate.available), `${family} should expose at least one safe style-config direct-apply template`);

  for (const row of model.rows.filter((candidate) => candidate.surfaceType === "asset_replacement")) {
    assert.strictEqual(row.actions.directApply.enabled, false, `${family} asset row should not claim executable direct apply`);
    assert.ok(row.actions.directApply.reason?.toLowerCase().includes("asset replacement"), `${family} asset direct-apply reason should name asset replacement`);
    assert.strictEqual(row.appliedStatus, "unsupported", `${family} asset row should stay unsupported for executable direct apply`);
  }

  const fallbackRows = model.rows.filter((row) => row.actions.generateFallbackTask.enabled);
  assert.ok(fallbackRows.every((row) => row.actions.generateFallbackTask.label.includes("Fallback")), `${family} fallback action should be explicitly labeled`);

  if (family === "sort_puzzle" || family === "cursor_arena") {
    assert.ok(styleRows.every((row) => row.appliedStatus === "config_only"), `${family} style rows should be config-only after config save`);
    assert.ok(styleRows.every((row) => row.directApplyTemplate.fallbackAvailable), `${family} style rows should keep fallback available for source integration`);
  }

  if (family === "idle_monster_farm") {
    assert.strictEqual(model.summary.assetContractStatus, "valid");
    assert.strictEqual(model.summary.assetContactSheetAvailable, true);
  } else {
    assert.strictEqual(model.summary.assetContractStatus, "missing");
    assert.strictEqual(model.summary.assetContactSheetAvailable, false);
  }
}

const contracts = summarizeRegisteredVisualGameAdapterContracts();
for (const family of Object.keys(fixtureRoots) as MainDogfoodFamily[]) {
  const summary = contracts.find((contract) => contract.adapterId === family);
  assert.ok(summary, `${family} should be present in adapter contract summary`);
  assert.strictEqual(summary.valid, true, `${family} contract should validate`);
  assert.ok(summary.targetCount > 0, `${family} contract should expose targets`);
}

const emptyDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: process.cwd(),
  phaserDetected: false,
  detectedAdapter: "unknown",
  adapterConfidence: "unknown",
  surfaces: [],
  attemptIndex: emptyAttemptIndex()
});
assert.strictEqual(emptyDashboard.summary.totalSurfaces, 0);
assert.ok(emptyDashboard.manualChecklist.some((item) => item.includes("dashboard opens")));
assert.ok(emptyDashboard.manualChecklist.some((item) => item.includes("no gameplay")));

const forbiddenScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "cursor_arena",
  surfaceType: "reward_toast",
  targetId: "cursor_hit_feedback",
  candidatePaths: [
    "src/systems/saveSystem.ts",
    "src/data/economy.ts",
    "src/services/rewardedAdService.ts",
    "src/systems/progressionSystem.ts",
    "src/systems/SortRules.js",
    "src/systems/MoveValidation.js",
    "src/arena/data/arenaBalanceConfig.js",
    "src/arena/data/enemySpawnConfig.js",
    "src/player/PlayerController.ts"
  ]
});
assert.strictEqual(forbiddenScope.recommendedAction, "block");
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "save_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "economy_or_balance_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "ad_or_sdk_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "progression_or_unlock_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "sort_puzzle_rule_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "cursor_arena_balance_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "cursor_arena_player_projectile_file"));

const blockedSortPuzzlePlan = buildVisualDirectApplyPlan({
  adapterId: "sort_puzzle",
  surfaceType: "slot_card",
  targetId: "shelf_card",
  styleConfigPath: ".game-polish-lab/styles/sort-puzzle-shelf-style.json",
  candidatePaths: [".game-polish-lab/styles/sort-puzzle-shelf-style.json", "src/systems/SortRules.js"]
});
assert.strictEqual(blockedSortPuzzlePlan.executable, false);
const sortFallback = buildVisualDirectApplyFallbackTask(blockedSortPuzzlePlan);
assert.ok(sortFallback.instructions.some((instruction) => instruction.toLowerCase().includes("fallback")));
assert.ok(sortFallback.forbiddenFiles.some((file) => file.includes("SortRules")));

const unsupportedAssetPlan = buildVisualDirectApplyPlan({
  adapterId: "sort_puzzle",
  surfaceType: "asset_replacement",
  targetId: "spirit_asset_presentation",
  candidatePaths: [".game-polish-lab/assets/assignments/spirit.json"]
});
assert.strictEqual(unsupportedAssetPlan.executable, false);
assert.ok(unsupportedAssetPlan.blockingReasons.some((reason) => reason.includes("Direct apply unavailable")));

for (const docPath of ["docs/beta-dogfooding-v0.95.md", "docs/beta-dogfooding-checklist.md"]) {
  const text = fs.readFileSync(path.join(process.cwd(), ...docPath.split("/")), "utf8");
  assert.ok(text.includes("Idle Monster Farm"), `${docPath} should mention Idle Monster Farm`);
  assert.ok(text.includes("Sort Puzzle"), `${docPath} should mention Sort Puzzle`);
  assert.ok(text.includes("Cursor Arena"), `${docPath} should mention Cursor Arena`);
  assert.ok(text.includes("No gameplay") || text.includes("no gameplay"), `${docPath} should confirm gameplay safety`);
}

function buildDogfoodDashboardModel(family: MainDogfoodFamily, detection: VisualAdapterProjectDetection, targets: VisualAdapterSurfaceTarget[]): VisualTuningDashboardModel {
  const assetContracts = family === "idle_monster_farm" ? buildMonsterFarmAssetContractFile("2026-06-29T00:00:00.000Z") : undefined;
  return buildVisualTuningDashboardModel({
    workspaceFolder: path.join(process.cwd(), ...fixtureRoots[family].split("/")),
    generatedAt: new Date("2026-06-29T00:00:00.000Z"),
    phaserDetected: true,
    detectedAdapter: family,
    adapterConfidence: detection.confidence,
    surfaces: targets.map((target) => toSurfaceInput(family, detection, target)),
    attemptIndex: attemptIndexFor(family, targets[0]),
    assetContracts: {
      status: assetContracts ? "valid" : "missing",
      path: ".game-polish-lab/assets/asset-contracts.json",
      statusCounts: assetContracts ? summarizeVisualAssetContractStatuses(assetContracts) : emptyAssetContractStatusCounts(),
      warningCount: 0
    }
  });
}

function toSurfaceInput(family: DashboardAdapterId, detection: VisualAdapterProjectDetection, target: VisualAdapterSurfaceTarget): DashboardSurfaceInput {
  const recipe = target.surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(target.surfaceType);
  const config: DashboardConfigInfo = target.styleConfigPath
    ? { status: "valid", path: target.styleConfigPath, exists: true }
    : { status: "not_applicable", exists: false };
  const recipeFile: DashboardRecipeInfo = recipe
    ? { status: "valid", path: visualRecipeRelativePath(recipe.recipeId), exists: true }
    : { status: "not_applicable", exists: false };
  const directApplySupported = target.directApply.support === "executable";
  return {
    surfaceType: target.surfaceType,
    displayName: target.displayName,
    adapter: {
      adapterId: family,
      targetId: target.targetId,
      targetLabel: target.displayName,
      connectedState: directApplySupported ? "connected" : "not_applicable",
      detected: detection.detected,
      confidence: detection.confidence,
      directApplySupported,
      generatedStyleModulePath: target.generatedStyleModulePath,
      ownerFiles: target.likelyOwnerFiles,
      warnings: [...detection.warnings, ...target.limitations]
    },
    recipe,
    config,
    recipeFile,
    fallbackTaskCount: target.directApply.support === "executable" ? 0 : 1,
    scopeFiles: [
      config.path,
      target.generatedStyleModulePath,
      ...target.likelyOwnerFiles,
      recipe ? visualRecipeRelativePath(recipe.recipeId) : undefined
    ].filter((value): value is string => Boolean(value))
  };
}

function attemptIndexFor(family: MainDogfoodFamily, target: VisualAdapterSurfaceTarget): VisualTuningAttemptIndex {
  return {
    schemaVersion: "visual-tuning-attempt-index/v1",
    updatedAt: "2026-06-29T00:00:00.000Z",
    attempts: [{
      attemptId: `${family}-${target.targetId}-dogfood`,
      createdAt: "2026-06-29T00:00:00.000Z",
      adapterId: family,
      surfaceType: target.surfaceType,
      targetId: target.targetId,
      targetLabel: target.displayName,
      resultStatus: "better",
      attemptPath: `.game-polish-lab/tuning-attempts/${family}-${target.targetId}.json`,
      configPath: target.styleConfigPath,
      fallbackTaskPath: target.directApply.support === "executable" ? undefined : `.game-polish-lab/fallback-tasks/${family}-${target.targetId}.json`
    }]
  };
}

function emptyAttemptIndex(): VisualTuningAttemptIndex {
  return {
    schemaVersion: "visual-tuning-attempt-index/v1",
    updatedAt: "2026-06-29T00:00:00.000Z",
    attempts: []
  };
}

function emptyAssetContractStatusCounts() {
  return {
    valid: 0,
    warning: 0,
    invalid: 0,
    missing: 0,
    unknown: 0,
    total: 0
  };
}

function collectFixtureFiles(relativeRoot: string): Array<{ relativePath: string; text: string }> {
  const root = path.join(process.cwd(), ...relativeRoot.split("/"));
  const files: Array<{ relativePath: string; text: string }> = [];
  walk(root, (absolutePath) => {
    if (!/\.(json|ts|tsx|js|jsx|html|css|md)$/i.test(absolutePath)) {
      return;
    }
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
    files.push({ relativePath, text: fs.readFileSync(absolutePath, "utf8") });
  });
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function walk(root: string, visit: (absolutePath: string) => void): void {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && entry.name !== "out") {
        walk(absolutePath, visit);
      }
      continue;
    }
    if (entry.isFile()) {
      visit(absolutePath);
    }
  }
}
