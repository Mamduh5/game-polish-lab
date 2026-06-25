import { FarmSlotStyleConnectionType } from "./farmSlotAdapterAnalysis";
import { isForbiddenV05Path } from "./v05VisualScopeGuard";

export type MonsterFarmButtonTarget = "action_bar_button" | "hatch_button" | "upgrade_button" | "disabled_locked_button";

export interface ButtonFileInspection {
  relativePath: string;
  text: string;
}

export interface ButtonAdapterDetection {
  target: "idle_monster_farm.buttons";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  ownerFiles: string[];
  targetButtons: MonsterFarmButtonTarget[];
  reasons: string[];
  warnings: string[];
  supportedStyleModulePath: string;
}

export interface ButtonStyleConnection {
  connected: boolean;
  connectionType: FarmSlotStyleConnectionType;
  connectedFiles: string[];
  missingPieces: string[];
}

export interface ButtonAdapterState {
  target: "idle_monster_farm.buttons";
  detection: ButtonAdapterDetection;
  connection: ButtonStyleConnection;
}

export function analyzeButtonDetection(files: ButtonFileInspection[], supportedStyleModulePath = "src/config/buttonStyle.ts"): ButtonAdapterDetection {
  const ownerFiles = files
    .filter((file) => file.relativePath !== supportedStyleModulePath)
    .filter(isLikelyButtonOwnerFile)
    .map((file) => file.relativePath)
    .sort();
  const targetButtons = detectTargetButtons(files.filter((file) => ownerFiles.includes(file.relativePath)));
  const reasons = buildReasons(files, ownerFiles);
  const warnings = buildWarnings(files, ownerFiles);
  if (ownerFiles.length === 0) {
    warnings.unshift("No likely Idle Monster Farm button/action-bar rendering files were detected in this workspace.");
  }
  return {
    target: "idle_monster_farm.buttons",
    detected: ownerFiles.length > 0,
    confidence: resolveConfidence(ownerFiles, targetButtons),
    ownerFiles,
    targetButtons,
    reasons,
    warnings,
    supportedStyleModulePath
  };
}

export function analyzeButtonStyleConnection(files: ButtonFileInspection[], supportedStyleModulePath = "src/config/buttonStyle.ts"): ButtonStyleConnection {
  const ownerFiles = files.filter((file) => file.relativePath !== supportedStyleModulePath);
  const connectedFiles = ownerFiles
    .filter((file) => detectButtonConnectionType(file.text, supportedStyleModulePath) !== "none")
    .map((file) => file.relativePath)
    .sort();
  const connectionType = resolveConnectionType(ownerFiles, supportedStyleModulePath);
  const missingPieces: string[] = [];
  if (connectionType === "none") {
    missingPieces.push("Button/action-bar owner/rendering files do not import or read the generated button style module/config.");
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

export function detectButtonConnectionType(text: string, supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const normalized = text.toLowerCase();
  const styleImportPath = supportedStyleModulePath.replace(/^src\//, "../").replace(/\.ts$/, "").toLowerCase();
  if (normalized.includes("button_style") || normalized.includes("buttonstyle") || normalized.includes(styleImportPath)) {
    return "style_module";
  }
  if (normalized.includes("button-style.json") || normalized.includes(".game-polish-lab/styles/button-style.json")) {
    return "json_config";
  }
  if (normalized.includes("button style bridge") || normalized.includes("gamepolishlabbuttonstyle")) {
    return "runtime_bridge";
  }
  return "none";
}

function isLikelyButtonOwnerFile(file: ButtonFileInspection): boolean {
  const normalizedPath = file.relativePath.toLowerCase();
  const text = file.text.toLowerCase();
  if (isForbiddenV05Path(file.relativePath)) {
    return false;
  }
  if (/button|actionbar|action-bar|controls|panelcontrols|hatchpanel|upgradepanel/.test(normalizedPath)) {
    return true;
  }
  return normalizedPath.includes("farmscene") && /button|action bar|actionbar|hatch|upgrade|disabled|locked/.test(text);
}

function detectTargetButtons(files: ButtonFileInspection[]): MonsterFarmButtonTarget[] {
  const targets = new Set<MonsterFarmButtonTarget>();
  for (const file of files) {
    const haystack = `${file.relativePath}\n${file.text}`.toLowerCase();
    if (/actionbar|action bar|gameplayactionbar|footer action/.test(haystack)) {
      targets.add("action_bar_button");
    }
    if (/hatch/.test(haystack)) {
      targets.add("hatch_button");
    }
    if (/upgrade/.test(haystack)) {
      targets.add("upgrade_button");
    }
    if (/disabled|locked|cooldown|unavailable/.test(haystack)) {
      targets.add("disabled_locked_button");
    }
  }
  return Array.from(targets).sort();
}

function buildReasons(files: ButtonFileInspection[], ownerFiles: string[]): string[] {
  const reasons: string[] = [];
  for (const file of files) {
    const normalizedPath = file.relativePath.toLowerCase();
    const text = file.text.toLowerCase();
    if (ownerFiles.includes(file.relativePath)) {
      if (/actionbar|action-bar/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: dedicated action-bar button owner file name.`);
      } else if (/button|controls/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: dedicated button/control rendering file name.`);
      } else if (/hatch/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: hatch button rendering owner file name.`);
      } else if (/upgrade/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: upgrade button rendering owner file name.`);
      } else if (normalizedPath.includes("farmscene")) {
        reasons.push(`${file.relativePath}: FarmScene references button/action-bar/hatch/upgrade rendering.`);
      }
    }
    if (text.includes("button_style") || text.includes("buttonstyle")) {
      reasons.push(`${file.relativePath}: references generated button style values.`);
    }
  }
  return reasons.length > 0 ? reasons : ["No button owner signals found."];
}

function buildWarnings(files: ButtonFileInspection[], ownerFiles: string[]): string[] {
  const warnings: string[] = [];
  for (const file of files.filter((candidate) => ownerFiles.includes(candidate.relativePath))) {
    const text = file.text.toLowerCase();
    if (/onclick|pointer|input|dispatch|command|emit|callback|handler/.test(text)) {
      warnings.push(`${file.relativePath}: button rendering appears near input/action dispatch; v0.56 must not change button behavior or input semantics.`);
    }
    if (/hatchstate|hatch_cooldown|hatchcost|cooldown|odds/.test(text)) {
      warnings.push(`${file.relativePath}: button rendering appears near hatch behavior; v0.56 must not change hatch logic.`);
    }
    if (/upgradestate|upgradecost|buyupgrade|buy upgrade|purchaseupgrade|purchase upgrade/.test(text)) {
      warnings.push(`${file.relativePath}: button rendering appears near upgrade behavior; v0.56 must not change upgrade logic.`);
    }
    if (/save|economy|progression|quest|rewardedad|admob|inventory|state|gameplay|rules/.test(text)) {
      warnings.push(`${file.relativePath}: button rendering appears near protected gameplay systems; v0.56 must keep changes visual-only.`);
    }
  }
  return Array.from(new Set(warnings));
}

function resolveConfidence(ownerFiles: string[], targetButtons: MonsterFarmButtonTarget[]): "high" | "medium" | "low" {
  if (targetButtons.length >= 2 || ownerFiles.some((file) => /Button|ActionBar|Controls/.test(file))) {
    return "high";
  }
  if (targetButtons.length > 0 || ownerFiles.length > 0) {
    return "medium";
  }
  return "low";
}

function resolveConnectionType(files: ButtonFileInspection[], supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const detectedTypes = files.map((file) => detectButtonConnectionType(file.text, supportedStyleModulePath));
  for (const type of ["style_module", "json_config", "runtime_bridge", "unknown"] as FarmSlotStyleConnectionType[]) {
    if (detectedTypes.includes(type)) {
      return type;
    }
  }
  return "none";
}
