import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logInfo } from "../core/output";
import { clearScanCache } from "../core/workspaceScanner";
import { requireWorkspaceFolder } from "../core/workspace";

export function clearCache(): void {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.clearCache", folder.uri.fsPath);
  clearScanCache();
  logInfo("scan cache cleared.");
  vscode.window.showInformationMessage("Game Polish Lab scan cache cleared.");
  logCommandEnd("gamePolishLab.clearCache");
}
