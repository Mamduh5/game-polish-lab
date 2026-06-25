const forbiddenPathTerms = [
  "/save",
  "savesystem",
  "savestate",
  "/economy",
  "rewardamount",
  "rewardamounts",
  "rewardconfig",
  "reward-config",
  "rewardtable",
  "reward-table",
  "buttonaction",
  "button-action",
  "actiondispatch",
  "action-dispatch",
  "commanddispatch",
  "command-dispatch",
  "inputdispatch",
  "input-dispatch",
  "inputhandler",
  "input-handler",
  "/input/",
  "/progression",
  "/state/upgrade",
  "/systems/upgrade",
  "upgradestate",
  "upgradesystem",
  "/state/hatch",
  "/systems/hatch",
  "hatchstate",
  "hatchsystem",
  "/merge",
  "mergesystem",
  "monstermerge",
  "/state/quest",
  "/systems/quest",
  "/data/quest",
  "queststate",
  "inventory",
  "/ads",
  "/ad/",
  "admob",
  "rewardedad",
  "rewarded-ad",
  "rewarded_ad",
  "monetization",
  "/state/",
  "/data/",
  "leveldata",
  "level-data",
  "levels",
  "worldbounds",
  "camera",
  "loader",
  "gameplay",
  "rules",
  "navigation/",
  "routing",
  "routes"
];

const allowedStylePathTerms = [
  ".game-polish-lab/styles/",
  ".game-polish-lab/rollback/",
  ".game-polish-lab/assets/",
  "src/assets/",
  "public/assets/",
  "src/config/",
  "src/styles/",
  "src/theme/",
  "style",
  "visual",
  "assetmanifest"
];

const farmSlotRenderingTerms = [
  "farmscene",
  "farmslot",
  "farm-slot",
  "farmgrid",
  "farm-grid",
  "slotview",
  "slot-view",
  "slotcard",
  "slot-card",
  "monsterrenderer",
  "background",
  "backdrop",
  "environment",
  "worldview",
  "panel",
  "modal",
  "navigationmenu",
  "navigationcontrol",
  "hatchpanel",
  "questwidget",
  "toast",
  "rewardfeedback",
  "reward-feedback",
  "floatingreward",
  "floating-reward",
  "floatingtext",
  "floating-text",
  "coinfeedback",
  "coin-feedback",
  "rewardicon",
  "reward-icon",
  "button",
  "actionbar",
  "action-bar",
  "controls",
  "panelcontrols",
  "upgradepanel",
  "upgrade-panel"
];

export interface V05ScopeGuardResult {
  ok: boolean;
  allowedFiles: string[];
  adapterOnlyFiles: string[];
  forbiddenFiles: string[];
  warnings: string[];
}

export function checkV05VisualScope(files: string[], options: { throughAdapter: boolean }): V05ScopeGuardResult {
  const normalized = files.map(normalizeWorkspacePath);
  const forbiddenFiles = normalized.filter(isForbiddenV05Path);
  const allowedFiles = normalized.filter((file) => !forbiddenFiles.includes(file) && isAllowedVisualOrStylePath(file));
  const adapterOnlyFiles = normalized.filter((file) => !forbiddenFiles.includes(file) && !allowedFiles.includes(file) && isFarmSlotRenderingPath(file));
  const suspiciousFiles = normalized.filter((file) => !forbiddenFiles.includes(file) && !adapterOnlyFiles.includes(file) && !allowedFiles.includes(file));
  const blockedAdapterOnlyFiles = options.throughAdapter ? [] : adapterOnlyFiles;
  const warnings = [
    ...suspiciousFiles.map((file) => `${file} is outside v0.5 visual/config/style scope.`),
    ...blockedAdapterOnlyFiles.map((file) => `${file} may only be changed through the Idle Monster Farm farm slot adapter.`)
  ];

  return {
    ok: forbiddenFiles.length === 0 && suspiciousFiles.length === 0 && blockedAdapterOnlyFiles.length === 0,
    allowedFiles,
    adapterOnlyFiles,
    forbiddenFiles: [...forbiddenFiles, ...suspiciousFiles, ...blockedAdapterOnlyFiles],
    warnings
  };
}

export function isForbiddenV05Path(filePath: string): boolean {
  const normalized = normalizeWorkspacePath(filePath).toLowerCase();
  if (normalized.includes("gameplayactionbarview")) {
    return false;
  }
  return forbiddenPathTerms.some((term) => normalized.includes(term));
}

export function isAllowedVisualOrStylePath(filePath: string): boolean {
  const normalized = normalizeWorkspacePath(filePath).toLowerCase();
  return allowedStylePathTerms.some((term) => normalized.includes(term));
}

export function isFarmSlotRenderingPath(filePath: string): boolean {
  const normalized = normalizeWorkspacePath(filePath).toLowerCase();
  return farmSlotRenderingTerms.some((term) => normalized.includes(term));
}

function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}
