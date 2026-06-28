# Asset Bounds Normalization

Game Polish Lab v0.81 adds opt-in asset bounds normalization to the v0.80 Asset Pipeline Dashboard.

## What It Does

- Detects visible alpha bounds for imported PNG assets when the lightweight RGBA PNG reader can decode them.
- Records geometry-only metadata in `.game-polish-lab/assets/bounds-results.json`.
- Warns when visible content is fully transparent, tiny, edge-touching, likely cropped, off-center, dimension-mismatched, unsupported, or manual-review only.
- Creates normalized managed copies under `.game-polish-lab/assets/normalized/` only when explicitly requested.
- Centers visible content in a transparent target canvas.
- Uses expected slot dimensions when known, otherwise falls back to the original image dimensions.
- Preserves original imported assets and original game/runtime assets.
- Creates rollback snapshots before overwriting Game Polish Lab-owned normalized outputs or assignment metadata.

## What It Does Not Do

v0.81 does not generate art, judge art quality, run AI or computer-vision classification, perform OCR, patch source loaders, patch manifests, overwrite original game assets, or claim runtime application.

These later milestones are not included:

- v0.82 Asset Style Guide Generator v2
- v0.83 Asset Manifest Direct Applies
- v0.84 Asset Contact Sheet Comparison
- v0.85 Asset Pipeline Stabilization

Gameplay, save, economy, progression, level/rule/solver, enemy/player, projectile/shooter, upgrade, ad, monetization, and unrelated adapter edits remain out of scope.

## Normalization Flow

1. Import a PNG/WebP candidate into `.game-polish-lab/assets/imported/`.
2. Run `Analyze Bounds`.
3. Review warnings and errors.
4. Run `Normalize Bounds` only if the asset is approved for normalization.
5. Review the normalized copy under `.game-polish-lab/assets/normalized/`.
6. Run `Use Normalized Asset for Assignment` if the assignment metadata should point at the normalized copy.

Normalized does not mean assigned. Assigned does not mean runtime applied. Source or loader integration remains fallback-only unless a separate safe milestone supports that path.

## Format Support

PNG RGBA assets are decoded for visible alpha bounds and can be normalized. WebP headers are read when possible for dimensions and alpha capability, but WebP visible bounds are reported as manual-review because the extension does not add heavy image dependencies for v0.81.

Normalization writes managed PNG copies. It does not overwrite the imported candidate.

## Scaling

By default normalization does not upscale. It also skips instead of cropping when visible content exceeds the target canvas and scale-down is not explicitly allowed by options or contract metadata.

Asset contracts may define expected canvas dimensions, visible bounds ratio limits, transparency requirements, safe padding, center tolerance, edge-touch allowance, and normalization/scale flags.
