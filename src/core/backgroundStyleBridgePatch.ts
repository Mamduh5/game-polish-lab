import * as path from "path";

import { requiredBackgroundRuntimeProofProperties } from "./backgroundRuntimeStyle";
import { detectBackgroundConnectionType } from "./backgroundAdapterAnalysis";

export function connectBackgroundOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  if (detectBackgroundConnectionType(text, styleModulePath) === "style_module" && hasRequiredRuntimeUsage(text)) {
    return text;
  }
  if (!/\.(ts|tsx)$/.test(ownerPath)) {
    return undefined;
  }

  const importPath = relativeImportPath(ownerPath, styleModulePath);
  const importLine = `import { BACKGROUND_READABILITY_STYLE, pollBackgroundReadabilityLiveStyle } from '${importPath}';`;
  const lines = text.split(/\r?\n/);

  let patched = hasBackgroundStyleImport(text) ? text : insertImportLine(lines, importLine);
  if (!patched) {
    return undefined;
  }
  if (hasImportInsertedInsideMultilineImport(patched)) {
    return undefined;
  }

  patched = patchBackgroundVisualExpressions(patched);
  patched = patchBackgroundLivePolling(patched);

  if (hasImportInsertedInsideMultilineImport(patched) || !hasRequiredRuntimeUsage(patched)) {
    return undefined;
  }
  return patched === text ? undefined : patched;
}

function hasBackgroundStyleImport(text: string): boolean {
  return /import\s*\{[^}]*\bBACKGROUND_READABILITY_STYLE\b[^}]*\}\s*from\s*['"][^'"]*backgroundReadabilityStyle['"]\s*;/.test(text);
}

function insertImportLine(lines: string[], importLine: string): string | undefined {
  const insertAfterLine = findLastCompleteTopLevelImportLine(lines);
  if (insertAfterLine < 0) {
    return undefined;
  }
  const nextLines = [...lines];
  nextLines.splice(insertAfterLine + 1, 0, importLine);
  return nextLines.join("\n");
}

function findLastCompleteTopLevelImportLine(lines: string[]): number {
  let inImportBlock = false;
  let lastCompleteImportLine = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!inImportBlock) {
      if (trimmed.length === 0 || trimmed.startsWith("//")) {
        continue;
      }
      if (!trimmed.startsWith("import ")) {
        continue;
      }
      if (trimmed.endsWith(";")) {
        lastCompleteImportLine = index;
        continue;
      }
      inImportBlock = true;
      continue;
    }

    if (trimmed.endsWith(";")) {
      lastCompleteImportLine = index;
      inImportBlock = false;
    }
  }

  return lastCompleteImportLine;
}

function hasImportInsertedInsideMultilineImport(text: string): boolean {
  const lines = text.split(/\r?\n/);
  let inImportBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inImportBlock) {
      if (trimmed.startsWith("import ") && !trimmed.endsWith(";")) {
        inImportBlock = true;
      }
      continue;
    }
    if (trimmed.startsWith("import ")) {
      return true;
    }
    if (trimmed.endsWith(";")) {
      inImportBlock = false;
    }
  }

  return false;
}

function patchBackgroundVisualExpressions(text: string): string {
  let patched = text;
  patched = patched.replace(
    /import\s*\{\s*BACKGROUND_READABILITY_STYLE\s*\}\s*from\s*(['"][^'"]*backgroundReadabilityStyle['"])\s*;/,
    "import { BACKGROUND_READABILITY_STYLE, pollBackgroundReadabilityLiveStyle } from $1;"
  );
  patched = patched.replace(
    /(\b(?:this|scene)\.cameras\.main\.setBackgroundColor\s*\(\s*)([^)\n]+)(\s*\))/g,
    `$1BACKGROUND_READABILITY_STYLE.backgroundColor$3`
  );
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.rectangle\s*\(\s*0\s*,\s*0\s*,\s*[^,\n]+,\s*[^,\n]+,\s*)(0x[0-9a-fA-F]+|\d+)(\s*[,)]\s*)/g,
    `$1Number(BACKGROUND_READABILITY_STYLE.backgroundColor.replace("#", "0x"))$3`
  );
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.rectangle\s*\(\s*0\s*,\s*0\s*,\s*[^,\n]+,\s*[^,\n]+,\s*)THEME\.(bg|background|backdrop|ground|sky|world)(\s*[,)]\s*)/gi,
    `$1Number(BACKGROUND_READABILITY_STYLE.backgroundColor.replace("#", "0x"))$3`
  );
  patched = patched.replace(
    /(\.fillStyle\s*\(\s*)THEME\.(bg|background|backdrop|ground|sky|world)(\s*,\s*)(\d+(?:\.\d+)?)(\s*\))/gi,
    `$1Number(BACKGROUND_READABILITY_STYLE.backgroundColor.replace("#", "0x"))$3$4$5`
  );
  return patched;
}

function patchBackgroundLivePolling(text: string): string {
  let patched = text;
  if (/\bprivate\s+pollBackgroundReadabilityLiveStyle\s*\(/.test(patched)) {
    return patched;
  }

  patched = patched.replace(
    /(\n\s*private\s+pollFarmSlotLiveStyle\s*\(\)\s*:\s*void\s*\{[\s\S]*?\n\s*\})/,
    `$1

  private pollBackgroundReadabilityLiveStyle(): void {
    void pollBackgroundReadabilityLiveStyle(this.time.now).then((changed) => {
      if (!changed || !this.scene.isActive()) {
        return;
      }

      this.createFarmBackground();
    });
  }`
  );
  if (!/\bprivate\s+pollBackgroundReadabilityLiveStyle\s*\(/.test(patched)) {
    patched = patched.replace(
      /(\n\s*update\s*\([^)]*\)\s*:\s*void\s*\{[\s\S]*?\n\s*\})/,
      `$1

  private pollBackgroundReadabilityLiveStyle(): void {
    void pollBackgroundReadabilityLiveStyle(this.time.now).then((changed) => {
      if (!changed || !this.scene.isActive()) {
        return;
      }

      this.createFarmBackground();
    });
  }`
    );
  }
  if (!/\bprivate\s+pollBackgroundReadabilityLiveStyle\s*\(/.test(patched)) {
    patched = patched.replace(
      /\n}\s*$/,
      `

  update(): void {
    this.pollBackgroundReadabilityLiveStyle();
  }

  private pollBackgroundReadabilityLiveStyle(): void {
    void pollBackgroundReadabilityLiveStyle(this.time.now).then((changed) => {
      if (!changed || !this.scene.isActive()) {
        return;
      }

      this.create();
    });
  }
}
`
    );
  }
  if (!/\bthis\.pollBackgroundReadabilityLiveStyle\s*\(\s*\)\s*;/.test(patched)) {
    patched = patched.replace(
      /(\n\s*this\.pollFarmSlotLiveStyle\s*\(\s*\);\s*)/,
      `$1    this.pollBackgroundReadabilityLiveStyle();
`
    );
  }
  return patched;
}

function hasRequiredRuntimeUsage(text: string): boolean {
  return requiredBackgroundRuntimeProofProperties.every((property) => new RegExp(`\\bBACKGROUND_READABILITY_STYLE\\s*\\.\\s*${property}\\b`).test(text));
}

function relativeImportPath(fromPath: string, toPath: string): string {
  const fromDir = path.posix.dirname(fromPath.replace(/\\/g, "/"));
  const target = toPath.replace(/\\/g, "/").replace(/\.ts$/, "");
  let relativePath = path.posix.relative(fromDir, target);
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}
