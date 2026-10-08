// Points the game at the hand-tracking files bundled inside the APK instead of the internet.
import fs from 'node:fs';
const file = process.argv[2];
let s = fs.readFileSync(file, 'utf8');
const swaps = [
  ["'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'", "'../vendor/vision_bundle.mjs'"],
  ["'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'", "new URL('../vendor/wasm', import.meta.url).href"],
  ["'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'", "new URL('../vendor/hand_landmarker.task', import.meta.url).href"]
];
for (const [from, to] of swaps) {
  if (!s.includes(from)) { console.error('Could not find ' + from + ' in ' + file); process.exit(1); }
  s = s.split(from).join(to);
}
fs.writeFileSync(file, s);
console.log('input.js now uses the bundled hand-tracking files');
