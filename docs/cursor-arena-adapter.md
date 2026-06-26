# Cursor Arena Adapter

Adapter id: `cursor_arena`

Display name: `Cursor Arena`

Cursor Arena is cursor-click based. The adapter does not add player systems, projectile systems, shooter behavior, helper cursor mechanics, or combat progression.

## Detection

Detection is conservative and looks for combinations of:

- `arena.html`
- `src/arena` files
- `arenaBalanceConfig`
- arena scene files
- `CursorAttackSystem`
- cursor click feedback renderers
- arena HUD or upgrade UI markers
- enemy/cursor/hit/combo terms
- Phaser package evidence

Weak single-marker evidence is treated as possible only.

## Supported Targets

- `panel` -> `arena_hud_panel`
- `slot_card` -> `upgrade_card`
- `reward_toast` -> `cursor_hit_feedback`, `cursor_miss_feedback`, `enemy_kill_feedback`, `combo_feedback`
- `background_readability` -> `arena_background_readability`

Hit, miss, kill, and combo feedback metadata includes scale, opacity, duration, accent, position, and enemy readability tokens so previews do not encourage effects that hide enemies.

## Generated Config Paths

- `.game-polish-lab/styles/cursor-arena-hud-style.json`
- `.game-polish-lab/styles/cursor-arena-upgrade-card-style.json`
- `.game-polish-lab/styles/cursor-arena-feedback-style.json`
- `.game-polish-lab/styles/cursor-arena-background-style.json`

Direct apply writes only these generated style configs and creates rollback snapshots before overwriting existing files. Dashboard rows are `config_only` unless a real runtime bridge is implemented and verified.

## Fallback

Fallback tasks are visual-only and scoped to existing arena UI/render/effect files. They must not edit economy, upgrade values, enemy HP, spawn rate, damage, scoring, rewards, save/progression, ads, monetization, player systems, or projectile systems.

Do not add player or projectile systems.

## Known Limitations

- Scene/system source integration is fallback-only.
- The adapter does not tune gameplay cadence, enemy balance, scoring, rewards, or progression.
