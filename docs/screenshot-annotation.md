# Screenshot Annotation Spike

`Game Polish Lab: Annotate Screenshot Visual Issue` is a lightweight manual note workflow.

The command lets a user pick a local screenshot, enter a marked rectangle, choose a visual surface, optionally choose an adapter, and save a note under `.game-polish-lab/screenshot-notes/**`.

Notes include:

- screenshot path
- marked rectangle coordinates
- selected surface type
- optional adapter id
- optional note text
- created timestamp
- suggested visual-only next action

This spike has no OCR, no automatic visual judgment, and no AI image analysis. It does not edit game files. It writes note metadata only.
