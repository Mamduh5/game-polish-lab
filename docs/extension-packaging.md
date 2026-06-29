# Extension Packaging

Game Polish Lab is packaged as a VS Code extension. The package is intended to support the Phaser visual polish console workflow:

1. Choose a visual surface in `Game Polish Lab: Open Visual Tuning Dashboard`.
2. Preview and tune by eye.
3. Save a style config, visual recipe, asset assignment, or asset-pipeline metadata under `.game-polish-lab/`.
4. Use direct apply only when the adapter and surface report a supported guarded path.
5. Use rollback, scope checks, and result tracking after changes.

Codex fallback tasks are not the normal visual polish loop. Use fallback tasks only for unsupported adapters, one-time adapter/runtime bridge work, source-loader integration, or structural work that the direct-apply templates explicitly refuse.

## Local Checks

Run:

```bash
npm run compile
npm test
npm run package:check
npm run package
```

`npm run package:check` validates package metadata, contributed command coverage, release-readiness docs, CI presence, and license/icon packaging notes. `npm run package` performs compile, package check, and `npm pack --dry-run`; it does not publish the extension.

## Metadata Decisions

- Version: `0.9.9` for v0.99 1.0 Release Candidate readiness.
- Publisher: `local-dev` is still a placeholder and must be replaced before Marketplace publication.
- Repository, bugs, and homepage point to the existing GitHub remote.
- License selection is pending. No `LICENSE` file is present, and this release-readiness pass does not invent a legal license.
- No extension icon is declared yet. Add a small committed icon asset and `package.json` `icon` only after a real asset is chosen.
- `.vscodeignore` keeps source, fixtures, CI metadata, scripts, dependencies, maps, and tarballs out of future VSIX packages while leaving compiled `dist/`, README, changelog, and docs available.
- Publishing is intentionally out of scope for v0.99.
