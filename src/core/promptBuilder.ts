import { PolishTask } from "../types/polishTask";

export function buildCodexPrompt(task: PolishTask, options: { requiresApprovalBeforePatch: boolean }): string {
  const approvalInstruction = options.requiresApprovalBeforePatch
    ? "- Do not edit code yet. First inspect and report the planned files.\n- Wait for approval before patching."
    : "- Inspect first and report the planned files before patching.\n- After inspection, implementation is allowed if the planned files stay within this task scope.";

  return `# Game Polish Lab Codex Task

Task name: ${task.label}
Engine: ${task.engine}
Style: ${task.style}
Area: ${task.area}

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

## Codex Instructions

${approvalInstruction}
- Keep the change scoped to this task.
- Do not redesign unrelated gameplay, UI, architecture, assets, or systems.
- Do not touch unrelated systems.
- Do not change balance, economy, save logic, auth, damage values, item drops, movement values, or routing unless explicitly listed in the allowed files and acceptance criteria.
- Do not call external AI APIs.
- Visual/game-feel work must be small, measurable, and reversible.

## Definition of Done

- The implementation satisfies every acceptance criterion listed above.
- The implementation stays within Allowed Files.
- No Must Not Touch files are modified.
- Any visual/game-feel values are represented as tunable constants or config values.
- The final response lists every changed file.
- The final response lists every tunable value added or changed.
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
