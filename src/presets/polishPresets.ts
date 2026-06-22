import { ProjectType } from "../types/profile";
import { PolishPreset } from "../types/polishTask";

const commonAllowedFiles = ["src", "assets", "public"];
const renderAllowedFiles = ["src", "public", "index.html"];
const commonMustNotTouch = ["src/save", "src/economy", "src/auth", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
const pixelAntiPatterns = [
  "Do not use long smooth gradient effects for pixel-art VFX.",
  "Do not hide gameplay under excessive particles.",
  "Do not change damage, HP, economy, or progression unless explicitly listed.",
  "Do not redesign unrelated screens."
];
const idleAntiPatterns = [
  "Do not rebuild the entire UI framework.",
  "Do not change economy values.",
  "Do not rename save fields.",
  "Do not add new currencies unless explicitly requested."
];
const baseDone = [
  "The polish change is small, measurable, and reversible.",
  "Changed files stay within allowed files.",
  "Must-not-touch files are not modified.",
  "Tunable values are listed in the final response."
];
const actionTypes: ProjectType[] = ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "mobile_action", "hybrid"];
const idleTypes: ProjectType[] = ["idle_economy", "clicker_incremental", "hybrid"];
const allTypes: ProjectType[] = ["unknown", ...actionTypes, ...idleTypes];

function preset(value: PolishPreset): PolishPreset {
  return value;
}

export const polishPresets: PolishPreset[] = [
  preset({
    id: "hit_feedback",
    label: "Hit Feedback",
    description: "Make damage moments readable and punchy without changing combat math.",
    bestForProjectTypes: actionTypes,
    defaultArea: "combat_vfx",
    defaultTargetFeel: "Immediate, crisp, pixel-style impact feedback that makes successful hits unmistakable.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: [
      "Damage feedback starts immediately when damage is applied.",
      "Enemy flashes for 60-90ms.",
      "Hit spark lasts 90-140ms.",
      "VFX uses pixel-style square, diamond, or short-line particles, not smooth gradient blobs.",
      "Camera shake is small and configurable.",
      "Damage values, enemy HP, player movement, economy, save logic, and item drops are not changed."
    ],
    tunableValues: { enemyFlashMs: "60-90", hitSparkMs: "90-140", cameraShakeMs: "60-100", cameraShakeIntensity: "small" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "pickup_feedback",
    label: "Pickup Feedback",
    description: "Improve item pickup readability and reward feel without changing rewards.",
    bestForProjectTypes: ["survivor_like", "arena_combat", "idle_economy", "clicker_incremental", "hybrid"],
    defaultArea: "pickup_vfx",
    defaultTargetFeel: "Fast, readable pickup confirmation with clear travel, pop, and sound hook points.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: [
      "Pickup feedback starts immediately when the pickup is collected.",
      "Feedback clearly identifies what was collected.",
      "Motion uses short pixel-style arcs, pops, or bursts.",
      "Reward amounts, drop rates, inventory, economy, and save logic are not changed.",
      "Timing, offset, and intensity values are configurable."
    ],
    tunableValues: { popMs: "80-140", floatDistancePx: 12, burstParticleCount: "4-8" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "projectile_readability",
    label: "Projectile Readability",
    description: "Make projectiles easier to track while preserving gameplay behavior.",
    bestForProjectTypes: ["top_down_shooter", "arena_combat", "survivor_like", "moba_like", "hybrid"],
    defaultArea: "combat_readability",
    defaultTargetFeel: "Projectiles are visible, directionally clear, and readable over backgrounds.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: [
      "Projectile silhouettes are readable against common backgrounds.",
      "Projectile direction remains clear during movement.",
      "Optional trails or flickers use pixel-style shapes.",
      "Projectile speed, damage, collision size, cooldowns, and spawn rates are not changed.",
      "Visual width, trail duration, and flash cadence are configurable."
    ],
    tunableValues: { trailMs: "70-130", outlinePixels: 1, flashCadenceMs: "90-160" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "hud_readability",
    label: "HUD Readability",
    description: "Improve HUD contrast, sizing, spacing, and scanability.",
    bestForProjectTypes: allTypes,
    defaultArea: "ui_hud",
    defaultTargetFeel: "Compact HUD information that is readable at gameplay speed and does not cover key action.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: [
      "Critical values are readable during normal gameplay.",
      "HUD spacing prevents text or icon overlap on small viewports.",
      "Important values use clear contrast and stable alignment.",
      "Game balance, economy, save logic, combat values, and routing are not changed.",
      "Font size, padding, contrast, and anchor values are configurable."
    ],
    tunableValues: { minFontPx: 12, hudPaddingPx: 8, contrastTarget: "high" },
    antiPatterns: ["Do not turn the game HUD into an app form.", ...pixelAntiPatterns],
    definitionOfDone: baseDone
  }),
  preset({
    id: "pixel_art_setup",
    label: "Pixel Art Setup",
    description: "Harden Phaser and CSS rendering settings for crisp pixel art.",
    bestForProjectTypes: allTypes,
    defaultArea: "rendering_setup",
    defaultTargetFeel: "Crisp, stable pixel rendering with no blur or shimmer from scaling.",
    suggestedAllowedFiles: renderAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: [
      "Phaser pixel-art rendering flags are set where the project config supports them.",
      "Canvas CSS uses pixelated or crisp image rendering rules.",
      "Decimal scaling choices are inspected before editing and documented if retained.",
      "Gameplay values, save logic, economy, auth, and content data are not changed."
    ],
    tunableValues: { pixelArt: true, roundPixels: true, antialias: false, antialiasGL: false },
    antiPatterns: ["Do not change gameplay scene scale semantics without documenting why.", ...pixelAntiPatterns],
    definitionOfDone: baseDone
  }),
  preset({
    id: "enemy_death_feedback",
    label: "Enemy Death Feedback",
    description: "Make enemy defeat moments readable without changing drops or HP.",
    bestForProjectTypes: actionTypes,
    defaultArea: "combat_vfx",
    defaultTargetFeel: "A short, readable pixel burst and disappear cue that confirms enemy defeat.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Death feedback starts on confirmed death.", "Effect lasts under 250ms.", "Drops, XP, HP, and spawn rules are unchanged.", "Effect intensity is configurable."],
    tunableValues: { deathFlashMs: "80-140", burstParticleCount: "6-12", fadeMs: "100-180" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "player_damage_feedback",
    label: "Player Damage Feedback",
    description: "Clarify when the player takes damage without changing invulnerability or health math.",
    bestForProjectTypes: actionTypes,
    defaultArea: "player_feedback",
    defaultTargetFeel: "Brief, unmistakable damage feedback that does not obscure control.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Damage feedback starts immediately.", "Player remains visible during feedback.", "Health, invulnerability, collision, and damage values are unchanged.", "Flash and shake values are configurable."],
    tunableValues: { playerFlashMs: "80-140", screenTintMs: "60-100", shakeIntensity: "small" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "camera_screen_feedback",
    label: "Camera Screen Feedback",
    description: "Add small camera or screen feedback for key moments without changing gameplay.",
    bestForProjectTypes: actionTypes,
    defaultArea: "screen_feedback",
    defaultTargetFeel: "Subtle readable shake, hit-stop, or tint that supports impact without hiding play.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Feedback is brief and configurable.", "Player, enemy, and projectile readability are preserved.", "No camera bounds or gameplay physics are changed.", "Motion is disabled or reduced if the project already has a setting for it."],
    tunableValues: { shakeMs: "60-120", shakeIntensity: "0.002-0.008", hitStopMs: "0-50" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "control_feel",
    label: "Control Feel",
    description: "Improve input feedback and perceived responsiveness without changing core movement balance.",
    bestForProjectTypes: ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "mobile_action", "hybrid"],
    defaultArea: "controls",
    defaultTargetFeel: "Inputs feel responsive and readable while movement values remain stable.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Input state is visually clear.", "No movement speed, cooldown, or collision balance changes are made.", "Touch/joystick and keyboard paths remain compatible.", "Feedback timing is configurable."],
    tunableValues: { inputBufferMs: "0-80", joystickDeadzoneVisual: "small", pressFeedbackMs: "60-120" },
    antiPatterns: ["Do not rewrite the input system.", ...pixelAntiPatterns],
    definitionOfDone: baseDone
  }),
  preset({
    id: "pixel_sprite_readability",
    label: "Pixel Sprite Readability",
    description: "Improve sprite silhouette, scale consistency, and contrast readability.",
    bestForProjectTypes: allTypes,
    defaultArea: "sprite_readability",
    defaultTargetFeel: "Important sprites/icons are readable at gameplay scale and consistent with pixel-art constraints.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Critical sprite/icon silhouettes are easier to distinguish.", "Scaling choices are documented.", "No gameplay stats or economy values are changed.", "Any outline or tint values are configurable."],
    tunableValues: { outlinePixels: 1, contrastBoost: "small", scaleSnap: true },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "danger_telegraph",
    label: "Danger Telegraph",
    description: "Make incoming danger readable before it hits without changing attack rules.",
    bestForProjectTypes: actionTypes,
    defaultArea: "combat_readability",
    defaultTargetFeel: "Short, clear warning cues that help players parse danger in time.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Telegraph appears before the existing danger event.", "Telegraph does not change damage, timing, cooldown, or hitboxes.", "Cue remains readable over common backgrounds.", "Duration and color are configurable."],
    tunableValues: { telegraphMs: "180-450", pulseCount: "1-3", alpha: "0.35-0.75" },
    antiPatterns: pixelAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "idle_upgrade_screen",
    label: "Idle Upgrade Screen",
    description: "Improve upgrade readability and hierarchy in menu-heavy idle screens.",
    bestForProjectTypes: idleTypes,
    defaultArea: "idle_menu_ui",
    defaultTargetFeel: "Upgrade choices are scannable, comparable, and clearly affordable or locked.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Upgrade names, costs, owned state, and effect summaries are readable.", "Affordability and locked states are visually distinct.", "Economy values, save fields, and unlock rules are unchanged.", "Spacing and feedback values are configurable."],
    tunableValues: { rowHeightPx: 44, disabledAlpha: 0.55, affordPulseMs: "120-220" },
    antiPatterns: idleAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "reward_popup",
    label: "Reward Popup",
    description: "Make rewards feel clear and satisfying without changing reward math.",
    bestForProjectTypes: ["idle_economy", "clicker_incremental", "survivor_like", "arena_combat", "hybrid"],
    defaultArea: "reward_feedback",
    defaultTargetFeel: "Rewards appear briefly, clearly, and consistently without blocking play.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Reward popup clearly shows what was gained.", "Popup duration is short and configurable.", "Reward amounts and economy logic are unchanged.", "Multiple rewards do not overlap unreadably."],
    tunableValues: { popupMs: "900-1400", riseDistancePx: 18, maxStackedPopups: 3 },
    antiPatterns: idleAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "economy_hud",
    label: "Economy HUD",
    description: "Improve resource HUD clarity for idle and incremental games.",
    bestForProjectTypes: idleTypes,
    defaultArea: "economy_hud",
    defaultTargetFeel: "Resources, rates, and affordability are clear at a glance.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Primary resources and rates are readable.", "Important changes are visually acknowledged.", "Economy math, save fields, and currency names are unchanged.", "Number formatting and spacing choices are configurable."],
    tunableValues: { minFontPx: 12, resourceFlashMs: "120-220", compactNumberFormat: true },
    antiPatterns: idleAntiPatterns,
    definitionOfDone: baseDone
  }),
  preset({
    id: "menu_button_feedback",
    label: "Menu Button Feedback",
    description: "Improve tactile feedback for game menu buttons and cards without app-style redesign.",
    bestForProjectTypes: idleTypes,
    defaultArea: "menu_feedback",
    defaultTargetFeel: "Buttons/cards feel responsive, game-like, and readable.",
    suggestedAllowedFiles: commonAllowedFiles,
    suggestedMustNotTouchFiles: commonMustNotTouch,
    acceptanceCriteria: ["Press, hover, disabled, and success states are visually distinct where relevant.", "Button/card labels remain readable.", "No economy values, save fields, or routing are changed.", "Feedback timing and scale are configurable."],
    tunableValues: { pressScale: 0.98, feedbackMs: "80-140", disabledAlpha: 0.5 },
    antiPatterns: idleAntiPatterns,
    definitionOfDone: baseDone
  })
];

export function getPresetById(id: string): PolishPreset | undefined {
  return polishPresets.find((preset) => preset.id === id);
}

export function getPresetsForProjectType(projectType: ProjectType): PolishPreset[] {
  return polishPresets.filter((preset) => preset.bestForProjectTypes.includes(projectType) || preset.bestForProjectTypes.includes("unknown"));
}
