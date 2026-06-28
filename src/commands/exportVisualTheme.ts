import * as path from "path";
import * as vscode from "vscode";

import { exportVisualThemeFromStyleConfigs } from "../core/visualThemeTransfer";
import { getVisualGameAdapter, getVisualGameAdapterSurfaceTargets } from "../core/visualGameAdapters";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { pathExists, requireWorkspaceFolder } from "../core/workspace";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";

export interface ExportVisualThemeInitialState {
  adapterId?: VisualDirectApplyAdapterId;
  surfaceType?: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  configPath?: string;
}

const adapterItems: Array<{ label: string; value: VisualDirectApplyAdapterId }> = [
  { label: "Idle Monster Farm", value: "idle_monster_farm" },
  { label: "Generic Phaser", value: "generic_phaser" },
  { label: "Sort Puzzle", value: "sort_puzzle" },
  { label: "Cursor Arena", value: "cursor_arena" }
];

export async function exportVisualTheme(initialState: ExportVisualThemeInitialState = {}): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.exportVisualTheme", folder.uri.fsPath);
  try {
    const themeName = await vscode.window.showInputBox({ prompt: "Theme name", value: initialState.targetLabel ? `${initialState.targetLabel} Theme` : "visual-theme" });
    if (!themeName) {
      return;
    }
    const adapterId = initialState.adapterId ?? (await vscode.window.showQuickPick(adapterItems, { placeHolder: "Source adapter" }))?.value;
    if (!adapterId) {
      return;
    }
    const selections = initialState.configPath
      ? [{
        surfaceType: initialState.surfaceType,
        targetId: initialState.targetId,
        targetLabel: initialState.targetLabel,
        styleConfigPath: initialState.configPath
      }]
      : await pickStyleConfigSelections(folder, adapterId);
    if (!selections || selections.length === 0) {
      vscode.window.showWarningMessage("No generated style configs were selected for theme export.");
      return;
    }
    const result = exportVisualThemeFromStyleConfigs(folder.uri.fsPath, {
      themeName,
      sourceAdapterId: adapterId,
      sourceAdapterLabel: getVisualGameAdapter(adapterId)?.displayName,
      sourceWorkspaceLabel: path.basename(folder.uri.fsPath),
      selections,
      notes: "Exported from Game Polish Lab generated style config.",
      exportSource: initialState.configPath ? "dashboard_row" : "style_config"
    });
    vscode.window.showInformationMessage(`Visual theme exported: ${result.relativePath}; index ${result.indexPath}${result.warnings.length ? `; warnings ${result.warnings.length}` : ""}`);
  } catch (error) {
    logError("export visual theme failed:", error);
    vscode.window.showErrorMessage(`Failed to export visual theme: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.exportVisualTheme");
  }
}

async function pickStyleConfigSelections(folder: vscode.WorkspaceFolder, adapterId: VisualDirectApplyAdapterId): Promise<Array<{ surfaceType?: VisualSurfaceType; targetId?: string; targetLabel?: string; styleConfigPath: string }> | undefined> {
  const items: Array<vscode.QuickPickItem & { surfaceType: VisualSurfaceType; targetId: string; targetLabel: string; styleConfigPath: string }> = [];
  for (const target of getVisualGameAdapterSurfaceTargets(adapterId)) {
    if (!target.styleConfigPath || target.surfaceType === "asset_replacement") {
      continue;
    }
    const uri = vscode.Uri.joinPath(folder.uri, ...target.styleConfigPath.split("/"));
    if (await pathExists(uri)) {
      items.push({
        label: target.displayName,
        description: target.styleConfigPath,
        detail: `${target.surfaceType} / ${target.targetId}`,
        surfaceType: target.surfaceType,
        targetId: target.targetId,
        targetLabel: target.displayName,
        styleConfigPath: target.styleConfigPath
      });
    }
  }
  if (items.length === 0) {
    vscode.window.showWarningMessage("No existing generated style configs were found. Tune a visual surface before exporting a theme.");
    return undefined;
  }
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Style config(s) to export",
    canPickMany: true
  });
  return selected?.map((item) => ({
    surfaceType: item.surfaceType,
    targetId: item.targetId,
    targetLabel: item.targetLabel,
    styleConfigPath: item.styleConfigPath
  }));
}
