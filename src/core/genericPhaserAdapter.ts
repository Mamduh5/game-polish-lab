import * as path from "path";
import type * as vscode from "vscode";

import { buildAssetRollbackSnapshotName, validateReplacementAsset } from "./assetReplacement";
import { isForbiddenV05Path } from "./v05VisualScopeGuard";
import { buildVisualDirectApplyPlan, executeVisualDirectApplyPlan } from "./visualDirectApplyTemplates";
import { checkVisualScopeGuard, renderVisualScopeGuardMessage, visualScopeGuardWarnings } from "./visualScopeGuard";
import { buildRollbackSnapshotName } from "./visualSurfaceConfig";
import { ensureVisualRecipeFiles } from "./visualRecipeFiles";
import { getVisualSurfaceRecipe, visualRecipeRelativePath } from "./visualRecipeRegistry";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFileIfExists, writeJsonFile, writeTextFile } from "./workspace";
import { AssetReplacementTarget, VisualSurfaceType } from "../types/visualSurface";

function getVscode(): typeof import("vscode") {
  return require("vscode") as typeof import("vscode");
}

export type GenericPhaserSurfaceType = Exclude<VisualSurfaceType, "asset_replacement">;

export interface GenericPhaserFileInspection {
  relativePath: string;
  text: string;
}

export interface GenericPhaserDetection {
  adapterId: "generic_phaser";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  likelySceneFiles: string[];
  likelyAssetFolders: string[];
  warnings: string[];
}

export interface GenericPhaserManualTarget {
  surfaceType: VisualSurfaceType;
  targetLabel: string;
  selectedFiles: string[];
  assetDestinationFolder?: string;
  directApplyAllowed: boolean;
}

export interface GenericFallbackTask {
  adapterId: "generic_phaser";
  surfaceType: VisualSurfaceType;
  targetLabel: string;
  selectedFiles: string[];
  generatedStyleConfigPath: string;
  generatedStyleModulePath?: string;
  fieldNoteGuidance?: {
    preserve: string[];
    avoid: string[];
    mixed: string[];
  };
  allowedFiles: string[];
  forbiddenFiles: string[];
  codexMayDo: string[];
  codexMustNotDo: string[];
  manualTestChecklist: string[];
}

export interface GenericStyleApplyResult {
  ok: boolean;
  configPath: string;
  generatedStyleModulePath?: string;
  changedFiles: string[];
  rollbackPaths: string[];
  fallbackTaskPath?: string;
  warnings: string[];
  errors: string[];
  checklist: string[];
}

export interface GenericAssetApplyInput {
  fileName: string;
  bytes: Uint8Array;
  assetDestinationFolder: string;
  fieldNoteGuidance?: {
    preserve: string[];
    avoid: string[];
    mixed: string[];
  };
}

const genericStyleFileNames: Record<GenericPhaserSurfaceType, string> = {
  slot_card: "generic-slot-card-style.json",
  background_readability: "generic-background-readability-style.json",
  panel: "generic-panel-style.json",
  reward_toast: "generic-reward-toast-style.json",
  button: "generic-button-style.json"
};

const genericStyleModuleNames: Record<GenericPhaserSurfaceType, string> = {
  slot_card: "genericSlotCardStyle.ts",
  background_readability: "genericBackgroundReadabilityStyle.ts",
  panel: "genericPanelStyle.ts",
  reward_toast: "genericRewardToastStyle.ts",
  button: "genericButtonStyle.ts"
};

const genericStyleExportNames: Record<GenericPhaserSurfaceType, string> = {
  slot_card: "GENERIC_SLOT_CARD_STYLE",
  background_readability: "GENERIC_BACKGROUND_READABILITY_STYLE",
  panel: "GENERIC_PANEL_STYLE",
  reward_toast: "GENERIC_REWARD_TOAST_STYLE",
  button: "GENERIC_BUTTON_STYLE"
};

export function detectGenericPhaserProject(files: GenericPhaserFileInspection[]): GenericPhaserDetection {
  const evidence: string[] = [];
  const likelySceneFiles = new Set<string>();
  const likelyAssetFolders = new Set<string>();
  let strongEvidenceCount = 0;

  for (const file of files) {
    const normalizedPath = file.relativePath.replace(/\\/g, "/");
    const lowerPath = normalizedPath.toLowerCase();
    const lowerText = file.text.toLowerCase();
    if (lowerPath.endsWith("package.json") && lowerText.includes("\"phaser\"")) {
      evidence.push(`${normalizedPath}: package.json dependency references phaser.`);
      strongEvidenceCount += 1;
    }
    if (/from\s+["']phaser["']|import\s+.*phaser/.test(lowerText)) {
      evidence.push(`${normalizedPath}: imports Phaser.`);
      strongEvidenceCount += 1;
    }
    if (/phaser\.scene|extends\s+phaser\.scene/.test(lowerText)) {
      evidence.push(`${normalizedPath}: uses Phaser.Scene.`);
      likelySceneFiles.add(normalizedPath);
      strongEvidenceCount += 1;
    }
    if (/src\/scenes|src\/game|src\/main/.test(lowerPath)) {
      evidence.push(`${normalizedPath}: common Phaser source path.`);
      if (/\.(ts|tsx|js|jsx)$/.test(lowerPath)) {
        likelySceneFiles.add(normalizedPath);
      }
    }
    for (const assetFolder of ["public/assets", "src/assets", "assets"]) {
      if (lowerPath.startsWith(`${assetFolder}/`) || lowerPath === assetFolder) {
        likelyAssetFolders.add(assetFolder);
      }
    }
  }

  const uniqueEvidence = Array.from(new Set(evidence));
  const confidence = strongEvidenceCount >= 2 || Array.from(likelySceneFiles).length >= 2 ? "high" : strongEvidenceCount >= 1 ? "medium" : "low";
  return {
    adapterId: "generic_phaser",
    detected: uniqueEvidence.length > 0,
    confidence,
    evidence: uniqueEvidence,
    likelySceneFiles: Array.from(likelySceneFiles).sort(),
    likelyAssetFolders: Array.from(likelyAssetFolders).sort(),
    warnings: confidence === "low" ? ["Only partial Phaser evidence was found. Use manual file scope carefully."] : []
  };
}

export function shouldOfferGenericPhaserAdapter(input: { knownAdapterDetected: boolean; knownAdapterConfidence?: "high" | "medium" | "low"; manualSelected?: boolean }): boolean {
  return Boolean(input.manualSelected) || !input.knownAdapterDetected || input.knownAdapterConfidence === "low";
}

export function normalizeGenericSelectedFiles(files: string[]): string[] {
  return Array.from(new Set(files.map((file) => normalizeWorkspacePath(file.trim())).filter(Boolean))).sort();
}

export function genericStyleConfigRelativePath(surfaceType: GenericPhaserSurfaceType): string {
  return `.game-polish-lab/styles/${genericStyleFileNames[surfaceType]}`;
}

export function genericGeneratedStyleModulePath(surfaceType: GenericPhaserSurfaceType): string {
  return `src/config/gamePolishLab/${genericStyleModuleNames[surfaceType]}`;
}

export function buildGenericStyleConfig(input: { surfaceType: GenericPhaserSurfaceType; targetLabel: string; selectedFiles: string[]; values: Record<string, string | number | boolean> }): Record<string, unknown> {
  return {
    schemaVersion: 1,
    adapterId: "generic_phaser",
    surfaceType: input.surfaceType,
    targetLabel: input.targetLabel,
    selectedFiles: normalizeGenericSelectedFiles(input.selectedFiles),
    updatedAt: new Date().toISOString(),
    values: input.values
  };
}

export function buildGenericAssetTarget(assetDestinationFolder: string): AssetReplacementTarget {
  return {
    targetId: "monster_art",
    label: "Generic Phaser Asset",
    surfaceType: "asset_replacement",
    expectedKinds: ["generic_phaser_asset"],
    acceptedFileTypes: ["image/png", "image/webp"],
    transparencyRequired: false,
    destinationFolder: normalizeWorkspacePath(assetDestinationFolder),
    assignmentMode: "manual_required",
    directApplySupported: false,
    warnings: ["Generic Phaser copies assets only. Loader/manifest wiring requires a scoped fallback task."]
  };
}

export function buildGenericFallbackTask(input: {
  surfaceType: VisualSurfaceType;
  targetLabel: string;
  selectedFiles: string[];
  generatedStyleConfigPath: string;
  generatedStyleModulePath?: string;
  assetDestinationFolder?: string;
  fieldNoteGuidance?: {
    preserve: string[];
    avoid: string[];
    mixed: string[];
  };
}): { ok: boolean; task?: GenericFallbackTask; errors: string[] } {
  const selectedFiles = normalizeGenericSelectedFiles(input.selectedFiles);
  const errors: string[] = [];
  if (!input.targetLabel.trim()) {
    errors.push("Target label is required.");
  }
  if (selectedFiles.length === 0) {
    errors.push("At least one selected target file is required for a scoped fallback task.");
  }
  if (selectedFiles.some((file) => /[*?]|\.\./.test(file))) {
    errors.push("Selected file scope must be exact files without wildcards or path traversal.");
  }
  const forbiddenSelected = selectedFiles.filter(isForbiddenV05Path);
  if (forbiddenSelected.length > 0) {
    errors.push(`Selected scope includes forbidden files: ${forbiddenSelected.join(", ")}`);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const allowedFiles = [
    input.generatedStyleConfigPath,
    ".game-polish-lab/visual-recipes/*",
    ".game-polish-lab/rollback/*",
    ...(input.generatedStyleModulePath ? [input.generatedStyleModulePath] : []),
    ...(input.assetDestinationFolder ? [`${normalizeWorkspacePath(input.assetDestinationFolder)}/*`] : []),
    ...selectedFiles
  ];
  const forbiddenFiles = [
    "save files",
    "economy files",
    "progression/unlock files",
    "quest files",
    "hatch/merge/upgrade logic files",
    "ad/monetization files",
    "inventory/state files",
    "data model/schema files",
    "level data",
    "gameplay rules",
    "input command/action dispatch files",
    "package scripts/dependency changes"
  ];
  return {
    ok: true,
    errors: [],
    task: {
      adapterId: "generic_phaser",
      surfaceType: input.surfaceType,
      targetLabel: input.targetLabel.trim(),
      selectedFiles,
      generatedStyleConfigPath: input.generatedStyleConfigPath,
      generatedStyleModulePath: input.generatedStyleModulePath,
      fieldNoteGuidance: input.fieldNoteGuidance,
      allowedFiles,
      forbiddenFiles,
      codexMayDo: [
        "Wire the generated visual style config/module into the exact selected rendering files only.",
        "Keep changes visual-only and reversible.",
        "Add no new gameplay behavior.",
        ...((input.fieldNoteGuidance?.preserve ?? []).map((note) => `Preserve prior proven-good visual treatment: ${note}`))
      ],
      codexMustNotDo: [
        "Do not edit files outside the selected file scope.",
        "Do not change loaders/manifests unless the user explicitly adds those files to scope.",
        "Do not change gameplay, save, economy, progression, quest, hatch, merge, upgrade, ads, inventory/state, input dispatch, or package scripts.",
        ...((input.fieldNoteGuidance?.avoid ?? []).map((note) => `Avoid prior failed visual treatment: ${note}`)),
        ...((input.fieldNoteGuidance?.mixed ?? []).map((note) => `Treat prior mixed result carefully: ${note}`))
      ],
      manualTestChecklist: [
        "Phaser project detection result shown",
        "Generic Phaser adapter selected",
        "surface recipe loaded",
        "target file scope selected by user",
        "style config generated",
        "recipe file ensured",
        "generated style module written only if safe/approved",
        "direct writes stayed inside safe paths",
        "fallback task includes exact selected file scope",
        "unsupported loader/manifest changes were not patched automatically",
        "forbidden gameplay/save/economy/progression/ad files were not touched"
      ]
    }
  };
}

export function genericFallbackTaskRelativePath(date: Date, surfaceType: VisualSurfaceType, targetLabel: string, extension = "json"): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `.game-polish-lab/fallback-tasks/${timestamp}-generic-${surfaceType}-${safeTargetLabel(targetLabel)}.${extension}`;
}

export function genericAdapterChecklist(result: { fallbackTaskPath?: string; generatedStyleModulePath?: string; copiedAsset?: boolean }): string[] {
  return [
    "Phaser project detection result shown",
    "Generic Phaser adapter selected",
    "surface recipe loaded",
    "target file scope selected by user",
    "style config generated",
    "recipe file ensured",
    result.generatedStyleModulePath ? "generated style module written only if safe/approved" : "generated style module was not written unless safe/approved",
    "direct writes stayed inside safe paths",
    result.fallbackTaskPath ? "fallback task generated when direct rendering apply was unsafe" : "fallback task was not needed for safe config/module write",
    "fallback task includes exact selected file scope",
    result.copiedAsset ? "asset copied only to selected approved asset folder" : "unsupported loader/manifest changes were not patched automatically",
    "forbidden gameplay/save/economy/progression/ad files were not touched"
  ];
}

export async function getGenericPhaserAdapterState(folder: vscode.WorkspaceFolder): Promise<GenericPhaserDetection> {
  return detectGenericPhaserProject(await readGenericPhaserInspectionFiles(folder));
}

export async function applyGenericPhaserStyle(folder: vscode.WorkspaceFolder, input: {
  surfaceType: GenericPhaserSurfaceType;
  targetLabel: string;
  selectedFiles: string[];
  directApplyAllowed: boolean;
  values: Record<string, string | number | boolean>;
  fieldNoteGuidance?: {
    preserve: string[];
    avoid: string[];
    mixed: string[];
  };
}): Promise<GenericStyleApplyResult> {
  await ensureVisualRecipeFiles(folder);
  const recipe = getVisualSurfaceRecipe(input.surfaceType);
  const configPath = genericStyleConfigRelativePath(input.surfaceType);
  const generatedStyleModulePath = genericGeneratedStyleModulePath(input.surfaceType);
  const selectedFiles = normalizeGenericSelectedFiles(input.selectedFiles);
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!recipe) {
    return failedGenericStyleResult(configPath, [`No visual recipe registered for ${input.surfaceType}.`]);
  }

  const safeWrites = [configPath, visualRecipeRelativePath(recipe.recipeId)];
  const moduleWrites = input.directApplyAllowed ? [generatedStyleModulePath] : [];
  const operationType = input.directApplyAllowed ? "direct_apply" : "fallback_task_generation";
  const scope = checkVisualScopeGuard({
    operationType,
    adapterId: "generic_phaser",
    surfaceType: input.surfaceType,
    targetId: input.targetLabel,
    candidatePaths: [...safeWrites, ...moduleWrites, ...selectedFiles]
  });
  if (scope.recommendedAction === "block") {
    errors.push(`Scope guard blocked Generic Phaser ${operationType}: ${renderVisualScopeGuardMessage(scope)}`);
  }
  warnings.push(...visualScopeGuardWarnings(scope));
  if (errors.length > 0) {
    return failedGenericStyleResult(configPath, errors, warnings);
  }

  const directApplyPlan = buildVisualDirectApplyPlan({
    adapterId: "generic_phaser",
    surfaceType: input.surfaceType,
    targetId: "manual_target",
    targetLabel: input.targetLabel,
    styleConfigPath: configPath,
    candidatePaths: [configPath]
  });
  if (!directApplyPlan.executable) {
    errors.push(`Direct apply template blocked Generic Phaser config write: ${directApplyPlan.blockingReasons.join(" ")}`);
    warnings.push(...directApplyPlan.warnings);
    return failedGenericStyleResult(configPath, errors, warnings);
  }
  const configWrite = executeVisualDirectApplyPlan(folder.uri.fsPath, directApplyPlan, [{
    relativePath: configPath,
    text: `${JSON.stringify(buildGenericStyleConfig({ surfaceType: input.surfaceType, targetLabel: input.targetLabel, selectedFiles, values: input.values }), null, 2)}\n`
  }]);
  if (!configWrite.ok) {
    errors.push(`Direct apply template runner failed Generic Phaser config write: ${configWrite.errors.join(" ")}`);
    warnings.push(...configWrite.warnings);
    return failedGenericStyleResult(configPath, errors, warnings);
  }

  const rollbackPaths = [...configWrite.rollbackPaths];
  const changedFiles = [...configWrite.changedFiles];
  let fallbackTaskPath: string | undefined;
  let modulePath: string | undefined;
  if (input.directApplyAllowed) {
    const vscodeApi = getVscode();
    const moduleUri = vscodeApi.Uri.joinPath(folder.uri, ...generatedStyleModulePath.split("/"));
    rollbackPaths.push(...await createTextRollbackIfNeeded(folder, generatedStyleModulePath, moduleUri));
    await ensureDirectory(vscodeApi.Uri.file(path.dirname(moduleUri.fsPath)));
    await writeTextFile(moduleUri, renderGenericStyleModule(input.surfaceType, input.values));
    changedFiles.push(generatedStyleModulePath);
    modulePath = generatedStyleModulePath;
    warnings.push("Generic Phaser wrote only the generated style module. It did not import the module into unknown rendering files.");
  } else {
    const fallback = buildGenericFallbackTask({
      surfaceType: input.surfaceType,
      targetLabel: input.targetLabel,
      selectedFiles,
      generatedStyleConfigPath: configPath,
      generatedStyleModulePath,
      fieldNoteGuidance: input.fieldNoteGuidance
    });
    if (fallback.ok && fallback.task) {
      fallbackTaskPath = await writeFallbackTask(folder, fallback.task, input.surfaceType, input.targetLabel);
      changedFiles.push(fallbackTaskPath);
    } else {
      errors.push(...fallback.errors);
    }
  }

  return {
    ok: errors.length === 0,
    configPath,
    generatedStyleModulePath: modulePath,
    changedFiles,
    rollbackPaths,
    fallbackTaskPath,
    warnings,
    errors,
    checklist: genericAdapterChecklist({ fallbackTaskPath, generatedStyleModulePath: modulePath })
  };
}

export async function applyGenericPhaserAsset(folder: vscode.WorkspaceFolder, input: GenericAssetApplyInput): Promise<GenericStyleApplyResult> {
  const destinationFolder = normalizeWorkspacePath(input.assetDestinationFolder);
  const target = buildGenericAssetTarget(destinationFolder);
  const validation = validateReplacementAsset({ fileName: input.fileName, bytes: input.bytes }, target);
  const warnings = [...validation.model.validationWarnings, ...target.warnings];
  const errors = [...validation.model.validationErrors];
  if (
    !destinationFolder ||
    destinationFolder.startsWith(".") ||
    /[*?]|\.\./.test(destinationFolder) ||
    /(^|\/)(src|public)?$/.test(destinationFolder) ||
    !/^(src\/assets|public\/assets|assets)(\/|$)/.test(destinationFolder)
  ) {
    errors.push("Select a concrete asset destination folder under src/assets, public/assets, or assets.");
  }
  const destinationPath = validation.model.destinationPath;
  const scope = checkVisualScopeGuard({
    operationType: "direct_apply",
    adapterId: "generic_phaser",
    surfaceType: "asset_replacement",
    targetId: "asset_copy",
    candidatePaths: [destinationPath]
  });
  if (scope.recommendedAction === "block") {
    errors.push(`Scope guard blocked asset copy: ${renderVisualScopeGuardMessage(scope)}`);
  }
  warnings.push(...visualScopeGuardWarnings(scope));
  if (errors.length > 0 || !validation.ok) {
    return failedGenericStyleResult(destinationPath, errors, warnings);
  }
  const vscodeApi = getVscode();
  const destinationUri = vscodeApi.Uri.joinPath(folder.uri, ...destinationPath.split("/"));
  const rollbackPaths = await createBinaryRollbackIfNeeded(folder, destinationPath, destinationUri, "generic_asset");
  await ensureDirectory(vscodeApi.Uri.file(path.dirname(destinationUri.fsPath)));
  await vscodeApi.workspace.fs.writeFile(destinationUri, input.bytes);
  const fallback = buildGenericFallbackTask({
    surfaceType: "asset_replacement",
    targetLabel: "Generic asset loader wiring",
    selectedFiles: [destinationPath],
    generatedStyleConfigPath: destinationPath,
    assetDestinationFolder: destinationFolder,
    fieldNoteGuidance: input.fieldNoteGuidance
  });
  const fallbackTaskPath = fallback.ok && fallback.task ? await writeFallbackTask(folder, fallback.task, "asset_replacement", "asset-loader") : undefined;
  return {
    ok: true,
    configPath: destinationPath,
    changedFiles: fallbackTaskPath ? [destinationPath, fallbackTaskPath] : [destinationPath],
    rollbackPaths,
    fallbackTaskPath,
    warnings,
    errors: [],
    checklist: genericAdapterChecklist({ fallbackTaskPath, copiedAsset: true })
  };
}

async function readGenericPhaserInspectionFiles(folder: vscode.WorkspaceFolder): Promise<GenericPhaserFileInspection[]> {
  const files = new Map<string, string>();
  const vscodeApi = getVscode();
  const packageUri = vscodeApi.Uri.joinPath(folder.uri, "package.json");
  const packageText = await readTextFileIfExists(packageUri);
  if (packageText !== undefined) {
    files.set("package.json", packageText);
  }
  const uris = await vscodeApi.workspace.findFiles(new vscodeApi.RelativePattern(folder, "{src,app,public,assets}/**/*.{ts,tsx,js,jsx,json,png,webp}"), "**/{node_modules,dist,build,out}/**", 120);
  for (const uri of uris) {
    const relativePath = normalizeWorkspacePath(path.relative(folder.uri.fsPath, uri.fsPath));
    if (/\.(png|webp)$/i.test(relativePath)) {
      files.set(relativePath, "");
      continue;
    }
    const text = await readTextFileIfExists(uri);
    if (text !== undefined) {
      files.set(relativePath, text);
    }
  }
  return Array.from(files.entries()).map(([relativePath, text]) => ({ relativePath, text }));
}

async function writeFallbackTask(folder: vscode.WorkspaceFolder, task: GenericFallbackTask, surfaceType: VisualSurfaceType, targetLabel: string): Promise<string> {
  await ensureDirectory(labUri(folder, "fallback-tasks"));
  const relativePath = genericFallbackTaskRelativePath(new Date(), surfaceType, targetLabel);
  const fileName = relativePath.split("/").pop()!;
  await writeJsonFile(labUri(folder, "fallback-tasks", fileName), task);
  return relativePath;
}

async function createTextRollbackIfNeeded(folder: vscode.WorkspaceFolder, relativePath: string, uri: vscode.Uri): Promise<string[]> {
  const existingText = await readTextFileIfExists(uri);
  if (existingText === undefined) {
    return [];
  }
  await ensureDirectory(labUri(folder, "rollback"));
  const fileName = buildRollbackSnapshotName(new Date(), relativePath);
  await writeTextFile(labUri(folder, "rollback", fileName), existingText);
  return [`.game-polish-lab/rollback/${fileName}`];
}

async function createBinaryRollbackIfNeeded(folder: vscode.WorkspaceFolder, relativePath: string, uri: vscode.Uri, targetId: string): Promise<string[]> {
  if (!(await pathExists(uri))) {
    return [];
  }
  const vscodeApi = getVscode();
  await ensureDirectory(labUri(folder, "rollback"));
  const fileName = buildAssetRollbackSnapshotName(new Date(), relativePath, targetId);
  await vscodeApi.workspace.fs.writeFile(labUri(folder, "rollback", fileName), await vscodeApi.workspace.fs.readFile(uri));
  return [`.game-polish-lab/rollback/${fileName}`];
}

function renderGenericStyleModule(surfaceType: GenericPhaserSurfaceType, values: Record<string, string | number | boolean>): string {
  return `// Generated by Game Polish Lab v0.58. Generic Phaser visual style values only.
// This module is not auto-imported into unknown scene files.
export const ${genericStyleExportNames[surfaceType]} = ${JSON.stringify(values, null, 2)};
`;
}

function failedGenericStyleResult(configPath: string, errors: string[], warnings: string[] = []): GenericStyleApplyResult {
  return {
    ok: false,
    configPath,
    changedFiles: [],
    rollbackPaths: [],
    warnings,
    errors,
    checklist: genericAdapterChecklist({})
  };
}

function safeTargetLabel(value: string): string {
  return (value || "target").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "target";
}
