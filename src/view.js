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
      poly(ctx, [pt(x, 0, z0), pt(x, 0, z1), pt(x, 1.7, z1), pt(x, 1.7, z0)], '#1E2762', '#2C377D');
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
  const g = ctx.createLinearGradient(0, 0, 0, V.horizon + 20);
  g.addColorStop(0, '#070A22'); g.addColorStop(1, '#2C1655');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
      poly(ctx, [pt(X, 0, z0), pt(X, 0, z1), pt(X, 0.6, z1), pt(X, 0.6, z0)], '#2A2160', 'rgba(255,255,255,.08)');
      // striped awning
      const n = 4;
      for (let i = 0; i < n; i++) {
        const a = z0 + (z1 - z0) * i / n, b = z0 + (z1 - z0) * (i + 1) / n;
        poly(ctx, [pt(X * 1.25, 1.75, a), pt(X * 1.25, 1.75, b), pt(X * 0.82, 1.42, b), pt(X * 0.82, 1.42, a)], i % 2 ? '#F3F0FF' : col);
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
      ctx.fillStyle = '#FF7A3C'; ctx.beginPath(); ctx.ellipse(lx + sw, ly, px(0.07, s), px(0.09, s), 0, 0, Math.PI * 2); ctx.fill();
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
