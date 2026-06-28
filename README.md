# Game Polish Lab

Game Polish Lab is a VS Code extension for solo game developers who want safer, stricter polish workflows for pixel-art Phaser games. It inspects the opened workspace, creates local polish profiles, writes audits, creates task and kit files, opens visual polish webviews, and generates Codex-safe prompts.

It does not beautify a game automatically, call external AI APIs, require network access, require Phaser to be installed inside this extension, add runtime dependencies to the user game, or make the optional in-game dev overlay part of the normal polish loop.

## Current v0.7 Guide

For the stabilized v0.6 workflow, including the Visual Tuning Dashboard, preview renderer, style presets, asset contracts/contact sheets, scope guard, rollback history, direct apply templates, and optional `?polish=1` dev overlay, see [`docs/v0.6-stabilization.md`](docs/v0.6-stabilization.md). v0.7 extends that console with Sort Puzzle, Cursor Arena, Generic Phaser v2 metadata, theme export/import, screenshot annotation handoffs, and multi-game regression fixtures.

For adapter-contract details, see [`docs/adapter-contract.md`](docs/adapter-contract.md). Adapter and v0.7 docs:

- [`docs/sort-puzzle-adapter.md`](docs/sort-puzzle-adapter.md)
- [`docs/cursor-arena-adapter.md`](docs/cursor-arena-adapter.md)
- [`docs/generic-phaser-v2.md`](docs/generic-phaser-v2.md)
- [`docs/theme-export-import.md`](docs/theme-export-import.md)
- [`docs/screenshot-annotation.md`](docs/screenshot-annotation.md)
- [`docs/regression-fixtures.md`](docs/regression-fixtures.md)
- [`docs/v0.7-adapter-stabilization.md`](docs/v0.7-adapter-stabilization.md)
- [`docs/asset-pipeline-dashboard.md`](docs/asset-pipeline-dashboard.md)
- [`docs/asset-bounds-normalization.md`](docs/asset-bounds-normalization.md)
- [`docs/v0.7-migration-notes.md`](docs/v0.7-migration-notes.md)

v0.81 extends `Game Polish Lab: Open Asset Pipeline Dashboard` with opt-in PNG alpha-bounds analysis and managed normalized copies under `.game-polish-lab/assets/normalized/`. It preserves original imported and game assets, keeps assignment metadata separate from runtime application, and does not generate artwork, automate manifest direct applies, or patch source loaders/manifests.

## What v0.4.2 Does

v0.4.2 cleans up Monster Farm audit reporting. `FarmScene` confidence now accepts direct scene files, `class FarmScene`, general `FarmScene` references, and `src/main.ts` scene-list wiring. Monster Farm audits also keep generic action/combat keyword buckets out of the main `Suggested Project Type` section and report them under `Non-Dominant Keyword Noise` instead.

## What v0.4.3 Does

v0.4.3 folds real Monster Farm trial feedback into generated prompts and kit guidance. Farm slot readability and panel hierarchy are now treated as proven-good early polish targets. Monster identity prompts warn against farm-grid family initials, level badges, metadata chips, or extra labels because trial feedback found them noisy; exact monster metadata belongs in compendium/detail UI. Hatch panel style-only polish is treated as optional unless the user reports a clear hatch-state problem.

## What v0.4.1 Does

v0.4.1 deepens Idle Monster Farm support for nearly finished Phaser idle/economy games. Monster Farm audits now treat the game as a UI-heavy idle farm with several visible surfaces, not as a simple clicker or one `tap_farm_idle` bucket.

Monster Farm audits now include:

- `Monster Farm Confidence`
- `Monster Farm Surface Map`
- `Finish-Stage Polish Priorities`
- `File Role Map`
- `Non-Dominant Keyword Noise`
- `Rendering Style Readiness`

The recommended Monster Farm kit order now prioritizes slot state and monster identity before tap juice:

1. `monster_farm_slot_readability`
2. `monster_identity_readability`
3. `hatch_feedback`
4. `merge_feedback`
5. `tap_farm_feedback`
6. `coin_bug_feedback`
7. `farm_hud_readability`
8. `panel_readability`
9. `quest_widget_readability`
10. `toast_reward_feedback`
11. `boss_battle_feedback`

New command:

- `Game Polish Lab: Create Finish-Stage Polish Plan`

Use it before asking Codex to patch a nearly finished Monster Farm. The generated prompt is inspect-only and asks for the top five polish opportunities, likely files, visible improvement, risk, files not to touch, tiny patch idea, rollback, and manual tests.

## What v0.4.0 Does

v0.4.0 expands Game Polish Lab beyond incremental cursor arenas with two additional real game families:

- Cozy Shelf Sort Puzzle
- Idle Monster Farm

The extension now detects these families, reports the expected code style/runtime model, recommends family-specific kits, and generates visual diagnosis and kit prompts with the right guardrails. It still keeps Safe performance mode as the default and does not scan assets by default.

## Supported Real Game Families

### Incremental Cursor Arena

Detected from `arena.html`, `src/arena/main.js`, `ARENA.ArenaScene`, `CursorAttackSystem`, DOM HUD/shop controls, and browser-global IIFE scripts.

Recommended first kits: `cursor_attack_feedback`, `enemy_kill_feedback`, `combo_feedback`, `arena_hud_readability`, `arena_upgrade_panel_readability`, `arena_background_readability`.

Do not add player/projectile systems, change click damage/radius, enemy HP, rewards, waves, upgrade costs, save fields, or DOM bindings.

### Cozy Shelf Sort Puzzle

Detected from `SpiritSortScene`, `SortRules`, `spiritSortLevels`, shelves, selected shelf state, valid/invalid move checks, completed shelf state, spirit bounce, and win message signals.

Recommended first kits: `sort_move_feedback`, `selected_shelf_readability`, `invalid_move_feedback`, `completed_shelf_glow`, `win_celebration`, `spirit_identity_readability`.

Do not change `SortRules`, level data, progress/save/unlock logic, or make invalid moves legal.

Sort Game Workflow:

1. Run audit.
2. Create Visual Diagnosis Task: Sort Move Feedback.
3. Create Pixel Polish Kit: Sort Move Feedback Kit.
4. Send generated inspect-first prompt to Codex in `sort-game`.
5. Approve only if it does not touch SortRules, levels, or save/progression.
6. Run `npm test`.
7. Test valid move, invalid move, completed shelf, and win state.

### Idle Monster Farm

Detected from `FarmScene`, `MonsterRenderer`, Phaser UI views such as `TapFarmView`/`HatchPanelView`/`HudView`, panel helpers, farm slot/hatch/tap/coin/upgrade/quest state, progression, merge, save, and ad signals.

Expected runtime model: `phaser_rendered_ui_heavy`.

Recommended first kits: `monster_farm_slot_readability`, `hatch_feedback`, `merge_feedback`, `tap_farm_feedback`, `coin_bug_feedback`, `farm_hud_readability`, `panel_readability`.

Do not change save schema, coin/income formulas, hatch odds/costs/cooldowns, upgrade costs, quest rewards, ad/monetization behavior, or rewrite `FarmScene`.

Idle Monster Farm Workflow:

1. Run audit.
2. Create Finish-Stage Polish Plan.
3. Pick one surface.
4. Create Visual Diagnosis Task.
5. Send the inspect-only prompt to Codex in `Idle-Monster-Farm`.
6. Approve a tiny patch only if it avoids save/economy/hatch/ad/progression.
7. Run `npm run build`.
8. Test hatch, merge, tap farm, coin bug, panels, and save/load.
9. Mark result better/worse/same/mixed.

## Monster Farm Deep Audit

Monster Farm is a UI-heavy idle farm, not a simple clicker. `tap_farm_idle` can be the strongest submode, but it is not the whole project.

Major surface modes:

- `monster_farm_slots`
- `monster_identity`
- `hatch_merge_loop`
- `tap_farm_idle`
- `ui_panel_hierarchy`
- `quest_reward_guidance`
- `boss_battle_secondary`

Use Finish-Stage Polish Plan first, then work one surface at a time. Do not use broad "make it polished" prompts on nearly finished idle/economy games.

Finish-stage Monster Farm workflow:

1. Run audit.
2. Create Finish-Stage Polish Plan.
3. Pick one surface.
4. Create diagnosis task.
5. Send inspect-only prompt to Codex in `Idle-Monster-Farm`.
6. Approve tiny patch only if it avoids save/economy/hatch/ad/progression.
7. Run `npm run build`.
8. Manual test matrix.
9. Mark result better/worse/same/mixed.

Monster Farm diagnosis bundle presets:

- `monster_farm_finish_audit`
- `farm_slot_state_readability_diagnosis`
- `monster_identity_diagnosis`
- `hatch_merge_loop_diagnosis`
- `tap_farm_and_coin_bug_diagnosis`
- `panel_hierarchy_diagnosis`

Every Monster Farm generated prompt includes a finish-stage guardrail: diagnose first, patch one small reversible surface at a time, do not modify economy/save/hatch odds/upgrade costs/quest rewards/ad monetization/progression formulas, do not rewrite `FarmScene`, prefer UI view or config files, and keep state/data/system files inspect-only unless explicitly requested.

Legacy v0.4.0 workflow remains valid for focused kits:

1. Run audit.
2. Create Visual Diagnosis Task: Farm Slot Readability or Tap Farm Feedback.
3. Create Pixel Polish Kit.
4. Send generated inspect-first prompt to Codex in `Idle-Monster-Farm`.
5. Approve only if it avoids save/economy/hatch/ad logic.
6. Run `npm run build`.
7. Test hatch, merge, tap farm, coin bug, panels, and save/load.

## What v0.3.0 Does

v0.3.0 adds Visual Polish Contracts: diagnosis-first, skin-aware, rollback-safe prompts for real game polish work.

Safe file scope is not enough. A patch can stay inside allowed files and still make a game look worse if it globally boosts shared effects without understanding skin-owned visuals, fallback overlays, duplicate layers, and per-skin state. Game Polish Lab now pushes visual work through diagnosis before tuning when results are weak, same, mixed, or worse.

New commands:

- `Game Polish Lab: Create Visual Diagnosis Task` creates an inspect-only task and prompt under `.game-polish-lab/diagnostics/`.
- `Game Polish Lab: Create Tuning Experiment` creates a small reversible experiment under `.game-polish-lab/experiments/`.
- `Game Polish Lab: Create Rollback Prompt` creates a precise rollback prompt under `.game-polish-lab/rollbacks/`.
- `Game Polish Lab: Add Field Note` stores project-specific lessons in `.game-polish-lab/field-notes.md`.

Visual diagnosis prompts require Codex to map feedback data flow, skin-owned effects, shared fallback effects, duplicate layers, risky global values, and the smallest safe patch before any code changes.

Generated kit prompts now include a Visual Safety Gate. Before changing visual intensity, Codex must inspect what is already drawn by project-specific skins/themes and what is drawn by shared fallback effects. If multiple skins, themes, or states are affected, prompts block global increases to scale, alpha, particle count, flash size, or duration unless there is per-skin compatibility reasoning, a fallback-only strategy, or a clearly reversible user-approved experiment.

Example: if Cursor Attack Feedback got worse after global tuning because a dark/blue-looking shared layer stacked badly on some click skins, the recommended response is to rollback aggressive values, inspect skin layers, then create a per-skin or fallback-only experiment. Do not keep making all effects stronger.

## What v0.2.4 Does

v0.2.4 fixes mixed-route runtime detection for real incremental arena branches.

If a repo contains both a hidden Phaser DOM/timer route such as `src/main.js` and a strong arena route such as `arena.html`, `src/arena/main.js`, `ARENA.ArenaScene`, `CursorAttackSystem`, and `ArenaHud`/`UpgradePanel`, Game Polish Lab now treats the arena route as the primary polish route. The audit reports `phaser_rendered_dom_hud` as the primary runtime model and `phaser_timer_dom_ui` as secondary when both routes are present.

Cursor arena audits now recommend arena-specific kits first: `cursor_attack_feedback`, `enemy_kill_feedback`, `combo_feedback`, `arena_hud_readability`, `arena_upgrade_panel_readability`, and `arena_background_readability`.

## What v0.2.3 Does

v0.2.3 is a performance safety pass for slower PCs and large game repositories.

Game Polish Lab now uses a shared workspace scanner with session caching, aggressive excludes, scan budgets, progress notifications, and cancellation support for long scans. The default profile performance mode is `safe`.

Phaser audits prioritize likely source files such as `package.json`, `index.html`, `arena.html`, `src/main.*`, scene/system/UI/data/config files, and small script files before broad source globs. Audits include a `Scan Stats` section and mark partial scans with:

`Scan was capped for performance. Results may be incomplete.`

No new polish features, engines, AI calls, or dashboard webviews were added in this version.

## What v0.2.1 Does

v0.2.1 adds a real-project trial workflow for dogfooding Game Polish Lab on actual Phaser games. Trial reports track the project, blocker, artifact used, Codex plan review, after-test result, scope guard result, and extension feedback.

Trial reports are written under `.game-polish-lab/trials/` with stable names such as `001-real-project-trial.md`.

## What v0.2.2 Does

v0.2.2 adds incremental cursor arena support based on dogfooding against `Mamduh5/Do-Not-Click-This-Button` branch `experiment/incremental-arena`.

This project shape is not a generic player/projectile arena. Phaser renders the arena field, pointer/click/cursor attacks are the main action, and DOM elements own HUD/shop/upgrade controls. Game Polish Lab now detects this as `phaser_rendered_dom_hud` with project types such as `incremental_arena`, `cursor_attack_arena`, and `phaser_dom_hud`.

Recommended first kit: `Cursor Attack Feedback Kit`.

Use the arena-specific kits first:

- Cursor Attack Feedback Kit
- Enemy Kill Feedback Kit
- Combo Feedback Kit
- Arena HUD Readability Kit
- Arena Upgrade Panel Readability Kit
- Arena Background Readability Kit

Warning: do not use generic Projectile Readability or Player Damage kits unless the project actually has projectile or player-avatar systems.

## What v0.2 Does

v0.2 adds the Pixel Polish Kit Generator. A Pixel Polish Kit is a small, reusable, config-driven package for a specific game presentation problem: hit feedback, pickup feedback, projectile readability, control feel, HUD readability, idle upgrade UI, reward popups, sprite readability, or camera/screen feedback.

Each kit creates:

- `.game-polish-lab/kits/<kit-id>/kit.json`
- `.game-polish-lab/kits/<kit-id>/README.md`
- `.game-polish-lab/kits/<kit-id>/codex-implementation-prompt.md`
- An optional source config template such as `src/config/hitFeedbackConfig.ts`, only after user confirmation.

## Commands

- `Game Polish Lab: Initialize Project Profile` creates or migrates `.game-polish-lab/profile.json`.
- `Game Polish Lab: Run Phaser Pixel Audit` writes `.game-polish-lab/audits/latest-phaser-pixel-audit.md`.
- `Game Polish Lab: Create Polish Task` writes a strict task JSON file in `.game-polish-lab/tasks/`.
- `Game Polish Lab: Create Finish-Stage Polish Plan` creates an inspect-only Monster Farm polish planner prompt.
- `Game Polish Lab: Create Rescue Task` creates a focused rescue task from project status and main blocker.
- `Game Polish Lab: Create Pixel Polish Kit` creates kit files and optionally a source config template.
- `Game Polish Lab: List Pixel Polish Kits` opens an existing kit README or JSON file.
- `Game Polish Lab: Generate Kit Implementation Prompt` regenerates the strict prompt for an existing kit and copies it to the clipboard.
- `Game Polish Lab: Create Pixel Art Style Guide` creates `.game-polish-lab/style-guide.md`.
- `Game Polish Lab: Generate Codex Prompt` turns an existing task JSON into `.game-polish-lab/prompts/latest-codex-prompt.md`.
- `Game Polish Lab: Create Real Project Trial Report` creates a dogfooding report under `.game-polish-lab/trials/`.
- `Game Polish Lab: Update Trial Result` appends a dated result and decision update to an existing trial report.
- `Game Polish Lab: Open Trial Reports` opens an existing trial report.
- `Game Polish Lab: Check Codex Scope` groups changed files as allowed/suspicious/forbidden and writes `.game-polish-lab/audits/latest-scope-check.md`.
- `Game Polish Lab: Set Performance Mode` updates `.game-polish-lab/profile.json` and clears scan cache.
- `Game Polish Lab: Clear Scan Cache` clears cached file lists, file text, and detection results.
- `Game Polish Lab: Show Performance Diagnostics` writes a lightweight performance summary to the Game Polish Lab output channel.
- `Game Polish Lab: Create Visual Diagnosis Task` creates an inspect-only visual diagnosis task and prompt.
- `Game Polish Lab: Create Tuning Experiment` creates one rollback-safe visual tuning experiment from a diagnosis.
- `Game Polish Lab: Create Rollback Prompt` creates a rollback or partial-rollback Codex prompt.
- `Game Polish Lab: Open Rollback History` opens safe visual rollback snapshots.
- `Game Polish Lab: Open Asset Contact Sheet` previews existing asset contracts.
- `Game Polish Lab: Open Visual Tuning Dashboard` opens the v0.6 visual polish console.
- `Game Polish Lab: Tune Visual Surface` opens the preview/tuning workflow for supported surfaces.
- `Game Polish Lab: Refresh Asset Contracts` refreshes `.game-polish-lab/assets/asset-contracts.json`.
- `Game Polish Lab: Mark Latest Tuning Result` records the latest tuning result.
- `Game Polish Lab: Create Optional In-game Dev Overlay Spike` generates developer-only overlay files after explicit approval.
- `Game Polish Lab: Add Field Note` records project-specific lessons for future prompts.

## Visual Polish Contracts

A Visual Polish Contract records the actual route/runtime model, project type, dominant mode, visual symptom, affected skins/states, hypothesis, allowed inspection files, forbidden systems, rollback reference, manual test matrix, and if-worse behavior.

Use a Visual Diagnosis Task before tuning when the symptom is unclear, the last result felt the same, or a stronger pass made visuals worse. The prompt is inspect-only: Codex must return planned files and a diagnosis before patching.

Use a Tuning Experiment only after diagnosis. It allows one hypothesis, a tiny file scope, rollback instructions, a manual test matrix, and a report of every changed value.

Use a Rollback Prompt when the result is worse or mixed. Rollback prompts prefer reverting aggressive config-only values while preserving safe extraction/wiring if the structure was not the problem.

Field notes are workspace-local memory. Add lessons such as: `Do-Not-Click-This-Button cursor attack skins get worse when shared flash/particles are globally boosted. Diagnose skin-owned effects before tuning.` Future generated prompts include those notes.

## Performance Modes

Profiles include `performanceMode`, which defaults to `safe`.

- `safe`: fastest, recommended for slower PCs. Reads up to 400 files, skips files over 160 KB, and caps total bytes read around 5 MB.
- `balanced`: more complete scan. Reads up to 900 files, skips files over 256 KB, and caps total bytes read around 12 MB.
- `deep`: slower, for troubleshooting only. Reads up to 2000 files, skips files over 512 KB, and caps total bytes read around 30 MB.

All modes still skip generated/build/dependency folders and asset folders by default.

Skipped folders include:

- `node_modules`
- `dist`
- `build`
- `out`
- `coverage`
- `.git`
- `.vscode`
- `.next`
- `public/build`
- `vendor`
- `temp`
- `tmp`
- `logs`
- `.game-polish-lab/kits`
- `.game-polish-lab/trials`
- `.game-polish-lab/audits`
- `.game-polish-lab/prompts`
- `assets`
- `public/assets`
- `static/assets`

Assets are skipped because project type, runtime model, code style, and pixel-rendering checks only need source/config/CSS/HTML evidence. Large art/audio folders should only be scanned by a future explicit asset-audit command.

Audit reports include:

- Performance mode
- Files considered
- Files read
- Bytes read
- Files skipped by size
- Files skipped by exclude
- Scan capped
- Partial scan

Use `Game Polish Lab: Show Performance Diagnostics` to inspect the last scan and cache status. Use `Game Polish Lab: Clear Scan Cache` if results look stale after moving files or switching branches.

## Polish Task vs Polish Kit

A polish task is a one-off, strict scope file for a specific Codex pass. Use it when you know exactly what needs to be improved.

A polish kit is a reusable tuning package. Use it when you want a config file plus implementation prompt so values like timing, scale, speed, alpha, and shake stay centralized and manually tunable after Codex implements the wiring.

## Pixel Polish Kit Workflow

1. Run `Game Polish Lab: Run Phaser Pixel Audit`.
2. Run `Game Polish Lab: Create Pixel Art Style Guide`.
3. Run `Game Polish Lab: Create Pixel Polish Kit`.
4. Choose whether to generate only `.game-polish-lab` files or also a source config file.
5. Send the kit implementation prompt to Codex.
6. Review planned files.
7. Approve patch if `codexRequiresApprovalBeforePatch` is enabled.
8. Run `Game Polish Lab: Check Codex Scope`.
9. Tune config values manually.

## Real-Project Dogfood Loop

1. Open a real Phaser game repo.
2. Initialize profile.
3. Run Phaser Pixel Audit.
4. Create Pixel Art Style Guide.
5. Create Pixel Polish Kit.
6. Generate kit implementation prompt.
7. Send prompt to Codex.
8. Review Codex planned files.
9. Approve or reject the patch.
10. Run Check Codex Scope.
11. Create or update Real Project Trial Report.
12. Decide: keep, revert, tune, or create another task.

Example trials:

- Arena combat game blocked by weak hit feedback.
- Idle economy game blocked by confusing upgrade screen.
- Pixel-art game blocked by blurry rendering.
- Abandoned prototype blocked by control feel.

## Supported Project Types

Profiles default to `unknown`. Audits suggest a project type from filenames and source text, but never overwrite the profile automatically.

Supported values:

- `unknown`
- `arena_combat`
- `top_down_shooter`
- `survivor_like`
- `idle_economy`
- `clicker_incremental`
- `moba_like`
- `mobile_action`
- `hybrid`
- `incremental_arena`
- `cursor_attack_arena`
- `phaser_dom_hud`
- `cozy_sort_puzzle`
- `shelf_sort_puzzle`
- `tap_to_move_sort_puzzle`
- `idle_monster_farm`
- `monster_merge_idle`
- `phaser_ui_heavy_idle`
- `tap_farm_idle`

## Phaser-Rendered DOM HUD Projects

Some Phaser games render the arena or action field in canvas while DOM owns HUD, shop, upgrade panels, buttons, selectors, and status UI. Game Polish Lab calls this runtime presentation model `phaser_rendered_dom_hud`.

For these projects, prompts preserve DOM IDs and browser-global IIFE patterns such as `window.ARENA`. The extension should not suggest converting the game to modules, TypeScript, or an app-style UI architecture.

## Action vs Idle Polish

For action and arena games, Game Polish Lab prioritizes gameplay readability: player/enemy/projectile readability, hit feedback, pickup feedback, camera/screen feedback, control feel, danger telegraphs, sprite scaling consistency, and hitbox fairness.

For idle and menu-heavy games, it prioritizes hierarchy, resource clarity, upgrade clarity, icon/card consistency, button/card feedback, panel spacing, reward popups, and progress bars. Economy values and save fields are not visual-polish targets.

## Rescue Task Workflow

Use rescue tasks when a project is playable or close to finished but blocked by visuals, UI, controls, readability, or feel. The generated task includes suggested presets, anti-patterns, and a definition of done so Codex stays focused on a small rescue patch instead of a redesign.

## Development

```bash
npm install
npm run compile
npm run lint
npm test
```

To run the extension:

1. Open this repository in VS Code.
2. Run `npm install`.
3. Press `F5` to launch an Extension Development Host.
4. In the Extension Development Host, open a Phaser project folder.
5. Run Game Polish Lab commands from the Command Palette.

## Fixture Testing

Fixture workspaces:

- `fixtures/phaser-pixel-sample/`
- `fixtures/phaser-arena-sample/`
- `fixtures/phaser-idle-sample/`
- `fixtures/phaser-incremental-arena-sample/`
- `fixtures/phaser-sort-puzzle-sample/`
- `fixtures/phaser-idle-monster-farm-sample/`

To dogfood manually:

1. Start the Extension Development Host with `F5`.
2. Open one fixture folder as the workspace folder.
3. Run `Game Polish Lab: Initialize Project Profile`.
4. Run `Game Polish Lab: Run Phaser Pixel Audit`.
5. Run `Game Polish Lab: Create Pixel Art Style Guide`.
6. Run `Game Polish Lab: Create Pixel Polish Kit`.
7. Generate a config template only if you want to test source-file creation.

## Incremental Cursor Arena Workflow

For the `Do-Not-Click-This-Button` branch `experiment/incremental-arena`:

1. Open the branch workspace.
2. Run `Game Polish Lab: Run Phaser Pixel Audit`.
3. Confirm runtime presentation model is `phaser_rendered_dom_hud`.
4. Confirm suggested project type is `incremental_arena` or `cursor_attack_arena`.
5. Run `Game Polish Lab: Create Pixel Polish Kit`.
6. Pick `Cursor Attack Feedback Kit`.
7. Generate `src/arena/data/cursorAttackFeedbackConfig.js` only if you want the source config file.
8. Send the generated kit implementation prompt to Codex.
9. Review planned files before approving patches.
10. Run `Game Polish Lab: Check Codex Scope`.

## Troubleshooting

If the extension feels slow, run `Game Polish Lab: Set Performance Mode` and choose `Safe`. Then run `Game Polish Lab: Clear Scan Cache` if previous scan results may be stale.

If an audit is partial, the scan hit a safety budget. The report is still usable, but results may be incomplete. Use `Balanced` or `Deep` only when troubleshooting a specific detection problem.

If a real project is too large, keep assets and generated files in the skipped folders listed above. Game Polish Lab does not need to scan art/audio folders for source-code detection.

If a repo contains both a hidden Phaser DOM route and an arena route, Game Polish Lab should choose the arena route as the primary polish route when strong `src/arena` evidence exists. The audit should show `phaser_rendered_dom_hud` first and list `phaser_timer_dom_ui` only as a secondary runtime model.

Scope checks do not full-scan the workspace. They use `git diff --name-only`; if git is unavailable, run that command manually or provide the changed file list.

In restricted Codex shell execution on this Windows machine, standalone `npm run compile` can fail before TypeScript runs with `EPERM: operation not permitted, lstat 'C:\\Users\\mamdu'`. The same compile command passes in normal approved execution and through `npm test`. Extension scanning is guarded to use the opened workspace folder and skip files outside that workspace.

## Current Limitations

- No executable direct apply template exists for `asset_replacement`.
- The optional dev overlay is experimental, manually integrated, and gated by `?polish=1`.
- Generic Phaser support is safe-config-first, not full automatic game integration.
- Sort Puzzle, Cursor Arena, and Generic Phaser generated-config writes are config-only unless runtime integration is later implemented and tested.
- Direct applies are limited to known safe style config paths.
- Theme import/export and screenshot annotation do not apply runtime source changes.
- Structural gameplay/layout changes are intentionally out of scope.
- Manual VS Code webview/dashboard testing may still be needed after automated validation.

## v0.2 Limitations

- Phaser is the only implemented engine adapter.
- Early v0.2 builds had no dashboard webview; current v0.6 builds include the Visual Tuning Dashboard.
- Kit source config generation is opt-in and creates small template files only.
- Audits and project-type suggestions are static heuristics, not runtime validators.
- Scope checks use local git diff output and task JSON path lists.

## Future Adapter Plan

The source is split into command, core, preset, and adapter modules. Phaser lives under `src/adapters/phaser/`; future Godot, Unity, and Unreal support can be added as separate adapter folders without changing the current command surface.
