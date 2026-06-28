# Asset Pipeline Stabilization

Game Polish Lab v0.85 stabilizes the v0.80-v0.84 asset pipeline before v0.9 work.

## Capabilities

- v0.80 Asset Pipeline Dashboard: detected slots, imports, validation, assignment metadata, fallback tasks.
- v0.81 Asset Bounds Normalization: explicit bounds analysis and managed normalized PNG copies.
- v0.82 Asset Style Guide Generator v2: Markdown/JSON guidance only.
- v0.83 Asset Manifest Direct Applies: approved assignment references applied only through explicit safe manifest/config contracts.
- v0.84 Asset Contact Sheet Comparison: static JSON/HTML comparison and manual user marks.

## Safe Owned Paths

The asset pipeline writes under `.game-polish-lab/**`, including imported assets, normalized copies, assignments, style guides, manifest-apply metadata, contact sheets, fallback tasks, and rollback snapshots. Original game/runtime assets are not overwritten.

Safe manifest/config writes require v0.83 gates: approved candidate or assignment, non-invalid validation, assignment metadata, explicit safe contract/key, scope guard approval, and rollback snapshot. Source loaders, scenes, UI files, registries, and uncontracted manifests stay suspicious or fallback-only.

## Rollback Expectations

Repeat writes to Game Polish Lab-owned metadata create rollback snapshots where current infrastructure supports overwrites. Assignment and manifest direct applies report rollback paths in operation results. Bounds, normalization, style-guide, dashboard, and contact-sheet metadata writes snapshot previous files under `.game-polish-lab/rollback/`.

Rollback snapshots preserve previous Game Polish Lab-owned metadata/config files. They are not permission to overwrite original game assets or patch arbitrary source/runtime files.

## Validation Limits

Validation is lightweight and honest:

- PNG/WebP signatures, dimensions, file size, extension, filename/path safety, and alpha metadata are checked where cheap.
- PNG RGBA visible bounds can be decoded by the built-in lightweight reader.
- WebP dimensions/alpha metadata can be read for common headers, but visible alpha bounds remain manual-review.
- Missing, unsafe, unsupported, too-large, invalid, or dimension/alpha-mismatched assets are surfaced as missing, invalid, or warning.

No AI image analysis, OCR, subjective art rating, asset generation, or pixel mutation is performed by stabilization.

## State Honesty

Dashboard states remain separate:

- Imported does not mean assigned.
- Normalized does not mean assigned.
- Style guide generated does not mean an asset exists.
- Contact-sheet approved does not mean assigned.
- Assigned does not mean manifest-applied.
- Manifest-applied does not necessarily mean runtime-applied.

`runtimeApplied` remains false unless runtime consumption is separately implemented and tested.

## Fallback Boundary

Fallback tasks are scoped to the selected adapter, surface, and asset slot. They must forbid save/state, economy/balance/progression, level/rule/solver, gameplay, enemy/player, projectile/shooter, upgrade value/cost/effect, ad/monetization, package/dependency churn, unrelated adapter changes, broad rewrites, visual redesign, and asset generation.

## Manual VS Code Smoke Checklist

- Open `Game Polish Lab: Open Asset Pipeline Dashboard`.
- Verify active adapter and asset slots.
- Import a small PNG/WebP candidate.
- Validate candidate.
- Analyze bounds.
- Normalize bounds.
- Generate style guide.
- Create contact sheet.
- Mark candidate approved, rejected, mixed, or needs revision.
- Assign approved candidate.
- Apply manifest assignment only when a safe manifest contract exists.
- Generate fallback task when manifest/source integration is unsupported.
- Verify dashboard statuses do not overclaim runtime applied.
- Verify original game assets are not overwritten.
- Verify scope check blocks protected files.

Manual VS Code webview smoke testing is still required when running inside an Extension Development Host.
