# Battrochtek — FEEL

FEEL interprète le groove mémorisé sans remplacer son CORE. Le switch FEEL active uniquement la génération : tous les paramètres restent éditables lorsqu’il est désactivé.

## Façade

- **Orchestration** : macro-preset Minimal, Pocket, Standard, Busy ou Wild.
- **Main droite** : seulement **Charley** ou **Ride**.
- **Pad 1** : Transformation sur X, Densité sur Y.
- **Pad 2** : Swing sur X, Énergie sur Y.
- **Influence** : Kick, Snare, variante de main droite, Ghost Snare, Toms et Crash.

## Main droite et variantes

La main droite possède seulement deux surfaces principales :

- **Charley** : la ligne d’influence contextuelle devient **Open HH**. Elle règle combien de coups peuvent s’ouvrir vers le Hi-Hat Open.
- **Ride** : la ligne d’influence contextuelle devient **Bell**. Elle règle combien d’accents du Ride peuvent passer sur la cloche.

La ligne contextuelle ne remplace donc pas la surface principale : Open HH enrichit le Charley et Bell enrichit le Ride.

## Influences

- **Kick** : liberté de FEEL sur la grosse caisse.
- **Snare** : liberté de FEEL sur la caisse claire.
- **Open HH / Bell** : richesse de la surface de main droite choisie.
- **Ghost Snare** : ghost notes de caisse claire uniquement.
- **Toms** : quantité de pulsation que FEEL peut déplacer vers les toms. À 0, aucun tom n’est ajouté par le FEEL normal.
- **Crash** : ponctuations Crash du FEEL normal. À 0, aucun Crash n’est ajouté par le FEEL normal.

Les niveaux d’influence sont contractuels pour la génération FEEL normale.

## Exception Live : fill de reprise

Le geste **Break** constitue une transition Live et possède volontairement une règle différente.

- `B` maintenu : Break.
- relâchement : fill de reprise puis retour sur le groove.

Le fill de reprise peut utiliser **toms et crash même lorsque Influence Toms = 0 ou Influence Crash = 0**. Cette exception évite qu’un Break se termine par une reprise sèche et permet au fill d’assurer sa fonction de transition.

Le vocabulaire reste dépendant de la famille musicale :

- Rock/Pop : descente de toms plus affirmée + crash de résolution.
- Funk/Soul : geste plus court, snare puis toms, crash plus contenu.
- Jazz : phrasé plus léger et plus fluide.
- Hip-Hop/Reggae : toms plus tardifs et fill plus court.
- Latin/Afro : reprise plus percussive et moins « rock fill ».

Le crash de reprise est placé sur le prochain premier temps lorsque la phrase se résout au bouclage.

## Orchestration

Les presets règlent ensemble la densité, la transformation, les influences et la surface principale de la main droite. Si l’utilisateur modifie ensuite un de ces réglages, l’orchestration devient **Personnalisée**.

- **Minimal** : très fidèle, presque aucun enrichissement.
- **Pocket** : Kick/Snare protégés, quelques nuances.
- **Standard** : enrichissement modéré.
- **Busy** : davantage de variantes, toms et crash.
- **Wild** : transformation et influences maximales.

## Actions

La ligne d’actions FEEL est : **Break · Variation · Dé · Reset**.

- **Break** : geste Live décrit ci-dessus.
- **Variation** : nouvelle interprétation FEEL du CORE.
- **Dé** : randomisation musicale des paramètres FEEL, sans modifier le CORE.
- **Reset** : retour aux paramètres FEEL par défaut.

## Raccourcis

- `B` : appui court = fill ; appui long = Break ; relâchement = fill de reprise.
- `V` : nouvelle variation.
- `H` : alterne Charley / Ride.
- `G` : orchestration suivante.
- `J / K` : Énergie - / +.
- `Shift+J / Shift+K` : Transformation - / +.

Les actions sont abstraites dans le bus Battrochtek afin de préparer le futur MIDI Learn.
