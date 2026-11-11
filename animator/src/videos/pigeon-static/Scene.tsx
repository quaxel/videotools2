import React from "react";
import * as THREE from "three";
import {
  beatPath,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  stroll,
  frameSpot,
  getUp,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  lieDown,
  moodBackground,
  moveChange,
  PuppetLook,
  PuppetPlacement,
  Room,
  MUSIC_FILES,
  MusicCue,
  ramp,
  Sfx,
  sfx,
  Shot,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { headWorld } from "../../puppet/PuppetBillboard";
import { Curtain } from "../leo-sign/props";
import { Medal, TableLamp, WorkTable } from "../xray-hand/props";
import {
  Broom,
  Bucket,
  ChartRecorder,
  CostumeOverlays,
  DeskPhone,
  Flashlight,
  Handset,
  HillSet,
  hillLight,
  HornAntenna,
  InsideHornSet,
  LIP_Y,
  ModelHorn,
  Nest,
  NoiseMeter,
  Oscilloscope,
  Overlay,
  Pigeon,
  PigeonBox,
  Rack,
  DeskClock,
  ScrubBrush,
  Stick,
  Thermometer,
  CoolingPatch,
  PaperRolls,
  BookStack,
  Vase,
  WallCalendar,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The Cosmic Static Trapped in Pigeon Poop": Holmdel, New Jersey, 1964-65. A giant horn antenna hisses; two pigeons
// nest in it; the white dielectric substance is scrubbed out and the birds sent away; they come back; the hiss stays.
// It is the Big Bang's glow, cooled to three degrees above absolute zero, from every direction. Princeton is scooped;
// the Nobel Prize in Physics, 1978.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "pigeon-static";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Every camera key is pulled back from its target by K (the cut-out heads are big: medium shots need ~3 m).
const K = 1.5;
type Key = { at: number; position: Vec3; target: Vec3; fov?: number; k?: number };
const wide = <T extends { position: Vec3; target: Vec3 }>(c: T, k = K): T => ({
  ...c,
  position: [c.target[0] + (c.position[0] - c.target[0]) * k, c.target[1] + (c.position[1] - c.target[1]) * k, c.target[2] + (c.position[2] - c.target[2]) * k] as Vec3,
});
const path = (keys: Key[], f: number) => beatPath(keys.map(({ k, ...key }) => wide(key, k ?? K)), f);

// The reach (puppet units) that puts a hand at a world point, as seen from the camera: a few Newton steps on handWorld.
export const solveReach = (at: [number, number], target: Vec3, camera: CameraShot, start: [number, number] = [-200, -600]): [number, number] => {
  let r: [number, number] = start;
  for (let it = 0; it < 6; it++) {
    const p = handWorld(at, r, camera);
    const px = handWorld(at, [r[0] + 10, r[1]], camera);
    const py = handWorld(at, [r[0], r[1] - 10], camera);
    const ex = target[0] - p[0];
    const ey = target[1] - p[1];
    const dxx = (px[0] - p[0]) / 10;
    const dyy = (py[1] - p[1]) / -10;
    r = [r[0] + (Math.abs(dxx) > 1e-6 ? ex / dxx : 0), r[1] + (Math.abs(dyy) > 1e-6 ? ey / dyy : 0)];
  }
  return r;
};

// ---------- 1. Hook: close on the horn's mouth at dusk, two pigeons on its lip, the scope hissing ----------

const S1: React.FC = () => {
  const f = useShotFrame(); // 0..122
  // low, at pigeon height, looking in along the horn: the four walls run to the glowing throat behind the birds
  const camera = path(
    [
      { at: 0, position: [0.06, 0.4, 2.75], target: [0.02, 0.24, 0.45], fov: 40, k: 1.0 },
      { at: 75, position: [0.04, 0.37, 2.25], target: [0.01, 0.23, 0.45], fov: 40, k: 1.0 },
      { at: 122, position: [0.03, 0.36, 2.02], target: [0.0, 0.23, 0.45], fov: 40, k: 1.0 },
    ],
    f,
  );
  const pk = Math.max(0, Math.sin(f * 0.21)) ** 3 * (f % 70 < 40 ? 1 : 0);
  const w2 = f * 0.35;
  return (
    <>
      <Stage
        set={
          <InsideHornSet camera={camera} frame={f} dusk dirt={1}>
            <Pigeon position={[-0.02, 0.0, 0.55]} f={f} rotationY={0.55 + 0.2 * Math.sin(f * 0.03)} peck={pk} look={0.3 * Math.sin(f * 0.05)} />
            <Pigeon position={[mix(0.26, 0.2, ease(f, 0, 120)), 0.0, mix(0.36, 0.44, ease(f, 0, 120))]} f={f + 40} rotationY={-0.5} walk={w2} coo={Math.max(0, Math.sin(f * 0.12))} scale={0.95} />
            <Oscilloscope position={[-0.24, 0.0, -0.25]} rotationY={0.3} f={f} scale={1.05} />
            <Stick a={[-0.38, 0.04, -0.45]} b={[-0.9, 0.02, -2.4]} r={0.012} color="#1e1e22" ink={0.003} />
          </InsideHornSet>
        }
        camera={camera}
        bg="#1a1416"
        blur={1.6}
        puppets={[]}
        light={hillLight("dusk")}
      />
      <Headline f={f} text={"WHAT IS\nTHIS HISS?"} at={4} out={114} size={70} />
    </>
  );
};

// ---------- cast (1964-65 New Jersey and Princeton; Stockholm 1978) ----------

const PENZIAS: PuppetLook = { skin: "#e8c0a0", hair: "#24201e", glasses: true, outfit: "#f4f4f0", pants: "#33343a", shoes: "#141010" };
const WILSON: PuppetLook = { skin: "#f0c8a8", hair: "#8a6440", outfit: "#f2f2ec", pants: "#9a8460", shoes: "#4a2e1a" };
const PENZIAS_COAT: PuppetLook = { ...PENZIAS, outfit: "#7a8088" };
const WILSON_COAT: PuppetLook = { ...WILSON, outfit: "#b8945a" };
const DICKE: PuppetLook = { skin: "#e8c0a0", hair: "#4a3a30", glasses: true, outfit: "#6a6e76", pants: "#5a5e66", shoes: "#141010" };
const COLL1: PuppetLook = { skin: "#e0b898", hair: "#2a2220", outfit: "#f2f2ee", pants: "#2e3038", shoes: "#141010" };
const COLL2: PuppetLook = { skin: "#f0cca8", hair: "#c09860", outfit: "#b8cce4", vest: "#7a5232", pants: "#7a7e86", shoes: "#4a2e1a" };
const TAILS = { outfit: "#18181c", vest: "#f4f2ec", pants: "#18181c", shoes: "#101010" };
const PENZIAS_78: PuppetLook = { ...PENZIAS, hair: "#3a3634", ...TAILS };
const WILSON_78: PuppetLook = { ...WILSON, hair: "#9a6242", beard: "#9a6242", ...TAILS };
const OFFICIAL: PuppetLook = { skin: "#eec8a8", hair: "#c8c4bc", ...TAILS };

const OVERLAYS: Record<string, Overlay> = {
  penzias: { tie: "#1e2230" },
  wilson: { tie: "#3a2a2a" },
  dicke: { tie: "#2a2a3a", collar: "#f8f8f4" },
  colleague1: { tie: "#1e2230" },
};
const OVERLAYS_COAT: Record<string, Overlay> = {};
const OVERLAYS_78: Record<string, Overlay> = { penzias: { bow: true }, wilson: { bow: true }, official: { bow: true } };

const fg = (cast: PuppetPlacement[], looks: Record<string, Overlay> = OVERLAYS, extra?: React.ReactNode) => (
  <>
    <CostumeOverlays cast={cast} looks={looks} />
    {extra}
  </>
);
const ASPECT = 9 / 16;

// ---------- 2. New Jersey, 1964: the two astronomers, then the giant horn rises behind them ----------

const S2: React.FC = () => {
  const f = useShotFrame(); // 0..185 (video 123..308)
  const camera = path(
    [
      { at: 0, position: [0.0, 1.2, 3.3], target: [-0.05, 1.0, -0.3], fov: 40, k: 1.0 },
      { at: 70, position: [-0.25, 1.18, 3.1], target: [-0.3, 1.0, -0.3], fov: 40, k: 1.0 },
      { at: 97, position: [0.2, 1.18, 3.1], target: [0.22, 1.0, -0.3], fov: 40, k: 1.0 },
      { at: 131, position: [0.4, 1.25, 5.6], target: [0.3, 1.9, -6], fov: 40, k: 1.0 },
      { at: 185, position: [0.5, 1.25, 6.6], target: [0.3, 2.0, -6], fov: 40, k: 1.0 },
    ],
    f,
  );
  const point = ease(f, 165, 174);
  const wp = stroll(f, 112, 52, [-0.42, -0.3], [-0.6, -2.6]);
  const ww = stroll(f, 108, 54, [0.35, -0.2], [0.35, -2.4]);
  const cast: PuppetPlacement[] = [
    { id: "penzias", look: PENZIAS, at: f < 112 ? [-0.42, -0.3] : wp.at, pose: { view: f < 112 ? "front" : "back", ...faceChange([[0, "happy"], [70, "excited"], [150, "thinking"]], f), ...(f >= 112 ? wp.pose : {}), reachR: point > 0 ? [mix(130, 240, point), mix(-520, -1000, point)] : undefined, handR: "point", lookX: 0.4 } },
    { id: "wilson", look: WILSON, at: f < 108 ? [0.35, -0.2] : ww.at, pose: { view: f < 108 ? "front" : "back", ...moveChange([[0, "neutral"], [97, "happy", "wave"], [128, "happy"]], f), ...(f >= 108 ? ww.pose : {}), lookX: -0.4 } },
  ];
  return (
    <Stage
      set={
        <HillSet camera={camera} frame={f + 123} mode="day">
          <HornAntenna position={[0.5, 0, -7.5]} az={-1.0} elev={0.45} />
          <Stick a={[-0.05, 0, -1.3]} b={[-0.05, 1.52, -1.3]} r={0.03} color="#6a4a2a" />
          <Label text={"NEW JERSEY\n1964"} position={[-0.05, 1.62, -1.26]} width={0.42} bg="#f4ecd8" appear={f - 4} />
        </HillSet>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.6}
      puppets={cast}
      light={hillLight("day")}
      foreground={fg(cast)}
    />
  );
};

const THREE_COLOR = THREE.Color;

// ---------- the receiver cab (shots 3 and 8) ----------

const CabRoom: React.FC<{ camera: CameraShot; frame: number; night: number; warm?: boolean; turn?: number; children?: React.ReactNode }> = ({ camera, frame, night, warm = false, turn = 0, children }) => {
  const sky = new THREE_COLOR("#bcd8f0").lerp(new THREE_COLOR("#121a3a"), night);
  return (
    <Room camera={camera} mood={warm ? "warm" : "office"} floor={warm ? "#3a2e22" : "#4a4c3a"} wall={warm ? "#8a6a3a" : "#a89a5a"} wallPattern="panel" floorPattern="tile" width={4.4} depth={3}>
      <Rack position={[-1.05, 0, -1.2]} f={frame} height={1.62} seed={2} />
      <Rack position={[-0.45, 0, -1.2]} f={frame} height={1.4} seed={5} />
      <WorkTable position={[0.35, 0, -1.05]} size={[0.8, 0.72, 0.45]} color="#5a5e5a" />
      <ChartRecorder position={[0.35, 0.98, -1.02]} f={frame} />
      <NoiseMeter position={[0.35, 1.35, -1.02]} f={frame} value={0.55} scale={0.8} />
      {/* the window: day or night outside, the view sliding while the cab turns with the antenna */}
      <InkBox size={[0.62, 0.62, 0.05]} position={[1.25, 1.55, -1.47]} color="#e8e6dc" ink={0.012} />
      <mesh position={[1.25, 1.55, -1.44]}>
        <planeGeometry args={[0.52, 0.52]} />
        <meshBasicMaterial color={sky} toneMapped={false} />
      </mesh>
      <mesh position={[1.25 + ((turn * 0.9) % 1) * 0.5 - 0.25, 1.36, -1.435]}>
        <planeGeometry args={[0.18, 0.14]} />
        <meshBasicMaterial color={night > 0.5 ? "#0a1020" : "#5e7a3a"} toneMapped={false} />
      </mesh>
      {children}
    </Room>
  );
};

// ---------- 3. The receiver picks up a faint, steady hiss; day or night, wherever they aim, the same ----------

const S3: React.FC = () => {
  const f = useShotFrame(); // 0..157 (video 309..466)
  const camera = path(
    [
      { at: 0, position: [0.0, 1.3, 2.4], target: [0.1, 1.2, -0.9], fov: 40, k: 1.0 },
      { at: 66, position: [0.1, 1.1, 1.0], target: [0.18, 1.05, -1.0], fov: 40, k: 1.0 },
      { at: 157, position: [0.12, 1.1, 0.85], target: [0.2, 1.05, -1.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  const night = ease(f, 83, 92) * (1 - ease(f, 100, 109));
  const turn = ease(f, 110, 140);
  const sway = Math.sin(turn * Math.PI) * 6;
  void sway;
  return (
    <Stage
      set={
        <CabRoom camera={camera} frame={f + 309} night={night} turn={turn}>
          <Label text="RECEIVER" position={[0.24, 1.53, -1.0]} width={0.36} bg="#f4ecd8" appear={f - 11} />
          <InkCylinder radius={0.04} height={0.09} position={[0.02, 0.765, -0.86]} color="#e8e2d4" ink={0.005} />
          <DeskClock position={[-0.05, 0.72, -1.0]} scale={0.9} hours={0.3 + 1.4 * ease(f, 80, 118)} />
        </CabRoom>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={1.8}
      puppets={[]}
      light={{ tint: "#f4f0d8", tintAmount: 0.08, shadow: 0.22, distant: [{ direction: [0.6, 0.5, 0.5] as Vec3, color: "#f8f4e4", strength: 0.8 }] }}
      foreground={fg([])}
    />
  );
};

// ---------- 4. Night: they aim the horn at New York City; same hiss ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..72 (video 467..539)
  const camera = path(
    [
      { at: 0, position: [-1.0, 1.25, 4.2], target: [0.6, 2.2, -12], fov: 40, k: 1.0 },
      { at: 72, position: [-0.7, 1.3, 3.6], target: [0.6, 2.3, -12], fov: 40, k: 1.0 },
    ],
    f,
  );
  const az = mix(-2.7, -2.2, ease(f, 0, 45));
  const cam1 = wide({ position: [-0.7, 1.3, 3.6] as Vec3, target: [0.6, 2.3, -12] as Vec3, fov: 40 }, 1);
  const cartAt = frameSpot(cam1, ASPECT, 0.5, -0.22, 1.5);
  const cast: PuppetPlacement[] = [
    { id: "penzias", look: PENZIAS, at: [-0.35, 1.2], pose: { view: "back", ...faceChange([[0, "thinking"]], f) } },
    { id: "wilson", look: WILSON, at: [0.25, 0.9], pose: { view: "back", ...faceChange([[0, "thinking"]], f), reachR: f > 20 ? [220, -900] : undefined, handR: "point" } },
  ];
  return (
    <Stage
      set={
        <HillSet camera={camera} frame={f + 467} mode="night" skyline={1}>
          <HornAntenna position={[6.2, 0, -10.5]} az={az} elev={0.12} windowGlow={1} />
        </HillSet>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.4}
      puppets={[]}
      light={hillLight("night")}
      foreground={fg([], OVERLAYS, <group position={cartAt}><InkBox size={[0.34, 0.03, 0.3]} position={[0, -0.015, 0]} color="#4a4e56" ink={0.005} />{[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.02, cartAt[1], 0.02]} position={[sx * 0.15, -cartAt[1] / 2, sz * 0.13]} color="#3a3e44" ink={0.003} />))}<Oscilloscope position={[0, 0, 0]} rotationY={-0.35} f={f} scale={0.6} /></group>)}
    />
  );
};

// ---------- 5. Inside the horn: two pigeons nesting, and a layer of white dielectric substance ----------

const P_AT5: [number, number] = [0.0, -0.05];
const W_AT5: [number, number] = [-0.68, -0.75];
const NEST5: Vec3 = [0.66, 0.66, -0.5];
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..185 (video 540..725)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.3, 4.9], target: [0.05, 0.95, -0.4], fov: 40, k: 1.0 },
      { at: 60, position: [0.35, 1.05, 3.7], target: [0.38, 0.78, -0.4], fov: 40, k: 1.0 },
      { at: 120, position: [0.1, 1.12, 4.3], target: [0.0, 0.85, -0.3], fov: 40, k: 1.0 },
      { at: 185, position: [0.05, 1.1, 4.15], target: [-0.05, 0.85, -0.3], fov: 40, k: 1.0 },
    ],
    f,
  );
  const aim = ease(f, 20, 45);
  const reachR: [number, number] = [mix(130, 300, aim), mix(-520, -640, aim)];
  const hand = handWorld(P_AT5, reachR, camera);
  const tgt: Vec3 = f < 100 ? NEST5 : [mix(NEST5[0], 0.1, ease(f, 100, 120)), 0, mix(NEST5[2], -0.5, ease(f, 100, 120))];
  const d = [tgt[0] - hand[0], tgt[1] - hand[1], tgt[2] - hand[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  // rotate +y onto the beam direction
  const rx = Math.atan2(d[2], d[1]);
  const rz = -Math.atan2(d[0], Math.hypot(d[1], d[2]));
  const nose = ease(f, 128, 138) * (1 - ease(f, 168, 180));
  const cast: PuppetPlacement[] = [
    {
      id: "penzias",
      look: PENZIAS,
      at: P_AT5,
      pose: { view: "front", crouch: 0.2, ...faceChange([[0, "thinking"], [56, "excited"], [128, "disgusted"], [170, "awkward"]], f), reachR, handR: "fist", frontR: true, reachL: nose > 0 ? [mix(-130, -18, nose), mix(-520, -770, nose)] : [-130, -520], handL: nose > 0.5 ? "fist" : "open", frontL: nose > 0.5, lookX: 0.5 },
    },
    { id: "wilson", look: WILSON, at: W_AT5, pose: { view: "front", crouch: 0.15, ...moveChange([[0, "neutral"], [56, "shocked"], [80, "happy", "point"], [118, "awkward"]], f), lookX: 0.6 } },
  ];
  return (
    <Stage
      set={
        <InsideHornSet camera={camera} frame={f + 540} bright={0} dirt={1}>
          <InkBox size={[0.62, 0.06, 0.55]} position={[0.86, 0.63, -0.5]} color="#5a6a66" ink={0.008} />
          <Stick a={[0.6, 0.6, -0.5]} b={[1.12, 0.15, -0.5]} r={0.025} color="#5a6a66" />
          <Nest position={NEST5} scale={0.9} />
          <Pigeon position={[NEST5[0] - 0.1, NEST5[1] + 0.04, NEST5[2] + 0.08]} f={f} rotationY={0.5} look={0.4 * Math.sin(f * 0.06)} coo={f > 60 ? Math.max(0, Math.sin((f - 60) * 0.15)) : 0} />
          <Pigeon position={[NEST5[0] + 0.12, NEST5[1] + 0.04, NEST5[2] - 0.12]} f={f + 30} rotationY={-0.2} cock={f > 56 ? 0.3 : 0} peck={Math.max(0, Math.sin(f * 0.17)) ** 4} scale={0.95} />
          <group userData={{ ghost: true }}>
            <Flashlight position={hand} rotation={[rx, 0, rz]} beam={aim} length={Math.max(0.5, len - 0.1)} />
          </group>
        </InsideHornSet>
      }
      camera={camera}
      bg="#0e1a1a"
      blur={1.8}
      puppets={cast}
      light={{ tint: "#a8d0c8", tintAmount: 0.16, shadow: 0.4, points: [{ position: [hand[0], hand[1] + 0.3, hand[2] + 0.4] as Vec3, color: "#fff2c0", strength: 1.6, range: 2.4 }, { position: [0, 2, 4.5] as Vec3, color: "#d8f0e8", strength: 1.0, range: 6 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 6. Science talk for pigeon poop: they scrub the horn clean (a pigeon flaps, Wilson slips) ----------

const W_AT6: [number, number] = [-0.25, 0.25];
const P_AT6: [number, number] = [0.62, -0.45];
const SLIP = 55;
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..111 (video 726..837)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.15, 3.9], target: [0.05, 0.85, -0.2], fov: 40, k: 1.0 },
      { at: 50, position: [0.02, 1.12, 3.7], target: [0.02, 0.83, -0.2], fov: 40, k: 1.0 },
      { at: 75, position: [0.12, 1.15, 4.1], target: [0.12, 0.8, -0.2], fov: 40, k: 1.0 },
      { at: 111, position: [0.12, 1.12, 3.9], target: [0.12, 0.8, -0.2], fov: 40, k: 1.0 },
    ],
    f,
  );
  const scrub = f < SLIP ? Math.sin(f * 0.5) * (0.8 + 0.2 * Math.sin(f * 0.13)) : 0;
  const slid = ease(f, SLIP + 6, SLIP + 22);
  const wAt: [number, number] = [W_AT6[0] + 1.15 * slid, W_AT6[1] + 0.1 * slid];
  const reachRW: [number, number] = [mix(150, 260, 0.5 + 0.5 * scrub), -470];
  const gripW = handWorld(wAt, reachRW, camera);
  // the pigeon flaps round Penzias's head, then flies off down the horn
  const head = headWorld(P_AT6, 0, camera.position);
  const fly = f - 6;
  const pg: Vec3 =
    fly < 0
      ? [0.9, 0.02, -0.8]
      : fly < 30
        ? [head[0] + 0.28 * Math.cos(fly * 0.35), head[1] + 0.12 + 0.06 * Math.sin(fly * 0.7), head[2] + 0.2 + 0.2 * Math.sin(fly * 0.35)]
        : [mix(head[0] + 0.28 * Math.cos(30 * 0.35), -0.3, ease(fly, 30, 50)), mix(head[1] + 0.12, 2.4, ease(fly, 30, 50)), mix(head[2] + 0.2, -4.5, ease(fly, 30, 50))];
  const flinch = ease(f, 8, 14) * (1 - ease(f, 40, 52));
  const sweep = f > 52 ? Math.sin((f - 52) * 0.3) : 0;
  const reachLP: [number, number] = flinch > 0 ? [mix(-150, -260, flinch), mix(-480, -900, flinch)] : [-150 + 40 * sweep, -480];
  const gripP = handWorld(P_AT6, reachLP, camera);
  const boxUp = ease(f, 84, 94);
  const reachRP: [number, number] = [mix(130, 160, boxUp), mix(-520, -700, boxUp)];
  const hand6 = handWorld(P_AT6, reachRP, camera);
  const BOX0: Vec3 = [0.92, 0.0, 0.25];
  const boxAt: Vec3 = [mix(BOX0[0], hand6[0] - 0.02, boxUp), mix(BOX0[1], hand6[1] - 0.2, boxUp), mix(BOX0[2], hand6[2] + 0.05, boxUp)];
  const cast: PuppetPlacement[] = [
    {
      id: "wilson",
      look: WILSON_COAT,
      at: wAt,
      pose: {
        view: "front",
        ...(f < SLIP ? { bend: 0.35 } : f < 90 ? lieDown(f, SLIP, 14) : getUp(f, 90, 20)),
        ...faceChange([[0, "determined"], [SLIP, "shocked"], [SLIP + 24, "confused"], [100, "awkward"]], f),
        reachR: f < SLIP ? reachRW : undefined,
        handR: "fist",
        frontR: f < SLIP,
        lookX: 0.3,
      },
    },
    {
      id: "penzias",
      look: PENZIAS_COAT,
      at: P_AT6,
      pose: {
        view: "front",
        ...faceChange([[0, "bored"], [8, "shocked"], [52, "angry"], [84, "smug"]], f),
        reachL: reachLP,
        handL: "fist",
        frontL: flinch > 0.3,
        reachR: f > 82 ? reachRP : flinch > 0 ? [mix(130, 250, flinch), mix(-520, -880, flinch)] : [130, -520],
        handR: f > 80 ? "fist" : "open",
        frontR: f > 80 || flinch > 0.3,
        lean: -8 * flinch,
        lookX: -0.2,
      },
    },
  ];
  return (
    <Stage
      set={
        <InsideHornSet camera={camera} frame={f + 726} bright={1} dirt={1 - ease(f, 10, 100)}>
          <group userData={{ ghost: true }}>
            {f < SLIP && <ScrubBrush position={gripW} rotation={[0, 0, 0.5 * scrub - 0.2]} len={Math.max(0.2, gripW[1] - 0.06)} />}
            {f >= SLIP && <ScrubBrush position={[wAt[0] - 0.4, 0.06, wAt[1] + 0.1]} rotation={[0, 0.4, Math.PI / 2]} len={0.7} />}
            <Broom position={gripP} rotation={[0, 0, flinch > 0 ? 2.6 * flinch : -0.25 + 0.2 * sweep]} len={Math.max(0.3, gripP[1] - 0.1)} />
            <PigeonBox position={boxAt} open={1 - ease(f, 94, 104)} />
            <Pigeon position={pg} f={f} rotationY={fly < 30 ? -fly * 0.35 : Math.PI} flap={fly < 0 ? 0 : 1} beat={f * 1.3} scale={0.9} />
          </group>
          <Bucket position={[0.15, 0, 0.6 + 0.1 * ease(f, SLIP + 2, SLIP + 10)]} rotation={[ease(f, SLIP + 2, SLIP + 10) * 1.5, 0, 0]} water={f < SLIP + 6 ? 1 : 0} />
          <Burst kind="stars" at={[wAt[0], 0.35, wAt[1]]} frame={f - SLIP - 16} count={6} size={0.5} seed={3} />
          <Burst kind="dust" at={[0.15, 0.02, 0.95]} frame={f - SLIP - 8} count={8} size={0.4} seed={5} />
        </InsideHornSet>
      }
      camera={camera}
      bg="#c8d4d4"
      blur={1.6}
      puppets={cast}
      light={{ tint: "#f4fbff", tintAmount: 0.06, shadow: 0.16, distant: [{ direction: [0.2, 0.5, 0.8] as Vec3, color: "#ffffff", strength: 0.9 }] }}
      foreground={fg(cast, OVERLAYS_COAT)}
    />
  );
};

// ---------- 7. Two days later the pigeons are back (one lands on Wilson); accounts differ on how they left ----------

const W_AT7: [number, number] = [-0.3, -0.2];
const P_AT7: [number, number] = [0.6, -0.35];
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..89 (video 838..927)
  const camera = path(
    [
      { at: 0, position: [0.1, 1.25, 3.6], target: [0.1, 1.05, -0.3], fov: 40, k: 1.0 },
      { at: 89, position: [0.05, 1.2, 3.1], target: [0.05, 1.05, -0.3], fov: 40, k: 1.0 },
    ],
    f,
  );
  const land = 42;
  const head = headWorld(W_AT7, 0, camera.position);
  const t1 = ease(f, 18, land);
  const p1: Vec3 = [mix(1.6, head[0], t1), mix(3.6, head[1] + 0.2, t1) + Math.sin(t1 * Math.PI) * 0.3, mix(-9, head[2], t1)];
  const t2 = ease(f, 26, 52);
  const boxReach: [number, number] = [-190, -560];
  const box = handWorld(W_AT7, boxReach, camera);
  const p2: Vec3 = [mix(-1.3, box[0], t2), mix(3.9, box[1] + 0.12, t2) + Math.sin(t2 * Math.PI) * 0.25, mix(-9, box[2], t2)];
  const cast: PuppetPlacement[] = [
    { id: "wilson", look: WILSON, at: W_AT7, pose: { view: "front", ...moveChange([[0, "neutral"], [land, "shocked"], [56, "sad"]], f), reachL: boxReach, handL: "fist", slump: 0.5 * ease(f, 56, 66), headTilt: f > 56 ? -6 : 0, lookX: 0.3 } },
    { id: "penzias", look: PENZIAS, at: P_AT7, pose: { view: "front", ...moveChange([[0, "happy"], [land, "excited"], [56, "awkward", "shrug"], [82, "awkward"]], f), lookX: -0.6 } },
  ];
  return (
    <Stage
      set={
        <HillSet camera={camera} frame={f + 838} mode="overcast">
          <HornAntenna position={[2.6, 0, -6]} az={-0.6} elev={0.3} />
          <Stick a={[0.15, 0, -1.2]} b={[0.15, 1.45, -1.2]} r={0.03} color="#6a4a2a" />
          <WallCalendar position={[0.15, 1.62, -1.17]} month="1964" day={f < 8 ? "DAY 1" : "DAY 3"} />
          <group userData={{ ghost: true }}>
            <PigeonBox position={[box[0], box[1] - 0.26, box[2] + 0.03]} />
            <Pigeon position={p1} f={f} rotationY={f < land ? -2.4 : 0.4} flap={f < land + 4 ? 1 : 0} beat={f * 1.25} scale={0.8} />
            <Pigeon position={p2} f={f + 17} rotationY={f < 52 ? 2.2 : -0.3} flap={f < 56 ? 1 : 0} beat={f * 1.1 + 1} scale={0.8} coo={f > 60 ? Math.max(0, Math.sin(f * 0.2)) : 0} />
          </group>
        </HillSet>
      }
      camera={camera}
      bg="#c8ccc6"
      blur={1.6}
      puppets={cast}
      light={hillLight("overcast")}
      foreground={fg(cast)}
    />
  );
};

// ---------- 8. Night in the cab: the hiss never changed; what hisses from every direction at once? ----------

const S8: React.FC = () => {
  const f = useShotFrame(); // 0..131 (video 928..1059)
  const camera = path(
    [
      { at: 0, position: [0.18, 1.12, 2.45], target: [0.18, 0.95, -0.55], fov: 40, k: 1.0 },
      { at: 131, position: [0.17, 1.08, 2.1], target: [0.17, 0.95, -0.55], fov: 40, k: 1.0 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "penzias", look: PENZIAS, at: [-0.28, -0.4], pose: { view: "front", ...moveChange([[0, "sad"], [64, "confused", "scratchHead"], [110, "thinking"]], f), lookX: 0.5 } },
    { id: "wilson", look: WILSON, at: [0.66, -0.45], pose: { view: "front", ...moveChange([[0, "bored"], [30, "sad"], [78, "worried", "shrug"], [112, "thinking", "chin"]], f), lookX: -0.6 } },
  ];
  return (
    <Stage
      set={
        <CabRoom camera={camera} frame={f + 928} night={1} warm>
          <TableLamp position={[0.68, 0.72, -1.1]} f={f + 928} on={0.45} />
        </CabRoom>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#ffd8a8", tintAmount: 0.12, shadow: 0.3, points: [{ position: [0.68, 1.1, -0.9] as Vec3, color: "#ffc070", strength: 1.1, range: 2.6 }] }}
      foreground={fg(cast, OVERLAYS, <group position={frameSpot(wide({ position: [0.17, 1.08, 2.1] as Vec3, target: [0.17, 0.95, -0.55] as Vec3, fov: 40 }, 1), ASPECT, -0.88, -0.9, 1.15)}><PaperRolls /></group>)}
    />
  );
};

// ---------- 9. You see: the universe began hot and bright; space stretched; the glow cooled to 3 degrees ----------

const S9: React.FC = () => {
  const f = useShotFrame(); // 0..235 (video 1060..1295)
  const camera = path(
    [
      { at: 0, position: [-0.2, 1.0, 3.7], target: [-0.2, 0.9, -0.5], fov: 40, k: 1.0 },
      { at: 88, position: [-0.2, 1.0, 3.35], target: [-0.2, 0.9, -0.5], fov: 40, k: 1.0 },
      { at: 150, position: [-0.1, 1.05, 3.75], target: [-0.1, 0.95, -0.5], fov: 40, k: 1.0 },
      { at: 192, position: [0.75, 1.0, 2.4], target: [0.8, 0.85, -0.5], fov: 40, k: 1.0 },
      { at: 235, position: [0.78, 1.0, 2.25], target: [0.82, 0.85, -0.5], fov: 40, k: 1.0 },
    ],
    f,
  );
  const stretch = ease(f, 113, 170);
  const cool = ease(f, 118, 212);
  const BOARD: Vec3 = [-0.2, 0.3, -0.55];
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#141c38" wall="#24305e" wallPattern="plain" floorPattern="concrete" width={7} depth={3.4}>
          <CoolingPatch position={BOARD} stretch={stretch} cool={cool} f={f} />
          {[-0.6, 0.6].map((x) => <Stick key={x} a={[BOARD[0] + x, 0, BOARD[2] - 0.05]} b={[BOARD[0] + x, BOARD[1] + 0.05, BOARD[2] - 0.05]} r={0.025} color="#3a4a7a" />)}
          <Label text="UNIVERSE" position={[BOARD[0], BOARD[1] + 1.24, BOARD[2] + 0.04]} width={0.4} bg="#d8ecff" appear={f - 28} />
          <Label text={"SPACE\nSTRETCHES"} position={[BOARD[0] - 0.45, BOARD[1] + 1.26, BOARD[2] + 0.04]} width={0.3} bg="#d8ecff" appear={f - 113} />
          {f < 160 && <Label text="BIG BANG" position={[BOARD[0] + 0.45, BOARD[1] + 1.26, BOARD[2] + 0.06]} width={0.36} bg="#fff4c8" appear={f - 88} />}
          {f < 176 && <Label text="MICROWAVES" position={[BOARD[0] + 0.45, BOARD[1] + 1.26, BOARD[2] + 0.07]} width={0.4} bg="#ffd8c8" appear={f - 163} />}
          <Thermometer position={[1.05, 0, -0.6]} level={mix(0.95, 0.05, ease(f, 150, 205))} height={1.15} />
          <Label text={"3 DEGREES ABOVE\nABSOLUTE ZERO"} position={[1.0, 1.5, -0.55]} width={0.46} bg="#f4f8ff" appear={f - 192} />
          <pointLight position={[0, 2.2, 1.0]} color="#b8c8ff" intensity={2.0} distance={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.4}
      puppets={[]}
    />
  );
};

// ---------- 10. It fills the whole sky, so the horn heard it everywhere ----------

const S10: React.FC = () => {
  const f = useShotFrame(); // 0..103 (video 1296..1399)
  const camera = path(
    [
      { at: 0, position: [3.0, 0.55, 13.4], target: [0.4, 3.0, -4], fov: 40, k: 1.0 },
      { at: 103, position: [2.6, 0.6, 12.4], target: [0.4, 3.2, -4], fov: 40, k: 1.0 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "penzias", look: PENZIAS, at: [1.75, 5.4], pose: { view: "front", ...faceChange([[0, "thinking"], [50, "excited"]], f), lookX: -0.5, headTilt: -8 } },
    { id: "wilson", look: WILSON, at: [2.4, 5.2], pose: { view: "front", ...moveChange([[0, "happy"], [54, "excited", "point"]], f), lookX: -0.6 } },
  ];
  return (
    <Stage
      set={
        <HillSet camera={camera} frame={f + 1296} mode="glow">
          <HornAntenna position={[0, 0, -4]} az={1.15 + 0.9 * ease(f, 40, 100)} elev={0.55} windowGlow={1} />
        </HillSet>
      }
      camera={camera}
      bg="#140a1e"
      blur={1.0}
      puppets={cast}
      light={hillLight("glow")}
      foreground={fg(cast)}
    />
  );
};

// ---------- 11. Princeton: Dicke's team was about to look for it. "We've been scooped." ----------

const D_AT: [number, number] = [-0.42, -0.85];
const C1_AT: [number, number] = [0.2, -0.95];
const C2_AT: [number, number] = [0.76, -0.95];
const HANG = 74;
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..112 (video 1400..1512)
  const camera = path(
    [
      { at: 0, position: [0.18, 1.25, 2.95], target: [0.17, 1.0, -0.8], fov: 40, k: 1.0 },
      { at: 30, position: [0.22, 1.2, 2.85], target: [0.2, 0.98, -0.8], fov: 40, k: 1.0 },
      { at: 112, position: [0.14, 1.15, 2.6], target: [0.14, 0.98, -0.8], fov: 40, k: 1.0 },
    ],
    f,
  );
  const down = ease(f, HANG, HANG + 10);
  const ear: [number, number] = [-95, -830];
  const rest: [number, number] = [-130, -520];
  const reachL: [number, number] = [mix(ear[0], rest[0], down), mix(ear[1], rest[1], down)];
  const hs = handWorld(D_AT, reachL, camera);
  const drop = f - 86;
  const chalkHand = handWorld(C1_AT, [150, -640], camera);
  const chalk: Vec3 = drop < 0 ? chalkHand : [chalkHand[0] + 0.02 * Math.min(drop, 10), Math.max(0.015, chalkHand[1] - 0.004 * drop * drop), chalkHand[2] + 0.01 * Math.min(drop, 10)];
  const cast: PuppetPlacement[] = [
    { id: "dicke", look: DICKE, at: D_AT, pose: { view: "front", ...faceChange([[0, "thinking"], [40, "worried"], [HANG + 4, "sad"]], f), reachL, handL: "fist", frontL: down < 0.5, slump: 0.6 * ease(f, HANG + 6, HANG + 20), lookX: 0.4 } },
    { id: "colleague1", look: COLL1, at: C1_AT, pose: { view: "front", ...faceChange([[0, "excited"], [60, "worried"], [86, "shocked"]], f), reachR: drop < 0 ? [150, -640] : [150, -560], handR: drop < 0 ? "fist" : "open", lookX: -0.6 } },
    { id: "colleague2", look: COLL2, at: C2_AT, pose: { view: "front", ...moveChange([[0, "happy"], [60, "confused"], [90, "sad", "facepalm"]], f), lookX: -0.7 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#4a3020" wall="#6a4a30" wallPattern="panel" floorPattern="wood" width={5} depth={3}>
          <InkBox size={[1.5, 0.85, 0.04]} position={[0.3, 1.45, -1.46]} color="#2a3a2e" ink={0.012} />
          <Label text={"BIG BANG\nGLOW?"} position={[0.3, 1.45, -1.43]} width={0.6} fg="#f4f1e8" bg="#2a3a2e" border={false} />
          <Label text="PRINCETON" position={[-0.55, 1.78, -1.43]} width={0.48} bg="#f08a2a" appear={f - 6} />
          <WorkTable position={[-0.42, 0, -0.45]} size={[0.7, 0.62, 0.45]} />
          <DeskPhone position={[-0.25, 0.62, -0.42]} handset={f > HANG + 10} />
          <WorkTable position={[0.48, 0, -0.42]} size={[0.56, 0.5, 0.4]} />
          <ModelHorn position={[0.48, 0.5, -0.42]} scale={0.75} az={0.3} />
          <Label text="OUR ANTENNA" position={[0.48, 0.38, -0.2]} width={0.32} bg="#f4ecd8" appear={f - 30} />
          <group userData={{ ghost: true }}>
            {f <= HANG + 10 && <Handset position={hs} rotation={[0, 0, 0.3 + 0.9 * down]} />}
            <InkBox size={[0.06, 0.016, 0.016]} position={chalk} color="#f8f6ee" ink={0.003} />
          </group>
          <Burst kind="dust" at={[chalk[0], 0.02, chalk[2]]} frame={f - 101} count={6} size={0.2} seed={9} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#f4e8d4", tintAmount: 0.08, shadow: 0.24, distant: [{ direction: [0.4, 0.6, 0.6] as Vec3, color: "#fff2dc", strength: 0.8 }] }}
      foreground={fg(cast, OVERLAYS, <group position={frameSpot(wide({ position: [0.14, 1.15, 2.6] as Vec3, target: [0.14, 0.98, -0.8] as Vec3, fov: 40 }, 1), ASPECT, 0.86, -0.9, 1.15)}><BookStack /></group>)}
    />
  );
};

// ---------- 12. Stockholm, 1978: the Nobel Prize in Physics; a pigeon drops in; the dawn of time ----------

const P_AT12: [number, number] = [-0.5, -0.55];
const W_AT12: [number, number] = [0.32, -0.6];
const O_AT12: [number, number] = [0.92, -0.8];
const S12: React.FC = () => {
  const f = useShotFrame(); // 0..239 (video 1513..1752)
  const camera = path(
    [
      { at: 0, position: [0.25, 1.25, 3.2], target: [0.25, 1.0, -0.7], fov: 40, k: 1.0 },
      { at: 51, position: [-0.1, 1.15, 2.55], target: [-0.1, 0.98, -0.6], fov: 40, k: 1.0 },
      { at: 92, position: [-0.05, 1.2, 2.6], target: [-0.05, 1.05, -0.7], fov: 40, k: 1.0 },
      { at: 175, position: [0.0, 1.1, 2.6], target: [-0.05, 0.85, -0.35], fov: 40, k: 1.0 },
      { at: 239, position: [-0.05, 1.0, 1.9], target: [-0.1, 0.8, -0.35], fov: 40, k: 1.0 },
    ],
    f,
  );
  const lift = ease(f, 92, 104) * (1 - ease(f, 150, 162));
  const handP = handWorld(P_AT12, [mix(130, 170, lift), mix(-520, -760, lift)], camera);
  const handW = handWorld(W_AT12, [mix(-130, -170, lift), mix(-520, -760, lift)], camera);
  const grab = ease(f, 86, 96) * (1 - ease(f, 150, 160));
  const onTableP: Vec3 = [-0.35, 0.645, -0.2];
  const onTableW: Vec3 = [0.15, 0.645, -0.2];
  const medalP: Vec3 = [mix(onTableP[0], handP[0], grab), mix(onTableP[1], handP[1] + 0.06, grab), mix(onTableP[2], handP[2] + 0.04, grab)];
  const medalW: Vec3 = [mix(onTableW[0], handW[0], grab), mix(onTableW[1], handW[1] + 0.06, grab), mix(onTableW[2], handW[2] + 0.04, grab)];
  const TABLE: Vec3 = [-0.1, 0.64, -0.25];
  const land = 172;
  const tp = ease(f, 140, land);
  const pg: Vec3 = [mix(1.0, TABLE[0], tp), mix(2.3, TABLE[1], tp) + Math.sin(tp * Math.PI) * 0.35, mix(-1.98, TABLE[2], tp)];
  const cast: PuppetPlacement[] = [
    { id: "penzias", look: PENZIAS_78, at: P_AT12, pose: { view: "front", ...moveChange([[0, "happy"], [51, "excited"], [land, "shocked"], [182, "excited", "point"], [215, "happy"]], f), reachR: [mix(130, 170, lift), mix(-520, -760, lift)], handR: "fist", frontR: lift > 0.3, lookX: f > land ? 0.4 : 0.2 } },
    { id: "wilson", look: WILSON_78, at: W_AT12, pose: { view: "front", ...moveChange([[0, "happy"], [66, "excited"], [land, "shocked"], [186, "happy", "clap"], [220, "happy"]], f), reachL: [mix(-130, -170, lift), mix(-520, -760, lift)], handL: "fist", frontL: lift > 0.3, lookX: f > land ? -0.4 : -0.2 } },
    { id: "official", look: OFFICIAL, at: O_AT12, pose: { view: "front", ...moveChange([[0, "neutral"], [100, "happy", "clap"], [138, "happy"], [land, "confused"]], f), lookX: -0.6 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#5a2a1a" wall="#8a5a2a" wallPattern="panel" floorPattern="carpet" width={6} depth={4}>
          <Curtain position={[0, 0, -1.85]} width={3.4} height={2.6} color="#c8962a" />
          <WorkTable position={TABLE.map((v, i) => (i === 1 ? 0 : v)) as Vec3} size={[1.0, 0.62, 0.42]} color="#3a2010" />
          <InkBox size={[1.02, 0.012, 0.44]} position={[TABLE[0], 0.626, TABLE[2]]} color="#f4ecd8" ink={0} />
          <Label text={"NOBEL PRIZE\nPHYSICS 1978"} position={[0.1, 1.62, -1.6]} width={0.56} bg="#f8ecc8" appear={f - 92} />
          <group userData={{ ghost: true }}>
            <Medal position={medalP} rotation={[(-Math.PI / 2) * (1 - grab), 0, 0]} scale={1.3} />
            <Medal position={medalW} rotation={[(-Math.PI / 2) * (1 - grab), 0, 0]} scale={1.3} />
            {f > 138 && <Pigeon position={pg} f={f} rotationY={f < land ? -2.2 : 0.3} flap={f < land + 3 ? 1 : 0} beat={f * 1.2} peck={f > land + 20 ? Math.max(0, Math.sin(f * 0.22)) ** 4 : 0} scale={0.8} />}
          </group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#ffe8b0", tintAmount: 0.1, shadow: 0.22, points: [{ position: [0, 2.2, 0.6] as Vec3, color: "#ffd890", strength: 1.2, range: 4 }] }}
      foreground={fg(cast, OVERLAYS_78, <group position={frameSpot(wide({ position: [-0.05, 1.0, 1.9] as Vec3, target: [-0.1, 0.8, -0.35] as Vec3, fov: 40 }, 1), ASPECT, -0.86, -0.9, 1.15)}><Vase /></group>)}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 123, S1, false],
  [123, 309, S2, "dissolve"],
  [309, 467, S3, "dip"],
  [467, 540, S4, "dip"],
  [540, 726, S5, "dip"],
  [726, 838, S6, "dissolve"],
  [838, 928, S7, "dip"],
  [928, 1060, S8, "dip"],
  [1060, 1296, S9, "dip"],
  [1296, 1400, S10, "dip"],
  [1400, 1513, S11, "dip"],
  [1513, TIMING.totalFrames, S12, "dip"],
];

const SFX: Sfx[] = [
  // the hook: the scope hisses, the pigeons coo
  { at: 0, src: sfx("static"), volume: 0.06, until: 123 },
  { at: 18, src: sfx("coo"), volume: 0.28, space: "outdoor" },
  { at: 78, src: sfx("coo"), volume: 0.22, space: "outdoor" },
  // the hill by day
  { at: 123, src: sfx("wind"), volume: 0.06, until: 309 },
  { at: 123 + 4, src: sfx("pop"), volume: 0.9 },
  // the cab: the hiss on the chart, the cab creaks round
  { at: 309, src: sfx("static"), volume: 0.035, until: 467 },
  { at: 309 + 11, src: sfx("pop"), volume: 0.5 },
  { at: 309 + 112, src: sfx("creak"), volume: 0.3, space: "room" },
  // New York at night
  { at: 467, src: sfx("static"), volume: 0.05, until: 540 },
  { at: 467 + 3, src: sfx("creak"), volume: 0.25, space: "outdoor" },
  // inside the horn
  { at: 540 + 2, src: sfx("button"), volume: 0.5, space: "hall" },
  { at: 540 + 62, src: sfx("coo"), volume: 0.13, space: "hall" },
  { at: 540 + 93, src: sfx("coo"), volume: 0.2, space: "hall" },
  // the scrub: brush, flapping, the slip
  { at: 726 + 2, src: sfx("scrape"), volume: 0.25, space: "hall" },
  { at: 726 + 6, src: sfx("flutter"), volume: 0.4, space: "hall" },
  { at: 726 + 26, src: sfx("flutter"), volume: 0.32, space: "hall" },
  { at: 726 + SLIP, src: sfx("skid"), volume: 0.3, space: "hall" },
  { at: 726 + SLIP + 6, src: sfx("splash"), volume: 0.2, space: "hall" },
  ...foleyCues("thud", [726 + SLIP + 14], 0.5, { space: "hall", hit: 0.3 }),
  { at: 726 + 94, src: sfx("drawer"), volume: 0.75, space: "hall" },
  // two days later
  { at: 838 + 6, src: sfx("paper"), volume: 0.55, space: "outdoor" },
  { at: 838 + 36, src: sfx("flutter"), volume: 0.38, space: "outdoor" },
  { at: 838 + 46, src: sfx("flutter"), volume: 0.3, space: "outdoor" },
  { at: 838 + 62, src: sfx("coo"), volume: 0.26, space: "outdoor" },
  // the cab at night: still the hiss
  { at: 928, src: sfx("static"), volume: 0.06, until: 1060 },
  { at: 1015, src: sfx("riser"), volume: 0.12, until: 1060 },
  // the pivot
  { at: 1060 + 4, src: sfx("sting"), volume: 0.3 },
  { at: 1060 + 10, src: sfx("hum"), volume: 0.06, until: 1296 },
  ...[28, 88, 113, 163, 192].map((t, i) => ({ at: 1060 + t, src: sfx(i % 2 ? "credit-blip" : "pop"), volume: i === 3 ? 0.3 : i % 2 ? 0.45 : i === 4 ? 0.4 : 0.6 })),
  // the whole sky
  { at: 1296, src: sfx("static"), volume: 0.06, until: 1400 },
  { at: 1296 + 40, src: sfx("creak"), volume: 0.25, space: "outdoor" },
  // Princeton
  { at: 1400 + 6, src: sfx("pop"), volume: 0.5 },
  { at: 1400 + 30, src: sfx("credit-blip"), volume: 0.3 },
  { at: 1400 + HANG + 9, src: sfx("clink"), volume: 0.35, space: "room" },
  { at: 1400 + 100, src: sfx("clink"), volume: 0.3, space: "room" },
  // Stockholm
  { at: 1513 + 92, src: sfx("chime"), volume: 0.3, space: "hall" },
  { at: 1513 + 100, src: sfx("crowd"), volume: 0.05, until: 1513 + 150 },
  { at: 1513 + 127, src: sfx("flutter"), volume: 0.6, space: "hall" },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.mystery, from: 0, to: 309, volume: 0.26 },
  { src: MUSIC_FILES.lounge, from: 309, to: 928, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 928, to: 1400, volume: 0.25 },
  { src: MUSIC_FILES.upbeat, from: 1400, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
