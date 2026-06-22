import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { ensureProfile, openTextDocument, requireWorkspaceFolder } from "../core/workspace";

export async function initializeProfile(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.initializeProfile", folder.uri.fsPath);

  try {
    const result = await ensureProfile(folder);
    const message = result.created
      ? "Game Polish Lab profile created."
      : "Game Polish Lab profile already exists.";
    logInfo(`profile file: ${result.uri.fsPath}`);
    logInfo(`profile created: ${String(result.created)}`);
    vscode.window.showInformationMessage(message);
    await openTextDocument(result.uri);
  } catch (error) {
    logError("initialize profile failed:", error);
    vscode.window.showErrorMessage(`Failed to initialize Game Polish Lab profile: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.initializeProfile");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
