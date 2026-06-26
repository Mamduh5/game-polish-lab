# Visual Game Adapter Contract

`VisualGameAdapter` is the v0.70 contract layer for describing how an existing game family participates in Game Polish Lab without adding adapter-specific conditionals across the dashboard, tuner, direct-apply planner, fallback task flow, and scope guard.

The current registry includes:

- Idle Monster Farm
- Generic Phaser
- Sort Puzzle
- Cursor Arena

Sort Puzzle and Cursor Arena are registered v0.7 adapters. Generic Phaser v2 is an improvement to the existing `generic_phaser` adapter, not a new adapter id. Future game families are intentionally not registered yet.

## Contract Purpose

A `VisualGameAdapter` describes:

- adapter identity and game family
- supported generic visual surfaces
- adapter-specific surface targets
- likely owner files
- safe, suspicious, and forbidden scope metadata
- style config paths
- direct-apply capability
- fallback capability
- manual checks
- known limitations

The contract is descriptive. It does not replace the existing scope guard, rollback system, dashboard rows, tuner, or direct-apply runner.

## Surface Targets

Generic visual surfaces remain the shared vocabulary:

- `slot_card`
- `background_readability`
- `asset_replacement`
- `panel`
- `reward_toast`
- `button`

Each adapter maps those generic surfaces to adapter-specific targets. For example, Idle Monster Farm maps `slot_card` to `farm_slots`, Sort Puzzle maps it to shelf/spirit targets, Cursor Arena maps it to upgrade/skin/reward cards, while Generic Phaser maps style surfaces to a manual target selected by the user.

Each target records preview support, likely owner files, optional style config paths, direct-apply support, fallback support, manual checks, and limitations.

## Scope Rules

Adapter scope metadata aligns with the existing visual scope guard:

- Safe paths are Game Polish Lab-owned configs, visual metadata, generated style modules, and known asset folders.
- Suspicious paths are likely rendering, UI, scene, loader, or manifest integration points that need guarded handoff.
- Forbidden paths are save, economy, reward, progression, unlock, upgrade, merge, hatch, quest, ad, monetization, analytics, level data, gameplay rules, and package manager files during visual writes.

The contract may describe scope, but the existing scope guard remains the enforcement point.

## Direct Apply vs Fallback

Direct apply is allowed only when a registered direct-apply template exists and the target has a safe style config path. Direct apply remains limited to known safe style config writes and rollback-protected overwrites.

Fallback tasks are for unsupported games, one-time adapter setup, unusual integration, or structural work Game Polish Lab cannot safely apply itself. They are not the normal polish loop and must keep exact selected file scope.

`asset_replacement` has no executable direct-apply template in v0.7. Asset contracts and contact sheets can describe and preview assets, but loader or manifest wiring remains manual or fallback-only.

## Adding Future Adapters

Future adapters should:

1. Add a `VisualGameAdapter` wrapper.
2. Declare supported generic surfaces without adding new surfaces casually.
3. Map each surface to adapter-specific targets.
4. Provide safe/suspicious/forbidden scope metadata.
5. Reuse existing style config/direct-apply types where possible.
6. Add validation tests for contract errors and limitations.
7. Keep direct apply narrow until a safe template exists.

v0.7 keeps Sort Puzzle and Cursor Arena scoped to existing generic surfaces and safe generated config paths. It does not broaden direct apply into gameplay, rules, save, economy, progression, level, solver, undo/hint, ad, player, or projectile files.
