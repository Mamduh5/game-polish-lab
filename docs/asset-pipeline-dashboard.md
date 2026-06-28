# Asset Pipeline Dashboard

Game Polish Lab v0.80 adds an Asset Pipeline Dashboard for managing visual asset slots and user-provided replacement assets by surface. v0.81 extends that dashboard with opt-in Asset Bounds Normalization. v0.82 adds text/metadata Asset Style Guide generation for selected slots. v0.83 adds manifest/config direct applies only for explicit safe contracts. v0.84 adds manual Asset Contact Sheet Comparison. v0.85 stabilizes rollback, validation, scope, fallback, and state-honesty behavior.

This milestone manages metadata, imported candidates, Game Polish Lab-owned normalized copies, style-guide briefs, contact-sheet comparison records, and safe manifest/config apply metadata only. It does not generate artwork, patch arbitrary source loaders, or judge visual quality automatically.

## Command

Use `Game Polish Lab: Open Asset Pipeline Dashboard`.

The dashboard shows:

- the active detected adapter
- detected visual asset slots grouped by surface
- current asset path when known
- imported candidate path when assigned
- visible bounds status when analyzed
- normalized asset path when created
- style guide path and generated timestamp when created
- latest contact-sheet comparison status and counts when created
- manifest contract safety and last manifest apply status
- basic validation status
- direct apply capability
- runtime-applied status, which remains separate from imported or assigned metadata

## Asset Storage

Imported assets are copied into:

- `.game-polish-lab/assets/imported/`

Normalized managed copies are written to:

- `.game-polish-lab/assets/normalized/`

Assignment metadata is written to:

- `.game-polish-lab/assets/assignments/`
- `.game-polish-lab/assets/asset-dashboard.json`

Bounds and normalization result metadata are written to:

- `.game-polish-lab/assets/bounds-results.json`
- `.game-polish-lab/assets/normalization-results.json`

Asset style guides are written to:

- `.game-polish-lab/assets/style-guides/`

Manifest direct-apply operation metadata is written to:

- `.game-polish-lab/assets/manifest-applies/`

Contact-sheet comparison metadata and static HTML mockups are written to:

- `.game-polish-lab/assets/contact-sheets/`

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

Validation warnings do not rewrite images. v0.81 normalization runs only from explicit dashboard/model actions.

## Bounds Normalization

See [`asset-bounds-normalization.md`](asset-bounds-normalization.md).

v0.81 can analyze visible alpha bounds for decoded PNG candidates and create an opt-in normalized copy that centers visible content in a transparent target canvas. Original imported candidates and original game/runtime assets are preserved.

Normalized does not mean runtime applied. Normalized does not mean assigned unless Game Polish Lab-owned assignment metadata is explicitly updated to reference the normalized copy.

## Asset Style Guides

See [`asset-style-guide-generator.md`](asset-style-guide-generator.md).

v0.82 can generate a Markdown and JSON style guide for a selected asset slot. Guides describe canvas size, file format, transparency, visible bounds, padding, readability requirements, style direction, forbidden changes, a contact-sheet request template, and validation checklist.

Style guide generated does not mean asset imported, assigned, normalized, compared, or runtime applied. The generator does not create images, analyze image contents with AI, modify pixels, patch source files, or patch manifests.

## Manifest Direct Applies

See [`asset-manifest-direct-applies.md`](asset-manifest-direct-applies.md).

v0.83 can apply approved asset assignments to explicit safe manifest/config contracts. It requires approval, validation, assignment metadata, a safe manifest contract, scope guard approval, and rollback snapshots. Unknown loader/source integration remains fallback-only.

Manifest applied does not necessarily mean runtime applied. The dashboard keeps `runtimeApplied` false unless runtime consumption is separately proven and tested.

## Contact Sheet Comparison

See [`asset-contact-sheet-comparison.md`](asset-contact-sheet-comparison.md).

v0.84 can create a static JSON/HTML contact-sheet comparison for a selected asset slot. It shows current/original paths, imported candidates, normalized candidates, assignment choices, manifest-applied choices, validation/bounds/manifest summaries, simple adapter/surface-aware mockups, and manual mark controls.

Contact sheet created does not mean approved. Approved does not mean assigned. Assigned does not mean manifest applied. Manifest applied does not necessarily mean runtime applied. The comparison layer records user decisions only and does not rate art, infer image content, generate assets, mutate pixels, run Phaser, or patch source loaders.

## Stabilization

See [`asset-pipeline-stabilization.md`](asset-pipeline-stabilization.md).

v0.85 adds focused stabilization coverage for rollback snapshots, validation edge cases, dashboard action honesty, scope guard classifications, fallback wording, and stale overclaim cleanup.

## Assignment

Assignment is conservative and metadata-first.

Allowed:

- assign an approved imported asset to a Game Polish Lab-owned assignment record
- update Game Polish Lab-owned asset dashboard metadata
- point assignment metadata at a Game Polish Lab-owned normalized copy
- apply assignment references to explicit safe manifest/config contracts
- create rollback snapshots before overwriting assignment metadata

Not allowed:

- overwriting original runtime assets
- patching unknown loader code
- patching arbitrary scene/source files
- patching source loader files as manifest direct applies
- mutating gameplay, save, economy, progression, ads, rules, solver, enemy/player, projectile, shooter, or upgrade logic
- claiming runtime applied when only metadata was written

Source or loader integration remains fallback-only unless a future milestone adds a proven safe manifest contract.

## Fallback Tasks

Fallback tasks are visual-only and scoped. They instruct Codex to:

`wire this approved imported asset into this selected visual asset slot only.`

Fallback tasks include adapter, surface, slot, imported asset path, normalized asset path when created, bounds summary, validation result, known config/manifest hints, exact allowed files, forbidden areas, and a manual visual test checklist.

## Out Of Scope

v0.84 does not include:

- v0.85 stabilization
- visual asset generation
- automatic computer vision or AI visual analysis
- subjective AI art scoring
- source loader patching as part of comparison
