import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  applyVisualAssetManifestAssignment,
  buildManifestLoaderFallbackTask,
  checkManifestApplyScope,
  discoverVisualAssetManifestContracts,
  findVisualAssetSlotContract,
  readLatestVisualAssetManifestApplySummaries,
  readVisualAssetManifestApplyIndex,
  readVisualAssetManifestApplyResults,
  visualAssetManifestApplyIndexRelativePath,
  visualAssetManifestApplyRelativeDir,
  writeManifestLoaderFallbackTask
} from "../core/visualAssetManifestDirectApply";
import { buildVisualAssetDashboardRows, visualAssetAssignmentsRelativeDir } from "../core/visualAssetPipeline";
import { writeVisualAssetContractFileSync } from "../core/visualAssetContracts";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import {
  AssignedVisualAsset,
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";
import { VisualAssetContractFile, VisualAssetSlotContract } from "../types/visualAssetContract";

const workspace = makeTempWorkspace("v083-manifest-direct-apply");

try {
  const slot = testSlot();
  const candidate = testCandidate("approved");
  const validation: VisualAssetValidationResult = { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T05:00:00.000Z" };
  const normalization = testNormalization(candidate);
  const assignment = testAssignment(slot, candidate, normalization.outputPath, validation);
  const contractSlot = safeContractSlot();
  const contractFile: VisualAssetContractFile = {
    schemaVersion: 1,
    generatedBy: "game-polish-lab",
    updatedAt: "2026-06-28T05:00:00.000Z",
    contracts: [{
      contractId: "cursor_arena.asset_manifest",
      projectId: "cursor_arena",
      adapterId: "cursor_arena.assets",
      targetSurfaceType: "asset_replacement",
      targetId: "enemy_icon",
      slots: [contractSlot]
    }]
  };
  writeVisualAssetContractFileSync(workspace, contractFile);
  writeJson(workspace, ".game-polish-lab/styles/cursor-arena-assets.json", {
    assets: {
      enemyIcon: "old/enemy.png",
      untouched: "keep-me.png"
    },
    gameplayValue: 10
  });
  writeJson(workspace, assignment.assignmentPath, { copiedAssetPath: "old/path.png", runtimeApplied: false });
  writeWorkspaceFile(workspace, normalization.outputPath, "normalized-bytes");
  const normalizedBefore = readWorkspaceFile(workspace, normalization.outputPath);

  const foundSlotContract = findVisualAssetSlotContract(contractFile, slot);
  assert.strictEqual(foundSlotContract?.manifestPath, ".game-polish-lab/styles/cursor-arena-assets.json");
  const discovered = discoverVisualAssetManifestContracts({
    workspaceRoot: workspace,
    slot,
    contract: foundSlotContract,
    replacementAssetPath: normalization.outputPath
  });
  assert.ok(discovered.some((contract) => contract.contractId.includes("game_polish_lab_assignment") && contract.writablePathSafety === "safe"));
  const safeManifestContract = discovered.find((contract) => contract.contractId === "cursor-arena-enemy-icon-manifest")!;
  assert.strictEqual(safeManifestContract.writablePathSafety, "safe");
  assert.strictEqual(safeManifestContract.supportedOperation, "set_asset_path");
  assert.strictEqual(safeManifestContract.manifestKey, "assets.enemyIcon");

  const sourceContract = discoverVisualAssetManifestContracts({
    workspaceRoot: workspace,
    slot,
    contract: { ...contractSlot, manifestPath: "src/scenes/PreloadScene.ts", manifestPathSafety: "safe" }
  }).find((contract) => contract.contractId === "cursor-arena-enemy-icon-manifest")!;
  assert.notStrictEqual(sourceContract.writablePathSafety, "safe");
  assert.strictEqual(sourceContract.supportedOperation, "unsupported");

  const unknownManifest = discoverVisualAssetManifestContracts({
    workspaceRoot: workspace,
    slot: { ...slot, targetConfigPath: undefined, knownManifestPath: "src/assets/manifest.json" }
  });
  assert.ok(unknownManifest.some((contract) => contract.writablePathSafety === "suspicious" && contract.supportedOperation === "unsupported"));

  const result = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate,
    assignment,
    normalization,
    validation,
    contract: safeManifestContract,
    now: date("2026-06-28T05:01:00.000Z")
  });
  assert.strictEqual(result.status, "applied");
  assert.strictEqual(result.runtimeApplied, false);
  assert.strictEqual(result.previousValue, "old/enemy.png");
  assert.strictEqual(result.newValue, normalization.outputPath);
  assert.ok(result.filesWritten.includes(".game-polish-lab/styles/cursor-arena-assets.json"));
  assert.ok(result.filesWritten.includes(assignment.assignmentPath));
  assert.ok(result.rollbackSnapshotPaths.some((rollbackPath) => rollbackPath.startsWith(".game-polish-lab/rollback/")));
  assert.strictEqual(result.scopeGuardResult.recommendedAction, "allow");
  assert.strictEqual(fs.existsSync(path.join(workspace, ...`${visualAssetManifestApplyRelativeDir}/${result.operationId}.json`.split("/"))), true);
  assert.strictEqual(fs.existsSync(path.join(workspace, ...visualAssetManifestApplyIndexRelativePath.split("/"))), true);
  const manifestAfter = readJson(workspace, ".game-polish-lab/styles/cursor-arena-assets.json") as { assets: { enemyIcon: string; untouched: string }; gameplayValue: number };
  assert.strictEqual(manifestAfter.assets.enemyIcon, normalization.outputPath);
  assert.strictEqual(manifestAfter.assets.untouched, "keep-me.png");
  assert.strictEqual(manifestAfter.gameplayValue, 10);
  assert.strictEqual(readWorkspaceFile(workspace, normalization.outputPath), normalizedBefore);
  const assignedAfter = readJson(workspace, assignment.assignmentPath) as AssignedVisualAsset;
  assert.strictEqual(assignedAfter.copiedAssetPath, normalization.outputPath);
  assert.strictEqual(assignedAfter.runtimeApplied, false);
  assert.strictEqual(readVisualAssetManifestApplyResults(workspace)[0].operationId, result.operationId);
  assert.strictEqual(readVisualAssetManifestApplyIndex(workspace).results[0].status, "applied");
  assert.strictEqual(readLatestVisualAssetManifestApplySummaries(workspace)[0].runtimeApplied, false);

  const unapproved = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate: testCandidate("pending"),
    validation,
    contract: safeManifestContract,
    now: date("2026-06-28T05:02:00.000Z")
  });
  assert.strictEqual(unapproved.status, "skipped");
  assert.ok(unapproved.errors.some((error) => error.includes("approved")));

  const invalid = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate,
    validation: { status: "invalid", warnings: [], errors: ["bad alpha"], checkedAt: "2026-06-28T05:03:00.000Z" },
    contract: safeManifestContract,
    now: date("2026-06-28T05:03:00.000Z")
  });
  assert.strictEqual(invalid.status, "skipped");
  assert.ok(invalid.errors.some((error) => error.includes("validation")));

  const missingContract = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate,
    validation,
    contract: unknownManifest[0],
    now: date("2026-06-28T05:04:00.000Z")
  });
  assert.strictEqual(missingContract.status, "fallback_required");

  const blockedContract = { ...safeManifestContract, manifestPath: "src/systems/saveSystem.ts", writablePathSafety: "safe" as const };
  const blocked = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate,
    validation,
    contract: blockedContract,
    now: date("2026-06-28T05:05:00.000Z")
  });
  assert.strictEqual(blocked.status, "failed");
  assert.ok(blocked.errors.some((error) => error.includes("Scope guard")));

  const sourceApply = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate,
    validation,
    contract: sourceContract,
    now: date("2026-06-28T05:06:00.000Z")
  });
  assert.strictEqual(sourceApply.status, "fallback_required");
  assert.ok(sourceApply.errors.some((error) => error.includes("not safe")));

  const rows = buildVisualAssetDashboardRows(
    [slot],
    [candidate],
    [assignment],
    "2026-06-28T05:07:00.000Z",
    [testBounds(candidate)],
    [normalization],
    [{ guideId: "guide", assetSlotId: slot.slotId, assetSlotLabel: slot.slotLabel, adapterId: slot.adapterId, surfaceId: slot.surfaceId, markdownPath: ".game-polish-lab/assets/style-guides/guide.md", jsonPath: ".game-polish-lab/assets/style-guides/guide.json", createdAt: "2026-06-28T05:00:00.000Z", warnings: [] }],
    discovered,
    readLatestVisualAssetManifestApplySummaries(workspace)
  );
  assert.strictEqual(rows[0].manifestContract?.contractId, "cursor_arena.enemy_icon.game_polish_lab_assignment");
  assert.strictEqual(rows[0].actions.applyManifestAssignment, true);
  assert.strictEqual(rows[0].actions.openManifestContract, true);
  assert.strictEqual(rows[0].actions.openManifestApplyResult, true);
  assert.strictEqual(rows[0].manifestApplyResult?.status, "fallback_required");
  assert.strictEqual(rows[0].manifestApplyResult?.runtimeApplied, false);

  const fallbackTask = buildManifestLoaderFallbackTask({
    slot,
    candidate,
    assignment,
    normalization,
    validation,
    boundsAnalysis: testBounds(candidate),
    styleGuidePath: ".game-polish-lab/assets/style-guides/guide.md",
    contract: sourceContract,
    reason: "Source loader file is not a safe manifest direct-apply target.",
    now: date("2026-06-28T05:08:00.000Z")
  });
  assert.strictEqual(fallbackTask.instruction, "wire this approved normalized asset assignment into this selected visual asset slot only.");
  assert.ok(fallbackTask.allowedFiles.includes(assignment.assignmentPath));
  assert.ok(fallbackTask.allowedFiles.includes(normalization.outputPath));
  assert.ok(fallbackTask.allowedFiles.includes(".game-polish-lab/assets/style-guides/guide.md"));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("save schema")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("economy")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("visual redesign")));
  assert.ok(!JSON.stringify(fallbackTask).includes("make the assets better"));
  assert.ok(!JSON.stringify(fallbackTask).includes("improve the game visuals"));
  assert.ok(!JSON.stringify(fallbackTask).includes("refactor the loader broadly"));
  assert.ok(!JSON.stringify(fallbackTask).includes("change gameplay to fit the asset"));
  assert.ok(writeManifestLoaderFallbackTask(workspace, fallbackTask).startsWith(".game-polish-lab/fallback-tasks/"));

  const scoped = checkManifestApplyScope(safeManifestContract, assignment, normalization.outputPath);
  assert.strictEqual(scoped.recommendedAction, "allow");
  const scope = checkVisualScopeGuard({
    operationType: "asset_manifest_direct_apply",
    adapterId: "cursor_arena",
    surfaceType: "asset_replacement",
    explicitSafePaths: [".game-polish-lab/styles/cursor-arena-assets.json"],
    candidatePaths: [
      ".game-polish-lab/assets/manifest-applies/index.json",
      ".game-polish-lab/assets/assignments/enemy.json",
      ".game-polish-lab/assets/imported/enemy.png",
      ".game-polish-lab/assets/normalized/enemy.png",
      ".game-polish-lab/assets/style-guides/guide.md",
      ".game-polish-lab/styles/cursor-arena-assets.json",
      "src/assets/enemies/enemy.png",
      "src/scenes/PreloadScene.ts",
      "src/loader/AssetLoader.ts",
      "src/systems/saveSystem.ts",
      "src/data/economy.ts",
      "package.json"
    ]
  });
  assert.strictEqual(scope.recommendedAction, "block");
  assert.ok(scope.classifiedFiles.some((file) => file.path === ".game-polish-lab/assets/manifest-applies/index.json" && file.classification === "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === ".game-polish-lab/styles/cursor-arena-assets.json" && file.classification === "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/assets/enemies/enemy.png" && file.classification !== "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/scenes/PreloadScene.ts" && file.classification === "suspicious"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/loader/AssetLoader.ts" && file.classification === "suspicious"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/systems/saveSystem.ts" && file.classification === "forbidden"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/data/economy.ts" && file.classification === "forbidden"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "package.json" && file.classification === "forbidden"));
} finally {
  cleanupTempWorkspace(workspace);
}

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
    targetConfigPath: `${visualAssetAssignmentsRelativeDir}/enemy.json`,
    knownManifestPath: "src/scenes/PreloadScene.ts",
    ownerSourceFileHints: ["src/scenes/PreloadScene.ts", "src/assets/enemies"],
    safetyStatus: "suspicious",
    validationStatus: "unvalidated",
    directApplyCapability: "fallback_required",
    notes: []
  };
}

function safeContractSlot(): VisualAssetSlotContract {
  return {
    assetSlotId: "enemy_icon",
    label: "Enemy icon",
    expectedWidth: 64,
    expectedHeight: 64,
    expectedFormats: ["PNG"],
    transparencyRequirement: "required",
    visibleBoundsRequired: true,
    manifestContractId: "cursor-arena-enemy-icon-manifest",
    manifestPath: ".game-polish-lab/styles/cursor-arena-assets.json",
    manifestType: "adapter_asset_config",
    manifestPathSafety: "safe",
    manifestOperation: "set_asset_path",
    manifestKey: "assets.enemyIcon",
    manifestCurrentValue: "old/enemy.png",
    expectedRelativePathMode: "workspace_relative",
    loaderHint: "style_config",
    validation: { status: "valid", warnings: [], errors: [], lastCheckedAt: "2026-06-28T05:00:00.000Z" }
  };
}

function testCandidate(status: "approved" | "pending"): ImportedVisualAssetCandidate {
  return {
    candidateId: `enemy-${status}`,
    originalPath: "incoming/enemy.png",
    copiedAssetPath: ".game-polish-lab/assets/imported/enemy.png",
    targetSlotId: "cursor_arena.enemy_icon",
    fileType: "image/png",
    dimensions: { width: 64, height: 64 },
    fileSizeBytes: 123,
    hasAlpha: true,
    validationWarnings: [],
    validationErrors: [],
    approvalStatus: status,
    importedAt: "2026-06-28T05:00:00.000Z"
  };
}

function testNormalization(candidate: ImportedVisualAssetCandidate): VisualAssetNormalizationResult {
  return {
    normalizedAssetId: "enemy-normalized",
    sourceCandidateId: candidate.candidateId,
    sourcePath: candidate.copiedAssetPath,
    outputPath: ".game-polish-lab/assets/normalized/enemy.png",
    targetWidth: 64,
    targetHeight: 64,
    paddingApplied: { left: 8, right: 8, top: 8, bottom: 8 },
    scaleApplied: 1,
    contentOffsetApplied: { x: 0, y: 0 },
    originalPreserved: true,
    validationResult: { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T05:00:00.000Z" },
    status: "created",
    warnings: [],
    errors: [],
    createdAt: "2026-06-28T05:00:00.000Z"
  };
}

function testAssignment(slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate, assetPath: string, validation: VisualAssetValidationResult): AssignedVisualAsset {
  return {
    assignmentId: `${slot.slotId}-${candidate.candidateId}`,
    slotId: slot.slotId,
    candidateId: candidate.candidateId,
    adapterId: slot.adapterId,
    surfaceId: slot.surfaceId,
    copiedAssetPath: assetPath,
    normalizedAssetPath: assetPath,
    usesNormalizedAsset: true,
    assignmentPath: slot.targetConfigPath!,
    targetConfigPath: slot.targetConfigPath,
    knownManifestPath: slot.knownManifestPath,
    runtimeApplied: false,
    fallbackRequired: true,
    validation,
    assignedAt: "2026-06-28T05:00:00.000Z",
    notes: []
  };
}

function testBounds(candidate: ImportedVisualAssetCandidate): VisualAssetBoundsAnalysisResult {
  return {
    candidateId: candidate.candidateId,
    sourceAssetPath: candidate.copiedAssetPath,
    imageWidth: 64,
    imageHeight: 64,
    visibleBounds: { x: 8, y: 8, width: 48, height: 48 },
    visibleAreaRatio: 0.5625,
    emptyTransparentImage: false,
    touchesCanvasEdge: { left: false, right: false, top: false, bottom: false },
    centerOffset: { x: 0, y: 0, xPct: 0, yPct: 0 },
    recommendedAction: "none",
    warnings: [],
    errors: [],
    checkedAt: "2026-06-28T05:00:00.000Z"
  };
}

function writeJson(root: string, relativePath: string, value: unknown): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(root: string, relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8")) as unknown;
}

function writeWorkspaceFile(root: string, relativePath: string, text: string): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, "utf8");
}

function readWorkspaceFile(root: string, relativePath: string): string {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8");
}

function date(value: string): Date {
  return new Date(value);
}

function makeTempWorkspace(name: string): string {
  return fs.mkdtempSync(path.join(process.cwd(), `.tmp-${name}-`));
}

function cleanupTempWorkspace(root: string): void {
  if (root.startsWith(process.cwd())) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
