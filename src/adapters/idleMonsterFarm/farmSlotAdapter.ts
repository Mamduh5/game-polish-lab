import * as path from "path";
import * as vscode from "vscode";

import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { connectFarmSlotOwnerFileToStyleModule } from "../../core/farmSlotStyleBridgePatch";
import {
  analyzeFarmSlotDetection,
  analyzeFarmSlotStyleConnection,
  analyzePatchedFarmSlotSetupConnection,
  FarmSlotAdapterDetection,
  FarmSlotAdapterState,
  FarmSlotFileInspection,
  FarmSlotStyleConnection,
  orderFarmSlotSetupTargetCandidates
} from "../../core/farmSlotAdapterAnalysis";
import {
  extractFarmSlotStyleValuesFromModuleIfPresent,
  extractFarmSlotStyleValuesFromSourceText,
  farmSlotRuntimeProofIncludesSetupMinimum,
  missingFarmSlotRuntimeProofProperties,
  renderFarmSlotStyleModule,
  requiredFarmSlotRuntimeProofProperties
} from "../../core/farmSlotRuntimeStyle";
import { runtimeProofAllowsDirectApply, VisualRuntimeConnectionProof } from "../../core/visualRuntimeConnectionProof";
import { buildRollbackSnapshotName, loadSlotCardStyleConfigFromText } from "../../core/visualSurfaceConfig";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { SlotCardStyleConfig } from "../../types/visualSurface";

export interface FarmSlotApplyResult {
  applied: boolean;
  setupRequired: boolean;
  setupOffered: boolean;
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: FarmSlotAdapterDetection;
  connection: FarmSlotStyleConnection;
  runtimeConnectionProof: VisualRuntimeConnectionProof;
}

export interface FarmSlotSetupResult {
  setupApplied: boolean;
  intendedFiles: string[];
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  blockedFiles: string[];
  detection: FarmSlotAdapterDetection;
  connection: FarmSlotStyleConnection;
  fallbackTaskPath?: string;
}

const likelyFarmSlotFiles = [
  "src/scenes/FarmScene.ts",
  "src/ui/FarmSlotView.ts",
  "src/ui/FarmSlotsView.ts",
  "src/ui/FarmGridView.ts",
  "src/rendering/MonsterRenderer.ts",
  "src/config/farmSlotStyle.ts",
  "src/config/farmSlotVisualStyle.ts"
];
const farmSlotConfigOnlyStyleWarning = "gap and cornerRadius are config-only for real Idle Monster Farm farm slots; they are layout-coupled and are not claimed as runtime direct apply.";

export async function detectIdleMonsterFarmFarmSlotAdapter(folder: vscode.WorkspaceFolder): Promise<FarmSlotAdapterDetection> {
  const configPath = await resolveSupportedStyleModulePath(folder);
  return analyzeFarmSlotDetection(await readLikelyFarmSlotFiles(folder), configPath);
}

export async function getIdleMonsterFarmFarmSlotAdapterState(folder: vscode.WorkspaceFolder): Promise<FarmSlotAdapterState> {
  const files = await readLikelyFarmSlotFiles(folder);
  const styleModulePath = await resolveSupportedStyleModulePath(folder);
  const detection = analyzeFarmSlotDetection(files, styleModulePath);
  const connection = analyzeFarmSlotStyleConnection(files, styleModulePath);
  return {
    target: "idle_monster_farm.farm_slots",
    detection,
    connection
  };
}

export async function applyIdleMonsterFarmFarmSlotStyle(folder: vscode.WorkspaceFolder, config: SlotCardStyleConfig): Promise<FarmSlotApplyResult> {
  const state = await getIdleMonsterFarmFarmSlotAdapterState(folder);
  const { detection, connection } = state;
  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const styleModuleExists = await pathExists(styleUri);
  const changedFiles = [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(changedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings, farmSlotConfigOnlyStyleWarning];
  const setupTarget = await pickSetupTarget(folder, detection);

  if (!setupTarget && !styleModuleExists) {
    return {
      applied: false,
      setupRequired: true,
      setupOffered: false,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "Direct apply skipped because this workspace does not look like an Idle Monster Farm target and no supported farm slot style module exists."
      ],
      blockedFiles: [],
      detection,
      connection,
      runtimeConnectionProof: connection.runtimeProof
    };
  }

  if (!runtimeProofAllowsDirectApply(connection.runtimeProof)) {
    const setupResult = await setupIdleMonsterFarmFarmSlotBridge(folder, config);
    const setupConnected =
      setupResult.setupApplied === true &&
      farmSlotRuntimeProofIncludesSetupMinimum(setupResult.connection.runtimeProof);

    if (!setupConnected) {
      return {
        applied: false,
        setupRequired: true,
        setupOffered: true,
        changedFiles: [],
        rollbackPaths: setupResult.rollbackPaths,
        warnings: [
          ...warnings,
          ...setupResult.warnings,
          "Direct apply could not install the farm slot connector. Real FarmScene runtime proof is still missing."
        ],
        blockedFiles: setupResult.blockedFiles,
        detection: setupResult.detection,
        connection: setupResult.connection,
        runtimeConnectionProof: setupResult.connection.runtimeProof
      };
    }

    return {
      applied: true,
      setupRequired: false,
      setupOffered: false,
      changedFiles: setupResult.changedFiles,
      rollbackPaths: setupResult.rollbackPaths,
      warnings: [
        ...warnings,
        ...setupResult.warnings,
        "One-time farm slot connector was installed before applying runtime style."
      ],
      blockedFiles: setupResult.blockedFiles,
      detection: setupResult.detection,
      connection: setupResult.connection,
      runtimeConnectionProof: setupResult.connection.runtimeProof
    };
  }

  if (!scope.ok) {
    return {
      applied: false,
      setupRequired: false,
      setupOffered: false,
      changedFiles: [],
      rollbackPaths: [],
      warnings,
      blockedFiles: scope.forbiddenFiles,
      detection,
      connection,
      runtimeConnectionProof: connection.runtimeProof
    };
  }

  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const existingStyleText = await readTextFileIfExists(styleUri);
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderFarmSlotStyleModule(config.values));
  const updatedState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
  if (!runtimeProofAllowsDirectApply(updatedState.connection.runtimeProof)) {
    await restoreFarmSlotStyleSource(styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
    return {
      applied: false,
      setupRequired: true,
      setupOffered: true,
      changedFiles: [],
      rollbackPaths,
      warnings: [
        ...warnings,
        "Direct apply post-write verification failed; generated style source was restored before returning."
      ],
      blockedFiles: [],
      detection: restoredState.detection,
      connection: restoredState.connection,
      runtimeConnectionProof: restoredState.connection.runtimeProof
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
    connection: updatedState.connection,
    runtimeConnectionProof: updatedState.connection.runtimeProof
  };
}

export async function setupIdleMonsterFarmFarmSlotBridge(folder: vscode.WorkspaceFolder, config: SlotCardStyleConfig, options: { writeFallbackTask?: boolean } = {}): Promise<FarmSlotSetupResult> {
  const writeFallbackTasks = options.writeFallbackTask !== false;
  const state = await getIdleMonsterFarmFarmSlotAdapterState(folder);
  const { detection, connection } = state;
  const setupTarget = await pickSetupTarget(folder, detection);
  const intendedFiles = setupTarget
    ? [detection.supportedStyleModulePath, setupTarget]
    : [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(intendedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings, farmSlotConfigOnlyStyleWarning];

  if (farmSlotRuntimeProofIncludesSetupMinimum(connection.runtimeProof)) {
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup was not needed because farm slot rendering is already connected."],
      blockedFiles: [],
      detection,
      connection
    };
  }

  if (!setupTarget) {
    const fallbackTaskPath = writeFallbackTasks ? await writeFarmSlotFallbackTask(folder, detection, connection, "No safe farm slot owner file was detected for automatic visual wiring.") : undefined;
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup is unavailable because no safe farm slot owner file was detected.", fallbackTaskPath ? `Fallback integration task generated: ${fallbackTaskPath}` : "Fallback integration task was not written during explicit runtime bridge install."],
      blockedFiles: [],
      detection,
      connection,
      fallbackTaskPath
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
    const fallbackTaskPath = writeFallbackTasks ? await writeFarmSlotFallbackTask(folder, detection, connection, `${setupTarget} does not have a recognized visual-only farm slot patch site.`) : undefined;
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, `${setupTarget} does not have a recognized visual-only farm slot patch site for v0.99.4 setup.`, fallbackTaskPath ? `Fallback integration task generated: ${fallbackTaskPath}` : "Fallback integration task was not written during explicit runtime bridge install."],
      blockedFiles: [],
      detection,
      connection,
      fallbackTaskPath
    };
  }

  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  const existingStyleText = await readTextFileIfExists(styleUri);
  const baselineStyle = await resolveFarmSlotSetupBaselineStyle(folder, detection.supportedStyleModulePath, existingStyleText, existingTargetText);
  if (!baselineStyle) {
    const fallbackTaskPath = writeFallbackTasks ? await writeFarmSlotFallbackTask(folder, detection, connection, "Automatic farm slot setup could not extract the current real farm slot style baseline.") : undefined;
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "One-time setup was not written because no existing farm slot style/config/THEME baseline could be extracted without using Game Polish Lab defaults.",
        fallbackTaskPath ? `Fallback integration task generated: ${fallbackTaskPath}` : "Fallback integration task was not written during explicit runtime bridge install."
      ],
      blockedFiles: [],
      detection,
      connection,
      fallbackTaskPath
    };
  }
  const generatedStyleText = existingStyleText ?? renderFarmSlotStyleModule(baselineStyle);
  const previewConnection = analyzePatchedFarmSlotSetupConnection({
    files: await readLikelyFarmSlotFiles(folder),
    setupTarget,
    patchedTargetText,
    supportedStyleModulePath: detection.supportedStyleModulePath,
    generatedStyleText
  });
  if (!farmSlotRuntimeProofIncludesSetupMinimum(previewConnection.runtimeProof)) {
    const missingProperties = missingFarmSlotRuntimeProofProperties(previewConnection.runtimeProof);
    const fallbackTaskPath = writeFallbackTasks ? await writeFarmSlotFallbackTask(folder, detection, previewConnection, "Automatic farm slot setup preview did not produce runtime value usage proof.") : undefined;
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "One-time setup was not written because in-memory runtime value usage proof was not established.",
        missingProperties.length > 0 ? `Missing runtime proof properties: ${missingProperties.join(", ")}` : "",
        fallbackTaskPath ? `Fallback integration task generated: ${fallbackTaskPath}` : "Fallback integration task was not written during explicit runtime bridge install."
      ].filter(Boolean),
      blockedFiles: [],
      detection,
      connection: previewConnection,
      fallbackTaskPath
    };
  }

  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const rollbackPaths = await createRollbackSnapshots(folder, intendedFiles);
  if (existingStyleText === undefined) {
    await writeTextFile(styleUri, generatedStyleText);
  }
  await writeTextFile(targetUri, patchedTargetText);

  const updatedState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
  if (!farmSlotRuntimeProofIncludesSetupMinimum(updatedState.connection.runtimeProof)) {
    const missingProperties = missingFarmSlotRuntimeProofProperties(updatedState.connection.runtimeProof);
    await restoreFarmSlotSetupSources(targetUri, existingTargetText, styleUri, existingStyleText);
    const restoredState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
    const fallbackTaskPath = writeFallbackTasks ? await writeFarmSlotFallbackTask(folder, restoredState.detection, restoredState.connection, "Automatic farm slot setup did not produce runtime value usage proof after source write; source files were restored.") : undefined;
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths,
      warnings: [
        ...warnings,
        "One-time setup post-write verification failed; source files were restored before returning.",
        missingProperties.length > 0 ? `Missing runtime proof properties: ${missingProperties.join(", ")}` : "",
        fallbackTaskPath ? `Fallback integration task generated: ${fallbackTaskPath}` : "Fallback integration task was not written during explicit runtime bridge install."
      ].filter(Boolean),
      blockedFiles: [],
      detection: restoredState.detection,
      connection: restoredState.connection,
      fallbackTaskPath
    };
  }
  const changedFiles = existingStyleText === undefined ? intendedFiles : [setupTarget];
  return {
    setupApplied: true,
    intendedFiles,
    changedFiles,
    rollbackPaths,
    warnings,
    blockedFiles: [],
    detection: updatedState.detection,
    connection: updatedState.connection
  };
}

async function resolveFarmSlotSetupBaselineStyle(folder: vscode.WorkspaceFolder, styleModulePath: string, existingStyleText: string | undefined, ownerText: string): Promise<SlotCardStyleConfig["values"] | undefined> {
  const configLoad = loadSlotCardStyleConfigFromText(await readTextFileIfExists(labUri(folder, "styles", "farm-slot-style.json")));
  if (configLoad.status === "valid") {
    return configLoad.config.values;
  }
  if (existingStyleText !== undefined) {
    const moduleBaseline = extractFarmSlotStyleValuesFromModuleIfPresent(existingStyleText);
    if (moduleBaseline) {
      return moduleBaseline;
    }
  }
  const sourceBaseline = extractFarmSlotStyleValuesFromSourceText(ownerText);
  if (sourceBaseline) {
    return sourceBaseline;
  }

  const fallbackModuleCandidates = [
    styleModulePath === "src/config/farmSlotStyle.ts" ? "src/config/farmSlotVisualStyle.ts" : "src/config/farmSlotStyle.ts"
  ];
  for (const candidate of fallbackModuleCandidates) {
    const text = await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...candidate.split("/")));
    if (text !== undefined) {
      const moduleBaseline = extractFarmSlotStyleValuesFromModuleIfPresent(text);
      if (moduleBaseline) {
        return moduleBaseline;
      }
    }
  }
  return undefined;
}

async function resolveSupportedStyleModulePath(folder: vscode.WorkspaceFolder): Promise<string> {
  const candidates = [
    "src/config/farmSlotStyle.ts",
    "src/config/farmSlotVisualStyle.ts"
  ];
  for (const candidate of candidates) {
    if (await pathExists(vscode.Uri.joinPath(folder.uri, ...candidate.split("/")))) {
      return candidate;
    }
  }
  return "src/config/farmSlotStyle.ts";
}

async function readLikelyFarmSlotFiles(folder: vscode.WorkspaceFolder): Promise<FarmSlotFileInspection[]> {
  const existingFiles = new Set<string>();
  for (const relativePath of likelyFarmSlotFiles) {
    if (await pathExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")))) {
      existingFiles.add(relativePath);
    }
  }
  for (const relativePath of await findLikelyFarmSlotFiles(folder)) {
    existingFiles.add(relativePath);
  }

  const files: FarmSlotFileInspection[] = [];
  for (const relativePath of Array.from(existingFiles).sort()) {
    const text = await readTextFileIfExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")));
    if (text !== undefined) {
      files.push({ relativePath, text });
    }
  }
  return files;
}

async function findLikelyFarmSlotFiles(folder: vscode.WorkspaceFolder): Promise<string[]> {
  const pattern = new vscode.RelativePattern(folder, "{src,app}/**/*{FarmSlot,FarmSlots,FarmGrid,SlotCard,MonsterRenderer,FarmScene}*.{ts,tsx,js,jsx}");
  const uris = await vscode.workspace.findFiles(pattern, "**/{node_modules,dist,build,out}/**", 50);
  return uris
    .map((uri) => normalizeWorkspacePath(path.relative(folder.uri.fsPath, uri.fsPath)))
    .filter((relativePath) => !isForbiddenV05Path(relativePath));
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

async function pickSetupTarget(folder: vscode.WorkspaceFolder, detection: FarmSlotAdapterDetection): Promise<string | undefined> {
  const candidates = orderFarmSlotSetupTargetCandidates(detection.ownerFiles);
  for (const relativePath of candidates) {
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
  return connectFarmSlotOwnerFileToStyleModule(text, ownerPath, styleModulePath);
}

async function restoreFarmSlotSetupSources(targetUri: vscode.Uri, existingTargetText: string, styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
  await writeTextFile(targetUri, existingTargetText);
  await restoreFarmSlotStyleSource(styleUri, existingStyleText);
}

async function restoreFarmSlotStyleSource(styleUri: vscode.Uri, existingStyleText: string | undefined): Promise<void> {
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

export function connectFarmSlotOwnerFileToStyleModuleForTest(text: string, ownerPath: string, styleModulePath = "src/config/farmSlotStyle.ts"): string | undefined {
  return connectOwnerFileToStyleModule(text, ownerPath, styleModulePath);
}

async function writeFarmSlotFallbackTask(folder: vscode.WorkspaceFolder, detection: FarmSlotAdapterDetection, connection: FarmSlotStyleConnection, reason: string): Promise<string> {
  await ensureDirectory(labUri(folder, "fallback-tasks"));
  const relativePath = `.game-polish-lab/fallback-tasks/${new Date().toISOString().replace(/[:.]/g, "-")}-slot-card-runtime-connection.json`;
  const task = {
    adapterId: "idle_monster_farm",
    target: detection.target,
    surfaceType: "slot_card",
    reason,
    connectionStatus: connection.runtimeProof.status,
    proofLevel: connection.runtimeProof.proofLevel,
    candidateOwnerFiles: detection.ownerFiles,
    requiredStyleModulePath: detection.supportedStyleModulePath,
    requiredRuntimeStyleProperties: requiredFarmSlotRuntimeProofProperties.map((property) => `FARM_SLOT_STYLE.${property}`),
    evidenceFiles: connection.runtimeProof.evidenceFiles,
    missingPieces: connection.runtimeProof.missingPieces,
    codexMayDo: [
      "Wire generated farm slot style properties into existing visual-only slot rendering expressions.",
      "Patch adapter-approved renderer/style files only."
    ],
    codexMustNotDo: [
      "Do not change gameplay, save, economy, progression, ad, rules, solver, level-data, player, projectile, shooter, monetization, merge, hatch, quest, unlock, or slot-count behavior.",
      "Do not claim direct apply from imports, comments, config existence, or arbitrary string markers."
    ]
  };
  await writeTextFile(labUri(folder, "fallback-tasks", path.basename(relativePath)), `${JSON.stringify(task, null, 2)}\n`);
  return relativePath;
}

export function summarizeFarmSlotApplyResult(folder: vscode.WorkspaceFolder, result: FarmSlotApplyResult): string[] {
  return [
    `adapter target: idle_monster_farm.farm_slots`,
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
