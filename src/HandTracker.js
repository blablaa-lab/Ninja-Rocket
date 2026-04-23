// src/HandTracker.js

const SMOOTH_ALPHA = 0.65;
const CAM_DEVICE_KEY = 'spaceninja_camera_deviceId';

export class HandTracker {
  constructor(videoElement, onFingerMove) {
    this.videoElement = videoElement;
    this.onFingerMove = onFingerMove;
    this.hands        = null;
    this._stream      = null;
    this._active      = false;
    this._initialized = false;

    this._smoothX = null;
    this._smoothY = null;
    this._velX    = 0;
    this._velY    = 0;
    this._prevX   = null;
    this._prevY   = null;
    this._prevT   = null;
  }

  // ── Énumération des caméras ───────────────────────────────────────
  // Demande la permission d'abord (requis pour obtenir les labels).
  // Retourne un tableau de { deviceId, label }.

  static async getDevices() {
    try {
      // Permission minimale pour débloquer les labels
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach(t => t.stop());
    } catch {
      return [];
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    return all
      .filter(d => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label:    d.label || `Caméra ${i + 1}`
      }));
  }

  static getSavedDeviceId() {
    return localStorage.getItem(CAM_DEVICE_KEY) || null;
  }

  static saveDeviceId(deviceId) {
    localStorage.setItem(CAM_DEVICE_KEY, deviceId);
  }

  // ── Initialisation ────────────────────────────────────────────────

  async init(deviceId = null) {
    if (this._initialized) return;

    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
    });

    this.hands.setOptions({
      maxNumHands:            1,
      modelComplexity:        0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence:  0.5
    });

    this.hands.onResults((r) => this._onResults(r));

    // Contraintes vidéo avec deviceId optionnel
    const videoConstraints = {
      width:  { ideal: 320 },
      height: { ideal: 240 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    };

    this._stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints
    });

    this.videoElement.srcObject = this._stream;
    await this.videoElement.play();

    this._active      = true;
    this._initialized = true;
    this._sending     = false;

    // Boucle découplée : le RAF tourne à 60fps indépendamment de MediaPipe.
    // Un flag _sending évite d'envoyer un nouveau frame pendant qu'un est en cours.
    // Résultat : le curseur extrapole sans attendre la fin du traitement MediaPipe.
    const loop = () => {
      if (!this._active) return;
      requestAnimationFrame(loop); // toujours planifier en premier
      if (!this._sending) {
        this._sending = true;
        this.hands.send({ image: this.videoElement })
          .then(() => { this._sending = false; })
          .catch(() => { this._sending = false; });
      }
    };
    requestAnimationFrame(loop);

    const label = this._stream.getVideoTracks()[0]?.label ?? 'inconnue';
    console.log(`[HandTracker] Caméra active : "${label}"`);
  }

  // ── Traitement des résultats MediaPipe ────────────────────────────

  _onResults(results) {
    if (!results.multiHandLandmarks?.length) return;

    const landmarks = results.multiHandLandmarks[0];
    const tip = landmarks[8]; // INDEX_FINGER_TIP

    const rawX = (1 - tip.x) * window.innerWidth;
    const rawY = tip.y * window.innerHeight;

    if (this._smoothX === null) {
      this._smoothX = rawX;
      this._smoothY = rawY;
    } else {
      this._smoothX = SMOOTH_ALPHA * rawX + (1 - SMOOTH_ALPHA) * this._smoothX;
      this._smoothY = SMOOTH_ALPHA * rawY + (1 - SMOOTH_ALPHA) * this._smoothY;
    }

    const now = performance.now();
    if (this._prevX !== null && this._prevT !== null) {
      const dt = now - this._prevT;
      if (dt > 0 && dt < 150) {
        this._velX = (this._smoothX - this._prevX) / dt;
        this._velY = (this._smoothY - this._prevY) / dt;
      } else {
        this._velX = 0; this._velY = 0;
      }
    }
    this._prevX = this._smoothX;
    this._prevY = this._smoothY;
    this._prevT = now;

    this.onFingerMove(this._smoothX, this._smoothY, this._velX, this._velY);
  }

  // ── Nettoyage ─────────────────────────────────────────────────────

  destroy() {
    this._active = false;
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    this.videoElement.srcObject = null;
    this._smoothX = null; this._smoothY = null;
    this._prevX   = null; this._prevY   = null;
    this._velX    = 0;    this._velY    = 0;
    this._initialized = false;
  }
}
