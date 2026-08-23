# Battrochtek v21 — Auto Orchestration + Atomic Memory FEEL

## FEEL Auto Orchestration

A compact shuffle toggle (`fa-shuffle`) sits to the right of the ORCHESTRATION selector.

- OFF by default when FEEL opens.
- Yellow when active, using the common active-state colour.
- Changes are only considered at 4-bar phrase boundaries; 8-bar boundaries are more likely to change.
- The engine can intentionally keep the current orchestration.
- Candidate orchestrations are weighted by the groove grammar (Jazz, Funk, Hip-Hop, Reggae, Afrobeat, Latin, Rock, generic).
- A transition changes limb/orchestration roles; it does not rewrite the canonical CORE.

## Atomic memory changes

Every real memory change closes FEEL first, including Chain transitions.

Order:

1. Freeze/save the current visible performance.
2. Disable FEEL, FEEL AUTO and Auto Orchestration.
3. Load the target memory.
4. Rebuild/render the target memory unchanged.

For Chain, FEEL is closed before the end-of-loop FEEL regeneration hook, preventing an unplayed generated variation from being written into the memory at the transition boundary.
