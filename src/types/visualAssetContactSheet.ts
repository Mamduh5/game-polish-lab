import { VisualSurfaceType } from "./visualSurface";
import { VisualAssetFormat, VisualAssetValidationStatus } from "./visualAssetContract";

export type VisualAssetMockupContextType = "raw_asset" | "slot_card" | "panel" | "reward_icon";
export type VisualAssetContactSheetState = "ready" | "empty" | "error";

export interface VisualAssetMockupContext {
  type: VisualAssetMockupContextType;
  label: string;
  expectedDisplayWidth?: number;
  expectedDisplayHeight?: number;
}

export interface VisualAssetContactSheetItem {
  itemId: string;
  contractId: string;
  adapterId?: string;
  targetSurfaceType: VisualSurfaceType;
  targetId: string;
  targetLabel?: string;
  assetSlotId: string;
  assetPath?: string;
  assetGlob?: string;
  assetExists: boolean;
  validationStatus: VisualAssetValidationStatus;
  expectedWidth?: number;
  expectedHeight?: number;
  actualWidth?: number;
  actualHeight?: number;
  format?: VisualAssetFormat;
  transparencyStatus: "has_alpha" | "no_alpha" | "unknown";
  warnings: string[];
  errors: string[];
  previewLabel: string;
  mockupContexts: VisualAssetMockupContext[];
}

export interface VisualAssetContactSheetGroup {
  groupId: string;
  contractId: string;
  adapterId?: string;
  targetSurfaceType: VisualSurfaceType;
  targetId: string;
  targetLabel?: string;
  items: VisualAssetContactSheetItem[];
}

export interface VisualAssetContactSheetRenderOptions {
  includeRawAssetPreview: boolean;
  includeMockupPreview: boolean;
  maxPreviewSize: number;
}

export interface VisualAssetContactSheet {
  schemaVersion: "visual-asset-contact-sheet/v1";
  generatedAt: string;
  state: VisualAssetContactSheetState;
  sourceContractPath: string;
  sourceStatus: "missing" | "valid" | "malformed";
  warnings: string[];
  groups: VisualAssetContactSheetGroup[];
  renderOptions: VisualAssetContactSheetRenderOptions;
}
