import * as path from "path";
import * as vscode from "vscode";

import {
  analyzeBackgroundDetection,
  analyzeBackgroundStyleConnection,
  BackgroundAdapterDetection,
  BackgroundAdapterState,
  BackgroundFileInspection,
  BackgroundStyleConnection,
  detectBackgroundConnectionType
} from "../../core/backgroundAdapterAnalysis";
import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { buildRollbackSnapshotName } from "../../core/visualSurfaceConfig";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { BackgroundReadabilityStyleConfig, BackgroundReadabilityStyleValues } from "../../types/visualSurface";

export interface BackgroundApplyResult {
  applied: boolean;
  setupRequired: boolean;
  setupOffered: boolean;
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: BackgroundAdapterDetection;
  connection: BackgroundStyleConnection;
}

export interface BackgroundSetupResult {
  setupApplied: boolean;
  intendedFiles: string[];
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: BackgroundAdapterDetection;
  connection: BackgroundStyleConnection;
}

const likelyBackgroundFiles = [
  "src/scenes/FarmScene.ts",
  "src/ui/BackgroundView.ts",
  "src/ui/FarmBackgroundView.ts",
  "src/ui/WorldView.ts",
  "src/rendering/BackgroundRenderer.ts",
  "src/config/backgroundReadabilityStyle.ts"
];

export async function getIdleMonsterFarmBackgroundAdapterState(folder: vscode.WorkspaceFolder): Promise<BackgroundAdapterState> {
  const files = await readLikelyBackgroundFiles(folder);
  const styleModulePath = await resolveSupportedStyleModulePath(folder);
  return {
    target: "idle_monster_farm.background",
    detection: analyzeBackgroundDetection(files, styleModulePath),
    connection: analyzeBackgroundStyleConnection(files, styleModulePath)
  };
}

export async function applyIdleMonsterFarmBackgroundStyle(folder: vscode.WorkspaceFolder, config: BackgroundReadabilityStyleConfig): Promise<BackgroundApplyResult> {
  const state = await getIdleMonsterFarmBackgroundAdapterState(folder);
  const { detection, connection } = state;
  const changedFiles = [detection.supportedStyleModulePath];
  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const styleModuleExists = await pathExists(styleUri);
  const scope = checkV05VisualScope(changedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];

  if (detection.ownerFiles.length === 0 && !styleModuleExists) {
    return blockedResult(detection, connection, warnings, "Direct apply skipped because no safe Idle Monster Farm background target was detected.");
  }
  if (!connection.connected) {
    return {
      ...blockedResult(detection, connection, warnings, "Direct apply skipped because background rendering is not connected to the generated style module/config yet. Use the one-time adapter setup path."),
      setupOffered: true
    };
  }
  if (!scope.ok) {
    return {
      ...blockedResult(detection, connection, warnings, "Direct apply blocked by v0.52 scope guard."),
      blockedFiles: scope.forbiddenFiles,
      setupRequired: false
    };
  }

  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderBackgroundStyleModule(config.values));
  return {
    applied: true,
    setupRequired: false,
    setupOffered: false,
    changedFiles,
    rollbackPaths,
    warnings,
    blockedFiles: [],
    detection,
    connection
  };
}

export async function setupIdleMonsterFarmBackgroundBridge(folder: vscode.WorkspaceFolder, config: BackgroundReadabilityStyleConfig): Promise<BackgroundSetupResult> {
  const state = await getIdleMonsterFarmBackgroundAdapterState(folder);
  const { detection, connection } = state;
  const setupTarget = pickSetupTarget(detection);
  const intendedFiles = setupTarget ? [detection.supportedStyleModulePath, setupTarget] : [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(intendedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];

  if (connection.connected) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup was not needed because background rendering is already connected."],
      blockedFiles: [],
      detection,
      connection
    };
  }
  if (!setupTarget) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup is unavailable because no safe background owner file was detected."],
      blockedFiles: [],
      detection,
      connection
    };
  }
  if (!scope.ok) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings,
      blockedFiles: scope.forbiddenFiles,
      detection,
      connection
    };
  }

  const targetUri = vscode.Uri.joinPath(folder.uri, ...setupTarget.split("/"));
  const existingTargetText = await readTextFile(targetUri);
  const patchedTargetText = connectOwnerFileToStyleModule(existingTargetText, setupTarget, detection.supportedStyleModulePath);
  if (!patchedTargetText) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, `${setupTarget} does not have a safe TypeScript import insertion point for v0.52 setup.`],
      blockedFiles: [],
      detection,
      connection
    };
  }

  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const rollbackPaths = await createRollbackSnapshots(folder, intendedFiles);
  await writeTextFile(styleUri, renderBackgroundStyleModule(config.values));
  await writeTextFile(targetUri, patchedTargetText);
  const updatedState = await getIdleMonsterFarmBackgroundAdapterState(folder);
  return {
    setupApplied: true,
    intendedFiles,
    changedFiles: intendedFiles,
    rollbackPaths,
    warnings,
    blockedFiles: [],
    detection: updatedState.detection,
    connection: updatedState.connection
  };
}

export function summarizeBackgroundApplyResult(folder: vscode.WorkspaceFolder, result: BackgroundApplyResult): string[] {
  return [
    "adapter target: idle_monster_farm.background",
    `direct apply: ${result.applied ? "applied" : "blocked"}`,
    `setup required: ${result.setupRequired ? "yes" : "no"}`,
    `setup offered: ${result.setupOffered ? "yes" : "no"}`,
    `detection: ${result.detection.detected ? "detected" : "not detected"} (${result.detection.confidence})`,
    `owner files: ${result.detection.ownerFiles.length > 0 ? result.detection.ownerFiles.join(", ") : "none"}`,
    `connected: ${result.connection.connected ? "yes" : "no"} (${result.connection.connectionType})`,
    `connected files: ${result.connection.connectedFiles.length > 0 ? result.connection.connectedFiles.join(", ") : "none"}`,
    `changed files: ${result.changedFiles.length > 0 ? result.changedFiles.join(", ") : "none"}`,
    `rollback snapshots: ${result.rollbackPaths.length > 0 ? result.rollbackPaths.join(", ") : "none"}`,
    `workspace: ${toWorkspaceRelativePath(folder, folder.uri)}`,
    ...result.warnings.map((warning) => `warning: ${warning}`),
    ...result.connection.missingPieces.map((piece) => `missing: ${piece}`),
    ...result.blockedFiles.map((file) => `blocked: ${file}`)
  ];
}

async function resolveSupportedStyleModulePath(folder: vscode.WorkspaceFolder): Promise<string> {
  const candidate = "src/config/backgroundReadabilityStyle.ts";
  return await pathExists(vscode.Uri.joinPath(folder.uri, ...candidate.split("/"))) ? candidate : candidate;
}

async function readLikelyBackgroundFiles(folder: vscode.WorkspaceFolder): Promise<BackgroundFileInspection[]> {
  const existingFiles = new Set<string>();
  for (const relativePath of likelyBackgroundFiles) {
    if (await pathExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")))) {
      existingFiles.add(relativePath);
    }
  }
  const pattern = new vscode.RelativePattern(folder, "{src,app}/**/*{Background,Backdrop,Environment,WorldView,FarmScene}*.{ts,tsx,js,jsx}");
  const uris = await vscode.workspace.findFiles(pattern, "**/{node_modules,dist,build,out}/**", 50);
  for (const uri of uris) {
    const relativePath = normalizeWorkspacePath(path.relative(folder.uri.fsPath, uri.fsPath));
    if (!isForbiddenV05Path(relativePath)) {
      existingFiles.add(relativePath);
    }
  }

  const files: BackgroundFileInspection[] = [];
  for (const relativePath of Array.from(existingFiles).sort()) {
    const text = await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")));
    if (text !== undefined) {
      files.push({ relativePath, text });
    }
  }
  return files;
}

async function createRollbackSnapshots(folder: vscode.WorkspaceFolder, relativePaths: string[]): Promise<string[]> {
  await ensureDirectory(labUri(folder, "rollback"));
  const timestamp = new Date();
  const rollbackPaths: string[] = [];
  for (const relativePath of relativePaths) {
    const sourceUri = vscode.Uri.joinPath(folder.uri, ...relativePath.split("/"));
    const existingText = await readTextFileIfExists(sourceUri);
    if (existingText === undefined) {
      continue;
    }
    const fileName = buildRollbackSnapshotName(timestamp, relativePath);
    const rollbackUri = labUri(folder, "rollback", fileName);
    await writeTextFile(rollbackUri, existingText);
    rollbackPaths.push(`.game-polish-lab/rollback/${fileName}`);
  }
  return rollbackPaths;
}

function blockedResult(detection: BackgroundAdapterDetection, connection: BackgroundStyleConnection, warnings: string[], warning: string): BackgroundApplyResult {
  return {
    applied: false,
    setupRequired: true,
    setupOffered: false,
    changedFiles: [],
    rollbackPaths: [],
    warnings: [...warnings, warning],
    blockedFiles: [],
    detection,
    connection
  };
}

function pickSetupTarget(detection: BackgroundAdapterDetection): string | undefined {
  return detection.ownerFiles.find((file) => /Background|Backdrop|Environment|WorldView|FarmScene/.test(file));
}

function connectOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  if (detectBackgroundConnectionType(text, styleModulePath) !== "none") {
    return text;
  }
  if (!/\.(ts|tsx)$/.test(ownerPath)) {
    return undefined;
  }
  const importLine = `import { BACKGROUND_READABILITY_STYLE } from "${relativeImportPath(ownerPath, styleModulePath)}";`;
  const lines = text.split(/\r?\n/);
  const lastImportIndex = lines.reduce((latest, line, index) => line.startsWith("import ") ? index : latest, -1);
  if (lastImportIndex < 0) {
    return undefined;
  }
  lines.splice(lastImportIndex + 1, 0, importLine, "// Game Polish Lab v0.52 bridge: renderer should read BACKGROUND_READABILITY_STYLE for visual-only background values.");
  return lines.join("\n");
}

function relativeImportPath(fromPath: string, toPath: string): string {
  const fromDir = path.posix.dirname(fromPath.replace(/\\/g, "/"));
  const target = toPath.replace(/\\/g, "/").replace(/\.ts$/, "");
  let relativePath = path.posix.relative(fromDir, target);
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

function renderBackgroundStyleModule(values: BackgroundReadabilityStyleValues): string {
  return `// Generated by Game Polish Lab v0.52. Visual style values only.
export interface BackgroundReadabilityStyle {
  backgroundColor: string;
  backgroundImageOpacity: number;
  contrastOverlayColor: string;
  contrastOverlayOpacity: number;
  vignetteStrength: number;
  patternOpacity: number;
  blurAmount: number;
  brightness: number;
  contrast: number;
}

export const BACKGROUND_READABILITY_STYLE: BackgroundReadabilityStyle = ${JSON.stringify(values, null, 2)};
`;
}
