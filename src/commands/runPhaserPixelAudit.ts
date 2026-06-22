import * as vscode from "vscode";

import { auditPhaserPixelArt, renderPhaserPixelAuditMarkdown } from "../adapters/phaser/auditPhaserPixelArt";
import { ensureDirectory, labUri, openTextDocument, requireWorkspaceFolder, writeTextFile } from "../core/workspace";

export async function runPhaserPixelAudit(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }

  try {
    const result = await auditPhaserPixelArt(folder);
    const auditUri = labUri(folder, "audits", "latest-phaser-pixel-audit.md");
    await ensureDirectory(labUri(folder, "audits"));
    await writeTextFile(auditUri, renderPhaserPixelAuditMarkdown(result));
    vscode.window.showInformationMessage("Game Polish Lab Phaser pixel audit created.");
    await openTextDocument(auditUri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to run Phaser pixel audit: ${errorToMessage(error)}`);
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
