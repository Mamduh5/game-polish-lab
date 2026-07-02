import { requiredButtonRuntimeProofProperties } from "./buttonRuntimeStyle";
import { connectStyleOwnerFileToStyleModule } from "./visualStyleBridgePatchUtils";

export function connectButtonOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectStyleOwnerFileToStyleModule({
    text,
    ownerPath,
    styleModulePath,
    importName: "BUTTON_STYLE",
    pollFunctionName: "pollButtonLiveStyle",
    importFileStem: "buttonStyle",
    requiredProperties: requiredButtonRuntimeProofProperties,
    patchExpressions: patchButtonVisualExpressions,
    patchLivePolling: patchButtonLivePolling
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
  patched = patched.replace(
    /(\bvisual\.graphics\.fillStyle\s*\(\s*)fill(\s*,\s*)\d+(?:\.\d+)?(\s*\)\s*;)/g,
    `$1Number(BUTTON_STYLE.fillColor.replace("#", "0x"))$2BUTTON_STYLE.fillOpacity$3`
  );
  patched = patched.replace(
    /(\bvisual\.graphics\.lineStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*)this\.options\.theme\.panelBorder(\s*,\s*)\d+(?:\.\d+)?(\s*\)\s*;)/g,
    `$1BUTTON_STYLE.borderWidth$2Number(BUTTON_STYLE.borderColor.replace("#", "0x"))$3BUTTON_STYLE.fillOpacity$4`
  );
  patched = patched.replace(/\bfontSize\s*:\s*['"]\d+(?:\.\d+)?px['"]/g, "fontSize: String(BUTTON_STYLE.labelTextSize) + 'px'");
  patched = patched.replace(/\bfontSize\s*:\s*\d+(?:\.\d+)?/g, "fontSize: BUTTON_STYLE.labelTextSize");
  patched = patched.replace(/\bconst\s+labelFontSize\s*=\s*[^;\n]+;/g, "const labelFontSize = String(BUTTON_STYLE.labelTextSize) + 'px';");
  patched = patched.replace(/\bfill\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/g, "fill: BUTTON_STYLE.labelColor");
  patched = patched.replace(/\bcolor\s*:\s*theme\.text\b/g, "color: BUTTON_STYLE.labelColor");
  return patched;
}

function patchButtonLivePolling(text: string): string {
  let patched = text;
  if (!/\bpollButtonLiveStyle\s*\(/.test(patched)) {
    patched = patched.replace(
      /(\n\s*(?:create|drawActionBarButton|draw)\s*\([^)]*\)\s*(?::\s*void\s*)?\{)/,
      `$1
    void pollButtonLiveStyle(this.scene?.time?.now ?? Date.now());`
    );
  }

  if (/class\s+GameplayActionBarView\b/.test(patched) && !/buttonLiveStylePollEvent/.test(patched)) {
    patched = patched.replace(
      /(export\s+class\s+GameplayActionBarView\s*\{\n)/,
      "$1  private buttonLiveStylePollEvent?: Phaser.Time.TimerEvent;\n"
    );
    patched = patched.replace(
      /(\n\s*this\.container\s*=\s*container\s*;\n)/,
      "$1    this.startButtonLiveStylePolling();\n"
    );
    patched = patched.replace(
      /(\n\s*destroy\s*\(\)\s*:\s*void\s*\{\n)/,
      "$1    this.buttonLiveStylePollEvent?.remove(false);\n    this.buttonLiveStylePollEvent = undefined;\n"
    );
    patched = patched.replace(
      /(\n\s*private\s+addActionButton\s*\()/,
      `
  private startButtonLiveStylePolling(): void {
    this.buttonLiveStylePollEvent?.remove(false);
    this.buttonLiveStylePollEvent = this.scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        void pollButtonLiveStyle(this.scene.time.now).then((changed) => {
          if (!changed || !this.container?.active) {
            return;
          }

          this.create();
        });
      },
    });
  }
$1`
    );
  }
  return patched;
}
