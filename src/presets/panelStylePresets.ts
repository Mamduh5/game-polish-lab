import { PanelPreset, PanelStyleValues } from "../types/visualSurface";

export const panelStyleBounds: Record<keyof Omit<PanelStyleValues, "fillColor" | "borderColor" | "headerAccentColor" | "dividerColor">, { min: number; max: number; step: number }> = {
  fillOpacity: { min: 0.2, max: 1, step: 0.01 },
  borderWidth: { min: 0, max: 8, step: 1 },
  cornerRadius: { min: 0, max: 24, step: 1 },
  headerAccentHeight: { min: 0, max: 16, step: 1 },
  padding: { min: 6, max: 28, step: 1 },
  contentGap: { min: 2, max: 18, step: 1 },
  dividerOpacity: { min: 0, max: 1, step: 0.01 },
  dividerThickness: { min: 0, max: 5, step: 1 },
  shadowStrength: { min: 0, max: 1, step: 0.01 },
  glowStrength: { min: 0, max: 1, step: 0.01 },
  titleTextSize: { min: 12, max: 28, step: 1 },
  bodyTextSize: { min: 10, max: 20, step: 1 },
  disabledOpacity: { min: 0.2, max: 1, step: 0.01 }
};

export const defaultPanelStyle: PanelStyleValues = {
  fillColor: "#3a2a1f",
  fillOpacity: 0.9,
  borderColor: "#9f7140",
  borderWidth: 2,
  cornerRadius: 10,
  headerAccentColor: "#e6b35d",
  headerAccentHeight: 5,
  padding: 14,
  contentGap: 8,
  dividerColor: "#e8c27a",
  dividerOpacity: 0.28,
  dividerThickness: 1,
  shadowStrength: 0.32,
  glowStrength: 0.08,
  titleTextSize: 18,
  bodyTextSize: 13,
  disabledOpacity: 0.46
};

export const panelStylePresets: PanelPreset[] = [
  {
    name: "Cozy Card",
    values: defaultPanelStyle
  },
  {
    name: "Clean Mobile Panel",
    values: {
      fillColor: "#263238",
      fillOpacity: 0.92,
      borderColor: "#d7e2e8",
      borderWidth: 1,
      cornerRadius: 8,
      headerAccentColor: "#7fc6d8",
      headerAccentHeight: 4,
      padding: 12,
      contentGap: 7,
      dividerColor: "#ffffff",
      dividerOpacity: 0.18,
      dividerThickness: 1,
      shadowStrength: 0.18,
      glowStrength: 0.04,
      titleTextSize: 17,
      bodyTextSize: 13,
      disabledOpacity: 0.52
    }
  },
  {
    name: "Magic Frame",
    values: {
      fillColor: "#202844",
      fillOpacity: 0.88,
      borderColor: "#8bdcff",
      borderWidth: 2,
      cornerRadius: 14,
      headerAccentColor: "#d28cff",
      headerAccentHeight: 6,
      padding: 15,
      contentGap: 9,
      dividerColor: "#8bdcff",
      dividerOpacity: 0.34,
      dividerThickness: 1,
      shadowStrength: 0.28,
      glowStrength: 0.36,
      titleTextSize: 18,
      bodyTextSize: 13,
      disabledOpacity: 0.44
    }
  },
  {
    name: "Dark Arcade Panel",
    values: {
      fillColor: "#161a1f",
      fillOpacity: 0.95,
      borderColor: "#f4c84a",
      borderWidth: 3,
      cornerRadius: 3,
      headerAccentColor: "#ff5f6a",
      headerAccentHeight: 5,
      padding: 13,
      contentGap: 6,
      dividerColor: "#f4c84a",
      dividerOpacity: 0.32,
      dividerThickness: 2,
      shadowStrength: 0.48,
      glowStrength: 0.18,
      titleTextSize: 18,
      bodyTextSize: 12,
      disabledOpacity: 0.38
    }
  }
];
