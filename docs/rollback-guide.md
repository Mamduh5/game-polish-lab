# Rollback Guide

Open rollback history with `Game Polish Lab: Open Rollback History`.

Rollback behavior:

- safe Game Polish Lab-owned visual files can be restored automatically
- suspicious source or bridge files become guided fallback tasks
- forbidden files are blocked
- restore paths must resolve inside the workspace
- parent directories are created automatically only for `.game-polish-lab/` paths

Rollback snapshots commonly live in `.game-polish-lab/rollback/`.

After restoring, re-open the dashboard, review the affected surface, and mark the tuning result. Do not use rollback to write outside the opened workspace or to modify save/economy/progression/ad/gameplay files.
