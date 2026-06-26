import { checkV05VisualScope, V05ScopeGuardResult } from "./v05VisualScopeGuard";
import { visualRecipeRelativePath } from "./visualRecipeRegistry";
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
  generatedAt?: Date;
  phaserDetected: boolean;
  detectedAdapter: DashboardAdapterId | "unknown";
  adapterConfidence: "high" | "medium" | "low" | "unknown";
  surfaces: DashboardSurfaceInput[];
  attemptIndex: VisualTuningAttemptIndex;
  assetContracts?: {
    status: "missing" | "valid" | "malformed";
    path?: string;
    statusCounts: VisualAssetContractStatusCounts;
    warningCount: number;
  };
}

export function buildVisualTuningDashboardModel(input: BuildDashboardInput): VisualTuningDashboardModel {
  const rows = input.surfaces.map((surface) => buildDashboardRow(surface, input.attemptIndex));
  const fieldNotes = buildFieldNoteSummary(rows);
  return {
    schemaVersion: "visual-tuning-dashboard/v1",
    generatedAt: (input.generatedAt ?? new Date()).toISOString(),
    summary: {
      workspaceFolder: input.workspaceFolder,
      detectedAdapter: input.detectedAdapter,
      adapterConfidence: input.adapterConfidence,
      phaserDetected: input.phaserDetected,
      totalSurfaces: rows.length,
      appliedCount: rows.filter((row) => row.appliedStatus === "applied").length,
      configOnlyCount: rows.filter((row) => row.appliedStatus === "config_only").length,
      warningCount: rows.reduce((sum, row) => sum + row.warningCount, 0),
      recentWorseOrSameCount: rows.filter((row) => row.lastResult === "worse" || row.lastResult === "same").length,
      assetContractPath: input.assetContracts?.path,
      assetContractStatus: input.assetContracts?.status ?? "missing",
      assetContractStatusCounts: input.assetContracts?.statusCounts ?? emptyAssetContractStatusCounts(),
      assetContractWarningCount: input.assetContracts?.warningCount ?? 0,
      assetContactSheetAvailable: Boolean(input.assetContracts && input.assetContracts.status === "valid" && input.assetContracts.statusCounts.total > 0)
    },
    fieldNotes,
    rows,
    manualChecklist: dashboardManualChecklist()
  };
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
  const scope = toDashboardScopeSummary(checkV05VisualScope(surface.scopeFiles, { throughAdapter: surface.adapter.adapterId === "idle_monster_farm" }), surface);
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
    lastTunedAt: latest?.createdAt,
    lastResult: latest?.resultStatus ?? "none",
    latestNoteSummary: latest ? summarizeLatestNote(latest) : undefined,
    knownGood: treatment.knownGood.map(describeAttempt),
    knownBad: [...treatment.knownBad.map(describeAttempt), ...treatment.noMeaningfulEffect.map((entry) => `${describeAttempt(entry)} had no meaningful effect`)],
    knownMixed: treatment.mixed.map(describeAttempt),
    warningCount,
    fallbackTaskCount: surface.fallbackTaskCount,
    scopeSummary: scope,
    actions: {
      tune: { enabled: true, label: "Tune" },
      openConfig: surface.config.exists
        ? { enabled: true, label: "Open Config" }
        : { enabled: false, label: "Create Config / Open Tuner", reason: "Config is missing; open the tuner to create it safely." },
      directApply: directApplyAction(surface, appliedStatus),
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
  if (surface.adapter.connectedState === "connected" && surface.config.status === "valid" && scope.directApplySafe) {
    return "applied";
  }
  if (surface.config.status === "valid") {
    return "config_only";
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
    "Direct Apply refuses when not connected",
    "Fallback Task generates scoped fallback only when appropriate",
    "Scope Check shows allowed/suspicious/forbidden status without edits",
    "asset contract summary shows missing/valid/malformed status without building contact sheets",
    "Refresh Asset Contracts writes only .game-polish-lab/assets/asset-contracts.json",
    "View Asset Contact Sheet opens a preview-only webview from existing contracts",
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

function toDashboardScopeSummary(scope: V05ScopeGuardResult, surface: DashboardSurfaceInput) {
  const suspiciousFiles = scope.warnings
    .filter((warning) => warning.includes("outside v0.5 visual/config/style scope"))
    .map((warning) => warning.split(" is outside")[0]);
  return {
    ok: scope.ok,
    allowedFiles: scope.allowedFiles,
    suspiciousFiles,
    forbiddenFiles: scope.forbiddenFiles,
    warnings: scope.warnings,
    directApplySafe: scope.ok && surface.adapter.directApplySupported && surface.adapter.connectedState === "connected",
    setupOrFallbackRequired: surface.adapter.connectedState !== "connected" || !scope.ok
  };
}

function directApplyAction(surface: DashboardSurfaceInput, appliedStatus: DashboardAppliedStatus) {
  if (surface.surfaceType === "asset_replacement") {
    return { enabled: false, label: "Direct Apply", reason: "Asset replacement requires choosing an asset in the tuner." };
  }
  if (!surface.adapter.directApplySupported) {
    return { enabled: false, label: "Direct Apply", reason: "This adapter cannot directly apply this surface." };
  }
  if (surface.adapter.connectedState !== "connected") {
    return { enabled: false, label: "Direct Apply", reason: "Adapter is not connected; use setup or fallback first." };
  }
  if (surface.config.status !== "valid") {
    return { enabled: false, label: "Direct Apply", reason: "A valid config is required before direct apply." };
  }
  return { enabled: appliedStatus !== "invalid", label: "Direct Apply" };
}

function fallbackAction(surface: DashboardSurfaceInput, appliedStatus: DashboardAppliedStatus) {
  if (appliedStatus === "applied") {
    return { enabled: false, label: "Generate Fallback Task", reason: "Connected surfaces should use direct apply first." };
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
