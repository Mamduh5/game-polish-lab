import * as vscode from "vscode";

import { auditPhaserPixelArt, renderPhaserPixelAuditMarkdown } from "../adapters/phaser/auditPhaserPixelArt";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { ScanCancelledError } from "../core/workspaceScanner";
import { ensureDirectory, labUri, openTextDocument, requireWorkspaceFolder, writeTextFile } from "../core/workspace";

export async function runPhaserPixelAudit(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.runPhaserPixelAudit", folder.uri.fsPath);

  try {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Game Polish Lab: Running Phaser pixel audit",
        cancellable: true
      },
      async (_progress, token) => auditPhaserPixelArt(folder, token)
    );
    const auditUri = labUri(folder, "audits", "latest-phaser-pixel-audit.md");
    await ensureDirectory(labUri(folder, "audits"));
    await writeTextFile(auditUri, renderPhaserPixelAuditMarkdown(result));
    logInfo(`audit created: ${auditUri.fsPath}`);
    logInfo(`audit detection evidence: ${result.detection.evidence.join(" | ") || "none"}`);
    logInfo(`audit files inspected: ${result.filesInspected.join(", ") || "none"}`);
    vscode.window.showInformationMessage("Game Polish Lab Phaser pixel audit created.");
    await openTextDocument(auditUri);
  } catch (error) {
    if (error instanceof ScanCancelledError) {
      vscode.window.showInformationMessage("Game Polish Lab scan cancelled.");
      logInfo("Phaser pixel audit cancelled by user.");
      return;
    }
    logError("Phaser pixel audit failed:", error);
    vscode.window.showErrorMessage(`Failed to run Phaser pixel audit: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.runPhaserPixelAudit");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
