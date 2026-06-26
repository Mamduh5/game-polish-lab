# Sort Puzzle Adapter

The Sort Puzzle adapter is the first non-Monster-Farm adapter built on the `VisualGameAdapter` contract. It maps Sort Puzzle presentation needs onto existing Game Polish Lab visual surfaces instead of adding broad new surfaces.

Adapter id: `sort_puzzle`

Display name: `Sort Puzzle`

## Detection

Detection is conservative and looks for combinations of:

- `SpiritSortScene`
- sort, spirit, or shelf scene paths
- Phaser shelf/spirit rendering terms
- Phaser package evidence

Weak single-marker evidence is treated as possible, not enough for confident executable source integration.

## Supported Targets

Sort Puzzle uses existing generic surfaces:

- `slot_card` -> `shelf_card`
- `slot_card` -> `spirit_slot`
- `slot_card` -> `completed_shelf`
- `slot_card` -> `selected_shelf_state`
- `slot_card` -> `invalid_move_feedback`
- `reward_toast` -> `win_reward_toast`
- `asset_replacement` -> `spirit_asset_presentation`

Representative preview metadata covers empty shelf, partially filled shelf, full shelf, selected source shelf, selected target shelf, invalid target feedback, completed shelf glow, and spirit scale/offset inside shelf slots.

v0.72 stabilization makes selected source/target preview metadata explicit, keeps invalid move feedback presentation-only, and records completed shelf glow plus spirit scale/offset tokens in adapter metadata.

## Generated Config Paths

Safe generated style configs are:

- `.game-polish-lab/styles/sort-puzzle-shelf-style.json`
- `.game-polish-lab/styles/sort-puzzle-spirit-presentation.json`
- `.game-polish-lab/styles/sort-puzzle-feedback-style.json`

Direct apply writes only these Game Polish Lab-owned config files and creates rollback snapshots before overwriting existing files.

## Direct Apply

Direct apply is executable only for safe generated style config writes. It does not silently edit `SpiritSortScene` or any gameplay file.

If `SpiritSortScene` needs one-time code wiring to read a generated style config/module, use a guarded fallback task.

## Fallback for SpiritSortScene

Fallback tasks for `SpiritSortScene` are visual-only and must keep exact selected file scope. They may integrate generated style values into rendering only.

Fallback tasks must not edit:

- SortRules
- level data
- solver logic
- move validation
- save/progression
- scoring
- undo/hint logic
- gameplay behavior
- package/build configuration

## Manual Test Checklist

- Empty shelf renders.
- Partially filled shelf renders.
- Full shelf renders.
- Selected source shelf is readable.
- Selected target shelf is readable.
- Invalid target feedback appears without changing move validity or calling move-validation logic.
- Completed shelf glow appears without changing completion rules.
- Spirit scale and offsets stay inside shelf/slot bounds.
- Valid/invalid move behavior is unchanged.
- Level layout, shelf capacity, undo/hint, scoring, and win condition are unchanged.

## Known Limitations

- `asset_replacement` remains non-executable; spirit presentation is limited to scale/offset style metadata.
- Source scene integration is fallback-only unless the project already reads generated Game Polish Lab style configs.
- No SortRules, level, solver, save, progression, undo/hint, scoring, or gameplay behavior files are visual-polish targets.
