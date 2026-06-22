import { CodeStyle, ProjectType } from "./profile";

export interface PixelPolishKitPreset {
  kitId: string;
  label: string;
  description: string;
  bestForProjectTypes: ProjectType[];
  suggestedConfigPath: string;
  configExportName: string;
  codeStyle?: CodeStyle;
  configTemplate: string;
  targetFeel: string;
  acceptanceCriteria: string[];
  antiPatterns: string[];
  codexImplementationNotes: string[];
  manualTuningAdvice: string[];
}

export interface PixelPolishKit {
  schemaVersion: 1;
  kitVersion: "0.2";
  createdAt: string;
  kitId: string;
  kitLabel: string;
  engine: "phaser";
  style: "pixel_art";
  projectType: ProjectType;
  suggestedConfigPath: string;
  actualConfigPath: string;
  configExportName: string;
  codeStyle: CodeStyle;
  targetFeel: string;
  acceptanceCriteria: string[];
  antiPatterns: string[];
  manualTuningAdvice: string[];
  codexImplementationNotes: string[];
}
