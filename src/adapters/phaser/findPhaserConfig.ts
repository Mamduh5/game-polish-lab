import * as vscode from "vscode";

import { findFilesByGlobs, inspectFiles } from "../../core/fileSearch";
import { InspectedFile } from "../../types/audit";

const likelyConfigGlobs = [
  "**/{game,Game,main,Main,phaserConfig,PhaserConfig,config,Config}.{ts,tsx,js,jsx,mjs,cjs}",
  "**/*phaser*.{ts,tsx,js,jsx,mjs,cjs}",
  "**/*config*.{ts,tsx,js,jsx,mjs,cjs}"
];

const sourceGlobs = [
  "**/*.{ts,tsx,js,jsx,mjs,cjs}"
];

export async function findPhaserConfigFiles(folder: vscode.WorkspaceFolder): Promise<InspectedFile[]> {
  const directMatches = await findFilesByGlobs(likelyConfigGlobs, 40);
  const broadMatches = await findFilesByGlobs(sourceGlobs, 120);
  const seen = new Set<string>();
  const candidates: vscode.Uri[] = [];

  for (const match of [...directMatches, ...broadMatches]) {
    if (seen.has(match.fsPath)) {
      continue;
    }

    seen.add(match.fsPath);
    candidates.push(match);
  }

  const inspected = await inspectFiles(folder, candidates, 180_000);
  return inspected.filter((file) => isLikelyPhaserConfig(file));
}

function isLikelyPhaserConfig(file: InspectedFile): boolean {
  const pathLower = file.relativePath.toLowerCase();
  const text = file.text;
  return /phaser/i.test(pathLower)
    || /new\s+Phaser\.Game\b/.test(text)
    || /\bPhaser\.AUTO\b|\bPhaser\.CANVAS\b|\bPhaser\.WEBGL\b/.test(text)
    || /\brender\s*:\s*{/.test(text)
    || /\bpixelArt\s*:/.test(text)
    || /\broundPixels\s*:/.test(text)
    || /\bantialias(?:GL)?\s*:/.test(text)
    || /\bzoom\s*:/.test(text);
}
