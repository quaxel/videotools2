import React from "react";
import * as THREE from "three";
import { Easing, interpolate } from "remotion";
import {
  CameraShot,
  Chair,
  Counter,
  Desk,
  faceChange,
  InkBox,
  InkCylinder,
  Label,
  lerp3,
  lieDown,
  moodBackground,
  moveChange,
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
} from "../../engine";
import { Ball, BallMachine, Beaker, Boat, BulkSack, DepthTank, Knob, PriceTag, ReservoirSet, SampleBottle, SunLamp, WATER_Y, WATER_Z } from "./props";
import TIMING_JSON from "./timing.json";

// "Why a City Dumped 96 Million Black Balls in Its Water" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "shade-balls";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#f6dcc4", hair: "#9a3a1a", outfit: "#2a9d8f", long: true };
const TOURIST: PuppetLook = { skin: "#fbe9d6", hair: "#f2c94c", outfit: "#ffd23f", long: true };
const WORKER: PuppetLook = { skin: "#d9a47e", hair: "#1d1a1a", outfit: "#f4f6f8", cap: "#1d4fa8", lanyard: "#1d4fa8" };
const SCIENTIST: PuppetLook = { skin: "#f2d0b0", hair: "#5a3a2a", outfit: "#e8e0c8", glasses: true };
const ACCOUNTANT: PuppetLook = { skin: "#fff3e6", hair: "#9aa0a6", outfit: "#5a5f6a", glasses: true, lanyard: "#c0392b" };
const STRANGER: PuppetLook = { skin: "#e8b89a", hair: "#3a2a20", outfit: "#e0262f", cap: "#e0262f" };
const CREW: PuppetLook = { skin: "#d9a47e", hair: "#1d1a1a", outfit: "#ff7a1a", cap: "#f4f6f8" };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });
const pop = (f: number, at: number) => f - at;
const ease = Easing.inOut(Easing.quad);

// ---------- reservoir ----------

const sunLight = (golden?: boolean): PuppetLight => ({
  distant: [{ direction: golden ? [0.8, 0.35, -0.5] : [-0.6, 0.8, 0.6], color: golden ? "#ffc070" : "#fff6d8", strength: golden ? 1.3 : 0.8 }],
});
const reservoir = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: { golden?: boolean; clear?: (x: number, z: number) => boolean; extra?: React.ReactNode; blur?: number } = {}) => (
  <Stage
    bg={o.golden ? "#3a2208" : "#bfe6ff"}
    camera={camera}
    puppets={puppets}
    blur={o.blur}
    light={sunLight(o.golden)}
    set={
      <ReservoirSet camera={camera} f={f} golden={o.golden} clear={o.clear}>
        {o.extra}
      </ReservoirSet>
    }
  />
);
const YOU_R: [number, number] = [0.2, 0.15];
const TOURIST_R: [number, number] = [0.85, 0.35];
const BOAT_X = 0.6;
const BOAT_Z = WATER_Z - 0.9;
// The boat's wake: an open strip of water behind it, out to the far field.
const wake = (bx: number) => (x: number, z: number) => (Math.abs(z - BOAT_Z) < 0.5 && x < bx + 1.0) || (Math.abs(x - bx) < 1.05 && Math.abs(z - BOAT_Z) < 0.5);
const boatAt = (bx: number) => <Boat position={[bx, WATER_Y + 0.08, BOAT_Z]} />;
const OUT_OF_BOAT = -300; // puppet units down to the boat floor

// ---------- lab 2007 ----------

const LabSet: React.FC<{ camera: CameraShot; screen?: number }> = ({ camera, screen }) => (
  <Room camera={camera} mood="office" floor="#cfe3da" wall="#4fbf7a" stripe="#ffffff" width={7} depth={5} wallPattern="tile" floorPattern="tile" sun={{ x: 1.8, color: "#ffffff", bars: 4 }}>
    <Counter position={[0, 0, -1.9]} size={[2.6, 0.62, 0.6]} color="#e6ecf2" top="#c9ced3" />
    {[-0.8, -0.6, -0.4, -0.2].map((x, i) => (
      <SampleBottle key={x} position={[x, 0.76, -1.85]} tint={i === 2 ? 0.7 : 0.05} />
    ))}
    <Screen position={[0.65, 1.45, -2.35]} size={[1.1, 0.6]} text={screen !== undefined && screen >= 0 ? "BROMATE\nOVER LIMIT" : "SAMPLE\nTEST"} glow={screen !== undefined && screen >= 0 ? "#ff3b30" : "#39ff7a"} bg="#071226" appear={screen} />
    <Label text="2007" position={[-1.0, 1.75, -2.42]} width={0.6} fg="#ffffff" bg="#1d4fa8" />
    <Plant position={[2.6, 0, -2.0]} />
  </Room>
);
const lab = (camera: CameraShot, puppets: PuppetPlacement[], screen?: number) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<LabSet camera={camera} screen={screen} />} />
);
const TECH_AT: [number, number] = [-0.3, -1.25];

// ---------- hazard ----------

const hazard = (camera: CameraShot, f: number, puppets: PuppetPlacement[], label?: number) => (
  <Stage
    bg={moodBackground("alarm")}
    camera={camera}
    puppets={puppets}
    light={{ points: [{ position: [1.4, 2.2, -1.6], color: "#ff4a3a", strength: 1.2 + 0.6 * Math.abs(Math.sin(f * 0.25)), range: 4 }] }}
    set={
      <Room camera={camera} mood="alarm" floor="#3a1010" wall="#c0392b" stripe="#ffd23f" width={7} depth={5} wallPattern="panel" floorPattern="concrete">
        <Counter position={[0, 0, -1.8]} size={[1.6, 0.62, 0.6]} color="#5a1a1a" top="#e6ecf2" />
        <group position={[0, 0.66, -1.75]} scale={squash(f, 6, 0.2)}>
          <InkCylinder radius={0.16} height={0.5} position={[0, 0.25, 0]} color="#f4f6f8" ink={0.01} />
          <InkCylinder radius={0.07} height={0.1} position={[0, 0.55, 0]} color="#e0262f" ink={0.006} />
          <Label text="BROMATE" position={[0, 0.25, 0.17]} width={0.3} />
        </group>
        {label !== undefined && <Label text={"SUSPECTED\nCARCINOGEN"} position={[0, 1.75, -2.42]} width={1.3} fg="#14062b" bg="#ffd23f" appear={label} />}
        <InkCylinder radius={0.09} height={0.12} position={[1.4, 2.4, -2.42]} rotation={[Math.PI / 2, 0, 0]} color="#ff3b30" ink={0.006} emissive="#ff1a10" />
      </Room>
    }
  />
);

// ---------- recipe bench ----------

type RecipeOpts = { chlorine?: number; lamp?: number; result?: number };
const RecipeSet: React.FC<{ camera: CameraShot; f: number; o: RecipeOpts }> = ({ camera, f, o }) => {
  const red = o.lamp ? ramp(o.lamp, 6, 30) : 0;
  return (
    <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" stripe="#ffb8ec" width={7} depth={5} wallPattern="wallpaper" floorPattern="wood">
      <Desk position={[0, 0, -1.6]} size={[2.0, 0.72, 0.8]} color="#c9a26b" />
      <Beaker position={[-0.15, 0.78, -1.55]} color={red > 0 ? `#${new THREE.Color("#9fd8ff").lerp(new THREE.Color("#e0262f"), red).getHexString()}` : "#9fd8ff"} fill={0.55 + 0.15 * (o.chlorine ?? 0)} label={red > 0.6 ? "BROMATE" : "BROMIDE"} scale={1.4} bubbles={red > 0 ? 1 : 0} f={f} />
      <group position={[0.55, 0.78 + 0.35 * (o.chlorine ?? 0), -1.55]} rotation={[0, 0, (o.chlorine ?? 0) * 1.4]}>
        <InkCylinder radius={0.08} height={0.3} position={[0, 0.15, 0]} color="#d8ff7a" ink={0.008} />
        <Label text="CHLORINE" position={[0, 0.15, 0.09]} width={0.3} />
        {(o.chlorine ?? 0) > 0.6 && (o.chlorine ?? 0) < 1 && <InkCylinder radius={0.01} height={0.3} position={[-0.25, 0.3, 0]} rotation={[0, 0, 1.0]} color="#d8ff7a" ink={0} />}
      </group>
      <SunLamp position={[-0.15, 1.9, -1.55]} on={o.lamp !== undefined && o.lamp >= 0 ? 1 : 0} beam={1.0} />
      {o.lamp !== undefined && <Label text="SUNLIGHT" position={[-0.15, 2.08, -1.3]} width={0.9} fg="#14062b" bg="#ffd23f" appear={o.lamp} />}
      {o.result !== undefined && <Label text="BROMATE" position={[-0.15, 1.35, -1.3]} width={0.6} fg="#ffffff" bg="#e0262f" appear={o.result} />}
    </Room>
  );
};
const recipe = (camera: CameraShot, f: number, o: RecipeOpts) => (
  <Stage
    bg={moodBackground("dream")}
    camera={camera}
    set={<RecipeSet camera={camera} f={f} o={o} />}
  />
);

// ---------- depth tank ----------

type TankOpts = { tints: number[]; light: number; knob?: number; more?: number; none?: number };
const TANK: [number, number, number] = [0, 0, -1.6];
const TankSet: React.FC<{ camera: CameraShot; f: number; o: TankOpts }> = ({ camera, f, o }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
    <DepthTank position={TANK} tints={o.tints} light={o.light} f={f} />
    <SunLamp position={[0, 3.0, -1.6]} on={1} power={o.light} beam={0.6} />
    {o.more !== undefined && <Label text="MORE" position={[0.55, 1.8, -1.12]} width={0.42} fg="#ffffff" bg="#e0262f" appear={o.more} />}
    {o.more !== undefined && <Label text="LESS" position={[0.55, 0.6, -1.12]} width={0.42} fg="#14062b" bg="#bfe6ff" appear={o.more - 18} />}
    {o.knob !== undefined && <Knob position={[-1.45, 1.4, -1.5]} value={o.knob} label="LIGHT" />}
    {o.knob !== undefined && o.knob < 0.5 && <Label text="-80%" position={[-1.45, 1.9, -1.5]} width={0.42} fg="#ffffff" bg="#1d4fa8" appear={20} />}
    {o.none !== undefined && <Screen position={[1.5, 1.5, -2.3]} size={[0.9, 0.5]} text={"NO\nBROMATE"} glow="#39ff7a" bg="#071226" appear={o.none} />}
  </Room>
);
const tank = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: TankOpts) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} set={<TankSet camera={camera} f={f} o={o} />} />
);

// ---------- budget room ----------

const BudgetSet: React.FC<{ camera: CameraShot; cover?: number; ball?: number }> = ({ camera, cover, ball }) => (
  <Room camera={camera} mood="warm" floor="#4a1820" wall="#e07a3a" stripe="#ffd23f" width={7} depth={5} wallPattern="panel" floorPattern="carpet">
    <Desk position={[0, 0, -1.7]} size={[2.4, 0.72, 0.8]} color="#8a5a3a" />
    {/* model reservoir under a blue floating cover */}
    <group position={[-0.55, 0.76, -1.7]}>
      <InkBox size={[0.9, 0.12, 0.6]} position={[0, 0.06, 0]} color="#d8c39a" ink={0.008} />
      <InkBox size={[0.84, 0.03, 0.54]} position={[0, 0.13, 0]} color="#1d4fa8" ink={0.004} />
      {cover !== undefined && <PriceTag position={[0, 0.65, 0.05]} text={"COVERS\n$300M+"} width={0.6} appear={cover} color="#ff9f1c" />}
    </group>
    {/* one ball on a pedestal */}
    <group position={[0.6, 0.76, -1.7]}>
      <InkCylinder radius={0.12} height={0.14} position={[0, 0.07, 0]} color="#f4f1ea" ink={0.006} />
      <Ball position={[0, 0.19, 0]} scale={2.2} />
      {ball !== undefined && <PriceTag position={[0, 0.65, 0.05]} text={"36\nCENTS"} width={0.45} appear={ball} color="#39ff7a" />}
    </group>
    <Chair position={[2.4, 0, -1.4]} color="#5a1a1a" />
    <Plant position={[-2.6, 0, -2.0]} />
  </Room>
);
const ACC_AT: [number, number] = [1.3, -0.75];
const budget = (camera: CameraShot, puppets: PuppetPlacement[], cover?: number, ball?: number) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} set={<BudgetSet camera={camera} cover={cover} ball={ball} />} />
);

// ---------- ball factory ----------

const FactorySet: React.FC<{ camera: CameraShot; f: number; meter?: number; sack?: number; uv?: number }> = ({ camera, f, meter, sack, uv }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" stripe="#2ad1ff" width={8} depth={5} wallPattern="brick" floorPattern="concrete">
    <BallMachine position={[-0.8, 0, -1.7]} f={f} sack={sack} />
    {/* test bench: a tray of balls under a sun lamp and a light meter */}
    <Counter position={[1.9, 0, -1.6]} size={[1.3, 0.62, 0.7]} color="#2a163f" top="#c9ced3" />
    <group position={[1.9, 0.66, -1.6]}>
      <InkBox size={[0.9, 0.06, 0.5]} position={[0, 0.03, 0]} color="#1b5e8a" ink={0.006} />
      {Array.from({ length: 24 }, (_, i) => (
        <Ball key={i} position={[-0.38 + (i % 8) * 0.11, 0.1, -0.16 + Math.floor(i / 8) * 0.13]} />
      ))}
    </group>
    <SunLamp position={[1.9, 1.85, -1.6]} on={1} beam={1.0} />
    {meter !== undefined && <Screen position={[1.3, 2.25, -2.35]} size={[1.0, 0.5]} text={"SUN BLOCKED\n95%"} glow="#ffd23f" bg="#14061b" appear={meter} count={ramp(meter, 0, 24)} />}
    {uv !== undefined && (
      <>
        <SunLamp position={[0.7, 1.85, -1.2]} on={uv >= 0 ? 1 : 0} color="#b066ff" beam={0.9} />
        <Label text="UV" position={[0.7, 2.35, -1.2]} width={0.35} fg="#ffffff" bg="#7b2fd0" appear={uv} />
        <InkCylinder radius={0.1} height={0.8} position={[0.7, 0.4, -1.2]} color="#e6ecf2" />
        <Ball position={[0.7, 0.93, -1.2]} scale={2.5} />
      </>
    )}
  </Room>
);
const factory = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: { meter?: number; sack?: number; uv?: number } = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<FactorySet camera={camera} f={f} {...o} />} />
);

// ---------- shots ----------

// Low angle along the path: you jog in; the black field fills the lower frame.
const JogPast: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -6, 52, [-2.4, 0.25], YOU_R);
  const cam: CameraShot = { position: lerp3([2.2, 1.35, 3.0], [0.9, 1.15, 2.3], ease(ramp(f, -6, 52))), target: [-0.4, 0.35, -2.0], fov: 48 };
  return reservoir(cam, f, [pup("you", YOU, w.at, { expression: "happy", ...w.pose })]);
};

// High and wide: the water is gone, black to the hills.
const WaterGone: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 4.5, 0.6], [0.4, 5.5, 0.2], ease(ramp(f, 0, 31))), target: [0.3, WATER_Y, -2.6], fov: 50 };
  return reservoir(cam, f, [pup("you", YOU, YOU_R, { ...faceChange([[0, "neutral"], [8, "shocked"]], f), view: "back" })], { extra: boatAt(-5.5) });
};

// Macro: glossy balls bobbing, the moored boat and its rope bottle beyond (the seed).
const BallsMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, WATER_Y + 0.35, WATER_Z + 0.25], [0.25, WATER_Y + 0.3, WATER_Z + 0.1], ramp(f, 0, 40)), target: [0.4, WATER_Y, WATER_Z - 1.4], fov: 40 };
  return reservoir(cam, f, [], { extra: boatAt(1.4) });
};

// Gag: you toss a ball; it bounces off the field and bonks you on the head.
const BallBonk: React.FC = () => {
  const f = useShotFrame();
  const t = ramp(f, 2, 26);
  const out = t < 0.5;
  const k = out ? t * 2 : (t - 0.5) * 2;
  const bx = YOU_R[0] + 0.15;
  const head: [number, number, number] = [YOU_R[0], 1.28, YOU_R[1]];
  const pos: [number, number, number] = out
    ? [bx, 1.0 + Math.sin(k * Math.PI) * 0.5 + (WATER_Y - 1.0) * k, 0.1 - 2.5 * k]
    : [bx + (head[0] - bx) * k, WATER_Y + (head[1] - WATER_Y) * k + Math.sin(k * Math.PI) * 0.6, -2.4 + (head[2] + 2.4) * k];
  const hit = f >= 26;
  const cam: CameraShot = { position: lerp3([1.2, 1.3, 2.3], [1.0, 1.25, 2.0], ramp(f, 0, 37)), target: [0.0, 0.75, -0.9], fov: 50 };
  return reservoir(cam, f, [pup("you", YOU, YOU_R, { ...moveChange([[0, "happy", "wave"], [26, "shocked"]], f), view: "side", facing: -1, headTilt: hit ? -12 * (1 - ramp(f, 30, 37)) : 0, lean: hit ? -8 : 0 })], {
    extra: f < 36 ? <Ball position={hit ? [head[0] + (f - 26) * 0.07, head[1] + 0.05 + Math.sin(((f - 26) / 10) * Math.PI) * 0.25, head[2] + (f - 26) * 0.04] : pos} scale={1.4} /> : undefined,
  });
};

// You figure it out (chin), then tap your temple: smart.
const Figure: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.1, 2.1], [0.5, 1.05, 1.8], ramp(f, 0, 40)), target: [YOU_R[0] - 0.1, 0.92, YOU_R[1]], fov: 36 };
  return reservoir(cam, f, [pup("you", YOU, YOU_R, { expression: "thinking", gesture: "chin", lookX: -0.6 })], { blur: 5 });
};
const Smart: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.05, 1.9], [-0.15, 1.02, 1.6], ramp(f, 0, 36)), target: [YOU_R[0], 0.92, YOU_R[1]], fov: 36 };
  return reservoir(cam, f, [pup("you", YOU, YOU_R, { expression: "smug", reachR: [120, -830], frontR: true, handR: "point", headTilt: 8 })], { blur: 5 });
};

// You explain it to a tourist, pointing at the water like a tour guide.
const ExplainTourist: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 3.3], [0.4, 1.25, 2.9], ramp(f, 0, 63)), target: [0.5, 0.75, 0.0], fov: 40 };
  return reservoir(cam, f, [
    pup("you", YOU, YOU_R, { expression: "smug", gesture: "point", view: "side", facing: -1 }),
    pup("tourist", TOURIST, TOURIST_R, { expression: "excited", hold: { item: "phone", hand: "R" }, armR: [10, -78], lookX: -0.6, headTilt: Math.sin(f / 6) * 6 }),
  ]);
};

// The boat glides in, cutting a lane through the balls.
const BoatArrives: React.FC = () => {
  const f = useShotFrame();
  const bx = interpolate(Easing.out(Easing.quad)(ramp(f, -8, 40)), [0, 1], [-4.0, BOAT_X]);
  const cam: CameraShot = { position: lerp3([1.6, 1.5, 1.2], [1.3, 1.45, 0.9], ramp(f, -4, 41)), target: [bx - 0.4, WATER_Y + 0.4, BOAT_Z], fov: 46 };
  return reservoir(cam, f, [pup("worker", WORKER, [bx, BOAT_Z], { expression: "neutral", air: OUT_OF_BOAT, view: "side", facing: 1 })], { clear: wake(bx), extra: boatAt(bx) });
};

// He climbs up the bank holding a sample bottle on a rope.
const WORKER_R: [number, number] = [0.55, -0.55];
const WorkerClimbs: React.FC = () => {
  const f = useShotFrame();
  const climb = ease(ramp(f, 0, 30));
  const at: [number, number] = [BOAT_X, interpolate(climb, [0, 1], [BOAT_Z + 0.3, WORKER_R[1]])];
  const air = OUT_OF_BOAT * (1 - climb);
  const cam: CameraShot = { position: lerp3([-0.4, 0.9, 1.8], [-0.3, 1.0, 1.5], ramp(f, 0, 48)), target: [0.5, 0.5, -1.4], fov: 44 };
  return reservoir(cam, f, [
    pup("worker", WORKER, at, { expression: "neutral", air, reachR: [180, -520], frontR: true, lean: 10 * (1 - climb) }),
    pup("you", YOU, YOU_R, { ...faceChange([[0, "smug"], [24, "shocked"]], f), view: "side", facing: -1 }),
  ], {
    clear: wake(BOAT_X),
    extra: (
      <>
        {boatAt(BOAT_X)}
        <SampleBottle position={[at[0] + 0.25, 0.42 + air * 0.001225, at[1] + 0.12]} scale={0.9} />
      </>
    ),
  });
};

// Over your shoulder: the worker sets you straight.
const WorkerTalks: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.45, 1.45, 2.1], [-0.4, 1.43, 1.9], ramp(f, 0, 50)), target: [WORKER_R[0], 0.98, WORKER_R[1]], fov: 32 };
  return reservoir(cam, f, [
    pup("you", YOU, [-0.25, 0.6], { view: "back", expression: "neutral" }),
    pup("worker", WORKER, WORKER_R, { expression: "smug", reachR: [200, -560], frontR: true, lookX: -0.4, gesture: "shrug" }),
  ], { clear: wake(BOAT_X), extra: <>{boatAt(BOAT_X)}<SampleBottle position={[WORKER_R[0] + 0.25, 0.55, WORKER_R[1] + 0.12]} scale={0.9} /></> });
};

// Macro: the sample bottle held up against the black field.
const BottleMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([WORKER_R[0] + 0.15, 0.85, WORKER_R[1] + 1.3], [WORKER_R[0] + 0.2, 0.8, WORKER_R[1] + 1.05], ramp(f, 0, 38)), target: [WORKER_R[0] + 0.25, 0.65, WORKER_R[1]], fov: 38 };
  return reservoir(cam, f, [], { clear: wake(BOAT_X), extra: <SampleBottle position={[WORKER_R[0] + 0.25, 0.65, WORKER_R[1] + 0.12]} tint={0.35} scale={1.2} /> });
};

// Whip to 2007: a technician at the sample bench.
const Lab2007: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.4, 2.8], [0.2, 1.35, 2.4], ramp(f, -8, 38)), target: [0.1, 1.15, -1.8], fov: 44 };
  return lab(cam, [pup("worker", WORKER, TECH_AT, { expression: "thinking", reachR: [220, -480], frontR: true, lookX: -0.5 })]);
};
const OverLimit: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.45, 1.4], [0.5, 1.45, 0.9], ramp(f, 0, 54)), target: [0.4, 1.3, -2.35], fov: 42 };
  return lab(cam, [pup("worker", WORKER, TECH_AT, { ...faceChange([[0, "thinking"], [8, "shocked"]], f), lookX: 0.8 })], pop(f, 4));
};

// Alarm-red: the bottle thumps down; SUSPECTED CARCINOGEN.
const Hazard: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 0.95, 0.8], [0.0, 1.05, 0.4], ramp(f, -8, 55)), target: [0, 1.15, -1.8], fov: 46 };
  return hazard(cam, f, [], pop(f, 8));
};

// Recipe bench: bromide in the beaker, chlorine poured in, then the sunlight lamp.
const Bromide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.25, 0.3], [-0.12, 1.22, 0.05], ramp(f, -8, 33)), target: [-0.05, 1.0, -1.55], fov: 42 };
  return recipe(cam, f, {});
};
const Chlorine: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.35, 0.5], [0.25, 1.32, 0.25], ramp(f, 0, 45)), target: [0.2, 1.1, -1.55], fov: 44 };
  return recipe(cam, f, { chlorine: ease(ramp(f, 4, 26)) });
};
const SunMix: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.5, 0.5], [-0.05, 1.45, 0.2], ramp(f, 0, 55)), target: [-0.1, 1.35, -1.6], fov: 46 };
  return recipe(cam, f, { chlorine: 0, lamp: pop(f, 2), result: pop(f, 30) });
};

// The depth test: a researcher lowers bottles on a rope into a tank.
const SCI_T: [number, number] = [-1.0, -0.8];
const TankRig: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.7, 3.2], [-0.5, 1.45, 2.4], ease(ramp(f, -8, 52))), target: [-0.55, 1.2, -1.4], fov: 48 };
  return tank(cam, f, [pup("scientist", SCIENTIST, SCI_T, { expression: "determined", reachR: [260, -820], frontR: true, lookX: 0.8 })], { tints: [0, 0, 0], light: 1 });
};
const TankDescend: React.FC = () => {
  const f = useShotFrame();
  const p = ease(ramp(f, 0, 46));
  const cam: CameraShot = { position: lerp3([0.1, 2.0, 0.6], [0.1, 0.6, 0.6], p), target: lerp3([0, 1.9, -1.5], [0, 0.6, -1.5], p), fov: 42 };
  return tank(cam, f, [], { tints: [0.1, 0.05, 0], light: 1 });
};
const TopBottle: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 2.0, 1.0], [-0.2, 1.75, 0.3], ease(ramp(f, 0, 56))), target: [0, 1.7, -1.5], fov: 40 };
  return tank(cam, f, [], { tints: [ramp(f, 4, 40) * 0.95, ramp(f, 4, 40) * 0.35, 0.05], light: 1, more: pop(f, 20) });
};
const Compare: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.3, 2.4], [0.2, 1.28, 2.1], ramp(f, 0, 37)), target: [0, 1.2, -1.5], fov: 44 };
  return tank(cam, f, [], { tints: [0.95, 0.35, 0.05], light: 1, more: 40 });
};
// The dimmer turns the light down 80%; the bottles stay clear.
const Dimmer: React.FC = () => {
  const f = useShotFrame();
  const v = 1 - 0.8 * ease(ramp(f, 4, 26));
  const cam: CameraShot = { position: lerp3([-0.9, 1.5, 1.4], [-1.0, 1.48, 1.1], ramp(f, 0, 50)), target: [-1.1, 1.35, -1.5], fov: 44 };
  return tank(cam, f, [pup("scientist", SCIENTIST, SCI_T, { expression: "determined", reachL: [-220, -880], frontL: true, lookX: -0.6 })], { tints: [0, 0, 0], light: v, knob: v });
};
const NoBromate: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.5, 2.4], [0.7, 1.48, 2.1], ramp(f, 0, 39)), target: [0.7, 1.35, -1.8], fov: 44 };
  return tank(cam, f, [], { tints: [0.02, 0.01, 0], light: 0.2, knob: 0.2, none: pop(f, 4) });
};

// Budget room: the cover's price tag pops; the accountant keels over (gag).
const CoverTag: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.6, 1.8], [-0.4, 1.4, 1.0], ease(ramp(f, -8, 45))), target: [-0.3, 1.15, -1.7], fov: 44 };
  return budget(cam, [pup("accountant", ACCOUNTANT, ACC_AT, { ...faceChange([[0, "neutral"], [10, "shocked"]], f), lookX: -0.8 })], pop(f, 4));
};
const Faint: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.0, 1.0, 1.6], [1.1, 0.9, 1.3], ramp(f, 0, 43)), target: [ACC_AT[0], 0.6, ACC_AT[1]], fov: 46 };
  return budget(cam, [pup("accountant", ACCOUNTANT, ACC_AT, { expression: "shocked", ...lieDown(f, 4, 18) })], 40);
};
// Top-down on the desk: the ball's tag, 36 CENTS.
const BallTag: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.25, -0.3], [0.6, 1.22, -0.6], ramp(f, 0, 57)), target: [0.6, 1.15, -1.7], fov: 42 };
  return budget(cam, [], 60, pop(f, 4));
};

// Factory test bench: 95% of the light blocked.
const Meter: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.3, 1.6, 1.6], [1.5, 1.6, 1.2], ramp(f, -8, 69)), target: [1.5, 1.4, -1.8], fov: 46 };
  return factory(cam, f, [], { meter: pop(f, 6) });
};
const CarbonSack: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.1, 1.75, 1.4], [-1.0, 1.7, 1.1], ramp(f, 0, 50)), target: [-1.2, 1.5, -1.7], fov: 46 };
  return factory(cam, f, [pup("worker", CREW, [-2.1, -1.0], { expression: "determined", reachR: [260, -900], frontR: true, lookX: 0.8 })], { sack: ease(ramp(f, 4, 24)) });
};
const UVLamp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.3, 0.2], [0.75, 1.28, -0.1], ramp(f, 0, 47)), target: [0.7, 1.25, -1.2], fov: 44 };
  return factory(cam, f, [], { uv: pop(f, 4) });
};

// 2015, golden hour: crews tip bulk sacks; balls roll down the bank.
const Release: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.4, 1.8, 3.4], [0.9, 1.7, 3.0], ramp(f, -8, 59)), target: [0.1, 0.2, -1.2], fov: 54 };
  return reservoir(cam, f, [
    pup("crew1", CREW, [-1.05, -0.15], { expression: "happy", reachL: [-200, -620], reachR: [200, -620], frontL: true, frontR: true }),
    pup("crew2", CREW, [1.25, -0.15], { expression: "excited", gesture: "cheer" }),
  ], {
    golden: true,
    extra: (
      <>
        <BulkSack position={[-0.4, 0, -0.9]} t={f / 40} />
        <BulkSack position={[0.6, 0, -0.9]} t={f / 40 + 0.4} seed={7} />
        <Label text="AUG 2015" position={[0.1, 1.6, -0.76]} width={0.9} fg="#ffffff" bg="#1d4fa8" />
      </>
    ),
  });
};
const Counter96: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.6, 2.6], [0.1, 1.58, 2.2], ramp(f, 0, 52)), target: [0.1, 1.45, -0.8], fov: 42 };
  return reservoir(cam, f, [], {
    golden: true,
    extra: (
      <>
        <InkCylinder radius={0.04} height={1.4} position={[-0.75, 0.7, -0.8]} color="#9aa0a6" />
        <InkCylinder radius={0.04} height={1.4} position={[0.95, 0.7, -0.8]} color="#9aa0a6" />
        <Screen position={[0.1, 1.55, -0.78]} size={[1.2, 0.36]} text={"96,000,000"} glow="#ffd23f" bg="#14060a" appear={pop(f, 2)} count={Easing.out(Easing.cubic)(ramp(f, 2, 40))} />
        <Label text="BALLS" position={[0.1, 1.95, -0.76]} width={0.6} />
      </>
    ),
  });
};

// Bonus vs enemy: evaporation wisps blocked; then the sun itself, low angle.
const EvapBonus: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.2, 0.9, 0.2], [-0.8, 0.85, -0.1], ramp(f, -8, 59)), target: [0.2, WATER_Y, -4], fov: 48 };
  return reservoir(cam, f, [], {
    extra: (
      <group userData={{ ghost: true }}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = ((f * 0.02 + i / 6) % 1);
          return (
            <mesh key={i} position={[-1 + i * 0.5, WATER_Y + 0.1 + a * 0.25, -3.2 - (i % 2)]}>
              <sphereGeometry args={[0.05 + a * 0.05, 8, 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.4 * (1 - a) * (1 - ramp(f, 10, 40))} depthWrite={false} />
            </mesh>
          );
        })}
        <Label text="EVAPORATION" position={[-0.05, 0.3, -2.6]} width={0.8} fg="#14062b" bg="#bfe6ff" appear={pop(f, 4)} />
      </group>
    ),
  });
};
const SunEnemy: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, WATER_Y + 0.2, WATER_Z + 0.4], [0.6, WATER_Y + 0.45, WATER_Z - 0.1], ease(ramp(f, 0, 44))), target: [-4, 6, -40], fov: 50 };
  return reservoir(cam, f, []);
};

// Ending: on your way back, the tourist explains it to a stranger.
const TouristAgain: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -8, 50, [-1.4, 0.6], [-0.15, 0.6]);
  const cam: CameraShot = { position: lerp3([0.1, 1.35, 4.2], [0.35, 1.3, 3.8], ramp(f, -8, 80)), target: [0.3, 0.8, 0.2], fov: 42 };
  return reservoir(cam, f, [
    pup("you", YOU, w.at, { expression: "happy", ...w.pose }),
    pup("tourist", TOURIST, [0.35, 0.25], { expression: "smug", gesture: "point", view: "side", facing: -1 }),
    pup("stranger", STRANGER, [0.8, 0.35], { expression: "excited", lookX: -0.7, hold: { item: "phone", hand: "R" }, armR: [10, -78] }),
  ]);
};
const Facepalm: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 3.4], [0.25, 1.25, 4.0], ease(ramp(f, 0, 80))), target: [0.3, 0.85, 0.3], fov: 42 };
  return reservoir(cam, f, [
    pup("you", YOU, [-0.15, 0.6], { ...moveChange([[0, "awkward"], [12, "sad", "facepalm"]], f), lean: f > 12 && f < 24 ? 10 : 0 }),
    pup("tourist", TOURIST, [0.35, 0.25], { expression: "excited", gesture: "point", view: "side", facing: -1 }),
    pup("stranger", STRANGER, [0.8, 0.35], { expression: "happy", gesture: "clap", lookX: -0.7 }),
  ]);
};

const SHOTS: Shot[] = [
  [0, 52, JogPast, false],
  [52, 83, WaterGone, false],
  [83, 123, BallsMacro, false],
  [123, 160, BallBonk, false],
  [160, 200, Figure, false],
  [200, 236, Smart, false],
  [236, 299, ExplainTourist, false],
  [299, 340, BoatArrives, false],
  [340, 388, WorkerClimbs, false],
  [388, 438, WorkerTalks, false],
  [438, 476, BottleMacro, false],
  [476, 514, Lab2007, true],
  [514, 568, OverLimit, false],
  [568, 623, Hazard, true],
  [623, 656, Bromide, true],
  [656, 701, Chlorine, false],
  [701, 756, SunMix, false],
  [756, 808, TankRig, true],
  [808, 854, TankDescend, false],
  [854, 910, TopBottle, false],
  [910, 947, Compare, false],
  [947, 997, Dimmer, false],
  [997, 1036, NoBromate, false],
  [1036, 1081, CoverTag, true],
  [1081, 1124, Faint, false],
  [1124, 1181, BallTag, false],
  [1181, 1250, Meter, true],
  [1250, 1300, CarbonSack, false],
  [1300, 1347, UVLamp, false],
  [1347, 1406, Release, true],
  [1406, 1458, Counter96, false],
  [1458, 1517, EvapBonus, true],
  [1517, 1561, SunEnemy, false],
  [1561, 1641, TouristAgain, false],
  [1641, TIMING.totalFrames, Facepalm, false],
];

// ---------- sound (one-shots low so the gaps between words stay clear) ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 476 },
  { at: 54, src: sfx("whoosh"), volume: 0.12 },
  { at: 128, src: sfx("whoosh"), volume: 0.1 },
  { at: 140, src: sfx("pop"), volume: 0.12 },
  { at: 149, src: sfx("boom"), volume: 0.14 },
  { at: 212, src: sfx("tick"), volume: 0.12 },
  { at: 300, src: sfx("hum"), volume: 0.03, until: 388 },
  { at: 326, src: sfx("riser"), volume: 0.07 },
  { at: 372, src: sfx("sting"), volume: 0.2 },
  { at: 440, src: sfx("paper"), volume: 0.1 },
  { at: 476, src: sfx("hum"), volume: 0.03, until: 568 },
  { at: 518, src: sfx("pop"), volume: 0.14 },
  { at: 520, src: sfx("near-miss"), volume: 0.1 },
  { at: 574, src: sfx("stamp"), volume: 0.14 },
  { at: 576, src: sfx("pop"), volume: 0.14 },
  { at: 623, src: sfx("hum"), volume: 0.03, until: 756 },
  { at: 664, src: sfx("paper"), volume: 0.1 },
  { at: 703, src: sfx("button"), volume: 0.16 },
  { at: 731, src: sfx("pop"), volume: 0.14 },
  { at: 756, src: sfx("ambience"), volume: 0.03, until: 1036 },
  { at: 770, src: sfx("drawer"), volume: 0.1 },
  { at: 874, src: sfx("pop"), volume: 0.14 },
  { at: 892, src: sfx("pop"), volume: 0.12 },
  ...Array.from({ length: 5 }, (_, k) => ({ at: 951 + k * 4, src: sfx("tick"), volume: 0.1 })),
  { at: 1001, src: sfx("chime"), volume: 0.12 },
  { at: 1036, src: sfx("hum"), volume: 0.03, until: 1181 },
  { at: 1040, src: sfx("pop"), volume: 0.14 },
  { at: 1090, src: sfx("boom"), volume: 0.16 },
  { at: 1128, src: sfx("pop"), volume: 0.14 },
  { at: 1131, src: sfx("credit-blip"), volume: 0.12 },
  { at: 1181, src: sfx("hum"), volume: 0.03, until: 1347 },
  { at: 1187, src: sfx("pop"), volume: 0.14 },
  { at: 1256, src: sfx("bill-whirr"), volume: 0.1 },
  { at: 1304, src: sfx("button"), volume: 0.14 },
  { at: 1347, src: sfx("ambience"), volume: 0.03, until: TIMING.totalFrames },
  { at: 1350, src: sfx("reel-spin"), volume: 0.03, until: 1406 },
  { at: 1408, src: sfx("pop"), volume: 0.14 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 1410 + k * 4, src: sfx("tick"), volume: 0.08 })),
  { at: 1446, src: sfx("chime"), volume: 0.14 },
  { at: 1462, src: sfx("pop"), volume: 0.12 },
  { at: 1655, src: sfx("near-miss"), volume: 0.1 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 299, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 299, to: 623, volume: 0.14 },
  { src: MUSIC_FILES.tension, from: 623, to: 1347, volume: 0.13 },
  { src: MUSIC_FILES.upbeat, from: 1347, to: 1458, volume: 0.12 },
  { src: MUSIC_FILES.lounge, from: 1458, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
