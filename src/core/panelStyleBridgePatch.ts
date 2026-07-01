import { requiredPanelRuntimeProofProperties } from "./panelRuntimeStyle";
import { connectStyleOwnerFileToStyleModule } from "./visualStyleBridgePatchUtils";

export function connectPanelOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectStyleOwnerFileToStyleModule({
    text,
    ownerPath,
    styleModulePath,
    importName: "PANEL_STYLE",
    importFileStem: "panelStyle",
    requiredProperties: requiredPanelRuntimeProofProperties,
    patchExpressions: patchPanelVisualExpressions
  });
}

function patchPanelVisualExpressions(text: string): string {
  let patched = text;
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.rectangle\s*\(\s*[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*)(0x[0-9a-fA-F]+|\d+|THEME\.[A-Za-z_$][\w$]*)(\s*[,)]\s*)/g,
    `$1Number(PANEL_STYLE.fillColor.replace("#", "0x"))$3`
  );
  patched = patched.replace(
    /(\.setStrokeStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*)(0x[0-9a-fA-F]+|\d+|THEME\.[A-Za-z_$][\w$]*)(\s*[,)]\s*)/g,
    `$1PANEL_STYLE.borderWidth$2Number(PANEL_STYLE.borderColor.replace("#", "0x"))$4`
  );
  patched = patched.replace(/\bconst\s+padding\s*=\s*\d+(?:\.\d+)?\s*;/g, "const padding = PANEL_STYLE.padding;");
  patched = patched.replace(/\bpadding\s*:\s*\d+(?:\.\d+)?/g, "padding: PANEL_STYLE.padding");
  patched = patched.replace(/\bfontSize\s*:\s*['"]\d+(?:\.\d+)?px['"]/g, "fontSize: String(PANEL_STYLE.bodyTextSize) + 'px'");
  return patched;
}
