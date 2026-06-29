# Quick Start

Game Polish Lab is a VS Code visual polish console for Phaser projects. It is not an art generator and it is not a prompt-first design tool.

Normal workflow:

1. Open a Phaser project in VS Code.
2. Run `Game Polish Lab: Initialize Project Profile`.
3. Run `Game Polish Lab: Open Visual Tuning Dashboard`.
4. Choose one visual surface.
5. Run `Game Polish Lab: Tune Visual Surface`.
6. Preview and tune by eye. Do not ask Codex to invent design choices.
7. Save the style config or asset assignment.
8. Use direct apply only when the row reports a supported adapter/surface path.
9. Run scope checks and review result tracking.
10. Use `Game Polish Lab: Open Rollback History` if the change needs to be reverted.

Common paths:

- `.game-polish-lab/styles/`
- `.game-polish-lab/visual-recipes/`
- `.game-polish-lab/assets/`
- `.game-polish-lab/rollback/`
- `.game-polish-lab/results/` or the existing tuning attempt index/results paths for the project

Use fallback tasks only when direct apply is unsupported, the adapter is not connected, loader/source integration is required, or the work is structural.
