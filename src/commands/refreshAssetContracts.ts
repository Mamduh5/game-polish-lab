import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { refreshVisualAssetContracts } from "../core/visualAssetContracts";
import { requireWorkspaceFolder, toWorkspaceRelativePath } from "../core/workspace";

export async function refreshAssetContracts(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.refreshAssetContracts", folder.uri.fsPath);
  try {
    const result = await refreshVisualAssetContracts(folder.uri.fsPath);
    const relativePath = toWorkspaceRelativePath(folder, vscode.Uri.file(result.path));
    const counts = result.statusCounts;
    const summary = `Asset contracts refreshed: ${relativePath} | valid ${counts.valid}, warnings ${counts.warning}, invalid ${counts.invalid}, missing ${counts.missing}, unknown ${counts.unknown}`;
    logInfo(summary);
    for (const warning of result.warnings) {
      logInfo(`asset contract warning: ${warning}`);
    }
    vscode.window.showInformationMessage(summary);
  } catch (error) {
    logError("refresh asset contracts failed:", error);
    vscode.window.showErrorMessage(`Failed to refresh asset contracts: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.refreshAssetContracts");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
