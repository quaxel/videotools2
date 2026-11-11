import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  frameSpot,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  moodBackground,
  moveChange,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  ramp,
  Room,
  Sfx,
  sfx,
  Shot,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Automobile, CAR, carSeat } from "../../three/MarathonSets";
import { WallClock } from "../what-if-fleming/props";
import { BottleShelf, LabWindow, WallDate, WorkTable } from "../xray-hand/props";
import { Costume, Costumes } from "./costumes";
import { Flask, flaskWeb, flaskWebInner, ImpactGlow, ImpactRing, Pane, paneWeb, Shards } from "./glass";
import { GasLamp, Broom, Brush, CAR_SEAT_Y, CarScreen, CollodionJar, Duckboard, Easel, GasCloud, BarbedWire, GreenLamp, LowCupboard, Mallet, ModernCar, News, ParisStreet, Patent, RoadToday, Sandwich, SANDWICH, sandwichWeb, SandbagWall, screenPoint, Stone } from "./props";
import TIMING_JSON from "./timing.json";

// "The Dropped Flask That Would Not Fall Apart": Paris, 1903. The chemist and artist Édouard Bénédictus knocks a glass
// flask to the floor; it shatters but keeps its shape, held by a dried collodion film inside. The story goes that he
// later read of people cut by flying glass in a car crash, remembered the flask and worked all night: glass, plastic,
// glass. Patented 1909; car makers slow; first big job in WWI gas-mask eyepieces; then car windscreens, still today.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "dropped-flask";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

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

// ---------- the lab (Paris, 1903; guide/references/paris-lab-1903.md) ----------

const LAB_FLOOR = "#8a5e4e";
const LAB_WALL = "#9fae9a";

// ---------- 1. Hook: the flask in mid-fall, the camera sinking with it; it hits, the web, it stands whole ----------

const HOOK_AT: Vec3 = [0, 0, 0.55];
const HOOK_SCALE = 1.6;
const HIT = 20; // on "shattered"
const G1 = (0.6 * 9.8) / 900; // a slightly slow fall (metres per frame squared)
const V1 = 0.014;
const HOOK_WEB = flaskWeb(7, -0.35);
const flaskFall = (f: number) => {
  const t = HIT - f;
  const y = f < HIT ? V1 * t + 0.5 * G1 * t * t : 0;
  // tumbles as it falls; after the hit it rocks on its base and settles upright, a last small wobble on "refused"
  const a = f < HIT ? mix(0.36, 0.95, Math.min(1, t / HIT)) : 0.36 * Math.exp(-(f - HIT) / 7) * Math.cos((f - HIT) * 0.55) + 0.05 * Math.exp(-Math.max(0, f - 100) / 6) * Math.sin(Math.max(0, f - 100) * 0.7);
  const hop = f >= HIT ? 0.03 * Math.max(0, Math.sin(Math.min(1, (f - HIT) / 9) * Math.PI)) : 0;
  const r = 0.072 * HOOK_SCALE;
  return { y: y + hop + r * Math.abs(Math.sin(a)) * 0.95, a };
};
// the camera follows the flask down, then eases to rest on the floor and pushes in to the web
const hookCamera = (f: number): CameraShot => {
  const follow = (g: number) => flaskFall(g).y + 0.2;
  const B0 = HIT - 6;
  const B1 = HIT + 16;
  const REST = 0.42;
  let y: number;
  if (f <= B0) y = follow(f);
  else if (f >= B1) y = REST;
  else {
    // cubic Hermite from the follow height and speed at B0 to rest
    const p0 = follow(B0);
    const v0 = (follow(B0) - follow(B0 - 1)) * (B1 - B0);
    const s = (f - B0) / (B1 - B0);
    const h00 = 2 * s * s * s - 3 * s * s + 1;
    const h10 = s * s * s - 2 * s * s + s;
    const h01 = -2 * s * s * s + 3 * s * s;
    y = h00 * p0 + h10 * v0 + h01 * REST;
  }
  const push = ease(f, 8, 132);
  const land = ease(f, HIT - 8, HIT + 10);
  const tgtY = y - mix(0.1, 0.22, land) - 0.02 * push;
  const pos: Vec3 = [mix(0.12, 0.06, push), y + mix(0.05, 0, land), HOOK_AT[2] + mix(1.75, 1.58, push)];
  const cx = -0.19 * Math.sin(flaskFall(f).a) * (1 - land);
  pos[0] += cx;
  const tgt: Vec3 = [cx, tgtY, HOOK_AT[2]];
  return { position: pos, target: tgt, fov: 40 };
};
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..134
  const camera = hookCamera(f);
  const fall = flaskFall(f);
  const crack = f < HIT ? 0 : 0.21 * ease(f, HIT, HIT + 12);
  return (
    <>
      <Stage
        set={
          <Room camera={camera} mood="warm" floor={LAB_FLOOR} wall="#7f8e7c" wallPattern="plaster" floorPattern="tile" width={5} depth={3}>
            <WorkTable position={[-0.75, 0, -0.35]} size={[1.3, 0.8, 0.6]} />
            <BottleShelf position={[-0.4, 1.55, -1.38]} width={1.0} />
            <BottleShelf position={[0.55, 1.2, -1.38]} width={0.9} />
            <Flask position={[HOOK_AT[0], fall.y, HOOK_AT[2]]} rotation={[0.12 * Math.sin(fall.a * 2), 0.3, fall.a]} scale={HOOK_SCALE} web={HOOK_WEB} crack={crack} shine={f >= HIT ? 0.4 * Math.max(0, 1 - (f - HIT) / 8) : 0} color={f < HIT ? "#5aaab6" : undefined} ink={0.006} />
            <ImpactRing position={[HOOK_AT[0] - 0.08, 0.004, HOOK_AT[2] + 0.05]} frame={f - HIT} size={0.36} />
            <ImpactGlow position={[HOOK_AT[0] - 0.08, 0.02, HOOK_AT[2] + 0.12]} frame={f - HIT} size={0.16} />
            <pointLight position={[0.5, 0.9, 1.3]} color="#fff2dc" intensity={0.9} distance={3} />
          </Room>
        }
        camera={camera}
        bg={moodBackground("warm")}
        blur={1.4}
        puppets={[]}
        energy={0.4}
      />
      <Headline f={f} text={"THE SECRET IN\nYOUR WINDSHIELD"} at={3} out={124} size={70} y={200} />
    </>
  );
};

// ---------- cast (Paris 1903-1909; a Paris street about 1905; a WWI trench; a road today) ----------

const BENEDICTUS: PuppetLook = { skin: "#eec6a6", hair: "#2a2018", outfit: "#f2f0e8", vest: "#2e2c34", pants: "#2e2c34", shoes: "#141010" };
// 1903-09 motorists: a duster coat, a flat cap with goggles pushed up (period-ok: motorists' caps from about 1900), dark trousers, brown boots
const MOTORIST: PuppetLook = { skin: "#e8bc98", hair: "#5a3a24", outfit: "#c8b088", pants: "#3a3430", shoes: "#4a2e1e" }; // period-ok: flat cap is a slug overlay, motorists ~1900+
const MOTORIST2: PuppetLook = { skin: "#f0caa8", hair: "#2a2420", outfit: "#8a7a64", pants: "#2e2a28", shoes: "#3a2418" }; // period-ok: duster coat; flat cap and goggles are slug overlays (motorists from about 1900)
const LADY: PuppetLook = { skin: "#f4d0b4", hair: "#6a4a2e", long: true, outfit: "#8a2e3a", skirt: true, pants: "#8a2e3a", shoes: "#2a1a14" };
const CARMAKER: PuppetLook = { skin: "#e4b896", hair: "#6a4a30", outfit: "#f0ece0", vest: "#6a4a2e", pants: "#3a3a40", shoes: "#141010" };
const SOLDIER: PuppetLook = { skin: "#e8bc98", hair: "#4a3424", outfit: "#8a7a52", pants: "#7a6c48", wraps: "#6a5c3c", shoes: "#4a3020" };
const SOLDIER2: PuppetLook = { skin: "#d8a888", hair: "#2a2420", outfit: "#86764e", pants: "#766844", wraps: "#665838", shoes: "#4a3020" };
const DRIVER: PuppetLook = { skin: "#c89070", hair: "#1e1a18", outfit: "#2a3a6a", pants: "#3a5a8a", shoes: "#f0f0f0" }; // present day

const COSTUMES: Record<string, Costume> = {
  benedictus: { moustache: "#2a2018", collar: "#fbfaf4", tie: "#262840" },
  motorist: { flatCap: "#6a5a44", goggles: true },
  motorist2: { flatCap: "#3e3a34", goggles: true, moustache: "#2a2420" },
  lady: { veilHat: "#3a2a3a", veil: "#efe4ee" },
  carmaker: { moustache: "#5a3a24", collar: "#fbfaf4", tie: "#3a2a22" },
  soldier: { helmet: "#5e6248", gasMask: "#8a8460" },
  soldier2: { helmet: "#5a5e44", gasMask: "#7e7856" },
};
const fg = (cast: PuppetPlacement[], extra?: React.ReactNode, looks: Record<string, Costume> = COSTUMES) => (
  <>
    <Costumes cast={cast} looks={looks} />
    {extra}
  </>
);
const ASPECT = 9 / 16;
const T = { s2: 135, s3: 404, s4: 576, s5: 643, s6: 744, s7: 906, s8: 1012, s9: 1206, s10: 1340, s11: 1504 } as const;
const LAB_WEB = flaskWeb(7, 0.1);

// ---------- 2. Paris, 1903: his lab; he comes with a broom, raises it, and stops: the flask is still a flask ----------

const B_FROM: [number, number] = [-0.42, -1.2];
const B_AT2: [number, number] = [-0.3, -0.3];
const FLOOR_FLASK: Vec3 = [0.12, 0, 0.0];
const RAISE = 165;
const STOP = 198;
const DROP = 204;
const PICK = 216;
const LIFT = 232;
const KEYS2: Key[] = [
  { at: 0, position: [-0.3, 1.4, 3.1], target: [-0.28, 1.1, -1.0], fov: 40, k: 1.0 },
  { at: 105, position: [-0.45, 1.25, 3.2], target: [-0.35, 0.85, -0.3], fov: 40, k: 1.0 },
  { at: STOP, position: [-0.1, 1.08, 2.85], target: [-0.06, 0.62, -0.15], fov: 40, k: 1.0 },
  { at: 268, position: [-0.15, 1.12, 2.55], target: [-0.15, 0.82, -0.2], fov: 40, k: 1.0 },
];
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..268 (video 135..403)
  const camera = path(KEYS2, f);
  const w = stroll(f, 40, 70, B_FROM, B_AT2);
  const crouch = 0.55 * ease(f, DROP, PICK) * (1 - ease(f, LIFT, LIFT + 16));
  // the broom: carried at his side, raised ready to sweep, then let go and falling flat
  // he holds it at his side; on "splinters" he grips it tighter and lifts it a little, ready to sweep
  const armR: [number, number] = [mix(150, 175, ease(f, RAISE, RAISE + 12)), mix(-430, -470, ease(f, RAISE, RAISE + 12))];
  const gripLive = handWorld(f < 110 ? w.at : B_AT2, armR, camera);
  const gripAt = f < DROP ? gripLive : handWorld(B_AT2, [175, -470], path(KEYS2, DROP));
  const up = ease(f, RAISE, RAISE + 12);
  const headLive: Vec3 = [gripLive[0] + mix(0.14, 0.22, up), mix(0.16, 0.22, up), gripLive[2] + 0.1];
  const fall = ease(f, DROP, DROP + 9);
  const fallFrac = fall * fall;
  const restGrip: Vec3 = [gripAt[0] - 0.05, 0.03, gripAt[2] + 0.35];
  const restHead: Vec3 = [gripAt[0] + 0.62, 0.05, gripAt[2] + 0.42];
  const grip: Vec3 = f < DROP ? gripLive : lerp3(gripAt, restGrip, fallFrac);
  const head: Vec3 = f < DROP ? headLive : lerp3([gripAt[0] + 0.22, 0.22, gripAt[2] + 0.1], restHead, fallFrac);
  // the flask: on the floor, picked up by the neck and lifted to his eyes
  const lifted: Vec3 = [-0.12, mix(0.18, 0.84, ease(f, LIFT, LIFT + 18)), FLOOR_FLASK[2] - 0.05];
  const flaskPos: Vec3 = f < LIFT ? FLOOR_FLASK : lerp3(FLOOR_FLASK, [lifted[0], lifted[1] - 0.12, lifted[2]], ease(f, LIFT, LIFT + 18));
  const neck: Vec3 = add(flaskPos, [0, 0.19, 0]);
  const reachF = solveReach(B_AT2, add(neck, [0, crouch * 150 * (1.3 / 1060), 0]), camera, [150, -300]);
  const reaching = ease(f, DROP + 4, PICK);
  const cast: PuppetPlacement[] = [
    {
      id: "benedictus",
      look: BENEDICTUS,
      at: f < 110 ? w.at : B_AT2,
      pose: {
        ...(f < 110 ? w.pose : {}),
        view: "front",
        ...faceChange([[0, "determined"], [RAISE - 10, "skeptical"], [STOP, "shocked"], [LIFT + 6, "thinking"], [252, "excited"]], f),
        crouch,
        reachR: f < DROP ? armR : [mix(150, reachF[0], reaching), mix(-480, reachF[1], reaching)],
        handR: f < DROP || reaching > 0.5 ? "fist" : "open",
        frontR: true,
        reachL: [-140, -480],
        handL: "open",
        lookX: f < STOP ? 0.3 : 0.15,
        headTilt: f > STOP && f < LIFT ? -10 : 0,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor={LAB_FLOOR} wall={LAB_WALL} wallPattern="plaster" floorPattern="tile" width={5} depth={3} sun={{ x: 0.9, color: "#fff4dc" }}>
          <WallDate position={[0.36, 1.3, -1.43]} text={"PARIS\n1903"} width={0.36} appear={f - 4} head="#2a4a6a" />
          <Easel position={[-0.95, 0, -0.95]} rotationY={0.35} />
          <WorkTable position={[1.0, 0, -0.95]} size={[1.3, 0.8, 0.6]} />
          <BottleShelf position={[0.9, 1.45, -1.38]} width={1.0} />
          <LabWindow position={[1.9, 1.5, -1.43]} size={[0.7, 1.3]} sky="#e8f0f4" curtain="#c8d0b8" glow={1.1} />
          <Flask position={flaskPos} rotation={[0, 0.1, 0]} scale={1.0} web={LAB_WEB} crack={0.21} />
          <Broom grip={grip} head={head} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#f8f4ec", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [0.6, 0.5, 0.6] as Vec3, color: "#fff8ec", strength: 0.8 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 3. Inside: the collodion dried into a clear film that held every shard ----------

const S3_WEB = flaskWebInner(11, Math.PI + 0.1);
const COAT = 120;
const S3_CRACK = 136;
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..171 (video 404..575)
  const camera = path(
    [
      { at: 0, position: [0.12, 1.18, 1.3], target: [0.0, 0.99, 0.0], fov: 40, k: 1.0 },
      { at: 45, position: [0.08, 1.1, 1.15], target: [0.0, 0.98, 0.0], fov: 40, k: 1.0 },
      { at: COAT, position: [-0.04, 1.1, 1.04], target: [0.0, 0.99, 0.0], fov: 40, k: 1.0 },
      { at: 171, position: [-0.06, 1.08, 0.96], target: [0.0, 0.99, 0.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  const liquid = 0.65 * (1 - ease(f, 20, 110));
  const film = ease(f, 60, COAT);
  const crack = f < S3_CRACK ? 0 : 0.2 * ease(f, S3_CRACK, S3_CRACK + 14);
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#2e3a3a" wall="#3e5e5c" wallPattern="plaster" floorPattern="wood" width={4} depth={2.4}>
          <WorkTable position={[0, 0, -0.05]} size={[1.4, 0.8, 0.7]} />
          <Flask position={[0, 0.804, 0]} scale={1.8} cutaway liquid={liquid} film={film} web={S3_WEB} crack={crack} />
          {/* the solvent going off as vapour out of the neck */}
          {liquid > 0.02 &&
            [0, 1, 2, 3].map((i) => {
              const t = ((f + i * 12) % 48) / 48;
              return (
                <mesh key={i} position={[0.02 * Math.sin(i * 2 + f * 0.1), 0.8 + 0.43 + t * 0.14, 0]} scale={(0.012 + t * 0.02) * (liquid / 0.65 + 0.3)}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#fff6e8" transparent opacity={0.6 * (1 - t)} depthWrite={false} />
                </mesh>
              );
            })}
          <GreenLamp position={[-0.45, 0.8, -0.25]} />
          <CollodionJar position={[0.38, 0.8, -0.2]} />
          {f < COAT - 8 && <Label text="COLLODION" position={[0, 1.1, 0.05]} width={0.2} bg="#fff0d0" appear={f - 40} />}
          {f >= COAT - 8 && <Label text="CLEAR FILM" position={[0, 1.1, 0.05]} width={0.2} bg="#fff0d0" appear={f - COAT + 8} />}
          <pointLight position={[-0.3, 1.25, 0.5]} color="#ffe0a8" intensity={0.4} distance={2.5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={1.4}
      puppets={[]}
      energy={0.4}
    />
  );
};

// ---------- 4. Dusk: he sets it aside among the bottles and forgets it ----------

const B_AT4: [number, number] = [-0.22, -0.32];
const SET = 18;
const CUP = { x: 0.36, z: -0.95, h: 0.86 };
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..66 (video 576..642)
  const camera = path(
    [
      { at: 0, position: [0.04, 1.2, 3.9], target: [0.06, 0.75, -0.6], fov: 40, k: 1.0 },
      { at: 66, position: [0.0, 1.15, 3.55], target: [0.0, 0.75, -0.7], fov: 40, k: 1.0 },
    ],
    f,
  );
  const placeAt: Vec3 = [CUP.x - 0.2, CUP.h + 0.035, CUP.z + 0.1];
  const start: Vec3 = [0.05, 0.74, -0.25];
  const flaskPos: Vec3 = f < SET ? lerp3(start, placeAt, ease(f, 0, SET)) : placeAt;
  const reachR = solveReach(B_AT4, add(flaskPos, [0, 0.18, 0]), camera, [180, -500]);
  const w = stroll(f, 28, 40, B_AT4, [-0.45, -0.72]);
  const cast: PuppetPlacement[] = [
    {
      id: "benedictus",
      look: BENEDICTUS,
      at: f < 28 ? B_AT4 : w.at,
      pose: f < 28 ? { view: "front", ...faceChange([[0, "thinking"], [SET, "bored"]], f), reachR: f < SET + 4 ? reachR : [150, -480], handR: f < SET ? "fist" : "open", frontR: f < SET, lookX: 0.6 } : { ...faceChange([[0, "bored"]], f), ...w.pose, view: "back" },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#5a4048" wall="#8a7090" wallPattern="plaster" floorPattern="tile" width={5} depth={3}>
          <LowCupboard position={[CUP.x, 0, CUP.z]} width={1.0} h={CUP.h} />
          <BottleShelf position={[0.4, 1.45, -1.38]} width={1.0} />
          <Easel position={[-1.2, 0, -1.0]} rotationY={0.3} />
          <LabWindow position={[1.7, 1.5, -1.43]} size={[0.7, 1.3]} sky="#f0a888" curtain="#7a6080" glow={0.9} />
          <Flask position={flaskPos} rotation={[0, 0.1, 0]} scale={1.0} web={LAB_WEB} crack={0.21} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#f0d0e0", tintAmount: 0.08, shadow: 0.25, distant: [{ direction: [0.7, 0.3, 0.5] as Vec3, color: "#ffc0a0", strength: 0.7 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 5. Paris fills with motor cars; they bump; a windscreen flies to pieces; a hat flies ----------

const LANE_Z = -0.6;
const B_X = 1.15; // the stalled car
const BUMP = 72;
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..100 (video 643..743)
  // the red car (motorist2 driving, the lady beside him) comes toward the camera on a diagonal and runs into a gas lamp
  const HH = Math.PI / 2 - 0.45;
  const dir: [number, number] = [Math.sin(HH), Math.cos(HH)];
  const cEnd: [number, number] = [-0.1, -0.45];
  const s5 = f < BUMP ? -(BUMP - f) * 0.032 : -0.1 * ease(f, BUMP, BUMP + 8);
  const c: [number, number] = [cEnd[0] + dir[0] * s5, cEnd[1] + dir[1] * s5];
  const jolt = f >= BUMP ? Math.max(0, Math.sin(Math.min(1, (f - BUMP) / 10) * Math.PI)) : 0;
  const track = 1 - ease(f, BUMP - 34, BUMP + 4);
  const perp: [number, number] = [dir[1], -dir[0]]; // the car's left
  const tgt: Vec3 = [cEnd[0] + dir[0] * (0.7 + s5 * track), 0.92, cEnd[1] + dir[1] * (0.7 + s5 * track)];
  const cd0: [number, number] = [dir[0] - perp[0] * 0.75, dir[1] - perp[1] * 0.75];
  const cl = Math.hypot(cd0[0], cd0[1]);
  const back = 4.7 - 0.3 * ease(f, 0, 100);
  const camera: CameraShot = { position: [tgt[0] + (cd0[0] / cl) * back, 1.8, tgt[2] + (cd0[1] / cl) * back], target: tgt, fov: 40 };
  const post: Vec3 = [cEnd[0] + dir[0] * 1.3 - perp[0] * 0.42, 0, cEnd[1] + dir[1] * 1.3 - perp[1] * 0.42];
  const lean = f < BUMP ? 0 : 0.3 * ease(f, BUMP, BUMP + 5) - 0.05 * Math.sin(Math.max(0, f - BUMP - 5) * 0.5) * Math.exp(-Math.max(0, f - BUMP - 5) / 8);
  // a green car going the other way behind, in the far lane
  const cX = 2.6 - f * 0.05;
  const drvA = carSeat(c, HH, [-0.26, CAR.front[1]]);
  const hop = f >= BUMP ? Math.max(0, Math.sin(Math.min(1, (f - BUMP) / 18) * Math.PI)) * 0.34 : 0;
  const looks = { ...COSTUMES, motorist2: { ...COSTUMES.motorist2, hatOff: hop } };
  const cast: PuppetPlacement[] = [
    { id: "motorist2", look: MOTORIST2, at: drvA.at, pose: { sit: true, air: drvA.air + jolt * 30, view: "front", ...faceChange([[0, "happy"], [BUMP - 8, "shocked"], [BUMP + 12, "awkward"]], f), reachL: [-60, -520], reachR: [60, -520], lean: 8 * jolt, lookX: 0.5 } },
  ];
  const screen: Vec3 = [c[0] + dir[0] * 0.5, 0.98, c[1] + dir[1] * 0.5];
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#8a8070" wall="#a8c4dc" wallPattern="plain" floorPattern="concrete" width={16} depth={8}>
          <ParisStreet>
            <group position={[c[0], f >= BUMP ? -0.03 * jolt : 0, c[1]]} rotation={[0, HH, 0]}>
              <Automobile position={[0, 0, 0]} heading={0} roll={s5} color="#9a2a2a" />
              <CarScreen gone={f >= BUMP + 1} />
            </group>
            <group position={post} rotation={[lean * dir[1], 0, -lean * dir[0]]}>
              <GasLamp position={[0, 0, 0]} />
            </group>
            <Automobile position={[cX, 0, -1.75]} heading={-Math.PI / 2} roll={-cX} color="#2a5a3a" />
            <Shards origin={screen} frame={f - BUMP} count={24} seed={4} speed={1.7} size={0.1} dir={[dir[0], 0.6, dir[1] + 0.3]} spread={0.6} />
          </ParisStreet>
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#f4f8ff", tintAmount: 0.05, shadow: 0.2, distant: [{ direction: [-0.4, 0.7, 0.6] as Vec3, color: "#fff8ec", strength: 0.9 }] }}
      foreground={fg(cast, null, looks)}
    />
  );
};

// ---------- 6. At night he reads of a crash and flying glass; he jumps up: the flask! ----------

const B_AT6: [number, number] = [-0.05, -0.28];
const JUMP = 106;
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..161 (video 744..905)
  const camera = path(
    [
      { at: 0, position: [0.12, 1.0, 2.5], target: [0.0, 0.72, -0.3], fov: 40, k: 1.0 },
      { at: JUMP, position: [0.06, 0.98, 2.15], target: [0.0, 0.76, -0.3], fov: 40, k: 1.0 },
      { at: 161, position: [0.05, 1.08, 2.25], target: [0.0, 0.88, -0.3], fov: 40, k: 1.0 },
    ],
    f,
  );
  const sitting = f < JUMP; // reading (standing at the lamp)
  // flung up and away over his shoulder, then fluttering down behind the table
  const fl = ease(f, JUMP, JUMP + 22);
  const paperC: Vec3 = sitting ? [B_AT6[0], 0.6, B_AT6[1] + 0.2] : [B_AT6[0] + 0.32 * fl, mix(0.6, 0.03, fl) + 0.35 * Math.sin(fl * Math.PI), B_AT6[1] + 0.2 + 0.15 * fl];
  const paperRot: Vec3 = sitting ? [-0.2, 0, 0] : [-0.2 - 1.35 * fl, 0.2 * fl, 0.5 * fl];
  const reachL = solveReach(B_AT6, add(paperC, [-0.22, 0.02, 0]), camera, [-200, -420]);
  const reachR = solveReach(B_AT6, add(paperC, [0.22, 0.02, 0]), camera, [200, -420]);
  const shake = f > 60 && f < JUMP ? Math.sin(f * 1.7) * 0.004 : 0;
  const cast: PuppetPlacement[] = [
    {
      id: "benedictus",
      look: BENEDICTUS,
      at: B_AT6,
      pose: sitting
        ? { view: "front", ...faceChange([[0, "thinking"], [55, "worried"], [92, "shocked"]], f), reachL, reachR, handL: "fist", handR: "fist", frontL: true, frontR: true, lookX: Math.sin(f * 0.09) * 0.4 - 0.1, headTilt: -6 }
        : { view: "front", ...moveChange([[JUMP, "shocked"], [JUMP + 8, "excited", "point"]], f), air: 120 * Math.max(0, Math.sin(Math.min(1, (f - JUMP) / 12) * Math.PI)), lookX: 0.2 },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="night" floor="#2a2438" wall="#2e3a5e" wallPattern="wallpaper" floorPattern="wood" width={5} depth={3}>
          {/* a small writing table with the green lamp */}
          <InkBox size={[0.6, 0.04, 0.45]} position={[0.62, 0.6, -0.55]} color={OAK6} ink={0.006} />
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.035, 0.58, 0.035]} position={[0.62 + sx * 0.26, 0.29, -0.55 + sz * 0.18]} color={OAK6} ink={0.004} />))}
          <GreenLamp position={[0.6, 0.62, -0.62]} />
          <LabWindow position={[-1.0, 1.45, -1.43]} size={[0.6, 1.1]} sky="#141a34" curtain="#3a3a5a" glow={0.5} />
          <group position={[paperC[0] + shake, paperC[1], paperC[2]]} rotation={paperRot}>
            <News position={[0, 0, 0]} size={[0.5, 0.35]} />
          </group>
          <pointLight position={[0.45, 0.95, -0.3]} color="#ffd890" intensity={1.4} distance={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#c8d0f0", tintAmount: 0.1, shadow: 0.35, points: [{ position: [0.55, 0.95, -0.4] as Vec3, color: "#ffd890", strength: 1.6, range: 2.2 }] }}
      foreground={fg(cast)}
    />
  );
};
const OAK6 = "#4a3020";

// ---------- 7. He works all night: collodion brushed on a sheet of glass, a second sheet on top; the clock spins ----------

const B_AT7: [number, number] = [0.05, -0.74];
const BENCH7 = 0.62;
const SHEET: Vec3 = [0.05, BENCH7 + 0.008, -0.42];
const LAY = [62, 84];
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..105 (video 906..1011)
  const camera = path(
    [
      { at: 0, position: [0.0, 1.6, 2.3], target: [0.05, 1.05, -0.6], fov: 40, k: 1.0 },
      { at: 105, position: [0.02, 1.2, 1.6], target: [0.05, 0.8, -0.45], fov: 40, k: 1.0 },
    ],
    f,
  );
  // brush strokes over the sheet, each a little different in length and speed
  const strokes = [
    [4, 20, -0.18, 0.16],
    [22, 36, 0.15, -0.12],
    [38, 54, -0.12, 0.2],
  ];
  let bx = 0.2;
  for (const [a, b, x0, x1] of strokes) if (f >= a) bx = mix(x0, x1, ease(f, a, b));
  const coat = ease(f, 4, 54);
  const brushTip: Vec3 = [SHEET[0] + bx, SHEET[1] + 0.006 + (f > 54 ? 0.08 * ease(f, 54, 60) : 0), SHEET[2] + 0.02 * Math.sin(f * 0.3)];
  const top = ease(f, LAY[0], LAY[1]);
  const sheet2: Vec3 = [SHEET[0], mix(0.86, SHEET[1] + 0.014, top), SHEET[2]];
  const holding = f >= LAY[0] - 10 && f < LAY[1] + 6;
  const reachR = holding ? solveReach(B_AT7, add(sheet2, [0.31, 0.0, 0]), camera, [220, -480]) : solveReach(B_AT7, add(brushTip, [0.06, 0.16, 0]), camera, [200, -480]);
  const reachL = holding ? solveReach(B_AT7, add(sheet2, [-0.31, 0.0, 0]), camera, [-220, -480]) : ([-150, -480] as [number, number]);
  const minutes = 21 * 60 + 9 * 60 * ease(f, 0, 100);
  const cast: PuppetPlacement[] = [
    {
      id: "benedictus",
      look: BENEDICTUS,
      at: B_AT7,
      pose: { view: "front", ...faceChange([[0, "determined"], [56, "thinking"], [LAY[1] + 4, "happy"]], f), reachR, reachL, handR: "fist", handL: holding ? "fist" : "open", frontR: true, frontL: holding, lookX: 0.1, headTilt: -8, lean: 4 },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="night" floor="#2a1e16" wall="#5a3e2a" wallPattern="plaster" floorPattern="tile" width={5} depth={3}>
          <WorkTable position={[0.05, 0, -0.32]} size={[1.3, BENCH7, 0.56]} />
          <Pane size={[0.5, 0.4]} position={SHEET} rotation={[-Math.PI / 2, 0, 0]} thick={0.01} />
          {/* the coat of collodion going on */}
          <mesh position={[SHEET[0] - 0.25 + 0.25 * coat, SHEET[1] + 0.0065, SHEET[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5 * coat + 0.001, 0.38]} />
            <meshBasicMaterial color="#e8b860" transparent opacity={0.55} depthWrite={false} />
          </mesh>
          {f >= LAY[0] - 10 && <Pane size={[0.5, 0.4]} position={sheet2} rotation={[-Math.PI / 2, 0, 0]} thick={0.01} />}
          {!holding && <Brush tip={brushTip} tilt={-0.35} />}
          <CollodionJar position={[-0.42, BENCH7, -0.4]} />
          <GreenLamp position={[0.5, BENCH7, -0.45]} />
          <WallClock position={[0.7, 1.55, -1.44]} minutes={minutes} size={0.2} />
          <LabWindow position={[-0.85, 1.5, -1.43]} size={[0.6, 1.1]} sky={f > 80 ? "#7a9ad0" : "#1a1a3a"} curtain="#6a4a30" glow={0.5 + 0.5 * ease(f, 80, 104)} />
          <pointLight position={[0.45, 1.0, -0.1]} color="#ffd890" intensity={1.3} distance={2.6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#f0d8b8", tintAmount: 0.1, shadow: 0.35, points: [{ position: [0.5, 1.0, -0.1] as Vec3, color: "#ffd890", strength: 1.6, range: 2.2 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 8. You see: glass, plastic, glass; it breaks, the shards stick to the plastic ----------

const S8_WEB = sandwichWeb(9);
const HAMMER = 141;
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..193 (video 1012..1205)
  const camera = path(
    [
      { at: 0, position: [-0.1, 1.35, 2.95], target: [-0.05, 0.78, 0.0], fov: 40, k: 1.0 },
      { at: 116, position: [0.05, 1.15, 2.2], target: [0.0, 0.8, 0.0], fov: 40, k: 1.0 },
      { at: HAMMER, position: [0.15, 1.85, 2.2], target: [0.0, 0.85, 0.0], fov: 40, k: 1.0 },
      { at: 193, position: [0.1, 1.35, 2.4], target: [0.0, 1.0, 0.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  const drop: [number, number, number] = [0.68 + 0.32 * ease(f, 0, 56), ease(f, 78, 92), ease(f, 102, 116)];
  const swing = f < HAMMER - 6 ? -0.7 : f < HAMMER ? mix(-0.7, 0.366, ease(f, HAMMER - 6, HAMMER) ** 2) : 0.366 - 0.75 * Math.sin(Math.min(1, (f - HAMMER) / 18) * Math.PI * 0.5) * Math.exp(-Math.max(0, f - HAMMER - 18) / 20);
  const crack = f < HAMMER ? 0 : 0.62 * ease(f, HAMMER, HAMMER + 16);
  const tilt = ease(f, 160, 186);
  const { g, p, base } = SANDWICH;
  const lblZ = SANDWICH.d / 2 + 0.03;
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#1c2648" wall="#34448a" wallPattern="plain" floorPattern="concrete" width={6} depth={4}>
          <Sandwich position={[0, 0, 0]} drop={drop} tilt={tilt} web={S8_WEB} crack={crack} />
          {/* the flask that started it, giant and cracked, behind */}
          <Flask position={[-0.55, 0, -1.4]} scale={4.6} web={LAB_WEB} crack={0.21} />
          {f >= HAMMER - 20 && <Mallet pivot={[0.85, 1.6, 0.0]} angle={swing} len={0.95} />}
          {f < HAMMER - 2 && <Label text="GLASS" position={[-0.2, base + g / 2, lblZ]} width={0.26} bg="#d8f0f4" appear={f - 58} />}
          {f < 158 && <Label text="PLASTIC" position={[0.2, base + g + p / 2, lblZ + 0.01]} width={0.26} bg="#ffe0b0" appear={f - 92} />}
          {f < HAMMER - 2 && <Label text="GLASS" position={[-0.2, base + g + p + g / 2, lblZ + 0.02]} width={0.26} bg="#d8f0f4" appear={f - 116} />}
          <ImpactRing position={[-0.05, base + 2 * g + p + 0.01, 0.0]} frame={f - HAMMER} size={0.5} />
          <pointLight position={[0, 2.2, 1.4]} color="#c8d8ff" intensity={2.4} distance={6} />
          <pointLight position={[-1.2, 1.2, 1.0]} color="#a8c0ff" intensity={1.2} distance={4} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.2}
      puppets={[]}
    />
  );
};

// ---------- 9. 1909: the patent; the car maker is not interested; the car backfires ----------

const B_AT9: [number, number] = [-0.42, 0.05];
const M_AT9: [number, number] = [0.38, -0.05];
const NO = 81;
const BANG = 112;
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..133 (video 1206..1339)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.3, 3.1], target: [0.0, 0.92, -0.4], fov: 40, k: 1.0 },
      { at: 133, position: [-0.05, 1.18, 2.6], target: [-0.02, 0.92, -0.35], fov: 40, k: 1.0 },
    ],
    f,
  );
  const offer = ease(f, 6, 22) * (1 - 0.5 * ease(f, NO + 10, NO + 24));
  const paper: Vec3 = [mix(-0.25, -0.05, offer), mix(0.62, 0.78, offer), 0.18];
  const reachR = solveReach(B_AT9, add(paper, [-0.08, -0.1, 0]), camera, [200, -480]);
  const wave = f > NO && f < NO + 30 ? Math.sin((f - NO) * 0.7) : 0;
  const cast: PuppetPlacement[] = [
    { id: "benedictus", look: BENEDICTUS, at: B_AT9, pose: { view: "front", ...faceChange([[0, "happy"], [28, "excited"], [NO + 6, "sad"], [BANG, "sad"]], f), reachR, handR: "fist", frontR: true, lookX: 0.6 } },
    {
      id: "carmaker",
      look: CARMAKER,
      at: M_AT9,
      pose: {
        view: "front",
        ...moveChange([[0, "skeptical", "armsCrossed"], [NO, "bored"], [BANG, "smug", "handsOnHips"]], f),
        ...(f > NO && f < NO + 30 ? { reachL: [-200 + 60 * wave, -640] as [number, number], handL: "open" as const, frontL: true } : {}),
        headTilt: f > NO && f < NO + 30 ? 8 * Math.sin((f - NO) * 0.5) : 0,
        lookX: -0.6,
      },
    },
  ];
  // the car stands angled behind them; the exhaust is at its rear left
  const carAt: Vec3 = [1.35, 0, -1.75];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#6a7270" wall="#6f8f8c" wallPattern="brick" floorPattern="concrete" width={6} depth={4.4}>
          <Automobile position={carAt} heading={-0.6} roll={0} color="#7a2a2a" />
          <WallDate position={[-0.95, 1.55, -2.13]} text="1909" width={0.34} appear={f - 30} head="#3a4a4a" />
          {/* a tool board and a tyre on the wall */}
          <InkBox size={[0.8, 0.5, 0.03]} position={[-0.25, 1.5, -2.13]} color="#8a6a4a" ink={0.006} />
          {[-0.5, -0.3, -0.1, 0.05].map((x, i) => (
            <InkBox key={x} size={[0.03, 0.22 + 0.06 * (i % 2), 0.02]} position={[x, 1.5, -2.1]} color="#4a4a52" ink={0.003} />
          ))}
          <mesh position={[0.6, 1.4, -2.1]}>
            <torusGeometry args={[0.28, 0.08, 10, 28]} />
            <meshToonMaterial color="#1e1e22" />
          </mesh>
          <Patent position={paper} rotation={[0, 0, 0.1 - 0.2 * offer]} appear={f - 26} />
          
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#e8f0f0", tintAmount: 0.06, shadow: 0.2, distant: [{ direction: [-0.5, 0.6, 0.6] as Vec3, color: "#f4f8f4", strength: 0.8 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 10. The First World War: gas-mask eyepieces ----------

const S_AT10: [number, number] = [0.02, 0.05];
const S2_AT10: [number, number] = [-0.75, -0.5];
const EYES = 105;
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..164 (video 1340..1504)
  const camera = path(
    [
      { at: 0, position: [0.55, 1.35, 3.0], target: [-0.15, 0.95, -0.4], fov: 40, k: 1.0 },
      { at: EYES, position: [0.12, 1.1, 1.55], target: [0.02, 0.98, 0.0], fov: 40, k: 1.0 },
      { at: 164, position: [0.08, 1.08, 1.4], target: [0.02, 0.98, 0.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "soldier", look: SOLDIER, at: S_AT10, pose: { view: "front", ...faceChange([[0, "determined"]], f), reachL: [-120, -500], reachR: [130, -480], lookX: -0.3 + 0.2 * Math.sin(f * 0.05), headTilt: 4 * Math.sin(f * 0.04) } },
    { id: "soldier2", look: SOLDIER2, at: S2_AT10, pose: { view: "side", facing: -1, ...faceChange([[0, "worried"]], f), reachR: [120, -700], lookX: -0.5 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#4a4632" wall="#9ea48c" wallPattern="plain" floorPattern="concrete" width={6} depth={5}>
          <SandbagWall x0={-2.6} x1={2.6} z={-0.75} rows={6} seed={2} />
          <BarbedWire x0={-2.4} x1={2.4} y={1.08} z={-1.0} />
          <Duckboard position={[0, 0, 0.2]} length={3.2} />
          <GasCloud frame={f + T.s10} x0={-2.8} x1={2.8} y={1.45} z={-1.6} count={18} />
          {f >= EYES - 4 && <Label text="EYEPIECES" position={[0.02, 1.36, 0.08]} width={0.28} bg="#e8f4f4" appear={f - EYES} />}
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#e8e4c0", tintAmount: 0.1, shadow: 0.3, distant: [{ direction: [-0.5, 0.6, 0.6] as Vec3, color: "#f0ecc8", strength: 0.7 }] }}
      foreground={fg(cast)}
    />
  );
};
void Label;

// ---------- 11. Today: car windscreens; a stone hits; it cracks like that flask, and holds ----------

const S11_WEB = paneWeb(13, [0.3, 0.02], [0.63, 0.38], [0.22, 0.4], [0.05, 0.1, 0.17, 0.25]);
const D_AT: [number, number] = [-0.3, -0.12];
const HIT11 = 130;
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..218 (video 1504..1722)
  const camera = path(
    [
      { at: 0, position: [2.7, 1.05, 1.9], target: [0.0, 0.85, 0.0], fov: 40, k: 1.0 },
      { at: 100, position: [0.9, 1.2, 3.6], target: [0.05, 0.95, 0.2], fov: 40, k: 1.0 },
      { at: HIT11, position: [0.4, 1.22, 2.7], target: [0.05, 1.0, 0.25], fov: 40, k: 1.0 },
      { at: 226, position: [0.05, 1.22, 2.45], target: [-0.06, 1.0, 0.2], fov: 40, k: 1.0 },
    ],
    f,
  );
  const scroll = f * 0.22;
  const impact = screenPoint(0.3, 0.02, 0.006);
  const stoneT = ease(f, HIT11 - 12, HIT11);
  const stone: Vec3 = f < HIT11 ? [mix(0.5, impact[0], stoneT), mix(0.4, impact[1], stoneT) + 0.15 * Math.sin(stoneT * Math.PI), mix(5, impact[2], stoneT)] : [impact[0] + 0.3 * ease(f, HIT11, HIT11 + 10), impact[1] + 0.25 * Math.sin(Math.min(1, (f - HIT11) / 10) * Math.PI), impact[2] + 0.3 * ease(f, HIT11, HIT11 + 10)];
  const crack = f < HIT11 ? 0 : 0.36 * ease(f, HIT11, HIT11 + 18);
  const seat = (CAR_SEAT_Y - 0.34) / (1.3 / 1060);
  const wheelL: Vec3 = [-0.44, 0.7, 0.3];
  const wheelR: Vec3 = [-0.2, 0.7, 0.3];
  const flinch = f >= HIT11 && f < HIT11 + 24;
  const reachL = solveReach(D_AT, wheelL, camera, [-120, -500]);
  const reachR = solveReach(D_AT, wheelR, camera, [120, -500]);
  const cast: PuppetPlacement[] = [
    {
      id: "driver",
      look: DRIVER,
      at: D_AT,
      pose: { sit: true, air: seat, view: "front", ...faceChange([[0, "happy"], [HIT11, "shocked"], [HIT11 + 26, "worried"], [186, "neutral"]], f), reachL: flinch ? [-120, -760] : reachL, reachR: flinch ? [120, -760] : reachR, handL: flinch ? "open" : "fist", handR: flinch ? "open" : "fist", frontL: true, frontR: true, lean: flinch ? -6 : 0, lookX: 0.2 },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#7a9a5a" wall="#9cc8ec" wallPattern="plain" floorPattern="plain" width={12} depth={14}>
          <RoadToday scroll={scroll} />
          <ModernCar position={[0, 0, 0]} color="#c0443a" web={S11_WEB} crack={crack} bounce={0.008 * Math.sin(f * 0.9)} />
          {f < HIT11 + 12 && <Stone position={stone} />}
          <group position={impact} rotation={[-0.94, 0, 0]}>
            <ImpactRing position={[0, 0, 0.004]} frame={f - HIT11} size={0.22} normal="front" />
          </group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#f4f8ff", tintAmount: 0.05, shadow: 0.2, distant: [{ direction: [0.5, 0.7, 0.5] as Vec3, color: "#fffaf0", strength: 0.9 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 135, S1, false],
  [135, 404, S2, "dip"],
  [404, 576, S3, "dip"],
  [576, 643, S4, "dissolve"],
  [643, 744, S5, "dip"],
  [744, 906, S6, "dip"],
  [906, 1012, S7, "dip"],
  [1012, 1206, S8, "dip"],
  [1206, 1340, S9, "dip"],
  [1340, 1504, S10, "dip"],
  [1504, TIMING.totalFrames, S11, "dip"],
];

const SFX: Sfx[] = [
  // the hook: the fall and the crack
  { at: 0, src: sfx("whoosh"), volume: 0.25 },
  { at: HIT - 1, src: sfx("glasscrack"), volume: 1.4, space: "room", hit: 0.35 },
  // the lab: his steps, the broom falling, the flask lifted
  { at: T.s2 + DROP + 9, src: sfx("clatter"), volume: 0.9, space: "room" },
  { at: T.s2 + 4, src: sfx("pop"), volume: 0.75 },
  { at: T.s2 + PICK + 2, src: sfx("clink"), volume: 0.35, space: "room" },
  // inside: the labels, the crack behind the film
  { at: T.s3 + 40, src: sfx("pop"), volume: 0.75 },
  { at: T.s3 + COAT - 8, src: sfx("pop"), volume: 0.75 },
  { at: T.s3 + S3_CRACK, src: sfx("glasscrack"), volume: 1.3, space: "room" },
  // set aside
  { at: T.s4 + SET, src: sfx("clink"), volume: 0.22, space: "room" },
  // the street
  { at: T.s5, src: sfx("engine"), volume: 0.16, until: T.s6 },
  { at: T.s5 + 30, src: sfx("honk"), volume: 0.35, space: "outdoor" },
  { at: T.s5 + BUMP, src: sfx("clang"), volume: 0.7, space: "outdoor", hit: 0.4 },
  { at: T.s5 + BUMP + 1, src: sfx("shatter"), volume: 1.0, space: "outdoor" },
  // night: paper, the stool
  { at: T.s6 + 4, src: sfx("paper"), volume: 0.35, space: "room" },
  { at: T.s6 + JUMP + 2, src: sfx("paper"), volume: 0.55, space: "room" },
  { at: T.s6 + JUMP + 1, src: sfx("whoosh"), volume: 0.2 },
  // all night: the clock
  { at: T.s7 + LAY[1], src: sfx("clink"), volume: 0.18, space: "room" },
  { at: T.s7 + 75, src: sfx("riser"), volume: 0.05, until: T.s8 },
  // the pivot
  { at: T.s8 + 6, src: sfx("sting"), volume: 0.3 },
  { at: T.s8 + 58, src: sfx("pop"), volume: 0.75 },
  { at: T.s8 + 92, src: sfx("pop"), volume: 0.75 },
  { at: T.s8 + 116, src: sfx("pop"), volume: 0.75 },
  { at: T.s8 + HAMMER, src: sfx("stamp"), volume: 0.45, space: "hall" },
  { at: T.s8 + HAMMER, src: sfx("glasscrack"), volume: 1.1, space: "hall" },
  // 1909
  { at: T.s9 + 30, src: sfx("pop"), volume: 0.75 },
  { at: T.s9 + 26, src: sfx("paper"), volume: 0.35, space: "room" },
  // the trench
  { at: T.s10, src: sfx("wind"), volume: 0.14, until: T.s11 },
  // today
  { at: T.s11, src: sfx("engine"), volume: 0.1, until: T.s11 + HIT11 - 4 },
  { at: T.s11 + HIT11, src: sfx("ping"), volume: 0.45, space: "outdoor", hit: 0.25 },
  { at: T.s11 + HIT11 + 1, src: sfx("glasscrack"), volume: 0.4, space: "outdoor" },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: T.s3, volume: 0.22 },
  { src: MUSIC_FILES.mystery, from: T.s3, to: T.s5, volume: 0.24 },
  { src: MUSIC_FILES.upbeat, from: T.s5, to: T.s6, volume: 0.22 },
  { src: MUSIC_FILES.tension, from: T.s6, to: T.s9, volume: 0.24 },
  { src: MUSIC_FILES.lounge, from: T.s9, to: T.s10, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: T.s10, to: T.s11, volume: 0.24 },
  { src: MUSIC_FILES.upbeat, from: T.s11, to: TIMING.totalFrames, volume: 0.22 },
];

void frameSpot;
export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
