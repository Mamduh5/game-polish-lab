import * as path from "path";
import * as vscode from "vscode";

import {
  buildScreenshotAnnotationNote,
  readScreenshotImageMetadata,
  saveScreenshotAnnotationBundle,
  validateScreenshotImagePath
} from "../core/screenshotAnnotation";
import { getVisualGameAdapterSurfaceTargets } from "../core/visualGameAdapters";
import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { requireWorkspaceFolder } from "../core/workspace";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";
import { ScreenshotAnnotationSeverity, ScreenshotAnnotationSurfaceType } from "../types/screenshotAnnotation";

export interface ScreenshotAnnotationInitialState {
  adapterId?: VisualDirectApplyAdapterId;
  surfaceType?: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
}

interface AnnotationWebviewMessage {
  command: "save";
  rect: { x: number; y: number; width: number; height: number };
  surfaceType: ScreenshotAnnotationSurfaceType;
  targetId?: string;
  note: string;
  severity: ScreenshotAnnotationSeverity;
  createConfigStub: boolean;
  createFallbackTask: boolean;
}

const surfaceItems: Array<{ label: string; value: ScreenshotAnnotationSurfaceType }> = [
  { label: "Slot/Card", value: "slot_card" },
  { label: "Panel", value: "panel" },
  { label: "Button", value: "button" },
  { label: "HUD", value: "hud" },
  { label: "Reward Toast", value: "reward_toast" },
  { label: "Background Readability", value: "background_readability" },
  { label: "Impact/Hit Feedback", value: "impact_feedback" },
  { label: "Asset Slot", value: "asset_slot" }
];

const adapterItems: Array<{ label: string; value: VisualDirectApplyAdapterId | undefined }> = [
  { label: "Unknown / choose later", value: undefined },
  { label: "Idle Monster Farm", value: "idle_monster_farm" },
  { label: "Generic Phaser", value: "generic_phaser" },
  { label: "Sort Puzzle", value: "sort_puzzle" },
  { label: "Cursor Arena", value: "cursor_arena" }
];

export async function annotateScreenshotVisualIssue(context: vscode.ExtensionContext, initialState: ScreenshotAnnotationInitialState = {}): Promise<void> {
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
      filters: { Images: ["png", "jpg", "jpeg", "webp"] },
      defaultUri: folder.uri
    });
    if (!selected?.[0]) {
      return;
    }
    const imagePath = selected[0].fsPath;
    const pathErrors = validateScreenshotImagePath(folder.uri.fsPath, imagePath);
    if (pathErrors.length > 0) {
      vscode.window.showErrorMessage(`Screenshot annotation blocked: ${pathErrors.join(" ")}`);
      return;
    }
    const adapterId = initialState.adapterId ?? (await vscode.window.showQuickPick(adapterItems, { placeHolder: "Adapter, if known" }))?.value;
    const panel = vscode.window.createWebviewPanel("gamePolishLab.screenshotAnnotation", "Screenshot Annotation", vscode.ViewColumn.One, {
      enableScripts: true,
      localResourceRoots: [folder.uri, context.extensionUri, vscode.Uri.file(path.dirname(imagePath))]
    });
    const screenshotPath = path.relative(folder.uri.fsPath, imagePath).replace(/\\/g, "/");
    const imageMetadata = readScreenshotImageMetadata(folder.uri.fsPath, imagePath);
    panel.webview.html = renderAnnotationHtml({
      imageUri: panel.webview.asWebviewUri(selected[0]).toString(),
      cspSource: panel.webview.cspSource,
      screenshotPath,
      adapterId,
      initialSurfaceType: annotationSurfaceFromVisualSurface(initialState.surfaceType, initialState.targetId),
      initialTargetId: initialState.targetId,
      targets: adapterId ? annotationTargetItems(adapterId) : [],
      imageMetadata
    });
    panel.webview.onDidReceiveMessage(async (message: AnnotationWebviewMessage) => {
      if (message.command !== "save") {
        return;
      }
      const annotationResult = buildScreenshotAnnotationNote({
        screenshotPath,
        markedRect: message.rect,
        surfaceType: message.surfaceType,
        adapterId,
        targetSurfaceId: message.targetId || initialState.targetId,
        note: message.note,
        severity: message.severity,
        workspaceLabel: path.basename(folder.uri.fsPath),
        imageMetadata
      });
      if (!annotationResult.ok || !annotationResult.note) {
        await panel.webview.postMessage({ ok: false, message: annotationResult.errors.join(" ") });
        return;
      }
      const result = saveScreenshotAnnotationBundle(folder.uri.fsPath, {
        annotation: annotationResult.note,
        createConfigStub: message.createConfigStub,
        createFallbackTask: message.createFallbackTask
      });
      if (!result.ok) {
        await panel.webview.postMessage({ ok: false, message: result.errors.join(" ") });
        return;
      }
      await panel.webview.postMessage({ ok: true, message: `Saved ${result.annotationPath}; task ${result.taskPath}${result.configPath ? `; config ${result.configPath}` : ""}${result.fallbackTaskPath ? `; fallback ${result.fallbackTaskPath}` : ""}` });
      vscode.window.showInformationMessage(`Screenshot annotation saved: ${result.annotationPath}`);
    });
  } catch (error) {
    logError("annotate screenshot visual issue failed:", error);
    vscode.window.showErrorMessage(`Failed to annotate screenshot: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.annotateScreenshotVisualIssue");
  }
}

function renderAnnotationHtml(input: {
  imageUri: string;
  cspSource: string;
  screenshotPath: string;
  adapterId?: VisualDirectApplyAdapterId;
  initialSurfaceType?: ScreenshotAnnotationSurfaceType;
  initialTargetId?: string;
  targets: Array<{ label: string; value: string; surfaceType: VisualSurfaceType }>;
  imageMetadata?: { width?: number; height?: number; fileType: string };
}): string {
  const nonce = createNonce();
  const surfaceOptions = surfaceItems.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === input.initialSurfaceType ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
  const targetOptions = [
    `<option value="">Generic / choose later</option>`,
    ...input.targets.map((target) => `<option value="${escapeHtml(target.value)}" data-surface="${escapeHtml(target.surfaceType)}" ${target.value === input.initialTargetId ? "selected" : ""}>${escapeHtml(target.label)}</option>`)
  ].join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${input.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screenshot Annotation</title>
  <style nonce="${nonce}">
    body{margin:0;padding:16px;background:var(--vscode-editor-background);color:var(--vscode-foreground);font-family:var(--vscode-font-family)}
    .layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px}.preview{border:1px solid var(--vscode-panel-border);background:#111;overflow:auto}.preview img{max-width:100%;display:block}
    .panel{display:grid;gap:10px}label{display:grid;gap:4px;font-size:12px;color:var(--vscode-descriptionForeground)}input,select,textarea{width:100%;box-sizing:border-box;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--vscode-panel-border));border-radius:4px;padding:6px}
    .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.checks label{display:flex;gap:6px;color:var(--vscode-foreground)}button{min-height:30px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;border-radius:4px}.meta,.status{font-size:12px;color:var(--vscode-descriptionForeground);white-space:pre-wrap}@media(max-width:760px){.layout{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="layout">
    <div class="preview"><img src="${input.imageUri}" alt="Selected screenshot"></div>
    <form class="panel" id="form">
      <div><strong>Screenshot Annotation</strong><div class="meta">${escapeHtml(input.screenshotPath)}${input.adapterId ? ` | ${escapeHtml(input.adapterId)}` : ""}${input.imageMetadata?.width ? ` | ${input.imageMetadata.width}x${input.imageMetadata.height}` : ""}</div></div>
      <div class="row"><label>x<input id="x" type="number" min="0" value="0"></label><label>y<input id="y" type="number" min="0" value="0"></label></div>
      <div class="row"><label>width<input id="width" type="number" min="1" value="${input.imageMetadata?.width ? Math.min(120, input.imageMetadata.width) : 120}"></label><label>height<input id="height" type="number" min="1" value="${input.imageMetadata?.height ? Math.min(80, input.imageMetadata.height) : 80}"></label></div>
      <label>Surface<select id="surface">${surfaceOptions}</select></label>
      <label>Adapter Target<select id="target">${targetOptions}</select></label>
      <label>Severity<select id="severity"><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></label>
      <label>Note<textarea id="note" rows="5" placeholder="Example: HUD too crowded, hit effect hides enemy"></textarea></label>
      <div class="checks"><label><input id="config" type="checkbox" checked>Create config stub when safe</label><label><input id="fallback" type="checkbox">Create scoped fallback handoff</label></div>
      <button type="submit">Save Annotation</button>
      <div id="status" class="status"></div>
    </form>
  </div>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const form=document.getElementById("form"),status=document.getElementById("status");
    form.addEventListener("submit",event=>{event.preventDefault();vscode.postMessage({command:"save",rect:{x:Number(x.value),y:Number(y.value),width:Number(width.value),height:Number(height.value)},surfaceType:surface.value,targetId:target.value,note:note.value,severity:severity.value,createConfigStub:config.checked,createFallbackTask:fallback.checked});});
    window.addEventListener("message",event=>{const m=event.data;status.textContent=(m.ok?"Saved: ":"Blocked: ")+m.message;});
  </script>
</body>
</html>`;
}

function annotationTargetItems(adapterId: VisualDirectApplyAdapterId): Array<{ label: string; value: string; surfaceType: VisualSurfaceType }> {
  return getVisualGameAdapterSurfaceTargets(adapterId)
    .filter((target) => Boolean(target.styleConfigPath))
    .map((target) => ({
      label: `${target.displayName} (${target.surfaceType})`,
      value: target.targetId,
      surfaceType: target.surfaceType
    }));
}

function annotationSurfaceFromVisualSurface(surfaceType: VisualSurfaceType | undefined, targetId?: string): ScreenshotAnnotationSurfaceType | undefined {
  if (!surfaceType) {
    return undefined;
  }
  if (surfaceType === "panel" && targetId?.toLowerCase().includes("hud")) {
    return "hud";
  }
  if (surfaceType === "reward_toast" && /impact|feedback|hit|miss|kill|combo/.test(targetId?.toLowerCase() ?? "")) {
    return "impact_feedback";
  }
  if (surfaceType === "asset_replacement") {
    return "asset_slot";
  }
  return surfaceType;
}

function createNonce(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] ?? char));
}
