import * as vscode from "vscode";

import { scanWorkspaceFiles } from "./fileSearch";
import { logInfo } from "./output";
import { ProjectType } from "../types/profile";
import { InspectedFile } from "../types/audit";

export interface ProjectTypeSuggestion {
  suggestedProjectType: ProjectType;
  evidence: string[];
  scores: Partial<Record<ProjectType, number>>;
}

const keywords: Record<Exclude<ProjectType, "unknown" | "hybrid">, string[]> = {
  arena_combat: ["arena", "enemy", "wave", "combat", "attack", "damage", "hit", "spawn"],
  top_down_shooter: ["bullet", "projectile", "aim", "weapon", "shoot"],
  survivor_like: ["wave", "enemy", "pickup", "xp", "upgrade", "horde"],
  idle_economy: ["idle", "upgrade", "currency", "production", "generator", "worker", "shop"],
  clicker_incremental: ["click", "button", "tap", "upgrade", "multiplier", "prestige"],
  moba_like: ["skill", "ability", "cooldown", "joystick", "hero", "champion", "lane"],
  mobile_action: ["joystick", "touch", "drag", "mobile", "virtual-stick"]
};

const actionTypes: ProjectType[] = ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "mobile_action"];
const economyTypes: ProjectType[] = ["idle_economy", "clicker_incremental"];

export async function suggestProjectType(folder: vscode.WorkspaceFolder): Promise<ProjectTypeSuggestion> {
  const scan = await scanWorkspaceFiles(folder, {
    extensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs", "css", "html"],
    maxFiles: 1500,
    maxFileSizeBytes: 512 * 1024
  });
  return suggestProjectTypeFromFiles(scan.files);
}

export function suggestProjectTypeFromFiles(files: InspectedFile[]): ProjectTypeSuggestion {
  const scores: Partial<Record<ProjectType, number>> = {};
  const evidence: string[] = [];

  for (const [projectType, terms] of Object.entries(keywords) as Array<[Exclude<ProjectType, "unknown" | "hybrid">, string[]]>) {
    let score = 0;
    const matchedTerms = new Set<string>();
    const matchedFiles = new Set<string>();

    for (const file of files) {
      const haystack = `${file.relativePath}\n${file.text}`.toLowerCase();
      for (const term of terms) {
        if (haystack.includes(term)) {
          score += file.relativePath.toLowerCase().includes(term) ? 2 : 1;
          matchedTerms.add(term);
          matchedFiles.add(file.relativePath);
        }
      }
    }

    if (score > 0) {
      scores[projectType] = score;
      evidence.push(`${projectType}: ${Array.from(matchedTerms).slice(0, 8).join(", ")} in ${Array.from(matchedFiles).slice(0, 5).join(", ")}`);
    }
  }

  const actionScore = actionTypes.reduce((sum, type) => sum + (scores[type] ?? 0), 0);
  const economyScore = economyTypes.reduce((sum, type) => sum + (scores[type] ?? 0), 0);
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[ProjectType, number]>;

  let suggestedProjectType: ProjectType = "unknown";
  if (actionScore >= 6 && economyScore >= 6) {
    suggestedProjectType = "hybrid";
  } else if (sorted[0] && sorted[0][1] >= 3) {
    suggestedProjectType = sorted[0][0];
  }

  logInfo(`project type suggestion: ${suggestedProjectType}; evidence: ${evidence.join(" | ") || "none"}`);
  return {
    suggestedProjectType,
    evidence,
    scores
  };
}

export function isActionProjectType(projectType: ProjectType): boolean {
  return actionTypes.includes(projectType);
}

export function isIdleProjectType(projectType: ProjectType): boolean {
  return economyTypes.includes(projectType);
}
