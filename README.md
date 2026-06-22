# Game Polish Lab

Game Polish Lab is a small VS Code extension for solo game developers who want safer, stricter polish workflows for pixel-art games. It is Phaser-first: it inspects the opened workspace, creates a local polish profile, writes audit reports, creates task JSON files, and generates Codex-safe prompts.

It does not beautify a game automatically, call external AI APIs, require network access, or require Phaser to be installed inside this extension.

## What v0.1.1 Does

v0.1.1 is a Phaser dogfood pass. It keeps the v0.1 command surface and hardens it for real Phaser projects:

- Adds a `Game Polish Lab` output channel for command starts/ends, workspace paths, inspected files, detection evidence, created files, scope results, and handled errors.
- Improves Phaser detection for package dependencies, imports, `new Phaser.Game`, `Phaser.Game`, `Phaser.Types.Core.GameConfig`, and common config object patterns.
- Uses capped workspace scanning that excludes common generated folders and skips large, binary, or unreadable files.
- Improves pixel-art audit reports with a readiness score, main risk, suggested fixes, contextual next task presets, and capped inspected-file lists.
- Generates stricter Codex prompts with approval-before-patching enabled by default.
- Writes `.game-polish-lab/audits/latest-scope-check.md` from scope checks.

## Commands

- `Game Polish Lab: Initialize Project Profile` creates or migrates `.game-polish-lab/profile.json`.
- `Game Polish Lab: Run Phaser Pixel Audit` inspects likely Phaser config and CSS/UI files, then writes `.game-polish-lab/audits/latest-phaser-pixel-audit.md`.
- `Game Polish Lab: Create Polish Task` lets you pick a preset and writes a numbered task JSON file in `.game-polish-lab/tasks/`.
- `Game Polish Lab: Generate Codex Prompt` turns an existing task JSON into `.game-polish-lab/prompts/latest-codex-prompt.md`, copies it to the clipboard, and opens it.
- `Game Polish Lab: Check Codex Scope` uses `git diff --name-only` when available, groups changed files as allowed/suspicious/forbidden, and writes `.game-polish-lab/audits/latest-scope-check.md`.

## Recommended Workflow

1. Run `Game Polish Lab: Initialize Project Profile`.
2. Run `Game Polish Lab: Run Phaser Pixel Audit`.
3. Run `Game Polish Lab: Create Polish Task`.
4. Run `Game Polish Lab: Generate Codex Prompt`.
5. Let Codex inspect first, report planned files, and patch only after approval if `codexRequiresApprovalBeforePatch` is `true`.
6. Run `Game Polish Lab: Check Codex Scope`.

## Development

```bash
npm install
npm run compile
npm run lint
npm test
```

To run the extension:

1. Open this repository in VS Code.
2. Run `npm install`.
3. Press `F5` to launch an Extension Development Host.
4. In the Extension Development Host, open a Phaser project folder.
5. Run Game Polish Lab commands from the Command Palette.

## Fixture Testing

A small fake Phaser-like workspace lives at `fixtures/phaser-pixel-sample/`.

To dogfood manually:

1. Start the Extension Development Host with `F5`.
2. In that host window, open `fixtures/phaser-pixel-sample/` as the workspace folder.
3. Run `Game Polish Lab: Initialize Project Profile`.
4. Run `Game Polish Lab: Run Phaser Pixel Audit`.
5. Confirm `.game-polish-lab/audits/latest-phaser-pixel-audit.md` is created and reports high Phaser confidence.
6. Create a polish task and generate a Codex prompt.

## v0.1.1 Limitations

- Phaser is the only implemented engine adapter.
- There is no dashboard webview.
- Audits are static heuristics, not a parser or runtime validator.
- Suspicious decimal scale patterns are warnings only.
- Scope checks use local git diff output and task JSON path lists.

## Future Adapter Plan

The source is split into small command, core, preset, and adapter modules. Phaser lives under `src/adapters/phaser/`; future Godot, Unity, and Unreal support can be added as separate adapter folders without changing the current command surface.
