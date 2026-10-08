// The prologue, played as visual-novel pages. {name} becomes the officer name from Settings.
// scene: 'keyart' (title art) or any scene name from view.js SCENES (records, market...).

export const CAPTAIN = 'Capt. Lira Santos';

export const PROLOGUE = [
  { scene: 'keyart', who: '', text: 'Port Lumen never sleeps. Its harbor lights burn all night, and for over a hundred years one light burned brighter than the rest: the Lumen Beacon on Halom Point.' },
  { scene: 'keyart', who: '', text: "The Beacon was never built to guide ships. Its light holds the Veil shut, the thin wall between our city and the Underside, where the restless dead drift." },
  { scene: 'keyart', who: '', text: 'Three nights ago, the Beacon went dark. The keeper is missing. Nobody knows who put the light out.' },
  { scene: 'records', who: '', text: "Since then the Veil has been wearing thin. Lights move through empty rooms. People wake up in places they never walked to. The old-timers have a name for it: the Thin Night." },
  { scene: 'keyart', who: CAPTAIN, text: "Every Thin Night, this city calls on us. Night Division. We don't exist on paper, and we don't carry guns." },
  { scene: 'keyart', who: CAPTAIN, text: 'We carry this. Spirit energy, focused through your own hand. Most people can\u2019t even see a ghoul. You can shoot one.' },
  { scene: 'keyart', who: CAPTAIN, text: "{name}, you have the strongest spirit-sight this division has recorded in thirty years. That's why a rookie is walking into the worst night of the decade." },
  { scene: 'keyart', who: CAPTAIN, text: 'Somebody wanted that Beacon dark, and the ghouls are only the beginning. Find out who, and stay alive doing it.' },
  { scene: 'records', who: CAPTAIN, text: "Your first call is in our own basement. Something's been rattling the case files. Let's see what you can do, Officer." }
];
