import * as vscode from "vscode";

import { getOutputChannel, logCommandEnd, logCommandStart, logError } from "../core/output";
import { defaultExcludedFolders, getCacheStatus, getScanStats, getWorkspacePerformanceMode } from "../core/workspaceScanner";
import { requireWorkspaceFolder } from "../core/workspace";

export async function showPerformanceDiagnostics(): Promise<void> {
  const folder = requireWorkspaceFolder();
  if (!folder) {
    return;
  }
  logCommandStart("gamePolishLab.showPerformanceDiagnostics", folder.uri.fsPath);

  try {
    const mode = await getWorkspacePerformanceMode(folder);
    const stats = getScanStats();
    const cache = getCacheStatus();
    const recommendation = stats?.scanCapped || (stats?.elapsedMs ?? 0) > 5000
      ? "Use Safe mode"
      : cache.fileLists + cache.textFiles + cache.analysisEntries > 0
        ? "Clear cache if results look stale"
        : "Deep mode only for troubleshooting";
    const channel = getOutputChannel();
    channel.appendLine("");
    channel.appendLine("# Game Polish Lab Performance Diagnostics");
    channel.appendLine(`Workspace path: ${folder.uri.fsPath}`);
    channel.appendLine(`Performance mode: ${mode}`);
    channel.appendLine(`Last scan stats: ${stats ? formatStats(stats) : "none"}`);
    channel.appendLine(`Cache status: fileLists=${cache.fileLists}; textFiles=${cache.textFiles}; analysisEntries=${cache.analysisEntries}`);
    channel.appendLine(`Excluded folder count: ${defaultExcludedFolders.length}`);
    channel.appendLine(`Recommendation: ${recommendation}. Clear cache if stale. Deep mode only for troubleshooting.`);
    channel.show(true);
  } catch (error) {
    logError("show performance diagnostics failed:", error);
    vscode.window.showErrorMessage(`Failed to show Game Polish Lab performance diagnostics: ${errorToMessage(error)}`);
  } finally {
    logCommandEnd("gamePolishLab.showPerformanceDiagnostics");
  }
}

function formatStats(stats: NonNullable<ReturnType<typeof getScanStats>>): string {
  return [
    `filesConsidered=${stats.filesConsidered}`,
    `filesRead=${stats.filesRead}`,
    `bytesRead=${stats.bytesRead}`,
    `skippedBySize=${stats.filesSkippedBySize}`,
    `skippedByExclude=${stats.filesSkippedByExclude}`,
    `scanCapped=${stats.scanCapped ? "yes" : "no"}`,
    `partialScan=${stats.partialScan ? "yes" : "no"}`,
    `elapsedMs=${stats.elapsedMs}`
  ].join("; ");
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
