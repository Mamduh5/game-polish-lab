import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import { writeRgbaPngPixels } from "../core/assetReplacement";
import {
  analyzeVisualAssetBounds,
  normalizeVisualAssetBounds,
  readVisualAssetBoundsResults,
  readVisualAssetNormalizationResults,
  visualAssetBoundsResultsRelativePath,
  visualAssetNormalizationResultsRelativePath,
  visualAssetNormalizedRelativeDir,
  writeVisualAssetBoundsResult,
  writeVisualAssetNormalizationResult
} from "../core/visualAssetBoundsNormalization";
import {
  buildVisualAssetDashboardRows,
  buildVisualAssetFallbackTask,
  importVisualAssetCandidate,
  useNormalizedVisualAssetForAssignment,
  visualAssetAssignmentsRelativeDir,
  visualAssetImportedRelativeDir
} from "../core/visualAssetPipeline";
import { checkVisualScopeGuard } from "../core/visualScopeGuard";
import { validateVisualAssetSlotContractSync } from "../core/visualAssetContracts";
import { ImportedVisualAssetCandidate, VisualAssetSlot } from "../types/visualAssetPipeline";
import { VisualAssetSlotContract } from "../types/visualAssetContract";

const workspace = makeTempWorkspace("v081-asset-bounds");
let importCounter = 0;

try {
  const slot = testSlot({ width: 64, height: 64 });
  const centered = importCandidate(workspace, slot, "centered.png", makeRgbaPng(64, 64, (x, y) => alphaInRect(x, y, 24, 24, 16, 16)));
  const centeredBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: centered, now: date("2026-06-28T03:00:00.000Z"), writeResult: true });
  assert.deepStrictEqual(centeredBounds.visibleBounds, { x: 24, y: 24, width: 16, height: 16 });
  assert.strictEqual(centeredBounds.normalizedVisibleBounds?.xPct, 0.375);
  assert.strictEqual(centeredBounds.visibleAreaRatio, 0.0625);
  assert.strictEqual(centeredBounds.emptyTransparentImage, false);
  assert.strictEqual(centeredBounds.touchesCanvasEdge.left, false);
  assert.strictEqual(centeredBounds.centerOffset.x, 0);
  assert.strictEqual(centeredBounds.recommendedAction, "none");
  assert.strictEqual(readVisualAssetBoundsResults(workspace).some((entry) => entry.candidateId === centered.candidateId), true);

  const edge = importCandidate(workspace, slot, "edge.png", makeRgbaPng(64, 64, (x, y) => alphaInRect(x, y, 0, 0, 20, 20)));
  const edgeBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: edge, now: date("2026-06-28T03:01:00.000Z") });
  assert.strictEqual(edgeBounds.touchesCanvasEdge.left, true);
  assert.strictEqual(edgeBounds.touchesCanvasEdge.top, true);
  assert.ok(edgeBounds.warnings.some((warning) => warning.includes("touches canvas edge")));

  const tiny = importCandidate(workspace, slot, "tiny.png", makeRgbaPng(64, 64, (x, y) => alphaInRect(x, y, 31, 31, 1, 1)));
  const tinyBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: tiny, now: date("2026-06-28T03:02:00.000Z") });
  assert.ok(tinyBounds.warnings.some((warning) => warning.includes("very small")));

  const offCenter = importCandidate(workspace, slot, "off-center.png", makeRgbaPng(64, 64, (x, y) => alphaInRect(x, y, 48, 28, 8, 8)));
  const offCenterBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: offCenter, now: date("2026-06-28T03:03:00.000Z") });
  assert.ok(offCenterBounds.centerOffset.xPct > 0.1);
  assert.ok(offCenterBounds.warnings.some((warning) => warning.includes("off-center")));

  const transparent = importCandidate(workspace, slot, "transparent.png", makeRgbaPng(64, 64, () => 0));
  const transparentBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: transparent, now: date("2026-06-28T03:04:00.000Z") });
  assert.strictEqual(transparentBounds.emptyTransparentImage, true);
  assert.strictEqual(transparentBounds.recommendedAction, "reject");
  assert.ok(transparentBounds.errors.some((error) => error.includes("Fully transparent")));

  const webp = importCandidate(workspace, slot, "candidate.webp", makeTestWebP(64, 64, true));
  const webpBounds = analyzeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: webp, now: date("2026-06-28T03:05:00.000Z") });
  assert.strictEqual(webpBounds.recommendedAction, "manual_review");
  assert.ok(webpBounds.warnings.some((warning) => warning.includes("WebP")));

  const originalBytes = fs.readFileSync(path.join(workspace, ...offCenter.copiedAssetPath.split("/")));
  const normalized = normalizeVisualAssetBounds({
    workspaceRoot: workspace,
    slot,
    candidate: offCenter,
    boundsAnalysis: offCenterBounds,
    now: date("2026-06-28T03:06:00.000Z"),
    writeResult: true
  });
  assert.strictEqual(normalized.status, "created");
  assert.ok(normalized.outputPath.startsWith(`${visualAssetNormalizedRelativeDir}/`));
  assert.strictEqual(fs.existsSync(path.join(workspace, ...normalized.outputPath.split("/"))), true);
  assert.deepStrictEqual(fs.readFileSync(path.join(workspace, ...offCenter.copiedAssetPath.split("/"))), originalBytes);
  assert.strictEqual(normalized.targetWidth, 64);
  assert.strictEqual(normalized.targetHeight, 64);
  assert.strictEqual(normalized.scaleApplied, 1);
  const normalizedBounds = analyzeVisualAssetBounds({
    workspaceRoot: workspace,
    slot,
    candidate: { ...offCenter, copiedAssetPath: normalized.outputPath },
    now: date("2026-06-28T03:07:00.000Z")
  });
  assert.deepStrictEqual(normalizedBounds.visibleBounds, { x: 28, y: 28, width: 8, height: 8 });
  assert.strictEqual(readVisualAssetNormalizationResults(workspace).some((entry) => entry.normalizedAssetId === normalized.normalizedAssetId), true);

  const unknownTargetSlot = testSlot(undefined);
  const unknownTarget = normalizeVisualAssetBounds({
    workspaceRoot: workspace,
    slot: unknownTargetSlot,
    candidate: offCenter,
    boundsAnalysis: analyzeVisualAssetBounds({ workspaceRoot: workspace, slot: unknownTargetSlot, candidate: offCenter }),
    now: date("2026-06-28T03:08:00.000Z")
  });
  assert.strictEqual(unknownTarget.targetWidth, 64);
  assert.strictEqual(unknownTarget.targetHeight, 64);

  const oversizedSlot = testSlot({ width: 16, height: 16 });
  const oversized = importCandidate(workspace, oversizedSlot, "oversized.png", makeRgbaPng(64, 64, (x, y) => alphaInRect(x, y, 8, 8, 40, 40)));
  const oversizedResult = normalizeVisualAssetBounds({
    workspaceRoot: workspace,
    slot: oversizedSlot,
    candidate: oversized,
    boundsAnalysis: analyzeVisualAssetBounds({ workspaceRoot: workspace, slot: oversizedSlot, candidate: oversized }),
    now: date("2026-06-28T03:09:00.000Z")
  });
  assert.strictEqual(oversizedResult.status, "skipped");
  assert.ok(oversizedResult.errors.some((error) => error.includes("scale-down is not allowed")));

  const rollbackFirst = normalizeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: offCenter, boundsAnalysis: offCenterBounds, now: date("2026-06-28T03:10:00.000Z") });
  const rollbackSecond = normalizeVisualAssetBounds({ workspaceRoot: workspace, slot, candidate: offCenter, boundsAnalysis: offCenterBounds, now: date("2026-06-28T03:11:00.000Z") });
  assert.strictEqual(rollbackFirst.outputPath, rollbackSecond.outputPath);
  assert.ok(rollbackSecond.rollbackSnapshotPath?.startsWith(".game-polish-lab/rollback/"));

  const approved: ImportedVisualAssetCandidate = { ...offCenter, approvalStatus: "approved" };
  const assigned = useNormalizedVisualAssetForAssignment({
    workspaceRoot: workspace,
    slot,
    candidate: approved,
    normalization: normalized,
    now: date("2026-06-28T03:12:00.000Z")
  });
  assert.notStrictEqual(assigned.result.status, "blocked");
  assert.strictEqual(assigned.assignment.copiedAssetPath, normalized.outputPath);
  assert.strictEqual(assigned.assignment.normalizedAssetPath, normalized.outputPath);
  assert.strictEqual(assigned.assignment.usesNormalizedAsset, true);
  assert.strictEqual(assigned.assignment.runtimeApplied, false);
  assert.strictEqual(fs.existsSync(path.join(workspace, ...approved.copiedAssetPath.split("/"))), true);
  const reassigned = useNormalizedVisualAssetForAssignment({
    workspaceRoot: workspace,
    slot,
    candidate: approved,
    normalization: normalized,
    now: date("2026-06-28T03:13:00.000Z")
  });
  assert.ok(reassigned.result.rollbackPaths.some((rollbackPath) => rollbackPath.startsWith(".game-polish-lab/rollback/")));

  const rows = buildVisualAssetDashboardRows([slot], [approved], [assigned.assignment], "2026-06-28T03:14:00.000Z", [offCenterBounds], [normalized]);
  assert.strictEqual(rows[0].boundsAnalysis?.candidateId, approved.candidateId);
  assert.strictEqual(rows[0].normalization?.outputPath, normalized.outputPath);
  assert.strictEqual(rows[0].actions.analyzeBounds, true);
  assert.strictEqual(rows[0].actions.normalizeBounds, true);
  assert.strictEqual(rows[0].actions.useNormalizedAssetForAssignment, true);
  assert.strictEqual(rows[0].runtimeApplied, false);
  assert.strictEqual(rows[0].assignmentAssetPath, normalized.outputPath);

  const fallbackTask = buildVisualAssetFallbackTask({
    slot,
    candidate: approved,
    boundsAnalysis: offCenterBounds,
    normalization: normalized,
    now: date("2026-06-28T03:15:00.000Z")
  });
  assert.strictEqual(fallbackTask.normalizedAssetPath, normalized.outputPath);
  assert.strictEqual(fallbackTask.instruction, "wire this approved normalized asset into this selected visual asset slot only.");
  assert.ok(fallbackTask.allowedFiles.includes(normalized.outputPath));
  assert.ok(fallbackTask.allowedFiles.includes(visualAssetBoundsResultsRelativePath));
  assert.ok(fallbackTask.allowedFiles.includes(visualAssetNormalizationResultsRelativePath));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("save schema")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("economy")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("ad/monetization")));
  assert.ok(fallbackTask.forbiddenAreas.some((area) => area.includes("projectile/shooter/auto-shooter")));

  const contractSlot: VisualAssetSlotContract = {
    assetSlotId: "test-icon",
    expectedPath: normalized.outputPath,
    expectedWidth: 64,
    expectedHeight: 64,
    expectedFormats: ["PNG"],
    transparencyRequirement: "required",
    visibleBoundsRequired: true,
    expectedVisibleBoundsMinRatio: 0.5,
    centerTolerancePct: 0.01,
    edgeTouchAllowed: false,
    normalizationAllowed: true,
    scaleDownAllowed: false,
    upscaleAllowed: false,
    loaderHint: "manual_required",
    validation: { status: "unknown", warnings: [], errors: [] }
  };
  const contractValidation = validateVisualAssetSlotContractSync(workspace, contractSlot, "2026-06-28T03:16:00.000Z");
  assert.strictEqual(contractValidation.validation.status, "warning");
  assert.ok(contractValidation.validation.warnings.some((warning) => warning.includes("below expected minimum")));

  const scope = checkVisualScopeGuard({
    operationType: "asset_pipeline_assignment",
    adapterId: "generic_phaser",
    surfaceType: "asset_replacement",
    candidatePaths: [
      ".game-polish-lab/assets/normalized/test/icon.png",
      ".game-polish-lab/assets/bounds-results.json",
      ".game-polish-lab/assets/normalization-results.json",
      `${visualAssetAssignmentsRelativeDir}/test-icon.json`,
      `${visualAssetImportedRelativeDir}/test.png`,
      "src/assets/original.png",
      "src/loader/AssetLoader.ts",
      "src/systems/saveSystem.ts",
      "src/data/economy.ts"
    ]
  });
  assert.strictEqual(scope.recommendedAction, "block");
  assert.ok(scope.classifiedFiles.some((file) => file.path === ".game-polish-lab/assets/normalized/test/icon.png" && file.classification === "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/assets/original.png" && file.classification !== "safe"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/loader/AssetLoader.ts" && file.classification === "suspicious"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/systems/saveSystem.ts" && file.classification === "forbidden"));
  assert.ok(scope.classifiedFiles.some((file) => file.path === "src/data/economy.ts" && file.classification === "forbidden"));

  writeVisualAssetBoundsResult(workspace, centeredBounds);
  writeVisualAssetNormalizationResult(workspace, normalized);
} finally {
  cleanupTempWorkspace(workspace);
}

function testSlot(expectedDimensions: { width: number; height: number } | undefined): VisualAssetSlot {
  return {
    slotId: "generic_phaser.test_icon",
    adapterId: "generic_phaser",
    adapterLabel: "Generic Phaser",
    surfaceId: "asset_replacement",
    surfaceLabel: "Asset Replacement",
    slotLabel: "Test icon",
    expectedAssetType: "icon",
    expectedFileExtensions: [".png", ".webp"],
    expectedDimensions,
    transparencyRequired: true,
    expectedVisibleBoundsMinRatio: 0.02,
    expectedVisibleBoundsMaxRatio: 0.9,
    safePadding: 0,
    centerTolerancePct: 0.1,
    edgeTouchAllowed: false,
    normalizationAllowed: true,
    scaleDownAllowed: false,
    upscaleAllowed: false,
    targetConfigPath: `${visualAssetAssignmentsRelativeDir}/test-icon.json`,
    knownManifestPath: "src/assets/manifest.json",
    ownerSourceFileHints: ["src/ui/IconView.ts"],
    safetyStatus: "safe",
    validationStatus: "unvalidated",
    directApplyCapability: "config_only",
    notes: []
  };
}

function importCandidate(workspaceRoot: string, slot: VisualAssetSlot, fileName: string, bytes: Uint8Array): ImportedVisualAssetCandidate {
  const sourcePath = path.join(workspaceRoot, "incoming", fileName);
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, bytes);
  return importVisualAssetCandidate({
    workspaceRoot,
    sourcePath,
    slot,
    approvalStatus: "approved",
    now: date(`2026-06-28T02:${String(importCounter++).padStart(2, "0")}:00.000Z`)
  });
}

function makeRgbaPng(width: number, height: number, alphaForPixel: (x: number, y: number) => number): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      rgba[index] = 80;
      rgba[index + 1] = 160;
      rgba[index + 2] = 80;
      rgba[index + 3] = alphaForPixel(x, y);
    }
  }
  return writeRgbaPngPixels(width, height, rgba);
}

function alphaInRect(x: number, y: number, rectX: number, rectY: number, rectWidth: number, rectHeight: number): number {
  return x >= rectX && x < rectX + rectWidth && y >= rectY && y < rectY + rectHeight ? 255 : 0;
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
