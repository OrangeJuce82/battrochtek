# Datasets à explorer

Ces corpus sont intéressants pour augmenter la diversité au-delà de GMD. Ils ne sont pas tous redistribués dans Battrochtek : il faut respecter leurs licences/conditions et, pour certains, écrire un adaptateur de format.

## 1. Groove2Groove — priorité élevée

- Presque **3 000 styles** d'accompagnement MIDI.
- `train` : 5 744 fichiers dans 2 872 styles ; `val` et `test` : 1 200 fichiers chacun.
- Les fichiers contiennent des accompagnements complets, pas uniquement la batterie.
- Battrochtek v28 ne lit désormais que le canal percussion GM 10, donc ces MIDI peuvent être déposés sous `grooves/Groove2Groove/` pour extraire leur partie batterie.
- Source : https://groove2groove.telecom-paris.fr/
- Dataset : https://zenodo.org/records/3958000

**Attention licence** : le corpus est publiquement téléchargeable, mais le record Zenodo ne présente pas une licence de redistribution aussi explicite que GMD. Vérifier les conditions avant d'en committer une copie dans le dépôt public.

## 2. GiantSteps — drum-pattern-datasets

- Corpus de patterns de batterie polyphoniques utilisés en Electronic Dance Music.
- Très intéressant pour compléter la faible diversité électronique de GMD.
- Dépôt : https://github.com/GiantSteps/drum-pattern-datasets

Le format devra faire l'objet d'un adaptateur dédié si les fichiers ne sont pas directement en MIDI GM.

## 3. WaivOps EDM-HSE

- **8 000 boucles de batterie house**.
- Sous-genres annoncés : big room, electro, minimal, classic.
- Données WAV + JSON, licence **CC BY 4.0**.
- Dépôt : https://github.com/patchbanks/WaivOps-EDM-HSE
- DOI indiqué par le projet : `10.5281/zenodo.13769544`.

Candidat intéressant pour un futur importeur JSON → grille Battrochtek.

## 4. IDMT-SMT-Drums

- 104 boucles polyphoniques réelles/samplées/synthétiques, kick + snare + hi-hat.
- Annotations d'onsets XML/SVL.
- Licence CC BY-NC-ND 4.0 : utile pour l'évaluation/recherche, mais **pas un bon candidat à redistribuer sous forme transformée** dans Battrochtek.
- https://zenodo.org/records/7544164

## 5. dmp_midi / 200 + 260 Drum Machine Patterns

- 460 patterns générés en MIDI General MIDI.
- Le dépôt de conversion est sous licence MIT et fournit des releases MIDI directement compatibles avec l'importeur Battrochtek.
- https://github.com/gvellut/dmp_midi

**Prudence** : les transcriptions dérivent de livres de patterns. Vérifier les droits sur le contenu musical avant d'embarquer les fichiers dans une distribution publique.

## 6. ENST-Drums

- Trois batteurs professionnels de spécialités différentes, kits et baguettes/balais variés.
- Séquences entièrement annotées et très intéressantes pour diversifier les grooves humains.
- C'est surtout un corpus audio/annotation ; un convertisseur d'onsets serait nécessaire.
- https://zenodo.org/records/21506051

## Recommandation

Pour Battrochtek, l'ordre de travail le plus rentable est :

1. **Groove2Groove**, car le volume et la variété stylistique sont très élevés et l'importeur MIDI v28 sait déjà isoler le canal batterie ;
2. **GiantSteps drum-pattern-datasets** pour l'EDM ;
3. **WaivOps EDM-HSE** via un adaptateur JSON ;
4. les datasets audio annotés (ENST/IDMT) seulement si l'on veut investir dans un convertisseur d'onsets.

Dans tous les cas, passer ensuite le résultat dans `npm run grooves:clean -- --difference N` est recommandé afin d'éviter que des milliers de variations voisines saturent la bibliothèque.
