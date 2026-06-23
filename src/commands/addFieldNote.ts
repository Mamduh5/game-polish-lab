import * as vscode from "vscode";

import { appendFieldNote } from "../core/fieldNotes";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";

export async function addFieldNote(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.addFieldNote", folder.uri.fsPath);

  try {
    const note = await vscode.window.showInputBox({
      title: "Game Polish Lab Field Note",
      prompt: "Record a project-specific visual lesson future prompts should include.",
      placeHolder: "Cursor attack skins get worse when shared flash/particles are globally boosted."
    });
    if (!note) {
      return;
    }

    const uri = await appendFieldNote(folder, note);
    logInfo(`field note added: ${uri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab field note added.");
    await openTextDocument(uri);
  } catch (error) {
    logError("add field note failed:", error);
    vscode.window.showErrorMessage(`Failed to add Game Polish Lab field note: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.addFieldNote");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
