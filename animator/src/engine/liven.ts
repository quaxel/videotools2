import { PuppetPose } from "../puppet/Puppet";
import { CameraShot } from "./stage";
import { Vec3 } from "./anim";

// Automatic life on top of what a shot authors, so no frame is ever still.
// energy 0 = exactly as authored, 1 = default, up to ~1.5 for hyper shots.

const sub = (a: Vec3, b: Vec3) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as Vec3;
const add = (a: Vec3, b: Vec3) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as Vec3;
const scale = (a: Vec3, k: number) => [a[0] * k, a[1] * k, a[2] * k] as Vec3;
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

// f = shot frame (negative during a dissolve), dur = shot length.
export const livenCamera = (cam: CameraShot, f: number, dur: number, energy: number): CameraShot => {
  if (energy <= 0) return cam;
  const p = Math.min(1, Math.max(0, f / Math.max(1, dur)));
  const back = sub(cam.position, cam.target);
  const dist = len(back);
  // 1. Constant push toward the subject across the shot (on top of the authored move).
  const push = 0.1 * energy * (1 - Math.pow(1 - p, 1.6));
  // 2. Settle after the cut: start a little wide and ease in over the first 10 frames.
  const settle = 0.06 * energy * Math.max(0, 1 - Math.max(0, f) / 10) ** 2;
  const position = add(cam.target, scale(back, 1 - push + settle));
  // 3. Hand-held drift: slow, smooth, proportional to the distance, on both camera and aim.
  const a = 0.022 * energy * dist;
  const drift: Vec3 = [Math.sin(f / 23) * a + Math.sin(f / 9.1) * a * 0.35, Math.sin(f / 29 + 1.3) * a * 0.6, 0];
  const aim: Vec3 = [Math.sin(f / 31 + 0.7) * a * 0.5, Math.sin(f / 17 + 2.1) * a * 0.3, 0];
  return { ...cam, position: add(position, drift), target: add(cam.target, aim) };
};

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};

// A random number 0..1 for (id, n), the same on every render.
const noise = (id: string, n: number) => hash(`${id}:${n}`);
const easeOut = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;

// Glances that land and hold: every ~1.5-2.5 s the eyes pick a new spot (often straight ahead), get there in
// 5 frames and stay. Returns lookX (-1..1).
const glance = (id: string, f: number) => {
  const len = 44 + Math.floor(noise(id, -1) * 30);
  const k = Math.floor((f + len * 4) / len);
  const spot = (n: number) => (noise(id, n) < 0.4 ? 0 : (noise(id, n + 999) - 0.5) * 1.3);
  return spot(k - 1) + (spot(k) - spot(k - 1)) * easeOut(((f + len * 4) % len) / 5);
};

// Idle acting: slow breathing, a weight shift, glances that hold, blinks at the puppet's own rhythm. While the
// puppet talks, `speech` adds a beat gesture on each stressed syllable (a nod, an arm, or a lean) instead of
// constant flapping; the elbow trails the shoulder, and the lanyard and cap brim lag the head (`swing`).
// Arms that hold something or walk only get the breathing.
type Beats = { nod: number; arm: number; lean: number };
export const livenPose = (
  pose: PuppetPose,
  at: [number, number],
  id: string,
  f: number,
  energy: number,
  speech?: (Beats & { prev: Beats }) | null,
): { pose: PuppetPose; at: [number, number] } => {
  if (energy <= 0) return { pose, at };
  const ph = hash(id) * Math.PI * 2;
  const now: Beats = speech ?? { nod: 0, arm: 0, lean: 0 };
  const before: Beats = speech?.prev ?? now;
  const walking = pose.legSwing !== undefined;
  const look = (g: number) => (pose.lookX !== undefined ? pose.lookX : glance(id, g) * energy);
  // Head roll and sideways weight shift at frame g, for this frame and the follow-through 3 frames back.
  const tilt = (g: number, b: Beats) => (pose.headTilt ?? 0) + look(g) * 4 + Math.sin(g / 19 + ph) * 1.5 * energy + b.nod * 6 + b.lean * 7;
  const shift = (g: number, b: Beats) => (pose.sit || walking ? 0 : Math.sin(g / 23 + ph) * 0.02 * energy + b.lean * 0.03);
  const swing = Math.max(-14, Math.min(14, (tilt(f - 3, before) - tilt(f, now)) * 1.3 + (shift(f - 3, before) - shift(f, now)) * 300));
  // The arm that gestures: the right unless it is holding something.
  const gestureSide = pose.hold?.hand === "R" ? "L" : "R";
  const arm = (a: [number, number] | undefined, side: "L" | "R"): [number, number] => {
    const [s, el] = a ?? [12, 10];
    const k = side === gestureSide ? 1 : 0.25;
    return [s + Math.sin(f / 14 + ph + (side === "L" ? 0 : 1.7)) * 3 * energy + now.arm * k * 38, el + Math.sin(f / 11 + ph * 2) * 3 * energy + before.arm * k * 30];
  };
  const period = 70 + Math.floor(noise(id, -2) * 50);
  const t = (f + Math.floor(ph * 40)) % period;
  const live: PuppetPose = {
    ...pose,
    // Head follows the glance a little, nods down on a beat, tips into a lean.
    headTilt: tilt(f, now),
    bob: (pose.bob ?? 0) + Math.sin(f / 13 + ph) * 4 * energy + now.nod * 12,
    lookX: look(f),
    // Walking swings the lanyard against the stride.
    swing: (pose.swing ?? 0) + swing - (pose.legSwing ?? 0) * 0.3,
    // A blink, and now and then a double blink.
    blink: pose.blink ?? (t < 3 || (noise(id, Math.floor((f + Math.floor(ph * 40)) / period)) < 0.25 && t >= 6 && t < 9)),
    armL: pose.hold?.hand === "L" || walking ? pose.armL : arm(pose.armL, "L"),
    armR: pose.hold?.hand === "R" || walking ? pose.armR : arm(pose.armR, "R"),
  };
  return { pose: live, at: [at[0] + shift(f, now), at[1]] };
};
