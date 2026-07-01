import { requiredRewardToastRuntimeProofProperties } from "./rewardToastRuntimeStyle";
import { connectStyleOwnerFileToStyleModule } from "./visualStyleBridgePatchUtils";

export function connectRewardToastOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectStyleOwnerFileToStyleModule({
    text,
    ownerPath,
    styleModulePath,
    importName: "REWARD_TOAST_STYLE",
    importFileStem: "rewardToastStyle",
    requiredProperties: requiredRewardToastRuntimeProofProperties,
    patchExpressions: patchRewardToastVisualExpressions
  });
}

function patchRewardToastVisualExpressions(text: string): string {
  let patched = text;
  patched = patched.replace(/\bduration\s*:\s*\d+(?:\.\d+)?/g, "duration: REWARD_TOAST_STYLE.durationMs");
  patched = patched.replace(/\bease\s*:\s*['"][^'"]+['"]/g, "ease: REWARD_TOAST_STYLE.bounceStrength > 0 ? 'Back.easeOut' : 'Quad.easeOut'");
  patched = patched.replace(/\by\s*:\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*-\s*\d+(?:\.\d+)?/g, "y: $1 - REWARD_TOAST_STYLE.riseDistance");
  patched = patched.replace(/\bscale\s*:\s*\d+(?:\.\d+)?/g, "scale: REWARD_TOAST_STYLE.peakScale");
  patched = patched.replace(/\bfontSize\s*:\s*['"]\d+(?:\.\d+)?px['"]/g, "fontSize: String(REWARD_TOAST_STYLE.textSize) + 'px'");
  patched = patched.replace(/\bfontSize\s*:\s*\d+(?:\.\d+)?/g, "fontSize: REWARD_TOAST_STYLE.textSize");
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.text\s*\(\s*[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*\{[^}]*?fontSize\s*:\s*)['"]\d+(?:\.\d+)?px['"]/gs,
    "$1String(REWARD_TOAST_STYLE.textSize) + 'px'"
  );
  return patched;
}
