// src/scenes/GameOverScene.js
import { saveScore }                          from '../utils/Leaderboard.js';
import { showBgVideo, hideBgVideo, setMusicVolume } from '../main.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore   = data?.score ?? 0;
    this._input       = null;
    this._scoreSaved  = false;
  }

  create() {
    showBgVideo();
    // Pas d'overlay sombre — vidéo à pleine luminosité
    document.getElementById('bg-overlay').classList.remove('visible');
    setMusicVolume(0.40, 800);
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this._build();

    this.scale.on('resize', this._onResize, this);
  }

  shutdown() {
    this.scale.off('resize', this._onResize, this);
    this._cleanupInput();
  }

  _onResize() {
    this.children.removeAll(true);
    this._cleanupInput();
    this._build();
  }

  _build() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Panneau central (même largeur que le menu) ────────────────────
    const panelW = Math.min(W * 0.62, 780);
    const panelH = H * 0.88;
    const panelX = W / 2 - panelW / 2;
    const panelY = H * 0.06;

    const panel = this.add.graphics();
    panel.fillStyle(0x000814, 0.78);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
    panel.lineStyle(1, 0x1a3a5c, 0.6);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);

    // ── Logo (identique au menu) ──────────────────────────────────────
    const logoW = panelW * 0.72;
    const logoH = logoW * (768 / 1376);
    this.add.image(W / 2, H * 0.155, 'nr-logo')
      .setDisplaySize(logoW, logoH)
      .setOrigin(0.5);

    // ── Titre FIN DE PARTIE ───────────────────────────────────────────
    const titleY = H * 0.155 + logoH * 0.65;
    const title  = this.add.text(W / 2, titleY, 'FIN DE PARTIE', {
      fontSize: `${Math.round(H * 0.058)}px`,
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontStyle: 'bold',
      color: '#EF5350', stroke: '#000000', strokeThickness: 6, align: 'center'
    }).setOrigin(0.5).setAlpha(0).setScale(0.7);

    this.tweens.add({
      targets: title, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 400, ease: 'Back.easeOut'
    });

    // ── Score ─────────────────────────────────────────────────────────
    const scoreY = titleY + H * 0.088;
    this.add.text(W / 2, scoreY, `${this.finalScore} pts`, {
      fontSize: `${Math.round(H * 0.050)}px`, fontFamily: 'monospace',
      color: '#FFD54F', stroke: '#000000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5);

    // ── Invite saisie ─────────────────────────────────────────────────
    const inviteY = scoreY + H * 0.075;
    this.add.text(W / 2, inviteY, 'Entrez votre prénom pour le classement :', {
      fontSize: `${Math.round(H * 0.018)}px`, fontFamily: 'monospace',
      color: '#B3E5FC', stroke: '#000000', strokeThickness: 2, align: 'center'
    }).setOrigin(0.5);

    // Input HTML — positionné selon la vraie hauteur calculée
    const inputY = inviteY + H * 0.045;
    this._createNameInput(W, inputY);

    // ── Bouton REJOUER (style identique au bouton JOUER du menu) ─────
    const replayY = inputY + H * 0.115;
    const replayBtn = this.add.text(W / 2, replayY, '[ REJOUER ]', {
      fontSize: `${Math.round(H * 0.048)}px`, fontFamily: 'monospace',
      color: '#ffffff', stroke: '#4FC3F7', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: replayBtn, scaleX: 1.05, scaleY: 1.05,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    replayBtn.on('pointerover', () => replayBtn.setColor('#4FC3F7'));
    replayBtn.on('pointerout',  () => replayBtn.setColor('#ffffff'));
    replayBtn.on('pointerdown', () => {
      if (!this._scoreSaved) {
        const ok = window.confirm('Votre score ne sera pas enregistré dans le classement.\nRejouer quand même ?');
        if (!ok) return;
      }
      hideBgVideo();
      this._cleanupInput();
      this.scene.start('GameScene');
    });

    // ── Bouton MENU (style identique au bouton JOUER, plus petit) ────
    const menuY = replayY + H * 0.075;
    const menuBtn = this.add.text(W / 2, menuY, '[ MENU ]', {
      fontSize: `${Math.round(H * 0.032)}px`, fontFamily: 'monospace',
      color: '#ffffff', stroke: '#4FC3F7', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#4FC3F7'));
    menuBtn.on('pointerout',  () => menuBtn.setColor('#ffffff'));
    menuBtn.on('pointerdown', () => {
      if (!this._scoreSaved) {
        const ok = window.confirm('Votre score ne sera pas enregistré dans le classement.\nRetourner au menu quand même ?');
        if (!ok) return;
      }
      this._cleanupInput();
      showBgVideo();
      this.scene.start('MenuScene');
    });

    // ── Personnages décoratifs (même taille que le menu H×0.62) ──────
    const charH      = H * 0.62;
    const panelEdgeL = W / 2 - panelW / 2;
    const panelEdgeR = W / 2 + panelW / 2;

    // JC — haut droite, plus petit
    const jc = this.add.image(panelEdgeR + panelW * 0.14, H * 0.02, 'nr-jc2')
      .setOrigin(0.5, 0).setDepth(20);
    jc.setScale((charH * 0.55) / jc.height);

    // Nina — droite du container, légèrement plus grande
    const nina = this.add.image(panelEdgeR + panelW * 0.10, H, 'nr-nina2')
      .setOrigin(0.5, 1).setDepth(20);
    nina.setScale((charH * 0.85) / nina.height);

    // Lolo — légèrement décalé à droite
    const lolo = this.add.image(panelEdgeL - panelW * 0.04, H, 'nr-lolo2')
      .setOrigin(0.5, 1).setDepth(20);
    lolo.setScale((charH * 0.72) / lolo.height);
  }

  _createNameInput(W, topPx) {
    // Supprimer l'éventuel input précédent (rebuild après resize)
    this._cleanupInput();

    this._input = document.createElement('input');
    this._input.type        = 'text';
    this._input.placeholder = 'Votre prénom…';
    this._input.maxLength   = 20;

    // Largeur responsive : 30% de la fenêtre, min 220px, max 310px
    const inputW = Math.min(310, Math.max(220, Math.round(window.innerWidth * 0.30)));

    this._input.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${Math.round(topPx)}px;
      transform: translateX(-50%);
      width: ${inputW}px;
      padding: ${Math.round(window.innerHeight * 0.012)}px 18px;
      font-size: ${Math.round(window.innerHeight * 0.026)}px;
      font-family: monospace;
      background: rgba(0, 8, 20, 0.75);
      border: 2px solid #4FC3F7;
      border-radius: 8px;
      color: #ffffff;
      outline: none;
      text-align: center;
      z-index: 1000;
      letter-spacing: 1px;
    `;

    document.body.appendChild(this._input);
    this._input.focus();

    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = this._input.value.trim();
        if (name) {
          saveScore(name, this.finalScore);
          this._scoreSaved = true;
        }
        this._cleanupInput();
        showBgVideo();
        this.scene.start('MenuScene');
      }
    });
  }

  _cleanupInput() {
    if (this._input && this._input.parentNode) {
      this._input.parentNode.removeChild(this._input);
      this._input = null;
    }
  }
}
