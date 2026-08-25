# Battrochtek Canonical Groove Model v1

The canonical corpus is independent from the Battrochtek step-grid. The grid is a compiled view; the canonical JSON and Standard MIDI File are the durable musical assets.

## Time model

- PPQ: 960 ticks per quarter note.
- `signature`: musical meter (`4/4`, `6/8`, `12/8`, `7/8`, etc.).
- `phraseBars`: intrinsic phrase length. User memories are not used to represent musical bars.
- `tick`: absolute event position inside the canonical phrase.
- `microTimingMs`: optional performance displacement. The canonical score normally keeps this at zero; FEEL supplies performance timing unless the displacement is structurally part of the style.

## Event model

Each event contains:

- `instrument`: semantic instrument family (`kick`, `snare`, `hihat`, `cymbal`, `tom`).
- `articulation`: e.g. `closed`, `open`, `ride-bow`, `crash`, `center`, `high`, `mid`, `floor`.
- `velocity` and `velocityClass`: MIDI velocity plus Battrochtek's human-readable dynamic class.
- `limb`: `timeHand`, `otherHand`, or `rightFoot` in v1. A future model can add an explicit left-foot hi-hat voice.
- `role`: `core`, `time`, `comping`, `left-foot`, `ghost`, `ornament`, `fill`, `setup`, or `resolution`.
- `source`: provenance of the individual event when needed.

## Playability grammar

The score compiler treats open/closed hi-hat, ride bow/bell, and snare center/cross-stick as alternative articulations of one physical instrument, not independent layers. Only one articulation in each group may start at a given tick. The explicitly orchestrated color (open hi-hat or ride bell) replaces the default closed-hat or ride-bow stroke.

The declared `limb` is also monophonic at a given tick. Simultaneous kick plus one or two hand voices remains valid, but two events assigned to the same hand are rejected. Left-foot hi-hat events remain independently playable when explicitly modeled with `role: left-foot`; ordinary closed-hi-hat notes are never silently reinterpreted as foot strokes.

These are score-level rules. Audio playback should additionally use an exclusive hi-hat choke group so a later closed/pedal articulation stops the decay of an earlier open hi-hat.

## MIDI export

Every canonical groove is exported as a Standard MIDI File, format 0, General MIDI percussion channel 10. The current mapping is:

- Kick: 36
- Snare: 38
- Closed Hi-Hat: 42
- Open Hi-Hat: 46
- High Tom: 50
- Mid Tom: 47
- Floor Tom: 43
- Crash: 49
- Ride: 51
- Ride Bell: 53

The MIDI file is an exchange format. Canonical JSON remains the source of truth because MIDI cannot carry all Battrochtek semantics (limbs, roles, validation state, provenance, canonical taxonomy).

## Validation states

- `high`, `medium`, `provisional`: transcoded from the best existing selected source in the previous Curated audit.
- `pedagogical-adaptation-needs-review`: a Battrochtek-created drum-set archetype based on family/style grammar. It is usable and exported, but must not be presented as a scholarly transcription until reviewed against primary/authoritative musical sources.

Exact duplicate canonical scores are forbidden by the compiler. A low-level catalog disambiguation ornament can be inserted only on pedagogical/adaptation entries to prevent two taxonomic entries compiling to an identical score; those entries are explicitly flagged `catalogDisambiguation: true` and remain review candidates.

## Build pipeline

```sh
npm run grooves:canonical
npm run grooves:validate
npm run grooves:build
```

`grooves:build` performs the complete pipeline:

1. Build 213 canonical JSON grooves.
2. Export 213 Standard MIDI Files.
3. Compile canonical events to Battrochtek's current 9-track grid.
4. Reject exact grid collisions.
5. Validate MIDI readability and canonical event schemas.
6. Publish a single `Battrochtek Curated` library.

## Musicological source policy

The Groove MIDI Dataset is used as evidence for human timing, dynamics, fills, and broad style performances, not as a complete world taxonomy. It contains 1,150 MIDI performances and genre labels including afrobeat, afrocuban, blues, country, dance, funk, gospel, highlife, hiphop, jazz, latin, middleeastern, neworleans, pop, punk, reggae, rock, and soul.

For traditions whose identity comes from ensemble/percussion vocabulary (especially Cuban, Brazilian, Afro-diasporic, Middle Eastern, African, and South Asian material), the canonical drum-set version is treated as an adaptation and should be reviewed against specialist literature and recordings. The build deliberately retains confidence/provenance metadata instead of pretending every generated adaptation has equal scholarly authority.
