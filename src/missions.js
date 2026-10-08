// Missions are pure data. Each step can:
//   title:   show a stage name banner
//   say:     radio lines [[speaker, text], ...]
//   hint:    on-screen instruction (string, or { camera, touch })
//   advance: true to walk forward through the scene before the step starts
//   energy:  set the player's spirit energy (0-6)
//   spawns:  [{ type, x, z, delay, ...options }]
//   until:   'clear' (default) | 'recharge' | 'blast' | 'time' (with wait: seconds)
// Spawn options: x (-1 left .. 1 right), z (depth, 0 near .. 1 far), delay (s),
//   speed, h (height), still, drop (falls from above), tx (slides in to this x), dir (walk direction), armored.
// Briefing fields: caseNo, brief (story text), objectives [..]. {name} becomes the officer name.
// To add a mission: write it below, then replace its comingSoon entry in CHAPTER_1.

import { CAPTAIN } from './story.js';

const D = CAPTAIN;

const RECORDS_ROOM = {
  id: 'c1m1', num: 1, title: 'Records Room', place: 'Precinct basement', scene: 'records',
  caseNo: 'Case 001', caseName: 'Restless Files',
  brief: 'The precinct archive holds every haunting Night Division has ever closed. Since the Beacon went dark, its drawers open by themselves at night, and the oldest files keep ending up on the floor. Start your shift here and prove your training.',
  objectives: ['Learn the Spirit Shot, Recharge and Spirit Blast', 'Free a possessed clerk without hurting anyone', 'Clear the archive'],
  steps: [
    { title: 'Records Room',
      say: [[D, 'Santos here, {name}. Welcome to your first shift.'], [D, "Before the real thing, warm up on these training lanterns."]],
      hint: { camera: 'Point your finger gun at a lantern and drop your thumb to shoot', touch: 'Tap a lantern to shoot' },
      spawns: [{ type: 'lantern', x: -0.45, z: 0.45 }, { type: 'lantern', x: 0, z: 0.6, delay: 0.3 }, { type: 'lantern', x: 0.45, z: 0.45, delay: 0.6 }] },
    { say: [[D, 'Your spirit energy is empty. The bar on the left is your ammo.']], energy: 0, until: 'recharge',
      hint: { camera: 'Move your hand out of the camera view, then bring it back', touch: 'Tap Recharge' } },
    { say: [[D, "These lanterns are warded. Regular shots won't break them. You need a Spirit Blast."]], energy: 6, until: 'blast',
      hint: { camera: 'Keep your thumb down until the ring fills, then lift it to fire a Spirit Blast', touch: 'Press and hold until the ring fills, then let go' },
      spawns: [{ type: 'lantern', armored: true, x: 0, z: 0.3, h: 0.7 }, { type: 'lantern', armored: true, x: 0, z: 0.55, h: 1.3 }, { type: 'lantern', armored: true, x: 0, z: 0.85, h: 2.0 }] },
    { say: [[D, 'Careful. Spirits ride people. Shoot the spirit on their shoulder, never the person.']], energy: 6,
      hint: 'Free the possessed clerk. Do not hit the janitor.',
      spawns: [{ type: 'civilian', x: 1.3, z: 0.5, dir: -1, speed: 0.17 }, { type: 'possessed', x: -1.3, z: 0.32, dir: 1, speed: 0.15, delay: 1.2 }] },
    { say: [[D, "Here they come. Wisps fly straight at you. Phantoms can only be hit while they're solid."]],
      hint: 'Clear the room',
      spawns: [
        { type: 'wisp', x: -0.3, z: 0.9 }, { type: 'wisp', x: 0.4, z: 0.95, delay: 1.5 },
        { type: 'phantom', x: 0, z: 0.85, delay: 3 }, { type: 'wisp', x: -0.5, z: 0.9, delay: 4.5 }, { type: 'wisp', x: 0.5, z: 0.9, delay: 5.5 }] },
    { say: [[D, 'Archive is clear. Strange. Every file they knocked loose was a Beacon case.'], [D, 'Not bad for a rookie, {name}. Ninth Street needs you next.']], until: 'time', wait: 9 }
  ]
};

const NIGHT_MARKET = {
  id: 'c1m2', num: 2, title: 'Night Market', place: 'Ninth Street', scene: 'market',
  caseNo: 'Case 002', caseName: 'Lights on Ninth Street',
  brief: "The Ninth Street night market is the busiest place in Port Lumen after midnight. Vendors report floating lights between the stalls, and three shoppers have wandered off in a trance. Something is gathering the spirits here, and the crowd hasn't gone home.",
  objectives: ['Clear the wisps without hitting civilians', 'Free every possessed shopper you can', 'Find where the ghouls are coming from'],
  steps: [
    { title: 'Ninth Street',
      say: [[D, 'Reports of lights moving between the stalls on Ninth Street.'], [D, 'Civilians are still out. Watch your fire.']],
      spawns: [
        { type: 'wisp', x: -0.4, z: 0.95, delay: 1 }, { type: 'wisp', x: 0.3, z: 0.95, delay: 2.2 },
        { type: 'wisp', x: 0, z: 0.9, delay: 3.5 }, { type: 'wisp', x: -0.6, z: 0.85, delay: 4.2 }, { type: 'wisp', x: 0.6, z: 0.9, delay: 5.5 }] },
    { title: 'Food Stalls', advance: true,
      say: [[D, "Shoppers are acting strange near the food stalls. If they're possessed, free them."]],
      spawns: [
        { type: 'civilian', x: -1.3, z: 0.55, dir: 1 }, { type: 'possessed', x: 1.3, z: 0.4, dir: -1, delay: 0.8 },
        { type: 'wisp', x: -0.5, z: 0.5, drop: true, delay: 2 }, { type: 'wisp', x: 0.5, z: 0.55, drop: true, delay: 3.2 },
        { type: 'possessed', x: -1.3, z: 0.3, dir: 1, delay: 4.5 }, { type: 'civilian', x: 1.3, z: 0.35, dir: -1, delay: 5.5 },
        { type: 'wisp', x: 0, z: 0.6, drop: true, delay: 6.5 }] },
    { title: 'Lantern Alley', advance: true,
      say: [[D, "Phantoms in the alley. Wait for them to turn solid, then hit them twice."]],
      spawns: [
        { type: 'phantom', x: -0.35, z: 0.9 }, { type: 'wisp', x: -1.4, tx: -0.5, z: 0.45, delay: 1.5 },
        { type: 'phantom', x: 0.35, z: 0.95, delay: 3 }, { type: 'wisp', x: 1.4, tx: 0.5, z: 0.45, delay: 4 },
        { type: 'phantom', x: 0, z: 0.9, delay: 6 }, { type: 'wisp', x: -1.4, tx: -0.3, z: 0.35, delay: 7 }] },
    { title: 'Market Square', advance: true,
      say: [[D, "This is where it's coming from. Hold the square, Officer."]],
      spawns: [
        { type: 'wisp', x: -0.5, z: 0.95 }, { type: 'wisp', x: 0.5, z: 0.95, delay: 0.6 },
        { type: 'civilian', x: -1.3, z: 0.45, dir: 1, delay: 1.5 }, { type: 'phantom', x: 0, z: 0.9, delay: 2.5 },
        { type: 'wisp', x: -0.3, z: 0.55, drop: true, delay: 4 }, { type: 'possessed', x: 1.3, z: 0.35, dir: -1, delay: 5 },
        { type: 'wisp', x: 1.4, tx: 0.55, z: 0.4, delay: 6.5 }, { type: 'phantom', x: -0.4, z: 0.95, delay: 7.5 },
        { type: 'wisp', x: 0.3, z: 0.6, drop: true, delay: 9 }, { type: 'wisp', x: -1.4, tx: -0.55, z: 0.4, delay: 10 },
        { type: 'possessed', x: -1.3, z: 0.5, dir: 1, delay: 11 }, { type: 'phantom', x: 0.4, z: 0.9, delay: 12.5 },
        { type: 'wisp', x: 0, z: 0.95, delay: 13.5 }, { type: 'wisp', x: -0.5, z: 0.95, delay: 14 }, { type: 'wisp', x: 0.5, z: 0.95, delay: 14.5 }] },
    { say: [[D, 'Ninth Street is quiet. Good work, {name}.'], [D, 'Those wisps were all drifting one way, down the old subway stairs. Something underground is calling them.']], until: 'time', wait: 9 }
  ]
};

export const CHAPTER_1 = {
  num: 1, title: 'The Thin Night',
  missions: [
    RECORDS_ROOM,
    NIGHT_MARKET,
    { id: 'c1m3', num: 3, title: 'Last Train', place: 'Subway platform', comingSoon: true, teaser: 'The 2:10 train keeps stopping at a station sealed in 1988.' },
    { id: 'c1m4', num: 4, title: 'Ward Nine', place: 'Old hospital', comingSoon: true, teaser: "Ward Nine's lights are on. The building has had no power for years." },
    { id: 'c1m5', num: 5, title: 'The Toll Keeper', place: 'River bridge', comingSoon: true, teaser: 'Something is collecting a toll on the river bridge. Nobody who pays it comes back.' }
  ]
};
