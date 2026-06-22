import * as vscode from "vscode";

import { scanWorkspaceFiles } from "../../core/fileSearch";
import { InspectedFile } from "../../types/audit";

export async function findPhaserConfigFiles(folder: vscode.WorkspaceFolder): Promise<InspectedFile[]> {
  const scan = await scanWorkspaceFiles(folder, {
    extensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
    maxFiles: 1500,
    maxFileSizeBytes: 512 * 1024
  });

  return scan.files
    .map((file) => ({ file, score: scorePhaserConfigCandidate(file) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.file.relativePath.localeCompare(b.file.relativePath))
    .map((candidate) => candidate.file);
}

function scorePhaserConfigCandidate(file: InspectedFile): number {
  const pathLower = file.relativePath.toLowerCase();
  const text = file.text;
  let score = 0;

  if (/\bPhaser\.Types\.Core\.GameConfig\b/.test(text)) {
    score += 5;
  }
  if (/new\s+Phaser\.Game\b/.test(text)) {
    score += 5;
  }
  if (/\bpixelArt\s*:/.test(text)) {
    score += 4;
  }
  if (/\bantialias(?:GL)?\s*:/.test(text)) {
    score += 3;
  }
  if (/\broundPixels\s*:/.test(text)) {
    score += 3;
  }
  if (/\bwidth\s*:/.test(text) && /\bheight\s*:/.test(text) && /\bscene\s*:/.test(text)) {
    score += 3;
  }
  if (/\bPhaser\.AUTO\b|\bPhaser\.CANVAS\b|\bPhaser\.WEBGL\b/.test(text)) {
    score += 2;
  }
  if (/(^|\/)(main|index|game|config|phaserconfig)\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(pathLower)) {
    score += 1;
  }
  if (/phaser/i.test(pathLower)) {
    score += 1;
  }

  return score;
}
