// Settings and case progress, saved on the phone (localStorage).
const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const settings = Object.assign(
  { trigger: 'thumb', thumbT: 42, pinchT: 32, smooth: 55, reach: 20, assist: 1, sound: 1 },
  get('nd-settings', {})
);
export const saveSettings = () => put('nd-settings', settings);

export const progress = Object.assign({ missions: {} }, get('nd-progress', {}));
export function recordResult(id, stars, score) {
  const m = progress.missions[id] || { stars: 0, best: 0 };
  m.cleared = true;
  m.stars = Math.max(m.stars, stars);
  m.best = Math.max(m.best, score);
  progress.missions[id] = m;
  put('nd-progress', progress);
}
export function resetProgress() { progress.missions = {}; put('nd-progress', progress); }
