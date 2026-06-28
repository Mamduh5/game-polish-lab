# Asset Pipeline Dashboard

Game Polish Lab v0.80 adds an Asset Pipeline Dashboard for managing visual asset slots and user-provided replacement assets by surface.

This milestone manages metadata and imported candidates only. It does not generate artwork, normalize bounds, create asset style guides, automate manifest direct applies, or compare contact sheets.

## Command

Use `Game Polish Lab: Open Asset Pipeline Dashboard`.

The dashboard shows:

- the active detected adapter
- detected visual asset slots grouped by surface
- current asset path when known
- imported candidate path when assigned
- basic validation status
- direct apply capability
- runtime-applied status, which remains separate from imported or assigned metadata

## Asset Storage

Imported assets are copied into:

- `.game-polish-lab/assets/imported/`

Assignment metadata is written to:

- `.game-polish-lab/assets/assignments/`
- `.game-polish-lab/assets/asset-dashboard.json`

Existing asset contracts remain at:

- `.game-polish-lab/assets/asset-contracts.json`

The dashboard does not overwrite original game assets or patch arbitrary loaders/source files.

## Validation

v0.80 validation checks:

- file exists
- PNG/WebP extension and signature
- file size
- dimensions when cheaply readable
- alpha metadata when cheaply readable
- filename/path safety
- slot compatibility when dimensions or transparency requirements are known

Validation warnings do not rewrite images. v0.81 Asset Bounds Normalization is not included.

## Assignment

Assignment is conservative and metadata-first.

Allowed:

- assign an approved imported asset to a Game Polish Lab-owned assignment record
- update Game Polish Lab-owned asset dashboard metadata
- create rollback snapshots before overwriting assignment metadata

Not allowed by v0.80:

- overwriting original runtime assets
- patching unknown loader code
- patching arbitrary scene/source files
- mutating gameplay, save, economy, progression, ads, rules, solver, enemy/player, projectile, shooter, or upgrade logic
- claiming runtime applied when only metadata was written

Source or loader integration remains fallback-only unless a future milestone adds a proven safe manifest contract.

## Fallback Tasks

Fallback tasks are visual-only and scoped. They instruct Codex to:

`wire this approved imported asset into this selected visual asset slot only.`

Fallback tasks include adapter, surface, slot, imported asset path, validation result, known config/manifest hints, exact allowed files, forbidden areas, and a manual visual test checklist.

## Out Of Scope

v0.80 does not include:

- v0.81 bounds normalization
- v0.82 style guide generator v2
- v0.83 manifest direct applies
- v0.84 contact-sheet comparison
- v0.85 stabilization
- visual asset generation
- automatic computer vision or AI visual analysis
