import { VisualSurfaceType } from "./visualSurface";

export const visualRecipeSchemaVersion = "visual-recipe/v1" as const;

export type VisualRecipeSchemaVersion = typeof visualRecipeSchemaVersion;
export type VisualStyleTokenValueType = "color" | "number" | "boolean" | "enum" | "text" | "asset";
export type VisualStyleTokenCategory = "layout" | "color" | "state" | "animation" | "asset" | "typography" | "effect";
export type VisualRecipeConnectionType = "style_module" | "json_config" | "runtime_bridge" | "unknown" | "none";

export interface VisualStyleToken {
  tokenId: string;
  label: string;
  valueType: VisualStyleTokenValueType;
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  allowedValues?: string[];
  unit?: "px" | "ms" | "scale" | "opacity" | "percent";
  category: VisualStyleTokenCategory;
  description: string;
  previewRole?: string;
  applyRole?: string;
}

export interface VisualRecipePreset {
  name: string;
  values: Record<string, string | number | boolean>;
}

export interface VisualRecipePreviewModel {
  previewKind: string;
  description: string;
}

export interface VisualRecipeDirectApplyMetadata {
  supported: boolean;
  requiresConnection: boolean;
  behavior: string;
}

export interface VisualRecipeFallbackTaskMetadata {
  reason: string;
  userVisibleMessage: string;
  allowedFiles: string[];
  forbiddenFiles: string[];
  requiredConsent: boolean;
  suggestedNextAction: string;
  exactScopeSummary: string;
}

export interface VisualRecipeAdapterMapping {
  adapterId: string;
  targetId: string;
  targetLabel: string;
  targetSurface: string;
  detectionKind: string;
  ownerFileHints: string[];
  safeFileScopes: string[];
  suspiciousFileScopes: string[];
  forbiddenFileScopes: string[];
  configPath: string;
  generatedStyleModulePath?: string;
  supportedConnectionTypes: VisualRecipeConnectionType[];
  directApplySupported: boolean;
  setupSupported: boolean;
  manualTestChecklist: string[];
}

export interface VisualSurfaceRecipe {
  recipeId: string;
  schemaVersion: VisualRecipeSchemaVersion;
  surfaceType: Exclude<VisualSurfaceType, "asset_replacement">;
  displayName: string;
  description: string;
  supportedStyleTokens: VisualStyleToken[];
  defaultStyle: Record<string, string | number | boolean>;
  presets: VisualRecipePreset[];
  previewModel: VisualRecipePreviewModel;
  statePreviews: string[];
  configPath: string;
  generatedStyleModulePath?: string;
  adapterMappings: VisualRecipeAdapterMapping[];
  directApply: VisualRecipeDirectApplyMetadata;
  fallbackTaskMetadata: VisualRecipeFallbackTaskMetadata;
  updatedAt: string;
}
