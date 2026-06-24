import { FarmSlotStyleConnectionType } from "./farmSlotAdapterAnalysis";
import { isForbiddenV05Path } from "./v05VisualScopeGuard";

export type MonsterFarmPanelTarget = "navigation_panel" | "hatch_panel" | "quest_panel";

export interface PanelFileInspection {
  relativePath: string;
  text: string;
}

export interface PanelAdapterDetection {
  target: "idle_monster_farm.panels";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  ownerFiles: string[];
  targetPanels: MonsterFarmPanelTarget[];
  reasons: string[];
  warnings: string[];
  supportedStyleModulePath: string;
}

export interface PanelStyleConnection {
  connected: boolean;
  connectionType: FarmSlotStyleConnectionType;
  connectedFiles: string[];
  missingPieces: string[];
}

export interface PanelAdapterState {
  target: "idle_monster_farm.panels";
  detection: PanelAdapterDetection;
  connection: PanelStyleConnection;
}

export function analyzePanelDetection(files: PanelFileInspection[], supportedStyleModulePath = "src/config/panelStyle.ts"): PanelAdapterDetection {
  const ownerFiles = files
    .filter((file) => file.relativePath !== supportedStyleModulePath)
    .filter(isLikelyPanelOwnerFile)
    .map((file) => file.relativePath)
    .sort();
  const targetPanels = detectTargetPanels(files.filter((file) => ownerFiles.includes(file.relativePath)));
  const reasons = buildReasons(files, ownerFiles);
  const warnings = buildWarnings(files, ownerFiles);
  if (ownerFiles.length === 0) {
    warnings.unshift("No likely Idle Monster Farm panel rendering files were detected in this workspace.");
  }
  return {
    target: "idle_monster_farm.panels",
    detected: ownerFiles.length > 0,
    confidence: resolveConfidence(ownerFiles, targetPanels),
    ownerFiles,
    targetPanels,
    reasons,
    warnings,
    supportedStyleModulePath
  };
}

export function analyzePanelStyleConnection(files: PanelFileInspection[], supportedStyleModulePath = "src/config/panelStyle.ts"): PanelStyleConnection {
  const ownerFiles = files.filter((file) => file.relativePath !== supportedStyleModulePath);
  const connectedFiles = ownerFiles
    .filter((file) => detectPanelConnectionType(file.text, supportedStyleModulePath) !== "none")
    .map((file) => file.relativePath)
    .sort();
  const connectionType = resolveConnectionType(ownerFiles, supportedStyleModulePath);
  const missingPieces: string[] = [];
  if (connectionType === "none") {
    missingPieces.push("Panel owner/rendering files do not import or read the generated panel style module/config.");
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

export function detectPanelConnectionType(text: string, supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const normalized = text.toLowerCase();
  const styleImportPath = supportedStyleModulePath.replace(/^src\//, "../").replace(/\.ts$/, "").toLowerCase();
  if (normalized.includes("panel_style") || normalized.includes("panelstyle") || normalized.includes(styleImportPath)) {
    return "style_module";
  }
  if (normalized.includes("panel-style.json") || normalized.includes(".game-polish-lab/styles/panel-style.json")) {
    return "json_config";
  }
  if (normalized.includes("panel style bridge") || normalized.includes("gamepolishlabpanelstyle")) {
    return "runtime_bridge";
  }
  return "none";
}

function isLikelyPanelOwnerFile(file: PanelFileInspection): boolean {
  const normalizedPath = file.relativePath.toLowerCase();
  const text = file.text.toLowerCase();
  if (isForbiddenV05Path(file.relativePath)) {
    return false;
  }
  if (/panel|modal|chrome|navigationmenu|navigationcontrol|hatchpanel|questwidget/.test(normalizedPath)) {
    return true;
  }
  return normalizedPath.includes("farmscene") && /panel|navigation|hatch|quest|modal/.test(text);
}

function detectTargetPanels(files: PanelFileInspection[]): MonsterFarmPanelTarget[] {
  const targets = new Set<MonsterFarmPanelTarget>();
  for (const file of files) {
    const haystack = `${file.relativePath}\n${file.text}`.toLowerCase();
    if (/navigation|menu/.test(haystack)) {
      targets.add("navigation_panel");
    }
    if (/hatch/.test(haystack)) {
      targets.add("hatch_panel");
    }
    if (/quest/.test(haystack)) {
      targets.add("quest_panel");
    }
  }
  return Array.from(targets).sort();
}

function buildReasons(files: PanelFileInspection[], ownerFiles: string[]): string[] {
  const reasons: string[] = [];
  for (const file of files) {
    const normalizedPath = file.relativePath.toLowerCase();
    const text = file.text.toLowerCase();
    if (ownerFiles.includes(file.relativePath)) {
      if (/panel|modal|chrome/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: dedicated panel/modal/chrome file name.`);
      } else if (/navigation/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: navigation panel owner file name.`);
      } else if (/hatch/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: hatch panel owner file name.`);
      } else if (/quest/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: quest panel owner file name.`);
      } else if (normalizedPath.includes("farmscene")) {
        reasons.push(`${file.relativePath}: FarmScene references panel/navigation/hatch/quest view creation.`);
      }
    }
    if (text.includes("panel_style") || text.includes("panelstyle")) {
      reasons.push(`${file.relativePath}: references generated panel style values.`);
    }
  }
  return reasons.length > 0 ? reasons : ["No panel owner signals found."];
}

function buildWarnings(files: PanelFileInspection[], ownerFiles: string[]): string[] {
  const warnings: string[] = [];
  for (const file of files.filter((candidate) => ownerFiles.includes(candidate.relativePath))) {
    const text = file.text.toLowerCase();
    if (/navigate|route|router|scene\.start|switchpanel/.test(text)) {
      warnings.push(`${file.relativePath}: panel rendering appears near navigation behavior; v0.54 must not change navigation logic.`);
    }
    if (/hatchstate|hatch_cooldown|hatchcost|cooldown|odds/.test(text)) {
      warnings.push(`${file.relativePath}: panel rendering appears near hatch behavior; v0.54 must not change hatch logic.`);
    }
    if (/queststate|quest_definitions|reward|completequest/.test(text)) {
      warnings.push(`${file.relativePath}: panel rendering appears near quest behavior; v0.54 must not change quest logic or rewards.`);
    }
    if (/save|economy|progression|rewardedad|admob|gameplay|rules/.test(text)) {
      warnings.push(`${file.relativePath}: panel rendering appears near protected gameplay systems; v0.54 must keep changes visual-only.`);
    }
  }
  return Array.from(new Set(warnings));
}

function resolveConfidence(ownerFiles: string[], targetPanels: MonsterFarmPanelTarget[]): "high" | "medium" | "low" {
  if (targetPanels.length >= 2 || ownerFiles.some((file) => /Panel|Widget|Chrome/.test(file))) {
    return "high";
  }
  if (ownerFiles.length > 0) {
    return "medium";
  }
  return "low";
}

function resolveConnectionType(files: PanelFileInspection[], supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const detectedTypes = files.map((file) => detectPanelConnectionType(file.text, supportedStyleModulePath));
  for (const type of ["style_module", "json_config", "runtime_bridge", "unknown"] as FarmSlotStyleConnectionType[]) {
    if (detectedTypes.includes(type)) {
      return type;
    }
  }
  return "none";
}
