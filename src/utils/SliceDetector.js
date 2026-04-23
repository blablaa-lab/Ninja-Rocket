// src/utils/SliceDetector.js

export class SliceDetector {
  constructor() {
    this.history     = [];
    this.MAX_HISTORY = 14;  // plus de points → trail plus longue et lisse
    this.trailPoints = [];

    // Vélocité minimale en px/frame-équivalente (normalisée à 60fps)
    // Abaissée à 10 car l'EMA de HandTracker réduit l'amplitude apparente
    this.MIN_VELOCITY = 4;
  }

  update(x, y) {
    this.history.push({ x, y, t: performance.now() });
    if (this.history.length > this.MAX_HISTORY) this.history.shift();
    this.trailPoints = [...this.history];
  }

  // Vélocité calculée sur le temps réel (px/ms × 16) → cohérent à n'importe quel fps
  getSlice() {
    if (this.history.length < 4) return null;

    const recent = this.history.slice(-5);
    const dt = recent[recent.length - 1].t - recent[0].t;
    if (dt <= 0) return null;

    const dx = recent[recent.length - 1].x - recent[0].x;
    const dy = recent[recent.length - 1].y - recent[0].y;

    // Normalisation : px/ms → "px par frame à 60fps" pour garder MIN_VELOCITY intuitif
    const velocity = (Math.sqrt(dx * dx + dy * dy) / dt) * 16.67;

    if (velocity < this.MIN_VELOCITY) return null;
    return {
      isSlicing: true,
      start:    { x: recent[0].x,              y: recent[0].y },
      end:      { x: recent[recent.length - 1].x, y: recent[recent.length - 1].y },
      velocity
    };
  }

  // Trail lissé avec courbes de Bézier quadratiques + dégradé d'opacité
  drawTrail(ctx, width, height) {
    const pts = this.trailPoints;
    if (pts.length < 2) return;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // On dessine segment par segment pour varier l'opacité et l'épaisseur
    for (let i = 1; i < pts.length; i++) {
      const t = i / (pts.length - 1); // 0 = plus vieux, 1 = plus récent

      // Points de contrôle Bézier : on utilise les milieux pour un rendu fluide
      const x0 = i === 1
        ? pts[0].x
        : (pts[i - 2].x + pts[i - 1].x) / 2;
      const y0 = i === 1
        ? pts[0].y
        : (pts[i - 2].y + pts[i - 1].y) / 2;
      const cpx = pts[i - 1].x;
      const cpy = pts[i - 1].y;
      const x1  = i === pts.length - 1
        ? pts[i].x
        : (pts[i - 1].x + pts[i].x) / 2;
      const y1  = i === pts.length - 1
        ? pts[i].y
        : (pts[i - 1].y + pts[i].y) / 2;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cpx, cpy, x1, y1);

      // Épaisseur et opacité croissantes vers l'extrémité
      ctx.lineWidth   = 2 + t * 6;
      ctx.strokeStyle = `rgba(140, 200, 255, ${(t * 0.85).toFixed(2)})`;
      ctx.stroke();
    }
  }
}
