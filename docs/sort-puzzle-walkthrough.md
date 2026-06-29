# Sort Puzzle Walkthrough

Use this flow for Sort Puzzle projects.

1. Run `Game Polish Lab: Open Visual Tuning Dashboard`.
2. Confirm the detected adapter is `sort_puzzle`.
3. Choose a supported visual target such as shelf cards, spirit presentation, selected shelf state, invalid move feedback, or win reward toast.
4. Tune the surface in the preview.
5. Save generated config under `.game-polish-lab/styles/`.
6. Use config-only direct apply where the dashboard says it is available.
7. Treat runtime `SpiritSortScene` integration as fallback-only unless the project already reads the generated config.
8. Run scope checks before any handoff.

Forbidden or blocked areas include `SortRules`, solver logic, move validation, undo/hint behavior, level data, save/progression, scoring, and win-condition logic.
