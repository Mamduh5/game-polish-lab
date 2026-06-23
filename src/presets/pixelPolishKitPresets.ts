import { ProjectType } from "../types/profile";
import { PixelPolishKitPreset } from "../types/pixelPolishKit";

const actionTypes: ProjectType[] = ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "mobile_action", "hybrid"];
const idleTypes: ProjectType[] = ["idle_economy", "clicker_incremental", "idle_monster_farm", "monster_merge_idle", "phaser_ui_heavy_idle", "tap_farm_idle", "hybrid"];
const sortPuzzleTypes: ProjectType[] = ["cozy_sort_puzzle", "shelf_sort_puzzle", "tap_to_move_sort_puzzle"];
const monsterFarmTypes: ProjectType[] = ["idle_monster_farm", "monster_merge_idle", "phaser_ui_heavy_idle", "tap_farm_idle"];
const allTypes: ProjectType[] = ["unknown", ...actionTypes, ...idleTypes, ...sortPuzzleTypes];

const actionAntiPatterns = [
  "Do not use long smooth gradient effects for pixel-art VFX.",
  "Do not hide gameplay under excessive particles.",
  "Do not change damage, HP, economy, save fields, progression, item drops, or unrelated systems unless explicitly requested.",
  "Do not redesign unrelated screens."
];

const idleAntiPatterns = [
  "Do not rebuild the entire UI framework.",
  "Do not change economy values.",
  "Do not rename save fields.",
  "Do not add new currencies unless explicitly requested."
];

function jsConfig(name: string, body: string): string {
  return `export const ${name} = {
  ${body}
};
`;
}

function tsConfig(name: string, body: string): string {
  return `export const ${name} = {
  ${body}
} as const;
`;
}

function sortKit(kitId: string, label: string, path: string, exportName: string, configTemplate: string, targetFeel: string): PixelPolishKitPreset {
  return {
    kitId,
    label,
    description: `${label} for cozy tap-to-move shelf sorting puzzle polish.`,
    bestForProjectTypes: sortPuzzleTypes,
    suggestedConfigPath: path,
    configExportName: exportName,
    codeStyle: "javascript_module",
    configTemplate,
    targetFeel,
    acceptanceCriteria: [
      "Valid, invalid, selected, completed, and win-state feedback remain visually distinct where relevant.",
      "Spirit identity remains readable during selection and movement.",
      "Sort rules, level data, save/progress, unlock rules, and win logic are unchanged.",
      "Timing, spacing, alpha, shake, sparkle, and glow values come from config."
    ],
    antiPatterns: [
      "Do not change SortRules.",
      "Do not change level data.",
      "Do not make invalid moves legal.",
      "Do not change save/progression.",
      "Do not redesign all visuals.",
      "Do not add economy/shop/combat systems."
    ],
    codexImplementationNotes: [
      "This is a tap-to-move shelf sorting puzzle, not combat, not idle economy, and not cursor attack arena.",
      "Inspect src/scenes/SpiritSortScene.js first.",
      "Inspect src/systems/SortRules.js and src/data/spiritSortLevels.js only for rule/data context.",
      "Preserve JavaScript module style.",
      "Prefer config-driven visual values and keep the patch small and reversible."
    ],
    manualTuningAdvice: [
      "Tune movement duration before adding particles.",
      "Keep invalid move feedback short and clear.",
      "Reduce glow/sparkle before it hides spirit identity."
    ]
  };
}

function farmKit(kitId: string, label: string, path: string, exportName: string, configTemplate: string, targetFeel: string): PixelPolishKitPreset {
  return {
    kitId,
    label,
    description: `${label} for TypeScript Phaser UI-heavy idle monster farm polish.`,
    bestForProjectTypes: monsterFarmTypes,
    suggestedConfigPath: path,
    configExportName: exportName,
    codeStyle: "typescript_module",
    configTemplate,
    targetFeel,
    acceptanceCriteria: [
      "The target visual state becomes easier to read without changing game rules.",
      "Config values drive visual-only timing, alpha, stroke, spacing, shake, or feedback changes.",
      "Save schema, farm slot unlocks, merge formulas, monster definitions, income, hatch odds/costs/cooldowns, upgrade costs, quest rewards, and ad logic are unchanged."
    ],
    antiPatterns: [
      "Do not change save schema.",
      "Do not change coin/income formulas.",
      "Do not change hatch odds, costs, or cooldowns.",
      "Do not change upgrade costs or quest rewards.",
      "Do not change ad/monetization behavior.",
      "Do not rewrite FarmScene.",
      "Do not convert UI framework."
    ],
    codexImplementationNotes: [
      "This is a TypeScript Phaser UI-heavy idle monster farm. Visual polish must not modify economy/save/progression/ads.",
      "Inspect FarmScene and the relevant view/state files first, but prefer view/config-level patches over scene rewrites.",
      "Preserve TypeScript module style.",
      "Report planned files before patching when approval is required."
    ],
    manualTuningAdvice: [
      "Tune visibility and hierarchy before adding more effects.",
      "Prefer view-level changes over FarmScene edits.",
      "Rollback visual values first if save/economy-adjacent files would be touched."
    ]
  };
}

export const pixelPolishKitPresets: PixelPolishKitPreset[] = [
  sortKit("sort_move_feedback", "Sort Move Feedback Kit", "src/config/sortMoveFeedbackConfig.js", "SORT_MOVE_FEEDBACK_CONFIG", `export const SORT_MOVE_FEEDBACK_CONFIG = {
  selectedLiftPx: 12,
  selectedScale: 1.06,
  moveDurationMs: 180,
  moveArcPx: 18,
  moveEase: "Cubic.easeOut",
  validMoveSparkleCount: 4,
  validMoveSparkleMs: 260,
  completedShelfGlowMs: 420,
  invalidShakePx: 7,
  invalidShakeMs: 130,
  inputLockDuringMove: true,
};
`, "Valid moves feel responsive and readable while source/target selection, invalid rejection, completed shelf feedback, and spirit identity remain clear."),
  sortKit("selected_shelf_readability", "Selected Shelf Readability Kit", "src/config/selectedShelfReadabilityConfig.js", "SELECTED_SHELF_READABILITY_CONFIG", jsConfig("SELECTED_SHELF_READABILITY_CONFIG", "outlineAlpha: 0.85,\n  liftPx: 10,\n  sourcePulseMs: 420,\n  targetHintAlpha: 0.35"), "Selected shelf, selected spirit lift, source/target clarity, and mobile readability improve without changing rules."),
  sortKit("invalid_move_feedback", "Invalid Move Feedback Kit", "src/config/invalidMoveFeedbackConfig.js", "INVALID_MOVE_FEEDBACK_CONFIG", jsConfig("INVALID_MOVE_FEEDBACK_CONFIG", "shakePx: 7,\n  shakeMs: 130,\n  rejectFlashAlpha: 0.22,\n  rejectSoundVolume: 0.45"), "Invalid moves are clearly rejected without changing SortRules or making invalid moves legal."),
  sortKit("completed_shelf_glow", "Completed Shelf Glow Kit", "src/config/completedShelfGlowConfig.js", "COMPLETED_SHELF_GLOW_CONFIG", jsConfig("COMPLETED_SHELF_GLOW_CONFIG", "glowMs: 420,\n  glowAlpha: 0.32,\n  sparkleCount: 5,\n  sparkleMs: 280"), "Completed shelves feel satisfying without hiding spirit pieces."),
  sortKit("win_celebration", "Win Celebration Kit", "src/config/winCelebrationConfig.js", "WIN_CELEBRATION_CONFIG", jsConfig("WIN_CELEBRATION_CONFIG", "bannerMs: 900,\n  sparkleCount: 12,\n  continuePulseMs: 700,\n  dimBoardAlpha: 0.18"), "Solved level celebration and continue/restart clarity improve without progression changes."),
  sortKit("spirit_identity_readability", "Spirit Identity Readability Kit", "src/config/spiritIdentityReadabilityConfig.js", "SPIRIT_IDENTITY_READABILITY_CONFIG", jsConfig("SPIRIT_IDENTITY_READABILITY_CONFIG", "selectedScale: 1.04,\n  idleBobPx: 2,\n  minContrast: \"high\",\n  motionBlurAvoidance: true"), "Spirit silhouettes, colors, and icons remain readable while selected or moving."),
  sortKit("puzzle_hud_readability", "Puzzle HUD Readability Kit", "src/config/puzzleHudReadabilityConfig.js", "PUZZLE_HUD_READABILITY_CONFIG", jsConfig("PUZZLE_HUD_READABILITY_CONFIG", "buttonMinSizePx: 42,\n  hudGapPx: 8,\n  labelStrokePx: 2,\n  disabledAlpha: 0.56"), "Level, moves, undo, hint, restart, mute, and level-select UI become clearer without a menu overhaul."),
  sortKit("mobile_sort_layout_readability", "Mobile Sort Layout Readability Kit", "src/config/mobileSortLayoutReadabilityConfig.js", "MOBILE_SORT_LAYOUT_READABILITY_CONFIG", jsConfig("MOBILE_SORT_LAYOUT_READABILITY_CONFIG", "minTapTargetPx: 44,\n  shelfGapPx: 8,\n  boardSafePaddingPx: 12,\n  hudReservedPx: 58"), "Shelf layout fit, tap target size, HUD overlap, and small-screen readability improve."),
  farmKit("monster_farm_slot_readability", "Monster Farm Slot Readability Kit", "src/config/monsterFarmSlotReadabilityConfig.ts", "MONSTER_FARM_SLOT_READABILITY_CONFIG", `export const MONSTER_FARM_SLOT_READABILITY_CONFIG = {
  slotStrokePx: 2,
  unlockedSlotAlpha: 1,
  lockedSlotAlpha: 0.56,
  occupiedSlotGlowAlpha: 0.18,
  dragHoverStrokePx: 3,
  mergeCandidatePulseMs: 520,
  invalidDropShakePx: 6,
  invalidDropShakeMs: 120,
  monsterNameMinContrast: "high",
  preserveHitboxDebug: false,
} as const;
`, "Empty, locked, occupied, selected, drag-hover, and merge-candidate slots are visually distinct without touching save, merge, or economy rules."),
  farmKit("hatch_feedback", "Hatch Feedback Kit", "src/config/hatchFeedbackConfig.ts", "HATCH_FEEDBACK_CONFIG", tsConfig("HATCH_FEEDBACK_CONFIG", "readyPulseMs: 520,\n  cooldownAlpha: 0.58,\n  hatchPopMs: 220,\n  panelGlowAlpha: 0.2"), "Hatch readiness, cooldown, success, and panel feedback become clearer without hatch odds/cost changes."),
  farmKit("merge_feedback", "Merge Feedback Kit", "src/config/mergeFeedbackConfig.ts", "MERGE_FEEDBACK_CONFIG", tsConfig("MERGE_FEEDBACK_CONFIG", "candidatePulseMs: 520,\n  successBurstCount: 8,\n  invalidShakePx: 6,\n  invalidShakeMs: 120"), "Merge candidates, merge success, and invalid merge feedback become clear without formula changes."),
  farmKit("tap_farm_feedback", "Tap Farm Feedback Kit", "src/config/tapFarmFeedbackConfig.ts", "TAP_FARM_FEEDBACK_CONFIG", tsConfig("TAP_FARM_FEEDBACK_CONFIG", "tapPopMs: 110,\n  energyFillPulseMs: 360,\n  rewardTextRisePx: 18,\n  cooldownAlpha: 0.55"), "TapFarmView click feedback, energy fill readability, reward feedback, and cooldown state improve without reward formula changes."),
  farmKit("coin_bug_feedback", "Coin Bug Feedback Kit", "src/config/coinBugFeedbackConfig.ts", "COIN_BUG_FEEDBACK_CONFIG", tsConfig("COIN_BUG_FEEDBACK_CONFIG", "visibilityPulseMs: 480,\n  pickupRadiusAlpha: 0.2,\n  rewardPopupMs: 520,\n  lifetimeWarnAlpha: 0.28"), "Coin bug visibility, pickup radius feedback, reward popup, and lifetime readability improve without spawn/reward changes."),
  farmKit("farm_hud_readability", "Farm HUD Readability Kit", "src/config/farmHudReadabilityConfig.ts", "FARM_HUD_READABILITY_CONFIG", tsConfig("FARM_HUD_READABILITY_CONFIG", "resourceFontSizePx: 16,\n  incomeFontSizePx: 13,\n  iconSizePx: 22,\n  warningPulseMs: 520"), "Coins, income, egg, slot, hatch, and quest resources become more readable without economy changes."),
  {
    ...farmKit("monster_identity_readability", "Monster Identity Readability Kit", "src/config/monsterIdentityReadabilityConfig.ts", "MONSTER_IDENTITY_READABILITY_CONFIG", tsConfig("MONSTER_IDENTITY_READABILITY_CONFIG", "nameMinContrast: \"high\",\n  rarityStrokePx: 2,\n  idleMotionScale: 0.8,\n  outlineAlpha: 0.88,\n  silhouetteContrastPriority: \"high\""), "Monster silhouette, art contrast, spacing, outline, and renderer clarity improve without adding metadata overlays or replacing assets unless explicitly requested."),
    acceptanceCriteria: [
      "Monster silhouettes, contrast, spacing, outline, or renderer clarity improve without changing game rules.",
      "No family initials, level badges, metadata chips, or extra labels are added to the main farm grid by default.",
      "Exact monster family/level metadata remains in compendium/detail UI unless explicitly requested.",
      "Save schema, farm slot unlocks, merge formulas, monster definitions, income, hatch odds/costs/cooldowns, upgrade costs, quest rewards, and ad logic are unchanged."
    ],
    antiPatterns: [
      "Do not add family initials to farm slots.",
      "Do not add level badges to farm slots.",
      "Do not add metadata chips to the main farm grid.",
      "Do not add extra farm-grid labels as the default identity fix.",
      "Do not change save schema, economy, hatch, merge, progression, ad, or quest reward logic."
    ],
    codexImplementationNotes: [
      "Trial feedback: on-farm level badges and family chips made the gameplay scene ugly/noisy.",
      "Exact monster metadata belongs in compendium/detail UI, not the main farm grid.",
      "Prefer silhouette/readability/art contrast/spacing/outline improvements in MonsterRenderer or visual config.",
      "If no safe silhouette/art improvement is obvious, recommend skipping this surface instead of adding UI metadata.",
      "Keep data/state/save/economy files inspect-only."
    ],
    manualTuningAdvice: [
      "Tune outline and contrast before adding effects.",
      "Reduce identity treatment if the farm grid becomes noisy.",
      "Skip this kit if the only improvement idea is labels, badges, or chips."
    ]
  },
  farmKit("panel_readability", "Panel Readability Kit", "src/config/panelReadabilityConfig.ts", "PANEL_READABILITY_CONFIG", tsConfig("PANEL_READABILITY_CONFIG", "panelPaddingPx: 10,\n  sectionGapPx: 8,\n  titleFontSizePx: 16,\n  buttonMinHeightPx: 36"), "Panel hierarchy, navigation menu, button states, and small-screen readability improve without rewriting UI systems."),
  farmKit("toast_reward_feedback", "Toast Reward Feedback Kit", "src/config/toastRewardFeedbackConfig.ts", "TOAST_REWARD_FEEDBACK_CONFIG", tsConfig("TOAST_REWARD_FEEDBACK_CONFIG", "toastMs: 850,\n  risePx: 16,\n  maxStack: 3,\n  rewardHighlightAlpha: 0.24"), "Toast and reward clarity improve without blocking core interactions."),
  farmKit("quest_widget_readability", "Quest Widget Readability Kit", "src/config/questWidgetReadabilityConfig.ts", "QUEST_WIDGET_READABILITY_CONFIG", tsConfig("QUEST_WIDGET_READABILITY_CONFIG", "progressPulseMs: 480,\n  claimReadyAlpha: 1,\n  blockedAlpha: 0.58,\n  compactFontSizePx: 13"), "Next quest widget clarity, quest progress status, and claim readability improve without quest reward changes."),
  farmKit("boss_battle_feedback", "Boss Battle Feedback Kit", "src/config/bossBattleFeedbackConfig.ts", "BOSS_BATTLE_FEEDBACK_CONFIG", tsConfig("BOSS_BATTLE_FEEDBACK_CONFIG", "skillReadyPulseMs: 480,\n  damageTextMs: 520,\n  cooldownAlpha: 0.55,\n  rewardBurstCount: 8"), "Boss skill feedback, cooldown/readiness, damage, and reward readability improve without boss stats or battle formulas changes."),
  {
    kitId: "cursor_attack_feedback",
    label: "Cursor Attack Feedback Kit",
    description: "Browser-global IIFE config for pointer/click attack feedback, hit/miss impacts, and cursor flashes.",
    bestForProjectTypes: ["cursor_attack_arena", "incremental_arena", "phaser_dom_hud", "hybrid"],
    suggestedConfigPath: "src/arena/data/cursorAttackFeedbackConfig.js",
    configExportName: "ARENA.CURSOR_ATTACK_FEEDBACK_CONFIG",
    codeStyle: "browser_global_iife",
    configTemplate: `(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.CURSOR_ATTACK_FEEDBACK_CONFIG = {
    cursorFlashMs: 90,
    cursorFlashSize: 16,
    hitParticleCount: 7,
    hitParticleDistance: 24,
    impactMs: 130,
    hitImpactScale: 1.08,
    missImpactScale: 0.72,
    missAlpha: 0.45,
    helperImpactScale: 0.72,
    maxActiveHitParticles: 48,
    hitTextMs: 420,
    hitTextRisePx: 22,
    reducedMotionImpactMs: 80
  };
})();
`,
    targetFeel: "Pointer/click attacks feel immediate, readable, and satisfying without adding player-avatar or projectile behavior.",
    acceptanceCriteria: [
      "Pointer/click feedback starts immediately after valid pointerdown.",
      "Hit vs miss feedback is visually distinct.",
      "Cursor flash is readable but does not cover nearby enemies.",
      "Hit particles are short and do not clutter the arena.",
      "Helper cursor feedback is smaller than manual click feedback.",
      "Reduced motion behavior remains respected if the project has it.",
      "Damage, enemy HP, rewards, wave logic, upgrade costs, save schema, and spawn rates are unchanged.",
      "Timing, size, count, alpha, and scale values come from config."
    ],
    antiPatterns: [
      "Do not add a visible player character.",
      "Do not add projectile behavior.",
      "Do not change click radius, click damage, reward, enemy health, spawn rate, economy, save data, or upgrade formulas.",
      "Do not hide enemies under particles.",
      "Do not rewrite the arena scene or UI framework."
    ],
    codexImplementationNotes: [
      "Inspect ArenaScene, CursorAttackSystem, ImpactEffectSystem, ArenaHud, UpgradePanel, arenaBalanceConfig, and arena.css first.",
      "Preserve window.ARENA browser-global IIFE style.",
      "Prefer wiring config through ARENA.CURSOR_ATTACK_FEEDBACK_CONFIG or ARENA.BALANCE_CONFIG.feedback."
    ],
    manualTuningAdvice: [
      "Reduce hitParticleCount if the arena becomes noisy.",
      "Keep cursorFlashMs short so enemies remain visible.",
      "Tune missAlpha separately from hit impact scale."
    ]
  },
  {
    kitId: "enemy_kill_feedback",
    label: "Enemy Kill Feedback Kit",
    description: "Browser-global IIFE config for kill burst, splatter, reward text, combo trigger clarity, and restrained screen flash.",
    bestForProjectTypes: ["cursor_attack_arena", "incremental_arena", "phaser_dom_hud", "hybrid"],
    suggestedConfigPath: "src/arena/data/enemyKillFeedbackConfig.js",
    configExportName: "ARENA.ENEMY_KILL_FEEDBACK_CONFIG",
    codeStyle: "browser_global_iife",
    configTemplate: `(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ENEMY_KILL_FEEDBACK_CONFIG = {
    killBurstCount: 12,
    killBurstDistance: 34,
    killBurstMs: 180,
    splatterCount: 5,
    splatterAlpha: 0.7,
    rewardTextMs: 620,
    rewardTextRisePx: 28,
    comboTriggerPulseMs: 180,
    screenFlashMs: 70,
    screenFlashAlpha: 0.14,
    maxActiveKillParticles: 56
  };
})();
`,
    targetFeel: "Enemy kills feel satisfying while nearby enemies, rewards, and combo state remain readable.",
    acceptanceCriteria: [
      "Kill feedback is satisfying but does not hide other enemies.",
      "Reward text is readable.",
      "Combo-related visuals remain readable.",
      "Energy reward, combo formula, enemy HP, and wave logic are unchanged.",
      "All burst, splatter, text, pulse, and flash values come from config."
    ],
    antiPatterns: ["Do not hide enemies under particles.", "Do not change rewards, enemy HP, wave logic, combo formula, or save data.", "Do not add projectiles or a player character."],
    codexImplementationNotes: ["Wire kill feedback through ImpactEffectSystem seams.", "Keep screen flash restrained.", "Preserve window.ARENA IIFE style."],
    manualTuningAdvice: ["Lower killBurstCount first if clutter appears.", "Keep screenFlashAlpha subtle."]
  },
  {
    kitId: "combo_feedback",
    label: "Combo Feedback Kit",
    description: "Browser-global IIFE config for combo popup timing, milestone visibility, pulse restraint, and safe placement.",
    bestForProjectTypes: ["cursor_attack_arena", "incremental_arena", "phaser_dom_hud", "hybrid"],
    suggestedConfigPath: "src/arena/data/comboFeedbackConfig.js",
    configExportName: "ARENA.COMBO_FEEDBACK_CONFIG",
    codeStyle: "browser_global_iife",
    configTemplate: `(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.COMBO_FEEDBACK_CONFIG = {
    popupMs: 720,
    milestonePopupMs: 980,
    pulseMs: 160,
    pulseScale: 1.08,
    safeTopPx: 56,
    safeSidePaddingPx: 18,
    maxPopupScale: 1.2,
    fadeOutMs: 180
  };
})();
`,
    targetFeel: "Combo feedback feels exciting without covering the cursor attack area too long.",
    acceptanceCriteria: [
      "Combo popup is visible and exciting.",
      "Combo popup does not cover core gameplay too long.",
      "Combo timing/formula is unchanged.",
      "Popup timing, placement, pulse, scale, and fade values come from config."
    ],
    antiPatterns: ["Do not change combo formula or timing.", "Do not cover enemies or cursor feedback for too long.", "Do not rewrite HUD bindings."],
    codexImplementationNotes: ["Inspect ImpactEffectSystem and ArenaHud combo paths.", "Keep DOM and Phaser combo cues consistent.", "Preserve window.ARENA IIFE style."],
    manualTuningAdvice: ["Shorten popupMs if combat is dense.", "Keep pulseScale small for readability."]
  },
  {
    kitId: "arena_hud_readability",
    label: "Arena HUD Readability Kit",
    description: "Browser-global IIFE config for Energy, Wave, Defeated, Combo, log, selector, mute/reset, and status grouping readability.",
    bestForProjectTypes: ["incremental_arena", "phaser_dom_hud", "hybrid"],
    suggestedConfigPath: "src/arena/data/arenaHudReadabilityConfig.js",
    configExportName: "ARENA.ARENA_HUD_READABILITY_CONFIG",
    codeStyle: "browser_global_iife",
    configTemplate: `(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ARENA_HUD_READABILITY_CONFIG = {
    statFontSizePx: 14,
    statLabelOpacity: 0.78,
    statValueFontSizePx: 18,
    comboHighlightMs: 420,
    logMaxVisibleRows: 4,
    logFadeMs: 220,
    selectorMinWidthPx: 132,
    controlButtonMinWidthPx: 64,
    statusGroupGapPx: 8
  };
})();
`,
    targetFeel: "Arena HUD values are readable during active play without changing DOM bindings.",
    acceptanceCriteria: [
      "HUD values are readable during active play.",
      "DOM IDs and data bindings remain unchanged.",
      "No economy or save values are changed.",
      "Font, gap, highlight, log, selector, and control sizing values come from config."
    ],
    antiPatterns: ["Do not rename DOM IDs.", "Do not change economy or save values.", "Do not rebuild the UI framework."],
    codexImplementationNotes: ["Inspect ArenaHud, UpgradePanel, arena.html, and arena.css.", "Respect arena-status, arenaSkinSelect, arenaMuteBtn, and arenaResetBtn bindings."],
    manualTuningAdvice: ["Raise statValueFontSizePx before increasing all HUD sizes.", "Keep logMaxVisibleRows low during active play."]
  },
  {
    kitId: "arena_upgrade_panel_readability",
    label: "Arena Upgrade Panel Readability Kit",
    description: "Browser-global IIFE config for upgrade card hierarchy, costs, levels, affordable states, selectors, and shop spacing.",
    bestForProjectTypes: ["incremental_arena", "phaser_dom_hud", "hybrid"],
    suggestedConfigPath: "src/arena/data/arenaUpgradePanelUiConfig.js",
    configExportName: "ARENA.ARENA_UPGRADE_PANEL_UI_CONFIG",
    codeStyle: "browser_global_iife",
    configTemplate: `(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ARENA_UPGRADE_PANEL_UI_CONFIG = {
    cardPaddingPx: 10,
    cardGapPx: 8,
    titleFontSizePx: 15,
    levelFontSizePx: 12,
    costFontSizePx: 14,
    affordablePulseMs: 680,
    unaffordableOpacity: 0.58,
    buttonMinHeightPx: 34,
    selectorGapPx: 8,
    shopSectionGapPx: 12
  };
})();
`,
    targetFeel: "Upgrade panel choices are easier to scan without changing formulas or save data.",
    acceptanceCriteria: [
      "Upgrade panel is easier to scan.",
      "Upgrade cost, level, and status are clearer.",
      "Upgrade formulas, cost formulas, save fields, and upgrade IDs are unchanged.",
      "Card, text, pulse, opacity, button, selector, and spacing values come from config."
    ],
    antiPatterns: ["Do not rename upgrade IDs.", "Do not change cost formulas.", "Do not rename save fields.", "Do not rebuild the UI framework."],
    codexImplementationNotes: ["Inspect UpgradePanel, arenaUpgrades, UpgradeSystem, arena.html, and arena.css.", "Keep data binding and IDs stable."],
    manualTuningAdvice: ["Tune unaffordableOpacity carefully so locked items remain readable.", "Use cardGapPx to improve scanability before adding new layout structure."]
  },
  {
    kitId: "arena_background_readability",
    label: "Arena Background Readability Kit",
    description: "Browser-global IIFE config for background skin/effect contrast, enemy silhouette priority, and click feedback readability.",
    bestForProjectTypes: ["cursor_attack_arena", "incremental_arena", "phaser_dom_hud", "hybrid"],
    suggestedConfigPath: "src/arena/data/arenaBackgroundReadabilityConfig.js",
    configExportName: "ARENA.ARENA_BACKGROUND_READABILITY_CONFIG",
    codeStyle: "browser_global_iife",
    configTemplate: `(function () {
  "use strict";

  window.ARENA = window.ARENA || {};

  ARENA.ARENA_BACKGROUND_READABILITY_CONFIG = {
    backgroundEffectAlpha: 0.45,
    enemyContrastPriority: "high",
    cursorFeedbackContrastPriority: "high",
    waterEffectAlpha: 0.36,
    sandEffectAlpha: 0.42,
    destructibleEffectAlpha: 0.5,
    maxBackgroundParticleCount: 28,
    backgroundMotionScale: 0.75
  };
})();
`,
    targetFeel: "Backgrounds remain interesting without fighting enemy silhouettes or cursor feedback.",
    acceptanceCriteria: [
      "Background remains interesting but does not reduce enemy/click effect readability.",
      "Background systems and asset paths are not renamed.",
      "No gameplay collision/spawn logic changes unless explicitly requested.",
      "Background alpha, contrast, particle, and motion values come from config."
    ],
    antiPatterns: ["Do not rename background asset paths.", "Do not change collision or spawn logic.", "Do not hide enemies or cursor feedback."],
    codexImplementationNotes: ["Inspect background and arena CSS/effect seams before editing.", "Keep enemy/cursor feedback readability higher priority than background flair."],
    manualTuningAdvice: ["Lower backgroundEffectAlpha first when enemies blend in.", "Reduce maxBackgroundParticleCount before changing enemy visuals."]
  },
  {
    kitId: "hit_feedback",
    label: "Hit Feedback Kit",
    description: "Config-driven hit pause, enemy flash, spark, knockback, and camera shake tuning.",
    bestForProjectTypes: actionTypes,
    suggestedConfigPath: "src/config/hitFeedbackConfig.ts",
    configExportName: "HIT_FEEDBACK_CONFIG",
    configTemplate: `export const HIT_FEEDBACK_CONFIG = {
  hitPauseMs: 35,
  enemyFlashMs: 80,
  flashColor: 0xffffff,
  sparkCount: 6,
  sparkLifetimeMs: 120,
  sparkSpeedMin: 45,
  sparkSpeedMax: 110,
  sparkScaleStart: 1,
  sparkScaleEnd: 0,
  knockbackPx: 6,
  cameraShakeMs: 70,
  cameraShakeIntensity: 0.004
} as const;
`,
    targetFeel: "Hits feel immediate, readable, and punchy without hiding combat state.",
    acceptanceCriteria: ["Hit feedback starts when damage is confirmed.", "All timing, scale, speed, alpha, and shake values come from the config.", "Damage, HP, hitboxes, drops, and economy are unchanged."],
    antiPatterns: actionAntiPatterns,
    codexImplementationNotes: ["Wire the config into existing hit feedback code instead of hardcoding values.", "Keep effects short and readable.", "Preserve hitbox fairness."],
    manualTuningAdvice: ["Raise hitPauseMs slightly for heavier hits.", "Lower sparkCount if combat gets noisy.", "Keep cameraShakeIntensity small for mobile screens."]
  },
  {
    kitId: "pickup_feedback",
    label: "Pickup Feedback Kit",
    description: "Config for magnet pull, collect pop, sparkle, and reward text feedback.",
    bestForProjectTypes: ["survivor_like", "arena_combat", "idle_economy", "clicker_incremental", "hybrid"],
    suggestedConfigPath: "src/config/pickupFeedbackConfig.ts",
    configExportName: "PICKUP_FEEDBACK_CONFIG",
    configTemplate: `export const PICKUP_FEEDBACK_CONFIG = {
  magnetRadiusPx: 72,
  magnetAcceleration: 900,
  collectPopMs: 140,
  collectScalePeak: 1.25,
  collectRisePx: 8,
  sparkleCount: 3,
  sparkleLifetimeMs: 160,
  rewardTextRisePx: 14,
  rewardTextLifetimeMs: 500
} as const;
`,
    targetFeel: "Pickups are satisfying and legible without changing rewards.",
    acceptanceCriteria: ["Pickup feedback clearly confirms collection.", "Reward amounts and drop logic are unchanged.", "All motion and lifetime values come from the config."],
    antiPatterns: actionAntiPatterns,
    codexImplementationNotes: ["Apply magnet or pop values only where equivalent systems already exist or are explicitly needed.", "Keep pickup feedback readable over the arena."],
    manualTuningAdvice: ["Increase collectPopMs for heavier rewards.", "Reduce rewardTextLifetimeMs if text stacks too much."]
  },
  {
    kitId: "projectile_readability",
    label: "Projectile Readability Kit",
    description: "Config for projectile minimum size, trails, outlines, danger colors, and alpha.",
    bestForProjectTypes: ["top_down_shooter", "arena_combat", "survivor_like", "moba_like", "hybrid"],
    suggestedConfigPath: "src/config/projectileReadabilityConfig.ts",
    configExportName: "PROJECTILE_READABILITY_CONFIG",
    configTemplate: `export const PROJECTILE_READABILITY_CONFIG = {
  minVisibleSizePx: 6,
  trailEnabled: true,
  trailLifetimeMs: 100,
  trailSpawnEveryMs: 35,
  outlineEnabled: true,
  dangerColor: 0xff4d4d,
  friendlyColor: 0x66ccff,
  enemyProjectileAlpha: 1,
  friendlyProjectileAlpha: 0.9
} as const;
`,
    targetFeel: "Projectiles are visible, directional, and readable during gameplay.",
    acceptanceCriteria: ["Enemy and friendly projectile cues are distinguishable.", "Projectile damage, speed, cooldown, spawn rate, and hitboxes are unchanged.", "Trail and outline values come from the config."],
    antiPatterns: actionAntiPatterns,
    codexImplementationNotes: ["Prefer pixel-style trails or outlines over soft gradients.", "Avoid effects that cover the player or projectile hitbox."],
    manualTuningAdvice: ["Raise minVisibleSizePx only if hitbox fairness remains clear.", "Shorten trailLifetimeMs in dense bullet patterns."]
  },
  {
    kitId: "control_feel",
    label: "Control Feel Kit",
    description: "Config for acceleration, deceleration, dash, buffer, and mobile joystick feel.",
    bestForProjectTypes: actionTypes,
    suggestedConfigPath: "src/config/controlFeelConfig.ts",
    configExportName: "CONTROL_FEEL_CONFIG",
    configTemplate: `export const CONTROL_FEEL_CONFIG = {
  acceleration: 1400,
  deceleration: 1800,
  maxSpeed: 220,
  turnResponsiveness: 0.85,
  inputBufferMs: 90,
  dashDurationMs: 120,
  dashCooldownMs: 650,
  dashSpeed: 420,
  mobileJoystickDeadZone: 0.15
} as const;
`,
    targetFeel: "Movement feels responsive while existing balance remains reviewable.",
    acceptanceCriteria: ["Input and movement tuning values come from the config.", "Collision, damage, enemy behavior, and save logic are unchanged.", "Keyboard and touch paths remain compatible if present."],
    antiPatterns: ["Do not rewrite the whole input system.", ...actionAntiPatterns],
    codexImplementationNotes: ["Wire the config at existing movement/control seams.", "List any gameplay-affecting values clearly for manual tuning."],
    manualTuningAdvice: ["Tune maxSpeed last.", "Use small dead-zone changes on mobile.", "Avoid dash changes unless dash already exists or is explicitly requested."]
  },
  {
    kitId: "hud_readability",
    label: "HUD Readability Kit",
    description: "Config for text sizes, stroke, panel spacing, icon sizes, bars, and warning pulse.",
    bestForProjectTypes: allTypes,
    suggestedConfigPath: "src/config/hudReadabilityConfig.ts",
    configExportName: "HUD_READABILITY_CONFIG",
    configTemplate: `export const HUD_READABILITY_CONFIG = {
  fontSizeSmall: 12,
  fontSizeNormal: 16,
  fontSizeLarge: 24,
  textStrokePx: 2,
  panelPaddingPx: 8,
  panelGapPx: 6,
  iconSizePx: 24,
  healthBarHeightPx: 8,
  cooldownBarHeightPx: 5,
  warningPulseMs: 450
} as const;
`,
    targetFeel: "HUD information is readable at gameplay speed without covering important play space.",
    acceptanceCriteria: ["HUD text and bars are readable on small screens.", "HUD values and gameplay state are unchanged.", "All sizes and pulse timing come from the config."],
    antiPatterns: ["Do not turn the game HUD into an app form.", ...actionAntiPatterns],
    codexImplementationNotes: ["Keep HUD changes scoped to existing HUD surfaces.", "Preserve gameplay visibility."],
    manualTuningAdvice: ["Raise textStrokePx before raising all font sizes.", "Keep warningPulseMs slow enough to avoid noise."]
  },
  {
    kitId: "camera_screen_feedback",
    label: "Camera Screen Feedback Kit",
    description: "Config for camera follow, shake, screen flash, and zoom punch.",
    bestForProjectTypes: actionTypes,
    suggestedConfigPath: "src/config/cameraFeedbackConfig.ts",
    configExportName: "CAMERA_FEEDBACK_CONFIG",
    configTemplate: `export const CAMERA_FEEDBACK_CONFIG = {
  followLerp: 0.12,
  maxShakeIntensity: 0.006,
  minorHitShakeMs: 60,
  heavyHitShakeMs: 120,
  screenFlashMs: 80,
  screenFlashAlpha: 0.18,
  zoomPunchScale: 1.015,
  zoomPunchMs: 90
} as const;
`,
    targetFeel: "Screen feedback reinforces important moments without harming readability.",
    acceptanceCriteria: ["Shake, flash, and zoom values come from the config.", "Camera bounds, hitboxes, damage, and player control are unchanged.", "Feedback remains short and optional at implementation seams."],
    antiPatterns: actionAntiPatterns,
    codexImplementationNotes: ["Apply only at existing camera/screen feedback seams when possible.", "Keep shake low and readable."],
    manualTuningAdvice: ["Use maxShakeIntensity below 0.01 for pixel-art readability.", "Shorten screenFlashMs if it hides danger."]
  },
  {
    kitId: "pixel_sprite_readability",
    label: "Pixel Sprite Readability Kit",
    description: "Config for scale consistency, outline, contrast priority, palette limits, and subpixel avoidance.",
    bestForProjectTypes: allTypes,
    suggestedConfigPath: "src/config/pixelSpriteReadabilityConfig.ts",
    configExportName: "PIXEL_SPRITE_READABILITY_CONFIG",
    configTemplate: `export const PIXEL_SPRITE_READABILITY_CONFIG = {
  requireConsistentScale: true,
  preferredScale: 3,
  outlinePx: 1,
  playerPriorityContrast: "high",
  enemyPriorityContrast: "medium",
  backgroundContrast: "low",
  maxPaletteColorsPerSprite: 16,
  avoidSubpixelPositioning: true
} as const;
`,
    targetFeel: "Important sprites and icons read clearly at the intended pixel scale.",
    acceptanceCriteria: ["Important sprite/icon readability improves without changing gameplay values.", "Scale and outline decisions are config-driven.", "Subpixel positioning risks are documented if retained."],
    antiPatterns: actionAntiPatterns,
    codexImplementationNotes: ["Use the config to guide existing sprite setup and documentation.", "Do not replace art assets unless explicitly requested."],
    manualTuningAdvice: ["Tune preferredScale per project resolution.", "Use outlinePx sparingly for dense scenes."]
  },
  {
    kitId: "idle_upgrade_screen",
    label: "Idle Upgrade Screen Kit",
    description: "Config for upgrade cards, padding, gaps, icon size, text size, disabled state, and buy buttons.",
    bestForProjectTypes: idleTypes,
    suggestedConfigPath: "src/config/idleUpgradeUiConfig.ts",
    configExportName: "IDLE_UPGRADE_UI_CONFIG",
    configTemplate: `export const IDLE_UPGRADE_UI_CONFIG = {
  cardWidthPx: 220,
  cardMinHeightPx: 88,
  cardPaddingPx: 10,
  cardGapPx: 8,
  iconSizePx: 32,
  costTextSizePx: 14,
  titleTextSizePx: 16,
  disabledAlpha: 0.55,
  affordablePulseMs: 700,
  buyButtonHeightPx: 34
} as const;
`,
    targetFeel: "Upgrade choices are scannable, comparable, and clearly affordable or locked.",
    acceptanceCriteria: ["Upgrade names, costs, effects, and availability are readable.", "Economy values, unlock rules, and save fields are unchanged.", "Layout and feedback values come from the config."],
    antiPatterns: idleAntiPatterns,
    codexImplementationNotes: ["Scope changes to the target upgrade screen or panel.", "Preserve data shape and economy math."],
    manualTuningAdvice: ["Tune cardMinHeightPx for longest localized labels.", "Use disabledAlpha to clarify locked states without hiding text."]
  },
  {
    kitId: "reward_popup",
    label: "Reward Popup Kit",
    description: "Config for reward popup lifetime, rise, scale, fade, sparkles, rare shake, and flash.",
    bestForProjectTypes: ["idle_economy", "clicker_incremental", "survivor_like", "arena_combat", "hybrid"],
    suggestedConfigPath: "src/config/rewardPopupConfig.ts",
    configExportName: "REWARD_POPUP_CONFIG",
    configTemplate: `export const REWARD_POPUP_CONFIG = {
  popupLifetimeMs: 900,
  risePx: 22,
  scaleStart: 0.85,
  scalePeak: 1.12,
  scaleEnd: 1,
  fadeOutMs: 220,
  sparkleCount: 5,
  rareShakeMs: 90,
  rareFlashAlpha: 0.22
} as const;
`,
    targetFeel: "Rewards are clear and satisfying without changing reward math.",
    acceptanceCriteria: ["Reward popup clearly shows what was gained.", "Reward amounts, economy, drops, and save fields are unchanged.", "Popup motion and rare feedback values come from the config."],
    antiPatterns: idleAntiPatterns,
    codexImplementationNotes: ["Keep popup stacking readable.", "Do not add new reward types or currencies."],
    manualTuningAdvice: ["Shorten popupLifetimeMs if rewards overlap.", "Lower sparkleCount for frequent rewards."]
  }
];

export function getPixelPolishKitPreset(id: string): PixelPolishKitPreset | undefined {
  return pixelPolishKitPresets.find((preset) => preset.kitId === id);
}
