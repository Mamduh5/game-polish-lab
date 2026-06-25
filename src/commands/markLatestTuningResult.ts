import * as vscode from "vscode";

import { findLatestTuningAttempt, updateTuningAttemptResult } from "../core/tuningAttempts";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";
import { visualTuningResultStatuses } from "../core/tuningAttemptModel";
import { VisualTuningResultStatus } from "../types/visualTuningAttempt";

export async function markLatestTuningResult(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.markLatestTuningResult", folder.uri.fsPath);

  try {
    const attemptPath = await findLatestTuningAttempt(folder);
    if (!attemptPath) {
      vscode.window.showInformationMessage("No Game Polish Lab tuning attempts found.");
      return;
    }
    const picked = await vscode.window.showQuickPick(
      visualTuningResultStatuses.filter((status) => status !== "unreviewed").map((status) => ({ label: status, value: status })),
      { placeHolder: "Mark latest tuning attempt result" }
    );
    if (!picked) {
      return;
    }
    const note = await vscode.window.showInputBox({
      title: "Game Polish Lab Result Note",
      prompt: "Optional note for project field notes.",
      placeHolder: "Magic Glow reduced selected-slot readability on mobile."
    });
    const stored = await updateTuningAttemptResult(folder, attemptPath, picked.value as VisualTuningResultStatus, note);
    logInfo(`tuning result updated: ${stored.attemptPath} -> ${stored.attempt.resultStatus}`);
    vscode.window.showInformationMessage(`Marked latest tuning result ${stored.attempt.resultStatus}.`);
    await openTextDocument(stored.uri);
  } catch (error) {
    logError("mark latest tuning result failed:", error);
    vscode.window.showErrorMessage(`Failed to mark latest tuning result: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.markLatestTuningResult");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
