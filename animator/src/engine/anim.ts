import type { Expression, PuppetPose } from "../puppet/Puppet";

// Small animation helpers shared by every scene. Frames are shot-local unless a name says otherwise.

export type Vec3 = [number, number, number];

export const lerp3 = (a: Vec3, b: Vec3, p: number) => a.map((v, i) => v + (b[i] - v) * p) as Vec3;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// 0 before a, 1 after b, linear in between.
export const ramp = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
// Idle body bob in puppet units.
export const breathe = (f: number) => Math.sin(f / 6) * 6;
// Mouth opening while a line is spoken.
export const talk = (f: number) => 0.35 + 0.35 * Math.sin(f * 1.1) + 0.2 * Math.sin(f * 2.3);
// Spread into a front- or side-view pose while the puppet walks.
export const walk = (f: number) => ({ legSwing: Math.sin(f / 3) * 20, bob: -Math.abs(Math.sin(f / 3)) * 14 });
// Scale for a prop that takes a hit at frame `at`: it squashes flat, springs tall, and settles in ~12 frames.
// Spread into the prop's group `scale`. `amount` 0.25 is a firm thump.
export const squash = (f: number, at: number, amount = 0.25): Vec3 => {
  const dt = f - at;
  const s = dt < 0 || dt > 20 ? 0 : amount * Math.cos(dt * 0.75) * Math.exp(-dt / 4);
  return [1 + s * 0.5, 1 - s, 1 + s * 0.5];
};
// A puppet walking on the floor from `from` to `to` (x, z) between frames `start` and `start + frames`, easing in
// and out. Spread `pose` over the standing pose: while it moves it strides (in profile when crossing sideways)
// with arms swinging free; before and after it adds nothing.
export const stroll = (f: number, start: number, frames: number, from: [number, number], to: [number, number]) => {
  const p = ramp(f, start, start + frames);
  const e = p * p * (3 - 2 * p);
  const at: [number, number] = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e];
  if (p <= 0 || p >= 1) return { at, pose: {} as Partial<PuppetPose> };
  const dx = to[0] - from[0];
  const sideways = Math.abs(dx) > Math.abs(to[1] - from[1]);
  const pose: Partial<PuppetPose> = { ...walk(f), armL: undefined, armR: undefined, ...(sideways ? { view: "side", facing: dx > 0 ? 1 : -1 } : {}) };
  return { at, pose };
};

// Expression changes that ease instead of popping. `steps` lists [start frame, expression] in order; for `len`
// frames after each start the face blends from the previous one. Spread the result into a pose.
export const faceChange = (steps: [number, Expression][], f: number, len = 10): Pick<PuppetPose, "expression" | "from" | "blend"> => {
  let i = 0;
  while (i + 1 < steps.length && steps[i + 1][0] <= f) i++;
  const [start, expression] = steps[i];
  if (i === 0 || f - start >= len) return { expression };
  const p = clamp01((f - start) / len);
  return { expression, from: steps[i - 1][1], blend: p * p * (3 - 2 * p) };
};
