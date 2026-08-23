# Battrochtek Musicology v17 — CI + Jamaica validation batch

## CI / GitHub Actions

- `Buffer` is imported explicitly from `node:buffer` in `scripts/canonical-groove-lib.mjs`.
- Removed unused imports/variables reported by ESLint in `scripts/build-canonical-corpus.mjs`.
- Removed the obsolete `isCoreTrack` helper from `app.js` and updated the smoke test to verify the actual CORE-protection behavior instead of a dead helper string.
- PWA cache bumped to `battrochtek-v63`.

Local verification performed:

- `node --check app.js`
- `node --check scripts/canonical-groove-lib.mjs`
- `node --check scripts/build-canonical-corpus.mjs`
- `npm run grooves:build`
- `node scripts/smoke.mjs`
- `npm run build`

## Musicology validation batch 1 — Jamaica

The canonical corpus now treats the three foundational roots-reggae grooves as structurally different scores rather than generic aliases:

- **Reggae One Drop** — kick + snare together on beat 3; the time-hand realization remains deliberately neutral because authentic hi-hat vocabulary varies.
- **Reggae Rockers** — reference-guided driving bass-drum motion with denser time-hand activity, kept at lower confidence pending further transcription-level validation.
- **Reggae Steppers** — four-on-the-floor kick and straight eighth-note reference hi-hat, as explicitly described by Modern Drummer.

These revisions are stored in the canonical JSON files and therefore survive subsequent `grooves:build` runs. MIDI files are regenerated from the canonical scores.

## Evidence expansion

The evidence mapper now additionally knows about:

- Berklee Online — Sly Dunbar interview / Rockers and One Drop history
- Modern Drummer — Jamaican ska, rocksteady, reggae and Nyabinghi educational coverage
- Berklee — South American Rhythms for Drum Set
- Berklee — Introduction to Brazilian and Afro-Cuban Drum Set

Current generated dashboard after this batch:

- 213 canonical archetypes
- 65 taxonomy/literature-supported entries
- 132 entries mapped to human GMD family evidence
- 186 representative scores currently published
- 14 exact structural collision clusters still held for review
- 153 scores still requiring source/transcription-level score review

The next validation batches should focus on Cuba and Brazil, then Colombia/South America, using the same policy: literature support for a style name is not enough to certify the note-level score.
