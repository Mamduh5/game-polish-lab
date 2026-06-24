import * as path from "path";

import { defaultSlotCardStyle, slotCardStyleBounds, slotCardPresets } from "../presets/slotCardPresets";
import { SlotCardStyleConfig, SlotCardStyleValues } from "../types/visualSurface";

export type StyleConfigLoadStatus = "valid" | "missing" | "invalid_json" | "schema_invalid";

export interface StyleConfigLoadResult {
  status: StyleConfigLoadStatus;
  config: SlotCardStyleConfig;
  existingConfigDetected: boolean;
  initializedFromExistingConfig: boolean;
  warning?: string;
}

export const farmSlotStyleConfigRelativePath = ".game-polish-lab/styles/farm-slot-style.json";

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

function clampNumber(value: number, key: keyof typeof slotCardStyleBounds): number {
  const bounds = slotCardStyleBounds[key];
  const numericValue = Number.isFinite(value) ? value : defaultSlotCardStyle[key];
  return Math.min(bounds.max, Math.max(bounds.min, numericValue));
}

function normalizeColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
