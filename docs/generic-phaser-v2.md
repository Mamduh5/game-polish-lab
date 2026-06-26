# Generic Phaser v2

Generic Phaser v2 is an improvement to the existing `generic_phaser` adapter contract.

The workflow is preview-first:

1. Choose a generic visual surface.
2. Generate or preview a style config under `.game-polish-lab/styles/**`.
3. Direct apply only safe generated config paths.
4. Generate a scoped fallback task only when real project integration cannot be safely direct-applied.

Generic Phaser v2 adds descriptive owner-file hints for Phaser scene files, UI/render files, style/config files, and asset manifests. These are hints only.

Do not auto-edit unknown scene files. Do not guess gameplay structure. Do not add game-specific adapter behavior under Generic Phaser.

Fallback tasks must include the user-selected file scope, visual-only instructions, and explicit warnings against gameplay, save, economy, progression, ad, monetization, rules, solver, undo/hint, and package changes.
