import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

import {
  buildMonsterFarmAuditDetails,
  monsterFarmMajorSurfaceModes,
  monsterFarmRecommendedKitOrder,
  renderMonsterFarmAuditMarkdownSections,
  renderMonsterFarmFinishStagePlanPrompt,
  renderMonsterFarmPromptGuardrail,
  splitMonsterFarmProjectTypeEvidence
} from "../core/monsterFarmDeepAudit";
import { analyzeFarmSlotDetection, analyzeFarmSlotStyleConnection } from "../core/farmSlotAdapterAnalysis";
import { checkV05VisualScope, isForbiddenV05Path } from "../core/v05VisualScopeGuard";
import { buildRollbackSnapshotName, buildSlotCardStyleConfig, loadSlotCardStyleConfigFromText } from "../core/visualSurfaceConfig";
import { pixelPolishKitPresets } from "../presets/pixelPolishKitPresets";
import { slotCardPresets } from "../presets/slotCardPresets";
import { InspectedFile } from "../types/audit";

const fixtureRoot = path.join(process.cwd(), "fixtures", "phaser-idle-monster-farm-sample");
const files = readFixtureFiles(fixtureRoot);
const audit = buildMonsterFarmAuditDetails(files, "tap_farm_idle", "phaser_rendered_ui_heavy", "typescript_module");
const sections = renderMonsterFarmAuditMarkdownSections(audit);
const guardrail = renderMonsterFarmPromptGuardrail();
const finishPlanPrompt = renderMonsterFarmFinishStagePlanPrompt();

assert.strictEqual(audit.projectFamily, "idle_monster_farm");
assert.strictEqual(audit.strongestSubmode, "tap_farm_idle");
assert.strictEqual(audit.detected.typeScriptModule, true);
assert.strictEqual(audit.detected.phaserUiHeavyRuntime, true);
assert.strictEqual(audit.detected.farmScene, true);
assert.strictEqual(audit.detected.monsterRenderer, true);
assert.strictEqual(audit.detected.tapFarmView, true);
assert.strictEqual(audit.detected.hatchMerge, true);
assert.strictEqual(audit.detected.quest, true);
assert.strictEqual(audit.detected.boss, true);
assert.strictEqual(audit.detected.coinBug, true);
assert.ok(sections.includes("- FarmScene detected: yes"));

const validFarmSlotConfig = buildSlotCardStyleConfig("Cozy Wood", slotCardPresets[0].values);
const validConfigLoad = loadSlotCardStyleConfigFromText(JSON.stringify(validFarmSlotConfig));
assert.strictEqual(validConfigLoad.status, "valid");
assert.strictEqual(validConfigLoad.existingConfigDetected, true);
assert.strictEqual(validConfigLoad.initializedFromExistingConfig, true);
assert.strictEqual(validConfigLoad.config.surfaceType, "slot_card");

const missingConfigLoad = loadSlotCardStyleConfigFromText(undefined);
assert.strictEqual(missingConfigLoad.status, "missing");
assert.strictEqual(missingConfigLoad.existingConfigDetected, false);
assert.strictEqual(missingConfigLoad.initializedFromExistingConfig, false);
assert.strictEqual(missingConfigLoad.config.values.slotWidth, slotCardPresets[0].values.slotWidth);

const invalidJsonConfigLoad = loadSlotCardStyleConfigFromText("{ nope");
assert.strictEqual(invalidJsonConfigLoad.status, "invalid_json");
assert.strictEqual(invalidJsonConfigLoad.existingConfigDetected, true);
assert.strictEqual(invalidJsonConfigLoad.initializedFromExistingConfig, false);
assert.ok(invalidJsonConfigLoad.warning?.includes("invalid JSON"));

const invalidSchemaConfigLoad = loadSlotCardStyleConfigFromText(JSON.stringify({ schemaVersion: 99 }));
assert.strictEqual(invalidSchemaConfigLoad.status, "schema_invalid");
assert.strictEqual(invalidSchemaConfigLoad.existingConfigDetected, true);
assert.strictEqual(invalidSchemaConfigLoad.initializedFromExistingConfig, false);
assert.ok(invalidSchemaConfigLoad.warning?.includes("unsupported schema"));

assert.deepStrictEqual(slotCardPresets.map((preset) => preset.name), [
  "Cozy Wood",
  "Magic Glow",
  "Chunky Pixel",
  "Clean Mobile"
]);

const v05Scope = checkV05VisualScope([
  ".game-polish-lab/styles/farm-slot-style.json",
  ".game-polish-lab/rollback/2026-06-24-farm-slot-style.json",
  "src/config/farmSlotStyle.ts",
  "src/state/farmSlotState.ts",
  "src/systems/monsterMergeSystem.ts",
  "src/services/rewardedAdService.ts"
], { throughAdapter: true });
assert.ok(v05Scope.allowedFiles.includes(".game-polish-lab/styles/farm-slot-style.json"));
assert.ok(v05Scope.allowedFiles.includes("src/config/farmSlotStyle.ts"));
assert.ok(v05Scope.forbiddenFiles.includes("src/state/farmSlotState.ts"));
assert.ok(v05Scope.forbiddenFiles.includes("src/systems/monsterMergeSystem.ts"));
assert.ok(v05Scope.forbiddenFiles.includes("src/services/rewardedAdService.ts"));
assert.strictEqual(isForbiddenV05Path("src/ui/Leaderboard.ts"), false);

const disconnectedFiles = [
  {
    relativePath: "src/scenes/FarmScene.ts",
    text: "import { farmSlotState } from '../state/farmSlotState'; const slots = farmSlotState.slots; monsterMergeSystem.findMergeCandidate(farmSlotState); writeSaveData({ farmSlotState });"
  },
  {
    relativePath: "src/config/farmSlotStyle.ts",
    text: "export const FARM_SLOT_STYLE = {};"
  }
];
const detection = analyzeFarmSlotDetection(disconnectedFiles);
assert.strictEqual(detection.target, "idle_monster_farm.farm_slots");
assert.strictEqual(detection.detected, true);
assert.strictEqual(detection.confidence, "medium");
assert.deepStrictEqual(detection.ownerFiles, ["src/scenes/FarmScene.ts"]);
assert.ok(detection.reasons.some((reason) => reason.includes("FarmScene")));
assert.ok(detection.warnings.some((warning) => warning.includes("save schema")));
assert.ok(detection.warnings.some((warning) => warning.includes("merge behavior")));

const disconnected = analyzeFarmSlotStyleConnection(disconnectedFiles);
assert.strictEqual(disconnected.connected, false);
assert.strictEqual(disconnected.connectionType, "none");
assert.deepStrictEqual(disconnected.connectedFiles, []);
assert.ok(disconnected.missingPieces.some((piece) => piece.includes("owner/rendering files")));

const connectedFiles = [
  {
    relativePath: "src/ui/FarmSlotView.ts",
    text: "import { FARM_SLOT_STYLE } from '../config/farmSlotStyle'; export function drawSlot() { return FARM_SLOT_STYLE.slotWidth; }"
  },
  {
    relativePath: "src/config/farmSlotStyle.ts",
    text: "export const FARM_SLOT_STYLE = { slotWidth: 100 };"
  }
];
const connectedDetection = analyzeFarmSlotDetection(connectedFiles);
assert.strictEqual(connectedDetection.detected, true);
assert.strictEqual(connectedDetection.confidence, "high");
const connected = analyzeFarmSlotStyleConnection(connectedFiles);
assert.strictEqual(connected.connected, true);
assert.strictEqual(connected.connectionType, "style_module");
assert.deepStrictEqual(connected.connectedFiles, ["src/ui/FarmSlotView.ts"]);
const connectedAfterRepeatedApply = analyzeFarmSlotStyleConnection(connectedFiles);
assert.strictEqual(connectedAfterRepeatedApply.connected, true);
assert.strictEqual(connectedAfterRepeatedApply.connectionType, "style_module");

assert.strictEqual(
  buildRollbackSnapshotName(new Date("2026-06-24T10:11:12.123Z"), ".game-polish-lab/styles/farm-slot-style.json"),
  "2026-06-24T10-11-12-123Z-farm-slot-style.json"
);

const farmSceneFallbackAudit = buildMonsterFarmAuditDetails([
  {
    relativePath: "src/main.ts",
    text: "import { FarmScene } from './scenes/FarmScene'; new Phaser.Game({ scene: [BootScene, FarmScene] });"
  }
], "tap_farm_idle", "phaser_rendered_ui_heavy", "typescript_module");
assert.strictEqual(farmSceneFallbackAudit.detected.farmScene, true);

for (const mode of [
  "monster_farm_slots",
  "monster_identity",
  "hatch_merge_loop",
  "tap_farm_idle",
  "ui_panel_hierarchy",
  "quest_reward_guidance",
  "boss_battle_secondary"
]) {
  assert.ok(monsterFarmMajorSurfaceModes.includes(mode), `missing surface mode: ${mode}`);
}

for (const heading of [
  "## Monster Farm Confidence",
  "## Monster Farm Surface Map",
  "## Finish-Stage Polish Priorities",
  "## File Role Map",
  "## Non-Dominant Keyword Noise",
  "## Rendering Style Readiness"
]) {
  assert.ok(sections.includes(heading), `missing audit heading: ${heading}`);
}

assert.deepStrictEqual(monsterFarmRecommendedKitOrder, [
  "monster_farm_slot_readability",
  "panel_readability",
  "merge_feedback",
  "tap_farm_feedback",
  "coin_bug_feedback",
  "farm_hud_readability",
  "quest_widget_readability",
  "toast_reward_feedback",
  "boss_battle_feedback",
  "monster_identity_readability",
  "hatch_feedback"
]);

for (const forbiddenKit of ["cursor_attack_feedback", "arena_hud_readability", "projectile_readability", "hit_feedback"]) {
  assert.ok(!monsterFarmRecommendedKitOrder.includes(forbiddenKit), `forbidden Monster Farm kit recommended: ${forbiddenKit}`);
}

const evidenceSplit = splitMonsterFarmProjectTypeEvidence([
  "idle_monster_farm: farmscene, monsterrenderer in src/scenes/FarmScene.ts",
  "tap_farm_idle: tapfarmview in src/ui/TapFarmView.ts",
  "arena_combat: boss, attack in src/data/bossBattles.ts",
  "top_down_shooter: projectile in src/audio/translations.ts",
  "survivor_like: wave, pickup in src/ui/ToastView.ts",
  "moba_like: skill, cooldown in src/state/bossBattleState.ts",
  "incremental_arena: reward, combo in src/scenes/FarmScene.ts"
]);
assert.deepStrictEqual(evidenceSplit.mainEvidence, [
  "idle_monster_farm: farmscene, monsterrenderer in src/scenes/FarmScene.ts",
  "tap_farm_idle: tapfarmview in src/ui/TapFarmView.ts"
]);
assert.deepStrictEqual(evidenceSplit.nonDominantKeywordEvidence, [
  "arena_combat: boss, attack in src/data/bossBattles.ts",
  "top_down_shooter: projectile in src/audio/translations.ts",
  "survivor_like: wave, pickup in src/ui/ToastView.ts",
  "moba_like: skill, cooldown in src/state/bossBattleState.ts",
  "incremental_arena: reward, combo in src/scenes/FarmScene.ts"
]);

const mainSuggestedProjectTypeSection = evidenceSplit.mainEvidence.map((item) => `- ${item}`).join("\n");
for (const noisyBucket of ["arena_combat", "top_down_shooter", "survivor_like", "moba_like", "incremental_arena"]) {
  assert.ok(!mainSuggestedProjectTypeSection.includes(`${noisyBucket}:`), `noisy bucket leaked into main Suggested Project Type: ${noisyBucket}`);
}

for (const phrase of [
  "nearly finished TypeScript Phaser UI-heavy idle monster farm",
  "diagnose first",
  "one small reversible surface at a time",
  "never modify economy, save, hatch odds, upgrade costs, quest rewards, ad/monetization, or progression formulas",
  "Do not rewrite FarmScene.",
  "Prefer UI view files or config files.",
  "State/data/system files are inspect-only unless the task explicitly says gameplay logic.",
  "If unsure, stop at diagnosis and propose a plan.",
  "Do not globally boost effects.",
  "Do not add mechanics.",
  "Do not change balance.",
  "Do not touch Capacitor/AdMob unless explicitly asked.",
  "Run `npm run build` after implementation.",
  "Proven-good first patch: farm_slot_state_readability",
  "Proven-good low-risk polish target: panel_hierarchy",
  "Do not add family initials, level badges, metadata chips, or extra labels to the main farm grid by default.",
  "Exact monster metadata belongs in compendium/detail UI, not on farm slots.",
  "Hatch panel style-only polish was neutral"
]) {
  assert.ok(guardrail.includes(phrase), `missing guardrail phrase: ${phrase}`);
}

assert.ok(finishPlanPrompt.includes("- Do not patch yet."));
assert.ok(finishPlanPrompt.includes("- Produce the top 5 polish opportunities."));
assert.ok(finishPlanPrompt.includes("- fresh save first 2 minutes"));
assert.ok(finishPlanPrompt.includes("Prioritize `farm_slot_state_readability` and `panel_hierarchy` as proven safe early polish targets."));
assert.ok(finishPlanPrompt.includes("Treat `hatch_panel_readiness` as optional unless the user reports the hatch panel feels unclear."));
assert.ok(finishPlanPrompt.includes("warn against badge/chip metadata overlays on farm slots"));
assert.ok(finishPlanPrompt.includes("Proven-good first patch: farm_slot_state_readability"));
assert.ok(finishPlanPrompt.includes("Proven-good low-risk polish target: panel_hierarchy"));

const identityKit = pixelPolishKitPresets.find((preset) => preset.kitId === "monster_identity_readability");
assert.ok(identityKit, "monster_identity_readability kit missing");
const identityPromptSource = [
  identityKit.targetFeel,
  ...identityKit.acceptanceCriteria,
  ...identityKit.antiPatterns,
  ...identityKit.codexImplementationNotes,
  ...identityKit.manualTuningAdvice
].join("\n");
for (const phrase of [
  "No family initials, level badges, metadata chips, or extra labels are added to the main farm grid by default.",
  "Exact monster metadata belongs in compendium/detail UI",
  "Prefer silhouette/readability/art contrast/spacing/outline improvements",
  "recommend skipping this surface instead of adding UI metadata",
  "Keep data/state/save/economy files inspect-only."
]) {
  assert.ok(identityPromptSource.includes(phrase), `missing identity prompt warning: ${phrase}`);
}

const cursorArenaFixture = readFixtureFiles(path.join(process.cwd(), "fixtures", "phaser-incremental-arena-sample"));
const cursorArenaText = cursorArenaFixture.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
assert.ok(cursorArenaText.includes("cursorattacksystem"));
assert.ok(cursorArenaText.includes("arenahud"));
assert.ok(cursorArenaText.includes("arena.html"));

const sortPuzzleFixture = readFixtureFiles(path.join(process.cwd(), "fixtures", "phaser-sort-puzzle-sample"));
const sortPuzzleText = sortPuzzleFixture.map((file) => `${file.relativePath}\n${file.text}`).join("\n").toLowerCase();
assert.ok(sortPuzzleText.includes("spiritsortscene"));
assert.ok(sortPuzzleText.includes("sortrules"));
assert.ok(sortPuzzleText.includes("spiritsortlevels"));

function readFixtureFiles(root: string): InspectedFile[] {
  const results: InspectedFile[] = [];
  for (const absolutePath of walk(root)) {
    if (!/\.(ts|js|json|html|css)$/i.test(absolutePath)) {
      continue;
    }
    results.push({
      relativePath: path.relative(root, absolutePath).replace(/\\/g, "/"),
      text: fs.readFileSync(absolutePath, "utf8"),
      sizeBytes: fs.statSync(absolutePath).size
    });
  }
  return results;
}

function walk(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolutePath = path.join(root, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}
