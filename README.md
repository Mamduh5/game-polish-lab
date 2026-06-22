# Game Polish Lab

Game Polish Lab is a small VS Code extension for solo game developers who want safer, stricter polish workflows for pixel-art Phaser games. It inspects the opened workspace, creates a local polish profile, writes audit reports, creates task JSON files, and generates Codex-safe prompts.

It does not beautify a game automatically, call external AI APIs, require network access, require Phaser to be installed inside this extension, or provide a dashboard webview.

## What v0.1.2 Does

v0.1.2 is a real-game compatibility pass. It keeps the existing command surface and adds support for both low-button action games and menu-heavy idle/economy games.

- Adds project-type vocabulary and audit suggestions without overwriting `profile.json`.
- Adds game-presentation audit notes for pixel-art setup, action readability, HUD/menu readability, VFX feedback, and control feel.
- Expands the preset pack with action, VFX, controls, sprite readability, danger telegraph, idle UI, reward popup, economy HUD, and menu button feedback tasks.
- Adds `Game Polish Lab: Create Rescue Task` for almost-finished or abandoned projects blocked by visuals, UI, controls, or feel.
- Writes richer task JSON with task kind, project type, anti-patterns, definition of done, and notes.
- Generates prompts that explicitly say this is a game presentation/polish task, not an app UI redesign.

## Commands

- `Game Polish Lab: Initialize Project Profile` creates or migrates `.game-polish-lab/profile.json`.
- `Game Polish Lab: Run Phaser Pixel Audit` inspects likely Phaser config and CSS/UI files, then writes `.game-polish-lab/audits/latest-phaser-pixel-audit.md`.
- `Game Polish Lab: Create Polish Task` lets you pick a preset and writes a numbered task JSON file in `.game-polish-lab/tasks/`.
- `Game Polish Lab: Create Rescue Task` creates a focused rescue task from project status and main blocker.
- `Game Polish Lab: Generate Codex Prompt` turns an existing task JSON into `.game-polish-lab/prompts/latest-codex-prompt.md`, copies it to the clipboard, and opens it.
- `Game Polish Lab: Check Codex Scope` uses `git diff --name-only`, groups changed files as allowed/suspicious/forbidden, and writes `.game-polish-lab/audits/latest-scope-check.md`.

## Supported Project Types

Profiles default to `unknown`. Audits suggest a project type from filenames and source text, but never overwrite the profile automatically.

Supported values:

- `unknown`
- `arena_combat`
- `top_down_shooter`
- `survivor_like`
- `idle_economy`
- `clicker_incremental`
- `moba_like`
- `mobile_action`
- `hybrid`

## Action vs Idle Polish

For action and arena games, Game Polish Lab prioritizes player/enemy/projectile readability, hit feedback, pickup feedback, camera/screen feedback, control feel, danger telegraphs, and sprite scaling consistency. Missing buttons are not treated as a problem.

For idle and menu-heavy games, it prioritizes upgrade readability, resource HUD clarity, item/icon consistency, button/card feedback, panel spacing, reward popups, and progress bars. It still guards economy values, save fields, and progression logic.

## Recommended Workflow

1. Run `Game Polish Lab: Initialize Project Profile`.
2. Run `Game Polish Lab: Run Phaser Pixel Audit`.
3. Run `Game Polish Lab: Create Polish Task` or `Game Polish Lab: Create Rescue Task`.
4. Run `Game Polish Lab: Generate Codex Prompt`.
5. Let Codex inspect first, report planned files, and patch only after approval if `codexRequiresApprovalBeforePatch` is `true`.
6. Run `Game Polish Lab: Check Codex Scope`.

## Rescue Task Workflow

Use rescue tasks when a project is playable or close to finished but blocked by visuals, UI, controls, readability, or feel.

The command asks for:

- Project status: `almost_finished`, `playable_but_ugly`, `early_prototype`, `abandoned_due_to_visuals`, or `abandoned_due_to_feel`.
- Main blocker: pixel-art setup, combat readability, controls, VFX feedback, HUD readability, idle/menu UI, sprite consistency, or camera feedback.
- A rescue goal that defines what would make the project worth continuing.

The generated task includes suggested presets, anti-patterns, and a definition of done so Codex stays focused on a small rescue patch instead of a redesign.

## Example Use Cases

- Low-button arena combat game: run the audit, use `hit_feedback`, `danger_telegraph`, `control_feel`, or `camera_screen_feedback`, then check Codex scope.
- Menu-heavy idle economy game: use `idle_upgrade_screen`, `economy_hud`, `reward_popup`, or `menu_button_feedback` while keeping economy and save files off-limits.
- Pixel-art setup audit: run the Phaser Pixel Audit to check Phaser config flags, CSS image rendering, and decimal scaling risk.
- Codex scope guard: after Codex patches, run `Game Polish Lab: Check Codex Scope` to review allowed, suspicious, and forbidden changed files.

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

Fixture workspaces:

- `fixtures/phaser-pixel-sample/`
- `fixtures/phaser-arena-sample/`
- `fixtures/phaser-idle-sample/`

To dogfood manually:

1. Start the Extension Development Host with `F5`.
2. Open one fixture folder as the workspace folder.
3. Run `Game Polish Lab: Initialize Project Profile`.
4. Run `Game Polish Lab: Run Phaser Pixel Audit`.
5. Confirm `.game-polish-lab/audits/latest-phaser-pixel-audit.md` is created and reports Phaser evidence plus a suggested project type.
6. Create a polish or rescue task and generate a Codex prompt.

## v0.1.2 Limitations

- Phaser is the only implemented engine adapter.
- There is no dashboard webview.
- Audits are static heuristics, not a parser or runtime validator.
- Project-type suggestions are heuristic and may need profile edits by the developer.
- Scope checks use local git diff output and task JSON path lists.

## Future Adapter Plan

The source is split into small command, core, preset, and adapter modules. Phaser lives under `src/adapters/phaser/`; future Godot, Unity, and Unreal support can be added as separate adapter folders without changing the current command surface.
