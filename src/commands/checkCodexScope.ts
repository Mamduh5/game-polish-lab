import * as vscode from "vscode";

import { checkChangedFilesAgainstTask, getGitChangedFiles } from "../core/scopeGuard";
import { labUri, readJsonFileIfExists, requireWorkspaceFolder } from "../core/workspace";
import { PolishTask } from "../types/polishTask";

export async function checkCodexScope(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }

  try {
    const task = await readLatestTask(folder);
    if (!task) {
      vscode.window.showErrorMessage("No Game Polish Lab task JSON files found. Create a polish task first.");
      return;
    }

    let changedFiles: string[];
    try {
      changedFiles = await getGitChangedFiles(folder);
    } catch {
      vscode.window.showWarningMessage("Could not run `git diff --name-only`. Is this workspace a git repository with git available on PATH?");
      return;
    }

    if (changedFiles.length === 0) {
      vscode.window.showInformationMessage("No changed files found in git diff.");
      return;
    }

    const result = checkChangedFilesAgainstTask(changedFiles, task);
    if (result.ok) {
      vscode.window.showInformationMessage(result.message);
      return;
    }

    const details = [
      ...result.mustNotTouchFiles.map((file) => `must-not-touch: ${file}`),
      ...result.outsideAllowedFiles.map((file) => `outside allowed files: ${file}`)
    ].slice(0, 8).join("; ");

    vscode.window.showWarningMessage(`${result.message} ${details}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to check Codex scope: ${errorToMessage(error)}`);
  }
}

async function readLatestTask(folder: vscode.WorkspaceFolder): Promise<PolishTask | undefined> {
  const tasksFolder = labUri(folder, "tasks");
  let entries: [string, vscode.FileType][];

  try {
    entries = await vscode.workspace.fs.readDirectory(tasksFolder);
  } catch {
    return undefined;
  }

  const taskNames = entries
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith(".json"))
    .map(([name]) => name)
    .sort((a, b) => b.localeCompare(a));

  const latestName = taskNames[0];
  if (!latestName) {
    return undefined;
  }

  return readJsonFileIfExists<PolishTask>(labUri(folder, "tasks", latestName));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
