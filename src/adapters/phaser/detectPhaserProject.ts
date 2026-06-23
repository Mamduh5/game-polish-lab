import * as vscode from "vscode";

import { logInfo } from "../../core/output";
import { getCachedAnalysis, getWorkspacePerformanceMode, scanWorkspace, setCachedAnalysis } from "../../core/workspaceScanner";
import { InspectedFile, PhaserDetectionResult } from "../../types/audit";

export async function detectPhaserProject(folder: vscode.WorkspaceFolder): Promise<PhaserDetectionResult> {
  const mode = await getWorkspacePerformanceMode(folder);
  const cached = getCachedAnalysis<PhaserDetectionResult>(folder, "phaserProject", mode);
  if (cached) {
    return cached;
  }

  const scan = await scanWorkspace({
    folder,
    patterns: [
      "package.json",
      "**/{game,Game,main,Main,index,Index,phaserConfig,PhaserConfig,config,Config}.{ts,tsx,js,jsx,mjs,cjs}",
      "src/**/*.{ts,tsx,js,jsx,mjs,cjs}"
    ]
  });
  const detection = detectPhaserProjectFromFiles(scan.files);
  setCachedAnalysis(folder, "phaserProject", mode, detection);
  return detection;
}

export function detectPhaserProjectFromFiles(inspected: InspectedFile[]): PhaserDetectionResult {
  const evidence: string[] = [];
  const filesInspected: string[] = [];
  let hasPackageDependency = false;
  let strongSignals = 0;
  let weakSignals = 0;

  const packageJson = inspected.find((file) => file.relativePath === "package.json");
  if (packageJson) {
    filesInspected.push("package.json");
    try {
      const parsed = JSON.parse(packageJson.text) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };

      if (parsed.dependencies?.phaser || parsed.devDependencies?.phaser) {
        evidence.push("package.json declares a phaser dependency.");
        hasPackageDependency = true;
      }
    } catch {
      evidence.push("package.json exists but could not be parsed.");
    }
  }

  const likelyNamedFiles = inspected.filter((file) => /(^|\/)(game|main|index|phaserconfig|config)\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file.relativePath));
  if (likelyNamedFiles.length > 0) {
    evidence.push(`Found likely game/config files: ${likelyNamedFiles.slice(0, 6).map((file) => file.relativePath.split("/").pop()).join(", ")}.`);
    weakSignals += 1;
  }

  filesInspected.push(...inspected.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file.relativePath)).map((file) => file.relativePath));

  const importMatches = inspected.filter((file) => /\bfrom\s+["']phaser["']|\bimport\s+["']phaser["']|\brequire\(["']phaser["']\)/.test(file.text));
  if (importMatches.length > 0) {
    evidence.push(`Found Phaser imports in ${importMatches.slice(0, 5).map((file) => file.relativePath).join(", ")}.`);
    strongSignals += 1;
  }

  const gameUsageMatches = inspected.filter((file) => /\bnew\s+Phaser\.Game\b|\bPhaser\.Game\b/.test(file.text));
  if (gameUsageMatches.length > 0) {
    evidence.push(`Found Phaser.Game usage in ${gameUsageMatches.slice(0, 5).map((file) => file.relativePath).join(", ")}.`);
    strongSignals += 1;
  }

  const typedConfigMatches = inspected.filter((file) => /\bPhaser\.Types\.Core\.GameConfig\b/.test(file.text));
  if (typedConfigMatches.length > 0) {
    evidence.push(`Found Phaser.Types.Core.GameConfig in ${typedConfigMatches.slice(0, 5).map((file) => file.relativePath).join(", ")}.`);
    strongSignals += 1;
  }

  const configObjectMatches = inspected.filter((file) => /\btype\s*:/.test(file.text) && /\bwidth\s*:/.test(file.text) && /\bheight\s*:/.test(file.text) && /\bscene\s*:/.test(file.text));
  if (configObjectMatches.length > 0) {
    evidence.push(`Found config-like objects with type, width, height, and scene in ${configObjectMatches.slice(0, 5).map((file) => file.relativePath).join(", ")}.`);
    weakSignals += 1;
  }

  const confidence = hasPackageDependency || strongSignals >= 2 ? "high" : strongSignals >= 1 ? "medium" : weakSignals >= 1 ? "low" : "none";
  logInfo(`Phaser detection confidence: ${confidence}; evidence: ${evidence.join(" | ") || "none"}`);
  return {
    isPhaserProject: confidence !== "none",
    confidence,
    evidence: evidence.slice(0, 8),
    filesInspected: Array.from(new Set(filesInspected)).sort()
  };
}
