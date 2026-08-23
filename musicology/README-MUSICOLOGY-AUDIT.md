# Battrochtek — Audit musicologique de la bibliothèque (v1)

Date : 2026-08-23
Base analysée : Battrochtek FEEL Limb Orchestration v13

## Verdict

La matière première est abondante, mais la bibliothèque **Battrochtek Library v2 ne peut pas être considérée comme musicologiquement validée**. Son script de génération (`scripts/build-library-v2.mjs`) applique une fonction générique `pattern(desc, variant)` à des noms de styles. Les libellés sont donc plus diversifiés que les rythmes eux-mêmes.

- Entrées totales analysées : **1239**.
- Sources : Basic Grooves: 200, Battrochtek Library v2: 132, Drum Machine Patterns: 468, Groove MIDI Dataset: 439.
- Curated v2 : **132 entrées**, mais seulement **20 fingerprints de pattern de départ**.
- Mémoires Curated v2 : **560**, mais seulement **86 fingerprints distincts** au total.
- Plus gros cluster de doublons exacts : **59 styles/noms sur le même pattern**.
- Taxonomie canonique proposée : **213 archétypes** (A = noyau professionnel, B = extension régionale, C = hybrides).

## Décision de méthode

Une entrée canonique n'est conservée que si un batteur doit apprendre un **vocabulaire rythmique ou une fonction d'orchestration réellement différente**. Les noms commerciaux, scènes locales, époques ou hybrides qui ne changent pas substantiellement la partie de batterie deviennent des **tags**, pas de nouveaux grooves.

La bibliothèque visible doit devenir unique. Les datasets restent en arrière-plan comme **sources de validation/performance**, pas comme bibliothèques concurrentes.

## Ce que l'audit a trouvé

### 1. Curated v2 est une taxonomie synthétique, pas encore une collection de transcriptions

Le code source montre que la v2 construit ses grooves à partir de quelques règles génériques (straight, shuffle, four-floor, breakbeat, clave-like, samba-like, etc.). Cela explique les clusters exacts massifs. Exemple : le plus gros fingerprint regroupe Cumbia, Mambo, Bolero, Cha-cha-cha, Merengue, Bossa Nova, Highlife, Soukous, Motown, Jazz, Reggae, Hip-Hop, Country et Electronic — ce qui est incompatible avec une bibliothèque de référence.

### 2. Cumbia doit être profondément simplifiée

`Cumbia Colombiana` et `Cumbia Traditional Drum-Set` doivent fusionner en **Traditional Colombian Cumbia**. `Moderna`, `Sonidera`, `Villera`, `Rebajada`, `Chicha` et `Cumbia Funk` ne doivent devenir des entrées distinctes que si une transcription et des sources montrent une architecture de batterie réellement différente ; sinon elles deviennent tags/variantes d'orchestration.

### 3. GMD est la meilleure source interne pour le toucher humain

Le Groove MIDI Dataset contient des performances humaines annotées et doit surtout servir à extraire vélocité, microtiming, ghosts, articulations et comportements de fills. Ses genres sont cependant trop larges pour définir seuls la taxonomie fine.

### 4. Basic Grooves est utile pour les morceaux iconiques, mais pas comme autorité

Les 200 entrées portent l'attribution `Source IA — adaptation pédagogique`. Elles ne doivent donc pas être promues telles quelles. Les grooves iconiques sont des **candidats à retranscrire/valider** (par ex. Funky Drummer, Cissy Strut, Rosanna, Fool in the Rain, When the Levee Breaks, Take Five, Amen Brother).

### 5. Drum Machine Patterns doit rester une source secondaire tant que sa provenance n'est pas explicitée

Elle est précieuse pour Disco, House/Electronic, Ska/Reggae et patterns historiques de boîtes à rythmes, mais le bundle analysé ne donne pas assez de métadonnées de provenance pour l'utiliser comme preuve musicologique principale.

## Taxonomie cible

Répartition des 213 archétypes :

- Latin America: 36
- Rock / Pop: 24
- Electronic / Dance: 18
- Foundations / Concepts: 16
- Funk / Soul / R&B: 16
- Africa: 16
- Jazz: 14
- Jamaica: 11
- Country / Americana: 10
- Hip-Hop: 10
- North Africa / Middle East: 10
- Caribbean: 9
- Blues / Shuffle: 8
- Global / Hybrid: 7
- Balkans / Eastern Europe: 4
- South Asia: 4

Couverture automatique indicative des noms actuels : {'NAMED_MATCH': 89, 'RELATED_CANDIDATE': 58, 'MISSING_OR_WEAK': 66}. Cette colonne sert uniquement à trouver des candidats existants ; elle **n'est pas une validation musicologique**.

## Sources de référence retenues pour la phase de validation

1. Berklee — *Introduction to Brazilian and Afro-Cuban Drum Set* : distingue explicitement les time-feels brésiliens, cubains et certains caribéens, et insiste sur l'adaptation au drum set à partir des patterns de percussion originaux.
   https://college.berklee.edu/courses/ilpd-211
2. Berklee — *Advanced Afro-Cuban Rhythms for Drum Set* : son, son montuno, rumba, songo, timba et styles folkloriques sont traités comme vocabulaires distincts.
   https://college.berklee.edu/courses/ilpd-373
3. Berklee Online — *Arranging and Producing Contemporary Music Styles* : Samba, Bossa, Partido Alto, Baião, Afro-Cuban 6/8, Cha-Cha-Cha et Mambo sont étudiés séparément avec leurs instruments constitutifs.
   https://online.berklee.edu/courses/arranging-and-producing-contemporary-music-styles
4. Berklee — *South American Rhythms for the Drum Set* : Peru, Brazil, Uruguay, Argentina, Venezuela, Colombia ; adaptation authentique des rythmes de percussion au kit.
   https://college.berklee.edu/courses/ilpd-357
5. Berklee Online — *Drum Set Performance 101* : Bossa, Samba, Half-Time Shuffle, Afro-Cuban 6/8, Jazz Shuffle, Swing, Cha-Cha, compound/odd meters.
   https://online.berklee.edu/courses/drum-set-performance-101
6. Vic Firth / Tommy Igoe — *Groove Essentials* : 47 grooves essentiels couvrant rock, jazz, R&B/funk et world (Second Line, Reggae, Bossa, Samba, Mambo, Cha-Cha, Bolero, Tango, Soca…).
   https://ae.vicfirth.com/education/groove-essentials/groove-essentials-32-soca/
7. Modern Drummer — corpus Jamaican drumming : one-drop, rockers, steppers, ska, rocksteady, lovers rock, dancehall sont explicitement distingués.
   https://www.moderndrummer.com/2016/10/tommy-benedetti-tour-john-browns-body/
8. Google Magenta — Groove MIDI Dataset : 1,150 MIDI, 22,214 mesures, 503 beats, 647 fills, 18 grandes familles, drummers humains et métadonnées de tempo/style.
   https://magenta.tensorflow.org/datasets/groove
9. Berklee — *Latin Piano Styles* (utile pour la taxonomie régionale, même au-delà du drum set) : samba, bossa, baião, afoxê, frevo, maracatu, festejo, landó, chacarera, zamba, candombe, tango, joropo, cumbia, chandé.
   https://online.berklee.edu/courses/latin-piano-styles
10. Drumeo / Tosin Aribisala — adaptations modernes de rythmes africains : afrobeat, makossa, soukous.
   https://www.drumeo.com/beat/african-rhythms-on-the-drums/

## Règles de construction de la future bibliothèque unique

1. **Une entrée = un archétype de batterie distinct.**
2. **Une entrée = une mémoire canonique** par défaut. Une phrase de 2 mesures doit être stockée comme un seul pattern de 2 mesures, pas comme deux mémoires.
3. Les variantes de performance sont confiées à FEEL ; elles ne gonflent plus le catalogue.
4. Chaque groove reçoit : tradition, famille, feel, signature, longueur de phrase, provenance, niveau de confiance, références, caractéristiques distinctives et liste des anciennes entrées fusionnées.
5. Les grooves issus de traditions de percussion sont reconstruits depuis les rôles originaux (bell/clave, low drum, slap/open tone, etc.) avant orchestration drum-set.
6. Les morceaux iconiques sont dans une branche séparée et ne sont gardés que lorsqu'ils enseignent une idée de batterie canonique.
7. Aucune entrée synthétique n'est marquée `validated` sans triangulation : source pédagogique spécialisée + enregistrement/transcription + contrôle de jouabilité.

## Fichiers livrés

- `groove-audit-1239.csv` : audit calculé de **chaque entrée actuelle**, doublons, mémoires et action recommandée par source.
- `curated-v2-duplicate-clusters.csv` : tous les clusters exacts de la v2.
- `canonical-taxonomy-v1.csv` : taxonomie cible de 213 archétypes avec candidat actuel éventuel.
- `unified-curated-scaffold.json` : squelette de la future bibliothèque unique. Les patterns sont volontairement `null` tant qu'ils ne sont pas validés ; je refuse de recréer une nouvelle couche de faux grooves génériques.

## Étape suivante recommandée

Construire la Curated **famille par famille** en commençant par Jamaica, Jazz, Cuba/Brazil et Cumbia, car ce sont les zones où le catalogue actuel est le plus trompeur. Pour chaque archétype : sélectionner ou retranscrire un pattern représentatif, documenter ses caractéristiques, puis seulement l'insérer dans la bibliothèque. Les anciennes sources restent disponibles comme matériau de comparaison, mais disparaissent de l'interface finale.
