import { isForbiddenV05Path } from "./v05VisualScopeGuard";
import { analyzeVisualRuntimeConnectionProof, VisualRuntimeConnectionProof } from "./visualRuntimeConnectionProof";

export interface FarmSlotFileInspection {
  relativePath: string;
  text: string;
}

export interface FarmSlotAdapterDetection {
  target: "idle_monster_farm.farm_slots";
  detected: boolean;
  confidence: "high" | "medium" | "low";
  ownerFiles: string[];
  reasons: string[];
  supportedStyleModulePath: string;
  warnings: string[];
}

export type FarmSlotStyleConnectionType = "style_module" | "json_config" | "runtime_bridge" | "unknown" | "none";

export interface FarmSlotStyleConnection {
  connected: boolean;
  connectionType: FarmSlotStyleConnectionType;
  connectedFiles: string[];
  missingPieces: string[];
  runtimeProof: VisualRuntimeConnectionProof;
}

export interface FarmSlotAdapterState {
  target: "idle_monster_farm.farm_slots";
  detection: FarmSlotAdapterDetection;
  connection: FarmSlotStyleConnection;
}

export function analyzeFarmSlotDetection(files: FarmSlotFileInspection[], supportedStyleModulePath = "src/config/farmSlotStyle.ts"): FarmSlotAdapterDetection {
  const ownerFiles = files
    .filter((file) => file.relativePath !== supportedStyleModulePath)
    .filter((file) => isLikelyOwnerFile(file))
    .map((file) => file.relativePath)
    .sort();
  const reasons = buildDetectionReasons(files, ownerFiles);
  const warnings = buildCouplingWarnings(files, ownerFiles);
  if (ownerFiles.length === 0) {
    warnings.unshift("No likely Idle Monster Farm farm slot rendering files were detected in this workspace.");
  }
  if (!ownerFiles.some((file) => /FarmSlot|FarmGrid|SlotCard|farmSlotStyle/.test(file))) {
    warnings.push("No dedicated farm slot renderer/style hook was found; one-time setup may require a safe owner file.");
  }

  return {
    target: "idle_monster_farm.farm_slots",
    detected: ownerFiles.length > 0,
    confidence: resolveDetectionConfidence(ownerFiles, reasons),
    ownerFiles,
    reasons,
    supportedStyleModulePath,
    warnings
  };
}

export function analyzeFarmSlotStyleConnection(files: FarmSlotFileInspection[], supportedStyleModulePath = "src/config/farmSlotStyle.ts"): FarmSlotStyleConnection {
  const runtimeProof = analyzeVisualRuntimeConnectionProof({
    files,
    supportedStyleModulePath,
    styleIdentifier: "FARM_SLOT_STYLE",
    styleProperties: farmSlotStyleProperties,
    styleConfigPath: ".game-polish-lab/styles/farm-slot-style.json",
    importNameHints: ["FARM_SLOT_STYLE", "farmSlotStyle", "farm_slot_style"],
    commentMarkers: ["runtime bridge", "farm slot style bridge", "gamepolishlabfarmslotstyle", "renderer should read FARM_SLOT_STYLE"],
    usageDescription: "Farm slot owner/rendering files"
  });
  const connectedFiles = runtimeProof.evidenceFiles
    .filter((file) => file.evidenceKind === "uses_style_property" || file.evidenceKind === "reads_style_object")
    .map((file) => file.relativePath)
    .sort();
  const connectionType = runtimeProof.connected ? runtimeProof.styleSource : resolveConnectionType(files.filter((file) => file.relativePath !== supportedStyleModulePath), supportedStyleModulePath, runtimeProof);
  const missingPieces: string[] = [];
  if (!runtimeProof.connected) {
    missingPieces.push(...runtimeProof.missingPieces);
  }
  return {
    connected: runtimeProof.connected,
    connectionType,
    connectedFiles,
    missingPieces: Array.from(new Set(missingPieces)),
    runtimeProof
  };
}

export function detectConnectionType(text: string, supportedStyleModulePath: string): FarmSlotStyleConnectionType {
  const normalized = text.toLowerCase();
  const styleImportPath = supportedStyleModulePath.replace(/^src\//, "../").replace(/\.ts$/, "").toLowerCase();
  if (normalized.includes("farm_slot_style") || normalized.includes("farmslotstyle") || normalized.includes(styleImportPath)) {
    return "style_module";
  }
  if (normalized.includes("farm-slot-style.json") || normalized.includes(".game-polish-lab/styles/farm-slot-style.json")) {
    return "json_config";
  }
  if (normalized.includes("runtime bridge") || normalized.includes("farm slot style bridge") || normalized.includes("gamepolishlabfarmslotstyle")) {
    return "runtime_bridge";
  }
  return "none";
}

function isLikelyOwnerFile(file: FarmSlotFileInspection): boolean {
  const normalizedPath = file.relativePath.toLowerCase();
  const text = file.text.toLowerCase();
  if (isForbiddenV05Path(file.relativePath)) {
    return false;
  }
  if (/farmslot|farmgrid|slotcard/.test(normalizedPath)) {
    return true;
  }
  if (normalizedPath.includes("farmscene") && /farmslotstate|slots|slot|locked|merge|selected/.test(text)) {
    return true;
  }
  if (normalizedPath.includes("monsterrenderer") && /slot|display|scale|offset|monster/.test(text)) {
    return true;
  }
  return false;
}

function buildDetectionReasons(files: FarmSlotFileInspection[], ownerFiles: string[]): string[] {
  const reasons: string[] = [];
  for (const file of files) {
    const normalizedPath = file.relativePath.toLowerCase();
    const text = file.text.toLowerCase();
    if (ownerFiles.includes(file.relativePath)) {
      if (/farmslot|farmgrid|slotcard/.test(normalizedPath)) {
        reasons.push(`${file.relativePath}: dedicated farm slot/grid/card file name.`);
      } else if (normalizedPath.includes("farmscene")) {
        reasons.push(`${file.relativePath}: FarmScene references slot/farm slot state rendering terms.`);
      } else if (normalizedPath.includes("monsterrenderer")) {
        reasons.push(`${file.relativePath}: MonsterRenderer can affect monster slot display scale/offset.`);
      }
    }
    if (text.includes("farm_slot_style") || text.includes("farmslotstyle")) {
      reasons.push(`${file.relativePath}: references generated farm slot style values.`);
    }
  }
  return reasons.length > 0 ? reasons : ["No farm slot owner signals found."];
}

function buildCouplingWarnings(files: FarmSlotFileInspection[], ownerFiles: string[]): string[] {
  const warnings: string[] = [];
  for (const file of files.filter((candidate) => ownerFiles.includes(candidate.relativePath))) {
    const text = file.text.toLowerCase();
    if (/save|writesavedata|savesystem|schema/.test(text)) {
      warnings.push(`${file.relativePath}: farm slot rendering appears near save/schema code; v0.51 must not change save schema.`);
    }
    if (/array\s*\(\s*9\s*\)|repeat\s*\(\s*3|3x3|slotcount|slot_count|slots\.length|grid/.test(text)) {
      warnings.push(`${file.relativePath}: farm slot rendering may be coupled to fixed slot count/grid dimensions; v0.51 must not change slot count or grid dimensions.`);
    }
    if (/unlock|progression|levelgate|stage/.test(text)) {
      warnings.push(`${file.relativePath}: farm slot rendering may be coupled to progression/unlocks; v0.51 must not change unlock rules.`);
    }
    if (/merge|getmonstermergeresult|findmergecandidate|monstermergesystem/.test(text)) {
      warnings.push(`${file.relativePath}: farm slot rendering may be coupled to merge logic; v0.51 must not change merge behavior.`);
    }
  }
  return Array.from(new Set(warnings));
}

function resolveDetectionConfidence(ownerFiles: string[], reasons: string[]): "high" | "medium" | "low" {
  if (ownerFiles.some((file) => /FarmSlot|FarmGrid|SlotCard/.test(file))) {
    return "high";
  }
  if (ownerFiles.length >= 2 || reasons.some((reason) => reason.includes("FarmScene references"))) {
    return "medium";
  }
  return "low";
}

function resolveConnectionType(files: FarmSlotFileInspection[], supportedStyleModulePath: string, runtimeProof?: VisualRuntimeConnectionProof): FarmSlotStyleConnectionType {
  if (runtimeProof?.styleSource && runtimeProof.styleSource !== "none") {
    return runtimeProof.styleSource;
  }
  const detectedTypes = files.map((file) => detectConnectionType(file.text, supportedStyleModulePath));
  for (const type of ["style_module", "json_config", "runtime_bridge", "unknown"] as FarmSlotStyleConnectionType[]) {
    if (detectedTypes.includes(type)) {
      return type;
    }
  }
  return "none";
}

const farmSlotStyleProperties = [
  "slotWidth",
  "slotHeight",
  "gap",
  "borderWidth",
  "cornerRadius",
  "fillColor",
  "borderColor",
  "selectedGlowStrength",
  "lockedOverlayOpacity",
  "emptySlotOpacity",
  "mergeCandidatePulseScale",
  "monsterDisplayScale",
  "monsterVerticalOffset"
];
