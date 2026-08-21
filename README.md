## v32

- Correction GitHub Actions : `grooves:build` utilise bien `./grooves` en minuscules.
- `sync-grooves.mjs` et `clean-grooves.mjs` utilisent désormais la même racine.
- `.groovesrc.json` utilise `minimumDifference: 10`.
- Ajout de tests de non-régression sur la casse du dossier et le seuil de nettoyage.
- Cache PWA `battrochtek-v32`.

# 🥁 Battrochtek

Battrochtek est une drum machine / bibliothèque de grooves PWA basée sur la Web Audio API. L’interface utilise **Oat UI** pour les composants et styles génériques, **Alpine.js** pour l’état réactif, et une CSS locale limitée au séquenceur et à l’identité visuelle.

## Installation

Prérequis : Node.js 24+ et npm 10+.

```bash
npm install
npm run dev
```

Ouvre ensuite `http://localhost:8000`.

`npm install` copie automatiquement Alpine.js dans `vendor/alpine/` et Oat UI dans `vendor/oat/`. Il n’y a aucun fallback CDN : la PWA reste autonome après installation.

Le dossier `sounds/` doit contenir les fichiers WAV référencés par `CONFIG.SAMPLE_MAP`.

## Mémoires dans l’URL

Les **8 mémoires** ne sont plus conservées dans `localStorage`. Elles sont sérialisées dans le fragment de l’URL sous la forme `#mem=…`. Chaque mémoire est autonome et transporte sa propre signature, son tempo, son pattern, son kit et son éventuel Kit Custom.

Cela permet de :

- conserver les mémoires dans l’URL de la session ;
- partager un set de mémoires en copiant simplement l’URL ;
- mettre à jour immédiatement le hash lors d’une sauvegarde, d’un collage, d’une duplication ou d’un effacement des mémoires ;
- conserver un état réellement vide après utilisation de la corbeille.

Le pattern en cours n’est écrit dans la mémoire sélectionnée qu’au moment de la sauvegarde, comme auparavant.

## Interface et thème

Oat UI fournit les boutons, champs, sélecteurs, focus et composants de base. `styles.css` contient uniquement les variables Battrochtek, le layout MAO, la grille, les vélocités, les LEDs et quelques adaptations visuelles.

Le bouton **lune / soleil** du header permet de basculer entre thème sombre et clair. Au premier chargement, le thème suit automatiquement `prefers-color-scheme` du système.

Le nouveau logo transparent est décliné automatiquement dans les tailles PWA, favicon et Apple Touch Icon sans ajout de fond ni de coins arrondis.

## Déploiement GitHub Pages

Le dépôt contient `.github/workflows/deploy-pages.yml`. À chaque push sur `main`, GitHub Actions installe les dépendances avec Node.js 24, génère les vendors locaux, lance les contrôles, construit `dist/`, puis publie la PWA sur GitHub Pages.

Dans **Settings → Pages** du dépôt, sélectionne **GitHub Actions** comme source. Tous les chemins de l’application étant relatifs, le déploiement fonctionne aussi dans un sous-chemin de projet GitHub Pages.

### Première activation de GitHub Pages

Avant le premier déploiement, ouvre **Settings → Pages** dans le dépôt GitHub et choisis **GitHub Actions** comme source de publication. Cette activation est un réglage du dépôt et ne peut pas être créée de façon fiable par le `GITHUB_TOKEN` standard du workflow.

Une fois cette option activée, les push suivants sur `main` déploient automatiquement l'application.

## Sources de grooves

Les grooves intégrés sont maintenant regroupés sous **Basic Grooves**. Ils chargent uniquement la mémoire 1.

Les imports MIDI sont génériques : **un dossier = une Source**, un sous-dossier facultatif = un Style, et chaque fichier MIDI = un Groove. Lorsqu’un Groove importé est choisi, ses huit premières fenêtres non vides de deux mesures remplissent automatiquement les mémoires 1 à 8.

L’import respecte le mapping simplifié du Groove MIDI Dataset de Magenta et utilise 9 lignes : Crash, Ride, HH Open, HH Closed, Snare, High Tom, Low-Mid Tom, Floor Tom et Kick. Les articulations Roland head/rim/edge sont regroupées selon le « Paper Mapping ».

Place les fichiers dans `groove-sources/<Nom de la source>/` puis lance :

```bash
npm run grooves:sync
```

Voir [GROOVE_SOURCES.md](GROOVE_SOURCES.md) pour la convention complète.

## Commandes npm

- `npm run dev` / `npm start` : serveur local sur le port 8000.
- `npm run build` : génère le site statique GitHub Pages dans `dist/`.
- `npm run grooves:sync` : importe les dossiers MIDI de `groove-sources/` et régénère le bundle des Sources.
- `npm run lint` : contrôle ESLint.
- `npm run format` : formatage Prettier.
- `npm run format:check` : vérification du formatage.
- `npm test` : smoke tests des fonctions critiques.
- `npm run check` : syntaxe + lint + smoke tests.

## Utilisation

- Clic sur une case : `off → normal → strong → accent → soft → ghost → off`.
- `Shift + clic` : applique le même cycle à la même subdivision de chaque temps de la piste.
- `Espace` : lecture / pause, même lorsqu’un sélecteur ou un champ de l’interface possède le focus.
- `T` : tap tempo.
- `M` : métronome.
- `1` à `8` : sélection des mémoires.
- `Ctrl/Cmd+S` : sauvegarde la mémoire courante et met à jour l’URL.
- `Ctrl/Cmd+C` / `Ctrl/Cmd+V` : copie / colle le pattern.
- `Ctrl/Cmd+D` : duplique vers la mémoire suivante.
- `Ctrl/Cmd+Z` / `Ctrl/Cmd+Y` : undo / redo.



## v31

- Le bouton **Recharger le groove** conserve désormais la mémoire sélectionnée.
- Il restaure uniquement le slot courant depuis le groove source, sans écraser les sept autres mémoires.
- Pour les sources multi-mémoires, la mémoire N retrouve la boucle source N ; si elle n'existe pas, la première boucle du groove sert de référence.
- La lecture Play/Pause reste inchangée pendant le rechargement.
- Cache PWA `battrochtek-v31`.

## v30

- Les Sources importées portent désormais strictement le nom de leur dossier de premier niveau dans `./grooves`.
- Les fichiers générés à la racine (`clean-report.json`, `external-grooves.js`) ne peuvent plus transformer toute la bibliothèque en une fausse Source `Grooves`.
- La racine standard est `./grooves` en minuscules.
- La recherche globale n'utilise plus le `datalist` natif du navigateur.
- Nouvel autocomplete Battrochtek sous le champ de recherche : 12 résultats, source/style/signature/BPM, souris et clavier ↑/↓/Entrée/Échap.
- Cache PWA `battrochtek-v30`.

## v28

- `Basic Grooves` déplacé dans `./grooves/Basic Grooves/basic-grooves.json`.
- `./grooves/<Source>/` devient la racine unique pour les imports MIDI/JSON.
- `npm run grooves:clean -- --difference N` déduplique tous les datasets entre eux.
- Similarité basée sur les frappes actives (Dice) et légèrement pondérée par les vélocités.
- Rapport détaillé des doublons dans `grooves/clean-report.json`.
- Seuil de nettoyage par défaut configurable dans `.groovesrc.json`.
- Le workflow GitHub Pages utilise `npm run grooves:build` pour publier la bibliothèque nettoyée.
- Les MIDI multi-instruments sont filtrés sur le canal percussion GM 10.
- Recherche globale avec autocomplétion au centre du header.
- Cache PWA `battrochtek-v28`.

## v27

- **Source IA** renommée **Basic Grooves** ; un Basic Groove remplit uniquement la mémoire 1.
- Import MIDI indépendant de toute collection nommée : un dossier de premier niveau devient automatiquement une Source.
- Les sous-dossiers servent de Styles et les fichiers MIDI deviennent les Grooves.
- Chaque MIDI est découpé en jusqu’à 8 fenêtres successives de deux mesures, chargées dans les mémoires 1 à 8.
- Mapping d’import aligné sur le **Paper Mapping** du Groove MIDI Dataset / Roland TD-11.
- Grille étendue à 9 lignes avec un **Floor Tom** séparé du **Low-Mid Tom**.
- Migration automatique des anciens patterns 8 et 10 pistes vers la nouvelle grille 9 pistes.
- Suppression des dépendances spécifiques Lucerne/GMD/Agostini dans le code d’import.
- Cache PWA `battrochtek-v27`.

## v26

- Ajout d’un sélecteur **SOURCE** avant STYLE.
- Conservation des grooves existants sous **Source IA**.
- Import automatisé de la Lucerne Groove Research Library via *Drum Groove Corpora*.
- Import du sous-ensemble Magenta/GMD utilisé par l’étude (358 tracks avant adaptation), sans dupliquer les rendus E-GMD.
- Adaptation des corpus externes en boucles de deux mesures, grille 1/16, HH/SD/BD.
- Déduplication des patterns devenus identiques après quantification.
- Importeur local Agostini sans redistribution de contenu commercial non autorisé.
- Synchronisation des corpus ajoutée au workflow GitHub Pages.
- Cache PWA `battrochtek-v26`.

## v25

- `actions/configure-pages` passe de v5 à v6 (runtime Node.js 24).
- `actions/upload-pages-artifact` passe à v4.
- Le workflow construit et valide l'application avant l'étape de configuration Pages.
- Documentation explicite de l'activation initiale **Settings → Pages → GitHub Actions**.
- Cache PWA `battrochtek-v25`.

## v24

- ESLint distingue désormais les environnements navigateur, Service Worker et Node.js.
- `process` est correctement déclaré uniquement pour les scripts Node (`scripts/*.mjs`).
- Les API Web restent limitées à `app.js` et au Service Worker au lieu d'être déclarées globalement pour tout le projet.
- Workflow GitHub Pages conservé sur `actions/checkout@v7`, `actions/setup-node@v7` et Node.js 24.
- Cache PWA `battrochtek-v24`.

## v23

- ESLint connaît maintenant les API Web utilisées par l’application (`fetch`, `location`, `URLSearchParams`, `TextEncoder`, `TextDecoder`, `atob`, `btoa`, etc.).
- Suppression des variables de `catch` inutilisées.
- GitHub Actions utilise `actions/checkout@v7` et `actions/setup-node@v7`, compatibles avec le runtime Node.js 24 actuel de GitHub Actions.
- Le cache automatique de `setup-node` est explicitement désactivé tant que le dépôt ne versionne pas de `package-lock.json`.
- Cache PWA `battrochtek-v23`.

## v22

- GitHub Actions passe à Node.js 24.
- Le workflow n'active plus le cache npm sans lockfile.
- Installation CI avec `npm install`, compatible avec le dépôt actuel sans `package-lock.json`.
- Le pipeline conserve les contrôles puis le build et le déploiement GitHub Pages.
- Cache PWA `battrochtek-v22`.

## v21

- Déploiement automatique GitHub Pages via GitHub Actions à chaque push sur `main`.
- Déclenchement manuel également disponible avec `workflow_dispatch`.
- Pipeline officiel `configure-pages` → `upload-pages-artifact` → `deploy-pages`.
- `npm ci` génère Alpine.js et Oat UI localement avant le build.
- `npm run check` valide le projet avant publication.
- `npm run build` produit un `dist/` propre avec `.nojekyll`.
- Cache applicatif `battrochtek-v21`.

## v20

- Correction des rechargements Cmd/Ctrl+R avec Alpine : le service worker utilise désormais le réseau en priorité pour le code et les vendors afin de ne plus servir un ancien placeholder.
- Alpine.js est épinglé sur une version publiée (`3.15.12`) et reste copié localement dans `vendor/alpine/` par `npm install`.
- Le démarrage attend aussi l’événement `alpine:initialized` avant de conclure qu’Alpine manque.
- Correction du `Response body is already used` : les réponses sont clonées avant toute mise en cache.
- Ajout de `<meta name="mobile-web-app-capable" content="yes">` en complément de la balise Apple.
- Cache applicatif `battrochtek-v20`.

## v19

- L’état Play/Pause ne change plus lors du chargement d’un groove, d’une variante, d’un reset, d’un changement de signature, d’une sauvegarde, d’un undo/redo ou d’un changement de mémoire.
- Play/Pause est piloté uniquement par le bouton Play ou le raccourci `Espace`.
- Les 8 mémoires sont désormais autonomes : chacune sauvegarde sa propre signature et son propre tempo avec le pattern.
- Changer de signature ou de groove ne force plus la mémoire 1 et ne réinitialise aucune mémoire.
- Passer d’une mémoire à une autre peut donc changer automatiquement signature et tempo sans arrêter la lecture.
- `Espace` garde la priorité sur le comportement natif des `<select>` et déclenche toujours Play/Pause.
- Format du hash mémoire migré en v2, avec lecture automatique des liens v1 existants.
- Cache applicatif `battrochtek-v19`.

## v18

- Bouton **Partager** dans le header, entre le thème et le volume.
- Dialog de partage avec QR code local, lien copiable et partage natif quand le navigateur le permet.
- Le lien partagé contient le groove courant dans la mémoire sélectionnée ; l’URL de travail continue de conserver les 8 mémoires.
- Le groove courant est sauvegardé dans sa mémoire avant la génération du lien.
- `bar-accent` marque maintenant le premier temps de **chaque mesure** du pattern (les patterns affichent deux mesures).
- Générateur QR embarqué localement dans `vendor/qrcode/` pour fonctionner hors ligne.

## v17

- Une seule implémentation de tooltip (`data-bt-tooltip`) : Oat UI ne génère plus un second tooltip.
- Nouvelle banque de **210 WAV renommés et classés**.
- 10 kits contrastés avec couleur dédiée : Studio Punch, Arena 909, Neon 808, Soul Pocket, Funk Tight, DMX Street, Linn Chrome, SP Dust, Afro Circuit et Glitch Lab.
- Chaque piste possède son propre sélecteur de sample. Une modification transforme automatiquement le kit en **CUSTOM**.
- Le Kit Custom est sauvegardé avec le pattern dans les mémoires URL.
- Cache applicatif `battrochtek-v17` et cache audio `battrochtek-audio-v2`.


## Grooves v28

Toutes les Sources de grooves sont maintenant rangées sous `./grooves/<Nom de la Source>/`. Les anciens **Basic Grooves** vivent dans `grooves/Basic Grooves/basic-grooves.json` et suivent le même pipeline que les MIDI externes.

```bash
npm run grooves:sync
npm run grooves:clean -- --difference 10
```

`grooves:sync` importe tout sans filtrer. `grooves:clean` compare globalement tous les datasets et ne conserve que les grooves séparés par la différence minimale demandée. Le seuil par défaut se règle dans `.groovesrc.json`. Le rapport est écrit dans `grooves/clean-report.json`.

Une **recherche globale avec autocomplétion** est disponible au centre du header. Elle indexe le nom du groove, son style et sa Source ; sélectionner un résultat charge directement le groove et ses mémoires.

Voir `GROOVE_SOURCES.md` pour le format d'import et l'algorithme de nettoyage, et `GROOVE_DATASETS.md` pour les corpus externes recommandés.

## PWA et audio

Le service worker met en cache l’application et les dépendances UI locales séparément des samples audio. La corbeille vide uniquement les mémoires présentes dans l’URL ; elle ne purge pas le cache audio.


## Kits et samples

La v17 remplace la banque audio par **210 samples renommés** avec des noms lisibles et une bibliothèque classée par type. Les 10 kits sont volontairement contrastés : Studio Punch, Arena 909, Neon 808, Soul Pocket, Funk Tight, DMX Street, Linn Chrome, SP Dust, Afro Circuit et Glitch Lab.

Chaque kit possède une couleur dédiée. Le son de chaque piste peut être changé directement dans la colonne instrument. Dès qu’un son de piste est modifié, le séquenceur passe automatiquement en **Kit Custom**. Cette composition personnalisée est incluse dans la mémoire et donc dans le hash `#mem=` de l’URL.

Les anciens noms de fichiers audio ont été normalisés dans `sounds/`. Le service worker met les nouveaux fichiers en cache audio à la demande.
