import * as vscode from "vscode";

import { createOptionalPolishDevOverlaySpike, polishDevOverlayRelativeDir, polishDevOverlayReadmeRelativePath } from "../core/visualDevOverlay";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";

const approvalLabel = "Create Overlay Spike";

export async function createOptionalDevOverlaySpike(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createOptionalDevOverlaySpike", folder.uri.fsPath);

  try {
    const approval = await vscode.window.showWarningMessage(
      "Create experimental developer-only Game Polish Lab overlay files under .game-polish-lab/dev-overlay? This does not inject game entry files and remains inert unless the game is opened with ?polish=1.",
      { modal: true },
      approvalLabel
    );
    if (approval !== approvalLabel) {
      logInfo("optional dev overlay spike cancelled before writing files.");
      vscode.window.showInformationMessage("Game Polish Lab dev overlay spike cancelled. No files were written.");
      return;
    }

    const result = createOptionalPolishDevOverlaySpike(folder.uri.fsPath, true);
    if (!result.result?.ok) {
      const message = result.result?.errors.join(" ") || result.plan?.blockingReasons.join(" ") || "Dev overlay spike was blocked.";
      vscode.window.showErrorMessage(`Game Polish Lab dev overlay spike blocked: ${message}`);
      return;
    }

    logInfo(`optional dev overlay files written: ${result.result.changedFiles.join(", ")}`);
    if (result.result.rollbackPaths.length > 0) {
      logInfo(`optional dev overlay rollback snapshots: ${result.result.rollbackPaths.join(", ")}`);
    }
    vscode.window.showInformationMessage(`Game Polish Lab dev overlay spike created in ${polishDevOverlayRelativeDir}.`);
    await openTextDocument(vscode.Uri.joinPath(folder.uri, ...polishDevOverlayReadmeRelativePath.split("/")));
  } catch (error) {
    logError("create optional dev overlay spike failed:", error);
    vscode.window.showErrorMessage(`Failed to create Game Polish Lab dev overlay spike: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createOptionalDevOverlaySpike");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
