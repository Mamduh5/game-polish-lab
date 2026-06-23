import * as vscode from "vscode";

import { logInfo } from "../../core/output";
import { detectCodeStyleFromFiles, detectRuntimePresentationModelFromFiles } from "../../core/presentationDetection";
import { isActionProjectType, isIdleProjectType, isMonsterFarmProjectType, isSortPuzzleProjectType, suggestProjectTypeFromFiles } from "../../core/projectType";
import { renderScanStatsMarkdown, scanWasCappedMessage, scanWorkspace, setCachedAnalysis } from "../../core/workspaceScanner";
import { PhaserPixelAuditResult } from "../../types/audit";
import { ProjectType } from "../../types/profile";
import { detectPhaserProjectFromFiles } from "./detectPhaserProject";
import { findCssRenderingRuleFilesFromFiles } from "./findCssRenderingRules";
import { findPhaserConfigFilesFromFiles } from "./findPhaserConfig";

type PatternCheck = {
  label: string;
  pattern: RegExp;
  files: string[];
};

export async function auditPhaserPixelArt(folder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<PhaserPixelAuditResult> {
  const scan = await scanWorkspace({ folder, token });
  const detection = detectPhaserProjectFromFiles(scan.files);
  const projectTypeSuggestion = suggestProjectTypeFromFiles(scan.files);
  const codeStyleDetection = detectCodeStyleFromFiles(scan.files);
  const runtimeDetection = detectRuntimePresentationModelFromFiles(scan.files);
  const configFiles = findPhaserConfigFilesFromFiles(scan.files);
  const cssFiles = findCssRenderingRuleFilesFromFiles(scan.files);
  const allFiles = [...configFiles, ...cssFiles];
  const filesInspected = Array.from(new Set([...detection.filesInspected, ...allFiles.map((file) => file.relativePath)])).sort();

  const checks: PatternCheck[] = [
    { label: "`render.pixelArt: true` is configured.", pattern: /render\s*:\s*{[\s\S]*?pixelArt\s*:\s*true/, files: [] },
    { label: "`pixelArt: true` is configured.", pattern: /\bpixelArt\s*:\s*true\b/, files: [] },
    { label: "`roundPixels: true` is configured.", pattern: /\broundPixels\s*:\s*true\b/, files: [] },
    { label: "`antialias: false` is configured.", pattern: /\bantialias\s*:\s*false\b/, files: [] },
    { label: "`antialiasGL: false` is configured.", pattern: /\bantialiasGL\s*:\s*false\b/, files: [] },
    { label: "`image-rendering: pixelated` is present.", pattern: /image-rendering\s*:\s*pixelated\b/, files: [] },
    { label: "`image-rendering: crisp-edges` is present.", pattern: /image-rendering\s*:\s*crisp-edges\b/, files: [] },
    { label: "CSS contains likely canvas selector rules.", pattern: /canvas\s*[{,.#:\[]|\.game\s+canvas|#game\s+canvas/i, files: [] }
  ];

  const optimizeSpeedFiles = new Set<string>();
  for (const check of checks) {
    for (const file of allFiles) {
      if (check.pattern.test(file.text)) {
        check.files.push(file.relativePath);
      }
    }
  }
  for (const file of allFiles) {
    if (/image-rendering\s*:\s*optimizeSpeed\b/.test(file.text)) {
      optimizeSpeedFiles.add(file.relativePath);
    }
  }

  const passedChecks = checks
    .filter((check) => check.files.length > 0)
    .map((check) => `${check.label} Found in ${Array.from(new Set(check.files)).join(", ")}.`);

  const warnings = checks
    .filter((check) => check.files.length === 0)
    .map((check) => `Missing or not detected: ${check.label}`);

  if (optimizeSpeedFiles.size > 0) {
    warnings.push(`Found \`image-rendering: optimizeSpeed\` in ${Array.from(optimizeSpeedFiles).join(", ")}. This is legacy/less preferred; prefer \`pixelated\` for pixel-art canvas rendering.`);
  }

  warnings.push(...findDecimalScaleWarnings(allFiles));

  if (filesInspected.length === 0) {
    warnings.push("No likely Phaser config or CSS rendering files were found.");
  }
  const cappedMessage = scanWasCappedMessage(scan.stats);
  if (cappedMessage) {
    warnings.push(cappedMessage);
  }

  const suggestedFixes = buildSuggestedFixes(checks, warnings);
  const suggestedTasks = suggestTaskPresets(
    checks,
    filesInspected,
    projectTypeSuggestion.suggestedProjectType,
    projectTypeSuggestion.dominantMode,
    runtimeDetection.runtimePresentationModel,
    runtimeDetection.presentationRoutes?.primaryPolishRoute ?? (runtimeDetection.runtimePresentationModel === "phaser_rendered_dom_hud" ? "arena" : undefined)
  );
  const gamePresentationNotes = buildGamePresentationNotes(projectTypeSuggestion.suggestedProjectType, projectTypeSuggestion.dominantMode, checks, filesInspected, warnings);
  const pixelArtReadinessScore = calculateReadinessScore(checks, optimizeSpeedFiles.size > 0, warnings);
  const mainRisk = warnings[0] ?? "No major pixel-art rendering risks detected.";

  logInfo(`audit files inspected: ${filesInspected.join(", ") || "none"}`);
  logInfo(`audit detection evidence: ${detection.evidence.join(" | ") || "none"}`);
  logInfo(`audit suggested project type: ${projectTypeSuggestion.suggestedProjectType}`);
  logInfo(`audit runtime presentation model: ${runtimeDetection.runtimePresentationModel}`);

  const result = {
    detection,
    suggestedProjectType: projectTypeSuggestion.suggestedProjectType,
    projectTypeEvidence: projectTypeSuggestion.evidence,
    dominantMode: projectTypeSuggestion.dominantMode,
    secondaryMode: projectTypeSuggestion.secondaryMode,
    runtimePresentationModel: runtimeDetection.runtimePresentationModel,
    secondaryRuntimePresentationModel: runtimeDetection.secondaryRuntimePresentationModel,
    runtimePresentationEvidence: runtimeDetection.evidence,
    codeStyle: codeStyleDetection.codeStyle,
    codeStyleEvidence: codeStyleDetection.evidence,
    recommendedKitFamily: runtimeDetection.recommendedKitFamily,
    presentationRoutes: runtimeDetection.presentationRoutes,
    gamePresentationNotes,
    passedChecks,
    warnings,
    suggestedFixes,
    suggestedTasks,
    filesInspected,
    scanStats: scan.stats,
    pixelArtReadinessScore,
    mainRisk
  };
  setCachedAnalysis(folder, "latestAuditSuggestion", scan.stats.performanceMode, {
    suggestedProjectType: projectTypeSuggestion.suggestedProjectType,
    dominantMode: projectTypeSuggestion.dominantMode,
    runtimePresentationModel: runtimeDetection.runtimePresentationModel,
    secondaryRuntimePresentationModel: runtimeDetection.secondaryRuntimePresentationModel,
    codeStyle: codeStyleDetection.codeStyle,
    presentationRoutes: runtimeDetection.presentationRoutes,
    suggestedTasks,
    mainRisk,
    pixelArtReadinessScore
  });
  return result;
}

function findDecimalScaleWarnings(files: { relativePath: string; text: string }[]): string[] {
  const warnings: string[] = [];
  const patterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "decimal `setScale(...)` usage", pattern: /\.setScale\(\s*\d+\.\d+/g },
    { label: "decimal camera zoom usage", pattern: /\b(?:zoom|setZoom)\s*[:(]\s*\d+\.\d+/g },
    { label: "decimal CSS transform scale usage", pattern: /transform\s*:\s*[^;]*scale\(\s*\d+\.\d+/g }
  ];

  for (const file of files) {
    for (const item of patterns) {
      const matches = file.text.match(item.pattern);
      if (matches && matches.length > 0) {
        warnings.push(`Warning only: ${item.label} detected in ${file.relativePath}. Verify it does not cause pixel shimmer or blur.`);
      }
    }
  }

  return warnings;
}

export function renderPhaserPixelAuditMarkdown(result: PhaserPixelAuditResult): string {
  const detectionEvidence = result.detection.evidence.length > 0
    ? result.detection.evidence.map((item) => `- ${item}`).join("\n")
    : "- No Phaser-specific evidence found.";
  const projectTypeEvidence = result.projectTypeEvidence.length > 0
    ? result.projectTypeEvidence.map((item) => `- ${item}`).join("\n")
    : "- No project-type evidence found.";
  const runtimeEvidence = result.runtimePresentationEvidence.length > 0
    ? result.runtimePresentationEvidence.map((item) => `  - ${item}`).join("\n")
    : "  - No runtime presentation evidence found.";
  const codeStyleEvidence = result.codeStyleEvidence.length > 0
    ? result.codeStyleEvidence.map((item) => `  - ${item}`).join("\n")
    : "  - No code-style evidence found.";
  const presentationRoutes = renderPresentationRoutes(result);

  const passedChecks = result.passedChecks.length > 0
    ? result.passedChecks.map((item) => `- ${item}`).join("\n")
    : "- No pixel-art rendering checks passed from the inspected files.";

  const warnings = result.warnings.length > 0
    ? result.warnings.map((item) => `- ${item}`).join("\n")
    : "- No warnings detected.";

  const suggestedFixes = result.suggestedFixes.length > 0
    ? result.suggestedFixes.map((item) => `- ${item}`).join("\n")
    : "- No suggested fixes.";

  const suggestedTasks = result.suggestedTasks.map((item) => `- ${item}`).join("\n");
  const maxFiles = result.scanStats?.maxInspectedFilesInReport ?? 80;
  const cappedFiles = result.filesInspected.slice(0, maxFiles);
  const omittedCount = Math.max(result.filesInspected.length - cappedFiles.length, 0);
  const filesInspected = cappedFiles.length > 0
    ? `${cappedFiles.map((item) => `- ${item}`).join("\n")}${omittedCount > 0 ? `\n- ... ${omittedCount} more files omitted.` : ""}`
    : "- No files inspected.";

  return `# Game Polish Lab - Phaser Pixel Audit

## Summary

- Phaser detected: ${result.detection.isPhaserProject ? "yes" : "no"}
- Confidence: ${result.detection.confidence}
- Suggested project type: ${result.suggestedProjectType}
- Code style: ${result.codeStyle}
- Runtime presentation model: ${result.runtimePresentationModel}
${result.secondaryRuntimePresentationModel ? `- Secondary runtime presentation model: ${result.secondaryRuntimePresentationModel}\n` : ""}- Pixel-art readiness score: ${result.pixelArtReadinessScore}/100
- Main risk: ${result.mainRisk}

## Detection Evidence

${detectionEvidence}

## Suggested Project Type

- Suggested project type: ${result.suggestedProjectType}
- Dominant mode: ${result.dominantMode}
- Secondary mode: ${result.secondaryMode}
${projectTypeEvidence}

## Code Style

* Code style: ${result.codeStyle}
* Evidence:
${codeStyleEvidence}

## Runtime Presentation Model

* Runtime presentation model: ${result.runtimePresentationModel}
${result.secondaryRuntimePresentationModel ? `* Secondary runtime presentation model: ${result.secondaryRuntimePresentationModel}\n` : ""}* Recommended kit family: ${result.recommendedKitFamily}
* Evidence:
${runtimeEvidence}

${presentationRoutes}

## Game Presentation Notes

${result.gamePresentationNotes.map((item) => `- ${item}`).join("\n")}

## Passed Checks

${passedChecks}

## Warnings

${warnings}

## Suggested Fixes

${suggestedFixes}

## Recommended Kits

${suggestedTasks}

## Files Inspected

${filesInspected}

${renderScanStatsMarkdown(result.scanStats)}
`;
}

function buildSuggestedFixes(checks: PatternCheck[], warnings: string[]): string[] {
  const fixes: string[] = [];
  if (missing(checks, "`render.pixelArt: true`") || missing(checks, "`pixelArt: true`")) {
    fixes.push("In your Phaser GameConfig, add `render.pixelArt: true` or `pixelArt: true` where supported by your Phaser version.");
  }
  if (missing(checks, "`roundPixels: true`")) {
    fixes.push("In your Phaser GameConfig, add `roundPixels: true` for pixel-art scenes that should snap rendering to whole pixels.");
  }
  if (missing(checks, "`antialias: false`")) {
    fixes.push("In your Phaser GameConfig, set `antialias: false` when crisp pixel scaling is required.");
  }
  if (missing(checks, "`antialiasGL: false`")) {
    fixes.push("In your Phaser GameConfig, set `antialiasGL: false` for WebGL pixel-art rendering when compatible with the project.");
  }
  if (missing(checks, "`image-rendering: pixelated`")) {
    fixes.push("In CSS, add `image-rendering: pixelated` to the canvas or game container.");
  }
  if (warnings.some((warning) => warning.includes("decimal"))) {
    fixes.push("Avoid decimal camera zoom or transform scaling for pixel-art scenes unless intentionally using smooth scaling.");
  }

  return fixes;
}

function suggestTaskPresets(
  checks: PatternCheck[],
  filesInspected: string[],
  projectType: ProjectType,
  dominantMode: ProjectType | "unknown",
  runtimePresentationModel: string,
  primaryPolishRoute?: string
): string[] {
  const suggestions: string[] = [];
  const lowerPaths = filesInspected.map((file) => file.toLowerCase());

  if (isSortPuzzleProjectType(projectType) || dominantMode === "tap_to_move_sort_puzzle") {
    return [
      "sort_move_feedback",
      "selected_shelf_readability",
      "invalid_move_feedback",
      "completed_shelf_glow",
      "win_celebration",
      "spirit_identity_readability",
      "puzzle_hud_readability",
      "mobile_sort_layout_readability"
    ];
  }

  if (isMonsterFarmProjectType(projectType) || dominantMode === "monster_merge_idle" || dominantMode === "phaser_ui_heavy_idle" || dominantMode === "tap_farm_idle") {
    return [
      "monster_farm_slot_readability",
      "hatch_feedback",
      "merge_feedback",
      "tap_farm_feedback",
      "coin_bug_feedback",
      "farm_hud_readability",
      "monster_identity_readability",
      "panel_readability",
      "toast_reward_feedback",
      "quest_widget_readability",
      "boss_battle_feedback"
    ];
  }

  if (
    runtimePresentationModel === "phaser_rendered_dom_hud"
    && primaryPolishRoute === "arena"
    && (projectType === "cursor_attack_arena" || projectType === "incremental_arena" || dominantMode === "cursor_attack_arena")
  ) {
    const arenaKits = [
      "cursor_attack_feedback",
      "enemy_kill_feedback",
      "combo_feedback",
      "arena_hud_readability",
      "arena_upgrade_panel_readability",
      "arena_background_readability"
    ];
    return missing(checks, "`pixelArt: true`") || missing(checks, "`image-rendering: pixelated`")
      ? [...arenaKits, "pixel_art_setup"]
      : arenaKits;
  }

  if (missing(checks, "`pixelArt: true`") || missing(checks, "`image-rendering: pixelated`")) {
    suggestions.push("pixel_art_setup");
  }
  if (isIdleProjectType(projectType)) {
    suggestions.push("economy_hud", "idle_upgrade_screen");
  }
  if (isActionProjectType(projectType)) {
    suggestions.push("hit_feedback", "control_feel");
  }
  if (lowerPaths.some((file) => /\.(css|scss|sass|less|tsx|jsx|html)$/.test(file) || file.includes("ui") || file.includes("hud"))) {
    suggestions.push("hud_readability");
  }
  if (lowerPaths.some((file) => file.includes("combat") || file.includes("enemy") || file.includes("damage") || file.includes("hit"))) {
    suggestions.push("hit_feedback");
  }
  if (lowerPaths.some((file) => file.includes("projectile") || file.includes("bullet"))) {
    suggestions.push("projectile_readability");
  }
  if (lowerPaths.some((file) => file.includes("pickup") || file.includes("item") || file.includes("loot"))) {
    suggestions.push("pickup_feedback");
  }

  return Array.from(new Set(suggestions)).slice(0, 3);
}

function buildGamePresentationNotes(projectType: ProjectType, dominantMode: ProjectType | "unknown", checks: PatternCheck[], filesInspected: string[], warnings: string[]): string[] {
  const lowerPaths = filesInspected.map((file) => file.toLowerCase());
  if (isSortPuzzleProjectType(projectType) || dominantMode === "tap_to_move_sort_puzzle") {
    return [
      "Shelf selection risk: inspect source and target shelf clarity before tuning movement effects.",
      "Move feedback risk: valid moves, invalid moves, completed shelf glow, and win celebration need distinct visual states.",
      "Spirit identity risk: spirits must remain readable while selected, lifted, moving, or bouncing.",
      "Mobile layout risk: shelf tap targets, HUD buttons, and board spacing need to stay readable on small screens.",
      "System scope risk: do not change SortRules, level data, save/progression, unlock rules, or win logic during visual polish."
    ];
  }
  if (isMonsterFarmProjectType(projectType) || dominantMode === "monster_merge_idle" || dominantMode === "phaser_ui_heavy_idle" || dominantMode === "tap_farm_idle") {
    return [
      "Farm slot readability risk: empty, locked, occupied, selected, drag-hover, and merge-candidate states need clear visual separation.",
      "Monster identity risk: monster family/type/readability should survive slot, merge, hatch, and panel presentation.",
      "Idle feedback risk: hatch, merge, tap farm, coin bug, toast reward, and boss feedback should stay visual-only.",
      "Panel density risk: HUD, navigation, quest widget, hatch panel, and action bar need hierarchy without rewriting FarmScene.",
      "System scope risk: do not change economy formulas, save schema, hatch odds/costs/cooldowns, upgrade costs, quest rewards, ad logic, or monetization behavior."
    ];
  }

  if (projectType === "incremental_arena" || projectType === "cursor_attack_arena" || dominantMode === "cursor_attack_arena") {
    const notes = [
      `Pixel-art setup risk: ${missing(checks, "`pixelArt: true`") || missing(checks, "`image-rendering: pixelated`") ? "rendering setup needs review for crisp arena scaling." : "core pixel-art rendering signals were found."}`,
      "Cursor attack readability risk: inspect cursor attack feedback, hit vs miss readability, helper cursor feedback, and short impact timing.",
      "Enemy feedback risk: inspect enemy hit and kill feedback without hiding nearby enemies or cursor targets.",
      "Combo feedback risk: inspect combo popup readability, placement, and timing during active clicking.",
      "Arena HUD/menu readability risk: inspect arena HUD clarity and upgrade panel readability without changing economy formulas or DOM bindings.",
      "Background readability risk: inspect background effect contrast so enemy silhouettes and cursor feedback stay higher priority.",
      "System scope risk: avoid adding player or projectile systems unless they already exist in this project."
    ];
    if (warnings.some((warning) => warning.includes("decimal"))) {
      notes.push("Sprite scaling consistency risk: decimal scaling was detected; verify it does not create pixel shimmer.");
    }
    return notes;
  }

  const notes = [
    `Pixel-art setup risk: ${missing(checks, "`pixelArt: true`") || missing(checks, "`image-rendering: pixelated`") ? "rendering setup needs review for crisp scaling." : "core pixel-art rendering signals were found."}`,
    `Action readability risk: ${lowerPaths.some((file) => /(combat|enemy|projectile|bullet|player|damage|arena)/.test(file)) ? "inspect player, enemy, projectile, hit feedback, danger telegraphs, and sprite scale consistency." : "no strong action-combat file signals found; missing buttons are not treated as a problem."}`,
    `HUD/menu readability risk: ${lowerPaths.some((file) => /(ui|hud|panel|upgrade|shop|currency|button|card)/.test(file)) ? "inspect resource clarity, upgrade hierarchy, icon/card consistency, panel spacing, reward popups, and progress bars." : "no strong menu-heavy file signals found."}`,
    `VFX feedback risk: ${lowerPaths.some((file) => /(vfx|effect|spark|hit|pickup|reward)/.test(file)) ? "keep VFX short, readable, and pixel-styled without covering gameplay." : "no dedicated VFX files detected; consider targeted feedback tasks only if gameplay lacks response."}`,
    `Control feel risk: ${lowerPaths.some((file) => /(control|input|joystick|touch|drag|mobile|movement)/.test(file)) ? "inspect input feedback, joystick/touch readability, and responsiveness without changing movement balance." : "no strong control files detected."}`
  ];

  if (isActionProjectType(projectType)) {
    notes.push("For action/arena games, prioritize player/enemy/projectile readability, hit feedback, pickup feedback, camera/screen feedback, control feel, danger telegraphs, and sprite scaling consistency.");
  }
  if (isIdleProjectType(projectType)) {
    notes.push("For idle/menu-heavy games, prioritize upgrade readability, resource HUD clarity, item/icon consistency, button/card feedback, panel spacing, reward popups, and progress bars.");
  }
  if (warnings.some((warning) => warning.includes("decimal"))) {
    notes.push("Sprite scaling consistency risk: decimal scaling was detected; verify it does not create pixel shimmer.");
  }

  return notes;
}

function calculateReadinessScore(checks: PatternCheck[], hasOptimizeSpeed: boolean, warnings: string[]): number {
  const weightedChecks = [
    { label: "`pixelArt: true`", weight: 25 },
    { label: "`roundPixels: true`", weight: 15 },
    { label: "`antialias: false`", weight: 15 },
    { label: "`antialiasGL: false`", weight: 10 },
    { label: "`image-rendering: pixelated`", weight: 25 },
    { label: "CSS contains likely canvas selector rules.", weight: 10 }
  ];

  const score = weightedChecks.reduce((sum, item) => {
    return sum + (checks.some((check) => check.label.includes(item.label) && check.files.length > 0) ? item.weight : 0);
  }, 0);
  const penalty = (hasOptimizeSpeed ? 5 : 0) + Math.min(warnings.filter((warning) => warning.includes("decimal")).length * 5, 15);
  return Math.max(0, Math.min(100, score - penalty));
}

function missing(checks: PatternCheck[], labelPart: string): boolean {
  return checks.some((check) => check.label.includes(labelPart) && check.files.length === 0);
}

function renderPresentationRoutes(result: PhaserPixelAuditResult): string {
  if (!result.presentationRoutes) {
    return "";
  }

  const routes = result.presentationRoutes;
  const notes = routes.notes.length > 0 ? `\n${routes.notes.map((note) => `* ${note}`).join("\n")}` : "";
  return `## Presentation Routes

* Main DOM route: detected via ${formatInlineEvidence(routes.mainDomRouteEvidence)}
* Arena route: detected via ${formatInlineEvidence(routes.arenaRouteEvidence)}
* Primary polish route: ${routes.primaryPolishRoute === "main_dom" ? "main DOM" : routes.primaryPolishRoute}${notes}`;
}

function formatInlineEvidence(items: string[]): string {
  return items.length > 0 ? items.map((item) => `\`${item}\``).join(", ") : "`none`";
}
