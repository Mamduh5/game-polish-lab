# Fallback Task Guide

Fallback tasks are for unsupported or structural work. They are not the normal visual polish loop.

Use fallback when:

- direct apply is unsupported
- adapter detection is missing or low confidence
- runtime bridge/source-loader integration is needed
- a manifest path is suspicious
- rollback cannot safely auto-restore a source/bridge file

Fallback tasks must include:

- selected adapter, surface, and target
- exact allowed files
- suspicious and forbidden files with scope guard reasons
- rollback instructions
- manual visual checks
- explicit framing that the task is visual-only unless structural work was intentionally requested

Fallback tasks must not silently include forbidden files. If structural gameplay work is truly required, frame it explicitly as unsupported/structural and keep it out of routine visual polishing.
