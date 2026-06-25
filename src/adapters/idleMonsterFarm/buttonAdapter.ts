import * as path from "path";
import * as vscode from "vscode";

import {
  analyzeButtonDetection,
  analyzeButtonStyleConnection,
  ButtonAdapterDetection,
  ButtonAdapterState,
  ButtonFileInspection,
  ButtonStyleConnection,
  detectButtonConnectionType
} from "../../core/buttonAdapterAnalysis";
import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { buildRollbackSnapshotName } from "../../core/visualSurfaceConfig";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { ButtonStyleConfig, ButtonStyleValues } from "../../types/visualSurface";

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

  if (detection.ownerFiles.length === 0 && !styleModuleExists) {
    return blockedResult(detection, connection, warnings, "Direct apply skipped because no safe Idle Monster Farm button/action-bar target was detected.");
  }
  if (!connection.connected) {
    return {
      ...blockedResult(detection, connection, warnings, "Direct apply skipped because button rendering is not connected to the generated button style module/config yet. Use the one-time adapter setup path."),
      setupOffered: true
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
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderButtonStyleModule(config.values));
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

export async function setupIdleMonsterFarmButtonBridge(folder: vscode.WorkspaceFolder, config: ButtonStyleConfig): Promise<ButtonSetupResult> {
  const state = await getIdleMonsterFarmButtonAdapterState(folder);
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
  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const rollbackPaths = await createRollbackSnapshots(folder, intendedFiles);
  await writeTextFile(styleUri, renderButtonStyleModule(config.values));
  await writeTextFile(targetUri, patchedTargetText);
  const updatedState = await getIdleMonsterFarmButtonAdapterState(folder);
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

function pickSetupTarget(detection: ButtonAdapterDetection): string | undefined {
  return detection.ownerFiles.find((file) => /ActionBar|Button|Controls|HatchPanel|UpgradePanel|FarmScene/.test(file));
}

function connectOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  if (detectButtonConnectionType(text, styleModulePath) !== "none") {
    return text;
  }
  if (!/\.(ts|tsx)$/.test(ownerPath)) {
    return undefined;
  }
  const importLine = `import { BUTTON_STYLE } from "${relativeImportPath(ownerPath, styleModulePath)}";`;
  const lines = text.split(/\r?\n/);
  const lastImportIndex = lines.reduce((latest, line, index) => line.startsWith("import ") ? index : latest, -1);
  if (lastImportIndex < 0) {
    return undefined;
  }
  lines.splice(lastImportIndex + 1, 0, importLine, "// Game Polish Lab v0.56 bridge: renderer should read BUTTON_STYLE for visual-only button values.");
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

function renderButtonStyleModule(values: ButtonStyleValues): string {
  return `// Generated by Game Polish Lab v0.56. Visual style values only.
export interface ButtonStyle {
  width: number;
  height: number;
  fillColor: string;
  fillOpacity: number;
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  labelColor: string;
  labelTextSize: number;
  iconScale: number;
  labelScale: number;
  contentGap: number;
  paddingX: number;
  paddingY: number;
  hoverGlowStrength: number;
  hoverLift: number;
  activePressScale: number;
  activePressDurationMs: number;
  activeDarkenOpacity: number;
  disabledOpacity: number;
  disabledSaturation: number;
  shadowStrength: number;
  glowStrength: number;
}

export const BUTTON_STYLE: ButtonStyle = ${JSON.stringify(values, null, 2)};
`;
}
