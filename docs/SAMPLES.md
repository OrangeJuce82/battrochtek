# Battrochtek — Samples et architecture audio

## Architecture actuelle

Battrochtek utilise un `SampleResolver` et un manifeste sémantique (`samples/manifest-v2.json`). Les kits, mémoires et URL conservent leurs clés publiques historiques, mais le moteur peut résoudre une intention de jeu vers le meilleur WAV disponible.

Chaque sample peut décrire : instrument, articulation, plage de vélocité, groupe/index de round-robin, banque, provenance et licence.

Le resolver doit préserver l'identité sonore avant toute sélection de couche : une variation de vélocité ou de round-robin ne doit jamais changer de tom, de hauteur fonctionnelle ou d'instrument.

## FEEL et articulations

FEEL peut demander des articulations comme hi-hat closed/open/pedal, snare hit/cross-stick/rimshot et ride bow/bell. Si une articulation n'existe pas dans la banque choisie, le moteur retombe sur une articulation compatible de la même identité sonore.

## Bibliothèque

La bibliothèque embarquée est volontairement réduite et organisée en kits cohérents acoustiques et électroniques. Les couches techniques utiles (velocity layers et round-robin) restent internes au moteur et ne sont pas exposées comme des instruments séparés dans l'interface.

Les principales sources tierces intégrées ou prévues sont documentées dans `samples/EXTERNAL-SOURCES.md` et `THIRD_PARTY_NOTICES.md`. Les nouvelles sources doivent avoir une licence explicite ; ne pas ajouter de nouveau sample avec `license: "unspecified"`.

## Validation

- `npm run samples:validate` : cohérence du manifeste et présence des WAV.
- `node scripts/audit-kits.mjs` : vérifie que tous les kits référencent des sons disponibles.
- `node scripts/audit-sample-resolution.mjs` : vérifie notamment que vélocité et round-robin conservent la même voix.
