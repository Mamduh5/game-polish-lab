# Game Polish Lab Usage

Game Polish Lab is a local VS Code visual-polish console for Phaser projects. It helps inspect visual surfaces, tune supported style configs, create guarded fallback tasks, and restore Game Polish Lab-owned visual files through rollback snapshots.

## Basic Flow

1. Open a game workspace in VS Code.
2. Run `Game Polish Lab: Open Visual Tuning Dashboard`.
3. Confirm the dashboard header shows the active workspace name, full path, and mode. Real projects should show `real_workspace`; fixture workspaces should show `fixture_test`.
4. Review the Workspace Detection section. It should list evidence from the active project, such as `package.json`, Phaser scene files, adapter owner files, or known config files.
5. Choose a supported surface or open `Game Polish Lab: Tune Visual Surface`.
6. Check the preview source label before trusting the before/after view. It should say whether the preview is based on an existing real project config, a generated real-project default, a fixture test preview, or an example preview that is not connected to the game yet.
7. Preview changes, then use `Save & Apply` only when the button says `Save & Apply` and the adapter reports a connected direct-apply path. If the button says `Save Config`, the change is saved as Game Polish Lab config only and still needs setup or fallback work before the game consumes it.
8. Use the Asset Pipeline Dashboard for imported asset metadata, contact sheets, manifest checks, and scoped fallback tasks.
9. Use Rollback History or `Undo Last Apply` in the visual tuner to restore safe Game Polish Lab-owned visual config changes.

Fixture or demo data should never appear for a real project. If a real workspace shows fixture paths, fixture project names, or Monster Farm rows without Monster Farm evidence, stop and treat it as a release blocker.

## Direct Apply

Direct apply is intentionally narrow. Idle Monster Farm visual style configs can be saved and applied when the adapter reports a supported path. Unsupported runtime integration remains fallback-only and should be handled through generated task files.

The visual tuner distinguishes `Save Config` from `Save & Apply`. `Save Config` writes the Game Polish Lab style JSON and refreshes the preview baseline, but it does not mean the running game or source scene is wired to consume that config. `Save & Apply` is shown only for connected Idle Monster Farm visual style paths that report direct apply support.

Sort Puzzle and Cursor Arena adapter metadata can still be inspected, but unsupported runtime direct apply must not be treated as enabled unless the project already has a supported integration path.

If no supported adapter is detected, the dashboard should show the real workspace path and either Generic Phaser fallback rows for an unknown Phaser project or an empty unsupported state for a non-Phaser workspace. It must not silently fall back to fixture Monster Farm rows.

## Rollback

Rollback is limited to visual files that pass the scope guard. Suspicious or forbidden files are skipped, blocked, or converted into fallback guidance instead of being restored automatically.

In the visual tuner, `Undo Last Apply` restores the latest safe rollback snapshot for the current Idle Monster Farm visual style config. `Ctrl+Z` triggers the same one-step undo when the tuner is focused and a safe rollback snapshot is available.

## Safety Boundaries

Game Polish Lab should not edit gameplay, save, economy, progression, ad, rules, solver, level-data, player, projectile, shooter, or monetization logic as part of visual-polish workflows. Use generated fallback tasks for any change that needs human review outside the guarded visual scope.
