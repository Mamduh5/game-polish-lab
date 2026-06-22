import { ProjectType } from "../types/profile";
import { PixelPolishKitPreset } from "../types/pixelPolishKit";

const actionTypes: ProjectType[] = ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "mobile_action", "hybrid"];
const idleTypes: ProjectType[] = ["idle_economy", "clicker_incremental", "hybrid"];
const allTypes: ProjectType[] = ["unknown", ...actionTypes, ...idleTypes];

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

export const pixelPolishKitPresets: PixelPolishKitPreset[] = [
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
