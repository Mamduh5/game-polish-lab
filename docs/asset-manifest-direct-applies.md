# Asset Manifest Direct Applies

Game Polish Lab v0.83 applies approved asset assignments only to known safe manifest/config contracts.

This is not arbitrary source patching. It is manifest/config direct apply only.

## Required Gates

Manifest direct apply requires:

- a detected visual asset slot
- an approved imported or normalized asset assignment
- validation that is not invalid or missing
- a known safe manifest/config contract
- an exact manifest/config key for the selected visual asset slot
- scope guard approval for the target path
- rollback snapshot creation before overwrite
- operation metadata under `.game-polish-lab/assets/manifest-applies/`

If any gate fails, the operation is skipped, failed, or marked fallback-required. Unsupported loader/source integration should use a scoped loader fallback task.

## Written Files

Operation metadata is written under:

- `.game-polish-lab/assets/manifest-applies/<operation-id>.json`
- `.game-polish-lab/assets/manifest-applies/index.json`

Allowed write targets are limited to:

- Game Polish Lab-owned assignment/config metadata under `.game-polish-lab/**`
- explicit safe JSON manifest/config paths from asset contracts
- generated style/config references where the contract marks the path and key visual-asset-only

Original imported assets, normalized assets, and original game asset binaries are preserved.

## Runtime Status

Manifest applied does not always mean runtime applied.

`runtimeApplied` remains false by default unless a manifest/config path is truly runtime-consumed and covered by tests. v0.83 records config/manifest writes honestly and does not imply source loader integration.

## Fallback Loader Tasks

When the manifest/loader path is unknown, embedded in source code, or not explicitly safe, Game Polish Lab creates a visual-only fallback loader task. The task asks to wire the approved asset assignment into the selected slot only and forbids save, economy, progression, rules, gameplay, ads, package churn, unrelated adapter edits, broad rewrites, visual redesign, and asset generation.

## Out Of Scope

v0.83 manifest direct apply does not:

- patch scene/source loader files
- edit arbitrary TypeScript/JavaScript asset loaders
- overwrite original game assets
- modify image pixels
- generate visual assets
- create, mark, or compare contact sheets; v0.84 handles manual contact-sheet comparison separately
- implement v0.85 pipeline stabilization
- change gameplay, save, economy, balance, progression, rules, levels, solvers, upgrades, enemy/player systems, projectile/shooter systems, ads, or monetization
