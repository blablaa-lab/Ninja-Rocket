# Changelog — Space Ninja / Ninja Rocket

---

## [Unreleased] — 2026-04-24

### Ajouté
- **Classement Google Sheets** : à chaque fin de partie, le score et le prénom sont envoyés en arrière-plan vers un Google Sheet distant via Google Apps Script (aucun impact sur le gameplay en cas d'échec réseau).

### Modifié
- `src/utils/Leaderboard.js` : ajout de `_sendToSheets()` + constante `SHEETS_ENDPOINT`

### Supprimé
- Bouton **"Effacer les scores"** retiré du classement (MenuScene) — les scores distants font foi

---

## [1.3.0] — 2026-04-23

### Corrigé
- **Bug écran figé** pendant la partie : correction dans `HandTracker.js` (gestion robuste des frames MediaPipe) et ajustement de la boucle dans `GameScene.js`

---

## [1.2.0] — 2026-04-23

### Ajouté
- Nouveaux sprites v2 pour les personnages apparaissant dans les écrans Menu et Game Over : Camille, Guillaume, JC, Lolo, Nina
- **Monstres** (3 variantes `nr-monster1/2/3`) — malus −20 pts
- **Objet bonus** (`nr-bonus`) — +100 pts, max 3 par partie, plus petit et rapide
- Fond optimisé `.webp` (`nr-bghome.webp`)

### Modifié
- `GameOverScene.js` : refonte de la mise en page et des personnages décoratifs
- `GameScene.js` : intégration des monstres (malus) et de la logique bonus, difficulté progressive
- `MenuScene.js` : personnages décoratifs mis à jour avec les sprites v2
- `SpawnManager.js` : ajout des types malus et bonus, système de poids affiné, difficulté progressive

---

## [1.1.0] — 2026-04-23

### Modifié
- `SpawnManager.js` : rééquilibrage des taux de spawn et des trajectoires paraboliques

---

## [1.0.1] — 2026-04-23

### Ajouté
- Nouveaux membres : Camille, Guillaume, JC, Lolo, Mathilde, Romain (sprites PNG optimisés)
- Membres existants (Damien, Nina, Sandrine) : sprites remplacés par des versions allégées

---

## [1.0.0] — 2026-04-23

### Ajouté
- Version initiale du jeu : moteur Phaser 3.60, suivi MediaPipe Hands, scènes Boot / Menu / Game / GameOver
- Classement local (localStorage, top 10)
- Sélecteur de caméra dans le menu
- Musique de fond + sons procéduraux (Web Audio API)
- Personnages membres de la team Ninja Rocket (combinaisons spatiales)
- Objets tech : laptop, clavier, café, câble HDMI
- Système de combo ×2 / ×3
- Durée de partie : 60 secondes
