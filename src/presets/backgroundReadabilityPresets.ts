import { BackgroundReadabilityPreset, BackgroundReadabilityStyleValues } from "../types/visualSurface";

export const backgroundReadabilityStyleBounds: Record<keyof Omit<BackgroundReadabilityStyleValues, "backgroundColor" | "contrastOverlayColor">, { min: number; max: number; step: number }> = {
  backgroundImageOpacity: { min: 0, max: 1, step: 0.01 },
  contrastOverlayOpacity: { min: 0, max: 1, step: 0.01 },
  vignetteStrength: { min: 0, max: 1, step: 0.01 },
  patternOpacity: { min: 0, max: 1, step: 0.01 },
  blurAmount: { min: 0, max: 8, step: 0.1 },
  brightness: { min: 0.6, max: 1.4, step: 0.01 },
  contrast: { min: 0.7, max: 1.5, step: 0.01 }
};

export const defaultBackgroundReadabilityStyle: BackgroundReadabilityStyleValues = {
  backgroundColor: "#6f9f5f",
  backgroundImageOpacity: 0.78,
  contrastOverlayColor: "#17351f",
  contrastOverlayOpacity: 0.18,
  vignetteStrength: 0.24,
  patternOpacity: 0.18,
  blurAmount: 0,
  brightness: 1,
  contrast: 1
};

export const backgroundReadabilityPresets: BackgroundReadabilityPreset[] = [
  {
    name: "Soft Farm Morning",
    values: defaultBackgroundReadabilityStyle
  },
  {
    name: "Cozy Dusk",
    values: {
      backgroundColor: "#80684f",
      backgroundImageOpacity: 0.66,
      contrastOverlayColor: "#2f1f24",
      contrastOverlayOpacity: 0.28,
      vignetteStrength: 0.36,
      patternOpacity: 0.13,
      blurAmount: 0.4,
      brightness: 0.94,
      contrast: 1.08
    }
  },
  {
    name: "Clean Contrast",
    values: {
      backgroundColor: "#5f7f79",
      backgroundImageOpacity: 0.52,
      contrastOverlayColor: "#10262b",
      contrastOverlayOpacity: 0.34,
      vignetteStrength: 0.18,
      patternOpacity: 0.08,
      blurAmount: 0.8,
      brightness: 0.98,
      contrast: 1.18
    }
  },
  {
    name: "Dark Readable",
    values: {
      backgroundColor: "#253629",
      backgroundImageOpacity: 0.42,
      contrastOverlayColor: "#050807",
      contrastOverlayOpacity: 0.48,
      vignetteStrength: 0.52,
      patternOpacity: 0.1,
      blurAmount: 1.2,
      brightness: 0.84,
      contrast: 1.26
    }
  }
];
