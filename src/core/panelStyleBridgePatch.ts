import { requiredPanelRuntimeProofProperties } from "./panelRuntimeStyle";
import { connectStyleOwnerFileToStyleModule } from "./visualStyleBridgePatchUtils";

export function connectPanelOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectStyleOwnerFileToStyleModule({
    text,
    ownerPath,
    styleModulePath,
    importName: "PANEL_STYLE",
    pollFunctionName: "pollPanelLiveStyle",
    importFileStem: "panelStyle",
    requiredProperties: requiredPanelRuntimeProofProperties,
    patchExpressions: patchPanelVisualExpressions,
    patchLivePolling: patchPanelLivePolling
  });
}

function patchPanelVisualExpressions(text: string): string {
  let patched = text;
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.rectangle\s*\(\s*[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*[^,\n]+,\s*)(0x[0-9a-fA-F]+|\d+|THEME\.[A-Za-z_$][\w$]*)(\s*[,)]\s*)/g,
    `$1Number(PANEL_STYLE.fillColor.replace("#", "0x"))$3`
  );
  patched = patched.replace(
    /(\bscene\.add\.rectangle\s*\(\s*0\s*,\s*0\s*,\s*width\s*,\s*height\s*,\s*)fill(\s*,\s*)\d+(?:\.\d+)?(\s*\))/g,
    `$1Number(PANEL_STYLE.fillColor.replace("#", "0x"))$2PANEL_STYLE.fillOpacity$3`
  );
  patched = patched.replace(
    /(\.setStrokeStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*)(0x[0-9a-fA-F]+|\d+|THEME\.[A-Za-z_$][\w$]*)(\s*[,)]\s*)/g,
    `$1PANEL_STYLE.borderWidth$2Number(PANEL_STYLE.borderColor.replace("#", "0x"))$4`
  );
  patched = patched.replace(
    /(\.setStrokeStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*)border(\s*,\s*)\d+(?:\.\d+)?(\s*\))/g,
    `$1PANEL_STYLE.borderWidth$2Number(PANEL_STYLE.borderColor.replace("#", "0x"))$3PANEL_STYLE.fillOpacity$4`
  );
  patched = patched.replace(/\bconst\s+padding\s*=\s*\d+(?:\.\d+)?\s*;/g, "const padding = PANEL_STYLE.padding;");
  patched = patched.replace(/\bpadding\s*:\s*\d+(?:\.\d+)?/g, "padding: PANEL_STYLE.padding");
  patched = patched.replace(/\bfontSize\s*:\s*['"]\d+(?:\.\d+)?px['"]/g, "fontSize: String(PANEL_STYLE.bodyTextSize) + 'px'");
  return patched;
}

function patchPanelLivePolling(text: string): string {
  let patched = text;
  if (!/\bpollPanelLiveStyle\s*\(/.test(patched)) {
    patched = patched.replace(
      /(\n\s*(?:export\s+)?function\s+addPanelBackground\s*\([^)]*\)[^{]*\{)/,
      `$1
  void pollPanelLiveStyle(scene.time.now);`
    );
  }
  if (/const\s+panelBackground\s*=/.test(patched) && !/startPanelLiveStylePolling/.test(patched)) {
    patched = patched.replace(
      /(\n\s*panel\.add\(panelBackground\);\n)/,
      `$1
  startPanelLiveStylePolling(scene, panelBackground);
`
    );
    patched = patched.replace(
      /\n}\s*$/,
      `
}

function startPanelLiveStylePolling(scene: Phaser.Scene, panelBackground: Phaser.GameObjects.Rectangle): void {
  const pollEvent = scene.time.addEvent({
    delay: 300,
    loop: true,
    callback: () => {
      if (!panelBackground.active) {
        pollEvent.remove(false);
        return;
      }

      void pollPanelLiveStyle(scene.time.now).then((changed) => {
        if (!changed || !panelBackground.active) {
          return;
        }

        panelBackground.setFillStyle(Number(PANEL_STYLE.fillColor.replace("#", "0x")), PANEL_STYLE.fillOpacity);
        panelBackground.setStrokeStyle(PANEL_STYLE.borderWidth, Number(PANEL_STYLE.borderColor.replace("#", "0x")), 0.78);
      });
    },
  });
}
`
    );
  }
  return patched;
}
