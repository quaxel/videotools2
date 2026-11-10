import React from "react";
import {
  beatPath,
  Burst,
  Campfire,
  CameraShot,
  faceChange,
  firePoint,
  Foliage,
  foleyCues,
  frameSpot,
  GodRays,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  moodBackground,
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
  stroll,
  Timing,
  useShotFrame,
  Video,
} from "../../engine";
import {
  blockPlace,
  Charger,
  Coat,
  Farm,
  FieldGun,
  FieldSet,
  fieldBg,
  fieldLight,
  Flag,
  groundY,
  HORSE_SADDLE,
  MuzzleFlash,
  Rain,
  Ripples,
  Rye,
  ShotSmoke,
  SmokeBank,
  SoldierState,
  Troops,
  Vec3,
  Village,
} from "./WaterlooSet";
import {
  Barricade,
  Block,
  BorderPost,
  BreakfastTable,
  Bridge,
  Chair,
  Chapel,
  Cottage,
  GardenWall,
  Hourglass,
  Orders,
  PearTree,
  SandTable,
  StoneWall,
  Strawberry,
  StrawberryBowl,
  Tent,
  TownHouse,
  VillageSign,
  WindowView,
} from "./props";
import { Bicornes } from "./hats";
import TIMING_JSON from "./timing.json";

// "What if Napoleon's marshal had marched to the guns?" (Waterloo, 18 June 1815). Sets in this folder
// (guide/references/waterloo-1815.md): FieldSet (the Belgian country in nine moods and four terrains) with instanced
// battalions, flags, smoke and rain; the sand3d field gun and chargers (../videos/what-if-waterloo/sand3d/); Room
// interiors for the notary's breakfast room at Walhain and the what-if sand table.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-waterloo";
export const timing = TIMING;

const ASPECT = 9 / 16;
const UNITS = 1060 / 1.3;
const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Stage pushes every camera 10 % of the camera-to-target distance over a shot; keep the target within `d` m along the
// same line of sight so a far aim (a ridge 40 m off) does not turn into a 5 m dolly.
const aim = (c: CameraShot, d = 7): CameraShot => {
  const v = [c.target[0] - c.position[0], c.target[1] - c.position[1], c.target[2] - c.position[2]];
  const l = Math.hypot(v[0], v[1], v[2]);
  if (l <= d) return c;
  const k = d / l;
  return { ...c, target: [c.position[0] + v[0] * k, c.position[1] + v[1] * k, c.position[2] + v[2] * k] };
};

// Every Stage in this video, with the officers' 1815 bicornes riding on their heads (hats.tsx).
const HStage: React.FC<React.ComponentProps<typeof Stage>> = (p) => (
  <Stage
    {...p}
    foreground={
      <>
        {p.foreground}
        <Bicornes cast={p.puppets ?? []} energy={p.energy} />
      </>
    }
  />
);

// ---------- cast ----------

const NAPOLEON: PuppetLook = { skin: "#f2cfae", hair: "#2a1e16", outfit: "#8e8e88" };
const GROUCHY: PuppetLook = { skin: "#f0c8a6", hair: "#b8b0a4", outfit: "#2a3f8a" };
const GERARD: PuppetLook = { skin: "#eec4a0", hair: "#3a2214", outfit: "#34508f", beard: "#3a2214" };
const BLUCHER: PuppetLook = { skin: "#f0c8a8", hair: "#ece8e0", outfit: "#1e2440", beard: "#ece8e0" };
const WELLINGTON: PuppetLook = { skin: "#f2cdb0", hair: "#8a6a4a", outfit: "#2a2c3a" };
const GUNNER: PuppetLook = { skin: "#e8b890", hair: "#3a2416", outfit: "#2a3f8a", beard: "#3a2416" };
const HISTORIAN: PuppetLook = { skin: "#f2cdb0", hair: "#9a948c", outfit: "#6a3a5a", vest: "#e8dcc0", glasses: true };

const P = (id: string, look: PuppetLook, at: [number, number], pose: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: { expression: "neutral", ...pose } as PuppetPose });

// A general on his charger, side on: the horse at [x, z] facing +x (dir 1) or -x (dir -1), the rider's card a
// little in front of the near flank so his leg shows down its side.
const HS = 0.78;
const SADDLE = HORSE_SADDLE * HS;
const RIDE_Z = 0.32;
type Mount = { horse: React.ReactNode; rider: PuppetPlacement; air: number };
const mounted = (id: string, look: PuppetLook, coat: Coat, x: number, z: number, dir: 1 | -1, pose: Partial<PuppetPose>, opts: { phase?: number; gait?: number; rear?: number; nod?: number; y?: number } = {}): Mount => {
  const { phase = 0, gait = 0, rear = 0, nod = 0, y = 0 } = opts;
  const lift = gait > 0 ? Math.abs(Math.cos(phase)) * 0.03 * gait : 0;
  const air = (SADDLE - 0.34 + lift + y + rear * 0.28) * UNITS;
  return {
    horse: (
      <group userData={{ ghost: true }}>
        <Charger coat={coat} position={[x, y, z]} yaw={(dir * Math.PI) / 2} phase={phase} gait={gait} rear={rear} nod={nod} scale={HS} />
      </group>
    ),
    rider: P(id, look, [x - 0.04 * dir - rear * 0.18 * dir, z + RIDE_Z], { sit: true, air, view: "side", facing: dir, lean: 4 - rear * 10, ...pose }),
    air,
  };
};
const handAt = (at: [number, number], reach: [number, number], camera: CameraShot, air = 0): Vec3 => {
  const h = handWorld(at, reach, camera);
  return [h[0], h[1] + (air * 1.3) / 1060, h[2]];
};

// ---------- 1. Hook (0-81): push past the candlestick onto Grouchy's strawberries; gunfire flickers in the window ----------

const ROOM_BACK = -2.0;
const TABLE: Vec3 = [0, 0, -0.75];
const TOP = 0.44;
const GROUCHY_SEAT: [number, number] = [0.05, -1.32];
const WIN: Vec3 = [0.95, 1.45, ROOM_BACK + 0.06];

const Breakfast: React.FC<{ camera: CameraShot; frame: number; warm: boolean; flash?: number; hop?: number; ripple?: number; plateBerry?: Vec3 | null; children?: React.ReactNode }> = ({
  camera,
  frame,
  warm,
  flash = 0,
  hop = 0,
  ripple = 0,
  plateBerry = null,
  children,
}) => (
  <Room camera={camera} mood={warm ? "warm" : "daylight"} floor={warm ? "#6a3a22" : "#8a6a4a"} wall={warm ? "#a86a3a" : "#e8d8a0"} wallPattern="wallpaper" floorPattern="tile" width={5} depth={4} stripe={warm ? "#7a3a22" : "#b89a5a"}>
    <WindowView position={WIN} sky={warm ? ["#4a5a7a", "#c89a7a"] : ["#8ab8e8", "#e8f0f0"]} land={warm ? "#3a4a3a" : "#6a9a4a"} flash={flash} />
    <BreakfastTable position={TABLE} top={TOP} frame={frame} hop={hop} ripple={ripple} plateBerry={plateBerry} candle={warm} />
    <Chair position={[GROUCHY_SEAT[0], 0, GROUCHY_SEAT[1] - 0.12]} />
    <Chair position={[0.95, 0, -0.75]} rotationY={-Math.PI / 2} />
    {/* a dresser with plates, a portrait frame, a clock */}
    <InkBox size={[1.2, 0.9, 0.42]} position={[-1.5, 0.45, ROOM_BACK + 0.22]} color="#5a3420" ink={0.012} />
    <InkBox size={[1.2, 0.9, 0.12]} position={[-1.5, 1.35, ROOM_BACK + 0.08]} color="#5a3420" ink={0.012} />
    {[-1.85, -1.5, -1.15].map((x) => (
      <InkCylinder key={x} radius={0.13} height={0.02} position={[x, 1.38, ROOM_BACK + 0.16]} rotation={[Math.PI / 2 - 0.2, 0, 0]} color="#f2f0ea" ink={0.006} />
    ))}
    <InkBox size={[0.55, 0.7, 0.04]} position={[-0.35, 1.75, ROOM_BACK + 0.03]} color="#c8a040" ink={0.01} />
    <InkBox size={[0.45, 0.6, 0.02]} position={[-0.35, 1.75, ROOM_BACK + 0.06]} color={warm ? "#5a4a3a" : "#6a7a5a"} ink={0} />
    {warm && <pointLight position={[0.58, TOP + 0.35, TABLE[2] - 0.28]} intensity={0.7} distance={2.5} color="#ffb060" />}
    {children}
  </Room>
);

const S1_CAM0: CameraShot = { position: [-0.55, 1.2, 2.35], target: [0.0, 0.95, -0.9], fov: 38 };
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..81
  const camera = aim(beatPath(
    [
      { at: 0, ...S1_CAM0 },
      { at: 40, position: [-0.32, 1.06, 1.75], target: [0.0, 0.92, -0.95], fov: 38 },
      { at: 80, position: [-0.18, 0.98, 1.4], target: [-0.02, 0.9, -1.0], fov: 38 },
    ],
    f,
  ));
  const flash = Math.max(0, Math.sin(f * 0.35) ** 8) * (f > 20 ? 1 : 0) + (f > 50 && f < 56 ? 0.8 : 0);
  // he lifts a strawberry to his mouth on "eating strawberries"
  const lift = ease(f, 50, 66) - ease(f, 72, 80) * 0.4;
  return (
    <>
      <HStage
        set={<Breakfast camera={camera} frame={f} warm flash={flash} />}
        camera={camera}
        bg={moodBackground("warm")}
        blur={2.2}
        puppets={[
          P("grouchy", GROUCHY, GROUCHY_SEAT, {
            sit: true,
            ...faceChange([[0, "happy"], [62, "smug"]], f),
            reachR: [mix(150, 60, lift), mix(-470, -760, lift)],
            handR: "fist",
            reachL: [-150, -460],
            handL: "open",
            lookX: f < 40 ? 0.3 : -0.2,
            headTilt: 4,
          }),
        ]}
        light={{ tint: "#ffe0c0", shadow: 0.22, points: [{ position: [0.58, TOP + 0.35, TABLE[2] - 0.28], color: "#ffb05a", strength: 2.2, range: 2.6 }], distant: [{ direction: [0.8, 0.4, -0.5], color: "#ffd8a0", strength: 0.5 + flash * 0.8 }] }}
        foreground={
          <group position={frameSpot(S1_CAM0, ASPECT, -0.88, -0.35, 0.9)}>
            <InkCylinder radius={0.03} height={0.5} position={[0, 0, 0]} color="#c8a040" ink={0.006} />
            <InkCylinder radius={0.028} height={0.18} position={[0, 0.34, 0]} color="#f4ecd8" ink={0.005} />
          </group>
        }
      />
      <Headline f={f} text="WHAT IF HE MARCHED?" at={4} out={52} y={110} size={80} />
    </>
  );
};

// ---------- 2. Two armies on two ridges (81-320): behind Napoleon on his grey, crane up over the valley as his
// columns go down into it, push across to Wellington's red lines on the far ridge, ease east toward the Prussians ----------

const BATTERY = [{ x: -0.75, z: 1.1, shot: 40 }];
const NAP_AT: [number, number] = [0.55, 3.0];
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..239
  const fr = f + 81;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.0, 1.5, 9.6], target: [0.2, -1.6, -24], fov: 40 },
      { at: 48, position: [0.05, 1.9, 9.4], target: [0.2, -2.0, -24], fov: 40 },
      { at: 153, position: [0.1, 2.2, 9.2], target: [0.0, -3.2, -40], fov: 38 },
      { at: 238, position: [0.25, 2.25, 9.1], target: [1.5, -3.2, -40], fov: 38 },
    ],
    f,
  ));
  const raise = ease(f, 26, 40) - ease(f, 96, 112);
  const napM = mounted("napoleon", NAPOLEON, "grey", NAP_AT[0], NAP_AT[1], -1, {
    ...faceChange([[0, "determined"], [48, "smug"], [150, "determined"]], f),
    reachR: [mix(60, -200, raise), mix(-560, -1000, raise)],
    handR: raise > 0.5 ? "point" : "fist",
    lookX: -0.6,
  }, { nod: 6 + Math.sin(f * 0.06) * 5 });
  const nap = napM.rider;
  const french = (k: number) => blockPlace([-4.6 + k * 4.4, -11 - (k % 2) * 3], 5, 6, Math.PI, f, { speed: 0.01, seed: k * 31 });
  const british = (k: number) => blockPlace([-9 + k * 6, -46.5 - (k % 2) * 1.2], 2, 10, 0, f, { seed: k * 17 });
  return (
    <>
      <HStage
        set={
          <FieldSet camera={camera} frame={fr} mode="morning" terrain="valley">
            {[0, 1, 2].map((k) => (
              <React.Fragment key={k}>
                <Troops army="french" count={30} place={french(k)} />
                <Flag kind="france" position={[french(k)(2).x + 0.4, groundY(french(k)(2).x, french(k)(2).z), french(k)(2).z - 0.6]} frame={fr} seed={k + 0.3} />
              </React.Fragment>
            ))}
            {[0, 1, 2, 3].map((k) => (
              <React.Fragment key={k}>
                <Troops army={k === 2 ? "highland" : "british"} count={20} place={british(k)} />
                <Flag kind="britain" position={[-9 + k * 6 + 1.2, groundY(-9 + k * 6 + 1.2, -47.6), -47.6]} frame={fr} size={1.04} pole={2.84} seed={k + 3.3} />
              </React.Fragment>
            ))}
            {BATTERY.map((b, i) => (
              <React.Fragment key={i}>
                <FieldGun position={[b.x, 0, b.z]} yaw={Math.PI + 0.12} recoil={Math.max(0, 1 - Math.abs(f - b.shot - 3) / 6) * (f > b.shot ? 1 : 0)} />
                <MuzzleFlash position={[b.x + 0.1, 0.85, b.z - 1.35]} t={f - b.shot} size={2.2} />
                <ShotSmoke at={[b.x + 0.1, 0.8, b.z - 1.45]} dir={[0.05, 0.1, -1]} t={f - b.shot} size={0.32} seed={i + 2.5} />
              </React.Fragment>
            ))}
            <SmokeBank from={[-18, 3, -42]} to={[14, 3, -44]} frame={fr} puffs={22} size={2.2} wind={[0.02, 0.004, 0]} seed={7} opacity={0.6} />
            <Flag kind="prussia" position={[11, groundY(11, -58) + 0.3, -58]} frame={fr} size={1.44} pole={3.64} seed={0.7} />
            <Troops army="prussian" count={24} place={blockPlace([12.5, -59], 3, 8, -1.0, f, { speed: 0.01, seed: 5 })} />
            <Rye area={[-4, -2.5, 4.5, 0.2]} count={520} frame={fr} color="#8cb860" />
            {napM.horse}
          </FieldSet>
        }
        camera={camera}
        bg={fieldBg("morning")}
        keepHeads={false}
        blur={1.3}
        puppets={[nap]}
        light={fieldLight("morning")}
        foreground={<Rye area={[-1.05, 6.25, -0.7, 6.5]} count={14} frame={fr} color="#c8a24a" height={0.9} seed={3} />}
      />
      <Headline f={f} text="BELGIUM, 18 JUNE 1815" at={4} out={96} size={76} />
    </>
  );
};

// ---------- 3. A day earlier (320-457): Napoleon sends Grouchy east with over thirty thousand men; a sideways
// track along the column as it marches away down the road ----------

const ROAD_X = 1.6;
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..137
  const fr = f + 320;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.2, 1.4, 6.6], target: [0.4, 1.0, -3], fov: 40 },
      { at: 41, position: [0.24, 1.42, 6.35], target: [0.42, 1.0, -3.4], fov: 40 },
      { at: 136, position: [0.28, 1.44, 6.25], target: [0.43, 1.0, -4], fov: 40 },
    ],
    f,
  ));
  const nap = P("napoleon", NAPOLEON, [-0.45, 0.6], {
    ...faceChange([[0, "determined"], [24, "smug"], [96, "determined"]], f),
    ...(f > 18 && f < 120 ? { reachR: [280, -720] as [number, number], handR: "point" as const } : { gesture: "handsOnHips" as const }),
    lookX: 0.7,
  });
  const gro = mounted("grouchy", GROUCHY, "bay", 1.15, -1.1, -1, {
    ...faceChange([[0, "neutral"], [40, "determined"], [100, "smug"]], f),
    ...(f > 44 && f < 80 ? { reachR: [110, -980] as [number, number], handR: "open" as const } : {}),
    lookX: -0.5,
  }, { nod: 3 + Math.sin(f * 0.08) * 4, phase: f * 0.1 });
  const column = (i: number): SoldierState => {
    const per = 4;
    const r = Math.floor(i / per);
    const c = i % per;
    const z = -1.5 - r * 0.75 - fr * 0.012 + (rand(i) - 0.5) * 0.06;
    const x = ROAD_X + 0.6 + (c - 1.5) * 0.5 + (rand(i + 3) - 0.5) * 0.06;
    return { x, z, yaw: Math.PI, stride: fr * 0.012 * 7 + r * 0.3, swing: 1 };
  };
  return (
    <HStage
      set={
        <FieldSet camera={camera} frame={fr} mode="overcast" terrain="plain" farms>
          {/* the road east */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_X + 0.6, 0.03, -30]}>
            <planeGeometry args={[2.8, 80]} />
            <meshToonMaterial color="#9a8a68" />
          </mesh>
          <Troops army="french" count={96} place={column} terrain="plain" />
          <Flag kind="france" position={[ROAD_X + 1.5, 0, -4.5 - fr * 0.012]} frame={fr} seed={3} />
          <Flag kind="france" position={[ROAD_X - 0.2, 0, -12 - fr * 0.012]} frame={fr} seed={5} />
          <FieldGun position={[ROAD_X + 0.6, 0, -18 - fr * 0.012]} yaw={Math.PI} roll={fr * 0.012 * 100} scale={0.9} />
          <Troops army="french" count={64} place={(i) => blockPlace([ROAD_X + 0.6, -26 - fr * 0.012], 16, 4, Math.PI, fr, { seed: 9 })(i)} terrain="plain" />
          {gro.horse}
        </FieldSet>
      }
      camera={camera}
      bg={fieldBg("overcast")}
        keepHeads={false}
      blur={1.3}
      puppets={[nap, gro.rider]}
      light={fieldLight("overcast")}
      foreground={<Foliage position={frameSpot({ position: [0.2, 1.4, 6.6], target: [0.4, 1.0, -3], fov: 40 }, ASPECT, -0.95, -0.95, 1.6)} size={0.35} color="#4a6a34" seed={4} />}
    />
  );
};

// ---------- 4. Rain all night (457-561): crane down through the rain onto the bivouac and a gun sunk in mud; the
// light drifts to a grey morning while Napoleon waits and a gunner slips in the mud ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..104
  const fr = f + 457;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.25, 5.0, 6.6], target: [0.15, 1.4, -6], fov: 42 },
      { at: 34, position: [0.3, 2.3, 4.6], target: [0.15, 0.8, -1.5], fov: 42 },
      { at: 103, position: [0.3, 1.5, 4.2], target: [0.15, 0.7, -0.8], fov: 42 },
    ],
    f,
  ));
  const dawn = ease(f, 30, 100);
  const flash = (f >= 6 && f < 10 ? 1 - (f - 6) / 4 : 0) + (f >= 18 && f < 21 ? 0.7 : 0);
  const SLIP = 70;
  const push = f < SLIP ? Math.sin(f * 0.5) * 20 : 0;
  return (
    <HStage
      set={
        <FieldSet camera={camera} frame={fr} mode="storm" terrain="plain" mud={0.85} dawn={dawn} flash={flash} farms={false} tufts={false}>
          <FieldGun position={[0.05, 0, -1.35]} yaw={0.35} sink={0.22} roll={f < SLIP ? Math.sin(f * 0.5) * 6 : 0} />
          <Campfire position={[-1.4, 0, -2.6]} frame={fr} />
          <Tent position={[-3.2, 0, -5]} color="#b8b098" />
          <Tent position={[2.6, 0, -6.5]} color="#b8b098" />
          <Tent position={[-0.8, 0, -8]} color="#a8a088" />
          <Troops army="french" count={6} terrain="plain" place={(i) => ({ x: -2.6 + (i % 3) * 0.7, z: -3.4 - Math.floor(i / 3) * 1.2, yaw: 0.6 + i, stride: 0, swing: 0 })} />
          <Rain center={[camera.position[0], 2.6, camera.position[2] - 7.5]} frame={fr} size={[12, 8, 10]} count={2000} opacity={0.55 - dawn * 0.15} />
          <Ripples area={[-2.5, -2, 2.5, 2.5]} frame={fr} count={70} />
          <Burst kind="dust" at={[0.72, 0.02, 0.4]} frame={f - SLIP - 6} count={14} size={0.5} seed={4} colors={["#5a4028", "#3a2a1a"]} />
        </FieldSet>
      }
      camera={camera}
      bg={fieldBg("storm")}
        keepHeads={false}
      blur={1.5}
      puppets={[
        P("napoleon", NAPOLEON, [-0.22, 0.55], {
          ...faceChange([[0, "worried"], [40, "thinking"], [80, "skeptical"]], f),
          gesture: f > 40 ? "chin" : undefined,
          lookX: f > 76 ? 0.8 : -0.2,
          headTilt: -4,
        }),
        P("gunner", GUNNER, [0.72, 0.25], {
          ...(f < SLIP
            ? { ...faceChange([[0, "determined"], [40, "angry"]], f), reachL: [-260 + push, -520], reachR: [-200 + push, -470], handL: "open", handR: "open", lean: -12, lookX: -0.8 }
            : { ...faceChange([[0, "shocked"], [14, "awkward"]], f - SLIP), sit: true, air: -260 * ease(f, SLIP, SLIP + 6), reachL: [-260, -420], reachR: [240, -440], handL: "open", handR: "open", lookX: 0.3 }),
        }),
      ]}
      light={{ ...fieldLight("storm"), points: [{ ...firePoint([-1.4, 0, -2.6], fr), strength: 1.6 * (1 - dawn * 0.6) }] }}
      foreground={<InkCylinder radius={0.025} height={1.6} position={frameSpot({ position: [0.5, 2.2, 4.4], target: [0.1, 0.8, -1.5], fov: 42 }, ASPECT, 0.9, 0.1, 1.6)} rotation={[0, 0, 0.12]} color="#5a4030" ink={0.006} />}
    />
  );
};

// ---------- 5. Breakfast at Walhain (561-741): morning sun in the notary's room; Grouchy enjoys his strawberries;
// the rumble from the west makes the berries hop, one lands in his coffee ----------

const S5: React.FC = () => {
  const f = useShotFrame(); // 0..180
  const RUMBLE = 125;
  const CANNONS = 161;
  const camera = aim(beatPath(
    [
      { at: 0, position: [-0.9, 1.65, 3.2], target: [0.0, 0.7, -0.9], fov: 40 },
      { at: 38, position: [-0.6, 1.45, 2.6], target: [0.0, 0.66, -0.9], fov: 40 },
      { at: RUMBLE, position: [-0.3, 1.2, 2.0], target: [0.05, 0.64, -0.95], fov: 40 },
      { at: 179, position: [0.05, 1.08, 1.7], target: [0.2, 0.66, -1.05], fov: 40 },
    ],
    f,
  ));
  const hop = ease(f, RUMBLE, RUMBLE + 8) * (1 - ease(f, 172, 180) * 0.5);
  const ripple = ease(f, RUMBLE - 6, RUMBLE + 6);
  // one berry hops out of the bowl in an arc and drops into the cup
  const bt = ramp(f, CANNONS - 18, CANNONS);
  const bowl: Vec3 = [TABLE[0] - 0.12, TOP + 0.16, TABLE[2] + 0.05];
  const cup: Vec3 = [TABLE[0] + 0.42, TOP + 0.08, TABLE[2] - 0.05];
  const berry: Vec3 | null = f < CANNONS - 18 ? null : f < CANNONS ? [mix(bowl[0], cup[0], bt), mix(bowl[1], cup[1], bt) + Math.sin(bt * Math.PI) * 0.22, mix(bowl[2], cup[2], bt)] : null;
  const look = f > RUMBLE + 8 ? 1 : 0;
  return (
    <HStage
      set={
        <Breakfast camera={camera} frame={f} warm={false} hop={hop} ripple={ripple} plateBerry={berry}>
          <GodRays center={[WIN[0], WIN[1], ROOM_BACK + 0.02]} size={[0.9, 1.4]} panes={[2, 3]} sun={[-0.55, -0.6, 0.6]} strength={0.05} patch={0.25} frame={f} tops={[{ y: TOP + 0.002, x: [TABLE[0] - 0.75, TABLE[0] + 0.75], z: [TABLE[2] - 0.45, TABLE[2] + 0.45] }]} />
          <Burst kind="dust" at={[cup[0], TOP + 0.08, cup[2]]} frame={f - CANNONS} count={9} size={0.12} seed={8} colors={["#6a3a1a", "#8a5a2a"]} floor={null} />
        </Breakfast>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.8}
      puppets={[
        P("grouchy", GROUCHY, GROUCHY_SEAT, {
          sit: true,
          ...faceChange([[0, "happy"], [70, "smug"], [RUMBLE + 4, "confused"], [CANNONS + 2, "shocked"]], f),
          ...(f < RUMBLE
            ? { reachR: [mix(150, 70, ease(f, 40, 60) - ease(f, 80, 96)), mix(-470, -760, ease(f, 40, 60) - ease(f, 80, 96))], handR: "fist", reachL: [-150, -470], handL: "open" }
            : { reachR: [140, -480], handR: "fist", reachL: [-110, -620], handL: "open" }),
          lookX: look ? 0.9 : 0.2,
          headTilt: look ? 8 : 3,
        }),
      ]}
      light={{ tint: "#fff4e0", shadow: 0.18, distant: [{ direction: [0.6, 0.6, -0.5], color: "#fff0c8", strength: 1.1 }] }}
      foreground={<InkBox size={[0.06, 0.5, 0.06]} position={frameSpot({ position: [-0.9, 1.65, 3.2], target: [0.0, 0.7, -0.9], fov: 40 }, ASPECT, -0.92, -0.85, 1.0)} color="#6a3a22" ink={0.006} />}
    />
  );
};

// ---------- 6. The garden (741-878): Gérard runs in, points at the smoke over the western horizon; Grouchy holds
// up his orders ----------

const S6: React.FC = () => {
  const f = useShotFrame(); // 0..137
  const fr = f + 741;
  const ORDERS = 56;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.05, 1.3, 5.1], target: [-0.1, 1.05, -2], fov: 40 },
      { at: 38, position: [0.03, 1.22, 4.8], target: [-0.08, 1.0, -2], fov: 40 },
      { at: 136, position: [0.0, 1.18, 4.85], target: [-0.05, 1.0, -1.5], fov: 40 },
    ],
    f,
  ));
  const run = stroll(f, -10, 30, [-0.6, -2.6], [-0.45, 0.25]);
  const gro: [number, number] = [0.42, -0.1];
  return (
    <>
      <HStage
        set={
          <FieldSet camera={camera} frame={fr} mode="garden" terrain="plain" farms={false}>
            <GardenWall a={[-6, -3.4]} b={[-1.2, -3.4]} h={0.8} />
            <GardenWall a={[-0.1, -3.4]} b={[6, -3.4]} h={0.8} />
            <PearTree position={[1.9, 0, -2.4]} />
            <InkBox size={[0.9, 0.04, 0.7]} position={[1.25, 0.62, -1.0]} color="#e8e4dc" ink={0.008} />
            <InkBox size={[0.06, 0.6, 0.06]} position={[1.25, 0.3, -1.0]} color="#3a3a3a" ink={0.006} />
            <StrawberryBowl position={[1.15, 0.64, -0.95]} size={1.3} />
            <Chair position={[1.25, 0, -1.6]} color="#3a5a3a" />
            {/* smoke rising over the western horizon */}
            <SmokeBank from={[-9, 2, -62]} to={[-2, 2, -64]} frame={fr} puffs={16} size={3.6} wind={[0.03, 0.03, 0]} color="#8a8a90" shade="#5a5a66" seed={3} opacity={0.85} />
            <Village position={[-40, 0, -95]} scale={2.2} />
            <Farm position={[9, 0, -26]} rotationY={-0.3} />
          </FieldSet>
        }
        camera={camera}
        bg={fieldBg("garden")}
        keepHeads={false}
        blur={1.4}
        puppets={[
          P("gerard", GERARD, run.at, {
            ...(f < 20 ? run.pose : {}),
            ...faceChange([[0, "worried"], [2, "determined"], [30, "angry"], [ORDERS + 30, "shocked"]], f),
            ...(f > 22 && f < ORDERS + 10 ? { reachL: [-320, -760] as [number, number], handL: "point" as const, reachR: [140, -520] as [number, number], handR: "fist" as const } : {}),
            lookX: f > 14 && f < 40 ? 0.7 : 0.6,
          }),
          P("grouchy", GROUCHY, gro, {
            ...faceChange([[0, "happy"], [10, "confused"], [ORDERS - 6, "skeptical"], [ORDERS + 40, "smug"]], f),
            ...(f > ORDERS - 4 ? { reachR: [150, -780] as [number, number], handR: "open" as const } : {}),
            reachL: [-120, -560],
            handL: "fist",
            lookX: -0.8,
          }),
        ]}
        light={fieldLight("garden")}
        foreground={<Foliage position={frameSpot({ position: [0.05, 1.3, 5.1], target: [-0.1, 1.05, -2], fov: 40 }, ASPECT, 0.98, 0.9, 1.4)} size={0.4} color="#4a7a34" seed={8} />}
      />
      {f > ORDERS - 2 && <OrdersOverlay f={f - ORDERS + 2} />}
    </>
  );
};
// Grouchy's orders, held up: drawn in the world would fight his hand, so they float as a paper card by his hand.
const OrdersOverlay: React.FC<{ f: number }> = ({ f }) => <Headline f={f} text="ORDERS: FOLLOW THE PRUSSIANS" at={0} out={80} y={330} size={64} />;

// ---------- 7. Wavre (878-997): over Grouchy's attack column onto the bridge, where a small rear guard fires from a
// barricade; crane up to see the Prussian columns on the hills beyond, slipping away west toward Waterloo ----------

const S7: React.FC = () => {
  const f = useShotFrame(); // 0..119
  const fr = f + 878;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.0, 2.6, 1.6], target: [0.0, -0.4, -12.5], fov: 40 },
      { at: 44, position: [0.0, 3.4, 1.8], target: [0.0, -0.2, -13.5], fov: 40 },
      { at: 118, position: [-0.2, 6.6, 3.2], target: [-0.6, 2.4, -38], fov: 40 },
    ],
    f,
  ));
  const shots = [8, 22, 31, 47, 60, 74, 90];
  return (
    <HStage
      set={
        <FieldSet camera={camera} frame={fr} mode="smoke" terrain="river" farms={false}>
          {/* the Dyle: a slate-green ribbon in its bed, the stone bridge over it */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.95, -11]}>
            <planeGeometry args={[120, 4.2]} />
            <meshToonMaterial color="#4e7470" />
          </mesh>
          <Bridge position={[0, 0, -11]} length={6} />
          <Barricade position={[0, 0, -13.6]} width={1.8} />
          {/* the town on the far bank either side of the street, leaving the view up the road open */}
          {[-6.4, -4.2, 4.2, 6.4].map((x, i) => (
            <TownHouse key={i} position={[x, groundY(x, -16.5, "river"), -16.5 - (i % 2) * 0.6]} w={2.1} color={["#d8ccb4", "#c8b89a", "#e0d4bc", "#cfc2a6"][i]} roof="#4a4e5e" />
          ))}
          <Troops army="prussian" count={10} terrain="river" place={(i) => ({ x: -0.8 + (i % 5) * 0.4, z: -14.3 - Math.floor(i / 5) * 0.5, yaw: 0, stride: 0, swing: 0 })} />
          {shots.map((s, i) => (
            <MuzzleFlash key={i} position={[-0.8 + (i % 5) * 0.4, 1.0, -13.8]} t={f - s} size={1.0} />
          ))}
          <SmokeBank from={[-1.6, 0.8, -13.4]} to={[1.6, 0.8, -13.4]} frame={fr} puffs={12} size={0.7} wind={[0.008, 0.006, 0.004]} seed={4} opacity={0.6} />
          {/* Grouchy's attack column on the near bank, marching onto the bridge */}
          <Troops army="french" count={16} terrain="river" place={blockPlace([0.0, -6.2], 4, 4, Math.PI, f, { speed: 0.008, seed: 2 })} />
          <Flag kind="france" position={[0.85, 0, -5.4 - f * 0.008]} frame={fr} seed={0.4} />
          {/* far off, the Prussian columns marching west over the hills */}
          {[0, 1, 2].map((k) => (
            <React.Fragment key={k}>
              <Troops army="prussian" count={40} terrain="river" place={blockPlace([3.5 - k * 4.2, -36 - k * 1.5], 4, 10, -Math.PI / 2 - 0.15, f, { speed: 0.012, seed: k * 13 })} />
              <Flag kind="prussia" position={[3.5 - k * 4.2 - 2.9 - f * 0.012, groundY(3.5 - k * 4.2 - 2.9, -36 - k * 1.5, "river"), -36 - k * 1.5]} frame={fr} size={1.1} pole={3.1} seed={k + 0.5} />
            </React.Fragment>
          ))}
          <SmokeBank from={[-40, 5, -90]} to={[-22, 5, -92]} frame={fr} puffs={12} size={6} wind={[0.03, 0.03, 0]} color="#9a968c" shade="#6a665e" seed={9} opacity={0.8} />
        </FieldSet>
      }
      camera={camera}
      bg={fieldBg("smoke")}
      keepHeads={false}
      blur={1.2}
      light={fieldLight("smoke")}
      foreground={<InkCylinder radius={0.03} height={1.2} position={frameSpot({ position: [0.0, 2.6, 1.6], target: [0.0, -0.4, -12.5], fov: 40 }, ASPECT, -0.92, -0.3, 1.3)} rotation={[0.2, 0, 0.1]} color="#5a4030" ink={0.006} />}
    />
  );
};

// ---------- 8. "Forward! Faster!" (997-1110): Blücher rears on his black charger in the late-afternoon light while
// the Prussian columns pour over the crest behind him; crane up as they crash into the French flank at Plancenoit ----------

const BLU_AT: [number, number] = [0.4, 1.0];
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..113
  const fr = f + 997;
  const CRASH = 75;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.2, 1.1, 7.2], target: [0.0, 1.5, -10], fov: 40 },
      { at: 27, position: [0.15, 1.4, 7.35], target: [-0.05, 1.55, -10], fov: 40 },
      { at: CRASH, position: [0.05, 2.3, 7.8], target: [-0.4, 1.3, -14], fov: 40 },
      { at: 112, position: [0.0, 2.6, 8.0], target: [-0.55, 1.2, -14], fov: 40 },
    ],
    f,
  ));
  const rear = Math.max(0, Math.sin(Math.min(1, f / 30) * Math.PI)) * 0.9;
  const blu = mounted("blucher", BLUCHER, "black", BLU_AT[0], BLU_AT[1], -1, {
    ...faceChange([[0, "angry"], [30, "determined"]], f),
    reachR: [-150, -1060],
    handR: "fist",
    lookX: -0.4,
  }, { rear, phase: f * 0.2, nod: -8 });
  const col = (k: number) => (i: number): SoldierState => {
    const per = 5;
    const r = Math.floor(i / per);
    const c = i % per;
    const t = f * 0.028;
    const z = -20.5 + r * 0.62 + t + (rand(i + k) - 0.5) * 0.1;
    const x = -2.2 + k * 3.3 + (c - 2) * 0.5 - (z + 20.5) * 0.35 + (rand(i + 7 + k) - 0.5) * 0.1;
    return { x, z, yaw: -0.33, stride: t * 7 + r * 0.4, swing: 1.2 };
  };
  return (
    <HStage
      set={
        <FieldSet camera={camera} frame={fr} mode="golden" terrain="slope">
          {[0, 1, 2].map((k) => (
            <React.Fragment key={k}>
              <Troops army="prussian" count={60} terrain="slope" place={col(k)} />
              <Flag kind="prussia" position={[col(k)(57).x + 0.4, groundY(col(k)(57).x + 0.4, col(k)(57).z, "slope"), col(k)(57).z]} frame={fr} seed={k + 0.2} />
            </React.Fragment>
          ))}
          {/* the French flank and the burning village of Plancenoit */}
          <Troops army="french" count={30} terrain="slope" place={blockPlace([-5.2, -12.5], 3, 10, Math.PI / 2 - 0.2, f, { seed: 21 })} />
          {[0, 1, 2, 3].map((k) => (
            <MuzzleFlash key={k} position={[-4.4 + k * 0.5, 0.9 + groundY(-4.4, -12, "slope"), -11.6 + k * 0.4]} t={f - CRASH - k * 5} size={1.2} />
          ))}
          <SmokeBank from={[-6, 0.7 + groundY(-5, -12, "slope"), -13]} to={[-3, 0.7 + groundY(-3, -11, "slope"), -11]} frame={fr} puffs={12} size={1.0} wind={[0.008, 0.006, 0]} seed={5} color="#f0e0c8" shade="#c8a888" />
          <Village position={[-8, groundY(-8, -30, "slope"), -30]} scale={1.3} roof="#9a3a28" />
          <SmokeBank from={[-10, 3 + groundY(-10, -30, "slope"), -30]} to={[-6, 3 + groundY(-6, -30, "slope"), -31]} frame={fr} puffs={10} size={2.6} wind={[0.01, 0.03, 0]} color="#6a5a50" shade="#4a3e3a" seed={11} />
          {blu.horse}
        </FieldSet>
      }
      camera={camera}
      bg={fieldBg("golden")}
        keepHeads={false}
      blur={1.3}
      puppets={[blu.rider]}
      light={fieldLight("golden")}
      foreground={<Rye area={[1.5, 3.4, 2.4, 3.9]} count={30} frame={fr} terrain="slope" color="#d8a850" height={0.9} seed={5} />}
    />
  );
};

// ---------- 9. The Guard (1110-1250): Wellington watches from the ridge as the Imperial Guard climbs into the smoke,
// the volley, it breaks and runs; push in on him at dusk ----------

const WELL_AT: [number, number] = [0.98, 2.0];
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..140
  const fr = f + 1110;
  const BREAKS = 14;
  const RUNS = 41;
  const WELL = 77;
  const camera = aim(beatPath(
    [
      { at: 0, position: [1.85, 2.5, 7.0], target: [-0.8, -1.7, -19], fov: 40 },
      { at: BREAKS + 10, position: [1.73, 2.42, 6.8], target: [-0.95, -1.75, -19], fov: 40 },
      { at: RUNS + 14, position: [1.7, 2.35, 6.6], target: [-0.9, -1.6, -19], fov: 40 },
      { at: WELL + 14, position: [1.8, 2.2, 6.4], target: [-0.2, -0.8, -15], fov: 40 },
      { at: 139, position: [1.8, 2.15, 6.3], target: [-0.2, -0.8, -15], fov: 40 },
    ],
    f,
  ));
  const turn = ease(f, RUNS - 6, RUNS + 6);
  const guard = (k: number) => (i: number): SoldierState => {
    const b = blockPlace([-1.9 + k * 3.0, -15], 5, 6, 0, f, { seed: k * 7 })(i);
    const adv = Math.min(f, RUNS) * 0.028;
    const back = Math.max(0, f - RUNS) * 0.06 * (0.8 + rand(i) * 0.5);
    const yaw = mix(0, Math.PI + (rand(i + 3) - 0.5) * 0.8, turn);
    return { x: b.x + (rand(i + 9) - 0.5) * back * 0.5, z: b.z + adv - back, yaw, stride: f < RUNS ? f * 0.2 : f * 0.45 + rand(i) * 3, swing: f < RUNS ? 1 : 1.4, lean: f > RUNS ? 0.15 : 0 };
  };
  const well = mounted("wellington", WELLINGTON, "chestnut", WELL_AT[0], WELL_AT[1], 1, {
    ...faceChange([[0, "worried"], [BREAKS + 4, "shocked"], [WELL + 10, "happy"]], f),
    ...(f > WELL + 8 ? { reachR: [-60, -1120] as [number, number], handR: "open" as const } : {}),
    lookX: 0.5,
  }, { nod: 4 + Math.sin(f * 0.07) * 4 });
  return (
    <>
      <HStage
        set={
          <FieldSet camera={camera} frame={fr} mode="dusk" terrain="valley">
            {[0, 1].map((k) => (
              <React.Fragment key={k}>
                <Troops army="guard" count={30} place={guard(k)} />
                {f < RUNS + 8 && <Flag kind="france" position={[guard(k)(2).x + 0.3, groundY(guard(k)(2).x, guard(k)(2).z), guard(k)(2).z + 0.4]} frame={fr} seed={k + 0.6} />}
              </React.Fragment>
            ))}
            {/* the volley from the British line, below on the forward slope */}
            {Array.from({ length: 8 }, (_, i) => (
              <MuzzleFlash key={i} position={[-2.3 + i * 0.5, 1.0, -6.7 - (i % 2) * 0.7]} t={f - BREAKS - (i % 3)} size={1.4} />
            ))}
            <SmokeBank from={[-2.6, 0.2, -6.4]} to={[1.4, 0.2, -6.8]} frame={fr} puffs={10} size={0.42} wind={[0.01, 0.001, 0.0]} seed={6} color="#f4d8c0" shade="#c89a88" opacity={Math.min(0.45, 0.1 + ease(f, BREAKS, BREAKS + 14))} />
            <SmokeBank from={[-6, 1.2 + groundY(0, -26), -26]} to={[5, 1.2 + groundY(0, -26), -26.5]} frame={fr} puffs={10} size={1.4} wind={[0.012, 0.004, 0]} seed={13} color="#f0d4c0" shade="#c89a88" opacity={0.4} />
            {well.horse}
          </FieldSet>
        }
        camera={camera}
        bg={fieldBg("dusk")}
        keepHeads={false}
        blur={1.3}
        puppets={[well.rider]}
        light={fieldLight("dusk")}
      />
      <Headline f={f} text="THE NEAREST RUN THING" at={WELL + 16} out={150} size={74} />
    </>
  );
};

// ---------- 10. What if? (1250-1368): the sand table; a historian turns Grouchy's block around toward Waterloo;
// the hourglass runs out ----------

const S10: React.FC = () => {
  const f = useShotFrame(); // 0..118
  const TURN = 32;
  const LATE = 91;
  const TT = 0.72;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.05, 2.05, 2.75], target: [0.0, 0.72, -0.55], fov: 40 },
      { at: TURN, position: [0.0, 1.95, 2.55], target: [0.0, 0.74, -0.55], fov: 40 },
      { at: 117, position: [-0.05, 1.75, 2.3], target: [-0.03, 0.78, -0.55], fov: 40 },
    ],
    f,
  ));
  const slide = ease(f, TURN - 6, LATE);
  const spin = ease(f, 10, TURN);
  const gx = mix(0.2, -0.12, slide);
  const gz = -0.42 + Math.sin(slide * Math.PI) * 0.05;
  return (
    <HStage
      set={
        <Room camera={camera} mood="dream" floor="#3a2a4a" wall="#5a3a7a" wallPattern="panel" floorPattern="wood" width={5} depth={4} stripe="#3a2050">
          <SandTable position={[0, 0, -0.55]} top={TT} w={1.3} d={0.9} />
          <Block position={[-0.36, TT, -0.62]} text="WATERLOO" color="#8a2a2a" size={[0.2, 0.08, 0.1]} textW={0.3} />
          <Block position={[0.36, TT, -0.72]} text="WAVRE" color="#6a6a6a" size={[0.18, 0.08, 0.1]} textW={0.22} />
          <Block position={[gx, TT, gz]} rotationY={spin * Math.PI} text="GROUCHY" color="#2a3f8a" size={[0.2, 0.08, 0.1]} textW={0.28} />
          <Block position={[-0.12, TT, -0.86]} text="PRUSSIANS" color="#1e2440" size={[0.2, 0.08, 0.1]} textW={0.3} />
          <Hourglass position={[0.52, TT, -0.18]} run={ease(f, 20, LATE)} size={0.5} />
          <Label text="TOO LATE?" position={[-0.22, TT + 0.36, -0.5]} width={0.36} appear={f - LATE - 2} bg="#f8d8d0" />
          <InkCylinder radius={0.03} height={0.2} position={[-0.58, TT + 0.1, -0.88]} color="#f4ecd8" ink={0.005} />
          <pointLight position={[-0.58, TT + 0.35, -0.88]} intensity={1.4} distance={3} color="#ffb060" />
          <InkBox size={[1.6, 1.0, 0.05]} position={[0, 1.75, -1.97]} color="#4a3060" ink={0.01} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dream")}
      blur={1.6}
      puppets={[
        P("historian", HISTORIAN, [0.15, -1.25], {
          ...faceChange([[0, "thinking"], [TURN, "smug"], [LATE, "worried"]], f),
          reachR: f < LATE ? [mix(150, 0, slide), mix(-560, -500, slide)] : [120, -560],
          handR: "point",
          reachL: [-140, -560],
          handL: "open",
          lookX: -0.4,
          headTilt: -6,
        }),
      ]}
      light={{ tint: "#e8d8ff", shadow: 0.22, points: [{ position: [-0.58, TT + 0.35, -0.88], color: "#ffb060", strength: 1.6, range: 2.6 }], distant: [{ direction: [0.6, 0.5, 0.4], color: "#c8a8ff", strength: 0.7 }] }}
      foreground={<InkCylinder radius={0.04} height={0.9} position={frameSpot({ position: [0.05, 2.05, 2.75], target: [0.0, 0.72, -0.55], fov: 40 }, ASPECT, 0.95, -0.8, 1.1)} color="#5a3420" ink={0.008} />}
    />
  );
};

// ---------- 11. Even winning (1368-1587): Napoleon cheers on his grey at the frosty frontier; behind the FRANCE
// post white Austrian and green Russian columns march toward it ----------

const NAP11: [number, number] = [0.6, 2.0];
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..219
  const fr = f + 1368;
  const ARMIES = 74;
  const LOST = 182;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.75, 1.9, 9.2], target: [0.1, 1.2, -12], fov: 40 },
      { at: ARMIES, position: [0.65, 1.95, 9.0], target: [-0.2, 1.2, -12], fov: 40 },
      { at: 144, position: [0.55, 1.95, 8.8], target: [-0.35, 1.2, -12], fov: 40 },
      { at: 218, position: [0.5, 1.9, 8.6], target: [-0.35, 1.2, -12], fov: 40 },
    ],
    f,
  ));
  const nap = mounted("napoleon", NAPOLEON, "grey", NAP11[0], NAP11[1], -1, {
    ...faceChange([[0, "excited"], [ARMIES + 8, "shocked"], [LOST - 30, "worried"], [LOST, "sad"]], f),
    ...(f < ARMIES ? { reachR: [-80, -1100] as [number, number], handR: "fist" as const } : f < LOST - 10 ? { reachR: [-230, -760] as [number, number], handR: "open" as const } : { reachR: [60, -600] as [number, number], handR: "open" as const }),
    lookX: f < ARMIES ? 0.4 : -0.7,
  }, { nod: 3 + Math.sin(f * 0.05) * 3 });
  const march = (at: [number, number], yaw: number, seed: number) => blockPlace(at, 5, 8, yaw, f, { speed: 0.012, seed });
  const A = [march([-2.4, -11], 0.15, 1), march([-3.2, -16.5], 0.15, 2)];
  const R = [march([1.9, -13], -0.15, 9), march([2.7, -18.5], -0.15, 10)];
  return (
    <HStage
      set={
        <FieldSet camera={camera} frame={fr} mode="frost" terrain="plain">
          {A.map((p, k) => (
            <Troops key={`a${k}`} army="austrian" count={40} terrain="plain" place={p} />
          ))}
          {R.map((p, k) => (
            <Troops key={`r${k}`} army="russian" count={40} terrain="plain" place={p} />
          ))}
          <Flag kind="austria" position={[A[0](37).x, 0, A[0](37).z + 0.3]} frame={fr} size={1.02} pole={2.82} />
          <Flag kind="russia" position={[R[0](37).x, 0, R[0](37).z + 0.3]} frame={fr} size={1.02} pole={2.82} seed={4.1} />
          <Label text="AUSTRIA" position={[-2.4, 2.9, -9.4]} width={1.2} appear={f - ARMIES + 4} bg="#f6efd8" />
          <Label text="RUSSIA" position={[1.9, 2.9, -11.4]} width={1.2} appear={f - ARMIES - 8} bg="#f6efd8" />
          <BorderPost position={[-0.7, 0, -2.6]} text="FRANCE" appear={f - 120} />
          {nap.horse}
        </FieldSet>
      }
      camera={camera}
      bg={fieldBg("frost")}
        keepHeads={false}
      blur={1.3}
      puppets={[nap.rider]}
      light={fieldLight("frost")}
      foreground={<Foliage position={frameSpot({ position: [0.75, 1.9, 9.2], target: [0.1, 1.2, -12], fov: 40 }, ASPECT, -0.98, -0.95, 1.5)} size={0.3} color="#8a9a7a" seed={12} />}
    />
  );
};

// ---------- 12. Waterloo (1587-1756): one strawberry on the wall at sunset; crane up to the village sign ----------

const S12: React.FC = () => {
  const f = useShotFrame(); // 0..169
  const fr = f + 1587;
  const SIGN = 110;
  const camera = aim(beatPath(
    [
      { at: 0, position: [0.35, 0.78, 2.6], target: [0.05, 0.66, 1.2], fov: 38 },
      { at: 21, position: [0.42, 0.85, 2.5], target: [0.1, 0.68, 1.1], fov: 38 },
      { at: SIGN, position: [0.75, 1.55, 4.4], target: [0.6, 1.25, -4], fov: 40 },
      { at: 168, position: [0.8, 1.7, 4.9], target: [0.55, 1.4, -6], fov: 40 },
    ],
    f,
  ));
  return (
    <>
      <HStage
        set={
          <FieldSet camera={camera} frame={fr} mode="sunset" terrain="plain" farms={false}>
            <StoneWall position={[0.2, 0, 1.0]} length={2.4} h={0.55} />
            <Strawberry position={[0.05, 0.65, 1.12]} rotation={[0.2, 0.6, 0.25]} size={1.6} />
            <VillageSign position={[0.6, 0, -3.2]} text="WATERLOO" width={1.3} appear={f - 96} />
            <Chapel position={[-1.6, 0, -14]} scale={1.2} />
            <Cottage position={[2.8, 0, -9]} rotationY={-0.3} lit={1} />
            <Cottage position={[-4.6, 0, -8.5]} rotationY={0.4} lit={1} />
            <Cottage position={[4.4, 0, -15]} rotationY={-0.2} lit={1} />
          </FieldSet>
        }
        camera={camera}
        bg={fieldBg("sunset")}
        blur={1.6}
        light={fieldLight("sunset")}
        focus={f < 60 ? 1.4 : 7.5}
        foreground={<Foliage position={[-0.45, 0.55, 1.95]} size={0.45} color="#6a7a3a" seed={2} />}
      />
      <Headline f={f} text="MEET YOUR WATERLOO" at={SIGN} out={180} />
    </>
  );
};

// [from, to, shot, transition in]
const SHOTS: Shot[] = [
  [0, 81, S1, false],
  [81, 320, S2, "dip"],
  [320, 457, S3, "dip"],
  [457, 561, S4, "dip"],
  [561, 741, S5, "dip"],
  [741, 878, S6, "dip"],
  [878, 997, S7, "dip"],
  [997, 1110, S8, "dip"],
  [1110, 1250, S9, "dip"],
  [1250, 1368, S10, "dip"],
  [1368, 1587, S11, "dip"],
  [1587, TIMING.totalFrames, S12, "dip"],
];

// ---------- sound ----------

// Musket shots: the three recorded gunshot takes in turn (never one file twice in a row), each at its own level.
const SHOTS3 = ["gunshot", "gunshot-2", "gunshot-echo"];
const muskets = (frames: number[], vols: number[], space: "outdoor" | "far"): Sfx[] =>
  frames.flatMap((at, i) => foleyCues(SHOTS3[i % 3], [at], vols[i], { space }));

const SFX: Sfx[] = [
  // 1. the breakfast room: guns far off, a fork on the plate
  { at: 22, src: sfx("boom"), volume: 0.6, space: "far" },
  { at: 52, src: sfx("boom"), volume: 0.37, space: "far" },
  ...foleyCues("fork-plate", [46], 1.4, { space: "room" }),
  // 2. the field: wind, the gun fires, guns far off
  { at: 81, src: sfx("wind"), volume: 0.03, until: 320 },
  ...BATTERY.map((b) => ({ at: 81 + b.shot, src: sfx("boom"), volume: 0.34, space: "outdoor" as const })),
  { at: 81 + 150, src: sfx("boom"), volume: 0.46, space: "far" },
  // 3. the column marches off, a horse stamps
  { at: 320, src: sfx("steps"), volume: 0.045, until: 457 },
  { at: 320, src: sfx("wind"), volume: 0.025, until: 457 },
  // 4. rain all night: the downpour, thunder on the flashes, the fire, the gunner's splash
  { at: 457, src: sfx("river"), volume: 0.035, until: 561 },
  { at: 457, src: sfx("crackle"), volume: 0.025, until: 561 },
  { at: 463, src: sfx("rumble"), volume: 0.52 },
  { at: 457 + 76, src: sfx("splash"), volume: 0.36, space: "outdoor" },
  // 5. breakfast: forks, the rumble, the guns, the plop into the coffee
    { at: 561 + 118, src: sfx("rumble"), volume: 0.3 },
  { at: 561 + 150, src: sfx("boom"), volume: 0.11, space: "far" },
  { at: 561 + 161, src: sfx("plop"), volume: 0.45, space: "room" },
  // 6. the garden: guns from the west
  { at: 741, src: sfx("wind"), volume: 0.025, until: 878 },
  { at: 741 + 24, src: sfx("boom"), volume: 0.75, space: "far" },
  { at: 741 + 96, src: sfx("boom"), volume: 0.45, space: "far" },
  // 7. Wavre: the rear guard's shots
  { at: 878, src: sfx("wind"), volume: 0.03, until: 997 },
  { at: 878, src: sfx("steps"), volume: 0.035, until: 997 },
  ...muskets([886, 900, 909, 925, 938, 952, 968], [0.8, 0.4, 0.5, 0.72, 0.45, 0.75, 0.65], "outdoor"),
  // 8. Blücher's charge: hooves, the crash
  { at: 997, src: sfx("hooves"), volume: 0.07, until: 1110 },
  { at: 997 + 75, src: sfx("boom"), volume: 0.3, space: "outdoor" },
  ...muskets([997 + 76, 997 + 81, 997 + 86], [0.3, 0.26, 0.4], "far"),
  // 9. the volley, the rout
  { at: 1110, src: sfx("wind"), volume: 0.03, until: 1250 },
  ...muskets([1110 + 14, 1110 + 15, 1110 + 16], [0.4, 0.35, 0.38], "outdoor"),
  { at: 1110 + 15, src: sfx("boom"), volume: 0.32, space: "outdoor" },
  { at: 1110 + 41, src: sfx("steps"), volume: 0.06, until: 1110 + 77 },
  // 10. the sand table: the block slides, the hourglass, the label pops
  { at: 1250 + 30, src: sfx("scrape"), volume: 0.42, space: "room" },
  { at: 1250 + 93, src: sfx("pop"), volume: 0.6, space: "room" },
  // 11. the frontier: marching, the labels
  { at: 1368, src: sfx("steps"), volume: 0.05, until: 1587 },
  { at: 1368 + 70, src: sfx("pop"), volume: 0.13, space: "outdoor" },
  { at: 1368 + 82, src: sfx("pop"), volume: 0.12, space: "outdoor" },
  { at: 1368 + 120, src: sfx("pop"), volume: 0.13, space: "outdoor" },
  // 12. the village at sunset, the sign
  { at: 1587, src: sfx("wind"), volume: 0.025, until: 1748 },
  { at: 1587 + 96, src: sfx("pop"), volume: 0.13, space: "outdoor" },
];

const MUSIC: MusicCue[] = [
  { src: "music/tension.wav", from: 0, to: 457, volume: 0.2 },
  { src: "music/mystery.wav", from: 457, to: 878, volume: 0.22 },
  { src: "music/tension.wav", from: 878, to: 1250, volume: 0.22 },
  { src: "music/mystery.wav", from: 1250, to: 1587, volume: 0.2 },
  { src: "music/lounge.wav", from: 1587, to: TIMING.totalFrames, volume: 0.2 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
