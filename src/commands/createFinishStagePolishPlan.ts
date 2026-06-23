import * as vscode from "vscode";

import { readLatestAuditContext } from "../core/auditContext";
import { readFieldNotes } from "../core/fieldNotes";
import { renderFieldNotesSection } from "../core/fieldNotes";
import { renderMonsterFarmFinishStagePlanPrompt } from "../core/monsterFarmDeepAudit";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { getNextNumberedFilename } from "../core/trialReports";
import { ensureDirectory, labUri, openTextDocument, requireWorkspaceFolder, writeTextFile } from "../core/workspace";

export async function createFinishStagePolishPlan(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createFinishStagePolishPlan", folder.uri.fsPath);

  try {
    const plansUri = labUri(folder, "plans");
    await ensureDirectory(plansUri);
    const latestAudit = await readLatestAuditContext(folder);
    const fileName = await getNextNumberedFilename(folder, "plans", "monster-farm-finish-stage-polish-plan.md");
    const promptUri = labUri(folder, "plans", fileName);
    const prompt = buildFinishStagePlanPrompt(latestAudit, await readFieldNotes(folder));

    await writeTextFile(promptUri, prompt);
    await vscode.env.clipboard.writeText(prompt);
    logInfo(`finish-stage polish plan prompt created: ${promptUri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab finish-stage polish plan prompt created.");
    await openTextDocument(promptUri);
  } catch (error) {
    logError("create finish-stage polish plan failed:", error);
    vscode.window.showErrorMessage(`Failed to create finish-stage polish plan: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createFinishStagePolishPlan");
  }
}

function buildFinishStagePlanPrompt(latestAudit: Awaited<ReturnType<typeof readLatestAuditContext>>, fieldNotes: string[]): string {
  const context = latestAudit
    ? `## Latest Audit Context

- Suggested project type: ${latestAudit.suggestedProjectType ?? "unknown"}
- Dominant mode: ${latestAudit.dominantMode ?? "unknown"}
- Runtime presentation model: ${latestAudit.runtimePresentationModel ?? "unknown"}
- Main risk: ${latestAudit.mainRisk ?? "unknown"}
`
    : `## Latest Audit Context

- No latest audit context found. Inspect the workspace before planning.
`;

  return `${renderMonsterFarmFinishStagePlanPrompt()}

${context}
${renderFieldNotesSection(fieldNotes)}`;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
