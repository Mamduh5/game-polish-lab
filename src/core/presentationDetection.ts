import * as vscode from "vscode";

import { logInfo } from "./output";
import { getCachedAnalysis, getWorkspacePerformanceMode, scanWorkspace, setCachedAnalysis } from "./workspaceScanner";
import { InspectedFile, PresentationRouteSummary } from "../types/audit";
import { CodeStyle, RuntimePresentationModel } from "../types/profile";

export interface CodeStyleDetection {
  codeStyle: CodeStyle;
  evidence: string[];
}

export interface RuntimePresentationDetection {
  runtimePresentationModel: RuntimePresentationModel;
  secondaryRuntimePresentationModel?: RuntimePresentationModel;
  evidence: string[];
  recommendedKitFamily: string;
  presentationRoutes?: PresentationRouteSummary;
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
    if (file.relativePath === "package.json" && /"type"\s*:\s*"module"/.test(text)) {
      jsModuleScore += 2;
      evidence.push(`package.json type module in ${file.relativePath}`);
    }
    if (file.relativePath === "package.json" && /typescript|vite|tsc/.test(text.toLowerCase())) {
      tsModuleScore += 2;
      evidence.push(`TypeScript/Vite package signals in ${file.relativePath}`);
    }
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
  let hasSceneArrayArenaScene = false;
  let hasPointerCursorAttack = false;
  let hasImpactEffectSystem = false;
  let hasDomHud = false;
  let hasScriptModules = false;
  let hiddenPhaserRoot = false;
  let tinyConfig = false;
  let hasNewPhaserGame = false;
  let hasPhaserSceneClass = false;
  let hasFarmScene = false;
  let hasManyUiViews = false;
  let hasEconomyStateImports = false;
  let uiViewSignals = 0;
  let economySignals = 0;
  const mainDomRouteEvidence = new Set<string>();
  const arenaRouteEvidence = new Set<string>();

  for (const file of sourceFiles(files)) {
    const text = `${file.relativePath}\n${file.text}`.toLowerCase();
    const pathLower = file.relativePath.toLowerCase();
    const fileHasArenaMount = text.includes("arenamount");
    const fileHasArenaScene = /arena\.arenascene|arenascene/.test(text);
    const fileHasSceneArrayArenaScene = /scene\s*:\s*\[\s*arena\.arenascene\s*\]/.test(text);
    const fileHasPointerCursorAttack = /this\.input\.on\(["']pointerdown["']|handlepointerdown|cursorattacksystem|arena\.cursorattack\.attack/.test(text);
    const fileHasImpactEffectSystem = /impacteffectsystem|impacteffects/.test(text);
    const fileHasDomHud = /arena-status|arenaupgradelist|arenaskinselect|arenamutebtn|arenaresetbtn|upgradepanel|arenahud/.test(text);
    const fileHasScriptModules = /src\/arena\/scenes\/arenascene\.js|src\/arena\/ui\/arenahud\.js|src\/arena\/ui\/upgradepanel\.js/.test(text);
    const fileHiddenPhaserRoot = text.includes("phaser-root") && (
      /(opacity\s*:\s*0|pointer-events\s*:\s*none|width\s*:\s*1px|height\s*:\s*1px|position\s*:\s*absolute[\s\S]{0,120}(?:left|top)\s*:\s*-\d+)/.test(text)
      || /\.style\.(?:opacity|pointerevents|width|height|position|left|top)\s*=/.test(text)
    );
    const fileTinyConfig = /width\s*:\s*1\s*,[\s\S]{0,80}height\s*:\s*1|height\s*:\s*1\s*,[\s\S]{0,80}width\s*:\s*1/.test(text);

    hasArenaMount ||= fileHasArenaMount;
    hasArenaScene ||= fileHasArenaScene;
    hasSceneArrayArenaScene ||= fileHasSceneArrayArenaScene;
    hasPointerCursorAttack ||= fileHasPointerCursorAttack;
    hasImpactEffectSystem ||= fileHasImpactEffectSystem;
    hasDomHud ||= fileHasDomHud;
    hasScriptModules ||= fileHasScriptModules;
    hiddenPhaserRoot ||= fileHiddenPhaserRoot;
    tinyConfig ||= fileTinyConfig;
    hasNewPhaserGame ||= /new\s+phaser\.game/.test(text);
    hasPhaserSceneClass ||= /extends\s+phaser\.scene|phaser\.scene|spiritsortscene/.test(text);
    hasFarmScene ||= /farmscene/.test(text) || pathLower === "src/scenes/farmscene.ts";
    uiViewSignals += countSignals(text, ["tapfarmview", "hudview", "hatchpanelview", "gameplayactionbarview", "navigationcontrolview", "navigationmenupanelview", "nextquestwidgetview", "toastview", "panelchrome", "panelcontrols"]);
    economySignals += countSignals(text, ["farmslotstate", "hatchstate", "tapfarmstate", "coinbugstate", "upgradestate", "queststate", "bossbattlestate", "progressionsystem", "monstermergesystem", "savesystem", "writesavedata"]);

    if (pathLower === "src/main.js" && (fileHiddenPhaserRoot || fileTinyConfig || /new\s+phaser\.game/.test(text))) {
      mainDomRouteEvidence.add("src/main.js");
    }
    if (fileHiddenPhaserRoot) {
      mainDomRouteEvidence.add("hidden Phaser root");
    }
    if (fileTinyConfig) {
      mainDomRouteEvidence.add("1x1 Phaser timer config");
    }
    if (pathLower === "arena.html") {
      arenaRouteEvidence.add("arena.html");
    }
    if (pathLower === "src/arena/main.js") {
      arenaRouteEvidence.add("src/arena/main.js");
    }
    if (fileHasArenaMount) {
      arenaRouteEvidence.add("arenaMount");
    }
    if (fileHasArenaScene) {
      arenaRouteEvidence.add("ARENA.ArenaScene");
    }
    if (fileHasSceneArrayArenaScene) {
      arenaRouteEvidence.add("scene: [ARENA.ArenaScene]");
    }
    if (pathLower === "src/arena/scenes/arenascene.js") {
      arenaRouteEvidence.add("src/arena/scenes/ArenaScene.js");
    }
    if (fileHasPointerCursorAttack) {
      arenaRouteEvidence.add("pointerdown / CursorAttackSystem");
    }
    if (fileHasImpactEffectSystem) {
      arenaRouteEvidence.add("ImpactEffectSystem");
    }
    if (fileHasDomHud) {
      arenaRouteEvidence.add("ArenaHud / UpgradePanel");
    }
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
  hasManyUiViews = uiViewSignals >= 5;
  hasEconomyStateImports = economySignals >= 5;
  if (hasFarmScene && hasManyUiViews) {
    evidence.push("FarmScene with many Phaser UI views");
  }
  if (hasEconomyStateImports) {
    evidence.push("state/economy/save system imports");
  }

  let runtimePresentationModel: RuntimePresentationModel = "unknown";
  let secondaryRuntimePresentationModel: RuntimePresentationModel | undefined;
  let recommendedKitFamily = "General Pixel Polish Kits";
  const hasTimerDomRoute = tinyConfig && hiddenPhaserRoot;
  const hasStrongArenaRenderedEvidence = hasArenaMount
    && hasArenaScene
    && hasPointerCursorAttack
    && hasDomHud
    && (hasSceneArrayArenaScene || hasImpactEffectSystem || arenaRouteEvidence.has("src/arena/main.js") || arenaRouteEvidence.has("arena.html"));
  const routeNotes: string[] = [];

  if (hasFarmScene && hasManyUiViews && hasEconomyStateImports) {
    runtimePresentationModel = "phaser_rendered_ui_heavy";
    recommendedKitFamily = "Idle Monster Farm Kits";
  } else if (hasStrongArenaRenderedEvidence) {
    runtimePresentationModel = "phaser_rendered_dom_hud";
    recommendedKitFamily = "Incremental Cursor Arena Kits";
    if (hasTimerDomRoute) {
      secondaryRuntimePresentationModel = "phaser_timer_dom_ui";
      routeNotes.push("Multiple presentation routes detected. Arena route appears to be the active polish target.");
    }
  } else if (hasTimerDomRoute) {
    runtimePresentationModel = "phaser_timer_dom_ui";
    recommendedKitFamily = "DOM UI Polish Kits";
  } else if (hasNewPhaserGame || hasArenaScene || hasPhaserSceneClass) {
    runtimePresentationModel = hasDomHud ? "phaser_rendered_dom_hud" : "phaser_rendered";
    recommendedKitFamily = hasDomHud ? "Incremental Cursor Arena Kits" : "General Phaser Pixel Polish Kits";
  } else if (hasDomHud) {
    runtimePresentationModel = "dom_rendered";
    recommendedKitFamily = "DOM UI Polish Kits";
  }

  logInfo(`runtime presentation model: ${runtimePresentationModel}; evidence: ${evidence.join(" | ") || "none"}`);
  return {
    runtimePresentationModel,
    secondaryRuntimePresentationModel,
    evidence: evidence.slice(0, 8),
    recommendedKitFamily,
    presentationRoutes: buildPresentationRoutes(
      Array.from(mainDomRouteEvidence),
      Array.from(arenaRouteEvidence),
      hasStrongArenaRenderedEvidence ? "arena" : hasTimerDomRoute ? "main_dom" : "unknown",
      secondaryRuntimePresentationModel,
      routeNotes
    )
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

function buildPresentationRoutes(
  mainDomRouteEvidence: string[],
  arenaRouteEvidence: string[],
  primaryPolishRoute: PresentationRouteSummary["primaryPolishRoute"],
  secondaryRuntimePresentationModel: RuntimePresentationModel | undefined,
  notes: string[]
): PresentationRouteSummary | undefined {
  if (mainDomRouteEvidence.length === 0 || arenaRouteEvidence.length === 0) {
    return undefined;
  }

  return {
    mainDomRouteEvidence: mainDomRouteEvidence.slice(0, 4),
    arenaRouteEvidence: arenaRouteEvidence.slice(0, 6),
    primaryPolishRoute,
    secondaryRuntimePresentationModel,
    notes
  };
}

function countSignals(text: string, signals: string[]): number {
  return signals.reduce((count, signal) => count + (text.includes(signal) ? 1 : 0), 0);
}
