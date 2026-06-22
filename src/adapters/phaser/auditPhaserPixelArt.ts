import * as vscode from "vscode";

import { PhaserPixelAuditResult } from "../../types/audit";
import { detectPhaserProject } from "./detectPhaserProject";
import { findCssRenderingRuleFiles } from "./findCssRenderingRules";
import { findPhaserConfigFiles } from "./findPhaserConfig";

type PatternCheck = {
  label: string;
  pattern: RegExp;
  files: string[];
};

export async function auditPhaserPixelArt(folder: vscode.WorkspaceFolder): Promise<PhaserPixelAuditResult> {
  const detection = await detectPhaserProject(folder);
  const configFiles = await findPhaserConfigFiles(folder);
  const cssFiles = await findCssRenderingRuleFiles(folder);
  const allFiles = [...configFiles, ...cssFiles];
  const filesInspected = Array.from(new Set(allFiles.map((file) => file.relativePath))).sort();

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

  for (const check of checks) {
    for (const file of allFiles) {
      if (check.pattern.test(file.text)) {
        check.files.push(file.relativePath);
      }
    }
  }

  const passedChecks = checks
    .filter((check) => check.files.length > 0)
    .map((check) => `${check.label} Found in ${Array.from(new Set(check.files)).join(", ")}.`);

  const warnings = checks
    .filter((check) => check.files.length === 0)
    .map((check) => `Missing or not detected: ${check.label}`);

  warnings.push(...findDecimalScaleWarnings(allFiles));

  if (filesInspected.length === 0) {
    warnings.push("No likely Phaser config or CSS rendering files were found.");
  }

  const suggestedTasks = [
    "pixel_art_setup",
    "hud_readability",
    "hit_feedback"
  ];

  return {
    detection,
    passedChecks,
    warnings,
    suggestedTasks,
    filesInspected
  };
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

  const passedChecks = result.passedChecks.length > 0
    ? result.passedChecks.map((item) => `- ${item}`).join("\n")
    : "- No pixel-art rendering checks passed from the inspected files.";

  const warnings = result.warnings.length > 0
    ? result.warnings.map((item) => `- ${item}`).join("\n")
    : "- No warnings detected.";

  const suggestedTasks = result.suggestedTasks.map((item) => `- ${item}`).join("\n");
  const filesInspected = result.filesInspected.length > 0
    ? result.filesInspected.map((item) => `- ${item}`).join("\n")
    : "- No files inspected.";

  return `# Game Polish Lab - Phaser Pixel Audit

## Summary

- Phaser project detected: ${result.detection.isPhaserProject ? "yes" : "no"}
- Detection confidence: ${result.detection.confidence}
- Passed checks: ${result.passedChecks.length}
- Warnings: ${result.warnings.length}

## Detection Evidence

${detectionEvidence}

## Passed Checks

${passedChecks}

## Warnings

${warnings}

## Suggested Next Polish Tasks

${suggestedTasks}

## Files Inspected

${filesInspected}
`;
}
