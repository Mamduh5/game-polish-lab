import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { suggestProjectType } from "../core/projectType";
import { createTrialReport as writeTrialReport } from "../core/trialReports";
import { ensureProfile, openTextDocument, requireWorkspaceFolder } from "../core/workspace";

const trialTargets = ["hit_feedback", "pickup_feedback", "projectile_readability", "control_feel", "hud_readability", "camera_screen_feedback", "pixel_sprite_readability", "idle_upgrade_screen", "reward_popup", "rescue_task", "other"];
const projectStatuses = ["almost_finished", "playable_but_ugly", "early_prototype", "abandoned_due_to_visuals", "abandoned_due_to_feel"];
const artifactOptions = ["audit_only", "polish_task", "rescue_task", "pixel_polish_kit", "style_guide", "scope_check"];

export async function createTrialReport(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createTrialReport", folder.uri.fsPath);

  try {
    const { profile } = await ensureProfile(folder);
    const suggestion = await suggestProjectType(folder);

    const trialTarget = await vscode.window.showQuickPick(trialTargets, { placeHolder: "Trial target" });
    if (!trialTarget) {
      return;
    }

    const blocker = await vscode.window.showInputBox({
      title: "Current blocker",
      prompt: "Describe the blocker in one sentence.",
      placeHolder: "Example: Hits land but enemies barely react."
    });
    if (!blocker) {
      return;
    }

    const projectStatus = await vscode.window.showQuickPick(projectStatuses, { placeHolder: "Project status" });
    if (!projectStatus) {
      return;
    }

    const artifactUsed = await vscode.window.showQuickPick(artifactOptions, { placeHolder: "Workflow artifact used or planned" });
    if (!artifactUsed) {
      return;
    }

    const uri = await writeTrialReport(folder, {
      workspacePath: folder.uri.fsPath,
      profile,
      suggestion,
      trialTarget,
      blocker,
      projectStatus,
      artifactUsed
    });

    logInfo(`trial report created: ${uri.fsPath}`);
    vscode.window.showInformationMessage("Game Polish Lab trial report created.");
    await openTextDocument(uri);
  } catch (error) {
    logError("create trial report failed:", error);
    vscode.window.showErrorMessage(`Failed to create trial report: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createTrialReport");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
