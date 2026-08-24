
### v52 — FEEL UI & layout

- FEEL et Aide deviennent des accordéons pleine largeur.
- FEEL expose Orchestration, Main droite, Energy/Transformation/Density/Swing et une Influence avancée repliée.
- Orchestration devient un macro-preset : Minimal, Pocket, Standard, Busy, Wild.
- Le switch FEEL contrôle uniquement la génération : les réglages restent éditables FEEL OFF.
- La détection des membres reste interne ; le mode Main droite TOMS réorchestre le rythme source sur les toms.
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
- Bibliothèque canonique unique de grooves maintenue dans le projet.
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

### Édition de la grille

- `Espace` : lecture / stop
- `T` : tap tempo
- `M` : métronome
- `1` à `5` : choisir la vélocité d’écriture ; si des notes sont sélectionnées, appliquer immédiatement cette vélocité
- `Ctrl/Cmd + A` : sélectionner toutes les notes actives
- `Ctrl/Cmd + I` : inverser la sélection des notes actives
- `Ctrl/Cmd + C / V / D` : copier / coller / dupliquer la sélection
- `Ctrl/Cmd + Z / Y` : undo / redo
- `Suppr / Backspace` : supprimer la sélection
- `Flèches` : déplacer la sélection
- `Shift` : ajouter à la sélection
- `Ctrl/Cmd + clic` : basculer une note dans la sélection

### Performance FEEL

- `B` : appui court = fill ; appui long = break ; relâchement = fill de reprise
- `V` : nouvelle variation FEEL
- `H` : changer la destination de la main droite
- `G` : orchestration suivante
- `J / K` : énergie − / +
- `Shift + J / K` : transformation − / +

Le raccourci `F` dédié au Fill a été supprimé ; le Fill reste intégré au geste Break.

### Mémoires

- `Alt/Option + 1…8` : ouvrir une mémoire
- `Pavé numérique 1…8` : ouvrir une mémoire
- Les mémoires peuvent être réordonnées par glisser-déposer.
- Le bouton **Dupliquer** copie explicitement la mémoire active.

## Grooves

La bibliothèque canonique visible est maintenue dans `grooves/`. Les scripts de synchronisation et de normalisation sont des outils de maintenance du projet et ne font pas partie du workflow utilisateur.

## Déploiement

Le workflow GitHub Actions construit et publie automatiquement la PWA sur GitHub Pages depuis `main`.

## Groove Library v2

La v38 conserve la banque validée et consolide l’éditeur de grille. La v37 transformait la banque en bibliothèque éditoriale : **1239 grooves** au build actuel, dont **132 grooves Battrochtek Library v2** ciblés sur les zones sous-représentées (Cumbia/Latin, Afrique/World, Country, électronique, Hip-Hop, Jazz moderne, Concepts). Les grooves v2 disposent de 4 mémoires évolutives, et les Cumbia de 8 mémoires.

Les métadonnées internes comprennent désormais `family`, `style`, `substyle`, `origin`, `feel`, `signature`, `bpm`, `difficulty`, `sourceType`, `artist`, `song`, `drummer` et `tags`. La recherche globale indexe ces champs sans alourdir l'interface Style → Groove.

Commandes : `npm run grooves:library` régénère la couche éditoriale ; `npm run grooves:build` la régénère puis reconstruit le bundle complet sans suppression automatique ; `npm run grooves:clean` reste disponible pour un audit/dédoublonnage volontaire.

## Documentation technique

- `docs/INTERACTION.md` : modèle d’interaction clavier/souris, sélection, vélocité et mémoires.
- `docs/SAMPLES.md` : architecture audio, resolver, articulations et validation des samples.
- `docs/FEEL.md` : orchestration et comportement FEEL.
- `docs/MUSICOLOGY.md` : état courant de la validation musicologique.
- `musicology/MUSICOLOGY-PIPELINE.md` et `musicology/CANONICAL-GROOVE-SPEC.md` : pipeline et format canonique détaillés.

Le catalogue est généré depuis le corpus canonique 960 PPQ. `npm run grooves:build` exécute la chaîne de validation, analyse de diversité, génération MIDI et publication de la bibliothèque Curated.

## Licence

Le code de Battrochtek est distribué sous **MIT**. Les samples et bibliothèques
tierces conservent leurs licences d’origine : notamment CC0 pour les imports
Virtuosity/ferrosintesis, Big Rusty Drums et VCSL. Voir `LICENSE`,
`THIRD_PARTY_NOTICES.md` et `samples/EXTERNAL-SOURCES.md`.

> Les anciens samples marqués `license: "unspecified"` ne sont pas couverts par
> la licence MIT du code et doivent être audités/remplacés avant une
> redistribution publique qui exige une provenance entièrement vérifiée.


### Raccourcis v39

- `L` : ouvrir/fermer le panneau Entraînement.
- `+` / `-` : augmenter/diminuer la vélocité de la sélection.

## Navigation par favoris

Les changements de lien Battrochtek dans le même onglet (favoris, historique, changement de hash) sont appliqués immédiatement : mémoires, groove et état audio sont relus sans rechargement complet de la page.


## FEEL / Live Performance v44

FEEL sépare maintenant le CORE (Kick/Snare), la main droite et les enrichissements. Le CORE peut être LOCKED, SOFT ou FREE. L'influence visible Kick/Snare/Right Hand/Ghosts/Toms est réglable sur 0–3. ENERGY contrôle l'intensité; DEVIATION contrôle la liberté de transformation. RIGHT HAND peut forcer Auto, Hi-Hat, Ride, Ride Bell ou Perc.

Live: F = Fill, B court = Fill, B maintenu = Break puis reprise/fill au relâchement, C = Crash, V = variation FEEL, N = mémoire suivante au prochain tour, H = main droite suivante. Les actions sont exposées dans `window.Battrochtek.actions` pour préparer le futur MIDI Learn.

Raccourcis FEEL: G = CORE suivant; H = Right Hand suivant; J/K = Energy -/+; Shift+J/K = Deviation -/+.

### v49 — FEEL mémorisé + ergonomie live

FEEL détecte maintenant les rôles de membres à partir du groove source (main droite, main gauche, pied droit, pied gauche). Un groove piloté au ride conserve donc cette main droite en AUTO et peut être migré vers hi-hat/ride/percussion sans réécrire son rythme. Le panneau FEEL propose une vue compacte Sliders ou Pad, les anciens boutons instrument redondants ont été retirés, et les actions Live visibles sont regroupées autour de Fill, Break, Variation et Next (Crash reste disponible au clavier).
