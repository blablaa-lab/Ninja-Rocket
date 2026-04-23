// src/scenes/MenuScene.js
import { getScores }   from '../utils/Leaderboard.js';
import { HandTracker }              from '../HandTracker.js';
import { showBgVideo, hideBgVideo, startMusic } from '../main.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    showBgVideo();
    // Pas d'overlay sombre sur le menu — la vidéo s'affiche à pleine luminosité
    document.getElementById('bg-overlay').classList.remove('visible');
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this._build();

    // Rebuild complet sur redimensionnement
    this.scale.on('resize', this._onResize, this);
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
  }

  _onResize() {
    // Détruire tous les objets de la scène et reconstruire
    this.children.removeAll(true);
    this._camLabel = null;
    this._build();
  }

  _build() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Panneau central ───────────────────────────────────────────────
    const panelW = Math.min(W * 0.62, 780);
    const panelH = H * 0.76;
    const panel  = this.add.graphics();
    panel.fillStyle(0x000814, 0.72);
    panel.fillRoundedRect(W / 2 - panelW / 2, H * 0.06, panelW, panelH, 18);
    panel.lineStyle(1, 0x1a3a5c, 0.6);
    panel.strokeRoundedRect(W / 2 - panelW / 2, H * 0.06, panelW, panelH, 18);

    // ── Logo ──────────────────────────────────────────────────────────
    const logoW = panelW * 0.72;
    const logoH = logoW * (768 / 1376);
    const logo  = this.add.image(W / 2, H * 0.155, 'nr-logo')
      .setDisplaySize(logoW, logoH)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.85);

    this.tweens.add({
      targets: logo, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 400, ease: 'Back.easeOut'
    });

    // ── Bouton JOUER ──────────────────────────────────────────────────
    const btn = this.add.text(W / 2, H * 0.30, '[ JOUER ]', {
      fontSize: `${Math.round(H * 0.065)}px`, fontFamily: 'monospace',
      color: '#ffffff', stroke: '#4FC3F7', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#4FC3F7'));
    btn.on('pointerout',  () => btn.setColor('#ffffff'));
    btn.on('pointerdown', () => {
      startMusic();
      hideBgVideo();
      const deviceId = HandTracker.getSavedDeviceId();
      this.scene.start('GameScene', { deviceId });
    });

    this.tweens.add({
      targets: btn, scaleX: 1.05, scaleY: 1.05,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // ── Règle ─────────────────────────────────────────────────────────
    const panelW2 = Math.min(W * 0.62, 780);
    this.add.text(W / 2, H * 0.375, '60 s  ·  Membres = +30 pts  ·  Combo = ×2/×3', {
      fontSize: `${Math.round(H * 0.017)}px`, fontFamily: 'monospace',
      color: '#78909C', align: 'center',
      wordWrap: { width: panelW2 * 0.88 }
    }).setOrigin(0.5);

    // ── Sélecteur de caméra ───────────────────────────────────────────
    this._buildCameraSelector(W, H);

    // ── Leaderboard ───────────────────────────────────────────────────
    this._buildLeaderboard(W, H);

    // ── Personnages gauche / droite (par-dessus le panneau) ───────────
    const charH    = H * 0.62;
    const panelEdgeL = W / 2 - panelW / 2;
    const panelEdgeR = W / 2 + panelW / 2;

    const guigui = this.add.image(panelEdgeL - panelW * 0.12, H, 'nr-guigui2')
      .setOrigin(0.5, 1)
      .setDepth(20);
    guigui.setScale(charH / guigui.height);

    const camille = this.add.image(panelEdgeR + panelW * 0.12, H, 'nr-camille2')
      .setOrigin(0.5, 1)
      .setDepth(20);
    camille.setScale(charH / camille.height);
  }

  // ── Sélecteur de caméra ───────────────────────────────────────────

  _buildCameraSelector(W, H) {
    const y      = H * 0.435;
    const fSm    = `${Math.round(H * 0.014)}px`;
    const fMd    = `${Math.round(H * 0.015)}px`;
    const panelW = Math.min(W * 0.62, 780);
    // Flèches ancrées aux bords intérieurs du panneau
    const arrowX = panelW * 0.44;

    this.add.text(W / 2, y, 'CAMÉRA', {
      fontSize: fSm, fontFamily: 'monospace', color: '#546E7A', align: 'center'
    }).setOrigin(0.5);

    // Label sur une seule ligne, centré entre les flèches
    this._camLabel = this.add.text(W / 2, y + H * 0.032, '…', {
      fontSize: fMd, fontFamily: 'monospace', color: '#B3E5FC', align: 'center'
    }).setOrigin(0.5);

    const arrowStyle = { fontSize: `${Math.round(H * 0.024)}px`, fontFamily: 'monospace', color: '#4FC3F7' };
    const prev = this.add.text(W / 2 - arrowX, y + H * 0.032, '◀', arrowStyle)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    const next = this.add.text(W / 2 + arrowX, y + H * 0.032, '▶', arrowStyle)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });

    prev.on('pointerover', () => prev.setColor('#ffffff'));
    prev.on('pointerout',  () => prev.setColor('#4FC3F7'));
    next.on('pointerover', () => next.setColor('#ffffff'));
    next.on('pointerout',  () => next.setColor('#4FC3F7'));

    this._cameras  = this._cameras  || [];
    this._camIndex = this._camIndex || 0;

    // Si on a déjà énuméré les caméras (rebuild après resize), on les réaffiche directement
    if (this._cameras.length > 0) {
      this._updateCamLabel();
      if (this._cameras.length <= 1) { prev.setVisible(false); next.setVisible(false); }
      else {
        prev.on('pointerdown', () => { this._camIndex = (this._camIndex - 1 + this._cameras.length) % this._cameras.length; this._updateCamLabel(); });
        next.on('pointerdown', () => { this._camIndex = (this._camIndex + 1) % this._cameras.length; this._updateCamLabel(); });
      }
      return;
    }

    HandTracker.getDevices().then(devices => {
      if (devices.length === 0) { this._camLabel?.setText('Aucune caméra détectée'); return; }
      this._cameras = devices;
      const saved   = HandTracker.getSavedDeviceId();
      const idx     = devices.findIndex(d => d.deviceId === saved);
      this._camIndex = idx >= 0 ? idx : 0;
      this._updateCamLabel();

      if (devices.length <= 1) { prev.setVisible(false); next.setVisible(false); return; }

      prev.on('pointerdown', () => { this._camIndex = (this._camIndex - 1 + this._cameras.length) % this._cameras.length; this._updateCamLabel(); });
      next.on('pointerdown', () => { this._camIndex = (this._camIndex + 1) % this._cameras.length; this._updateCamLabel(); });
    }).catch(() => { this._camLabel?.setText('Permission refusée'); });
  }

  _updateCamLabel() {
    const cam = this._cameras[this._camIndex];
    if (!cam || !this._camLabel) return;
    const label = cam.label.length > 22 ? cam.label.slice(0, 21) + '…' : cam.label;
    this._camLabel.setText(label);
    HandTracker.saveDeviceId(cam.deviceId);
  }

  // ── Leaderboard ───────────────────────────────────────────────────

  _buildLeaderboard(W, H) {
    const scores  = getScores();
    const panelW  = Math.min(W * 0.62, 780);
    const startY  = H * 0.495;
    const fSm     = `${Math.round(H * 0.015)}px`;
    const fMd     = `${Math.round(H * 0.020)}px`;

    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0x1a3a5c, 0.8);
    sepG.beginPath();
    sepG.moveTo(W / 2 - panelW * 0.4, startY);
    sepG.lineTo(W / 2 + panelW * 0.4, startY);
    sepG.strokePath();

    this.add.text(W / 2, startY + H * 0.012, 'CLASSEMENT', {
      fontSize: fSm, fontFamily: 'monospace', color: '#4FC3F7', align: 'center'
    }).setOrigin(0.5);

    if (scores.length === 0) {
      this.add.text(W / 2, startY + H * 0.05, 'Aucun score — lancez une partie !', {
        fontSize: fMd, fontFamily: 'monospace', color: '#546E7A', align: 'center'
      }).setOrigin(0.5);
      return;
    }

    const medals  = ['🥇', '🥈', '🥉'];
    const colors  = ['#FFD54F', '#B0BEC5', '#FFAB76'];
    const rowH    = Math.round(H * 0.048);
    const tableW  = panelW * 0.88;
    const maxRows = Math.min(scores.length, 7); // 7 lignes max pour tenir dans l'écran
    const tableX  = W / 2;
    const tableY  = startY + H * 0.03;

    scores.slice(0, maxRows).forEach((entry, i) => {
      const y     = tableY + i * rowH + rowH / 2;
      const medal = medals[i] ?? `${i + 1}.`;
      const color = colors[i] ?? '#607D8B';
      const left  = tableX - tableW / 2 + 16;
      const right = tableX + tableW / 2 - 16;

      if (i % 2 === 0) {
        this.add.rectangle(tableX, y, tableW, rowH, 0xffffff, 0.04).setOrigin(0.5);
      }

      this.add.text(left + 30, y, medal, { fontSize: fMd, fontFamily: 'monospace', color }).setOrigin(0.5);

      const name = entry.name.length > 18 ? entry.name.slice(0, 17) + '…' : entry.name;
      this.add.text(left + 58, y, name, {
        fontSize: fMd, fontFamily: 'monospace',
        color: '#ffffff', stroke: '#000000', strokeThickness: 2
      }).setOrigin(0, 0.5);

      this.add.text(right, y, `${entry.score} pts`, {
        fontSize: fMd, fontFamily: 'monospace',
        color, stroke: '#000000', strokeThickness: 2
      }).setOrigin(1, 0.5);
    });

  }
}
