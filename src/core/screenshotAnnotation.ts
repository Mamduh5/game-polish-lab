import * as fs from "fs";
import * as path from "path";

import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { ScreenshotAnnotationNote, ScreenshotAnnotationRect } from "../types/screenshotAnnotation";
import { VisualSurfaceType } from "../types/visualSurface";

export const screenshotAnnotationSchemaVersion = "screenshot-annotation/v1";
export const screenshotNotesFolderRelativePath = ".game-polish-lab/screenshot-notes";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const surfaceTypes: VisualSurfaceType[] = ["slot_card", "background_readability", "asset_replacement", "panel", "reward_toast", "button"];

export function validateScreenshotAnnotationRect(rect: ScreenshotAnnotationRect): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(rect.x) || rect.x < 0) {
    errors.push("Rectangle x must be a non-negative number.");
  }
  if (!Number.isFinite(rect.y) || rect.y < 0) {
    errors.push("Rectangle y must be a non-negative number.");
  }
  if (!Number.isFinite(rect.width) || rect.width <= 0) {
    errors.push("Rectangle width must be greater than zero.");
  }
  if (!Number.isFinite(rect.height) || rect.height <= 0) {
    errors.push("Rectangle height must be greater than zero.");
  }
  return errors;
}

export function validateScreenshotImagePath(workspaceRoot: string, screenshotPath: string): string[] {
  const errors: string[] = [];
  if (!screenshotPath.trim()) {
    return ["Screenshot path is required."];
  }
  const resolved = path.isAbsolute(screenshotPath) ? path.resolve(screenshotPath) : path.resolve(workspaceRoot, screenshotPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    errors.push("Screenshot file does not exist.");
  }
  if (!imageExtensions.has(path.extname(resolved).toLowerCase())) {
    errors.push("Screenshot file must be a PNG, JPG, JPEG, or WEBP image.");
  }
  return errors;
}

export function buildScreenshotAnnotationNote(input: {
  screenshotPath: string;
  markedRect: ScreenshotAnnotationRect;
  surfaceType: VisualSurfaceType;
  adapterId?: VisualDirectApplyAdapterId;
  note?: string;
  createdAt?: Date;
}): { ok: boolean; note?: ScreenshotAnnotationNote; errors: string[] } {
  const errors = validateScreenshotAnnotationRect(input.markedRect);
  if (!surfaceTypes.includes(input.surfaceType)) {
    errors.push(`Unknown visual surface type: ${input.surfaceType}.`);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const createdAt = input.createdAt ?? new Date();
  const noteId = `${createdAt.toISOString().replace(/[:.]/g, "-")}-${input.surfaceType}`;
  return {
    ok: true,
    errors: [],
    note: {
      schemaVersion: screenshotAnnotationSchemaVersion,
      noteId,
      screenshotPath: input.screenshotPath.replace(/\\/g, "/"),
      markedRect: input.markedRect,
      surfaceType: input.surfaceType,
      adapterId: input.adapterId,
      note: input.note,
      createdAt: createdAt.toISOString(),
      suggestedNextAction: {
        type: input.adapterId === "generic_phaser" ? "generate_fallback_task" : "open_tuner",
        label: input.adapterId === "generic_phaser" ? "Generate scoped visual fallback task" : "Open tuner for selected surface",
        visualOnly: true
      }
    }
  };
}

export function screenshotAnnotationRelativePath(note: ScreenshotAnnotationNote): string {
  const safeId = note.noteId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "screenshot-note";
  return `${screenshotNotesFolderRelativePath}/${safeId}.json`;
}

export function writeScreenshotAnnotationNote(workspaceRoot: string, note: ScreenshotAnnotationNote): string {
  const relativePath = screenshotAnnotationRelativePath(note);
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!absolutePath) {
    throw new Error(`Screenshot note path is not inside workspace: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(note, null, 2)}\n`, "utf8");
  return relativePath;
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string | undefined {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
  if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    return undefined;
  }
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, ...normalized.split("/"));
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : undefined;
}
