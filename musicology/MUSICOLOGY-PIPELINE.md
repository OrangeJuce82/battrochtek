# Battrochtek musicology pipeline

The canonical corpus is deliberately split into four validation layers. A style name being documented in literature does **not** prove that Battrochtek's current score is correct.

1. **Canonical score** — universal event JSON at 960 PPQ plus Standard MIDI export.
2. **Taxonomy evidence** — whether the archetype is independently supported by teaching/musicological references.
3. **Score review** — whether the actual kick/snare/timekeeping/articulation score has been checked against notation/transcriptions/listening. Pedagogical adaptations remain `provisional` until this happens.
4. **Human performance evidence** — timing/velocity tendencies measured from the local Groove MIDI Dataset where a family mapping exists. This calibrates FEEL, not the canonical score.

## Build phases

`npm run grooves:build` now executes the full chain:

- build 217 canonical archetypes without fake “catalog disambiguation” notes;
- attach literature/taxonomy evidence;
- measure human timing and velocity from the local GMD MIDI corpus;
- calculate structural fingerprints and near-duplicate candidates;
- generate a validation dashboard;
- compile a single Curated library, merging exact score duplicates as aliases;
- validate canonical JSON/MIDI and evidence state;
- sync the runtime library.

## Important rule

Exact duplicates are never made artificially different merely to satisfy a uniqueness check. If two archetypes currently compile to the same score, the runtime library publishes the strongest representative and records the others as aliases pending score-level review.

## Review outputs

- `validation-dashboard.csv/json`: score/taxonomy/performance status for every archetype.
- `near-duplicate-review.csv`: structurally similar grooves for human review.
- `diversity-report.json`: exact structural clusters and near-duplicate pairs.
- `human-feel-profiles.json`: measurements from real MIDI performances.
- `reference-catalog.json`: source map used for taxonomy evidence.
