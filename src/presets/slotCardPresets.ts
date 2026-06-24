import { SlotCardPreset, SlotCardStyleValues } from "../types/visualSurface";

export const slotCardStyleBounds: Record<keyof Omit<SlotCardStyleValues, "fillColor" | "borderColor">, { min: number; max: number; step: number }> = {
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

export const defaultSlotCardStyle: SlotCardStyleValues = {
  slotWidth: 108,
  slotHeight: 108,
  gap: 12,
  borderWidth: 3,
  cornerRadius: 10,
  fillColor: "#3f2a19",
  borderColor: "#8f6438",
  selectedGlowStrength: 0.4,
  lockedOverlayOpacity: 0.58,
  emptySlotOpacity: 0.52,
  mergeCandidatePulseScale: 1.08,
  monsterDisplayScale: 0.9,
  monsterVerticalOffset: -4
};

export const slotCardPresets: SlotCardPreset[] = [
  {
    name: "Cozy Wood",
    values: defaultSlotCardStyle
  },
  {
    name: "Magic Glow",
    values: {
      slotWidth: 110,
      slotHeight: 110,
      gap: 14,
      borderWidth: 3,
      cornerRadius: 14,
      fillColor: "#24364b",
      borderColor: "#86d7ff",
      selectedGlowStrength: 0.86,
      lockedOverlayOpacity: 0.5,
      emptySlotOpacity: 0.46,
      mergeCandidatePulseScale: 1.16,
      monsterDisplayScale: 0.94,
      monsterVerticalOffset: -6
    }
  },
  {
    name: "Chunky Pixel",
    values: {
      slotWidth: 104,
      slotHeight: 104,
      gap: 10,
      borderWidth: 5,
      cornerRadius: 2,
      fillColor: "#252525",
      borderColor: "#f1c15d",
      selectedGlowStrength: 0.58,
      lockedOverlayOpacity: 0.66,
      emptySlotOpacity: 0.42,
      mergeCandidatePulseScale: 1.1,
      monsterDisplayScale: 0.86,
      monsterVerticalOffset: 0
    }
  },
  {
    name: "Clean Mobile",
    values: {
      slotWidth: 96,
      slotHeight: 96,
      gap: 8,
      borderWidth: 2,
      cornerRadius: 8,
      fillColor: "#263238",
      borderColor: "#d8e1e8",
      selectedGlowStrength: 0.34,
      lockedOverlayOpacity: 0.48,
      emptySlotOpacity: 0.6,
      mergeCandidatePulseScale: 1.06,
      monsterDisplayScale: 0.82,
      monsterVerticalOffset: -3
    }
  }
];
