import * as vscode from "vscode";

import { readFieldNotes } from "../core/fieldNotes";
import { buildCodexPrompt } from "../core/promptBuilder";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { ensureDirectory, ensureProfile, labUri, openTextDocument, readJsonFileIfExists, requireWorkspaceFolder, writeTextFile } from "../core/workspace";
import { PolishTask } from "../types/polishTask";

export async function generateCodexPrompt(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.generateCodexPrompt", folder.uri.fsPath);

  try {
    const { profile } = await ensureProfile(folder);
    const taskUri = await pickTaskFile(folder);
    if (!taskUri) {
      return;
    }

    const task = await readJsonFileIfExists<PolishTask>(taskUri);
    if (!task) {
      vscode.window.showErrorMessage("Selected polish task could not be read.");
      return;
    }

    const prompt = buildCodexPrompt(task, {
      requiresApprovalBeforePatch: profile.codexRequiresApprovalBeforePatch,
      fieldNotes: await readFieldNotes(folder)
    });
    const promptUri = labUri(folder, "prompts", "latest-codex-prompt.md");
    await ensureDirectory(labUri(folder, "prompts"));
    await writeTextFile(promptUri, prompt);
    await vscode.env.clipboard.writeText(prompt);
    logInfo(`prompt created: ${promptUri.fsPath}`);
    logInfo(`prompt copied to clipboard; approval required: ${String(profile.codexRequiresApprovalBeforePatch)}`);
    vscode.window.showInformationMessage("Game Polish Lab Codex prompt generated and copied to clipboard.");
    await openTextDocument(promptUri);
  } catch (error) {
    logError("generate Codex prompt failed:", error);
    vscode.window.showErrorMessage(`Failed to generate Codex prompt: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.generateCodexPrompt");
  }
}

async function pickTaskFile(folder: vscode.WorkspaceFolder): Promise<vscode.Uri | undefined> {
  const tasksFolder = labUri(folder, "tasks");
  let entries: [string, vscode.FileType][];

  try {
    entries = await vscode.workspace.fs.readDirectory(tasksFolder);
  } catch {
    vscode.window.showErrorMessage("No Game Polish Lab task folder found. Create a polish task first.");
    return undefined;
  }

  const tasks = entries
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith(".json"))
    .sort(([a], [b]) => a.localeCompare(b));

  if (tasks.length === 0) {
    vscode.window.showErrorMessage("No Game Polish Lab task JSON files found. Create a polish task first.");
    return undefined;
  }

  const picked = await vscode.window.showQuickPick(
    tasks.map(([name]) => ({
      label: name,
      uri: labUri(folder, "tasks", name)
    })),
    { placeHolder: "Choose a polish task" }
  );

  return picked?.uri;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
