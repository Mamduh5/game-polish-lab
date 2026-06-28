# Generic Phaser v2

Generic Phaser v2 is an improvement to the existing `generic_phaser` adapter contract. It is fallback-only in adapter priority: Idle Monster Farm, Sort Puzzle, and Cursor Arena win when their stronger project signals are detected. Non-Phaser projects should not receive high-confidence Generic Phaser behavior.

The workflow is preview-first:

1. Choose a generic visual surface.
2. Choose or accept a suggested owner file.
3. Generate or preview a style config under `.game-polish-lab/styles/**`.
4. Direct apply only safe generated config or validated asset-copy paths.
5. Generate a scoped fallback task only when real project integration cannot be safely direct-applied.

Generic Phaser v2 adds descriptive owner-file hints for Phaser scene files, UI/render files, style/config files, and asset manifests. These are hints only.

Manual rows cover the existing generic surface families: slot/card, panel, button, reward toast, background readability, asset replacement, plus HUD mapped to `panel` and impact/hit feedback mapped to `reward_toast`. Target-specific configs use deterministic paths such as `.game-polish-lab/styles/generic-hud-style.json`, `.game-polish-lab/styles/generic-impact-feedback-style.json`, and `.game-polish-lab/styles/generic-asset-presentation-style.json`.

Do not auto-edit unknown scene files. Do not guess gameplay structure. Do not add game-specific adapter behavior under Generic Phaser. Direct apply is conservative and config-only for generated style configs; asset rows are copy/manual-loader only. Source owner files are suspicious/fallback-only and source integration uses fallback tasks with chosen file scope.

Fallback tasks must include the user-selected file scope, visual-only instructions, and explicit warnings against gameplay, save, economy, progression, ad, monetization, rules, solver, undo/hint, and package changes.
