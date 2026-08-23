# Battrochtek Curated — bibliothèque unifiée v14

Cette version remplace les bibliothèques visibles multiples par **une seule bibliothèque : Battrochtek Curated**.

## Règles de curation intégrées

- 213 archétypes sont suivis dans `musicology/canonical-manifest.json`.
- La bibliothèque jouable contient actuellement 108 patterns rythmiquement distincts issus du corpus existant.
- Chaque entrée jouable ne contient **qu'une seule mémoire représentative**.
- Les collisions exactes entre styles différents sont mises en quarantaine dans le manifeste au lieu d'être affichées sous plusieurs noms trompeurs.
- Les entrées manquantes ou ambiguës restent `needs-rebuild` jusqu'à transcription/validation musicologique.
- Le corpus historique complet est conservé hors interface dans `grooves/source-grooves-archive.js` pour permettre les reconstructions futures.

## Navigation

La source n'est plus affichée dans la barre d'outils puisqu'il n'en existe qu'une. La navigation se fait par :

`Famille → Tradition · Archétype`

La recherche globale indexe également la tradition, l'identifiant canonique, le feel et la provenance.

## Reconstruction

`npm run grooves:library` reconstruit `grooves/Battrochtek Curated/curated.json` depuis la taxonomie et le corpus d'archive.

`npm run grooves:sync` reconstruit le bundle navigateur uniquement depuis la Curated.

`npm run grooves:build` exécute les deux étapes.
