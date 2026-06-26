import * as path from "path";
import * as vscode from "vscode";

import {
  buildScreenshotAnnotationNote,
  validateScreenshotImagePath,
  writeScreenshotAnnotationNote
} from "../core/screenshotAnnotation";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { requireWorkspaceFolder } from "../core/workspace";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";

const surfaceItems: Array<{ label: string; value: VisualSurfaceType }> = [
  { label: "Slot/Card", value: "slot_card" },
  { label: "Panel", value: "panel" },
  { label: "Button", value: "button" },
  { label: "Reward Toast / Feedback", value: "reward_toast" },
  { label: "Background Readability", value: "background_readability" },
  { label: "Asset Replacement", value: "asset_replacement" }
];

const adapterItems: Array<{ label: string; value: VisualDirectApplyAdapterId | undefined }> = [
  { label: "Unknown / choose later", value: undefined },
  { label: "Idle Monster Farm", value: "idle_monster_farm" },
  { label: "Generic Phaser", value: "generic_phaser" },
  { label: "Sort Puzzle", value: "sort_puzzle" },
  { label: "Cursor Arena", value: "cursor_arena" }
];

export async function annotateScreenshotVisualIssue(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.annotateScreenshotVisualIssue", folder.uri.fsPath);
  try {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { Images: ["png", "jpg", "jpeg", "webp"] }
    });
    if (!selected?.[0]) {
      return;
    }
    const imagePath = selected[0].fsPath;
    const pathErrors = validateScreenshotImagePath(folder.uri.fsPath, imagePath);
    if (pathErrors.length > 0) {
      vscode.window.showErrorMessage(`Screenshot note blocked: ${pathErrors.join(" ")}`);
      return;
    }
    const surface = await vscode.window.showQuickPick(surfaceItems, { placeHolder: "Surface with the visual issue" });
    const adapter = await vscode.window.showQuickPick(adapterItems, { placeHolder: "Adapter, if known" });
    if (!surface || !adapter) {
      return;
    }
    const rectText = await vscode.window.showInputBox({ prompt: "Marked rectangle as x,y,width,height", value: "0,0,100,100" });
    if (!rectText) {
      return;
    }
    const [x, y, width, height] = rectText.split(",").map((part) => Number(part.trim()));
    const noteText = await vscode.window.showInputBox({ prompt: "Optional visual issue note" });
    const noteResult = buildScreenshotAnnotationNote({
      screenshotPath: path.relative(folder.uri.fsPath, imagePath).replace(/\\/g, "/"),
      markedRect: { x, y, width, height },
      surfaceType: surface.value,
      adapterId: adapter.value,
      note: noteText
    });
    if (!noteResult.ok || !noteResult.note) {
      vscode.window.showErrorMessage(`Screenshot note blocked: ${noteResult.errors.join(" ")}`);
      return;
    }
    const relativePath = writeScreenshotAnnotationNote(folder.uri.fsPath, noteResult.note);
    const panel = vscode.window.createWebviewPanel("gamePolishLab.screenshotAnnotation", "Screenshot Visual Issue", vscode.ViewColumn.One, {
      enableScripts: false,
      localResourceRoots: [folder.uri, context.extensionUri]
    });
    const imageUri = panel.webview.asWebviewUri(selected[0]);
    panel.webview.html = `<!doctype html><html><body style="margin:0;background:#111;color:#eee;font-family:system-ui"><img src="${imageUri}" style="max-width:100%;display:block"><p style="padding:12px">Saved visual issue note: ${relativePath}</p></body></html>`;
    vscode.window.showInformationMessage(`Screenshot visual issue note saved: ${relativePath}`);
  } catch (error) {
    logError("annotate screenshot visual issue failed:", error);
    vscode.window.showErrorMessage(`Failed to annotate screenshot visual issue: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.annotateScreenshotVisualIssue");
  }
}
