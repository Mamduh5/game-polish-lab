import * as fs from "fs";
import * as path from "path";

import { loadVisualAssetContractFileFromText } from "./visualAssetContracts";
import { visualAssetBoundsResultsRelativePath, visualAssetNormalizationResultsRelativePath } from "./visualAssetBoundsNormalization";
import { visualAssetStyleGuideIndexRelativePath, visualAssetStyleGuideRelativeDir } from "./visualAssetStyleGuide";
import { checkVisualScopeGuard, normalizeVisualScopePath } from "./visualScopeGuard";
import type {
  AssignedVisualAsset,
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetDashboardRow,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";
import type { VisualAssetContractFile, VisualAssetSlotContract } from "../types/visualAssetContract";
import type {
  VisualAssetManifestApplyIndex,
  VisualAssetManifestApplyStatus,
  VisualAssetManifestApplySummary,
  VisualAssetManifestContract,
  VisualAssetManifestDirectApplyResult,
  VisualAssetManifestLoaderFallbackTask
} from "../types/visualAssetManifestDirectApply";
import type { VisualScopeGuardResult } from "../types/visualScopeGuard";

export const visualAssetManifestApplyRelativeDir = ".game-polish-lab/assets/manifest-applies";
export const visualAssetManifestApplyIndexRelativePath = ".game-polish-lab/assets/manifest-applies/index.json";

const visualAssetAssignmentsRelativeDir = ".game-polish-lab/assets/assignments";
const visualAssetDashboardRelativePath = ".game-polish-lab/assets/asset-dashboard.json";
const visualAssetValidationRelativePath = ".game-polish-lab/assets/validation-results.json";
const visualAssetContractRelativePath = ".game-polish-lab/assets/asset-contracts.json";

const loaderFallbackForbiddenAreas = [
  "save schema/state persistence changes",
  "economy/balance/progression changes",
  "level/rule/solver changes",
  "enemy/player gameplay changes",
  "projectile/shooter/auto-shooter systems",
  "upgrade costs/effects",
  "ad/monetization changes",
  "package/dependency churn unless explicitly required and explained",
  "unrelated adapter changes",
  "broad rewrites outside chosen file scope",
  "visual redesign or asset generation"
];

export function discoverVisualAssetManifestContracts(input: {
  workspaceRoot?: string;
  slot: VisualAssetSlot;
  contract?: VisualAssetSlotContract;
  replacementAssetPath?: string;
}): VisualAssetManifestContract[] {
  const contracts: VisualAssetManifestContract[] = [];
  if (input.slot.targetConfigPath) {
    contracts.push({
      contractId: `${input.slot.slotId}.game_polish_lab_assignment`,
      adapterId: input.slot.adapterId,
      adapterLabel: input.slot.adapterLabel,
      surfaceId: input.slot.surfaceId,
      assetSlotId: input.slot.slotId,
      manifestPath: input.slot.targetConfigPath,
      manifestType: input.slot.targetConfigPath.startsWith(".game-polish-lab/") ? "adapter_asset_config" : "unknown",
      writablePathSafety: input.slot.targetConfigPath.startsWith(".game-polish-lab/") ? "safe" : "suspicious",
      supportedOperation: input.slot.targetConfigPath.startsWith(".game-polish-lab/") ? "update_generated_config_reference" : "unsupported",
      manifestKey: "copiedAssetPath",
      replacementAssetPath: input.replacementAssetPath,
      expectedRelativePathMode: "workspace_relative",
      validationRequirements: [
        "candidate is approved",
        "validation is not invalid",
        "assignment metadata is written under Game Polish Lab-owned asset assignments",
        "rollback snapshot is created before overwrite"
      ],
      rollbackRequired: true,
      manualTestChecklist: [
        "Confirm assignment metadata references the approved asset path.",
        "Confirm manifest apply status does not claim runtime application.",
        "Confirm no source loader, scene, gameplay, save, economy, progression, ad, or package files changed."
      ],
      warnings: input.slot.targetConfigPath.startsWith(".game-polish-lab/") ? [] : ["Slot target config path is not Game Polish Lab-owned; direct apply is not safe without an explicit contract."],
      errors: []
    });
  }

  if (input.contract?.manifestPath) {
    const normalizedManifestPath = normalizeVisualScopePath(input.contract.manifestPath);
    const requestedSafety = input.contract.manifestPathSafety ?? "suspicious";
    const safety = /\.(ts|tsx|js|jsx)$/i.test(normalizedManifestPath) ? "suspicious" : requestedSafety;
    const operation = safety === "safe" ? input.contract.manifestOperation ?? "set_asset_path" : "unsupported";
    contracts.push({
      contractId: input.contract.manifestContractId ?? `${input.slot.slotId}.contract_manifest`,
      adapterId: input.slot.adapterId,
      adapterLabel: input.slot.adapterLabel,
      surfaceId: input.slot.surfaceId,
      assetSlotId: input.slot.slotId,
      manifestPath: normalizedManifestPath,
      manifestType: input.contract.manifestType ?? "unknown",
      writablePathSafety: safety,
      supportedOperation: operation,
      manifestKey: input.contract.manifestKey,
      currentValue: input.contract.manifestCurrentValue,
      replacementAssetPath: input.replacementAssetPath,
      expectedRelativePathMode: input.contract.expectedRelativePathMode ?? "workspace_relative",
      validationRequirements: [
        "explicit asset contract marks this manifest path safe",
        "manifest key is visual-asset-only",
        "scope guard permits the exact manifest path",
        "rollback snapshot is created before overwrite"
      ],
      rollbackRequired: true,
      manualTestChecklist: [
        "Confirm the selected asset slot reads the manifest/config entry.",
        "Confirm the manifest/config entry points to the approved asset assignment path.",
        "Confirm gameplay, save, economy, progression, ads, and source loader code were not changed."
      ],
      warnings: safety === "safe" ? [] : ["Manifest path is not marked safe by contract; fallback loader task is required."],
      errors: operation === "unsupported" ? ["Manifest operation is unsupported."] : []
    });
  } else if (input.slot.knownManifestPath) {
    contracts.push({
      contractId: `${input.slot.slotId}.known_manifest_fallback`,
      adapterId: input.slot.adapterId,
      adapterLabel: input.slot.adapterLabel,
      surfaceId: input.slot.surfaceId,
      assetSlotId: input.slot.slotId,
      manifestPath: input.slot.knownManifestPath,
      manifestType: "unknown",
      writablePathSafety: "suspicious",
      supportedOperation: "unsupported",
      replacementAssetPath: input.replacementAssetPath,
      expectedRelativePathMode: "workspace_relative",
      validationRequirements: ["explicit manifest key/safety contract is required before direct apply"],
      rollbackRequired: true,
      manualTestChecklist: ["Use fallback loader task; do not patch unknown manifest/source loader paths directly."],
      warnings: ["Known manifest/loader path exists, but no explicit safe manifest key contract is available."],
      errors: ["Fallback loader task required."]
    });
  }

  return contracts.length > 0 ? contracts : [{
    contractId: `${input.slot.slotId}.unsupported`,
    adapterId: input.slot.adapterId,
    adapterLabel: input.slot.adapterLabel,
    surfaceId: input.slot.surfaceId,
    assetSlotId: input.slot.slotId,
    manifestType: "unknown",
    writablePathSafety: "unsupported",
    supportedOperation: "unsupported",
    replacementAssetPath: input.replacementAssetPath,
    expectedRelativePathMode: "workspace_relative",
    validationRequirements: ["known safe manifest/config contract is required"],
    rollbackRequired: true,
    manualTestChecklist: ["Generate a fallback loader task."],
    warnings: [],
    errors: ["No manifest/config contract was discovered."]
  }];
}

export function discoverVisualAssetManifestContractsForRows(workspaceRoot: string, rows: VisualAssetDashboardRow[]): VisualAssetManifestContract[] {
  const contractFile = readVisualAssetContractFileSync(workspaceRoot);
  return rows.flatMap((row) => discoverVisualAssetManifestContracts({
    workspaceRoot,
    slot: row.slot,
    contract: findVisualAssetSlotContract(contractFile, row.slot),
    replacementAssetPath: row.assignmentAssetPath ?? row.normalization?.outputPath ?? row.candidate?.copiedAssetPath
  }));
}

export function applyVisualAssetManifestAssignment(input: {
  workspaceRoot: string;
  slot: VisualAssetSlot;
  candidate?: ImportedVisualAssetCandidate;
  assignment?: AssignedVisualAsset;
  normalization?: VisualAssetNormalizationResult;
  validation?: VisualAssetValidationResult;
  contract: VisualAssetManifestContract;
  now?: Date;
}): VisualAssetManifestDirectApplyResult {
  const now = input.now ?? new Date();
  const createdAt = now.toISOString();
  const operationId = `${timestampForPath(now)}-${safeId(input.slot.slotId)}-${safeId(input.contract.contractId)}`;
  const warnings = [...input.contract.warnings];
  const errors = [...input.contract.errors];
  const candidate = input.candidate;
  const assetPath = input.assignment?.copiedAssetPath ?? input.normalization?.outputPath ?? candidate?.copiedAssetPath;
  const assignment = input.assignment ?? (candidate && assetPath ? buildAssignment(input.slot, candidate, input.validation ?? validationFromCandidate(candidate, createdAt), now, assetPath) : undefined);
  const scopeGuardResult = checkManifestApplyScope(input.contract, assignment, assetPath);

  const finish = (status: VisualAssetManifestApplyStatus, extra?: Partial<VisualAssetManifestDirectApplyResult>): VisualAssetManifestDirectApplyResult => {
    const result: VisualAssetManifestDirectApplyResult = {
      operationId,
      assignmentId: assignment?.assignmentId,
      slotId: input.slot.slotId,
      candidateId: candidate?.candidateId,
      normalizedAssetId: input.normalization?.normalizedAssetId,
      manifestContractId: input.contract.contractId,
      targetManifestPath: input.contract.manifestPath,
      filesWritten: [],
      rollbackSnapshotPaths: [],
      scopeGuardResult,
      status,
      runtimeApplied: false,
      warnings,
      errors,
      createdAt,
      ...extra
    };
    writeVisualAssetManifestApplyResult(input.workspaceRoot, result);
    return result;
  };

  if (!candidate && !assignment) {
    errors.push("A candidate or assignment is required before manifest direct apply.");
    return finish("fallback_required");
  }
  if (candidate && candidate.approvalStatus !== "approved") {
    errors.push("Candidate must be approved before manifest direct apply.");
    return finish("skipped");
  }
  const validation = input.validation ?? assignment?.validation ?? (candidate ? validationFromCandidate(candidate, createdAt) : undefined);
  if (!validation || validation.status === "invalid" || validation.status === "missing") {
    errors.push("Invalid or missing asset validation blocks manifest direct apply.");
    return finish("skipped");
  }
  if (!assignment) {
    errors.push("Assignment metadata could not be created for manifest direct apply.");
    return finish("failed");
  }
  if (!assetPath) {
    errors.push("No approved asset path is available for manifest direct apply.");
    return finish("failed");
  }
  if (input.contract.writablePathSafety !== "safe" || input.contract.supportedOperation === "unsupported" || !input.contract.manifestPath) {
    errors.push("Manifest contract is not safe for direct apply; fallback loader task is required.");
    return finish("fallback_required");
  }
  if (!input.contract.manifestKey) {
    errors.push("Manifest contract is missing an explicit manifest key/path.");
    return finish("fallback_required");
  }
  if (scopeGuardResult.recommendedAction === "block") {
    errors.push("Scope guard blocked manifest direct apply.");
    return finish("failed");
  }

  const filesWritten: string[] = [];
  const rollbackSnapshotPaths: string[] = [];
  let previousValue: string | undefined;
  try {
    const assignmentRollback = createRollbackSnapshot(input.workspaceRoot, assignment.assignmentPath, now, "asset-assignment");
    if (assignmentRollback) {
      rollbackSnapshotPaths.push(assignmentRollback);
    }
    writeJsonFile(input.workspaceRoot, assignment.assignmentPath, assignment);
    filesWritten.push(assignment.assignmentPath);

    const manifestRollback = createRollbackSnapshot(input.workspaceRoot, input.contract.manifestPath, now, "manifest-apply");
    if (manifestRollback && manifestRollback !== assignmentRollback) {
      rollbackSnapshotPaths.push(manifestRollback);
    }
    const manifestObject = readJsonObject(input.workspaceRoot, input.contract.manifestPath);
    const previous = getByPath(manifestObject, input.contract.manifestKey);
    previousValue = typeof previous === "string" ? previous : previous === undefined ? undefined : JSON.stringify(previous);
    setByPath(manifestObject, input.contract.manifestKey, assetPath);
    writeJsonFile(input.workspaceRoot, input.contract.manifestPath, manifestObject);
    if (!filesWritten.includes(input.contract.manifestPath)) {
      filesWritten.push(input.contract.manifestPath);
    }
  } catch (error) {
    errors.push(`Manifest direct apply failed: ${errorToMessage(error)}`);
    return finish("failed", { previousValue, newValue: assetPath, filesWritten, rollbackSnapshotPaths });
  }

  return finish("applied", {
    previousValue,
    newValue: assetPath,
    filesWritten,
    rollbackSnapshotPaths
  });
}

export function checkManifestApplyScope(contract: VisualAssetManifestContract, assignment: AssignedVisualAsset | undefined, assetPath: string | undefined): VisualScopeGuardResult {
  return checkVisualScopeGuard({
    operationType: "asset_manifest_direct_apply",
    adapterId: contract.adapterId,
    surfaceType: "asset_replacement",
    targetId: contract.assetSlotId,
    explicitSafePaths: contract.writablePathSafety === "safe" && contract.manifestPath ? [contract.manifestPath] : [],
    candidatePaths: [
      contract.manifestPath,
      assignment?.assignmentPath,
      assetPath,
      visualAssetManifestApplyIndexRelativePath,
      `${visualAssetManifestApplyRelativeDir}/example.json`
    ].filter((value): value is string => Boolean(value))
  });
}

export function readVisualAssetManifestApplyResults(workspaceRoot: string): VisualAssetManifestDirectApplyResult[] {
  const dir = path.join(workspaceRoot, ...visualAssetManifestApplyRelativeDir.split("/"));
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter((fileName) => fileName.endsWith(".json") && fileName !== "index.json")
    .sort()
    .flatMap((fileName) => {
      try {
        return [JSON.parse(fs.readFileSync(path.join(dir, fileName), "utf8")) as VisualAssetManifestDirectApplyResult];
      } catch {
        return [];
      }
    });
}

export function readLatestVisualAssetManifestApplySummaries(workspaceRoot: string): VisualAssetManifestApplySummary[] {
  const latestBySlot = new Map<string, VisualAssetManifestApplySummary>();
  for (const result of readVisualAssetManifestApplyResults(workspaceRoot)) {
    const summary = manifestApplySummary(result);
    const existing = latestBySlot.get(summary.slotId);
    if (!existing || existing.createdAt < summary.createdAt) {
      latestBySlot.set(summary.slotId, summary);
    }
  }
  return Array.from(latestBySlot.values()).sort((a, b) => a.slotId.localeCompare(b.slotId));
}

export function writeVisualAssetManifestApplyResult(workspaceRoot: string, result: VisualAssetManifestDirectApplyResult): string {
  const relativePath = `${visualAssetManifestApplyRelativeDir}/${result.operationId}.json`;
  writeJsonFile(workspaceRoot, relativePath, result);
  writeVisualAssetManifestApplyIndex(workspaceRoot, result);
  return relativePath;
}

export function writeVisualAssetManifestApplyIndex(workspaceRoot: string, result: VisualAssetManifestDirectApplyResult): string {
  const existing = readVisualAssetManifestApplyIndex(workspaceRoot);
  const summary = manifestApplySummary(result);
  const index: VisualAssetManifestApplyIndex = {
    schemaVersion: "visual-asset-manifest-applies/v1",
    updatedAt: result.createdAt,
    results: mergeById(existing.results, [summary], (entry) => entry.operationId)
  };
  writeJsonFile(workspaceRoot, visualAssetManifestApplyIndexRelativePath, index);
  return visualAssetManifestApplyIndexRelativePath;
}

export function readVisualAssetManifestApplyIndex(workspaceRoot: string): VisualAssetManifestApplyIndex {
  const absolutePath = path.join(workspaceRoot, ...visualAssetManifestApplyIndexRelativePath.split("/"));
  if (!fs.existsSync(absolutePath)) {
    return { schemaVersion: "visual-asset-manifest-applies/v1", results: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Partial<VisualAssetManifestApplyIndex>;
    if (parsed.schemaVersion !== "visual-asset-manifest-applies/v1" || !Array.isArray(parsed.results)) {
      return { schemaVersion: "visual-asset-manifest-applies/v1", results: [] };
    }
    return parsed as VisualAssetManifestApplyIndex;
  } catch {
    return { schemaVersion: "visual-asset-manifest-applies/v1", results: [] };
  }
}

export function buildManifestLoaderFallbackTask(input: {
  slot: VisualAssetSlot;
  candidate?: ImportedVisualAssetCandidate;
  assignment?: AssignedVisualAsset;
  normalization?: VisualAssetNormalizationResult;
  validation?: VisualAssetValidationResult;
  boundsAnalysis?: VisualAssetBoundsAnalysisResult;
  styleGuidePath?: string;
  contract?: VisualAssetManifestContract;
  reason: string;
  now?: Date;
}): VisualAssetManifestLoaderFallbackTask {
  const now = input.now ?? new Date();
  const approvedAssetPath = input.assignment?.copiedAssetPath ?? input.normalization?.outputPath ?? input.candidate?.copiedAssetPath;
  const usesNormalized = Boolean(input.assignment?.usesNormalizedAsset || input.normalization?.outputPath);
  return {
    taskId: `${timestampForPath(now)}-${input.slot.slotId}-manifest-loader-fallback`,
    adapterId: input.slot.adapterId,
    adapterLabel: input.slot.adapterLabel,
    surfaceId: input.slot.surfaceId,
    surfaceLabel: input.slot.surfaceLabel,
    assetSlotId: input.slot.slotId,
    assetSlotLabel: input.slot.slotLabel,
    approvedAssetPath,
    assignmentMetadataPath: input.assignment?.assignmentPath ?? input.slot.targetConfigPath,
    validation: input.validation ?? input.assignment?.validation ?? (input.candidate ? validationFromCandidate(input.candidate, now.toISOString()) : { status: "unvalidated", warnings: [], errors: [], checkedAt: now.toISOString() }),
    boundsSummary: input.boundsAnalysis
      ? {
        visibleAreaRatio: input.boundsAnalysis.visibleAreaRatio,
        recommendedAction: input.boundsAnalysis.recommendedAction,
        warnings: input.boundsAnalysis.warnings,
        errors: input.boundsAnalysis.errors
      }
      : undefined,
    styleGuidePath: input.styleGuidePath,
    suspectedOwnerFileScope: Array.from(new Set([
      input.contract?.manifestPath,
      input.slot.knownManifestPath,
      ...input.slot.ownerSourceFileHints
    ].filter((value): value is string => Boolean(value)))).sort(),
    allowedFiles: Array.from(new Set([
      visualAssetDashboardRelativePath,
      visualAssetValidationRelativePath,
      visualAssetContractRelativePath,
      visualAssetBoundsResultsRelativePath,
      visualAssetNormalizationResultsRelativePath,
      visualAssetStyleGuideIndexRelativePath,
      input.styleGuidePath,
      input.assignment?.assignmentPath ?? input.slot.targetConfigPath,
      approvedAssetPath,
      input.contract?.manifestPath,
      input.slot.knownManifestPath,
      ...input.slot.ownerSourceFileHints
    ].filter((value): value is string => Boolean(value)))).sort(),
    forbiddenAreas: loaderFallbackForbiddenAreas,
    manualVisualTestChecklist: [
      "Confirm the selected asset slot renders the approved assignment only.",
      "Confirm no save, economy, progression, rules, ad, gameplay, enemy/player, projectile, shooter, upgrade, package, or unrelated adapter behavior changed.",
      "Confirm loader/source wiring stayed inside the exact chosen owner file scope.",
      "Confirm no visual redesign or asset generation was performed."
    ],
    directApplyUnsafeReason: input.reason,
    instruction: usesNormalized
      ? "wire this approved normalized asset assignment into this selected visual asset slot only."
      : "wire this approved asset assignment into this selected visual asset slot only.",
    createdAt: now.toISOString()
  };
}

export function writeManifestLoaderFallbackTask(workspaceRoot: string, task: VisualAssetManifestLoaderFallbackTask): string {
  const relativePath = `.game-polish-lab/fallback-tasks/${task.taskId}.json`;
  writeJsonFile(workspaceRoot, relativePath, task);
  return relativePath;
}

export function readVisualAssetContractFileSync(workspaceRoot: string): VisualAssetContractFile | undefined {
  const contractPath = path.join(workspaceRoot, ...visualAssetContractRelativePath.split("/"));
  if (!fs.existsSync(contractPath)) {
    return undefined;
  }
  return loadVisualAssetContractFileFromText(fs.readFileSync(contractPath, "utf8")).file;
}

export function findVisualAssetSlotContract(contractFile: VisualAssetContractFile | undefined, slot: VisualAssetSlot): VisualAssetSlotContract | undefined {
  if (!contractFile) {
    return undefined;
  }
  return contractFile.contracts
    .flatMap((contract) => contract.slots)
    .find((contractSlot) => contractSlot.assetSlotId === slot.slotId || slot.slotId.endsWith(`.${contractSlot.assetSlotId}`) || contractSlot.label === slot.slotLabel);
}

function buildAssignment(slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate, validation: VisualAssetValidationResult, now: Date, assetPath: string): AssignedVisualAsset {
  const normalized = assetPath !== candidate.copiedAssetPath;
  return {
    assignmentId: `${slot.slotId}-${candidate.candidateId}`,
    slotId: slot.slotId,
    candidateId: candidate.candidateId,
    adapterId: slot.adapterId,
    surfaceId: slot.surfaceId,
    copiedAssetPath: assetPath,
    normalizedAssetPath: normalized ? assetPath : undefined,
    usesNormalizedAsset: normalized,
    assignmentPath: slot.targetConfigPath ?? `${visualAssetAssignmentsRelativeDir}/${slot.slotId.replace(/\./g, "-")}.json`,
    targetConfigPath: slot.targetConfigPath,
    knownManifestPath: slot.knownManifestPath,
    runtimeApplied: false,
    fallbackRequired: slot.directApplyCapability === "fallback_required" || slot.safetyStatus !== "safe",
    validation,
    assignedAt: now.toISOString(),
    notes: [
      "Assignment is metadata/config-first and does not overwrite original game assets.",
      "Manifest direct apply records metadata/config writes only; runtime application remains false unless proven separately."
    ]
  };
}

function validationFromCandidate(candidate: ImportedVisualAssetCandidate, checkedAt: string): VisualAssetValidationResult {
  return {
    status: candidate.validationErrors.length > 0 ? "invalid" : candidate.validationWarnings.length > 0 ? "warning" : "valid",
    warnings: candidate.validationWarnings,
    errors: candidate.validationErrors,
    checkedAt
  };
}

function readJsonObject(workspaceRoot: string, relativePath: string): Record<string, unknown> {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {};
  }
  const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Manifest/config JSON must be an object: ${relativePath}`);
  }
  return parsed as Record<string, unknown>;
}

function writeJsonFile(workspaceRoot: string, relativePath: string, value: unknown): void {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  const normalized = normalizeVisualScopePath(relativePath);
  if (!normalized || path.isAbsolute(relativePath) || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Unsafe workspace path: ${relativePath}`);
  }
  const absolutePath = path.resolve(workspaceRoot, ...normalized.split("/"));
  const root = path.resolve(workspaceRoot);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Workspace path escapes root: ${relativePath}`);
  }
  return absolutePath;
}

function createRollbackSnapshot(workspaceRoot: string, relativePath: string, now: Date, label: string): string | undefined {
  const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }
  const rollbackRelativePath = `.game-polish-lab/rollback/${timestampForPath(now)}-${label}-${path.basename(relativePath)}`;
  const rollbackPath = resolveWorkspacePath(workspaceRoot, rollbackRelativePath);
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.copyFileSync(absolutePath, rollbackPath);
  return rollbackRelativePath;
}

function getByPath(value: Record<string, unknown>, keyPath: string): unknown {
  return keyPath.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, value);
}

function setByPath(value: Record<string, unknown>, keyPath: string, nextValue: unknown): void {
  const parts = keyPath.split(".").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Manifest key path is empty.");
  }
  let current = value;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (typeof existing !== "object" || existing === null || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = nextValue;
}

function manifestApplySummary(result: VisualAssetManifestDirectApplyResult): VisualAssetManifestApplySummary {
  return {
    operationId: result.operationId,
    slotId: result.slotId,
    manifestContractId: result.manifestContractId,
    targetManifestPath: result.targetManifestPath,
    status: result.status,
    runtimeApplied: result.runtimeApplied,
    filesWritten: result.filesWritten,
    rollbackSnapshotPaths: result.rollbackSnapshotPaths,
    createdAt: result.createdAt,
    warnings: result.warnings,
    errors: result.errors
  };
}

function safeId(value: string): string {
  return normalizeVisualScopePath(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function mergeById<T>(existing: T[], patch: T[], id: (value: T) => string): T[] {
  const values = new Map(existing.map((entry) => [id(entry), entry]));
  for (const entry of patch) {
    values.set(id(entry), entry);
  }
  return Array.from(values.values()).sort((a, b) => id(a).localeCompare(id(b)));
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
