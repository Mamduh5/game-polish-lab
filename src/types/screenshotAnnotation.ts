import { VisualDirectApplyAdapterId } from "./visualDirectApplyTemplate";
import { VisualSurfaceType } from "./visualSurface";

export type ScreenshotAnnotationSchemaVersion = "screenshot-annotation/v1";
export type ScreenshotAnnotationStatus = "draft" | "converted_to_tuning_task" | "dismissed";
export type ScreenshotAnnotationSeverity = "low" | "medium" | "high";
export type ScreenshotAnnotationSurfaceType = VisualSurfaceType | "hud" | "impact_feedback" | "asset_slot";

export interface ScreenshotAnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotAnnotationNormalizedRect {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface ScreenshotImageMetadata {
  width?: number;
  height?: number;
  fileType: "png" | "jpg" | "jpeg" | "webp";
}

export interface ScreenshotAnnotationTargetMapping {
  adapterId: VisualDirectApplyAdapterId;
  adapterLabel: string;
  surfaceType: VisualSurfaceType;
  targetId?: string;
  targetLabel?: string;
  styleConfigPath?: string;
  ambiguous: boolean;
  warnings: string[];
}

export interface ScreenshotAnnotation {
  schemaVersion: ScreenshotAnnotationSchemaVersion;
  annotationId: string;
  createdAt: string;
  workspaceLabel?: string;
  adapterId?: VisualDirectApplyAdapterId;
  adapterLabel?: string;
  screenshotPath: string;
  imageMetadata?: ScreenshotImageMetadata;
  markedRect: ScreenshotAnnotationRect;
  normalizedRect?: ScreenshotAnnotationNormalizedRect;
  surfaceType: ScreenshotAnnotationSurfaceType;
  targetSurfaceId?: string;
  targetMapping?: ScreenshotAnnotationTargetMapping;
  note: string;
  severity: ScreenshotAnnotationSeverity;
  status: ScreenshotAnnotationStatus;
  generatedConfigPath?: string;
  generatedTaskPath?: string;
  generatedFallbackTaskPath?: string;
  warnings: string[];
  suggestedNextAction: {
    type: "open_tuner" | "generate_config_stub" | "generate_fallback_task";
    label: string;
    visualOnly: true;
  };
}

export interface ScreenshotAnnotationIndexEntry {
  annotationId: string;
  path: string;
  screenshotPath: string;
  surfaceType: ScreenshotAnnotationSurfaceType;
  adapterId?: VisualDirectApplyAdapterId;
  targetSurfaceId?: string;
  note: string;
  severity: ScreenshotAnnotationSeverity;
  status: ScreenshotAnnotationStatus;
  createdAt: string;
  generatedConfigPath?: string;
  generatedTaskPath?: string;
  generatedFallbackTaskPath?: string;
}

export interface ScreenshotAnnotationIndexFile {
  schemaVersion: "screenshot-annotation-index/v1";
  updatedAt: string;
  annotations: ScreenshotAnnotationIndexEntry[];
}

export interface ScreenshotAnnotationSaveResult {
  ok: boolean;
  annotationPath?: string;
  indexPath?: string;
  taskPath?: string;
  configPath?: string;
  fallbackTaskPath?: string;
  changedFiles: string[];
  warnings: string[];
  errors: string[];
}

export type ScreenshotAnnotationNote = ScreenshotAnnotation;
