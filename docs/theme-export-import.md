# Theme Export and Import

Game Polish Lab can export portable visual themes under `.game-polish-lab/themes/**`.

A theme includes:

- schema version
- source adapter id
- source surface ids
- compatible surface ids
- style token payloads
- limitations
- created timestamp
- optional notes

Import is compatibility checked. A `slot_card` theme can map to card/slot targets, `panel` to panel targets, `button` to button targets, `reward_toast` to feedback/toast targets, and `background_readability` to background-readability targets.

Theme import writes only safe generated `.game-polish-lab/styles/**` paths and creates a rollback snapshot before overwriting an existing config. It does not edit source game files unless a separate existing direct-apply template already supports that exact path.

Asset replacement theme payloads are validation-only and non-executable.
