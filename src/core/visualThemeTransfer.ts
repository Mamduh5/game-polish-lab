import * as fs from "fs";
import * as path from "path";

import { buildRollbackSnapshotName } from "./visualSurfaceConfig";
import { checkVisualScopeGuard } from "./visualScopeGuard";
import { getVisualGameAdapter, getVisualGameAdapterSurfaceTargets } from "./visualGameAdapters";
import { VisualDirectApplyAdapterId } from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";
import {
  VisualThemeAdapterImportResult,
  VisualThemeFile,
  VisualThemeGenericSurfaceType,
  VisualThemeImportPlan,
  VisualThemeIndexEntry,
  VisualThemeIndexFile,
  VisualThemeSurfacePayload
} from "../types/visualTheme";

export const visualThemeSchemaVersion = "visual-theme/v1";
export const visualThemeIndexSchemaVersion = "visual-theme-index/v1";
export const visualThemeFolderRelativePath = ".game-polish-lab/themes";
export const visualThemeIndexRelativePath = `${visualThemeFolderRelativePath}/index.json`;

const adapterLabels: Record<VisualDirectApplyAdapterId, string> = {
  idle_monster_farm: "Idle Monster Farm",
  generic_phaser: "Generic Phaser",
  sort_puzzle: "Sort Puzzle",
  cursor_arena: "Cursor Arena"
};

const forbiddenThemeKeyTerms = [
  "save",
  "savestate",
  "persistence",
  "economy",
  "currency",
  "balance",
  "progression",
  "unlock",
  "upgradecost",
  "upgradeeffect",
  "enemyhp",
  "enemyhealth",
  "enemyspeed",
  "enemydamage",
  "spawnrate",
  "damage",
  "leveldata",
  "rule",
  "rules",
  "solver",
  "undo",
  "hint",
  "monetization",
  "rewardedad",
  "ads",
  "analytics",
  "playercontroller",
  "projectile",
  "autoshooter"
];

const visualTokenAllowList: Partial<Record<VisualThemeGenericSurfaceType, string[]>> = {
  slot_card: ["width", "height", "gap", "border", "corner", "fill", "glow", "shadow", "opacity", "scale", "offset", "outline", "shelf", "slot", "display"],
  panel: ["fill", "opacity", "border", "corner", "header", "padding", "gap", "divider", "shadow", "glow", "text", "disabled"],
  button: ["width", "height", "fill", "opacity", "border", "corner", "label", "icon", "gap", "padding", "hover", "active", "disabled", "shadow", "glow"],
  hud: ["fill", "opacity", "border", "corner", "header", "padding", "gap", "divider", "shadow", "glow", "text", "disabled", "hud"],
  reward_toast: ["duration", "rise", "scale", "bounce", "fade", "sparkle", "text", "icon", "toast", "fill", "opacity", "border", "corner", "shadow", "glow"],
  background_readability: ["background", "opacity", "contrast", "overlay", "vignette", "pattern", "blur", "brightness", "readability"],
  impact_feedback: ["duration", "scale", "sparkle", "text", "glow", "hit", "miss", "kill", "combo", "feedback", "shake", "alpha", "opacity", "color"],
  asset_replacement: ["asset", "presentation", "scale", "offset", "opacity", "metadata"]
};

export function safeVisualThemeId(themeName: string): string {
  return themeName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "visual-theme";
}

export function safeVisualThemeRelativePath(themeNameOrId: string): string {
  return `${visualThemeFolderRelativePath}/${safeVisualThemeId(themeNameOrId)}.json`;
}

export function buildVisualThemeFile(input: {
  themeId?: string;
  themeName: string;
  sourceAdapterId: VisualDirectApplyAdapterId;
  sourceAdapterLabel?: string;
  sourceWorkspaceLabel?: string;
  surfaces: Array<{
    surfaceId?: string;
    surfaceType: VisualThemeGenericSurfaceType;
    sourceSurfaceType?: VisualSurfaceType;
    sourceTargetId?: string;
    sourceTargetLabel?: string;
    styleConfigPath?: string;
    styleConfigEntries?: Record<string, unknown>;
    styleTokens: Record<string, unknown>;
    adapterSpecificConfig?: Record<string, unknown>;
    limitations?: string[];
    validationWarnings?: string[];
  }>;
  createdAt?: Date;
  notes?: string;
  exportSource?: "style_config" | "dashboard_row" | "manual_tokens";
}): VisualThemeFile {
  const themeId = safeVisualThemeId(input.themeId ?? input.themeName);
  const createdAt = (input.createdAt ?? new Date()).toISOString();
  const surfaces = input.surfaces.map((surface, index): VisualThemeSurfacePayload => {
    const genericSurfaceType = normalizeThemeSurfaceType(surface.surfaceType, surface.sourceTargetId);
    const normalizedStyleTokens = normalizeStyleTokens(surface.styleTokens, genericSurfaceType);
    const validationWarnings = [
      ...forbiddenKeyWarnings(surface.styleTokens, `surfaces[${index}].styleTokens`),
      ...forbiddenKeyWarnings(surface.styleConfigEntries ?? {}, `surfaces[${index}].styleConfigEntries`),
      ...(surface.validationWarnings ?? [])
    ];
    return {
      surfaceId: surface.surfaceId ?? `${themeId}-${genericSurfaceType}-${index + 1}`,
      surfaceType: genericSurfaceType,
      sourceSurfaceType: surface.sourceSurfaceType ?? toVisualSurfaceType(surface.surfaceType),
      sourceTargetId: surface.sourceTargetId,
      sourceTargetLabel: surface.sourceTargetLabel,
      styleConfigPath: surface.styleConfigPath,
      styleConfigEntries: surface.styleConfigEntries ? cloneObjectWithoutForbiddenKeys(surface.styleConfigEntries) : normalizedStyleTokens,
      styleTokens: normalizedStyleTokens,
      normalizedStyleTokens,
      compatibleSurfaceTypes: compatibleTargetSurfaceTypes(genericSurfaceType),
      compatibleGenericSurfaceTypes: compatibleGenericSurfaceTypes(genericSurfaceType),
      adapterSpecificConfig: surface.adapterSpecificConfig ? cloneObjectWithoutForbiddenKeys(surface.adapterSpecificConfig) : undefined,
      adapterMappings: buildAdapterMappings(genericSurfaceType),
      limitations: genericSurfaceType === "asset_replacement"
        ? ["Asset presentation metadata is validation-only and non-executable unless an existing asset path explicitly supports the target."]
        : surface.limitations ?? [],
      validationWarnings
    };
  });
  const sourceSurfaceIds = Array.from(new Set(surfaces.map((surface) => surface.sourceSurfaceType).filter((value): value is VisualSurfaceType => Boolean(value))));
  const genericSurfaceTypes = Array.from(new Set(surfaces.map((surface) => surface.surfaceType)));
  const compatibleSurfaceIds = Array.from(new Set(surfaces.flatMap((surface) => surface.compatibleSurfaceTypes)));
  const validationWarnings = Array.from(new Set(surfaces.flatMap((surface) => surface.validationWarnings)));
  return {
    schemaVersion: visualThemeSchemaVersion,
    themeId,
    themeName: input.themeName,
    themeVersion: "1.0.0",
    sourceAdapterId: input.sourceAdapterId,
    sourceAdapterLabel: input.sourceAdapterLabel ?? adapterLabels[input.sourceAdapterId],
    sourceWorkspaceLabel: input.sourceWorkspaceLabel,
    sourceSurfaceIds,
    genericSurfaceTypes,
    compatibleSurfaceIds,
    compatibleGenericSurfaceTypes: Array.from(new Set(surfaces.flatMap((surface) => surface.compatibleGenericSurfaceTypes))),
    surfaces,
    createdAt,
    notes: input.notes,
    validationWarnings,
    limitations: [
      "Theme import writes generated Game Polish Lab style configs only.",
      "Theme import does not patch source gameplay code or claim runtime integration.",
      "Gameplay, save, economy, progression, level/rule/solver, enemy balance, upgrade, ad, and monetization data are not part of theme payloads."
    ],
    exportMetadata: {
      exportedBy: "game-polish-lab",
      exportedAt: createdAt,
      exportSource: input.exportSource ?? "manual_tokens",
      sourceConfigPaths: Array.from(new Set(surfaces.map((surface) => surface.styleConfigPath).filter((value): value is string => Boolean(value)))).sort()
    }
  };
}

export function validateVisualThemeFile(value: unknown): { ok: boolean; theme?: VisualThemeFile; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const theme = value as Partial<VisualThemeFile>;
  if (!theme || typeof theme !== "object") {
    return { ok: false, errors: ["Theme payload must be an object."], warnings };
  }
  if (theme.schemaVersion !== visualThemeSchemaVersion) {
    errors.push(`Unsupported theme schema version: ${String(theme.schemaVersion)}.`);
  }
  if (!theme.themeId || typeof theme.themeId !== "string") {
    errors.push("Theme id is required.");
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
  for (const [index, surface] of (theme.surfaces ?? []).entries()) {
    if (!surface.surfaceId || typeof surface.surfaceId !== "string") {
      errors.push(`Theme surface ${index + 1} id is required.`);
    }
    if (!surface.surfaceType) {
      errors.push(`Theme surface ${index + 1} type is required.`);
    }
    if (!surface.normalizedStyleTokens || typeof surface.normalizedStyleTokens !== "object" || Array.isArray(surface.normalizedStyleTokens)) {
      errors.push(`Theme surface ${String(surface.surfaceType)} must include normalized style tokens.`);
    }
    warnings.push(...forbiddenKeyWarnings(surface.normalizedStyleTokens, `surface ${surface.surfaceId}`));
    warnings.push(...forbiddenKeyWarnings(surface.styleTokens, `surface ${surface.surfaceId}`));
    warnings.push(...(surface.validationWarnings ?? []));
  }
  warnings.push(...(theme.validationWarnings ?? []));
  const uniqueWarnings = Array.from(new Set(warnings));
  return { ok: errors.length === 0, theme: errors.length === 0 ? theme as VisualThemeFile : undefined, errors, warnings: uniqueWarnings };
}

export function exportVisualThemeFromStyleConfigs(workspaceRoot: string, input: {
  themeName: string;
  sourceAdapterId: VisualDirectApplyAdapterId;
  sourceAdapterLabel?: string;
  sourceWorkspaceLabel?: string;
  selections: Array<{ surfaceType?: VisualSurfaceType; targetId?: string; targetLabel?: string; styleConfigPath: string }>;
  createdAt?: Date;
  notes?: string;
  exportSource?: "style_config" | "dashboard_row";
}): { theme: VisualThemeFile; relativePath: string; indexPath: string; warnings: string[] } {
  const surfaces = input.selections.map((selection) => readThemeSurfaceFromStyleConfig(workspaceRoot, input.sourceAdapterId, selection));
  const theme = buildVisualThemeFile({
    themeName: input.themeName,
    sourceAdapterId: input.sourceAdapterId,
    sourceAdapterLabel: input.sourceAdapterLabel,
    sourceWorkspaceLabel: input.sourceWorkspaceLabel,
    surfaces,
    createdAt: input.createdAt,
    notes: input.notes,
    exportSource: input.exportSource ?? "style_config"
  });
  const relativePath = exportVisualThemeFile(workspaceRoot, theme);
  return {
    theme,
    relativePath,
    indexPath: visualThemeIndexRelativePath,
    warnings: theme.validationWarnings
  };
}

export function planVisualThemeImport(theme: VisualThemeFile, input: { targetAdapterId: VisualDirectApplyAdapterId; targetSurfaceType: VisualSurfaceType; targetId?: string }): VisualThemeImportPlan {
  const adapter = getVisualGameAdapter(input.targetAdapterId);
  const target = getVisualGameAdapterSurfaceTargets(input.targetAdapterId, input.targetSurfaceType).find((candidate) => !input.targetId || candidate.targetId === input.targetId);
  return buildImportPlan(theme, {
    targetAdapterId: input.targetAdapterId,
    targetSurfaceType: input.targetSurfaceType,
    targetId: input.targetId ?? target?.targetId,
    targetLabel: target?.displayName
  }, adapter?.getStyleConfigPath(input.targetSurfaceType, input.targetId ?? target?.targetId) ?? "");
}

export function planVisualThemeImportForAdapter(theme: VisualThemeFile, input: { targetAdapterId: VisualDirectApplyAdapterId; targetSurfaceType?: VisualSurfaceType; targetId?: string }): { plans: VisualThemeImportPlan[]; skipped: Array<{ surfaceId: string; surfaceType: VisualThemeGenericSurfaceType; reason: string }> } {
  const targets = getVisualGameAdapterSurfaceTargets(input.targetAdapterId, input.targetSurfaceType)
    .filter((target) => !input.targetId || target.targetId === input.targetId);
  const plans: VisualThemeImportPlan[] = [];
  const matchedSurfaceIds = new Set<string>();
  const usedConfigPaths = new Set<string>();
  for (const target of targets) {
    const adapter = getVisualGameAdapter(input.targetAdapterId);
    const targetStyleConfigPath = adapter?.getStyleConfigPath(target.surfaceType, target.targetId) ?? target.styleConfigPath ?? "";
    const plan = buildImportPlan(theme, {
      targetAdapterId: input.targetAdapterId,
      targetSurfaceType: target.surfaceType,
      targetId: target.targetId,
      targetLabel: target.displayName
    }, targetStyleConfigPath);
    if (plan.ok && !usedConfigPaths.has(plan.targetStyleConfigPath)) {
      plans.push(plan);
      usedConfigPaths.add(plan.targetStyleConfigPath);
      if (plan.sourceSurfaceId) {
        matchedSurfaceIds.add(plan.sourceSurfaceId);
      }
    }
  }
  return {
    plans,
    skipped: theme.surfaces
      .filter((surface) => !matchedSurfaceIds.has(surface.surfaceId))
      .map((surface) => ({ surfaceId: surface.surfaceId, surfaceType: surface.surfaceType, reason: `No compatible ${input.targetAdapterId} target was selected or registered.` }))
  };
}

export function exportVisualThemeFile(workspaceRoot: string, theme: VisualThemeFile, now: Date = new Date(theme.createdAt)): string {
  const relativePath = safeVisualThemeRelativePath(theme.themeId);
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!absolutePath) {
    throw new Error(`Theme path is not inside workspace: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(theme, null, 2)}\n`, "utf8");
  writeVisualThemeIndex(workspaceRoot, theme, relativePath, now);
  return relativePath;
}

export function importVisualThemeFile(workspaceRoot: string, theme: VisualThemeFile, plan: VisualThemeImportPlan, now: Date = new Date()): { ok: boolean; changedFiles: string[]; rollbackPaths: string[]; errors: string[]; warnings: string[] } {
  if (!plan.ok) {
    return { ok: false, changedFiles: [], rollbackPaths: [], errors: plan.reasons, warnings: plan.warnings };
  }
  const surface = plan.sourceSurfaceId
    ? theme.surfaces.find((candidate) => candidate.surfaceId === plan.sourceSurfaceId)
    : findCompatibleThemeSurface(theme, plan.targetAdapterId, plan.targetSurfaceType, plan.targetId);
  if (!surface) {
    return { ok: false, changedFiles: [], rollbackPaths: [], errors: [`Theme has no compatible ${plan.targetSurfaceType} payload.`], warnings: plan.warnings };
  }
  const absolutePath = resolveWorkspacePath(workspaceRoot, plan.targetStyleConfigPath);
  if (!absolutePath || !plan.targetStyleConfigPath.startsWith(".game-polish-lab/styles/")) {
    return { ok: false, changedFiles: [], rollbackPaths: [], errors: ["Theme import target is not a safe generated style path."], warnings: plan.warnings };
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
  fs.writeFileSync(absolutePath, `${JSON.stringify(buildImportedStyleConfig(theme, surface, plan, now), null, 2)}\n`, "utf8");
  return { ok: true, changedFiles: [plan.targetStyleConfigPath], rollbackPaths, errors: [], warnings: plan.warnings };
}

export function importVisualThemeToAdapter(workspaceRoot: string, theme: VisualThemeFile, input: { targetAdapterId: VisualDirectApplyAdapterId; targetSurfaceType?: VisualSurfaceType; targetId?: string; now?: Date }): VisualThemeAdapterImportResult {
  const planned = planVisualThemeImportForAdapter(theme, input);
  const changedFiles: string[] = [];
  const rollbackPaths: string[] = [];
  const imported: VisualThemeImportPlan[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  for (const plan of planned.plans) {
    const result = importVisualThemeFile(workspaceRoot, theme, plan, input.now);
    warnings.push(...result.warnings);
    if (result.ok) {
      changedFiles.push(...result.changedFiles);
      rollbackPaths.push(...result.rollbackPaths);
      imported.push(plan);
    } else {
      errors.push(...result.errors);
    }
  }
  if (planned.plans.length === 0) {
    errors.push(`No compatible ${input.targetAdapterId} theme import targets were found.`);
  }
  return {
    ok: errors.length === 0 && imported.length > 0,
    changedFiles,
    rollbackPaths,
    imported,
    skipped: planned.skipped,
    warnings: Array.from(new Set(warnings)),
    errors: Array.from(new Set(errors))
  };
}

function buildImportPlan(theme: VisualThemeFile, target: { targetAdapterId: VisualDirectApplyAdapterId; targetSurfaceType: VisualSurfaceType; targetId?: string; targetLabel?: string }, targetStyleConfigPath: string): VisualThemeImportPlan {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const adapter = getVisualGameAdapter(target.targetAdapterId);
  const surface = findCompatibleThemeSurface(theme, target.targetAdapterId, target.targetSurfaceType, target.targetId);
  if (!adapter) {
    reasons.push(`Target adapter is not registered: ${target.targetAdapterId}.`);
  }
  if (!surface) {
    reasons.push(`Theme has no compatible ${target.targetSurfaceType} payload.`);
  }
  if (target.targetSurfaceType === "asset_replacement") {
    reasons.push("Asset replacement themes are validation-only and cannot be imported as executable style config.");
  }
  if (!targetStyleConfigPath || !targetStyleConfigPath.startsWith(".game-polish-lab/styles/")) {
    reasons.push("Target style config path is not a safe generated .game-polish-lab/styles path.");
  }
  const scope = targetStyleConfigPath ? checkVisualScopeGuard({
    operationType: "direct_apply",
    adapterId: target.targetAdapterId,
    surfaceType: target.targetSurfaceType,
    targetId: target.targetId,
    candidatePaths: [targetStyleConfigPath]
  }) : undefined;
  if (scope?.recommendedAction === "block") {
    reasons.push("Scope guard blocked the theme import target.");
  }
  if (scope?.recommendedAction === "warn") {
    warnings.push("Scope guard found non-safe paths; import remains preview/config-only.");
  }
  if (surface?.validationWarnings.length) {
    warnings.push(...surface.validationWarnings);
  }
  return {
    ok: reasons.length === 0,
    targetAdapterId: target.targetAdapterId,
    targetSurfaceType: target.targetSurfaceType,
    targetId: target.targetId,
    targetLabel: target.targetLabel,
    targetStyleConfigPath,
    sourceSurfaceId: surface?.surfaceId,
    sourceSurfaceType: surface?.surfaceType,
    rollbackRequired: true,
    reasons,
    warnings: Array.from(new Set(warnings))
  };
}

function readThemeSurfaceFromStyleConfig(workspaceRoot: string, sourceAdapterId: VisualDirectApplyAdapterId, selection: { surfaceType?: VisualSurfaceType; targetId?: string; targetLabel?: string; styleConfigPath: string }) {
  const normalizedPath = normalizeRelativePath(selection.styleConfigPath);
  if (!normalizedPath.startsWith(".game-polish-lab/styles/")) {
    throw new Error(`Theme export can only read Game Polish Lab style configs: ${selection.styleConfigPath}`);
  }
  const absolutePath = resolveWorkspacePath(workspaceRoot, normalizedPath);
  if (!absolutePath || !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    throw new Error(`Style config does not exist: ${selection.styleConfigPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Record<string, unknown>;
  const sourceSurfaceType = selection.surfaceType ?? (typeof parsed.surfaceType === "string" ? parsed.surfaceType as VisualSurfaceType : undefined);
  if (!sourceSurfaceType) {
    throw new Error(`Style config is missing a surface type: ${selection.styleConfigPath}`);
  }
  const values = objectValue(parsed.values) ?? objectValue(parsed.styleTokens) ?? parsed;
  const themeSurfaceType = normalizeThemeSurfaceType(sourceSurfaceType, selection.targetId ?? stringValue(parsed.adapterTarget));
  return {
    surfaceId: `${safeVisualThemeId(selection.targetId ?? selection.targetLabel ?? sourceSurfaceType)}-${themeSurfaceType}`,
    surfaceType: themeSurfaceType,
    sourceSurfaceType,
    sourceTargetId: selection.targetId ?? parseAdapterTargetId(sourceAdapterId, stringValue(parsed.adapterTarget)),
    sourceTargetLabel: selection.targetLabel,
    styleConfigPath: normalizedPath,
    styleConfigEntries: values,
    styleTokens: values,
    adapterSpecificConfig: parsed,
    validationWarnings: forbiddenKeyWarnings(values, normalizedPath)
  };
}

function findCompatibleThemeSurface(theme: VisualThemeFile, targetAdapterId: VisualDirectApplyAdapterId, targetSurfaceType: VisualSurfaceType, targetId?: string): VisualThemeSurfacePayload | undefined {
  return theme.surfaces.find((surface) => isThemeSurfaceCompatibleWithTarget(surface, targetAdapterId, targetSurfaceType, targetId));
}

function isThemeSurfaceCompatibleWithTarget(surface: VisualThemeSurfacePayload, targetAdapterId: VisualDirectApplyAdapterId, targetSurfaceType: VisualSurfaceType, targetId?: string): boolean {
  if (!surface.compatibleSurfaceTypes.includes(targetSurfaceType)) {
    return false;
  }
  if (surface.surfaceType === "asset_replacement") {
    return false;
  }
  if (surface.surfaceType === "hud") {
    return targetSurfaceType === "panel" && (!targetId || targetId.includes("hud") || targetAdapterId === "idle_monster_farm" || targetAdapterId === "generic_phaser");
  }
  if (surface.surfaceType === "impact_feedback") {
    return targetSurfaceType === "reward_toast" && (!targetId || /impact|feedback|hit|miss|kill|combo/.test(targetId));
  }
  if (surface.surfaceType === "panel" && targetSurfaceType === "slot_card") {
    return targetAdapterId === "cursor_arena" && targetId === "upgrade_card";
  }
  return true;
}

function buildImportedStyleConfig(theme: VisualThemeFile, surface: VisualThemeSurfacePayload, plan: VisualThemeImportPlan, now: Date): Record<string, unknown> {
  return {
    schemaVersion: 1,
    surfaceType: plan.targetSurfaceType,
    adapterTarget: `${plan.targetAdapterId}.${plan.targetId ?? plan.targetSurfaceType}`,
    presetName: theme.themeName,
    updatedAt: now.toISOString(),
    values: surface.normalizedStyleTokens,
    importStatus: "config_only",
    runtimeApplied: false,
    themeSource: {
      themeId: theme.themeId,
      themeName: theme.themeName,
      sourceAdapterId: theme.sourceAdapterId,
      sourceAdapterLabel: theme.sourceAdapterLabel,
      sourceSurfaceId: surface.surfaceId,
      sourceSurfaceType: surface.surfaceType,
      sourceStyleConfigPath: surface.styleConfigPath
    },
    limitations: [
      "Imported by Game Polish Lab as generated visual config only.",
      "Runtime/source integration still requires an existing safe direct-apply path or a scoped visual-only fallback task."
    ]
  };
}

function writeVisualThemeIndex(workspaceRoot: string, theme: VisualThemeFile, themePath: string, now: Date): void {
  const absolutePath = resolveWorkspacePath(workspaceRoot, visualThemeIndexRelativePath);
  if (!absolutePath) {
    throw new Error(`Theme index path is not inside workspace: ${visualThemeIndexRelativePath}`);
  }
  const existing = readVisualThemeIndex(workspaceRoot);
  const updatedAt = now.toISOString();
  const withoutTheme = existing.themes.filter((entry) => entry.themeId !== theme.themeId);
  const entry: VisualThemeIndexEntry = {
    themeId: theme.themeId,
    themeName: theme.themeName,
    path: themePath,
    schemaVersion: "visual-theme/v1",
    sourceAdapterId: theme.sourceAdapterId,
    sourceAdapterLabel: theme.sourceAdapterLabel,
    sourceWorkspaceLabel: theme.sourceWorkspaceLabel,
    sourceSurfaceIds: theme.sourceSurfaceIds,
    compatibleSurfaceIds: theme.compatibleSurfaceIds,
    genericSurfaceTypes: theme.genericSurfaceTypes,
    createdAt: theme.createdAt,
    updatedAt
  };
  const next: VisualThemeIndexFile = {
    schemaVersion: visualThemeIndexSchemaVersion,
    updatedAt,
    themes: [...withoutTheme, entry].sort((a, b) => a.themeId.localeCompare(b.themeId))
  };
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

function readVisualThemeIndex(workspaceRoot: string): VisualThemeIndexFile {
  const absolutePath = resolveWorkspacePath(workspaceRoot, visualThemeIndexRelativePath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return { schemaVersion: visualThemeIndexSchemaVersion, updatedAt: new Date(0).toISOString(), themes: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Partial<VisualThemeIndexFile>;
    return parsed.schemaVersion === visualThemeIndexSchemaVersion && Array.isArray(parsed.themes)
      ? parsed as VisualThemeIndexFile
      : { schemaVersion: visualThemeIndexSchemaVersion, updatedAt: new Date(0).toISOString(), themes: [] };
  } catch {
    return { schemaVersion: visualThemeIndexSchemaVersion, updatedAt: new Date(0).toISOString(), themes: [] };
  }
}

function normalizeThemeSurfaceType(surfaceType: VisualThemeGenericSurfaceType, targetId?: string): VisualThemeGenericSurfaceType {
  const normalizedTarget = (targetId ?? "").toLowerCase();
  if (surfaceType === "panel" && normalizedTarget.includes("hud")) {
    return "hud";
  }
  if (surfaceType === "reward_toast" && /impact|feedback|hit|miss|kill|combo/.test(normalizedTarget)) {
    return "impact_feedback";
  }
  return surfaceType;
}

function compatibleTargetSurfaceTypes(surfaceType: VisualThemeGenericSurfaceType): VisualSurfaceType[] {
  const mapping: Record<VisualThemeGenericSurfaceType, VisualSurfaceType[]> = {
    slot_card: ["slot_card"],
    panel: ["panel", "slot_card"],
    button: ["button"],
    hud: ["panel"],
    reward_toast: ["reward_toast"],
    background_readability: ["background_readability"],
    impact_feedback: ["reward_toast"],
    asset_replacement: ["asset_replacement"]
  };
  return mapping[surfaceType];
}

function compatibleGenericSurfaceTypes(surfaceType: VisualThemeGenericSurfaceType): VisualThemeGenericSurfaceType[] {
  if (surfaceType === "hud") {
    return ["hud", "panel"];
  }
  if (surfaceType === "impact_feedback") {
    return ["impact_feedback", "reward_toast"];
  }
  if (surfaceType === "panel") {
    return ["panel", "hud"];
  }
  return [surfaceType];
}

function buildAdapterMappings(surfaceType: VisualThemeGenericSurfaceType) {
  const mappings = adapterIds().map((adapterId) => ({
    adapterId,
    targetSurfaceType: compatibleTargetSurfaceTypes(surfaceType)[0],
    targetIds: getVisualGameAdapterSurfaceTargets(adapterId)
      .filter((target) => isThemeSurfaceCompatibleWithTarget({
        surfaceId: "mapping-preview",
        surfaceType,
        styleConfigEntries: {},
        styleTokens: {},
        normalizedStyleTokens: {},
        compatibleSurfaceTypes: compatibleTargetSurfaceTypes(surfaceType),
        compatibleGenericSurfaceTypes: compatibleGenericSurfaceTypes(surfaceType),
        limitations: [],
        validationWarnings: []
      }, adapterId, target.surfaceType, target.targetId))
      .map((target) => target.targetId)
  })).filter((mapping) => mapping.targetIds.length > 0);
  return mappings;
}

function normalizeStyleTokens(values: Record<string, unknown>, surfaceType: VisualThemeGenericSurfaceType): Record<string, unknown> {
  const allowTerms = visualTokenAllowList[surfaceType] ?? [];
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = key.toLowerCase();
    if (isForbiddenThemeKey(normalizedKey)) {
      continue;
    }
    if (allowTerms.length > 0 && !allowTerms.some((term) => normalizedKey.includes(term))) {
      continue;
    }
    normalized[key] = cloneVisualValue(value);
  }
  return Object.keys(normalized).length > 0 ? normalized : cloneObjectWithoutForbiddenKeys(values);
}

function cloneObjectWithoutForbiddenKeys(values: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!isForbiddenThemeKey(key.toLowerCase())) {
      output[key] = cloneVisualValue(value);
    }
  }
  return output;
}

function cloneVisualValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneVisualValue);
  }
  if (value && typeof value === "object") {
    return cloneObjectWithoutForbiddenKeys(value as Record<string, unknown>);
  }
  return value;
}

function forbiddenKeyWarnings(value: unknown, prefix: string): string[] {
  const warnings: string[] = [];
  collectForbiddenKeyWarnings(value, prefix, warnings);
  return warnings;
}

function collectForbiddenKeyWarnings(value: unknown, prefix: string, warnings: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectForbiddenKeyWarnings(entry, `${prefix}[${index}]`, warnings));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const keyPath = `${prefix}.${key}`;
    if (isForbiddenThemeKey(key.toLowerCase())) {
      warnings.push(`${keyPath} looks like gameplay/economy/save/progression/rules/ad data and is excluded from portable theme intent.`);
    }
    collectForbiddenKeyWarnings(child, keyPath, warnings);
  }
}

function isForbiddenThemeKey(key: string): boolean {
  const compact = key.replace(/[^a-z0-9]/g, "");
  return forbiddenThemeKeyTerms.some((term) => compact.includes(term));
}

function parseAdapterTargetId(adapterId: VisualDirectApplyAdapterId, adapterTarget?: string): string | undefined {
  const prefix = `${adapterId}.`;
  return adapterTarget?.startsWith(prefix) ? adapterTarget.slice(prefix.length) : undefined;
}

function toVisualSurfaceType(surfaceType: VisualThemeGenericSurfaceType): VisualSurfaceType | undefined {
  if (surfaceType === "hud") {
    return "panel";
  }
  if (surfaceType === "impact_feedback") {
    return "reward_toast";
  }
  return surfaceType;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function adapterIds(): VisualDirectApplyAdapterId[] {
  return ["idle_monster_farm", "generic_phaser", "sort_puzzle", "cursor_arena"];
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string | undefined {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    return undefined;
  }
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, ...normalized.split("/"));
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : undefined;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}
