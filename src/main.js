import { V, resizeView, drawScene, glow } from './view.js';
import { input, startCamera, stopCamera, pollInput, attachTouch, applySmoothing, resetGestures } from './input.js';
import { Game } from './game.js';
import { CHAPTER_1 } from './missions.js';
import { settings, saveSettings, progress, recordResult, resetProgress } from './storage.js';
import { initAudio, sfx } from './audio.js';

const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d'), pv = $('pv'), pctx = pv.getContext('2d'), video = $('cam');
const SCREENS = ['title', 'map', 'results', 'fail', 'pause', 'settings'];
let game = null, current = null, settingsReturn = null;

function show(id) { SCREENS.forEach(s => $(s).classList.toggle('show', s === id)); }
function setPlayingUi(on) {
  $('pauseBtn').style.display = on ? 'block' : 'none';
  $('rechargeBtn').style.display = on && input.mode === 'touch' ? 'block' : 'none';
  pv.style.display = input.mode === 'camera' && input.camOn ? 'block' : 'none';
}

/* ---------------- title ---------------- */
$('btnCamera').addEventListener('click', async () => {
  initAudio();
  const btn = $('btnCamera'), msg = $('titleMsg');
  msg.style.display = 'none'; btn.disabled = true; btn.textContent = 'Starting camera…';
  try {
    await startCamera(video, s => (btn.textContent = s));
    openMap();
  } catch (e) {
    console.error(e); stopCamera();
    msg.style.display = 'block';
    msg.textContent = e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.'
      : e.name === 'NotFoundError' ? 'No front camera found on this device.'
      : e.name === 'NoMedia' ? "This browser can't use the camera here. Open the game from its https link in Chrome or Safari."
      : "Couldn't load the hand model. Check your internet connection and try again.";
  }
  btn.disabled = false; btn.textContent = 'Start with camera';
});
$('btnTouch').addEventListener('click', () => { initAudio(); stopCamera(); input.mode = 'touch'; openMap(); });
$('btnBackTitle').addEventListener('click', () => { stopCamera(); input.mode = null; pv.style.display = 'none'; show('title'); });

/* ---------------- case map ---------------- */
function openMap() {
  game = null; setPlayingUi(false); sfx.chargeStop();
  pv.style.display = input.mode === 'camera' && input.camOn ? 'block' : 'none';
  const list = $('missionList'); list.innerHTML = '';
  CHAPTER_1.missions.forEach((m, i) => {
    const prev = CHAPTER_1.missions[i - 1], unlocked = !m.comingSoon && (i === 0 || progress.missions[prev.id]?.cleared);
    const rec = progress.missions[m.id];
    const b = document.createElement('button'); b.className = 'mission'; b.disabled = !unlocked;
    const stars = rec ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : '';
    b.innerHTML = `<span class="num">${m.num}</span><span><span class="name">${m.title}</span><span class="place">${m.comingSoon ? 'Coming soon' : m.place}${rec ? ` · best ${rec.best}` : ''}</span></span><span class="mstars">${stars}</span>`;
    if (unlocked) b.addEventListener('click', () => startMission(m));
    list.appendChild(b);
  });
  show('map');
}

/* ---------------- mission flow ---------------- */
function startMission(m) {
  initAudio(); current = m; show(null); resetGestures();
  game = new Game(m, input.mode, input, { onWin: showResults, onFail: () => { setPlayingUi(false); show('fail'); } });
  setPlayingUi(true);
}
function showResults(r) {
  recordResult(current.id, r.stars.filter(Boolean).length, r.score);
  setPlayingUi(false);
  $('resStars').innerHTML = r.stars.map(s => `<span class="${s ? '' : 'off'}">★</span>`).join('');
  $('resScore').textContent = r.score;
  const st = r.st;
  $('resStats').innerHTML = `
    <div><b>${Math.round(r.acc * 100)}%</b>Accuracy</div>
    <div><b>${st.kills}</b>Ghouls cleared</div>
    <div><b>${st.freed}</b>People freed</div>
    <div><b>${st.fouls}</b>Civilians hit</div>
    <div><b>${st.hurt}</b>Damage taken</div>
    <div><b>+${r.bonus}</b>Badge bonus</div>
    <div class="crit"><span>${r.stars[0] ? '★' : '☆'}</span> Case closed<br><span>${r.stars[1] ? '★' : '☆'}</span> Accuracy 65% or better<br><span>${r.stars[2] ? '★' : '☆'}</span> No civilians hit</div>`;
  const idx = CHAPTER_1.missions.indexOf(current), nxt = CHAPTER_1.missions[idx + 1];
  const nb = $('btnNext');
  if (nxt && !nxt.comingSoon) { nb.style.display = 'block'; nb.textContent = 'Next case'; nb.onclick = () => startMission(nxt); }
  else { nb.style.display = 'none'; }
  $('resTitle').textContent = nxt && nxt.comingSoon ? 'Case closed. More cases coming soon' : 'Case closed';
  show('results');
}
$('btnRetry').addEventListener('click', () => startMission(current));
$('btnRetry2').addEventListener('click', () => startMission(current));
$('btnMap1').addEventListener('click', openMap);
$('btnMap2').addEventListener('click', openMap);

/* ---------------- pause & settings ---------------- */
function pause() { if (!game || game.over) return; game.paused = true; sfx.chargeStop(); show('pause'); }
$('pauseBtn').addEventListener('click', pause);
$('btnResume').addEventListener('click', () => { show(null); if (game) { game.paused = false; resetGestures(); } });
$('btnQuit').addEventListener('click', openMap);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
$('rechargeBtn').addEventListener('click', () => game?.recharge());

function openSettings(from) { settingsReturn = from; syncSettings(); show('settings'); }
$('btnSettings1').addEventListener('click', () => openSettings('title'));
$('btnSettings2').addEventListener('click', () => openSettings('pause'));
$('btnCloseSettings').addEventListener('click', () => { saveSettings(); show(settingsReturn); });
$('btnReset').addEventListener('click', () => { if (confirm('Reset all case progress and stars?')) { resetProgress(); } });

document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  const k = seg.dataset.key; settings[k] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; syncSettings();
})));
$('sTrig').addEventListener('input', e => { settings[settings.trigger === 'thumb' ? 'thumbT' : 'pinchT'] = +e.target.value; syncSettings(); });
$('sSmooth').addEventListener('input', e => { settings.smooth = +e.target.value; syncSettings(); });
$('sReach').addEventListener('input', e => { settings.reach = +e.target.value; syncSettings(); });
function syncSettings() {
  const tv = settings.trigger === 'thumb' ? settings.thumbT : settings.pinchT;
  $('sTrig').value = tv; $('vTrig').textContent = (tv / 100).toFixed(2);
  $('sSmooth').value = settings.smooth; $('vSmooth').textContent = settings.smooth;
  $('sReach').value = settings.reach; $('vReach').textContent = settings.reach + '%';
  document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v == settings[seg.dataset.key])));
  applySmoothing();
}

/* ---------------- camera preview ---------------- */
const CHAINS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]];
function drawPreview() {
  if (pv.style.display === 'none' || !video.videoWidth) return;
  const ph = Math.round(pv.width * video.videoHeight / video.videoWidth); if (pv.height !== ph) pv.height = ph;
  const w = pv.width, h = pv.height;
  pctx.save(); pctx.translate(w, 0); pctx.scale(-1, 1); pctx.drawImage(video, 0, 0, w, h); pctx.restore();
  const m = settings.reach / 100; pctx.strokeStyle = 'rgba(111,243,255,.6)'; pctx.setLineDash([3, 3]); pctx.lineWidth = 1;
  pctx.strokeRect(m * w, m * h, (1 - 2 * m) * w, (1 - 2 * m) * h); pctx.setLineDash([]);
  const lm = input.hand.lm;
  if (lm && input.hand.present) {
    const P = i => [(1 - lm[i].x) * w, lm[i].y * h];
    pctx.strokeStyle = '#6FF3FF'; pctx.lineWidth = 1.5;
    CHAINS.forEach(c => { pctx.beginPath(); c.forEach((i, j) => j ? pctx.lineTo(...P(i)) : pctx.moveTo(...P(i))); pctx.stroke(); });
    [4, 8].forEach(i => { pctx.fillStyle = '#FFB547'; pctx.beginPath(); pctx.arc(...P(i), 2.5, 0, Math.PI * 2); pctx.fill(); });
  }
}

/* ---------------- main loop ---------------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  pollInput(now, V.W, V.H);
  if (game) {
    for (const ev of input.events) game.handle(ev);
    input.events.length = 0;
    game.update(dt, now);
    game.draw(ctx, now);
  } else {
    input.events.length = 0;
    drawScene('market', ctx, now / 1000, now / 9000);
    ctx.fillStyle = 'rgba(15,20,48,.35)'; ctx.fillRect(0, 0, V.W, V.H);
    // a few idle wisps drifting behind the menus
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const x = V.W * (0.2 + 0.6 * ((Math.sin(now / 3000 + i * 1.7) + 1) / 2)), y = V.H * (0.3 + 0.12 * Math.sin(now / 1700 + i * 2.3) + i * 0.08);
      glow(ctx, x, y, 26, 'rgba(182,92,255,.5)'); glow(ctx, x, y, 8, 'rgba(255,240,255,.9)');
    }
    ctx.restore();
  }
  drawPreview();
  requestAnimationFrame(loop);
}

addEventListener('resize', () => resizeView(cv, ctx));
resizeView(cv, ctx); attachTouch(cv); syncSettings();
requestAnimationFrame(loop);
