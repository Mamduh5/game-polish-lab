# Game Polish Lab

Game Polish Lab is a small VS Code extension for solo game developers who want safer, stricter polish workflows for pixel-art games. v0.1 is Phaser-first: it inspects the opened workspace, creates a local polish profile, writes audit reports, creates task JSON files, and generates Codex-safe prompts.

It does not beautify a game automatically, call external AI APIs, require network access, or require Phaser to be installed inside this extension.

## Commands

- `Game Polish Lab: Initialize Project Profile` creates `.game-polish-lab/profile.json` when it does not already exist.
- `Game Polish Lab: Run Phaser Pixel Audit` inspects likely Phaser config and CSS files, then writes `.game-polish-lab/audits/latest-phaser-pixel-audit.md`.
- `Game Polish Lab: Create Polish Task` lets you pick a preset and writes a numbered task JSON file in `.game-polish-lab/tasks/`.
- `Game Polish Lab: Generate Codex Prompt` turns an existing task JSON into `.game-polish-lab/prompts/latest-codex-prompt.md`, copies it to the clipboard, and opens it.
- `Game Polish Lab: Check Codex Scope` uses `git diff --name-only` when available and warns if changed files appear outside the selected task scope.

## v0.1 Limitations

- Phaser is the only implemented engine adapter.
- There is no dashboard webview.
- Audits are static heuristics, not a parser or runtime validator.
- Suspicious decimal scale patterns are warnings only.
- Scope checks use local git diff output and task JSON path lists.

## Future Adapter Plan

The source is split into small command, core, preset, and adapter modules. Phaser lives under `src/adapters/phaser/`; future Godot, Unity, and Unreal support can be added as separate adapter folders without changing the v0.1 command surface.

## Development

```bash
npm install
npm run compile
npm run lint
```

Press `F5` in VS Code to launch an Extension Development Host after dependencies are installed.
