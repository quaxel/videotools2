import { Timing } from "../../engine";
import TIMING_JSON from "./timing.json";

// The shot boundaries (video frames) for "cabin-pressure", owned by Scene.tsx's shot list. Every shot component
// takes its own frame from useShotFrame() (0 at the cut); place beats with `beat(line, frac, shot)`: the frame,
// relative to that shot's start, at which line `line` has run `frac` of its span (0 = its first word, 1 = its last).
// A word's place in a line: frac ~ (words before it) / (words in the line). Re-voicing changes only timing.json.
export const TIMING = TIMING_JSON as Timing;

export const SHOT = {
  extHook: [0, 116],
  cabinBarry: [116, 238],
  cockpitCruise: [238, 433],
  doorSeal: [433, 570],
  psuDrop: [570, 675],
  cabinRows: [675, 894],
  euphoria: [894, 1167],
  galley: [1167, 1241],
  generator: [1241, 1369],
  cockpitDive: [1369, 1475],
  cabinCalm: [1475, 1545],
  extLow: [1545, TIMING.totalFrames],
} as const;
export type ShotId = keyof typeof SHOT;

export const beat = (line: number, frac: number, shot: ShotId) => {
  const l = TIMING.lines![line];
  return Math.round(l.from + (l.to - l.from) * frac) - SHOT[shot][0];
};
// Video frame -> frame inside a shot (for SFX lists, which use video frames: at = SHOT[id][0] + local).
export const at = (shot: ShotId, local: number) => SHOT[shot][0] + local;
