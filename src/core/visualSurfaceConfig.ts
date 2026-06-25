import * as path from "path";

import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { buttonStyleBounds, buttonStylePresets, defaultButtonStyle } from "../presets/buttonStylePresets";
import { defaultPanelStyle, panelStyleBounds, panelStylePresets } from "../presets/panelStylePresets";
import { defaultRewardToastStyle, rewardToastPresets, rewardToastStyleBounds } from "../presets/rewardToastPresets";
import { defaultSlotCardStyle, slotCardStyleBounds, slotCardPresets } from "../presets/slotCardPresets";
import { BackgroundReadabilityStyleConfig, BackgroundReadabilityStyleValues, ButtonStyleConfig, ButtonStyleValues, PanelStyleConfig, PanelStyleValues, RewardToastStyleConfig, RewardToastStyleValues, SlotCardStyleConfig, SlotCardStyleValues } from "../types/visualSurface";

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
export const rewardToastStyleConfigRelativePath = ".game-polish-lab/styles/reward-toast-style.json";
export const buttonStyleConfigRelativePath = ".game-polish-lab/styles/button-style.json";

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

export interface RewardToastStyleConfigLoadResult {
  status: StyleConfigLoadStatus;
  config: RewardToastStyleConfig;
  existingConfigDetected: boolean;
  initializedFromExistingConfig: boolean;
  warning?: string;
}

export interface ButtonStyleConfigLoadResult {
  status: StyleConfigLoadStatus;
  config: ButtonStyleConfig;
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

export function loadRewardToastStyleConfigFromText(text: string | undefined): RewardToastStyleConfigLoadResult {
  if (text === undefined) {
    return {
      status: "missing",
      config: buildRewardToastStyleConfig(rewardToastPresets[0].name, rewardToastPresets[0].values),
      existingConfigDetected: false,
      initializedFromExistingConfig: false
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidRewardToastConfigResult("Existing reward toast style config is invalid JSON. The editor was reset to the default v0.55 preset.");
  }

  if (!isRewardToastStyleConfigShape(parsed)) {
    return invalidRewardToastConfigResult("Existing reward toast style config has an unsupported schema. The editor was reset to the default v0.55 preset.");
  }

  return {
    status: "valid",
    config: {
      ...parsed,
      values: normalizeRewardToastStyleValues(parsed.values)
    },
    existingConfigDetected: true,
    initializedFromExistingConfig: true
  };
}

export function buildRewardToastStyleConfig(presetName: string, values: RewardToastStyleValues): RewardToastStyleConfig {
  return {
    schemaVersion: 1,
    surfaceType: "reward_toast",
    adapterTarget: "idle_monster_farm.reward_toast",
    presetName,
    updatedAt: new Date().toISOString(),
    values: normalizeRewardToastStyleValues(values)
  };
}

export function loadButtonStyleConfigFromText(text: string | undefined): ButtonStyleConfigLoadResult {
  if (text === undefined) {
    return {
      status: "missing",
      config: buildButtonStyleConfig(buttonStylePresets[0].name, buttonStylePresets[0].values),
      existingConfigDetected: false,
      initializedFromExistingConfig: false
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return invalidButtonConfigResult("Existing button style config is invalid JSON. The editor was reset to the default v0.56 preset.");
  }

  if (!isButtonStyleConfigShape(parsed)) {
    return invalidButtonConfigResult("Existing button style config has an unsupported schema. The editor was reset to the default v0.56 preset.");
  }

  return {
    status: "valid",
    config: {
      ...parsed,
      values: normalizeButtonStyleValues(parsed.values)
    },
    existingConfigDetected: true,
    initializedFromExistingConfig: true
  };
}

export function buildButtonStyleConfig(presetName: string, values: ButtonStyleValues): ButtonStyleConfig {
  return {
    schemaVersion: 1,
    surfaceType: "button",
    adapterTarget: "idle_monster_farm.buttons",
    presetName,
    updatedAt: new Date().toISOString(),
    values: normalizeButtonStyleValues(values)
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

export function normalizeRewardToastStyleValues(values: RewardToastStyleValues): RewardToastStyleValues {
  return {
    durationMs: clampRewardToastNumber(values.durationMs, "durationMs"),
    riseDistance: clampRewardToastNumber(values.riseDistance, "riseDistance"),
    startScale: clampRewardToastNumber(values.startScale, "startScale"),
    peakScale: clampRewardToastNumber(values.peakScale, "peakScale"),
    endScale: clampRewardToastNumber(values.endScale, "endScale"),
    bounceStrength: clampRewardToastNumber(values.bounceStrength, "bounceStrength"),
    fadeInMs: clampRewardToastNumber(values.fadeInMs, "fadeInMs"),
    fadeOutMs: clampRewardToastNumber(values.fadeOutMs, "fadeOutMs"),
    sparkleCount: Math.round(clampRewardToastNumber(values.sparkleCount, "sparkleCount")),
    sparkleScale: clampRewardToastNumber(values.sparkleScale, "sparkleScale"),
    textSize: clampRewardToastNumber(values.textSize, "textSize"),
    iconScale: clampRewardToastNumber(values.iconScale, "iconScale"),
    toastFillColor: normalizeColor(values.toastFillColor, defaultRewardToastStyle.toastFillColor),
    toastFillOpacity: clampRewardToastNumber(values.toastFillOpacity, "toastFillOpacity"),
    toastBorderColor: normalizeColor(values.toastBorderColor, defaultRewardToastStyle.toastBorderColor),
    toastBorderWidth: clampRewardToastNumber(values.toastBorderWidth, "toastBorderWidth"),
    cornerRadius: clampRewardToastNumber(values.cornerRadius, "cornerRadius"),
    shadowStrength: clampRewardToastNumber(values.shadowStrength, "shadowStrength"),
    glowStrength: clampRewardToastNumber(values.glowStrength, "glowStrength")
  };
}

export function normalizeButtonStyleValues(values: ButtonStyleValues): ButtonStyleValues {
  return {
    width: clampButtonNumber(values.width, "width"),
    height: clampButtonNumber(values.height, "height"),
    fillColor: normalizeColor(values.fillColor, defaultButtonStyle.fillColor),
    fillOpacity: clampButtonNumber(values.fillOpacity, "fillOpacity"),
    borderColor: normalizeColor(values.borderColor, defaultButtonStyle.borderColor),
    borderWidth: clampButtonNumber(values.borderWidth, "borderWidth"),
    cornerRadius: clampButtonNumber(values.cornerRadius, "cornerRadius"),
    labelColor: normalizeColor(values.labelColor, defaultButtonStyle.labelColor),
    labelTextSize: clampButtonNumber(values.labelTextSize, "labelTextSize"),
    iconScale: clampButtonNumber(values.iconScale, "iconScale"),
    labelScale: clampButtonNumber(values.labelScale, "labelScale"),
    contentGap: clampButtonNumber(values.contentGap, "contentGap"),
    paddingX: clampButtonNumber(values.paddingX, "paddingX"),
    paddingY: clampButtonNumber(values.paddingY, "paddingY"),
    hoverGlowStrength: clampButtonNumber(values.hoverGlowStrength, "hoverGlowStrength"),
    hoverLift: clampButtonNumber(values.hoverLift, "hoverLift"),
    activePressScale: clampButtonNumber(values.activePressScale, "activePressScale"),
    activePressDurationMs: clampButtonNumber(values.activePressDurationMs, "activePressDurationMs"),
    activeDarkenOpacity: clampButtonNumber(values.activeDarkenOpacity, "activeDarkenOpacity"),
    disabledOpacity: clampButtonNumber(values.disabledOpacity, "disabledOpacity"),
    disabledSaturation: clampButtonNumber(values.disabledSaturation, "disabledSaturation"),
    shadowStrength: clampButtonNumber(values.shadowStrength, "shadowStrength"),
    glowStrength: clampButtonNumber(values.glowStrength, "glowStrength")
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

function invalidRewardToastConfigResult(warning: string): RewardToastStyleConfigLoadResult {
  return {
    status: warning.includes("invalid JSON") ? "invalid_json" : "schema_invalid",
    config: buildRewardToastStyleConfig(rewardToastPresets[0].name, rewardToastPresets[0].values),
    existingConfigDetected: true,
    initializedFromExistingConfig: false,
    warning
  };
}

function invalidButtonConfigResult(warning: string): ButtonStyleConfigLoadResult {
  return {
    status: warning.includes("invalid JSON") ? "invalid_json" : "schema_invalid",
    config: buildButtonStyleConfig(buttonStylePresets[0].name, buttonStylePresets[0].values),
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

function isRewardToastStyleConfigShape(value: unknown): value is RewardToastStyleConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RewardToastStyleConfig>;
  return candidate.schemaVersion === 1
    && candidate.surfaceType === "reward_toast"
    && candidate.adapterTarget === "idle_monster_farm.reward_toast"
    && typeof candidate.presetName === "string"
    && typeof candidate.updatedAt === "string"
    && isRewardToastStyleValuesShape(candidate.values);
}

function isRewardToastStyleValuesShape(value: unknown): value is RewardToastStyleValues {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<RewardToastStyleValues>;
  return typeof candidate.durationMs === "number"
    && typeof candidate.riseDistance === "number"
    && typeof candidate.startScale === "number"
    && typeof candidate.peakScale === "number"
    && typeof candidate.endScale === "number"
    && typeof candidate.bounceStrength === "number"
    && typeof candidate.fadeInMs === "number"
    && typeof candidate.fadeOutMs === "number"
    && typeof candidate.sparkleCount === "number"
    && typeof candidate.sparkleScale === "number"
    && typeof candidate.textSize === "number"
    && typeof candidate.iconScale === "number"
    && typeof candidate.toastFillColor === "string"
    && typeof candidate.toastFillOpacity === "number"
    && typeof candidate.toastBorderColor === "string"
    && typeof candidate.toastBorderWidth === "number"
    && typeof candidate.cornerRadius === "number"
    && typeof candidate.shadowStrength === "number"
    && typeof candidate.glowStrength === "number";
}

function isButtonStyleConfigShape(value: unknown): value is ButtonStyleConfig {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ButtonStyleConfig>;
  return candidate.schemaVersion === 1
    && candidate.surfaceType === "button"
    && candidate.adapterTarget === "idle_monster_farm.buttons"
    && typeof candidate.presetName === "string"
    && typeof candidate.updatedAt === "string"
    && isButtonStyleValuesShape(candidate.values);
}

function isButtonStyleValuesShape(value: unknown): value is ButtonStyleValues {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ButtonStyleValues>;
  return typeof candidate.width === "number"
    && typeof candidate.height === "number"
    && typeof candidate.fillColor === "string"
    && typeof candidate.fillOpacity === "number"
    && typeof candidate.borderColor === "string"
    && typeof candidate.borderWidth === "number"
    && typeof candidate.cornerRadius === "number"
    && typeof candidate.labelColor === "string"
    && typeof candidate.labelTextSize === "number"
    && typeof candidate.iconScale === "number"
    && typeof candidate.labelScale === "number"
    && typeof candidate.contentGap === "number"
    && typeof candidate.paddingX === "number"
    && typeof candidate.paddingY === "number"
    && typeof candidate.hoverGlowStrength === "number"
    && typeof candidate.hoverLift === "number"
    && typeof candidate.activePressScale === "number"
    && typeof candidate.activePressDurationMs === "number"
    && typeof candidate.activeDarkenOpacity === "number"
    && typeof candidate.disabledOpacity === "number"
    && typeof candidate.disabledSaturation === "number"
    && typeof candidate.shadowStrength === "number"
    && typeof candidate.glowStrength === "number";
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

function clampRewardToastNumber(value: number, key: keyof typeof rewardToastStyleBounds): number {
  const bounds = rewardToastStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultRewardToastStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function clampButtonNumber(value: number, key: keyof typeof buttonStyleBounds): number {
  const bounds = buttonStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultButtonStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function normalizeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
