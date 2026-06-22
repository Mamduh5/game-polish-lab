# Game Polish Lab

Game Polish Lab is a VS Code extension for solo game developers who want safer, stricter polish workflows for pixel-art Phaser games. It inspects the opened workspace, creates local polish profiles, writes audits, creates task and kit files, and generates Codex-safe prompts.

It does not beautify a game automatically, call external AI APIs, require network access, require Phaser to be installed inside this extension, add runtime dependencies to the user game, or provide a dashboard webview.

## What v0.2.1 Does

v0.2.1 adds a real-project trial workflow for dogfooding Game Polish Lab on actual Phaser games. Trial reports track the project, blocker, artifact used, Codex plan review, after-test result, scope guard result, and extension feedback.

Trial reports are written under `.game-polish-lab/trials/` with stable names such as `001-real-project-trial.md`.

## What v0.2.2 Does

v0.2.2 adds incremental cursor arena support based on dogfooding against `Mamduh5/Do-Not-Click-This-Button` branch `experiment/incremental-arena`.

This project shape is not a generic player/projectile arena. Phaser renders the arena field, pointer/click/cursor attacks are the main action, and DOM elements own HUD/shop/upgrade controls. Game Polish Lab now detects this as `phaser_rendered_dom_hud` with project types such as `incremental_arena`, `cursor_attack_arena`, and `phaser_dom_hud`.

Recommended first kit: `Cursor Attack Feedback Kit`.

Use the arena-specific kits first:

- Cursor Attack Feedback Kit
- Enemy Kill Feedback Kit
- Combo Feedback Kit
- Arena HUD Readability Kit
- Arena Upgrade Panel Readability Kit
- Arena Background Readability Kit

Warning: do not use generic Projectile Readability or Player Damage kits unless the project actually has projectile or player-avatar systems.

## What v0.2 Does

v0.2 adds the Pixel Polish Kit Generator. A Pixel Polish Kit is a small, reusable, config-driven package for a specific game presentation problem: hit feedback, pickup feedback, projectile readability, control feel, HUD readability, idle upgrade UI, reward popups, sprite readability, or camera/screen feedback.

Each kit creates:

- `.game-polish-lab/kits/<kit-id>/kit.json`
- `.game-polish-lab/kits/<kit-id>/README.md`
- `.game-polish-lab/kits/<kit-id>/codex-implementation-prompt.md`
- An optional source config template such as `src/config/hitFeedbackConfig.ts`, only after user confirmation.

## Commands

- `Game Polish Lab: Initialize Project Profile` creates or migrates `.game-polish-lab/profile.json`.
- `Game Polish Lab: Run Phaser Pixel Audit` writes `.game-polish-lab/audits/latest-phaser-pixel-audit.md`.
- `Game Polish Lab: Create Polish Task` writes a strict task JSON file in `.game-polish-lab/tasks/`.
- `Game Polish Lab: Create Rescue Task` creates a focused rescue task from project status and main blocker.
- `Game Polish Lab: Create Pixel Polish Kit` creates kit files and optionally a source config template.
- `Game Polish Lab: List Pixel Polish Kits` opens an existing kit README or JSON file.
- `Game Polish Lab: Generate Kit Implementation Prompt` regenerates the strict prompt for an existing kit and copies it to the clipboard.
- `Game Polish Lab: Create Pixel Art Style Guide` creates `.game-polish-lab/style-guide.md`.
- `Game Polish Lab: Generate Codex Prompt` turns an existing task JSON into `.game-polish-lab/prompts/latest-codex-prompt.md`.
- `Game Polish Lab: Create Real Project Trial Report` creates a dogfooding report under `.game-polish-lab/trials/`.
- `Game Polish Lab: Update Trial Result` appends a dated result and decision update to an existing trial report.
- `Game Polish Lab: Open Trial Reports` opens an existing trial report.
- `Game Polish Lab: Check Codex Scope` groups changed files as allowed/suspicious/forbidden and writes `.game-polish-lab/audits/latest-scope-check.md`.

## Polish Task vs Polish Kit

A polish task is a one-off, strict scope file for a specific Codex pass. Use it when you know exactly what needs to be improved.

A polish kit is a reusable tuning package. Use it when you want a config file plus implementation prompt so values like timing, scale, speed, alpha, and shake stay centralized and manually tunable after Codex implements the wiring.

## Pixel Polish Kit Workflow

1. Run `Game Polish Lab: Run Phaser Pixel Audit`.
2. Run `Game Polish Lab: Create Pixel Art Style Guide`.
3. Run `Game Polish Lab: Create Pixel Polish Kit`.
4. Choose whether to generate only `.game-polish-lab` files or also a source config file.
5. Send the kit implementation prompt to Codex.
6. Review planned files.
7. Approve patch if `codexRequiresApprovalBeforePatch` is enabled.
8. Run `Game Polish Lab: Check Codex Scope`.
9. Tune config values manually.

## Real-Project Dogfood Loop

1. Open a real Phaser game repo.
2. Initialize profile.
3. Run Phaser Pixel Audit.
4. Create Pixel Art Style Guide.
5. Create Pixel Polish Kit.
6. Generate kit implementation prompt.
7. Send prompt to Codex.
8. Review Codex planned files.
9. Approve or reject the patch.
10. Run Check Codex Scope.
11. Create or update Real Project Trial Report.
12. Decide: keep, revert, tune, or create another task.

Example trials:

- Arena combat game blocked by weak hit feedback.
- Idle economy game blocked by confusing upgrade screen.
- Pixel-art game blocked by blurry rendering.
- Abandoned prototype blocked by control feel.

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
- `incremental_arena`
- `cursor_attack_arena`
- `phaser_dom_hud`

## Phaser-Rendered DOM HUD Projects

Some Phaser games render the arena or action field in canvas while DOM owns HUD, shop, upgrade panels, buttons, selectors, and status UI. Game Polish Lab calls this runtime presentation model `phaser_rendered_dom_hud`.

For these projects, prompts preserve DOM IDs and browser-global IIFE patterns such as `window.ARENA`. The extension should not suggest converting the game to modules, TypeScript, or an app-style UI architecture.

## Action vs Idle Polish

For action and arena games, Game Polish Lab prioritizes gameplay readability: player/enemy/projectile readability, hit feedback, pickup feedback, camera/screen feedback, control feel, danger telegraphs, sprite scaling consistency, and hitbox fairness.

For idle and menu-heavy games, it prioritizes hierarchy, resource clarity, upgrade clarity, icon/card consistency, button/card feedback, panel spacing, reward popups, and progress bars. Economy values and save fields are not visual-polish targets.

## Rescue Task Workflow

Use rescue tasks when a project is playable or close to finished but blocked by visuals, UI, controls, readability, or feel. The generated task includes suggested presets, anti-patterns, and a definition of done so Codex stays focused on a small rescue patch instead of a redesign.

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
- `fixtures/phaser-incremental-arena-sample/`

To dogfood manually:

1. Start the Extension Development Host with `F5`.
2. Open one fixture folder as the workspace folder.
3. Run `Game Polish Lab: Initialize Project Profile`.
4. Run `Game Polish Lab: Run Phaser Pixel Audit`.
5. Run `Game Polish Lab: Create Pixel Art Style Guide`.
6. Run `Game Polish Lab: Create Pixel Polish Kit`.
7. Generate a config template only if you want to test source-file creation.

## Incremental Cursor Arena Workflow

For the `Do-Not-Click-This-Button` branch `experiment/incremental-arena`:

1. Open the branch workspace.
2. Run `Game Polish Lab: Run Phaser Pixel Audit`.
3. Confirm runtime presentation model is `phaser_rendered_dom_hud`.
4. Confirm suggested project type is `incremental_arena` or `cursor_attack_arena`.
5. Run `Game Polish Lab: Create Pixel Polish Kit`.
6. Pick `Cursor Attack Feedback Kit`.
7. Generate `src/arena/data/cursorAttackFeedbackConfig.js` only if you want the source config file.
8. Send the generated kit implementation prompt to Codex.
9. Review planned files before approving patches.
10. Run `Game Polish Lab: Check Codex Scope`.

## Troubleshooting

In restricted Codex shell execution on this Windows machine, standalone `npm run compile` can fail before TypeScript runs with `EPERM: operation not permitted, lstat 'C:\\Users\\mamdu'`. The same compile command passes in normal approved execution and through `npm test`. Extension scanning is guarded to use the opened workspace folder and skip files outside that workspace.

## v0.2 Limitations

- Phaser is the only implemented engine adapter.
- There is no dashboard webview.
- Kit source config generation is opt-in and creates small template files only.
- Audits and project-type suggestions are static heuristics, not runtime validators.
- Scope checks use local git diff output and task JSON path lists.

## Future Adapter Plan

The source is split into command, core, preset, and adapter modules. Phaser lives under `src/adapters/phaser/`; future Godot, Unity, and Unreal support can be added as separate adapter folders without changing the current command surface.
