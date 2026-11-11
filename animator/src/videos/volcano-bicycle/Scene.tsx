import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  faceChange,
  frameSpot,
  handWorld,
  Headline,
  InkBox,
  jump,
  moveChange,
  Label,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
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
  walkAt,
} from "../../engine";
import { TableLamp } from "../xray-hand/props";
import { Costume, Costumes } from "./costumes";
import { Draisine, HANDLE, HitchPost, HOUSE_Z, onMachine, SADDLE_BACK, TownSet, townLight, WallLantern } from "./props";
import { Bench, Cart, DeskLamp, FarmHorse, FieldSet, HangingSign, HobbyHorse, Inn, LaneSet, Milestone, NoPedal, Palm, Picture, Plinth, Pothole, Sack, SignBoard, ToolBoard, VolcanoSet } from "./sets";
import TIMING_JSON from "./timing.json";

// "Why a Volcano Invented the Bicycle": Tambora erupts in April 1815; its sulphur veils the sky and the planet cools;
// 1816, the year without a summer: harvests rot, oats run short, horses starve or are slaughtered; in Mannheim Karl
// Drais builds a horse that never eats: two wooden wheels in a line, a seat, a handlebar, no pedals; 12 June 1817,
// to a coaching inn and back in about an hour. One historian argues the horses inspired him; nobody can prove it.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "volcano-bicycle";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix2 = (a: [number, number], b: [number, number], t: number): [number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
const ASPECT = 9 / 16;

// Camera keys pulled back from their target by K. The keys below are written as the final camera positions
// (k = 1, each at 3-4 m from a standing puppet: the cut-out heads are big); `wide` is kept for the foreground spots.
const K = 1.0;
type Key = { at: number; position: Vec3; target: Vec3; fov?: number; k?: number };
const wide = <T extends { position: Vec3; target: Vec3 }>(c: T, k = K): T => ({
  ...c,
  position: [c.target[0] + (c.position[0] - c.target[0]) * k, c.target[1] + (c.position[1] - c.target[1]) * k, c.target[2] + (c.position[2] - c.target[2]) * k] as Vec3,
});
const path = (keys: Key[], f: number) => beatPath(keys.map(({ k, ...key }) => wide({ fov: 40, ...key }, k ?? K)), f);
const lastCam = (keys: Key[]): CameraShot => ({ fov: 40, ...wide(keys[keys.length - 1], keys[keys.length - 1].k ?? K) }) as CameraShot;

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

// ---------- cast (Baden 1816-17; the historian is present day) ----------

// `wraps` in a dark leather colour draws knee-high riding boots (the kit has no boots; its wraps are the shin piece)
const DRAIS: PuppetLook = { skin: "#efc8a6", hair: "#2a1e18", outfit: "#2e4a3a", vest: "#b88a3a", pants: "#dcc8a0", wraps: "#1a1412", shoes: "#1a1412" };
// In profile the kit draws the waistcoat over the whole torso (it read as a yellow backpack): side views drop it.
const DRAIS_SIDE: PuppetLook = { ...DRAIS, vest: undefined };
const FARMER: PuppetLook = { skin: "#e2b08a", hair: "#6a4a30", beard: "#6a4a30", hat: "#5a4030", outfit: "#e4dcc8", pants: "#4a3424", wraps: "#3a2a1e", shoes: "#2a1e14" };
const TOWNSMAN: PuppetLook = { skin: "#efc8a8", hair: "#5a4a3a", outfit: "#6a6a72", vest: "#2e2a30", pants: "#8a8a90", wraps: "#141214", shoes: "#141214" };
const TOWNSWOMAN: PuppetLook = { skin: "#f2cdb2", hair: "#4a3020", long: true, skirt: true, outfit: "#4a6a9a", shoes: "#2a1a12" };
// const BOY: PuppetLook = { skin: "#f2cca8", hair: "#d8b060", outfit: "#7a5a3a", vest: "#4a3a2a", pants: "#3a3430", shoes: "#2a1a10" };
const HISTORIAN: PuppetLook = { skin: "#e8c0a0", hair: "#b8b4ac", glasses: true, outfit: "#7a7a80", vest: "#3a5a8a", pants: "#2a2a34", shoes: "#5a3a24" }; // period-ok: present-day historian

const COSTUMES: Record<string, Costume> = {
  drais: { topHat: "#17151a", cravat: true, tails: "#2e4a3a" },
  townsman: { topHat: "#1e1a1c", cravat: true, tails: "#6a6a72" },
  townswoman: { bonnet: "#e8cf8a", ribbon: "#8a2a3a", shawl: "#efe6d0" },
};
const fg = (cast: PuppetPlacement[], looks: Record<string, Costume> = COSTUMES, extra?: React.ReactNode) => (
  <>
    <Costumes cast={cast} looks={looks} />
    {extra}
  </>
);

// Drais on the running machine at `bike` (its centre), heading +x (facing 1) or -x (facing -1): seated on the
// saddle, hands on the cross handle, the feet running on the ground in step with the distance covered.
const rider = (bike: Vec3, facing: 1 | -1, dist: number, camera: CameraShot, opts: { crop?: boolean; push?: number; lift?: number; expression?: Partial<PuppetPose>; z?: number } = {}): PuppetPlacement => {
  const heading = facing === 1 ? 0 : Math.PI;
  const at: [number, number] = [bike[0] - facing * SADDLE_BACK, bike[2] + (opts.z ?? 0.07)];
  const push = opts.push ?? 1; // 1 running, 0 gliding with the legs held still
  const w = walkAt(dist, push);
  const hand = onMachine(bike, heading, HANDLE.ahead, HANDLE.y, 0.08);
  const reach = solveReach(at, [hand[0], hand[1] + (opts.lift ?? 0) * 0.0012, hand[2]], camera, [facing * 180, -420]);
  return {
    id: "drais",
    look: DRAIS_SIDE,
    at,
    crop: opts.crop, // framed by hand: keepHeads' yaw pans swing the far horizon (the plume) across the frame
    pose: {
      view: "side",
      facing,
      ...w,
      bob: (w.bob ?? 0) * 0.25 + (opts.lift ?? 0),
      lean: 0,
      bend: 0.12,
      reachR: reach,
      reachL: reach,
      handR: "fist",
      handL: "fist",
      ...(opts.expression ?? {}),
    } as PuppetPose,
  };
};

// ---------- 1. Hook (0-126): Drais glides out of Mannheim on the running machine; an ash plume on the horizon ----------

const S1: React.FC = () => {
  const f = useShotFrame(); // 0..125
  const camera = path(
    [
      { at: 0, position: [-0.5, 1.06, 3.85], target: [-0.5, 1.02, 0.0] },
      { at: 125, position: [2.25, 1.04, 3.45], target: [2.25, 1.0, 0.0] },
    ],
    f,
  );
  // he rides with the eased camera, drifting a little ahead of it (the camera still travels 2.75 m past the town)
  const x = camera.target[0] - 0.12 + 0.12 * (f / 125);
  const dist = x + 3;
  const bike: Vec3 = [x, 0, 0];
  const cast: PuppetPlacement[] = [rider(bike, 1, dist, camera, { crop: true, expression: { ...faceChange([[0, "excited"], [70, "happy"]], f), lookX: 0.6 } })];
  return (
    <>
      <Stage
        set={
          <TownSet camera={camera} frame={f} mode="morning" plume={1} houses={[-99, -1.0]}>
            <Draisine position={bike} dist={dist} />
          </TownSet>
        }
        camera={camera}
        bg="#e8e4d4"
        blur={1.6}
        puppets={cast}
        light={townLight("morning")}
        foreground={fg(cast)}
      />
      <Headline f={f} text="HOW DID ASH BUILD A BIKE?" at={4} out={118} size={70} />
    </>
  );
};

// ---------- 2. April 1815 (126-305): Mount Tambora explodes, seen across the bay at night ----------

const BLAST = 88;
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..178
  const keys: Key[] = [
    { at: 0, position: [0.0, 1.3, 6.2], target: [4, 10, -78] },
    { at: BLAST, position: [0.05, 1.42, 6.2], target: [4, 13, -78] },
    { at: 178, position: [0.1, 1.5, 6.2], target: [4, 17.5, -78] },
  ];
  const camera = path(keys, f);
  const shudder = f > BLAST - 26 && f < BLAST ? 0.4 * Math.sin(f * 2.1) : 0;
  const blast = 0.12 * ease(f, 0, 50) + 0.88 * ease(f, BLAST, BLAST + 50);
  return (
    <Stage
      set={
        <VolcanoSet camera={{ ...camera, target: [camera.target[0] + shudder, camera.target[1], camera.target[2]] }} frame={f + 126} mode="night" blast={blast}>
          <SignBoard position={[-0.3, 0, -2.0]} text={"TAMBORA\nAPRIL 1815"} width={0.95} height={2.4} rotationY={0.05} appear={f - 8} bg="#f2dcb0" />
          <Palm position={[1.45, 0, 3.6]} scale={0.9} lean={-0.25} frame={f + 126} color="#1e1416" frond="#16201a" />
        </VolcanoSet>
      }
      camera={camera}
      bg="#1a1424"
      blur={0.6}
      focus={8.0}
      energy={0.4}
      puppets={[]}
    />
  );
};

// ---------- 3. Its sulphur veils the sky (305-402): dawn, the veil spreads, the sun dims ----------

const S3: React.FC = () => {
  const f = useShotFrame(); // 0..96
  const camera = path(
    [
      { at: 0, position: [0.1, 1.5, 6.2], target: [4, 17.5, -78] },
      { at: 96, position: [0.6, 1.9, 5.2], target: [14, 34, -60] },
    ],
    f,
  );
  return (
    <Stage
      set={
        <VolcanoSet camera={camera} frame={f + 305} mode="veil" veil={ease(f, 0, 90)}>
        </VolcanoSet>
      }
      camera={camera}
      bg="#8a8090"
      blur={1.2}
      puppets={[]}
    />
  );
};

// ---------- 4. 1816, the year without a summer (402-537): cold rain rots the harvest ----------

const F_AT4: [number, number] = [0.15, 0.1];
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..135
  const camera = path(
    [
      { at: 0, position: [-0.2, 1.1, 3.9], target: [-0.05, 0.92, 0.0] },
      { at: 135, position: [0.0, 1.0, 3.0], target: [0.05, 0.9, 0.0] },
    ],
    f,
  );
  const bendDown = ease(f, 70, 92) * (1 - ease(f, 112, 128));
  const cast: PuppetPlacement[] = [
    {
      id: "farmer",
      look: FARMER,
      at: F_AT4,
      pose: {
        view: "front",
        ...faceChange([[0, "worried"], [60, "sad"]], f),
        bend: 0.25 * bendDown,
        reachR: [mix(130, 170, bendDown), mix(-520, -330, bendDown)],
        handR: "open",
        reachL: [-120, -500],
        lookX: -0.2,
        headTilt: -8 * bendDown,
      },
    },
  ];
  return (
    <Stage
      set={
        <FieldSet camera={camera} frame={f + 402}>
          <SignBoard position={[-0.25, 0, -0.35]} text="1816" width={0.3} height={1.0} appear={f - 26} bg="#e4dcc8" />
        </FieldSet>
      }
      camera={camera}
      bg="#8e98a4"
      blur={1.8}
      puppets={cast}
      light={{ tint: "#c8d4e4", tintAmount: 0.12, shadow: 0.25, distant: [{ direction: [-0.3, 0.8, 0.4] as Vec3, color: "#d8e0ec", strength: 0.6 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 5. The stable (537-690): oats scarce; "Not a single oat left!" ----------

const F_AT5: [number, number] = [-0.3, -0.1];
const TIPS = 107; // the sack goes upside down
const OAT = 125; // the one oat drops out
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..152
  const keys: Key[] = [
    { at: 0, position: [0.25, 1.12, 4.35], target: [0.25, 0.82, -0.5] },
    { at: 152, position: [0.2, 1.05, 4.0], target: [0.2, 0.8, -0.5] },
  ];
  const camera = path(keys, f);
  const tip = ease(f, TIPS, TIPS + 10);
  const shake = f > TIPS + 8 && f < 140 ? Math.sin((f - TIPS) * 1.3) * (1 - ease(f, 128, 140)) : 0;
  // the empty sack hangs from his right hand (its neck in his fist); he lifts it, turns it mouth-down and shakes it
  const reachR: [number, number] = [mix(175, 205, tip) + 14 * shake, mix(-430, -760, tip) + 18 * shake];
  const hand = handWorld(F_AT5, reachR, camera);
  const sack: Vec3 = [hand[0], hand[1] - 0.19, hand[2] + 0.02];
  const oatT = Math.max(0, f - OAT);
  const oatY = Math.max(0.012, sack[1] - 0.2 - 0.5 * 0.0045 * oatT * oatT);
  const sniff = ease(f, 131, 145);
  const cast: PuppetPlacement[] = [
    {
      id: "farmer",
      look: FARMER,
      at: F_AT5,
      pose: {
        view: "front",
        ...faceChange([[0, "worried"], [TIPS + 6, "angry"], [OAT + 4, "shocked"], [142, "sad"]], f),
        reachR,
        handR: "fist",
        frontR: true,
        reachL: f > TIPS && f < 138 ? [-210, -780] : [-130, -500],
        handL: "open",
        lookX: f < 100 ? 0.6 : 0.2,
        headTilt: f > OAT ? -6 : 0,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#7a6a40" wall="#6e6a42" wallPattern="panel" floorPattern="wood" width={6} depth={3.4}>
          {/* stall boards, an empty hay rack, straw on the floor */}
          <InkBox size={[0.08, 1.1, 1.0]} position={[1.6, 0.55, -1.2]} color="#5a4428" ink={0.01} />
          <InkBox size={[2.4, 0.08, 0.08]} position={[0.45, 1.05, -1.62]} color="#5a4428" ink={0.008} />
          <InkBox size={[1.0, 0.4, 0.22]} position={[-0.25, 1.4, -1.58]} color="#4a3820" ink={0.01} />
          {[-0.65, -0.45, -0.25, -0.05, 0.15].map((x) => (
            <InkBox key={x} size={[0.02, 0.4, 0.02]} position={[x, 1.4, -1.45]} color="#3a2a18" ink={0.003} />
          ))}
          <InkBox size={[2.6, 0.015, 1.2]} position={[0.4, 0.008, -0.9]} color="#c8b070" ink={0} />
          <FarmHorse position={[0.5, 0, -1.0]} rotationY={-Math.PI / 2} neck={mix(24, 38, sniff)} tail={-14} scale={0.62} />
          <group userData={{ ghost: true }}>
            <Sack position={sack} rotation={[0, 0, Math.PI * tip + 0.15 * shake]} empty={1} scale={1.1} />
            {f >= OAT && (
              <mesh position={[sack[0] + 0.01, oatY, sack[2] + 0.02]} scale={[0.014, 0.026, 0.014]}>
                <sphereGeometry args={[1, 8, 6]} />
                <meshToonMaterial color="#e8d090" />
              </mesh>
            )}
          </group>
          {/* the OATS label stays upright on the sack's front */}
          <Label text="OATS" position={[sack[0], sack[1] - 0.02, sack[2] + 0.14]} width={0.22} bg="#e8d8b0" />
          <Burst kind="dust" at={[sack[0], 0.02, sack[2]]} frame={f - OAT - 9} count={6} size={0.15} seed={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#f4e4b8", tintAmount: 0.1, shadow: 0.28, distant: [{ direction: [-0.6, 0.5, 0.6] as Vec3, color: "#ffe8b0", strength: 1.0 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 6. The square, grey (690-844): horse meat on the board; a cart without a horse; everybody walks ----------

const S6: React.FC = () => {
  const f = useShotFrame(); // 0..161
  const keys: Key[] = [
    { at: 0, position: [-0.7, 1.2, 3.4], target: [-0.6, 1.1, -1.2] },
    { at: 161, position: [0.9, 1.05, 3.4], target: [0.9, 0.92, -0.8] },
  ];
  const camera = path(keys, f);
  const m = stroll(f, 12, 138, [-1.05, -0.7], [0.4, -0.7]);
  const w = stroll(f, 18, 132, [-0.05, -1.0], [1.35, -1.0]);
  const cast: PuppetPlacement[] = [
    { id: "townsman", look: TOWNSMAN, at: m.at, pose: { ...faceChange([[0, "sad"], [120, "bored"]], f), ...m.pose } as PuppetPose },
    { id: "townswoman", look: TOWNSWOMAN, at: w.at, pose: { ...faceChange([[0, "worried"], [130, "sad"]], f), ...w.pose } as PuppetPose },
  ];
  return (
    <Stage
      set={
        <TownSet camera={camera} frame={f + 690} mode="overcast">
          <HangingSign position={[0.1, 2.3, HOUSE_Z]} text={"HORSE\nMEAT"} frame={f + 690} width={0.62} appear={f - 34} />
          <Cart position={[-0.9, 0, -1.75]} />
          <HitchPost position={[1.25, 0, -1.8]} />
          <WallLantern position={[0.9, 1.9, HOUSE_Z]} />
        </TownSet>
      }
      camera={camera}
      bg="#b8bcc0"
      blur={1.8}
      puppets={cast}
      light={townLight("overcast")}
      foreground={fg(cast)}
    />
  );
};

// ---------- 7. The workshop (844-1068): a horse that never eats; built of wood; where did the legs go? ----------

const D_AT7: [number, number] = [-0.05, -0.55];
const MACH7: Vec3 = [0.45, 0, -0.75];
const MACH7_HEADING = 0.9; // turned three-quarters toward the camera so the covered machine fits the frame
const UNVEIL = 140;
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..223
  const keys: Key[] = [
    { at: 0, position: [0.12, 1.15, 2.85], target: [0.15, 0.95, -0.6] },
    { at: 74, position: [0.14, 1.12, 2.65], target: [0.16, 0.93, -0.6] },
    { at: UNVEIL + 8, position: [0.25, 1.05, 3.3], target: [0.27, 0.88, -0.55] },
    { at: 223, position: [0.28, 1.02, 3.2], target: [0.3, 0.88, -0.55] },
  ];
  const camera = path(keys, f);
  const lift = ease(f, 60, 78) * (1 - ease(f, 120, 134));
  const toy: Vec3 = [D_AT7[0] - 0.24, mix(0.42, 0.6, lift), D_AT7[1] + 0.12];
  const reachL = solveReach(D_AT7, [toy[0], toy[1] + 0.3, toy[2]], camera, [-200, -500]);
  const grab = ease(f, UNVEIL - 14, UNVEIL - 4) * (1 - ease(f, UNVEIL + 10, UNVEIL + 20));
  const sheetEdge: Vec3 = [MACH7[0] - 0.05, 0.36, MACH7[2] + 0.1]; // the saddle he slaps
  const reachRS = solveReach(D_AT7, sheetEdge, camera, [200, -450]);
  const slap = mix2([130, -520], reachRS, grab);
  // after the slap the hand glides up to scratch his head under the hat, then down again (no snap)
  const up = ease(f, 170, 182) * (1 - ease(f, 210, 222));
  const reachR: [number, number] = mix2(slap, [70 + 10 * Math.sin(f * 0.9) * up, -905], up);
  const cast: PuppetPlacement[] = [
    {
      id: "drais",
      look: DRAIS,
      at: D_AT7,
      pose: {
        view: "front",
        ...faceChange([[0, "thinking"], [70, "excited"], [UNVEIL + 6, "happy"], [168, "confused"]], f),
        reachL,
        handL: "fist",
        frontL: true,
        reachR,
        handR: grab > 0.5 ? "fist" : "open",
        frontR: up > 0.5,
        lookX: f < 110 ? -0.5 : 0.6,
        headTilt: f > 168 ? 8 : 0,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#8a6438" wall="#c89a5a" wallPattern="panel" floorPattern="wood" width={6} depth={3}>
          <Bench position={[-0.75, 0, -0.95]} width={1.3} />
          <ToolBoard position={[-0.7, 1.45, -1.44]} />
          <TableLamp position={[-1.15, 0.62, -0.95]} f={f + 844} on={0.8} />
          <InkBox size={[0.7, 0.05, 0.06]} position={[-0.6, 0.65, -0.85]} rotation={[0, 0.2, 0]} color="#c08a4e" ink={0.005} />
          <group userData={{ ghost: true }}>
            <HobbyHorse position={toy} rotation={[0, 0, 0.12]} scale={0.85} />
          </group>
          <Draisine position={MACH7} heading={MACH7_HEADING} dist={0} />
          <Burst kind="confetti" at={[MACH7[0], 0.45, MACH7[2] + 0.1]} frame={f - UNVEIL - 2} count={18} size={0.5} speed={0.6} colors={["#e8c898", "#c8985a", "#f4dcb0"]} seed={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#ffe4b0", tintAmount: 0.1, shadow: 0.25, points: [{ position: [-1.15, 1.0, -0.8] as Vec3, color: "#ffc070", strength: 1.6, range: 3 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 8. You see (1068-1198): the machine alone in the truth room: two wheels, a seat, steering ----------

const BIKE8: Vec3 = [-0.1, 0, -0.1];
const TruthRoom: React.FC<{ camera: CameraShot; children?: React.ReactNode }> = ({ camera, children }) => (
  <Room camera={camera} mood="cold" floor="#18224a" wall="#24305e" wallPattern="plain" floorPattern="concrete" width={8} depth={3.2}>
    <Plinth position={[-0.9, 0, -1.1]} r={0.4} h={0.06} />
    <Plinth position={[0.9, 0, -1.1]} r={0.4} h={0.06} />
    <pointLight position={[0, 2.2, 1.2]} color="#b8c8ff" intensity={1.6} distance={6} />
    {children}
  </Room>
);
const truthLight = { tint: "#c8d8ff", tintAmount: 0.12, shadow: 0.3, distant: [{ direction: [0.3, 0.7, 0.6] as Vec3, color: "#d8e4ff", strength: 0.9 }] };
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..129
  const keys: Key[] = [
    { at: 0, position: [-0.15, 0.78, 3.0], target: [-0.12, 0.45, -0.1] },
    { at: 48, position: [-0.02, 0.52, 2.35], target: [-0.04, 0.36, -0.1] },
    { at: 86, position: [-0.2, 0.6, 2.3], target: [-0.16, 0.42, -0.1] },
    { at: 129, position: [-0.08, 0.66, 2.45], target: [-0.08, 0.48, -0.1] },
  ];
  const camera = path(keys, f);
  const lab = (text: string, at: number, until: number, p: Vec3, width: number) => (f >= at - 1 && f < until ? <Label key={text} text={text} position={p} width={width} appear={f - at} bg="#d8ecff" /> : null);
  return (
    <Stage
      set={
        <TruthRoom camera={camera}>
          <Draisine position={BIKE8} dist={0} steer={f > 100 ? 18 * Math.sin((f - 100) * 0.12) : 0} />
          {lab("TWO WHEELS", 46, 84, [BIKE8[0] - 0.1, 0.62, 0.1], 0.42)}
          {lab("SEAT", 84, 999, [BIKE8[0] - SADDLE_BACK - 0.05, 0.52, 0.05], 0.22)}
          {lab("STEERING", 106, 999, [BIKE8[0] + HANDLE.ahead + 0.12, 0.68, 0.0], 0.34)}
        </TruthRoom>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.6}
      puppets={[]}
    />
  );
};

// ---------- 8b. No pedals (1198-1305): Drais pushes off the ground with his feet and glides; a stamp to stop ----------

const PUSH = 40; // first push
const GLIDE = 72;
const STOP = 94;
// metres moved by the machine: runs from PUSH, glides from GLIDE, stamped to a stop at STOP
const moved8 = (g: number) => {
  if (g < PUSH) return 0;
  const v = 0.024;
  const run = Math.min(g, GLIDE) - PUSH;
  const glide = Math.max(0, Math.min(g, STOP) - GLIDE);
  return (v * (run * run)) / (2 * (GLIDE - PUSH)) + v * glide * (1 - glide / (2.6 * (STOP - GLIDE)));
};
const B8B: Vec3 = [-0.55, 0, -0.1];
const S8B: React.FC = () => {
  const f = useShotFrame(); // 0..106
  const dx = moved8(f);
  const bike: Vec3 = [B8B[0] + dx, 0, B8B[2]];
  // the camera rides along with the machine, a little ahead of it, and pushes in slightly
  const cx = B8B[0] + 0.12 + dx + 0.18 * ease(f, 0, 106);
  const camera = path(
    [
      { at: 0, position: [cx, 0.98, 3.5], target: [cx, 0.92, -0.1] },
      { at: 106, position: [cx, 0.96, 3.25], target: [cx, 0.9, -0.1] },
    ],
    f,
  );
  const wobble = f > GLIDE ? 14 * Math.sin((f - GLIDE) * 0.5) * (1 - ease(f, GLIDE + 8, STOP)) : 0;
  const stamp = ease(f, STOP - 4, STOP) * (1 - ease(f, STOP + 8, STOP + 14));
  const runDist = f < GLIDE ? 1.2 + dx * 1.35 : 1.2 + moved8(GLIDE) * 1.35;
  const cast: PuppetPlacement[] = [
    rider(bike, 1, f < PUSH ? 1.2 : runDist, camera, {
      crop: true,
      push: f < PUSH ? 0 : f < GLIDE ? 1 : f < STOP - 4 ? 0.15 : 0.6,
      expression: { ...faceChange([[0, "smug"], [PUSH, "excited"], [GLIDE + 4, "happy"], [STOP - 6, "shocked"], [STOP + 6, "smug"]], f), lookX: f < 30 ? -0.5 : 0.6, legSwing: stamp * 18 },
    }),
  ];
  return (
    <Stage
      set={
        <TruthRoom camera={camera}>
          <Draisine position={bike} dist={dx} steer={wobble} />
          {f >= 8 && f < 44 && <Label text="NO PEDALS" position={[bike[0] + 0.32, 0.6, 0.12]} width={0.5} appear={f - 10} bg="#ffe0dc" />}
          {f < 40 && <NoPedal position={[bike[0] + 0.215, 0.15, 0.08]} appear={f - 10} />}
          <Burst kind="dust" at={[bike[0] - 0.05, 0.02, bike[2] + 0.12]} frame={f - PUSH - 2} count={6} size={0.25} seed={2} />
          <Burst kind="dust" at={[bike[0] + 0.05, 0.02, bike[2] + 0.12]} frame={f - PUSH - 16} count={6} size={0.25} seed={6} />
          <Burst kind="dust" at={[bike[0] + 0.1, 0.02, bike[2] + 0.12]} frame={f - STOP} count={10} size={0.35} seed={9} />
        </TruthRoom>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.6}
      puppets={cast}
      light={truthLight}
      foreground={fg(cast)}
    />
  );
};

// ---------- 9. 12 June 1817 (1305-1459): out on the lane to the coaching inn; the pothole ----------

const BUMP = 78;
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..154
  const keys: Key[] = [
    { at: 0, position: [-1.3, 0.98, 3.5], target: [-1.3, 0.92, 0.0] },
    { at: 154, position: [2.3, 1.05, 3.6], target: [2.3, 0.98, -0.3] },
  ];
  const camera = path(keys, f);
  const x = camera.target[0] - 0.15 + 0.1 * (f / 154);
  const dist = x + 4;
  const b = f - BUMP;
  const bounce = b >= 0 && b < 14 ? Math.sin((b / 14) * Math.PI) * 70 : 0;
  const hatOff = b >= 0 && b < 26 ? Math.sin((b / 26) * Math.PI) * 0.28 : 0;
  const tilt = b >= 0 && b < 10 ? -0.08 * Math.sin((b / 10) * Math.PI) : 0;
  const cast: PuppetPlacement[] = [
    rider([x, 0, 0], 1, dist, camera, {
      crop: true,
      lift: bounce,
      push: b >= 0 && b < 24 ? 0.2 : 1,
      expression: { ...faceChange([[0, "happy"], [BUMP, "shocked"], [BUMP + 26, "excited"]], f), lookX: 0.6 },
    }),
  ];
  const looks = { ...COSTUMES, drais: { ...COSTUMES.drais, hatOff } };
  return (
    <Stage
      set={
        <LaneSet camera={camera} frame={f + 1305}>
          <Milestone position={[-0.75, 0, -0.95]} text={"JUNE 12\n1817"} appear={f - 6} hide={ease(f, 50, 58)} />
          <Pothole position={[path(keys, BUMP).target[0] - 0.15 + 0.1 * (BUMP / 154) + 0.25, 0, 0.0]} splash={b} />
          <group position={[x, bounce * 0.0004, 0]} rotation={[0, 0, tilt]}>
            <Draisine position={[0, 0, 0]} dist={dist} />
          </group>
          <Inn position={[2.25, 0, -3.6]} frame={f + 1305} appear={f - 112} />
        </LaneSet>
      }
      camera={camera}
      bg="#dcecf0"
      blur={1.6}
      puppets={cast}
      light={{ tint: "#fff4e0", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [-0.6, 0.8, 0.5] as Vec3, color: "#fff2dc", strength: 1.0 }] }}
      foreground={fg(cast, looks)}
    />
  );
};

// ---------- 10. One historian argues (1459-1578): the horse of 1816, the machine of 1817; nobody can prove it ----------

const H_AT: [number, number] = [0.05, -0.75];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..117
  const keys: Key[] = [
    { at: 0, position: [-0.1, 1.08, 2.6], target: [-0.02, 1.02, -1.0] },
    { at: 117, position: [0.1, 1.02, 2.3], target: [0.1, 0.98, -0.9] },
  ];
  const camera = path(keys, f);
  const pointH = ease(f, 18, 28) * (1 - ease(f, 44, 52));
  const pointM = ease(f, 50, 58) * (1 - ease(f, 74, 82));
  const cast: PuppetPlacement[] = [
    {
      id: "historian",
      look: HISTORIAN,
      at: H_AT,
      pose: {
        view: "front",
        ...faceChange([[0, "thinking"], [20, "determined"], [84, "awkward"]], f),
        reachL: pointH > 0 ? mix2([-130, -520], [-300, -820], pointH) : [-130, -520],
        handL: pointH > 0.5 ? "point" : "open",
        reachR: pointM > 0 ? mix2([130, -520], [300, -820], pointM) : [130, -520],
        handR: pointM > 0.5 ? "point" : "open",
        gesture: f > 86 ? "shrug" : undefined,
        lookX: pointH > 0.3 ? -0.7 : pointM > 0.3 ? 0.7 : 0,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#3a2a44" wall="#5a4a7a" wallPattern="wallpaper" floorPattern="wood" width={5} depth={3}>
          <Picture position={[-0.42, 1.6, -1.44]} what="horse" size={[0.36, 0.28]} />
          <Picture position={[0.55, 1.6, -1.44]} what="machine" size={[0.36, 0.28]} />
          <Label text="1816" position={[-0.42, 1.36, -1.42]} width={0.2} bg="#efe4c8" appear={f - 22} />
          <Label text="1817" position={[0.55, 1.36, -1.42]} width={0.2} bg="#efe4c8" appear={f - 54} />
          <InkBox size={[1.2, 0.52, 0.5]} position={[0.05, 0.26, -0.25]} color="#4a2e2a" ink={0.01} />
          <DeskLamp position={[-0.42, 0.52, -0.25]} />
          <InkBox size={[0.24, 0.06, 0.18]} position={[0.42, 0.55, -0.25]} color="#7a2a2a" ink={0.005} />
          <InkBox size={[0.22, 0.05, 0.17]} position={[0.42, 0.605, -0.25]} color="#2a4a6a" ink={0.005} />
          <Label text="UNPROVEN" position={[0.06, 1.62, -1.4]} rotation={[0, 0, 0.16]} width={0.44} fg="#c81e24" bg="#fff2e8" appear={f - 88} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.0}
      puppets={cast}
      light={{ tint: "#d8c0ff", tintAmount: 0.12, shadow: 0.3, points: [{ position: [-0.3, 0.8, -0.1] as Vec3, color: "#fff0d0", strength: 1.1, range: 2.2 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 11. Dusk in Mannheim (1578-1753): pedals came decades later; a wooden horse that never needed oats ----------

const S11: React.FC = () => {
  const f = useShotFrame(); // 0..173
  const keys: Key[] = [
    { at: 0, position: [0.05, 1.55, 4.95], target: [0.05, 1.05, -0.8] },
    { at: 173, position: [0.12, 1.1, 4.6], target: [0.12, 1.0, -0.5] },
  ];
  const camera = path(keys, f);
  const x = 0.18 + 0.1 * ease(f, 0, 173) + 0.0005 * f;
  const dist = x + 5;
  const bike: Vec3 = [x, 0, 0.0];
  const cast: PuppetPlacement[] = [
    rider(bike, 1, dist, camera, { push: 1 - 0.7 * ease(f, 110, 130), expression: { ...faceChange([[0, "happy"], [120, "excited"]], f), lookX: -0.4 } }),
    { id: "townsman", look: TOWNSMAN, at: [-0.75, -1.5], pose: { view: "front", ...moveChange([[0, "shocked"], [30, "shocked", "point"], [60, "happy", "point"], [120, "happy"]], f), lookX: 0.6 } },
    { id: "townswoman", look: TOWNSWOMAN, at: [-0.15, -1.7], pose: { view: "front", ...moveChange([[0, "excited"], [70, "excited", "clap"], [90, "happy", "clap"], [140, "happy"]], f), lookX: 0.4 } },
  ];
  return (
    <Stage
      set={
        <TownSet camera={camera} frame={f + 1578} mode="dusk">
          <Draisine position={bike} dist={dist} />
          <WallLantern position={[-0.35, 1.9, HOUSE_Z]} lit={1} />
          <WallLantern position={[1.45, 1.9, HOUSE_Z]} lit={1} />
          <HitchPost position={[0.75, 0, -1.75]} />
        </TownSet>
      }
      camera={camera}
      bg="#e8a898"
      blur={1.8}
      puppets={cast}
      light={townLight("dusk")}
      foreground={fg(cast)}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 126, S1, false],
  [126, 305, S2, "dip"],
  [305, 402, S3, "dissolve"],
  [402, 537, S4, "dip"],
  [537, 690, S5, "dip"],
  [690, 844, S6, "dip"],
  [844, 1068, S7, "dip"],
  [1068, 1198, S8, "dip"],
  [1198, 1305, S8B, "dissolve"],
  [1305, 1459, S9, "dip"],
  [1459, 1578, S10, "dip"],
  [1578, TIMING.totalFrames, S11, "dip"],
];

const SFX: Sfx[] = [
  // the hook: wooden wheels on cobbles, feet running
  { at: 0, src: sfx("steps"), volume: 0.1, until: 126 },
  // Tambora: the rumble, the blast, the roar of the column
  { at: 126, src: sfx("rumble"), volume: 0.14, until: 305 },
  { at: 126 + 8, src: sfx("pop"), volume: 0.7 },
  { at: 126 + BLAST, src: sfx("boom"), volume: 0.55, space: "far" },
  { at: 126 + BLAST + 4, src: sfx("crackle"), volume: 0.12, until: 305 },
  // the veil
  { at: 305, src: sfx("wind"), volume: 0.14, until: 402 },
  // 1816: rain
  { at: 402, src: sfx("river"), volume: 0.06, until: 537 },
  { at: 402, src: sfx("wind"), volume: 0.1, until: 537 },
  { at: 402 + 26, src: sfx("pop"), volume: 0.45 },
  // the stable: the sack shaken, the oat, the horse sniffs
  { at: 537 + TIPS, src: sfx("flutter"), volume: 0.5, space: "room" },
  { at: 537 + OAT + 9, src: sfx("plop"), volume: 0.35, space: "room" },
  { at: 537 + 133, src: sfx("sniff"), volume: 0.3, space: "room" },
  // the square: the sign creaks, feet on cobbles
  { at: 690 + 34, src: sfx("pop"), volume: 0.45 },
  { at: 690 + 10, src: sfx("creak"), volume: 0.25, space: "outdoor" },
  { at: 690 + 40, src: sfx("steps"), volume: 0.07, until: 844 },
  // the workshop: the sheet comes off
  { at: 844 + UNVEIL, src: sfx("stamp"), volume: 0.65, space: "room" },
  { at: 1033, src: sfx("riser"), volume: 0.12, until: 1068 },
  // the truth room
  { at: 1068 + 4, src: sfx("sting"), volume: 0.3 },
  ...[46, 84, 106].map((t, i) => ({ at: 1068 + t, src: sfx("pop"), volume: [0.9, 0.62, 1.0][i] })),
  { at: 1198 + 10, src: sfx("pop"), volume: 0.95 },
  { at: 1198 + PUSH, src: sfx("steps"), volume: 0.12, until: 1198 + GLIDE },
  { at: 1198 + STOP, src: sfx("skid"), volume: 0.5, space: "room" },
  // the lane: the pothole, the inn sign
  { at: 1305, src: sfx("steps"), volume: 0.09, until: 1305 + BUMP },
  { at: 1305 + BUMP, src: sfx("splash"), volume: 0.32, space: "outdoor" },
  { at: 1305 + BUMP + 2, src: sfx("squeak"), volume: 0.45, space: "outdoor" },
  { at: 1305 + BUMP + 20, src: sfx("steps"), volume: 0.09, until: 1459 },
  { at: 1305 + 6, src: sfx("pop"), volume: 0.8 },
  { at: 1305 + 112, src: sfx("pop"), volume: 0.8 },
  // the study
  { at: 1459 + 22, src: sfx("pop"), volume: 1.0 },
  { at: 1459 + 54, src: sfx("pop"), volume: 0.55 },
  { at: 1459 + 88, src: sfx("stamp"), volume: 1.0, space: "room" },
  // dusk
  { at: 1578, src: sfx("steps"), volume: 0.06, until: 1578 + 140 },
  { at: 1578 + 100, src: sfx("chime"), volume: 0.3, space: "outdoor" },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 126, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 126, to: 537, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 537, to: 844, volume: 0.28 },
  { src: MUSIC_FILES.lounge, from: 844, to: 1068, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 1068, to: 1305, volume: 0.26 },
  { src: MUSIC_FILES.upbeat, from: 1305, to: 1578, volume: 0.24 },
  { src: MUSIC_FILES.upbeat, from: 1578, to: TIMING.totalFrames, volume: 0.2 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
