import { VisualSurfaceType } from "./visualSurface";

export type VisualPreviewFrameMode = "desktop" | "mobile";
export type VisualPreviewAnimationKind = "merge_candidate_pulse" | "selected_glow_pulse" | "locked_overlay_fade";

export interface VisualPreviewViewport {
  mode: VisualPreviewFrameMode;
  label: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait";
}

export interface VisualPreviewState {
  stateId: string;
  label: string;
  supported: boolean;
}

export interface VisualPreviewAnimation {
  animationId: string;
  label: string;
  kind: VisualPreviewAnimationKind;
  durationMs: number;
  tokenIds: string[];
  defaultEnabled: boolean;
}

export interface VisualPreviewComparison {
  beforeLabel: string;
  afterLabel: string;
  beforeSource: "applied_config" | "baseline_default";
  beforeStyle: unknown;
  afterStyle: unknown;
}

export interface VisualPreviewRenderRequest {
  surfaceType: VisualSurfaceType;
  adapterId: string;
  targetId?: string;
  targetLabel?: string;
  comparison: VisualPreviewComparison;
  viewports: VisualPreviewViewport[];
  defaultFrameMode: VisualPreviewFrameMode;
  states: VisualPreviewState[];
  animations: VisualPreviewAnimation[];
}
