import type { Gesture } from "../puppet/gestures";
import type { Expression, PuppetPose } from "../puppet/Puppet";
import { anticipate, easeIn, easeOut, follow, settle, smooth } from "./motion";

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
// Spread into a front- or side-view pose while the puppet walks on the spot (frame-driven).
export const walk = (f: number) => ({ legSwing: Math.sin(f / 3) * 20, bob: -Math.abs(Math.sin(f / 3)) * 14, stride: f });

// Metres per puppet unit (PUPPET_HEIGHT / 1060 in PuppetBillboard).
const UNIT_M = 1.3 / 1060;
// A step sweeps the planted foot 2 * 266 * sin(20°) ≈ 182 units back under the body.
export const STEP_M = 182 * UNIT_M;
// The walk cycle for a puppet that has covered `dist` metres: one step per STEP_M, so the planted foot keeps pace
// with the ground instead of sliding (no moonwalk). `speed` 0..1 shrinks the stride while it speeds up or slows down.
// The bob follows Williams' five poses: lowest just after each contact (the bent leg takes the weight), highest just
// after the passing pose (push-off). The body tips over the support foot each step and the head counters it; the
// hair trails the bob a beat late.
export const walkAt = (dist: number, speed = 1): Partial<PuppetPose> => {
  const th = (Math.PI * dist) / STEP_M;
  const k = Math.max(0, Math.min(1, speed));
  return {
    legSwing: Math.sin(th) * 20 * k,
    bob: -Math.sin(2 * th) * 11 * k,
    stride: th * 3,
    lean: Math.cos(th) * 2.2 * k,
    headTilt: -Math.cos(th - 0.5) * 2.5 * k,
    hair: { lift: Math.sin(2 * th - 0.9) * 18 * k, sway: Math.cos(th - 0.8) * 3 * k },
  };
};
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
  const dx = to[0] - from[0];
  const sideways = Math.abs(dx) > Math.abs(to[1] - from[1]);
  // Distance covered in puppet units at any frame, so the body can lean into the start and swing past the stop.
  const total = Math.hypot(dx, to[1] - from[1]) / UNIT_M;
  const covered = (g: number) => total * smooth(ramp(g, start, start + frames));
  const surge = follow(covered, f, 1.4, 0.45);
  // Leaning into the walk and rocking forward on the stop (follow-through); hair trails the same way.
  const carry: Partial<PuppetPose> = {
    bend: sideways ? Math.max(-0.07, Math.min(0.28, surge * 0.11)) : 0,
    hair: { sway: Math.max(-14, Math.min(14, -surge * 4)), lift: 0 },
  };
  if (p <= 0) return { at, pose: {} as Partial<PuppetPose> };
  if (p >= 1) {
    // Settling after the stop, in the pose it walked in.
    if (f - (start + frames) > 24) return { at, pose: {} as Partial<PuppetPose> };
    return { at, pose: { ...carry, ...(sideways ? { view: "side", facing: dx > 0 ? 1 : -1 } : {}) } as Partial<PuppetPose> };
  }
  // Legs follow the distance covered; the stride grows in as it sets off and shrinks as it stops.
  const dist = Math.hypot(at[0] - from[0], at[1] - from[1]);
  const speed = Math.min(1, 6 * p * (1 - p) * 1.4);
  const gait = walkAt(dist, speed);
  const pose: Partial<PuppetPose> = {
    ...gait,
    bend: (sideways ? 0.07 * speed : 0) + (carry.bend ?? 0),
    hair: { lift: gait.hair?.lift, sway: (gait.hair?.sway ?? 0) + (carry.hair?.sway ?? 0) },
    armL: undefined,
    armR: undefined,
    ...(sideways ? { view: "side", facing: dx > 0 ? 1 : -1 } : {}),
  };
  return { at, pose };
};

// Expression changes that ease instead of popping. `steps` lists [start frame, expression] in order; for `len`
// frames after each start the face blends from the previous one. Spread the result into a pose.
export const faceChange = (steps: [number, Expression][], f: number, len = 10): Pick<PuppetPose, "expression" | "from" | "blend" | "blink"> => {
  let i = 0;
  while (i + 1 < steps.length && steps[i + 1][0] <= f) i++;
  const [start, expression] = steps[i];
  if (i === 0 || f - start >= len) return { expression };
  const p = clamp01((f - start) / len);
  // A blink right as the face starts to change masks the in-between (eyes lead the change).
  return { expression, from: steps[i - 1][1], blend: p * p * (3 - 2 * p), blink: f - start >= 1 && f - start <= 3 ? true : undefined };
};

// Like faceChange, for the whole body: each step names an expression and, optionally, a gesture. The eyes and face
// lead (they change first and fastest, with a blink to mask the swap); the body follows two frames later with a
// small wind-up the other way and a slight overshoot before it settles (anticipation, overlap, follow-through).
export const moveChange = (
  steps: [number, Expression, Gesture?][],
  f: number,
  len = 16,
): Pick<PuppetPose, "expression" | "from" | "blend" | "bodyBlend" | "gesture" | "fromGesture" | "blink"> => {
  let i = 0;
  while (i + 1 < steps.length && steps[i + 1][0] <= f) i++;
  const [start, expression, gesture] = steps[i];
  const t = f - start;
  if (i === 0 || t >= len + 6) return { expression, gesture };
  const [, from, fromGesture] = steps[i - 1];
  return {
    expression,
    gesture,
    from,
    fromGesture,
    blend: smooth(t / (len * 0.6)),
    bodyBlend: anticipate((t - 2) / len, 0.1, 0.07),
    blink: t >= 1 && t <= 3 ? true : undefined,
  };
};

// ---- Whole-body moves. Each returns pose fields for frame f; spread them over the pose. Before `start` they add
// nothing, after the move they hold its end pose (where that differs from standing).


// A jump (Williams): dip to load (go down to go up), stretch at launch, a hang at the apex with the legs tucked a
// beat after the body, squash on landing and spring back. The hair lags the whole way. `height` in puppet units
// (260 ≈ a quarter of the body); `len` is the whole move including the recovery (~1.1 s).
export const jump = (f: number, start: number, height = 260, len = 34): Partial<PuppetPose> => {
  const k = len / 34;
  const T = { dip: 9 * k, launch: 2 * k, flight: 13 * k };
  const land = T.dip + T.launch + T.flight;
  const t = f - start;
  if (t < 0 || t > len + 12) return {};
  // Height off the ground at any frame (for the hair's lag): the flight spends longer near the apex.
  const airAt = (g: number) => {
    const u = (g - start - T.dip - T.launch) / T.flight;
    return u <= 0 || u >= 1 ? 0 : height * Math.sin(Math.PI * u) ** 0.8;
  };
  const hair = { lift: Math.max(-50, Math.min(140, follow(airAt, f, 1.3, 0.35) * 0.9)) };
  if (t < T.dip) {
    // Anticipation: slow sink into the knees, arms swinging down and in, a little squash.
    const p = smooth(t / T.dip);
    return { crouch: 0.75 * p, squash: 0.1 * p, slump: 0.25 * p, armL: [12 - 10 * p, 10 + 30 * p], armR: [12 - 10 * p, 10 + 30 * p], hair };
  }
  if (t < T.dip + T.launch) {
    // Launch: legs snap straight, the body stretches, arms whip up.
    const p = (t - T.dip) / T.launch;
    return { crouch: 0.75 * (1 - p), squash: 0.1 - 0.35 * p, slump: -0.4 * p, armL: [12 + 140 * p, 20], armR: [12 + 140 * p, 20], hair };
  }
  if (t < land) {
    const u = (t - T.dip - T.launch) / T.flight;
    // Stretched rising, round at the top, stretched falling; the legs tuck late and reach down before contact.
    const tuck = 0.55 * Math.max(0, Math.sin(Math.PI * Math.min(1, u * 1.25 - 0.1)));
    return {
      air: airAt(f),
      crouch: tuck,
      squash: -0.25 * Math.abs(Math.cos(Math.PI * u)) ** 2,
      slump: -0.4,
      armL: [152 - 70 * u, 20 + 40 * u],
      armR: [152 - 70 * u, 20 + 40 * u],
      hair,
    };
  }
  // Landing: squash hard on contact, the knees take it, and everything springs back with a small overshoot.
  const r = t - land;
  const w = settle(r, 2.4, 0.42);
  return { crouch: Math.max(0, 0.8 * w), squash: 0.35 * w, slump: 0.3 * Math.max(0, w), armL: [40 * Math.max(0, w) + 12, 10 + 20 * Math.max(0, w)], armR: [40 * Math.max(0, w) + 12, 10 + 20 * Math.max(0, w)], hair };
};

// Sitting down onto a hip-height seat: a small rise first (anticipation), then the body leans forward and drops,
// speeding up like a fall, lands with a squash and a little bounce. Holds `sit: true` afterwards.
export const sitDown = (f: number, start: number, len = 24): Partial<PuppetPose> => {
  const t = f - start;
  if (t < 0) return {};
  const pre = len * 0.2;
  const seatAt = (g: number) => {
    const u = (g - start - pre) / (len - pre);
    return u <= 0 ? 0 : u >= 1 ? 1 : easeIn(u) * 0.6 + smooth(u) * 0.4;
  };
  const hair = { lift: Math.max(-40, Math.min(100, follow((g) => -seatAt(g) * 160, f, 1.5, 0.4) * 0.8)) };
  if (t < pre) {
    const p = Math.sin((t / pre) * Math.PI);
    return { squash: -0.07 * p, bend: -0.06 * p, hair };
  }
  if (t < len) {
    const u = (t - pre) / (len - pre);
    return { seat: seatAt(f), bend: Math.sin(u * Math.PI) * 0.5, armL: [12 + 26 * Math.sin(u * Math.PI), 10 + 20 * Math.sin(u * Math.PI)], armR: [12 + 26 * Math.sin(u * Math.PI), 10 + 20 * Math.sin(u * Math.PI)], hair };
  }
  const w = settle(t - len, 2.6, 0.45);
  return t - len > 20 ? { sit: true } : { sit: true, squash: 0.18 * w, slump: 0.15 * Math.max(0, w), hair };
};

// Getting up from a seat: lean well forward to get the weight over the feet (anticipation), push up fast, rise a
// touch too tall and settle. Holds `sit: true` before `start`.
export const standUp = (f: number, start: number, len = 26): Partial<PuppetPose> => {
  const t = f - start;
  if (t < 0) return { sit: true };
  const lean = len * 0.35;
  const push = len * 0.4;
  if (t < lean) {
    const p = smooth(t / lean);
    return { sit: true, bend: 0.6 * p, armL: [12 + 30 * p, 10 + 30 * p], armR: [12 + 30 * p, 10 + 30 * p] };
  }
  if (t < lean + push) {
    const p = easeOut((t - lean) / push);
    return { seat: 1 - p, bend: 0.6 * (1 - p), squash: -0.12 * p, armL: [42 - 30 * p, 40 - 30 * p], armR: [42 - 30 * p, 40 - 30 * p] };
  }
  const r = t - lean - push;
  return r > 20 ? {} : { squash: -0.12 * settle(r, 2.2, 0.45) };
};

// Lying down or fainting: the knees give and the body sways (anticipation), then it tips back, speeding up, hits the
// floor with a squash and a small bounce, arms flopping a beat later. `asleep` shuts the eyes and starts the "z"s once
// it has settled. Holds `lie: 1`.
export const lieDown = (f: number, start: number, len = 22, asleep = false): Partial<PuppetPose> => {
  const t = f - start;
  if (t < 0) return {};
  const wobble = len * 0.3;
  const fall = len - wobble;
  if (t < wobble) {
    const p = t / wobble;
    return { crouch: 0.25 * smooth(p), lean: Math.sin(p * Math.PI * 2) * 4, slump: 0.4 * p, headTilt: Math.sin(p * Math.PI) * 6 };
  }
  if (t < len) {
    const u = (t - wobble) / fall;
    return { lie: easeIn(u), crouch: 0.25 * (1 - u), slump: 0.4, hair: { lift: 60 * u } };
  }
  const r = t - len;
  const w = settle(r, 2.8, 0.4);
  const flop = settle(r - 3, 2.2, 0.35);
  return {
    lie: 1 - 0.04 * Math.max(0, w),
    squash: 0.16 * w,
    armL: [4 + 30 * Math.max(0, flop), 4],
    armR: [4 + 30 * Math.max(0, flop), 4],
    hair: { lift: 60 * Math.max(0, settle(r, 1.6, 0.35)) },
    sleep: asleep && r >= 10 ? true : undefined,
  };
};

// Getting back up from lying down: curl up first (anticipation), sit up and rise easing out, a little too tall,
// settle. Holds `lie: 1` before `start`.
export const getUp = (f: number, start: number, len = 24): Partial<PuppetPose> => {
  const t = f - start;
  if (t < 0) return { lie: 1 };
  const curl = len * 0.25;
  if (t < curl) return { lie: 1 - 0.06 * smooth(t / curl), crouch: 0.4 * smooth(t / curl) };
  const rise = len - curl;
  if (t < len) {
    const u = easeOut((t - curl) / rise);
    return { lie: 0.94 * (1 - u), crouch: 0.4 * (1 - u) + Math.sin(u * Math.PI) * 0.2, squash: -0.1 * u };
  }
  const r = t - len;
  return r > 20 ? {} : { squash: -0.1 * settle(r, 2.2, 0.45) };
};

// Crawling on all fours from `from` to `to` (x, z), shown in profile toward the direction of travel.
export const crawlTo = (f: number, start: number, frames: number, from: [number, number], to: [number, number]) => {
  const p = ramp(f, start, start + frames);
  const at: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  if (p <= 0 || p >= 1) return { at, pose: {} as Partial<PuppetPose> };
  const c = f - start;
  // The body rocks with each reach and the head nods a beat behind it; the hair swings after the head.
  const pose: Partial<PuppetPose> = {
    view: "side",
    facing: to[0] >= from[0] ? 1 : -1,
    crawl: c,
    bob: Math.sin(c / 3) * 7,
    headTilt: Math.sin(c / 6 - 0.9) * 5,
    hair: { sway: Math.sin(c / 6 - 1.6) * 6 },
    armL: undefined,
    armR: undefined,
  };
  return { at, pose };
};

// Path position 0..1 at frame f for a camera that passes key i (of n, evenly spaced along the path) at beat frame
// beats[i]: a monotone cubic time warp with zero speed at the first and last key (ease in, ease out) and no stop or
// overshoot in between, so the camera arrives at each subject on the word that names it.
export const warpU = (beats: number[], f: number) => {
  const n = beats.length;
  if (n < 2 || f <= beats[0]) return 0;
  if (f >= beats[n - 1]) return 1;
  const sec = beats.slice(1).map((b, i) => 1 / (n - 1) / Math.max(1e-6, b - beats[i]));
  const m = [0, ...sec.slice(1).map((s, i) => (2 * sec[i] * s) / (sec[i] + s)), 0];
  let i = 0;
  while (f > beats[i + 1]) i++;
  const h = beats[i + 1] - beats[i];
  const x = (f - beats[i]) / h, x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * (i / (n - 1)) + (x3 - 2 * x2 + x) * h * m[i] + (-2 * x3 + 3 * x2) * ((i + 1) / (n - 1)) + (x3 - x2) * h * m[i + 1];
};

// A point on a smooth curve (Catmull-Rom) through `pts` at path position u 0..1.
const curve = (pts: Vec3[], u: number): Vec3 => {
  const n = pts.length;
  if (n === 1) return pts[0];
  const s = clamp01(u) * (n - 1);
  const i = Math.min(n - 2, Math.floor(s));
  const t = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
  return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)) as Vec3;
};

// A camera that travels through key views and reaches key i at shot frame `at` (take it from the line's frame span,
// placing the word by its position in the line). Smooth through every key, at rest at the first and the last.
//   const camera = beatPath([{ at: 0, position: [...], target: [...] }, { at: 52, ... }, { at: 110, ... }], f);
export type BeatKey = { at: number; position: Vec3; target: Vec3; fov?: number };
export const beatPath = (keys: BeatKey[], f: number, fov = 40) => {
  const u = warpU(keys.map((k) => k.at), f);
  const fovs = keys.map((k) => k.fov ?? fov);
  const s = u * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(s));
  return {
    position: curve(keys.map((k) => k.position), u),
    target: curve(keys.map((k) => k.target), u),
    fov: keys.length < 2 ? fovs[0] : fovs[i] + (fovs[i + 1] - fovs[i]) * (s - i),
  };
};

// A block of `rows` x `cols` figures (a battalion, a queue, a crowd walking off) for an instanced crowd's `place(i)`.
// Shot-relative by construction: `at` is where the block's centre stands at the shot's frame 0, and it travels `speed`
// metres per frame along `yaw` (0 = +z) from there, driven by `shotFrame`, which must be the shot frame (`useShotFrame()`),
// never the video frame: the video frame put Waterloo's columns 10-20 m down the road before their shot began.
// Looping motion (flags, smoke) is what takes the video frame. Returns per figure its ground spot, heading and a walk
// phase (`stride`, radians-like, grows with distance) with `swing` 1 while it moves.
export type FormationSpot = { x: number; z: number; yaw: number; stride: number; swing: number };
export const formation =
  (at: [number, number], rows: number, cols: number, yaw: number, opts: { shotFrame: number; speed?: number; gap?: number; jitter?: number; seed?: number }) =>
  (i: number): FormationSpot => {
    const gap = opts.gap ?? 0.55;
    const r = Math.floor(i / cols);
    const c = i % cols;
    const h = (k: number) => {
      const v = Math.sin((i * 3 + k + (opts.seed ?? 0)) * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v) - 0.5;
    };
    const j = opts.jitter ?? 0.08;
    const lx = (c - (cols - 1) / 2) * gap + h(0) * j;
    const lz = (r - (rows - 1) / 2) * gap * 1.15 + h(1) * j;
    const travel = (opts.speed ?? 0) * opts.shotFrame;
    const sn = Math.sin(yaw);
    const cs = Math.cos(yaw);
    const moving = (opts.speed ?? 0) !== 0;
    return {
      x: at[0] + lx * cs + lz * sn + sn * travel,
      z: at[1] - lx * sn + lz * cs + cs * travel,
      yaw,
      stride: moving ? travel * 7 + (h(2) + 0.5) * 0.4 : 0,
      swing: moving ? 1 : 0,
    };
  };
