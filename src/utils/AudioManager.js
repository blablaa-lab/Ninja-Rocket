// src/utils/AudioManager.js
// Sons procéduraux via Web Audio API — aucun fichier audio requis.
// L'AudioContext est créé au premier appel (les navigateurs exigent un geste utilisateur).

export class AudioManager {
  constructor() {
    this._ctx = null;
  }

  _ctx_() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Safari suspend le contexte si pas de geste récent — on le reprend silencieusement
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  // ── Sons de tranche ───────────────────────────────────────────────

  // Tranche normale : swoosh court
  slice() {
    const ctx = this._ctx_();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.14);
  }

  // Tranche membre : accord arpégé montant (Do-Mi-Sol)
  memberSlice() {
    const ctx   = this._ctx_();
    const freqs = [523, 659, 784]; // C5, E5, G5
    freqs.forEach((freq, i) => {
      const t    = ctx.currentTime + i * 0.06;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.36);
    });
  }

  // Combo : tonalité montante selon le niveau (2, 3, 4+)
  combo(level) {
    const ctx  = this._ctx_();
    const base = [660, 784, 988][Math.min(level - 2, 2)]; // E5, G5, B5
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(base * 1.5, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  }

  // ── Compte à rebours ──────────────────────────────────────────────

  countdown() {
    const ctx  = this._ctx_();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 440; // La4
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  }

  go() {
    const ctx  = this._ctx_();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, ctx.currentTime);           // Do5
    osc.frequency.exponentialRampToValueAtTime(1046, ctx.currentTime + 0.18); // Do6
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.36);
  }

  // ── Fin de partie ────────────────────────────────────────────────

  gameOver() {
    const ctx   = this._ctx_();
    const notes = [440, 370, 311, 220]; // La-Fa#-Mi♭-La (descente)
    notes.forEach((freq, i) => {
      const t    = ctx.currentTime + i * 0.22;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.start(t); osc.stop(t + 0.4);
    });
  }
}
