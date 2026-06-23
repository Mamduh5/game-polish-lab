import * as vscode from "vscode";

import { logInfo, logWarn } from "./output";
import { labUri, pathExists, readJsonFileIfExists, toWorkspaceRelativePath } from "./workspace";
import { InspectedFile } from "../types/audit";
import { PerformanceMode, ProjectProfile } from "../types/profile";

export interface ScanBudget {
  maxFiles: number;
  maxFileSizeBytes: number;
  maxTotalBytesRead: number;
  maxScanMs: number;
  maxEvidencePerCategory: number;
  maxInspectedFilesInReport: number;
}

export interface ScanStats {
  performanceMode: PerformanceMode;
  filesConsidered: number;
  filesRead: number;
  bytesRead: number;
  filesSkippedBySize: number;
  filesSkippedByExclude: number;
  filesSkippedByBudget: number;
  unreadableFiles: number;
  binaryFilesSkipped: number;
  scanCapped: boolean;
  partialScan: boolean;
  cancelled: boolean;
  elapsedMs: number;
  excludedFolderCount: number;
  maxEvidencePerCategory: number;
  maxInspectedFilesInReport: number;
  cacheHits: number;
  cacheEntries: number;
}

export interface WorkspaceScanResult {
  files: InspectedFile[];
  skippedFiles: string[];
  totalMatches: number;
  stats: ScanStats;
}

export interface WorkspaceScanOptions {
  folder: vscode.WorkspaceFolder;
  patterns?: string[];
  extensions?: string[];
  maxFiles?: number;
  maxFileSizeBytes?: number;
  maxTotalBytesRead?: number;
  maxScanMs?: number;
  includeAssets?: boolean;
  includeDesignDocs?: boolean;
  mode?: PerformanceMode;
  force?: boolean;
  token?: vscode.CancellationToken;
}

interface FileListCacheEntry {
  uris: vscode.Uri[];
  totalMatches: number;
}

interface TextCacheEntry {
  text: string;
  size: number;
  mtime: number;
}

export class ScanCancelledError extends Error {
  public constructor() {
    super("Game Polish Lab scan cancelled.");
  }
}

export const defaultExcludedFolders = [
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  ".git",
  ".vscode",
  ".next",
  "public/build",
  "vendor",
  "temp",
  "tmp",
  "logs",
  ".game-polish-lab/kits",
  ".game-polish-lab/trials",
  ".game-polish-lab/audits",
  ".game-polish-lab/prompts",
  "assets",
  "public/assets",
  "static/assets"
];

export const prioritySourcePatterns = [
  "package.json",
  "index.html",
  "arena.html",
  "src/main.{js,ts,jsx,tsx,mjs,cjs}",
  "src/**/main.{js,ts,jsx,tsx,mjs,cjs}",
  "src/**/scenes/**",
  "src/**/systems/**",
  "src/**/ui/**",
  "src/**/data/**",
  "src/**/config/**",
  "scripts/*.js",
  "src/**/*.{js,ts,jsx,tsx,mjs,cjs}",
  "src/**/*.css",
  "src/**/*.html",
  "*.{html,css}",
  "docs/**/*.{md,html,css,js,ts}",
  "design/**/*.{md,html,css,js,ts}",
  "mockups/**/*.{md,html,css,js,ts}"
];

const budgetsByMode: Record<PerformanceMode, ScanBudget> = {
  safe: {
    maxFiles: 400,
    maxFileSizeBytes: 160_000,
    maxTotalBytesRead: 5 * 1024 * 1024,
    maxScanMs: 5000,
    maxEvidencePerCategory: 8,
    maxInspectedFilesInReport: 80
  },
  balanced: {
    maxFiles: 900,
    maxFileSizeBytes: 256_000,
    maxTotalBytesRead: 12 * 1024 * 1024,
    maxScanMs: 5000,
    maxEvidencePerCategory: 8,
    maxInspectedFilesInReport: 80
  },
  deep: {
    maxFiles: 2000,
    maxFileSizeBytes: 512_000,
    maxTotalBytesRead: 30 * 1024 * 1024,
    maxScanMs: 5000,
    maxEvidencePerCategory: 8,
    maxInspectedFilesInReport: 80
  }
};

const textDecoder = new TextDecoder("utf-8", { fatal: false });
const fileListCache = new Map<string, FileListCacheEntry>();
const textCache = new Map<string, TextCacheEntry>();
const analysisCache = new Map<string, unknown>();
let lastStats: ScanStats | undefined;

export function getBudgetForMode(mode: PerformanceMode): ScanBudget {
  return budgetsByMode[mode];
}

export async function getWorkspacePerformanceMode(folder: vscode.WorkspaceFolder): Promise<PerformanceMode> {
  const profile = await readJsonFileIfExists<Partial<ProjectProfile>>(labUri(folder, "profile.json"));
  return normalizePerformanceMode(profile?.performanceMode);
}

export async function scanWorkspace(options: WorkspaceScanOptions): Promise<WorkspaceScanResult> {
  const mode = options.mode ?? await getWorkspacePerformanceMode(options.folder);
  const baseBudget = getBudgetForMode(mode);
  const budget: ScanBudget = {
    ...baseBudget,
    maxFiles: options.maxFiles ?? baseBudget.maxFiles,
    maxFileSizeBytes: options.maxFileSizeBytes ?? baseBudget.maxFileSizeBytes,
    maxTotalBytesRead: options.maxTotalBytesRead ?? baseBudget.maxTotalBytesRead,
    maxScanMs: options.maxScanMs ?? baseBudget.maxScanMs
  };
  const start = Date.now();
  const patterns = options.patterns ?? (options.extensions ? [extensionGlob(options.extensions)] : prioritySourcePatterns);
  const stats = createEmptyStats(mode);
  stats.maxEvidencePerCategory = budget.maxEvidencePerCategory;
  stats.maxInspectedFilesInReport = budget.maxInspectedFilesInReport;
  const skippedFiles: string[] = [];
  const files: InspectedFile[] = [];

  const uris = await findFilesByPatterns(patterns, {
    ...options,
    mode,
    maxFiles: budget.maxFiles,
    force: options.force
  });
  stats.filesConsidered = uris.length;

  for (const uri of uris) {
    throwIfCancelled(options.token, stats);
    stats.elapsedMs = Date.now() - start;
    if (stats.elapsedMs > budget.maxScanMs) {
      stats.scanCapped = true;
      stats.partialScan = true;
      stats.filesSkippedByBudget += Math.max(uris.length - files.length, 0);
      break;
    }
    if (files.length >= budget.maxFiles) {
      stats.scanCapped = true;
      stats.partialScan = true;
      stats.filesSkippedByBudget += Math.max(uris.length - files.length, 0);
      break;
    }

    const relativePath = toWorkspaceRelativePath(options.folder, uri);
    if (relativePath.startsWith("..") || relativePath.includes(":/")) {
      skippedFiles.push(`${uri.fsPath} (outside workspace)`);
      stats.filesSkippedByExclude += 1;
      continue;
    }
    if (shouldExcludePath(relativePath, options)) {
      skippedFiles.push(`${relativePath} (excluded)`);
      stats.filesSkippedByExclude += 1;
      continue;
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > budget.maxFileSizeBytes) {
        skippedFiles.push(`${relativePath} (${stat.size} bytes, over limit)`);
        stats.filesSkippedBySize += 1;
        continue;
      }
      if (stats.bytesRead + stat.size > budget.maxTotalBytesRead) {
        stats.scanCapped = true;
        stats.partialScan = true;
        stats.filesSkippedByBudget += 1;
        break;
      }

      const cached = await readTextFileCached(uri, { maxFileSizeBytes: budget.maxFileSizeBytes, token: options.token, force: options.force });
      stats.cacheHits += cached.fromCache ? 1 : 0;
      if (cached.binary) {
        skippedFiles.push(`${relativePath} (binary-looking content)`);
        stats.binaryFilesSkipped += 1;
        continue;
      }
      if (cached.text === undefined) {
        skippedFiles.push(`${relativePath} (unreadable)`);
        stats.unreadableFiles += 1;
        continue;
      }

      stats.bytesRead += stat.size;
      stats.filesRead += 1;
      files.push({
        relativePath,
        text: cached.text,
        sizeBytes: stat.size
      });
    } catch (error) {
      skippedFiles.push(`${relativePath} (unreadable)`);
      stats.unreadableFiles += 1;
      logWarn(`skipped unreadable file: ${relativePath} ${errorToMessage(error)}`);
    }
  }

  stats.elapsedMs = Date.now() - start;
  stats.excludedFolderCount = defaultExcludedFolders.length;
  stats.cacheEntries = textCache.size + fileListCache.size + analysisCache.size;
  if (uris.length >= budget.maxFiles) {
    stats.scanCapped = true;
    stats.partialScan = true;
  }
  lastStats = stats;
  logInfo(`workspace scan inspected ${files.length} files; skipped ${skippedFiles.length}; mode=${mode}; capped=${String(stats.scanCapped)}.`);

  return {
    files,
    skippedFiles,
    totalMatches: uris.length,
    stats
  };
}

export async function findFilesByPatterns(patterns: string[], options: Omit<WorkspaceScanOptions, "patterns">): Promise<vscode.Uri[]> {
  const mode = options.mode ?? await getWorkspacePerformanceMode(options.folder);
  const maxFiles = options.maxFiles ?? getBudgetForMode(mode).maxFiles;
  const cacheKey = fileListCacheKey(options.folder, patterns, mode, options.includeAssets, options.includeDesignDocs);
  if (!options.force) {
    const cached = fileListCache.get(cacheKey);
    if (cached) {
      return cached.uris.slice(0, maxFiles);
    }
  }

  const seen = new Set<string>();
  const results: vscode.Uri[] = [];
  let totalMatches = 0;

  for (const pattern of patterns) {
    throwIfCancelled(options.token);
    if (!options.includeDesignDocs && isDesignDocsPattern(pattern)) {
      continue;
    }
    const remaining = Math.max(maxFiles - results.length, 0);
    if (remaining <= 0) {
      break;
    }
    const matches = await vscode.workspace.findFiles(pattern, buildExcludeGlob(options.includeAssets), remaining);
    totalMatches += matches.length;
    for (const match of matches) {
      const relativePath = toWorkspaceRelativePath(options.folder, match);
      if (seen.has(match.fsPath) || shouldExcludePath(relativePath, options)) {
        continue;
      }
      seen.add(match.fsPath);
      results.push(match);
      if (results.length >= maxFiles) {
        break;
      }
    }
  }

  fileListCache.set(cacheKey, { uris: results, totalMatches });
  return results;
}

export async function readTextFileCached(
  uri: vscode.Uri,
  options: { maxFileSizeBytes?: number; token?: vscode.CancellationToken; force?: boolean } = {}
): Promise<{ text?: string; binary: boolean; fromCache: boolean }> {
  throwIfCancelled(options.token);
  const stat = await vscode.workspace.fs.stat(uri);
  if (options.maxFileSizeBytes && stat.size > options.maxFileSizeBytes) {
    return { binary: false, fromCache: false };
  }

  const cacheKey = uri.fsPath;
  const cached = textCache.get(cacheKey);
  if (!options.force && cached && cached.size === stat.size && cached.mtime === stat.mtime) {
    return { text: cached.text, binary: false, fromCache: true };
  }

  const bytes = await vscode.workspace.fs.readFile(uri);
  if (isLikelyBinary(bytes)) {
    return { binary: true, fromCache: false };
  }

  const text = textDecoder.decode(bytes);
  textCache.set(cacheKey, { text, size: stat.size, mtime: stat.mtime });
  return { text, binary: false, fromCache: false };
}

export function clearScanCache(): void {
  fileListCache.clear();
  textCache.clear();
  analysisCache.clear();
  lastStats = undefined;
}

export function getScanStats(): ScanStats | undefined {
  return lastStats ? { ...lastStats } : undefined;
}

export function getCacheStatus(): { fileLists: number; textFiles: number; analysisEntries: number } {
  return {
    fileLists: fileListCache.size,
    textFiles: textCache.size,
    analysisEntries: analysisCache.size
  };
}

export function getCachedAnalysis<T>(folder: vscode.WorkspaceFolder, key: string, mode: PerformanceMode): T | undefined {
  return analysisCache.get(`${folder.uri.fsPath}|${mode}|${key}`) as T | undefined;
}

export function setCachedAnalysis(folder: vscode.WorkspaceFolder, key: string, mode: PerformanceMode, value: unknown): void {
  analysisCache.set(`${folder.uri.fsPath}|${mode}|${key}`, value);
}

export function renderScanStatsMarkdown(stats: ScanStats | undefined): string {
  if (!stats) {
    return `## Scan Stats

* Performance mode: safe
* Files considered: 0
* Files read: 0
* Bytes read: 0
* Files skipped by size: 0
* Files skipped by exclude: 0
* Scan capped: no
* Partial scan: no
`;
  }

  return `## Scan Stats

* Performance mode: ${stats.performanceMode}
* Files considered: ${stats.filesConsidered}
* Files read: ${stats.filesRead}
* Bytes read: ${stats.bytesRead}
* Files skipped by size: ${stats.filesSkippedBySize}
* Files skipped by exclude: ${stats.filesSkippedByExclude}
* Scan capped: ${stats.scanCapped ? "yes" : "no"}
* Partial scan: ${stats.partialScan ? "yes" : "no"}
`;
}

export function scanWasCappedMessage(stats: ScanStats | undefined): string {
  return stats?.partialScan ? "Scan was capped for performance. Results may be incomplete." : "";
}

export async function workspaceFileExists(folder: vscode.WorkspaceFolder, relativePath: string): Promise<boolean> {
  return pathExists(vscode.Uri.joinPath(folder.uri, ...relativePath.split("/")));
}

function createEmptyStats(mode: PerformanceMode): ScanStats {
  return {
    performanceMode: mode,
    filesConsidered: 0,
    filesRead: 0,
    bytesRead: 0,
    filesSkippedBySize: 0,
    filesSkippedByExclude: 0,
    filesSkippedByBudget: 0,
    unreadableFiles: 0,
    binaryFilesSkipped: 0,
    scanCapped: false,
    partialScan: false,
    cancelled: false,
    elapsedMs: 0,
    excludedFolderCount: defaultExcludedFolders.length,
    maxEvidencePerCategory: getBudgetForMode(mode).maxEvidencePerCategory,
    maxInspectedFilesInReport: getBudgetForMode(mode).maxInspectedFilesInReport,
    cacheHits: 0,
    cacheEntries: 0
  };
}

function throwIfCancelled(token?: vscode.CancellationToken, stats?: ScanStats): void {
  if (token?.isCancellationRequested) {
    if (stats) {
      stats.cancelled = true;
      stats.partialScan = true;
      lastStats = stats;
    }
    throw new ScanCancelledError();
  }
}

function buildExcludeGlob(includeAssets = false): string {
  const excluded = includeAssets
    ? defaultExcludedFolders.filter((folder) => !folder.endsWith("assets") && folder !== "assets")
    : defaultExcludedFolders;
  return `{${excluded.map((folder) => `**/${folder}/**`).join(",")}}`;
}

function shouldExcludePath(relativePath: string, options: Pick<WorkspaceScanOptions, "includeAssets" | "includeDesignDocs">): boolean {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
  if (!options.includeDesignDocs && /(^|\/)(docs?|design|mockups?)(\/|$)/i.test(normalized)) {
    return true;
  }
  return defaultExcludedFolders.some((folder) => {
    const normalizedFolder = folder.toLowerCase();
    if (options.includeAssets && (normalizedFolder === "assets" || normalizedFolder.endsWith("/assets"))) {
      return false;
    }
    return normalized === normalizedFolder || normalized.startsWith(`${normalizedFolder}/`) || normalized.includes(`/${normalizedFolder}/`);
  });
}

function isDesignDocsPattern(pattern: string): boolean {
  return /(^|\/)(docs?|design|mockups?)(\/|$)/i.test(pattern);
}

function extensionGlob(extensions: string[]): string {
  const cleaned = extensions.map((extension) => extension.replace(/^\./, ""));
  return cleaned.length === 1 ? `**/*.${cleaned[0]}` : `**/*.{${cleaned.join(",")}}`;
}

function fileListCacheKey(
  folder: vscode.WorkspaceFolder,
  patterns: string[],
  mode: PerformanceMode,
  includeAssets: boolean | undefined,
  includeDesignDocs: boolean | undefined
): string {
  return [
    folder.uri.fsPath,
    mode,
    includeAssets ? "assets" : "no-assets",
    includeDesignDocs ? "docs" : "no-docs",
    patterns.join("|")
  ].join("::");
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

function normalizePerformanceMode(value: unknown): PerformanceMode {
  return value === "balanced" || value === "deep" || value === "safe" ? value : "safe";
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
