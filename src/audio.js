// All sounds are synthesized, so there are no audio files to host.
import { settings } from './storage.js';

let ac = null, chargeOsc = null, chargeGain = null;
export function initAudio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  if (ac && ac.state === 'suspended') ac.resume();
}
const on = () => ac && settings.sound;

function tone(f1, f2, dur, type = 'sine', vol = 0.15, delay = 0) {
  if (!on()) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq = 1500, q = 1, delay = 0) {
  if (!on()) return;
  const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(ac.destination); src.start(ac.currentTime + delay);
}
export const vibrate = p => { if (settings.sound && navigator.vibrate) navigator.vibrate(p); };

export const sfx = {
  shot() { tone(1500, 260, 0.13, 'sine', 0.14); tone(2600, 900, 0.06, 'triangle', 0.05); },
  hit() { tone(900, 1300, 0.06, 'triangle', 0.1); },
  kill() { tone(1200, 2600, 0.14, 'sine', 0.1); noise(0.18, 0.12, 5200, 2); vibrate(12); },
  phase() { tone(320, 160, 0.18, 'sine', 0.1); },
  empty() { noise(0.05, 0.25, 3000, 4); },
  recharge() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f * 1.01, 0.1, 'triangle', 0.09, i * 0.045)); vibrate(20); },
  blast() { noise(0.7, 0.55, 700, 0.6); tone(240, 40, 0.8, 'sawtooth', 0.22); tone(1800, 200, 0.5, 'sine', 0.1); vibrate([40, 30, 90]); },
  hurt() { tone(150, 60, 0.35, 'square', 0.18); noise(0.25, 0.3, 400, 1); vibrate([90, 40, 90]); },
  foul() { tone(210, 120, 0.4, 'sawtooth', 0.14); vibrate([50, 50, 50]); },
  freed() { [784, 988, 1319, 1568].forEach((f, i) => tone(f, f, 0.12, 'sine', 0.11, i * 0.06)); vibrate(15); },
  radio() { noise(0.08, 0.08, 2500, 3); tone(1800, 1800, 0.04, 'square', 0.04, 0.08); },
  lock() { tone(2400, 2900, 0.05, 'square', 0.04); tone(3200, 3200, 0.04, 'square', 0.03, 0.05); },
  warn() { tone(760, 760, 0.07, 'square', 0.08); tone(760, 760, 0.07, 'square', 0.08, 0.12); },
  clear() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.12, i * 0.09)); },
  fail() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.3, 'triangle', 0.14, i * 0.22)); },
  chargeStart() {
    if (!on() || chargeOsc) return;
    chargeOsc = ac.createOscillator(); chargeGain = ac.createGain();
    chargeOsc.type = 'sawtooth'; chargeOsc.frequency.value = 120; chargeGain.gain.value = 0.04;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    chargeOsc.connect(f).connect(chargeGain).connect(ac.destination); chargeOsc.start();
  },
  chargeLevel(p) { if (chargeOsc) { chargeOsc.frequency.setTargetAtTime(120 + p * 520, ac.currentTime, 0.05); chargeGain.gain.setTargetAtTime(0.03 + p * 0.06, ac.currentTime, 0.05); } },
  chargeStop() { if (chargeOsc) { try { chargeOsc.stop(); } catch {} chargeOsc = null; chargeGain = null; } }
};
