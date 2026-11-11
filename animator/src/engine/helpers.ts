import type React from "react";
import type { PuppetLook, PuppetPose } from "../puppet/Puppet";
import type { PuppetPlacement } from "../puppet/PuppetBillboard";
import { ramp } from "./anim";
import { useShotFrame } from "./clock";

// The small helpers every Scene.tsx used to re-define (ease in 32 videos, pup in 25, rand in 21, mix in 11...).
// Import them from "../../engine"; do not copy them into a video. The curves on a 0..1 progress (smooth, easeIn,
// easeOut, anticipate, settle, follow) live in motion.ts and are exported from the engine too.

// Slow-in / slow-out progress 0..1 between frames a and b: smooth(ramp(f, a, b)). For any move that starts and stops.
export const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// Linear blend of two numbers (not clamped): mix(from, to, ease(f, 20, 50)). For three numbers use lerp3.
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Repeatable pseudo-random 0..1 for item i, for scattering and varying props without Math.random (frames render
// out of order). `k` picks an independent stream for the same i: rand(i, seed), rand(i, seed + 1)...
// rand(i) is the one-argument hash the videos and src/three sets define; rand(i, k) is microwave-candy-bar's rnd.
export const rand = (i: number, k = 1) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Puppet units per metre (a puppet is 1060 units = 1.3 m tall): pose fields such as `air`, `reachL` are in units.
export const UNITS = 1060 / 1.3;

// One puppet placement for Stage's `puppets`; a pose without an expression gets "neutral".
export const pup = (id: string, look: PuppetLook, at: [number, number], pose: Partial<PuppetPose>): PuppetPlacement => ({
  id,
  look,
  at,
  pose: { expression: "neutral", ...pose } as PuppetPose,
});

// A shot component from a function of the shot frame: const S3 = one((f) => <Stage ... />).
export const one =
  (part: (f: number) => React.ReactElement): React.FC =>
  () =>
    part(useShotFrame());

// A shot made of several cuts: [length in frames, part] each, every part drawn with its own frame from 0; the last
// part runs to the end of the shot whatever its length says.
export const multi =
  (parts: [number, (f: number) => React.ReactElement][]): React.FC =>
  () => {
    const f = useShotFrame();
    let start = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      if (f < start + parts[i][0]) return parts[i][1](f - start);
      start += parts[i][0];
    }
    return parts[parts.length - 1][1](f - start);
  };
