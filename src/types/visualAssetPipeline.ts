export type VisualAssetExpectedType = "image" | "spritesheet" | "icon" | "background" | "effect" | "ui-frame" | "unknown";
export type VisualAssetSafetyStatus = "safe" | "suspicious" | "unsupported" | "unknown";
export type VisualAssetPipelineValidationStatus = "missing" | "valid" | "warning" | "invalid" | "unvalidated";
export type VisualAssetDirectApplyCapability = "config_only" | "asset_copy_only" | "manifest_supported" | "fallback_required" | "unsupported";
export type VisualAssetApprovalStatus = "pending" | "approved" | "rejected";
export type VisualAssetOperationStatus = "ok" | "blocked" | "warning";

export interface VisualAssetDimensions {
  width: number;
  height: number;
}

export interface VisualAssetValidationResult {
  status: VisualAssetPipelineValidationStatus;
  warnings: string[];
  errors: string[];
  checkedAt?: string;
}

export interface VisualAssetSlot {
  slotId: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  slotLabel: string;
  expectedAssetType: VisualAssetExpectedType;
  expectedFileExtensions: string[];
  expectedDimensions?: VisualAssetDimensions;
  transparencyRequired?: boolean;
  currentAssetPath?: string;
  generatedAssetPath?: string;
  targetConfigPath?: string;
  knownManifestPath?: string;
  ownerSourceFileHints: string[];
  safetyStatus: VisualAssetSafetyStatus;
  validationStatus: VisualAssetPipelineValidationStatus;
  directApplyCapability: VisualAssetDirectApplyCapability;
  notes?: string[];
}

export interface ImportedVisualAssetCandidate {
  candidateId: string;
  originalPath: string;
  copiedAssetPath: string;
  targetSlotId?: string;
  fileType: string;
  dimensions?: VisualAssetDimensions;
  fileSizeBytes: number;
  hasAlpha?: boolean;
  validationWarnings: string[];
  validationErrors: string[];
  approvalStatus: VisualAssetApprovalStatus;
  notes?: string[];
  importedAt: string;
}

export interface AssignedVisualAsset {
  assignmentId: string;
  slotId: string;
  candidateId: string;
  adapterId: string;
  surfaceId: string;
  copiedAssetPath: string;
  assignmentPath: string;
  targetConfigPath?: string;
  knownManifestPath?: string;
  runtimeApplied: boolean;
  fallbackRequired: boolean;
  validation: VisualAssetValidationResult;
  assignedAt: string;
  rollbackSnapshotPath?: string;
  notes: string[];
}

export interface VisualAssetDashboardRow {
  rowId: string;
  slot: VisualAssetSlot;
  candidate?: ImportedVisualAssetCandidate;
  assignment?: AssignedVisualAsset;
  validation: VisualAssetValidationResult;
  previewMode: "context" | "asset_card";
  runtimeApplied: boolean;
  actions: {
    importAsset: boolean;
    validateAsset: boolean;
    previewInContext: boolean;
    assignReplacement: boolean;
    openAssetContract: boolean;
    generateFallbackTask: boolean;
    runScopeCheck: boolean;
  };
}

export interface VisualAssetDashboardModel {
  schemaVersion: "visual-asset-pipeline-dashboard/v1";
  activeAdapter: string;
  activeAdapterLabel: string;
  slots: VisualAssetSlot[];
  candidates: ImportedVisualAssetCandidate[];
  assignments: AssignedVisualAsset[];
  rows: VisualAssetDashboardRow[];
  groupedSurfaceIds: string[];
  statusCounts: Record<VisualAssetPipelineValidationStatus, number>;
  warnings: string[];
  updatedAt: string;
}

export interface VisualAssetOperationResult {
  status: VisualAssetOperationStatus;
  message: string;
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  errors: string[];
}

export interface VisualAssetFallbackTask {
  taskId: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  slotId: string;
  slotLabel: string;
  importedAssetPath?: string;
  validation: VisualAssetValidationResult;
  targetConfigPath?: string;
  knownManifestPath?: string;
  ownerFileScope: string[];
  allowedFiles: string[];
  forbiddenAreas: string[];
  instruction: "wire this approved imported asset into this selected visual asset slot only.";
  manualVisualTestChecklist: string[];
  createdAt: string;
}
