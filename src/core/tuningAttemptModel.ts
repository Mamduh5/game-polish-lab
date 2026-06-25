import { VisualSurfaceType } from "../types/visualSurface";
import {
  FieldNoteTreatmentSummary,
  VisualTuningApplyMode,
  VisualTuningAttempt,
  VisualTuningAttemptIndex,
  VisualTuningAttemptIndexEntry,
  VisualTuningConnectionState,
  VisualTuningResultStatus
} from "../types/visualTuningAttempt";

export const visualTuningResultStatuses: VisualTuningResultStatus[] = ["unreviewed", "better", "worse", "same", "mixed"];
export const visualTuningApplyModes: VisualTuningApplyMode[] = ["direct_apply", "config_only", "asset_copy", "fallback_task", "preview_only"];
export const visualTuningConnectionStates: VisualTuningConnectionState[] = ["connected", "not_connected", "unknown", "not_applicable"];

export interface CreateVisualTuningAttemptInput {
  createdAt?: Date;
  attemptId?: string;
  adapterId: string;
  surfaceType: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  recipeId?: string;
  configPath?: string;
  generatedStyleModulePath?: string;
  assetPath?: string;
  fallbackTaskPath?: string;
  presetName?: string;
  styleSnapshot?: unknown;
  changedTokens?: string[];
  applyMode: VisualTuningApplyMode;
  connectionState: VisualTuningConnectionState;
  scopeSummary?: string;
  rollbackPaths?: string[];
  manualChecklist?: string[];
  resultNotes?: string[];
  tags?: string[];
  warnings?: string[];
}

export interface AttemptQuery {
  surfaceType?: VisualSurfaceType;
  adapterId?: string;
  targetId?: string;
  targetLabel?: string;
  resultStatus?: VisualTuningResultStatus;
  presetName?: string;
  recipeId?: string;
}

export function createVisualTuningAttempt(input: CreateVisualTuningAttemptInput): VisualTuningAttempt {
  const createdAt = input.createdAt ?? new Date();
  const attemptId = input.attemptId ?? createAttemptId(createdAt);
  const changedTokens = input.changedTokens ?? inferChangedTokens(input.styleSnapshot);
  return {
    schemaVersion: "visual-tuning-attempt/v1",
    attemptId,
    createdAt: createdAt.toISOString(),
    adapterId: input.adapterId,
    surfaceType: input.surfaceType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    recipeId: input.recipeId,
    configPath: input.configPath,
    generatedStyleModulePath: input.generatedStyleModulePath,
    assetPath: input.assetPath,
    fallbackTaskPath: input.fallbackTaskPath,
    presetName: input.presetName,
    styleSnapshot: input.styleSnapshot,
    styleValueSummary: summarizeStyleValues(input.styleSnapshot),
    changedTokens,
    applyMode: input.applyMode,
    connectionState: input.connectionState,
    scopeSummary: input.scopeSummary ?? summarizeScope(input),
    rollbackPaths: input.rollbackPaths ?? [],
    manualChecklist: input.manualChecklist ?? [],
    resultStatus: "unreviewed",
    resultNotes: input.resultNotes ?? [],
    tags: input.tags ?? [],
    warnings: input.warnings ?? []
  };
}

export function validateVisualTuningAttempt(value: unknown): { ok: boolean; errors: string[] } {
  const attempt = value as Partial<VisualTuningAttempt>;
  const errors: string[] = [];
  if (!attempt || typeof attempt !== "object") {
    return { ok: false, errors: ["attempt must be an object"] };
  }
  if (attempt.schemaVersion !== "visual-tuning-attempt/v1") {
    errors.push("schemaVersion must be visual-tuning-attempt/v1");
  }
  if (!attempt.attemptId) {
    errors.push("attemptId is required");
  }
  if (!attempt.createdAt) {
    errors.push("createdAt is required");
  }
  if (!attempt.adapterId) {
    errors.push("adapterId is required");
  }
  if (!attempt.surfaceType) {
    errors.push("surfaceType is required");
  }
  if (!isResultStatus(attempt.resultStatus)) {
    errors.push("resultStatus is invalid");
  }
  if (!isApplyMode(attempt.applyMode)) {
    errors.push("applyMode is invalid");
  }
  if (!isConnectionState(attempt.connectionState)) {
    errors.push("connectionState is invalid");
  }
  if (!Array.isArray(attempt.changedTokens)) {
    errors.push("changedTokens must be an array");
  }
  if (!Array.isArray(attempt.rollbackPaths)) {
    errors.push("rollbackPaths must be an array");
  }
  if (!Array.isArray(attempt.manualChecklist)) {
    errors.push("manualChecklist must be an array");
  }
  if (!Array.isArray(attempt.resultNotes)) {
    errors.push("resultNotes must be an array");
  }
  if (!Array.isArray(attempt.tags)) {
    errors.push("tags must be an array");
  }
  if (!Array.isArray(attempt.warnings)) {
    errors.push("warnings must be an array");
  }
  return { ok: errors.length === 0, errors };
}

export function safeAttemptRelativePath(date: Date, surfaceType: VisualSurfaceType, targetLabel?: string, attemptId?: string): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  const suffix = attemptId ? `-${safePathSegment(attemptId).slice(-8)}` : "";
  return `.game-polish-lab/tuning-attempts/${timestamp}-${surfaceType}-${safePathSegment(targetLabel ?? "target")}${suffix}.json`;
}

export function buildVisualTuningAttemptIndex(attempts: Array<{ attempt: VisualTuningAttempt; attemptPath: string }>, updatedAt = new Date()): VisualTuningAttemptIndex {
  return {
    schemaVersion: "visual-tuning-attempt-index/v1",
    updatedAt: updatedAt.toISOString(),
    attempts: attempts
      .map(({ attempt, attemptPath }) => toIndexEntry(attempt, attemptPath))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

export function updateAttemptResultModel(attempt: VisualTuningAttempt, resultStatus: VisualTuningResultStatus, note?: string, updatedAt = new Date()): VisualTuningAttempt {
  if (!isResultStatus(resultStatus)) {
    throw new Error(`Invalid tuning result status: ${resultStatus}`);
  }
  const resultNotes = note?.trim() ? [...attempt.resultNotes, note.trim()] : [...attempt.resultNotes];
  return {
    ...attempt,
    updatedAt: updatedAt.toISOString(),
    resultStatus,
    resultNotes
  };
}

export function queryAttemptIndex(index: VisualTuningAttemptIndex, query: AttemptQuery): VisualTuningAttemptIndexEntry[] {
  return index.attempts.filter((entry) => {
    if (query.surfaceType && entry.surfaceType !== query.surfaceType) {
      return false;
    }
    if (query.adapterId && entry.adapterId !== query.adapterId) {
      return false;
    }
    if (query.targetId && entry.targetId !== query.targetId) {
      return false;
    }
    if (query.targetLabel && normalizeComparable(entry.targetLabel) !== normalizeComparable(query.targetLabel)) {
      return false;
    }
    if (query.resultStatus && entry.resultStatus !== query.resultStatus) {
      return false;
    }
    if (query.presetName && normalizeComparable(entry.presetName) !== normalizeComparable(query.presetName)) {
      return false;
    }
    if (query.recipeId && entry.recipeId !== query.recipeId) {
      return false;
    }
    return true;
  });
}

export function extractFieldNoteTreatmentSummary(index: VisualTuningAttemptIndex, query: Omit<AttemptQuery, "resultStatus">): FieldNoteTreatmentSummary {
  const matches = queryAttemptIndex(index, query);
  const knownGood = matches.filter((entry) => entry.resultStatus === "better");
  const knownBad = matches.filter((entry) => entry.resultStatus === "worse");
  const noMeaningfulEffect = matches.filter((entry) => entry.resultStatus === "same");
  const mixed = matches.filter((entry) => entry.resultStatus === "mixed");
  return {
    knownGood,
    knownBad,
    noMeaningfulEffect,
    mixed,
    warnings: [
      ...knownBad.map((entry) => formatKnownBadWarning(entry)),
      ...noMeaningfulEffect.map((entry) => formatSameWarning(entry)),
      ...mixed.map((entry) => formatMixedWarning(entry))
    ],
    successes: knownGood.map((entry) => formatKnownGoodSuccess(entry))
  };
}

export function fieldNoteGuidanceForFallback(index: VisualTuningAttemptIndex, query: Omit<AttemptQuery, "resultStatus">): { preserve: string[]; avoid: string[]; mixed: string[] } {
  const summary = extractFieldNoteTreatmentSummary(index, query);
  return {
    preserve: summary.knownGood.map((entry) => describeAttemptEntry(entry)),
    avoid: [
      ...summary.knownBad.map((entry) => describeAttemptEntry(entry)),
      ...summary.noMeaningfulEffect.map((entry) => `${describeAttemptEntry(entry)} had no meaningful effect`)
    ],
    mixed: summary.mixed.map((entry) => describeAttemptEntry(entry))
  };
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, "\\$1");
}

export function renderVisualTuningFieldNote(attempt: VisualTuningAttempt, attemptPath: string, note?: string): string {
  const links = [
    attempt.configPath ? `config: \`${attempt.configPath}\`` : undefined,
    attempt.assetPath ? `asset: \`${attempt.assetPath}\`` : undefined,
    attempt.fallbackTaskPath ? `fallback: \`${attempt.fallbackTaskPath}\`` : undefined,
    attempt.rollbackPaths.length > 0 ? `rollback: ${attempt.rollbackPaths.map((item) => `\`${item}\``).join(", ")}` : undefined,
    `attempt: \`${attemptPath}\``
  ].filter((value): value is string => Boolean(value));
  const warnings = attempt.warnings.length > 0 ? attempt.warnings.join("; ") : "none";
  const userNote = note?.trim() || attempt.resultNotes[attempt.resultNotes.length - 1] || "none";
  return [
    `## ${attempt.updatedAt ?? attempt.createdAt} - ${attempt.surfaceType}`,
    "",
    `- Adapter: ${escapeMarkdown(attempt.adapterId)}`,
    `- Target: ${escapeMarkdown(attempt.targetLabel ?? attempt.targetId ?? "target")}`,
    `- Result: ${attempt.resultStatus}`,
    `- Preset/style: ${escapeMarkdown(attempt.presetName ?? attempt.styleValueSummary ?? "custom")}`,
    `- User note: ${escapeMarkdown(userNote)}`,
    `- Warning/lesson: ${escapeMarkdown(warnings)}`,
    `- Paths: ${links.join("; ")}`,
    ""
  ].join("\n");
}

export function isResultStatus(value: unknown): value is VisualTuningResultStatus {
  return typeof value === "string" && visualTuningResultStatuses.includes(value as VisualTuningResultStatus);
}

function isApplyMode(value: unknown): value is VisualTuningApplyMode {
  return typeof value === "string" && visualTuningApplyModes.includes(value as VisualTuningApplyMode);
}

function isConnectionState(value: unknown): value is VisualTuningConnectionState {
  return typeof value === "string" && visualTuningConnectionStates.includes(value as VisualTuningConnectionState);
}

function toIndexEntry(attempt: VisualTuningAttempt, attemptPath: string): VisualTuningAttemptIndexEntry {
  return {
    attemptId: attempt.attemptId,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
    adapterId: attempt.adapterId,
    surfaceType: attempt.surfaceType,
    targetId: attempt.targetId,
    targetLabel: attempt.targetLabel,
    resultStatus: attempt.resultStatus,
    presetName: attempt.presetName,
    recipeId: attempt.recipeId,
    attemptPath,
    configPath: attempt.configPath,
    fallbackTaskPath: attempt.fallbackTaskPath
  };
}

function createAttemptId(date: Date): string {
  return `attempt-${date.toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferChangedTokens(snapshot: unknown): string[] {
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? Object.keys(snapshot as Record<string, unknown>).sort() : [];
}

function summarizeStyleValues(snapshot: unknown): string | undefined {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return undefined;
  }
  const entries = Object.entries(snapshot as Record<string, unknown>);
  return entries.slice(0, 8).map(([key, value]) => `${key}=${String(value)}`).join(", ");
}

function summarizeScope(input: CreateVisualTuningAttemptInput): string {
  const paths = [
    input.configPath,
    input.generatedStyleModulePath,
    input.assetPath,
    input.fallbackTaskPath,
    ...(input.rollbackPaths ?? [])
  ].filter((value): value is string => Boolean(value));
  return paths.length > 0 ? paths.join(", ") : "preview/config metadata only";
}

function safePathSegment(value: string): string {
  return (value || "target").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "target";
}

function normalizeComparable(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function formatKnownBadWarning(entry: VisualTuningAttemptIndexEntry): string {
  return `Previous field notes marked ${describeAttemptEntry(entry)} worse. Warn before reusing it.`;
}

function formatSameWarning(entry: VisualTuningAttemptIndexEntry): string {
  return `Previous field notes marked ${describeAttemptEntry(entry)} same/no meaningful improvement.`;
}

function formatMixedWarning(entry: VisualTuningAttemptIndexEntry): string {
  return `Previous field notes marked ${describeAttemptEntry(entry)} mixed. Preserve the useful parts and avoid the bad parts.`;
}

function formatKnownGoodSuccess(entry: VisualTuningAttemptIndexEntry): string {
  return `Previous field notes marked ${describeAttemptEntry(entry)} better.`;
}

function describeAttemptEntry(entry: VisualTuningAttemptIndexEntry): string {
  const preset = entry.presetName ? `${entry.presetName} on ` : "";
  return `${preset}${entry.surfaceType}${entry.targetLabel ? `/${entry.targetLabel}` : ""}`;
}
