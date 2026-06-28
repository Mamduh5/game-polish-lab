import type { VisualAssetStyleGuideSummary } from "./visualAssetStyleGuide";

export type VisualAssetExpectedType = "image" | "spritesheet" | "icon" | "background" | "effect" | "ui-frame" | "unknown";
export type VisualAssetSafetyStatus = "safe" | "suspicious" | "unsupported" | "unknown";
export type VisualAssetPipelineValidationStatus = "missing" | "valid" | "warning" | "invalid" | "unvalidated";
export type VisualAssetDirectApplyCapability = "config_only" | "asset_copy_only" | "manifest_supported" | "fallback_required" | "unsupported";
export type VisualAssetApprovalStatus = "pending" | "approved" | "rejected";
export type VisualAssetOperationStatus = "ok" | "blocked" | "warning";
export type VisualAssetBoundsRecommendedAction = "none" | "warn" | "normalize" | "reject" | "manual_review";
export type VisualAssetNormalizationStatus = "created" | "skipped" | "failed";

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
  expectedVisibleBoundsMinRatio?: number;
  expectedVisibleBoundsMaxRatio?: number;
  safePadding?: number;
  centerTolerancePct?: number;
  edgeTouchAllowed?: boolean;
  normalizationAllowed?: boolean;
  scaleDownAllowed?: boolean;
  upscaleAllowed?: boolean;
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

export interface VisualAssetVisibleBoundsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualAssetVisibleBoundsPercentRect {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface VisualAssetEdgeTouchFlags {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

export interface VisualAssetCenterOffset {
  x: number;
  y: number;
  xPct: number;
  yPct: number;
}

export interface VisualAssetBoundsAnalysisResult {
  candidateId: string;
  sourceAssetPath: string;
  imageWidth?: number;
  imageHeight?: number;
  visibleBounds?: VisualAssetVisibleBoundsRect;
  normalizedVisibleBounds?: VisualAssetVisibleBoundsPercentRect;
  visibleAreaRatio?: number;
  emptyTransparentImage: boolean;
  touchesCanvasEdge: VisualAssetEdgeTouchFlags;
  centerOffset: VisualAssetCenterOffset;
  expectedTargetCanvasWidth?: number;
  expectedTargetCanvasHeight?: number;
  recommendedAction: VisualAssetBoundsRecommendedAction;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

export interface VisualAssetNormalizationResult {
  normalizedAssetId: string;
  sourceCandidateId: string;
  sourcePath: string;
  outputPath: string;
  targetWidth: number;
  targetHeight: number;
  paddingApplied: { left: number; right: number; top: number; bottom: number };
  scaleApplied: number;
  contentOffsetApplied: { x: number; y: number };
  originalPreserved: boolean;
  validationResult: VisualAssetValidationResult;
  rollbackSnapshotPath?: string;
  status: VisualAssetNormalizationStatus;
  warnings: string[];
  errors: string[];
  createdAt: string;
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
  normalizedAssetPath?: string;
  usesNormalizedAsset?: boolean;
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
  boundsAnalysis?: VisualAssetBoundsAnalysisResult;
  normalization?: VisualAssetNormalizationResult;
  styleGuide?: VisualAssetStyleGuideSummary;
  assignmentAssetPath?: string;
  validation: VisualAssetValidationResult;
  previewMode: "context" | "asset_card";
  runtimeApplied: boolean;
  actions: {
    importAsset: boolean;
    validateAsset: boolean;
    previewInContext: boolean;
    assignReplacement: boolean;
    analyzeBounds: boolean;
    normalizeBounds: boolean;
    openNormalizedAsset: boolean;
    useNormalizedAssetForAssignment: boolean;
    generateStyleGuide: boolean;
    openStyleGuide: boolean;
    copyContactSheetRequest: boolean;
    regenerateStyleGuide: boolean;
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
  boundsResults: VisualAssetBoundsAnalysisResult[];
  normalizationResults: VisualAssetNormalizationResult[];
  styleGuides: VisualAssetStyleGuideSummary[];
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
  normalizedAssetPath?: string;
  boundsAnalysisSummary?: {
    visibleBounds?: VisualAssetVisibleBoundsRect;
    visibleAreaRatio?: number;
    centerOffset?: VisualAssetCenterOffset;
    recommendedAction?: VisualAssetBoundsRecommendedAction;
    warnings: string[];
    errors: string[];
  };
  validation: VisualAssetValidationResult;
  targetConfigPath?: string;
  knownManifestPath?: string;
  ownerFileScope: string[];
  allowedFiles: string[];
  forbiddenAreas: string[];
  instruction: string;
  manualVisualTestChecklist: string[];
  createdAt: string;
}
