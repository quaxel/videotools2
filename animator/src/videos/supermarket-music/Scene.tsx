import React from "react";
import { Easing, interpolate } from "remotion";
import {
  breathe,
  CameraShot,
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
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Screen,
  Sfx,
  sfx,
  Shot,
  speaking,
  Stage,
  Switch,
  talk,
  Timing,
  useFinalFrame,
  useShotFrame,
  Video,
  walk,
} from "../../engine";
import { AisleShelves, BoxAvalanche, Cart, CeilingSpeaker, CheckoutBelt, Clipboard, FlagSpeaker, Metronome, MilkCarton, ProduceStand, SlidingDoors, TempoDial, WineShelf } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Supermarkets Play Slow Music" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "supermarket-music";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#3fae5a" };
const MANAGER: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#f7f7f2", lanyard: "#1d4fa8", glasses: true };
const CASHIER: PuppetLook = { skin: "#fbe9d6", hair: "#7a2e1a", outfit: "#d62828", cap: "#d62828", lanyard: "#ffd23f" };
const RESEARCHER: PuppetLook = { skin: "#fff3e6", hair: "#9aa0a6", outfit: "#e8e0c8", glasses: true, lanyard: "#8a4f24" };
const WINE_SHOPPER: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#ffd23f" };
const EXTRAS: PuppetLook[] = [
  { skin: "#fbe9d6", hair: "#c0392b", outfit: "#2a9d8f" },
  { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#e76f51", glasses: true },
  { skin: "#f6dcc4", hair: "#9aa0a6", outfit: "#4f7dff", cap: "#264653" },
  { skin: "#fffaf2", hair: "#4a2c1a", outfit: "#f28482" },
  { skin: "#fbe9d6", hair: "#6b4423", outfit: "#9b5de5" },
];

const WINE_R = { item: "wine", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];

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

// ---------- locations ----------

const EntranceSet: React.FC<{ camera: CameraShot; open: number }> = ({ camera, open }) => (
  <Room camera={camera} mood="daylight" floor="#d8e0ea" wall="#2aa198" stripe="#ffffff" width={9} depth={6} wallPattern="tile" floorPattern="tile" sun={{ x: 1.8, color: "#fff6d8", bars: 3 }}>
    <Label text="SUPERMARKET" position={[0, 2.65, -2.92]} width={1.8} fg="#ffffff" bg="#e0262f" />
    <SlidingDoors position={[0, 0, -2.9]} open={open} />
    {[0, 1, 2].map((i) => (
      <Cart key={i} position={[2.2 + i * 0.18, 0, -1.8]} rotationY={Math.PI / 2} />
    ))}
    <Plant position={[-2.6, 0, -2.2]} scale={1.2} />
  </Room>
);

const DairySet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="office" floor="#7d8a97" wall="#4fbf7a" stripe="#ffffff" width={9} depth={6} wallPattern="panel" floorPattern="tile" sun={{ x: -2.0, color: "#ffffff", bars: 5 }}>
    <Label text="FRESH" position={[-1.2, 2.3, -2.92]} width={1.0} fg="#ffffff" bg="#3fae5a" />
    <Label text="DAIRY" position={[1.4, 2.3, -2.92]} width={1.0} fg="#1d4fa8" bg="#ffffff" />
    <ProduceStand position={[-1.2, 0, -1.9]} />
    <InkBox size={[1.4, 0.9, 0.6]} position={[1.4, 0.45, -2.3]} color="#d8e0ea" />
    {[1.0, 1.2, 1.4, 1.6, 1.8].map((x) => (
      <MilkCarton key={x} position={[x, 0.9, -2.2]} />
    ))}
    <CeilingSpeaker position={[0.2, 2.6, -1.2]} f={f} />
  </Room>
);

const AISLE_DOOR_Z = -4.44;
const AisleSet: React.FC<{ camera: CameraShot; f: number; door?: number; avalanche?: number; tempo?: number }> = ({ camera, f, door = 0, avalanche, tempo = 0.3 }) => (
  <Room camera={camera} mood="golden" floor="#c9a26b" wall="#f2b630" stripe="#e0262f" width={6} depth={9} wallPattern="panel" floorPattern="tile">
    <AisleShelves z0={2.4} length={6} />
    <Label text="AISLE 9" position={[0, 2.55, AISLE_DOOR_Z + 0.02]} width={1.0} fg="#ffffff" bg="#1d4fa8" />
    <Door position={[0, 0, AISLE_DOOR_Z]} open={door} sign="STAFF ONLY" glow="#0a1430" color="#8a5a3a" />
    <CeilingSpeaker position={[0, 2.5, -0.6]} f={f} tempo={tempo} />
    {avalanche !== undefined && <BoxAvalanche origin={[-0.75, 1.3, 0.9]} t={avalanche} />}
  </Room>
);

const WineAisleSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" width={7} depth={5} wallPattern="wallpaper" floorPattern="wood">
    <Label text="WINE" position={[0, 2.35, -2.42]} width={0.9} fg="#ffffff" bg="#7a1a2a" />
    <WineShelf position={[0, 0, -2.1]} width={1.8} highlight="FR" />
    <CeilingSpeaker position={[0.9, 2.5, -1.0]} f={f} color="#ffb8ec" />
  </Room>
);

const DIAL_AT: [number, number, number] = [-0.35, 1.45, -2.42];
const MANAGER_AT: [number, number] = [0.45, -1.5];
const BackRoomSet: React.FC<{ camera: CameraShot; dial: number }> = ({ camera, dial }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete" sun={{ x: 1.6, color: "#8fb3ff", bars: 8 }}>
    <TempoDial position={DIAL_AT} value={dial} />
    <Screen position={[0.9, 2.15, -2.4]} size={[1.1, 0.5]} text={dial > 0.6 ? "NOW PLAYING\nSLOW JAZZ" : "NOW PLAYING\nPOP HITS"} glow="#5ad1ff" bg="#071226" />
    <InkBox size={[0.5, 0.7, 0.4]} position={[1.9, 0.35, -2.0]} color="#2c3a40" />
    <InkBox size={[0.5, 0.7, 0.4]} position={[1.9, 1.05, -2.0]} color="#2c3a40" />
    <Label text="STAFF ONLY" position={[-1.9, 2.1, -2.42]} width={0.9} fg="#ffffff" bg="#e0262f" />
  </Room>
);

const RESEARCHER_AT: [number, number] = [-0.2, -1.55];
const LabSet: React.FC<{ camera: CameraShot; f: number; switchOn?: number; screen?: string; glow?: string; appear?: number; count?: number }> = ({ camera, f, switchOn = 0, screen = "1982\nSTORE TEST", glow = "#ffd27a", appear, count }) => (
  <Room camera={camera} mood="night" floor="#1c2433" wall="#1b2a5e" width={7} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    <Screen position={[0.6, 2.0, -2.4]} size={[1.2, 0.62]} text={screen} glow={glow} bg="#0b0a06" appear={appear} count={count} />
    <Desk position={[0, 0, -0.95]} size={[1.6, 0.75, 0.7]} color="#8a5a3a" />
    <Metronome position={[-0.6, 0.78, -0.9]} bpm={72} f={f} />
    <Metronome position={[0.6, 0.78, -0.9]} bpm={92} f={f} color="#a03a2a" />
    <Switch position={[0.3, 1.12, -0.75]} label="SLOW  FAST" on={switchOn} />
        <Label text="1982" position={[-1.7, 1.9, -2.42]} width={0.7} fg="#1b2a5e" bg="#ffd27a" />
  </Room>
);

const SHOPPER_AT: [number, number] = [0.0, -0.9];
const WineShopSet: React.FC<{ camera: CameraShot; f: number; flag: "FR" | "DE"; sign?: string; signAt?: number; clipboard?: boolean }> = ({ camera, f, flag, sign, signAt = -99, clipboard }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" width={7} depth={5} wallPattern="brick" floorPattern="wood">
    <WineShelf position={[0, 0, -2.0]} width={1.8} highlight={flag} color="#2a163f" />
    <FlagSpeaker position={[-0.5, 1.72, -2.1]} flag="FR" on={flag === "FR"} f={f} label="FRANCE" />
    <FlagSpeaker position={[0.5, 1.72, -2.1]} flag="DE" on={flag === "DE"} f={f} label="GERMANY" />
    {sign && <Label text={sign} position={[0, 2.55, -2.42]} width={1.0} fg="#14062b" bg="#ffd23f" appear={f - signAt} count={ramp(f, signAt, signAt + 28)} />}
    {clipboard && <Clipboard position={[0.75, 1.0, -0.6]} rotation={[0, -0.25, 0]} text={"ASKED 44\nNOTICED 1"} width={0.42} />}
    <Plant position={[-2.6, 0, -2.0]} />
  </Room>
);

const CASHIER_AT: [number, number] = [0.6, -1.5];
const CheckoutSet: React.FC<{ camera: CameraShot; belt: number }> = ({ camera, belt }) => (
  <Room camera={camera} mood="warm" floor="#4a1820" wall="#c0392b" stripe="#ffd23f" width={8} depth={6} wallPattern="panel" floorPattern="tile">
    <Label text="CHECKOUT 3" position={[0, 2.4, -2.92]} width={1.4} fg="#ffffff" bg="#1d1a1a" />
    <CheckoutBelt position={[0, 0, -0.9]} t={belt} />
    <Plant position={[-3.0, 0, -2.2]} />
  </Room>
);

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number };
const entrance = (camera: CameraShot, puppets: PuppetPlacement[], open: number) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<EntranceSet camera={camera} open={open} />} />
);
const dairy = (camera: CameraShot, f: number, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} {...grade} set={<DairySet camera={camera} f={f} />} />
);
const aisle = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { door?: number; avalanche?: number; tempo?: number; cart?: { at: [number, number]; fill: number; tip?: number } } = {}, grade: Grade = {}) => (
  <Stage
    bg={moodBackground("golden")}
    camera={camera}
    puppets={puppets}
    {...grade}
    set={
      <>
        <AisleSet camera={camera} f={f} door={extra.door} avalanche={extra.avalanche} tempo={extra.tempo} />
        {extra.cart && (
          <group position={[extra.cart.at[0] + 0.3, 0, extra.cart.at[1]]} scale={0.72}>
            <Cart position={[0, 0, 0]} fill={extra.cart.fill} tip={extra.cart.tip} rotationY={-Math.PI / 2} />
          </group>
        )}
      </>
    }
  />
);
const wineAisle = (camera: CameraShot, f: number, puppets: PuppetPlacement[], grade: Grade = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} {...grade} set={<WineAisleSet camera={camera} f={f} />} />
);
const backRoom = (camera: CameraShot, dial: number, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} {...grade} set={<BackRoomSet camera={camera} dial={dial} />} />
);
const lab = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { switchOn?: number; screen?: string; glow?: string; appear?: number; count?: number } = {}) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} set={<LabSet camera={camera} f={f} {...extra} />} />
);
const wineShop = (camera: CameraShot, f: number, puppets: PuppetPlacement[], flag: "FR" | "DE", extra: { sign?: string; signAt?: number; clipboard?: boolean } = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<WineShopSet camera={camera} f={f} flag={flag} {...extra} />} />
);
const checkout = (camera: CameraShot, belt: number, puppets: PuppetPlacement[], grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<CheckoutSet camera={camera} belt={belt} />} />
);

// Walking toward the camera down the aisle behind the cart.
const cartWalk = (f: number, z: number, speed: number, pose: Partial<PuppetPose> = {}): PuppetPlacement[] => [
  pup("you", YOU, [-0.1, z - 0.45], { expression: "neutral", armL: [20, -40], armR: [50, -60], ...walk(f * speed), ...pose }),
];

// ---------- shots ----------

// Low angle: the doors slide open and you stride in.
const WalkIn: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 40], [-2.6, -1.0]);
  const cam: CameraShot = { position: lerp3([0.3, 0.45, 1.6], [0.25, 0.5, 1.3], f / 40), target: [0, 1.1, -1.8], fov: 50 };
  return entrance(cam, [pup("you", YOU, [0, z], { expression: "neutral", ...walk(f * 1.4), lookX: 0.2 })], Easing.out(Easing.cubic)(ramp(f, 0, 14)));
};

const MilkMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.4, 1.18, -1.2], [1.4, 1.15, -1.4], (f + 8) / 32), target: [1.4, 1.05, -2.2], fov: 32 };
  return dairy(cam, f);
};

const FullCart: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 44], [-0.6, 0.4]);
  const cam: CameraShot = { position: lerp3([0.9, 1.85, 3.4], [0.8, 1.8, 3.1], (f + 8) / 52), target: [0, 0.75, -0.3], fov: 42 };
  return aisle(cam, f, cartWalk(f, z, 1.0, { expression: "skeptical" }), { cart: { at: [0, z + 0.05], fill: 1 } });
};

// Gag: the overloaded cart tips over and the shelf follows.
const CartTip: React.FC = () => {
  const f = useShotFrame();
  const tip = Easing.in(Easing.quad)(ramp(f, 6, 16));
  const cam: CameraShot = { position: lerp3([0.9, 1.0, 2.6], [1.0, 1.05, 2.9], f / 38), target: [-0.2, 0.6, 0.3], fov: 46 };
  return aisle(cam, f, [pup("you", YOU, [0.1, -0.15], { expression: f < 10 ? "neutral" : "shocked", armL: [150, -20], armR: [150, -20], bob: f > 10 ? 0.03 : 0 })], { cart: { at: [0, 0.45], fill: 1, tip }, avalanche: ramp(f, 12, 36) });
};

const Calm: React.FC = () => {
  const f = useShotFrame();
  const sway = Math.sin(f / 10);
  return aisle(close(0, 0.2, f / 55, -0.25), f, [pup("you", YOU, [0, 0.2], { expression: "smug", blink: true, headTilt: sway * 8, armL: [30 + sway * 10, -40], armR: [30 - sway * 10, -40] })], { tempo: 0.1 }, { blur: 6 });
};

// Low angle: the ceiling speaker breathing out soft notes (the seed).
const SpeakerUp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.2, 0.8], [0.25, 1.25, 0.6], f / 25), target: [0, 2.45, -0.6], fov: 46 };
  return aisle(cam, f, [], { tempo: 0.1 });
};

const WineGrab: React.FC = () => {
  const f = useShotFrame();
  const grab = Easing.out(Easing.back(1.5))(ramp(f, 6, 20));
  return wineAisle(medium(0, -1.3, (f + 8) / 55, -0.3), f, [pup("you", YOU, [0, -1.3], { expression: "smug", hold: grab > 0.5 ? WINE_R : undefined, armR: [interpolate(grab, [0, 1], [100, 10]), interpolate(grab, [0, 1], [-20, -78])], bob: breathe(f) })]);
};

const WineDoubt: React.FC = () => {
  const f = useShotFrame();
  return wineAisle(close(0, -1.3, f / 32, 0.25), f, [pup("you", YOU, [0, -1.3], { expression: "skeptical", hold: WINE_R, armR: HOLD, lookX: 0.5, headTilt: -8 })], { blur: 6 });
};

// The staff door at the end of the aisle swings open.
const DoorOpens: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.5, 2.4], [0.0, 1.45, 1.6], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 56))), target: [0, 1.2, AISLE_DOOR_Z], fov: 34 };
  return aisle(cam, f, [], { door: Easing.out(Easing.back(1.4))(ramp(f, 4, 18)) });
};

const Manager: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.4, 2.4], [0.3, 1.38, 2.0], (f + 8) / 42), target: [0.05, 1.15, -1.8], fov: 44 };
  return backRoom(cam, ramp(f, 0, 34) * 0.4 + 0.4, [pup("manager", MANAGER, MANAGER_AT, { expression: "smug", armL: [95, -25], lookX: -1, bob: breathe(f) })]);
};

const DialMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.35, 1.45, -1.2], [-0.35, 1.45, -1.45], f / 41), target: DIAL_AT, fov: 44 };
  return backRoom(cam, 0.8 + 0.2 * Easing.inOut(Easing.cubic)(ramp(f, 2, 24)));
};

// Low angle at foot level: you shuffle down the aisle in slow motion.
const SlowFeet: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 57], [-1.4, -0.5]);
  const cam: CameraShot = { position: lerp3([0.6, 0.35, 1.4], [0.55, 0.38, 1.2], f / 57), target: [-0.1, 0.7, -1.2], fov: 46 };
  return aisle(cam, f, cartWalk(f, z, 0.5, { expression: "smug", blink: true }), { cart: { at: [0, z + 0.05], fill: 0.7 }, tempo: 0.1 });
};

const YourFeet: React.FC = () => {
  const f = useShotFrame();
  return aisle(close(0, 0.2, f / 32, 0.25), f, [pup("you", YOU, [0, 0.2], { expression: "neutral", blink: f > 14 && f < 18, lookX: -0.4 })], { tempo: 0.1 }, { blur: 6, truth: ramp(f, 0, 20) * 0.5 });
};

const Researcher: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.45, 2.4], [-0.1, 1.4, 2.0], (f + 8) / 69), target: [0.05, 1.15, -1.4], fov: 44 };
  return lab(cam, f, [pup("researcher", RESEARCHER, RESEARCHER_AT, { expression: "neutral", armL: [20 + Math.abs(Math.sin(f / 4)) * 20, -70], lookX: 0.5, bob: breathe(f) })]);
};

const SwitchFlip: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 1.25, 0.65], [0.3, 1.2, 0.4], f / 74), target: [0.3, 0.95, -0.75], fov: 40 };
  const on = Math.floor(f / 18) % 2;
  return lab(cam, f, [], { switchOn: on });
};

const produceWalkers = (f: number, speed: number, n: number, spread: number): PuppetPlacement[] =>
  Array.from({ length: n }, (_, i) => {
    const x = -1.6 + (((f * speed * 0.012 + i * spread) % 3.4) + 3.4) % 3.4;
    return pup(`w${i}`, i === 1 ? YOU : EXTRAS[i % EXTRAS.length], [x, -0.6 + (i % 2) * 0.5], { view: "side", facing: 1, expression: speed > 2 ? "shocked" : "smug", ...walk(f * speed + i * 5) });
  });

const SlowShoppers: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.4, 3.6], [-0.2, 1.35, 3.2], (f + 8) / 81), target: [0, 0.8, -1.0], fov: 46 };
  return dairy(cam, f, produceWalkers(f, 0.6, 4, 0.85));
};

const SlowMetronome: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.1, 0.25], [-0.6, 1.08, 0.1], f / 29), target: [-0.6, 0.8, -0.9], fov: 44 };
  return lab(cam, f, []);
};

const SalesScreen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.7, 1.6], [0.5, 1.9, 0.9], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 61))), target: [0.6, 2.0, -2.4], fov: 42 };
  return lab(cam, f, [], { screen: "SLOW DAYS\nSALES", glow: "#5ad1ff" });
};

const SalesUp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.5, 1.9, 0.9], [0.75, 2.05, 0.3], Easing.inOut(Easing.quad)(ramp(f, 0, 69))), target: [0.6, 2.0, -2.4], fov: 42 };
  const up = f < 6 ? {} : { appear: f - 6, count: ramp(f, 6, 36) };
  return lab(cam, f, [], { screen: f < 6 ? "SLOW DAYS\nSALES" : "SALES\n+38%", glow: "#39ff7a", ...up });
};

// Gag: fast music, everyone races; one shopper spins out and lands on the floor.
const FastShoppers: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.4, 3.6], [0.1, 1.35, 3.2], f / 55), target: [0, 0.8, -1.0], fov: 46 };
  const fallen = f > 26;
  return dairy(cam, f, [
    ...produceWalkers(f, 4.2, 3, 1.1),
    pup("spin", EXTRAS[3], [interpolate(ramp(f, 0, 26), [0, 1], [-1.5, 0.3]), 0.3], { view: fallen ? "front" : "side", facing: 1, sit: fallen, expression: "shocked", armL: [150, -20], armR: [150, -20], ...(fallen ? {} : walk(f * 4)) }),
  ]);
};

const PickWine: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.5, 1.5, 2.2], [0.3, 1.45, 1.8], (f + 8) / 56), target: [0, 1.2, -1.8], fov: 44 };
  return wineAisle(cam, f, [pup("you", YOU, [0.1, -1.1], { expression: "smug", hold: WINE_R, armR: HOLD, lookX: 0.6, bob: breathe(f) })]);
};

const Accordion: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.7, 1.6], [-0.3, 1.75, 1.2], (f + 8) / 66), target: [-0.2, 1.7, -2.1], fov: 42 };
  return wineShop(cam, f, [], "FR");
};

const Oompah: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.75, 1.2], [0.3, 1.7, 0.9], f / 53), target: [0.3, 1.7, -2.1], fov: 42 };
  return wineShop(cam, f, [], "DE");
};

const shopper = (f: number, flag: "FR" | "DE"): PuppetPlacement => {
  const reach = Easing.out(Easing.back(1.5))(ramp(f, 6, 18));
  return pup("shopper", WINE_SHOPPER, [flag === "FR" ? -0.4 : 0.4, SHOPPER_AT[1]], { expression: "smug", hold: reach > 0.5 ? WINE_R : undefined, armR: [interpolate(reach, [0, 1], [110, 10]), interpolate(reach, [0, 1], [-10, -78])], lookX: 0.4, bob: breathe(f) });
};

const FrenchPick: React.FC = () => {
  const f = useShotFrame();
  return wineShop(medium(-0.2, SHOPPER_AT[1], (f + 8) / 59, -0.3), f, [shopper(f, "FR")], "FR");
};

const FrenchSign: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 2.2, 0.9], [0, 2.25, 0.6], f / 51), target: [0, 2.25, -2.42], fov: 42 };
  return wineShop(cam, f, [], "FR", { sign: "77% FRENCH", signAt: 2 });
};

const GermanPick: React.FC = () => {
  const f = useShotFrame();
  return wineShop(medium(0.2, SHOPPER_AT[1], (f + 8) / 44, 0.3), f, [shopper(f, "DE")], "DE");
};

const GermanSign: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 2.25, 0.6], [0, 2.2, 0.3], f / 49), target: [0, 2.25, -2.42], fov: 42 };
  return wineShop(cam, f, [], "DE", { sign: "73% GERMAN", signAt: 2 });
};

const Survey: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.4, 2.6], [0.3, 1.35, 2.2], (f + 8) / 53), target: [0.3, 1.0, -0.8], fov: 44 };
  return wineShop(cam, f, [
    pup("researcher", RESEARCHER, [0.5, -0.3], { expression: "neutral", armL: [70, -40], lookX: -1, bob: breathe(f) }),
    pup("shopper", WINE_SHOPPER, [-0.25, -0.5], { expression: "skeptical", hold: WINE_R, armR: HOLD, lookX: 1, bob: breathe(f + 6) }),
  ], "DE", { clipboard: true });
};

const ClipboardMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.1, 0.4], [0.62, 1.05, 0.15], f / 51), target: [0.75, 1.0, -0.6], fov: 40 };
  return wineShop(cam, f, [], "DE", { clipboard: true });
};

const ManagerSmug: React.FC = () => {
  const f = useShotFrame();
  return backRoom(medium(MANAGER_AT[0] - 0.3, MANAGER_AT[1], (f + 8) / 64, -0.2), 0.85, [pup("manager", MANAGER, MANAGER_AT, { expression: "smug", armL: [95, -25], lookX: -1, headTilt: Math.sin(f / 8) * 6, bob: breathe(f) })]);
};

const SpeedDial: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.5, -1.0], [-0.3, 1.45, -1.35], f / 34), target: DIAL_AT, fov: 44 };
  return backRoom(cam, 0.85 + Math.sin(f / 6) * 0.05);
};

const AtCheckout: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.4, 3.0], [0.0, 1.35, 2.6], (f + 8) / 51), target: [0.05, 0.9, -0.9], fov: 46 };
  return checkout(cam, ramp(f, 0, 43) * 0.3, [
    pup("you", YOU, [-0.5, -0.2], { expression: "skeptical", lookX: 0.6, bob: breathe(f) }),
    pup("cashier", CASHIER, CASHIER_AT, { expression: "excited", lookX: -0.6, armL: [40, -60], bob: breathe(f + 4) }),
  ]);
};

// Top-down: forty things roll by, no milk.
const BeltTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 2.4, -0.5], [0.0, 2.3, -0.55], f / 38), target: [0.0, 0.6, -0.92], fov: 50 };
  return checkout(cam, 0.3 + ramp(f, 0, 38) * 0.5, []);
};

// Over the shoulder: your head small in the corner, the cashier asking.
const CashierAsk: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "cashier", useFinalFrame());
  const cam: CameraShot = { position: lerp3([-0.9, 1.55, 1.9], [-0.85, 1.52, 1.7], f / 49), target: [0.6, 1.0, -1.5], fov: 30 };
  return checkout(cam, 0.8, [
    pup("you", YOU, [-0.5, -0.2], { view: "back", expression: "neutral" }),
    pup("cashier", CASHIER, CASHIER_AT, { expression: "excited", mouthOpen: talking ? talk(f) : 0, lookX: -0.6, headTilt: 6, bob: breathe(f) }),
  ]);
};

const AisleNine: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 60], [-2.6, -1.8]);
  const cam: CameraShot = { position: lerp3([0.6, 1.95, 2.2], [0.5, 1.9, 1.6], (f + 8) / 68), target: [0, 1.1, -3.0], fov: 40 };
  return aisle(cam, f, [pup("x0", EXTRAS[0], [-0.1, z - 0.45], { expression: "smug", blink: true, armL: [40, -60], armR: [40, -60], ...walk(f * 0.45) })], { cart: { at: [0, z + 0.05], fill: 0.3 }, tempo: 0.05 });
};

const DialLoop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.35, 1.45, -1.1], [-0.35, 1.45, -1.5], (f + 8) / 76), target: DIAL_AT, fov: 44 };
  return backRoom(cam, 0.85 + 0.15 * Easing.inOut(Easing.cubic)(ramp(f, 10, 50)));
};

const SHOTS: Shot[] = [
  [0, 40, WalkIn, false],
  [40, 64, MilkMacro, true],
  [64, 108, FullCart, true],
  [108, 146, CartTip, false],
  [146, 201, Calm, false],
  [201, 226, SpeakerUp, false],
  [226, 281, WineGrab, true],
  [281, 313, WineDoubt, false],
  [313, 361, DoorOpens, true],
  [361, 395, Manager, true],
  [395, 436, DialMacro, false],
  [436, 493, SlowFeet, true],
  [493, 525, YourFeet, false],
  [525, 594, Researcher, true],
  [594, 668, SwitchFlip, false],
  [668, 741, SlowShoppers, true],
  [741, 770, SlowMetronome, true],
  [770, 823, SalesScreen, false],
  [823, 892, SalesUp, false],
  [892, 947, FastShoppers, true],
  [947, 1003, PickWine, true],
  [1003, 1061, Accordion, true],
  [1061, 1114, Oompah, false],
  [1114, 1165, FrenchPick, false],
  [1165, 1216, FrenchSign, false],
  [1216, 1252, GermanPick, false],
  [1252, 1301, GermanSign, false],
  [1301, 1346, Survey, false],
  [1346, 1397, ClipboardMacro, false],
  [1397, 1461, ManagerSmug, true],
  [1461, 1495, SpeedDial, false],
  [1495, 1538, AtCheckout, true],
  [1538, 1576, BeltTop, false],
  [1576, 1625, CashierAsk, false],
  [1625, 1685, AisleNine, true],
  [1685, TIMING.totalFrames, DialLoop, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.14, until: 313 },
  { at: 2, src: sfx("whoosh"), volume: 0.35 },
  { at: 66, src: sfx("hum"), volume: 0.05, until: 146 },
  { at: 118, src: sfx("boom"), volume: 0.45 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 121 + k * 2.5, src: sfx("tick"), volume: 0.45 })),
  { at: 236, src: sfx("paper"), volume: 0.3 },
  { at: 317, src: sfx("door"), volume: 0.5 },
  // The twist: a riser through the door opening, a sting on "tempo".
  { at: 347, src: sfx("riser"), volume: 0.25 },
  { at: 395, src: sfx("sting"), volume: 0.4 },
  { at: 361, src: sfx("hum"), volume: 0.12, until: 436 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 365 + k * 5, src: sfx("tick"), volume: 0.4 })),
  ...Array.from({ length: 5 }, (_, k) => ({ at: 399 + k * 5, src: sfx("tick"), volume: 0.5 })),
  { at: 420, src: sfx("tape-stop"), volume: 0.5 },
  { at: 525, src: sfx("hum"), volume: 0.08, until: 668 },
  ...[612, 630, 648].map((at) => ({ at, src: sfx("button"), volume: 0.6 })),
  ...Array.from({ length: 4 }, (_, k) => ({ at: 745 + k * 25, src: sfx("tick"), volume: 0.5 })),
  { at: 829, src: sfx("pop"), volume: 0.5 },
  { at: 832, src: sfx("chime"), volume: 0.45 },
  { at: 892, src: sfx("whoosh"), volume: 0.5 },
  { at: 920, src: sfx("boom"), volume: 0.4 },
  { at: 1121, src: sfx("credit-blip"), volume: 0.35 },
  { at: 1167, src: sfx("pop"), volume: 0.5 },
  { at: 1223, src: sfx("credit-blip"), volume: 0.35 },
  { at: 1254, src: sfx("pop"), volume: 0.5 },
  { at: 1350, src: sfx("paper"), volume: 0.4 },
  { at: 1397, src: sfx("hum"), volume: 0.12, until: 1495 },
  { at: 1495, src: sfx("ambience"), volume: 0.14, until: 1625 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: 1540 + k * 3, src: sfx("credit-blip"), volume: 0.25 })),
  { at: 1625, src: sfx("ambience"), volume: 0.12, until: 1685 },
  { at: 1685, src: sfx("hum"), volume: 0.1, until: TIMING.totalFrames },
  ...Array.from({ length: 4 }, (_, k) => ({ at: 1700 + k * 9, src: sfx("tick"), volume: 0.45 })),
  { at: 1735, src: sfx("tape-stop"), volume: 0.4 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.lounge, from: 0, to: 313, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 313, to: 525, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 525, to: 892, volume: 0.28 },
  // Fast songs: the bed itself speeds up.
  { src: MUSIC_FILES.upbeat, from: 892, to: 951, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 951, to: 1397, volume: 0.28 },
  { src: MUSIC_FILES.mystery, from: 1397, to: 1495, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 1495, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
