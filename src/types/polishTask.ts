export interface PolishPreset {
  id: string;
  label: string;
  description: string;
  defaultArea: string;
  defaultTargetFeel: string;
  suggestedAllowedFiles: string[];
  suggestedMustNotTouchFiles: string[];
  acceptanceCriteria: string[];
  tunableValues: Record<string, string | number | boolean>;
}

export interface PolishTask {
  schemaVersion: 1;
  id: string;
  presetId: string;
  label: string;
  engine: "phaser";
  style: "pixel_art";
  problem: string;
  area: string;
  targetFeel: string;
  allowedFiles: string[];
  mustNotTouch: string[];
  acceptanceCriteria: string[];
  tunableValues: Record<string, string | number | boolean>;
  createdAt: string;
}
