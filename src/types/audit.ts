import { RuntimePresentationModel, ProjectType } from "./profile";

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

export interface PhaserPixelAuditResult {
  detection: PhaserDetectionResult;
  suggestedProjectType: ProjectType;
  projectTypeEvidence: string[];
  dominantMode: ProjectType | "unknown";
  secondaryMode: string;
  runtimePresentationModel: RuntimePresentationModel;
  runtimePresentationEvidence: string[];
  recommendedKitFamily: string;
  gamePresentationNotes: string[];
  passedChecks: string[];
  warnings: string[];
  suggestedFixes: string[];
  suggestedTasks: string[];
  filesInspected: string[];
  pixelArtReadinessScore: number;
  mainRisk: string;
}
