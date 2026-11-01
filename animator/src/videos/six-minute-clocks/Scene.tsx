import React from "react";
import { Easing, interpolate } from "remotion";
import {
  CameraShot,
  Desk,
  Door,
  faceChange,
  InkBox,
  Label,
  lerp3,
  moodBackground,
  moveChange,
  Mood,
  MUSIC_FILES,
  MusicCue,
  Plant,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Screen,
  Sfx,
  sfx,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Video,
  walk,
} from "../../engine";
import {
  BalanceScale,
  Beacon,
  BigPhone,
  ClockWall,
  CoatRack,
  Console,
  EnergyCrate,
  FlyingBag,
  HzDial,
  Mug,
  OvenColumn,
  Pendant,
  PlatformKit,
  PowerStrip,
  RadioClock,
  Readout,
  Socket,
  SwingCounter,
  Train,
  VideoWall,
  WallCalendar,
  WaveRope,
  Worktop,
} from "./props";
import TIMING_JSON from "./timing.json";

// "Why Europe's Oven Clocks Ran Six Minutes Slow" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "six-minute-clocks";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#f6dcc4", hair: "#5a2d1a", outfit: "#f2a93b", long: true };
const NEIGHBOUR: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#8e3b5a", glasses: true };
const OPERATOR: PuppetLook = { skin: "#e8b89a", hair: "#1d1a1a", outfit: "#e8e0c8", lanyard: "#1d4fa8" };
const OPK: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#4f7dff", lanyard: "#ffd23f" };
const OPS: PuppetLook = { skin: "#fbe9d6", hair: "#7a2e1a", outfit: "#3fae5a", lanyard: "#e0262f", long: true };
const COMMUTER: PuppetLook = { skin: "#d9a47e", hair: "#1d1a1a", outfit: "#e0262f", cap: "#264653" };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });
const pop = (f: number, at: number) => f - at;

const medium = (px: number, pz: number, p: number, dx = -0.5, y = 1.2): CameraShot => ({
  position: lerp3([px + dx, y, pz + 3.3], [px + dx * 0.85, y - 0.02, pz + 2.95], p),
  target: [px, 0.85, pz],
  fov: 38,
});
const close = (px: number, pz: number, p: number, dx = -0.2): CameraShot => ({
  position: lerp3([px + dx, 1.05, pz + 1.9], [px + dx * 0.8, 1.02, pz + 1.62], p),
  target: [px, 0.92, pz],
  fov: 36,
});
const ease = Easing.inOut(Easing.quad);

// ---------- platform (guide/references/station-platform.md) ----------

const EDGE_Z = -1.2;
const PlatformSet: React.FC<{ camera: CameraShot; trainX: number; doors: number; mood: Mood; clock: [number, number]; board: string; bag?: number }> = ({ camera, trainX, doors, mood, clock, board, bag }) => (
  <Room camera={camera} mood={mood} floor="#8a93a0" wall={mood === "daylight" ? "#7fb3d5" : "#2f5fb0"} width={12} depth={8} wallPattern="tile" floorPattern="concrete" sun={mood === "daylight" ? { x: 1.5, color: "#fff6d8", bars: 6 } : undefined}>
    <Train position={[trainX, 0, -1.95]} doors={doors} length={12} />
    <PlatformKit edgeZ={EDGE_Z} clock={clock} board={board} postX={1.0} />
    {bag !== undefined && <FlyingBag from={[0.3, 0.75, 0.25]} to={[0.9, 0.06, -0.6]} t={bag} />}
  </Room>
);
const platform = (camera: CameraShot, puppets: PuppetPlacement[], o: { trainX?: number; doors?: number; mood?: Mood; clock?: [number, number]; board?: string; bag?: number; blur?: number } = {}) => {
  const mood = o.mood ?? "cold";
  return (
    <Stage
      bg={moodBackground(mood)}
      camera={camera}
      puppets={puppets}
      blur={o.blur}
      set={<PlatformSet camera={camera} trainX={o.trainX ?? 0} doors={o.doors ?? 1} mood={mood} clock={o.clock ?? [8, 2]} board={o.board ?? "08:00 CITY\nDEPARTED"} bag={o.bag} />}
    />
  );
};

// ---------- kitchen (guide/references/kitchen-oven.md) ----------

const OVEN: [number, number, number] = [0.75, 0, -2.15];
const OVEN_CLOCK: [number, number, number] = [0.75, 1.42, -1.8];
const SOCKET: [number, number, number] = [0.2, 1.15, -2.43];
const CAL: [number, number, number] = [-1.15, 2.05, -2.43];
const YOU_K: [number, number] = [-0.3, -1.15];
const PENDANT: [number, number, number] = [-0.65, 2.15, -1.5];
const lampLight = (mood: Mood): PuppetLight | undefined =>
  mood === "daylight" ? undefined : { points: [{ position: [PENDANT[0], PENDANT[1] - 0.2, PENDANT[2]], color: mood === "dusk" ? "#ffc890" : "#ffd27a", strength: 1.5, range: 3.2 }] };

type KitchenOpts = { clock?: string; month?: string; next?: string; flip?: number; pour?: number; spill?: number; sliver?: number; minus?: number; phone?: string };
const KitchenSet: React.FC<{ camera: CameraShot; mood: Mood; f: number; o: KitchenOpts }> = ({ camera, mood, f, o }) => (
  <Room
    camera={camera}
    mood={mood}
    floor={mood === "dusk" ? "#4a3a6b" : "#c98b5a"}
    wall={mood === "daylight" ? "#f2c48a" : mood === "dusk" ? "#8a5ab0" : "#e07a3a"}
    stripe="#fff6dc"
    width={7}
    depth={5}
    wallPattern="tile"
    floorPattern="wood"
    sun={mood === "daylight" ? { x: -1.6, color: "#fff6d8", bars: 4 } : undefined}
  >
    <OvenColumn position={OVEN} clock={o.clock ?? "07:51"} />
    <Worktop position={[-0.75, 0, -2.15]} width={1.5} />
    <Socket position={SOCKET} />
    <InkBox size={[0.012, 0.012, 0.3]} position={[0.2, 1.0, -2.3]} color="#2c3a40" ink={0} />
    <WallCalendar position={CAL} month={o.month ?? "JAN"} next={o.next} flip={o.flip} width={0.5} />
    <Pendant position={PENDANT} shade={mood === "dusk" ? "#ffd23f" : "#2a9d8f"} />
    {/* coffee machine and mug on the worktop */}
    <InkBox size={[0.22, 0.34, 0.24]} position={[-0.5, 1.08, -2.25]} color="#2c3a40" />
    <InkBox size={[0.08, 0.04, 0.08]} position={[-0.5, 1.12, -2.08]} color="#9aa0a6" ink={0.004} />
    <Mug position={[-0.5, 0.91, -2.05]} pour={o.pour} spill={o.spill} />
    {o.sliver !== undefined && o.sliver > 0 && (
      <group userData={{ ghost: true }} position={[OVEN_CLOCK[0] + 0.08 + o.sliver * 0.05, OVEN_CLOCK[1] - o.sliver * 0.9, OVEN_CLOCK[2] + 0.05 + o.sliver * 0.1]} rotation={[0, 0, o.sliver * 6]}>
        <InkBox size={[0.012, 0.07, 0.01]} color="#39ff7a" ink={0.003} emissive="#1b8a3c" />
      </group>
    )}
    {o.minus !== undefined && <Label text="-6 MIN" position={[OVEN_CLOCK[0], OVEN_CLOCK[1] + 0.2, OVEN_CLOCK[2] + 0.02]} width={0.36} fg="#ffffff" bg="#e0262f" appear={o.minus} count={ramp(o.minus, 0, 20)} />}
    {o.phone && <BigPhone position={[0.28, 1.42, -1.75]} text={o.phone} scale={0.45} />}
    <Plant position={[-2.6, 0, -2.0]} />
  </Room>
);
const kitchen = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: KitchenOpts = {}, mood: Mood = "warm", blur?: number) => (
  <Stage bg={moodBackground(mood)} camera={camera} puppets={puppets} blur={blur} light={lampLight(mood)} set={<KitchenSet camera={camera} mood={mood} f={f} o={o} />} />
);

// ---------- hallway ----------

const DOOR_AT: [number, number, number] = [0.35, 0, -2.45];
const HallSet: React.FC<{ camera: CameraShot; door: number; knock: number }> = ({ camera, door, knock }) => (
  <Room camera={camera} mood="golden" floor="#9a6b3a" wall="#f2b630" stripe="#c0392b" width={6} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    <group position={[Math.sin(knock * 40) * 0.01 * knock, 0, 0]}>
      <Door position={DOOR_AT} open={door} color="#8a3a2a" glow="#3a2208" />
    </group>
    <Label text="FLAT 4" position={[DOOR_AT[0], 2.3, -2.38]} width={0.5} />
    <CoatRack position={[-1.6, 0, -2.1]} />
    <Plant position={[1.7, 0, -2.1]} />
  </Room>
);
const hall = (camera: CameraShot, puppets: PuppetPlacement[], door = 0, knock = 0, extra?: React.ReactNode) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<><HallSet camera={camera} door={door} knock={knock} />{extra}</>} />
);
// The neighbour holds his radio clock in both hands in front of his chest.
const HOLD_RADIO: Partial<PuppetPose> = { reachL: [-70, -560], reachR: [70, -560], frontL: true, frontR: true, handL: "open", handR: "open" };
const radioAt = (at: [number, number], dy = 0): [number, number, number] => [at[0], 0.7 + dy, at[1] + 0.16];

// ---------- clock wall ----------

const ClockWallSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" width={7} depth={5} wallPattern="brick" floorPattern="wood">
    <ClockWall position={[0, 0.35, -2.35]} text="07:56" f={f} cols={6} rows={5} />
    <Label text="EUROPE" position={[0, 2.6, -2.42]} width={1.0} fg="#ffffff" bg="#1d4fa8" />
  </Room>
);
const clockWall = (camera: CameraShot, f: number, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<ClockWallSet camera={camera} f={f} />} />
);

// ---------- clockworks: inside a mains clock ----------

const BIG_SOCKET: [number, number, number] = [-1.0, 1.1, -2.42];
const COUNTER: [number, number, number] = [1.05, 1.4, -2.1];
const PHONE_AT: [number, number, number] = [-2.3, 1.0, -1.9];
const RADIO_BIG: [number, number, number] = [2.45, 1.0, -1.9];
type WorksOpts = { phase: number; swings: number; seconds: number; tick?: number; rule?: number };
const WorksSet: React.FC<{ camera: CameraShot; f: number; o: WorksOpts }> = ({ camera, f, o }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" stripe="#ffb8ec" width={8} depth={5} wallPattern="panel" floorPattern="tile">
    <Socket position={BIG_SOCKET} scale={4} plug={false} color="#fff6dc" />
    <WaveRope from={[BIG_SOCKET[0], BIG_SOCKET[1], -2.25]} to={[COUNTER[0] - 0.68, COUNTER[1], COUNTER[2]]} phase={o.phase} cycles={3} amp={0.14} />
    <SwingCounter position={COUNTER} swings={o.swings} seconds={o.seconds} tick={o.tick} />
    {o.rule !== undefined && <Label text={"50 SWINGS\n= 1 SECOND"} position={[COUNTER[0], 2.08, -2.3]} width={0.95} fg="#14062b" bg="#ffd23f" appear={o.rule} />}
    <Label text="WALL" position={[BIG_SOCKET[0], 1.62, -2.4]} width={0.5} />
    <BigPhone position={PHONE_AT} text={"08:02"} scale={1.4} quartz f={f} />
    <Label text="QUARTZ" position={[PHONE_AT[0], 0.32, -1.85]} width={0.5} fg="#14062b" bg="#bfefff" />
    <RadioClock position={RADIO_BIG} text="07:56" scale={2.6} f={f} />
    <Label text="NO QUARTZ" position={[RADIO_BIG[0], 1.48, -1.85]} width={0.6} fg="#ffffff" bg="#e0262f" />
  </Room>
);
const works = (camera: CameraShot, f: number, o: WorksOpts, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<WorksSet camera={camera} f={f} o={o} />} />
);
// 50 swings a second, slowed down so the eye can follow: one swing every `rate` frames.
const swingAt = (f: number, rate = 0.9) => f / rate;

// ---------- power strip ----------

const StripSet: React.FC<{ camera: CameraShot; f: number; label?: number; ends?: number }> = ({ camera, f, label, ends }) => (
  <Room camera={camera} mood="office" floor="#cfe3da" wall="#4fbf7a" stripe="#ffffff" width={10} depth={5} wallPattern="panel" floorPattern="tile" sun={{ x: 1.5, color: "#ffffff", bars: 5 }}>
    <PowerStrip position={[0, 0, -1.3]} pulse={f * 0.5} />
    <WaveRope from={[-3.45, 0.95, -1.3]} to={[3.45, 0.95, -1.3]} phase={f * 0.6} cycles={14} amp={0.08} radius={0.016} />
    {label !== undefined && <Label text="25 COUNTRIES" position={[0, 1.75, -2.42]} width={1.4} fg="#ffffff" bg="#1d4fa8" appear={label} />}
    {ends !== undefined && <Label text="SPAIN" position={[-3.2, 1.35, -1.3]} width={0.5} appear={ends} />}
    {ends !== undefined && <Label text="TURKEY" position={[3.2, 1.35, -1.3]} width={0.55} appear={ends - 16} />}
  </Room>
);
const strip = (camera: CameraShot, f: number, label?: number, ends?: number) => (
  <Stage bg={moodBackground("office")} camera={camera} set={<StripSet camera={camera} f={f} label={label} ends={ends} />} />
);

// ---------- control room (guide/references/grid-control-room.md) ----------

const SCALE_AT: [number, number, number] = [0, 0, -1.35];
const OP_AT: [number, number] = [0.7, -0.5];
const DIAL_AT: [number, number, number] = [0, 2.05, -2.86];
type ControlOpts = { hz: number; readout: string; readAppear?: number; tilt?: number; inLoad?: number; outLoad?: number; extra?: number; crates?: number };
const ControlSet: React.FC<{ camera: CameraShot; f: number; alarm: boolean; o: ControlOpts }> = ({ camera, f, alarm, o }) => (
  <Room camera={camera} mood={alarm ? "alarm" : "night"} floor={alarm ? "#3a1010" : "#1c2433"} wall={alarm ? "#7a1a1a" : "#1b2a5e"} width={8} depth={6} wallPattern="panel" floorPattern="carpet">
    <VideoWall position={[0, 1.95, -2.95]} width={5.4} height={1.5} alarm={alarm} />
    <HzDial position={DIAL_AT} hz={o.hz} size={0.85} alarm={alarm} />
    <Screen position={[0, 1.38, -2.85]} text={o.readout} size={[0.95, 0.24]} glow={alarm ? "#ff3b30" : "#39ff7a"} bg="#05080a" appear={o.readAppear} />
    <Console position={[-1.55, 0, -1.7]} width={1.3} alarm={alarm} rotationY={0.25} />
    <Console position={[1.65, 0, -1.7]} width={1.3} alarm={alarm} rotationY={-0.25} />
    <BalanceScale position={SCALE_AT} tilt={o.tilt ?? 0} inLoad={o.inLoad} outLoad={o.outLoad} extra={o.extra} />
    {o.crates !== undefined && (
      <group userData={{ ghost: true }}>
        <EnergyCrate position={[-1.6 + o.crates * 0.75, 0, -0.75]} scale={0.8} />
      </group>
    )}
    {alarm && <Beacon position={[2.4, 2.7, -2.85]} f={f} />}
  </Room>
);
const controlLight = (alarm: boolean, f: number): PuppetLight => ({
  points: alarm
    ? [{ position: [2.4, 2.6, -2.7], color: "#ff4a3a", strength: 1.4 + 0.8 * Math.abs(Math.sin(f * 0.3)), range: 5 }]
    : [{ position: [1.65, 1.2, -1.5], color: "#8fd8ff", strength: 1.3, range: 2.6 }],
});
const control = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: ControlOpts, alarm = false, blur?: number) => (
  <Stage bg={moodBackground(alarm ? "alarm" : "night")} camera={camera} puppets={puppets} blur={blur} light={controlLight(alarm, f)} set={<ControlSet camera={camera} f={f} alarm={alarm} o={o} />} />
);

// ---------- Balkan office ----------

const DESK_K: [number, number, number] = [-1.15, 0, -1.75];
const DESK_S: [number, number, number] = [1.15, 0, -1.75];
const OPK_AT: [number, number] = [-0.45, -0.85];
const OPS_AT: [number, number] = [0.45, -0.85];
type BalkanOpts = { short?: number; gap?: number; cal?: number };
const BalkanSet: React.FC<{ camera: CameraShot; f: number; o: BalkanOpts }> = ({ camera, f, o }) => (
  <Room camera={camera} mood="daylight" floor="#d8e0ea" wall="#2a9d8f" stripe="#ffffff" width={8} depth={5} wallPattern="plaster" floorPattern="tile" sun={{ x: 0.2, color: "#fff6d8", bars: 4 }}>
    <Desk position={DESK_K} size={[1.2, 0.72, 0.6]} color="#c9ced3" />
    <Desk position={DESK_S} size={[1.2, 0.72, 0.6]} color="#c9ced3" />
    <Screen position={[DESK_K[0], 1.02, DESK_K[2] - 0.1]} text="GRID" size={[0.4, 0.26]} glow="#5ad1ff" bg="#071226" />
    <Screen position={[DESK_S[0], 1.02, DESK_S[2] - 0.1]} text="GRID" size={[0.4, 0.26]} glow="#5ad1ff" bg="#071226" />
    <Label text={"KOSOVO\nGRID"} position={[DESK_K[0], 2.0, -2.43]} width={0.75} fg="#ffffff" bg="#1d4fa8" />
    <Label text={"SERBIA\nGRID"} position={[DESK_S[0], 2.0, -2.43]} width={0.75} fg="#ffffff" bg="#c0392b" />
    {o.short !== undefined && <Screen position={[DESK_K[0], 1.42, -2.4]} text="SHORT" size={[0.6, 0.22]} glow="#ff3b30" bg="#1a0505" appear={o.short} />}
    {/* the cable between the two grids, with a missing piece in the middle */}
    <InkBox size={[1.0, 0.05, 0.05]} position={[-0.75, 0.03, -1.55]} color="#2c3a40" ink={0.006} />
    <InkBox size={[1.0, 0.05, 0.05]} position={[0.75, 0.03, -1.55]} color="#2c3a40" ink={0.006} />
    {o.gap !== undefined && <Label text="GAP" position={[0, 0.85, -1.55]} width={0.45} fg="#ffffff" bg="#e0262f" appear={o.gap} />}
    {o.gap !== undefined && o.gap > 0 && (
      <group userData={{ ghost: true }}>
        {[0, 1, 2].map((k) => {
          const a = ((f * 0.15 + k / 3) % 1);
          return (
            <mesh key={k} position={[-0.25 + a * 0.1 * (k - 1), 0.05 + a * 0.15, -1.5]}>
              <sphereGeometry args={[0.02 * (1 - a) + 0.005, 6, 6]} />
              <meshBasicMaterial color="#ffd23f" toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    )}
    <WallCalendar position={[0, 2.35, -2.43]} month={"JAN\n2018"} width={0.45} flip={0} />
    <Plant position={[2.8, 0, -2.0]} />
  </Room>
);
const balkan = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: BalkanOpts = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<BalkanSet camera={camera} f={f} o={o} />} />
);

// ---------- shots ----------

// Low angle: you sprint in from the left as the doors slide shut.
const PlatformSprint: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -8, 44, [-1.1, 0.35], [-0.1, 0.25]);
  const cam: CameraShot = { position: lerp3([1.3, 0.42, 2.7], [1.0, 0.45, 2.3], ramp(f, 0, 40)), target: [-0.75, 1.05, -0.6], fov: 50 };
  return platform(cam, [pup("you", YOU, w.at, { expression: "shocked", ...w.pose, armL: [140, -30], armR: [-30, 20] }), pup("commuter", COMMUTER, [1.7, 0.6], { expression: "bored", lookX: -0.8 })], { doors: ramp(f, 16, 34) });
};

// Gag: you skid at the yellow line, your bag flies, the train slides off.
const TrainLeaves: React.FC = () => {
  const f = useShotFrame();
  const skid = Easing.out(Easing.quad)(ramp(f, 0, 14));
  const trainX = 7 * Easing.in(Easing.quad)(ramp(f, 4, 38));
  const cam: CameraShot = { position: lerp3([-0.6, 1.25, 3.2], [-0.4, 1.2, 2.8], ramp(f, 0, 38)), target: [0.2, 0.9, -0.6], fov: 42 };
  return platform(cam, [pup("you", YOU, [-0.1 + skid * 0.45, 0.25 - skid * 0.2], { ...faceChange([[0, "shocked"], [22, "sad"]], f), lean: 18 * (1 - ramp(f, 14, 24)), armL: [150, -20], armR: [150, -20], bob: f < 14 ? 0.02 : 0 })], { trainX, doors: 1, bag: ramp(f, 2, 20) });
};

// The phone, close: 08:02, LATE.
const PhoneMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 1.12, 1.25], [0.05, 1.1, 1.05], ramp(f, 0, 31)), target: [0, 1.02, 0.45], fov: 34 };
  return (
    <Stage
      bg={moodBackground("cold")}
      camera={cam}
      energy={0.5}
      set={
        <>
          <PlatformSet camera={cam} trainX={9} doors={1} mood="cold" clock={[8, 2]} board={"08:00 CITY\nDEPARTED"} />
          <BigPhone position={[0, 1.02, 0.45]} text={"08:02\nLATE"} scale={0.6} rotation={[0, 0, -0.06 + Math.sin(f / 9) * 0.03]} />
        </>
      }
    />
  );
};

// Seed: the oven clock that morning said 07:51; pull back to show it plugged into the wall.
const OvenSeed: React.FC = () => {
  const f = useShotFrame();
  const p = ease(ramp(f, 0, 44));
  const cam: CameraShot = { position: lerp3([0.7, 1.45, -1.25], [0.15, 1.35, 0.15], p), target: lerp3(OVEN_CLOCK, [0.45, 1.25, -2.0], p), fov: 40 };
  return kitchen(cam, f, [], { clock: "07:51" });
};

const OvenProud: React.FC = () => {
  const f = useShotFrame();
  const pat = Math.abs(Math.sin(f / 4)) * (f > 8 && f < 30 ? 1 : 0);
  return kitchen(medium(0.15, YOU_K[1], ramp(f, -8, 48), -0.55), f, [pup("you", YOU, [0.2, -1.2], { expression: "smug", reachR: [250, -640 - pat * 40], frontR: true, lookX: 0.6, headTilt: 6 })], { clock: "07:52" });
};

// Calendar pages flip: weeks pass.
const CalendarWeeks: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([CAL[0] + 0.15, 1.7, -0.9], [CAL[0] + 0.1, 1.72, -1.15], ramp(f, -8, 24)), target: [CAL[0], 1.65, CAL[2]], fov: 40 };
  return kitchen(cam, f, [], { month: "JAN", next: "FEB", flip: ease(ramp(f, 4, 18)) });
};

// Gag: blissful, eyes shut, while the coffee overflows across the worktop.
const CoffeeSpill: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.6, 1.9], [0.5, 1.55, 1.6], ramp(f, 0, 43)), target: [-0.25, 1.0, -1.8], fov: 40 };
  return kitchen(cam, f, [pup("you", YOU, [0.3, -1.3], { expression: "happy", blink: true, headTilt: Math.sin(f / 9) * 8, armL: [30, -40], armR: [30, -40], lookX: -0.3 })], { pour: 0.5, spill: ramp(f, 4, 40), clock: "07:53" });
};

// Low angle: the door rattles with three knocks; you turn.
const Knock: React.FC = () => {
  const f = useShotFrame();
  const knock = [4, 10, 16].some((k) => f >= k && f < k + 4) ? 1 : 0;
  const cam: CameraShot = { position: lerp3([-0.9, 0.45, 1.6], [-0.8, 0.5, 1.3], ramp(f, -8, 34)), target: [0.2, 1.2, -2.3], fov: 46 };
  return hall(cam, [pup("you", YOU, [-0.55, -0.6], { ...faceChange([[0, "neutral"], [8, "confused"]], f), view: "side", facing: 1 })], 0, knock);
};

// The door swings open: the neighbour, in his bathrobe, holding up his radio clock.
const NB_AT: [number, number] = [0.35, -1.55];
const NeighbourReveal: React.FC = () => {
  const f = useShotFrame();
  const door = Easing.out(Easing.back(1.3))(ramp(f, 2, 14));
  const w = stroll(f, 10, 18, [0.35, -2.25], NB_AT);
  const cam: CameraShot = { position: lerp3([0.2, 1.35, 1.6], [0.3, 1.25, 0.9], ease(ramp(f, 0, 57))), target: [0.35, 0.95, -1.8], fov: 40 };
  const lift = ramp(f, 26, 34) * 0.12;
  return hall(cam, [pup("neighbour", NEIGHBOUR, w.at, { expression: "worried", ...HOLD_RADIO, ...w.pose, reachL: [-70, -560 - lift * 800], reachR: [70, -560 - lift * 800] })], door, 0, (
    <RadioClock position={radioAt(w.at, lift)} text="07:56" f={f} />
  ));
};

// Over your shoulder: he talks, radio up.
const NeighbourTalks: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.0, 1.55, 0.75], [-0.92, 1.52, 0.55], ramp(f, 0, 44)), target: [0.4, 1.05, -1.6], fov: 30 };
  return hall(cam, [pup("you", YOU, [-0.65, -0.35], { view: "back", expression: "neutral" }), pup("neighbour", NEIGHBOUR, NB_AT, { expression: "worried", ...HOLD_RADIO, reachL: [-70, -660], reachR: [70, -660], lookX: -0.5, headTilt: Math.sin(f / 7) * 5 })], 1, 0, <RadioClock position={radioAt(NB_AT, 0.12)} text="07:56" f={f} />);
};

// Gag: the alarm goes off in his hands; he juggles it and drops it.
const RadioBlare: React.FC = () => {
  const f = useShotFrame();
  const toss = ramp(f, 12, 30);
  const fall = ramp(f, 30, 38);
  const y = f < 12 ? 0.12 : f < 30 ? 0.12 + Math.sin(toss * Math.PI) * 0.35 : 0.12 - Easing.in(Easing.quad)(fall) * 0.75;
  const landed = f >= 38;
  const sq = squash(f, 38, 0.3);
  const cam: CameraShot = { position: lerp3([0.0, 1.0, 0.6], [0.05, 0.9, 0.4], ramp(f, 0, 46)), target: [0.35, 0.65, -1.5], fov: 44 };
  const arms = f < 30 ? { ...HOLD_RADIO, reachL: [-90, -620 - Math.sin(f) * 40] as [number, number], reachR: [90, -620 + Math.sin(f) * 40] as [number, number] } : { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
  return hall(cam, [pup("neighbour", NEIGHBOUR, NB_AT, { expression: f < 30 ? "shocked" : "awkward", ...arms, bob: f < 30 ? Math.sin(f * 1.3) * 8 : 0 })], 1, 0, (
    <group position={landed ? [NB_AT[0] + 0.1, 0.075, NB_AT[1] + 0.35] : [radioAt(NB_AT)[0] + toss * 0.1, 0.7 + y, NB_AT[1] + 0.16 + fall * 0.2]} scale={landed ? sq : [1, 1, 1]} rotation={[0, 0, landed ? 0.1 : toss * 4]}>
      <RadioClock position={[0, 0, 0]} text={landed ? "07:56" : "ALARM"} buzz={landed ? 0 : 1} f={f} />
    </group>
  ));
};

const ClockWallPush: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 0.6], [0.1, 1.35, -0.4], ease(ramp(f, -8, 37))), target: [0, 1.3, -2.35], fov: 44 };
  return clockWall(cam, f);
};

// Low angle pull back: the whole wall of late clocks, a commuter staring up.
const ClockWallPull: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 0.5, 0.6], [0.9, 0.55, 1.8], ease(ramp(f, 0, 35))), target: [0, 1.5, -2.35], fov: 52 };
  return clockWall(cam, f, [pup("commuter", COMMUTER, [-0.5, -0.9], { expression: "confused", view: "back" }), pup("you", YOU, [0.55, -0.8], { expression: "shocked", lookX: -0.4 })]);
};

const PhoneQuartz: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PHONE_AT[0] + 0.5, 1.1, 0.0], [PHONE_AT[0] + 0.3, 1.0, -0.4], ease(ramp(f, -8, 53))), target: [PHONE_AT[0], 0.8, PHONE_AT[2]], fov: 40 };
  return works(cam, f, { phase: f * 0.5, swings: 12, seconds: 7 });
};

const RadioNoQuartz: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([RADIO_BIG[0] - 0.4, 1.15, -0.2], [RADIO_BIG[0] - 0.25, 1.1, -0.5], ramp(f, 0, 29)), target: [RADIO_BIG[0], 1.1, RADIO_BIG[2]], fov: 40 };
  return works(cam, f, { phase: f * 0.5, swings: 18, seconds: 7 });
};

// Macro on the wall socket: the current rope starts swinging out of it.
const SocketMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([BIG_SOCKET[0] + 0.25, 1.15, -1.3], [BIG_SOCKET[0] + 0.4, 1.12, -1.15], ramp(f, 0, 40)), target: [BIG_SOCKET[0] + 0.15, 1.1, BIG_SOCKET[2]], fov: 42 };
  return works(cam, f, { phase: swingAt(f) * 0.7, swings: 20, seconds: 7 });
};

const RopeFollow: React.FC = () => {
  const f = useShotFrame();
  const p = ease(ramp(f, 0, 20));
  const cam: CameraShot = { position: lerp3([-0.6, 1.25, -0.9], [0.2, 1.25, -0.6], p), target: lerp3([-0.6, 1.1, -2.3], [0.6, 1.1, -2.2], p), fov: 44 };
  return works(cam, f, { phase: swingAt(f + 40) * 0.7, swings: 24, seconds: 7 });
};

const RopeSwing: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.45, 1.0], [0.15, 1.45, 0.7], ramp(f, 0, 41)), target: [0.1, 1.3, -2.2], fov: 46 };
  return works(cam, f, { phase: swingAt(f + 60) * 0.7, swings: 25 + Math.min(14, f / 3), seconds: 7 });
};

const CounterCount: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([COUNTER[0] - 0.3, 1.4, 0.9], [COUNTER[0] - 0.15, 1.38, 0.6], ramp(f, 0, 41)), target: [COUNTER[0], 1.25, COUNTER[2]], fov: 42 };
  return works(cam, f, { phase: swingAt(f + 100) * 0.7, swings: 39 + Math.min(10, f / 4), seconds: 7 });
};

// Fifty: the SECONDS window clicks over, and the rule pops up.
const FiftyTick: React.FC = () => {
  const f = useShotFrame();
  const hit = f >= 8;
  const cam: CameraShot = { position: lerp3([COUNTER[0] - 0.1, 1.6, 1.3], [COUNTER[0] - 0.05, 1.62, 1.0], ramp(f, 0, 49)), target: [COUNTER[0], 1.55, COUNTER[2]], fov: 44 };
  return works(cam, f, { phase: swingAt(f + 140) * 0.7, swings: hit ? 0 : 49, seconds: hit ? 8 : 7, tick: hit ? Math.max(0, 1 - (f - 8) / 8) : 0, rule: pop(f, 14) });
};

// Top-down: you, tiny, next to the giant counter, hand on chin.
const YouTiny: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.55, 3.3, 0.2], [0.6, 3.2, 0.0], ramp(f, 0, 36)), target: [0.35, 0.4, -1.25], fov: 52 };
  return works(cam, f, { phase: swingAt(f + 200) * 0.7, swings: Math.min(49, f), seconds: 8, rule: 30 }, [pup("you", YOU, [0.3, -1.15], { ...moveChange([[0, "thinking", "chin"], [22, "happy"]], f), lookX: 0.6 })]);
};

// The power strip: one rhythm through 25 plugs.
const StripWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.6, 2.8], [0.3, 1.55, 2.5], ease(ramp(f, -8, 60))), target: lerp3([-0.5, 1.0, -1.3], [0.25, 1.0, -1.3], ease(ramp(f, -8, 60))), fov: 44 };
  return strip(cam, f, pop(f, 6));
};

const StripEnds: React.FC = () => {
  const f = useShotFrame();
  const p = ease(ramp(f, 0, 30));
  const cam: CameraShot = { position: lerp3([-3.0, 1.05, -0.1], [3.0, 1.05, -0.1], p), target: lerp3([-3.2, 0.95, -1.3], [3.2, 0.95, -1.3], p), fov: 46 };
  return strip(cam, f, 60, pop(f, 0));
};

// The control room: an operator under the big 50 HZ dial, the scale level.
const ControlRoom: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.55, 2.9], [0.3, 1.5, 2.4], ease(ramp(f, -8, 39))), target: [0.2, 1.35, -1.6], fov: 46 };
  return control(cam, f, [pup("operator", OPERATOR, OP_AT, { expression: "neutral", lookX: -0.6, bob: 0 })], { hz: 50 + Math.sin(f / 7) * 0.001, readout: "50.000 HZ" });
};

const ScaleLevel: React.FC = () => {
  const f = useShotFrame();
  const add = ramp(f, 6, 24);
  const cam: CameraShot = { position: lerp3([0.1, 1.45, 2.3], [0.15, 1.4, 2.0], ramp(f, 0, 45)), target: [0.15, 1.05, -1.2], fov: 50 };
  return control(cam, f, [pup("operator", OPERATOR, [0.65, -0.65], { expression: "determined", reachL: [-260, -700], frontL: true, lookX: -0.8 })], { hz: 50, readout: "50.000 HZ", tilt: 0.12 * (1 - add) * Math.cos(f / 5), inLoad: 3, outLoad: 3 });
};

const Calendar2018: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 2.0, -0.7], [0.1, 2.02, -1.0], ramp(f, -8, 47)), target: [0, 1.95, -2.43], fov: 40 };
  return balkan(cam, f, []);
};

// The two operators blame each other (no words, just pointing).
const TwoOperators: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.45, 2.7], [0, 1.4, 2.3], ramp(f, 0, 34)), target: [0, 1.05, -1.2], fov: 42 };
  return balkan(cam, f, [
    pup("opk", OPK, OPK_AT, { ...moveChange([[0, "neutral"], [4, "angry", "point"]], f), view: "side", facing: 1 }),
    pup("ops", OPS, OPS_AT, { ...moveChange([[0, "neutral"], [10, "angry", "point"]], f), view: "side", facing: -1 }),
  ]);
};

// Top-down over both desks and the broken cable between them.
const DisputeTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 3.6, 0.2], [0, 3.5, 0.0], ramp(f, 0, 35)), target: [0, 0.3, -1.2], fov: 48 };
  return balkan(cam, f, [
    pup("opk", OPK, OPK_AT, { expression: "angry", gesture: "point", view: "side", facing: 1 }),
    pup("ops", OPS, OPS_AT, { expression: "angry", gesture: "point", view: "side", facing: -1 }),
  ], { gap: pop(f, 14) });
};

const KosovoShort: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.9, 1.6, 1.6], [-0.8, 1.55, 1.3], ramp(f, 0, 54)), target: [-0.8, 1.35, -1.8], fov: 42 };
  return balkan(cam, f, [pup("opk", OPK, OPK_AT, { ...faceChange([[0, "angry"], [14, "worried"]], f), lookX: -0.5, gesture: "scratchHead" })], { short: pop(f, 8), gap: 40 });
};

// Low angle: the GAP sparks; the other desk does not move.
const GapLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 0.32, 1.4], [-0.1, 0.36, 1.1], ramp(f, 0, 59)), target: [0.25, 0.9, -1.4], fov: 50 };
  return balkan(cam, f, [pup("ops", OPS, OPS_AT, { expression: "skeptical", gesture: "armsCrossed", lookX: -0.6 })], { gap: pop(f, 2), short: 40 });
};

// Alarm: the beacon spins, the operator flinches.
const AlarmRoom: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.55, 2.3], [0.8, 1.52, 1.9], ramp(f, -8, 43)), target: [0.6, 1.5, -1.4], fov: 44 };
  return control(cam, f, [pup("operator", OPERATOR, OP_AT, { ...faceChange([[0, "neutral"], [6, "shocked"]], f), armL: [150, -30], armR: [150, -30], lookX: -0.4 })], { hz: 50 - 0.004 * ramp(f, 0, 30), readout: "50.000 HZ", tilt: -0.18 * ramp(f, 0, 20), inLoad: 2, outLoad: 3 }, true);
};

// The dial needle sags and the screen reads 49.996 HZ.
const HzDrop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.6, -0.2], [0.0, 1.6, -0.6], ramp(f, 0, 69)), target: [0, 1.55, -2.86], fov: 44 };
  return control(cam, f, [], { hz: 50 - 0.004 - Math.sin(f / 6) * 0.0005, readout: f < 10 ? "50.000 HZ" : "49.996 HZ", readAppear: pop(f, 10), tilt: -0.18, inLoad: 2, outLoad: 3 }, true);
};

// Back in the kitchen at dusk: a sliver drops off the oven's clock.
const Sliver: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.95, 1.5, -1.0], [0.85, 1.45, -1.25], ramp(f, -8, 55)), target: [OVEN_CLOCK[0], 1.3, OVEN_CLOCK[2]], fov: 40 };
  return kitchen(cam, f, [], { clock: "07:58", sliver: ramp(f, 10, 40), month: "FEB" }, "dusk");
};

const CalendarMarch: React.FC = () => {
  const f = useShotFrame();
  const flip1 = ease(ramp(f, 2, 16));
  const flip2 = ease(ramp(f, 26, 40));
  const cam: CameraShot = { position: lerp3([CAL[0] + 0.15, 1.72, -0.9], [CAL[0] + 0.1, 1.74, -1.2], ramp(f, 0, 54)), target: [CAL[0], 1.65, CAL[2]], fov: 40 };
  return kitchen(cam, f, [], f < 22 ? { month: "JAN", next: "FEB", flip: flip1 } : { month: "FEB", next: "MAR", flip: flip2 }, "dusk");
};

// −6 MIN pops over the oven clock; you, shocked, beside it.
const SixMin: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.6, 1.0], [0.35, 1.58, 0.7], ramp(f, 0, 33)), target: [0.5, 1.38, -1.7], fov: 42 };
  return kitchen(cam, f, [pup("you", YOU, [0.2, -1.15], { ...faceChange([[0, "neutral"], [4, "shocked"]], f), lookX: 0.8, armL: [140, -20], armR: [140, -20] })], { clock: "07:56", minus: pop(f, 2), month: "MAR" }, "dusk");
};

// March: the operator shoves ENERGY crates onto POWER IN; the scale tips the other way.
const PushEnergy: React.FC = () => {
  const f = useShotFrame();
  const push = ease(ramp(f, 0, 30));
  const w = stroll(f, 0, 30, [-1.95, -0.65], [-1.1, -0.65]);
  const cam: CameraShot = { position: lerp3([-1.1, 1.4, 2.4], [-0.9, 1.35, 2.0], ramp(f, -8, 46)), target: [-0.8, 1.0, -1.2], fov: 46 };
  return control(cam, f, [pup("operator", OPERATOR, w.at, { expression: "determined", ...w.pose, reachR: [300, -480], frontR: true })], { hz: 50 + 0.01 * ramp(f, 26, 46), readout: "50.000 HZ", crates: push, tilt: -0.15 + 0.3 * ramp(f, 30, 44), inLoad: 2, outLoad: 3, extra: f > 30 ? 2 : 0 });
};

const FastHz: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.6, 0.3], [0.05, 1.6, -0.3], ease(ramp(f, 0, 60))), target: [0, 1.55, -2.86], fov: 44 };
  return control(cam, f, [], { hz: 50.01 + Math.sin(f / 6) * 0.0005, readout: "50.01 HZ", readAppear: pop(f, 4), tilt: 0.15, inLoad: 4, outLoad: 3 });
};

// April: oven and phone agree again.
const AprilKitchen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.45, 1.5, 0.2], [0.5, 1.48, -0.1], ramp(f, -8, 47)), target: [0.5, 1.38, -1.9], fov: 42 };
  return kitchen(cam, f, [], { clock: "08:02", phone: "08:02", month: "APRIL" }, "daylight");
};

// Daylight platform: doors open, you step aboard with time to spare.
const BoardTrain: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 28, [-0.8, 0.4], [0.2, 0.0]);
  const cam: CameraShot = { position: lerp3([-0.6, 1.25, 2.9], [-0.4, 1.2, 2.6], ramp(f, -8, 30)), target: [-0.3, 1.0, -0.4], fov: 42 };
  return platform(cam, [pup("you", YOU, w.at, { expression: "happy", ...w.pose })], { mood: "daylight", doors: 0, trainX: -1.5, clock: [7, 58], board: "08:00 CITY\nON TIME" });
};

// Ending: the neighbour, still jabbing buttons on a blinking 12:00.
const NeighbourReset: React.FC = () => {
  const f = useShotFrame();
  const jab = Math.abs(Math.sin(f / 3));
  const cam: CameraShot = { position: lerp3([0.6, 1.3, 0.4], [0.5, 1.25, 0.1], ramp(f, -8, 33)), target: [0.35, 0.85, -1.6], fov: 38 };
  return hall(cam, [pup("neighbour", NEIGHBOUR, NB_AT, { expression: "angry", reachL: [-70, -620], frontL: true, reachR: [20, -660 - jab * 40], frontR: true, handR: "point", lookX: 0, headTilt: -8 })], 1, 0, (
    <RadioClock position={radioAt(NB_AT, 0.06)} text="12:00" blink f={f} />
  ));
};

const Facepalm: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.2, 1.0], [0.3, 1.15, 1.6], ease(ramp(f, 0, 36))), target: [0.35, 0.9, -1.6], fov: 40 };
  return hall(cam, [pup("neighbour", NEIGHBOUR, NB_AT, { ...moveChange([[0, "angry"], [6, "sad", "facepalm"]], f), lookX: 0 })], 1, 0, (
    <RadioClock position={[NB_AT[0] + 0.45, 0.075, NB_AT[1] + 0.3]} text="12:00" blink f={f} />
  ));
};

const SHOTS: Shot[] = [
  [0, 40, PlatformSprint, false],
  [40, 78, TrainLeaves, false],
  [78, 109, PhoneMacro, false],
  [109, 156, OvenSeed, true],
  [156, 204, OvenProud, false],
  [204, 228, CalendarWeeks, false],
  [228, 271, CoffeeSpill, false],
  [271, 305, Knock, true],
  [305, 362, NeighbourReveal, false],
  [362, 406, NeighbourTalks, false],
  [406, 453, RadioBlare, false],
  [453, 490, ClockWallPush, true],
  [490, 525, ClockWallPull, false],
  [525, 578, PhoneQuartz, true],
  [578, 607, RadioNoQuartz, false],
  [607, 647, SocketMacro, false],
  [647, 667, RopeFollow, false],
  [667, 708, RopeSwing, false],
  [708, 749, CounterCount, false],
  [749, 798, FiftyTick, false],
  [798, 834, YouTiny, false],
  [834, 894, StripWide, true],
  [894, 937, StripEnds, false],
  [937, 976, ControlRoom, true],
  [976, 1021, ScaleLevel, false],
  [1021, 1068, Calendar2018, true],
  [1068, 1102, TwoOperators, false],
  [1102, 1137, DisputeTop, false],
  [1137, 1191, KosovoShort, false],
  [1191, 1250, GapLow, false],
  [1250, 1293, AlarmRoom, true],
  [1293, 1362, HzDrop, false],
  [1362, 1417, Sliver, true],
  [1417, 1471, CalendarMarch, false],
  [1471, 1504, SixMin, false],
  [1504, 1550, PushEnergy, true],
  [1550, 1610, FastHz, false],
  [1610, 1657, AprilKitchen, true],
  [1657, 1687, BoardTrain, true],
  [1687, 1720, NeighbourReset, true],
  [1720, TIMING.totalFrames, Facepalm, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 109 },
  { at: 2, src: sfx("whoosh"), volume: 0.14 },
  { at: 18, src: sfx("door"), volume: 0.12 },
  { at: 44, src: sfx("tape-stop"), volume: 0.14 },
  { at: 46, src: sfx("whoosh"), volume: 0.2 },
  { at: 60, src: sfx("boom"), volume: 0.12 },
  { at: 80, src: sfx("credit-blip"), volume: 0.14 },
  { at: 109, src: sfx("hum"), volume: 0.03, until: 271 },
  { at: 118, src: sfx("credit-blip"), volume: 0.12 },
  ...[166, 172, 178].map((at) => ({ at, src: sfx("tick"), volume: 0.16 })),
  { at: 208, src: sfx("paper"), volume: 0.18 },
  { at: 232, src: sfx("bill-whirr"), volume: 0.1 },
  { at: 250, src: sfx("drawer"), volume: 0.08 },
  ...[275, 281, 287].map((at) => ({ at, src: sfx("stamp"), volume: 0.14 })),
  { at: 299, src: sfx("riser"), volume: 0.1 },
  { at: 307, src: sfx("door"), volume: 0.2 },
  { at: 347, src: sfx("sting"), volume: 0.16 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 418 + k * 3, src: sfx("credit-blip"), volume: 0.16 })),
  { at: 444, src: sfx("boom"), volume: 0.18 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 456 + k * 11, src: sfx("tick"), volume: 0.14 })),
  { at: 525, src: sfx("hum"), volume: 0.03, until: 834 },
  { at: 530, src: sfx("chime"), volume: 0.1 },
  { at: 610, src: sfx("button"), volume: 0.18 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: 670 + k * 6, src: sfx("tick"), volume: 0.12 })),
  { at: 757, src: sfx("stamp"), volume: 0.18 },
  { at: 763, src: sfx("pop"), volume: 0.2 },
  { at: 840, src: sfx("pop"), volume: 0.2 },
  { at: 894, src: sfx("pop"), volume: 0.18 },
  { at: 910, src: sfx("pop"), volume: 0.18 },
  { at: 937, src: sfx("hum"), volume: 0.03, until: 1021 },
  { at: 984, src: sfx("drawer"), volume: 0.14 },
  { at: 1021, src: sfx("ambience"), volume: 0.03, until: 1250 },
  { at: 1026, src: sfx("paper"), volume: 0.16 },
  { at: 1116, src: sfx("pop"), volume: 0.2 },
  { at: 1145, src: sfx("near-miss"), volume: 0.14 },
  { at: 1193, src: sfx("pop"), volume: 0.18 },
  { at: 1250, src: sfx("hum"), volume: 0.03, until: 1362 },
  ...Array.from({ length: 4 }, (_, k) => ({ at: 1252 + k * 12, src: sfx("button"), volume: 0.12 })),
  { at: 1290, src: sfx("tape-stop"), volume: 0.18 },
  { at: 1303, src: sfx("pop"), volume: 0.2 },
  { at: 1372, src: sfx("tick"), volume: 0.2 },
  { at: 1400, src: sfx("tick"), volume: 0.16 },
  { at: 1419, src: sfx("paper"), volume: 0.18 },
  { at: 1443, src: sfx("paper"), volume: 0.18 },
  { at: 1473, src: sfx("pop"), volume: 0.2 },
  { at: 1478, src: sfx("near-miss"), volume: 0.12 },
  { at: 1504, src: sfx("hum"), volume: 0.03, until: 1610 },
  { at: 1534, src: sfx("boom"), volume: 0.14 },
  { at: 1554, src: sfx("pop"), volume: 0.2 },
  { at: 1558, src: sfx("chime"), volume: 0.18 },
  { at: 1612, src: sfx("chime"), volume: 0.14 },
  { at: 1657, src: sfx("ambience"), volume: 0.03, until: 1687 },
  { at: 1660, src: sfx("door"), volume: 0.12 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 1690 + k * 6, src: sfx("button"), volume: 0.14 })),
  { at: 1728, src: sfx("near-miss"), volume: 0.14 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 271, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 271, to: 525, volume: 0.13 },
  { src: MUSIC_FILES.tension, from: 525, to: 1504, volume: 0.13 },
  { src: MUSIC_FILES.lounge, from: 1504, to: TIMING.totalFrames, volume: 0.13 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} voiceVolume={1.15} />;
