import * as vscode from "vscode";

import { logInfo, logWarn } from "./output";
import { readTextFile, toWorkspaceRelativePath } from "./workspace";
import { InspectedFile } from "../types/audit";

const defaultExclude = "{**/node_modules/**,**/.git/**,**/.vscode/**,**/dist/**,**/build/**,**/.game-polish-lab/**,**/coverage/**,**/.next/**,**/out/**}";
const textDecoder = new TextDecoder("utf-8", { fatal: false });

export interface ScanOptions {
  extensions: string[];
  maxFiles?: number;
  maxFileSizeBytes?: number;
  includeGlobs?: string[];
}

export interface WorkspaceScanResult {
  files: InspectedFile[];
  skippedFiles: string[];
  totalMatches: number;
}

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

export async function scanWorkspaceFiles(folder: vscode.WorkspaceFolder, options: ScanOptions): Promise<WorkspaceScanResult> {
  const maxFiles = options.maxFiles ?? 1500;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? 512 * 1024;
  const globs = options.includeGlobs ?? [extensionGlob(options.extensions)];
  const uris = await findFilesByGlobs(globs, maxFiles);
  const limitedUris = uris.slice(0, maxFiles);
  const files: InspectedFile[] = [];
  const skippedFiles: string[] = [];

  if (uris.length > maxFiles) {
    logWarn(`workspace scan capped at ${maxFiles} files; ${uris.length - maxFiles} matches omitted.`);
  }

  for (const uri of limitedUris) {
    const relativePath = toWorkspaceRelativePath(folder, uri);
    if (relativePath.startsWith("..") || relativePath.includes(":/")) {
      skippedFiles.push(`${uri.fsPath} (outside workspace)`);
      logWarn(`skipped file outside workspace: ${uri.fsPath}`);
      continue;
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > maxFileSizeBytes) {
        skippedFiles.push(`${relativePath} (${stat.size} bytes, over limit)`);
        continue;
      }

      const bytes = await vscode.workspace.fs.readFile(uri);
      if (isLikelyBinary(bytes)) {
        skippedFiles.push(`${relativePath} (binary-looking content)`);
        continue;
      }

      files.push({
        relativePath,
        text: textDecoder.decode(bytes),
        sizeBytes: stat.size
      });
    } catch (error) {
      skippedFiles.push(`${relativePath} (unreadable)`);
      logWarn(`skipped unreadable file: ${relativePath} ${errorToMessage(error)}`);
    }
  }

  logInfo(`workspace scan inspected ${files.length} files; skipped ${skippedFiles.length}.`);
  return {
    files,
    skippedFiles,
    totalMatches: uris.length
  };
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

function extensionGlob(extensions: string[]): string {
  const cleaned = extensions.map((extension) => extension.replace(/^\./, ""));
  return cleaned.length === 1 ? `**/*.${cleaned[0]}` : `**/*.{${cleaned.join(",")}}`;
}

function isLikelyBinary(bytes: Uint8Array): boolean {
  const sampleLength = Math.min(bytes.length, 1024);
  for (let index = 0; index < sampleLength; index += 1) {
    if (bytes[index] === 0) {
      return true;
    }
  }

  return false;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
