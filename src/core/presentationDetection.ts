import * as vscode from "vscode";

import { logInfo } from "./output";
import { getCachedAnalysis, getWorkspacePerformanceMode, scanWorkspace, setCachedAnalysis } from "./workspaceScanner";
import { InspectedFile } from "../types/audit";
import { CodeStyle, RuntimePresentationModel } from "../types/profile";

export interface CodeStyleDetection {
  codeStyle: CodeStyle;
  evidence: string[];
}

export interface RuntimePresentationDetection {
  runtimePresentationModel: RuntimePresentationModel;
  evidence: string[];
  recommendedKitFamily: string;
}

export async function detectCodeStyle(folder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<CodeStyleDetection> {
  const mode = await getWorkspacePerformanceMode(folder);
  const cached = getCachedAnalysis<CodeStyleDetection>(folder, "codeStyle", mode);
  if (cached) {
    return cached;
  }

  const scan = await scanWorkspace({ folder, patterns: codeStylePatterns(), token });
  const detection = detectCodeStyleFromFiles(scan.files);
  setCachedAnalysis(folder, "codeStyle", mode, detection);
  return detection;
}

export async function detectRuntimePresentationModel(folder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<RuntimePresentationDetection> {
  const mode = await getWorkspacePerformanceMode(folder);
  const cached = getCachedAnalysis<RuntimePresentationDetection>(folder, "runtimePresentation", mode);
  if (cached) {
    return cached;
  }

  const scan = await scanWorkspace({ folder, token });
  const detection = detectRuntimePresentationModelFromFiles(scan.files);
  setCachedAnalysis(folder, "runtimePresentation", mode, detection);
  return detection;
}

export function detectCodeStyleFromFiles(files: InspectedFile[]): CodeStyleDetection {
  const evidence: string[] = [];
  let browserGlobalScore = 0;
  let tsModuleScore = 0;
  let jsModuleScore = 0;

  for (const file of sourceFiles(files)) {
    const text = file.text;
    if (/\(function\s*\(\)\s*{/.test(text) && /["']use strict["']/.test(text)) {
      browserGlobalScore += 3;
      evidence.push(`IIFE strict wrapper in ${file.relativePath}`);
    }
    if (/window\.ARENA\s*=\s*window\.ARENA\s*\|\|\s*{};/.test(text) || /\bARENA\.[A-Za-z0-9_]+\s*=/.test(text)) {
      browserGlobalScore += 4;
      evidence.push(`window.ARENA browser-global pattern in ${file.relativePath}`);
    }
    if (/<script\s+src=["'][^"']+src\/arena\//i.test(text) && !/<script[^>]+type=["']module["']/i.test(text)) {
      browserGlobalScore += 3;
      evidence.push(`non-module arena script tags in ${file.relativePath}`);
    }
    if (/^\s*import\s.+from\s+["']/m.test(text) || /^\s*export\s+/m.test(text)) {
      if (file.relativePath.endsWith(".ts")) {
        tsModuleScore += 2;
      } else {
        jsModuleScore += 2;
      }
    }
  }

  const codeStyle: CodeStyle = browserGlobalScore >= 5 ? "browser_global_iife" : tsModuleScore > jsModuleScore && tsModuleScore > 0 ? "typescript_module" : jsModuleScore > 0 ? "javascript_module" : "unknown";
  logInfo(`code style detection: ${codeStyle}; evidence: ${evidence.join(" | ") || "none"}`);
  return { codeStyle, evidence: evidence.slice(0, 8) };
}

export function detectRuntimePresentationModelFromFiles(files: InspectedFile[]): RuntimePresentationDetection {
  const evidence: string[] = [];
  let hasArenaMount = false;
  let hasArenaScene = false;
  let hasPointerCursorAttack = false;
  let hasDomHud = false;
  let hasScriptModules = false;
  let hiddenPhaserRoot = false;
  let tinyConfig = false;
  let hasNewPhaserGame = false;

  for (const file of sourceFiles(files)) {
    const text = `${file.relativePath}\n${file.text}`.toLowerCase();
    hasArenaMount ||= text.includes("arenamount");
    hasArenaScene ||= /arena\.arenascene|arenascene/.test(text);
    hasPointerCursorAttack ||= /pointerdown|cursorattacksystem|arena\.cursorattack\.attack/.test(text);
    hasDomHud ||= /arena-status|arenaupgradelist|arenaskinselect|arenamutebtn|arenaresetbtn|upgradepanel|arenahud/.test(text);
    hasScriptModules ||= /src\/arena\/scenes\/arenascene\.js|src\/arena\/ui\/arenahud\.js|src\/arena\/ui\/upgradepanel\.js/.test(text);
    hiddenPhaserRoot ||= text.includes("phaser-root") && /(opacity\s*:\s*0|pointer-events\s*:\s*none|width\s*:\s*1px|height\s*:\s*1px|position\s*:\s*absolute[\s\S]{0,120}(?:left|top)\s*:\s*-\d+)/.test(text);
    tinyConfig ||= /width\s*:\s*1\s*,[\s\S]{0,80}height\s*:\s*1|height\s*:\s*1\s*,[\s\S]{0,80}width\s*:\s*1/.test(text);
    hasNewPhaserGame ||= /new\s+phaser\.game/.test(text);
  }

  if (hasArenaMount) {
    evidence.push("arenaMount");
  }
  if (hasArenaScene) {
    evidence.push("ARENA.ArenaScene");
  }
  if (hasPointerCursorAttack) {
    evidence.push("pointerdown / CursorAttackSystem");
  }
  if (hasDomHud) {
    evidence.push("ArenaHud / UpgradePanel / DOM HUD controls");
  }
  if (hasScriptModules) {
    evidence.push("browser-global IIFE scripts");
  }

  let runtimePresentationModel: RuntimePresentationModel = "unknown";
  let recommendedKitFamily = "General Pixel Polish Kits";
  if (tinyConfig && hiddenPhaserRoot) {
    runtimePresentationModel = "phaser_timer_dom_ui";
    recommendedKitFamily = "DOM UI Polish Kits";
  } else if (hasArenaMount && hasArenaScene && hasPointerCursorAttack && hasDomHud) {
    runtimePresentationModel = "phaser_rendered_dom_hud";
    recommendedKitFamily = "Incremental Cursor Arena Kits";
  } else if (hasNewPhaserGame || hasArenaScene) {
    runtimePresentationModel = hasDomHud ? "phaser_rendered_dom_hud" : "phaser_rendered";
    recommendedKitFamily = hasDomHud ? "Incremental Cursor Arena Kits" : "General Phaser Pixel Polish Kits";
  } else if (hasDomHud) {
    runtimePresentationModel = "dom_rendered";
    recommendedKitFamily = "DOM UI Polish Kits";
  }

  logInfo(`runtime presentation model: ${runtimePresentationModel}; evidence: ${evidence.join(" | ") || "none"}`);
  return {
    runtimePresentationModel,
    evidence: evidence.slice(0, 8),
    recommendedKitFamily
  };
}

function sourceFiles(files: InspectedFile[]): InspectedFile[] {
  return files.filter((file) => !file.relativePath.startsWith(".game-polish-lab/") && !/(docs?|mockups?|design)\//i.test(file.relativePath));
}

function codeStylePatterns(): string[] {
  return [
    "package.json",
    "index.html",
    "arena.html",
    "src/main.{js,ts,jsx,tsx,mjs,cjs}",
    "src/**/main.{js,ts,jsx,tsx,mjs,cjs}",
    "src/**/ui/**/*.{js,ts,jsx,tsx}",
    "src/**/*.{js,ts,jsx,tsx,mjs,cjs}",
    "src/**/*.html"
  ];
}
