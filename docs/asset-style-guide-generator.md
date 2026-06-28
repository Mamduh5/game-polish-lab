# Asset Style Guide Generator

Game Polish Lab v0.82 adds text and metadata style guides for visual asset slots.

The generator creates practical briefs for artists, image tools, or future asset workflows. It does not create art.

## Inputs

Style guides can use:

- detected asset slot metadata
- asset contract fields
- v0.80 validation warnings
- v0.81 bounds analysis and normalization results
- current, imported, and normalized asset paths as workflow references
- optional user notes

It does not infer image subject matter from pixels, run OCR, call AI image analysis, or use external image generation services.

## Outputs

Guides are written under:

- `.game-polish-lab/assets/style-guides/<guide-id>.md`
- `.game-polish-lab/assets/style-guides/<guide-id>.json`
- `.game-polish-lab/assets/style-guides/index.json`

Markdown is human-readable and copy/paste friendly. JSON preserves structured metadata for future dashboard/tooling use.

## Guide Content

Each guide includes:

- target slot, adapter, and surface context
- canvas and file requirements
- transparency and alpha rules
- visible bounds, safe padding, center tolerance, and edge-touch rules
- scale/upscale/downscale guidance
- readability requirements
- style direction notes
- forbidden changes
- contact-sheet request text
- validation checklist
- existing asset references/paths when available
- validation and bounds warnings

When contract or bounds data is missing, the guide still generates but warns that manual review is required instead of inventing exact dimensions or bounds values.

## Contact-Sheet Request

v0.82 includes a reusable contact-sheet request format for asking an artist or image tool for variants. It specifies variant count, canvas size, transparent background, viewpoint/scale consistency, padding, readability, surface context, labels, text policy, export format, naming convention, and validation checklist.

This is only request text. v0.82 does not generate contact sheets and does not compare contact sheets. Contact-sheet comparison remains out of scope for v0.82.

## Boundaries

v0.82 does not:

- generate images or visual assets
- modify image pixels
- normalize assets; that is v0.81
- patch manifests, loaders, scenes, or runtime source files
- perform manifest direct applies
- compare contact sheets
- change gameplay, save, economy, balance, progression, level/rule/solver, upgrade, enemy/player, projectile/shooter, ad, or monetization behavior

Style guide generated does not mean asset imported, assigned, normalized, or runtime applied.
