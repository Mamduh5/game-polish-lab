import { AssetReplacementAssignmentMode, AssetReplacementTarget } from "../types/visualSurface";

export interface MonsterFarmAssetTargetDetection {
  adapterId: "idle_monster_farm.assets";
  targets: AssetReplacementTarget[];
  warnings: string[];
}

export function detectMonsterFarmAssetTargets(): MonsterFarmAssetTargetDetection {
  return {
    adapterId: "idle_monster_farm.assets",
    targets: monsterFarmAssetTargets(),
    warnings: [
      "Asset copy is supported, but runtime loader/renderer manifest consumption is not proven yet.",
      "No asset target is advertised as direct apply until a real loader/assignment path is connected."
    ]
  };
}

export function monsterFarmAssetTargets(): AssetReplacementTarget[] {
  return [
    buildTarget("monster_art", "Monster art", ["monster", "creature", "transparent sprite"], "src/assets/monsters", "manual_required", true, false, 128, 128),
    buildTarget("slot_frame", "Slot frame", ["ui frame", "transparent frame"], "src/assets/ui", "manual_required", true, false, 128, 128),
    buildTarget("background_image", "Background image", ["background", "farm backdrop"], "src/assets/backgrounds", "manual_required", false, false, 960, 540),
    buildTarget("reward_icon", "Reward icon", ["reward icon", "toast icon"], "src/assets/rewards", "manual_required", true, false, 64, 64)
  ];
}

function buildTarget(
  targetId: AssetReplacementTarget["targetId"],
  label: string,
  expectedKinds: string[],
  destinationFolder: string,
  assignmentMode: AssetReplacementAssignmentMode,
  transparencyRequired: boolean,
  directApplySupported: boolean,
  expectedWidth: number,
  expectedHeight: number
): AssetReplacementTarget {
  return {
    targetId,
    label,
    surfaceType: "asset_replacement",
    expectedKinds,
    acceptedFileTypes: ["image/png", "image/webp"],
    expectedWidth,
    expectedHeight,
    transparencyRequired,
    destinationFolder,
    assignmentMode,
    directApplySupported,
    warnings: directApplySupported ? [] : ["Assignment is manual_required; the asset can be copied safely but no loader/manifest patch will be made or claimed."]
  };
}
