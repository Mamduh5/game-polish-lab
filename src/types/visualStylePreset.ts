import { VisualSurfaceType } from "./visualSurface";

export type VisualPresetTag = "mobile" | "readability" | "high-contrast" | "soft" | "arcade" | "premium" | "pixel" | "cozy" | "magic";

export type VisualPresetTokenPatch = Record<string, string | number | boolean>;

export interface VisualStylePresetFamily {
  familyId: string;
  name: string;
  description: string;
  tags?: VisualPresetTag[];
}

export interface VisualPresetSurfaceSupport {
  surfaceType: Exclude<VisualSurfaceType, "asset_replacement">;
  adapterIds?: string[];
}

export interface VisualStylePreset<TPatch extends object = object> {
  presetId: string;
  displayName: string;
  familyId: string;
  familyName: string;
  supportedSurfaces: VisualPresetSurfaceSupport[];
  stylePatch: TPatch;
  description: string;
  tags?: VisualPresetTag[];
  legacyNames?: string[];
}

export interface VisualPresetLibrary {
  families: VisualStylePresetFamily[];
  presets: VisualStylePreset[];
}

export interface VisualPresetDraftApplyResult<TDraft extends object> {
  applied: boolean;
  draftStyle: TDraft;
  preset?: VisualStylePreset;
}
