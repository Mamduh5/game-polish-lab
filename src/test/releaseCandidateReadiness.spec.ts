import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import { buildVisualAssetDashboardModel } from "../core/visualAssetPipeline";
import { buildVisualDirectApplyFallbackTask, buildVisualDirectApplyPlan } from "../core/visualDirectApplyTemplates";
import { discoverVisualRollbackSnapshots, findLatestVisualRollbackForFile, restoreVisualRollbackSnapshot } from "../core/visualRollback";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import { buildVisualTuningDashboardModel, DashboardSurfaceInput, selectProductionDashboardSurfaces } from "../core/visualTuningDashboardModel";

const root = process.cwd();

const packageJson = readJson("package.json") as {
  version: string;
  scripts?: Record<string, string>;
  contributes?: { commands?: Array<{ command: string; title: string }> };
};
assert.strictEqual(packageJson.version, "0.9.9");
assert.ok(packageJson.scripts?.["package:check"]);
assert.ok(packageJson.scripts?.package?.includes("npm pack --dry-run"));
assert.ok(!/vsce\s+publish|npm\s+publish/.test(packageJson.scripts?.package ?? ""));

const rcDoc = readText("docs/1.0-release-candidate.md");
const rcChecklist = readText("docs/1.0-rc-verification-checklist.md");
const rcNotes = readText("docs/release-notes-v1.0-rc.md");
const readiness = readText("docs/release-readiness.md");
const packageCheck = readText("scripts/package-check.js");
const readme = readText("README.md");
const usage = readText("USAGE.md");
const visualDashboardSource = readText("src/commands/openVisualTuningDashboard.ts");
const assetDashboardSource = readText("src/commands/openAssetPipelineDashboard.ts");
const rollbackHistorySource = readText("src/commands/openRollbackHistory.ts");
const tunerSource = readText("src/commands/tuneVisualSurface.ts");

for (const docPath of [
  "docs/1.0-release-candidate.md",
  "docs/1.0-rc-verification-checklist.md",
  "docs/release-notes-v1.0-rc.md"
]) {
  assert.strictEqual(fs.existsSync(path.join(root, ...docPath.split("/"))), true, `${docPath} missing`);
  assert.ok(packageCheck.includes(docPath), `package-check must require ${docPath}`);
}

for (const included of [
  "Visual Tuning Dashboard",
  "Slot/card",
  "panel",
  "button",
  "reward toast",
  "background readability",
  "Asset import",
  "Monster Farm adapter",
  "Sort Puzzle adapter",
  "Cursor Arena adapter",
  "Generic Phaser adapter",
  "Direct apply",
  "Fallback task",
  "Scope guard",
  "Rollback",
  "Result tracking",
  "Packaging",
  "beta dogfooding"
]) {
  assert.ok(rcDoc.includes(included), `RC scope should include ${included}`);
}

for (const deferred of [
  "Publishing to Marketplace",
  "New adapters",
  "New visual surfaces",
  "Screenshot annotation",
  "Live in-game dev overlay",
  "Structural gameplay",
  "make beautiful",
  "Runtime integration for Sort Puzzle or Cursor Arena"
]) {
  assert.ok(rcDoc.includes(deferred), `RC deferred scope should mention ${deferred}`);
  assert.ok(rcChecklist.includes(deferred) || rcNotes.includes(deferred), `RC checklist/notes should mention ${deferred}`);
}

for (const pending of ["Publisher", "License", "Extension icon", "Marketplace copy", "Manual VS Code smoke test"]) {
  assert.ok(rcDoc.toLowerCase().includes(pending.toLowerCase()), `RC doc should keep ${pending} pending`);
}
assert.ok(rcDoc.includes("does not publish the extension"));
assert.ok(rcNotes.includes("has not been published to Marketplace"));
assert.ok(readiness.includes("v0.99 1.0 Release Candidate"));
assert.ok(readiness.includes("does not publish the extension"));
assert.ok(readme.includes("USAGE.md"));
assert.ok(readme.includes("docs/1.0-release-candidate.md"));
assert.ok(readme.includes("docs/1.0-rc-verification-checklist.md"));
assert.ok(usage.includes("Direct apply is intentionally narrow"));
assert.ok(usage.includes("Undo Last Apply"));
assert.ok(usage.includes("Ctrl+Z"));
assert.ok(usage.includes("Sort Puzzle and Cursor Arena"));
assert.ok(usage.includes("gameplay, save, economy, progression, ad, rules, solver, level-data, player, projectile, shooter, or monetization logic"));

for (const command of [
  ["gamePolishLab.openVisualTuningDashboard", "Game Polish Lab: Open Visual Tuning Dashboard"],
  ["gamePolishLab.tuneVisualSurface", "Game Polish Lab: Tune Visual Surface"],
  ["gamePolishLab.openAssetPipelineDashboard", "Game Polish Lab: Open Asset Pipeline Dashboard"],
  ["gamePolishLab.openRollbackHistory", "Game Polish Lab: Open Rollback History"],
  ["gamePolishLab.checkCodexScope", "Game Polish Lab: Check Codex Scope"]
] as const) {
  assert.ok(packageJson.contributes?.commands?.some((entry) => entry.command === command[0] && entry.title === command[1]), `${command[0]} title changed`);
}

const unsupportedAssetPlan = buildVisualDirectApplyPlan({
  adapterId: "sort_puzzle",
  surfaceType: "asset_replacement",
  targetId: "spirit_asset_presentation",
  candidatePaths: [".game-polish-lab/assets/assignments/spirit.json"]
});
assert.strictEqual(unsupportedAssetPlan.executable, false);
assert.ok(unsupportedAssetPlan.blockingReasons.some((reason) => reason.includes("Direct apply unavailable")));

const blockedRuntimePlan = buildVisualDirectApplyPlan({
  adapterId: "cursor_arena",
  surfaceType: "reward_toast",
  targetId: "cursor_hit_feedback",
  styleConfigPath: ".game-polish-lab/styles/cursor-arena-feedback-style.json",
  candidatePaths: [
    ".game-polish-lab/styles/cursor-arena-feedback-style.json",
    "src/arena/data/enemySpawnConfig.js",
    "src/player/PlayerController.ts"
  ]
});
assert.strictEqual(blockedRuntimePlan.executable, false);
const fallback = buildVisualDirectApplyFallbackTask(blockedRuntimePlan);
assert.ok(fallback.templateId.includes("fallback"));
assert.ok(fallback.instructions.some((instruction) => instruction.toLowerCase().includes("fallback")));
assert.ok(fallback.forbiddenFiles.some((file) => file.includes("enemySpawnConfig")));
assert.ok(fallback.forbiddenFiles.some((file) => file.includes("PlayerController")));

const forbiddenScope = checkVisualScopeGuard({
  operationType: "direct_apply",
  adapterId: "idle_monster_farm",
  surfaceType: "button",
  targetId: "buttons",
  candidatePaths: [
    "src/systems/saveSystem.ts",
    "src/data/economy.ts",
    "src/services/rewardedAdService.ts",
    "src/data/spiritSortLevels.ts",
    "src/arena/data/enemySpawnConfig.js",
    "src/player/PlayerController.ts"
  ]
});
assert.strictEqual(forbiddenScope.recommendedAction, "block");
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "save_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "economy_or_balance_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "ad_or_sdk_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "level_data_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "cursor_arena_balance_file"));
assert.ok(forbiddenScope.classifiedFiles.some((file) => file.reasonCode === "cursor_arena_player_projectile_file"));

const rollbackWorkspace = makeTempWorkspace("v099-rollback");
try {
  writeWorkspaceJson(rollbackWorkspace, ".game-polish-lab/styles/farm-slot-style.json", {
    presetName: "current-style",
    values: { marker: "current" }
  });
  writeWorkspaceJson(rollbackWorkspace, ".game-polish-lab/rollback/farm-slot-before.json", {
    presetName: "before-style",
    values: { marker: "before" }
  });
  writeWorkspaceJson(rollbackWorkspace, ".game-polish-lab/rollback/slot.rollback.json", {
    id: "slot-style",
    createdAt: "2026-06-29T00:11:00.000Z",
    sourceOperation: "rc-test",
    adapterId: "idle_monster_farm",
    surfaceType: "slot_card",
    targetId: "farm_slots",
    files: [{
      originalPath: ".game-polish-lab/styles/farm-slot-style.json",
      snapshotPath: ".game-polish-lab/rollback/farm-slot-before.json",
      fileKind: "style_config"
    }]
  });
  writeWorkspaceFile(rollbackWorkspace, ".game-polish-lab/rollback/snapshot.json", "{}\n");
  writeWorkspaceJson(rollbackWorkspace, ".game-polish-lab/rollback/escape.rollback.json", {
    id: "escape",
    createdAt: "2026-06-29T00:09:00.000Z",
    sourceOperation: "rc-test",
    adapterId: "generic_phaser",
    surfaceType: "button",
    files: [{
      originalPath: "../outside.json",
      snapshotPath: ".game-polish-lab/rollback/snapshot.json",
      fileKind: "style_config"
    }]
  });
  const discovery = discoverVisualRollbackSnapshots(rollbackWorkspace);
  const latestSlotRollback = findLatestVisualRollbackForFile(rollbackWorkspace, ".game-polish-lab/styles/farm-slot-style.json", "slot_card");
  assert.strictEqual(latestSlotRollback?.snapshot.id, "slot-style");
  assert.strictEqual(latestSlotRollback?.file.originalPath, ".game-polish-lab/styles/farm-slot-style.json");
  const restoredSlot = restoreVisualRollbackSnapshot(rollbackWorkspace, { snapshotId: "slot-style", fileIds: [latestSlotRollback!.file.fileId], now: new Date("2026-06-29T00:12:00.000Z") });
  assert.strictEqual(restoredSlot.status, "restored");
  assert.strictEqual(restoredSlot.restoredFiles.length, 1);
  assert.strictEqual((JSON.parse(fs.readFileSync(path.join(rollbackWorkspace, ".game-polish-lab", "styles", "farm-slot-style.json"), "utf8")) as { presetName: string }).presetName, "before-style");
  assert.ok(discovery.snapshots.some((snapshot) => snapshot.id === "escape"));
  const restored = restoreVisualRollbackSnapshot(rollbackWorkspace, { snapshotId: "escape", now: new Date("2026-06-29T00:10:00.000Z") });
  assert.notStrictEqual(restored.status, "restored");
  assert.strictEqual(restored.restoredFiles.length, 0);
  assert.strictEqual(fs.existsSync(path.join(path.dirname(rollbackWorkspace), "outside.json")), false);
} finally {
  cleanupTempWorkspace(rollbackWorkspace);
}

for (const source of [visualDashboardSource, assetDashboardSource, rollbackHistorySource]) {
  assert.ok(source.includes("Last refreshed"));
  assert.ok(source.includes(":hover"));
  assert.ok(source.includes(":focus-visible"));
  assert.ok(source.includes(":active"));
  assert.ok(source.includes("color-mix"));
  assert.ok(source.includes("button:disabled"));
}
assert.ok(visualDashboardSource.includes("Refreshing dashboard..."));
assert.ok(assetDashboardSource.includes("Refreshing asset pipeline dashboard..."));
assert.ok(rollbackHistorySource.includes("Refreshing rollback history..."));
assert.ok(tunerSource.includes("Undo Last Apply"));
assert.ok(tunerSource.includes("undoLastApply"));
assert.ok(tunerSource.includes("Ctrl+Z"));
assert.ok(tunerSource.includes("Preview baseline refreshed from saved config."));
assert.ok(tunerSource.includes("findLatestVisualRollbackForFile"));
assert.ok(tunerSource.includes("supported Idle Monster Farm visual style configs"));
assert.ok(visualDashboardSource.includes("selectProductionDashboardSurfaces"));
assert.ok(visualDashboardSource.includes("workspaceRelativeUri"));
assert.ok(visualDashboardSource.includes("Workspace Detection"));
assert.ok(assetDashboardSource.includes("Workspace Detection"));
assert.ok(tunerSource.includes("idleMonsterFarmDetected"));
assert.ok(tunerSource.includes("Idle Monster Farm direct apply is blocked"));
assert.ok(tunerSource.includes("previewSource"));
assert.ok(tunerSource.includes("real_project_current_config"));
assert.ok(tunerSource.includes("real_project_generated_default"));
assert.ok(tunerSource.includes("example_preview_not_connected"));
assert.ok(tunerSource.includes("fixture_test_preview"));
assert.ok(tunerSource.includes("Preview source:"));
assert.ok(tunerSource.includes("Before: example preview - not read from your game yet"));
assert.ok(tunerSource.includes("Save Config"));
assert.ok(tunerSource.includes("Save & Apply"));
assert.ok(tunerSource.includes("Farm Slot Runtime Editor: the running Idle Monster Farm browser game is the preview."));
assert.ok(tunerSource.includes("The embedded game or Open Live Game fallback is the preview."));
assert.ok(tunerSource.includes("frame-src http://127.0.0.1:* http://localhost:*"));
assert.ok(tunerSource.includes("Open Live Game"));
assert.ok(tunerSource.includes("Check Connection"));
assert.ok(tunerSource.includes("Install Runtime Bridge"));
assert.ok(tunerSource.includes('command:"checkRuntimeConnection"'));
assert.ok(tunerSource.includes('command:"installRuntimeBridge"'));
assert.ok(tunerSource.includes('command:"saveStyle"'));
assert.ok(tunerSource.includes("writeLiveStyle"));
assert.ok(tunerSource.includes("snapshotFarmSlotConnectReadOnlyFiles"));
assert.ok(tunerSource.includes("diffFarmSlotConnectSnapshots"));
assert.ok(tunerSource.includes("Runtime bridge not installed"));
assert.ok(tunerSource.includes("m.runtimeConnectionProof&&surfaceData&&surfaceData.adapterState"));
assert.ok(tunerSource.includes("Saved config only. Direct apply is not connected"));
assert.ok(tunerSource.includes("save/apply result:"));
assert.ok(tunerSource.includes("applied_to_real_workspace"));
assert.ok(tunerSource.includes("saved_config_only"));
assert.ok(tunerSource.includes("adapterOutcomeAppliedToRuntime"));
assert.ok(tunerSource.includes('result.runtimeConnectionProof.status === "connected"'));
assert.ok(tunerSource.includes("runtime_value_usage"));
assert.ok(tunerSource.includes("runtimeConnectionProof"));

const checkRuntimeConnectionBody = extractFunctionBody(tunerSource, "checkFarmSlotRuntimeConnection");
assert.ok(checkRuntimeConnectionBody.includes("snapshotFarmSlotConnectReadOnlyFiles"));
assert.ok(checkRuntimeConnectionBody.includes("diffFarmSlotConnectSnapshots"));
for (const forbiddenCall of [
  "writeTextFile",
  "ensureDirectory",
  "setupIdleMonsterFarmFarmSlotBridge",
  "applyIdleMonsterFarmFarmSlotStyle",
  "executeVisualDirectApplyPlan",
  "renderFarmSlotStyleModule",
  "writeFarmSlotLiveStyle",
  "saveConfigAndApply"
]) {
  assert.ok(!checkRuntimeConnectionBody.includes(forbiddenCall), `Check Connection must not call ${forbiddenCall}`);
}

const idleSurface = fakeSurface("idle_monster_farm", "Monster Farm Slots", "slot_card");
const genericSurface = fakeSurface("generic_phaser", "Generic Phaser Slot/Card", "slot_card");
const cursorSurface = fakeSurface("cursor_arena", "Cursor Hit Feedback", "reward_toast");

const nonMonsterSurfaceSelection = selectProductionDashboardSurfaces({
  idleDetected: false,
  sortPuzzleDetected: false,
  cursorArenaDetected: false,
  genericDetected: true,
  idleSurfaces: [idleSurface],
  sortPuzzleSurfaces: [],
  cursorArenaSurfaces: [],
  genericSurfaces: [genericSurface]
});
assert.ok(nonMonsterSurfaceSelection.every((row) => row.adapter.adapterId !== "idle_monster_farm"));
assert.ok(nonMonsterSurfaceSelection.some((row) => row.adapter.adapterId === "generic_phaser"));

const cursorSurfaceSelection = selectProductionDashboardSurfaces({
  idleDetected: false,
  sortPuzzleDetected: false,
  cursorArenaDetected: true,
  genericDetected: true,
  idleSurfaces: [idleSurface],
  sortPuzzleSurfaces: [],
  cursorArenaSurfaces: [cursorSurface],
  genericSurfaces: [genericSurface]
});
assert.ok(cursorSurfaceSelection.some((row) => row.adapter.adapterId === "cursor_arena"));
assert.ok(cursorSurfaceSelection.every((row) => row.adapter.adapterId !== "idle_monster_farm"));

const idleSurfaceSelection = selectProductionDashboardSurfaces({
  idleDetected: true,
  sortPuzzleDetected: false,
  cursorArenaDetected: false,
  genericDetected: true,
  idleSurfaces: [idleSurface],
  sortPuzzleSurfaces: [],
  cursorArenaSurfaces: [],
  genericSurfaces: [genericSurface]
});
assert.ok(idleSurfaceSelection.some((row) => row.adapter.adapterId === "idle_monster_farm"));

const noWorkspaceDashboard = buildVisualTuningDashboardModel({
  workspaceFolder: "",
  workspaceName: "No workspace folder",
  workspaceMode: "no_workspace",
  phaserDetected: false,
  detectedAdapter: "unknown",
  adapterConfidence: "unknown",
  detectionEvidence: [],
  detectionWarnings: ["No VS Code workspace folder is open."],
  surfaces: [],
  attemptIndex: { schemaVersion: "visual-tuning-attempt-index/v1", updatedAt: "2026-06-30T00:00:00.000Z", attempts: [] }
});
assert.strictEqual(noWorkspaceDashboard.summary.workspaceMode, "no_workspace");
assert.strictEqual(noWorkspaceDashboard.rows.length, 0);

const cursorAssetDashboard = buildVisualAssetDashboardModel({
  workspaceRoot: path.join(root, "fake-cursor-workspace"),
  workspaceName: "Do Not Click This Button",
  workspaceMode: "real_workspace",
  files: [
    { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"^3.80.0\"}}" },
    { relativePath: "arena.html", text: "<div id=\"game\"></div>" },
    { relativePath: "src/arena/systems/CursorAttackSystem.js", text: "export class CursorAttackSystem {}" },
    { relativePath: "src/arena/scenes/ArenaScene.js", text: "export class ArenaScene extends Phaser.Scene {}" }
  ]
});
assert.strictEqual(cursorAssetDashboard.workspaceName, "Do Not Click This Button");
assert.strictEqual(cursorAssetDashboard.workspaceMode, "real_workspace");
assert.strictEqual(cursorAssetDashboard.activeAdapter, "cursor_arena");
assert.ok(cursorAssetDashboard.rows.length > 0);
assert.ok(cursorAssetDashboard.rows.every((row) => row.slot.adapterId !== "idle_monster_farm"));

const genericAssetDashboard = buildVisualAssetDashboardModel({
  workspaceRoot: path.join(root, "fake-generic-workspace"),
  workspaceName: "Generic Phaser",
  workspaceMode: "real_workspace",
  files: [
    { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"^3.80.0\"}}" },
    { relativePath: "src/scenes/PlayScene.ts", text: "export class PlayScene extends Phaser.Scene { create(){ this.add.text(0,0,'start'); } }" }
  ]
});
assert.notStrictEqual(genericAssetDashboard.activeAdapter, "idle_monster_farm");
assert.ok(genericAssetDashboard.rows.every((row) => row.slot.adapterId !== "idle_monster_farm"));

const idleAssetDashboard = buildVisualAssetDashboardModel({
  workspaceRoot: path.join(root, "fake-idle-monster-farm-workspace"),
  workspaceName: "Idle Monster Farm",
  workspaceMode: "real_workspace",
  files: [
    { relativePath: "package.json", text: "{\"dependencies\":{\"phaser\":\"^3.80.0\"}}" },
    { relativePath: "src/scenes/FarmScene.ts", text: "export class FarmScene extends Phaser.Scene { hatch(){ const monster = 'monster'; } }" },
    { relativePath: "src/rendering/MonsterRenderer.ts", text: "export function renderMonster(){}" }
  ]
});
assert.strictEqual(idleAssetDashboard.activeAdapter, "idle_monster_farm");
assert.ok(idleAssetDashboard.rows.some((row) => row.slot.adapterId === "idle_monster_farm"));
assert.ok(idleAssetDashboard.rows.every((row) => !path.isAbsolute(row.slot.targetConfigPath ?? "")));

for (const dogfoodDocPath of ["docs/beta-dogfooding-v0.95.md", "docs/beta-dogfooding-checklist.md"]) {
  const text = readText(dogfoodDocPath);
  assert.ok(text.includes("Idle Monster Farm"));
  assert.ok(text.includes("Sort Puzzle"));
  assert.ok(text.includes("Cursor Arena"));
}

for (const note of [rcDoc, rcChecklist, rcNotes]) {
  assert.ok(note.includes("No gameplay") || note.includes("no gameplay") || note.includes("gameplay") && note.includes("out of scope"));
  assert.ok(!/available (on|in) Marketplace|Marketplace availability|is published|was published/i.test(note));
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8");
}

function readJson(relativePath: string): unknown {
  return JSON.parse(readText(relativePath));
}

function extractFunctionBody(source: string, functionName: string): string {
  const start = source.indexOf(`function ${functionName}`);
  assert.ok(start >= 0, `${functionName} not found`);
  const firstBrace = source.indexOf("{", start);
  assert.ok(firstBrace >= 0, `${functionName} body not found`);
  let depth = 0;
  for (let index = firstBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(firstBrace + 1, index);
      }
    }
  }
  assert.fail(`${functionName} body did not terminate`);
}

function makeTempWorkspace(name: string): string {
  return fs.mkdtempSync(path.join(root, `.tmp-${name}-`));
}

function writeWorkspaceJson(workspaceRoot: string, relativePath: string, value: unknown): void {
  writeWorkspaceFile(workspaceRoot, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeWorkspaceFile(workspaceRoot: string, relativePath: string, text: string): void {
  const absolutePath = path.join(workspaceRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, "utf8");
}

function cleanupTempWorkspace(workspaceRoot: string): void {
  if (workspaceRoot.startsWith(root)) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function fakeSurface(adapterId: "idle_monster_farm" | "generic_phaser" | "cursor_arena", displayName: string, surfaceType: "slot_card" | "reward_toast"): DashboardSurfaceInput {
  const configPath = `.game-polish-lab/styles/${adapterId}-${surfaceType}.json`;
  return {
    surfaceType,
    displayName,
    adapter: {
      adapterId,
      targetId: `${adapterId}_${surfaceType}`,
      targetLabel: displayName,
      connectedState: adapterId === "idle_monster_farm" ? "connected" : "not_connected",
      detected: true,
      confidence: "high",
      directApplySupported: adapterId !== "cursor_arena",
      generatedStyleModulePath: adapterId === "idle_monster_farm" ? "src/config/farmSlotStyle.ts" : undefined,
      ownerFiles: adapterId === "idle_monster_farm" ? ["src/scenes/FarmScene.ts"] : ["src/scenes/PlayScene.ts"],
      warnings: []
    },
    config: { status: "missing", path: configPath, exists: false },
    recipeFile: { status: "missing", path: ".game-polish-lab/visual-recipes/fake.json", exists: false },
    fallbackTaskCount: 0,
    scopeFiles: [configPath]
  };
}
