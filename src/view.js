// Screen sizing, first-person perspective, and scene backgrounds.
// World coordinates: x = left/right (-1..1 is the playfield), z = depth (0 = you, 1 = far), h = height above floor.
export const V = { W: 0, H: 0, DPR: 1, SAT: 0, SAB: 0, horizon: 0, floor: 0, B: 0 };
const K = 4, S1 = 1 / (K + 1);
let probe = null;

export function resizeView(canvas, ctx) {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  V.SAT = parseFloat(cs.paddingTop) || 0; V.SAB = parseFloat(cs.paddingBottom) || 0;
  V.DPR = Math.min(window.devicePixelRatio || 1, 2); V.W = innerWidth; V.H = innerHeight;
  V.B = Math.min(V.W, V.H * 0.62); // size basis, keeps proportions sane if the phone is turned sideways
  canvas.width = Math.round(V.W * V.DPR); canvas.height = Math.round(V.H * V.DPR);
  ctx.setTransform(V.DPR, 0, 0, V.DPR, 0, 0);
  V.horizon = V.H * 0.36; V.floor = V.H * 0.98;
}

export function proj(x, z) {
  const s = 1 / (Math.max(z, -0.15) * K + 1), n = (s - S1) / (1 - S1);
  return { sx: V.W / 2 + x * V.W * 0.5 * s, sy: V.horizon + (V.floor - V.horizon) * n, s };
}
export const px = (w, s) => w * V.B * 0.5 * s;            // world size -> pixels at scale s
export function pt(x, h, z) { const p = proj(x, z); return [p.sx, p.sy - px(h, p.s)]; }

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function poly(ctx, pts, fill, stroke, lw = 1) {
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
export function glow(ctx, x, y, r, color) {
  if (r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
export function starPath(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}
const INK = '#120A24';
function moon(ctx, x, y, r) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, r * 3.2, 'rgba(255,200,250,0.22)'); glow(ctx, x, y, r * 1.6, 'rgba(255,240,250,0.25)');
  ctx.restore();
  ctx.fillStyle = '#FFF4E8'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(190,170,255,0.35)'; ctx.beginPath(); ctx.arc(x + r * 0.42, y - r * 0.25, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,185,235,0.4)';
  [[-0.35, 0.2, 0.18], [0.05, 0.45, 0.12], [-0.1, -0.35, 0.1]].forEach(([a, b, c]) => { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, c * r, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}
function cloud(ctx, x, y, s, fill, rim) {
  const blobs = [[0, 0, 1], [0.95, 0.18, 0.72], [-0.95, 0.22, 0.68], [0.45, -0.38, 0.7], [-0.4, -0.3, 0.62], [1.7, 0.35, 0.45], [-1.7, 0.38, 0.42]];
  const path = (dy, k) => { ctx.beginPath(); blobs.forEach(([bx, by, br]) => { ctx.moveTo(x + bx * s + br * s * k, y + by * s + dy); ctx.arc(x + bx * s, y + by * s + dy, br * s * k, 0, Math.PI * 2); }); };
  path(0, 1); ctx.fillStyle = rim; ctx.fill();
  path(s * 0.12, 0.96); ctx.fillStyle = fill; ctx.fill();
}
function sky(ctx, t, W, H, horizonY) {
  const g = ctx.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0, '#070A26'); g.addColorStop(0.6, '#24135A'); g.addColorStop(1, '#5A2484');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizonY + 2);
  for (let i = 0; i < 50; i++) {
    const a = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.5 + hash(i) * 2) + i));
    ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`; ctx.fillRect(hash(i) * W, hash(i + 40) * horizonY * 0.85, 1.5, 1.5);
  }
}

function line(ctx, a, b, color, lw = 1) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }

/* ---------------- Records room: precinct archive basement ---------------- */
function records(ctx, t, scroll) {
  const { W, H } = V, ZF = 1.25, ZN = -0.14, WX = 1.1, CH = 2.2;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#080B20'); g.addColorStop(1, '#131940');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  poly(ctx, [pt(-WX, CH, ZN), pt(WX, CH, ZN), pt(WX, CH, ZF), pt(-WX, CH, ZF)], '#0A0D27');
  poly(ctx, [pt(-WX, 0, ZN), pt(WX, 0, ZN), pt(WX, 0, ZF), pt(-WX, 0, ZF)], '#10163C');
  poly(ctx, [pt(-WX, 0, ZN), pt(-WX, 0, ZF), pt(-WX, CH, ZF), pt(-WX, CH, ZN)], '#141A45');
  poly(ctx, [pt(WX, 0, ZN), pt(WX, 0, ZF), pt(WX, CH, ZF), pt(WX, CH, ZN)], '#141A45');
  // back wall with an eerie doorway
  poly(ctx, [pt(-WX, 0, ZF), pt(WX, 0, ZF), pt(WX, CH, ZF), pt(-WX, CH, ZF)], '#1A2154');
  const [dx0, dy0] = pt(-0.28, 1.45, ZF), [dx1, dy1] = pt(0.28, 0, ZF);
  const dg = ctx.createLinearGradient(0, dy0, 0, dy1); dg.addColorStop(0, '#2B1460'); dg.addColorStop(1, '#7A3FD0');
  ctx.fillStyle = dg; ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, (dx0 + dx1) / 2, dy1, (dx1 - dx0) * 2.2, `rgba(182,92,255,${0.25 + 0.08 * Math.sin(t * 2)})`);
  ctx.restore();
  // floor tiles
  const step = 0.15, off = scroll % step;
  for (let k = 0; k < 12; k++) { const z = k * step - off; if (z < ZN || z > ZF) continue; line(ctx, pt(-WX, 0, z), pt(WX, 0, z), 'rgba(111,243,255,0.06)'); }
  for (let x = -WX; x <= WX + 0.01; x += 0.55) line(ctx, pt(x, 0, ZN), pt(x, 0, ZF), 'rgba(111,243,255,0.06)');
  // filing cabinets along both walls, far to near
  for (let k = 11; k >= 0; k--) {
    const z0 = k * step - off, z1 = z0 + step * 0.88;
    if (z1 < ZN || z0 > ZF) continue;
    for (const side of [-1, 1]) {
      const x = side * (WX - 0.02);
      poly(ctx, [pt(x, 0, z0), pt(x, 0, z1), pt(x, 1.7, z1), pt(x, 1.7, z0)], '#1E2762', INK, 1.5);
      for (const h of [0.42, 0.85, 1.27]) line(ctx, pt(x, h, z0), pt(x, h, z1), '#2C377D');
      for (const h of [0.21, 0.63, 1.06, 1.49]) { const [hx, hy] = pt(x, h, (z0 + z1) / 2), p = proj(x, z0); ctx.fillStyle = '#5B66B8'; ctx.fillRect(hx - 1, hy - 1, Math.max(2, px(0.06, p.s)), 2); }
    }
  }
  // flickering ceiling lamps
  const lstep = 0.5, loff = scroll % lstep;
  for (let k = 3; k >= 0; k--) {
    const z = k * lstep - loff + 0.25; if (z < ZN || z > ZF) continue;
    const id = k + Math.floor(scroll / lstep), flick = hash(id + Math.floor(t * 8)) > (id % 3 === 0 ? 0.85 : 0.97) ? 0.15 : 1;
    const [lx, ly] = pt(0, 2.0, z), [fx, fy] = pt(0, 0, z), s = proj(0, z).s;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flick;
    const cone = ctx.createLinearGradient(0, ly, 0, fy); cone.addColorStop(0, 'rgba(160,200,255,0.18)'); cone.addColorStop(1, 'rgba(160,200,255,0)');
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(lx - px(0.08, s), ly); ctx.lineTo(lx + px(0.08, s), ly); ctx.lineTo(fx + px(0.6, s), fy); ctx.lineTo(fx - px(0.6, s), fy); ctx.fill();
    glow(ctx, fx, fy, px(0.7, s), 'rgba(160,200,255,0.12)');
    ctx.restore();
    ctx.fillStyle = '#2E3880'; ctx.fillRect(lx - px(0.1, s), ly - px(0.03, s), px(0.2, s), px(0.05, s));
  }
  dust(ctx, t, 'rgba(200,220,255,0.35)');
}

/* ---------------- Night market: rainy street of food stalls ---------------- */
const STALL = ['#FF4FB0', '#FFB547', '#6FF3FF', '#B65CFF', '#FF6B6B'];
function market(ctx, t, scroll) {
  const { W, H } = V, ZF = 1.4, ZN = -0.14, RX = 1.0;
  ctx.fillStyle = '#0F0B2E'; ctx.fillRect(0, 0, W, H);
  sky(ctx, t, W, H, V.horizon + 20);
  moon(ctx, W * 0.7, V.horizon * 0.42, Math.min(W, H) * 0.15);
  for (let i = 0; i < 3; i++) {
    const cx = ((hash(i + 7) * W + t * (6 + i * 4)) % (W * 1.6)) - W * 0.3;
    cloud(ctx, cx, V.horizon * (0.3 + i * 0.22), Math.min(W, H) * (0.05 + hash(i) * 0.03), '#1F1552', '#5B44A8');
  }
  // distant skyline at the end of the street
  for (let i = 0; i < 9; i++) {
    const x0 = -1.4 + i * 0.32, hgt = 1.4 + hash(i) * 2.2;
    const [ax, ay] = pt(x0, hgt, ZF), [bx, by] = pt(x0 + 0.3, 0, ZF);
    ctx.fillStyle = '#120F33'; ctx.fillRect(ax, ay, bx - ax, by - ay);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 3; c++) {
      if (hash(i * 31 + r * 7 + c) > 0.55) continue;
      const [wx, wy] = pt(x0 + 0.05 + c * 0.09, hgt - 0.25 - r * 0.28, ZF);
      if (wy > by - 2) continue;
      ctx.fillStyle = hash(i + r + c) > 0.5 ? 'rgba(255,181,71,.55)' : 'rgba(111,243,255,.4)'; ctx.fillRect(wx, wy, 2, 3);
    }
  }
  // road and sidewalks
  poly(ctx, [pt(-1.8, 0, ZN), pt(1.8, 0, ZN), pt(1.8, 0, ZF), pt(-1.8, 0, ZF)], '#151236');
  poly(ctx, [pt(-RX, 0, ZN), pt(RX, 0, ZN), pt(RX, 0, ZF), pt(-RX, 0, ZF)], '#0F1030');
  const doff = scroll % 0.2;
  for (let k = 0; k < 8; k++) { const z0 = k * 0.2 - doff, z1 = z0 + 0.08; if (z1 < ZN || z0 > ZF) continue;
    poly(ctx, [pt(-0.02, 0, z0), pt(0.02, 0, z0), pt(0.02, 0, z1), pt(-0.02, 0, z1)], 'rgba(243,240,255,.18)'); }
  // stalls on both sides
  const P = 0.28, off = scroll % P, base = Math.floor(scroll / P);
  for (let k = 6; k >= 0; k--) {
    const z0 = k * P - off + 0.05, z1 = z0 + P * 0.9; if (z1 < ZN || z0 > ZF) continue;
    for (const side of [-1, 1]) {
      const id = (k + base) * 2 + (side > 0 ? 1 : 0), col = STALL[Math.floor(hash(id) * STALL.length)];
      const X = side * 1.05, s = proj(X, (z0 + z1) / 2).s;
      // back wall + warm interior
      poly(ctx, [pt(X * 1.25, 0, z0), pt(X * 1.25, 0, z1), pt(X * 1.25, 1.8, z1), pt(X * 1.25, 1.8, z0)], '#1C1846');
      poly(ctx, [pt(X, 0.6, z0), pt(X, 0.6, z1), pt(X, 1.4, z1), pt(X, 1.4, z0)], 'rgba(255,181,71,.16)');
      // counter
      poly(ctx, [pt(X, 0, z0), pt(X, 0, z1), pt(X, 0.6, z1), pt(X, 0.6, z0)], '#2A2160', INK, 1.5);
      // striped awning
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = z0 + (z1 - z0) * i / n, b = z0 + (z1 - z0) * (i + 1) / n;
        poly(ctx, [pt(X * 1.25, 1.75, a), pt(X * 1.25, 1.75, b), pt(X * 0.82, 1.42, b), pt(X * 0.82, 1.42, a)], i % 2 ? '#F3F0FF' : col, INK, 1.2);
      }
      // lantern
      const [lx, ly] = pt(X * 0.84, 1.28, (z0 + z1) / 2), sw = Math.sin(t * 1.6 + id) * px(0.02, s);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, lx + sw, ly, px(0.45, s), 'rgba(255,140,60,.35)');
      // reflection on wet road
      const [rx, ry] = pt(X * 0.75, 0, (z0 + z1) / 2);
      const rg = ctx.createLinearGradient(0, ry, 0, ry + px(0.9, s)); rg.addColorStop(0, 'rgba(255,140,60,.18)'); rg.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = rg; ctx.fillRect(rx - px(0.05, s), ry, px(0.1, s), px(0.9, s));
      ctx.restore();
      ctx.fillStyle = '#FF7A3C'; ctx.beginPath(); ctx.ellipse(lx + sw, ly, px(0.07, s), px(0.09, s), 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }
  // string lights over the street
  const L = 0.56, loff = scroll % L;
  for (let k = 2; k >= 0; k--) {
    const z = k * L - loff + 0.32; if (z < ZN || z > ZF) continue;
    const s = proj(0, z).s;
    for (let i = 0; i <= 10; i++) {
      const x = -1.05 + i * 0.21, h = 2.15 - Math.sin(i / 10 * Math.PI) * 0.3, [bx, by] = pt(x, h, z);
      const on = hash(i + k * 13 + Math.floor(t * 2)) > 0.1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, bx, by, px(0.09, s), i % 2 ? 'rgba(111,243,255,.6)' : 'rgba(255,79,176,.6)');
      ctx.restore();
      if (on) { ctx.fillStyle = i % 2 ? '#CFFBFF' : '#FFC2E4'; ctx.fillRect(bx - 1, by - 1, 2.5, 2.5); }
    }
  }
  rain(ctx, t);
}

function dust(ctx, t, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 24; i++) {
    const x = (hash(i) * V.W + Math.sin(t * 0.3 + i) * 20 + V.W) % V.W;
    const y = (hash(i + 50) * V.H + t * 8 * (0.5 + hash(i + 9))) % V.H;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
}
function rain(ctx, t) {
  ctx.strokeStyle = 'rgba(170,190,255,.18)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const x = (hash(i) * V.W * 1.2 + t * 60) % (V.W * 1.2) - V.W * 0.1;
    const y = (hash(i + 99) * V.H + t * (600 + hash(i) * 300)) % V.H;
    ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14);
  }
  ctx.stroke();
}

export const SCENES = { records, market };
export function drawScene(name, ctx, t, scroll) { (SCENES[name] || market)(ctx, t, scroll); }

export function speedLines(ctx, strength, t) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(239,255,255,${0.35 * strength})`; ctx.lineWidth = 2;
  const cx = V.W / 2, cy = V.horizon, R = Math.hypot(V.W, V.H);
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = hash(i + Math.floor(t * 20)) * Math.PI * 2, r0 = R * (0.25 + hash(i * 3) * 0.2);
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  ctx.stroke(); ctx.restore();
}

/* ---------------- Key art: the officer on a rooftop under the moon ---------------- */
export function drawKeyArt(ctx, t) {
  const { W, H } = V, m = Math.min(W, H), horizon = H * 0.7;
  ctx.fillStyle = '#0B0824'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#060824'); g.addColorStop(0.55, '#23125A'); g.addColorStop(0.85, '#6A2A8E'); g.addColorStop(1, '#C8478F');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
  for (let i = 0; i < 70; i++) {
    const a = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.4 + hash(i) * 2) + i));
    ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`; ctx.fillRect(hash(i) * W, hash(i + 70) * horizon * 0.7, 1.5, 1.5);
  }
  moon(ctx, W * 0.66, H * 0.2, m * 0.22);
  for (let i = 0; i < 4; i++) {
    const cx = ((hash(i + 3) * W + t * (8 + i * 5)) % (W * 1.7)) - W * 0.35;
    cloud(ctx, cx, H * (0.1 + i * 0.1), m * (0.06 + hash(i + 9) * 0.05), '#1C1450', '#5B44A8');
  }
  // city skyline with neon windows
  const n = 13;
  for (let i = 0; i < n; i++) {
    const w = W / (n - 2), x0 = i * w - w * 0.6, h = H * (0.1 + hash(i + 20) * 0.22), y0 = horizon - h;
    ctx.fillStyle = '#0D0A26'; ctx.fillRect(x0, y0, w * 0.92, h + 4);
    for (let r = 0; r < 14; r++) for (let c = 0; c < 4; c++) {
      if (hash(i * 50 + r * 9 + c) > 0.32) continue;
      const wy = y0 + 8 + r * 11; if (wy > horizon - 6) continue;
      const on = hash(i + r + c + Math.floor(t / 3)) > 0.15;
      ctx.fillStyle = on ? (hash(i + c) > 0.5 ? 'rgba(111,243,255,.7)' : 'rgba(255,79,176,.6)') : 'rgba(255,255,255,.06)';
      ctx.fillRect(x0 + 5 + c * (w * 0.2), wy, 3, 4);
    }
    if (hash(i + 20) > 0.75) { ctx.fillStyle = `rgba(255,59,92,${0.4 + 0.6 * (Math.sin(t * 3 + i) > 0)})`; ctx.fillRect(x0 + w * 0.45, y0 - 10, 3, 3); ctx.fillStyle = '#0D0A26'; ctx.fillRect(x0 + w * 0.46, y0 - 8, 1.5, 8); }
  }
  const haze = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 10);
  haze.addColorStop(0, 'rgba(255,79,176,0)'); haze.addColorStop(1, 'rgba(255,79,176,0.25)');
  ctx.fillStyle = haze; ctx.fillRect(0, horizon - 40, W, 50);
  // rooftop
  ctx.fillStyle = '#05041A'; ctx.beginPath(); ctx.moveTo(0, H * 0.86); ctx.lineTo(W, H * 0.83); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.strokeStyle = '#1D1A48'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H * 0.81); ctx.lineTo(W, H * 0.78); ctx.stroke();
  for (let i = 0; i <= 8; i++) { const x = i * W / 8, y = H * 0.81 - (H * 0.03) * (i / 8); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + H * 0.05); ctx.stroke(); }
  // drifting wisps the officer is aiming at
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = W * (0.12 + i * 0.13) + Math.sin(t * 1.3 + i * 2) * 14, y = H * (0.36 + (i % 2) * 0.09) + Math.cos(t * 1.7 + i) * 10;
    glow(ctx, x, y, 28, 'rgba(160,80,255,.55)'); glow(ctx, x, y, 9, 'rgba(255,220,255,.95)');
  }
  ctx.restore();
  officer(ctx, W * 0.7, H * 0.885, Math.min(H * 0.36, W * 0.85), W * 0.28, H * 0.38, t);
}

function officer(ctx, fx, fy, h, tx, ty, t) {
  const P = (x, y) => [fx + x * h, fy + y * h], wind = Math.sin(t * 2.2) * 0.03;
  const fill = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  const seg = (a, b, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, fx, fy - h * 0.55, h * 0.6, 'rgba(111,243,255,0.16)'); ctx.restore();
  ctx.save(); ctx.fillStyle = '#04030E'; ctx.strokeStyle = '#04030E'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  seg(P(0.11, -0.76), P(0.17, -0.5), h * 0.055);
  seg(P(-0.06, -0.25), P(-0.09, -0.01), h * 0.07); seg(P(0.06, -0.25), P(0.1, -0.01), h * 0.07);
  fill([P(-0.13, -0.78), P(0.14, -0.79), P(0.2, -0.5), P(0.38 + wind, -0.16), P(0.26, -0.2), P(0.12, -0.22), P(-0.02, -0.2), P(-0.17, -0.22), P(-0.14, -0.5)]);
  fill([P(-0.07, -0.85), P(0.08, -0.86), P(0.12, -0.77), P(-0.1, -0.76)]);
  ctx.beginPath(); ctx.arc(...P(0.01, -0.9), h * 0.062, 0, Math.PI * 2); ctx.fill();
  fill([P(-0.06, -0.9), P(-0.11, -0.97), P(-0.04, -0.955), P(-0.03, -1.03), P(0.03, -0.975), P(0.09, -1.02 + wind * 0.5), P(0.085, -0.95), P(0.16, -0.94 + wind), P(0.075, -0.875)]);
  const [sx, sy] = P(-0.1, -0.76), ang = Math.atan2(ty - sy, tx - sx), L = h * 0.36;
  const ex = sx + Math.cos(ang) * L, ey = sy + Math.sin(ang) * L;
  seg([sx, sy], [ex, ey], h * 0.06);
  ctx.beginPath(); ctx.arc(ex, ey, h * 0.032, 0, Math.PI * 2); ctx.fill();
  const tipX = ex + Math.cos(ang) * h * 0.07, tipY = ey + Math.sin(ang) * h * 0.07;
  seg([ex, ey], [tipX, tipY], h * 0.018);
  seg([ex, ey], [ex + Math.cos(ang - 1.5) * h * 0.045, ey + Math.sin(ang - 1.5) * h * 0.045], h * 0.016);
  // cyan rim light along the arm and coat edge
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(111,243,255,0.45)';
  seg([sx, sy - h * 0.02], [ex, ey - h * 0.02], 1.5);
  ctx.restore();
  // charged fingertip
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const pulse = 1 + 0.12 * Math.sin(t * 6);
  glow(ctx, tipX, tipY, h * 0.28 * pulse, 'rgba(111,243,255,0.45)');
  glow(ctx, tipX, tipY, h * 0.08 * pulse, 'rgba(239,255,255,1)');
  ctx.strokeStyle = 'rgba(111,243,255,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * 40;
  ctx.beginPath(); ctx.arc(tipX, tipY, h * 0.12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 8; i++) {
    const a = t * 2 + i * 0.8, d = h * 0.25 * (1 - ((t * 0.8 + i / 8) % 1));
    ctx.fillStyle = 'rgba(239,255,255,0.9)'; ctx.fillRect(tipX + Math.cos(a) * d, tipY + Math.sin(a) * d, 2, 2);
  }
  ctx.restore();
}

// Manga focus lines that close in from the screen edges (used while charging a Spirit Blast).
export function focusLines(ctx, strength, t) {
  if (strength <= 0) return;
  const cx = V.W / 2, cy = V.H / 2, R = Math.hypot(V.W, V.H) * 0.6, inner = R * (1 - 0.45 * strength);
  ctx.save(); ctx.fillStyle = `rgba(6,4,20,${0.55 * strength})`;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + hash(i + Math.floor(t * 12)) * 0.08, w = 0.012 + hash(i * 7) * 0.02, r0 = inner + hash(i * 3 + Math.floor(t * 12)) * R * 0.2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a - w) * R * 1.6, cy + Math.sin(a - w) * R * 1.6); ctx.lineTo(cx + Math.cos(a + w) * R * 1.6, cy + Math.sin(a + w) * R * 1.6); ctx.fill();
  }
  ctx.restore();
}
