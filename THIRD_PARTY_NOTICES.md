# Third-party notices

Battrochtek's **application code** is released under the MIT License. That
does **not** replace the licenses of third-party audio, libraries, or imported
data shipped with or referenced by the project.

## Audio samples

- **Virtuosity Drums / ferrosintesis curated drumkit** — CC0 1.0. Used by the
  Jazz Club acoustic kit. Provenance is retained per sample in
  `samples/manifest-v2.json` and `samples/provenance.jsonl`.
- **Big Rusty Drums** — CC0 1.0. Used by Vintage Rock. Battrochtek keeps only
  a browser-sized curated subset; derived/mixed samples remain attributed in
  the manifest.
- **VCSL (Versilian Community Sample Library)** — CC0 1.0. Used by the
  acoustic World Percussion kit. Only a small curated percussion subset is
  bundled.
- **Battrochtek generated electronic/world assets explicitly marked CC0** —
  CC0 1.0; see `samples/LICENSE-CC0-ELECTRONIC.txt` and manifest metadata.
- **Sounds and Scapes 4 — Drumkit Oneshots, HenKonen** — selected ride-bell
  recordings and Battrochtek derivatives, CC0 1.0. Source sound URLs and
  hashes are recorded in the sample manifest and provenance ledger.
- **Legacy-import audio marked `license: "unspecified"`** — not relicensed by
  the Battrochtek MIT license. These files should be replaced or their origin
  verified before publishing a redistribution that requires fully audited
  rights metadata.

CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/

## Vendored web libraries

- **Alpine.js** — MIT License, copyright Caleb Porzio and contributors.
  https://github.com/alpinejs/alpine
- **Oat UI (`@knadh/oat`)** — MIT License, Kailash Nadh.
  https://github.com/knadh/oat

Copies bundled under `vendor/` remain subject to their upstream licenses.

## Rule for future imports

Every imported sample must retain at least: source collection, original file,
source URL, and license in the sample manifest. Do not change a third-party
asset's license simply because Battrochtek itself uses MIT.
