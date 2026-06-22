import { PolishTask } from "../types/polishTask";

export function buildCodexPrompt(task: PolishTask): string {
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

- Inspect the project first.
- Before editing, list the files you plan to change.
- Keep the change scoped to this task.
- Do not redesign unrelated gameplay, UI, architecture, assets, or systems.
- Do not touch unrelated systems.
- Do not change balance, economy, save logic, auth, damage values, item drops, movement values, or routing unless explicitly listed in the allowed files and acceptance criteria.
- Do not call external AI APIs.
- At the end, list every changed file.
- At the end, list every tunable value you added or changed.
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
