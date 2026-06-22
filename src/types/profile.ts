export type ProjectType =
  | "unknown"
  | "arena_combat"
  | "top_down_shooter"
  | "survivor_like"
  | "idle_economy"
  | "clicker_incremental"
  | "moba_like"
  | "mobile_action"
  | "hybrid";

export interface ProjectProfile {
  schemaVersion: 1;
  projectName: string;
  engine: "phaser";
  style: "pixel_art";
  projectType: ProjectType;
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
}

export const defaultProfile: ProjectProfile = {
  schemaVersion: 1,
  projectName: "",
  engine: "phaser",
  style: "pixel_art",
  projectType: "unknown",
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
  codexRequiresApprovalBeforePatch: true
};
