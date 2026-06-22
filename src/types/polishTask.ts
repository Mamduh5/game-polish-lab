import { ProjectType } from "./profile";

export type TaskKind = "polish" | "rescue";
export type ProjectStatus = "almost_finished" | "playable_but_ugly" | "early_prototype" | "abandoned_due_to_visuals" | "abandoned_due_to_feel";
export type MainBlocker = "pixel_art_setup" | "combat_readability" | "controls" | "vfx_feedback" | "hud_readability" | "idle_menu_ui" | "sprite_consistency" | "camera_feedback";

export interface PolishPreset {
  id: string;
  label: string;
  description: string;
  bestForProjectTypes: ProjectType[];
  defaultArea: string;
  defaultTargetFeel: string;
  suggestedAllowedFiles: string[];
  suggestedMustNotTouchFiles: string[];
  acceptanceCriteria: string[];
  tunableValues: Record<string, string | number | boolean>;
  antiPatterns: string[];
  definitionOfDone: string[];
}

export interface PolishTask {
  schemaVersion: 1;
  id: string;
  taskKind: TaskKind;
  presetId: string;
  presetLabel: string;
  label?: string;
  engine: "phaser";
  style: "pixel_art";
  projectType: ProjectType;
  problem: string;
  area?: string;
  targetFeel: string;
  allowedFiles: string[];
  mustNotTouch: string[];
  acceptanceCriteria: string[];
  tunableValues: Record<string, string | number | boolean>;
  antiPatterns: string[];
  definitionOfDone: string[];
  notes: string[];
  createdAt: string;
  projectStatus?: ProjectStatus;
  mainBlocker?: MainBlocker;
  suggestedPresets?: string[];
  rescueGoal?: string;
}
