import { VisualSurfaceType } from "./visualSurface";
import { VisualTuningResultStatus } from "./visualTuningAttempt";
import { VisualAssetContractStatusCounts } from "./visualAssetContract";
import { VisualGameAdapterContractSummary } from "./visualGameAdapter";
import { VisualScopeClassificationCounts, VisualScopeRecommendedAction } from "./visualScopeGuard";

export type DashboardAdapterId = "idle_monster_farm" | "generic_phaser" | "sort_puzzle" | "cursor_arena";
export type DashboardAppliedStatus = "applied" | "config_only" | "fallback_ready" | "unapplied" | "unsupported" | "invalid" | "unknown";
export type DashboardConfigStatus = "valid" | "missing" | "invalid_json" | "schema_invalid" | "not_applicable";
export type DashboardRecipeStatus = "valid" | "missing" | "invalid_json" | "schema_invalid" | "not_applicable";
export type DashboardConnectionState = "connected" | "not_connected" | "unknown" | "not_applicable";
export type DashboardLastResultStatus = VisualTuningResultStatus | "none";

export interface DashboardActionState {
  enabled: boolean;
  label: string;
  reason?: string;
}

export interface DashboardScopeSummary {
  ok: boolean;
  allowedFiles: string[];
  suspiciousFiles: string[];
  forbiddenFiles: string[];
  warnings: string[];
  classificationCounts: VisualScopeClassificationCounts;
  recommendedAction: VisualScopeRecommendedAction;
  summaryMessage: string;
  directApplySafe: boolean;
  setupOrFallbackRequired: boolean;
}

export interface DashboardDirectApplyTemplateSummary {
  available: boolean;
  templateId?: string;
  templateName?: string;
  executable: boolean;
  warningCount: number;
  blockCount: number;
  fallbackAvailable: boolean;
  reason?: string;
}

export interface VisualTuningDashboardRow {
  rowId: string;
  surfaceType: VisualSurfaceType;
  displayName: string;
  adapterId: DashboardAdapterId;
  targetId?: string;
  targetLabel: string;
  recipeId?: string;
  appliedStatus: DashboardAppliedStatus;
  configStatus: DashboardConfigStatus;
  configPath?: string;
  recipeStatus: DashboardRecipeStatus;
  recipePath?: string;
  connectedState: DashboardConnectionState;
  generatedStyleModulePath?: string;
  lastTunedAt?: string;
  lastResult: DashboardLastResultStatus;
  latestNoteSummary?: string;
  knownGood: string[];
  knownBad: string[];
  knownMixed: string[];
  warningCount: number;
  fallbackTaskCount: number;
  scopeSummary: DashboardScopeSummary;
  directApplyTemplate: DashboardDirectApplyTemplateSummary;
  actions: {
    tune: DashboardActionState;
    openConfig: DashboardActionState;
    directApply: DashboardActionState;
    exportTheme: DashboardActionState;
    importTheme: DashboardActionState;
    annotateScreenshot: DashboardActionState;
    generateFallbackTask: DashboardActionState;
    runScopeCheck: DashboardActionState;
    markLatestResult: DashboardActionState;
  };
}

export interface VisualTuningProjectSummary {
  workspaceFolder: string;
  detectedAdapter: DashboardAdapterId | "unknown";
  adapterConfidence: "high" | "medium" | "low" | "unknown";
  phaserDetected: boolean;
  totalSurfaces: number;
  appliedCount: number;
  configOnlyCount: number;
  warningCount: number;
  recentWorseOrSameCount: number;
  assetContractPath?: string;
  assetContractStatus: "missing" | "valid" | "malformed";
  assetContractStatusCounts: VisualAssetContractStatusCounts;
  assetContractWarningCount: number;
  assetContactSheetAvailable: boolean;
  devOverlay?: {
    path: string;
    exists: boolean;
    generated: boolean;
    fileCount: number;
    generatedFileCount: number;
    warningCount: number;
  };
  adapterContracts: VisualGameAdapterContractSummary[];
}

export interface VisualTuningFieldNoteSummary {
  knownGood: string[];
  knownBad: string[];
  mixed: string[];
  fieldNotesPath: string;
}

export interface VisualTuningDashboardModel {
  schemaVersion: "visual-tuning-dashboard/v1";
  generatedAt: string;
  summary: VisualTuningProjectSummary;
  fieldNotes: VisualTuningFieldNoteSummary;
  rows: VisualTuningDashboardRow[];
  manualChecklist: string[];
}
