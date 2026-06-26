# Cursor Arena Adapter

Adapter id: `cursor_arena`

Display name: `Cursor Arena`

Cursor Arena is cursor-click based. The adapter does not add player systems, projectile systems, shooter behavior, helper cursor mechanics, or combat progression.

## Detection

Detection is conservative and looks for combinations of:

- arena scene files
- `CursorAttackSystem`
- enemy/cursor/hit/combo terms
- Phaser package evidence

Weak single-marker evidence is treated as possible only.

## Supported Targets

- `panel` -> `arena_hud_panel`, `arena_status_panel`
- `slot_card` -> `upgrade_card`, `skin_card`, `reward_card`
- `button` -> `upgrade_button`, `shop_button`, `reset_button`, `mute_button`
- `reward_toast` -> `cursor_hit_feedback`, `cursor_miss_feedback`, `kill_combo_feedback`
- `background_readability` -> `arena_background_readability`
- `asset_replacement` -> `arena_asset_presentation` as manual/validation-only metadata

Hit, miss, kill, and combo feedback metadata includes alpha, scale, duration, and enemy readability tokens so previews do not encourage effects that hide enemies.

## Generated Config Paths

- `.game-polish-lab/styles/cursor-arena-hud-style.json`
- `.game-polish-lab/styles/cursor-arena-upgrade-card-style.json`
- `.game-polish-lab/styles/cursor-arena-feedback-style.json`
- `.game-polish-lab/styles/cursor-arena-background-readability.json`

Direct apply writes only these generated style configs and creates rollback snapshots before overwriting existing files.

## Fallback

Fallback tasks are visual-only and scoped to existing arena UI/render/effect files. They must not edit economy, upgrade values, enemy HP, spawn rate, damage, scoring, rewards, save/progression, ads, monetization, player systems, or projectile systems.

Do not add player or projectile systems.

## Known Limitations

- Scene/system source integration is fallback-only.
- Asset presentation is manual-required unless an existing asset contract supports the path.
- The adapter does not tune gameplay cadence, enemy balance, scoring, rewards, or progression.
