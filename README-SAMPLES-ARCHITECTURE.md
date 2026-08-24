# Battrochtek — Architecture audio sémantique

## État implémenté

Battrochtek conserve les clés historiques de samples dans les kits, mémoires et URL, mais la lecture passe désormais par un `SampleResolver`. Une piste ne signifie donc plus uniquement « jouer ce WAV » : le moteur peut demander une intention de jeu et résoudre le meilleur fichier disponible.

Le manifeste `samples/manifest-v2.json` décrit chaque sample avec :

- `instrument` : kick, snare, hihat, ride, tom, crash, percussion, etc. ;
- `articulation` : hit, closed, open, pedal, cross-stick, rimshot, bow, bell, crash… ;
- `velocity.min` / `velocity.max` : plage MIDI 1–127 ;
- `roundRobinGroup` / `roundRobinIndex` : variantes cyclées sans répétition mécanique ;
- `bank` : garde-fou qui empêche de mélanger automatiquement des familles sonores sans rapport ;
- `sourceCollection`, `sourceFile`, `license` : provenance et licence.

La version JavaScript `samples/manifest-v2.js` est chargée avant `app.js` pour que la PWA puisse disposer du manifeste au démarrage sans fetch asynchrone. Le JSON reste la représentation lisible et validable.

## Compatibilité

Les kits continuent à stocker une clé de sample par piste. Les états `snd`, les kits Custom et les mémoires ne changent donc pas de format. Si une articulation ou une couche dynamique demandée n'existe pas dans la banque du sample choisi, le resolver retombe sur l'articulation de base au lieu d'utiliser un sample d'une autre famille.

Les anciens samples A/B acoustiques peuvent être utilisés comme round-robin lorsqu'ils partagent le même groupe. Les futures banques pourront ajouter plusieurs couches de vélocité et plusieurs round-robins simplement en enrichissant le manifeste.

## FEEL

FEEL transmet maintenant une articulation au moteur audio :

- piste Open HH → `open` ;
- piste Closed HH → `closed`, ou `pedal` lorsque le Human Drummer Engine identifie le pied gauche ;
- Ride → `bow`, avec possibilité de `bell` sur accents énergétiques ;
- Snare → `hit`, avec demandes `cross-stick` dans les contextes calmes jazz/soul et `rimshot` sur certains accents très énergiques.

Le choix reste non destructif pour la grille. L'articulation est une décision de performance au moment de la lecture, exactement comme le microtiming et le gain FEEL.

## Import des futures banques

Pour Virtuosity Drums, Big Rusty Drums, VCSL, 808 Fischer/TidalCycles et les collections Oramics retenues, chaque fichier importé devra avoir une licence explicite dans le manifeste et une `bank` propre à la collection/kit. Ne pas conserver `license: "unspecified"` pour les nouveaux imports.

Exemple de groupe multi-couches : plusieurs entrées `jazzclub_snare_hit_*` peuvent partager `instrument: "snare"`, `articulation: "hit"`, la même `bank`, des plages de vélocité complémentaires, puis un même `roundRobinGroup` à l'intérieur de chaque couche.

## Validation

`npm run samples:validate` vérifie les clés uniques, les champs obligatoires, les plages de vélocité et l'existence de chaque WAV.
