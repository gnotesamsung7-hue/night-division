// Runs one mission: steps, spawns, combat, energy, scoring, HUD and effects.
import { V, drawScene, speedLines, glow, starPath, focusLines } from './view.js';
import { TYPES, makeEnemy } from './enemies.js';
import { sfx } from './audio.js';
import { settings, fillName } from './storage.js';

export const MAX_ENERGY = 6;
const BLAST_MIN = 3, LIVES = 3;
const C = { cyan: '#6FF3FF', core: '#EFFFFF', violet: '#B65CFF', magenta: '#FF4FB0', amber: '#FFB547', red: '#FF3B5C', cream: '#F3F0FF', muted: '#A9A6D6' };
const LOCK = { strong: { r: 100, pull: 0.75 }, light: { r: 60, pull: 0.4 }, off: null };
const FONT = (w, size) => `italic ${w} ${size}px Kanit, system-ui, sans-serif`;

export class Game {
  constructor(mission, mode, input, hooks) {
    Object.assign(this, { m: mission, mode, input, hooks });
    this.lives = LIVES; this.energy = MAX_ENERGY; this.score = 0;
    this.st = { shots: 0, hits: 0, kills: 0, freed: 0, fouls: 0, hurt: 0, escaped: 0 };
    this.ents = []; this.queue = []; this.parts = []; this.bolts = []; this.subs = []; this.sub = null;
    this.si = -1; this.stepT = 0; this.doneT = null; this.hint = ''; this.flags = {};
    this.scroll = 0; this.adv = 0; this.shake = 0; this.flash = 0; this.flashCol = C.red;
    this.beam = null; this.banner = null; this.emptyFx = 0; this.rechargeFx = 0;
    this.over = false; this.paused = false; this.handPaused = false; this.awayRecharged = false;
    this.lock = null; this.lockT = 0; this.dAim = null; this.hitstop = 0; this.impact = 0;
    this.next();
  }

  get step() { return this.m.steps[this.si]; }

  next() {
    // leftover training lanterns vanish between steps
    this.ents.forEach(e => { if (e.type === 'lantern') { e.dead = true; this.burst(e.sx, e.sy, C.amber, 10); } });
    this.ents = this.ents.filter(e => !e.dead);
    this.si++;
    const s = this.step;
    if (!s) return this.win();
    this.stepT = 0; this.doneT = null; this.flags = {};
    if (s.title) this.banner = { text: s.title, t: 2.6 };
    if (s.energy !== undefined) this.energy = s.energy;
    this.hint = fillName(typeof s.hint === 'object' ? (s.hint[this.mode] || '') : (s.hint || ''));
    this.adv = s.advance ? 1.4 : 0;
    (s.say || []).forEach(([who, text]) => this.subs.push({ who, text: fillName(text) }));
    this.queue = (s.spawns || []).map(sp => ({ ...sp, at: sp.delay || 0 })).sort((a, b) => a.at - b.at);
  }

  isDone(s) {
    switch (s.until || 'clear') {
      case 'recharge': return this.flags.recharge;
      case 'blast': return this.flags.blastKill;
      case 'time': return this.stepT >= (s.wait || 2);
      default: return !this.queue.length && !this.ents.length;
    }
  }

  /* ---------------- update ---------------- */
  update(dt, now) {
    this.updateFx(dt);
    if (this.over || this.paused) return;
    const inp = this.input;
    if (this.mode === 'camera') {
      if (!inp.hand.present) {
        const away = now - inp.hand.lostAt;
        if (away > 250 && !this.awayRecharged) this.recharge();
        this.handPaused = away > 1800;
      } else { this.handPaused = false; this.awayRecharged = false; }
      if (this.handPaused) return;
    }
    if (inp.trig.holding && inp.trig.charge > 0) sfx.chargeLevel(inp.trig.charge);
    this.updateLock(dt);

    // radio subtitles
    if (!this.sub && this.subs.length) { const n = this.subs.shift(); this.sub = { ...n, t: Math.max(2.6, n.text.length * 0.06) }; sfx.radio(); }
    if (this.sub && (this.sub.t -= dt) <= 0) this.sub = null;

    if (this.adv > 0) { this.adv -= dt; this.scroll += dt * 0.32; return; }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }

    this.stepT += dt;
    while (this.queue.length && this.queue[0].at <= this.stepT) this.ents.push(makeEnemy(this.queue.shift()));
    for (const e of this.ents) {
      TYPES[e.type].update(e, dt);
      e.flash = Math.max(0, e.flash - dt * 5);
      if (e.state === 'attack' && !e.warned) { e.warned = true; sfx.warn(); }
      if (e.state === 'attack' && e.windup <= 0) { e.dead = true; this.hurt(e); }
      if (e.exited) { e.dead = true; if (e.type === 'possessed') this.st.escaped++; }
    }
    this.ents = this.ents.filter(e => !e.dead);
    if (this.over) return;

    const s = this.step;
    if (this.doneT === null) { if (s && this.isDone(s)) this.doneT = 0.9; }
    else if ((this.doneT -= dt) <= 0) this.next();
  }

  /* ---------------- target lock ---------------- */
  lockPoint(e) {
    if (e.dead || e.type === 'civilian') return null;
    if (e.type === 'phantom' && !e.solid) return null;
    return TYPES[e.type].center(e);
  }
  updateLock(dt) {
    const cfg = LOCK[settings.lock], a = this.input.aim;
    const usable = cfg && a.seen && this.adv <= 0 && (this.mode === 'touch' || this.input.hand.present);
    let best = null;
    if (usable) {
      const R = cfg.r * (V.B / 390); let bd = Infinity;
      for (const e of this.ents) {
        const c = this.lockPoint(e); if (!c) continue;
        const d = Math.hypot(c.x - a.x, c.y - a.y), lim = (e === this.lock ? R * 1.4 : R) + c.r;
        if (d < lim && d < bd) { bd = d; best = e; }
      }
    }
    if (best && best !== this.lock) { sfx.lock(); this.lockT = 0; }
    this.lock = best; this.lockT += dt;
    // displayed crosshair slides toward the locked target
    let tx = a.x, ty = a.y;
    if (best) { const c = this.lockPoint(best); tx += (c.x - a.x) * cfg.pull; ty += (c.y - a.y) * cfg.pull; }
    if (!this.dAim) this.dAim = { x: tx, y: ty };
    const k = Math.min(1, dt * 18); this.dAim.x += (tx - this.dAim.x) * k; this.dAim.y += (ty - this.dAim.y) * k;
  }

  updateFx(dt) {
    for (const p of this.parts) { p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const b of this.bolts) b.t -= dt;
    this.bolts = this.bolts.filter(b => b.t > 0);
    if (this.beam && (this.beam.t -= dt) <= 0) this.beam = null;
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
    this.shake = Math.max(0, this.shake - dt * 2.5); this.flash = Math.max(0, this.flash - dt * 2.2);
    this.emptyFx = Math.max(0, this.emptyFx - dt * 2); this.rechargeFx = Math.max(0, this.rechargeFx - dt * 1.5);
    this.impact = Math.max(0, this.impact - dt);
  }

  /* ---------------- actions ---------------- */
  handle(ev) {
    if (this.over || this.paused || this.handPaused) return;
    if (ev.type === 'shot') this.shoot(ev.x, ev.y);
    else if (ev.type === 'chargeStart') sfx.chargeStart();
    else if (ev.type === 'chargeCancel') sfx.chargeStop();
    else if (ev.type === 'blast') { sfx.chargeStop(); this.blast(ev.x, ev.y); }
  }

  recharge() {
    this.awayRecharged = true;
    if (this.energy >= MAX_ENERGY) return;
    this.energy = MAX_ENERGY; this.flags.recharge = true; this.rechargeFx = 1; sfx.recharge();
  }

  shoot(x, y) {
    if (this.adv > 0) return;
    if (this.energy <= 0) { sfx.empty(); this.emptyFx = 1; return; }
    this.energy--; this.st.shots++; sfx.shot();
    if (this.mode === 'touch') this.updateLock(0);
    const L = this.lock && !this.lock.dead && this.ents.includes(this.lock) ? this.lock : null;
    if (L) {
      const c = TYPES[L.type].center(L);
      this.bolts.push({ x0: V.W / 2, y0: V.H + 10, x1: c.x, y1: c.y, t: 0.14, max: 0.14 });
      this.st.hits++;
      if (L.type === 'possessed') return this.free(L);
      if (L.type === 'lantern' && L.armored) { this.st.hits--; L.ripple = 1; sfx.phase(); return this.text(c.x, c.y - 24, 'Warded', C.cyan); }
      return this.damage(L, 1);
    }
    this.bolts.push({ x0: V.W / 2, y0: V.H + 10, x1: x, y1: y, t: 0.14, max: 0.14 });
    const assist = LOCK[settings.lock] ? 14 : 6;
    let phased = null, armor = null;
    for (const e of [...this.ents].sort((a, b) => a.z - b.z)) {
      const r = TYPES[e.type].hit(e, x, y, assist);
      if (!r) continue;
      if (r === 'phased') { phased = phased || e; continue; }
      if (r === 'armor') { armor = e; break; }
      if (r === 'person') return this.foul(e);
      if (r === 'spirit') { this.st.hits++; return this.free(e); }
      if (r === 'hit') { this.st.hits++; return this.damage(e, 1); }
    }
    if (armor) { armor.ripple = 1; sfx.phase(); return this.text(x, y - 24, 'Warded', C.cyan); }
    if (phased) { sfx.phase(); return this.text(x, y - 24, 'Phased', C.violet); }
    this.burst(x, y, C.cyan, 5, 0.35);
  }

  blast(x, y) {
    if (this.adv > 0) return;
    if (this.energy < BLAST_MIN) { sfx.empty(); this.emptyFx = 1; return this.text(x, y - 30, 'Not enough energy', C.red); }
    this.energy = 0; this.st.shots++; sfx.blast();
    this.shake = 1; this.flash = 0.9; this.flashCol = C.core; this.impact = 0.1;
    if (this.lock && this.ents.includes(this.lock)) { const c = TYPES[this.lock.type].center(this.lock); x = c.x; y = c.y; }
    const ox = V.W / 2, oy = V.H + 10, len = Math.hypot(x - ox, y - oy) || 1, ux = (x - ox) / len, uy = (y - oy) / len;
    const far = Math.hypot(V.W, V.H) * 1.5, width = Math.max(26, V.W * 0.09);
    this.beam = { x0: ox, y0: oy, x1: ox + ux * far, y1: oy + uy * far, w: width, t: 0.6, max: 0.6 };
    let n = 0;
    for (const e of [...this.ents]) {
      if (e.type === 'civilian') continue; // spirit energy passes through people
      const c = TYPES[e.type].center(e), qx = c.x - ox, qy = c.y - oy;
      if (qx * ux + qy * uy < 0 || Math.abs(qx * uy - qy * ux) > width + c.r) continue;
      if (e.type === 'possessed') this.free(e); else this.damage(e, 99, true);
      n++;
    }
    if (n) { this.flags.blastKill = true; this.st.hits++; }
    if (n >= 3) this.text(V.W / 2, V.H * 0.3, `${n}x Spirit Blast!`, C.cyan, 1.6);
  }

  damage(e, dmg, blast = false) {
    const c = TYPES[e.type].center(e);
    e.hp -= dmg; e.flash = 1;
    if (e.hp > 0) { sfx.hit(); return this.burst(c.x, c.y, C.core, 6, 0.4); }
    e.dead = true; this.st.kills++; this.hitstop = blast ? 0 : 0.05;
    if (this.lock === e) this.lock = null;
    this.parts.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.35, max: 0.35, ring: true, r0: c.r, r1: c.r * 3.2, color: TYPES[e.type].color });
    const close = e.state === 'attack', pts = TYPES[e.type].pts * (close ? 2 : 1);
    this.score += pts; sfx.kill();
    this.burst(c.x, c.y, TYPES[e.type].color, blast ? 26 : 18);
    this.text(c.x, c.y - 24, (close ? 'Close call +' : '+') + pts, close ? C.amber : C.cream);
  }

  free(e) {
    const c = TYPES.possessed.center(e);
    e.type = 'civilian'; e.flash = 0; this.st.freed++; if (this.lock === e) this.lock = null;
    this.parts.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.4, max: 0.4, ring: true, r0: c.r, r1: c.r * 3.5, color: C.cyan });
    this.score += TYPES.possessed.pts; sfx.freed();
    this.burst(c.x, c.y, C.violet, 20);
    this.text(c.x, c.y - 26, 'Freed +' + TYPES.possessed.pts, C.cyan);
  }

  foul(e) {
    this.st.fouls++; this.score = Math.max(0, this.score - 400); e.flash = 1;
    sfx.foul(); this.flash = 0.6; this.flashCol = C.red;
    this.text(e.sx, e.base - e.hh - 16, 'Civilian hit −400', C.red);
  }

  hurt(e) {
    this.lives--; this.st.hurt++; sfx.hurt();
    this.flash = 1; this.flashCol = C.red; this.shake = 0.9;
    const c = TYPES[e.type].center(e); this.burst(c.x, c.y, C.red, 14);
    if (this.lives <= 0) this.lose();
  }

  win() {
    this.over = true; sfx.clear();
    const acc = this.st.shots ? this.st.hits / this.st.shots : 1;
    const bonus = this.lives * 300; this.score += bonus;
    const stars = [true, acc >= 0.65, this.st.fouls === 0];
    setTimeout(() => this.hooks.onWin({ score: this.score, bonus, acc, stars, st: this.st, lives: this.lives }), 1400);
  }
  lose() { this.over = true; sfx.chargeStop(); sfx.fail(); setTimeout(() => this.hooks.onFail(), 1400); }

  /* ---------------- particles ---------------- */
  burst(x, y, color, n, life = 0.7) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (80 + Math.random() * 260) * (V.B / 400);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life, max: life, color, size: 2 + Math.random() * 4, g: 220, star: i % 3 === 0, rot: Math.random() * 3 });
    }
  }
  text(x, y, text, color, scale = 1) { this.parts.push({ x, y, vx: 0, vy: -55, life: 1, max: 1, color, text, scale }); }

  /* ---------------- drawing ---------------- */
  draw(ctx, now) {
    const t = now / 1000;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 14);
    drawScene(this.m.scene, ctx, t, this.scroll);
    if (this.adv > 0) speedLines(ctx, Math.min(1, this.adv), t);
    for (const e of [...this.ents].sort((a, b) => b.z - a.z)) {
      TYPES[e.type].draw(ctx, e, t);
      if (e.state === 'attack') this.drawWarning(ctx, e, t);
    }
    const tr = this.input.trig;
    if (tr.holding && tr.charge > 0 && this.energy >= BLAST_MIN) focusLines(ctx, tr.charge, t);
    if (this.impact > 0) { ctx.fillStyle = 'rgba(4,3,14,0.9)'; ctx.fillRect(-20, -20, V.W + 40, V.H + 40); focusLines(ctx, 1, t); }
    this.drawBolts(ctx); this.drawBeam(ctx, t); this.drawParts(ctx);
    this.drawLock(ctx, t);
    ctx.restore();
    if (this.flash > 0) { ctx.globalAlpha = this.flash * 0.4; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, V.W, V.H); ctx.globalAlpha = 1; }
    this.drawCrosshair(ctx, now);
    this.drawHud(ctx, t);
    if (this.handPaused && !this.over) this.drawHandPaused(ctx);
  }

  drawLock(ctx, t) {
    const L = this.lock; if (!L || L.dead) return;
    const c = this.lockPoint(L); if (!c) return;
    const k = Math.min(1, this.lockT / 0.15), R = c.r * (1.25 + (1 - k) * 1.5) + 6, rot = t * 1.5;
    ctx.save(); ctx.translate(c.x, c.y); ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.lineCap = 'square';
    for (let i = 0; i < 4; i++) {
      const a = rot + i * Math.PI / 2;
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(R, -R * 0.35); ctx.lineTo(R, 0); ctx.lineTo(R - R * 0.35, 0); ctx.stroke(); ctx.restore();
    }
    ctx.font = FONT(900, 12); ctx.textAlign = 'center'; ctx.fillStyle = C.amber; ctx.fillText('LOCK', 0, -R - 8);
    ctx.restore();
  }

  drawWarning(ctx, e, t) {
    const c = TYPES[e.type].center(e), k = Math.max(0, e.windup) / 1.0, R = c.r * (1.3 + k * 2.2);
    ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 30);
    ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.stroke();
    ctx.font = FONT(900, 26); ctx.textAlign = 'center'; ctx.fillStyle = C.red; ctx.fillText('!', c.x, c.y - R - 6);
    ctx.restore();
  }

  drawBolts(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const b of this.bolts) {
      const k = b.t / b.max, mx = b.x0 + (b.x1 - b.x0) * (1 - k * 0.6), my = b.y0 + (b.y1 - b.y0) * (1 - k * 0.6);
      ctx.strokeStyle = `rgba(111,243,255,${k})`; ctx.lineWidth = 10 * k; ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = `rgba(239,255,255,${k})`; ctx.lineWidth = 3 * k; ctx.stroke();
      glow(ctx, b.x1, b.y1, 34 * k, 'rgba(111,243,255,0.8)');
    }
    ctx.restore();
  }

  drawBeam(ctx, t) {
    const b = this.beam; if (!b) return;
    const k = b.t / b.max;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    speedLines(ctx, k, t);
    for (const [w, col] of [[b.w * 2.4, 'rgba(111,243,255,0.25)'], [b.w * 1.3, 'rgba(111,243,255,0.6)'], [b.w * 0.55, 'rgba(239,255,255,0.95)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w * (0.4 + k * 0.6); ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    }
    ctx.restore();
  }

  drawParts(ctx) {
    ctx.save();
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.text) {
        ctx.font = FONT(900, 20 * p.scale); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(15,20,48,.85)'; ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
      } else if (p.ring) {
        ctx.strokeStyle = p.color; ctx.lineWidth = 4 * a + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - a), 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.color;
        if (p.star) { starPath(ctx, p.x, p.y, p.size * 2.2 * a, p.rot + p.life * 4); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
  }

  drawCrosshair(ctx, now) {
    const tr = this.input.trig, a = this.dAim && this.mode === 'camera' ? this.dAim : this.input.aim;
    if (this.mode !== 'camera' && !(tr.holding && tr.charge > 0)) return;
    if (!this.input.aim.seen) return;
    const present = this.mode === 'touch' || this.input.hand.present, r = 22, rot = now / 700;
    const col = this.energy > 0 ? C.cyan : C.red;
    ctx.save(); ctx.translate(a.x, a.y); ctx.globalAlpha = present ? 1 : 0.3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, 0, r * 1.6, this.energy > 0 ? 'rgba(111,243,255,0.18)' : 'rgba(255,59,92,0.2)'); ctx.restore();
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); ctx.lineDashOffset = -now / 40; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = col;
    for (let i = 0; i < 4; i++) {
      const ang = rot + i * Math.PI / 2;
      ctx.save(); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(r + 4, 0); ctx.lineTo(r + 12, -4); ctx.lineTo(r + 12, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // trigger pull gauge (camera)
    if (this.mode === 'camera' && present && !tr.holding && tr.cocked) {
      const T = this.input.threshold(), cockT = T * 1.45, pull = Math.min(1, Math.max(0, (cockT - tr.ratio) / (cockT - T)));
      if (pull > 0.05) { ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pull); ctx.stroke(); }
    }
    // spirit blast charge
    if (tr.holding && tr.charge > 0) {
      const ok = this.energy >= BLAST_MIN, full = tr.charge >= 1;
      ctx.strokeStyle = ok ? (full ? C.core : C.cyan) : C.red; ctx.lineWidth = full ? 6 : 4;
      ctx.beginPath(); ctx.arc(0, 0, r + 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * tr.charge); ctx.stroke();
      if (ok) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        glow(ctx, 0, 0, r * (1 + tr.charge * 1.8) * (full ? 1 + 0.15 * Math.sin(now / 50) : 1), `rgba(111,243,255,${0.25 + tr.charge * 0.4})`);
        for (let i = 0; i < 6; i++) { const an = now / 200 + i, d = (r + 40) * (1 - ((now / 400 + i / 6) % 1)); ctx.fillStyle = C.core; ctx.fillRect(Math.cos(an) * d, Math.sin(an) * d, 2.5, 2.5); }
        ctx.restore();
      }
      if (full || !ok) { ctx.font = FONT(900, 15); ctx.textAlign = 'center'; ctx.fillStyle = ok ? C.core : C.red; ctx.fillText(ok ? 'RELEASE' : 'LOW ENERGY', 0, r + 40); }
    }
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawHud(ctx, t) {
    const top = V.SAT + 12, W = V.W, H = V.H;
    // lives as badges
    for (let i = 0; i < LIVES; i++) drawBadge(ctx, 18 + i * 30, top + 2, i < this.lives);
    // score
    ctx.font = FONT(900, 26); ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 12; ctx.fillStyle = C.core; ctx.fillText(this.score, W - 16, top - 4); ctx.restore();

    // energy bar
    const bx = 14, by = top + 52, bh = Math.min(H * 0.38, 280), bw = 12, gap = 4, segH = (bh - gap * (MAX_ENERGY - 1)) / MAX_ENERGY;
    for (let i = 0; i < MAX_ENERGY; i++) {
      const y = by + bh - (i + 1) * segH - i * gap, on = i < this.energy;
      if (on) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(111,243,255,${0.25 + this.rechargeFx * 0.5})`;
        ctx.fillRect(bx - 4, y - 3, bw + 8, segH + 6); ctx.restore();
        ctx.fillStyle = this.rechargeFx > 0 ? C.core : C.cyan; ctx.fillRect(bx, y, bw, segH);
      } else {
        ctx.strokeStyle = this.energy === 0 ? `rgba(255,59,92,${0.5 + 0.5 * Math.sin(t * 10)})` : 'rgba(169,166,214,.5)';
        ctx.lineWidth = 1.5; ctx.strokeRect(bx + 0.75, y + 0.75, bw - 1.5, segH - 1.5);
      }
    }
    if (this.rechargeFx > 0) {
      ctx.save(); ctx.globalAlpha = this.rechargeFx; ctx.font = FONT(900, 18); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.core; ctx.shadowColor = C.cyan; ctx.shadowBlur = 14; ctx.fillText('RECHARGED', bx + bw + 10, by + bh / 2); ctx.restore();
    }

    // stage banner
    if (this.banner) {
      const k = this.banner.t, a = Math.min(1, k * 2, (2.6 - k) * 4), y = H * 0.2;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = FONT(900, Math.min(44, W * 0.11)); ctx.shadowColor = C.cyan; ctx.shadowBlur = 20; ctx.fillStyle = C.core;
      ctx.fillText(this.banner.text, W / 2, y);
      const sw = Math.min(1, (2.6 - k) * 2) * W * 0.6; ctx.shadowBlur = 0; ctx.fillStyle = C.cyan; ctx.fillRect(W / 2 - sw / 2, y + 28, sw, 3);
      ctx.restore();
    }

    // instruction hint
    if (this.hint && !this.banner) {
      ctx.font = FONT(700, 15); const lines = wrap(ctx, this.hint, W - 110), lh = 20, h = lines.length * lh + 16, y = top + 50;
      ctx.fillStyle = 'rgba(15,20,48,.82)'; roundRect(ctx, 44, y, W - 88, h, 12); ctx.fill();
      ctx.strokeStyle = 'rgba(255,181,71,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = C.amber; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 8 + i * lh));
    }

    // out of energy prompt
    if (this.energy === 0 && !this.over && !this.handPaused && this.si >= 0) {
      const a = 0.6 + 0.4 * Math.sin(t * 8) + this.emptyFx;
      ctx.save(); ctx.globalAlpha = Math.min(1, a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = FONT(900, 30); ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 16; ctx.fillText('RECHARGE', W / 2, H * 0.6);
      ctx.shadowBlur = 0; ctx.font = FONT(700, 14); ctx.fillStyle = C.cream;
      ctx.fillText(this.mode === 'camera' ? 'Move your hand out of view' : 'Tap Recharge', W / 2, H * 0.6 + 26);
      ctx.restore();
    }

    // radio subtitles
    if (this.sub) {
      ctx.font = FONT(400, 15).replace('italic ', ''); const lines = wrap(ctx, this.sub.text, W - 56), lh = 20;
      const h = lines.length * lh + 34, y = H - V.SAB - 128 - h;
      ctx.fillStyle = 'rgba(10,13,36,.86)'; roundRect(ctx, 14, y, W - 28, h, 12); ctx.fill();
      ctx.fillStyle = C.cyan; ctx.fillRect(14, y + 10, 3, h - 20);
      ctx.font = FONT(700, 12); ctx.fillStyle = C.amber; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(this.sub.who.toUpperCase(), 26, y + 8);
      ctx.font = FONT(400, 15).replace('italic ', ''); ctx.fillStyle = C.cream;
      lines.forEach((l, i) => ctx.fillText(l, 26, y + 26 + i * lh));
    }
  }

  drawHandPaused(ctx) {
    ctx.fillStyle = 'rgba(10,13,36,.7)'; ctx.fillRect(0, 0, V.W, V.H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.core;
    ctx.font = FONT(900, 28); ctx.fillText('Paused', V.W / 2, V.H * 0.45);
    ctx.font = FONT(400, 15).replace('italic ', ''); ctx.fillStyle = C.cream;
    ctx.fillText('Bring your hand back into view', V.W / 2, V.H * 0.45 + 34);
  }
}

function drawBadge(ctx, x, y, on) {
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, 3); ctx.lineTo(10, 12); ctx.quadraticCurveTo(10, 20, 0, 25); ctx.quadraticCurveTo(-10, 20, -10, 12); ctx.lineTo(-10, 3); ctx.closePath();
  if (on) { ctx.shadowColor = C.amber; ctx.shadowBlur = 10; ctx.fillStyle = C.amber; ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#7A4A00'; ctx.beginPath(); ctx.arc(0, 11, 3.5, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.strokeStyle = 'rgba(169,166,214,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; }
  if (cur) lines.push(cur);
  return lines;
}
