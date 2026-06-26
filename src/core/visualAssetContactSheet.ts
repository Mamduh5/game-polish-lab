import * as fsSync from "fs";
import * as path from "path";

import { inspectAssetImage } from "./assetReplacement";
import { assetContractRelativePath, loadVisualAssetContractFileFromText, readVisualAssetContractFile } from "./visualAssetContracts";
import { VisualAssetContract, VisualAssetContractFile, VisualAssetFormat, VisualAssetSlotContract } from "../types/visualAssetContract";
import {
  VisualAssetContactSheet,
  VisualAssetContactSheetGroup,
  VisualAssetContactSheetItem,
  VisualAssetMockupContext,
  VisualAssetMockupContextType
} from "../types/visualAssetContactSheet";

export async function buildVisualAssetContactSheet(workspaceFolderPath: string, generatedAt = new Date()): Promise<VisualAssetContactSheet> {
  const load = await readVisualAssetContractFile(workspaceFolderPath, generatedAt.toISOString());
  return buildVisualAssetContactSheetFromContractFile(workspaceFolderPath, load.file, {
    generatedAt,
    sourceStatus: load.status,
    sourceContractPath: assetContractRelativePath,
    warnings: load.warnings
  });
}

export function buildVisualAssetContactSheetFromText(workspaceFolderPath: string, text: string | undefined, generatedAt = new Date()): VisualAssetContactSheet {
  const load = loadVisualAssetContractFileFromText(text, generatedAt.toISOString());
  return buildVisualAssetContactSheetFromContractFile(workspaceFolderPath, load.file, {
    generatedAt,
    sourceStatus: load.status,
    sourceContractPath: assetContractRelativePath,
    warnings: load.warnings
  });
}

export function buildVisualAssetContactSheetFromContractFile(
  workspaceFolderPath: string,
  file: VisualAssetContractFile,
  options: { generatedAt?: Date; sourceStatus?: "missing" | "valid" | "malformed"; sourceContractPath?: string; warnings?: string[] } = {}
): VisualAssetContactSheet {
  const generatedAt = options.generatedAt ?? new Date();
  const groups = deterministicContracts(file.contracts).map((contract) => buildContactSheetGroup(workspaceFolderPath, contract));
  const warnings = [...(options.warnings ?? [])];
  return {
    schemaVersion: "visual-asset-contact-sheet/v1",
    generatedAt: generatedAt.toISOString(),
    state: options.sourceStatus === "malformed" ? "error" : groups.length > 0 ? "ready" : "empty",
    sourceContractPath: options.sourceContractPath ?? assetContractRelativePath,
    sourceStatus: options.sourceStatus ?? "valid",
    warnings,
    groups,
    renderOptions: {
      includeRawAssetPreview: true,
      includeMockupPreview: true,
      maxPreviewSize: 160
    }
  };
}

export function resolveContactSheetAssetPreviewPath(workspaceFolderPath: string, assetPath: string | undefined): string | undefined {
  if (!assetPath) {
    return undefined;
  }
  const pathCheck = resolveSafeAssetPath(workspaceFolderPath, assetPath);
  if (!pathCheck.ok || !fsSync.existsSync(pathCheck.absolutePath)) {
    return undefined;
  }
  return pathCheck.absolutePath;
}

function buildContactSheetGroup(workspaceFolderPath: string, contract: VisualAssetContract): VisualAssetContactSheetGroup {
  return {
    groupId: [
      contract.adapterId ?? "unknown_adapter",
      contract.targetSurfaceType,
      contract.targetId,
      contract.contractId
    ].join(":"),
    contractId: contract.contractId,
    adapterId: contract.adapterId,
    targetSurfaceType: contract.targetSurfaceType,
    targetId: contract.targetId,
    targetLabel: contract.targetLabel,
    items: deterministicSlots(contract.slots).map((slot) => buildContactSheetItem(workspaceFolderPath, contract, slot))
  };
}

function buildContactSheetItem(workspaceFolderPath: string, contract: VisualAssetContract, slot: VisualAssetSlotContract): VisualAssetContactSheetItem {
  const warnings = [...slot.validation.warnings];
  const errors = [...slot.validation.errors];
  const image = inspectSlotImage(workspaceFolderPath, slot);
  if (image.warning) {
    warnings.push(image.warning);
  }
  if (image.error) {
    errors.push(image.error);
  }
  const expectedFormats = [...(slot.expectedFormats ?? []), slot.expectedFormat].filter((value): value is VisualAssetFormat => Boolean(value));
  const format = image.format ?? expectedFormats.find((value) => value !== "unknown");
  return {
    itemId: [
      contract.adapterId ?? "unknown_adapter",
      contract.targetSurfaceType,
      contract.targetId,
      slot.assetSlotId
    ].join(":"),
    contractId: contract.contractId,
    adapterId: contract.adapterId,
    targetSurfaceType: contract.targetSurfaceType,
    targetId: contract.targetId,
    targetLabel: contract.targetLabel,
    assetSlotId: slot.assetSlotId,
    assetPath: slot.expectedPath,
    assetGlob: slot.expectedGlob,
    assetExists: image.exists,
    validationStatus: image.exists || slot.validation.status !== "unknown" ? slot.validation.status : "missing",
    expectedWidth: slot.expectedWidth,
    expectedHeight: slot.expectedHeight,
    actualWidth: image.width,
    actualHeight: image.height,
    format,
    transparencyStatus: image.transparencyStatus,
    warnings,
    errors,
    previewLabel: slot.label ?? slot.assetSlotId,
    mockupContexts: inferMockupContexts(contract, slot)
  };
}

function inspectSlotImage(workspaceFolderPath: string, slot: VisualAssetSlotContract): { exists: boolean; width?: number; height?: number; format?: VisualAssetFormat; transparencyStatus: "has_alpha" | "no_alpha" | "unknown"; warning?: string; error?: string } {
  if (!slot.expectedPath) {
    return { exists: false, transparencyStatus: "unknown" };
  }
  const pathCheck = resolveSafeAssetPath(workspaceFolderPath, slot.expectedPath);
  if (!pathCheck.ok) {
    return { exists: false, transparencyStatus: "unknown", error: pathCheck.error };
  }
  let bytes: Uint8Array;
  try {
    bytes = fsSync.readFileSync(pathCheck.absolutePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      return { exists: false, transparencyStatus: "unknown" };
    }
    return { exists: false, transparencyStatus: "unknown", error: `Asset preview file is not readable: ${errorToMessage(error)}` };
  }
  const imageInfo = inspectAssetImage(bytes);
  if (imageInfo.fileType === "unsupported") {
    return { exists: true, transparencyStatus: "unknown", error: "Asset preview file is not a supported PNG/WebP image." };
  }
  return {
    exists: true,
    width: imageInfo.width,
    height: imageInfo.height,
    format: imageInfo.fileType === "image/png" ? "PNG" : "WebP",
    transparencyStatus: imageInfo.hasAlpha ? "has_alpha" : "no_alpha",
    warning: imageInfo.visiblePixelCount === 0 ? "Asset preview appears fully transparent." : undefined
  };
}

function inferMockupContexts(contract: VisualAssetContract, slot: VisualAssetSlotContract): VisualAssetMockupContext[] {
  const contexts: VisualAssetMockupContext[] = [
    {
      type: "raw_asset",
      label: "Raw asset",
      expectedDisplayWidth: slot.expectedWidth,
      expectedDisplayHeight: slot.expectedHeight
    }
  ];
  const extra = inferPrimaryMockupContextType(contract, slot);
  if (extra && extra !== "raw_asset") {
    contexts.push({
      type: extra,
      label: labelForContext(extra),
      expectedDisplayWidth: slot.expectedWidth,
      expectedDisplayHeight: slot.expectedHeight
    });
  }
  return contexts;
}

function inferPrimaryMockupContextType(contract: VisualAssetContract, slot: VisualAssetSlotContract): VisualAssetMockupContextType | undefined {
  const searchable = `${contract.targetSurfaceType} ${contract.targetId} ${contract.targetLabel ?? ""} ${slot.assetSlotId} ${slot.label ?? ""}`.toLowerCase();
  if (contract.targetSurfaceType === "reward_toast" || searchable.includes("reward") || searchable.includes("icon")) {
    return "reward_icon";
  }
  if (contract.targetSurfaceType === "panel" || searchable.includes("panel")) {
    return "panel";
  }
  if (contract.targetSurfaceType === "slot_card" || /\b(slot|card|monster)\b/.test(searchable) || searchable.includes("slot_") || searchable.includes("monster_")) {
    return "slot_card";
  }
  return undefined;
}

function labelForContext(type: VisualAssetMockupContextType): string {
  if (type === "slot_card") {
    return "Slot card mockup";
  }
  if (type === "panel") {
    return "Panel mockup";
  }
  if (type === "reward_icon") {
    return "Reward icon mockup";
  }
  return "Raw asset";
}

function deterministicContracts(contracts: VisualAssetContract[]): VisualAssetContract[] {
  return [...contracts].sort((a, b) => compareKeys([
    a.adapterId ?? "",
    a.targetSurfaceType,
    a.targetId,
    a.contractId
  ], [
    b.adapterId ?? "",
    b.targetSurfaceType,
    b.targetId,
    b.contractId
  ]));
}

function deterministicSlots(slots: VisualAssetSlotContract[]): VisualAssetSlotContract[] {
  return [...slots].sort((a, b) => a.assetSlotId.localeCompare(b.assetSlotId));
}

function compareKeys(left: string[], right: string[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const comparison = left[index].localeCompare(right[index]);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return 0;
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

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT";
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
