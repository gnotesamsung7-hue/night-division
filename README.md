# Mark Dave's Night Division

A phone rail shooter played with your hand. Stand the phone upright, make a finger gun at the front camera, and fire spirit energy at otherworldly ghouls. Hand tracking runs in the browser with MediaPipe, and the video never leaves the phone.

## Story: Dilim ng Maynila

Beneath Manila lies the Ilalim, a shadow world of Philippine folklore held back for a century by the Lumen Beacon. Three nights ago the Beacon was sabotaged and went dark. Mark Dave, a rookie from Quezon province with a natural spirit gun in his index finger, joins Captain Lira Santos, Kiko and Maya of the Night Division to find who turned off the light. The trail leads to General Apolinario "Pule" Vex.

## Controls

| Action | Camera | Touch |
|---|---|---|
| Aim | Point your index finger | Touch the screen |
| Spirit shot | Drop your thumb | Tap |
| Spirit Blast | Keep your thumb down until the ring fills, then lift | Press and hold, then let go |
| Recharge | Move your hand out of the camera view | Tap Recharge |
| Switch weapon | Hold up an open palm until the ring fills | Tap the weapon icons |
| Spirit Knife | Swipe your hand fast across ghouls (or drop your thumb to stab) | Swipe, or tap to stab |
| Spirit Punch | Punch toward the camera (or drop your thumb) | Tap |
| Target lock | Aim near a ghoul and the crosshair locks on | Tap near a ghoul |

Hiding your hand for about 2 seconds pauses the game.

## Chapter 1: The Blackout

| # | Mission | Boss |
|---|---|---|
| 1 | Command Post (tutorial) | Archive Kapre |
| 2 | Quiapo Night Market | Manananggal |
| 3 | LRT Tunnels | Ghost Train |
| 4 | Pasig Drainage | Bakunawa Spawn |
| 5 | Colonial Crypts | Santelmo Knight |
| 6 | The Lumen Beacon | General Vex (final) |

Practice Range: endless ghouls or a boss rush, with no lives lost. Pause and quit to see your stats.

## Project layout

```
index.html        screens and buttons
style.css         menu and screen styling
src/main.js       app start, case map, settings, main loop
src/input.js      camera hand tracking, gestures, touch input
src/game.js       mission runner: combat, energy, scoring, HUD
src/enemies.js    ghouls (wisp, phantom, dino, grub, imp), people and targets
src/missions.js   mission scripts and case briefings (pure data)
src/story.js      prologue and epilogue story pages
src/bosses.js     the six bosses
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
