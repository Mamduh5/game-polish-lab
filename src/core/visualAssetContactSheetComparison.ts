import * as fs from "fs";
import * as path from "path";

import { inspectAssetImage } from "./assetReplacement";
import { visualAssetDashboardRelativePath } from "./visualAssetPipeline";
import { normalizeVisualScopePath } from "./visualScopeGuard";
import type {
  VisualAssetComparisonEntry,
  VisualAssetComparisonNextAction,
  VisualAssetComparisonPreviewMode,
  VisualAssetComparisonResult,
  VisualAssetComparisonSet,
  VisualAssetComparisonSummary,
  VisualAssetComparisonUserMark,
  VisualAssetContactSheetFallbackTask,
  VisualAssetComparisonIndex
} from "../types/visualAssetContactSheetComparison";
import type {
  ImportedVisualAssetCandidate,
  VisualAssetDashboardModel,
  VisualAssetDashboardRow,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";

export const visualAssetContactSheetComparisonRelativeDir = ".game-polish-lab/assets/contact-sheets";
export const visualAssetContactSheetComparisonIndexRelativePath = ".game-polish-lab/assets/contact-sheets/index.json";

const forbiddenFallbackAreas = [
  "save schema/state persistence changes",
  "economy, balance, rewards, or progression changes",
  "gameplay rules, level data, solvers, enemy/player, projectile, shooter, or upgrade logic",
  "ad, analytics, SDK, package, dependency, or build-system changes",
  "broad source rewrites or unrelated adapter changes",
  "visual redesign outside the selected visual asset slot",
  "asset generation, pixel mutation, AI scoring, OCR, or automatic visual-quality judgment"
];

export function createVisualAssetContactSheetComparison(input: {
  workspaceRoot: string;
  row: VisualAssetDashboardRow;
  now?: Date;
}): VisualAssetComparisonSet {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const comparisonId = `${safeId(input.row.slot.slotId)}-${timestampForPath(now)}`;
  const entries = buildComparisonEntries(input.workspaceRoot, input.row);
  const warnings = [
    ...comparisonWarnings(input.row, entries),
    "Comparison is manual visual review only; Game Polish Lab does not score, recognize, or judge image quality automatically."
  ];
  const errors = entries.some((entry) => entry.role !== "current") ? [] : ["No imported, normalized, assigned, or manifest-applied candidate exists for comparison."];
  const comparison: VisualAssetComparisonSet = {
    schemaVersion: "visual-asset-contact-sheet-comparison/v1",
    comparisonId,
    createdAt,
    updatedAt: createdAt,
    status: errors.length > 0 ? "skipped" : "ready",
    workspaceLabel: safeWorkspaceLabel(input.workspaceRoot),
    adapterId: input.row.slot.adapterId,
    adapterLabel: input.row.slot.adapterLabel,
    surfaceId: input.row.slot.surfaceId,
    surfaceLabel: input.row.slot.surfaceLabel,
    assetSlotId: input.row.slot.slotId,
    assetSlotLabel: input.row.slot.slotLabel,
    currentAssetPath: input.row.slot.currentAssetPath,
    importedCandidatePaths: input.row.candidate ? [input.row.candidate.copiedAssetPath] : [],
    normalizedCandidatePaths: input.row.normalization?.outputPath ? [input.row.normalization.outputPath] : [],
    assignedAssetPath: input.row.assignmentAssetPath,
    manifestAppliedAssetPath: input.row.manifestApplyResult?.status === "applied" ? input.row.assignmentAssetPath : undefined,
    styleGuidePath: input.row.styleGuide?.markdownPath,
    assetContractSummary: assetContractSummary(input.row),
    validationSummary: input.row.validation,
    boundsSummary: input.row.boundsAnalysis
      ? {
        candidateId: input.row.boundsAnalysis.candidateId,
        visibleAreaRatio: input.row.boundsAnalysis.visibleAreaRatio,
        recommendedAction: input.row.boundsAnalysis.recommendedAction,
        warnings: input.row.boundsAnalysis.warnings,
        errors: input.row.boundsAnalysis.errors
      }
      : undefined,
    manifestApplySummary: input.row.manifestApplyResult,
    manifestContractSummary: input.row.manifestContract
      ? {
        contractId: input.row.manifestContract.contractId,
        manifestPath: input.row.manifestContract.manifestPath,
        writablePathSafety: input.row.manifestContract.writablePathSafety,
        supportedOperation: input.row.manifestContract.supportedOperation,
        warnings: input.row.manifestContract.warnings,
        errors: input.row.manifestContract.errors
      }
      : undefined,
    previewMode: previewModeForRow(input.row),
    comparisonEntries: entries,
    userDecisionSummary: summarizeDecision(entries, input.row),
    sourceMetadata: {
      candidate: input.row.candidate,
      normalization: input.row.normalization,
      assignment: input.row.assignment
    },
    warnings,
    errors
  };
  return {
    ...comparison,
    result: resultForComparison(comparison, [])
  };
}

export function writeVisualAssetContactSheetComparison(workspaceRoot: string, comparison: VisualAssetComparisonSet): VisualAssetComparisonResult {
  const paths = comparisonPaths(comparison.comparisonId);
  const result = resultForComparison(comparison, [paths.jsonPath, paths.htmlPath, visualAssetContactSheetComparisonIndexRelativePath]);
  const withResult: VisualAssetComparisonSet = {
    ...comparison,
    result
  };
  const jsonPath = path.join(workspaceRoot, ...paths.jsonPath.split("/"));
  const htmlPath = path.join(workspaceRoot, ...paths.htmlPath.split("/"));
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(withResult, null, 2)}\n`, "utf8");
  fs.writeFileSync(htmlPath, renderVisualAssetContactSheetComparisonHtml(withResult), "utf8");
  writeVisualAssetContactSheetComparisonIndex(workspaceRoot, summaryForComparison(withResult, paths), withResult.updatedAt);
  return result;
}

export function createAndWriteVisualAssetContactSheetComparison(input: {
  workspaceRoot: string;
  row: VisualAssetDashboardRow;
  now?: Date;
}): { comparison: VisualAssetComparisonSet; result: VisualAssetComparisonResult } {
  const comparison = createVisualAssetContactSheetComparison(input);
  const result = writeVisualAssetContactSheetComparison(input.workspaceRoot, comparison);
  return { comparison: { ...comparison, result }, result };
}

export function markVisualAssetContactSheetComparisonEntry(input: {
  workspaceRoot: string;
  comparisonId: string;
  entryId?: string;
  mark: VisualAssetComparisonUserMark;
  note?: string;
  now?: Date;
}): { comparison?: VisualAssetComparisonSet; result: VisualAssetComparisonResult } {
  const now = input.now ?? new Date();
  const comparison = readVisualAssetContactSheetComparison(input.workspaceRoot, input.comparisonId);
  if (!comparison) {
    return {
      result: {
        comparisonId: input.comparisonId,
        rejectedEntryIds: [],
        mixedEntryIds: [],
        userNotes: [],
        nextRecommendedSafeAction: "no_action",
        runtimeApplied: false,
        filesWritten: [],
        warnings: [],
        errors: [`Contact sheet comparison was not found: ${input.comparisonId}`]
      }
    };
  }
  const entryId = input.entryId ?? chooseDefaultMarkEntry(comparison);
  const entries = comparison.comparisonEntries.map((entry) => {
    if (entry.entryId !== entryId) {
      return entry;
    }
    return {
      ...entry,
      userMark: input.mark,
      userNote: input.note ?? entry.userNote,
      markedAt: now.toISOString()
    };
  });
  const updated: VisualAssetComparisonSet = {
    ...comparison,
    updatedAt: now.toISOString(),
    comparisonEntries: entries,
    userDecisionSummary: summarizeDecision(entries, undefined, now.toISOString())
  };
  const result = writeVisualAssetContactSheetComparison(input.workspaceRoot, updated);
  maybeUpdateCandidateApproval(input.workspaceRoot, updated, entryId, input.mark, input.note, now);
  return {
    comparison: { ...updated, result },
    result: {
      ...result,
      filesWritten: Array.from(new Set([...result.filesWritten, visualAssetDashboardRelativePath]))
    }
  };
}

export function readVisualAssetContactSheetComparison(workspaceRoot: string, comparisonId: string): VisualAssetComparisonSet | undefined {
  const normalizedId = safeId(comparisonId);
  const relativePath = `${visualAssetContactSheetComparisonRelativeDir}/${normalizedId}.json`;
  const absolutePath = path.join(workspaceRoot, ...relativePath.split("/"));
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as VisualAssetComparisonSet;
    return parsed.schemaVersion === "visual-asset-contact-sheet-comparison/v1" && parsed.comparisonId ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function readVisualAssetContactSheetComparisonIndex(workspaceRoot: string): VisualAssetComparisonIndex {
  const absolutePath = path.join(workspaceRoot, ...visualAssetContactSheetComparisonIndexRelativePath.split("/"));
  if (!fs.existsSync(absolutePath)) {
    return { schemaVersion: "visual-asset-contact-sheet-comparisons/v1", comparisons: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Partial<VisualAssetComparisonIndex>;
    if (parsed.schemaVersion !== "visual-asset-contact-sheet-comparisons/v1" || !Array.isArray(parsed.comparisons)) {
      return { schemaVersion: "visual-asset-contact-sheet-comparisons/v1", comparisons: [] };
    }
    return parsed as VisualAssetComparisonIndex;
  } catch {
    return { schemaVersion: "visual-asset-contact-sheet-comparisons/v1", comparisons: [] };
  }
}

export function readLatestVisualAssetContactSheetComparisonSummaries(workspaceRoot: string): VisualAssetComparisonSummary[] {
  const latestBySlot = new Map<string, VisualAssetComparisonSummary>();
  for (const summary of readVisualAssetContactSheetComparisonIndex(workspaceRoot).comparisons) {
    const existing = latestBySlot.get(summary.assetSlotId);
    if (!existing || existing.updatedAt < summary.updatedAt) {
      latestBySlot.set(summary.assetSlotId, summary);
    }
  }
  return Array.from(latestBySlot.values()).sort((a, b) => a.assetSlotId.localeCompare(b.assetSlotId));
}

export function writeVisualAssetContactSheetComparisonIndex(workspaceRoot: string, summary: VisualAssetComparisonSummary, updatedAt: string): string {
  const current = readVisualAssetContactSheetComparisonIndex(workspaceRoot);
  const comparisons = mergeById(current.comparisons, [summary], (comparison) => comparison.comparisonId);
  const index: VisualAssetComparisonIndex = {
    schemaVersion: "visual-asset-contact-sheet-comparisons/v1",
    updatedAt,
    comparisons
  };
  const absolutePath = path.join(workspaceRoot, ...visualAssetContactSheetComparisonIndexRelativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  return visualAssetContactSheetComparisonIndexRelativePath;
}

export function buildContactSheetComparisonFallbackTask(input: {
  row: VisualAssetDashboardRow;
  comparison: VisualAssetComparisonSet;
  reason: string;
  now?: Date;
}): VisualAssetContactSheetFallbackTask {
  const now = input.now ?? new Date();
  const chosen = input.comparison.comparisonEntries.find((entry) => entry.entryId === input.comparison.userDecisionSummary.chosenEntryId);
  const jsonPath = comparisonPaths(input.comparison.comparisonId).jsonPath;
  const notes = input.comparison.comparisonEntries
    .filter((entry) => entry.userMark === "rejected" || entry.userMark === "mixed" || entry.userMark === "needs_revision")
    .flatMap((entry) => entry.userNote ? [`${entry.label}: ${entry.userNote}`] : [`${entry.label}: ${entry.userMark}`]);
  return {
    taskId: `${timestampForPath(now)}-${safeId(input.row.slot.slotId)}-contact-sheet-fallback`,
    adapterId: input.row.slot.adapterId,
    adapterLabel: input.row.slot.adapterLabel,
    surfaceId: input.row.slot.surfaceId,
    surfaceLabel: input.row.slot.surfaceLabel,
    assetSlotId: input.row.slot.slotId,
    assetSlotLabel: input.row.slot.slotLabel,
    contactSheetComparisonPath: jsonPath,
    approvedAssetPath: chosen?.assetPath,
    rejectedOrMixedNotes: notes,
    assignmentMetadataPath: input.row.assignment?.assignmentPath,
    validationSummary: input.comparison.validationSummary,
    boundsSummary: input.comparison.boundsSummary,
    styleGuidePath: input.comparison.styleGuidePath,
    manifestContractStatus: input.row.manifestContract ? `${input.row.manifestContract.contractId}: ${input.row.manifestContract.writablePathSafety}/${input.row.manifestContract.supportedOperation}` : "none",
    manifestApplyStatus: input.row.manifestApplyResult ? `${input.row.manifestApplyResult.status}; runtimeApplied=${input.row.manifestApplyResult.runtimeApplied}` : "none",
    suspectedOwnerFileScope: input.row.slot.ownerSourceFileHints,
    allowedFiles: Array.from(new Set([
      jsonPath,
      comparisonPaths(input.comparison.comparisonId).htmlPath,
      visualAssetContactSheetComparisonIndexRelativePath,
      ...(chosen?.assetPath ? [chosen.assetPath] : []),
      ...(input.row.assignment?.assignmentPath ? [input.row.assignment.assignmentPath] : []),
      ...(input.comparison.styleGuidePath ? [input.comparison.styleGuidePath] : [])
    ])).sort(),
    forbiddenAreas: forbiddenFallbackAreas,
    manualVisualTestChecklist: [
      "Open the contact-sheet comparison and confirm the approved asset choice is the intended one.",
      "Verify only the selected adapter, surface, and asset slot are wired.",
      "Confirm no source/runtime assets are overwritten by comparison or fallback metadata.",
      "Run the game manually and inspect only the selected visual slot in its target surface.",
      "Leave runtimeApplied false in Game Polish Lab metadata unless runtime consumption is separately proven."
    ],
    directApplyUnsafeReason: input.reason,
    instruction: "wire this approved contact-sheet asset choice into this selected visual asset slot only.",
    createdAt: now.toISOString()
  };
}

export function writeContactSheetComparisonFallbackTask(workspaceRoot: string, task: VisualAssetContactSheetFallbackTask): string {
  const relativePath = `.game-polish-lab/fallback-tasks/${task.taskId}.json`;
  const absolutePath = path.join(workspaceRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return relativePath;
}

function buildComparisonEntries(workspaceRoot: string, row: VisualAssetDashboardRow): VisualAssetComparisonEntry[] {
  const entries: VisualAssetComparisonEntry[] = [];
  if (row.slot.currentAssetPath) {
    entries.push(entryForPath(workspaceRoot, row, {
      entryId: `${row.slot.slotId}:current`,
      role: "current",
      assetPath: row.slot.currentAssetPath,
      label: "Current/original asset",
      validationStatus: row.slot.validationStatus,
      boundsStatus: "unknown",
      manifestStatus: "none",
      userMark: "pending"
    }));
  }
  if (row.candidate) {
    entries.push(entryForPath(workspaceRoot, row, {
      entryId: `${row.slot.slotId}:candidate:${row.candidate.candidateId}`,
      role: row.candidate.approvalStatus === "rejected" ? "rejected_reference" : "imported_candidate",
      assetPath: row.candidate.copiedAssetPath,
      candidateId: row.candidate.candidateId,
      label: `Imported candidate ${row.candidate.candidateId}`,
      validationStatus: row.validation.status,
      boundsStatus: row.boundsAnalysis?.recommendedAction ?? "unknown",
      manifestStatus: "none",
      userMark: row.candidate.approvalStatus === "approved" ? "approved" : row.candidate.approvalStatus === "rejected" ? "rejected" : "pending",
      warnings: row.candidate.validationWarnings,
      errors: row.candidate.validationErrors
    }));
  }
  if (row.normalization?.status === "created") {
    entries.push(entryForPath(workspaceRoot, row, {
      entryId: `${row.slot.slotId}:normalized:${row.normalization.normalizedAssetId}`,
      role: "normalized_candidate",
      assetPath: row.normalization.outputPath,
      candidateId: row.normalization.sourceCandidateId,
      normalizedAssetId: row.normalization.normalizedAssetId,
      label: `Normalized candidate ${row.normalization.normalizedAssetId}`,
      validationStatus: row.normalization.validationResult.status,
      boundsStatus: row.boundsAnalysis?.recommendedAction ?? "unknown",
      manifestStatus: "none",
      userMark: "pending",
      warnings: row.normalization.warnings,
      errors: row.normalization.errors
    }));
  }
  if (row.assignment) {
    entries.push(entryForPath(workspaceRoot, row, {
      entryId: `${row.slot.slotId}:assignment:${row.assignment.assignmentId}`,
      role: "assigned",
      assetPath: row.assignmentAssetPath ?? row.assignment.copiedAssetPath,
      candidateId: row.assignment.candidateId,
      assignmentId: row.assignment.assignmentId,
      label: `Assigned asset ${row.assignment.assignmentId}`,
      validationStatus: row.assignment.validation.status,
      boundsStatus: row.boundsAnalysis?.recommendedAction ?? "unknown",
      manifestStatus: "none",
      userMark: "pending",
      warnings: row.assignment.validation.warnings,
      errors: row.assignment.validation.errors
    }));
  }
  if (row.manifestApplyResult?.status === "applied" && row.assignmentAssetPath) {
    entries.push(entryForPath(workspaceRoot, row, {
      entryId: `${row.slot.slotId}:manifest:${row.manifestApplyResult.operationId}`,
      role: "manifest_applied",
      assetPath: row.assignmentAssetPath,
      candidateId: row.assignment?.candidateId,
      assignmentId: row.assignment?.assignmentId,
      manifestApplyId: row.manifestApplyResult.operationId,
      label: `Manifest-applied asset ${row.manifestApplyResult.operationId}`,
      validationStatus: row.validation.status,
      boundsStatus: row.boundsAnalysis?.recommendedAction ?? "unknown",
      manifestStatus: row.manifestApplyResult.status,
      userMark: "pending",
      warnings: row.manifestApplyResult.warnings,
      errors: row.manifestApplyResult.errors
    }));
  }
  return dedupeEntries(entries);
}

function entryForPath(
  workspaceRoot: string,
  row: VisualAssetDashboardRow,
  entry: Omit<VisualAssetComparisonEntry, "previewContext" | "dimensions" | "transparencyStatus" | "warnings" | "errors"> & { warnings?: string[]; errors?: string[] }
): VisualAssetComparisonEntry {
  const metadata = inspectPath(workspaceRoot, entry.assetPath);
  return {
    ...entry,
    dimensions: metadata.dimensions,
    transparencyStatus: metadata.transparencyStatus,
    previewContext: previewContextForMode(previewModeForRow(row)),
    warnings: [...(entry.warnings ?? []), ...metadata.warnings],
    errors: [...(entry.errors ?? []), ...metadata.errors]
  };
}

function inspectPath(workspaceRoot: string, relativePath: string | undefined): { dimensions?: { width: number; height: number }; transparencyStatus: "has_alpha" | "no_alpha" | "unknown"; warnings: string[]; errors: string[] } {
  if (!relativePath) {
    return { transparencyStatus: "unknown", warnings: [], errors: ["No asset path is available for this comparison entry."] };
  }
  const normalized = normalizeVisualScopePath(relativePath);
  if (!normalized || path.isAbsolute(relativePath) || normalized.startsWith("../") || normalized.includes("/../")) {
    return { transparencyStatus: "unknown", warnings: [], errors: [`Unsafe asset path was not inspected: ${relativePath}`] };
  }
  const absolutePath = path.resolve(workspaceRoot, ...normalized.split("/"));
  const root = path.resolve(workspaceRoot);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    return { transparencyStatus: "unknown", warnings: [], errors: [`Asset path escapes workspace and was not inspected: ${relativePath}`] };
  }
  if (!fs.existsSync(absolutePath)) {
    return { transparencyStatus: "unknown", warnings: [`Asset file is missing or not readable from the workspace: ${relativePath}`], errors: [] };
  }
  try {
    const image = inspectAssetImage(fs.readFileSync(absolutePath));
    if (image.fileType === "unsupported") {
      return { transparencyStatus: "unknown", warnings: [], errors: [`Asset is not a supported PNG/WebP preview image: ${relativePath}`] };
    }
    return {
      dimensions: image.width && image.height ? { width: image.width, height: image.height } : undefined,
      transparencyStatus: image.hasAlpha ? "has_alpha" : "no_alpha",
      warnings: image.visiblePixelCount === 0 ? ["Asset preview appears fully transparent."] : [],
      errors: []
    };
  } catch (error) {
    return { transparencyStatus: "unknown", warnings: [], errors: [`Asset preview could not be inspected: ${errorToMessage(error)}`] };
  }
}

function summarizeDecision(entries: VisualAssetComparisonEntry[], row?: VisualAssetDashboardRow, updatedAt?: string): VisualAssetComparisonSet["userDecisionSummary"] {
  const approved = entries.filter((entry) => entry.userMark === "approved");
  const rejectedEntryIds = entries.filter((entry) => entry.userMark === "rejected").map((entry) => entry.entryId);
  const mixedEntryIds = entries.filter((entry) => entry.userMark === "mixed").map((entry) => entry.entryId);
  const needsRevisionEntryIds = entries.filter((entry) => entry.userMark === "needs_revision").map((entry) => entry.entryId);
  const chosen = preferredApprovedEntry(approved);
  const status: VisualAssetComparisonUserMark = chosen ? "approved" : mixedEntryIds.length > 0 ? "mixed" : needsRevisionEntryIds.length > 0 ? "needs_revision" : rejectedEntryIds.length > 0 ? "rejected" : "pending";
  const notes = entries.map((entry) => entry.userNote).filter((note): note is string => Boolean(note));
  return {
    status,
    chosenEntryId: chosen?.entryId,
    rejectedEntryIds,
    mixedEntryIds,
    needsRevisionEntryIds,
    userNotes: notes,
    nextRecommendedSafeAction: nextActionForDecision(status, chosen, row),
    runtimeApplied: false,
    updatedAt
  };
}

function nextActionForDecision(status: VisualAssetComparisonUserMark, chosen: VisualAssetComparisonEntry | undefined, row?: VisualAssetDashboardRow): VisualAssetComparisonNextAction {
  if (status === "rejected" || status === "mixed" || status === "needs_revision") {
    return "generate_revision_style_guide";
  }
  if (!chosen) {
    return "no_action";
  }
  if (chosen.role === "normalized_candidate") {
    return "use_normalized_asset";
  }
  if (chosen.role === "imported_candidate") {
    return "assign_asset";
  }
  if (chosen.role === "assigned" && row?.manifestContract?.writablePathSafety === "safe" && !row.manifestApplyResult) {
    return "apply_manifest_assignment";
  }
  if (row?.slot.directApplyCapability === "fallback_required" || row?.manifestContract?.writablePathSafety !== "safe") {
    return "generate_fallback_task";
  }
  return "no_action";
}

function resultForComparison(comparison: VisualAssetComparisonSet, filesWritten: string[]): VisualAssetComparisonResult {
  return {
    comparisonId: comparison.comparisonId,
    chosenEntryId: comparison.userDecisionSummary.chosenEntryId,
    rejectedEntryIds: comparison.userDecisionSummary.rejectedEntryIds,
    mixedEntryIds: comparison.userDecisionSummary.mixedEntryIds,
    userNotes: comparison.userDecisionSummary.userNotes,
    nextRecommendedSafeAction: comparison.userDecisionSummary.nextRecommendedSafeAction,
    runtimeApplied: false,
    filesWritten,
    warnings: comparison.warnings,
    errors: comparison.errors
  };
}

function maybeUpdateCandidateApproval(workspaceRoot: string, comparison: VisualAssetComparisonSet, entryId: string, mark: VisualAssetComparisonUserMark, note: string | undefined, now: Date): void {
  const entry = comparison.comparisonEntries.find((candidate) => candidate.entryId === entryId);
  if (!entry?.candidateId || (mark !== "approved" && mark !== "rejected" && mark !== "pending")) {
    return;
  }
  const dashboard = readDashboard(workspaceRoot);
  const candidates = (dashboard.candidates ?? []).map((candidate) => {
    if (candidate.candidateId !== entry.candidateId) {
      return candidate;
    }
    const notes = Array.from(new Set([
      ...(candidate.notes ?? []),
      `Contact sheet ${comparison.comparisonId} marked ${mark}${note ? `: ${note}` : "."}`
    ]));
    return {
      ...candidate,
      approvalStatus: mark === "approved" ? "approved" : mark === "rejected" ? "rejected" : "pending",
      notes,
      importedAt: candidate.importedAt
    } satisfies ImportedVisualAssetCandidate;
  });
  if (!dashboard.candidates || candidates.every((candidate, index) => candidate === dashboard.candidates?.[index])) {
    return;
  }
  const updated: Partial<VisualAssetDashboardModel> = {
    ...dashboard,
    candidates,
    updatedAt: now.toISOString()
  };
  const dashboardPath = path.join(workspaceRoot, ...visualAssetDashboardRelativePath.split("/"));
  fs.mkdirSync(path.dirname(dashboardPath), { recursive: true });
  fs.writeFileSync(dashboardPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}

function readDashboard(workspaceRoot: string): Partial<VisualAssetDashboardModel> {
  const dashboardPath = path.join(workspaceRoot, ...visualAssetDashboardRelativePath.split("/"));
  if (!fs.existsSync(dashboardPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(dashboardPath, "utf8")) as Partial<VisualAssetDashboardModel>;
  } catch {
    return {};
  }
}

function summaryForComparison(comparison: VisualAssetComparisonSet, paths = comparisonPaths(comparison.comparisonId)): VisualAssetComparisonSummary {
  const chosen = comparison.comparisonEntries.find((entry) => entry.entryId === comparison.userDecisionSummary.chosenEntryId);
  return {
    comparisonId: comparison.comparisonId,
    assetSlotId: comparison.assetSlotId,
    assetSlotLabel: comparison.assetSlotLabel,
    adapterId: comparison.adapterId,
    surfaceId: comparison.surfaceId,
    status: comparison.status,
    decisionStatus: comparison.userDecisionSummary.status,
    approvedCount: comparison.comparisonEntries.filter((entry) => entry.userMark === "approved").length,
    rejectedCount: comparison.comparisonEntries.filter((entry) => entry.userMark === "rejected").length,
    mixedCount: comparison.comparisonEntries.filter((entry) => entry.userMark === "mixed").length,
    needsRevisionCount: comparison.comparisonEntries.filter((entry) => entry.userMark === "needs_revision").length,
    chosenEntryId: chosen?.entryId,
    chosenAssetPath: chosen?.assetPath,
    assigned: Boolean(comparison.assignedAssetPath),
    manifestApplied: Boolean(comparison.manifestApplySummary?.status === "applied"),
    runtimeApplied: false,
    jsonPath: paths.jsonPath,
    htmlPath: paths.htmlPath,
    createdAt: comparison.createdAt,
    updatedAt: comparison.updatedAt,
    warnings: comparison.warnings,
    errors: comparison.errors
  };
}

function renderVisualAssetContactSheetComparisonHtml(comparison: VisualAssetComparisonSet): string {
  const cards = comparison.comparisonEntries.map((entry) => renderEntryCard(comparison, entry)).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Contact Sheet Comparison</title>
  <style>
    :root{color-scheme:light dark;--bg:#15171c;--panel:#20242b;--line:#3b4350;--text:#f0f3f6;--muted:#aeb7c4;--ok:#8bd78b;--warn:#e6c96b;--bad:#ff8f7e;--blue:#82c7ff}
    *{box-sizing:border-box}body{margin:0;padding:18px;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,sans-serif}h1,h2,h3,p{margin:0}h1{font-size:22px}h2{font-size:16px}h3{font-size:14px}.top{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:16px}.meta,.muted{color:var(--muted);font-size:12px;line-height:1.45}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:14px}.metric,.notice,.card{border:1px solid var(--line);background:var(--panel);border-radius:8px}.metric{padding:10px}.metric b{display:block;font-size:18px}.notice{padding:12px;margin-bottom:12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.card{padding:10px;display:grid;gap:9px}.preview{min-height:150px;border:1px solid var(--line);border-radius:6px;display:grid;place-items:center;background:#101217;overflow:hidden}.preview img{max-width:100%;max-height:144px;image-rendering:auto}.mock{border:1px solid var(--line);border-radius:6px;padding:10px;background:#171b22}.slot{width:124px;height:124px;border:3px solid #a9854d;border-radius:8px;background:#3c2f20;display:grid;place-items:center}.panel{width:150px;height:92px;border:2px solid #7894b8;border-radius:8px;background:#253141;display:grid;place-items:center}.toast{width:156px;height:58px;border:2px solid #cfb25f;border-radius:999px;background:#3d3141;display:grid;place-items:center}.hud{width:174px;height:54px;border:2px solid #618e7e;border-radius:6px;background:#1d3032;display:grid;place-items:center}.bg{width:170px;height:96px;border:2px solid #75808f;background:linear-gradient(135deg,#273042,#152232);display:grid;place-items:center}.impact{width:116px;height:116px;border:2px dashed #d89160;border-radius:999px;background:#271d1b;display:grid;place-items:center}.mock img{max-width:58px;max-height:58px}.badge-row{display:flex;gap:6px;flex-wrap:wrap}.badge{border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:12px;color:var(--muted)}.approved,.valid{color:var(--ok)}.mixed,.needs_revision,.warning,.normalize,.manual_review{color:var(--warn)}.rejected,.invalid,.missing,.failed{color:var(--bad)}.applied,.created{color:var(--blue)}.controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.control{border:1px solid var(--line);border-radius:4px;padding:5px 7px;text-align:center;font-size:12px;color:var(--muted);background:#171b22}.note{min-height:34px;border:1px dashed var(--line);border-radius:4px;padding:7px;color:var(--muted);font-size:12px}ul{margin:0;padding-left:18px}@media(max-width:720px){body{padding:12px}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header class="top">
    <h1>${escapeHtml(comparison.assetSlotLabel)} Contact Sheet Comparison</h1>
    <p class="meta">${escapeHtml(comparison.adapterLabel)} | ${escapeHtml(comparison.surfaceLabel)} | ${escapeHtml(comparison.assetSlotId)} | ${escapeHtml(comparison.createdAt)}</p>
    <p class="meta">Manual comparison only. Approval, rejection, mixed, and revision marks are user decisions recorded in JSON; runtimeApplied remains false.</p>
  </header>
  <section class="summary">
    ${metric("Status", comparison.status)}
    ${metric("Decision", comparison.userDecisionSummary.status)}
    ${metric("Next Action", comparison.userDecisionSummary.nextRecommendedSafeAction)}
    ${metric("Runtime Applied", comparison.userDecisionSummary.runtimeApplied ? "yes" : "no")}
  </section>
  <section class="notice">
    <h2>Context</h2>
    <p class="meta">Current: ${escapeHtml(comparison.currentAssetPath ?? "unknown")}</p>
    <p class="meta">Assigned: ${escapeHtml(comparison.assignedAssetPath ?? "none")}</p>
    <p class="meta">Manifest applied: ${escapeHtml(comparison.manifestAppliedAssetPath ?? "none")}</p>
    <p class="meta">Style guide: ${escapeHtml(comparison.styleGuidePath ?? "none")}</p>
  </section>
  ${comparison.warnings.length > 0 ? `<section class="notice"><h2>Warnings</h2><ul>${comparison.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></section>` : ""}
  ${comparison.errors.length > 0 ? `<section class="notice"><h2>Errors</h2><ul>${comparison.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></section>` : ""}
  <main class="grid">${cards || `<section class="notice">No comparison entries are available.</section>`}</main>
</body>
</html>
`;
}

function renderEntryCard(comparison: VisualAssetComparisonSet, entry: VisualAssetComparisonEntry): string {
  const image = entry.assetPath ? `<img src="${escapeHtml(relativeAssetHref(entry.assetPath))}" alt="${escapeHtml(entry.label)}">` : `<span class="muted">No asset path</span>`;
  const messages = [...entry.warnings.map((warning) => `warning: ${warning}`), ...entry.errors.map((error) => `error: ${error}`)];
  return `<article class="card">
  <div><h3>${escapeHtml(entry.label)}</h3><p class="meta">${escapeHtml(entry.role)} | ${escapeHtml(entry.entryId)}</p></div>
  <div class="badge-row"><span class="badge ${escapeHtml(entry.userMark)}">${escapeHtml(entry.userMark)}</span><span class="badge ${escapeHtml(entry.validationStatus)}">${escapeHtml(entry.validationStatus)}</span><span class="badge ${escapeHtml(entry.boundsStatus ?? "unknown")}">bounds ${escapeHtml(entry.boundsStatus ?? "unknown")}</span><span class="badge ${escapeHtml(entry.manifestStatus ?? "none")}">manifest ${escapeHtml(entry.manifestStatus ?? "none")}</span></div>
  <div class="preview">${image}</div>
  <div class="mock">${renderMockup(comparison.previewMode, image)}</div>
  <p class="meta">dimensions: ${entry.dimensions ? `${entry.dimensions.width} x ${entry.dimensions.height}` : "unknown"} | alpha: ${escapeHtml(entry.transparencyStatus ?? "unknown")}</p>
  <p class="meta">${escapeHtml(entry.assetPath ?? "no path")}</p>
  <div class="controls"><span class="control">Approve</span><span class="control">Reject</span><span class="control">Mixed</span><span class="control">Needs Revision</span></div>
  <div class="note">${escapeHtml(entry.userNote ?? "Use the Asset Pipeline Dashboard to persist marks and notes.")}</div>
  ${messages.length > 0 ? `<ul class="meta">${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}</ul>` : ""}
</article>`;
}

function renderMockup(mode: VisualAssetComparisonPreviewMode, image: string): string {
  if (mode === "slot_card" || mode === "button_icon") {
    return `<div class="slot">${image}</div>`;
  }
  if (mode === "panel") {
    return `<div class="panel">${image}</div>`;
  }
  if (mode === "hud") {
    return `<div class="hud">${image}</div>`;
  }
  if (mode === "reward_toast") {
    return `<div class="toast">${image}</div>`;
  }
  if (mode === "background_readability") {
    return `<div class="bg">${image}</div>`;
  }
  if (mode === "impact_effect") {
    return `<div class="impact">${image}</div>`;
  }
  return `<div class="preview">${image}</div>`;
}

function relativeAssetHref(assetPath: string): string {
  return path.posix.relative(visualAssetContactSheetComparisonRelativeDir, normalizeVisualScopePath(assetPath));
}

function metric(label: string, value: string): string {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
}

function comparisonWarnings(row: VisualAssetDashboardRow, entries: VisualAssetComparisonEntry[]): string[] {
  const warnings: string[] = [];
  if (!row.slot.currentAssetPath) {
    warnings.push("No current/original asset path is known; comparison is candidate-only.");
  }
  if (!entries.some((entry) => entry.role !== "current")) {
    warnings.push("No replacement candidate exists; create/import a candidate before manual comparison.");
  }
  if (row.assignment && !row.assignment.runtimeApplied) {
    warnings.push("Assignment metadata exists, but runtimeApplied is false.");
  }
  if (row.manifestApplyResult && !row.manifestApplyResult.runtimeApplied) {
    warnings.push("Manifest/config apply metadata exists, but runtimeApplied is still false.");
  }
  return warnings;
}

function previewModeForRow(row: VisualAssetDashboardRow): VisualAssetComparisonPreviewMode {
  const text = `${row.slot.surfaceId} ${row.slot.surfaceLabel} ${row.slot.slotLabel} ${row.slot.expectedAssetType}`.toLowerCase();
  if (text.includes("background")) {
    return "background_readability";
  }
  if (text.includes("hud")) {
    return "hud";
  }
  if (text.includes("reward") || text.includes("toast")) {
    return "reward_toast";
  }
  if (text.includes("impact") || text.includes("effect") || text.includes("hit")) {
    return "impact_effect";
  }
  if (text.includes("button") || text.includes("icon")) {
    return "button_icon";
  }
  if (text.includes("panel")) {
    return "panel";
  }
  if (text.includes("slot") || text.includes("card")) {
    return "slot_card";
  }
  return "asset_only";
}

function previewContextForMode(mode: VisualAssetComparisonPreviewMode): VisualAssetComparisonEntry["previewContext"] {
  return {
    mode,
    label: labelForMode(mode),
    limitation: "Static contact-sheet mockup only; this does not run Phaser or prove runtime integration."
  };
}

function labelForMode(mode: VisualAssetComparisonPreviewMode): string {
  if (mode === "slot_card") {
    return "Slot/card frame preview";
  }
  if (mode === "panel") {
    return "Panel preview";
  }
  if (mode === "button_icon") {
    return "Button/icon preview";
  }
  if (mode === "hud") {
    return "HUD preview";
  }
  if (mode === "reward_toast") {
    return "Reward toast preview";
  }
  if (mode === "background_readability") {
    return "Background readability preview";
  }
  if (mode === "impact_effect") {
    return "Impact/effect preview";
  }
  return "Asset-only preview";
}

function assetContractSummary(row: VisualAssetDashboardRow): string | undefined {
  const parts = [
    row.slot.expectedDimensions ? `${row.slot.expectedDimensions.width}x${row.slot.expectedDimensions.height}` : undefined,
    `type ${row.slot.expectedAssetType}`,
    row.slot.transparencyRequired === true ? "alpha required" : row.slot.transparencyRequired === false ? "alpha optional" : undefined,
    row.slot.expectedFileExtensions.join(", ")
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join("; ") : undefined;
}

function preferredApprovedEntry(entries: VisualAssetComparisonEntry[]): VisualAssetComparisonEntry | undefined {
  const roleOrder = ["manifest_applied", "assigned", "normalized_candidate", "imported_candidate", "other", "current", "rejected_reference"];
  return [...entries].sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role))[0];
}

function chooseDefaultMarkEntry(comparison: VisualAssetComparisonSet): string | undefined {
  const candidates = comparison.comparisonEntries.filter((entry) => entry.role !== "current" && entry.role !== "rejected_reference");
  return preferredApprovedEntry(candidates)?.entryId ?? candidates[0]?.entryId ?? comparison.comparisonEntries[0]?.entryId;
}

function dedupeEntries(entries: VisualAssetComparisonEntry[]): VisualAssetComparisonEntry[] {
  const seen = new Set<string>();
  const result: VisualAssetComparisonEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.role}:${entry.assetPath ?? entry.entryId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function comparisonPaths(comparisonId: string): { jsonPath: string; htmlPath: string } {
  const id = safeId(comparisonId);
  return {
    jsonPath: `${visualAssetContactSheetComparisonRelativeDir}/${id}.json`,
    htmlPath: `${visualAssetContactSheetComparisonRelativeDir}/${id}.html`
  };
}

function safeWorkspaceLabel(workspaceRoot: string): string | undefined {
  const label = path.basename(workspaceRoot);
  return label && label !== "." ? label : undefined;
}

function safeId(value: string): string {
  return normalizeVisualScopePath(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function mergeById<T>(existing: T[], patch: T[], id: (value: T) => string): T[] {
  const values = new Map(existing.map((entry) => [id(entry), entry]));
  for (const entry of patch) {
    values.set(id(entry), entry);
  }
  return Array.from(values.values()).sort((a, b) => id(a).localeCompare(id(b)));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
