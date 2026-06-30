# Game Polish Lab Usage

Game Polish Lab is a local VS Code visual-polish console for Phaser projects. It helps inspect visual surfaces, tune supported style configs, create guarded fallback tasks, and restore Game Polish Lab-owned visual files through rollback snapshots.

## Basic Flow

1. Open a game workspace in VS Code.
2. Run `Game Polish Lab: Open Visual Tuning Dashboard`.
3. Confirm the dashboard header shows the active workspace name, full path, and mode. Real projects should show `real_workspace`; fixture workspaces should show `fixture_test`.
4. Review the Workspace Detection section. It should list evidence from the active project, such as `package.json`, Phaser scene files, adapter owner files, or known config files.
5. Choose a supported surface or open `Game Polish Lab: Tune Visual Surface`.
6. Check the preview source label before trusting the before/after view. It should say whether the preview is based on an existing real project config, a generated real-project default, a fixture test preview, or an example preview that is not connected to the game yet.
7. Preview changes, then use `Save & Apply` only when the button says `Save & Apply` and the adapter proof says runtime value usage is connected. If the button says `Save Config`, the change is saved as Game Polish Lab config only and still needs setup or fallback work before the game consumes it.
8. Use the Asset Pipeline Dashboard for imported asset metadata, contact sheets, manifest checks, and scoped fallback tasks.
9. Use Rollback History or `Undo Last Apply` in the visual tuner to restore safe Game Polish Lab-owned visual config changes.

Fixture or demo data should never appear for a real project. If a real workspace shows fixture paths, fixture project names, or Monster Farm rows without Monster Farm evidence, stop and treat it as a release blocker. A generated webview preview is synthetic; it is not a live screenshot of the running game and is not acceptance evidence that runtime code consumed generated values. Fixture data is regression coverage only, not proof that a real project is connected.

## Direct Apply

Direct apply is intentionally narrow. Idle Monster Farm visual style configs can be saved and applied when the adapter reports a supported path with runtime value usage proof. Unsupported runtime integration remains fallback-only and should be handled through generated task files.

`Direct apply connected` means runtime owner/rendering code in the active workspace reads generated Game Polish Lab style values in render-affecting code. For example, farm-slot rendering must consume properties such as `FARM_SLOT_STYLE.slotWidth`, `FARM_SLOT_STYLE.fillColor`, or `FARM_SLOT_STYLE.monsterDisplayScale`.

The proof statuses are explicit:

- `connected` / `runtime_value_usage`: generated style properties are used by runtime rendering code; `Save & Apply` may be enabled.
- `import_only`: a style module import exists, but no generated property is consumed; this is not connected.
- `config_only`: a generated config/module exists, but runtime rendering does not read it; this is not connected.
- `comment_only`: a bridge/comment marker exists, but no property is consumed; this is not connected.
- `not_connected` or `unknown`: no sufficient runtime usage proof was found.

The visual tuner distinguishes `Save Config` from `Save & Apply`. `Save Config` writes the Game Polish Lab style JSON and refreshes the preview baseline, but it does not mean the running game or source scene is wired to consume that config. `Save & Apply` is shown only for Idle Monster Farm visual style paths with connected runtime value usage proof. Setup Direct Apply either patches recognized safe visual usage and re-proves runtime usage, or declines and creates fallback guidance. Import-only setup is not accepted.

Dashboard and tuner diagnostics show proof status, proof level, style source, evidence files, matched properties, and missing pieces. Use those fields to inspect why direct apply is enabled or why the workflow remains `Save Config`.

Sort Puzzle and Cursor Arena adapter metadata can still be inspected, but unsupported runtime direct apply must not be treated as enabled unless the project already has a supported integration path.

If no supported adapter is detected, the dashboard should show the real workspace path and either Generic Phaser fallback rows for an unknown Phaser project or an empty unsupported state for a non-Phaser workspace. It must not silently fall back to fixture Monster Farm rows.

## Rollback

Rollback is limited to visual files that pass the scope guard. Suspicious or forbidden files are skipped, blocked, or converted into fallback guidance instead of being restored automatically.

In the visual tuner, `Undo Last Apply` restores the latest safe rollback snapshot for the current Idle Monster Farm visual style config. `Ctrl+Z` triggers the same one-step undo when the tuner is focused and a safe rollback snapshot is available.

## Safety Boundaries

Game Polish Lab should not edit gameplay, save, economy, progression, ad, rules, solver, level-data, player, projectile, shooter, or monetization logic as part of visual-polish workflows. Use generated fallback tasks for any change that needs human review outside the guarded visual scope.
