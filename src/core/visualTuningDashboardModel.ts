import { buildVisualDirectApplyPlan } from "./visualDirectApplyTemplates";
import { checkVisualScopeGuard, visualScopeGuardWarnings } from "./visualScopeGuard";
import { getVisualSurfaceRecipe, visualRecipeRelativePath } from "./visualRecipeRegistry";
import { VisualSurfaceRecipe } from "../types/visualRecipe";
import { VisualSurfaceType } from "../types/visualSurface";
import { FieldNoteTreatmentSummary, VisualTuningAttemptIndex, VisualTuningAttemptIndexEntry } from "../types/visualTuningAttempt";
import {
  DashboardAdapterId,
  DashboardAppliedStatus,
  DashboardConfigStatus,
  DashboardConnectionState,
  DashboardRecipeStatus,
  VisualTuningDashboardModel,
  VisualTuningDashboardRow,
  VisualTuningFieldNoteSummary
} from "../types/visualTuningDashboard";
import { VisualAssetContractStatusCounts } from "../types/visualAssetContract";
import { PolishDevOverlayStatus } from "./visualDevOverlay";
import { getVisualGameAdapterSurfaceTargets, summarizeRegisteredVisualGameAdapterContracts } from "./visualGameAdapters";
import { VisualAdapterProjectDetection } from "../types/visualGameAdapter";
import { GenericPhaserManualSurfaceId, GenericPhaserOwnerFileSuggestion, genericManualStyleConfigRelativePath, manualSurfaceIdToVisualSurfaceType } from "./genericPhaserAdapterModel";
import { runtimeProofAllowsDirectApply, VisualRuntimeConnectionProof } from "./visualRuntimeConnectionProof";

export interface DashboardConfigInfo {
  status: DashboardConfigStatus;
  path?: string;
  exists: boolean;
}

export interface DashboardRecipeInfo {
  status: DashboardRecipeStatus;
  path?: string;
  exists: boolean;
}

export interface DashboardAdapterInfo {
  adapterId: DashboardAdapterId;
  targetId?: string;
  targetLabel: string;
  connectedState: DashboardConnectionState;
  detected: boolean;
  confidence: "high" | "medium" | "low" | "unknown";
  directApplySupported: boolean;
  generatedStyleModulePath?: string;
  runtimeConnectionProof?: VisualRuntimeConnectionProof;
  ownerFiles: string[];
  warnings: string[];
}

export interface DashboardSurfaceInput {
  surfaceType: VisualSurfaceType;
  displayName: string;
  adapter: DashboardAdapterInfo;
  recipe?: VisualSurfaceRecipe;
  config: DashboardConfigInfo;
  recipeFile: DashboardRecipeInfo;
  fallbackTaskCount: number;
  scopeFiles: string[];
}

export interface BuildDashboardInput {
  workspaceFolder: string;
  workspaceName?: string;
  workspaceMode?: "real_workspace" | "fixture_test" | "no_workspace";
  generatedAt?: Date;
  phaserDetected: boolean;
  detectedAdapter: DashboardAdapterId | "unknown";
  adapterConfidence: "high" | "medium" | "low" | "unknown";
  detectionEvidence?: string[];
  detectionWarnings?: string[];
  surfaces: DashboardSurfaceInput[];
  attemptIndex: VisualTuningAttemptIndex;
  assetContracts?: {
    status: "missing" | "valid" | "malformed";
    path?: string;
    statusCounts: VisualAssetContractStatusCounts;
    warningCount: number;
  };
  devOverlay?: PolishDevOverlayStatus;
}

export interface BuildSortPuzzleDashboardSurfaceInputsInput {
  detection: VisualAdapterProjectDetection;
  configs: Record<string, DashboardConfigInfo>;
  recipeFiles: Record<string, DashboardRecipeInfo>;
  fallbackCounts: Record<string, number>;
  ownerFiles?: string[];
}

export interface BuildCursorArenaDashboardSurfaceInputsInput {
  detection: VisualAdapterProjectDetection;
  configs: Record<string, DashboardConfigInfo>;
  recipeFiles: Record<string, DashboardRecipeInfo>;
  fallbackCounts: Record<string, number>;
  ownerFiles?: string[];
}

export interface BuildGenericPhaserDashboardSurfaceInputsInput {
  detection: VisualAdapterProjectDetection & {
    likelySceneFiles?: string[];
    ownerFileSuggestions?: GenericPhaserOwnerFileSuggestion[];
  };
  configs: Record<string, DashboardConfigInfo>;
  recipeFiles: Record<string, DashboardRecipeInfo>;
  fallbackCounts: Record<string, number>;
}

export interface DashboardAdapterFilterOption {
  value: DashboardAdapterId | "detected" | "all";
  label: string;
}

export interface ProductionDashboardSurfaceSelectionInput {
  idleDetected: boolean;
  sortPuzzleDetected: boolean;
  cursorArenaDetected: boolean;
  genericDetected: boolean;
  idleSurfaces: DashboardSurfaceInput[];
  sortPuzzleSurfaces: DashboardSurfaceInput[];
  cursorArenaSurfaces: DashboardSurfaceInput[];
  genericSurfaces: DashboardSurfaceInput[];
}

export function buildVisualTuningDashboardModel(input: BuildDashboardInput): VisualTuningDashboardModel {
  const rows = input.surfaces.map((surface) => buildDashboardRow(surface, input.attemptIndex));
  const fieldNotes = buildFieldNoteSummary(rows);
  return {
    schemaVersion: "visual-tuning-dashboard/v1",
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    summary: {
      workspaceFolder: input.workspaceFolder,
      workspaceName: input.workspaceName ?? (basename(input.workspaceFolder) || "No workspace folder"),
      workspaceMode: input.workspaceMode ?? "real_workspace",
      detectedAdapter: input.detectedAdapter,
      adapterConfidence: input.adapterConfidence,
      phaserDetected: input.phaserDetected,
      detectionEvidence: unique(input.detectionEvidence ?? []).slice(0, 24),
      detectionWarnings: unique(input.detectionWarnings ?? []).slice(0, 24),
      totalSurfaces: rows.length,
      appliedCount: rows.filter((row) => row.appliedStatus === "applied").length,
      configOnlyCount: rows.filter((row) => row.appliedStatus === "config_only").length,
      warningCount: rows.reduce((sum, row) => sum + row.warningCount, 0),
      recentWorseOrSameCount: rows.filter((row) => row.lastResult === "worse" || row.lastResult === "same").length,
      assetContractPath: input.assetContracts?.path,
      assetContractStatus: input.assetContracts?.status ?? "missing",
      assetContractStatusCounts: input.assetContracts?.statusCounts ?? emptyAssetContractStatusCounts(),
      assetContractWarningCount: input.assetContracts?.warningCount ?? 0,
      assetContactSheetAvailable: Boolean(input.assetContracts && input.assetContracts.status === "valid" && input.assetContracts.statusCounts.total > 0),
      devOverlay: input.devOverlay ? {
        path: input.devOverlay.path,
        exists: input.devOverlay.exists,
        generated: input.devOverlay.generated,
        fileCount: input.devOverlay.fileCount,
        generatedFileCount: input.devOverlay.generatedFileCount,
        warningCount: input.devOverlay.warnings.length
      } : undefined,
      adapterContracts: summarizeRegisteredVisualGameAdapterContracts()
    },
    fieldNotes,
    rows,
    manualChecklist: dashboardManualChecklist()
  };
}

export function selectProductionDashboardSurfaces(input: ProductionDashboardSurfaceSelectionInput): DashboardSurfaceInput[] {
  const surfaces: DashboardSurfaceInput[] = [];
  if (input.idleDetected) {
    surfaces.push(...input.idleSurfaces);
  }
  if (input.sortPuzzleDetected) {
    surfaces.push(...input.sortPuzzleSurfaces);
  }
  if (input.cursorArenaDetected) {
    surfaces.push(...input.cursorArenaSurfaces);
  }
  if (input.genericDetected || surfaces.length === 0) {
    surfaces.push(...input.genericSurfaces);
  }
  return surfaces;
}

export function dashboardAdapterFilterOptions(): DashboardAdapterFilterOption[] {
  return [
    { value: "detected", label: "Detected Adapter" },
    { value: "idle_monster_farm", label: "Idle Monster Farm" },
    { value: "sort_puzzle", label: "Sort Puzzle" },
    { value: "cursor_arena", label: "Cursor Arena" },
    { value: "generic_phaser", label: "Generic Phaser" },
    { value: "all", label: "All" }
  ];
}

export function buildSortPuzzleDashboardSurfaceInputs(input: BuildSortPuzzleDashboardSurfaceInputsInput): DashboardSurfaceInput[] {
  return getVisualGameAdapterSurfaceTargets("sort_puzzle").map((target) => {
    const recipe = target.surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(target.surfaceType);
    const config: DashboardConfigInfo = target.styleConfigPath
      ? input.configs[`sort_puzzle_${target.targetId}`] ?? { status: "missing", path: target.styleConfigPath, exists: false }
      : { status: "not_applicable", exists: false };
    const directApplySupported = target.directApply.support === "executable";
    const adapter: DashboardAdapterInfo = {
      adapterId: "sort_puzzle",
      targetId: target.targetId,
      targetLabel: target.displayName,
      connectedState: directApplySupported ? "connected" : "not_applicable",
      detected: input.detection.detected,
      confidence: input.detection.confidence,
      directApplySupported,
      ownerFiles: Array.from(new Set([...(input.ownerFiles ?? []), ...target.likelyOwnerFiles])).sort(),
      warnings: [
        ...input.detection.warnings,
        target.surfaceType === "asset_replacement"
          ? "Spirit asset replacement is manual-only; loader and manifest changes are fallback-only."
          : "Sort Puzzle direct apply is config-only. Runtime SpiritSortScene integration remains fallback-only unless the project already reads the generated config."
      ]
    };
    return {
      surfaceType: target.surfaceType,
      displayName: target.displayName,
      adapter,
      recipe,
      config,
      recipeFile: recipe ? input.recipeFiles[recipe.recipeId] : { status: "not_applicable", exists: false },
      fallbackTaskCount: input.fallbackCounts[`sort_puzzle_${target.surfaceType}`] ?? 0,
      scopeFiles: scopeFilesForRow(adapter, config, recipe)
    };
  });
}

export function buildCursorArenaDashboardSurfaceInputs(input: BuildCursorArenaDashboardSurfaceInputsInput): DashboardSurfaceInput[] {
  return getVisualGameAdapterSurfaceTargets("cursor_arena").map((target) => {
    const recipe = target.surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(target.surfaceType);
    const config: DashboardConfigInfo = target.styleConfigPath
      ? input.configs[`cursor_arena_${target.targetId}`] ?? { status: "missing", path: target.styleConfigPath, exists: false }
      : { status: "not_applicable", exists: false };
    const directApplySupported = target.directApply.support === "executable";
    const adapter: DashboardAdapterInfo = {
      adapterId: "cursor_arena",
      targetId: target.targetId,
      targetLabel: target.displayName,
      connectedState: directApplySupported ? "connected" : "not_applicable",
      detected: input.detection.detected,
      confidence: input.detection.confidence,
      directApplySupported,
      ownerFiles: Array.from(new Set([...(input.ownerFiles ?? []), ...target.likelyOwnerFiles])).sort(),
      warnings: [
        ...input.detection.warnings,
        "Cursor Arena direct apply is config-only. Runtime arena rendering integration remains fallback-only unless the project already reads the generated config."
      ]
    };
    return {
      surfaceType: target.surfaceType,
      displayName: target.displayName,
      adapter,
      recipe,
      config,
      recipeFile: recipe ? input.recipeFiles[recipe.recipeId] : { status: "not_applicable", exists: false },
      fallbackTaskCount: input.fallbackCounts[`cursor_arena_${target.surfaceType}`] ?? 0,
      scopeFiles: scopeFilesForRow(adapter, config, recipe)
    };
  });
}

export function buildGenericPhaserDashboardSurfaceInputs(input: BuildGenericPhaserDashboardSurfaceInputsInput): DashboardSurfaceInput[] {
  return getVisualGameAdapterSurfaceTargets("generic_phaser").map((target) => {
    const manualSurfaceId = genericManualSurfaceIdForTarget(target.targetId, target.surfaceType);
    const suggestion = bestGenericSuggestion(input.detection.ownerFileSuggestions ?? [], manualSurfaceId);
    const ownerFiles = suggestion ? [suggestion.path] : target.likelyOwnerFiles;
    const styleConfigPath = target.styleConfigPath ?? (manualSurfaceId === "asset_slot" ? genericManualStyleConfigRelativePath("asset_slot") : undefined);
    const recipe = target.surfaceType === "asset_replacement" ? undefined : getVisualSurfaceRecipe(target.surfaceType);
    const config: DashboardConfigInfo = styleConfigPath
      ? configInfoByPath(input.configs, styleConfigPath) ?? { status: "missing", path: styleConfigPath, exists: false }
      : { status: "not_applicable", exists: false };
    const directApplySupported = target.surfaceType !== "asset_replacement"
      && target.directApply.support === "executable"
      && suggestion?.safetyLevel !== "forbidden";
    const adapter: DashboardAdapterInfo = {
      adapterId: "generic_phaser",
      targetId: target.targetId,
      targetLabel: suggestion ? `${target.displayName}: ${basename(suggestion.path)}` : target.displayName,
      connectedState: target.surfaceType === "asset_replacement" ? "not_applicable" : "not_connected",
      detected: input.detection.detected,
      confidence: input.detection.confidence,
      directApplySupported,
      generatedStyleModulePath: target.generatedStyleModulePath,
      ownerFiles,
      warnings: [
        ...input.detection.warnings,
        suggestion
          ? `${suggestion.path}: ${suggestion.reason} Safety: ${suggestion.safetyLevel}.`
          : "Manual owner file selection is required before source integration fallback.",
        target.surfaceType === "asset_replacement"
          ? "Generic Phaser asset rows are asset-copy/manual-loader only."
          : "Generic Phaser direct apply writes generated config only; runtime source integration remains fallback-only."
      ]
    };
    return {
      surfaceType: target.surfaceType,
      displayName: adapter.targetLabel,
      adapter,
      recipe,
      config,
      recipeFile: recipe ? input.recipeFiles[recipe.recipeId] : { status: "not_applicable", exists: false },
      fallbackTaskCount: input.fallbackCounts[`generic_phaser_${target.surfaceType}`] ?? 0,
      scopeFiles: scopeFilesForRow(adapter, config, recipe)
    };
  });
}

function emptyAssetContractStatusCounts(): VisualAssetContractStatusCounts {
  return {
    valid: 0,
    warning: 0,
    invalid: 0,
    missing: 0,
    unknown: 0,
    total: 0
  };
}

export function buildDashboardRow(surface: DashboardSurfaceInput, attemptIndex: VisualTuningAttemptIndex): VisualTuningDashboardRow {
  const latest = findLatestAttemptForSurface(attemptIndex, surface.surfaceType, surface.adapter.adapterId, surface.adapter.targetId, surface.adapter.targetLabel);
  const treatment = summarizeTreatments(attemptIndex, surface.surfaceType, surface.adapter.adapterId, surface.adapter.targetId, surface.adapter.targetLabel);
  const scope = toDashboardScopeSummary(checkVisualScopeGuard({
    operationType: "direct_apply",
    adapterId: surface.adapter.adapterId,
    surfaceType: surface.surfaceType,
    targetId: surface.adapter.targetId,
    candidatePaths: surface.scopeFiles
  }), surface);
  const directApplyTemplate = buildDashboardDirectApplyTemplateSummary(surface);
  const appliedStatus = calculateAppliedStatus(surface, scope);
  const warningCount = surface.adapter.warnings.length + treatment.knownBad.length + treatment.noMeaningfulEffect.length + treatment.mixed.length + scope.warnings.length + scope.forbiddenFiles.length;
  const row: VisualTuningDashboardRow = {
    rowId: `${surface.adapter.adapterId}:${surface.surfaceType}:${surface.adapter.targetId ?? safeId(surface.adapter.targetLabel)}`,
    surfaceType: surface.surfaceType,
    displayName: surface.displayName,
    adapterId: surface.adapter.adapterId,
    targetId: surface.adapter.targetId,
    targetLabel: surface.adapter.targetLabel,
    recipeId: surface.recipe?.recipeId,
    appliedStatus,
    configStatus: surface.config.status,
    configPath: surface.config.path,
    recipeStatus: surface.recipeFile.status,
    recipePath: surface.recipeFile.path,
    connectedState: surface.adapter.connectedState,
    generatedStyleModulePath: surface.adapter.generatedStyleModulePath,
    runtimeConnectionProof: surface.adapter.runtimeConnectionProof,
    lastTunedAt: latest?.createdAt,
    lastResult: latest?.resultStatus ?? "none",
    latestNoteSummary: latest ? summarizeLatestNote(latest) : undefined,
    knownGood: treatment.knownGood.map(describeAttempt),
    knownBad: [...treatment.knownBad.map(describeAttempt), ...treatment.noMeaningfulEffect.map((entry) => `${describeAttempt(entry)} had no meaningful effect`)],
    knownMixed: treatment.mixed.map(describeAttempt),
    warningCount,
    fallbackTaskCount: surface.fallbackTaskCount,
    scopeSummary: scope,
    directApplyTemplate,
    actions: {
      tune: { enabled: true, label: "Tune" },
      openConfig: surface.config.exists
        ? { enabled: true, label: "Open Config" }
        : { enabled: true, label: "Open Tuner", reason: "Config is missing; the tuner can create it safely." },
      directApply: directApplyAction(surface, appliedStatus, directApplyTemplate),
      exportTheme: exportThemeAction(surface),
      importTheme: importThemeAction(surface),
      annotateScreenshot: { enabled: true, label: "Annotate Screenshot" },
      generateFallbackTask: fallbackAction(surface, appliedStatus),
      runScopeCheck: { enabled: true, label: "Run Scope Check" },
      markLatestResult: latest ? { enabled: true, label: "Mark Latest Result" } : { enabled: false, label: "Mark Latest Result", reason: "No tuning attempt exists for this row yet." }
    }
  };
  return row;
}

export function calculateAppliedStatus(surface: DashboardSurfaceInput, scope: ReturnType<typeof toDashboardScopeSummary>): DashboardAppliedStatus {
  if (surface.config.status === "invalid_json" || surface.config.status === "schema_invalid" || surface.recipeFile.status === "invalid_json" || surface.recipeFile.status === "schema_invalid") {
    return "invalid";
  }
  if (!surface.adapter.directApplySupported) {
    return "unsupported";
  }
  if (surface.adapter.adapterId === "generic_phaser" && surface.config.status === "valid" && scope.ok) {
    return "config_only";
  }
  if ((surface.adapter.adapterId === "sort_puzzle" || surface.adapter.adapterId === "cursor_arena") && surface.config.status === "valid" && scope.ok) {
    return "config_only";
  }
  if (surface.adapter.connectedState === "connected" && surface.config.status === "valid" && scope.directApplySafe) {
    return "applied";
  }
  if (surface.config.status === "valid") {
    return "config_only";
  }
  if (surface.adapter.adapterId === "idle_monster_farm" && surface.adapter.detected && surface.adapter.confidence !== "low" && surface.adapter.directApplySupported) {
    return "unapplied";
  }
  if (surface.adapter.connectedState === "not_connected" || surface.adapter.adapterId === "generic_phaser") {
    return "fallback_ready";
  }
  if (!surface.adapter.detected || surface.adapter.confidence === "low") {
    return "unknown";
  }
  return "unapplied";
}

export function findLatestAttemptForSurface(index: VisualTuningAttemptIndex, surfaceType: VisualSurfaceType, adapterId: string, targetId?: string, targetLabel?: string): VisualTuningAttemptIndexEntry | undefined {
  return index.attempts.find((attempt) => attempt.surfaceType === surfaceType
    && attempt.adapterId === adapterId
    && targetMatches(attempt, targetId, targetLabel));
}

export function summarizeTreatments(index: VisualTuningAttemptIndex, surfaceType: VisualSurfaceType, adapterId: string, targetId?: string, targetLabel?: string): FieldNoteTreatmentSummary {
  const matches = index.attempts.filter((attempt) => attempt.surfaceType === surfaceType
    && attempt.adapterId === adapterId
    && targetMatches(attempt, targetId, targetLabel));
  const knownGood = matches.filter((entry) => entry.resultStatus === "better");
  const knownBad = matches.filter((entry) => entry.resultStatus === "worse");
  const noMeaningfulEffect = matches.filter((entry) => entry.resultStatus === "same");
  const mixed = matches.filter((entry) => entry.resultStatus === "mixed");
  return {
    knownGood,
    knownBad,
    noMeaningfulEffect,
    mixed,
    warnings: knownBad.map((entry) => `${describeAttempt(entry)} was worse.`),
    successes: knownGood.map((entry) => `${describeAttempt(entry)} was better.`)
  };
}

export function dashboardManualChecklist(): string[] {
  return [
    "dashboard command appears in command palette",
    "dashboard opens without writing files",
    "project summary renders",
    "detected adapter/confidence shown",
    "all existing surfaces listed",
    "applied/config-only/unapplied/invalid statuses render correctly",
    "latest tuned date/result shown",
    "known-good and known-bad field notes shown",
    "Tune opens the existing tuner for the selected surface",
    "Open Config opens existing config or offers safe create/init",
    "Direct Apply can bootstrap supported Idle Monster Farm setup when runtime proof is missing",
    "Direct Apply rows show template availability and warning/block counts",
    "Export Theme reads existing generated config and writes .game-polish-lab/themes files",
    "Import Theme writes generated config-only style files and keeps runtime status honest",
    "Annotate Screenshot opens the manual annotation flow without changing runtime apply status",
    "Fallback Task generates scoped fallback only when appropriate",
    "Scope Check shows allowed/suspicious/forbidden status without edits",
    "asset contract summary shows missing/valid/malformed status without building contact sheets",
    "optional dev overlay status shows generated/missing without installing runtime files",
    "adapter contract summary shows registered adapters without adding new adapters",
    "Refresh Asset Contracts writes only .game-polish-lab/assets/asset-contracts.json",
    "View Asset Contact Sheet opens a preview-only webview from existing contracts",
    "Rollback History lists snapshots and restores only scope-guard-safe visual files",
    "Mark Latest Result uses existing v0.59 flow",
    "no gameplay/save/economy/progression/ad files changed"
  ];
}

export function configPathForDashboard(adapterId: DashboardAdapterId, surfaceType: VisualSurfaceType, recipe?: VisualSurfaceRecipe): string | undefined {
  if (surfaceType === "asset_replacement") {
    return adapterId === "idle_monster_farm" ? "src/config/monsterFarmAssetManifest.ts" : undefined;
  }
  const mapping = recipe?.adapterMappings.find((candidate) => candidate.adapterId === adapterId);
  return mapping?.configPath ?? recipe?.configPath;
}

export function recipeFileStatus(recipe: VisualSurfaceRecipe | undefined, exists: boolean, invalid?: boolean): DashboardRecipeInfo {
  if (!recipe) {
    return { status: "not_applicable", exists: false };
  }
  const path = visualRecipeRelativePath(recipe.recipeId);
  if (invalid) {
    return { status: "schema_invalid", path, exists };
  }
  return { status: exists ? "valid" : "missing", path, exists };
}

function toDashboardScopeSummary(scope: ReturnType<typeof checkVisualScopeGuard>, surface: DashboardSurfaceInput) {
  const suspiciousFiles = scope.classifiedFiles.filter((file) => file.classification === "suspicious" || file.classification === "unknown").map((file) => file.path);
  const forbiddenFiles = scope.classifiedFiles.filter((file) => file.classification === "forbidden").map((file) => file.path);
  return {
    ok: forbiddenFiles.length === 0,
    allowedFiles: scope.classifiedFiles.filter((file) => file.classification === "safe").map((file) => file.path),
    suspiciousFiles,
    forbiddenFiles,
    warnings: visualScopeGuardWarnings(scope),
    classificationCounts: scope.counts,
    recommendedAction: scope.recommendedAction,
    summaryMessage: scope.summaryMessage,
    directApplySafe: forbiddenFiles.length === 0 && surface.adapter.directApplySupported && surface.adapter.connectedState === "connected" && proofAllowsDirectApply(surface.adapter.runtimeConnectionProof),
    setupOrFallbackRequired: surface.adapter.connectedState !== "connected" || !proofAllowsDirectApply(surface.adapter.runtimeConnectionProof) || forbiddenFiles.length > 0
  };
}

function directApplyAction(surface: DashboardSurfaceInput, appliedStatus: DashboardAppliedStatus, template: ReturnType<typeof buildDashboardDirectApplyTemplateSummary>) {
  if (surface.surfaceType === "asset_replacement") {
    return { enabled: false, label: "Direct Apply", reason: "Asset replacement requires choosing an asset in the tuner." };
  }
  if (!template.available) {
    return { enabled: false, label: "Direct Apply", reason: template.reason ?? "No direct apply template is available for this row." };
  }
  if (!surface.adapter.directApplySupported) {
    return { enabled: false, label: "Direct Apply", reason: "This adapter cannot directly apply this surface." };
  }
  if (surface.adapter.adapterId === "generic_phaser") {
    if (surface.config.status !== "valid") {
      return { enabled: false, label: "Save Config", reason: "A valid generated Generic Phaser config is required before config-only save." };
    }
    return { enabled: true, label: "Save Config", reason: "Config-only write; runtime source integration remains fallback-only." };
  }
  if (surface.adapter.adapterId === "sort_puzzle" || surface.adapter.adapterId === "cursor_arena") {
    if (surface.config.status !== "valid") {
      return { enabled: false, label: "Save Config", reason: "A valid generated style config is required before config-only save." };
    }
    return { enabled: true, label: "Save Config", reason: "Config-only write; runtime source integration remains fallback-only." };
  }
  if (surface.adapter.adapterId === "idle_monster_farm") {
    if (surface.config.status === "missing" && (surface.surfaceType === "slot_card" || surface.surfaceType === "background_readability")) {
      return { enabled: true, label: "Create Config & Connect", reason: `Create the default ${surface.displayName} config, install the supported runtime bridge, and apply runtime style values.` };
    }
    if (surface.config.status !== "valid") {
      return { enabled: false, label: "Open Tuner", reason: "A valid generated style config is required before setup/apply." };
    }
    if (surface.adapter.connectedState !== "connected" || !proofAllowsDirectApply(surface.adapter.runtimeConnectionProof)) {
      const proof = surface.adapter.runtimeConnectionProof;
      return { enabled: true, label: "Save & Connect", reason: proof ? `Runtime proof is ${proof.status}/${proof.proofLevel}; run setup/apply to connect runtime usage.` : "Runtime value usage proof is missing; run setup/apply to connect runtime usage." };
    }
  }
  if (surface.adapter.connectedState !== "connected") {
    const proof = surface.adapter.runtimeConnectionProof;
    return { enabled: false, label: "Direct Apply", reason: proof ? `Runtime proof is ${proof.status}/${proof.proofLevel}; use setup or fallback first.` : "Adapter is not connected; use setup or fallback first." };
  }
  if (!proofAllowsDirectApply(surface.adapter.runtimeConnectionProof)) {
    const proof = surface.adapter.runtimeConnectionProof;
    return { enabled: false, label: "Direct Apply", reason: proof ? `Runtime proof is ${proof.status}/${proof.proofLevel}; direct apply requires runtime_value_usage.` : "Runtime value usage proof is missing." };
  }
  if (surface.config.status !== "valid") {
    return { enabled: false, label: "Direct Apply", reason: "A valid config is required before direct apply." };
  }
  return { enabled: appliedStatus !== "invalid", label: "Direct Apply" };
}

function proofAllowsDirectApply(proof: VisualRuntimeConnectionProof | undefined): boolean {
  return runtimeProofAllowsDirectApply(proof);
}

function exportThemeAction(surface: DashboardSurfaceInput) {
  if (surface.surfaceType === "asset_replacement") {
    return { enabled: false, label: "Export Theme", reason: "Asset replacement rows are not portable executable style themes." };
  }
  if (!surface.config.exists || !surface.config.path) {
    return { enabled: false, label: "Export Theme", reason: "A generated style config must exist before exporting a theme." };
  }
  return { enabled: true, label: "Export Theme" };
}

function importThemeAction(surface: DashboardSurfaceInput) {
  if (surface.surfaceType === "asset_replacement") {
    return { enabled: false, label: "Import Theme", reason: "Asset replacement theme import is validation-only." };
  }
  if (!surface.config.path) {
    return { enabled: false, label: "Import Theme", reason: "This row has no generated style config target." };
  }
  return { enabled: true, label: "Import Theme" };
}

function buildDashboardDirectApplyTemplateSummary(surface: DashboardSurfaceInput) {
  const plan = buildVisualDirectApplyPlan({
    adapterId: surface.adapter.adapterId,
    surfaceType: surface.surfaceType,
    targetId: surface.adapter.targetId,
    targetLabel: surface.adapter.targetLabel,
    styleConfigPath: surface.config.path,
    generatedStyleModulePath: surface.adapter.generatedStyleModulePath,
    candidatePaths: [surface.config.path, surface.adapter.generatedStyleModulePath].filter((value): value is string => Boolean(value)),
    intent: "dashboard_direct_apply"
  });
  return {
    available: Boolean(plan.templateId),
    templateId: plan.templateId,
    templateName: plan.templateName,
    executable: plan.executable,
    warningCount: plan.scopeGuardResult.counts.suspicious + plan.scopeGuardResult.counts.unknown,
    blockCount: plan.scopeGuardResult.counts.forbidden,
    fallbackAvailable: plan.fallbackAvailable,
    reason: plan.executable ? undefined : plan.blockingReasons.join(" ") || undefined
  };
}

function fallbackAction(surface: DashboardSurfaceInput, appliedStatus: DashboardAppliedStatus) {
  if (appliedStatus === "applied") {
    return { enabled: false, label: "Generate Fallback Task", reason: "Connected surfaces should use direct apply first." };
  }
  if (surface.adapter.adapterId === "sort_puzzle" || surface.adapter.adapterId === "cursor_arena") {
    return { enabled: true, label: "Generate Fallback Task" };
  }
  if (surface.adapter.adapterId === "generic_phaser" || surface.adapter.connectedState !== "connected") {
    return { enabled: true, label: "Generate Fallback Task" };
  }
  return { enabled: false, label: "Generate Fallback Task", reason: "Fallback is only primary when direct apply is unsupported or not connected." };
}

function buildFieldNoteSummary(rows: VisualTuningDashboardRow[]): VisualTuningFieldNoteSummary {
  return {
    knownGood: unique(rows.flatMap((row) => row.knownGood)).slice(0, 8),
    knownBad: unique(rows.flatMap((row) => row.knownBad)).slice(0, 8),
    mixed: unique(rows.flatMap((row) => row.knownMixed)).slice(0, 8),
    fieldNotesPath: ".game-polish-lab/field-notes.md"
  };
}

function summarizeLatestNote(entry: VisualTuningAttemptIndexEntry): string | undefined {
  return [
    entry.presetName ? `preset ${entry.presetName}` : undefined,
    entry.configPath ? `config ${entry.configPath}` : undefined,
    entry.fallbackTaskPath ? `fallback ${entry.fallbackTaskPath}` : undefined
  ].filter(Boolean).join("; ") || undefined;
}

function describeAttempt(entry: VisualTuningAttemptIndexEntry): string {
  const preset = entry.presetName ? `${entry.presetName} on ` : "";
  return `${preset}${entry.surfaceType}${entry.targetLabel ? `/${entry.targetLabel}` : ""}`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeComparable(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function targetMatches(attempt: VisualTuningAttemptIndexEntry, targetId?: string, targetLabel?: string): boolean {
  if (!targetId && !targetLabel) {
    return true;
  }
  return (targetId ? attempt.targetId === targetId : false)
    || (targetLabel ? normalizeComparable(attempt.targetLabel) === normalizeComparable(targetLabel) : false);
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "target";
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

function genericManualSurfaceIdForTarget(targetId: string, surfaceType: VisualSurfaceType): GenericPhaserManualSurfaceId {
  if (targetId.includes("hud")) {
    return "hud";
  }
  if (targetId.includes("impact")) {
    return "impact_feedback";
  }
  if (surfaceType === "asset_replacement") {
    return "asset_slot";
  }
  return surfaceType;
}

function bestGenericSuggestion(suggestions: GenericPhaserOwnerFileSuggestion[], surfaceId: GenericPhaserManualSurfaceId): GenericPhaserOwnerFileSuggestion | undefined {
  const visualSurfaceType = manualSurfaceIdToVisualSurfaceType(surfaceId);
  return suggestions.find((suggestion) => suggestion.recommendedSurfaceTypes.includes(surfaceId))
    ?? suggestions.find((suggestion) => suggestion.recommendedSurfaceTypes.some((candidate) => manualSurfaceIdToVisualSurfaceType(candidate) === visualSurfaceType))
    ?? suggestions[0];
}

function configInfoByPath(configs: Record<string, DashboardConfigInfo>, configPath: string): DashboardConfigInfo | undefined {
  return Object.values(configs).find((config) => config.path === configPath);
}

function basename(value: string): string {
  return value.split("/").pop() ?? value;
}
