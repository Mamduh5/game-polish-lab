export type VisualSurfaceType = "slot_card";
export type VisualSurfaceAdapterTarget = "idle_monster_farm.farm_slots";

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
  surfaceType: VisualSurfaceType;
  adapterTarget: VisualSurfaceAdapterTarget;
  presetName: string;
  updatedAt: string;
  values: SlotCardStyleValues;
}

export interface SlotCardPreset {
  name: string;
  values: SlotCardStyleValues;
}
