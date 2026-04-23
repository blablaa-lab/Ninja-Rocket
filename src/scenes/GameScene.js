// src/scenes/GameScene.js
import { SliceDetector }            from '../utils/SliceDetector.js';
import { SpawnManager }             from '../utils/SpawnManager.js';
import { HandTracker }              from '../HandTracker.js';
import { AudioManager }             from '../utils/AudioManager.js';
import { setMusicVolume }           from '../main.js';

const GAME_DURATION  = 60;    // secondes
const COMBO_WINDOW   = 1400;  // ms — durée de la fenêtre combo
const COMBO_RESET    = 2000;  // ms — inactivité avant reset du combo

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this._deviceId = data?.deviceId ?? null;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.score         = 0;
    this.timeLeft      = GAME_DURATION;
    this.elapsed       = 0;
    this.activeObjects = [];
    this._isGameOver   = false;
    this._gameStarted  = false; // vrai après "GO!"
    this._fingerX      = null;
    this._fingerY      = null;

    // Combo
    this._comboCount    = 0;
    this._lastSliceTime = 0;
    this._comboResetEvt = null;

    // Extrapolation de vélocité entre frames MediaPipe
    this._fingerVelX    = 0;
    this._fingerVelY    = 0;
    this._lastFingerT   = 0;

    // Cadre cockpit par-dessus la webcam (depth 3 — sous les objets)
    this.add.image(W / 2, H / 2, 'nr-frame')
      .setDisplaySize(W, H)
      .setDepth(3);

    // Systèmes
    this.audio         = new AudioManager();
    this.spawnManager  = new SpawnManager(this);
    this.sliceDetector = new SliceDetector();

    // HUD (timer masqué jusqu'au GO!)
    this._createHUD();

    // Point doigt Phaser (lerp 60fps)
    this.fingerDot = this.add.circle(0, 0, 10, 0xff4444, 0.9)
      .setDepth(30).setVisible(false);
    this.fingerRing = this.add.circle(0, 0, 18, 0xffffff, 0)
      .setDepth(29).setVisible(false);
    this.fingerRing.setStrokeStyle(2, 0xffffff, 0.5);

    // Canvas overlay pour le trail
    this.sliceCanvas        = document.getElementById('slice-canvas');
    this.sliceCanvas.width  = window.innerWidth;
    this.sliceCanvas.height = window.innerHeight;
    this.sliceCtx           = this.sliceCanvas.getContext('2d');

    // Hand tracking (démarre en arrière-plan)
    const video = document.getElementById('webcam-overlay');
    this.handTracker = new HandTracker(video, (x, y, vx, vy) => this._onFinger(x, y, vx, vy));
    this.handTracker.init(this._deviceId).catch(err =>
      console.warn('[HandTracker] Webcam inaccessible :', err)
    );

    // Compte à rebours avant le début (800ms pour laisser Phaser se stabiliser)
    this.time.delayedCall(800, () => this._runCountdown());
  }

  update(time, delta) {
    if (this._isGameOver || !this._gameStarted) return;

    this.elapsed += delta;
    this.spawnManager.update(delta, this.elapsed);
    this.activeObjects = this.activeObjects.filter(obj => obj.active);

    this._lerpFingerDot(delta);
    this.sliceDetector.drawTrail(
      this.sliceCtx,
      this.sliceCanvas.width,
      this.sliceCanvas.height
    );
  }

  // ── Compte à rebours 3-2-1-GO! ───────────────────────────────────

  _runCountdown() {
    const W = this.scale.width;
    const H = this.scale.height;

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55)
      .setDepth(50);

    const txt = this.add.text(W / 2, H / 2, '', {
      fontSize: '180px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000000', strokeThickness: 10, align: 'center'
    }).setOrigin(0.5).setDepth(51);

    let count = 3;

    const tick = () => {
      this.audio.countdown();
      txt.setText(String(count))
        .setColor('#ffffff')
        .setScale(0.4)
        .setAlpha(1);

      this.tweens.add({
        targets: txt, scaleX: 1.2, scaleY: 1.2, alpha: 0,
        duration: 750, ease: 'Cubic.easeIn'
      });

      count--;
      if (count > 0) {
        this.time.delayedCall(850, tick);
      } else {
        this.time.delayedCall(850, () => this._showGo(overlay, txt));
      }
    };

    tick();
  }

  _showGo(overlay, countTxt) {
    this.audio.go();
    countTxt.setText('GO !')
      .setColor('#FFD54F')
      .setScale(0.5)
      .setAlpha(1);

    this.tweens.add({
      targets: countTxt, scaleX: 1.6, scaleY: 1.6, alpha: 0,
      duration: 650, ease: 'Cubic.easeIn',
      onComplete: () => {
        overlay.destroy();
        countTxt.destroy();
        this._startGame();
      }
    });
  }

  _startGame() {
    this._gameStarted = true;
    this.timerTxt.setVisible(true);
    setMusicVolume(0.20, 600);

    // Le timer ne tourne qu'une fois le jeu réellement démarré
    this.time.addEvent({
      delay: 1000,
      repeat: GAME_DURATION - 1,
      callback: this._tickTimer,
      callbackScope: this
    });
  }

  // ── Finger tracking ───────────────────────────────────────────────

  _onFinger(x, y, velX = 0, velY = 0) {
    if (this._isGameOver || !this._gameStarted) return;
    this._fingerX    = x;
    this._fingerY    = y;
    this._fingerVelX = velX;
    this._fingerVelY = velY;
    this._lastFingerT = performance.now();
    this.sliceDetector.update(x, y);
    this._checkSlices(x, y);
  }

  _lerpFingerDot(delta) {
    if (this._fingerX === null) return;

    // Extrapolation : entre deux frames MediaPipe, on projette la position
    // dans la direction du dernier mouvement avec décroissance exponentielle.
    // Décroissance sur 60ms → à t+60ms le vecteur est à 37%, à t+120ms à 14%.
    const elapsed = performance.now() - this._lastFingerT;
    const decay   = Math.exp(-elapsed / 150); // élargi à 150ms pour absorber les pics MediaPipe lors d'un coup
    const targetX = this._fingerX + this._fingerVelX * elapsed * decay;
    const targetY = this._fingerY + this._fingerVelY * elapsed * decay;

    // Lerp frame-rate indépendant vers la cible extrapolée
    const LERP = 1 - Math.pow(0.001, delta / 1000);
    const dot  = this.fingerDot;
    const ring = this.fingerRing;

    if (!dot.visible) {
      dot.setPosition(targetX, targetY).setVisible(true);
      ring.setPosition(targetX, targetY).setVisible(true);
    } else {
      dot.x += (targetX - dot.x) * LERP;
      dot.y += (targetY - dot.y) * LERP;
      ring.x  = dot.x;
      ring.y  = dot.y;
    }
    ring.setAlpha(0.4);
  }

  // ── Détection de tranche ─────────────────────────────────────────

  _checkSlices(fingerX, fingerY) {
    const slice = this.sliceDetector.getSlice();
    if (!slice) return;

    this.activeObjects = this.activeObjects.filter(obj => {
      if (!obj.active) return false;
      const dist   = Phaser.Math.Distance.Between(fingerX, fingerY, obj.x, obj.y);
      const radius = (obj.displayWidth / 2) * 1.8;
      if (dist < radius) {
        this._sliceObject(obj);
        return false;
      }
      return true;
    });
  }

  _sliceObject(obj) {
    const basePts  = obj.gameData?.points ?? 10;
    const isMember = obj.gameData?.isMember ?? false;
    const isMalus  = obj.gameData?.isMalus  ?? false;
    const isBonus  = obj.gameData?.isBonus  ?? false;
    const now      = this.time.now;

    // ── Combo (désactivé pour les malus) ─────────────────────────────
    if (!isMalus) {
      if (now - this._lastSliceTime < COMBO_WINDOW) {
        this._comboCount++;
      } else {
        this._comboCount = 1;
      }
      this._lastSliceTime = now;
      if (this._comboResetEvt) this._comboResetEvt.remove();
      this._comboResetEvt = this.time.delayedCall(COMBO_RESET, () => {
        this._comboCount = 0;
        this._hideComboDisplay();
      });
    }

    const multiplier = (!isMalus && this._comboCount >= 6) ? 3
                     : (!isMalus && this._comboCount >= 3) ? 2
                     : 1;

    const pts = isMalus ? basePts : basePts * multiplier; // malus pas multiplié
    this.score = Math.max(0, this.score + pts);
    this._updateScore();

    // ── Feedback visuel & sonore ─────────────────────────────────────
    if (isMalus) {
      this.audio.slice();
      this.cameras.main.flash(200, 255, 0, 0, false); // flash rouge
    } else if (isBonus) {
      this.audio.memberSlice();
      this.cameras.main.flash(180, 255, 215, 0, false); // flash doré
    } else if (isMember) {
      this.audio.memberSlice();
    } else {
      this.audio.slice();
    }

    if (!isMalus && this._comboCount >= 2) {
      this.audio.combo(this._comboCount);
      this._showComboDisplay(this._comboCount, multiplier);
    }

    this._flashSlice(obj, isMember || isBonus, isMalus);
    this._spawnParticles(obj.x, obj.y, isMember || isBonus, isMalus);
    this._showPointsPopup(obj.x, obj.y, pts, isMember || isBonus, multiplier);
    obj.destroy();
  }

  // ── Combo display ─────────────────────────────────────────────────

  _showComboDisplay(count, multiplier) {
    // On réutilise (ou recrée) un texte de combo centré en haut de l'écran
    if (this._comboTxt) this._comboTxt.destroy();
    if (this._comboTween) this._comboTween.stop();

    const W = this.scale.width;
    const label = multiplier > 1
      ? `COMBO x${multiplier}  (${count} tranches)`
      : `COMBO ${count}`;

    this._comboTxt = this.add.text(W / 2, 110, label, {
      fontSize: '28px', fontFamily: 'monospace',
      color: multiplier >= 3 ? '#FF6F00' : '#FFD54F',
      stroke: '#000', strokeThickness: 4, align: 'center'
    }).setOrigin(0.5).setDepth(15).setAlpha(0).setScale(0.7);

    this._comboTween = this.tweens.add({
      targets: this._comboTxt, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 150, ease: 'Back.easeOut'
    });
  }

  _hideComboDisplay() {
    if (!this._comboTxt) return;
    this.tweens.add({
      targets: this._comboTxt, alpha: 0, duration: 300,
      onComplete: () => { this._comboTxt?.destroy(); this._comboTxt = null; }
    });
  }

  // ── Flash tranche ─────────────────────────────────────────────────

  _flashSlice(obj, isMember, isMalus = false) {
    const size  = Math.max(obj.displayWidth, obj.displayHeight);
    const color = isMalus ? 0xFF1744 : isMember ? 0xFFD54F : 0xffffff;

    const halo = this.add.circle(obj.x, obj.y, size * 0.55, color, 0.85)
      .setDepth(18);
    this.tweens.add({
      targets: halo, alpha: 0, scaleX: 2.8, scaleY: 2.8,
      duration: isMember ? 380 : 220, ease: 'Cubic.easeOut',
      onComplete: () => halo.destroy()
    });

    if (isMember) this.cameras.main.flash(130, 255, 220, 80, false);
  }

  // ── Timer ─────────────────────────────────────────────────────────

  _tickTimer() {
    this.timeLeft--;
    this._updateTimer();
    if (this.timeLeft <= 0) this._endGame();
  }

  _endGame() {
    if (this._isGameOver) return;
    this._isGameOver = true;
    setMusicVolume(0.40, 1000);
    this.audio.gameOver();
    this.sliceCtx.clearRect(0, 0, this.sliceCanvas.width, this.sliceCanvas.height);
    this.handTracker?.destroy();
    this.fingerDot.setVisible(false);
    this.fingerRing.setVisible(false);
    this.cameras.main.flash(500, 0, 0, 0, false);
    this.time.delayedCall(550, () =>
      this.scene.start('GameOverScene', { score: this.score })
    );
  }

  // ── Particules ────────────────────────────────────────────────────

  _spawnParticles(x, y, isMember, isMalus = false) {
    const tint     = isMalus ? 0xFF1744 : isMember ? 0xFFD54F : 0x88ccff;
    const count    = isMember ? 22 : isMalus ? 14 : 10;
    const maxSpeed = isMember ? 300 : 200;
    const emitter  = this.add.particles(x, y, 'star', {
      speed:    { min: 80, max: maxSpeed },
      scale:    { start: isMember ? 0.9 : 0.5, end: 0 },
      tint,
      lifespan: isMember ? 800 : 500,
      angle:    { min: 0, max: 360 }
    });
    emitter.explode(count, x, y);
    this.time.delayedCall(900, () => emitter.destroy());
  }

  _showPointsPopup(x, y, pts, isMember, multiplier) {
    const lines = [`+${pts}`];
    if (multiplier > 1) lines.push(`×${multiplier}`);
    const label = lines.join('\n');

    const txt = this.add.text(x, y - 20, label, {
      fontSize:        isMember ? '42px' : '28px',
      fontFamily:      'monospace',
      color:           isMember ? '#FFD54F' : '#ffffff',
      stroke:          '#000000',
      strokeThickness: isMember ? 5 : 3,
      align:           'center'
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: txt, y: y - 110, alpha: 0,
      scaleX: isMember ? 1.4 : 1.1,
      scaleY: isMember ? 1.4 : 1.1,
      duration: 950, ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────

  _createHUD() {
    const W = this.scale.width;

    this.scoreTxt = this.add.text(24, 20, '0', {
      fontSize: '52px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setDepth(10);

    this.add.text(24, 76, 'SCORE', {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#90A4AE', stroke: '#000', strokeThickness: 2
    }).setDepth(10);

    this.timerTxt = this.add.text(W - 24, 20, this._formatTime(GAME_DURATION), {
      fontSize: '52px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(1, 0).setDepth(10).setVisible(false); // caché jusqu'au GO!

    this.add.text(W - 24, 76, 'TEMPS', {
      fontSize: '13px', fontFamily: 'monospace',
      color: '#90A4AE', stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0).setDepth(10);
  }

  _updateScore() {
    this.scoreTxt.setText(String(this.score));
    this.tweens.add({
      targets: this.scoreTxt, scaleX: 1.3, scaleY: 1.3,
      duration: 90, yoyo: true, ease: 'Cubic.easeOut'
    });
  }

  _updateTimer() {
    this.timerTxt.setText(this._formatTime(this.timeLeft));
    if (this.timeLeft <= 10) {
      this.timerTxt.setColor(this.timeLeft % 2 === 0 ? '#EF5350' : '#ffffff');
      this.tweens.add({
        targets: this.timerTxt, scaleX: 1.18, scaleY: 1.18,
        duration: 160, yoyo: true, ease: 'Sine.easeInOut'
      });
    }
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
