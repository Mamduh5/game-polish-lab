import * as fs from "fs";
import * as path from "path";

import { checkVisualScopeGuard, normalizeVisualScopePath } from "./visualScopeGuard";
import {
  VisualRollbackDiscoveryResult,
  VisualRollbackFallbackTask,
  VisualRollbackFileKind,
  VisualRollbackRestoredFile,
  VisualRollbackRestoreRequest,
  VisualRollbackRestoreResult,
  VisualRollbackSnapshot,
  VisualRollbackSnapshotFile
} from "../types/visualRollback";
import { VisualSurfaceType } from "../types/visualSurface";

export const visualRollbackRelativeDir = ".game-polish-lab/rollback";
export const visualRollbackFallbackTaskRelativeDir = ".game-polish-lab/fallback-tasks";

interface RollbackMetadataFile {
  id?: unknown;
  createdAt?: unknown;
  sourceOperation?: unknown;
  adapterId?: unknown;
  surfaceType?: unknown;
  targetId?: unknown;
  targetLabel?: unknown;
  files?: unknown;
}

interface RollbackMetadataFileEntry {
  originalPath?: unknown;
  snapshotPath?: unknown;
  fileKind?: unknown;
}

const knownRawSnapshotTargets: Record<string, { originalPath: string; fileKind: VisualRollbackFileKind; surfaceType?: VisualSurfaceType; targetId?: string }> = {
  "farm-slot-style.json": { originalPath: ".game-polish-lab/styles/farm-slot-style.json", fileKind: "style_config", surfaceType: "slot_card", targetId: "farm_slots" },
  "background-readability-style.json": { originalPath: ".game-polish-lab/styles/background-readability-style.json", fileKind: "style_config", surfaceType: "background_readability", targetId: "background" },
  "panel-style.json": { originalPath: ".game-polish-lab/styles/panel-style.json", fileKind: "style_config", surfaceType: "panel", targetId: "panels" },
  "reward-toast-style.json": { originalPath: ".game-polish-lab/styles/reward-toast-style.json", fileKind: "style_config", surfaceType: "reward_toast", targetId: "reward_toast" },
  "button-style.json": { originalPath: ".game-polish-lab/styles/button-style.json", fileKind: "style_config", surfaceType: "button", targetId: "buttons" },
  "asset-contracts.json": { originalPath: ".game-polish-lab/assets/asset-contracts.json", fileKind: "asset_contract", surfaceType: "asset_replacement", targetId: "asset_contracts" },
  "farmSlotStyle.ts": { originalPath: "src/config/farmSlotStyle.ts", fileKind: "generated_style_module", surfaceType: "slot_card", targetId: "farm_slots" },
  "backgroundReadabilityStyle.ts": { originalPath: "src/config/backgroundReadabilityStyle.ts", fileKind: "generated_style_module", surfaceType: "background_readability", targetId: "background" },
  "panelStyle.ts": { originalPath: "src/config/panelStyle.ts", fileKind: "generated_style_module", surfaceType: "panel", targetId: "panels" },
  "rewardToastStyle.ts": { originalPath: "src/config/rewardToastStyle.ts", fileKind: "generated_style_module", surfaceType: "reward_toast", targetId: "reward_toast" },
  "buttonStyle.ts": { originalPath: "src/config/buttonStyle.ts", fileKind: "generated_style_module", surfaceType: "button", targetId: "buttons" },
  "monsterFarmAssetManifest.ts": { originalPath: "src/config/monsterFarmAssetManifest.ts", fileKind: "generated_style_module", surfaceType: "asset_replacement", targetId: "asset_manifest" }
};

export function discoverVisualRollbackSnapshots(workspaceRoot: string): VisualRollbackDiscoveryResult {
  const rollbackDir = path.join(workspaceRoot, ...visualRollbackRelativeDir.split("/"));
  if (!fs.existsSync(rollbackDir)) {
    return { snapshots: [], warnings: [] };
  }
  const warnings: string[] = [];
  const entries = safeReadDir(rollbackDir, warnings);
  const snapshots: VisualRollbackSnapshot[] = [];
  const metadataSnapshotPaths = new Set<string>();

  for (const entry of entries.filter((value) => isRollbackMetadataFile(value)).sort()) {
    const metadataPath = path.join(rollbackDir, entry);
    const relativeMetadataPath = `${visualRollbackRelativeDir}/${entry}`;
    const text = safeReadText(metadataPath, warnings, relativeMetadataPath);
    if (text === undefined) {
      continue;
    }
    let parsed: RollbackMetadataFile;
    try {
      parsed = JSON.parse(text) as RollbackMetadataFile;
    } catch {
      warnings.push(`${relativeMetadataPath}: malformed rollback metadata ignored.`);
      continue;
    }
    const metadataSnapshot = snapshotFromMetadata(workspaceRoot, parsed, relativeMetadataPath, warnings);
    for (const file of metadataSnapshot.files) {
      metadataSnapshotPaths.add(file.snapshotPath);
    }
    snapshots.push(metadataSnapshot);
  }

  for (const entry of entries.filter((value) => !isRollbackMetadataFile(value)).sort()) {
    const relativeSnapshotPath = `${visualRollbackRelativeDir}/${entry}`;
    if (metadataSnapshotPaths.has(relativeSnapshotPath)) {
      continue;
    }
    const rawSnapshot = snapshotFromRawFile(workspaceRoot, entry, relativeSnapshotPath);
    snapshots.push(rawSnapshot);
  }

  snapshots.sort(compareSnapshotsNewestFirst);
  return { snapshots, warnings };
}

export function restoreVisualRollbackSnapshot(workspaceRoot: string, request: VisualRollbackRestoreRequest): VisualRollbackRestoreResult {
  const discovery = discoverVisualRollbackSnapshots(workspaceRoot);
  const snapshot = discovery.snapshots.find((candidate) => candidate.id === request.snapshotId);
  if (!snapshot) {
    return {
      snapshotId: request.snapshotId,
      status: "blocked",
      restoredFiles: [],
      skippedFiles: [],
      blockedFiles: [],
      warnings: discovery.warnings,
      errors: ["Rollback snapshot was not found."]
    };
  }

  const requestedFileIds = request.fileIds ? new Set(request.fileIds) : undefined;
  const restoredFiles: VisualRollbackRestoredFile[] = [];
  const skippedFiles: VisualRollbackRestoredFile[] = [];
  const blockedFiles: VisualRollbackRestoredFile[] = [];
  const fallbackFiles: VisualRollbackSnapshotFile[] = [];
  const warnings = [...discovery.warnings, ...snapshot.warnings];
  const errors = [...snapshot.errors];
  const now = request.now ?? new Date();

  for (const file of snapshot.files) {
    if (requestedFileIds && !requestedFileIds.has(file.fileId)) {
      continue;
    }
    const guard = checkVisualScopeGuard({
      operationType: "rollback_restore",
      adapterId: snapshot.adapterId,
      surfaceType: snapshot.surfaceType,
      targetId: snapshot.targetId,
      candidatePaths: [file.originalPath]
    });
    const guardedFile = guard.classifiedFiles[0] ?? file.scopeClassification;
    const baseResult = {
      fileId: file.fileId,
      originalPath: file.originalPath,
      snapshotPath: file.snapshotPath
    };
    if (guard.recommendedAction === "block" || guardedFile.classification === "forbidden") {
      blockedFiles.push({ ...baseResult, status: "blocked", message: `${guardedFile.message} (${guardedFile.reasonCode})` });
      continue;
    }
    if (!file.restoreEligible || guardedFile.classification !== "safe") {
      fallbackFiles.push({ ...file, scopeClassification: guardedFile });
      skippedFiles.push({ ...baseResult, status: "skipped", message: `${guardedFile.message} (${guardedFile.reasonCode})` });
      continue;
    }

    const targetPath = resolveWorkspacePath(workspaceRoot, file.originalPath);
    const snapshotPath = resolveWorkspacePath(workspaceRoot, file.snapshotPath);
    if (!targetPath || !snapshotPath) {
      blockedFiles.push({ ...baseResult, status: "blocked", message: "Snapshot or target path does not resolve inside the workspace." });
      continue;
    }
    if (!fs.existsSync(snapshotPath) || !fs.statSync(snapshotPath).isFile()) {
      blockedFiles.push({ ...baseResult, status: "blocked", message: "Snapshot file is missing." });
      continue;
    }
    const targetParent = path.dirname(targetPath);
    if (isLabOwnedPath(file.originalPath)) {
      fs.mkdirSync(targetParent, { recursive: true });
    } else if (!fs.existsSync(targetParent)) {
      skippedFiles.push({ ...baseResult, status: "skipped", message: "Target parent does not exist; only .game-polish-lab parents may be created automatically." });
      continue;
    }

    let preRestoreBackupPath: string | undefined;
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      preRestoreBackupPath = createPreRestoreBackup(workspaceRoot, targetPath, file.originalPath, now);
    }
    fs.copyFileSync(snapshotPath, targetPath);
    restoredFiles.push({ ...baseResult, status: "restored", message: "Restored from rollback snapshot.", preRestoreBackupPath });
  }

  let fallbackTask: VisualRollbackFallbackTask | undefined;
  let fallbackTaskPath: string | undefined;
  if (fallbackFiles.length > 0) {
    fallbackTask = buildVisualRollbackFallbackTask(snapshot, fallbackFiles, now);
    fallbackTaskPath = writeVisualRollbackFallbackTask(workspaceRoot, fallbackTask);
    skippedFiles.push({
      fileId: fallbackTask.taskId,
      originalPath: fallbackTaskPath,
      snapshotPath: "",
      status: "fallback_task",
      message: "Created guided fallback task for files that are not safe for automatic restore."
    });
  }

  return {
    snapshotId: snapshot.id,
    status: blockedFiles.length > 0 && restoredFiles.length === 0 ? "blocked" : restoredFiles.length > 0 ? "restored" : fallbackTask ? "fallback_task" : "skipped",
    restoredFiles,
    skippedFiles,
    blockedFiles,
    fallbackTask,
    fallbackTaskPath,
    warnings,
    errors
  };
}

export function buildVisualRollbackFallbackTask(snapshot: VisualRollbackSnapshot, files: VisualRollbackSnapshotFile[], now: Date = new Date()): VisualRollbackFallbackTask {
  const blockedReasons = Array.from(new Set(files.flatMap((file) => [
    ...file.warnings,
    ...file.errors,
    `${file.originalPath}: ${file.scopeClassification.message} (${file.scopeClassification.reasonCode})`
  ]))).filter(Boolean).sort();
  return {
    taskId: `${formatTimestampForFile(now)}-rollback-${safeId(snapshot.id)}`,
    snapshotId: snapshot.id,
    createdAt: now.toISOString(),
    scope: "visual_rollback",
    files: files.map((file) => ({
      originalPath: file.originalPath,
      snapshotPath: file.snapshotPath,
      classification: file.scopeClassification.classification,
      reasonCode: file.scopeClassification.reasonCode,
      message: file.scopeClassification.message
    })),
    blockedReasons,
    instructions: [
      "Use this task only as a guided manual revert for visual polish files that were not safe for automatic rollback.",
      "Do not edit save, economy, progression, merge, hatch, quest, ad, level, gameplay, package manager, or unrelated runtime files.",
      "Compare the snapshot file to the target file manually and copy only visual presentation changes that stay inside the stated scope.",
      "Run the visual scope guard again before applying any source or bridge file changes."
    ]
  };
}

export function createVisualTextRollbackSnapshot(workspaceRoot: string, relativePath: string, absolutePath: string, now: Date = new Date()): string {
  const rollbackDir = path.join(workspaceRoot, ...visualRollbackRelativeDir.split("/"));
  fs.mkdirSync(rollbackDir, { recursive: true });
  const fileName = `${formatTimestampForFile(now)}-${path.basename(relativePath).replace(/[^a-zA-Z0-9._-]/g, "-") || "snapshot.txt"}`;
  const rollbackPath = path.join(rollbackDir, fileName);
  fs.copyFileSync(absolutePath, rollbackPath);
  return `${visualRollbackRelativeDir}/${fileName}`;
}

function snapshotFromMetadata(workspaceRoot: string, metadata: RollbackMetadataFile, metadataPath: string, warnings: string[]): VisualRollbackSnapshot {
  const entries = Array.isArray(metadata.files) ? metadata.files as RollbackMetadataFileEntry[] : [];
  const createdAt = asString(metadata.createdAt);
  const id = asString(metadata.id) ?? safeId(`${createdAt ?? metadataPath}`);
  const adapterId = asString(metadata.adapterId);
  const surfaceType = asVisualSurfaceType(metadata.surfaceType);
  const targetId = asString(metadata.targetId);
  const files = entries.map((entry, index) => {
    const originalPath = normalizeCandidatePath(asString(entry.originalPath) ?? "");
    const snapshotPath = normalizeCandidatePath(asString(entry.snapshotPath) ?? "");
    if (!originalPath || !snapshotPath) {
      warnings.push(`${metadataPath}: skipped metadata file ${index + 1} because paths are missing.`);
    }
    return buildSnapshotFile(workspaceRoot, id, index, originalPath, snapshotPath, asFileKind(entry.fileKind), {
      adapterId,
      surfaceType,
      targetId
    });
  }).filter((file) => file.originalPath && file.snapshotPath);
  return {
    id,
    createdAt: isValidDateString(createdAt) ? createdAt : undefined,
    sourceOperation: asString(metadata.sourceOperation),
    adapterId,
    surfaceType,
    targetId,
    targetLabel: asString(metadata.targetLabel),
    files,
    warnings: files.flatMap((file) => file.warnings),
    errors: files.length === 0 ? ["Rollback metadata has no restorable files."] : files.flatMap((file) => file.errors)
  };
}

function snapshotFromRawFile(workspaceRoot: string, fileName: string, relativeSnapshotPath: string): VisualRollbackSnapshot {
  const parsed = parseRawSnapshotName(fileName);
  const known = parsed ? knownRawSnapshotTargets[parsed.originalBasename] : undefined;
  const originalPath = known?.originalPath ?? "";
  const fileKind = known?.fileKind ?? inferFileKind(originalPath, fileName);
  const id = safeId(fileName);
  const file = buildSnapshotFile(workspaceRoot, id, 0, originalPath, relativeSnapshotPath, fileKind, {
    surfaceType: known?.surfaceType,
    targetId: known?.targetId
  });
  const warnings = [...file.warnings];
  const errors = [...file.errors];
  if (!known) {
    warnings.push("Legacy raw snapshot target could not be inferred; automatic restore is disabled.");
  }
  return {
    id,
    createdAt: parsed?.createdAt,
    sourceOperation: "legacy_raw_snapshot",
    surfaceType: known?.surfaceType,
    targetId: known?.targetId,
    files: [file],
    warnings,
    errors
  };
}

function buildSnapshotFile(
  workspaceRoot: string,
  snapshotId: string,
  index: number,
  originalPath: string,
  snapshotPath: string,
  fileKind: VisualRollbackFileKind,
  policy: { adapterId?: string; surfaceType?: VisualSurfaceType; targetId?: string }
): VisualRollbackSnapshotFile {
  const warnings: string[] = [];
  const errors: string[] = [];
  const normalizedOriginal = normalizeCandidatePath(originalPath);
  const normalizedSnapshot = normalizeCandidatePath(snapshotPath);
  if (!normalizedOriginal) {
    errors.push("Original target path is unknown.");
  }
  if (!normalizedSnapshot) {
    errors.push("Snapshot path is unknown.");
  }
  if (!resolveWorkspacePath(workspaceRoot, normalizedSnapshot)) {
    errors.push("Snapshot path does not resolve inside the workspace.");
  }
  if (normalizedOriginal && !resolveWorkspacePath(workspaceRoot, normalizedOriginal)) {
    errors.push("Original target path does not resolve inside the workspace.");
  }

  const scope = checkVisualScopeGuard({
    operationType: "rollback_restore",
    adapterId: policy.adapterId,
    surfaceType: policy.surfaceType,
    targetId: policy.targetId,
    candidatePaths: normalizedOriginal ? [normalizedOriginal] : ["unknown"]
  });
  const classified = scope.classifiedFiles[0];
  if (classified.classification === "suspicious" || classified.classification === "unknown") {
    warnings.push("Automatic restore skipped; suspicious or unknown targets require a fallback task.");
  }
  if (classified.classification === "forbidden") {
    errors.push("Automatic restore blocked by visual scope guard.");
  }
  if (fileKind === "generated_style_module") {
    warnings.push("Generated source/bridge modules require a guided fallback task instead of automatic restore.");
  }
  const restoreEligible = errors.length === 0
    && warnings.length === 0
    && classified.classification === "safe"
    && isAutoRestorablePath(normalizedOriginal, fileKind);
  return {
    fileId: `${snapshotId}:${index + 1}`,
    originalPath: normalizedOriginal,
    snapshotPath: normalizedSnapshot,
    fileKind,
    scopeClassification: classified,
    restoreEligible,
    warnings,
    errors
  };
}

function createPreRestoreBackup(workspaceRoot: string, targetPath: string, originalPath: string, now: Date): string {
  const backupDir = path.join(workspaceRoot, ...visualRollbackRelativeDir.split("/"));
  fs.mkdirSync(backupDir, { recursive: true });
  const backupName = `${formatTimestampForFile(now)}-pre-restore-${path.basename(originalPath).replace(/[^a-zA-Z0-9._-]/g, "-") || "snapshot.txt"}`;
  const backupPath = path.join(backupDir, backupName);
  fs.copyFileSync(targetPath, backupPath);
  return `${visualRollbackRelativeDir}/${backupName}`;
}

function writeVisualRollbackFallbackTask(workspaceRoot: string, task: VisualRollbackFallbackTask): string {
  const fallbackDir = path.join(workspaceRoot, ...visualRollbackFallbackTaskRelativeDir.split("/"));
  fs.mkdirSync(fallbackDir, { recursive: true });
  const relativePath = `${visualRollbackFallbackTaskRelativeDir}/${task.taskId}.json`;
  fs.writeFileSync(path.join(workspaceRoot, ...relativePath.split("/")), `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return relativePath;
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string | undefined {
  const normalized = normalizeCandidatePath(relativePath);
  if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    return undefined;
  }
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, ...normalized.split("/"));
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : undefined;
}

function parseRawSnapshotName(fileName: string): { createdAt: string; originalBasename: string } | undefined {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-(.+)$/.exec(fileName);
  if (!match) {
    return undefined;
  }
  const createdAt = match[1].replace(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "$1T$2:$3:$4.$5Z");
  return { createdAt, originalBasename: match[2] };
}

function compareSnapshotsNewestFirst(a: VisualRollbackSnapshot, b: VisualRollbackSnapshot): number {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
  const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
  const aValid = Number.isFinite(aTime);
  const bValid = Number.isFinite(bTime);
  if (aValid && bValid && bTime !== aTime) {
    return bTime - aTime;
  }
  if (aValid !== bValid) {
    return aValid ? -1 : 1;
  }
  return a.id.localeCompare(b.id);
}

function inferFileKind(originalPath: string, fileName: string): VisualRollbackFileKind {
  const normalized = normalizeCandidatePath(originalPath || fileName);
  if (normalized.startsWith(".game-polish-lab/styles/")) {
    return "style_config";
  }
  if (normalized.startsWith(".game-polish-lab/visual-recipes/")) {
    return "visual_recipe";
  }
  if (normalized === ".game-polish-lab/assets/asset-contracts.json") {
    return "asset_contract";
  }
  if (/^(src\/assets|public\/assets|assets)\//.test(normalized)) {
    return "asset_backup";
  }
  if (normalized.startsWith("src/config/")) {
    return "generated_style_module";
  }
  return "unknown";
}

function isAutoRestorablePath(relativePath: string, fileKind: VisualRollbackFileKind): boolean {
  if (isLabOwnedPath(relativePath)) {
    return fileKind !== "generated_style_module" && fileKind !== "unknown";
  }
  return fileKind === "asset_backup" && /^(src\/assets|public\/assets|assets)\//.test(relativePath);
}

function isLabOwnedPath(relativePath: string): boolean {
  return relativePath.startsWith(".game-polish-lab/");
}

function safeReadDir(dir: string, warnings: string[]): string[] {
  try {
    return fs.readdirSync(dir).filter((entry) => {
      const fullPath = path.join(dir, entry);
      return fs.statSync(fullPath).isFile();
    });
  } catch {
    warnings.push(`${visualRollbackRelativeDir}: could not read rollback directory.`);
    return [];
  }
}

function safeReadText(filePath: string, warnings: string[], relativePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    warnings.push(`${relativePath}: could not read rollback metadata.`);
    return undefined;
  }
}

function isRollbackMetadataFile(fileName: string): boolean {
  return fileName.endsWith(".rollback.json") || fileName === "rollback-index.json";
}

function normalizeCandidatePath(value: string): string {
  return normalizeVisualScopePath(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asFileKind(value: unknown): VisualRollbackFileKind {
  const stringValue = asString(value);
  return stringValue === "style_config"
    || stringValue === "visual_recipe"
    || stringValue === "asset_contract"
    || stringValue === "asset_backup"
    || stringValue === "generated_style_module"
    || stringValue === "unknown"
    ? stringValue
    : "unknown";
}

function asVisualSurfaceType(value: unknown): VisualSurfaceType | undefined {
  const stringValue = asString(value);
  return stringValue === "slot_card"
    || stringValue === "background_readability"
    || stringValue === "panel"
    || stringValue === "reward_toast"
    || stringValue === "button"
    || stringValue === "asset_replacement"
    ? stringValue
    : undefined;
}

function isValidDateString(value: string | undefined): boolean {
  return Boolean(value && Number.isFinite(Date.parse(value)));
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "rollback";
}

function formatTimestampForFile(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}
