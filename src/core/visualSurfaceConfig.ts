import * as path from "path";

import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { defaultPanelStyle, panelStyleBounds, panelStylePresets } from "../presets/panelStylePresets";
import { defaultSlotCardStyle, slotCardStyleBounds, slotCardPresets } from "../presets/slotCardPresets";
import { BackgroundReadabilityStyleConfig, BackgroundReadabilityStyleValues, PanelStyleConfig, PanelStyleValues, SlotCardStyleConfig, SlotCardStyleValues } from "../types/visualSurface";

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
export const panelStyleConfigRelativePath = ".game-polish-lab/styles/panel-style.json";

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

export interface PanelStyleConfigLoadResult {
  status: StyleConfigLoadStatus;
  config: PanelStyleConfig;
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

export function loadPanelStyleConfigFromText(text: string | undefined): PanelStyleConfigLoadResult {
  if (text === undefined) {
    return {
      status: "missing",
      config: buildPanelStyleConfig(panelStylePresets[0].name, panelStylePresets[0].values),
      existingConfigDetected: false,
      initializedFromExistingConfig: false
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidPanelConfigResult("Existing panel style config is invalid JSON. The editor was reset to the default v0.54 preset.");
  }

  if (!isPanelStyleConfigShape(parsed)) {
    return invalidPanelConfigResult("Existing panel style config has an unsupported schema. The editor was reset to the default v0.54 preset.");
  }

  return {
    status: "valid",
    config: {
      ...parsed,
      values: normalizePanelStyleValues(parsed.values)
    },
    existingConfigDetected: true,
    initializedFromExistingConfig: true
  };
}

export function buildPanelStyleConfig(presetName: string, values: PanelStyleValues): PanelStyleConfig {
  return {
    schemaVersion: 1,
    surfaceType: "panel",
    adapterTarget: "idle_monster_farm.panels",
    presetName,
    updatedAt: new Date().toISOString(),
    values: normalizePanelStyleValues(values)
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

export function normalizePanelStyleValues(values: PanelStyleValues): PanelStyleValues {
  return {
    fillColor: normalizeColor(values.fillColor, defaultPanelStyle.fillColor),
    fillOpacity: clampPanelNumber(values.fillOpacity, "fillOpacity"),
    borderColor: normalizeColor(values.borderColor, defaultPanelStyle.borderColor),
    borderWidth: clampPanelNumber(values.borderWidth, "borderWidth"),
    cornerRadius: clampPanelNumber(values.cornerRadius, "cornerRadius"),
    headerAccentColor: normalizeColor(values.headerAccentColor, defaultPanelStyle.headerAccentColor),
    headerAccentHeight: clampPanelNumber(values.headerAccentHeight, "headerAccentHeight"),
    padding: clampPanelNumber(values.padding, "padding"),
    contentGap: clampPanelNumber(values.contentGap, "contentGap"),
    dividerColor: normalizeColor(values.dividerColor, defaultPanelStyle.dividerColor),
    dividerOpacity: clampPanelNumber(values.dividerOpacity, "dividerOpacity"),
    dividerThickness: clampPanelNumber(values.dividerThickness, "dividerThickness"),
    shadowStrength: clampPanelNumber(values.shadowStrength, "shadowStrength"),
    glowStrength: clampPanelNumber(values.glowStrength, "glowStrength"),
    titleTextSize: clampPanelNumber(values.titleTextSize, "titleTextSize"),
    bodyTextSize: clampPanelNumber(values.bodyTextSize, "bodyTextSize"),
    disabledOpacity: clampPanelNumber(values.disabledOpacity, "disabledOpacity")
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

function invalidPanelConfigResult(warning: string): PanelStyleConfigLoadResult {
  return {
    status: warning.includes("invalid JSON") ? "invalid_json" : "schema_invalid",
    config: buildPanelStyleConfig(panelStylePresets[0].name, panelStylePresets[0].values),
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

function isPanelStyleConfigShape(value: unknown): value is PanelStyleConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PanelStyleConfig>;
  return candidate.schemaVersion === 1
    && candidate.surfaceType === "panel"
    && candidate.adapterTarget === "idle_monster_farm.panels"
    && typeof candidate.presetName === "string"
    && typeof candidate.updatedAt === "string"
    && isPanelStyleValuesShape(candidate.values);
}

function isPanelStyleValuesShape(value: unknown): value is PanelStyleValues {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PanelStyleValues>;
  return typeof candidate.fillColor === "string"
    && typeof candidate.fillOpacity === "number"
    && typeof candidate.borderColor === "string"
    && typeof candidate.borderWidth === "number"
    && typeof candidate.cornerRadius === "number"
    && typeof candidate.headerAccentColor === "string"
    && typeof candidate.headerAccentHeight === "number"
    && typeof candidate.padding === "number"
    && typeof candidate.contentGap === "number"
    && typeof candidate.dividerColor === "string"
    && typeof candidate.dividerOpacity === "number"
    && typeof candidate.dividerThickness === "number"
    && typeof candidate.shadowStrength === "number"
    && typeof candidate.glowStrength === "number"
    && typeof candidate.titleTextSize === "number"
    && typeof candidate.bodyTextSize === "number"
    && typeof candidate.disabledOpacity === "number";
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

function clampPanelNumber(value: number, key: keyof typeof panelStyleBounds): number {
  const bounds = panelStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultPanelStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function normalizeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
