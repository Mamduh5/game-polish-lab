import * as vscode from "vscode";

import { logCommandEnd, logCommandStart, logError } from "../core/output";
import { discoverVisualRollbackSnapshots, restoreVisualRollbackSnapshot } from "../core/visualRollback";
import { requireWorkspaceFolder } from "../core/workspace";
import { VisualRollbackRestoreResult, VisualRollbackSnapshot } from "../types/visualRollback";

interface RollbackHistoryMessage {
  command: "restore" | "refresh";
  snapshotId?: string;
}

export async function openRollbackHistory(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.openRollbackHistory", folder.uri.fsPath);

  try {
    let statusMessage = "";
    const panel = vscode.window.createWebviewPanel("gamePolishLab.rollbackHistory", "Rollback History", vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folder.uri]
    });
    const render = () => {
      const discovery = discoverVisualRollbackSnapshots(folder.uri.fsPath);
      panel.webview.html = renderRollbackHistoryHtml(discovery.snapshots, discovery.warnings, statusMessage);
    };
    render();
    panel.webview.onDidReceiveMessage(async (message: RollbackHistoryMessage) => {
      try {
        if (message.command === "refresh") {
          statusMessage = `Rollback history refreshed at ${new Date().toLocaleString()}.`;
          render();
          return;
        }
        if (message.command === "restore" && message.snapshotId) {
          const result = restoreVisualRollbackSnapshot(folder.uri.fsPath, { snapshotId: message.snapshotId });
          statusMessage = summarizeRestoreResult(result);
          const severity = result.status === "blocked" ? "warn" : "info";
          if (severity === "warn") {
            vscode.window.showWarningMessage(statusMessage);
          } else {
            vscode.window.showInformationMessage(statusMessage);
          }
          render();
        }
      } catch (error) {
        statusMessage = `Rollback action failed: ${errorToMessage(error)}`;
        render();
      }
    });
  } catch (error) {
    logError("open rollback history failed:", error);
    vscode.window.showErrorMessage(`Failed to open rollback history: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.openRollbackHistory");
  }
}

function renderRollbackHistoryHtml(snapshots: VisualRollbackSnapshot[], warnings: string[], statusMessage: string): string {
  const nonce = createNonce();
  const generatedAt = new Date().toLocaleString();
  const payload = JSON.stringify({ snapshots, warnings, statusMessage, generatedAt }).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rollback History</title>
  <style nonce="${nonce}">
    :root{color-scheme:light dark;--panel:var(--vscode-editorWidget-background);--border:var(--vscode-panel-border);--text:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--button:var(--vscode-button-background);--button-text:var(--vscode-button-foreground);--focus:var(--vscode-focusBorder)}
    *{box-sizing:border-box}body{margin:0;padding:18px;color:var(--text);font-family:var(--vscode-font-family);background:var(--vscode-editor-background)}h1,h2,p{margin:0}h1{font-size:21px}h2{font-size:15px}.top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin-bottom:14px}.meta,.status{color:var(--muted);font-size:12px;line-height:1.45}.rows{display:grid;gap:10px}.card,.empty{border:1px solid color-mix(in srgb,var(--border) 72%,transparent);background:var(--panel);border-radius:8px;padding:12px}.card{display:grid;gap:10px}.head{display:grid;grid-template-columns:1fr auto;gap:12px}.badges,.actions{display:flex;flex-wrap:wrap;gap:7px}.badge{border:1px solid color-mix(in srgb,var(--border) 68%,transparent);border-radius:999px;padding:2px 8px;font-size:12px;color:var(--muted);background:color-mix(in srgb,var(--panel) 82%,var(--vscode-editor-background))}.safe{color:#89d185;border-color:color-mix(in srgb,#89d185 45%,transparent)}.warn{color:#dcdcaa;border-color:color-mix(in srgb,#dcdcaa 45%,transparent)}.block{color:#f48771;border-color:color-mix(in srgb,#f48771 45%,transparent)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:7px}.file{border-top:1px solid color-mix(in srgb,var(--border) 70%,transparent);padding-top:8px}button{min-height:28px;color:var(--button-text);background:var(--button);border:1px solid transparent;border-radius:4px;padding:3px 10px;transition:background-color .12s ease,border-color .12s ease,transform .08s ease,opacity .12s ease}button:hover:not(:disabled){background:var(--vscode-button-hoverBackground);border-color:color-mix(in srgb,var(--focus) 45%,transparent)}button:focus-visible{outline:1px solid var(--focus);outline-offset:2px}button:active:not(:disabled){transform:translateY(1px)}button:disabled{opacity:.52;cursor:not-allowed}.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}.secondary:hover:not(:disabled){background:var(--vscode-button-secondaryHoverBackground)}.status{white-space:pre-wrap;margin-top:12px}@media(max-width:720px){.top,.head{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="top"><div><h1>Rollback History</h1><p class="meta">Safe restore is limited to Game Polish Lab-owned visual files. Suspicious source or bridge files become fallback tasks.</p></div><button id="refresh" class="secondary">Refresh</button></div>
  <section id="rows" class="rows"></section>
  <div id="status" class="status">Last refreshed ${escapeHtml(generatedAt)}</div>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const data=${payload};const rows=document.getElementById("rows"),status=document.getElementById("status");
    function counts(snapshot){const all=snapshot.files||[];return {safe:all.filter(f=>f.scopeClassification.classification==="safe").length,warn:all.filter(f=>f.scopeClassification.classification==="suspicious"||f.scopeClassification.classification==="unknown").length,block:all.filter(f=>f.scopeClassification.classification==="forbidden").length,eligible:all.filter(f=>f.restoreEligible).length};}
    function text(value){return value||"unknown";}
    function render(){rows.textContent="";status.textContent=[data.statusMessage||("Last refreshed "+data.generatedAt),...(data.warnings||[]).map(w=>"warning: "+w)].filter(Boolean).join("\\n");if(!data.snapshots.length){const empty=document.createElement("div");empty.className="empty meta";empty.textContent="No rollback snapshots found. Tune a surface and save/apply through a guarded workflow before rollback history can restore anything.";rows.append(empty);return;}for(const snapshot of data.snapshots){const c=counts(snapshot);const card=document.createElement("article");card.className="card";card.innerHTML='<div class="head"><div><h2>'+snapshot.id+'</h2><p class="meta">'+text(snapshot.createdAt)+' | '+text(snapshot.adapterId)+' | '+text(snapshot.surfaceType)+' | '+text(snapshot.targetId||snapshot.targetLabel)+'</p></div><div class="badges"><span class="badge safe">safe '+c.safe+'</span><span class="badge warn">warn '+c.warn+'</span><span class="badge block">blocked '+c.block+'</span><span class="badge">files '+snapshot.files.length+'</span></div></div>';const grid=document.createElement("div");grid.className="grid";for(const file of snapshot.files){const item=document.createElement("div");item.className="file";item.innerHTML='<b>'+file.fileKind+'</b><p class="meta">'+file.originalPath+'</p><p class="meta">snapshot: '+file.snapshotPath+'</p><p class="meta">'+file.scopeClassification.classification+' | '+file.scopeClassification.reasonCode+'</p><p class="meta">'+(file.restoreEligible?'eligible':'fallback/block required')+'</p>';grid.append(item);}card.append(grid);const actions=document.createElement("div");actions.className="actions";const restore=document.createElement("button");restore.textContent=c.eligible>0?"Restore Eligible Files":"Create Fallback / Inspect";restore.disabled=snapshot.files.length===0;restore.title=c.eligible>0?"Restore safe visual files only":"No safe auto-restore files; a fallback task may be created for suspicious files";restore.addEventListener("click",()=>{restore.disabled=true;status.textContent="Restoring eligible visual files from "+snapshot.id+"...";vscode.postMessage({command:"restore",snapshotId:snapshot.id});});actions.append(restore);card.append(actions);rows.append(card);}}
    document.getElementById("refresh").addEventListener("click",event=>{event.currentTarget.disabled=true;status.textContent="Refreshing rollback history...";vscode.postMessage({command:"refresh"});});render();
  </script>
</body>
</html>`;
}

function summarizeRestoreResult(result: VisualRollbackRestoreResult): string {
  const parts = [
    `Rollback ${result.snapshotId}: ${result.status}. Safe visual files restore automatically; guarded files remain skipped or blocked.`,
    `restored ${result.restoredFiles.length}`,
    `skipped ${result.skippedFiles.length}`,
    `blocked ${result.blockedFiles.length}`
  ];
  if (result.fallbackTaskPath) {
    parts.push(`fallback task ${result.fallbackTaskPath}`);
  }
  if (result.errors.length > 0) {
    parts.push(`errors: ${result.errors.join("; ")}`);
  }
  return parts.join(" ");
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
