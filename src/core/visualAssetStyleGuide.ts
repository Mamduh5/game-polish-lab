import * as fs from "fs";
import * as path from "path";

import { loadVisualAssetContractFileFromText } from "./visualAssetContracts";
import { visualAssetBoundsResultsRelativePath, visualAssetNormalizationResultsRelativePath } from "./visualAssetBoundsNormalization";
import { writeGamePolishLabOwnedFileWithRollback } from "./visualAssetPipelineRollback";
import { normalizeVisualScopePath } from "./visualScopeGuard";
import type {
  ImportedVisualAssetCandidate,
  VisualAssetBoundsAnalysisResult,
  VisualAssetNormalizationResult,
  VisualAssetSlot,
  VisualAssetValidationResult
} from "../types/visualAssetPipeline";
import type { VisualAssetContractFile, VisualAssetSlotContract } from "../types/visualAssetContract";
import type {
  VisualAssetStyleGuide,
  VisualAssetStyleGuideFallbackTask,
  VisualAssetStyleGuideIndex,
  VisualAssetStyleGuideSummary,
  VisualAssetStyleGuideWriteResult
} from "../types/visualAssetStyleGuide";

export const visualAssetStyleGuideRelativeDir = ".game-polish-lab/assets/style-guides";
export const visualAssetStyleGuideIndexRelativePath = ".game-polish-lab/assets/style-guides/index.json";

const forbiddenChanges = [
  "source/runtime patching",
  "save schema/state persistence changes",
  "economy/balance/progression changes",
  "level/rule/solver changes",
  "enemy/player gameplay changes",
  "projectile/shooter/auto-shooter systems",
  "upgrade costs/effects/value logic",
  "ad/monetization changes",
  "package/dependency churn unless explicitly required and explained",
  "unrelated adapter changes",
  "broad rewrites outside chosen file scope",
  "generated image data"
];

export function buildVisualAssetStyleGuide(input: {
  workspaceRoot: string;
  slot: VisualAssetSlot;
  candidate?: ImportedVisualAssetCandidate;
  validation?: VisualAssetValidationResult;
  boundsAnalysis?: VisualAssetBoundsAnalysisResult;
  normalization?: VisualAssetNormalizationResult;
  contract?: VisualAssetSlotContract;
  userNotes?: string[];
  now?: Date;
}): VisualAssetStyleGuide {
  const createdAt = (input.now ?? new Date()).toISOString();
  const guideId = `${safeId(input.slot.slotId)}-${timestampForPath(new Date(createdAt))}`;
  const contract = input.contract;
  const targetCanvas = dimensionsFromContract(contract) ?? input.slot.expectedDimensions;
  const transparencyRequirement = contract?.transparencyRequirement ?? (input.slot.transparencyRequired === true ? "required" : input.slot.transparencyRequired === false ? "optional" : "unknown");
  const warnings = guideWarnings(input.slot, contract, input.boundsAnalysis, targetCanvas);
  const validationWarnings = [
    ...(input.validation?.warnings ?? []),
    ...(input.validation?.errors ?? []),
    ...(input.candidate?.validationWarnings ?? []),
    ...(input.candidate?.validationErrors ?? []),
    ...(input.boundsAnalysis?.warnings ?? []),
    ...(input.boundsAnalysis?.errors ?? [])
  ];
  const visibleBoundsRules = {
    required: contract?.visibleBoundsRequired ?? input.slot.transparencyRequired,
    minVisibleAreaRatio: valueOrUndefined(contract?.expectedVisibleBoundsMinRatio, input.slot.expectedVisibleBoundsMinRatio),
    maxVisibleAreaRatio: valueOrUndefined(contract?.expectedVisibleBoundsMaxRatio, input.slot.expectedVisibleBoundsMaxRatio),
    safePadding: valueOrUndefined(contract?.safePadding, input.slot.safePadding),
    centerTolerancePct: valueOrUndefined(contract?.centerTolerancePct, input.slot.centerTolerancePct),
    edgeTouchAllowed: valueOrUndefined(contract?.edgeTouchAllowed, input.slot.edgeTouchAllowed),
    summary: boundsRuleSummary(input.slot, contract, targetCanvas)
  };
  const guide: VisualAssetStyleGuide = {
    guideId,
    createdAt,
    workspaceLabel: safeWorkspaceLabel(input.workspaceRoot),
    adapterId: input.slot.adapterId,
    adapterLabel: input.slot.adapterLabel,
    surfaceId: input.slot.surfaceId,
    surfaceLabel: input.slot.surfaceLabel,
    assetSlotId: input.slot.slotId,
    assetSlotLabel: input.slot.slotLabel,
    expectedAssetType: input.slot.expectedAssetType,
    targetCanvas,
    allowedFileExtensions: input.slot.expectedFileExtensions,
    transparencyRequirement,
    safePadding: visibleBoundsRules.safePadding,
    visibleBoundsRules,
    centerTolerancePct: visibleBoundsRules.centerTolerancePct,
    edgeTouchAllowed: visibleBoundsRules.edgeTouchAllowed,
    scaleGuidance: {
      normalizationAllowed: valueOrUndefined(contract?.normalizationAllowed, input.slot.normalizationAllowed),
      scaleDownAllowed: valueOrUndefined(contract?.scaleDownAllowed, input.slot.scaleDownAllowed),
      upscaleAllowed: valueOrUndefined(contract?.upscaleAllowed, input.slot.upscaleAllowed),
      summary: scaleGuidanceSummary(input.slot, contract)
    },
    currentAssetPath: input.slot.currentAssetPath,
    importedAssetPath: input.candidate?.copiedAssetPath,
    normalizedAssetPath: input.normalization?.outputPath,
    validationWarnings: Array.from(new Set(validationWarnings)),
    boundsSummary: input.boundsAnalysis
      ? {
        visibleBounds: input.boundsAnalysis.visibleBounds,
        visibleAreaRatio: input.boundsAnalysis.visibleAreaRatio,
        centerOffset: input.boundsAnalysis.centerOffset,
        recommendedAction: input.boundsAnalysis.recommendedAction,
        warnings: input.boundsAnalysis.warnings,
        errors: input.boundsAnalysis.errors
      }
      : undefined,
    styleDirectionNotes: styleDirectionNotes(input.slot, input.candidate, input.normalization, input.userNotes),
    readabilityNotes: readabilityNotes(input.slot),
    gameSurfaceContextNotes: contextNotes(input.slot),
    forbiddenChanges,
    contactSheetRequest: buildContactSheetRequest(input.slot, targetCanvas, transparencyRequirement, visibleBoundsRules.summary),
    validationChecklist: validationChecklist(input.slot, targetCanvas, transparencyRequirement),
    outputFiles: [],
    warnings
  };
  const paths = styleGuidePaths(guide.guideId);
  return {
    ...guide,
    outputFiles: [paths.markdownPath, paths.jsonPath, visualAssetStyleGuideIndexRelativePath]
  };
}

export function writeVisualAssetStyleGuide(input: {
  workspaceRoot: string;
  guide: VisualAssetStyleGuide;
}): VisualAssetStyleGuideWriteResult {
  const paths = styleGuidePaths(input.guide.guideId);
  const markdown = renderVisualAssetStyleGuideMarkdown(input.guide);
  const contactSheetRequestText = renderContactSheetRequest(input.guide);
  const rollbackSnapshotPaths = [
    writeGamePolishLabOwnedFileWithRollback({
      workspaceRoot: input.workspaceRoot,
      relativePath: paths.jsonPath,
      data: `${JSON.stringify(input.guide, null, 2)}\n`,
      now: new Date(input.guide.createdAt),
      label: "asset-style-guide-json"
    }),
    writeGamePolishLabOwnedFileWithRollback({
      workspaceRoot: input.workspaceRoot,
      relativePath: paths.markdownPath,
      data: markdown,
      now: new Date(input.guide.createdAt),
      label: "asset-style-guide-markdown"
    }),
    writeVisualAssetStyleGuideIndex(input.workspaceRoot, guideSummary(input.guide, paths.markdownPath, paths.jsonPath), input.guide.createdAt).rollbackSnapshotPath
  ].filter((value): value is string => Boolean(value));
  return {
    guide: input.guide,
    markdownPath: paths.markdownPath,
    jsonPath: paths.jsonPath,
    indexPath: visualAssetStyleGuideIndexRelativePath,
    contactSheetRequestText,
    rollbackSnapshotPaths
  };
}

export function generateVisualAssetStyleGuide(input: Parameters<typeof buildVisualAssetStyleGuide>[0]): VisualAssetStyleGuideWriteResult {
  return writeVisualAssetStyleGuide({
    workspaceRoot: input.workspaceRoot,
    guide: buildVisualAssetStyleGuide(input)
  });
}

export function renderVisualAssetStyleGuideMarkdown(guide: VisualAssetStyleGuide): string {
  const lines = [
    `# Asset Style Guide: ${guide.assetSlotLabel}`,
    "",
    "## Target Slot",
    `- Adapter: ${guide.adapterLabel} (${guide.adapterId})`,
    `- Surface: ${guide.surfaceLabel} (${guide.surfaceId})`,
    `- Slot: ${guide.assetSlotLabel} (${guide.assetSlotId})`,
    `- Expected asset type: ${guide.expectedAssetType}`,
    "",
    "## Adapter/Game Context",
    ...guide.gameSurfaceContextNotes.map((note) => `- ${note}`),
    "",
    "## Surface Context",
    `Create replacement asset candidates for the selected ${guide.surfaceLabel} surface only. This guide does not assign assets or apply runtime changes.`,
    "",
    "## Canvas and File Requirements",
    `- Canvas: ${canvasText(guide.targetCanvas)}`,
    `- File format: ${guide.allowedFileExtensions.join(", ")}`,
    `- Export transparent PNG when transparency is required.`,
    "",
    "## Transparency and Alpha Rules",
    `- Transparency: ${guide.transparencyRequirement}`,
    "- Preserve clean alpha edges. Do not bake a background into transparent slots.",
    "",
    "## Visible Bounds and Padding Rules",
    `- ${guide.visibleBoundsRules.summary}`,
    `- Center tolerance: ${guide.centerTolerancePct !== undefined ? `${formatPct(guide.centerTolerancePct)} of canvas` : "unknown; manual review required"}`,
    `- Edge touch: ${guide.edgeTouchAllowed === true ? "allowed by contract" : "avoid touching canvas edges"}`,
    `- Scaling: ${guide.scaleGuidance.summary}`,
    "",
    "## Readability Requirements",
    ...guide.readabilityNotes.map((note) => `- ${note}`),
    "",
    "## Style Direction",
    ...guide.styleDirectionNotes.map((note) => `- ${note}`),
    "",
    "## What To Avoid",
    ...guide.forbiddenChanges.map((item) => `- ${item}`),
    "- vague improvement-only requests without canvas, bounds, readability, and export requirements",
    "",
    "## Contact-Sheet Request",
    renderContactSheetRequest(guide),
    "",
    "## Validation Checklist",
    ...guide.validationChecklist.map((item) => `- [ ] ${item}`),
    "",
    "## Existing Asset References/Paths",
    `- Current asset: ${guide.currentAssetPath ?? "unknown"}`,
    `- Imported candidate: ${guide.importedAssetPath ?? "none selected"}`,
    `- Normalized candidate: ${guide.normalizedAssetPath ?? "none selected"}`,
    "",
    "## Bounds/Validation Warnings",
    ...(guide.validationWarnings.length > 0 ? guide.validationWarnings : ["No validation or bounds warnings recorded."]).map((warning) => `- ${warning}`),
    ...(guide.warnings.length > 0 ? ["", "## Guide Warnings", ...guide.warnings.map((warning) => `- ${warning}`)] : []),
    ""
  ];
  return `${lines.join("\n")}`;
}

export function renderContactSheetRequest(guide: VisualAssetStyleGuide): string {
  const request = guide.contactSheetRequest;
  return [
    `Create a contact sheet with ${request.variantCount} labeled variants for ${guide.assetSlotLabel}.`,
    `Canvas size: ${request.canvasSize}.`,
    `Transparent background: ${request.transparentBackground ? "required" : "optional"}.`,
    `Keep viewpoint/scale consistent: ${request.consistentViewpointAndScale ? "yes" : "no"}.`,
    `Safe padding: ${request.safePaddingRequirement}.`,
    `Readability: ${request.readabilityRequirement}.`,
    `Surface context: ${request.surfaceContext}.`,
    `Variant labels: ${request.variantLabels.join(", ")}.`,
    request.textPolicy,
    `Export format: ${request.exportFormat}.`,
    `Naming convention: ${request.namingConvention}.`,
    `Validation checklist: ${request.validationChecklist.join("; ")}.`
  ].join("\n");
}

export function readVisualAssetStyleGuideIndex(workspaceRoot: string): VisualAssetStyleGuideIndex {
  const filePath = path.join(workspaceRoot, ...visualAssetStyleGuideIndexRelativePath.split("/"));
  if (!fs.existsSync(filePath)) {
    return { schemaVersion: "visual-asset-style-guides/v1", guides: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<VisualAssetStyleGuideIndex>;
    if (parsed.schemaVersion !== "visual-asset-style-guides/v1" || !Array.isArray(parsed.guides)) {
      return { schemaVersion: "visual-asset-style-guides/v1", guides: [] };
    }
    return parsed as VisualAssetStyleGuideIndex;
  } catch {
    return { schemaVersion: "visual-asset-style-guides/v1", guides: [] };
  }
}

export function readVisualAssetStyleGuideFile(workspaceRoot: string, relativePath: string): VisualAssetStyleGuide | undefined {
  const normalized = normalizeVisualScopePath(relativePath);
  if (!normalized.startsWith(`${visualAssetStyleGuideRelativeDir}/`) || !normalized.endsWith(".json")) {
    return undefined;
  }
  const absolutePath = path.join(workspaceRoot, ...normalized.split("/"));
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as VisualAssetStyleGuide;
    return parsed.guideId && parsed.assetSlotId ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function readLatestVisualAssetStyleGuideSummaries(workspaceRoot: string): VisualAssetStyleGuideSummary[] {
  const latestBySlot = new Map<string, VisualAssetStyleGuideSummary>();
  for (const guide of readVisualAssetStyleGuideIndex(workspaceRoot).guides) {
    const existing = latestBySlot.get(guide.assetSlotId);
    if (!existing || existing.createdAt < guide.createdAt) {
      latestBySlot.set(guide.assetSlotId, guide);
    }
  }
  return Array.from(latestBySlot.values()).sort((a, b) => a.assetSlotId.localeCompare(b.assetSlotId));
}

export function writeVisualAssetStyleGuideIndex(workspaceRoot: string, summary: VisualAssetStyleGuideSummary, updatedAt: string): { indexPath: string; rollbackSnapshotPath?: string } {
  const current = readVisualAssetStyleGuideIndex(workspaceRoot);
  const guides = mergeById(current.guides, [summary], (guide) => guide.guideId);
  const index: VisualAssetStyleGuideIndex = {
    schemaVersion: "visual-asset-style-guides/v1",
    updatedAt,
    guides
  };
  const rollbackSnapshotPath = writeGamePolishLabOwnedFileWithRollback({
    workspaceRoot,
    relativePath: visualAssetStyleGuideIndexRelativePath,
    data: `${JSON.stringify(index, null, 2)}\n`,
    now: new Date(updatedAt),
    label: "asset-style-guide-index"
  });
  return { indexPath: visualAssetStyleGuideIndexRelativePath, rollbackSnapshotPath };
}

export function readVisualAssetContractFileSync(workspaceRoot: string): VisualAssetContractFile | undefined {
  const contractPath = path.join(workspaceRoot, ".game-polish-lab", "assets", "asset-contracts.json");
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

export function buildVisualAssetStyleGuideFallbackTask(input: {
  slot: VisualAssetSlot;
  guide: VisualAssetStyleGuide;
  markdownPath: string;
  contactSheetRequestText?: string;
  now?: Date;
}): VisualAssetStyleGuideFallbackTask {
  const now = input.now ?? new Date();
  return {
    taskId: `${timestampForPath(now)}-${input.slot.slotId}-asset-style-guide`,
    adapterId: input.slot.adapterId,
    adapterLabel: input.slot.adapterLabel,
    surfaceId: input.slot.surfaceId,
    surfaceLabel: input.slot.surfaceLabel,
    assetSlotId: input.slot.slotId,
    assetSlotLabel: input.slot.slotLabel,
    styleGuidePath: input.markdownPath,
    contactSheetRequestText: input.contactSheetRequestText ?? renderContactSheetRequest(input.guide),
    assetContractSummary: `${canvasText(input.guide.targetCanvas)}; transparency ${input.guide.transparencyRequirement}; ${input.guide.visibleBoundsRules.summary}`,
    validationAndBoundsWarnings: [...input.guide.validationWarnings, ...input.guide.warnings],
    allowedFiles: Array.from(new Set([
      input.markdownPath,
      `${visualAssetStyleGuideRelativeDir}/${input.guide.guideId}.json`,
      visualAssetStyleGuideIndexRelativePath,
      visualAssetBoundsResultsRelativePath,
      visualAssetNormalizationResultsRelativePath
    ])).sort(),
    forbiddenAreas: forbiddenChanges,
    instruction: "use this style guide to create replacement asset candidates for this selected visual asset slot only.",
    manualReviewChecklist: [
      "Confirm the output is replacement asset candidate guidance only.",
      "Confirm no source/runtime files, manifests, loaders, save, economy, progression, rules, ads, gameplay, enemy/player, projectile, shooter, or upgrade logic are changed.",
      "Confirm generated image files are not produced by this task.",
      "Confirm any future imported assets are validated through the Asset Pipeline Dashboard."
    ],
    createdAt: now.toISOString()
  };
}

export function writeVisualAssetStyleGuideFallbackTask(workspaceRoot: string, task: VisualAssetStyleGuideFallbackTask): string {
  const relativePath = `.game-polish-lab/fallback-tasks/${task.taskId}.json`;
  const absolutePath = path.join(workspaceRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(task, null, 2)}\n`, "utf8");
  return relativePath;
}

function styleGuidePaths(guideId: string): { markdownPath: string; jsonPath: string } {
  return {
    markdownPath: `${visualAssetStyleGuideRelativeDir}/${guideId}.md`,
    jsonPath: `${visualAssetStyleGuideRelativeDir}/${guideId}.json`
  };
}

function guideSummary(guide: VisualAssetStyleGuide, markdownPath: string, jsonPath: string): VisualAssetStyleGuideSummary {
  return {
    guideId: guide.guideId,
    assetSlotId: guide.assetSlotId,
    assetSlotLabel: guide.assetSlotLabel,
    adapterId: guide.adapterId,
    surfaceId: guide.surfaceId,
    markdownPath,
    jsonPath,
    createdAt: guide.createdAt,
    warnings: guide.warnings
  };
}

function guideWarnings(slot: VisualAssetSlot, contract: VisualAssetSlotContract | undefined, bounds: VisualAssetBoundsAnalysisResult | undefined, targetCanvas: VisualAssetStyleGuide["targetCanvas"]): string[] {
  const warnings: string[] = [];
  if (!contract) {
    warnings.push("No asset contract was found for this slot; guide uses slot metadata and requires manual review.");
  }
  if (!targetCanvas) {
    warnings.push("Target canvas dimensions are unknown; do not invent exact dimensions without adapter confirmation.");
  }
  if (!bounds) {
    warnings.push("No v0.81 bounds analysis result is linked; visible bounds guidance is contract/slot-based only.");
  }
  if (slot.knownManifestPath) {
    warnings.push("Known manifest/loader paths are reference-only for this guide and must not be patched by style guide generation.");
  }
  return warnings;
}

function dimensionsFromContract(contract: VisualAssetSlotContract | undefined): VisualAssetStyleGuide["targetCanvas"] {
  return contract?.expectedWidth && contract.expectedHeight ? { width: contract.expectedWidth, height: contract.expectedHeight } : undefined;
}

function boundsRuleSummary(slot: VisualAssetSlot, contract: VisualAssetSlotContract | undefined, targetCanvas: VisualAssetStyleGuide["targetCanvas"]): string {
  const minRatio = valueOrUndefined(contract?.expectedVisibleBoundsMinRatio, slot.expectedVisibleBoundsMinRatio);
  const maxRatio = valueOrUndefined(contract?.expectedVisibleBoundsMaxRatio, slot.expectedVisibleBoundsMaxRatio);
  const padding = valueOrUndefined(contract?.safePadding, slot.safePadding);
  const center = valueOrUndefined(contract?.centerTolerancePct, slot.centerTolerancePct);
  const parts = [
    minRatio !== undefined && maxRatio !== undefined
      ? `Keep visible content within ${formatPct(minRatio)}-${formatPct(maxRatio)} of the canvas area`
      : "Visible content ratio is unknown; keep the silhouette readable and request manual bounds review",
    padding !== undefined ? `with at least ${padding}px transparent safe padding` : targetCanvas ? "with visible transparent padding" : "with padding confirmed manually",
    center !== undefined ? `centered within ${formatPct(center)} tolerance` : "centered by eye",
    valueOrUndefined(contract?.edgeTouchAllowed, slot.edgeTouchAllowed) === true ? "edge touch is allowed" : "avoid edge-cropped shapes"
  ];
  return `${parts.join(", ")}.`;
}

function scaleGuidanceSummary(slot: VisualAssetSlot, contract: VisualAssetSlotContract | undefined): string {
  const scaleDown = valueOrUndefined(contract?.scaleDownAllowed, slot.scaleDownAllowed);
  const upscale = valueOrUndefined(contract?.upscaleAllowed, slot.upscaleAllowed);
  const normalization = valueOrUndefined(contract?.normalizationAllowed, slot.normalizationAllowed);
  return [
    normalization === false ? "normalization disabled" : "normalization may be used only as a separate approved asset-pipeline action",
    scaleDown === true ? "scale-down may be allowed by contract" : "avoid relying on scale-down unless explicitly approved",
    upscale === true ? "upscale may be allowed by contract" : "do not upscale by default"
  ].join("; ");
}

function styleDirectionNotes(slot: VisualAssetSlot, candidate: ImportedVisualAssetCandidate | undefined, normalization: VisualAssetNormalizationResult | undefined, userNotes: string[] | undefined): string[] {
  return [
    `Create a ${slot.expectedAssetType} replacement for ${slot.slotLabel} in ${slot.adapterLabel}.`,
    `Use ${slot.surfaceLabel} context; keep the asset focused on this selected visual slot only.`,
    candidate ? `Imported reference path may be used as workflow context: ${candidate.copiedAssetPath}.` : "No imported reference is selected; use slot metadata and contract requirements.",
    normalization ? `Normalized reference path is available: ${normalization.outputPath}.` : "No normalized reference is selected.",
    ...(userNotes ?? [])
  ];
}

function readabilityNotes(slot: VisualAssetSlot): string[] {
  const typeNote = slot.expectedAssetType === "icon"
    ? "Icon silhouette must stay readable at small HUD sizes."
    : slot.expectedAssetType === "background"
      ? "Background should support foreground readability and avoid high-noise detail behind gameplay/UI."
      : slot.expectedAssetType === "effect"
        ? "Effect artwork should preserve gameplay readability and avoid hiding important targets."
        : slot.expectedAssetType === "ui-frame"
          ? "Frame art should support hierarchy without making labels or controls harder to scan."
          : "Asset should remain legible in its target surface and avoid ambiguous silhouettes.";
  return [
    typeNote,
    "Keep contrast and shape clear in the selected surface context.",
    "Avoid tiny details that disappear at expected canvas size."
  ];
}

function contextNotes(slot: VisualAssetSlot): string[] {
  return [
    `${slot.adapterLabel} adapter, ${slot.surfaceLabel} surface.`,
    `Owner/source hints are reference-only: ${slot.ownerSourceFileHints.join(", ") || "none"}.`,
    "Style guide generation writes Game Polish Lab metadata only and does not patch source/runtime files."
  ];
}

function buildContactSheetRequest(slot: VisualAssetSlot, targetCanvas: VisualAssetStyleGuide["targetCanvas"], transparency: VisualAssetStyleGuide["transparencyRequirement"], boundsSummary: string): VisualAssetStyleGuide["contactSheetRequest"] {
  return {
    variantCount: 6,
    canvasSize: canvasText(targetCanvas),
    transparentBackground: transparency === "required",
    consistentViewpointAndScale: true,
    safePaddingRequirement: boundsSummary,
    readabilityRequirement: `Readable in ${slot.surfaceLabel}; preserve clear silhouette and do not obscure gameplay/UI context.`,
    surfaceContext: `${slot.adapterLabel} / ${slot.surfaceLabel} / ${slot.slotLabel}`,
    variantLabels: ["A", "B", "C", "D", "E", "F"],
    textPolicy: "No text inside icons unless explicitly requested.",
    exportFormat: transparency === "required" ? "PNG with alpha" : slot.expectedFileExtensions.join(" or "),
    namingConvention: `${safeId(slot.slotId)}-variant-{label}.png`,
    validationChecklist: validationChecklist(slot, targetCanvas, transparency)
  };
}

function validationChecklist(slot: VisualAssetSlot, targetCanvas: VisualAssetStyleGuide["targetCanvas"], transparency: VisualAssetStyleGuide["transparencyRequirement"]): string[] {
  return [
    targetCanvas ? `Canvas is exactly ${targetCanvas.width}x${targetCanvas.height}.` : "Canvas dimensions were manually confirmed.",
    `File extension is one of: ${slot.expectedFileExtensions.join(", ")}.`,
    transparency === "required" ? "Transparent background and usable alpha are present." : "Transparency choice matches slot requirement.",
    "Visible content is centered, padded, and not edge-cropped.",
    "Asset remains readable in the selected surface context.",
    "No source/runtime files, manifests, loaders, gameplay, save, economy, progression, ads, or upgrade logic were changed."
  ];
}

function safeWorkspaceLabel(workspaceRoot: string): string | undefined {
  const label = path.basename(workspaceRoot);
  return label && label !== "." ? label : undefined;
}

function canvasText(canvas: VisualAssetStyleGuide["targetCanvas"]): string {
  return canvas ? `${canvas.width}x${canvas.height}` : "unknown; manual review required";
}

function valueOrUndefined<T>(primary: T | undefined, fallback: T | undefined): T | undefined {
  return primary !== undefined ? primary : fallback;
}

function safeId(value: string): string {
  return normalizeVisualScopePath(value).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}

function timestampForPath(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

function formatPct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function mergeById<T>(existing: T[], patch: T[], id: (value: T) => string): T[] {
  const values = new Map(existing.map((entry) => [id(entry), entry]));
  for (const entry of patch) {
    values.set(id(entry), entry);
  }
  return Array.from(values.values()).sort((a, b) => id(a).localeCompare(id(b)));
}
