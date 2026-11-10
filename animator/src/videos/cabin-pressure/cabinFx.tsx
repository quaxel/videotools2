import React from "react";
import * as THREE from "three";
import { beatPath, CameraShot, faceChange, foleyCues, frameSpot, PhysicsSim, PuppetLight, PuppetPlacement, Sfx, sfx, simImpacts, Simulation, Stage, useShotFrame, Vec3 } from "../../engine";
import { CabinSet, DROPS, MaskDrop, maskSwing, maskTop, rowZ, SEAT_IN, seatLegs, seatX } from "./cabin";
import {
  Bokeh,
  CabinAltGauge,
  ColdRig,
  CRACK,
  DOOR,
  DreamRig,
  drawDebris,
  ExitDoor,
  FaceMask,
  FogJet,
  FogTone,
  Haze,
  HeroNapkin,
  JET_FROM,
  leftWall,
  mouthPoint,
  Sparkles,
  Stopwatch,
  SuctionStreaks,
  SunRig,
  Trolley,
} from "./cabinFxProps";
import { BARRY, EXTRAS, SEATING } from "./cast";
import SIM_JSON from "./physics.json";
import { at, SHOT, ShotId, TIMING } from "./shots";

// Three cabin shots of "cabin-pressure" (camera_plan.md shots 4, 7 and 11) on CabinSet (cabin.tsx, read-only):
// everything extra (the exit, the fog, the stopwatch, the dream and sun re-lights, masks on faces) is a set child
// from cabinFxProps.tsx.
//   DoorSeal   433-570   line 5: push toward the over-wing exit; the seal cracks, fog jets in, debris whips to the gap,
//                        the cabin fogs, the CABIN ALT needle climbs, row 0 flinches.
//   Euphoria   894-1167  lines 9-10: the cabin as a pink-purple dream; slow push and orbit onto blissful Barry; on
//                        "a minute at most" a chrome stopwatch swings in beside him, its hand ticking.
//   CabinCalm 1475-1545  line 14: low gold sun; Barry masked and sheepish, whole in the foreground; the camera cranes
//                        up and pulls back over him to the masked rows behind blinking awake.

const SIM = (SIM_JSON as unknown as Record<string, PhysicsSim>).doorSeal;
const ASPECT = 1080 / 1920;
type Seat = { side: number; k: number; r: number };
const seat = (s: Seat): [number, number] => [seatX(s.side, s.k), rowZ(s.r) + SEAT_IN];
const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
// The shot frame where word k of line `line` starts (from the voice timing, so a re-voice moves the beats too).
const word = (line: number, k: number, shot: ShotId) => {
  const l = TIMING.lines![line];
  const ws = TIMING.words[l.speaker].filter(([a]) => a >= l.from - 1 && a <= l.to);
  return ws[Math.min(k, ws.length - 1)][0] - SHOT[shot][0];
};
const along = (cam: CameraShot, p: Vec3) => {
  const d = new THREE.Vector3(...cam.target).sub(new THREE.Vector3(...cam.position)).normalize();
  return new THREE.Vector3(...p).sub(new THREE.Vector3(...cam.position)).dot(d);
};

// ---------- 4. DoorSeal ----------

const CRACKS = word(5, 4, "doorSeal"); // "cracks"
const SCREAMS = word(5, 6, "doorSeal"); // "screams"
const FOGS = word(5, 10, "doorSeal"); // "fogs"
const CLIMBS = word(5, 14, "doorSeal"); // "climbs"
const DOOR_END = SHOT.doorSeal[1] - SHOT.doorSeal[0];

// The gauge: 8,000 ft until the crack, a slow creep, then the climb on "climbs" toward 15,000 (the next shot).
const cabinAlt = (f: number) => 8 + 2.4 * smooth((f - CRACKS) / 75) + 3.8 * smooth((f - CLIMBS + 8) / 28);
// The jet: hardest right at the crack, then a steady stream.
const jetPower = (t: number) => (t < 0 ? 0 : t < 18 ? 1 : 0.62 + 0.38 * Math.exp(-(t - 18) / 25));
const JET_DIR: Vec3 = (() => {
  const a = leftWall(DOOR.y, DOOR.z, [0, 0, 0]);
  const b = leftWall(DOOR.y, DOOR.z, [-0.45, 0.9, 0.18]); // up the wall toward the bins, forward, just off the wall
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
})();
// Haze clouds once the cabin fogs: round the door and in the rows behind row 0, never in front of a face or the gauge.
const DOOR_HAZE: { at: Vec3; size: number }[] = [
  { at: [-1.62, 1.3, 2.75], size: 0.8 },
  { at: [-1.62, 0.32, 2.62], size: 0.7 },
  { at: [-1.5, 1.42, 2.45], size: 0.6 },
  { at: [-1.7, 0.6, 2.85], size: 0.6 },
  { at: [-0.85, 1.68, 2.35], size: 1.0 },
  { at: [-1.25, 1.25, 0.35], size: 1.3 },
  { at: [-0.35, 1.4, -0.35], size: 1.5 },
  { at: [-1.55, 0.95, -0.6], size: 1.3 },
  { at: [0.25, 1.15, -1.2], size: 1.6 },
  { at: [-0.95, 1.55, -1.7], size: 1.8 },
  { at: [0.6, 1.5, 0.4], size: 1.2 },
];

const ROW0_WIN: Seat = { side: -1, k: 2, r: 0 };

export const DoorSeal: React.FC = () => {
  const f = useShotFrame();
  const cam = beatPath(
    [
      { at: 0, position: [1.1, 1.2, 3.6], target: [-1.55, 0.86, 1.9], fov: 50 },
      { at: CRACKS + 24, position: [1.02, 1.19, 3.55], target: [-1.56, 0.87, 1.92], fov: 49 },
      // on "screams" the camera swings to the exit: the passenger leaves by the right edge
      { at: CRACKS + 52, position: [0.3, 1.15, 3.25], target: [-1.82, 0.94, 2.2], fov: 44 },
      { at: DOOR_END - 6, position: [-0.1, 1.13, 3.1], target: [-1.78, 0.98, 1.95], fov: 42 },
    ],
    f,
  );
  const crack = f - CRACKS;
  const k = crack < 0 ? 0 : smooth(crack / 4);
  const fog = smooth((f - FOGS + 12) / 34);
  // The window passenger by the exit: bored, then the flinch on the bang, then he turns to stare at the door.
  const guard = crack < 0 ? 0 : smooth(crack / 3) * (1 - smooth((crack - 30) / 12));
  const flinch = crack < 0 ? 0 : smooth(crack / 4) * (0.45 + 0.55 * Math.exp(-Math.max(0, crack - 4) / 18));
  const turn = smooth((crack - 8) / 10);
  const puppets: PuppetPlacement[] = [
    {
      id: "x-win0",
      look: EXTRAS[3],
      at: seat(ROW0_WIN),
      crop: f > CRACKS + 28, // the swing to the exit carries him out of frame on the right
      pose: {
        sit: true,
        ...faceChange([[-99, "bored"], [CRACKS + 1, "shocked"], [CRACKS + 52, "worried"]], f),
        lean: 13 * flinch,
        lookX: mix(0.15, -0.95, turn),
        headTilt: -9 * turn + Math.sin(f * 0.9) * 1.5 * k,
        armL: [12 + 125 * guard, -12 - 32 * guard],
        armR: [10 + 55 * guard, -18 * guard],
        frontL: guard > 0.4,
        handL: "open",
      },
    },
  ];
  const light: PuppetLight = {
    distant: [{ direction: [-0.85, 0.2, 0.5], color: crack < 0 ? "#fff1dc" : "#dcecff", strength: 1.0 + 0.7 * k }],
    points: k > 0 ? [{ position: CRACK, color: "#d6ecff", strength: 2.2 * k, range: 1.8 }] : [],
  };
  return (
    <Stage
      bg="#c9d6e4"
      camera={cam}
      set={
        <CabinSet camera={cam} f={f} mood="fog" masks={false}>
          {seatLegs(puppets, cam).legs}
          <FogTone color={crack < 0 ? "#dcd6ca" : "#d7e3ef"} near={mix(4, 1.0, fog)} far={mix(16, 6.2, fog)} />
          <ColdRig crack={crack} at={CRACK} />
          <ExitDoor f={f} crack={crack} />
          <CabinAltGauge value={cabinAlt(f)} f={f} />
          <Simulation sim={SIM} frame={f - CRACKS} draw={(b) => drawDebris(b, f)} squashy={false} />
          <HeroNapkin t={crack - 1} f={f} />
          {/* the hard core right at the split, and the plume it feeds, rolling up the wall toward the bins */}
          <FogJet from={JET_FROM} dir={JET_DIR} t={crack} frames={DOOR_END - CRACKS + 2} power={jetPower} rate={3} speed={5} size={0.022} life={12} drag={6} drift={[0.2, 0.2, 0.05]} seed={2} />
          <FogJet from={JET_FROM} dir={JET_DIR} t={crack} frames={DOOR_END - CRACKS + 2} power={jetPower} rate={2.2} speed={3.2} size={0.045} life={38} drag={3.6} drift={[0.22, 0.16, 0.1]} />
          <SuctionStreaks to={CRACK} t={crack} amount={crack < 0 ? 0 : crack < SCREAMS - CRACKS + 24 ? 1 : 0.5} />
          <Haze spots={DOOR_HAZE} f={f} amount={fog} opacity={0.36} />
        </CabinSet>
      }
      puppets={seatLegs(puppets, cam).puppets}
      light={light}
      blur={4}
      energy={0.5}
      truth={0.2 * k + 0.1 * fog}
      focus={along(cam, CRACK)}
      foreground={<Trolley f={f} rattle={k * (1 - fog * 0.6)} />}
    />
  );
};

// ---------- 7. Euphoria ----------

const A_MINUTE = word(10, 6, "euphoria"); // "a minute at most"
const BUZZ = word(9, 12, "euphoria"); // "happy buzz"
const SWING_IN = A_MINUTE - 12; // the watch is let go up out of frame and crosses the middle on "minute"
const TICKS = Array.from({ length: 6 }, (_, i) => A_MINUTE + 2 + i * 6);
// The watch hangs over the aisle edge in front of Barry (screen-right of his face from across the aisle) and swings
// in from beyond the frame along z; the damping keeps its overshoot off his face.
const WATCH_PIVOT: Vec3 = [0.2, 1.83, 0.8];
const WATCH_LEN = 0.93;
const watchSwing = (f: number) => {
  if (f < SWING_IN) return 1.05;
  const t = f - SWING_IN;
  return 1.05 * Math.exp(-t / 10) * Math.cos((2 * Math.PI * t) / 55) + 0.04 * Math.sin(t * 0.11) * smooth(t / 30);
};
const BARRY_AT = seat(SEATING.barry);
// Sparkles round Barry's head, kept off his face: above it, behind it toward the wall, and to its sides.
const SPARKLE_SPOTS: Vec3[] = [
  [0.9, 1.4, 0.36],
  [0.6, 1.55, 0.05],
  [1.1, 1.15, -0.15],
  [0.75, 1.65, 0.62],
  [1.3, 1.5, 0.55],
  [1.0, 0.85, -0.3],
  [0.45, 1.75, 0.3],
  [1.4, 1.0, 0.2],
  [0.8, 1.25, -0.45],
  [1.5, 1.6, -0.2],
  [0.95, 0.75, 0.75],
  [0.5, 1.4, -0.45],
];
const DREAM_HAZE: { at: Vec3; size: number }[] = [
  { at: [1.5, 1.3, 0.2], size: 1.6 },
  { at: [1.3, 0.8, -0.9], size: 1.6 },
  { at: [1.6, 1.5, 1.1], size: 1.5 },
  { at: [1.2, 1.7, -1.6], size: 2.0 },
  { at: [1.5, 0.6, 0.9], size: 1.3 },
];

export const Euphoria: React.FC = () => {
  const f = useShotFrame();
  // From across the aisle, between rows 0 and 1 (Mia and Rose's leg room; they are not in this dream): a slow push
  // with a crane down and a slight orbit onto Barry, easing back on "a minute" to take the watch in beside him.
  const c0: CameraShot = { position: [-1.42, 1.2, 0.84], target: [0.45, 0.95, 0.42], fov: 56 };
  const cam = beatPath(
    [
      { at: 0, ...c0 },
      { at: A_MINUTE - 24, position: [-1.0, 1.08, 0.78], target: [0.5, 0.97, 0.4], fov: 42 },
      { at: A_MINUTE + 16, position: [-1.55, 1.12, 0.72], target: [0.45, 0.94, 0.57], fov: 52 },
    ],
    f,
  );
  const swing = watchSwing(f);
  const watchAt: Vec3 = [WATCH_PIVOT[0], WATCH_PIVOT[1] - Math.cos(swing) * WATCH_LEN, WATCH_PIVOT[2] + Math.sin(swing) * WATCH_LEN];
  const seeWatch = smooth((f - A_MINUTE + 4) / 10);
  // a lazy reach toward the watch once it hangs there
  const reach = smooth((f - A_MINUTE - 8) / 18);
  const floatL: [number, number] = [70 + 30 * Math.sin(f * 0.036), -40 + 22 * Math.sin(f * 0.051 + 0.7)];
  const barry: PuppetPlacement = {
    id: "barry",
    look: BARRY,
    at: BARRY_AT,
    pose: {
      sit: true,
      expression: "happy",
      face: { lid: 0.42 + 0.1 * Math.sin(f * 0.031), lookY: -0.15 },
      headTilt: Math.sin(f * 0.045) * 7 + Math.sin(f * 0.017 + 0.6) * 3,
      lean: Math.sin(f * 0.03 + 1) * 3.5,
      lookX: mix(0.15 * Math.sin(f * 0.02), -0.75, seeWatch),
      armL: floatL,
      armR: [(95 + 25 * Math.sin(f * 0.029 + 2)) * (1 - reach) + 80 * reach, (-25 + 20 * Math.sin(f * 0.044 + 2.2)) * (1 - reach) - 60 * reach],
      handL: "open",
      handR: reach > 0.6 ? "point" : "open",
      view: "front",
    },
  };
  const puppets = [barry];
  const light: PuppetLight = {
    points: [{ position: [-0.45, 1.25, 0.75], color: "#ff8fd8", strength: 1.7, range: 2.4 }],
    distant: [{ direction: [0.55, 0.45, -0.7], color: "#b892ff", strength: 1.5 }],
  };
  const fgA = frameSpot(c0, ASPECT, 0.92, -0.9, 0.62);
  const fgB = frameSpot(c0, ASPECT, -0.86, 0.66, 0.7);
  return (
    <Stage
      bg="#b78ad6"
      camera={cam}
      set={
        <CabinSet camera={cam} f={f} mood="dream" hide={["1:1", "-1:1"]}>
          {seatLegs(puppets, cam).legs}
          <FogTone color="#c69be4" near={0.9} far={6.8} />
          <DreamRig f={f} />
          <Haze spots={DREAM_HAZE} f={f} amount={1} color="#e7b3ff" opacity={0.38} />
          <Bokeh box={[[-0.9, 0.35, -3.6], [1.9, 1.9, 0.0]]} f={f} count={46} />
          <Sparkles spots={SPARKLE_SPOTS} f={f} />
          {/* Barry's own masks dangle unused just in front of him */}
          <MaskDrop side={1} z={rowZ(SEATING.barry.r) + 0.2} {...swingOf(1, SEATING.barry.r, f)} />
          {f >= SWING_IN - 2 && (
            <Stopwatch pivot={WATCH_PIVOT} length={WATCH_LEN} swing={swing} plane="zy" twist={0.15 * Math.sin(f * 0.07)} face={cam.position} hand={45 + Math.max(0, Math.floor((f - TICKS[0]) / 6) + 1)} />
          )}
          {f >= SWING_IN && <Sparkles spots={[[watchAt[0] - 0.12, watchAt[1] + 0.12, watchAt[2] + 0.05], [watchAt[0] + 0.1, watchAt[1] - 0.14, watchAt[2] + 0.04]]} f={f} size={0.05} />}
        </CabinSet>
      }
      puppets={seatLegs(puppets, cam).puppets}
      light={light}
      blur={5}
      energy={0.5}
      focus={mix(along(cam, [BARRY_AT[0], 0.98, BARRY_AT[1]]), along(cam, watchAt) + 0.12, seeWatch)}
      foreground={
        <>
          <group position={fgA}>
            <Bokeh box={[[-0.07, -0.07, -0.04], [0.07, 0.07, 0.04]]} f={f} count={4} size={[0.05, 0.1]} seed={7} strength={0.4} />
          </group>
          <group position={fgB}>
            <Bokeh box={[[-0.06, -0.06, -0.04], [0.06, 0.06, 0.04]]} f={f} count={3} size={[0.04, 0.09]} seed={9} strength={0.35} />
          </group>
        </>
      }
    />
  );
};

// ---------- 11. CabinCalm ----------

const GIGGLE_STOPS = word(14, 2, "cabinCalm"); // "stops giggling"
const WHOLE = word(14, 6, "cabinCalm"); // "the whole plane wakes up"
const CALM_END = SHOT.cabinCalm[1] - SHOT.cabinCalm[0];
// Which tube of a row's cluster each seat uses (the cluster's mask k hangs nearest the wall at 0, the aisle at 2).
const tubeOf = (s: Seat) => maskTop(s.side, s.r, 2 - s.k);
// A cluster's lengths and swings at frame f, as CabinSet draws it, for clusters a shot draws itself.
const swingOf = (side: number, r: number, f: number) => {
  const d = DROPS[(r + (side > 0 ? 4 : 0)) % DROPS.length];
  return { lens: d.lens, swing: d.lens.map((_, k) => maskSwing(side, r, k, f)) };
};
// The rows behind Barry, masked, nodding off, then blinking awake one after another on "the whole plane wakes up".
// Seats across the aisle (the right-hand rows hide under the bins from up here, and the right aisle seats would
// stack on Barry's head); the ones near a frame edge are crop: they may sit partly out.
const WAKERS: { id: string; look: number; s: Seat; wake: number; crop?: boolean }[] = [
  { id: "x-r3l", look: 4, s: { side: -1, k: 0, r: 3 }, wake: 0, crop: true },
  { id: "x-r5l", look: 2, s: { side: -1, k: 0, r: 5 }, wake: 6 },
  { id: "x-r6m", look: 5, s: { side: -1, k: 1, r: 6 }, wake: 11, crop: true },
  { id: "x-r7l", look: 1, s: { side: -1, k: 0, r: 7 }, wake: 15 },
];

export const CabinCalm: React.FC = () => {
  const f = useShotFrame();
  // High in the aisle forward of row 0 (left empty), looking down over its seat backs at Barry, who stays whole and
  // sharp in the foreground all shot. On "the whole plane wakes up" the camera cranes up and pulls back, tilting down
  // the cabin to the masked rows behind him blinking awake. Mia and Rose sit across the aisle, out of this frame.
  const cam = beatPath(
    [
      { at: 0, position: [0.42, 1.6, 2.2], target: [0.48, 0.92, 0.36], fov: 46 },
      { at: GIGGLE_STOPS + 10, position: [0.42, 1.63, 2.3], target: [0.46, 0.91, 0.3], fov: 46 },
      { at: CALM_END - 4, position: [0.4, 1.76, 2.75], target: [0.36, 0.82, 0.0], fov: 46 },
    ],
    f,
  );
  const giggle = 1 - smooth((f - GIGGLE_STOPS) / 8);
  const barryMask = mouthPoint(BARRY_AT, cam);
  const puppets: PuppetPlacement[] = [
    {
      id: "barry",
      look: BARRY,
      at: BARRY_AT,
      pose: {
        sit: true,
        ...faceChange([[-99, "happy"], [GIGGLE_STOPS + 2, "awkward"]], f),
        headTilt: giggle * 5 * Math.sin(f * 1.25) + (1 - giggle) * -7,
        bob: giggle * -8 * Math.abs(Math.sin(f * 0.62)),
        slump: (1 - giggle) * 0.25,
        lookX: (1 - giggle) * 0.35,
        face: { lookY: (1 - giggle) * 0.35 },
        worldR: [barryMask[0] + 0.09, barryMask[1] - 0.015, barryMask[2] - 0.03],
        frontR: true,
        handR: "open",
        armL: [8, 12],
      },
    },
    ...WAKERS.map(({ id, look, s, wake, crop }, i): PuppetPlacement => {
      const w = WHOLE + wake;
      const up = smooth((f - w) / 8);
      return {
        id,
        look: EXTRAS[look],
        at: seat(s),
        crop,
        pose: {
          sit: true,
          ...faceChange([[-99, "bored"], [w, "neutral"]], f),
          face: { lid: 0.6 * (1 - up) },
          headTilt: (1 - up) * (i % 2 ? 10 : -10) + up * 4 * Math.sin((f - w) * 0.12 + i),
          slump: 0.35 * (1 - up),
          lookX: up * 0.5 * Math.sin((f - w) * 0.07 + i * 1.3),
        },
      };
    }),
  ];
  const masks = [
    { at: barryMask, top: tubeOf({ ...SEATING.barry }), breath: 0.3 },
    ...WAKERS.map(({ s }, i) => ({ at: mouthPoint(seat(s), cam), top: tubeOf(s), breath: 0.5 + 0.5 * Math.sin(f * 0.12 + i * 1.7) })),
  ];
  // the clusters this shot draws itself: the masks in use go to faces, the spare ones still dangle
  const worn: Seat[] = [SEATING.barry, ...WAKERS.map((p) => p.s)];
  const clusters: { side: number; r: number; used: number[] }[] = [];
  for (const w of worn) {
    const c = clusters.find((x) => x.side === w.side && x.r === w.r) ?? clusters[clusters.push({ side: w.side, r: w.r, used: [] }) - 1];
    c.used.push(2 - w.k);
  }
  const light: PuppetLight = { distant: [{ direction: [-1, 0.28, 0.22], color: "#ffc46e", strength: 2.0 }] };

  return (
    <Stage
      bg="#f0d6a8"
      camera={cam}
      set={
        <CabinSet camera={cam} f={f} mood="sunlit" hide={["1:0", ...clusters.map((c) => `${c.side}:${c.r}`)]}>
          {seatLegs(puppets, cam).legs}
          <FogTone color="#f1d3a2" near={3} far={12} />
          <SunRig />
          {clusters.map(({ side, r, used }) => (
            <MaskDrop key={`${side}:${r}`} side={side} z={rowZ(r)} {...swingOf(side, r, f)} hide={used} />
          ))}
          {masks.map((m, i) => (
            <FaceMask key={i} at={m.at} camera={cam} top={m.top} breath={m.breath} />
          ))}
        </CabinSet>
      }
      puppets={seatLegs(puppets, cam).puppets}
      light={light}
      blur={3}
      energy={0.25}
      // the row-0 masks on the right, dangling by the lens (soft): row 0 is empty, they were never pulled
      foreground={<MaskDrop side={1} z={rowZ(0)} {...swingOf(1, 0, f)} />}
    />
  );
};

// ---------- sound ----------

const D0 = SHOT.doorSeal[0] + CRACKS; // the crack, video frame
// Physics hits: the cup knocks, the peanuts tick (a few, each a little different), the napkins and packet rustle.
const debrisSfx: Sfx[] = (() => {
  // a different recorded take on every hit (foleyCues), never one file stamped out over the burst
  const out: Sfx[] = [];
  const ticks: number[] = [];
  const rustles: number[] = [];
  for (const h of simImpacts(SIM, undefined, 1.4)) {
    const v = D0 + h.frame;
    if (v >= SHOT.doorSeal[1] - 2) continue;
    if (h.body === "cup") out.push({ at: v, src: sfx("plop"), volume: Math.min(0.42, 0.3 + h.speed * 0.05), space: "room" });
    else if (h.body.startsWith("peanut") && ticks.length < 5 && !ticks.some((t) => Math.abs(t - v) < 3)) ticks.push(v);
    else if ((h.body.startsWith("napkin") || h.body === "packet") && rustles.length < 2 && h.other === "door") rustles.push(v);
  }
  return [...out, ...foleyCues("tick", ticks, 0.22, { space: "room" }), ...foleyCues("paper", rustles, 0.16, { space: "room" })];
})();

export const cabinFxSfx: Sfx[] = [
  // DoorSeal: the seal goes with a bang (camera jolt) and a burst of hiss, then the air roars out to the cut
  // (the bang lands a beat after "cracks" so it never covers the word; the beds sit low under the narration)
  { at: D0 + 11, src: sfx("boom"), volume: 0.36, space: "room" },
  { at: D0 + 12, src: sfx("hiss"), volume: 0.25, space: "room" },
  { at: D0 + 12, src: sfx("wind"), volume: 0.14, until: SHOT.doorSeal[1] },
  ...foleyCues("paper", [D0 + 18, D0 + 26], 0.2, { space: "room" }), // the napkins, the second slapping onto the seal
  ...debrisSfx,
  // Euphoria: dreamy chimes, the watch whooshing in, its ticks
  { at: at("euphoria", word(9, 0, "euphoria")), src: sfx("chime"), volume: 0.18, space: "room" },
  { at: at("euphoria", SWING_IN + 2), src: sfx("whoosh"), volume: 0.42, space: "room" },
  ...foleyCues("tick", TICKS.map((t) => at("euphoria", t)), 0.9, { space: "room" }),
  // CabinCalm: the quiet hum of a cabin that is fine again
  { at: at("cabinCalm", 0), src: sfx("ambience"), volume: 0.32, until: SHOT.cabinCalm[1] },
];
