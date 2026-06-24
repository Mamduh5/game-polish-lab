export type VisualSurfaceType = "slot_card" | "background_readability";
export type VisualSurfaceAdapterTarget = "idle_monster_farm.farm_slots" | "idle_monster_farm.background";

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
