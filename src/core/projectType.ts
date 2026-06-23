import * as vscode from "vscode";

import { logInfo } from "./output";
import { getCachedAnalysis, getWorkspacePerformanceMode, scanWorkspace, setCachedAnalysis } from "./workspaceScanner";
import { ProjectType } from "../types/profile";
import { InspectedFile } from "../types/audit";

export interface ProjectTypeSuggestion {
  suggestedProjectType: ProjectType;
  evidence: string[];
  scores: Partial<Record<ProjectType, number>>;
  dominantMode: ProjectType | "unknown";
  secondaryMode: string;
}

const keywords: Record<Exclude<ProjectType, "unknown" | "hybrid">, string[]> = {
  arena_combat: ["arena", "enemy", "wave", "combat", "attack", "damage", "hit", "spawn"],
  top_down_shooter: ["bullet", "projectile", "aim", "weapon", "shoot"],
  survivor_like: ["wave", "enemy", "pickup", "xp", "upgrade", "horde"],
  idle_economy: ["idle", "upgrade", "currency", "production", "generator", "worker", "shop"],
  clicker_incremental: ["click", "button", "tap", "upgrade", "multiplier", "prestige"],
  moba_like: ["skill", "ability", "cooldown", "joystick", "hero", "champion", "lane"],
  mobile_action: ["joystick", "touch", "drag", "mobile", "virtual-stick"],
  incremental_arena: ["wave", "energy", "upgrade", "reward", "combo", "totaldefeated", "arenaupgradelist", "upgradepanel", "arenahud", "savesystem", "arenabalanceconfig", "helper cursor", "persistent progress"],
  cursor_attack_arena: ["cursorattacksystem", "handlepointerdown", "pointerdown", "clickradius", "clickdamage", "helperclick", "showimpact", "showcursorflash", "hitimpactscale", "missimpactscale", "arenamount", "arena.cursorattack.attack"],
  phaser_dom_hud: ["arena.html", "arenamount", "arena-status", "arenaupgradelist", "arenaskinselect", "arenamutebtn", "arenaresetbtn", "src/arena/ui/arenahud.js", "src/arena/ui/upgradepanel.js"]
};

const actionTypes: ProjectType[] = ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "mobile_action", "cursor_attack_arena", "incremental_arena"];
const economyTypes: ProjectType[] = ["idle_economy", "clicker_incremental", "incremental_arena", "phaser_dom_hud"];

export async function suggestProjectType(folder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<ProjectTypeSuggestion> {
  const mode = await getWorkspacePerformanceMode(folder);
  const cached = getCachedAnalysis<ProjectTypeSuggestion>(folder, "projectType", mode);
  if (cached) {
    return cached;
  }

  const scan = await scanWorkspace({ folder, token });
  const suggestion = suggestProjectTypeFromFiles(scan.files);
  setCachedAnalysis(folder, "projectType", mode, suggestion);
  return suggestion;
}

export function suggestProjectTypeFromFiles(files: InspectedFile[]): ProjectTypeSuggestion {
  const scores: Partial<Record<ProjectType, number>> = {};
  const evidence: string[] = [];

  for (const [projectType, terms] of Object.entries(keywords) as Array<[Exclude<ProjectType, "unknown" | "hybrid">, string[]]>) {
    let score = 0;
    const matchedTerms = new Set<string>();
    const matchedFiles = new Set<string>();

    for (const file of files.filter(isProjectSignalFile)) {
      const haystack = `${file.relativePath}\n${file.text}`.toLowerCase();
      for (const term of terms) {
        if (haystack.includes(term)) {
          const sourceWeight = /\.(js|ts|mjs|cjs)$/i.test(file.relativePath) ? 2 : 1;
          const highWeight = projectType === "cursor_attack_arena" || projectType === "incremental_arena" || projectType === "phaser_dom_hud" ? 3 : 1;
          score += (file.relativePath.toLowerCase().includes(term) ? 2 : 1) * sourceWeight * highWeight;
          matchedTerms.add(term);
          matchedFiles.add(file.relativePath);
          if (matchedTerms.size >= 8 && matchedFiles.size >= 8) {
            break;
          }
        }
      }
    }

    if (score > 0) {
      scores[projectType] = score;
      evidence.push(`${projectType}: ${Array.from(matchedTerms).slice(0, 8).join(", ")} in ${Array.from(matchedFiles).slice(0, 8).join(", ")}`);
    }
  }

  const actionScore = actionTypes.reduce((sum, type) => sum + (scores[type] ?? 0), 0);
  const economyScore = economyTypes.reduce((sum, type) => sum + (scores[type] ?? 0), 0);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[ProjectType, number]>;

  let suggestedProjectType: ProjectType = "unknown";
  const cursorScore = scores.cursor_attack_arena ?? 0;
  const incrementalScore = scores.incremental_arena ?? 0;
  const phaserDomHudScore = scores.phaser_dom_hud ?? 0;
  if (incrementalScore >= 18 && cursorScore >= 12) {
    suggestedProjectType = "incremental_arena";
  } else if (cursorScore >= 12) {
    suggestedProjectType = "cursor_attack_arena";
  } else if (phaserDomHudScore >= 12) {
    suggestedProjectType = "phaser_dom_hud";
  } else if (actionScore >= 6 && economyScore >= 6) {
    suggestedProjectType = "hybrid";
  } else if (sorted[0] && sorted[0][1] >= 3) {
    suggestedProjectType = sorted[0][0];
  }

  const hasProjectileSystem = (scores.top_down_shooter ?? 0) >= 10;
  if ((suggestedProjectType === "cursor_attack_arena" || suggestedProjectType === "incremental_arena") && !hasProjectileSystem) {
    delete scores.top_down_shooter;
  }

  const dominantMode: ProjectType | "unknown" = cursorScore >= 12 ? "cursor_attack_arena" : suggestedProjectType;
  const secondaryMode = incrementalScore >= 12 ? "idle/incremental economy or upgrade HUD" : phaserDomHudScore >= 12 ? "DOM HUD/shop controls" : "none";

  logInfo(`project type suggestion: ${suggestedProjectType}; evidence: ${evidence.join(" | ") || "none"}`);
  return {
    suggestedProjectType,
    evidence: evidence.slice(0, 8),
    scores,
    dominantMode,
    secondaryMode
  };
}

export function isActionProjectType(projectType: ProjectType): boolean {
  return actionTypes.includes(projectType);
}

export function isIdleProjectType(projectType: ProjectType): boolean {
  return economyTypes.includes(projectType);
}

function isProjectSignalFile(file: InspectedFile): boolean {
  return !file.relativePath.startsWith(".game-polish-lab/")
    && !/(^|\/)(docs?|mockups?|design)(\/|$)/i.test(file.relativePath);
}
