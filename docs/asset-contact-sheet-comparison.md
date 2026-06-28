# Asset Contact Sheet Comparison

Game Polish Lab v0.84 adds manual asset contact-sheet comparison to the Asset Pipeline Dashboard.

The comparison layer gathers existing current, imported, normalized, assigned, and manifest-applied asset paths into simple static contact-sheet cards. It records the user's manual decision; it does not score art, recognize image content, run OCR, generate assets, mutate pixels, run Phaser, or patch source loaders.

## Files

Contact-sheet comparisons are written under:

- `.game-polish-lab/assets/contact-sheets/<comparison-id>.json`
- `.game-polish-lab/assets/contact-sheets/<comparison-id>.html`
- `.game-polish-lab/assets/contact-sheets/index.json`

These are Game Polish Lab-owned metadata/mockup files. Original game assets are never overwritten by comparison generation or marking.

## Decisions

Each comparison entry can be marked:

- `approved`
- `rejected`
- `mixed`
- `needs_revision`
- `pending`

Approval does not mean assigned. Assignment does not mean manifest applied. Manifest applied does not necessarily mean runtime applied. `runtimeApplied` remains false unless a separate tested integration proves runtime consumption.

## Dashboard Actions

The Asset Pipeline Dashboard can:

- create and open a contact sheet comparison
- mark the selected comparison choice approved, rejected, mixed, or needs revision
- use an approved imported or normalized choice for assignment metadata
- generate a revision style guide from mixed/rejected notes
- generate a scoped fallback task when loader/source integration is not safe

Fallback task wording is intentionally narrow:

`wire this approved contact-sheet asset choice into this selected visual asset slot only.`

## Out Of Scope

v0.84 does not include v0.85 stabilization, runtime live tuning, automatic computer vision, AI art scoring, image generation, source-loader patching, broad manifest patching, or new named game adapters.
