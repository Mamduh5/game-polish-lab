import { VisualSurfaceType } from "./visualSurface";
import { VisualScopeGuardPolicy, VisualScopeGuardResult } from "./visualScopeGuard";

export type VisualDirectApplyOperationType =
  | "read_style_config"
  | "write_style_config"
  | "write_visual_recipe"
  | "update_generated_style_module"
  | "update_asset_manifest"
  | "assign_visual_asset"
  | "verify_runtime_bridge"
  | "install_runtime_bridge"
  | "create_rollback_snapshot"
  | "run_scope_guard"
  | "generate_fallback_task"
  | "manual_check";

export type VisualDirectApplyIntent = "style_config_direct_apply" | "dashboard_direct_apply" | "fallback_task";
export type VisualDirectApplyAdapterId = "idle_monster_farm" | "generic_phaser" | "sort_puzzle" | "cursor_arena";

export interface VisualDirectApplyManualCheck {
  checkId: string;
  label: string;
  description: string;
}

export interface VisualDirectApplyFallbackTemplate {
  templateId: string;
  displayName: string;
  adapterId: VisualDirectApplyAdapterId;
  supportedSurfaceType?: VisualSurfaceType;
  instructions: string[];
}

export interface VisualDirectApplyTemplate {
  templateId: string;
  displayName: string;
  adapterId: VisualDirectApplyAdapterId;
  supportedSurfaceType: VisualSurfaceType;
  supportedTargetIds?: string[];
  targetIdPattern?: string;
  supportedOperationTypes: VisualDirectApplyOperationType[];
  candidateFilePaths: string[];
  requiredStyleConfigPaths: string[];
  rollbackRequired: boolean;
  scopeGuardPolicy: VisualScopeGuardPolicy;
  manualChecks: VisualDirectApplyManualCheck[];
  fallbackTemplate?: VisualDirectApplyFallbackTemplate;
  executable: boolean;
}

export interface VisualDirectApplyTemplateRegistry {
  templates: VisualDirectApplyTemplate[];
  fallbackTemplates: VisualDirectApplyFallbackTemplate[];
}

export interface VisualDirectApplyStep {
  stepId: string;
  order: number;
  operationType: VisualDirectApplyOperationType;
  description: string;
  paths: string[];
  executable: boolean;
}

export interface VisualDirectApplyPlan {
  planId: string;
  templateId?: string;
  templateName?: string;
  adapterId: VisualDirectApplyAdapterId;
  surfaceType: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  intent: VisualDirectApplyIntent;
  steps: VisualDirectApplyStep[];
  readPaths: string[];
  writePaths: string[];
  rollbackRequired: boolean;
  scopeGuardResult: VisualScopeGuardResult;
  manualChecks: VisualDirectApplyManualCheck[];
  executable: boolean;
  fallbackAvailable: boolean;
  fallbackTemplate?: VisualDirectApplyFallbackTemplate;
  warnings: string[];
  blockingReasons: string[];
}

export interface VisualDirectApplyWrite {
  relativePath: string;
  text: string;
}

export interface VisualDirectApplyExecutedStep {
  stepId: string;
  operationType: VisualDirectApplyOperationType;
  paths: string[];
  status: "completed" | "skipped" | "blocked";
  message: string;
}

export interface VisualDirectApplyResult {
  ok: boolean;
  planId: string;
  templateId?: string;
  templateName?: string;
  changedFiles: string[];
  rollbackPaths: string[];
  executedSteps: VisualDirectApplyExecutedStep[];
  manualChecks: VisualDirectApplyManualCheck[];
  warnings: string[];
  errors: string[];
  fallbackTask?: {
    templateId: string;
    adapterId: VisualDirectApplyAdapterId;
    surfaceType: VisualSurfaceType;
    targetId?: string;
    targetLabel?: string;
    reasons: string[];
    suspiciousFiles: string[];
    forbiddenFiles: string[];
    instructions: string[];
  };
}
