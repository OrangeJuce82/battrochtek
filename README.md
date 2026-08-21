# 🥁 Battrochtek

Battrochtek est un séquenceur de batterie PWA pensé pour explorer des grooves et travailler la batterie.

## Installation

Prérequis : **Node.js 24+** et npm.

```bash
npm install
npm run dev
```

Puis ouvre `http://localhost:8000`.

## Fonctions principales

- Séquenceur 9 pistes avec plusieurs niveaux de vélocité.
- Bibliothèque de grooves et import MIDI.
- 8 mémoires partageables dans l’URL.
- Kits de batterie, volumes par piste, swing et métronome.
- Signatures rythmiques multiples.
- Undo / redo, copie, collage et duplication.
- PWA utilisable hors ligne.
- Interface **FR / EN / ES**.

## Entraînement

Le bouton 🎓 affiche le panneau d’entraînement sous la barre de transport.

- **Tempo** : départ, objectif, palier et nombre de boucles.
- **Couches** : charley → caisse claire → kick → autres éléments → accents → ghost notes.
- **Couches + tempo** : apprend d’abord le groove puis augmente le tempo.
- Count-in de 0, 1 ou 2 mesures.
- À chaque nouveau Play, l’entraînement repart du début.
- Une fois le tempo cible atteint, la lecture continue à ce tempo.

Le métronome reste contrôlé uniquement par son bouton dédié.

## Commandes utiles

```bash
npm run dev          # serveur local
npm run check        # syntaxe + ESLint + tests
npm test             # smoke tests
npm run build        # build GitHub Pages
npm run grooves:sync # importe les grooves
npm run grooves:clean
```

## Raccourcis

- `Espace` : lecture / pause
- `T` : tap tempo
- `M` : métronome
- `1` à `8` : mémoires
- `Ctrl/Cmd + S` : sauvegarder
- `Ctrl/Cmd + C / V` : copier / coller
- `Ctrl/Cmd + D` : dupliquer
- `Ctrl/Cmd + Z / Y` : undo / redo
- `Shift + clic` : applique l’édition à la même subdivision de chaque temps

## Grooves

Les sources sont placées dans `grooves/`. Pour importer des fichiers MIDI, voir [GROOVE_SOURCES.md](GROOVE_SOURCES.md).

## Déploiement

Le workflow GitHub Actions construit et publie automatiquement la PWA sur GitHub Pages depuis `main`.
