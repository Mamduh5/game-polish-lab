import { VisualSurfaceType } from "../types/visualSurface";
import {
  VisualScopeClassification,
  VisualScopeClassificationCounts,
  VisualScopeClassifiedFile,
  VisualScopeGuardRequest,
  VisualScopeGuardResult,
  VisualScopeOperationType,
  VisualScopeViolation
} from "../types/visualScopeGuard";

type PathRule = {
  classification: VisualScopeClassification;
  reasonCode: string;
  message: string;
  test: (path: string, request: VisualScopeGuardRequest) => boolean;
};

const forbiddenRules: PathRule[] = [
  blocked("save_file", "Save and persistence files are outside visual polish scope.", (path) => includesAny(path, ["/save", "savesystem", "savestate", "/storage"])),
  blocked("economy_or_balance_file", "Economy, balance, reward, or currency files are outside visual polish scope.", (path) => includesAny(path, ["/economy", "currency", "balance", "rewardamount", "rewardtable", "reward-config", "reward_config"])),
  blocked("progression_or_unlock_file", "Progression, unlock, and upgrade files are outside visual polish scope.", (path) => includesAny(path, ["/progression", "unlock", "/state/upgrade", "/systems/upgrade", "upgradestate", "upgradesystem", "/data/upgrades"])),
  blocked("merge_rule_file", "Merge rule files are outside visual polish scope.", (path) => includesAny(path, ["/merge", "mergesystem", "monstermerge"])),
  blocked("hatch_rule_file", "Hatch rule files are outside visual polish scope.", (path) => includesAny(path, ["/state/hatch", "/systems/hatch", "hatchstate", "hatchsystem"])),
  blocked("quest_reward_file", "Quest state, quest data, and quest reward files are outside visual polish scope.", (path) => includesAny(path, ["/state/quest", "/systems/quest", "/data/quest", "queststate", "questreward"])),
  blocked("ad_or_sdk_file", "Ad, monetization, analytics, and SDK files are outside visual polish scope.", (path) => includesAny(path, ["/ads", "/ad/", "admob", "rewardedad", "rewarded-ad", "rewarded_ad", "monetization", "analytics", "sdk"])),
  blocked("level_data_file", "Level data and gameplay rules are outside visual polish scope.", (path) => includesAny(path, ["leveldata", "level-data", "/levels", "spiritSortLevels", "gameplay", "/rules", "rules.ts", "rules.js"])),
  blocked("sort_puzzle_rule_file", "Sort Puzzle rules, solvers, validation, undo, and hint logic are outside visual polish scope.", (path) => includesAny(path, ["sortrules", "/solver", "sortsolver", "movevalidation", "validmove", "undosystem", "hintsystem"])),
  blocked("cursor_arena_balance_file", "Cursor Arena economy, upgrades, enemy HP, spawn, damage, scoring, and rewards are outside visual polish scope.", (path) => includesAny(path, ["arenabalance", "balanceconfig", "/economy", "/upgrades", "upgradevalue", "spawnrate", "spawnsystem", "enemyhp", "enemy-health", "damage", "/scoring", "/rewards"])),
  blocked("cursor_arena_player_projectile_file", "Cursor Arena player and projectile systems are outside visual polish scope.", (path) => includesAny(path, ["/player", "playercontroller", "/projectile", "projectilesystem", "shootersystem"])),
  blocked("package_manager_file", "Package manager files are blocked during visual apply operations.", (path, request) => request.operationType !== "asset_contact_sheet_read" && /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|package\.json)$/.test(path))
];

const safeRules: PathRule[] = [
  safe("lab_local_file", "Local Game Polish Lab files are safe for visual operations.", (path) => path.startsWith(".game-polish-lab/")),
  safe("visual_recipe_file", "Visual recipe files are safe visual metadata.", (path) => path.startsWith(".game-polish-lab/visual-recipes/")),
  safe("asset_contract_file", "Asset contract files are safe visual metadata.", (path) => path === ".game-polish-lab/assets/asset-contracts.json"),
  safe("asset_file", "Asset files in known asset folders are safe visual targets.", (path) => /^(src\/assets|public\/assets|assets)\//.test(path)),
  safe("adapter_style_config", "Adapter-approved style/config paths are safe visual targets.", (path) => isKnownStyleConfigPath(path)),
  safe("generated_visual_bridge", "Generated visual bridge/style modules are safe visual targets.", (path) => path.startsWith("src/config/gamepolishlab/"))
];

const suspiciousRules: PathRule[] = [
  suspicious("scene_file", "Scene files can affect runtime behavior and require guarded handoff.", (path) => /(^|\/)(scenes?|pages?)\//.test(path) || /scene\.(ts|tsx|js|jsx)$/.test(path)),
  suspicious("ui_or_renderer_file", "UI, renderer, and view files may be legitimate visual targets but require guard awareness.", (path) => includesAny(path, ["/ui/", "/rendering/", "renderer", "view.ts", "view.js", "hud"])),
  suspicious("loader_or_preload_file", "Loader and preload files can affect runtime assets and require guard awareness.", (path) => includesAny(path, ["preload", "loader", "assetloader"])),
  suspicious("manifest_file", "Manifest files may be legitimate for asset assignment but must stay guarded.", (path) => path.includes("manifest")),
  suspicious("source_file", "Broad source files are suspicious for visual polish handoff.", (path) => /^src\/.*\.(ts|tsx|js|jsx|json|css)$/.test(path))
];

export function checkVisualScopeGuard(request: VisualScopeGuardRequest): VisualScopeGuardResult {
  const uniquePaths = Array.from(new Set(request.candidatePaths.map(normalizeVisualScopePath).filter(Boolean))).sort();
  const classifiedFiles = uniquePaths.map((path) => classifyVisualScopePath(path, request));
  const counts = countClassifications(classifiedFiles);
  const violations = classifiedFiles.filter((file) => file.classification !== "safe").map(toViolation);
  const recommendedAction = counts.forbidden > 0 ? "block" : counts.suspicious > 0 || counts.unknown > 0 ? "warn" : "allow";
  return {
    classifiedFiles,
    violations,
    counts,
    recommendedAction,
    summaryMessage: summarizeVisualScopeResult(request.operationType, counts, recommendedAction)
  };
}

export function normalizeVisualScopePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

export function renderVisualScopeGuardMessage(result: VisualScopeGuardResult): string {
  const details = result.violations.map((violation) => `${violation.path} [${violation.reasonCode}]`).join(", ");
  return details ? `${result.summaryMessage}: ${details}` : result.summaryMessage;
}

export function visualScopeGuardWarnings(result: VisualScopeGuardResult): string[] {
  return result.violations.map((violation) => `${violation.path}: ${violation.message} (${violation.reasonCode})`);
}

export function visualScopeGuardAllowed(result: VisualScopeGuardResult, options: { allowWarnings?: boolean } = {}): boolean {
  if (result.recommendedAction === "block") {
    return false;
  }
  return options.allowWarnings ? true : result.recommendedAction === "allow";
}

function classifyVisualScopePath(path: string, request: VisualScopeGuardRequest): VisualScopeClassifiedFile {
  const lowerPath = path.toLowerCase();
  const readOnly = request.operationType === "asset_contact_sheet_read";
  const ruleSets = readOnly ? [safeRules, forbiddenRules, suspiciousRules] : [forbiddenRules, safeRules, suspiciousRules];
  for (const rules of ruleSets) {
    const rule = rules.find((candidate) => candidate.test(lowerPath, request));
    if (rule) {
      return {
        path,
        normalizedPath: path,
        classification: readOnly && rule.classification === "forbidden" ? "suspicious" : rule.classification,
        reasonCode: readOnly && rule.classification === "forbidden" ? `read_only_${rule.reasonCode}` : rule.reasonCode,
        message: readOnly && rule.classification === "forbidden" ? `Read-only preview may inspect this path but must not write it. ${rule.message}` : rule.message,
        operationType: request.operationType,
        adapterId: request.adapterId,
        surfaceType: request.surfaceType
      };
    }
  }
  return {
    path,
    normalizedPath: path,
    classification: defaultUnknownClassification(request.operationType),
    reasonCode: "unknown_path",
    message: "Path is not known to the visual scope guard.",
    operationType: request.operationType,
    adapterId: request.adapterId,
    surfaceType: request.surfaceType
  };
}

function defaultUnknownClassification(operationType: VisualScopeOperationType): VisualScopeClassification {
  return operationType === "asset_contact_sheet_read" ? "unknown" : "unknown";
}

function countClassifications(files: VisualScopeClassifiedFile[]): VisualScopeClassificationCounts {
  const counts: VisualScopeClassificationCounts = {
    safe: 0,
    suspicious: 0,
    forbidden: 0,
    unknown: 0,
    total: files.length
  };
  for (const file of files) {
    counts[file.classification] += 1;
  }
  return counts;
}

function toViolation(file: VisualScopeClassifiedFile): VisualScopeViolation {
  return {
    path: file.path,
    classification: file.classification,
    reasonCode: file.reasonCode,
    message: file.message,
    operationType: file.operationType,
    adapterId: file.adapterId,
    surfaceType: file.surfaceType
  };
}

function summarizeVisualScopeResult(operationType: VisualScopeOperationType, counts: VisualScopeClassificationCounts, action: "allow" | "warn" | "block"): string {
  return `Scope guard ${action} for ${operationType}: ${counts.safe} safe, ${counts.suspicious} suspicious, ${counts.forbidden} forbidden, ${counts.unknown} unknown.`;
}

function isKnownStyleConfigPath(path: string): boolean {
  return path.startsWith("src/config/")
    && (
      path.includes("style")
      || path.includes("visual")
      || path.includes("assetmanifest")
      || path.includes("gamepolishlab")
    );
}

function includesAny(path: string, terms: string[]): boolean {
  return terms.some((term) => path.includes(term.toLowerCase()));
}

function blocked(reasonCode: string, message: string, test: PathRule["test"]): PathRule {
  return { classification: "forbidden", reasonCode, message, test };
}

function safe(reasonCode: string, message: string, test: PathRule["test"]): PathRule {
  return { classification: "safe", reasonCode, message, test };
}

function suspicious(reasonCode: string, message: string, test: PathRule["test"]): PathRule {
  return { classification: "suspicious", reasonCode, message, test };
}

export function visualScopeGuardRulesSummary(): string[] {
  return [
    "safe: .game-polish-lab/**, visual recipes, asset contracts, known asset folders, adapter style/config paths, generated Game Polish Lab style modules",
    "suspicious: scenes, UI/view/rendering files, loader/preload files, manifests, broad source files",
    "forbidden: save, economy/balance/reward tables, progression/unlock/upgrade, merge, hatch, quest, ad/monetization/analytics/SDK, level data/gameplay rules, Sort Puzzle rules/solver/undo/hint, Cursor Arena balance/player/projectile paths, package manager files during visual writes"
  ];
}
