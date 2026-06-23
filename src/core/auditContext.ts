import * as vscode from "vscode";

import { getCachedAnalysis, getWorkspacePerformanceMode } from "./workspaceScanner";
import { labUri, readTextFileIfExists } from "./workspace";
import { ProjectType, RuntimePresentationModel } from "../types/profile";

export interface LatestAuditContext {
  suggestedProjectType?: ProjectType;
  dominantMode?: ProjectType | "unknown";
  runtimePresentationModel?: RuntimePresentationModel;
  secondaryRuntimePresentationModel?: RuntimePresentationModel;
  primaryRoute?: "arena" | "main_dom" | "unknown";
  suggestedTasks?: string[];
  mainRisk?: string;
}

export async function readLatestAuditContext(folder: vscode.WorkspaceFolder): Promise<LatestAuditContext | undefined> {
  const mode = await getWorkspacePerformanceMode(folder);
  const cached = getCachedAnalysis<LatestAuditContext>(folder, "latestAuditSuggestion", mode);
  if (cached?.suggestedProjectType || cached?.dominantMode || cached?.runtimePresentationModel) {
    return cached;
  }

  const markdown = await readTextFileIfExists(labUri(folder, "audits", "latest-phaser-pixel-audit.md"));
  if (!markdown) {
    return undefined;
  }

  return {
    suggestedProjectType: parseProjectType(markdown, /Suggested project type:\s*([a-z_]+)/),
    dominantMode: parseProjectType(markdown, /Dominant mode:\s*([a-z_]+)/) ?? "unknown",
    runtimePresentationModel: parseRuntimeModel(markdown, /Runtime presentation model:\s*([a-z_]+)/),
    secondaryRuntimePresentationModel: parseRuntimeModel(markdown, /Secondary runtime presentation model:\s*([a-z_]+)/),
    primaryRoute: parsePrimaryRoute(markdown),
    suggestedTasks: parseRecommendedKits(markdown)
  };
}

export function hasUsefulAuditProjectType(context: LatestAuditContext | undefined): boolean {
  return context?.suggestedProjectType === "incremental_arena"
    || context?.suggestedProjectType === "cursor_attack_arena"
    || context?.dominantMode === "cursor_attack_arena"
    || context?.suggestedProjectType === "cozy_sort_puzzle"
    || context?.suggestedProjectType === "shelf_sort_puzzle"
    || context?.dominantMode === "tap_to_move_sort_puzzle"
    || context?.suggestedProjectType === "idle_monster_farm"
    || context?.suggestedProjectType === "monster_merge_idle"
    || context?.suggestedProjectType === "phaser_ui_heavy_idle"
    || context?.dominantMode === "tap_farm_idle"
    || context?.dominantMode === "monster_merge_idle"
    || context?.dominantMode === "phaser_ui_heavy_idle";
}

export function resolveAuditBackedProjectType(profileProjectType: ProjectType, context: LatestAuditContext | undefined): ProjectType {
  if (profileProjectType !== "unknown") {
    return profileProjectType;
  }
  return context?.suggestedProjectType ?? (context?.dominantMode && context.dominantMode !== "unknown" ? context.dominantMode : "unknown");
}

export function resolveAuditBackedRuntimeModel(current: RuntimePresentationModel, context: LatestAuditContext | undefined): RuntimePresentationModel {
  return current !== "unknown" ? current : context?.runtimePresentationModel ?? "unknown";
}

export function resolveAuditBackedDominantMode(context: LatestAuditContext | undefined): ProjectType | "unknown" {
  return context?.dominantMode ?? "unknown";
}

function parseRecommendedKits(markdown: string): string[] {
  const section = /## Recommended Kits\s+([\s\S]*?)(?:\n## |\s*$)/.exec(markdown)?.[1] ?? "";
  return section.split(/\r?\n/)
    .map((line) => /^-\s+(.+)$/.exec(line.trim())?.[1])
    .filter((value): value is string => Boolean(value));
}

function parsePrimaryRoute(markdown: string): LatestAuditContext["primaryRoute"] {
  const match = /Primary polish route:\s*([a-zA-Z _-]+)/.exec(markdown);
  const value = match?.[1]?.trim().toLowerCase().replace(/\s+/g, "_");
  if (value === "arena" || value === "main_dom" || value === "unknown") {
    return value;
  }
  return undefined;
}

function parseProjectType(markdown: string, pattern: RegExp): ProjectType | undefined {
  const match = pattern.exec(markdown);
  return isProjectType(match?.[1]) ? match[1] : undefined;
}

function parseRuntimeModel(markdown: string, pattern: RegExp): RuntimePresentationModel | undefined {
  const match = pattern.exec(markdown);
  return isRuntimePresentationModel(match?.[1]) ? match[1] : undefined;
}

function isProjectType(value: unknown): value is ProjectType {
  return value === "unknown"
    || value === "arena_combat"
    || value === "top_down_shooter"
    || value === "survivor_like"
    || value === "idle_economy"
    || value === "clicker_incremental"
    || value === "moba_like"
    || value === "mobile_action"
    || value === "incremental_arena"
    || value === "cursor_attack_arena"
    || value === "phaser_dom_hud"
    || value === "cozy_sort_puzzle"
    || value === "shelf_sort_puzzle"
    || value === "tap_to_move_sort_puzzle"
    || value === "idle_monster_farm"
    || value === "monster_merge_idle"
    || value === "phaser_ui_heavy_idle"
    || value === "tap_farm_idle"
    || value === "hybrid";
}

function isRuntimePresentationModel(value: unknown): value is RuntimePresentationModel {
  return value === "phaser_rendered"
    || value === "phaser_rendered_ui_heavy"
    || value === "dom_rendered"
    || value === "phaser_timer_dom_ui"
    || value === "phaser_rendered_dom_hud"
    || value === "unknown";
}
