import * as vscode from "vscode";

import { LatestAuditContext, resolveAuditBackedDominantMode, resolveAuditBackedProjectType, resolveAuditBackedRuntimeModel } from "./auditContext";
import { renderFieldNotesSection } from "./fieldNotes";
import { isMonsterFarmType, monsterFarmIdentityMetadataWarning, monsterFarmManualTestMatrix, renderMonsterFarmPromptGuardrail } from "./monsterFarmDeepAudit";
import { getNextNumberedFilename } from "./trialReports";
import { ensureDirectory, labUri, writeJsonFile, writeTextFile } from "./workspace";
import { ProjectProfile } from "../types/profile";
import {
  AffectedScope,
  PreviousPatchResult,
  RollbackScope,
  RollbackWorseArea,
  TuningExperimentTask,
  TuningExperimentType,
  VisualArea,
  VisualDiagnosisTask,
  VisualSymptom
} from "../types/visualContracts";

export interface VisualDiagnosisInput {
  area: VisualArea;
  symptom: VisualSymptom;
  observation: string;
  affectedScope: AffectedScope;
  affectedSkins: string[];
  previousPatchResult: PreviousPatchResult;
  rollbackReference: string;
  fieldNotes: string[];
}

export interface TuningExperimentInput {
  diagnosis: VisualDiagnosisTask;
  diagnosisTaskId: string;
  experimentType: TuningExperimentType;
  expectedResult: string;
  rollbackReference: string;
  fieldNotes: string[];
}

export interface RollbackPromptInput {
  whatGotWorse: RollbackWorseArea;
  rollbackScope: RollbackScope;
  linkedReference?: string;
  fieldNotes: string[];
}

export async function createVisualDiagnosisFiles(
  folder: vscode.WorkspaceFolder,
  profile: ProjectProfile,
  audit: LatestAuditContext | undefined,
  input: VisualDiagnosisInput
): Promise<{ task: VisualDiagnosisTask; jsonUri: vscode.Uri; promptUri: vscode.Uri }> {
  await ensureDirectory(labUri(folder, "diagnostics"));
  const fileName = await getNextNumberedFilename(folder, "diagnostics", `${input.area.replace(/_/g, "-")}-diagnosis.json`);
  const task = buildVisualDiagnosisTask(profile, audit, input);
  const jsonUri = labUri(folder, "diagnostics", fileName);
  const promptUri = labUri(folder, "diagnostics", fileName.replace(/\.json$/, "-prompt.md"));
  await writeJsonFile(jsonUri, task);
  await writeTextFile(promptUri, buildVisualDiagnosisPrompt(task, input.fieldNotes));
  return { task, jsonUri, promptUri };
}

export async function createTuningExperimentFiles(
  folder: vscode.WorkspaceFolder,
  input: TuningExperimentInput
): Promise<{ task: TuningExperimentTask; jsonUri: vscode.Uri; promptUri: vscode.Uri }> {
  await ensureDirectory(labUri(folder, "experiments"));
  const fileName = await getNextNumberedFilename(folder, "experiments", `${input.diagnosis.area.replace(/_/g, "-")}-experiment.json`);
  const task = buildTuningExperimentTask(input);
  const jsonUri = labUri(folder, "experiments", fileName);
  const promptUri = labUri(folder, "experiments", fileName.replace(/\.json$/, "-prompt.md"));
  await writeJsonFile(jsonUri, task);
  await writeTextFile(promptUri, buildTuningExperimentPrompt(task, input.diagnosis, input.fieldNotes));
  return { task, jsonUri, promptUri };
}

export async function createRollbackPromptFile(folder: vscode.WorkspaceFolder, input: RollbackPromptInput): Promise<vscode.Uri> {
  await ensureDirectory(labUri(folder, "rollbacks"));
  const fileName = await getNextNumberedFilename(folder, "rollbacks", "rollback-prompt.md");
  const uri = labUri(folder, "rollbacks", fileName);
  await writeTextFile(uri, buildRollbackPrompt(input));
  return uri;
}

export function buildVisualDiagnosisTask(profile: ProjectProfile, audit: LatestAuditContext | undefined, input: VisualDiagnosisInput): VisualDiagnosisTask {
  const template = getAreaTemplate(input.area);
  return {
    schemaVersion: 1,
    taskKind: "visual_diagnosis",
    createdAt: new Date().toISOString(),
    area: input.area,
    symptom: input.symptom,
    observation: input.observation,
    affectedScope: input.affectedScope,
    affectedSkins: input.affectedSkins,
    previousPatchResult: input.previousPatchResult,
    projectType: resolveAuditBackedProjectType(profile.projectType, audit),
    dominantMode: resolveAuditBackedDominantMode(audit),
    runtimePresentationModel: resolveAuditBackedRuntimeModel(profile.runtimePresentationModel, audit),
    codeStyle: profile.codeStyle,
    primaryRoute: audit?.primaryRoute ?? "unknown",
    likelyFiles: template.likelyFiles,
    allowedFilesForInspection: template.likelyFiles,
    mustNotTouch: [
      ...profile.defaultMustNotTouch,
      ...familyMustNotTouch(resolveAuditBackedProjectType(profile.projectType, audit))
    ],
    nonGoals: [
      "Do not patch yet.",
      "Do not globally make effects stronger.",
      "Do not add player-avatar or projectile systems unless they already exist.",
      ...familyNonGoals(resolveAuditBackedProjectType(profile.projectType, audit))
    ],
    diagnosticQuestions: template.diagnosticQuestions,
    rollbackReference: input.rollbackReference
  };
}

export function buildVisualDiagnosisPrompt(task: VisualDiagnosisTask, fieldNotes: string[]): string {
  const monsterFarmGuardrail = isMonsterFarmType(task.projectType) || isMonsterFarmType(task.dominantMode)
    ? `${renderMonsterFarmPromptGuardrail()}\n\n`
    : "";
  return `# Game Polish Lab Visual Diagnosis Prompt

Area: ${task.area}
Symptom: ${task.symptom}
Observation: ${task.observation}
Affected scope: ${task.affectedScope}
Affected skins: ${task.affectedSkins.length > 0 ? task.affectedSkins.join(", ") : "unknown"}
Project type: ${task.projectType}
Dominant mode: ${task.dominantMode}
Runtime model: ${task.runtimePresentationModel}
Code style: ${task.codeStyle}
Primary route: ${task.primaryRoute}

${renderFieldNotesSection(fieldNotes)}${monsterFarmGuardrail}## Inspect-Only Rules

- Do not patch yet.
- Map the feedback data flow before proposing changes.
- Identify skin-owned visual effects vs shared fallback/overlay effects.
- Identify duplicate visual layers.
- Identify which values are global and risky.
- Identify which skins/states may need less, not more.
- Recommend the smallest safe patch.
- Return planned files only.
- If blocked, do not invent or broaden scope. Produce the safest partial diagnosis and list exact blockers.
- Do not keep intensifying visual effects after a worse result.

## Likely Files To Inspect

${formatList(task.likelyFiles)}

## Must Not Touch

${formatList(task.mustNotTouch)}

## Non-Goals

${formatList(task.nonGoals)}

## Diagnostic Questions

${task.diagnosticQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}

${renderManualTestMatrixSection(manualTestMatrixForProject(task.projectType))}

## Deliverable

Return:
- feedback data-flow map
- skin-owned layers
- shared fallback/overlay layers
- duplicate layers
- risky global values
- smallest safe patch recommendation
- planned files only
`;
}

export function buildTuningExperimentTask(input: TuningExperimentInput): TuningExperimentTask {
  return {
    schemaVersion: 1,
    taskKind: "tuning_experiment",
    createdAt: new Date().toISOString(),
    diagnosisTaskId: input.diagnosisTaskId,
    area: input.diagnosis.area,
    experimentType: input.experimentType,
    expectedResult: input.expectedResult,
    rollbackReference: input.rollbackReference,
    hypothesis: `${input.experimentType}: ${input.expectedResult}`,
    allowedFiles: input.diagnosis.likelyFiles.slice(0, input.experimentType === "config_only" ? 1 : 2),
    mustNotTouch: input.diagnosis.mustNotTouch,
    manualTestMatrix: manualTestMatrixForProject(input.diagnosis.projectType)
  };
}

export function buildTuningExperimentPrompt(task: TuningExperimentTask, diagnosis: VisualDiagnosisTask, fieldNotes: string[]): string {
  const monsterFarmGuardrail = isMonsterFarmType(diagnosis.projectType) || isMonsterFarmType(diagnosis.dominantMode)
    ? `${renderMonsterFarmPromptGuardrail()}\n\n`
    : "";
  return `# Game Polish Lab Tuning Experiment Prompt

Area: ${task.area}
Experiment type: ${task.experimentType}
Hypothesis: ${task.hypothesis}
Expected result: ${task.expectedResult}
Rollback reference: ${task.rollbackReference}
Linked diagnosis: ${task.diagnosisTaskId}

${renderFieldNotesSection(fieldNotes)}${monsterFarmGuardrail}## Rules

- Continue until the requested deliverables are complete.
- Only one hypothesis is allowed in this experiment.
- Keep file scope tiny and reversible.
- Do not make broad "stronger" changes.
- Do not globally increase scale, alpha, particle count, flash size, or duration unless the diagnosis proves it is safe for affected skins.
- Report every changed value.
- If blocked, do not invent or broaden scope. Produce the safest partial result and list exact blockers.
- If visual result is worse, prefer rollback, diagnosis, or smaller experiment.

## Allowed Files

${formatList(task.allowedFiles)}

## Must Not Touch

${formatList(task.mustNotTouch)}

## Rollback Plan

- Use this rollback reference: ${task.rollbackReference}
- Keep config extraction and wiring unless the diagnosis says the wiring caused the bad visual result.
- If this experiment is worse, revert only the changed values/files from this experiment.

${renderManualTestMatrixSection(task.manualTestMatrix)}

## Deliverable

Patch only the tiny experiment scope, then report:
- changed files
- every changed value
- expected before/after visual behavior
- rollback steps
- manual test results to record
`;
}

export function buildRollbackPrompt(input: RollbackPromptInput): string {
  return `# Game Polish Lab Rollback Prompt

What got worse: ${input.whatGotWorse}
Rollback scope: ${input.rollbackScope}
Linked diagnosis/experiment: ${input.linkedReference ?? "none"}

${renderFieldNotesSection(input.fieldNotes)}## Rollback Rules

- Continue until the rollback deliverables are complete.
- If blocked, do not invent or broaden scope. Produce the safest partial rollback and list exact blockers.
- Do not keep intensifying visual effects after a worse result.
- Prefer rollback, diagnosis, or a smaller experiment over stronger tuning.
- Revert aggressive config-only tuning values when applicable.
- Keep config extraction and wiring if they are structurally safe.
- Do not touch arena.html or unrelated systems unless explicitly listed below.
- Report every changed value.
- Run npm run check if that script exists; otherwise report the available validation command.

## Requested Rollback

${rollbackInstruction(input.rollbackScope)}

## Manual Test Matrix

${formatList(defaultCursorArenaTestMatrix())}
`;
}

export function defaultCursorArenaTestMatrix(): string[] {
  return [
    "default click skin",
    "one skin that previously became worse",
    "one skin that previously felt same",
    "miss on empty arena",
    "hit on enemy",
    "kill enemy",
    "combo popup",
    "helper cursor attack"
  ];
}

export function getAreaTemplate(area: VisualArea): { likelyFiles: string[]; diagnosticQuestions: string[] } {
  if (isSortArea(area)) {
    return {
      likelyFiles: [
        "src/scenes/SpiritSortScene.js",
        "src/systems/SortRules.js",
        "src/data/spiritSortLevels.js",
        "src/systems/ProgressSave.js",
        "src/config/sortMoveFeedbackConfig.js"
      ],
      diagnosticQuestions: [
        "Which visual layers represent shelf, slot, spirit, selection, move path, completed state, invalid state, and win state?",
        "Are spirit identities readable while selected or moving?",
        "Does feedback distinguish valid move vs invalid move vs complete shelf?",
        "Is the HUD competing with the board?",
        "Are mobile tap targets large enough?",
        "What values are hardcoded inside SpiritSortScene.js that should become config?",
        "What patch is reversible and rule-safe?"
      ]
    };
  }

  if (isMonsterFarmArea(area)) {
    if (area === "monster_farm_finish_audit") {
      return {
        likelyFiles: monsterFarmLikelyFiles(),
        diagnosticQuestions: [
          "What are the top 5 polish bottlenecks in visible player experience?",
          "Which surfaces are overloaded or visually competing?",
          "Which states are ambiguous across slots, monsters, hatch, merge, tap farm, coin bug, quest, boss, and panels?",
          "Which UI view or renderer owns each surface?",
          "Which state/data/system files are risk files and inspect-only?",
          "What is the best first tiny reversible patch?",
          "What rollback strategy should be used if the patch is worse?",
          "Which manual tests should run before approving a patch?"
        ]
      };
    }
    if (area === "farm_slot_state_readability_diagnosis") {
      return {
        likelyFiles: [
          "src/scenes/FarmScene.ts",
          "src/rendering/MonsterRenderer.ts",
          "src/state/farmSlotState.ts",
          "src/systems/monsterMergeSystem.ts",
          "src/ui/PanelChrome.ts"
        ],
        diagnosticQuestions: [
          "Are empty, locked, occupied, selected, drag-hover, merge-candidate, and invalid-drop states visually distinct?",
          "Which slot visuals are owned by FarmScene versus view/config code?",
          "Which merge-state files are inspect-only because they own formulas or rules?",
          "What tiny visual-only patch would improve the weakest state?",
          "How can the patch be rolled back by reverting one config/view change?"
        ]
      };
    }
    if (area === "monster_identity_diagnosis") {
      return {
        likelyFiles: [
          "src/rendering/MonsterRenderer.ts",
          "src/data/monsters.ts",
          "src/data/elements.ts",
          "src/ui/HatchPanelView.ts",
          "src/scenes/FarmScene.ts"
        ],
        diagnosticQuestions: [
          "Can monster identity be improved through silhouette, contrast, renderer clarity, spacing, or outline without adding farm-grid metadata?",
          "Do monster family silhouettes remain readable at slot and icon sizes?",
          "Are level intensity, aura, sparkle, outline, and rarity/type cues clear without noise?",
          "Would any proposed family initials, level badges, metadata chips, or extra labels make the main farm grid noisier?",
          "If the only idea is adding labels, badges, or chips, stop and recommend skipping this surface.",
          "Which renderer values are visual-only and reversible?",
          "Which monster/data files are inspect-only unless a content task explicitly allows them?",
          "What first tiny patch improves identity readability without replacing assets?",
          ...monsterFarmIdentityMetadataWarning
        ]
      };
    }
    if (area === "hatch_merge_loop_diagnosis") {
      return {
        likelyFiles: [
          "src/ui/HatchPanelView.ts",
          "src/state/hatchState.ts",
          "src/systems/monsterMergeSystem.ts",
          "src/state/farmSlotState.ts",
          "src/scenes/FarmScene.ts"
        ],
        diagnosticQuestions: [
          "Are hatch ready, cooldown, full, cost, hold, success, and blocked states clear?",
          "Are merge candidate, merge success, and invalid merge/drop states clear?",
          "Which hatch odds, cost, cooldown, and merge formula files are inspect-only?",
          "What view/config patch improves readiness or feedback without rule changes?",
          "What rollback path restores the previous visual state?"
        ]
      };
    }
    if (area === "tap_farm_and_coin_bug_diagnosis") {
      return {
        likelyFiles: [
          "src/ui/TapFarmView.ts",
          "src/state/tapFarmState.ts",
          "src/state/coinBugState.ts",
          "src/scenes/FarmScene.ts",
          "src/services/rewardedAdService.ts"
        ],
        diagnosticQuestions: [
          "Are tap farm energy, cooldown, blocked, reward, hover, and modal/drag-blocking states clear?",
          "Are coin bug appearance, pickup, reward, and lifetime states readable?",
          "Which reward/spawn/cooldown/ad files are inspect-only?",
          "What view-only patch can improve feedback without changing reward or spawn formulas?",
          "What manual tests prove tap farm and coin bug remained rule-safe?"
        ]
      };
    }
    if (area === "panel_hierarchy_diagnosis") {
      return {
        likelyFiles: [
          "src/ui/HudView.ts",
          "src/ui/GameplayActionBarView.ts",
          "src/ui/NavigationControlView.ts",
          "src/ui/NavigationMenuPanelView.ts",
          "src/ui/NextQuestWidgetView.ts",
          "src/ui/ToastView.ts",
          "src/ui/PanelChrome.ts",
          "src/ui/PanelControls.ts",
          "src/scenes/FarmScene.ts"
        ],
        diagnosticQuestions: [
          "Do HUD, action bar, navigation, quest widget, toasts, and modals have a clear visual hierarchy?",
          "Which panels are overloaded or competing for attention?",
          "Can hierarchy improve in view/config files without a FarmScene rewrite?",
          "Which quest reward or save/progression files must remain inspect-only?",
          "What first tiny patch improves scanability on small and normal viewports?"
        ]
      };
    }
    return {
      likelyFiles: monsterFarmLikelyFiles(),
      diagnosticQuestions: [
        "Which visual layers represent farm slots, monsters, drag state, merge candidates, hatch readiness, tap farm state, coin bug, toast rewards, and panels?",
        "Which UI widgets are overloaded or unreadable?",
        "Which state/economy systems are visual-only inspect targets?",
        "Which values are hardcoded in FarmScene or views?",
        "Which changes can be done via config without touching economy/save logic?",
        "What rollback path exists?"
      ]
    };
  }

  if (area === "cursor_attack_feedback" || area === "click_feedback") {
    return {
      likelyFiles: [
        "src/arena/data/cursorAttackFeedbackConfig.js",
        "src/arena/data/clickEffectSkins.js",
        "src/arena/systems/ClickEffectSkinSystem.js",
        "src/arena/systems/ImpactEffectSystem.js",
        "src/arena/systems/CursorAttackSystem.js",
        "src/arena/data/arenaBalanceConfig.js"
      ],
      diagnosticQuestions: [
        "Which visible layers come from click effect skins?",
        "Which visible layers come from shared cursor flash, particles, splatter, kill burst, hit text, or screen flash?",
        "Which layers are duplicated?",
        "Which global values are dangerous because they affect every skin?",
        "Which skins likely already have strong visuals?",
        "Which skins likely need weak fallback only?",
        "Is the bad dark/blue-looking effect caused by shared flash, miss color, skin decal, hit particles, or another layer?",
        "What is the smallest safe patch: per-skin multipliers, fallback-only shared effects, clamps, or rollback?",
        "Which file(s) should change first?",
        "What values should be restored or reduced?"
      ]
    };
  }

  return {
    likelyFiles: [
      "src/arena/scenes/ArenaScene.js",
      "src/arena/systems/ImpactEffectSystem.js",
      "src/arena/data/arenaBalanceConfig.js",
      "src/arena/ui/ArenaHud.js",
      "src/arena/ui/UpgradePanel.js",
      "src/styles/arena.css"
    ],
    diagnosticQuestions: [
      "What is already drawn by project-specific skins, themes, or states?",
      "What is drawn by shared fallback effects?",
      "Which values affect every skin or state?",
      "Which states may need less intensity instead of more?",
      "What is the smallest reversible patch?",
      "What should be rolled back if the result is worse?"
    ]
  };
}

function rollbackInstruction(scope: RollbackScope): string {
  switch (scope) {
    case "full_last_patch":
      return "- Revert the last visual-polish patch completely, then report changed files.";
    case "config_only_values":
      return "- Revert aggressive config-only tuning values. Keep safe config extraction and wiring.";
    case "specific_files":
      return "- Revert only the specific files named by the user or linked diagnosis/experiment.";
    case "specific_fields":
      return "- Revert only the specific config fields or values that caused the worse visual result.";
  }
}

function renderManualTestMatrixSection(items = defaultCursorArenaTestMatrix()): string {
  return `## Manual Test Matrix

${formatList(items)}

After testing, record:
- better/worse/same per skin
- which layer felt wrong
- first value to tune down
- first value to tune up`;
}

function manualTestMatrixForProject(projectType: string): string[] {
  if (projectType === "cozy_sort_puzzle" || projectType === "shelf_sort_puzzle" || projectType === "tap_to_move_sort_puzzle") {
    return ["select source shelf", "select target shelf", "valid move", "invalid move", "completed shelf", "undo or hint if present", "win state", "small mobile viewport"];
  }
  if (projectType === "idle_monster_farm" || projectType === "monster_merge_idle" || projectType === "phaser_ui_heavy_idle" || projectType === "tap_farm_idle") {
    return monsterFarmManualTestMatrix;
  }
  return defaultCursorArenaTestMatrix();
}

function familyMustNotTouch(projectType: string): string[] {
  if (projectType === "cozy_sort_puzzle" || projectType === "shelf_sort_puzzle" || projectType === "tap_to_move_sort_puzzle") {
    return ["SortRules", "level data", "save/progression", "unlock logic", "win logic"];
  }
  if (projectType === "idle_monster_farm" || projectType === "monster_merge_idle" || projectType === "phaser_ui_heavy_idle" || projectType === "tap_farm_idle") {
    return ["save schema", "economy formulas", "hatch odds/costs/cooldowns", "upgrade costs", "quest rewards", "ad/monetization logic", "progression formulas", "Capacitor/AdMob", "FarmScene rewrite"];
  }
  return ["arena.html", "save data", "economy formulas", "damage values", "enemy HP", "upgrade costs"];
}

function familyNonGoals(projectType: string): string[] {
  if (projectType === "cozy_sort_puzzle" || projectType === "shelf_sort_puzzle" || projectType === "tap_to_move_sort_puzzle") {
    return ["Do not change SortRules.", "Do not change levels.", "Do not change save/progression.", "Do not convert the puzzle into combat or idle economy."];
  }
  if (projectType === "idle_monster_farm" || projectType === "monster_merge_idle" || projectType === "phaser_ui_heavy_idle" || projectType === "tap_farm_idle") {
    return ["Do not change save schema.", "Do not change economy formulas.", "Do not change hatch odds.", "Do not change ad/monetization logic.", "Do not change progression formulas.", "Do not rewrite FarmScene.", "If unsure, stop at diagnosis and propose a plan."];
  }
  return ["Do not change economy, save, damage, HP, rewards, spawn, wave, or upgrade formulas."];
}

function isSortArea(area: VisualArea): boolean {
  return area === "sort_move_feedback"
    || area === "selected_shelf_readability"
    || area === "invalid_move_feedback"
    || area === "completed_shelf_glow"
    || area === "win_celebration"
    || area === "spirit_identity_readability"
    || area === "puzzle_hud_readability"
    || area === "mobile_sort_layout_readability";
}

function isMonsterFarmArea(area: VisualArea): boolean {
  return area === "monster_farm_slot_readability"
    || area === "monster_farm_finish_audit"
    || area === "farm_slot_state_readability_diagnosis"
    || area === "monster_identity_diagnosis"
    || area === "hatch_merge_loop_diagnosis"
    || area === "tap_farm_and_coin_bug_diagnosis"
    || area === "panel_hierarchy_diagnosis"
    || area === "hatch_feedback"
    || area === "merge_feedback"
    || area === "tap_farm_feedback"
    || area === "coin_bug_feedback"
    || area === "farm_hud_readability"
    || area === "monster_identity_readability"
    || area === "panel_readability"
    || area === "toast_reward_feedback"
    || area === "quest_widget_readability"
    || area === "boss_battle_feedback";
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}

function monsterFarmLikelyFiles(): string[] {
  return [
    "src/scenes/FarmScene.ts",
    "src/rendering/MonsterRenderer.ts",
    "src/ui/TapFarmView.ts",
    "src/ui/HudView.ts",
    "src/ui/HatchPanelView.ts",
    "src/ui/GameplayActionBarView.ts",
    "src/ui/NavigationControlView.ts",
    "src/ui/NavigationMenuPanelView.ts",
    "src/ui/NextQuestWidgetView.ts",
    "src/ui/ToastView.ts",
    "src/ui/PanelChrome.ts",
    "src/ui/PanelControls.ts",
    "src/state/farmSlotState.ts",
    "src/state/hatchState.ts",
    "src/state/tapFarmState.ts",
    "src/state/coinBugState.ts",
    "src/state/questState.ts",
    "src/state/bossBattleState.ts",
    "src/systems/monsterMergeSystem.ts",
    "src/systems/progressionSystem.ts",
    "src/systems/saveSystem.ts",
    "src/services/rewardedAdService.ts",
    "src/data/economy.ts",
    "src/data/monsters.ts",
    "src/data/upgrades.ts",
    "src/data/quests.ts",
    "src/data/bossBattles.ts",
    "src/data/elements.ts",
    "src/data/zones.ts"
  ];
}
