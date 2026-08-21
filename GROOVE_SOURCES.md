# Sources de grooves

Battrochtek utilise un import **agnostique de la provenance**. Aucun nom de corpus n'est codé en dur dans l'application : le nom du dossier de premier niveau devient le nom de la **SOURCE**.

## Dossier canonique `./Grooves`

```text
Grooves/
├── Basic Grooves/
│   └── basic-grooves.json
├── GMD/
│   ├── funk/
│   │   └── groove-01.mid
│   └── jazz/
│       └── groove-02.mid
├── Lucerne/
│   └── groove-001.mid
└── Ma collection/
    └── mes-patterns.mid
```

Les sous-dossiers facultatifs deviennent le champ **STYLE**. Les fichiers `.mid`, `.midi` et les JSON Battrochtek sont importés.

```bash
npm run grooves:sync
```

Cette commande importe tout `./Grooves` **sans filtrage** et régénère `grooves/external-grooves.js`.

On peut aussi importer ponctuellement un dossier extérieur :

```bash
npm run grooves:sync -- "/chemin/vers/Ma Source"
```

Le nom du dossier devient alors le nom affiché de la Source.

## Nettoyage global des doublons

Le nettoyage compare **tous les grooves de toutes les Sources entre eux**, y compris `Basic Grooves`.

```bash
npm run grooves:clean -- --difference 10
```

`--difference` est la **différence minimale en pourcentage** exigée pour conserver un nouveau groove. Plus la valeur est élevée, plus le filtrage est agressif :

- `5` : retire surtout les copies exactes et quasi-copies ;
- `10` : nettoyage modéré ;
- `20` : ne garde que des patterns nettement différents ;
- `30+` : filtrage très sévère.

La valeur par défaut se trouve dans `.groovesrc.json`. Elle est volontairement prudente (`5 %`).

La similarité n'utilise pas les cases vides de la grille. Elle repose sur un **coefficient de Dice des frappes actives**, complété par une faible pondération des niveaux de vélocité. Pour un groove à plusieurs mémoires, les fenêtres de deux mesures sont comparées par meilleur appariement dans les deux sens. Cela évite qu'un long MIDI soit considéré comme différent uniquement parce qu'une seule de ses huit mémoires varie.

Le nettoyage ne supprime jamais les MIDI/JSON originaux. Il écrit :

- `grooves/external-grooves.js` : bundle filtré utilisé par l'application ;
- `grooves/clean-report.json` : liste des grooves retirés, du groove conservé le plus proche et du pourcentage de similarité.

Le déploiement GitHub Pages utilise `npm run grooves:build`, alias du nettoyage avec le seuil configuré dans `.groovesrc.json`.

## Basic Grooves

Les anciens grooves intégrés dans `app.js` ont été déplacés vers :

```text
Grooves/Basic Grooves/basic-grooves.json
```

Ils passent donc par **exactement le même pipeline de recherche et de déduplication** que les corpus MIDI externes. Chaque Basic Groove ne remplit que la mémoire 1.

## Mémoires des MIDI importés

Un fichier MIDI est découpé chronologiquement en fenêtres de **deux mesures**. Les huit premières fenêtres non vides remplissent les mémoires **1 à 8**. Le tempo, la signature et les vélocités sont conservés dans les patterns convertis.

## Mapping GMD / Roland TD-11

L'importeur suit le mapping simplifié du Groove MIDI Dataset de Magenta :

| Grille Battrochtek | Pitches MIDI acceptés |
| --- | --- |
| Crash | 49, 55, 57, 52 |
| Ride | 51, 59, 53 |
| HH Open | 46, 26 |
| HH Closed | 42, 22, 44 |
| Snare | 38, 40, 37 |
| High Tom | 48, 50 |
| Low-Mid Tom | 45, 47 |
| Floor Tom | 43, 58 |
| Kick | 36 |

Les articulations head/rim/edge sont regroupées sur une même ligne. La vélocité MIDI est convertie vers les cinq niveaux Battrochtek : ghost, soft, normal, strong et accent.

Pour les MIDI multi-instruments, seules les notes du **canal percussion General MIDI 10** sont prises en compte. Cela permet notamment d'importer des datasets d'accompagnements complets sans transformer accidentellement les notes de basse ou de clavier en batterie.
