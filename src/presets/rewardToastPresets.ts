import { RewardToastPreset, RewardToastStyleValues } from "../types/visualSurface";

export const rewardToastStyleBounds: Record<keyof Omit<RewardToastStyleValues, "toastFillColor" | "toastBorderColor">, { min: number; max: number; step: number }> = {
  durationMs: { min: 500, max: 2600, step: 50 },
  riseDistance: { min: 8, max: 120, step: 1 },
  startScale: { min: 0.5, max: 1.4, step: 0.01 },
  peakScale: { min: 0.8, max: 1.9, step: 0.01 },
  endScale: { min: 0.4, max: 1.3, step: 0.01 },
  bounceStrength: { min: 0, max: 1, step: 0.01 },
  fadeInMs: { min: 0, max: 500, step: 25 },
  fadeOutMs: { min: 100, max: 900, step: 25 },
  sparkleCount: { min: 0, max: 12, step: 1 },
  sparkleScale: { min: 0.4, max: 2, step: 0.01 },
  textSize: { min: 12, max: 36, step: 1 },
  iconScale: { min: 0.5, max: 2, step: 0.01 },
  toastFillOpacity: { min: 0, max: 1, step: 0.01 },
  toastBorderWidth: { min: 0, max: 6, step: 1 },
  cornerRadius: { min: 0, max: 28, step: 1 },
  shadowStrength: { min: 0, max: 1, step: 0.01 },
  glowStrength: { min: 0, max: 1, step: 0.01 }
};

export const defaultRewardToastStyle: RewardToastStyleValues = {
  durationMs: 1200,
  riseDistance: 48,
  startScale: 0.86,
  peakScale: 1.14,
  endScale: 0.94,
  bounceStrength: 0.32,
  fadeInMs: 120,
  fadeOutMs: 360,
  sparkleCount: 5,
  sparkleScale: 1,
  textSize: 20,
  iconScale: 1,
  toastFillColor: "#2e3a2f",
  toastFillOpacity: 0.88,
  toastBorderColor: "#f3c85b",
  toastBorderWidth: 2,
  cornerRadius: 12,
  shadowStrength: 0.36,
  glowStrength: 0.18
};

export const rewardToastPresets: RewardToastPreset[] = [
  {
    name: "Soft Pop",
    values: defaultRewardToastStyle
  },
  {
    name: "Juicy Bounce",
    values: {
      durationMs: 1350,
      riseDistance: 62,
      startScale: 0.72,
      peakScale: 1.34,
      endScale: 0.92,
      bounceStrength: 0.68,
      fadeInMs: 90,
      fadeOutMs: 380,
      sparkleCount: 6,
      sparkleScale: 1.08,
      textSize: 23,
      iconScale: 1.16,
      toastFillColor: "#263744",
      toastFillOpacity: 0.9,
      toastBorderColor: "#ffcf5c",
      toastBorderWidth: 3,
      cornerRadius: 14,
      shadowStrength: 0.48,
      glowStrength: 0.34
    }
  },
  {
    name: "Magic Sparkle",
    values: {
      durationMs: 1550,
      riseDistance: 74,
      startScale: 0.8,
      peakScale: 1.22,
      endScale: 0.9,
      bounceStrength: 0.4,
      fadeInMs: 140,
      fadeOutMs: 500,
      sparkleCount: 10,
      sparkleScale: 1.28,
      textSize: 21,
      iconScale: 1.08,
      toastFillColor: "#28304a",
      toastFillOpacity: 0.86,
      toastBorderColor: "#91e4ff",
      toastBorderWidth: 2,
      cornerRadius: 16,
      shadowStrength: 0.42,
      glowStrength: 0.54
    }
  },
  {
    name: "Clean Reward",
    values: {
      durationMs: 950,
      riseDistance: 36,
      startScale: 0.95,
      peakScale: 1.05,
      endScale: 0.96,
      bounceStrength: 0.12,
      fadeInMs: 80,
      fadeOutMs: 280,
      sparkleCount: 0,
      sparkleScale: 0.8,
      textSize: 18,
      iconScale: 0.92,
      toastFillColor: "#24313a",
      toastFillOpacity: 0.92,
      toastBorderColor: "#d8e6eb",
      toastBorderWidth: 1,
      cornerRadius: 8,
      shadowStrength: 0.2,
      glowStrength: 0.04
    }
  }
];
