import { VisualDirectApplyAdapterId } from "./visualDirectApplyTemplate";
import { VisualSurfaceType } from "./visualSurface";

export type VisualThemeSchemaVersion = "visual-theme/v1";

export interface VisualThemeSurfacePayload {
  surfaceType: VisualSurfaceType;
  sourceTargetId?: string;
  styleConfigPath?: string;
  styleTokens: Record<string, unknown>;
  compatibleSurfaceTypes: VisualSurfaceType[];
  limitations: string[];
}

export interface VisualThemeFile {
  schemaVersion: VisualThemeSchemaVersion;
  themeName: string;
  sourceAdapterId: VisualDirectApplyAdapterId;
  sourceSurfaceIds: VisualSurfaceType[];
  compatibleSurfaceIds: VisualSurfaceType[];
  surfaces: VisualThemeSurfacePayload[];
  createdAt: string;
  notes?: string;
  limitations: string[];
}

export interface VisualThemeImportPlan {
  ok: boolean;
  targetAdapterId: VisualDirectApplyAdapterId;
  targetSurfaceType: VisualSurfaceType;
  targetStyleConfigPath: string;
  rollbackRequired: boolean;
  reasons: string[];
  warnings: string[];
}
