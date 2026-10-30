import React from "react";
import { Easing, interpolate } from "remotion";
import {
  breathe,
  CameraShot,
  Counter,
  Desk,
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
  stroll,
  talk,
  Timing,
  useFinalFrame,
  useShotFrame,
  Video,
  Window,
} from "../../engine";
import { Cartridge, CartridgeShelf, Champagne, Flute, InkTanks, Printer, PrinterBox, Register, TvCamera } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Printer Ink Costs More Than Champagne" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "printer-ink";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#3a6fd8" };
const CASHIER: PuppetLook = { skin: "#fbe9d6", hair: "#7a2e1a", outfit: "#d62828", cap: "#d62828", lanyard: "#ffd23f" };
const WAITER: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#1d1a1a", lanyard: "#fffdf4" };
const TESTER: PuppetLook = { skin: "#fff3e6", hair: "#9aa0a6", outfit: "#f7f7f2", glasses: true, lanyard: "#3fae5a" };
const BOSS: PuppetLook = { skin: "#fbe9d6", hair: "#1d1a1a", outfit: "#6b7178", lanyard: "#e0262f" };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });
const you = (at: [number, number], pose: PuppetPose) => pup("you", YOU, at, pose);

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

const PRINTER_AT: [number, number, number] = [0.25, 0.75, -1.2];
type HomeExtra = { out?: number; poster?: number; posterStop?: number; blink?: boolean; boxed?: boolean };
const HomeSet: React.FC<{ camera: CameraShot; f: number; night?: boolean } & HomeExtra> = ({ camera, f, night = false, out, poster, posterStop, blink, boxed }) => (
  <Room camera={camera} mood={night ? "night" : "warm"} floor={night ? "#1c2433" : "#8a5a3a"} wall={night ? "#2b3a6b" : "#f4a261"} stripe={night ? "#3d4f8a" : "#ffd23f"} width={7} depth={5} wallPattern="wallpaper" floorPattern="wood" sun={night ? undefined : { x: -1.6, color: "#ffe6a8", bars: 4 }}>
    <Window position={[-1.4, 1.5, -2.45]} sky={night ? "#0b1230" : undefined} />
    <Desk position={[0, 0, -1.2]} size={[1.5, 0.75, 0.7]} color="#c9a26b" />
    {boxed ? <PrinterBox position={[0.2, 0.75, -1.2]} /> : <Printer position={PRINTER_AT} f={f} out={out} poster={poster} posterStop={posterStop} blink={blink} sticker />}
    <Lamp position={[-0.55, 0.75, -1.35]} on={night} />
    <Plant position={[1.6, 0, -2.0]} />
  </Room>
);

const StoreSet: React.FC<{ camera: CameraShot; f: number; taken?: number; bait?: boolean }> = ({ camera, f, taken = 0, bait = false }) => (
  <Room camera={camera} mood="daylight" floor="#d8e0ea" wall="#2a9d8f" stripe="#ffffff" width={8} depth={5} wallPattern="panel" floorPattern="tile">
    <Label text="PRINTER INK" position={[0, 2.45, -2.43]} width={1.4} fg="#ffffff" bg="#1d4fa8" />
    <CartridgeShelf position={[0, 0, -2.1]} width={2.4} taken={taken} />
    {bait && (
      // The printer dangles on a fishing line like bait.
      <group position={[0, 0, -0.9]} rotation={[0, 0, Math.sin(f / 9) * 0.06]}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 1.6, 6]} />
          <meshBasicMaterial color="#161212" />
        </mesh>
        <mesh position={[0, 1.67, 0]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.06, 0.012, 8, 20, Math.PI * 1.3]} />
          <meshToonMaterial color="#9aa0a6" />
        </mesh>
        <Printer position={[0, 1.15, 0]} f={f} sticker />
        <Label text="$49" position={[0.38, 1.3, 0.05]} rotation={[0, 0, -0.2]} width={0.24} bg="#e0262f" fg="#ffffff" />
      </group>
    )}
  </Room>
);

const CASHIER_AT: [number, number] = [0.05, -1.6];
const CheckoutSet: React.FC<{ camera: CameraShot; total?: number; tags?: number }> = ({ camera, total, tags }) => (
  <Room camera={camera} mood="golden" floor="#7a5a2a" wall="#f2b630" stripe="#e0262f" width={8} depth={5} wallPattern="tile" floorPattern="tile">
    <Label text="CHECKOUT" position={[0, 2.4, -2.43]} width={1.3} fg="#ffffff" bg="#e0262f" />
    <Counter position={[0, 0, -1.0]} size={[1.8, 0.6, 0.6]} color="#2c3a40" top="#e8ecf0" />
    <Register position={[0.6, 0.6, -1.05]} total="$68.00" appear={total} count={total === undefined ? undefined : ramp(total, 0, 24)} />
    <Cartridge position={[-0.05, 0.6, -0.9]} color="#1d4fa8" scale={1.3} />
    <Cartridge position={[0.14, 0.6, -0.9]} color="#e0267a" scale={1.3} />
    {tags !== undefined && (
      <>
        <PrinterBox position={[-0.55, 0.6, -1.0]} />
        <Label text="$68" position={[0.05, 0.98, -0.88]} width={0.32} bg="#e0262f" fg="#ffffff" appear={tags} />
      </>
    )}
  </Room>
);

const WAITER_AT: [number, number] = [0.85, -0.85];
const GalaSet: React.FC<{ camera: CameraShot; f: number; pour?: number; tagAt?: number; drops?: number }> = ({ camera, f, pour = 1, tagAt, drops }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" stripe="#ffd23f" width={7} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    <Desk position={[0, 0, -1.0]} size={[1.4, 0.75, 0.6]} color="#fffdf4" />
    <Champagne position={[-0.42, 0.75, -1.05]} />
    <Flute position={[-0.2, 0.75, -0.95]} fill={1} liquid="#f2cf6b" />
    <Flute position={[0.25, 0.75, -0.95]} fill={pour} liquid="#1d4fa8" />
    <Label text="CHAMPAGNE" position={[-0.32, 1.3, -1.1]} width={0.46} bg="#f2cf6b" />
    {tagAt !== undefined && <Label text={"INK\n$13 / OZ"} position={[0.27, 1.38, -1.1]} width={0.46} bg="#1d4fa8" fg="#ffffff" appear={f - tagAt} count={ramp(f, tagAt, tagAt + 20)} />}
    {drops !== undefined &&
      drops >= 0 &&
      Array.from({ length: 10 }, (_, i) => {
        const a = -0.9 + (i / 9) * 1.8;
        const k = Math.min(drops, 24);
        return <mesh key={i} position={[WAITER_AT[0] - 0.1 + Math.sin(a) * 0.02 * k, 1.0 + 0.02 * k - 0.0012 * k * k, WAITER_AT[1] + 0.15 + Math.cos(a) * 0.012 * k]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshToonMaterial color="#1d4fa8" />
        </mesh>;
      })}
  </Room>
);

const BIG_CART: [number, number, number] = [0, 0.35, -1.6];
const ChipSet: React.FC<{ camera: CameraShot; f: number; chipAt: number; checkAt?: number }> = ({ camera, f, chipAt, checkAt }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete" sun={{ x: 1.4, color: "#8fb3ff", bars: 8 }}>
    <Cartridge position={BIG_CART} scale={7} chip={f >= chipAt ? 1 : 0} />
    <Label text="CHIP" position={[0, 0.98, -1.2]} width={0.42} bg="#ffd23f" appear={f - chipAt} />
    {checkAt !== undefined && <Screen position={[0, 2.15, -2.4]} size={[1.0, 0.45]} text={f >= checkAt + 18 ? "CHIP CHECK\nOK" : "CHIP CHECK\n..."} glow="#5ad1ff" bg="#071226" appear={f - checkAt} />}
  </Room>
);

const UpdateSet: React.FC<{ camera: CameraShot; f: number; screen: string; appear?: number; eject?: number }> = ({ camera, f, screen, appear, eject }) => {
  const e = eject === undefined || eject < 0 ? 0 : eject;
  return (
    <Room camera={camera} mood="alarm" floor="#2a0a0a" wall="#b3202a" stripe="#ffd23f" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
      <Screen position={[0, 2.05, -2.4]} size={[1.2, 0.55]} text={screen} glow={screen.includes("REJECTED") ? "#ff5a4a" : "#ffd23f"} bg="#140404" appear={appear} />
      <Desk position={[0, 0, -1.3]} size={[1.2, 0.7, 0.6]} color="#3a3f45" />
      <Printer position={[0, 0.7, -1.3]} f={f} lid={e > 0 ? 1 : 0} />
      {e > 0 && <Cartridge position={[0.05 + e * 0.012, 0.95 + Math.min(e, 30) * 0.045 - Math.min(e, 30) ** 2 * 0.0011, -1.3 + e * 0.01]} rotation={[e * 0.3, 0, e * 0.2]} color="#e0267a" scale={1.3} />}
    </Room>
  );
};

const TESTER_AT: [number, number] = [0.45, -0.55];
const TANKS_AT: [number, number, number] = [-0.95, 0, -1.6];
const LabSet: React.FC<{ camera: CameraShot; f: number; spray?: number; level?: number; shareAt?: number; out?: number }> = ({ camera, f, spray, level = 0, shareAt, out }) => (
  <Room camera={camera} mood="office" floor="#d8e0ea" wall="#3fae5a" stripe="#ffffff" width={7} depth={5} wallPattern="tile" floorPattern="tile" sun={{ x: 1.6, color: "#ffffff", bars: 5 }}>
    <Label text="INK TEST LAB" position={[0.3, 2.4, -2.43]} width={1.2} fg="#14301c" bg="#ffffff" />
    <Desk position={[0.1, 0, -1.2]} size={[1.2, 0.65, 0.7]} color="#e8ecf0" />
    <Printer position={[0.1, 0.65, -1.2]} f={f} spray={spray} out={out} />
    <InkTanks position={TANKS_AT} level={level} />
    {shareAt !== undefined && <Label text="20-30%" position={[TANKS_AT[0] - 0.32, 1.25, TANKS_AT[2] + 0.2]} width={0.42} bg="#ffd23f" appear={f - shareAt} />}
  </Room>
);

const BOSS_AT: [number, number] = [0, -1.8];
const TvSet: React.FC<{ camera: CameraShot; f: number; airAt?: number; rig?: boolean }> = ({ camera, f, airAt = -99, rig = false }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" stripe="#ffffff" width={7} depth={5} wallPattern="panel" floorPattern="wood">
    <Label text="ON AIR" position={[0.85, 2.3, -2.43]} width={0.8} fg="#ffffff" bg="#e0262f" appear={f - airAt} />
    <Screen position={[-0.75, 1.9, -2.4]} size={[0.8, 0.45]} text="LIVE" glow="#ff9ad5" bg="#14062b" />
    <Desk position={[0, 0, -1.3]} size={[1.4, 0.6, 0.6]} color="#1d1a1a" />
    {rig && <TvCamera position={[-0.55, 0, 0.6]} />}
  </Room>
);

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number };
const home = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: HomeExtra & { night?: boolean } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground(extra.night ? "night" : "warm")} camera={camera} puppets={puppets} {...grade} set={<HomeSet camera={camera} f={f} {...extra} />} />
);
const store = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { taken?: number; bait?: boolean } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} {...grade} set={<StoreSet camera={camera} f={f} {...extra} />} />
);
const checkout = (camera: CameraShot, puppets: PuppetPlacement[], extra: { total?: number; tags?: number } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} {...grade} set={<CheckoutSet camera={camera} {...extra} />} />
);
const gala = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { pour?: number; tagAt?: number; drops?: number } = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<GalaSet camera={camera} f={f} {...extra} />} />
);
const chip = (camera: CameraShot, f: number, chipAt: number, checkAt?: number) => (
  <Stage bg={moodBackground("cold")} camera={camera} set={<ChipSet camera={camera} f={f} chipAt={chipAt} checkAt={checkAt} />} />
);
const update = (camera: CameraShot, f: number, screen: string, extra: { appear?: number; eject?: number } = {}) => (
  <Stage bg={moodBackground("alarm")} camera={camera} set={<UpdateSet camera={camera} f={f} screen={screen} {...extra} />} />
);
const lab = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { spray?: number; level?: number; shareAt?: number; out?: number } = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<LabSet camera={camera} f={f} {...extra} />} />
);
const tv = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { airAt?: number; rig?: boolean } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} {...grade} set={<TvSet camera={camera} f={f} {...extra} />} />
);

const YOU_HOME: [number, number] = [-0.3, -0.45];

// ---------- shots ----------

// Hook: the boxed printer with its $49 tag and the STARTER INK sticker (the seed); you bounce in, thrilled.
const Hook: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.2, 1.6], [-0.25, 1.15, 1.3], f / 44), target: [-0.05, 0.95, -1.2], fov: 46 };
  return home(cam, f, [you(YOU_HOME, { expression: "excited", armL: [150, -25], armR: [150, -25], bob: -Math.abs(Math.sin(f / 2.5)) * 14 })], { boxed: true });
};

const Steal: React.FC = () => {
  const f = useShotFrame();
  return home(medium(-0.1, -1.0, f / 54, -0.4), f, [you(YOU_HOME, { expression: "smug", armR: [40, -70], lookX: 0.8, headTilt: 6, bob: breathe(f) })], { out: ramp(f, 10, 40) });
};

// Top-down: pages slide out of the printer.
const Pages: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.27, 2.1, -0.95], [0.27, 1.85, -0.97], f / 52), target: [0.25, 0.75, -1.05], fov: 44 };
  return home(cam, f, [], { out: (f % 17) / 17 });
};

// Gag: the cat poster shoots out and smacks you in the face.
const Poster: React.FC = () => {
  const f = useShotFrame();
  const hit = f >= 5;
  const cam: CameraShot = { position: lerp3([-0.35, 1.2, 1.5], [-0.3, 1.18, 1.3], f / 33), target: [0.2, 0.95, -0.6], fov: 46 };
  return home(cam, f, [you([0.25, -0.2], { view: "front", expression: hit ? "shocked" : "excited", armL: hit ? [150, -20] : [30, -40], armR: hit ? [150, -20] : [30, -40], bob: hit && f < 12 ? -12 : 0 })], { poster: f, posterStop: 1.06 });
};

const NightBlink: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.25, 1.4, 1.8], [-0.2, 1.35, 1.45], (f + 8) / 66), target: [0.0, 0.95, -1.2], fov: 46 };
  return home(cam, f, [you(YOU_HOME, { expression: "skeptical", lookX: 0.8, bob: breathe(f) })], { night: true, blink: f >= 14 });
};

// Macro: the red light and its LOW INK sign.
const LowInk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.2, 0.0], [0.3, 1.18, -0.2], f / 43), target: [0.27, 1.05, -1.2], fov: 40 };
  return home(cam, f, [], { night: true, blink: true });
};

// The store aisle: you walk along the ink shelf.
const Aisle: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 40, [-1.6, -1.2], [-0.2, -1.2]);
  const cam: CameraShot = { position: lerp3([-0.6, 1.35, 2.2], [-0.45, 1.3, 1.85], (f + 8) / 65), target: [-0.3, 1.0, -1.6], fov: 46 };
  return store(cam, f, [you(w.at, { expression: "smug", ...w.pose })]);
};

const Grab: React.FC = () => {
  const f = useShotFrame();
  const reach = Easing.out(Easing.back(1.4))(ramp(f, 4, 16));
  return store(close(-0.2, -1.2, f / 45, 0.25), f, [you([-0.2, -1.2], { expression: "smug", armR: [interpolate(reach, [0, 1], [10, 120]), interpolate(reach, [0, 1], [0, -40])], lookX: -0.4, bob: breathe(f) })], { taken: f >= 14 ? 2 : 0 }, { blur: 6 });
};

// Over your shoulder: the cashier names the total; the register counts it up behind.
const Cashier: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "cashier", useFinalFrame());
  const cam: CameraShot = { position: lerp3([-0.55, 1.55, 1.7], [-0.5, 1.52, 1.5], (f + 8) / 52), target: [0.3, 1.05, -1.5], fov: 34 };
  return checkout(cam, [
    you([-0.45, 0.2], { view: "back", expression: "neutral" }),
    pup("cashier", CASHIER, CASHIER_AT, { expression: "excited", lookX: -0.6, armL: [40, -60], mouthOpen: talking ? talk(f) : 0, bob: breathe(f) }),
  ], { total: f - 16 });
};

// Twist: you stare at the total and your arms drop.
const Shock: React.FC = () => {
  const f = useShotFrame();
  return checkout(close(-0.45, -0.3, f / 47, 0.2), [you([-0.45, -0.3], { expression: "shocked", armL: f < 6 ? [150, -20] : [5, 0], armR: f < 6 ? [150, -20] : [5, 0], headTilt: -8, bob: f >= 6 && f < 12 ? -10 : 0 })], {}, { blur: 7, truth: ramp(f, 0, 20) * 0.4 });
};

// Low angle across the counter: $49 printer next to $68 of ink.
const Tags: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.35, 0.8, 1.4], [-0.32, 0.78, 1.2], f / 64), target: [-0.3, 0.98, -1.0], fov: 46 };
  return checkout(cam, [], { tags: f - 26 });
};

const NotProduct: React.FC = () => {
  const f = useShotFrame();
  return checkout(medium(-0.2, -0.3, (f + 8) / 63, -0.3), [
    you([-0.45, -0.3], { expression: "skeptical", lookX: 0.6, headTilt: 6, bob: breathe(f) }),
    pup("cashier", CASHIER, CASHIER_AT, { expression: "smug", lookX: -0.6, bob: breathe(f + 4) }),
  ]);
};

// The printer dangles on a fishing hook: bait.
const Bait: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.0, 1.4], [0.0, 1.05, 1.0], (f + 8) / 36), target: [0, 1.45, -0.9], fov: 46 };
  return store(cam, f, [], { bait: true });
};

const InkPrice: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.05, 1.35, 1.5], [0.0, 1.3, 1.2], (f + 8) / 71), target: [0.0, 1.1, -1.0], fov: 44 };
  return gala(cam, f, [], { pour: 0, tagAt: 41 });
};

const Pour: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 1.0], [0.25, 1.28, 0.8], f / 51), target: [0.5, 1.0, -0.95], fov: 46 };
  return gala(cam, f, [pup("waiter", WAITER, WAITER_AT, { expression: "smug", armL: [80, -30], lookX: -0.8, bob: breathe(f) })], { pour: ramp(f, 6, 36), tagAt: -99 });
};

// Gag: the waiter sips the ink and sprays it out.
const Sip: React.FC = () => {
  const f = useShotFrame();
  const spit = f >= 26;
  return gala(medium(0.5, -0.9, f / 59, -0.35), f, [pup("waiter", WAITER, WAITER_AT, { expression: spit ? "shocked" : "smug", armR: spit ? [150, -20] : [40, -95], armL: spit ? [150, -20] : [20, 0], blink: !spit && f > 10, bob: spit && f < 32 ? -10 : 0 })], {
    pour: 0.6,
    tagAt: -99,
    drops: f - 26,
  });
};

const Chip: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.1, 0.6], [0.35, 1.05, 0.35], (f + 8) / 50), target: [0.1, 0.95, -1.4], fov: 44 };
  return chip(cam, f, 14);
};

const ChipTalk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.4, 1.6], [0.0, 1.45, 1.25], f / 56), target: [0, 1.4, -1.8], fov: 46 };
  return chip(cam, f, -99, 4);
};

const Update: React.FC = () => {
  const f = useShotFrame();
  const pct = Math.min(100, Math.round(ramp(f, 0, 36) * 100));
  const cam: CameraShot = { position: lerp3([0.1, 1.6, 1.2], [0.05, 1.65, 0.9], (f + 8) / 51), target: [0, 1.6, -2.0], fov: 44 };
  return update(cam, f, `UPDATE\n${pct}%`);
};

// The update lands: REJECTED, and the cheaper cartridge springs out of the printer.
const Rejected: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.45, 1.4], [-0.25, 1.4, 1.1], f / 65), target: [0, 1.35, -1.6], fov: 46 };
  return update(cam, f, "CARTRIDGE\nREJECTED", { appear: f - 4, eject: f - 6 });
};

const LabWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.4, 1.9], [0.15, 1.38, 1.6], (f + 8) / 43), target: [0.2, 0.95, -1.2], fov: 44 };
  return lab(cam, f, [pup("tester", TESTER, TESTER_AT, { expression: "neutral", armL: [40, -60], lookX: -0.8, bob: breathe(f) })]);
};

// Gag: the cleaning cycle sprays ink all over the tester.
const Spray: React.FC = () => {
  const f = useShotFrame();
  const spray = ramp(f, 8, 24);
  const hit = f >= 20;
  const cam: CameraShot = { position: lerp3([0.0, 1.2, 1.4], [0.05, 1.18, 1.15], f / 63), target: [0.35, 0.95, -1.0], fov: 44 };
  return lab(cam, f, [pup("tester", TESTER, TESTER_AT, { expression: hit ? "shocked" : "neutral", armL: hit ? [150, -20] : [40, -60], armR: hit ? [150, -20] : [10, 0], lookX: -0.8, bob: hit && f < 28 ? -10 : 0 })], { spray: spray * 1.6 });
};

const Tanks: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.95, 1.2, 0.8], [-0.95, 1.15, 0.5], f / 48), target: [-0.95, 0.75, -1.6], fov: 44 };
  return lab(cam, f, [], { level: ramp(f, 2, 40) });
};

const TesterSad: React.FC = () => {
  const f = useShotFrame();
  return lab(close(TESTER_AT[0], TESTER_AT[1], f / 42, -0.25), f, [pup("tester", TESTER, TESTER_AT, { expression: "skeptical", lookX: -1, headTilt: -8, blink: f > 20 && f < 24 })], { level: 1 });
};

const Share: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.15, 1.25, 0.4], [-1.15, 1.22, 0.15], f / 53), target: [-1.15, 0.85, -1.6], fov: 44 };
  return lab(cam, f, [], { level: 1, shareAt: 22 });
};

const Paper: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.12, 1.9, -0.6], [0.12, 1.7, -0.65], f / 54), target: [0.1, 0.65, -0.95], fov: 44 };
  return lab(cam, f, [], { level: 1, out: ramp(f, 4, 30) });
};

const Studio: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.25, 1.55, 2.6], [-0.2, 1.5, 2.25], (f + 8) / 74), target: [0, 1.1, -1.6], fov: 46 };
  return tv(cam, f, [pup("boss", BOSS, BOSS_AT, { expression: "smug", armL: [30, -40], armR: [30, -40], bob: breathe(f) })], { airAt: 10, rig: true });
};

const BossTalk: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "boss", useFinalFrame());
  return tv(close(BOSS_AT[0], BOSS_AT[1], f / 70, -0.2), f, [pup("boss", BOSS, BOSS_AT, { expression: "smug", headTilt: 6, lookX: 0.3, mouthOpen: talking ? talk(f) : 0, armR: [70, 40] })], {}, { blur: 7 });
};

// Low angle on the boss: "investment".
const BossLow: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "boss", useFinalFrame());
  const cam: CameraShot = { position: lerp3([0.35, 0.6, 0.4], [0.3, 0.62, 0.2], f / 38), target: [0, 1.2, -1.8], fov: 46 };
  return tv(cam, f, [pup("boss", BOSS, BOSS_AT, { expression: "excited", armL: [150, -25], armR: [150, -25], mouthOpen: talking ? talk(f) : 0 })]);
};

const HomeNight: React.FC = () => {
  const f = useShotFrame();
  return home(medium(-0.2, -0.9, (f + 8) / 58, -0.35), f, [you(YOU_HOME, { expression: "skeptical", lookX: 0.8, bob: breathe(f) })], { night: true });
};

const Investment: React.FC = () => {
  const f = useShotFrame();
  return home(close(YOU_HOME[0], YOU_HOME[1], f / 29, -0.2), f, [you(YOU_HOME, { expression: "shocked", lookX: 0.4, headTilt: -6 })], { night: true }, { blur: 7 });
};

const BlinkAgain: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.25, 1.4, 1.8], [-0.2, 1.35, 1.5], f / 53), target: [0.0, 0.95, -1.2], fov: 46 };
  return home(cam, f, [you(YOU_HOME, { expression: f < 20 ? "neutral" : "shocked", lookX: 0.8, armL: f >= 20 ? [150, -20] : [10, 0], armR: f >= 20 ? [150, -20] : [10, 0] })], { night: true, blink: f >= 14 });
};

const LoopMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.2, 0.0], [0.3, 1.18, -0.25], f / 58), target: [0.27, 1.05, -1.2], fov: 40 };
  return home(cam, f, [], { night: true, blink: true });
};

const SHOTS: Shot[] = [
  [0, 44, Hook, false],
  [44, 98, Steal, false],
  [98, 150, Pages, false],
  [150, 183, Poster, false],
  [183, 241, NightBlink, true],
  [241, 284, LowInk, false],
  [284, 341, Aisle, true],
  [341, 386, Grab, false],
  [386, 430, Cashier, true],
  [430, 477, Shock, false],
  [477, 541, Tags, false],
  [541, 604, NotProduct, false],
  [604, 632, Bait, true],
  [632, 695, InkPrice, true],
  [695, 746, Pour, false],
  [746, 805, Sip, false],
  [805, 847, Chip, true],
  [847, 903, ChipTalk, false],
  [903, 946, Update, true],
  [946, 1011, Rejected, false],
  [1011, 1046, LabWide, true],
  [1046, 1109, Spray, false],
  [1109, 1157, Tanks, false],
  [1157, 1199, TesterSad, false],
  [1199, 1252, Share, false],
  [1252, 1306, Paper, false],
  [1306, 1372, Studio, true],
  [1372, 1442, BossTalk, false],
  [1442, 1480, BossLow, false],
  [1480, 1530, HomeNight, true],
  [1530, 1559, Investment, false],
  [1559, 1612, BlinkAgain, false],
  [1612, TIMING.totalFrames, LoopMacro, false],
];

// ---------- sound ----------

const blinks = (from: number, to: number, first = 0): Sfx[] =>
  Array.from({ length: Math.ceil((to - from - first) / 12) }, (_, k) => ({ at: from + first + k * 12, src: sfx("tick"), volume: 0.35 }));

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.12, until: 183 },
  { at: 2, src: sfx("pop"), volume: 0.4 },
  { at: 54, src: sfx("reel-spin"), volume: 0.2, until: 84 },
  { at: 98, src: sfx("reel-spin"), volume: 0.25, until: 150 },
  ...[98, 115, 132].map((at) => ({ at, src: sfx("paper"), volume: 0.35 })),
  { at: 150, src: sfx("whoosh"), volume: 0.5 },
  { at: 162, src: sfx("boom"), volume: 0.45 },
  { at: 163, src: sfx("paper"), volume: 0.5 },
  ...blinks(183, 284, 14),
  { at: 284, src: sfx("ambience"), volume: 0.16, until: 386 },
  { at: 357, src: sfx("card"), volume: 0.4 },
  { at: 386, src: sfx("credit-blip"), volume: 0.35 },
  { at: 392, src: sfx("credit-blip"), volume: 0.35 },
  // The twist: the total hits on "sixty-eight".
  { at: 372, src: sfx("riser"), volume: 0.22 },
  { at: 402, src: sfx("sting"), volume: 0.4 },
  { at: 402, src: sfx("bill-whirr"), volume: 0.3 },
  { at: 436, src: sfx("boom"), volume: 0.3 },
  { at: 503, src: sfx("pop"), volume: 0.5 },
  { at: 604, src: sfx("whoosh"), volume: 0.3 },
  { at: 632, src: sfx("ambience"), volume: 0.14, until: 805 },
  { at: 673, src: sfx("pop"), volume: 0.5 },
  { at: 701, src: sfx("drawer"), volume: 0.2 },
  { at: 772, src: sfx("boom"), volume: 0.35 },
  { at: 773, src: sfx("near-miss"), volume: 0.35 },
  { at: 805, src: sfx("hum"), volume: 0.15, until: 903 },
  { at: 819, src: sfx("chime"), volume: 0.35 },
  { at: 819, src: sfx("pop"), volume: 0.4 },
  { at: 851, src: sfx("credit-blip"), volume: 0.3 },
  { at: 869, src: sfx("chime"), volume: 0.3 },
  { at: 903, src: sfx("hum"), volume: 0.18, until: 1011 },
  ...Array.from({ length: 9 }, (_, k) => ({ at: 905 + k * 4, src: sfx("tick"), volume: 0.35 })),
  { at: 950, src: sfx("stamp"), volume: 0.6 },
  { at: 952, src: sfx("boom"), volume: 0.4 },
  { at: 953, src: sfx("whoosh"), volume: 0.35 },
  { at: 1011, src: sfx("hum"), volume: 0.1, until: 1306 },
  { at: 1054, src: sfx("whoosh"), volume: 0.4 },
  { at: 1066, src: sfx("boom"), volume: 0.35 },
  { at: 1111, src: sfx("reel-spin"), volume: 0.15, until: 1150 },
  { at: 1221, src: sfx("pop"), volume: 0.5 },
  { at: 1256, src: sfx("paper"), volume: 0.4 },
  { at: 1316, src: sfx("pop"), volume: 0.45 },
  { at: 1480, src: sfx("ambience"), volume: 0.1, until: TIMING.totalFrames },
  ...blinks(1559, TIMING.totalFrames, 14),
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 386, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: 386, to: 632, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 632, to: 805, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 805, to: 1306, volume: 0.28 },
  { src: MUSIC_FILES.mystery, from: 1306, to: 1480, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 1480, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
