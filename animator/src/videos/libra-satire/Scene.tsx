import React from "react";
import { Easing } from "remotion";
import {
  breathe,
  CameraShot,
  Chair,
  Door,
  Halo,
  Label,
  Lamp,
  lerp3,
  LightPool,
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
  stroll,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import { Balloon, BigScale, CarInterior, Dial, FlyingMenu, ListBook, RoundTable, Sofa, TakeoutBag, tiltWobble, Tray, YesCoin } from "./props";
import TIMING_JSON from "./timing.json";

// "Your Libra Friend Cannot Pick a Restaurant" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "libra-satire";
export const timing = TIMING;

// ---------- cast ----------

const NINA: PuppetLook = { skin: "#f6dcc4", hair: "#e8c15a", outfit: "#f7b2d0", pattern: "#ffffff", long: true };
const KATE: PuppetLook = { skin: "#e9b48a", hair: "#2a1a14", outfit: "#e0262f", long: true };
const TARA: PuppetLook = { skin: "#8d5a3b", hair: "#1d1a1a", outfit: "#3ccf6e", glasses: true, long: true };
const WAITRESS: PuppetLook = { skin: "#f3d2b3", hair: "#a0442a", outfit: "#ffffff", lanyard: "#1d1a1a", long: true };

const PHONE_R = { item: "phone", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
const HANDS_HIPS = { armL: [40, -100] as [number, number], armR: [40, -100] as [number, number] };
// Both hands under the rim of the tray, at waist height (TRAY_Y).
const TRAY_ARMS = { armL: [25, 75] as [number, number], armR: [25, 75] as [number, number] };
const TRAY_Y = 0.55;
const TRAY_DZ = 0.25; // in front of the billboard, which is drawn slightly toward the camera
const SIT = { sit: true } as const;

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.02, d = 1.85): CameraShot => ({
  position: lerp3([px + dx, y, pz + d], [px + dx * 0.8, y - 0.02, pz + d - 0.25], p),
  target: [px, y - 0.12, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// Parked car: grey car park, the LIBRA sign on the wall behind.
const CAR: Vec3 = [0, 0, -1.0];
const KATE_CAR: [number, number] = [CAR[0] - 0.42, CAR[2] - 0.35];
const NINA_CAR: [number, number] = [CAR[0] + 0.42, CAR[2] - 0.35];
const TARA_CAR: [number, number] = [CAR[0], CAR[2] - 1.0];
const CLOCK: Vec3 = [0.05, 0.92, CAR[2] + 0.33];
const CarSet: React.FC<{ camera: CameraShot; f: number; badge?: number; clock?: number; name?: number; traits?: number; conflict?: number; wheel?: number }> = ({
  camera,
  badge,
  clock,
  name,
  traits,
  conflict,
  wheel = 0,
}) => (
  <Room camera={camera} mood="office" floor="#5a6470" wall="#8a96a3" stripe="#f2c14e" width={9} depth={6} wallPattern="panel" floorPattern="concrete">
    {badge !== undefined && <ZodiacBadge sign="libra" position={[-0.8, 2.45, -2.92]} size={0.7} bg="#f7b2d0" fg="#7b2cbf" appear={badge} />}
    {badge !== undefined && <Label text="LIBRA" position={[0.75, 2.45, -2.94]} width={1.1} fg="#ffffff" bg="#7b2cbf" appear={badge - 4} />}
    <Label text="P" position={[2.4, 2.1, -2.9]} width={0.4} fg="#ffffff" bg="#2f6bff" />
    <CarInterior position={CAR} wheelTurn={wheel} />
    {clock !== undefined && <Screen position={CLOCK} rotation={[-0.4, 0, 0]} size={[0.36, 0.22]} text={"MINUTE\n40"} glow="#4dff9a" bg="#14102a" appear={clock} />}
    {name !== undefined && <Label text="NINA" position={[NINA_CAR[0] + 0.12, 1.58, NINA_CAR[1] - 0.2]} width={0.55} fg="#ffffff" bg="#e0447a" appear={name} />}
    {traits !== undefined &&
      ["CHARMING", "FAIR"].map((t, i) => (
        <Label key={t} text={t} position={[NINA_CAR[0] + 0.12, 1.36 - i * 0.2, NINA_CAR[1] - 0.2]} width={0.6} fg="#7b2cbf" bg="#ffffff" appear={traits - i * 12} />
      ))}
    {conflict !== undefined && <Label text={"ALLERGIC TO\nCONFLICT"} position={[NINA_CAR[0] - 0.08, 1.45, NINA_CAR[1] - 0.2]} width={0.65} fg="#ffffff" bg="#e04646" appear={conflict} />}
    <Lamp position={[0, 2.7, -1.0]} color="#e6f0ff" />
  </Room>
);

// Group chat: a green room, a wall-sized phone.
const NINA_CHAT: [number, number] = [-0.7, -1.4];
const TARA_CHAT: [number, number] = [0.75, -1.4];
const IDEAS: [string, Vec3, string][] = [
  ["TACOS", [-1.0, 2.1, -2.0], "#ffd23f"],
  ["PIZZA", [-0.2, 2.3, -2.0], "#ff8fc8"],
  ["SUSHI", [-1.2, 1.6, -1.9], "#7fd3ff"],
  ["CURRY", [-0.15, 1.75, -1.9], "#ffb347"],
];
const ChatSet: React.FC<{ camera: CameraShot; f: number; ideas?: number; poll?: number; tie?: number }> = ({ camera, ideas, poll, tie }) => (
  <Room camera={camera} mood="daylight" floor="#1f5a3a" wall="#3ccf6e" stripe="#ffffff" width={8} depth={6} wallPattern="tile" floorPattern="carpet" sun={{ x: -1.6, color: "#e8fff0", bars: 4 }}>
    <Screen
      position={[0.45, 1.65, -2.85]}
      size={[1.1, 1.5]}
      text={poll !== undefined ? "TACOS 50%\nPIZZA 50%" : "GROUP\nCHAT"}
      glow="#ffffff"
      bg="#14302a"
      appear={poll ?? 99}
    />
    {ideas !== undefined &&
      IDEAS.map(([t, p, c], i) => (
        <group key={t} userData={{ ghost: true }}>
          <Label text={t} position={p} width={0.6} fg="#13235e" bg={c} appear={ideas - i * 6} />
          <Label text="LOVE" position={[p[0], p[1] - 0.2, p[2] + 0.02]} width={0.36} fg="#ffffff" bg="#e0447a" appear={ideas - i * 6 - 10} />
        </group>
      ))}
    {tie !== undefined && <Label text="PERFECT TIE" position={[0.45, 2.6, -2.8]} width={1.3} fg="#ffffff" bg="#7b2cbf" appear={tie} />}
    <Plant position={[-2.6, 0, -2.4]} />
    <Shelf position={[2.7, 0, -2.6]} width={0.9} rows={3} color="#1f5a3a" seed={2} />
  </Room>
);

// The list: cream study, a giant three-column notebook.
const BOOK: Vec3 = [0.1, 1.55, -2.7];
const NINA_BOOK: [number, number] = [-0.85, -1.6];
const BookSet: React.FC<{ camera: CameraShot; f: number; ticks?: number; heads?: number }> = ({ camera, ticks = 0, heads = 99 }) => (
  <Room camera={camera} mood="warm" floor="#c99a6b" wall="#fff1d0" stripe="#7fa8d8" width={8} depth={6} wallPattern="wallpaper" floorPattern="wood" sun={{ x: 1.8, color: "#fff2c0", bars: 4 }}>
    <ListBook position={BOOK} ticks={ticks} heads={heads} />
    <Window position={[-2.5, 1.7, -2.94]} size={[0.9, 1.1]} sky="#cfe9ff" />
    <Lamp position={[1.9, 2.4, -2.0]} color="#ffd27a" />
    <Plant position={[2.8, 0, -2.3]} />
  </Room>
);

// The restaurant with no menu: warm orange.
const TABLE: Vec3 = [0, 0, -1.3];
const NINA_T: [number, number] = [0.0, -1.95];
const KATE_T: [number, number] = [-0.68, -1.3];
const TARA_T: [number, number] = [0.68, -1.3];
const WAITRESS_T: [number, number] = [0.6, -0.45];
const RestaurantSet: React.FC<{ camera: CameraShot; f: number; coin?: "flat" | "edge" | "none"; nomenu?: number; winning?: number; bonk?: number }> = ({
  camera,
  coin = "flat",
  nomenu,
  winning,
  bonk,
}) => (
  <Room camera={camera} mood="warm" floor="#6b3a1f" wall="#f4842d" stripe="#ffd23f" width={9} depth={6} wallPattern="brick" floorPattern="wood" sun={{ x: 1.8, color: "#fff2c0", bars: 4 }}>
    <Label text={"NO\nMENU"} position={[-1.5, 1.9, -2.92]} width={0.75} fg="#ffffff" bg="#1d1a1a" appear={nomenu ?? 99} />
    {winning !== undefined && <Label text="WINNING" position={[0.0, 2.3, -2.9]} width={1.0} fg="#7b2cbf" bg="#ffd23f" appear={winning} />}
    {bonk !== undefined && <Label text="BONK!" position={[KATE_T[0] + 0.1, 1.25, KATE_T[1] + 0.1]} width={0.5} fg="#ffffff" bg="#e04646" appear={bonk} />}
    <Window position={[1.7, 1.7, -2.94]} size={[1.1, 1.0]} sky="#1b2a5e" />
    <RoundTable position={TABLE} coin={coin} />
    <Chair position={[KATE_T[0] - 0.05, 0, KATE_T[1]]} rotationY={Math.PI / 2} color="#7a1226" />
    <Chair position={[TARA_T[0] + 0.05, 0, TARA_T[1]]} rotationY={-Math.PI / 2} color="#7a1226" />
    <Chair position={[NINA_T[0], 0, NINA_T[1] - 0.05]} color="#7a1226" />
    <Lamp position={[0, 2.4, -1.3]} color="#ffd27a" />
    <Plant position={[-3.0, 0, -2.3]} />
  </Room>
);

// The kitchen door: white tile.
const KDOOR_X = 0.55;
const KitchenSet: React.FC<{ camera: CameraShot; f: number; door?: number; closed?: boolean }> = ({ camera, door = 0, closed }) => (
  <Room camera={camera} mood="daylight" floor="#e9e2d6" wall="#ffffff" stripe="#7fd3ff" width={8} depth={6} wallPattern="tile" floorPattern="tile">
    <Door position={[KDOOR_X, 0, -2.94]} open={door} color="#c9ced3" glow="#fff6d8" sign="KITCHEN" />
    <Label text={closed ? "CLOSED" : "OPEN"} position={[KDOOR_X - 0.95, 1.55, -2.9]} width={0.6} fg="#ffffff" bg={closed ? "#e04646" : "#3ccf6e"} />
    <Shelf position={[-2.4, 0, -2.6]} width={1.0} rows={3} color="#c9ced3" seed={5} />
    <Lamp position={[KDOOR_X, 2.5, -2.2]} color="#e8fff9" />
  </Room>
);

// Inside her head: a lilac hall with the scale, the dial and the coin.
const SCALE: Vec3 = [0, 0, -2.2];
const DIAL: Vec3 = [-2.2, 1.55, -2.9];
const COIN: Vec3 = [2.1, 1.15, -2.2];
const NINA_HEAD: [number, number] = [0.85, -1.2];
const ScaleSet: React.FC<{ camera: CameraShot; f: number; inside?: number; tilt?: number; decisions?: number; level?: number; please?: number; spin?: number }> = ({
  camera,
  inside,
  tilt = 0,
  decisions,
  level = 1,
  please,
  spin = 0,
}) => (
  <Room camera={camera} mood="dream" floor="#4a2a6a" wall="#b79ce8" stripe="#ffffff" width={9} depth={6} wallPattern="panel" floorPattern="wood">
    {inside !== undefined && <Label text="INSIDE NINA" position={[0, 2.75, -2.92]} width={1.4} fg="#ffffff" bg="#13235e" appear={inside} />}
    <ZodiacBadge sign="libra" position={[2.3, 2.5, -2.92]} size={0.5} bg="#f7b2d0" fg="#7b2cbf" />
    <BigScale position={SCALE} tilt={tilt} scale={0.9} />
    {decisions !== undefined && <Label text="DECISIONS" position={[0, 1.45, SCALE[2] + 0.12]} width={0.85} fg="#ffffff" bg="#7b2cbf" appear={decisions} />}
    <Dial position={DIAL} level={level} size={0.5} />
    {please !== undefined && <Label text={"PLEASE\nEVERYONE"} position={[DIAL[0], DIAL[1] + 0.82, DIAL[2] + 0.02]} width={0.8} fg="#ffffff" bg="#e0447a" appear={please} />}
    <group>
      <YesCoin position={COIN} spin={spin} size={0.35} />
    </group>
    <Label text="LUCKY COIN" position={[COIN[0], COIN[1] - 0.6, COIN[2] + 0.05]} width={0.7} fg="#7a5a10" bg="#f2d16b" />
  </Room>
);

// Nina's sofa at night: deep blue, TV glow.
const NINA_SOFA: [number, number] = [-0.38, -1.62];
const KATE_SOFA: [number, number] = [0.42, -1.62];
const SofaSet: React.FC<{ camera: CameraShot; f: number; party?: number; bags?: boolean }> = ({ camera, f, party, bags }) => (
  <Room camera={camera} mood="night" floor="#1a2340" wall="#1b2a5e" stripe="#7fd3ff" width={8} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <group userData={{ ghost: true }}>
      <Sofa position={[0, 0, -2.05]} color="#5b7fb8" />
    </group>
    <Halo position={[2.2, 1.2, -2.6]} size={1.8} color="#7fd3ff" strength={0.45 + Math.sin(f / 3) * 0.05} />
    <Window position={[-2.3, 1.7, -2.94]} size={[0.9, 1.1]} sky="#0a1430" blinds />
    {party !== undefined && <Label text="HAPPY BIRTHDAY" position={[0, 2.25, -2.9]} width={1.6} fg="#ffffff" bg="#e0447a" appear={party} />}
    {party !== undefined && <Balloon position={[1.3, 0, -2.2]} color="#ff8fc8" f={f} />}
    {party !== undefined && <Balloon position={[-1.35, 0, -2.3]} color="#ffd23f" f={f + 7} />}
    {bags && <TakeoutBag position={[-1.2, 0, -1.6]} fries />}
    {bags && <TakeoutBag position={[-1.55, 0, -1.55]} />}
    <Lamp position={[-1.6, 2.5, -2.2]} on={false} />
  </Room>
);

// Front door: yellow; the delivery.
const COURIER: [number, number] = [0.05, -2.0];
const NINA_DOOR: [number, number] = [-0.5, -1.0];
const DoorSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera }) => (
  <Room camera={camera} mood="daylight" floor="#c99a6b" wall="#ffd23f" stripe="#ffffff" width={8} depth={6} wallPattern="plaster" floorPattern="wood">
    <Door position={[0.05, 0, -2.94]} open={0.9} color="#e76f51" glow="#1b2a5e" />
    <Plant position={[-1.5, 0, -2.5]} />
    <Label text="HOME" position={[1.3, 2.0, -2.92]} width={0.6} fg="#ffffff" bg="#e76f51" />
    <LightPool x={0.05} z={-2.5} color="#ffe6a8" strength={0.25} />
  </Room>
);

// ---------- stage wrappers ----------

type Extra<T extends React.FC<any>> = Partial<React.ComponentProps<T>>;
const at = <T extends React.FC<any>>(Set: T, mood: Parameters<typeof moodBackground>[0]) =>
  (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<T> = {}, grade: Grade = {}, children?: React.ReactNode) => (
    <Stage
      bg={moodBackground(mood)}
      camera={camera}
      puppets={puppets}
      {...grade}
      set={
        <>
          {React.createElement(Set, { camera, f, ...extra })}
          {children}
        </>
      }
    />
  );
const car = at(CarSet, "office");
const chat = at(ChatSet, "daylight");
const book = at(BookSet, "warm");
const restaurant = at(RestaurantSet, "warm");
const kitchen = at(KitchenSet, "daylight");
const scales = at(ScaleSet, "dream");
const sofa = at(SofaSet, "night");
const door = at(DoorSet, "daylight");

// ---------- shots ----------

const carPups = (f: number, kate: Partial<PuppetPose> = {}, nina: Partial<PuppetPose> = {}): PuppetPlacement[] => [
  pup("kate", KATE, KATE_CAR, { ...SIT, expression: "skeptical", armL: [60, -40], armR: [60, -40], lookX: 0.6, bob: breathe(f), ...kate }),
  pup("nina", NINA, NINA_CAR, { ...SIT, expression: "excited", lookX: -0.4, bob: breathe(f + 5), ...nina }),
  pup("tara", TARA, TARA_CAR, { ...SIT, expression: "neutral", hold: PHONE_R, armR: HOLD, lookX: 0.2, bob: breathe(f + 9) }),
];

// Hook: minute forty in a parked car under the LIBRA sign.
const CarWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.9], [0.0, 1.35, 1.55], f / 50), target: [0.0, 1.25, -1.8], fov: 60 };
  return car(cam, f, carPups(f, {}, { headTilt: Math.sin(f / 5) * 10, lookX: Math.sin(f / 7) }), { badge: f + 20 });
};

// Macro: the dashboard says MINUTE 40; Kate's head drops onto the wheel.
const ClockMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.3, 0.6], [0.2, 1.25, 0.4], f / 39), target: [0.1, 0.95, -1.0], fov: 54 };
  return car(cam, f, carPups(f, { expression: "shocked", bob: -ramp(f, 14, 22) * 40, headTilt: ramp(f, 14, 22) * 20 }), { badge: 99, clock: f - 2 });
};

const NinaName: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.75, 1.15, 0.9], [0.72, 1.12, 0.7], f / 25), target: [0.6, 1.0, -1.4], fov: 46 };
  return car(cam, f, carPups(f, {}, { expression: "smug", headTilt: 8, lookX: 0.2 }), { name: f - 3 });
};

const Traits: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.65, 1.15, 0.8], [0.62, 1.15, 0.6], f / 36), target: [0.55, 1.05, -1.4], fov: 48 };
  return car(cam, f, carPups(f, {}, { expression: "excited", armL: [100 + Math.sin(f / 2) * 20, -30], headTilt: Math.sin(f / 4) * 6 }), { name: 99, traits: f });
};

// Kate and Tara argue; Nina shrinks into her seat.
const NoConflict: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.3, 1.3], [0.05, 1.3, 1.05], f / 37), target: [0.1, 1.05, -1.6], fov: 54 };
  return car(cam, f, [
    pup("kate", KATE, KATE_CAR, { ...SIT, expression: "shocked", armL: [120 + Math.sin(f) * 20, -40], armR: [40, -100], lookX: 1, headTilt: Math.sin(f / 2) * 6 }),
    pup("nina", NINA, NINA_CAR, { ...SIT, expression: "shocked", armL: [150, -150], armR: [150, -150], bob: -20 - ramp(f, 0, 10) * 15 }),
    pup("tara", TARA, TARA_CAR, { ...SIT, expression: "skeptical", armL: [120 + Math.cos(f) * 20, -40], lookX: -1 }),
  ], { conflict: f - 4 });
};

// She loves every idea equally.
const Ideas: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.45, 1.8], [-0.45, 1.45, 1.5], f / 48), target: [-0.5, 1.3, -2.0], fov: 56 };
  return chat(cam, f, [pup("nina", NINA, NINA_CHAT, { expression: "excited", armL: [120 + Math.sin(f / 2) * 15, -20], armR: [120 - Math.sin(f / 2) * 15, -20], headTilt: Math.sin(f / 4) * 8, bob: breathe(f) })], { ideas: f });
};

// The problem: Kate in the driver's seat, done.
const Problem: React.FC = () => {
  const f = useShotFrame();
  return car(close(KATE_CAR[0], KATE_CAR[1], f / 42, -0.25, 1.1, 1.95), f, carPups(f, { expression: "skeptical", armL: [40, -100], armR: [40, -100], lookX: 0.8, blink: f % 30 < 3 }), {}, {});
};

const KateClose: React.FC = () => {
  const f = useShotFrame();
  return car(close(KATE_CAR[0], KATE_CAR[1], f / 33, 0.3, 1.1, 1.9), f, carPups(f, { expression: "shocked", armL: [100, -20], armR: [100, -20], lookX: 1 }), {}, {});
};

// "Just pick one!": low angle, both arms up, Nina beaming.
const KateYell: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.15, 0.95], [-0.12, 1.12, 0.75], f / 42), target: [-0.15, 0.95, -1.4], fov: 54 };
  return car(cam, f, carPups(f, { expression: "shocked", ...ARMS_UP, headTilt: Math.sin(f / 2) * 8, lookX: 1 }, { expression: "excited", lookX: -0.8 }), { wheel: Math.sin(f / 2) * 0.3 });
};

const NinaBoth: React.FC = () => {
  const f = useShotFrame();
  return car(close(NINA_CAR[0], NINA_CAR[1], f / 46, -0.25, 1.1, 1.95), f, carPups(f, {}, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8, lookX: -0.6 }), {}, {});
};

// The list with three columns.
const BookWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.25, 1.45, 1.8], [-0.3, 1.45, 1.5], (f + 6) / 38), target: [-0.25, 1.3, -2.4], fov: 58 };
  return book(cam, f, [pup("nina", NINA, NINA_BOOK, { expression: "smug", armR: [130, -10], armL: [40, -100], lookX: 0.8, bob: breathe(f) })], { heads: f - 4, ticks: ramp(f, 10, 38) * 0.4 });
};

const Columns: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([BOOK[0] + 0.2, 1.6, 0.0], [BOOK[0] + 0.1, 1.6, -0.3], f / 40), target: [BOOK[0], 1.55, BOOK[2]], fov: 50 };
  return book(cam, f, [], { heads: 99, ticks: 0.4 + ramp(f, 0, 36) * 0.6 });
};

// The poll.
const ChatPoll: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.4, 1.9], [0.25, 1.4, 1.6], f / 44), target: [0.25, 1.25, -2.4], fov: 58 };
  return chat(cam, f, [
    pup("tara", TARA, TARA_CHAT, { expression: "excited", hold: PHONE_R, armR: HOLD, armL: [120, -30], lookX: -0.3, bob: breathe(f) }),
    pup("nina", NINA, [NINA_CHAT[0] + 0.3, NINA_CHAT[1]], { expression: "excited", lookX: 0.6, bob: breathe(f + 4) }),
  ], { poll: f - 6 });
};

// Macro: 50 / 50. PERFECT TIE.
const Tie: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.45, 2.0, -0.4], [0.45, 2.0, -0.65], f / 32), target: [0.45, 1.95, -2.85], fov: 52 };
  return chat(cam, f, [], { poll: 99, tie: f - 3 });
};

// The restaurant: they walk in; no menu anywhere.
const Arrive: React.FC = () => {
  const f = useShotFrame();
  const n = stroll(f, 0, 30, [1.9, -0.6], [0.75, -0.55]);
  const k = stroll(f, 4, 30, [2.4, -0.4], [1.25, -0.3]);
  const cam: CameraShot = { position: lerp3([0.2, 1.45, 2.4], [0.1, 1.45, 2.1], (f + 6) / 41), target: [0.45, 1.2, -1.6], fov: 58 };
  return restaurant(cam, f, [
    pup("nina", NINA, n.at, { expression: "neutral", ...n.pose }),
    pup("kate", KATE, k.at, { expression: "skeptical", ...k.pose }),
  ], { nomenu: f - 12 });
};

const NoMenu: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.2, 1.85, -0.6], [-1.3, 1.85, -0.85], f / 40), target: [-1.5, 1.85, -2.9], fov: 48 };
  return restaurant(cam, f, [], { nomenu: 99 });
};

const tablePups = (f: number, nina: Partial<PuppetPose> = {}, kate: Partial<PuppetPose> = {}, tara: Partial<PuppetPose> = {}): PuppetPlacement[] => [
  pup("nina", NINA, NINA_T, { ...SIT, expression: "smug", bob: breathe(f), ...nina }),
  pup("kate", KATE, KATE_T, { ...SIT, expression: "neutral", lookX: 0.6, bob: breathe(f + 4), ...kate }),
  pup("tara", TARA, TARA_T, { ...SIT, expression: "neutral", lookX: -0.6, bob: breathe(f + 8), ...tara }),
];

// Nina leans back. No choices, no fights.
const Relax: React.FC = () => {
  const f = useShotFrame();
  return restaurant(close(NINA_T[0], NINA_T[1], f / 37, 0.25, 1.05, 2.2), f, tablePups(f, { armL: [150, -150], armR: [150, -150], headTilt: -10, blink: f > 10 && f < 30 }), { nomenu: 99 }, {});
};

const NoFights: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 2.7, 1.3], [0.0, 2.6, 1.1], f / 38), target: [0.0, 0.6, -1.4], fov: 56 };
  return restaurant(cam, f, tablePups(f, { expression: "excited" }, { expression: "excited" }, { expression: "excited" }), { nomenu: 99 });
};

// Low angle: WINNING.
const Winning: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 0.55, 0.5], [0.1, 0.58, 0.25], f / 52), target: [0.0, 1.3, -1.9], fov: 56 };
  return restaurant(cam, f, tablePups(f, { expression: "excited", ...ARMS_UP }), { nomenu: 99, winning: f - 8 });
};

// The kitchen door swings; the waitress walks out with the tray.
const KitchenDoor: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 8, 34, [KDOOR_X, -2.6], [0.15, -1.4]);
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.6], [0.0, 1.35, 1.35], (f + 6) / 53), target: [0.25, 1.15, -2.2], fov: 56 };
  return kitchen(cam, f, [pup("waitress", WAITRESS, w.at, { expression: "smug", ...w.pose, ...TRAY_ARMS })], { door: Easing.out(Easing.back(2))(ramp(f, 0, 8)) }, {}, <Tray position={[w.at[0], TRAY_Y, w.at[1] + TRAY_DZ]} />);
};

const WaitressClose: React.FC = () => {
  const f = useShotFrame();
  return kitchen(close(0.15, -1.4, f / 33, -0.25, 0.9, 2.1), f, [pup("waitress", WAITRESS, [0.15, -1.4], { expression: "smug", ...TRAY_ARMS, headTilt: 8 })], {}, {}, <Tray position={[0.15, TRAY_Y, -1.4 + TRAY_DZ]} />);
};

// Macro: CHICKEN or FISH.
const ChickenFish: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 1.5, -0.25], [0.15, 1.45, -0.4], f / 34), target: [0.15, 0.6, -1.3], fov: 54 };
  return kitchen(cam, f, [pup("waitress", WAITRESS, [0.15, -1.4], { expression: "smug", ...TRAY_ARMS })], {}, {}, <Tray position={[0.15, TRAY_Y, -1.4 + TRAY_DZ]} labels={f - 2} lids={1 - ramp(f, 4, 12)} />);
};

// The whole table freezes.
const Freeze: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.45, 1.8], [0.2, 1.45, 1.95], f / 39), target: [0.2, 1.0, -1.4], fov: 58 };
  const frozen = { expression: "shocked" as const, blink: false, bob: 0 };
  return restaurant(cam, f, [
    ...tablePups(f, { ...frozen, armL: [150, -150], armR: [150, -150] }, { ...frozen, lookX: 1 }, { ...frozen, lookX: 1 }),
    pup("waitress", WAITRESS, WAITRESS_T, { expression: "smug", ...TRAY_ARMS }),
  ], { nomenu: 99 }, { truth: 0.5 }, <Tray position={[WAITRESS_T[0], TRAY_Y, WAITRESS_T[1] + TRAY_DZ]} />);
};

// Push into Nina's face, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 62));
  const cam: CameraShot = { position: lerp3([NINA_T[0] + 0.1, 0.95, 0.4], [NINA_T[0] + 0.02, 0.84, -1.65], p), target: [NINA_T[0], 0.8, NINA_T[1]], fov: 38 };
  return restaurant(cam, f, tablePups(f, { expression: "shocked", blink: false, bob: 0 }), { nomenu: 99 }, { truth: 0.4, flash: ramp(f, 56, 70) });
};

// Inside her head: the scale hall.
const ScaleWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.7, 2.6], [0.1, 1.65, 2.25], (f + 6) / 35), target: [0.0, 1.5, -2.0], fov: 60 };
  return scales(cam, f, [pup("nina", NINA, NINA_HEAD, { expression: "excited", ...ARMS_UP, bob: breathe(f) })], { inside: f - 4, tilt: tiltWobble(f + 20, 0.1) }, { flash: 1 - ramp(f, 0, 10) });
};

const ScaleLabel: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.4, 0.6], [-0.4, 1.4, 0.35], f / 50), target: [0.0, 1.4, -2.2], fov: 54 };
  return scales(cam, f, [pup("nina", NINA, NINA_HEAD, { expression: "smug", armR: [130, -10], lookX: -0.8 })], { decisions: f - 24, tilt: tiltWobble(f, 0.06, 20) });
};

// Low angle on the pans: perfectly level, trembling.
const Level: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 1.1, 1.2], [0.1, 1.1, 0.95], f / 36), target: [0.0, 1.55, -2.2], fov: 60 };
  return scales(cam, f, [], { tilt: Math.sin(f / 1.5) * 0.015 });
};

// Gag: the scale lurches and flings a menu; Nina ducks.
const MenuFling: React.FC = () => {
  const f = useShotFrame();
  const t = ramp(f, 4, 24);
  const cam: CameraShot = { position: lerp3([0.4, 1.5, 1.6], [0.35, 1.5, 1.35], f / 32), target: [0.3, 1.3, -2.0], fov: 58 };
  return scales(cam, f, [pup("nina", NINA, NINA_HEAD, { expression: "shocked", ...ARMS_UP, bob: f > 8 ? -25 : 0 })], { decisions: 99, tilt: tiltWobble(f, 0.45, 10) }, {}, (
    <FlyingMenu position={[-0.9 + t * 2.2, 1.7 + Math.sin(t * Math.PI) * 0.8 - t * 1.6, -2.2 + t * 1.4]} spin={t * 9} />
  ));
};

// The PLEASE EVERYONE dial.
const DialWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.4, 1.5, 0.8], [-1.55, 1.5, 0.55], f / 35), target: [-1.9, 1.4, -2.6], fov: 54 };
  return scales(cam, f, [pup("nina", NINA, [-1.3, -1.5], { expression: "excited", armL: [130, -10], lookX: -0.8, bob: breathe(f) })], { level: 0.6 + ramp(f, 4, 30) * 0.3 });
};

const PleaseEveryone: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([DIAL[0] + 0.2, 1.9, -1.0], [DIAL[0] + 0.15, 1.9, -1.2], f / 25), target: [DIAL[0], 1.8, DIAL[2]], fov: 50 };
  return scales(cam, f, [], { level: 0.9, please: f - 2 });
};

// Needle jammed at max, shaking; Nina's smile strained.
const MaxUp: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.6, 1.1, 0.4], [-1.65, 1.1, 0.15], f / 34), target: [-1.9, 1.35, -2.6], fov: 54 };
  return scales(cam, f, [pup("nina", NINA, [-1.3, -1.5], { expression: "excited", ...HANDS_HIPS, headTilt: Math.sin(f) * 4, lookX: -0.8 })], { level: 1.0 + Math.sin(f * 1.3) * 0.015, please: 99 });
};

// Macro: the lucky coin turns: YES ...
const CoinMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([COIN[0] - 0.2, 1.25, -0.9], [COIN[0] - 0.15, 1.22, -1.15], f / 36), target: [COIN[0], 1.15, COIN[2]], fov: 46 };
  return scales(cam, f, [], { spin: Math.sin(f / 8) * 0.4 });
};

// ... and YES on the back too.
const CoinOther: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([COIN[0] - 0.5, 1.3, -1.0], [COIN[0] - 0.45, 1.28, -1.2], f / 31), target: [COIN[0], 1.15, COIN[2]], fov: 46 };
  return scales(cam, f, [], { spin: Math.PI * Easing.inOut(Easing.cubic)(ramp(f, 0, 18)) });
};

// Back at the table: Nina flips the coin.
const Flip: React.FC = () => {
  const f = useShotFrame();
  const t = ramp(f, 4, 32);
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.4], [0.0, 1.35, 1.15], f / 37), target: [0.0, 1.15, -1.6], fov: 56 };
  return restaurant(cam, f, tablePups(f, { expression: "excited", armR: [120, -40] }, { lookX: 0.6, expression: "skeptical" }, { lookX: -0.6, expression: "skeptical" }), { coin: "none" }, {}, (
    <YesCoin position={[0.05, 0.75 + Math.sin(t * Math.PI) * 1.1, -1.5 + t * 0.25]} flip={t * 22} size={0.05} />
  ));
};

// Macro: it lands on its edge.
const Edge: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.05, -0.4], [0.35, 1.0, -0.55], f / 23), target: [0.05, 0.74, -1.25], fov: 46 };
  return restaurant(cam, f, tablePups(f), { coin: "edge" });
};

// Gag: Kate bangs her head on the table.
const KateHead: React.FC = () => {
  const f = useShotFrame();
  const hit = ramp(f, 2, 6);
  const cam: CameraShot = { position: lerp3([-0.2, 1.2, 0.5], [-0.25, 1.18, 0.35], f / 22), target: [KATE_T[0] + 0.1, 0.85, KATE_T[1]], fov: 52 };
  return restaurant(cam, f, tablePups(f, { expression: "shocked", ...ARMS_UP }, { expression: "shocked", headTilt: hit * 35, bob: -hit * 70, armL: [150, -150], armR: [150, -150] }), { coin: "edge", bonk: f - 6 }, {}, null);
};

// The waitress waits.
const WaitressWaits: React.FC = () => {
  const f = useShotFrame();
  return restaurant(close(WAITRESS_T[0], WAITRESS_T[1], f / 28, -0.3, 1.05, 1.9), f, [pup("waitress", WAITRESS, WAITRESS_T, { expression: "skeptical", ...HANDS_HIPS, bob: Math.abs(Math.sin(f / 3)) * 8, lookX: -0.8 })], { coin: "edge" }, { blur: 5 });
};

// The kitchen closes: the sign flips to CLOSED.
const Closed: React.FC = () => {
  const f = useShotFrame();
  const shut = f >= 10;
  const cam: CameraShot = { position: lerp3([-0.2, 1.5, 0.3], [-0.25, 1.5, 0.05], f / 30), target: [KDOOR_X - 0.5, 1.4, -2.9], fov: 52 };
  return kitchen(cam, f, [], { closed: shut, door: shut ? 0 : 0.4 * (1 - ramp(f, 0, 10)) }, { flash: shut ? 0.2 * (1 - ramp(f, 10, 16)) : 0 });
};

// Home on the sofa, hungry; phone in hand.
const SofaHungry: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 1.4], [0.0, 1.3, 1.15], (f + 6) / 43), target: [-0.2, 1.0, -1.9], fov: 56 };
  return sofa(cam, f, [pup("nina", NINA, NINA_SOFA, { ...SIT, expression: "skeptical", hold: PHONE_R, armR: HOLD, lookX: 0.4, bob: breathe(f) })], {}, { truth: 0.2 });
};

// Gag: the same waitress delivers both, plus extra fries.
const Delivery: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.35, 1.7], [-0.2, 1.35, 1.45], f / 40), target: [-0.2, 1.1, -2.0], fov: 58 };
  return door(cam, f, [
    pup("waitress", WAITRESS, COURIER, { expression: "smug", armL: [10, 0], armR: [10, 0] }),
    pup("nina", NINA, NINA_DOOR, { expression: "excited", ...ARMS_UP, bob: breathe(f) }),
  ], {}, {}, (
    <>
      <TakeoutBag position={[COURIER[0] - 0.21, 0.08, COURIER[1] + 0.08]} fries />
      <TakeoutBag position={[COURIER[0] + 0.21, 0.08, COURIER[1] + 0.08]} />
    </>
  ));
};

// Next week: birthday on the sofa; Kate asks.
const Birthday: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.4, 1.6], [0.0, 1.4, 1.3], (f + 6) / 46), target: [0.0, 1.15, -1.9], fov: 58 };
  return sofa(cam, f, [
    pup("nina", NINA, NINA_SOFA, { ...SIT, expression: "excited", armL: [120, -20], lookX: 0.5, bob: breathe(f) }),
    pup("kate", KATE, KATE_SOFA, { ...SIT, expression: "excited", armR: [140, -30], lookX: -0.5, bob: breathe(f + 5) }),
  ], { party: f - 4, bags: true });
};

const KateAsks: React.FC = () => {
  const f = useShotFrame();
  return sofa(close(KATE_SOFA[0], KATE_SOFA[1], f / 39, 0.25, 0.9, 1.95), f, [
    pup("kate", KATE, KATE_SOFA, { ...SIT, expression: "excited", armL: [100, -30], armR: [100, -30], lookX: -0.8, headTilt: -6 }),
  ], { party: 99, bags: true }, { blur: 5 });
};

// Loop: Nina freezes; the scale wobbles over her head.
const NinaFreeze: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.0, 0.0], [-0.3, 1.05, 0.4], f / 39), target: [NINA_SOFA[0], 0.95, NINA_SOFA[1]], fov: 44 };
  return sofa(cam, f, [pup("nina", NINA, NINA_SOFA, { ...SIT, expression: "shocked", blink: false, armL: [150, -150], armR: [150, -150] })], { party: 99, bags: true }, { truth: 0.4 }, (
    <group userData={{ ghost: true }}>
      <BigScale position={[NINA_SOFA[0], 1.05, NINA_SOFA[1]]} tilt={tiltWobble(f, 0.3, 14)} scale={0.17 * Easing.out(Easing.back(2))(ramp(f, 4, 12))} />
    </group>
  ));
};

const SHOTS: Shot[] = [
  [0, 50, CarWide, false],
  [50, 89, ClockMacro, false],
  [89, 114, NinaName, false],
  [114, 150, Traits, false],
  [150, 187, NoConflict, false],
  [187, 235, Ideas, true],
  [235, 277, Problem, false],
  [277, 310, KateClose, false],
  [310, 352, KateYell, false],
  [352, 402, NinaBoth, false],
  [402, 440, BookWide, true],
  [440, 480, Columns, false],
  [480, 524, ChatPoll, true],
  [524, 556, Tie, false],
  [556, 597, Arrive, true],
  [597, 637, NoMenu, false],
  [637, 674, Relax, false],
  [674, 712, NoFights, false],
  [712, 764, Winning, false],
  [764, 817, KitchenDoor, true],
  [817, 850, WaitressClose, false],
  [850, 884, ChickenFish, false],
  [884, 923, Freeze, false],
  [923, 994, HeadPush, false],
  [994, 1029, ScaleWide, true],
  [1029, 1079, ScaleLabel, false],
  [1079, 1115, Level, false],
  [1115, 1147, MenuFling, false],
  [1147, 1182, DialWide, false],
  [1182, 1207, PleaseEveryone, false],
  [1207, 1241, MaxUp, false],
  [1241, 1277, CoinMacro, false],
  [1277, 1308, CoinOther, false],
  [1308, 1345, Flip, true],
  [1345, 1368, Edge, false],
  [1368, 1390, KateHead, false],
  [1390, 1418, WaitressWaits, false],
  [1418, 1448, Closed, false],
  [1448, 1491, SofaHungry, true],
  [1491, 1531, Delivery, false],
  [1531, 1577, Birthday, true],
  [1577, 1616, KateAsks, false],
  [1616, TIMING.totalFrames, NinaFreeze, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  // One-shots sit on words; the gaps between words stay clear for the voice.
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 402 },
  { at: 4, src: sfx("chime"), volume: 0.1 },
  { at: 22, src: sfx("pop"), volume: 0.18 },
  { at: 54, src: sfx("credit-blip"), volume: 0.12 },
  { at: 67, src: sfx("boom"), volume: 0.12 },
  { at: 92, src: sfx("pop"), volume: 0.16 },
  ...[116, 128].map((at) => ({ at, src: sfx("pop"), volume: 0.13 })),
  { at: 156, src: sfx("pop"), volume: 0.15 },
  ...[190, 196, 202, 208].map((at) => ({ at, src: sfx("pop"), volume: 0.11 })),
  { at: 315, src: sfx("near-miss"), volume: 0.1 },
  { at: 402, src: sfx("hum"), volume: 0.025, until: 556 },
  ...[408, 414, 420].map((at) => ({ at, src: sfx("pop"), volume: 0.12 })),
  ...[445, 455, 465].map((at) => ({ at, src: sfx("paper"), volume: 0.1 })),
  { at: 487, src: sfx("credit-blip"), volume: 0.12 },
  { at: 528, src: sfx("chime"), volume: 0.12 },
  { at: 556, src: sfx("ambience"), volume: 0.03, until: 994 },
  { at: 600, src: sfx("pop"), volume: 0.15 },
  { at: 720, src: sfx("chime"), volume: 0.12 },
  // The twist: the kitchen door, the tray, the freeze.
  { at: 766, src: sfx("door"), volume: 0.22 },
  { at: 855, src: sfx("drawer"), volume: 0.14 },
  { at: 888, src: sfx("sting"), volume: 0.24 },
  { at: 955, src: sfx("whoosh"), volume: 0.13 },
  { at: 970, src: sfx("riser"), volume: 0.06 },
  { at: 994, src: sfx("hum"), volume: 0.03, until: 1308 },
  { at: 998, src: sfx("pop"), volume: 0.18 },
  { at: 1056, src: sfx("stamp"), volume: 0.16 },
  { at: 1122, src: sfx("whoosh"), volume: 0.14 },
  { at: 1134, src: sfx("paper"), volume: 0.14 },
  { at: 1186, src: sfx("pop"), volume: 0.16 },
  ...[1212, 1218, 1224].map((at) => ({ at, src: sfx("tick"), volume: 0.12 })),
  { at: 1268, src: sfx("chime"), volume: 0.11 },
  { at: 1308, src: sfx("ambience"), volume: 0.03, until: 1448 },
  { at: 1314, src: sfx("card"), volume: 0.16 },
  { at: 1350, src: sfx("reel-stop"), volume: 0.15 },
  { at: 1372, src: sfx("boom"), volume: 0.2 },
  { at: 1423, src: sfx("door"), volume: 0.2 },
  { at: 1495, src: sfx("button"), volume: 0.15 },
  { at: 1535, src: sfx("pop"), volume: 0.16 },
  { at: 1620, src: sfx("sting"), volume: 0.16 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 764, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 764, to: 923, volume: 0.14 },
  { src: MUSIC_FILES.mystery, from: 923, to: 1308, volume: 0.15 },
  { src: MUSIC_FILES.lounge, from: 1308, to: TIMING.totalFrames, volume: 0.13 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
