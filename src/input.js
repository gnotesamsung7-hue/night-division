// Turns the front camera (or touch) into aim + trigger events.
// Events pushed to input.events: shot, chargeStart, chargeCancel, blast, lost, back.
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
import { settings } from './storage.js';

class OneEuro {
  constructor() { this.beta = 0.01; this.dCutoff = 1; this.minCutoff = 1.5; this.reset(); }
  reset() { this.x = null; this.dx = 0; }
  a(c, dt) { const tau = 1 / (2 * Math.PI * c); return 1 / (1 + tau / dt); }
  filter(v, t) {
    if (this.x === null) { this.x = v; this.t = t; return v; }
    const dt = Math.max((t - this.t) / 1000, 1e-3); this.t = t;
    this.dx += this.a(this.dCutoff, dt) * ((v - this.x) / dt - this.dx);
    this.x += this.a(this.minCutoff + this.beta * Math.abs(this.dx), dt) * (v - this.x);
    return this.x;
  }
}
const fx = new OneEuro(), fy = new OneEuro();
export function applySmoothing() { fx.minCutoff = fy.minCutoff = 6 - settings.smooth * 0.056; }

const CHARGE_DELAY = 0.35, CHARGE_TIME = 1.3, MISS_FRAMES = 3;

export const input = {
  mode: null, camOn: false, video: null, landmarker: null, lastVideoTime: -1, miss: 0,
  aim: { x: 0, y: 0, seen: false }, hist: [],
  hand: { present: false, lostAt: 0, lm: null },
  trig: { ratio: 1, cocked: false, holding: false, holdStart: 0, charge: 0 },
  events: [],
  threshold: () => (settings.trigger === 'thumb' ? settings.thumbT : settings.pinchT) / 100
};

async function loadModel() {
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  const opts = delegate => ({
    baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate },
    runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.55, minHandPresenceConfidence: 0.55, minTrackingConfidence: 0.5
  });
  try { return await HandLandmarker.createFromOptions(vision, opts('GPU')); }
  catch { return await HandLandmarker.createFromOptions(vision, opts('CPU')); }
}

export async function startCamera(video, onStatus) {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('no media'), { name: 'NoMedia' });
  input.video = video;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } } });
  video.srcObject = stream; await video.play();
  if (!input.landmarker) { onStatus?.('Loading hand model…'); input.landmarker = await loadModel(); }
  input.camOn = true; input.mode = 'camera';
  input.hand.present = false; input.hand.lostAt = performance.now();
}
export function stopCamera() {
  input.video?.srcObject?.getTracks().forEach(t => t.stop());
  if (input.video) input.video.srcObject = null;
  input.camOn = false; input.aim.seen = false; input.hand.present = false;
}
export function resetGestures() {
  const t = input.trig; t.cocked = false; t.holding = false; t.charge = 0;
  input.events.length = 0; fx.reset(); fy.reset();
}

function updateCharge(now) {
  const t = input.trig;
  if (!t.holding) return;
  const h = (now - t.holdStart) / 1000;
  const c = h < CHARGE_DELAY ? 0 : Math.min(1, (h - CHARGE_DELAY) / CHARGE_TIME);
  if (c > 0 && t.charge === 0) input.events.push({ type: 'chargeStart' });
  t.charge = c;
}
function release() {
  const t = input.trig;
  if (t.charge >= 1) input.events.push({ type: 'blast', x: input.aim.x, y: input.aim.y });
  else if (t.charge > 0) input.events.push({ type: 'chargeCancel' });
  t.holding = false; t.charge = 0;
}

function processHand(lm, now, W, H) {
  const v = input.video, ar = v.videoWidth / v.videoHeight;
  const d = (a, b) => Math.hypot((lm[a].x - lm[b].x) * ar, lm[a].y - lm[b].y);
  const size = d(0, 9) || 1e-3;
  const p = settings.trigger === 'thumb' ? lm[8] : { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 };
  const m = settings.reach / 100;
  const nx = Math.min(1, Math.max(0, ((1 - p.x) - m) / (1 - 2 * m)));
  const ny = Math.min(1, Math.max(0, (p.y - m) / (1 - 2 * m)));
  const a = input.aim;
  a.x = fx.filter(nx * W, now); a.y = fy.filter(ny * H, now); a.seen = true;
  input.hist.push({ t: now, x: a.x, y: a.y }); if (input.hist.length > 12) input.hist.shift();

  const t = input.trig, T = input.threshold();
  t.ratio = settings.trigger === 'thumb' ? Math.min(d(4, 5), d(4, 6)) / size : d(4, 8) / size;
  if (!t.cocked && !t.holding && t.ratio > T * 1.45) t.cocked = true;
  if (t.cocked && t.ratio < T) {
    t.cocked = false; t.holding = true; t.holdStart = now; t.charge = 0;
    const back = input.hist.find(h => now - h.t <= 130) || input.hist[0]; // undo the twitch a trigger pull causes
    input.events.push({ type: 'shot', x: back.x, y: back.y });
  } else if (t.holding && t.ratio > T * 1.45) {
    release(); t.cocked = true;
  }
}

export function pollInput(now, W, H) {
  if (input.mode === 'touch') { updateCharge(now); return; }
  const v = input.video;
  if (!input.camOn || !input.landmarker || !v || v.readyState < 2 || v.currentTime === input.lastVideoTime) { updateCharge(now); return; }
  input.lastVideoTime = v.currentTime;
  const lm = input.landmarker.detectForVideo(v, now).landmarks?.[0];
  if (lm) {
    input.miss = 0; input.hand.lm = lm;
    if (!input.hand.present) { input.hand.present = true; input.events.push({ type: 'back', away: now - input.hand.lostAt }); }
    processHand(lm, now, W, H);
  } else if (input.hand.present && ++input.miss >= MISS_FRAMES) {
    input.hand.present = false; input.hand.lostAt = now; input.hand.lm = null;
    const t = input.trig; if (t.holding && t.charge > 0) input.events.push({ type: 'chargeCancel' });
    t.holding = false; t.charge = 0; t.cocked = false;
    fx.reset(); fy.reset(); input.hist.length = 0;
    input.events.push({ type: 'lost' });
  }
  updateCharge(now);
}

export function attachTouch(canvas) {
  canvas.addEventListener('pointerdown', e => {
    if (input.mode !== 'touch') return;
    const a = input.aim; a.x = e.clientX; a.y = e.clientY; a.seen = true;
    const t = input.trig; t.holding = true; t.holdStart = performance.now(); t.charge = 0;
    input.events.push({ type: 'shot', x: a.x, y: a.y });
  });
  canvas.addEventListener('pointermove', e => {
    if (input.mode !== 'touch' || !input.trig.holding) return;
    input.aim.x = e.clientX; input.aim.y = e.clientY;
  });
  const up = () => { if (input.mode === 'touch' && input.trig.holding) release(); };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
}
