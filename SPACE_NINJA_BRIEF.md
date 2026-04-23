# Space Ninja — Brief projet complet pour Claude Code

## Contexte
Jeu de type Fruit Ninja aux couleurs de Werocket (agence web, ~10 personnes).
Ambiance station spatiale. Les membres de l'équipe sont des astronautes vectoriels (sprites Figma PNG fond transparent).
Le joueur tranche les objets avec **son doigt capté par la webcam** (MediaPipe Hands).
Leaderboard entre collègues via localStorage.
Cible : navigateur desktop, webcam intégrée.

---

## Stack technique

| Brique | Choix | Chargement |
|---|---|---|
| Game engine | Phaser 3.60 | CDN jsDelivr |
| Hand tracking | MediaPipe Hands 0.4 | CDN unpkg |
| Assets | PNG exportés depuis Figma | dossier local `assets/` |
| Persistence | localStorage natif | — |

Aucun serveur requis. Tout statique, déployable sur Vercel/Netlify ou intranet.

---

## Structure de fichiers

```
space-ninja/
├── index.html
├── assets/
│   ├── sprites/
│   │   ├── astronaut-alice.png      ← membres de l'équipe (PNG @2x, fond transparent)
│   │   ├── astronaut-bob.png
│   │   ├── ... (8 au total)
│   │   ├── rocket.png               ← objets bonus
│   │   ├── satellite.png
│   │   ├── meteorite.png
│   │   ├── bomb.png                 ← malus (ne pas trancher)
│   │   ├── slice-left.png           ← moitiés post-tranche pour chaque sprite
│   │   └── slice-right.png
│   ├── ui/
│   │   ├── logo-werocket.png
│   │   ├── heart.png                ← vies
│   │   └── star.png                 ← score combo
│   ├── bg/
│   │   └── space-station.png        ← fond 1920×1080
│   └── audio/
│       ├── swoosh.mp3
│       ├── slice.mp3
│       ├── bomb.mp3
│       └── ambient.mp3
└── src/
    ├── main.js                      ← config Phaser + boot
    ├── HandTracker.js               ← wrapper MediaPipe
    ├── scenes/
    │   ├── BootScene.js
    │   ├── MenuScene.js
    │   ├── GameScene.js
    │   └── GameOverScene.js
    └── utils/
        ├── SliceDetector.js
        ├── SpawnManager.js
        └── Leaderboard.js
```

---

## index.html (structure de base)

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Space Ninja — Werocket</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    #game-container { position: relative; width: 100vw; height: 100vh; }
    #webcam-overlay {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      opacity: 0.15;           /* preview webcam en filigrane */
      transform: scaleX(-1);   /* miroir pour que ça soit naturel */
      pointer-events: none;
    }
    #slice-canvas {
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="game-container">
    <video id="webcam-overlay" autoplay playsinline muted></video>
    <canvas id="slice-canvas"></canvas>
    <!-- Phaser injecte son canvas ici -->
  </div>

  <!-- CDN -->
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>

  <script type="module" src="src/main.js"></script>
</body>
</html>
```

---

## HandTracker.js — wrapper MediaPipe

```javascript
// src/HandTracker.js
export class HandTracker {
  constructor(videoElement, onFingerMove) {
    this.onFingerMove = onFingerMove;
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,       // 0 = lite, plus rapide
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults((results) => this._onResults(results));

    this.camera = new Camera(videoElement, {
      onFrame: async () => { await this.hands.send({ image: videoElement }); },
      width: 640,
      height: 480
    });
    this.camera.start();
  }

  _onResults(results) {
    if (!results.multiHandLandmarks?.length) return;
    const landmarks = results.multiHandLandmarks[0];
    // Point 8 = bout de l'index
    const tip = landmarks[8];
    // Coordonnées normalisées 0..1 → pixels écran (miroir horizontal)
    const x = (1 - tip.x) * window.innerWidth;
    const y = tip.y * window.innerHeight;
    this.onFingerMove(x, y);
  }

  destroy() {
    this.camera.stop();
  }
}
```

---

## SliceDetector.js — détection du geste de tranche

```javascript
// src/utils/SliceDetector.js
export class SliceDetector {
  constructor() {
    this.history = [];           // trail des 8 dernières positions
    this.MAX_HISTORY = 8;
    this.MIN_VELOCITY = 18;      // px/frame min pour déclencher un slice
    this.trailPoints = [];       // pour dessiner le trait sur le canvas
  }

  update(x, y) {
    this.history.push({ x, y, t: performance.now() });
    if (this.history.length > this.MAX_HISTORY) this.history.shift();
    this.trailPoints = [...this.history];
  }

  // Retourne { isSlicing, start, end } ou null
  getSlice() {
    if (this.history.length < 3) return null;
    const recent = this.history.slice(-4);
    const dx = recent[recent.length - 1].x - recent[0].x;
    const dy = recent[recent.length - 1].y - recent[0].y;
    const velocity = Math.sqrt(dx * dx + dy * dy);
    if (velocity < this.MIN_VELOCITY) return null;
    return {
      isSlicing: true,
      start: { x: recent[0].x, y: recent[0].y },
      end: { x: recent[recent.length - 1].x, y: recent[recent.length - 1].y },
      velocity
    };
  }

  // Dessine le trail sur un canvas 2D overlay
  drawTrail(ctx, width, height) {
    if (this.trailPoints.length < 2) return;
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.trailPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.clearRect(0, 0, width, height); // clear après draw pour next frame
  }
}
```

---

## SpawnManager.js — trajectoires paraboliques

```javascript
// src/utils/SpawnManager.js
export class SpawnManager {
  constructor(scene) {
    this.scene = scene;
    this.spawnDelay = 1200;      // ms entre chaque spawn
    this.spawnTimer = 0;
    this.difficultyStep = 30000; // augmente la difficulté toutes les 30s

    // Types d'objets avec leur poids de spawn
    this.objectTypes = [
      { key: 'astronaut-alice', points: 10, isBomb: false, weight: 3 },
      { key: 'astronaut-bob',   points: 10, isBomb: false, weight: 3 },
      { key: 'rocket',          points: 15, isBomb: false, weight: 2 },
      { key: 'satellite',       points: 20, isBomb: false, weight: 2 },
      { key: 'meteorite',       points: 5,  isBomb: false, weight: 4 },
      { key: 'bomb',            points: -1, isBomb: true,  weight: 1 },
    ];
  }

  update(delta, elapsed) {
    this.spawnTimer += delta;
    // Augmenter la difficulté avec le temps
    const difficulty = Math.floor(elapsed / this.difficultyStep);
    const currentDelay = Math.max(400, this.spawnDelay - difficulty * 100);

    if (this.spawnTimer >= currentDelay) {
      this.spawnTimer = 0;
      const count = Phaser.Math.Between(1, Math.min(3, 1 + difficulty));
      for (let i = 0; i < count; i++) {
        this._spawnOne();
      }
    }
  }

  _spawnOne() {
    const type = this._weightedRandom();
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -60 : this.scene.scale.width + 60;
    const startY = Phaser.Math.Between(
      this.scene.scale.height * 0.5,
      this.scene.scale.height + 20
    );
    const targetX = fromLeft
      ? Phaser.Math.Between(200, this.scene.scale.width * 0.8)
      : Phaser.Math.Between(this.scene.scale.width * 0.2, this.scene.scale.width - 200);
    const targetY = Phaser.Math.Between(100, this.scene.scale.height * 0.45);
    const duration = Phaser.Math.Between(900, 1400);

    const obj = this.scene.physics.add.image(startX, startY, type.key);
    obj.setScale(0.5);
    obj.gameData = type;

    // Trajectoire parabolique via tween
    this.scene.tweens.add({
      targets: obj,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Retombe sous gravité
        this.scene.tweens.add({
          targets: obj,
          y: this.scene.scale.height + 100,
          duration: duration * 1.2,
          ease: 'Sine.easeIn',
          onComplete: () => {
            if (obj.active) {
              // Objet non tranché = perd une vie (sauf bombe)
              if (!type.isBomb) {
                this.scene.events.emit('missedObject');
              }
              obj.destroy();
            }
          }
        });
      }
    });

    // Rotation pendant le vol
    this.scene.tweens.add({
      targets: obj,
      angle: fromLeft ? 360 : -360,
      duration: duration * 2,
      ease: 'Linear'
    });

    this.scene.activeObjects = this.scene.activeObjects || [];
    this.scene.activeObjects.push(obj);
  }

  _weightedRandom() {
    const total = this.objectTypes.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of this.objectTypes) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return this.objectTypes[0];
  }
}
```

---

## Leaderboard.js — scores localStorage

```javascript
// src/utils/Leaderboard.js
const KEY = 'spaceninja_scores';

export function saveScore(name, score) {
  const scores = getScores();
  scores.push({ name, score, date: Date.now() });
  scores.sort((a, b) => b.score - a.score);
  const top10 = scores.slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(top10));
  return top10;
}

export function getScores() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
```

---

## GameScene.js — logique principale (squelette)

```javascript
// src/scenes/GameScene.js
import { HandTracker } from '../HandTracker.js';
import { SliceDetector } from '../utils/SliceDetector.js';
import { SpawnManager } from '../utils/SpawnManager.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.score = 0;
    this.lives = 3;
    this.elapsed = 0;
    this.activeObjects = [];

    // Fond
    this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'bg-space'
    ).setDisplaySize(this.scale.width, this.scale.height);

    // UI
    this._createHUD();

    // Systèmes
    this.spawnManager = new SpawnManager(this);
    this.sliceDetector = new SliceDetector();

    // Canvas overlay pour le trait
    this.sliceCanvas = document.getElementById('slice-canvas');
    this.sliceCanvas.width = window.innerWidth;
    this.sliceCanvas.height = window.innerHeight;
    this.sliceCtx = this.sliceCanvas.getContext('2d');

    // Hand tracking
    const video = document.getElementById('webcam-overlay');
    this.handTracker = new HandTracker(video, (x, y) => {
      this.sliceDetector.update(x, y);
      this._checkSlices(x, y);
    });

    // Événements
    this.events.on('missedObject', () => this._loseLife());
  }

  update(time, delta) {
    this.elapsed += delta;
    this.spawnManager.update(delta, this.elapsed);

    // Dessiner le trail
    const slice = this.sliceDetector.getSlice();
    if (slice) {
      this._drawTrail();
    } else {
      this.sliceCtx.clearRect(0, 0, this.sliceCanvas.width, this.sliceCanvas.height);
    }
  }

  _checkSlices(fingerX, fingerY) {
    const slice = this.sliceDetector.getSlice();
    if (!slice) return;

    this.activeObjects = this.activeObjects.filter(obj => {
      if (!obj.active) return false;
      const dist = Phaser.Math.Distance.Between(fingerX, fingerY, obj.x, obj.y);
      const radius = (obj.displayWidth / 2) * 0.8;
      if (dist < radius) {
        if (obj.gameData.isBomb) {
          this._loseLife();
          this._explodeBomb(obj);
        } else {
          this._sliceObject(obj);
        }
        return false;
      }
      return true;
    });
  }

  _sliceObject(obj) {
    this.score += obj.gameData.points;
    this._updateScore();
    // Effets : particules + son + split visuel
    this._spawnParticles(obj.x, obj.y);
    this.sound.play('slice');
    obj.destroy();
  }

  _loseLife() {
    this.lives--;
    this._updateLives();
    this.cameras.main.shake(200, 0.01);
    if (this.lives <= 0) {
      this.handTracker.destroy();
      this.scene.start('GameOverScene', { score: this.score });
    }
  }

  _explodeBomb(obj) {
    this.sound.play('bomb');
    // TODO : effet explosion (particules rouges)
    obj.destroy();
  }

  _drawTrail() {
    const pts = this.sliceDetector.trailPoints;
    if (pts.length < 2) return;
    const ctx = this.sliceCtx;
    ctx.clearRect(0, 0, this.sliceCanvas.width, this.sliceCanvas.height);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(160, 210, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }

  _spawnParticles(x, y) {
    // Phaser 3 particle emitter
    const emitter = this.add.particles(x, y, 'star', {
      speed: { min: 80, max: 200 },
      scale: { start: 0.4, end: 0 },
      lifespan: 500,
      quantity: 12,
      angle: { min: 0, max: 360 }
    });
    this.time.delayedCall(600, () => emitter.destroy());
  }

  _createHUD() {
    // Score
    this.scoreTxt = this.add.text(20, 20, '0', {
      fontSize: '48px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000', strokeThickness: 4
    });

    // Vies (3 coeurs)
    this.heartIcons = [];
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(
        this.scale.width - 60 - i * 50, 40, 'heart'
      ).setScale(0.5);
      this.heartIcons.push(h);
    }
  }

  _updateScore() {
    this.scoreTxt.setText(this.score.toString());
  }

  _updateLives() {
    this.heartIcons.forEach((h, i) => {
      h.setAlpha(i < this.lives ? 1 : 0.2);
    });
  }
}
```

---

## Séquence de build recommandée pour Claude Code

**Étape 1 — Scaffold**
> "Crée la structure de fichiers complète du projet space-ninja selon ce brief. Initialise index.html avec les CDN Phaser 3 et MediaPipe. Crée des placeholders PNG colorés dans assets/ pour pouvoir tester sans les vrais sprites Figma."

**Étape 2 — Hand Tracking seul**
> "Implémente HandTracker.js et affiche juste un point rouge qui suit le bout du doigt index sur le canvas overlay. Pas encore de game, juste valider que MediaPipe fonctionne."

**Étape 3 — Game loop de base**
> "Ajoute Phaser avec un fond noir, SpawnManager qui fait apparaître des carrés colorés sur des trajectoires paraboliques. Pas encore de tranche."

**Étape 4 — Slice detection**
> "Connecte HandTracker à SliceDetector. Quand le doigt se déplace vite et croise un objet, l'objet disparaît avec un flash blanc. Affiche le trail du doigt."

**Étape 5 — Polish de base**
> "Ajoute le score, les 3 vies, l'écran game over avec le score final et un bouton rejouer. Ajoute les bombes (rouge, ne pas trancher)."

**Étape 6 — Leaderboard**
> "Ajoute l'écran de saisie du nom après game over. Sauvegarde en localStorage. Affiche le top 10 sur l'écran menu."

**Étape 7 — Intégration assets Figma**
> "Remplace les placeholders par les vrais sprites PNG. Ajuste les scales. Ajoute les sons."

---

## Points d'attention / pièges à éviter

- **Latence MediaPipe** : `modelComplexity: 0` est obligatoire pour rester à 30fps. Le modèle lite est suffisant.
- **Miroir webcam** : le flux vidéo est naturellement miroir. Appliquer `transform: scaleX(-1)` sur la vidéo ET inverser les coordonnées X dans HandTracker (`x = (1 - tip.x) * window.innerWidth`).
- **CORS webcam** : tester depuis un serveur local (`npx serve .`), pas depuis `file://`. MediaPipe requiert HTTPS ou localhost.
- **Slice vs hover** : ne déclencher le slice que si `velocity > MIN_VELOCITY`. Sinon chaque survol du doigt au-dessus d'un objet le tranche.
- **Nettoyage objets** : bien appeler `obj.destroy()` après chaque tranche/sortie d'écran. Les fuites mémoire sur les particules Phaser se voient vite.
- **localStorage** : préfixer la clé (`spaceninja_scores`) pour éviter les collisions avec d'autres projets sur le même domaine intranet.

---

## Specs assets Figma (à transmettre au designer)

| Asset | Format | Taille canvas | Notes |
|---|---|---|---|
| Astronautes (×8) | PNG | 200×300 px @2x | Fond transparent, personnage centré, marge 20px |
| Moitiés tranchées | PNG | 200×300 px @2x | Moitié gauche + moitié droite, même canvas |
| Fusée | PNG | 160×260 px @2x | Orientée vers le haut |
| Satellite | PNG | 220×220 px @2x | Vue de face |
| Météorite | PNG | 180×180 px @2x | Forme irrégulière OK |
| Bombe | PNG | 160×160 px @2x | Rouge, clairement identifiable |
| Fond station | PNG/JPG | 1920×1080 | Peut être jpg, pas de transparence |
| Coeur (vie) | PNG | 64×64 px @2x | Fond transparent |
| Étoile (particule) | PNG | 32×32 px @2x | Fond transparent |
