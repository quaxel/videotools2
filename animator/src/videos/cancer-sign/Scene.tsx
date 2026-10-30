import React from "react";
import { Easing } from "remotion";
import {
  Board,
  breathe,
  CameraShot,
  Chair,
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
import { Balloon, Cake, Closet, Couch, CrabShell, DateBox, DizzyStars, FeelingsCabinet, Hearts, RoundTable, SoupBowl, Stove, TearCounter, TearSpray, TissueBox, TissuePile, TvStand } from "./props";
import TIMING_JSON from "./timing.json";

// "A Cancer Remembers Everything" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "cancer-sign";
export const timing = TIMING;

// ---------- cast ----------

const ROSE: PuppetLook = { skin: "#f6dcc4", hair: "#a0442a", outfit: "#ff8fc8", long: true };
const AMY: PuppetLook = { skin: "#a86b45", hair: "#1d1a1a", outfit: "#ffd23f", long: true };
const MIA: PuppetLook = { skin: "#fbe9d6", hair: "#e8c15a", outfit: "#4f7dff", long: true };
const JADE: PuppetLook = { skin: "#8d5a3b", hair: "#3a2a20", outfit: "#3fae5a", long: true };

const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
const HUG = { armL: [80, -70] as [number, number], armR: [80, -70] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.08, ty = 0.92): CameraShot => ({
  position: lerp3([px + dx, y, pz + 1.85], [px + dx * 0.8, y - 0.03, pz + 1.55], p),
  target: [px, ty, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// Birthday table: pink, balloons, cake, the CANCER sign.
const TABLE_AT: Vec3 = [0, 0, -1.3];
const ROSE_SEAT: [number, number] = [0, -1.85];
const TOP = 0.61;
const BdaySet: React.FC<{ camera: CameraShot; f: number; cancer?: number; lit?: number }> = ({ camera, f, cancer, lit = 1 }) => (
  <Room camera={camera} mood="warm" floor="#7a2e4a" wall="#ff8fb8" stripe="#ffffff" width={9} depth={6} wallPattern="wallpaper" floorPattern="wood" sun={{ x: 1.8, color: "#ffe0ee", bars: 3 }}>
    {cancer !== undefined && <ZodiacBadge sign="cancer" position={[0, 2.45, -2.92]} size={0.75} bg="#13235e" fg="#ffffff" appear={cancer} />}
    {cancer !== undefined && <Label text="CANCER" position={[0, 1.85, -2.94]} width={1.1} fg="#ffffff" bg="#e0262f" appear={cancer - 4} />}
    <Label text="HAPPY BIRTHDAY" position={[0, 2.85, -2.94]} width={1.6} fg="#e0262f" bg="#fff6dc" />
    {[-1.6, -1.1, 1.1, 1.6].map((x, i) => (
      <Balloon key={x} position={[x, 2.1 + (i % 2) * 0.25, -2.6]} color={["#ffd23f", "#4f7dff", "#3fae5a", "#e0262f"][i]} f={f} phase={i * 1.7} />
    ))}
    <Window position={[2.6, 1.6, -2.94]} size={[1.0, 1.0]} sky="#ffd6e8" />
    <Lamp position={[1.3, 2.3, -1.6]} color="#ffe0ee" />
    <RoundTable position={TABLE_AT} cloth="#fff6dc" />
    <Chair position={[ROSE_SEAT[0], 0, ROSE_SEAT[1]]} color="#c2185b" />
    <Chair position={[0.75, 0, -1.2]} color="#c2185b" rotationY={-Math.PI / 2} />
    <Cake position={[0, TOP, -1.25]} lit={lit} />
    <Plant position={[-3.0, 0, -2.5]} />
  </Room>
);

// TV corner: blue, couch facing the camera, TV on the left wall side.
const TV_COUCH: Vec3 = [0.3, 0, -2.2];
const ROSE_COUCH: [number, number] = [0.3, -2.12];
const TvSet: React.FC<{ camera: CameraShot; f: number; show?: string; name?: number; traits?: number; soggy?: number }> = ({ camera, show = "WEDDING", name, traits, soggy }) => (
  <Room camera={camera} mood="cold" floor="#26324a" wall="#4a6fa5" stripe="#dff6ff" width={8} depth={6} wallPattern="panel" floorPattern="carpet">
    <Couch position={TV_COUCH} color="#13235e" width={1.9} />
    <TvStand position={[-1.9, 0, -2.5]} width={1.2} />
    <Screen position={[-1.9, 1.27, -2.42]} size={[1.1, 0.62]} text={show} glow="#ffd23f" bg="#0a1020" />
    <Lamp position={[1.6, 2.2, -2.2]} color="#cfe9ff" />
    <Window position={[2.4, 1.7, -2.94]} size={[1.0, 1.1]} sky="#1b2a5e" blinds />
    {name !== undefined && <Label text="ROSE" position={[-0.05, 2.15, -2.92]} width={0.8} fg="#ffffff" bg="#e0262f" appear={name} />}
    {traits !== undefined &&
      ["WARM", "PROTECTIVE", "SOGGY"].map((t, i) => (
        <Label key={t} text={t} position={[0.95, 2.3 - i * 0.3, -2.9]} width={0.52} fg="#13235e" bg="#ffd23f" appear={traits - i * 16} />
      ))}
    {soggy !== undefined && <TissuePile position={[1.0, 0, -1.7]} count={10} spread={0.35} />}
  </Room>
);

// Calendar wall: yellow, every birthday circled.
const CalSet: React.FC<{ camera: CameraShot; f: number; dog?: number }> = ({ camera, dog }) => (
  <Room camera={camera} mood="golden" floor="#8a5a1e" wall="#ffd23f" stripe="#e0262f" width={8} depth={6} wallPattern="plaster" floorPattern="wood" sun={{ x: -1.8, color: "#fff2c2", bars: 4 }}>
    <Board position={[0.2, 1.7, -2.92]} cards={["YOUR B-DAY", "MOM'S B-DAY", "DOG'S B-DAY", "HAMSTER '09"]} width={1.8} height={1.0} color="#ffffff" />
    <Label text="CALENDAR" position={[0.2, 2.45, -2.9]} width={1.1} fg="#ffffff" bg="#e0262f" />
    {dog !== undefined && <Label text="WOOF ♥" position={[0.85, 1.48, -2.88]} width={0.5} fg="#ffffff" bg="#7b2cbf" appear={dog} />}
    <Shelf position={[-2.4, 0, -2.6]} width={1.0} rows={3} color="#8a5a1e" seed={6} />
    <Plant position={[2.6, 0, -2.5]} />
  </Room>
);

// Rose's kitchen: warm orange, soup on the stove, the hallway closet bulging in the corner (the seed).
const STOVE_AT: Vec3 = [1.4, 0, -2.5];
const KCLOSET_AT: Vec3 = [-1.0, 0, -2.94];
const ROSE_STOVE: [number, number] = [0.6, -1.7];
const KitchenSet: React.FC<{ camera: CameraShot; f: number; safest?: number; bulge?: number; children?: React.ReactNode }> = ({ camera, f, safest, bulge = 0, children }) => (
  <Room camera={camera} mood="warm" floor="#8a4a1e" wall="#f4a261" stripe="#ffffff" width={9} depth={6} wallPattern="tile" floorPattern="tile" sun={{ x: 0.4, color: "#ffe6a8", bars: 5 }}>
    <Stove position={STOVE_AT} f={f} />
    <Counter position={[2.6, 0, -2.6]} size={[1.2, 0.9, 0.6]} color="#fff6dc" top="#e8590c" />
    <Closet position={KCLOSET_AT} bulge={bulge} />
    <DateBox position={[KCLOSET_AT[0] + 0.15, 0.12, KCLOSET_AT[2] + 0.25]} rotation={[0, 0.3, 0.2]} size={0.22} />
    <Window position={[0.5, 1.75, -2.94]} size={[1.0, 0.9]} sky="#ffe0c2" />
    <Lamp position={[0.4, 2.2, -1.6]} color="#ffd27a" />
    {safest !== undefined && <Label text={"SAFEST\nPLACE"} position={[0.5, 2.55, -2.9]} width={0.8} fg="#ffffff" bg="#c2185b" appear={safest} />}
    {children}
  </Room>
);

// Hallway: brown, the closet.
const CLOSET_AT: Vec3 = [0, 0, -2.94];
const AMY_HALL: [number, number] = [-0.15, -1.65];
const HallSet: React.FC<{ camera: CameraShot; f: number; open?: number; bulge?: number; children?: React.ReactNode }> = ({ camera, open = 0, bulge = 0, children }) => (
  <Room camera={camera} mood="golden" floor="#3a2418" wall="#7a4a2e" stripe="#ffd23f" width={8} depth={6} wallPattern="wallpaper" floorPattern="wood">
    <Closet position={CLOSET_AT} open={open} bulge={bulge} />
    <Lamp position={[0, 2.4, -1.8]} color="#ffd27a" />
    <Plant position={[1.9, 0, -2.5]} />
    <Shelf position={[-2.2, 0, -2.6]} width={0.8} rows={3} color="#3a2418" seed={2} />
    {children}
  </Room>
);

// Inside her head: a coral crab shell with one tiny door.
const SHELL_AT: Vec3 = [0, 0, -2.0];
const ShellSet: React.FC<{ camera: CameraShot; f: number; door?: number; sign?: number; inside?: number }> = ({ camera, f, door = 0, sign, inside }) => (
  <Room camera={camera} mood="dream" floor="#c84b3c" wall="#ff8a70" stripe="#ffffff" width={9} depth={6} wallPattern="wallpaper" floorPattern="tile">
    {inside !== undefined && <Label text="INSIDE ROSE" position={[0, 2.75, -2.92]} width={1.4} fg="#ffffff" bg="#13235e" appear={inside} />}
    <ZodiacBadge sign="cancer" position={[-2.6, 2.6, -2.92]} size={0.5} bg="#13235e" fg="#ffffff" />
    <CrabShell position={SHELL_AT} door={door} f={f} />
    {sign !== undefined && <Label text={"SAFE PEOPLE\nONLY"} position={[0, 0.72, SHELL_AT[2] + 1.05]} width={0.55} fg="#ffffff" bg="#e0262f" appear={sign} />}
  </Room>
);

// The FEELINGS room: navy, the cabinet, the tissue box with a counter.
const CAB_AT: Vec3 = [-0.5, 0, -2.5];
const TBOX_AT: Vec3 = [1.4, 0, -2.3];
const ROSE_CAB: [number, number] = [-0.5, -1.25];
const CabSet: React.FC<{
  camera: CameraShot;
  f: number;
  out?: number[];
  feelings?: number;
  value?: number;
  flip?: number;
  noon?: number;
  you?: number;
  pull?: number;
}> = ({ camera, out = [0.8, 0.6, 0.9, 0.7, 1, 0.5, 0.8, 0.9], feelings, value = 41, flip = 0, noon, you, pull = 0.5 }) => (
  <Room camera={camera} mood="night" floor="#1b2a5e" wall="#24345e" stripe="#ffd23f" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
    <FeelingsCabinet position={CAB_AT} out={out} />
    {feelings !== undefined && <Label text="FEELINGS" position={[CAB_AT[0], 2.45, -2.9]} width={1.2} fg="#13235e" bg="#ffd23f" appear={feelings} />}
    {you !== undefined && <Label text="YOU" position={[CAB_AT[0] + 0.35, 1.4, CAB_AT[2] + 0.66]} width={0.3} fg="#ffffff" bg="#e0262f" appear={you} />}
    <InkBox size={[0.6, 0.9, 0.5]} position={[TBOX_AT[0], 0.45, TBOX_AT[2]]} color="#3a3a44" />
    <TissueBox position={[TBOX_AT[0], 0.9, TBOX_AT[2]]} scale={2} out={pull} />
    <TearCounter position={[TBOX_AT[0], 1.75, TBOX_AT[2] - 0.15]} value={value} flip={flip} />
    {noon !== undefined && <Label text="12:00 NOON" position={[TBOX_AT[0], 2.3, -2.9]} width={0.85} fg="#13235e" bg="#ffffff" appear={noon} />}
    <ZodiacBadge sign="cancer" position={[2.6, 2.6, -2.92]} size={0.45} bg="#ffd23f" fg="#13235e" />
  </Room>
);

// The soup ending: green.
const SOUP_TABLE: Vec3 = [0, 0, -1.6];
const SoupSet: React.FC<{ camera: CameraShot; f: number; tear?: number; children?: React.ReactNode }> = ({ camera, tear = -1, children }) => (
  <Room camera={camera} mood="daylight" floor="#2d5a3a" wall="#5fb37a" stripe="#fff6dc" width={8} depth={6} wallPattern="tile" floorPattern="wood" sun={{ x: -1.6, color: "#f2ffe6", bars: 4 }}>
    <RoundTable position={SOUP_TABLE} cloth="#fff6dc" />
    <SoupBowl position={[0, TOP, SOUP_TABLE[2] + 0.12]} tear={tear} />
    <Chair position={[0, 0, -2.15]} color="#1f7a4d" />
    <Window position={[1.8, 1.6, -2.94]} size={[1.1, 1.0]} sky="#dff6ff" />
    <Lamp position={[0, 2.2, -1.6]} color="#f2ffe6" />
    <Plant position={[-2.4, 0, -2.5]} scale={1.2} />
    {children}
  </Room>
);

// ---------- stage wrappers ----------

const bday = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BdaySet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<BdaySet camera={camera} f={f} {...extra} />} />
);
const tv = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof TvSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} {...grade} set={<TvSet camera={camera} f={f} {...extra} />} />
);
const cal = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof CalSet>> = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<CalSet camera={camera} f={f} {...extra} />} />
);
const kitchen = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof KitchenSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<KitchenSet camera={camera} f={f} {...extra} />} />
);
const hall = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof HallSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} {...grade} set={<HallSet camera={camera} f={f} {...extra} />} />
);
const shell = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof ShellSet>> = {}, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} {...grade} set={<ShellSet camera={camera} f={f} {...extra} />} />
);
const cab = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof CabSet>> = {}, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} set={<CabSet camera={camera} f={f} {...extra} />} />
);
const soup = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof SoupSet>> = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<SoupSet camera={camera} f={f} {...extra} />} />
);

const roseSeat = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup("rose", ROSE, ROSE_SEAT, { sit: true, expression: "excited", bob: breathe(f) * 0.4, ...pose });

// ---------- shots ----------

// Hook: Rose alone at her birthday table under the CANCER sign, smiling far too hard.
const HookTable: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.35, 1.5], [0.15, 1.35, 1.15], f / 50), target: [0, 1.45, -2.0], fov: 52 };
  return bday(cam, f, [roseSeat(f, { expression: "excited", headTilt: Math.sin(f / 9) * 3, armL: [20, -60], armR: [20, -60] })], { cancer: f - 2 });
};

const SmileClose: React.FC = () => {
  const f = useShotFrame();
  return bday(close(ROSE_SEAT[0], ROSE_SEAT[1], f / 45, 0.2), f, [roseSeat(f, { expression: "excited", blink: false, headTilt: 4 + (f % 14 < 2 ? 3 : 0) })], {}, { blur: 6 });
};

// "It's totally fine!" — arms up, one eye twitching.
const FineArms: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.15, 0.6], [-0.35, 1.12, 0.35], f / 36), target: [0, 0.95, -1.85], fov: 46 };
  return bday(cam, f, [roseSeat(f, { expression: "excited", ...ARMS_UP, mouthOpen: 0.8, headTilt: Math.sin(f / 2) * 4 })]);
};

// Top-down macro: one candle flame dies.
const CakeMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.03, 1.5, -1.05], [0.02, 1.25, -1.1], f / 32), target: [0, TOP + 0.15, -1.25], fov: 44 };
  return bday(cam, f, [], { lit: 1 - ramp(f, 10, 24) });
};

// A single tear runs down the smile.
const SmileTear: React.FC = () => {
  const f = useShotFrame();
  const cam = close(ROSE_SEAT[0], ROSE_SEAT[1], f / 36, -0.25);
  return bday(cam, f, [roseSeat(f, { expression: "skeptical", blink: false, lookX: 0.3 })], { lit: 0 }, { blur: 6 });
};

// TV corner: Rose on the couch, name and traits.
const RoseIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.55, 1.25, 0.7], [0.5, 1.22, 0.4], (f + 6) / 60), target: [0.45, 1.3, -2.2], fov: 50 };
  return tv(cam, f, [pup("rose", ROSE, ROSE_COUCH, { sit: true, expression: "excited", headTilt: Math.sin(f / 12) * 4, bob: breathe(f) * 0.4, armL: [20, -60], armR: [20, -60] })], { name: f - 4, traits: f - 26, show: "CAT VIDEO" });
};

// Low angle: the tissue pile at her feet.
const SoggyLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.4, 0.4, -0.3], [1.3, 0.42, -0.6], f / 50), target: [0.5, 0.75, -2.0], fov: 52 };
  return tv(cam, f, [pup("rose", ROSE, ROSE_COUCH, { sit: true, expression: "shocked", lookX: -1, bob: breathe(f) * 0.4, hold: { item: "cup", hand: "R" } })], { soggy: 1, show: "CAT VIDEO" });
};

// Over Rose's shoulder: the TV, wedding then cat video.
const TvOts: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.1, 1.5, 0.6], [1.0, 1.45, 0.35], f / 50), target: [-1.9, 1.15, -2.45], fov: 40 };
  return tv(cam, f, [pup("rose", ROSE, ROSE_COUCH, { sit: true, view: "back", expression: "excited" })], { show: f < 28 ? "WEDDING ♥" : "CAT VIDEO", soggy: 1 });
};

// The car insurance ad: Rose sobbing, tears spraying.
const AdSob: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.15, 0.0], [-0.25, 1.1, -0.3], f / 55), target: [0.3, 0.95, -2.1], fov: 46 };
  return tv(cam, f, [pup("rose", ROSE, ROSE_COUCH, { sit: true, expression: "shocked", lookX: -0.8, headTilt: Math.sin(f / 3) * 5, bob: breathe(f * 3) * 0.6 })], {
    show: "CAR INSURANCE",
    soggy: 1,
  });
};

const AdScreen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.5, 1.3, -0.9], [-1.65, 1.28, -1.3], f / 40), target: [-1.9, 1.25, -2.45], fov: 44 };
  return tv(cam, f, [], { show: "CAR INSURANCE", soggy: 1 });
};

// Calendar wall: every birthday circled.
const CalWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.3, 1.4], [-0.3, 1.32, 1.0], (f + 6) / 50), target: [0.0, 1.5, -2.5], fov: 54 };
  return cal(cam, f, [pup("rose", ROSE, [-0.5, -1.45], { expression: "smug", armR: [115, -10], armL: [20, -40], lookX: 0.9, bob: breathe(f), hold: { item: "key", hand: "L" } })]);
};

const CalMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.55, 1.85, -1.3], [0.6, 1.83, -1.6], f / 45), target: [0.75, 1.75, -2.9], fov: 44 };
  return cal(cam, f, [], { dog: f - 6 });
};

// Her home, the safest place in town: kitchen wide with the closet bulging in the corner (seed).
const HomeWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.5, 2.4], [-0.1, 1.45, 2.0], f / 55), target: [-0.2, 1.15, -2.0], fov: 54 };
  return kitchen(cam, f, [pup("rose", ROSE, ROSE_STOVE, { expression: "excited", armR: [70, -60], lookX: 0.7, bob: breathe(f) })], { safest: f - 6, bulge: Math.abs(Math.sin(f / 5)) });
};

// Sad Mia gets soup.
const MIA_AT: [number, number] = [-0.35, -1.55];
const SoupHandoff: React.FC = () => {
  const f = useShotFrame();
  const give = ramp(f, 4, 20);
  const cam: CameraShot = { position: lerp3([0.15, 1.25, 1.6], [0.1, 1.22, 1.3], f / 40), target: [0.12, 0.95, -1.7], fov: 46 };
  return kitchen(cam, f, [
    pup("rose", ROSE, ROSE_STOVE, { expression: "excited", armR: [40 + give * 50, -60], lookX: -0.8, bob: breathe(f) }),
    pup("mia", MIA, MIA_AT, { expression: give > 0.8 ? "excited" : "skeptical", lookX: 0.8, hold: { item: "cup", hand: "L" }, headTilt: -8 + give * 8 }),
  ], { bulge: Math.abs(Math.sin(f / 5)) });
};

// Rose hugs Jade at the door.
const JADE_AT: [number, number] = [0.05, -1.7];
const HugShot: React.FC = () => {
  const f = useShotFrame();
  const squeeze = Math.sin(f / 4) * 0.5 + 0.5;
  const cam: CameraShot = { position: lerp3([0.6, 1.25, 0.6], [0.5, 1.22, 0.3], f / 40), target: [0.3, 0.95, -1.7], fov: 44 };
  return kitchen(cam, f, [
    pup("jade", JADE, JADE_AT, { expression: "excited", ...HUG, lookX: 1, headTilt: 8 }),
    pup("rose", ROSE, [0.55, -1.7], { expression: "excited", ...HUG, lookX: -1, headTilt: -8 - squeeze * 4, bob: -squeeze * 4 }),
  ]);
};

// Amy gushes.
const AMY_K: [number, number] = [-0.4, -1.6];
const AmyGush: React.FC = () => {
  const f = useShotFrame();
  return kitchen(close(AMY_K[0], AMY_K[1], f / 40, 0.25, 1.15, 1.0), f, [pup("amy", AMY, AMY_K, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 5) * 6, bob: breathe(f) })], {}, { blur: 6 });
};

// Rose glows: hearts float up.
const RoseHearts: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.3, 1.6], [0.12, 1.27, 1.3], f / 40), target: [0.1, 1.05, -1.7], fov: 46 };
  return kitchen(cam, f, [
    pup("rose", ROSE, ROSE_STOVE, { expression: "smug", headTilt: 8 + Math.sin(f / 7) * 4, armL: [20, -60], armR: [20, -60], bob: breathe(f) }),
    pup("amy", AMY, AMY_K, { expression: "excited", lookX: 1, ...HUG }),
  ], { children: <Hearts position={[ROSE_STOVE[0] - 0.3, 1.4, ROSE_STOVE[1] + 0.2]} f={f} /> });
};

const LovedClose: React.FC = () => {
  const f = useShotFrame();
  return kitchen(close(ROSE_STOVE[0], ROSE_STOVE[1], f / 40, -0.2, 1.15, 1.0), f, [pup("rose", ROSE, ROSE_STOVE, { expression: "smug", headTilt: 8, blink: f > 18 && f < 23, bob: breathe(f) })], {}, { blur: 6 });
};

// The twist: Amy walks to the bulging closet.
const AmyToCloset: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 24, [-1.4, -0.9], AMY_HALL);
  const cam: CameraShot = { position: lerp3([0.9, 1.3, 1.2], [0.8, 1.28, 0.9], f / 45), target: [0, 1.1, -2.3], fov: 50 };
  return hall(cam, f, [pup("amy", AMY, w.at, { expression: "excited", ...w.pose, ...(f > 24 ? { armR: [80, -10] as [number, number], view: "back" as const } : {}) })], { bulge: Math.abs(Math.sin(f / 3)) });
};

// Macro: the handle turns, the doors crack.
const HandleMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 1.1, -1.7], [0.3, 1.08, -2.0], f / 40), target: [0, 1.0, -2.9], fov: 46 };
  return hall(cam, f, [], { open: ramp(f, 18, 34) * 0.15, bulge: 1 });
};

// Gag: the avalanche. Boxes pour out over Amy.
const BOXES = Array.from({ length: 22 }, (_, i) => ({
  delay: (i % 7) * 1.4 + Math.floor(i / 7) * 2,
  x: ((i * 37) % 11) / 11 - 0.5,
  y: 0.18 + Math.floor(i / 6) * 0.15,
  z: -1.65 + ((i * 13) % 5) * 0.12,
  r: i * 0.7,
  color: ["#c98b4e", "#d9a066", "#b5763a"][i % 3],
  date: ["2009", "MAY 3", "2014", "9TH GR.", "JUNE 12", "2011"][i % 6],
}));
const BoxPile: React.FC<{ f: number; t0: number; fall?: boolean }> = ({ f, t0, fall = true }) => (
  <group userData={{ ghost: true }}>
    {BOXES.map((b, i) => {
      const p = fall ? Easing.out(Easing.bounce)(ramp(f, t0 + b.delay, t0 + b.delay + 9)) : 1;
      const start: Vec3 = [b.x * 0.8, 1.6 + (i % 4) * 0.12, -2.75];
      const end: Vec3 = [b.x * 1.5 + AMY_HALL[0], b.y, b.z + 0.1];
      return <DateBox key={i} position={lerp3(start, end, p)} rotation={[b.r * 0.2 * p, b.r, b.r * 0.15 * p]} date={b.date} color={b.color} size={0.34} />;
    })}
  </group>
);
const Avalanche: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.5, 1.4], [0.2, 1.45, 1.15], f / 36), target: [0, 0.9, -2.0], fov: 52 };
  const sink = ramp(f, 4, 24);
  return hall(cam, f, [pup("amy", AMY, AMY_HALL, { expression: "shocked", ...ARMS_UP, bob: sink * 160 })], { open: Easing.out(Easing.back(2))(ramp(f, 0, 5)), children: <BoxPile f={f} t0={0} /> });
};

// High angle: only Amy's head sticks out of the box pile.
const Buried: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 2.0, 0.9], [0.0, 1.95, 0.6], f / 40), target: [AMY_HALL[0], 0.6, AMY_HALL[1]], fov: 50 };
  return hall(cam, f, [pup("amy", AMY, AMY_HALL, { expression: "shocked", bob: 160, blink: false, lookX: Math.sin(f / 6) })], { open: 1, children: <BoxPile f={f} t0={0} fall={false} /> });
};

// Macro: every box has a date.
const DateMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 1.1, 0.3], [0.6, 1.05, 0.0], f / 32), target: [-0.1, 0.5, -1.35], fov: 40 };
  return hall(cam, f, [], { open: 1, children: <BoxPile f={f} t0={0} fall={false} /> });
};

// Amy holds up her ninth-grade note.
const AmyNote: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.25, 0.6], [0.25, 1.22, 0.35], f / 50), target: [AMY_HALL[0] + 0.1, 0.85, AMY_HALL[1]], fov: 40 };
  return hall(cam, f, [pup("amy", AMY, AMY_HALL, { expression: "skeptical", bob: 160, armR: [140, -30], lookX: 0.5 })], {
    open: 1,
    children: (
      <>
        <BoxPile f={f} t0={0} fall={false} />
        <Label text={"NOTE FROM AMY\n9TH GRADE"} position={[AMY_HALL[0] + 0.32, 1.12, AMY_HALL[1] + 0.25]} rotation={[0, 0, 0.08]} width={0.42} fg="#13235e" bg="#ffffff" appear={f - 8} />
      </>
    ),
  });
};

// Rose sprints in from the left.
const RoseRun: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 22, [-2.8, -0.6], [-1.3, -0.9]);
  const cam: CameraShot = { position: [w.at[0] + 0.25, 1.1, 1.3], target: [w.at[0] + 0.15, 1.0, -1.6], fov: 52 };
  return hall(cam, f, [pup("rose", ROSE, w.at, { expression: "shocked", ...w.pose, ...ARMS_UP, bob: (w.pose.bob ?? 0) - Math.abs(Math.sin(f / 3)) * 6 })], {
    open: 1,
    children: (
      <>
        <BoxPile f={f} t0={0} fall={false} />
        <TissuePile position={[-0.15, 0, -0.55]} count={12} spread={0.4} />
      </>
    ),
  });
};

// Gag: she slips on her tissues and lands flat, tissues flying (high angle, camera kept centred for the billboard).
const ROSE_FLOOR: Vec3 = [0.2, 0.2, -0.5];
const RoseSlip: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 0, 8));
  const slide = Easing.out(Easing.cubic)(ramp(f, 4, 20));
  const cam: CameraShot = { position: lerp3([-0.6, 2.3, 1.7], [-0.58, 2.2, 1.45], f / 40), target: [-0.65, 0.25, -0.8], fov: 54 };
  return hall(cam, f, [], {
    open: 1,
    children: (
      <>
        <BoxPile f={f} t0={0} fall={false} />
        <TissuePile position={[-0.15, 0, -0.55]} count={12} spread={0.4} scatter={ramp(f, 4, 14)} />
        <group position={[ROSE_FLOOR[0] - slide * 0.3, ROSE_FLOOR[1], ROSE_FLOOR[2]]} rotation={[0, 0, (fall * Math.PI) / 2]} scale={squash(f, 8, 0.2)}>
          <PuppetBillboard id="rose" look={ROSE} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false }} />
        </group>
        {f > 10 && <DizzyStars position={[ROSE_FLOOR[0] - slide * 0.3 - 0.98, 0.3, ROSE_FLOOR[2] + 0.1]} f={f} />}
      </>
    ),
  });
};

// Push into Rose's face, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 40));
  const cam: CameraShot = { position: lerp3([0.05, 1.08, 0.2], [0.02, 1.02, -1.3], p), target: [ROSE_SEAT[0], 0.95, ROSE_SEAT[1]], fov: 38 };
  return bday(cam, f, [roseSeat(f, { expression: "skeptical", blink: false })], { lit: 0 }, { flash: ramp(f, 34, 48) });
};

// The crab shell inside her head.
const ShellWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 2.0, 4.2], [0.3, 1.9, 3.7], (f + 6) / 55), target: [0, 1.0, -2.0], fov: 54 };
  return shell(cam, f, { inside: f - 4 }, [], { flash: 1 - ramp(f, 0, 10) });
};

// Low macro: the tiny door and its sign; it creaks open a crack and slams.
const ShellDoor: React.FC = () => {
  const f = useShotFrame();
  const door = f < 30 ? ramp(f, 8, 20) * 0.5 : 0.5 - ramp(f, 30, 33) * 0.5;
  const cam: CameraShot = { position: lerp3([0.25, 0.45, 0.4], [0.2, 0.45, 0.1], f / 45), target: [0, 0.45, SHELL_AT[2] + 1.0], fov: 46 };
  return shell(cam, f, { door, sign: f - 2 });
};

// The FEELINGS cabinet.
const CabWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.5, 2.0], [0.5, 1.45, 1.6], f / 55), target: [0.2, 1.2, -2.2], fov: 52 };
  return cab(cam, f, { feelings: f - 6 });
};

// Rose shoves the drawers in; they spring back out.
const DrawerPush: React.FC = () => {
  const f = useShotFrame();
  const shove = [4, 16].some((h) => f >= h && f < h + 6) ? 1 : 0;
  const base = [0.8, 0.6, 0.9, 0.7, 1, 0.5, 0.8, 0.9];
  const cam: CameraShot = { position: lerp3([0.3, 1.45, 1.3], [0.25, 1.42, 1.0], f / 36), target: [-0.5, 1.2, -2.0], fov: 48 };
  return cab(cam, f, { feelings: 99, out: base.map((o) => (shove ? 0.05 : o)) }, [pup("rose", ROSE, ROSE_CAB, { view: "back", expression: "shocked", armL: shove ? [90, 0] : [60, -30], armR: shove ? [90, 0] : [60, -30] })]);
};

const DrawerMacro: React.FC = () => {
  const f = useShotFrame();
  const pop = Easing.out(Easing.back(3))(ramp(f, 4, 10));
  const cam: CameraShot = { position: lerp3([0.25, 1.45, -0.2], [0.2, 1.42, -0.5], f / 36), target: [CAB_AT[0], 1.0, CAB_AT[2]], fov: 44 };
  return cab(cam, f, { feelings: 99, out: [0.8, 0.6, 0.9, 0.7, pop, 0.5, 0.8, 0.9] });
};

// The tissue box with a counter.
const TissueShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 1.55, 0.2], [0.85, 1.55, -0.2], f / 55), target: [TBOX_AT[0], 1.35, TBOX_AT[2]], fov: 46 };
  return cab(cam, f, { feelings: 99, value: 40, pull: 0.5 + Math.sin(f / 4) * 0.3 });
};

// Macro: it ticks to 41; it's only noon.
const CounterMacro: React.FC = () => {
  const f = useShotFrame();
  const flip = f >= 8 && f < 14 ? 1 : 0;
  const cam: CameraShot = { position: lerp3([TBOX_AT[0] - 0.15, 1.62, -1.0], [TBOX_AT[0] - 0.1, 1.6, -1.3], f / 35), target: [TBOX_AT[0], 1.58, TBOX_AT[2]], fov: 42 };
  return cab(cam, f, { feelings: 99, value: f >= 10 ? 41 : 40, flip: flip * 0.4 });
};

const NoonShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([TBOX_AT[0] - 0.4, 1.95, -0.6], [TBOX_AT[0] - 0.35, 1.93, -0.9], f / 40), target: [TBOX_AT[0], 1.85, -2.6], fov: 48 };
  return cab(cam, f, { feelings: 99, noon: f - 4, pull: 1 });
};

// Your drawer opens.
const YourDrawer: React.FC = () => {
  const f = useShotFrame();
  const o = Easing.out(Easing.back(2))(ramp(f, 10, 18));
  const cam: CameraShot = { position: lerp3([0.15, 1.5, -0.1], [0.08, 1.47, -0.45], f / 40), target: [CAB_AT[0] + 0.35, 1.3, CAB_AT[2]], fov: 44 };
  return cab(cam, f, { feelings: 99, out: [0.1, 0.1, 0.1, 0.1, 0.1, o, 0.1, 0.1], you: f - 20 });
};

const DrawerWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.3, 1.0], [-0.1, 1.28, 0.7], f / 40), target: [-0.3, 1.1, -2.2], fov: 50 };
  return cab(cam, f, { feelings: 99, out: [0.1, 0.1, 0.1, 0.1, 0.1, 1, 0.1, 0.1], you: 99 }, [pup("rose", ROSE, [0.55, -1.3], { expression: "smug", lookX: -0.9, ...{ armL: [20, -60] as [number, number], armR: [20, -60] as [number, number] }, bob: breathe(f) })]);
};

// Ending: Rose serves soup, smiling; a tear drops in.
const SOUP_ROSE: [number, number] = [0.6, -1.95];
const ServeSoup: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 1.1], [0.05, 1.28, 0.8], f / 45), target: [0.25, 0.95, -1.8], fov: 46 };
  return soup(cam, f, [pup("rose", ROSE, SOUP_ROSE, { expression: "excited", armL: [60, -40], lookX: -0.7, headTilt: 6, bob: breathe(f) })]);
};

const SoupTear: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 1.3, -0.9], [0.03, 1.1, -1.05], ramp(f, 0, 60)), target: [0, TOP + 0.05, SOUP_TABLE[2] + 0.12], fov: 44 };
  const tear = f < 14 ? -1 : f < 26 ? (f - 14) / 12 : 1 + Math.min(1, (f - 26) / 12);
  return soup(cam, f, [], { tear, children: <Label text="+ TEARS" position={[0.32, TOP + 0.25, SOUP_TABLE[2] + 0.15]} width={0.3} fg="#ffffff" bg="#4f7dff" appear={f - 30} /> });
};

const SobSmile: React.FC = () => {
  const f = useShotFrame();
  return soup(close(SOUP_ROSE[0], SOUP_ROSE[1], f / 40, -0.25, 1.15, 1.0), f, [pup("rose", ROSE, SOUP_ROSE, { expression: "excited", blink: false, headTilt: Math.sin(f / 6) * 4, bob: breathe(f) })], {
    children: <TearSpray position={[SOUP_ROSE[0], 1.02, SOUP_ROSE[1] + 0.2]} f={f} amount={0.8} />,
  });
};

const SHOTS: Shot[] = [
  [0, 44, HookTable, false],
  [44, 88, SmileClose, false],
  [88, 124, FineArms, false],
  [124, 156, CakeMacro, false],
  [156, 192, SmileTear, false],
  [192, 250, RoseIntro, true],
  [250, 301, SoggyLow, false],
  [301, 352, TvOts, false],
  [352, 382, AdScreen, false],
  [382, 411, AdSob, false],
  [411, 455, CalWide, true],
  [455, 499, CalMacro, false],
  [499, 555, HomeWide, true],
  [555, 595, SoupHandoff, false],
  [595, 631, HugShot, false],
  [631, 670, AmyGush, false],
  [670, 709, RoseHearts, false],
  [709, 771, LovedClose, false],
  [771, 805, AmyToCloset, true],
  [805, 839, HandleMacro, false],
  [839, 878, Avalanche, false],
  [878, 913, Buried, false],
  [913, 952, DateMacro, false],
  [952, 1013, AmyNote, false],
  [1013, 1040, RoseRun, false],
  [1040, 1086, RoseSlip, false],
  [1086, 1138, HeadPush, true],
  [1138, 1190, ShellWide, true],
  [1190, 1239, ShellDoor, false],
  [1239, 1307, CabWide, true],
  [1307, 1340, DrawerPush, false],
  [1340, 1375, DrawerMacro, false],
  [1375, 1445, TissueShot, false],
  [1445, 1480, CounterMacro, false],
  [1480, 1516, NoonShot, false],
  [1516, 1552, YourDrawer, false],
  [1552, 1587, DrawerWide, false],
  [1587, 1622, ServeSoup, true],
  [1622, 1662, SoupTear, false],
  [1662, TIMING.totalFrames, SobSmile, false],
];

// ---------- sound ----------
// One-shots sit on words, not in the gaps between them, and stay soft so the bed stays under speech.

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.08, until: 192 },
  { at: 4, src: sfx("pop"), volume: 0.35 },
  { at: 92, src: sfx("pop"), volume: 0.3 },
  { at: 136, src: sfx("tape-stop"), volume: 0.2 },
  { at: 196, src: sfx("pop"), volume: 0.3 },
  ...[220, 236, 252].map((at) => ({ at, src: sfx("pop"), volume: 0.25 })),
  { at: 303, src: sfx("chime"), volume: 0.2 },
  { at: 384, src: sfx("near-miss"), volume: 0.15 },
  { at: 415, src: sfx("pop"), volume: 0.3 },
  { at: 461, src: sfx("paper"), volume: 0.25 },
  { at: 499, src: sfx("ambience"), volume: 0.1, until: 771 },
  { at: 505, src: sfx("pop"), volume: 0.3 },
  { at: 560, src: sfx("chime"), volume: 0.2 },
  { at: 712, src: sfx("chime"), volume: 0.2 },
  // The twist: footsteps, the handle, the avalanche.
  ...[774, 782, 790].map((at) => ({ at, src: sfx("tick"), volume: 0.25 })),
  { at: 790, src: sfx("riser"), volume: 0.15 },
  { at: 823, src: sfx("door"), volume: 0.4 },
  { at: 840, src: sfx("boom"), volume: 0.45 },
  { at: 841, src: sfx("sting"), volume: 0.3 },
  ...[846, 853, 860].map((at) => ({ at, src: sfx("drawer"), volume: 0.3 })),
  { at: 960, src: sfx("paper"), volume: 0.25 },
  { at: 1048, src: sfx("boom"), volume: 0.4 },
  { at: 1052, src: sfx("chime"), volume: 0.2 },
  { at: 1090, src: sfx("whoosh"), volume: 0.3 },
  { at: 1138, src: sfx("hum"), volume: 0.1, until: 1587 },
  { at: 1142, src: sfx("pop"), volume: 0.3 },
  { at: 1222, src: sfx("door"), volume: 0.3 },
  { at: 1245, src: sfx("pop"), volume: 0.3 },
  ...[1311, 1323].map((at) => ({ at, src: sfx("drawer"), volume: 0.35 })),
  { at: 1344, src: sfx("drawer"), volume: 0.35 },
  { at: 1455, src: sfx("button"), volume: 0.4 },
  { at: 1484, src: sfx("pop"), volume: 0.3 },
  { at: 1526, src: sfx("drawer"), volume: 0.4 },
  { at: 1536, src: sfx("stamp"), volume: 0.35 },
  { at: 1587, src: sfx("ambience"), volume: 0.08, until: TIMING.totalFrames },
  { at: 1648, src: sfx("credit-blip"), volume: 0.25 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 771, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 771, to: 1086, volume: 0.14 },
  { src: MUSIC_FILES.mystery, from: 1086, to: 1587, volume: 0.14 },
  { src: MUSIC_FILES.lounge, from: 1587, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
