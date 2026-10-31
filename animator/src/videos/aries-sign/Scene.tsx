import React from "react";
import { Easing } from "remotion";
import {
  breathe,
  CameraShot,
  Counter,
  Desk,
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
  Switch,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import { Alarm, CakeDisplay, DizzyStars, GoButton, LoosePlug, Manual, Mat, Oven, PatienceDial, PunchingBag, Shower, Smoke } from "./props";
import TIMING_JSON from "./timing.json";

// "Your Aries Friend Has One Button" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "aries-sign";
export const timing = TIMING;

// ---------- cast ----------

const MIA: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#e0262f", long: true };
const MIA_TOWEL: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#ffffff", long: true };
const MIA_SOOT: PuppetLook = { skin: "#7a6a62", hair: "#1d1a1a", outfit: "#5a2a2a", long: true };
const JESS: PuppetLook = { skin: "#fbe9d6", hair: "#e8c15a", outfit: "#3fae5a", glasses: true, long: true };
const NORA: PuppetLook = { skin: "#fff3e6", hair: "#a0442a", outfit: "#1b2a5e", lanyard: "#ffffff", long: true };
const BOSS: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#4a5568", glasses: true, long: true };
const CLERK: PuppetLook = { skin: "#6b4423", hair: "#1d1a1a", outfit: "#2a9d8f", lanyard: "#ffd23f", long: true };
const STUDENT: PuppetLook = { skin: "#fbe9d6", hair: "#6b4423", outfit: "#2a9d8f", cap: "#ffd23f", long: true };
const EXTRAS: PuppetLook[] = [
  { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#f2b630", long: true },
  { skin: "#6b4423", hair: "#1d1a1a", outfit: "#4f7dff" },
  { skin: "#fbe9d6", hair: "#c0392b", outfit: "#9b5de5", long: true },
  { skin: "#fff3e6", hair: "#e8c15a", outfit: "#ff8fc8", long: true },
  { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#e76f51", long: true },
  { skin: "#8d5a3b", hair: "#1d1a1a", outfit: "#3fae5a" },
];

const PHONE = { item: "phone", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2): CameraShot => ({
  position: lerp3([px + dx, 1.02, pz + 1.85], [px + dx * 0.8, 1.0, pz + 1.6], p),
  target: [px, 0.9, pz],
  fov: 36,
});
const medium = (px: number, pz: number, p: number, dx = -0.5): CameraShot => ({
  position: lerp3([px + dx, 1.2, pz + 3.4], [px + dx * 0.85, 1.18, pz + 3.05], p),
  target: [px, 0.82, pz],
  fov: 38,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// Bathroom: daylight teal.
const SHOWER_AT: Vec3 = [-1.3, 0, -2.2];
const SINK_AT: Vec3 = [1.3, 0, -2.45];
const PHONE_AT: Vec3 = [1.25, 0.88, -2.35];
const BathroomSet: React.FC<{ camera: CameraShot; f: number; aries?: number; idea?: number; sent?: boolean }> = ({ camera, f, aries, idea, sent }) => (
  <Room camera={camera} mood="daylight" floor="#d8f0ee" wall="#2a9d8f" stripe="#ffffff" width={8} depth={6} wallPattern="tile" floorPattern="tile" sun={{ x: 2.0, color: "#e8fff9", bars: 3 }}>
    <Shower position={SHOWER_AT} f={f} />
    <Counter position={SINK_AT} size={[1.0, 0.85, 0.5]} color="#f7f7f2" top="#c9ced3" />
    <InkBox size={[0.8, 0.9, 0.04]} position={[SINK_AT[0], 1.75, -2.96]} color="#dff6ff" />
    <Screen position={PHONE_AT} rotation={[-Math.PI / 2, 0, 0.1]} size={[0.26, 0.42]} text={sent ? "SENT\n7:00 AM" : "TO: BOSS\nI QUIT!"} glow={sent ? "#4dff9a" : "#ff8fc8"} bg="#14102a" />
    <Label text="7:00 AM" position={[1.15, 2.05, -2.94]} width={0.7} fg="#ffffff" bg="#13235e" />
    {aries !== undefined && <ZodiacBadge sign="aries" position={[0.1, 2.5, -2.92]} size={0.75} appear={aries} />}
    {aries !== undefined && <Label text="ARIES" position={[0.1, 1.95, -2.94]} width={1.1} fg="#ffffff" bg="#e0262f" appear={aries - 4} />}
    {idea !== undefined && <Label text="IDEA!" position={[SHOWER_AT[0], 1.95, SHOWER_AT[2] + 0.4]} width={0.55} fg="#13235e" bg="#ffd23f" appear={idea} />}
    <Plant position={[2.6, 0, -2.4]} />
  </Room>
);

// Office: grey-blue.
const OfficeSet: React.FC<{ camera: CameraShot; f: number; quit?: number }> = ({ camera, f, quit }) => (
  <Room camera={camera} mood="office" floor="#5a6472" wall="#8fa3b8" stripe="#4a5568" width={8} depth={6} wallPattern="panel" floorPattern="carpet" sun={{ x: -2.2, color: "#ffffff", bars: 6 }}>
    <Screen position={[0.35, 1.85, -2.9]} size={[1.3, 0.75]} text={"I QUIT!\n- MIA"} glow={f % 14 < 7 ? "#ff5a5a" : "#ffffff"} bg="#0a1020" appear={quit} />
    <Desk position={[-1.6, 0, -1.9]} size={[1.2, 0.75, 0.7]} color="#d8e0ea" />
    <Desk position={[1.9, 0, -1.9]} size={[1.2, 0.75, 0.7]} color="#d8e0ea" />
    <Shelf position={[-2.9, 0, -2.6]} width={1.0} rows={4} color="#4a5568" seed={5} />
    <Window position={[2.7, 1.8, -2.94]} size={[1.0, 1.0]} sky="#cfe9ff" blinds />
  </Room>
);

// Running track: golden orange.
const SIGN_DESK: Vec3 = [0.7, 0, -1.5];
const TrackSet: React.FC<{ camera: CameraShot; f: number; mia?: number; traits?: number; noon?: number; stamp?: number }> = ({ camera, f, mia, traits, noon, stamp }) => (
  <Room camera={camera} mood="golden" floor="#c8553d" wall="#f4a261" stripe="#ffffff" width={10} depth={6} wallPattern="brick" floorPattern="concrete" sun={{ x: -2.0, color: "#ffe6a8", bars: 4 }}>
    {[-0.9, -0.3, 0.3, 0.9].map((z) => (
      <InkBox key={z} size={[10, 0.012, 0.03]} position={[0, 0.006, z]} color="#ffffff" ink={0} />
    ))}
    <InkBox size={[0.05, 0.013, 2.2]} position={[-1.2, 0.007, -0.1]} color="#ffffff" ink={0} />
    <Label text="MARATHON" position={[0.5, 2.45, -2.92]} width={1.8} fg="#ffffff" bg="#e0262f" />
    {mia !== undefined && <Label text="MIA" position={[-1.75, 1.75, -2.92]} width={0.6} fg="#ffffff" bg="#e0262f" appear={mia} />}
    {traits !== undefined &&
      ["FIRST", "FASTEST", "LOUDEST"].map((t, i) => (
        <Label key={t} text={t} position={[-0.3, 2.0 - i * 0.36, -2.9]} width={1.1} fg="#13235e" bg="#ffd23f" appear={traits - i * 18} />
      ))}
    <Desk position={SIGN_DESK} size={[1.1, 0.72, 0.6]} color="#fff6dc" />
    <InkBox size={[0.3, 0.02, 0.4]} position={[SIGN_DESK[0] - 0.15, 0.735, SIGN_DESK[2] + 0.05]} color="#ffffff" ink={0.004} />
    {stamp !== undefined && stamp >= 0 && <Label text="SIGNED" position={[SIGN_DESK[0] - 0.15, 0.75, SIGN_DESK[2] + 0.05]} rotation={[-Math.PI / 2, 0, 0.2]} width={0.3} fg="#ffffff" bg="#3fae5a" appear={stamp} />}
    {noon !== undefined && <Label text="12:00" position={[2.3, 2.0, -2.92]} width={0.7} fg="#ffffff" bg="#13235e" appear={noon} />}
  </Room>
);

// Bakery: warm pink by day, smoky grey after the oven, navy at night when it closes.
const OVEN_AT: Vec3 = [1.35, 0, -2.25];
const DOOR_X = -2.2;
const BAKERY_COUNTER_Z = -1.2;
type BakeryMode = "day" | "smoke" | "closed";
const BAKERY_MOOD = { day: "warm", smoke: "night", closed: "night" } as const;
const BakerySet: React.FC<{ camera: CameraShot; f: number; mode?: BakeryMode; sign?: number; ovenLabel?: number; open?: number; shake?: number; smoke?: number; door?: number; tuesday?: number }> = ({
  camera,
  f,
  mode = "day",
  sign,
  ovenLabel,
  open = 0,
  shake = 0,
  smoke = 0,
  door = 0,
  tuesday,
}) => (
  <Room
    camera={camera}
    mood={BAKERY_MOOD[mode]}
    floor={mode === "day" ? "#7a3e5a" : mode === "smoke" ? "#3a3a44" : "#1b2232"}
    wall={mode === "day" ? "#ff8fc8" : mode === "smoke" ? "#6b6b74" : "#1b2a5e"}
    stripe={mode === "day" ? "#ffffff" : "#c9ced3"}
    width={9}
    depth={6}
    wallPattern="wallpaper"
    floorPattern="tile"
    sun={mode === "day" ? { x: -1.6, color: "#ffe6f2", bars: 4 } : undefined}
  >
    {sign !== undefined ? <Label text="MIA'S BAKERY" position={[0, 2.5, -2.92]} width={1.9} fg="#ffffff" bg="#e0262f" appear={sign} /> : <Label text="MIA'S BAKERY" position={[0, 2.5, -2.92]} width={1.9} fg="#ffffff" bg="#e0262f" />}
    <Door position={[DOOR_X, 0, -2.94]} open={door} color="#ffd23f" glow={mode === "closed" ? "#0b1020" : "#fff6d8"} />
    {mode === "closed" && <Label text="CLOSED" position={[DOOR_X, 1.55, -2.84]} width={0.62} fg="#ffffff" bg="#e0262f" appear={99} />}
    {tuesday !== undefined && <Label text="TUESDAY" position={[-1.2, 2.0, -2.92]} width={0.9} fg="#13235e" bg="#ffd23f" appear={tuesday} />}
    <Counter position={[-0.75, 0, BAKERY_COUNTER_Z]} size={[1.5, 0.62, 0.55]} color={mode === "day" ? "#ffffff" : "#c9ced3"} top="#e0262f" />
    <CakeDisplay position={[-0.75, 0.67, BAKERY_COUNTER_Z]} burnt={mode !== "day"} />
    <Oven position={OVEN_AT} open={open} shake={shake} glow={shake > 0 ? 0.9 : 0.3} />
    {ovenLabel !== undefined && <Label text="OVEN" position={[OVEN_AT[0], 1.35, OVEN_AT[2] + 0.2]} width={0.5} fg="#ffffff" bg="#13235e" appear={ovenLabel} />}
    {smoke > 0 && <Smoke position={[OVEN_AT[0], 0.55, OVEN_AT[2] + 0.5]} f={f} amount={smoke} spread={1.3} />}
    {mode === "smoke" && <Alarm position={[1.9, 2.75, -2.9]} f={f} />}
    <Shelf position={[2.9, 0, -2.6]} width={1.0} rows={3} color="#8a5a3a" seed={2} />
    {mode === "day" && <Lamp position={[-1.2, 2.2, -1.8]} color="#ffd27a" />}
  </Room>
);

// Street outside the bakery: sunny yellow.
const StreetSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="daylight" floor="#b8b2a6" wall="#ffd23f" stripe="#e0262f" width={12} depth={6} wallPattern="brick" floorPattern="concrete" sun={{ x: 1.5, color: "#fff6d8", bars: 3 }}>
    <Door position={[2.6, 0, -2.94]} open={0.5 + Math.sin(f / 9) * 0.2} color="#ff8fc8" glow="#fff6d8" sign="MIA'S BAKERY" />
    <Label text="OPEN" position={[2.6, 1.55, -2.84]} width={0.5} fg="#ffffff" bg="#3fae5a" />
    <Window position={[0.9, 1.4, -2.94]} size={[1.4, 1.0]} sky="#ff8fc8" />
    <Window position={[-2.6, 1.6, -2.94]} size={[1.2, 1.0]} sky="#cfe9ff" blinds />
  </Room>
);

// Control room inside her head: neon red.
const GO_AT: Vec3 = [0, 0, -1.2];
const DIAL_AT: Vec3 = [-1.7, 1.75, -2.9];
const SWITCH_AT: Vec3 = [1.7, 1.75, -2.85];
const SOCKET_AT: Vec3 = [2.6, 0.75, -2.94];
const PLUG_AT: Vec3 = [2.05, 0.04, -2.2];
const ANGER_AT: Vec3 = [0, 2.45, -2.9];
const ControlSet: React.FC<{ camera: CameraShot; f: number; press?: number; pop?: number; go?: number; patience?: number; think?: number; plug?: number; anger?: number; inside?: number }> = ({
  camera,
  f,
  press = 0,
  pop = 0,
  go,
  patience,
  think,
  plug,
  anger,
  inside,
}) => {
  const left = anger === undefined ? 0 : Math.max(0, 4 - Math.floor(anger / 10));
  return (
    <Room camera={camera} mood="neon" floor="#2a0d22" wall="#b0126e" stripe="#ffd23f" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
      {inside !== undefined && <Label text="INSIDE MIA" position={[0, 3.0, -2.92]} width={1.4} fg="#ffffff" bg="#13235e" appear={inside} />}
      <ZodiacBadge sign="aries" position={[-1.7, 2.75, -2.92]} size={0.5} bg="#ffd23f" fg="#e0262f" />
      <GoButton position={GO_AT} press={press} pop={pop} scale={1.3} />
      {go !== undefined && <Label text="WORN SMOOTH" position={[GO_AT[0] + 0.9, 1.65, GO_AT[2]]} width={0.75} fg="#13235e" bg="#ffd23f" appear={go} />}
      <PatienceDial position={DIAL_AT} needle={0} />
      <Label text="PATIENCE" position={[DIAL_AT[0], DIAL_AT[1] + 0.6, -2.92]} width={0.8} fg="#ffffff" bg="#13235e" appear={patience ?? 99} />
      <group position={SWITCH_AT} scale={2}>
        <Switch position={[0, 0, 0]} label="THINK FIRST" on={0} />
      </group>
      {think !== undefined && <Label text="THINK FIRST" position={[SWITCH_AT[0], SWITCH_AT[1] + 0.5, -2.9]} width={0.9} fg="#ffffff" bg="#13235e" appear={think} />}
      <LoosePlug socket={SOCKET_AT} plug={PLUG_AT} />
      {plug !== undefined && <Label text={"NEVER\nPLUGGED IN"} position={[SOCKET_AT[0] - 0.25, 1.1, -2.9]} width={0.75} fg="#13235e" bg="#ffd23f" appear={plug} />}
      <Screen
        position={ANGER_AT}
        size={[1.1, 0.5]}
        text={anger === undefined ? "ANGER" : left > 0 ? `ANGER\n${left} SEC` : "ANGER\n0"}
        glow={anger !== undefined && left === 0 ? "#4dff9a" : f % 12 < 6 ? "#ff5a5a" : "#ffd23f"}
        bg="#14060a"
      />
    </Room>
  );
};

// Kickboxing gym: dream purple.
const BAG_AT: Vec3 = [1.25, 2.6, -1.7];
const GymSet: React.FC<{ camera: CameraShot; f: number; gym?: number; wednesday?: number; swing?: number; children?: React.ReactNode }> = ({ camera, f, gym, wednesday, swing = 0, children }) => (
  <Room camera={camera} mood="dream" floor="#3a2450" wall="#7b2cbf" stripe="#ffd23f" width={9} depth={6} wallPattern="plain" floorPattern="wood" sun={{ x: -2.0, color: "#e0c3ff", bars: 5 }}>
    <Label text="MIA'S GYM" position={[0, 2.5, -2.92]} width={1.6} fg="#ffffff" bg="#e0262f" appear={gym ?? 99} />
    {wednesday !== undefined && <Label text="WEDNESDAY" position={[-0.4, 1.95, -2.92]} width={1.0} fg="#13235e" bg="#ffd23f" appear={wednesday} />}
    <Mat position={[0, 0.02, -0.7]} />
    <PunchingBag position={BAG_AT} swing={swing + Math.sin(f / 9) * 0.03} />
    <Shelf position={[-2.9, 0, -2.6]} width={1.0} rows={3} color="#3a2450" seed={7} />
    {children}
  </Room>
);

// ---------- stage wrappers ----------

const bathroom = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BathroomSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} {...grade} set={<BathroomSet camera={camera} f={f} {...extra} />} />
);
const office = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { quit?: number } = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<OfficeSet camera={camera} f={f} {...extra} />} />
);
const track = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof TrackSet>> = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<TrackSet camera={camera} f={f} {...extra} />} />
);
const bakery = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BakerySet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground(BAKERY_MOOD[extra.mode ?? "day"])} camera={camera} puppets={puppets} {...grade} set={<BakerySet camera={camera} f={f} {...extra} />} />
);
const street = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<StreetSet camera={camera} f={f} />} />
);
const control = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof ControlSet>> = {}, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} {...grade} set={<ControlSet camera={camera} f={f} {...extra} />} />
);
const gym = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof GymSet>> = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<GymSet camera={camera} f={f} {...extra} />} />
);

// ---------- shots ----------

// Hook: Mia in a towel jabs SEND under the big ARIES sign.
const MIA_BATH: [number, number] = [0.15, -0.9];
const BathHook: React.FC = () => {
  const f = useShotFrame();
  const jab = f > 14 && f < 24;
  const cam: CameraShot = { position: lerp3([-0.1, 0.55, 1.7], [-0.05, 0.6, 1.35], f / 48), target: [0.15, 1.35, -1.6], fov: 50 };
  return bathroom(cam, f, [pup("mia", MIA_TOWEL, MIA_BATH, { expression: jab ? "excited" : "smug", hold: PHONE, armR: jab ? [60, -40] : HOLD, armL: [150, -20], lookX: 0.3, bob: breathe(f) })], { aries: f - 2 });
};

// The boss reads the email; her coffee spills.
const OfficeQuit: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.35, 2.4], [-0.3, 1.3, 2.0], (f + 8) / 47), target: [0.1, 1.4, -2.2], fov: 46 };
  const shock = f > 10;
  return office(cam, f, [pup("boss", BOSS, [-0.55, -1.5], { expression: shock ? "shocked" : "neutral", hold: { item: "cup", hand: "R" }, armR: HOLD, itemTilt: shock ? Math.min(120, (f - 10) * 10) : 0, armL: shock ? [100, 10] : [0, 0], lookX: 0.8 })], { quit: f - 2 });
};

// In the shower: the idea arrives.
const ShowerIdea: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([SHOWER_AT[0] + 0.5, 1.3, 0.9], [SHOWER_AT[0] + 0.4, 1.35, 0.5], (f + 8) / 59), target: [SHOWER_AT[0], 1.25, SHOWER_AT[2]], fov: 44 };
  return bathroom(cam, f, [pup("mia", MIA_TOWEL, [SHOWER_AT[0], SHOWER_AT[2] - 0.05], { expression: f < 14 ? "neutral" : "excited", armL: f < 14 ? [40, -100] : [150, -20], armR: [40, -100], headTilt: f < 14 ? -8 : 6, bob: breathe(f) })], { idea: f - 14 });
};

// Top-down macro: the phone on the sink, I QUIT, then SENT.
const PhoneTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PHONE_AT[0] + 0.02, 1.75, PHONE_AT[2] + 0.2], [PHONE_AT[0], 1.45, PHONE_AT[2] + 0.12], f / 39), target: PHONE_AT, fov: 44 };
  return bathroom(cam, f, [], { sent: f >= 14 });
};

// The track: Mia at the start line, name card pops.
const MIA_TRACK: [number, number] = [-1.75, -0.6];
const TrackIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.1, 1.0, 2.0], [-1.25, 1.05, 1.6], (f + 8) / 44), target: [-1.75, 1.15, -1.6], fov: 44 };
  return track(cam, f, [pup("mia", MIA, MIA_TRACK, { expression: "smug", armL: [60, -110], armR: [60, -110], headTilt: 5, bob: breathe(f) })], { mia: f - 4 });
};

// She sprints off ahead of two runners; FIRST, FASTEST, LOUDEST stack up.
const TrackRace: React.FC = () => {
  const f = useShotFrame();
  const m = stroll(f, 2, 26, MIA_TRACK, [1.4, -0.6]);
  const r1 = stroll(f, 12, 30, [-2.6, -0.0], [-0.6, -0.0]);
  const r2 = stroll(f, 14, 30, [-2.9, 0.6], [-1.0, 0.6]);
  const cam: CameraShot = { position: lerp3([-0.7, 1.5, 2.6], [-0.2, 1.5, 2.4], f / 39), target: [-0.3, 1.4, -1.6], fov: 50 };
  return track(cam, f, [
    pup("mia", MIA, m.at, { expression: "excited", ...m.pose }),
    pup("r1", EXTRAS[0], r1.at, { expression: "shocked", ...r1.pose }),
    pup("r2", EXTRAS[1], r2.at, { expression: "shocked", ...r2.pose }),
  ], { mia: 99, traits: f });
};

// Noon: she signs up and the desk clerk stamps it.
const SignUp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.35, 1.9], [0.0, 1.3, 1.55], f / 58), target: [SIGN_DESK[0] - 0.25, 0.95, SIGN_DESK[2]], fov: 46 };
  return track(cam, f, [
    pup("mia", MIA, [SIGN_DESK[0] - 0.6, SIGN_DESK[2] + 0.55], { expression: "excited", armR: f > 16 && f < 26 ? [70, -30] : [40, -60], armL: [150, -20], lookX: 0.7, bob: breathe(f) }),
    pup("clerk", CLERK, [SIGN_DESK[0] + 0.25, SIGN_DESK[2] - 0.55], { expression: f < 24 ? "neutral" : "shocked", armL: [70, -30], lookX: -0.5, bob: breathe(f + 9) }),
  ], { mia: 99, noon: f - 4, stamp: f - 24 });
};

// Low angle: the bakery sign pops, Mia arms up, the oven behind her.
const MIA_BAKERY: [number, number] = [0.45, -0.4];
const JESS_BAKERY: [number, number] = [-0.45, -0.35];
const BakeryOpen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 0.4, 2.1], [-0.1, 0.45, 1.75], (f + 8) / 60), target: [0.1, 1.5, -1.8], fov: 56 };
  return bakery(cam, f, [pup("mia", MIA, MIA_BAKERY, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 4) * 5, bob: breathe(f) })], { sign: f - 6 });
};

const JessShout: React.FC = () => {
  const f = useShotFrame();
  return bakery(close(JESS_BAKERY[0], JESS_BAKERY[1], f / 54, -0.25), f, [pup("jess", JESS, JESS_BAKERY, { expression: "shocked", armL: [40, -100], armR: [40, -100], lookX: 0.7 })], {}, { blur: 6 });
};

// Two-shot: Jess points at the oven, the seed gets its label.
const OvenTwoShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.35, 3.0], [-0.05, 1.3, 2.7], f / 38), target: [0.25, 1.0, -1.4], fov: 46 };
  return bakery(cam, f, [
    pup("jess", JESS, JESS_BAKERY, { expression: "skeptical", armR: [100, 0], lookX: 1, bob: breathe(f) }),
    pup("mia", MIA, MIA_BAKERY, { expression: "smug", armL: [40, -100], armR: [40, -100], lookX: -0.6, bob: breathe(f + 7) }),
  ], { ovenLabel: f - 6 });
};

const MiaLearn: React.FC = () => {
  const f = useShotFrame();
  return bakery(close(MIA_BAKERY[0], MIA_BAKERY[1], f / 44, 0.25), f, [pup("mia", MIA, MIA_BAKERY, { expression: "excited", armL: [150, -20], armR: [120 + Math.sin(f / 3) * 15, -20], lookX: -0.4 })], { ovenLabel: 99 }, { blur: 6 });
};

// The street: a queue of customers into the shop.
const queue = (f: number, n = 6): PuppetPlacement[] =>
  EXTRAS.slice(0, n).map((look, i) => pup(`q${i}`, look, [2.2 - i * 0.62, -1.9 + (i % 2) * 0.12], { expression: i % 2 ? "excited" : "neutral", lookX: 0.8, bob: breathe(f + i * 7), view: i === 0 ? "back" : undefined }));
const StreetQueue: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.6, 1.4, 2.4], [0.6, 1.35, 2.6], (f + 8) / 58), target: [0.6, 1.0, -2.0], fov: 50 };
  return street(cam, f, queue(f));
};

// Top-down: the line wraps along the block.
const QueueTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 3.4, 2.6], [0.1, 3.6, 2.9], f / 40), target: [0.0, 0.4, -1.6], fov: 55 };
  return street(cam, f, [...queue(f), ...EXTRAS.map((look, i) => pup(`p${i}`, look, [-1.6 - i * 0.55, -1.2 + i * 0.3], { expression: "excited", bob: breathe(f + i * 5) }))]);
};

// The oven starts to rumble.
const OvenRumble: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([OVEN_AT[0] - 0.3, 0.85, OVEN_AT[2] + 1.9], [OVEN_AT[0] - 0.2, 0.8, OVEN_AT[2] + 1.45], (f + 8) / 34), target: [OVEN_AT[0], 0.6, OVEN_AT[2]], fov: 44 };
  return bakery(cam, f, [pup("mia", MIA, [OVEN_AT[0] - 0.65, OVEN_AT[2] + 0.75], { expression: "skeptical", lookX: 0.8, headTilt: 8, bob: breathe(f) })], { ovenLabel: 99, shake: 0.3 + f / 26 });
};

// Gag: the door bursts open and smacks Mia back.
const OvenBurst: React.FC = () => {
  const f = useShotFrame();
  const hit = f >= 8;
  const at: [number, number] = hit ? [OVEN_AT[0] - 0.65 - ramp(f, 8, 14) * 0.5, OVEN_AT[2] + 0.75 + ramp(f, 8, 14) * 0.5] : [OVEN_AT[0] - 0.65, OVEN_AT[2] + 0.75];
  const cam: CameraShot = { position: lerp3([OVEN_AT[0] - 1.2, 1.1, OVEN_AT[2] + 3.2], [OVEN_AT[0] - 1.25, 1.1, OVEN_AT[2] + 2.9], f / 41), target: [OVEN_AT[0] - 0.85, 0.8, OVEN_AT[2] + 0.4], fov: 50 };
  return bakery(cam, f, [pup("mia", hit ? MIA_SOOT : MIA, at, hit ? { expression: "shocked", ...ARMS_UP, headTilt: Math.sin(f) * 8 } : { expression: "skeptical", lookX: 0.8 })], {
    ovenLabel: 99,
    shake: hit ? 0 : 1,
    open: Easing.out(Easing.back(2))(ramp(f, 6, 11)),
    smoke: ramp(f, 8, 30),
  });
};

// Black smoke fills the shop.
const SmokeWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.5, 3.4], [0.1, 1.45, 3.0], f / 42), target: [0.4, 1.1, -1.6], fov: 48 };
  return bakery(cam, f, [
    pup("mia", MIA_SOOT, [0.5, -0.9], { expression: "shocked", armL: [40, -100], armR: [100, 0], headTilt: Math.sin(f / 2) * 6, bob: breathe(f) }),
    pup("jess", JESS, [-0.8, -0.6], { expression: "shocked", ...ARMS_UP, lookX: 0.7 }),
  ], { mode: "smoke", open: 1, smoke: 1 });
};

// The alarm sings.
const AlarmMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.7, 2.4, -1.2], [1.8, 2.5, -1.6], f / 43), target: [1.9, 2.6, -2.9], fov: 44 };
  return (
    <Stage
      bg={moodBackground("night")}
      camera={cam}
      flash={f % 10 < 5 ? 0.12 : 0}
      set={
        <>
          <BakerySet camera={cam} f={f} mode="smoke" open={1} smoke={1} />
          <Label text="ALARM" position={[1.9, 2.4, -2.88]} width={0.6} fg="#ffffff" bg="#e0262f" />
        </>
      }
    />
  );
};

// Nora walks in holding the manual.
const NORA_AT: [number, number] = [-1.85, -0.7];
const manualAt = (at: [number, number]): Vec3 => [at[0] + 0.02, 0.62, at[1] + 0.14];
const NoraIn: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 6, 30, [DOOR_X, -2.6], NORA_AT);
  const cam: CameraShot = { position: lerp3([-0.9, 0.5, 1.7], [-1.0, 0.55, 1.4], f / 63), target: [-1.85, 1.2, -1.8], fov: 50 };
  return (
    <Stage
      bg={moodBackground("night")}
      camera={cam}
      puppets={[pup("nora", NORA, w.at, { expression: "skeptical", ...w.pose, armL: HOLD, armR: HOLD }), pup("mia", MIA_SOOT, [0.4, -0.8], { expression: "shocked", lookX: -1, bob: breathe(f) })]}
      set={
        <>
          <BakerySet camera={cam} f={f} mode="smoke" open={1} smoke={0.6} door={Easing.out(Easing.back(1.4))(ramp(f, 0, 10))} />
          <Manual position={manualAt(w.at)} />
        </>
      }
    />
  );
};

const NoraClose: React.FC = () => {
  const f = useShotFrame();
  return (
    <Stage
      bg={moodBackground("night")}
      camera={close(NORA_AT[0], NORA_AT[1], f / 51, 0.2)}
      blur={6}
      puppets={[pup("nora", NORA, NORA_AT, { expression: "skeptical", armL: HOLD, armR: HOLD, headTilt: -6, lookX: 0.5 })]}
      set={
        <>
          <BakerySet camera={close(NORA_AT[0], NORA_AT[1], f / 51, 0.2)} f={f} mode="smoke" open={1} smoke={0.4} door={1} />
          <Manual position={manualAt(NORA_AT)} />
        </>
      }
    />
  );
};

// Over Mia's sooty shoulder: Nora lifts the manual.
const SootyOTS: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.75, 1.45, 1.5], [0.7, 1.42, 1.25], f / 29), target: [NORA_AT[0], 0.95, NORA_AT[1]], fov: 32 };
  const lift = ramp(f, 4, 14) * 0.4;
  return (
    <Stage
      bg={moodBackground("night")}
      camera={cam}
      puppets={[pup("mia", MIA_SOOT, [0.55, 0.45], { view: "back", expression: "shocked" }), pup("nora", NORA, NORA_AT, { expression: "smug", armL: HOLD, armR: [10 + lift * 50, -78], lookX: 0.6 })]}
      set={
        <>
          <BakerySet camera={cam} f={f} mode="smoke" open={1} smoke={0.3} door={1} />
          <Manual position={[NORA_AT[0] + 0.12, 0.5 + lift * 0.3, NORA_AT[1] + 0.16]} />
        </>
      }
    />
  );
};

// Push hard into Mia's sooty face, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 35));
  const cam: CameraShot = { position: lerp3([0.45, 1.05, 1.3], [0.42, 0.98, -0.45], p), target: [0.4, 0.95, -0.8], fov: 38 };
  return bakery(cam, f, [pup("mia", MIA_SOOT, [0.4, -0.8], { expression: "neutral", lookX: 0, blink: false })], { mode: "smoke", open: 1, smoke: 0.4, door: 1 }, { flash: ramp(f, 26, 35) });
};

// The control room inside her head.
const MIA_CTRL: [number, number] = [0.95, -0.55];
const ControlWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 2.1, 3.8], [0.2, 1.9, 3.3], (f + 8) / 48), target: [0, 1.3, -1.8], fov: 52 };
  return control(cam, f, { inside: f - 4 }, [pup("mia", MIA, MIA_CTRL, { expression: "smug", armL: [60, -110], armR: [60, -110], lookX: -0.6, bob: breathe(f) })], { flash: 1 - ramp(f, 0, 10) });
};

const ControlButton: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.7, 1.05, 1.9], [-0.5, 1.0, 1.6], f / 37), target: [GO_AT[0] + 0.3, 1.0, GO_AT[2]], fov: 48 };
  return control(cam, f, { inside: 99 });
};

// Low angle: the giant red button towers.
const ButtonLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 0.3, 0.35], [0.25, 0.32, 0.15], f / 29), target: [GO_AT[0], 1.25, GO_AT[2]], fov: 52 };
  return control(cam, f, { inside: 99 });
};

// Top-down macro: GO, worn smooth.
const ButtonTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([GO_AT[0] + 0.05, 2.9, GO_AT[2] + 0.45], [GO_AT[0], 2.55, GO_AT[2] + 0.35], f / 38), target: [GO_AT[0], 1.2, GO_AT[2]], fov: 44 };
  return control(cam, f, { go: f - 10 });
};

// Gag: she slams GO three times and it jumps out of its socket.
const ButtonSlam: React.FC = () => {
  const f = useShotFrame();
  const hits = [4, 12, 20];
  const down = hits.some((h) => f >= h && f < h + 4);
  const pop = f >= 24 ? Math.sin(Math.min(Math.PI, (f - 24) / 6)) * (1 - ramp(f, 24, 36)) + (f >= 30 ? 0.25 : 0) : 0;
  const cam: CameraShot = { position: lerp3([-0.2, 1.5, 1.9], [-0.1, 1.45, 1.6], f / 36), target: [0.35, 1.1, -1.0], fov: 46 };
  return control(cam, f, { press: down ? 1 : 0, pop }, [pup("mia", MIA, [0.72, -0.85], { expression: f >= 24 ? "shocked" : "excited", armR: down ? [70, -10] : [150, -20], armL: [40, -100], lookX: -1 })]);
};

const DialShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.2, 1.85, 0.6], [-1.45, 1.85, 0.1], f / 65), target: [DIAL_AT[0], 1.9, -2.9], fov: 42 };
  return control(cam, f, { go: 99, patience: f - 6 });
};

// Macro: the dial is still sealed in plastic, NEW sticker on.
const WrapMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([DIAL_AT[0] + 0.35, 1.95, -1.15], [DIAL_AT[0] + 0.25, 1.9, -1.45], f / 35), target: [DIAL_AT[0] + 0.05, 1.85, -2.9], fov: 44 };
  return control(cam, f, { go: 99 });
};

const SwitchShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.2, 1.85, 0.6], [1.45, 1.9, 0.1], f / 46), target: [SWITCH_AT[0], 1.9, -2.9], fov: 42 };
  return control(cam, f, { go: 99, think: f - 6 });
};

// Macro: the plug lies on the floor, never plugged in.
const PlugMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.5, 1.2, -0.2], [1.65, 1.1, -0.55], f / 33), target: [2.3, 0.6, -2.6], fov: 48 };
  return control(cam, f, { go: 99, think: 99, plug: f - 4 });
};

// The ANGER screen counts down 4 seconds to zero.
const AngerScreen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 2.1, 0.6], [0.1, 2.2, 0.2], f / 40), target: [ANGER_AT[0], 2.4, -2.9], fov: 44 };
  return control(cam, f, { go: 99, anger: f });
};

const AngerCalm: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.7, 3.0], [0.3, 1.65, 2.6], f / 53), target: [0.3, 1.5, -1.6], fov: 48 };
  return control(cam, f, { go: 99, anger: 99 }, [pup("mia", MIA, MIA_CTRL, { expression: "smug", armL: [40, -100], armR: [150, -20], headTilt: Math.sin(f / 5) * 6, bob: breathe(f) })]);
};

// Tuesday night: CLOSED on the door.
const ClosedSign: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.45, 1.6, 0.7], [-1.6, 1.6, 0.3], (f + 8) / 66), target: [-1.7, 1.7, -2.9], fov: 48 };
  return bakery(cam, f, [], { mode: "closed", tuesday: f - 4 });
};

// Mia skips out, happy; Jess can't believe it.
const MiaSkips: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 30, [0.6, -0.6], [-1.9, -0.7]);
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 2.7], [0.0, 1.25, 2.35], f / 39), target: [-0.6, 0.95, -1.4], fov: 46 };
  return bakery(cam, f, [pup("mia", MIA, w.at, { expression: "excited", ...w.pose, armL: [150, -20], bob: Math.abs(Math.sin(f / 3)) * -10 }), pup("jess", JESS, [0.8, -0.3], { expression: "shocked", lookX: -1, armL: [100, 0] })], { mode: "closed", tuesday: 99 });
};

// Wednesday: MIA'S GYM.
const GymSign: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 0.5, 1.6], [-0.2, 0.55, 1.2], (f + 8) / 48), target: [-0.4, 1.9, -2.2], fov: 52 };
  return gym(cam, f, [pup("mia", MIA, [-0.25, -2.2], { expression: "excited", ...ARMS_UP, bob: breathe(f) })], { gym: f - 4, wednesday: f - 16 });
};

// She punches the bag; it swings away.
const MIA_GYM: [number, number] = [0.55, -1.4];
const GymBag: React.FC = () => {
  const f = useShotFrame();
  const punch = f >= 8 && f < 13;
  const cam: CameraShot = { position: lerp3([0.2, 0.7, 1.4], [0.35, 0.75, 1.1], f / 34), target: [0.9, 1.2, -1.6], fov: 50 };
  return gym(cam, f, [pup("mia", MIA, MIA_GYM, { expression: punch ? "excited" : "smug", view: "side", facing: 1, armR: punch ? [90, 0] : [60, -110], armL: [60, -110] })], { gym: 99, wednesday: 99, swing: f >= 10 ? Math.sin((f - 10) / 4) * 0.5 * Math.exp(-(f - 10) / 20) : 0 });
};

const STUDENT_AT: [number, number] = [-0.45, -0.75];
const MiaBrag: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 1.2, 2.2], [0.25, 1.15, 1.85], f / 61), target: [0.0, 0.95, -0.9], fov: 44 };
  return gym(cam, f, [
    pup("mia", MIA, [0.45, -0.95], { expression: "smug", armL: [60, -110], armR: [60, -110], lookX: -0.7, bob: breathe(f) }),
    pup("student", STUDENT, STUDENT_AT, { expression: "skeptical", lookX: 0.7, armL: [20, -30], bob: breathe(f + 6) }),
  ], { gym: 99 });
};

// Gag: the student flat on the mat, stars circling; Mia arms up.
const StudentDown: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 0, 8));
  const cam: CameraShot = { position: lerp3([0.05, 2.3, 1.7], [0.1, 2.2, 1.45], f / 53), target: [0.15, 0.25, -1.0], fov: 50 };
  return (
    <Stage
      bg={moodBackground("dream")}
      camera={cam}
      puppets={[pup("mia", MIA, [-0.35, -1.6], { expression: "excited", ...ARMS_UP, bob: breathe(f) })]}
      set={
        <GymSet camera={cam} f={f} gym={99} swing={0}>
          <group position={[STUDENT_AT[0], 0.06, STUDENT_AT[1]]} rotation={[0, 0, (-fall * Math.PI) / 2]} scale={squash(f, 8, 0.2)}>
            <PuppetBillboard id="student" look={STUDENT} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false }} />
          </group>
          {f > 8 && <DizzyStars position={[STUDENT_AT[0] + 0.95, 0.3, STUDENT_AT[1] + 0.1]} f={f} />}
        </GymSet>
      }
    />
  );
};

const SHOTS: Shot[] = [
  [0, 48, BathHook, false],
  [48, 87, OfficeQuit, true],
  [87, 138, ShowerIdea, true],
  [138, 177, PhoneTop, false],
  [177, 221, TrackIntro, true],
  [221, 260, TrackRace, false],
  [260, 319, SignUp, false],
  [319, 371, BakeryOpen, true],
  [371, 424, JessShout, false],
  [424, 462, OvenTwoShot, false],
  [462, 506, MiaLearn, false],
  [506, 556, StreetQueue, true],
  [556, 596, QueueTop, false],
  [596, 622, OvenRumble, true],
  [622, 663, OvenBurst, false],
  [663, 702, SmokeWide, false],
  [702, 745, AlarmMacro, false],
  [745, 808, NoraIn, false],
  [808, 859, NoraClose, false],
  [859, 888, SootyOTS, false],
  [888, 923, HeadPush, false],
  [923, 963, ControlWide, true],
  [963, 1003, ControlButton, false],
  [1003, 1032, ButtonLow, false],
  [1032, 1070, ButtonTop, false],
  [1070, 1106, ButtonSlam, false],
  [1106, 1173, DialShot, false],
  [1173, 1210, WrapMacro, false],
  [1210, 1257, SwitchShot, false],
  [1257, 1290, PlugMacro, false],
  [1290, 1330, AngerScreen, false],
  [1330, 1383, AngerCalm, false],
  [1383, 1441, ClosedSign, true],
  [1441, 1480, MiaSkips, false],
  [1480, 1520, GymSign, true],
  [1520, 1554, GymBag, false],
  [1554, 1615, MiaBrag, false],
  [1615, TIMING.totalFrames, StudentDown, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.1, until: 177 },
  { at: 2, src: sfx("pop"), volume: 0.55 },
  { at: 16, src: sfx("button"), volume: 0.6 },
  { at: 50, src: sfx("pop"), volume: 0.45 },
  { at: 60, src: sfx("paper"), volume: 0.35 },
  { at: 87, src: sfx("hum"), volume: 0.2, until: 138 },
  { at: 101, src: sfx("pop"), volume: 0.5 },
  { at: 104, src: sfx("chime"), volume: 0.35 },
  { at: 150, src: sfx("button"), volume: 0.6 },
  { at: 153, src: sfx("credit-blip"), volume: 0.45 },
  { at: 181, src: sfx("pop"), volume: 0.5 },
  { at: 223, src: sfx("whoosh"), volume: 0.45 },
  ...[221, 239, 257].map((at) => ({ at, src: sfx("pop"), volume: 0.45 })),
  { at: 264, src: sfx("pop"), volume: 0.4 },
  { at: 284, src: sfx("stamp"), volume: 0.7 },
  { at: 325, src: sfx("pop"), volume: 0.5 },
  { at: 328, src: sfx("chime"), volume: 0.35 },
  { at: 371, src: sfx("ambience"), volume: 0.15, until: 506 },
  { at: 430, src: sfx("pop"), volume: 0.45 },
  { at: 506, src: sfx("ambience"), volume: 0.25, until: 596 },
  ...[520, 540, 566, 584].map((at) => ({ at, src: sfx("credit-blip"), volume: 0.3 })),
  // The twist: rumble into the burst, riser ending on the bang, sting on it.
  { at: 584, src: sfx("riser"), volume: 0.25 },
  { at: 596, src: sfx("hum"), volume: 0.35, until: 628 },
  { at: 628, src: sfx("boom"), volume: 0.6 },
  { at: 629, src: sfx("sting"), volume: 0.4 },
  { at: 630, src: sfx("whoosh"), volume: 0.4 },
  { at: 663, src: sfx("ambience"), volume: 0.2, until: 888 },
  ...Array.from({ length: 10 }, (_, k) => ({ at: 690 + k * 6, src: sfx("chime"), volume: 0.18 })),
  { at: 746, src: sfx("door"), volume: 0.55 },
  ...[752, 760, 768].map((at) => ({ at, src: sfx("tick"), volume: 0.3 })),
  { at: 862, src: sfx("paper"), volume: 0.4 },
  { at: 892, src: sfx("whoosh"), volume: 0.45 },
  { at: 914, src: sfx("riser"), volume: 0.15 },
  { at: 923, src: sfx("hum"), volume: 0.18, until: 1383 },
  { at: 927, src: sfx("pop"), volume: 0.5 },
  { at: 1042, src: sfx("pop"), volume: 0.5 },
  ...[1074, 1082, 1090].map((at) => ({ at, src: sfx("button"), volume: 0.7 })),
  { at: 1094, src: sfx("boom"), volume: 0.45 },
  { at: 1112, src: sfx("pop"), volume: 0.45 },
  { at: 1115, src: sfx("tick"), volume: 0.35 },
  { at: 1176, src: sfx("paper"), volume: 0.45 },
  { at: 1216, src: sfx("pop"), volume: 0.45 },
  { at: 1230, src: sfx("button"), volume: 0.5 },
  { at: 1238, src: sfx("near-miss"), volume: 0.3 },
  { at: 1261, src: sfx("pop"), volume: 0.45 },
  ...[1290, 1300, 1310, 1320].map((at) => ({ at, src: sfx("tick"), volume: 0.45 })),
  { at: 1330, src: sfx("chime"), volume: 0.4 },
  { at: 1383, src: sfx("ambience"), volume: 0.12, until: 1480 },
  { at: 1387, src: sfx("pop"), volume: 0.45 },
  { at: 1450, src: sfx("whoosh"), volume: 0.3 },
  { at: 1486, src: sfx("pop"), volume: 0.5 },
  { at: 1498, src: sfx("pop"), volume: 0.45 },
  { at: 1529, src: sfx("boom"), volume: 0.5 },
  { at: 1623, src: sfx("boom"), volume: 0.55 },
  { at: 1630, src: sfx("chime"), volume: 0.3 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 596, volume: 0.2 },
  { src: MUSIC_FILES.tension, from: 596, to: 888, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 888, to: 1383, volume: 0.28 },
  { src: MUSIC_FILES.lounge, from: 1383, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
