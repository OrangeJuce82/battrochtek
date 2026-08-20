# 🥁 Battochtek

**Battochtek** est une drum machine / step sequencer fonctionnant directement dans le navigateur avec la **Web Audio API**.

## Fonctionnalités

* 10 pistes de batterie
* 8 kits
* Signatures **4/4, 3/4 et 12/8**
* Presets **Rock, Hip-Hop et Latin**
* Réglage du volume par piste
* Volume master
* Réglage **Human** pour la dynamique
* Tempo et métronome
* Génération aléatoire de patterns
* 10 mémoires par signature
* Copie et chaînage de patterns
* Sauvegarde automatique avec `localStorage`

## Structure

```text
app.js
├── CONFIG
│   ├── SIGNATURES
│   ├── KITS
│   └── SAMPLE_MAP
├── PatternStore
├── AudioEngine
├── Sequencer
├── Scheduler
├── StorageManager
├── UIController
└── App.init()
```

## Installation

Aucune compilation ni dépendance n'est nécessaire.

```text
battochtek/
├── index.html
├── styles.css
├── app.js
└── sounds/
```

Il est recommandé de lancer l'application depuis un serveur HTTP local :

```bash
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000
```

## Audio

Les samples sont chargés et mis en cache par `AudioEngine` pour éviter de télécharger et décoder les fichiers WAV à chaque lecture.

Les paramètres audio sont également contrôlés avant d'être envoyés à la Web Audio API afin d'éviter les valeurs `NaN` ou `Infinity`.

## Sauvegarde

Les patterns sont conservés dans le `localStorage` du navigateur.

Les anciennes sauvegardes sont automatiquement vérifiées et normalisées lors de leur chargement.

## Compatibilité

Navigateur moderne avec prise en charge de :

* Web Audio API
* `fetch()`
* `localStorage`
* JavaScript moderne
