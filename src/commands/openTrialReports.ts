import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { listTrialReports } from "../core/trialReports";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";

export async function openTrialReports(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.openTrialReports", folder.uri.fsPath);

  try {
    const reports = await listTrialReports(folder);
    if (reports.length === 0) {
      vscode.window.showInformationMessage("No trial reports found. Run Game Polish Lab: Create Real Project Trial Report first.");
      return;
    }

    const picked = await vscode.window.showQuickPick(reports.map((report) => ({
      label: report.fileName,
      description: new Date(report.modifiedTime).toISOString(),
      report
    })), { placeHolder: "Open a trial report" });
    if (!picked) {
      return;
    }

    await openTextDocument(picked.report.uri);
  } catch (error) {
    logError("open trial reports failed:", error);
    vscode.window.showErrorMessage(`Failed to open trial reports: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.openTrialReports");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
