import { PuppetPose } from "./Puppet";
import { handWorld } from "./PuppetBillboard";

// Puppets using a tool: ready-made, frame-driven arm motions that put the hands ON the tool and keep them working.
// A puppet that plays, hammers, drives, saws… must be seen doing it: never leave its arms hanging or frozen while
// the tool moves on its own.
//
// Every helper is a pure function of the shot frame and returns pose fields to spread into the puppet's pose, plus
// the numbers a 3D prop needs to stay in the hand (feed `grip` to handWorld, `roll` to the prop's z rotation, the
// wheel angle to the wheel). Points are puppet units in screen space, like reachL / reachR: +x = screen right,
// feet at y 0, shoulders at x ±130, y -545 (front) or x ≈ 0 (side), head centre y -800. An arm reaches ARM units.

type V2 = [number, number];
type Facing = { view?: "front" | "side" | "back"; facing?: 1 | -1 };

export const ARM = 249; // shoulder to hand, fully stretched

const shoulder = (hand: "L" | "R", o: Facing): V2 => (o.view === "side" ? [(hand === "R" ? 10 : -6) * (o.facing ?? 1), -550] : [hand === "L" ? -130 : 130, -545]);

// Keep a hand target within arm's length of its shoulder, so the hand really gets there (and a prop placed at the
// same point with handWorld stays in the hand).
export const clampReach = (s: V2, p: V2, max = ARM - 4): V2 => {
  const dx = p[0] - s[0];
  const dy = p[1] - s[1];
  const d = Math.hypot(dx, dy);
  return d <= max ? p : [s[0] + (dx / d) * max, s[1] + (dy / d) * max];
};

// The reach (puppet units, for reachL / reachR) that puts a hand on a world point, for a puppet standing at `at`
// seen by `camera`: the inverse of handWorld, by a few Newton steps. It matches the target's world x and y (the hand
// stays in the card's plane, so its depth is whatever the card gives): right for a puppet the camera sees roughly
// along z. Not limited to arm's length: a target too far gives a reach the arm cannot make, so keep the prop within
// ARM of the shoulder (or pass the result through clampReach and place the prop with handWorld). `air` as in handWorld.
export const solveReach = (at: V2, target: [number, number, number], camera: { position: [number, number, number] }, air = 0): V2 => {
  let r: V2 = [-200, -600];
  for (let it = 0; it < 6; it++) {
    const p = handWorld(at, r, camera, air);
    const px = handWorld(at, [r[0] + 10, r[1]], camera, air);
    const py = handWorld(at, [r[0], r[1] - 10], camera, air);
    const ex = target[0] - p[0];
    const ey = target[1] - p[1];
    const dxx = (px[0] - p[0]) / 10;
    const dyy = (py[1] - p[1]) / -10;
    r = [r[0] + (Math.abs(dxx) > 1e-6 ? ex / dxx : 0), r[1] + (Math.abs(dyy) > 1e-6 ? ey / dyy : 0)];
  }
  return r;
};

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};
const easeIn = (t: number) => clamp01(t) ** 2.4;
const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const angleLerp = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
};
// Rotation (radians, about the camera axis) for a prop whose handle points +y from its grip at rotation 0, so the
// handle runs along screen direction (dx, dy) (y down).
const rollFor = (dx: number, dy: number) => -Math.atan2(dx, -dy);

// ---------- piano (any keyboard: organ, typewriter, laptop) ----------

// Both hands on the keys and playing: each hand taps its own rhythm (a quick press, a lift) and wanders along the
// keyboard; the head and shoulders ride the music. `keys` is the middle of the keyboard (where the hands rest),
// `span` how wide the hands spread, `energy` 0..1.5 how hard he plays (0.3 gentle, 1 lively, 1.4 wild).
export const pianoPlay = (f: number, o: Facing & { keys: V2; span?: number; energy?: number; seed?: number }): Partial<PuppetPose> => {
  const { keys, span = 170, energy = 1, seed = 0 } = o;
  const side = o.view === "side";
  const hand = (k: number, h: "L" | "R"): V2 => {
    // a note every 5-8 frames, each hand at its own pace; a quick press then a lift
    const period = 5.5 + ((k * 1.7 + seed) % 2.5);
    const c = ((f + k * 2.3 + seed * 3) / period) % 1;
    const up = c < 0.2 ? 1 - easeOut(c / 0.2) : smooth((c - 0.2) / 0.8);
    const lift = (22 + 46 * energy) * up;
    const wander = Math.sin(f / (19 + k * 4) + k * 2 + seed) * span * 0.32 + Math.sin(f / 7.3 + k) * 10 * energy;
    const x = side ? keys[0] + (h === "R" ? 14 : -10) * (o.facing ?? 1) + wander * 0.25 : keys[0] + (h === "L" ? -1 : 1) * span * 0.3 + wander;
    return clampReach(shoulder(h, o), [x, keys[1] - lift]);
  };
  const beat = Math.sin(f / 7);
  return {
    reachL: hand(1, "L"),
    reachR: hand(2, "R"),
    handL: "open",
    handR: "open",
    frontL: !side,
    frontR: !side,
    headTilt: 5 * energy * beat,
    bob: -Math.abs(beat) * 7 * energy,
    lean: side ? 0 : 3 * energy * Math.sin(f / 15 + seed),
  };
};

// ---------- hammer (mallet, axe, pick, gavel) ----------

// Swings a hammer held in one hand: a slow wind-up over the shoulder, a fast strike that lands exactly on each frame
// in `blows` (put sparks / sound there), a small recoil. `strike` is where the hammer head lands, `handle` the
// handle length in puppet units (0.34 m = 277), `lift` 0..1 how high the wind-up goes, `other` where the free hand
// holds the work (tongs, a nail, a log); default it hangs braced.
// Returns the pose and, for the prop: `grip` (reach to feed handWorld), `roll` (z rotation for a prop whose handle
// points +y at rotation 0), `head` (where the head is now), `raise` 0..1 and `since` (frames since the last blow).
export const hammerSwing = (
  f: number,
  o: Facing & { blows: number[]; strike: V2; hand?: "L" | "R"; handle?: number; lift?: number; other?: V2 },
): { pose: Partial<PuppetPose>; grip: V2; roll: number; head: V2; raise: number; since: number } => {
  const { blows, strike, hand = "R", handle = 230, lift = 1 } = o;
  const S = shoulder(hand, o);
  const sgn = Math.sign(strike[0] - S[0]) || (o.facing ?? 1);
  // Hand at the strike: on the line to the target, a handle's length short of it.
  const toT = Math.hypot(strike[0] - S[0], strike[1] - S[1]);
  const gs = clampReach(S, [S[0] + ((strike[0] - S[0]) / toT) * Math.max(60, toT - handle * 0.85), S[1] + ((strike[1] - S[1]) / toT) * Math.max(60, toT - handle * 0.85)]);
  // Hand wound up: above the shoulder, tipped back away from the work (wider in front view, clear of the face).
  const back = o.view === "side" ? 0.85 : 0.62;
  const upA = Math.atan2(-Math.cos(back), -sgn * Math.sin(back));
  const strikeA = Math.atan2(gs[1] - S[1], gs[0] - S[0]);
  const rS = Math.hypot(gs[0] - S[0], gs[1] - S[1]);
  // Timing: each interval recoils, winds up slowly, then strikes fast onto the blow frame.
  const last = [...blows].reverse().find((b) => f >= b);
  const next = blows.find((b) => b > f);
  let raise: number;
  if (last === undefined) raise = next === undefined ? 0 : smooth((f - (next - 18)) / 12) * (f < next - 6 ? 1 : 1 - easeIn((f - (next - 6)) / 6));
  else if (next === undefined) raise = 0.18 * Math.sin(clamp01((f - last) / 8) * Math.PI);
  else {
    const t = (f - last) / (next - last);
    const strikeT = Math.min(0.3, 6 / (next - last)); // the strike takes the last ~6 frames
    raise = t < 0.12 ? 0.18 * Math.sin((t / 0.12) * Math.PI * 0.5) : t < 1 - strikeT ? lerp(0.18, 1, smooth((t - 0.12) / (1 - strikeT - 0.12))) : 1 - easeIn((t - (1 - strikeT)) / strikeT);
  }
  const r = raise * lift;
  const a = angleLerp(strikeA, upA, r);
  const rad = lerp(rS, ARM - 12, r);
  const grip = clampReach(S, [S[0] + Math.cos(a) * rad, S[1] + Math.sin(a) * rad]);
  // Handle: points at the target on the hit, cocked back over the shoulder when raised.
  const hitDir = Math.atan2(strike[1] - grip[1], strike[0] - grip[0]);
  const cocked = a - sgn * 0.8;
  const hd = angleLerp(hitDir, cocked, r);
  const head: V2 = [grip[0] + Math.cos(hd) * handle, grip[1] + Math.sin(hd) * handle];
  const since = last === undefined ? -1 : f - last;
  const free: "L" | "R" = hand === "R" ? "L" : "R";
  const otherAt = o.other ? clampReach(shoulder(free, o), o.other) : undefined;
  const side = o.view === "side";
  const pose: Partial<PuppetPose> = {
    [hand === "R" ? "reachR" : "reachL"]: grip,
    [hand === "R" ? "handR" : "handL"]: "fist",
    [hand === "R" ? "frontR" : "frontL"]: true,
    ...(otherAt ? { [free === "R" ? "reachR" : "reachL"]: otherAt, [free === "R" ? "handR" : "handL"]: "fist", [free === "R" ? "frontR" : "frontL"]: true } : {}),
    // the body loads up on the wind-up and drives into the blow, with a jolt on the hit
    lean: side ? 0 : sgn * lerp(7, -4, r),
    bend: side ? lerp(0.16, 0.02, r) : undefined,
    slump: lerp(0.1, -0.35, r),
    headTilt: sgn * lerp(-4, 3, r),
    squash: since >= 0 && since < 3 ? 0.05 : 0,
  };
  return { pose, grip, roll: rollFor(Math.cos(hd), Math.sin(hd)), head, raise: r, since };
};

// ---------- steering wheel (car, bus, cart reins work the same way with a flat rim) ----------

// Both hands on the rim at ten and two, turning with the wheel: small constant corrections plus any `turn` the
// scene adds (radians, + = counter-clockwise on screen, i.e. the top of the wheel moves screen-left). The body and
// head lean into the turn. `wheel` is the rim's centre and `r` its radius (puppet units); `flat` squashes the rim
// vertically for a wheel tilted toward the driver (1 = seen face-on). Returns the pose and `wheelAngle`: rotate the
// 3D wheel about its own axis by this so the rim and the hands turn together.
export const steer = (f: number, o: Facing & { wheel: V2; r: number; turn?: number; flat?: number; calm?: number }): { pose: Partial<PuppetPose>; wheelAngle: number } => {
  const { wheel, r, flat = 0.6, calm = 1 } = o;
  const turn = (o.turn ?? 0) + calm * (0.2 * Math.sin(f / 26) + 0.07 * Math.sin(f / 9.5 + 1));
  const side = o.view === "side";
  const at = (base: number, h: "L" | "R"): V2 => {
    const a = base + turn;
    return clampReach(shoulder(h, o), side ? [wheel[0] + (h === "R" ? 8 : -6) * (o.facing ?? 1), wheel[1] - r * 0.9 * Math.sin(a)] : [wheel[0] + r * Math.cos(a), wheel[1] - r * flat * Math.sin(a)]);
  };
  return {
    pose: {
      reachL: at(Math.PI - 0.5, "L"),
      reachR: at(side ? Math.PI - 0.2 : 0.5, "R"),
      handL: "fist",
      handR: "fist",
      frontL: !side,
      frontR: !side,
      lean: side ? 0 : -turn * 9,
      headTilt: -turn * 12,
    },
    wheelAngle: turn,
  };
};

// ---------- drinking from a glass (cup, mug, bottle: same lift, tip and gulp) ----------

// Lifts a glass of water to the lips, tips it up while the head goes back and the throat gulps, the water level
// dropping, then lowers it. Starts at frame `start`, drinks for `sip` frames; `from` / `to` how full the glass is
// before and after. Best read in profile (view "side"); in front view the glass comes up over the chin.
// Spread `pose` into the puppet's pose (it sets hold, itemTilt, itemFill, the right arm and the head).
export const drinkFrom = (f: number, o: Facing & { start?: number; sip?: number; from?: number; to?: number }): { pose: Partial<PuppetPose>; drinking: number } => {
  const { start = 0, sip = 40, from = 0.85, to = 0.15 } = o;
  const side = o.view === "side";
  const fc = side ? (o.facing ?? 1) : 1;
  const t = f - start;
  const RAISE = 14;
  const LOWER = 14;
  // 0 at rest, 1 at the lips; `tip` how far the glass is tipped up while drinking
  const up = t < RAISE ? smooth(t / RAISE) : t < RAISE + sip ? 1 : 1 - smooth((t - RAISE - sip) / LOWER);
  const drink = clamp01((t - RAISE) / sip);
  const drinking = t >= RAISE && t < RAISE + sip ? 1 : 0;
  const tipDeg = (t >= RAISE ? up : smooth(t / RAISE) * 0.5) * (22 + 30 * smooth(drink));
  // local frame (side view drawn facing +x, then mirrored by `facing`): tip toward the face = negative degrees
  const tilt = -tipDeg;
  const th = (tilt * Math.PI) / 180;
  // the head goes back while drinking: the lips move with it (the head turns about the neck at (0, -640))
  const headTilt = side ? -up * (4 + 7 * smooth(drink)) : 0;
  const ht = (headTilt * Math.PI) / 180;
  const lips: V2 = side ? [180, -690] : [10, -682];
  const mouth: V2 = [lips[0] * Math.cos(ht) - (lips[1] + 640) * Math.sin(ht), lips[0] * Math.sin(ht) + (lips[1] + 640) * Math.cos(ht) - 640];
  // the rim sits 92 units from the grip along the glass
  const rimOff: V2 = [92 * Math.sin(th), -92 * Math.cos(th)];
  const atLips: V2 = [mouth[0] - rimOff[0], mouth[1] - rimOff[1]];
  const rest: V2 = side ? [96, -420] : [176, -410];
  const local: V2 = [lerp(rest[0], atLips[0], up), lerp(rest[1], atLips[1], up)];
  const s = shoulder("R", { view: o.view, facing: 1 });
  const hand = clampReach(s, local);
  const gulp = drinking ? Math.max(0, Math.sin(t * 0.9)) : 0;
  return {
    pose: {
      hold: { item: "glass", hand: "R" },
      itemTilt: tilt,
      itemFill: lerp(from, to, smooth(drink)),
      reachR: [hand[0] * fc, hand[1]],
      handR: "fist",
      frontR: true,
      headTilt: headTilt - (side ? gulp * 2 : 0),
      bob: gulp * 3,
      slump: -0.25 * up,
      face: drinking ? { lid: 0.7, lookY: -0.6 } : undefined,
      mouthOpen: 0,
    },
    drinking,
  };
};

// ---------- strings (lute, guitar, oud, saz) ----------

// The fretting hand on the neck slides between chord shapes, the strumming hand brushes across the strings on the
// body in a down-up rhythm. `body` is where the strings are strummed, `neck` where the fretting hand holds the neck
// (puppet units, screen space), `energy` 0..1.5.
export const strumPlay = (f: number, o: Facing & { body: V2; neck: V2; energy?: number; fretHand?: "L" | "R" }): Partial<PuppetPose> => {
  const { body, neck, energy = 1, fretHand = "L" } = o;
  const strumHand: "L" | "R" = fretHand === "L" ? "R" : "L";
  const c = (f / 7) % 1; // a down-up stroke every 7 frames
  const stroke = c < 0.45 ? easeOut(c / 0.45) : 1 - smooth((c - 0.45) / 0.55);
  const strum = clampReach(shoulder(strumHand, o), [body[0] + 10 * energy * (stroke - 0.5), body[1] - 40 * energy + 80 * energy * stroke]);
  const chord = Math.floor(f / 24);
  const slide = Math.sin(chord * 2.1) * 26 + smooth(((f % 24) - 20) / 4) * 0;
  const fret = clampReach(shoulder(fretHand, o), [neck[0] + slide * Math.sign(neck[0] - body[0] || 1), neck[1] - slide * 0.4 + Math.sin(f * 0.8) * 4 * energy]);
  return {
    [strumHand === "R" ? "reachR" : "reachL"]: strum,
    [fretHand === "R" ? "reachR" : "reachL"]: fret,
    [strumHand === "R" ? "handR" : "handL"]: "fist",
    [fretHand === "R" ? "handR" : "handL"]: "open",
    frontL: true,
    frontR: true,
    headTilt: 4 * energy * Math.sin(f / 14),
  };
};
