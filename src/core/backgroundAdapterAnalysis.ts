import { isForbiddenV05Path } from "./v05VisualScopeGuard";
import { FarmSlotStyleConnectionType } from "./farmSlotAdapterAnalysis";
import { analyzeVisualRuntimeConnectionProof, VisualRuntimeConnectionProof } from "./visualRuntimeConnectionProof";

export interface BackgroundFileInspection {
  relativePath: string;
  text: string;
}

export interface BackgroundAdapterDetection {
  target: "idle_monster_farm.background";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  ownerFiles: string[];
  reasons: string[];
  supportedStyleModulePath: string;
  warnings: string[];
}

export interface BackgroundStyleConnection {
  connected: boolean;
  connectionType: FarmSlotStyleConnectionType;
  connectedFiles: string[];
  missingPieces: string[];
  runtimeProof: VisualRuntimeConnectionProof;
}

export interface BackgroundAdapterState {
  target: "idle_monster_farm.background";
  detection: BackgroundAdapterDetection;
  connection: BackgroundStyleConnection;
}

export function analyzeBackgroundDetection(files: BackgroundFileInspection[], supportedStyleModulePath = "src/config/backgroundReadabilityStyle.ts"): BackgroundAdapterDetection {
  const ownerFiles = files
    .filter((file) => file.relativePath !== supportedStyleModulePath)
    .filter(isLikelyBackgroundOwnerFile)
    .map((file) => file.relativePath)
    .sort();
  const reasons = buildReasons(files, ownerFiles);
  const warnings = buildWarnings(files, ownerFiles);
  if (ownerFiles.length === 0) {
    warnings.unshift("No likely Idle Monster Farm background rendering files were detected in this workspace.");
  }

  return {
    target: "idle_monster_farm.background",
    detected: ownerFiles.length > 0,
    confidence: resolveConfidence(ownerFiles),
    ownerFiles,
    reasons,
    supportedStyleModulePath,
    warnings
  };
}

export function analyzeBackgroundStyleConnection(files: BackgroundFileInspection[], supportedStyleModulePath = "src/config/backgroundReadabilityStyle.ts"): BackgroundStyleConnection {
  const ownerFiles = files.filter((file) => file.relativePath !== supportedStyleModulePath);
  const runtimeProof = analyzeVisualRuntimeConnectionProof({
    files,
    supportedStyleModulePath,
    styleIdentifier: "BACKGROUND_READABILITY_STYLE",
    styleProperties: backgroundStyleProperties,
    styleConfigPath: ".game-polish-lab/styles/background-readability-style.json",
    importNameHints: ["BACKGROUND_READABILITY_STYLE", "backgroundReadabilityStyle", "background_readability_style"],
    commentMarkers: ["background readability bridge", "gamepolishlabbackgroundstyle", "renderer should read BACKGROUND_READABILITY_STYLE"],
    usageDescription: "Background owner/rendering files"
  });
  const connectedFiles = runtimeProof.evidenceFiles
    .filter((file) => file.evidenceKind === "uses_style_property" || file.evidenceKind === "reads_style_object")
    .map((file) => file.relativePath)
    .sort();
  const connectionType = runtimeProof.connected ? runtimeProof.styleSource : resolveConnectionType(ownerFiles, supportedStyleModulePath, runtimeProof);
  return {
    connected: runtimeProof.connected,
    connectionType,
    connectedFiles,
    missingPieces: runtimeProof.connected ? [] : runtimeProof.missingPieces,
    runtimeProof
  };
}

export function detectBackgroundConnectionType(text: string, supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const normalized = text.toLowerCase();
  const styleImportPath = supportedStyleModulePath.replace(/^src\//, "../").replace(/\.ts$/, "").toLowerCase();
  if (normalized.includes("background_readability_style") || normalized.includes("backgroundreadabilitystyle") || normalized.includes(styleImportPath)) {
    return "style_module";
  }
  if (normalized.includes("background-readability-style.json") || normalized.includes(".game-polish-lab/styles/background-readability-style.json")) {
    return "json_config";
  }
  if (normalized.includes("background readability bridge") || normalized.includes("gamepolishlabbackgroundstyle")) {
    return "runtime_bridge";
  }
  return "none";
}

function isLikelyBackgroundOwnerFile(file: BackgroundFileInspection): boolean {
  const normalizedPath = file.relativePath.toLowerCase();
  const text = file.text.toLowerCase();
  if (isForbiddenV05Path(file.relativePath)) {
    return false;
  }
  if (/background|backdrop|environment|worldview/.test(normalizedPath)) {
    return true;
  }
  if (normalizedPath.includes("farmscene") && /background|backdrop|camera|world|tile|sky|ground|add\.rectangle|graphics/.test(text)) {
    return true;
  }
  return false;
}

function buildReasons(files: BackgroundFileInspection[], ownerFiles: string[]): string[] {
  const reasons: string[] = [];
  for (const file of files) {
    const normalizedPath = file.relativePath.toLowerCase();
    const text = file.text.toLowerCase();
    if (ownerFiles.includes(file.relativePath)) {
      if (/background|backdrop|environment|worldview/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: dedicated background/backdrop/environment file name.`);
      } else if (normalizedPath.includes("farmscene")) {
        reasons.push(`${file.relativePath}: FarmScene references background/world/graphics drawing terms.`);
      }
    }
    if (text.includes("background_readability_style") || text.includes("backgroundreadabilitystyle")) {
      reasons.push(`${file.relativePath}: references generated background readability style values.`);
    }
  }
  return reasons.length > 0 ? reasons : ["No background owner signals found."];
}

function buildWarnings(files: BackgroundFileInspection[], ownerFiles: string[]): string[] {
  const warnings: string[] = [];
  for (const file of files.filter((candidate) => ownerFiles.includes(candidate.relativePath))) {
    const text = file.text.toLowerCase();
    if (/loader|load\.image|preload|asset/.test(text)) {
      warnings.push(`${file.relativePath}: background rendering appears near loader/asset code; v0.52 must not change loader behavior.`);
    }
    if (/camera|worldbounds|setbounds|zoom|scroll/.test(text)) {
      warnings.push(`${file.relativePath}: background rendering appears near camera/world bounds; v0.52 must not change camera or world bounds.`);
    }
    if (/grid|slotcount|slots\.length|repeat\s*\(\s*3|3x3/.test(text)) {
      warnings.push(`${file.relativePath}: background rendering appears near grid/slot layout; v0.52 must not change grid dimensions or slot count.`);
    }
    if (/save|economy|hatch|merge|quest|progression|rewardedad|admob/.test(text)) {
      warnings.push(`${file.relativePath}: background rendering appears near gameplay systems; v0.52 must keep changes visual-only.`);
    }
  }
  return Array.from(new Set(warnings));
}

function resolveConfidence(ownerFiles: string[]): "high" | "medium" | "low" {
  if (ownerFiles.some((file) => /Background|Backdrop|Environment|WorldView/.test(file))) {
    return "high";
  }
  if (ownerFiles.some((file) => file.includes("FarmScene"))) {
    return "medium";
  }
  return ownerFiles.length > 0 ? "low" : "low";
}

function resolveConnectionType(files: BackgroundFileInspection[], supportedStyleModulePath: string, runtimeProof?: VisualRuntimeConnectionProof): FarmSlotStyleConnectionType {
  if (runtimeProof?.styleSource && runtimeProof.styleSource !== "none") {
    return runtimeProof.styleSource;
  }
  const detectedTypes = files.map((file) => detectBackgroundConnectionType(file.text, supportedStyleModulePath));
  for (const type of ["style_module", "json_config", "runtime_bridge", "unknown"] as FarmSlotStyleConnectionType[]) {
    if (detectedTypes.includes(type)) {
      return type;
    }
  }
  return "none";
}

const backgroundStyleProperties = [
  "backgroundColor",
  "backgroundImageOpacity",
  "contrastOverlayColor",
  "contrastOverlayOpacity",
  "vignetteStrength",
  "patternOpacity",
  "blurAmount",
  "brightness",
  "contrast"
];
