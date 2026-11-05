import type { PhysicsSim, SimImpact } from "../three/physics";
import { ramp, STEP_M } from "./anim";
import FOLEY_JSON from "./foley.json";
import type { Sfx, Space } from "./sound";

// Sound cues worked out from the animation instead of typed frame numbers, played from the foley library with a
// different take each time. Change the motion and the sounds move with it.

// public/foley/<name>/NN.wav, written by scripts/foley.py: how many takes each sound has, and where they came from.
export type FoleyEntry = { count: number; source: string; license: string; note?: string };
export const FOLEY = FOLEY_JSON as Record<string, FoleyEntry>;

// FNV-1a with murmur3's finaliser: keys that differ only in their last character ("thud:0", "thud:1") must land far
// apart in the high bits, or every cue picks the same take.
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// The take for the k-th cue of a sound: picked by a hash of (name, k), never the same file twice in a row.
export const foley = (name: string, k: number) => {
  const n = FOLEY[name]?.count;
  if (!n) throw new Error(`no foley "${name}" (scripts/foley.py list)`);
  let take = -1;
  for (let i = 0; i <= k; i++) {
    const t = Math.floor(hash(`${name}:${i}`) * n);
    take = t === take && n > 1 ? (t + 1) % n : t;
  }
  return `foley/${name}/${String(take + 1).padStart(2, "0")}.wav`;
};

type CueOpts = { space?: Space; hit?: number; jitter?: number };
// The k-th cue of a sound at frame `at`: its take, its volume nudged up to ±`jitter` dB (default 2).
const foleyCue = (name: string, k: number, at: number, volume: number, opts: CueOpts): Sfx => ({
  at,
  src: foley(name, k),
  volume: Math.min(1, volume * 10 ** (((hash(`${name}:v${k}`) * 2 - 1) * (opts.jitter ?? 2)) / 20)), // the browser caps at 1
  ...(opts.space ? { space: opts.space } : {}),
  ...(opts.hit ? { hit: opts.hit } : {}),
});

// One cue of `name` on each frame, each a different take and level, so a run of them never sounds stamped out.
// `space` and `hit` go onto every cue.
export const foleyCues = (name: string, frames: number[], volume: number, opts: CueOpts = {}): Sfx[] => frames.map((at, k) => foleyCue(name, k, at, volume, opts));

// Frames a jaw closes while chewing as |sin(phase)| over each [a, b) window: the munch frames. `phase` is a speed
// (rad per frame, phase = (f - a) * speed) or a function of the frames since the window opened and the window's index,
// rising from 0, for a rhythm that drifts like a real one.
export const jawCloses = (windows: [number, number][], phase: number | ((t: number, w: number) => number)) =>
  windows.flatMap(([a, b], w) => {
    const ph = typeof phase === "number" ? (t: number) => t * phase : (t: number) => phase(t, w);
    const out = [a];
    for (let f = a + 1; f < b; f++) if (Math.floor(ph(f - a) / Math.PI) > Math.floor(ph(f - 1 - a) / Math.PI)) out.push(f);
    return out;
  });

// Frames a foot lands during `stroll(f, start, frames, from, to)`: the legs are furthest apart each time the
// distance covered passes another half step (walkAt), and stroll eases the distance in and out.
export const stepFrames = (start: number, frames: number, from: [number, number], to: [number, number]) => {
  const total = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const steps = (f: number) => {
    const p = ramp(f, start, start + frames);
    return Math.floor((total * p * p * (3 - 2 * p)) / STEP_M - 0.5);
  };
  const out: number[] = [];
  for (let f = start + 1; f <= start + frames; f++) if (steps(f) > steps(f - 1)) out.push(f);
  return out;
};

// Cues for a baked simulation's impacts (`start` = the scene frame of sim frame 0). `sound` picks the foley and the
// volume for each hit, or null for none: scale the volume with `speed`, pick the sound by `other` (what was hit).
export const impactCues = (sim: PhysicsSim, start: number, sound: (h: SimImpact) => { name: string; volume: number; space?: Space; hit?: number } | null): Sfx[] => {
  const taken: Record<string, number> = {};
  return sim.impacts.flatMap((h) => {
    const s = sound(h);
    if (!s) return [];
    const k = (taken[s.name] = (taken[s.name] ?? -1) + 1);
    return [foleyCue(s.name, k, start + h.frame, s.volume, s)];
  });
};
