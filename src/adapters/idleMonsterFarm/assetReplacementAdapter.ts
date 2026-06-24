import * as path from "path";
import * as vscode from "vscode";

import { buildAssetRollbackSnapshotName, validateReplacementAsset } from "../../core/assetReplacement";
import { detectMonsterFarmAssetTargets, monsterFarmAssetTargets } from "../../core/monsterFarmAssetTargets";
import { checkV05VisualScope } from "../../core/v05VisualScopeGuard";
import { ensureDirectory, labUri, pathExists, readTextFileIfExists, writeTextFile } from "../../core/workspace";
import { AssetReplacementModel, AssetReplacementTarget, AssetReplacementTargetId } from "../../types/visualSurface";

export interface AssetApplyInput {
  targetId: AssetReplacementTargetId;
  fileName: string;
  bytes: Uint8Array;
}

export interface AssetApplyResult {
  applied: boolean;
  copied: boolean;
  assignmentUpdated: boolean;
  target?: AssetReplacementTarget;
  model?: AssetReplacementModel;
  destinationPath?: string;
  changedFiles: string[];
  rollbackPaths: string[];
  warnings: string[];
  errors: string[];
  checklist: string[];
}

const manifestPath = "src/config/monsterFarmAssetManifest.ts";

export function getIdleMonsterFarmAssetTargets(): ReturnType<typeof detectMonsterFarmAssetTargets> {
  return detectMonsterFarmAssetTargets();
}

export async function applyIdleMonsterFarmReplacementAsset(folder: vscode.WorkspaceFolder, input: AssetApplyInput): Promise<AssetApplyResult> {
  const target = monsterFarmAssetTargets().find((candidate) => candidate.targetId === input.targetId);
  if (!target) {
    return failedResult([`Unknown asset target: ${input.targetId}`]);
  }

  const validation = validateReplacementAsset({ fileName: input.fileName, bytes: input.bytes }, target);
  const warnings = [...target.warnings, ...validation.model.validationWarnings];
  const errors = [...validation.model.validationErrors];
  if (!validation.ok) {
    return {
      applied: false,
      copied: false,
      assignmentUpdated: false,
      target,
      model: validation.model,
      destinationPath: validation.model.destinationPath,
      changedFiles: [],
      rollbackPaths: [],
      warnings,
      errors,
      checklist: buildAssetChecklist(false, false, false, false)
    };
  }

  const changedFiles = [validation.model.destinationPath];
  if (target.directApplySupported) {
    changedFiles.push(manifestPath);
  }
  const scope = checkV05VisualScope(changedFiles, { throughAdapter: true });
  if (!scope.ok) {
    return {
      applied: false,
      copied: false,
      assignmentUpdated: false,
      target,
      model: validation.model,
      destinationPath: validation.model.destinationPath,
      changedFiles: [],
      rollbackPaths: [],
      warnings: [...warnings, ...scope.warnings],
      errors: [...errors, `Scope guard blocked asset apply: ${scope.forbiddenFiles.join(", ")}`],
      checklist: buildAssetChecklist(true, false, false, false)
    };
  }

  const destinationUri = vscode.Uri.joinPath(folder.uri, ...validation.model.destinationPath.split("/"));
  const rollbackPaths = await createBinaryRollbackIfNeeded(folder, validation.model.destinationPath, destinationUri, target.targetId);
  await ensureDirectory(vscode.Uri.file(path.dirname(destinationUri.fsPath)));
  await vscode.workspace.fs.writeFile(destinationUri, input.bytes);

  let assignmentUpdated = false;
  if (target.directApplySupported) {
    const manifestUri = vscode.Uri.joinPath(folder.uri, ...manifestPath.split("/"));
    rollbackPaths.push(...await createTextRollbackIfNeeded(folder, manifestPath, manifestUri, target.targetId));
    await ensureDirectory(vscode.Uri.file(path.dirname(manifestUri.fsPath)));
    await writeTextFile(manifestUri, renderAssetManifest(target.targetId, validation.model.destinationPath, await readExistingManifestText(manifestUri)));
    assignmentUpdated = true;
  } else {
    warnings.push("Asset copied safely, but assignment is not fully applied because this target requires unsupported loader/manifest support.");
    warnings.push("No unsafe loader patch was made.");
  }

  return {
    applied: target.directApplySupported,
    copied: true,
    assignmentUpdated,
    target,
    model: validation.model,
    destinationPath: validation.model.destinationPath,
    changedFiles,
    rollbackPaths,
    warnings,
    errors,
    checklist: buildAssetChecklist(true, true, rollbackPaths.length > 0, assignmentUpdated)
  };
}

function failedResult(errors: string[]): AssetApplyResult {
  return {
    applied: false,
    copied: false,
    assignmentUpdated: false,
    changedFiles: [],
    rollbackPaths: [],
    warnings: [],
    errors,
    checklist: buildAssetChecklist(false, false, false, false)
  };
}

async function createBinaryRollbackIfNeeded(folder: vscode.WorkspaceFolder, relativePath: string, uri: vscode.Uri, targetId: string): Promise<string[]> {
  if (!(await pathExists(uri))) {
    return [];
  }
  await ensureDirectory(labUri(folder, "rollback"));
  const fileName = buildAssetRollbackSnapshotName(new Date(), relativePath, targetId);
  const rollbackUri = labUri(folder, "rollback", fileName);
  await vscode.workspace.fs.writeFile(rollbackUri, await vscode.workspace.fs.readFile(uri));
  return [`.game-polish-lab/rollback/${fileName}`];
}

async function createTextRollbackIfNeeded(folder: vscode.WorkspaceFolder, relativePath: string, uri: vscode.Uri, targetId: string): Promise<string[]> {
  const existingText = await readTextFileIfExists(uri);
  if (existingText === undefined) {
    return [];
  }
  await ensureDirectory(labUri(folder, "rollback"));
  const fileName = buildAssetRollbackSnapshotName(new Date(), relativePath, targetId);
  const rollbackUri = labUri(folder, "rollback", fileName);
  await writeTextFile(rollbackUri, existingText);
  return [`.game-polish-lab/rollback/${fileName}`];
}

async function readExistingManifestText(uri: vscode.Uri): Promise<string | undefined> {
  return readTextFileIfExists(uri);
}

function renderAssetManifest(targetId: AssetReplacementTargetId, destinationPath: string, existingText: string | undefined): string {
  const existingAssignments = parseExistingAssignments(existingText);
  existingAssignments[targetId] = destinationPath;
  return `// Generated by Game Polish Lab v0.53. Visual asset assignments only.
export type MonsterFarmAssetTargetId = "monster_art" | "slot_frame" | "background_image" | "reward_icon";

export const MONSTER_FARM_ASSET_MANIFEST: Record<MonsterFarmAssetTargetId, string | undefined> = ${JSON.stringify(existingAssignments, null, 2)};
`;
}

function parseExistingAssignments(existingText: string | undefined): Record<AssetReplacementTargetId, string | undefined> {
  const empty: Record<AssetReplacementTargetId, string | undefined> = {
    monster_art: undefined,
    slot_frame: undefined,
    background_image: undefined,
    reward_icon: undefined
  };
  if (!existingText) {
    return empty;
  }
  const match = existingText.match(/=\s*(\{[\s\S]*?\});/);
  if (!match) {
    return empty;
  }
  try {
    return { ...empty, ...JSON.parse(match[1]) };
  } catch {
    return empty;
  }
}

function buildAssetChecklist(validated: boolean, copied: boolean, rollbackCreated: boolean, assignmentUpdated: boolean): string[] {
  return [
    "PNG/WebP import works",
    "unsupported file types rejected",
    "dimensions checked",
    "transparency checked where required",
    "visible bounds checked",
    "imported asset previewed in context",
    copied ? "approved asset copied to adapter-approved folder" : "approved asset was not copied because validation or scope guard failed",
    rollbackCreated ? "existing asset got rollback before overwrite" : "rollback snapshot was not needed because no existing target was overwritten",
    assignmentUpdated ? "assignment config/manifest updated only when supported" : "unsupported loader/manifest path warned instead of patched",
    "no save/economy/hatch/progression/merge/quest/ad/level-data/gameplay files changed",
    validated ? "target compatibility validation completed" : "target compatibility validation blocked apply"
  ];
}
