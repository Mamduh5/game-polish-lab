import { VisualDirectApplyAdapterId } from "./visualDirectApplyTemplate";
import { VisualSurfaceType } from "./visualSurface";

export type VisualThemeSchemaVersion = "visual-theme/v1";
export type VisualThemeGenericSurfaceType = VisualSurfaceType | "hud" | "impact_feedback";

export interface VisualThemeExportMetadata {
  exportedBy: "game-polish-lab";
  exportedAt: string;
  exportSource: "style_config" | "dashboard_row" | "manual_tokens";
  sourceConfigPaths: string[];
}

export interface VisualThemeAdapterMapping {
  adapterId: VisualDirectApplyAdapterId;
  targetSurfaceType: VisualSurfaceType;
  targetIds: string[];
}

export interface VisualThemeSurfacePayload {
  surfaceId: string;
  surfaceType: VisualThemeGenericSurfaceType;
  sourceSurfaceType?: VisualSurfaceType;
  sourceTargetId?: string;
  sourceTargetLabel?: string;
  styleConfigPath?: string;
  styleConfigEntries: Record<string, unknown>;
  styleTokens: Record<string, unknown>;
  normalizedStyleTokens: Record<string, unknown>;
  compatibleSurfaceTypes: VisualSurfaceType[];
  compatibleGenericSurfaceTypes: VisualThemeGenericSurfaceType[];
  adapterSpecificConfig?: Record<string, unknown>;
  adapterMappings?: VisualThemeAdapterMapping[];
  limitations: string[];
  validationWarnings: string[];
}

export interface VisualThemeFile {
  schemaVersion: VisualThemeSchemaVersion;
  themeId: string;
  themeName: string;
  themeVersion: string;
  sourceAdapterId: VisualDirectApplyAdapterId;
  sourceAdapterLabel: string;
  sourceWorkspaceLabel?: string;
  sourceSurfaceIds: VisualSurfaceType[];
  genericSurfaceTypes: VisualThemeGenericSurfaceType[];
  compatibleSurfaceIds: VisualSurfaceType[];
  compatibleGenericSurfaceTypes: VisualThemeGenericSurfaceType[];
  surfaces: VisualThemeSurfacePayload[];
  createdAt: string;
  notes?: string;
  validationWarnings: string[];
  limitations: string[];
  exportMetadata: VisualThemeExportMetadata;
}

export interface VisualThemeIndexEntry {
  themeId: string;
  themeName: string;
  path: string;
  schemaVersion: VisualThemeSchemaVersion;
  sourceAdapterId: VisualDirectApplyAdapterId;
  sourceAdapterLabel: string;
  sourceWorkspaceLabel?: string;
  sourceSurfaceIds: VisualSurfaceType[];
  compatibleSurfaceIds: VisualSurfaceType[];
  genericSurfaceTypes: VisualThemeGenericSurfaceType[];
  createdAt: string;
  updatedAt: string;
}

export interface VisualThemeIndexFile {
  schemaVersion: "visual-theme-index/v1";
  updatedAt: string;
  themes: VisualThemeIndexEntry[];
}

export interface VisualThemeImportPlan {
  ok: boolean;
  targetAdapterId: VisualDirectApplyAdapterId;
  targetSurfaceType: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  targetStyleConfigPath: string;
  sourceSurfaceId?: string;
  sourceSurfaceType?: VisualThemeGenericSurfaceType;
  rollbackRequired: boolean;
  reasons: string[];
  warnings: string[];
}

export interface VisualThemeAdapterImportResult {
  ok: boolean;
  changedFiles: string[];
  rollbackPaths: string[];
  imported: VisualThemeImportPlan[];
  skipped: Array<{ surfaceId: string; surfaceType: VisualThemeGenericSurfaceType; reason: string }>;
  warnings: string[];
  errors: string[];
}
