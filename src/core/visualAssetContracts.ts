import * as fsSync from "fs";
import * as fs from "fs/promises";
import * as path from "path";

import { inspectAssetImage } from "./assetReplacement";
import { monsterFarmAssetTargets } from "./monsterFarmAssetTargets";
import {
  VisualAssetContract,
  VisualAssetContractFile,
  VisualAssetContractStatusCounts,
  VisualAssetFormat,
  VisualAssetLoaderHint,
  VisualAssetSlotContract,
  VisualAssetValidationStatus
} from "../types/visualAssetContract";
import { AssetReplacementAssignmentMode } from "../types/visualSurface";

export const assetContractRelativePath = ".game-polish-lab/assets/asset-contracts.json";
export const assetContractSchemaVersion = 1;

export type VisualAssetContractLoadStatus = "missing" | "valid" | "malformed";

export interface VisualAssetContractLoadResult {
  status: VisualAssetContractLoadStatus;
  file: VisualAssetContractFile;
  path: string;
  warnings: string[];
}

export interface RefreshAssetContractResult {
  file: VisualAssetContractFile;
  path: string;
  statusCounts: VisualAssetContractStatusCounts;
  warnings: string[];
}

export function resolveAssetContractFilePath(workspaceFolderPath: string): string {
  return path.join(workspaceFolderPath, ...assetContractRelativePath.split("/"));
}

export function emptyAssetContractFile(updatedAt?: string): VisualAssetContractFile {
  return {
    schemaVersion: assetContractSchemaVersion,
    generatedBy: "game-polish-lab",
    updatedAt,
    contracts: []
  };
}

export function loadVisualAssetContractFileFromText(text: string | undefined, updatedAt?: string): Omit<VisualAssetContractLoadResult, "path"> {
  if (text === undefined) {
    return { status: "missing", file: emptyAssetContractFile(updatedAt), warnings: [] };
  }
  try {
    const parsed = JSON.parse(text) as Partial<VisualAssetContractFile>;
    if (!isVisualAssetContractFile(parsed)) {
      return {
        status: "malformed",
        file: emptyAssetContractFile(updatedAt),
        warnings: ["Asset contract file is present but does not match schemaVersion 1."]
      };
    }
    return { status: "valid", file: parsed, warnings: [] };
  } catch {
    return {
      status: "malformed",
      file: emptyAssetContractFile(updatedAt),
      warnings: ["Asset contract file is present but contains invalid JSON."]
    };
  }
}

export async function readVisualAssetContractFile(workspaceFolderPath: string, updatedAt?: string): Promise<VisualAssetContractLoadResult> {
  const contractPath = resolveAssetContractFilePath(workspaceFolderPath);
  try {
    const text = await fs.readFile(contractPath, "utf8");
    return { ...loadVisualAssetContractFileFromText(text, updatedAt), path: contractPath };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { ...loadVisualAssetContractFileFromText(undefined, updatedAt), path: contractPath };
    }
    return {
      status: "malformed",
      path: contractPath,
      file: emptyAssetContractFile(updatedAt),
      warnings: [`Asset contract file could not be read: ${errorToMessage(error)}`]
    };
  }
}

export async function writeVisualAssetContractFile(workspaceFolderPath: string, file: VisualAssetContractFile): Promise<string> {
  const contractPath = resolveAssetContractFilePath(workspaceFolderPath);
  await fs.mkdir(path.dirname(contractPath), { recursive: true });
  await fs.writeFile(contractPath, formatVisualAssetContractFile(file), "utf8");
  return contractPath;
}

export function writeVisualAssetContractFileSync(workspaceFolderPath: string, file: VisualAssetContractFile): string {
  const contractPath = resolveAssetContractFilePath(workspaceFolderPath);
  fsSync.mkdirSync(path.dirname(contractPath), { recursive: true });
  fsSync.writeFileSync(contractPath, formatVisualAssetContractFile(file), "utf8");
  return contractPath;
}

export function formatVisualAssetContractFile(file: VisualAssetContractFile): string {
  return `${JSON.stringify(sortAssetContractFile(file), null, 2)}\n`;
}

export async function refreshVisualAssetContracts(workspaceFolderPath: string, checkedAt = new Date()): Promise<RefreshAssetContractResult> {
  const checkedAtIso = checkedAt.toISOString();
  const existing = await readVisualAssetContractFile(workspaceFolderPath, checkedAtIso);
  const generated = buildMonsterFarmAssetContractFile(checkedAtIso);
  const merged = mergeVisualAssetContractFiles(existing.file, generated, checkedAtIso);
  const validated = await validateVisualAssetContractFile(workspaceFolderPath, merged, checkedAtIso);
  const contractPath = await writeVisualAssetContractFile(workspaceFolderPath, validated);
  return {
    file: validated,
    path: contractPath,
    statusCounts: summarizeVisualAssetContractStatuses(validated),
    warnings: existing.warnings
  };
}

export function buildMonsterFarmAssetContractFile(updatedAt?: string): VisualAssetContractFile {
  return {
    ...emptyAssetContractFile(updatedAt),
    contracts: [buildMonsterFarmAssetContract(updatedAt)]
  };
}

export function buildMonsterFarmAssetContract(updatedAt?: string): VisualAssetContract {
  return {
    contractId: "idle_monster_farm.asset_replacement",
    projectId: "idle_monster_farm",
    adapterId: "idle_monster_farm.assets",
    targetSurfaceType: "asset_replacement",
    targetId: "assets",
    targetLabel: "Monster Farm visual assets",
    updatedAt,
    slots: monsterFarmAssetTargets().map((target) => ({
      assetSlotId: target.targetId,
      label: target.label,
      expectedGlob: `${target.destinationFolder}/*.{png,webp}`,
      expectedWidth: target.expectedWidth,
      expectedHeight: target.expectedHeight,
      expectedFormats: ["PNG", "WebP"],
      transparencyRequirement: target.transparencyRequired ? "required" : "optional",
      visibleBoundsRequired: target.transparencyRequired,
      loaderHint: loaderHintFromAssignmentMode(target.assignmentMode),
      validation: {
        status: "unknown",
        warnings: [
          "No concrete asset path is adapter-known yet; this contract records the expected slot and destination glob only."
        ],
        errors: [],
        lastCheckedAt: updatedAt
      }
    }))
  };
}

export async function validateVisualAssetContractFile(workspaceFolderPath: string, file: VisualAssetContractFile, checkedAt = new Date().toISOString()): Promise<VisualAssetContractFile> {
  return {
    ...file,
    updatedAt: checkedAt,
    contracts: await Promise.all(file.contracts.map(async (contract) => ({
      ...contract,
      slots: await Promise.all(contract.slots.map((slot) => validateVisualAssetSlotContract(workspaceFolderPath, slot, checkedAt)))
    })))
  };
}

export async function validateVisualAssetSlotContract(workspaceFolderPath: string, slot: VisualAssetSlotContract, checkedAt = new Date().toISOString()): Promise<VisualAssetSlotContract> {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!slot.expectedPath) {
    warnings.push(slot.expectedGlob
      ? "Expected path is not concrete; glob metadata is recorded but not expanded by v0.63."
      : "Expected path is unknown; validation is metadata-only.");
    return withValidation(slot, "unknown", warnings, errors, checkedAt);
  }

  const pathCheck = resolveSafeAssetPath(workspaceFolderPath, slot.expectedPath);
  if (!pathCheck.ok) {
    return withValidation(slot, "invalid", warnings, [pathCheck.error], checkedAt);
  }

  let bytes: Uint8Array;
  try {
    bytes = await fs.readFile(pathCheck.absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return withValidation(slot, "missing", warnings, [`Missing asset file: ${slot.expectedPath}`], checkedAt);
    }
    return withValidation(slot, "invalid", warnings, [`Asset file is not readable: ${errorToMessage(error)}`], checkedAt);
  }

  const imageInfo = inspectAssetImage(bytes);
  if (imageInfo.fileType === "unsupported") {
    errors.push("Asset file is not a supported PNG/WebP image.");
  }
  const expectedFormats = normalizeExpectedFormats(slot);
  if (expectedFormats.length > 0 && imageInfo.fileType !== "unsupported" && !expectedFormats.includes(imageInfo.fileType)) {
    errors.push(`Asset format ${imageInfo.fileType} does not match expected ${expectedFormats.join(" or ")}.`);
  }
  if (slot.expectedWidth !== undefined && imageInfo.width !== slot.expectedWidth) {
    warnings.push(`Asset width ${imageInfo.width ?? "unknown"}px does not match expected ${slot.expectedWidth}px.`);
  }
  if (slot.expectedHeight !== undefined && imageInfo.height !== slot.expectedHeight) {
    warnings.push(`Asset height ${imageInfo.height ?? "unknown"}px does not match expected ${slot.expectedHeight}px.`);
  }
  if (slot.transparencyRequirement === "required" && !imageInfo.hasAlpha) {
    errors.push("Asset transparency is required but no alpha channel was detected.");
  }
  if (slot.transparencyRequirement === "forbidden" && imageInfo.hasAlpha) {
    warnings.push("Asset transparency is marked forbidden but an alpha-capable image was detected.");
  }
  if (slot.visibleBoundsRequired) {
    if (imageInfo.visiblePixelCount === 0) {
      errors.push("Visible bounds are empty; the image appears fully transparent.");
    } else if (imageInfo.visiblePixelCount === undefined) {
      warnings.push("Visible bounds could not be checked cheaply for this image.");
    }
  }

  return withValidation(slot, statusFromMessages(warnings, errors), warnings, errors, checkedAt);
}

export function validateVisualAssetSlotContractSync(workspaceFolderPath: string, slot: VisualAssetSlotContract, checkedAt = new Date().toISOString()): VisualAssetSlotContract {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!slot.expectedPath) {
    warnings.push(slot.expectedGlob
      ? "Expected path is not concrete; glob metadata is recorded but not expanded by v0.63."
      : "Expected path is unknown; validation is metadata-only.");
    return withValidation(slot, "unknown", warnings, errors, checkedAt);
  }

  const pathCheck = resolveSafeAssetPath(workspaceFolderPath, slot.expectedPath);
  if (!pathCheck.ok) {
    return withValidation(slot, "invalid", warnings, [pathCheck.error], checkedAt);
  }

  let bytes: Uint8Array;
  try {
    bytes = fsSync.readFileSync(pathCheck.absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return withValidation(slot, "missing", warnings, [`Missing asset file: ${slot.expectedPath}`], checkedAt);
    }
    return withValidation(slot, "invalid", warnings, [`Asset file is not readable: ${errorToMessage(error)}`], checkedAt);
  }

  return validateVisualAssetSlotBytes(slot, bytes, checkedAt, warnings, errors);
}

export function summarizeVisualAssetContractStatuses(file: VisualAssetContractFile): VisualAssetContractStatusCounts {
  const counts: VisualAssetContractStatusCounts = {
    valid: 0,
    warning: 0,
    invalid: 0,
    missing: 0,
    unknown: 0,
    total: 0
  };
  for (const slot of file.contracts.flatMap((contract) => contract.slots)) {
    counts.total += 1;
    counts[slot.validation.status] += 1;
  }
  return counts;
}

export function mergeVisualAssetContractFiles(existing: VisualAssetContractFile, generated: VisualAssetContractFile, updatedAt?: string): VisualAssetContractFile {
  const existingById = new Map(existing.contracts.map((contract) => [contract.contractId, contract]));
  const contracts = generated.contracts.map((generatedContract) => {
    const existingContract = existingById.get(generatedContract.contractId);
    if (!existingContract) {
      return generatedContract;
    }
    const existingSlots = new Map(existingContract.slots.map((slot) => [slot.assetSlotId, slot]));
    return {
      ...existingContract,
      ...generatedContract,
      slots: generatedContract.slots.map((generatedSlot) => ({
        ...existingSlots.get(generatedSlot.assetSlotId),
        ...generatedSlot,
        validation: generatedSlot.validation
      }))
    };
  });
  return {
    ...existing,
    ...generated,
    updatedAt,
    contracts
  };
}

export function assetContractWritePaths(): string[] {
  return [assetContractRelativePath];
}

function withValidation(slot: VisualAssetSlotContract, status: VisualAssetValidationStatus, warnings: string[], errors: string[], checkedAt: string): VisualAssetSlotContract {
  return {
    ...slot,
    validation: {
      status,
      warnings,
      errors,
      lastCheckedAt: checkedAt
    }
  };
}

function validateVisualAssetSlotBytes(slot: VisualAssetSlotContract, bytes: Uint8Array, checkedAt: string, warnings: string[], errors: string[]): VisualAssetSlotContract {
  const imageInfo = inspectAssetImage(bytes);
  if (imageInfo.fileType === "unsupported") {
    errors.push("Asset file is not a supported PNG/WebP image.");
  }
  const expectedFormats = normalizeExpectedFormats(slot);
  if (expectedFormats.length > 0 && imageInfo.fileType !== "unsupported" && !expectedFormats.includes(imageInfo.fileType)) {
    errors.push(`Asset format ${imageInfo.fileType} does not match expected ${expectedFormats.join(" or ")}.`);
  }
  if (slot.expectedWidth !== undefined && imageInfo.width !== slot.expectedWidth) {
    warnings.push(`Asset width ${imageInfo.width ?? "unknown"}px does not match expected ${slot.expectedWidth}px.`);
  }
  if (slot.expectedHeight !== undefined && imageInfo.height !== slot.expectedHeight) {
    warnings.push(`Asset height ${imageInfo.height ?? "unknown"}px does not match expected ${slot.expectedHeight}px.`);
  }
  if (slot.transparencyRequirement === "required" && !imageInfo.hasAlpha) {
    errors.push("Asset transparency is required but no alpha channel was detected.");
  }
  if (slot.transparencyRequirement === "forbidden" && imageInfo.hasAlpha) {
    warnings.push("Asset transparency is marked forbidden but an alpha-capable image was detected.");
  }
  if (slot.visibleBoundsRequired) {
    if (imageInfo.visiblePixelCount === 0) {
      errors.push("Visible bounds are empty; the image appears fully transparent.");
    } else if (imageInfo.visiblePixelCount === undefined) {
      warnings.push("Visible bounds could not be checked cheaply for this image.");
    }
  }

  return withValidation(slot, statusFromMessages(warnings, errors), warnings, errors, checkedAt);
}

function statusFromMessages(warnings: string[], errors: string[]): VisualAssetValidationStatus {
  if (errors.length > 0) {
    return "invalid";
  }
  if (warnings.length > 0) {
    return "warning";
  }
  return "valid";
}

function resolveSafeAssetPath(workspaceFolderPath: string, expectedPath: string): { ok: true; absolutePath: string } | { ok: false; error: string } {
  const normalized = normalizeWorkspacePath(expectedPath);
  if (path.isAbsolute(expectedPath) || normalized.startsWith("../") || normalized === ".." || normalized.includes("/../") || normalized.includes("*")) {
    return { ok: false, error: `Unsafe or unsupported asset path: ${expectedPath}` };
  }
  const absolutePath = path.resolve(workspaceFolderPath, normalized);
  const workspaceRoot = path.resolve(workspaceFolderPath);
  if (absolutePath !== workspaceRoot && !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
    return { ok: false, error: `Asset path escapes workspace: ${expectedPath}` };
  }
  return { ok: true, absolutePath };
}

function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function normalizeExpectedFormats(slot: VisualAssetSlotContract): Array<"image/png" | "image/webp"> {
  return uniqueFormats([
    ...((slot.expectedFormats ?? []).map(normalizeExpectedFormat)),
    normalizeExpectedFormat(slot.expectedFormat)
  ].filter((value): value is "image/png" | "image/webp" => Boolean(value)));
}

function normalizeExpectedFormat(format: VisualAssetFormat | undefined): "image/png" | "image/webp" | undefined {
  if (format === "PNG") {
    return "image/png";
  }
  if (format === "WebP") {
    return "image/webp";
  }
  return undefined;
}

function uniqueFormats(values: Array<"image/png" | "image/webp">): Array<"image/png" | "image/webp"> {
  return Array.from(new Set(values));
}

function loaderHintFromAssignmentMode(mode: AssetReplacementAssignmentMode): VisualAssetLoaderHint {
  if (mode === "manifest" || mode === "style_config" || mode === "runtime_bridge" || mode === "manual_required") {
    return mode;
  }
  return "unknown";
}

function sortAssetContractFile(file: VisualAssetContractFile): VisualAssetContractFile {
  return {
    ...file,
    contracts: [...file.contracts]
      .map((contract) => ({
        ...contract,
        slots: [...contract.slots].sort((a, b) => a.assetSlotId.localeCompare(b.assetSlotId))
      }))
      .sort((a, b) => a.contractId.localeCompare(b.contractId))
  };
}

function isVisualAssetContractFile(value: Partial<VisualAssetContractFile>): value is VisualAssetContractFile {
  return value.schemaVersion === assetContractSchemaVersion
    && value.generatedBy === "game-polish-lab"
    && Array.isArray(value.contracts)
    && value.contracts.every((contract) => typeof contract.contractId === "string" && Array.isArray(contract.slots));
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
