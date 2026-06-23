import * as vscode from "vscode";

import { readLatestAuditContext } from "../core/auditContext";
import { readFieldNotes } from "../core/fieldNotes";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { createVisualDiagnosisFiles } from "../core/visualContracts";
import { ensureProfile, openTextDocument, requireWorkspaceFolder } from "../core/workspace";
import { AffectedScope, PreviousPatchResult, VisualArea, VisualSymptom } from "../types/visualContracts";

const visualAreas: VisualArea[] = [
  "cursor_attack_feedback", "enemy_kill_feedback", "combo_feedback", "arena_hud_readability", "arena_upgrade_panel_readability", "arena_background_readability",
  "sort_move_feedback", "selected_shelf_readability", "invalid_move_feedback", "completed_shelf_glow", "win_celebration", "spirit_identity_readability", "puzzle_hud_readability", "mobile_sort_layout_readability",
  "monster_farm_slot_readability", "hatch_feedback", "merge_feedback", "tap_farm_feedback", "coin_bug_feedback", "farm_hud_readability", "monster_identity_readability", "panel_readability", "toast_reward_feedback", "quest_widget_readability", "boss_battle_feedback",
  "click_feedback", "upgrade_card_readability", "reward_popup", "other"
];
const symptoms: VisualSymptom[] = ["too_weak", "too_noisy", "worse_after_tuning", "same_after_tuning", "unreadable", "cluttered", "wrong_color_layer", "bad_timing", "style_mismatch", "other"];
const affectedScopes: AffectedScope[] = ["all_skins", "some_skins", "one_skin", "unknown"];
const previousPatchResults: PreviousPatchResult[] = ["no", "yes_worse", "yes_same", "yes_mixed"];

export async function createVisualDiagnosisTask(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createVisualDiagnosisTask", folder.uri.fsPath);

  try {
    const { profile } = await ensureProfile(folder);
    const latestAudit = await readLatestAuditContext(folder);
    const fieldNotes = await readFieldNotes(folder);

    const area = await vscode.window.showQuickPick(visualAreas, { placeHolder: "Visual area" }) as VisualArea | undefined;
    if (!area) {
      return;
    }
    const symptom = await vscode.window.showQuickPick(symptoms, { placeHolder: "Visual symptom" }) as VisualSymptom | undefined;
    if (!symptom) {
      return;
    }
    const observation = await vscode.window.showInputBox({
      title: "Observation",
      prompt: "One sentence describing what you saw.",
      placeHolder: "The extra dark/blue effect layer makes many click skins worse."
    });
    if (!observation) {
      return;
    }
    const affectedScope = await vscode.window.showQuickPick(affectedScopes, { placeHolder: "Which skins/states are affected?" }) as AffectedScope | undefined;
    if (!affectedScope) {
      return;
    }
    const skinInput = await vscode.window.showInputBox({
      title: "Affected skin names",
      prompt: "Optional comma-separated skin names.",
      placeHolder: "default, neon, shadow"
    });
    const previousPatchResult = await vscode.window.showQuickPick(previousPatchResults, { placeHolder: "Is this after a previous patch?" }) as PreviousPatchResult | undefined;
    if (!previousPatchResult) {
      return;
    }

    const result = await createVisualDiagnosisFiles(folder, profile, latestAudit, {
      area,
      symptom,
      observation,
      affectedScope,
      affectedSkins: splitCommaList(skinInput),
      previousPatchResult,
      rollbackReference: "",
      fieldNotes
    });

    logInfo(`visual diagnosis created: ${result.promptUri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab visual diagnosis task created.");
    await openTextDocument(result.promptUri);
  } catch (error) {
    logError("create visual diagnosis task failed:", error);
    vscode.window.showErrorMessage(`Failed to create visual diagnosis task: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createVisualDiagnosisTask");
  }
}

function splitCommaList(value: string | undefined): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
