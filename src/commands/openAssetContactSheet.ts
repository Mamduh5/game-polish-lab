import * as vscode from "vscode";

import { refreshVisualAssetContracts } from "../core/visualAssetContracts";
import { buildVisualAssetContactSheet, resolveContactSheetAssetPreviewPath } from "../core/visualAssetContactSheet";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { requireWorkspaceFolder } from "../core/workspace";
import { VisualAssetContactSheet, VisualAssetContactSheetItem } from "../types/visualAssetContactSheet";

interface ContactSheetMessage {
  command: "refreshAssetContracts";
}

interface ContactSheetRenderItem extends VisualAssetContactSheetItem {
  imageUri?: string;
}

interface ContactSheetRenderGroup extends Omit<VisualAssetContactSheet["groups"][number], "items"> {
  items: ContactSheetRenderItem[];
}

interface ContactSheetRenderModel extends Omit<VisualAssetContactSheet, "groups"> {
  groups: ContactSheetRenderGroup[];
}

export async function openAssetContactSheet(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.openAssetContactSheet", folder.uri.fsPath);
  try {
    const panel = vscode.window.createWebviewPanel("gamePolishLab.assetContactSheet", "Asset Contact Sheet", vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [folder.uri]
    });
    panel.webview.html = renderContactSheetHtml(await buildRenderModel(folder, panel.webview), panel.webview);
    panel.webview.onDidReceiveMessage(async (message: ContactSheetMessage) => {
      if (message.command !== "refreshAssetContracts") {
        return;
      }
      const result = await refreshVisualAssetContracts(folder.uri.fsPath);
      const counts = result.statusCounts;
      logInfo(`asset contracts refreshed from contact sheet: valid ${counts.valid}, warnings ${counts.warning}, invalid ${counts.invalid}, missing ${counts.missing}, unknown ${counts.unknown}`);
      panel.webview.html = renderContactSheetHtml(await buildRenderModel(folder, panel.webview), panel.webview);
    });
  } catch (error) {
    logError("open asset contact sheet failed:", error);
    vscode.window.showErrorMessage(`Failed to open asset contact sheet. Refresh asset contracts first if the contract file is missing or malformed. ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.openAssetContactSheet");
  }
}

async function buildRenderModel(folder: vscode.WorkspaceFolder, webview: vscode.Webview): Promise<ContactSheetRenderModel> {
  const sheet = await buildVisualAssetContactSheet(folder.uri.fsPath);
  return {
    ...sheet,
    groups: sheet.groups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const previewPath = resolveContactSheetAssetPreviewPath(folder.uri.fsPath, item.assetPath);
        return {
          ...item,
          imageUri: previewPath ? webview.asWebviewUri(vscode.Uri.file(previewPath)).toString() : undefined
        };
      })
    }))
  };
}

function renderContactSheetHtml(model: ContactSheetRenderModel, webview: vscode.Webview): string {
  const nonce = createNonce();
  const payload = JSON.stringify(model).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Contact Sheet</title>
  <style nonce="${nonce}">
    :root{color-scheme:light dark;--panel:var(--vscode-editorWidget-background);--border:var(--vscode-panel-border);--text:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--button:var(--vscode-button-background);--buttonText:var(--vscode-button-foreground);--secondary:var(--vscode-button-secondaryBackground);--secondaryText:var(--vscode-button-secondaryForeground)}
    *{box-sizing:border-box}body{margin:0;padding:18px;font-family:var(--vscode-font-family);color:var(--text);background:var(--vscode-editor-background)}h1,h2,h3,p{margin:0}h1{font-size:21px}h2{font-size:15px}h3{font-size:13px}.top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin-bottom:14px}.meta,.muted{color:var(--muted);font-size:12px;line-height:1.45}.toolbar{display:flex;gap:8px;align-items:center}button{min-height:28px;border:1px solid transparent;border-radius:4px;padding:3px 10px;color:var(--buttonText);background:var(--button)}.secondary{color:var(--secondaryText);background:var(--secondary)}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:14px}.metric,.notice,.group,.item{border:1px solid var(--border);background:var(--panel);border-radius:8px}.metric{padding:11px}.metric b{display:block;font-size:17px}.notice{padding:12px;margin-bottom:14px}.groups{display:grid;gap:14px}.group{padding:12px}.group-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.item{padding:10px;display:grid;gap:9px}.preview-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.preview,.mockup{min-height:132px;border:1px solid var(--border);border-radius:6px;display:grid;place-items:center;overflow:hidden;background:var(--vscode-editor-background)}.preview img{max-width:100%;max-height:128px;image-rendering:auto}.placeholder{color:var(--muted);font-size:12px;text-align:center;padding:10px}.slot-card{width:112px;height:112px;border:3px solid #8f6b3d;border-radius:8px;background:#3f2f22;display:grid;place-items:center;box-shadow:0 0 0 2px rgba(255,255,255,.08) inset}.slot-card img{max-width:82px;max-height:82px;image-rendering:auto}.panel-mock{width:130px;height:86px;border:2px solid #67809f;border-radius:8px;background:#26313f;display:grid;place-items:center;padding:10px}.reward-mock{width:108px;height:58px;border:2px solid #d2b35f;border-radius:999px;background:#3b3042;display:grid;place-items:center}.panel-mock img,.reward-mock img{max-width:48px;max-height:48px}.badges{display:flex;flex-wrap:wrap;gap:6px}.badge{border:1px solid var(--border);border-radius:999px;padding:2px 8px;font-size:12px;color:var(--muted)}.valid{color:#89d185}.warning,.unknown{color:#dcdcaa}.invalid,.missing{color:#f48771}ul{margin:0;padding-left:18px}.details{display:grid;gap:2px}@media(max-width:720px){.top,.preview-row{grid-template-columns:1fr}.group-head{display:grid}}
  </style>
</head>
<body>
  <div class="top"><div><h1>Asset Contact Sheet</h1><p class="meta">${escapeHtml(model.sourceContractPath)} | ${escapeHtml(model.sourceStatus)} | ${escapeHtml(model.generatedAt)}</p></div><div class="toolbar"><button id="refreshContracts" class="secondary">Refresh Asset Contracts</button></div></div>
  <section class="summary"><div class="metric"><span class="muted">Groups</span><b>${model.groups.length}</b></div><div class="metric"><span class="muted">Assets</span><b>${model.groups.reduce((sum, group) => sum + group.items.length, 0)}</b></div><div class="metric"><span class="muted">Present</span><b>${model.groups.reduce((sum, group) => sum + group.items.filter((item) => item.assetExists).length, 0)}</b></div><div class="metric"><span class="muted">State</span><b>${escapeHtml(model.state)}</b></div></section>
  ${model.warnings.length > 0 ? `<section class="notice"><b>Contract warnings</b><ul>${model.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></section>` : ""}
  <section id="groups" class="groups"></section>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const model=${payload};const groups=document.getElementById("groups");
    document.getElementById("refreshContracts").addEventListener("click",()=>vscode.postMessage({command:"refreshAssetContracts"}));
    function text(v){return v===undefined||v===null||v===""?"unknown":String(v);}
    function el(tag,cls,body){const node=document.createElement(tag);if(cls)node.className=cls;if(body!==undefined)node.textContent=body;return node;}
    function imageOrPlaceholder(item,label){const box=el("div","preview");if(item.imageUri){const img=document.createElement("img");img.src=item.imageUri;img.alt=label;box.append(img);}else{box.append(el("div","placeholder",item.assetPath?"Missing: "+item.assetPath:(item.assetGlob?"No concrete path\\n"+item.assetGlob:"No asset path")));}return box;}
    function mockup(item,context){const box=el("div","mockup");if(context.type==="slot_card"){const card=el("div","slot-card");if(item.imageUri){const img=document.createElement("img");img.src=item.imageUri;img.alt=item.previewLabel;card.append(img);}else{card.append(el("div","placeholder",item.assetSlotId));}box.append(card);return box;}if(context.type==="panel"){const panel=el("div","panel-mock");if(item.imageUri){const img=document.createElement("img");img.src=item.imageUri;img.alt=item.previewLabel;panel.append(img);}else{panel.append(el("div","placeholder",item.assetSlotId));}box.append(panel);return box;}if(context.type==="reward_icon"){const reward=el("div","reward-mock");if(item.imageUri){const img=document.createElement("img");img.src=item.imageUri;img.alt=item.previewLabel;reward.append(img);}else{reward.append(el("div","placeholder",item.assetSlotId));}box.append(reward);return box;}return imageOrPlaceholder(item,context.label);}
    function renderItem(item){const card=el("article","item");const head=el("div","");head.append(el("h3","",item.previewLabel));head.append(el("p","meta",item.assetSlotId));card.append(head);const badges=el("div","badges");badges.append(el("span","badge "+item.validationStatus,item.validationStatus));badges.append(el("span","badge",item.assetExists?"present":"missing"));badges.append(el("span","badge",text(item.format)));card.append(badges);const previews=el("div","preview-row");const raw=imageOrPlaceholder(item,"Raw asset");previews.append(raw);const context=(item.mockupContexts||[]).find(c=>c.type!=="raw_asset")||(item.mockupContexts||[])[0];previews.append(context?mockup(item,context):imageOrPlaceholder(item,"Preview"));card.append(previews);const details=el("div","details meta");details.append(el("span","","expected: "+text(item.expectedWidth)+" x "+text(item.expectedHeight)));details.append(el("span","","actual: "+text(item.actualWidth)+" x "+text(item.actualHeight)));details.append(el("span","","alpha: "+text(item.transparencyStatus)));details.append(el("span","",item.assetPath||item.assetGlob||"no path"));card.append(details);const messages=[...(item.warnings||[]).map(v=>"warning: "+v),...(item.errors||[]).map(v=>"error: "+v)];if(messages.length){const list=el("ul","meta");messages.forEach(message=>list.append(el("li","",message)));card.append(list);}return card;}
    function render(){if(!model.groups.length){groups.append(el("section","notice",model.sourceStatus==="missing"?"No asset contract file exists yet. Refresh contracts to create one.":"No contact sheet items are available."));return;}for(const group of model.groups){const section=el("section","group");const header=el("div","group-head");const title=el("div");title.append(el("h2","",group.targetLabel||group.targetId));title.append(el("p","meta",[group.adapterId||"unknown_adapter",group.targetSurfaceType,group.targetId].join(" | ")));header.append(title);header.append(el("span","badge",group.items.length+" slots"));section.append(header);const grid=el("div","grid");group.items.forEach(item=>grid.append(renderItem(item)));section.append(grid);groups.append(section);}}
    render();
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
