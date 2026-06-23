import { CodeStyle, ProjectType, RuntimePresentationModel } from "./profile";

export type VisualArea =
  | "cursor_attack_feedback"
  | "enemy_kill_feedback"
  | "combo_feedback"
  | "arena_hud_readability"
  | "arena_upgrade_panel_readability"
  | "arena_background_readability"
  | "click_feedback"
  | "upgrade_card_readability"
  | "reward_popup"
  | "sort_move_feedback"
  | "selected_shelf_readability"
  | "invalid_move_feedback"
  | "completed_shelf_glow"
  | "win_celebration"
  | "spirit_identity_readability"
  | "puzzle_hud_readability"
  | "mobile_sort_layout_readability"
  | "monster_farm_slot_readability"
  | "hatch_feedback"
  | "merge_feedback"
  | "tap_farm_feedback"
  | "coin_bug_feedback"
  | "farm_hud_readability"
  | "monster_identity_readability"
  | "panel_readability"
  | "toast_reward_feedback"
  | "quest_widget_readability"
  | "boss_battle_feedback"
  | "other";

export type VisualSymptom =
  | "too_weak"
  | "too_noisy"
  | "worse_after_tuning"
  | "same_after_tuning"
  | "unreadable"
  | "cluttered"
  | "wrong_color_layer"
  | "bad_timing"
  | "style_mismatch"
  | "other";

export type AffectedScope = "all_skins" | "some_skins" | "one_skin" | "unknown";
export type PreviousPatchResult = "no" | "yes_worse" | "yes_same" | "yes_mixed";

export interface VisualDiagnosisTask {
  schemaVersion: 1;
  taskKind: "visual_diagnosis";
  createdAt: string;
  area: VisualArea;
  symptom: VisualSymptom;
  observation: string;
  affectedScope: AffectedScope;
  affectedSkins: string[];
  previousPatchResult: PreviousPatchResult;
  projectType: ProjectType;
  dominantMode: ProjectType | "unknown";
  runtimePresentationModel: RuntimePresentationModel;
  codeStyle: CodeStyle;
  primaryRoute: "arena" | "main_dom" | "unknown";
  likelyFiles: string[];
  allowedFilesForInspection: string[];
  mustNotTouch: string[];
  nonGoals: string[];
  diagnosticQuestions: string[];
  rollbackReference: string;
}

export type TuningExperimentType =
  | "config_only"
  | "per_skin_multiplier"
  | "reduce_shared_overlay"
  | "fallback_only_shared_effect"
  | "rollback_bad_tuning"
  | "compare_two_variants";

export interface TuningExperimentTask {
  schemaVersion: 1;
  taskKind: "tuning_experiment";
  createdAt: string;
  diagnosisTaskId: string;
  area: VisualArea;
  experimentType: TuningExperimentType;
  expectedResult: string;
  rollbackReference: string;
  hypothesis: string;
  allowedFiles: string[];
  mustNotTouch: string[];
  manualTestMatrix: string[];
}

export type RollbackWorseArea = "all_visuals" | "some_skins" | "timing" | "color_layer" | "particle_density" | "readability" | "performance" | "other";
export type RollbackScope = "full_last_patch" | "config_only_values" | "specific_files" | "specific_fields";
