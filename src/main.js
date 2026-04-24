// src/main.js
import { BootScene }     from './scenes/BootScene.js';
import { MenuScene }     from './scenes/MenuScene.js';
import { GameScene }     from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

// ── Vidéo de fond ─────────────────────────────────────────────────────
export function showBgVideo() {
  document.getElementById('bg-video').classList.add('visible');
  document.getElementById('bg-overlay').classList.add('visible');
}
export function hideBgVideo() {
  document.getElementById('bg-video').classList.remove('visible');
  document.getElementById('bg-overlay').classList.remove('visible');
}

// ── Musique de fond (HTML Audio — persiste entre les scènes Phaser) ────
const _music = document.getElementById('bg-music');
let _fadeRaf      = null;
let _musicStarted = false;

// Démarre la musique dès la première interaction utilisateur (politique autoplay)
function _bootMusic() {
  if (_musicStarted) return;
  _musicStarted = true;
  document.removeEventListener('click',      _bootMusic);
  document.removeEventListener('touchstart', _bootMusic);
  document.removeEventListener('keydown',    _bootMusic);
  _music.volume = 0;
  _music.play().catch(err => console.warn('[Music] play() bloqué :', err));
  _fadeTo(0.50, 1200);
}

document.addEventListener('click',      _bootMusic);
document.addEventListener('touchstart', _bootMusic);
document.addEventListener('keydown',    _bootMusic);

// Fallback loop au cas où l'attribut `loop` serait ignoré par le navigateur
_music.addEventListener('ended', () => {
  _music.currentTime = 0;
  _music.play().catch(() => {});
});

// Appelé explicitement depuis les scènes si nécessaire (idempotent)
export function startMusic() {
  _bootMusic();
}

// Fade smooth vers un volume cible (0–1), durée en ms
export function setMusicVolume(target, duration = 800) {
  if (!_musicStarted || _music.paused) return;
  _fadeTo(target, duration);
}

function _fadeTo(target, duration) {
  if (_fadeRaf) cancelAnimationFrame(_fadeRaf);
  const start    = _music.volume;
  const diff     = target - start;
  const t0       = performance.now();

  const step = (now) => {
    const progress = Math.min((now - t0) / duration, 1);
    _music.volume  = start + diff * progress;
    if (progress < 1) _fadeRaf = requestAnimationFrame(step);
  };
  _fadeRaf = requestAnimationFrame(step);
}

// ── Boutons de contrôle (son + fullscreen) ────────────────────────────

// -- Son --
const _soundBtn    = document.getElementById('btn-sound');
const _soundImg    = document.getElementById('btn-sound-img');
let   _muted       = localStorage.getItem('nr-muted') === 'true';

function _applySoundState() {
  _music.muted   = _muted;
  _soundImg.src  = _muted
    ? 'assets/ui/nr-btnnosound.png'
    : 'assets/ui/nr-btnsound.png';
  localStorage.setItem('nr-muted', _muted);
}

_applySoundState(); // applique la préférence sauvegardée dès le démarrage

_soundBtn.addEventListener('click', () => {
  _muted = !_muted;
  _applySoundState();
});

// -- Fullscreen --
const _fsBtn = document.getElementById('btn-fullscreen');
const _fsImg = document.getElementById('btn-fullscreen-img');

function _updateFsIcon() {
  const inFs = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement
  );
  _fsImg.src = inFs
    ? 'assets/ui/nr-exitfullscreen.png'
    : 'assets/ui/nr-fullscreen.png';
}

_fsBtn.addEventListener('click', () => {
  const inFs = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement
  );
  if (inFs) {
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen)
      .call(document);
  } else {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen)
      .call(el).catch(() => {});
  }
});

document.addEventListener('fullscreenchange',       _updateFsIcon);
document.addEventListener('webkitfullscreenchange', _updateFsIcon);
document.addEventListener('mozfullscreenchange',    _updateFsIcon);

// -- Popup règles --
const _backdrop   = document.getElementById('rules-backdrop');
const _rulesClose = document.getElementById('rules-close');
const _btnInfos   = document.getElementById('btn-infos');

_btnInfos.addEventListener('click', () => _backdrop.classList.add('open'));
_rulesClose.addEventListener('click', () => _backdrop.classList.remove('open'));
_backdrop.addEventListener('click', (e) => {
  if (e.target === _backdrop) _backdrop.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') _backdrop.classList.remove('open');
});

// ── Phaser ────────────────────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#000000',
  parent: 'game-container',

  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },

  render: {
    transparent: true
  },

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [BootScene, MenuScene, GameScene, GameOverScene]
};

new Phaser.Game(config);
