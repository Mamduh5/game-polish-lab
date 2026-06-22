import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { ensureDirectory, ensureProfile, labUri, openTextDocument, requireWorkspaceFolder, writeJsonFile } from "../core/workspace";
import { getPresetById } from "../presets/polishPresets";
import { MainBlocker, PolishTask, ProjectStatus } from "../types/polishTask";
import { ProjectProfile } from "../types/profile";

const projectStatuses: ProjectStatus[] = ["almost_finished", "playable_but_ugly", "early_prototype", "abandoned_due_to_visuals", "abandoned_due_to_feel"];
const mainBlockers: MainBlocker[] = ["pixel_art_setup", "combat_readability", "controls", "vfx_feedback", "hud_readability", "idle_menu_ui", "sprite_consistency", "camera_feedback"];

const blockerPresets: Record<MainBlocker, string[]> = {
  pixel_art_setup: ["pixel_art_setup", "pixel_sprite_readability", "hud_readability"],
  combat_readability: ["hit_feedback", "projectile_readability", "danger_telegraph"],
  controls: ["control_feel", "player_damage_feedback", "camera_screen_feedback"],
  vfx_feedback: ["hit_feedback", "enemy_death_feedback", "pickup_feedback"],
  hud_readability: ["hud_readability", "economy_hud", "reward_popup"],
  idle_menu_ui: ["idle_upgrade_screen", "economy_hud", "menu_button_feedback"],
  sprite_consistency: ["pixel_sprite_readability", "pixel_art_setup", "projectile_readability"],
  camera_feedback: ["camera_screen_feedback", "player_damage_feedback", "hit_feedback"]
};

export async function createRescueTask(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createRescueTask", folder.uri.fsPath);

  try {
    const pickedStatus = await vscode.window.showQuickPick(projectStatuses, { placeHolder: "Project status" });
    if (!pickedStatus) {
      return;
    }
    const status = pickedStatus as ProjectStatus;

    const pickedBlocker = await vscode.window.showQuickPick(mainBlockers, { placeHolder: "Main blocker" });
    if (!pickedBlocker) {
      return;
    }
    const blocker = pickedBlocker as MainBlocker;

    const rescueGoal = await vscode.window.showInputBox({
      title: "Rescue goal",
      prompt: "Describe what would make this project worth continuing.",
      placeHolder: "Example: Combat reads clearly enough to record a gameplay clip."
    });
    if (!rescueGoal) {
      vscode.window.showInformationMessage("Rescue task creation cancelled.");
      return;
    }

    const { profile } = await ensureProfile(folder);
    const suggestedPresets = blockerPresets[blocker];
    const primaryPreset = getPresetById(suggestedPresets[0]);
    if (!primaryPreset) {
      vscode.window.showErrorMessage("Rescue preset mapping is invalid.");
      return;
    }

    const tasksFolder = labUri(folder, "tasks");
    await ensureDirectory(tasksFolder);
    const fileName = await nextRescueTaskFileName(tasksFolder, blocker);
    const task = buildRescueTask(profile, fileName, status, blocker, rescueGoal, suggestedPresets);
    const taskUri = labUri(folder, "tasks", fileName);

    await writeJsonFile(taskUri, task);
    logInfo(`created rescue task file: ${taskUri.fsPath}`);
    vscode.window.showInformationMessage(`Game Polish Lab rescue task created: ${fileName}`);
    await openTextDocument(taskUri);
  } catch (error) {
    logError("create rescue task failed:", error);
    vscode.window.showErrorMessage(`Failed to create rescue task: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createRescueTask");
  }
}

async function nextRescueTaskFileName(tasksFolder: vscode.Uri, blocker: MainBlocker): Promise<string> {
  let highest = 0;
  try {
    const entries = await vscode.workspace.fs.readDirectory(tasksFolder);
    for (const [name] of entries) {
      const match = /^(\d+)-.+\.json$/.exec(name);
      if (match) {
        highest = Math.max(highest, Number(match[1]));
      }
    }
  } catch {
    // Start at 1 if the task folder cannot be read after creation.
  }

  return `${String(highest + 1).padStart(3, "0")}-rescue-${blocker.replace(/_/g, "-")}.json`;
}

function buildRescueTask(profile: ProjectProfile, fileName: string, projectStatus: ProjectStatus, mainBlocker: MainBlocker, rescueGoal: string, suggestedPresets: string[]): PolishTask {
  const primaryPreset = getPresetById(suggestedPresets[0]);
  const relatedPresets = suggestedPresets.map((id) => getPresetById(id)).filter((preset): preset is NonNullable<typeof preset> => Boolean(preset));
  const mustNotTouch = Array.from(new Set([...profile.defaultMustNotTouch, ...relatedPresets.flatMap((preset) => preset.suggestedMustNotTouchFiles)]));

  return {
    schemaVersion: 1,
    id: fileName.replace(/\.json$/, ""),
    taskKind: "rescue",
    presetId: primaryPreset?.id ?? mainBlocker,
    presetLabel: `Rescue: ${labelize(mainBlocker)}`,
    label: `Rescue: ${labelize(mainBlocker)}`,
    engine: profile.engine,
    style: profile.style,
    projectType: profile.projectType,
    problem: `${projectStatus} project blocked by ${mainBlocker}.`,
    targetFeel: "A small, focused rescue pass that makes the project presentable enough to continue or evaluate.",
    allowedFiles: Array.from(new Set(relatedPresets.flatMap((preset) => preset.suggestedAllowedFiles))),
    mustNotTouch,
    acceptanceCriteria: [
      `Main blocker addressed: ${mainBlocker}.`,
      "The change is scoped to presentation, readability, controls, VFX, HUD, or game feel.",
      "No economy, save, combat balance, progression, routing, or unrelated systems are changed.",
      "The result is small enough to review and revert if needed."
    ],
    tunableValues: Object.assign({}, ...relatedPresets.map((preset) => preset.tunableValues)) as Record<string, string | number | boolean>,
    antiPatterns: Array.from(new Set(relatedPresets.flatMap((preset) => preset.antiPatterns))),
    definitionOfDone: [
      rescueGoal,
      "The project has a clear next playable or reviewable state.",
      "Changed files and tunable values are listed."
    ],
    notes: ["Suggested presets are recommendations only; keep the rescue patch smaller than a redesign."],
    createdAt: new Date().toISOString(),
    projectStatus,
    mainBlocker,
    suggestedPresets,
    rescueGoal
  };
}

function labelize(value: string): string {
  return value.split("_").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
