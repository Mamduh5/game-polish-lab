import { execFile } from "child_process";
import * as vscode from "vscode";

import { containsPath } from "./fileSearch";
import { normalizeWorkspacePath } from "./workspace";
import { PolishTask } from "../types/polishTask";

export interface ScopeCheckResult {
  ok: boolean;
  changedFiles: string[];
  outsideAllowedFiles: string[];
  mustNotTouchFiles: string[];
  message: string;
}

export async function getGitChangedFiles(folder: vscode.WorkspaceFolder): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile("git", ["diff", "--name-only"], { cwd: folder.uri.fsPath }, (error, stdout) => {
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

  const mustNotTouchFiles = normalizedChangedFiles.filter((file) => containsPath(file, mustNotTouch));
  const outsideAllowedFiles = allowedFiles.length === 0
    ? []
    : normalizedChangedFiles.filter((file) => !containsPath(file, allowedFiles));

  const ok = mustNotTouchFiles.length === 0 && outsideAllowedFiles.length === 0;
  const message = ok
    ? "Changed files are inside the latest task scope."
    : "Changed files include paths outside the latest task scope.";

  return {
    ok,
    changedFiles: normalizedChangedFiles,
    outsideAllowedFiles,
    mustNotTouchFiles,
    message
  };
}
