import { VisualDirectApplyAdapterId } from "./visualDirectApplyTemplate";
import { VisualSurfaceType } from "./visualSurface";

export interface ScreenshotAnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotAnnotationNote {
  schemaVersion: "screenshot-annotation/v1";
  noteId: string;
  screenshotPath: string;
  markedRect: ScreenshotAnnotationRect;
  surfaceType: VisualSurfaceType;
  adapterId?: VisualDirectApplyAdapterId;
  note?: string;
  createdAt: string;
  suggestedNextAction: {
    type: "open_tuner" | "generate_fallback_task";
    label: string;
    visualOnly: true;
  };
}
