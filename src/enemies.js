// Every entity type lives here. To add a new ghoul: add an entry to TYPES with
// hp, pts, hostile, init(e), update(e, dt), draw(ctx, e, t), hit(e, x, y, assist), center(e).
// hit() returns 'hit' | 'spirit' | 'person' | 'phased' | 'armor' | null.
// Art style: cel-shaded anime. Flat fills, one hard shadow band, dark ink outlines, big expressive eyes.
import { proj, px, glow, starPath } from './view.js';

const TAU = Math.PI * 2, INK = '#120A24';
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
function ink(ctx, w) { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, w); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function shade(ctx, pathFn, x0, color = 'rgba(20,6,50,0.28)') {
  ctx.save(); pathFn(); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(x0, -1e4, 2e4, 2e4); ctx.restore();
}

// Big anime eyes: white, colored iris, pupil, sparkle highlight, optional angry brows.
export function animeEyes(ctx, cx, cy, s, iris, angry = true, spacing = 0.24) {
  for (const k of [-1, 1]) {
    const ex = cx + k * s * spacing, ey = cy;
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.14, s * 0.18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();
    ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(ex - k * s * 0.02, ey + s * 0.03, s * 0.095, s * 0.135, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex - k * s * 0.02, ey + s * 0.045, s * 0.045, s * 0.07, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex - k * s * 0.05, ey - s * 0.04, s * 0.035, 0, TAU); ctx.fill();
    if (angry) {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex + k * s * 0.17, ey - s * 0.27); ctx.lineTo(ex - k * s * 0.1, ey - s * 0.18); ctx.stroke();
    }
  }
}

/* -------- Wisp: a flame spirit with a cheeky angry face -------- */
function flamePath(ctx, x, y, r, sway, stretch) {
  const tx = x + sway, ty = y - r * stretch;
  ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.bezierCurveTo(x + r * 0.35 + sway * 0.5, y - r * 1.25, x + r * 1.08, y - r * 0.75, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI, false);
  ctx.bezierCurveTo(x - r * 1.08, y - r * 0.75, x - r * 0.35 + sway * 0.5, y - r * 1.25, tx, ty);
  ctx.closePath();
}
const wisp = {
  hp: 1, pts: 100, hostile: true, color: '#C77DFF',
  init(e) {
    e.speed ??= rnd(0.1, 0.14); e.h ??= rnd(0.9, 1.4); e.wa = rnd(0.12, 0.3); e.wf = rnd(1.5, 2.6); e.ph = rnd(0, TAU);
    e.trail = []; if (e.drop) { e.dropH = e.h; e.h = 3.2; }
  },
  update(e, dt) {
    e.t += dt; approach(e, dt);
    if (e.drop && e.h > e.dropH) e.h = Math.max(e.dropH, e.h - dt * 2.4);
    e.xr = e.x + (e.still ? 0 : Math.sin(e.t * e.wf + e.ph) * e.wa);
    const p = proj(e.xr, e.z);
    e.sx = p.sx; e.sy = p.sy - px(e.h + Math.sin(e.t * 3) * 0.06, p.s); e.r = px(0.24, p.s);
    e.trail.unshift([e.sx, e.sy]); if (e.trail.length > 8) e.trail.pop();
  },
  draw(ctx, e, t) {
    const r = e.r, x = e.sx, y = e.sy, sway = Math.sin(t * 7 + e.ph) * r * 0.35, st = 2.0 + Math.sin(t * 13 + e.ph) * 0.18;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y - r * 0.3, r * 2.8, 'rgba(160,80,255,0.45)');
    e.trail.forEach((p, i) => { if (i % 2) return; ctx.fillStyle = `rgba(255,190,255,${0.55 - i * 0.06})`; starPath(ctx, p[0], p[1] + r * 0.6, r * 0.28, t * 3 + i); ctx.fill(); });
    ctx.restore();
    flamePath(ctx, x, y, r, sway, st); ctx.fillStyle = '#9B4DFF'; ctx.fill(); ink(ctx, r * 0.13);
    flamePath(ctx, x, y + r * 0.16, r * 0.74, sway * 0.7, st * 0.9); ctx.fillStyle = '#FF7AD9'; ctx.fill();
    ctx.fillStyle = '#FFF0FF'; ctx.beginPath(); ctx.arc(x, y + r * 0.14, r * 0.62, 0, TAU); ctx.fill();
    animeEyes(ctx, x, y + r * 0.06, r, '#7A1FD1');
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y + r * 0.44, r * 0.13, r * 0.08, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(x + r * 0.02, y + r * 0.37); ctx.lineTo(x + r * 0.1, y + r * 0.37); ctx.lineTo(x + r * 0.06, y + r * 0.47); ctx.fill();
    hitFlash(ctx, e, () => glow(ctx, x, y, r * 2, 'rgba(255,255,255,1)'));
  },
  hit: (e, x, y, a) => Math.hypot(x - e.sx, y - (e.sy - e.r * 0.3)) < e.r * 1.35 + a ? 'hit' : null,
  center: e => ({ x: e.sx, y: e.sy - e.r * 0.2, r: e.r * 1.2 })
};

/* -------- Phantom: masked, cloaked ghoul with long sleeves; only solid part of the time -------- */
const phantom = {
  hp: 2, pts: 250, hostile: true, color: '#FF4FB0',
  init(e) { e.speed ??= rnd(0.06, 0.08); e.pt = rnd(0, 2.4); e.alpha = 1; },
  update(e, dt) {
    e.t += dt; e.pt += dt; approach(e, dt);
    const cyc = e.pt % 2.6; e.solid = cyc < 1.5 || e.state === 'attack';
    e.alpha += ((e.solid ? 1 : 0.16) - e.alpha) * Math.min(1, dt * 8);
    const p = proj(e.x + Math.sin(e.t * 0.8) * 0.08, e.z);
    e.s = p.s; e.hh = px(1.35, p.s); e.ww = px(0.8, p.s);
    e.sx = p.sx; e.base = p.sy - px(0.12 + Math.sin(e.t * 2) * 0.04, p.s); e.sy = e.base - e.hh * 0.55; e.r = e.ww * 0.5;
  },
  draw(ctx, e, t) {
    const { sx, base, hh, ww } = e, top = base - hh, sway = Math.sin(t * 2 + e.pt) * ww * 0.08, lw = hh * 0.022;
    ctx.save(); ctx.globalAlpha = e.alpha;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx, base - hh * 0.5, hh * 0.85, 'rgba(255,79,176,0.22)'); ctx.restore();
    // sleeves with claws
    for (const k of [-1, 1]) {
      const shx = sx + k * ww * 0.3, shy = top + hh * 0.3, hx = sx + k * ww * 0.66 + sway, hy = top + hh * 0.64;
      ctx.beginPath(); ctx.moveTo(shx, shy - hh * 0.04);
      ctx.quadraticCurveTo(sx + k * ww * 0.62, shy, hx + k * ww * 0.08, hy);
      ctx.lineTo(hx - k * ww * 0.14, hy + hh * 0.05);
      ctx.quadraticCurveTo(sx + k * ww * 0.36, shy + hh * 0.2, shx, shy + hh * 0.14); ctx.closePath();
      ctx.fillStyle = '#33156A'; ctx.fill(); ink(ctx, lw);
      ctx.strokeStyle = '#EADCFF'; ctx.lineWidth = Math.max(1, lw * 0.9);
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hx + i * ww * 0.03, hy + hh * 0.03); ctx.lineTo(hx + i * ww * 0.05, hy + hh * 0.09); ctx.stroke(); }
    }
    const cloak = () => {
      ctx.beginPath(); ctx.moveTo(sx, top);
      ctx.bezierCurveTo(sx + ww * 0.5, top + hh * 0.04, sx + ww * 0.4, top + hh * 0.45, sx + ww * 0.56 + sway, base);
      for (let i = 5; i >= 0; i--) ctx.lineTo(sx - ww * 0.56 + ww * 1.12 * i / 5 + sway * (i / 5), base - (i % 2 ? hh * 0.09 : 0) - Math.sin(t * 6 + i) * hh * 0.025);
      ctx.bezierCurveTo(sx - ww * 0.4, top + hh * 0.45, sx - ww * 0.5, top + hh * 0.04, sx, top); ctx.closePath();
    };
    cloak(); ctx.fillStyle = '#4A1E8E'; ctx.fill();
    shade(ctx, cloak, sx + ww * 0.1);
    cloak(); ink(ctx, lw);
    // hood darkness and porcelain mask
    ctx.fillStyle = '#0B0420'; ctx.beginPath(); ctx.ellipse(sx, top + hh * 0.22, ww * 0.25, hh * 0.15, 0, 0, TAU); ctx.fill();
    const my = top + hh * 0.22;
    ctx.fillStyle = '#F4EEFF'; ctx.beginPath(); ctx.ellipse(sx, my, ww * 0.18, hh * 0.12, 0, 0, TAU); ctx.fill(); ink(ctx, lw * 0.8);
    ctx.strokeStyle = '#FF4FB0'; ctx.lineWidth = Math.max(1, lw);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sx + k * ww * 0.07, my + hh * 0.02); ctx.lineTo(sx + k * ww * 0.09, my + hh * 0.08); ctx.stroke(); }
    for (const k of [-1, 1]) {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(sx + k * ww * 0.075, my - hh * 0.02, ww * 0.05, hh * 0.03, k * 0.45, 0, TAU); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx + k * ww * 0.075, my - hh * 0.02, ww * 0.1, 'rgba(255,79,176,0.9)'); ctx.restore();
      ctx.fillStyle = '#FFD6EF'; ctx.beginPath(); ctx.arc(sx + k * ww * 0.075, my - hh * 0.02, Math.max(1, ww * 0.018), 0, TAU); ctx.fill();
    }
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, sx, base - hh * 0.5, hh * 0.6, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    const dx = (x - e.sx) / (e.ww * 0.55 + a), dy = (y - (e.base - e.hh * 0.5)) / (e.hh * 0.5 + a);
    if (dx * dx + dy * dy > 1) return null;
    return e.solid ? 'hit' : 'phased';
  },
  center: e => ({ x: e.sx, y: e.base - e.hh * 0.6, r: e.ww * 0.5 })
};

/* -------- People: civilians and possessed shoppers (anime chibi proportions) -------- */
const JACKETS = ['#3E7CB1', '#E0A93B', '#8E5BA8', '#3FA37A', '#D2575B', '#5F6C8C', '#F07FB0'];
const SKIN = ['#F6D2B4', '#E2B08A', '#C48A60', '#8E5A38', '#FBE0CA'];
const HAIR = ['#2B1B3D', '#6B3E26', '#1A1A2E', '#C48B4A', '#7A2E4A', '#3B5BA8'];
function personInit(e) {
  e.dir ??= e.x < 0 ? 1 : -1; e.speed ??= rnd(0.16, 0.22); e.still = true;
  e.color = pick(JACKETS); e.skin = pick(SKIN); e.hair = pick(HAIR); e.hs = Math.floor(Math.random() * 3);
}
function personUpdate(e, dt) {
  e.t += dt; e.x += e.dir * e.speed * dt;
  if (Math.abs(e.x) > 1.45) e.exited = true;
  const p = proj(e.x, e.z); e.s = p.s;
  e.sx = p.sx; e.base = p.sy; e.hh = px(0.95, p.s); e.ww = px(0.36, p.s);
  e.bob = Math.abs(Math.sin(e.t * 7)) * e.hh * 0.02;
  e.sy = e.base - e.hh * 0.5;
  e.headR = e.hh * 0.135; e.headY = e.base - e.hh * 0.8 - e.bob;
  e.spr = px(0.2, p.s);
  e.spx = e.sx + Math.sin(e.t * 3) * e.ww * 0.06; e.spy = e.headY - e.headR - e.spr * 0.55;
}
function drawHair(ctx, e, R, hy, lw) {
  const { sx } = e;
  ctx.beginPath();
  if (e.hs === 0) { // spiky
    ctx.moveTo(sx - R * 1.08, hy + R * 0.15);
    const spikes = [[-1.15, -0.5], [-0.75, -0.55], [-0.85, -1.25], [-0.3, -0.85], [-0.15, -1.45], [0.25, -0.9], [0.55, -1.35], [0.7, -0.6], [1.2, -0.75], [1.05, 0.15]];
    spikes.forEach(([a, b]) => ctx.lineTo(sx + a * R, hy + b * R));
    ctx.quadraticCurveTo(sx + R * 0.4, hy - R * 0.4, sx - R * 1.08, hy + R * 0.15);
  } else if (e.hs === 1) { // bob with bangs
    ctx.moveTo(sx - R * 1.12, hy + R * 0.75); ctx.lineTo(sx - R * 1.12, hy);
    ctx.arc(sx, hy, R * 1.12, Math.PI, 0); ctx.lineTo(sx + R * 1.12, hy + R * 0.75); ctx.lineTo(sx + R * 0.75, hy + R * 0.75);
    ctx.quadraticCurveTo(sx + R * 0.7, hy - R * 0.3, sx, hy - R * 0.4);
    ctx.quadraticCurveTo(sx - R * 0.7, hy - R * 0.3, sx - R * 0.75, hy + R * 0.75);
  } else { // short with side part
    ctx.moveTo(sx - R * 1.05, hy + R * 0.05); ctx.arc(sx, hy - R * 0.05, R * 1.08, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineTo(sx + R * 0.95, hy + R * 0.1); ctx.lineTo(sx + R * 0.4, hy - R * 0.45); ctx.lineTo(sx + R * 0.1, hy - R * 0.2);
    ctx.lineTo(sx - R * 0.3, hy - R * 0.5);
  }
  ctx.closePath(); ctx.fillStyle = e.hair; ctx.fill(); ink(ctx, lw);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, lw * 0.8);
  ctx.beginPath(); ctx.arc(sx - R * 0.2, hy - R * 0.55, R * 0.4, Math.PI * 1.15, Math.PI * 1.55); ctx.stroke();
}
function drawPerson(ctx, e, t) {
  const { sx, base, hh, ww, headR: R, headY: hy } = e, b = e.bob, step = Math.sin(e.t * 7) * ww * 0.15, lw = hh * 0.02;
  // legs and shoes
  for (const [o, st] of [[-0.18, step], [0.02, -step]]) {
    ctx.beginPath(); ctx.rect(sx + o * ww + st, base - hh * 0.42, ww * 0.17, hh * 0.4); ctx.fillStyle = '#272B48'; ctx.fill(); ink(ctx, lw * 0.8);
    ctx.beginPath(); ctx.ellipse(sx + o * ww + st + ww * 0.09, base - hh * 0.015, ww * 0.13, hh * 0.025, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
  }
  // body with cel shadow
  const body = () => { ctx.beginPath(); ctx.roundRect(sx - ww / 2, base - hh * 0.68 - b, ww, hh * 0.32, ww * 0.22); };
  body(); ctx.fillStyle = e.color; ctx.fill(); shade(ctx, body, sx + ww * 0.12); body(); ink(ctx, lw);
  // head
  const head = () => { ctx.beginPath(); ctx.arc(sx, hy, R, 0, TAU); };
  head(); ctx.fillStyle = e.skin; ctx.fill(); shade(ctx, head, sx + R * 0.45, 'rgba(120,40,40,0.15)'); head(); ink(ctx, lw);
  // eyes
  const possessed = e.type === 'possessed';
  for (const k of [-1, 1]) {
    const ex = sx + k * R * 0.38, ey = hy + R * 0.18;
    if (possessed) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, ex, ey, R * 0.35, 'rgba(199,125,255,0.9)'); ctx.restore();
      ctx.fillStyle = '#F2D9FF'; ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.13, R * 0.17, 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.12, R * 0.18, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(ex - R * 0.04, ey - R * 0.07, R * 0.05, 0, TAU); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,120,140,0.35)';
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx + k * R * 0.55, hy + R * 0.45, R * 0.15, R * 0.08, 0, 0, TAU); ctx.fill(); }
  drawHair(ctx, e, R, hy, lw);
  hitFlash(ctx, e, () => { ctx.fillStyle = 'rgba(255,59,92,0.8)'; ctx.fillRect(sx - ww / 2, base - hh, ww, hh); });
}
function personHit(e, x, y) { return Math.abs(x - e.sx) < e.ww * 0.55 && y > e.headY - e.headR && y < e.base; }

const civilian = {
  hp: 1, pts: 0, hostile: false, color: '#6FF3FF',
  init: personInit, update: personUpdate, draw: drawPerson,
  hit: (e, x, y) => personHit(e, x, y) ? 'person' : null,
  center: e => ({ x: e.sx, y: e.sy, r: e.ww * 0.5 })
};

// Possessed: an imp spirit clings to the person's head. Shoot the imp, not the person.
const possessed = {
  hp: 1, pts: 300, hostile: true, color: '#C77DFF',
  init: personInit, update: personUpdate,
  draw(ctx, e, t) {
    drawPerson(ctx, e, t);
    const r = e.spr * (1 + Math.sin(t * 5) * 0.06), x = e.spx, y = e.spy, lw = r * 0.12;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 2.6, 'rgba(160,80,255,0.55)'); ctx.restore();
    // claws gripping the head
    ctx.strokeStyle = '#7B3FE0'; ctx.lineWidth = Math.max(2, r * 0.28); ctx.lineCap = 'round';
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.6, y + r * 0.4); ctx.quadraticCurveTo(x + k * e.headR * 1.4, e.headY - e.headR * 0.6, x + k * e.headR * 1.0, e.headY); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, lw * 0.7);
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.6, y + r * 0.4); ctx.quadraticCurveTo(x + k * e.headR * 1.4, e.headY - e.headR * 0.6, x + k * e.headR * 1.0, e.headY); ctx.stroke(); }
    // horns
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + k * r * 0.35, y - r * 0.7); ctx.lineTo(x + k * r * 0.85, y - r * 1.5); ctx.lineTo(x + k * r * 0.75, y - r * 0.55); ctx.closePath();
      ctx.fillStyle = '#FFE8C2'; ctx.fill(); ink(ctx, lw);
    }
    const blob = () => { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.92, 0, 0, TAU); };
    blob(); ctx.fillStyle = '#8A4BEA'; ctx.fill(); shade(ctx, blob, x + r * 0.3); blob(); ink(ctx, lw);
    animeEyes(ctx, x, y - r * 0.08, r * 1.25, '#FF4FB0');
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y + r * 0.38, r * 0.32, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.22, y + r * 0.38); ctx.lineTo(x + k * r * 0.1, y + r * 0.38); ctx.lineTo(x + k * r * 0.16, y + r * 0.52); ctx.fill(); }
  },
  hit(e, x, y, a) {
    if (Math.hypot(x - e.spx, y - e.spy) < e.spr * 1.4 + a * 0.7) return 'spirit';
    return personHit(e, x, y) ? 'person' : null;
  },
  center: e => ({ x: e.spx, y: e.spy, r: e.spr * 1.2 })
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

export const TYPES = { wisp, phantom, civilian, possessed, lantern };

export function makeEnemy(spec) {
  const T = TYPES[spec.type];
  const e = { x: 0, z: 0.8, ...spec, t: 0, hp: spec.hp ?? T.hp, flash: 0, state: 'move', sx: 0, sy: 0, r: 0 };
  T.init?.(e); T.update(e, 0);
  return e;
}
