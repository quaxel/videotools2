import React from "react";
import { Easing, interpolate } from "remotion";
import {
  breathe,
  CameraShot,
  Desk,
  faceChange,
  InkBox,
  jump,
  Label,
  lerp3,
  lieDown,
  moodBackground,
  moveChange,
  MUSIC_FILES,
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
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
} from "../../engine";
import {
  Block,
  BUTTER,
  Bucket,
  Bulb,
  CellBars,
  COUNTER_Z,
  DyeBottle,
  DyeVat,
  GeneralStore,
  JUSTICE_X,
  JUSTICE_Z,
  lampLight,
  LawBook,
  Lectern,
  OldCourt,
  Padlock,
  PINK,
  Scale,
  Splash,
  Stamp,
  Stink,
  STORE_DOOR_X,
  Ticket,
  Toast,
  Tub,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The Law That Made Margarine Pink" — Collins v. New Hampshire (1898). Cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "pink-margarine";
export const timing = TIMING;

// ---------- cast ----------

const SELLER: PuppetLook = { skin: "#f6dcc4", hair: "#3a2414", outfit: "#7a4a2a", pattern: "#efe2c6" };
const BUYER: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#3f7a4a", cap: "#5a4a3a" };
const LAWMAN: PuppetLook = { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#1d2f5a", cap: "#1d2f5a", lanyard: "#e8b04a" };
const CUSTOMER: PuppetLook = { skin: "#fff3e6", hair: "#a0452a", outfit: "#4f7dff", long: true };
const CHIEF: PuppetLook = { skin: "#f6dcc4", hair: "#f2f2f2", outfit: "#161616", glasses: true };
const JUSTICE2: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#161616" };
const JUSTICE3: PuppetLook = { skin: "#fff3e6", hair: "#d8d8d8", outfit: "#161616", glasses: true };
const NEW_SELLER: PuppetLook = { skin: "#fbe9d6", hair: "#2b1d14", outfit: "#b02a2a", pattern: "#f2d27a" };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.02): CameraShot => ({
  position: lerp3([px + dx, y, pz + 1.85], [px + dx * 0.8, y - 0.02, pz + 1.6], p),
  target: [px, 0.9, pz],
  fov: 36,
});
const medium = (px: number, pz: number, p: number, dx = -0.5): CameraShot => ({
  position: lerp3([px + dx, 1.2, pz + 3.4], [px + dx * 0.85, 1.18, pz + 3.05], p),
  target: [px, 0.82, pz],
  fov: 38,
});
const ease = Easing.inOut(Easing.quad);

// ---------- positions ----------

const SELLER_AT: [number, number] = [-0.45, -1.25];
const BUYER_AT: [number, number] = [0.55, 0.0];
const COUNTER_TOP = 0.67;
const BOOK_AT: Vec3 = [-0.75, COUNTER_TOP, COUNTER_Z + 0.02];
const LAWMAN_IN: [number, number] = [1.6, -0.35];

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number; flash?: number; energy?: number };

const store = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: React.ReactNode = null, opts: { mood?: "warm" | "cold"; door?: number } & Grade = {}) => {
  const { mood = "warm", door, ...grade } = opts;
  return (
    <Stage bg={moodBackground(mood)} camera={camera} puppets={puppets} light={lampLight(mood)} {...grade} set={<GeneralStore camera={camera} f={f} mood={mood} door={door}>{extra}</GeneralStore>} />
  );
};

const DairySet: React.FC<{ camera: CameraShot; f: number; drip?: number }> = ({ camera, f, drip = -1 }) => (
  <Room camera={camera} mood="golden" floor="#c9a26b" wall="#f2c230" stripe="#ffffff" width={7} depth={5} wallPattern="tile" floorPattern="tile" sun={{ x: 1.4, color: "#fff6d8", bars: 4 }}>
    <Desk position={[0, 0, -0.75]} size={[1.5, 0.62, 0.6]} color="#e8d2a8" />
    <Block position={[-0.3, 0.65, -0.72]} color={BUTTER} />
    <Block position={[0.3, 0.65, -0.72]} color={BUTTER} />
    <Label text="BUTTER" position={[-0.3, 1.12, -0.8]} width={0.34} fg="#ffffff" bg="#1d4fa8" />
    <Label text="MARGARINE" position={[0.3, 1.12, -0.8]} width={0.34} fg="#ffffff" bg="#c0392b" />
    <DyeBottle position={[-0.3 + (f % 60 > 30 ? 0.6 : 0), 0.84, -0.62]} label="YELLOW DYE" color="#ffd23f" drip={drip} />
    <Label text="DAIRY" position={[0, 2.3, -2.42]} width={0.9} fg="#c08a00" bg="#ffffff" />
  </Room>
);
const dairy = (camera: CameraShot, f: number, puppets: PuppetPlacement[], drip?: number) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<DairySet camera={camera} f={f} drip={drip} />} />
);

const LawHallSet: React.FC<{ camera: CameraShot; open: number; page?: string; pageAppear?: number }> = ({ camera, open, page, pageAppear }) => (
  <Room camera={camera} mood="dream" floor="#3a1a5a" wall="#7b4fc0" width={7} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    <Label text="STATE HOUSE" position={[0, 2.5, -2.42]} width={1.4} fg="#2b0d45" bg="#f2d27a" />
    <Window position={[-1.9, 1.6, -2.44]} size={[0.8, 1.4]} sky="#ffc2f0" />
    <Window position={[1.9, 1.6, -2.44]} size={[0.8, 1.4]} sky="#ffc2f0" />
    <Lectern position={[0, 0, -1.0]} />
    <LawBook position={[0, 0.99, -0.98]} rotation={[0.25, 0, 0]} open={open} page={page} pageAppear={pageAppear} scale={1.3} />
  </Room>
);
const lawHall = (camera: CameraShot, puppets: PuppetPlacement[], open: number, page?: string, pageAppear?: number) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<LawHallSet camera={camera} open={open} page={page} pageAppear={pageAppear} />} />
);

const PrintSet: React.FC<{ camera: CameraShot; f: number; letters: number; stamp?: number }> = ({ camera, f, letters, stamp }) => {
  const word = "OLEOMARGARINE";
  const shown = word.slice(0, Math.round(letters * word.length));
  return (
    <Room camera={camera} mood="office" floor="#5a7a5a" wall="#3f8a5a" stripe="#f2d27a" width={7} depth={5} wallPattern="panel" floorPattern="wood" sun={{ x: -1.6, color: "#ffffff", bars: 5 }}>
      <Desk position={[0, 0, -0.55]} size={[1.6, 0.62, 0.7]} color="#a8743e" />
      <group position={[0, 0.65, -0.5]}>
        <Tub position={[0, 0, 0]} scale={1.6} text={shown.length ? shown : " "} />
      </group>
      {/* ruler lying along the tub's front */}
      <InkBox size={[0.6, 0.012, 0.06]} position={[0, 0.662, -0.12]} color="#f2d27a" ink={0.004} />
      <Label text="1/2 INCH" position={[0.0, 0.67, -0.1]} rotation={[-Math.PI / 2, 0, 0]} width={0.26} fg="#1d1a1a" bg="#f2d27a" border={false} />
      {[-0.45, -0.6, 0.45, 0.6].map((x) => (
        <Tub key={x} position={[x, 0.65, -0.7]} text="OLEO" scale={0.9} />
      ))}
      {stamp !== undefined && <Stamp position={[0.5, 0.65, -0.35]} f={f} hit={stamp} text="LEGAL" ink="#1d6a3a" />}
      <Label text="PRINT ROOM" position={[0, 2.3, -2.42]} width={1.1} fg="#ffffff" bg="#1d4a2a" />
    </Room>
  );
};
const printRoom = (camera: CameraShot, f: number, puppets: PuppetPlacement[], letters: number, stamp?: number) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<PrintSet camera={camera} f={f} letters={letters} stamp={stamp} />} />
);

const VatSet: React.FC<{ camera: CameraShot; f: number; dunk: number; stampHit?: number }> = ({ camera, f, dunk, stampHit }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
    <DyeVat position={[0.55, 0, -1.0]} f={f} dunk={dunk} />
    <Desk position={[-0.6, 0, -0.7]} size={[0.8, 0.62, 0.5]} color="#5a3d7a" />
    <Tub position={[-0.6, 0.65, -0.65]} text="PINK" labelBg="#ff8fc8" scale={1.3} />
    {stampHit !== undefined && <Stamp position={[-0.6, 1.0, -0.45]} f={f} hit={stampHit} text="NO" />}
  </Room>
);
const vat = (camera: CameraShot, f: number, dunk: number, stampHit?: number) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={[]} set={<VatSet camera={camera} f={f} dunk={dunk} stampHit={stampHit} />} />
);

const CUSTOMER_AT: [number, number] = [0, -1.15];
const KitchenSet: React.FC<{ camera: CameraShot; fly: number }> = ({ camera, fly }) => (
  <Room camera={camera} mood="daylight" floor="#e8dcc8" wall="#9fd0f0" stripe="#ffffff" width={7} depth={5} wallPattern="wallpaper" floorPattern="tile" sun={{ x: 1.2, color: "#fff6d8", bars: 4 }}>
    <Window position={[1.2, 1.55, -2.44]} size={[1.1, 1.0]} sky="#dff4ff" />
    <Desk position={[0, 0, -0.55]} size={[1.3, 0.62, 0.7]} color="#f2f2ea" />
    <InkBox size={[0.3, 0.02, 0.3]} position={[0, 0.66, -0.45]} color="#ffffff" ink={0.004} />
    <Toast position={[0, 0.67, -0.45]} pat={PINK} fly={fly} />
    {fly >= 1 && <Splash position={[0.5, 0.62, -0.2]} t={Math.min(1, (fly - 1) * 3 + 0.4)} />}
    <InkBox size={[0.08, 0.2, 0.08]} position={[-0.45, 0.75, -0.6]} color="#ffffff" ink={0.004} />
  </Room>
);
const kitchenLight: PuppetLight = { distant: [{ direction: [1, 0.4, 0.4], color: "#fff6d8", strength: 1.4 }] };
const kitchen = (camera: CameraShot, puppets: PuppetPlacement[], fly = 0) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} light={kitchenLight} set={<KitchenSet camera={camera} fly={fly} />} />
);

const JailSet: React.FC<{ camera: CameraShot; f: number; slide: number; calendar?: number }> = ({ camera, f, slide, calendar }) => (
  <Room camera={camera} mood="night" floor="#1c2433" wall="#2a3a6a" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
    <CellBars position={[0, 0, -0.6]} width={2.6} slide={slide} />
    <Bulb position={[0, 2.2, -1.4]} />
    <InkBox size={[0.9, 0.35, 0.5]} position={[-0.8, 0.18, -1.9]} color="#59606a" />
    {calendar === undefined && <Label text={"FINE\n$100"} position={[0, 1.8, -0.5]} width={0.5} fg="#1d1a1a" bg="#fffdf4" />}
    {calendar !== undefined && <Label text={"60\nDAYS"} position={[-0.75, 1.75, -0.5]} width={0.45} fg="#ffffff" bg="#c0392b" appear={f - calendar} />}
    <Desk position={[0, 0, 1.0]} size={[1.4, 0.62, 0.6]} color="#5a3a22" />
    <Ticket position={[0.05, 0.665, 1.0]} text={"FINE\n$100"} rotationZ={0.1} />
    <Label text="JAIL" position={[-1.6, 2.3, -2.42]} width={0.7} fg="#ffffff" bg="#1d2f5a" />
  </Room>
);
const jailLight: PuppetLight = { points: [{ position: [0, 2.1, -1.4], color: "#ffe6a8", strength: 1.8, range: 3.5 }] };
const jail = (camera: CameraShot, f: number, puppets: PuppetPlacement[], slide: number, calendar?: number) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} light={jailLight} set={<JailSet camera={camera} f={f} slide={slide} calendar={calendar} />} />
);

const court = (camera: CameraShot, puppets: PuppetPlacement[], extra: React.ReactNode = null, grade: Grade = {}) => (
  <Stage bg={moodBackground("alarm")} camera={camera} puppets={puppets} {...grade} set={<OldCourt camera={camera}>{extra}</OldCourt>} />
);
const BENCH_TOP = 0.65;
const BENCH_FRONT_Z = -1.15;

const justices = (f: number, chief: Partial<PuppetPose> = {}, j2: Partial<PuppetPose> = {}, j3: Partial<PuppetPose> = {}): PuppetPlacement[] => [
  pup("j2", JUSTICE2, [JUSTICE_X[0], JUSTICE_Z], { expression: "neutral", lookX: 0.3, ...j2 }),
  pup("chief", CHIEF, [JUSTICE_X[1], JUSTICE_Z], { expression: "thinking", bob: breathe(f), ...chief }),
  pup("j3", JUSTICE3, [JUSTICE_X[2], JUSTICE_Z], { expression: "neutral", lookX: -0.3, ...j3 }),
];

// ---------- shots ----------

// Hook, low angle: the seller slides a ten-pound tub across the counter to a buyer. The law book lies open.
const Sale: React.FC = () => {
  const f = useShotFrame();
  const slide = Easing.out(Easing.cubic)(ramp(f, 2, 22));
  const cam: CameraShot = { position: lerp3([1.1, 0.75, 2.7], [0.95, 0.8, 2.4], f / 42), target: [0.0, 1.0, -0.7], fov: 46 };
  return store(cam, f, [
    pup("seller", SELLER, SELLER_AT, { expression: "happy", reachR: [260, -250], frontR: true, lookX: 0.6 }),
    pup("buyer", BUYER, BUYER_AT, { expression: "neutral", lookX: -0.6, armL: [40, -60] }),
  ], (
    <>
      <Tub position={[interpolate(slide, [0, 1], [-0.3, 0.45]), COUNTER_TOP, COUNTER_Z]} text="10 LB" />
      <LawBook position={BOOK_AT} rotation={[0, 0.3, 0]} />
    </>
  ));
};

// Macro: the stamp slams FINED $100 on the counter and the tub jumps.
const FineStamp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.32, 1.55, 0.05], [0.3, 1.45, -0.05], f / 35), target: [0.3, 0.67, -0.62], fov: 44 };
  return store(cam, f, [], (
    <>
      <group position={[0.75, COUNTER_TOP, COUNTER_Z - 0.05]} scale={squash(f, 8, 0.35)}>
        <Tub position={[0, 0, 0]} text="10 LB" />
      </group>
      <Stamp position={[0.3, COUNTER_TOP, COUNTER_Z - 0.1]} f={f} hit={8} text="FINED $100" />
    </>
  ));
};

const SellerShock: React.FC = () => {
  const f = useShotFrame();
  return store(close(SELLER_AT[0], SELLER_AT[1], f / 25, 0.25), f, [
    pup("seller", SELLER, SELLER_AT, { ...faceChange([[0, "happy"], [4, "shocked"]], f), armL: [150, -20], armR: [150, -20] }),
  ], <Tub position={[-0.2, COUNTER_TOP, COUNTER_Z]} text="10 LB" />, { blur: 6 });
};

// The buyer tastes it and loves it.
const Taste: React.FC = () => {
  const f = useShotFrame();
  return store(medium(BUYER_AT[0] - 0.4, BUYER_AT[1], (f + 8) / 42, 0.3), f, [
    pup("buyer", BUYER, BUYER_AT, { ...moveChange([[0, "thinking", "chin"], [14, "excited", "cheer"]], f), lookX: -0.3 }),
    pup("seller", SELLER, SELLER_AT, { expression: "worried", lookX: 0.6 }),
  ], <Tub position={[0.1, COUNTER_TOP, COUNTER_Z]} text="10 LB" />);
};

// Macro into the open tub: butter yellow, and a card asks COLOUR?
const TubColour: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.15, -0.05], [0.1, 1.05, -0.2], f / 20), target: [0.1, 0.8, -0.6], fov: 40 };
  return store(cam, f, [], (
    <>
      <Tub position={[0.1, COUNTER_TOP, COUNTER_Z]} text="10 LB" />
      <Label text="COLOUR?" position={[0.1, 1.08, COUNTER_Z]} width={0.32} fg="#ffffff" bg="#c0392b" appear={f - 3} />
    </>
  ));
};

// Wide: the store in New Hampshire; the lawman leans in the doorway (seed).
const StoreWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.5, 4.0], [0.7, 1.45, 3.8], ease(ramp(f, 0, 61))), target: [0.6, 1.15, -1.0], fov: 46 };
  return store(cam, f, [
    pup("seller", SELLER, SELLER_AT, { expression: "smug", gesture: "handsOnHips" }),
    pup("lawman", LAWMAN, [1.65, -0.25], { expression: "skeptical", gesture: "armsCrossed", lookX: -0.8 }),
  ], (
    <>
      <Label text={"MANCHESTER\nNEW HAMPSHIRE"} position={[1.75, 2.45, -2.38]} width={1.0} fg="#3a1a10" bg="#f2d27a" />
      <Tub position={[0.2, COUNTER_TOP, COUNTER_Z]} text="10 LB" />
      <LawBook position={BOOK_AT} rotation={[0, 0.3, 0]} />
    </>
  ), { door: 1 });
};

// Top-down on the scale: TEN POUNDS.
const ScaleTop: React.FC = () => {
  const f = useShotFrame();
  const settle = Easing.out(Easing.back(2))(ramp(f, 2, 16));
  const cam: CameraShot = { position: lerp3([0.3, 2.1, -0.25], [0.3, 1.9, -0.3], f / 41), target: [0.3, 0.7, -0.62], fov: 40 };
  return store(cam, f, [], (
    <group position={[0.3, COUNTER_TOP, COUNTER_Z]}>
      <Scale position={[0, 0, 0]} reading="10 LB" needle={settle * 1.6} />
      <Tub position={[0, 0.1 + (1 - ramp(f, 0, 6)) * 0.3, 0]} text="OLEO" />
    </group>
  ));
};

// Dairy table: butter and margarine look the same; the seller shrugs between them.
const LookAlike: React.FC = () => {
  const f = useShotFrame();
  return dairy({ ...medium(0, -1.4, (f + 8) / 52, 0), fov: 44 }, f, [pup("seller", SELLER, [0, -1.4], { ...moveChange([[0, "neutral"], [10, "smug", "shrug"]], f) })]);
};

const DyeDrip: React.FC = () => {
  const f = useShotFrame();
  const drip = (f % 30) / 30;
  const cam: CameraShot = { position: lerp3([-0.15, 1.5, 1.75], [0.1, 1.45, 1.5], f / 64), target: [0, 0.85, -0.72], fov: 50 };
  return dairy(cam, f, [], drip);
};

// Low angle: the law book on the State House lectern falls open.
const LawOpens: React.FC = () => {
  const f = useShotFrame();
  const open = Easing.out(Easing.back(1.3))(ramp(f + 8, 6, 26));
  const cam: CameraShot = { position: lerp3([0.35, 0.45, 0.9], [0.3, 0.5, 0.65], (f + 8) / 59), target: [0, 1.3, -1.0], fov: 50 };
  return lawHall(cam, [], open, "SELL\nFREELY", f - 20);
};

// The seller cheers by the open book.
const Freely: React.FC = () => {
  const f = useShotFrame();
  return lawHall(medium(0.35, -1.0, f / 38, -0.4), [pup("seller", SELLER, [0.75, -1.0], { ...moveChange([[0, "excited"], [4, "excited", "cheer"]], f), ...jump(f, 10, 200) })], 1, "SELL\nFREELY");
};

// Over the shoulder: OLEOMARGARINE goes onto the tub letter by letter.
const PrintOTS: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.4, 1.95], [0.7, 1.38, 1.75], (f + 8) / 65), target: [-0.1, 0.8, -0.5], fov: 34 };
  return printRoom(cam, f, [pup("seller", SELLER, [0.45, 0.1], { view: "back", expression: "neutral", reachR: [-60, -420], frontR: true })], ramp(f, 4, 44));
};

const Ruler: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.1, 0.8], [0.05, 1.05, 0.65], f / 43), target: [0, 0.78, -0.35], fov: 48 };
  return printRoom(cam, f, [], 1);
};

// Top-down: a row of labelled tubs; the stamp says LEGAL.
const LegalTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.12, 2.3, -0.2], [0.15, 2.15, -0.25], f / 52), target: [0.12, 0.65, -0.32], fov: 50 };
  return printRoom(cam, f, [], 1, 10);
};

const EasyMoney: React.FC = () => {
  const f = useShotFrame();
  return printRoom(close(0.7, -1.15, f / 35, 0.25, 1.1), f, [pup("seller", SELLER, [0.7, -1.15], { ...moveChange([[0, "smug", "handsOnHips"]], f), headTilt: Math.sin(f / 7) * 5 })], 1, undefined);
};

// The twist: the door swings open, the lawman walks in. The store goes cold.
const LawmanIn: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 6, 34, [STORE_DOOR_X + 1.3, -0.7], LAWMAN_IN);
  const cam: CameraShot = { position: lerp3([-0.3, 1.35, 3.2], [0.2, 1.3, 2.9], (f + 8) / 54), target: [0.9, 1.0, -0.8], fov: 44 };
  return store(cam, f, [
    pup("seller", SELLER, SELLER_AT, { ...faceChange([[0, "smug"], [16, "worried"]], f), lookX: 0.8 }),
    pup("lawman", LAWMAN, w.at, { expression: "determined", ...w.pose }),
  ], (
    <>
      <Tub position={[0.2, COUNTER_TOP, COUNTER_Z]} text="OLEOMARGARINE" />
      <LawBook position={BOOK_AT} rotation={[0, 0.3, 0]} />
    </>
  ), { mood: "cold", door: Easing.out(Easing.back(1.4))(ramp(f + 8, 2, 14)) });
};

// Macro: the last line of the law book. UNLESS IT IS PINK.
const LastLine: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.62, 1.5, -0.25], [-0.62, 1.4, -0.32], f / 35), target: [-0.64, COUNTER_TOP, COUNTER_Z - 0.02], fov: 44 };
  return store(cam, f, [], <LawBook position={BOOK_AT} rotation={[0, 0, 0]} page={"UNLESS IT\nIS PINK"} pageAppear={f - 4} />, { mood: "cold" });
};

const TwistFace: React.FC = () => {
  const f = useShotFrame();
  return store(close(SELLER_AT[0], SELLER_AT[1], f / 31, -0.25), f, [
    pup("seller", SELLER, SELLER_AT, { ...faceChange([[0, "worried"], [3, "shocked"]], f), armL: [150, -20], armR: [150, -20], lookX: 0.4 }),
  ], <Tub position={[-0.05, COUNTER_TOP, COUNTER_Z]} text="OLEO" />, { mood: "cold", blur: 6, truth: 0.4 });
};

// A pink label is not enough: the stamp says so.
const PinkLabel: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.55, 1.35, 0.85], [-0.58, 1.3, 0.65], (f + 8) / 50), target: [-0.6, 0.72, -0.65], fov: 42 };
  return vat(cam, f, 0, 12);
};

// The block goes into the vat yellow and comes out pink.
const Dunk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.35, 1.4], [0.75, 1.3, 1.15], f / 51), target: [0.55, 0.95, -1.0], fov: 44 };
  return vat(cam, f, ramp(f, 2, 40));
};

// The customer at breakfast: "Why is my butter pink?"
const Breakfast: React.FC = () => {
  const f = useShotFrame();
  return kitchen(medium(0, CUSTOMER_AT[1], (f + 8) / 54, -0.35), [pup("customer", CUSTOMER, CUSTOMER_AT, { ...faceChange([[0, "neutral"], [8, "confused"]], f), reachR: [160, -400], frontR: true, lookX: 0.2 })]);
};

// Gag: she flings the toast; it lands pink side down.
const Fling: React.FC = () => {
  const f = useShotFrame();
  const fly = ramp(f, 4, 20) + (f > 20 ? ramp(f, 20, 32) : 0);
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 1.6], [-0.5, 1.25, 1.35], f / 32), target: [0.15, 0.85, -0.6], fov: 44 };
  return kitchen(cam, [pup("customer", CUSTOMER, CUSTOMER_AT, { ...faceChange([[0, "disgusted"]], f), armR: f < 6 ? [60, -40] : [150, -10], lookX: 0.5 })], fly);
};

// Jail office: the fine on the desk.
const PaysFine: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.45, 3.9], [0.1, 1.4, 3.6], (f + 8) / 69), target: [0, 1.05, 0.4], fov: 46 };
  return jail(cam, f, [
    pup("seller", SELLER, [-0.45, 0.35], { expression: "sad", lookX: 0.5, reachR: [180, -330], frontR: true }),
    pup("lawman", LAWMAN, [0.5, 0.35], { expression: "smug", gesture: "armsCrossed", lookX: -0.5 }),
  ], 0);
};

// Gag: the cell door slams; SIXTY DAYS on the wall.
const CellSlam: React.FC = () => {
  const f = useShotFrame();
  const slide = Easing.in(Easing.quad)(ramp(f, 4, 12));
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.8], [-0.05, 1.3, 1.5], f / 54), target: [-0.05, 1.15, -1.4], fov: 46 };
  return jail(cam, f, [pup("seller", SELLER, [-0.25, -1.3], { ...faceChange([[0, "worried"], [12, "sad"]], f), headTilt: -6 })], slide, 16);
};

// The Supreme Court: the seller walks up to the bench with his tub.
const CourtIn: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 40, [1.4, 1.2], [0.5, -0.45]);
  const cam: CameraShot = { position: lerp3([-0.5, 1.6, 4.4], [-0.2, 1.55, 4.0], (f + 8) / 55), target: [0, 1.2, -1.2], fov: 46 };
  return court(cam, [...justices(f), pup("seller", SELLER, w.at, { expression: "determined", ...w.pose })]);
};

const Docket: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.45, 1.25, -0.05], [0.43, 1.2, -0.2], f / 33), target: [0.45, BENCH_TOP + 0.1, BENCH_FRONT_Z - 0.2], fov: 40 };
  return court(cam, justices(f), <Label text={"SUPREME COURT\nMAY 23, 1898"} position={[0.45, BENCH_TOP + 0.14, BENCH_FRONT_Z - 0.05]} width={0.5} fg="#f2d27a" bg="#3a1a10" appear={f - 3} />);
};

// He won: the seller jumps for joy.
const Won: React.FC = () => {
  const f = useShotFrame();
  return court(medium(0.5, -0.45, f / 27, 0.4), [...justices(f), pup("seller", SELLER, [0.5, -0.45], { ...moveChange([[0, "excited", "cheer"]], f), ...jump(f, 2, 240) })]);
};

// Low angle on the chief justice: margarine's natural colour is not pink.
const Natural: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.0, 0.9], [0.15, 1.0, 0.65], f / 68), target: [0, 1.0, JUSTICE_Z], fov: 52 };
  return court(cam, justices(f, { ...moveChange([[0, "thinking", "chin"], [24, "neutral", "point"]], f), lookX: 0.3 }), (
    <>
      <Tub position={[-0.26, BENCH_TOP, BENCH_FRONT_Z - 0.15]} text="NATURAL" />
      <Tub position={[0.26, BENCH_TOP, BENCH_FRONT_Z - 0.15]} fill={PINK} text="NOT PINK" labelBg="#ff8fc8" />
    </>
  ), { truth: 0.6 });
};

// Pink tub stamped UNSELLABLE.
const Unsellable: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 1.35, 0.05], [0.32, 1.28, -0.1], f / 65), target: [0.3, BENCH_TOP + 0.1, BENCH_FRONT_Z - 0.15], fov: 42 };
  return court(cam, justices(f), (
    <>
      <group position={[0.3, BENCH_TOP, BENCH_FRONT_Z - 0.2]} scale={squash(f, 14, 0.3)}>
        <Tub position={[0, 0, 0]} fill={PINK} text="PINK" labelBg="#ff8fc8" />
      </group>
      <Stamp position={[0.3, BENCH_TOP + 0.27, BENCH_FRONT_Z - 0.05]} f={f} hit={14} text="UNSELLABLE" />
    </>
  ), { truth: 0.6 });
};

// The store's door says SALES OPEN, but a PINK padlock holds it shut. The seller tugs in vain.
const Locked: React.FC = () => {
  const f = useShotFrame();
  const tug = Math.max(0, Math.sin(f / 4)) * ramp(f, 6, 12);
  const cam: CameraShot = { position: lerp3([1.8, 1.35, 1.6], [2.0, 1.3, 1.3], (f + 8) / 61), target: [STORE_DOOR_X + 1.3, 1.0, -1.2], fov: 44 };
  return store(cam, f, [pup("seller", SELLER, [STORE_DOOR_X + 0.75, -0.65], { view: "side", facing: 1, expression: "angry", reachR: [230 - tug * 40, -470], frontR: true, lean: -tug * 8 })], (
    <>
      <Label text={"SALES\nOPEN"} position={[STORE_DOOR_X + 1.3, 1.45, -1.1]} width={0.5} fg="#ffffff" bg="#3f7a4a" />
      <Padlock position={[STORE_DOOR_X + 1.62, 1.0, -1.08]} tag="PINK" shake={tug} />
    </>
  ), { door: 0, mood: "cold" });
};

// The sign flips from PERMIT to BAN.
const PermitBan: React.FC = () => {
  const f = useShotFrame();
  const flipped = f >= 20;
  const cam: CameraShot = { position: lerp3([STORE_DOOR_X + 1.3, 1.45, 0.2], [STORE_DOOR_X + 1.3, 1.42, -0.1], f / 47), target: [STORE_DOOR_X + 1.3, 1.35, -1.1], fov: 52 };
  return store(cam, f, [], (
    <>
      <Label text={flipped ? "BAN" : "PERMIT"} position={[STORE_DOOR_X + 1.3, 1.45, -1.1]} width={0.6} fg="#ffffff" bg={flipped ? "#c0392b" : "#3f7a4a"} appear={flipped ? f - 20 : undefined} />
      <Padlock position={[STORE_DOOR_X + 1.62, 1.0, -1.08]} tag="PINK" />
    </>
  ), { door: 0, mood: "cold" });
};

// Close on the chief justice, eyebrow up.
const WhyNot: React.FC = () => {
  const f = useShotFrame();
  return court(close(0, JUSTICE_Z, f / 38, 0.2, 1.08), justices(f, { ...moveChange([[0, "skeptical", "chin"]], f), headTilt: 8 }), <Tub position={[0.25, BENCH_TOP, BENCH_FRONT_Z - 0.15]} fill={PINK} text="PINK" labelBg="#ff8fc8" />, { blur: 6 });
};

// Blue, red, black: three tubs pop up on the bench with the words.
const Colours: React.FC = () => {
  const f = useShotFrame();
  const at = [0, 8, 20];
  const cols = [["#3a6ad8", "BLUE"], ["#d62828", "RED"], ["#1a1a1a", "BLACK"]];
  const cam: CameraShot = { position: lerp3([0, 1.3, 0.75], [0, 1.25, 0.55], f / 36), target: [0, BENCH_TOP + 0.3, BENCH_FRONT_Z - 0.15], fov: 50 };
  return court(cam, justices(f), (
    <>
      {cols.map(([c, t], i) => {
        const s = Easing.out(Easing.back(2))(ramp(f, at[i], at[i] + 8));
        return s > 0 ? <Tub key={t} position={[-0.34 + i * 0.34, BENCH_TOP, BENCH_FRONT_Z - 0.15]} fill={c} text={t} labelBg={c === "#1a1a1a" ? "#cccccc" : "#fff6dc"} scale={Math.max(0.01, s)} /> : null;
      })}
    </>
  ));
};

// Gag: the STINK tub's lid pops, a green cloud rolls out and a justice tips back onto the floor.
const StinkGag: React.FC = () => {
  const f = useShotFrame();
  const pop = ramp(f, 6, 14);
  const cam: CameraShot = { position: lerp3([-0.9, 1.4, 1.8], [-0.7, 1.35, 1.5], f / 50), target: [-0.6, 0.95, -1.5], fov: 44 };
  return court(cam, justices(f, { ...faceChange([[0, "neutral"], [12, "disgusted"]], f) }, { ...faceChange([[0, "neutral"], [10, "disgusted"]], f), ...lieDown(f, 18, 18) }), (
    <>
      <Tub position={[-0.6, BENCH_TOP, BENCH_FRONT_Z - 0.15]} open={false} lid={pop} text="STINK" labelBg="#b8e86a" />
      <Stink position={[-0.6, BENCH_TOP + 0.25, BENCH_FRONT_Z - 0.15]} t={ramp(f, 8, 46)} />
    </>
  ));
};

// Two justices disagree.
const Dissent: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 1.5, 3.9], [0.0, 1.45, 3.6], f / 39), target: [0, 1.2, JUSTICE_Z], fov: 50 };
  return court(cam, justices(f, { expression: "neutral" }, { ...moveChange([[0, "neutral"], [4, "skeptical", "armsCrossed"]], f) }, { ...moveChange([[0, "neutral"], [10, "skeptical", "armsCrossed"]], f) }), (
    <>
      <Label text="DISSENT" position={[JUSTICE_X[0], 1.75, JUSTICE_Z]} width={0.5} fg="#ffffff" bg="#1d2f5a" appear={f - 4} />
      <Label text="DISSENT" position={[JUSTICE_X[2], 1.75, JUSTICE_Z]} width={0.5} fg="#ffffff" bg="#1d2f5a" appear={f - 10} />
    </>
  ));
};

// The fine gets stamped REVERSED.
const Reversed: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.35, -0.4], [0.0, 1.25, -0.55], f / 49), target: [0.0, BENCH_TOP, BENCH_FRONT_Z - 0.15], fov: 42 };
  return court(cam, justices(f), (
    <>
      <Ticket position={[0.0, BENCH_TOP + 0.005, BENCH_FRONT_Z - 0.1]} text={"FINE\n$100"} rotationZ={-0.1} />
      <Stamp position={[0.0, BENCH_TOP + 0.01, BENCH_FRONT_Z - 0.18]} f={f} hit={14} text="REVERSED" ink="#1d6a3a" />
    </>
  ));
};

// Ending: back in the store, a new seller. The law book says YES.
const NewSeller: React.FC = () => {
  const f = useShotFrame();
  return store(medium(SELLER_AT[0] + 0.3, SELLER_AT[1], (f + 8) / 61, -0.3), f, [pup("seller2", NEW_SELLER, SELLER_AT, { ...moveChange([[0, "happy"], [12, "excited", "cheer"]], f) })], (
    <>
      <Tub position={[0.15, COUNTER_TOP, COUNTER_Z]} text="OLEO" />
      <Label text="YES" position={[-0.45, 1.6, COUNTER_Z - 0.2]} width={0.5} fg="#ffffff" bg="#3f7a4a" appear={f - 10} />
    </>
  ));
};

// Gag: a pink paint bucket drops on his tub and splashes.
const BucketDrop: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 0, 10));
  const cam: CameraShot = { position: lerp3([0.6, 1.3, 1.0], [0.5, 1.25, 0.8], f / 38), target: [0.0, 0.95, -0.9], fov: 44 };
  return store(cam, f, [pup("seller2", NEW_SELLER, SELLER_AT, { ...faceChange([[0, "excited"], [11, "shocked"]], f), armL: [150, -20], armR: [150, -20] })], (
    <>
      <group position={[0.15, COUNTER_TOP, COUNTER_Z]} scale={squash(f, 10, 0.35)}>
        <Tub position={[0, 0, 0]} text="OLEO" fill={f >= 10 ? PINK : BUTTER} />
      </group>
      {f < 12 && <Bucket position={[0.15, COUNTER_TOP + 0.3 + (1 - fall) * 1.4, COUNTER_Z]} color={PINK} />}
      {f >= 10 && <Splash position={[0.15, COUNTER_TOP + 0.2, COUNTER_Z]} t={ramp(f, 10, 22)} />}
      <Label text="BUT PINK" position={[-0.45, 1.6, COUNTER_Z - 0.2]} width={0.6} fg="#ffffff" bg="#e0267a" appear={f - 12} />
    </>
  ));
};

// The last word: NO.
const FinalNo: React.FC = () => {
  const f = useShotFrame();
  return store(medium(SELLER_AT[0] + 0.2, SELLER_AT[1], f / 51, 0.3), f, [pup("seller2", NEW_SELLER, SELLER_AT, { ...moveChange([[0, "shocked"], [8, "sad", "facepalm"]], f) })], (
    <>
      <Tub position={[0.15, COUNTER_TOP, COUNTER_Z]} text="OLEO" fill={PINK} />
      <Label text="NO" position={[-0.45, 1.6, COUNTER_Z - 0.2]} width={0.6} fg="#ffffff" bg="#c0392b" appear={f - 18} />
    </>
  ));
};

const SHOTS: Shot[] = [
  [0, 42, Sale, false],
  [42, 77, FineStamp, false],
  [77, 102, SellerShock, false],
  [102, 136, Taste, false],
  [136, 156, TubColour, false],
  [156, 217, StoreWide, false],
  [217, 258, ScaleTop, false],
  [258, 310, LookAlike, true],
  [310, 374, DyeDrip, false],
  [374, 425, LawOpens, true],
  [425, 463, Freely, false],
  [463, 520, PrintOTS, true],
  [520, 563, Ruler, false],
  [563, 615, LegalTop, false],
  [615, 650, EasyMoney, false],
  [650, 696, LawmanIn, true],
  [696, 731, LastLine, false],
  [731, 762, TwistFace, false],
  [762, 804, PinkLabel, true],
  [804, 855, Dunk, false],
  [855, 901, Breakfast, true],
  [901, 933, Fling, false],
  [933, 994, PaysFine, true],
  [994, 1048, CellSlam, false],
  [1048, 1095, CourtIn, true],
  [1095, 1128, Docket, false],
  [1128, 1155, Won, false],
  [1155, 1223, Natural, false],
  [1223, 1288, Unsellable, false],
  [1288, 1341, Locked, true],
  [1341, 1388, PermitBan, false],
  [1388, 1426, WhyNot, true],
  [1426, 1462, Colours, false],
  [1462, 1512, StinkGag, false],
  [1512, 1551, Dissent, false],
  [1551, 1600, Reversed, false],
  [1600, 1653, NewSeller, true],
  [1653, 1691, BucketDrop, false],
  [1691, TIMING.totalFrames, FinalNo, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.12, until: 258 },
  { at: 6, src: sfx("paper"), volume: 0.3 },
  { at: 50, src: sfx("stamp"), volume: 0.7 },
  { at: 52, src: sfx("boom"), volume: 0.3 },
  { at: 139, src: sfx("pop"), volume: 0.5 },
  { at: 219, src: sfx("boom"), volume: 0.2 },
  ...Array.from({ length: 4 }, (_, k) => ({ at: 222 + k * 3, src: sfx("tick"), volume: 0.35 })),
  { at: 258, src: sfx("whoosh"), volume: 0.35 },
  ...Array.from({ length: 2 }, (_, k) => ({ at: 330 + k * 30, src: sfx("credit-blip"), volume: 0.25 })),
  { at: 374, src: sfx("whoosh"), volume: 0.35 },
  { at: 380, src: sfx("paper"), volume: 0.45 },
  { at: 395, src: sfx("pop"), volume: 0.45 },
  { at: 435, src: sfx("chime"), volume: 0.4 },
  { at: 463, src: sfx("whoosh"), volume: 0.35 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 468 + k * 5, src: sfx("tick"), volume: 0.3 })),
  { at: 573, src: sfx("stamp"), volume: 0.55 },
  { at: 620, src: sfx("credit-blip"), volume: 0.35 },
  { at: 650, src: sfx("whoosh"), volume: 0.35 },
  { at: 652, src: sfx("door"), volume: 0.55 },
  { at: 660, src: sfx("hum"), volume: 0.08, until: 762 },
  { at: 684, src: sfx("riser"), volume: 0.25 },
  { at: 700, src: sfx("sting"), volume: 0.45 },
  { at: 700, src: sfx("pop"), volume: 0.4 },
  { at: 734, src: sfx("near-miss"), volume: 0.3 },
  { at: 762, src: sfx("whoosh"), volume: 0.35 },
  { at: 774, src: sfx("stamp"), volume: 0.6 },
  { at: 808, src: sfx("hum"), volume: 0.1, until: 855 },
  { at: 820, src: sfx("drawer"), volume: 0.3 },
  { at: 855, src: sfx("whoosh"), volume: 0.35 },
  { at: 905, src: sfx("whoosh"), volume: 0.4 },
  { at: 921, src: sfx("boom"), volume: 0.3 },
  { at: 933, src: sfx("whoosh"), volume: 0.35 },
  { at: 945, src: sfx("paper"), volume: 0.4 },
  { at: 1000, src: sfx("door"), volume: 0.4 },
  { at: 1005, src: sfx("boom"), volume: 0.5 },
  { at: 1010, src: sfx("pop"), volume: 0.45 },
  { at: 1048, src: sfx("whoosh"), volume: 0.35 },
  { at: 1048, src: sfx("ambience"), volume: 0.1, until: 1288 },
  { at: 1098, src: sfx("pop"), volume: 0.45 },
  { at: 1130, src: sfx("chime"), volume: 0.45 },
  { at: 1180, src: sfx("pop"), volume: 0.3 },
  { at: 1237, src: sfx("stamp"), volume: 0.65 },
  { at: 1288, src: sfx("whoosh"), volume: 0.35 },
  ...Array.from({ length: 5 }, (_, k) => ({ at: 1300 + k * 8, src: sfx("tick"), volume: 0.45 })),
  { at: 1361, src: sfx("pop"), volume: 0.5 },
  { at: 1361, src: sfx("tape-stop"), volume: 0.3 },
  { at: 1388, src: sfx("whoosh"), volume: 0.35 },
  { at: 1426, src: sfx("pop"), volume: 0.45 },
  { at: 1434, src: sfx("pop"), volume: 0.45 },
  { at: 1446, src: sfx("pop"), volume: 0.45 },
  { at: 1468, src: sfx("pop"), volume: 0.5 },
  { at: 1470, src: sfx("near-miss"), volume: 0.35 },
  { at: 1490, src: sfx("boom"), volume: 0.35 },
  { at: 1516, src: sfx("pop"), volume: 0.4 },
  { at: 1522, src: sfx("pop"), volume: 0.4 },
  { at: 1565, src: sfx("stamp"), volume: 0.65 },
  { at: 1600, src: sfx("whoosh"), volume: 0.35 },
  { at: 1610, src: sfx("chime"), volume: 0.4 },
  { at: 1655, src: sfx("whoosh"), volume: 0.3 },
  { at: 1663, src: sfx("boom"), volume: 0.5 },
  { at: 1709, src: sfx("pop"), volume: 0.5 },
  { at: 1712, src: sfx("near-miss"), volume: 0.3 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 258, volume: 0.24 },
  { src: MUSIC_FILES.lounge, from: 258, to: 650, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 650, to: 1048, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 1048, to: 1600, volume: 0.28 },
  { src: MUSIC_FILES.upbeat, from: 1600, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
