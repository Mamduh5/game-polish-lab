# Theme Export and Import

Game Polish Lab themes are visual config portability only. They let a user export reusable styling from generated Game Polish Lab style configs and import compatible styling into another adapter target.

Themes are written to:

- `.game-polish-lab/themes/<theme-id>.json`
- `.game-polish-lab/themes/index.json`

Export reads existing generated configs under `.game-polish-lab/styles/**`. It records source adapter metadata, source config paths, generic visual surface types, normalized visual tokens, adapter-specific source config metadata, validation warnings, and compatibility metadata.

Import validates the theme, compares generic surface types with registered adapter targets, writes compatible generated style configs under `.game-polish-lab/styles/**`, and creates rollback snapshots before overwriting existing configs. Partial compatibility is allowed: compatible surfaces import, incompatible surfaces are skipped and reported.

Import is config-only. It does not patch scenes, rewrite owner source files, alter adapter detection, or mark dashboard rows as runtime applied. Runtime/source wiring still belongs to existing safe direct-apply paths or a separate scoped visual-only fallback task.

Out of scope for themes: gameplay values, save schema/state, economy/balance, progression, level/rule/solver data, upgrade costs/effects, enemy/player/projectile behavior, ads, monetization, package churn, and broad source rewrites.
