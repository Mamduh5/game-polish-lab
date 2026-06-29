# Direct Apply Guide

Direct apply is available only when the adapter, surface, target, config path, and scope guard all agree.

Direct apply may write:

- `.game-polish-lab/styles/` style config files
- `.game-polish-lab/visual-recipes/` recipe files
- `.game-polish-lab/assets/` assignment and manifest-apply metadata
- generated visual bridge/config paths that an adapter explicitly marks safe

Direct apply is blocked when:

- no direct-apply template exists
- the adapter is not connected
- the config is missing or invalid
- the candidate path list includes forbidden files
- the path is unknown or suspicious and the template requires known safe config paths

Use `Game Polish Lab: Check Codex Scope` or dashboard scope checks before handoff. Do not use direct apply to patch gameplay systems, save files, economy, progression, ads, level rules, package files, or arbitrary source loaders.
