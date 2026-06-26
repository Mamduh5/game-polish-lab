import * as path from "path";
import * as vscode from "vscode";

import { applyIdleMonsterFarmBackgroundStyle, getIdleMonsterFarmBackgroundAdapterState, summarizeBackgroundApplyResult } from "../adapters/idleMonsterFarm/backgroundAdapter";
import { applyIdleMonsterFarmButtonStyle, getIdleMonsterFarmButtonAdapterState, summarizeButtonApplyResult } from "../adapters/idleMonsterFarm/buttonAdapter";
import { applyIdleMonsterFarmFarmSlotStyle, getIdleMonsterFarmFarmSlotAdapterState, summarizeFarmSlotApplyResult } from "../adapters/idleMonsterFarm/farmSlotAdapter";
import { getIdleMonsterFarmAssetTargets } from "../adapters/idleMonsterFarm/assetReplacementAdapter";
import { applyIdleMonsterFarmPanelStyle, getIdleMonsterFarmPanelAdapterState, summarizePanelApplyResult } from "../adapters/idleMonsterFarm/panelAdapter";
import { applyIdleMonsterFarmRewardToastStyle, getIdleMonsterFarmRewardToastAdapterState, summarizeRewardToastApplyResult } from "../adapters/idleMonsterFarm/rewardToastAdapter";
import { buildGenericFallbackTask, genericFallbackTaskRelativePath, getGenericPhaserAdapterState, GenericPhaserSurfaceType, genericGeneratedStyleModulePath, genericStyleConfigRelativePath } from "../core/genericPhaserAdapter";
import { logCommandEnd, logCommandStart, logError, logInfo } from "../core/output";
import { createTuningAttempt, getFallbackFieldNoteGuidance, loadTuningAttemptIndex } from "../core/tuningAttempts";
import { readVisualAssetContractFile, refreshVisualAssetContracts, summarizeVisualAssetContractStatuses } from "../core/visualAssetContracts";
import {
  buildVisualTuningDashboardModel,
  DashboardAdapterInfo,
  DashboardConfigInfo,
  DashboardRecipeInfo,
  DashboardSurfaceInput,
  recipeFileStatus
} from "../core/visualTuningDashboardModel";
import {
  backgroundReadabilityStyleConfigRelativePath,
  buildBackgroundReadabilityStyleConfig,
  buildButtonStyleConfig,
  buildPanelStyleConfig,
  buildRewardToastStyleConfig,
  buildSlotCardStyleConfig,
  buttonStyleConfigRelativePath,
  farmSlotStyleConfigRelativePath,
  loadBackgroundReadabilityStyleConfigFromText,
  loadButtonStyleConfigFromText,
  loadPanelStyleConfigFromText,
  loadRewardToastStyleConfigFromText,
  loadSlotCardStyleConfigFromText,
  panelStyleConfigRelativePath,
  rewardToastStyleConfigRelativePath
} from "../core/visualSurfaceConfig";
import { getVisualSurfaceRecipe, getVisualSurfaceRecipes, validateVisualSurfaceRecipe, visualRecipeRelativePath, visualSurfacePickerOrder } from "../core/visualRecipeRegistry";
import { ensureDirectory, labUri, openTextDocument, pathExists, readTextFileIfExists, requireWorkspaceFolder, writeJsonFile } from "../core/workspace";
import { VisualSurfaceType } from "../types/visualSurface";
import { VisualTuningDashboardModel, VisualTuningDashboardRow } from "../types/visualTuningDashboard";
import { tuneVisualSurface } from "./tuneVisualSurface";
import { markLatestTuningResult } from "./markLatestTuningResult";

interface DashboardMessage {
  command: "tune" | "openConfig" | "directApply" | "generateFallbackTask" | "runScopeCheck" | "markLatestResult" | "openFieldNotes" | "refresh" | "refreshAssetContracts";
  rowId?: string;
}

export async function openVisualTuningDashboard(context: vscode.ExtensionContext): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.openVisualTuningDashboard", folder.uri.fsPath);

  try {
    const model = await buildDashboardForWorkspace(folder);
    const panel = vscode.window.createWebviewPanel("gamePolishLab.visualTuningDashboard", "Visual Tuning Dashboard", vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri, folder.uri]
    });
    panel.webview.html = renderDashboardHtml(model);
    panel.webview.onDidReceiveMessage(async (message: DashboardMessage) => {
      const result = await handleDashboardMessage(context, folder, model, message);
      if (result.refresh) {
        const refreshed = await buildDashboardForWorkspace(folder);
        panel.webview.html = renderDashboardHtml(refreshed);
      } else {
        await panel.webview.postMessage(result);
      }
    });
    logChecklist("v0.60 visual tuning dashboard manual test checklist:", model.manualChecklist);
  } catch (error) {
    logError("open visual tuning dashboard failed:", error);
    vscode.window.showErrorMessage(`Failed to open visual tuning dashboard: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.openVisualTuningDashboard");
  }
}

export async function buildDashboardForWorkspace(folder: vscode.WorkspaceFolder): Promise<VisualTuningDashboardModel> {
  const [
    slotState,
    backgroundState,
    panelState,
    rewardToastState,
    buttonState,
    genericState,
    attemptIndex,
    assetContractLoad
  ] = await Promise.all([
    getIdleMonsterFarmFarmSlotAdapterState(folder),
    getIdleMonsterFarmBackgroundAdapterState(folder),
    getIdleMonsterFarmPanelAdapterState(folder),
    getIdleMonsterFarmRewardToastAdapterState(folder),
    getIdleMonsterFarmButtonAdapterState(folder),
    getGenericPhaserAdapterState(folder),
    loadTuningAttemptIndex(folder),
    readVisualAssetContractFile(folder.uri.fsPath)
  ]);
  const recipeFileStatuses = await readRecipeFileStatuses(folder);
  const fallbackCounts = await readFallbackTaskCounts(folder);
  const configStatuses = await readStyleConfigStatuses(folder);
  const assetTargets = getIdleMonsterFarmAssetTargets();
  const idleAdapterDetected = [slotState, backgroundState, panelState, rewardToastState, buttonState].some((state) => state.detection.detected);
  const idleConfidence = [slotState, backgroundState, panelState, rewardToastState, buttonState].some((state) => state.detection.confidence === "high") ? "high"
    : [slotState, backgroundState, panelState, rewardToastState, buttonState].some((state) => state.detection.confidence === "medium") ? "medium"
    : idleAdapterDetected ? "low" : "unknown";
  const detectedAdapter = idleAdapterDetected ? "idle_monster_farm" : genericState.detected ? "generic_phaser" : "unknown";
  const surfaces: DashboardSurfaceInput[] = [
    ...visualSurfacePickerOrder.map((surfaceType) => buildIdleSurfaceInput(surfaceType, configStatuses, recipeFileStatuses, fallbackCounts, {
      slot_card: slotState,
      background_readability: backgroundState,
      panel: panelState,
      reward_toast: rewardToastState,
      button: buttonState
    }, assetTargets)),
    ...visualSurfacePickerOrder.map((surfaceType) => buildGenericSurfaceInput(surfaceType, genericState, configStatuses, recipeFileStatuses, fallbackCounts))
  ];

  return buildVisualTuningDashboardModel({
    workspaceFolder: folder.uri.fsPath,
    phaserDetected: genericState.detected || idleAdapterDetected,
    detectedAdapter,
    adapterConfidence: detectedAdapter === "idle_monster_farm" ? idleConfidence : genericState.detected ? genericState.confidence : "unknown",
    surfaces,
    attemptIndex,
    assetContracts: {
      status: assetContractLoad.status,
      path: ".game-polish-lab/assets/asset-contracts.json",
      statusCounts: summarizeVisualAssetContractStatuses(assetContractLoad.file),
      warningCount: assetContractLoad.warnings.length + assetContractLoad.file.contracts.reduce((sum, contract) => sum + contract.slots.reduce((slotSum, slot) => slotSum + slot.validation.warnings.length + slot.validation.errors.length, 0), 0)
    }
  });
}

async function handleDashboardMessage(context: vscode.ExtensionContext, folder: vscode.WorkspaceFolder, model: VisualTuningDashboardModel, message: DashboardMessage): Promise<{ ok: boolean; message: string; refresh?: boolean }> {
  if (message.command === "refresh") {
    return { ok: true, message: "Dashboard refreshed.", refresh: true };
  }
  if (message.command === "refreshAssetContracts") {
    const result = await refreshVisualAssetContracts(folder.uri.fsPath);
    const counts = result.statusCounts;
    return {
      ok: true,
      message: `Asset contracts refreshed. valid ${counts.valid}, warnings ${counts.warning}, invalid ${counts.invalid}, missing ${counts.missing}, unknown ${counts.unknown}.`,
      refresh: true
    };
  }
  if (message.command === "openFieldNotes") {
    const uri = labUri(folder, "field-notes.md");
    if (await pathExists(uri)) {
      await openTextDocument(uri);
      return { ok: true, message: "Field notes opened." };
    }
    return { ok: false, message: "No field notes file exists yet." };
  }
  if (message.command === "markLatestResult") {
    await markLatestTuningResult();
    return { ok: true, message: "Latest result flow opened.", refresh: true };
  }
  const row = model.rows.find((candidate) => candidate.rowId === message.rowId);
  if (!row) {
    return { ok: false, message: "Dashboard row was not found." };
  }
  if (message.command === "tune") {
    await tuneVisualSurface(context, { surfaceType: row.surfaceType, adapterId: row.adapterId, targetLabel: row.targetLabel });
    return { ok: true, message: `Opened tuner for ${row.displayName}.` };
  }
  if (message.command === "openConfig") {
    if (!row.configPath) {
      return { ok: false, message: "This row has no config path. Open the tuner to create config safely." };
    }
    const uri = vscode.Uri.joinPath(folder.uri, ...row.configPath.split("/"));
    if (!(await pathExists(uri))) {
      const choice = await vscode.window.showInformationMessage("Config is missing. Open the tuner to create it safely?", "Open Tuner");
      if (choice === "Open Tuner") {
        await tuneVisualSurface(context, { surfaceType: row.surfaceType, adapterId: row.adapterId, targetLabel: row.targetLabel });
      }
      return { ok: false, message: "Config does not exist yet." };
    }
    await openTextDocument(uri);
    return { ok: true, message: `Opened ${row.configPath}.` };
  }
  if (message.command === "runScopeCheck") {
    const summary = row.scopeSummary;
    const lines = [
      `scope ok: ${summary.ok ? "yes" : "no"}`,
      `direct apply safe: ${summary.directApplySafe ? "yes" : "no"}`,
      `setup/fallback required: ${summary.setupOrFallbackRequired ? "yes" : "no"}`,
      `allowed: ${summary.allowedFiles.join(", ") || "none"}`,
      `suspicious: ${summary.suspiciousFiles.join(", ") || "none"}`,
      `forbidden: ${summary.forbiddenFiles.join(", ") || "none"}`,
      ...summary.warnings.map((warning) => `warning: ${warning}`)
    ];
    vscode.window.showInformationMessage(lines.join(" | "));
    return { ok: summary.ok, message: lines.join("\n") };
  }
  if (message.command === "directApply") {
    return directApplyFromDashboard(folder, row);
  }
  if (message.command === "generateFallbackTask") {
    return generateFallbackTaskFromDashboard(folder, row);
  }
  return { ok: false, message: "Unsupported dashboard action." };
}

async function directApplyFromDashboard(folder: vscode.WorkspaceFolder, row: VisualTuningDashboardRow): Promise<{ ok: boolean; message: string; refresh?: boolean }> {
  if (!row.actions.directApply.enabled) {
    return { ok: false, message: row.actions.directApply.reason ?? "Direct apply is not available." };
  }
  if (row.adapterId !== "idle_monster_farm" || row.surfaceType === "asset_replacement") {
    return { ok: false, message: "Dashboard direct apply is only available for connected Idle Monster Farm style surfaces." };
  }
  const configText = row.configPath ? await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...row.configPath.split("/"))) : undefined;
  if (!configText) {
    return { ok: false, message: "A valid config is required before direct apply." };
  }
  const result = await applyIdleStyleConfig(folder, row.surfaceType, configText);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  await createTuningAttempt(folder, {
    adapterId: row.adapterId,
    surfaceType: row.surfaceType,
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    recipeId: row.recipeId,
    configPath: row.configPath,
    generatedStyleModulePath: row.generatedStyleModulePath,
    presetName: result.presetName,
    styleSnapshot: result.styleSnapshot,
    changedTokens: Object.keys(result.styleSnapshot ?? {}).sort(),
    applyMode: "direct_apply",
    connectionState: "connected",
    scopeSummary: result.changedFiles.join(", ") || row.configPath,
    rollbackPaths: result.rollbackPaths,
    manualChecklist: result.checklist,
    warnings: result.warnings,
    tags: ["v0.60-dashboard"]
  });
  return { ok: true, message: result.message, refresh: true };
}

async function generateFallbackTaskFromDashboard(folder: vscode.WorkspaceFolder, row: VisualTuningDashboardRow): Promise<{ ok: boolean; message: string; refresh?: boolean }> {
  if (!row.actions.generateFallbackTask.enabled) {
    return { ok: false, message: row.actions.generateFallbackTask.reason ?? "Fallback task is not available." };
  }
  const guidance = await getFallbackFieldNoteGuidance(folder, {
    surfaceType: row.surfaceType,
    adapterId: row.adapterId,
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    recipeId: row.recipeId
  });
  await ensureDirectory(labUri(folder, "fallback-tasks"));
  if (row.adapterId === "generic_phaser") {
    if (row.surfaceType === "asset_replacement") {
      return { ok: false, message: "Generic asset fallback requires choosing an asset destination in the tuner." };
    }
    const selectedFiles = [
      ...row.scopeSummary.suspiciousFiles,
      ...row.scopeSummary.forbiddenFiles.filter((file) => file.startsWith("src/") || file.startsWith("app/"))
    ].filter((file) => file !== row.generatedStyleModulePath);
    const fallback = buildGenericFallbackTask({
      surfaceType: row.surfaceType,
      targetLabel: row.targetLabel,
      selectedFiles: selectedFiles.length > 0 ? selectedFiles : row.scopeSummary.allowedFiles.filter((file) => file.startsWith("src/") || file.startsWith("app/")),
      generatedStyleConfigPath: genericStyleConfigRelativePath(row.surfaceType as GenericPhaserSurfaceType),
      generatedStyleModulePath: genericGeneratedStyleModulePath(row.surfaceType as GenericPhaserSurfaceType),
      fieldNoteGuidance: guidance
    });
    if (!fallback.ok || !fallback.task) {
      return { ok: false, message: fallback.errors.join(" ") };
    }
    const relativePath = genericFallbackTaskRelativePath(new Date(), row.surfaceType, row.targetLabel);
    await writeJsonFile(labUri(folder, "fallback-tasks", path.basename(relativePath)), fallback.task);
    return { ok: true, message: `Fallback task generated: ${relativePath}`, refresh: true };
  }
  const relativePath = `.game-polish-lab/fallback-tasks/${new Date().toISOString().replace(/[:.]/g, "-")}-${row.surfaceType}-${row.adapterId}.json`;
  await writeJsonFile(labUri(folder, "fallback-tasks", path.basename(relativePath)), {
    adapterId: row.adapterId,
    surfaceType: row.surfaceType,
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    recipeId: row.recipeId,
    configPath: row.configPath,
    generatedStyleModulePath: row.generatedStyleModulePath,
    allowedFiles: row.scopeSummary.allowedFiles,
    forbiddenFiles: row.scopeSummary.forbiddenFiles.length > 0 ? row.scopeSummary.forbiddenFiles : [
      "save files",
      "economy files",
      "progression/unlock files",
      "quest files",
      "hatch/merge/upgrade logic files",
      "ad/monetization files",
      "inventory/state files",
      "data model/schema files",
      "level data",
      "gameplay rules",
      "input command/action dispatch files"
    ],
    fieldNoteGuidance: guidance,
    codexMayDo: [
      "Use the selected visual config/module and adapter-approved rendering files only.",
      ...guidance.preserve.map((note) => `Preserve prior proven-good visual treatment: ${note}`)
    ],
    codexMustNotDo: [
      "Do not change gameplay, save, economy, progression, quest, hatch, merge, upgrade, ads, inventory/state, input dispatch, or package scripts.",
      ...guidance.avoid.map((note) => `Avoid prior failed visual treatment: ${note}`),
      ...guidance.mixed.map((note) => `Treat prior mixed result carefully: ${note}`)
    ],
    manualTestChecklist: row.scopeSummary.warnings
  });
  return { ok: true, message: `Fallback task generated: ${relativePath}`, refresh: true };
}

async function applyIdleStyleConfig(folder: vscode.WorkspaceFolder, surfaceType: Exclude<VisualSurfaceType, "asset_replacement">, configText: string): Promise<{ ok: boolean; message: string; presetName?: string; styleSnapshot?: object; changedFiles: string[]; rollbackPaths: string[]; checklist: string[]; warnings: string[] }> {
  if (surfaceType === "slot_card") {
    const load = loadSlotCardStyleConfigFromText(configText);
    if (load.status !== "valid") {
      return failedDirectApply("Slot card config is invalid.");
    }
    const result = await applyIdleMonsterFarmFarmSlotStyle(folder, load.config);
    return directApplyResult(result.applied, summarizeFarmSlotApplyResult(folder, result), load.config.presetName, load.config.values, result.changedFiles, result.rollbackPaths, [], result.warnings);
  }
  if (surfaceType === "background_readability") {
    const load = loadBackgroundReadabilityStyleConfigFromText(configText);
    if (load.status !== "valid") {
      return failedDirectApply("Background config is invalid.");
    }
    const result = await applyIdleMonsterFarmBackgroundStyle(folder, buildBackgroundReadabilityStyleConfig(load.config.presetName, load.config.values));
    return directApplyResult(result.applied, summarizeBackgroundApplyResult(folder, result), load.config.presetName, load.config.values, result.changedFiles, result.rollbackPaths, [], result.warnings);
  }
  if (surfaceType === "panel") {
    const load = loadPanelStyleConfigFromText(configText);
    if (load.status !== "valid") {
      return failedDirectApply("Panel config is invalid.");
    }
    const result = await applyIdleMonsterFarmPanelStyle(folder, buildPanelStyleConfig(load.config.presetName, load.config.values));
    return directApplyResult(result.applied, summarizePanelApplyResult(folder, result), load.config.presetName, load.config.values, result.changedFiles, result.rollbackPaths, [], result.warnings);
  }
  if (surfaceType === "reward_toast") {
    const load = loadRewardToastStyleConfigFromText(configText);
    if (load.status !== "valid") {
      return failedDirectApply("Reward toast config is invalid.");
    }
    const result = await applyIdleMonsterFarmRewardToastStyle(folder, buildRewardToastStyleConfig(load.config.presetName, load.config.values));
    return directApplyResult(result.applied, summarizeRewardToastApplyResult(folder, result), load.config.presetName, load.config.values, result.changedFiles, result.rollbackPaths, [], result.warnings);
  }
  const load = loadButtonStyleConfigFromText(configText);
  if (load.status !== "valid") {
    return failedDirectApply("Button config is invalid.");
  }
  const result = await applyIdleMonsterFarmButtonStyle(folder, buildButtonStyleConfig(load.config.presetName, load.config.values));
  return directApplyResult(result.applied, summarizeButtonApplyResult(folder, result), load.config.presetName, load.config.values, result.changedFiles, result.rollbackPaths, [], result.warnings);
}

function directApplyResult(ok: boolean, summary: string[], presetName: string, styleSnapshot: object, changedFiles: string[], rollbackPaths: string[], checklist: string[], warnings: string[]) {
  const message = summary.join("\n");
  logInfo(message);
  return { ok, message, presetName, styleSnapshot, changedFiles, rollbackPaths, checklist, warnings };
}

function failedDirectApply(message: string) {
  return { ok: false, message, changedFiles: [], rollbackPaths: [], checklist: [], warnings: [] };
}

async function readStyleConfigStatuses(folder: vscode.WorkspaceFolder): Promise<Record<string, DashboardConfigInfo>> {
  return {
    idle_monster_farm_slot_card: await loadConfigInfo(folder, farmSlotStyleConfigRelativePath, (text) => loadSlotCardStyleConfigFromText(text).status),
    idle_monster_farm_background_readability: await loadConfigInfo(folder, backgroundReadabilityStyleConfigRelativePath, (text) => loadBackgroundReadabilityStyleConfigFromText(text).status),
    idle_monster_farm_panel: await loadConfigInfo(folder, panelStyleConfigRelativePath, (text) => loadPanelStyleConfigFromText(text).status),
    idle_monster_farm_reward_toast: await loadConfigInfo(folder, rewardToastStyleConfigRelativePath, (text) => loadRewardToastStyleConfigFromText(text).status),
    idle_monster_farm_button: await loadConfigInfo(folder, buttonStyleConfigRelativePath, (text) => loadButtonStyleConfigFromText(text).status),
    idle_monster_farm_asset_replacement: await loadConfigInfo(folder, "src/config/monsterFarmAssetManifest.ts", () => "valid"),
    generic_phaser_slot_card: await loadGenericConfigInfo(folder, genericStyleConfigRelativePath("slot_card")),
    generic_phaser_background_readability: await loadGenericConfigInfo(folder, genericStyleConfigRelativePath("background_readability")),
    generic_phaser_panel: await loadGenericConfigInfo(folder, genericStyleConfigRelativePath("panel")),
    generic_phaser_reward_toast: await loadGenericConfigInfo(folder, genericStyleConfigRelativePath("reward_toast")),
    generic_phaser_button: await loadGenericConfigInfo(folder, genericStyleConfigRelativePath("button")),
    generic_phaser_asset_replacement: { status: "not_applicable", exists: false }
  };
}

async function loadConfigInfo(folder: vscode.WorkspaceFolder, relativePath: string, load: (text: string | undefined) => DashboardConfigInfo["status"]): Promise<DashboardConfigInfo> {
  const uri = vscode.Uri.joinPath(folder.uri, ...relativePath.split("/"));
  const text = await readTextFileIfExists(uri);
  return { status: load(text), path: relativePath, exists: text !== undefined };
}

async function loadGenericConfigInfo(folder: vscode.WorkspaceFolder, relativePath: string): Promise<DashboardConfigInfo> {
  const uri = vscode.Uri.joinPath(folder.uri, ...relativePath.split("/"));
  const text = await readTextFileIfExists(uri);
  if (text === undefined) {
    return { status: "missing", path: relativePath, exists: false };
  }
  try {
    JSON.parse(text);
    return { status: "valid", path: relativePath, exists: true };
  } catch {
    return { status: "invalid_json", path: relativePath, exists: true };
  }
}

async function readRecipeFileStatuses(folder: vscode.WorkspaceFolder): Promise<Record<string, DashboardRecipeInfo>> {
  const result: Record<string, DashboardRecipeInfo> = {};
  for (const recipe of getVisualSurfaceRecipes()) {
    const uri = labUri(folder, "visual-recipes", `${recipe.recipeId}.json`);
    const text = await readTextFileIfExists(uri);
    let invalid = false;
    if (text !== undefined) {
      try {
        invalid = !validateVisualSurfaceRecipe(JSON.parse(text)).ok;
      } catch {
        result[recipe.recipeId] = { status: "invalid_json", path: visualRecipeRelativePath(recipe.recipeId), exists: true };
        continue;
      }
    }
    result[recipe.recipeId] = recipeFileStatus(recipe, text !== undefined, invalid);
  }
  return result;
}

async function readFallbackTaskCounts(folder: vscode.WorkspaceFolder): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const uri = labUri(folder, "fallback-tasks");
  if (!(await pathExists(uri))) {
    return counts;
  }
  const entries = await vscode.workspace.fs.readDirectory(uri);
  for (const [fileName, fileType] of entries) {
    if (fileType !== vscode.FileType.File || !fileName.endsWith(".json")) {
      continue;
    }
    const text = await readTextFileIfExists(labUri(folder, "fallback-tasks", fileName));
    if (!text) {
      continue;
    }
    try {
      const parsed = JSON.parse(text) as { adapterId?: string; surfaceType?: string };
      const key = `${parsed.adapterId ?? "unknown"}_${parsed.surfaceType ?? "unknown"}`;
      counts[key] = (counts[key] ?? 0) + 1;
    } catch {
      counts.unknown = (counts.unknown ?? 0) + 1;
    }
  }
  return counts;
}

function buildIdleSurfaceInput(
  surfaceType: VisualSurfaceType,
  configs: Record<string, DashboardConfigInfo>,
  recipeFiles: Record<string, DashboardRecipeInfo>,
  fallbackCounts: Record<string, number>,
  states: Record<Exclude<VisualSurfaceType, "asset_replacement">, Awaited<ReturnType<typeof getIdleMonsterFarmFarmSlotAdapterState>> | Awaited<ReturnType<typeof getIdleMonsterFarmBackgroundAdapterState>> | Awaited<ReturnType<typeof getIdleMonsterFarmPanelAdapterState>> | Awaited<ReturnType<typeof getIdleMonsterFarmRewardToastAdapterState>> | Awaited<ReturnType<typeof getIdleMonsterFarmButtonAdapterState>>>,
  assetTargets: ReturnType<typeof getIdleMonsterFarmAssetTargets>
): DashboardSurfaceInput {
  const recipe = surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(surfaceType);
  const state = surfaceType === "asset_replacement" ? undefined : states[surfaceType];
  const adapter = surfaceType === "asset_replacement"
    ? {
      adapterId: "idle_monster_farm" as const,
      targetId: "assets",
      targetLabel: "Monster Farm Assets",
      connectedState: "not_applicable" as const,
      detected: assetTargets.targets.length > 0,
      confidence: "high" as const,
      directApplySupported: assetTargets.targets.some((target) => target.directApplySupported),
      ownerFiles: [],
      warnings: assetTargets.warnings
    }
    : adapterInfoFromState("idle_monster_farm", state!, recipe?.adapterMappings.find((mapping) => mapping.adapterId === "idle_monster_farm")?.targetId, recipe?.adapterMappings.find((mapping) => mapping.adapterId === "idle_monster_farm")?.targetLabel ?? recipe?.displayName ?? surfaceType);
  const config = configs[`idle_monster_farm_${surfaceType}`];
  return {
    surfaceType,
    displayName: surfaceType === "asset_replacement" ? "Monster Farm Assets" : recipe?.displayName ?? surfaceType,
    adapter,
    recipe,
    config,
    recipeFile: recipe ? recipeFiles[recipe.recipeId] : { status: "not_applicable", exists: false },
    fallbackTaskCount: fallbackCounts[`idle_monster_farm_${surfaceType}`] ?? 0,
    scopeFiles: scopeFilesForRow(adapter, config, recipe)
  };
}

function buildGenericSurfaceInput(surfaceType: VisualSurfaceType, genericState: Awaited<ReturnType<typeof getGenericPhaserAdapterState>>, configs: Record<string, DashboardConfigInfo>, recipeFiles: Record<string, DashboardRecipeInfo>, fallbackCounts: Record<string, number>): DashboardSurfaceInput {
  const recipe = surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(surfaceType);
  const configPath = surfaceType === "asset_replacement" ? undefined : genericStyleConfigRelativePath(surfaceType);
  const adapter: DashboardAdapterInfo = {
    adapterId: "generic_phaser",
    targetId: "manual_target",
    targetLabel: surfaceType === "asset_replacement" ? "Generic Asset Replacement" : `Generic ${recipe?.displayName ?? surfaceType}`,
    connectedState: "unknown",
    detected: genericState.detected,
    confidence: genericState.confidence,
    directApplySupported: surfaceType !== "asset_replacement",
    generatedStyleModulePath: surfaceType === "asset_replacement" ? undefined : genericGeneratedStyleModulePath(surfaceType),
    ownerFiles: genericState.likelySceneFiles,
    warnings: genericState.warnings
  };
  const config: DashboardConfigInfo = configs[`generic_phaser_${surfaceType}`] ?? (surfaceType === "asset_replacement"
    ? { status: "not_applicable", exists: false }
    : { status: "missing", path: configPath, exists: false });
  return {
    surfaceType,
    displayName: adapter.targetLabel,
    adapter,
    recipe,
    config,
    recipeFile: recipe ? recipeFiles[recipe.recipeId] : { status: "not_applicable", exists: false },
    fallbackTaskCount: fallbackCounts[`generic_phaser_${surfaceType}`] ?? 0,
    scopeFiles: scopeFilesForRow(adapter, config, recipe, genericState.likelySceneFiles)
  };
}

function adapterInfoFromState(adapterId: "idle_monster_farm", state: {
  detection: {
    detected: boolean;
    confidence: "high" | "medium" | "low";
    supportedStyleModulePath: string;
    ownerFiles: string[];
    warnings: string[];
  };
  connection: { connected: boolean };
}, targetId: string | undefined, targetLabel: string): DashboardAdapterInfo {
  return {
    adapterId,
    targetId,
    targetLabel,
    connectedState: state.connection.connected ? "connected" : "not_connected",
    detected: state.detection.detected,
    confidence: state.detection.confidence,
    directApplySupported: true,
    generatedStyleModulePath: state.detection.supportedStyleModulePath,
    ownerFiles: state.detection.ownerFiles,
    warnings: state.detection.warnings
  };
}

function scopeFilesForRow(adapter: DashboardAdapterInfo, config: DashboardConfigInfo, recipe?: ReturnType<typeof getVisualSurfaceRecipe>, extraFiles: string[] = []): string[] {
  return [
    config.path,
    adapter.generatedStyleModulePath,
    ...adapter.ownerFiles,
    ...extraFiles,
    ...(recipe ? [visualRecipeRelativePath(recipe.recipeId)] : [])
  ].filter((value): value is string => Boolean(value));
}

function renderDashboardHtml(model: VisualTuningDashboardModel): string {
  const nonce = createNonce();
  const payload = JSON.stringify(model).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Tuning Dashboard</title>
  <style nonce="${nonce}">
    :root{color-scheme:light dark;--panel:var(--vscode-editorWidget-background);--border:var(--vscode-panel-border);--text:var(--vscode-foreground);--muted:var(--vscode-descriptionForeground);--button:var(--vscode-button-background);--button-text:var(--vscode-button-foreground)}
    *{box-sizing:border-box}body{margin:0;padding:18px;color:var(--text);font-family:var(--vscode-font-family);background:var(--vscode-editor-background)}h1,h2,h3,p{margin:0}h1{font-size:21px}h2{font-size:15px}.top{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:12px}.metric,.card,.notes{border:1px solid var(--border);background:var(--panel);border-radius:8px;padding:12px}.metric b{display:block;font-size:17px}.muted,.meta{color:var(--muted);font-size:12px;line-height:1.45}.toolbar{display:flex;gap:8px;align-items:center}.rows{display:grid;gap:10px}.card{display:grid;gap:10px}.row-head{display:grid;grid-template-columns:1fr auto;gap:12px}.badges{display:flex;flex-wrap:wrap;gap:6px}.badge{border:1px solid var(--border);border-radius:999px;padding:2px 8px;font-size:12px;color:var(--muted)}.applied{color:#89d185}.invalid,.worse{color:#f48771}.config_only,.same{color:#dcdcaa}.fallback_ready,.mixed{color:#75beff}.actions{display:flex;flex-wrap:wrap;gap:7px}button{min-height:28px;color:var(--button-text);background:var(--button);border:1px solid transparent;border-radius:4px;padding:3px 10px}button:disabled{opacity:.45}.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}select{color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--border));min-height:28px;border-radius:4px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:7px}.status{white-space:pre-wrap;margin-top:12px}.notes{margin:12px 0}.notes ul{margin:6px 0 0;padding-left:18px}@media(max-width:720px){.top,.row-head{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="top"><div><h1>Visual Tuning Dashboard</h1><p class="meta">${escapeHtml(model.summary.workspaceFolder)}</p></div><div class="toolbar"><select id="adapterFilter"><option value="detected">Detected Adapter</option><option value="idle_monster_farm">Idle Monster Farm</option><option value="generic_phaser">Generic Phaser</option><option value="all">All</option></select><button id="refreshAssetContracts" class="secondary">Refresh Asset Contracts</button><button id="refresh">Refresh</button></div></div>
  <section class="summary">${summaryMetric("Adapter", `${model.summary.detectedAdapter} (${model.summary.adapterConfidence})`)}${summaryMetric("Phaser", model.summary.phaserDetected ? "yes" : "no")}${summaryMetric("Surfaces", String(model.summary.totalSurfaces))}${summaryMetric("Applied", String(model.summary.appliedCount))}${summaryMetric("Config Only", String(model.summary.configOnlyCount))}${summaryMetric("Warnings", String(model.summary.warningCount))}${summaryMetric("Worse/Same", String(model.summary.recentWorseOrSameCount))}${summaryMetric("Asset Contracts", `${model.summary.assetContractStatus}: ${model.summary.assetContractStatusCounts.valid}/${model.summary.assetContractStatusCounts.total} valid`)}${summaryMetric("Asset Issues", `${model.summary.assetContractStatusCounts.missing} missing, ${model.summary.assetContractStatusCounts.invalid} invalid, ${model.summary.assetContractStatusCounts.unknown} unknown`)}</section>
  <section class="notes"><div class="row-head"><h2>Field Notes</h2><button class="secondary" data-global="openFieldNotes">Open Field Notes</button></div><div class="grid"><div><b>Known Good</b><ul id="good"></ul></div><div><b>Known Bad</b><ul id="bad"></ul></div><div><b>Mixed</b><ul id="mixed"></ul></div></div></section>
  <section class="rows" id="rows"></section>
  <div id="status" class="status muted"></div>
  <script nonce="${nonce}">
    const vscode=acquireVsCodeApi();const model=${payload};const rows=document.getElementById("rows"),status=document.getElementById("status"),filter=document.getElementById("adapterFilter");
    function li(list,text){const el=document.createElement("li");el.textContent=text;list.append(el);}
    (model.fieldNotes.knownGood.length?model.fieldNotes.knownGood:["none"]).forEach(v=>li(document.getElementById("good"),v));
    (model.fieldNotes.knownBad.length?model.fieldNotes.knownBad:["none"]).forEach(v=>li(document.getElementById("bad"),v));
    (model.fieldNotes.mixed.length?model.fieldNotes.mixed:["none"]).forEach(v=>li(document.getElementById("mixed"),v));
    function visible(row){if(filter.value==="all")return true;if(filter.value==="detected")return row.adapterId===model.summary.detectedAdapter||(model.summary.detectedAdapter==="unknown"&&row.adapterId==="generic_phaser");return row.adapterId===filter.value;}
    function render(){rows.textContent="";model.rows.filter(visible).forEach(row=>{const card=document.createElement("article");card.className="card";card.innerHTML='<div class="row-head"><div><h2>'+row.displayName+'</h2><div class="meta">'+row.surfaceType+' | '+row.adapterId+' | '+row.targetLabel+'</div></div><div class="badges"><span class="badge '+row.appliedStatus+'">'+row.appliedStatus+'</span><span class="badge '+row.lastResult+'">result: '+row.lastResult+'</span><span class="badge">warnings: '+row.warningCount+'</span><span class="badge">fallbacks: '+row.fallbackTaskCount+'</span></div></div><div class="grid"><div><b>Config</b><p class="meta">'+(row.configPath||'none')+' ('+row.configStatus+')</p></div><div><b>Recipe</b><p class="meta">'+(row.recipeId||'none')+' ('+row.recipeStatus+')</p></div><div><b>Connection</b><p class="meta">'+row.connectedState+'</p></div><div><b>Last Tuned</b><p class="meta">'+(row.lastTunedAt||'none')+'</p></div></div><p class="meta">'+(row.latestNoteSummary||'')+'</p>';const actions=document.createElement("div");actions.className="actions";for(const [command,action] of Object.entries(row.actions)){const button=document.createElement("button");button.textContent=action.label;button.disabled=!action.enabled&&command!=="openConfig";button.className=command==="tune"?"":"secondary";button.title=action.reason||action.label;button.addEventListener("click",()=>vscode.postMessage({command,rowId:row.rowId}));actions.append(button);}card.append(actions);rows.append(card);});}
    filter.addEventListener("change",render);document.getElementById("refresh").addEventListener("click",()=>vscode.postMessage({command:"refresh"}));document.getElementById("refreshAssetContracts").addEventListener("click",()=>vscode.postMessage({command:"refreshAssetContracts"}));document.querySelectorAll("[data-global]").forEach(b=>b.addEventListener("click",()=>vscode.postMessage({command:b.dataset.global})));window.addEventListener("message",event=>{const m=event.data;status.textContent=(m.ok?'OK: ':'Blocked: ')+m.message;});render();
  </script>
</body>
</html>`;
}

function summaryMetric(label: string, value: string): string {
  return `<div class="metric"><span class="muted">${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function logChecklist(label: string, checklist: string[]): void {
  logInfo(label);
  for (const item of checklist) {
    logInfo(`- ${item}`);
  }
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
