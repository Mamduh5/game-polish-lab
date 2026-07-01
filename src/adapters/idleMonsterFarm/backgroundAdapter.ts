import * as path from "path";
import * as vscode from "vscode";

import {
  analyzeBackgroundDetection,
  analyzeBackgroundStyleConnection,
  analyzePatchedBackgroundSetupConnection,
  BackgroundAdapterDetection,
  BackgroundAdapterState,
  BackgroundFileInspection,
  BackgroundStyleConnection
} from "../../core/backgroundAdapterAnalysis";
import {
  backgroundRuntimeProofIncludesSetupMinimum,
  missingBackgroundRuntimeProofProperties,
  renderBackgroundReadabilityStyleModule
} from "../../core/backgroundRuntimeStyle";
import { connectBackgroundOwnerFileToStyleModule } from "../../core/backgroundStyleBridgePatch";
import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { buildRollbackSnapshotName } from "../../core/visualSurfaceConfig";
import { runtimeProofAllowsDirectApply } from "../../core/visualRuntimeConnectionProof";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { BackgroundReadabilityStyleConfig } from "../../types/visualSurface";

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
  const setupTarget = await pickSetupTarget(folder, detection);

  if (!setupTarget && !styleModuleExists) {
    return blockedResult(detection, connection, warnings, "Direct apply skipped because no safe Idle Monster Farm background target was detected.");
  }
  if (!runtimeProofAllowsDirectApply(connection.runtimeProof)) {
    const setupResult = await setupIdleMonsterFarmBackgroundBridge(folder, config);
    if (!backgroundRuntimeProofIncludesSetupMinimum(setupResult.connection.runtimeProof)) {
      return {
        ...blockedResult(setupResult.detection, setupResult.connection, [...warnings, ...setupResult.warnings], "Direct apply could not install the background connector. Runtime value usage proof is still missing."),
        setupOffered: true,
        rollbackPaths: setupResult.rollbackPaths,
        blockedFiles: setupResult.blockedFiles
      };
    }
    return {
      applied: true,
      setupRequired: false,
      setupOffered: false,
      changedFiles: setupResult.changedFiles,
      rollbackPaths: setupResult.rollbackPaths,
      warnings: [...warnings, ...setupResult.warnings, "One-time background connector was installed before applying runtime style."],
      blockedFiles: setupResult.blockedFiles,
      detection: setupResult.detection,
      connection: setupResult.connection
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
  const existingStyleText = await readTextFileIfExists(styleUri);
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderBackgroundReadabilityStyleModule(config.values));
  const updatedState = await getIdleMonsterFarmBackgroundAdapterState(folder);
  if (!runtimeProofAllowsDirectApply(updatedState.connection.runtimeProof)) {
    await restoreBackgroundStyleSource(styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmBackgroundAdapterState(folder);
    return {
      applied: false,
      setupRequired: true,
      setupOffered: true,
      changedFiles: [],
      rollbackPaths,
      warnings: [...warnings, "Direct apply post-write verification failed; generated background style source was restored before returning."],
      blockedFiles: [],
      detection: restoredState.detection,
      connection: restoredState.connection
    };
  }
  return {
    applied: true,
    setupRequired: false,
    setupOffered: false,
    changedFiles,
    rollbackPaths,
    warnings,
    blockedFiles: [],
    detection: updatedState.detection,
    connection: updatedState.connection
  };
}

export async function setupIdleMonsterFarmBackgroundBridge(folder: vscode.WorkspaceFolder, config: BackgroundReadabilityStyleConfig): Promise<BackgroundSetupResult> {
  const state = await getIdleMonsterFarmBackgroundAdapterState(folder);
  const { detection, connection } = state;
  const setupTarget = await pickSetupTarget(folder, detection);
  const intendedFiles = setupTarget ? [detection.supportedStyleModulePath, setupTarget] : [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(intendedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];

  if (backgroundRuntimeProofIncludesSetupMinimum(connection.runtimeProof)) {
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
  const existingStyleText = await readTextFileIfExists(styleUri);
  const generatedStyleText = renderBackgroundReadabilityStyleModule(config.values);
  const previewConnection = analyzePatchedBackgroundSetupConnection({
    files: await readLikelyBackgroundFiles(folder),
    setupTarget,
    patchedTargetText,
    supportedStyleModulePath: detection.supportedStyleModulePath,
    generatedStyleText
  });
  if (!backgroundRuntimeProofIncludesSetupMinimum(previewConnection.runtimeProof)) {
    const missingProperties = missingBackgroundRuntimeProofProperties(previewConnection.runtimeProof);
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "One-time setup was not written because in-memory background runtime value usage proof was not established.",
        missingProperties.length > 0 ? `Missing runtime proof properties: ${missingProperties.join(", ")}` : ""
      ].filter(Boolean),
      blockedFiles: [],
      detection,
      connection: previewConnection
    };
  }

  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const rollbackPaths = await createRollbackSnapshots(folder, intendedFiles);
  await writeTextFile(styleUri, generatedStyleText);
  await writeTextFile(targetUri, patchedTargetText);
  const updatedState = await getIdleMonsterFarmBackgroundAdapterState(folder);
  if (!backgroundRuntimeProofIncludesSetupMinimum(updatedState.connection.runtimeProof)) {
    const missingProperties = missingBackgroundRuntimeProofProperties(updatedState.connection.runtimeProof);
    await restoreBackgroundSetupSources(targetUri, existingTargetText, styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmBackgroundAdapterState(folder);
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths,
      warnings: [
        ...warnings,
        "One-time setup post-write verification failed; source files were restored before returning.",
        missingProperties.length > 0 ? `Missing runtime proof properties: ${missingProperties.join(", ")}` : ""
      ].filter(Boolean),
      blockedFiles: [],
      detection: restoredState.detection,
      connection: restoredState.connection
    };
  }
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

async function pickSetupTarget(folder: vscode.WorkspaceFolder, detection: BackgroundAdapterDetection): Promise<string | undefined> {
  for (const relativePath of orderBackgroundSetupTargetCandidates(detection.ownerFiles)) {
    const text = await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")));
    if (text === undefined) {
      continue;
    }
    if (connectOwnerFileToStyleModule(text, relativePath, detection.supportedStyleModulePath)) {
      return relativePath;
    }
  }
  return undefined;
}

function connectOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectBackgroundOwnerFileToStyleModule(text, ownerPath, styleModulePath);
}

function orderBackgroundSetupTargetCandidates(ownerFiles: string[]): string[] {
  const score = (file: string): number => {
    if (/src\/ui\/.*(Background|Backdrop|Environment|WorldView)/.test(file)) {
      return 0;
    }
    if (/Background|Backdrop|Environment|WorldView/.test(file)) {
      return 1;
    }
    if (file.includes("src/scenes/FarmScene.ts")) {
      return 2;
    }
    return 3;
  };
  return [...ownerFiles].sort((left, right) => score(left) - score(right) || left.localeCompare(right));
}

async function restoreBackgroundSetupSources(targetUri: vscode.Uri, existingTargetText: string, styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
  await writeTextFile(targetUri, existingTargetText);
  await restoreBackgroundStyleSource(styleUri, existingStyleText);
}

async function restoreBackgroundStyleSource(styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
  if (existingStyleText === undefined) {
    try {
      await vscode.workspace.fs.delete(styleUri, { useTrash: false });
    } catch {
      // Missing generated style files are already restored to the pre-setup state.
    }
    return;
  }
  await writeTextFile(styleUri, existingStyleText);
}
