# Battrochtek v16 — Musicology validation pipeline

This release implements the full validation architecture around the canonical groove corpus.

## Current state

- 213 canonical archetypes remain in the research corpus.
- 213 Standard MIDI files are generated from the canonical JSON scores.
- 186 representative grooves are currently published in the runtime Curated library.
- 27 archetypes are held from runtime publication because they currently collide structurally with another score; they are **not** renamed or cosmetically modified.
- 14 exact structural collision clusters are recorded for score-level review.
- 647 high-similarity pairs are listed for musicological review.
- 47 archetypes currently have explicit literature-supported taxonomy evidence from the reference catalog.
- 132 archetypes map to a family represented by the local Groove MIDI Dataset.
- 154 canonical scores remain explicitly provisional / needs-review.
- 439 human MIDI performances are analysed to calibrate FEEL timing/velocity tendencies.

## Important distinction

`taxonomyState = literature-supported` means the archetype/style is independently supported by the cited literature. It does **not** mean the exact Battrochtek score has been transcribed and validated note-for-note.

`scoreState = provisional` remains until the actual kick/snare/timekeeping/articulation score is checked against score-level evidence, transcription and listening.

## Generated review files

- `musicology/validation-dashboard.csv`
- `musicology/validation-dashboard.json`
- `musicology/diversity-report.json`
- `musicology/near-duplicate-review.csv`
- `musicology/reference-catalog.json`
- `musicology/human-feel-profiles.json`
- `musicology/canonical-manifest.json`

Run `npm run grooves:build` to rebuild the complete chain. The build is idempotent: the canonical JSON corpus is the source of truth; the runtime Curated library is never fed back as source material.
