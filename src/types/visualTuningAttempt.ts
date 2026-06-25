import { VisualSurfaceType } from "./visualSurface";

export type VisualTuningResultStatus = "unreviewed" | "better" | "worse" | "same" | "mixed";
export type VisualTuningApplyMode = "direct_apply" | "config_only" | "asset_copy" | "fallback_task" | "preview_only";
export type VisualTuningConnectionState = "connected" | "not_connected" | "unknown" | "not_applicable";

export interface VisualTuningAttempt {
  schemaVersion: "visual-tuning-attempt/v1";
  attemptId: string;
  createdAt: string;
  updatedAt?: string;
  adapterId: "idle_monster_farm" | "generic_phaser" | string;
  surfaceType: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  recipeId?: string;
  configPath?: string;
  generatedStyleModulePath?: string;
  assetPath?: string;
  fallbackTaskPath?: string;
  presetName?: string;
  styleSnapshot?: unknown;
  styleValueSummary?: string;
  changedTokens: string[];
  applyMode: VisualTuningApplyMode;
  connectionState: VisualTuningConnectionState;
  scopeSummary: string;
  rollbackPaths: string[];
  manualChecklist: string[];
  resultStatus: VisualTuningResultStatus;
  resultNotes: string[];
  tags: string[];
  warnings: string[];
}

export interface VisualTuningAttemptIndexEntry {
  attemptId: string;
  createdAt: string;
  updatedAt?: string;
  adapterId: string;
  surfaceType: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  resultStatus: VisualTuningResultStatus;
  presetName?: string;
  recipeId?: string;
  attemptPath: string;
  configPath?: string;
  fallbackTaskPath?: string;
}

export interface VisualTuningAttemptIndex {
  schemaVersion: "visual-tuning-attempt-index/v1";
  updatedAt: string;
  attempts: VisualTuningAttemptIndexEntry[];
}

export interface FieldNoteTreatmentSummary {
  knownGood: VisualTuningAttemptIndexEntry[];
  knownBad: VisualTuningAttemptIndexEntry[];
  noMeaningfulEffect: VisualTuningAttemptIndexEntry[];
  mixed: VisualTuningAttemptIndexEntry[];
  warnings: string[];
  successes: string[];
}
