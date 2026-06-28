import * as fs from "fs";
import * as path from "path";

import { checkVisualScopeGuard } from "./visualScopeGuard";
import { getVisualGameAdapter, getVisualGameAdapterSurfaceTargets } from "./visualGameAdapters";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import {
  ScreenshotAnnotation,
  ScreenshotAnnotationIndexEntry,
  ScreenshotAnnotationIndexFile,
  ScreenshotAnnotationRect,
  ScreenshotAnnotationSaveResult,
  ScreenshotAnnotationSeverity,
  ScreenshotAnnotationSurfaceType,
  ScreenshotAnnotationTargetMapping,
  ScreenshotImageMetadata
} from "../types/screenshotAnnotation";
import { VisualSurfaceType } from "../types/visualSurface";

export const screenshotAnnotationSchemaVersion = "screenshot-annotation/v1";
export const screenshotAnnotationIndexSchemaVersion = "screenshot-annotation-index/v1";
export const screenshotAnnotationsFolderRelativePath = ".game-polish-lab/annotations";
export const screenshotAnnotationIndexRelativePath = `${screenshotAnnotationsFolderRelativePath}/index.json`;
export const screenshotScreenshotsFolderRelativePath = ".game-polish-lab/screenshots";
export const screenshotAnnotationTasksFolderRelativePath = ".game-polish-lab/tasks";
export const screenshotAnnotationFallbackTasksFolderRelativePath = ".game-polish-lab/fallback-tasks";
export const screenshotNotesFolderRelativePath = screenshotAnnotationsFolderRelativePath;

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const annotationSurfaceTypes: ScreenshotAnnotationSurfaceType[] = ["slot_card", "panel", "button", "hud", "reward_toast", "background_readability", "impact_feedback", "asset_slot"];
const adapterLabels: Record<VisualDirectApplyAdapterId, string> = {
  idle_monster_farm: "Idle Monster Farm",
  generic_phaser: "Generic Phaser",
  sort_puzzle: "Sort Puzzle",
  cursor_arena: "Cursor Arena"
};

export function validateScreenshotAnnotationRect(rect: ScreenshotAnnotationRect, imageMetadata?: Pick<ScreenshotImageMetadata, "width" | "height">): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(rect.x) || rect.x < 0) {
    errors.push("Rectangle x must be a non-negative number.");
  }
  if (!Number.isFinite(rect.y) || rect.y < 0) {
    errors.push("Rectangle y must be a non-negative number.");
  }
  if (!Number.isFinite(rect.width) || rect.width <= 0) {
    errors.push("Rectangle width must be greater than zero.");
  }
  if (!Number.isFinite(rect.height) || rect.height <= 0) {
    errors.push("Rectangle height must be greater than zero.");
  }
  if (imageMetadata?.width && rect.x + rect.width > imageMetadata.width) {
    errors.push("Rectangle extends beyond screenshot width.");
  }
  if (imageMetadata?.height && rect.y + rect.height > imageMetadata.height) {
    errors.push("Rectangle extends beyond screenshot height.");
  }
  return errors;
}

export function validateScreenshotImagePath(workspaceRoot: string, screenshotPath: string): string[] {
  const errors: string[] = [];
  if (!screenshotPath.trim()) {
    return ["Screenshot path is required."];
  }
  const resolved = path.isAbsolute(screenshotPath) ? path.resolve(screenshotPath) : path.resolve(workspaceRoot, screenshotPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    errors.push("Screenshot file does not exist.");
  }
  if (!imageExtensions.has(path.extname(resolved).toLowerCase())) {
    errors.push("Screenshot file must be a PNG, JPG, JPEG, or WEBP image.");
  }
  return errors;
}

export function readScreenshotImageMetadata(workspaceRoot: string, screenshotPath: string): ScreenshotImageMetadata | undefined {
  const resolved = path.isAbsolute(screenshotPath) ? path.resolve(screenshotPath) : path.resolve(workspaceRoot, screenshotPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return undefined;
  }
  const ext = path.extname(resolved).toLowerCase().replace(".", "") as ScreenshotImageMetadata["fileType"];
  if (!imageExtensions.has(`.${ext}`)) {
    return undefined;
  }
  const buffer = fs.readFileSync(resolved);
  const dimensions = readImageDimensions(buffer, ext);
  return { fileType: ext, ...dimensions };
}

export function normalizeScreenshotAnnotationRect(rect: ScreenshotAnnotationRect, metadata?: Pick<ScreenshotImageMetadata, "width" | "height">): ScreenshotAnnotation["normalizedRect"] {
  if (!metadata?.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
    return undefined;
  }
  return {
    xPct: roundPct(rect.x / metadata.width),
    yPct: roundPct(rect.y / metadata.height),
    widthPct: roundPct(rect.width / metadata.width),
    heightPct: roundPct(rect.height / metadata.height)
  };
}

export function buildScreenshotAnnotationNote(input: {
  screenshotPath: string;
  markedRect: ScreenshotAnnotationRect;
  surfaceType: ScreenshotAnnotationSurfaceType;
  adapterId?: VisualDirectApplyAdapterId;
  targetSurfaceId?: string;
  note?: string;
  severity?: ScreenshotAnnotationSeverity;
  createdAt?: Date;
  workspaceLabel?: string;
  imageMetadata?: ScreenshotImageMetadata;
}): { ok: boolean; note?: ScreenshotAnnotation; errors: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const errors = validateScreenshotAnnotationRect(input.markedRect, input.imageMetadata);
  if (!annotationSurfaceTypes.includes(input.surfaceType)) {
    errors.push(`Unknown visual annotation surface type: ${input.surfaceType}.`);
  }
  if (!input.note?.trim()) {
    warnings.push("Annotation note is empty; task handoff should include a specific visual issue.");
  }
  const targetMapping = input.adapterId ? mapScreenshotAnnotationSurfaceToTarget({
    adapterId: input.adapterId,
    surfaceType: input.surfaceType,
    targetSurfaceId: input.targetSurfaceId
  }) : undefined;
  if (targetMapping?.warnings.length) {
    warnings.push(...targetMapping.warnings);
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }
  const createdAt = input.createdAt ?? new Date();
  const annotationId = safeAnnotationId(`${createdAt.toISOString()}-${input.surfaceType}-${input.adapterId ?? "generic"}`);
  const generatedConfigPath = targetMapping && !targetMapping.ambiguous ? targetMapping.styleConfigPath : undefined;
  return {
    ok: true,
    errors: [],
    warnings,
    note: {
      schemaVersion: screenshotAnnotationSchemaVersion,
      annotationId,
      createdAt: createdAt.toISOString(),
      workspaceLabel: input.workspaceLabel,
      adapterId: input.adapterId,
      adapterLabel: input.adapterId ? adapterLabels[input.adapterId] : undefined,
      screenshotPath: normalizeRelativeLikePath(input.screenshotPath),
      imageMetadata: input.imageMetadata,
      markedRect: input.markedRect,
      normalizedRect: normalizeScreenshotAnnotationRect(input.markedRect, input.imageMetadata),
      surfaceType: input.surfaceType,
      targetSurfaceId: input.targetSurfaceId ?? targetMapping?.targetId,
      targetMapping,
      note: input.note?.trim() ?? "",
      severity: input.severity ?? "medium",
      status: "draft",
      generatedConfigPath,
      warnings,
      suggestedNextAction: {
        type: generatedConfigPath ? "generate_config_stub" : "generate_fallback_task",
        label: generatedConfigPath ? "Create visual tuning task/config handoff" : "Create scoped visual fallback handoff",
        visualOnly: true
      }
    }
  };
}

export function mapScreenshotAnnotationSurfaceToTarget(input: { adapterId: VisualDirectApplyAdapterId; surfaceType: ScreenshotAnnotationSurfaceType; targetSurfaceId?: string }): ScreenshotAnnotationTargetMapping {
  const adapter = getVisualGameAdapter(input.adapterId);
  const adapterLabel = adapter?.displayName ?? adapterLabels[input.adapterId];
  const targetSurfaceType = annotationSurfaceToVisualSurface(input.surfaceType);
  const warnings: string[] = [];
  const candidates = getVisualGameAdapterSurfaceTargets(input.adapterId, targetSurfaceType)
    .filter((target) => target.styleConfigPath)
    .filter((target) => targetMatchesAnnotationSurface(input.surfaceType, target.targetId, target.displayName))
    .filter((target) => !input.targetSurfaceId || target.targetId === input.targetSurfaceId);
  if (!adapter) {
    warnings.push(`Adapter is not registered: ${input.adapterId}.`);
  }
  if (candidates.length === 0) {
    warnings.push(`No compatible ${adapterLabel} target is registered for annotation surface ${input.surfaceType}.`);
    return {
      adapterId: input.adapterId,
      adapterLabel,
      surfaceType: targetSurfaceType,
      ambiguous: true,
      warnings
    };
  }
  if (candidates.length > 1 && !input.targetSurfaceId) {
    warnings.push(`Annotation surface ${input.surfaceType} maps to multiple ${adapterLabel} targets: ${candidates.map((target) => target.targetId).join(", ")}. Save as generic annotation or choose a target.`);
    return {
      adapterId: input.adapterId,
      adapterLabel,
      surfaceType: targetSurfaceType,
      ambiguous: true,
      warnings
    };
  }
  const target = candidates[0];
  return {
    adapterId: input.adapterId,
    adapterLabel,
    surfaceType: target.surfaceType,
    targetId: target.targetId,
    targetLabel: target.displayName,
    styleConfigPath: target.styleConfigPath,
    ambiguous: false,
    warnings
  };
}

export function screenshotAnnotationRelativePath(note: ScreenshotAnnotation): string {
  return `${screenshotAnnotationsFolderRelativePath}/${safeAnnotationId(note.annotationId)}.json`;
}

export function writeScreenshotAnnotationNote(workspaceRoot: string, note: ScreenshotAnnotation): string {
  const relativePath = screenshotAnnotationRelativePath(note);
  writeWorkspaceText(workspaceRoot, relativePath, `${JSON.stringify(note, null, 2)}\n`);
  writeScreenshotAnnotationIndex(workspaceRoot, note, relativePath, new Date(note.createdAt));
  return relativePath;
}

export function saveScreenshotAnnotationBundle(workspaceRoot: string, input: {
  annotation: ScreenshotAnnotation;
  createConfigStub?: boolean;
  createFallbackTask?: boolean;
  now?: Date;
}): ScreenshotAnnotationSaveResult {
  const now = input.now ?? new Date(input.annotation.createdAt);
  const changedFiles: string[] = [];
  const warnings = [...input.annotation.warnings];
  const errors: string[] = [];
  const scope = checkVisualScopeGuard({
    operationType: "visual_config_write",
    adapterId: input.annotation.adapterId,
    surfaceType: annotationSurfaceToVisualSurface(input.annotation.surfaceType),
    targetId: input.annotation.targetSurfaceId,
    candidatePaths: [screenshotAnnotationRelativePath(input.annotation), screenshotAnnotationIndexRelativePath, screenshotAnnotationTasksFolderRelativePath]
  });
  if (scope.recommendedAction === "block") {
    return { ok: false, changedFiles, warnings, errors: ["Scope guard blocked annotation write."] };
  }
  const annotationForWrite: ScreenshotAnnotation = { ...input.annotation };
  let configPath: string | undefined;
  if (input.createConfigStub !== false && annotationForWrite.generatedConfigPath) {
    const configResult = writeAnnotationConfigStub(workspaceRoot, annotationForWrite, now);
    configPath = configResult.path;
    changedFiles.push(...configResult.changedFiles);
    warnings.push(...configResult.warnings);
    annotationForWrite.generatedConfigPath = configPath;
  }
  const taskPath = writeScreenshotAnnotationTask(workspaceRoot, annotationForWrite, now);
  annotationForWrite.generatedTaskPath = taskPath;
  annotationForWrite.status = "converted_to_tuning_task";
  changedFiles.push(taskPath);
  let fallbackTaskPath: string | undefined;
  if (input.createFallbackTask) {
    fallbackTaskPath = writeScreenshotAnnotationFallbackTask(workspaceRoot, annotationForWrite, now);
    annotationForWrite.generatedFallbackTaskPath = fallbackTaskPath;
    changedFiles.push(fallbackTaskPath);
  }
  const annotationPath = writeScreenshotAnnotationNote(workspaceRoot, annotationForWrite);
  changedFiles.unshift(annotationPath, screenshotAnnotationIndexRelativePath);
  return {
    ok: errors.length === 0,
    annotationPath,
    indexPath: screenshotAnnotationIndexRelativePath,
    taskPath,
    configPath,
    fallbackTaskPath,
    changedFiles: Array.from(new Set(changedFiles)),
    warnings: Array.from(new Set(warnings)),
    errors
  };
}

export function buildScreenshotAnnotationTaskMarkdown(annotation: ScreenshotAnnotation): string {
  const rect = annotation.markedRect;
  const normalized = annotation.normalizedRect
    ? ` (${annotation.normalizedRect.xPct}, ${annotation.normalizedRect.yPct}, ${annotation.normalizedRect.widthPct}, ${annotation.normalizedRect.heightPct})`
    : "";
  return [
    `# Screenshot Annotation Tuning Task: ${annotation.surfaceType}`,
    "",
    `Annotation: ${annotation.annotationId}`,
    `Screenshot: ${annotation.screenshotPath}`,
    `Marked rectangle: x ${rect.x}, y ${rect.y}, width ${rect.width}, height ${rect.height}${normalized}`,
    `Surface: ${annotation.surfaceType}`,
    annotation.adapterId ? `Adapter: ${annotation.adapterLabel ?? annotation.adapterId}` : "Adapter: generic/unknown",
    annotation.targetMapping?.targetLabel ? `Target: ${annotation.targetMapping.targetLabel} (${annotation.targetMapping.targetId})` : "Target: generic surface, choose exact row before source integration",
    annotation.generatedConfigPath ? `Generated config path: ${annotation.generatedConfigPath}` : "Generated config path: none",
    `Severity: ${annotation.severity}`,
    "",
    "## User Note",
    annotation.note || "No note provided. Add a specific visual issue before implementation.",
    "",
    "## Specific Visual Task",
    `Tune the marked ${annotation.surfaceType} area described by the user note. Use the rectangle as visual context only; do not infer gameplay behavior from the image.`,
    "",
    "## Boundaries",
    "- This is a visual tuning/config handoff, not runtime application.",
    "- Do not change save schema, economy, balance, progression, level/rule/solver data, upgrade costs/effects, ads, monetization, enemy/player/projectile systems, or gameplay behavior.",
    "- If source integration is needed, create or use a scoped visual-only fallback task with exact owner files.",
    "",
    "## Manual Checks",
    "- Reopen the screenshot or game scene and confirm the marked surface is more readable.",
    "- Confirm controls, saves, economy, progression, rules, ads, and gameplay behavior are unchanged."
  ].join("\n");
}

export function buildScreenshotAnnotationFallbackTask(annotation: ScreenshotAnnotation): Record<string, unknown> {
  return {
    taskId: `${annotation.annotationId}-fallback`,
    type: "screenshot_annotation_visual_fallback",
    visualOnly: true,
    screenshotPath: annotation.screenshotPath,
    markedRect: annotation.markedRect,
    normalizedRect: annotation.normalizedRect,
    surfaceType: annotation.surfaceType,
    adapterId: annotation.adapterId,
    targetId: annotation.targetSurfaceId,
    generatedConfigPath: annotation.generatedConfigPath,
    userNote: annotation.note,
    allowedFiles: [annotation.generatedConfigPath, "selected visual owner file only"].filter(Boolean),
    forbiddenAreas: [
      "save schema/state persistence changes",
      "economy/balance/progression changes",
      "level/rule/solver changes",
      "enemy/player gameplay changes",
      "projectile/shooter/auto-shooter systems",
      "upgrade costs/effects",
      "ad/monetization changes",
      "package/dependency churn",
      "unrelated adapter changes",
      "broad rewrites outside chosen visual file scope"
    ],
    instructions: [
      "Use the screenshot annotation as visual context only.",
      "Wire generated style config into selected visual rendering only.",
      "Preserve gameplay behavior.",
      "Keep exact selected owner file scope; do not patch arbitrary source files."
    ],
    manualTestChecklist: [
      "Marked screenshot area or equivalent game state is visually improved.",
      "Generated style config is read only by visual rendering code.",
      "Gameplay, saves, economy, progression, ads, and rules are unchanged."
    ]
  };
}

function writeScreenshotAnnotationIndex(workspaceRoot: string, annotation: ScreenshotAnnotation, annotationPath: string, now: Date): void {
  const existing = readScreenshotAnnotationIndex(workspaceRoot);
  const entry: ScreenshotAnnotationIndexEntry = {
    annotationId: annotation.annotationId,
    path: annotationPath,
    screenshotPath: annotation.screenshotPath,
    surfaceType: annotation.surfaceType,
    adapterId: annotation.adapterId,
    targetSurfaceId: annotation.targetSurfaceId,
    note: annotation.note,
    severity: annotation.severity,
    status: annotation.status,
    createdAt: annotation.createdAt,
    generatedConfigPath: annotation.generatedConfigPath,
    generatedTaskPath: annotation.generatedTaskPath,
    generatedFallbackTaskPath: annotation.generatedFallbackTaskPath
  };
  const next: ScreenshotAnnotationIndexFile = {
    schemaVersion: screenshotAnnotationIndexSchemaVersion,
    updatedAt: now.toISOString(),
    annotations: [...existing.annotations.filter((candidate) => candidate.annotationId !== annotation.annotationId), entry]
      .sort((a, b) => a.annotationId.localeCompare(b.annotationId))
  };
  writeWorkspaceText(workspaceRoot, screenshotAnnotationIndexRelativePath, `${JSON.stringify(next, null, 2)}\n`);
}

function readScreenshotAnnotationIndex(workspaceRoot: string): ScreenshotAnnotationIndexFile {
  const absolutePath = resolveWorkspacePath(workspaceRoot, screenshotAnnotationIndexRelativePath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return { schemaVersion: screenshotAnnotationIndexSchemaVersion, updatedAt: new Date(0).toISOString(), annotations: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Partial<ScreenshotAnnotationIndexFile>;
    return parsed.schemaVersion === screenshotAnnotationIndexSchemaVersion && Array.isArray(parsed.annotations)
      ? parsed as ScreenshotAnnotationIndexFile
      : { schemaVersion: screenshotAnnotationIndexSchemaVersion, updatedAt: new Date(0).toISOString(), annotations: [] };
  } catch {
    return { schemaVersion: screenshotAnnotationIndexSchemaVersion, updatedAt: new Date(0).toISOString(), annotations: [] };
  }
}

function writeAnnotationConfigStub(workspaceRoot: string, annotation: ScreenshotAnnotation, now: Date): { path?: string; changedFiles: string[]; warnings: string[] } {
  const configPath = annotation.generatedConfigPath;
  if (!configPath) {
    return { changedFiles: [], warnings: ["No unambiguous generated style config path exists for this annotation."] };
  }
  const absolutePath = resolveWorkspacePath(workspaceRoot, configPath);
  if (!absolutePath || !configPath.startsWith(".game-polish-lab/styles/")) {
    return { changedFiles: [], warnings: [`Config stub path is not safe: ${configPath}.`] };
  }
  if (fs.existsSync(absolutePath)) {
    return { path: configPath, changedFiles: [], warnings: [`Existing style config was referenced but not overwritten: ${configPath}.`] };
  }
  const stub = {
    schemaVersion: 1,
    surfaceType: annotationSurfaceToVisualSurface(annotation.surfaceType),
    adapterTarget: annotation.adapterId ? `${annotation.adapterId}.${annotation.targetSurfaceId ?? annotation.surfaceType}` : `generic.${annotation.surfaceType}`,
    presetName: "Screenshot Annotation Stub",
    updatedAt: now.toISOString(),
    values: {},
    configOnly: true,
    runtimeApplied: false,
    annotationSource: {
      annotationId: annotation.annotationId,
      screenshotPath: annotation.screenshotPath,
      markedRect: annotation.markedRect,
      normalizedRect: annotation.normalizedRect,
      note: annotation.note
    }
  };
  writeWorkspaceText(workspaceRoot, configPath, `${JSON.stringify(stub, null, 2)}\n`);
  return { path: configPath, changedFiles: [configPath], warnings: [] };
}

function writeScreenshotAnnotationTask(workspaceRoot: string, annotation: ScreenshotAnnotation, now: Date): string {
  const relativePath = `${screenshotAnnotationTasksFolderRelativePath}/${safeAnnotationId(`${now.toISOString()}-${annotation.annotationId}`)}.md`;
  writeWorkspaceText(workspaceRoot, relativePath, `${buildScreenshotAnnotationTaskMarkdown(annotation)}\n`);
  return relativePath;
}

function writeScreenshotAnnotationFallbackTask(workspaceRoot: string, annotation: ScreenshotAnnotation, now: Date): string {
  const relativePath = `${screenshotAnnotationFallbackTasksFolderRelativePath}/${safeAnnotationId(`${now.toISOString()}-${annotation.annotationId}-fallback`)}.json`;
  writeWorkspaceText(workspaceRoot, relativePath, `${JSON.stringify(buildScreenshotAnnotationFallbackTask(annotation), null, 2)}\n`);
  return relativePath;
}

function annotationSurfaceToVisualSurface(surfaceType: ScreenshotAnnotationSurfaceType): VisualSurfaceType {
  if (surfaceType === "hud") {
    return "panel";
  }
  if (surfaceType === "impact_feedback") {
    return "reward_toast";
  }
  if (surfaceType === "asset_slot") {
    return "asset_replacement";
  }
  return surfaceType;
}

function targetMatchesAnnotationSurface(surfaceType: ScreenshotAnnotationSurfaceType, targetId: string, label: string): boolean {
  const value = `${targetId} ${label}`.toLowerCase();
  if (surfaceType === "hud") {
    return value.includes("hud");
  }
  if (surfaceType === "impact_feedback") {
    return /impact|feedback|hit|miss|kill|combo/.test(value);
  }
  if (surfaceType === "asset_slot") {
    return true;
  }
  if (surfaceType === "panel") {
    return !value.includes("hud");
  }
  return true;
}

function readImageDimensions(buffer: Buffer, fileType: ScreenshotImageMetadata["fileType"]): { width?: number; height?: number } {
  if (fileType === "png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if ((fileType === "jpg" || fileType === "jpeg") && buffer.length > 4) {
    return readJpegDimensions(buffer);
  }
  if (fileType === "webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return readWebpDimensions(buffer);
  }
  return {};
}

function readJpegDimensions(buffer: Buffer): { width?: number; height?: number } {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      break;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < buffer.length) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return {};
}

function readWebpDimensions(buffer: Buffer): { width?: number; height?: number } {
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  return {};
}

function roundPct(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function writeWorkspaceText(workspaceRoot: string, relativePath: string, text: string): void {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!absolutePath) {
    throw new Error(`Path is not inside workspace: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, text, "utf8");
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string | undefined {
  const normalized = normalizeRelativeLikePath(relativePath);
  if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    return undefined;
  }
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, ...normalized.split("/"));
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : undefined;
}

function normalizeRelativeLikePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

function safeAnnotationId(value: string): string {
  return value.toLowerCase().replace(/[:.]/g, "-").replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "screenshot-annotation";
}
