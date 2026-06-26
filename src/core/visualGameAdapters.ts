import { detectGenericPhaserProject, genericGeneratedStyleModulePath, genericStyleConfigRelativePath } from "./genericPhaserAdapterModel";
import { monsterFarmAssetTargets } from "./monsterFarmAssetTargets";
import {
  backgroundReadabilityStyleConfigRelativePath,
  buttonStyleConfigRelativePath,
  farmSlotStyleConfigRelativePath,
  panelStyleConfigRelativePath,
  rewardToastStyleConfigRelativePath
} from "./visualSurfaceConfig";
import { checkVisualScopeGuard } from "./visualScopeGuard";
import { resolveVisualDirectApplyTemplate } from "./visualDirectApplyTemplates";
import { visualSurfacePickerOrder } from "./visualRecipeRegistry";
import {
  VisualAdapterDirectApplyCapability,
  VisualAdapterDirectApplySupport,
  VisualAdapterFallbackCapability,
  VisualAdapterScopeDescriptor,
  VisualAdapterScopeGroup,
  VisualAdapterSurfaceTarget,
  VisualGameAdapter,
  VisualGameAdapterContractSummary,
  VisualGameAdapterValidationIssue,
  VisualGameAdapterValidationResult
} from "../types/visualGameAdapter";
import { VisualSurfaceType } from "../types/visualSurface";

type StyleSurface = Exclude<VisualSurfaceType, "asset_replacement">;

const styleSurfaces: StyleSurface[] = ["slot_card", "background_readability", "panel", "reward_toast", "button"];

const manualChecks = [
  {
    checkId: "visual_surface_changed",
    label: "Visual surface changed",
    description: "Open the game scene and confirm the intended visual surface reflects the selected style."
  },
  {
    checkId: "no_gameplay_change",
    label: "No gameplay behavior changed",
    description: "Confirm controls, rewards, save/load, progression, ads, quests, merge, hatch, and level behavior were not changed."
  }
];

const idleStyleConfigPaths: Record<StyleSurface, string> = {
  slot_card: farmSlotStyleConfigRelativePath,
  background_readability: backgroundReadabilityStyleConfigRelativePath,
  panel: panelStyleConfigRelativePath,
  reward_toast: rewardToastStyleConfigRelativePath,
  button: buttonStyleConfigRelativePath
};

const idleGeneratedStyleModulePaths: Record<StyleSurface, string> = {
  slot_card: "src/config/farmSlotStyle.ts",
  background_readability: "src/config/backgroundReadabilityStyle.ts",
  panel: "src/config/panelStyle.ts",
  reward_toast: "src/config/rewardToastStyle.ts",
  button: "src/config/buttonStyle.ts"
};

const idleTargets: Record<StyleSurface, { targetId: string; displayName: string; owners: string[] }> = {
  slot_card: { targetId: "farm_slots", displayName: "Monster Farm Slots", owners: ["src/scenes/FarmScene.ts", "src/ui/FarmSlotView.ts", "src/rendering/MonsterRenderer.ts"] },
  background_readability: { targetId: "background", displayName: "Monster Farm Background", owners: ["src/scenes/FarmScene.ts", "src/ui/BackgroundView.ts"] },
  panel: { targetId: "panels", displayName: "Monster Farm Panels", owners: ["src/ui/PanelChrome.ts", "src/ui/HatchPanelView.ts", "src/ui/NextQuestWidgetView.ts"] },
  reward_toast: { targetId: "reward_toast", displayName: "Monster Farm Reward Toast", owners: ["src/ui/ToastView.ts", "src/ui/RewardFeedbackView.ts", "src/scenes/FarmScene.ts"] },
  button: { targetId: "buttons", displayName: "Monster Farm Buttons", owners: ["src/ui/GameplayActionBarView.ts", "src/ui/HatchPanelView.ts", "src/ui/UpgradePanelView.ts"] }
};

const knownForbiddenScopes = [
  "src/systems/saveSystem.ts",
  "src/data/economy.ts",
  "src/systems/progressionSystem.ts",
  "src/systems/monsterMergeSystem.ts",
  "src/state/hatchState.ts",
  "src/data/quests.ts",
  "src/services/rewardedAdService.ts",
  "src/data/levels.ts"
];

const adapterRegistry: VisualGameAdapter[] = [
  createIdleMonsterFarmAdapter(),
  createGenericPhaserAdapter()
];

export function listVisualGameAdapters(): VisualGameAdapter[] {
  return adapterRegistry;
}

export function getVisualGameAdapter(adapterId: string): VisualGameAdapter | undefined {
  return adapterRegistry.find((adapter) => adapter.id === adapterId);
}

export function getVisualGameAdapterSupportedSurfaces(adapterId: string): VisualSurfaceType[] {
  return getVisualGameAdapter(adapterId)?.supportedSurfaces ?? [];
}

export function getVisualGameAdapterSurfaceTargets(adapterId: string, surfaceType?: VisualSurfaceType): VisualAdapterSurfaceTarget[] {
  return getVisualGameAdapter(adapterId)?.getSurfaceTargets(surfaceType) ?? [];
}

export function getVisualGameAdapterScopeMetadata(adapterId: string, surfaceType?: VisualSurfaceType): VisualAdapterScopeDescriptor | undefined {
  return getVisualGameAdapter(adapterId)?.getSafeScopes(surfaceType);
}

export function validateVisualAdapterSurfaceTarget(adapter: Pick<VisualGameAdapter, "id">, target: VisualAdapterSurfaceTarget): VisualGameAdapterValidationResult {
  const issues: VisualGameAdapterValidationIssue[] = [];
  if (!target.surfaceType || !visualSurfacePickerOrder.includes(target.surfaceType)) {
    issues.push(issue("error", "target_surface_missing", "Surface target must use a known visual surface.", adapter.id, target.surfaceType, target.targetId));
  }
  if (!target.targetId.trim()) {
    issues.push(issue("error", "target_id_missing", "Surface target id is required.", adapter.id, target.surfaceType, target.targetId));
  }
  if (!target.displayName.trim()) {
    issues.push(issue("error", "target_label_missing", "Surface target display name is required.", adapter.id, target.surfaceType, target.targetId));
  }
  if (target.manualChecks.length === 0) {
    issues.push(issue("error", "manual_checks_missing", "Surface target must include manual checks.", adapter.id, target.surfaceType, target.targetId));
  }
  if (!isDirectApplySupport(target.directApply.support)) {
    issues.push(issue("error", "direct_apply_state_unknown", `Unknown direct-apply support state: ${String(target.directApply.support)}.`, adapter.id, target.surfaceType, target.targetId));
  }
  if (target.directApply.support === "executable" && (!target.directApply.styleConfigPath || !target.directApply.templateId)) {
    issues.push(issue("error", "direct_apply_missing_safe_config", "Executable direct apply requires a safe style config path and template id.", adapter.id, target.surfaceType, target.targetId));
  }
  if ((target.directApply.support === "unsupported" || target.directApply.support === "fallback_only") && target.limitations.length === 0) {
    issues.push(issue("error", "unsupported_surface_limitations_missing", "Unsupported or fallback-only targets must document known limitations.", adapter.id, target.surfaceType, target.targetId));
  }
  return splitIssues(issues);
}

export function validateVisualGameAdapter(adapter: VisualGameAdapter): VisualGameAdapterValidationResult {
  const issues: VisualGameAdapterValidationIssue[] = [];
  if (!adapter.id.trim()) {
    issues.push(issue("error", "adapter_id_missing", "Adapter id is required."));
  }
  if (!adapter.displayName.trim()) {
    issues.push(issue("error", "adapter_name_missing", "Adapter display name is required.", adapter.id));
  }
  if (adapter.knownLimitations.length === 0) {
    issues.push(issue("warning", "adapter_limitations_missing", "Adapter should document known limitations.", adapter.id));
  }
  const targets = adapter.getSurfaceTargets();
  const seenTargetIds = new Set<string>();
  for (const target of targets) {
    const key = `${target.surfaceType}:${target.targetId}`;
    if (seenTargetIds.has(key)) {
      issues.push(issue("error", "duplicate_target_id", `Duplicate surface target id: ${key}.`, adapter.id, target.surfaceType, target.targetId));
    }
    seenTargetIds.add(key);
    issues.push(...validateVisualAdapterSurfaceTarget(adapter, target).errors);
    issues.push(...validateVisualAdapterSurfaceTarget(adapter, target).warnings);
  }
  const scopes = adapter.getSafeScopes();
  for (const group of scopes.safe) {
    const forbiddenSafe = classifyForbiddenPaths(group.paths);
    if (forbiddenSafe.length > 0) {
      issues.push(issue("error", "forbidden_path_marked_safe", `Safe scope includes forbidden paths: ${forbiddenSafe.join(", ")}.`, adapter.id, group.surfaceType));
    }
  }
  return splitIssues(issues);
}

export function validateRegisteredVisualGameAdapters(): VisualGameAdapterValidationResult {
  const issues: VisualGameAdapterValidationIssue[] = [];
  const ids = new Set<string>();
  for (const adapter of adapterRegistry) {
    if (ids.has(adapter.id)) {
      issues.push(issue("error", "duplicate_adapter_id", `Duplicate adapter id: ${adapter.id}.`, adapter.id));
    }
    ids.add(adapter.id);
    const result = validateVisualGameAdapter(adapter);
    issues.push(...result.errors, ...result.warnings);
  }
  return splitIssues(issues);
}

export function summarizeVisualGameAdapterContract(adapter: VisualGameAdapter): VisualGameAdapterContractSummary {
  const validation = validateVisualGameAdapter(adapter);
  const targets = adapter.getSurfaceTargets();
  return {
    adapterId: adapter.id,
    displayName: adapter.displayName,
    family: adapter.family,
    valid: validation.ok,
    supportedSurfaceCount: adapter.supportedSurfaces.length,
    targetCount: targets.length,
    directApplyCapableSurfaceCount: uniqueSurfaces(targets.filter((target) => target.directApply.support === "executable")).length,
    fallbackOnlySurfaceCount: uniqueSurfaces(targets.filter((target) => target.directApply.support === "fallback_only" || target.directApply.support === "unsupported")).length,
    knownLimitationsCount: adapter.knownLimitations.length,
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length
  };
}

export function summarizeRegisteredVisualGameAdapterContracts(): VisualGameAdapterContractSummary[] {
  return adapterRegistry.map(summarizeVisualGameAdapterContract);
}

function createIdleMonsterFarmAdapter(): VisualGameAdapter {
  const targets: VisualAdapterSurfaceTarget[] = [
    ...styleSurfaces.map((surfaceType) => styleTarget("idle_monster_farm", surfaceType, idleTargets[surfaceType].targetId, idleTargets[surfaceType].displayName, idleTargets[surfaceType].owners, idleStyleConfigPaths[surfaceType], idleGeneratedStyleModulePaths[surfaceType])),
    assetTarget("idle_monster_farm", "assets", "Monster Farm Assets", ["src/assets/monsters", "src/assets/ui", "src/assets/backgrounds", "src/assets/rewards"], "Asset replacement uses asset contracts/contact sheets and remains outside executable direct-apply templates.")
  ];
  return {
    id: "idle_monster_farm",
    displayName: "Idle Monster Farm",
    family: "idle_monster_farm",
    version: "0.7.0",
    description: "Contract wrapper for the existing Idle Monster Farm visual style and asset metadata.",
    supportedSurfaces: [...visualSurfacePickerOrder],
    detectProject: (files) => {
      const paths = files.map((file) => file.relativePath.toLowerCase());
      const detected = paths.some((file) => file.includes("farmscene") || file.includes("monster"));
      return { detected, confidence: detected ? "medium" : "unknown", evidence: detected ? ["Monster Farm filenames or text were found."] : [], warnings: [] };
    },
    getSurfaceTargets: (surfaceType) => filterTargets(targets, surfaceType),
    getSafeScopes: (surfaceType) => scopeDescriptor(targets, surfaceType),
    getStyleConfigPath: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.styleConfigPath,
    getDirectApplyCapabilities: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.directApply ?? unsupportedDirectApply("No target is registered for this surface."),
    getFallbackCapabilities: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.fallback ?? { support: "manual_required", reason: "No target is registered for this surface." },
    getManualChecks: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.manualChecks ?? [],
    knownLimitations: [
      "Asset replacement has no executable direct-apply template.",
      "Rendering source files remain guarded; direct apply writes known style configs only.",
      "Gameplay, save, economy, progression, quest, hatch, merge, ad, and level logic stay out of visual scope."
    ]
  };
}

function createGenericPhaserAdapter(): VisualGameAdapter {
  const targets: VisualAdapterSurfaceTarget[] = [
    ...styleSurfaces.map((surfaceType) => styleTarget("generic_phaser", surfaceType, "manual_target", `Generic Phaser ${surfaceType.replace(/_/g, " ")}`, ["selected rendering files"], genericStyleConfigRelativePath(surfaceType), genericGeneratedStyleModulePath(surfaceType))),
    assetTarget("generic_phaser", "manual_asset", "Generic Phaser Asset", ["selected asset folder"], "Generic Phaser asset copy does not patch unknown loaders/manifests.")
  ];
  return {
    id: "generic_phaser",
    displayName: "Generic Phaser",
    family: "generic_phaser",
    version: "0.7.0",
    description: "Safe-config-first contract wrapper for unknown Phaser projects.",
    supportedSurfaces: [...visualSurfacePickerOrder],
    detectProject: detectGenericPhaserProject,
    getSurfaceTargets: (surfaceType) => filterTargets(targets, surfaceType),
    getSafeScopes: (surfaceType) => scopeDescriptor(targets, surfaceType),
    getStyleConfigPath: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.styleConfigPath,
    getDirectApplyCapabilities: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.directApply ?? unsupportedDirectApply("No target is registered for this surface."),
    getFallbackCapabilities: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.fallback ?? { support: "manual_required", reason: "No target is registered for this surface." },
    getManualChecks: (surfaceType, targetId) => findTarget(targets, surfaceType, targetId)?.manualChecks ?? [],
    knownLimitations: [
      "Generic Phaser is safe-config-first, not full automatic game integration.",
      "Selected rendering files require scoped fallback tasks for source integration.",
      "Asset replacement does not patch unknown loaders or manifests."
    ]
  };
}

function styleTarget(adapterId: "idle_monster_farm" | "generic_phaser", surfaceType: StyleSurface, targetId: string, displayName: string, ownerFiles: string[], styleConfigPath: string, generatedStyleModulePath: string): VisualAdapterSurfaceTarget {
  const template = resolveVisualDirectApplyTemplate({ adapterId, surfaceType, targetId, intent: "style_config_direct_apply" });
  return {
    surfaceType,
    targetId,
    displayName,
    likelyOwnerFiles: ownerFiles,
    styleConfigPath,
    generatedStyleModulePath,
    previewSupport: "supported",
    directApply: {
      support: template ? "executable" : "config_only",
      templateId: template?.templateId,
      styleConfigPath,
      generatedStyleModulePath,
      reason: template ? "Known safe style config direct-apply template exists." : "Config can be saved, but source integration requires fallback."
    },
    assetReplacementSupport: "not_supported",
    fallback: { support: "available", reason: "Fallback task is available for unsupported source integration or unusual rendering setup." },
    manualChecks,
    limitations: ["Direct apply is limited to known safe style config paths."]
  };
}

function assetTarget(adapterId: "idle_monster_farm" | "generic_phaser", targetId: string, displayName: string, ownerFiles: string[], limitation: string): VisualAdapterSurfaceTarget {
  const assetOwners = adapterId === "idle_monster_farm" ? monsterFarmAssetTargets().map((target) => target.destinationFolder) : ownerFiles;
  return {
    surfaceType: "asset_replacement",
    targetId,
    displayName,
    likelyOwnerFiles: Array.from(new Set(assetOwners)),
    previewSupport: "supported",
    directApply: unsupportedDirectApply("No executable direct-apply template exists for asset_replacement."),
    assetReplacementSupport: adapterId === "idle_monster_farm" ? "supported" : "manual_required",
    fallback: { support: "manual_required", reason: "Loader, manifest, and structural asset wiring require explicit scoped handoff." },
    manualChecks: [
      ...manualChecks,
      { checkId: "asset_contract_preview", label: "Asset contract preview checked", description: "Open the contact sheet and confirm the replacement asset fits the target slot." }
    ],
    limitations: [limitation]
  };
}

function scopeDescriptor(targets: VisualAdapterSurfaceTarget[], surfaceType?: VisualSurfaceType): VisualAdapterScopeDescriptor {
  const activeTargets = filterTargets(targets, surfaceType);
  const safe: VisualAdapterScopeGroup[] = [];
  for (const target of activeTargets) {
    if (target.styleConfigPath) {
      safe.push({ surfaceType: target.surfaceType, paths: [target.styleConfigPath], reason: "Safe style config path owned by Game Polish Lab." });
    }
    if (target.surfaceType === "asset_replacement") {
      safe.push({ surfaceType: target.surfaceType, paths: [".game-polish-lab/assets/asset-contracts.json", "src/assets/*", "public/assets/*", "assets/*"], reason: "Asset contracts and known asset folders are safe visual metadata/assets." });
    }
  }
  const suspicious: VisualAdapterScopeGroup[] = activeTargets.length > 0 ? [{
    surfaceType,
    paths: Array.from(new Set(activeTargets.flatMap((target) => target.likelyOwnerFiles))).sort(),
    reason: "Likely owner files may be visual integration points but require guarded handoff."
  }] : [];
  const forbidden: VisualAdapterScopeGroup[] = [{
    surfaceType,
    paths: knownForbiddenScopes,
    reason: "Gameplay, persistence, economy, progression, quest, hatch, merge, ad, and level logic are outside visual polish scope."
  }];
  return { safe, suspicious, forbidden };
}

function filterTargets(targets: VisualAdapterSurfaceTarget[], surfaceType?: VisualSurfaceType): VisualAdapterSurfaceTarget[] {
  return surfaceType ? targets.filter((target) => target.surfaceType === surfaceType) : [...targets];
}

function findTarget(targets: VisualAdapterSurfaceTarget[], surfaceType: VisualSurfaceType, targetId?: string): VisualAdapterSurfaceTarget | undefined {
  const matches = filterTargets(targets, surfaceType);
  return targetId ? matches.find((target) => target.targetId === targetId) ?? matches[0] : matches[0];
}

function unsupportedDirectApply(reason: string): VisualAdapterDirectApplyCapability {
  return { support: "unsupported", reason };
}

function isDirectApplySupport(value: string): value is VisualAdapterDirectApplySupport {
  return value === "executable" || value === "config_only" || value === "fallback_only" || value === "unsupported";
}

function classifyForbiddenPaths(paths: string[]): string[] {
  return paths.filter((candidatePath) => {
    if (candidatePath.includes("*") || !/\.[a-z0-9]+$/i.test(candidatePath)) {
      return false;
    }
    const result = checkVisualScopeGuard({ operationType: "direct_apply", candidatePaths: [candidatePath] });
    return result.classifiedFiles.some((file) => file.classification === "forbidden");
  });
}

function splitIssues(issues: VisualGameAdapterValidationIssue[]): VisualGameAdapterValidationResult {
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return { ok: errors.length === 0, errors, warnings };
}

function issue(severity: "error" | "warning", code: string, message: string, adapterId?: string, surfaceType?: VisualSurfaceType, targetId?: string): VisualGameAdapterValidationIssue {
  return { severity, code, message, adapterId, surfaceType, targetId };
}

function uniqueSurfaces(targets: VisualAdapterSurfaceTarget[]): VisualSurfaceType[] {
  return Array.from(new Set(targets.map((target) => target.surfaceType)));
}
