import * as vscode from "vscode";

import { readTextFile, toWorkspaceRelativePath } from "./workspace";
import { InspectedFile } from "../types/audit";

const defaultExclude = "{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.game-polish-lab/**,**/coverage/**}";

export async function findFilesByGlobs(globs: string[], maxPerGlob = 50): Promise<vscode.Uri[]> {
  const seen = new Set<string>();
  const results: vscode.Uri[] = [];

  for (const glob of globs) {
    const matches = await vscode.workspace.findFiles(glob, defaultExclude, maxPerGlob);
    for (const match of matches) {
      if (!seen.has(match.fsPath)) {
        seen.add(match.fsPath);
        results.push(match);
      }
    }
  }

  return results;
}

export async function readFileSnippet(uri: vscode.Uri, maxBytes = 250_000): Promise<string> {
  const text = await readTextFile(uri);
  return text.length > maxBytes ? text.slice(0, maxBytes) : text;
}

export async function inspectFiles(folder: vscode.WorkspaceFolder, uris: vscode.Uri[], maxBytes = 250_000): Promise<InspectedFile[]> {
  const inspected: InspectedFile[] = [];

  for (const uri of uris) {
    try {
      inspected.push({
        relativePath: toWorkspaceRelativePath(folder, uri),
        text: await readFileSnippet(uri, maxBytes)
      });
    } catch {
      // Ignore files that disappear or cannot be decoded during the scan.
    }
  }

  return inspected;
}

export function containsPath(pathValue: string, roots: string[]): boolean {
  const normalized = pathValue.replace(/\\/g, "/");
  return roots.some((root) => {
    const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
    return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`);
  });
}
