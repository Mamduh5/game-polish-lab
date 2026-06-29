# v0.95 Beta Dogfooding

Date/version: 2026-06-29, Game Polish Lab 0.9.5 / v0.95 Beta Dogfooding.

## Games/Families Tested

- Idle Monster Farm / Monster Farm adapter surfaces using `fixtures/phaser-idle-monster-farm-sample`
- Sort Puzzle adapter surfaces using `fixtures/phaser-sort-puzzle-sample`
- Cursor Arena adapter surfaces using `fixtures/phaser-incremental-arena-sample`
- Generic Phaser was left as optional extra coverage for later manual smoke testing; v0.95 required coverage focused on the three main families.

## Surfaces Tested Per Game

- Idle Monster Farm: farm slots, background readability, panels, reward toast, buttons, Monster Farm assets.
- Sort Puzzle: shelf card, spirit slot, completed shelf glow, selected source/target shelf, invalid move feedback, win reward toast, spirit asset presentation.
- Cursor Arena: arena HUD panel, upgrade card, cursor hit feedback, cursor miss feedback, enemy kill feedback, combo feedback, arena background readability.

## Commands/Workflows Exercised

- `Game Polish Lab: Open Visual Tuning Dashboard` model path through adapter detection, summary generation, row generation, field-note summary, direct-apply capability summary, scope summaries, fallback actions, asset-contract summary, and rollback/contact-sheet availability states.
- `Game Polish Lab: Tune Visual Surface` entry path verified through dashboard row Tune actions.
- Config save/update path verified through generated style config paths and config action states.
- `Game Polish Lab: Check Codex Scope` behavior verified through scope guard classifications for forbidden gameplay, save, economy, progression, ad, Sort Puzzle rule/level/solver, and Cursor Arena balance/player/projectile paths.
- `Game Polish Lab: Open Rollback History` path verified as part of dashboard checklist and rollback docs; restore remains scope-guarded.
- Asset pipeline dashboard/contact-sheet flow verified where applicable through Monster Farm asset contracts and contact-sheet availability states.
- Fallback task generation verified as fallback-only/structural handoff, separated from direct apply.
- Result tracking verified through dashboard field-note summaries and latest-result row state.
- Empty-state behavior verified through dashboard model/manual checklist and documented safe next steps.

## What Worked

- All three main families are registered and detected from their fixture projects.
- Each main family produces safe visual surface targets without requiring new adapters or new surfaces.
- Style/config-backed rows expose config paths and direct-apply templates for safe style-config writes.
- Asset rows do not expose executable direct apply; they stay asset-contract/contact-sheet or fallback/manual.
- Sort Puzzle and Cursor Arena warnings keep source integration fallback-only unless the project already reads generated config.
- Scope guard still blocks forbidden gameplay, save, economy, progression, ad, Sort Puzzle rules/levels/solver, and Cursor Arena balance/player/projectile areas.
- Dashboard field-note summary and latest-result state provide a place to record usability findings.

## What Was Confusing

- Sort Puzzle and Cursor Arena use direct apply for safe generated style config writes, but runtime source integration still requires fallback unless the game already reads those configs. The report/checklist now calls this out explicitly.
- Asset contact sheets are only available after valid asset contracts exist; missing-contract states are expected, but users need to refresh asset contracts first.
- Rollback is discoverable from the dashboard, but there may be no snapshots until a direct apply or asset metadata write overwrites an existing visual file.

## Blockers Found

- Missing v0.95 dogfooding report and reusable beta checklist.
- Missing dogfooding-critical tests tying the three main adapter families to dashboard rows, direct-apply/fallback honesty, scope guard safety, asset contract states, and docs coverage.
- No product blocker required adapter creation, new surfaces, architecture changes, or sample game edits.

## Fixes Made In This Milestone

- Added this dogfooding report.
- Added `docs/beta-dogfooding-checklist.md`.
- Added fixture-backed dogfooding regression tests.
- Wired the dogfooding tests into `npm test`.
- Updated package metadata and changelog to 0.9.5/v0.95 without adding publishing or release-candidate behavior.

## Known Limitations Left For After v0.95

- Manual VS Code extension smoke testing should still run before v0.99.
- Marketplace publisher, license, icon, and final listing copy remain unresolved.
- Generic Phaser remains optional extra dogfooding coverage.
- Sort Puzzle and Cursor Arena runtime source integration remains fallback-only unless a project already consumes generated configs.
- Asset-loader/source patching remains unsupported except through explicit safe manifest/config contracts.
- No v0.99 scope freeze, marketplace publish, or release-candidate certification was performed.

## Safety Confirmation

No gameplay, save, economy, progression, ad, rules, solver, level-data, player/projectile, shooter, monetization, or user-game logic was changed for v0.95. The milestone changed docs, tests, package metadata, and release-readiness notes only.
