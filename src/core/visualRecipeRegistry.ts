import { backgroundReadabilityPresets, backgroundReadabilityStyleBounds, defaultBackgroundReadabilityStyle } from "../presets/backgroundReadabilityPresets";
import { buttonStyleBounds, buttonStylePresets, defaultButtonStyle } from "../presets/buttonStylePresets";
import { defaultPanelStyle, panelStyleBounds, panelStylePresets } from "../presets/panelStylePresets";
import { defaultRewardToastStyle, rewardToastPresets, rewardToastStyleBounds } from "../presets/rewardToastPresets";
import { defaultSlotCardStyle, slotCardPresets, slotCardStyleBounds } from "../presets/slotCardPresets";
import { VisualSurfaceType } from "../types/visualSurface";
import {
  VisualRecipeAdapterMapping,
  VisualStyleToken,
  VisualStyleTokenCategory,
  VisualSurfaceRecipe,
  visualRecipeSchemaVersion
} from "../types/visualRecipe";
import {
  backgroundReadabilityStyleConfigRelativePath,
  buttonStyleConfigRelativePath,
  farmSlotStyleConfigRelativePath,
  panelStyleConfigRelativePath,
  rewardToastStyleConfigRelativePath
} from "./visualSurfaceConfig";

export interface VisualRecipeValidationResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}

const updatedAt = "2026-06-25T00:00:00.000Z";

const genericStyleConfigPaths: Record<Exclude<VisualSurfaceType, "asset_replacement">, string> = {
  slot_card: ".game-polish-lab/styles/generic-slot-card-style.json",
  background_readability: ".game-polish-lab/styles/generic-background-readability-style.json",
  panel: ".game-polish-lab/styles/generic-panel-style.json",
  reward_toast: ".game-polish-lab/styles/generic-reward-toast-style.json",
  button: ".game-polish-lab/styles/generic-button-style.json"
};

const genericStyleModulePaths: Record<Exclude<VisualSurfaceType, "asset_replacement">, string> = {
  slot_card: "src/config/gamePolishLab/genericSlotCardStyle.ts",
  background_readability: "src/config/gamePolishLab/genericBackgroundReadabilityStyle.ts",
  panel: "src/config/gamePolishLab/genericPanelStyle.ts",
  reward_toast: "src/config/gamePolishLab/genericRewardToastStyle.ts",
  button: "src/config/gamePolishLab/genericButtonStyle.ts"
};

const tokenLabels: Record<string, string> = {
  slotWidth: "Slot width",
  slotHeight: "Slot height",
  gap: "Gap",
  borderWidth: "Border width",
  cornerRadius: "Corner radius",
  fillColor: "Fill color",
  borderColor: "Border color",
  selectedGlowStrength: "Selected glow strength",
  lockedOverlayOpacity: "Locked overlay opacity",
  emptySlotOpacity: "Empty slot opacity",
  mergeCandidatePulseScale: "Merge candidate pulse scale",
  monsterDisplayScale: "Monster display scale",
  monsterVerticalOffset: "Monster vertical offset",
  backgroundColor: "Background color",
  backgroundImageOpacity: "Image opacity",
  contrastOverlayColor: "Contrast overlay color",
  contrastOverlayOpacity: "Contrast overlay opacity",
  vignetteStrength: "Vignette strength",
  patternOpacity: "Pattern opacity",
  blurAmount: "Blur amount",
  brightness: "Brightness",
  contrast: "Contrast",
  fillOpacity: "Fill opacity",
  headerAccentColor: "Header accent color",
  headerAccentHeight: "Header accent thickness",
  padding: "Padding",
  contentGap: "Content gap",
  dividerColor: "Divider color",
  dividerOpacity: "Divider opacity",
  dividerThickness: "Divider thickness",
  shadowStrength: "Shadow strength",
  glowStrength: "Glow strength",
  titleTextSize: "Title text size",
  bodyTextSize: "Body text size",
  disabledOpacity: "Disabled opacity",
  durationMs: "Duration",
  riseDistance: "Rise distance",
  startScale: "Start scale",
  peakScale: "Peak scale",
  endScale: "End scale",
  bounceStrength: "Bounce strength",
  fadeInMs: "Fade in",
  fadeOutMs: "Fade out",
  sparkleCount: "Sparkle count",
  sparkleScale: "Sparkle scale",
  textSize: "Text size",
  iconScale: "Icon scale",
  toastFillColor: "Toast fill",
  toastFillOpacity: "Toast fill opacity",
  toastBorderColor: "Toast border",
  toastBorderWidth: "Toast border width",
  width: "Width",
  height: "Height",
  labelColor: "Label color",
  labelTextSize: "Label text size",
  labelScale: "Label scale",
  paddingX: "Padding X",
  paddingY: "Padding Y",
  hoverGlowStrength: "Hover glow strength",
  hoverLift: "Hover lift",
  activePressScale: "Active press scale",
  activePressDurationMs: "Active press duration",
  activeDarkenOpacity: "Active darken opacity",
  disabledSaturation: "Disabled saturation"
};

const categoryByToken: Record<string, VisualStyleTokenCategory> = {
  fillColor: "color",
  borderColor: "color",
  backgroundColor: "color",
  contrastOverlayColor: "color",
  headerAccentColor: "color",
  dividerColor: "color",
  toastFillColor: "color",
  toastBorderColor: "color",
  labelColor: "color",
  labelTextSize: "typography",
  titleTextSize: "typography",
  bodyTextSize: "typography",
  textSize: "typography",
  durationMs: "animation",
  fadeInMs: "animation",
  fadeOutMs: "animation",
  activePressDurationMs: "animation",
  riseDistance: "animation",
  startScale: "animation",
  peakScale: "animation",
  endScale: "animation",
  bounceStrength: "animation",
  activePressScale: "animation",
  activeDarkenOpacity: "state",
  disabledOpacity: "state",
  disabledSaturation: "state",
  lockedOverlayOpacity: "state",
  emptySlotOpacity: "state",
  selectedGlowStrength: "effect",
  shadowStrength: "effect",
  glowStrength: "effect",
  hoverGlowStrength: "effect",
  hoverLift: "state",
  sparkleCount: "effect",
  sparkleScale: "effect",
  iconScale: "layout",
  labelScale: "typography"
};

const unitByToken: Record<string, VisualStyleToken["unit"]> = {
  slotWidth: "px",
  slotHeight: "px",
  gap: "px",
  borderWidth: "px",
  cornerRadius: "px",
  monsterVerticalOffset: "px",
  blurAmount: "px",
  headerAccentHeight: "px",
  padding: "px",
  contentGap: "px",
  dividerThickness: "px",
  titleTextSize: "px",
  bodyTextSize: "px",
  durationMs: "ms",
  fadeInMs: "ms",
  fadeOutMs: "ms",
  riseDistance: "px",
  textSize: "px",
  toastBorderWidth: "px",
  width: "px",
  height: "px",
  labelTextSize: "px",
  paddingX: "px",
  paddingY: "px",
  hoverLift: "px",
  activePressDurationMs: "ms",
  fillOpacity: "opacity",
  backgroundImageOpacity: "opacity",
  contrastOverlayOpacity: "opacity",
  vignetteStrength: "opacity",
  patternOpacity: "opacity",
  dividerOpacity: "opacity",
  disabledOpacity: "opacity",
  toastFillOpacity: "opacity",
  activeDarkenOpacity: "opacity",
  startScale: "scale",
  peakScale: "scale",
  endScale: "scale",
  sparkleScale: "scale",
  iconScale: "scale",
  labelScale: "scale",
  monsterDisplayScale: "scale",
  mergeCandidatePulseScale: "scale",
  activePressScale: "scale"
};

export const assetReplacementRecipeNote = "asset_replacement remains an asset replacement model because it depends on file validation, copy destinations, and assignment modes rather than a normal style-token config.";
export const visualSurfacePickerOrder: VisualSurfaceType[] = ["slot_card", "background_readability", "asset_replacement", "panel", "reward_toast", "button"];

export const visualSurfaceRecipes: VisualSurfaceRecipe[] = [
  buildRecipe({
    recipeId: "slot-card",
    surfaceType: "slot_card",
    displayName: "Slot Card",
    description: "Generic slot/card presentation tokens for grid-based item or creature cards.",
    defaultStyle: defaultSlotCardStyle,
    presets: slotCardPresets,
    bounds: slotCardStyleBounds,
    previewKind: "slot_card_states",
    statePreviews: ["empty", "occupied", "selected", "locked", "merge candidate"],
    configPath: farmSlotStyleConfigRelativePath,
    generatedStyleModulePath: "src/config/farmSlotStyle.ts",
    mapping: monsterFarmMapping({
      targetId: "farm_slots",
      targetLabel: "Monster Farm Slots",
      targetSurface: "farm slot card rendering",
      detectionKind: "farm_slot_rendering",
      ownerFileHints: ["src/scenes/FarmScene.ts", "src/ui/FarmSlotView.ts", "src/rendering/MonsterRenderer.ts"],
      configPath: farmSlotStyleConfigRelativePath,
      generatedStyleModulePath: "src/config/farmSlotStyle.ts",
      checklist: ["empty/occupied/selected/locked/merge-candidate states render", "direct apply only updates config/style module when connected"]
    })
  }),
  buildRecipe({
    recipeId: "background-readability",
    surfaceType: "background_readability",
    displayName: "Background Readability",
    description: "Generic background contrast and readability tokens for UI-over-background scenes.",
    defaultStyle: defaultBackgroundReadabilityStyle,
    presets: backgroundReadabilityPresets,
    bounds: backgroundReadabilityStyleBounds,
    previewKind: "background_readability",
    statePreviews: ["background image", "contrast overlay", "foreground cards"],
    configPath: backgroundReadabilityStyleConfigRelativePath,
    generatedStyleModulePath: "src/config/backgroundReadabilityStyle.ts",
    mapping: monsterFarmMapping({
      targetId: "background",
      targetLabel: "Monster Farm Background",
      targetSurface: "farm background readability",
      detectionKind: "background_rendering",
      ownerFileHints: ["src/scenes/FarmScene.ts", "src/ui/BackgroundView.ts"],
      configPath: backgroundReadabilityStyleConfigRelativePath,
      generatedStyleModulePath: "src/config/backgroundReadabilityStyle.ts",
      checklist: ["background preview remains readable", "direct apply only updates config/style module when connected"]
    })
  }),
  buildRecipe({
    recipeId: "panel",
    surfaceType: "panel",
    displayName: "Panel",
    description: "Generic panel/chrome tokens for framed UI sections and modal-like content.",
    defaultStyle: defaultPanelStyle,
    presets: panelStylePresets,
    bounds: panelStyleBounds,
    previewKind: "panel_states",
    statePreviews: ["navigation panel", "hatch panel", "quest panel", "disabled row"],
    configPath: panelStyleConfigRelativePath,
    generatedStyleModulePath: "src/config/panelStyle.ts",
    mapping: monsterFarmMapping({
      targetId: "panels",
      targetLabel: "Monster Farm Panels",
      targetSurface: "panel rendering",
      detectionKind: "panel_rendering",
      ownerFileHints: ["src/ui/PanelChrome.ts", "src/ui/HatchPanelView.ts", "src/ui/NextQuestWidgetView.ts"],
      configPath: panelStyleConfigRelativePath,
      generatedStyleModulePath: "src/config/panelStyle.ts",
      checklist: ["navigation/hatch/quest panel previews render", "direct apply only updates config/style module when connected"]
    })
  }),
  buildRecipe({
    recipeId: "reward-toast",
    surfaceType: "reward_toast",
    displayName: "Reward Toast",
    description: "Generic reward toast tokens for short-lived reward feedback animation and styling.",
    defaultStyle: defaultRewardToastStyle,
    presets: rewardToastPresets,
    bounds: rewardToastStyleBounds,
    previewKind: "reward_toast_animation",
    statePreviews: ["reward text", "icon", "sparkles", "rise/fade animation"],
    configPath: rewardToastStyleConfigRelativePath,
    generatedStyleModulePath: "src/config/rewardToastStyle.ts",
    mapping: monsterFarmMapping({
      targetId: "reward_toast",
      targetLabel: "Monster Farm Reward Toast",
      targetSurface: "reward feedback rendering",
      detectionKind: "reward_feedback_rendering",
      ownerFileHints: ["src/ui/ToastView.ts", "src/ui/RewardFeedbackView.ts", "src/scenes/FarmScene.ts"],
      configPath: rewardToastStyleConfigRelativePath,
      generatedStyleModulePath: "src/config/rewardToastStyle.ts",
      checklist: ["reward toast animation preview renders", "direct apply only updates config/style module when connected"]
    })
  }),
  buildRecipe({
    recipeId: "button",
    surfaceType: "button",
    displayName: "Button",
    description: "Generic button tokens for readable action controls and visual press feedback.",
    defaultStyle: defaultButtonStyle,
    presets: buttonStylePresets,
    bounds: buttonStyleBounds,
    previewKind: "button_states",
    statePreviews: ["idle", "hover", "active", "disabled", "action bar", "hatch", "upgrade"],
    configPath: buttonStyleConfigRelativePath,
    generatedStyleModulePath: "src/config/buttonStyle.ts",
    mapping: monsterFarmMapping({
      targetId: "buttons",
      targetLabel: "Monster Farm Buttons",
      targetSurface: "button/action-bar rendering",
      detectionKind: "button_rendering",
      ownerFileHints: ["src/ui/GameplayActionBarView.ts", "src/ui/HatchPanelView.ts", "src/ui/UpgradePanelView.ts"],
      configPath: buttonStyleConfigRelativePath,
      generatedStyleModulePath: "src/config/buttonStyle.ts",
      checklist: ["idle/hover/active/disabled previews render", "direct apply only updates config/style module when connected"]
    })
  })
];

export function getVisualSurfaceRecipes(): VisualSurfaceRecipe[] {
  return visualSurfaceRecipes;
}

export function getVisualSurfaceRecipe(surfaceType: Exclude<VisualSurfaceType, "asset_replacement">): VisualSurfaceRecipe | undefined {
  return visualSurfaceRecipes.find((recipe) => recipe.surfaceType === surfaceType);
}

export function visualRecipeRelativePath(recipeId: string): string {
  return `.game-polish-lab/visual-recipes/${recipeId}.json`;
}

export function validateVisualSurfaceRecipe(value: unknown): VisualRecipeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, warnings, errors: ["Recipe must be an object."] };
  }
  const recipe = value as Partial<VisualSurfaceRecipe>;
  if (recipe.schemaVersion !== visualRecipeSchemaVersion) {
    errors.push(`Unsupported visual recipe schema version: ${String(recipe.schemaVersion)}`);
  }
  for (const key of ["recipeId", "surfaceType", "displayName", "description", "configPath"] as const) {
    if (typeof recipe[key] !== "string" || recipe[key]?.length === 0) {
      errors.push(`Recipe ${key} is required.`);
    }
  }
  if (!Array.isArray(recipe.supportedStyleTokens) || recipe.supportedStyleTokens.length === 0) {
    errors.push("Recipe must include supportedStyleTokens.");
  } else {
    recipe.supportedStyleTokens.forEach((token, index) => {
      const result = validateVisualStyleToken(token);
      errors.push(...result.errors.map((error) => `Token ${index}: ${error}`));
      warnings.push(...result.warnings.map((warning) => `Token ${index}: ${warning}`));
    });
  }
  if (!recipe.defaultStyle || typeof recipe.defaultStyle !== "object") {
    errors.push("Recipe defaultStyle is required.");
  }
  if (!Array.isArray(recipe.presets)) {
    errors.push("Recipe presets must be an array.");
  }
  if (!recipe.previewModel || typeof recipe.previewModel.previewKind !== "string") {
    errors.push("Recipe previewModel is required.");
  }
  if (!Array.isArray(recipe.statePreviews)) {
    errors.push("Recipe statePreviews must be an array.");
  }
  if (!Array.isArray(recipe.adapterMappings) || recipe.adapterMappings.length === 0) {
    errors.push("Recipe adapterMappings must include at least one mapping.");
  }
  if (!recipe.fallbackTaskMetadata || typeof recipe.fallbackTaskMetadata.userVisibleMessage !== "string") {
    errors.push("Recipe fallbackTaskMetadata is required.");
  }
  return { ok: errors.length === 0, warnings, errors };
}

export function validateVisualStyleToken(value: unknown): VisualRecipeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!value || typeof value !== "object") {
    return { ok: false, warnings, errors: ["Token must be an object."] };
  }
  const token = value as Partial<VisualStyleToken>;
  if (typeof token.tokenId !== "string" || token.tokenId.length === 0) {
    errors.push("tokenId is required.");
  }
  if (typeof token.label !== "string" || token.label.length === 0) {
    errors.push("label is required.");
  }
  if (!["color", "number", "boolean", "enum", "text", "asset"].includes(String(token.valueType))) {
    errors.push("valueType is unsupported.");
  }
  if (token.defaultValue === undefined) {
    errors.push("defaultValue is required.");
  }
  if (token.valueType === "number" && (typeof token.min !== "number" || typeof token.max !== "number" || typeof token.step !== "number")) {
    errors.push("number tokens require min, max, and step.");
  }
  if (token.valueType === "enum" && (!Array.isArray(token.allowedValues) || token.allowedValues.length === 0)) {
    errors.push("enum tokens require allowedValues.");
  }
  if (!["layout", "color", "state", "animation", "asset", "typography", "effect"].includes(String(token.category))) {
    errors.push("category is unsupported.");
  }
  if (typeof token.description !== "string" || token.description.length === 0) {
    errors.push("description is required.");
  }
  return { ok: errors.length === 0, warnings, errors };
}

function buildRecipe(input: {
  recipeId: string;
  surfaceType: Exclude<VisualSurfaceType, "asset_replacement">;
  displayName: string;
  description: string;
  defaultStyle: object;
  presets: Array<{ name: string; values: object }>;
  bounds: Record<string, { min: number; max: number; step: number }>;
  previewKind: string;
  statePreviews: string[];
  configPath: string;
  generatedStyleModulePath: string;
  mapping: VisualRecipeAdapterMapping;
}): VisualSurfaceRecipe {
  return {
    recipeId: input.recipeId,
    schemaVersion: visualRecipeSchemaVersion,
    surfaceType: input.surfaceType,
    displayName: input.displayName,
    description: input.description,
    supportedStyleTokens: buildTokens(styleRecord(input.defaultStyle), input.bounds),
    defaultStyle: styleRecord(input.defaultStyle),
    presets: input.presets.map((preset) => ({ name: preset.name, values: styleRecord(preset.values) })),
    previewModel: {
      previewKind: input.previewKind,
      description: `${input.displayName} preview model used by the existing tuner.`
    },
    statePreviews: input.statePreviews,
    configPath: input.configPath,
    generatedStyleModulePath: input.generatedStyleModulePath,
    adapterMappings: [input.mapping, genericPhaserMapping(input.surfaceType)],
    directApply: {
      supported: true,
      requiresConnection: true,
      behavior: "Direct apply updates the existing style config and adapter-specific generated style module only when the adapter reports a connected style path."
    },
    fallbackTaskMetadata: {
      reason: "adapter_not_connected",
      userVisibleMessage: "Use the controlled one-time setup path for this adapter target before direct apply can update generated style values.",
      allowedFiles: [input.configPath, ".game-polish-lab/rollback/*", input.generatedStyleModulePath, ...input.mapping.safeFileScopes],
      forbiddenFiles: input.mapping.forbiddenFileScopes,
      requiredConsent: true,
      suggestedNextAction: "Run one-time adapter setup from the visual surface tuner.",
      exactScopeSummary: "Only visual style config/module files and adapter-approved rendering files may be changed; gameplay, data, economy, save, progression, ad, inventory/state, and rule files remain forbidden."
    },
    updatedAt
  };
}

function genericPhaserMapping(surfaceType: Exclude<VisualSurfaceType, "asset_replacement">): VisualRecipeAdapterMapping {
  return {
    adapterId: "generic_phaser",
    targetId: "manual_target",
    targetLabel: "Generic Phaser Manual Target",
    targetSurface: `${surfaceType} manual visual target`,
    detectionKind: "manual_scope",
    ownerFileHints: [],
    safeFileScopes: [
      genericStyleConfigPaths[surfaceType],
      genericStyleModulePaths[surfaceType],
      ".game-polish-lab/visual-recipes/*",
      ".game-polish-lab/fallback-tasks/*",
      ".game-polish-lab/rollback/*"
    ],
    suspiciousFileScopes: ["src/scenes/*", "src/rendering/*", "src/ui/*", "preload/loader files"],
    forbiddenFileScopes: [
      "save files",
      "economy files",
      "hatch/upgrade/quest logic files",
      "progression/unlock files",
      "ad/monetization files",
      "inventory/state files",
      "data model/schema files",
      "level data",
      "gameplay rules",
      "input/action dispatch files",
      "package scripts/dependency changes"
    ],
    configPath: genericStyleConfigPaths[surfaceType],
    generatedStyleModulePath: genericStyleModulePaths[surfaceType],
    supportedConnectionTypes: ["style_module", "json_config"],
    directApplySupported: true,
    setupSupported: false,
    manualTestChecklist: [
      "Generic Phaser adapter selected",
      "Phaser project detection result shown",
      "target file scope selected by user",
      "fallback task includes exact selected file scope",
      "unsupported loader/manifest changes were not patched automatically",
      "no gameplay/save/economy/progression/ad files changed"
    ]
  };
}

function styleRecord(value: object): Record<string, string | number | boolean> {
  return value as Record<string, string | number | boolean>;
}

function buildTokens(defaultStyle: Record<string, string | number | boolean>, bounds: Record<string, { min: number; max: number; step: number }>): VisualStyleToken[] {
  return Object.entries(defaultStyle).map(([tokenId, defaultValue]) => {
    const numericBounds = bounds[tokenId];
    const valueType = typeof defaultValue === "string" && /^#[0-9a-f]{6}$/i.test(defaultValue) ? "color" : typeof defaultValue === "number" ? "number" : typeof defaultValue === "boolean" ? "boolean" : "text";
    return {
      tokenId,
      label: tokenLabels[tokenId] ?? tokenId,
      valueType,
      defaultValue,
      min: numericBounds?.min,
      max: numericBounds?.max,
      step: numericBounds?.step,
      unit: unitByToken[tokenId],
      category: categoryByToken[tokenId] ?? (valueType === "color" ? "color" : "layout"),
      description: `${tokenLabels[tokenId] ?? tokenId} style token.`,
      previewRole: `${tokenId} preview input`,
      applyRole: `${tokenId} generated style value`
    };
  });
}

function monsterFarmMapping(input: {
  targetId: string;
  targetLabel: string;
  targetSurface: string;
  detectionKind: string;
  ownerFileHints: string[];
  configPath: string;
  generatedStyleModulePath: string;
  checklist: string[];
}): VisualRecipeAdapterMapping {
  return {
    adapterId: "idle_monster_farm",
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    targetSurface: input.targetSurface,
    detectionKind: input.detectionKind,
    ownerFileHints: input.ownerFileHints,
    safeFileScopes: [input.generatedStyleModulePath, ...input.ownerFileHints],
    suspiciousFileScopes: ["src/scenes/FarmScene.ts when rendering and gameplay logic are mixed"],
    forbiddenFileScopes: [
      "save files",
      "economy files",
      "hatch/upgrade/quest logic files",
      "progression/unlock files",
      "ad/monetization files",
      "inventory/state files",
      "data model/schema files",
      "level data",
      "gameplay rules",
      "loader/input/action dispatch files"
    ],
    configPath: input.configPath,
    generatedStyleModulePath: input.generatedStyleModulePath,
    supportedConnectionTypes: ["style_module", "json_config", "runtime_bridge"],
    directApplySupported: true,
    setupSupported: true,
    manualTestChecklist: [
      "recipe schema version is present",
      "style tokens match surface controls",
      "existing style config still loads",
      "generated style module path remains adapter-specific",
      "adapter mapping is separated from generic recipe",
      ...input.checklist,
      "no gameplay/save/economy/progression/ad files changed"
    ]
  };
}
