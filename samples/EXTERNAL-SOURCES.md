# External sample sources

Battrochtek only imports packs whose redistribution terms are explicit. The
runtime manifest keeps source collection, source URL, source file and license
metadata for every imported asset.

## Approved import profiles

- `ferrosintesis-drumkit` — curated Virtuosity Drums core (CC0), with velocity layers and round robins.
- `ferrosintesis-accents` — Virtuosity / Big Rusty cymbal accents (CC0).
- `oramics-lm2` — Oramics Sampled LM-2 collection (Public Domain according to the collection metadata/provenance).
- `oramics-909` — Oramics Sampled TR-909 Detroit collection (Public Domain according to the collection metadata/provenance).
- `vcsl-world` — selected VCSL world percussion (CC0).
- `henkonen-kit-bells` — five ride-bell articulations from HenKonen's
  *Sounds and Scapes 4 — Drumkit Oneshots* (CC0), plus four documented
  Battrochtek derivatives used to give the electronic kits distinct colors.

Import from a local unpacked source directory:

```bash
npm run samples:import -- --profile ferrosintesis-drumkit --source /path/to/source
```

The importer converts FLAC/AIFF to mono PCM16 44.1 kHz WAV with `ffmpeg`,
updates `manifest-v2.json` and `manifest-v2.js`, hashes each imported WAV and
appends provenance to `samples/provenance.jsonl`.

Use `--dry-run` first when evaluating an unfamiliar layout.
