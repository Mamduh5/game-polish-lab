import * as vscode from "vscode";

import { readLatestAuditContext } from "../core/auditContext";
import { appendFieldNote } from "../core/fieldNotes";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { openTextDocument, requireWorkspaceFolder } from "../core/workspace";

export async function addFieldNote(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.addFieldNote", folder.uri.fsPath);

  try {
    const seed = await pickSuggestedSeed(folder);
    const note = await vscode.window.showInputBox({
      title: "Game Polish Lab Field Note",
      prompt: "Record a project-specific visual lesson future prompts should include.",
      placeHolder: "Cursor attack skins get worse when shared flash/particles are globally boosted.",
      value: seed
    });
    if (!note) {
      return;
    }

    const uri = await appendFieldNote(folder, note);
    logInfo(`field note added: ${uri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab field note added.");
    await openTextDocument(uri);
  } catch (error) {
    logError("add field note failed:", error);
    vscode.window.showErrorMessage(`Failed to add Game Polish Lab field note: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.addFieldNote");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function pickSuggestedSeed(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
  const audit = await readLatestAuditContext(folder);
  const seeds = suggestedFieldNoteSeeds(audit?.suggestedProjectType, audit?.dominantMode);
  if (seeds.length === 0) {
    return undefined;
  }

  const picked = await vscode.window.showQuickPick([
    { label: "Blank note", value: undefined },
    ...seeds.map((seed) => ({ label: seed, value: seed }))
  ], { placeHolder: "Use a suggested field note?" });
  return picked?.value;
}

function suggestedFieldNoteSeeds(projectType: string | undefined, dominantMode: string | undefined): string[] {
  if (projectType === "cozy_sort_puzzle" || projectType === "shelf_sort_puzzle" || dominantMode === "tap_to_move_sort_puzzle") {
    return [
      "Do not change SortRules or level data during visual polish.",
      "Valid move, invalid move, completed shelf, and win state need separate visual feedback.",
      "Spirit identity must stay readable during move/selection animations."
    ];
  }
  if (projectType === "idle_monster_farm" || projectType === "monster_merge_idle" || projectType === "phaser_ui_heavy_idle" || dominantMode === "tap_farm_idle") {
    return [
      "Visual polish must not change economy, save schema, hatch odds, merge formulas, ad logic, or quest rewards.",
      "FarmScene is large; prefer view/config-level changes over scene rewrites.",
      "TapFarmView is Phaser UI and should be tuned separately from monster/farm slot readability."
    ];
  }
  return [];
}
