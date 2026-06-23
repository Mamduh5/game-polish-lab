import * as vscode from "vscode";

import { logInfo } from "../../core/output";
import { detectRuntimePresentationModelFromFiles } from "../../core/presentationDetection";
import { isActionProjectType, isIdleProjectType, suggestProjectTypeFromFiles } from "../../core/projectType";
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
  const suggestedTasks = suggestTaskPresets(checks, filesInspected, projectTypeSuggestion.suggestedProjectType, runtimeDetection.runtimePresentationModel);
  const gamePresentationNotes = buildGamePresentationNotes(projectTypeSuggestion.suggestedProjectType, checks, filesInspected, warnings);
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
    runtimePresentationEvidence: runtimeDetection.evidence,
    recommendedKitFamily: runtimeDetection.recommendedKitFamily,
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
- Runtime presentation model: ${result.runtimePresentationModel}
- Pixel-art readiness score: ${result.pixelArtReadinessScore}/100
- Main risk: ${result.mainRisk}

## Detection Evidence

${detectionEvidence}

## Suggested Project Type

- Suggested project type: ${result.suggestedProjectType}
- Dominant mode: ${result.dominantMode}
- Secondary mode: ${result.secondaryMode}
${projectTypeEvidence}

## Runtime Presentation Model

* Runtime presentation model: ${result.runtimePresentationModel}
* Recommended kit family: ${result.recommendedKitFamily}
* Evidence:
${runtimeEvidence}

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

function suggestTaskPresets(checks: PatternCheck[], filesInspected: string[], projectType: ProjectType, runtimePresentationModel: string): string[] {
  const suggestions: string[] = [];
  const lowerPaths = filesInspected.map((file) => file.toLowerCase());

  if (runtimePresentationModel === "phaser_rendered_dom_hud" && (projectType === "cursor_attack_arena" || projectType === "incremental_arena")) {
    return [
      "Cursor Attack Feedback Kit",
      "Enemy Kill Feedback Kit",
      "Combo Feedback Kit",
      "Arena HUD Readability Kit",
      "Arena Upgrade Panel Readability Kit"
    ];
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

function buildGamePresentationNotes(projectType: ProjectType, checks: PatternCheck[], filesInspected: string[], warnings: string[]): string[] {
  const lowerPaths = filesInspected.map((file) => file.toLowerCase());
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
