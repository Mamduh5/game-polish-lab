import { requiredButtonRuntimeProofProperties } from "./buttonRuntimeStyle";
import { connectStyleOwnerFileToStyleModule } from "./visualStyleBridgePatchUtils";

export function connectButtonOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectStyleOwnerFileToStyleModule({
    text,
    ownerPath,
    styleModulePath,
    importName: "BUTTON_STYLE",
    importFileStem: "buttonStyle",
    requiredProperties: requiredButtonRuntimeProofProperties,
    patchExpressions: patchButtonVisualExpressions
  });
}

function patchButtonVisualExpressions(text: string): string {
  let patched = text;
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.rectangle\s*\(\s*[^,\n]+,\s*[^,\n]+,\s*)\d+(?:\.\d+)?(\s*,\s*)\d+(?:\.\d+)?(\s*,\s*)(0x[0-9a-fA-F]+|\d+|THEME\.[A-Za-z_$][\w$]*)(\s*[,)]\s*)/g,
    `$1BUTTON_STYLE.width$2BUTTON_STYLE.height$3Number(BUTTON_STYLE.fillColor.replace("#", "0x"))$5`
  );
  patched = patched.replace(
    /(\.setStrokeStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*)(0x[0-9a-fA-F]+|\d+|THEME\.[A-Za-z_$][\w$]*)(\s*[,)]\s*)/g,
    `$1BUTTON_STYLE.borderWidth$2Number(BUTTON_STYLE.borderColor.replace("#", "0x"))$4`
  );
  patched = patched.replace(/\bfontSize\s*:\s*['"]\d+(?:\.\d+)?px['"]/g, "fontSize: String(BUTTON_STYLE.labelTextSize) + 'px'");
  patched = patched.replace(/\bfontSize\s*:\s*\d+(?:\.\d+)?/g, "fontSize: BUTTON_STYLE.labelTextSize");
  patched = patched.replace(/\bfill\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/g, "fill: BUTTON_STYLE.labelColor");
  return patched;
}
