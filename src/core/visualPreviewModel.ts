import { VisualSurfaceType } from "../types/visualSurface";
import {
  VisualPreviewAnimation,
  VisualPreviewRenderRequest,
  VisualPreviewState,
  VisualPreviewViewport
} from "../types/visualPreview";

export const visualPreviewViewports: VisualPreviewViewport[] = [
  {
    mode: "desktop",
    label: "Desktop frame",
    width: 760,
    height: 430,
    orientation: "landscape"
  },
  {
    mode: "mobile",
    label: "Mobile frame",
    width: 360,
    height: 640,
    orientation: "portrait"
  }
];

const slotCardPreviewStates: VisualPreviewState[] = [
  { stateId: "empty", label: "Empty", supported: true },
  { stateId: "occupied", label: "Occupied", supported: true },
  { stateId: "selected", label: "Selected", supported: true },
  { stateId: "locked", label: "Locked", supported: true },
  { stateId: "merge_candidate", label: "Merge candidate", supported: true }
];

const buttonPreviewStates: VisualPreviewState[] = [
  { stateId: "idle", label: "Idle", supported: true },
  { stateId: "hover", label: "Hover", supported: true },
  { stateId: "active", label: "Pressed", supported: true },
  { stateId: "disabled", label: "Disabled", supported: true }
];

export interface BuildVisualPreviewRenderRequestInput {
  surfaceType: VisualSurfaceType;
  adapterId: string;
  targetId?: string;
  targetLabel?: string;
  currentStyle: unknown;
  draftStyle: unknown;
  appliedStyleExists: boolean;
  requestedStates?: string[];
}

export function buildVisualPreviewRenderRequest(input: BuildVisualPreviewRenderRequestInput): VisualPreviewRenderRequest {
  return {
    surfaceType: input.surfaceType,
    adapterId: input.adapterId,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    comparison: {
      beforeLabel: input.appliedStyleExists ? "Before: applied style" : "Before: baseline default",
      afterLabel: "After: draft style",
      beforeSource: input.appliedStyleExists ? "applied_config" : "baseline_default",
      beforeStyle: input.appliedStyleExists ? input.currentStyle : input.currentStyle,
      afterStyle: input.draftStyle
    },
    viewports: visualPreviewViewports,
    defaultFrameMode: "desktop",
    states: getVisualPreviewStates(input.surfaceType, input.requestedStates),
    animations: getVisualPreviewAnimations(input.surfaceType)
  };
}

export function getVisualPreviewStates(surfaceType: VisualSurfaceType, requestedStates?: string[]): VisualPreviewState[] {
  const supportedStates = stateCatalogForSurface(surfaceType);
  if (!requestedStates || requestedStates.length === 0) {
    return supportedStates;
  }
  return requestedStates.map((stateId) => {
    const known = supportedStates.find((state) => state.stateId === normalizeStateId(stateId));
    return known ?? { stateId: normalizeStateId(stateId), label: labelFromStateId(stateId), supported: false };
  });
}

export function getVisualPreviewAnimations(surfaceType: VisualSurfaceType): VisualPreviewAnimation[] {
  if (surfaceType === "slot_card") {
    return [
      {
        animationId: "slot-card-merge-candidate-pulse",
        label: "Merge candidate pulse",
        kind: "merge_candidate_pulse",
        durationMs: 900,
        tokenIds: ["mergeCandidatePulseScale"],
        defaultEnabled: true
      }
    ];
  }
  if (surfaceType === "reward_toast") {
    return [
      {
        animationId: "reward-toast-rise-fade",
        label: "Reward toast rise/fade",
        kind: "selected_glow_pulse",
        durationMs: 1200,
        tokenIds: ["durationMs", "riseDistance", "startScale", "peakScale", "endScale"],
        defaultEnabled: true
      }
    ];
  }
  if (surfaceType === "button") {
    return [
      {
        animationId: "button-press-preview",
        label: "Button press preview",
        kind: "selected_glow_pulse",
        durationMs: 650,
        tokenIds: ["activePressScale", "activePressDurationMs"],
        defaultEnabled: true
      }
    ];
  }
  return [];
}

function stateCatalogForSurface(surfaceType: VisualSurfaceType): VisualPreviewState[] {
  if (surfaceType === "slot_card") {
    return slotCardPreviewStates;
  }
  if (surfaceType === "button") {
    return buttonPreviewStates;
  }
  if (surfaceType === "panel") {
    return [
      { stateId: "navigation_panel", label: "Navigation panel", supported: true },
      { stateId: "hatch_panel", label: "Hatch panel", supported: true },
      { stateId: "quest_panel", label: "Quest panel", supported: true },
      { stateId: "disabled_row", label: "Disabled row", supported: true }
    ];
  }
  if (surfaceType === "reward_toast") {
    return [
      { stateId: "reward_text", label: "Reward text", supported: true },
      { stateId: "icon", label: "Icon", supported: true },
      { stateId: "sparkles", label: "Sparkles", supported: true }
    ];
  }
  if (surfaceType === "background_readability") {
    return [
      { stateId: "background_image", label: "Background image", supported: true },
      { stateId: "contrast_overlay", label: "Contrast overlay", supported: true },
      { stateId: "foreground_cards", label: "Foreground cards", supported: true }
    ];
  }
  return [];
}

function normalizeStateId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "unknown";
}

function labelFromStateId(value: string): string {
  const normalized = normalizeStateId(value).replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
