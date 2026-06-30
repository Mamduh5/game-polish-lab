import * as path from "path";

export function connectFarmSlotOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  if (!/\.(ts|tsx)$/.test(ownerPath)) {
    return undefined;
  }
  const importPath = relativeImportPath(ownerPath, styleModulePath);
  const importLine = `import { FARM_SLOT_STYLE } from "${importPath}";`;
  const lines = text.split(/\r?\n/);
  let patched = text.includes("FARM_SLOT_STYLE") ? text : insertImportLine(lines, importLine);
  if (!patched) {
    return undefined;
  }
  patched = patchFarmSlotVisualExpressions(patched);
  if (!/FARM_SLOT_STYLE\.(slotWidth|slotHeight|gap|fillColor|borderColor|borderWidth|cornerRadius|monsterDisplayScale|monsterVerticalOffset)/.test(patched)) {
    return undefined;
  }
  return patched === text ? undefined : patched;
}

function insertImportLine(lines: string[], importLine: string): string | undefined {
  const lastImportIndex = lines.reduce((latest, line, index) => line.startsWith("import ") ? index : latest, -1);
  if (lastImportIndex < 0) {
    return undefined;
  }
  const nextLines = [...lines];
  nextLines.splice(lastImportIndex + 1, 0, importLine);
  return nextLines.join("\n");
}

function patchFarmSlotVisualExpressions(text: string): string {
  let patched = text;
  const replacements: Array<[RegExp, string]> = [
    [/\bconst\s+slotWidth\s*=\s*\d+(?:\.\d+)?\s*;/, "const slotWidth = FARM_SLOT_STYLE.slotWidth;"],
    [/\bconst\s+slotHeight\s*=\s*\d+(?:\.\d+)?\s*;/, "const slotHeight = FARM_SLOT_STYLE.slotHeight;"],
    [/\bconst\s+gap\s*=\s*\d+(?:\.\d+)?\s*;/, "const gap = FARM_SLOT_STYLE.gap;"],
    [/\bconst\s+borderWidth\s*=\s*\d+(?:\.\d+)?\s*;/, "const borderWidth = FARM_SLOT_STYLE.borderWidth;"],
    [/\bconst\s+cornerRadius\s*=\s*\d+(?:\.\d+)?\s*;/, "const cornerRadius = FARM_SLOT_STYLE.cornerRadius;"]
  ];
  for (const [pattern, replacement] of replacements) {
    patched = patched.replace(pattern, replacement);
  }
  patched = patched.replace(
    /(\b(?:this|scene)\.add\.rectangle\s*\(\s*[^,\n]+,\s*[^,\n]+,\s*)\d+(?:\.\d+)?(\s*,\s*)\d+(?:\.\d+)?(\s*,\s*)(0x[0-9a-fA-F]+|\d+)(\s*\))/,
    `$1FARM_SLOT_STYLE.slotWidth$2FARM_SLOT_STYLE.slotHeight$3Number(FARM_SLOT_STYLE.fillColor.replace("#", "0x"))$5`
  );
  patched = patched.replace(
    /(\.setStrokeStyle\s*\(\s*)\d+(?:\.\d+)?(\s*,\s*)(0x[0-9a-fA-F]+|\d+)(\s*\))/,
    `$1FARM_SLOT_STYLE.borderWidth$2Number(FARM_SLOT_STYLE.borderColor.replace("#", "0x"))$4`
  );
  return patchRealFarmSceneSlotRendering(patched);
}

function patchRealFarmSceneSlotRendering(text: string): string {
  let patched = text;
  patched = patched.replace(
    "this.add.rectangle(x, y, this.cellSize, this.cellSize, THEME.slot)",
    "this.add.rectangle(x, y, FARM_SLOT_STYLE.slotWidth, FARM_SLOT_STYLE.slotHeight, Number(FARM_SLOT_STYLE.fillColor.replace(\"#\", \"0x\")))"
  );
  patched = patched.replace(
    ".setStrokeStyle(3, THEME.slotBorder, 0.9);",
    ".setStrokeStyle(FARM_SLOT_STYLE.borderWidth, Number(FARM_SLOT_STYLE.borderColor.replace(\"#\", \"0x\")), 0.9);"
  );
  patched = patched.replace(
    "this.add.rectangle(x + 8, y + 8, this.cellSize - 16, this.cellSize - 16, THEME.slotInner, 0.22)",
    "this.add.rectangle(x + 8, y + 8, FARM_SLOT_STYLE.slotWidth - 16, FARM_SLOT_STYLE.slotHeight - 16, Number(FARM_SLOT_STYLE.fillColor.replace(\"#\", \"0x\")), FARM_SLOT_STYLE.emptySlotOpacity)"
  );
  patched = patched.replace(
    "const lockedTile = this.add.rectangle(x, y, this.cellSize, this.cellSize, THEME.locked, 0.72)",
    "const lockedTile = this.add.rectangle(x, y, FARM_SLOT_STYLE.slotWidth, FARM_SLOT_STYLE.slotHeight, THEME.locked, FARM_SLOT_STYLE.lockedOverlayOpacity)"
  );
  patched = patched.replace(
    ".setStrokeStyle(3, THEME.lockedBorder, 0.72);",
    ".setStrokeStyle(FARM_SLOT_STYLE.borderWidth, Number(FARM_SLOT_STYLE.borderColor.replace(\"#\", \"0x\")), 0.72);"
  );
  patched = patched.replace(
    "container.add(this.add.rectangle(x + 8, y + 8, this.cellSize - 16, this.cellSize - 16, THEME.lockedInner, 0.22)",
    "container.add(this.add.rectangle(x + 8, y + 8, FARM_SLOT_STYLE.slotWidth - 16, FARM_SLOT_STYLE.slotHeight - 16, THEME.lockedInner, FARM_SLOT_STYLE.lockedOverlayOpacity)"
  );
  patched = patched.replace(
    "const indicatorSize = this.cellSize + dropIndicatorSizePadding;",
    "const indicatorSize = this.cellSize + dropIndicatorSizePadding * FARM_SLOT_STYLE.mergeCandidatePulseScale;"
  );
  patched = patched.replace(
    "const visualScale = Math.min(1, Math.max(0.72, this.cellSize / CELL_SIZE));",
    "const visualScale = Math.min(1, Math.max(0.72, this.cellSize / CELL_SIZE)) * FARM_SLOT_STYLE.monsterDisplayScale;"
  );
  patched = patched.replace(
    "this.monsterRenderer.addMonsterVisual(visual, monster, 0, 0, visualScale);",
    "this.monsterRenderer.addMonsterVisual(visual, monster, 0, FARM_SLOT_STYLE.monsterVerticalOffset, visualScale);"
  );
  return patched;
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
