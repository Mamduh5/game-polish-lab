import { requiredRewardToastRuntimeProofProperties } from "./rewardToastRuntimeStyle";
import { connectStyleOwnerFileToStyleModule } from "./visualStyleBridgePatchUtils";

export function connectRewardToastOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectStyleOwnerFileToStyleModule({
    text,
    ownerPath,
    styleModulePath,
    importName: "REWARD_TOAST_STYLE",
    pollFunctionName: "pollRewardToastLiveStyle",
    importFileStem: "rewardToastStyle",
    requiredProperties: requiredRewardToastRuntimeProofProperties,
    patchExpressions: patchRewardToastVisualExpressions,
    patchLivePolling: patchRewardToastLivePolling
  });
}

function patchRewardToastVisualExpressions(text: string): string {
  let patched = text;
  patched = patched.replace(/\bconst\s+fillColor\s*=\s*this\.getFillColor\s*\(\s*variant\s*\)\s*;/g, `const fillColor = Number(REWARD_TOAST_STYLE.toastFillColor.replace("#", "0x"));`);
  patched = patched.replace(/\bconst\s+borderColor\s*=\s*[^;\n]+;/g, `const borderColor = Number(REWARD_TOAST_STYLE.toastBorderColor.replace("#", "0x"));`);
  patched = patched.replace(/(\.setStrokeStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*borderColor\s*,)/g, "$1REWARD_TOAST_STYLE.toastBorderWidth$2");
  patched = patched.replace(/(\bscene\.add\.rectangle\s*\([^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*fillColor\s*,\s*)\d+(?:\.\d+)?(\s*\))/g, "$1REWARD_TOAST_STYLE.toastFillOpacity$2");
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

function patchRewardToastLivePolling(text: string): string {
  let patched = text;
  if (!/\bpollRewardToastLiveStyle\s*\(/.test(patched)) {
    patched = patched.replace(
      /(\n\s*show(?:Reward)?\s*\([^)]*\)\s*(?::\s*void\s*)?\{)/,
      `$1
    void pollRewardToastLiveStyle(this.scene?.time?.now ?? Date.now());`
    );
  }

  if (/this\.toastContainer\s*=\s*container\s*;/.test(patched) && !/startRewardToastLiveStylePolling/.test(patched)) {
    patched = patched.replace(
      "    this.toastContainer = container;\n",
      "    this.toastContainer = container;\n    this.startRewardToastLiveStylePolling(background, text);\n"
    );
    patched = patched.replace(
      /(\n\s*clear\s*\(\)\s*:\s*void\s*\{[\s\S]*?\n\s*\})/,
      `$1

  private startRewardToastLiveStylePolling(
    background: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text,
  ): void {
    const pollEvent = this.scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        if (!background.active) {
          pollEvent.remove(false);
          return;
        }

        void pollRewardToastLiveStyle(this.scene.time.now).then((changed) => {
          if (!changed || !background.active) {
            return;
          }

          background.setFillStyle(Number(REWARD_TOAST_STYLE.toastFillColor.replace("#", "0x")), REWARD_TOAST_STYLE.toastFillOpacity);
          background.setStrokeStyle(REWARD_TOAST_STYLE.toastBorderWidth, Number(REWARD_TOAST_STYLE.toastBorderColor.replace("#", "0x")), 0.95);
          text.setFontSize(REWARD_TOAST_STYLE.textSize);
        });
      },
    });
  }`
    );
  }
  return patched;
}
