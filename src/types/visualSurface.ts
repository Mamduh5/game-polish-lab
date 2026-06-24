export type VisualSurfaceType = "slot_card" | "background_readability" | "asset_replacement";
export type VisualSurfaceAdapterTarget = "idle_monster_farm.farm_slots" | "idle_monster_farm.background" | "idle_monster_farm.assets";

export interface SlotCardStyleValues {
  slotWidth: number;
  slotHeight: number;
  gap: number;
  borderWidth: number;
  cornerRadius: number;
  fillColor: string;
  borderColor: string;
  selectedGlowStrength: number;
  lockedOverlayOpacity: number;
  emptySlotOpacity: number;
  mergeCandidatePulseScale: number;
  monsterDisplayScale: number;
  monsterVerticalOffset: number;
}

export interface SlotCardStyleConfig {
  schemaVersion: 1;
  surfaceType: "slot_card";
  adapterTarget: "idle_monster_farm.farm_slots";
  presetName: string;
  updatedAt: string;
  values: SlotCardStyleValues;
}

export interface SlotCardPreset {
  name: string;
  values: SlotCardStyleValues;
}

export interface BackgroundReadabilityStyleValues {
  backgroundColor: string;
  backgroundImageOpacity: number;
  contrastOverlayColor: string;
  contrastOverlayOpacity: number;
  vignetteStrength: number;
  patternOpacity: number;
  blurAmount: number;
  brightness: number;
  contrast: number;
}

export interface BackgroundReadabilityStyleConfig {
  schemaVersion: 1;
  surfaceType: "background_readability";
  adapterTarget: "idle_monster_farm.background";
  presetName: string;
  updatedAt: string;
  values: BackgroundReadabilityStyleValues;
}

export interface BackgroundReadabilityPreset {
  name: string;
  values: BackgroundReadabilityStyleValues;
}

export type AssetReplacementTargetId = "monster_art" | "slot_frame" | "background_image" | "reward_icon";
export type AssetReplacementAssignmentMode = "manifest" | "style_config" | "runtime_bridge" | "manual_required";
export type AcceptedAssetFileType = "image/png" | "image/webp";

export interface AssetReplacementModel {
  assetTargetId: AssetReplacementTargetId;
  surfaceType: "asset_replacement";
  adapterId: "idle_monster_farm.assets";
  expectedKinds: string[];
  acceptedFileTypes: AcceptedAssetFileType[];
  expectedWidth?: number;
  expectedHeight?: number;
  transparencyRequired: boolean;
  destinationPath: string;
  assignmentMode: AssetReplacementAssignmentMode;
  validationWarnings: string[];
  validationErrors: string[];
}

export interface AssetReplacementTarget {
  targetId: AssetReplacementTargetId;
  label: string;
  surfaceType: "asset_replacement";
  expectedKinds: string[];
  acceptedFileTypes: AcceptedAssetFileType[];
  expectedWidth?: number;
  expectedHeight?: number;
  transparencyRequired: boolean;
  destinationFolder: string;
  assignmentMode: AssetReplacementAssignmentMode;
  directApplySupported: boolean;
  warnings: string[];
}
