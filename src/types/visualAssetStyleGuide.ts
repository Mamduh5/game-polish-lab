import {
  VisualAssetBoundsAnalysisResult,
  VisualAssetDimensions,
  VisualAssetExpectedType
} from "./visualAssetPipeline";

export interface VisualAssetStyleGuideVisibleBoundsRules {
  required?: boolean;
  minVisibleAreaRatio?: number;
  maxVisibleAreaRatio?: number;
  safePadding?: number;
  centerTolerancePct?: number;
  edgeTouchAllowed?: boolean;
  summary: string;
}

export interface VisualAssetStyleGuideScaleGuidance {
  normalizationAllowed?: boolean;
  scaleDownAllowed?: boolean;
  upscaleAllowed?: boolean;
  summary: string;
}

export interface VisualAssetStyleGuideContactSheetRequest {
  variantCount: number;
  canvasSize: string;
  transparentBackground: boolean;
  consistentViewpointAndScale: boolean;
  safePaddingRequirement: string;
  readabilityRequirement: string;
  surfaceContext: string;
  variantLabels: string[];
  textPolicy: string;
  exportFormat: string;
  namingConvention: string;
  validationChecklist: string[];
}

export interface VisualAssetStyleGuide {
  guideId: string;
  createdAt: string;
  workspaceLabel?: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  assetSlotId: string;
  assetSlotLabel: string;
  expectedAssetType: VisualAssetExpectedType;
  targetCanvas?: VisualAssetDimensions;
  allowedFileExtensions: string[];
  transparencyRequirement: "required" | "optional" | "forbidden" | "unknown";
  safePadding?: number;
  visibleBoundsRules: VisualAssetStyleGuideVisibleBoundsRules;
  centerTolerancePct?: number;
  edgeTouchAllowed?: boolean;
  scaleGuidance: VisualAssetStyleGuideScaleGuidance;
  currentAssetPath?: string;
  importedAssetPath?: string;
  normalizedAssetPath?: string;
  validationWarnings: string[];
  boundsSummary?: Pick<VisualAssetBoundsAnalysisResult, "visibleBounds" | "visibleAreaRatio" | "centerOffset" | "recommendedAction" | "warnings" | "errors">;
  styleDirectionNotes: string[];
  readabilityNotes: string[];
  gameSurfaceContextNotes: string[];
  forbiddenChanges: string[];
  contactSheetRequest: VisualAssetStyleGuideContactSheetRequest;
  validationChecklist: string[];
  outputFiles: string[];
  warnings: string[];
}

export interface VisualAssetStyleGuideSummary {
  guideId: string;
  assetSlotId: string;
  assetSlotLabel: string;
  adapterId: string;
  surfaceId: string;
  markdownPath: string;
  jsonPath: string;
  createdAt: string;
  warnings: string[];
}

export interface VisualAssetStyleGuideIndex {
  schemaVersion: "visual-asset-style-guides/v1";
  updatedAt?: string;
  guides: VisualAssetStyleGuideSummary[];
}

export interface VisualAssetStyleGuideWriteResult {
  guide: VisualAssetStyleGuide;
  markdownPath: string;
  jsonPath: string;
  indexPath: string;
  contactSheetRequestText: string;
}

export interface VisualAssetStyleGuideFallbackTask {
  taskId: string;
  adapterId: string;
  adapterLabel: string;
  surfaceId: string;
  surfaceLabel: string;
  assetSlotId: string;
  assetSlotLabel: string;
  styleGuidePath: string;
  contactSheetRequestText: string;
  assetContractSummary: string;
  validationAndBoundsWarnings: string[];
  allowedFiles: string[];
  forbiddenAreas: string[];
  instruction: string;
  manualReviewChecklist: string[];
  createdAt: string;
}
