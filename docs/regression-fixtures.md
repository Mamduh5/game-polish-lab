# Regression Fixtures

The `src/test/fixtures/**` workspaces are minimal representative projects used by the Game Polish Lab regression suite. They are not full games and should not contain real production code, generated build folders, dependency folders, or large assets.

Fixtures cover adapter detection, dashboard rows, owner-file suggestions, scope guard classification, config/direct-apply safety, theme export/import, and screenshot annotation handoffs. Tests should load fixture paths and content through the real model code paths; fixtures are not useful if tests only assert disconnected hardcoded strings.

When adding a fixture, include only the smallest files needed to trigger the behavior under test: a tiny `package.json`, representative scene/UI/config files, and optional `.game-polish-lab/styles/**` generated config examples. Prefer text files and tiny source snippets over binary assets. Keep fixture snippets compile-neutral JavaScript unless a TypeScript fixture is explicitly needed and safe for the extension compiler.

Keep gameplay, economy, save, progression, rule/solver, ad/monetization, and package churn markers deliberate and small so guardrail tests can assert they stay blocked.
