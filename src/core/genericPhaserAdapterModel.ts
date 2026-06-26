import { AssetReplacementTarget, VisualSurfaceType } from "../types/visualSurface";
import { isForbiddenV05Path } from "./v05VisualScopeGuard";

export type GenericPhaserSurfaceType = Exclude<VisualSurfaceType, "asset_replacement">;
export type GenericPhaserManualSurfaceId = GenericPhaserSurfaceType | "hud" | "impact_feedback" | "asset_slot";
export type GenericPhaserSuggestionSafety = "safe" | "suspicious" | "forbidden" | "unknown";

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
  ownerFileSuggestions: GenericPhaserOwnerFileSuggestion[];
  warnings: string[];
}

export interface GenericPhaserOwnerFileSuggestion {
  path: string;
  reason: string;
  matchedSignals: string[];
  confidence: "high" | "medium" | "low";
  recommendedSurfaceTypes: GenericPhaserManualSurfaceId[];
  safetyLevel: GenericPhaserSuggestionSafety;
}

export interface GenericPhaserManualSurfaceSelection {
  surfaceId: GenericPhaserManualSurfaceId;
  surfaceType: VisualSurfaceType;
  label: string;
  chosenOwnerFilePath: string;
  chosenAssetPath?: string;
  notes?: string;
  confidence: "high" | "medium" | "low";
  safetyLevel: GenericPhaserSuggestionSafety;
  directApplyMode: "config_only" | "asset_copy_only" | "fallback_required";
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

const genericManualStyleFileNames: Record<GenericPhaserManualSurfaceId, string | undefined> = {
  ...genericStyleFileNames,
  hud: "generic-hud-style.json",
  impact_feedback: "generic-impact-feedback-style.json",
  asset_slot: "generic-asset-presentation-style.json"
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
  const ownerFileSuggestions = discoverGenericPhaserOwnerFileSuggestions(files);
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
    if (/\bnew\s+phaser\.game\b/.test(lowerText)) {
      evidence.push(`${normalizedPath}: creates a Phaser.Game instance.`);
      strongEvidenceCount += 1;
    }
    if (lowerPath.endsWith("vite.config.ts") || lowerPath.endsWith("vite.config.js")) {
      evidence.push(`${normalizedPath}: Vite project config found.`);
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
      ,
    ownerFileSuggestions
  };
}

export function discoverGenericPhaserOwnerFileSuggestions(files: GenericPhaserFileInspection[], limit = 24): GenericPhaserOwnerFileSuggestion[] {
  return files
    .map(genericOwnerSuggestionForFile)
    .filter((suggestion): suggestion is GenericPhaserOwnerFileSuggestion => Boolean(suggestion))
    .sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export function manualSurfaceIdToVisualSurfaceType(surfaceId: GenericPhaserManualSurfaceId): VisualSurfaceType {
  if (surfaceId === "hud") {
    return "panel";
  }
  if (surfaceId === "impact_feedback") {
    return "reward_toast";
  }
  if (surfaceId === "asset_slot") {
    return "asset_replacement";
  }
  return surfaceId;
}

export function genericManualStyleConfigRelativePath(surfaceId: GenericPhaserManualSurfaceId): string | undefined {
  const fileName = genericManualStyleFileNames[surfaceId];
  return fileName ? `.game-polish-lab/styles/${fileName}` : undefined;
}

export function buildGenericManualSurfaceSelection(input: {
  surfaceId: GenericPhaserManualSurfaceId;
  label: string;
  chosenOwnerFilePath: string;
  chosenAssetPath?: string;
  notes?: string;
  confidence: "high" | "medium" | "low";
  safetyLevel: GenericPhaserSuggestionSafety;
}): GenericPhaserManualSurfaceSelection {
  const surfaceType = manualSurfaceIdToVisualSurfaceType(input.surfaceId);
  return {
    surfaceId: input.surfaceId,
    surfaceType,
    label: input.label.trim() || genericManualSurfaceLabel(input.surfaceId),
    chosenOwnerFilePath: normalizeWorkspacePath(input.chosenOwnerFilePath),
    chosenAssetPath: input.chosenAssetPath ? normalizeWorkspacePath(input.chosenAssetPath) : undefined,
    notes: input.notes,
    confidence: input.confidence,
    safetyLevel: input.safetyLevel,
    directApplyMode: surfaceType === "asset_replacement" ? "asset_copy_only" : input.safetyLevel === "forbidden" ? "fallback_required" : "config_only"
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

function genericOwnerSuggestionForFile(file: GenericPhaserFileInspection): GenericPhaserOwnerFileSuggestion | undefined {
  const normalizedPath = normalizeWorkspacePath(file.relativePath);
  const lowerPath = normalizedPath.toLowerCase();
  if (isIgnoredGenericSuggestionPath(lowerPath) || !/\.(ts|tsx|js|jsx|json|css|html)$/i.test(lowerPath)) {
    return undefined;
  }
  const lowerText = file.text.toLowerCase();
  const matchedSignals: string[] = [];
  const recommendedSurfaceTypes = new Set<GenericPhaserManualSurfaceId>();
  if (/scene\.(ts|tsx|js|jsx)$/.test(lowerPath) || lowerText.includes("extends phaser.scene") || lowerText.includes("phaser.scene")) {
    matchedSignals.push("scene");
    recommendedSurfaceTypes.add("background_readability");
    recommendedSurfaceTypes.add("panel");
  }
  if (includesAny(lowerPath, ["hud", "ui", "panel", "modal", "shop"]) || includesAny(lowerText, ["add.rectangle", "add.text", "graphics", "fillstyle", "linestyle"])) {
    matchedSignals.push("ui_rendering");
    recommendedSurfaceTypes.add("panel");
    recommendedSurfaceTypes.add("hud");
  }
  if (includesAny(lowerPath, ["button", "card", "slot"]) || includesAny(lowerText, ["button", "card", "slot", "settint", "setalpha", "setscale"])) {
    matchedSignals.push("button_card_slot");
    recommendedSurfaceTypes.add("button");
    recommendedSurfaceTypes.add("slot_card");
  }
  if (includesAny(lowerPath, ["toast", "reward", "popup"]) || includesAny(lowerText, ["toast", "reward", "popup"])) {
    matchedSignals.push("toast_reward");
    recommendedSurfaceTypes.add("reward_toast");
  }
  if (includesAny(lowerPath, ["background", "/bg", "world", "arena", "map"]) || includesAny(lowerText, ["background", "bg", "tilemap", "world", "map"])) {
    matchedSignals.push("background");
    recommendedSurfaceTypes.add("background_readability");
  }
  if (includesAny(lowerPath, ["impact", "hit", "damage", "effect", "particle"]) || includesAny(lowerText, ["impact", "hit", "damage", "effect", "particle"])) {
    matchedSignals.push("impact_feedback");
    recommendedSurfaceTypes.add("impact_feedback");
    recommendedSurfaceTypes.add("reward_toast");
  }
  if (includesAny(lowerText, ["load.image", "load.spritesheet", "asset manifest"]) || includesAny(lowerPath, ["manifest", "asset", "preload", "loader"])) {
    matchedSignals.push("asset_reference");
    recommendedSurfaceTypes.add("asset_slot");
  }
  if (matchedSignals.length === 0) {
    return undefined;
  }
  const safetyLevel = classifyGenericSuggestionSafety(lowerPath);
  return {
    path: normalizedPath,
    reason: `Matched ${matchedSignals.join(", ")} signals for Generic Phaser visual ownership.`,
    matchedSignals,
    confidence: matchedSignals.length >= 3 ? "high" : matchedSignals.length >= 2 ? "medium" : "low",
    recommendedSurfaceTypes: Array.from(recommendedSurfaceTypes),
    safetyLevel
  };
}

function classifyGenericSuggestionSafety(lowerPath: string): GenericPhaserSuggestionSafety {
  if (includesAny(lowerPath, ["save", "economy", "balance", "progression", "unlock", "level", "rules", "solver", "ads", "monetization", "package.json", "package-lock.json", "pnpm-lock.yaml"])) {
    return "forbidden";
  }
  if (includesAny(lowerPath, ["scene", "/ui/", "hud", "panel", "button", "toast", "render", "preload", "loader", "manifest"])) {
    return "suspicious";
  }
  if (/^(src\/assets|public\/assets|assets)\//.test(lowerPath) || lowerPath.startsWith(".game-polish-lab/")) {
    return "safe";
  }
  return "unknown";
}

function isIgnoredGenericSuggestionPath(lowerPath: string): boolean {
  return lowerPath.split("/").some((part) => ["node_modules", "dist", "build", ".git", "coverage", "out"].includes(part));
}

function genericManualSurfaceLabel(surfaceId: GenericPhaserManualSurfaceId): string {
  return surfaceId.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function confidenceRank(confidence: "high" | "medium" | "low"): number {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}
