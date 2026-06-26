import * as vscode from "vscode";

import { applyIdleMonsterFarmReplacementAsset, getIdleMonsterFarmAssetTargets } from "../adapters/idleMonsterFarm/assetReplacementAdapter";
import { applyIdleMonsterFarmBackgroundStyle, getIdleMonsterFarmBackgroundAdapterState, setupIdleMonsterFarmBackgroundBridge, summarizeBackgroundApplyResult } from "../adapters/idleMonsterFarm/backgroundAdapter";
import { applyIdleMonsterFarmButtonStyle, getIdleMonsterFarmButtonAdapterState, setupIdleMonsterFarmButtonBridge, summarizeButtonApplyResult } from "../adapters/idleMonsterFarm/buttonAdapter";
import { applyIdleMonsterFarmFarmSlotStyle, getIdleMonsterFarmFarmSlotAdapterState, setupIdleMonsterFarmFarmSlotBridge, summarizeFarmSlotApplyResult } from "../adapters/idleMonsterFarm/farmSlotAdapter";
import { applyIdleMonsterFarmPanelStyle, getIdleMonsterFarmPanelAdapterState, setupIdleMonsterFarmPanelBridge, summarizePanelApplyResult } from "../adapters/idleMonsterFarm/panelAdapter";
import { applyIdleMonsterFarmRewardToastStyle, getIdleMonsterFarmRewardToastAdapterState, setupIdleMonsterFarmRewardToastBridge, summarizeRewardToastApplyResult } from "../adapters/idleMonsterFarm/rewardToastAdapter";
import { logCommandEnd, logCommandStart, logError, logInfo, logWarn } from "../core/output";
import { applyGenericPhaserAsset, applyGenericPhaserStyle, getGenericPhaserAdapterState, GenericPhaserDetection, GenericPhaserSurfaceType } from "../core/genericPhaserAdapter";
import { createTuningAttempt, getFallbackFieldNoteGuidance, getTreatmentSummary, loadTuningAttemptIndex, updateTuningAttemptResult } from "../core/tuningAttempts";
import { buildVisualDirectApplyPlan, executeVisualDirectApplyPlan } from "../core/visualDirectApplyTemplates";
import { checkVisualScopeGuard, renderVisualScopeGuardMessage, visualScopeGuardWarnings } from "../core/visualScopeGuard";
import { buildVisualPreviewRenderRequest } from "../core/visualPreviewModel";
import { ensureVisualRecipeFiles } from "../core/visualRecipeFiles";
import { getVisualSurfaceRecipe, getVisualSurfaceRecipes, visualSurfacePickerOrder } from "../core/visualRecipeRegistry";
import {
  backgroundReadabilityStyleConfigRelativePath,
  BackgroundStyleConfigLoadResult,
  buildButtonStyleConfig,
  buildBackgroundReadabilityStyleConfig,
  buildPanelStyleConfig,
  buildRewardToastStyleConfig,
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
import { labUri, readTextFileIfExists, requireWorkspaceFolder } from "../core/workspace";
import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { buttonStyleBounds, buttonStylePresets, defaultButtonStyle } from "../presets/buttonStylePresets";
import { defaultPanelStyle, panelStyleBounds, panelStylePresets } from "../presets/panelStylePresets";
import { defaultRewardToastStyle, rewardToastPresets, rewardToastStyleBounds } from "../presets/rewardToastPresets";
import { defaultSlotCardStyle, slotCardPresets, slotCardStyleBounds } from "../presets/slotCardPresets";
import { visualPresetLibrary } from "../presets/visualStylePresetLibrary";
import { AssetReplacementTargetId, BackgroundReadabilityStyleValues, ButtonStyleValues, PanelStyleValues, RewardToastStyleValues, SlotCardStyleValues, VisualSurfaceType } from "../types/visualSurface";
import { VisualTuningApplyMode, VisualTuningAttemptIndex, VisualTuningConnectionState, VisualTuningResultStatus } from "../types/visualTuningAttempt";

type SurfaceValues = SlotCardStyleValues | BackgroundReadabilityStyleValues | PanelStyleValues | RewardToastStyleValues | ButtonStyleValues | Record<string, never>;

export interface TuneVisualSurfaceInitialState {
  surfaceType?: VisualSurfaceType;
  adapterId?: "idle_monster_farm" | "generic_phaser";
  targetLabel?: string;
}

interface SaveMessage {
  command: "saveAndApply" | "setupBridge" | "applyAsset" | "markResult";
  surfaceType: VisualSurfaceType;
  presetName: string;
  values: SurfaceValues;
  adapterId?: "idle_monster_farm" | "generic_phaser";
  targetLabel?: string;
  selectedFiles?: string[];
  assetDestinationFolder?: string;
  directApplyAllowed?: boolean;
  assetTargetId?: AssetReplacementTargetId;
  fileName?: string;
  dataBase64?: string;
  attemptPath?: string;
  resultStatus?: VisualTuningResultStatus;
  resultNote?: string;
}

interface SaveResultMessage {
  command: "saveResult" | "resultMarked";
  ok: boolean;
  surfaceType?: VisualSurfaceType;
  configPath?: string;
  generatedStyleModulePath?: string;
  assetPath?: string;
  fallbackTaskPath?: string;
  directApplyTemplateId?: string;
  directApplyTemplateName?: string;
  attemptId?: string;
  attemptPath?: string;
  resultStatus?: VisualTuningResultStatus;
  rollbackPaths?: string[];
  checklist?: string[];
  applySummary?: string[];
  warnings?: string[];
  error?: string;
}

export async function tuneVisualSurface(context: vscode.ExtensionContext, initialState: TuneVisualSurfaceInitialState = {}): Promise<void> {
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
    const recipeWriteResults = await ensureVisualRecipeFiles(folder);
    const writtenRecipes = recipeWriteResults.filter((result) => result.written);
    if (writtenRecipes.length > 0) {
      logChecklist("v0.58 visual recipe generation checklist:", visualRecipeChecklist(writtenRecipes.map((result) => result.relativePath)));
    }
    for (const result of recipeWriteResults) {
      for (const warning of result.warnings) {
        logWarn(`visual recipe ${result.recipeId}: ${warning}`);
      }
      for (const error of result.errors) {
        logWarn(`visual recipe ${result.recipeId}: ${error}`);
      }
    }
    for (const warning of [slotLoad.warning, backgroundLoad.warning, panelLoad.warning, rewardToastLoad.warning, buttonLoad.warning].filter((value): value is string => Boolean(value))) {
      logWarn(warning);
      vscode.window.showWarningMessage(warning);
    }

    const slotState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
    const backgroundState = await getIdleMonsterFarmBackgroundAdapterState(folder);
    const panelState = await getIdleMonsterFarmPanelAdapterState(folder);
    const rewardToastState = await getIdleMonsterFarmRewardToastAdapterState(folder);
    const buttonState = await getIdleMonsterFarmButtonAdapterState(folder);
    const genericPhaserState = await getGenericPhaserAdapterState(folder);
    const assetTargets = getIdleMonsterFarmAssetTargets();
    const tuningAttemptIndex = await loadTuningAttemptIndex(folder);

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
      genericPhaserState,
      tuningAttemptIndex,
      initialState,
      recipes: getVisualSurfaceRecipes(),
      assetTargets
    });

    panel.webview.onDidReceiveMessage(async (message: SaveMessage) => {
      const result = message.command === "markResult"
        ? await markAttemptResult(folder, message)
        : message.command === "applyAsset"
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
    if (message.adapterId === "generic_phaser") {
      if (message.surfaceType === "asset_replacement") {
        return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: "Use asset apply for Generic Phaser asset replacement." };
      }
      const targetLabel = message.targetLabel ?? "Generic target";
      const fieldNoteGuidance = await getFallbackFieldNoteGuidance(folder, {
        surfaceType: message.surfaceType,
        adapterId: "generic_phaser",
        targetLabel
      });
      const result = await applyGenericPhaserStyle(folder, {
        surfaceType: message.surfaceType as GenericPhaserSurfaceType,
        targetLabel,
        selectedFiles: message.selectedFiles ?? [],
        directApplyAllowed: Boolean(message.directApplyAllowed),
        values: message.values as Record<string, string | number | boolean>,
        fieldNoteGuidance
      });
      logSummary(genericApplySummary(result), result.warnings);
      logChecklist(`v0.58 generic_phaser ${message.surfaceType} manual test checklist:`, result.checklist);
      return recordTuningAttemptForResult(folder, message, {
        command: "saveResult",
        ok: result.ok,
        surfaceType: message.surfaceType,
        configPath: result.configPath,
        generatedStyleModulePath: result.generatedStyleModulePath,
        fallbackTaskPath: result.fallbackTaskPath,
        rollbackPaths: result.rollbackPaths,
        checklist: result.checklist,
        applySummary: genericApplySummary(result),
        warnings: result.warnings,
        error: result.errors.length > 0 ? result.errors.join(" ") : undefined
      }, {
        adapterId: "generic_phaser",
        targetLabel,
        applyMode: result.fallbackTaskPath ? "fallback_task" : result.generatedStyleModulePath ? "direct_apply" : "config_only",
        connectionState: "unknown",
        scopeSummary: result.changedFiles.length > 0 ? result.changedFiles.join(", ") : result.configPath
      });
    }
    if (message.surfaceType === "background_readability") {
      const config = buildBackgroundReadabilityStyleConfig(message.presetName, message.values as BackgroundReadabilityStyleValues);
      const result = await saveConfigAndApply(folder, "background_readability", backgroundReadabilityStyleConfigRelativePath, backgroundLoad, config, async () => summarizeBackgroundApplyResult(folder, await applyIdleMonsterFarmBackgroundStyle(folder, config)));
      if (!result.ok) {
        return result;
      }
      return recordTuningAttemptForResult(folder, message, result, { adapterId: "idle_monster_farm", targetLabel: "Monster Farm background readability" });
    }
    if (message.surfaceType === "panel") {
      const config = buildPanelStyleConfig(message.presetName, message.values as PanelStyleValues);
      const result = await saveConfigAndApply(folder, "panel", panelStyleConfigRelativePath, panelLoad, config, async () => summarizePanelApplyResult(folder, await applyIdleMonsterFarmPanelStyle(folder, config)));
      if (!result.ok) {
        return result;
      }
      return recordTuningAttemptForResult(folder, message, result, { adapterId: "idle_monster_farm", targetLabel: "Monster Farm panels" });
    }
    if (message.surfaceType === "reward_toast") {
      const config = buildRewardToastStyleConfig(message.presetName, message.values as RewardToastStyleValues);
      const result = await saveConfigAndApply(folder, "reward_toast", rewardToastStyleConfigRelativePath, rewardToastLoad, config, async () => summarizeRewardToastApplyResult(folder, await applyIdleMonsterFarmRewardToastStyle(folder, config)));
      if (!result.ok) {
        return result;
      }
      return recordTuningAttemptForResult(folder, message, result, { adapterId: "idle_monster_farm", targetLabel: "Monster Farm reward toast" });
    }
    if (message.surfaceType === "button") {
      const config = buildButtonStyleConfig(message.presetName, message.values as ButtonStyleValues);
      const result = await saveConfigAndApply(folder, "button", buttonStyleConfigRelativePath, buttonLoad, config, async () => summarizeButtonApplyResult(folder, await applyIdleMonsterFarmButtonStyle(folder, config)));
      if (!result.ok) {
        return result;
      }
      return recordTuningAttemptForResult(folder, message, result, { adapterId: "idle_monster_farm", targetLabel: "Monster Farm buttons" });
    }
    const config = buildSlotCardStyleConfig(message.presetName, message.values as SlotCardStyleValues);
    const result = await saveConfigAndApply(folder, "slot_card", farmSlotStyleConfigRelativePath, slotLoad, config, async () => summarizeFarmSlotApplyResult(folder, await applyIdleMonsterFarmFarmSlotStyle(folder, config)));
    if (!result.ok) {
      return result;
    }
    return recordTuningAttemptForResult(folder, message, result, { adapterId: "idle_monster_farm", targetLabel: "Monster Farm farm slots" });
  } catch (error) {
    logError("save/apply visual surface failed:", error);
    return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function saveConfigAndApply(
  folder: vscode.WorkspaceFolder,
  surfaceType: Exclude<VisualSurfaceType, "asset_replacement">,
  configRelativePath: string,
  load: StyleConfigLoadResult | BackgroundStyleConfigLoadResult | PanelStyleConfigLoadResult | RewardToastStyleConfigLoadResult | ButtonStyleConfigLoadResult,
  config: unknown,
  apply: () => Promise<string[]>
): Promise<SaveResultMessage> {
  const plan = buildVisualDirectApplyPlan({
    adapterId: "idle_monster_farm",
    surfaceType,
    styleConfigPath: configRelativePath,
    candidatePaths: [configRelativePath]
  });
  if (!plan.executable) {
    const error = `v0.67 direct apply template blocked config save: ${plan.blockingReasons.join(" ") || plan.scopeGuardResult.summaryMessage}`;
    logWarn(error);
    return { command: "saveResult", ok: false, surfaceType, error, warnings: plan.warnings, directApplyTemplateId: plan.templateId, directApplyTemplateName: plan.templateName };
  }
  const applySummary = await apply();
  const templateResult = executeVisualDirectApplyPlan(folder.uri.fsPath, plan, [{
    relativePath: configRelativePath,
    text: `${JSON.stringify(config, null, 2)}\n`
  }]);
  if (!templateResult.ok) {
    const error = `v0.67 direct apply template runner failed: ${templateResult.errors.join(" ")}`;
    logWarn(error);
    return { command: "saveResult", ok: false, surfaceType, error, warnings: templateResult.warnings, directApplyTemplateId: plan.templateId, directApplyTemplateName: plan.templateName };
  }
  logSummary(applySummary, []);
  const checklist = [...checklistFor(surfaceType, load, templateResult.rollbackPaths.length > 0, applySummary), ...templateResult.manualChecks.map((check) => check.label)];
  logChecklist(`v0.58 ${surfaceType} manual test checklist:`, checklist);
  return {
    command: "saveResult",
    ok: true,
    surfaceType,
    configPath: configRelativePath,
    directApplyTemplateId: plan.templateId,
    directApplyTemplateName: plan.templateName,
    rollbackPaths: templateResult.rollbackPaths,
    checklist,
    applySummary: [
      `direct apply template: ${plan.templateId ?? "none"} (${plan.templateName ?? "unresolved"})`,
      `direct apply plan executable: ${plan.executable ? "yes" : "no"}`,
      ...applySummary
    ],
    warnings: templateResult.warnings
  };
}

async function setupBridge(folder: vscode.WorkspaceFolder, message: SaveMessage, slotLoad: StyleConfigLoadResult, backgroundLoad: BackgroundStyleConfigLoadResult, panelLoad: PanelStyleConfigLoadResult, rewardToastLoad: RewardToastStyleConfigLoadResult, buttonLoad: ButtonStyleConfigLoadResult): Promise<SaveResultMessage> {
  try {
    if (message.surfaceType === "background_readability") {
      const result = await setupIdleMonsterFarmBackgroundBridge(folder, buildBackgroundReadabilityStyleConfig(message.presetName, message.values as BackgroundReadabilityStyleValues));
      return recordTuningAttemptForResult(folder, message, setupResponse("background_readability", backgroundReadabilityStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("background_readability", backgroundLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.background", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings), { adapterId: "idle_monster_farm", targetLabel: "Monster Farm background readability", applyMode: "direct_apply" });
    }
    if (message.surfaceType === "panel") {
      const result = await setupIdleMonsterFarmPanelBridge(folder, buildPanelStyleConfig(message.presetName, message.values as PanelStyleValues));
      return recordTuningAttemptForResult(folder, message, setupResponse("panel", panelStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("panel", panelLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.panels", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings), { adapterId: "idle_monster_farm", targetLabel: "Monster Farm panels", applyMode: "direct_apply" });
    }
    if (message.surfaceType === "reward_toast") {
      const result = await setupIdleMonsterFarmRewardToastBridge(folder, buildRewardToastStyleConfig(message.presetName, message.values as RewardToastStyleValues));
      return recordTuningAttemptForResult(folder, message, setupResponse("reward_toast", rewardToastStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("reward_toast", rewardToastLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.reward_toast", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings), { adapterId: "idle_monster_farm", targetLabel: "Monster Farm reward toast", applyMode: "direct_apply" });
    }
    if (message.surfaceType === "button") {
      const result = await setupIdleMonsterFarmButtonBridge(folder, buildButtonStyleConfig(message.presetName, message.values as ButtonStyleValues));
      return recordTuningAttemptForResult(folder, message, setupResponse("button", buttonStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("button", buttonLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.buttons", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings), { adapterId: "idle_monster_farm", targetLabel: "Monster Farm buttons", applyMode: "direct_apply" });
    }
    const result = await setupIdleMonsterFarmFarmSlotBridge(folder, buildSlotCardStyleConfig(message.presetName, message.values as SlotCardStyleValues));
    return recordTuningAttemptForResult(folder, message, setupResponse("slot_card", farmSlotStyleConfigRelativePath, result.blockedFiles, result.rollbackPaths, checklistFor("slot_card", slotLoad, result.rollbackPaths.length > 0, []), summarizeSetup("idle_monster_farm.farm_slots", result.setupApplied, result.intendedFiles, result.changedFiles, result.rollbackPaths, result.connection.connected, result.connection.connectionType, result.warnings, result.connection.missingPieces, result.blockedFiles), result.warnings), { adapterId: "idle_monster_farm", targetLabel: "Monster Farm farm slots", applyMode: "direct_apply" });
  } catch (error) {
    logError("setup visual bridge failed:", error);
    return { command: "saveResult", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function applyAsset(folder: vscode.WorkspaceFolder, message: SaveMessage): Promise<SaveResultMessage> {
  try {
    if (!message.assetTargetId || !message.fileName || !message.dataBase64) {
      if (message.adapterId !== "generic_phaser") {
        return { command: "saveResult", ok: false, surfaceType: "asset_replacement", error: "Choose a PNG/WebP asset before applying." };
      }
    }
    if (message.adapterId === "generic_phaser") {
      if (!message.fileName || !message.dataBase64 || !message.assetDestinationFolder) {
        return { command: "saveResult", ok: false, surfaceType: "asset_replacement", error: "Choose a PNG/WebP asset and Generic Phaser asset folder before applying." };
      }
      const fieldNoteGuidance = await getFallbackFieldNoteGuidance(folder, {
        surfaceType: "asset_replacement",
        adapterId: "generic_phaser",
        targetLabel: "Generic asset loader wiring"
      });
      const result = await applyGenericPhaserAsset(folder, {
        fileName: message.fileName,
        bytes: Buffer.from(message.dataBase64, "base64"),
        assetDestinationFolder: message.assetDestinationFolder,
        fieldNoteGuidance
      });
      const applySummary = genericApplySummary(result);
      logSummary(applySummary, result.warnings);
      logChecklist("v0.58 generic_phaser asset manual test checklist:", result.checklist);
      return recordTuningAttemptForResult(folder, message, {
        command: "saveResult",
        ok: result.ok,
        surfaceType: "asset_replacement",
        configPath: result.configPath,
        assetPath: result.configPath,
        fallbackTaskPath: result.fallbackTaskPath,
        rollbackPaths: result.rollbackPaths,
        checklist: result.checklist,
        applySummary,
        warnings: result.warnings,
        error: result.errors.length > 0 ? result.errors.join(" ") : undefined
      }, {
        adapterId: "generic_phaser",
        targetLabel: "Generic asset loader wiring",
        applyMode: "asset_copy",
        connectionState: "not_applicable",
        scopeSummary: result.changedFiles.length > 0 ? result.changedFiles.join(", ") : result.configPath
      });
    }
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
    return recordTuningAttemptForResult(folder, message, {
      command: "saveResult",
      ok: result.errors.length === 0,
      surfaceType: "asset_replacement",
      configPath: result.destinationPath,
      assetPath: result.destinationPath,
      rollbackPaths: result.rollbackPaths,
      checklist: result.checklist,
      applySummary,
      warnings: result.warnings,
      error: result.errors.length > 0 ? result.errors.join(" ") : undefined
    }, {
      adapterId: "idle_monster_farm",
      targetId: message.assetTargetId,
      targetLabel: message.assetTargetId,
      applyMode: "asset_copy",
      connectionState: "not_applicable",
      scopeSummary: result.changedFiles.length > 0 ? result.changedFiles.join(", ") : result.destinationPath ?? "asset copy"
    });
  } catch (error) {
    logError("asset replacement apply failed:", error);
    return { command: "saveResult", ok: false, surfaceType: "asset_replacement", error: errorToMessage(error) };
  }
}

async function markAttemptResult(folder: vscode.WorkspaceFolder, message: SaveMessage): Promise<SaveResultMessage> {
  try {
    if (!message.attemptPath || !message.resultStatus) {
      return { command: "resultMarked", ok: false, surfaceType: message.surfaceType, error: "No tuning attempt was selected for result marking." };
    }
    const stored = await updateTuningAttemptResult(folder, message.attemptPath, message.resultStatus, message.resultNote);
    logInfo(`v0.59 tuning attempt marked ${stored.attempt.resultStatus}: ${stored.attemptPath}`);
    logChecklist("v0.59 result tracking manual test checklist:", resultTrackingChecklist());
    return {
      command: "resultMarked",
      ok: true,
      surfaceType: stored.attempt.surfaceType,
      attemptId: stored.attempt.attemptId,
      attemptPath: stored.attemptPath,
      resultStatus: stored.attempt.resultStatus
    };
  } catch (error) {
    logError("mark tuning result failed:", error);
    return { command: "resultMarked", ok: false, surfaceType: message.surfaceType, error: errorToMessage(error) };
  }
}

async function recordTuningAttemptForResult(
  folder: vscode.WorkspaceFolder,
  message: SaveMessage,
  response: SaveResultMessage,
  extra: {
    adapterId: string;
    targetId?: string;
    targetLabel?: string;
    applyMode?: VisualTuningApplyMode;
    connectionState?: VisualTuningConnectionState;
    scopeSummary?: string;
  }
): Promise<SaveResultMessage> {
  if (!response.ok || response.command !== "saveResult" || !response.surfaceType) {
    return response;
  }
  const recipe = response.surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(response.surfaceType);
  const treatmentSummary = await getTreatmentSummary(folder, {
    surfaceType: response.surfaceType,
    adapterId: extra.adapterId,
    targetId: extra.targetId,
    targetLabel: extra.targetLabel,
    presetName: message.presetName || undefined,
    recipeId: recipe?.recipeId
  });
  const stored = await createTuningAttempt(folder, {
    adapterId: extra.adapterId,
    surfaceType: response.surfaceType,
    targetId: extra.targetId,
    targetLabel: extra.targetLabel ?? message.targetLabel,
    recipeId: recipe?.recipeId,
    configPath: response.configPath,
    generatedStyleModulePath: response.generatedStyleModulePath,
    assetPath: response.assetPath,
    fallbackTaskPath: response.fallbackTaskPath,
    presetName: message.presetName || undefined,
    styleSnapshot: message.surfaceType === "asset_replacement" ? { fileName: message.fileName, assetDestinationFolder: message.assetDestinationFolder } : message.values,
    changedTokens: Object.keys(message.values ?? {}).sort(),
    applyMode: extra.applyMode ?? inferApplyMode(response),
    connectionState: extra.connectionState ?? inferConnectionState(response),
    scopeSummary: extra.scopeSummary ?? summarizeResponseScope(response),
    rollbackPaths: response.rollbackPaths ?? [],
    manualChecklist: response.checklist ?? [],
    warnings: [...(response.warnings ?? []), ...treatmentSummary.warnings],
    tags: ["v0.59"]
  });
  const checklist = [...(response.checklist ?? []), ...resultTrackingChecklist()];
  logInfo(`v0.59 tuning attempt created: ${stored.attemptPath}`);
  logChecklist("v0.59 result tracking manual test checklist:", resultTrackingChecklist());
  return {
    ...response,
    attemptId: stored.attempt.attemptId,
    attemptPath: stored.attemptPath,
    resultStatus: stored.attempt.resultStatus,
    checklist,
    warnings: [...(response.warnings ?? []), ...treatmentSummary.warnings]
  };
}

function setupResponse(surfaceType: VisualSurfaceType, configPath: string, blockedFiles: string[], rollbackPaths: string[], checklist: string[], applySummary: string[], warnings: string[]): SaveResultMessage {
  logSummary(applySummary, warnings);
  logChecklist(`v0.58 ${surfaceType} manual test checklist:`, checklist);
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

function genericApplySummary(result: Awaited<ReturnType<typeof applyGenericPhaserStyle>> | Awaited<ReturnType<typeof applyGenericPhaserAsset>>): string[] {
  return [
    "adapter target: generic_phaser",
    `direct apply: ${result.ok && !result.fallbackTaskPath ? "applied" : "config/fallback"}`,
    `config path: ${result.configPath}`,
    `generated style module: ${result.generatedStyleModulePath ?? "none"}`,
    `fallback task: ${result.fallbackTaskPath ?? "none"}`,
    `changed files: ${result.changedFiles.length > 0 ? result.changedFiles.join(", ") : "none"}`,
    `rollback snapshots: ${result.rollbackPaths.length > 0 ? result.rollbackPaths.join(", ") : "none"}`,
    ...result.warnings.map((warning) => `warning: ${warning}`),
    ...result.errors.map((error) => `error: ${error}`)
  ];
}

function checklistFor(surfaceType: Exclude<VisualSurfaceType, "asset_replacement">, load: StyleConfigLoadResult | BackgroundStyleConfigLoadResult | PanelStyleConfigLoadResult | RewardToastStyleConfigLoadResult | ButtonStyleConfigLoadResult, rollbackCreated: boolean, applySummary: string[]): string[] {
  const recipeItems = [
    "recipe schema version is present",
    `recipe file exists under .game-polish-lab/visual-recipes/ for ${surfaceType}`,
    "style tokens match the surface controls",
    "generated style module path remains adapter-specific",
    "adapter mapping is separated from generic recipe",
    "fallback metadata is scoped and not vague"
  ];
  if (surfaceType === "button") {
    return [
      ...recipeItems,
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
      ...recipeItems,
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
      ...recipeItems,
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
      ...recipeItems,
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
    ...recipeItems,
    load.existingConfigDetected ? "existing style config detected" : "existing style config was missing and a default config was created",
    load.initializedFromExistingConfig ? "editor initialized from existing config" : "editor initialized from safe default values",
    rollbackCreated ? "rollback snapshot created before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
    "empty/occupied/selected/locked/merge-candidate states still render",
    "no save/economy/hatch/progression/merge/quest/ad files were changed"
  ];
}

function resultTrackingChecklist(): string[] {
  return [
    "tuning attempt JSON created",
    "attempt index updated",
    "result status starts as unreviewed",
    "user can mark better/worse/same/mixed",
    "result note is saved",
    "field notes appended",
    "existing field notes are not overwritten",
    "known-bad treatment warning appears on matching future surface/target",
    "known-good treatment appears as prior success",
    "fallback task metadata includes relevant avoid/preserve notes",
    "no gameplay/save/economy/progression/ad files changed"
  ];
}

function inferApplyMode(response: SaveResultMessage): VisualTuningApplyMode {
  if (response.fallbackTaskPath) {
    return "fallback_task";
  }
  if (response.surfaceType === "asset_replacement") {
    return "asset_copy";
  }
  if ((response.applySummary ?? []).some((line) => line.includes("direct apply: applied") || line.includes("one-time setup: applied"))) {
    return "direct_apply";
  }
  return "config_only";
}

function inferConnectionState(response: SaveResultMessage): VisualTuningConnectionState {
  if (response.surfaceType === "asset_replacement") {
    return "not_applicable";
  }
  const summary = response.applySummary ?? [];
  if (summary.some((line) => line.includes("connected: yes") || line.includes("connected after setup: yes"))) {
    return "connected";
  }
  if (summary.some((line) => line.includes("connected: no") || line.includes("connected after setup: no"))) {
    return "not_connected";
  }
  return "unknown";
}

function summarizeResponseScope(response: SaveResultMessage): string {
  const paths = [
    response.configPath,
    response.generatedStyleModulePath,
    response.assetPath,
    response.fallbackTaskPath,
    ...(response.rollbackPaths ?? [])
  ].filter((value): value is string => Boolean(value));
  return paths.length > 0 ? paths.join(", ") : "visual tuning metadata";
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

function visualRecipeChecklist(recipePaths: string[]): string[] {
  return [
    "recipe schema version is present",
    `recipe file exists under .game-polish-lab/visual-recipes/: ${recipePaths.join(", ")}`,
    "style tokens match the surface controls",
    "presets still load",
    "existing style config still loads",
    "generated style module path remains adapter-specific",
    "adapter mapping is separated from generic recipe",
    "direct apply path remains unchanged for connected Monster Farm targets",
    "fallback metadata is scoped and not vague",
    "no gameplay/save/economy/progression/ad files changed"
  ];
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
  genericPhaserState: GenericPhaserDetection;
  tuningAttemptIndex: VisualTuningAttemptIndex;
  initialState: TuneVisualSurfaceInitialState;
  recipes: ReturnType<typeof getVisualSurfaceRecipes>;
  assetTargets: ReturnType<typeof getIdleMonsterFarmAssetTargets>;
}): string {
  const nonce = createNonce();
  const slotBeforeValues = input.slotLoad.initializedFromExistingConfig ? input.slotLoad.config.values : defaultSlotCardStyle;
  const backgroundBeforeValues = input.backgroundLoad.initializedFromExistingConfig ? input.backgroundLoad.config.values : defaultBackgroundReadabilityStyle;
  const panelBeforeValues = input.panelLoad.initializedFromExistingConfig ? input.panelLoad.config.values : defaultPanelStyle;
  const rewardToastBeforeValues = input.rewardToastLoad.initializedFromExistingConfig ? input.rewardToastLoad.config.values : defaultRewardToastStyle;
  const buttonBeforeValues = input.buttonLoad.initializedFromExistingConfig ? input.buttonLoad.config.values : defaultButtonStyle;
  const payload = JSON.stringify({
    surfaces: {
      slot_card: { presets: slotCardPresets, bounds: slotCardStyleBounds, initialConfig: input.slotLoad.config, configLoad: input.slotLoad, adapterState: input.slotState, beforeValues: slotBeforeValues, preview: buildVisualPreviewRenderRequest({ surfaceType: "slot_card", adapterId: "idle_monster_farm.farm_slots", targetId: "farm_slots", targetLabel: "Monster Farm Slots", currentStyle: slotBeforeValues, draftStyle: input.slotLoad.config.values, appliedStyleExists: input.slotLoad.initializedFromExistingConfig }) },
      background_readability: { presets: backgroundReadabilityPresets, bounds: backgroundReadabilityStyleBounds, initialConfig: input.backgroundLoad.config, configLoad: input.backgroundLoad, adapterState: input.backgroundState, beforeValues: backgroundBeforeValues, preview: buildVisualPreviewRenderRequest({ surfaceType: "background_readability", adapterId: "idle_monster_farm.background", targetId: "background", targetLabel: "Monster Farm Background", currentStyle: backgroundBeforeValues, draftStyle: input.backgroundLoad.config.values, appliedStyleExists: input.backgroundLoad.initializedFromExistingConfig }) },
      panel: { presets: panelStylePresets, bounds: panelStyleBounds, initialConfig: input.panelLoad.config, configLoad: input.panelLoad, adapterState: input.panelState, beforeValues: panelBeforeValues, preview: buildVisualPreviewRenderRequest({ surfaceType: "panel", adapterId: "idle_monster_farm.panels", targetId: "panels", targetLabel: "Monster Farm Panels", currentStyle: panelBeforeValues, draftStyle: input.panelLoad.config.values, appliedStyleExists: input.panelLoad.initializedFromExistingConfig }) },
      reward_toast: { presets: rewardToastPresets, bounds: rewardToastStyleBounds, initialConfig: input.rewardToastLoad.config, configLoad: input.rewardToastLoad, adapterState: input.rewardToastState, beforeValues: rewardToastBeforeValues, preview: buildVisualPreviewRenderRequest({ surfaceType: "reward_toast", adapterId: "idle_monster_farm.reward_toast", targetId: "reward_toast", targetLabel: "Monster Farm Reward Toast", currentStyle: rewardToastBeforeValues, draftStyle: input.rewardToastLoad.config.values, appliedStyleExists: input.rewardToastLoad.initializedFromExistingConfig }) },
      button: { presets: buttonStylePresets, bounds: buttonStyleBounds, initialConfig: input.buttonLoad.config, configLoad: input.buttonLoad, adapterState: input.buttonState, beforeValues: buttonBeforeValues, preview: buildVisualPreviewRenderRequest({ surfaceType: "button", adapterId: "idle_monster_farm.buttons", targetId: "buttons", targetLabel: "Monster Farm Buttons", currentStyle: buttonBeforeValues, draftStyle: input.buttonLoad.config.values, appliedStyleExists: input.buttonLoad.initializedFromExistingConfig }) }
    },
    stylePresetLibrary: visualPresetLibrary,
    recipes: input.recipes,
    surfaceOrder: visualSurfacePickerOrder,
    genericPhaser: input.genericPhaserState,
    tuningAttemptIndex: input.tuningAttemptIndex,
    initialState: input.initialState,
    assetTargets: input.assetTargets
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Polish Lab v0.62</title>
  <style nonce="${nonce}">
    :root{color-scheme:light dark;--panel:var(--vscode-editorWidget-background);--border:var(--vscode-panel-border);--text:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--button:var(--vscode-button-background);--button-text:var(--vscode-button-foreground);--focus:var(--vscode-focusBorder)}
    *{box-sizing:border-box} body{margin:0;padding:18px;color:var(--text);font-family:var(--vscode-font-family);background:var(--vscode-editor-background)}
    main{display:grid;grid-template-columns:minmax(280px,360px) minmax(360px,1fr);gap:18px;align-items:start} h1,h2,h3,p{margin:0} h1{font-size:20px} h2{font-size:15px;margin-bottom:10px}.meta,.status,.list,.preset-description{color:var(--muted);font-size:12px;line-height:1.45}.preset-description{margin-top:6px}.preset-active{color:var(--focus);font-weight:700}.panel{border:1px solid var(--border);background:var(--panel);border-radius:8px;padding:14px}.controls{display:grid;gap:12px}label{display:block;font-size:12px;color:var(--muted);margin-bottom:5px}select,input[type=number],input[type=color],input[type=text],textarea{width:100%;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--border));border-radius:4px;min-height:28px}textarea{min-height:68px;resize:vertical}input[type=range]{width:100%}.control-row{display:grid;grid-template-columns:1fr 76px;gap:8px;align-items:center}.preview-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:end;justify-content:space-between;margin-bottom:12px}.preview-toolbar label{margin:0}.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:14px}.compare-heading{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.frame-label{font-size:11px;color:var(--muted)}.board{position:relative;display:grid;align-content:start;gap:12px;min-height:390px;overflow:hidden;border:1px solid var(--border);border-radius:6px;padding:14px;background:#253629}.board.desktop{width:100%;min-height:390px}.board.mobile{width:min(100%,360px);min-height:560px;margin:0 auto}.slot-grid{display:grid;grid-template-columns:repeat(3,var(--slot-width));gap:var(--slot-gap)}.slot-card{position:relative;display:grid;place-items:center;width:var(--slot-width);height:var(--slot-height);background:var(--fill-color);border:var(--border-width) solid var(--border-color);border-radius:var(--corner-radius);overflow:hidden}.slot-card.empty{opacity:var(--empty-opacity)}.slot-card.selected{box-shadow:0 0 calc(28px * var(--selected-glow)) var(--border-color)}.slot-card.locked:after{content:"";position:absolute;inset:0;background:rgba(0,0,0,var(--locked-opacity))}.slot-card.merge_candidate.animate .monster{animation:merge-pulse 900ms ease-in-out infinite alternate}.state-label{position:absolute;left:6px;top:5px;z-index:2;font-size:10px;color:#fff;text-shadow:0 1px 2px #000}.monster{width:52px;height:52px;border-radius:45%;background:radial-gradient(circle at 34% 28%,#fff 0 8%,#81d37b 9% 44%,#2f8a4a 45% 100%);border:3px solid #173f25;transform:translateY(var(--monster-offset)) scale(var(--monster-scale))}.state-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px}.state-tile{display:grid;gap:6px;justify-items:center;border:1px solid var(--border);border-radius:6px;padding:8px;background:rgba(255,255,255,.03)}.state-tile.unsupported{opacity:.6}.state-tile .slot-card{--slot-width:88px;--slot-height:88px}.hud{position:relative;z-index:1;width:max-content;padding:6px 8px;color:#fff;background:rgba(0,0,0,.42);border:1px solid rgba(255,255,255,.35);border-radius:6px}.bg:before{content:"";position:absolute;inset:0;opacity:var(--image-opacity);background:repeating-linear-gradient(45deg,rgba(255,255,255,var(--pattern-opacity)) 0 8px,transparent 8px 18px),radial-gradient(circle at 28% 25%,rgba(255,255,255,.3),transparent 18%)}.bg:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at center,transparent 0 50%,rgba(0,0,0,var(--vignette)) 100%),linear-gradient(var(--overlay-color),var(--overlay-color));opacity:var(--overlay-opacity)}.foreground{position:relative;z-index:1}.panel-preview{position:relative;display:grid;gap:var(--panel-gap);width:min(100%,360px);padding:var(--panel-padding);color:#fff;background:color-mix(in srgb,var(--panel-fill) calc(var(--panel-opacity) * 100%),transparent);border:var(--panel-border-width) solid var(--panel-border);border-radius:var(--panel-radius);box-shadow:0 10px calc(28px * var(--panel-shadow)) rgba(0,0,0,.55),0 0 calc(24px * var(--panel-glow)) var(--panel-border);overflow:hidden}.panel-preview:before{content:"";position:absolute;left:0;right:0;top:0;height:var(--panel-accent-height);background:var(--panel-accent)}.panel-title{font-size:var(--panel-title-size);font-weight:700}.panel-row{display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:center;min-height:28px;font-size:var(--panel-body-size)}.panel-row.disabled{opacity:var(--panel-disabled)}.panel-icon{width:18px;height:18px;border-radius:4px;background:var(--panel-accent)}.panel-divider{height:var(--panel-divider-thickness);background:var(--panel-divider);opacity:var(--panel-divider-opacity)}.panel-action{justify-self:start;min-width:92px;min-height:26px;border-radius:5px;border:1px solid var(--panel-border);background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:var(--panel-body-size)}.reward-stage{position:relative;min-height:330px;display:grid;place-items:center;background:linear-gradient(#314934,#203129)}.reward-toast{position:absolute;display:grid;grid-template-columns:auto auto;gap:8px;align-items:center;padding:8px 12px;color:#fff;background:color-mix(in srgb,var(--toast-fill) calc(var(--toast-opacity) * 100%),transparent);border:var(--toast-border-width) solid var(--toast-border);border-radius:var(--toast-radius);box-shadow:0 12px calc(30px * var(--toast-shadow)) rgba(0,0,0,.55),0 0 calc(28px * var(--toast-glow)) var(--toast-border);font-size:var(--toast-text-size);font-weight:700;text-shadow:0 1px 2px rgba(0,0,0,.7);animation:reward-rise var(--toast-duration) ease-out infinite}.reward-icon{width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 34% 28%,#fff4a8 0 18%,#ffc845 19% 62%,#b96d1c 63% 100%);transform:scale(var(--toast-icon-scale))}.sparkle{position:absolute;width:7px;height:7px;border-radius:50%;background:var(--toast-border);box-shadow:0 0 calc(10px * var(--sparkle-scale)) var(--toast-border);animation:sparkle-pop var(--toast-duration) ease-out infinite}.button-stage{align-content:start;background:linear-gradient(#2f4235,#202b29)}.button-preview-group{display:grid;gap:10px}.button-context{color:#dce8df;font-size:11px;text-transform:uppercase;letter-spacing:.04em}.button-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(0,0,0,.18)}.button-preview{position:relative;display:inline-grid;grid-template-columns:auto auto;place-items:center;align-items:center;gap:var(--button-gap);width:var(--button-width);height:var(--button-height);padding:var(--button-padding-y) var(--button-padding-x);color:var(--button-label);background:color-mix(in srgb,var(--button-fill) calc(var(--button-opacity) * 100%),transparent);border:var(--button-border-width) solid var(--button-border);border-radius:var(--button-radius);box-shadow:0 8px calc(24px * var(--button-shadow)) rgba(0,0,0,.55),0 0 calc(22px * var(--button-glow)) var(--button-border);font-size:var(--button-text-size);font-weight:700;transition:transform var(--button-press-duration) ease,filter var(--button-press-duration) ease}.button-preview:after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(0,0,0,var(--button-active-darken));opacity:0;pointer-events:none}.button-preview.hover{transform:translateY(calc(var(--button-hover-lift) * -1));box-shadow:0 10px calc(24px * var(--button-shadow)) rgba(0,0,0,.55),0 0 calc(28px * var(--button-hover-glow)) var(--button-border)}.button-preview.active{animation:button-press var(--button-press-duration) ease infinite alternate}.button-preview.active:after{opacity:1}.button-preview.disabled{opacity:var(--button-disabled-opacity);filter:saturate(var(--button-disabled-saturation))}.button-icon{width:20px;height:20px;border-radius:6px;background:radial-gradient(circle at 32% 25%,#fff 0 12%,#8dd27f 13% 58%,#2f8650 59% 100%);transform:scale(var(--button-icon-scale))}.button-label{transform:scale(var(--button-label-scale));white-space:nowrap}.drop-zone{border:1px dashed var(--border);border-radius:6px;padding:14px;color:var(--muted);text-align:center}.asset-img{max-width:96px;max-height:96px;object-fit:contain}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}button{min-height:30px;color:var(--button-text);background:var(--button);border:1px solid transparent;border-radius:4px;padding:4px 12px}.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}.status{margin-top:12px;white-space:pre-wrap}.list{margin:8px 0 0;padding-left:18px}@keyframes merge-pulse{from{transform:translateY(var(--monster-offset)) scale(var(--monster-scale))}to{transform:translateY(var(--monster-offset)) scale(calc(var(--monster-scale) * var(--merge-pulse)))}}@keyframes button-press{from{transform:scale(1)}to{transform:scale(var(--button-active-scale))}}@keyframes reward-rise{0%{opacity:0;transform:translateY(0) scale(var(--toast-start-scale))}18%{opacity:1;transform:translateY(calc(var(--toast-rise) * -.24)) scale(var(--toast-peak-scale))}40%{transform:translateY(calc(var(--toast-rise) * -.5)) scale(calc(var(--toast-end-scale) + var(--toast-bounce) * .08))}78%{opacity:1}100%{opacity:0;transform:translateY(calc(var(--toast-rise) * -1)) scale(var(--toast-end-scale))}}@keyframes sparkle-pop{0%,18%{opacity:0;transform:scale(.2)}34%{opacity:1;transform:scale(var(--sparkle-scale))}100%{opacity:0;transform:translateY(-26px) scale(.1)}}@media(max-width:900px){main,.preview-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div style="margin-bottom:16px"><h1>Game Polish Lab v0.62: Visual Surface Tuning</h1><p class="meta">Preset library -> preview across frames/states -> save config/assets -> direct apply for supported adapters -> record result.</p></div>
  <main>
    <section class="panel"><h2>Style Values</h2><div class="controls"><div><label for="surface">Surface</label><select id="surface"></select></div><div><label for="adapterMode">Adapter</label><select id="adapterMode"><option value="idle_monster_farm">Idle Monster Farm</option><option value="generic_phaser">Generic Phaser</option></select></div><div id="genericFields" style="display:none"><label for="genericTarget">Manual target label</label><input id="genericTarget" type="text" value="Manual visual target"><label for="genericFiles">Selected target files</label><textarea id="genericFiles"></textarea><label for="genericAssetFolder">Asset destination folder</label><input id="genericAssetFolder" type="text" value="src/assets"><label><input id="genericDirect" type="checkbox"> Write generated style module</label></div><div id="presetRow"><label for="preset">Preset</label><select id="preset"></select><div id="presetDescription" class="preset-description"></div></div><div id="controls"></div></div><div class="actions"><button class="secondary" id="reset">Reset</button><button class="secondary" id="setup" style="display:none">One-Time Setup</button><button id="save">Save & Apply</button></div><div id="resultPanel" style="display:none;margin-top:12px"><label for="resultNote">Result note</label><textarea id="resultNote" placeholder="What improved, got worse, or did not move?"></textarea><div class="actions"><button class="secondary" data-result="better">Mark Better</button><button class="secondary" data-result="worse">Mark Worse</button><button class="secondary" data-result="same">Mark Same</button><button class="secondary" data-result="mixed">Mark Mixed</button><button data-result="unreviewed">Add Note</button></div></div><div id="status" class="status"></div></section>
    <section><div class="preview-toolbar"><div><label for="frameMode">Preview frame</label><select id="frameMode"><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></div><label><input id="animationToggle" type="checkbox" checked> Play preview animation</label></div><section class="preview-grid"><div><div class="compare-heading"><h2>Before</h2><span id="beforeLabel" class="frame-label"></span></div><div id="before"></div></div><div><div class="compare-heading"><h2>After</h2><span id="afterLabel" class="frame-label"></span></div><div id="after"></div></div></section><section class="panel" style="margin-top:14px"><h3>State Preview Grid</h3><p id="stateGridLabel" class="meta"></p><div id="stateGrid" class="state-grid"></div></section></section>
  </main>
  <section class="panel" style="margin-top:14px"><h3>Adapter Detection</h3><ul id="adapter" class="list"></ul></section>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi(); const data=${payload};
    const recipesBySurface=Object.fromEntries(data.recipes.map(r=>[r.surfaceType,r]));
    const labels={},numeric={},colors={};
    for(const recipe of data.recipes){numeric[recipe.surfaceType]=[];colors[recipe.surfaceType]=[];for(const token of recipe.supportedStyleTokens){labels[token.tokenId]=token.label;if(token.valueType==="number")numeric[recipe.surfaceType].push(token.tokenId);if(token.valueType==="color")colors[recipe.surfaceType].push(token.tokenId);}}
    let surfaceType=data.initialState.surfaceType&&data.surfaceOrder.includes(data.initialState.surfaceType)?data.initialState.surfaceType:"slot_card", surfaceData=data.surfaces[surfaceType], presetName=surfaceType==="asset_replacement"?"":surfaceData.initialConfig.presetName, values=surfaceType==="asset_replacement"?{}:structuredClone(surfaceData.initialConfig.values), selectedPresetId="", selectedAsset=null, needsSetup=false, adapterId=data.initialState.adapterId||"idle_monster_farm", currentAttemptPath="", frameMode="desktop", animationOn=true;
    const surface=document.getElementById("surface"), preset=document.getElementById("preset"), presetDescription=document.getElementById("presetDescription"), controls=document.getElementById("controls"), status=document.getElementById("status"), adapterMode=document.getElementById("adapterMode"), genericFields=document.getElementById("genericFields"), genericTarget=document.getElementById("genericTarget"), genericFiles=document.getElementById("genericFiles"), genericAssetFolder=document.getElementById("genericAssetFolder"), genericDirect=document.getElementById("genericDirect"), frameModeSelect=document.getElementById("frameMode"), animationToggle=document.getElementById("animationToggle"), beforeLabel=document.getElementById("beforeLabel"), afterLabel=document.getElementById("afterLabel"), stateGrid=document.getElementById("stateGrid"), stateGridLabel=document.getElementById("stateGridLabel");
    genericTarget.value=data.initialState.targetLabel||genericTarget.value;genericFiles.value=(data.genericPhaser.likelySceneFiles||[]).join("\\n");genericAssetFolder.value=(data.genericPhaser.likelyAssetFolders&&data.genericPhaser.likelyAssetFolders[0])||"src/assets";
    for(const id of data.surfaceOrder){const option=document.createElement("option");option.value=id;option.textContent=recipesBySurface[id]?recipesBySurface[id].displayName:id;option.selected=id===surfaceType;surface.append(option);}
    adapterMode.value=adapterId;
    surface.addEventListener("change",()=>{surfaceType=surface.value;surfaceData=data.surfaces[surfaceType];presetName=surfaceType==="asset_replacement"?"":surfaceData.initialConfig.presetName;values=surfaceType==="asset_replacement"?{}:structuredClone(surfaceData.initialConfig.values);selectedPresetId="";needsSetup=false;rebuild();});
    adapterMode.addEventListener("change",()=>{adapterId=adapterMode.value;needsSetup=false;rebuild();});
    frameModeSelect.addEventListener("change",()=>{frameMode=frameModeSelect.value;render();});
    animationToggle.addEventListener("change",()=>{animationOn=animationToggle.checked;render();});
    [genericTarget,genericFiles,genericAssetFolder,genericDirect].forEach(el=>el.addEventListener("input",renderAdapter));
    function genericSelectedFiles(){return genericFiles.value.split(/\\r?\\n|,/).map(v=>v.trim()).filter(Boolean);}
    function rebuild(){genericFields.style.display=adapterId==="generic_phaser"?"block":"none";buildPreset();buildControls();render();renderAdapter();document.getElementById("setup").style.display=adapterId==="generic_phaser"?"none":needsSetup?"inline-block":"none";status.textContent=surfaceType!=="asset_replacement"&&surfaceData.configLoad.warning?surfaceData.configLoad.warning:"";}
    function buildPreset(){preset.textContent="";presetDescription.textContent="";document.getElementById("presetRow").style.display=surfaceType==="asset_replacement"?"none":"block";if(surfaceType==="asset_replacement")return;const options=presetOptions();if(!selectedPresetId){const match=options.find(p=>p.name===presetName)||options.find(p=>draftMatches(p.values,values));selectedPresetId=match?match.id:"";}if(options.some(p=>p.kind==="library")){for(const family of data.stylePresetLibrary.families){const groupOptions=options.filter(p=>p.familyId===family.familyId);if(!groupOptions.length)continue;const group=document.createElement("optgroup");group.label=family.name;for(const p of groupOptions)appendPresetOption(group,p);preset.append(group);}}else{for(const p of options)appendPresetOption(preset,p);}const selected=selectedPresetOption();if(selected){preset.value=selected.id;describePreset(selected);}}
    function appendPresetOption(parent,p){const o=document.createElement("option");o.value=p.id;const signal=signalForPreset(p.name), active=selectedPresetId===p.id||draftMatches(p.values,values);o.textContent=p.name+(active?" (active draft)":signal?" - "+signal:"");parent.append(o);}
    function presetOptions(){const library=((data.stylePresetLibrary&&data.stylePresetLibrary.presets)||[]).filter(p=>(p.supportedSurfaces||[]).some(s=>s.surfaceType===surfaceType&&(!s.adapterIds||s.adapterIds.includes(adapterId))));if(library.length){return library.map(p=>({kind:"library",id:p.presetId,name:p.displayName,familyId:p.familyId,familyName:p.familyName,description:p.description,tags:p.tags||[],values:p.stylePatch}));}return (surfaceData.presets||[]).map(p=>({kind:"legacy",id:p.name,name:p.name,familyId:"legacy",familyName:"Surface preset",description:"Legacy surface preset.",tags:[],values:p.values}));}
    function selectedPresetOption(){const options=presetOptions();return options.find(p=>p.id===preset.value)||options.find(p=>p.id===selectedPresetId)||options.find(p=>p.name===presetName)||options[0];}
    function describePreset(p){const active=selectedPresetId===p.id||draftMatches(p.values,values), tags=p.tags&&p.tags.length?" Tags: "+p.tags.join(", "):"";presetDescription.textContent=p.familyName+" / "+p.name+". "+p.description+(active?" Active draft preset.":"")+tags;presetDescription.className="preset-description"+(active?" preset-active":"");}
    function draftMatches(a,b){const keys=Object.keys(a||{});return keys.length>0&&keys.every(k=>a[k]===b[k]);}
    function buildControls(){controls.textContent="";if(surfaceType==="asset_replacement"){buildAssetControls();return;}for(const key of numeric[surfaceType]){const wrap=document.createElement("div"),label=document.createElement("label"),row=document.createElement("div"),range=document.createElement("input"),num=document.createElement("input"),b=surfaceData.bounds[key];label.textContent=labels[key];row.className="control-row";range.type="range";range.min=b.min;range.max=b.max;range.step=b.step;range.value=values[key];num.type="number";num.min=b.min;num.max=b.max;num.step=b.step;num.value=values[key];range.addEventListener("input",()=>setNumber(key,range.value,num,range));num.addEventListener("input",()=>setNumber(key,num.value,num,range));row.append(range,num);wrap.append(label,row);controls.append(wrap);}for(const key of colors[surfaceType]){const wrap=document.createElement("div"),label=document.createElement("label"),input=document.createElement("input");label.textContent=labels[key];input.type="color";input.value=values[key];input.addEventListener("input",()=>{values[key]=input.value;render();});wrap.append(label,input);controls.append(wrap);}}
    function buildAssetControls(){const targetWrap=document.createElement("div"),label=document.createElement("label"),select=document.createElement("select");label.textContent="Asset target";select.id="assetTarget";for(const target of data.assetTargets.targets){const option=document.createElement("option");option.value=target.targetId;option.textContent=target.label+" ("+target.assignmentMode+")";select.append(option);}select.addEventListener("change",render);targetWrap.append(label,select);const fileWrap=document.createElement("div"),fileLabel=document.createElement("label"),drop=document.createElement("div"),file=document.createElement("input");fileLabel.textContent="PNG/WebP replacement";drop.className="drop-zone";drop.textContent="Drop PNG/WebP here or choose a file";file.type="file";file.accept="image/png,image/webp,.png,.webp";file.addEventListener("change",()=>{if(file.files&&file.files[0])readAsset(file.files[0]);});drop.addEventListener("dragover",e=>{e.preventDefault();});drop.addEventListener("drop",e=>{e.preventDefault();if(e.dataTransfer&&e.dataTransfer.files[0])readAsset(e.dataTransfer.files[0]);});fileWrap.append(fileLabel,drop,file);if(adapterId!=="generic_phaser")controls.append(targetWrap);controls.append(fileWrap);}
    function readAsset(file){if(!["image/png","image/webp"].includes(file.type)&&!/\\.(png|webp)$/i.test(file.name)){status.textContent="Unsupported file type. Choose PNG or WebP.";selectedAsset=null;render();return;}const reader=new FileReader();reader.onload=()=>{const dataUrl=String(reader.result);selectedAsset={name:file.name,dataUrl,dataBase64:dataUrl.split(",")[1]||""};status.textContent="Asset loaded for preview: "+file.name;render();};reader.readAsDataURL(file);}
    function setNumber(key,raw,num,range){const b=surfaceData.bounds[key],next=Math.min(b.max,Math.max(b.min,Number(raw)));values[key]=next;num.value=next;range.value=next;render();}
    preset.addEventListener("change",()=>{const p=selectedPresetOption();if(!p)return;selectedPresetId=p.id;presetName=p.name;values=structuredClone(p.values);buildControls();render();buildPreset();});
    document.getElementById("reset").addEventListener("click",()=>{if(surfaceType==="asset_replacement"){selectedAsset=null;render();return;}const p=selectedPresetOption();if(!p)return;selectedPresetId=p.id;presetName=p.name;values=structuredClone(p.values);buildControls();render();buildPreset();});
    document.getElementById("save").addEventListener("click",()=>{if(surfaceType==="asset_replacement"){if(!selectedAsset){status.textContent="Choose a PNG/WebP asset before applying.";return;}if(adapterId==="generic_phaser"){vscode.postMessage({command:"applyAsset",surfaceType,presetName:"",values:{},adapterId,fileName:selectedAsset.name,dataBase64:selectedAsset.dataBase64,assetDestinationFolder:genericAssetFolder.value});return;}vscode.postMessage({command:"applyAsset",surfaceType,presetName:"",values:{},adapterId,assetTargetId:document.getElementById("assetTarget").value,fileName:selectedAsset.name,dataBase64:selectedAsset.dataBase64});return;}vscode.postMessage({command:"saveAndApply",surfaceType,presetName,values,adapterId,targetLabel:genericTarget.value,selectedFiles:genericSelectedFiles(),directApplyAllowed:genericDirect.checked});});
    document.getElementById("setup").addEventListener("click",()=>vscode.postMessage({command:"setupBridge",surfaceType,presetName,values}));
    document.querySelectorAll("[data-result]").forEach(button=>button.addEventListener("click",()=>{if(!currentAttemptPath){status.textContent+="\\nNo saved tuning attempt is available to mark.";return;}vscode.postMessage({command:"markResult",surfaceType,presetName,values,attemptPath:currentAttemptPath,resultStatus:button.dataset.result,resultNote:document.getElementById("resultNote").value});}));
    window.addEventListener("message",event=>{const m=event.data;if(m.command==="resultMarked"){if(!m.ok){status.textContent+="\\nResult update failed: "+m.error;return;}status.textContent+="\\nResult marked "+m.resultStatus+". Field notes appended.";document.getElementById("resultNote").value="";return;}if(m.command!=="saveResult"||m.surfaceType!==surfaceType)return;if(!m.ok){status.textContent="Save/apply failed: "+m.error;return;}currentAttemptPath=m.attemptPath||"";document.getElementById("resultPanel").style.display=currentAttemptPath?"block":"none";needsSetup=(m.applySummary||[]).some(line=>line.includes("setup offered: yes")||line.includes("one-time setup: blocked"));document.getElementById("setup").style.display=needsSetup?"inline-block":"none";status.textContent=["Saved: "+(m.configPath||""),currentAttemptPath?"Attempt: "+currentAttemptPath+" ("+(m.resultStatus||"unreviewed")+")":"Attempt: none",m.rollbackPaths&&m.rollbackPaths.length?"Rollback: "+m.rollbackPaths.join(", "):"Rollback: no existing target overwritten",(m.warnings&&m.warnings.length)?"":"",...(m.warnings||[]).map(w=>"Field note warning: "+w),"","Adapter:",...(m.applySummary||[]),"","Manual checklist:",...(m.checklist||[]).map(i=>"- "+i)].filter(line=>line!==undefined).join("\\n");});
    function render(){const preview=(surfaceData&&surfaceData.preview)||{};beforeLabel.textContent=(preview.comparison?preview.comparison.beforeLabel:"Before")+", "+frameMode+" frame";afterLabel.textContent=(preview.comparison?preview.comparison.afterLabel:"After")+", "+frameMode+" frame";animationToggle.disabled=!preview.animations||preview.animations.length===0;if(surfaceType==="asset_replacement"){renderAsset(document.getElementById("before"),null);renderAsset(document.getElementById("after"),selectedAsset);renderStateGrid({states:[],animations:[]});return;}if(surfaceType==="button"){renderButton(document.getElementById("before"),surfaceData.beforeValues);renderButton(document.getElementById("after"),values);renderStateGrid(preview);return;}if(surfaceType==="reward_toast"){renderRewardToast(document.getElementById("before"),surfaceData.beforeValues);renderRewardToast(document.getElementById("after"),values);renderStateGrid(preview);return;}if(surfaceType==="panel"){renderPanel(document.getElementById("before"),surfaceData.beforeValues);renderPanel(document.getElementById("after"),values);renderStateGrid(preview);return;}if(surfaceType==="background_readability"){renderBackground(document.getElementById("before"),surfaceData.beforeValues);renderBackground(document.getElementById("after"),values);renderStateGrid(preview);return;}renderSlot(document.getElementById("before"),surfaceData.beforeValues);renderSlot(document.getElementById("after"),values);renderStateGrid(preview);}
    function baseBoard(container){container.className="board "+frameMode;container.textContent="";}
    function setSlotVars(el,style){el.style.setProperty("--slot-width",style.slotWidth+"px");el.style.setProperty("--slot-height",style.slotHeight+"px");el.style.setProperty("--slot-gap",style.gap+"px");el.style.setProperty("--border-width",style.borderWidth+"px");el.style.setProperty("--corner-radius",style.cornerRadius+"px");el.style.setProperty("--fill-color",style.fillColor);el.style.setProperty("--border-color",style.borderColor);el.style.setProperty("--selected-glow",style.selectedGlowStrength);el.style.setProperty("--locked-opacity",style.lockedOverlayOpacity);el.style.setProperty("--empty-opacity",style.emptySlotOpacity);el.style.setProperty("--monster-scale",style.monsterDisplayScale);el.style.setProperty("--monster-offset",style.monsterVerticalOffset+"px");el.style.setProperty("--merge-pulse",style.mergeCandidatePulseScale||1);}
    function renderSlot(container,style){baseBoard(container);setSlotVars(container,style);const grid=document.createElement("div");grid.className="slot-grid";container.append(grid);const states=(surfaceData.preview&&surfaceData.preview.states&&surfaceData.preview.states.length?surfaceData.preview.states:[{stateId:"empty",label:"Empty",supported:true},{stateId:"occupied",label:"Occupied",supported:true},{stateId:"selected",label:"Selected",supported:true},{stateId:"locked",label:"Locked",supported:true},{stateId:"merge_candidate",label:"Merge candidate",supported:true}]);for(let i=0;i<9;i++){appendSlotState(grid,states[i%states.length],style);}}
    function appendSlotState(container,state,style){const id=(state.stateId||"unknown").replace(/_/g,"-"),card=document.createElement("div");card.className="slot-card "+classForSlotState(state)+(animationOn&&state.stateId==="merge_candidate"?" animate":"");const label=document.createElement("span");label.className="state-label";label.textContent=state.label||id;card.append(label);if(state.stateId==="empty"){card.append(document.createElement("span"));}else{const monster=document.createElement("div");monster.className="monster";card.append(monster);}container.append(card);}
    function classForSlotState(state){if(!state.supported)return"unknown";if(state.stateId==="merge_candidate")return"selected merge_candidate";return state.stateId||"unknown";}
    function appendSlots(container,count){const states=(data.surfaces.slot_card.preview&&data.surfaces.slot_card.preview.states)||[];for(let i=0;i<count;i++)appendSlotState(container,states[i%Math.max(1,states.length)]||{stateId:"occupied",label:"Occupied",supported:true},data.surfaces.slot_card.beforeValues);}
    function renderStateGrid(preview){stateGrid.textContent="";const states=preview.states||[];stateGridLabel.textContent=states.length?("Visual states for "+surfaceType+". Unsupported states render as labels only. "+(preview.animations&&preview.animations.length&&animationOn?"Animation: "+preview.animations[0].label:"Animation off or unavailable.")):"No state grid for this surface.";if(surfaceType==="slot_card"){setSlotVars(stateGrid,values);for(const state of states){const tile=document.createElement("div");tile.className="state-tile"+(state.supported?"":" unsupported");appendSlotState(tile,state,values);stateGrid.append(tile);}return;}for(const state of states){const tile=document.createElement("div");tile.className="state-tile"+(state.supported?"":" unsupported");const label=document.createElement("div");label.textContent=state.label+(state.supported?"":" (unsupported)");tile.append(label);stateGrid.append(tile);}}
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
    function currentAttempts(){return (data.tuningAttemptIndex.attempts||[]).filter(a=>a.surfaceType===surfaceType&&a.adapterId===adapterId);}
    function signalForPreset(name){const matches=currentAttempts().filter(a=>a.presetName===name);if(matches.some(a=>a.resultStatus==="worse"))return"field note: worse";if(matches.some(a=>a.resultStatus==="same"))return"field note: no effect";if(matches.some(a=>a.resultStatus==="mixed"))return"field note: mixed";if(matches.some(a=>a.resultStatus==="better"))return"prior success";return"";}
    function fieldNoteLines(){return currentAttempts().filter(a=>a.resultStatus!=="unreviewed").slice(0,5).map(a=>{const label=(a.presetName?a.presetName+" on ":"")+a.surfaceType+(a.targetLabel?" / "+a.targetLabel:"");if(a.resultStatus==="better")return"Prior success: "+label+" was marked better.";if(a.resultStatus==="worse")return"Warning: "+label+" was marked worse; warn before reusing.";if(a.resultStatus==="same")return"Warning: "+label+" had no meaningful visual effect.";return"Mixed result: "+label+" improved some parts and worsened others.";});}
    function renderAdapter(){const list=document.getElementById("adapter");list.textContent="";if(adapterId==="generic_phaser"){["Adapter: generic_phaser","Detected: "+data.genericPhaser.detected+" ("+data.genericPhaser.confidence+")","Manual target: "+genericTarget.value,"Selected files: "+(genericSelectedFiles().join(", ")||"none"),"Asset folder: "+genericAssetFolder.value,"Direct module write: "+(genericDirect.checked?"yes":"no, fallback task"),...fieldNoteLines(),...data.genericPhaser.evidence.map(r=>"Evidence: "+r),...data.genericPhaser.warnings.map(w=>"Warning: "+w)].filter(Boolean).forEach(add);return;}if(surfaceType==="asset_replacement"){["Adapter: idle_monster_farm.assets",...fieldNoteLines(),...data.assetTargets.targets.map(t=>t.label+": "+t.assignmentMode+(t.directApplySupported?" direct":" manual_required")),...data.assetTargets.warnings.map(w=>"Warning: "+w)].forEach(add);return;}const adapter=surfaceData.adapterState;["Config: "+surfaceData.configLoad.status,surfaceData.configLoad.warning?"Warning: "+surfaceData.configLoad.warning:"","Detected: "+adapter.detection.detected+" ("+adapter.detection.confidence+")",adapter.detection.targetPanels?"Target panels: "+(adapter.detection.targetPanels.join(", ")||"none"):"",adapter.detection.targetFeedback?"Target feedback: "+(adapter.detection.targetFeedback.join(", ")||"none"):"",adapter.detection.targetButtons?"Target buttons: "+(adapter.detection.targetButtons.join(", ")||"none"):"","Owners: "+(adapter.detection.ownerFiles.length?adapter.detection.ownerFiles.join(", "):"none"),"Connected: "+adapter.connection.connected+" ("+adapter.connection.connectionType+")",...fieldNoteLines(),...adapter.detection.reasons.map(r=>"Reason: "+r),...adapter.connection.missingPieces.map(p=>"Missing: "+p),...adapter.detection.warnings.map(w=>"Warning: "+w)].filter(Boolean).forEach(add);function add(text){const item=document.createElement("li");item.textContent=text;list.append(item);}}
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
