# Battrochtek — Roadmap v7

## Vision

Faire de Battrochtek une **bibliothèque interactive de grooves pour batteur** : écouter, décomposer, ralentir, simplifier, faire varier et travailler un groove, plutôt qu’une simple drum machine.

## P0 — Fiabilité / socle

- [x] Charger `app.js` sur tous les écrans (`defer`), suppression du garde-fou 680 px.
- [x] Autoriser portrait et paysage dans le manifest PWA.
- [x] Bump du cache Service Worker pour déployer réellement la nouvelle version.
- [x] Base mobile fonctionnelle par scroll horizontal, sans supprimer les contrôles.
- [x] Feedback utilisateur pendant le chargement audio et en cas de samples manquants.
- [x] Navigation clavier de base des boutons et cellules.
- [ ] Fournir / vérifier le dossier `sounds/` dans les distributions.
- [x] Cache audio à la demande + bouton “Télécharger les kits hors ligne”.
- [ ] Tests unitaires : migrations, signatures, swing, chain, variation, storage corrompu.

## P1 — Édition / pratique

- [x] Undo / Redo, 30 états, raccourcis Cmd/Ctrl+Z et Redo.
- [x] Escalier BPM : +5 BPM par tour, valeur éditable.
- [ ] Mode Practice : BPM départ/cible, incrément, nombre de tours.
- [ ] Mute bars / dropout pour travailler le time.
- [ ] Simplify ↔ Busier : retirer/ajouter progressivement ghosts, syncopes et ouvertures.
- [ ] Accès rapide aux vélocités : appui long / Shift / Alt au lieu de cycler 5 fois.

## P1 — Bibliothèque de grooves

- [ ] Métadonnées : artiste, BPM, difficulté, feel, tags, batteur, grouping.
- [ ] Recherche instantanée et favoris.
- [ ] Filtres difficulté / BPM / signature / shuffle / ghost notes.
- [ ] Détecter les presets très similaires pour éviter les doublons.
- [ ] Exploiter Groove Research pour analyser densité, syncopation et similarité.

## P1 — Musicalité

- [x] Variations spécifiques à la famille : funk, reggae, afrobeat, hip-hop, rock, latin…
- [ ] Trois intensités : Subtle / Groove / Fill.
- [x] Remplacer les indices de pistes codés en dur par des rôles nommés.
- [ ] Grouping métrique explicite : 7/8 = 2+2+3, 2+3+2, 3+2+2, etc.
- [ ] Métronome avec accent du 1 et subdivisions configurables.
- [ ] Hi-hat choke (closed coupe open).
- [ ] Humanisation indépendante du swing : micro-timing / vélocité / très léger pitch.

## P2 — Audio / création

- [ ] Chaîne audio par piste : gain → pan → master → compresseur.
- [ ] Round-robin / variations de samples.
- [ ] Import de samples utilisateur.
- [ ] Export MIDI.
- [ ] Export WAV via OfflineAudioContext.
- [ ] Partage d’un pattern par URL sans compte.

## P2 — Song mode / UI

- [ ] Song Mode : A×4, B×2, A×4, C×1.
- [x] Repenser les kits en sélecteur compact pour libérer de l’espace.
- [ ] Vraie mise en page responsive sans dépendre du scroll horizontal.
- [ ] Hiérarchie UI : transport > groove/practice > kit/mémoire/mix.
- [ ] Visualiser les subdivisions `1 e & a` et les groupes de métriques impaires.
- [ ] Atténuer visuellement les pistes non audibles quand un Solo est actif.
- [~] Remplacer progressivement les faux boutons `<div>` par des `<button>` sémantiques — transport/actions principales convertis, migration à poursuivre.

## P3 — Architecture

- [ ] Passer progressivement aux ES modules.
- [ ] Séparer `audio-engine`, `sequencer`, `scheduler`, `ui`, `storage`, `groove-engine`.
- [ ] Sortir les 200 presets de `app.js` vers `data/grooves.json`.
- [ ] Remplacer les patterns-tableaux par des objets versionnés explicites.
- [ ] Migrations nommées `migrateVxToVy()`.
- [ ] Découper / nettoyer le CSS et centraliser les variables dans `:root`.
