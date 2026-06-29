# Monster Farm Walkthrough

Use this flow for the Idle Monster Farm sample or a similar Phaser idle/economy game.

1. Run `Game Polish Lab: Open Visual Tuning Dashboard`.
2. Confirm the detected adapter is `idle_monster_farm` with reasonable confidence.
3. Pick one surface: slot cards, background readability, panels, reward toasts, buttons, or Monster Farm assets.
4. Run `Game Polish Lab: Tune Visual Surface`.
5. Tune by eye using the preview. Keep the change visual-only.
6. Save the config under `.game-polish-lab/styles/`.
7. Use direct apply only for supported connected rows.
8. Confirm no save, economy, hatch odds, merge rules, quest rewards, ads, progression, or upgrade costs changed.
9. Mark the tuning result and keep rollback available.

Asset slots use `.game-polish-lab/assets/` metadata first. Reward icon/source-loader wiring remains fallback-required unless an explicit safe manifest contract exists.

Do not change sample gameplay logic or fixture economy/progression data during polish.
