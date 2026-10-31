import { Expression, FaceMicro, PuppetPose } from "../puppet/Puppet";
import { Gesture, GESTURES, POSTURE } from "../puppet/gestures";
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

// A soft 0..1..0 bump that comes back every `period` frames at the puppet's own offset (a brow flick, a lip twitch).
const pulse = (id: string, f: number, period: number, len: number) => {
  const t = (f + Math.floor(hash(id + period) * period)) % period;
  return t < len ? Math.sin((t / len) * Math.PI) : 0;
};

// Micro-expressions: small, constant movement inside the held expression so the face never freezes. Every face
// breathes a little (brows, lids, mouth width); each expression adds its own tic on top. Amplitudes are in puppet units.
const microFace = (pose: PuppetPose, id: string, f: number, energy: number): FaceMicro => {
  const ph = hash(id) * Math.PI * 2;
  const s = (period: number, k = 0) => Math.sin(f / period + ph + k);
  const m: FaceMicro = {
    brow: s(37) * 2.5,
    lid: s(29, 1.3) * 2,
    mouthW: 1 + s(41) * 0.03,
    mouthX: 0,
    mouthY: 0,
    lookY: 0,
    browL: 0,
    browR: 0,
  };
  switch (pose.expression) {
    case "excited": // bouncy brows, a laugh that keeps opening
      m.brow! += -3 + s(11) * 3;
      m.mouthW! += s(13) * 0.05;
      break;
    case "happy":
      m.mouthW! += s(23) * 0.06;
      m.lid! += s(17) * 3;
      break;
    case "smug": // the raised brow flicks up now and then
      m.browR! -= pulse(id, f, 70, 18) * 8;
      m.mouthW! += s(29) * 0.05;
      break;
    case "skeptical":
      m.browR! -= pulse(id, f, 60, 16) * 10;
      m.mouthX! += s(33) * 4;
      break;
    case "confused": // the high brow keeps lifting, the mouth wanders, the eyes search
      m.browR! -= pulse(id, f, 50, 20) * 10;
      m.mouthX! += s(31) * 6;
      m.lookY! += -4 + s(19) * 3;
      break;
    case "thinking": // eyes drift around up there, the mouth slides to the side and back
      m.lookY! += s(27) * 4;
      m.mouthX! += s(35) * 8;
      m.brow! += s(43) * 2;
      break;
    case "worried": // a nervous tremble in the eyes and the lips
      m.lookY! += Math.sin(f * 1.7) * 1.5;
      m.mouthX! += Math.sin(f * 0.9) * 2;
      m.brow! += s(9) * 3;
      break;
    case "shocked":
      m.lookY! += Math.sin(f * 2.1) * 1.5;
      m.mouthW! += s(9) * 0.06;
      break;
    case "awkward": // eyes keep sliding away, the grin strains
      m.mouthW! += s(17) * 0.05;
      m.lookY! += 3;
      break;
    case "angry": // a brow twitch and a clenched jaw
      m.brow! += s(7) * 2.5 + pulse(id, f, 45, 10) * 5;
      m.mouthW! += s(11) * 0.04;
      break;
    case "determined":
      m.brow! += 2 + s(50) * 2;
      m.mouthW! -= pulse(id, f, 55, 14) * 0.06;
      break;
    case "sad": // brows lift and sag, the lip quivers
      m.brow! -= s(33) * 3;
      m.mouthY! += s(21) * 2;
      m.mouthX! += Math.sin(f * 1.3) * 1;
      break;
    case "disgusted": // the face scrunches again and again
      m.brow! += pulse(id, f, 40, 14) * 6;
      m.lid! += pulse(id, f, 40, 14) * 8;
      m.mouthW! += s(9) * 0.05;
      break;
    case "bored": // the lids sink slowly, then catch themselves
      m.lid! += 5 + Math.max(0, s(45)) * 8;
      m.mouthY! += s(53) * 2;
      break;
  }
  const k = energy * 1.5; // overall strength of the micro-expressions
  const a = pose.face ?? {};
  const add = (v: number | undefined, w: number | undefined) => (w ?? 0) + (v ?? 0) * k;
  return {
    brow: add(m.brow, a.brow),
    browL: add(m.browL, a.browL),
    browR: add(m.browR, a.browR),
    lid: add(m.lid, a.lid),
    lookY: add(m.lookY, a.lookY),
    mouthX: add(m.mouthX, a.mouthX),
    mouthY: add(m.mouthY, a.mouthY),
    mouthW: (a.mouthW ?? 1) * (1 + ((m.mouthW ?? 1) - 1) * k),
    t: a.t ?? f,
  };
};

// Awkward eyes slide away from whoever they face; thinking eyes look up and off to the side.
const moodLook = (pose: PuppetPose, id: string, f: number) => {
  if (pose.expression === "awkward") return -0.6 + Math.sin(f / 21 + hash(id) * 6) * 0.25;
  if (pose.expression === "thinking") return -0.5 + Math.sin(f / 40 + hash(id) * 6) * 0.35;
  return undefined;
};

// Body language. A pose with a `gesture` takes that gesture; a pose that authors no arms takes its expression's
// posture (eased between the two expressions during a faceChange); any other pose only borrows the posture's slump
// and lean. Fields the pose sets itself always win. This runs even at energy 0, since it is what the shot asked for.
const ARM: [number, number] = [12, 10];
const mixN = (a: number | undefined, b: number | undefined, t: number) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * t;
const mixPair = (a: [number, number] | undefined, b: [number, number] | undefined, t: number, rest: [number, number]): [number, number] => {
  const [x, y] = a ?? rest;
  const [u, v] = b ?? rest;
  return [x + (u - x) * t, y + (v - y) * t];
};
// Where a hand hangs for shoulder / elbow angles (the same sums Puppet's Arm does), so an angled arm can glide to a reach.
const handAt = (side: -1 | 1, [sh, el]: [number, number]): [number, number] => {
  const a1 = (sh * Math.PI) / 180;
  const a2 = ((sh + el) * Math.PI) / 180;
  return [side * (130 + Math.sin(a1) * 130 + Math.sin(a2) * 120), -545 + Math.cos(a1) * 130 + Math.cos(a2) * 120];
};

// Ease one body pose into another: numbers glide, a hanging arm and a reaching one meet as reach points,
// and things that cannot be in between (front or behind, hand shape) switch halfway.
const mixBody = (a: Partial<PuppetPose>, b: Partial<PuppetPose>, t: number): Partial<PuppetPose> => {
  const pick = <T,>(x: T, y: T) => (t < 0.5 ? x : y);
  const arm = (side: -1 | 1) => {
    const [rk, ak] = side < 0 ? (["reachL", "armL"] as const) : (["reachR", "armR"] as const);
    if (!a[rk] && !b[rk]) return { [ak]: mixPair(a[ak], b[ak], t, ARM) };
    const from = a[rk] ?? handAt(side, a[ak] ?? ARM);
    const to = b[rk] ?? handAt(side, b[ak] ?? ARM);
    return { [rk]: mixPair(from, to, t, ARM) };
  };
  return {
    slump: mixN(a.slump, b.slump, t),
    lean: mixN(a.lean, b.lean, t),
    headTilt: mixN(a.headTilt, b.headTilt, t),
    bob: mixN(a.bob, b.bob, t),
    ...arm(-1),
    ...arm(1),
    frontL: pick(a.frontL, b.frontL),
    frontR: pick(a.frontR, b.frontR),
    handL: pick(a.handL, b.handL),
    handR: pick(a.handR, b.handR),
  };
};

// The moving part of a gesture: the wave swings, the clap claps, the cheer pumps, the point jabs.
const gestureMotion = (g: Gesture | undefined, pose: Partial<PuppetPose>, f: number): Partial<PuppetPose> => {
  if (g === "wave" && pose.armR) return { armR: [pose.armR[0], pose.armR[1] + Math.sin(f / 3) * 22] };
  if (g === "clap" && pose.reachL && pose.reachR) {
    const open = Math.abs(Math.sin(f / 4)) * 46;
    return { reachL: [pose.reachL[0] - open, pose.reachL[1]], reachR: [pose.reachR[0] + open, pose.reachR[1]] };
  }
  if (g === "cheer" && pose.armR) {
    const pump = Math.abs(Math.sin(f / 5));
    return { armR: [pose.armR[0] - pump * 18, pose.armR[1] + pump * 14], bob: (pose.bob ?? 0) - pump * 14 };
  }
  if (g === "point" && pose.armR) return { armR: [pose.armR[0] + Math.max(0, Math.sin(f / 6)) * 6, pose.armR[1]] };
  if (g === "shrug") return { slump: (pose.slump ?? 0) - Math.max(0, Math.sin(f / 10)) * 0.3 };
  return {};
};

// The body a gesture or an expression asks for, with the gesture's motion at frame f.
const bodyFor = (g: Gesture | undefined, e: Expression, f: number): Partial<PuppetPose> => {
  if (!g) return POSTURE[e];
  const p = GESTURES[g];
  return { ...p, ...gestureMotion(g, p, f) };
};

export const bodyPose = (pose: PuppetPose, f: number): PuppetPose => {
  if (pose.sit || pose.legSwing !== undefined || pose.hold) return pose;
  const t = pose.blend;
  const changing = t !== undefined && t < 1 && (pose.from !== undefined || pose.fromGesture !== undefined);
  const target = bodyFor(pose.gesture, pose.expression, f);
  const body = changing ? mixBody(bodyFor(pose.fromGesture, pose.from ?? pose.expression, f), target, t!) : target;
  const authored = pose.armL || pose.armR || pose.reachL || pose.reachR;
  if (authored && !pose.gesture) return { ...pose, slump: pose.slump ?? body.slump, lean: pose.lean ?? body.lean };
  return { ...body, ...pose, headTilt: (body.headTilt ?? 0) + (pose.headTilt ?? 0), bob: (body.bob ?? 0) + (pose.bob ?? 0) };
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
  pose = bodyPose(pose, f);
  if (energy <= 0) return { pose, at };
  const ph = hash(id) * Math.PI * 2;
  const now: Beats = speech ?? { nod: 0, arm: 0, lean: 0 };
  const before: Beats = speech?.prev ?? now;
  const walking = pose.legSwing !== undefined;
  const look = (g: number) => (pose.lookX !== undefined ? pose.lookX : moodLook(pose, id, g) ?? glance(id, g) * energy);
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
    face: microFace(pose, id, f, energy),
    // Reaching hands drift a little and dip on a beat, like hanging ones.
    reachL: pose.reachL && [pose.reachL[0] + Math.sin(f / 17 + ph) * 3 * energy, pose.reachL[1] + Math.sin(f / 13 + ph) * 3 * energy + now.arm * 8],
    reachR: pose.reachR && [pose.reachR[0] + Math.sin(f / 15 + ph + 1) * 3 * energy, pose.reachR[1] + Math.sin(f / 11 + ph + 1) * 3 * energy + now.arm * 14],
  };
  return { pose: live, at: [at[0] + shift(f, now), at[1]] };
};
