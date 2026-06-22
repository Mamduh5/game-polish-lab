import * as path from "path";
import * as vscode from "vscode";

import { isActionProjectType, isIdleProjectType } from "./projectType";
import { labUri, normalizeWorkspacePath, readJsonFileIfExists } from "./workspace";
import { PixelPolishKit, PixelPolishKitPreset } from "../types/pixelPolishKit";
import { ProjectProfile } from "../types/profile";

export function buildPixelPolishKit(preset: PixelPolishKitPreset, profile: ProjectProfile, actualConfigPath: string): PixelPolishKit {
  return {
    schemaVersion: 1,
    kitVersion: "0.2",
    createdAt: new Date().toISOString(),
    kitId: preset.kitId,
    kitLabel: preset.label,
    engine: profile.engine,
    style: profile.style,
    projectType: profile.projectType,
    suggestedConfigPath: preset.suggestedConfigPath,
    actualConfigPath: normalizeWorkspacePath(actualConfigPath),
    configExportName: preset.configExportName,
    targetFeel: preset.targetFeel,
    acceptanceCriteria: preset.acceptanceCriteria,
    antiPatterns: preset.antiPatterns,
    manualTuningAdvice: preset.manualTuningAdvice,
    codexImplementationNotes: preset.codexImplementationNotes
  };
}

export function buildKitReadme(kit: PixelPolishKit): string {
  return `# ${kit.kitLabel}

## Summary

- Kit ID: ${kit.kitId}
- Engine: ${kit.engine}
- Style: ${kit.style}
- Project type: ${kit.projectType}
- Suggested config path: ${kit.suggestedConfigPath}
- Actual config path: ${kit.actualConfigPath || "not generated"}
- Config export: ${kit.configExportName}

## Target Feel

${kit.targetFeel}

## Acceptance Criteria

${formatList(kit.acceptanceCriteria)}

## Anti-Patterns

${formatList(kit.antiPatterns)}

## Manual Tuning Advice

${formatList(kit.manualTuningAdvice)}

## Codex Implementation Notes

${formatList(kit.codexImplementationNotes)}
`;
}

export function buildKitImplementationPrompt(kit: PixelPolishKit, profile: ProjectProfile): string {
  const approvalInstruction = profile.codexRequiresApprovalBeforePatch
    ? "- Do not edit code yet. First inspect and report the planned files.\n- Wait for approval before patching."
    : "- Inspect first and report the planned files before patching.\n- After inspection, implementation is allowed if the planned files stay within this kit scope.";

  return `# Game Polish Lab Kit Implementation Prompt

Kit: ${kit.kitLabel}
Engine: ${kit.engine}
Style: ${kit.style}
Project type: ${kit.projectType}
Config export: ${kit.configExportName}
Config path: ${kit.actualConfigPath || kit.suggestedConfigPath}

This is a game presentation/polish implementation task, not an app UI redesign.

## Core Rules

- Use the generated config as the single source of truth for tuning values.
- Do not hardcode timing, scale, speed, alpha, or shake values outside the config.
${approvalInstruction}
- Keep the patch small, measurable, and reversible.
- Do not change damage, HP, economy, save fields, progression, item drops, or unrelated systems unless explicitly requested.
- At the end, list changed files and every config value used.

## Project-Type Guidance

${formatList(projectTypeGuidance(kit))}

## Target Feel

${kit.targetFeel}

## Acceptance Criteria

${formatList(kit.acceptanceCriteria)}

## Anti-Patterns

${formatList(kit.antiPatterns)}

## Implementation Notes

${formatList(kit.codexImplementationNotes)}

## Manual Tuning Advice

${formatList(kit.manualTuningAdvice)}
`;
}

export function buildStyleGuideMarkdown(): string {
  return `# Pixel Art Game Style Guide

## Rendering Rules

- Use \`render.pixelArt: true\` in Phaser config where supported.
- Use \`image-rendering: pixelated\` on the canvas or game container.
- Avoid blurry canvas scaling.

## Pixel Scale Rules

- Prefer integer scale.
- Avoid subpixel positioning for important gameplay sprites.
- Document intentional decimal camera zoom or transform scaling.

## Palette Rules

- Keep important gameplay objects visually distinct from backgrounds.
- Reserve strongest contrast for player, threats, pickups, and critical HUD values.
- Avoid adding noisy colors that make projectiles or enemies harder to read.

## Sprite Readability Rules

- Important gameplay objects need strong silhouettes.
- Player, enemy, projectile, pickup, and reward sprites should read at gameplay size.
- Keep sprite scaling consistent within a scene unless there is a clear gameplay reason.

## Action Game Readability

- Prioritize player, enemy, projectile, danger telegraph, and hit feedback readability.
- Do not hide hitboxes with excessive particles.
- Camera shake and screen flashes must be short and readable.

## Idle/Menu UI Readability

- Upgrade costs, resource counts, rates, and lock states must be scannable.
- Button/card feedback should feel game-like without rebuilding the UI framework.
- Economy values and save fields are not visual-polish targets.

## VFX Rules

- Pixel VFX should be short, readable, and not gradient-heavy.
- Prefer square, diamond, short-line, or sprite-based particles for pixel-art feedback.
- Avoid covering the player, enemies, projectiles, or pickup targets.

## HUD Rules

- UI text needs outline or high-contrast backing.
- HUD elements should not cover critical gameplay space.
- Health, cooldown, resource, and warning states should have stable layout.

## Codex Implementation Rules

- Inspect first and list planned files before editing.
- Keep changes small, measurable, and reversible.
- Put timing, scale, speed, alpha, shake, spacing, and color tuning in config files.
- Do not change damage, HP, economy values, save fields, progression, item drops, or unrelated systems unless explicitly requested.
`;
}

export async function nextKitFolderName(folder: vscode.WorkspaceFolder, kitId: string): Promise<string> {
  const kitsUri = labUri(folder, "kits");
  let highest = 0;
  try {
    const entries = await vscode.workspace.fs.readDirectory(kitsUri);
    for (const [name, type] of entries) {
      if (type !== vscode.FileType.Directory) {
        continue;
      }
      const match = /^(\d+)-/.exec(name);
      if (match) {
        highest = Math.max(highest, Number(match[1]));
      }
    }
  } catch {
    // Missing kits directory starts at 1.
  }

  return `${String(highest + 1).padStart(3, "0")}-${kitId.replace(/_/g, "-")}`;
}

export async function readKitFromFolder(folder: vscode.WorkspaceFolder, kitFolderName: string): Promise<PixelPolishKit | undefined> {
  return readJsonFileIfExists<PixelPolishKit>(labUri(folder, "kits", kitFolderName, "kit.json"));
}

export function resolveWorkspaceConfigPath(folder: vscode.WorkspaceFolder, workspaceRelativePath: string): vscode.Uri | undefined {
  const normalized = normalizeWorkspacePath(workspaceRelativePath);
  if (!normalized || path.isAbsolute(normalized) || normalized.startsWith("..")) {
    return undefined;
  }

  return vscode.Uri.joinPath(folder.uri, ...normalized.split("/"));
}

function projectTypeGuidance(kit: PixelPolishKit): string[] {
  if (isActionProjectType(kit.projectType)) {
    return [
      "Prioritize gameplay readability.",
      "Keep VFX short.",
      "Avoid covering player, enemies, or projectiles.",
      "Avoid noisy particles.",
      "Preserve hitbox fairness."
    ];
  }

  if (isIdleProjectType(kit.projectType)) {
    return [
      "Prioritize hierarchy and resource clarity.",
      "Do not change economy values.",
      "Do not rename save fields.",
      "Keep UI changes scoped to the target screen or panel."
    ];
  }

  return [
    "Keep the patch focused on game presentation, readability, VFX, HUD, controls, or pixel-art setup."
  ];
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}
