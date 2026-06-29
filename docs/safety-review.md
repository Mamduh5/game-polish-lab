# Safety Review

Game Polish Lab safety is built around scope guard checks, adapter-owned direct-apply templates, rollback snapshots, asset-pipeline metadata separation, and fallback-task framing.

Reviewed areas for v0.94:

- Scope guard rules block save, economy/balance/reward, progression/unlock/upgrade, merge, hatch, quest, ad/monetization/analytics/SDK, level data/gameplay rules, Sort Puzzle rules/solver/undo/hint, Cursor Arena balance/player/projectile/shooter, and package manager files during visual writes.
- Direct apply requires a supported adapter/surface template and known safe config paths.
- Asset manifest direct apply requires an explicit safe manifest contract and still runs scope guard.
- Asset pipeline assignment does not overwrite original project assets.
- Rollback restore resolves paths inside the workspace and auto-restores only safe visual files.
- Fallback tasks list forbidden areas and must not silently include forbidden files.

Release-critical safety tests live in `src/test/releaseReadinessSafety.spec.ts` and run through `npm test`.

Known limitations:

- Suspicious source/UI/scene files may still need human review through fallback tasks.
- Runtime bridge integration is fallback-only unless an adapter has an explicit supported path.
- The extension cannot prove a rendered game changed visually without manual review.
- License selection, publisher identity, and icon choice are pending packaging decisions.
