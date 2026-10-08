# Mark Dave's Night Division

A phone rail shooter played with your hand. Stand the phone upright, make a finger gun at the front camera, and fire spirit energy at otherworldly ghouls. Hand tracking runs in the browser with MediaPipe, and the video never leaves the phone.

## Story

Port Lumen's Lumen Beacon has kept the Veil between the city and the Underside sealed for a century. Three nights ago it went dark. As the Thin Night spreads, Captain Lira Santos sends Night Division's newest rookie, with the strongest spirit-sight in thirty years, to find out who put the light out.

## Controls

| Action | Camera | Touch |
|---|---|---|
| Aim | Point your index finger | Touch the screen |
| Spirit shot | Drop your thumb | Tap |
| Spirit Blast | Keep your thumb down until the ring fills, then lift | Press and hold, then let go |
| Recharge | Move your hand out of the camera view | Tap Recharge |
| Target lock | Aim near a ghoul and the crosshair locks on | Tap near a ghoul |

Hiding your hand for about 2 seconds pauses the game.

## Chapter 1: The Thin Night

1. Records Room (tutorial): playable
2. Night Market: playable
3. Last Train: coming soon
4. Ward Nine: coming soon
5. The Toll Keeper (boss): coming soon

## Project layout

```
index.html        screens and buttons
style.css         menu and screen styling
src/main.js       app start, case map, settings, main loop
src/input.js      camera hand tracking, gestures, touch input
src/game.js       mission runner: combat, energy, scoring, HUD
src/enemies.js    ghouls (wisp, phantom, dino, grub, imp), people and targets
src/missions.js   mission scripts and case briefings (pure data)
src/story.js      prologue story pages
src/view.js       perspective and scene backgrounds
src/audio.js      synthesized sound effects
src/storage.js    saved settings and progress
```

## Adding to the game

- **New mission:** write it in `src/missions.js` (the format is documented at the top of the file) and swap it in for a `comingSoon` entry.
- **New ghoul:** add an entry to `TYPES` in `src/enemies.js`.
- **New location:** add a draw function to `SCENES` in `src/view.js` and set `scene` on the mission.

## Hosting

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root. The camera needs the https Pages link.
