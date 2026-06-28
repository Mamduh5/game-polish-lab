import * as vscode from "vscode";

import { buildAssetPipelineDashboardForWorkspace } from "./openAssetPipelineDashboard";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import {
  findVisualAssetSlotContract,
  generateVisualAssetStyleGuide,
  readVisualAssetContractFileSync
} from "../core/visualAssetStyleGuide";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";

export async function generateAssetStyleGuide(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.generateAssetStyleGuide", folder.uri.fsPath);
  try {
    const model = await buildAssetPipelineDashboardForWorkspace(folder);
    if (model.rows.length === 0) {
      vscode.window.showWarningMessage("No visual asset slots were detected for an asset style guide.");
      return;
    }
    const picked = await vscode.window.showQuickPick(model.rows.map((row) => ({
      label: row.slot.slotLabel,
      description: `${row.slot.adapterLabel} / ${row.slot.surfaceLabel}`,
      detail: row.slot.slotId,
      row
    })), {
      title: "Generate Asset Style Guide",
      placeHolder: "Choose a visual asset slot"
    });
    if (!picked) {
      return;
    }
    const notes = await vscode.window.showInputBox({
      title: "Optional Style Guide Notes",
      prompt: "Optional artist/image-tool notes for this guide. Leave blank to use slot and contract metadata only.",
      placeHolder: "Example: keep silhouette chunky and readable at HUD size"
    });
    const contractFile = readVisualAssetContractFileSync(folder.uri.fsPath);
    const result = generateVisualAssetStyleGuide({
      workspaceRoot: folder.uri.fsPath,
      slot: picked.row.slot,
      candidate: picked.row.candidate,
      validation: picked.row.validation,
      boundsAnalysis: picked.row.boundsAnalysis,
      normalization: picked.row.normalization,
      contract: findVisualAssetSlotContract(contractFile, picked.row.slot),
      userNotes: notes ? [notes] : undefined
    });
    await openTextDocument(vscode.Uri.joinPath(folder.uri, ...result.markdownPath.split("/")));
    vscode.window.showInformationMessage(`Generated asset style guide: ${result.markdownPath}`);
  } catch (error) {
    logError("generate asset style guide failed:", error);
    vscode.window.showErrorMessage(`Failed to generate asset style guide: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.generateAssetStyleGuide");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
