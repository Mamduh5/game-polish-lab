import * as vscode from "vscode";

import { readFieldNotes } from "../core/fieldNotes";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { createRollbackPromptFile } from "../core/visualContracts";
import { labUri, openTextDocument, requireWorkspaceFolder } from "../core/workspace";
import { RollbackScope, RollbackWorseArea } from "../types/visualContracts";

const worseAreas: RollbackWorseArea[] = ["all_visuals", "some_skins", "timing", "color_layer", "particle_density", "readability", "performance", "other"];
const rollbackScopes: RollbackScope[] = ["full_last_patch", "config_only_values", "specific_files", "specific_fields"];

export async function createRollbackPrompt(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createRollbackPrompt", folder.uri.fsPath);

  try {
    const uri = await createRollbackPromptFromInputs(folder);
    if (!uri) {
      return;
    }
    logInfo(`rollback prompt created: ${uri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab rollback prompt created.");
    await openTextDocument(uri);
  } catch (error) {
    logError("create rollback prompt failed:", error);
    vscode.window.showErrorMessage(`Failed to create rollback prompt: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createRollbackPrompt");
  }
}

export async function createRollbackPromptFromInputs(folder: vscode.WorkspaceFolder, preset?: Partial<{ whatGotWorse: RollbackWorseArea; rollbackScope: RollbackScope }>): Promise<vscode.Uri | undefined> {
  const whatGotWorse = preset?.whatGotWorse ?? await vscode.window.showQuickPick(worseAreas, { placeHolder: "What got worse?" }) as RollbackWorseArea | undefined;
  if (!whatGotWorse) {
    return undefined;
  }

  const rollbackScope = preset?.rollbackScope ?? await vscode.window.showQuickPick(rollbackScopes, { placeHolder: "Rollback scope" }) as RollbackScope | undefined;
  if (!rollbackScope) {
    return undefined;
  }

  const linkedReference = await pickLinkedReference(folder);
  return createRollbackPromptFile(folder, {
    whatGotWorse,
    rollbackScope,
    linkedReference,
    fieldNotes: await readFieldNotes(folder)
  });
}

async function pickLinkedReference(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
  const references = await listReferenceFiles(folder);
  if (references.length === 0) {
    return undefined;
  }

  const picked = await vscode.window.showQuickPick([
    { label: "No linked diagnosis/experiment", value: undefined },
    ...references.map((reference) => ({ label: reference, value: reference }))
  ], { placeHolder: "Link a diagnosis or experiment?" });
  return picked?.value;
}

async function listReferenceFiles(folder: vscode.WorkspaceFolder): Promise<string[]> {
  const folders = ["diagnostics", "experiments"];
  const results: string[] = [];
  for (const subfolder of folders) {
    try {
      const entries = await vscode.workspace.fs.readDirectory(labUri(folder, subfolder));
      results.push(...entries
        .filter(([name, type]) => type === vscode.FileType.File && name.endsWith(".json"))
        .map(([name]) => `.game-polish-lab/${subfolder}/${name}`));
    } catch {
      // Missing contract folders are fine.
    }
  }
  return results;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
