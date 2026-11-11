import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  Chair,
  faceChange,
  foleyCues,
  frameSpot,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  jump,
  Label,
  moodBackground,
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
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Curtain } from "../leo-sign/props";
import { Lectern } from "../pink-margarine/props";
import { GasBracket } from "../what-if-lincoln/props";
import {
  BariumScreen,
  BigBook,
  BottleShelf,
  Cabinet,
  CostumeOverlays,
  CrookesTube,
  GiantTube,
  InductionCoil,
  LabWindow,
  LightBox,
  MedalCase,
  Overlay,
  PhotoPlate,
  Plank,
  RaysPaper,
  Safelight,
  SkeletonHand,
  Stool,
  TableLamp,
  Tray,
  WallDate,
  WorkTable,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The Green Glow That Looked Inside the Human Body": Würzburg, 8 November 1895. Röntgen wraps a Crookes tube in black
// cardboard; across the dark room a barium platinocyanide screen glows green; a thousand-page book and a board do not
// stop it; his hand shows its bones (the story goes); seven weeks later, 22 December, Anna Bertha's hand and ring on a
// plate ("I have seen my death"); electrons hit the glass and make the rays; bone and metal cast the shadow; X for
// unknown, the paper of 28 December; the news, doctors and broken bones; the first Nobel Prize in physics, 1901.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "xray-hand";
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
const solveReach = (at: [number, number], target: Vec3, camera: CameraShot, start: [number, number] = [-200, -600]): [number, number] => {
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

// ---------- cast (1895-1901; the closing patient and radiographer are present day) ----------

const ROENTGEN: PuppetLook = { skin: "#ecc4a2", hair: "#2e2420", outfit: "#2a2830", vest: "#1c1a20", beard: "#3a3028", pants: "#24222a", shoes: "#141010" };
const ANNA: PuppetLook = { skin: "#f0cbb0", hair: "#4a3424", outfit: "#4a2a36", skirt: true, shoes: "#1e1410" };
const NEWSBOY: PuppetLook = { skin: "#f2cca8", hair: "#7a5030", outfit: "#7a7c80", vest: "#4a4a50", pants: "#3a3430", shoes: "#2a1a10" };
const DOCTOR: PuppetLook = { skin: "#e8c0a0", hair: "#b8b4ac", glasses: true, beard: "#b8b4ac", outfit: "#1e1e24", vest: "#2e2e36", pants: "#1e1e24", shoes: "#121010" };
const OFFICIAL: PuppetLook = { skin: "#eec8a8", hair: "#c8c4bc", outfit: "#18181c", vest: "#f4f2ec", pants: "#18181c", shoes: "#101010" };
const KID: PuppetLook = { skin: "#c89070", hair: "#1a1410", outfit: "#7ab0d8", pants: "#6a6e76", shoes: "#f4f4f4" }; // period-ok: closing is present day
const RADIOGRAPHER: PuppetLook = { skin: "#f0c8a8", hair: "#e0c080", outfit: "#3a9a9a", pants: "#3a9a9a", shoes: "#f4f4f4" }; // period-ok: closing is present day

const OVERLAYS: Record<string, Overlay> = {
  roentgen: { beard: "#3a3230", collar: true },
  anna: { bun: "#4a3424" },
  doctor: { collar: true },
  official: { collar: true },
};

// The cast plus the costume overlays (long beard, collar, bun) and any foreground object, for Stage's foreground slot.
const fg = (cast: PuppetPlacement[], extra?: React.ReactNode) => (
  <>
    <CostumeOverlays cast={cast} looks={OVERLAYS} />
    {extra}
  </>
);

// ---------- Röntgen's lab (shots 1-5): one room in four lights ----------

type LabLight = "lamp" | "dark" | "day";
const LAB_MOOD = { lamp: "warm", dark: "night", day: "daylight" } as const;
const LAB_WALL = { lamp: "#c8b48e", dark: "#1c2238", day: "#e6e0d2" };
const LAB_FLOOR = { lamp: "#8a6436", dark: "#1a1c28", day: "#b88a56" };
const TABLE_TOP = 0.62;
const TUBE: Vec3 = [-0.85, TABLE_TOP, -0.05];
const LAMP: Vec3 = [0.08, TABLE_TOP, -0.32];
const SCREEN: Vec3 = [0.36, 0, 0.12];
const SCREEN_Y = 0.95; // paper centre height
const SCREEN_RY = 0.3; // the face turns toward Röntgen and the camera (the paper glows on both sides)
const GAP: Vec3 = [-0.3, 0.7, 0.05]; // where things are held between tube and screen

const WurzburgLab: React.FC<{ camera: CameraShot; frame: number; light: LabLight; screenGlow?: number; tubeGlow?: number; cover?: number; lamp?: number; tubeLabel?: boolean; screenLabel?: boolean; showScreen?: boolean; tubeLift?: number; onScreen?: React.ReactNode; children?: React.ReactNode }> = ({
  camera,
  frame,
  light,
  screenGlow = 0,
  tubeGlow = 0,
  cover = 1,
  lamp = 0,
  tubeLabel = false,
  screenLabel = false,
  showScreen = true,
  tubeLift = 0,
  onScreen,
  children,
}) => (
  <Room camera={camera} mood={LAB_MOOD[light]} floor={LAB_FLOOR[light]} wall={LAB_WALL[light]} wallPattern="plaster" floorPattern="wood" width={6} depth={5}>
    <LabWindow position={[-1.3, 1.55, -2.47]} size={[0.8, 1.4]} sky={light === "day" ? "#e8f0f4" : light === "lamp" ? "#2a3048" : "#0e1222"} curtain={light === "day" ? "#d8cfb8" : "#3a3a2e"} glow={light === "day" ? 1.1 : 0.6} />
    <Cabinet position={[1.25, 0, -2.25]} />
    <WorkTable position={[-0.95, 0, -0.1]} size={[1.25, TABLE_TOP, 0.55]} />
    {light === "lamp" && <WorkTable position={[LAMP[0], 0, LAMP[2]]} size={[0.42, TABLE_TOP, 0.4]} />}
    {tubeLift > 0 && <InkCylinder radius={0.018} height={tubeLift} position={[TUBE[0] - 0.3, TABLE_TOP + tubeLift / 2, TUBE[2]]} color="#3a2416" ink={0.004} />}
    <CrookesTube position={[TUBE[0] - (tubeLift > 0 ? 0.3 : 0), TUBE[1] + tubeLift, TUBE[2]]} glow={tubeGlow} cover={cover} frame={frame} scale={1.25} label={tubeLabel} />
    <InductionCoil position={[-1.32, TABLE_TOP, -0.2]} frame={frame} on={tubeGlow > 0.05 || (light === "dark" && screenGlow > 0.1) ? 1 : 0} scale={0.9} />
    {/* wires from the coil to the tube */}
    <InkCylinder radius={0.005} height={0.42} position={[-1.12, TABLE_TOP + 0.3, -0.12]} rotation={[0, 0, 1.2]} color="#2a1a12" ink={0} />
    {light === "lamp" && <TableLamp position={LAMP} f={frame} on={lamp} />}
    {showScreen && (<BariumScreen position={SCREEN} rotationY={SCREEN_RY} glow={screenGlow} frame={frame} height={SCREEN_Y} size={[0.6, 0.48]} label={screenLabel}>
      {onScreen}
    </BariumScreen>)}
    {showScreen && light === "dark" && <pointLight position={[SCREEN[0] - 0.05, SCREEN_Y, SCREEN[2] + 0.35]} color="#7aff4a" intensity={2.2 * screenGlow} distance={2.6} />}
    {children}
    <InkBox size={[6, 0.12, 0.03]} position={[0, 0.06, -2.48]} color="#3a2416" ink={0} />
  </Room>
);

// The puppets' light in the dark lab: the screen's green glow from its face, a faint cold fill.
const screenLight = (glow: number) => ({
  tint: "#8090c0",
  tintAmount: 0.14,
  shadow: 0.42,
  points: [{ position: [SCREEN[0] + 0.25, SCREEN_Y, SCREEN[2] + 0.2] as Vec3, color: "#8aff5a", strength: 2.4 * glow, range: 1.8 }],
});
const lampLight = (on: number) => ({
  tint: "#ffd8a8",
  tintAmount: 0.1,
  shadow: 0.25,
  points: [{ position: [LAMP[0], TABLE_TOP + 0.35, LAMP[2] + 0.2] as Vec3, color: "#ffc070", strength: 1.8 * on, range: 2.4 }],
});

const HAND_C: Vec3 = [0.61, SCREEN_Y - 0.1, -0.04]; // his hand just behind the paper's right edge, the arm reaching in

// ---------- 1. Hook: the green screen in the dark, a skeleton hand flexing on it ----------

const R_AT1: [number, number] = [0.93, -0.3];
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..127
  const camera = path(
    [
      { at: 0, position: [0.6, 1.08, 3.6], target: [0.6, 0.95, 0.0], fov: 40, k: 1.0 },
      { at: 84, position: [0.6, 1.08, 3.3], target: [0.6, 0.98, 0.0], fov: 40, k: 1.0 },
      { at: 127, position: [0.6, 1.08, 3.25], target: [0.6, 0.99, 0.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  const flex = 0.5 + 0.5 * Math.sin(f * 0.09);
  const handT: Vec3 = [HAND_C[0] + 0.015 * Math.sin(f * 0.05), HAND_C[1] + 0.015 * Math.sin(f * 0.07), HAND_C[2]];
  const reachL = solveReach(R_AT1, handT, camera, [-300, -700]);
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT1,
      pose: {
        view: "front",
        ...faceChange([[0, "shocked"], [70, "excited"], [110, "thinking"]], f),
        reachL,
        handL: "open",
        frontL: true,
        reachR: [mix(130, 60, ease(f, 60, 80)), mix(-520, -700, ease(f, 60, 80))],
        handR: "open",
        frontR: f > 60,
        lookX: -0.7,
        headTilt: -6 + 3 * Math.sin(f * 0.05),
        lean: -6,
      },
    },
  ];
  return (
    <>
      <Stage
        set={
          <WurzburgLab camera={camera} frame={f} light="dark" screenGlow={1} cover={1} onScreen={
            <SkeletonHand position={[0.07 + 0.012 * Math.sin(f * 0.05), -0.07 + 0.012 * Math.sin(f * 0.07), 0]} rotation={[0, 0, 0.45]} scale={1.3} spread={0.55 + 0.3 * flex} curl={[0.2 * (1 - flex), 0.3 * (1 - flex), 0.1, 0.25 * (1 - flex), 0.4 * (1 - flex)]} />
          } />
        }
        camera={camera}
        bg={moodBackground("night")}
        blur={2.0}
        puppets={cast}
        light={screenLight(1)}
        foreground={fg(cast)}
      />
      <Headline f={f} text="WHAT MADE IT GLOW?" at={4} out={120} size={70} />
    </>
  );
};

// ---------- 2. 8 November 1895, by lamplight: the tube, then the black cardboard, then the lamp goes down ----------

const R_AT2: [number, number] = [-0.3, -0.62];
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..213 (video 128..341)
  const camera = path(
    [
      { at: 0, position: [-0.12, 1.3, 1.2], target: [-0.12, 1.18, -0.62], fov: 40, k: 1.6 },
      { at: 68, position: [-0.3, 1.2, 1.4], target: [-0.3, 1.02, -0.5], fov: 40, k: 1.6 },
      { at: 112, position: [-0.58, 1.15, 1.3], target: [-0.58, 0.98, -0.3], fov: 40, k: 1.85 },
      { at: 213, position: [-0.45, 1.15, 1.4], target: [-0.45, 0.95, -0.3], fov: 40, k: 1.8 },
    ],
    f,
  );
  const cover = ease(f, 132, 168);
  const lamp = 1 - ease(f, 182, 206);
  // the sleeve's open end, in the world (tube scale 1.25)
  const sleeveEnd: Vec3 = [TUBE[0] + (-0.25 + 0.48 * Math.max(cover, 0.05)) * 1.25, TUBE[1] + 0.3 * 1.25, TUBE[2]];
  const grab = ease(f, 120, 132) * (1 - ease(f, 168, 178));
  const reachR0: [number, number] = [130, -520];
  const reachRS = solveReach(R_AT2, sleeveEnd, camera, [80, -560]);
  const knob: Vec3 = [LAMP[0] - 0.05, TABLE_TOP + 0.16, LAMP[2]];
  const turn = ease(f, 172, 184) * (1 - ease(f, 205, 213));
  const reachRL = solveReach(R_AT2, knob, camera, [250, -520]);
  const reachR: [number, number] = turn > 0 ? [mix(reachR0[0], reachRL[0], turn), mix(reachR0[1], reachRL[1], turn)] : [mix(reachR0[0], reachRS[0], grab), mix(reachR0[1], reachRS[1], grab)];
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT2,
      pose: {
        view: "front",
        ...faceChange([[0, "thinking"], [68, "determined"], [175, "skeptical"]], f),
        reachR,
        handR: "open",
        frontR: true,
        reachL: [-130, -520],
        handL: "open",
        lookX: f < 120 ? -0.2 : 0.2,
        headTilt: f < 120 ? 0 : 6,
      },
    },
  ];
  return (
    <Stage
      set={
        <WurzburgLab camera={camera} frame={f + 128} light="lamp" tubeGlow={(1 - cover) * ease(f, 96, 110)} cover={cover} lamp={0.25 + 0.75 * lamp} tubeLabel={f > 100}>
          <WallDate position={[0.18, 1.42, -2.4]} text={"NOV 8\n1895"} width={0.34} />
          <Label text="WÜRZBURG" position={[0.18, 1.74, -2.4]} width={0.36} bg="#f4ecd8" appear={f - 12} />
        </WurzburgLab>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.0}
      puppets={cast}
      light={lampLight(0.3 + 0.7 * lamp)}
      foreground={fg(cast)}
    />
  );
};

// ---------- 3. Dark: across the room the screen glows; a thousand-page book, then a board: it still glows ----------

const R_AT3: [number, number] = [-0.2, -0.55];
const BOOK_IN = 112;
const THROW = 154;
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..207 (video 342..549)
  const camera = path(
    [
      { at: 0, position: [-0.55, 1.15, 1.9], target: [-0.55, 0.95, -0.2], fov: 40 },
      { at: 78, position: [0.1, 1.12, 2.0], target: [0.1, 0.92, 0.0], fov: 40, k: 1.6 },
      { at: 125, position: [-0.22, 0.95, 1.3], target: [-0.22, 0.8, 0.0], fov: 40, k: 1.25 },
      { at: 172, position: [-0.18, 0.85, 1.35], target: [-0.18, 0.62, 0.0], fov: 40, k: 1.65 },
      { at: 207, position: [0.05, 1.0, 1.9], target: [0.05, 0.86, 0.0], fov: 40, k: 1.6 },
    ],
    f,
  );
  const glow = ease(f, 26, 40);
  // the book: lifted into the gap, held, lowered; then the board is thrown and clatters down
  const bookUp = ease(f, BOOK_IN, BOOK_IN + 14) * (1 - ease(f, THROW - 16, THROW - 6));
  const bookPos: Vec3 = [mix(-0.55, GAP[0], bookUp), mix(0.45, GAP[1], bookUp), mix(-0.42, GAP[2], bookUp)];
  const reachL = solveReach(R_AT3, [bookPos[0] - 0.09, bookPos[1] - 0.06, bookPos[2]], camera, [-200, -500]);
  const wind = ease(f, THROW - 14, THROW - 2);
  const handR: Vec3 = [-0.1 - 0.05 * wind, 0.48 + 0.12 * wind, -0.4];
  const reachR = solveReach(R_AT3, handR, camera, [200, -560]);
  const fly = Math.max(0, f - THROW);
  const land = 15;
  const tB = Math.min(fly, land) / land;
  const grabP = ease(f, THROW - 26, THROW - 14);
  const floorP: Vec3 = [0.12, 0.025, -0.2];
  const inHand: Vec3 = [handR[0] + 0.2, handR[1] + 0.02, handR[2] + 0.05];
  const from: Vec3 = [mix(floorP[0], inHand[0], grabP), mix(floorP[1], inHand[1], grabP), mix(floorP[2], inHand[2], grabP)];
  const plankPos: Vec3 = f < THROW ? from : [mix(from[0], GAP[0] - 0.05, tB), mix(from[1], 0.02, tB * tB) + 0.22 * Math.sin(Math.PI * tB), mix(from[2], GAP[2] + 0.1, tB)];
  const plankRot: Vec3 = f < THROW ? (grabP < 1 ? [mix(Math.PI / 2, 0.1, grabP), 0.4 * (1 - grabP) + 0.2 * grabP, mix(0, 1.45, grabP)] : [0.1, 0.2, 1.45]) : fly < land ? [0.2 + fly * 0.18, 0.3, 1.2 + fly * 0.22] : [Math.PI / 2, 0.4, 0];
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT3,
      pose: {
        view: "front",
        ...faceChange([[0, "neutral"], [30, "shocked"], [BOOK_IN, "determined"], [THROW + 4, "excited"], [THROW + 22, "confused"]], f),
        reachL: f < BOOK_IN - 8 ? [-130, -520] : reachL,
        handL: "open",
        frontL: false,
        reachR: f > THROW + 26 ? [60, -900] : f > THROW ? [mix(200, 230, ease(f, THROW, THROW + 8)), -680] : reachR,
        handR: "open",
        frontR: f > THROW + 26,
        gesture: f > THROW + 26 ? "scratchHead" : undefined,
        lookX: f < 30 ? -0.6 : 0.4,
        lean: f > THROW - 10 && f < THROW + 6 ? 8 : 0,
      },
    },
  ];
  return (
    <Stage
      set={
        <WurzburgLab camera={camera} frame={f + 342} light="dark" screenGlow={glow} cover={1} screenLabel={f > 34 && f < 100}>
          <group userData={{ ghost: true }}>
            {f > BOOK_IN - 10 && f < THROW - 4 && <group position={bookPos} scale={1.5}><BigBook position={[0, 0, 0]} rotation={[0, 0, 0]} label="1000 PAGES" /></group>}
            <Plank position={plankPos} rotation={plankRot} size={[0.7, 0.36, 0.04]} />
          </group>
          <Burst kind="dust" at={[GAP[0] - 0.05, 0.02, GAP[2] + 0.1]} frame={f - THROW - land} count={10} size={0.4} seed={4} />
        </WurzburgLab>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={2.0}
      puppets={cast}
      light={screenLight(0.3 + 0.7 * glow)}
      foreground={fg(cast)}
    />
  );
};

// ---------- 4. His hand passes in front: the bones on the screen; he jumps back off his stool ----------

const JUMP = 98;
const STOOL: Vec3 = [0.93, 0, -0.48];
const R_AT4: [number, number] = [0.93, -0.3];
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..115 (video 550..665)
  const camera = path(
    [
      { at: 0, position: [0.6, 1.02, 3.5], target: [0.6, 0.92, 0.0], fov: 40, k: 1.0 },
      { at: 76, position: [0.6, 1.0, 3.28], target: [0.6, 0.92, 0.0], fov: 40, k: 1.0 },
      { at: 115, position: [0.61, 1.04, 3.45], target: [0.61, 0.94, 0.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  const inn = ease(f, 18, 48);
  const handT: Vec3 = [mix(0.72, HAND_C[0], inn), HAND_C[1] + 0.015 * Math.sin(f * 0.08), HAND_C[2]];
  const reachL = solveReach(R_AT4, handT, camera, [-420, -600]);
  const show = ease(f, 34, 70);
  const jumped = f >= JUMP;
  const tip = ease(f, JUMP + 2, JUMP + 14);
  const throwUp = ease(f, JUMP, JUMP + 5) * (1 - ease(f, JUMP + 26, JUMP + 40));
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: jumped ? [R_AT4[0], R_AT4[1] + 0.12 * ease(f, JUMP, JUMP + 12)] : R_AT4,
      pose: {
        view: "front",
        ...(jumped ? jump(f, JUMP, 220, 20) : { sit: true }),
        ...faceChange([[0, "thinking"], [60, "shocked"], [JUMP + 22, "excited"]], f),
        reachL: jumped ? [mix(reachL[0], -170, throwUp), mix(reachL[1], -880, throwUp)] : reachL,
        handL: "open",
        frontL: !jumped,
        reachR: jumped ? [mix(130, 170, throwUp), mix(-520, -880, throwUp)] : [120, -500],
        handR: "open",
        lookX: -0.75,
        lean: jumped ? 0 : -4,
      },
    },
  ];
  return (
    <Stage
      set={
        <WurzburgLab camera={camera} frame={f + 550} light="dark" screenGlow={1} cover={1} onScreen={
          <group userData={{ ghost: true }}>
            {show > 0.01 && (
              <group scale={[1, 1, 1]}>
                <SkeletonHand position={[mix(0.3, 0.07, inn), -0.07 + 0.012 * Math.sin(f * 0.08), 0]} rotation={[0, 0, 0.45]} scale={1.3} spread={0.6 + 0.15 * Math.sin(f * 0.1)} curl={[0.1, 0, 0, 0.05, 0.1]} fleshOpacity={0.35 * show} bone={show > 0.5 ? "#0c1a0a" : "#2a5a20"} />
              </group>
            )}
          </group>
          }>
          <Stool position={STOOL} tip={tip} />
          <Burst kind="dust" at={[STOOL[0], 0.02, STOOL[2] - 0.25]} frame={f - JUMP - 14} count={8} size={0.35} seed={7} />
        </WurzburgLab>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={2.0}
      puppets={cast}
      light={screenLight(1)}
      foreground={fg(cast)}
    />
  );
};

// ---------- 5. Seven weeks of tests; 22 December: Anna Bertha lays her hand on a photographic plate ----------

const A_AT5: [number, number] = [-0.86, -0.62];
const R_AT5: [number, number] = [-0.3, -0.9];
const PLATE5: Vec3 = [-0.6, 0.98, -0.68]; // upright on a stand behind her hand, the tube shining from the front
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..160 (video 666..826)
  const camera = path(
    [
      { at: 0, position: [-0.1, 1.45, 1.3], target: [-0.1, 0.95, -0.6], fov: 40 },
      { at: 58, position: [-0.3, 1.4, 1.1], target: [-0.3, 1.3, -1.5], fov: 40, k: 1.3 },
      { at: 112, position: [-0.62, 1.2, 1.5], target: [-0.62, 1.04, -0.6], fov: 40, k: 1.1 },
      { at: 160, position: [-0.64, 1.18, 1.4], target: [-0.64, 1.04, -0.6], fov: 40, k: 1.1 },
    ],
    f,
  );
  const lay = ease(f, 108, 124);
  const handTop: Vec3 = [mix(-0.42, PLATE5[0] + 0.01, lay), mix(0.78, PLATE5[1] - 0.06, lay), PLATE5[2] + 0.04];
  void handTop;
  const reachR: [number, number] = [mix(150, 315, lay), mix(-560, -880, lay)];
  const plates = [0, 1, 2, 3].map((i) => [-1.4 + i * 0.004, TABLE_TOP + 0.01 + i * 0.012, -0.05 + i * 0.003] as Vec3);
  const cast: PuppetPlacement[] = [
    {
      id: "anna",
      look: ANNA,
      at: A_AT5,
      pose: { view: "front", ...faceChange([[0, "neutral"], [96, "happy"], [126, "thinking"]], f), reachR: f > 96 ? reachR : [120, -520], handR: "open", frontR: true, reachL: [-120, -520], lookX: f < 96 ? 0.4 : 0.3, headTilt: f > 110 ? -6 : 0 },
    },
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT5,
      pose: { view: "front", ...faceChange([[0, "bored"], [40, "thinking"], [100, "determined"]], f), gesture: f < 96 ? "chin" : undefined, reachL: f >= 96 ? [-200, -560] : undefined, handL: "point", lookX: f < 96 ? 0.3 : -0.6 },
    },
  ];
  return (
    <Stage
      set={
        <WurzburgLab camera={camera} frame={f + 666} light="day" cover={1} screenGlow={0} showScreen={false} tubeLift={0.42}>
          <WallDate position={[-0.45, 1.58, -2.4]} text={f < 58 ? "NOV\n1895" : "DEC 22\n1895"} appear={f < 58 ? 999 : f - 58} width={0.32} />
          {plates.map((p, i) => (
            <PhotoPlate key={i} position={p} rotation={[-Math.PI / 2, 0, 0.1 * i]} size={[0.2, 0.25]} image={0} />
          ))}
          <group userData={{ ghost: true }}>
          <PhotoPlate position={PLATE5} size={[0.26, 0.32]} image={0} />
          <InkCylinder radius={0.014} height={PLATE5[1] - 0.18} position={[PLATE5[0], (PLATE5[1] - 0.18) / 2, PLATE5[2] - 0.03]} color="#2a1a12" ink={0.004} />
          <InkBox size={[0.26, 0.03, 0.2]} position={[PLATE5[0], 0.015, PLATE5[2] - 0.03]} color="#2a1a12" ink={0.005} />
          </group>
          <Label text={"PHOTOGRAPHIC\nPLATE"} position={[PLATE5[0], PLATE5[1] + 0.27, PLATE5[2]]} width={0.3} appear={f - 126} />
        </WurzburgLab>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#f4f6ff", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [-0.5, 0.6, 0.5] as Vec3, color: "#f4f8ff", strength: 0.9 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 6. The darkroom: her bones and the wedding ring; "I have seen my death!" ----------

const R_AT6: [number, number] = [0.3, -0.55];
const A_AT6: [number, number] = [-0.38, -0.5];
const CRY = 104;
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..154 (video 827..981)
  const camera = path(
    [
      { at: 0, position: [0.0, 1.18, 1.5], target: [0.05, 0.98, -0.5], fov: 40 },
      { at: 40, position: [0.1, 1.08, 1.05], target: [0.12, 1.0, -0.35], fov: 40, k: 1.25 },
      { at: CRY, position: [-0.1, 1.12, 1.4], target: [-0.08, 0.98, -0.5], fov: 40 },
      { at: 154, position: [-0.12, 1.12, 1.45], target: [-0.1, 0.96, -0.5], fov: 40 },
    ],
    f,
  );
  const plate: Vec3 = [-0.02, 0.84, -0.28];
  const reachL = solveReach(R_AT6, [plate[0] - 0.2, plate[1] - 0.04, plate[2]], camera, [-200, -620]);
  const reachR = solveReach(R_AT6, [plate[0] + 0.2, plate[1] - 0.04, plate[2]], camera, [100, -620]);
  const back = ease(f, CRY + 2, CRY + 14);
  const recover = ease(f, CRY + 34, CRY + 48);
  const A_AT: [number, number] = [A_AT6[0] - 0.12 * back, A_AT6[1] - 0.05 * back];
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT6,
      pose: { view: "front", ...faceChange([[0, "happy"], [CRY + 4, "worried"]], f), reachL, reachR, handL: "open", handR: "open", lookX: -0.3, headTilt: 4 },
    },
    {
      id: "anna",
      look: ANNA,
      at: A_AT,
      pose: {
        view: "front",
        ...faceChange([[0, "thinking"], [40, "confused"], [CRY - 6, "shocked"], [CRY + 40, "sad"]], f),
        reachR: f < CRY - 4 ? [130, -520] : [mix(130, 40, ease(f, CRY - 4, CRY + 2) * (1 - recover)), mix(-520, -640, ease(f, CRY - 4, CRY + 2) * (1 - recover))],
        handR: "open",
        frontR: f > CRY - 4 && recover < 0.5,
        reachL: f < CRY ? [-130, -520] : [mix(-130, -220, back * (1 - recover)), mix(-520, -470, back * (1 - recover))],
        handL: "open",
        lean: -10 * back * (1 - recover * 0.6),
        lookX: 0.6,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="alarm" floor="#2a1410" wall="#4a1e1a" wallPattern="panel" floorPattern="wood" width={5} depth={3}>
          <Safelight position={[-0.7, 1.65, -1.4]} f={f} />
          <WorkTable position={[0, 0, -0.95]} size={[1.6, 0.8, 0.5]} color="#3a2418" />
          <Tray position={[-0.45, 0.8, -0.95]} slosh={Math.sin(Math.max(0, f - CRY - 6) * 0.4) * Math.exp(-Math.max(0, f - CRY - 6) * 0.05) * (f > CRY + 6 ? 1 : 0)} />
          <Tray position={[0.1, 0.8, -1.0]} color="#4a4a50" />
          <BottleShelf position={[0.6, 1.4, -1.38]} width={0.9} />
          <group userData={{ ghost: true }}>
            <PhotoPlate position={plate} image={ease(f, 0, 12)} ring size={[0.3, 0.38]} />
          </group>
          <Label text="WEDDING RING" position={[0.0, 1.1, -0.24]} width={0.3} appear={f - 38} bg="#ffe8d8" />
        </Room>
      }
      camera={camera}
      bg={moodBackground("alarm")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#ff9a8a", tintAmount: 0.2, shadow: 0.35, points: [{ position: [-0.7, 1.65, -1.1] as Vec3, color: "#ff3a2a", strength: 2.2, range: 3 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 7. His study at night: how does a ray pass through skin, but not bone? ----------

const R_AT7: [number, number] = [0.0, -0.52];
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..94 (video 982..1076)
  const camera = path(
    [
      { at: 0, position: [0.2, 1.25, 1.6], target: [0.05, 0.78, -0.3], fov: 40 },
      { at: 94, position: [0.08, 1.05, 1.35], target: [0.02, 0.76, -0.3], fov: 40 },
    ],
    f,
  );
  const raise = ease(f, 18, 34);
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT7,
      pose: {
        sit: true,
        view: "front",
        ...faceChange([[0, "thinking"], [36, "confused"], [70, "thinking"]], f),
        reachR: [mix(120, 170, raise), mix(-500, -700, raise)],
        handR: "open",
        frontR: true,
        reachL: [-120, -480],
        handL: "open",
        lookX: 0.5 * raise,
        headTilt: 6 * raise,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#3a2a40" wall="#5a4a7a" wallPattern="wallpaper" floorPattern="wood" width={5} depth={4}>
          <LabWindow position={[-0.75, 1.5, -1.97]} size={[0.7, 1.1]} sky="#2a3a6a" curtain="#4a2a4a" glow={0.8} />
          <Chair position={[0, 0, -0.75]} color="#4a2e2a" />
          <WorkTable position={[0, 0, 0.02]} size={[1.0, 0.45, 0.5]} />
          <TableLamp position={[0.36, 0.45, -0.02]} f={f + 982} on={0.45} />
          <PhotoPlate position={[-0.15, 0.45 + 0.18, -0.08]} rotation={[-0.35, 0.2, 0]} image={1} ring size={[0.22, 0.28]} />
          <InkBox size={[0.16, 0.18, 0.04]} position={[-0.15, 0.54, -0.18]} color="#3a2418" ink={0.004} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#d8c0ff", tintAmount: 0.12, shadow: 0.3, points: [{ position: [0.36, 0.8, 0.1] as Vec3, color: "#ffc070", strength: 1.6, range: 2.2 }] }}
      foreground={fg(cast, <group position={frameSpot(wide({ position: [0.08, 1.05, 1.35] as Vec3, target: [0.02, 0.76, -0.3] as Vec3, fov: 40 }), ASPECT, -0.9, -0.92, 1.15)}><InkBox size={[0.22, 0.06, 0.16]} color="#5a2a3a" ink={0.005} /><InkBox size={[0.2, 0.05, 0.15]} position={[0.01, 0.055, 0]} color="#2a4a5a" ink={0.005} /></group>)}
    />
  );
};

// ---------- 8. You see: electrons slam into the glass; rays pass skin; bone and metal cast the shadow ----------

const S8: React.FC = () => {
  const f = useShotFrame(); // 0..220 (video 1077..1297)
  const camera = path(
    [
      { at: 0, position: [-0.85, 1.05, 1.3], target: [-0.8, 0.95, -0.4], fov: 40, k: 1.45 },
      { at: 26, position: [-0.7, 1.05, 1.35], target: [-0.65, 0.95, -0.4], fov: 40, k: 1.45 },
      { at: 79, position: [-0.25, 1.05, 1.45], target: [-0.25, 0.95, -0.4], fov: 40, k: 1.45 },
      { at: 123, position: [0.25, 1.0, 1.4], target: [0.25, 0.92, -0.4], fov: 40, k: 1.45 },
      { at: 171, position: [0.32, 0.98, 1.35], target: [0.32, 0.9, -0.4], fov: 40, k: 1.5 },
      { at: 205, position: [0.6, 1.0, 1.45], target: [0.6, 0.92, -0.4], fov: 40, k: 1.55 },
      { at: 220, position: [0.61, 1.0, 1.45], target: [0.61, 0.92, -0.4], fov: 40, k: 1.55 },
    ],
    f,
  );
  const rays = ease(f, 92, 106);
  const shadow = ease(f, 200, 212);
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#141c38" wall="#24305e" wallPattern="plain" floorPattern="concrete" width={7} depth={4}>
          <GiantTube position={[-0.75, 0.95, -0.45]} f={f} electrons={ease(f, 8, 24)} rays={rays} scale={0.62} />
          <InkCylinder radius={0.03} height={0.65} position={[-0.6, 0.32, -0.5]} color="#3a4a7a" ink={0.006} />
          <InkBox size={[0.4, 0.04, 0.3]} position={[-0.6, 0.02, -0.5]} color="#3a4a7a" ink={0.006} />
          {f < 58 && <Label text="ELECTRONS" position={[-0.85, 1.24, -0.4]} width={0.34} appear={f - 26} bg="#d8ecff" />}
          {f < 100 && <Label text="GLASS" position={[-0.38, 1.24, -0.4]} width={0.24} appear={f - 79} bg="#d8ecff" />}
          {f < 180 && <Label text="X-RAYS" position={[0.0, 0.74, -0.4]} width={0.26} appear={f - 100} bg="#f4ffd0" />}
          {/* the giant hand: flesh you can see through, bones and a ring inside */}
          <group position={[0.28, 0.66, -0.42]}>
            <InkCylinder radius={0.02} height={0.66} position={[0, -0.33, -0.02]} color="#3a4a7a" ink={0.005} />
            <SkeletonHand position={[0, 0.14, 0]} scale={1.8} spread={0.6} ring bone="#f4f0e4" flesh="#f0b8a0" fleshOpacity={0.6} ringColor="#e8b830" />
          </group>
          {f < 180 && <Label text="SKIN" position={[0.12, 1.2, -0.38]} width={0.2} appear={f - 123} bg="#ffe0d4" />}
          <Label text="BONE" position={[0.45, 1.2, -0.38]} width={0.2} appear={f - 154} bg="#f4f0e4" />
          <Label text="METAL" position={[0.36, 0.5, -0.38]} width={0.22} appear={f - 171} bg="#ffe8a0" />
          <group position={[0.85, 0, -0.6]}>
            <BariumScreen position={[0, 0, 0]} rotationY={-0.35} glow={0.4 + 0.6 * rays} frame={f} height={0.92} size={[0.42, 0.36]}>
              {shadow > 0.01 && <SkeletonHand position={[0, -0.07, 0]} scale={1.05} spread={0.6} ring fleshOpacity={0.3 * shadow} bone={shadow > 0.5 ? "#0c1a0a" : "#3a7a2a"} />}
            </BariumScreen>
          </group>
          <Label text="SHADOW" position={[0.82, 1.26, -0.5]} width={0.28} appear={f - 207} bg="#e0ffd0" />
          <pointLight position={[0, 2.2, 1.0]} color="#b8c8ff" intensity={2.0} distance={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.6}
      puppets={[]}
    />
  );
};

// ---------- 9. X for unknown; the paper of 28 December ----------

const R_AT9: [number, number] = [-0.42, -0.75];
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..112 (video 1298..1410)
  const camera = path(
    [
      { at: 0, position: [-0.25, 1.35, 1.4], target: [-0.2, 1.25, -1.0], fov: 40 },
      { at: 45, position: [-0.15, 1.3, 1.35], target: [-0.1, 1.2, -1.0], fov: 40 },
      { at: 112, position: [0.05, 1.05, 1.3], target: [0.08, 0.86, -0.5], fov: 40 },
    ],
    f,
  );
  const write = ease(f, 6, 20);
  const chalk: Vec3 = [-0.05 + 0.08 * Math.sin(f * 0.4) * (write > 0 && write < 1 ? 1 : 0), 1.35, -1.33];
  const reachR = solveReach(R_AT9, chalk, camera, [200, -800]);
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT9,
      pose: {
        view: "front",
        ...faceChange([[0, "determined"], [36, "smug"]], f),
        reachR: f < 30 ? reachR : [mix(reachR[0], 140, ease(f, 30, 44)), mix(reachR[1], -520, ease(f, 30, 44))],
        handR: "fist",
        reachL: [-130, -520],
        lookX: f < 36 ? 0.6 : 0.1,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#5a3a24" wall="#8a7a64" wallPattern="panel" floorPattern="wood" width={6} depth={3}>
          <InkBox size={[1.5, 0.95, 0.04]} position={[0, 1.4, -1.38]} color="#2b2e2a" ink={0.012} />
          <InkBox size={[1.6, 0.04, 0.1]} position={[0, 0.9, -1.34]} color="#6a4426" ink={0.006} />
          <Label text="X-RAYS" position={[-0.2, 1.62, -1.35]} width={0.5} fg="#f4f1e8" bg="#2b2e2a" border={false} appear={f - 12} />
          <Label text="X = ?" position={[0.08, 1.25, -1.35]} width={0.42} fg="#f4f1e8" bg="#2b2e2a" border={false} appear={f - 36} />
          <Lectern position={[0.12, 0, -0.55]} />
          <Label text={"ON A NEW\nKIND OF RAYS"} position={[0.12, 0.99, -0.5]} rotation={[-0.25, 0, 0]} width={0.4} bg="#f4ecd4" appear={f - 76} />
          <Label text="DEC 28, 1895" position={[0.12, 0.76, -0.33]} rotation={[0, 0, 0]} width={0.34} bg="#fff6dc" appear={f - 88} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#f4f0e4", tintAmount: 0.06, shadow: 0.22, distant: [{ direction: [0.4, 0.6, 0.6] as Vec3, color: "#fff4e0", strength: 0.8 }] }}
      foreground={fg(cast, <group position={frameSpot(wide({ position: [0.05, 1.05, 1.3] as Vec3, target: [0.08, 0.86, -0.5] as Vec3, fov: 40 }), ASPECT, 0.9, -0.92, 1.15)}><InkBox size={[0.18, 0.08, 0.12]} color="#6a4426" ink={0.005} />{[-0.05, 0, 0.05].map((x) => <InkCylinder key={x} radius={0.008} height={0.07} position={[x, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} color="#f4f1e8" ink={0.002} />)}</group>)}
    />
  );
};

// ---------- 10. 1896: the news circles the world; doctors photograph broken bones ----------

const N_AT: [number, number] = [-0.42, -0.4];
const D_AT: [number, number] = [0.5, -0.55];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..120 (video 1411..1531)
  const camera = path(
    [
      { at: 0, position: [-0.45, 1.15, 1.6], target: [-0.4, 0.98, -0.4], fov: 40 },
      { at: 22, position: [-0.38, 1.12, 1.6], target: [-0.33, 0.98, -0.4], fov: 40 },
      { at: 93, position: [0.4, 1.1, 1.6], target: [0.42, 0.98, -0.45], fov: 40 },
      { at: 120, position: [0.45, 1.08, 1.55], target: [0.46, 0.98, -0.45], fov: 40 },
    ],
    f,
  );
  const wave = Math.sin(f * 0.35) * 0.04;
  const paper: Vec3 = [-0.42 + 0.22 + wave * 0.5, 1.05 + wave, -0.32];
  const reachRN = solveReach(N_AT, [paper[0] - 0.02, paper[1] - 0.2, paper[2]], camera, [150, -650]);
  const lift = ease(f, 86, 98);
  const plate: Vec3 = [0.5 - 0.34, mix(0.55, 0.7, lift), -0.45];
  const reachLD = solveReach(D_AT, [plate[0] + 0.02, plate[1] - 0.16, plate[2]], camera, [-150, -600]);
  const cast: PuppetPlacement[] = [
    { id: "newsboy", look: NEWSBOY, at: N_AT, pose: { view: "front", ...faceChange([[0, "excited"], [80, "happy"]], f), reachR: reachRN, handR: "fist", reachL: [-160, -760 + 40 * Math.sin(f * 0.3)], handL: "open", lookX: 0.2 } },
    { id: "doctor", look: DOCTOR, at: D_AT, pose: { view: "front", ...faceChange([[0, "thinking"], [96, "excited"]], f), reachL: reachLD, handL: "open", reachR: [130, -520], lookX: -0.5, headTilt: -5 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#5a5e66" wall="#8a5a48" wallPattern="brick" floorPattern="tile" width={6} depth={3}>
          <GasBracket position={[0.05, 1.7, -1.42]} frame={f + 1411} />
          <LabWindow position={[0.95, 1.4, -1.47]} size={[0.8, 1.1]} sky="#c8d4e0" curtain="#5a2a2a" glow={0.9} />
          <InkBox size={[0.6, 0.55, 0.4]} position={[-0.95, 0.275, -1.1]} color="#4a3a2a" ink={0.008} />
          {[0, 1, 2].map((i) => (
            <InkBox key={i} size={[0.42, 0.03, 0.3]} position={[-0.95, 0.57 + i * 0.03, -1.1]} rotation={[0, 0.1 * i, 0]} color="#ece6d4" ink={0.003} />
          ))}
          <group userData={{ ghost: true }}>
            <RaysPaper position={paper} rotation={[0, 0.15, wave]} scale={0.95} />
            <PhotoPlate position={plate} image={1} ring={false} snapped size={[0.26, 0.32]} />
          </group>
          <Label text="BROKEN BONE" position={[0.32, 1.3, -0.4]} width={0.34} appear={f - 100} bg="#f4ecd8" />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#e4ecf4", tintAmount: 0.06, shadow: 0.2, distant: [{ direction: [0.5, 0.6, 0.5] as Vec3, color: "#eef4ff", strength: 0.8 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 11. Stockholm 1901: the first Nobel Prize in physics; he never patented the rays ----------

const R_AT11: [number, number] = [-0.35, -0.55];
const O_AT: [number, number] = [0.42, -0.6];
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..130 (video 1532..1662)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.4, 1.7], target: [0.05, 1.1, -0.6], fov: 40 },
      { at: 43, position: [0.0, 1.2, 1.6], target: [0.0, 0.98, -0.5], fov: 40 },
      { at: 130, position: [-0.15, 1.08, 1.45], target: [-0.15, 0.88, -0.4], fov: 40 },
    ],
    f,
  );
  const give = ease(f, 20, 36);
  const medal: Vec3 = [0.0, 0.63, -0.3];
  const reachLO = solveReach(O_AT, [medal[0] + 0.1, medal[1] + 0.1, medal[2]], camera, [-200, -450]);
  const reachRR = solveReach(R_AT11, [medal[0] - 0.06, medal[1] + 0.12, medal[2]], camera, [150, -450]);
  const cast: PuppetPlacement[] = [
    {
      id: "roentgen",
      look: ROENTGEN,
      at: R_AT11,
      pose: { view: "front", ...faceChange([[0, "neutral"], [30, "happy"], [92, "smug"]], f), reachR: give > 0.6 ? reachRR : [120, -520], handR: "open", reachL: [-130, -520], handL: "open", gesture: f > 92 && f < 122 ? "shrug" : undefined, headTilt: f > 94 && f < 120 ? 6 * Math.sin((f - 94) * 0.5) : 0, lookX: f > 84 ? 0.3 : 0.5 },
    },
    {
      id: "official",
      look: OFFICIAL,
      at: O_AT,
      pose: { view: "front", ...faceChange([[0, "happy"], [92, "confused"]], f), reachL: f > 14 && f < 70 ? reachLO : [-130, -520], handL: f > 14 && f < 70 ? "point" : "open", reachR: [130, -520], lookX: -0.6 },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#5a2a1a" wall="#8a5a2a" wallPattern="panel" floorPattern="carpet" width={6} depth={4}>
          <Curtain position={[0, 0, -1.85]} width={3.2} height={2.6} color="#c8962a" />
          <WorkTable position={[0, 0, -0.25]} size={[1.1, 0.62, 0.45]} color="#3a2010" />
          <InkBox size={[1.12, 0.012, 0.47]} position={[0, 0.626, -0.25]} color="#f4ecd8" ink={0} />
          <Label text={"NOBEL PRIZE\nPHYSICS 1901"} position={[0.15, 1.42, -1.6]} width={0.55} bg="#f8ecc8" appear={f - 43} />
          <group userData={{ ghost: true }}>
            <group position={medal} scale={1.4}><MedalCase position={[0, 0, 0]} /></group>
          </group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#ffe8b0", tintAmount: 0.1, shadow: 0.22, points: [{ position: [0, 2.2, 0.6] as Vec3, color: "#ffd890", strength: 1.2, range: 4 }] }}
      foreground={fg(cast, <group position={frameSpot(wide({ position: [-0.15, 1.08, 1.45] as Vec3, target: [-0.15, 0.88, -0.4] as Vec3, fov: 40 }), ASPECT, -0.9, -0.92, 1.2)}><InkCylinder radius={0.012} height={0.5} color="#c8a040" ink={0.004} /><InkCylinder radius={0.05} height={0.02} position={[0, -0.25, 0]} color="#c8a040" ink={0.004} /></group>)}
    />
  );
};

// ---------- 12. Today: a hand X-ray on the light box; it began with one green glow ----------

const K_AT: [number, number] = [-0.62, -0.5];
const X_AT: [number, number] = [0.8, -0.6];
const S12: React.FC = () => {
  const f = useShotFrame(); // 0..110 (video 1663..1773)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.15, 1.7], target: [0.05, 1.0, -0.6], fov: 40 },
      { at: 60, position: [0.05, 1.3, 1.1], target: [0.05, 1.28, -1.38], fov: 40, k: 1.0 },
      { at: 96, position: [0.05, 1.3, 0.95], target: [0.05, 1.28, -1.38], fov: 40, k: 1.0 },
      { at: 110, position: [0.05, 1.3, 0.94], target: [0.05, 1.28, -1.38], fov: 40, k: 1.0 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "kid", look: KID, at: K_AT, pose: { view: "front", ...faceChange([[0, "excited"], [60, "happy"]], f), gesture: f > 10 && f < 70 ? "point" : undefined, lookX: 0.5 } },
    { id: "radiographer", look: RADIOGRAPHER, at: X_AT, pose: { view: "front", ...faceChange([[0, "happy"]], f), reachL: [-200, -700], handL: "point", lookX: -0.5 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#c8d4dc" wall="#dce8f0" wallPattern="tile" floorPattern="plain" width={6} depth={3}>
          <LightBox position={[0.05, 1.3, -1.38]} on={1} green={ease(f, 52, 60) * (1 - ease(f, 84, 96))} />
          <group position={[0.52, 1.4, -1.45]}>
            <InkBox size={[0.3, 0.36, 0.03]} color="#3a2a1e" ink={0.006} />
            <PhotoPlate position={[0, 0, 0.018]} image={1} ring size={[0.24, 0.3]} holder={false} />
          </group>
          <Label text="1895" position={[0.52, 1.15, -1.42]} width={0.18} bg="#f4ecd8" appear={f - 50} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#eaf4ff", tintAmount: 0.08, shadow: 0.18, points: [{ position: [0.05, 1.3, -1.0] as Vec3, color: "#dff0ff", strength: 1.4, range: 2.5 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 128, S1, false],
  [128, 342, S2, "dissolve"],
  [342, 550, S3, "dissolve"],
  [550, 666, S4, "dissolve"],
  [666, 827, S5, "dissolve"],
  [827, 982, S6, "dip"],
  [982, 1077, S7, "dip"],
  [1077, 1298, S8, "dip"],
  [1298, 1411, S9, "dip"],
  [1411, 1532, S10, "dip"],
  [1532, 1663, S11, "dip"],
  [1663, TIMING.totalFrames, S12, "dip"],
];

const SFX: Sfx[] = [
  // the hook: the coil buzzes in the dark
  { at: 0, src: sfx("hum"), volume: 0.1, until: 128 },
  // lamplight: the calendar, the tube lights, the cardboard slides on, the lamp goes down
  { at: 128 + 6, src: sfx("pop"), volume: 0.5 },
  { at: 128 + 96, src: sfx("hum"), volume: 0.1, until: 128 + 170 },
  { at: 128 + 132, src: sfx("paper"), volume: 0.4, space: "room" },
  { at: 128 + 182, src: sfx("button"), volume: 1.2, space: "room" },
  // dark: the screen glows, the book, the board clatters
  { at: 342, src: sfx("hum"), volume: 0.1, until: 550 },
  { at: 342 + 34, src: sfx("pop"), volume: 0.5 },
  { at: 342 + BOOK_IN, src: sfx("paper"), volume: 0.35, space: "room" },
  { at: 342 + THROW, src: sfx("whoosh"), volume: 0.25 },
  ...foleyCues("thud", [342 + THROW + 15, 342 + THROW + 19], 0.5, { space: "room" }),
  // the bones; he jumps; the stool goes over
  { at: 550, src: sfx("hum"), volume: 0.1, until: 666 },
  { at: 550 + 60, src: sfx("sting"), volume: 0.35 },
  { at: 550 + JUMP, src: sfx("squeak"), volume: 0.3, space: "room" },
  ...foleyCues("thud", [550 + JUMP + 14], 0.55, { space: "room", hit: 0.3 }),
  // 22 December
  { at: 666 + 58, src: sfx("pop"), volume: 0.75 },
  { at: 666 + 128, src: sfx("credit-blip"), volume: 0.35 },
  // the darkroom
  { at: 827 + 38, src: sfx("pop"), volume: 0.75 },
  { at: 827 + CRY + 6, src: sfx("splash"), volume: 0.22, space: "room" },
  { at: 1040, src: sfx("riser"), volume: 0.12, until: 1077 },
  // the pivot
  { at: 1077 + 4, src: sfx("sting"), volume: 0.32 },
  { at: 1077 + 10, src: sfx("hum"), volume: 0.07, until: 1298 },
  ...[26, 79, 100, 123, 154, 171, 207].map((t, i) => ({ at: 1077 + t, src: sfx(i % 2 ? "credit-blip" : "pop"), volume: i % 2 ? 0.35 : i === 4 ? 0.5 : 0.75 })),
  // X = ?, the paper
  { at: 1298 + 4, src: sfx("scrape"), volume: 0.18, space: "room" },
  { at: 1298 + 36, src: sfx("pop"), volume: 0.45 },
  { at: 1298 + 76, src: sfx("paper"), volume: 0.55, space: "room" },
  // 1896
  { at: 1411 + 10, src: sfx("paper"), volume: 0.3, space: "outdoor" },
  { at: 1411 + 100, src: sfx("pop"), volume: 0.45 },
  // Stockholm
  { at: 1532 + 43, src: sfx("pop"), volume: 0.5 },
  { at: 1532 + 36, src: sfx("chime"), volume: 0.1, space: "hall" },
  { at: 1532 + 96, src: sfx("paper"), volume: 0.3, space: "hall" },
  // today
  { at: 1663 + 4, src: sfx("button"), volume: 1.4, space: "room" },
  { at: 1663 + 50, src: sfx("pop"), volume: 0.7 },
  { at: 1663 + 54, src: sfx("hum"), volume: 0.06, until: 1663 + 96 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.mystery, from: 0, to: 342, volume: 0.28 },
  { src: MUSIC_FILES.tension, from: 342, to: 827, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 827, to: 1077, volume: 0.28 },
  { src: MUSIC_FILES.tension, from: 1077, to: 1411, volume: 0.26 },
  { src: MUSIC_FILES.upbeat, from: 1411, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
