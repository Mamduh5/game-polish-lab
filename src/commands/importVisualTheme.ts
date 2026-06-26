import * as vscode from "vscode";

import { importVisualThemeFile, planVisualThemeImport, validateVisualThemeFile } from "../core/visualThemeTransfer";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { readTextFile, requireWorkspaceFolder } from "../core/workspace";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";

const adapterItems: Array<{ label: string; value: VisualDirectApplyAdapterId }> = [
  { label: "Idle Monster Farm", value: "idle_monster_farm" },
  { label: "Generic Phaser", value: "generic_phaser" },
  { label: "Sort Puzzle", value: "sort_puzzle" },
  { label: "Cursor Arena", value: "cursor_arena" }
];

const surfaceItems: Array<{ label: string; value: VisualSurfaceType }> = [
  { label: "Slot/Card", value: "slot_card" },
  { label: "Panel", value: "panel" },
  { label: "Button", value: "button" },
  { label: "Reward Toast / Feedback", value: "reward_toast" },
  { label: "Background Readability", value: "background_readability" }
];

export async function importVisualTheme(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.importVisualTheme", folder.uri.fsPath);
  try {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { "Game Polish Lab theme": ["json"] },
      defaultUri: vscode.Uri.joinPath(folder.uri, ".game-polish-lab", "themes")
    });
    if (!selected?.[0]) {
      return;
    }
    const validation = validateVisualThemeFile(JSON.parse(await readTextFile(selected[0])));
    if (!validation.ok || !validation.theme) {
      vscode.window.showErrorMessage(`Theme import blocked: ${validation.errors.join(" ")}`);
      return;
    }
    const adapter = await vscode.window.showQuickPick(adapterItems, { placeHolder: "Target adapter" });
    const surface = await vscode.window.showQuickPick(surfaceItems, { placeHolder: "Target surface" });
    if (!adapter || !surface) {
      return;
    }
    const targetId = await vscode.window.showInputBox({ prompt: "Optional target id" });
    const plan = planVisualThemeImport(validation.theme, { targetAdapterId: adapter.value, targetSurfaceType: surface.value, targetId });
    if (!plan.ok) {
      vscode.window.showErrorMessage(`Theme import blocked: ${plan.reasons.join(" ")}`);
      return;
    }
    const result = importVisualThemeFile(folder.uri.fsPath, validation.theme, plan);
    vscode.window.showInformationMessage(`Visual theme imported: ${result.changedFiles.join(", ")}${result.rollbackPaths.length ? `; rollback ${result.rollbackPaths.join(", ")}` : ""}`);
  } catch (error) {
    logError("import visual theme failed:", error);
    vscode.window.showErrorMessage(`Failed to import visual theme: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.importVisualTheme");
  }
}
