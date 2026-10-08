// Every entity type lives here. To add a new ghoul: add an entry to TYPES with
// hp, pts, hostile, init(e), update(e, dt), draw(ctx, e, t), hit(e, x, y, assist), center(e).
// hit() returns 'hit' | 'spirit' | 'person' | 'phased' | 'armor' | null.
import { proj, px, glow } from './view.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const ATTACK_Z = 0.12, WINDUP = 1.0;

// shared: drift toward the player, then wind up an attack
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
function eyes(ctx, x, y, r, color, squint = 0.22) {
  ctx.fillStyle = color;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.3, y, r * 0.11, r * squint, s * 0.35, 0, TAU); ctx.fill(); }
}

/* -------- Wisp: small fast spirit that flies at you -------- */
const wisp = {
  hp: 1, pts: 100, hostile: true, color: '#B65CFF',
  init(e) {
    e.speed ??= rnd(0.1, 0.14); e.h ??= rnd(0.9, 1.4); e.wa = rnd(0.12, 0.3); e.wf = rnd(1.5, 2.6); e.ph = rnd(0, TAU);
    e.trail = []; if (e.drop) { e.dropH = e.h; e.h = 3.2; }
  },
  update(e, dt) {
    e.t += dt; approach(e, dt);
    if (e.drop && e.h > e.dropH) e.h = Math.max(e.dropH, e.h - dt * 2.4);
    e.xr = e.x + (e.still ? 0 : Math.sin(e.t * e.wf + e.ph) * e.wa);
    const p = proj(e.xr, e.z);
    e.sx = p.sx; e.sy = p.sy - px(e.h + Math.sin(e.t * 3) * 0.06, p.s); e.r = px(0.26, p.s);
    e.trail.unshift([e.sx, e.sy]); if (e.trail.length > 6) e.trail.pop();
  },
  draw(ctx, e, t) {
    const r = e.r;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    e.trail.forEach((p, i) => glow(ctx, p[0], p[1], r * (1.3 - i * 0.15), `rgba(182,92,255,${0.22 - i * 0.03})`));
    glow(ctx, e.sx, e.sy, r * 2.6, 'rgba(182,92,255,0.55)');
    glow(ctx, e.sx, e.sy, r * 1.4, 'rgba(255,79,176,0.5)');
    ctx.restore();
    ctx.fillStyle = '#F7E4FF'; ctx.beginPath(); ctx.arc(e.sx, e.sy, r * 0.72, 0, TAU); ctx.fill();
    eyes(ctx, e.sx, e.sy - r * 0.05, r, '#2A0B45');
    hitFlash(ctx, e, () => glow(ctx, e.sx, e.sy, r * 2, 'rgba(255,255,255,1)'));
  },
  hit: (e, x, y, a) => Math.hypot(x - e.sx, y - e.sy) < e.r * 1.1 + a ? 'hit' : null,
  center: e => ({ x: e.sx, y: e.sy, r: e.r })
};

/* -------- Phantom: hooded ghoul, only solid part of the time -------- */
const phantom = {
  hp: 2, pts: 250, hostile: true, color: '#FF4FB0',
  init(e) { e.speed ??= rnd(0.06, 0.08); e.pt = rnd(0, 2.4); e.alpha = 1; },
  update(e, dt) {
    e.t += dt; e.pt += dt; approach(e, dt);
    const cyc = e.pt % 2.6; e.solid = cyc < 1.5 || e.state === 'attack';
    e.alpha += ((e.solid ? 1 : 0.18) - e.alpha) * Math.min(1, dt * 8);
    const p = proj(e.x + Math.sin(e.t * 0.8) * 0.08, e.z);
    e.s = p.s; e.hh = px(1.35, p.s); e.ww = px(0.8, p.s);
    e.sx = p.sx; e.base = p.sy - px(0.12 + Math.sin(e.t * 2) * 0.04, p.s); e.sy = e.base - e.hh * 0.55; e.r = e.ww * 0.5;
  },
  draw(ctx, e, t) {
    const { sx, base, hh, ww } = e, top = base - hh;
    ctx.save(); ctx.globalAlpha = e.alpha;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx, base - hh * 0.5, hh * 0.8, 'rgba(255,79,176,0.25)'); ctx.restore();
    const g = ctx.createLinearGradient(0, top, 0, base); g.addColorStop(0, '#4A1A86'); g.addColorStop(1, 'rgba(40,10,80,0.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, top);
    ctx.bezierCurveTo(sx + ww * 0.55, top, sx + ww * 0.5, top + hh * 0.5, sx + ww * 0.6, base);
    for (let i = 4; i >= 0; i--) ctx.lineTo(sx - ww * 0.6 + ww * 1.2 * i / 4, base - (i % 2 ? hh * 0.08 : 0) - Math.sin(t * 6 + i) * hh * 0.03);
    ctx.bezierCurveTo(sx - ww * 0.5, top + hh * 0.5, sx - ww * 0.55, top, sx, top); ctx.fill();
    ctx.strokeStyle = 'rgba(255,79,176,0.9)'; ctx.lineWidth = Math.max(1.5, ww * 0.04); ctx.stroke();
    // hood opening and glowing eyes
    ctx.fillStyle = '#0B0420'; ctx.beginPath(); ctx.ellipse(sx, top + hh * 0.2, ww * 0.24, hh * 0.12, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx, top + hh * 0.2, ww * 0.35, 'rgba(255,79,176,0.6)'); ctx.restore();
    eyes(ctx, sx, top + hh * 0.2, ww * 0.55, '#FFD0EC', 0.12);
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, sx, base - hh * 0.5, hh * 0.6, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    const dx = (x - e.sx) / (e.ww * 0.5 + a), dy = (y - (e.base - e.hh * 0.5)) / (e.hh * 0.5 + a);
    if (dx * dx + dy * dy > 1) return null;
    return e.solid ? 'hit' : 'phased';
  },
  center: e => ({ x: e.sx, y: e.base - e.hh * 0.5, r: e.ww * 0.5 })
};

/* -------- People: civilians and possessed shoppers -------- */
const JACKETS = ['#3E7CB1', '#D9A441', '#8E5BA8', '#4FA37A', '#C2575B', '#5F6C8C'];
const SKIN = ['#F1C9A5', '#D9A27A', '#B57B54', '#8A5634', '#F5D7BE'];
function personInit(e) {
  e.dir ??= e.x < 0 ? 1 : -1; e.speed ??= rnd(0.16, 0.22); e.still = true;
  e.color = JACKETS[Math.floor(Math.random() * JACKETS.length)]; e.skin = SKIN[Math.floor(Math.random() * SKIN.length)];
}
function personUpdate(e, dt) {
  e.t += dt; e.x += e.dir * e.speed * dt;
  if (Math.abs(e.x) > 1.45) e.exited = true;
  const p = proj(e.x, e.z); e.s = p.s;
  e.sx = p.sx; e.base = p.sy; e.hh = px(0.95, p.s); e.ww = px(0.36, p.s);
  e.bob = Math.abs(Math.sin(e.t * 7)) * e.hh * 0.02;
  e.sy = e.base - e.hh * 0.5;
  // the spirit rides on the shoulder
  e.spx = e.sx - e.dir * e.ww * 0.35; e.spy = e.base - e.hh * 0.95 - e.bob; e.spr = px(0.2, p.s);
}
function drawPerson(ctx, e, t) {
  const { sx, base, hh, ww } = e, b = e.bob, step = Math.sin(e.t * 7) * ww * 0.18;
  ctx.fillStyle = '#1B1F3A';
  ctx.fillRect(sx - ww * 0.22 + step, base - hh * 0.42, ww * 0.18, hh * 0.42);
  ctx.fillRect(sx + ww * 0.04 - step, base - hh * 0.42, ww * 0.18, hh * 0.42);
  ctx.fillStyle = e.color; ctx.beginPath(); ctx.roundRect(sx - ww / 2, base - hh * 0.8 - b, ww, hh * 0.42, ww * 0.18); ctx.fill();
  ctx.fillStyle = e.skin; ctx.beginPath(); ctx.arc(sx, base - hh * 0.89 - b, hh * 0.1, 0, TAU); ctx.fill();
  if (e.type === 'possessed') { // eyes glow while possessed
    ctx.fillStyle = '#E3B4FF'; ctx.fillRect(sx - hh * 0.04, base - hh * 0.9 - b, hh * 0.025, hh * 0.02); ctx.fillRect(sx + hh * 0.02, base - hh * 0.9 - b, hh * 0.025, hh * 0.02);
  }
  hitFlash(ctx, e, () => { ctx.fillStyle = 'rgba(255,59,92,0.8)'; ctx.fillRect(sx - ww / 2, base - hh, ww, hh); });
}
function personHit(e, x, y) { return Math.abs(x - e.sx) < e.ww * 0.55 && y > e.base - e.hh - e.bob && y < e.base; }

const civilian = {
  hp: 1, pts: 0, hostile: false, color: '#6FF3FF',
  init: personInit, update: personUpdate, draw: drawPerson,
  hit: (e, x, y) => personHit(e, x, y) ? 'person' : null,
  center: e => ({ x: e.sx, y: e.sy, r: e.ww * 0.5 })
};

const possessed = {
  hp: 1, pts: 300, hostile: true, color: '#B65CFF',
  init: personInit, update: personUpdate,
  draw(ctx, e, t) {
    drawPerson(ctx, e, t);
    const r = e.spr * (1 + Math.sin(t * 5) * 0.06), x = e.spx, y = e.spy;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, x, y, r * 2.4, 'rgba(182,92,255,0.6)'); ctx.restore();
    // clutching claws over the shoulders
    ctx.strokeStyle = '#D9A8FF'; ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + s * r * 0.9, y + r * 0.9, r * 0.55, s > 0 ? Math.PI : -0.2, s > 0 ? Math.PI * 1.7 : 0.6, s < 0); ctx.stroke(); }
    ctx.fillStyle = '#5A2A9A'; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.lineTo(x + r, y + r * 0.6);
    for (let i = 0; i < 4; i++) ctx.lineTo(x + r - (i + 0.5) * r / 2, y + r * (i % 2 ? 0.6 : 0.95));
    ctx.lineTo(x - r, y + r * 0.6); ctx.closePath(); ctx.fill();
    eyes(ctx, x, y, r * 1.6, '#FFE3FF', 0.1);
  },
  hit(e, x, y, a) {
    if (Math.hypot(x - e.spx, y - e.spy) < e.spr * 1.3 + a * 0.7) return 'spirit';
    return personHit(e, x, y) ? 'person' : null;
  },
  center: e => ({ x: e.spx, y: e.spy, r: e.spr })
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
    const { sx, sy, r } = e;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, sx, sy, r * 2.6, 'rgba(255,150,60,0.45)'); ctx.restore();
    ctx.fillStyle = '#FF8A3C'; ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.8, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,40,10,.6)'; ctx.lineWidth = 1;
    for (const k of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.8 * Math.cos(k * 1.2), r, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#3A2010'; ctx.fillRect(sx - r * 0.4, sy - r * 1.1, r * 0.8, r * 0.18); ctx.fillRect(sx - r * 0.4, sy + r * 0.92, r * 0.8, r * 0.18);
    // rotating ward ring
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * (e.armored ? 1.2 : 0.6));
    ctx.strokeStyle = e.armored ? `rgba(111,243,255,${0.7 + (e.ripple || 0) * 0.3})` : 'rgba(255,214,150,.5)';
    ctx.lineWidth = e.armored ? 2.5 + (e.ripple || 0) * 3 : 1.2;
    const R = r * (e.armored ? 1.7 + (e.ripple || 0) * 0.3 : 1.5);
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * TAU; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); } ctx.stroke();
    ctx.restore();
    hitFlash(ctx, e, () => glow(ctx, sx, sy, r * 2, 'rgba(255,255,255,1)'));
  },
  hit(e, x, y, a) {
    if (Math.hypot(x - e.sx, y - e.sy) > e.r * (e.armored ? 1.7 : 1.2) + a) return null;
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
