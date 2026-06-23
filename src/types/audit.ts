import type { ScanStats } from "../core/workspaceScanner";
import { RuntimePresentationModel, ProjectType, CodeStyle } from "./profile";

export type PhaserConfidence = "high" | "medium" | "low" | "none";

export interface PhaserDetectionResult {
  isPhaserProject: boolean;
  confidence: PhaserConfidence;
  evidence: string[];
  filesInspected: string[];
}

export interface InspectedFile {
  relativePath: string;
  text: string;
  sizeBytes?: number;
}

export interface AuditCheck {
  label: string;
  passed: boolean;
  evidence: string[];
}

export interface PresentationRouteSummary {
  mainDomRouteEvidence: string[];
  arenaRouteEvidence: string[];
  primaryPolishRoute: "arena" | "main_dom" | "unknown";
  secondaryRuntimePresentationModel?: RuntimePresentationModel;
  notes: string[];
}

export interface PhaserPixelAuditResult {
  detection: PhaserDetectionResult;
  suggestedProjectType: ProjectType;
  projectTypeEvidence: string[];
  dominantMode: ProjectType | "unknown";
  secondaryMode: string;
  runtimePresentationModel: RuntimePresentationModel;
  secondaryRuntimePresentationModel?: RuntimePresentationModel;
  runtimePresentationEvidence: string[];
  codeStyle: CodeStyle;
  codeStyleEvidence: string[];
  recommendedKitFamily: string;
  presentationRoutes?: PresentationRouteSummary;
  gamePresentationNotes: string[];
  passedChecks: string[];
  warnings: string[];
  suggestedFixes: string[];
  suggestedTasks: string[];
  filesInspected: string[];
  scanStats?: ScanStats;
  pixelArtReadinessScore: number;
  mainRisk: string;
}
