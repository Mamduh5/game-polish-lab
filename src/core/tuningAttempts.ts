import * as vscode from "vscode";

import {
  buildVisualTuningAttemptIndex,
  createVisualTuningAttempt,
  CreateVisualTuningAttemptInput,
  extractFieldNoteTreatmentSummary,
  fieldNoteGuidanceForFallback,
  isResultStatus,
  queryAttemptIndex,
  renderVisualTuningFieldNote,
  safeAttemptRelativePath,
  updateAttemptResultModel
} from "./tuningAttemptModel";
import { ensureDirectory, labUri, pathExists, readJsonFileIfExists, readTextFileIfExists, writeJsonFile, writeTextFile } from "./workspace";
import { VisualSurfaceType } from "../types/visualSurface";
import {
  FieldNoteTreatmentSummary,
  VisualTuningAttempt,
  VisualTuningAttemptIndex,
  VisualTuningResultStatus
} from "../types/visualTuningAttempt";

export interface StoredVisualTuningAttempt {
  attempt: VisualTuningAttempt;
  attemptPath: string;
  uri: vscode.Uri;
}

export async function createTuningAttempt(folder: vscode.WorkspaceFolder, input: CreateVisualTuningAttemptInput): Promise<StoredVisualTuningAttempt> {
  const attempt = createVisualTuningAttempt(input);
  const createdAt = new Date(attempt.createdAt);
  const attemptPath = safeAttemptRelativePath(createdAt, attempt.surfaceType, attempt.targetLabel ?? attempt.targetId, attempt.attemptId);
  const fileName = attemptPath.split("/").pop()!;
  await ensureDirectory(labUri(folder, "tuning-attempts"));
  const uri = labUri(folder, "tuning-attempts", fileName);
  if (await pathExists(uri)) {
    throw new Error(`Tuning attempt path already exists: ${attemptPath}`);
  }
  await writeJsonFile(uri, attempt);
  await rebuildTuningAttemptIndex(folder);
  return { attempt, attemptPath, uri };
}

export async function loadTuningAttempt(folder: vscode.WorkspaceFolder, attemptPath: string): Promise<VisualTuningAttempt | undefined> {
  const fileName = attemptPath.split("/").pop();
  if (!fileName) {
    return undefined;
  }
  return readJsonFileIfExists<VisualTuningAttempt>(labUri(folder, "tuning-attempts", fileName));
}

export async function loadTuningAttemptIndex(folder: vscode.WorkspaceFolder): Promise<VisualTuningAttemptIndex> {
  const existing = await readJsonFileIfExists<VisualTuningAttemptIndex>(labUri(folder, "tuning-attempts", "index.json"));
  return existing ?? { schemaVersion: "visual-tuning-attempt-index/v1", updatedAt: new Date(0).toISOString(), attempts: [] };
}

export async function rebuildTuningAttemptIndex(folder: vscode.WorkspaceFolder): Promise<VisualTuningAttemptIndex> {
  await ensureDirectory(labUri(folder, "tuning-attempts"));
  const attemptFolder = labUri(folder, "tuning-attempts");
  const entries = await vscode.workspace.fs.readDirectory(attemptFolder);
  const attempts: Array<{ attempt: VisualTuningAttempt; attemptPath: string }> = [];
  for (const [fileName, fileType] of entries) {
    if (fileType !== vscode.FileType.File || fileName === "index.json" || !fileName.endsWith(".json")) {
      continue;
    }
    const attempt = await readJsonFileIfExists<VisualTuningAttempt>(labUri(folder, "tuning-attempts", fileName));
    if (attempt?.schemaVersion === "visual-tuning-attempt/v1") {
      attempts.push({ attempt, attemptPath: `.game-polish-lab/tuning-attempts/${fileName}` });
    }
  }
  const index = buildVisualTuningAttemptIndex(attempts);
  await writeJsonFile(labUri(folder, "tuning-attempts", "index.json"), index);
  return index;
}

export async function updateTuningAttemptResult(
  folder: vscode.WorkspaceFolder,
  attemptPath: string,
  resultStatus: VisualTuningResultStatus,
  note?: string
): Promise<StoredVisualTuningAttempt> {
  if (!isResultStatus(resultStatus)) {
    throw new Error(`Invalid tuning result status: ${resultStatus}`);
  }
  const attempt = await loadTuningAttempt(folder, attemptPath);
  if (!attempt) {
    throw new Error(`Tuning attempt not found: ${attemptPath}`);
  }
  const updated = updateAttemptResultModel(attempt, resultStatus, note);
  const fileName = attemptPath.split("/").pop()!;
  const uri = labUri(folder, "tuning-attempts", fileName);
  await writeJsonFile(uri, updated);
  await rebuildTuningAttemptIndex(folder);
  await appendTuningFieldNote(folder, updated, attemptPath, note);
  return { attempt: updated, attemptPath, uri };
}

export async function findLatestTuningAttempt(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
  const index = await loadTuningAttemptIndex(folder);
  const unreviewed = index.attempts.find((entry) => entry.resultStatus === "unreviewed");
  return unreviewed?.attemptPath ?? index.attempts[0]?.attemptPath;
}

export async function queryTuningAttempts(folder: vscode.WorkspaceFolder, query: Parameters<typeof queryAttemptIndex>[1]): Promise<ReturnType<typeof queryAttemptIndex>> {
  return queryAttemptIndex(await loadTuningAttemptIndex(folder), query);
}

export async function getTreatmentSummary(folder: vscode.WorkspaceFolder, query: { surfaceType?: VisualSurfaceType; adapterId?: string; targetId?: string; targetLabel?: string; presetName?: string; recipeId?: string }): Promise<FieldNoteTreatmentSummary> {
  return extractFieldNoteTreatmentSummary(await loadTuningAttemptIndex(folder), query);
}

export async function getFallbackFieldNoteGuidance(folder: vscode.WorkspaceFolder, query: { surfaceType?: VisualSurfaceType; adapterId?: string; targetId?: string; targetLabel?: string; presetName?: string; recipeId?: string }): Promise<{ preserve: string[]; avoid: string[]; mixed: string[] }> {
  return fieldNoteGuidanceForFallback(await loadTuningAttemptIndex(folder), query);
}

export async function appendTuningFieldNote(folder: vscode.WorkspaceFolder, attempt: VisualTuningAttempt, attemptPath: string, note?: string): Promise<vscode.Uri> {
  await ensureDirectory(labUri(folder));
  const uri = labUri(folder, "field-notes.md");
  const existing = await readTextFileIfExists(uri);
  const entry = renderVisualTuningFieldNote(attempt, attemptPath, note);
  await writeTextFile(uri, existing ? `${existing.trimEnd()}\n\n${entry}` : `# Game Polish Lab Field Notes\n\n${entry}`);
  return uri;
}
