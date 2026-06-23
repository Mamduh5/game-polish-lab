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
import { pixelPolishKitPresets } from "../presets/pixelPolishKitPresets";
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
