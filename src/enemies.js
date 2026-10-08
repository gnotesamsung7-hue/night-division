// Every entity type lives here. To add a new ghoul: add an entry to TYPES with
// hp, pts, hostile, init(e), update(e, dt), draw(ctx, e, t), hit(e, x, y, assist), center(e).
// hit() returns 'hit' | 'spirit' | 'person' | 'phased' | 'armor' | null.
// Art style: soft pastel watercolor anime. Gradient shading, soft colored outlines, big sparkly eyes, blush.
import { proj, px, glow, starPath } from './view.js';

const TAU = Math.PI * 2, INK = '#3A2440';
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const ATTACK_Z = 0.12, WINDUP = 1.0;

function approach(e, dt) {
  if (e.tx !== undefined) e.x += (e.tx - e.x) * Math.min(1, dt * 2.2);
  if (e.still) return;
  if (e.state === 'move') {
    e.z -= e.speed * dt;
    if (e.z <= ATTACK_Z) { e.z = ATTACK_Z; e.state = 'attack'; e.windup = WINDUP; }
  } else if (e.state === 'attack') e.windup -= dt;
}
function hitFlash(ctx, e, draw) {
  if (e.flash <= 0) return;
  ctx.save(); ctx.globalAlpha = e.flash; ctx.globalCompositeOperation = 'lighter'; draw(); ctx.restore();
}
function ink(ctx, w, color = INK) { ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.8, w); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function soft(ctx, x, y, r, light, mid, dark) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.25);
  g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark); return g;
}
function vgrad(ctx, y0, y1, a, b) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function seg(ctx, ax, ay, bx, by, w, color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
// Scalloped fluffy outline.
function fluff(ctx, x, y, rx, ry, n, puff, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = rot + i / n * TAU, X = x + Math.cos(a) * rx, Y = y + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(X, Y);
    else { const m = rot + (i - 0.5) / n * TAU; ctx.quadraticCurveTo(x + Math.cos(m) * rx * (1 + puff), y + Math.sin(m) * ry * (1 + puff), X, Y); }
  }
  ctx.closePath();
}
function shade(ctx, pathFn, x0, color = 'rgba(20,6,50,0.2)') {
  ctx.save(); pathFn(); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x0, -1e4, 2e4, 2e4); ctx.restore();
}
function blush(ctx, x, y, s, spacing = 0.42) {
  ctx.fillStyle = 'rgba(255,120,150,0.35)';
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + k * s * spacing, y, s * 0.13, s * 0.07, 0, 0, TAU); ctx.fill(); }
}

// Big sparkly anime eyes. mood: 'normal' | 'happy' (^ ^) | 'mischief' (sly brows) | 'smug' (half lids) | 'glow' (possessed)
export function cuteEyes(ctx, cx, cy, s, iris, mood = 'normal', spacing = 0.3, blink = false, lidColor = null) {
  for (const k of [-1, 1]) {
    const ex = cx + k * s * spacing, ey = cy;
    if (blink || mood === 'happy') {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, s * 0.05); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex, ey + s * 0.06, s * 0.11, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.14, s * 0.17, 0, 0, TAU); ctx.fill();
    if (mood === 'glow') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, s * 0.3, 'rgba(190,120,255,0.9)'); ctx.restore();
      ctx.fillStyle = '#B07CFF'; ctx.beginPath(); ctx.ellipse(ex, ey + s * 0.02, s * 0.11, s * 0.14, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#F2E2FF'; ctx.lineWidth = Math.max(0.8, s * 0.025);
      ctx.beginPath(); ctx.arc(ex, ey + s * 0.02, s * 0.06, 0, Math.PI * 1.6); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(0, ey - s * 0.14, 0, ey + s * 0.16);
      g.addColorStop(0, iris[1]); g.addColorStop(1, iris[0]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex, ey + s * 0.02, s * 0.115, s * 0.145, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(40,20,40,0.85)'; ctx.beginPath(); ctx.ellipse(ex, ey + s * 0.03, s * 0.055, s * 0.075, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(ex - k * s * 0.045, ey - s * 0.05, s * 0.05, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + k * s * 0.04, ey + s * 0.08, s * 0.022, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, s * 0.045); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.145, s * 0.175, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    if (mood === 'smug' && lidColor) {
      ctx.fillStyle = lidColor; ctx.beginPath(); ctx.ellipse(ex, ey - s * 0.02, s * 0.16, s * 0.12, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(ex - s * 0.15, ey - s * 0.02); ctx.lineTo(ex + s * 0.15, ey - s * 0.02); ctx.stroke();
    }
    if (mood === 'mischief') {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.moveTo(ex + k * s * 0.16, ey - s * 0.28); ctx.quadraticCurveTo(ex, ey - s * 0.24, ex - k * s * 0.08, ey - s * 0.2); ctx.stroke();
    }
  }
}
function fangGrin(ctx, x, y, s) {
  ctx.fillStyle = '#8A2A4A'; ctx.beginPath(); ctx.arc(x, y, s * 0.13, 0, Math.PI); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FF9DB5'; ctx.beginPath(); ctx.ellipse(x, y + s * 0.09, s * 0.06, s * 0.035, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + k * s * 0.09, y); ctx.lineTo(x + k * s * 0.04, y); ctx.lineTo(x + k * s * 0.065, y + s * 0.06); ctx.fill(); }
}

/* -------- Wisp: pink floppy-eared fluffball spirit with a ghostly tail -------- */
const wisp = {
  hp: 1, pts: 100, hostile: true, color: '#FF9DC0',
  init(e) {
    e.speed ??= rnd(0.1, 0.14); e.h ??= rnd(0.9, 1.4); e.wa = rnd(0.12, 0.3); e.wf = rnd(1.5, 2.6); e.ph = rnd(0, TAU);
    e.trail = []; e.blinkEvery = rnd(2.5, 4); if (e.drop) { e.dropH = e.h; e.h = 3.2; }
  },
  update(e, dt) {
    e.t += dt; approach(e, dt);
    if (e.drop && e.h > e.dropH) e.h = Math.max(e.dropH, e.h - dt * 2.4);
    e.xr = e.x + (e.still ? 0 : Math.sin(e.t * e.wf + e.ph) * e.wa);
    const p = proj(e.xr, e.z);
    e.sx = p.sx; e.sy = p.sy - px(e.h + Math.sin(e.t * 3) * 0.06, p.s); e.r = px(0.22, p.s);
    e.trail.unshift([e.sx, e.sy]); if (e.trail.length > 8) e.trail.pop();
  },
  draw(ctx, e, t) {
    const r = e.r, x = e.sx, y = e.sy, flap = Math.sin(t * 9 + e.ph), blinking = (e.t % e.blinkEvery) < 0.12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r * 2.6, 'rgba(255,140,200,0.4)');
    e.trail.forEach((p, i) => { if (i % 2) return; ctx.fillStyle = `rgba(255,210,235,${0.55 - i * 0.06})`; starPath(ctx, p[0], p[1] + r * 0.9, r * 0.25, t * 3 + i); ctx.fill(); });
    ctx.restore();
    // ghostly tail
    ctx.fillStyle = vgrad(ctx, y + r * 0.4, y + r * 1.8, 'rgba(255,170,205,0.9)', 'rgba(255,170,205,0)'); ctx.beginPath(); ctx.moveTo(x - r * 0.55, y + r * 0.45);
    ctx.quadraticCurveTo(x - r * 0.3 + Math.sin(t * 6) * r * 0.3, y + r * 1.3, x + Math.sin(t * 5 + 1) * r * 0.5, y + r * 1.75);
    ctx.quadraticCurveTo(x + r * 0.35, y + r * 1.1, x + r * 0.55, y + r * 0.45); ctx.fill();
    // floppy ears
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(x + k * r * 0.88, y + r * 0.15, r * 0.36, r * 0.74, k * (0.35 + flap * 0.25), 0, TAU);
      ctx.fillStyle = soft(ctx, x + k * r * 0.8, y, r * 0.6, '#FFD3E0', '#F6A3BC', '#DE7F9C'); ctx.fill(); ink(ctx, r * 0.05, '#C25F7E');
    }
    fluff(ctx, x, y, r, r * 0.95, 16, 0.1);
    ctx.fillStyle = soft(ctx, x, y, r, '#FFEAF0', '#FBBACB', '#EC90AB'); ctx.fill(); ink(ctx, r * 0.05, '#C25F7E');
    fluff(ctx, x, y - r * 0.85, r * 0.3, r * 0.2, 7, 0.25); ctx.fillStyle = '#FFD6E2'; ctx.fill();
    cuteEyes(ctx, x, y + r * 0.02, r * 1.15, ['#F5B4DA', '#8A2A6A'], 'mischief', 0.3, blinking);
    blush(ctx, x, y + r * 0.32, r);
    fangGrin(ctx, x, y + r * 0.42, r);
    hitFlash(ctx, e, () => glow(ctx, x, y, r * 2, 'rgba(255,255,255,1)'));
  },
  hit: (e, x, y, a) => Math.hypot(x - e.sx, y - e.sy) < e.r * 1.45 + a ? 'hit' : null,
  center: e => ({ x: e.sx, y: e.sy, r: e.r * 1.25 })
};

/* -------- Phantom: tall shaggy yellow spirit with headphones; only solid part of the time -------- */
const phantom = {
  hp: 2, pts: 250, hostile: true, color: '#FFD86B',
  init(e) { e.speed ??= rnd(0.06, 0.08); e.pt = rnd(0, 2.4); e.alpha = 1; e.blinkEvery = rnd(3, 5); },
  update(e, dt) {
    e.t += dt; e.pt += dt; approach(e, dt);
    const cyc = e.pt % 2.6; e.solid = cyc < 1.5 || e.state === 'attack';
    e.alpha += ((e.solid ? 1 : 0.18) - e.alpha) * Math.min(1, dt * 8);
    const p = proj(e.x + Math.sin(e.t * 0.8) * 0.08, e.z);
    e.s = p.s; e.hh = px(1.4, p.s); e.ww = px(0.72, p.s);
    e.sx = p.sx; e.base = p.sy - px(Math.abs(Math.sin(e.t * 4)) * 0.04, p.s); e.sy = e.base - e.hh * 0.55; e.r = e.ww * 0.5;
  },
  draw(ctx, e, t) {
    const { sx, base, hh, ww } = e, top = base - hh, cy = base - hh * 0.5, sway = Math.sin(t * 2.5 + e.pt) * 0.06;
    ctx.save(); ctx.globalAlpha = e.alpha;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx, cy, hh * 0.75, 'rgba(255,220,120,0.25)'); ctx.restore();
    // feet tufts
    for (const k of [-1, 1]) {
      fluff(ctx, sx + k * ww * 0.2 + Math.sin(t * 8 + k) * ww * 0.03, base - hh * 0.02, ww * 0.14, hh * 0.04, 7, 0.3);
      ctx.fillStyle = '#E8B444'; ctx.fill(); ink(ctx, hh * 0.008, '#A87420');
    }
    // shaggy body
    fluff(ctx, sx, cy, ww * 0.5, hh * 0.5, 24, 0.07, sway);
    const g = ctx.createLinearGradient(sx - ww * 0.5, top, sx + ww * 0.5, base);
    g.addColorStop(0, '#FFF4BE'); g.addColorStop(0.5, '#F9D46A'); g.addColorStop(1, '#DCA338');
    ctx.fillStyle = g; ctx.fill(); ink(ctx, hh * 0.01, '#A87420');
    ctx.strokeStyle = 'rgba(255,250,215,0.7)'; ctx.lineWidth = Math.max(1, hh * 0.008);
    for (let i = 0; i < 6; i++) { const fx = sx + (i - 2.5) * ww * 0.13, fy = cy + hh * (0.05 + (i % 2) * 0.12); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + ww * 0.04, fy + hh * 0.06, fx, fy + hh * 0.12); ctx.stroke(); }
    // little arms
    for (const k of [-1, 1]) {
      ctx.save(); ctx.translate(sx + k * ww * 0.47, cy + hh * 0.02); ctx.rotate(k * (0.3 + Math.sin(t * 3 + k) * 0.15));
      fluff(ctx, 0, hh * 0.08, ww * 0.1, hh * 0.12, 8, 0.2); ctx.fillStyle = '#F2C55A'; ctx.fill(); ink(ctx, hh * 0.008, '#A87420'); ctx.restore();
    }
    // face
    const fy = top + hh * 0.26, s = ww * 0.62, blinking = (e.t % e.blinkEvery) < 0.12;
    cuteEyes(ctx, sx, fy, s, ['#F7C978', '#7A4A10'], 'smug', 0.3, blinking, '#F9D873');
    blush(ctx, sx, fy + s * 0.25, s, 0.4);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(sx - s * 0.08, fy + s * 0.27); ctx.quadraticCurveTo(sx - s * 0.04, fy + s * 0.33, sx, fy + s * 0.27); ctx.quadraticCurveTo(sx + s * 0.04, fy + s * 0.33, sx + s * 0.08, fy + s * 0.27); ctx.stroke();
    // headphones
    ctx.strokeStyle = '#BFC5D2'; ctx.lineWidth = Math.max(2, ww * 0.06);
    ctx.beginPath(); ctx.arc(sx, top + hh * 0.2, ww * 0.46, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(sx + k * ww * 0.46 - ww * 0.08, top + hh * 0.13, ww * 0.16, hh * 0.13, ww * 0.06);
      ctx.fillStyle = soft(ctx, sx + k * ww * 0.46, top + hh * 0.19, ww * 0.1, '#E4E8F0', '#9AA2B4', '#6B7386'); ctx.fill(); ink(ctx, hh * 0.008, '#4A5060');
    }
    if (!e.solid) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { const yy = top + ((t * 80 + i * hh / 5) % hh); ctx.beginPath(); ctx.moveTo(sx - ww * 0.5, yy); ctx.lineTo(sx + ww * 0.5, yy); ctx.stroke(); } }
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, sx, cy, hh * 0.6, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    const dx = (x - e.sx) / (e.ww * 0.55 + a), dy = (y - (e.base - e.hh * 0.5)) / (e.hh * 0.52 + a);
    if (dx * dx + dy * dy > 1) return null;
    return e.solid ? 'hit' : 'phased';
  },
  center: e => ({ x: e.sx, y: e.base - e.hh * 0.6, r: e.ww * 0.5 })
};

/* -------- Dino: lavender baby dino in a hoodie that waddles toward you -------- */
const dino = {
  hp: 2, pts: 200, hostile: true, color: '#C9B6F7',
  init(e) { e.speed ??= rnd(0.07, 0.09); e.ph = rnd(0, TAU); e.blinkEvery = rnd(2.5, 4); },
  update(e, dt) {
    e.t += dt; approach(e, dt);
    const p = proj(e.x, e.z); e.s = p.s; e.hh = px(0.8, p.s); e.ww = px(0.62, p.s);
    e.sx = p.sx; e.base = p.sy; e.sy = e.base - e.hh * 0.5; e.r = e.ww * 0.5;
  },
  draw(ctx, e, t) {
    const H = e.hh, ph = t * 8 + e.ph, tilt = Math.sin(ph) * 0.1, step = Math.sin(ph), lw = H * 0.012;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, e.sx, e.base - H * 0.05, H * 0.5, 'rgba(180,140,255,0.35)'); ctx.restore();
    ctx.save(); ctx.translate(e.sx, e.base); ctx.rotate(tilt);
    // tail with scale spikes
    const tw = Math.sin(ph * 0.5) * H * 0.05;
    ctx.beginPath(); ctx.moveTo(H * 0.12, -H * 0.3); ctx.quadraticCurveTo(H * 0.45, -H * 0.2, H * 0.55 + tw, -H * 0.04); ctx.quadraticCurveTo(H * 0.35, -H * 0.06, H * 0.12, -H * 0.12); ctx.closePath();
    ctx.fillStyle = '#B9A3EE'; ctx.fill(); ink(ctx, lw, '#6E58B0');
    // legs
    for (const k of [-1, 1]) {
      const lift = Math.max(0, k * step) * H * 0.05;
      ctx.beginPath(); ctx.roundRect(k * H * 0.13 - H * 0.07, -H * 0.13 - lift, H * 0.14, H * 0.13, H * 0.05);
      ctx.fillStyle = '#A992E6'; ctx.fill(); ink(ctx, lw, '#6E58B0');
    }
    // backpack
    ctx.beginPath(); ctx.roundRect(H * 0.12, -H * 0.55, H * 0.2, H * 0.3, H * 0.06); ctx.fillStyle = '#8A7560'; ctx.fill(); ink(ctx, lw, '#4E3E30');
    // hoodie body
    ctx.beginPath(); ctx.ellipse(0, -H * 0.34, H * 0.29, H * 0.25, 0, 0, TAU);
    ctx.fillStyle = soft(ctx, 0, -H * 0.34, H * 0.29, '#F5F0FF', '#DCCCFB', '#B49EEA'); ctx.fill(); ink(ctx, lw, '#6E58B0');
    ctx.beginPath(); ctx.roundRect(-H * 0.13, -H * 0.3, H * 0.26, H * 0.11, H * 0.04); ctx.strokeStyle = 'rgba(110,88,176,0.5)'; ctx.lineWidth = lw; ctx.stroke();
    for (const k of [-1, 1]) {
      seg(ctx, k * H * 0.05, -H * 0.52, k * H * 0.06, -H * 0.4, Math.max(1, lw), '#F5F0FF');
      ctx.save(); ctx.translate(k * H * 0.27, -H * 0.4); ctx.rotate(k * (0.5 + Math.sin(ph + k) * 0.25));
      ctx.beginPath(); ctx.ellipse(0, H * 0.08, H * 0.06, H * 0.11, 0, 0, TAU); ctx.fillStyle = '#D7C6FA'; ctx.fill(); ink(ctx, lw, '#6E58B0'); ctx.restore();
    }
    // hood behind head
    ctx.beginPath(); ctx.arc(0, -H * 0.68, H * 0.3, 0, TAU); ctx.fillStyle = '#E3D6FD'; ctx.fill(); ink(ctx, lw, '#6E58B0');
    // head with scaly ridge
    for (let i = 0; i < 4; i++) { const a = Math.PI * (1.25 + i * 0.17); ctx.beginPath(); ctx.arc(Math.cos(a) * H * 0.24, -H * 0.7 + Math.sin(a) * H * 0.24, H * 0.05, 0, TAU); ctx.fillStyle = '#9A84DA'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, -H * 0.7, H * 0.23, 0, TAU);
    ctx.fillStyle = soft(ctx, 0, -H * 0.7, H * 0.23, '#EAE0FF', '#C8B6F7', '#A28CE0'); ctx.fill(); ink(ctx, lw, '#6E58B0');
    ctx.beginPath(); ctx.ellipse(-H * 0.02, -H * 0.58, H * 0.17, H * 0.1, 0, 0, TAU); ctx.fillStyle = '#E6DCFF'; ctx.fill();
    ctx.fillStyle = 'rgba(110,88,176,0.35)'; for (const [a, b] of [[0.12, -0.82], [0.17, -0.74], [-0.15, -0.8]]) { ctx.beginPath(); ctx.arc(a * H, b * H, H * 0.018, 0, TAU); ctx.fill(); }
    cuteEyes(ctx, 0, -H * 0.73, H * 0.4, ['#E6D0FF', '#5A3E99'], 'mischief', 0.3, (e.t % e.blinkEvery) < 0.12);
    blush(ctx, 0, -H * 0.62, H * 0.4, 0.45);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, H * 0.015);
    ctx.beginPath(); ctx.arc(0, -H * 0.6, H * 0.05, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(H * 0.02, -H * 0.565); ctx.lineTo(H * 0.045, -H * 0.565); ctx.lineTo(H * 0.033, -H * 0.54); ctx.fill();
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, e.sx, e.base - H * 0.5, H * 0.6, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    const dx = (x - e.sx) / (e.ww * 0.55 + a), dy = (y - (e.base - e.hh * 0.5)) / (e.hh * 0.55 + a);
    return dx * dx + dy * dy <= 1 ? 'hit' : null;
  },
  center: e => ({ x: e.sx, y: e.base - e.hh * 0.55, r: e.ww * 0.5 })
};

/* -------- Grub: three-eyed mint caterpillar with a camera; crawls slowly, takes 3 hits -------- */
const grub = {
  hp: 3, pts: 300, hostile: true, color: '#A8E6A0',
  init(e) { e.speed ??= rnd(0.05, 0.065); e.ph = rnd(0, TAU); e.blinkEvery = rnd(2.5, 4); },
  update(e, dt) {
    e.t += dt; approach(e, dt);
    const p = proj(e.x, e.z); e.s = p.s; e.hh = px(0.9, p.s); e.ww = px(0.6, p.s);
    e.sx = p.sx; e.base = p.sy; e.sy = e.base - e.hh * 0.5; e.r = e.ww * 0.5;
  },
  draw(ctx, e, t) {
    const H = e.hh, sq = Math.sin(t * 5 + e.ph), lw = H * 0.011;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, e.sx, e.base - H * 0.4, H * 0.6, 'rgba(150,240,170,0.3)'); ctx.restore();
    ctx.save(); ctx.translate(e.sx, e.base);
    for (const k of [-1, 1]) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(k * H * (0.2 - i * 0.03), -H * (0.04 + i * 0.22), H * 0.05, H * 0.035, 0, 0, TAU); ctx.fillStyle = '#7FC27A'; ctx.fill(); }
    const segs = [[-0.17, 0.3, 0.17], [-0.42, 0.27, 0.15], [-0.62, 0.24, 0.13]];
    segs.forEach(([y, rx, ry], i) => {
      const yy = y * H * (1 + sq * 0.03 * (i + 1)), w = rx * H * (1 - sq * 0.04 * (i % 2 ? -1 : 1));
      ctx.beginPath(); ctx.ellipse(0, yy, w, ry * H, 0, 0, TAU);
      ctx.fillStyle = soft(ctx, 0, yy, w, '#EEFBE4', '#BDE9AE', '#86C97F'); ctx.fill(); ink(ctx, lw, '#4E8A50');
      ctx.fillStyle = 'rgba(90,160,95,0.4)'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * w * 0.65, yy - ry * H * 0.2, H * 0.025, 0, TAU); ctx.fill(); }
      if (i < 2) { ctx.beginPath(); ctx.ellipse(0, yy + ry * H * 0.2, w * 0.55, ry * H * 0.55, 0, 0, TAU); ctx.fillStyle = 'rgba(250,240,200,0.75)'; ctx.fill(); }
    });
    // head
    const hy = -H * 0.83;
    for (const k of [-1, 1]) {
      const bx = k * H * (0.1 + Math.sin(t * 3 + k) * 0.02), by = hy - H * 0.27;
      seg(ctx, k * H * 0.06, hy - H * 0.16, bx, by, Math.max(1, lw * 1.2), '#4E8A50');
      ctx.beginPath(); ctx.arc(bx, by, H * 0.03, 0, TAU); ctx.fillStyle = '#9FDB94'; ctx.fill(); ink(ctx, lw, '#4E8A50');
    }
    ctx.beginPath(); ctx.arc(0, hy, H * 0.2, 0, TAU);
    ctx.fillStyle = soft(ctx, 0, hy, H * 0.2, '#F2FCEA', '#C6EDB8', '#8FD08A'); ctx.fill(); ink(ctx, lw, '#4E8A50');
    const blinking = (e.t % e.blinkEvery) < 0.12;
    cuteEyes(ctx, 0, hy + H * 0.02, H * 0.36, ['#CFF5C4', '#2E7A3A'], 'normal', 0.3, blinking);
    // third eye
    if (!blinking) {
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(0, hy - H * 0.1, H * 0.035, H * 0.04, 0, 0, TAU); ctx.fill(); ink(ctx, lw, INK);
      ctx.fillStyle = '#2E7A3A'; ctx.beginPath(); ctx.arc(0, hy - H * 0.095, H * 0.02, 0, TAU); ctx.fill();
    }
    blush(ctx, 0, hy + H * 0.1, H * 0.36, 0.42);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, lw); ctx.beginPath(); ctx.arc(0, hy + H * 0.11, H * 0.03, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    // camera and stubby hands
    const cyy = -H * 0.45;
    ctx.beginPath(); ctx.roundRect(-H * 0.13, cyy - H * 0.07, H * 0.26, H * 0.15, H * 0.03); ctx.fillStyle = '#4A4E5A'; ctx.fill(); ink(ctx, lw, '#22252C');
    ctx.fillStyle = '#C9CED8'; ctx.fillRect(-H * 0.11, cyy - H * 0.07, H * 0.22, H * 0.035);
    ctx.beginPath(); ctx.arc(0, cyy + H * 0.015, H * 0.05, 0, TAU); ctx.fillStyle = '#20232A'; ctx.fill(); ctx.strokeStyle = '#9AA2B4'; ctx.lineWidth = Math.max(1, lw); ctx.stroke();
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * H * 0.14, cyy + H * 0.02, H * 0.045, 0, TAU); ctx.fillStyle = '#B4E6A6'; ctx.fill(); ink(ctx, lw, '#4E8A50'); }
    if (((t + e.ph) % 3) < 0.14) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.95)'; starPath(ctx, 0, cyy + H * 0.015, H * 0.25, t); ctx.fill(); ctx.restore(); }
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, e.sx, e.base - H * 0.5, H * 0.6, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    const dx = (x - e.sx) / (e.ww * 0.55 + a), dy = (y - (e.base - e.hh * 0.55)) / (e.hh * 0.55 + a);
    return dx * dx + dy * dy <= 1 ? 'hit' : null;
  },
  center: e => ({ x: e.sx, y: e.base - e.hh * 0.6, r: e.ww * 0.5 })
};

/* -------- People: five anime students who walk past, and possessed ones -------- */
export const LOOKS = [
  { hair: 'bob', hc: ['#FFCBDA', '#E88BA6'], top: 'cardigan', tc: '#DDB892', bottom: 'skirt', bc: '#4C5A7C', bow: '#D94A5A', item: 'drink', eye: ['#F0A8C8', '#8A3A6A'] },
  { hair: 'spiky', hc: ['#5570C4', '#1F2B60'], top: 'jacket', tc: '#2E3140', bottom: 'jeans', bc: '#5B7AB0', item: 'wave', eye: ['#8AB0F0', '#2A3F80'] },
  { hair: 'long', hc: ['#C07A55', '#6E3423'], top: 'cardigan', tc: '#ECD6B8', bottom: 'skirt', bc: '#4C5A7C', bow: '#C9604A', item: 'camera', eye: ['#D29466', '#5A2E18'] },
  { hair: 'swept', hc: ['#FFE6A6', '#D9A84E'], top: 'shirt', tc: '#A6A69A', bottom: 'pants', bc: '#3C3D48', item: 'headphones', eye: ['#DEAE62', '#6B4A1A'] },
  { hair: 'wavy', hc: ['#DCCBFF', '#9A7BD9'], top: 'hoodie', tc: '#CDB8F2', bottom: 'skirt', bc: '#4C5A7C', item: 'none', eye: ['#C2A6F0', '#5A3E99'] }
];
const SKIN = [['#FFE9DB', '#F3C6AE'], ['#F8D5BC', '#E8B394'], ['#E9BC98', '#CF9A74'], ['#C99474', '#AB7656']];

function personInit(e) {
  e.dir ??= e.x < 0 ? 1 : -1; e.speed ??= rnd(0.16, 0.22); e.still = true;
  e.look = pick(LOOKS); e.skin = pick(SKIN); e.ph = rnd(0, TAU); e.blinkEvery = rnd(2.5, 4.5);
}
function personUpdate(e, dt) {
  e.t += dt; e.x += e.dir * e.speed * dt;
  if (Math.abs(e.x) > 1.45) e.exited = true;
  const p = proj(e.x, e.z); e.s = p.s;
  e.sx = p.sx; e.base = p.sy; e.hh = px(1.0, p.s); e.ww = px(0.4, p.s);
  e.bob = Math.abs(Math.sin(e.t * 7.5 + e.ph)) * e.hh * 0.018;
  e.sy = e.base - e.hh * 0.5;
  e.headR = e.hh * 0.14; e.headY = e.base - e.hh * 0.8 - e.bob;
  e.spr = px(0.13, p.s);
  e.spx = e.sx + Math.sin(e.t * 3) * e.ww * 0.05; e.spy = e.headY - e.headR * 1.05 - e.spr * 0.75;
}

function hairBack(ctx, L, hx, hy, R, sway, t) {
  ctx.fillStyle = vgrad(ctx, hy - R * 1.2, hy + R * 2.8, L.hc[0], L.hc[1]);
  ctx.beginPath();
  if (L.hair === 'bob') ctx.ellipse(hx, hy + R * 0.2, R * 1.2, R * 1.15, 0, 0, TAU);
  else if (L.hair === 'long') {
    ctx.moveTo(hx - R * 1.15, hy); ctx.arc(hx, hy, R * 1.15, Math.PI, TAU);
    ctx.lineTo(hx + R * 1.1 + sway, hy + R * 2.4); ctx.quadraticCurveTo(hx + sway, hy + R * 2.8, hx - R * 1.1 + sway, hy + R * 2.4);
  } else if (L.hair === 'wavy') {
    ctx.moveTo(hx - R * 1.15, hy); ctx.arc(hx, hy, R * 1.15, Math.PI, TAU);
    for (let i = 1; i <= 6; i++) ctx.lineTo(hx + R * (1.15 + 0.14 * Math.sin(i * 1.7 + t * 3)) + sway * i / 6, hy + i / 6 * R * 2.6);
    ctx.quadraticCurveTo(hx + sway, hy + R * 3.0, hx - R * 1.15 + sway, hy + R * 2.6);
    for (let i = 5; i >= 1; i--) ctx.lineTo(hx - R * (1.15 + 0.14 * Math.sin(i * 1.7 + t * 3 + 1)) + sway * i / 6, hy + i / 6 * R * 2.6);
  } else ctx.arc(hx, hy - R * 0.05, R * 1.1, 0, TAU);
  ctx.closePath(); ctx.fill(); ink(ctx, R * 0.04, 'rgba(60,30,60,0.45)');
}
const FRINGE = {
  bob: [[1.1, 0.25], [0.85, -0.05], [0.55, -0.15], [0.35, 0.0], [0.1, -0.2], [-0.15, 0.0], [-0.4, -0.18], [-0.65, -0.02], [-0.9, -0.12]],
  spiky: [[0.8, -0.1], [0.55, 0.1], [0.35, -0.25], [0.1, 0.05], [-0.15, -0.25], [-0.4, 0.05], [-0.7, -0.2]],
  long: [[1.1, 0.4], [0.8, 0.05], [0.45, -0.35], [0.2, -0.05], [-0.1, -0.4], [-0.5, -0.1], [-0.85, 0.1]],
  swept: [[1.0, 0.1], [0.6, -0.45], [0.3, -0.2], [-0.1, -0.35], [-0.5, -0.05], [-0.85, 0.0]],
  wavy: [[1.1, 0.4], [0.75, 0.0], [0.5, -0.3], [0.2, -0.1], [-0.05, -0.38], [-0.4, -0.1], [-0.8, 0.05]]
};
function hairFront(ctx, L, hx, hy, R, sway) {
  ctx.fillStyle = vgrad(ctx, hy - R * 1.5, hy + R * 0.6, L.hc[0], L.hc[1]);
  ctx.beginPath(); ctx.moveTo(hx - R * 1.1, hy + R * 0.25);
  if (L.hair === 'spiky') {
    [[-1.25, -0.3], [-1.0, -0.75], [-1.2, -1.15], [-0.55, -1.05], [-0.45, -1.6], [0.0, -1.15], [0.35, -1.65], [0.5, -1.1], [1.1, -1.35], [0.95, -0.7], [1.3, -0.4], [1.1, 0.25]]
      .forEach(([a, b]) => ctx.lineTo(hx + a * R + (b < -1 ? sway * 0.4 : 0), hy + b * R));
  } else ctx.arc(hx, hy - R * 0.05, R * 1.12, Math.PI * 0.94, Math.PI * 2.06);
  FRINGE[L.hair].forEach(([a, b]) => ctx.lineTo(hx + a * R, hy + b * R));
  ctx.closePath(); ctx.fill(); ink(ctx, R * 0.04, 'rgba(60,30,60,0.45)');
  if (L.hair === 'bob' || L.hair === 'long' || L.hair === 'wavy') {
    const len = L.hair === 'bob' ? 0.95 : 1.5;
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(hx + k * R * 1.12, hy - R * 0.05); ctx.lineTo(hx + k * R * 1.06 + sway * 0.6, hy + R * len); ctx.lineTo(hx + k * R * 0.78, hy + R * 0.25); ctx.closePath();
      ctx.fill(); ink(ctx, R * 0.035, 'rgba(60,30,60,0.4)');
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, R * 0.09);
  ctx.beginPath(); ctx.arc(hx - R * 0.15, hy - R * 0.5, R * 0.55, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
}

function drawPerson(ctx, e, t) {
  const L = e.look, { sx, base, hh: U, headR: R, headY: hy } = e, dir = e.dir || 1;
  const ph = e.t * 7.5 + e.ph, sw = Math.sin(ph), possessed = e.type === 'possessed';
  const hipY = base - U * 0.42 - e.bob, shY = base - U * 0.65 - e.bob, legL = U * 0.4, armL = U * 0.24;
  const legA = sw * 0.38 * dir, sway = -dir * Math.sin(ph - 0.6) * R * 0.18, OL = 'rgba(60,30,60,0.5)', lw = U * 0.01;
  const skin = e.skin[0];

  hairBack(ctx, L, sx, hy, R, sway, t);

  // legs
  for (const k of [-1, 1]) {
    const a = k < 0 ? legA : -legA, hipX = sx + k * U * 0.06;
    const fx = hipX + Math.sin(a) * legL, fy = hipY + Math.cos(a) * legL - (a * dir > 0 ? U * 0.025 * Math.abs(sw) : 0);
    if (L.bottom === 'skirt') {
      seg(ctx, hipX, hipY, fx, fy, U * 0.07, skin);
      const mx = hipX + (fx - hipX) * 0.55, my = hipY + (fy - hipY) * 0.55;
      seg(ctx, mx, my, fx, fy, U * 0.072, '#2C2E3E');
    } else seg(ctx, hipX, hipY, fx, fy, U * 0.085, L.bc);
    ctx.beginPath(); ctx.ellipse(fx + dir * U * 0.015, fy + U * 0.005, U * 0.05, U * 0.024, 0, 0, TAU); ctx.fillStyle = '#4A3434'; ctx.fill();
  }

  // arms behind the body
  const shoulder = k => sx + k * U * 0.15;
  const armEnd = (k, ang) => [shoulder(k) + Math.sin(ang) * armL, shY + U * 0.02 + Math.cos(ang) * armL];
  const holdsFront = L.item === 'drink' || L.item === 'camera';
  {
    const [hx2, hy2] = armEnd(-1, -legA * 0.9 - 0.12);
    seg(ctx, shoulder(-1), shY + U * 0.02, hx2, hy2, U * 0.065, L.tc);
    ctx.beginPath(); ctx.arc(hx2, hy2, U * 0.028, 0, TAU); ctx.fillStyle = skin; ctx.fill();
  }

  // torso
  const torso = () => {
    ctx.beginPath();
    ctx.moveTo(sx - U * 0.14, shY); ctx.quadraticCurveTo(sx, shY - U * 0.03, sx + U * 0.14, shY);
    ctx.lineTo(sx + U * 0.125, hipY + U * 0.02); ctx.quadraticCurveTo(sx, hipY + U * 0.04, sx - U * 0.125, hipY + U * 0.02); ctx.closePath();
  };
  torso(); ctx.fillStyle = soft(ctx, sx, (shY + hipY) / 2, U * 0.16, lighten(L.tc), L.tc, darken(L.tc)); ctx.fill(); ink(ctx, lw, OL);
  if (L.top === 'cardigan') {
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(sx - U * 0.05, shY - U * 0.01); ctx.lineTo(sx + U * 0.05, shY - U * 0.01); ctx.lineTo(sx, shY + U * 0.11); ctx.fill();
    ctx.fillStyle = L.bow;
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx, shY + U * 0.02); ctx.lineTo(sx + k * U * 0.05, shY - U * 0.005); ctx.lineTo(sx + k * U * 0.05, shY + U * 0.045); ctx.fill(); }
    ctx.fillStyle = 'rgba(90,60,40,0.5)'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx + U * 0.012, shY + U * (0.13 + i * 0.035), U * 0.008, 0, TAU); ctx.fill(); }
  } else if (L.top === 'jacket') {
    ctx.fillStyle = '#F4F4F6'; ctx.fillRect(sx - U * 0.045, shY, U * 0.09, hipY - shY + U * 0.015);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = Math.max(1, lw);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx + k * U * 0.045, shY); ctx.lineTo(sx + k * U * 0.045, hipY + U * 0.02); ctx.stroke(); }
  } else if (L.top === 'shirt') {
    ctx.fillStyle = '#E9E9E2'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx, shY + U * 0.03); ctx.lineTo(sx + k * U * 0.055, shY - U * 0.01); ctx.lineTo(sx + k * U * 0.03, shY + U * 0.05); ctx.fill(); }
    ctx.strokeStyle = 'rgba(60,60,50,0.4)'; ctx.lineWidth = Math.max(1, lw); ctx.strokeRect(sx - U * 0.09, shY + U * 0.07, U * 0.05, U * 0.05);
  } else if (L.top === 'hoodie') {
    ctx.fillStyle = darken(L.tc); ctx.beginPath(); ctx.ellipse(sx, shY, U * 0.11, U * 0.04, 0, 0, TAU); ctx.fill();
    for (const k of [-1, 1]) seg(ctx, sx + k * U * 0.03, shY + U * 0.01, sx + k * U * 0.035, shY + U * 0.09, Math.max(1, lw), '#FFFFFF');
    ctx.strokeStyle = 'rgba(80,60,120,0.4)'; ctx.lineWidth = Math.max(1, lw); ctx.beginPath(); ctx.roundRect(sx - U * 0.07, hipY - U * 0.07, U * 0.14, U * 0.06, U * 0.02); ctx.stroke();
  }
  if (L.bottom === 'skirt') {
    const flare = sw * U * 0.012;
    ctx.beginPath(); ctx.moveTo(sx - U * 0.125, hipY - U * 0.01); ctx.lineTo(sx + U * 0.125, hipY - U * 0.01);
    ctx.lineTo(sx + U * 0.17 + flare, hipY + U * 0.13); ctx.lineTo(sx - U * 0.17 + flare, hipY + U * 0.13); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, hipY, hipY + U * 0.13, '#5C6A8E', L.bc); ctx.fill(); ink(ctx, lw, OL);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = Math.max(1, lw);
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx + i * U * 0.05, hipY); ctx.lineTo(sx + i * U * 0.068 + flare, hipY + U * 0.125); ctx.stroke(); }
  } else { ctx.fillStyle = '#3A2E2A'; ctx.fillRect(sx - U * 0.125, hipY - U * 0.01, U * 0.25, U * 0.02); }

  // front arm: swinging, waving, or holding an item
  let hand;
  if (L.item === 'wave' && !possessed) {
    const ang = Math.PI - 0.5 + Math.sin(e.t * 10) * 0.35; hand = armEnd(1, ang);
  } else if (holdsFront) hand = [sx + U * 0.03, shY + U * 0.13];
  else hand = armEnd(1, legA * 0.9 + 0.12);
  seg(ctx, shoulder(1), shY + U * 0.02, hand[0], hand[1], U * 0.065, L.tc);
  ctx.beginPath(); ctx.arc(hand[0], hand[1], U * 0.028, 0, TAU); ctx.fillStyle = skin; ctx.fill();
  if (L.item === 'drink') {
    ctx.fillStyle = '#9CCB7E'; ctx.beginPath(); ctx.moveTo(hand[0] - U * 0.03, hand[1] - U * 0.06); ctx.lineTo(hand[0] + U * 0.03, hand[1] - U * 0.06); ctx.lineTo(hand[0] + U * 0.022, hand[1] + U * 0.03); ctx.lineTo(hand[0] - U * 0.022, hand[1] + U * 0.03); ctx.fill(); ink(ctx, lw, OL);
    seg(ctx, hand[0] + U * 0.005, hand[1] - U * 0.06, hand[0] + U * 0.02, hand[1] - U * 0.11, Math.max(1, lw * 1.5), '#4FA35A');
  } else if (L.item === 'camera') {
    ctx.beginPath(); ctx.roundRect(hand[0] - U * 0.05, hand[1] - U * 0.035, U * 0.1, U * 0.06, U * 0.012); ctx.fillStyle = '#3E4250'; ctx.fill();
    ctx.beginPath(); ctx.arc(hand[0], hand[1], U * 0.02, 0, TAU); ctx.fillStyle = '#9AA2B4'; ctx.fill();
  }

  // neck and head
  ctx.fillStyle = e.skin[1]; ctx.fillRect(sx - U * 0.025, hy + R * 0.8, U * 0.05, shY - hy - R * 0.8 + U * 0.01);
  if (L.item === 'headphones') {
    ctx.strokeStyle = '#C9CED8'; ctx.lineWidth = Math.max(1.5, U * 0.018); ctx.beginPath(); ctx.arc(sx, shY - U * 0.01, U * 0.075, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx + k * U * 0.075, shY, U * 0.03, U * 0.035, 0, 0, TAU); ctx.fillStyle = '#8890A2'; ctx.fill(); ink(ctx, lw, OL); }
  }
  ctx.beginPath(); ctx.ellipse(sx, hy, R, R * 1.02, 0, 0, TAU);
  ctx.fillStyle = soft(ctx, sx, hy, R, '#FFF6EF', e.skin[0], e.skin[1]); ctx.fill(); ink(ctx, lw, OL);
  const blinking = !possessed && (e.t % e.blinkEvery) < 0.12;
  const happy = !possessed && L.item === 'wave';
  cuteEyes(ctx, sx, hy + R * 0.15, R * 1.05, L.eye, possessed ? 'glow' : (happy ? 'happy' : 'normal'), 0.36, blinking);
  if (!possessed) blush(ctx, sx, hy + R * 0.48, R, 0.5);
  if (possessed) {
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, R * 0.05); ctx.beginPath(); ctx.moveTo(sx - R * 0.15, hy + R * 0.58);
    ctx.quadraticCurveTo(sx - R * 0.05, hy + R * 0.52, sx, hy + R * 0.58); ctx.quadraticCurveTo(sx + R * 0.05, hy + R * 0.64, sx + R * 0.15, hy + R * 0.58); ctx.stroke();
  } else {
    ctx.fillStyle = '#B8434F'; ctx.beginPath(); ctx.arc(sx, hy + R * 0.52, R * 0.14, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF9DAA'; ctx.beginPath(); ctx.ellipse(sx, hy + R * 0.6, R * 0.07, R * 0.04, 0, 0, TAU); ctx.fill();
  }
  hairFront(ctx, L, sx, hy, R, sway);
  hitFlash(ctx, e, () => { ctx.fillStyle = 'rgba(255,59,92,0.8)'; ctx.fillRect(sx - U * 0.2, base - U, U * 0.4, U); });
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(h, k) { const [r, g, b] = hexToRgb(h), f = c => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)); return `rgb(${f(r)},${f(g)},${f(b)})`; }
function lighten(h) { return mix(h, 0.35); }
function darken(h) { return mix(h, -0.25); }
function personHit(e, x, y) { return Math.abs(x - e.sx) < e.hh * 0.2 && y > e.headY - e.headR && y < e.base; }

const civilian = {
  hp: 1, pts: 0, hostile: false, color: '#6FF3FF',
  init: personInit, update: personUpdate, draw: drawPerson,
  hit: (e, x, y) => personHit(e, x, y) ? 'person' : null,
  center: e => ({ x: e.sx, y: e.sy, r: e.hh * 0.2 })
};

// Possessed: a blue fluffy cat-imp hugs the person's head. Shoot the imp, not the person.
const possessed = {
  hp: 1, pts: 300, hostile: true, color: '#8FB4FF',
  init: personInit, update: personUpdate,
  draw(ctx, e, t) {
    drawPerson(ctx, e, t);
    const r = e.spr * (1 + Math.sin(t * 5) * 0.05), x = e.spx, y = e.spy, lw = r * 0.05;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 2.5, 'rgba(120,170,255,0.5)'); ctx.restore();
    for (const k of [-1, 1]) {
      seg(ctx, x + k * r * 0.6, y + r * 0.45, e.sx + k * e.headR * 1.0, e.headY - e.headR * 0.45, r * 0.4, '#6E9BEA');
      ctx.beginPath(); ctx.arc(e.sx + k * e.headR * 1.0, e.headY - e.headR * 0.45, r * 0.26, 0, TAU); ctx.fillStyle = '#A9C8FF'; ctx.fill(); ink(ctx, lw, '#3A5AA8');
    }
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + k * r * 0.3, y - r * 0.65); ctx.lineTo(x + k * r * 0.85, y - r * 1.4); ctx.lineTo(x + k * r * 0.92, y - r * 0.35); ctx.closePath();
      ctx.fillStyle = '#6E9BEA'; ctx.fill(); ink(ctx, lw, '#3A5AA8');
      ctx.beginPath(); ctx.moveTo(x + k * r * 0.45, y - r * 0.62); ctx.lineTo(x + k * r * 0.8, y - r * 1.15); ctx.lineTo(x + k * r * 0.82, y - r * 0.5); ctx.closePath(); ctx.fillStyle = '#FFB3C8'; ctx.fill();
    }
    fluff(ctx, x, y, r, r * 0.9, 14, 0.13);
    ctx.fillStyle = soft(ctx, x, y, r, '#CFE0FF', '#86AEF2', '#5079D0'); ctx.fill(); ink(ctx, lw, '#3A5AA8');
    cuteEyes(ctx, x, y - r * 0.12, r * 1.3, ['#fff', '#000'], 'happy', 0.3);
    blush(ctx, x, y + r * 0.12, r, 0.45);
    fangGrin(ctx, x, y + r * 0.2, r * 1.4);
  },
  hit(e, x, y, a) {
    if (Math.hypot(x - e.spx, y - e.spy) < e.spr * 1.45 + a * 0.7) return 'spirit';
    return personHit(e, x, y) ? 'person' : null;
  },
  center: e => ({ x: e.spx, y: e.spy, r: e.spr * 1.25 })
};

/* -------- Training lantern: stationary target for the tutorial -------- */
const lantern = {
  hp: 1, pts: 50, hostile: true, color: '#FFB547',
  init(e) { e.still = true; e.h ??= 1.1; },
  update(e, dt) {
    e.t += dt; e.ripple = Math.max(0, (e.ripple || 0) - dt * 2);
    const p = proj(e.x, e.z); e.sx = p.sx; e.sy = p.sy - px(e.h + Math.sin(e.t * 1.5) * 0.04, p.s); e.r = px(0.22, p.s);
  },
  draw(ctx, e, t) {
    const { sx, sy, r } = e, lw = r * 0.1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx, sy, r * 2.6, 'rgba(255,150,60,0.45)'); ctx.restore();
    const body = () => { ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.8, r, 0, 0, TAU); };
    body(); ctx.fillStyle = '#FF8A3C'; ctx.fill(); shade(ctx, body, sx + r * 0.3, 'rgba(120,30,0,0.25)');
    ctx.strokeStyle = 'rgba(120,40,10,.55)'; ctx.lineWidth = 1;
    for (const k of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.8 * Math.cos(k * 1.2), r, 0, 0, TAU); ctx.stroke(); }
    body(); ink(ctx, lw);
    ctx.fillStyle = INK; ctx.fillRect(sx - r * 0.42, sy - r * 1.12, r * 0.84, r * 0.2); ctx.fillRect(sx - r * 0.42, sy + r * 0.92, r * 0.84, r * 0.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,0.9)';
    starPath(ctx, sx - r * 0.35, sy - r * 0.4, r * 0.35 * (0.7 + 0.3 * Math.sin(t * 4)), t); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * (e.armored ? 1.2 : 0.6));
    ctx.strokeStyle = e.armored ? `rgba(111,243,255,${0.7 + (e.ripple || 0) * 0.3})` : 'rgba(255,214,150,.5)';
    ctx.lineWidth = e.armored ? 2.5 + (e.ripple || 0) * 3 : 1.2;
    const R = r * (e.armored ? 1.7 + (e.ripple || 0) * 0.3 : 1.5);
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); } ctx.stroke();
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, sx, sy, r * 2, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    if (Math.hypot(x - e.sx, y - e.sy) > e.r * (e.armored ? 1.7 : 1.3) + a) return null;
    return e.armored ? 'armor' : 'hit';
  },
  center: e => ({ x: e.sx, y: e.sy, r: e.r * 1.4 })
};

export const TYPES = { wisp, phantom, dino, grub, civilian, possessed, lantern };

export function makeEnemy(spec) {
  const T = TYPES[spec.type];
  const e = { x: 0, z: 0.8, ...spec, t: 0, hp: spec.hp ?? T.hp, flash: 0, state: 'move', sx: 0, sy: 0, r: 0 };
  T.init?.(e); T.update(e, 0);
  return e;
}
