import * as path from "path";
import * as vscode from "vscode";

import { importVisualThemeToAdapter, validateVisualThemeFile, visualThemeFolderRelativePath } from "../core/visualThemeTransfer";
import { getVisualGameAdapterSurfaceTargets } from "../core/visualGameAdapters";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { readTextFile, requireWorkspaceFolder } from "../core/workspace";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";
import { VisualThemeFile } from "../types/visualTheme";

export interface ImportVisualThemeInitialState {
  adapterId?: VisualDirectApplyAdapterId;
  surfaceType?: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
}

const adapterItems: Array<{ label: string; value: VisualDirectApplyAdapterId }> = [
  { label: "Idle Monster Farm", value: "idle_monster_farm" },
  { label: "Generic Phaser", value: "generic_phaser" },
  { label: "Sort Puzzle", value: "sort_puzzle" },
  { label: "Cursor Arena", value: "cursor_arena" }
];

export async function importVisualTheme(initialState: ImportVisualThemeInitialState = {}): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.importVisualTheme", folder.uri.fsPath);
  try {
    const theme = await pickThemeFile(folder);
    if (!theme) {
      return;
    }
    const adapterId = initialState.adapterId ?? (await vscode.window.showQuickPick(adapterItems, { placeHolder: "Target adapter" }))?.value;
    if (!adapterId) {
      return;
    }
    const target = initialState.targetId || initialState.surfaceType
      ? { surfaceType: initialState.surfaceType, targetId: initialState.targetId, targetLabel: initialState.targetLabel }
      : await pickImportTarget(adapterId);
    if (!target) {
      return;
    }
    const result = importVisualThemeToAdapter(folder.uri.fsPath, theme, {
      targetAdapterId: adapterId,
      targetSurfaceType: target.surfaceType,
      targetId: target.targetId
    });
    if (!result.ok) {
      vscode.window.showErrorMessage(`Theme import blocked: ${result.errors.join(" ")}`);
      return;
    }
    const skippedText = result.skipped.length ? `; skipped ${result.skipped.length}` : "";
    const warningText = result.warnings.length ? `; warnings ${result.warnings.length}` : "";
    vscode.window.showInformationMessage(`Visual theme imported as config-only: ${result.changedFiles.join(", ")}${skippedText}${warningText}`);
  } catch (error) {
    logError("import visual theme failed:", error);
    vscode.window.showErrorMessage(`Failed to import visual theme: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.importVisualTheme");
  }
}

async function pickThemeFile(folder: vscode.WorkspaceFolder): Promise<VisualThemeFile | undefined> {
  const themeUris = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, `${visualThemeFolderRelativePath}/*.json`), `**/${visualThemeFolderRelativePath}/index.json`, 100);
  const items: Array<vscode.QuickPickItem & { uri: vscode.Uri }> = [];
  for (const uri of themeUris) {
    try {
      const parsed = JSON.parse(await readTextFile(uri)) as unknown;
      const validation = validateVisualThemeFile(parsed);
      if (validation.ok && validation.theme) {
        items.push({
          label: validation.theme.themeName,
          description: validation.theme.themeId,
          detail: `${validation.theme.sourceAdapterLabel}; ${validation.theme.genericSurfaceTypes.join(", ")}`,
          uri
        });
      }
    } catch {
      continue;
    }
  }
  if (items.length === 0) {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { "Game Polish Lab theme": ["json"] },
      defaultUri: vscode.Uri.joinPath(folder.uri, ".game-polish-lab", "themes")
    });
    if (!selected?.[0]) {
      return undefined;
    }
    return readAndValidateTheme(selected[0]);
  }
  const selected = await vscode.window.showQuickPick(items, { placeHolder: "Theme to import" });
  return selected ? readAndValidateTheme(selected.uri) : undefined;
}

async function readAndValidateTheme(uri: vscode.Uri): Promise<VisualThemeFile | undefined> {
  if (path.basename(uri.fsPath) === "index.json") {
    vscode.window.showErrorMessage("Theme index files cannot be imported directly. Pick a theme JSON file.");
    return undefined;
  }
  const validation = validateVisualThemeFile(JSON.parse(await readTextFile(uri)));
  if (!validation.ok || !validation.theme) {
    vscode.window.showErrorMessage(`Theme import blocked: ${validation.errors.join(" ")}`);
    return undefined;
  }
  if (validation.warnings.length > 0) {
    vscode.window.showWarningMessage(`Theme validation warnings: ${validation.warnings.slice(0, 3).join(" ")}`);
  }
  return validation.theme;
}

async function pickImportTarget(adapterId: VisualDirectApplyAdapterId): Promise<{ surfaceType?: VisualSurfaceType; targetId?: string; targetLabel?: string } | undefined> {
  const items: Array<vscode.QuickPickItem & { surfaceType?: VisualSurfaceType; targetId?: string; targetLabel?: string }> = [
    { label: "All compatible generated config targets", description: "Imports every compatible theme surface for this adapter." }
  ];
  for (const target of getVisualGameAdapterSurfaceTargets(adapterId)) {
    if (target.surfaceType === "asset_replacement" || !target.styleConfigPath) {
      continue;
    }
    items.push({
      label: target.displayName,
      description: target.styleConfigPath,
      detail: `${target.surfaceType} / ${target.targetId}`,
      surfaceType: target.surfaceType,
      targetId: target.targetId,
      targetLabel: target.displayName
    });
  }
  const selected = await vscode.window.showQuickPick(items, { placeHolder: "Target generated config" });
  return selected ? { surfaceType: selected.surfaceType, targetId: selected.targetId, targetLabel: selected.targetLabel } : undefined;
}
