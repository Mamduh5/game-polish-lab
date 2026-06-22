import { PolishPreset } from "../types/polishTask";

export const polishPresets: PolishPreset[] = [
  {
    id: "hit_feedback",
    label: "Hit Feedback",
    description: "Make damage moments readable and punchy without changing combat math.",
    defaultArea: "combat_vfx",
    defaultTargetFeel: "Immediate, crisp, pixel-style impact feedback that makes successful hits unmistakable.",
    suggestedAllowedFiles: [
      "src",
      "assets",
      "public"
    ],
    suggestedMustNotTouchFiles: [
      "src/save",
      "src/economy",
      "src/auth",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock"
    ],
    acceptanceCriteria: [
      "Damage feedback starts immediately when damage is applied.",
      "Enemy flashes for 60-90ms.",
      "Hit spark lasts 90-140ms.",
      "VFX uses pixel-style square, diamond, or short-line particles, not smooth gradient blobs.",
      "Camera shake is small and configurable.",
      "Damage values, enemy HP, player movement, economy, save logic, and item drops are not changed.",
      "All timing/intensity values are configurable."
    ],
    tunableValues: {
      enemyFlashMs: "60-90",
      hitSparkMs: "90-140",
      cameraShakeMs: "60-100",
      cameraShakeIntensity: "small"
    }
  },
  {
    id: "pickup_feedback",
    label: "Pickup Feedback",
    description: "Improve item pickup readability and reward feel without changing rewards.",
    defaultArea: "pickup_vfx",
    defaultTargetFeel: "Fast, readable pickup confirmation with clear travel, pop, and sound hook points.",
    suggestedAllowedFiles: [
      "src",
      "assets",
      "public"
    ],
    suggestedMustNotTouchFiles: [
      "src/save",
      "src/economy",
      "src/auth",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock"
    ],
    acceptanceCriteria: [
      "Pickup feedback starts immediately when the pickup is collected.",
      "Feedback clearly identifies what was collected.",
      "Motion uses short pixel-style arcs, pops, or bursts.",
      "Reward amounts, drop rates, inventory, economy, and save logic are not changed.",
      "Timing, offset, and intensity values are configurable."
    ],
    tunableValues: {
      popMs: "80-140",
      floatDistancePx: 12,
      burstParticleCount: "4-8"
    }
  },
  {
    id: "projectile_readability",
    label: "Projectile Readability",
    description: "Make projectiles easier to track while preserving gameplay behavior.",
    defaultArea: "combat_readability",
    defaultTargetFeel: "Projectiles are visible, directionally clear, and readable over backgrounds.",
    suggestedAllowedFiles: [
      "src",
      "assets",
      "public"
    ],
    suggestedMustNotTouchFiles: [
      "src/save",
      "src/economy",
      "src/auth",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock"
    ],
    acceptanceCriteria: [
      "Projectile silhouettes are readable against common backgrounds.",
      "Projectile direction remains clear during movement.",
      "Optional trails or flickers use pixel-style shapes.",
      "Projectile speed, damage, collision size, cooldowns, and spawn rates are not changed.",
      "Visual width, trail duration, and flash cadence are configurable."
    ],
    tunableValues: {
      trailMs: "70-130",
      outlinePixels: 1,
      flashCadenceMs: "90-160"
    }
  },
  {
    id: "hud_readability",
    label: "HUD Readability",
    description: "Improve HUD contrast, sizing, spacing, and scanability.",
    defaultArea: "ui_hud",
    defaultTargetFeel: "Compact HUD information that is readable at gameplay speed and does not cover key action.",
    suggestedAllowedFiles: [
      "src",
      "assets",
      "public"
    ],
    suggestedMustNotTouchFiles: [
      "src/save",
      "src/economy",
      "src/auth",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock"
    ],
    acceptanceCriteria: [
      "Critical values are readable during normal gameplay.",
      "HUD spacing prevents text or icon overlap on small viewports.",
      "Important values use clear contrast and stable alignment.",
      "Game balance, economy, save logic, combat values, and routing are not changed.",
      "Font size, padding, contrast, and anchor values are configurable."
    ],
    tunableValues: {
      minFontPx: 12,
      hudPaddingPx: 8,
      contrastTarget: "high"
    }
  },
  {
    id: "pixel_art_setup",
    label: "Pixel Art Setup",
    description: "Harden Phaser and CSS rendering settings for crisp pixel art.",
    defaultArea: "rendering_setup",
    defaultTargetFeel: "Crisp, stable pixel rendering with no blur or shimmer from scaling.",
    suggestedAllowedFiles: [
      "src",
      "public",
      "index.html"
    ],
    suggestedMustNotTouchFiles: [
      "src/save",
      "src/economy",
      "src/auth",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock"
    ],
    acceptanceCriteria: [
      "Phaser pixel-art rendering flags are set where the project config supports them.",
      "Canvas CSS uses pixelated or crisp image rendering rules.",
      "Decimal scaling choices are inspected before editing and documented if retained.",
      "Gameplay values, save logic, economy, auth, and content data are not changed.",
      "All changed rendering constants are listed at the end."
    ],
    tunableValues: {
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      antialiasGL: false
    }
  }
];

export function getPresetById(id: string): PolishPreset | undefined {
  return polishPresets.find((preset) => preset.id === id);
}
