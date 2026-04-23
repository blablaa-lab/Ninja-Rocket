# Space Ninja — Ninja Rocket / Werocket

Jeu navigateur de type Fruit Ninja à thème spatial, développé pour l'agence **Ninja Rocket (Werocket)**.  
Les joueurs tranchent des objets tech et des membres de la team qui volent à l'écran, à la main via webcam.

## Stack

- **Phaser 3.60** (CDN jsDelivr) — moteur de jeu, scènes, tweens, particules
- **MediaPipe Hands 0.4** (CDN) — suivi de l'index en temps réel
- **ES6 modules** — pas de bundler, import/export natif
- **localStorage** — classement persistant (top 10)
- **Google Sheets** (via Google Apps Script) — sauvegarde distante des scores à chaque fin de partie

## Lancer le projet

```bash
cd /Users/guimgn/Studio/Ninja-Rocket
npx serve .
# → http://localhost:3000
```

> ⚠️ Requis : serveur HTTP (pas `file://`) — MediaPipe et ES modules exigent HTTPS ou localhost.

## Structure

```
index.html                  Point d'entrée — audio, vidéo, canvas
assets/
  audio/nr-gaming-zone.mp3  Musique de fond
  bg/nr-bghome.png          Fond pendant la partie
  bg/nr-bghome.webp         Fond optimisé (menu + game over)
  bg/nr-bghome.mp4          Vidéo de fond (menu + game over)
  sprites/                  Membres + objets tech + monstres + bonus
  ui/nr-logo.png            Logo Ninja Rocket
src/
  main.js                   Config Phaser + gestion musique + vidéo de fond
  HandTracker.js            Suivi du doigt via MediaPipe (EMA + vélocité)
  scenes/
    BootScene.js            Chargement assets + génération textures procédurales
    MenuScene.js            Menu principal, sélecteur caméra, classement
    GameScene.js            Boucle de jeu, HUD, combo, countdown
    GameOverScene.js        Score final, saisie prénom, navigation
  utils/
    SliceDetector.js        Détection de tranche + trail Bézier
    SpawnManager.js         Spawn et trajectoires paraboliques des objets
    AudioManager.js         Sons procéduraux via Web Audio API
    Leaderboard.js          Scores localStorage + envoi vers Google Sheets
```

## Objets en jeu

| Sprite | Type | Points |
|---|---|---|
| Camille, Damien, Guillaume, JC, Lolo, Mathilde, Nina, Romain, Sandrine | Membres (combinaison spatiale) | +30 pts |
| Laptop | Tech | +15 pts |
| Clavier, Café | Tech | +10 pts |
| Câble HDMI | Tech | +5 pts |
| Monstre (×3 variantes) | Malus | −20 pts |
| Bonus | Bonus rare | +100 pts |

**Combo** : 3 tranches → ×2 · 6 tranches → ×3  
**Durée** : 60 secondes  
**Bonus** : 3 maximum par partie, plus petit et plus rapide

## Ajouter un membre

1. Déposer le PNG dans `assets/sprites/`
2. Ajouter `this.load.image('nr-prenom', 'assets/sprites/nr-prenom.png')` dans `BootScene.preload()`
3. Ajouter `{ key: 'nr-prenom', points: 30, isMember: true, isMalus: false, isBonus: false, weight: 1 }` dans `SpawnManager.objectTypes`

## Google Sheets — Classement distant

Les scores sont envoyés automatiquement à chaque fin de partie vers :  
[Classement Google Sheets](https://docs.google.com/spreadsheets/d/14zMwgpzTE5ZRcpyvcwjzHq2NGv32K4CGkQ8bxFHFRUQ/edit?usp=sharing)

Le point d'entrée est un **Google Apps Script** déployé en Web App (voir `CHANGELOG.md` pour les instructions de déploiement).  
L'URL du script est configurée dans `src/utils/Leaderboard.js` — constante `SHEETS_ENDPOINT`.
