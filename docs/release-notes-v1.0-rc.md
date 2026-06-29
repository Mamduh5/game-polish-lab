# Game Polish Lab 1.0 Release Candidate Notes

Version: 0.9.9 / v0.99 1.0 Release Candidate.

These notes describe RC readiness only. The extension has not been published to Marketplace.

## Included In The RC

- Visual Tuning Dashboard for choosing supported visual surfaces and reviewing config, direct-apply, fallback, scope, asset-contract, rollback, and result status.
- Existing visual surface flows for slot/card, panel, button, reward toast, and background readability.
- Existing asset import, validation, dashboard, contact-sheet, and manifest/config workflows.
- Existing adapters for Monster Farm, Sort Puzzle, Cursor Arena, and Generic Phaser.
- Direct apply where existing templates and scope guard allow safe config or manifest writes.
- Fallback task generation for unsupported, structural, or unusual work.
- Scope guard rules for forbidden gameplay, save, economy, progression, ad, rules, solver, level-data, player/projectile, shooter, and monetization paths.
- Rollback snapshots/history for supported visual files.
- Result tracking and field notes.
- Packaging checks, CI docs, safety docs, and beta dogfooding evidence.

## Not Included

- Marketplace publishing.
- New adapters.
- New visual surfaces.
- New asset pipeline feature families.
- Screenshot annotation as a production workflow.
- Live in-game dev overlay as a production workflow.
- Automatic "make beautiful" AI visual redesign.
- Structural gameplay or layout editors.
- Runtime integration for Sort Puzzle or Cursor Arena beyond existing generated config paths.

## Pending Before Final Release

- Publisher identity.
- License selection.
- Extension icon.
- Marketplace copy.
- Manual VS Code smoke test in an Extension Development Host.

## Known Limitations

- Asset replacement remains contract/contact-sheet or explicit safe manifest/config based; arbitrary loader/source patching is fallback-only.
- Generic Phaser remains safe-config-first.
- Sort Puzzle and Cursor Arena generated config writes do not prove runtime application unless the project already reads those configs.
- Manual visual review is still required; the extension does not score visual quality automatically.

## Safety Confirmation

No gameplay, save, economy, progression, ad, rules, solver, level-data, player/projectile, shooter, monetization, fixture, sample-game, or user-game logic is changed by the RC.
