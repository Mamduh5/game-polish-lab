import * as vscode from "vscode";

import { InspectedFile } from "../types/audit";
import { toWorkspaceRelativePath } from "./workspace";
import { findFilesByPatterns, readTextFileCached, scanWorkspace, WorkspaceScanResult } from "./workspaceScanner";

export interface ScanOptions {
  extensions: string[];
  maxFiles?: number;
  maxFileSizeBytes?: number;
  includeGlobs?: string[];
  token?: vscode.CancellationToken;
}

export async function findFilesByGlobs(globs: string[], maxPerGlob = 50): Promise<vscode.Uri[]> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return [];
  }

  return findFilesByPatterns(globs, { folder, maxFiles: maxPerGlob });
}

export async function scanWorkspaceFiles(folder: vscode.WorkspaceFolder, options: ScanOptions): Promise<WorkspaceScanResult> {
  return scanWorkspace({
    folder,
    patterns: options.includeGlobs,
    extensions: options.extensions,
    maxFiles: options.maxFiles,
    maxFileSizeBytes: options.maxFileSizeBytes,
    token: options.token
  });
}

export async function readFileSnippet(uri: vscode.Uri, maxBytes = 250_000): Promise<string> {
  const result = await readTextFileCached(uri, { maxFileSizeBytes: maxBytes });
  return result.text ?? "";
}

export async function inspectFiles(folder: vscode.WorkspaceFolder, uris: vscode.Uri[], maxBytes = 250_000): Promise<InspectedFile[]> {
  const inspected: InspectedFile[] = [];

  for (const uri of uris) {
    const result = await readTextFileCached(uri, { maxFileSizeBytes: maxBytes });
    if (result.text !== undefined) {
      inspected.push({
        relativePath: toWorkspaceRelativePath(folder, uri),
        text: result.text
      });
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
