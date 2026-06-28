# Screenshot Annotation

`Game Polish Lab: Annotate Screenshot` is a lightweight manual annotation workflow. It does not run OCR, computer vision, automatic visual judgment, or AI image analysis.

The user picks a screenshot, marks one rectangle with numeric fields, chooses a visual surface, optionally targets an adapter row, adds a note, and saves the annotation under `.game-polish-lab/annotations/**`. The annotation index lives at `.game-polish-lab/annotations/index.json`.

Saving an annotation can create a Game Polish Lab-owned visual tuning task, reference or create a config-only style stub under `.game-polish-lab/styles/**`, and optionally create a scoped visual fallback handoff. These outputs use the screenshot rectangle as visual context only.

Annotations do not apply runtime changes, patch source files, mutate themes, or mark dashboard rows as applied. Gameplay, save schema/state, economy, balance, progression, level/rule/solver data, enemy/player/projectile behavior, upgrade costs/effects, ads, monetization, and package churn are out of scope.
