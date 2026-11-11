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
  stroll,
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
import { GasBracket } from "../what-if-lincoln/props";
import { BottleShelf, LabWindow, WallDate } from "../xray-hand/props";
import {
  CoffeeCup,
  CostumeOverlays,
  DeskLamp,
  DrawerCabinet,
  Flashlight,
  GIANT,
  GiantRelay,
  Letter,
  LogLine,
  Logbook,
  Moth,
  Overlay,
  pagePoint,
  Rack,
  Stick,
  RedLamp,
  relayCloses,
  RELAY_POINTS,
  relayState,
  RelayPanel,
  Typewriter,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The Real Insect Trapped in Relay 70": Harvard, 9 September 1947. During a test of the Mark II relay calculator the
// operators trace an error to Panel F, Relay 70: a moth between the contact points. Taped into the logbook at 1545,
// "First actual case of bug being found." A relay works only when its points touch; the moth kept them apart. The
// word bug was already old (Edison, 1878). Grace Hopper told the story; the page is in the Smithsonian today.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "relay-moth";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const ASPECT = 9 / 16;
// shot starts (video frames, from the line spans in timing.json)
const T = { s2: 124, s3: 346, s4: 458, s5: 556, s6: 739, s7: 959, s8: 1209, s9: 1341, s10: 1498, s11: 1643 } as const;

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

// ---------- cast (Harvard 1947; Menlo Park 1878; the museum today) ----------

const OPERATOR: PuppetLook = { skin: "#f0c8a8", hair: "#2a2220", outfit: "#f4f4f0", pants: "#3a3c42", shoes: "#141010" };
const OPERATOR2: PuppetLook = { skin: "#f2cca8", hair: "#6a4428", long: true, outfit: "#4a6a9a", skirt: true, skirtHem: -180, pants: "#d8b090", shoes: "#3a2418" };
const HOPPER: PuppetLook = { skin: "#eec6a6", hair: "#2a2220", outfit: "#2e4a3a", skirt: true, skirtHem: -180, pants: "#d4ac8c", shoes: "#1e1612" };
const COLLEAGUE: PuppetLook = { skin: "#e8bea0", hair: "#6a4a30", outfit: "#7a7e86", pants: "#5a5e66", shoes: "#141010" };
// 1878: a dark frock coat (coat body + skirts overlay), a waistcoat, white shirt front with a turned-down collar, a black bow tie (cravat), dark trousers; hair parted, clean-shaven, aged 31.
const EDISON: PuppetLook = { skin: "#eec6a4", hair: "#2a2420", outfit: "#f2f0e8", vest: "#26242a", pants: "#2e2c30", shoes: "#141010" };
const CURATOR: PuppetLook = { skin: "#d8a888", hair: "#b8b4ac", glasses: true, long: true, outfit: "#2a3a5a", pants: "#3a3a40", shoes: "#2a2a2a" };

const OVERLAYS: Record<string, Overlay> = {
  operator: { tie: "#1e2a4a" },
  operator2: { rolls: "#6a4428", collar: "#f4f4f0" },
  hopper: { curls: "#2a2220", collar: "#f4f0e6" },
  colleague: { tie: "#3a2a2a" },
  edison: { bow: "#141416", tails: "#26242a" },
};
const fg = (cast: PuppetPlacement[], extra?: React.ReactNode) => (
  <>
    <CostumeOverlays cast={cast} looks={OVERLAYS} />
    {extra}
  </>
);

// ---------- 1. Hook: close on the relays clacking; a moth flutters in and sticks between the points of 70 ----------

const HOOK_PANEL: Vec3 = [0, 1.2, 0];
const R70_IDX = 7; // row 1, column 2 of a 5-wide panel numbered from 63
const R70_HOOK = 12; // row 2, column 2 in the hook's taller panel (numbered from 58)
const R70: Vec3 = [0, HOOK_PANEL[1] - 0.13 * 1.5, 0];
const POINTS: Vec3 = add(R70, [RELAY_POINTS[0] * 1.5, RELAY_POINTS[1] * 1.5, 0.012]);
const LAND = 42;
// after the moth lands, relay 70 keeps slamming on it: pulled in at each of these frames, let go a few frames later
const SLAMS = [50, 63, 77, 90, 104];
const slamClose = (f: number) => {
  let c = 0;
  for (const s of SLAMS) if (f >= s - 2 && f < s + 9) c = Math.max(c, ease(f, s - 2, s) * (1 - ease(f, s + 4, s + 9)));
  return c;
};
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..123
  const camera = path(
    [
      { at: 0, position: [0.05, 1.12, 1.35], target: [0.0, 1.04, 0.0], fov: 40, k: 1.0 },
      { at: LAND, position: [0.0, 1.1, 1.05], target: [-0.03, 1.05, 0.0], fov: 40, k: 1.0 },
      { at: 123, position: [-0.04, 1.1, 0.82], target: [-0.05, 1.08, 0.0], fov: 40, k: 1.0 },
    ],
    f,
  );
  // the moth's flight: an arc from upper right into the points, flapping fast; then stuck, twitching
  const t = Math.min(1, f / LAND);
  const p0: Vec3 = [0.13, 1.13, 0.2];
  const p1: Vec3 = [0.1, 1.22, 0.22];
  const p2: Vec3 = [-0.03, 1.15, 0.1];
  const bez = (a: Vec3, b: Vec3, c: Vec3, s: number): Vec3 => lerp3(lerp3(a, b, s), lerp3(b, c, s), s);
  const flying = f < LAND;
  const mothPos: Vec3 = flying ? lerp3(bez(p0, p1, p2, t), POINTS, ease(f, LAND - 12, LAND)) : add(POINTS, [0, 0.002 * Math.sin(f * 1.3), 0]);
  const flap = flying ? 0.5 + 0.5 * Math.sin(f * 1.9) : 0.38 + 0.12 * Math.max(0, Math.sin(f * 0.9)) * (f % 40 < 14 ? 1 : 0);
  const slams = SLAMS;
  return (
    <>
      <Stage
        set={
          <Room camera={camera} mood="night" floor="#1a2224" wall="#1e2c2e" wallPattern="plain" floorPattern="concrete" width={4} depth={2}>
            <RelayPanel position={[HOOK_PANEL[0], HOOK_PANEL[1] + 0.195, 0]} f={f} rows={6} cols={5} first={58} plateRow={2} plateJamOnly jam={R70_HOOK} jamStop={flying ? 1 : 0.3} jamClose={flying ? undefined : slamClose(f)} still={0} />
            {/* the relay 70 drawn on its own so it can be held at the moth */}
            <group userData={{ ghost: true }}>
              <Moth position={mothPos} rotation={flying ? [0.3, 0.2 * Math.sin(f * 0.2), -0.5 + 0.3 * t] : [0.1, 0, Math.PI / 2 - 0.15]} flap={flap} size={0.12} />
            </group>
            {slams.map((s, i) => (
              <Burst key={s} kind="sparks" at={add(POINTS, [0.03, -0.012, 0.03])} frame={f - s} count={9} size={0.4} speed={0.6} seed={i + 3} />
            ))}
            <pointLight position={[0.3, 1.5, 0.6]} color="#ffb860" intensity={0.8} distance={3} />
            {/* a warm key on relay 70 so the eye goes to it */}
            <pointLight position={add(R70, [0.02, -0.03, 0.2])} color="#ffcf90" intensity={0.55} distance={0.4} />
            <pointLight position={add(POINTS, [0, 0, 0.08])} color="#ffc060" intensity={slams.some((s) => f - s >= 0 && f - s < 3) ? 0.2 : 0} distance={0.22} />
          </Room>
        }
        camera={camera}
        bg={moodBackground("night")}
        blur={1.6}
        puppets={[]}
        energy={0.6}
      />
      <Headline f={f} text={"WHY DID IT\nGO WRONG?"} at={4} out={115} size={70} />
    </>
  );
};

// ---------- the Computation Laboratory (shots 2-4) ----------

const LAB_WALL = { day: "#b8d4bc", alarm: "#7a3a34", dark: "#1a2440" };
const LAB_FLOOR = { day: "#6a5040", alarm: "#3a2420", dark: "#141a2a" };
type LabLight = keyof typeof LAB_WALL;
const RACK_Z = -1.0;
const RACK_XS = [-1.55, -0.92, -0.29, 0.34, 0.97];
const ComputationLab: React.FC<{ camera: CameraShot; frame: number; light: LabLight; open?: number; children?: React.ReactNode }> = ({ camera, frame, light, open = 0, children }) => (
  <Room camera={camera} mood={light === "day" ? "daylight" : light === "alarm" ? "dusk" : "night"} floor={LAB_FLOOR[light]} wall={LAB_WALL[light]} wallPattern="plaster" floorPattern="tile" width={6} depth={3}>
    {RACK_XS.map((x, i) => (
      <Rack key={x} position={[x, 0, RACK_Z]} f={frame} seed={i + 1} open={i === 2 ? open : 0} />
    ))}
    {/* the header board over the row */}
    <InkBox size={[3.2, 0.16, 0.06]} position={[-0.29, 2.0, RACK_Z + 0.2]} color="#2a3430" ink={0.008} />
    {light === "day" && <Label text="MARK II" position={[-0.75, 2.0, RACK_Z + 0.24]} width={0.5} bg="#e8e0c8" />}
    <LabWindow position={[1.85, 1.6, -1.43]} size={[0.7, 1.2]} sky={light === "day" ? "#e8f0f4" : "#0e1222"} curtain={light === "day" ? "#c8d8c0" : "#2a2a30"} glow={light === "day" ? 1.1 : 0.4} />
    {children}
  </Room>
);

// ---------- 2. Harvard, 9 September 1947: the Mark II, a room full of relays ----------

const O_AT2: [number, number] = [-1.08, -0.35];
const W_AT2: [number, number] = [-0.58, -0.5];
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..221 (video 124..345)
  // the first two keys hold HARVARD, the calendar and MARK II whole; the track right starts after them
  const camera = path(
    [
      { at: 0, position: [-0.98, 1.42, 3.8], target: [-1.02, 1.28, -1.0], fov: 40, k: 1.0 },
      { at: 75, position: [-0.98, 1.4, 3.5], target: [-1.02, 1.27, -1.0], fov: 40, k: 1.0 },
      { at: 130, position: [0.15, 1.5, 2.7], target: [0.2, 1.3, -1.0], fov: 40, k: 1.0 },
      { at: 175, position: [0.55, 1.28, 1.2], target: [0.5, 1.15, -0.7], fov: 40, k: 1.0 },
      { at: 221, position: [0.56, 1.2, 0.68], target: [0.5, 1.12, -0.7], fov: 40, k: 1.0 },
    ],
    f,
  );
  // on "a room full of relays" they turn and walk off to the racks (back view) as the camera tracks right
  const wo = stroll(f, 92, 40, O_AT2, [O_AT2[0] - 0.1, -0.68]);
  const ww = stroll(f, 96, 40, W_AT2, [W_AT2[0] - 0.05, -0.68]);
  const cast: PuppetPlacement[] = [
    { id: "operator", look: OPERATOR, at: f < 92 ? O_AT2 : wo.at, pose: f < 92 ? { view: "front", ...moveChange([[0, "neutral"], [50, "happy", "point"], [84, "happy"]], f), lookX: -0.5 } : { ...faceChange([[0, "happy"]], f), ...wo.pose, view: "back" } },
    { id: "operator2", look: OPERATOR2, at: f < 96 ? W_AT2 : ww.at, pose: f < 96 ? { view: "front", ...faceChange([[0, "happy"], [80, "thinking"]], f), reachR: [140, -560], reachL: [-140, -560], lookX: -0.4 } : { ...faceChange([[0, "happy"]], f), ...ww.pose, view: "back" } },
  ];
  return (
    <Stage
      set={
        <ComputationLab camera={camera} frame={f + T.s2} light="day">
          <WallDate position={[-1.55, 1.5, -0.72]} text={"SEPT 9\n1947"} width={0.34} appear={f - 18} head="#2a4a3a" />
          <Label text="HARVARD" position={[-1.55, 1.82, -0.72]} width={0.4} bg="#f4ecd8" appear={f - 4} />
          {/* a rack opened for the close-up: real relays clacking */}
          <RelayPanel position={[0.5, 1.42, -0.72]} f={f + T.s2} rows={3} cols={3} first={11} scale={1.3} seed={2} />
          <InkBox size={[0.7, 0.04, 0.3]} position={[0.5, 0.9, -0.8]} color="#2a3430" ink={0.005} />
        </ComputationLab>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#f4f8f0", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [0.6, 0.5, 0.6] as Vec3, color: "#f8f8f0", strength: 0.8 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 3. In the middle of a test, an error: the wrong number, the red lamp, the cup jumps ----------

const O_AT3: [number, number] = [-0.18, -0.62];
const W_AT3: [number, number] = [0.6, -0.68];
const ERR = 58;
const DESK_TOP = 0.62;
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..111 (video 346..457)
  const camera = path(
    [
      { at: 0, position: [0.15, 1.25, 2.0], target: [0.15, 0.95, -0.5], fov: 40 },
      { at: ERR, position: [0.05, 1.15, 1.6], target: [0.05, 0.9, -0.4], fov: 40 },
      { at: 111, position: [0.08, 1.15, 1.7], target: [0.08, 0.92, -0.45], fov: 40 },
    ],
    f,
  );
  const typed = f < ERR - 22 ? ease(f, 0, ERR - 22) : ease(f, ERR - 20, ERR);
  const lines = f < ERR - 22 ? ["1.270000", "9.037847", "2.130476"] : ["1.270000", "9.037847", "2.130476", "4.615925"];
  const red = f >= ERR ? 1 : 0;
  const lamp = f >= ERR ? (Math.floor((f - ERR) / 6) % 2 === 0 ? 1 : 0) : 0;
  const cup: Vec3 = [-0.42, DESK_TOP, -0.2];
  const jump = f >= ERR ? Math.max(0, Math.sin(Math.min(1, (f - ERR) / 12) * Math.PI)) * 0.08 : 0;
  const tip = f >= ERR ? 0.5 * ease(f, ERR, ERR + 6) * (1 - ease(f, ERR + 14, ERR + 22)) : 0;
  const grab = ease(f, ERR + 4, ERR + 12);
  const reachL = solveReach(O_AT3, [cup[0], cup[1] + 0.06, cup[2]], camera, [-200, -420]);
  const cast: PuppetPlacement[] = [
    {
      id: "operator",
      look: OPERATOR,
      at: O_AT3,
      pose: { view: "front", ...faceChange([[0, "thinking"], [ERR, "shocked"], [ERR + 30, "worried"]], f), reachL: grab > 0 ? [mix(-130, reachL[0], grab), mix(-520, reachL[1], grab)] : [-130, -520], handL: "open", frontL: grab > 0.5, reachR: [150, -560], lookX: 0.3, lean: f > ERR && f < ERR + 20 ? -6 : 0 },
    },
    { id: "operator2", look: OPERATOR2, at: W_AT3, pose: { view: "front", ...moveChange([[0, "neutral"], [ERR + 4, "shocked"], [ERR + 26, "worried", "point"]], f), lookX: -0.5 } },
  ];
  return (
    <Stage
      set={
        <ComputationLab camera={camera} frame={f + T.s3} light="alarm">
          <InkBox size={[1.5, 0.05, 0.55]} position={[0.05, DESK_TOP - 0.025, -0.25]} color="#5a5e5a" ink={0.008} />
          <InkBox size={[1.44, DESK_TOP - 0.05, 0.5]} position={[0.05, (DESK_TOP - 0.05) / 2, -0.27]} color="#3a3e3a" ink={0.006} />
          <Typewriter position={[0.12, DESK_TOP, -0.22]} lines={lines} typed={typed} red={red} carriage={typed} />
          <CoffeeCup position={cup} jump={jump} tilt={tip} />
          <RedLamp position={[0.12, 1.55, RACK_Z + 0.27]} on={lamp} />
          <Label text="ERROR" position={[0.12, 1.42, RACK_Z + 0.27]} width={0.26} bg="#ffd8d0" appear={f - ERR} />
        </ComputationLab>
      }
      camera={camera}
      bg={moodBackground("alarm")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#ffd0c8", tintAmount: 0.12, shadow: 0.3, points: [{ position: [0.12, 1.55, -0.5] as Vec3, color: "#ff4a3a", strength: 1.8 * lamp + 0.4, range: 2.6 }] }}
      foreground={fg(cast, <group position={frameSpot(wide({ position: [0.08, 1.15, 1.7] as Vec3, target: [0.08, 0.92, -0.45] as Vec3, fov: 40 }), ASPECT, -0.86, -0.9, 1.2)}>{[0, 1, 2].map((i) => <InkBox key={i} size={[0.2, 0.025, 0.15]} position={[0.004 * i, 0.026 * i, 0]} rotation={[0, 0.08 * i, 0]} color={i % 2 ? "#e8e0c8" : "#c8b896"} ink={0.003} />)}</group>)}
    />
  );
};

// ---------- 4. In the dark aisle: panel by panel; he stands up into an open panel door ----------

const O_AT4: [number, number] = [-0.22, -0.55];
const W_AT4: [number, number] = [0.62, -0.6];
const BONK = 50;
const HATCH_Y = 1.16;
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..97 (video 458..555)
  const camera = path(
    [
      { at: 0, position: [0.35, 0.95, 1.45], target: [0.2, 0.75, -0.6], fov: 40 },
      { at: BONK, position: [0.1, 1.0, 1.4], target: [0.05, 0.85, -0.6], fov: 40 },
      { at: 97, position: [0.0, 1.02, 1.5], target: [0.0, 0.86, -0.6], fov: 40 },
    ],
    f,
  );
  const up = ease(f, BONK - 10, BONK);
  const crouch = 0.55 * (1 - up) + 0.12 * ease(f, BONK, BONK + 4) * (1 - ease(f, BONK + 8, BONK + 18));
  const rub = ease(f, BONK + 4, BONK + 10) * (1 - ease(f, BONK + 34, BONK + 42));
  const torch: Vec3 = [-0.02, mix(0.55, 0.8, up), -0.45];
  const reachR = solveReach(O_AT4, torch, camera, [160, -380]);
  const torch2: Vec3 = [0.4, 0.85, -0.5];
  const reachL2 = solveReach(W_AT4, torch2, camera, [-160, -560]);
  const cast: PuppetPlacement[] = [
    {
      id: "operator",
      look: OPERATOR,
      at: O_AT4,
      pose: {
        view: "front",
        crouch,
        ...faceChange([[0, "thinking"], [BONK, "shocked"], [BONK + 10, "awkward"]], f),
        reachR: rub > 0.5 ? undefined : reachR,
        handR: rub > 0.5 ? undefined : "fist",
        frontR: rub > 0.5 ? undefined : true,
        gesture: rub > 0.5 ? "scratchHead" : undefined,
        reachL: [-130, -520],
        handL: "open",
        lookX: 0.5,
        headTilt: f > BONK && f < BONK + 30 ? -8 : 0,
      },
    },
    { id: "operator2", look: OPERATOR2, at: W_AT4, pose: { view: "front", ...faceChange([[0, "determined"], [BONK + 2, "shocked"], [BONK + 14, "happy"]], f), reachL: reachL2, handL: "fist", frontL: true, lookX: -0.6 } },
  ];
  const torchOn = rub > 0.5 ? 0 : 1;
  return (
    <Stage
      set={
        <ComputationLab camera={camera} frame={f + T.s4} light="dark">
          {/* an upper hatch opened out of the rack above him */}
          <group position={[-0.22, 1.32, RACK_Z + 0.26]} rotation={[-1.45, 0, 0]}>
            <InkBox size={[0.5, 0.36, 0.03]} position={[0, -0.18, 0]} color="#7a8a82" ink={0.008} />
          </group>
          <group userData={{ ghost: true }}>
            {torchOn > 0 && <Flashlight position={torch} rotation={[0, 0, 1.0]} beam={1} length={0.9} />}
            <Flashlight position={torch2} rotation={[0, 0, 0.6]} beam={1} length={1.0} />
          </group>
          <pointLight position={[-0.5, 0.6, -0.8]} color="#fff0c0" intensity={0.45 * torchOn} distance={1.0} />
          <pointLight position={[0.35, 1.3, -0.85]} color="#fff0c0" intensity={0.45} distance={1.1} />
          <Burst kind="stars" at={[O_AT4[0], 1.28, O_AT4[1] + 0.1]} frame={f - BONK} count={7} size={0.5} seed={2} />
        </ComputationLab>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#8090c0", tintAmount: 0.14, shadow: 0.4, points: [{ position: [0.2, 1.0, -0.2] as Vec3, color: "#fff0c0", strength: 1.0, range: 2 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 5. Panel F, Relay 70: a moth between the points ----------

const PF: Vec3 = [0, 1.25, -0.4];
const PF70: Vec3 = [PF[0], PF[1] - 0.13 * 1.5, PF[2]];
const PF_POINTS: Vec3 = add(PF70, [RELAY_POINTS[0] * 1.5, RELAY_POINTS[1] * 1.5, 0.012]);
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..182 (video 556..738)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.28, 1.15], target: [0.0, 1.15, -0.4], fov: 40, k: 1.0 },
      { at: 40, position: [0.0, 1.3, 0.95], target: [0.0, 1.18, -0.4], fov: 40, k: 1.0 },
      { at: 67, position: [-0.04, 1.15, 0.45], target: [-0.04, 1.1, -0.4], fov: 40, k: 1.0 },
      { at: 119, position: [-0.06, 1.11, 0.3], target: [-0.07, 1.1, -0.4], fov: 40, k: 1.0 },
      { at: 182, position: [-0.07, 1.11, 0.24], target: [-0.07, 1.1, -0.4], fov: 40, k: 1.0 },
    ],
    f,
  );
  // the flashlight spot sweeps over the panel and stops on 70
  const spot: Vec3 = f < 67 ? [mix(0.35, PF70[0], ease(f, 20, 67)), mix(0.95, PF70[1], ease(f, 20, 67)), PF[2] + 0.25] : [PF70[0] - 0.04, PF70[1] + 0.04, PF[2] + 0.25];
  return (
    <Stage
      set={
        <Room camera={camera} mood="night" floor="#2a2014" wall="#3a2e1e" wallPattern="plain" floorPattern="concrete" width={4} depth={2}>
          <RelayPanel position={PF} f={f + T.s5} rows={3} cols={5} first={63} plateRow={1} plateJamOnly jam={R70_IDX} jamStop={0.3} letter="PANEL F" letterAppear={f - 34} plateAppear={f - 62} seed={0} />
          <Moth position={add(PF_POINTS, [0, 0.0015 * Math.sin(f * 0.7), 0])} rotation={[0.1, 0, Math.PI / 2 - 0.15]} flap={0.12} size={0.095} />
          <pointLight position={spot} color="#ffe0a0" intensity={0.7} distance={0.6} />
          <pointLight position={[0.6, 1.8, 0.8]} color="#ffc070" intensity={0.6} distance={4} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.6}
      puppets={[]}
      energy={0.5}
    />
  );
};

// ---------- 6. The logbook: pulled out, taped in, "First actual case of bug being found." ----------

const O_AT6: [number, number] = [-0.05, -0.78];
const W_AT6: [number, number] = [0.68, -0.85];
const BOOK: Vec3 = [-0.02, DESK_TOP + 0.012, -0.3];
const BOOK_W = 0.56;
const TAPE = 48;
const WRITE = [97, 165];
const ASK = 189;
// The operator's hand and white shirt cuff on a tool, the forearm running back up out of the top of the frame toward him
// (the top-down camera does not see his card's arm).
// The tweezers and the pencil come in from the top of the frame, held by a hand out of shot: each runs from its tip
// on the page back up toward the operator (-z) and out past the frame edge.
const TOOL_AXIS: Vec3 = [-0.18, 0.42, -0.89];
const LongTool: React.FC<{ tip: Vec3; kind: "tweezers" | "pencil" }> = ({ tip, kind }) => {
  const end = (len: number, side = 0): Vec3 => [tip[0] + TOOL_AXIS[0] * len + side, tip[1] + TOOL_AXIS[1] * len, tip[2] + TOOL_AXIS[2] * len];
  if (kind === "tweezers")
    return (
      <group>
        {[-1, 1].map((sd) => (
          <Stick key={sd} a={[tip[0] + sd * 0.002, tip[1], tip[2]]} b={end(0.42, sd * 0.012)} radius={0.0032} color="#c8ccd0" ink={0.0015} />
        ))}
      </group>
    );
  return (
    <group>
      <Stick a={end(0.014)} b={end(0.42)} radius={0.0065} color="#e8b830" ink={0.0015} />
      <Stick a={tip} b={end(0.014)} radius={0.0035} color="#e8c8a0" ink={0.001} />
    </group>
  );
};

const S6: React.FC = () => {
  const f = useShotFrame(); // 0..219 (video 739..958)
  const camera = path(
    [
      { at: 0, position: [0.12, 1.36, 0.16], target: [0.12, DESK_TOP, -0.26], fov: 40, k: 1.0 },
      { at: TAPE, position: [0.12, 1.32, 0.18], target: [0.12, DESK_TOP, -0.23], fov: 40, k: 1.0 },
      { at: WRITE[1], position: [0.12, 1.31, 0.2], target: [0.12, DESK_TOP, -0.21], fov: 40, k: 1.0 },
      { at: 219, position: [0.12, 1.28, 0.06], target: [0.12, DESK_TOP, -0.21], fov: 40, k: 1.0 },
    ],
    f,
  );
  // book frame: lying flat, page points to world
  const pageW = (u: number, v: number): Vec3 => {
    const p = pagePoint(BOOK_W, u, v);
    return [BOOK[0] + p[0], BOOK[1] + p[2], BOOK[2] - p[1]];
  };
  const mothOnPage = pageW(280, 545);
  const carry = ease(f, 8, TAPE - 8);
  const mothStart: Vec3 = [0.05, 0.86, -0.42];
  const mothPos = lerp3(mothStart, add(mothOnPage, [0, 0.004, 0]), carry);
  // after the moth is down the tweezers lift and slide back out of the top of the frame; the pencil slides in the same way
  const away = (k: number): Vec3 => [TOOL_AXIS[0] * k, TOOL_AXIS[1] * k, TOOL_AXIS[2] * k];
  const tweezTip = carry < 1 ? add(mothPos, [0.0, 0.004, 0.0]) : add(add(mothOnPage, [0.0, mix(0.004, 0.03, ease(f, TAPE - 6, TAPE + 2)), 0]), away(0.55 * ease(f, TAPE + 4, WRITE[0] - 14)));
  const writing = ease(f, WRITE[0], WRITE[1]);
  const pencilU = 180 + 520 * ((writing * 2) % 1.0001);
  const pencilV = writing < 0.5 ? 700 : 770;
  const pencilTip = f < WRITE[0] ? add(pageW(180, 700), away(0.55 * (1 - ease(f, WRITE[0] - 30, WRITE[0] - 2)))) : pageW(pencilU, pencilV);
  const reachR = solveReach(O_AT6, add(tweezTip, [0, 0.11, 0]), camera, [200, -500]);
  const reachRW = solveReach(O_AT6, add(pencilTip, [0, 0.09, 0]), camera, [200, -500]);
  const handR = f < WRITE[0] - 16 ? reachR : f < WRITE[0] - 4 ? [mix(reachR[0], reachRW[0], ease(f, WRITE[0] - 16, WRITE[0] - 4)), mix(reachR[1], reachRW[1], ease(f, WRITE[0] - 16, WRITE[0] - 4))] as [number, number] : reachRW;
  const tapeOn = f >= TAPE;
  const lines: LogLine[] = [
    { t: "545", text: "1545", x: 30, size: 50 },
    { t: "520", text: "Relay #70 Panel F", x: 410, size: 40 },
    { t: "580", text: "(moth) in relay.", x: 420, size: 40 },
    { t: "700", text: "First actual case", x: 180, size: 58, shown: ease(f, WRITE[0], (WRITE[0] + WRITE[1]) / 2) },
    { t: "770", text: "of bug being found.", x: 180, size: 58, shown: ease(f, (WRITE[0] + WRITE[1]) / 2, WRITE[1]) },
    { t: "722", text: "______", x: 322, size: 56, shown: ease(f, ASK - 4, ASK + 10) },
  ];
  const cast: PuppetPlacement[] = [
    {
      id: "operator",
      look: OPERATOR,
      at: O_AT6,
      crop: true,
      pose: { view: "front", ...faceChange([[0, "thinking"], [TAPE, "happy"], [WRITE[0], "smug"], [ASK + 6, "awkward"]], f), reachR: handR, handR: "fist", frontR: true, reachL: [-140, -500], lookX: 0.1, headTilt: f < WRITE[1] ? -6 : 0, lean: f < WRITE[1] ? 4 : 0 },
    },
    { id: "operator2", look: OPERATOR2, at: W_AT6, crop: true, pose: { view: "front", ...moveChange([[0, "happy"], [WRITE[0] + 20, "happy"], [ASK, "confused", "scratchHead"]], f), lookX: -0.6 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#4a3020" wall="#c8c0a6" wallPattern="panel" floorPattern="wood" width={5} depth={3}>
          <InkBox size={[1.6, 0.05, 0.62]} position={[0.1, DESK_TOP - 0.025, -0.32]} color="#3a6a5a" ink={0.008} />
          <InkBox size={[1.54, DESK_TOP - 0.05, 0.5]} position={[0.1, (DESK_TOP - 0.05) / 2, -0.33]} color="#4a2e1a" ink={0.006} />
          <Logbook position={BOOK} lines={lines} width={BOOK_W} tape={tapeOn} />
          <Moth position={tapeOn ? add(mothOnPage, [0, 0.003, 0]) : mothPos} rotation={[-Math.PI / 2, 0, tapeOn ? 0.25 : 0.25 * carry]} flap={0} size={0.085} />
          <group userData={{ ghost: true }}>
            {f < WRITE[0] - 14 && <LongTool tip={tweezTip} kind="tweezers" />}
            {f >= WRITE[0] - 30 && <LongTool tip={pencilTip} kind="pencil" />}
          </group>
          <DeskLamp position={[-0.55, DESK_TOP, -0.5]} rotationY={-0.4} on={0.6} />
          <Rack position={[-1.4, 0, -1.2]} f={f + T.s6} seed={4} />
          <Rack position={[1.3, 0, -1.2]} f={f + T.s6} seed={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#ffe0b8", tintAmount: 0.1, shadow: 0.24, points: [{ position: [-0.4, 1.0, -0.2] as Vec3, color: "#ffd090", strength: 1.6, range: 2.5 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 7. You see: the points must touch; the magnet pulls them together; the moth keeps them apart ----------

const GR: Vec3 = [0.0, 0, -0.3];
const PULL = 104;
const OPEN = 160;
const PLOP = 182;
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..249 (video 959..1208)
  const camera = path(
    [
      { at: 0, position: [0.0, 1.0, 2.9], target: [0.0, 0.95, -0.3], fov: 40, k: 1.0 },
      { at: 56, position: [-0.12, 1.0, 2.3], target: [-0.12, 0.95, -0.3], fov: 40, k: 1.0 },
      { at: 141, position: [0.1, 1.12, 2.4], target: [0.1, 1.12, -0.3], fov: 40, k: 1.0 },
      { at: PLOP, position: [-0.12, 0.98, 2.1], target: [-0.14, 0.95, -0.3], fov: 40, k: 1.0 },
      { at: 249, position: [-0.13, 0.98, 1.95], target: [-0.15, 0.95, -0.3], fov: 40, k: 1.0 },
    ],
    f,
  );
  const close = f < OPEN ? ease(f, PULL - 8, PULL) : f < PLOP + 10 ? 1 - ease(f, OPEN, OPEN + 6) : 0.5 + 0.5 * Math.sin((f - PLOP - 10) * 0.35);
  const stop = f >= PLOP ? 0.3 : 1;
  const lit = f >= PULL + 2 && f < OPEN + 2 ? 1 : 0;
  const pts: Vec3 = add(GR, [RELAY_POINTS[0] * GIANT, 0.6 + RELAY_POINTS[1] * GIANT, 0.06]);
  const fall = ease(f, PLOP - 14, PLOP);
  const mothPos: Vec3 = [pts[0], mix(pts[1] + 1.0, pts[1], fall * fall), pts[2]];
  return (
    <Stage
      set={
         <Room camera={camera} mood="cold" floor="#1c2648" wall="#34448a" wallPattern="plain" floorPattern="concrete" width={7} depth={4}>
          <GiantRelay position={GR} close={close} stop={stop} lit={lit} flow={PULL} f={f} />
          {f >= PLOP - 14 && <Moth position={mothPos} rotation={[0.1, 0, Math.PI / 2 - 0.1]} flap={f < PLOP ? 0.6 + 0.4 * Math.sin(f * 1.5) : 0.1} size={0.42} squash={f >= PLOP ? Math.max(0, 1 - (f - PLOP) / 8) : 0} />}
          <Label text="COIL" position={[GR[0] + 0.06, 0.36, GR[2] + 0.25]} width={0.24} appear={f - 12} bg="#d8ecff" />
          {f < 112 && <Label text="CONTACTS" position={[GR[0] - 0.28, 1.2, GR[2] + 0.1]} width={0.38} appear={f - 58} bg="#d8ecff" />}
          {f > 136 && f < OPEN && <Label text="CURRENT" position={[GR[0] - 0.12, 1.42, GR[2] + 0.06]} width={0.36} appear={f - 140} bg="#d8c878" />}
          {f >= PLOP + 6 && <Label text="MOTH" position={[GR[0] - 0.28, 1.28, GR[2] + 0.12]} width={0.26} appear={f - PLOP - 6} bg="#f4e0c8" />}
          <pointLight position={[0, 2.2, 1.2]} color="#c8d8ff" intensity={2.6} distance={6} />
          <pointLight position={[-1.2, 1.2, 1.0]} color="#a8c0ff" intensity={1.4} distance={4} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.4}
      puppets={[]}
    />
  );
};

// ---------- 8. 1878: Edison writes of "bugs" ----------

const E_AT: [number, number] = [0.32, -0.55];
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..131 (video 1209..1340)
  const camera = path(
    [
      { at: 0, position: [0.0, 1.35, 1.6], target: [0.0, 1.15, -0.6], fov: 40 },
      { at: 47, position: [0.05, 1.15, 1.45], target: [0.05, 0.95, -0.5], fov: 40 },
      { at: 131, position: [-0.05, 1.08, 1.25], target: [-0.05, 0.9, -0.45], fov: 40 },
    ],
    f,
  );
  const desk: Vec3 = [-0.14, 0.82, -0.4];
  const write = ease(f, 66, 96);
  const nib: Vec3 = [desk[0] - 0.06 + 0.12 * write + 0.01 * Math.sin(f * 0.9) * (write > 0 && write < 1 ? 1 : 0), desk[1] + 0.06, desk[2] + 0.05];
  const reachL = solveReach(E_AT, add(nib, [0.0, 0.08, 0]), camera, [-200, -520]);
  const cast: PuppetPlacement[] = [
    { id: "edison", look: EDISON, at: E_AT, pose: { view: "front", ...faceChange([[0, "thinking"], [47, "determined"], [100, "smug"]], f), reachL: f > 40 ? reachL : [-130, -520], handL: "fist", frontL: true, reachR: [70, -600], handR: "fist", frontR: true, lookX: -0.5, headTilt: -4 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#4a2e18" wall="#8a5a34" wallPattern="panel" floorPattern="wood" width={5} depth={3}>
          <BottleShelf position={[0.45, 1.45, -1.38]} width={0.8} />
          <BottleShelf position={[0.45, 1.08, -1.38]} width={0.8} />
          <GasBracket position={[-0.85, 1.7, -1.43]} frame={f + T.s8} />
          {/* a slanted writing desk on legs */}
          <group position={desk}>
            <InkBox size={[0.5, 0.03, 0.54]} rotation={[0.35, 0, 0]} color="#5a3420" ink={0.006} />
            {[-1, 1].map((s) => (
              <InkBox key={s} size={[0.04, 0.8, 0.04]} position={[s * 0.2, -0.42, 0]} color="#3a2214" ink={0.004} />
            ))}
          </group>
          <Letter position={add(desk, [0, 0.025, 0.01])} rotation={[0.35 - Math.PI / 2, 0, 0]} shown={write} size={[0.4, 0.5]} />
          <WallDate position={[-0.2, 1.5, -1.42]} text="1878" width={0.34} appear={f - 6} head="#6a3a1a" />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#ffd8a0", tintAmount: 0.12, shadow: 0.3, points: [{ position: [-0.75, 1.65, -1.2] as Vec3, color: "#ffb860", strength: 1.6, range: 3 }] }}
      foreground={fg(cast, <group position={frameSpot(wide({ position: [-0.05, 1.08, 1.25] as Vec3, target: [-0.05, 0.9, -0.45] as Vec3, fov: 40 }), ASPECT, -0.8, -0.88, 1.2)}><InkCylinder radius={0.04} height={0.12} color="#6a4a2a" ink={0.004} /></group>)}
    />
  );
};

// ---------- 9. Grace Hopper tells the story again and again ----------

const H_AT: [number, number] = [0.0, -0.3];
const C_AT: [number, number] = [-0.52, -0.78];
const W_AT9: [number, number] = [0.52, -0.8];
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..156 (video 1341..1497)
  const camera = path(
    [
      { at: 0, position: [0.05, 1.12, 3.4], target: [0.02, 0.88, -0.45], fov: 40, k: 1.0 },
      { at: 35, position: [0.03, 1.1, 3.15], target: [0.01, 0.88, -0.45], fov: 40, k: 1.0 },
      { at: 156, position: [0.0, 1.08, 2.95], target: [0.0, 0.88, -0.45], fov: 40, k: 1.0 },
    ],
    f,
  );
  const book: Vec3 = [0.0, 0.62, -0.2];
  const reachL = solveReach(H_AT, add(book, [-0.13, -0.02, 0]), camera, [-200, -420]);
  const reachR = solveReach(H_AT, add(book, [0.13, -0.02, 0]), camera, [200, -420]);
  const gesture = f > 92 && f < 132;
  const cast: PuppetPlacement[] = [
    { id: "hopper", look: HOPPER, at: H_AT, pose: { view: "front", ...faceChange([[0, "happy"], [40, "excited"], [100, "smug"]], f), reachL, reachR: gesture ? [200, -760 + 30 * Math.sin(f * 0.4)] : reachR, handL: "open", handR: "open", frontL: true, frontR: true, lookX: f < 60 ? -0.4 : 0.4 } },
    { id: "colleague", look: COLLEAGUE, at: C_AT, pose: { view: "front", ...faceChange([[0, "neutral"], [50, "excited"], [110, "happy"]], f), lookX: 0.6 } },
    { id: "operator2", look: OPERATOR2, at: W_AT9, pose: { view: "front", ...faceChange([[0, "happy"], [76, "excited"]], f), lookX: -0.6 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#4a3a5a" wall="#9a8ac0" wallPattern="wallpaper" floorPattern="wood" width={5} depth={3}>
          <LabWindow position={[-0.9, 1.5, -1.43]} size={[0.7, 1.1]} sky="#ffd8b0" curtain="#6a5a9a" glow={1.0} />
          <Rack position={[0.9, 0, -1.2]} f={f + T.s9} seed={3} />
          <group userData={{ ghost: true }}>
            <Logbook position={book} rotation={[0.1, 0, 0]} lines={[{ t: "545", text: "1545", x: 30, size: 50 }]} width={0.3} tape />
            <Moth position={add(book, [0.06, 0.0, 0.012])} rotation={[0.1, 0, 0.25]} size={0.05} />
          </group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#ffe0c8", tintAmount: 0.08, shadow: 0.2, points: [{ position: [0.25, 1.4, 0.4] as Vec3, color: "#fff0d8", strength: 1.4, range: 1.6 }], distant: [{ direction: [-0.6, 0.5, 0.6] as Vec3, color: "#ffe8c8", strength: 0.6 }] }}
      foreground={fg(cast)}
    />
  );
};

// ---------- 10. Today: the page, moth and all, in the Smithsonian's collection ----------

const CU_AT: [number, number] = [-0.5, -0.78];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..144 (video 1498..1642)
  const camera = path(
    [
      { at: 0, position: [0.1, 1.5, 1.7], target: [0.05, 1.35, -1.2], fov: 40 },
      { at: 78, position: [0.0, 1.3, 1.5], target: [-0.05, 1.05, -0.6], fov: 40 },
      { at: 144, position: [0.0, 1.2, 1.25], target: [-0.05, 0.85, -0.45], fov: 40 },
    ],
    f,
  );
  const table = 0.62;
  const box: Vec3 = [-0.1, table, -0.42];
  const lift = ease(f, 25, 55);
  const lid: Vec3 = [box[0] + 0.45 * lift, table + 0.06 + 0.12 * Math.sin(Math.PI * lift), box[2]];
  const reachR = solveReach(CU_AT, add(lid, [-0.2, 0.02, 0]), camera, [200, -450]);
  const cast: PuppetPlacement[] = [
    { id: "curator", look: CURATOR, at: CU_AT, pose: { view: "front", ...faceChange([[0, "thinking"], [70, "happy"]], f), reachR: f > 16 && f < 62 ? reachR : [130, -520], handR: "open", frontR: f > 16 && f < 62, reachL: [-130, -520], lookX: 0.5 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#8a9494" wall="#c8d4d0" wallPattern="panel" floorPattern="tile" width={6} depth={3}>
          <DrawerCabinet position={[-1.0, 0, -1.2]} />
          <DrawerCabinet position={[0.0, 0, -1.2]} />
          <DrawerCabinet position={[1.0, 0, -1.2]} />
          <Label text={"NATIONAL MUSEUM OF\nAMERICAN HISTORY"} position={[-0.12, 1.66, -1.42]} width={0.56} bg="#f4f4f0" appear={f - 78} />
          <InkBox size={[1.1, 0.04, 0.55]} position={[-0.1, table - 0.02, -0.4]} color="#d8dcdc" ink={0.006} />
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, table - 0.04, 0.04]} position={[-0.1 + sx * 0.5, (table - 0.04) / 2, -0.4 + sz * 0.22]} color="#8a9494" ink={0.004} />))}
          <InkBox size={[0.42, 0.04, 0.34]} position={add(box, [0, 0.02, 0])} color="#5a6a6a" ink={0.005} />
          <Logbook position={add(box, [0, 0.045, 0])} lines={[{ t: "545", text: "1545", x: 30, size: 50 }, { t: "520", text: "Relay #70 Panel F", x: 410, size: 40 }]} width={0.36} tape />
          <Moth position={add(box, [0.08, 0.05, 0.0])} rotation={[-Math.PI / 2, 0, 0.25]} size={0.06} />
          <group userData={{ ghost: true }}>
            <InkBox size={[0.44, 0.03, 0.36]} position={lid} rotation={[0, 0, -0.25 * Math.sin(Math.PI * lift)]} color="#6a7a7a" ink={0.005} />
          </group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={1.8}
      puppets={cast}
      light={{ tint: "#eef4f4", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [0.5, 0.6, 0.6] as Vec3, color: "#f4f8f8", strength: 0.8 }] }}
      foreground={fg(cast, <group position={frameSpot(wide({ position: [0.0, 1.2, 1.25] as Vec3, target: [-0.05, 0.85, -0.45] as Vec3, fov: 40 }), ASPECT, 0.86, -0.9, 1.25)}><InkBox size={[0.24, 0.1, 0.18]} color="#8a9a9a" ink={0.004} /><InkBox size={[0.2, 0.012, 0.15]} position={[0, 0.056, 0]} color="#f4f0e6" ink={0.002} /></group>)}
    />
  );
};

// ---------- 11. The first actual bug, still taped to the page ----------

const S11: React.FC = () => {
  const f = useShotFrame(); // 0..119 (video 1643..1762)
  const BW = 0.56;
  const book: Vec3 = [-0.14, 0.725, -0.3];
  const pageW = (u: number, v: number): Vec3 => {
    const p = pagePoint(BW, u, v);
    return [book[0] + p[0], book[1] + p[2], book[2] - p[1]];
  };
  const moth = pageW(280, 545);
  const page = pageW(384, 620);
  const camera = path(
    [
      { at: 0, position: [page[0], 1.44, page[2] + 0.42], target: [page[0], 0.72, page[2] - 0.02], fov: 40, k: 1.0 },
      { at: 119, position: [page[0], 1.33, page[2] + 0.33], target: [page[0], 0.72, page[2] - 0.01], fov: 40, k: 1.0 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#8a9494" wall="#c8d4d0" wallPattern="panel" floorPattern="tile" width={4} depth={3}>
          <InkBox size={[1.0, 0.04, 0.8]} position={[0.1, 0.68, -0.3]} color="#5a6a6a" ink={0.005} />
          <Logbook position={book} lines={[{ t: "545", text: "1545", x: 30, size: 50 }, { t: "520", text: "Relay #70 Panel F", x: 410, size: 40 }, { t: "700", text: "First actual case", x: 180, size: 58 }, { t: "770", text: "of bug being found.", x: 180, size: 58 }]} width={BW} tape />
          <Moth position={add(moth, [0, 0.003, 0])} rotation={[-Math.PI / 2, 0, 0.25]} size={0.085} />
          <pointLight position={[moth[0] - 0.3, 1.2, moth[2] + 0.4]} color="#fff0d8" intensity={0.5} distance={2} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={1.4}
      puppets={[]}
      energy={0.5}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 124, S1, false],
  [124, 346, S2, "dip"],
  [346, 458, S3, "dip"],
  [458, 556, S4, "dip"],
  [556, 739, S5, "dip"],
  [739, 959, S6, "dip"],
  [959, 1209, S7, "dip"],
  [1209, 1341, S8, "dip"],
  [1341, 1498, S9, "dip"],
  [1498, 1643, S10, "dip"],
  [1643, TIMING.totalFrames, S11, "dip"],
];

const SFX: Sfx[] = [
  // the hook: the relays chatter; 70 slams on the moth
  { at: 0, src: sfx("relays"), volume: 0.16, until: T.s2 },
  { at: 2, src: sfx("flutter"), volume: 0.5, space: "room" },
  ...foleyCues("relay", SLAMS, 1.6, { space: "room" }),
  ...SLAMS.map((s, i) => ({ at: s + 1, src: sfx("zap"), volume: 0.45 + 0.1 * (i % 3), space: "room" as const })),
  // the lab
  { at: T.s2, src: sfx("relays"), volume: 0.1, until: T.s3 },
  { at: T.s2 + 20, src: sfx("pop"), volume: 0.75 },
  ...foleyCues("relay", [11, 14, 17].flatMap((i) => relayCloses(i + 2000, T.s2 + 160, T.s3 - 10)).sort((a, b) => a - b).filter((x, i, a) => i === 0 || x - a[i - 1] > 4), 1.0, { space: "room" }),
  // the error
  { at: T.s3, src: sfx("relays"), volume: 0.08, until: T.s3 + ERR },
  { at: T.s3 + ERR, src: sfx("stamp"), volume: 0.3, space: "room" },
  { at: T.s3 + ERR + 2, src: sfx("button"), volume: 0.8, space: "room" },
  { at: T.s3 + ERR + 8, src: sfx("clink"), volume: 0.4, space: "room" },
  // the dark aisle: the bonk
  { at: T.s4 + BONK, src: sfx("clang"), volume: 1.0, space: "room", hit: 0.3 },
  // Panel F
  { at: T.s5 + 34, src: sfx("pop"), volume: 0.75 },
  { at: T.s5 + 62, src: sfx("pop"), volume: 0.75 },
  { at: T.s5 + 119, src: sfx("sting"), volume: 0.5 },
  // the logbook
  { at: T.s6 + TAPE - 2, src: sfx("paper"), volume: 0.4, space: "room" },
  { at: T.s6 + ASK - 30, src: sfx("riser"), volume: 0.1, until: T.s7 },
  // the pivot
  { at: T.s7 + 2, src: sfx("sting"), volume: 0.3 },
  { at: T.s7 + 12, src: sfx("pop"), volume: 0.6 },
  { at: T.s7 + 58, src: sfx("pop"), volume: 0.6 },
  ...foleyCues("relay", [T.s7 + PULL], 2.0, { space: "hall" }),
  { at: T.s7 + PULL + 2, src: sfx("hum"), volume: 0.08, until: T.s7 + OPEN },
  { at: T.s7 + 140, src: sfx("pop"), volume: 0.8 },
  { at: T.s7 + PLOP, src: sfx("plop"), volume: 1.0, space: "hall" },
  { at: T.s7 + PLOP + 30, src: sfx("button"), volume: 1.2, space: "room" },
  // 1878
  { at: T.s8 + 6, src: sfx("pop"), volume: 0.8 },
  { at: T.s8 + 66, src: sfx("scrape"), volume: 0.45, space: "room" },
  // Hopper
  { at: T.s9 + 10, src: sfx("paper"), volume: 0.3, space: "room" },
  // the museum
  { at: T.s10 + 25, src: sfx("drawer"), volume: 0.55, space: "room" },
  { at: T.s10 + 78, src: sfx("pop"), volume: 0.45 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.tension, from: 0, to: T.s3, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: T.s3, to: T.s6, volume: 0.26 },
  { src: MUSIC_FILES.upbeat, from: T.s6, to: T.s7, volume: 0.22 },
  { src: MUSIC_FILES.tension, from: T.s7, to: T.s8, volume: 0.24 },
  { src: MUSIC_FILES.lounge, from: T.s8, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
