import { SlotCardPreset, SlotCardStyleValues } from "../types/visualSurface";
import { slotCardVisualStylePresets } from "./visualStylePresetLibrary";

export const slotCardStyleBounds: Record<keyof Omit<SlotCardStyleValues, "fillColor" | "innerFillColor" | "borderColor">, { min: number; max: number; step: number }> = {
  slotWidth: { min: 64, max: 180, step: 1 },
  slotHeight: { min: 64, max: 180, step: 1 },
  gap: { min: 2, max: 32, step: 1 },
  borderWidth: { min: 0, max: 10, step: 1 },
  cornerRadius: { min: 0, max: 28, step: 1 },
  selectedGlowStrength: { min: 0, max: 1, step: 0.01 },
  lockedOverlayOpacity: { min: 0, max: 1, step: 0.01 },
  emptySlotOpacity: { min: 0.15, max: 1, step: 0.01 },
  mergeCandidatePulseScale: { min: 1, max: 1.28, step: 0.01 },
  monsterDisplayScale: { min: 0.55, max: 1.35, step: 0.01 },
  monsterVerticalOffset: { min: -28, max: 28, step: 1 }
};

export const defaultSlotCardStyle: SlotCardStyleValues = slotCardVisualStylePresets[0].stylePatch;

export const slotCardPresets: SlotCardPreset[] = slotCardVisualStylePresets.map((preset) => ({
  name: preset.displayName,
  values: preset.stylePatch
}));
