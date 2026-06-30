import * as path from "path";
import * as vscode from "vscode";

import { checkV05VisualScope, isForbiddenV05Path } from "../../core/v05VisualScopeGuard";
import { connectFarmSlotOwnerFileToStyleModule } from "../../core/farmSlotStyleBridgePatch";
import {
  analyzeFarmSlotDetection,
  analyzeFarmSlotStyleConnection,
  FarmSlotAdapterDetection,
  FarmSlotAdapterState,
  FarmSlotFileInspection,
  FarmSlotStyleConnection
} from "../../core/farmSlotAdapterAnalysis";
import { VisualRuntimeConnectionProof } from "../../core/visualRuntimeConnectionProof";
import { buildRollbackSnapshotName } from "../../core/visualSurfaceConfig";
import { ensureDirectory, labUri, normalizeWorkspacePath, pathExists, readTextFile, readTextFileIfExists, toWorkspaceRelativePath, writeTextFile } from "../../core/workspace";
import { SlotCardStyleConfig, SlotCardStyleValues } from "../../types/visualSurface";

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
  const warnings = [...detection.warnings, ...scope.warnings];

  if (detection.ownerFiles.length === 0 && !styleModuleExists) {
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

  if (!connection.connected) {
    return {
      applied: false,
      setupRequired: true,
      setupOffered: true,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [
        ...warnings,
        "Direct apply skipped because farm slot rendering is not connected to the generated style module/config yet. Use the one-time adapter setup path."
      ],
      blockedFiles: [],
      detection,
      connection,
      runtimeConnectionProof: connection.runtimeProof
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
  const rollbackPaths = await createRollbackSnapshots(folder, [detection.supportedStyleModulePath]);
  await writeTextFile(styleUri, renderFarmSlotStyleModule(config.values));

  return {
    applied: true,
    setupRequired: false,
    setupOffered: false,
    changedFiles,
    rollbackPaths,
    warnings,
    blockedFiles: [],
    detection,
    connection,
    runtimeConnectionProof: connection.runtimeProof
  };
}

export async function setupIdleMonsterFarmFarmSlotBridge(folder: vscode.WorkspaceFolder, config: SlotCardStyleConfig): Promise<FarmSlotSetupResult> {
  const state = await getIdleMonsterFarmFarmSlotAdapterState(folder);
  const { detection, connection } = state;
  const setupTarget = pickSetupTarget(detection);
  const intendedFiles = setupTarget
    ? [detection.supportedStyleModulePath, setupTarget]
    : [detection.supportedStyleModulePath];
  const scope = checkV05VisualScope(intendedFiles, { throughAdapter: true });
  const warnings = [...detection.warnings, ...scope.warnings];

  if (connection.connected) {
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
    const fallbackTaskPath = await writeFarmSlotFallbackTask(folder, detection, connection, "No safe farm slot owner file was detected for automatic visual wiring.");
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, "One-time setup is unavailable because no safe farm slot owner file was detected.", `Fallback integration task generated: ${fallbackTaskPath}`],
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
    const fallbackTaskPath = await writeFarmSlotFallbackTask(folder, detection, connection, `${setupTarget} does not have a recognized visual-only farm slot patch site.`);
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, `${setupTarget} does not have a recognized visual-only farm slot patch site for v0.99.4 setup.`, `Fallback integration task generated: ${fallbackTaskPath}`],
      blockedFiles: [],
      detection,
      connection,
      fallbackTaskPath
    };
  }

  const styleUri = vscode.Uri.joinPath(folder.uri, ...detection.supportedStyleModulePath.split("/"));
  await ensureDirectory(vscode.Uri.file(path.dirname(styleUri.fsPath)));
  const rollbackPaths = await createRollbackSnapshots(folder, intendedFiles);
  await writeTextFile(styleUri, renderFarmSlotStyleModule(config.values));
  await writeTextFile(targetUri, patchedTargetText);

  const updatedState = await getIdleMonsterFarmFarmSlotAdapterState(folder);
  if (!updatedState.connection.connected || updatedState.connection.runtimeProof.proofLevel !== "runtime_value_usage") {
    const fallbackTaskPath = await writeFarmSlotFallbackTask(folder, updatedState.detection, updatedState.connection, "Automatic farm slot setup did not produce runtime value usage proof.");
    return {
      setupApplied: false,
      intendedFiles,
      changedFiles: intendedFiles,
      rollbackPaths,
      warnings: [...warnings, "One-time setup wrote only safe visual files but runtime value usage proof was not established.", `Fallback integration task generated: ${fallbackTaskPath}`],
      blockedFiles: [],
      detection: updatedState.detection,
      connection: updatedState.connection,
      fallbackTaskPath
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

function pickSetupTarget(detection: FarmSlotAdapterDetection): string | undefined {
  return detection.ownerFiles.find((file) => /FarmSlot|FarmGrid|SlotCard|MonsterRenderer|FarmScene/.test(file));
}

function connectOwnerFileToStyleModule(text: string, ownerPath: string, styleModulePath: string): string | undefined {
  return connectFarmSlotOwnerFileToStyleModule(text, ownerPath, styleModulePath);
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
    requiredRuntimeStyleProperties: [
      "FARM_SLOT_STYLE.slotWidth",
      "FARM_SLOT_STYLE.slotHeight",
      "FARM_SLOT_STYLE.gap",
      "FARM_SLOT_STYLE.fillColor",
      "FARM_SLOT_STYLE.borderColor",
      "FARM_SLOT_STYLE.borderWidth",
      "FARM_SLOT_STYLE.cornerRadius",
      "FARM_SLOT_STYLE.monsterDisplayScale",
      "FARM_SLOT_STYLE.monsterVerticalOffset"
    ],
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

function relativeImportPath(fromPath: string, toPath: string): string {
  const fromDir = path.posix.dirname(fromPath.replace(/\\/g, "/"));
  const target = toPath.replace(/\\/g, "/").replace(/\.ts$/, "");
  let relativePath = path.posix.relative(fromDir, target);
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }
  return relativePath;
}

function renderFarmSlotStyleModule(values: SlotCardStyleValues): string {
  return `// Generated by Game Polish Lab v0.51. Visual style values only.
export interface FarmSlotStyle {
  slotWidth: number;
  slotHeight: number;
  gap: number;
  borderWidth: number;
  cornerRadius: number;
  fillColor: string;
  borderColor: string;
  selectedGlowStrength: number;
  lockedOverlayOpacity: number;
  emptySlotOpacity: number;
  mergeCandidatePulseScale: number;
  monsterDisplayScale: number;
  monsterVerticalOffset: number;
}

export const FARM_SLOT_STYLE: FarmSlotStyle = ${JSON.stringify(values, null, 2)};
`;
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
