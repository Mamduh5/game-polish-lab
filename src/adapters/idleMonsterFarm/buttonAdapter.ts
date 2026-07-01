import * as path from "path";
import * as vscode from "vscode";

import {
  analyzeButtonDetection,
  analyzeButtonStyleConnection,
  analyzePatchedButtonSetupConnection,
  ButtonAdapterDetection,
  ButtonAdapterState,
  ButtonFileInspection,
  ButtonStyleConnection
} from "../../core/buttonAdapterAnalysis";
import {
  buttonRuntimeProofIncludesSetupMinimum,
  missingButtonRuntimeProofProperties,
  renderButtonStyleModule
} from "../../core/buttonRuntimeStyle";
import { connectButtonOwnerFileToStyleModule } from "../../core/buttonStyleBridgePatch";
import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { buildRollbackSnapshotName } from "../../core/visualSurfaceConfig";
import { runtimeProofAllowsDirectApply } from "../../core/visualRuntimeConnectionProof";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { ButtonStyleConfig } from "../../types/visualSurface";

export interface ButtonApplyResult {
  applied: boolean;
  setupRequired: boolean;
  setupOffered: boolean;
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: ButtonAdapterDetection;
  connection: ButtonStyleConnection;
}

export interface ButtonSetupResult {
  setupApplied: boolean;
  intendedFiles: string[];
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: ButtonAdapterDetection;
  connection: ButtonStyleConnection;
}

const likelyButtonFiles = [
  "src/ui/GameplayActionBarView.ts",
  "src/ui/HatchPanelView.ts",
  "src/ui/UpgradePanelView.ts",
  "src/ui/UpgradePanel.ts",
  "src/ui/PanelControls.ts",
  "src/ui/ButtonView.ts",
  "src/scenes/FarmScene.ts",
  "src/config/buttonStyle.ts"
];

export async function getIdleMonsterFarmButtonAdapterState(folder: vscode.WorkspaceFolder): Promise<ButtonAdapterState> {
  const files = await readLikelyButtonFiles(folder);
  const styleModulePath = await resolveSupportedStyleModulePath(folder);
  return {
    target: "idle_monster_farm.buttons",
    detection: analyzeButtonDetection(files, styleModulePath),
    connection: analyzeButtonStyleConnection(files, styleModulePath)
  };
}

export async function applyIdleMonsterFarmButtonStyle(folder: vscode.WorkspaceFolder, config: ButtonStyleConfig): Promise<ButtonApplyResult> {
  const state = await getIdleMonsterFarmButtonAdapterState(folder);
  const { detection, connection } = state;
  const changedFiles = [detection.supportedStyleModulePath];
  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const styleModuleExists = await pathExists(styleUri);
  const scope = checkV05VisualScope(changedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];
  const setupTarget = await pickSetupTarget(folder, detection);

  if (!setupTarget && !styleModuleExists) {
    return blockedResult(detection, connection, warnings, "Direct apply skipped because no safe Idle Monster Farm button/action-bar target was detected.");
  }
  if (!runtimeProofAllowsDirectApply(connection.runtimeProof)) {
    const setupResult = await setupIdleMonsterFarmButtonBridge(folder, config);
    if (!buttonRuntimeProofIncludesSetupMinimum(setupResult.connection.runtimeProof)) {
      return {
        ...blockedResult(setupResult.detection, setupResult.connection, [...warnings, ...setupResult.warnings], "Direct apply could not install the button connector. Runtime value usage proof is still missing."),
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
      warnings: [...warnings, ...setupResult.warnings, "One-time button connector was installed before applying runtime style."],
      blockedFiles: setupResult.blockedFiles,
      detection: setupResult.detection,
      connection: setupResult.connection
    };
  }
  if (!scope.ok) {
    return {
      ...blockedResult(detection, connection, warnings, "Direct apply blocked by v0.56 scope guard."),
      blockedFiles: scope.forbiddenFiles,
      setupRequired: false
    };
  }

  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const existingStyleText = await readTextFileIfExists(styleUri);
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderButtonStyleModule(config.values));
  const updatedState = await getIdleMonsterFarmButtonAdapterState(folder);
  if (!runtimeProofAllowsDirectApply(updatedState.connection.runtimeProof)) {
    await restoreButtonStyleSource(styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmButtonAdapterState(folder);
    return {
      applied: false,
      setupRequired: true,
      setupOffered: true,
      changedFiles: [],
      rollbackPaths,
      warnings: [...warnings, "Direct apply post-write verification failed; generated button style source was restored before returning."],
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

export async function setupIdleMonsterFarmButtonBridge(folder: vscode.WorkspaceFolder, config: ButtonStyleConfig): Promise<ButtonSetupResult> {
  const state = await getIdleMonsterFarmButtonAdapterState(folder);
  const { detection, connection } = state;
  const setupTarget = await pickSetupTarget(folder, detection);
  const intendedFiles = setupTarget ? [detection.supportedStyleModulePath, setupTarget] : [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(intendedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];

  if (buttonRuntimeProofIncludesSetupMinimum(connection.runtimeProof)) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup was not needed because button rendering is already connected."],
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
      warnings: [...warnings, "One-time setup is unavailable because no safe button/action-bar owner file was detected."],
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
      warnings: [...warnings, `${setupTarget} does not have a safe TypeScript import insertion point for v0.56 setup.`],
      blockedFiles: [],
      detection,
      connection
    };
  }

  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const existingStyleText = await readTextFileIfExists(styleUri);
  const generatedStyleText = renderButtonStyleModule(config.values);
  const previewConnection = analyzePatchedButtonSetupConnection({
    files: await readLikelyButtonFiles(folder),
    setupTarget,
    patchedTargetText,
    supportedStyleModulePath: detection.supportedStyleModulePath,
    generatedStyleText
  });
  if (!buttonRuntimeProofIncludesSetupMinimum(previewConnection.runtimeProof)) {
    const missingProperties = missingButtonRuntimeProofProperties(previewConnection.runtimeProof);
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "One-time setup was not written because in-memory button runtime value usage proof was not established.",
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
  const updatedState = await getIdleMonsterFarmButtonAdapterState(folder);
  if (!buttonRuntimeProofIncludesSetupMinimum(updatedState.connection.runtimeProof)) {
    const missingProperties = missingButtonRuntimeProofProperties(updatedState.connection.runtimeProof);
    await restoreButtonSetupSources(targetUri, existingTargetText, styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmButtonAdapterState(folder);
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

export function summarizeButtonApplyResult(folder: vscode.WorkspaceFolder, result: ButtonApplyResult): string[] {
  return [
    "adapter target: idle_monster_farm.buttons",
    `direct apply: ${result.applied ? "applied" : "blocked"}`,
    `setup required: ${result.setupRequired ? "yes" : "no"}`,
    `setup offered: ${result.setupOffered ? "yes" : "no"}`,
    `detection: ${result.detection.detected ? "detected" : "not detected"} (${result.detection.confidence})`,
    `target buttons: ${result.detection.targetButtons.length > 0 ? result.detection.targetButtons.join(", ") : "none"}`,
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
  const candidate = "src/config/buttonStyle.ts";
  return await pathExists(vscode.Uri.joinPath(folder.uri, ...candidate.split("/"))) ? candidate : candidate;
}

async function readLikelyButtonFiles(folder: vscode.WorkspaceFolder): Promise<ButtonFileInspection[]> {
  const existingFiles = new Set<string>();
  for (const relativePath of likelyButtonFiles) {
    if (await pathExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")))) {
      existingFiles.add(relativePath);
    }
  }
  const pattern = new vscode.RelativePattern(folder, "{src,app}/**/*{Button,ActionBar,Controls,HatchPanel,UpgradePanel,FarmScene}*.{ts,tsx,js,jsx}");
  const uris = await vscode.workspace.findFiles(pattern, "**/{node_modules,dist,build,out}/**", 50);
  for (const uri of uris) {
    const relativePath = normalizeWorkspacePath(path.relative(folder.uri.fsPath, uri.fsPath));
    if (!isForbiddenV05Path(relativePath)) {
      existingFiles.add(relativePath);
    }
  }

  const files: ButtonFileInspection[] = [];
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

function blockedResult(detection: ButtonAdapterDetection, connection: ButtonStyleConnection, warnings: string[], warning: string): ButtonApplyResult {
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

async function pickSetupTarget(folder: vscode.WorkspaceFolder, detection: ButtonAdapterDetection): Promise<string | undefined> {
  for (const relativePath of orderButtonSetupTargetCandidates(detection.ownerFiles)) {
    const text = await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")));
    if (text !== undefined && connectOwnerFileToStyleModule(text, relativePath, detection.supportedStyleModulePath)) {
      return relativePath;
    }
  }
  return undefined;
}

function connectOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectButtonOwnerFileToStyleModule(text, ownerPath, styleModulePath);
}

function orderButtonSetupTargetCandidates(ownerFiles: string[]): string[] {
  const score = (file: string): number => /GameplayActionBarView|Button|Controls/.test(file) ? 0 : /HatchPanel|UpgradePanel/.test(file) ? 1 : file.includes("FarmScene") ? 2 : 3;
  return [...ownerFiles].sort((left, right) => score(left) - score(right) || left.localeCompare(right));
}

async function restoreButtonSetupSources(targetUri: vscode.Uri, existingTargetText: string, styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
  await writeTextFile(targetUri, existingTargetText);
  await restoreButtonStyleSource(styleUri, existingStyleText);
}

async function restoreButtonStyleSource(styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
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
