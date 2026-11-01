import React from "react";
import { Easing, interpolate } from "remotion";
import {
  Board,
  CameraShot,
  Counter,
  Door,
  Desk,
  faceChange,
  InkBox,
  InkCylinder,
  Label,
  lerp3,
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
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import {
  BrakePedal,
  Car,
  CAR_COLORS,
  CoffeeCup,
  Funnel,
  HighwaySet,
  jamAngle,
  ringAt,
  NeonSign,
  RING_R,
  ringPoint,
  SpeedGauge,
  SpeedSign,
  Spray,
  Stool,
  TrackSet,
} from "./props";
import TIMING_JSON from "./timing.json";

// "Why Traffic Jams Form With Nothing in the Way" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "phantom-traffic-jam";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#f6dcc4", hair: "#2b1d14", outfit: "#3fae5a" };
const TRUCKER: PuppetLook = { skin: "#fbe9d6", hair: "#b0451f", outfit: "#c0392b", pattern: "#8a1a1a", cap: "#1d4fa8", long: true };
const SCIENTIST: PuppetLook = { skin: "#f2d0b0", hair: "#1d1a1a", outfit: "#f4f6f8", glasses: true, lanyard: "#1d4fa8" };
const BARISTA: PuppetLook = { skin: "#d9a47e", hair: "#3a2a20", outfit: "#2a9d8f" };
const DRIVER: PuppetLook = { skin: "#fff3e6", hair: "#7a2e1a", outfit: "#ffd23f", cap: "#e0262f" };
const VICTIM: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#4f7dff", long: true };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });
const pop = (f: number, at: number) => f - at;
const ease = Easing.inOut(Easing.quad);
// Sitting in a car seat, seen in profile, facing the way the car drives (+x).
const DRIVING: Partial<PuppetPose> = { sit: true, view: "side", facing: 1, armL: [70, -50], armR: [70, -50] };

// ---------- truck (the seed: right behind you) ----------

const Truck: React.FC<{ position: Vec3; lights?: boolean }> = ({ position, lights }) => (
  <group position={position} scale={1.45} userData={{ ghost: true }}>
    <InkBox size={[1.0, 1.25, 1.0]} position={[0.1, 0.85, 0]} color="#c0392b" ink={0.012} />
    <InkBox size={[0.04, 0.42, 0.8]} position={[0.61, 1.15, 0]} color="#9fd8ff" ink={0.004} />
    <InkBox size={[3.4, 1.7, 1.05]} position={[-2.2, 1.1, 0]} color="#f4f6f8" ink={0.014} />
    <InkBox size={[3.4, 0.2, 0.02]} position={[-2.2, 0.55, 0.53]} color="#1d4fa8" ink={0} />
    {[0.2, -1.2, -1.6, -3.2, -3.6].map((x) =>
      [-0.45, 0.45].map((z) => <InkCylinder key={`${x}${z}`} radius={0.22} height={0.14} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" ink={0.008} />),
    )}
    {[-0.3, 0.3].map((z) => (
      <InkBox key={z} size={[0.03, 0.1, 0.18]} position={[0.62, 0.5, z]} color={lights ? "#fff6d8" : "#e6ecf2"} emissive={lights ? "#fff1c8" : "#000"} ink={0.004} />
    ))}
  </group>
);

// ---------- highway ----------

// A queue of cars in both lanes. `crawl` metres the queue has crept forward; `brake` lights them;
// `gone` 0..1 lets the cars ahead of `x0` pull away.
type Traffic = { crawl: number; brake: number; gone?: number; x0?: number; lights?: boolean };
const queue = (t: Traffic) => (
  <>
    {Array.from({ length: 16 }, (_, i) => {
      const lane = i % 2;
      const k = Math.floor(i / 2) - 3;
      let x = k * 2.7 + lane * 1.2 + t.crawl;
      if (t.gone && x > (t.x0 ?? 1)) x += t.gone * (6 + k * 3);
      if (Math.abs(x) < 0.05 && lane === 0) return null; // your own car sits at x = 0
      if (lane === 0 && x > -1.6 && x < 1.6) return null;
      if (lane === 0 && x < -1.6 && x > -8.5) return null; // the truck is behind you
      return <Car key={i} position={[x, 0, -1.3 * lane]} color={CAR_COLORS[(i * 3) % CAR_COLORS.length]} brake={t.gone && x > (t.x0 ?? 1) ? 0 : t.brake} lights={t.lights} />;
    })}
  </>
);
const MY_CAR_X = 0;
const highway = (camera: CameraShot, f: number, puppets: PuppetPlacement[], t: Traffic, extra?: { myX?: number; truckX?: number; night?: boolean; light?: PuppetLight; myColor?: string; blur?: number }) => {
  const myX = extra?.myX ?? MY_CAR_X;
  return (
    <Stage
      bg={extra?.night ? "#070b1c" : "#3b2a6b"}
      camera={camera}
      puppets={puppets}
      blur={extra?.blur}
      light={extra?.light ?? (t.brake > 0.5 ? { points: [{ position: [myX + 1.2, 0.6, 0.1], color: "#ff4a3a", strength: 1.4, range: 2.5 }] } : undefined)}
      set={
        <HighwaySet camera={camera} night={extra?.night}>
          {queue(t)}
          <Car position={[myX, 0, 0]} color={extra?.myColor ?? "#f4f6f8"} brake={t.brake} lights={t.lights} />
          <Truck position={[extra?.truckX ?? -3.0, 0, 0]} lights={t.lights} />
        </HighwaySet>
      }
    />
  );
};
const youInCar = (x: number, pose: Partial<PuppetPose>) => pup("you", YOU, [x - 0.15, 0.02], { expression: "neutral", ...DRIVING, ...pose } as PuppetPose);

// ---------- diner ----------

const COUNTER_Z = -1.55;
const YOU_D: [number, number] = [-0.35, -0.85];
const DINER_DOOR: Vec3 = [1.7, 0, -2.45];
const TRUCKER_D: [number, number] = [0.75, -0.75];
const DinerSet: React.FC<{ camera: CameraShot; f: number; door?: number; spray?: number }> = ({ camera, f, door = 0, spray }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" stripe="#2ad1ff" width={7} depth={5} wallPattern="tile" floorPattern="tile">
    <NeonSign position={[-0.6, 2.35, -2.42]} text="DINER" color="#2ad1ff" width={1.3} flicker={Math.floor(f / 7) % 9 === 0 ? 0 : 1} />
    <NeonSign position={[1.7, 2.55, -2.42]} text="OPEN" color="#ffd23f" width={0.7} />
    <Door position={DINER_DOOR} open={door} color="#2a163f" glow="#0b1030" />
    <Counter position={[-0.6, 0, COUNTER_Z]} size={[2.6, 0.72, 0.6]} color="#c0392b" top="#f2e6d0" />
    {[-1.5, -0.95, -0.35, 0.25].map((x) => (
      <Stool key={x} position={[x, 0, -0.95]} />
    ))}
    <CoffeeCup position={[YOU_D[0] + 0.1, 0.745, COUNTER_Z + 0.2]} f={f} />
    <InkBox size={[0.3, 0.42, 0.3]} position={[-1.6, 0.96, COUNTER_Z - 0.05]} color="#2c3a40" />
    <InkCylinder radius={0.12} height={0.14} position={[-1.2, 0.82, COUNTER_Z - 0.05]} color="#f2e6d0" />
    {spray !== undefined && <Spray origin={[YOU_D[0] + 0.12, 0.98, YOU_D[1] - 0.05]} t={spray} dir={1} />}
    <Plant position={[-2.8, 0, -2.0]} />
  </Room>
);
const diner = (camera: CameraShot, f: number, puppets: PuppetPlacement[], o: { door?: number; spray?: number; blur?: number } = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} blur={o.blur} set={<DinerSet camera={camera} f={f} door={o.door} spray={o.spray} />} />
);
const youSitting = (pose: Partial<PuppetPose>) => pup("you", YOU, YOU_D, { expression: "neutral", sit: true, ...pose } as PuppetPose);

// ---------- briefing room ----------

const BriefSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="office" floor="#cfe3da" wall="#4fbf7a" stripe="#ffffff" width={7} depth={5} wallPattern="panel" floorPattern="carpet" sun={{ x: -1.8, color: "#ffffff", bars: 4 }}>
    <Board position={[-0.6, 1.65, -2.42]} cards={["TEST PLAN", "1 RING ROAD", "NO OBSTACLE"]} width={1.4} height={0.9} />
    <Desk position={[0.9, 0, -1.4]} size={[1.2, 0.72, 0.8]} color="#e6ecf2" />
    {/* model of the ring on the desk with tiny cars going round */}
    <group position={[0.9, 0.76, -1.4]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.24, 0.34, 48]} />
        <meshBasicMaterial color="#5a5f6a" />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + f * 0.03;
        return <InkBox key={i} size={[0.035, 0.025, 0.02]} position={[Math.cos(a) * 0.29, 0.015, -Math.sin(a) * 0.29]} rotation={[0, a + Math.PI / 2, 0]} color={CAR_COLORS[i % CAR_COLORS.length]} ink={0.002} />;
      })}
    </group>
    <Plant position={[2.6, 0, -2.0]} />
  </Room>
);
const SCI_B: [number, number] = [0.15, -1.1];
const briefing = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<BriefSet camera={camera} f={f} />} />
);

// ---------- ring track ----------

// Sim seconds for a shot: `t0` at the cut, `rate` sim seconds per frame.
const simT = (f: number, t0: number, rate = 0.25) => t0 + Math.max(0, f) * rate;
const track = (camera: CameraShot, t: number, puppets: PuppetPlacement[] = [], o: { golden?: boolean; flag?: number; extra?: React.ReactNode; blur?: number } = {}) => (
  <Stage
    bg={o.golden ? "#3a2208" : "#bfe6ff"}
    camera={camera}
    puppets={puppets}
    blur={o.blur}
    light={o.golden ? { distant: [{ direction: [-0.8, 0.4, -0.4], color: "#ffc070", strength: 1.4 }] } : undefined}
    set={
      <TrackSet camera={camera} t={t} golden={o.golden} jamFlag={o.flag}>
        {o.extra}
      </TrackSet>
    }
  />
);
// A low trackside camera outside the ring at `angle`, `out` metres out, looking at the lane.
const ringCam = (angle: number, out: number, y: number, look = 0.6, fov = 46, side = 0): CameraShot => {
  const [px, pz] = ringPoint(angle, RING_R + out);
  const [tx, tz] = ringPoint(angle + side, RING_R);
  return { position: [px, y, pz], target: [tx, look, tz], fov };
};
const outward = (angle: number): number => Math.atan2(Math.cos(angle), -Math.sin(angle));

// ---------- wave strip (toy cars with speed gauges) ----------

const STRIP_X = [-1.6, -0.8, 0, 0.8, 1.6];
const StripSet: React.FC<{ camera: CameraShot; speeds: number[]; brakes: number[]; spacing?: number; pedal?: number }> = ({ camera, speeds, brakes, spacing = 1, pedal }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" stripe="#ffb8ec" width={8} depth={5} wallPattern="wallpaper" floorPattern="wood">
    <InkBox size={[4.6, 0.7, 0.8]} position={[0, 0.35, -1.6]} color="#3a1a5e" />
    <InkBox size={[4.6, 0.02, 0.5]} position={[0, 0.71, -1.6]} color="#5a5f6a" ink={0} />
    {STRIP_X.map((x, i) => (
      <group key={i}>
        <Car position={[x * spacing, 0.72, -1.6]} scale={0.42} color={CAR_COLORS[(i * 3) % CAR_COLORS.length]} brake={brakes[i]} />
        <InkCylinder radius={0.012} height={0.6} position={[x * spacing, 1.3, -1.85]} color="#2c3a40" ink={0} />
        <SpeedGauge position={[x * spacing, 1.68, -1.82]} value={speeds[i]} size={0.34} />
      </group>
    ))}
    <Label text="SPEED" position={[0, 2.25, -2.42]} width={0.9} fg="#14062b" bg="#ffd23f" />
    {pedal !== undefined && <BrakePedal position={[0, 0.71, -1.05]} press={pedal} />}
  </Room>
);
const strip = (camera: CameraShot, speeds: number[], brakes: number[], spacing = 1, pedal?: number) => (
  <Stage bg={moodBackground("dream")} camera={camera} set={<StripSet camera={camera} speeds={speeds} brakes={brakes} spacing={spacing} pedal={pedal} />} />
);

// ---------- bottleneck ----------

const neckStage = (camera: CameraShot, f: number, label?: number) => (
  <Stage
    bg={moodBackground("cold")}
    camera={camera}
    set={
      <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
        <Funnel position={[0, 0, -1.5]} t={f / 30} />
        {label !== undefined && <Label text="BOTTLENECK" position={[0, 2.0, -2.42]} width={1.3} fg="#ffffff" bg="#e0262f" appear={label} />}
        <Label text="TUNNEL" position={[1.35, 1.32, -1.5]} width={0.5} />
      </Room>
    }
  />
);

// ---------- shots ----------

// Hook: crawling in the jam, bored, red brake light on your face; the truck fills your mirror.
const Crawl: React.FC = () => {
  const f = useShotFrame();
  const crawl = Math.max(0, Math.sin(f / 9)) * 0.004 * f;
  const cam: CameraShot = { position: lerp3([-0.4, 1.2, 3.6], [-0.25, 1.17, 3.2], ramp(f, 0, 55)), target: [-0.15, 0.92, 0], fov: 38 };
  return highway(cam, f, [youInCar(0, { expression: "bored", headTilt: -10, lookX: 0.3 })], { crawl, brake: 1 });
};

// High behind: the cars ahead release their brakes and pull away; nothing there.
const OpensUp: React.FC = () => {
  const f = useShotFrame();
  const gone = Easing.in(Easing.quad)(ramp(f, 4, 48));
  const cam: CameraShot = { position: lerp3([-5.0, 2.6, 2.2], [-4.4, 2.5, 1.9], ramp(f, -8, 49)), target: [4, 0.6, -0.6], fov: 44 };
  return highway(cam, f, [youInCar(0, { ...faceChange([[0, "bored"], [16, "confused"]], f) })], { crawl: 0.2, brake: f < 8 ? 1 : 0, gone, x0: 1 }, { truckX: -2.6 });
};

// Pan along the empty verge: no crash, no cones, nothing.
const NoCrash: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([10, 1.4, 1.6], [13, 1.4, 1.6], ramp(f, 0, 21)), target: lerp3([12, 0.6, -2.4], [15, 0.6, -2.4], ramp(f, 0, 21)), fov: 44 };
  return highway(cam, f, [], { crawl: 0, brake: 0, gone: 1, x0: 1 });
};

const Nothing: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.1, 2.4], [-0.05, 1.08, 2.15], ramp(f, 0, 36)), target: [-0.15, 0.95, 0], fov: 36 };
  return highway(cam, f, [youInCar(0, { expression: "confused", lookX: Math.sin(f / 5) > 0 ? 1 : -1, headTilt: Math.sin(f / 5) * 10 })], { crawl: 0, brake: 0, gone: 1, x0: 1 }, { blur: 5 });
};

// Gag: you floor it; your head snaps back. The camera trucks with you, hills sliding.
const FloorIt: React.FC = () => {
  const f = useShotFrame();
  const x = 6 * Easing.in(Easing.cubic)(ramp(f, 2, 51));
  const cam: CameraShot = { position: [x - 0.5 + f * 0.01, 1.2, 3.4], target: [x - 0.1, 0.9, 0], fov: 40 };
  const snap = ramp(f, 2, 6) * (1 - ramp(f, 14, 24));
  return highway(cam, f, [youInCar(x, { expression: "excited", lean: -18 * snap, headTilt: -14 * snap, hair: { lift: 30 * snap, sway: -10 } })], { crawl: 0, brake: 0, gone: 1, x0: -1 }, { myX: x, truckX: -2.6 - x * 0.3 });
};

// Whip into the diner: you on a stool, smug.
const RestStop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.3, 2.4], [0.45, 1.25, 2.0], ramp(f, -8, 36)), target: [0.0, 0.85, -1.2], fov: 42 };
  return diner(cam, f, [youSitting({ expression: "smug", lookX: 0.5 }), pup("barista", BARISTA, [-1.6, -2.15], { expression: "neutral", lookX: 0.4 })]);
};

const SipGenius: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([YOU_D[0] + 0.45, 1.05, 1.1], [YOU_D[0] + 0.35, 1.02, 0.85], ramp(f, 0, 48)), target: [YOU_D[0] + 0.05, 0.9, YOU_D[1]], fov: 36 };
  return diner(cam, f, [youSitting({ expression: "smug", blink: f > 10 && f < 30, hold: { item: "cup", hand: "R" }, armR: [10, -78], itemTilt: f > 10 && f < 30 ? -20 : 0, lookX: 0.3 })], { blur: 6 });
};

// Low angle: the door swings, the trucker walks in, shaking her head.
const TruckerIn: React.FC = () => {
  const f = useShotFrame();
  const door = Easing.out(Easing.back(1.3))(ramp(f, 0, 12));
  const w = stroll(f, 6, 30, [DINER_DOOR[0], -2.1], TRUCKER_D);
  const cam: CameraShot = { position: lerp3([0.1, 0.45, 1.6], [0.2, 0.5, 1.3], ramp(f, -8, 39)), target: [1.1, 1.15, -1.8], fov: 50 };
  return diner(cam, f, [pup("trucker", TRUCKER, w.at, { expression: "skeptical", ...w.pose })], { door });
};

const TruckerShake: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.95, 1.25, 1.8], [0.9, 1.22, 1.45], ramp(f, 0, 60)), target: [TRUCKER_D[0], 0.95, TRUCKER_D[1]], fov: 38 };
  return diner(cam, f, [pup("trucker", TRUCKER, TRUCKER_D, { expression: "skeptical", gesture: "armsCrossed", headTilt: Math.sin(f / 4) * 10, lookX: -0.6 })], { door: 1 });
};

// Over your shoulder: she talks.
const TruckerTalks: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.9, 1.4, 1.0], [-0.85, 1.38, 0.8], ramp(f, 0, 46)), target: [TRUCKER_D[0], 1.0, TRUCKER_D[1]], fov: 32 };
  return diner(cam, f, [youSitting({ view: "back", expression: "neutral" }), pup("trucker", TRUCKER, TRUCKER_D, { expression: "smug", gesture: "shrug", lookX: -0.6 })], { door: 1 });
};

// Gag: spit-take.
const SpitTake: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([YOU_D[0] + 0.1, 1.15, 1.5], [YOU_D[0] + 0.15, 1.1, 1.2], ramp(f, 0, 45)), target: [YOU_D[0] + 0.25, 0.9, YOU_D[1]], fov: 40 };
  return diner(cam, f, [youSitting({ ...faceChange([[0, "smug"], [6, "shocked"]], f), hold: { item: "cup", hand: "R" }, armR: f < 6 ? [10, -78] : [60, -40], view: "side", facing: 1, lean: f > 6 && f < 18 ? 12 : 0 })], { spray: ramp(f, 6, 26) });
};

// Briefing room: a researcher at the test plan.
const Briefing: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.35, 2.4], [0.1, 1.3, 2.0], ramp(f, -8, 39)), target: [-0.2, 1.2, -1.6], fov: 44 };
  return briefing(cam, f, [pup("scientist", SCIENTIST, SCI_B, { ...moveChange([[0, "thinking", "chin"], [16, "determined", "point"]], f), lookX: -0.8 })]);
};

// Top-down macro on the ring model: tiny cars circling.
const RingModel: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.9, -1.0], [0.9, 1.75, -1.15], ramp(f, 0, 31)), target: [0.9, 0.76, -1.4], fov: 40 };
  return briefing(cam, f, []);
};

// Whip to the real track: 22 cars, one ring, a camera mast in the middle.
const TrackReveal: React.FC = () => {
  const f = useShotFrame();
  const p = ease(ramp(f, -8, 53));
  const cam: CameraShot = { position: lerp3([0, 11, 33], [8, 18, 26], p), target: [0, 0, 0], fov: 46 };
  return track(cam, simT(f, 2));
};

const CarsCount: React.FC = () => {
  const f = useShotFrame();
  const a = -Math.PI / 2;
  const [bx, bz] = ringPoint(a, RING_R + 2.2);
  const [cx, cz] = ringPoint(a, RING_R + 8.5);
  const cam: CameraShot = { position: lerp3([cx - 0.6, 1.5, cz], [cx - 0.3, 1.45, cz - 0.4], ramp(f, 0, 61)), target: [bx, 1.2, bz], fov: 42 };
  return track(cam, simT(f, 15), [], {
    extra: (
      <group position={[bx, 0, bz]} rotation={[0, outward(a), 0]}>
        <InkCylinder radius={0.04} height={1.4} position={[-0.6, 0.7, 0]} color="#9aa0a6" />
        <InkCylinder radius={0.04} height={1.4} position={[0.6, 0.7, 0]} color="#9aa0a6" />
        <Label text="22 CARS" position={[0, 1.5, 0.03]} width={1.5} fg="#ffffff" bg="#1d4fa8" appear={pop(f, 4)} count={ramp(f, 4, 30)} />
      </group>
    ),
  });
};

// Top-down: the whole loop, 230 M painted in the middle.
const TopDown: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 50, 10], [0, 46, 9], ramp(f, 0, 52)), target: [0, 0, 0], fov: 50 };
  return track(cam, simT(f, 5), [], {
    extra: <Label text="230 M LOOP" position={[0, 0.05, 3.5]} rotation={[-Math.PI / 2, 0, 0]} width={9} fg="#ffffff" bg="#e0262f" appear={pop(f, 6)} />,
  });
};

// Low along the lane: nothing on the road.
const NoObstacle: React.FC = () => {
  const f = useShotFrame();
  const a = 0.3 + f * 0.003;
  const [px, pz] = ringPoint(a, RING_R - 2.6);
  const [tx, tz] = ringPoint(a + 0.7, RING_R);
  const cam: CameraShot = { position: [px, 0.8, pz], target: [tx, 0.6, tz], fov: 52 };
  return track(cam, simT(f, 20));
};

// The rule: a driver in the start car, the researcher with the 30 sign.
const Rule: React.FC = () => {
  const f = useShotFrame();
  const a = -Math.PI / 2 - 0.05;
  const [cx, cz] = ringPoint(a, RING_R + 2.0);
  const [sx, sz] = ringPoint(a + 0.07, RING_R + 2.0);
  const cam: CameraShot = { position: lerp3([cx + 0.6, 1.3, cz + 3.0], [cx + 0.5, 1.28, cz + 2.6], ramp(f, -8, 52)), target: [cx + 0.4, 0.95, cz], fov: 42 };
  return track(cam, simT(f, 0, 0.0), [pup("scientist", SCIENTIST, [cx, cz], { expression: "determined", gesture: "point", lookX: 0.6 })], {
    extra: <SpeedSign position={[sx + 0.1, 0, sz]} value="30" size={0.6} />,
  });
};

const SpeedMacro: React.FC = () => {
  const f = useShotFrame();
  const a = -Math.PI / 2 - 0.05;
  const [sx, sz] = ringPoint(a + 0.07, RING_R + 2.0);
  const cam: CameraShot = { position: lerp3([sx + 0.05, 2.1, sz + 2.8], [sx + 0.05, 2.08, sz + 2.4], ramp(f, 0, 53)), target: [sx + 0.1, 2.0, sz], fov: 40 };
  return track(cam, simT(f, 8), [], {
    extra: (
      <>
        <SpeedSign position={[sx + 0.1, 0, sz]} value="30" size={0.6} />
        <Label text={"FOLLOW\nSAFELY"} position={[sx + 0.1, 2.55, sz + 0.03]} width={0.55} fg="#ffffff" bg="#1d4fa8" appear={pop(f, 26)} />
      </>
    ),
  });
};

// Orbit high above: perfect, even spacing.
const PerfectCircle: React.FC = () => {
  const f = useShotFrame();
  const a = 0.4 + f * 0.006;
  const cam: CameraShot = { position: [Math.sin(a) * 26, 21, Math.cos(a) * 26], target: [0, 0, 0], fov: 46 };
  return track(cam, simT(f, 5, 0.2));
};

// Closer: the gaps start to wobble.
const Wobbles: React.FC = () => {
  const f = useShotFrame();
  const cam = ringCam(-Math.PI / 2 + f * 0.002, 15, 10, 0.4, 50);
  return track(cam, simT(f, 24, 0.2));
};

// The toy row: the first car dips a little, each one behind dips more.
const dips = (f: number, start: number) => STRIP_X.map((_, i) => {
  const k = 4 - i; // the front car is on the right
  const d = ramp(f, start + k * 6, start + k * 6 + 10) * (0.2 + 0.18 * (4 - k));
  return 0.85 - d;
});
const SlowLittle: React.FC = () => {
  const f = useShotFrame();
  const sp = dips(f, 6);
  const cam: CameraShot = { position: lerp3([1.5, 1.6, 1.5], [1.3, 1.55, 1.2], ramp(f, 0, 37)), target: [0.9, 1.35, -1.7], fov: 46 };
  return strip(cam, sp, sp.map((s) => (s < 0.8 ? 1 : 0)));
};
const SlowMore: React.FC = () => {
  const f = useShotFrame();
  const sp = dips(f + 40, 6);
  const cam: CameraShot = { position: lerp3([0.6, 1.65, 2.3], [-0.5, 1.6, 2.1], ease(ramp(f, 0, 41))), target: lerp3([0.4, 1.35, -1.7], [-0.6, 1.35, -1.7], ease(ramp(f, 0, 41))), fov: 46 };
  return strip(cam, sp, sp.map((s) => (s < 0.8 ? 1 : 0)));
};

// Gag at the track: the driver's car stops dead in the jam; his cap flies off.
// The jam's angle, advanced smoothly from the shot's first sim time (the raw centre jumps whenever a car joins or
// leaves the stopped cluster).
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const jamSmooth = (_t0: number, t: number) => {
  let sx = 0;
  let sy = 0;
  for (let k = -24; k <= 24; k++) {
    const j = jamAngle(t + k * 0.25);
    if (j !== null) {
      sx += Math.cos(j);
      sy += Math.sin(j);
    }
  }
  return Math.atan2(sy, sx);
};
// The car just behind the jam at sim time t0 (the next one to stop).
const nextToStop = (t0: number) => {
  const j = jamAngle(t0) ?? 0;
  const cars = ringAt(t0);
  let best = 0;
  let bestD = -Infinity;
  cars.forEach((c, i) => {
    const d = wrap(c.angle - j);
    if (d < -0.05 && d > bestD && c.v > 0.12) {
      bestD = d;
      best = i;
    }
  });
  return best;
};

const Stopping: React.FC = () => {
  const f = useShotFrame();
  const t = simT(f, 44, 0.12);
  const near = ringAt(t)[nextToStop(44)];
  const cam = ringCam(near.angle + 0.03, 4.2, 1.2, 0.8, 42);
  const [dx, dz] = ringPoint(near.angle, RING_R);
  const lurch = ramp(f, 10, 16) * (1 - ramp(f, 20, 30));
  const cap = ramp(f, 12, 32);
  const look: PuppetLook = cap > 0 ? { ...DRIVER, cap: undefined } : DRIVER;
  return track(cam, t, [pup("driver", look, [dx, dz], { sit: true, view: "front", expression: f < 12 ? "neutral" : "shocked", lean: 22 * lurch })], {
    golden: true,
    extra:
      cap > 0 ? (
        <group userData={{ ghost: true }} position={[dx + cap * 0.6, 1.25 + Math.sin(cap * Math.PI) * 0.6 - cap * 0.7, dz + cap * 0.3]} rotation={[cap * 6, 0, cap * 3]}>
          <InkCylinder radius={0.11} height={0.08} color="#e0262f" ink={0.006} />
          <InkBox size={[0.16, 0.02, 0.1]} position={[0.1, -0.03, 0]} color="#e0262f" ink={0.004} />
        </group>
      ) : undefined,
  });
};

// Top-down golden: the clump of stopped cars, brake lights on.
const WaveTop: React.FC = () => {
  const f = useShotFrame();
  const t = simT(f, 60, 0.25);
  const j = jamSmooth(60, t);
  const [jx, jz] = ringPoint(j, RING_R * 0.92);
  const cam: CameraShot = { position: lerp3([jx, 24, jz + 4], [jx, 21, jz + 3.5], ramp(f, -8, 54)), target: [jx, 0, jz], fov: 46 };
  return track(cam, t, [], { golden: true, flag: j });
};

const WeirdPart: React.FC = () => {
  const f = useShotFrame();
  const a = Math.PI * 0.75;
  const [sx, sz] = ringPoint(a, RING_R + 2.2);
  const cam = ringCam(a + 0.12, 5.5, 1.3, 1.0, 40, 0.06);
  return track(cam, simT(f, 70), [pup("scientist", SCIENTIST, [sx, sz], { expression: "thinking", gesture: "chin", lookX: -0.6 })], { golden: true });
};

// The JAM flag rides the clump backward while every car drives forward.
const ForwardBackward: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 52, 10], [0, 49, 9], ramp(f, -8, 60)), target: [0, 0, 0], fov: 50 };
  const t = simT(f, 80, 0.35);
  return track(cam, t, [], { golden: true, flag: jamSmooth(80, t) });
};

const JamSpeed: React.FC = () => {
  const f = useShotFrame();
  const a = -Math.PI * 0.2;
  const [bx, bz] = ringPoint(a, RING_R + 2.4);
  const [cx, cz] = ringPoint(a, RING_R + 8.0);
  const cam: CameraShot = { position: lerp3([cx, 1.7, cz], [cx + 0.3, 1.68, cz + 0.2], ramp(f, 0, 65)), target: [bx, 1.35, bz], fov: 42 };
  const tj = simT(f, 100);
  return track(cam, tj, [], {
    golden: true,
    flag: jamSmooth(100, tj),
    extra: (
      <group position={[bx, 0, bz]} rotation={[0, outward(a), 0]}>
        <InkCylinder radius={0.05} height={1.3} position={[-0.75, 0.65, 0]} color="#9aa0a6" />
        <InkCylinder radius={0.05} height={1.3} position={[0.75, 0.65, 0]} color="#9aa0a6" />
        <Screen position={[0, 1.6, 0]} text={"JAM MOVES\nBACK 20 KM/H"} size={[1.8, 0.7]} glow="#ff3b30" bg="#14060a" appear={pop(f, 6)} />
      </group>
    ),
  });
};

// The tail of the jam: a car rolls up and brakes.
const JoinBack: React.FC = () => {
  const f = useShotFrame();
  const t = simT(f, 115, 0.2);
  const j = jamSmooth(115, t);
  return track(ringCam(j - 0.22, 3.6, 1.0, 0.6, 46, 0.04), t, [], { golden: true });
};
const LeaveFront: React.FC = () => {
  const f = useShotFrame();
  const t = simT(f, 125, 0.2);
  const j = jamSmooth(125, t);
  return track(ringCam(j + 0.2, 3.6, 1.0, 0.6, 46, -0.04), t, [], { golden: true });
};

// Bottleneck model: cars bunch up at the tunnel mouth.
const Bottleneck: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 2.0, 2.6], [-0.3, 1.95, 2.3], ramp(f, -8, 49)), target: [0.1, 1.15, -1.5], fov: 46 };
  return neckStage(cam, f, pop(f, 4));
};
const PackedClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.15, -0.4], [0.3, 1.1, -0.6], ramp(f, 0, 45)), target: [0.8, 0.8, -1.5], fov: 42 };
  return neckStage(cam, f + 50, 60);
};

// Packed tight: one tap of the pedal and the brake lights ripple down the row.
const TapPedal: React.FC = () => {
  const f = useShotFrame();
  const press = ramp(f, 10, 14) * (1 - ramp(f, 22, 28));
  const cam: CameraShot = { position: lerp3([0.3, 1.05, 1.0], [0.25, 1.03, 0.75], ramp(f, 0, 45)), target: [0, 0.72, -1.4], fov: 48 };
  const sp = STRIP_X.map((_, i) => (f > 14 + (4 - i) * 3 ? 0.15 : 0.6));
  return strip(cam, sp, sp.map((s) => (s < 0.3 ? 1 : 0)), 0.55, press);
};
const Ripple: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.6, 1.9], [-0.3, 1.55, 1.8], ease(ramp(f, 0, 44))), target: lerp3([0.4, 1.2, -1.6], [-0.4, 1.2, -1.6], ease(ramp(f, 0, 44))), fov: 46 };
  const sp = STRIP_X.map((_, i) => (f > 2 + (4 - i) * 7 ? 0.02 : 0.6));
  return strip(cam, sp, sp.map((s) => (s < 0.3 ? 1 : 0)), 0.55);
};

// Night highway, high: a band of brake lights rolling backward down the queue.
const NightWave: React.FC = () => {
  const f = useShotFrame();
  const band = 8 - f * 0.18;
  const cam: CameraShot = { position: lerp3([1, 8, 9], [-5, 7, 8], ease(ramp(f, -8, 75))), target: [1, 0.3, -0.6], fov: 50 };
  const cars = Array.from({ length: 24 }, (_, i) => {
    const lane = i % 2;
    const base = -16 + Math.floor(i / 2) * 3.0 + lane * 1.3;
    const inBand = Math.abs(base - band) < 3.2;
    const x = base + (inBand ? 0 : f * 0.02);
    return <Car key={i} position={[x, 0, -1.3 * lane]} color={CAR_COLORS[(i * 7) % CAR_COLORS.length]} brake={inBand ? 1 : 0} lights />;
  });
  return <Stage bg="#070b1c" camera={cam} set={<HighwaySet camera={cam} night>{cars}</HighwaySet>} />;
};

// Ending: twenty minutes back, a new driver, craning out to look for the crash.
const victimLight: PuppetLight = { points: [{ position: [1.2, 0.6, 0.1], color: "#ff4a3a", strength: 1.6, range: 2.5 }] };
const NewVictim: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.9, 1.3, 3.8], [-0.2, 1.15, 3.0], ease(ramp(f, -8, 41))), target: [-0.15, 0.92, 0], fov: 38 };
  return highway(cam, f, [pup("victim", VICTIM, [-0.15, 0.02], { ...DRIVING, expression: "bored", headTilt: -8 })], { crawl: 0, brake: 1, lights: true }, { night: true, light: victimLight, myColor: "#2a9d8f" });
};
const LookForCrash: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.25, 2.2], [-0.3, 1.1, 3.1], ease(ramp(f, 0, 49))), target: [-0.1, 0.95, 0], fov: 38 };
  return highway(cam, f, [pup("victim", VICTIM, [-0.15, 0.02], { ...DRIVING, ...faceChange([[0, "confused"], [26, "worried"]], f), lean: 10 + Math.sin(f / 5) * 8, lookX: Math.sin(f / 7) > 0 ? 1 : -0.6, headTilt: 12 * Math.sin(f / 6) })], { crawl: 0, brake: 1, lights: true }, { night: true, light: victimLight, myColor: "#2a9d8f" });
};

const SHOTS: Shot[] = [
  [0, 55, Crawl, false],
  [55, 104, OpensUp, false],
  [104, 125, NoCrash, false],
  [125, 161, Nothing, false],
  [161, 212, FloorIt, false],
  [212, 248, RestStop, true],
  [248, 296, SipGenius, false],
  [296, 335, TruckerIn, false],
  [335, 395, TruckerShake, false],
  [395, 441, TruckerTalks, false],
  [441, 486, SpitTake, false],
  [486, 525, Briefing, true],
  [525, 556, RingModel, false],
  [556, 609, TrackReveal, true],
  [609, 670, CarsCount, false],
  [670, 722, TopDown, false],
  [722, 771, NoObstacle, false],
  [771, 823, Rule, false],
  [823, 876, SpeedMacro, false],
  [876, 954, PerfectCircle, false],
  [954, 1013, Wobbles, false],
  [1013, 1050, SlowLittle, true],
  [1050, 1091, SlowMore, false],
  [1091, 1146, Stopping, true],
  [1146, 1200, WaveTop, false],
  [1200, 1227, WeirdPart, false],
  [1227, 1287, ForwardBackward, false],
  [1287, 1352, JamSpeed, false],
  [1352, 1390, JoinBack, false],
  [1390, 1421, LeaveFront, false],
  [1421, 1470, Bottleneck, true],
  [1470, 1515, PackedClose, false],
  [1515, 1560, TapPedal, true],
  [1560, 1604, Ripple, false],
  [1604, 1679, NightWave, true],
  [1679, 1720, NewVictim, false],
  [1720, TIMING.totalFrames, LookForCrash, false],
];

// ---------- sound (one-shots kept low so the gaps between words stay clear) ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 212 },
  { at: 0, src: sfx("hum"), volume: 0.03, until: 104 },
  { at: 30, src: sfx("tick"), volume: 0.1 },
  { at: 60, src: sfx("whoosh"), volume: 0.14 },
  { at: 165, src: sfx("whoosh"), volume: 0.18 },
  { at: 167, src: sfx("boom"), volume: 0.12 },
  { at: 212, src: sfx("ambience"), volume: 0.03, until: 486 },
  { at: 255, src: sfx("pop"), volume: 0.1 },
  { at: 297, src: sfx("door"), volume: 0.18 },
  { at: 331, src: sfx("riser"), volume: 0.07 },
  { at: 379, src: sfx("sting"), volume: 0.2 },
  { at: 448, src: sfx("near-miss"), volume: 0.12 },
  { at: 450, src: sfx("paper"), volume: 0.12 },
  { at: 486, src: sfx("hum"), volume: 0.03, until: 556 },
  { at: 505, src: sfx("pop"), volume: 0.12 },
  { at: 556, src: sfx("ambience"), volume: 0.03, until: 1013 },
  { at: 613, src: sfx("pop"), volume: 0.14 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 616 + k * 4, src: sfx("tick"), volume: 0.08 })),
  { at: 676, src: sfx("pop"), volume: 0.14 },
  { at: 780, src: sfx("stamp"), volume: 0.12 },
  { at: 849, src: sfx("pop"), volume: 0.13 },
  { at: 1013, src: sfx("hum"), volume: 0.03, until: 1091 },
  ...Array.from({ length: 5 }, (_, k) => ({ at: 1019 + k * 6, src: sfx("tick"), volume: 0.1 })),
  { at: 1091, src: sfx("ambience"), volume: 0.03, until: 1421 },
  { at: 1101, src: sfx("tape-stop"), volume: 0.16 },
  { at: 1104, src: sfx("boom"), volume: 0.12 },
  { at: 1150, src: sfx("near-miss"), volume: 0.1 },
  { at: 1293, src: sfx("pop"), volume: 0.14 },
  { at: 1360, src: sfx("tape-stop"), volume: 0.1 },
  { at: 1395, src: sfx("whoosh"), volume: 0.12 },
  { at: 1421, src: sfx("hum"), volume: 0.03, until: 1515 },
  { at: 1425, src: sfx("pop"), volume: 0.14 },
  { at: 1525, src: sfx("button"), volume: 0.16 },
  ...Array.from({ length: 5 }, (_, k) => ({ at: 1528 + k * 3, src: sfx("tick"), volume: 0.08 })),
  ...Array.from({ length: 5 }, (_, k) => ({ at: 1562 + k * 7, src: sfx("tick"), volume: 0.08 })),
  { at: 1604, src: sfx("ambience"), volume: 0.03, until: TIMING.totalFrames },
  { at: 1606, src: sfx("whoosh"), volume: 0.12 },
  { at: 1745, src: sfx("chime"), volume: 0.12 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 296, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 296, to: 556, volume: 0.14 },
  { src: MUSIC_FILES.tension, from: 556, to: 1421, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 1421, to: 1604, volume: 0.13 },
  { src: MUSIC_FILES.lounge, from: 1604, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
