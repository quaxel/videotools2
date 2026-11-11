import React from "react";
import { MUSIC_FILES, MusicCue, Shot, Video } from "../../engine";
import { CabinBarry, CabinRows, cabinShotsSfx, PsuDrop } from "./cabinShots";
import { CabinCalm, cabinFxSfx, DoorSeal, Euphoria } from "./cabinFx";
import { CockpitCruise, CockpitDive, cockpitSfx, Galley, Generator } from "./cockpit";
import { ExtHook, ExtLow, exteriorSfx } from "./exterior";
import { TIMING } from "./shots";

// "Why Feeling Great Is the Danger When the Oxygen Masks Drop" (plan.json, research.md). At thirty-five thousand
// feet a door seal cracks, the cabin fogs and the masks drop; Barry feels fantastic, which is the problem: hypoxia
// arrives as euphoria. Sets: CabinSet (cabin.tsx), the cockpit and galley (cockpit.tsx), the airliner outside
// (exterior.tsx, airliner.glb from ../videos/cabin-pressure/sand3d/airliner.py). Shot boundaries live in shots.ts.

export const SLUG = "cabin-pressure";
export const timing = TIMING;

const SHOTS: Shot[] = [
  [0, 116, ExtHook, false],
  [116, 238, CabinBarry, "dip"],
  [238, 433, CockpitCruise, "dip"],
  [433, 570, DoorSeal, "dip"],
  [570, 675, PsuDrop, "dip"],
  [675, 894, CabinRows, "dip"],
  [894, 1167, Euphoria, "dip"],
  [1167, 1241, Galley, "dip"],
  [1241, 1369, Generator, "dip"],
  [1369, 1475, CockpitDive, "dip"],
  [1475, 1545, CabinCalm, "dip"],
  [1545, TIMING.totalFrames, ExtLow, "dip"],
];

const SFX = [...exteriorSfx, ...cabinShotsSfx, ...cockpitSfx, ...cabinFxSfx];
// Library beds until the video's own score (music.py) has been heard against them.
const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.mystery, from: 0, to: 433, volume: 0.22 },
  { src: MUSIC_FILES.tension, from: 433, to: 894, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 894, to: 1167, volume: 0.2 },
  { src: MUSIC_FILES.tension, from: 1167, to: 1475, volume: 0.26 },
  { src: MUSIC_FILES.lounge, from: 1475, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
