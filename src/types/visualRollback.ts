import { VisualSurfaceType } from "./visualSurface";
import { VisualScopeClassifiedFile } from "./visualScopeGuard";

export type VisualRollbackFileKind =
  | "style_config"
  | "visual_recipe"
  | "asset_contract"
  | "asset_backup"
  | "generated_style_module"
  | "unknown";

export type VisualRollbackRestoreStatus = "restored" | "skipped" | "blocked" | "fallback_task";

export interface VisualRollbackSnapshotFile {
  fileId: string;
  originalPath: string;
  snapshotPath: string;
  fileKind: VisualRollbackFileKind;
  scopeClassification: VisualScopeClassifiedFile;
  restoreEligible: boolean;
  warnings: string[];
  errors: string[];
}

export interface VisualRollbackSnapshot {
  id: string;
  createdAt?: string;
  sourceOperation?: string;
  adapterId?: string;
  surfaceType?: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  files: VisualRollbackSnapshotFile[];
  warnings: string[];
  errors: string[];
}

export interface VisualRollbackRestoreRequest {
  snapshotId: string;
  fileIds?: string[];
  confirmSuspicious?: boolean;
  now?: Date;
}

export interface VisualRollbackRestoredFile {
  fileId: string;
  originalPath: string;
  snapshotPath: string;
  status: VisualRollbackRestoreStatus;
  message: string;
  preRestoreBackupPath?: string;
}

export interface VisualRollbackFallbackTask {
  taskId: string;
  snapshotId: string;
  createdAt: string;
  scope: "visual_rollback";
  files: Array<{
    originalPath: string;
    snapshotPath: string;
    classification: string;
    reasonCode: string;
    message: string;
  }>;
  blockedReasons: string[];
  instructions: string[];
}

export interface VisualRollbackRestoreResult {
  snapshotId: string;
  status: VisualRollbackRestoreStatus;
  restoredFiles: VisualRollbackRestoredFile[];
  skippedFiles: VisualRollbackRestoredFile[];
  blockedFiles: VisualRollbackRestoredFile[];
  fallbackTask?: VisualRollbackFallbackTask;
  fallbackTaskPath?: string;
  warnings: string[];
  errors: string[];
}

export interface VisualRollbackDiscoveryResult {
  snapshots: VisualRollbackSnapshot[];
  warnings: string[];
}
