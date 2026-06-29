# Cursor Arena Walkthrough

Use this flow for Cursor Arena projects.

1. Run `Game Polish Lab: Open Visual Tuning Dashboard`.
2. Confirm the detected adapter is `cursor_arena`.
3. Choose one visual target: arena HUD panel, upgrade card, cursor hit/miss feedback, enemy kill feedback, combo feedback, or background readability.
4. Tune by eye in the preview.
5. Save config under `.game-polish-lab/styles/`.
6. Use config-only direct apply when the row is supported.
7. Use fallback tasks only for one-time visual integration in existing render/UI files.
8. Run rollback and scope checks after the change.

Do not edit economy, upgrades, enemy HP, enemy speed, spawn rate, damage, scoring, rewards, save/progression, player systems, projectile systems, ads, or monetization.
