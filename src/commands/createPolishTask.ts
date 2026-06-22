import * as vscode from "vscode";

import { ensureProfile, ensureDirectory, labUri, openTextDocument, requireWorkspaceFolder, writeJsonFile } from "../core/workspace";
import { polishPresets } from "../presets/polishPresets";
import { PolishPreset, PolishTask } from "../types/polishTask";

export async function createPolishTask(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }

  const picked = await vscode.window.showQuickPick(
    polishPresets.map((preset) => ({
      label: preset.label,
      description: preset.id,
      detail: preset.description,
      preset
    })),
    { placeHolder: "Choose a polish task preset" }
  );

  if (!picked) {
    return;
  }

  const problem = await vscode.window.showInputBox({
    title: "Describe the polish problem",
    prompt: "Keep it short and specific.",
    placeHolder: "Example: Hits land but enemies do not visibly react."
  });

  if (!problem) {
    vscode.window.showInformationMessage("Polish task creation cancelled.");
    return;
  }

  try {
    const { profile } = await ensureProfile(folder);
    const tasksFolder = labUri(folder, "tasks");
    await ensureDirectory(tasksFolder);

    const fileName = await nextTaskFileName(tasksFolder, picked.preset);
    const task = buildTask(picked.preset, problem, profile.defaultMustNotTouch, fileName);
    const taskUri = labUri(folder, "tasks", fileName);

    await writeJsonFile(taskUri, task);
    vscode.window.showInformationMessage(`Game Polish Lab task created: ${fileName}`);
    await openTextDocument(taskUri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create polish task: ${errorToMessage(error)}`);
  }
}

async function nextTaskFileName(tasksFolder: vscode.Uri, preset: PolishPreset): Promise<string> {
  let highest = 0;
  try {
    const entries = await vscode.workspace.fs.readDirectory(tasksFolder);
    for (const [name] of entries) {
      const match = /^(\d+)-.+\.json$/.exec(name);
      if (match) {
        highest = Math.max(highest, Number(match[1]));
      }
    }
  } catch {
    // Directory is created by caller; ignore transient read errors and start at 1.
  }

  const nextNumber = String(highest + 1).padStart(3, "0");
  return `${nextNumber}-${preset.id.replace(/_/g, "-")}.json`;
}

function buildTask(preset: PolishPreset, problem: string, profileMustNotTouch: string[], fileName: string): PolishTask {
  const id = fileName.replace(/\.json$/, "");
  const mustNotTouch = Array.from(new Set([...preset.suggestedMustNotTouchFiles, ...profileMustNotTouch]));

  return {
    schemaVersion: 1,
    id,
    presetId: preset.id,
    label: preset.label,
    engine: "phaser",
    style: "pixel_art",
    problem,
    area: preset.defaultArea,
    targetFeel: preset.defaultTargetFeel,
    allowedFiles: preset.suggestedAllowedFiles,
    mustNotTouch,
    acceptanceCriteria: preset.acceptanceCriteria,
    tunableValues: preset.tunableValues,
    createdAt: new Date().toISOString()
  };
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
