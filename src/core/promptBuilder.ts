import { PolishTask } from "../types/polishTask";
import { isActionProjectType, isIdleProjectType } from "./projectType";

export function buildCodexPrompt(task: PolishTask, options: { requiresApprovalBeforePatch: boolean }): string {
  const approvalInstruction = options.requiresApprovalBeforePatch
    ? "- Do not edit code yet. First inspect and report the planned files.\n- Wait for approval before patching."
    : "- Inspect first and report the planned files before patching.\n- After inspection, implementation is allowed if the planned files stay within this task scope.";
  const projectTypeGuidance = buildProjectTypeGuidance(task);

  return `# Game Polish Lab Codex Task

Task name: ${task.presetLabel ?? task.label ?? task.presetId}
Task kind: ${task.taskKind}
Engine: ${task.engine}
Style: ${task.style}
Project type: ${task.projectType}
Area: ${task.area ?? "not specified"}

You are not designing an app UI. This is a game presentation/polish task.

## Problem

${task.problem}

## Target Feel

${task.targetFeel}

## Allowed Files

${formatList(task.allowedFiles)}

## Must Not Touch

${formatList(task.mustNotTouch)}

## Acceptance Criteria

${formatList(task.acceptanceCriteria)}

## Tunable Values

${formatTunableValues(task.tunableValues)}

## Anti-Patterns

${formatList(task.antiPatterns ?? [])}

## Project-Type Guidance

${projectTypeGuidance}

${formatRescueDetails(task)}

## Codex Instructions

${approvalInstruction}
- Keep the change scoped to this task.
- Do not redesign unrelated gameplay, UI, architecture, assets, or systems.
- Do not touch unrelated systems.
- Do not change balance, economy, save logic, auth, damage values, item drops, movement values, or routing unless explicitly listed in the allowed files and acceptance criteria.
- Do not call external AI APIs.
- Visual/game-feel work must be small, measurable, and reversible.

## Definition of Done

${formatList(task.definitionOfDone?.length ? task.definitionOfDone : [
    "The implementation satisfies every acceptance criterion listed above.",
    "The implementation stays within Allowed Files.",
    "No Must Not Touch files are modified.",
    "Any visual/game-feel values are represented as tunable constants or config values.",
    "The final response lists every changed file.",
    "The final response lists every tunable value added or changed."
  ])}

## Notes

${formatList(task.notes ?? [])}

## Required After-Test Notes

After implementation, report:

- What files changed
- What config values were added or used
- What should be manually tuned first
- What visual/game-feel risk remains
- How to verify the change in-game
`;
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "- None listed.";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function formatTunableValues(values: Record<string, string | number | boolean>): string {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return "- None listed.";
  }

  return entries.map(([key, value]) => `- ${key}: ${String(value)}`).join("\n");
}

function buildProjectTypeGuidance(task: PolishTask): string {
  const guidance: string[] = [];

  if (isActionProjectType(task.projectType)) {
    guidance.push("Prioritize readability during gameplay.");
    guidance.push("Keep VFX short and readable.");
    guidance.push("Do not cover the player, enemies, or projectiles with excessive effects.");
    guidance.push("Do not add menu/button work unless this task asks for it.");
  }

  if (isIdleProjectType(task.projectType)) {
    guidance.push("Prioritize hierarchy, resource clarity, upgrade clarity, and icon/card consistency.");
    guidance.push("Do not change economy balance or save fields.");
  }

  if (guidance.length === 0) {
    guidance.push("Keep the work focused on game presentation: pixel-art setup, readability, game feel, VFX, HUD, controls, and Codex-safe polish tasks.");
  }

  return formatList(guidance);
}

function formatRescueDetails(task: PolishTask): string {
  if (task.taskKind !== "rescue") {
    return "";
  }

  return `## Rescue Details

- Project status: ${task.projectStatus ?? "not specified"}
- Main blocker: ${task.mainBlocker ?? "not specified"}
- Rescue goal: ${task.rescueGoal ?? "not specified"}
- Suggested presets: ${(task.suggestedPresets ?? []).join(", ") || "none"}
`;
}
