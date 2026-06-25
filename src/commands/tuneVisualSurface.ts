import * as vscode from "vscode";

import { applyIdleMonsterFarmReplacementAsset, getIdleMonsterFarmAssetTargets } from "../adapters/idleMonsterFarm/assetReplacementAdapter";
import { applyIdleMonsterFarmBackgroundStyle, getIdleMonsterFarmBackgroundAdapterState, setupIdleMonsterFarmBackgroundBridge, summarizeBackgroundApplyResult } from "../adapters/idleMonsterFarm/backgroundAdapter";
import { applyIdleMonsterFarmButtonStyle, getIdleMonsterFarmButtonAdapterState, setupIdleMonsterFarmButtonBridge, summarizeButtonApplyResult } from "../adapters/idleMonsterFarm/buttonAdapter";
import { applyIdleMonsterFarmFarmSlotStyle, getIdleMonsterFarmFarmSlotAdapterState, setupIdleMonsterFarmFarmSlotBridge, summarizeFarmSlotApplyResult } from "../adapters/idleMonsterFarm/farmSlotAdapter";
import { applyIdleMonsterFarmPanelStyle, getIdleMonsterFarmPanelAdapterState, setupIdleMonsterFarmPanelBridge, summarizePanelApplyResult } from "../adapters/idleMonsterFarm/panelAdapter";
import { applyIdleMonsterFarmRewardToastStyle, getIdleMonsterFarmRewardToastAdapterState, setupIdleMonsterFarmRewardToastBridge, summarizeRewardToastApplyResult } from "../adapters/idleMonsterFarm/rewardToastAdapter";
import { logCommandEnd, logCommandStart, logError, logInfo, logWarn } from "../core/output";
import { checkV05VisualScope } from "../core/v05VisualScopeGuard";
import {
  backgroundReadabilityStyleConfigRelativePath,
  BackgroundStyleConfigLoadResult,
  buildButtonStyleConfig,
  buildBackgroundReadabilityStyleConfig,
  buildPanelStyleConfig,
  buildRewardToastStyleConfig,
  buildRollbackSnapshotName,
  buildSlotCardStyleConfig,
  farmSlotStyleConfigRelativePath,
  loadBackgroundReadabilityStyleConfigFromText,
  loadButtonStyleConfigFromText,
  loadPanelStyleConfigFromText,
  loadRewardToastStyleConfigFromText,
  loadSlotCardStyleConfigFromText,
  panelStyleConfigRelativePath,
  PanelStyleConfigLoadResult,
  buttonStyleConfigRelativePath,
  ButtonStyleConfigLoadResult,
  rewardToastStyleConfigRelativePath,
  RewardToastStyleConfigLoadResult,
  StyleConfigLoadResult
} from "../core/visualSurfaceConfig";
import { ensureDirectory, labUri, pathExists, readTextFile, readTextFileIfExists, requireWorkspaceFolder, writeJsonFile, writeTextFile } from "../core/workspace";
import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { buttonStyleBounds, buttonStylePresets, defaultButtonStyle } from "../presets/buttonStylePresets";
import { defaultPanelStyle, panelStyleBounds, panelStylePresets } from "../presets/panelStylePresets";
import { defaultRewardToastStyle, rewardToastPresets, rewardToastStyleBounds } from "../presets/rewardToastPresets";
import { defaultSlotCardStyle, slotCardPresets, slotCardStyleBounds } from "../presets/slotCardPresets";
import { AssetReplacementTargetId, BackgroundReadabilityStyleValues, ButtonStyleValues, PanelStyleValues, RewardToastStyleValues, SlotCardStyleValues, VisualSurfaceType } from "../types/visualSurface";

type SurfaceValues = SlotCardStyleValues | BackgroundReadabilityStyleValues | PanelStyleValues | RewardToastStyleValues | ButtonStyleValues | Record<string, never>;

interface SaveMessage {
  command: "saveAndApply" | "setupBridge" | "applyAsset";
  surfaceType: VisualSurfaceType;
  presetName: string;
  values: SurfaceValues;
  assetTargetId?: AssetReplacementTargetId;
  fileName?: string;
  dataBase64?: string;
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
    const slotLoad = loadSlotCardStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "farm-slot-style.json")));
    const backgroundLoad = loadBackgroundReadabilityStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "background-readability-style.json")));
    const panelLoad = loadPanelStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "panel-style.json")));
    const rewardToastLoad = loadRewardToastStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "reward-toast-style.json")));
    const buttonLoad = loadButtonStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "button-style.json")));
    for (const warning of [slotLoad.warning, backgroundLoad.warning, panelLoad.warning, rewardToastLoad.warning, buttonLoad.warning].filter((value): value is string => Boolean(value))) {
      logWarn(warning);
      vscode.window.showWarningMessage(warning);
    }

    const slotState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
    const backgroundState = await getIdleMonsterFarmBackgroundAdapterState(folder);
    const panelState = await getIdleMonsterFarmPanelAdapterState(folder);
    const rewardToastState = await getIdleMonsterFarmRewardToastAdapterState(folder);
    const buttonState = await getIdleMonsterFarmButtonAdapterState(folder);
    const assetTargets = getIdleMonsterFarmAssetTargets();

    const panel = vscode.window.createWebviewPanel("gamePolishLab.tuneVisualSurface", "Tune Visual Surface", vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folder.uri]
    });

    panel.webview.html = renderHtml({
      slotLoad,
      backgroundLoad,
      panelLoad,
      rewardToastLoad,
      buttonLoad,
      slotState,
      backgroundState,
      panelState,
      rewardToastState,
      buttonState,
      assetTargets
    });

    panel.webview.onDidReceiveMessage(async (message: SaveMessage) => {
      const result = message.command === "applyAsset"
        ? await applyAsset(folder, message)
        : message.command === "setupBridge"
        ? await setupBridge(folder, message, slotLoad, backgroundLoad, panelLoad, rewardToastLoad, buttonLoad)
        : await saveAndApply(folder, message, slotLoad, backgroundLoad, panelLoad, rewardToastLoad, buttonLoad);
      await panel.webview.postMessage(result);
    });
  } catch (error) {
    logError("tune visual surface failed:", error);
    vscode.window.showErrorMessage(`Failed to open visual surface tuner: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.tuneVisualSurface");
  }
}

async function saveAndApply(folder: vscode.WorkspaceFolder, message: SaveMessage, slotLoad: StyleConfigLoadResult, backgroundLoad: BackgroundStyleConfigLoadResult, panelLoad: PanelStyleConfigLoadResult, rewardToastLoad: RewardToastStyleConfigLoadResult, buttonLoad: ButtonStyleConfigLoadResult): Promise<SaveResultMessage> {
  try {
    if (message.surfaceType === "background_readability") {
      const config = buildBackgroundReadabilityStyleConfig(message.presetName, message.values as BackgroundReadabilityStyleValues);
      const result = await saveConfigAndApply(folder, "background_readability", backgroundReadabilityStyleConfigRelativePath, "background-readability-style.json", backgroundLoad, async () => summarizeBackgroundApplyResult(folder, await applyIdleMonsterFarmBackgroundStyle(folder, config)));
      await writeJsonFile(labUri(folder, "styles", "background-readability-style.json"), config);
      return result;
    }
    if (message.surfaceType === "panel") {
      const config = buildPanelStyleConfig(message.presetName, message.values as PanelStyleValues);
      const result = await saveConfigAndApply(folder, "panel", panelStyleConfigRelativePath, "panel-style.json", panelLoad, async () => summarizePanelApplyResult(folder, await applyIdleMonsterFarmPanelStyle(folder, config)));
      await writeJsonFile(labUri(folder, "styles", "panel-style.json"), config);
      return result;
    }
    if (message.surfaceType === "reward_toast") {
      const config = buildRewardToastStyleConfig(message.presetName, message.values as RewardToastStyleValues);
      const result = await saveConfigAndApply(folder, "reward_toast", rewardToastStyleConfigRelativePath, "reward-toast-style.json", rewardToastLoad, async () => summarizeRewardToastApplyResult(folder, await applyIdleMonsterFarmRewardToastStyle(folder, config)));
      await writeJsonFile(labUri(folder, "styles", "reward-toast-style.json"), config);
      return result;
    }
    if (message.surfaceType === "button") {
      const config = buildButtonStyleConfig(message.presetName, message.values as ButtonStyleValues);
      const result = await saveConfigAndApply(folder, "button", buttonStyleConfigRelativePath, "button-style.json", buttonLoad, async () => summarizeButtonApplyResult(folder, await applyIdleMonsterFarmButtonStyle(folder, config)));
      await writeJsonFile(labUri(folder, "styles", "button-style.json"), config);
      return result;
    }
    const config = buildSlotCardStyleConfig(message.presetName, message.values as SlotCardStyleValues);
    const result = await saveConfigAndApply(folder, "slot_card", farmSlotStyleConfigRelativePath, "farm-slot-style.json", slotLoad, async () => summarizeFarmSlotApplyResult(folder, await applyIdleMonsterFarmFarmSlotStyle(folder, config)));
    await writeJsonFile(labUri(folder, "styles", "farm-slot-style.json"), config);
    return result;
  } catch (error) {
    logError("save/apply visual surface failed:", error);
    return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function saveConfigAndApply(
  folder: vscode.WorkspaceFolder,
  surfaceType: Exclude<VisualSurfaceType, "asset_replacement">,
  configRelativePath: string,
  fileName: string,
  load: StyleConfigLoadResult | BackgroundStyleConfigLoadResult | PanelStyleConfigLoadResult | RewardToastStyleConfigLoadResult | ButtonStyleConfigLoadResult,
  apply: () => Promise<string[]>
): Promise<SaveResultMessage> {
  const scope = checkV05VisualScope([configRelativePath], { throughAdapter: false });
  if (!scope.ok) {
    const error = `v0.56 scope guard blocked config save: ${scope.forbiddenFiles.join(", ")}`;
    logWarn(error);
    return { command: "saveResult", ok: false, surfaceType, error, warnings: scope.warnings };
  }
  await ensureDirectory(labUri(folder, "styles"));
  const configUri = labUri(folder, "styles", fileName);
  const configRollbacks = await createRollbackSnapshotIfNeeded(folder, configUri, configRelativePath);
  const applySummary = await apply();
  logSummary(applySummary, []);
  const checklist = checklistFor(surfaceType, load, configRollbacks.length > 0, applySummary);
  logChecklist(`v0.56 ${surfaceType} manual test checklist:`, checklist);
  return {
    command: "saveResult",
    ok: true,
    surfaceType,
    configPath: configRelativePath,
    rollbackPaths: configRollbacks,
    checklist,
    applySummary,
    warnings: []
  };
}

async function setupBridge(folder: vscode.WorkspaceFolder, message: SaveMessage, slotLoad: StyleConfigLoadResult, backgroundLoad: BackgroundStyleConfigLoadResult, panelLoad: PanelStyleConfigLoadResult, rewardToastLoad: RewardToastStyleConfigLoadResult, buttonLoad: ButtonStyleConfigLoadResult): Promise<SaveResultMessage> {
  try {
    if (message.surfaceType === "background_readability") {
      const result = await setupIdleMonsterFarmBackgroundBridge(folder, buildBackgroundReadabilityStyleConfig(message.presetName, message.values as BackgroundReadabilityStyleValues));
      return setupResponse("background_readability", backgroundReadabilityStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("background_readability", backgroundLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.background", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings);
    }
    if (message.surfaceType === "panel") {
      const result = await setupIdleMonsterFarmPanelBridge(folder, buildPanelStyleConfig(message.presetName, message.values as PanelStyleValues));
      return setupResponse("panel", panelStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("panel", panelLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.panels", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings);
    }
    if (message.surfaceType === "reward_toast") {
      const result = await setupIdleMonsterFarmRewardToastBridge(folder, buildRewardToastStyleConfig(message.presetName, message.values as RewardToastStyleValues));
      return setupResponse("reward_toast", rewardToastStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("reward_toast", rewardToastLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.reward_toast", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings);
    }
    if (message.surfaceType === "button") {
      const result = await setupIdleMonsterFarmButtonBridge(folder, buildButtonStyleConfig(message.presetName, message.values as ButtonStyleValues));
      return setupResponse("button", buttonStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("button", buttonLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.buttons", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings);
    }
    const result = await setupIdleMonsterFarmFarmSlotBridge(folder, buildSlotCardStyleConfig(message.presetName, message.values as SlotCardStyleValues));
    return setupResponse("slot_card", farmSlotStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("slot_card", slotLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.farm_slots", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings);
  } catch (error) {
    logError("setup visual bridge failed:", error);
    return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function applyAsset(folder: vscode.WorkspaceFolder, message: SaveMessage): Promise<SaveResultMessage> {
  try {
    if (!message.assetTargetId || !message.fileName || !message.dataBase64) {
      return { command: "saveResult", ok: false, surfaceType: "asset_replacement", error: "Choose a PNG/WebP asset before applying." };
    }
    const result = await applyIdleMonsterFarmReplacementAsset(folder, {
      targetId: message.assetTargetId,
      fileName: message.fileName,
      bytes: Buffer.from(message.dataBase64, "base64")
    });
    const applySummary = [
      "adapter target: idle_monster_farm.assets",
      `asset target: ${message.assetTargetId}`,
      `copied: ${result.copied ? "yes" : "no"}`,
      `assignment updated: ${result.assignmentUpdated ? "yes" : "no"}`,
      `assignment mode: ${result.model?.assignmentMode ?? "unknown"}`,
      `destination: ${result.destinationPath ?? "none"}`,
      `changed files: ${result.changedFiles.length > 0 ? result.changedFiles.join(", ") : "none"}`,
      `rollback snapshots: ${result.rollbackPaths.length > 0 ? result.rollbackPaths.join(", ") : "none"}`,
      ...result.warnings.map((warning) => `warning: ${warning}`),
      ...result.errors.map((error) => `error: ${error}`)
    ];
    logSummary(applySummary, result.warnings);
    logChecklist("v0.53 asset replacement manual test checklist:", result.checklist);
    return {
      command: "saveResult",
      ok: result.errors.length === 0,
      surfaceType: "asset_replacement",
      configPath: result.destinationPath,
      rollbackPaths: result.rollbackPaths,
      checklist: result.checklist,
      applySummary,
      warnings: result.warnings,
      error: result.errors.length > 0 ? result.errors.join(" ") : undefined
    };
  } catch (error) {
    logError("asset replacement apply failed:", error);
    return { command: "saveResult", ok: false, surfaceType: "asset_replacement", error: errorToMessage(error) };
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

function setupResponse(surfaceType: VisualSurfaceType, configPath: string, blockedFiles: string[], rollbackPaths: string[], checklist: string[], applySummary: string[], warnings: string[]): SaveResultMessage {
  logSummary(applySummary, warnings);
  logChecklist(`v0.56 ${surfaceType} manual test checklist:`, checklist);
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

function checklistFor(surfaceType: Exclude<VisualSurfaceType, "asset_replacement">, load: StyleConfigLoadResult | BackgroundStyleConfigLoadResult | PanelStyleConfigLoadResult | RewardToastStyleConfigLoadResult | ButtonStyleConfigLoadResult, rollbackCreated: boolean, applySummary: string[]): string[] {
  if (surfaceType === "button") {
    return [
      load.existingConfigDetected ? "button style config detected" : "button style config was missing and a default config was created",
      load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
      load.warning ? "invalid config falls back safely with warning" : "button config schema accepted or defaulted safely",
      "idle/hover/active/disabled previews render",
      "press scale/duration preview updates",
      "icon scale and label scale update preview",
      "fill/border/radius/shadow/glow controls update preview",
      "action bar target preview renders",
      "hatch button preview renders",
      "upgrade button preview renders",
      applySummary.some((line) => line.includes("owner files: none")) ? "likely button/action-bar owner files were not detected" : "likely button/action-bar owner files detected",
      applySummary.some((line) => line.includes("connected: yes")) ? "connected status reported: connected" : "connected/not-connected status reported",
      applySummary.some((line) => line.includes("setup offered: yes")) ? "one-time setup path offered instead of unsafe patching" : "updated values applied without integration changes when connected",
      rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
      "no button action/economy/hatch/upgrade/progression/ad/save/inventory/gameplay files changed"
    ];
  }
  if (surfaceType === "reward_toast") {
    return [
      load.existingConfigDetected ? "reward toast style config detected" : "reward toast style config was missing and a default config was created",
      load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
      load.warning ? "invalid config falls back safely with warning" : "reward toast config schema accepted or defaulted safely",
      "animation preview renders",
      "duration/rise/scale/bounce/fade controls update preview",
      "sparkle count updates preview",
      "text/icon/fill/border/radius/shadow/glow controls update preview",
      applySummary.some((line) => line.includes("owner files: none")) ? "likely reward feedback owner files were not detected" : "likely reward feedback owner files detected",
      applySummary.some((line) => line.includes("connected: yes")) ? "connected status reported: connected" : "connected/not-connected status reported",
      applySummary.some((line) => line.includes("setup offered: yes")) ? "one-time setup path offered instead of unsafe patching" : "updated values applied without integration changes when connected",
      rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
      "no reward amount/economy/quest/progression/ad/save/inventory/gameplay files changed"
    ];
  }
  if (surfaceType === "panel") {
    return [
      load.existingConfigDetected ? "panel style config detected" : "panel style config was missing and a default config was created",
      load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
      load.warning ? "invalid config falls back safely with warning" : "panel config schema accepted or defaulted safely",
      "dense-content preview renders",
      "navigation panel preview renders",
      "hatch panel preview renders",
      "quest panel preview renders",
      "fill/border/radius/header/padding/divider/shadow/glow controls update preview",
      applySummary.some((line) => line.includes("owner files: none")) ? "likely panel owner files were not detected" : "likely panel owner files detected",
      applySummary.some((line) => line.includes("connected: yes")) ? "connected status reported: connected" : "connected/not-connected status reported",
      applySummary.some((line) => line.includes("setup offered: yes")) ? "one-time setup path offered instead of unsafe patching" : "updated values applied without integration changes when connected",
      rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
      "no save/economy/hatch/progression/quest/ad/navigation-behavior/gameplay files changed"
    ];
  }
  if (surfaceType === "background_readability") {
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
      rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
      "no save/economy/hatch/progression/merge/quest/ad/level-data files changed"
    ];
  }
  return [
    load.existingConfigDetected ? "existing style config detected" : "existing style config was missing and a default config was created",
    load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
    rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
    "empty/occupied/selected/locked/merge-candidate states still render",
    "no save/economy/hatch/progression/merge/quest/ad files were changed"
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

function renderHtml(input: {
  slotLoad: StyleConfigLoadResult;
  backgroundLoad: BackgroundStyleConfigLoadResult;
  panelLoad: PanelStyleConfigLoadResult;
  rewardToastLoad: RewardToastStyleConfigLoadResult;
  buttonLoad: ButtonStyleConfigLoadResult;
  slotState: Awaited<ReturnType<typeof getIdleMonsterFarmFarmSlotAdapterState>>;
  backgroundState: Awaited<ReturnType<typeof getIdleMonsterFarmBackgroundAdapterState>>;
  panelState: Awaited<ReturnType<typeof getIdleMonsterFarmPanelAdapterState>>;
  rewardToastState: Awaited<ReturnType<typeof getIdleMonsterFarmRewardToastAdapterState>>;
  buttonState: Awaited<ReturnType<typeof getIdleMonsterFarmButtonAdapterState>>;
  assetTargets: ReturnType<typeof getIdleMonsterFarmAssetTargets>;
}): string {
  const nonce = createNonce();
  const payload = JSON.stringify({
    surfaces: {
      slot_card: { presets: slotCardPresets, bounds: slotCardStyleBounds, initialConfig: input.slotLoad.config, configLoad: input.slotLoad, adapterState: input.slotState, beforeValues: defaultSlotCardStyle },
      background_readability: { presets: backgroundReadabilityPresets, bounds: backgroundReadabilityStyleBounds, initialConfig: input.backgroundLoad.config, configLoad: input.backgroundLoad, adapterState: input.backgroundState, beforeValues: defaultBackgroundReadabilityStyle },
      panel: { presets: panelStylePresets, bounds: panelStyleBounds, initialConfig: input.panelLoad.config, configLoad: input.panelLoad, adapterState: input.panelState, beforeValues: defaultPanelStyle },
      reward_toast: { presets: rewardToastPresets, bounds: rewardToastStyleBounds, initialConfig: input.rewardToastLoad.config, configLoad: input.rewardToastLoad, adapterState: input.rewardToastState, beforeValues: defaultRewardToastStyle },
      button: { presets: buttonStylePresets, bounds: buttonStyleBounds, initialConfig: input.buttonLoad.config, configLoad: input.buttonLoad, adapterState: input.buttonState, beforeValues: defaultButtonStyle }
    },
    assetTargets: input.assetTargets
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Polish Lab v0.56</title>
  <style nonce="${nonce}">
    :root{color-scheme:light dark;--panel:var(--vscode-editorWidget-background);--border:var(--vscode-panel-border);--text:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--button:var(--vscode-button-background);--button-text:var(--vscode-button-foreground);--focus:var(--vscode-focusBorder)}
    *{box-sizing:border-box} body{margin:0;padding:18px;color:var(--text);font-family:var(--vscode-font-family);background:var(--vscode-editor-background)}
    main{display:grid;grid-template-columns:minmax(280px,360px) minmax(360px,1fr);gap:18px;align-items:start} h1,h2,h3,p{margin:0} h1{font-size:20px} h2{font-size:15px;margin-bottom:10px}.meta,.status,.list{color:var(--muted);font-size:12px;line-height:1.45}.panel{border:1px solid var(--border);background:var(--panel);border-radius:8px;padding:14px}.controls{display:grid;gap:12px}label{display:block;font-size:12px;color:var(--muted);margin-bottom:5px}select,input[type=number],input[type=color]{width:100%;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--border));border-radius:4px;min-height:28px}input[type=range]{width:100%}.control-row{display:grid;grid-template-columns:1fr 76px;gap:8px;align-items:center}.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:14px}.board{position:relative;display:grid;align-content:start;gap:12px;min-height:390px;overflow:hidden;border:1px solid var(--border);border-radius:6px;padding:14px;background:#253629}.slot-grid{display:grid;grid-template-columns:repeat(3,var(--slot-width));gap:var(--slot-gap)}.slot-card{position:relative;display:grid;place-items:center;width:var(--slot-width);height:var(--slot-height);background:var(--fill-color);border:var(--border-width) solid var(--border-color);border-radius:var(--corner-radius);overflow:hidden}.slot-card.empty{opacity:var(--empty-opacity)}.slot-card.selected{box-shadow:0 0 calc(28px * var(--selected-glow)) var(--border-color)}.slot-card.locked:after{content:"";position:absolute;inset:0;background:rgba(0,0,0,var(--locked-opacity))}.state-label{position:absolute;left:6px;top:5px;z-index:2;font-size:10px;color:#fff;text-shadow:0 1px 2px #000}.monster{width:52px;height:52px;border-radius:45%;background:radial-gradient(circle at 34% 28%,#fff 0 8%,#81d37b 9% 44%,#2f8a4a 45% 100%);border:3px solid #173f25;transform:translateY(var(--monster-offset)) scale(var(--monster-scale))}.hud{position:relative;z-index:1;width:max-content;padding:6px 8px;color:#fff;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.35);border-radius:6px}.bg:before{content:"";position:absolute;inset:0;opacity:var(--image-opacity);background:repeating-linear-gradient(45deg,rgba(255,255,255,var(--pattern-opacity)) 0 8px,transparent 8px 18px),radial-gradient(circle at 28% 25%,rgba(255,255,255,.3),transparent 18%)}.bg:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at center,transparent 0 50%,rgba(0,0,0,var(--vignette)) 100%),linear-gradient(var(--overlay-color),var(--overlay-color));opacity:var(--overlay-opacity)}.foreground{position:relative;z-index:1}.panel-preview{position:relative;display:grid;gap:var(--panel-gap);width:min(100%,360px);padding:var(--panel-padding);color:#fff;background:color-mix(in srgb,var(--panel-fill) calc(var(--panel-opacity) * 100%),transparent);border:var(--panel-border-width) solid var(--panel-border);border-radius:var(--panel-radius);box-shadow:0 10px calc(28px * var(--panel-shadow)) rgba(0,0,0,.55),0 0 calc(24px * var(--panel-glow)) var(--panel-border);overflow:hidden}.panel-preview:before{content:"";position:absolute;left:0;right:0;top:0;height:var(--panel-accent-height);background:var(--panel-accent)}.panel-title{font-size:var(--panel-title-size);font-weight:700}.panel-row{display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;min-height:28px;font-size:var(--panel-body-size)}.panel-row.disabled{opacity:var(--panel-disabled)}.panel-icon{width:18px;height:18px;border-radius:4px;background:var(--panel-accent)}.panel-divider{height:var(--panel-divider-thickness);background:var(--panel-divider);opacity:var(--panel-divider-opacity)}.panel-action{justify-self:start;min-width:92px;min-height:26px;border-radius:5px;border:1px solid var(--panel-border);background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:var(--panel-body-size)}.reward-stage{position:relative;min-height:330px;display:grid;place-items:center;background:linear-gradient(#314934,#203129)}.reward-toast{position:absolute;display:grid;grid-template-columns:auto auto;gap:8px;align-items:center;padding:8px 12px;color:#fff;background:color-mix(in srgb,var(--toast-fill) calc(var(--toast-opacity) * 100%),transparent);border:var(--toast-border-width) solid var(--toast-border);border-radius:var(--toast-radius);box-shadow:0 12px calc(30px * var(--toast-shadow)) rgba(0,0,0,.55),0 0 calc(28px * var(--toast-glow)) var(--toast-border);font-size:var(--toast-text-size);font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,.7);animation:reward-rise var(--toast-duration) ease-out infinite}.reward-icon{width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 34% 28%,#fff4a8 0 18%,#ffc845 19% 62%,#b96d1c 63% 100%);transform:scale(var(--toast-icon-scale))}.sparkle{position:absolute;width:7px;height:7px;border-radius:50%;background:var(--toast-border);box-shadow:0 0 calc(10px * var(--sparkle-scale)) var(--toast-border);animation:sparkle-pop var(--toast-duration) ease-out infinite}.button-stage{align-content:start;background:linear-gradient(#2f4235,#202b29)}.button-preview-group{display:grid;gap:10px}.button-context{color:#dce8df;font-size:11px;text-transform:uppercase;letter-spacing:.04em}.button-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(0,0,0,.18)}.button-preview{position:relative;display:inline-grid;grid-template-columns:auto auto;place-items:center;align-items:center;gap:var(--button-gap);width:var(--button-width);height:var(--button-height);padding:var(--button-padding-y) var(--button-padding-x);color:var(--button-label);background:color-mix(in srgb,var(--button-fill) calc(var(--button-opacity) * 100%),transparent);border:var(--button-border-width) solid var(--button-border);border-radius:var(--button-radius);box-shadow:0 8px calc(24px * var(--button-shadow)) rgba(0,0,0,.55),0 0 calc(22px * var(--button-glow)) var(--button-border);font-size:var(--button-text-size);font-weight:700;transition:transform var(--button-press-duration) ease,filter var(--button-press-duration) ease}.button-preview:after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(0,0,0,var(--button-active-darken));opacity:0;pointer-events:none}.button-preview.hover{transform:translateY(calc(var(--button-hover-lift) * -1));box-shadow:0 10px calc(24px * var(--button-shadow)) rgba(0,0,0,.55),0 0 calc(28px * var(--button-hover-glow)) var(--button-border)}.button-preview.active{animation:button-press var(--button-press-duration) ease infinite alternate}.button-preview.active:after{opacity:1}.button-preview.disabled{opacity:var(--button-disabled-opacity);filter:saturate(var(--button-disabled-saturation))}.button-icon{width:20px;height:20px;border-radius:6px;background:radial-gradient(circle at 32% 25%,#fff 0 12%,#8dd27f 13% 58%,#2f8650 59% 100%);transform:scale(var(--button-icon-scale))}.button-label{transform:scale(var(--button-label-scale));white-space:nowrap}.drop-zone{border:1px dashed var(--border);border-radius:6px;padding:14px;color:var(--muted);text-align:center}.asset-img{max-width:96px;max-height:96px;object-fit:contain}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}button{min-height:30px;color:var(--button-text);background:var(--button);border:1px solid transparent;border-radius:4px;padding:4px 12px}.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}.status{margin-top:12px;white-space:pre-wrap}.list{margin:8px 0 0;padding-left:18px}@keyframes button-press{from{transform:scale(1)}to{transform:scale(var(--button-active-scale))}}@keyframes reward-rise{0%{opacity:0;transform:translateY(0) scale(var(--toast-start-scale))}18%{opacity:1;transform:translateY(calc(var(--toast-rise) * -.24)) scale(var(--toast-peak-scale))}40%{transform:translateY(calc(var(--toast-rise) * -.5)) scale(calc(var(--toast-end-scale) + var(--toast-bounce) * .08))}78%{opacity:1}100%{opacity:0;transform:translateY(calc(var(--toast-rise) * -1)) scale(var(--toast-end-scale))}}@keyframes sparkle-pop{0%,18%{opacity:0;transform:scale(.2)}34%{opacity:1;transform:scale(var(--sparkle-scale))}100%{opacity:0;transform:translateY(-26px) scale(.1)}}@media(max-width:900px){main,.preview-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div style="margin-bottom:16px"><h1>Game Polish Lab v0.56: Visual Surface Tuning</h1><p class="meta">Visual choice -> preview -> save config/assets -> direct apply for supported adapters.</p></div>
  <main>
    <section class="panel"><h2>Style Values</h2><div class="controls"><div><label for="surface">Surface</label><select id="surface"><option value="slot_card">slot_card</option><option value="background_readability">background_readability</option><option value="asset_replacement">asset_replacement</option><option value="panel">panel</option><option value="reward_toast">reward_toast</option><option value="button">button</option></select></div><div id="presetRow"><label for="preset">Preset</label><select id="preset"></select></div><div id="controls"></div></div><div class="actions"><button class="secondary" id="reset">Reset</button><button class="secondary" id="setup" style="display:none">One-Time Setup</button><button id="save">Save & Apply</button></div><div id="status" class="status"></div></section>
    <section class="preview-grid"><div><h2>Before</h2><div id="before"></div></div><div><h2>After</h2><div id="after"></div></div></section>
  </main>
  <section class="panel" style="margin-top:14px"><h3>Adapter Detection</h3><ul id="adapter" class="list"></ul></section>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi(); const data=${payload};
    const labels={slotWidth:"Slot width",slotHeight:"Slot height",gap:"Gap",borderWidth:"Border width",cornerRadius:"Corner radius",fillColor:"Fill color",borderColor:"Border color",selectedGlowStrength:"Selected glow strength",lockedOverlayOpacity:"Locked overlay opacity",emptySlotOpacity:"Empty slot opacity",mergeCandidatePulseScale:"Merge candidate pulse scale",monsterDisplayScale:"Monster display scale",monsterVerticalOffset:"Monster vertical offset",backgroundColor:"Background color",backgroundImageOpacity:"Image opacity",contrastOverlayColor:"Contrast overlay color",contrastOverlayOpacity:"Contrast overlay opacity",vignetteStrength:"Vignette strength",patternOpacity:"Pattern opacity",blurAmount:"Blur/soften amount",brightness:"Brightness",contrast:"Contrast",fillOpacity:"Fill opacity",headerAccentHeight:"Header accent thickness",padding:"Padding",contentGap:"Content gap",dividerOpacity:"Divider opacity",dividerThickness:"Divider thickness",shadowStrength:"Shadow strength",glowStrength:"Glow strength",titleTextSize:"Title text size",bodyTextSize:"Body text size",disabledOpacity:"Disabled row opacity",headerAccentColor:"Header accent color",dividerColor:"Divider color",durationMs:"Duration",riseDistance:"Rise distance",startScale:"Start scale",peakScale:"Peak scale",endScale:"End scale",bounceStrength:"Bounce strength",fadeInMs:"Fade in",fadeOutMs:"Fade out",sparkleCount:"Sparkle count",sparkleScale:"Sparkle scale",textSize:"Text size",iconScale:"Icon scale",toastFillColor:"Toast fill",toastFillOpacity:"Toast fill opacity",toastBorderColor:"Toast border",toastBorderWidth:"Toast border width",width:"Width",height:"Height",labelColor:"Label color",labelTextSize:"Label text size",labelScale:"Label scale",paddingX:"Padding X",paddingY:"Padding Y",hoverGlowStrength:"Hover glow strength",hoverLift:"Hover lift",activePressScale:"Active press scale",activePressDurationMs:"Active press duration",activeDarkenOpacity:"Active darken opacity",disabledSaturation:"Disabled saturation"};
    const numeric={slot_card:["slotWidth","slotHeight","gap","borderWidth","cornerRadius","selectedGlowStrength","lockedOverlayOpacity","emptySlotOpacity","mergeCandidatePulseScale","monsterDisplayScale","monsterVerticalOffset"],background_readability:["backgroundImageOpacity","contrastOverlayOpacity","vignetteStrength","patternOpacity","blurAmount","brightness","contrast"],panel:["fillOpacity","borderWidth","cornerRadius","headerAccentHeight","padding","contentGap","dividerOpacity","dividerThickness","shadowStrength","glowStrength","titleTextSize","bodyTextSize","disabledOpacity"],reward_toast:["durationMs","riseDistance","startScale","peakScale","endScale","bounceStrength","fadeInMs","fadeOutMs","sparkleCount","sparkleScale","textSize","iconScale","toastFillOpacity","toastBorderWidth","cornerRadius","shadowStrength","glowStrength"],button:["width","height","fillOpacity","borderWidth","cornerRadius","labelTextSize","iconScale","labelScale","contentGap","paddingX","paddingY","hoverGlowStrength","hoverLift","activePressScale","activePressDurationMs","activeDarkenOpacity","disabledOpacity","disabledSaturation","shadowStrength","glowStrength"]};
    const colors={slot_card:["fillColor","borderColor"],background_readability:["backgroundColor","contrastOverlayColor"],panel:["fillColor","borderColor","headerAccentColor","dividerColor"],reward_toast:["toastFillColor","toastBorderColor"],button:["fillColor","borderColor","labelColor"]};
    let surfaceType="slot_card", surfaceData=data.surfaces[surfaceType], presetName=surfaceData.initialConfig.presetName, values=structuredClone(surfaceData.initialConfig.values), selectedAsset=null, needsSetup=false;
    const surface=document.getElementById("surface"), preset=document.getElementById("preset"), controls=document.getElementById("controls"), status=document.getElementById("status");
    surface.addEventListener("change",()=>{surfaceType=surface.value;surfaceData=data.surfaces[surfaceType];presetName=surfaceType==="asset_replacement"?"":surfaceData.initialConfig.presetName;values=surfaceType==="asset_replacement"?{}:structuredClone(surfaceData.initialConfig.values);needsSetup=false;rebuild();});
    function rebuild(){buildPreset();buildControls();render();renderAdapter();document.getElementById("setup").style.display=needsSetup?"inline-block":"none";status.textContent=surfaceType!=="asset_replacement"&&surfaceData.configLoad.warning?surfaceData.configLoad.warning:"";}
    function buildPreset(){preset.textContent="";document.getElementById("presetRow").style.display=surfaceType==="asset_replacement"?"none":"block";if(surfaceType==="asset_replacement")return;for(const p of surfaceData.presets){const o=document.createElement("option");o.value=p.name;o.textContent=p.name;o.selected=p.name===presetName;preset.append(o);}}
    function buildControls(){controls.textContent="";if(surfaceType==="asset_replacement"){buildAssetControls();return;}for(const key of numeric[surfaceType]){const wrap=document.createElement("div"),label=document.createElement("label"),row=document.createElement("div"),range=document.createElement("input"),num=document.createElement("input"),b=surfaceData.bounds[key];label.textContent=labels[key];row.className="control-row";range.type="range";range.min=b.min;range.max=b.max;range.step=b.step;range.value=values[key];num.type="number";num.min=b.min;num.max=b.max;num.step=b.step;num.value=values[key];range.addEventListener("input",()=>setNumber(key,range.value,num,range));num.addEventListener("input",()=>setNumber(key,num.value,num,range));row.append(range,num);wrap.append(label,row);controls.append(wrap);}for(const key of colors[surfaceType]){const wrap=document.createElement("div"),label=document.createElement("label"),input=document.createElement("input");label.textContent=labels[key];input.type="color";input.value=values[key];input.addEventListener("input",()=>{values[key]=input.value;render();});wrap.append(label,input);controls.append(wrap);}}
    function buildAssetControls(){const targetWrap=document.createElement("div"),label=document.createElement("label"),select=document.createElement("select");label.textContent="Asset target";select.id="assetTarget";for(const target of data.assetTargets.targets){const option=document.createElement("option");option.value=target.targetId;option.textContent=target.label+" ("+target.assignmentMode+")";select.append(option);}select.addEventListener("change",render);targetWrap.append(label,select);const fileWrap=document.createElement("div"),fileLabel=document.createElement("label"),drop=document.createElement("div"),file=document.createElement("input");fileLabel.textContent="PNG/WebP replacement";drop.className="drop-zone";drop.textContent="Drop PNG/WebP here or choose a file";file.type="file";file.accept="image/png,image/webp,.png,.webp";file.addEventListener("change",()=>{if(file.files&&file.files[0])readAsset(file.files[0]);});drop.addEventListener("dragover",e=>{e.preventDefault();});drop.addEventListener("drop",e=>{e.preventDefault();if(e.dataTransfer&&e.dataTransfer.files[0])readAsset(e.dataTransfer.files[0]);});fileWrap.append(fileLabel,drop,file);controls.append(targetWrap,fileWrap);}
    function readAsset(file){if(!["image/png","image/webp"].includes(file.type)&&!/\\.(png|webp)$/i.test(file.name)){status.textContent="Unsupported file type. Choose PNG or WebP.";selectedAsset=null;render();return;}const reader=new FileReader();reader.onload=()=>{const dataUrl=String(reader.result);selectedAsset={name:file.name,dataUrl,dataBase64:dataUrl.split(",")[1]||""};status.textContent="Asset loaded for preview: "+file.name;render();};reader.readAsDataURL(file);}
    function setNumber(key,raw,num,range){const b=surfaceData.bounds[key],next=Math.min(b.max,Math.max(b.min,Number(raw)));values[key]=next;num.value=next;range.value=next;render();}
    preset.addEventListener("change",()=>{const p=surfaceData.presets.find(c=>c.name===preset.value);if(!p)return;presetName=p.name;values=structuredClone(p.values);buildControls();render();});
    document.getElementById("reset").addEventListener("click",()=>{if(surfaceType==="asset_replacement"){selectedAsset=null;render();return;}const p=surfaceData.presets.find(c=>c.name===presetName)||surfaceData.presets[0];values=structuredClone(p.values);buildControls();render();});
    document.getElementById("save").addEventListener("click",()=>{if(surfaceType==="asset_replacement"){if(!selectedAsset){status.textContent="Choose a PNG/WebP asset before applying.";return;}vscode.postMessage({command:"applyAsset",surfaceType,presetName:"",values:{},assetTargetId:document.getElementById("assetTarget").value,fileName:selectedAsset.name,dataBase64:selectedAsset.dataBase64});return;}vscode.postMessage({command:"saveAndApply",surfaceType,presetName,values});});
    document.getElementById("setup").addEventListener("click",()=>vscode.postMessage({command:"setupBridge",surfaceType,presetName,values}));
    window.addEventListener("message",event=>{const m=event.data;if(m.command!=="saveResult"||m.surfaceType!==surfaceType)return;if(!m.ok){status.textContent="Save/apply failed: "+m.error;return;}needsSetup=(m.applySummary||[]).some(line=>line.includes("setup offered: yes")||line.includes("one-time setup: blocked"));document.getElementById("setup").style.display=needsSetup?"inline-block":"none";status.textContent=["Saved: "+(m.configPath||""),m.rollbackPaths&&m.rollbackPaths.length?"Rollback: "+m.rollbackPaths.join(", "):"Rollback: no existing target overwritten","","Adapter:",...(m.applySummary||[]),"","Manual checklist:",...(m.checklist||[]).map(i=>"- "+i)].join("\\n");});
    function render(){if(surfaceType==="asset_replacement"){renderAsset(document.getElementById("before"),null);renderAsset(document.getElementById("after"),selectedAsset);return;}if(surfaceType==="button"){renderButton(document.getElementById("before"),surfaceData.beforeValues);renderButton(document.getElementById("after"),values);return;}if(surfaceType==="reward_toast"){renderRewardToast(document.getElementById("before"),surfaceData.beforeValues);renderRewardToast(document.getElementById("after"),values);return;}if(surfaceType==="panel"){renderPanel(document.getElementById("before"),surfaceData.beforeValues);renderPanel(document.getElementById("after"),values);return;}if(surfaceType==="background_readability"){renderBackground(document.getElementById("before"),surfaceData.beforeValues);renderBackground(document.getElementById("after"),values);return;}renderSlot(document.getElementById("before"),surfaceData.beforeValues);renderSlot(document.getElementById("after"),values);}
    function baseBoard(container){container.className="board";container.textContent="";}
    function setSlotVars(el,style){el.style.setProperty("--slot-width",style.slotWidth+"px");el.style.setProperty("--slot-height",style.slotHeight+"px");el.style.setProperty("--slot-gap",style.gap+"px");el.style.setProperty("--border-width",style.borderWidth+"px");el.style.setProperty("--corner-radius",style.cornerRadius+"px");el.style.setProperty("--fill-color",style.fillColor);el.style.setProperty("--border-color",style.borderColor);el.style.setProperty("--selected-glow",style.selectedGlowStrength);el.style.setProperty("--locked-opacity",style.lockedOverlayOpacity);el.style.setProperty("--empty-opacity",style.emptySlotOpacity);el.style.setProperty("--monster-scale",style.monsterDisplayScale);el.style.setProperty("--monster-offset",style.monsterVerticalOffset+"px");}
    function renderSlot(container,style){baseBoard(container);setSlotVars(container,style);const grid=document.createElement("div");grid.className="slot-grid";container.append(grid);appendSlots(grid,9);}
    function appendSlots(container,count){const states=["empty","occupied","selected","locked","merge candidate"];for(let i=0;i<count;i++){const state=states[i%states.length],card=document.createElement("div");card.className="slot-card "+(state==="merge candidate"?"selected":state);const label=document.createElement("span");label.className="state-label";label.textContent=state;card.append(label);if(state==="empty"){card.append(document.createElement("span"));}else{const monster=document.createElement("div");monster.className="monster";card.append(monster);}container.append(card);}}
    function renderBackground(container,style){baseBoard(container);container.classList.add("bg");container.style.background=style.backgroundColor;container.style.setProperty("--image-opacity",style.backgroundImageOpacity);container.style.setProperty("--overlay-color",style.contrastOverlayColor);container.style.setProperty("--overlay-opacity",style.contrastOverlayOpacity);container.style.setProperty("--vignette",style.vignetteStrength);container.style.setProperty("--pattern-opacity",style.patternOpacity);const fg=document.createElement("div");fg.className="foreground";const hud=document.createElement("div");hud.className="hud";hud.textContent="Coins 12.4K | Food 890";const grid=document.createElement("div");grid.className="slot-grid";setSlotVars(grid,data.surfaces.slot_card.beforeValues);fg.append(hud,grid);container.append(fg);appendSlots(grid,5);}
    function setPanelVars(el,style){el.style.setProperty("--panel-fill",style.fillColor);el.style.setProperty("--panel-opacity",style.fillOpacity);el.style.setProperty("--panel-border",style.borderColor);el.style.setProperty("--panel-border-width",style.borderWidth+"px");el.style.setProperty("--panel-radius",style.cornerRadius+"px");el.style.setProperty("--panel-accent",style.headerAccentColor);el.style.setProperty("--panel-accent-height",style.headerAccentHeight+"px");el.style.setProperty("--panel-padding",style.padding+"px");el.style.setProperty("--panel-gap",style.contentGap+"px");el.style.setProperty("--panel-divider",style.dividerColor);el.style.setProperty("--panel-divider-opacity",style.dividerOpacity);el.style.setProperty("--panel-divider-thickness",style.dividerThickness+"px");el.style.setProperty("--panel-shadow",style.shadowStrength);el.style.setProperty("--panel-glow",style.glowStrength);el.style.setProperty("--panel-title-size",style.titleTextSize+"px");el.style.setProperty("--panel-body-size",style.bodyTextSize+"px");el.style.setProperty("--panel-disabled",style.disabledOpacity);}
    function renderPanel(container,style){baseBoard(container);setPanelVars(container,style);[["Navigation",["Farm","Hatch","Quests","Boss Room"],"Open"],["Hatch",["Egg ready","Cost 120 food","Incubator full","Locked rare egg"],"Hatch"],["Quest",["Collect 50 coins","Merge 2 sprouts","Visit hatchery","Locked zone quest"],"Claim"]].forEach(mode=>container.append(panelPreview(mode[0],mode[1],mode[2])));}
    function panelPreview(title,rows,action){const panel=document.createElement("div");panel.className="panel-preview";const heading=document.createElement("div");heading.className="panel-title";heading.textContent=title;panel.append(heading);rows.forEach((text,index)=>{if(index===2){const divider=document.createElement("div");divider.className="panel-divider";panel.append(divider);}const row=document.createElement("div");row.className="panel-row"+(index===rows.length-1?" disabled":"");const icon=document.createElement("div");icon.className="panel-icon";const label=document.createElement("div");label.textContent=text;const value=document.createElement("div");value.textContent=index===rows.length-1?"Locked":"+";row.append(icon,label,value);panel.append(row);});const button=document.createElement("div");button.className="panel-action";button.textContent=action;panel.append(button);return panel;}
    function renderAsset(container,asset){baseBoard(container);setSlotVars(container,data.surfaces.slot_card.beforeValues);const target=document.getElementById("assetTarget")?document.getElementById("assetTarget").value:"monster_art";const hud=document.createElement("div");hud.className="hud";hud.textContent=asset?asset.name:"No asset selected";container.append(hud);if(target==="background_image"&&asset){container.style.backgroundImage="url("+asset.dataUrl+")";container.style.backgroundSize="cover";}const grid=document.createElement("div");grid.className="slot-grid";container.append(grid);const card=document.createElement("div");card.className="slot-card selected";if(asset&&target!=="background_image"){const img=document.createElement("img");img.className="asset-img";img.src=asset.dataUrl;card.append(img);}else{const monster=document.createElement("div");monster.className="monster";card.append(monster);}grid.append(card);}
    function setRewardToastVars(el,style){el.style.setProperty("--toast-duration",style.durationMs+"ms");el.style.setProperty("--toast-rise",style.riseDistance+"px");el.style.setProperty("--toast-start-scale",style.startScale);el.style.setProperty("--toast-peak-scale",style.peakScale);el.style.setProperty("--toast-end-scale",style.endScale);el.style.setProperty("--toast-bounce",style.bounceStrength);el.style.setProperty("--toast-fill",style.toastFillColor);el.style.setProperty("--toast-opacity",style.toastFillOpacity);el.style.setProperty("--toast-border",style.toastBorderColor);el.style.setProperty("--toast-border-width",style.toastBorderWidth+"px");el.style.setProperty("--toast-radius",style.cornerRadius+"px");el.style.setProperty("--toast-shadow",style.shadowStrength);el.style.setProperty("--toast-glow",style.glowStrength);el.style.setProperty("--toast-text-size",style.textSize+"px");el.style.setProperty("--toast-icon-scale",style.iconScale);el.style.setProperty("--sparkle-scale",style.sparkleScale);}
    function renderRewardToast(container,style){baseBoard(container);container.classList.add("reward-stage");setRewardToastVars(container,style);const toast=document.createElement("div");toast.className="reward-toast";toast.style.animationDelay="-"+Math.max(0,style.fadeInMs)+"ms";const icon=document.createElement("div");icon.className="reward-icon";const text=document.createElement("div");text.textContent="+25 Coins";toast.append(icon,text);container.append(toast);for(let i=0;i<style.sparkleCount;i++){const sparkle=document.createElement("div");sparkle.className="sparkle";const angle=(i/style.sparkleCount)*Math.PI*2;const radius=42+(i%3)*18;sparkle.style.left="calc(50% + "+Math.round(Math.cos(angle)*radius)+"px)";sparkle.style.top="calc(50% + "+Math.round(Math.sin(angle)*radius*.5)+"px)";sparkle.style.animationDelay=(i*70)+"ms";container.append(sparkle);}}
    function setButtonVars(el,style){el.style.setProperty("--button-width",style.width+"px");el.style.setProperty("--button-height",style.height+"px");el.style.setProperty("--button-fill",style.fillColor);el.style.setProperty("--button-opacity",style.fillOpacity);el.style.setProperty("--button-border",style.borderColor);el.style.setProperty("--button-border-width",style.borderWidth+"px");el.style.setProperty("--button-radius",style.cornerRadius+"px");el.style.setProperty("--button-label",style.labelColor);el.style.setProperty("--button-text-size",style.labelTextSize+"px");el.style.setProperty("--button-icon-scale",style.iconScale);el.style.setProperty("--button-label-scale",style.labelScale);el.style.setProperty("--button-gap",style.contentGap+"px");el.style.setProperty("--button-padding-x",style.paddingX+"px");el.style.setProperty("--button-padding-y",style.paddingY+"px");el.style.setProperty("--button-hover-glow",style.hoverGlowStrength);el.style.setProperty("--button-hover-lift",style.hoverLift+"px");el.style.setProperty("--button-active-scale",style.activePressScale);el.style.setProperty("--button-press-duration",style.activePressDurationMs+"ms");el.style.setProperty("--button-active-darken",style.activeDarkenOpacity);el.style.setProperty("--button-disabled-opacity",style.disabledOpacity);el.style.setProperty("--button-disabled-saturation",style.disabledSaturation);el.style.setProperty("--button-shadow",style.shadowStrength);el.style.setProperty("--button-glow",style.glowStrength);}
    function renderButton(container,style){baseBoard(container);container.classList.add("button-stage");setButtonVars(container,style);const group=document.createElement("div");group.className="button-preview-group";container.append(group);[["Action bar",["Feed","Hatch","Quest","Locked"]],["Hatch button",["Idle","Hover","Pressed","Disabled"]],["Upgrade button",["Buy","Hover","Press","Maxed"]]].forEach((mode,index)=>{const title=document.createElement("div");title.className="button-context";title.textContent=mode[0];const row=document.createElement("div");row.className="button-row";mode[1].forEach((label,stateIndex)=>row.append(buttonPreview(label,stateIndex)));group.append(title,row);});}
    function buttonPreview(label,index){const states=["idle","hover","active","disabled"],button=document.createElement("div");button.className="button-preview "+states[index];const icon=document.createElement("div");icon.className="button-icon";const text=document.createElement("div");text.className="button-label";text.textContent=label;button.append(icon,text);return button;}
    function renderAdapter(){const list=document.getElementById("adapter");list.textContent="";if(surfaceType==="asset_replacement"){["Adapter: idle_monster_farm.assets",...data.assetTargets.targets.map(t=>t.label+": "+t.assignmentMode+(t.directApplySupported?" direct":" manual_required")),...data.assetTargets.warnings.map(w=>"Warning: "+w)].forEach(add);return;}const adapter=surfaceData.adapterState;["Config: "+surfaceData.configLoad.status,surfaceData.configLoad.warning?"Warning: "+surfaceData.configLoad.warning:"","Detected: "+adapter.detection.detected+" ("+adapter.detection.confidence+")",adapter.detection.targetPanels?"Target panels: "+(adapter.detection.targetPanels.join(", ")||"none"):"",adapter.detection.targetFeedback?"Target feedback: "+(adapter.detection.targetFeedback.join(", ")||"none"):"",adapter.detection.targetButtons?"Target buttons: "+(adapter.detection.targetButtons.join(", ")||"none"):"","Owners: "+(adapter.detection.ownerFiles.length?adapter.detection.ownerFiles.join(", "):"none"),"Connected: "+adapter.connection.connected+" ("+adapter.connection.connectionType+")",...adapter.detection.reasons.map(r=>"Reason: "+r),...adapter.connection.missingPieces.map(p=>"Missing: "+p),...adapter.detection.warnings.map(w=>"Warning: "+w)].filter(Boolean).forEach(add);function add(text){const item=document.createElement("li");item.textContent=text;list.append(item);}}
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
