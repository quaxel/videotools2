import React from "react";
import { Easing } from "remotion";
import {
  breathe,
  CameraShot,
  Counter,
  Door,
  InkBox,
  Label,
  Lamp,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  Plant,
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
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import { BigPhone, Closet, CoatRain, Corkboard, Couch, DayCounter, FilingCabinet, Flowers, Notebook, Padlock, PaperBurst, Stool, WineBottle, WineGlass } from "./props";
import TIMING_JSON from "./timing.json";

// "A Scorpio Already Knows" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "scorpio-sign";
export const timing = TIMING;

// ---------- cast ----------

const VERA: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#2b2433", long: true };
const SWEATER = { outfit: "#ff8fc8", pattern: "#c2185b" };
const JEN: PuppetLook = { skin: "#fbe9d6", hair: "#e8c15a", outfit: "#ffd23f", long: true };
const JEN_S: PuppetLook = { ...JEN, ...SWEATER };
const KIM: PuppetLook = { skin: "#c68642", hair: "#a0442a", ...SWEATER, long: true };
const TOM: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#4f7dff" };
const TOM_S: PuppetLook = { ...TOM, ...SWEATER };

const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
const CROSSED = { armL: [40, -110] as [number, number], armR: [40, -110] as [number, number] };
const HUG = { armL: [80, -70] as [number, number], armR: [80, -70] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.08, ty = 0.92): CameraShot => ({
  position: lerp3([px + dx, y, pz + 1.85], [px + dx * 0.8, y - 0.03, pz + 1.55], p),
  target: [px, ty, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// The bar: burgundy. Vera on a stool in front of the counter; Jen and Tom standing to her right.
const BAR_AT: Vec3 = [0, 0, -2.55];
const VERA_BAR: [number, number] = [-0.7, -1.6];
const JEN_BAR: [number, number] = [0.35, -1.55];
const TOM_BAR: [number, number] = [0.95, -1.7];
const NOTE_AT: Vec3 = [-0.45, 0.985, -2.42]; // 1.5 cm above the counter top (0.97)
const BarSet: React.FC<{ camera: CameraShot; f: number; scorpio?: number; name?: number; traits?: number; tom?: number; scrawl?: number; children?: React.ReactNode }> = ({ camera, scorpio, name, traits, tom, scrawl = 1, children }) => (
  <Room camera={camera} mood="warm" floor="#2a1018" wall="#7a1e3a" stripe="#e8b04a" width={9} depth={6} wallPattern="wallpaper" floorPattern="wood" sun={{ x: 1.8, color: "#ffb38a", bars: 3 }}>
    {scorpio !== undefined && <ZodiacBadge sign="scorpio" position={[-0.3, 2.5, -2.92]} size={0.7} bg="#1d1a1a" fg="#e0262f" appear={scorpio} />}
    {scorpio !== undefined && <Label text="SCORPIO" position={[-0.3, 1.95, -2.94]} width={1.05} fg="#ffffff" bg="#e0262f" appear={scorpio - 4} />}
    <Label text="GIRLS' NIGHT" position={[0.62, 2.5, -2.94]} width={0.95} fg="#7a1e3a" bg="#ffd23f" />
    <Counter position={BAR_AT} size={[3.6, 0.92, 0.6]} color="#3a1a10" top="#e8b04a" />
    <Shelf position={[-2.9, 0, -2.65]} width={1.0} rows={4} color="#3a1a10" seed={8} />
    <Stool position={[VERA_BAR[0], 0, VERA_BAR[1]]} color="#e0262f" />
    <Notebook position={NOTE_AT} rotationY={0.15} heading="TOM" scrawl={scrawl} scale={1.3} />
    {name !== undefined && <Label text="VERA" position={[-1.3, 2.45, -2.92]} width={0.75} fg="#ffffff" bg="#13235e" appear={name} />}
    {traits !== undefined &&
      ["LOYAL", "INTENSE", "QUIET"].map((t, i) => (
        <Label key={t} text={t} position={[-1.3, 2.1 - i * 0.3, -2.9]} width={0.6} fg="#13235e" bg="#ffd23f" appear={traits - i * 16} />
      ))}
    {tom !== undefined && <Label text={"TOM\nNEW BOYFRIEND"} position={[0.9, 2.15, -2.92]} width={0.9} fg="#ffffff" bg="#c2185b" appear={tom} />}
    <Lamp position={[1.35, 2.45, -1.9]} color="#ffb38a" />
    {children}
  </Room>
);

// Vera's phone: dark green, a giant phone screen.
const PhoneSet: React.FC<{ camera: CameraShot; f: number; text: string; count?: number }> = ({ camera, text, count }) => (
  <Room camera={camera} mood="night" floor="#0d2a1e" wall="#1d4a34" stripe="#3fae5a" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
    <BigPhone position={[0, 0.25, -2.4]} />
    <Screen position={[0, 1.2, -2.33]} size={[0.86, 1.5]} text={text} glow="#3fae5a" bg="#06140d" count={count} />
    <Plant position={[-2.0, 0, -2.5]} />
  </Room>
);

// Dinner: pink, flowers on the table.
const DINNER_TABLE: Vec3 = [0, 0, -1.9];
const JEN_DIN: [number, number] = [-0.55, -1.9];
const TOM_DIN: [number, number] = [0.55, -1.9];
const DinnerSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera }) => (
  <Room camera={camera} mood="warm" floor="#7a2e4a" wall="#ff8fb8" stripe="#ffffff" width={8} depth={6} wallPattern="wallpaper" floorPattern="tile" sun={{ x: -1.6, color: "#ffe0ee", bars: 4 }}>
    <InkBox size={[0.9, 0.05, 0.7]} position={[DINNER_TABLE[0], 0.6, DINNER_TABLE[2]]} color="#fff6dc" />
    <InkBox size={[0.08, 0.57, 0.08]} position={[DINNER_TABLE[0], 0.285, DINNER_TABLE[2]]} color="#7a2e4a" ink={0.004} />
    <Flowers position={[DINNER_TABLE[0], 0.635, DINNER_TABLE[2] - 0.15]} />
    {[-0.25, 0.25].map((x) => (
      <Plate key={x} x={x} />
    ))}
    {[JEN_DIN, TOM_DIN].map(([x, z]) => (
      <Stool key={x} position={[x, 0, z]} color="#c2185b" />
    ))}
    <Window position={[1.8, 1.6, -2.94]} size={[1.1, 1.0]} sky="#2a1a40" />
    <Label text="DATE NIGHT" position={[0, 2.4, -2.92]} width={1.0} fg="#ffffff" bg="#c2185b" />
  </Room>
);
// A dinner plate set 1 cm above the table top.
const Plate: React.FC<{ x: number }> = ({ x }) => (
  <InkBox size={[0.22, 0.012, 0.22]} position={[DINNER_TABLE[0] + x, 0.64, DINNER_TABLE[2] + 0.12]} color="#ffffff" ink={0.002} />
);

// Jen's living room: warm yellow, the couch, a doorbell by the door.
const COUCH_AT: Vec3 = [0.3, 0, -2.3];
const JEN_COUCH: [number, number] = [-0.05, -1.88];
const TOM_COUCH: [number, number] = [0.65, -1.88];
const LivingSet: React.FC<{ camera: CameraShot; f: number; matching?: number; trip?: number; ring?: number }> = ({ camera, matching, trip, ring = 0 }) => (
  <Room camera={camera} mood="golden" floor="#8a5a1e" wall="#f4c430" stripe="#c2185b" width={8} depth={6} wallPattern="panel" floorPattern="carpet" sun={{ x: 1.6, color: "#fff2c2", bars: 4 }}>
    <Couch position={COUCH_AT} color="#c2185b" width={2.0} />
    <Door position={[-2.2, 0, -2.94]} color="#fff6dc" />
    <InkBox size={[0.1, 0.1, 0.04]} position={[-1.55, 1.15, -2.94]} color="#e0262f" />
    {ring > 0 && <Label text="DING DONG!" position={[-1.55, 1.5 + ring * 0.1, -2.88]} width={0.7 * Math.min(1, ring * 2)} fg="#13235e" bg="#ffffff" />}
    {matching !== undefined && <Label text="MATCHING SWEATERS" position={[0.3, 2.45, -2.92]} width={1.3} fg="#ffffff" bg="#c2185b" appear={matching} />}
    {trip !== undefined && <Label text={"WEEKEND\nTRIP ♥"} position={[1.9, 1.7, -2.92]} width={0.6} fg="#13235e" bg="#ffffff" appear={trip} />}
    <Lamp position={[1.6, 2.3, -2.1]} color="#fff2c2" />
    <Plant position={[2.7, 0, -2.5]} />
  </Room>
);

// The hallway at the front door: cold blue; the closet Tom bolts into.
const DOOR_X = -0.9;
const CLOSET_AT: Vec3 = [1.3, 0, -2.6];
const KIM_DOOR: [number, number] = [DOOR_X, -2.25];
const JEN_DOOR: [number, number] = [0.05, -1.75];
const DoorSet: React.FC<{ camera: CameraShot; f: number; open?: number; closet?: number; same?: number; children?: React.ReactNode }> = ({ camera, open = 1, closet = 0, same, children }) => (
  <Room camera={camera} mood="cold" floor="#26324a" wall="#4a6fa5" stripe="#dff6ff" width={8} depth={6} wallPattern="panel" floorPattern="wood">
    <Door position={[DOOR_X, 0, -2.94]} open={open} color="#dff6ff" glow="#0a1020" />
    <Closet position={CLOSET_AT} open={closet} />
    {same !== undefined && <Label text="SAME SWEATER" position={[-0.4, 2.2, -2.92]} width={1.1} fg="#ffffff" bg="#c2185b" appear={same} />}
    <Lamp position={[-0.2, 2.5, -1.8]} color="#cfe9ff" />
    {children}
  </Room>
);

// Wine table: purple. Vera pours three glasses.
const WINE_TABLE: Vec3 = [0, 0, -1.9];
const GLASSES: Vec3[] = [
  [-0.22, 0.635, -2.0],
  [0.0, 0.635, -1.94],
  [0.22, 0.635, -2.0],
];
const VERA_WINE: [number, number] = [-0.15, -2.45]; // her raised right hand sits over the third glass
const WineSet: React.FC<{ camera: CameraShot; f: number; fill?: number[]; saw?: number; bottle?: boolean }> = ({ camera, fill = [1, 1, 1], saw, bottle = true }) => (
  <Room camera={camera} mood="dream" floor="#2a1a40" wall="#7b2cbf" stripe="#ffd23f" width={8} depth={6} wallPattern="wallpaper" floorPattern="wood">
    <InkBox size={[1.1, 0.05, 0.6]} position={[WINE_TABLE[0], 0.6, WINE_TABLE[2]]} color="#3a1a10" />
    <InkBox size={[0.08, 0.57, 0.08]} position={[WINE_TABLE[0], 0.285, WINE_TABLE[2]]} color="#3a1a10" ink={0.004} />
    {GLASSES.map((g, i) => (
      <WineGlass key={i} position={g} fill={fill[i]} />
    ))}
    {bottle && <WineBottle position={[0.42, 0.635, -1.95]} />}
    {saw !== undefined && <Label text="SAW IT COMING" position={[0, 1.45, -2.92]} width={1.2} fg="#ffffff" bg="#e0262f" appear={saw} />}
    <Window position={[1.9, 1.6, -2.94]} size={[1.0, 1.0]} sky="#13235e" />
    <Lamp position={[0, 2.3, -1.9]} color="#ffb3ff" />
  </Room>
);

// Inside her head: a near-black red room with the corkboard.
const BOARD_AT: Vec3 = [0, 1.55, -2.9];
const HeadSet: React.FC<{ camera: CameraShot; f: number; pins?: number; suspect?: number; newPhoto?: number; inside?: number }> = ({ camera, pins = 6, suspect = 99, newPhoto = -1, inside }) => (
  <Room camera={camera} mood="alarm" floor="#1a0a0a" wall="#3a0e12" stripe="#e0262f" width={8} depth={6} wallPattern="plaster" floorPattern="concrete">
    {inside !== undefined && <Label text="INSIDE VERA" position={[0, 2.6, -2.92]} width={1.2} fg="#ffffff" bg="#e0262f" appear={inside} />}
    <Corkboard position={BOARD_AT} pins={pins} suspect={suspect} newPhoto={newPhoto} />
    <ZodiacBadge sign="scorpio" position={[2.3, 2.5, -2.92]} size={0.45} bg="#e0262f" fg="#1d1a1a" />
    <Lamp position={[1.6, 2.5, -1.8]} color="#ff6b5a" />
  </Room>
);

// The archive: grey. Filing cabinet, padlock, counter.
const CAB_AT: Vec3 = [-1.2, 0, -2.5];
const LOCK_AT: Vec3 = [0.25, 1.5, -2.85];
const COUNT_AT: Vec3 = [1.55, 1.6, -2.85];
const ArchiveSet: React.FC<{ camera: CameraShot; f: number; out?: number; papers?: number; lockTag?: number; nokey?: number; days?: number; value?: number; flip?: number; shake?: number }> = ({
  camera,
  out = 0,
  papers = 0,
  lockTag,
  nokey,
  days,
  value = 0,
  flip = 0,
  shake = 0,
}) => (
  <Room camera={camera} mood="office" floor="#3a3a44" wall="#8a8f98" stripe="#e0262f" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
    <FilingCabinet position={CAB_AT} out={out} />
    <PaperBurst position={[CAB_AT[0], 1.15, CAB_AT[2] + 0.6]} t={papers} />
    <Padlock position={LOCK_AT} scale={1.4} appear={lockTag} shake={shake} />
    {nokey !== undefined && <Label text="NO KEY" position={[LOCK_AT[0], LOCK_AT[1] - 0.42, -2.84]} width={0.5} fg="#ffffff" bg="#e0262f" appear={nokey} />}
    <DayCounter position={COUNT_AT} value={value} flip={flip} />
    {days !== undefined && <Label text={"DAYS SINCE\nI FORGAVE"} position={[COUNT_AT[0], COUNT_AT[1] + 0.55, -2.86]} width={0.8} fg="#ffffff" bg="#13235e" appear={days} />}
    <ZodiacBadge sign="scorpio" position={[-2.5, 2.6, -2.92]} size={0.4} bg="#e0262f" fg="#1d1a1a" />
  </Room>
);

// ---------- stage wrappers ----------

const bar = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BarSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<BarSet camera={camera} f={f} {...extra} />} />
);
const phone = (camera: CameraShot, f: number, extra: React.ComponentProps<typeof PhoneSet> extends infer P ? Omit<P, "camera" | "f"> : never) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={[]} set={<PhoneSet camera={camera} f={f} {...extra} />} />
);
const dinner = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} set={<DinnerSet camera={camera} f={f} />} />;
const living = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof LivingSet>> = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<LivingSet camera={camera} f={f} {...extra} />} />
);
const hall = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof DoorSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} {...grade} set={<DoorSet camera={camera} f={f} {...extra} />} />
);
const wine = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof WineSet>> = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<WineSet camera={camera} f={f} {...extra} />} />
);
const head = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof HeadSet>> = {}, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("alarm")} camera={camera} puppets={puppets} {...grade} set={<HeadSet camera={camera} f={f} {...extra} />} />
);
const archive = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof ArchiveSet>> = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={[]} set={<ArchiveSet camera={camera} f={f} {...extra} />} />
);

const veraSeat = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup("vera", VERA, VERA_BAR, { sit: true, expression: "skeptical", blink: false, lookX: 0.8, bob: breathe(f) * 0.3, ...pose });
const jenBar = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup("jen", JEN, JEN_BAR, { expression: "excited", ...HUG, lookX: 1, bob: breathe(f), ...pose });
const tomBar = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup("tom", TOM, TOM_BAR, { expression: "smug", lookX: -0.6, bob: breathe(f + 7), ...pose });

// ---------- shots ----------

// Hook: girls' night under the SCORPIO sign; Vera stares at Tom and stops blinking.
const HookBar: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.4, 2.4], [0.1, 1.38, 2.05], f / 45), target: [0.1, 1.3, -2.2], fov: 56 };
  return bar(cam, f, [veraSeat(f), jenBar(f), tomBar(f)], { scorpio: f - 2 });
};

const StareClose: React.FC = () => {
  const f = useShotFrame();
  return bar(close(VERA_BAR[0], VERA_BAR[1], f / 45, -0.2), f, [veraSeat(f, { headTilt: -4 })], {}, { blur: 6 });
};

// Jen shows off her new boyfriend.
const JenIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.3, 1.0], [0.8, 1.28, 0.7], f / 60), target: [0.65, 1.2, -2.0], fov: 48 };
  return bar(cam, f, [jenBar(f, { expression: "excited", armL: [150, -20], headTilt: Math.sin(f / 6) * 6 }), tomBar(f, { armR: [100, -20] })], { tom: f - 10 });
};

// Vera: name and traits.
const VeraIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 1.2], [-1.15, 1.15, 0.4], (f + 6) / 60), target: [-1.0, 1.3, -2.2], fov: 50 };
  return bar(cam, f, [veraSeat(f, { lookX: 0.9 })], { name: f - 4, traits: f - 22 });
};

// Low angle: she does not blink.
const VeraLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 0.55, -0.4], [-0.45, 0.58, -0.6], f / 57), target: [VERA_BAR[0], 1.0, VERA_BAR[1]], fov: 50 };
  return bar(cam, f, [veraSeat(f, { lookX: 0.9, headTilt: -6 })], { traits: 99, name: 99 });
};

// Her phone: your password.
const PhonePass: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.6, 1.0], [0.1, 1.28, 0.2], Easing.out(Easing.cubic)(f / 43)), target: [0, 1.2, -2.4], fov: 50 };
  return phone(cam, f, { text: "YOUR\nPASSWORD\n✓" });
};

const PhoneClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.7, 1.4, 0.4], [0.2, 1.2, -0.1], f / 41), target: [0, 1.2, -2.4], fov: 46 };
  return phone(cam, f, { text: "YOU NEVER\nTOLD HER" });
};

// Tom's ex, found in eight minutes.
const PhoneSearch: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 1.1, 0.4], [-0.3, 1.3, 0.0], f / 34), target: [0, 1.2, -2.4], fov: 46 };
  return phone(cam, f, { text: `SEARCHING\nHIS EX\n${".".repeat(1 + (Math.floor(f / 4) % 3))}` });
};

const PhoneFound: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.25, 0.6], [0.0, 1.22, -0.2], Easing.out(Easing.cubic)(f / 32)), target: [0, 1.2, -2.4], fov: 46 };
  return phone(cam, f, { text: `EX FOUND\n${Math.round(8 * ramp(f, 0, 10))} MIN` });
};

// Jen: "Stop it Vera, he's a nice guy!"
const JenStop: React.FC = () => {
  const f = useShotFrame();
  return bar(close(JEN_BAR[0], JEN_BAR[1], f / 38, 0.25, 1.15, 1.0), f, [jenBar(f, { expression: "skeptical", armL: [90, 0], armR: [20, -40], lookX: -1, headTilt: Math.sin(f / 4) * 5 })], {}, { blur: 6 });
};

const TomWave: React.FC = () => {
  const f = useShotFrame();
  return bar(close(TOM_BAR[0], TOM_BAR[1], f / 31, 0.25, 1.15, 1.0), f, [tomBar(f, { expression: "excited", armR: [150 + Math.sin(f / 2) * 15, -20] })], {}, { blur: 6 });
};

// Vera nods and writes in the notebook (the seed).
const VeraNod: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 0.1], [-0.62, 1.28, -0.15], f / 34), target: [-0.62, 1.0, -2.1], fov: 46 };
  return bar(cam, f, [veraSeat(f, { headTilt: Math.sin(f / 5) * 8, lookX: 0.3, armR: [60, -60] })], { scrawl: ramp(f, 4, 30) * 0.5 });
};

// Top-down macro: the notebook page.
const NoteMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([NOTE_AT[0] - 0.03, 1.8, NOTE_AT[2] + 0.14], [NOTE_AT[0] - 0.04, 1.58, NOTE_AT[2] + 0.08], f / 41), target: [NOTE_AT[0] - 0.05, NOTE_AT[1], NOTE_AT[2] - 0.03], fov: 44 };
  return bar(cam, f, [], { scrawl: 0.5 + ramp(f, 0, 30) * 0.5 });
};

// Jen ignores her.
const JenIgnore: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.4, 2.35], [-0.05, 1.38, 2.05], f / 39), target: [0.0, 1.15, -2.0], fov: 60 };
  return bar(cam, f, [veraSeat(f, { ...CROSSED }), jenBar(f, { armL: [150, -20], armR: [20, -60], lookX: 1, headTilt: 10 }), tomBar(f, { expression: "excited", armL: [80, -60] })]);
};

// Date night with flowers.
const DinnerShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.4, 1.7], [0.15, 1.38, 1.35], f / 70), target: [0, 1.0, -2.0], fov: 54 };
  return dinner(cam, f, [
    pup("jen", JEN, JEN_DIN, { sit: true, expression: "excited", lookX: 1, armR: [70, -60], bob: breathe(f) * 0.4 }),
    pup("tom", TOM, TOM_DIN, { sit: true, expression: "smug", lookX: -1, armL: [70, -60], bob: breathe(f + 5) * 0.4 }),
  ]);
};

// Matching sweaters on the couch, a weekend trip on the wall.
const SweaterCouch: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.3, 1.2], [0.3, 1.28, 0.85], f / 73), target: [0.3, 1.2, -2.0], fov: 52 };
  return living(cam, f, [
    pup("jen", JEN_S, JEN_COUCH, { sit: true, expression: "excited", ...HUG, lookX: 1, headTilt: 8, bob: breathe(f) * 0.4 }),
    pup("tom", TOM_S, TOM_COUCH, { sit: true, expression: "smug", lookX: -1, headTilt: -6, bob: breathe(f + 5) * 0.4 }),
  ], { matching: f - 30, trip: f - 6 });
};

// The twist: the doorbell rings.
const Doorbell: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.3, 1.3], [-0.4, 1.3, 1.0], f / 52), target: [-0.6, 1.2, -2.0], fov: 54 };
  return living(cam, f, [
    pup("jen", JEN_S, JEN_COUCH, { sit: true, expression: f > 10 ? "shocked" : "excited", lookX: -1, bob: breathe(f) * 0.4 }),
    pup("tom", TOM_S, TOM_COUCH, { sit: true, expression: f > 10 ? "shocked" : "smug", lookX: -1, blink: false }),
  ], { trip: 99, ring: f > 4 && f < 30 ? ramp(f, 4, 10) : 0 });
};

// Kim at the door, in the same sweater.
const DoorOpen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.3, 1.4], [-0.2, 1.28, 1.1], f / 35), target: [-0.45, 1.15, -2.4], fov: 52 };
  return hall(cam, f, [pup("kim", KIM, KIM_DOOR, { expression: "neutral", lookX: 0.3, blink: false }), pup("jen", JEN_S, JEN_DOOR, { view: "back", expression: "shocked" })], {
    open: Easing.out(Easing.back(1.5))(ramp(f, 0, 10)),
  }, { truth: 0.3 });
};

const SameSweater: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.3, 1.2], [-0.42, 1.28, 0.95], f / 36), target: [-0.4, 1.2, -2.0], fov: 50 };
  return hall(cam, f, [pup("kim", KIM, KIM_DOOR, { expression: "skeptical", lookX: 1 }), pup("jen", JEN_S, JEN_DOOR, { expression: "shocked", lookX: -1, blink: false })], { same: f - 4 }, { truth: 0.3 });
};

// Kim: "Hi, I think we need to talk."
const KimTalk: React.FC = () => {
  const f = useShotFrame();
  return hall(close(KIM_DOOR[0], KIM_DOOR[1], f / 55, 0.25, 1.15, 1.0), f, [pup("kim", KIM, KIM_DOOR, { expression: "neutral", armR: [40, -20], headTilt: -4 })], {}, { truth: 0.3, blur: 6 });
};

// Gag: Tom bolts into the closet; coats rain down on him.
const TOM_CLOSET: [number, number] = [CLOSET_AT[0], -1.95];
const TomBolt: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 18, [-0.2, -1.4], TOM_CLOSET);
  const cam: CameraShot = { position: [w.at[0] + 0.1, 1.35, 1.1], target: [w.at[0] + 0.2, 1.1, -2.2], fov: 52 };
  return hall(cam, f, [pup("tom", TOM_S, w.at, { expression: "shocked", ...w.pose, ...ARMS_UP, bob: (w.pose.bob ?? 0) - Math.abs(Math.sin(f / 3)) * 6 })], { closet: ramp(f, 12, 20) });
};

const CoatGag: React.FC = () => {
  const f = useShotFrame();
  const t = ramp(f, 2, 20);
  const cam: CameraShot = { position: lerp3([1.0, 1.4, 0.4], [1.05, 1.35, 0.15], f / 30), target: [CLOSET_AT[0], 1.0, -2.2], fov: 48 };
  return hall(cam, f, [pup("tom", TOM_S, TOM_CLOSET, { expression: "shocked", ...ARMS_UP, blink: false, bob: squash(f, 18, 0.15)[1] * 40 })], {
    closet: 1,
    children: <CoatRain position={[TOM_CLOSET[0], 0, TOM_CLOSET[1] + 0.12]} t={t} />,
  });
};

// Vera already pouring three glasses.
const VeraPour: React.FC = () => {
  const f = useShotFrame();
  const pour = ramp(f, 4, 12) * (1 - ramp(f, 40, 48));
  const cam: CameraShot = { position: lerp3([0.6, 1.6, 0.9], [0.0, 1.4, 0.1], f / 50), target: [0, 0.95, -2.1], fov: 48 };
  return wine(cam, f, [pup("vera", VERA, VERA_WINE, { expression: "smug", hold: { item: "wine", hand: "R" }, armR: [115 + pour * 15, -55], itemTilt: pour * 110, lookX: -0.4, blink: false, bob: breathe(f) })], {
    bottle: false,
    fill: [1, 1, ramp(f, 8, 40)],
  });
};

const ThreeGlasses: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.5, 1.3, 0.0], [-0.3, 1.05, -0.5], f / 61), target: [0, 0.95, -2.2], fov: 44 };
  return wine(cam, f, [], { saw: f - 10 });
};

// Push into Vera's eyes, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 40));
  const cam: CameraShot = { position: lerp3([VERA_BAR[0] + 0.05, 1.05, VERA_BAR[1] + 1.6], [VERA_BAR[0] + 0.02, 0.98, VERA_BAR[1] + 0.25], p), target: [VERA_BAR[0], 0.95, VERA_BAR[1]], fov: 38 };
  return bar(cam, f, [veraSeat(f, { lookX: 0 })], {}, { flash: ramp(f, 34, 48) });
};

// The corkboard and its red string.
const BoardWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.6, 2.2], [0.2, 1.58, 1.7], (f + 6) / 50), target: [0, 1.5, -2.6], fov: 52 };
  return head(cam, f, { inside: f - 4, suspect: -99 }, [], { flash: 1 - ramp(f, 0, 10) });
};

const StringMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.7, 1.8, -1.6], [-0.2, 1.75, -1.75], f / 34), target: [-0.3, 1.75, -2.9], fov: 46 };
  return head(cam, f, { suspect: -99 });
};

// Every photo: SUSPECT.
const SuspectShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.6, 0.2], [0.4, 1.5, -0.4], f / 64), target: [0, 1.5, -2.9], fov: 50 };
  return head(cam, f, { suspect: f - 2 });
};

// The archive: the EVIDENCE drawer shoots out (gag).
const CabinetWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.7, 1.6], [-0.6, 1.4, 0.8], f / 37), target: [-0.7, 1.1, -2.3], fov: 52 };
  return archive(cam, f);
};

const DrawerBurst: React.FC = () => {
  const f = useShotFrame();
  const out = Easing.out(Easing.back(3))(ramp(f, 2, 8));
  const cam: CameraShot = { position: lerp3([-0.6, 1.6, 0.2], [-0.65, 1.55, -0.05], f / 37), target: [CAB_AT[0], 1.2, -2.2], fov: 50 };
  return archive(cam, f, { out, papers: ramp(f, 4, 30) });
};

// The SECRETS padlock with no key.
const PadlockShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 1.55, -0.6], [0.3, 1.55, -0.95], f / 38), target: [LOCK_AT[0], 1.6, -2.85], fov: 46 };
  return archive(cam, f, { out: 1, lockTag: f - 4 });
};

const KeyholeMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([LOCK_AT[0] + 0.05, 1.3, -1.1], [LOCK_AT[0] + 0.02, 1.28, -1.35], f / 33), target: [LOCK_AT[0], 1.15, -2.85], fov: 46 };
  return archive(cam, f, { out: 1, lockTag: 99, nokey: f - 6, shake: Math.sin(f * 1.7) * (f > 10 && f < 22 ? 1 : 0) });
};

// DAYS SINCE I FORGAVE: 0.
const CounterShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 1.9, 0.2], [1.45, 1.75, -0.7], f / 62), target: [COUNT_AT[0], 1.8, -2.85], fov: 46 };
  return archive(cam, f, { out: 1, lockTag: 99, days: f - 6 });
};

// Gag: it clicks to 1 and snaps straight back to 0.
const CounterTap: React.FC = () => {
  const f = useShotFrame();
  const flip = (f >= 10 && f < 16) || (f >= 22 && f < 28) ? 1 : 0;
  const cam: CameraShot = { position: lerp3([COUNT_AT[0] - 0.15, 1.8, -0.8], [COUNT_AT[0] - 0.1, 1.78, -1.05], f / 53), target: [COUNT_AT[0], 1.75, -2.85], fov: 46 };
  return archive(cam, f, { out: 1, lockTag: 99, days: 99, value: f >= 12 && f < 24 ? 1 : 0, flip: flip * 0.4 });
};

// Jen and Kim, best friends now, at the wine table.
const JEN_W: [number, number] = [-0.55, -1.3];
const KIM_W: [number, number] = [0.55, -1.3];
const BestFriends: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.5, 2.1], [0.2, 1.3, 1.6], f / 52), target: [0, 1.0, -2.0], fov: 54 };
  return wine(cam, f, [
    pup("jen", JEN_S, JEN_W, { expression: "excited", armR: [120 + Math.sin(f / 4) * 10, -40], armL: [30, -40], lookX: 1, bob: breathe(f) }),
    pup("kim", KIM, KIM_W, { expression: "excited", armL: [120 + Math.sin(f / 4) * 10, -40], armR: [30, -40], lookX: -1, bob: breathe(f + 4) }),
  ], { fill: [0.3, 0.6, 0.2] });
};

// Vera pins a new photo.
const VERA_BOARD: [number, number] = [0.6, -1.9];
const PinPhoto: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.0, 1.6, 1.3], [0.4, 1.45, 0.4], f / 51), target: [0.1, 1.35, -2.5], fov: 52 };
  return head(cam, f, { newPhoto: Easing.out(Easing.back(2))(ramp(f, 10, 20)) }, [pup("vera", VERA, VERA_BOARD, { view: "back", expression: "smug", armL: [140, 20], armR: [30, -20] })]);
};

// The new photo: YOUR NEW COWORKER.
const CoworkerMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.05, 1.35, -1.4], [-0.05, 1.35, -1.75], f / 39), target: [-0.05, 1.3, -2.9], fov: 44 };
  return head(cam, f, { newPhoto: 1 });
};

const VeraFinal: React.FC = () => {
  const f = useShotFrame();
  return head(close(VERA_BOARD[0], VERA_BOARD[1], f / 60, -0.25, 1.15, 1.0), f, { newPhoto: 1 }, [pup("vera", VERA, VERA_BOARD, { expression: "smug", blink: false, lookX: -0.6, headTilt: -5 })], { blur: 6 });
};

const SHOTS: Shot[] = [
  [0, 42, HookBar, false],
  [42, 84, StareClose, false],
  [84, 145, JenIntro, false],
  [145, 200, VeraIntro, false],
  [200, 257, VeraLow, false],
  [257, 300, PhonePass, true],
  [300, 341, PhoneClose, false],
  [341, 375, PhoneSearch, false],
  [375, 407, PhoneFound, false],
  [407, 445, JenStop, true],
  [445, 476, TomWave, false],
  [476, 510, VeraNod, false],
  [510, 551, NoteMacro, false],
  [551, 590, JenIgnore, false],
  [590, 660, DinnerShot, true],
  [660, 733, SweaterCouch, true],
  [733, 785, Doorbell, false],
  [785, 820, DoorOpen, true],
  [820, 856, SameSweater, false],
  [856, 911, KimTalk, false],
  [911, 940, TomBolt, false],
  [940, 970, CoatGag, false],
  [970, 1020, VeraPour, true],
  [1020, 1081, ThreeGlasses, false],
  [1081, 1130, HeadPush, true],
  [1130, 1170, BoardWide, true],
  [1170, 1204, StringMacro, false],
  [1204, 1268, SuspectShot, false],
  [1268, 1305, CabinetWide, true],
  [1305, 1342, DrawerBurst, false],
  [1342, 1380, PadlockShot, false],
  [1380, 1413, KeyholeMacro, false],
  [1413, 1475, CounterShot, false],
  [1475, 1528, CounterTap, false],
  [1528, 1580, BestFriends, true],
  [1580, 1631, PinPhoto, true],
  [1631, 1670, CoworkerMacro, false],
  [1670, TIMING.totalFrames, VeraFinal, false],
];

// ---------- sound ----------
// Soft one-shots on words, beds low, so speech stays well above the mix.

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.08, until: 257 },
  { at: 4, src: sfx("pop"), volume: 0.35 },
  { at: 50, src: sfx("tape-stop"), volume: 0.2 },
  { at: 96, src: sfx("pop"), volume: 0.3 },
  { at: 152, src: sfx("pop"), volume: 0.3 },
  { at: 261, src: sfx("chime"), volume: 0.2 },
  ...[345, 352, 359, 366].map((at) => ({ at, src: sfx("tick"), volume: 0.2 })),
  { at: 380, src: sfx("credit-blip"), volume: 0.25 },
  { at: 515, src: sfx("paper"), volume: 0.25 },
  { at: 594, src: sfx("chime"), volume: 0.2 },
  // The twist: the doorbell, the door, the closet.
  { at: 738, src: sfx("chime"), volume: 0.4 },
  { at: 745, src: sfx("chime"), volume: 0.35 },
  { at: 750, src: sfx("riser"), volume: 0.12 },
  { at: 787, src: sfx("door"), volume: 0.35 },
  { at: 789, src: sfx("sting"), volume: 0.3 },
  { at: 785, src: sfx("hum"), volume: 0.1, until: 970 },
  { at: 924, src: sfx("door"), volume: 0.3 },
  ...[944, 950, 956].map((at) => ({ at, src: sfx("paper"), volume: 0.25 })),
  { at: 960, src: sfx("boom"), volume: 0.3 },
  { at: 976, src: sfx("drawer"), volume: 0.2 },
  { at: 1032, src: sfx("chime"), volume: 0.2 },
  { at: 1084, src: sfx("whoosh"), volume: 0.3 },
  { at: 1130, src: sfx("hum"), volume: 0.1, until: 1528 },
  { at: 1134, src: sfx("pop"), volume: 0.3 },
  ...[1210, 1214, 1218, 1222, 1226, 1230].map((at) => ({ at, src: sfx("stamp"), volume: 0.15 })),
  { at: 1308, src: sfx("drawer"), volume: 0.4 },
  { at: 1310, src: sfx("paper"), volume: 0.3 },
  { at: 1346, src: sfx("pop"), volume: 0.3 },
  { at: 1392, src: sfx("near-miss"), volume: 0.15 },
  { at: 1420, src: sfx("pop"), volume: 0.3 },
  ...[1485, 1497].map((at) => ({ at, src: sfx("button"), volume: 0.4 })),
  { at: 1528, src: sfx("ambience"), volume: 0.08, until: 1580 },
  { at: 1534, src: sfx("chime"), volume: 0.2 },
  { at: 1580, src: sfx("hum"), volume: 0.1, until: TIMING.totalFrames },
  { at: 1592, src: sfx("stamp"), volume: 0.35 },
  { at: 1636, src: sfx("sting"), volume: 0.2 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 733, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 733, to: 1081, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 1081, to: 1528, volume: 0.13 },
  { src: MUSIC_FILES.lounge, from: 1528, to: 1580, volume: 0.12 },
  { src: MUSIC_FILES.mystery, from: 1580, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
