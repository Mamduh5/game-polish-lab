import * as vscode from "vscode";

import { createRollbackPromptFromInputs } from "./createRollbackPrompt";
import { readLatestAuditContext } from "../core/auditContext";
import { readFieldNotes } from "../core/fieldNotes";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { appendToTrialReport, listTrialReports } from "../core/trialReports";
import { createVisualDiagnosisFiles } from "../core/visualContracts";
import { ensureProfile, openTextDocument, requireWorkspaceFolder } from "../core/workspace";
import { RollbackWorseArea, VisualArea, VisualSymptom } from "../types/visualContracts";

const results = ["better", "worse", "same", "mixed", "not_tested"];
const decisions = ["keep_patch", "revert_patch", "tune_more", "create_another_task", "archive_project_for_now"];
const worseDetails: Array<{ label: string; value: RollbackWorseArea; symptom: VisualSymptom }> = [
  { label: "too noisy", value: "particle_density", symptom: "too_noisy" },
  { label: "wrong color/layer", value: "color_layer", symptom: "wrong_color_layer" },
  { label: "clutter", value: "some_skins", symptom: "cluttered" },
  { label: "unreadable", value: "readability", symptom: "unreadable" },
  { label: "style mismatch", value: "some_skins", symptom: "style_mismatch" },
  { label: "performance", value: "performance", symptom: "other" },
  { label: "some skins worse", value: "some_skins", symptom: "worse_after_tuning" },
  { label: "all skins worse", value: "all_visuals", symptom: "worse_after_tuning" }
];
const visualAreas: VisualArea[] = [
  "cursor_attack_feedback", "enemy_kill_feedback", "combo_feedback", "arena_hud_readability", "arena_upgrade_panel_readability", "arena_background_readability",
  "sort_move_feedback", "selected_shelf_readability", "invalid_move_feedback", "completed_shelf_glow", "win_celebration", "spirit_identity_readability", "puzzle_hud_readability", "mobile_sort_layout_readability",
  "monster_farm_slot_readability", "hatch_feedback", "merge_feedback", "tap_farm_feedback", "coin_bug_feedback", "farm_hud_readability", "monster_identity_readability", "panel_readability", "toast_reward_feedback", "quest_widget_readability", "boss_battle_feedback",
  "click_feedback", "upgrade_card_readability", "reward_popup", "other"
];

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
    let worseDetailLine = "";
    let generatedRollback = "";
    let generatedDiagnosis = "";
    if (result === "worse" || result === "mixed") {
      const worseDetail = await vscode.window.showQuickPick(worseDetails, { placeHolder: "What got worse?" });
      if (worseDetail) {
        worseDetailLine = `* What got worse: ${worseDetail.label}\n`;
        const createRollback = await vscode.window.showQuickPick(["yes", "no"], { placeHolder: "Create optional rollback prompt?" });
        if (createRollback === "yes") {
          const rollbackUri = await createRollbackPromptFromInputs(folder, {
            whatGotWorse: worseDetail.value,
            rollbackScope: "config_only_values"
          });
          generatedRollback = rollbackUri ? `* Rollback prompt: ${rollbackUri.fsPath}\n` : "";
        }

        const createDiagnosis = await vscode.window.showQuickPick(["yes", "no"], { placeHolder: "Create optional visual diagnosis task?" });
        if (createDiagnosis === "yes") {
          const area = await vscode.window.showQuickPick(visualAreas, { placeHolder: "Visual area for diagnosis" }) as VisualArea | undefined;
          if (area) {
            const { profile } = await ensureProfile(folder);
            const diagnosis = await createVisualDiagnosisFiles(folder, profile, await readLatestAuditContext(folder), {
              area,
              symptom: worseDetail.symptom,
              observation: notes || `${result} trial result: ${worseDetail.label}`,
              affectedScope: worseDetail.value === "all_visuals" ? "all_skins" : worseDetail.value === "some_skins" ? "some_skins" : "unknown",
              affectedSkins: [],
              previousPatchResult: result === "worse" ? "yes_worse" : "yes_mixed",
              rollbackReference: generatedRollback,
              fieldNotes: await readFieldNotes(folder)
            });
            generatedDiagnosis = `* Visual diagnosis: ${diagnosis.promptUri.fsPath}\n`;
          }
        }
      }
    }

    const timestamp = new Date().toISOString();
    await appendToTrialReport(picked.report.uri, `## Trial Update - ${timestamp}

* Result: ${result}
* Decision: ${decision}
* Notes: ${notes ?? ""}
${worseDetailLine}${generatedRollback}${generatedDiagnosis}
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
