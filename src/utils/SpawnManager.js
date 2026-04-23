// src/utils/SpawnManager.js
export class SpawnManager {
  constructor(scene) {
    this.scene       = scene;
    this.spawnDelay  = 1200;
    this.spawnTimer  = 0;
    this.difficultyStep = 20000;

    this.objectTypes = [
      { key: 'nr-camille',  points: 30, isMember: true, weight: 1 },
      { key: 'nr-damien',   points: 30, isMember: true, weight: 1 },
      { key: 'nr-guillaume',points: 30, isMember: true, weight: 1 },
      { key: 'nr-jc',       points: 30, isMember: true, weight: 1 },
      { key: 'nr-lolo',     points: 30, isMember: true, weight: 1 },
      { key: 'nr-mathilde', points: 30, isMember: true, weight: 1 },
      { key: 'nr-nina',     points: 30, isMember: true, weight: 1 },
      { key: 'nr-romain',   points: 30, isMember: true, weight: 1 },
      { key: 'nr-sandrine', points: 30, isMember: true, weight: 1 },
      { key: 'nr-assets-1', points: 10, isMember: false, weight: 5 }, // clavier
      { key: 'nr-assets-2', points: 5,  isMember: false, weight: 5 }, // câble HDMI
      { key: 'nr-assets-3', points: 15, isMember: false, weight: 5 }, // laptop
      { key: 'nr-assets-4', points: 10, isMember: false, weight: 5 }, // café
    ];

    // Groupe physique avec collision interne
    this.group = scene.physics.add.group();
    scene.physics.add.collider(this.group, this.group);
  }

  update(delta, elapsed) {
    this.spawnTimer += delta;
    const difficulty   = Math.floor(elapsed / this.difficultyStep);
    const currentDelay = Math.max(400, this.spawnDelay - difficulty * 100);

    if (this.spawnTimer >= currentDelay) {
      this.spawnTimer = 0;
      const count = Phaser.Math.Between(1, Math.min(3, 1 + difficulty));
      for (let i = 0; i < count; i++) {
        this.scene.time.delayedCall(i * 300, () => {
          if (!this.scene.scene.isActive('GameScene')) return;
          this._spawnOne();
        });
      }
    }

    // Nettoyer les objets qui ont quitté l'écran (tous les bords)
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const M = 160; // marge
    ;(this.scene.activeObjects || []).forEach(obj => {
      if (!obj.active) return;
      if (obj.x < -M || obj.x > W + M || obj.y < -M || obj.y > H + M) obj.destroy();
    });
  }

  _spawnOne() {
    const type = this._weightedRandom();
    const W    = this.scene.scale.width;
    const H    = this.scene.scale.height;

    // ── Bord de spawn aléatoire ──────────────────────────────────────
    const edge = Phaser.Math.Between(0, 3); // 0=haut 1=bas 2=gauche 3=droite
    let startX, startY;
    switch (edge) {
      case 0: startX = Phaser.Math.FloatBetween(0, W); startY = -80;    break; // haut
      case 1: startX = Phaser.Math.FloatBetween(0, W); startY = H + 80; break; // bas
      case 2: startX = -80;    startY = Phaser.Math.FloatBetween(0, H); break; // gauche
      case 3: startX = W + 80; startY = Phaser.Math.FloatBetween(0, H); break; // droite
    }

    // ── Direction vers la zone centrale de l'écran ───────────────────
    const targetX = Phaser.Math.FloatBetween(W * 0.15, W * 0.85);
    const targetY = Phaser.Math.FloatBetween(H * 0.15, H * 0.85);
    const angle   = Math.atan2(targetY - startY, targetX - startX);

    // ── Vitesse croissante avec la difficulté ────────────────────────
    const difficulty = Math.floor(this.scene.elapsed / this.difficultyStep);
    const minSpeed   = Math.min(180 + difficulty * 30, 400);
    const maxSpeed   = Math.min(420 + difficulty * 50, 800);
    const speed      = Phaser.Math.Between(minSpeed, maxSpeed);
    const vx    = Math.cos(angle) * speed;
    const vy    = Math.sin(angle) * speed;

    // ── Légère courbe aléatoire (accélération perpendiculaire) ───────
    const curve = Phaser.Math.Between(-90, 90);
    const ax    = Math.cos(angle + Math.PI / 2) * curve;
    const ay    = Math.sin(angle + Math.PI / 2) * curve;

    // ── Création de l'objet ──────────────────────────────────────────
    const obj    = this.group.create(startX, startY, type.key);
    const targetH = Math.round(H * (type.isMember ? 0.28 : 0.12));
    const scale  = targetH / obj.height;
    obj.setScale(scale);

    // Corps physique : dims originales × scale appliqué par Phaser
    obj.body.setSize(obj.width * 0.80, obj.height * 0.80, true);
    obj.body.setAllowGravity(false);

    obj.setVelocity(vx, vy);
    obj.setAcceleration(ax, ay);
    obj.setAngularVelocity(Phaser.Math.Between(-150, 150));
    obj.setBounce(0.25);
    obj.gameData = type;

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
