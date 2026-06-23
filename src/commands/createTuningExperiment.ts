import * as vscode from "vscode";

import { readFieldNotes } from "../core/fieldNotes";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { createTuningExperimentFiles } from "../core/visualContracts";
import { labUri, openTextDocument, readJsonFileIfExists, requireWorkspaceFolder } from "../core/workspace";
import { TuningExperimentType, VisualDiagnosisTask } from "../types/visualContracts";

const experimentTypes: TuningExperimentType[] = ["config_only", "per_skin_multiplier", "reduce_shared_overlay", "fallback_only_shared_effect", "rollback_bad_tuning", "compare_two_variants"];

export async function createTuningExperiment(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createTuningExperiment", folder.uri.fsPath);

  try {
    const diagnoses = await listDiagnosisTasks(folder);
    if (diagnoses.length === 0) {
      vscode.window.showInformationMessage("No visual diagnosis tasks found. Create a visual diagnosis task first.");
      return;
    }

    const pickedDiagnosis = await vscode.window.showQuickPick(diagnoses.map((entry) => ({
      label: entry.fileName,
      description: `${entry.task.area} / ${entry.task.symptom}`,
      entry
    })), { placeHolder: "Choose a visual diagnosis task" });
    if (!pickedDiagnosis) {
      return;
    }

    const experimentType = await vscode.window.showQuickPick(experimentTypes, { placeHolder: "Experiment type" }) as TuningExperimentType | undefined;
    if (!experimentType) {
      return;
    }
    const expectedResult = await vscode.window.showInputBox({
      title: "Expected result",
      prompt: "One sentence. Keep this to one hypothesis.",
      placeHolder: "Reduce shared overlay so strong skins keep their own effect identity."
    });
    if (!expectedResult) {
      return;
    }
    const rollbackReference = await vscode.window.showInputBox({
      title: "Rollback file or baseline note",
      prompt: "What should Codex restore if this is worse?",
      placeHolder: "Restore cursorAttackFeedbackConfig values from before this experiment."
    });
    if (!rollbackReference) {
      return;
    }

    const result = await createTuningExperimentFiles(folder, {
      diagnosis: pickedDiagnosis.entry.task,
      diagnosisTaskId: pickedDiagnosis.entry.fileName.replace(/\.json$/, ""),
      experimentType,
      expectedResult,
      rollbackReference,
      fieldNotes: await readFieldNotes(folder)
    });

    logInfo(`tuning experiment created: ${result.promptUri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab tuning experiment created.");
    await openTextDocument(result.promptUri);
  } catch (error) {
    logError("create tuning experiment failed:", error);
    vscode.window.showErrorMessage(`Failed to create tuning experiment: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createTuningExperiment");
  }
}

async function listDiagnosisTasks(folder: vscode.WorkspaceFolder): Promise<Array<{ fileName: string; task: VisualDiagnosisTask }>> {
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(labUri(folder, "diagnostics"));
  } catch {
    return [];
  }

  const tasks = await Promise.all(entries
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith("-diagnosis.json"))
    .map(async ([name]) => {
      const task = await readJsonFileIfExists<VisualDiagnosisTask>(labUri(folder, "diagnostics", name));
      return task ? { fileName: name, task } : undefined;
    }));

  return tasks.filter((task): task is { fileName: string; task: VisualDiagnosisTask } => Boolean(task));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
