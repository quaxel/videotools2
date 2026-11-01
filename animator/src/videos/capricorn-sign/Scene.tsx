import React, { useMemo } from "react";
import { Easing } from "remotion";
import * as THREE from "three";
import {
  breathe,
  CameraRig,
  CameraShot,
  canvasTexture,
  Chair,
  Counter,
  Desk,
  Door,
  faceChange,
  getUp,
  Halo,
  Haze,
  InkBox,
  jump,
  Label,
  Lamp,
  lerp3,
  lieDown,
  moodBackground,
  moveChange,
  MUSIC_FILES,
  MusicCue,
  Pine,
  Plant,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Ridge,
  Rock,
  Room,
  Screen,
  Sfx,
  sfx,
  Shelf,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  toonRamp,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import {
  Balloon,
  BeachBall,
  Bunting,
  Cake,
  CardFolder,
  ChatPhone,
  Cliff,
  Cloud,
  CoffeeTable,
  Coin,
  ConfettiBurst,
  ConfettiCannon,
  ConfettiPatch,
  Couch,
  DeskClutter,
  DustPuff,
  FunDial,
  GlassWall,
  HeldCard,
  HeldLaptop,
  Ladder,
  Laptop,
  Lounger,
  MeetingTable,
  MonitorStand,
  Palm,
  Parasol,
  PiggyBank,
  Planner,
  Pool,
  QueuePosts,
  Stamp,
  TaskChair,
  Timer,
  WallClock,
} from "./props";
import { settle } from "../../engine/motion";
import TIMING_JSON from "./timing.json";

// "A Capricorn Schedules Her Fun" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "capricorn-sign";
export const timing = TIMING;

// ---------- cast (every woman has long hair) ----------

const DIANA: PuppetLook = { skin: "#f1c9a5", hair: "#4a2c1a", outfit: "#1f2a4a", glasses: true, long: true };
const RINA: PuppetLook = { skin: "#8d5524", hair: "#1d1a1a", outfit: "#f77f00", long: true };
const TESS: PuppetLook = { skin: "#fbe9d6", hair: "#c0392b", outfit: "#3fae5a", long: true };
const PAULA: PuppetLook = { skin: "#e0ac69", hair: "#e8c15a", outfit: "#9b5de5", long: true };
const TELLER: PuppetLook = { skin: "#c68642", hair: "#9a9aa6", outfit: "#1f5c45", lanyard: "#ffd23f", long: true };

const K = 1.3 / 1060; // metres per puppet unit

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.08, ty = 0.92): CameraShot => ({
  position: lerp3([px + dx, y, pz + 1.85], [px + dx * 0.8, y - 0.03, pz + 1.55], p),
  target: [px, ty, pz],
  fov: 36,
});

// Diana holding her closed laptop against her chest with both hands (pair with <HeldLaptop>).
const HOLD_Y = 470; // units above the feet
const holdLaptop: Partial<PuppetPose> = { reachL: [-80, -HOLD_Y], reachR: [80, -HOLD_Y], frontL: true, frontR: true, handL: "open", handR: "open" };

type Grade = { blur?: number; truth?: number; flash?: number };

// Strong sources only. Monitor glow (cool, low), door light (warm, from behind), laptop glow, desk lamp, low sun.
const monitorLight = (pos: Vec3, strength = 1.1): PuppetLight => ({ points: [{ position: pos, color: "#bfe3ff", strength, range: 1.6 }] });
const lampLight: PuppetLight = { points: [{ position: [0.45, 1.75, -1.6], color: "#ffd9a0", strength: 2.2, range: 2.6 }] };
const sunLight: PuppetLight = { distant: [{ direction: [0.8, 0.5, 0.4], color: "#ffd9a0", strength: 1.4 }] };

// ---------- locations ----------

// The glass office: grey-blue. Diana's desk on the right of her chair, the monitor angled toward her and us.
const DIANA_DESK: [number, number] = [-0.35, -1.45];
const DIANA_STAND: [number, number] = [-0.35, -0.95];
const MONITOR: Vec3 = [0.48, 1.12, -1.72];
const OfficeSet: React.FC<{ camera: CameraShot; f: number; text?: string; textAppear?: number; badge?: number; name?: number; traits?: number; ha?: number; done?: number }> = ({
  camera,
  text = "3:15\nLAUGH",
  textAppear,
  badge,
  name,
  traits,
  ha,
  done,
}) => (
  <Room camera={camera} mood="office" floor="#4a6582" wall="#c9d2db" stripe="#5b7a99" width={9} depth={6} wallPattern="panel" floorPattern="carpet" sun={{ x: -2.0, color: "#e8f4ff", bars: 5 }}>
    <GlassWall position={[0, 0, -2.6]} width={6} panes={6} />
    <ZodiacBadge sign="capricorn" position={[0.0, 2.1, -2.56]} size={0.62} bg="#13235e" fg="#ffffff" appear={badge} />
    <Label text="CAPRICORN" position={[0.0, 1.62, -2.56]} width={0.95} fg="#ffffff" bg="#e0262f" appear={badge === undefined ? undefined : badge - 4} />
    <WallClock position={[-1.35, 2.3, -2.93]} hour={3} minute={15} />
    <Desk position={[0.45, 0, -1.6]} size={[1.0, 0.75, 0.6]} color="#e6ecf2" />
    <MonitorStand position={[0.5, 0.78, -1.78]} />
    <Screen position={MONITOR} size={[0.56, 0.36]} rotation={[0, -0.35, 0]} text={text} glow="#e0262f" bg="#ffffff" appear={textAppear} />
    <DeskClutter x={0.45} y={0.78} z={-1.62} />
    <TaskChair position={[DIANA_DESK[0], 0, DIANA_DESK[1]]} />
    {/* A second desk behind, through the glass line */}
    <Desk position={[-2.1, 0, -1.9]} size={[1.0, 0.75, 0.6]} color="#e6ecf2" />
    <MonitorStand position={[-2.1, 0.78, -2.05]} />
    <Screen position={[-2.1, 1.12, -2.0]} size={[0.5, 0.32]} text={"Q3"} glow="#5b7a99" bg="#e6ecf2" />
    <Plant position={[2.3, 0, -2.2]} scale={1.3} />
    <Shelf position={[1.7, 0, -2.9]} width={0.9} rows={4} color="#5b6b7a" seed={4} />
    {name !== undefined && <Label text="DIANA" position={[-1.25, 1.45, -2.55]} width={0.75} fg="#ffffff" bg="#13235e" appear={name} />}
    {traits !== undefined &&
      ["AMBITIOUS", "RELIABLE", "ALWAYS WORKING"].map((t, i) => (
        <Label key={t} text={t} position={[-1.25, 2.4 - i * 0.3, -2.55]} width={0.95} fg="#13235e" bg="#ffd23f" appear={traits - i * 14} />
      ))}
    {ha !== undefined && <Label text="HA." position={[-0.2, 1.45, -1.4]} width={0.3} fg="#e0262f" bg="#ffffff" appear={ha} />}
    {done !== undefined && <Label text="LAUGH ✓" position={[0.48, 1.42, -1.66]} rotation={[0, -0.35, 0]} width={0.4} fg="#ffffff" bg="#3fae5a" appear={done} />}
  </Room>
);

// The planner wall: white and red.
const PLAN_CELLS: Record<number, string> = { 0: "YEAR 1", 1: "YEAR 2", 2: "YEAR 3", 3: "YEAR 4", 4: "YEAR 5", 5: "PROMOTION", 6: "MBA", 7: "5-YEAR\nPLAN", 8: "HOUSE", 9: "CEO", 10: "GYM 5AM", 11: "SAVE", 12: "SAVE", 13: "SAVE", 14: "SAVE" };
const OCT_CELLS: Record<number, string> = { 0: "MON", 1: "TUE", 2: "WED", 3: "THU", 4: "FRI", 9: "REPORT", 15: "AUDIT", 17: "PARTY\n7-8 PM" };
const PlannerSet: React.FC<{ camera: CameraShot; f: number; october?: boolean; party?: number }> = ({ camera, october, party = 1 }) => (
  <Room camera={camera} mood="daylight" floor="#7a1e2a" wall="#fff6f0" stripe="#e0262f" width={8} depth={6} wallPattern="tile" floorPattern="wood">
    {october ? (
      <Planner position={[0.3, 1.6, -2.93]} title="OCTOBER" cols={5} rows={4} cells={party > 0 ? OCT_CELLS : { ...OCT_CELLS, 17: "" }} hot={party > 0 ? 17 : -1} width={2.4} height={1.6} />
    ) : (
      <Planner position={[0.3, 1.6, -2.93]} title="5-YEAR PLAN" cols={5} rows={3} cells={PLAN_CELLS} hot={7} width={2.4} height={1.5} />
    )}
    <WallClock position={[-1.9, 2.3, -2.93]} hour={6} minute={0} size={0.3} />
    <Plant position={[2.3, 0, -2.5]} />
    <Desk position={[1.9, 0, -2.4]} size={[0.9, 0.75, 0.5]} color="#e0262f" />
  </Room>
);

// The bank hall: green. Teller behind a low counter with a glass screen.
const TELLER_AT: [number, number] = [0.45, -2.95];
const DIANA_BANK: [number, number] = [-0.35, -1.75];
const PIGGY: Vec3 = [0.1, 0.665, -2.35];
const BankSet: React.FC<{ camera: CameraShot; f: number; coin?: number; fund?: number; piggySquash?: Vec3 }> = ({ camera, f, coin = -1, fund, piggySquash }) => (
  <Room camera={camera} mood="office" floor="#e8e4da" wall="#1f5c45" stripe="#d4a63a" width={9} depth={7} wallPattern="panel" floorPattern="tile">
    <Counter position={[0, 0, -2.4]} size={[3.6, 0.62, 0.6]} color="#2e7a5c" top="#f2ead2" />
    {/* Glass screens on the counter with a slot at the bottom */}
    {[-1.2, 0.0, 1.2].map((x) => (
      <group key={x}>
        <mesh position={[x + 0.45, 1.05, -2.45]}>
          <planeGeometry args={[1.1, 0.75]} />
          <meshBasicMaterial color="#cfeaf5" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <InkBox size={[0.03, 0.78, 0.03]} position={[x - 0.1, 1.05, -2.45]} color="#d4a63a" ink={0.003} />
        <Label text="TELLER" position={[x + 0.45, 1.6, -2.44]} width={0.5} fg="#13235e" bg="#f2ead2" />
      </group>
    ))}
    <InkBox size={[0.03, 0.78, 0.03]} position={[2.3, 1.05, -2.45]} color="#d4a63a" ink={0.003} />
    <QueuePosts position={[-2.6, 0, -1.3]} count={3} gap={0.7} />
    <WallClock position={[-1.6, 2.5, -3.43]} hour={9} minute={0} size={0.3} />
    {/* Vault door in the back wall */}
    <group position={[1.9, 1.5, -3.44]}>
      <InkCylinderFlat r={0.65} color="#8a8f98" />
      <InkCylinderFlat r={0.5} color="#b4b9c2" z={0.03} />
      {[0, 1, 2, 3].map((i) => (
        <InkBox key={i} size={[0.7, 0.05, 0.03]} position={[0, 0, 0.07]} rotation={[0, 0, (i * Math.PI) / 4 + f * 0.01]} color="#5b6170" ink={0.003} />
      ))}
    </group>
    <Cake position={[-0.7, 0.665, -2.3]} flame={f * 0.6} />
    <group position={PIGGY} scale={piggySquash ?? [1, 1, 1]}>
      <PiggyBank position={[0, 0, 0]} scale={0.9} />
    </group>
    {coin >= 0 && coin < 1 && <Coin position={[PIGGY[0], PIGGY[1] + 0.75 - coin * 0.47, PIGGY[2]]} />}
    {fund !== undefined && <Label text={"RETIREMENT\nFUND"} position={[PIGGY[0], 1.17, -2.2]} width={0.55} fg="#ffffff" bg="#1f5c45" appear={fund} />}
    <Plant position={[-3.0, 0, -2.8]} scale={1.2} />
  </Room>
);
// A flat inked disc facing +z (vault door rings).
const InkCylinderFlat: React.FC<{ r: number; color: string; z?: number }> = ({ r, color, z = 0 }) => (
  <group position={[0, 0, z]}>
    <mesh>
      <circleGeometry args={[r + 0.02, 40]} />
      <meshBasicMaterial color="#161212" />
    </mesh>
    <mesh position={[0, 0, 0.005]}>
      <circleGeometry args={[r, 40]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
  </group>
);

// The friends' lounge: pink. Couch, coffee table with the PARTY cannon (the seed), a giant phone on the right.
const SOFA: [number, number][] = [
  [-0.62, -1.9],
  [0.0, -1.9],
  [0.62, -1.9],
];
const LoungeSet: React.FC<{ camera: CameraShot; f: number; bubbles?: [string, boolean, number?][]; love?: number; invite?: number }> = ({ camera, bubbles, love, invite }) => (
  <Room camera={camera} mood="warm" floor="#7a2e4a" wall="#ff8fb8" stripe="#ffffff" width={9} depth={6} wallPattern="wallpaper" floorPattern="carpet" sun={{ x: -1.8, color: "#ffe0ee", bars: 4 }}>
    <Couch position={[0, 0, -2.3]} color="#c2185b" width={2.3} />
    <CoffeeTable position={[0, 0, -1.05]} />
    <ConfettiCannon position={[0.22, 0.425, -1.05]} rotation={[0, 0, 0.5]} scale={1.1} />
    <ChatPhone position={[2.1, 0.15, -2.6]} bubbles={bubbles ?? [["BRUNCH SUNDAY?", true], ["DIANA??", true], ["BUSY", false]]} scale={0.9} />
    {love !== undefined && <Label text="WE ♥ DIANA" position={[0, 2.25, -2.92]} width={1.1} fg="#c2185b" bg="#ffffff" appear={love} />}
    {invite !== undefined &&
      SOFA.map(([x], i) => <Label key={i} text={"INVITE\nFUN 7-8"} position={[x, 1.48, -1.8]} width={0.52} fg="#ffffff" bg="#e0262f" appear={invite - i * 5} />)}
    <Lamp position={[-1.6, 2.3, -2.1]} color="#ffe0ee" />
    <Plant position={[-2.4, 0, -2.5]} />
  </Room>
);

// The hotel pool: turquoise and sun. Diana on a lounger with her laptop.
const LOUNGER_AT: [number, number] = [-0.55, -2.0];
const DIANA_POOL: [number, number] = [-0.55, -1.65];
const PoolSet: React.FC<{ camera: CameraShot; f: number; ball?: Vec3; spin?: number; trip?: number }> = ({ camera, f, ball, spin = 0, trip }) => (
  <Room camera={camera} mood="daylight" floor="#f2e6c8" wall="#7fd0ff" width={10} depth={7} wallPattern="plain" floorPattern="tile">
    {/* Hotel blocks and palms against the sky */}
    <InkBox size={[2.6, 1.8, 0.4]} position={[-2.4, 0.9, -3.2]} color="#ffffff" />
    <InkBox size={[2.0, 2.3, 0.4]} position={[2.4, 1.15, -3.2]} color="#fff6dc" />
    {[-3.0, -2.4, -1.8, 1.8, 2.4, 3.0].map((x, i) => (
      <InkBox key={x} size={[0.3, 0.3, 0.02]} position={[x, 1.2 + (i % 2) * 0.6, -2.99]} color="#2ec4c4" ink={0.003} />
    ))}
    <Palm position={[-1.7, 0, -2.6]} scale={0.9} f={f} />
    <Palm position={[1.5, 0, -2.7]} scale={1.05} f={f + 30} />
    <Pool position={[0.7, 0, -0.5]} size={[2.6, 1.3]} f={f} />
    <Lounger position={[LOUNGER_AT[0], 0, LOUNGER_AT[1]]} />
    <Lounger position={[0.45, 0, LOUNGER_AT[1]]} color="#ff6b5a" />
    <Parasol position={[-1.35, 0, -2.4]} />
    {/* Her laptop open on her lap: lid back toward us, screen toward her */}
    <Laptop position={[DIANA_POOL[0], 0.43, DIANA_POOL[1] + 0.2]} rotation={[0, Math.PI, 0]} open={1} text="Q3" scale={0.9} />
    {ball && <BeachBall position={ball} spin={spin} />}
    {trip !== undefined && <Label text="WORK TRIP" position={[0.2, 1.95, -2.95]} width={1.0} fg="#ffffff" bg="#13235e" appear={trip} />}
  </Room>
);

// The meeting room. Dark (night, the door the only light) or lit for the party (yellow, balloons, banner).
const TABLE: Vec3 = [0.35, 0, -1.9];
const DOOR_X = -2.4;
const DIANA_IN: [number, number] = [-1.5, -0.95];
const HIDE: [number, number][] = [
  [-0.25, -2.7],
  [0.35, -2.7],
  [0.95, -2.7],
];
const CANNON_AT: Vec3 = [HIDE[1][0] - 0.12, 0.84, -2.48];
const MeetingSet: React.FC<{
  camera: CameraShot;
  f: number;
  party?: boolean;
  door?: number;
  banner?: number;
  cannon?: { position: Vec3; rotation: Vec3; fire?: number } | null;
  burst?: number;
  floorConfetti?: boolean;
  chairTip?: number;
  timer?: { text: string; ring?: number };
  laptop?: { open: number; text: string } | null;
  children?: React.ReactNode;
}> = ({ camera, f, party, door = 0, banner, cannon, burst = -1, floorConfetti, chairTip = 0, timer, laptop, children }) => (
  <Room
    camera={camera}
    mood={party ? "golden" : "night"}
    floor={party ? "#8a5a1e" : "#141a30"}
    wall={party ? "#ffd23f" : "#1d2a4a"}
    stripe={party ? "#e0262f" : "#2a3a66"}
    width={9}
    depth={6}
    wallPattern="panel"
    floorPattern="carpet"
  >
    <MeetingTable position={TABLE} size={[2.4, 0.9]} color={party ? "#8a5a3a" : "#3a2a20"} />
    <Chair position={[TABLE[0] + 1.45, 0, TABLE[2]]} rotationY={-Math.PI / 2} color={party ? "#13235e" : "#1d1a2a"} />
    <TaskChair position={[DIANA_IN[0] + 0.2, 0, DIANA_IN[1] - 0.6]} tip={chairTip} color={party ? "#13235e" : "#1d1a2a"} />
    <Door position={[DOOR_X, 0, -2.94]} open={door} color={party ? "#fff6dc" : "#2a3a66"} glow={door > 0.05 ? "#ffe6b0" : "#0a1020"} />
    {door > 0.05 && !party && <Halo position={[DOOR_X, 1.0, -2.85]} size={2.4} color="#ffe6b0" strength={0.45 * door} />}
    <Screen position={[TABLE[0], 1.75, -2.92]} size={[1.2, 0.68]} text={party ? "SURPRISE!" : "STANDBY"} glow={party ? "#e0262f" : "#2a3a66"} bg={party ? "#ffffff" : "#05070f"} />
    <Window position={[2.4, 1.6, -2.94]} size={[1.0, 1.1]} sky={party ? "#9fd8ff" : "#0a1020"} blinds />
    {party && (
      <>
        <Bunting y={2.55} z={-2.9} from={-1.6} to={2.2} />
        {banner !== undefined && <Label text="SURPRISE!" position={[TABLE[0], 2.42, -2.88]} width={1.4} fg="#ffffff" bg="#e0262f" appear={banner} />}
        <Balloon anchor={[TABLE[0] + 1.45, 0.9, TABLE[2] - 0.15]} color="#e0262f" f={f} />
        <Balloon anchor={[TABLE[0] + 1.45, 0.9, TABLE[2] + 0.1]} color="#4f7dff" f={f} seed={2} h={0.85} />
        <Balloon anchor={[-2.6, 0.0, -2.6]} color="#ff8fc8" f={f} seed={4} h={1.4} />
        <Balloon anchor={[-2.4, 0.0, -2.5]} color="#3fae5a" f={f} seed={6} h={1.2} />
        <Balloon anchor={[2.9, 0.0, -2.4]} color="#ffd23f" f={f} seed={8} h={1.3} />
        <Cake position={[TABLE[0] + 0.6, 0.765, TABLE[2] + 0.1]} label="♥" flame={f * 0.6} />
      </>
    )}
    {laptop && <Laptop position={[DIANA_IN[0] + 0.62, 0.765, TABLE[2] + 0.25]} rotation={[0, -0.5, 0]} open={laptop.open} text={laptop.text} />}
    {cannon && <ConfettiCannon position={cannon.position} rotation={cannon.rotation} fire={cannon.fire} scale={1.2} />}
    {burst >= 0 && <ConfettiBurst from={[CANNON_AT[0], 1.0, CANNON_AT[2] + 0.1]} to={[DIANA_IN[0], 1.0, DIANA_IN[1] + 0.05]} t={burst} count={120} spread={0.22} />}
    {floorConfetti && <ConfettiPatch x={DIANA_IN[0]} z={DIANA_IN[1] - 0.1} w={1.4} d={0.9} count={110} />}
    {timer && <Timer position={[TABLE[0] - 0.6, 0.765, TABLE[2] + 0.2]} text={timer.text} ring={timer.ring} />}
    {children}
  </Room>
);

// Inside her head: a grey limestone cliff with the endless GOALS ladder, under a re-lit sky with parallax ranges.
type Sky = "dusk" | "cold" | "golden";
const SKIES: Record<Sky, { stops: string[]; far: string; mid: string; near: string; haze: string; fog: string; bg: string; ambient: string; key: string }> = {
  dusk: { stops: ["#1e1546", "#3b2a6b", "#c9577a", "#ff9a5c"], far: "#7a4a8c", mid: "#53336f", near: "#3a2656", haze: "#c9577a", fog: "#6a3f7a", bg: "#3b2a6b", ambient: "#e8c0ff", key: "#ffc890" },
  cold: { stops: ["#0a1a40", "#2a4a8a", "#6a9ad0", "#cfe6ff"], far: "#5a7ab0", mid: "#3a5a90", near: "#24406e", haze: "#9ac0e8", fog: "#4a6a9a", bg: "#2a4a8a", ambient: "#cfe0ff", key: "#e8f0ff" },
  golden: { stops: ["#3a2a6b", "#a85a7a", "#ff9a5c", "#ffd08a"], far: "#a8687a", mid: "#7a4a6a", near: "#4a3050", haze: "#ffb38a", fog: "#a86a6a", bg: "#a85a7a", ambient: "#ffe0c0", key: "#ffd27a" },
};
const LADDER_X = 0;
const LADDER_Z = -1.9;
const STAMP_AT: Vec3 = [0.62, 0.12, -1.55];
const DIAL_AT: Vec3 = [1.35, 0, -1.45];
const LAPTOP_ROCK: Vec3 = [-1.05, 0.3, -1.4];
const MountainSet: React.FC<{
  camera: CameraShot;
  f: number;
  sky?: Sky;
  goals?: number;
  dust?: number;
  puff?: number;
  dial?: number;
  lid?: number;
  laptopText?: string;
  lift?: number; // metres the whole mountain is lowered, so a puppet standing at y = 0 is up on the ladder
  children?: React.ReactNode;
}> = ({ camera, f, sky = "dusk", goals, dust = 1, puff = -1, dial = 2, lid = 1, laptopText = "WORK", lift = 0, children }) => {
  const s = SKIES[sky];
  const camX = camera.position[0];
  const tex = useMemo(
    () =>
      canvasTexture(512, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        s.stops.forEach((c, i) => g.addColorStop(i / (s.stops.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 1024);
      }),
    [s],
  );
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[s.bg]} />
      <fog attach="fog" args={[s.fog, 10, 32]} />
      <ambientLight intensity={1.3} color={s.ambient} />
      <hemisphereLight args={[s.key, "#2a1d45", 0.6]} />
      <directionalLight position={[3, 5, 4]} intensity={2.3} color={s.key} castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={8} shadow-camera-bottom={-4} />
      <group position={[camX, 0, 0]}>
        <mesh position={[0, 8, -24]}>
          <planeGeometry args={[70, 40]} />
          <meshBasicMaterial map={tex} fog={false} toneMapped={false} />
        </mesh>
      </group>
      <group position={[0, -lift, 0]}>
      {/* Parallax ranges: far creeps with the camera, middle holds, near sweeps the other way. */}
      <Ridge z={-20} shift={camX * 0.55} width={60} low={2.0} high={7.0} peaks={6} color={s.far} seed={5} snow="#f2f4ff" />
      <Haze z={-18.6} color={s.haze} />
      <Ridge z={-17} shift={0} width={60} low={1.0} high={4.0} peaks={9} color={s.mid} seed={13} snow="#e8ecff" />
      <Haze z={-16.2} color={s.haze} />
      <Ridge z={-15.2} shift={-camX * 1.1} width={64} low={0.3} high={1.6} peaks={14} color={s.near} seed={29} />
      {/* The ledge she stands on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[9, 6]} />
        <meshToonMaterial color="#8a8a98" gradientMap={toonRamp} />
      </mesh>
      <Cliff position={[0, 0, -2.0]} width={2.4} height={9} seed={3} />
      <Ladder position={[LADDER_X, 0, LADDER_Z]} height={9} />
      {goals !== undefined && <Label text="GOALS" position={[LADDER_X, 2.05, LADDER_Z + 0.06]} width={0.62} fg="#ffffff" bg="#e0262f" appear={goals} />}
      {/* Clouds swallowing the top of the ladder */}
      <Cloud position={[LADDER_X - 0.3, 4.6, LADDER_Z + 0.4]} scale={1.6} />
      <Cloud position={[LADDER_X + 0.5, 5.2, LADDER_Z + 0.5]} scale={1.9} />
      <Cloud position={[LADDER_X - 1.6, 3.9, LADDER_Z + 0.3]} scale={1.2} color="#e8ecff" />
      <Cloud position={[LADDER_X + 1.8, 4.3, LADDER_Z + 0.35]} scale={1.3} color="#e8ecff" />
      {/* The APPROVED stamp on a rock at the foot of the ladder, the FUN dial, the laptop on a rock */}
      <Rock position={[STAMP_AT[0], 0.02, STAMP_AT[2]]} size={0.2} color="#7a7a88" seed={4} />
      <Stamp position={STAMP_AT} dust={dust} />
      <DustPuff position={[STAMP_AT[0], STAMP_AT[1] + 0.35, STAMP_AT[2]]} t={puff} />
      <FunDial position={DIAL_AT} value={dial} />
      <Rock position={[LAPTOP_ROCK[0], 0.05, LAPTOP_ROCK[2]]} size={0.35} color="#7a7a88" seed={8} />
      <Laptop position={LAPTOP_ROCK} rotation={[0, 0.3, 0]} open={lid} text={laptopText} scale={1.3} />
      <Pine position={[-2.6, 0, -1.4]} scale={0.9} />
      <Pine position={[2.5, 0, -1.6]} scale={1.1} />
      <Rock position={[-1.9, 0, -0.6]} size={0.3} seed={11} />
      <Rock position={[2.0, 0, -0.4]} size={0.25} seed={17} />
      </group>
      {children}
    </>
  );
};

// Her study at night: cream, a desk lamp over the folder.
const FOLDER_AT: Vec3 = [0.35, 0.78, -1.65];
const DIANA_STUDY: [number, number] = [-0.4, -1.3];
const StudySet: React.FC<{ camera: CameraShot; f: number; open?: number; cards?: number; children?: React.ReactNode }> = ({ camera, open = 0, cards = 0, children }) => (
  <Room camera={camera} mood="warm" floor="#6b4a2e" wall="#f2e6c8" stripe="#c9a26b" width={8} depth={6} wallPattern="wallpaper" floorPattern="wood">
    <Desk position={[0.35, 0, -1.65]} size={[1.1, 0.75, 0.6]} color="#c99a6b" />
    <CardFolder position={FOLDER_AT} rotationY={0} open={open} cards={cards} />
    {/* Desk lamp */}
    <group position={[0.85, 0.78, -1.85]}>
      <InkBox size={[0.16, 0.02, 0.12]} position={[0, 0.01, 0]} color="#13235e" ink={0.003} />
      <InkBox size={[0.025, 0.42, 0.025]} position={[0, 0.22, 0]} rotation={[0, 0, 0.25]} color="#13235e" ink={0.003} />
      <mesh position={[-0.12, 0.44, 0.02]} rotation={[0, 0, 0.9]}>
        <coneGeometry args={[0.1, 0.16, 20, 1, true]} />
        <meshToonMaterial color="#13235e" side={THREE.DoubleSide} gradientMap={toonRamp} />
      </mesh>
      <Halo position={[-0.2, 0.38, 0.06]} size={0.9} color="#ffd9a0" strength={0.55} />
      <pointLight position={[-0.2, 0.36, 0.05]} intensity={2.5} distance={2.5} color="#ffd9a0" />
    </group>
    <Window position={[-1.5, 1.6, -2.94]} size={[1.0, 1.1]} sky="#13235e" />
    <Shelf position={[1.9, 0, -2.75]} width={1.0} rows={4} color="#8a5a3a" seed={2} />
    <WallClock position={[0.35, 2.2, -2.93]} hour={11} minute={40} size={0.3} />
    {children}
  </Room>
);

// ---------- stage wrappers ----------

type Extra<T> = Partial<Omit<T, "camera" | "f">>;
const office = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof OfficeSet>> = {}, grade: Grade = {}, light?: PuppetLight) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} light={light} {...grade} set={<OfficeSet camera={camera} f={f} {...extra} />} />
);
const planner = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof PlannerSet>> = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<PlannerSet camera={camera} f={f} {...extra} />} />
);
const bank = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof BankSet>> = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<BankSet camera={camera} f={f} {...extra} />} />
);
const lounge = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof LoungeSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<LoungeSet camera={camera} f={f} {...extra} />} />
);
const pool = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof PoolSet>> = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} light={sunLight} set={<PoolSet camera={camera} f={f} {...extra} />} />
);
const meeting = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof MeetingSet>> = {}, grade: Grade = {}, light?: PuppetLight) => (
  <Stage bg={moodBackground(extra.party ? "golden" : "night")} camera={camera} puppets={puppets} light={light} {...grade} set={<MeetingSet camera={camera} f={f} {...extra} />} />
);
const mountain = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof MountainSet>> = {}, grade: Grade = {}) => (
  <Stage
    bg={SKIES[extra.sky ?? "dusk"].bg}
    camera={camera}
    puppets={puppets}
    light={{ distant: [{ direction: [0.8, 0.45, 0.4], color: SKIES[extra.sky ?? "dusk"].key, strength: 1.5 }] }}
    {...grade}
    set={<MountainSet camera={camera} f={f} {...extra} />}
  />
);
const study = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof StudySet>> = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} light={lampLight} set={<StudySet camera={camera} f={f} {...extra} />} />
);

const dianaDesk = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement =>
  pup("diana", DIANA, DIANA_DESK, { sit: true, expression: "determined", lookX: 0.8, armR: [60 + Math.sin(f * 1.3) * 8, -70], armL: [50 + Math.cos(f * 1.1) * 8, -70], bob: breathe(f) * 0.3, ...pose });

// ---------- shots ----------

// Hook: the glass office, the CAPRICORN badge pops on the glass, Diana at her desk.
const HookWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.12, 2.15], [0.08, 1.1, 1.8], f / 40), target: [0.05, 0.98, -1.6], fov: 50 };
  return office(cam, f, [dianaDesk(f)], { badge: f - 2, textAppear: 99 }, {}, monitorLight(MONITOR));
};

// The calendar on the monitor: 3:15 LAUGH.
const CalMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.18, -0.75], [0.12, 1.15, -1.0], f / 34), target: [MONITOR[0], MONITOR[1], MONITOR[2]], fov: 44 };
  return office(cam, f, [], { textAppear: f - 3, badge: 99 });
};

// Diana looks up at the screen, the badge behind her.
const DianaLook: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.55, 1.1, 0.6], [-0.48, 1.08, 0.3], f / 35), target: [-0.15, 1.05, -1.9], fov: 46 };
  return office(cam, f, [dianaDesk(f, { ...faceChange([[0, "determined"], [14, "thinking"]], f), armR: [40, -40], armL: [20, -20], lookX: 1 })], { badge: 99 }, {}, monitorLight(MONITOR));
};

// She laughs exactly once.
const LaughOnce: React.FC = () => {
  const f = useShotFrame();
  const laugh = f >= 12 && f < 30;
  return office(
    close(DIANA_DESK[0], DIANA_DESK[1], f / 41, 0.15, 1.0, 0.82),
    f,
    [dianaDesk(f, { ...faceChange([[0, "neutral"], [12, "excited"], [30, "determined"]], f, 6), armR: laugh ? [150, -30] : [40, -40], armL: [20, -20], headTilt: laugh ? Math.sin(f * 1.2) * 8 : 0, bob: laugh ? Math.sin(f * 1.6) * 10 : 0, lookX: 0.2 })],
    { ha: f - 12, badge: 99 },
    {},
    monitorLight(MONITOR, 0.8),
  );
};

// Straight back to work: LAUGH ticked off, typing.
const BackToWork: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.95, 1.15, 0.55], [0.8, 1.12, 0.3], f / 41), target: [-0.05, 0.92, -1.55], fov: 46 };
  return office(cam, f, [dianaDesk(f, { armR: [70 + Math.sin(f * 2.1) * 14, -80], armL: [60 + Math.cos(f * 1.9) * 14, -80] })], { text: "3:15\nLAUGH", done: f - 6, badge: 99 }, {}, monitorLight(MONITOR));
};

// That's Diana.
const NameIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.3, 1.6], [-0.55, 1.28, 1.25], f / 33), target: [-0.4, 1.2, -1.5], fov: 48 };
  return office(cam, f, [pup("diana", DIANA, DIANA_STAND, { ...moveChange([[0, "determined"], [10, "smug", "wave"], [26, "determined", "handsOnHips"]], f) })], { name: f - 3, badge: 99 });
};

// Low angle: ambitious, reliable, always working.
const TraitsLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 0.4, 1.7], [0.2, 0.42, 1.4], f / 52), target: [-0.45, 1.5, -1.8], fov: 56 };
  return office(cam, f, [pup("diana", DIANA, DIANA_STAND, { ...moveChange([[0, "determined", "handsOnHips"], [26, "smug", "armsCrossed"]], f), lookX: 0.3 })], { name: 99, traits: f - 2, badge: 99 });
};

// Her five-year plan.
const PlanBoard: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.45, 2.1], [0.0, 1.42, 1.75], f / 33), target: [0.0, 1.3, -2.4], fov: 54 };
  return planner(cam, f, [pup("diana", DIANA, [-0.5, -1.3], { ...moveChange([[0, "determined"], [6, "determined", "point"]], f), lookX: 1 })]);
};

// Macro: inside it, its own five-year plan.
const PlanMacro: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.inOut(Easing.cubic)(ramp(f, 0, 32));
  // Cell 7 (row 1, col 2) of the 2.4 x 1.5 board at x 0.3, y 1.6: centre x 0.3, y 1.6 - 0.15 = about 1.48.
  const cam: CameraShot = { position: lerp3([0.25, 1.5, -0.6], [0.3, 1.47, -2.2], p), target: [0.3, 1.47, -2.93], fov: 44 };
  return planner(cam, f, []);
};

// The bank: twenty-six, and a retirement fund.
const BankWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.45, 1.4], [-0.35, 1.4, 1.05], f / 46), target: [0.0, 1.05, -2.3], fov: 50 };
  return bank(cam, f, [
    pup("diana", DIANA, DIANA_BANK, { ...moveChange([[0, "determined"], [14, "determined", "point"]], f), lookX: 0.6 }),
    pup("teller", TELLER, TELLER_AT, { ...faceChange([[0, "neutral"], [18, "confused"]], f), lookX: -0.6 }),
  ]);
};

// Macro: the coin drops into the RETIREMENT FUND.
const PiggyMacro: React.FC = () => {
  const f = useShotFrame();
  const coin = ramp(f, 8, 20);
  const cam: CameraShot = { position: lerp3([PIGGY[0] + 0.3, 1.12, -0.85], [PIGGY[0] + 0.2, 1.08, -1.05], f / 53), target: [PIGGY[0], 0.98, PIGGY[2]], fov: 46 };
  return bank(cam, f, [], { coin: f < 20 ? coin : -1, fund: f - 24, piggySquash: squash(f, 20, 0.2) });
};

// The friends on the couch: they love her (seed: the PARTY cannon on the table).
const sofaPose = (f: number, i: number, pose: Partial<PuppetPose> = {}): Partial<PuppetPose> => ({ sit: true, bob: breathe(f + i * 5) * 0.4, ...pose });
const FriendsCouch: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 1.35, 1.6], [0.05, 1.32, 1.25], f / 37), target: [0, 1.0, -1.9], fov: 52 };
  return lounge(cam, f, [
    pup("rina", RINA, SOFA[0], { expression: "happy", lookX: 0.6, ...sofaPose(f, 0, { armR: [80, -60] }) }),
    pup("tess", TESS, SOFA[1], { expression: "excited", ...sofaPose(f, 1, { armL: [150, -20], armR: [150, -20] }) }),
    pup("paula", PAULA, SOFA[2], { expression: "happy", lookX: -0.6, ...sofaPose(f, 2, { armL: [80, -60] }) }),
  ], { love: f - 4 });
};

// They never see her: the chat.
const ChatShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.6, 1.25, -0.6], [1.95, 1.2, -1.0], f / 35), target: [2.1, 1.0, -2.6], fov: 50 };
  return lounge(cam, f, [pup("paula", PAULA, [1.2, -1.85], { ...faceChange([[0, "neutral"], [14, "sad"]], f), view: "front", lookX: 1 })], {
    bubbles: [["BRUNCH SUNDAY?", true], ["DIANA??", true], ["BUSY", false, f - 12]],
  });
};

// The pool: a work trip.
const PoolWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.4, 1.7, 2.2], [0.9, 1.6, 1.8], f / 40), target: [-0.2, 0.8, -1.8], fov: 50 };
  return pool(cam, f, [pup("diana", DIANA, DIANA_POOL, { sit: true, expression: "determined", lookX: 0, armR: [60 + Math.sin(f * 2) * 10, -80], armL: [55 + Math.cos(f * 1.8) * 10, -80], bob: breathe(f) * 0.3 })], { trip: f - 6 });
};

// Gag: a beach ball bonks her head; she keeps typing.
const BallBonk: React.FC = () => {
  const f = useShotFrame();
  const hit = 14;
  const headY = 0.84;
  const t = f - hit;
  const ball: Vec3 =
    t < 0
      ? [DIANA_POOL[0] + 0.9 + t * -0.065, headY + 0.25 + Math.sin(((f) / hit) * Math.PI) * 0.25, DIANA_POOL[1] + 0.15]
      : [DIANA_POOL[0] - t * 0.05, headY + 0.12 + t * 0.03 - t * t * 0.0022, DIANA_POOL[1] + 0.15 + t * 0.02];
  const cam: CameraShot = { position: lerp3([DIANA_POOL[0] + 0.35, 1.1, 0.0], [DIANA_POOL[0] + 0.3, 1.07, -0.25], f / 33), target: [DIANA_POOL[0], 0.82, DIANA_POOL[1]], fov: 42 };
  return pool(cam, f, [pup("diana", DIANA, DIANA_POOL, { sit: true, expression: "determined", blink: t >= 0 && t < 3 ? true : undefined, headTilt: t >= 0 ? -settle(t, 2.5, 0.35) * 10 : 0, armR: [60 + Math.sin(f * 2) * 10, -80], armL: [55 + Math.cos(f * 1.8) * 10, -80] })], { ball, spin: f * 0.3 });
};

// The dark meeting room: they plan the party.
const PlanParty: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.4, 2.0], [0.2, 1.36, 1.6], f / 37), target: [0.35, 1.15, -2.0], fov: 54 };
  const cannon = { position: [CANNON_AT[0], 0.84, CANNON_AT[2]] as Vec3, rotation: [0, 0, 0.3] as Vec3 };
  return meeting(cam, f, [
    pup("rina", RINA, HIDE[1], { expression: "excited", lookX: -0.5, reachL: [-160, -620], reachR: [-60, -640], frontL: true, frontR: true }),
    pup("tess", TESS, HIDE[0], { ...moveChange([[0, "happy"], [10, "excited", "point"]], f), lookX: 0.5 }),
    pup("paula", PAULA, HIDE[2], { expression: "awkward", lookX: -0.8, armL: [150 + Math.sin(f / 4) * 8, -20] }),
  ], { cannon }, {}, { tint: "#8fa8ff", tintAmount: 0.04 });
};

// They hide behind the table; only eyes and the cannon peek out.
const HideTable: React.FC = () => {
  const f = useShotFrame();
  const sink = Easing.out(Easing.cubic)(ramp(f, 0, 10));
  const cam: CameraShot = { position: lerp3([0.6, 1.1, 0.9], [0.5, 1.05, 0.55], f / 41), target: [0.35, 0.85, -2.4], fov: 48 };
  const cannon = { position: [CANNON_AT[0], 0.62 + 0.2 * (1 - sink), CANNON_AT[2]] as Vec3, rotation: [0, 0, 0] as Vec3 };
  return meeting(cam, f, HIDE.map((at, i) => pup(["tess", "rina", "paula"][i], [TESS, RINA, PAULA][i], at, { expression: i === 1 ? "smug" : "excited", crouch: 0.9 * sink, lookX: -0.9, blink: false })), { cannon });
};

// Diana walks in with her laptop.
const WalkIn: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 6, 30, [DOOR_X, -2.55], [DIANA_IN[0] - 0.15, DIANA_IN[1] - 0.05]);
  const cam: CameraShot = { position: lerp3([-1.45, 1.15, 1.3], [-1.55, 1.12, 1.0], f / 41), target: [-1.95, 0.85, -1.7], fov: 50 };
  const door = Easing.out(Easing.back(1.4))(ramp(f, 0, 8));
  return meeting(
    cam,
    f,
    [pup("diana", DIANA, w.at, { expression: "determined", ...w.pose, view: "front", facing: undefined, ...holdLaptop })],
    { door, children: <HeldLaptop at={w.at} y={HOLD_Y * K} /> },
    {},
    { points: [{ position: [DOOR_X, 1.2, -2.85], color: "#ffe6b0", strength: 2.2, range: 3.2 }] },
  );
};

// Ready to present: she sets the laptop on the table and opens it; its glow on her face.
const Present: React.FC = () => {
  const f = useShotFrame();
  const open = Easing.out(Easing.back(1.6))(ramp(f, 6, 16));
  const cam: CameraShot = { position: lerp3([DIANA_IN[0] + 0.3, 1.12, 1.15], [DIANA_IN[0] + 0.28, 1.1, 0.9], f / 37), target: [DIANA_IN[0] + 0.15, 0.92, -1.2], fov: 46 };
  return meeting(
    cam,
    f,
    [pup("diana", DIANA, DIANA_IN, { ...moveChange([[0, "determined"], [16, "smug", "handsOnHips"]], f), lookX: 0.6 })],
    { door: 1, laptop: { open, text: "Q3\nPLAN" } },
    {},
    { points: [{ position: [DIANA_IN[0] + 0.6, 0.95, TABLE[2] + 0.3], color: "#bfe3ff", strength: 1.6 * open, range: 1.4 }, { position: [DOOR_X, 1.2, -2.85], color: "#ffe6b0", strength: 1.6, range: 3.2 }] },
  );
};

// SURPRISE! Over Diana's shoulder: the lights snap on and the friends spring up from behind the table.
const Surprise: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.88, 1.3, 0.55], [-1.84, 1.28, 0.4], f / 23), target: [-0.4, 1.0, -2.6], fov: 50 };
  const shout = (k: number) => (f < 18 ? 0.5 + 0.4 * Math.sin(f * 0.9 + k) : 0);
  return meeting(
    cam,
    f,
    [
      pup("diana", DIANA, DIANA_IN, { expression: "shocked", view: "back" }),
      pup("tess", TESS, HIDE[0], { expression: "excited", gesture: "cheer", ...jump(f, -6, 200), mouthOpen: shout(0) }),
      pup("rina", RINA, HIDE[1], { expression: "excited", ...jump(f, -4, 180), reachL: [-160, -620], reachR: [-60, -640], frontL: true, frontR: true }),
      pup("paula", PAULA, HIDE[2], { expression: "excited", gesture: "cheer", ...jump(f, -8, 220), mouthOpen: shout(2) }),
    ],
    { party: true, banner: f - 1, laptop: { open: 1, text: "Q3\nPLAN" }, cannon: { position: [CANNON_AT[0] - 0.22, 0.42 + jumpAir(f, -4, 180), CANNON_AT[2]], rotation: [0, 0, 0.3] } },
    { flash: 1 - ramp(f, 0, 5) },
  );
};
// Metres the jump lifts at frame f (for a prop carried by a jumping puppet).
const jumpAir = (f: number, start: number, height: number) => ((jump(f, start, height).air ?? 0) as number) * K;

// The cannon fires.
const CannonFire: React.FC = () => {
  const f = useShotFrame();
  const fire = ramp(f, 6, 10);
  const cam: CameraShot = { position: lerp3([0.0, 1.15, -1.25], [-0.1, 1.12, -1.4], f / 23), target: [CANNON_AT[0], 1.0, -2.6], fov: 46 };
  return meeting(
    cam,
    f,
    [pup("rina", RINA, HIDE[1], { ...faceChange([[0, "excited"], [7, "happy"]], f), lookX: -1, reachL: [-160, -620], reachR: [-60, -640], frontL: true, frontR: true })],
    { party: true, banner: 99, cannon: { position: [CANNON_AT[0], 0.84, CANNON_AT[2]], rotation: [0.25, 0, 0.9], fire }, burst: f - 7 },
  );
};

// Gag: right in the face; she tips over backwards and the chair goes with her.
const FaceHit: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([DIANA_IN[0] + 0.25, 0.95, 1.0], [DIANA_IN[0] + 0.2, 0.9, 0.75], f / 59), target: [DIANA_IN[0], 0.62, DIANA_IN[1]], fov: 52 };
  return meeting(
    cam,
    f,
    [pup("diana", DIANA, DIANA_IN, { ...faceChange([[0, "shocked"], [24, "disgusted"]], f), ...lieDown(f, 6, 16), lookX: 0.6 })],
    { party: true, banner: 99, laptop: { open: 1, text: "Q3\nPLAN" }, burst: f + 12, chairTip: Easing.in(Easing.quad)(ramp(f, 12, 22)), floorConfetti: f > 14 },
  );
};

// "This was not in my calendar." High angle on her, flat on the floor in confetti.
const FloorDeadpan: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([DIANA_IN[0] - 0.7, 0.85, 0.75], [DIANA_IN[0] - 0.72, 0.8, 0.5], f / 45), target: [DIANA_IN[0] - 0.78, 0.25, DIANA_IN[1]], fov: 50 };
  return meeting(cam, f, [pup("diana", DIANA, DIANA_IN, { expression: "skeptical", lie: 1, blink: false })], { party: true, chairTip: 1, floorConfetti: true, children: <ConfettiPatch x={DIANA_IN[0]} z={DIANA_IN[1] + 0.02} w={0.8} d={0.08} y={0.28} count={30} seed={40} /> });
};

// What is going on inside? She gets up, and we push into her eyes.
const GetUpPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 30, 72));
  const side = 1 - Easing.inOut(Easing.cubic)(ramp(f, 4, 26)); // follow her head up from the floor (it lies to screen-left)
  const cam: CameraShot = { position: lerp3([DIANA_IN[0] + 0.1 - side * 0.7, 1.05 - side * 0.35, DIANA_IN[1] + 1.9], [DIANA_IN[0] + 0.02, 0.98, DIANA_IN[1] + 0.25], p), target: [DIANA_IN[0] - side * 0.75, 0.95 - side * 0.6, DIANA_IN[1]], fov: 40 };
  return meeting(cam, f, [pup("diana", DIANA, DIANA_IN, { ...getUp(f, 0, 22), ...faceChange([[0, "bored"], [26, "determined"]], f), lookX: 0 })], { party: true, chairTip: 1, floorConfetti: true, banner: 99 }, { flash: ramp(f, 60, 73) });
};

// The mountain with the GOALS ladder.
const MountainWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.2, 1.5, 3.4], [0.2, 1.7, 3.1], Easing.inOut(Easing.quad)(f / 41)), target: [0, 2.2, -2.0], fov: 54 };
  return mountain(cam, f, [], { goals: f - 14 }, { flash: 1 - ramp(f, 0, 10) });
};

// Low angle up the ladder into the clouds: no top.
const LadderUp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 0.35, -0.6], [0.3, 0.4, -0.85], f / 30), target: lerp3([0, 1.9, -1.9], [0, 3.3, -1.9], f / 30), fov: 60 };
  return mountain(cam, f, [], { goals: 99 });
};

// She is still climbing (from behind, rung by rung).
const CLIMB_AT: [number, number] = [LADDER_X, LADDER_Z + 0.16];
const RUNG = 0.28;
const climbPose = (f: number): Partial<PuppetPose> => {
  const c = Math.sin(f / 4);
  return { view: "back", armL: [160 + c * 12, -20], armR: [160 - c * 12, -20], legSwing: c * 18, bob: Math.abs(c) * 4 };
};
// Rung by rung: each step eases up one rung (feet always land on a rung at y = 0 of the puppet).
const climbLift = (f: number, first: number) => {
  const step = Math.floor(f / 8);
  const u = Easing.inOut(Easing.quad)(Math.min(1, (f % 8) / 6));
  return 0.25 + (first + step + u) * RUNG;
};
const Climb: React.FC = () => {
  const f = useShotFrame();
  const lift = climbLift(f, 2);
  const cam: CameraShot = { position: [0.85 - f * 0.004, 0.45, 0.6], target: [0, 0.95, -1.9], fov: 52 };
  return mountain(cam, f, [pup("diana", DIANA, CLIMB_AT, { expression: "determined", ...climbPose(f) })], { goals: 99, sky: "golden", lift });
};

// Gag: she slips down the ladder but holds the laptop up safe.
const Slip: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 4, 14));
  const top = climbLift(39, 2);
  const lift = top - fall * 3 * RUNG * 1.0 + (f > 14 ? settle(f - 14, 2.6, 0.4) * 0.05 : 0);
  const cam: CameraShot = { position: lerp3([0.35, 1.25, 1.2], [0.3, 1.2, 0.95], f / 34), target: [0, 1.15, -1.9], fov: 50 };
  const up: Partial<PuppetPose> = { reachR: [300, -880], handR: "open", armL: [130 + Math.sin(f / 2) * 25, -30] };
  return mountain(cam, f, [pup("diana", DIANA, CLIMB_AT, { ...faceChange([[0, "determined"], [5, "shocked"], [24, "determined"]], f), ...up, legSwing: Math.sin(f / 2) * 25 * (f < 16 ? 1 : 0), hair: { lift: f > 4 && f < 16 ? 80 : 0 } })], {
    goals: 99,
    sky: "golden",
    lift,
    children: <HeldLaptop at={CLIMB_AT} y={880 * K + 0.13} dx={300 * K + 0.02} tilt={Math.sin(f / 3) * 0.08 * (f < 18 ? 1 : 0)} />,
  });
};

// Tilt down to the foot of the ladder: the APPROVED stamp, covered in dust.
const StampTilt: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.inOut(Easing.cubic)(ramp(f, 0, 22));
  const cam: CameraShot = { position: lerp3([0.9, 2.4, 0.9], [0.95, 0.75, -0.35], p), target: lerp3([0.2, 3.0, -1.9], [STAMP_AT[0], 0.0, STAMP_AT[2]], p), fov: 50 };
  return mountain(cam, f, [], { sky: "cold", goals: 99 });
};

// Macro on the stamp; a puff blows the dust off the label.
const StampMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([STAMP_AT[0] + 0.1, 0.4, -0.75], [STAMP_AT[0] + 0.05, 0.36, -0.95], f / 41), target: [STAMP_AT[0], 0.05, STAMP_AT[2]], fov: 44 };
  return mountain(cam, f, [], { sky: "cold", puff: f - 24, dust: 1 });
};

// The FUN dial, set to two; Diana by it.
const DialWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.3, 1.7], [0.95, 1.28, 1.4], f / 39), target: [1.08, 1.0, -1.4], fov: 52 };
  return mountain(cam, f, [pup("diana", DIANA, [0.72, -1.0], { ...moveChange([[0, "determined"], [16, "thinking", "chin"]], f), lookX: 1 })], { sky: "cold", dial: 2 });
};

// Macro: she turns it up a notch; it snaps straight back to two.
const DialSnap: React.FC = () => {
  const f = useShotFrame();
  const up = ramp(f, 4, 12);
  const back = f > 18 ? 1 - settle(f - 18, 2.8, 0.35) : 0;
  const value = 2 + 1.6 * up * (1 - back);
  const cam: CameraShot = { position: lerp3([DIAL_AT[0] - 0.1, 1.05, -0.35], [DIAL_AT[0] - 0.05, 1.03, -0.55], f / 38), target: [DIAL_AT[0], 0.98, DIAL_AT[2]], fov: 44 };
  return mountain(cam, f, [], { sky: "cold", dial: value });
};

// And a laptop that never closes: the lid shuts and springs back open, twice.
const lidAt = (f: number, at: number) => {
  const t = f - at;
  if (t < 0) return 1;
  if (t < 6) return 1 - 0.95 * Easing.in(Easing.quad)(t / 6);
  return 1 - 0.95 * settle(t - 6, 2.0, 0.42);
};
const LaptopOpen: React.FC = () => {
  const f = useShotFrame();
  const lid = Math.min(1.08, Math.max(0, lidAt(f, 8)));
  const cam: CameraShot = { position: lerp3([LAPTOP_ROCK[0] + 0.5, 0.9, -0.1], [LAPTOP_ROCK[0] + 0.35, 0.85, -0.35], f / 32), target: [LAPTOP_ROCK[0], 0.5, LAPTOP_ROCK[2]], fov: 44 };
  return mountain(cam, f, [], { sky: "dusk", lid, laptopText: "WORK" });
};
const LaptopAgain: React.FC = () => {
  const f = useShotFrame();
  const lid = Math.min(1.08, Math.max(0, lidAt(f, 6)));
  const cam: CameraShot = { position: lerp3([LAPTOP_ROCK[0] - 0.15, 0.75, -0.55], [LAPTOP_ROCK[0] - 0.1, 0.7, -0.75], f / 32), target: [LAPTOP_ROCK[0], 0.5, LAPTOP_ROCK[2]], fov: 42 };
  return mountain(cam, f, [], { sky: "dusk", lid, laptopText: "STILL\nWORKING" });
};

// Her secret: late at night she opens a drawer and hugs a birthday card.
const Secret: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.2, 1.0], [-0.18, 1.16, 0.7], f / 38), target: [-0.05, 0.95, -1.5], fov: 50 };
  return study(cam, f, [pup("diana", DIANA, DIANA_STUDY, { ...faceChange([[0, "worried"], [20, "awkward"]], f), lookX: Math.sin(f / 5) > 0 ? 1 : -1 })]);
};
const CardHug: React.FC = () => {
  const f = useShotFrame();
  const at = DIANA_STUDY;
  const hy = 640;
  return study(close(at[0], at[1], f / 32, 0.2, 1.0, 0.78), f, [pup("diana", DIANA, at, { ...faceChange([[0, "awkward"], [10, "happy"]], f), reachL: [-70, -hy], reachR: [70, -hy], frontL: true, frontR: true, headTilt: Math.sin(f / 7) * 6 })], {
    children: <HeldCard position={[at[0], hy * K + 0.02, at[1] + 0.1]} open={ramp(f, 4, 14)} tilt={Math.sin(f / 7) * 0.08} />,
  });
};

// Top-down: the folder labelled IMPORTANT, then it opens on every birthday card.
const FolderTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([FOLDER_AT[0] + 0.17, 1.75, FOLDER_AT[2] + 0.06], [FOLDER_AT[0] + 0.17, 1.55, FOLDER_AT[2] + 0.04], f / 33), target: [FOLDER_AT[0] + 0.17, FOLDER_AT[1], FOLDER_AT[2]], fov: 44 };
  return study(cam, f, [], { open: 0 });
};
const FolderOpen: React.FC = () => {
  const f = useShotFrame();
  const open = Easing.inOut(Easing.cubic)(ramp(f, 2, 14));
  const cam: CameraShot = { position: lerp3([FOLDER_AT[0] + 0.05, 1.6, FOLDER_AT[2] + 0.06], [FOLDER_AT[0] + 0.08, 1.45, FOLDER_AT[2] + 0.04], f / 31), target: [FOLDER_AT[0] + 0.05, FOLDER_AT[1], FOLDER_AT[2]], fov: 46 };
  return study(cam, f, [], { open, cards: ramp(f, 12, 24) });
};

// The party: exactly one hour, on a timer.
const PartyDance: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.35, 2.3], [0.05, 1.33, 1.95], f / 34), target: [0.0, 1.05, -1.6], fov: 56 };
  const dance = (k: number) => ({ bob: Math.abs(Math.sin(f / 4 + k)) * -16, headTilt: Math.sin(f / 4 + k) * 10 });
  return meeting(cam, f, [
    pup("diana", DIANA, [-0.62, -1.0], { expression: "neutral", armL: [40 + Math.sin(f / 4) * 20, -30], armR: [40 - Math.sin(f / 4) * 20, -30], lookX: 0.8 }),
    pup("tess", TESS, [-0.1, -1.2], { expression: "excited", gesture: "cheer", ...dance(0) }),
    pup("paula", PAULA, [0.42, -1.25], { expression: "happy", gesture: "clap", ...dance(1.5) }),
    pup("rina", RINA, [0.92, -1.15], { expression: "excited", gesture: "cheer", ...dance(3) }),
  ], { party: true, banner: 99, chairTip: 1, timer: { text: `0:0${Math.max(0, 9 - Math.floor(f / 4))}` } });
};

// Ding: time's up. She stops dead and leaves with the laptop.
const TimeUp: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 12, 18, [-0.62, -1.0], [-1.2, -1.0]);
  const cam: CameraShot = { position: lerp3([-0.8, 1.2, 0.9], [-0.9, 1.18, 0.65], f / 27), target: [-1.0, 0.95, -1.6], fov: 48 };
  return meeting(
    cam,
    f,
    [pup("diana", DIANA, w.at, { ...faceChange([[0, "neutral"], [4, "determined"]], f), ...w.pose, view: "front", facing: undefined, ...holdLaptop })],
    { party: true, banner: 99, chairTip: 1, timer: { text: "0:00", ring: f < 18 ? f : 0 }, children: <HeldLaptop at={w.at} y={HOLD_Y * K} /> },
  );
};

// She books the next party for October.
const BookOctober: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.45, 2.1], [-0.05, 1.42, 1.75], f / 38), target: [0.0, 1.3, -2.4], fov: 54 };
  return planner(cam, f, [pup("diana", DIANA, [-0.5, -1.3], { ...moveChange([[0, "determined"], [8, "smug", "point"]], f), lookX: 1 })], { october: true, party: f >= 16 ? 1 : 0 });
};
const OctoberMacro: React.FC = () => {
  const f = useShotFrame();
  // Cell 17 (row 3, col 2) of the 2.4 x 1.6 board: x 0.3, y 1.6 - 0.8 + 0.16 + 1.28 * (0.5 / 4) ... about 0.94.
  const cam: CameraShot = { position: lerp3([0.35, 1.0, -1.6], [0.32, 0.98, -1.95], f / 33), target: [0.3, 0.94, -2.93], fov: 40 };
  return planner(cam, f, [], { october: true, party: 1 });
};

// She sends everyone a calendar invite.
const Invites: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.5], [0.05, 1.32, 1.15], f / 37), target: [0, 1.1, -1.9], fov: 52 };
  return lounge(cam, f, [
    pup("rina", RINA, SOFA[0], { ...moveChange([[0, "happy"], [10, "shocked"], [20, "happy", "facepalm"]], f), sit: true }),
    pup("tess", TESS, SOFA[1], { ...moveChange([[0, "happy"], [14, "confused", "scratchHead"]], f), sit: true }),
    pup("paula", PAULA, SOFA[2], { ...moveChange([[0, "happy"], [18, "bored", "facepalm"]], f), sit: true }),
  ], { invite: f - 6 });
};

// Back where we began: the office, the invite sent. She laughs exactly once.
const FinalOffice: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.3, 1.2], [0.05, 1.26, 0.85], f / 38), target: [0.1, 1.1, -2.0], fov: 50 };
  return office(cam, f, [dianaDesk(f, { ...faceChange([[0, "determined"], [14, "smug"]], f), armR: [40, -40], armL: [20, -20], lookX: 0.4 })], { text: "INVITE\nSENT ✓", textAppear: f - 4, badge: 99 }, {}, monitorLight(MONITOR));
};

const SHOTS: Shot[] = [
  [0, 40, HookWide, false],
  [40, 74, CalMacro, false],
  [74, 109, DianaLook, false],
  [109, 150, LaughOnce, false],
  [150, 191, BackToWork, false],
  [191, 240, NameIntro, false],
  [240, 292, TraitsLow, false],
  [292, 325, PlanBoard, true],
  [325, 359, PlanMacro, false],
  [359, 405, BankWide, true],
  [405, 458, PiggyMacro, false],
  [458, 495, FriendsCouch, true],
  [495, 530, ChatShot, false],
  [530, 570, PoolWide, true],
  [570, 603, BallBonk, false],
  [603, 640, PlanParty, true],
  [640, 681, HideTable, false],
  [681, 722, WalkIn, false],
  [722, 759, Present, false],
  [759, 782, Surprise, false],
  [782, 805, CannonFire, false],
  [805, 841, FaceHit, false],
  [841, 886, FloorDeadpan, false],
  [886, 959, GetUpPush, false],
  [959, 1000, MountainWide, true],
  [1000, 1030, LadderUp, false],
  [1030, 1069, Climb, false],
  [1069, 1103, Slip, false],
  [1103, 1145, StampTilt, false],
  [1145, 1186, StampMacro, false],
  [1186, 1225, DialWide, false],
  [1225, 1263, DialSnap, false],
  [1263, 1295, LaptopOpen, false],
  [1295, 1327, LaptopAgain, false],
  [1327, 1365, Secret, true],
  [1365, 1397, CardHug, false],
  [1397, 1430, FolderTop, false],
  [1430, 1461, FolderOpen, false],
  [1461, 1495, PartyDance, true],
  [1495, 1522, TimeUp, false],
  [1522, 1560, BookOctober, true],
  [1560, 1593, OctoberMacro, false],
  [1593, 1630, Invites, true],
  [1630, TIMING.totalFrames, FinalOffice, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.07, until: 292 },
  { at: 3, src: sfx("pop"), volume: 0.35 },
  { at: 44, src: sfx("chime"), volume: 0.3 },
  ...[150, 156, 162, 169, 174, 180].map((at) => ({ at, src: sfx("tick"), volume: 0.14 })),
  { at: 156, src: sfx("pop"), volume: 0.25 },
  { at: 194, src: sfx("pop"), volume: 0.3 },
  ...[242, 256, 270].map((at) => ({ at, src: sfx("pop"), volume: 0.25 })),
  { at: 299, src: sfx("button"), volume: 0.3 },
  { at: 330, src: sfx("whoosh"), volume: 0.2 },
  { at: 373, src: sfx("paper"), volume: 0.2 },
  { at: 413, src: sfx("credit-blip"), volume: 0.25 },
  { at: 425, src: sfx("chime"), volume: 0.25 },
  { at: 429, src: sfx("pop"), volume: 0.3 },
  { at: 462, src: sfx("pop"), volume: 0.3 },
  { at: 507, src: sfx("near-miss"), volume: 0.15 },
  ...[534, 540, 546, 552].map((at) => ({ at, src: sfx("tick"), volume: 0.12 })),
  { at: 584, src: sfx("boom"), volume: 0.25 },
  { at: 603, src: sfx("hum"), volume: 0.08, until: 759 },
  { at: 641, src: sfx("whoosh"), volume: 0.15 },
  { at: 681, src: sfx("door"), volume: 0.35 },
  { at: 733, src: sfx("button"), volume: 0.3 },
  { at: 740, src: sfx("riser"), volume: 0.12 },
  { at: 759, src: sfx("sting"), volume: 0.3 },
  { at: 760, src: sfx("button"), volume: 0.35 },
  { at: 788, src: sfx("boom"), volume: 0.4 },
  { at: 789, src: sfx("paper"), volume: 0.3 },
  { at: 811, src: sfx("whoosh"), volume: 0.25 },
  { at: 823, src: sfx("boom"), volume: 0.35 },
  { at: 826, src: sfx("near-miss"), volume: 0.15 },
  { at: 908, src: sfx("riser"), volume: 0.1 },
  { at: 952, src: sfx("whoosh"), volume: 0.3 },
  { at: 959, src: sfx("ambience"), volume: 0.08, until: 1327 },
  { at: 975, src: sfx("pop"), volume: 0.3 },
  ...[1034, 1042, 1050, 1058].map((at) => ({ at, src: sfx("tick"), volume: 0.12 })),
  { at: 1074, src: sfx("tape-stop"), volume: 0.25 },
  { at: 1084, src: sfx("boom"), volume: 0.3 },
  { at: 1170, src: sfx("whoosh"), volume: 0.25 },
  ...[1229, 1233, 1237].map((at) => ({ at, src: sfx("tick"), volume: 0.2 })),
  { at: 1243, src: sfx("reel-stop"), volume: 0.25 },
  { at: 1277, src: sfx("stamp"), volume: 0.3 },
  { at: 1281, src: sfx("button"), volume: 0.25 },
  { at: 1307, src: sfx("stamp"), volume: 0.3 },
  { at: 1311, src: sfx("button"), volume: 0.25 },
  { at: 1327, src: sfx("hum"), volume: 0.06, until: 1461 },
  { at: 1335, src: sfx("drawer"), volume: 0.3 },
  { at: 1370, src: sfx("chime"), volume: 0.2 },
  { at: 1432, src: sfx("paper"), volume: 0.3 },
  { at: 1442, src: sfx("paper"), volume: 0.25 },
  { at: 1461, src: sfx("ambience"), volume: 0.08, until: 1522 },
  ...[1461, 1473, 1485].map((at) => ({ at, src: sfx("tick"), volume: 0.15 })),
  { at: 1495, src: sfx("chime"), volume: 0.4 },
  { at: 1500, src: sfx("chime"), volume: 0.35 },
  { at: 1538, src: sfx("stamp"), volume: 0.35 },
  { at: 1564, src: sfx("pop"), volume: 0.25 },
  ...[1599, 1604, 1609].map((at) => ({ at, src: sfx("credit-blip"), volume: 0.25 })),
  { at: 1634, src: sfx("chime"), volume: 0.25 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 603, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 603, to: 759, volume: 0.13 },
  { src: MUSIC_FILES.upbeat, from: 759, to: 886, volume: 0.12 },
  { src: MUSIC_FILES.mystery, from: 886, to: 1327, volume: 0.13 },
  { src: MUSIC_FILES.lounge, from: 1327, to: 1461, volume: 0.12 },
  { src: MUSIC_FILES.upbeat, from: 1461, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
