# 🥁 Battrochtek

Battrochtek est une drum machine / bibliothèque de grooves utilisable directement dans le navigateur. Le séquenceur repose sur la Web Audio API et l’état réactif de l’interface sur Alpine.js embarqué localement.

## Installation

Prérequis : Node.js 20+ et npm 10+.

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:8000`.

`npm install` copie automatiquement Alpine.js dans `vendor/alpine/alpine.min.js`. Il n’y a volontairement aucun fallback CDN : si Alpine manque, Battrochtek ne démarre pas et affiche une erreur dans l’aide de démarrage.

Le dossier `sounds/` doit contenir les fichiers WAV référencés par `CONFIG.SAMPLE_MAP`. Les samples ne sont pas inclus dans cette archive de travail.

## Commandes npm

- `npm run dev` / `npm start` : serveur local sur le port 8000.
- `npm run lint` : contrôle ESLint.
- `npm run format` : formatage Prettier.
- `npm run format:check` : vérification du formatage.
- `npm test` : smoke tests du packaging et des corrections critiques.
- `npm run check` : syntaxe + lint + smoke tests.

## Utilisation

- Clic sur une case : fait défiler ses vélocités `off → normal → strong → accent → soft → ghost → off`.
- `Shift + clic` sur une case : applique ce même cycle à la même subdivision de chaque temps de la piste, en respectant le groupement de la signature courante.
- `Espace` : lecture / pause.
- `T` : tap tempo.
- `M` : métronome.
- `1` à `8` : sélection des mémoires.
- `Ctrl/Cmd+S` : sauvegarde la mémoire courante.
- `Ctrl/Cmd+C` / `Ctrl/Cmd+V` : copie / colle le pattern.
- `Ctrl/Cmd+D` : duplique vers la mémoire suivante.
- `Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` : undo / redo.

## Correctifs v13

- Alpine.js est local dans `vendor/` après `npm install`, sans fallback réseau.
- Message d’erreur de démarrage explicite si Alpine n’est pas disponible.
- L’icône Play est visible avant même l’initialisation Alpine.
- La corbeille vide réellement toutes les banques mémoire et ne charge plus automatiquement un groove dans la mémoire 1.
- Le bouton Escalier conserve correctement son état visuel actif après le relâchement du clic.
- Le `Shift + clic` répète l’édition sur chaque temps de la ligne selon la signature.
- Projet npm avec ESLint, Prettier, EditorConfig, scripts de contrôle et smoke tests.
- Cache applicatif PWA incrémenté en `battrochtek-v13` et Alpine local ajouté à l’app shell.

## PWA et audio

Le service worker met en cache l’application séparément du cache audio. La corbeille agit uniquement sur les mémoires utilisateur ; elle ne purge pas les samples ni les buffers audio.
