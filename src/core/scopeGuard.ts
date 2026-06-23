import { execFile } from "child_process";
import * as vscode from "vscode";

import { containsPath } from "./fileSearch";
import { normalizeWorkspacePath } from "./workspace";
import { PolishTask } from "../types/polishTask";

export interface ScopeCheckResult {
  ok: boolean;
  changedFiles: string[];
  allowedChanges: string[];
  suspiciousChanges: string[];
  forbiddenChanges: string[];
  message: string;
}

export async function getGitChangedFiles(folder: vscode.WorkspaceFolder): Promise<string[]> {
  const [unstaged, staged, untracked] = await Promise.all([
    runGitNameList(folder, ["diff", "--name-only"]),
    runGitNameList(folder, ["diff", "--name-only", "--cached"]),
    runGitNameList(folder, ["ls-files", "--others", "--exclude-standard"])
  ]);
  return Array.from(new Set([...unstaged, ...staged, ...untracked])).sort();
}

function runGitNameList(folder: vscode.WorkspaceFolder, args: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: folder.uri.fsPath }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
    });
  });
}

export function checkChangedFilesAgainstTask(changedFiles: string[], task: PolishTask): ScopeCheckResult {
  const normalizedChangedFiles = changedFiles.map(normalizeWorkspacePath);
  const allowedFiles = task.allowedFiles.map(normalizeWorkspacePath).filter(Boolean);
  const mustNotTouch = task.mustNotTouch.map(normalizeWorkspacePath).filter(Boolean);

  const forbiddenChanges = normalizedChangedFiles.filter((file) => containsPath(file, mustNotTouch));
  const suspiciousChanges = allowedFiles.length === 0
    ? []
    : normalizedChangedFiles.filter((file) => !containsPath(file, allowedFiles) && !forbiddenChanges.includes(file));
  const allowedChanges = normalizedChangedFiles.filter((file) => !forbiddenChanges.includes(file) && !suspiciousChanges.includes(file));

  const ok = forbiddenChanges.length === 0 && suspiciousChanges.length === 0;
  const message = ok
    ? "Changed files are inside the latest task scope."
    : "Changed files include paths outside the latest task scope.";

  return {
    ok,
    changedFiles: normalizedChangedFiles,
    allowedChanges,
    suspiciousChanges,
    forbiddenChanges,
    message
  };
}

export function renderScopeCheckMarkdown(task: PolishTask, result: ScopeCheckResult): string {
  return `# Game Polish Lab - Codex Scope Check

## Summary

- Task: ${task.id} (${task.presetLabel ?? task.label ?? task.presetId})
- Task kind: ${task.taskKind ?? "polish"}
- Project type: ${task.projectType ?? "unknown"}
- Result: ${result.ok ? "ok" : "review needed"}
- Changed files: ${result.changedFiles.length}
- Allowed changes: ${result.allowedChanges.length}
- Suspicious changes: ${result.suspiciousChanges.length}
- Forbidden changes: ${result.forbiddenChanges.length}

## Allowed Changes

${formatList(result.allowedChanges)}

## Suspicious Changes

${formatList(result.suspiciousChanges)}

## Forbidden Changes

${formatList(result.forbiddenChanges)}

## Allowed Files

${formatList(task.allowedFiles)}

## Must Not Touch

${formatList(task.mustNotTouch)}
`;
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}
