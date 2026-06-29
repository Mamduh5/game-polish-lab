import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import { buildVisualDirectApplyFallbackTask, buildVisualDirectApplyPlan } from "../core/visualDirectApplyTemplates";
import { discoverVisualRollbackSnapshots, restoreVisualRollbackSnapshot } from "../core/visualRollback";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";

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
assert.ok(readme.includes("docs/1.0-release-candidate.md"));
assert.ok(readme.includes("docs/1.0-rc-verification-checklist.md"));

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
  assert.ok(discovery.snapshots.some((snapshot) => snapshot.id === "escape"));
  const restored = restoreVisualRollbackSnapshot(rollbackWorkspace, { snapshotId: "escape", now: new Date("2026-06-29T00:10:00.000Z") });
  assert.notStrictEqual(restored.status, "restored");
  assert.strictEqual(restored.restoredFiles.length, 0);
  assert.strictEqual(fs.existsSync(path.join(path.dirname(rollbackWorkspace), "outside.json")), false);
} finally {
  cleanupTempWorkspace(rollbackWorkspace);
}

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
