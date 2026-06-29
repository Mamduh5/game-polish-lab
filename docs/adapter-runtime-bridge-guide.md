# Adapter Runtime Bridge Guide

Some projects need a one-time runtime bridge so the game reads generated Game Polish Lab config. This is not the normal tuning loop.

Use a bridge task only when:

- a dashboard row is config-only or fallback-ready
- the project does not yet read the generated config
- the target files are exact visual owner files
- scope guard warnings are understood and no forbidden files are included

Bridge tasks should:

- read existing `.game-polish-lab/styles/` config or generated visual config modules
- keep edits inside selected visual presentation files
- avoid broad refactors
- preserve gameplay behavior
- include rollback and manual visual checks

Do not bridge through save, economy, progression, ad, balance, rules, solver, player/projectile, package, or unrelated runtime files.
