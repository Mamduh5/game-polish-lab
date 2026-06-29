# Asset Replacement Guide

Asset replacement is metadata-first and guarded.

Workflow:

1. Open `Game Polish Lab: Open Asset Pipeline Dashboard`.
2. Pick an existing asset slot.
3. Import a PNG or WebP candidate.
4. Validate the candidate.
5. Analyze and normalize bounds when needed.
6. Generate an asset style guide or contact sheet guidance when needed.
7. Assign the approved candidate. This writes Game Polish Lab-owned metadata under `.game-polish-lab/assets/`.
8. Apply a manifest assignment only when a safe explicit manifest contract exists.
9. Use a loader fallback task when source-loader wiring is required.

The asset pipeline must not overwrite original project art in `src/assets/`, `public/assets/`, or `assets/` during assignment or manifest direct apply. Runtime applied remains false unless a supported runtime path proves otherwise.
