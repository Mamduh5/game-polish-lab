import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo, logWarn } from "../core/output";
import { checkChangedFilesAgainstTask, getGitChangedFiles, renderScopeCheckMarkdown } from "../core/scopeGuard";
import { ensureDirectory, labUri, readJsonFileIfExists, requireWorkspaceFolder, writeTextFile } from "../core/workspace";
import { PolishTask } from "../types/polishTask";

export async function checkCodexScope(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.checkCodexScope", folder.uri.fsPath);

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
      logWarn("git diff --name-only failed.");
      vscode.window.showWarningMessage("Could not run `git diff --name-only`. Is this workspace a git repository with git available on PATH?");
      return;
    }

    if (changedFiles.length === 0) {
      logInfo("scope check: no changed files found.");
      vscode.window.showInformationMessage("No changed files found in git diff.");
      return;
    }

    const result = checkChangedFilesAgainstTask(changedFiles, task);
    const reportUri = labUri(folder, "audits", "latest-scope-check.md");
    await ensureDirectory(labUri(folder, "audits"));
    await writeTextFile(reportUri, renderScopeCheckMarkdown(task, result));
    logInfo(`scope check report created: ${reportUri.fsPath}`);
    logInfo(`scope check results: allowed=${result.allowedChanges.length}; suspicious=${result.suspiciousChanges.length}; forbidden=${result.forbiddenChanges.length}`);

    if (result.ok) {
      vscode.window.showInformationMessage(result.message);
      return;
    }

    const details = [
      ...result.forbiddenChanges.map((file) => `forbidden: ${file}`),
      ...result.suspiciousChanges.map((file) => `suspicious: ${file}`)
    ].slice(0, 8).join("; ");

    vscode.window.showWarningMessage(`${result.message} ${details}`);
  } catch (error) {
    logError("check Codex scope failed:", error);
    vscode.window.showErrorMessage(`Failed to check Codex scope: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.checkCodexScope");
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
    .map(([name]) => name);

  const tasks = (await Promise.all(taskNames.map(async (name) => {
    const task = await readJsonFileIfExists<PolishTask>(labUri(folder, "tasks", name));
    return task ? { name, task } : undefined;
  }))).filter((entry): entry is { name: string; task: PolishTask } => Boolean(entry));

  tasks.sort((a, b) => {
    const numberDiff = taskNumber(b.name) - taskNumber(a.name);
    if (numberDiff !== 0) {
      return numberDiff;
    }
    return Date.parse(b.task.createdAt) - Date.parse(a.task.createdAt);
  });

  return tasks[0]?.task;
}

function taskNumber(name: string): number {
  const match = /^(\d+)-/.exec(name);
  return match ? Number(match[1]) : 0;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
