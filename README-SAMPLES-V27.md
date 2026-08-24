# Battrochtek — Audio v27

La v27 fait évoluer Battrochtek d'une table « une clé = un WAV » vers un moteur de samples sémantique : instrument, articulation, plage de vélocité, round-robin, banque et choke group.

## Nouveaux WAV embarqués

La v27 ajoute **89 WAV originaux générés pour le projet** et déclarés CC0-1.0 :

- **BT Analog Classic** — 16 samples : kick/snare RR, HH closed/open/pedal, clap, cowbell, toms, crash, ride.
- **BT Detroit Hybrid** — 17 samples : kick/snare RR, HH closed/open/pedal, clap, rimshot, toms, crash, ride bow/bell.
- **BT Digital 80** — 14 samples : kick/snare RR, HH closed/open, cross-stick, clap, toms, crash, ride, cowbell.
- **BT World Percussion / Brushes** — 42 samples : conga, bongo et frame drum en couches de vélocité et round-robin, conga muted/slap, bongo slap, claves, woodblock, agogo, cowbell, triangle, shaker, maracas, guiro, tambourine, brush hits et brush sweeps.

Ces sons ne sont pas présentés comme des dumps de machines historiques : les trois banques électroniques sont des synthèses originales inspirées de familles sonores générales. Les scripts de génération sont fournis dans `scripts/` pour rendre les sorties reproductibles.

## Sources externes validées pour la prochaine extension

- **Virtuosity Drums** — CC0-1.0. Le corpus `ferrosintesis-samples-drumkit` fournit une sélection web-friendly de 128 fichiers 44.1 kHz avec velocity layers et round-robin, incluant kick, snare, side-stick, toms, HH closed/open/pedal et ride bow/bell.
- **VCSL** — CC0-1.0, explicitement utilisable dans des logiciels commerciaux.
- **Big Rusty Drums** — CC0-1.0, couleur acoustique vintage.
- **Oramics Sampled** — licences par collection ; l'importeur contient des profils dédiés LM-2 et TR-909 Detroit, à utiliser uniquement avec les distributions dont la licence est vérifiée.

L'importeur `scripts/import-sample-pack.mjs` sait convertir WAV/AIFF/FLAC vers WAV PCM navigateur via ffmpeg, calculer le SHA-256, enrichir `manifest-v2`, créer/mettre à jour le kit et consigner la provenance dans `samples/provenance.jsonl`.

## Architecture audio

`SampleResolver` sélectionne d'abord la banque et l'instrument, puis l'articulation demandée par FEEL, la couche de vélocité la plus adaptée et enfin le round-robin de cette articulation. Les HH partageant un `chokeGroup` coupent le son précédent avec un fondu très court, ce qui permet à un closed/pedal hat de fermer réellement un open hat.

Les anciennes clés, mémoires et URL restent compatibles : quand aucune articulation spécifique n'est disponible, le resolver retombe sur l'articulation du sample de base.
