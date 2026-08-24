# Battrochtek — Interactions de grille

Cette passe consolide l'éditeur de grille de type MAO.

- Les boutons sous la grille déplacent uniquement la sélection ; sans sélection ils ne modifient rien.
- Le bouton de sélection de ligne utilise une icône de sélection explicite et blanche.
- Ctrl/Cmd+A sélectionne toutes les notes actives.
- Ctrl/Cmd+I inverse la sélection parmi les notes actives.
- Les touches 1 à 5 de la rangée principale choisissent la vélocité d'écriture et l'appliquent immédiatement à la sélection existante.
- Les pastilles de vélocité restent uniquement colorées ; les chiffres sont réservés aux raccourcis clavier et aux tooltips accessibles.
- Ctrl/Cmd+C, V et D restent dédiés à la sélection de grille.
- Les mémoires restent accessibles sans conflit via Alt/Option+1…8 et directement avec Pavé numérique 1…8, en plus des boutons de mémoire.
- Tooltips et raccourcis FR/EN/ES ont été réalignés sur le fonctionnement actuel de l'éditeur.
- Le packaging restaure `icons/` et `musicology/`, nécessaires au build et aux tests complets.

- `Alt/Option + glisser` depuis une note sélectionnée : duplique la sélection et déplace la copie en une seule opération Undo.
- La préécoute du navigateur de sons utilise un niveau d'audition fixe : elle ne dépend plus du volume de la piste.
