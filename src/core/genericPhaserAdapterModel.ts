import { AssetReplacementTarget, VisualSurfaceType } from "../types/visualSurface";
import { isForbiddenV05Path } from "./v05VisualScopeGuard";

export type GenericPhaserSurfaceType = Exclude<VisualSurfaceType, "asset_replacement">;

export interface GenericPhaserFileInspection {
  relativePath: string;
  text: string;
}

export interface GenericPhaserDetection {
  adapterId: "generic_phaser";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  likelySceneFiles: string[];
  likelyAssetFolders: string[];
  warnings: string[];
}

export interface GenericFallbackTask {
  adapterId: "generic_phaser";
  surfaceType: VisualSurfaceType;
  targetLabel: string;
  selectedFiles: string[];
  generatedStyleConfigPath: string;
  generatedStyleModulePath?: string;
  fieldNoteGuidance?: {
    preserve: string[];
    avoid: string[];
    mixed: string[];
  };
  allowedFiles: string[];
  forbiddenFiles: string[];
  codexMayDo: string[];
  codexMustNotDo: string[];
  manualTestChecklist: string[];
}

const genericStyleFileNames: Record<GenericPhaserSurfaceType, string> = {
  slot_card: "generic-slot-card-style.json",
  background_readability: "generic-background-readability-style.json",
  panel: "generic-panel-style.json",
  reward_toast: "generic-reward-toast-style.json",
  button: "generic-button-style.json"
};

const genericStyleModuleNames: Record<GenericPhaserSurfaceType, string> = {
  slot_card: "genericSlotCardStyle.ts",
  background_readability: "genericBackgroundReadabilityStyle.ts",
  panel: "genericPanelStyle.ts",
  reward_toast: "genericRewardToastStyle.ts",
  button: "genericButtonStyle.ts"
};

export function detectGenericPhaserProject(files: GenericPhaserFileInspection[]): GenericPhaserDetection {
  const evidence: string[] = [];
  const likelySceneFiles = new Set<string>();
  const likelyAssetFolders = new Set<string>();
  let strongEvidenceCount = 0;

  for (const file of files) {
    const normalizedPath = normalizeWorkspacePath(file.relativePath);
    const lowerPath = normalizedPath.toLowerCase();
    const lowerText = file.text.toLowerCase();
    if (lowerPath.endsWith("package.json") && lowerText.includes("\"phaser\"")) {
      evidence.push(`${normalizedPath}: package.json dependency references phaser.`);
      strongEvidenceCount += 1;
    }
    if (/from\s+["']phaser["']|import\s+.*phaser/.test(lowerText)) {
      evidence.push(`${normalizedPath}: imports Phaser.`);
      strongEvidenceCount += 1;
    }
    if (/phaser\.scene|extends\s+phaser\.scene/.test(lowerText)) {
      evidence.push(`${normalizedPath}: uses Phaser.Scene.`);
      likelySceneFiles.add(normalizedPath);
      strongEvidenceCount += 1;
    }
    if (/src\/scenes|src\/game|src\/main/.test(lowerPath)) {
      evidence.push(`${normalizedPath}: common Phaser source path.`);
      if (/\.(ts|tsx|js|jsx)$/.test(lowerPath)) {
        likelySceneFiles.add(normalizedPath);
      }
    }
    for (const assetFolder of ["public/assets", "src/assets", "assets"]) {
      if (lowerPath.startsWith(`${assetFolder}/`) || lowerPath === assetFolder) {
        likelyAssetFolders.add(assetFolder);
      }
    }
  }

  const uniqueEvidence = Array.from(new Set(evidence));
  const confidence = strongEvidenceCount >= 2 || Array.from(likelySceneFiles).length >= 2 ? "high" : strongEvidenceCount >= 1 ? "medium" : "low";
  return {
    adapterId: "generic_phaser",
    detected: uniqueEvidence.length > 0,
    confidence,
    evidence: uniqueEvidence,
    likelySceneFiles: Array.from(likelySceneFiles).sort(),
    likelyAssetFolders: Array.from(likelyAssetFolders).sort(),
    warnings: confidence === "low" ? ["Only partial Phaser evidence was found. Use manual file scope carefully."] : []
  };
}

export function shouldOfferGenericPhaserAdapter(input: { knownAdapterDetected: boolean; knownAdapterConfidence?: "high" | "medium" | "low"; manualSelected?: boolean }): boolean {
  return Boolean(input.manualSelected) || !input.knownAdapterDetected || input.knownAdapterConfidence === "low";
}

export function normalizeGenericSelectedFiles(files: string[]): string[] {
  return Array.from(new Set(files.map((file) => normalizeWorkspacePath(file.trim())).filter(Boolean))).sort();
}

export function genericStyleConfigRelativePath(surfaceType: GenericPhaserSurfaceType): string {
  return `.game-polish-lab/styles/${genericStyleFileNames[surfaceType]}`;
}

export function genericGeneratedStyleModulePath(surfaceType: GenericPhaserSurfaceType): string {
  return `src/config/gamePolishLab/${genericStyleModuleNames[surfaceType]}`;
}

export function buildGenericAssetTarget(assetDestinationFolder: string): AssetReplacementTarget {
  return {
    targetId: "monster_art",
    label: "Generic Phaser Asset",
    surfaceType: "asset_replacement",
    expectedKinds: ["generic_phaser_asset"],
    acceptedFileTypes: ["image/png", "image/webp"],
    transparencyRequired: false,
    destinationFolder: normalizeWorkspacePath(assetDestinationFolder),
    assignmentMode: "manual_required",
    directApplySupported: false,
    warnings: ["Generic Phaser copies assets only. Loader/manifest wiring requires a scoped fallback task."]
  };
}

export function buildGenericFallbackTask(input: {
  surfaceType: VisualSurfaceType;
  targetLabel: string;
  selectedFiles: string[];
  generatedStyleConfigPath: string;
  generatedStyleModulePath?: string;
  assetDestinationFolder?: string;
  fieldNoteGuidance?: {
    preserve: string[];
    avoid: string[];
    mixed: string[];
  };
}): { ok: boolean; task?: GenericFallbackTask; errors: string[] } {
  const selectedFiles = normalizeGenericSelectedFiles(input.selectedFiles);
  const errors: string[] = [];
  if (!input.targetLabel.trim()) {
    errors.push("Target label is required.");
  }
  if (selectedFiles.length === 0) {
    errors.push("At least one selected target file is required for a scoped fallback task.");
  }
  if (selectedFiles.some((file) => /[*?]|\.\./.test(file))) {
    errors.push("Selected file scope must be exact files without wildcards or path traversal.");
  }
  const forbiddenSelected = selectedFiles.filter(isForbiddenV05Path);
  if (forbiddenSelected.length > 0) {
    errors.push(`Selected scope includes forbidden files: ${forbiddenSelected.join(", ")}`);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    task: {
      adapterId: "generic_phaser",
      surfaceType: input.surfaceType,
      targetLabel: input.targetLabel.trim(),
      selectedFiles,
      generatedStyleConfigPath: input.generatedStyleConfigPath,
      generatedStyleModulePath: input.generatedStyleModulePath,
      fieldNoteGuidance: input.fieldNoteGuidance,
      allowedFiles: [
        input.generatedStyleConfigPath,
        ".game-polish-lab/visual-recipes/*",
        ".game-polish-lab/rollback/*",
        ...(input.generatedStyleModulePath ? [input.generatedStyleModulePath] : []),
        ...(input.assetDestinationFolder ? [`${normalizeWorkspacePath(input.assetDestinationFolder)}/*`] : []),
        ...selectedFiles
      ],
      forbiddenFiles: [
        "save files",
        "economy files",
        "progression/unlock files",
        "quest files",
        "hatch/merge/upgrade logic files",
        "ad/monetization files",
        "inventory/state files",
        "data model/schema files",
        "level data",
        "gameplay rules",
        "input command/action dispatch files",
        "package scripts/dependency changes"
      ],
      codexMayDo: [
        "Wire the generated visual style config/module into the exact selected rendering files only.",
        "Keep changes visual-only and reversible.",
        "Add no new gameplay behavior.",
        ...((input.fieldNoteGuidance?.preserve ?? []).map((note) => `Preserve prior proven-good visual treatment: ${note}`))
      ],
      codexMustNotDo: [
        "Do not edit files outside the selected file scope.",
        "Do not change loaders/manifests unless the user explicitly adds those files to scope.",
        "Do not change gameplay, save, economy, progression, quest, hatch, merge, upgrade, ads, inventory/state, input dispatch, or package scripts.",
        ...((input.fieldNoteGuidance?.avoid ?? []).map((note) => `Avoid prior failed visual treatment: ${note}`)),
        ...((input.fieldNoteGuidance?.mixed ?? []).map((note) => `Treat prior mixed result carefully: ${note}`))
      ],
      manualTestChecklist: [
        "Phaser project detection result shown",
        "Generic Phaser adapter selected",
        "surface recipe loaded",
        "target file scope selected by user",
        "style config generated",
        "recipe file ensured",
        "generated style module written only if safe/approved",
        "direct writes stayed inside safe paths",
        "fallback task includes exact selected file scope",
        "unsupported loader/manifest changes were not patched automatically",
        "forbidden gameplay/save/economy/progression/ad files were not touched"
      ]
    }
  };
}

export function genericFallbackTaskRelativePath(date: Date, surfaceType: VisualSurfaceType, targetLabel: string, extension = "json"): string {
  const timestamp = date.toISOString().replace(/[:.]/g, "-");
  return `.game-polish-lab/fallback-tasks/${timestamp}-generic-${surfaceType}-${safeTargetLabel(targetLabel)}.${extension}`;
}

function safeTargetLabel(value: string): string {
  return (value || "target").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "target";
}

function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}
