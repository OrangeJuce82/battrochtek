# Samples v32 — Acoustic World + Vintage Rock repair

## World Percussion

`WORLD PERCUSSION` no longer uses Battrochtek-generated world placeholders.
It is built only from the supplied VCSL 1.2.2-RC acoustic percussion subset:
Tambourine, Agogo, Shaker, Claves, Cajon, Darbuka, Frame Drum High,
Frame Drum Low and Cowbell. These files are CC0 and are peak-normalized to a
consistent browser playback range while preserving their acoustic timbre.

## Vintage Rock

The previous snare selection relied on the Big Rusty overhead channel and
sounded distant/dirty. v32 rebuilds the snare from close **top + bottom** mics
(three velocity zones, two round robins) and raises the acoustic Rock kit
slightly in the runtime gain structure.

## Cleanup

Generated `bt_world_*` WAVs that are no longer referenced were removed.
The manifest now contains 268 samples.

## Licensing

Application code: MIT. Third-party audio retains its upstream license. See
`LICENSE`, `THIRD_PARTY_NOTICES.md` and `samples/EXTERNAL-SOURCES.md`.
