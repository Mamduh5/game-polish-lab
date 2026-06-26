import * as fs from "fs";
import * as path from "path";

import { buildRollbackSnapshotName } from "./visualSurfaceConfig";
import { checkVisualScopeGuard } from "./visualScopeGuard";
import { getVisualGameAdapter } from "./visualGameAdapters";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";
import { VisualThemeFile, VisualThemeImportPlan } from "../types/visualTheme";

export const visualThemeSchemaVersion = "visual-theme/v1";
export const visualThemeFolderRelativePath = ".game-polish-lab/themes";

const compatibleSurfaceTypes: Partial<Record<VisualSurfaceType, VisualSurfaceType[]>> = {
  slot_card: ["slot_card"],
  panel: ["panel"],
  button: ["button"],
  reward_toast: ["reward_toast"],
  background_readability: ["background_readability"],
  asset_replacement: ["asset_replacement"]
};

export function safeVisualThemeRelativePath(themeName: string): string {
  const safeName = themeName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "visual-theme";
  return `${visualThemeFolderRelativePath}/${safeName}.json`;
}

export function buildVisualThemeFile(input: {
  themeName: string;
  sourceAdapterId: VisualDirectApplyAdapterId;
  surfaces: Array<{ surfaceType: VisualSurfaceType; sourceTargetId?: string; styleConfigPath?: string; styleTokens: Record<string, unknown>; limitations?: string[] }>;
  createdAt?: Date;
  notes?: string;
}): VisualThemeFile {
  const sourceSurfaceIds = Array.from(new Set(input.surfaces.map((surface) => surface.surfaceType)));
  return {
    schemaVersion: visualThemeSchemaVersion,
    themeName: input.themeName,
    sourceAdapterId: input.sourceAdapterId,
    sourceSurfaceIds,
    compatibleSurfaceIds: Array.from(new Set(sourceSurfaceIds.flatMap((surfaceType) => compatibleSurfaceTypes[surfaceType] ?? []))),
    surfaces: input.surfaces.map((surface) => ({
      surfaceType: surface.surfaceType,
      sourceTargetId: surface.sourceTargetId,
      styleConfigPath: surface.styleConfigPath,
      styleTokens: surface.styleTokens,
      compatibleSurfaceTypes: compatibleSurfaceTypes[surface.surfaceType] ?? [],
      limitations: surface.surfaceType === "asset_replacement"
        ? ["Asset replacement themes are validation-only and non-executable unless an existing asset direct-apply path explicitly supports the target."]
        : surface.limitations ?? []
    })),
    createdAt: (input.createdAt ?? new Date()).toISOString(),
    notes: input.notes,
    limitations: [
      "Theme import writes generated Game Polish Lab style configs only.",
      "Gameplay, save, economy, progression, rules, solver, undo/hint, ads, and monetization are not part of theme payloads."
    ]
  };
}

export function validateVisualThemeFile(value: unknown): { ok: boolean; theme?: VisualThemeFile; errors: string[] } {
  const errors: string[] = [];
  const theme = value as Partial<VisualThemeFile>;
  if (!theme || typeof theme !== "object") {
    return { ok: false, errors: ["Theme payload must be an object."] };
  }
  if (theme.schemaVersion !== visualThemeSchemaVersion) {
    errors.push(`Unsupported theme schema version: ${String(theme.schemaVersion)}.`);
  }
  if (!theme.themeName || typeof theme.themeName !== "string") {
    errors.push("Theme name is required.");
  }
  if (!theme.sourceAdapterId || typeof theme.sourceAdapterId !== "string") {
    errors.push("Source adapter id is required.");
  }
  if (!Array.isArray(theme.surfaces) || theme.surfaces.length === 0) {
    errors.push("At least one theme surface is required.");
  }
  for (const surface of theme.surfaces ?? []) {
    if (!surface.surfaceType) {
      errors.push("Theme surface type is required.");
    }
    if (!surface.styleTokens || typeof surface.styleTokens !== "object" || Array.isArray(surface.styleTokens)) {
      errors.push(`Theme surface ${String(surface.surfaceType)} must include style token payload.`);
    }
  }
  return { ok: errors.length === 0, theme: errors.length === 0 ? theme as VisualThemeFile : undefined, errors };
}

export function planVisualThemeImport(theme: VisualThemeFile, input: { targetAdapterId: VisualDirectApplyAdapterId; targetSurfaceType: VisualSurfaceType; targetId?: string }): VisualThemeImportPlan {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const adapter = getVisualGameAdapter(input.targetAdapterId);
  const surface = theme.surfaces.find((candidate) => candidate.compatibleSurfaceTypes.includes(input.targetSurfaceType));
  const targetStyleConfigPath = adapter?.getStyleConfigPath(input.targetSurfaceType, input.targetId) ?? "";
  if (!adapter) {
    reasons.push(`Target adapter is not registered: ${input.targetAdapterId}.`);
  }
  if (!surface) {
    reasons.push(`Theme has no compatible ${input.targetSurfaceType} payload.`);
  }
  if (input.targetSurfaceType === "asset_replacement") {
    reasons.push("Asset replacement themes are validation-only and cannot be imported as executable style config.");
  }
  if (!targetStyleConfigPath || !targetStyleConfigPath.startsWith(".game-polish-lab/styles/")) {
    reasons.push("Target style config path is not a safe generated .game-polish-lab/styles path.");
  }
  const scope = targetStyleConfigPath ? checkVisualScopeGuard({
    operationType: "direct_apply",
    adapterId: input.targetAdapterId,
    surfaceType: input.targetSurfaceType,
    targetId: input.targetId,
    candidatePaths: [targetStyleConfigPath]
  }) : undefined;
  if (scope?.recommendedAction === "block") {
    reasons.push("Scope guard blocked the theme import target.");
  }
  if (scope?.recommendedAction === "warn") {
    warnings.push("Scope guard found non-safe paths; import remains preview/config-only.");
  }
  return {
    ok: reasons.length === 0,
    targetAdapterId: input.targetAdapterId,
    targetSurfaceType: input.targetSurfaceType,
    targetStyleConfigPath,
    rollbackRequired: true,
    reasons,
    warnings
  };
}

export function exportVisualThemeFile(workspaceRoot: string, theme: VisualThemeFile): string {
  const relativePath = safeVisualThemeRelativePath(theme.themeName);
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!absolutePath) {
    throw new Error(`Theme path is not inside workspace: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(theme, null, 2)}\n`, "utf8");
  return relativePath;
}

export function importVisualThemeFile(workspaceRoot: string, theme: VisualThemeFile, plan: VisualThemeImportPlan, now: Date = new Date()): { ok: boolean; changedFiles: string[]; rollbackPaths: string[]; errors: string[] } {
  if (!plan.ok) {
    return { ok: false, changedFiles: [], rollbackPaths: [], errors: plan.reasons };
  }
  const surface = theme.surfaces.find((candidate) => candidate.compatibleSurfaceTypes.includes(plan.targetSurfaceType));
  if (!surface) {
    return { ok: false, changedFiles: [], rollbackPaths: [], errors: [`Theme has no compatible ${plan.targetSurfaceType} payload.`] };
  }
  const absolutePath = resolveWorkspacePath(workspaceRoot, plan.targetStyleConfigPath);
  if (!absolutePath || !plan.targetStyleConfigPath.startsWith(".game-polish-lab/styles/")) {
    return { ok: false, changedFiles: [], rollbackPaths: [], errors: ["Theme import target is not a safe generated style path."] };
  }
  const rollbackPaths: string[] = [];
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
    const rollbackDir = path.join(workspaceRoot, ".game-polish-lab", "rollback");
    fs.mkdirSync(rollbackDir, { recursive: true });
    const rollbackName = buildRollbackSnapshotName(now, plan.targetStyleConfigPath);
    fs.copyFileSync(absolutePath, path.join(rollbackDir, rollbackName));
    rollbackPaths.push(`.game-polish-lab/rollback/${rollbackName}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify({
    schemaVersion: 1,
    surfaceType: plan.targetSurfaceType,
    adapterTarget: `${plan.targetAdapterId}.${plan.targetSurfaceType}`,
    presetName: theme.themeName,
    updatedAt: now.toISOString(),
    values: surface.styleTokens,
    themeSource: {
      sourceAdapterId: theme.sourceAdapterId,
      sourceSurfaceType: surface.surfaceType,
      themeName: theme.themeName
    }
  }, null, 2)}\n`, "utf8");
  return { ok: true, changedFiles: [plan.targetStyleConfigPath], rollbackPaths, errors: [] };
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
