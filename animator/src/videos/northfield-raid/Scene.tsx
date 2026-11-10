import React from "react";
import {
  Burst,
  CameraShot,
  Counter,
  Crates,
  Door,
  foleyCues,
  frameSpot,
  handWorld,
  HEAD_Y,
  HIP_HEIGHT,
  InkBox,
  InkCylinder,
  jump,
  Label,
  Lamp,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  SmokePlume,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Video,
  Window,
  beatPath,
  moodBackground,
  GodRays,
  Headline,
} from "../../engine";
import * as THREE from "three";
import { TOWN_BG, townLight, WesternTownSet } from "../../three/WesternTownSet";
import { Horse } from "../niagara-silent/props";
import { BalanceWheel, BarredWindow, Blueprint, CoinPouch, Gear, Grille, HangingLamp, Newspaper, Portrait, RackRifle, Revolver, Safe, TimeLockCutaway, Vault, VAULT } from "./props";
import { HangingShirt, Rifle } from "../black-bart/props";
import { FlyingHat } from "../niagara-silent/props";
import TIMING_JSON from "./timing.json";

// "The Day a Bank Teller's Bluff Beat the James Gang": Northfield, Minnesota, 7 September 1876. Acting cashier Joseph
// Heywood told the outlaws the safe was on a time lock; its clock had never been set and the safe was unlocked, but
// they believed him and never tried the handle while the town armed itself outside. They fled with $26.70.
// Sets: WesternTownSet in its new `day` mode (a Minnesota backdrop by Codex) and Room interiors (the lobby with the
// walk-in vault, the vault room, the back door, the hardware store, the time-lock cutaway).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "northfield-raid";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const UNITS = 1060 / 1.3;
const ASPECT = 9 / 16;
const yawFromTo = (a: [number, number], b: [number, number]) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]);

// ---------- cast ----------

const HEYWOOD: PuppetLook = { skin: "#e8c0a0", hair: "#3a2a1a", outfit: "#2a2a34", vest: "#6a5a4a", beard: "#3a2a1a" };
const OUTLAW: PuppetLook = { skin: "#d8a47a", hair: "#4a3020", outfit: "#8a7a5a", vest: "#4a3a2a", hat: "#3a2a1a", beard: "#4a3020", kerchief: "#8a1e1e" };
const OUTLAW2: PuppetLook = { skin: "#e0b48a", hair: "#2a1a10", outfit: "#6a5a44", hat: "#2a2018", kerchief: "#2a3a6a" };
const OUTLAW3: PuppetLook = { skin: "#d8a47a", hair: "#6a4a2a", outfit: "#7a6a50", hat: "#4a3a2a", beard: "#6a4a2a" };
const BUNKER: PuppetLook = { skin: "#f0c8a0", hair: "#c08040", outfit: "#f4f0e6", vest: "#4a4a5a" };
const MANNING: PuppetLook = { skin: "#e8c0a0", hair: "#6a6a6a", outfit: "#d8c8a8", apron: "#6a4a2a", beard: "#7a7a7a" };
const TOWNSMAN: PuppetLook = { skin: "#d8a47a", hair: "#3a2414", outfit: "#5a7a9a", suspenders: "#3a2a1a", hat: "#8a6a4a" };
const LADY: PuppetLook = { skin: "#f0c8a0", hair: "#6a3a1a", outfit: "#7a3a5a", skirt: true, long: true, hat: "#e8d8b8" };
const LOAFER: PuppetLook = { skin: "#d8a47a", hair: "#4a4a4a", outfit: "#a08a6a", vest: "#4a3a2a", hat: "#6a5a3a", beard: "#6a6a6a" };
const WILCOX: PuppetLook = { skin: "#f0c8a0", hair: "#3a2a1a", outfit: "#6a6a70", vest: "#4a4a52", glasses: true };

// ---------- the bank lobby (shots 3, 4 and 11) ----------

const VX = -0.3; // the vault doorway's centre
const VZ = -2.2; // the vault wall's centre plane
const SAFE_TOP = 1.25 + 0.12;
const SAFE_AT: [number, number, number] = [-0.2, 0, -1.1]; // inside the vault, from its back room origin
const SAFE_WORLD: [number, number] = [VX - 0.2, VZ - VAULT.wall / 2 - 1.1];
const STOOL: [number, number] = [0.3, -0.5];
const STOOL_TOP = 0.72;

const Lobby: React.FC<{
  camera: CameraShot;
  mood: "daylight" | "dusk";
  vaultOpen: number;
  safeOpen?: number;
  safeHandle?: number;
  safeGlow?: number;
  frame?: number;
  children?: React.ReactNode;
}> = ({ camera, mood, vaultOpen, safeOpen = 0, safeHandle = 0, safeGlow = 0, frame = 0, children }) => (
  <Room camera={camera} mood={mood} floor="#6a4a30" wall="#e8dcc0" wallPattern="panel" floorPattern="wood" width={7} depth={9}>
    <Vault position={[VX, 0, VZ]} open={vaultOpen} wallColor={mood === "dusk" ? "#c8b49a" : "#e4d6b8"}>
      <Safe position={SAFE_AT} open={safeOpen} handle={safeHandle} glow={safeGlow} />
      <Lamp position={[0.55, 0, -1.4]} on={mood === "dusk"} />
    </Vault>
    <Window position={[2.0, 1.55, VZ + VAULT.wall / 2 + 0.03]} size={[0.9, 1.2]} sky={mood === "dusk" ? "#e8906a" : "#cfe4f4"} />
    <GodRays
      center={[2.0, 1.55, VZ + VAULT.wall / 2 + 0.07]}
      size={[0.8, 1.1]}
      panes={[2, 3]}
      bar={0.06}
      sun={mood === "dusk" ? [-0.95, -0.3, 0.18] : [-0.85, -0.5, 0.2]}
      color={mood === "dusk" ? "#ff9a50" : "#fff0c8"}
      strength={mood === "dusk" ? 0.05 : 0.05}
      patch={0.3}
      frame={frame}
    />
    {/* wainscot either side of the vault door, a chair rail on top */}
    {[[-2.46, 2.68], [1.86, 2.68]].map(([x, w]) => (
      <group key={x}>
        <InkBox size={[w, 1.0, 0.02]} position={[x, 0.5, VZ + VAULT.wall / 2 + 0.012]} color={mood === "dusk" ? "#4a2a18" : "#6a3e22"} ink={0} />
        <InkBox size={[w, 0.06, 0.05]} position={[x, 1.02, VZ + VAULT.wall / 2 + 0.026]} color="#3a2010" ink={0.004} />
      </group>
    ))}
    <Portrait position={[-1.9, 1.75, VZ + VAULT.wall / 2 + 0.03]} />
    <HangingLamp position={[-1.3, 2.75, -0.7]} on={mood === "dusk"} light={1.4} />
    <HangingLamp position={[1.5, 2.75, -0.4]} on={mood === "dusk"} light={1.4} />
    <Counter position={[0.3, 0, 0.1]} size={[2.8, 0.6, 0.55]} color="#5a3420" top="#3a2014" />
    <Grille position={[0.3, 0.6, 0.12]} width={2.8} height={0.38} />
    <Label text="FIRST NATIONAL BANK" position={[1.35, 2.6, VZ + VAULT.wall / 2 + 0.03]} width={1.4} bg="#3a2014" fg="#e8c060" border={false} />
    {/* the cashier's stool behind the counter, his ledger on the counter */}
    <InkCylinder radius={0.16} height={0.04} position={[STOOL[0], STOOL_TOP - 0.02, STOOL[1]]} color="#4a2a18" ink={0.006} />
    <InkCylinder radius={0.03} height={STOOL_TOP - 0.04} position={[STOOL[0], (STOOL_TOP - 0.04) / 2, STOOL[1]]} color="#3a2010" ink={0.004} />
    <InkBox size={[0.36, 0.03, 0.26]} position={[0.75, 0.615, 0.05]} rotation={[0, 0.2, 0]} color="#7a2a22" ink={0.004} />
    <InkBox size={[0.32, 0.01, 0.22]} position={[0.75, 0.633, 0.05]} rotation={[0, 0.2, 0]} color="#f0e8d4" ink={0.002} />
    {/* a wall clock beside the vault */}
    <group position={[1.35, 1.75, VZ + VAULT.wall / 2 + 0.03]}>
      <InkCylinder radius={0.17} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#5a3420" ink={0.006} />
      <mesh position={[0, 0, 0.03]}>
        <circleGeometry args={[0.14, 32]} />
        <meshBasicMaterial color="#f4ecd8" toneMapped={false} />
      </mesh>
      <InkBox size={[0.012, 0.1, 0.005]} position={[0.03, -0.035, 0.035]} rotation={[0, 0, 0.9]} color="#1a1010" ink={0} />
      <InkBox size={[0.01, 0.12, 0.005]} position={[0, 0.06, 0.036]} color="#1a1010" ink={0} />
    </group>
    {/* the cashier's desk behind the counter */}
    <InkBox size={[0.8, 0.05, 0.5]} position={[1.25, 0.74, -1.0]} color="#5a3420" ink={0.008} />
    <InkBox size={[0.7, 0.7, 0.42]} position={[1.25, 0.36, -1.0]} color="#4a2a18" ink={0.008} />
    {children}
  </Room>
);

const seated = (extra: Partial<PuppetPose> = {}): PuppetPose => ({ expression: "neutral", sit: true, air: (STOOL_TOP - HIP_HEIGHT) * UNITS, ...extra });

// ---------- 1. The vault: an outlaw's revolver on the safe and its little TIME LOCK window ----------

const VaultRoom: React.FC<{ camera: CameraShot; lantern?: boolean; frame: number; handle?: number; rays?: number; children?: React.ReactNode }> = ({ camera, lantern, frame, handle = 0, rays = 0.045, children }) => (
  <Room camera={camera} mood="night" floor="#3a3c36" wall="#4a5e52" wallPattern="brick" floorPattern="concrete" width={4} depth={4}>
    <Safe position={[0, 0, -1.4]} handle={handle} />
    <BarredWindow position={[-1.05, 2.35, -1.93]} size={[0.6, 0.42]} bars={4} />
    <GodRays center={[-1.05, 2.35, -1.9]} size={[0.6, 0.42]} panes={[5, 1]} bar={0.03} sun={[0.85, -0.5, 0.14]} color="#fff0d0" strength={rays} patch={0.35} frame={frame} motes={50} />
    {/* iron shelves of ledgers either side */}
    {[-1.35, 1.35].map((x) => (
      <group key={x} position={[x, 0, -1.8]}>
        <InkBox size={[0.9, 1.9, 0.35]} position={[0, 0.95, 0]} color="#1e2622" ink={0.012} />
        {[0.45, 0.95, 1.45].map((y, j) => (
          <InkBox key={y} size={[0.78, 0.3, 0.3]} position={[0, y + 0.17, 0.03]} color={["#4a3a2a", "#3a2a20", "#5a4632"][j]} ink={0.008} />
        ))}
      </group>
    ))}
    <pointLight position={[0.7, 1.9, 0.9]} color="#d8f0e0" intensity={lantern ? 1.4 : 1.2} distance={5} />
    {lantern && (
      <group position={[-1.15, 0, -0.9]}>
        <InkCylinder radius={0.07} height={0.2} position={[0, 0.12, 0]} color="#8a2a1a" ink={0.006} />
        <mesh position={[0, 0.14, 0]}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshBasicMaterial color="#ffb050" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.3, 0]} color="#ff8a4a" intensity={2.6} distance={3.5} />
      </group>
    )}
    {children}
  </Room>
);

// The hook: over the shoulders of two outlaws, a lantern and two revolvers on the bank's painted iron safe; dust
// in the vent's light. The camera pushes between them onto the TIME LOCK window; on "It wasn't" the handle slips.
const LEFT_O: [number, number] = [-0.5, 0.95];
const RIGHT_O: [number, number] = [0.55, 0.8];
const SLIP = 70;
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..90
  const camera = beatPath(
    [
      { at: 0, position: [0.05, 1.42, 2.7], target: [0.0, 0.95, -1.2], fov: 44 },
      { at: 50, position: [0.04, 1.1, 1.15], target: [0.0, 0.8, -1.2], fov: 42 },
      { at: 89, position: [0.05, 0.95, 0.6], target: [0.03, 0.66, -1.2], fov: 40 },
    ],
    f,
  );
  const slip = ease(f, SLIP, SLIP + 4) * 0.14;
  const lantern = handWorld(LEFT_O, [-170, -560], camera);
  const gunL = handWorld(LEFT_O, [120, -640], camera);
  const gunR = handWorld(RIGHT_O, [-130, -660], camera);
  const safeFront = -1.4 + 0.375 + 0.09;
  return (
    <Stage
      set={
        <VaultRoom camera={camera} frame={f + 200} handle={slip}>
          <HangingLamp position={[lantern[0], lantern[1] + 0.12, lantern[2]]} chain={0.12} on light={2.6} />
          <pointLight position={[-0.6, 1.3, 0.2]} color="#ffc070" intensity={1.3} distance={3.2} />
          <Revolver at={gunL} yaw={Math.PI / 2 + 0.25} pitch={0.05} scale={1.3} />
          <Revolver at={gunR} yaw={Math.PI / 2 - 0.25} pitch={0.08} scale={1.3} />
          <Burst kind="sparks" at={[0.15, 0.48, -0.9]} frame={f - SLIP} count={10} size={0.25} speed={0.6} colors={["#fff4c0", "#ffd060"]} seed={21} />
        </VaultRoom>
      }
      camera={camera}
      bg="#06080c"
      blur={2.6}
      focus={camera.position[2] - safeFront}
      keepHeads={false}
      puppets={[
        { id: "outlaw", look: OUTLAW, at: LEFT_O, pose: { expression: "angry", view: "back", reachL: [-170, -560], reachR: [120, -640], handR: "fist", handL: "fist" } },
        { id: "outlaw2", look: OUTLAW2, at: RIGHT_O, pose: { expression: "angry", view: "back", reachR: [-130, -660], handR: "fist" } },
      ]}
      light={{ tint: "#ffd8a0", tintAmount: 0.1, shadow: 0.45, points: [{ position: [lantern[0], lantern[1], lantern[2]], color: "#ffb860", strength: 2.2, range: 2.5 }] }}
    />
  );
};

// ---------- 2. Northfield's main street: three riders walk their horses up to the bank ----------

const SADDLE = 1.12;
const RIDER_AIR = (SADDLE - HIP_HEIGHT) * UNITS;
const Rider: React.FC<{ at: [number, number]; phase: number; run: number; dir?: 1 | -1; coat?: string }> = ({ at, phase, run, dir = 1, coat = "#5a3a24" }) => (
  <group position={[at[0], 0, at[1]]} rotation={[0, dir === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}>
    <Horse phase={phase} run={run} scale={0.95} coat={coat} saddle="#3a2014" />
  </group>
);

const ARRIVE = [
  { x: 0.9, from: -13, to: -1.2, look: OUTLAW, id: "outlaw", seed: 0, coat: "#5a3a24" },
  { x: 2.0, from: -14.5, to: -2.6, look: OUTLAW2, id: "outlaw2", seed: 1.7, coat: "#2a1e18" },
  { x: -0.1, from: -15.5, to: -3.8, look: OUTLAW3, id: "outlaw3", seed: 3.1, coat: "#7a5a3a" },
];
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..140
  const camera = beatPath(
    [
      { at: 0, position: [-1.6, 4.6, 8.0], target: [0.8, 1.2, -6.0], fov: 44 },
      { at: 70, position: [-1.4, 2.6, 6.8], target: [1.1, 1.4, -3.0], fov: 44 },
      { at: 139, position: [-0.6, 1.75, 3.6], target: [1.2, 1.5, -1.8], fov: 44 },
    ],
    f,
  );
  const riders = ARRIVE.map((r) => {
    const p = ease(f, 0, 140);
    const z = mix(r.from, r.to, p * 0.85 + ramp(f, 0, 140) * 0.15);
    return { ...r, at: [r.x, z] as [number, number], phase: z * 3.2 + r.seed };
  });
  const cast: PuppetPlacement[] = [
    ...riders.map((r) => ({
      id: r.id,
      look: r.look,
      at: r.at,
      pose: { expression: "smug" as const, sit: true, air: RIDER_AIR + Math.abs(Math.sin(r.phase)) * 8, view: "front" as const, reachR: [70, -560] as [number, number], reachL: [-70, -560] as [number, number], handR: "fist" as const, handL: "fist" as const, frontR: true, frontL: true },
    })),
    { id: "lady", look: LADY, at: [-3.4, -2.4], pose: { expression: f > 70 ? "worried" : "neutral", view: "front", lookX: 0.8 } },
    { id: "loafer", look: LOAFER, at: [3.5, -6.0], pose: { expression: f > 60 ? "skeptical" : "bored", view: "front", lookX: -0.7 } },
  ];
  const zAt = (r: (typeof ARRIVE)[number], g: number) => mix(r.from, r.to, ease(g, 0, 140) * 0.85 + ramp(g, 0, 140) * 0.15);
  return (
    <>
    <Stage
      set={
        <WesternTownSet camera={camera} frame={f} mode="day">
          {riders.map((r) => (
            <Rider key={r.id} at={r.at} phase={r.phase} run={0.35} coat={r.coat} />
          ))}
          {ARRIVE.map((r, i) =>
            Array.from({ length: 14 }, (_, k) => k * 10).map((g) => (
              <Burst key={`${i}-${g}`} kind="dust" at={[r.x, 0.02, zAt(r, g)]} frame={f - g} count={5} size={0.7} seed={i * 40 + g} />
            )),
          )}
          <Label text="NORTHFIELD" position={[-4.25, 3.0, -9.0]} rotation={[0, Math.PI / 2, 0]} width={1.6} bg="#2a1a14" fg="#f0d890" />
        </WesternTownSet>
      }
      camera={camera}
      bg={TOWN_BG.day}
      blur={2.0}
      puppets={cast}
      light={townLight("day")}
    />
    <Headline f={f} text="NORTHFIELD, MINNESOTA, 1876" at={6} out={128} />
    </>
  );
};

// ---------- 3. The lobby: Heywood on his stool; an outlaw over the counter, "Open the safe!" ----------

const S3: React.FC = () => {
  const f = useShotFrame(); // 0..254
  const camera = beatPath(
    [
      { at: 0, position: [-1.5, 1.35, 3.7], target: [0.2, 1.1, -0.6], fov: 40 },
      { at: 80, position: [-0.7, 1.3, 3.6], target: [0.45, 1.12, -0.6], fov: 40 },
      { at: 175, position: [0.05, 1.25, 3.4], target: [0.6, 1.12, -0.5], fov: 40 },
      { at: 253, position: [0.3, 1.22, 3.1], target: [0.65, 1.12, -0.5], fov: 39 },
    ],
    f,
  );
  const w = stroll(f, 50, 34, [2.0, 1.4], [0.95, 0.75]);
  const angry = f > 82;
  const grip = handWorld(w.at, [-240, -640], camera);
  const cast: PuppetPlacement[] = [
    {
      id: "heywood",
      look: HEYWOOD,
      at: STOOL,
      pose: seated({ expression: f < 60 ? "neutral" : f < 175 ? "worried" : "determined", view: "front", reachR: [120, -470], reachL: [-60, -470], handR: "fist", handL: "open", frontR: true, frontL: true, lookX: f < 60 ? -0.3 : 0.6 }),
    },
    {
      id: "outlaw",
      look: OUTLAW,
      at: w.at,
      pose: { expression: angry ? "angry" : "determined", ...w.pose, ...(f > 84 ? { view: "side" as const, facing: -1 as const } : {}), reachR: [-240, -640], handR: "fist" },
    },
  ];
  return (
    <Stage
      set={
        <Lobby camera={camera} mood="daylight" vaultOpen={1} frame={f}>
          {f > 50 && <Revolver at={grip} yaw={yawFromTo(w.at, STOOL)} pitch={-0.08} />}
        </Lobby>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={cast}
      foreground={<InkCylinder radius={0.03} height={1.4} position={frameSpot({ position: [-1.5, 1.35, 3.7], target: [0.2, 1.1, -0.6], fov: 40 }, ASPECT, -0.8, -0.2, 1.4)} color="#5a3420" ink={0.004} />}
    />
  );
};

// ---------- 4. The vault: an outlaw steps in, Heywood throws the iron door on him; it bursts open again ----------

const SLAM = 104;
const BURST = 150;
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..173
  const camera = beatPath(
    [
      { at: 0, position: [0.6, 1.6, 2.7], target: [-0.45, 1.0, -2.1], fov: 44 },
      { at: SLAM, position: [0.05, 1.55, 2.25], target: [-0.85, 1.0, -1.9], fov: 44 },
      { at: 172, position: [-0.1, 1.52, 2.05], target: [-0.8, 1.0, -1.9], fov: 44 },
    ],
    f,
  );
  const inside = stroll(f, 18, 52, [0.45, -0.85], [VX + 0.15, -2.75]);
  const hw = stroll(f, 62, 34, [STOOL[0], -0.8], [-1.65, -0.9]);
  const door = f < SLAM - 6 ? 1 : f < SLAM ? 1 - ease(f, SLAM - 6, SLAM) : f < BURST ? Math.max(0, Math.sin((f - 118) * 1.7) * 0.025 * (f > 118 && f < 145 ? 1 : 0)) : mix(0, 0.62, ease(f, BURST, BURST + 6));
  const out = f >= BURST + 2;
  const outAt: [number, number] = [mix(VX + 0.05, 0.25, ease(f, BURST + 2, BURST + 18)), mix(-2.5, -1.75, ease(f, BURST + 2, BURST + 18))];
  const shake = Math.sin(f * 1.3) * 60;
  const cast: PuppetPlacement[] = [
    {
      id: "heywood",
      look: HEYWOOD,
      at: hw.at,
      pose: {
        expression: f < SLAM ? "determined" : f < BURST ? "angry" : "shocked",
        ...hw.pose,
        ...(f > SLAM - 10 && f < SLAM + 30 ? { view: "side" as const, facing: 1 as const, lean: 14, reachR: [240, -620] as [number, number], reachL: [220, -700] as [number, number], handR: "open" as const, handL: "open" as const } : {}),
      },
    },
    ...(f < SLAM - 2
      ? [{ id: "outlaw", look: OUTLAW, at: inside.at, pose: { expression: "smug" as const, ...inside.pose } }]
      : out
        ? [{ id: "outlaw", look: OUTLAW, at: outAt, pose: { expression: "angry" as const, view: "front" as const, reachL: [90 + shake * 0.4, -600] as [number, number], frontL: true, reachR: [200, -420 + shake] as [number, number], handR: "open" as const, ...(f > BURST + 18 ? jump(f, BURST + 18, 40, 14) : {}) } }]
        : []),
    { id: "outlaw2", look: OUTLAW2, at: [1.35, -1.55], pose: { expression: f < BURST ? "worried" : "shocked", lookX: -0.7 } },
  ];
  return (
    <Stage
      set={
        <Lobby camera={camera} mood="daylight" vaultOpen={door} frame={f + 254}>
          <Burst kind="dust" at={[VX - 0.4, 1.0, VZ + 0.3]} frame={f - SLAM} count={16} size={0.9} seed={2} />
          <Burst kind="stars" at={[outAt[0], HEAD_Y + 0.25, outAt[1]]} frame={f - BURST - 4} count={6} size={0.45} seed={6} />
        </Lobby>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={cast}
    />
  );
};

// ---------- 5. Behind the bank: teller Bunker bursts out of the back door; a shot; he keeps running ----------

const SHOT5 = 70;
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..141
  const camera = beatPath(
    [
      { at: 0, position: [-1.6, 1.3, 3.0], target: [-1.0, 1.0, -1.0], fov: 42 },
      { at: SHOT5, position: [-0.2, 1.25, 3.0], target: [0.2, 1.0, -0.6], fov: 42 },
      { at: 140, position: [1.3, 1.2, 3.0], target: [1.9, 1.0, -0.2], fov: 42 },
    ],
    f,
  );
  const run = stroll(f, 12, 124, [-1.2, -1.55], [2.6, 0.2]);
  const hit = f >= SHOT5 + 2;
  const fg = frameSpot({ position: [-1.6, 1.3, 3.0], target: [-1.0, 1.0, -1.0], fov: 42 }, ASPECT, 0.7, -0.75, 1.6);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#8a8270" wall="#a8503a" wallPattern="brick" floorPattern="concrete" width={9} depth={4}>
          {/* a wash line across the yard, a rain barrel, a water pump */}
          <InkCylinder radius={0.006} height={6} position={[0.4, 2.35, -1.0]} rotation={[0, 0, Math.PI / 2]} color="#4a4a4a" ink={0} />
          {[-1.9, -1.3, 0.9, 1.5, 2.1].map((x, i) => (
            <HangingShirt key={i} position={[x, 2.35, -1.0]} sway={Math.sin(f * 0.07 + i * 1.3)} color={["#f4f6f8", "#e8d8c0", "#c8d8e8", "#f4f6f8", "#e8c8c8"][i]} />
          ))}
          <InkCylinder radius={0.3} height={0.8} position={[-2.4, 0.4, -1.3]} color="#6a4a2a" ink={0.012} />
          <InkCylinder radius={0.06} height={1.1} position={[3.4, 0.55, -1.6]} color="#3a4a5a" ink={0.006} />
          {Array.from({ length: 10 }, (_, k) => 22 + k * 11).map((g) => (
            <Burst key={g} kind="dust" at={[mix(-1.2, 2.6, ease(g, 12, 136)), 0.02, mix(-1.55, 0.2, ease(g, 12, 136))]} frame={f - g} count={4} size={0.45} seed={g} />
          ))}
          <Door position={[-1.2, 0, -1.95]} open={f < 10 ? 0 : f < 16 ? ease(f, 10, 16) : 1 - ease(f, 26, 60) * 0.7} color="#4a5a6a" />
          <Crates position={[2.9, 0, -1.4]} count={3} />
          <InkBox size={[0.7, 0.9, 0.6]} position={[-2.6, 0.45, -1.4]} color="#5a4a3a" ink={0.012} />
          <Burst kind="confetti" at={[-1.1, 1.1, -1.4]} frame={f - 13} count={14} size={0.5} colors={["#f4f0e6", "#e8e0c8"]} seed={9} />
          <Burst kind="sparks" at={[-0.95, 1.25, -1.6]} frame={f - SHOT5} count={22} size={0.5} speed={2.0} spray={[2.0, 0.2, 1.0]} seed={3} />
          <SmokePlume position={[-0.95, 1.25, -1.6]} world={[-0.95, -1.6]} frame={f - SHOT5} size={0.1} rise={0.6} wind={0.3} period={40} puffs={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={[
        {
          id: "bunker",
          look: BUNKER,
          at: run.at,
          pose: { expression: hit ? "shocked" : "worried", ...run.pose, ...(hit ? { reachL: [70, -610] as [number, number], frontL: true, handL: "open" as const } : {}), ...(f >= SHOT5 + 1 && f < SHOT5 + 7 ? { lean: -10 } : {}) },
        },
      ]}
      light={{ tint: "#fff0dc", tintAmount: 0.06, shadow: 0.22, distant: [{ direction: [-0.6, 0.8, 0.5], color: "#fff0d8", strength: 1.2 }] }}
      foreground={<Crates position={[fg[0], 0, fg[2]]} count={1} color="#8a6a44" />}
    />
  );
};

// ---------- 6. The hardware store: the merchant grabs his rifle; "Get your guns, boys!" ----------

const RACK: [number, number, number][] = [
  [-0.95, 1.85, -1.92],
  [-0.95, 1.6, -1.92],
  [-0.95, 1.35, -1.92],
  [-0.95, 1.1, -1.92],
];
const GRAB = 58;
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..182
  const camera = beatPath(
    [
      { at: 0, position: [0.7, 1.4, 3.2], target: [-0.5, 1.2, -1.4], fov: 42 },
      { at: GRAB, position: [0.35, 1.3, 2.5], target: [-0.6, 1.2, -1.4], fov: 42 },
      { at: 181, position: [0.2, 1.3, 2.3], target: [0.05, 1.2, -1.4], fov: 42 },
    ],
    f,
  );
  const M: [number, number] = [-0.45, -1.35];
  const T = stroll(f, 90, 26, [0.95, -1.75], [0.55, -1.2]);
  const turned = f > GRAB + 14;
  const reach: [number, number] = f < GRAB ? [-200, -760 + ease(f, 30, GRAB) * 0] : turned ? [150, -620] : [-120, -680];
  const grip = handWorld(M, reach, camera);
  const shouting = f > 112;
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#7a4a2a" wall="#a0603a" wallPattern="panel" floorPattern="wood" width={6} depth={4}>
          <Label text="HARDWARE" position={[-0.2, 2.25, -1.94]} width={1.0} bg="#2a1a10" fg="#f0c060" />
          {/* the rifle rack: pegs and rifles; the top one leaves with the merchant */}
          <InkBox size={[1.1, 1.1, 0.04]} position={[-0.95, 1.48, -1.92]} color="#c8a070" ink={0.01} />
          {RACK.map((p, i) => (i === 0 && f >= GRAB ? null : <RackRifle key={i} position={[p[0], p[1], -1.88]} rotation={[0, 0, 0.05]} />))}
          {f >= GRAB && <Rifle at={grip} yaw={turned ? 0.2 : Math.PI - 0.3} pitch={turned ? 0.6 : 0.1} />}
          <Window position={[1.95, 1.55, -1.93]} size={[0.6, 0.9]} sky="#fff0c8" />
          <GodRays center={[1.95, 1.55, -1.88]} size={[0.55, 0.85]} panes={[2, 2]} bar={0.05} sun={[-0.85, -0.5, 0.2]} color="#ffe0a0" strength={0.06} patch={0.3} frame={f} />
          {/* stock hanging from a beam: lanterns, rope coils, a shovel */}
          <InkBox size={[5.6, 0.12, 0.14]} position={[0, 2.7, -1.2]} color="#4a2a14" ink={0.008} />
          {[-1.7, -0.9, 0.3, 1.2].map((x, i) =>
            i % 2 === 0 ? (
              <HangingLamp key={i} position={[x, 2.4, -1.2]} chain={0.28} on={i === 0} light={0.8} />
            ) : (
              <mesh key={i} position={[x, 2.35, -1.2]} rotation={[0, 0, 0]} castShadow>
                <torusGeometry args={[0.13, 0.035, 8, 20]} />
                <meshToonMaterial color="#c8a060" />
              </mesh>
            ),
          )}
          <InkBox size={[0.05, 0.9, 0.03]} position={[2.3, 2.15, -1.2]} color="#7a5030" ink={0.004} />
          <InkBox size={[0.2, 0.24, 0.02]} position={[2.3, 1.65, -1.2]} color="#7a7a80" ink={0.004} />
          {[-1.8, -1.45].map((x) => (
            <group key={x}>
              <InkCylinder radius={0.18} height={0.5} position={[x, 0.25, -0.9]} color="#7a5a3a" ink={0.008} />
              <InkCylinder radius={0.17} height={0.02} position={[x, 0.51, -0.9]} color="#8a8a8a" ink={0} />
            </group>
          ))}
          <Door position={[0.95, 0, -1.95]} open={ease(f, 84, 96)} color="#5a3a24" />
          <Counter position={[-0.4, 0, -0.55]} size={[1.6, 0.6, 0.5]} color="#6a3e22" top="#4a2a16" />
          <InkBox size={[0.5, 0.04, 0.25]} position={[-0.25, 1.55, -1.85]} color="#4a2a16" ink={0.006} />
          <InkBox size={[0.42, 0.16, 0.2]} position={[-0.25, 1.65, -1.85]} color="#c8a050" ink={0.006} />
          <Label text="CARTRIDGES" position={[-0.25, 1.66, -1.74]} width={0.42} bg="#e8d098" fg="#3a1a0a" />
          <InkCylinder radius={0.22} height={0.6} position={[1.0, 0.3, 0.4]} color="#7a4a2a" ink={0.01} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.2}
      puppets={[
        { id: "merchant", look: MANNING, at: M, pose: { expression: f < GRAB ? "determined" : "angry", view: turned ? "front" : "back", reachR: reach, handR: "fist", ...(turned ? { reachL: [60, -560] as [number, number], handL: "fist" as const, frontL: true } : {}) } },
        ...(f > 88 ? [{ id: "townsman", look: TOWNSMAN, at: T.at, pose: { expression: shouting ? ("angry" as const) : ("worried" as const), ...T.pose, ...(shouting ? { gesture: "point" as const, mouthOpen: 0.6 } : {}) } }] : []),
      ]}
    />
  );
};

// ---------- 7. The vault: the outlaws wait on the "time lock"; one kicks the safe ----------

const KICK = 48;
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..124
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 2.4, 1.6], target: [0.0, 0.8, -1.3], fov: 44 },
      { at: 60, position: [0.15, 1.7, 1.0], target: [0.05, 0.75, -1.2], fov: 44 },
      { at: 123, position: [0.12, 1.3, 1.0], target: [0.1, 0.75, -1.1], fov: 42 },
    ],
    f,
  );
  const hop = f >= KICK + 4 ? jump(f, KICK + 4, 50, 18) : {};
  const tap = Math.max(0, Math.sin(f * 0.5)) * 6;
  return (
    <Stage
      set={
        <VaultRoom camera={camera} lantern frame={f} rays={0.02}>
          <Burst kind="stars" at={[0.3, 0.3, -0.95]} frame={f - KICK} count={6} size={0.4} seed={7} />
        </VaultRoom>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={2.4}
      puppets={[
        { id: "outlaw", look: OUTLAW, at: [-0.55, -0.65], pose: { expression: "bored", gesture: "armsCrossed", bob: tap, lookX: 0.5 } },
        {
          id: "outlaw2",
          look: OUTLAW2,
          at: [0.55, -0.7],
          pose: {
            expression: f < KICK ? "angry" : "shocked",
            view: "side",
            facing: -1,
            ...(f > KICK - 6 && f < KICK + 4 ? { legSwing: -0.9, lean: -8 } : {}),
            ...(f >= KICK + 4 ? { ...hop, reachL: [-40, -260] as [number, number], frontL: true, handL: "open" as const } : {}),
          },
        },
      ]}
      light={{ tint: "#ffb090", tintAmount: 0.08, shadow: 0.3, points: [{ position: [-1.15, 0.4, -0.9], color: "#ff8a4a", strength: 2.2, range: 2.6 }] }}
    />
  );
};

// ---------- 8. Cut open: the time lock's clock holds a block under the bolt bar until the hour comes ----------

const CUT: [number, number, number] = [0, 1.15, -1.0];
const BlackRoom: React.FC<{ camera: CameraShot; warm?: boolean; frame: number; children?: React.ReactNode }> = ({ camera, warm, frame, children }) => (
  <Room camera={camera} mood={warm ? "golden" : "night"} floor={warm ? "#2a1a08" : "#0c0c10"} wall={warm ? "#3a2408" : "#0e0e14"} wallPattern="plain" floorPattern="plain" width={8} depth={6}>
    <Blueprint position={[0, 1.4, -2.9]} size={[6, 4.4]} warm={warm} />
    {/* the clockwork behind the dial: two gears in mesh, a rocking balance wheel */}
    <Gear position={[CUT[0] - 0.64, CUT[1] + 0.8, CUT[2] + 0.05]} radius={0.09} teeth={12} angle={frame * 0.06} />
    <Gear position={[CUT[0] - 0.64, CUT[1] + 0.57, CUT[2] + 0.05]} radius={0.065} teeth={9} angle={-frame * 0.083 + 0.2} color="#d8b050" />
    <BalanceWheel position={[CUT[0] + 0.17, CUT[1] + 0.45, CUT[2] + 0.1]} radius={0.06} swing={Math.sin(frame * 0.45) * 0.9} />
    <pointLight position={[0.9, 2.6, 1.0]} color={warm ? "#ffc060" : "#b8d4ff"} intensity={1.6} distance={6} />
    <pointLight position={[-1.2, 0.6, 0.4]} color={warm ? "#ff9a40" : "#6a9aff"} intensity={0.9} distance={4} />
    {children}
  </Room>
);

const S8: React.FC = () => {
  const f = useShotFrame(); // 0..177
  const camera = beatPath(
    [
      { at: 0, position: [0.12, 1.2, 4.1], target: [0.1, 1.1, -1.0], fov: 40 },
      { at: 70, position: [0.1, 1.2, 3.75], target: [0.1, 1.08, -1.0], fov: 40 },
      { at: 176, position: [0.08, 1.15, 3.45], target: [0.1, 1.05, -1.0], fov: 40 },
    ],
    f,
  );
  const hour = 8.15 + ease(f, 0, 150) * 0.85;
  const strain = f > 66 && f < 112 ? Math.sin(f * 1.6) : 0;
  return (
    <Stage
      set={
        <BlackRoom camera={camera} frame={f}>
          <TimeLockCutaway position={CUT} hour={hour} block={1 - ease(f, 150, 158)} bolts={1 - ease(f, 162, 174)} handle={ease(f, 160, 172)} strain={strain} labels={f - 8} />
          <Burst kind="sparks" at={[CUT[0] + 0.26, CUT[1] - 0.12, CUT[2] + 0.12]} frame={f - 152} count={16} size={0.35} speed={1.2} seed={31} />
          <Burst kind="sparks" at={[CUT[0] + 0.55, CUT[1] - 0.25, CUT[2] + 0.12]} frame={f - 166} count={14} size={0.35} speed={1.4} spray={[0.8, 0, 0]} seed={32} />
        </BlackRoom>
      }
      camera={camera}
      bg="#0c0c10"
      blur={1.6}
      puppets={[]}
    />
  );
};

// ---------- 9. The same lock in warm light: NOT SET. One turn of the handle ----------

const S9: React.FC = () => {
  const f = useShotFrame(); // 0..145
  const camera = beatPath(
    [
      { at: 0, position: [0.15, 1.5, 3.3], target: [0.0, 1.4, -1.0], fov: 40 },
      { at: 60, position: [0.1, 1.3, 3.2], target: [0.0, 1.15, -1.0], fov: 40 },
      { at: 144, position: [0.0, 1.05, 3.0], target: [0.0, 0.95, -1.0], fov: 40 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <BlackRoom camera={camera} warm frame={f + 177}>
          <TimeLockCutaway position={CUT} hour={10.2} block={0} bolts={1 - ease(f, 108, 122)} handle={ease(f, 104, 118)} set={false} labels={f - 4} warm />
          <pointLight position={[0.5, 2.4, 0.8]} color="#ffc060" intensity={2} distance={6} />
          <Burst kind="sparks" at={[CUT[0] - 0.5, CUT[1] - 0.25, CUT[2] + 0.12]} frame={f - 106} count={18} size={0.35} speed={1.3} colors={["#fff4c0", "#ffd060", "#ffa030"]} seed={33} />
          <Burst kind="sparks" at={[CUT[0] + 0.6, CUT[1] - 0.25, CUT[2] + 0.12]} frame={f - 118} count={14} size={0.35} speed={1.4} colors={["#fff4c0", "#ffd060"]} spray={[0.8, 0, 0]} seed={34} />
        </BlackRoom>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={1.6}
      puppets={[]}
    />
  );
};

// ---------- 10. The street: shots from the windows, the gang gallops off with $26.70 ----------

const VOLLEY = [6, 28, 48, 66, 84];
const FLEE = [
  { x: 1.9, from: -6.0, to: 4.5, look: OUTLAW, id: "outlaw", seed: 0, coat: "#5a3a24" },
  { x: 2.6, from: -8.2, to: 2.4, look: OUTLAW2, id: "outlaw2", seed: 1.3, coat: "#2a1e18" },
];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..118
  const camera = beatPath(
    [
      { at: 0, position: [-2.6, 1.35, -4.0], target: [2.0, 1.4, -3.0], fov: 44 },
      { at: 60, position: [-2.6, 1.35, -1.6], target: [2.0, 1.45, -0.6], fov: 44 },
      { at: 117, position: [-2.6, 1.35, 0.4], target: [2.0, 1.45, 1.4], fov: 44 },
    ],
    f,
  );
  const riders = FLEE.map((r) => {
    const z = mix(r.from, r.to, ramp(f, 0, 118));
    return { ...r, at: [r.x, z] as [number, number], phase: z * 2.4 + r.seed };
  });
  const lead = riders[0];
  const HAT_SHOT = VOLLEY[2] + 1;
  const hatT = ramp(f, HAT_SHOT, HAT_SHOT + 26);
  const pouchReach: [number, number] = [170, -640];
  const pouch = handWorld(lead.at, pouchReach, camera);
  return (
    <Stage
      set={
        <WesternTownSet camera={camera} frame={f} mode="day">
          {riders.map((r) => (
            <Rider key={r.id} at={r.at} phase={r.phase} run={1} coat={r.coat} />
          ))}
          <CoinPouch position={[pouch[0], pouch[1] + RIDER_AIR / UNITS, pouch[2]]} />
          {VOLLEY.map((v, i) => {
            const at: [number, number, number] = [4.1, 2.5 - (i % 2) * 0.9, -3.0 + i * 1.1];
            const flash = Math.max(0, 1 - Math.abs(f - v - 1) / 3);
            return (
              <React.Fragment key={i}>
                <Burst kind="sparks" at={at} frame={f - v} count={26} size={0.7} speed={2.6} spray={[-2.4, 0.3, 0]} seed={10 + i} />
                <SmokePlume position={at} world={[at[0], at[2]]} frame={f - v} size={0.2} rise={0.9} wind={-0.6} period={50} puffs={3} />
                {flash > 0 && (
                  <>
                    <pointLight position={[at[0] - 0.3, at[1], at[2]]} color="#ffd080" intensity={6 * flash} distance={6} />
                    <mesh position={[at[0] - 0.15, at[1], at[2]]}>
                      <sphereGeometry args={[0.14 * flash + 0.04, 10, 8]} />
                      <meshBasicMaterial color={new THREE.Color(6, 4.2, 1.6)} toneMapped={false} transparent opacity={flash} />
                    </mesh>
                  </>
                )}
              </React.Fragment>
            );
          })}
          {/* hoof dust kicked up behind the galloping horses */}
          {riders.map((r, i) =>
            Array.from({ length: 20 }, (_, k) => k * 6).map((g) => (
              <Burst key={`${i}-${g}`} kind="dust" at={[r.x, 0.02, mix(r.from, r.to, ramp(g, 0, 118))]} frame={f - g} count={6} size={1.1} spray={[0, 0.3, -0.6]} seed={i * 50 + g} />
            )),
          )}
          {f > HAT_SHOT && <FlyingHat position={[riders[1].at[0] - hatT * 0.5, mix(SADDLE + 0.95, 0.03, hatT) + Math.sin(hatT * Math.PI) * 0.9, riders[1].at[1] - 0.4 - hatT * 1.2]} spin={hatT < 1 ? hatT * 10 : 0} color="#2a2018" />}
        </WesternTownSet>
      }
      camera={camera}
      bg={TOWN_BG.day}
      blur={2.2}
      puppets={riders.map((r, i) => ({
        id: r.id,
        look: i === 1 && f > HAT_SHOT ? { ...r.look, hat: undefined } : r.look,
        at: r.at,
        pose: {
          expression: "shocked",
          sit: true,
          air: RIDER_AIR + Math.abs(Math.sin(r.phase)) * 22,
          view: "side",
          facing: 1,
          lean: 12,
          ...(i === 0 ? { reachR: pouchReach, handR: "fist" as const } : { reachR: [180, -560] as [number, number], handR: "fist" as const }),
          reachL: [160, -540],
          handL: "fist",
        },
      }))}
      light={townLight("day")}
    />
  );
};

// ---------- 11. Evening in the bank: the newspaper, the empty stool; Wilcox opens the safe on the money ----------

const OPEN_H = 160;
const OPEN_D = 172;
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..214
  const camera = beatPath(
    [
      { at: 0, position: [1.0, 1.55, -0.1], target: [1.05, 0.72, -1.0], fov: 40 },
      { at: 100, position: [1.15, 1.45, 0.6], target: [0.3, 0.75, -0.6], fov: 40 },
      { at: 150, position: [0.25, 1.6, 0.9], target: [-0.3, 0.85, -3.2], fov: 42 },
      { at: 213, position: [-0.1, 1.5, 0.9], target: [-0.25, 0.8, -3.3], fov: 42 },
    ],
    f,
  );
  const w = stroll(f, 118, 40, [0.7, -1.4], [0.05, -2.75]);
  const open = ease(f, OPEN_D, OPEN_D + 26);
  return (
    <Stage
      set={
        <Lobby camera={camera} mood="dusk" vaultOpen={1} frame={f} safeHandle={ease(f, OPEN_H, OPEN_H + 10)} safeOpen={open * 0.85} safeGlow={open}>
          <Newspaper position={[1.2, 0.775, -1.0]} rotation={[-Math.PI / 2, 0, 0.1]} size={0.36} />
          <Burst kind="sparks" at={[SAFE_WORLD[0], 0.75, SAFE_WORLD[1] + 0.45]} frame={f - OPEN_D - 6} count={22} size={0.4} speed={1.1} colors={["#fff4c0", "#ffd060", "#ffb030"]} seed={41} />
        </Lobby>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.2}
      puppets={f > 118 ? [{ id: "wilcox", look: WILCOX, at: w.at, pose: { expression: f > OPEN_D + 10 ? "happy" : "sad", ...w.pose, ...(f > 150 ? { view: "side" as const, facing: -1 as const, reachR: [-200, -420] as [number, number], handR: "fist" as const } : {}) } }] : []}
      light={{ tint: "#ffc890", tintAmount: 0.1, shadow: 0.3, points: [{ position: [SAFE_WORLD[0], 0.8, SAFE_WORLD[1] + 0.4], color: "#ffd27a", strength: 1.4 * open, range: 2.2 }] }}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 90, S1, false],
  [90, 230, S2, "dip"],
  [230, 484, S3, "dip"],
  [484, 657, S4, "dip"],
  [657, 798, S5, "dip"],
  [798, 980, S6, "dip"],
  [980, 1104, S7, "dip"],
  [1104, 1281, S8, "dip"],
  [1281, 1426, S9, "dissolve"],
  [1426, 1544, S10, "dip"],
  [1544, TIMING.totalFrames, S11, "dip"],
];

const SFX: Sfx[] = [
  // the vault, the street
  { at: 0, src: sfx("tick"), volume: 0.2, until: 90 },
  { at: SLIP, src: sfx("bolt"), volume: 0.8, space: "room" },
  { at: 90, src: sfx("hooves"), volume: 0.22, until: 230 },
  { at: 90, src: sfx("wind"), volume: 0.15, until: 230 },
  // the lobby
  { at: 230, src: sfx("tick"), volume: 0.12, until: 484 },
  ...foleyCues("thud", [230 + 62, 230 + 74], 0.4, { space: "room" }),
  // the vault door
  { at: 484 + SLAM, src: sfx("clang"), volume: 0.55, space: "room" },
  ...foleyCues("thud", [484 + 166], 0.55, { space: "room" }),
  { at: 484 + BURST, src: sfx("creak"), volume: 0.3, space: "room" },
  // the back door
  { at: 657 + 10, src: sfx("door"), volume: 0.8, space: "outdoor" },
  ...foleyCues("gunshot-2", [657 + SHOT5], 0.6, { space: "outdoor", hit: 0.3 }),
  { at: 657, src: sfx("wind"), volume: 0.18, until: 798 },
  // the hardware store
  { at: 798 + GRAB, src: sfx("clink"), volume: 0.2, space: "room" },
  { at: 798 + GRAB + 16, src: sfx("bolt"), volume: 0.55, space: "room" },
  { at: 798 + 84, src: sfx("door"), volume: 0.7, space: "room" },
  // the vault, waiting
  { at: 980, src: sfx("tick"), volume: 0.15, until: 1104 },
  ...foleyCues("thud", [980 + KICK], 0.75, { space: "room", hit: 0.3 }),
  // the lock
  { at: 1104, src: sfx("tick"), volume: 0.16, until: 1104 + 158 },
  { at: 1104 + 150, src: sfx("clink"), volume: 0.4 },
  { at: 1104 + 163, src: sfx("bolt"), volume: 0.6 },
  { at: 1281 + 106, src: sfx("bolt"), volume: 0.6 },
  // the street fight
  { at: 1426, src: sfx("hooves"), volume: 0.2, until: 1544 },
  ...foleyCues("gunshot-echo", [1426 + VOLLEY[0]], 0.6, { space: "outdoor" }),
  ...foleyCues("gunshot-2", [1426 + VOLLEY[3]], 0.45, { space: "outdoor" }),
  ...foleyCues("gunshot", [1426 + VOLLEY[1]], 0.3, { space: "outdoor" }),
  ...foleyCues("gunshot", [1426 + VOLLEY[4]], 0.9, { space: "outdoor" }),
  ...foleyCues("gunshot-2", [1426 + VOLLEY[2]], 0.55, { space: "outdoor" }),
  ...foleyCues("jingle", [1426 + 20], 0.18, { space: "outdoor" }),
  // the evening
  { at: 1544 + OPEN_H, src: sfx("bolt"), volume: 0.25, space: "room" },
  { at: 1544 + OPEN_D, src: sfx("creak"), volume: 0.25, space: "room" },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.mystery, from: 0, to: 484, volume: 0.36 },
  { src: MUSIC_FILES.tension, from: 484, to: 1080, volume: 0.36 },
  { src: MUSIC_FILES.mystery, from: 1080, to: 1426, volume: 0.34 },
  { src: MUSIC_FILES.tension, from: 1426, to: 1530, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 1530, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady dip="#1e1610" />;
