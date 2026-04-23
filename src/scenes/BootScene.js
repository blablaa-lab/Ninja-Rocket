// src/scenes/BootScene.js
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('nr-logo',     'assets/ui/nr-logo.png');
    this.load.image('nr-bghome',   'assets/bg/nr-bghome.png');
    this.load.image('nr-frame',    'assets/bg/nr-bghome.webp');
    this.load.image('nr-guigui2',  'assets/sprites/nr-guigui2.png');
    this.load.image('nr-camille2', 'assets/sprites/nr-camille2.png');
    this.load.image('nr-jc2',      'assets/sprites/nr-jc2.png');
    this.load.image('nr-nina2',    'assets/sprites/nr-nina2.png');
    this.load.image('nr-lolo2',    'assets/sprites/nr-lolo2.png');
    this.load.image('nr-monster1', 'assets/sprites/nr-monster1.png');
    this.load.image('nr-monster2', 'assets/sprites/nr-monster2.png');
    this.load.image('nr-monster3', 'assets/sprites/nr-monster3.png');
    this.load.image('nr-bonus',    'assets/sprites/nr-bonus.png');
    this.load.image('nr-assets-1', 'assets/sprites/nr-assets-1.webp');
    this.load.image('nr-assets-2', 'assets/sprites/nr-assets-2.webp');
    this.load.image('nr-assets-3', 'assets/sprites/nr-assets-3.webp');
    this.load.image('nr-assets-4', 'assets/sprites/nr-assets-4.webp');
    this.load.image('nr-camille',  'assets/sprites/nr-camille.png');
    this.load.image('nr-damien',   'assets/sprites/nr-damien.png');
    this.load.image('nr-guillaume','assets/sprites/nr-guillaume.png');
    this.load.image('nr-jc',       'assets/sprites/nr-jc.png');
    this.load.image('nr-lolo',     'assets/sprites/nr-lolo.png');
    this.load.image('nr-mathilde', 'assets/sprites/nr-mathilde.png');
    this.load.image('nr-nina',     'assets/sprites/nr-nina.png');
    this.load.image('nr-romain',   'assets/sprites/nr-romain.png');
    this.load.image('nr-sandrine', 'assets/sprites/nr-sandrine.png');
  }

  create() {
    this._generateTextures();
    this.scene.start('MenuScene');
  }

  _generateTextures() {
    const g = this.add.graphics();

    // ── SPRITES (objets qui volent) — les membres (nr-sandrine/nina/damien)
    // et les objets tech (nr-assets-1..4) sont chargés via preload() ──────

    // rocket — fusée jaune pointue vers le haut (inutilisé mais conservé comme fallback)
    g.clear();
    g.fillStyle(0xFFD54F, 1);
    g.fillTriangle(40, 0, 0, 80, 80, 80);
    g.fillStyle(0xFFA000, 1);
    g.fillRect(0, 70, 80, 20); // corps
    g.fillStyle(0xFF8F00, 1);
    g.fillTriangle(0, 70, -10, 100, 20, 100); // aileron gauche
    g.fillTriangle(80, 70, 90, 100, 60, 100); // aileron droit
    g.generateTexture('rocket', 90, 100);

    // satellite — corps gris + panneaux solaires
    g.clear();
    g.fillStyle(0xB0BEC5, 1);
    g.fillRect(28, 28, 32, 44); // corps central
    g.fillStyle(0x546E7A, 1);
    g.fillRect(0, 36, 26, 28);  // panneau gauche
    g.fillRect(62, 36, 26, 28); // panneau droit
    g.fillStyle(0x78909C, 1);
    g.fillRect(2, 38, 22, 24);
    g.fillRect(64, 38, 22, 24);
    g.generateTexture('satellite', 90, 100);

    // meteorite — ellipse marron avec cratère
    g.clear();
    g.fillStyle(0xA1887F, 1);
    g.fillEllipse(45, 45, 80, 70);
    g.fillStyle(0x8D6E63, 1);
    g.fillEllipse(30, 32, 24, 18); // cratère principal
    g.fillEllipse(55, 50, 14, 10); // petit cratère
    g.generateTexture('meteorite', 90, 90);

    // bomb — cercle rouge avec mèche et étincelle
    g.clear();
    g.fillStyle(0xEF5350, 1);
    g.fillCircle(40, 50, 36);
    g.fillStyle(0x333333, 1);
    g.fillRect(37, 12, 6, 16); // mèche
    g.fillStyle(0xFFEB3B, 1);
    g.fillCircle(40, 10, 7);   // étincelle
    g.fillStyle(0xFF6F00, 1);
    g.fillCircle(40, 10, 4);
    g.generateTexture('bomb', 80, 90);

    // ── UI ───────────────────────────────────────────────────────────

    // star — étoile 5 branches
    g.clear();
    g.fillStyle(0xFFEB3B, 1);
    this._drawStar(g, 24, 24, 5, 22, 10);
    g.generateTexture('star', 48, 48);

    // ── FOND SPATIAL ─────────────────────────────────────────────────

    g.clear();
    const W = this.scale.width;
    const H = this.scale.height;

    // Dégradé vertical simulé : violet foncé (#1A0033) → noir (#000000)
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(26 * (1 - t));
      const b = Math.round(51 * (1 - t));
      const color = (r << 16) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, Math.round((H / steps) * i), W, Math.ceil(H / steps) + 1);
    }

    // Étoiles ponctuelles
    g.fillStyle(0xffffff, 0.9);
    const starSeeds = [
      [0.07, 0.04], [0.18, 0.11], [0.32, 0.07], [0.51, 0.02],
      [0.68, 0.09], [0.82, 0.05], [0.93, 0.15], [0.12, 0.22],
      [0.44, 0.18], [0.76, 0.20], [0.88, 0.31], [0.03, 0.38],
      [0.25, 0.42], [0.58, 0.35], [0.72, 0.48], [0.90, 0.55],
      [0.15, 0.60], [0.38, 0.65], [0.62, 0.70], [0.80, 0.75],
      [0.10, 0.80], [0.50, 0.85], [0.95, 0.82], [0.30, 0.92],
    ];
    starSeeds.forEach(([fx, fy]) => {
      const sx = Math.round(fx * W);
      const sy = Math.round(fy * H);
      g.fillRect(sx - 1, sy - 1, 2, 2);
    });

    // Quelques étoiles plus brillantes (3px)
    [[0.22, 0.15], [0.65, 0.08], [0.48, 0.55], [0.85, 0.40]].forEach(([fx, fy]) => {
      g.fillStyle(0xffffff, 1);
      g.fillRect(Math.round(fx * W) - 1, Math.round(fy * H) - 1, 3, 3);
    });

    g.generateTexture('bg-space', W, H);

    // Nettoyage
    g.destroy();
  }

  // Dessine une étoile à N branches sur un objet Graphics
  _drawStar(graphics, cx, cy, points, outerR, innerR) {
    const step = Math.PI / points;
    graphics.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
    graphics.closePath();
    graphics.fillPath();
  }
}
