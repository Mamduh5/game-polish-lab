import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  buildContactSheetComparisonFallbackTask,
  createAndWriteVisualAssetContactSheetComparison,
  markVisualAssetContactSheetComparisonEntry,
  readLatestVisualAssetContactSheetComparisonSummaries,
  readVisualAssetContactSheetComparison,
  visualAssetContactSheetComparisonIndexRelativePath,
  visualAssetContactSheetComparisonRelativeDir
} from "../core/visualAssetContactSheetComparison";
import { buildVisualAssetDashboardRows, visualAssetAssignmentsRelativeDir, visualAssetDashboardRelativePath } from "../core/visualAssetPipeline";
import {
  AssignedVisualAsset,
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetDashboardRow,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";
import { VisualAssetManifestApplySummary, VisualAssetManifestContract } from "../types/visualAssetManifestDirectApply";

const workspace = makeTempWorkspace("v084-contact-sheet-comparison");

try {
  const slot = testSlot();
  const candidate = testCandidate("pending");
  const validation: VisualAssetValidationResult = { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T06:00:00.000Z" };
  const bounds = testBounds(candidate);
  const normalization = testNormalization(candidate);
  const assignment = testAssignment(slot, candidate, normalization.outputPath, validation);
  const manifestContract = testManifestContract(slot);
  const manifestApply = testManifestApply(slot, assignment, normalization);

  writeWorkspaceFile(workspace, slot.currentAssetPath!, tinyPng());
  writeWorkspaceFile(workspace, candidate.copiedAssetPath, tinyPng());
  writeWorkspaceFile(workspace, normalization.outputPath, tinyPng());
  writeJson(workspace, visualAssetDashboardRelativePath, {
    schemaVersion: "visual-asset-pipeline-dashboard/v1",
    candidates: [candidate],
    assignments: [assignment]
  });

  const rows = buildVisualAssetDashboardRows(
    [slot],
    [candidate],
    [assignment],
    "2026-06-28T06:00:00.000Z",
    [bounds],
    [normalization],
    [{ guideId: "guide", assetSlotId: slot.slotId, assetSlotLabel: slot.slotLabel, adapterId: slot.adapterId, surfaceId: slot.surfaceId, markdownPath: ".game-polish-lab/assets/style-guides/guide.md", jsonPath: ".game-polish-lab/assets/style-guides/guide.json", createdAt: "2026-06-28T06:00:00.000Z", warnings: [] }],
    [manifestContract],
    [manifestApply]
  );
  const row = rows[0];
  assert.strictEqual(row.actions.createContactSheet, true);

  const { comparison, result } = createAndWriteVisualAssetContactSheetComparison({
    workspaceRoot: workspace,
    row,
    now: date("2026-06-28T06:01:00.000Z")
  });
  assert.strictEqual(comparison.status, "ready");
  assert.strictEqual(result.runtimeApplied, false);
  assert.ok(result.filesWritten.includes(`${visualAssetContactSheetComparisonRelativeDir}/${comparison.comparisonId}.json`));
  assert.ok(result.filesWritten.includes(`${visualAssetContactSheetComparisonRelativeDir}/${comparison.comparisonId}.html`));
  assert.ok(result.filesWritten.includes(visualAssetContactSheetComparisonIndexRelativePath));
  assert.ok(fs.existsSync(path.join(workspace, ...`${visualAssetContactSheetComparisonRelativeDir}/${comparison.comparisonId}.html`.split("/"))));
  assert.ok(comparison.comparisonEntries.some((entry) => entry.role === "current"));
  assert.ok(comparison.comparisonEntries.some((entry) => entry.role === "imported_candidate"));
  assert.ok(comparison.comparisonEntries.some((entry) => entry.role === "normalized_candidate"));
  assert.ok(comparison.comparisonEntries.some((entry) => entry.role === "assigned"));
  assert.ok(comparison.comparisonEntries.some((entry) => entry.role === "manifest_applied"));
  assert.strictEqual(comparison.userDecisionSummary.status, "pending");
  assert.strictEqual(comparison.manifestAppliedAssetPath, normalization.outputPath);
  assert.ok(!JSON.stringify(comparison).toLowerCase().includes("score"));
  assert.ok(!JSON.stringify(comparison).toLowerCase().includes("ocr"));

  const normalizedEntry = comparison.comparisonEntries.find((entry) => entry.role === "normalized_candidate")!;
  const markedApproved = markVisualAssetContactSheetComparisonEntry({
    workspaceRoot: workspace,
    comparisonId: comparison.comparisonId,
    entryId: normalizedEntry.entryId,
    mark: "approved",
    note: "Use this normalized choice.",
    now: date("2026-06-28T06:02:00.000Z")
  });
  assert.strictEqual(markedApproved.result.nextRecommendedSafeAction, "use_normalized_asset");
  assert.strictEqual(markedApproved.result.runtimeApplied, false);
  const approvedComparison = readVisualAssetContactSheetComparison(workspace, comparison.comparisonId)!;
  assert.strictEqual(approvedComparison.userDecisionSummary.status, "approved");
  assert.strictEqual(approvedComparison.userDecisionSummary.chosenEntryId, normalizedEntry.entryId);
  assert.strictEqual(readLatestVisualAssetContactSheetComparisonSummaries(workspace)[0].chosenAssetPath, normalization.outputPath);
  const dashboardAfterApprove = readJson(workspace, visualAssetDashboardRelativePath) as { candidates: ImportedVisualAssetCandidate[] };
  assert.strictEqual(dashboardAfterApprove.candidates[0].approvalStatus, "approved");
  assert.ok(dashboardAfterApprove.candidates[0].notes?.some((note) => note.includes("Contact sheet")));

  const markedMixed = markVisualAssetContactSheetComparisonEntry({
    workspaceRoot: workspace,
    comparisonId: comparison.comparisonId,
    entryId: normalizedEntry.entryId,
    mark: "mixed",
    note: "Silhouette reads inconsistently.",
    now: date("2026-06-28T06:03:00.000Z")
  });
  assert.strictEqual(markedMixed.result.nextRecommendedSafeAction, "generate_revision_style_guide");
  const mixedComparison = readVisualAssetContactSheetComparison(workspace, comparison.comparisonId)!;
  assert.strictEqual(mixedComparison.userDecisionSummary.status, "mixed");

  const fallbackTask = buildContactSheetComparisonFallbackTask({
    row,
    comparison: approvedComparison,
    reason: "Loader path is not safe for direct manifest apply.",
    now: date("2026-06-28T06:04:00.000Z")
  });
  assert.strictEqual(fallbackTask.instruction, "wire this approved contact-sheet asset choice into this selected visual asset slot only.");
  assert.strictEqual(fallbackTask.approvedAssetPath, normalization.outputPath);
  assert.ok(fallbackTask.allowedFiles.includes(`${visualAssetContactSheetComparisonRelativeDir}/${comparison.comparisonId}.json`));
  assert.ok(fallbackTask.allowedFiles.includes(normalization.outputPath));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("save schema")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("asset generation")));

  const noCandidateRow: VisualAssetDashboardRow = {
    ...row,
    candidate: undefined,
    assignment: undefined,
    normalization: undefined,
    manifestApplyResult: undefined,
    assignmentAssetPath: undefined,
    validation: { status: "unvalidated", warnings: [], errors: [], checkedAt: "2026-06-28T06:05:00.000Z" }
  };
  const skipped = createAndWriteVisualAssetContactSheetComparison({
    workspaceRoot: workspace,
    row: noCandidateRow,
    now: date("2026-06-28T06:05:00.000Z")
  });
  assert.strictEqual(skipped.comparison.status, "skipped");
  assert.ok(skipped.result.errors.some((error) => error.includes("No imported")));
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
    expectedDimensions: { width: 1, height: 1 },
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

function testCandidate(status: ImportedVisualAssetCandidate["approvalStatus"]): ImportedVisualAssetCandidate {
  return {
    candidateId: `enemy-${status}`,
    originalPath: "incoming/enemy.png",
    copiedAssetPath: ".game-polish-lab/assets/imported/enemy.png",
    targetSlotId: "cursor_arena.enemy_icon",
    fileType: "image/png",
    dimensions: { width: 1, height: 1 },
    fileSizeBytes: 68,
    hasAlpha: true,
    validationWarnings: [],
    validationErrors: [],
    approvalStatus: status,
    importedAt: "2026-06-28T06:00:00.000Z"
  };
}

function testNormalization(candidate: ImportedVisualAssetCandidate): VisualAssetNormalizationResult {
  return {
    normalizedAssetId: "enemy-normalized",
    sourceCandidateId: candidate.candidateId,
    sourcePath: candidate.copiedAssetPath,
    outputPath: ".game-polish-lab/assets/normalized/enemy.png",
    targetWidth: 1,
    targetHeight: 1,
    paddingApplied: { left: 0, right: 0, top: 0, bottom: 0 },
    scaleApplied: 1,
    contentOffsetApplied: { x: 0, y: 0 },
    originalPreserved: true,
    validationResult: { status: "valid", warnings: [], errors: [], checkedAt: "2026-06-28T06:00:00.000Z" },
    status: "created",
    warnings: [],
    errors: [],
    createdAt: "2026-06-28T06:00:00.000Z"
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
    assignedAt: "2026-06-28T06:00:00.000Z",
    notes: []
  };
}

function testBounds(candidate: ImportedVisualAssetCandidate): VisualAssetBoundsAnalysisResult {
  return {
    candidateId: candidate.candidateId,
    sourceAssetPath: candidate.copiedAssetPath,
    imageWidth: 1,
    imageHeight: 1,
    visibleBounds: { x: 0, y: 0, width: 1, height: 1 },
    visibleAreaRatio: 1,
    emptyTransparentImage: false,
    touchesCanvasEdge: { left: true, right: true, top: true, bottom: true },
    centerOffset: { x: 0, y: 0, xPct: 0, yPct: 0 },
    recommendedAction: "none",
    warnings: [],
    errors: [],
    checkedAt: "2026-06-28T06:00:00.000Z"
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
    manifestType: "generated_style_config",
    writablePathSafety: "safe",
    supportedOperation: "update_generated_config_reference",
    expectedRelativePathMode: "workspace_relative",
    validationRequirements: [],
    rollbackRequired: true,
    manualTestChecklist: [],
    warnings: [],
    errors: []
  };
}

function testManifestApply(slot: VisualAssetSlot, assignment: AssignedVisualAsset, normalization: VisualAssetNormalizationResult): VisualAssetManifestApplySummary {
  return {
    operationId: "manifest-apply",
    slotId: slot.slotId,
    manifestContractId: "cursor_arena.enemy_icon.game_polish_lab_assignment",
    targetManifestPath: assignment.assignmentPath,
    status: "applied",
    runtimeApplied: false,
    filesWritten: [assignment.assignmentPath],
    rollbackSnapshotPaths: [],
    createdAt: "2026-06-28T06:00:00.000Z",
    warnings: [`Applied metadata for ${normalization.outputPath}.`],
    errors: []
  };
}

function tinyPng(): Buffer {
  return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lzR8GQAAAABJRU5ErkJggg==", "base64");
}

function writeJson(root: string, relativePath: string, value: unknown): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(root: string, relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8")) as unknown;
}

function writeWorkspaceFile(root: string, relativePath: string, data: Buffer): void {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, data);
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
