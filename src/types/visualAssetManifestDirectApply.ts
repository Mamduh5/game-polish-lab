import type { VisualScopeGuardResult } from "./visualScopeGuard";
import type { VisualAssetValidationResult } from "./visualAssetPipeline";

export type VisualAssetManifestType =
  | "json_manifest"
  | "generated_style_config"
  | "adapter_asset_config"
  | "static_asset_map"
  | "unknown";

export type VisualAssetManifestPathSafety = "safe" | "suspicious" | "blocked" | "unsupported";
export type VisualAssetManifestOperation =
  | "set_asset_path"
  | "replace_manifest_entry"
  | "add_manifest_entry"
  | "update_generated_config_reference"
  | "unsupported";
export type VisualAssetManifestRelativePathMode =
  | "workspace_relative"
  | "public_relative"
  | "asset_relative"
  | "absolute_disallowed";
export type VisualAssetManifestApplyStatus = "applied" | "skipped" | "failed" | "fallback_required";

export interface VisualAssetManifestContract {
  contractId: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  assetSlotId: string;
  manifestPath?: string;
  manifestType: VisualAssetManifestType;
  writablePathSafety: VisualAssetManifestPathSafety;
  supportedOperation: VisualAssetManifestOperation;
  manifestKey?: string;
  currentValue?: string;
  replacementAssetPath?: string;
  expectedRelativePathMode: VisualAssetManifestRelativePathMode;
  validationRequirements: string[];
  rollbackRequired: boolean;
  manualTestChecklist: string[];
  warnings: string[];
  errors: string[];
}

export interface VisualAssetManifestDirectApplyResult {
  operationId: string;
  assignmentId?: string;
  slotId: string;
  candidateId?: string;
  normalizedAssetId?: string;
  manifestContractId: string;
  targetManifestPath?: string;
  previousValue?: string;
  newValue?: string;
  filesWritten: string[];
  rollbackSnapshotPaths: string[];
  scopeGuardResult: VisualScopeGuardResult;
  status: VisualAssetManifestApplyStatus;
  runtimeApplied: boolean;
  warnings: string[];
  errors: string[];
  createdAt: string;
}

export interface VisualAssetManifestApplySummary {
  operationId: string;
  slotId: string;
  manifestContractId: string;
  targetManifestPath?: string;
  status: VisualAssetManifestApplyStatus;
  runtimeApplied: boolean;
  filesWritten: string[];
  rollbackSnapshotPaths: string[];
  createdAt: string;
  warnings: string[];
  errors: string[];
}

export interface VisualAssetManifestApplyIndex {
  schemaVersion: "visual-asset-manifest-applies/v1";
  updatedAt?: string;
  results: VisualAssetManifestApplySummary[];
}

export interface VisualAssetManifestLoaderFallbackTask {
  taskId: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  assetSlotId: string;
  assetSlotLabel: string;
  approvedAssetPath?: string;
  assignmentMetadataPath?: string;
  validation: VisualAssetValidationResult;
  boundsSummary?: {
    visibleAreaRatio?: number;
    recommendedAction?: string;
    warnings: string[];
    errors: string[];
  };
  styleGuidePath?: string;
  suspectedOwnerFileScope: string[];
  allowedFiles: string[];
  forbiddenAreas: string[];
  manualVisualTestChecklist: string[];
  directApplyUnsafeReason: string;
  instruction: string;
  createdAt: string;
}
