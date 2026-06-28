import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import { writeRgbaPngPixels } from "../core/assetReplacement";
import { analyzeVisualAssetBounds, writeVisualAssetBoundsResult } from "../core/visualAssetBoundsNormalization";
import {
  buildContactSheetComparisonFallbackTask,
  createAndWriteVisualAssetContactSheetComparison,
  visualAssetContactSheetComparisonRelativeDir
} from "../core/visualAssetContactSheetComparison";
import {
  applyVisualAssetManifestAssignment,
  buildManifestLoaderFallbackTask
} from "../core/visualAssetManifestDirectApply";
import {
  buildVisualAssetDashboardRows,
  buildVisualAssetFallbackTask,
  validateImportedVisualAssetCandidate,
  visualAssetAssignmentsRelativeDir,
  visualAssetDashboardRelativePath
} from "../core/visualAssetPipeline";
import { generateVisualAssetStyleGuide } from "../core/visualAssetStyleGuide";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import {
  AssignedVisualAsset,
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";
import { VisualAssetComparisonSet } from "../types/visualAssetContactSheetComparison";
import { VisualAssetManifestContract } from "../types/visualAssetManifestDirectApply";

const workspace = makeTempWorkspace("v085-asset-pipeline-stabilization");

try {
  const slot = testSlot();
  const approved = testCandidate("approved", ".game-polish-lab/assets/imported/enemy.png");
  const pending = testCandidate("pending", ".game-polish-lab/assets/imported/enemy.png");
  const validation: VisualAssetValidationResult = { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T07:00:00.000Z" };
  const normalization = testNormalization(approved);
  const assignment = testAssignment(slot, approved, normalization.outputPath, validation);
  const manifestContract = testManifestContract(slot);
  writeWorkspaceFile(workspace, approved.copiedAssetPath, visiblePng());
  writeWorkspaceFile(workspace, normalization.outputPath, visiblePng());
  writeWorkspaceFile(workspace, slot.currentAssetPath!, visiblePng());
  writeJson(workspace, visualAssetDashboardRelativePath, { schemaVersion: "visual-asset-pipeline-dashboard/v1", candidates: [pending], assignments: [] });

  const firstBounds = testBounds(approved, "2026-06-28T07:01:00.000Z", []);
  const secondBounds = testBounds(approved, "2026-06-28T07:02:00.000Z", ["second write"]);
  writeVisualAssetBoundsResult(workspace, firstBounds, firstBounds.checkedAt);
  writeVisualAssetBoundsResult(workspace, secondBounds, secondBounds.checkedAt);
  const boundsRollback = readRollbackFiles(workspace).find((entry) => entry.name.includes("asset-bounds-results"));
  assert.ok(boundsRollback, "repeat bounds result writes should snapshot the previous metadata file");
  assert.ok(boundsRollback!.text.includes("2026-06-28T07:01:00.000Z"));

  const firstGuide = generateVisualAssetStyleGuide({
    workspaceRoot: workspace,
    slot,
    candidate: approved,
    validation,
    boundsAnalysis: firstBounds,
    normalization,
    now: date("2026-06-28T07:03:00.000Z")
  });
  const secondGuide = generateVisualAssetStyleGuide({
    workspaceRoot: workspace,
    slot,
    candidate: approved,
    validation,
    boundsAnalysis: secondBounds,
    normalization,
    now: date("2026-06-28T07:03:00.000Z")
  });
  assert.ok(secondGuide.rollbackSnapshotPaths.length >= 3);
  assert.ok(secondGuide.rollbackSnapshotPaths.every((rollbackPath) => rollbackPath.startsWith(".game-polish-lab/rollback/")));
  assert.ok(readWorkspaceFile(workspace, secondGuide.rollbackSnapshotPaths.find((entry) => entry.includes("markdown"))!).includes("Asset Style Guide"));
  assert.ok(!JSON.stringify(secondGuide).includes("generate better art"));

  const pendingAssignment = testAssignment(slot, pending, pending.copiedAssetPath, validation);
  const rowsWithPending = buildVisualAssetDashboardRows([slot], [pending], [pendingAssignment], "2026-06-28T07:04:00.000Z", [firstBounds], [normalization], [], [manifestContract], []);
  assert.strictEqual(rowsWithPending[0].actions.applyManifestAssignment, false);
  assert.strictEqual(rowsWithPending[0].runtimeApplied, false);
  const rowsWithApproved = buildVisualAssetDashboardRows([slot], [approved], [assignment], "2026-06-28T07:05:00.000Z", [firstBounds], [normalization], [], [manifestContract], []);
  assert.strictEqual(rowsWithApproved[0].actions.applyManifestAssignment, true);
  assert.strictEqual(rowsWithApproved[0].actions.assignReplacement, true);

  const contact = createAndWriteVisualAssetContactSheetComparison({
    workspaceRoot: workspace,
    row: rowsWithApproved[0],
    now: date("2026-06-28T07:06:00.000Z")
  });
  const repeatContact = createAndWriteVisualAssetContactSheetComparison({
    workspaceRoot: workspace,
    row: rowsWithApproved[0],
    now: date("2026-06-28T07:06:00.000Z")
  });
  assert.ok(repeatContact.result.rollbackSnapshotPaths.length >= 3);
  assert.ok(repeatContact.result.rollbackSnapshotPaths.every((rollbackPath) => rollbackPath.startsWith(".game-polish-lab/rollback/")));
  assert.strictEqual(contact.result.runtimeApplied, false);

  const missingValidation = validateImportedVisualAssetCandidate(workspace, slot, testCandidate("approved", ".game-polish-lab/assets/imported/missing.png"));
  assert.strictEqual(missingValidation.status, "missing");
  const unsupported = testCandidate("approved", ".game-polish-lab/assets/imported/bad.txt");
  writeWorkspaceFile(workspace, unsupported.copiedAssetPath, Buffer.from("not an image", "utf8"));
  const unsupportedValidation = validateImportedVisualAssetCandidate(workspace, slot, unsupported);
  assert.strictEqual(unsupportedValidation.status, "invalid");
  assert.ok(unsupportedValidation.errors.some((error) => error.includes("extension")));
  assert.ok(unsupportedValidation.errors.some((error) => error.includes("supported PNG/WebP")));

  const noAlpha = testCandidate("approved", ".game-polish-lab/assets/imported/no-alpha.webp");
  writeWorkspaceFile(workspace, noAlpha.copiedAssetPath, minimalWebP(false));
  const webpValidation = validateImportedVisualAssetCandidate(workspace, slot, noAlpha);
  assert.strictEqual(webpValidation.status, "warning");
  assert.ok(webpValidation.warnings.some((warning) => warning.includes("transparency/alpha")));
  const webpBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: noAlpha, now: date("2026-06-28T07:07:00.000Z") });
  assert.strictEqual(webpBounds.recommendedAction, "manual_review");
  assert.ok(webpBounds.warnings.some((warning) => warning.includes("WebP")));

  const invalidManifest = applyVisualAssetManifestAssignment({
    workspaceRoot: workspace,
    slot,
    candidate: approved,
    assignment,
    validation: { status: "invalid", warnings: [], errors: ["bad dimensions"], checkedAt: "2026-06-28T07:08:00.000Z" },
    contract: manifestContract,
    now: date("2026-06-28T07:08:00.000Z")
  });
  assert.strictEqual(invalidManifest.status, "skipped");
  assert.ok(invalidManifest.errors.some((error) => error.includes("validation")));
  assert.strictEqual(invalidManifest.runtimeApplied, false);

  const scope = checkVisualScopeGuard({
    operationType: "asset_pipeline_assignment",
    adapterId: slot.adapterId,
    surfaceType: "asset_replacement",
    candidatePaths: [
      ".game-polish-lab/assets/imported/enemy.png",
      ".game-polish-lab/assets/normalized/enemy.png",
      ".game-polish-lab/assets/contact-sheets/example.json",
      "src/assets/enemies/enemy.png",
      "src/scenes/PreloadScene.ts",
      "src/systems/saveSystem.ts",
      "src/data/economy.ts",
      "package.json"
    ]
  });
  assert.strictEqual(scope.recommendedAction, "block");
  assert.ok(scope.classifiedFiles.some((file) => file.path === ".game-polish-lab/assets/contact-sheets/example.json" && file.classification === "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/assets/enemies/enemy.png" && file.classification === "forbidden" && file.reasonCode === "original_game_asset_overwrite"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/scenes/PreloadScene.ts" && file.classification === "suspicious"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/systems/saveSystem.ts" && file.classification === "forbidden"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/data/economy.ts" && file.classification === "forbidden"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "package.json" && file.classification === "forbidden"));

  const assetFallback = buildVisualAssetFallbackTask({ slot, candidate: approved, normalization, validation, boundsAnalysis: firstBounds, now: date("2026-06-28T07:09:00.000Z") });
  assert.strictEqual(assetFallback.instruction, "wire this approved normalized asset into this selected visual asset slot only.");
  assertNoForbiddenFallbackWording(assetFallback);
  assert.ok(assetFallback.forbiddenAreas.some((area) => area.includes("visual redesign or asset generation")));

  const manifestFallback = buildManifestLoaderFallbackTask({
    slot,
    candidate: approved,
    assignment,
    normalization,
    validation,
    boundsAnalysis: firstBounds,
    contract: { ...manifestContract, manifestPath: "src/scenes/PreloadScene.ts", writablePathSafety: "suspicious", supportedOperation: "unsupported" },
    reason: "Source loader file is not a safe direct-apply target.",
    now: date("2026-06-28T07:10:00.000Z")
  });
  assert.strictEqual(manifestFallback.instruction, "wire this approved normalized asset assignment into this selected visual asset slot only.");
  assertNoForbiddenFallbackWording(manifestFallback);

  const contactFallback = buildContactSheetComparisonFallbackTask({
    row: rowsWithApproved[0],
    comparison: contact.comparison as VisualAssetComparisonSet,
    reason: "No safe manifest contract exists.",
    now: date("2026-06-28T07:11:00.000Z")
  });
  assert.strictEqual(contactFallback.instruction, "wire this approved contact-sheet asset choice into this selected visual asset slot only.");
  assert.ok(contactFallback.allowedFiles.some((file) => file.startsWith(visualAssetContactSheetComparisonRelativeDir)));
  assertNoForbiddenFallbackWording(contactFallback);
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
    expectedDimensions: { width: 2, height: 2 },
    transparencyRequired: true,
    currentAssetPath: "src/assets/enemies/enemy.png",
    targetConfigPath: `${visualAssetAssignmentsRelativeDir}/enemy.json`,
    knownManifestPath: "src/scenes/PreloadScene.ts",
    ownerSourceFileHints: ["src/scenes/PreloadScene.ts", "src/assets/enemies"],
    safetyStatus: "safe",
    validationStatus: "unvalidated",
    directApplyCapability: "config_only",
    notes: []
  };
}

function testCandidate(status: ImportedVisualAssetCandidate["approvalStatus"], copiedAssetPath: string): ImportedVisualAssetCandidate {
  return {
    candidateId: `enemy-${status}-${path.basename(copiedAssetPath).replace(/\W+/g, "-")}`,
    originalPath: "incoming/enemy.png",
    copiedAssetPath,
    targetSlotId: "cursor_arena.enemy_icon",
    fileType: copiedAssetPath.endsWith(".webp") ? "image/webp" : copiedAssetPath.endsWith(".png") ? "image/png" : "text/plain",
    dimensions: { width: 2, height: 2 },
    fileSizeBytes: 72,
    hasAlpha: copiedAssetPath.endsWith(".webp") ? false : true,
    validationWarnings: [],
    validationErrors: [],
    approvalStatus: status,
    importedAt: "2026-06-28T07:00:00.000Z"
  };
}

function testNormalization(candidate: ImportedVisualAssetCandidate): VisualAssetNormalizationResult {
  return {
    normalizedAssetId: "enemy-normalized",
    sourceCandidateId: candidate.candidateId,
    sourcePath: candidate.copiedAssetPath,
    outputPath: ".game-polish-lab/assets/normalized/enemy.png",
    targetWidth: 2,
    targetHeight: 2,
    paddingApplied: { left: 0, right: 0, top: 0, bottom: 0 },
    scaleApplied: 1,
    contentOffsetApplied: { x: 0, y: 0 },
    originalPreserved: true,
    validationResult: { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T07:00:00.000Z" },
    status: "created",
    warnings: [],
    errors: [],
    createdAt: "2026-06-28T07:00:00.000Z"
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
    fallbackRequired: false,
    validation,
    assignedAt: "2026-06-28T07:00:00.000Z",
    notes: []
  };
}

function testBounds(candidate: ImportedVisualAssetCandidate, checkedAt: string, warnings: string[]): VisualAssetBoundsAnalysisResult {
  return {
    candidateId: candidate.candidateId,
    sourceAssetPath: candidate.copiedAssetPath,
    imageWidth: 2,
    imageHeight: 2,
    visibleBounds: { x: 0, y: 0, width: 2, height: 2 },
    visibleAreaRatio: 1,
    emptyTransparentImage: false,
    touchesCanvasEdge: { left: true, right: true, top: true, bottom: true },
    centerOffset: { x: 0, y: 0, xPct: 0, yPct: 0 },
    recommendedAction: "none",
    warnings,
    errors: [],
    checkedAt
  };
}

function testManifestContract(slot: VisualAssetSlot): VisualAssetManifestContract {
  return {
    contractId: "cursor_arena.enemy_icon.game_polish_lab_assignment",
    adapterId: slot.adapterId,
    adapterLabel: slot.adapterLabel,
    surfaceId: slot.surfaceId,
    assetSlotId: slot.slotId,
    manifestPath: slot.targetConfigPath,
    manifestType: "adapter_asset_config",
    writablePathSafety: "safe",
    supportedOperation: "update_generated_config_reference",
    manifestKey: "copiedAssetPath",
    expectedRelativePathMode: "workspace_relative",
    validationRequirements: [],
    rollbackRequired: true,
    manualTestChecklist: [],
    warnings: [],
    errors: []
  };
}

function visiblePng(): Buffer {
  const rgba = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 255,
    0, 0, 255, 255, 255, 255, 255, 255
  ]);
  return Buffer.from(writeRgbaPngPixels(2, 2, rgba));
}

function minimalWebP(alpha: boolean): Buffer {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes[20] = alpha ? 0x10 : 0;
  bytes[24] = 1;
  bytes[27] = 1;
  return bytes;
}

function assertNoForbiddenFallbackWording(value: unknown): void {
  const text = JSON.stringify(value).toLowerCase();
  for (const forbidden of ["make the assets better", "improve the game visuals", "generate better art", "refactor the loader broadly", "change gameplay to fit the asset"]) {
    assert.ok(!text.includes(forbidden), `fallback text should not include ${forbidden}`);
  }
}

function writeJson(root: string, relativePath: string, value: unknown): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readRollbackFiles(root: string): Array<{ name: string; text: string }> {
  const rollbackDir = path.join(root, ".game-polish-lab", "rollback");
  if (!fs.existsSync(rollbackDir)) {
    return [];
  }
  return fs.readdirSync(rollbackDir).sort().map((name) => ({
    name,
    text: fs.readFileSync(path.join(rollbackDir, name), "utf8")
  }));
}

function writeWorkspaceFile(root: string, relativePath: string, data: Buffer): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, data);
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
