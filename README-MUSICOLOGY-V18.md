# Battrochtek Musicology V18 — Cuba, Brazil & South America

This pass rebuilds the canonical Latin-American tier-A/B scores as explicit drum-set adaptations instead of routing most names through a generic `baseLatin` pattern.

## Scope

Reviewed canonical IDs: `CAN-128` through `CAN-163` (36 archetypes): Cuba, Brazil, Colombia/Venezuela, Peru/Argentina/Uruguay.

All 36 are now tagged `reviewed-pedagogical-adaptation` / `reviewed-adaptation`. This means the style taxonomy and drum-set functions have been checked against literature, but the patterns are still adaptations, not claims of literal note-for-note traditional percussion transcription.

## Structural changes

- Cuban grooves now preserve two-bar phrase logic where appropriate, with distinct cáscara/bell, tumbao-support and clave-orientation roles.
- Salsa 2-3 and 3-2 are separate canonical two-bar scores.
- Songo and Timba use drum-set-native syncopated kick/snare/tom interaction rather than generic Latin backbeats.
- Afro-Cuban 6/8 is represented as a compound 12/8 bell-cycle drum-set adaptation.
- Bossa Nova uses the documented bass-drum ostinato (1, &2, 3, &4) and a semantic cross-stick articulation.
- Samba Batucada, Partido Alto, Samba-Reggae, Baião, Maracatu, Frevo, Ijexá/Afoxê, Samba-Funk and Samba-Jazz now have separate orchestration/phrase models.
- Colombian/Venezuelan and southern South-American entries now have independent compound/straight-meter models instead of generic `baseLatin` aliases.

## Canonical articulation model

The canonical/MIDI layer now supports:

- `snare:cross-stick` → GM percussion note 37 while compiling to the existing Battrochtek snare row.
- `cymbal:ride-bell` → GM percussion note 53 while compiling to the existing Battrochtek ride row.

This preserves musically meaningful articulation in JSON/MIDI without requiring a grid redesign.

## Diversity result

After this pass:

- 213 canonical archetypes retained.
- 189 representative grooves published in the single Curated library.
- Exact structural duplicate clusters reduced from 15 to 13.
- Near-duplicate pairs reduced from 482 to 467.
- All 36 Latin-American grooves in this pass are literature-supported at taxonomy level and reviewed at score-adaptation level.
- One exact collision remains inside this pass: `Merengue Venezolano` / `Chacarera`. It remains held for review rather than being cosmetically altered.

## Main references used in this pass

- Berklee — Advanced Afro-Cuban Rhythms for Drum Set: https://college.berklee.edu/courses/ilpd-373
- Berklee Online — Arranging and Producing Contemporary Music Styles: https://online.berklee.edu/courses/arranging-and-producing-contemporary-music-styles
- Berklee Online — Drum Set Performance 101: https://online.berklee.edu/courses/drum-set-performance-101
- Berklee — South American Rhythms for the Drum Set: https://college.berklee.edu/courses/ilpd-357
- Berklee — Fernando Brandão faculty profile / Brazilian style list: https://college.berklee.edu/people/fernando-brandao
- Modern Drummer — Mark Walker / World Jazz Drumming discussion of Brazilian/Latin drum-set adaptation: https://www.moderndrummer.com/wp-content/uploads/2018/10/MD-469-1218c.pdf
- Drumeo — Bossa Nova basic drum-set construction: https://www.drumeo.com/beat/5-styles-beginner-drummers/
- Drumeo — Afoxê orchestration: https://www.drumeo.com/beat/5-drumming-styles-youve-probably-never-heard/
- University of Adelaide — Airto Moreira / Baião drum-kit adaptation research: https://digital.library.adelaide.edu.au/dspace/bitstream/2440/106341/2/02whole.pdf

## Build / CI

The GitHub Actions lint fixes from V17 are retained (`Buffer` imported from `node:buffer`, dead variables/imports removed). Local syntax checks, smoke tests, canonical build/validation and GitHub Pages build pass. Full ESLint could not be rerun in this container because the packaged `node_modules` does not include the ESLint binary and a fresh `npm ci` could not complete in the environment.
