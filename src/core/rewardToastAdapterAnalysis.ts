import { FarmSlotStyleConnectionType } from "./farmSlotAdapterAnalysis";
import { isForbiddenV05Path } from "./v05VisualScopeGuard";

export type MonsterFarmRewardFeedbackTarget = "reward_toast" | "coin_reward_feedback" | "floating_reward_text" | "reward_icon_feedback";

export interface RewardToastFileInspection {
  relativePath: string;
  text: string;
}

export interface RewardToastAdapterDetection {
  target: "idle_monster_farm.reward_toast";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  ownerFiles: string[];
  targetFeedback: MonsterFarmRewardFeedbackTarget[];
  reasons: string[];
  warnings: string[];
  supportedStyleModulePath: string;
}

export interface RewardToastStyleConnection {
  connected: boolean;
  connectionType: FarmSlotStyleConnectionType;
  connectedFiles: string[];
  missingPieces: string[];
}

export interface RewardToastAdapterState {
  target: "idle_monster_farm.reward_toast";
  detection: RewardToastAdapterDetection;
  connection: RewardToastStyleConnection;
}

export function analyzeRewardToastDetection(files: RewardToastFileInspection[], supportedStyleModulePath = "src/config/rewardToastStyle.ts"): RewardToastAdapterDetection {
  const ownerFiles = files
    .filter((file) => file.relativePath !== supportedStyleModulePath)
    .filter(isLikelyRewardToastOwnerFile)
    .map((file) => file.relativePath)
    .sort();
  const targetFeedback = detectTargetFeedback(files.filter((file) => ownerFiles.includes(file.relativePath)));
  const reasons = buildReasons(files, ownerFiles);
  const warnings = buildWarnings(files, ownerFiles);
  if (ownerFiles.length === 0) {
    warnings.unshift("No likely Idle Monster Farm reward feedback rendering files were detected in this workspace.");
  }
  return {
    target: "idle_monster_farm.reward_toast",
    detected: ownerFiles.length > 0,
    confidence: resolveConfidence(ownerFiles, targetFeedback),
    ownerFiles,
    targetFeedback,
    reasons,
    warnings,
    supportedStyleModulePath
  };
}

export function analyzeRewardToastStyleConnection(files: RewardToastFileInspection[], supportedStyleModulePath = "src/config/rewardToastStyle.ts"): RewardToastStyleConnection {
  const ownerFiles = files.filter((file) => file.relativePath !== supportedStyleModulePath);
  const connectedFiles = ownerFiles
    .filter((file) => detectRewardToastConnectionType(file.text, supportedStyleModulePath) !== "none")
    .map((file) => file.relativePath)
    .sort();
  const connectionType = resolveConnectionType(ownerFiles, supportedStyleModulePath);
  const missingPieces: string[] = [];
  if (connectionType === "none") {
    missingPieces.push("Reward feedback owner/rendering files do not import or read the generated reward toast style module/config.");
  }
  if (!files.some((file) => file.relativePath === supportedStyleModulePath)) {
    missingPieces.push(`${supportedStyleModulePath} has not been generated yet.`);
  }
  return {
    connected: connectionType !== "none",
    connectionType,
    connectedFiles,
    missingPieces
  };
}

export function detectRewardToastConnectionType(text: string, supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const normalized = text.toLowerCase();
  const styleImportPath = supportedStyleModulePath.replace(/^src\//, "../").replace(/\.ts$/, "").toLowerCase();
  if (normalized.includes("reward_toast_style") || normalized.includes("rewardtoaststyle") || normalized.includes(styleImportPath)) {
    return "style_module";
  }
  if (normalized.includes("reward-toast-style.json") || normalized.includes(".game-polish-lab/styles/reward-toast-style.json")) {
    return "json_config";
  }
  if (normalized.includes("reward toast bridge") || normalized.includes("gamepolishlabrewardtoast")) {
    return "runtime_bridge";
  }
  return "none";
}

function isLikelyRewardToastOwnerFile(file: RewardToastFileInspection): boolean {
  const normalizedPath = file.relativePath.toLowerCase();
  const text = file.text.toLowerCase();
  if (isForbiddenV05Path(file.relativePath)) {
    return false;
  }
  if (/toast|rewardfeedback|floatingreward|floatingtext|coinfeedback|rewardicon/.test(normalizedPath)) {
    return true;
  }
  return normalizedPath.includes("farmscene") && /toast|reward|coin|floating|sparkle/.test(text);
}

function detectTargetFeedback(files: RewardToastFileInspection[]): MonsterFarmRewardFeedbackTarget[] {
  const targets = new Set<MonsterFarmRewardFeedbackTarget>();
  for (const file of files) {
    const haystack = `${file.relativePath}\n${file.text}`.toLowerCase();
    if (/toast|showreward/.test(haystack)) {
      targets.add("reward_toast");
    }
    if (/coin|coins|currency/.test(haystack)) {
      targets.add("coin_reward_feedback");
    }
    if (/floating|float|rise|yoyo|tween/.test(haystack)) {
      targets.add("floating_reward_text");
    }
    if (/icon|sprite|image/.test(haystack)) {
      targets.add("reward_icon_feedback");
    }
  }
  return Array.from(targets).sort();
}

function buildReasons(files: RewardToastFileInspection[], ownerFiles: string[]): string[] {
  const reasons: string[] = [];
  for (const file of files) {
    const normalizedPath = file.relativePath.toLowerCase();
    const text = file.text.toLowerCase();
    if (ownerFiles.includes(file.relativePath)) {
      if (/toast/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: dedicated toast/reward feedback file name.`);
      } else if (/reward|coin|floating/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: reward feedback owner file name.`);
      } else if (normalizedPath.includes("farmscene")) {
        reasons.push(`${file.relativePath}: FarmScene references reward, coin, toast, or floating feedback rendering.`);
      }
    }
    if (text.includes("reward_toast_style") || text.includes("rewardtoaststyle")) {
      reasons.push(`${file.relativePath}: references generated reward toast style values.`);
    }
  }
  return reasons.length > 0 ? reasons : ["No reward feedback owner signals found."];
}

function buildWarnings(files: RewardToastFileInspection[], ownerFiles: string[]): string[] {
  const warnings: string[] = [];
  for (const file of files.filter((candidate) => ownerFiles.includes(candidate.relativePath))) {
    const text = file.text.toLowerCase();
    if (/rewardamount|amount|coinvalue|currencyvalue|questreward|rewardconfig/.test(text)) {
      warnings.push(`${file.relativePath}: reward feedback appears near reward amount values; v0.55 must not change reward amounts or economy.`);
    }
    if (/save|economy|progression|quest|rewardedad|admob|inventory|state|gameplay|rules/.test(text)) {
      warnings.push(`${file.relativePath}: reward feedback appears near protected systems; v0.55 must keep changes visual-only.`);
    }
    if (/animation|tween|timeline/.test(text)) {
      warnings.push(`${file.relativePath}: reward feedback animation is present; setup may only connect supported style reading, not rewrite animation logic.`);
    }
  }
  return Array.from(new Set(warnings));
}

function resolveConfidence(ownerFiles: string[], targetFeedback: MonsterFarmRewardFeedbackTarget[]): "high" | "medium" | "low" {
  if (targetFeedback.includes("reward_toast") || ownerFiles.some((file) => /Toast|RewardFeedback|Floating/.test(file))) {
    return "high";
  }
  if (targetFeedback.length > 0 || ownerFiles.length > 0) {
    return "medium";
  }
  return "low";
}

function resolveConnectionType(files: RewardToastFileInspection[], supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const detectedTypes = files.map((file) => detectRewardToastConnectionType(file.text, supportedStyleModulePath));
  for (const type of ["style_module", "json_config", "runtime_bridge", "unknown"] as FarmSlotStyleConnectionType[]) {
    if (detectedTypes.includes(type)) {
      return type;
    }
  }
  return "none";
}
