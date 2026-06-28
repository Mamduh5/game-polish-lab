import * as fs from "fs";
import * as path from "path";

import { inspectAssetImage, normalizeAssetFileName } from "./assetReplacement";
import { detectGenericPhaserProject } from "./genericPhaserAdapterModel";
import { monsterFarmAssetTargets } from "./monsterFarmAssetTargets";
import { detectCursorArenaProject, detectSortPuzzleProject } from "./visualGameAdapters";
import { checkVisualScopeGuard, normalizeVisualScopePath } from "./visualScopeGuard";
import {
  AssignedVisualAsset,
  ImportedVisualAssetCandidate,
  VisualAssetDashboardModel,
  VisualAssetDashboardRow,
  VisualAssetDimensions,
  VisualAssetDirectApplyCapability,
  VisualAssetExpectedType,
  VisualAssetFallbackTask,
  VisualAssetOperationResult,
  VisualAssetPipelineValidationStatus,
  VisualAssetSafetyStatus,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";

export interface VisualAssetInspectedFile {
  relativePath: string;
  text: string;
}

export const visualAssetDashboardRelativePath = ".game-polish-lab/assets/asset-dashboard.json";
export const visualAssetImportedRelativeDir = ".game-polish-lab/assets/imported";
export const visualAssetAssignmentsRelativeDir = ".game-polish-lab/assets/assignments";
export const visualAssetValidationRelativePath = ".game-polish-lab/assets/validation-results.json";
export const visualAssetContractRelativePath = ".game-polish-lab/assets/asset-contracts.json";

const supportedExtensions = [".png", ".webp"];
const reasonableAssetBytes = 5 * 1024 * 1024;
const maxAssetBytes = 20 * 1024 * 1024;

export function discoverVisualAssetSlots(files: VisualAssetInspectedFile[], adapterId = chooseAssetPipelineAdapter(files)): VisualAssetSlot[] {
  if (adapterId === "idle_monster_farm") {
    return buildIdleMonsterFarmSlots();
  }
  if (adapterId === "sort_puzzle") {
    return buildSortPuzzleSlots();
  }
  if (adapterId === "cursor_arena") {
    return buildCursorArenaSlots();
  }
  if (adapterId === "generic_phaser") {
    return buildGenericPhaserSlots(files);
  }
  return [];
}

export function buildVisualAssetDashboardModel(input: {
  workspaceRoot: string;
  files: VisualAssetInspectedFile[];
  candidates?: ImportedVisualAssetCandidate[];
  assignments?: AssignedVisualAsset[];
  adapterId?: string;
  updatedAt?: string;
}): VisualAssetDashboardModel {
  const activeAdapter = input.adapterId ?? chooseAssetPipelineAdapter(input.files);
  const slots = discoverVisualAssetSlots(input.files, activeAdapter);
  const candidates = input.candidates ?? readVisualAssetCandidates(input.workspaceRoot);
  const assignments = input.assignments ?? readVisualAssetAssignments(input.workspaceRoot);
  const rows = buildVisualAssetDashboardRows(slots, candidates, assignments, input.updatedAt);
  return {
    schemaVersion: "visual-asset-pipeline-dashboard/v1",
    activeAdapter,
    activeAdapterLabel: adapterLabel(activeAdapter),
    slots,
    candidates,
    assignments,
    rows,
    groupedSurfaceIds: Array.from(new Set(slots.map((slot) => slot.surfaceId))).sort(),
    statusCounts: countValidationStatuses(rows),
    warnings: dashboardWarnings(slots, candidates, assignments),
    updatedAt: input.updatedAt ?? new Date().toISOString()
  };
}

export function buildVisualAssetDashboardRows(slots: VisualAssetSlot[], candidates: ImportedVisualAssetCandidate[], assignments: AssignedVisualAsset[], checkedAt?: string): VisualAssetDashboardRow[] {
  return slots.map((slot) => {
    const assignment = assignments.find((candidate) => candidate.slotId === slot.slotId);
    const candidate = assignment
      ? candidates.find((entry) => entry.candidateId === assignment.candidateId)
      : candidates.find((entry) => entry.targetSlotId === slot.slotId && entry.approvalStatus !== "rejected");
    const validation = validationFromSlotCandidate(slot, candidate, assignment, checkedAt);
    return {
      rowId: slot.slotId,
      slot: {
        ...slot,
        generatedAssetPath: assignment?.copiedAssetPath ?? candidate?.copiedAssetPath ?? slot.generatedAssetPath,
        validationStatus: validation.status
      },
      candidate,
      assignment,
      validation,
      previewMode: slot.directApplyCapability === "config_only" || slot.directApplyCapability === "asset_copy_only" ? "context" : "asset_card",
      runtimeApplied: Boolean(assignment?.runtimeApplied),
      actions: {
        importAsset: slot.safetyStatus !== "unsupported",
        validateAsset: Boolean(candidate),
        previewInContext: Boolean(candidate),
        assignReplacement: Boolean(candidate && candidate.approvalStatus === "approved" && slot.directApplyCapability !== "unsupported"),
        openAssetContract: true,
        generateFallbackTask: slot.directApplyCapability === "fallback_required" || slot.safetyStatus !== "safe",
        runScopeCheck: true
      }
    };
  });
}

export function validateImportedVisualAssetCandidate(workspaceRoot: string, slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate, checkedAt = new Date().toISOString()): VisualAssetValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const pathCheck = resolveWorkspaceRelativePath(workspaceRoot, candidate.copiedAssetPath);
  if (!pathCheck.ok) {
    return { status: "invalid", warnings, errors: [pathCheck.error], checkedAt };
  }
  if (!isSafeFileName(path.basename(candidate.copiedAssetPath))) {
    errors.push("Candidate filename is unsafe.");
  }
  const extension = path.extname(candidate.copiedAssetPath).toLowerCase();
  if (!slot.expectedFileExtensions.map((value) => value.toLowerCase()).includes(extension)) {
    errors.push(`Candidate extension ${extension || "none"} is not supported for this slot.`);
  }
  if (!fs.existsSync(pathCheck.absolutePath)) {
    return { status: "missing", warnings, errors: [`Missing imported asset: ${candidate.copiedAssetPath}`], checkedAt };
  }
  const stat = fs.statSync(pathCheck.absolutePath);
  if (!stat.isFile()) {
    errors.push("Candidate path is not a file.");
  }
  if (stat.size > maxAssetBytes) {
    errors.push(`Candidate file is too large for v0.80 basic validation: ${stat.size} bytes.`);
  } else if (stat.size > reasonableAssetBytes) {
    warnings.push(`Candidate file is large: ${stat.size} bytes.`);
  }

  const bytes = fs.readFileSync(pathCheck.absolutePath);
  const imageInfo = inspectAssetImage(bytes);
  if (imageInfo.fileType === "unsupported") {
    errors.push("Candidate is not a supported PNG/WebP image.");
  }
  if (slot.expectedDimensions && imageInfo.width && imageInfo.width !== slot.expectedDimensions.width) {
    warnings.push(`Candidate width ${imageInfo.width}px differs from expected ${slot.expectedDimensions.width}px.`);
  }
  if (slot.expectedDimensions && imageInfo.height && imageInfo.height !== slot.expectedDimensions.height) {
    warnings.push(`Candidate height ${imageInfo.height}px differs from expected ${slot.expectedDimensions.height}px.`);
  }
  if (slot.transparencyRequired === true && !imageInfo.hasAlpha) {
    warnings.push("Slot expects transparency/alpha, but the candidate does not advertise alpha.");
  }
  if (imageInfo.visiblePixelCount === 0) {
    warnings.push("Candidate appears fully transparent.");
  }

  return { status: statusFromMessages(warnings, errors), warnings, errors, checkedAt };
}

export function importVisualAssetCandidate(input: {
  workspaceRoot: string;
  sourcePath: string;
  slot?: VisualAssetSlot;
  approvalStatus?: "pending" | "approved" | "rejected";
  now?: Date;
}): ImportedVisualAssetCandidate {
  const sourcePath = path.resolve(input.sourcePath);
  const safeName = normalizeAssetFileName(path.basename(sourcePath));
  if (!safeName) {
    throw new Error("Asset filename is unsafe or empty.");
  }
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`Imported asset does not exist: ${input.sourcePath}`);
  }
  const now = input.now ?? new Date();
  const timestamp = timestampForPath(now);
  const candidateId = `${input.slot?.slotId ?? "unassigned"}-${timestamp}-${safeName.replace(/\.[^.]+$/, "")}`;
  const relativePath = `${visualAssetImportedRelativeDir}/${candidateId}${path.extname(safeName).toLowerCase()}`;
  const destinationPath = path.join(input.workspaceRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);

  const bytes = fs.readFileSync(destinationPath);
  const stat = fs.statSync(destinationPath);
  const imageInfo = inspectAssetImage(bytes);
  const candidate: ImportedVisualAssetCandidate = {
    candidateId,
    originalPath: input.sourcePath.replace(/\\/g, "/"),
    copiedAssetPath: relativePath,
    targetSlotId: input.slot?.slotId,
    fileType: imageInfo.fileType,
    dimensions: dimensionsFromImageInfo(imageInfo),
    fileSizeBytes: stat.size,
    hasAlpha: imageInfo.fileType === "unsupported" ? undefined : imageInfo.hasAlpha,
    validationWarnings: [],
    validationErrors: [],
    approvalStatus: input.approvalStatus ?? "pending",
    notes: ["Imported by Game Polish Lab v0.80; runtime game assets were not overwritten."],
    importedAt: now.toISOString()
  };
  if (input.slot) {
    const validation = validateImportedVisualAssetCandidate(input.workspaceRoot, input.slot, candidate, now.toISOString());
    candidate.validationWarnings = validation.warnings;
    candidate.validationErrors = validation.errors;
  }
  writeVisualAssetDashboardFile(input.workspaceRoot, { candidates: [candidate] }, now);
  return candidate;
}

export function assignVisualAssetCandidate(input: {
  workspaceRoot: string;
  slot: VisualAssetSlot;
  candidate: ImportedVisualAssetCandidate;
  now?: Date;
}): { assignment: AssignedVisualAsset; result: VisualAssetOperationResult } {
  const now = input.now ?? new Date();
  const validation = validateImportedVisualAssetCandidate(input.workspaceRoot, input.slot, input.candidate, now.toISOString());
  const changedFiles: string[] = [];
  const rollbackPaths: string[] = [];
  const warnings = [...validation.warnings];
  const errors = [...validation.errors];
  if (input.candidate.approvalStatus !== "approved") {
    errors.push("Candidate must be approved before assignment.");
  }
  if (input.slot.directApplyCapability === "unsupported") {
    errors.push("Slot is unsupported; create a fallback task instead of assigning it.");
  }
  if (errors.length > 0) {
    return {
      assignment: buildAssignment(input.slot, input.candidate, validation, now),
      result: {
        status: "blocked",
        message: "Asset assignment was blocked.",
        changedFiles,
        rollbackPaths,
        warnings,
        errors
      }
    };
  }

  const assignment = buildAssignment(input.slot, input.candidate, validation, now);
  const absoluteAssignmentPath = path.join(input.workspaceRoot, ...assignment.assignmentPath.split("/"));
  if (fs.existsSync(absoluteAssignmentPath)) {
    const rollbackPath = createAssetPipelineRollback(input.workspaceRoot, assignment.assignmentPath, now);
    if (rollbackPath) {
      rollbackPaths.push(rollbackPath);
      assignment.rollbackSnapshotPath = rollbackPath;
    }
  }
  fs.mkdirSync(path.dirname(absoluteAssignmentPath), { recursive: true });
  fs.writeFileSync(absoluteAssignmentPath, `${JSON.stringify(assignment, null, 2)}\n`, "utf8");
  changedFiles.push(assignment.assignmentPath);
  writeVisualAssetDashboardFile(input.workspaceRoot, { assignments: [assignment], candidates: [input.candidate] }, now);
  changedFiles.push(visualAssetDashboardRelativePath);

  if (assignment.fallbackRequired) {
    warnings.push("Assignment metadata was written, but runtime/source loader wiring remains fallback-required.");
  }
  return {
    assignment,
    result: {
      status: warnings.length > 0 ? "warning" : "ok",
      message: assignment.fallbackRequired
        ? "Assigned asset metadata only; runtime wiring is fallback-required."
        : "Assigned asset metadata through a Game Polish Lab-owned config path.",
      changedFiles,
      rollbackPaths,
      warnings,
      errors
    }
  };
}

export function buildVisualAssetFallbackTask(input: {
  slot: VisualAssetSlot;
  candidate?: ImportedVisualAssetCandidate;
  validation?: VisualAssetValidationResult;
  now?: Date;
}): VisualAssetFallbackTask {
  const now = input.now ?? new Date();
  const validation = input.validation ?? {
    status: input.candidate ? statusFromMessages(input.candidate.validationWarnings, input.candidate.validationErrors) : "unvalidated",
    warnings: input.candidate?.validationWarnings ?? [],
    errors: input.candidate?.validationErrors ?? [],
    checkedAt: now.toISOString()
  };
  return {
    taskId: `${timestampForPath(now)}-${input.slot.slotId}`,
    adapterId: input.slot.adapterId,
    adapterLabel: input.slot.adapterLabel,
    surfaceId: input.slot.surfaceId,
    surfaceLabel: input.slot.surfaceLabel,
    slotId: input.slot.slotId,
    slotLabel: input.slot.slotLabel,
    importedAssetPath: input.candidate?.copiedAssetPath,
    validation,
    targetConfigPath: input.slot.targetConfigPath,
    knownManifestPath: input.slot.knownManifestPath,
    ownerFileScope: input.slot.ownerSourceFileHints,
    allowedFiles: Array.from(new Set([
      visualAssetDashboardRelativePath,
      visualAssetValidationRelativePath,
      input.slot.targetConfigPath,
      input.slot.knownManifestPath,
      input.candidate?.copiedAssetPath,
      ...input.slot.ownerSourceFileHints
    ].filter((value): value is string => Boolean(value)))).sort(),
    forbiddenAreas: [
      "save schema/state persistence changes",
      "economy/balance/progression changes",
      "level/rule/solver changes",
      "enemy/player gameplay changes",
      "projectile/shooter/auto-shooter systems",
      "upgrade costs/effects",
      "ad/monetization changes",
      "package/dependency churn unless explicitly required and explained",
      "unrelated adapter changes",
      "broad rewrites outside chosen file scope"
    ],
    instruction: "wire this approved imported asset into this selected visual asset slot only.",
    manualVisualTestChecklist: [
      "Confirm the selected asset slot renders in the intended surface only.",
      "Confirm dimensions/transparency warnings were reviewed.",
      "Confirm no gameplay, save, economy, progression, ad, rule, solver, enemy/player, projectile, shooter, or upgrade behavior changed.",
      "Confirm unsupported loader/source wiring stayed inside the exact owner file scope."
    ],
    createdAt: now.toISOString()
  };
}

export function writeVisualAssetFallbackTask(workspaceRoot: string, task: VisualAssetFallbackTask): string {
  const relativePath = `.game-polish-lab/fallback-tasks/${task.taskId}-asset-pipeline.json`;
  const absolutePath = path.join(workspaceRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return relativePath;
}

export function assetPipelineScopePaths(slot: VisualAssetSlot): string[] {
  return [
    visualAssetDashboardRelativePath,
    visualAssetValidationRelativePath,
    visualAssetContractRelativePath,
    slot.targetConfigPath,
    slot.knownManifestPath,
    ...slot.ownerSourceFileHints
  ].filter((value): value is string => Boolean(value));
}

function chooseAssetPipelineAdapter(files: VisualAssetInspectedFile[]): string {
  const idle = detectIdleMonsterFarm(files);
  const sort = detectSortPuzzleProject(files);
  const cursor = detectCursorArenaProject(files);
  const generic = detectGenericPhaserProject(files);
  const idleScore = idle.detected ? confidenceScore(idle.confidence) : 0;
  const sortScore = sort.detected ? confidenceScore(sort.confidence) : 0;
  const cursorScore = cursor.detected ? confidenceScore(cursor.confidence) : 0;
  if (idleScore > 0 && idleScore >= sortScore && idleScore >= cursorScore) {
    return "idle_monster_farm";
  }
  if (sortScore >= 2 && sortScore >= cursorScore && sortScore > idleScore) {
    return "sort_puzzle";
  }
  if (cursorScore >= 2 && cursorScore > idleScore && cursorScore > sortScore) {
    return "cursor_arena";
  }
  return generic.detected ? "generic_phaser" : "unknown";
}

function detectIdleMonsterFarm(files: VisualAssetInspectedFile[]): { detected: boolean; confidence: "high" | "medium" | "low" | "unknown" } {
  const text = files.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
  const score = (text.includes("farmscene") ? 1 : 0) + (text.includes("monster") ? 1 : 0) + (text.includes("hatch") ? 1 : 0);
  return { detected: score >= 1, confidence: score >= 3 ? "high" : score >= 2 ? "medium" : score === 1 ? "low" : "unknown" };
}

function buildIdleMonsterFarmSlots(): VisualAssetSlot[] {
  return monsterFarmAssetTargets().map((target) => ({
    slotId: `idle_monster_farm.${target.targetId}`,
    adapterId: "idle_monster_farm",
    adapterLabel: "Idle Monster Farm",
    surfaceId: target.surfaceType,
    surfaceLabel: "Asset Replacement",
    slotLabel: target.label,
    expectedAssetType: expectedTypeFromKinds(target.expectedKinds),
    expectedFileExtensions: [".png", ".webp"],
    expectedDimensions: target.expectedWidth && target.expectedHeight ? { width: target.expectedWidth, height: target.expectedHeight } : undefined,
    transparencyRequired: target.transparencyRequired,
    targetConfigPath: `${visualAssetAssignmentsRelativeDir}/idle-monster-farm-${target.targetId}.json`,
    ownerSourceFileHints: [target.destinationFolder],
    safetyStatus: target.directApplySupported ? "safe" : "suspicious",
    validationStatus: "unvalidated",
    directApplyCapability: target.directApplySupported ? "config_only" : "fallback_required",
    notes: target.warnings
  }));
}

function buildSortPuzzleSlots(): VisualAssetSlot[] {
  return [
    slot("sort_puzzle", "Sort Puzzle", "sort_puzzle.spirit_art", "asset_replacement", "Spirit Asset Presentation", "Spirit art", "image", { width: 96, height: 96 }, true, "unsupported", "fallback_required", ["src/scenes/SpiritSortScene.ts", "src/assets/spirits"], ["Spirit Asset Presentation remains unsupported/manual-only in v0.80."]),
    slot("sort_puzzle", "Sort Puzzle", "sort_puzzle.shelf_frame", "slot_card", "Shelf Card", "Shelf frame/background", "ui-frame", undefined, true, "suspicious", "fallback_required", ["src/scenes/SpiritSortScene.ts", "src/assets/ui"]),
    slot("sort_puzzle", "Sort Puzzle", "sort_puzzle.win_reward_icon", "reward_toast", "Win Reward Toast", "Win reward/toast icon", "icon", { width: 64, height: 64 }, true, "suspicious", "fallback_required", ["src/scenes/SpiritSortScene.ts", "src/assets/ui"]),
    slot("sort_puzzle", "Sort Puzzle", "sort_puzzle.background_image", "background_readability", "Background", "Background image", "background", undefined, false, "suspicious", "fallback_required", ["src/scenes/SpiritSortScene.ts", "src/assets/backgrounds"])
  ];
}

function buildCursorArenaSlots(): VisualAssetSlot[] {
  return [
    slot("cursor_arena", "Cursor Arena", "cursor_arena.enemy_icon", "asset_replacement", "Enemy Presentation", "Enemy/icon slot", "icon", { width: 64, height: 64 }, true, "suspicious", "fallback_required", ["src/arena/scenes/ArenaScene.ts", "src/assets/enemies"]),
    slot("cursor_arena", "Cursor Arena", "cursor_arena.cursor_effect_sprite", "reward_toast", "Cursor Hit Feedback", "Cursor effect sprite", "effect", { width: 64, height: 64 }, true, "suspicious", "fallback_required", ["src/arena/systems/ImpactEffectSystem.ts", "src/arena/systems/CursorAttackSystem.ts"]),
    slot("cursor_arena", "Cursor Arena", "cursor_arena.background_image", "background_readability", "Arena Background", "Background image", "background", undefined, false, "suspicious", "fallback_required", ["src/arena/scenes/ArenaScene.ts", "src/styles/arena.css"]),
    slot("cursor_arena", "Cursor Arena", "cursor_arena.hit_kill_combo_sprite", "reward_toast", "Kill/Combo Feedback", "Hit/kill/combo effect sprite", "effect", { width: 64, height: 64 }, true, "suspicious", "fallback_required", ["src/arena/systems/ImpactEffectSystem.ts"]),
    slot("cursor_arena", "Cursor Arena", "cursor_arena.hud_upgrade_icon", "panel", "HUD/Upgrade UI", "HUD/upgrade icon", "icon", { width: 48, height: 48 }, true, "suspicious", "fallback_required", ["src/arena/ui/ArenaHud.ts", "src/arena/ui/UpgradePanel.ts"])
  ];
}

function buildGenericPhaserSlots(files: VisualAssetInspectedFile[]): VisualAssetSlot[] {
  const genericDetection = detectGenericPhaserProject(files);
  const loaderAssets = discoverGenericLoaderAssets(files);
  const slots = loaderAssets.map((asset, index) => slot(
    "generic_phaser",
    "Generic Phaser",
    `generic_phaser.${asset.key || `asset_${index + 1}`}`,
    "asset_replacement",
    "Generic Asset Slot",
    asset.label,
    asset.kind,
    asset.dimensions,
    undefined,
    asset.manifestPath ? "suspicious" : "unknown",
    asset.manifestPath ? "fallback_required" : "fallback_required",
    [asset.ownerFile],
    asset.path ? [`Detected loader path: ${asset.path}`] : ["Loader/manifest path is unknown; assignment is manual/fallback-required."],
    asset.path,
    undefined,
    asset.manifestPath
  ));
  const folderSlots = discoverGenericAssetFolders(files)
    .filter((folder) => !slots.some((existing) => existing.ownerSourceFileHints.includes(folder)))
    .map((folder, index) => slot(
      "generic_phaser",
      "Generic Phaser",
      `generic_phaser.asset_folder_${index + 1}`,
      "asset_replacement",
      "Generic Asset Folder",
      `Manual asset slot: ${folder}`,
      "image",
      undefined,
      undefined,
      "unknown",
      "fallback_required",
      [folder],
      ["Asset folder was detected, but no safe loader/manifest assignment path is known."]
    ));
  const manualOwnerSlots = genericDetection.ownerFileSuggestions
    .filter((suggestion) => suggestion.recommendedSurfaceTypes.includes("asset_slot") || suggestion.recommendedSurfaceTypes.includes("hud") || suggestion.recommendedSurfaceTypes.includes("impact_feedback"))
    .filter((suggestion) => !slots.some((existing) => existing.ownerSourceFileHints.includes(suggestion.path)))
    .slice(0, 12)
    .map((suggestion, index) => slot(
      "generic_phaser",
      "Generic Phaser",
      `generic_phaser.manual_${safeId(suggestion.path)}_${index + 1}`,
      "asset_replacement",
      "Generic Manual Asset Slot",
      `Manual asset slot: ${suggestion.path}`,
      suggestion.recommendedSurfaceTypes.includes("impact_feedback") ? "effect" : "image",
      undefined,
      undefined,
      suggestion.safetyLevel === "safe" ? "safe" : suggestion.safetyLevel === "forbidden" ? "unsupported" : "suspicious",
      "fallback_required",
      [suggestion.path],
      [`${suggestion.reason} Loader/manifest path is unknown, so v0.80 treats this as fallback-required.`]
    ));
  return [...slots, ...folderSlots, ...manualOwnerSlots];
}

function discoverGenericLoaderAssets(files: VisualAssetInspectedFile[]): Array<{ key: string; label: string; path?: string; ownerFile: string; kind: VisualAssetExpectedType; dimensions?: VisualAssetDimensions; manifestPath?: string }> {
  const results: Array<{ key: string; label: string; path?: string; ownerFile: string; kind: VisualAssetExpectedType; dimensions?: VisualAssetDimensions; manifestPath?: string }> = [];
  for (const file of files) {
    const ownerFile = normalizeVisualScopePath(file.relativePath);
    const loaderPattern = /\bload\.(image|spritesheet)\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]+)["'`](?:\s*,\s*\{([^)]*)\})?/gi;
    for (const match of file.text.matchAll(loaderPattern)) {
      const kind = match[1].toLowerCase() === "spritesheet" ? "spritesheet" : expectedTypeFromPath(match[3]);
      const frameConfig = match[4] ?? "";
      const width = /frameWidth\s*:\s*(\d+)/i.exec(frameConfig)?.[1];
      const height = /frameHeight\s*:\s*(\d+)/i.exec(frameConfig)?.[1];
      results.push({
        key: safeId(match[2]),
        label: `${match[2]} (${match[1]})`,
        path: normalizeVisualScopePath(match[3]),
        ownerFile,
        kind,
        dimensions: width && height ? { width: Number(width), height: Number(height) } : undefined,
        manifestPath: ownerFile.toLowerCase().includes("manifest") ? ownerFile : undefined
      });
    }
    const addPattern = /\badd\.(image|sprite)\([^,]+,[^,]+,\s*["'`]([^"'`]+)["'`]/gi;
    for (const match of file.text.matchAll(addPattern)) {
      if (results.some((entry) => entry.key === safeId(match[2]))) {
        continue;
      }
      results.push({
        key: safeId(match[2]),
        label: `${match[2]} (${match[1]})`,
        ownerFile,
        kind: match[1].toLowerCase() === "sprite" ? "spritesheet" : "image"
      });
    }
  }
  return results.slice(0, 40);
}

function discoverGenericAssetFolders(files: VisualAssetInspectedFile[]): string[] {
  return Array.from(new Set(files
    .map((file) => normalizeVisualScopePath(file.relativePath))
    .filter((file) => /^(src\/assets|public\/assets|assets)\//.test(file))
    .map((file) => file.split("/").slice(0, -1).join("/"))
    .filter(Boolean))).sort().slice(0, 24);
}

function slot(
  adapterId: string,
  adapterLabelValue: string,
  slotId: string,
  surfaceId: string,
  surfaceLabel: string,
  slotLabel: string,
  expectedAssetType: VisualAssetExpectedType,
  expectedDimensions: VisualAssetDimensions | undefined,
  transparencyRequired: boolean | undefined,
  safetyStatus: VisualAssetSafetyStatus,
  directApplyCapability: VisualAssetDirectApplyCapability,
  ownerSourceFileHints: string[],
  notes: string[] = [],
  currentAssetPath?: string,
  targetConfigPath = `${visualAssetAssignmentsRelativeDir}/${slotId.replace(/\./g, "-")}.json`,
  knownManifestPath?: string
): VisualAssetSlot {
  return {
    slotId,
    adapterId,
    adapterLabel: adapterLabelValue,
    surfaceId,
    surfaceLabel,
    slotLabel,
    expectedAssetType,
    expectedFileExtensions: supportedExtensions,
    expectedDimensions,
    transparencyRequired,
    currentAssetPath,
    targetConfigPath,
    knownManifestPath,
    ownerSourceFileHints: ownerSourceFileHints.map(normalizeVisualScopePath).sort(),
    safetyStatus,
    validationStatus: "unvalidated",
    directApplyCapability,
    notes
  };
}

function readVisualAssetCandidates(workspaceRoot: string): ImportedVisualAssetCandidate[] {
  const dashboard = readVisualAssetDashboardFile(workspaceRoot);
  return dashboard.candidates ?? [];
}

function readVisualAssetAssignments(workspaceRoot: string): AssignedVisualAsset[] {
  const assignmentDir = path.join(workspaceRoot, ...visualAssetAssignmentsRelativeDir.split("/"));
  const assignments: AssignedVisualAsset[] = [...(readVisualAssetDashboardFile(workspaceRoot).assignments ?? [])];
  if (!fs.existsSync(assignmentDir)) {
    return assignments;
  }
  for (const fileName of fs.readdirSync(assignmentDir).filter((entry) => entry.endsWith(".json")).sort()) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(assignmentDir, fileName), "utf8")) as AssignedVisualAsset;
      if (parsed.assignmentId && !assignments.some((entry) => entry.assignmentId === parsed.assignmentId)) {
        assignments.push(parsed);
      }
    } catch {
      // Ignore malformed assignment files in dashboard reads; validation surfaces warnings elsewhere.
    }
  }
  return assignments;
}

function readVisualAssetDashboardFile(workspaceRoot: string): Partial<VisualAssetDashboardModel> {
  const filePath = path.join(workspaceRoot, ...visualAssetDashboardRelativePath.split("/"));
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<VisualAssetDashboardModel>;
  } catch {
    return { warnings: ["Asset dashboard metadata is malformed."] };
  }
}

function writeVisualAssetDashboardFile(workspaceRoot: string, patch: { candidates?: ImportedVisualAssetCandidate[]; assignments?: AssignedVisualAsset[] }, now: Date): void {
  const existing = readVisualAssetDashboardFile(workspaceRoot);
  const candidates = mergeById(existing.candidates ?? [], patch.candidates ?? [], (candidate) => candidate.candidateId);
  const assignments = mergeById(existing.assignments ?? [], patch.assignments ?? [], (assignment) => assignment.assignmentId);
  const model = {
    schemaVersion: "visual-asset-pipeline-dashboard/v1",
    activeAdapter: existing.activeAdapter ?? "unknown",
    activeAdapterLabel: existing.activeAdapterLabel ?? "Unknown",
    slots: existing.slots ?? [],
    candidates,
    assignments,
    rows: existing.rows ?? [],
    groupedSurfaceIds: existing.groupedSurfaceIds ?? [],
    statusCounts: existing.statusCounts ?? { missing: 0, valid: 0, warning: 0, invalid: 0, unvalidated: 0 },
    warnings: existing.warnings ?? [],
    updatedAt: now.toISOString()
  } satisfies VisualAssetDashboardModel;
  const filePath = path.join(workspaceRoot, ...visualAssetDashboardRelativePath.split("/"));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(model, null, 2)}\n`, "utf8");
}

function buildAssignment(slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate, validation: VisualAssetValidationResult, now: Date): AssignedVisualAsset {
  const fallbackRequired = slot.directApplyCapability === "fallback_required" || slot.safetyStatus !== "safe";
  return {
    assignmentId: `${slot.slotId}-${candidate.candidateId}`,
    slotId: slot.slotId,
    candidateId: candidate.candidateId,
    adapterId: slot.adapterId,
    surfaceId: slot.surfaceId,
    copiedAssetPath: candidate.copiedAssetPath,
    assignmentPath: slot.targetConfigPath ?? `${visualAssetAssignmentsRelativeDir}/${slot.slotId.replace(/\./g, "-")}.json`,
    targetConfigPath: slot.targetConfigPath,
    knownManifestPath: slot.knownManifestPath,
    runtimeApplied: false,
    fallbackRequired,
    validation,
    assignedAt: now.toISOString(),
    notes: [
      "Assignment is metadata/config-first and does not overwrite original game assets.",
      fallbackRequired ? "Loader/source integration remains fallback-only for this slot." : "Known safe Game Polish Lab-owned assignment metadata was updated."
    ]
  };
}

function createAssetPipelineRollback(workspaceRoot: string, relativePath: string, now: Date): string | undefined {
  const sourcePath = path.join(workspaceRoot, ...relativePath.split("/"));
  if (!fs.existsSync(sourcePath)) {
    return undefined;
  }
  const rollbackRelativePath = `.game-polish-lab/rollback/${timestampForPath(now)}-asset-pipeline-${path.basename(relativePath)}`;
  const rollbackPath = path.join(workspaceRoot, ...rollbackRelativePath.split("/"));
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.copyFileSync(sourcePath, rollbackPath);
  return rollbackRelativePath;
}

function validationFromSlotCandidate(slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate | undefined, assignment: AssignedVisualAsset | undefined, checkedAt?: string): VisualAssetValidationResult {
  if (assignment) {
    return assignment.validation;
  }
  if (!candidate) {
    return {
      status: slot.currentAssetPath ? slot.validationStatus : "unvalidated",
      warnings: slot.notes ?? [],
      errors: [],
      checkedAt
    };
  }
  return {
    status: statusFromMessages(candidate.validationWarnings, candidate.validationErrors),
    warnings: candidate.validationWarnings,
    errors: candidate.validationErrors,
    checkedAt
  };
}

function countValidationStatuses(rows: VisualAssetDashboardRow[]): Record<VisualAssetPipelineValidationStatus, number> {
  const counts: Record<VisualAssetPipelineValidationStatus, number> = {
    missing: 0,
    valid: 0,
    warning: 0,
    invalid: 0,
    unvalidated: 0
  };
  for (const row of rows) {
    counts[row.validation.status] += 1;
  }
  return counts;
}

function dashboardWarnings(slots: VisualAssetSlot[], candidates: ImportedVisualAssetCandidate[], assignments: AssignedVisualAsset[]): string[] {
  return [
    ...slots.filter((slot) => slot.directApplyCapability === "fallback_required").map((slot) => `${slot.slotLabel}: runtime loader/source wiring is fallback-required.`),
    ...candidates.flatMap((candidate) => candidate.validationWarnings.map((warning) => `${candidate.candidateId}: ${warning}`)),
    ...assignments.filter((assignment) => !assignment.runtimeApplied).map((assignment) => `${assignment.slotId}: assigned metadata does not mean runtime-applied.`)
  ];
}

function statusFromMessages(warnings: string[], errors: string[]): VisualAssetPipelineValidationStatus {
  if (errors.length > 0) {
    return "invalid";
  }
  if (warnings.length > 0) {
    return "warning";
  }
  return "valid";
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

function isSafeFileName(fileName: string): boolean {
  return Boolean(fileName) && normalizeAssetFileName(fileName) === fileName.toLowerCase() && !fileName.includes("..");
}

function expectedTypeFromKinds(kinds: string[]): VisualAssetExpectedType {
  const text = kinds.join(" ").toLowerCase();
  if (text.includes("background") || text.includes("backdrop")) {
    return "background";
  }
  if (text.includes("icon")) {
    return "icon";
  }
  if (text.includes("frame")) {
    return "ui-frame";
  }
  if (text.includes("effect") || text.includes("particle")) {
    return "effect";
  }
  if (text.includes("monster") || text.includes("creature")) {
    return "image";
  }
  if (text.includes("sprite")) {
    return "spritesheet";
  }
  return "image";
}

function expectedTypeFromPath(assetPath: string): VisualAssetExpectedType {
  const lowerPath = assetPath.toLowerCase();
  if (lowerPath.includes("background") || lowerPath.includes("/bg")) {
    return "background";
  }
  if (lowerPath.includes("icon")) {
    return "icon";
  }
  if (lowerPath.includes("frame") || lowerPath.includes("panel")) {
    return "ui-frame";
  }
  if (lowerPath.includes("effect") || lowerPath.includes("hit") || lowerPath.includes("spark")) {
    return "effect";
  }
  return "image";
}

function dimensionsFromImageInfo(imageInfo: ReturnType<typeof inspectAssetImage>): VisualAssetDimensions | undefined {
  return imageInfo.width && imageInfo.height ? { width: imageInfo.width, height: imageInfo.height } : undefined;
}

function confidenceScore(confidence: "high" | "medium" | "low" | "unknown"): number {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : confidence === "low" ? 1 : 0;
}

function adapterLabel(adapterId: string): string {
  if (adapterId === "idle_monster_farm") {
    return "Idle Monster Farm";
  }
  if (adapterId === "sort_puzzle") {
    return "Sort Puzzle";
  }
  if (adapterId === "cursor_arena") {
    return "Cursor Arena";
  }
  if (adapterId === "generic_phaser") {
    return "Generic Phaser";
  }
  return "Unknown";
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}

function mergeById<T>(existing: T[], patch: T[], id: (value: T) => string): T[] {
  const values = new Map(existing.map((entry) => [id(entry), entry]));
  for (const entry of patch) {
    values.set(id(entry), entry);
  }
  return Array.from(values.values()).sort((a, b) => id(a).localeCompare(id(b)));
}

export function checkAssetPipelineScope(slot: VisualAssetSlot) {
  return checkVisualScopeGuard({
    operationType: "asset_pipeline_assignment",
    adapterId: slot.adapterId,
    surfaceType: "asset_replacement",
    targetId: slot.slotId,
    candidatePaths: assetPipelineScopePaths(slot)
  });
}
