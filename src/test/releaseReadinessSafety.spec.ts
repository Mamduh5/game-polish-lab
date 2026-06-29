import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  applyVisualAssetManifestAssignment,
  buildManifestLoaderFallbackTask,
  checkManifestApplyScope
} from "../core/visualAssetManifestDirectApply";
import {
  buildVisualDirectApplyFallbackTask,
  buildVisualDirectApplyPlan,
  executeVisualDirectApplyPlan
} from "../core/visualDirectApplyTemplates";
import {
  discoverVisualRollbackSnapshots,
  restoreVisualRollbackSnapshot,
  visualRollbackRelativeDir
} from "../core/visualRollback";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import { AssignedVisualAsset, ImportedVisualAssetCandidate, VisualAssetSlot, VisualAssetValidationResult } from "../types/visualAssetPipeline";
import { VisualAssetManifestContract } from "../types/visualAssetManifestDirectApply";

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
  version: string;
  description: string;
  repository?: { url?: string };
  bugs?: { url?: string };
  homepage?: string;
  contributes?: { commands?: Array<{ command: string; title: string }>; menus?: { commandPalette?: Array<{ command: string }> } };
  scripts?: Record<string, string>;
};

assert.strictEqual(packageJson.version, "0.9.5");
assert.ok(packageJson.description.includes("VS Code visual polish console"));
assert.ok(packageJson.repository?.url?.includes("github.com/Mamduh5/game-polish-lab"));
assert.ok(packageJson.bugs?.url?.includes("/issues"));
assert.ok(packageJson.homepage?.includes("#readme"));
assert.ok(packageJson.scripts?.["package:check"]);
assert.ok(packageJson.scripts?.package);
assert.ok(!/publish/.test(packageJson.scripts?.package ?? ""));
for (const commandId of [
  "gamePolishLab.openVisualTuningDashboard",
  "gamePolishLab.tuneVisualSurface",
  "gamePolishLab.openAssetPipelineDashboard",
  "gamePolishLab.openRollbackHistory"
]) {
  assert.ok(packageJson.contributes?.commands?.some((command) => command.command === commandId && command.title.startsWith("Game Polish Lab: ")), `${commandId} missing release-facing title`);
}
assert.ok(packageJson.contributes?.menus?.commandPalette?.some((entry) => entry.command === "gamePolishLab.openVisualTuningDashboard"));

for (const requiredDoc of [
  "docs/quick-start.md",
  "docs/direct-apply-guide.md",
  "docs/fallback-task-guide.md",
  "docs/rollback-guide.md",
  "docs/beta-dogfooding-v0.95.md",
  "docs/beta-dogfooding-checklist.md",
  "docs/release-readiness.md",
  "docs/safety-review.md",
  "docs/extension-packaging.md",
  "docs/ci.md",
  "CHANGELOG.md",
  ".github/workflows/ci.yml"
]) {
  assert.strictEqual(fs.existsSync(path.join(process.cwd(), ...requiredDoc.split("/"))), true, `${requiredDoc} missing`);
}
assert.ok(fs.readFileSync(path.join(process.cwd(), "docs", "extension-packaging.md"), "utf8").includes("License selection is pending"));

const forbiddenScope = checkVisualScopeGuard({
  operationType: "fallback_task_generation",
  adapterId: "generic_phaser",
  surfaceType: "button",
  candidatePaths: [
    "src/systems/saveSystem.ts",
    "src/data/economy.ts",
    "src/services/rewardedAdService.ts",
    "src/systems/progressionSystem.ts"
  ]
});
assert.strictEqual(forbiddenScope.recommendedAction, "block");
assert.ok(forbiddenScope.violations.some((violation) => violation.reasonCode === "save_file"));
assert.ok(forbiddenScope.violations.some((violation) => violation.reasonCode === "economy_or_balance_file"));
assert.ok(forbiddenScope.violations.some((violation) => violation.reasonCode === "ad_or_sdk_file"));
assert.ok(forbiddenScope.violations.some((violation) => violation.reasonCode === "progression_or_unlock_file"));

const blockedFallbackPlan = buildVisualDirectApplyPlan({
  adapterId: "generic_phaser",
  surfaceType: "button",
  targetId: "manual_button",
  styleConfigPath: ".game-polish-lab/styles/generic-button-style.json",
  candidatePaths: ["src/systems/saveSystem.ts", "src/data/economy.ts"]
});
assert.strictEqual(blockedFallbackPlan.executable, false);
const blockedFallback = buildVisualDirectApplyFallbackTask(blockedFallbackPlan);
assert.ok(blockedFallback.forbiddenFiles.some((file) => file.includes("saveSystem")));
assert.ok(blockedFallback.forbiddenFiles.some((file) => file.includes("economy")));
assert.ok(blockedFallback.instructions.some((instruction) => instruction.includes("not part of the normal polish loop")));

const unsupportedDirectApply = buildVisualDirectApplyPlan({
  adapterId: "generic_phaser",
  surfaceType: "asset_replacement",
  targetId: "manual_asset_slot",
  candidatePaths: [".game-polish-lab/assets/assignments/manual.json"]
});
assert.strictEqual(unsupportedDirectApply.executable, false);
assert.ok(unsupportedDirectApply.blockingReasons.some((reason) => reason.includes("Direct apply unavailable")));
const unsupportedWorkspace = makeTempWorkspace("v094-unsupported-direct-apply");
try {
  const unsupportedResult = executeVisualDirectApplyPlan(unsupportedWorkspace, unsupportedDirectApply, [{
    relativePath: ".game-polish-lab/assets/assignments/manual.json",
    text: "{}"
  }]);
  assert.strictEqual(unsupportedResult.ok, false);
  assert.deepStrictEqual(unsupportedResult.changedFiles, []);
} finally {
  cleanupTempWorkspace(unsupportedWorkspace);
}

const manifestWorkspace = makeTempWorkspace("v094-manifest-scope");
try {
  const slot = testSlot();
  const candidate = testCandidate();
  const validation: VisualAssetValidationResult = { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-29T00:00:00.000Z" };
  const assignment = testAssignment(slot, candidate, validation);
  const forbiddenContract = testManifestContract(slot, "src/systems/saveSystem.ts");
  const scoped = checkManifestApplyScope(forbiddenContract, assignment, candidate.copiedAssetPath);
  assert.strictEqual(scoped.recommendedAction, "block");
  assert.ok(scoped.classifiedFiles.some((file) => file.path === "src/systems/saveSystem.ts" && file.classification === "forbidden"));
  const result = applyVisualAssetManifestAssignment({
    workspaceRoot: manifestWorkspace,
    slot,
    candidate,
    assignment,
    validation,
    contract: forbiddenContract,
    now: new Date("2026-06-29T00:01:00.000Z")
  });
  assert.strictEqual(result.status, "failed");
  assert.ok(result.errors.some((error) => error.includes("Scope guard")));
  assert.strictEqual(fs.existsSync(path.join(manifestWorkspace, "src", "systems", "saveSystem.ts")), false);

  const fallbackTask = buildManifestLoaderFallbackTask({
    slot,
    candidate,
    assignment,
    validation,
    contract: { ...forbiddenContract, writablePathSafety: "suspicious", supportedOperation: "unsupported" },
    reason: "Structural source-loader work is unsupported by direct apply.",
    now: new Date("2026-06-29T00:02:00.000Z")
  });
  assert.ok(fallbackTask.directApplyUnsafeReason.includes("unsupported"));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("save schema")));
  assert.ok(fallbackTask.manualVisualTestChecklist.some((item) => item.includes("no save")));
} finally {
  cleanupTempWorkspace(manifestWorkspace);
}

const rollbackWorkspace = makeTempWorkspace("v094-rollback");
try {
  writeWorkspaceFile(rollbackWorkspace, ".game-polish-lab/rollback/snapshot.txt", "outside");
  writeWorkspaceJson(rollbackWorkspace, ".game-polish-lab/rollback/escape.rollback.json", {
    id: "escape",
    createdAt: "2026-06-29T00:03:00.000Z",
    sourceOperation: "test",
    adapterId: "generic_phaser",
    surfaceType: "button",
    files: [{
      originalPath: "../outside.txt",
      snapshotPath: ".game-polish-lab/rollback/snapshot.txt",
      fileKind: "style_config"
    }]
  });
  const discovery = discoverVisualRollbackSnapshots(rollbackWorkspace);
  assert.ok(discovery.snapshots.some((snapshot) => snapshot.id === "escape"));
  const restore = restoreVisualRollbackSnapshot(rollbackWorkspace, { snapshotId: "escape", now: new Date("2026-06-29T00:04:00.000Z") });
  assert.notStrictEqual(restore.status, "restored");
  assert.strictEqual(restore.restoredFiles.length, 0);
  assert.strictEqual(fs.existsSync(path.join(path.dirname(rollbackWorkspace), "outside.txt")), false);
  assert.ok(restore.fallbackTaskPath?.startsWith(".game-polish-lab/fallback-tasks/"));
  assert.ok(fs.existsSync(path.join(rollbackWorkspace, ...visualRollbackRelativeDir.split("/"))));
} finally {
  cleanupTempWorkspace(rollbackWorkspace);
}

const releaseReadinessDoc = fs.readFileSync(path.join(process.cwd(), "docs", "release-readiness.md"), "utf8");
assert.ok(releaseReadinessDoc.includes("v0.95 Beta Dogfooding"));
assert.ok(releaseReadinessDoc.includes("v0.99 1.0 Release Candidate"));
assert.ok(releaseReadinessDoc.includes("Out of scope"));
assert.ok(fs.readFileSync(path.join(process.cwd(), "docs", "fallback-task-guide.md"), "utf8").includes("unsupported/structural"));

function testSlot(): VisualAssetSlot {
  return {
    slotId: "cursor_arena.enemy_icon",
    adapterId: "cursor_arena",
    adapterLabel: "Cursor Arena",
    surfaceId: "asset_replacement",
    surfaceLabel: "Enemy Presentation",
    slotLabel: "Enemy icon",
    expectedAssetType: "icon",
    expectedFileExtensions: [".png", ".webp"],
    expectedDimensions: { width: 64, height: 64 },
    transparencyRequired: true,
    currentAssetPath: "src/assets/enemies/enemy.png",
    targetConfigPath: ".game-polish-lab/assets/assignments/enemy.json",
    knownManifestPath: "src/scenes/PreloadScene.ts",
    ownerSourceFileHints: ["src/scenes/PreloadScene.ts"],
    safetyStatus: "suspicious",
    validationStatus: "valid",
    directApplyCapability: "fallback_required",
    notes: []
  };
}

function testCandidate(): ImportedVisualAssetCandidate {
  return {
    candidateId: "enemy-approved",
    originalPath: "incoming/enemy.png",
    copiedAssetPath: ".game-polish-lab/assets/imported/enemy.png",
    targetSlotId: "cursor_arena.enemy_icon",
    fileType: "image/png",
    dimensions: { width: 64, height: 64 },
    fileSizeBytes: 128,
    hasAlpha: true,
    validationWarnings: [],
    validationErrors: [],
    approvalStatus: "approved",
    importedAt: "2026-06-29T00:00:00.000Z"
  };
}

function testAssignment(slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate, validation: VisualAssetValidationResult): AssignedVisualAsset {
  return {
    assignmentId: `${slot.slotId}-${candidate.candidateId}`,
    slotId: slot.slotId,
    candidateId: candidate.candidateId,
    adapterId: slot.adapterId,
    surfaceId: slot.surfaceId,
    copiedAssetPath: candidate.copiedAssetPath,
    usesNormalizedAsset: false,
    assignmentPath: slot.targetConfigPath!,
    targetConfigPath: slot.targetConfigPath,
    knownManifestPath: slot.knownManifestPath,
    runtimeApplied: false,
    fallbackRequired: true,
    validation,
    assignedAt: "2026-06-29T00:00:00.000Z",
    notes: []
  };
}

function testManifestContract(slot: VisualAssetSlot, manifestPath: string): VisualAssetManifestContract {
  return {
    contractId: "cursor_arena.enemy_icon.release_readiness",
    adapterId: slot.adapterId,
    adapterLabel: slot.adapterLabel,
    surfaceId: slot.surfaceId,
    assetSlotId: slot.slotId,
    manifestPath,
    manifestType: "adapter_asset_config",
    writablePathSafety: "safe",
    supportedOperation: "set_asset_path",
    manifestKey: "assets.enemyIcon",
    expectedRelativePathMode: "workspace_relative",
    validationRequirements: [],
    rollbackRequired: true,
    manualTestChecklist: [],
    warnings: [],
    errors: []
  };
}

function makeTempWorkspace(name: string): string {
  return fs.mkdtempSync(path.join(process.cwd(), `.tmp-${name}-`));
}

function writeWorkspaceJson(root: string, relativePath: string, value: unknown): void {
  writeWorkspaceFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeWorkspaceFile(root: string, relativePath: string, text: string): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, "utf8");
}

function cleanupTempWorkspace(root: string): void {
  if (root.startsWith(process.cwd())) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
