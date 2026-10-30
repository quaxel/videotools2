import React from "react";
import { Easing, interpolate } from "remotion";
import {
  Board,
  breathe,
  CameraShot,
  Chair,
  Counter,
  Desk,
  Door,
  InkBox,
  InkCylinder,
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
  stroll,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
} from "../../engine";
import { Balloon, Bed, CakeTable, ConstellationWall, Dial, Mug, panelX, Scales, Scissors, Scorpion, SpinningTop, StarChart, StarField, StarLamp, Tablet, Telescope } from "./props";
import TIMING_JSON from "./timing.json";

// "Your Libra Sign Is Secretly Wrong" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "libra-sign";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#b39ddb" };
const ASTRO: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#f7f7f2", lanyard: "#1d4fa8", glasses: true };
const FRIEND: PuppetLook = { skin: "#f6dcc4", hair: "#6b4423", outfit: "#e0262f", cap: "#ffd23f" };
const ROMAN: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#c0392b", cap: "#e8b04a", chain: "#e8b04a" };
const CLERK: PuppetLook = { skin: "#fffaf2", hair: "#1d1a1a", outfit: "#2a9d8f", lanyard: "#ffd23f" };
const ARTIST: PuppetLook = { skin: "#fbe9d6", hair: "#1d1a1a", outfit: "#1d1a1a", cap: "#e0262f", chain: "#c9ced3" };
const GUESTS: PuppetLook[] = [
  { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#f2b630", cap: "#4f7dff" },
  { skin: "#fbe9d6", hair: "#c0392b", outfit: "#2a9d8f" },
  { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#4f7dff", cap: "#ff4fd8" },
];

const MUG = { item: "cup", hand: "R" } as const;
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

// Bedroom: warm orange.
const PHONE_AT: Vec3 = [0.3, 0.5, -1.05];
const SCALES_AT: Vec3 = [1.15, 0.5, -2.2];
const BedroomSet: React.FC<{ camera: CameraShot; f: number; tilt?: number; libra?: number; scalesSign?: number }> = ({ camera, f, tilt = 0, libra, scalesSign }) => (
  <Room camera={camera} mood="warm" floor="#7a3e1e" wall="#f4a261" stripe="#e76f51" width={8} depth={6} wallPattern="wallpaper" floorPattern="wood" sun={{ x: -1.8, color: "#ffd27a", bars: 4 }}>
    <Bed position={[0, 0, -1.6]} />
    <Screen position={PHONE_AT} rotation={[-Math.PI / 2, 0, 0.15]} size={[0.32, 0.5]} text={"LIBRA\nPERFECTLY\nBALANCED"} glow="#ff8fc8" bg="#1a0f20" />
    <Label text="OCT 1" position={[0.3, 1.55, -2.94]} width={0.7} fg="#ffffff" bg="#d62828" />
    {libra !== undefined && <Label text="LIBRA" position={[-0.45, 1.85, -2.94]} width={0.8} fg="#ffffff" bg="#9b5de5" appear={libra} />}
    <InkBox size={[0.6, 0.5, 0.5]} position={[SCALES_AT[0], 0.25, SCALES_AT[2]]} color="#8a5a3a" />
    <Scales position={SCALES_AT} tilt={tilt} scale={0.55} />
    {scalesSign !== undefined && <Label text="THE SCALES" position={[SCALES_AT[0], 1.3, -2.94]} width={0.7} fg="#ffffff" bg="#264653" appear={scalesSign} />}
    <Lamp position={[-1.2, 1.5, -2.2]} color="#ffd27a" />
    <Window position={[2.4, 1.8, -2.94]} size={[1.2, 1.0]} sky="#ffb070" blinds />
    <Plant position={[-2.6, 0, -2.3]} />
  </Room>
);

// Gift shop: neon pink.
const SHOP_COUNTER_Z = -1.2;
const ShopSet: React.FC<{ camera: CameraShot; f: number; libraSign?: number }> = ({ camera, f, libraSign }) => (
  <Room camera={camera} mood="neon" floor="#3a1440" wall="#ff4fa3" stripe="#ffd23f" width={8} depth={6} wallPattern="panel" floorPattern="tile">
    <Screen position={[0, 2.3, -2.9]} size={[1.5, 0.5]} text="ZODIAC MUGS" glow={f % 24 < 12 ? "#ffd23f" : "#ffffff"} bg="#14062b" />
    <Shelf position={[-1.9, 0, -2.6]} width={1.2} rows={4} color="#6b1d5a" seed={3} />
    <Shelf position={[1.9, 0, -2.6]} width={1.2} rows={4} color="#6b1d5a" seed={9} />
    <Counter position={[0, 0, SHOP_COUNTER_Z]} size={[2.0, 0.6, 0.6]} color="#2a163f" top="#ff8fc8" />
    <Mug position={[-0.45, 0.6, SHOP_COUNTER_Z + 0.05]} text="LEO" color="#e76f51" />
    <Mug position={[0.2, 0.6, SHOP_COUNTER_Z + 0.05]} text="VIRGO" color="#3fae5a" />
    <Mug position={[0.55, 0.6, SHOP_COUNTER_Z + 0.05]} text="LIBRA" color="#9b5de5" />
    {libraSign !== undefined && <Label text="LIBRA" position={[-0.35, 1.75, -2.92]} width={0.6} fg="#ffffff" bg="#9b5de5" appear={libraSign} />}
  </Room>
);

// Tattoo parlour: night navy.
const TattooSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="night" floor="#1b2232" wall="#1b2a5e" stripe="#ff4fd8" width={7} depth={5} wallPattern="tile" floorPattern="concrete">
    <Screen position={[0, 1.85, -2.4]} size={[1.0, 0.4]} text="TATTOO" glow={f % 16 < 8 ? "#ff4fd8" : "#4dd2ff"} bg="#0a0a18" />
    <Board position={[-1.5, 1.5, -2.42]} cards={["LIBRA", "SCALES", "ROSE", "ANCHOR"]} width={1.0} height={0.7} color="#3a2a20" />
    <Chair position={[0, 0, -1.05]} color="#e0262f" />
    <Lamp position={[0.9, 1.6, -1.6]} color="#bfe6ff" />
  </Room>
);

// Rooftop at night: dream purple, stars on the sky wall.
const TELE_AT: Vec3 = [0.35, 0, -1.25];
const ASTRO_ROOF: [number, number] = [-0.1, -1.2];
const RooftopSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="dream" floor="#3a2450" wall="#2b0d45" width={10} depth={7} wallPattern="plain" floorPattern="concrete">
    <StarField z={-3.4} width={10} f={f} count={80} bottom={0.9} />
    <mesh position={[2.4, 2.6, -3.35]}>
      <sphereGeometry args={[0.3, 32, 24]} />
      <meshBasicMaterial color="#fff4c2" toneMapped={false} />
    </mesh>
    <InkBox size={[10, 0.6, 0.15]} position={[0, 0.3, -2.4]} color="#5a3a7a" />
    <Telescope position={TELE_AT} aim={0.7} />
    <Plant position={[-2.0, 0, -1.9]} />
  </Room>
);

// Party: golden yellow.
const DOOR_X = -2.0;
const CAKE_AT: Vec3 = [1.0, 0, -1.1];
const YOU_PARTY: [number, number] = [0.35, -0.85];
const FRIEND_AT: [number, number] = [-0.4, -0.9];
const ASTRO_PARTY: [number, number] = [-1.15, -0.95];
const PartySet: React.FC<{ camera: CameraShot; f: number; door?: number; cake?: number; chart?: [number, number]; scorpio?: number; mark?: number }> = ({ camera, f, door = 0, cake = 0, chart, scorpio, mark }) => (
  <Room camera={camera} mood="golden" floor="#7a4a1a" wall="#ffd23f" stripe="#ff8fc8" width={9} depth={6} wallPattern="panel" floorPattern="wood" sun={{ x: 1.8, color: "#ffe6a8", bars: 4 }}>
    <Label text="HAPPY BIRTHDAY" position={[0.4, 2.35, -2.92]} width={1.8} fg="#ffffff" bg="#ff4fa3" />
    <Door position={[DOOR_X, 0, -2.94]} open={door} color="#4f7dff" glow="#0b1a3a" />
    {[-0.8, -0.4, 1.6, 2.0, 2.4].map((x, i) => (
      <Balloon key={x} position={[x, 1.9 + (i % 2) * 0.2, -2.6]} color={["#ff4fa3", "#4f7dff", "#3fae5a", "#e0262f", "#9b5de5"][i]} f={f} seed={i} />
    ))}
    <CakeTable position={CAKE_AT} fall={cake} />
    {chart && <StarChart position={[chart[0], 0.68, chart[1] + 0.16]} width={0.42} text="SUN: VIRGO" mark={mark} />}
    {scorpio !== undefined && <Label text="SCORPIO" position={[FRIEND_AT[0] + 0.42, 1.4, FRIEND_AT[1] - 0.1]} width={0.45} fg="#ffffff" bg="#c0392b" appear={scorpio} />}
  </Room>
);

// Observatory: cold blue.
const TABLET_AT: Vec3 = [-0.1, 0.75, -1.5];
const TOP_AT: Vec3 = [1.9, 0, -1.3];
const ObservatorySet: React.FC<{ camera: CameraShot; f: number; calendar?: number; skySays?: number; years?: number; stamp?: number; stamped?: boolean; counter?: number; spin?: number; trail?: number }> = ({
  camera,
  f,
  calendar,
  skySays,
  years,
  stamp = 0,
  stamped,
  counter,
  spin = 0,
  trail = 0,
}) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={9} depth={6} wallPattern="tile" floorPattern="carpet" sun={{ x: -2.4, color: "#8fb3ff", bars: 8 }}>
    <Label text={"LIBRA SIGN\nSEP 23 - OCT 22"} position={[-1.9, 1.9, -2.92]} width={1.3} fg="#ffffff" bg="#9b5de5" appear={calendar} />
    <Screen position={[-0.1, 2.25, -2.9]} size={[1.2, 0.55]} text={skySays !== undefined && skySays >= 0 ? "SUN IN\nVIRGO" : "SUN IN\nLIBRA?"} glow={skySays !== undefined && skySays >= 0 ? "#ff5a5a" : "#4dff9a"} bg="#0a1020" />
    <Desk position={[TABLET_AT[0], 0, TABLET_AT[2]]} size={[1.2, 0.75, 0.7]} color="#d8e0ea" />
    <Tablet position={TABLET_AT} stamp={stamp} stamped={stamped} />
    {years !== undefined && <Label text={"OVER 2,000\nYEARS AGO"} position={[-1.0, 1.15, -2.92]} width={0.9} fg={"#13235e"} bg="#ffd23f" appear={years} count={ramp(years, 0, 24)} />}
    <SpinningTop position={TOP_AT} spin={spin} precess={spin / 9} trail={trail} />
    <Label text="EARTH" position={[TOP_AT[0], 1.3, TOP_AT[2] - 0.6]} width={0.6} fg="#ffffff" bg="#3fae5a" />
    <Screen position={[TOP_AT[0], 2.25, -2.9]} size={[1.1, 0.55]} text={counter !== undefined ? `${Math.round(counter * 26).toLocaleString("en-US")},000\nYEARS` : "WOBBLE"} glow="#ffd23f" bg="#0a1020" />
  </Room>
);

// Sky wall: office green.
const DIAL_AT: Vec3 = [-2.9, 1.95, -2.9];
const SkyWallSet: React.FC<{ camera: CameraShot; f: number; sunX: number; dial?: number; dates?: { i: number; text: string; appear?: number }[] }> = ({ camera, f, sunX, dial = 0, dates }) => (
  <Room camera={camera} mood="office" floor="#5f6f6a" wall="#4fbf7a" stripe="#ffffff" width={9} depth={6} wallPattern="plain" floorPattern="wood" sun={{ x: 2.6, color: "#ffffff", bars: 5 }}>
    <ConstellationWall position={[0.4, 1.95, -2.9]} sunX={sunX} f={f} dates={dates} />
    <Dial position={DIAL_AT} turn={dial} />
    <Label text="1 DEGREE" position={[DIAL_AT[0], 2.8, -2.92]} width={0.7} fg="#ffffff" bg="#d62828" />
    <Label text="72 YEARS" position={[DIAL_AT[0], 2.53, -2.92]} width={0.7} fg="#13235e" bg="#ffd23f" />
    <Plant position={[3.4, 0, -2.3]} />
  </Room>
);

// Museum: daylight, terracotta.
const SCORP_AT: Vec3 = [0, 0, -1.4];
const SCORP_S = 1.6;
const NORTH_AT: Vec3 = [-0.6, 2.05, -2.9];
const SOUTH_AT: Vec3 = [0.6, 2.05, -2.9];
const MuseumSet: React.FC<{ camera: CameraShot; f: number; cut?: number; claws?: number; scales?: number; north?: number; south?: number }> = ({ camera, f, cut = 0, claws, scales, north, south }) => (
  <Room camera={camera} mood="daylight" floor="#e9d8b8" wall="#c8553d" stripe="#ffffff" width={9} depth={6} wallPattern="brick" floorPattern="tile" sun={{ x: -2.0, color: "#fff6d8", bars: 3 }}>
    {[-2.6, 2.6].map((x) => (
      <InkCylinder key={x} radius={0.2} height={3.0} position={[x, 1.5, -2.5]} color="#f7f2e6" />
    ))}
    <Label text="GREEK SKY" position={[0, 2.5, -2.92]} width={1.1} fg="#13235e" bg="#f7f2e6" />
    <InkBox size={[2.2, 0.12, 1.6]} position={[SCORP_AT[0], 0.06, SCORP_AT[2]]} color="#f7f2e6" />
    <Scorpion position={[SCORP_AT[0], 0.12, SCORP_AT[2]]} cut={cut} f={f} scale={SCORP_S} />
    {claws !== undefined && (
      <>
        <Label text="CLAWS" position={[-0.32, 1.2, -0.3]} width={0.34} fg="#ffffff" bg="#d62828" appear={claws} />
        <Label text="CLAWS" position={[0.32, 1.2, -0.3]} width={0.34} fg="#ffffff" bg="#d62828" appear={claws - 4} />
      </>
    )}
    {scales !== undefined && scales >= 0 && (
      <group position={[0, 0, -0.35]} scale={Math.max(0.01, Easing.out(Easing.back(2))(Math.min(1, scales / 10)))}>
        <Scales position={[0, 0, 0]} tilt={Math.sin(scales / 5) * 0.15 * Math.exp(-scales / 30)} scale={0.9} />
        <Label text="LIBRA" position={[0, 1.02, 0]} width={0.5} fg="#ffffff" bg="#9b5de5" appear={scales - 4} />
      </group>
    )}
    <StarLamp position={NORTH_AT} f={f} />
    <StarLamp position={SOUTH_AT} f={f + 7} />
    {north !== undefined && <Label text={"NORTHERN\nCLAW"} position={[NORTH_AT[0], 1.5, -2.88]} width={0.7} fg="#ffffff" bg="#13235e" appear={north} />}
    {south !== undefined && <Label text={"SOUTHERN\nCLAW"} position={[SOUTH_AT[0], 1.5, -2.88]} width={0.7} fg="#ffffff" bg="#13235e" appear={south} />}
  </Room>
);

// ---------- stage wrappers ----------

const bedroom = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BedroomSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<BedroomSet camera={camera} f={f} {...extra} />} />
);
const shop = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { libraSign?: number } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} {...grade} set={<ShopSet camera={camera} f={f} {...extra} />} />
);
const tattoo = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} set={<TattooSet camera={camera} f={f} />} />
);
const rooftop = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<RooftopSet camera={camera} f={f} />} />
);
const party = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof PartySet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} {...grade} set={<PartySet camera={camera} f={f} {...extra} />} />
);
const observatory = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof ObservatorySet>> = {}, grade: Grade = {}, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} {...grade} set={<ObservatorySet camera={camera} f={f} {...extra} />} />
);
const skyWall = (camera: CameraShot, f: number, sunX: number, extra: { dial?: number; dates?: { i: number; text: string; appear?: number }[] } = {}, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<SkyWallSet camera={camera} f={f} sunX={sunX} {...extra} />} />
);
const museum = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof MuseumSet>> = {}, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<MuseumSet camera={camera} f={f} {...extra} />} />
);

const astroWithChart = (at: [number, number], f: number, extra: Partial<PuppetPose> = {}): PuppetPlacement =>
  pup("astronomer", ASTRO, at, { expression: "neutral", armL: HOLD, armR: HOLD, lookX: 0.5, bob: breathe(f), ...extra });

// ---------- shots ----------

// Top-down macro: the horoscope on the phone.
const PhoneTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PHONE_AT[0] + 0.02, 1.75, PHONE_AT[2] + 0.25], [PHONE_AT[0], 1.5, PHONE_AT[2] + 0.15], f / 50), target: [PHONE_AT[0], PHONE_AT[1], PHONE_AT[2]], fov: 44 };
  return bedroom(cam, f, []);
};

const BedYou: React.FC = () => {
  const f = useShotFrame();
  return bedroom(medium(-0.2, -0.55, f / 57, -0.3), f, [pup("you", YOU, [-0.3, -0.55], { sit: true, hold: PHONE, armR: HOLD, expression: f < 20 ? "neutral" : "excited", lookX: 0.4, headTilt: 6, bob: breathe(f) })]);
};

// You balance like a set of scales.
const LibraPose: React.FC = () => {
  const f = useShotFrame();
  const sway = Math.sin(f / 7);
  return bedroom(medium(-0.4, -0.4, f / 56, 0.3), f, [pup("you", YOU, [-0.4, -0.4], { expression: "smug", armL: [90 + sway * 20, 0], armR: [90 - sway * 20, 0], headTilt: sway * 10, bob: breathe(f) })], { libra: f - 10 });
};

const ScalesClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.95, 1.15, -0.3], [1.0, 1.12, -0.55], f / 40), target: [SCALES_AT[0], 1.0, SCALES_AT[2]], fov: 38 };
  return bedroom(cam, f, [], { tilt: Math.sin(f / 6) * 0.25, scalesSign: f - 6 }, { blur: 3 });
};

const MugBuy: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.3, 2.6], [-0.15, 1.25, 2.2], (f + 8) / 46), target: [0, 0.9, -1.0], fov: 42 };
  return shop(cam, f, [
    pup("you", YOU, [-0.45, -0.45], { hold: MUG, armR: [40, -60], expression: "excited", lookX: 0.6, bob: breathe(f) }),
    pup("clerk", CLERK, [0.45, -1.85], { expression: "smug", armL: [70, -30], lookX: -0.6, bob: breathe(f) }),
  ]);
};

// Gag: the needle buzzes and you leap out of the chair.
const Tattoo: React.FC = () => {
  const f = useShotFrame();
  const jump = f >= 25;
  const cam: CameraShot = { position: lerp3([0.2, 1.2, 2.2], [0.1, 1.15, 1.85], (f + 8) / 62), target: [0.15, 0.8, -0.9], fov: 42 };
  return tattoo(cam, f, [
    pup("you", YOU, [-0.05, jump ? -0.55 : -0.82], jump ? { expression: "shocked", ...ARMS_UP, headTilt: Math.sin(f) * 6 } : { sit: true, expression: "skeptical", armR: [60, -20], lookX: 1, bob: breathe(f) }),
    pup("artist", ARTIST, [0.6, -0.95], { expression: jump ? "shocked" : "smug", armL: [70 + Math.sin(f * 2) * 4, -40], lookX: -1 }),
  ]);
};

// Low angle: the astronomer at the telescope (the seed), waving.
const RooftopLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 0.35, 1.2], [-0.5, 0.38, 0.9], (f + 8) / 48), target: [0.05, 1.15, -1.2], fov: 48 };
  return rooftop(cam, f, [pup("astronomer", ASTRO, ASTRO_ROOF, { expression: "excited", armR: [150 + Math.sin(f / 2.5) * 18, -20], armL: [40, -60], lookX: -0.3 })]);
};

// Over the shoulder: your head small in the corner, the astronomer waving across the roof.
const RooftopOTS: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.25, 1.45, 2.6], [-1.2, 1.42, 2.35], f / 36), target: [0.0, 1.0, -1.2], fov: 30 };
  return rooftop(cam, f, [
    pup("you", YOU, [-0.95, 1.05], { view: "back", hold: MUG, expression: "neutral" }),
    pup("astronomer", ASTRO, ASTRO_ROOF, { expression: "excited", armR: [150 + Math.sin(f / 2.5) * 18, -20], lookX: -0.6 }),
  ]);
};

const guests = (f: number): PuppetPlacement[] => [
  pup("g0", GUESTS[0], [1.7, -2.0], { expression: "excited", armL: [150, -20], bob: breathe(f) }),
  pup("g1", GUESTS[1], [-1.4, -2.1], { expression: "excited", hold: { item: "drink", hand: "L" }, armL: HOLD, bob: breathe(f + 10) }),
  pup("g2", GUESTS[2], [0.5, -2.3], { expression: "smug", bob: breathe(f + 20) }),
];

const PartyWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.55, 3.6], [0.15, 1.45, 3.1], (f + 8) / 78), target: [0.1, 0.9, -1.2], fov: 46 };
  return party(cam, f, [
    ...guests(f),
    pup("you", YOU, YOU_PARTY, { hold: MUG, armR: HOLD, expression: "excited", armL: [120 + Math.sin(f / 3) * 15, -20], bob: breathe(f) }),
    pup("friend", FRIEND, FRIEND_AT, { expression: "excited", lookX: 0.8, bob: breathe(f + 5) }),
  ]);
};

const FriendShout: React.FC = () => {
  const f = useShotFrame();
  return party(close(FRIEND_AT[0], FRIEND_AT[1], f / 42, -0.25), f, [pup("friend", FRIEND, FRIEND_AT, { expression: "excited", ...ARMS_UP, lookX: 0.6, headTilt: Math.sin(f / 4) * 5 })], {}, { blur: 6 });
};

// The door opens; the astronomer walks in holding the star chart.
const DoorIn: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 8, 30, [DOOR_X, -2.6], ASTRO_PARTY);
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 2.4], [-0.75, 1.25, 2.1], f / 44), target: [-1.4, 0.95, -1.6], fov: 44 };
  return party(
    cam,
    f,
    [astroWithChart(w.at, f, { ...w.pose, armL: HOLD, armR: HOLD }), pup("friend", FRIEND, FRIEND_AT, { expression: f < 18 ? "excited" : "shocked", lookX: -1 })],
    { door: Easing.out(Easing.back(1.4))(ramp(f, 0, 12)), chart: w.at },
  );
};

// Gag: you spin round and the cake goes flying.
const CakeSmack: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.05, 1.9], [0.5, 1.0, 1.6], f / 43), target: [0.75, 0.72, -1.0], fov: 44 };
  return party(cam, f, [pup("you", YOU, YOU_PARTY, f < 8 ? { view: "side", facing: 1, hold: MUG, armR: HOLD, expression: "excited" } : { hold: MUG, armR: HOLD, armL: [100, 10], expression: "shocked", lookX: -1 })], { cake: ramp(f, 6, 18) });
};

const AstroSays: React.FC = () => {
  const f = useShotFrame();
  return party(close(ASTRO_PARTY[0], ASTRO_PARTY[1], f / 41, 0.25), f, [astroWithChart(ASTRO_PARTY, f, { lookX: 0.6 })], { chart: ASTRO_PARTY }, { blur: 5 });
};

// Macro on the chart: the sun circled in VIRGO.
const ChartMacro: React.FC = () => {
  const f = useShotFrame();
  const c: Vec3 = [ASTRO_PARTY[0], 0.68, ASTRO_PARTY[1] + 0.16];
  const cam: CameraShot = { position: lerp3([c[0] + 0.05, c[1] + 0.05, c[2] + 0.75], [c[0] + 0.03, c[1] + 0.03, c[2] + 0.55], f / 30), target: c, fov: 40 };
  return party(cam, f, [astroWithChart(ASTRO_PARTY, f)], { chart: ASTRO_PARTY, mark: Easing.out(Easing.back(2))(ramp(f, 12, 20)) });
};

const SignCalendar: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.75, 1.7, 0.8], [-1.9, 1.75, 0.2], (f + 8) / 78), target: [-1.9, 1.85, -2.9], fov: 44 };
  return observatory(cam, f, { calendar: f - 6 });
};

const SkySays: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.9, 0.9], [-0.3, 2.0, 0.3], f / 47), target: [-0.1, 2.15, -2.9], fov: 42 };
  return observatory(cam, f, { calendar: 99, skySays: f - 2 }, { truth: 0.3 + ramp(f, 2, 20) * 0.3 });
};

const TabletWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.6, 1.6], [0.0, 1.5, 1.2], f / 46), target: [-0.5, 1.1, -1.8], fov: 44 };
  return observatory(cam, f, { calendar: 99, years: f - 4 });
};

// Macro: the FIXED stamp comes down on the tablet.
const TabletStamp: React.FC = () => {
  const f = useShotFrame();
  const press = f < 11 ? ramp(f, 4, 11) : 1 - ramp(f, 14, 22);
  const cam: CameraShot = { position: lerp3([TABLET_AT[0] + 0.15, 1.85, TABLET_AT[2] + 1.0], [TABLET_AT[0] + 0.1, 1.7, TABLET_AT[2] + 0.85], f / 36), target: [TABLET_AT[0], TABLET_AT[1] + 0.1, TABLET_AT[2] + 0.05], fov: 42 };
  return observatory(cam, f, { calendar: 99, years: 99, stamp: Math.max(0.001, press), stamped: f >= 11 });
};

const Top: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([TOP_AT[0] - 0.6, 1.3, TOP_AT[2] + 2.2], [TOP_AT[0] - 0.4, 1.15, TOP_AT[2] + 1.8], (f + 8) / 70), target: [TOP_AT[0], 0.75, TOP_AT[2]], fov: 42 };
  return observatory(cam, f, { calendar: 99, spin: f * 0.6 });
};

const TopCounter: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([TOP_AT[0] + 0.3, 1.5, TOP_AT[2] + 2.6], [TOP_AT[0] + 0.2, 1.6, TOP_AT[2] + 2.2], f / 74), target: [TOP_AT[0], 1.35, TOP_AT[2] - 0.6], fov: 46 };
  return observatory(cam, f, { calendar: 99, spin: (f + 62) * 0.6, counter: Easing.out(Easing.cubic)(ramp(f, 2, 50)), trail: ramp(f, 0, 70) });
};

const sunAt = (i: number) => panelX(i) + 0.4;

const Dial72: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-2.3, 2.0, 0.4], [-2.5, 2.0, -0.1], (f + 8) / 55), target: [DIAL_AT[0], 2.2, -2.9], fov: 44 };
  return skyWall(cam, f, sunAt(2), { dial: Math.floor(f / 6) });
};

const WallShift: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.7, 2.6], [0.4, 1.7, 2.2], f / 35), target: [0.4, 1.6, -2.9], fov: 52 };
  return skyWall(cam, f, interpolate(Easing.inOut(Easing.cubic)(ramp(f, 4, 30)), [0, 1], [sunAt(2), sunAt(1)]), { dial: 8 });
};

const YouWall: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.05, 2.3], [-0.5, 1.08, 1.9], f / 47), target: [0.0, 1.3, -2.2], fov: 46 };
  return skyWall(cam, f, sunAt(1), { dial: 8 }, [pup("you", YOU, [-0.55, -0.4], { hold: MUG, armR: HOLD, expression: "shocked", lookX: 0.7, headTilt: -6, bob: breathe(f) })]);
};

const VirgoDates: React.FC = () => {
  const f = useShotFrame();
  const x = sunAt(1);
  const cam: CameraShot = { position: lerp3([x - 0.1, 2.0, -0.5], [x - 0.05, 2.0, -0.85], f / 56), target: [x, 2.1, -2.9], fov: 44 };
  return skyWall(cam, f, x, { dial: 8, dates: [{ i: 1, text: "SEP 16 - OCT 30", appear: f - 4 }] });
};

const SunSlides: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.9, 1.3], [1.0, 1.9, 0.9], f / 53), target: [0.95, 1.95, -2.9], fov: 46 };
  return skyWall(cam, f, interpolate(Easing.inOut(Easing.cubic)(ramp(f, 6, 40)), [0, 1], [sunAt(1), sunAt(2)]), { dial: 8, dates: [{ i: 1, text: "SEP 16 - OCT 30" }] });
};

// Macro: OCT 31 on the LIBRA panel.
const LibraOct31: React.FC = () => {
  const f = useShotFrame();
  const x = sunAt(2);
  const cam: CameraShot = { position: lerp3([x + 0.1, 2.2, -1.5], [x + 0.05, 2.2, -1.75], f / 31), target: [x, 2.25, -2.9], fov: 40 };
  return skyWall(cam, f, x, { dial: 8, dates: [{ i: 1, text: "SEP 16 - OCT 30" }, { i: 2, text: "OCT 31", appear: f - 2 }] });
};

const MuseumWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.9, 3.2], [0.5, 1.7, 2.6], (f + 8) / 77), target: [0, 0.9, -1.4], fov: 46 };
  return museum(cam, f);
};

const ClawsClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.4, 2.1], [-0.05, 1.3, 1.8], f / 62), target: [0, 0.8, -0.5], fov: 46 };
  return museum(cam, f, { claws: f - 14 });
};

const ROMAN_TO: [number, number] = [0.95, -0.15];
// Gag: the Roman snips both claws off with giant scissors; they drop and bounce.
const RomanSnip: React.FC = () => {
  const f = useShotFrame();
  const snip = f < 22 ? 0.9 : Math.max(0, 0.9 - ramp(f, 22, 27) * 0.9);
  const w = stroll(f, 0, 16, [2.4, 0.3], ROMAN_TO);
  const cut = f < 27 ? 0 : ramp(f, 27, 40);
  const cam: CameraShot = { position: lerp3([0.2, 1.4, 2.4], [0.3, 1.3, 2.0], f / 44), target: [0.6, 0.8, -0.6], fov: 46 };
  return (
    <Stage
      bg={moodBackground("daylight")}
      camera={cam}
      puppets={[pup("roman", ROMAN, w.at, { expression: f < 27 ? "smug" : "excited", armL: [80, -10], ...w.pose })]}
      set={
        <>
          <MuseumSet camera={cam} f={f} cut={cut} />
          {f >= 16 && <Scissors position={[w.at[0] - 0.42, 0.62, w.at[1] + 0.05]} rotation={[0, 0, Math.PI / 2]} open={snip} />}
        </>
      }
    />
  );
};

const ScalesPop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.3, 2.0], [0.05, 1.25, 1.7], f / 28), target: [0, 0.85, -0.4], fov: 44 };
  return museum(cam, f, { cut: 1, scales: f });
};

const StarNames: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.75, 1.0], [0, 1.8, 0.5], f / 57), target: [0, 1.8, -2.9], fov: 50 };
  return museum(cam, f, { cut: 1, scales: 99, north: f - 45 });
};

const SouthClaw: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.9, -0.6], [0.9, 1.9, -0.95], f / 35), target: [SOUTH_AT[0], 1.55, -2.9], fov: 42 };
  return museum(cam, f, { cut: 1, scales: 99, north: 99, south: f - 6 });
};

// The friend laughs: a Scorpio.
const FriendLaughs: React.FC = () => {
  const f = useShotFrame();
  const shake = Math.sin(f / 2);
  const cam: CameraShot = { position: lerp3([FRIEND_AT[0] + 0.1, 1.15, FRIEND_AT[1] + 2.4], [FRIEND_AT[0] + 0.15, 1.1, FRIEND_AT[1] + 2.0], (f + 8) / 76), target: [FRIEND_AT[0] + 0.2, 0.95, FRIEND_AT[1]], fov: 40 };
  return party(cam, f, [pup("friend", FRIEND, FRIEND_AT, { expression: "excited", mouthOpen: 0.4 + 0.3 * Math.abs(shake), armL: [30, -100], armR: [30, -100], headTilt: shake * 8 })], { cake: 1, scorpio: f - 36 });
};

const AstroActually: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([ASTRO_PARTY[0] + 0.45, 1.25, ASTRO_PARTY[1] + 3.6], [ASTRO_PARTY[0] + 0.43, 1.2, ASTRO_PARTY[1] + 3.2], f / 63), target: [ASTRO_PARTY[0] + 0.42, 0.85, ASTRO_PARTY[1]], fov: 40 };
  return party(
    cam,
    f,
    [astroWithChart(ASTRO_PARTY, f, { expression: "smug", lookX: 0.8 }), pup("friend", FRIEND, [ASTRO_PARTY[0] + 0.85, ASTRO_PARTY[1] + 0.1], { expression: f < 20 ? "excited" : "shocked", lookX: -1 })],
    { cake: 1, chart: ASTRO_PARTY },
  );
};

// Loop: the friend at the mug counter.
const FriendBuys: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.35, 2.6], [-0.3, 1.25, 2.0], (f + 8) / 91), target: [-0.1, 0.9, -1.0], fov: 42 };
  return shop(cam, f, [
    pup("friend", FRIEND, [-0.45, -0.45], { hold: MUG, armR: [40 + Math.sin(f / 4) * 8, -60], expression: "excited", lookX: 0.6, bob: breathe(f) }),
    pup("clerk", CLERK, [0.45, -1.85], { expression: "smug", armL: [150, -20], lookX: -0.6, bob: breathe(f) }),
  ], { libraSign: f - 30 });
};

const SHOTS: Shot[] = [
  [0, 50, PhoneTop, false],
  [50, 107, BedYou, false],
  [107, 163, LibraPose, false],
  [163, 203, ScalesClose, false],
  [203, 241, MugBuy, true],
  [241, 295, Tattoo, true],
  [295, 335, RooftopLow, true],
  [335, 371, RooftopOTS, false],
  [371, 441, PartyWide, true],
  [441, 483, FriendShout, false],
  [483, 527, DoorIn, false],
  [527, 570, CakeSmack, false],
  [570, 611, AstroSays, false],
  [611, 641, ChartMacro, false],
  [641, 711, SignCalendar, true],
  [711, 758, SkySays, false],
  [758, 804, TabletWide, false],
  [804, 840, TabletStamp, false],
  [840, 902, Top, false],
  [902, 976, TopCounter, false],
  [976, 1023, Dial72, true],
  [1023, 1058, WallShift, false],
  [1058, 1105, YouWall, false],
  [1105, 1161, VirgoDates, false],
  [1161, 1214, SunSlides, false],
  [1214, 1245, LibraOct31, false],
  [1245, 1314, MuseumWide, true],
  [1314, 1376, ClawsClose, false],
  [1376, 1420, RomanSnip, false],
  [1420, 1448, ScalesPop, false],
  [1448, 1505, StarNames, false],
  [1505, 1540, SouthClaw, false],
  [1540, 1608, FriendLaughs, true],
  [1608, 1671, AstroActually, false],
  [1671, TIMING.totalFrames, FriendBuys, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.12, until: 203 },
  { at: 4, src: sfx("chime"), volume: 0.4 },
  { at: 117, src: sfx("pop"), volume: 0.5 },
  ...[170, 182, 194].map((at) => ({ at, src: sfx("tick"), volume: 0.35 })),
  { at: 169, src: sfx("pop"), volume: 0.45 },
  { at: 212, src: sfx("drawer"), volume: 0.5 },
  { at: 226, src: sfx("credit-blip"), volume: 0.4 },
  { at: 241, src: sfx("hum"), volume: 0.25, until: 266 },
  { at: 266, src: sfx("boom"), volume: 0.35 },
  { at: 268, src: sfx("whoosh"), volume: 0.4 },
  { at: 295, src: sfx("ambience"), volume: 0.1, until: 371 },
  { at: 318, src: sfx("chime"), volume: 0.3 },
  { at: 371, src: sfx("ambience"), volume: 0.25, until: 527 },
  { at: 441, src: sfx("pop"), volume: 0.4 },
  { at: 484, src: sfx("door"), volume: 0.55 },
  // The twist: a riser into the cake crash and a sting on the astronomer's line.
  { at: 522, src: sfx("riser"), volume: 0.25 },
  { at: 533, src: sfx("whoosh"), volume: 0.4 },
  { at: 545, src: sfx("boom"), volume: 0.45 },
  { at: 570, src: sfx("sting"), volume: 0.4 },
  { at: 623, src: sfx("pop"), volume: 0.55 },
  { at: 641, src: sfx("hum"), volume: 0.1, until: 976 },
  { at: 647, src: sfx("pop"), volume: 0.5 },
  { at: 713, src: sfx("near-miss"), volume: 0.35 },
  { at: 762, src: sfx("pop"), volume: 0.45 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 764 + k * 3, src: sfx("tick"), volume: 0.3 })),
  { at: 815, src: sfx("stamp"), volume: 0.8 },
  { at: 840, src: sfx("reel-spin"), volume: 0.2, until: 976 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: 904 + k * 4, src: sfx("tick"), volume: 0.3 })),
  { at: 952, src: sfx("chime"), volume: 0.35 },
  ...Array.from({ length: 7 }, (_, k) => ({ at: 976 + k * 6, src: sfx("tick"), volume: 0.45 })),
  { at: 1027, src: sfx("whoosh"), volume: 0.4 },
  { at: 1109, src: sfx("pop"), volume: 0.5 },
  { at: 1167, src: sfx("whoosh"), volume: 0.4 },
  { at: 1216, src: sfx("pop"), volume: 0.55 },
  { at: 1218, src: sfx("chime"), volume: 0.3 },
  { at: 1245, src: sfx("ambience"), volume: 0.12, until: 1540 },
  { at: 1328, src: sfx("pop"), volume: 0.45 },
  { at: 1332, src: sfx("pop"), volume: 0.45 },
  ...[1380, 1386, 1392].map((at) => ({ at, src: sfx("paper"), volume: 0.25 })),
  { at: 1398, src: sfx("button"), volume: 0.7 },
  { at: 1403, src: sfx("stamp"), volume: 0.5 },
  { at: 1416, src: sfx("boom"), volume: 0.3 },
  { at: 1422, src: sfx("pop"), volume: 0.5 },
  { at: 1427, src: sfx("chime"), volume: 0.35 },
  { at: 1493, src: sfx("pop"), volume: 0.5 },
  { at: 1511, src: sfx("pop"), volume: 0.5 },
  { at: 1540, src: sfx("ambience"), volume: 0.22, until: 1671 },
  { at: 1576, src: sfx("pop"), volume: 0.5 },
  { at: 1680, src: sfx("drawer"), volume: 0.5 },
  { at: 1701, src: sfx("pop"), volume: 0.5 },
  { at: 1712, src: sfx("chime"), volume: 0.5 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 483, volume: 0.2 },
  { src: MUSIC_FILES.tension, from: 483, to: 976, volume: 0.28 },
  { src: MUSIC_FILES.mystery, from: 976, to: 1540, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 1540, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
