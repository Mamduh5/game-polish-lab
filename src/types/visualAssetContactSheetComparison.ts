import type { VisualAssetManifestApplySummary, VisualAssetManifestContract } from "./visualAssetManifestDirectApply";
import type {
  AssignedVisualAsset,
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetNormalizationResult,
  VisualAssetValidationResult
} from "./visualAssetPipeline";

export type VisualAssetComparisonEntryRole =
  | "current"
  | "imported_candidate"
  | "normalized_candidate"
  | "assigned"
  | "manifest_applied"
  | "rejected_reference"
  | "other";

export type VisualAssetComparisonUserMark = "pending" | "approved" | "rejected" | "mixed" | "needs_revision";
export type VisualAssetComparisonNextAction =
  | "assign_asset"
  | "use_normalized_asset"
  | "apply_manifest_assignment"
  | "generate_revision_style_guide"
  | "generate_fallback_task"
  | "no_action";
export type VisualAssetComparisonStatus = "ready" | "skipped" | "failed";
export type VisualAssetComparisonPreviewMode =
  | "slot_card"
  | "panel"
  | "button_icon"
  | "hud"
  | "reward_toast"
  | "background_readability"
  | "impact_effect"
  | "asset_only";

export interface VisualAssetComparisonEntry {
  entryId: string;
  role: VisualAssetComparisonEntryRole;
  assetPath?: string;
  candidateId?: string;
  normalizedAssetId?: string;
  assignmentId?: string;
  manifestApplyId?: string;
  label: string;
  validationStatus: VisualAssetValidationResult["status"] | "unknown";
  boundsStatus?: VisualAssetBoundsAnalysisResult["recommendedAction"] | "unknown";
  manifestStatus?: VisualAssetManifestApplySummary["status"] | "none";
  dimensions?: { width: number; height: number };
  transparencyStatus?: "has_alpha" | "no_alpha" | "unknown";
  previewContext: {
    mode: VisualAssetComparisonPreviewMode;
    label: string;
    limitation: string;
  };
  userMark: VisualAssetComparisonUserMark;
  userNote?: string;
  markedAt?: string;
  warnings: string[];
  errors: string[];
}

export interface VisualAssetComparisonDecisionSummary {
  status: VisualAssetComparisonUserMark;
  chosenEntryId?: string;
  rejectedEntryIds: string[];
  mixedEntryIds: string[];
  needsRevisionEntryIds: string[];
  userNotes: string[];
  nextRecommendedSafeAction: VisualAssetComparisonNextAction;
  runtimeApplied: boolean;
  updatedAt?: string;
}

export interface VisualAssetComparisonSet {
  schemaVersion: "visual-asset-contact-sheet-comparison/v1";
  comparisonId: string;
  createdAt: string;
  updatedAt: string;
  status: VisualAssetComparisonStatus;
  workspaceLabel?: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  assetSlotId: string;
  assetSlotLabel: string;
  currentAssetPath?: string;
  importedCandidatePaths: string[];
  normalizedCandidatePaths: string[];
  assignedAssetPath?: string;
  manifestAppliedAssetPath?: string;
  styleGuidePath?: string;
  assetContractSummary?: string;
  validationSummary: VisualAssetValidationResult;
  boundsSummary?: {
    candidateId: string;
    visibleAreaRatio?: number;
    recommendedAction: VisualAssetBoundsAnalysisResult["recommendedAction"];
    warnings: string[];
    errors: string[];
  };
  manifestApplySummary?: VisualAssetManifestApplySummary;
  manifestContractSummary?: Pick<VisualAssetManifestContract, "contractId" | "manifestPath" | "writablePathSafety" | "supportedOperation" | "warnings" | "errors">;
  previewMode: VisualAssetComparisonPreviewMode;
  comparisonEntries: VisualAssetComparisonEntry[];
  userDecisionSummary: VisualAssetComparisonDecisionSummary;
  sourceMetadata: {
    candidate?: ImportedVisualAssetCandidate;
    normalization?: VisualAssetNormalizationResult;
    assignment?: AssignedVisualAsset;
  };
  result?: VisualAssetComparisonResult;
  warnings: string[];
  errors: string[];
}

export interface VisualAssetComparisonResult {
  comparisonId: string;
  chosenEntryId?: string;
  rejectedEntryIds: string[];
  mixedEntryIds: string[];
  userNotes: string[];
  nextRecommendedSafeAction: VisualAssetComparisonNextAction;
  runtimeApplied: boolean;
  filesWritten: string[];
  rollbackSnapshotPaths: string[];
  warnings: string[];
  errors: string[];
}

export interface VisualAssetComparisonSummary {
  comparisonId: string;
  assetSlotId: string;
  assetSlotLabel: string;
  adapterId: string;
  surfaceId: string;
  status: VisualAssetComparisonStatus;
  decisionStatus: VisualAssetComparisonUserMark;
  approvedCount: number;
  rejectedCount: number;
  mixedCount: number;
  needsRevisionCount: number;
  chosenEntryId?: string;
  chosenAssetPath?: string;
  assigned: boolean;
  manifestApplied: boolean;
  runtimeApplied: boolean;
  jsonPath: string;
  htmlPath: string;
  createdAt: string;
  updatedAt: string;
  warnings: string[];
  errors: string[];
}

export interface VisualAssetComparisonIndex {
  schemaVersion: "visual-asset-contact-sheet-comparisons/v1";
  updatedAt?: string;
  comparisons: VisualAssetComparisonSummary[];
}

export interface VisualAssetContactSheetFallbackTask {
  taskId: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  assetSlotId: string;
  assetSlotLabel: string;
  contactSheetComparisonPath: string;
  approvedAssetPath?: string;
  rejectedOrMixedNotes: string[];
  assignmentMetadataPath?: string;
  validationSummary: VisualAssetValidationResult;
  boundsSummary?: VisualAssetComparisonSet["boundsSummary"];
  styleGuidePath?: string;
  manifestContractStatus?: string;
  manifestApplyStatus?: string;
  suspectedOwnerFileScope: string[];
  allowedFiles: string[];
  forbiddenAreas: string[];
  manualVisualTestChecklist: string[];
  directApplyUnsafeReason: string;
  instruction: string;
  createdAt: string;
}
