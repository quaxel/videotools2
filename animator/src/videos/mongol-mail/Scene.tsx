import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  Desk,
  faceChange,
  foleyCues,
  frameSpot,
  Foliage,
  Halo,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  jump,
  Label,
  MusicCue,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
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
import { Horse, HORSE, Lantern } from "../niagara-silent/props";
import { Ger, Goat, HitchRail, MilePost, ROAD, steppeBg, steppeLight, SteppeMode, SteppeSet, Torch, YamHouse } from "../../three/SteppeSet";
import { BellBelt, FruitBasket, LetterTube, LogTable, Paiza, Peach, PeggedSaddle } from "./props";
import TIMING_JSON from "./timing.json";

// "The Mongol Mail That Never Stopped": Marco Polo's account of the yam, the Khan's horse relay. No horse ran far:
// stations every 25 miles kept horses saddled, the courier's bells warned the next station, and the letter changed
// hands at a gallop. Set: guide/references/mongol-steppe.md (src/three/SteppeSet).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "mongol-mail";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const UNITS = 1060 / 1.3; // puppet units per metre
const M = 1.3 / 1060; // metres per unit
const HS = 0.82; // horses drawn a little small, so the rider reads on top and his leg reaches down the flank
const SADDLE = HORSE.saddle * HS;
const SADDLE_AIR = (SADDLE - 0.34) * UNITS;
const GROUND_SIT = -0.3 * UNITS; // sitting on the ground
const ASPECT = 9 / 16;
const RIDE_Z = 0.3; // rider card in front of the horse's near flank, so his legs show down its side

// ---------- cast ----------

const RIDER: PuppetLook = { skin: "#d8a47a", hair: "#1a1410", outfit: "#2a4a8a", vest: "#e07a2a", suspenders: "#f2e6c8", hat: "#6a3a22" };
const RIDER2: PuppetLook = { skin: "#c8946a", hair: "#1a1410", outfit: "#8a2a2a", vest: "#e8b040", suspenders: "#f2e6c8", hat: "#4a3a2a" };
const POLO: PuppetLook = { skin: "#f2c9a4", hair: "#3a2416", outfit: "#a82a2a", vest: "#5a1a1a", beard: "#3a2416", hat: "#3a1a1a" };
const VILLAGER: PuppetLook = { skin: "#d8a47a", hair: "#1a1410", outfit: "#3a8a5a", long: true, skirt: true, kerchief: "#d84a3a" };
const KEEPER: PuppetLook = { skin: "#c8946a", hair: "#2a1e16", outfit: "#7a5a3a", vest: "#4a3424", beard: "#2a1e16", hat: "#5a4030" };
const CLERK: PuppetLook = { skin: "#eab890", hair: "#1a1410", outfit: "#8a8a9a", vest: "#4a4a5a", glasses: true };
const MERCHANT: PuppetLook = { skin: "#f0c8a0", hair: "#5a3a24", outfit: "#6a3a8a", vest: "#e0b040", beard: "#5a3a24", hat: "#2a2a4a" };
const KHAN: PuppetLook = { skin: "#e8b890", hair: "#d8d4cc", outfit: "#e0b040", vest: "#a8282a", beard: "#d8d4cc", hat: "#5a2a1a" };

const P = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: { expression: "neutral", ...p } as PuppetPose });
const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());

// A rider on a horse: the horse (facing +x, or -x with dir -1) at [x, z], the rider seated on it, his belt of bells.
type Mount = { horse: React.ReactNode; rider: PuppetPlacement; lift: number; seat: Vec3 };
const mounted = (id: string, look: PuppetLook, x: number, z: number, phase: number, run: number, pose: Partial<PuppetPose>, dir: 1 | -1 = 1, opts: { bells?: boolean; frame?: number; bare?: boolean } = {}): Mount & { bells: React.ReactNode } => {
  const lift = Math.abs(Math.cos(phase)) * 0.04 * run;
  const at: [number, number] = [x - 0.04 * dir, z + RIDE_Z];
  return {
    horse: (
      <group position={[x, 0, z]} rotation={[0, dir === 1 ? 0 : Math.PI, 0]} userData={{ ghost: true }}>
        <Horse scale={HS} phase={phase} run={run} />
      </group>
    ),
    rider: P(id, look, at, { sit: true, air: SADDLE_AIR + lift * UNITS, view: "side", facing: dir, lean: 6 * Math.min(1, run), ...pose }),
    lift,
    seat: [at[0], SADDLE + lift, at[1]],
    bells: opts.bells ? <BellBelt position={[at[0] + 0.02 * dir, SADDLE + lift + 0.14, at[1] + 0.08]} ring={Math.min(1, run)} frame={opts.frame ?? 0} /> : null,
  };
};

// A hand's world point for a puppet raised by `air` units.
const handAt = (at: [number, number], reach: [number, number], camera: CameraShot, air = 0): Vec3 => {
  const h = handWorld(at, reach, camera);
  return [h[0], h[1] + air * M, h[2]];
};

// Grass tussocks along a line near the lens (foreground, blurred by the lens).
const Tussocks: React.FC<{ z: number; x0: number; x1: number; color?: string; step?: number; y?: number }> = ({ z, x0, x1, color = "#7a8a40", step = 1.6, y = 0 }) => (
  <>
    {Array.from({ length: Math.ceil((x1 - x0) / step) }, (_, i) => (
      <Foliage key={i} position={[x0 + i * step + ((i * 37) % 7) * 0.08, y, z + ((i * 13) % 5) * 0.06]} size={0.38 + ((i * 7) % 3) * 0.06} color={color} seed={i + 3} />
    ))}
  </>
);

type SteppeShotProps = {
  camera: CameraShot;
  f: number;
  mode: SteppeMode;
  puppets?: PuppetPlacement[];
  light?: PuppetLight;
  blur?: number;
  truth?: number;
  foreground?: React.ReactNode;
  road?: boolean;
  clear?: [number, number, number][];
  area?: [number, number, number, number];
  children?: React.ReactNode;
};
const Steppe: React.FC<SteppeShotProps> = ({ camera, f, mode, puppets, light, blur, truth, foreground, road, clear, area, children }) => (
  <Stage
    set={
      <SteppeSet camera={camera} frame={f} mode={mode} road={road} clear={clear} area={area}>
        {children}
      </SteppeSet>
    }
    camera={camera}
    bg={steppeBg(mode)}
    puppets={puppets}
    light={light ?? steppeLight(mode)}
    blur={blur}
    truth={truth}
    foreground={foreground}
  />
);

// ---------- 1. 0-283: the hook, dawn steppe ----------

// The courier gallops along the road past Marco Polo writing at the roadside; the camera picks him up, trucks with
// him and pushes in on his belt of bells.
const POLO_AT: [number, number] = [-0.7, 1.0];
const hookX = (f: number) => -3.2 + f * 0.07;
const Hook = (f: number) => {
  const xr = hookX(f);
  const follow = ease(f, 12, 80);
  const push = ease(f, 160, 262);
  const camX = -0.6 * (1 - follow) + (xr + 0.25 - push * 0.2) * follow;
  const camera: CameraShot = {
    position: [camX, 1.05 + 0.25 * push, 4.3 - 1.0 * push],
    target: [camX + 0.05, 1.05 + 0.2 * push, 0],
    fov: 40 - 2 * push,
  };
  const phase = f * 0.5;
  const m = mounted("rider", RIDER, xr, ROAD.z, phase, 1.3, { ...faceChange([[0, "determined"], [200, "happy"]], f), reachR: [180, -620], handR: "fist", lean: 10 }, 1, { bells: true, frame: f });
  const tube = handAt(m.rider.at, [180, -620], camera, SADDLE_AIR + m.lift * UNITS);
  const pass = ease(f, 18, 40);
  return (
    <>
      <Steppe
        camera={camera}
        f={f}
        mode="dawn"
        blur={4}
        area={[-6, 20, -6, 5]}
        puppets={[m.rider, P("polo", POLO, POLO_AT, { ...faceChange([[0, "thinking"], [24, "shocked"], [60, "excited"]], f), reachR: [90, -560], frontR: true, handR: "fist", reachL: [-60, -600], frontL: true, handL: "open", lookX: -0.6 + pass * 1.6, view: "front" })]}
        foreground={<Tussocks z={2.55} x0={-2} x1={20} color="#9a8a48" />}
      >
        {m.horse}
        {m.bells}
        <LetterTube position={[tube[0] + 0.05, tube[1], tube[2] + 0.04]} rotation={[0, 0, 0.3]} />
        {/* Polo's notebook */}
        <group userData={{ ghost: true }}>
          <InkBox size={[0.14, 0.18, 0.02]} position={(() => { const h = handAt(POLO_AT, [-60, -600], camera); return [h[0] + 0.05, h[1] + 0.03, h[2] + 0.05] as Vec3; })()} rotation={[-0.3, 0.2, 0]} color="#f4ecd8" ink={0.006} />
        </group>
        <Burst kind="dust" at={[xr - 0.5, 0.02, ROAD.z]} frame={(f % 18) + 2} size={0.6} seed={Math.floor(f / 18)} count={6} />
      </Steppe>
      <Headline f={f} text="200 MILES A DAY?" at={60} out={150} />
    </>
  );
};

// ---------- 2. 283-366: a horse at full gallop tires ----------

const TIRE_SINK = 44;
const Tired = (f: number) => {
  const slow = 1 - ease(f, 0, 40);
  const x = 0.9 * Math.sin(ease(f, 0, 46) * Math.PI * 0.5) - 0.5;
  const phase = 2 + 26 * ease(f, 0, 46);
  const sink = ease(f, TIRE_SINK, TIRE_SINK + 14);
  const slide = ease(f, TIRE_SINK + 6, TIRE_SINK + 18);
  const landed = f >= TIRE_SINK + 18;
  const camera: CameraShot = { position: [0.3 + 0.3 * ease(f, 0, 80), 1.15 - 0.1 * ease(f, 0, 80), 4.8 - 0.7 * ease(f, 0, 80)], target: [0.4, 0.85, 0], fov: 40 };
  const riderAt: [number, number] = [x - 0.04 + slide * 0.6, ROAD.z + RIDE_Z + slide * 0.2];
  const air = landed ? GROUND_SIT : SADDLE_AIR - sink * 0.45 * UNITS + slide * (GROUND_SIT - SADDLE_AIR + 0.45 * UNITS) * slide;
  return (
    <Steppe
      camera={camera}
      f={f + 283}
      mode="dusk"
      blur={4}
      puppets={[P("rider", RIDER, riderAt, { ...faceChange([[0, "worried"], [TIRE_SINK + 4, "shocked"], [TIRE_SINK + 26, "sad"]], f), sit: true, air, view: "side", facing: 1, lean: -8 * slow + 20 * slide, reachL: landed ? [-160, -420] : [120, -560], handL: "open" })]}
      foreground={<Tussocks z={3.0} x0={-1.5} x1={2.5} color="#6a6a50" />}
    >
      <group position={[x, -0.5 * sink, ROAD.z]} rotation={[0, 0, -0.12 * sink]} userData={{ ghost: true }}>
        <Horse scale={HS} phase={phase} run={1.2 * slow} />
      </group>
      <Burst kind="dust" at={[x + 0.3, 0.02, ROAD.z]} frame={f - TIRE_SINK - 8} size={0.9} seed={3} />
      <Burst kind="dust" at={[riderAt[0], 0.02, riderAt[1]]} frame={f - TIRE_SINK - 18} size={0.7} seed={5} />
    </Steppe>
  );
};

// ---------- 3. 366-594: the yam station ----------

const YAM: Vec3 = [-0.3, 0, -2.6];
const RAIL_Z = -0.75;
const STANDING = [1.0, 2.15, 3.3];
const GRAZING: [number, number, number][] = [[4.6, -4.2, 0.5], [6.0, -5.2, 2.6], [5.2, -6.6, 1.0], [7.2, -4.4, -0.4]];
const YamDay = (f: number) => {
  const camera = beatPath(
    [
      { at: 0, position: [-2.15, 1.9, 3.2], target: [-2.2, 1.15, 0.8] },
      { at: 105, position: [-0.6, 1.7, 3.6], target: [-0.9, 1.35, -1.6] },
      { at: 180, position: [1.8, 1.3, 3.6], target: [2.0, 1.1, -0.6] },
      { at: 226, position: [2.6, 1.35, 3.0], target: [4.4, 0.9, -3.4] },
    ],
    f,
    40,
  );
  const tug = Math.sin(f * 0.07) * 40;
  return (
    <Steppe
      camera={camera}
      f={f + 366}
      mode="day"
      blur={3}
      area={[-6, 9, -8, 5]}
      clear={[[YAM[0], YAM[2], 2.4]]}
      puppets={[P("keeper", KEEPER, [0.1, -0.35], { ...faceChange([[0, "neutral"], [180, "happy"]], f), reachR: [220, -560 + tug * 0.3], handR: "fist", lookX: 0.7 })]}
      foreground={<Tussocks z={2.1} x0={-3} x1={4} color="#8a9a48" />}
    >
      <YamHouse position={YAM} frame={f} />
      <MilePost position={[-2.2, 0, 0.8]} text="25 MILES" appear={f - 28} />
      <HitchRail position={[2.15, 0, RAIL_Z]} len={3.2} />
      {STANDING.map((x, i) => (
        <group key={x} position={[x, 0, RAIL_Z + 0.45]} rotation={[0, Math.PI, 0]} userData={{ ghost: true }}>
          <Horse scale={HS} phase={Math.sin(f * 0.05 + i) * 0.2} run={0.15} saddle={["#7a2a22", "#2a4a7a", "#7a5a22"][i]} />
        </group>
      ))}
      <Label text="SADDLED" position={[3.85, 1.55, RAIL_Z + 0.35]} width={0.62} appear={f - 180} />
      {GRAZING.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]} userData={{ ghost: true }}>
          <Horse scale={HS} phase={0} run={0} bare coat={["#8a5a3a", "#d8c8b0", "#3a2a22", "#a8623a"][i]} />
        </group>
      ))}
      <MilePost position={[5.2, 0, -3.2]} text="AT GRASS" appear={f - 210} />
    </Steppe>
  );
};

// ---------- 4. 594-724: Polo's numbers on the clerk's tally boards ----------

const Tally = (f: number) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.25, 1.15, 2.8], target: [-0.1, 1.05, -0.6] },
      { at: 42, position: [-0.15, 1.6, 3.3], target: [-0.05, 1.15, -1.9] },
      { at: 112, position: [0.05, 1.65, 3.1], target: [0.05, 1.2, -1.9] },
    ],
    f,
    40,
  );
  const scribble = Math.sin(f * 0.6) * 20;
  const lamp = frameSpot({ position: [-0.25, 1.15, 2.8], target: [-0.1, 1.05, -0.6], fov: 40 }, ASPECT, -0.85, -0.9, 0.9);
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#5a6a7a" wall="#6a8aa8" wallPattern="panel" floorPattern="tile" width={6} depth={4}>
          <Desk position={[0.55, 0, -0.75]} size={[0.9, 0.6, 0.5]} color="#8a5a3a" />
          <InkBox size={[0.34, 0.004, 0.24]} position={[0.55, 0.635, -0.65]} color="#f4ecd8" ink={0.003} />
          <InkBox size={[2.1, 1.1, 0.06]} position={[0, 1.95, -1.95]} color="#5a3a24" ink={0.014} />
          <Label text={"STATIONS\n10,000"} position={[-0.5, 1.85, -1.9]} width={0.95} appear={f - 40} count={ease(f, 40, 60)} />
          <Label text={"HORSES\n300,000"} position={[0.5, 1.85, -1.9]} width={0.95} appear={f - 90} count={ease(f, 90, 112)} />
          <Label text="POLO'S COUNT" position={[0, 2.35, -1.9]} width={0.8} />
          <Halo position={[0.5, 1.4, -1.0]} size={1.6} color="#ffe6b0" strength={0.25} />
          <pointLight position={[0.4, 1.6, -0.2]} intensity={2.5} distance={4} color="#ffe6b0" />
        </Room>
      }
      camera={camera}
      bg="#0a1430"
      blur={4}
      puppets={[
        P("polo", POLO, [-0.45, -0.35], { ...faceChange([[0, "thinking"], [40, "excited"], [92, "shocked"]], f), reachR: [140, -600], frontR: true, handR: "fist", reachL: [-80, -620], frontL: true, handL: "open", lookX: 0.4 }),
        P("clerk", CLERK, [0.55, -1.2], { ...faceChange([[0, "neutral"], [95, "smug"]], f), reachR: [100 + scribble, -470], frontR: true, handR: "fist", lookX: -0.3 }),
      ]}
      light={{ tint: "#d8e2ff", shadow: 0.16, points: [{ position: [0.4, 1.6, -0.2], color: "#ffe6b0", strength: 1.4, range: 2.5 }] }}
      foreground={
        <group position={lamp}>
          <InkCylinder radius={0.06} height={0.1} color="#2a2a3a" ink={0.006} />
          <InkCylinder radius={0.006} height={0.3} position={[0.02, 0.12, 0]} rotation={[0, 0, -0.3]} color="#e8e0d0" ink={0.003} />
        </group>
      }
    />
  );
};

// ---------- 5. 724-919: the village next door ----------

const OFFICIAL: [number, number] = [-0.2, 0.35];
const WOMAN: [number, number] = [0.75, 0.2];
const BUTT = 165;
const Village = (f: number) => {
  const camera = beatPath(
    [
      { at: 0, position: [-2.7, 1.35, 2.7], target: [-2.6, 1.0, -2.6] },
      { at: 62, position: [-1.7, 1.25, 2.9], target: [-1.6, 0.95, -1.4] },
      { at: 105, position: [0.25, 1.15, 3.0], target: [0.3, 0.92, 0.2] },
      { at: 192, position: [0.45, 1.1, 2.75], target: [0.4, 0.88, 0.25] },
    ],
    f,
    40,
  );
  const t = f - BUTT;
  const butt = t < 0 ? ease(f, BUTT - 10, BUTT) : 1 - ease(t, 2, 14);
  const shout = Math.sin(f * 0.35) * 30;
  return (
    <Steppe
      camera={camera}
      f={f + 724}
      mode="day"
      road={false}
      blur={4}
      clear={[[-2.9, -3.2, 1.6], [0.9, -4.4, 1.6]]}
      puppets={[
        P("keeper", KEEPER, OFFICIAL, t < 0 ? { ...faceChange([[0, "smug"], [100, "awkward"]], f), reachL: [-220, -700], handL: "point", reachR: [120, -560], frontR: true, handR: "fist", lookX: 0.6 } : { ...faceChange([[0, "shocked"], [12, "worried"]], t), ...jump(t, 0, 140, 20), reachL: [-100, -900], handL: "open" }),
        P("villager", VILLAGER, WOMAN, { ...faceChange([[0, "worried"], [100, "angry"], [150, "disgusted"], [175, "angry"]], f), reachR: [230 + shout * 0.4, -880 + shout], handR: "open", reachL: [-150, -620], frontL: true, handL: "fist", lookX: -0.7 }),
      ]}
      foreground={<Foliage position={[1.5, 0.0, 1.85]} size={0.5} color="#6a8a3a" seed={4} />}
    >
      <Ger position={[-2.9, 0, -3.2]} />
      <Ger position={[0.9, 0, -4.4]} r={1.1} door="#2a6aa8" />
      <Goat position={[0.15, 0, 0.75]} rotationY={Math.PI} butt={butt} chew={Math.abs(Math.sin(f * 0.4))} />
      <Goat position={[1.35, 0, 0.55]} rotationY={0.3} coat="#8a5a3a" chew={Math.abs(Math.sin(f * 0.33 + 1))} />
      <Goat position={[1.55, 0, -0.25]} rotationY={-2.4} chew={Math.abs(Math.sin(f * 0.29 + 2))} />
      <Burst kind="stars" at={[-0.05, 0.35, 0.6]} frame={t - 1} seed={2} />
    </Steppe>
  );
};

// ---------- 6. 919-1014: the paiza ----------

const PAIZA_REACH: [number, number] = [150, -700];
const TackRoom = (f: number) => {
  const at: [number, number] = [0.05, 0.2];
  const c0: CameraShot = { position: [0.05, 1.15, 2.9], target: [0.1, 1.0, 0.2], fov: 38 };
  const lift = ease(f, 4, 26);
  const reach: [number, number] = [PAIZA_REACH[0], -620 - (PAIZA_REACH[1] + 620) * -lift];
  const camera = beatPath(
    [
      { at: 0, ...c0 },
      { at: 35, position: [0.3, 1.15, 2.45], target: [0.32, 1.05, 0.2] },
      { at: 92, position: [0.36, 1.13, 2.15], target: [0.35, 1.05, 0.2] },
    ],
    f,
    38,
  );
  const hand = handAt(at, reach, camera);
  const saddle = frameSpot(c0, ASPECT, -0.85, -0.6, 1.1);
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#5a4a3a" wall="#2a7a7a" wallPattern="panel" floorPattern="wood" width={5} depth={3.4} sun={{ x: 0.9, color: "#bff0e8", bars: 3 }}>
          {[-1.1, 0, 1.1].map((x, i) => (
            <PeggedSaddle key={x} position={[x, 1.45, -1.7]} color={["#8a3a22", "#6a4a22", "#7a2a22"][i]} cloth={["#3a6a8a", "#c84a3a", "#e0a030"][i]} />
          ))}
          <Paiza position={[hand[0] + 0.04, hand[1] + 0.12, hand[2] + 0.06]} rotation={[0, -0.15, 0.1 - 0.1 * lift]} shine={ease(f, 60, 70) * (1 - ease(f, 78, 90))} />
          <Label text="PAIZA" position={[hand[0] + 0.05, hand[1] + 0.42, hand[2] + 0.1]} width={0.24} appear={f - 35} />
        </Room>
      }
      camera={camera}
      bg="#0a2a2a"
      blur={5}
      puppets={[P("rider", RIDER, at, { ...faceChange([[0, "neutral"], [30, "smug"]], f), reachR: reach, frontR: true, handR: "fist", lookX: 0.5, headTilt: -5 })]}
      light={{ tint: "#e0fff8", shadow: 0.14, distant: [{ direction: [0.6, 0.5, 0.6], color: "#d8fff0", strength: 1.0 }] }}
      foreground={<PeggedSaddle position={[saddle[0], saddle[1], saddle[2] - 0.3]} color="#5a2a1a" cloth="#2a5a6a" />}
    />
  );
};

// ---------- 7. 1014-1161: anyone he met had to hand over theirs ----------

const LAME_X = -1.3;
const HAUL = 64;
const MOUNT = 84;
const Desert = (f: number) => {
  const camera = beatPath(
    [
      { at: 0, position: [0.5, 1.2, 3.6], target: [0.3, 0.9, 0] },
      { at: 60, position: [0.15, 1.1, 3.05], target: [0.05, 0.9, 0.15] },
      { at: 140, position: [-0.25, 1.0, 3.0], target: [-0.15, 0.82, 0.4] },
    ],
    f,
    40,
  );
  // The merchant rides in from the right and pulls up; the courier hauls him off and gallops away left on his horse.
  const arrive = ease(f, 0, 40);
  const away = Math.max(0, f - MOUNT);
  const hx = 2.6 - 2.35 * arrive - 0.0016 * away * away - 0.02 * away;
  const run = f < 40 ? 0.9 * (1 - arrive) + 0.2 : f < MOUNT ? 0.1 : Math.min(1.3, 0.3 + away * 0.05);
  const phase = f * 0.35 + away * away * 0.01;
  const merchantMounted = f < HAUL;
  const fall = ease(f, HAUL, HAUL + 12);
  const merchantAt: [number, number] = [0.25 + fall * 0.05, ROAD.z + RIDE_Z + fall * 0.35];
  const courierUp = f >= MOUNT;
  const m = mounted("rider", RIDER, hx, ROAD.z, phase, run, { expression: "excited", reachR: [180, -760], handR: "fist", lean: 12 }, -1, { bells: true, frame: f });
  const raise = ease(f, 6, 22);
  const courierAt: [number, number] = [-0.6 + ease(f, 50, HAUL) * 0.5, ROAD.z + 0.45];
  const courierReach: [number, number] = f < HAUL ? [200, -620 - 330 * raise] : [-120, -700];
  const courierHand = handAt(courierAt, courierReach, camera);
  const merchantAir = merchantMounted ? SADDLE_AIR : fall < 1 ? SADDLE_AIR + (GROUND_SIT - SADDLE_AIR) * fall * fall + Math.sin(fall * Math.PI) * 0.25 * UNITS : GROUND_SIT;
  const fist = Math.sin(f * 0.6) * 40;
  return (
    <Steppe
      camera={camera}
      f={f + 1014}
      mode="desert"
      blur={4}
      puppets={[
        courierUp ? m.rider : P("rider", RIDER, courierAt, { ...faceChange([[0, "determined"], [40, "smug"]], f), reachR: courierReach, handR: f < HAUL ? "fist" : "open", lookX: 0.8, view: f > 50 ? "side" : "front", facing: 1 }),
        P("merchant", MERCHANT, merchantAt, f < HAUL ? { ...faceChange([[0, "happy"], [24, "confused"], [50, "worried"]], f), sit: true, air: SADDLE_AIR, view: "side", facing: -1, lookX: -0.5 } : { ...faceChange([[0, "shocked"], [24, "angry"]], f - HAUL), sit: true, air: merchantAir, view: "front", reachR: [200, -900 + fist], handR: "fist", reachL: [-160, -420], handL: "open", lookX: -0.8 }),
      ]}
      foreground={<Tussocks z={2.3} x0={-3.5} x1={2.5} color="#a8803e" step={1.4} />}
    >
      {/* the lame horse lies by the road */}
      <group position={[LAME_X, -0.42, ROAD.z - 0.55]} rotation={[0, 0, 0.08]} userData={{ ghost: true }}>
        <Horse scale={HS} phase={0} run={0} />
      </group>
      {m.horse}
      {courierUp && m.bells}
      {!courierUp && <BellBelt position={[courierAt[0], 0.58, courierAt[1] + 0.12]} frame={f} ring={0.3} />}
      {f < HAUL + 4 && <Paiza position={[courierHand[0] + 0.04, courierHand[1] + 0.1, courierHand[2] + 0.06]} rotation={[0, 0, 0.1]} scale={0.8} shine={ease(f, 20, 26) * (1 - ease(f, 32, 40))} />}
      <Burst kind="dust" at={[merchantAt[0], 0.02, merchantAt[1]]} frame={f - HAUL - 12} size={1.0} seed={7} />
      <Burst kind="dust" at={[hx + 0.4, 0.02, ROAD.z]} frame={f - MOUNT - 6} size={0.8} seed={9} />
    </Steppe>
  );
};

// ---------- 8. 1161-1325: You see, no horse ran far (night) ----------

const nightX = (f: number) => -4.5 + f * 0.062;
const KEEPER_NIGHT: [number, number] = [6.1, -0.85];
const NightRoad = (f: number) => {
  const xr = nightX(f);
  const camera = beatPath(
    [
      { at: 0, position: [nightX(0) + 0.3, 1.35, 4.3], target: [nightX(0) + 0.35, 1.3, 0] },
      { at: 70, position: [nightX(70) + 0.4, 1.35, 3.9], target: [nightX(70) + 0.45, 1.3, 0] },
      { at: 128, position: [5.7, 1.25, 3.0], target: [6.1, 1.05, -0.9] },
      { at: 162, position: [5.9, 1.2, 2.6], target: [6.15, 1.05, -0.9] },
    ],
    f,
    40,
  );
  const m = mounted("rider", RIDER, xr, ROAD.z, f * 0.5, 1.3, { expression: "determined", reachR: [190, -640], handR: "fist", lean: 12 }, 1, { bells: true, frame: f });
  const tube = handAt(m.rider.at, [190, -640], camera, SADDLE_AIR + m.lift * UNITS);
  const torch: Vec3 = [5.45, 0, -0.55];
  const listen = ease(f, 100, 112);
  return (
    <Steppe
      camera={camera}
      f={f + 1161}
      mode="night"
      blur={4}
      area={[-7, 9, -6, 5]}
      clear={[[7.4, -2.8, 2.2]]}
      puppets={[m.rider, P("keeper", KEEPER, KEEPER_NIGHT, { ...faceChange([[0, "neutral"], [104, "thinking"], [140, "excited"]], f), reachL: [-170 - 40 * listen, -640 - 200 * listen], frontL: false, handL: "open", lookX: -0.9 })]}
      light={steppeLight("night", [torch[0], 1.7, torch[2]], f)}
      foreground={<Tussocks z={2.8} x0={-5} x1={8} color="#2e3e4e" />}
    >
      {m.horse}
      {m.bells}
      <LetterTube position={[tube[0] + 0.05, tube[1], tube[2] + 0.04]} rotation={[0, 0, 0.25]} />
      <YamHouse position={[7.6, 0, -2.9]} frame={f} lit={1} />
      <Torch position={torch} frame={f} />
      <MilePost position={[1.8, 0, 0.75]} text="NEXT YAM" />
    </Steppe>
  );
};

// ---------- 9. 1325-1516: the hand-over at a gallop (dawn) ----------

const H = 150; // hand-over frame (shot)
const x2 = (f: number) => {
  const t = Math.max(0, f - 108);
  return t < 50 ? 0.7 + 0.0009 * t * t : 0.7 + 0.0009 * 2500 + 0.09 * (t - 50);
};
const x1 = (f: number) => (f <= H ? x2(H) - 0.12 + 0.072 * (f - H) : x2(H) - 0.12 + 0.072 * (f - H) - 0.0011 * (f - H) * (f - H));
const TABLE: Vec3 = [-1.45, 0, -0.9];
const Handover = (f: number) => {
  const camera = beatPath(
    [
      { at: 0, position: [0.0, 1.7, 3.8], target: [0.1, 1.1, -1.4] },
      { at: 53, position: [0.75, 1.3, 2.9], target: [0.7, 1.1, 0] },
      { at: 86, position: [-1.0, 1.25, 1.75], target: [-1.4, 0.7, -0.85] },
      { at: H, position: [x2(H) - 0.1, 1.25, 3.1], target: [x2(H) - 0.05, 1.15, 0.1] },
      { at: 189, position: [x2(189) - 0.6, 1.25, 3.2], target: [x2(189) - 0.4, 1.1, 0] },
    ],
    f,
    40,
  );
  const r2run = f < 108 ? 0.05 : Math.min(1.3, (f - 108) * 0.03);
  const r1run = f <= H ? 1.3 : Math.max(0.2, 1.3 - (f - H) * 0.04);
  const m2 = mounted("rider2", RIDER2, x2(f), ROAD.z, f < 108 ? Math.sin(f * 0.1) * 0.2 : (f - 108) * 0.45, r2run, { ...faceChange([[0, "determined"], [H + 4, "excited"]], f), reachL: f < H + 6 ? [-200, -600] : [160, -640], handL: f < H - 6 ? "open" : "fist", lookX: f < H ? -0.8 : 0.6, lean: 4 + 8 * Math.min(1, r2run) }, 1, { bells: true, frame: f });
  const m1 = mounted("rider", RIDER, x1(f), ROAD.z + 0.5, f * 0.5, r1run, { ...faceChange([[0, "determined"], [H + 8, "happy"]], f), reachR: [220, -640], handR: f < H + 4 ? "fist" : "open", lean: 10 }, 1, { bells: true, frame: f });
  const h1 = handAt(m1.rider.at, [220, -640], camera, SADDLE_AIR + m1.lift * UNITS);
  const h2 = handAt(m2.rider.at, f < H + 6 ? [-200, -600] : [160, -640], camera, SADDLE_AIR + m2.lift * UNITS);
  const pass = ease(f, H - 3, H + 3);
  const tube: Vec3 = [h1[0] + (h2[0] - h1[0]) * pass, h1[1] + (h2[1] - h1[1]) * pass, h1[2] + (h2[2] - h1[2]) * pass];
  const lantern = frameSpot({ position: [0.0, 1.7, 3.8], target: [0.1, 1.1, -1.4], fov: 40 }, ASPECT, 0.85, -0.2, 1.3);
  return (
    <Steppe
      camera={camera}
      f={f + 1325}
      mode="dawn"
      blur={4}
      area={[-7, 14, -6, 5]}
      clear={[[0, -2.8, 2.4]]}
      puppets={[
        m2.rider,
        ...(f > 60 ? [m1.rider] : []),
        P("keeper", KEEPER, [-0.35, -0.75], { ...faceChange([[0, "determined"], [H, "happy"]], f), reachR: [200, -560 + Math.sin(f * 0.2) * 30], handR: "fist", lookX: 0.7, gesture: f > H ? "cheer" : undefined }),
        P("clerk", CLERK, [TABLE[0], TABLE[2] - 0.45], { ...faceChange([[0, "neutral"], [86, "thinking"], [H, "smug"]], f), reachR: [80 + Math.sin(f * 0.7) * 25, -440], frontR: true, handR: "fist", lookX: f > 120 ? 0.9 : 0 }),
      ]}
      light={steppeLight("dawn")}
      foreground={<Lantern position={lantern} frame={f} />}
    >
      <YamHouse position={[0, 0, -2.9]} frame={f} lit={0.6} />
      <LogTable position={TABLE} slip="TIME LOGGED" appear={f - 84} />
      {m2.horse}
      {m2.bells}
      {f > 60 && m1.horse}
      {f > 60 && m1.bells}
      {f > 60 && <LetterTube position={[tube[0] + 0.04, tube[1], tube[2] + 0.05]} rotation={[0, 0, 0.25]} />}
      <Burst kind="dust" at={[x2(H) - 0.3, 0.02, ROAD.z]} frame={f - H} size={0.8} seed={11} />
    </Steppe>
  );
};

// ---------- 10. 1516-1643: the fruit reaches the Khan ----------

const KHAN_AT: [number, number] = [0.3, -0.85];
const PICK = 52;
const BITE = 74;
const Hall = (f: number) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.15, 0.9, 1.75], target: [-0.05, 0.6, -0.4] },
      { at: 51, position: [0.15, 1.15, 2.3], target: [0.25, 1.0, -0.8] },
      { at: 120, position: [0.1, 1.05, 2.25], target: [0.1, 0.85, -0.6] },
    ],
    f,
    38,
  );
  const reach: [number, number] = f < PICK ? [160, -560] : f < BITE ? [60 - 200 * ease(f, PICK, PICK + 10), -480 - 300 * ease(f, PICK, BITE)] : [40, -800];
  const hand = handAt(KHAN_AT, reach, camera);
  const edge = frameSpot({ position: [-0.35, 0.9, 1.75], target: [-0.15, 0.6, -0.45], fov: 38 }, ASPECT, -0.7, -0.75, 0.8);
  const chew = f > BITE ? Math.abs(Math.sin((f - BITE) * 0.5)) : 0;
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#5a2a1a" wall="#8a2a22" wallPattern="panel" floorPattern="carpet" width={6} depth={5} stripe="#e0b040">
          <InkBox size={[1.2, 0.08, 0.6]} position={[-0.1, 0.42, -0.4]} color="#3a1a14" ink={0.014} />
          {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.06, 0.38, 0.06]} position={[-0.1 + sx * 0.52, 0.19, -0.4 + sz * 0.24]} color="#2a120c" ink={0.006} />))}
          <FruitBasket position={[-0.05, 0.46, -0.3]} tag="10 DAYS' JOURNEY" appear={f - 90} taken={f > PICK ? 1 : 0} />
          {f > PICK && <Peach position={[hand[0] + 0.05, hand[1] + 0.05, hand[2] + 0.06]} bitten={f > BITE} />}
          {[-1.6, 1.6].map((x) => (
            <group key={x}>
              <InkCylinder radius={0.18} height={0.34} position={[x, 2.1, -2.2]} color="#e0402a" ink={0.012} />
              <Halo position={[x, 2.1, -2.0]} size={1.3} color="#ffb060" strength={0.55} />
              <pointLight position={[x, 2.1, -1.8]} intensity={3} distance={4} color="#ffb060" />
            </group>
          ))}
          <InkBox size={[2.2, 0.5, 0.05]} position={[0.3, 2.55, -2.45]} color="#e0b040" ink={0.012} />
        </Room>
      }
      camera={camera}
      bg="#2a0a08"
      blur={5}
      puppets={[P("khan", KHAN, KHAN_AT, { ...faceChange([[0, "neutral"], [40, "excited"], [BITE + 2, "happy"]], f), reachR: reach, frontR: true, handR: f < PICK ? "open" : "fist", reachL: [-160, -560], handL: "open", lookX: f < BITE ? -0.4 : 0.2, mouthOpen: chew * 0.4 })]}
      light={{ tint: "#ffe2c4", shadow: 0.16, points: [{ position: [-1.6, 2.1, -1.8], color: "#ffb060", strength: 1.6, range: 3 }, { position: [1.6, 2.1, -1.8], color: "#ffb060", strength: 1.6, range: 3 }] }}
      foreground={<InkBox size={[0.6, 0.06, 0.4]} position={edge} color="#3a1a14" ink={0.01} />}
    />
  );
};

// ---------- 11. 1643-end: every horse got tired; the letter never did ----------

const Sunset = (f: number) => {
  const xr = 1.2 - f * 0.075;
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 0.95, 3.4], target: [0.1, 0.9, -0.3] },
      { at: 98, position: [-3.2, 2.0, 4.6], target: [-5.6, 0.9, -0.3] },
    ],
    f,
    40,
  );
  const m = mounted("rider2", RIDER2, xr, ROAD.z - 0.2, f * 0.5, 1.3, { expression: "determined", lean: 12 }, -1, { bells: true, frame: f });
  return (
    <Steppe
      camera={camera}
      f={f + 1643}
      mode="sunset"
      blur={3}
      area={[-9, 4, -6, 6]}
      puppets={f > 4 ? [m.rider] : []}
      foreground={<Tussocks z={2.25} x0={-2} x1={2} color="#8a7a48" />}
    >
      <group position={[-1.3, 0, -0.9]} userData={{ ghost: true }}>
        <Horse scale={HS} phase={Math.sin(f * 0.04) * 0.1} run={0.05} bare coat="#3a2a22" />
      </group>
      <group position={[0.9, 0, -1.4]} rotation={[0, Math.PI, 0]} userData={{ ghost: true }}>
        <Horse scale={HS} phase={0} run={0} bare coat="#d8c8b0" />
      </group>
      {f > 4 && m.horse}
      {f > 4 && m.bells}
      <Burst kind="dust" at={[xr + 0.4, 0.02, ROAD.z - 0.2]} frame={(f % 16) + 1} size={0.5} seed={Math.floor(f / 16) + 20} count={5} />
    </Steppe>
  );
};

const HookShot = one(Hook);
const TiredShot = one(Tired);
const YamShot = one(YamDay);
const TallyShot = one(Tally);
const VillageShot = one(Village);
const TackShot = one(TackRoom);
const DesertShot = one(Desert);
const NightShot = one(NightRoad);
const HandoverShot = one(Handover);
const HallShot = one(Hall);
const SunsetShot = one(Sunset);

const SHOTS: Shot[] = [
  [0, 283, HookShot, false],
  [283, 366, TiredShot, "dip"],
  [366, 594, YamShot, "dip"],
  [594, 724, TallyShot, "dip"],
  [724, 919, VillageShot, "dip"],
  [919, 1014, TackShot, "dip"],
  [1014, 1161, DesertShot, "dip"],
  [1161, 1325, NightShot, "dip"],
  [1325, 1516, HandoverShot, "dip"],
  [1516, 1643, HallShot, "dip"],
  [1643, TIMING.totalFrames, SunsetShot, "dip"],
];

// Bells on every few strides of a galloping courier (different takes), far off first when the station hears them.
const strides = (from: number, to: number, every: number) => Array.from({ length: Math.floor((to - from) / every) }, (_, i) => from + i * every + ((i * 5) % 4));

const SFX: Sfx[] = [
  // hook
  { at: 0, src: sfx("hooves"), volume: 0.144, until: 283 },
  { at: 0, src: sfx("wind"), volume: 0.084, until: 283 },
  ...foleyCues("jingle", strides(240, 280, 22), 0.19, { space: "outdoor" }),
  { at: 60, src: sfx("pop"), volume: 0.5 },
  // tired horse
  { at: 283, src: sfx("hooves"), volume: 0.099, until: 283 + 40 },
  ...foleyCues("thud", [283 + TIRE_SINK + 10], 0.6, { space: "outdoor" }),
  ...foleyCues("thud", [283 + TIRE_SINK + 18], 0.88, { space: "outdoor", hit: 0.3 }),
  // yam station
  { at: 366, src: sfx("wind"), volume: 0.07, until: 594 },
  { at: 366 + 28, src: sfx("pop"), volume: 0.85 },
  { at: 366 + 180, src: sfx("pop"), volume: 0.77 },
  { at: 366 + 210, src: sfx("pop"), volume: 0.77 },
  // tally room
  { at: 594 + 40, src: sfx("pop"), volume: 0.55 },
  { at: 594 + 41, src: sfx("credit-blip"), volume: 0.27 },
  { at: 594 + 90, src: sfx("pop"), volume: 0.5 },
  { at: 594 + 91, src: sfx("credit-blip"), volume: 0.14 },
  ...foleyCues("scrape", [594 + 10], 0.3, { space: "room" }),
  // village
  { at: 724, src: sfx("wind"), volume: 0.07, until: 919 },
  ...foleyCues("thud", [724 + BUTT], 0.55, { space: "outdoor", hit: 0.25 }),
  { at: 724 + BUTT + 1, src: sfx("chime"), volume: 0.14 },
  // tack room
  { at: 919 + 35, src: sfx("pop"), volume: 0.55 },
  { at: 919 + 62, src: sfx("chime"), volume: 0.31, space: "room" },
  // desert road
  { at: 1014, src: sfx("hooves"), volume: 0.09, until: 1014 + 40 },
  ...foleyCues("jingle", [1014 + 12], 0.29, { space: "outdoor" }),
  ...foleyCues("thud", [1014 + HAUL + 12], 0.96, { space: "outdoor", hit: 0.35 }),
  { at: 1014 + MOUNT, src: sfx("hooves"), volume: 0.09, until: 1161 },
  ...foleyCues("jingle", strides(1014 + MOUNT + 14, 1150, 34), 0.18, { space: "outdoor" }),
  // pivot, night
  { at: 1168 - 50, src: sfx("riser"), volume: 0.25 },
  { at: 1168, src: sfx("sting"), volume: 0.4 },
  { at: 1161, src: sfx("hooves"), volume: 0.117, until: 1325 },
  ...foleyCues("jingle", strides(1172, 1250, 28), 0.32, { space: "outdoor" }),
  ...foleyCues("jingle", strides(1262, 1320, 22), 0.41, { space: "far" }),
  { at: 1161, src: sfx("crackle"), volume: 0.08, until: 1325 },
  // hand-over, dawn
  ...foleyCues("scrape", [1325 + 84], 0.48, { space: "outdoor" }),
  { at: 1325 + 84, src: sfx("pop"), volume: 0.77 },
  { at: 1325 + 60, src: sfx("hooves"), volume: 0.08, until: 1516 },
  ...foleyCues("jingle", strides(1325 + 100, 1510, 26), 0.15, { space: "outdoor" }),
  { at: 1325 + H, src: sfx("whoosh"), volume: 0.15 },
  // the Khan's hall
  { at: 1516 + 90, src: sfx("pop"), volume: 0.42 },
  ...foleyCues("crunch", [1516 + BITE], 0.14, { space: "room" }),
  ...foleyCues("munch", [1516 + BITE + 22, 1516 + BITE + 30, 1516 + BITE + 39, 1516 + BITE + 47], 0.45, { space: "room" }),
  // sunset
  { at: 1643, src: sfx("hooves"), volume: 0.081, until: TIMING.totalFrames },
  { at: 1643, src: sfx("wind"), volume: 0.084, until: TIMING.totalFrames },
  ...foleyCues("jingle", strides(1650, 1720, 30), 0.3, { space: "outdoor" }),
];

// Bright for the gallop and the stations, pulsing for the paiza, the pivot and the hand-over, bright again at the end.
const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 594, volume: 0.26 },
  { src: "music/lounge.wav", from: 594, to: 1014, volume: 0.26 },
  { src: "music/tension.wav", from: 1014, to: 1516, volume: 0.26 },
  { src: "music/upbeat.wav", from: 1516, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
