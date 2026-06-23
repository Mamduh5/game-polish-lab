export type ProjectType =
  | "unknown"
  | "arena_combat"
  | "top_down_shooter"
  | "survivor_like"
  | "idle_economy"
  | "clicker_incremental"
  | "moba_like"
  | "mobile_action"
  | "incremental_arena"
  | "cursor_attack_arena"
  | "phaser_dom_hud"
  | "cozy_sort_puzzle"
  | "shelf_sort_puzzle"
  | "tap_to_move_sort_puzzle"
  | "idle_monster_farm"
  | "monster_merge_idle"
  | "phaser_ui_heavy_idle"
  | "tap_farm_idle"
  | "hybrid";

export type CodeStyle = "unknown" | "typescript_module" | "javascript_module" | "browser_global_iife";
export type RuntimePresentationModel = "phaser_rendered" | "phaser_rendered_ui_heavy" | "dom_rendered" | "phaser_timer_dom_ui" | "phaser_rendered_dom_hud" | "unknown";
export type PerformanceMode = "safe" | "balanced" | "deep";

export interface ProjectProfile {
  schemaVersion: 1;
  projectName: string;
  engine: "phaser";
  style: "pixel_art";
  projectType: ProjectType;
  codeStyle: CodeStyle;
  runtimePresentationModel: RuntimePresentationModel;
  configFiles: {
    phaserConfig: string;
    css: string[];
    vfx: string;
    ui: string;
    movement: string;
    combat: string;
  };
  defaultMustNotTouch: string[];
  codexRequiresApprovalBeforePatch: boolean;
  performanceMode: PerformanceMode;
}

export const defaultProfile: ProjectProfile = {
  schemaVersion: 1,
  projectName: "",
  engine: "phaser",
  style: "pixel_art",
  projectType: "unknown",
  codeStyle: "unknown",
  runtimePresentationModel: "unknown",
  configFiles: {
    phaserConfig: "",
    css: [],
    vfx: "",
    ui: "",
    movement: "",
    combat: ""
  },
  defaultMustNotTouch: [
    "src/save",
    "src/economy",
    "src/auth",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock"
  ],
  codexRequiresApprovalBeforePatch: true,
  performanceMode: "safe"
};
