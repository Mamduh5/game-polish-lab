import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { clearScanCache } from "../core/workspaceScanner";
import { ensureProfile, requireWorkspaceFolder, writeJsonFile } from "../core/workspace";
import { PerformanceMode } from "../types/profile";

const modeItems: Array<{ label: string; description: string; mode: PerformanceMode }> = [
  { label: "Safe", description: "fastest, recommended for slower PCs", mode: "safe" },
  { label: "Balanced", description: "more complete scan", mode: "balanced" },
  { label: "Deep", description: "slower, for troubleshooting only", mode: "deep" }
];

export async function setPerformanceMode(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.setPerformanceMode", folder.uri.fsPath);

  try {
    const profileResult = await ensureProfile(folder);
    const picked = await vscode.window.showQuickPick(modeItems, {
      placeHolder: "Choose Game Polish Lab performance mode"
    });
    if (!picked) {
      return;
    }

    const profile = {
      ...profileResult.profile,
      performanceMode: picked.mode
    };
    await writeJsonFile(profileResult.uri, profile);
    clearScanCache();
    logInfo(`performance mode set to ${picked.mode}; scan cache cleared.`);
    vscode.window.showInformationMessage(`Game Polish Lab performance mode set to ${picked.label}.`);
  } catch (error) {
    logError("set performance mode failed:", error);
    vscode.window.showErrorMessage(`Failed to set Game Polish Lab performance mode: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.setPerformanceMode");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
