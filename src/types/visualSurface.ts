export type VisualSurfaceType = "slot_card" | "background_readability" | "asset_replacement" | "panel" | "reward_toast";
export type VisualSurfaceAdapterTarget = "idle_monster_farm.farm_slots" | "idle_monster_farm.background" | "idle_monster_farm.assets" | "idle_monster_farm.panels" | "idle_monster_farm.reward_toast";

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

export interface PanelStyleValues {
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  headerAccentColor: string;
  headerAccentHeight: number;
  padding: number;
  contentGap: number;
  dividerColor: string;
  dividerOpacity: number;
  dividerThickness: number;
  shadowStrength: number;
  glowStrength: number;
  titleTextSize: number;
  bodyTextSize: number;
  disabledOpacity: number;
}

export interface PanelStyleConfig {
  schemaVersion: 1;
  surfaceType: "panel";
  adapterTarget: "idle_monster_farm.panels";
  presetName: string;
  updatedAt: string;
  values: PanelStyleValues;
}

export interface PanelPreset {
  name: string;
  values: PanelStyleValues;
}

export interface RewardToastStyleValues {
  durationMs: number;
  riseDistance: number;
  startScale: number;
  peakScale: number;
  endScale: number;
  bounceStrength: number;
  fadeInMs: number;
  fadeOutMs: number;
  sparkleCount: number;
  sparkleScale: number;
  textSize: number;
  iconScale: number;
  toastFillColor: string;
  toastFillOpacity: number;
  toastBorderColor: string;
  toastBorderWidth: number;
  cornerRadius: number;
  shadowStrength: number;
  glowStrength: number;
}

export interface RewardToastStyleConfig {
  schemaVersion: 1;
  surfaceType: "reward_toast";
  adapterTarget: "idle_monster_farm.reward_toast";
  presetName: string;
  updatedAt: string;
  values: RewardToastStyleValues;
}

export interface RewardToastPreset {
  name: string;
  values: RewardToastStyleValues;
}
