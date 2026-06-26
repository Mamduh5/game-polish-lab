import * as vscode from "vscode";

import { buildVisualThemeFile, exportVisualThemeFile } from "../core/visualThemeTransfer";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { requireWorkspaceFolder } from "../core/workspace";
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

export async function exportVisualTheme(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.exportVisualTheme", folder.uri.fsPath);
  try {
    const themeName = await vscode.window.showInputBox({ prompt: "Theme name", value: "visual-theme" });
    if (!themeName) {
      return;
    }
    const adapter = await vscode.window.showQuickPick(adapterItems, { placeHolder: "Source adapter" });
    const surface = await vscode.window.showQuickPick(surfaceItems, { placeHolder: "Surface to export" });
    if (!adapter || !surface) {
      return;
    }
    const tokenText = await vscode.window.showInputBox({ prompt: "Style tokens as JSON object", value: "{\"fillColor\":\"#1f2937\"}" });
    if (!tokenText) {
      return;
    }
    const styleTokens = JSON.parse(tokenText) as Record<string, unknown>;
    const theme = buildVisualThemeFile({
      themeName,
      sourceAdapterId: adapter.value,
      surfaces: [{ surfaceType: surface.value, styleTokens }],
      notes: "Exported from Game Polish Lab command."
    });
    const relativePath = exportVisualThemeFile(folder.uri.fsPath, theme);
    vscode.window.showInformationMessage(`Visual theme exported: ${relativePath}`);
  } catch (error) {
    logError("export visual theme failed:", error);
    vscode.window.showErrorMessage(`Failed to export visual theme: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.exportVisualTheme");
  }
}
