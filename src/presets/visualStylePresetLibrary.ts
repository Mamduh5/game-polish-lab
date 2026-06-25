import { SlotCardStyleValues, VisualSurfaceType } from "../types/visualSurface";
import {
  VisualPresetDraftApplyResult,
  VisualPresetLibrary,
  VisualPresetSurfaceSupport,
  VisualPresetTag,
  VisualStylePreset,
  VisualStylePresetFamily
} from "../types/visualStylePreset";

export const visualStylePresetFamilies: VisualStylePresetFamily[] = [
  {
    familyId: "cozy_wood",
    name: "Cozy Wood",
    description: "Warm framed cards with readable spacing for cozy idle screens.",
    tags: ["cozy", "readability"]
  },
  {
    familyId: "chunky_pixel",
    name: "Chunky Pixel",
    description: "Hard-edged pixel-card styling with thicker borders and compact rhythm.",
    tags: ["pixel", "arcade", "readability"]
  },
  {
    familyId: "magic_glow",
    name: "Magic Glow",
    description: "Cool fantasy panels with stronger selection and merge feedback.",
    tags: ["magic", "soft"]
  },
  {
    familyId: "clean_mobile",
    name: "Clean Mobile",
    description: "Compact, readable cards tuned for smaller touch screens.",
    tags: ["mobile", "readability"]
  },
  {
    familyId: "dark_arcade",
    name: "Dark Arcade",
    description: "High-contrast arcade cards with vivid borders and snappy state feedback.",
    tags: ["arcade", "high-contrast"]
  },
  {
    familyId: "soft_pastel",
    name: "Soft Pastel",
    description: "Low-pressure pastel cards with lighter empty and locked states.",
    tags: ["soft", "readability"]
  },
  {
    familyId: "premium_idle_ui",
    name: "Premium Idle UI",
    description: "Polished idle-game cards with generous scale, rounded chrome, and premium glow.",
    tags: ["premium", "readability"]
  }
];

const slotCardSurfaceSupport: VisualPresetSurfaceSupport[] = [
  {
    surfaceType: "slot_card",
    adapterIds: ["idle_monster_farm", "generic_phaser"]
  }
];

export const slotCardVisualStylePresets: VisualStylePreset<SlotCardStyleValues>[] = [
  slotCardPreset({
    presetId: "slot_card.cozy_wood",
    familyId: "cozy_wood",
    stylePatch: {
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
    },
    description: "Warm farm-card baseline with sturdy wood tones and moderate state feedback.",
    tags: ["cozy", "readability"],
    legacyNames: ["Cozy Wood"]
  }),
  slotCardPreset({
    presetId: "slot_card.magic_glow",
    familyId: "magic_glow",
    stylePatch: {
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
    },
    description: "Blue fantasy cards with bright selected glow and a stronger merge pulse.",
    tags: ["magic", "soft"],
    legacyNames: ["Magic Glow"]
  }),
  slotCardPreset({
    presetId: "slot_card.chunky_pixel",
    familyId: "chunky_pixel",
    stylePatch: {
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
    },
    description: "Square, chunky slot cards with a thick gold edge and restrained scale.",
    tags: ["pixel", "arcade", "readability"],
    legacyNames: ["Chunky Pixel"]
  }),
  slotCardPreset({
    presetId: "slot_card.clean_mobile",
    familyId: "clean_mobile",
    stylePatch: {
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
    },
    description: "Smaller mobile-first cards with calmer glow and clearer empty slots.",
    tags: ["mobile", "readability"],
    legacyNames: ["Clean Mobile"]
  }),
  slotCardPreset({
    presetId: "slot_card.dark_arcade",
    familyId: "dark_arcade",
    stylePatch: {
      slotWidth: 106,
      slotHeight: 106,
      gap: 9,
      borderWidth: 4,
      cornerRadius: 4,
      fillColor: "#151923",
      borderColor: "#ff3d8f",
      selectedGlowStrength: 0.78,
      lockedOverlayOpacity: 0.72,
      emptySlotOpacity: 0.38,
      mergeCandidatePulseScale: 1.18,
      monsterDisplayScale: 0.88,
      monsterVerticalOffset: -2
    },
    description: "Dark high-contrast cards with neon selection and punchy merge feedback.",
    tags: ["arcade", "high-contrast"]
  }),
  slotCardPreset({
    presetId: "slot_card.soft_pastel",
    familyId: "soft_pastel",
    stylePatch: {
      slotWidth: 102,
      slotHeight: 102,
      gap: 12,
      borderWidth: 2,
      cornerRadius: 16,
      fillColor: "#f3dfe7",
      borderColor: "#8fadc8",
      selectedGlowStrength: 0.42,
      lockedOverlayOpacity: 0.42,
      emptySlotOpacity: 0.68,
      mergeCandidatePulseScale: 1.07,
      monsterDisplayScale: 0.84,
      monsterVerticalOffset: -5
    },
    description: "Soft rounded cards with low-pressure state contrast for gentle UI passes.",
    tags: ["soft", "readability"]
  }),
  slotCardPreset({
    presetId: "slot_card.premium_idle_ui",
    familyId: "premium_idle_ui",
    stylePatch: {
      slotWidth: 116,
      slotHeight: 116,
      gap: 14,
      borderWidth: 3,
      cornerRadius: 18,
      fillColor: "#202833",
      borderColor: "#d6b869",
      selectedGlowStrength: 0.72,
      lockedOverlayOpacity: 0.54,
      emptySlotOpacity: 0.5,
      mergeCandidatePulseScale: 1.12,
      monsterDisplayScale: 0.96,
      monsterVerticalOffset: -7
    },
    description: "Larger premium idle-game cards with gold framing and polished spacing.",
    tags: ["premium", "readability"]
  })
];

export const visualPresetLibrary: VisualPresetLibrary = {
  families: visualStylePresetFamilies,
  presets: [...slotCardVisualStylePresets]
};

export function getVisualStylePresetsForSurface(surfaceType: VisualSurfaceType, adapterId?: string): VisualStylePreset[] {
  if (surfaceType === "asset_replacement") {
    return [];
  }
  return visualPresetLibrary.presets.filter((preset) => preset.supportedSurfaces.some((support) => supportsSurface(support, surfaceType, adapterId)));
}

export function getVisualStylePresetById(presetId: string): VisualStylePreset | undefined {
  return visualPresetLibrary.presets.find((preset) => preset.presetId === presetId);
}

export function getVisualStylePresetByName(name: string, surfaceType?: VisualSurfaceType, adapterId?: string): VisualStylePreset | undefined {
  const candidates = surfaceType ? getVisualStylePresetsForSurface(surfaceType, adapterId) : visualPresetLibrary.presets;
  return candidates.find((preset) => preset.displayName === name || preset.legacyNames?.includes(name));
}

export function applyVisualStylePresetToDraft<TDraft extends object>(input: {
  surfaceType: VisualSurfaceType;
  draftStyle: TDraft;
  presetId?: string;
  presetName?: string;
  adapterId?: string;
}): VisualPresetDraftApplyResult<TDraft> {
  const preset = input.presetId
    ? getVisualStylePresetById(input.presetId)
    : input.presetName
    ? getVisualStylePresetByName(input.presetName, input.surfaceType, input.adapterId)
    : undefined;
  if (!preset || !preset.supportedSurfaces.some((support) => supportsSurface(support, input.surfaceType, input.adapterId))) {
    return {
      applied: false,
      draftStyle: { ...input.draftStyle }
    };
  }
  return {
    applied: true,
    draftStyle: {
      ...input.draftStyle,
      ...preset.stylePatch
    },
    preset
  };
}

function slotCardPreset(input: {
  presetId: string;
  familyId: string;
  stylePatch: SlotCardStyleValues;
  description: string;
  tags?: VisualPresetTag[];
  legacyNames?: string[];
}): VisualStylePreset<SlotCardStyleValues> {
  const family = visualStylePresetFamilies.find((candidate) => candidate.familyId === input.familyId);
  if (!family) {
    throw new Error(`Unknown visual style preset family: ${input.familyId}`);
  }
  return {
    presetId: input.presetId,
    displayName: family.name,
    familyId: family.familyId,
    familyName: family.name,
    supportedSurfaces: slotCardSurfaceSupport,
    stylePatch: input.stylePatch,
    description: input.description,
    tags: input.tags ?? family.tags,
    legacyNames: input.legacyNames
  };
}

function supportsSurface(support: VisualPresetSurfaceSupport, surfaceType: VisualSurfaceType, adapterId?: string): boolean {
  if (surfaceType === "asset_replacement" || support.surfaceType !== surfaceType) {
    return false;
  }
  return !adapterId || !support.adapterIds || support.adapterIds.includes(adapterId);
}
