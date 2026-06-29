# Beta Dogfooding Checklist

Use this checklist for v0.95 beta dogfooding before any v0.99 release-candidate work.

## Required Families

- Idle Monster Farm / Monster Farm adapter surfaces
- Sort Puzzle adapter surfaces
- Cursor Arena adapter surfaces
- Generic Phaser only as optional extra coverage when practical

## Workflow Checks

- Dashboard opens from `Game Polish Lab: Open Visual Tuning Dashboard`.
- Adapter detected with confidence and evidence.
- Surface rows visible for the detected adapter.
- Config paths shown for style/config-backed rows.
- Existing style/config detection distinguishes valid, missing, invalid JSON, schema-invalid, and not-applicable states.
- Preview/tuning entry path opens through each row's Tune action.
- Save/update style config path is reachable through the tuner or config action.
- Direct apply status is visible and does not claim executable support for unsupported rows.
- Scope check is usable and lists allowed, suspicious, forbidden, warning, and recommended-action details.
- Rollback history is usable where snapshots exist, and restore paths stay scope-guard-safe.
- Asset validation is usable where asset contracts or replacement slots exist.
- Asset contact-sheet path is available only after valid asset contracts exist.
- Fallback task generation is clearly separated from direct apply and used only for unsupported, unusual, or structural work.
- Result/field note recording is usable through latest-result marking and field-note summary paths.
- Empty states explain safe next steps without suggesting direct source edits or unsafe gameplay edits.
- No gameplay, save, economy, progression, ad, rules, solver, level-data, player/projectile, or monetization files are changed.

## Family-Specific Checks

- Idle Monster Farm: farm slots, background readability, panels, reward toast, buttons, and Monster Farm asset rows are visible.
- Idle Monster Farm: style rows expose safe config direct apply; asset rows stay asset-contract/contact-sheet based.
- Sort Puzzle: shelf card, spirit slot, completed shelf, selected source/target shelf, invalid move feedback, win reward toast, and spirit asset presentation rows are visible.
- Sort Puzzle: SortRules, level data, solver, move validation, undo/hint, save/progression, scoring, and gameplay behavior remain forbidden.
- Cursor Arena: HUD panel, upgrade card, cursor hit/miss feedback, enemy kill feedback, combo feedback, and arena background readability rows are visible.
- Cursor Arena: economy, upgrade values, enemy HP/speed/spawn/damage, scoring, rewards, save/progression, player/projectile/shooter, ads, and monetization remain forbidden.
