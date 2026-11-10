import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  Chair,
  Counter,
  faceChange,
  foleyCues,
  frameSpot,
  handWorld,

  Headline,
  InkBox,
  InkCylinder,
  jawCloses,
  jump,
  Label,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
} from "../../engine";
import { headWorld } from "../../puppet/PuppetBillboard";
import { Calendar } from "../what-if-fleming/props";
import { FilingCabinet } from "../scorpio-sign/props";
import { Scope } from "../what-if-petrov/props";
import {
  Ball,
  BigThermometer,
  BookStack,
  Cabinets,
  CableSpool,
  CandyBar,
  CoffeeTable,
  ColdBurner,
  CounterBoard,
  CountertopOven,
  CutawayBowl,
  DeskLamp,
  EggBurst,
  FirstOven,
  HandStamp,
  HangTag,
  HeightMark,
  Kettle,
  KernelBag,
  Magnetron,
  ModernMicrowave,
  NightWindow,
  OakDesk,
  OpenBook,
  PatentForm,
  PlatformScale,
  PopcornBowl,
  PopcornBurst,
  Pot,
  Settee,
  Stain,
  Steam,
  SteelBench,
  Stick,
  WaterMolecule,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The Melted Candy Bar That Invented the Microwave": Percy Spencer, a self-taught radar engineer, finds a candy bar
// melted in his pocket beside a running magnetron (the story goes); popcorn pops, an egg bursts; microwaves make the
// water in food twist and the rubbing is heat; patent filed 8 October 1945; the first oven of 1947, six feet and 750
// pounds; a 495-dollar countertop model in 1967. Sets: the radar lab in three lights, a night study, a tube factory,
// the truth room, a patent office, a 1947 restaurant kitchen, a 1967 kitchen, a living room today.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "microwave-candy-bar";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ASPECT = 9 / 16;

// Every camera key is pulled back from its target by K (the cut-out heads are big: medium shots need ~3 m).
const K = 1.5;
type Key = { at: number; position: Vec3; target: Vec3; fov?: number; k?: number };
const wide = <T extends { position: Vec3; target: Vec3 }>(c: T, k = K): T => ({
  ...c,
  position: [c.target[0] + (c.position[0] - c.target[0]) * k, c.target[1] + (c.position[1] - c.target[1]) * k, c.target[2] + (c.position[2] - c.target[2]) * k] as Vec3,
});
const path = (keys: Key[], f: number) => beatPath(keys.map(({ k, ...key }) => wide(key, k ?? K)), f);

// The reach (puppet units) that puts a hand at a world point, as seen from the camera: a few Newton steps on handWorld.
const solveReach = (at: [number, number], target: Vec3, camera: CameraShot): [number, number] => {
  let r: [number, number] = [-200, -600];
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

// ---------- cast (1945-1967; the closing child is present day) ----------

const SPENCER: PuppetLook = { skin: "#f0c8a8", hair: "#8a7a68", outfit: "#7a6a56", vest: "#5a4a3a", glasses: true, pants: "#6a5a48", shoes: "#2a1a10" };
const COLLEAGUE: PuppetLook = { skin: "#f4d0b0", hair: "#2a1e16", outfit: "#f4f2ec", suspenders: "#6a4222", pants: "#6a6e76", shoes: "#2a1a10" };
const WORKER: PuppetLook = { skin: "#e8b898", hair: "#6a3a1e", outfit: "#4a6a9a", kerchief: "#c8322a", pants: "#4a6a9a", shoes: "#2a1a10" };
const CLERK: PuppetLook = { skin: "#f0c8a8", hair: "#b8b0a8", outfit: "#3a3e46", vest: "#2a2e36", glasses: true, pants: "#3a3e46", shoes: "#1a1410" };
const COOK: PuppetLook = { skin: "#d8a888", hair: "#2a1e16", outfit: "#f4f2ec", apron: "#ffffff", pants: "#3a3a3a", shoes: "#1a1410" };
const MOM: PuppetLook = { skin: "#f0c8a8", hair: "#7a4a2a", long: true, outfit: "#f4e08a", pants: "#f0c8a8", shoes: "#e8d8c0" };
const SON: PuppetLook = { skin: "#f4d0b0", hair: "#d8b060", outfit: "#d8322a", pants: "#3a5a9a", shoes: "#f4f4f4" };
const KID: PuppetLook = { skin: "#d8a888", hair: "#1a1410", outfit: "#7a4ab8", pants: "#3a5a9a", shoes: "#f4f4f4" }; // period-ok: closing is present day

// ---------- the radar lab (shots 1, 4, 5) ----------

type LabLight = "teal" | "gold" | "cream";
const LAB_MOOD = { teal: "cold", gold: "warm", cream: "daylight" } as const;
const LAB_WALL = { teal: "#4a7a7e", gold: "#c8a860", cream: "#e8dcc0" };
const LAB_FLOOR = { teal: "#3a4a4c", gold: "#6a5638", cream: "#8a6a4a" };
const BENCH_Z = -0.85;
const TOP = 0.62;
const TUBE: Vec3 = [0.42, TOP, -0.72];
const SP_AT: [number, number] = [-0.06, -0.25];

const RadarLab: React.FC<{ camera: CameraShot; frame: number; light: LabLight; glow?: number; tubeLabel?: boolean; children?: React.ReactNode }> = ({ camera, frame, light, glow = 1, tubeLabel = true, children }) => (
  <Room camera={camera} mood={LAB_MOOD[light]} floor={LAB_FLOOR[light]} wall={LAB_WALL[light]} wallPattern="panel" floorPattern="concrete" width={6} depth={4}>
    <SteelBench position={[0, 0, BENCH_Z]} size={[2.4, TOP, 0.6]} />
    <Magnetron position={TUBE} glow={glow} frame={frame} scale={1.25} labelY={0.47} label={tubeLabel} />
    <Scope position={[-0.85, 1.45, -1.9]} sweep={frame * 0.06} radius={0.24} />
    <Shelf position={[1.15, 1.0, -1.85]} width={1.0} rows={2} color="#5a6466" seed={4} />
    <InkBox size={[0.32, 0.22, 0.26]} position={[-0.75, TOP + 0.11, -0.95]} color="#4a5a52" ink={0.008} />
    <InkCylinder radius={0.04} height={0.02} position={[-0.7, TOP + 0.12, -0.815]} rotation={[Math.PI / 2, 0, 0]} color="#e8e0c8" ink={0.003} />
    <InkCylinder radius={0.04} height={0.02} position={[-0.82, TOP + 0.12, -0.815]} rotation={[Math.PI / 2, 0, 0]} color="#e8e0c8" ink={0.003} />
    <Stick a={[TUBE[0] + 0.25, TOP + 0.1, -0.8]} b={[0.95, TOP + 0.02, -0.95]} radius={0.012} color="#2a2a2a" />
    {children}
  </Room>
);

const tubeLight = (light: LabLight, glow = 1) => ({
  tint: light === "teal" ? "#d8f0ec" : light === "gold" ? "#fff0c8" : "#fff8ec",
  tintAmount: 0.06,
  shadow: 0.2,
  points: [{ position: [TUBE[0], TOP + 0.5, TUBE[2] + 0.3] as Vec3, color: "#ffa850", strength: 1.3 * glow, range: 1.6 }],
  distant: [{ direction: [-0.3, 0.5, 0.8] as Vec3, color: light === "teal" ? "#c8e8f0" : "#fff0d0", strength: 0.7 }],
});

// Chocolate oozing out of the jacket pocket: a wrapper end sticking up, a dark stain and a string running down.
const PocketGoo: React.FC<{ pocket: Vec3; f: number; stain: number }> = ({ pocket, f, stain }) => {
  const len = 0.08 + 0.1 * ease(f, 0, 70) + Math.sin(f * 0.11) * 0.008;
  const dropT = f - 74; // a drop breaks off and falls
  const g = 9.8 / 900;
  const dropY = dropT < 0 ? null : Math.max(0.01, pocket[1] - len - 0.5 * g * dropT * dropT);
  return (
    <group userData={{ ghost: true }} position={pocket} scale={2.2}>
     <group position={[-pocket[0], -pocket[1], -pocket[2]]}>
      <Stain position={[pocket[0], pocket[1] - 0.02, pocket[2] + 0.004]} size={0.06 * stain} />
      <InkBox size={[0.05, 0.07, 0.02]} position={[pocket[0] + 0.01, pocket[1] + 0.03, pocket[2] + 0.012]} rotation={[0, 0, -0.35]} color="#5a3018" ink={0.003} />
      <InkBox size={[0.052, 0.014, 0.022]} position={[pocket[0] + 0.004, pocket[1] + 0.005, pocket[2] + 0.013]} rotation={[0, 0, -0.35]} color="#c8322a" ink={0} />
      <Stick a={[pocket[0] - 0.01, pocket[1] - 0.03, pocket[2] + 0.012]} b={[pocket[0] - 0.015, pocket[1] - 0.03 - len, pocket[2] + 0.014]} radius={0.007} color="#4a2410" ink={0.003} />
      <Ball position={[pocket[0] - 0.015, pocket[1] - 0.03 - len, pocket[2] + 0.014]} radius={0.014} color="#4a2410" scale={[1, 1.3, 1]} ink={0.003} />
      <Stick a={[pocket[0] + 0.025, pocket[1] - 0.035, pocket[2] + 0.012]} b={[pocket[0] + 0.028, pocket[1] - 0.035 - len * 0.6, pocket[2] + 0.014]} radius={0.006} color="#4a2410" ink={0.003} />
      <Ball position={[pocket[0] + 0.028, pocket[1] - 0.035 - len * 0.6, pocket[2] + 0.014]} radius={0.012} color="#4a2410" scale={[1, 1.3, 1]} ink={0.003} />
      {dropY !== null && dropY > pocket[1] - 0.28 && <Ball position={[pocket[0] - 0.015, dropY, pocket[2] + 0.02]} radius={0.01} color="#4a2410" scale={[1, 1.4, 1]} ink={0.003} />}
     </group>
    </group>
  );
};

// ---------- 1. Hook: chocolate oozing from Spencer's pocket beside the humming MAGNETRON ----------

const S1_END: CameraShot = { position: [0.34, 0.92, 1.75], target: [0.17, 0.7, -0.45], fov: 40 };
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..130
  const camera = path(
    [
      { at: 0, position: [0.5, 1.22, 2.45], target: [0.12, 0.82, -0.5], fov: 40 },
      { at: 59, position: [0.42, 1.02, 2.0], target: [0.15, 0.74, -0.5], fov: 40 },
      { at: 130, ...S1_END, k: 1.45 },
    ],
    f,
  );
  const pocket = handWorld(SP_AT, [95, -400], camera);
  return (
    <>
      <Stage
        set={
          <RadarLab camera={camera} frame={f} light="teal">
            <PocketGoo pocket={pocket} f={f + 20} stain={0.7 + 0.3 * ease(f, 0, 60)} />
          </RadarLab>
        }
        camera={camera}
        bg={moodBackground("cold")}
        blur={2.2}
        puppets={[
          {
            id: "spencer",
            look: SPENCER,
            at: SP_AT,
            pose: {
              view: "front",
              ...faceChange([[0, "confused"], [62, "shocked"], [104, "worried"]], f),
              reachR: [mix(150, 125, ease(f, 50, 70)), mix(-470, -430, ease(f, 50, 70))],
              handR: "open",
              reachL: [-120, -520],
              handL: "open",
              frontL: true,
              lookX: 0.35,
              headTilt: -8 + 4 * Math.sin(f * 0.05),
              lean: 4 * ease(f, 60, 80),
            },
          },
        ]}
        light={tubeLight("teal")}
        foreground={<CableSpool position={frameSpot(wide(S1_END), ASPECT, -0.9, -0.9, 1.15)} scale={0.4} />}
      />
      <Headline f={f} text="WHO INVENTED THE MICROWAVE?" at={4} out={122} size={70} />
    </>
  );
};

// ---------- 2. Percy Spencer: never finished grammar school, taught himself from books at night ----------

const S2_END: CameraShot = { position: [0.08, 1.02, 1.95], target: [0.0, 0.7, -0.35], fov: 40 };
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..162
  const camera = path(
    [
      { at: 0, position: [0.25, 1.95, 1.85], target: [0.05, 0.85, -0.4], fov: 40 },
      { at: 161, ...S2_END },
    ],
    f,
  );
  const AT: [number, number] = [0, -0.45];
  const turn = ease(f, 103, 118); // "taught himself"
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#5a3a24" wall="#a8784a" wallPattern="wallpaper" floorPattern="wood" width={5} depth={4}>
          <NightWindow position={[-0.65, 1.5, -1.93]} size={[0.7, 0.9]} />
          <Shelf position={[0.95, 1.05, -1.85]} width={0.9} rows={2} color="#6a4426" seed={6} />
          <Chair position={[0.0, 0, -0.67]} color="#6a3a22" />
          <OakDesk position={[0, 0, 0.05]} size={[1.1, 0.45, 0.55]} />
          <BookStack position={[-0.34, 0.45, 0.1]} titles={["PHYSICS", "CALCULUS", "RADIO"]} rotationY={0.12} />
          <OpenBook position={[0.04, 0.45, 0.12]} rotation={[0, 0.05, 0]} page={turn} />
          <DeskLamp position={[0.38, 0.45, -0.05]} />
          <pointLight position={[0.35, 0.75, 0.05]} color="#ffc878" intensity={1.8} distance={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.2}
      puppets={[
        {
          id: "spencer",
          look: SPENCER,
          at: AT,
          pose: {
            sit: true,
            view: "front",
            ...faceChange([[0, "thinking"], [70, "determined"], [128, "happy"]], f),
            reachR: [mix(120, 60, turn), mix(-520, -540, turn)],
            handR: "open",
            reachL: [-110, -510 + 10 * Math.sin(f * 0.06)],
            handL: f > 128 ? "point" : "open",
            lookX: f < 128 ? 0.15 : 0.0,
            headTilt: f < 128 ? 9 : 2,
          },
        },
      ]}
      light={{ tint: "#ffd8a8", tintAmount: 0.1, shadow: 0.28, points: [{ position: [0.35, 0.75, 0.05], color: "#ffc070", strength: 1.6, range: 2.2 }] }}
      foreground={<BookStack position={frameSpot(wide(S2_END), ASPECT, 0.92, -0.92, 1.15)} />}
    />
  );
};

// ---------- 3. The war: a row of magnetrons, the counter 2,600 A DAY ----------

const S3_END: CameraShot = { position: [0.3, 1.25, 2.55], target: [0.32, 1.0, -0.8], fov: 40 };
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..142
  const camera = path(
    [
      { at: 0, position: [-0.32, 1.2, 2.5], target: [-0.3, 0.95, -0.8], fov: 40 },
      { at: 141, ...S3_END },
    ],
    f,
  );
  const W_AT: [number, number] = [0.62, -0.25];
  const put = ease(f, 40, 72);
  const reachR: [number, number] = [mix(150, 60, put), mix(-560, -470, put)];
  const hand = handWorld(W_AT, reachR, camera);
  const held: Vec3 = [mix(hand[0], 0.72, put), mix(hand[1] - 0.12, TOP, put), mix(hand[2], -0.72, put)];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#3a4250" wall="#8a7a6a" wallPattern="brick" floorPattern="concrete" width={7} depth={4}>
          <SteelBench position={[0, 0, BENCH_Z]} size={[3.4, TOP, 0.6]} color="#7a8890" />
          {[-1.45, -1.1, -0.75, -0.4, -0.05, 0.3].map((x, i) => (
            <Magnetron key={x} position={[x, TOP, -0.78 - (i % 2) * 0.05]} glow={0} label={false} scale={0.7} />
          ))}
          <group userData={{ ghost: true }}>
            <Magnetron position={held} glow={0} label={false} scale={0.7} />
          </group>
          <InkBox size={[0.5, 0.3, 0.4]} position={[1.25, TOP + 0.15, -0.85]} color="#8a6a40" ink={0.008} />
          <CounterBoard position={[0.42, 1.72, -1.9]} text="2,600 A DAY" count={ease(f, 101, 135)} appear={f - 96} width={0.86} />
          <InkBox size={[2.4, 0.08, 0.08]} position={[0, 2.45, -1.7]} color="#3a3a42" ink={0.006} />
          {[-0.8, 0.2, 1.1].map((x) => (
            <group key={x}>
              <InkCylinder radius={0.006} height={0.4} position={[x, 2.2, -1.5]} color="#2a2a2a" ink={0} />
              <InkCylinder radius={0.15} height={0.08} position={[x, 2.0, -1.5]} color="#e8e0c8" ink={0.005} emissive="#5a5030" />
            </group>
          ))}
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={2.2}
      puppets={[
        {
          id: "spencer",
          look: SPENCER,
          at: [-0.05, -0.2],
          pose: { view: "front", ...faceChange([[0, "neutral"], [80, "smug"]], f), gesture: f > 80 ? "handsOnHips" : undefined, lookX: f < 80 ? -0.6 : 0.5 },
        },
        {
          id: "worker",
          look: WORKER,
          at: W_AT,
          pose: { view: "front", ...faceChange([[0, "determined"], [80, "happy"]], f), reachR, handR: "open", frontR: true, reachL: [-120, -500], lookX: -0.4, lean: 6 * put },
        },
      ]}
      light={{ tint: "#e0e8f4", tintAmount: 0.06, shadow: 0.2, distant: [{ direction: [0.1, 0.8, 0.6], color: "#f0f0e8", strength: 0.9 }] }}
      foreground={<CableSpool position={frameSpot(wide(S3_END), ASPECT, -0.92, -0.92, 1.2)} scale={0.4} />}
    />
  );
};

// ---------- 4. Back at the running tube: he pulls out the gooey bar ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..121
  const camera = path(
    [
      { at: 0, position: [0.4, 1.55, 1.6], target: [0.3, 1.0, -0.7], fov: 40 },
      { at: 50, position: [0.3, 1.2, 1.75], target: [0.2, 0.86, -0.6], fov: 40 },
      { at: 120, position: [0.15, 0.98, 1.72], target: [0.06, 0.74, -0.4], fov: 40 },
    ],
    f,
  );
  const pull = ease(f, 52, 72); // "found"
  const reachR: [number, number] = [mix(95, 150, pull), mix(-410, -640, pull)];
  const hand = handWorld(SP_AT, reachR, camera);
  const pocket = handWorld(SP_AT, [95, -400], camera);
  return (
    <Stage
      set={
        <RadarLab camera={camera} frame={f + 150} light="teal">
          <group userData={{ ghost: true }}>
            <Stain position={[pocket[0], pocket[1] - 0.02, pocket[2] + 0.004]} size={0.05} />
            {pull > 0.02 && <CandyBar position={[hand[0], hand[1] - 0.02, hand[2] + 0.04]} rotation={[0, -Math.PI / 2, -0.15]} melt={0.6 + 0.4 * ease(f, 60, 110)} frame={f} scale={1.6} />}
          </group>
        </RadarLab>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={2.2}
      puppets={[
        {
          id: "spencer",
          look: SPENCER,
          at: SP_AT,
          pose: {
            view: "front",
            ...faceChange([[0, "neutral"], [58, "shocked"], [80, "disgusted"], [104, "confused"]], f),
            reachR,
            handR: pull > 0.5 ? "fist" : "open",
            frontR: true,
            reachL: [-130, -520],
            handL: "open",
            lookX: 0.4,
            headTilt: 6 * pull,
            lean: -5 * ease(f, 76, 90),
          },
        },
      ]}
      light={tubeLight("teal")}
      foreground={<CableSpool position={frameSpot(wide({ position: [0.15, 0.98, 1.72] as Vec3, target: [0.06, 0.74, -0.4] as Vec3, fov: 40 }), ASPECT, 0.92, -0.92, 1.15)} scale={0.4} />}
    />
  );
};

// ---------- 5. Popcorn kernels by the tube: they pop all over the lab ----------

const POP = 80; // "They popped"
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..114
  const camera = path(
    [
      { at: 0, position: [0.3, 1.2, 2.2], target: [0.05, 0.85, -0.6], fov: 40 },
      { at: 60, position: [0.32, 1.08, 1.85], target: [0.12, 0.84, -0.6], fov: 40 },
      { at: 113, position: [0.4, 1.04, 1.7], target: [0.2, 0.82, -0.6], fov: 40 },
    ],
    f,
  );
  const C_AT: [number, number] = [-0.62, -1.32];
  const reachR: [number, number] = [mix(130, 185, ease(f, 8, 30)), mix(-520, -585, ease(f, 8, 30))];
  const hand = handWorld(SP_AT, reachR, camera);
  const bagTop: Vec3 = [hand[0] + 0.02, hand[1] + 0.12, hand[2] + 0.05];
  const cHead = headWorld(C_AT, 0, camera.position);
  const crouch = ease(f, POP + 4, POP + 12);
  return (
    <Stage
      set={
        <RadarLab camera={camera} frame={f + 300} light="gold" tubeLabel={false}>
          <group userData={{ ghost: true }}>
            <KernelBag position={[hand[0] + 0.02, hand[1] - 0.06, hand[2] + 0.05]} puff={ease(f, POP - 6, POP + 4)} />
          </group>
          <PopcornBurst origin={bagTop} frame={f - POP} count={30} seed={3} floor={0} table={{ y: TOP, x: [-1.2, 1.2], z: [-1.15, -0.55] }} />
          {f >= POP + 18 && <Ball position={[cHead[0] + 0.03, cHead[1] + 0.18 - 0.1 * crouch * 0, cHead[2] + 0.02]} radius={0.022} color="#fff6dc" ink={0.003} />}
          <Burst kind="stars" at={[bagTop[0], bagTop[1] + 0.05, bagTop[2]]} frame={f - POP} count={6} size={0.35} speed={0.6} seed={5} />
        </RadarLab>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.2}
      puppets={[
        {
          id: "spencer",
          look: SPENCER,
          at: SP_AT,
          pose: {
            view: "front",
            ...faceChange([[0, "thinking"], [40, "smug"], [POP + 2, "excited"]], f),
            ...(f >= POP + 2 ? jump(f, POP + 2, 60, 18) : {}),
            reachR,
            handR: "fist",
            frontR: true,
            reachL: f < POP ? [-120, -520] : [-160, -780],
            handL: "open",
            lookX: f < POP ? 0.5 : 0.1,
          },
        },
        {
          id: "colleague",
          look: COLLEAGUE,
          at: C_AT,
          pose: { view: "front", ...faceChange([[0, "skeptical"], [POP + 3, "shocked"], [POP + 22, "happy"]], f), crouch: 0.35 * (crouch - ease(f, POP + 20, POP + 30)), reachL: f > POP + 2 && f < POP + 26 ? [-90, -860] : [-120, -500], reachR: f > POP + 2 && f < POP + 26 ? [90, -860] : [120, -500], frontL: true, frontR: true, lookX: 0.6 },
        },
      ]}
      light={tubeLight("gold")}
    />
  );
};

// ---------- 6. Next, an egg in a kettle: it shakes, it bursts; "Percy, look out!"; how does it cook? ----------

const SHAKE = 44;
const BURST = 81;
const S6_END: CameraShot = { position: [0.04, 1.1, 1.75], target: [0.04, 0.86, -0.75], fov: 40 };
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..209
  const camera = path(
    [
      { at: 0, position: [0.08, 1.05, 2.0], target: [0.08, 0.85, -0.62], fov: 40, k: 1.55 },
      { at: BURST - 6, position: [0.08, 1.02, 2.0], target: [0.08, 0.84, -0.62], fov: 40, k: 1.35 },
      { at: 122, position: [0.06, 1.1, 2.0], target: [0.06, 0.86, -0.7], fov: 40, k: 1.42 },
      { at: 209, ...S6_END, k: 1.4 },
    ],
    f,
  );
  const tube: Vec3 = [-0.1, TOP, -0.42];
  const kettle: Vec3 = [0.12, TOP, -0.24];
  const C_AT: [number, number] = [0.54, -0.9];
  const S_AT: [number, number] = [-0.4, -0.9];
  const flinch = ease(f, BURST + 1, BURST + 8);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor={LAB_FLOOR.cream} wall={LAB_WALL.cream} wallPattern="plaster" floorPattern="wood" width={6} depth={4} sun={{ x: 0.3, color: "#fff0d0", bars: 5 }}>
          <Window position={[0.35, 1.55, -1.95]} size={[0.9, 1.0]} sky="#bfe0f4" />
          <SteelBench position={[0, 0, -0.33]} size={[1.9, TOP, 0.56]} color="#7a6a5a" />
          <Magnetron position={tube} glow={1} frame={f} scale={1.0} label={false} />
          <group position={kettle} scale={1.45}><Kettle position={[0, 0, 0]} shake={ease(f, SHAKE - 4, SHAKE + 6)} burst={f >= BURST ? 1 : 0} frame={f} /></group>
          <EggBurst at={[kettle[0], kettle[1] + 0.27, kettle[2]]} frame={f - BURST} floor={TOP + 0.002} />
          <Burst kind="stars" at={[kettle[0], kettle[1] + 0.3, kettle[2] + 0.08]} frame={f - BURST} count={7} size={0.4} speed={0.8} seed={9} />
          <InkBox size={[0.26, 0.2, 0.22]} position={[-0.72, TOP + 0.1, -0.4]} color="#5a4a3a" ink={0.008} />
          <Shelf position={[-1.25, 1.05, -1.85]} width={0.9} rows={2} color="#6a5040" seed={8} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={[
        {
          id: "colleague",
          look: COLLEAGUE,
          at: C_AT,
          pose: {
            view: "front",
            ...faceChange([[0, "thinking"], [SHAKE, "worried"], [BURST + 1, "shocked"], [150, "happy"]], f),
            lean: f < BURST ? -10 * ease(f, 4, 30) : mix(-10, 10, flinch),
            reachL: f < BURST ? [-150, -540] : [mix(-80, -130, ease(f, 116, 132)), mix(-840, -510, ease(f, 116, 132))],
            reachR: f < BURST ? [120, -520] : [mix(100, 130, ease(f, 116, 132)), mix(-860, -510, ease(f, 116, 132))],
            handL: "open",
            handR: "open",
            frontL: f >= BURST && f < 128,
            frontR: f >= BURST && f < 128,
            lookX: -0.6,
          },
        },
        {
          id: "spencer",
          look: SPENCER,
          at: S_AT,
          pose: { view: "front", ...faceChange([[0, "smug"], [BURST + 1, "excited"], [124, "thinking"]], f), gesture: f > 124 ? "chin" : undefined, lookX: f < 124 ? 0.6 : 0.3 },
        },
      ]}
      light={{ tint: "#fff4e4", tintAmount: 0.06, shadow: 0.18, points: [{ position: [tube[0], TOP + 0.5, tube[2] + 0.3], color: "#ffa850", strength: 1.0, range: 1.4 }], distant: [{ direction: [0.3, 0.5, -0.8], color: "#fff4d8", strength: 0.9 }] }}
    />
  );
};

// ---------- 7. You see: microwaves twist the WATER in food; the rubbing is HEAT; NO FLAME ----------

const S7: React.FC = () => {
  const f = useShotFrame(); // 0..261
  const camera = path(
    [
      { at: 0, position: [-0.05, 0.78, 1.35], target: [0.0, 0.62, -0.3], fov: 40, k: 1.25 },
      { at: 78, position: [-0.42, 0.98, 2.05], target: [-0.36, 0.8, -0.3], fov: 40 },
      { at: 187, position: [0.15, 1.15, 2.15], target: [0.2, 0.9, -0.3], fov: 40 },
      { at: 260, position: [0.22, 1.28, 2.2], target: [0.28, 0.98, -0.3], fov: 40 },
    ],
    f,
  );
  const on = ease(f, 30, 42);
  const amp = 0.15 + 0.55 * ease(f, 100, 124);
  const heat = ease(f, 187, 232);
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#1e2440" wall="#2e3a6a" wallPattern="plain" floorPattern="concrete" width={6} depth={4}>
          <InkCylinder radius={0.18} height={0.25} position={[0, 0.125, -0.3]} color="#4a5a8a" ink={0.01} />
          <CutawayBowl position={[0, 0.75, -0.3]} radius={0.5} heat={heat} />
          {[
            [-0.24, 0.58, 0.3],
            [0.04, 0.46, -0.9],
            [0.27, 0.6, 1.7],
          ].map(([x, y, ph], i) => (
            <WaterMolecule key={i} position={[x, y, -0.22]} size={0.07} angle={Math.sin(f * 0.75 + ph) * amp + ph * 0.3} />
          ))}
          <Label text="WATER" position={[0, 0.88, -0.2]} width={0.34} appear={f - 76} bg="#d8ecff" />
          <group position={[-0.68, 0.0, -0.5]}>
            <InkBox size={[0.4, 0.55, 0.36]} position={[0, 0.275, 0]} color="#5a6a9a" ink={0.01} />
            <Magnetron position={[0, 0.55, 0]} glow={on} frame={f} scale={1.2} label={false} />
          </group>
          <group position={[0.62, 0, -0.35]}>
            <InkBox size={[0.36, 0.85, 0.32]} position={[0, 0.425, 0]} color="#5a6a9a" ink={0.01} />
            <ColdBurner position={[0, 0.85, 0]} appear={f - 237} />
          </group>
          <BigThermometer position={[0.62, 1.45, -1.0]} level={0.1 + 0.85 * heat} appear={f - 185} />
          <Steam position={[0, 0.78, -0.4]} frame={f + 884} amount={ease(f, 200, 230)} height={0.8} />
          <pointLight position={[0, 2.2, 1.0]} color="#b8c8ff" intensity={2.2} distance={6} />
          <pointLight position={[0, 0.9, 0.2]} color="#ff9a50" intensity={1.4 * heat} distance={2.5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.8}
      puppets={[]}
      light={{ tint: "#c8d4ff", tintAmount: 0.1, shadow: 0.3, points: [{ position: [0, 2.2, 1.0], color: "#b8c8ff", strength: 1.5, range: 5 }] }}
    />
  );
};

// ---------- 8. October 8, 1945: the patent office stamps the form FILED ----------

const STAMP = 69; // "filed"
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..113
  const camera = path(
    [
      { at: 0, position: [0.28, 1.35, 2.35], target: [0.02, 1.0, -0.8], fov: 40 },
      { at: 113, position: [0.06, 1.15, 1.5], target: [0.0, 0.9, -0.5], fov: 40 },
    ],
    f,
  );
  const C_AT: [number, number] = [0.24, -1.0];
  // The form leans on a block at the back of the desk, right in front of the clerk; the stamp is in his hand and
  // comes down square onto it (normal N) on "filed", then lifts off to the side.
  const FORM: Vec3 = [-0.18, 0.92, -0.72];
  const N: Vec3 = [0, Math.sin(0.5), Math.cos(0.5)];
  const MARK: Vec3 = [FORM[0], FORM[1] - 0.16 * Math.cos(0.5), FORM[2] + 0.16 * Math.sin(0.5)];
  const h = f < STAMP - 4 ? ease(f, 24, 50) : f < STAMP ? 1 - ease(f, STAMP - 4, STAMP) : ease(f, STAMP + 2, STAMP + 10);
  // The clerk's hand goes up toward the press handle as he pulls it down.
  const reachL: [number, number] = [mix(-120, -230, ease(f, 14, 40)), mix(-520, -700, ease(f, 14, 40)) + 90 * (1 - h) * ease(f, STAMP - 6, STAMP)];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#3a3024" wall="#2e5a40" wallPattern="panel" floorPattern="wood" width={6} depth={4}>
          <FilingCabinet position={[-1.0, 0, -1.6]} />
          <FilingCabinet position={[1.0, 0, -1.6]} />
          <Calendar position={[-0.42, 1.62, -1.92]} text={"OCT 8\n1945"} appear={f - 6} width={0.4} />
          <OakDesk position={[0, 0, -0.55]} size={[1.3, 0.62, 0.62]} />
          <InkBox size={[0.46, 0.22, 0.12]} position={[FORM[0], 0.73, FORM[2] - 0.12]} color="#5a3418" ink={0.006} />
          <PatentForm position={FORM} rotation={[-0.5, 0, 0]} stamped={f >= STAMP + 9 ? 1 : 0} dateAppear={f - STAMP - 9} />
          <group userData={{ ghost: true }}>
            <group position={MARK} rotation={[Math.PI / 2 - 0.5, 0, 0]}>
              {/* a small dating press clamped on the form holder: two posts, a crossbar, the stamp on a rod */}
              {[-0.21, 0.21].map((x) => (
                <InkBox key={x} size={[0.025, 0.42, 0.025]} position={[x, 0.21, -0.02]} color="#3a3a42" ink={0.004} />
              ))}
              <InkBox size={[0.46, 0.04, 0.05]} position={[0, 0.42, -0.02]} color="#3a3a42" ink={0.005} />
              <group position={[0, 0.012 + h * 0.26, 0]} scale={1.3}>
                <HandStamp position={[0, 0, 0]} lift={0} />
              </group>
              <InkCylinder radius={0.012} height={0.3} position={[0, 0.2 + h * 0.26, 0]} color="#8a8a92" ink={0.003} />
            </group>
          </group>
          <DeskLamp position={[0.48, 0.62, -0.6]} color="#2a6a3a" />
          <Burst kind="dust" at={[MARK[0], MARK[1] + 0.03, MARK[2] + 0.05]} frame={f - STAMP} count={8} size={0.3} seed={4} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={2.2}
      puppets={[
        {
          id: "clerk",
          look: CLERK,
          at: C_AT,
          pose: { view: "front", ...faceChange([[0, "bored"], [STAMP - 8, "determined"], [STAMP + 6, "smug"]], f), reachL, handL: "fist", frontL: true, reachR: [120, -520], lookX: -0.5, headTilt: 6 },
        },
      ]}
      light={{ tint: "#f0f4e0", tintAmount: 0.06, shadow: 0.22, points: [{ position: [0.48, 0.9, -0.5], color: "#ffe0a0", strength: 1.2, range: 2 }] }}
    />
  );
};

// ---------- 9. The first oven, 1947: six feet tall, 750 pounds on the scale ----------

const WEIGH = 88; // "weighed"
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..132
  const camera = path(
    [
      { at: 0, position: [0.15, 1.7, 2.35], target: [0.12, 1.42, -0.9], fov: 40 },
      { at: 64, position: [0.18, 1.55, 2.25], target: [0.15, 1.25, -0.9], fov: 40 },
      { at: 132, position: [0.38, 1.0, 2.05], target: [0.42, 0.72, -0.6], fov: 40 },
    ],
    f,
  );
  const settle = ease(f, WEIGH - 4, WEIGH + 2);
  const ovenY = 0.12 - 0.012 * Math.sin(Math.PI * settle);
  const spin = f < WEIGH ? 0 : f < 100 ? ease(f, WEIGH, 98) * 1.3 : mix(1.3, 0.75, ease(f, 100, 110));
  const COOK_AT: [number, number] = [-0.6, -0.4];
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#e8e0d4" wall="#f2ece4" wallPattern="tile" floorPattern="tile" width={6} depth={4} stripe="#c8322a">
          <PlatformScale position={[0.0, 0, -1.0]} needle={spin} appear={f - 96} />
          <FirstOven position={[0.0, ovenY, -1.05]} height={1.45} hum={0.3} frame={f} />
          <HeightMark position={[0.52, 0.12 + 1.45, -1.93]} appear={f - 64} />
          <InkBox size={[0.02, 1.45, 0.02]} position={[0.44, 0.12 + 0.725, -1.93]} color="#161212" ink={0} />
          <Counter position={[-1.45, 0, -1.6]} size={[1.0, 0.9, 0.6]} color="#c8322a" top="#e8e0d4" />
          <Pot position={[-1.5, 0.9, -1.6]} />
          <Shelf position={[1.45, 1.4, -1.85]} width={0.9} rows={1} color="#8a6a4a" seed={2} />
          <Label text="1947" position={[0.0, 0.12 + 1.45 * 0.95, -0.726]} width={0.26} bg="#f0ead8" />
          <Burst kind="dust" at={[0.0, 0.12, -0.6]} frame={f - WEIGH} count={12} size={0.5} seed={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.2}
      puppets={[
        {
          id: "cook",
          look: COOK,
          at: COOK_AT,
          pose: {
            view: "front",
            ...faceChange([[0, "neutral"], [60, "thinking"], [WEIGH + 2, "shocked"], [118, "awkward"]], f),
            ...(f >= WEIGH + 2 ? jump(f, WEIGH + 2, 70, 16) : {}),
            reachR: f < WEIGH ? [mix(140, 260, ease(f, 70, WEIGH)), mix(-560, -620, ease(f, 70, WEIGH))] : [150, -820],
            handR: "open",
            frontR: f < WEIGH,
            reachL: f < WEIGH ? [-120, -520] : [-150, -820],
            lookX: f < 70 ? 0.6 : 0.4,
            headTilt: f < 70 ? -10 : 0,
          },
        },
      ]}
      light={{ tint: "#fff0e0", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [-0.3, 0.7, 0.6], color: "#fff0d8", strength: 1.0 }] }}
      foreground={<Pot position={frameSpot(wide({ position: [0.25, 1.0, 2.05] as Vec3, target: [0.3, 0.72, -0.6] as Vec3, fov: 40 }), ASPECT, -0.92, -0.92, 1.15)} color="#c8322a" r={0.09} />}
    />
  );
};

// ---------- 10. 1967: a countertop model in a pastel kitchen, $495 ----------

const PRICE = 92; // "four"
const S10_END: CameraShot = { position: [0.2, 1.18, 2.15], target: [0.28, 0.95, -1.0], fov: 40 };
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..147
  const camera = path(
    [
      { at: 0, position: [-0.5, 1.22, 2.15], target: [-0.42, 1.0, -1.0], fov: 40 },
      { at: 147, ...S10_END },
    ],
    f,
  );
  const MOM_AT: [number, number] = [0.05, -0.95];
  const press = ease(f, 108, 118);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#e8dcc8" wall="#a8e0d8" wallPattern="wallpaper" floorPattern="tile" width={6} depth={4} sun={{ x: -0.6, color: "#fff4d8", bars: 4 }}>
          <Cabinets position={[0.2, 0, -1.65]} width={3.0} top={TOP} />
          <Window position={[-0.75, 1.62, -1.95]} size={[0.7, 0.6]} sky="#c8ecff" />
          <Calendar position={[-0.55, 1.52, -1.57]} text="1967" appear={f - 30} />
          <CountertopOven position={[0.55, TOP, -1.55]} on={press} frame={f} />
          <HangTag hook={[0.72, TOP + 0.34, -1.35]} text="$495" appear={f - PRICE} swing={Math.sin(f * 0.15) * 0.08 * (f > PRICE ? 1 : 0)} />
          <InkCylinder radius={0.1} height={0.06} position={[-0.1, TOP + 0.03, -1.5]} color="#f4a040" ink={0.005} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={[
        {
          id: "son",
          look: SON,
          at: [-0.32, -0.65],
          pose: { view: "front", ...faceChange([[0, "happy"], [PRICE, "excited"]], f), ...(f >= 120 ? jump(f, 120, 70, 18) : {}), gesture: f > PRICE - 10 && f < 120 ? "point" : undefined, lookX: 0.6 },
        },
        {
          id: "mom",
          look: MOM,
          at: MOM_AT,
          pose: { view: "front", ...faceChange([[0, "neutral"], [70, "happy"]], f), reachR: [mix(130, 260, ease(f, 90, 108)), mix(-500, -560, ease(f, 90, 108))], handR: press > 0.5 ? "point" : "open", reachL: [-120, -510], lookX: 0.6 },
        },
      ]}
      light={{ tint: "#fff8ec", tintAmount: 0.06, shadow: 0.16, distant: [{ direction: [-0.4, 0.6, 0.7], color: "#fff4d8", strength: 1.0 }] }}
      foreground={<group position={frameSpot(wide(S10_END), ASPECT, 0.92, -0.92, 1.15)}><InkCylinder radius={0.11} height={0.05} color="#e8e0d0" ink={0.005} /><Ball position={[0, 0.06, 0]} radius={0.05} color="#d8322a" /><Ball position={[0.06, 0.05, 0.02]} radius={0.045} color="#f4c020" /></group>}
    />
  );
};

// ---------- 11. Today: popcorn on the sofa; back to one melted candy bar ----------

const S11: React.FC = () => {
  const f = useShotFrame(); // 0..154
  const camera = path(
    [
      { at: 0, position: [0.1, 1.2, 2.25], target: [0.0, 0.72, -0.6], fov: 40 },
      { at: 60, position: [0.2, 0.98, 1.65], target: [0.08, 0.62, -0.4], fov: 40 },
      { at: 154, position: [0.15, 0.85, 1.25], target: [0.0, 0.5, -0.1], fov: 40, k: 1.2 },
    ],
    f,
  );
  const KID_AT: [number, number] = [-0.1, -0.43]; // at the sofa's front edge (sofa at z -0.75, depth 0.6): legs in front of the seat
  const bites = [10, 46, 82];
  const reachUp = bites.reduce((m, b) => Math.max(m, ease(f, b, b + 10) - ease(f, b + 16, b + 26)), 0);
  const reachR: [number, number] = [mix(150, 40, reachUp), mix(-470, -740, reachUp)];
  const chew = bites.map((b) => [b + 18, b + 34] as [number, number]);
  const mouth = chew.reduce((m, [a, b]) => (f >= a && f < b ? Math.abs(Math.sin((f - a) * 0.42)) * 0.5 : m), 0);
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#4a3a4a" wall="#6a4a6a" wallPattern="wallpaper" floorPattern="carpet" width={6} depth={4}>
          <Settee position={[-0.05, 0, -0.75]} />
          <CoffeeTable position={[0.08, 0, 0.0]} />
          <PopcornBowl position={[-0.2, 0.36 + 0.13, 0.0]} />
          <CandyBar position={[0.02, 0.36 + 0.02, 0.12]} rotation={[0, -0.35, 0]} melt={0.1 + 0.3 * ease(f, 100, 150)} frame={f} scale={1.6} />
          <InkBox size={[0.9, 0.04, 0.4]} position={[-0.95, 0.9, -1.75]} color="#5a3a4a" ink={0.006} />
          <ModernMicrowave position={[-0.95, 0.92, -1.75]} on={1} frame={f} />
          <pointLight position={[-0.9, 1.2, -1.3]} color="#ffc070" intensity={1.2} distance={3} />
          <pointLight position={[0.8, 2.0, 0.5]} color="#ff9ab8" intensity={0.9} distance={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.2}
      puppets={[
        {
          id: "kid",
          look: KID,
          at: KID_AT,
          pose: { sit: true, view: "front", ...faceChange([[0, "happy"], [100, "excited"], [130, "happy"]], f), reachR, handR: "fist", frontR: true, reachL: [-140, -520], mouthOpen: mouth, lookX: f < 100 ? 0.3 : 0.6 },
        },
      ]}
      light={{ tint: "#ffd8e8", tintAmount: 0.1, shadow: 0.24, points: [{ position: [-0.9, 1.2, -1.3], color: "#ffc070", strength: 1.0, range: 2.6 }] }}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 131, S1, false],
  [131, 294, S2, "dip"],
  [294, 437, S3, "dip"],
  [437, 559, S4, "dip"],
  [559, 674, S5, "dissolve"],
  [674, 884, S6, "dip"],
  [884, 1146, S7, "dip"],
  [1146, 1260, S8, "dip"],
  [1260, 1393, S9, "dip"],
  [1393, 1541, S10, "dip"],
  [1541, TIMING.totalFrames, S11, "dip"],
];

const KERNEL_POPS = Array.from({ length: 14 }, (_, i) => 559 + POP + Math.round((i * i * 0.13 + i * 1.2) % 28));
const KID_CHEWS = jawCloses([10, 46, 82].map((b) => [1541 + b + 18, 1541 + b + 34] as [number, number]), 0.42);

const SFX: Sfx[] = [
  // radar lab: the tube hums, a drop of chocolate falls
  { at: 0, src: sfx("hum"), volume: 0.12, until: 131 },
  { at: 92, src: sfx("plop"), volume: 0.3, space: "room" },
  // the study: the page turns
  { at: 131, src: sfx("tick"), volume: 0.06, until: 294 },
  { at: 131 + 100, src: sfx("paper"), volume: 0.45, space: "room" },
  // the factory
  { at: 294, src: sfx("compressor"), volume: 0.05, until: 437 },
  { at: 294 + 72, src: sfx("clink"), volume: 0.34, space: "hall" },
  { at: 294 + 96, src: sfx("pop"), volume: 0.5 },
  { at: 294 + 101, src: sfx("credit-blip"), volume: 0.16, until: 294 + 135 },
  // back by the tube: the sticky bar
  { at: 437, src: sfx("hum"), volume: 0.12, until: 559 },
  { at: 559, src: sfx("hum"), volume: 0.07, until: 674 },
  { at: 437 + 56, src: sfx("slime"), volume: 0.36, space: "room" },
  // popcorn
  { at: 559 + 8, src: sfx("paper"), volume: 0.4, space: "room" },
  ...foleyCues("kernel", KERNEL_POPS, 0.34, { space: "room" }),
  // the egg
  { at: 674, src: sfx("hum"), volume: 0.1, until: 884 },
  { at: 674 + SHAKE - 4, src: sfx("tick"), volume: 0.12, until: 674 + BURST },
  { at: 674 + BURST, src: sfx("splash"), volume: 0.3, space: "room", hit: 0.3 },
  { at: 674 + BURST, src: sfx("pop"), volume: 0.6, space: "room" },
  { at: 838, src: sfx("riser"), volume: 0.12, until: 884 },
  // the pivot
  { at: 884 + 4, src: sfx("sting"), volume: 0.6 },
  { at: 884 + 30, src: sfx("hum"), volume: 0.12, until: 1146 },
  { at: 884 + 76, src: sfx("pop"), volume: 0.6 },
  { at: 884 + 185, src: sfx("pop"), volume: 0.6 },
  { at: 884 + 200, src: sfx("hiss"), volume: 0.18, space: "room" },
  { at: 884 + 237, src: sfx("pop"), volume: 0.6 },
  // the patent office
  { at: 1146 + 6, src: sfx("pop"), volume: 0.85 },
  { at: 1146 + STAMP, src: sfx("stamp"), volume: 1.0, space: "room" },
  // the first oven
  { at: 1260, src: sfx("hum"), volume: 0.06, until: 1393 },
  { at: 1260 + 64, src: sfx("pop"), volume: 0.5 },
  { at: 1260 + WEIGH, src: sfx("clang"), volume: 0.3, space: "room", hit: 0.35 },
  { at: 1260 + WEIGH + 2, src: sfx("creak"), volume: 0.2, space: "room" },
  { at: 1260 + 96, src: sfx("pop"), volume: 0.5 },
  // 1967
  { at: 1393 + 30, src: sfx("pop"), volume: 0.85 },
  { at: 1393 + PRICE, src: sfx("pop"), volume: 0.85 },
  { at: 1393 + 112, src: sfx("button"), volume: 1.3, space: "room" },
  { at: 1393 + 116, src: sfx("hum"), volume: 0.08, until: 1541 },
  // today
  { at: 1541, src: sfx("hum"), volume: 0.05, until: TIMING.totalFrames - 10 },
  ...foleyCues("crunch", [1541 + 20, 1541 + 56, 1541 + 92], 0.38, { space: "room" }),
  ...foleyCues("munch", KID_CHEWS.filter((k) => !([1541 + 28, 1541 + 64, 1541 + 100] as number[]).includes(k)), 0.18, { space: "room" }),
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 437, volume: 0.26 },
  { src: MUSIC_FILES.lounge, from: 437, to: 884, volume: 0.28 },
  { src: MUSIC_FILES.mystery, from: 884, to: 1146, volume: 0.32 },
  { src: MUSIC_FILES.tension, from: 1146, to: 1393, volume: 0.28 },
  { src: MUSIC_FILES.upbeat, from: 1393, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
