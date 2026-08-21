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
- 8 mémoires **autosauvegardées** dans l’URL : chaque mémoire contient uniquement sa grille et sa signature.
- Le kit, le mix, le tempo, le volume master et le swing restent globaux quand on change de mémoire.
- Kits de batterie, volumes et panoramiques par piste, swing et métronome.
- Undo / redo, copie, collage et duplication.
- QR code vers l’application seule ; le bouton **Copier le lien** inclut les huit mémoires.
- PWA utilisable hors ligne, sans CDN JavaScript.
- Interface responsive **FR / EN / ES**.

## Entraînement

Le bouton 🎓 affiche le panneau d’entraînement. Configure les options puis appuie sur **Lecture** pour démarrer.

- **Tempo** : départ, objectif, palier et nombre de boucles.
- **Couches** : charley → caisse claire → grosse caisse → autres éléments → accents → notes fantômes.
- **Couches + tempo** : apprend d’abord le groove puis augmente le tempo.
- Décompte de 0, 1 ou 2 mesures.
- À chaque nouvelle Lecture, l’entraînement repart du début.
- Modifier une option pendant l’entraînement arrête immédiatement la session avant d’appliquer une nouvelle configuration.
- Une fois le tempo cible atteint, la lecture continue à ce tempo.

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

- `Espace` : lecture / stop
- `T` : tap tempo
- `M` : métronome
- `1` à `8` : mémoires
- `Ctrl/Cmd + C / V` : copier / coller
- `Ctrl/Cmd + D` : dupliquer vers la mémoire suivante
- `Ctrl/Cmd + Z / Y` : undo / redo
- `Shift + clic` : applique l’édition à la même subdivision de chaque temps

## Grooves

Les sources sont placées dans `grooves/`. Les scripts `grooves:sync` et `grooves:clean` assurent leur import et leur normalisation.

## Déploiement

Le workflow GitHub Actions construit et publie automatiquement la PWA sur GitHub Pages depuis `main`.
