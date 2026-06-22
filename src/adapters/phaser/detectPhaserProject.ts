import * as vscode from "vscode";

import { findFilesByGlobs, inspectFiles } from "../../core/fileSearch";
import { pathExists, readTextFile } from "../../core/workspace";
import { PhaserDetectionResult } from "../../types/audit";

export async function detectPhaserProject(folder: vscode.WorkspaceFolder): Promise<PhaserDetectionResult> {
  const evidence: string[] = [];
  let score = 0;

  const packageJsonUri = vscode.Uri.joinPath(folder.uri, "package.json");
  if (await pathExists(packageJsonUri)) {
    try {
      const parsed = JSON.parse(await readTextFile(packageJsonUri)) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      if (parsed.dependencies?.phaser || parsed.devDependencies?.phaser) {
        evidence.push("package.json declares a phaser dependency.");
        score += 4;
      }
    } catch {
      evidence.push("package.json exists but could not be parsed.");
    }
  }

  const likelyNamedFiles = await findFilesByGlobs([
    "**/{game,Game,main,Main,phaserConfig,PhaserConfig,config,Config}.{ts,tsx,js,jsx,mjs,cjs}"
  ], 50);

  if (likelyNamedFiles.length > 0) {
    evidence.push(`Found likely game/config files: ${likelyNamedFiles.slice(0, 6).map((file) => file.path.split("/").pop()).join(", ")}.`);
    score += 1;
  }

  const sourceFiles = await findFilesByGlobs(["**/*.{ts,tsx,js,jsx,mjs,cjs}"], 150);
  const inspected = await inspectFiles(folder, sourceFiles, 160_000);

  const importMatches = inspected.filter((file) => /\bfrom\s+["']phaser["']|\bimport\s+["']phaser["']|\brequire\(["']phaser["']\)/.test(file.text));
  if (importMatches.length > 0) {
    evidence.push(`Found Phaser imports in ${importMatches.slice(0, 5).map((file) => file.relativePath).join(", ")}.`);
    score += 2;
  }

  const gameUsageMatches = inspected.filter((file) => /\bnew\s+Phaser\.Game\b|\bPhaser\.Game\b/.test(file.text));
  if (gameUsageMatches.length > 0) {
    evidence.push(`Found Phaser.Game usage in ${gameUsageMatches.slice(0, 5).map((file) => file.relativePath).join(", ")}.`);
    score += 3;
  }

  const confidence = score >= 4 ? "high" : score >= 2 ? "medium" : score >= 1 ? "low" : "none";
  return {
    isPhaserProject: confidence !== "none",
    confidence,
    evidence
  };
}
