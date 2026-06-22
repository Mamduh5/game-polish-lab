import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { appendToTrialReport, listTrialReports } from "../core/trialReports";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";

const results = ["better", "worse", "same", "not_tested"];
const decisions = ["keep_patch", "revert_patch", "tune_more", "create_another_task", "archive_project_for_now"];

export async function updateTrialResult(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.updateTrialResult", folder.uri.fsPath);

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
    })), { placeHolder: "Choose a trial report" });
    if (!picked) {
      return;
    }

    const result = await vscode.window.showQuickPick(results, { placeHolder: "Trial result" });
    if (!result) {
      return;
    }

    const decision = await vscode.window.showQuickPick(decisions, { placeHolder: "Decision" });
    if (!decision) {
      return;
    }

    const notes = await vscode.window.showInputBox({
      title: "Optional trial notes",
      prompt: "Add a short note, or leave blank.",
      placeHolder: "Example: VFX reads better but camera shake needs tuning."
    });

    const timestamp = new Date().toISOString();
    await appendToTrialReport(picked.report.uri, `## Trial Update - ${timestamp}

* Result: ${result}
* Decision: ${decision}
* Notes: ${notes ?? ""}
`);

    logInfo(`trial report updated: ${picked.report.uri.fsPath}`);
    vscode.window.showInformationMessage("Trial report updated.");
    await openTextDocument(picked.report.uri);
  } catch (error) {
    logError("update trial result failed:", error);
    vscode.window.showErrorMessage(`Failed to update trial result: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.updateTrialResult");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
