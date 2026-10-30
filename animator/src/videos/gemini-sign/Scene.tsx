import React from "react";
import { Easing } from "remotion";
import {
  breathe,
  CameraShot,
  Chair,
  Door,
  InkBox,
  Label,
  Lamp,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  Plant,
  PuppetBillboard,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Screen,
  Sfx,
  sfx,
  Shelf,
  Shot,
  squash,
  stroll,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import { Bubble, BrunchTable, CAR_SEAT_X, ChatPhone, CoffeeSplash, Flag, HangingJacket, Peak, Rock, SpinningCoin, Stain, Switchboard, Tree, TwinCar } from "./props";
import TIMING_JSON from "./timing.json";

// "Your Gemini Friend Is Two People" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "gemini-sign";
export const timing = TIMING;

// ---------- cast ----------

const LILY: PuppetLook = { skin: "#f6dcc4", hair: "#3a2418", outfit: "#ff5fa8", long: true };
const LILY_B: PuppetLook = { skin: "#f6dcc4", hair: "#3a2418", outfit: "#2f6bff", long: true };
const HANA: PuppetLook = { skin: "#f3d2b3", hair: "#1d1a1a", outfit: "#f2b630", long: true };
const GRACE: PuppetLook = { skin: "#fff3e6", hair: "#a0442a", outfit: "#3fbf9f", glasses: true, long: true };
const WAITER: PuppetLook = { skin: "#8d5a3b", hair: "#e8c15a", outfit: "#ffffff", lanyard: "#1d1a1a", long: true };

const PHONE_R = { item: "phone", hand: "R" } as const;
const CUP_R = { item: "cup", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.02, d = 1.85): CameraShot => ({
  position: lerp3([px + dx, y, pz + d], [px + dx * 0.8, y - 0.02, pz + d - 0.25], p),
  target: [px, y - 0.12, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// Brunch café: pastel yellow by day, cold blue after the twist.
const TABLE: Vec3 = [0, 0, -1.1];
const SEAT_L: [number, number] = [-0.66, -1.1];
const SEAT_R: [number, number] = [0.66, -1.1];
const SEAT_B: [number, number] = [0.05, -1.75];
type CafeMode = "day" | "cold";
const CafeSet: React.FC<{ camera: CameraShot; f: number; mode?: CafeMode; badge?: number; lily?: number; traits?: number; tip?: number; clock?: number }> = ({
  camera,
  mode = "day",
  badge,
  lily,
  traits,
  tip = 0,
  clock,
}) => {
  const day = mode === "day";
  return (
    <Room
      camera={camera}
      mood={day ? "warm" : "cold"}
      floor={day ? "#c99a6b" : "#3a4a66"}
      wall={day ? "#ffe28a" : "#5b7fb8"}
      stripe={day ? "#ffffff" : "#c9ddff"}
      width={9}
      depth={6}
      wallPattern="wallpaper"
      floorPattern="wood"
      sun={day ? { x: 1.8, color: "#fff2c0", bars: 4 } : undefined}
    >
      {badge !== undefined && <ZodiacBadge sign="gemini" position={[-0.55, 2.45, -2.92]} size={0.7} bg="#ffd23f" fg="#2f6bff" appear={badge} />}
      {badge !== undefined && <Label text="GEMINI" position={[0.45, 2.45, -2.94]} width={1.1} fg="#ffffff" bg="#2f6bff" appear={badge - 4} />}
      {lily !== undefined && <Label text="LILY" position={[-1.7, 1.95, -2.92]} width={0.6} fg="#ffffff" bg="#ff5fa8" appear={lily} />}
      {traits !== undefined &&
        ["FUNNY", "CURIOUS", "FAST"].map((t, i) => (
          <Label key={t} text={t} position={[-0.35, 2.05 - i * 0.34, -2.9]} width={0.9} fg="#13235e" bg="#ffd23f" appear={traits - i * 12} />
        ))}
      {clock !== undefined && <Label text={"4 MINUTES\nAGO"} position={[-0.55, 2.15, -2.92]} width={0.85} fg="#ffffff" bg="#13235e" appear={clock} />}
      <Window position={[2.4, 1.6, -2.94]} size={[1.2, 1.0]} sky={day ? "#cfe9ff" : "#1b2a5e"} />
      <Label text="BRUNCH" position={[2.4, 2.4, -2.92]} width={0.8} fg="#ffffff" bg="#e76f51" />
      <Shelf position={[-2.8, 0, -2.6]} width={1.0} rows={3} color="#8a5a3a" seed={4} />
      <Plant position={[3.1, 0, -2.4]} />
      {day && <Lamp position={[0, 2.35, -1.1]} color="#ffd27a" />}
      <BrunchTable position={TABLE} tip={tip} top={day ? "#fff6dc" : "#dbe6ff"} />
      <Chair position={[SEAT_L[0] - 0.05, 0, SEAT_L[1]]} rotationY={Math.PI / 2} color="#e76f51" />
      <Chair position={[SEAT_R[0] + 0.05, 0, SEAT_R[1]]} rotationY={-Math.PI / 2} color="#e76f51" />
      <Chair position={[SEAT_B[0], 0, SEAT_B[1] - 0.05]} color="#e76f51" />
    </Room>
  );
};

// Group-chat room: purple dream, a wall of twelve buzzing phones.
const CHATS = ["BOOK CLUB", "GYM", "WORK", "FAMILY", "HIKING", "BRUNCH", "TAROT", "PLANTS", "COUSINS", "UNI", "DOGS", "DRAMA"];
const chatAt = (i: number): Vec3 => [-1.2 + (i % 4) * 0.8, 2.5 - Math.floor(i / 4) * 0.66, -2.85];
const ChatSet: React.FC<{ camera: CameraShot; f: number; count?: number; bff?: number }> = ({ camera, f, count, bff }) => (
  <Room camera={camera} mood="dream" floor="#3a2450" wall="#7b2cbf" stripe="#ffd23f" width={8} depth={6} wallPattern="panel" floorPattern="carpet" sun={{ x: -2.0, color: "#e0c3ff", bars: 5 }}>
    {CHATS.map((name, i) => (
      <ChatPhone key={name} position={chatAt(i)} name={bff !== undefined && bff - i * 2 >= 0 ? "BFF!" : name} f={f} seed={i} glow={["#ff8fc8", "#4dff9a", "#ffd23f", "#7fd3ff"][i % 4]} />
    ))}
    {count !== undefined && <Screen position={[2.55, 1.85, -2.85]} size={[0.9, 0.55]} text={"12\nCHATS"} glow="#4dff9a" bg="#14102a" appear={count} count={Math.min(1, Math.max(0, count / 14))} />}
    <Shelf position={[-2.9, 0, -2.6]} width={0.9} rows={3} color="#3a2450" seed={8} />
  </Room>
);

// Corridor to the bathroom: teal tile, a coat hook by the WC door.
const WC_X = 0.9;
const HOOK: Vec3 = [-0.45, 1.6, -2.94];
const CorridorSet: React.FC<{ camera: CameraShot; f: number; door?: number; hook?: "blue" | "pink"; sway?: number }> = ({ camera, door = 0, hook = "blue", sway = 0 }) => (
  <Room camera={camera} mood="daylight" floor="#d8f0ee" wall="#2a9d8f" stripe="#ffffff" width={8} depth={6} wallPattern="tile" floorPattern="tile" sun={{ x: -1.8, color: "#e8fff9", bars: 3 }}>
    <Door position={[WC_X, 0, -2.94]} open={door} color="#ffffff" glow="#fff6d8" sign="WC" />
    <HangingJacket position={HOOK} color={hook === "blue" ? "#2f6bff" : "#ff5fa8"} sway={sway} />
    <Plant position={[-2.4, 0, -2.5]} />
    <Window position={[-1.7, 1.7, -2.94]} size={[0.7, 0.9]} sky="#cfe9ff" blinds />
    <Lamp position={[0.2, 2.5, -2.3]} color="#e8fff9" />
  </Room>
);

// Inside her head: neon pink garage with the two-wheeled car.
const CAR: Vec3 = [0, 0, -1.0];
const SEAT_A: [number, number] = [CAR[0] - CAR_SEAT_X, CAR[2]];
const SEAT_B2: [number, number] = [CAR[0] + CAR_SEAT_X, CAR[2]];
const CarSet: React.FC<{ camera: CameraShot; f: number; turnA?: number; turnB?: number; dice?: number; dx?: number; inside?: number; moodA?: number; moodB?: number; map?: number; decisions?: number }> = ({
  camera,
  f,
  turnA,
  turnB,
  dice,
  dx = 0,
  inside,
  moodA,
  moodB,
  map,
  decisions,
}) => (
  <Room camera={camera} mood="neon" floor="#2a0d22" wall="#8a1462" stripe="#4dd2ff" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
    {inside !== undefined && <Label text="INSIDE LILY" position={[0, 2.75, -2.92]} width={1.4} fg="#ffffff" bg="#13235e" appear={inside} />}
    <ZodiacBadge sign="gemini" position={[-1.85, 2.6, -2.92]} size={0.5} bg="#ffd23f" fg="#2f6bff" />
    <TwinCar position={[CAR[0] + dx, 0, CAR[2]]} turnA={turnA} turnB={turnB} dice={dice} lean={dx * 0.3} labels={false} />
    {moodA !== undefined && <Label text="MOOD A" position={[SEAT_A[0] - 0.15, 1.6, CAR[2] - 0.35]} width={0.7} fg="#ffffff" bg="#ff5fa8" appear={moodA} />}
    {moodB !== undefined && <Label text="MOOD B" position={[SEAT_B2[0] + 0.15, 1.6, CAR[2] - 0.35]} width={0.7} fg="#ffffff" bg="#2f6bff" appear={moodB} />}
    {map !== undefined && <Label text="NO MAP" position={[CAR[0] + dx, 0.66, CAR[2] + 0.95]} rotation={[-0.5, 0, 0]} width={0.5} fg="#13235e" bg="#ffd23f" appear={map} />}
    <SpinningCoin position={[CAR[0] + dx, 0.64, CAR[2] + 0.62]} f={f} size={0.1} />
    {decisions !== undefined && <Label text="DECISIONS" position={[CAR[0] + dx, 1.1, CAR[2] + 0.62]} width={0.45} fg="#ffffff" bg="#13235e" appear={decisions} />}
    <InkBox size={[0.6, 0.04, 2.6]} position={[-2.6, 0.02, -1.0]} color="#ffd23f" ink={0} />
    <InkBox size={[0.6, 0.04, 2.6]} position={[2.6, 0.02, -1.0]} color="#ffd23f" ink={0} />
  </Room>
);

// The switchboard room: golden orange.
const BOARD: Vec3 = [0, 0, -2.45];
const BoardSet: React.FC<{ camera: CameraShot; f: number; title?: number; twelve?: number; buzz?: number }> = ({ camera, f, title, twelve, buzz = 1 }) => (
  <Room camera={camera} mood="golden" floor="#7a3e1a" wall="#f4a261" stripe="#ffffff" width={8} depth={6} wallPattern="brick" floorPattern="wood" sun={{ x: 1.6, color: "#ffe6a8", bars: 4 }}>
    <Switchboard position={BOARD} f={f} buzz={buzz} />
    <Label text="GROUP CHATS" position={[0, 2.45, -2.36]} width={1.5} fg="#ffffff" bg="#e0262f" appear={title ?? 99} />
    {twelve !== undefined && <Screen position={[1.55, 1.75, -2.85]} size={[0.75, 0.5]} text={"12\nCABLES"} glow="#ffd23f" bg="#1a0d05" appear={twelve} count={Math.min(1, Math.max(0, twelve / 16))} />}
    <Lamp position={[-1.5, 2.5, -2.0]} color="#ffd27a" />
    <Shelf position={[-2.7, 0, -2.6]} width={1.0} rows={3} color="#5a2e14" seed={3} />
  </Room>
);

// Mountain trail: forest green.
const ROCK: Vec3 = [0.05, 0, -1.0];
const TrailSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera }) => (
  <Room camera={camera} mood="daylight" floor="#7a5a3a" wall="#3f8f4a" stripe="#a8e6a1" width={10} depth={6} wallPattern="plain" floorPattern="concrete" sun={{ x: 0.8, color: "#fff6d8", bars: 5 }}>
    {[-3.2, -2.2, -1.1, 1.3, 2.4, 3.3].map((x, i) => (
      <Tree key={x} position={[x, 0, -2.5 + (i % 2) * 0.3]} scale={1.1 + (i % 3) * 0.2} color={i % 2 ? "#2f7a3a" : "#3f9a4a"} />
    ))}
    <Tree position={[-2.5, 0, -0.4]} scale={0.9} />
    <Tree position={[2.6, 0, -0.6]} scale={1.0} color="#3f9a4a" />
    <Label text="SUMMIT" position={[0.2, 1.6, -2.6]} width={0.8} fg="#ffffff" bg="#6b4423" />
    <InkBox size={[0.06, 1.4, 0.06]} position={[0.2, 0.7, -2.65]} color="#6b4423" ink={0.004} />
    <Rock position={ROCK} scale={1.1} />
    <Rock position={[1.6, 0, -1.6]} scale={1.6} color="#7a7a80" />
  </Room>
);

// Summit at sunset: red-orange sky, far peaks, a flag.
const SummitSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="golden" floor="#8a5a4a" wall="#ff6b4a" stripe="#ffd23f" width={10} depth={7} wallPattern="plain" floorPattern="concrete">
    <Peak position={[-2.4, 0, -3.0]} radius={1.6} height={2.6} color="#7b2c5a" snow />
    <Peak position={[2.2, 0, -3.1]} radius={1.9} height={3.0} color="#5a1f4a" snow />
    <Peak position={[0.1, 0, -3.2]} radius={1.2} height={1.7} color="#9b3a5a" />
    <Flag position={[0.75, 0, -1.4]} f={f} color="#ffd23f" />
    <Rock position={[-1.4, 0, -1.2]} scale={1.8} color="#6a4a4a" />
    <Rock position={[1.6, 0, -0.6]} scale={1.3} color="#6a4a4a" />
  </Room>
);

// ---------- stage wrappers ----------

const cafe = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof CafeSet>> = {}, grade: Grade = {}, children?: React.ReactNode) => (
  <Stage
    bg={moodBackground(extra.mode === "cold" ? "cold" : "warm")}
    camera={camera}
    puppets={puppets}
    {...grade}
    set={
      <>
        <CafeSet camera={camera} f={f} {...extra} />
        {children}
      </>
    }
  />
);
const chats = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof ChatSet>> = {}, children?: React.ReactNode) => (
  <Stage
    bg={moodBackground("dream")}
    camera={camera}
    puppets={puppets}
    set={
      <>
        <ChatSet camera={camera} f={f} {...extra} />
        {children}
      </>
    }
  />
);
const corridor = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof CorridorSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} {...grade} set={<CorridorSet camera={camera} f={f} {...extra} />} />
);
const car = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof CarSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} {...grade} set={<CarSet camera={camera} f={f} {...extra} />} />
);
const board = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BoardSet>> = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<BoardSet camera={camera} f={f} {...extra} />} />
);
const trail = (camera: CameraShot, f: number, puppets: PuppetPlacement[], children?: React.ReactNode) => (
  <Stage
    bg={moodBackground("daylight")}
    camera={camera}
    puppets={puppets}
    set={
      <>
        <TrailSet camera={camera} f={f} />
        {children}
      </>
    }
  />
);
const summit = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<SummitSet camera={camera} f={f} />} />
);

// ---------- shots ----------

const SIT = { sit: true } as const;

// Hook: brunch under the big GEMINI sign; Lily chatters, Hana listens.
const Hook: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 2.7], [0.0, 1.3, 2.35], f / 55), target: [0.0, 1.3, -1.6], fov: 60 };
  return cafe(cam, f, [
    pup("lily", LILY, SEAT_L, { ...SIT, expression: "excited", armL: [60 + Math.sin(f / 3) * 30, -60], armR: [40, -100], lookX: 0.6, bob: breathe(f) }),
    pup("hana", HANA, SEAT_R, { ...SIT, expression: "neutral", hold: CUP_R, armR: HOLD, lookX: -0.6, bob: breathe(f + 9) }),
  ], { badge: f + 20 });
};

// "Both of her": a second Lily, in blue, is sitting at the same table.
const BothOfHer: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 2.3, 1.3], [-0.15, 2.2, 1.05], f / 18), target: [-0.3, 0.75, -1.4], fov: 50 };
  return cafe(cam, f, [
    pup("lilyA", LILY, SEAT_L, { ...SIT, expression: "excited", ...ARMS_UP }),
    pup("lilyB", LILY_B, SEAT_B, { ...SIT, expression: "smug", armL: [40, -100], armR: [40, -100], headTilt: -8 }),
    pup("hana", HANA, SEAT_R, { ...SIT, expression: "shocked", hold: CUP_R, armR: HOLD, lookX: -0.8 }),
  ], { badge: 99 });
};

const LilyObsessed: React.FC = () => {
  const f = useShotFrame();
  return cafe(close(SEAT_L[0], SEAT_L[1], f / 61, 0.25, 0.85, 2.3), f, [pup("lily", LILY, SEAT_L, { ...SIT, expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 4) * 6, lookX: 0.4 })], { badge: 99 }, { blur: 6 });
};

// Low angle: her name pops on the wall.
const LilyName: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 0.45, 0.9], [-0.45, 0.5, 0.6], f / 25), target: [-1.0, 1.4, -2.2], fov: 54 };
  return cafe(cam, f, [pup("lily", LILY, SEAT_L, { ...SIT, expression: "smug", armL: [60, -110], armR: [60, -110], bob: breathe(f) })], { lily: f - 3 });
};

const Traits: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.7, 1.3, 1.9], [-0.55, 1.3, 1.6], f / 54), target: [-0.55, 1.25, -1.8], fov: 54 };
  return cafe(cam, f, [
    pup("lily", LILY, SEAT_L, { ...SIT, expression: "excited", armL: [100, 0], armR: [120 + Math.sin(f / 2) * 20, -20], headTilt: Math.sin(f / 3) * 8, bob: breathe(f) }),
    pup("hana", HANA, SEAT_R, { ...SIT, expression: "excited", lookX: -0.7, bob: breathe(f + 5) }),
  ], { lily: 99, traits: f });
};

// Four languages at once at the waiter.
const WAITER_AT: [number, number] = [-1.4, -0.55];
const LANGS: [string, Vec3, number][] = [
  ["HOLA!", [-1.3, 1.55, -0.8], 6],
  ["CIAO!", [-0.7, 1.7, -0.9], 14],
  ["BONJOUR!", [-1.0, 1.95, -1.0], 22],
  ["HALLO!", [-0.55, 1.35, -0.8], 30],
];
const bubbles = (f: number, at = 0) => LANGS.map(([t, p, d], i) => <Bubble key={t} text={t} position={p} appear={f - d * at} color={["#ffffff", "#ffd23f", "#ff8fc8", "#7fd3ff"][i]} />);
const Languages: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.9, 1.3, 1.9], [-1.0, 1.3, 1.6], f / 53), target: [-1.03, 1.2, -0.9], fov: 54 };
  return cafe(cam, f, [
    pup("lily", LILY, SEAT_L, { ...SIT, expression: "excited", armL: [80 + Math.sin(f / 2) * 30, -40], armR: [90, -20], lookX: -0.8 }),
    pup("waiter", WAITER, WAITER_AT, { expression: f > 20 ? "skeptical" : "neutral", armL: HOLD, armR: [20, -30], lookX: 0.8, headTilt: f > 20 ? 10 : 0, bob: breathe(f) }),
  ], {}, {}, bubbles(f, 1));
};

// Over the waiter's shoulder: all four at the same time.
const LanguagesOTS: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.75, 1.35, 0.95], [-1.72, 1.33, 0.75], f / 31), target: [-0.7, 1.15, -1.1], fov: 44 };
  return cafe(cam, f, [
    pup("waiter", WAITER, [-1.45, -0.05], { view: "back", expression: "shocked" }),
    pup("lily", LILY, SEAT_L, { ...SIT, expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 2) * 10 }),
  ], {}, {}, bubbles(f + 40, 0));
};

// The group-chat wall: twelve phones buzz around her.
const LILY_CHAT: [number, number] = [-0.2, -1.4];
const ChatsWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.5, 2.3], [0.2, 1.5, 1.95], (f + 8) / 53), target: [0.05, 1.45, -2.4], fov: 58 };
  return chats(cam, f, [pup("lily", LILY, LILY_CHAT, { expression: "excited", hold: PHONE_R, armR: HOLD, armL: [100 + Math.sin(f / 2) * 20, -30], lookX: Math.sin(f / 6), bob: breathe(f) })], { count: f - 10 });
};

// High angle: she types into two phones at once.
const ChatsJuggle: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 2.6, 0.6], [-0.15, 2.45, 0.35], f / 47), target: [-0.2, 0.7, -1.5], fov: 50 };
  return chats(cam, f, [pup("lily", LILY, LILY_CHAT, { expression: "smug", hold: PHONE_R, armR: [10 + Math.sin(f) * 8, -78], armL: [20 + Math.cos(f) * 10, -80], lookX: Math.sin(f / 4) * 0.8, bob: breathe(f) })], { count: 99 });
};

// Macro: the phones flip to BFF! one after another.
const BffMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.95, -0.5], [0.1, 1.95, -0.85], f / 31), target: [0.0, 1.85, -2.85], fov: 52 };
  return chats(cam, f, [], { count: 99, bff: f - 2 });
};

const BffSmug: React.FC = () => {
  const f = useShotFrame();
  return chats(close(LILY_CHAT[0], LILY_CHAT[1], f / 32, -0.25), f, [pup("lily", LILY, LILY_CHAT, { expression: "smug", hold: PHONE_R, armR: HOLD, armL: [150, -20], headTilt: 8 })], { count: 99, bff: 99 });
};

// The corridor: she walks past the blue jacket on the hook into the WC.
const CorridorWalk: React.FC = () => {
  const f = useShotFrame();
  const a = stroll(f, 0, 24, [-2.0, -1.2], [0.3, -1.6]);
  const b = stroll(f, 24, 16, [0.3, -1.6], [WC_X, -2.55]);
  const w = f < 24 ? a : b;
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 1.9], [-0.2, 1.3, 1.6], (f + 8) / 52), target: [0.0, 1.2, -2.2], fov: 54 };
  return corridor(cam, f, [pup("lily", LILY, w.at, { expression: "smug", hold: PHONE_R, armR: HOLD, ...w.pose })], { door: ramp(f, 30, 38) * 0.9, sway: Math.sin(f / 5) * 0.04 });
};

// Macro: the hook now holds the PINK jacket, still swinging.
const HookSwap: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([HOOK[0] + 0.35, 1.45, -0.9], [HOOK[0] + 0.3, 1.42, -1.2], f / 25), target: [HOOK[0], 1.35, -2.94], fov: 46 };
  return corridor(cam, f, [], { hook: "pink", sway: Math.sin(f / 3) * 0.25 * Math.exp(-f / 25) });
};

// Low angle: the door bursts open, a blue Lily steps out.
const DoorOut: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 18, [WC_X, -2.6], [WC_X - 0.2, -1.5]);
  const cam: CameraShot = { position: lerp3([0.4, 0.35, 0.6], [0.45, 0.38, 0.35], f / 25), target: [WC_X, 1.35, -2.5], fov: 56 };
  return corridor(cam, f, [pup("lily", LILY_B, w.at, { expression: "smug", ...w.pose, armL: [40, -100], armR: [40, -100] })], { hook: "pink", door: Easing.out(Easing.back(2))(ramp(f, 0, 6)) });
};

// Back at brunch: blue Lily drops into her chair.
const LilyBack: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 26, [-2.3, -0.45], [-0.75, -0.55]);
  const sitDown = f >= 32;
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 2.7], [-0.1, 1.3, 2.4], (f + 8) / 52), target: [-0.2, 1.0, -1.2], fov: 58 };
  return cafe(cam, f, [
    sitDown ? pup("lily", LILY_B, SEAT_L, { ...SIT, expression: "smug", armL: [40, -100], armR: [40, -100] }) : pup("lily", LILY_B, w.at, { expression: "smug", ...w.pose, armL: [40, -100] }),
    pup("hana", HANA, SEAT_R, { ...SIT, expression: f > 20 ? "skeptical" : "neutral", lookX: -0.9, bob: breathe(f) }),
    pup("grace", GRACE, SEAT_B, { ...SIT, expression: "skeptical", lookX: -0.6, bob: breathe(f + 4) }),
  ], { tip: ramp(f, 34, 42) });
};

// High angle on the table: the cup tips, the coffee pours into Hana's lap.
const SpillTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 2.5, 0.6], [0.35, 2.35, 0.4], f / 53), target: [0.3, 0.55, -1.15], fov: 52 };
  return cafe(cam, f, [
    pup("lily", LILY_B, SEAT_L, { ...SIT, expression: "neutral", lookX: 0.5 }),
    pup("hana", HANA, SEAT_R, { ...SIT, expression: f > 6 ? "shocked" : "skeptical", ...(f > 6 ? ARMS_UP : {}), lookX: -0.3 }),
  ], { tip: 1 }, {}, (
    <>
      <CoffeeSplash position={[0.42, 0.64, -1.05]} f={f} amount={1 - ramp(f, 30, 45)} />
      {f > 8 && <Stain position={[SEAT_R[0], 0.42, SEAT_R[1] + 0.12]} size={0.04 + ramp(f, 8, 30) * 0.08} />}
    </>
  ));
};

const HateClose: React.FC = () => {
  const f = useShotFrame();
  return cafe(close(SEAT_L[0], SEAT_L[1], f / 58, 0.25, 0.85, 2.3), f, [pup("lily", LILY_B, SEAT_L, { ...SIT, expression: "skeptical", armL: [100, 0], armR: [40, -100], headTilt: -10, lookX: 0.6 })], {}, { blur: 6 });
};

// Low angle: arms crossed, chin up.
const HateLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.35, 0.45, -0.1], [-0.4, 0.42, -0.3], f / 33), target: [-0.66, 0.95, -1.1], fov: 48 };
  return cafe(cam, f, [pup("lily", LILY_B, SEAT_L, { ...SIT, expression: "smug", armL: [40, -110], armR: [40, -110], headTilt: 12 })], {}, { blur: 4 });
};

// Cold light: Hana, soaked.
const HanaStain: React.FC = () => {
  const f = useShotFrame();
  return cafe(
    close(SEAT_R[0], SEAT_R[1], f / 39, -0.25, 0.85, 2.3),
    f,
    [pup("hana", HANA, SEAT_R, { ...SIT, expression: "shocked", armL: [110, -10], armR: [110, -10], headTilt: Math.sin(f / 2) * 6, lookX: -0.7 })],
    { mode: "cold", tip: 1 },
    { blur: 6, truth: 0.4 },
    <Stain position={[SEAT_R[0], 0.42, SEAT_R[1] + 0.12]} size={0.12} />,
  );
};

const FourMinutes: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 2.5], [-0.05, 1.3, 2.25], f / 29), target: [-0.1, 1.3, -2.0], fov: 58 };
  return cafe(cam, f, [
    pup("lily", LILY_B, SEAT_L, { ...SIT, expression: "smug", armL: [40, -110], armR: [40, -110] }),
    pup("hana", HANA, SEAT_R, { ...SIT, expression: "shocked", armR: [100, 0], lookX: -1 }),
  ], { mode: "cold", tip: 1, clock: f - 2 }, { truth: 0.4 });
};

// Grace, deadpan, with her phone.
const GraceClose: React.FC = () => {
  const f = useShotFrame();
  return cafe(close(SEAT_B[0], SEAT_B[1], f / 36, 0.2, 0.9, 2.3), f, [pup("grace", GRACE, SEAT_B, { ...SIT, expression: "skeptical", hold: PHONE_R, armR: HOLD, lookX: -0.4, blink: f % 30 < 3 })], { mode: "cold", tip: 1 }, { blur: 6, truth: 0.3 });
};

// Top-down macro: the 5 a.m. HIKE alarm switches off.
const ALARM_AT: Vec3 = [0.12, 0.67, -1.32];
const AlarmMacro: React.FC = () => {
  const f = useShotFrame();
  const off = f >= 15;
  const cam: CameraShot = { position: lerp3([ALARM_AT[0], 1.45, ALARM_AT[2] + 0.18], [ALARM_AT[0], 1.25, ALARM_AT[2] + 0.12], f / 35), target: ALARM_AT, fov: 44 };
  return cafe(cam, f, [], { mode: "cold", tip: 1 }, { truth: 0.3 }, <Screen position={[ALARM_AT[0], ALARM_AT[1] + 0.01, ALARM_AT[2]]} rotation={[-Math.PI / 2, 0, 0]} size={[0.26, 0.42]} text={off ? "ALARM\nOFF" : "5:00 AM\nHIKE"} glow={off ? "#ff5a5a" : "#4dff9a"} bg="#14102a" />);
};

// Push into blue Lily's face, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 60));
  const cam: CameraShot = { position: lerp3([SEAT_L[0] + 0.1, 0.9, 0.7], [SEAT_L[0] + 0.02, 0.82, -0.85], p), target: [SEAT_L[0], 0.78, -1.1], fov: 38 };
  return cafe(cam, f, [pup("lily", LILY_B, SEAT_L, { ...SIT, expression: "neutral", lookX: 0, blink: false })], { mode: "cold", tip: 1 }, { flash: ramp(f, 52, 68), truth: 0.3 });
};

// Inside her head: one car, two drivers.
const carPups = (f: number, sway = 0): PuppetPlacement[] => [
  pup("lilyA", LILY, [SEAT_A[0] + sway, SEAT_A[1]], { ...SIT, expression: "excited", armL: [40, -100], armR: [40, -100], lookX: 0.4, headTilt: sway * 30, bob: breathe(f) }),
  pup("lilyB", LILY_B, [SEAT_B2[0] + sway, SEAT_B2[1]], { ...SIT, expression: "skeptical", armL: [40, -100], armR: [40, -100], lookX: -0.4, headTilt: sway * 30, bob: breathe(f + 7) }),
];
const CarWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.8, 3.2], [0.2, 1.7, 2.7], (f + 8) / 69), target: [0, 1.0, -1.4], fov: 50 };
  return car(cam, f, carPups(f), { inside: f - 4, dice: Math.sin(f / 9) * 0.2, turnA: Math.sin(f / 8) * 0.3, turnB: -Math.sin(f / 8) * 0.3 }, { flash: 1 - ramp(f, 0, 10) });
};

// High angle over the left wheel: MOOD A.
const WheelA: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([SEAT_A[0] - 0.25, 1.15, 1.3], [SEAT_A[0] - 0.2, 1.12, 1.05], f / 50), target: [SEAT_A[0], 1.05, -1.2], fov: 46 };
  return car(cam, f, carPups(f), { moodA: f - 12, turnA: Math.sin(f / 6) * 0.5 });
};

const WheelB: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([SEAT_B2[0] + 0.25, 1.15, 1.3], [SEAT_B2[0] + 0.2, 1.12, 1.05], f / 46), target: [SEAT_B2[0], 1.05, -1.2], fov: 46 };
  return car(cam, f, carPups(f), { moodA: 99, moodB: f - 12, turnA: Math.sin(f / 6) * 0.5, turnB: -Math.sin(f / 5) * 0.6 });
};

// Gag: both drivers yank; the car lurches left and right, dice flying.
const Swerve: React.FC = () => {
  const f = useShotFrame();
  const dx = Math.sin(f / 3.5) * 0.18;
  const cam: CameraShot = { position: lerp3([0.0, 0.5, 2.2], [0.05, 0.55, 1.9], f / 36), target: [0, 0.95, -1.0], fov: 54 };
  return car(cam, f, carPups(f, dx), { moodA: 99, moodB: 99, dx, turnA: Math.sin(f / 3.5) * 1.2, turnB: -Math.sin(f / 3.5 + 1) * 1.2, dice: Math.sin(f / 2.5) * 0.9 });
};

// Macro: the glovebox note, NO MAP.
const NoMap: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.05, 0.95], [0.15, 1.0, 0.75], f / 24), target: [0, 0.5, -0.3], fov: 48 };
  return car(cam, f, carPups(f), { moodA: 99, moodB: 99, map: f - 4, dice: Math.sin(f / 4) * 0.3 });
};

// The switchboard: Lily at the plugs.
const LILY_BOARD: [number, number] = [1.15, -1.4];
const BoardWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.5, 2.0], [0.5, 1.5, 1.6], (f + 8) / 48), target: [0.3, 1.35, -2.3], fov: 56 };
  return board(cam, f, [pup("lily", LILY, LILY_BOARD, { expression: "excited", armL: [120 + Math.sin(f / 2) * 20, -30], armR: [90, -20], lookX: -0.8, bob: breathe(f) })], { title: -99 });
};

const BoardTitle: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.95, 1.4], [0.0, 1.95, 1.1], f / 38), target: [0, 1.85, -2.4], fov: 50 };
  return board(cam, f, [], { title: f - 2 });
};

// Macro: twelve cables, all buzzing; the counter runs up.
const Cables: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.6, -0.9], [0.8, 1.55, -1.2], f / 43), target: [0.4, 1.35, -2.4], fov: 50 };
  return board(cam, f, [], { twelve: f - 2, buzz: 2 });
};

// Low angle: she can't keep up, arms everywhere.
const BoardLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 0.35, 0.3], [0.75, 0.38, 0.05], f / 39), target: [0.9, 1.4, -2.0], fov: 56 };
  return board(cam, f, [pup("lily", LILY, LILY_BOARD, { expression: "shocked", armL: [150 + Math.sin(f) * 15, -20], armR: [100 + Math.cos(f) * 25, -10], headTilt: Math.sin(f / 2) * 8 })], { twelve: 99, buzz: 3 });
};

// Top-down macro: the DECISIONS coin spins on the dashboard.
const COIN_AT: Vec3 = [CAR[0], 0.72, CAR[2] + 0.62];
const CoinTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([COIN_AT[0] + 0.15, 1.35, COIN_AT[2] + 2.1], [COIN_AT[0] + 0.05, 1.3, COIN_AT[2] + 1.85], (f + 8) / 42), target: [COIN_AT[0], 0.9, COIN_AT[2]], fov: 40 };
  return car(cam, f, carPups(f), { moodA: 99, moodB: 99, decisions: f - 17 });
};

// Low angle: both drivers stare at the spinning coin.
const CoinLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 0.7, 1.5], [0.05, 0.7, 1.25], f / 46), target: [0, 0.95, -0.6], fov: 52 };
  return car(cam, f, [
    pup("lilyA", LILY, SEAT_A, { ...SIT, expression: "skeptical", lookX: 0.6, headTilt: Math.sin(f / 3) * 12 }),
    pup("lilyB", LILY_B, SEAT_B2, { ...SIT, expression: "skeptical", lookX: -0.6, headTilt: -Math.sin(f / 3) * 12 }),
  ], { moodA: 99, moodB: 99, decisions: 99 });
};

// The trail: Hana hikes alone, phone to her ear.
const TrailWalk: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 40, [-1.85, -0.75], [-1.0, -0.9]);
  const cam: CameraShot = { position: lerp3([-0.6, 1.35, 2.0], [-0.8, 1.3, 1.7], (f + 8) / 42), target: [-1.0, 1.05, -1.6], fov: 54 };
  return trail(cam, f, [pup("hana", HANA, w.at, { expression: "neutral", ...w.pose, hold: PHONE_R, armR: HOLD })]);
};

// Macro: LILY, voice note, nine minutes.
const HANA_TRAIL: [number, number] = [-1.0, -0.9];
const NOTE_AT: Vec3 = [HANA_TRAIL[0] + 0.28, 0.85, HANA_TRAIL[1] + 0.25];
const VoiceNote: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([NOTE_AT[0] + 0.1, 1.0, NOTE_AT[2] + 0.75], [NOTE_AT[0] + 0.05, 0.95, NOTE_AT[2] + 0.55], f / 47), target: [NOTE_AT[0] - 0.1, 0.9, NOTE_AT[2] - 0.3], fov: 44 };
  return trail(cam, f, [pup("hana", HANA, HANA_TRAIL, { expression: "skeptical", hold: PHONE_R, armR: HOLD, lookX: 0.5 })], (
    <group userData={{ ghost: true }}>
      <Screen position={NOTE_AT} size={[0.22, 0.36]} text={"LILY\nVOICE\nNOTE"} glow="#4dff9a" bg="#14102a" appear={f - 6} />
    </group>
  ));
};

// Six topics pop up around her as she walks on.
const TOPICS: [string, Vec3][] = [
  ["9:00", [-0.75, 1.75, -1.1]],
  ["HER EX", [-0.25, 1.5, -1.2]],
  ["CATS", [-1.3, 1.35, -1.0]],
  ["TAXES", [-0.3, 1.95, -1.3]],
  ["THE MOON", [-1.15, 2.15, -1.3]],
  ["TACOS", [-0.2, 1.2, -1.0]],
  ["HIKING?", [-1.35, 1.75, -1.2]],
];
const topicBubbles = (f: number) => TOPICS.map(([t, p], i) => <Bubble key={t} text={t} position={p} appear={f - i * 4} color={i === 0 ? "#4dff9a" : ["#ffffff", "#ffd23f", "#ff8fc8"][i % 3]} />);
const Topics: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 34, HANA_TRAIL, [-0.45, -1.0]);
  const cam: CameraShot = { position: lerp3([-0.7, 1.5, 2.3], [-0.6, 1.5, 2.0], f / 34), target: [-0.75, 1.4, -1.4], fov: 58 };
  return trail(cam, f, [pup("hana", HANA, w.at, { expression: "neutral", ...w.pose, hold: PHONE_R, armR: HOLD })], topicBubbles(f));
};

// Gag: she trips on the rock and goes flat.
const TRIP_AT: [number, number] = [-0.4, -1.0];
const Trip: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 3, 10));
  const down = f >= 3;
  const cam: CameraShot = { position: lerp3([0.25, 1.75, 1.75], [0.3, 1.7, 1.55], f / 26), target: [0.25, 0.35, -0.85], fov: 54 };
  return trail(cam, f, down ? [] : [pup("hana", HANA, TRIP_AT, { expression: "shocked", hold: PHONE_R, armR: HOLD, view: "side", facing: 1 })], (
    <>
      {down && (
        <group position={[TRIP_AT[0] + 0.1, 0.22, -0.7]} rotation={[0, 0, (-fall * Math.PI) / 2]} scale={squash(f, 10, 0.2)}>
          <PuppetBillboard id="hana" look={HANA} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false }} />
        </group>
      )}
    </>
  ));
};

// Summit at sunset: still listening.
const HANA_TOP: [number, number] = [0.15, -1.0];
const SummitWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.3, 2.4, 2.3], [0.2, 1.9, 1.8], Easing.inOut(Easing.cubic)(ramp(f, -8, 43))), target: [0.1, 0.9, -1.4], fov: 54 };
  return summit(cam, f, [pup("hana", HANA, HANA_TOP, { expression: "neutral", hold: PHONE_R, armR: HOLD, lookX: 0.3, bob: breathe(f) })]);
};

const SummitLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 0.4, 0.8], [-0.15, 0.42, 0.55], f / 31), target: [0.35, 1.3, -1.6], fov: 54 };
  return summit(cam, f, [pup("hana", HANA, HANA_TOP, { expression: "skeptical", hold: PHONE_R, armR: HOLD, lookX: 0.5, headTilt: -8 })]);
};

const HanaWait: React.FC = () => {
  const f = useShotFrame();
  return summit(close(HANA_TOP[0], HANA_TOP[1], f / 50, -0.25), f, [pup("hana", HANA, HANA_TOP, { expression: f < 25 ? "skeptical" : "shocked", hold: PHONE_R, armR: HOLD, armL: f < 25 ? [0, 0] : [110, -10], lookX: 0.4 })]);
};

// Loop: both Lilys pop up behind her and wave.
const WhichLily: React.FC = () => {
  const f = useShotFrame();
  const up = (d: number) => Easing.out(Easing.back(2))(ramp(f, d, d + 8));
  const cam: CameraShot = { position: lerp3([0.2, 1.35, 1.9], [0.2, 1.4, 2.5], f / 42), target: [0.2, 1.05, -1.5], fov: 60 };
  return summit(cam, f, [
    pup("hana", HANA, HANA_TOP, { expression: "shocked", hold: PHONE_R, armR: HOLD, armL: [110, -10], lookX: -0.3 }),
    pup("lilyA", LILY, [-0.55 - (1 - up(6)) * 0.8, -1.7], { expression: "excited", armL: [150 + Math.sin(f / 2) * 15, -20], armR: [40, -100], view: "front" }),
    pup("lilyB", LILY_B, [0.95 + (1 - up(12)) * 0.8, -1.8], { expression: "smug", armR: [150 + Math.sin(f / 2) * 15, -20], armL: [40, -100], view: "front" }),
  ]);
};

const SHOTS: Shot[] = [
  [0, 55, Hook, false],
  [55, 73, BothOfHer, false],
  [73, 134, LilyObsessed, false],
  [134, 159, LilyName, false],
  [159, 213, Traits, false],
  [213, 266, Languages, false],
  [266, 297, LanguagesOTS, false],
  [297, 342, ChatsWide, true],
  [342, 389, ChatsJuggle, false],
  [389, 420, BffMacro, false],
  [420, 452, BffSmug, false],
  [452, 496, CorridorWalk, true],
  [496, 521, HookSwap, false],
  [521, 546, DoorOut, false],
  [546, 590, LilyBack, true],
  [590, 643, SpillTop, false],
  [643, 701, HateClose, false],
  [701, 734, HateLow, false],
  [734, 773, HanaStain, false],
  [773, 802, FourMinutes, false],
  [802, 838, GraceClose, false],
  [838, 873, AlarmMacro, false],
  [873, 941, HeadPush, false],
  [941, 1002, CarWide, true],
  [1002, 1052, WheelA, false],
  [1052, 1098, WheelB, false],
  [1098, 1134, Swerve, false],
  [1134, 1158, NoMap, false],
  [1158, 1198, BoardWide, true],
  [1198, 1236, BoardTitle, false],
  [1236, 1279, Cables, false],
  [1279, 1318, BoardLow, false],
  [1318, 1352, CoinTop, true],
  [1352, 1398, CoinLow, false],
  [1398, 1432, TrailWalk, true],
  [1432, 1479, VoiceNote, false],
  [1479, 1513, Topics, false],
  [1513, 1539, Trip, false],
  [1539, 1582, SummitWide, true],
  [1582, 1613, SummitLow, false],
  [1613, 1663, HanaWait, false],
  [1663, TIMING.totalFrames, WhichLily, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  // Effects sit on words where they can (the gaps between words stay clear for the voice).
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 297 },
  { at: 0, src: sfx("pop"), volume: 0.25 },
  { at: 56, src: sfx("pop"), volume: 0.25 },
  { at: 57, src: sfx("chime"), volume: 0.12 },
  { at: 135, src: sfx("pop"), volume: 0.18 },
  ...[156, 173, 185].map((at) => ({ at, src: sfx("pop"), volume: 0.15 })),
  ...[219, 227, 235, 243].map((at) => ({ at, src: sfx("pop"), volume: 0.15 })),
  { at: 297, src: sfx("hum"), volume: 0.03, until: 452 },
  ...[300, 318, 336, 352, 370].map((at) => ({ at, src: sfx("credit-blip"), volume: 0.14 })),
  { at: 307, src: sfx("pop"), volume: 0.2 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: 391 + k * 2, src: sfx("tick"), volume: 0.1 })),
  { at: 455, src: sfx("whoosh"), volume: 0.15 },
  { at: 482, src: sfx("door"), volume: 0.3 },
  // The twist: riser into the swapped jacket, sting on the door.
  { at: 470, src: sfx("riser"), volume: 0.1 },
  { at: 497, src: sfx("sting"), volume: 0.28 },
  { at: 521, src: sfx("door"), volume: 0.25 },
  { at: 546, src: sfx("ambience"), volume: 0.03, until: 873 },
  { at: 580, src: sfx("boom"), volume: 0.3 },
  { at: 584, src: sfx("paper"), volume: 0.12 },
  { at: 593, src: sfx("near-miss"), volume: 0.12 },
  { at: 775, src: sfx("pop"), volume: 0.2 },
  { at: 853, src: sfx("button"), volume: 0.25 },
  { at: 856, src: sfx("near-miss"), volume: 0.1 },
  { at: 900, src: sfx("whoosh"), volume: 0.15 },
  { at: 920, src: sfx("riser"), volume: 0.06 },
  { at: 941, src: sfx("hum"), volume: 0.035, until: 1158 },
  { at: 945, src: sfx("pop"), volume: 0.22 },
  { at: 1014, src: sfx("pop"), volume: 0.22 },
  { at: 1064, src: sfx("pop"), volume: 0.22 },
  ...[1100, 1111, 1122].map((at) => ({ at, src: sfx("reel-stop"), volume: 0.15 })),
  { at: 1104, src: sfx("whoosh"), volume: 0.18 },
  { at: 1138, src: sfx("pop"), volume: 0.2 },
  { at: 1158, src: sfx("hum"), volume: 0.04, until: 1318 },
  { at: 1200, src: sfx("pop"), volume: 0.22 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: 1240 + k * 3, src: sfx("credit-blip"), volume: 0.1 })),
  ...[1282, 1292, 1302].map((at) => ({ at, src: sfx("button"), volume: 0.2 })),
  { at: 1318, src: sfx("reel-spin"), volume: 0.035, until: 1385 },
  { at: 1335, src: sfx("pop"), volume: 0.2 },
  { at: 1405, src: sfx("ambience"), volume: 0.035, until: 1705 },
  { at: 1446, src: sfx("chime"), volume: 0.12 },
  ...[1479, 1483, 1487, 1491, 1495, 1499, 1503].map((at) => ({ at, src: sfx("pop"), volume: 0.13 })),
  { at: 1523, src: sfx("boom"), volume: 0.2 },
  { at: 1638, src: sfx("whoosh"), volume: 0.13 },
  { at: 1669, src: sfx("pop"), volume: 0.22 },
  { at: 1675, src: sfx("pop"), volume: 0.22 },
  { at: 1680, src: sfx("chime"), volume: 0.15 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 452, volume: 0.13 },
  { src: MUSIC_FILES.tension, from: 452, to: 873, volume: 0.156 },
  { src: MUSIC_FILES.mystery, from: 873, to: 1398, volume: 0.169 },
  { src: MUSIC_FILES.lounge, from: 1398, to: TIMING.totalFrames, volume: 0.143 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
