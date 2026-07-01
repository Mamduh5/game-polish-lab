import * as path from "path";
import * as vscode from "vscode";

import {
  analyzePanelDetection,
  analyzePanelStyleConnection,
  analyzePatchedPanelSetupConnection,
  PanelAdapterDetection,
  PanelAdapterState,
  PanelFileInspection,
  PanelStyleConnection
} from "../../core/panelAdapterAnalysis";
import {
  missingPanelRuntimeProofProperties,
  panelRuntimeProofIncludesSetupMinimum,
  renderPanelStyleModule
} from "../../core/panelRuntimeStyle";
import { connectPanelOwnerFileToStyleModule } from "../../core/panelStyleBridgePatch";
import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { buildRollbackSnapshotName } from "../../core/visualSurfaceConfig";
import { runtimeProofAllowsDirectApply } from "../../core/visualRuntimeConnectionProof";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { PanelStyleConfig } from "../../types/visualSurface";

export interface PanelApplyResult {
  applied: boolean;
  setupRequired: boolean;
  setupOffered: boolean;
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: PanelAdapterDetection;
  connection: PanelStyleConnection;
}

export interface PanelSetupResult {
  setupApplied: boolean;
  intendedFiles: string[];
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: PanelAdapterDetection;
  connection: PanelStyleConnection;
}

const likelyPanelFiles = [
  "src/ui/PanelChrome.ts",
  "src/ui/PanelControls.ts",
  "src/ui/NavigationMenuPanelView.ts",
  "src/ui/NavigationControlView.ts",
  "src/ui/HatchPanelView.ts",
  "src/ui/NextQuestWidgetView.ts",
  "src/scenes/FarmScene.ts",
  "src/config/panelStyle.ts"
];

export async function getIdleMonsterFarmPanelAdapterState(folder: vscode.WorkspaceFolder): Promise<PanelAdapterState> {
  const files = await readLikelyPanelFiles(folder);
  const styleModulePath = await resolveSupportedStyleModulePath(folder);
  return {
    target: "idle_monster_farm.panels",
    detection: analyzePanelDetection(files, styleModulePath),
    connection: analyzePanelStyleConnection(files, styleModulePath)
  };
}

export async function applyIdleMonsterFarmPanelStyle(folder: vscode.WorkspaceFolder, config: PanelStyleConfig): Promise<PanelApplyResult> {
  const state = await getIdleMonsterFarmPanelAdapterState(folder);
  const { detection, connection } = state;
  const changedFiles = [detection.supportedStyleModulePath];
  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const styleModuleExists = await pathExists(styleUri);
  const scope = checkV05VisualScope(changedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];
  const setupTarget = await pickSetupTarget(folder, detection);

  if (!setupTarget && !styleModuleExists) {
    return blockedResult(detection, connection, warnings, "Direct apply skipped because no safe Idle Monster Farm panel target was detected.");
  }
  if (!runtimeProofAllowsDirectApply(connection.runtimeProof)) {
    const setupResult = await setupIdleMonsterFarmPanelBridge(folder, config);
    if (!panelRuntimeProofIncludesSetupMinimum(setupResult.connection.runtimeProof)) {
      return {
        ...blockedResult(setupResult.detection, setupResult.connection, [...warnings, ...setupResult.warnings], "Direct apply could not install the panel connector. Runtime value usage proof is still missing."),
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
      warnings: [...warnings, ...setupResult.warnings, "One-time panel connector was installed before applying runtime style."],
      blockedFiles: setupResult.blockedFiles,
      detection: setupResult.detection,
      connection: setupResult.connection
    };
  }
  if (!scope.ok) {
    return {
      ...blockedResult(detection, connection, warnings, "Direct apply blocked by v0.54 scope guard."),
      blockedFiles: scope.forbiddenFiles,
      setupRequired: false
    };
  }

  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const existingStyleText = await readTextFileIfExists(styleUri);
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderPanelStyleModule(config.values));
  const updatedState = await getIdleMonsterFarmPanelAdapterState(folder);
  if (!runtimeProofAllowsDirectApply(updatedState.connection.runtimeProof)) {
    await restorePanelStyleSource(styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmPanelAdapterState(folder);
    return {
      applied: false,
      setupRequired: true,
      setupOffered: true,
      changedFiles: [],
      rollbackPaths,
      warnings: [...warnings, "Direct apply post-write verification failed; generated panel style source was restored before returning."],
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

export async function setupIdleMonsterFarmPanelBridge(folder: vscode.WorkspaceFolder, config: PanelStyleConfig): Promise<PanelSetupResult> {
  const state = await getIdleMonsterFarmPanelAdapterState(folder);
  const { detection, connection } = state;
  const setupTarget = await pickSetupTarget(folder, detection);
  const intendedFiles = setupTarget ? [detection.supportedStyleModulePath, setupTarget] : [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(intendedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];

  if (panelRuntimeProofIncludesSetupMinimum(connection.runtimeProof)) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup was not needed because panel rendering is already connected."],
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
      warnings: [...warnings, "One-time setup is unavailable because no safe panel owner file was detected."],
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
      warnings: [...warnings, `${setupTarget} does not have a safe TypeScript import insertion point for v0.54 setup.`],
      blockedFiles: [],
      detection,
      connection
    };
  }

  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const existingStyleText = await readTextFileIfExists(styleUri);
  const generatedStyleText = renderPanelStyleModule(config.values);
  const previewConnection = analyzePatchedPanelSetupConnection({
    files: await readLikelyPanelFiles(folder),
    setupTarget,
    patchedTargetText,
    supportedStyleModulePath: detection.supportedStyleModulePath,
    generatedStyleText
  });
  if (!panelRuntimeProofIncludesSetupMinimum(previewConnection.runtimeProof)) {
    const missingProperties = missingPanelRuntimeProofProperties(previewConnection.runtimeProof);
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "One-time setup was not written because in-memory panel runtime value usage proof was not established.",
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
  const updatedState = await getIdleMonsterFarmPanelAdapterState(folder);
  if (!panelRuntimeProofIncludesSetupMinimum(updatedState.connection.runtimeProof)) {
    const missingProperties = missingPanelRuntimeProofProperties(updatedState.connection.runtimeProof);
    await restorePanelSetupSources(targetUri, existingTargetText, styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmPanelAdapterState(folder);
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

export function summarizePanelApplyResult(folder: vscode.WorkspaceFolder, result: PanelApplyResult): string[] {
  return [
    "adapter target: idle_monster_farm.panels",
    `direct apply: ${result.applied ? "applied" : "blocked"}`,
    `setup required: ${result.setupRequired ? "yes" : "no"}`,
    `setup offered: ${result.setupOffered ? "yes" : "no"}`,
    `detection: ${result.detection.detected ? "detected" : "not detected"} (${result.detection.confidence})`,
    `target panels: ${result.detection.targetPanels.length > 0 ? result.detection.targetPanels.join(", ") : "none"}`,
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
  const candidate = "src/config/panelStyle.ts";
  return await pathExists(vscode.Uri.joinPath(folder.uri, ...candidate.split("/"))) ? candidate : candidate;
}

async function readLikelyPanelFiles(folder: vscode.WorkspaceFolder): Promise<PanelFileInspection[]> {
  const existingFiles = new Set<string>();
  for (const relativePath of likelyPanelFiles) {
    if (await pathExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")))) {
      existingFiles.add(relativePath);
    }
  }
  const pattern = new vscode.RelativePattern(folder, "{src,app}/**/*{Panel,Modal,Navigation,HatchPanel,QuestWidget,PanelChrome,FarmScene}*.{ts,tsx,js,jsx}");
  const uris = await vscode.workspace.findFiles(pattern, "**/{node_modules,dist,build,out}/**", 50);
  for (const uri of uris) {
    const relativePath = normalizeWorkspacePath(path.relative(folder.uri.fsPath, uri.fsPath));
    if (!isForbiddenV05Path(relativePath)) {
      existingFiles.add(relativePath);
    }
  }

  const files: PanelFileInspection[] = [];
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

function blockedResult(detection: PanelAdapterDetection, connection: PanelStyleConnection, warnings: string[], warning: string): PanelApplyResult {
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

async function pickSetupTarget(folder: vscode.WorkspaceFolder, detection: PanelAdapterDetection): Promise<string | undefined> {
  for (const relativePath of orderPanelSetupTargetCandidates(detection.ownerFiles)) {
    const text = await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")));
    if (text !== undefined && connectOwnerFileToStyleModule(text, relativePath, detection.supportedStyleModulePath)) {
      return relativePath;
    }
  }
  return undefined;
}

function connectOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectPanelOwnerFileToStyleModule(text, ownerPath, styleModulePath);
}

function orderPanelSetupTargetCandidates(ownerFiles: string[]): string[] {
  const score = (file: string): number => file.includes("PanelChrome") ? 0 : /Panel|Widget|Navigation/.test(file) ? 1 : file.includes("FarmScene") ? 2 : 3;
  return [...ownerFiles].sort((left, right) => score(left) - score(right) || left.localeCompare(right));
}

async function restorePanelSetupSources(targetUri: vscode.Uri, existingTargetText: string, styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
  await writeTextFile(targetUri, existingTargetText);
  await restorePanelStyleSource(styleUri, existingStyleText);
}

async function restorePanelStyleSource(styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
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
