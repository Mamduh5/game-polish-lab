import { VisualSurfaceType } from "./visualSurface";

export type VisualAssetValidationStatus = "missing" | "valid" | "warning" | "invalid" | "unknown";
export type VisualAssetLoaderHint = "manifest" | "style_config" | "runtime_bridge" | "manual_required" | "unknown";
export type VisualAssetTransparencyRequirement = "required" | "optional" | "forbidden" | "unknown";
export type VisualAssetFormat = "PNG" | "WebP" | "unknown";

export interface VisualAssetValidationSummary {
  status: VisualAssetValidationStatus;
  warnings: string[];
  errors: string[];
  lastCheckedAt?: string;
}

export interface VisualAssetSlotContract {
  assetSlotId: string;
  label?: string;
  expectedPath?: string;
  expectedGlob?: string;
  expectedWidth?: number;
  expectedHeight?: number;
  expectedVisibleBoundsMinRatio?: number;
  expectedVisibleBoundsMaxRatio?: number;
  safePadding?: number;
  centerTolerancePct?: number;
  edgeTouchAllowed?: boolean;
  normalizationAllowed?: boolean;
  scaleDownAllowed?: boolean;
  upscaleAllowed?: boolean;
  expectedFormat?: VisualAssetFormat;
  expectedFormats?: VisualAssetFormat[];
  transparencyRequirement: VisualAssetTransparencyRequirement;
  visibleBoundsRequired?: boolean;
  loaderHint: VisualAssetLoaderHint;
  validation: VisualAssetValidationSummary;
  [futureField: string]: unknown;
}

export interface VisualAssetContract {
  contractId: string;
  projectId?: string;
  adapterId?: string;
  targetSurfaceType: VisualSurfaceType;
  targetId: string;
  targetLabel?: string;
  slots: VisualAssetSlotContract[];
  [futureField: string]: unknown;
}

export interface VisualAssetContractFile {
  schemaVersion: 1;
  generatedBy: "game-polish-lab";
  contracts: VisualAssetContract[];
  updatedAt?: string;
  [futureField: string]: unknown;
}

export interface VisualAssetContractStatusCounts {
  valid: number;
  warning: number;
  invalid: number;
  missing: number;
  unknown: number;
  total: number;
}
