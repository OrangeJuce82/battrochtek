# Battrochtek — Sample Library Roadmap

## État actuel

La bibliothèque embarquée contient 210 samples : 32 kicks, 30 snares, 29 toms, 17 hi-hats, 14 cymbales, 26 percussions, 61 FX et 1 métronome.

Le principal manque n'est donc pas le nombre brut de fichiers, mais la couverture musicale : plusieurs kits acoustiques actuels partagent des cymbales/charleys legacy, alors que la partie électronique est beaucoup plus abondante.

## Direction recommandée

### 1. Acoustic Core — jazz / soul / pop / funk

**Virtuosity Drums** — CC0.

Très bon candidat pour un kit acoustique naturel : kit de jazz contemporain, nombreuses couches dynamiques et round-robin sur les cymbales. Pour la PWA, ne pas embarquer les 1,1 Go : extraire un sous-ensemble de one-shots représentatifs et quelques couches de vélocité.

### 2. Vintage / rock / indie

**Big Rusty Drums** — CC0.

Kit des années 1980 très différent du kit jazz. Bon complément pour rock, indie, post-punk, power-pop et couleurs vintage.

### 3. World / percussions

**VCSL (Versilian Community Sample Library)** — CC0.

À utiliser pour frame drums, shakers, cloches, petites percussions et instruments world. Licence particulièrement adaptée à une intégration directe dans une PWA.

### 4. Electronic Core

**TR-808 Fischer / TidalCycles** — CC0.

Corpus complet de 808 avec plusieurs réglages de kick/snare/cymbale/open-hat. À préférer à une collection arbitraire de one-shots pour avoir une vraie famille 808 cohérente.

**Oramics Sampled** — collections orientées applications audio web. LM-2 et TR-909 Detroit sont disponibles en domaine public selon leur provenance ; vérifier le manifeste de licence de chaque sous-collection avant import. La collection contient aussi CR-78, MRK-2 et TR-505.

### 5. Source complémentaire

**Meadowlark Factory Library** — CC0.

Peut compléter les trous en one-shots acoustiques, R&B, électronique et percussions. À utiliser en appoint plutôt que comme source principale afin de garder des kits avec une identité sonore cohérente.

## Kits cibles Battrochtek

Une première couverture cohérente pourrait être :

- Jazz Club — Virtuosity Drums
- Soul / Dry Studio — sélection acoustique sèche
- Vintage Rock — Big Rusty Drums
- Modern Rock / Pop — kit acoustique plus punchy
- World Percussion — VCSL
- 808 Classic — Fischer CC0
- 909 Detroit — Oramics Public Domain
- Linn / LM-2 — Oramics Public Domain
- Lo-Fi / SP — dérivé de sources CC0 avec traitement Battrochtek

## Architecture audio à privilégier

À terme, un sample ne devrait plus être seulement `kick/snare/hat/tom/cymbal`. Le manifeste devrait conserver :

- famille / kit source
- instrument
- articulation (`closed`, `open`, `pedal`, `cross-stick`, `rimshot`, `ride-bow`, `ride-bell`, brushes...)
- plage de vélocité
- round-robin éventuel
- licence et provenance

Cela permettra au moteur FEEL de choisir non seulement une note, mais une articulation réellement adaptée à Energy, Density et à la grammaire du groove.

## Architecture — implémentée en v37.2

Le Sample Manifest v2, le resolver articulation/dynamique/round-robin et le branchement FEEL sont maintenant en place. Les 210 samples historiques ont été migrés sans changer leurs clés publiques. Le prochain travail est donc l'import audio/licences des banques cibles, pas une nouvelle refonte du moteur.
