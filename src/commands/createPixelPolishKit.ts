import * as vscode from "vscode";

import { hasUsefulAuditProjectType, LatestAuditContext, readLatestAuditContext } from "../core/auditContext";
import { readFieldNotes } from "../core/fieldNotes";
import { buildConfigTemplateForProfile, buildKitImplementationPrompt, buildKitReadme, buildPixelPolishKit, nextKitFolderName, resolveWorkspaceConfigPath } from "../core/pixelPolishKitBuilder";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { detectCodeStyle, detectRuntimePresentationModel } from "../core/presentationDetection";
import { ScanCancelledError } from "../core/workspaceScanner";
import { ensureDirectory, ensureProfile, labUri, openTextDocument, pathExists, requireWorkspaceFolder, writeJsonFile, writeTextFile } from "../core/workspace";
import { pixelPolishKitPresets } from "../presets/pixelPolishKitPresets";
import { ProjectType } from "../types/profile";

export async function createPixelPolishKit(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.createPixelPolishKit", folder.uri.fsPath);

  try {
    const profileResult = await ensureProfile(folder);
    const profile = { ...profileResult.profile };
    const detection = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Game Polish Lab: Detecting kit context",
        cancellable: true
      },
      async (_progress, token) => ({
        codeStyle: await detectCodeStyle(folder, token),
        runtimeModel: await detectRuntimePresentationModel(folder, token)
      })
    );
    const codeStyle = detection.codeStyle;
    const runtimeModel = detection.runtimeModel;
    if (profile.codeStyle === "unknown" && codeStyle.codeStyle !== "unknown") {
      profile.codeStyle = codeStyle.codeStyle;
    }
    if (profile.runtimePresentationModel === "unknown" && runtimeModel.runtimePresentationModel !== "unknown") {
      profile.runtimePresentationModel = runtimeModel.runtimePresentationModel;
    }
    const latestAudit = await readLatestAuditContext(folder);
    if (profile.projectType === "unknown" && latestAudit && hasUsefulAuditProjectType(latestAudit)) {
      const pickedProjectType = await pickProjectTypeFromLatestAudit(latestAudit);
      if (!pickedProjectType) {
        return;
      }
      profile.projectType = pickedProjectType;
      if (profile.runtimePresentationModel === "unknown" && latestAudit.runtimePresentationModel) {
        profile.runtimePresentationModel = latestAudit.runtimePresentationModel;
      }
    }
    if (JSON.stringify(profile) !== JSON.stringify(profileResult.profile)) {
      await writeJsonFile(profileResult.uri, profile);
      logInfo(`profile updated with detected code style/runtime model: ${profileResult.uri.fsPath}`);
    }

    const picked = await vscode.window.showQuickPick(
      sortPresetsForProfile(profile.projectType).map((preset) => ({
        label: preset.label,
        description: preset.kitId,
        detail: preset.description,
        preset
      })),
      { placeHolder: "Choose a Pixel Polish Kit preset" }
    );
    if (!picked) {
      return;
    }

    const generateConfig = await vscode.window.showQuickPick(
      [
        { label: "Kit files only", value: false, description: "Create files only under .game-polish-lab." },
        { label: "Also create source config", value: true, description: picked.preset.suggestedConfigPath }
      ],
      { placeHolder: "Generate source config template?" }
    );
    if (!generateConfig) {
      return;
    }

    let actualConfigPath = "";
    if (generateConfig.value) {
      const inputPath = await vscode.window.showInputBox({
        title: "Config template path",
        prompt: "Workspace-relative path. The extension will not overwrite without confirmation.",
        value: picked.preset.suggestedConfigPath
      });
      if (!inputPath) {
        return;
      }

      const configUri = resolveWorkspaceConfigPath(folder, inputPath);
      if (!configUri) {
        vscode.window.showErrorMessage("Config path must be a workspace-relative path inside the opened workspace.");
        return;
      }

      if (await pathExists(configUri)) {
        const overwrite = await vscode.window.showWarningMessage(`Config file already exists: ${inputPath}. Overwrite it?`, { modal: true }, "Overwrite");
        if (overwrite !== "Overwrite") {
          return;
        }
      }

      const parent = vscode.Uri.joinPath(configUri, "..");
      await ensureDirectory(parent);
      await writeTextFile(configUri, buildConfigTemplateForProfile(picked.preset, profile));
      actualConfigPath = inputPath;
      logInfo(`source config template created: ${configUri.fsPath}`);
    }

    const kitFolderName = await nextKitFolderName(folder, picked.preset.kitId);
    const kitUri = labUri(folder, "kits", kitFolderName);
    await ensureDirectory(kitUri);

    const kit = buildPixelPolishKit(picked.preset, profile, actualConfigPath);
    const prompt = buildKitImplementationPrompt(kit, profile, {
      projectType: latestAudit?.suggestedProjectType,
      dominantMode: latestAudit?.dominantMode,
      fieldNotes: await readFieldNotes(folder)
    });
    await writeJsonFile(vscode.Uri.joinPath(kitUri, "kit.json"), kit);
    await writeTextFile(vscode.Uri.joinPath(kitUri, "README.md"), buildKitReadme(kit));
    await writeTextFile(vscode.Uri.joinPath(kitUri, "codex-implementation-prompt.md"), prompt);
    await vscode.env.clipboard.writeText(prompt);

    logInfo(`kit created: ${kitUri.fsPath}`);
    vscode.window.showInformationMessage(`Pixel Polish Kit created: ${kitFolderName}`);
    await openTextDocument(vscode.Uri.joinPath(kitUri, "README.md"));
  } catch (error) {
    if (error instanceof ScanCancelledError) {
      vscode.window.showInformationMessage("Game Polish Lab scan cancelled.");
      logInfo("Pixel Polish Kit detection cancelled by user.");
      return;
    }
    logError("create Pixel Polish Kit failed:", error);
    vscode.window.showErrorMessage(`Failed to create Pixel Polish Kit: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.createPixelPolishKit");
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function pickProjectTypeFromLatestAudit(latestAudit: LatestAuditContext): Promise<ProjectType | undefined> {
  const items = [
    latestAudit.suggestedProjectType && {
      label: `Use latest audit recommendation: ${latestAudit.suggestedProjectType}`,
      value: latestAudit.suggestedProjectType
    },
    latestAudit.dominantMode && latestAudit.dominantMode !== "unknown" && latestAudit.dominantMode !== latestAudit.suggestedProjectType && {
      label: `Use dominant mode: ${latestAudit.dominantMode}`,
      value: latestAudit.dominantMode
    },
    {
      label: "Pick manually",
      value: "manual" as const
    }
  ].filter((item): item is { label: string; value: ProjectType | "manual" } => Boolean(item));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: "Latest audit found a specific game family. Choose profile project type for kit recommendations."
  });
  if (!picked) {
    return undefined;
  }

  if (picked.value !== "manual") {
    return picked.value;
  }

  const manual = await vscode.window.showQuickPick(projectTypeOptions, {
    placeHolder: "Choose profile project type"
  });
  return manual?.value;
}

function sortPresetsForProfile(projectType: ProjectType): typeof pixelPolishKitPresets {
  const order = kitOrderForProjectType(projectType);
  if (!order) {
    return pixelPolishKitPresets;
  }

  return [...pixelPolishKitPresets].sort((a, b) => {
    const aScore = order.get(a.kitId) ?? 100;
    const bScore = order.get(b.kitId) ?? 100;
    return aScore - bScore;
  });
}

function kitOrderForProjectType(projectType: ProjectType): Map<string, number> | undefined {
  if (projectType === "incremental_arena" || projectType === "cursor_attack_arena" || projectType === "phaser_dom_hud") {
    return new Map(["cursor_attack_feedback", "enemy_kill_feedback", "combo_feedback", "arena_hud_readability", "arena_upgrade_panel_readability", "arena_background_readability"].map((id, index) => [id, index]));
  }
  if (projectType === "cozy_sort_puzzle" || projectType === "shelf_sort_puzzle" || projectType === "tap_to_move_sort_puzzle") {
    return new Map(["sort_move_feedback", "selected_shelf_readability", "invalid_move_feedback", "completed_shelf_glow", "win_celebration", "spirit_identity_readability", "puzzle_hud_readability", "mobile_sort_layout_readability"].map((id, index) => [id, index]));
  }
  if (projectType === "idle_monster_farm" || projectType === "monster_merge_idle" || projectType === "phaser_ui_heavy_idle" || projectType === "tap_farm_idle") {
    return new Map(["monster_farm_slot_readability", "hatch_feedback", "merge_feedback", "tap_farm_feedback", "coin_bug_feedback", "farm_hud_readability", "monster_identity_readability", "panel_readability", "toast_reward_feedback", "quest_widget_readability", "boss_battle_feedback"].map((id, index) => [id, index]));
  }
  return undefined;
}

const projectTypeOptions: Array<{ label: string; value: ProjectType }> = [
  { label: "unknown", value: "unknown" },
  { label: "arena_combat", value: "arena_combat" },
  { label: "top_down_shooter", value: "top_down_shooter" },
  { label: "survivor_like", value: "survivor_like" },
  { label: "idle_economy", value: "idle_economy" },
  { label: "clicker_incremental", value: "clicker_incremental" },
  { label: "moba_like", value: "moba_like" },
  { label: "mobile_action", value: "mobile_action" },
  { label: "incremental_arena", value: "incremental_arena" },
  { label: "cursor_attack_arena", value: "cursor_attack_arena" },
  { label: "phaser_dom_hud", value: "phaser_dom_hud" },
  { label: "cozy_sort_puzzle", value: "cozy_sort_puzzle" },
  { label: "shelf_sort_puzzle", value: "shelf_sort_puzzle" },
  { label: "tap_to_move_sort_puzzle", value: "tap_to_move_sort_puzzle" },
  { label: "idle_monster_farm", value: "idle_monster_farm" },
  { label: "monster_merge_idle", value: "monster_merge_idle" },
  { label: "phaser_ui_heavy_idle", value: "phaser_ui_heavy_idle" },
  { label: "tap_farm_idle", value: "tap_farm_idle" },
  { label: "hybrid", value: "hybrid" }
];
