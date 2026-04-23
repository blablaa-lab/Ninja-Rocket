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
