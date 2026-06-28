import * as fs from "fs";
import * as path from "path";

import { inspectAssetImage, readRgbaPngPixels, writeRgbaPngPixels } from "./assetReplacement";
import { writeGamePolishLabOwnedFileWithRollback } from "./visualAssetPipelineRollback";
import { normalizeVisualScopePath } from "./visualScopeGuard";
import {
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetBoundsRecommendedAction,
  VisualAssetDimensions,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";

export const visualAssetNormalizedRelativeDir = ".game-polish-lab/assets/normalized";
export const visualAssetBoundsResultsRelativePath = ".game-polish-lab/assets/bounds-results.json";
export const visualAssetNormalizationResultsRelativePath = ".game-polish-lab/assets/normalization-results.json";

const defaultVisibleMinRatio = 0.03;
const defaultVisibleMaxRatio = 0.92;
const defaultCenterTolerancePct = 0.1;

interface BoundsResultsFile {
  schemaVersion: "visual-asset-bounds-results/v1";
  updatedAt?: string;
  results: VisualAssetBoundsAnalysisResult[];
}

interface NormalizationResultsFile {
  schemaVersion: "visual-asset-normalization-results/v1";
  updatedAt?: string;
  results: VisualAssetNormalizationResult[];
}

export function analyzeVisualAssetBounds(input: {
  workspaceRoot: string;
  slot?: VisualAssetSlot;
  candidate: ImportedVisualAssetCandidate;
  now?: Date;
  writeResult?: boolean;
}): VisualAssetBoundsAnalysisResult {
  const checkedAt = (input.now ?? new Date()).toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const sourceCheck = resolveWorkspaceRelativePath(input.workspaceRoot, input.candidate.copiedAssetPath);
  if (!sourceCheck.ok) {
    const result = emptyBoundsResult(input.candidate, checkedAt, "reject", warnings, [sourceCheck.error]);
    writeBoundsResultIfRequested(input.workspaceRoot, result, input.writeResult, checkedAt);
    return result;
  }
  if (!fs.existsSync(sourceCheck.absolutePath)) {
    const result = emptyBoundsResult(input.candidate, checkedAt, "reject", warnings, [`Missing imported asset: ${input.candidate.copiedAssetPath}`]);
    writeBoundsResultIfRequested(input.workspaceRoot, result, input.writeResult, checkedAt);
    return result;
  }

  const bytes = fs.readFileSync(sourceCheck.absolutePath);
  const imageInfo = inspectAssetImage(bytes);
  const expectedDimensions = input.slot?.expectedDimensions;
  if (imageInfo.fileType === "unsupported") {
    errors.push("Unsupported file type for bounds analysis.");
  }
  if (imageInfo.fileType === "image/webp") {
    warnings.push("WebP dimensions can be read, but visible alpha bounds inspection is unvalidated by current lightweight tooling; manual review required.");
  }
  if (input.slot?.transparencyRequired === true && !imageInfo.hasAlpha) {
    warnings.push("Slot expects transparency/alpha, but this asset has no detected alpha channel.");
  }
  if (expectedDimensions && imageInfo.width !== expectedDimensions.width) {
    warnings.push(`Dimensions do not match expected slot width: ${imageInfo.width ?? "unknown"}px vs ${expectedDimensions.width}px.`);
  }
  if (expectedDimensions && imageInfo.height !== expectedDimensions.height) {
    warnings.push(`Dimensions do not match expected slot height: ${imageInfo.height ?? "unknown"}px vs ${expectedDimensions.height}px.`);
  }
  if (imageInfo.fileType === "image/png" && imageInfo.hasAlpha && imageInfo.visiblePixelCount === undefined) {
    warnings.push("PNG alpha bounds could not be decoded by the current lightweight RGBA reader; manual review required.");
  }
  if (imageInfo.visiblePixelCount === 0) {
    errors.push("Fully transparent image; visible bounds are empty.");
  }

  const width = imageInfo.width;
  const height = imageInfo.height;
  const visibleBounds = imageInfo.visibleBounds;
  const visibleAreaRatio = width && height && visibleBounds ? roundRatio((visibleBounds.width * visibleBounds.height) / (width * height)) : undefined;
  const touchesCanvasEdge = {
    left: Boolean(visibleBounds && visibleBounds.x <= 0),
    right: Boolean(width && visibleBounds && visibleBounds.x + visibleBounds.width >= width),
    top: Boolean(visibleBounds && visibleBounds.y <= 0),
    bottom: Boolean(height && visibleBounds && visibleBounds.y + visibleBounds.height >= height)
  };
  const centerOffset = centerOffsetFor(width, height, visibleBounds);
  const normalizedVisibleBounds = width && height && visibleBounds
    ? {
      xPct: roundRatio(visibleBounds.x / width),
      yPct: roundRatio(visibleBounds.y / height),
      widthPct: roundRatio(visibleBounds.width / width),
      heightPct: roundRatio(visibleBounds.height / height)
    }
    : undefined;

  if (visibleBounds && Object.values(touchesCanvasEdge).some(Boolean) && input.slot?.edgeTouchAllowed !== true) {
    warnings.push(`Visible content touches canvas edge: ${edgeTouchLabels(touchesCanvasEdge).join(", ")}.`);
  }
  const minRatio = input.slot?.expectedVisibleBoundsMinRatio ?? defaultVisibleMinRatio;
  if (visibleAreaRatio !== undefined && visibleAreaRatio > 0 && visibleAreaRatio < minRatio) {
    warnings.push(`Visible content is very small relative to canvas (${formatPct(visibleAreaRatio)}).`);
  }
  const maxRatio = input.slot?.expectedVisibleBoundsMaxRatio ?? defaultVisibleMaxRatio;
  if (visibleAreaRatio !== undefined && visibleAreaRatio > maxRatio) {
    warnings.push(`Visible content is very large relative to canvas (${formatPct(visibleAreaRatio)}); cropping risk should be reviewed.`);
  }
  const tolerance = input.slot?.centerTolerancePct ?? defaultCenterTolerancePct;
  if (Math.abs(centerOffset.xPct) > tolerance || Math.abs(centerOffset.yPct) > tolerance) {
    warnings.push(`Visible content is significantly off-center (${centerOffset.x}px, ${centerOffset.y}px).`);
  }

  const recommendedAction = recommendedBoundsAction({
    errors,
    warnings,
    fileType: imageInfo.fileType,
    visibleBoundsKnown: Boolean(visibleBounds),
    touchesEdge: Object.values(touchesCanvasEdge).some(Boolean),
    normalizationAllowed: input.slot?.normalizationAllowed !== false
  });
  const result: VisualAssetBoundsAnalysisResult = {
    candidateId: input.candidate.candidateId,
    sourceAssetPath: input.candidate.copiedAssetPath,
    imageWidth: width,
    imageHeight: height,
    visibleBounds,
    normalizedVisibleBounds,
    visibleAreaRatio,
    emptyTransparentImage: imageInfo.visiblePixelCount === 0,
    touchesCanvasEdge,
    centerOffset,
    expectedTargetCanvasWidth: expectedDimensions?.width,
    expectedTargetCanvasHeight: expectedDimensions?.height,
    recommendedAction,
    warnings,
    errors,
    checkedAt
  };
  writeBoundsResultIfRequested(input.workspaceRoot, result, input.writeResult, checkedAt);
  return result;
}

export function normalizeVisualAssetBounds(input: {
  workspaceRoot: string;
  slot: VisualAssetSlot;
  candidate: ImportedVisualAssetCandidate;
  boundsAnalysis?: VisualAssetBoundsAnalysisResult;
  targetDimensions?: VisualAssetDimensions;
  allowScaleDown?: boolean;
  allowUpscale?: boolean;
  now?: Date;
  writeResult?: boolean;
}): VisualAssetNormalizationResult {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const bounds = input.boundsAnalysis ?? analyzeVisualAssetBounds({ workspaceRoot: input.workspaceRoot, slot: input.slot, candidate: input.candidate, now });
  const targetDimensions = input.targetDimensions ?? input.slot.expectedDimensions ?? dimensionsFromBounds(bounds);
  const normalizedAssetId = `${input.candidate.candidateId}-bounds-${targetDimensions.width}x${targetDimensions.height}`;
  const outputPath = `${visualAssetNormalizedRelativeDir}/${safeId(input.slot.slotId)}/${safeId(normalizedAssetId)}.png`;
  const warnings = [...bounds.warnings];
  const errors = [...bounds.errors];
  const sourceCheck = resolveWorkspaceRelativePath(input.workspaceRoot, input.candidate.copiedAssetPath);
  const initialResult = (status: VisualAssetNormalizationResult["status"], rollbackSnapshotPath?: string): VisualAssetNormalizationResult => ({
    normalizedAssetId,
    sourceCandidateId: input.candidate.candidateId,
    sourcePath: input.candidate.copiedAssetPath,
    outputPath,
    targetWidth: targetDimensions.width,
    targetHeight: targetDimensions.height,
    paddingApplied: { left: 0, right: 0, top: 0, bottom: 0 },
    scaleApplied: 1,
    contentOffsetApplied: { x: 0, y: 0 },
    originalPreserved: true,
    validationResult: validationFromMessages(warnings, errors, createdAt),
    rollbackSnapshotPath,
    status,
    warnings,
    errors,
    createdAt
  });

  if (input.slot.normalizationAllowed === false) {
    errors.push("Normalization is disabled by the asset contract for this slot.");
    const result = initialResult("skipped");
    writeNormalizationResultIfRequested(input.workspaceRoot, result, input.writeResult, createdAt);
    return result;
  }
  if (!sourceCheck.ok) {
    errors.push(sourceCheck.error);
    const result = initialResult("failed");
    writeNormalizationResultIfRequested(input.workspaceRoot, result, input.writeResult, createdAt);
    return result;
  }
  if (!bounds.visibleBounds) {
    errors.push("Normalization requires decoded visible PNG bounds; no visible bounds were available.");
    const result = initialResult("failed");
    writeNormalizationResultIfRequested(input.workspaceRoot, result, input.writeResult, createdAt);
    return result;
  }
  const sourceBytes = fs.readFileSync(sourceCheck.absolutePath);
  const decoded = readRgbaPngPixels(sourceBytes);
  if (!decoded) {
    errors.push("Normalization currently supports decoded RGBA PNG assets only; WebP remains manual-review.");
    const result = initialResult("failed");
    writeNormalizationResultIfRequested(input.workspaceRoot, result, input.writeResult, createdAt);
    return result;
  }

  const visible = bounds.visibleBounds;
  const allowScaleDown = input.allowScaleDown === true || input.slot.scaleDownAllowed === true;
  const allowUpscale = input.allowUpscale === true || input.slot.upscaleAllowed === true;
  let scale = 1;
  if (visible.width > targetDimensions.width || visible.height > targetDimensions.height) {
    if (!allowScaleDown) {
      errors.push("Visible content exceeds target canvas and scale-down is not allowed; normalization skipped to avoid cropping.");
      const result = initialResult("skipped");
      writeNormalizationResultIfRequested(input.workspaceRoot, result, input.writeResult, createdAt);
      return result;
    }
    scale = Math.min(targetDimensions.width / visible.width, targetDimensions.height / visible.height, 1);
  } else if (allowUpscale) {
    scale = Math.min(targetDimensions.width / visible.width, targetDimensions.height / visible.height);
  }

  const scaledWidth = Math.max(1, Math.round(visible.width * scale));
  const scaledHeight = Math.max(1, Math.round(visible.height * scale));
  const offsetX = Math.floor((targetDimensions.width - scaledWidth) / 2);
  const offsetY = Math.floor((targetDimensions.height - scaledHeight) / 2);
  const normalizedRgba = new Uint8Array(targetDimensions.width * targetDimensions.height * 4);
  pasteScaledVisibleBounds(decoded.rgba, decoded.width, bounds.visibleBounds, normalizedRgba, targetDimensions.width, targetDimensions.height, offsetX, offsetY, scaledWidth, scaledHeight);

  let rollbackSnapshotPath: string | undefined;
  const absoluteOutputPath = path.join(input.workspaceRoot, ...outputPath.split("/"));
  if (fs.existsSync(absoluteOutputPath)) {
    rollbackSnapshotPath = createAssetNormalizationRollback(input.workspaceRoot, outputPath, now);
  }
  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, writeRgbaPngPixels(targetDimensions.width, targetDimensions.height, normalizedRgba));

  const normalizedCandidate: ImportedVisualAssetCandidate = {
    ...input.candidate,
    copiedAssetPath: outputPath,
    dimensions: targetDimensions,
    validationWarnings: [],
    validationErrors: []
  };
  const validationAnalysis = analyzeVisualAssetBounds({ workspaceRoot: input.workspaceRoot, slot: input.slot, candidate: normalizedCandidate, now });
  const validationResult = validationFromMessages(validationAnalysis.warnings, validationAnalysis.errors, createdAt);
  const paddingApplied = {
    left: offsetX,
    right: targetDimensions.width - offsetX - scaledWidth,
    top: offsetY,
    bottom: targetDimensions.height - offsetY - scaledHeight
  };
  const result: VisualAssetNormalizationResult = {
    normalizedAssetId,
    sourceCandidateId: input.candidate.candidateId,
    sourcePath: input.candidate.copiedAssetPath,
    outputPath,
    targetWidth: targetDimensions.width,
    targetHeight: targetDimensions.height,
    paddingApplied,
    scaleApplied: roundRatio(scale),
    contentOffsetApplied: { x: offsetX - visible.x, y: offsetY - visible.y },
    originalPreserved: true,
    validationResult,
    rollbackSnapshotPath,
    status: "created",
    warnings,
    errors,
    createdAt
  };
  writeNormalizationResultIfRequested(input.workspaceRoot, result, input.writeResult, createdAt);
  return result;
}

export function readVisualAssetBoundsResults(workspaceRoot: string): VisualAssetBoundsAnalysisResult[] {
  const filePath = path.join(workspaceRoot, ...visualAssetBoundsResultsRelativePath.split("/"));
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<BoundsResultsFile> | VisualAssetBoundsAnalysisResult[];
    return Array.isArray(parsed) ? parsed : parsed.results ?? [];
  } catch {
    return [];
  }
}

export function writeVisualAssetBoundsResult(workspaceRoot: string, result: VisualAssetBoundsAnalysisResult, updatedAt = result.checkedAt): string {
  const results = mergeById(readVisualAssetBoundsResults(workspaceRoot), [result], (entry) => entry.candidateId);
  writeGamePolishLabOwnedFileWithRollback({
    workspaceRoot,
    relativePath: visualAssetBoundsResultsRelativePath,
    data: `${JSON.stringify({ schemaVersion: "visual-asset-bounds-results/v1", updatedAt, results } satisfies BoundsResultsFile, null, 2)}\n`,
    now: dateFromIso(updatedAt),
    label: "asset-bounds-results"
  });
  return visualAssetBoundsResultsRelativePath;
}

export function readVisualAssetNormalizationResults(workspaceRoot: string): VisualAssetNormalizationResult[] {
  const filePath = path.join(workspaceRoot, ...visualAssetNormalizationResultsRelativePath.split("/"));
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<NormalizationResultsFile> | VisualAssetNormalizationResult[];
    return Array.isArray(parsed) ? parsed : parsed.results ?? [];
  } catch {
    return [];
  }
}

export function writeVisualAssetNormalizationResult(workspaceRoot: string, result: VisualAssetNormalizationResult, updatedAt = result.createdAt): string {
  const results = mergeById(readVisualAssetNormalizationResults(workspaceRoot), [result], (entry) => entry.normalizedAssetId);
  writeGamePolishLabOwnedFileWithRollback({
    workspaceRoot,
    relativePath: visualAssetNormalizationResultsRelativePath,
    data: `${JSON.stringify({ schemaVersion: "visual-asset-normalization-results/v1", updatedAt, results } satisfies NormalizationResultsFile, null, 2)}\n`,
    now: dateFromIso(updatedAt),
    label: "asset-normalization-results"
  });
  return visualAssetNormalizationResultsRelativePath;
}

function writeBoundsResultIfRequested(workspaceRoot: string, result: VisualAssetBoundsAnalysisResult, writeResult: boolean | undefined, updatedAt: string): void {
  if (writeResult) {
    writeVisualAssetBoundsResult(workspaceRoot, result, updatedAt);
  }
}

function writeNormalizationResultIfRequested(workspaceRoot: string, result: VisualAssetNormalizationResult, writeResult: boolean | undefined, updatedAt: string): void {
  if (writeResult) {
    writeVisualAssetNormalizationResult(workspaceRoot, result, updatedAt);
  }
}

function emptyBoundsResult(candidate: ImportedVisualAssetCandidate, checkedAt: string, recommendedAction: VisualAssetBoundsRecommendedAction, warnings: string[], errors: string[]): VisualAssetBoundsAnalysisResult {
  return {
    candidateId: candidate.candidateId,
    sourceAssetPath: candidate.copiedAssetPath,
    emptyTransparentImage: false,
    touchesCanvasEdge: { left: false, right: false, top: false, bottom: false },
    centerOffset: { x: 0, y: 0, xPct: 0, yPct: 0 },
    recommendedAction,
    warnings,
    errors,
    checkedAt
  };
}

function recommendedBoundsAction(input: {
  errors: string[];
  warnings: string[];
  fileType: string;
  visibleBoundsKnown: boolean;
  touchesEdge: boolean;
  normalizationAllowed: boolean;
}): VisualAssetBoundsRecommendedAction {
  if (input.errors.length > 0) {
    return "reject";
  }
  if (input.fileType !== "image/png" || !input.visibleBoundsKnown) {
    return "manual_review";
  }
  if (input.warnings.length === 0) {
    return "none";
  }
  if (input.touchesEdge) {
    return "warn";
  }
  return input.normalizationAllowed ? "normalize" : "warn";
}

function centerOffsetFor(width: number | undefined, height: number | undefined, visibleBounds: VisualAssetBoundsAnalysisResult["visibleBounds"]): VisualAssetBoundsAnalysisResult["centerOffset"] {
  if (!width || !height || !visibleBounds) {
    return { x: 0, y: 0, xPct: 0, yPct: 0 };
  }
  const x = (visibleBounds.x + visibleBounds.width / 2) - width / 2;
  const y = (visibleBounds.y + visibleBounds.height / 2) - height / 2;
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    xPct: roundRatio(x / width),
    yPct: roundRatio(y / height)
  };
}

function pasteScaledVisibleBounds(sourceRgba: Uint8Array, sourceWidth: number, visible: NonNullable<VisualAssetBoundsAnalysisResult["visibleBounds"]>, targetRgba: Uint8Array, targetWidth: number, targetHeight: number, offsetX: number, offsetY: number, scaledWidth: number, scaledHeight: number): void {
  for (let y = 0; y < scaledHeight; y += 1) {
    const targetY = offsetY + y;
    if (targetY < 0 || targetY >= targetHeight) {
      continue;
    }
    const sourceY = visible.y + Math.min(visible.height - 1, Math.floor((y / scaledHeight) * visible.height));
    for (let x = 0; x < scaledWidth; x += 1) {
      const targetX = offsetX + x;
      if (targetX < 0 || targetX >= targetWidth) {
        continue;
      }
      const sourceX = visible.x + Math.min(visible.width - 1, Math.floor((x / scaledWidth) * visible.width));
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const targetIndex = (targetY * targetWidth + targetX) * 4;
      targetRgba[targetIndex] = sourceRgba[sourceIndex];
      targetRgba[targetIndex + 1] = sourceRgba[sourceIndex + 1];
      targetRgba[targetIndex + 2] = sourceRgba[sourceIndex + 2];
      targetRgba[targetIndex + 3] = sourceRgba[sourceIndex + 3];
    }
  }
}

function validationFromMessages(warnings: string[], errors: string[], checkedAt: string): VisualAssetValidationResult {
  return {
    status: errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid",
    warnings,
    errors,
    checkedAt
  };
}

function dimensionsFromBounds(bounds: VisualAssetBoundsAnalysisResult): VisualAssetDimensions {
  return {
    width: bounds.expectedTargetCanvasWidth ?? bounds.imageWidth ?? bounds.visibleBounds?.width ?? 1,
    height: bounds.expectedTargetCanvasHeight ?? bounds.imageHeight ?? bounds.visibleBounds?.height ?? 1
  };
}

function resolveWorkspaceRelativePath(workspaceRoot: string, relativePath: string): { ok: true; absolutePath: string } | { ok: false; error: string } {
  const normalized = normalizeVisualScopePath(relativePath);
  if (!normalized || path.isAbsolute(relativePath) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    return { ok: false, error: `Unsafe workspace path: ${relativePath}` };
  }
  const absolutePath = path.resolve(workspaceRoot, ...normalized.split("/"));
  const root = path.resolve(workspaceRoot);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    return { ok: false, error: `Workspace path escapes root: ${relativePath}` };
  }
  return { ok: true, absolutePath };
}

function createAssetNormalizationRollback(workspaceRoot: string, relativePath: string, now: Date): string | undefined {
  const sourcePath = path.join(workspaceRoot, ...relativePath.split("/"));
  if (!fs.existsSync(sourcePath)) {
    return undefined;
  }
  const rollbackRelativePath = `.game-polish-lab/rollback/${timestampForPath(now)}-asset-normalization-${path.basename(relativePath)}`;
  const rollbackPath = path.join(workspaceRoot, ...rollbackRelativePath.split("/"));
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.copyFileSync(sourcePath, rollbackPath);
  return rollbackRelativePath;
}

function edgeTouchLabels(edges: VisualAssetBoundsAnalysisResult["touchesCanvasEdge"]): string[] {
  return (Object.keys(edges) as Array<keyof typeof edges>).filter((key) => edges[key]);
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function formatPct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function dateFromIso(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function mergeById<T>(existing: T[], patch: T[], id: (value: T) => string): T[] {
  const values = new Map(existing.map((entry) => [id(entry), entry]));
  for (const entry of patch) {
    values.set(id(entry), entry);
  }
  return Array.from(values.values()).sort((a, b) => id(a).localeCompare(id(b)));
}
