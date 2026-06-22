export type PhaserConfidence = "high" | "medium" | "low" | "none";

export interface PhaserDetectionResult {
  isPhaserProject: boolean;
  confidence: PhaserConfidence;
  evidence: string[];
}

export interface InspectedFile {
  relativePath: string;
  text: string;
}

export interface AuditCheck {
  label: string;
  passed: boolean;
  evidence: string[];
}

export interface PhaserPixelAuditResult {
  detection: PhaserDetectionResult;
  passedChecks: string[];
  warnings: string[];
  suggestedTasks: string[];
  filesInspected: string[];
}
