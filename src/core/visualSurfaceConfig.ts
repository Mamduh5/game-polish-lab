import * as path from "path";

import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { defaultSlotCardStyle, slotCardStyleBounds, slotCardPresets } from "../presets/slotCardPresets";
import { BackgroundReadabilityStyleConfig, BackgroundReadabilityStyleValues, SlotCardStyleConfig, SlotCardStyleValues } from "../types/visualSurface";

export type StyleConfigLoadStatus = "valid" | "missing" | "invalid_json" | "schema_invalid";

export interface StyleConfigLoadResult {
  status: StyleConfigLoadStatus;
  config: SlotCardStyleConfig;
  existingConfigDetected: boolean;
  initializedFromExistingConfig: boolean;
  warning?: string;
}

export const farmSlotStyleConfigRelativePath = ".game-polish-lab/styles/farm-slot-style.json";
export const backgroundReadabilityStyleConfigRelativePath = ".game-polish-lab/styles/background-readability-style.json";

export function loadSlotCardStyleConfigFromText(text: string | undefined): StyleConfigLoadResult {
  if (text === undefined) {
    return {
      status: "missing",
      config: buildSlotCardStyleConfig(slotCardPresets[0].name, slotCardPresets[0].values),
      existingConfigDetected: false,
      initializedFromExistingConfig: false
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidConfigResult("Existing farm slot style config is invalid JSON. The editor was reset to the default v0.5 preset.");
  }

  if (!isSlotCardStyleConfigShape(parsed)) {
    return invalidConfigResult("Existing farm slot style config has an unsupported schema. The editor was reset to the default v0.5 preset.");
  }

  return {
    status: "valid",
    config: {
      ...parsed,
      values: normalizeSlotCardStyleValues(parsed.values)
    },
    existingConfigDetected: true,
    initializedFromExistingConfig: true
  };
}

export function buildSlotCardStyleConfig(presetName: string, values: SlotCardStyleValues): SlotCardStyleConfig {
  return {
    schemaVersion: 1,
    surfaceType: "slot_card",
    adapterTarget: "idle_monster_farm.farm_slots",
    presetName,
    updatedAt: new Date().toISOString(),
    values: normalizeSlotCardStyleValues(values)
  };
}

export function loadBackgroundReadabilityStyleConfigFromText(text: string | undefined): BackgroundStyleConfigLoadResult {
  if (text === undefined) {
    return {
      status: "missing",
      config: buildBackgroundReadabilityStyleConfig(backgroundReadabilityPresets[0].name, backgroundReadabilityPresets[0].values),
      existingConfigDetected: false,
      initializedFromExistingConfig: false
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidBackgroundConfigResult("Existing background readability config is invalid JSON. The editor was reset to the default v0.52 preset.");
  }

  if (!isBackgroundReadabilityStyleConfigShape(parsed)) {
    return invalidBackgroundConfigResult("Existing background readability config has an unsupported schema. The editor was reset to the default v0.52 preset.");
  }

  return {
    status: "valid",
    config: {
      ...parsed,
      values: normalizeBackgroundReadabilityStyleValues(parsed.values)
    },
    existingConfigDetected: true,
    initializedFromExistingConfig: true
  };
}

export interface BackgroundStyleConfigLoadResult {
  status: StyleConfigLoadStatus;
  config: BackgroundReadabilityStyleConfig;
  existingConfigDetected: boolean;
  initializedFromExistingConfig: boolean;
  warning?: string;
}

export function buildBackgroundReadabilityStyleConfig(presetName: string, values: BackgroundReadabilityStyleValues): BackgroundReadabilityStyleConfig {
  return {
    schemaVersion: 1,
    surfaceType: "background_readability",
    adapterTarget: "idle_monster_farm.background",
    presetName,
    updatedAt: new Date().toISOString(),
    values: normalizeBackgroundReadabilityStyleValues(values)
  };
}

export function normalizeSlotCardStyleValues(values: SlotCardStyleValues): SlotCardStyleValues {
  return {
    slotWidth: clampNumber(values.slotWidth, "slotWidth"),
    slotHeight: clampNumber(values.slotHeight, "slotHeight"),
    gap: clampNumber(values.gap, "gap"),
    borderWidth: clampNumber(values.borderWidth, "borderWidth"),
    cornerRadius: clampNumber(values.cornerRadius, "cornerRadius"),
    fillColor: normalizeColor(values.fillColor, defaultSlotCardStyle.fillColor),
    borderColor: normalizeColor(values.borderColor, defaultSlotCardStyle.borderColor),
    selectedGlowStrength: clampNumber(values.selectedGlowStrength, "selectedGlowStrength"),
    lockedOverlayOpacity: clampNumber(values.lockedOverlayOpacity, "lockedOverlayOpacity"),
    emptySlotOpacity: clampNumber(values.emptySlotOpacity, "emptySlotOpacity"),
    mergeCandidatePulseScale: clampNumber(values.mergeCandidatePulseScale, "mergeCandidatePulseScale"),
    monsterDisplayScale: clampNumber(values.monsterDisplayScale, "monsterDisplayScale"),
    monsterVerticalOffset: clampNumber(values.monsterVerticalOffset, "monsterVerticalOffset")
  };
}

export function normalizeBackgroundReadabilityStyleValues(values: BackgroundReadabilityStyleValues): BackgroundReadabilityStyleValues {
  return {
    backgroundColor: normalizeColor(values.backgroundColor, defaultBackgroundReadabilityStyle.backgroundColor),
    backgroundImageOpacity: clampBackgroundNumber(values.backgroundImageOpacity, "backgroundImageOpacity"),
    contrastOverlayColor: normalizeColor(values.contrastOverlayColor, defaultBackgroundReadabilityStyle.contrastOverlayColor),
    contrastOverlayOpacity: clampBackgroundNumber(values.contrastOverlayOpacity, "contrastOverlayOpacity"),
    vignetteStrength: clampBackgroundNumber(values.vignetteStrength, "vignetteStrength"),
    patternOpacity: clampBackgroundNumber(values.patternOpacity, "patternOpacity"),
    blurAmount: clampBackgroundNumber(values.blurAmount, "blurAmount"),
    brightness: clampBackgroundNumber(values.brightness, "brightness"),
    contrast: clampBackgroundNumber(values.contrast, "contrast")
  };
}

export function buildRollbackSnapshotName(date: Date, affectedRelativePath: string): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  const basename = path.basename(affectedRelativePath).replace(/[^a-zA-Z0-9._-]/g, "-") || "snapshot.txt";
  return `${timestamp}-${basename}`;
}

function invalidConfigResult(warning: string): StyleConfigLoadResult {
  return {
    status: warning.includes("invalid JSON") ? "invalid_json" : "schema_invalid",
    config: buildSlotCardStyleConfig(slotCardPresets[0].name, slotCardPresets[0].values),
    existingConfigDetected: true,
    initializedFromExistingConfig: false,
    warning
  };
}

function invalidBackgroundConfigResult(warning: string): BackgroundStyleConfigLoadResult {
  return {
    status: warning.includes("invalid JSON") ? "invalid_json" : "schema_invalid",
    config: buildBackgroundReadabilityStyleConfig(backgroundReadabilityPresets[0].name, backgroundReadabilityPresets[0].values),
    existingConfigDetected: true,
    initializedFromExistingConfig: false,
    warning
  };
}

function isSlotCardStyleConfigShape(value: unknown): value is SlotCardStyleConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SlotCardStyleConfig>;
  return candidate.schemaVersion === 1
    && candidate.surfaceType === "slot_card"
    && candidate.adapterTarget === "idle_monster_farm.farm_slots"
    && typeof candidate.presetName === "string"
    && typeof candidate.updatedAt === "string"
    && isSlotCardStyleValuesShape(candidate.values);
}

function isSlotCardStyleValuesShape(value: unknown): value is SlotCardStyleValues {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SlotCardStyleValues>;
  return typeof candidate.slotWidth === "number"
    && typeof candidate.slotHeight === "number"
    && typeof candidate.gap === "number"
    && typeof candidate.borderWidth === "number"
    && typeof candidate.cornerRadius === "number"
    && typeof candidate.fillColor === "string"
    && typeof candidate.borderColor === "string"
    && typeof candidate.selectedGlowStrength === "number"
    && typeof candidate.lockedOverlayOpacity === "number"
    && typeof candidate.emptySlotOpacity === "number"
    && typeof candidate.mergeCandidatePulseScale === "number"
    && typeof candidate.monsterDisplayScale === "number"
    && typeof candidate.monsterVerticalOffset === "number";
}

function isBackgroundReadabilityStyleConfigShape(value: unknown): value is BackgroundReadabilityStyleConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<BackgroundReadabilityStyleConfig>;
  return candidate.schemaVersion === 1
    && candidate.surfaceType === "background_readability"
    && candidate.adapterTarget === "idle_monster_farm.background"
    && typeof candidate.presetName === "string"
    && typeof candidate.updatedAt === "string"
    && isBackgroundReadabilityStyleValuesShape(candidate.values);
}

function isBackgroundReadabilityStyleValuesShape(value: unknown): value is BackgroundReadabilityStyleValues {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<BackgroundReadabilityStyleValues>;
  return typeof candidate.backgroundColor === "string"
    && typeof candidate.backgroundImageOpacity === "number"
    && typeof candidate.contrastOverlayColor === "string"
    && typeof candidate.contrastOverlayOpacity === "number"
    && typeof candidate.vignetteStrength === "number"
    && typeof candidate.patternOpacity === "number"
    && typeof candidate.blurAmount === "number"
    && typeof candidate.brightness === "number"
    && typeof candidate.contrast === "number";
}

function clampNumber(value: number, key: keyof typeof slotCardStyleBounds): number {
  const bounds = slotCardStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultSlotCardStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function clampBackgroundNumber(value: number, key: keyof typeof backgroundReadabilityStyleBounds): number {
  const bounds = backgroundReadabilityStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultBackgroundReadabilityStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function normalizeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
