# Battrochtek v33 — Audio integrity fix

- Resolver groupé par identité musicale, plus par simple type d’instrument.
- Les Tom High / Mid / Low restent des voix séparées à toutes les vélocités.
- Les anciens suffixes A/B sont des choix distincts, pas des round-robin implicites.
- World Percussion reste sur chaque voix VCSL sélectionnée.
- Cache audio incrémenté pour empêcher le mélange d’anciens WAV après mise à jour.
- Audit automatisé : 10 kits / 100 pistes / 268 samples, aucun fichier manquant.
- Audit resolver : 500 scénarios, aucun changement de voix/pitch par vélocité.
