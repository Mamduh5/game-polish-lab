import * as vscode from "vscode";

import { ensureProfile, openTextDocument, requireWorkspaceFolder } from "../core/workspace";

export async function initializeProfile(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }

  try {
    const result = await ensureProfile(folder);
    const message = result.created
      ? "Game Polish Lab profile created."
      : "Game Polish Lab profile already exists.";
    vscode.window.showInformationMessage(message);
    await openTextDocument(result.uri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to initialize Game Polish Lab profile: ${errorToMessage(error)}`);
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
