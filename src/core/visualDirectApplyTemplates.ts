import * as fs from "fs";
import * as path from "path";

import { checkVisualScopeGuard, visualScopeGuardWarnings } from "./visualScopeGuard";
import {
  backgroundReadabilityStyleConfigRelativePath,
  buildRollbackSnapshotName,
  buttonStyleConfigRelativePath,
  farmSlotStyleConfigRelativePath,
  panelStyleConfigRelativePath,
  rewardToastStyleConfigRelativePath
} from "./visualSurfaceConfig";
import {
  VisualDirectApplyAdapterId,
  VisualDirectApplyFallbackTemplate,
  VisualDirectApplyIntent,
  VisualDirectApplyManualCheck,
  VisualDirectApplyPlan,
  VisualDirectApplyResult,
  VisualDirectApplyTemplate,
  VisualDirectApplyTemplateRegistry,
  VisualDirectApplyWrite
} from "../types/visualDirectApplyTemplate";
import { VisualSurfaceType } from "../types/visualSurface";

export interface ResolveVisualDirectApplyTemplateInput {
  adapterId: VisualDirectApplyAdapterId;
  surfaceType: VisualSurfaceType;
  targetId?: string;
  intent?: VisualDirectApplyIntent;
}

export interface BuildVisualDirectApplyPlanInput extends ResolveVisualDirectApplyTemplateInput {
  targetLabel?: string;
  styleConfigPath?: string;
  generatedStyleModulePath?: string;
  candidatePaths?: string[];
}

const idleStyleConfigPaths: Record<Exclude<VisualSurfaceType, "asset_replacement">, string> = {
  slot_card: farmSlotStyleConfigRelativePath,
  background_readability: backgroundReadabilityStyleConfigRelativePath,
  panel: panelStyleConfigRelativePath,
  reward_toast: rewardToastStyleConfigRelativePath,
  button: buttonStyleConfigRelativePath
};

const directApplyManualChecks: VisualDirectApplyManualCheck[] = [
  {
    checkId: "visual_surface_changed",
    label: "Visual surface changed",
    description: "Open the game scene and confirm the intended visual surface reflects the selected style."
  },
  {
    checkId: "no_gameplay_change",
    label: "No gameplay behavior changed",
    description: "Confirm controls, rewards, save/load, progression, ads, quests, merge, hatch, and level behavior were not changed."
  }
];

const genericFallbackTemplate: VisualDirectApplyFallbackTemplate = {
  templateId: "generic-phaser.fallback-task.v1",
  displayName: "Generic Phaser Fallback Task",
  adapterId: "generic_phaser",
  instructions: [
    "This fallback task is not part of the normal polish loop.",
    "Use it only when direct apply cannot safely proceed through known template paths.",
    "Include the exact selected adapter, surface, target, and user-selected file scope.",
    "List suspicious and forbidden files with scope guard reasons.",
    "Do not touch gameplay, save, economy, progression, quest, hatch, merge, ad, level, package, or unrelated runtime files unless explicitly required and confirmed."
  ]
};

const idleFallbackTemplate: VisualDirectApplyFallbackTemplate = {
  templateId: "idle-monster-farm.fallback-task.v1",
  displayName: "Idle Monster Farm Guarded Fallback Task",
  adapterId: "idle_monster_farm",
  instructions: [
    "This fallback task is not part of the normal polish loop.",
    "Use it only for unsupported or unsafe bridge/source changes.",
    "Keep edits inside adapter-approved visual config and bridge paths.",
    "Do not touch gameplay, save, economy, progression, quest, hatch, merge, ad, level, package, or unrelated runtime files unless explicitly required and confirmed."
  ]
};

const registry: VisualDirectApplyTemplateRegistry = {
  templates: [
    ...(["slot_card", "background_readability", "panel", "reward_toast", "button"] as const).map((surfaceType) => idleStyleTemplate(surfaceType)),
    ...(["slot_card", "background_readability", "panel", "reward_toast", "button"] as const).map((surfaceType) => genericStyleTemplate(surfaceType))
  ],
  fallbackTemplates: [genericFallbackTemplate, idleFallbackTemplate]
};

export function getVisualDirectApplyTemplateRegistry(): VisualDirectApplyTemplateRegistry {
  return {
    templates: registry.templates.map((template) => ({ ...template, manualChecks: [...template.manualChecks], candidateFilePaths: [...template.candidateFilePaths], requiredStyleConfigPaths: [...template.requiredStyleConfigPaths], supportedOperationTypes: [...template.supportedOperationTypes] })),
    fallbackTemplates: registry.fallbackTemplates.map((template) => ({ ...template, instructions: [...template.instructions] }))
  };
}

export function resolveVisualDirectApplyTemplate(input: ResolveVisualDirectApplyTemplateInput): VisualDirectApplyTemplate | undefined {
  return registry.templates.find((template) => template.adapterId === input.adapterId
    && template.supportedSurfaceType === input.surfaceType
    && targetMatches(template, input.targetId)
    && (input.intent !== "fallback_task" ? template.executable : false));
}

export function resolveVisualDirectApplyFallbackTemplate(input: ResolveVisualDirectApplyTemplateInput): VisualDirectApplyFallbackTemplate | undefined {
  return registry.fallbackTemplates.find((template) => template.adapterId === input.adapterId
    && (!template.supportedSurfaceType || template.supportedSurfaceType === input.surfaceType));
}

export function buildVisualDirectApplyPlan(input: BuildVisualDirectApplyPlanInput): VisualDirectApplyPlan {
  const template = resolveVisualDirectApplyTemplate(input);
  const fallbackTemplate = template?.fallbackTemplate ?? resolveVisualDirectApplyFallbackTemplate(input);
  const styleConfigPath = input.styleConfigPath ?? template?.requiredStyleConfigPaths[0];
  const generatedStyleModulePath = input.generatedStyleModulePath;
  const readPaths = styleConfigPath ? [styleConfigPath] : [];
  const writePaths = styleConfigPath ? [styleConfigPath] : [];
  const candidatePaths = Array.from(new Set([
    ...(input.candidatePaths ?? []),
    ...writePaths,
    ...(generatedStyleModulePath ? [generatedStyleModulePath] : [])
  ].filter(Boolean))).sort();
  const scopeGuardResult = checkVisualScopeGuard({
    operationType: "direct_apply",
    adapterId: input.adapterId,
    surfaceType: input.surfaceType,
    targetId: input.targetId,
    candidatePaths: candidatePaths.length > 0 ? candidatePaths : ["unknown"]
  });
  const blockingReasons: string[] = [];
  const warnings = visualScopeGuardWarnings(scopeGuardResult);
  if (!template) {
    blockingReasons.push(`Direct apply unavailable for ${input.adapterId}/${input.surfaceType}${input.targetId ? `/${input.targetId}` : ""}. Use tuning config or a scoped fallback task instead.`);
  }
  if (scopeGuardResult.recommendedAction === "block") {
    blockingReasons.push(`Scope guard blocked direct apply. Remove forbidden paths before writing: ${scopeGuardResult.classifiedFiles.filter((file) => file.classification === "forbidden").map((file) => file.path).join(", ") || "none listed"}.`);
  }
  if (scopeGuardResult.recommendedAction === "warn") {
    blockingReasons.push(`Scope guard found suspicious or unknown paths. Direct apply stays disabled until the path list is limited to known safe visual config files: ${scopeGuardResult.classifiedFiles.filter((file) => file.classification === "suspicious" || file.classification === "unknown").map((file) => file.path).join(", ") || "none listed"}.`);
  }
  const executable = Boolean(template) && blockingReasons.length === 0 && writePaths.length > 0;
  const planId = `${input.adapterId}:${input.surfaceType}:${safeId(input.targetId ?? input.targetLabel ?? "target")}:${input.intent ?? "style_config_direct_apply"}`;
  return {
    planId,
    templateId: template?.templateId,
    templateName: template?.displayName,
    adapterId: input.adapterId,
    surfaceType: input.surfaceType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    intent: input.intent ?? "style_config_direct_apply",
    steps: [
      step("run_scope_guard", 1, "run_scope_guard", "Run v0.65 visual scope guard before any direct write.", candidatePaths, true),
      step("create_rollback_snapshot", 2, "create_rollback_snapshot", "Create rollback snapshot before overwriting an existing visual config.", writePaths, Boolean(template?.rollbackRequired)),
      step("write_style_config", 3, "write_style_config", "Write the generated style config to the planned safe path.", writePaths, executable),
      step("manual_check", 4, "manual_check", "Present manual visual checks after direct apply.", [], true)
    ],
    readPaths,
    writePaths,
    rollbackRequired: Boolean(template?.rollbackRequired),
    scopeGuardResult,
    manualChecks: template?.manualChecks ?? [],
    executable,
    fallbackAvailable: Boolean(fallbackTemplate),
    fallbackTemplate,
    warnings,
    blockingReasons
  };
}

export function executeVisualDirectApplyPlan(workspaceRoot: string, plan: VisualDirectApplyPlan, writes: VisualDirectApplyWrite[], now: Date = new Date()): VisualDirectApplyResult {
  const executedSteps: VisualDirectApplyResult["executedSteps"] = [];
  if (!plan.executable) {
    return {
      ok: false,
      planId: plan.planId,
      templateId: plan.templateId,
      templateName: plan.templateName,
      changedFiles: [],
      rollbackPaths: [],
      executedSteps: plan.steps.map((planStep) => ({
        stepId: planStep.stepId,
        operationType: planStep.operationType,
        paths: planStep.paths,
        status: planStep.operationType === "run_scope_guard" ? "completed" : "blocked",
        message: planStep.operationType === "run_scope_guard" ? "Scope guard was evaluated." : "Direct apply is disabled for this plan; review errors or generate a scoped fallback task."
      })),
      manualChecks: plan.manualChecks,
      warnings: plan.warnings,
      errors: plan.blockingReasons,
      fallbackTask: buildFallbackTaskFromPlan(plan)
    };
  }

  const plannedWritePaths = new Set(plan.writePaths);
  const changedFiles: string[] = [];
  const rollbackPaths: string[] = [];
  const errors: string[] = [];
  executedSteps.push({ stepId: "run_scope_guard", operationType: "run_scope_guard", paths: plan.scopeGuardResult.classifiedFiles.map((file) => file.path), status: "completed", message: plan.scopeGuardResult.summaryMessage });

  for (const write of writes) {
    const relativePath = normalizeRelativePath(write.relativePath);
    if (!plannedWritePaths.has(relativePath)) {
      errors.push(`Write path was not in the approved direct-apply plan: ${relativePath}`);
      continue;
    }
    const resolvedPath = resolveWorkspacePath(workspaceRoot, relativePath);
    if (!resolvedPath) {
      errors.push(`Write path does not resolve inside workspace: ${relativePath}`);
      continue;
    }
    if (!relativePath.startsWith(".game-polish-lab/")) {
      errors.push(`Direct apply can only write Game Polish Lab-owned config paths for this template: ${relativePath}`);
      continue;
    }
    const existing = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
    if (existing && plan.rollbackRequired) {
      const rollbackPath = createTextRollbackSnapshot(workspaceRoot, relativePath, resolvedPath, now);
      rollbackPaths.push(rollbackPath);
      executedSteps.push({ stepId: "create_rollback_snapshot", operationType: "create_rollback_snapshot", paths: [rollbackPath], status: "completed", message: "Rollback snapshot created before overwrite." });
    }
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, write.text, "utf8");
    changedFiles.push(relativePath);
  }

  if (changedFiles.length > 0) {
    executedSteps.push({ stepId: "write_style_config", operationType: "write_style_config", paths: changedFiles, status: "completed", message: "Planned style config files written." });
    executedSteps.push({ stepId: "manual_check", operationType: "manual_check", paths: [], status: "completed", message: "Manual checks are available in the result." });
  }

  return {
    ok: errors.length === 0,
    planId: plan.planId,
    templateId: plan.templateId,
    templateName: plan.templateName,
    changedFiles,
    rollbackPaths,
    executedSteps,
    manualChecks: plan.manualChecks,
    warnings: plan.warnings,
    errors,
    fallbackTask: errors.length > 0 ? buildFallbackTaskFromPlan(plan) : undefined
  };
}

export function buildVisualDirectApplyFallbackTask(plan: VisualDirectApplyPlan): NonNullable<VisualDirectApplyResult["fallbackTask"]> {
  return buildFallbackTaskFromPlan(plan) ?? {
    templateId: "direct-apply.no-fallback-template",
    adapterId: plan.adapterId,
    surfaceType: plan.surfaceType,
    targetId: plan.targetId,
    targetLabel: plan.targetLabel,
    reasons: [...plan.blockingReasons, ...plan.warnings].filter(Boolean),
    suspiciousFiles: plan.scopeGuardResult.classifiedFiles.filter((file) => file.classification === "suspicious" || file.classification === "unknown").map((file) => `${file.path}: ${file.message} (${file.reasonCode})`),
    forbiddenFiles: plan.scopeGuardResult.classifiedFiles.filter((file) => file.classification === "forbidden").map((file) => `${file.path}: ${file.message} (${file.reasonCode})`),
    instructions: [
      "This fallback task is not part of the normal polish loop.",
      "No registered fallback template exists for this plan, so do not apply automatic source edits.",
      "Do not touch gameplay, save, economy, progression, quest, hatch, merge, ad, level, package, or unrelated runtime files unless explicitly required and confirmed."
    ]
  };
}

function idleStyleTemplate(surfaceType: Exclude<VisualSurfaceType, "asset_replacement">): VisualDirectApplyTemplate {
  const targetIds: Record<Exclude<VisualSurfaceType, "asset_replacement">, string[]> = {
    slot_card: ["farm_slots"],
    background_readability: ["background"],
    panel: ["panels"],
    reward_toast: ["reward_toast"],
    button: ["buttons"]
  };
  const configPath = idleStyleConfigPaths[surfaceType];
  return {
    templateId: `idle-monster-farm.${surfaceType}.style-config.v1`,
    displayName: `Idle Monster Farm ${surfaceType} Style Config Direct Apply`,
    adapterId: "idle_monster_farm",
    supportedSurfaceType: surfaceType,
    supportedTargetIds: targetIds[surfaceType],
    supportedOperationTypes: ["run_scope_guard", "create_rollback_snapshot", "read_style_config", "write_style_config", "verify_runtime_bridge", "manual_check"],
    candidateFilePaths: [configPath],
    requiredStyleConfigPaths: [configPath],
    rollbackRequired: true,
    scopeGuardPolicy: { operationType: "direct_apply", adapterId: "idle_monster_farm", surfaceType, targetId: targetIds[surfaceType][0] },
    manualChecks: directApplyManualChecks,
    fallbackTemplate: idleFallbackTemplate,
    executable: true
  };
}

function genericStyleTemplate(surfaceType: Exclude<VisualSurfaceType, "asset_replacement">): VisualDirectApplyTemplate {
  const configPath = `.game-polish-lab/styles/generic-${surfaceType.replace(/_/g, "-")}-style.json`;
  return {
    templateId: `generic-phaser.${surfaceType}.safe-style-config.v1`,
    displayName: `Generic Phaser ${surfaceType} Safe Style Config Write`,
    adapterId: "generic_phaser",
    supportedSurfaceType: surfaceType,
    targetIdPattern: "manual_target",
    supportedOperationTypes: ["run_scope_guard", "create_rollback_snapshot", "read_style_config", "write_style_config", "generate_fallback_task", "manual_check"],
    candidateFilePaths: [configPath],
    requiredStyleConfigPaths: [configPath],
    rollbackRequired: true,
    scopeGuardPolicy: { operationType: "direct_apply", adapterId: "generic_phaser", surfaceType, targetId: "manual_target" },
    manualChecks: directApplyManualChecks,
    fallbackTemplate: genericFallbackTemplate,
    executable: true
  };
}

function targetMatches(template: VisualDirectApplyTemplate, targetId: string | undefined): boolean {
  if (!targetId || targetId === "manual_target") {
    return true;
  }
  if (template.supportedTargetIds?.includes(targetId)) {
    return true;
  }
  return template.targetIdPattern ? new RegExp(template.targetIdPattern).test(targetId) : !template.supportedTargetIds?.length;
}

function step(stepId: string, order: number, operationType: VisualDirectApplyPlan["steps"][number]["operationType"], description: string, paths: string[], executable: boolean): VisualDirectApplyPlan["steps"][number] {
  return { stepId, order, operationType, description, paths, executable };
}

function buildFallbackTaskFromPlan(plan: VisualDirectApplyPlan): NonNullable<VisualDirectApplyResult["fallbackTask"]> | undefined {
  if (!plan.fallbackTemplate) {
    return undefined;
  }
  return {
    templateId: plan.fallbackTemplate.templateId,
    adapterId: plan.adapterId,
    surfaceType: plan.surfaceType,
    targetId: plan.targetId,
    targetLabel: plan.targetLabel,
    reasons: [...plan.blockingReasons, ...plan.warnings].filter(Boolean),
    suspiciousFiles: plan.scopeGuardResult.classifiedFiles.filter((file) => file.classification === "suspicious" || file.classification === "unknown").map((file) => `${file.path}: ${file.message} (${file.reasonCode})`),
    forbiddenFiles: plan.scopeGuardResult.classifiedFiles.filter((file) => file.classification === "forbidden").map((file) => `${file.path}: ${file.message} (${file.reasonCode})`),
    instructions: plan.fallbackTemplate.instructions
  };
}

function createTextRollbackSnapshot(workspaceRoot: string, relativePath: string, absolutePath: string, now: Date): string {
  const rollbackDir = path.join(workspaceRoot, ".game-polish-lab", "rollback");
  fs.mkdirSync(rollbackDir, { recursive: true });
  const fileName = buildRollbackSnapshotName(now, relativePath);
  fs.copyFileSync(absolutePath, path.join(rollbackDir, fileName));
  return `.game-polish-lab/rollback/${fileName}`;
}

function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string | undefined {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || path.isAbsolute(normalized) || normalized.split("/").includes("..")) {
    return undefined;
  }
  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, ...normalized.split("/"));
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : undefined;
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "target";
}
