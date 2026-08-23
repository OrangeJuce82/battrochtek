# Battrochtek v19 — Completeness + Limb Grammar + Jazz/Funk

## Changes
- Added `scripts/validate-groove-completeness.mjs` and integrated it into `grooves:build`.
- 213/213 canonical grooves now pass the functional completeness gate (time voice / kick / snare-comping where required / minimum event structure).
- Rebuilt incomplete Early Rock & Roll / Lindy Beat and Breakbeat / Big Beat.
- Rebuilt CAN-041..056 (Funk / Soul / R&B) and CAN-065..078 (Jazz) from dedicated role grammars rather than preserving stale canonical scores.
- Jazz differentiates ride-led medium swing, two-feel bass support, brush time, ballad, shuffle, big-band figures, bebop comping, straight-8, jazz-funk, fusion and Afro-Cuban 6/8.
- Funk/Soul/R&B differentiates James Brown, New Orleans, P-Funk, Motown, Stax, Philly, Boogaloo, Go-Go, Gospel, Neo-Soul and modern R&B.
- FEEL now exposes an internal limb-role grammar: time hand, other hand, right foot, left-foot role, plus style-specific Density vocabulary stages.
- AUTO Jazz now resolves its time voice from the limb grammar; Ride is a role transfer, not an extra cymbal layer.
- Removed the five known CI lint warnings reported from v18 code paths.
- PWA cache v65.

## Validation status
`npm run grooves:build`, `node --check app.js`, `npm test`, and `npm run build` pass in the packaging environment.
The local container could not reinstall ESLint because dependency installation timed out; the five exact reported unused-variable sites were removed rather than suppressed.

## Musicological principle
Completeness is now separate from uniqueness. A canonical score can be unique yet still fail publication if it lacks a functional time voice or core drum role expected by its archetype. FEEL uses the same role model as the catalog: time voice, backbeat/comping voice, bass-drum role, left-foot role, ornament vocabulary, and fill movement.
