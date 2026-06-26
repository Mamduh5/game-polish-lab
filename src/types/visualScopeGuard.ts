import { VisualSurfaceType } from "./visualSurface";

export type VisualScopeClassification = "safe" | "suspicious" | "forbidden" | "unknown";
export type VisualScopeOperationType =
  | "visual_config_write"
  | "asset_contract_write"
  | "asset_contact_sheet_read"
  | "direct_apply"
  | "dev_overlay_install"
  | "fallback_task_generation"
  | "rollback_restore"
  | "rollback_fallback_task_generation";
export type VisualScopeRecommendedAction = "allow" | "warn" | "block";

export interface VisualScopeGuardPolicy {
  adapterId?: string;
  surfaceType?: VisualSurfaceType;
  targetId?: string;
  operationType: VisualScopeOperationType;
}

export interface VisualScopeGuardRequest extends VisualScopeGuardPolicy {
  candidatePaths: string[];
}

export interface VisualScopeGuardRule {
  ruleId: string;
  classification: VisualScopeClassification;
  reasonCode: string;
  message: string;
  operationTypes?: VisualScopeOperationType[];
  adapterIds?: string[];
  surfaceTypes?: VisualSurfaceType[];
  matches: string[];
}

export interface VisualScopeViolation {
  path: string;
  classification: VisualScopeClassification;
  reasonCode: string;
  message: string;
  operationType: VisualScopeOperationType;
  adapterId?: string;
  surfaceType?: VisualSurfaceType;
}

export interface VisualScopeClassifiedFile extends VisualScopeViolation {
  normalizedPath: string;
}

export interface VisualScopeClassificationCounts {
  safe: number;
  suspicious: number;
  forbidden: number;
  unknown: number;
  total: number;
}

export interface VisualScopeGuardResult {
  classifiedFiles: VisualScopeClassifiedFile[];
  violations: VisualScopeViolation[];
  counts: VisualScopeClassificationCounts;
  recommendedAction: VisualScopeRecommendedAction;
  summaryMessage: string;
}
