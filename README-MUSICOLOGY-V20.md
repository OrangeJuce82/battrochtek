# Battrochtek Musicology v20 — Rock/Hip-Hop + Limb Grammar

Cette passe poursuit le corpus canonique et le moteur FEEL sur deux axes qui doivent rester cohérents : la qualité des scores et la façon dont un batteur réel les interprète.

## Corpus

- 213 archétypes canoniques complets.
- 213 grooves publiables dans la bibliothèque Curated après revue de diversité.
- 0 collision structurelle exacte avec le fingerprint v2.
- Le fingerprint v2 tient compte de la signature, de la longueur de phrase, du feel, du swing et du squelette structurel. Un shuffle et un groove straight ne sont donc plus faussement fusionnés parce qu'ils occupent les mêmes cases.
- Rock/Pop/Metal (CAN-018 à CAN-040) et Hip-Hop (CAN-089 à CAN-098) ont été reconstruits comme archétypes complets et différenciés.
- Les collisions restantes de Jazz/Funk/Rock ont été résolues par des différences de rôle réellement musicales, jamais par ajout décoratif destiné à tromper le fingerprint.
- Le rôle canonique `comping` est désormais explicite pour le jazz et fait partie du squelette structurel. Les rôles `comping` et `left-foot` sont documentés dans la spec canonique.

## FEEL : Limb Grammar v2

- `Ride` déplace la main de time ; il ne crée pas une seconde ligne de time indépendante.
- Le moteur détermine la surface de time de la source (`sourceTimeVoice`).
- `Open Kit` / `Full Kit` peuvent migrer la main de time seulement aux frontières de phrases, puis conserver cette affectation sur la mesure courante.
- En Jazz, lorsque la main de time est au ride, le pied gauche peut conserver le chick de hi-hat sur 2 et 4.
- Comme la grille actuelle n'a pas encore de piste HH Pedal dédiée, ce chick est rendu sur `HH Closed`, mais les steps concernés sont marqués comme `leftFoot` dans le moteur et ne comptent pas dans la limite des deux mains.
- Les fills continuent de libérer les mains et peuvent interrompre temporairement la voix de time avant résolution.

## Validation

Le statut `reviewed-pedagogical-adaptation` ne signifie pas transcription note-par-note d'un enregistrement. Les scores nécessitant une preuve de transcription restent signalés dans `musicology/validation-dashboard.csv`.
