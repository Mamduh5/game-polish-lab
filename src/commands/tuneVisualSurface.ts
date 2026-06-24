import * as vscode from "vscode";

import {
  applyIdleMonsterFarmBackgroundStyle,
  getIdleMonsterFarmBackgroundAdapterState,
  setupIdleMonsterFarmBackgroundBridge,
  summarizeBackgroundApplyResult
} from "../adapters/idleMonsterFarm/backgroundAdapter";
import {
  applyIdleMonsterFarmFarmSlotStyle,
  getIdleMonsterFarmFarmSlotAdapterState,
  setupIdleMonsterFarmFarmSlotBridge,
  summarizeFarmSlotApplyResult
} from "../adapters/idleMonsterFarm/farmSlotAdapter";
import { checkV05VisualScope } from "../core/v05VisualScopeGuard";
import { logCommandEnd, logCommandStart, logError, logInfo, logWarn } from "../core/output";
import {
  backgroundReadabilityStyleConfigRelativePath,
  BackgroundStyleConfigLoadResult,
  buildBackgroundReadabilityStyleConfig,
  buildRollbackSnapshotName,
  buildSlotCardStyleConfig,
  farmSlotStyleConfigRelativePath,
  loadBackgroundReadabilityStyleConfigFromText,
  loadSlotCardStyleConfigFromText,
  StyleConfigLoadResult
} from "../core/visualSurfaceConfig";
import { ensureDirectory, labUri, pathExists, readTextFile, readTextFileIfExists, requireWorkspaceFolder, writeJsonFile, writeTextFile } from "../core/workspace";
import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { defaultSlotCardStyle, slotCardPresets, slotCardStyleBounds } from "../presets/slotCardPresets";
import { BackgroundReadabilityStyleValues, SlotCardStyleValues, VisualSurfaceType } from "../types/visualSurface";

type SurfaceValues = SlotCardStyleValues | BackgroundReadabilityStyleValues;

interface SaveMessage {
  command: "saveAndApply" | "setupBridge";
  surfaceType: VisualSurfaceType;
  presetName: string;
  values: SurfaceValues;
}

interface SaveResultMessage {
  command: "saveResult";
  ok: boolean;
  surfaceType?: VisualSurfaceType;
  configPath?: string;
  rollbackPaths?: string[];
  checklist?: string[];
  applySummary?: string[];
  warnings?: string[];
  error?: string;
}

export async function tuneVisualSurface(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.tuneVisualSurface", folder.uri.fsPath);

  try {
    const slotConfigLoad = loadSlotCardStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "farm-slot-style.json")));
    const backgroundConfigLoad = loadBackgroundReadabilityStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "background-readability-style.json")));
    for (const warning of [slotConfigLoad.warning, backgroundConfigLoad.warning].filter((value): value is string => Boolean(value))) {
      logWarn(warning);
      vscode.window.showWarningMessage(warning);
    }

    const slotAdapterState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
    const backgroundAdapterState = await getIdleMonsterFarmBackgroundAdapterState(folder);
    const panel = vscode.window.createWebviewPanel("gamePolishLab.tuneVisualSurface", "Tune Visual Surface", vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folder.uri]
    });

    panel.webview.html = renderTuneVisualSurfaceHtml({
      slotConfigLoad,
      backgroundConfigLoad,
      slotAdapterState,
      backgroundAdapterState
    });

    panel.webview.onDidReceiveMessage(async (message: SaveMessage) => {
      const result = message.command === "setupBridge"
        ? await setupBridge(folder, message, slotConfigLoad, backgroundConfigLoad)
        : await saveAndApply(folder, message, slotConfigLoad, backgroundConfigLoad);
      await panel.webview.postMessage(result);
    });
  } catch (error) {
    logError("tune visual surface failed:", error);
    vscode.window.showErrorMessage(`Failed to open visual surface tuner: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.tuneVisualSurface");
  }
}

async function saveAndApply(
  folder: vscode.WorkspaceFolder,
  message: SaveMessage,
  slotLoad: StyleConfigLoadResult,
  backgroundLoad: BackgroundStyleConfigLoadResult
): Promise<SaveResultMessage> {
  try {
    if (message.surfaceType === "background_readability") {
      const config = buildBackgroundReadabilityStyleConfig(message.presetName, message.values as BackgroundReadabilityStyleValues);
      const configUri = labUri(folder, "styles", "background-readability-style.json");
      const scope = checkV05VisualScope([backgroundReadabilityStyleConfigRelativePath], { throughAdapter: false });
      if (!scope.ok) {
        return blockedSave("background_readability", `v0.52 scope guard blocked config save: ${scope.forbiddenFiles.join(", ")}`, scope.warnings);
      }
      await ensureDirectory(labUri(folder, "styles"));
      const configRollbacks = await createRollbackSnapshotIfNeeded(folder, configUri, backgroundReadabilityStyleConfigRelativePath);
      await writeJsonFile(configUri, config);
      const applyResult = await applyIdleMonsterFarmBackgroundStyle(folder, config);
      const applySummary = summarizeBackgroundApplyResult(folder, applyResult);
      logSummary(applySummary, applyResult.warnings);
      const rollbackPaths = [...configRollbacks, ...applyResult.rollbackPaths];
      const checklist = buildBackgroundChecklist(backgroundLoad, rollbackPaths.length > 0, applyResult.changedFiles, applyResult.connection.connected, applyResult.setupOffered, applyResult.detection.ownerFiles.length > 0);
      logChecklist("v0.52 background manual test checklist:", checklist);
      return {
        command: "saveResult",
        ok: true,
        surfaceType: "background_readability",
        configPath: backgroundReadabilityStyleConfigRelativePath,
        rollbackPaths,
        checklist,
        applySummary,
        warnings: applyResult.warnings
      };
    }

    const config = buildSlotCardStyleConfig(message.presetName, message.values as SlotCardStyleValues);
    const configUri = labUri(folder, "styles", "farm-slot-style.json");
    const scope = checkV05VisualScope([farmSlotStyleConfigRelativePath], { throughAdapter: false });
    if (!scope.ok) {
      return blockedSave("slot_card", `v0.52 scope guard blocked config save: ${scope.forbiddenFiles.join(", ")}`, scope.warnings);
    }
    await ensureDirectory(labUri(folder, "styles"));
    const configRollbacks = await createRollbackSnapshotIfNeeded(folder, configUri, farmSlotStyleConfigRelativePath);
    await writeJsonFile(configUri, config);
    const applyResult = await applyIdleMonsterFarmFarmSlotStyle(folder, config);
    const applySummary = summarizeFarmSlotApplyResult(folder, applyResult);
    logSummary(applySummary, applyResult.warnings);
    const rollbackPaths = [...configRollbacks, ...applyResult.rollbackPaths];
    const checklist = buildSlotChecklist(slotLoad, rollbackPaths.length > 0, applyResult.changedFiles, applyResult.connection.connected, applyResult.setupOffered, applyResult.detection.ownerFiles.length > 0);
    logChecklist("v0.51 farm slot manual test checklist:", checklist);
    return {
      command: "saveResult",
      ok: true,
      surfaceType: "slot_card",
      configPath: farmSlotStyleConfigRelativePath,
      rollbackPaths,
      checklist,
      applySummary,
      warnings: applyResult.warnings
    };
  } catch (error) {
    logError("save/apply visual surface failed:", error);
    return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function setupBridge(
  folder: vscode.WorkspaceFolder,
  message: SaveMessage,
  slotLoad: StyleConfigLoadResult,
  backgroundLoad: BackgroundStyleConfigLoadResult
): Promise<SaveResultMessage> {
  try {
    if (message.surfaceType === "background_readability") {
      const config = buildBackgroundReadabilityStyleConfig(message.presetName, message.values as BackgroundReadabilityStyleValues);
      const setupResult = await setupIdleMonsterFarmBackgroundBridge(folder, config);
      const applySummary = summarizeSetup("idle_monster_farm.background", setupResult.setupApplied, setupResult.intendedFiles, setupResult.changedFiles, setupResult.rollbackPaths, setupResult.connection.connected, setupResult.connection.connectionType, setupResult.warnings, setupResult.connection.missingPieces, setupResult.blockedFiles);
      logSummary(applySummary, setupResult.warnings);
      const checklist = buildBackgroundChecklist(backgroundLoad, setupResult.rollbackPaths.length > 0, setupResult.changedFiles, setupResult.connection.connected, true, setupResult.detection.ownerFiles.length > 0);
      logChecklist("v0.52 background manual test checklist:", checklist);
      return setupResponse("background_readability", backgroundReadabilityStyleConfigRelativePath, setupResult.blockedFiles, setupResult.rollbackPaths, checklist, applySummary, setupResult.warnings);
    }

    const config = buildSlotCardStyleConfig(message.presetName, message.values as SlotCardStyleValues);
    const setupResult = await setupIdleMonsterFarmFarmSlotBridge(folder, config);
    const applySummary = summarizeSetup("idle_monster_farm.farm_slots", setupResult.setupApplied, setupResult.intendedFiles, setupResult.changedFiles, setupResult.rollbackPaths, setupResult.connection.connected, setupResult.connection.connectionType, setupResult.warnings, setupResult.connection.missingPieces, setupResult.blockedFiles);
    logSummary(applySummary, setupResult.warnings);
    const checklist = buildSlotChecklist(slotLoad, setupResult.rollbackPaths.length > 0, setupResult.changedFiles, setupResult.connection.connected, true, setupResult.detection.ownerFiles.length > 0);
    logChecklist("v0.51 farm slot manual test checklist:", checklist);
    return setupResponse("slot_card", farmSlotStyleConfigRelativePath, setupResult.blockedFiles, setupResult.rollbackPaths, checklist, applySummary, setupResult.warnings);
  } catch (error) {
    logError("setup visual bridge failed:", error);
    return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function createRollbackSnapshotIfNeeded(folder: vscode.WorkspaceFolder, configUri: vscode.Uri, affectedRelativePath: string): Promise<string[]> {
  if (!(await pathExists(configUri))) {
    return [];
  }
  const existingText = await readTextFile(configUri);
  await ensureDirectory(labUri(folder, "rollback"));
  const fileName = buildRollbackSnapshotName(new Date(), affectedRelativePath);
  const rollbackUri = labUri(folder, "rollback", fileName);
  await writeTextFile(rollbackUri, existingText);
  return [`.game-polish-lab/rollback/${fileName}`];
}

function blockedSave(surfaceType: VisualSurfaceType, error: string, warnings: string[]): SaveResultMessage {
  logWarn(error);
  return { command: "saveResult", ok: false, surfaceType, error, warnings };
}

function setupResponse(surfaceType: VisualSurfaceType, configPath: string, blockedFiles: string[], rollbackPaths: string[], checklist: string[], applySummary: string[], warnings: string[]): SaveResultMessage {
  return {
    command: "saveResult",
    ok: blockedFiles.length === 0,
    surfaceType,
    configPath,
    rollbackPaths,
    checklist,
    applySummary,
    warnings,
    error: blockedFiles.length > 0 ? `Setup blocked: ${blockedFiles.join(", ")}` : undefined
  };
}

function summarizeSetup(target: string, applied: boolean, intendedFiles: string[], changedFiles: string[], rollbackPaths: string[], connected: boolean, connectionType: string, warnings: string[], missingPieces: string[], blockedFiles: string[]): string[] {
  return [
    `adapter target: ${target}`,
    `one-time setup: ${applied ? "applied" : "blocked"}`,
    `intended files: ${intendedFiles.length > 0 ? intendedFiles.join(", ") : "none"}`,
    `changed files: ${changedFiles.length > 0 ? changedFiles.join(", ") : "none"}`,
    `rollback snapshots: ${rollbackPaths.length > 0 ? rollbackPaths.join(", ") : "none"}`,
    `connected after setup: ${connected ? "yes" : "no"} (${connectionType})`,
    ...warnings.map((warning) => `warning: ${warning}`),
    ...missingPieces.map((piece) => `missing: ${piece}`),
    ...blockedFiles.map((file) => `blocked: ${file}`)
  ];
}

function buildSlotChecklist(load: StyleConfigLoadResult, rollbackCreated: boolean, adapterChangedFiles: string[], connected: boolean, setupOffered: boolean, ownerFilesDetected: boolean): string[] {
  return [
    load.existingConfigDetected ? "existing style config detected" : "existing style config was missing and a default config was created",
    load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
    ownerFilesDetected ? "farm slot owner files detected" : "farm slot owner files were not detected",
    connected ? "connected status reported: connected" : "connected status reported: not connected",
    connected ? "updated values applied without integration changes" : "one-time setup path was offered instead of unsafe patching",
    setupOffered ? "one-time setup path was offered through the adapter" : "one-time setup was not required for this apply",
    rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
    "empty slot preview works",
    "occupied slot preview works",
    "selected slot glow works",
    "locked overlay works",
    "merge-candidate state still renders",
    "no save/economy/hatch/progression/merge/quest/ad files were changed",
    adapterChangedFiles.length > 0 ? `adapter changed visual/style files only: ${adapterChangedFiles.join(", ")}` : "adapter did not change source files"
  ];
}

function buildBackgroundChecklist(load: BackgroundStyleConfigLoadResult, rollbackCreated: boolean, adapterChangedFiles: string[], connected: boolean, setupOffered: boolean, ownerFilesDetected: boolean): string[] {
  return [
    load.existingConfigDetected ? "background readability config detected" : "background readability config was missing and a default config was created",
    load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
    load.warning ? "invalid config falls back safely with warning" : "background config schema accepted or defaulted safely",
    "preview shows slots/cards over background",
    "background color updates",
    "image opacity updates",
    "contrast overlay updates",
    "vignette strength updates",
    "pattern opacity updates",
    ownerFilesDetected ? "likely background owner files detected" : "likely background owner files were not detected",
    connected ? "connected status reported: connected" : "connected status reported: not connected",
    connected ? "updated values applied without integration changes" : "one-time setup path offered instead of unsafe patching",
    rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
    "no save/economy/hatch/progression/merge/quest/ad/level-data files changed",
    adapterChangedFiles.length > 0 ? `adapter changed visual/style files only: ${adapterChangedFiles.join(", ")}` : "adapter did not change source files"
  ];
}

function logSummary(lines: string[], warnings: string[]): void {
  for (const line of lines) {
    logInfo(line);
  }
  for (const warning of warnings) {
    logWarn(warning);
  }
}

function logChecklist(label: string, checklist: string[]): void {
  logInfo(label);
  for (const item of checklist) {
    logInfo(`- ${item}`);
  }
}

function renderTuneVisualSurfaceHtml(input: {
  slotConfigLoad: StyleConfigLoadResult;
  backgroundConfigLoad: BackgroundStyleConfigLoadResult;
  slotAdapterState: Awaited<ReturnType<typeof getIdleMonsterFarmFarmSlotAdapterState>>;
  backgroundAdapterState: Awaited<ReturnType<typeof getIdleMonsterFarmBackgroundAdapterState>>;
}): string {
  const nonce = createNonce();
  const payload = JSON.stringify({
    surfaces: {
      slot_card: {
        label: "Slot Card",
        presets: slotCardPresets,
        bounds: slotCardStyleBounds,
        initialConfig: input.slotConfigLoad.config,
        configLoad: input.slotConfigLoad,
        adapterState: input.slotAdapterState,
        beforeValues: defaultSlotCardStyle
      },
      background_readability: {
        label: "Background Readability",
        presets: backgroundReadabilityPresets,
        bounds: backgroundReadabilityStyleBounds,
        initialConfig: input.backgroundConfigLoad.config,
        configLoad: input.backgroundConfigLoad,
        adapterState: input.backgroundAdapterState,
        beforeValues: defaultBackgroundReadabilityStyle
      }
    }
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Polish Lab v0.52</title>
  <style nonce="${nonce}">
    :root { color-scheme: light dark; --panel: var(--vscode-editorWidget-background); --border: var(--vscode-panel-border); --text: var(--vscode-foreground); --muted: var(--vscode-descriptionForeground); --button: var(--vscode-button-background); --button-text: var(--vscode-button-foreground); --focus: var(--vscode-focusBorder); }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 18px; color: var(--text); font-family: var(--vscode-font-family); background: var(--vscode-editor-background); }
    main { display: grid; grid-template-columns: minmax(280px, 360px) minmax(360px, 1fr); gap: 18px; align-items: start; }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 20px; font-weight: 650; }
    h2 { font-size: 15px; margin-bottom: 10px; }
    h3 { font-size: 13px; margin-bottom: 8px; }
    .header { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 16px; }
    .meta, .status, .list { color: var(--muted); font-size: 12px; line-height: 1.45; }
    .panel { border: 1px solid var(--border); background: var(--panel); border-radius: 8px; padding: 14px; }
    .controls { display: grid; gap: 12px; }
    label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 5px; }
    select, input[type="number"], input[type="color"] { width: 100%; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, var(--border)); border-radius: 4px; min-height: 28px; }
    input[type="range"] { width: 100%; }
    .control-row { display: grid; grid-template-columns: 1fr 76px; gap: 8px; align-items: center; }
    .preview-grid { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 14px; }
    .preview-stage { min-width: 0; }
    .slot-board, .background-board { position: relative; display: grid; justify-content: start; align-content: start; padding: 14px; min-height: 390px; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; }
    .slot-board { background: color-mix(in srgb, var(--vscode-editor-background) 82%, #000 18%); }
    .background-board { background: var(--bg-color); filter: brightness(var(--brightness)) contrast(var(--contrast)); }
    .background-board::before { content: ""; position: absolute; inset: 0; opacity: var(--image-opacity); filter: blur(var(--blur)); background-image: radial-gradient(circle at 22% 22%, rgba(255,255,255,.34), transparent 18%), radial-gradient(circle at 74% 26%, rgba(255,226,142,.25), transparent 18%), linear-gradient(135deg, rgba(255,255,255,.14) 0 12%, transparent 12% 100%), repeating-linear-gradient(45deg, rgba(255,255,255,var(--pattern-opacity)) 0 8px, transparent 8px 18px); }
    .background-board::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0 48%, rgba(0,0,0,var(--vignette)) 100%), linear-gradient(var(--overlay-color), var(--overlay-color)); opacity: var(--overlay-opacity); pointer-events: none; }
    .foreground { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 90px); gap: 10px; align-content: start; }
    .hud { position: relative; z-index: 1; margin-bottom: 12px; padding: 6px 8px; width: max-content; color: #fff; background: rgba(0,0,0,.42); border: 1px solid rgba(255,255,255,.35); border-radius: 6px; text-shadow: 0 1px 2px #000; }
    .slot-card { position: relative; display: grid; place-items: center; width: var(--slot-width); height: var(--slot-height); opacity: 1; background: var(--fill-color); border: var(--border-width) solid var(--border-color); border-radius: var(--corner-radius); overflow: hidden; transform: scale(1); transform-origin: center; transition: box-shadow 120ms ease, transform 120ms ease, opacity 120ms ease; }
    .slot-card.empty { opacity: var(--empty-opacity); }
    .slot-card.selected { box-shadow: 0 0 calc(28px * var(--selected-glow)) calc(4px * var(--selected-glow)) var(--border-color); }
    .slot-card.locked::after { content: ""; position: absolute; inset: 0; background: rgba(0, 0, 0, var(--locked-opacity)); }
    .slot-card.merge { transform: scale(var(--pulse-scale)); box-shadow: 0 0 calc(18px * var(--selected-glow)) var(--border-color); }
    .state-label { position: absolute; left: 6px; top: 5px; z-index: 2; font-size: 10px; color: #fff; text-shadow: 0 1px 2px #000; pointer-events: none; }
    .monster { width: 52px; height: 52px; border-radius: 45% 45% 38% 38%; background: radial-gradient(circle at 34% 28%, #fff 0 8%, #81d37b 9% 44%, #2f8a4a 45% 100%); border: 3px solid #173f25; transform: translateY(var(--monster-offset)) scale(var(--monster-scale)); box-shadow: inset -8px -8px 0 rgba(0,0,0,.18); }
    .empty-mark { width: 44%; height: 4px; border-radius: 3px; background: color-mix(in srgb, var(--border-color) 70%, transparent); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
    button { min-height: 30px; color: var(--button-text); background: var(--button); border: 1px solid transparent; border-radius: 4px; padding: 4px 12px; cursor: pointer; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    .status { margin-top: 12px; white-space: pre-wrap; }
    .list { margin: 8px 0 0; padding-left: 18px; }
    @media (max-width: 900px) { main, .preview-grid { grid-template-columns: 1fr; } .header { display: block; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Game Polish Lab v0.52: Visual Surface Tuning</h1>
      <p class="meta">Visual choice -> preview -> save config -> direct apply for supported adapters.</p>
    </div>
  </div>
  <main>
    <section class="panel">
      <h2>Style Values</h2>
      <div class="controls">
        <div><label for="surface">Surface</label><select id="surface"><option value="slot_card">slot_card</option><option value="background_readability">background_readability</option></select></div>
        <div><label for="preset">Preset</label><select id="preset"></select></div>
        <div id="controls"></div>
      </div>
      <div class="actions"><button class="secondary" id="reset">Reset</button><button class="secondary" id="setup" style="display:none;">One-Time Setup</button><button id="save">Save & Apply</button></div>
      <div id="status" class="status"></div>
    </section>
    <section class="preview-grid">
      <div class="preview-stage"><h2>Before</h2><div id="before"></div></div>
      <div class="preview-stage"><h2>After</h2><div id="after"></div></div>
    </section>
  </main>
  <section class="panel" style="margin-top: 14px;"><h3>Adapter Detection</h3><ul id="adapter" class="list"></ul></section>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const data = ${payload};
    const labels = {
      slotWidth: "Slot width", slotHeight: "Slot height", gap: "Gap", borderWidth: "Border width", cornerRadius: "Corner radius", fillColor: "Fill color", borderColor: "Border color", selectedGlowStrength: "Selected glow strength", lockedOverlayOpacity: "Locked overlay opacity", emptySlotOpacity: "Empty slot opacity", mergeCandidatePulseScale: "Merge candidate pulse scale", monsterDisplayScale: "Monster display scale", monsterVerticalOffset: "Monster vertical offset",
      backgroundColor: "Background color", backgroundImageOpacity: "Image opacity", contrastOverlayColor: "Contrast overlay color", contrastOverlayOpacity: "Contrast overlay opacity", vignetteStrength: "Vignette strength", patternOpacity: "Pattern opacity", blurAmount: "Blur/soften amount", brightness: "Brightness", contrast: "Contrast"
    };
    const numericKeysBySurface = {
      slot_card: ["slotWidth","slotHeight","gap","borderWidth","cornerRadius","selectedGlowStrength","lockedOverlayOpacity","emptySlotOpacity","mergeCandidatePulseScale","monsterDisplayScale","monsterVerticalOffset"],
      background_readability: ["backgroundImageOpacity","contrastOverlayOpacity","vignetteStrength","patternOpacity","blurAmount","brightness","contrast"]
    };
    const colorKeysBySurface = { slot_card: ["fillColor","borderColor"], background_readability: ["backgroundColor","contrastOverlayColor"] };
    let surfaceType = "slot_card";
    let surfaceData = data.surfaces[surfaceType];
    let presetName = surfaceData.initialConfig.presetName;
    let values = structuredClone(surfaceData.initialConfig.values);
    let lastApplyNeedsSetup = false;
    const surfaceSelect = document.getElementById("surface");
    const presetSelect = document.getElementById("preset");
    const controls = document.getElementById("controls");
    const status = document.getElementById("status");

    surfaceSelect.addEventListener("change", () => {
      surfaceType = surfaceSelect.value;
      surfaceData = data.surfaces[surfaceType];
      presetName = surfaceData.initialConfig.presetName;
      values = structuredClone(surfaceData.initialConfig.values);
      lastApplyNeedsSetup = false;
      rebuild();
    });

    function rebuild() {
      buildPresetOptions();
      buildControls();
      render();
      renderAdapter();
      document.getElementById("setup").style.display = lastApplyNeedsSetup ? "inline-block" : "none";
      status.textContent = surfaceData.configLoad.warning ? surfaceData.configLoad.warning : "";
    }

    function buildPresetOptions() {
      presetSelect.textContent = "";
      for (const preset of surfaceData.presets) {
        const option = document.createElement("option");
        option.value = preset.name;
        option.textContent = preset.name;
        option.selected = preset.name === presetName;
        presetSelect.append(option);
      }
    }

    function buildControls() {
      controls.textContent = "";
      for (const key of numericKeysBySurface[surfaceType]) {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = labels[key];
        const row = document.createElement("div");
        row.className = "control-row";
        const range = document.createElement("input");
        const number = document.createElement("input");
        const bounds = surfaceData.bounds[key];
        range.type = "range"; range.min = bounds.min; range.max = bounds.max; range.step = bounds.step; range.value = values[key];
        number.type = "number"; number.min = bounds.min; number.max = bounds.max; number.step = bounds.step; number.value = values[key];
        range.addEventListener("input", () => setNumber(key, range.value, number, range));
        number.addEventListener("input", () => setNumber(key, number.value, number, range));
        row.append(range, number);
        wrapper.append(label, row);
        controls.append(wrapper);
      }
      for (const key of colorKeysBySurface[surfaceType]) {
        const wrapper = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = labels[key];
        const input = document.createElement("input");
        input.type = "color";
        input.value = values[key];
        input.addEventListener("input", () => { values[key] = input.value; render(); });
        wrapper.append(label, input);
        controls.append(wrapper);
      }
    }

    function setNumber(key, raw, number, range) {
      const bounds = surfaceData.bounds[key];
      const next = Math.min(bounds.max, Math.max(bounds.min, Number(raw)));
      values[key] = next;
      number.value = next;
      range.value = next;
      render();
    }

    presetSelect.addEventListener("change", () => {
      const preset = surfaceData.presets.find((candidate) => candidate.name === presetSelect.value);
      if (!preset) return;
      presetName = preset.name;
      values = structuredClone(preset.values);
      buildControls();
      render();
    });
    document.getElementById("reset").addEventListener("click", () => {
      const preset = surfaceData.presets.find((candidate) => candidate.name === presetName) ?? surfaceData.presets[0];
      values = structuredClone(preset.values);
      buildControls();
      render();
    });
    document.getElementById("save").addEventListener("click", () => {
      status.textContent = "Saving style config and applying supported visual values...";
      vscode.postMessage({ command: "saveAndApply", surfaceType, presetName, values });
    });
    document.getElementById("setup").addEventListener("click", () => {
      status.textContent = "Running one-time adapter setup after scope guard checks...";
      vscode.postMessage({ command: "setupBridge", surfaceType, presetName, values });
    });
    window.addEventListener("message", (event) => {
      const message = event.data;
      if (message.command !== "saveResult" || message.surfaceType !== surfaceType) return;
      if (!message.ok) { status.textContent = "Save/apply failed: " + message.error; return; }
      lastApplyNeedsSetup = (message.applySummary ?? []).some((line) => line.includes("setup offered: yes") || line.includes("one-time setup: blocked"));
      document.getElementById("setup").style.display = lastApplyNeedsSetup ? "inline-block" : "none";
      status.textContent = ["Saved: " + message.configPath, message.rollbackPaths && message.rollbackPaths.length > 0 ? "Rollback: " + message.rollbackPaths.join(", ") : "Rollback: no existing target overwritten", "", "Adapter:", ...(message.applySummary ?? []), "", "Manual checklist:", ...(message.checklist ?? []).map((item) => "- " + item)].join("\\n");
    });

    function render() {
      if (surfaceType === "background_readability") {
        renderBackgroundBoard(document.getElementById("before"), surfaceData.beforeValues);
        renderBackgroundBoard(document.getElementById("after"), values);
      } else {
        renderSlotBoard(document.getElementById("before"), surfaceData.beforeValues);
        renderSlotBoard(document.getElementById("after"), values);
      }
    }

    function renderSlotBoard(container, style) {
      container.className = "slot-board";
      container.textContent = "";
      container.style.gridTemplateColumns = "repeat(3, " + style.slotWidth + "px)";
      container.style.gap = style.gap + "px";
      setSlotVars(container, style);
      appendSlotCards(container, true);
    }

    function renderBackgroundBoard(container, style) {
      container.className = "background-board";
      container.textContent = "";
      container.style.setProperty("--bg-color", style.backgroundColor);
      container.style.setProperty("--image-opacity", style.backgroundImageOpacity);
      container.style.setProperty("--overlay-color", style.contrastOverlayColor);
      container.style.setProperty("--overlay-opacity", style.contrastOverlayOpacity);
      container.style.setProperty("--vignette", style.vignetteStrength);
      container.style.setProperty("--pattern-opacity", style.patternOpacity);
      container.style.setProperty("--blur", style.blurAmount + "px");
      container.style.setProperty("--brightness", style.brightness);
      container.style.setProperty("--contrast", style.contrast);
      setSlotVars(container, data.surfaces.slot_card.beforeValues);
      const hud = document.createElement("div");
      hud.className = "hud";
      hud.textContent = "Coins 12.4K  |  Food 890";
      const foreground = document.createElement("div");
      foreground.className = "foreground";
      container.append(hud, foreground);
      appendSlotCards(foreground, false);
    }

    function setSlotVars(container, style) {
      container.style.setProperty("--slot-width", style.slotWidth + "px");
      container.style.setProperty("--slot-height", style.slotHeight + "px");
      container.style.setProperty("--border-width", style.borderWidth + "px");
      container.style.setProperty("--corner-radius", style.cornerRadius + "px");
      container.style.setProperty("--fill-color", style.fillColor);
      container.style.setProperty("--border-color", style.borderColor);
      container.style.setProperty("--selected-glow", style.selectedGlowStrength);
      container.style.setProperty("--locked-opacity", style.lockedOverlayOpacity);
      container.style.setProperty("--empty-opacity", style.emptySlotOpacity);
      container.style.setProperty("--pulse-scale", style.mergeCandidatePulseScale);
      container.style.setProperty("--monster-scale", style.monsterDisplayScale);
      container.style.setProperty("--monster-offset", style.monsterVerticalOffset + "px");
    }

    function appendSlotCards(container, nine) {
      const states = ["empty", "occupied", "selected", "locked", "merge candidate"];
      const count = nine ? 9 : 5;
      for (let index = 0; index < count; index += 1) {
        const state = states[index % states.length];
        const card = document.createElement("div");
        card.className = "slot-card " + (state === "merge candidate" ? "merge" : state);
        const label = document.createElement("span");
        label.className = "state-label";
        label.textContent = state;
        card.append(label);
        if (state === "empty") {
          const mark = document.createElement("div");
          mark.className = "empty-mark";
          card.append(mark);
        } else {
          const monster = document.createElement("div");
          monster.className = "monster";
          card.append(monster);
        }
        container.append(card);
      }
    }

    function renderAdapter() {
      const adapterList = document.getElementById("adapter");
      adapterList.textContent = "";
      const adapter = surfaceData.adapterState;
      const lines = ["Config: " + surfaceData.configLoad.status, surfaceData.configLoad.warning ? "Warning: " + surfaceData.configLoad.warning : "", "Detected: " + adapter.detection.detected + " (" + adapter.detection.confidence + ")", "Owners: " + (adapter.detection.ownerFiles.length > 0 ? adapter.detection.ownerFiles.join(", ") : "none"), "Connected: " + adapter.connection.connected + " (" + adapter.connection.connectionType + ")", "Connected files: " + (adapter.connection.connectedFiles.length > 0 ? adapter.connection.connectedFiles.join(", ") : "none"), ...adapter.detection.reasons.map((reason) => "Reason: " + reason), ...adapter.connection.missingPieces.map((piece) => "Missing: " + piece), ...adapter.detection.warnings.map((warning) => "Warning: " + warning)];
      for (const line of lines.filter(Boolean)) {
        const item = document.createElement("li");
        item.textContent = line;
        adapterList.append(item);
      }
    }
    rebuild();
  </script>
</body>
</html>`;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
