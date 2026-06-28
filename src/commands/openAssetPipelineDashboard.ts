import * as path from "path";
import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import {
  assignVisualAssetCandidate,
  buildVisualAssetDashboardModel,
  buildVisualAssetFallbackTask,
  checkAssetPipelineScope,
  importVisualAssetCandidate,
  validateImportedVisualAssetCandidate,
  visualAssetContractRelativePath,
  visualAssetDashboardRelativePath,
  writeVisualAssetFallbackTask
} from "../core/visualAssetPipeline";
import { openTextDocument, pathExists, readTextFileIfExists, requireWorkspaceFolder, toWorkspaceRelativePath } from "../core/workspace";
import { ImportedVisualAssetCandidate, VisualAssetDashboardModel } from "../types/visualAssetPipeline";

interface AssetPipelineMessage {
  command: "importAsset" | "validateAsset" | "previewInContext" | "assignReplacement" | "openAssetContract" | "generateFallbackTask" | "runScopeCheck" | "refresh";
  rowId?: string;
}

export async function openAssetPipelineDashboard(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.openAssetPipelineDashboard", folder.uri.fsPath);
  try {
    let model = await buildAssetPipelineDashboardForWorkspace(folder);
    const panel = vscode.window.createWebviewPanel("gamePolishLab.assetPipelineDashboard", "Asset Pipeline Dashboard", vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folder.uri]
    });
    panel.webview.html = renderAssetPipelineDashboardHtml(panel.webview, folder, model);
    panel.webview.onDidReceiveMessage(async (message: AssetPipelineMessage) => {
      const result = await handleAssetPipelineMessage(folder, model, message);
      if (result.refresh) {
        model = await buildAssetPipelineDashboardForWorkspace(folder);
        panel.webview.html = renderAssetPipelineDashboardHtml(panel.webview, folder, model);
      } else {
        await panel.webview.postMessage(result);
      }
    });
    logInfo("v0.80 asset pipeline dashboard manual smoke checklist:");
    logInfo("- dashboard opens without writing runtime game assets");
    logInfo("- fallback-required slots do not claim runtime apply");
    logInfo("- Import Asset copies PNG/WebP into .game-polish-lab/assets/imported/");
    logInfo("- Assign Replacement writes Game Polish Lab-owned metadata only");
  } catch (error) {
    logError("open asset pipeline dashboard failed:", error);
    vscode.window.showErrorMessage(`Failed to open asset pipeline dashboard: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.openAssetPipelineDashboard");
  }
}

export async function buildAssetPipelineDashboardForWorkspace(folder: vscode.WorkspaceFolder): Promise<VisualAssetDashboardModel> {
  const files = await readAssetPipelineWorkspaceFiles(folder);
  return buildVisualAssetDashboardModel({
    workspaceRoot: folder.uri.fsPath,
    files
  });
}

async function handleAssetPipelineMessage(folder: vscode.WorkspaceFolder, model: VisualAssetDashboardModel, message: AssetPipelineMessage): Promise<{ ok: boolean; message: string; refresh?: boolean }> {
  if (message.command === "refresh") {
    return { ok: true, message: "Asset pipeline dashboard refreshed.", refresh: true };
  }
  const row = model.rows.find((candidate) => candidate.rowId === message.rowId);
  if (!row) {
    return { ok: false, message: "Asset dashboard row was not found." };
  }
  if (message.command === "openAssetContract") {
    const uri = vscode.Uri.joinPath(folder.uri, ...visualAssetContractRelativePath.split("/"));
    if (!(await pathExists(uri))) {
      return { ok: false, message: "No asset contract file exists yet. Refresh asset contracts from the Visual Tuning Dashboard first." };
    }
    await openTextDocument(uri);
    return { ok: true, message: `Opened ${visualAssetContractRelativePath}.` };
  }
  if (message.command === "runScopeCheck") {
    const result = checkAssetPipelineScope(row.slot);
    vscode.window.showInformationMessage(result.summaryMessage);
    return { ok: result.recommendedAction !== "block", message: result.summaryMessage };
  }
  if (message.command === "generateFallbackTask") {
    const task = buildVisualAssetFallbackTask({ slot: row.slot, candidate: row.candidate });
    const taskPath = writeVisualAssetFallbackTask(folder.uri.fsPath, task);
    return { ok: true, message: `Created scoped visual-only fallback task: ${taskPath}.`, refresh: true };
  }
  if (message.command === "previewInContext") {
    return {
      ok: true,
      message: row.candidate
        ? `Preview is shown as ${row.previewMode === "context" ? "a simple supported context card" : "a basic asset card"}; this does not mean runtime applied.`
        : "No imported candidate is assigned to this slot yet."
    };
  }
  if (message.command === "validateAsset") {
    if (!row.candidate) {
      return { ok: false, message: "No imported candidate is assigned to this slot yet." };
    }
    const validation = validateImportedVisualAssetCandidate(folder.uri.fsPath, row.slot, row.candidate);
    return {
      ok: validation.status === "valid" || validation.status === "warning",
      message: `Validation ${validation.status}. warnings: ${validation.warnings.length}; errors: ${validation.errors.length}.`
    };
  }
  if (message.command === "importAsset") {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: { "PNG/WebP images": ["png", "webp"] },
      title: `Import asset for ${row.slot.slotLabel}`
    });
    const source = selected?.[0];
    if (!source) {
      return { ok: false, message: "Import canceled." };
    }
    const candidate = importVisualAssetCandidate({
      workspaceRoot: folder.uri.fsPath,
      sourcePath: source.fsPath,
      slot: row.slot,
      approvalStatus: "pending"
    });
    return {
      ok: true,
      message: `Imported ${path.basename(source.fsPath)} to ${candidate.copiedAssetPath}. Candidate is pending approval; assignment remains separate.`,
      refresh: true
    };
  }
  if (message.command === "assignReplacement") {
    const candidate = row.candidate;
    if (!candidate) {
      return { ok: false, message: "No imported candidate is available for assignment." };
    }
    const approvedCandidate: ImportedVisualAssetCandidate = { ...candidate, approvalStatus: "approved" };
    const { result } = assignVisualAssetCandidate({
      workspaceRoot: folder.uri.fsPath,
      slot: row.slot,
      candidate: approvedCandidate
    });
    return {
      ok: result.status !== "blocked",
      message: `${result.message} Changed: ${result.changedFiles.join(", ") || "none"}. Warnings: ${result.warnings.join(" | ") || "none"}. Errors: ${result.errors.join(" | ") || "none"}.`,
      refresh: result.status !== "blocked"
    };
  }
  return { ok: false, message: "Unsupported asset pipeline action." };
}

async function readAssetPipelineWorkspaceFiles(folder: vscode.WorkspaceFolder): Promise<Array<{ relativePath: string; text: string }>> {
  const files: Array<{ relativePath: string; text: string }> = [];
  const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, "{package.json,arena.html,src/**/*.{ts,tsx,js,jsx,json,html,css},assets/**/*.{json,png,webp},public/assets/**/*.{json,png,webp}}"), "**/{node_modules,dist,build,out,.git}/**", 260);
  for (const uri of uris) {
    const relativePath = toWorkspaceRelativePath(folder, uri);
    if (/\.(png|webp)$/i.test(relativePath)) {
      files.push({ relativePath, text: "" });
      continue;
    }
    const text = await readTextFileIfExists(uri);
    if (text !== undefined) {
      files.push({ relativePath, text });
    }
  }
  return files;
}

function renderAssetPipelineDashboardHtml(webview: vscode.Webview, folder: vscode.WorkspaceFolder, model: VisualAssetDashboardModel): string {
  const nonce = createNonce();
  const payload = JSON.stringify(model).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Pipeline Dashboard</title>
  <style nonce="${nonce}">
    :root{color-scheme:light dark;--panel:var(--vscode-editorWidget-background);--border:var(--vscode-panel-border);--text:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--button:var(--vscode-button-background);--button-text:var(--vscode-button-foreground)}
    *{box-sizing:border-box}body{margin:0;padding:18px;color:var(--text);font-family:var(--vscode-font-family);background:var(--vscode-editor-background)}h1,h2,h3,p{margin:0}h1{font-size:21px}h2{font-size:15px}.top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:12px 0}.metric,.card,.preview{border:1px solid var(--border);background:var(--panel);border-radius:8px;padding:12px}.metric b{display:block;font-size:17px}.muted,.meta{color:var(--muted);font-size:12px;line-height:1.45}.toolbar,.actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.surface{display:grid;gap:10px;margin-top:14px}.card{display:grid;gap:10px}.row-head{display:grid;grid-template-columns:1fr auto;gap:12px}.badges{display:flex;flex-wrap:wrap;gap:6px}.badge{border:1px solid var(--border);border-radius:999px;padding:2px 8px;font-size:12px;color:var(--muted)}.valid{color:#89d185}.warning,.fallback_required{color:#dcdcaa}.invalid,.unsupported{color:#f48771}.config_only,.asset_copy_only,.manifest_supported{color:#75beff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px}button{min-height:28px;color:var(--button-text);background:var(--button);border:1px solid transparent;border-radius:4px;padding:3px 10px}button:disabled{opacity:.45}.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}img{max-width:96px;max-height:96px;image-rendering:pixelated;border:1px solid var(--border);background:var(--vscode-editor-background)}.status{white-space:pre-wrap;margin-top:12px}@media(max-width:720px){.top,.row-head{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="top"><div><h1>Asset Pipeline Dashboard</h1><p class="meta">${escapeHtml(model.activeAdapterLabel)} | ${escapeHtml(model.activeAdapter)} | ${escapeHtml(visualAssetDashboardRelativePath)}</p></div><div class="toolbar"><button id="refresh">Refresh</button></div></div>
  <section class="summary">${summaryMetric("Slots", String(model.slots.length))}${summaryMetric("Candidates", String(model.candidates.length))}${summaryMetric("Assignments", String(model.assignments.length))}${summaryMetric("Valid", String(model.statusCounts.valid))}${summaryMetric("Warnings", String(model.statusCounts.warning))}${summaryMetric("Invalid", String(model.statusCounts.invalid))}${summaryMetric("Unvalidated", String(model.statusCounts.unvalidated))}</section>
  <div id="surfaces"></div>
  <div id="status" class="status muted"></div>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const model=${payload};const surfaces=document.getElementById("surfaces"),status=document.getElementById("status");
    const imgSrc=${JSON.stringify(assetPreviewUris(webview, folder, model))};
    function post(command,rowId){vscode.postMessage({command,rowId});}
    function render(){surfaces.textContent="";for(const surfaceId of model.groupedSurfaceIds){const rows=model.rows.filter(row=>row.slot.surfaceId===surfaceId);const section=document.createElement("section");section.className="surface";const title=document.createElement("h2");title.textContent=rows[0]?.slot.surfaceLabel||surfaceId;section.append(title);for(const row of rows){const card=document.createElement("article");card.className="card";const candidate=row.candidate;const assignment=row.assignment;const src=candidate?imgSrc[candidate.copiedAssetPath]:undefined;card.innerHTML='<div class="row-head"><div><h2>'+row.slot.slotLabel+'</h2><div class="meta">'+row.slot.slotId+' | '+row.slot.expectedAssetType+'</div></div><div class="badges"><span class="badge '+row.validation.status+'">'+row.validation.status+'</span><span class="badge '+row.slot.directApplyCapability+'">'+row.slot.directApplyCapability+'</span><span class="badge">'+row.slot.safetyStatus+'</span><span class="badge">runtime: '+(row.runtimeApplied?'applied':'not applied')+'</span></div></div><div class="grid"><div><b>Current</b><p class="meta">'+(row.slot.currentAssetPath||'unknown')+'</p></div><div><b>Imported</b><p class="meta">'+(candidate?candidate.copiedAssetPath:'none')+'</p></div><div><b>Assignment</b><p class="meta">'+(assignment?assignment.assignmentPath:'none')+'</p></div><div><b>Target</b><p class="meta">'+(row.slot.targetConfigPath||row.slot.knownManifestPath||'fallback only')+'</p></div></div>';if(src){const preview=document.createElement("div");preview.className="preview";preview.innerHTML='<img alt="" src="'+src+'"><p class="meta">'+(row.previewMode==='context'?'Simple supported context preview; not runtime applied.':'Basic asset preview card; context unsupported.')+'</p>';card.append(preview);}const actions=document.createElement("div");actions.className="actions";const defs=[['importAsset','Import Asset'],['validateAsset','Validate Asset'],['previewInContext','Preview in Context'],['assignReplacement','Assign Replacement'],['openAssetContract','Open Asset Contract'],['generateFallbackTask','Generate Fallback Task'],['runScopeCheck','Run Scope Check']];for(const [command,label] of defs){const button=document.createElement("button");button.textContent=label;button.className=command==='importAsset'?'':'secondary';button.disabled=!row.actions[command];button.addEventListener("click",()=>post(command,row.rowId));actions.append(button);}card.append(actions);section.append(card);}surfaces.append(section);}}
    document.getElementById("refresh").addEventListener("click",()=>post("refresh"));window.addEventListener("message",event=>{const m=event.data;status.textContent=(m.ok?'OK: ':'Blocked: ')+m.message;});render();
  </script>
</body>
</html>`;
}

function assetPreviewUris(webview: vscode.Webview, folder: vscode.WorkspaceFolder, model: VisualAssetDashboardModel): Record<string, string> {
  const result: Record<string, string> = {};
  for (const candidate of model.candidates) {
    const uri = vscode.Uri.joinPath(folder.uri, ...candidate.copiedAssetPath.split("/"));
    result[candidate.copiedAssetPath] = webview.asWebviewUri(uri).toString();
  }
  return result;
}

function summaryMetric(label: string, value: string): string {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
