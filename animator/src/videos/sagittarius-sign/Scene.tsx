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
  stroll,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
  InkBox,
} from "../../engine";
import {
  Balloon,
  Bed,
  BlankCalendar,
  BowStand,
  BrunchTable,
  BusSeat,
  ClothesBurst,
  Compass,
  FlatPhone,
  FreezerShelves,
  Frost,
  GateDesk,
  Laptop,
  PartyCake,
  Passport,
  PeasBag,
  Suitcase,
  SyrupSpill,
  Tears,
  WorldMap,
} from "./props";
import TIMING_JSON from "./timing.json";

// "Your Sagittarius Friend Is Always Leaving" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "sagittarius-sign";
export const timing = TIMING;

// ---------- cast ----------

const LUNA: PuppetLook = { skin: "#e9b48a", hair: "#6b3a1f", outfit: "#7a9a3a", pattern: "#c9e27a", long: true };
const BEA: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#b79ce8", long: true };
const MAYA: PuppetLook = { skin: "#8d5a3b", hair: "#3a2418", outfit: "#ff6fa8", long: true };
const AGENT: PuppetLook = { skin: "#f3d2b3", hair: "#e8c15a", outfit: "#13235e", lanyard: "#ffd23f", long: true };

const PHONE_R = { item: "phone", hand: "R" } as const;
const BAG_R = { item: "briefcase", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
const HANDS_HIPS = { armL: [40, -100] as [number, number], armR: [40, -100] as [number, number] };
const SIT = { sit: true } as const;
const EYES_Y = 0.98; // standing puppet's eyes above the floor

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.02, d = 1.85): CameraShot => ({
  position: lerp3([px + dx, y, pz + d], [px + dx * 0.8, y - 0.02, pz + d - 0.25], p),
  target: [px, y - 0.12, pz],
  fov: 36,
});

type Grade = { truth?: number; flash?: number };

// ---------- locations ----------

// Brunch: pastel yellow café, the SAGITTARIUS sign on the wall.
const TABLE: Vec3 = [0, 0, -1.1];
const LUNA_B: [number, number] = [-0.66, -1.1];
const BEA_B: [number, number] = [0.66, -1.1];
const MAYA_B: [number, number] = [0.05, -1.75];
const PHONE_AT: Vec3 = [TABLE[0] + 0.18, 0.69, TABLE[2] + 0.12];
const BrunchSet: React.FC<{ camera: CameraShot; f: number; badge?: number; phone?: string; spill?: number; name?: number; traits?: number }> = ({
  camera,
  badge,
  phone,
  spill,
  name,
  traits,
}) => (
  <Room camera={camera} mood="warm" floor="#c99a6b" wall="#ffe28a" stripe="#ffffff" width={9} depth={6} wallPattern="wallpaper" floorPattern="wood" sun={{ x: 1.8, color: "#fff2c0", bars: 4 }}>
    {badge !== undefined && <ZodiacBadge sign="sagittarius" position={[-0.95, 2.45, -2.92]} size={0.7} bg="#7a9a3a" fg="#ffffff" appear={badge} />}
    {badge !== undefined && <Label text="SAGITTARIUS" position={[0.6, 2.45, -2.94]} width={1.6} fg="#ffffff" bg="#7b2cbf" appear={badge - 4} />}
    {name !== undefined && <Label text="LUNA" position={[-1.75, 1.95, -2.92]} width={0.6} fg="#ffffff" bg="#7a9a3a" appear={name} />}
    {traits !== undefined &&
      ["FUN", "FREE", "HONEST"].map((t, i) => (
        <Label key={t} text={t} position={[-0.4, 2.0 - i * 0.36, -2.9]} width={0.8} fg="#13235e" bg="#ffffff" appear={traits - i * 12} />
      ))}
    <Window position={[2.3, 1.6, -2.94]} size={[1.2, 1.0]} sky="#cfe9ff" />
    <Shelf position={[-2.9, 0, -2.6]} width={1.0} rows={3} color="#8a5a3a" seed={4} />
    <Plant position={[3.1, 0, -2.4]} />
    <Lamp position={[0, 2.35, -1.1]} color="#ffd27a" />
    <BrunchTable position={TABLE} bottle={spill === undefined} />
    {phone !== undefined && <FlatPhone position={PHONE_AT} text={phone} rotationY={0.3} />}
    {spill !== undefined && <SyrupSpill position={[PHONE_AT[0] - 0.12, 0.68, PHONE_AT[2]]} amount={spill} />}
    <Chair position={[LUNA_B[0] - 0.05, 0, LUNA_B[1] - 0.25]} rotationY={Math.PI / 2} color="#e76f51" />
    <Chair position={[BEA_B[0] + 0.05, 0, BEA_B[1] - 0.25]} rotationY={-Math.PI / 2} color="#e76f51" />
    <Chair position={[MAYA_B[0], 0, MAYA_B[1] - 0.05]} color="#e76f51" />
  </Room>
);

// Bedroom: turquoise; the bed, the packed suitcase, a laptop on the nightstand. `night` dims it.
const BED: Vec3 = [-1.0, 0, -2.2];
const SUITCASE: Vec3 = [1.05, 0, -2.3];
const NIGHTSTAND: Vec3 = [0.35, 0, -2.35];
const LUNA_ROOM: [number, number] = [0.3, -1.5];
const LUNA_BEDSIDE: [number, number] = [-0.5, -1.6];
const BedroomSet: React.FC<{ camera: CameraShot; f: number; packed?: number; boots?: number; night?: boolean; laptop?: string }> = ({ camera, packed, boots, night, laptop }) => (
  <Room
    camera={camera}
    mood={night ? "night" : "daylight"}
    floor={night ? "#1a3a40" : "#c99a6b"}
    wall={night ? "#14505a" : "#2a9d8f"}
    stripe="#ffffff"
    width={8}
    depth={6}
    wallPattern="wallpaper"
    floorPattern="wood"
    sun={night ? undefined : { x: 1.6, color: "#e8fff9", bars: 4 }}
  >
    <Bed position={BED} />
    <Suitcase position={SUITCASE} />
    {packed !== undefined && <Label text={"ALWAYS\nPACKED"} position={[SUITCASE[0], 1.12, SUITCASE[2] + 0.05]} width={0.55} fg="#ffffff" bg="#e76f51" appear={packed} />}
    {boots !== undefined && <Label text="HIKING BOOTS" position={[-0.35, 1.05, -1.9]} width={0.7} fg="#13235e" bg="#ffd23f" appear={boots} />}
    <group>
      <InkTable position={NIGHTSTAND} />
      {laptop !== undefined && <Laptop position={[NIGHTSTAND[0], 0.53, NIGHTSTAND[2] + 0.02]} text={laptop} />}
    </group>
    <Window position={[2.2, 1.7, -2.94]} size={[1.0, 1.1]} sky={night ? "#0a1430" : "#cfe9ff"} />
    {night && <Halo position={[NIGHTSTAND[0], 0.75, NIGHTSTAND[2] + 0.2]} size={0.9} color="#7fb8ff" strength={0.5} />}
    <Lamp position={[0, 2.6, -1.6]} on={!night} color="#e8fff9" />
  </Room>
);
// Nightstand: a box with a top slab standing proud of it.
const InkTable: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.45, 0.48, 0.38]} position={[0, 0.24, 0]} color="#8a5a3a" />
    <InkBox size={[0.5, 0.04, 0.42]} position={[0, 0.5, 0]} color="#a8744a" ink={0.003} />
  </group>
);

// Map wall: a brown study with a pinned world map.
const MAP: Vec3 = [0.1, 1.6, -2.88];
const LUNA_MAP: [number, number] = [-0.9, -1.5];
const MapSet: React.FC<{ camera: CameraShot; f: number; pins?: number; count?: number; dentists?: number }> = ({ camera, pins = 30, count, dentists }) => (
  <Room camera={camera} mood="warm" floor="#4a2a1a" wall="#8a5a3a" stripe="#f2c14e" width={8} depth={6} wallPattern="panel" floorPattern="wood">
    <WorldMap position={MAP} pins={pins} />
    {count !== undefined && <Screen position={[MAP[0], 2.62, -2.85]} size={[1.0, 0.32]} text="30 COUNTRIES" glow="#ffd23f" bg="#1a0d05" appear={count} />}
    {dentists !== undefined && <Label text={"DENTISTS\n0"} position={[1.75, 1.0, -2.85]} width={0.55} fg="#13235e" bg="#ffd23f" appear={dentists} />}
    <Shelf position={[-2.8, 0, -2.6]} width={0.9} rows={3} color="#4a2a1a" seed={7} />
    <Lamp position={[-1.0, 2.5, -2.0]} color="#ffd27a" />
  </Room>
);

// Goodbye party: pink, balloons, banner, cake.
const BEA_P: [number, number] = [-0.45, -1.45];
const MAYA_P: [number, number] = [0.4, -1.55];
const LUNA_P: [number, number] = [-1.25, -1.05];
const CAKE: Vec3 = [1.45, 0, -2.0];
const PartySet: React.FC<{ camera: CameraShot; f: number; banner?: string; eaten?: number }> = ({ camera, f, banner = "BON VOYAGE LUNA", eaten = 0 }) => (
  <Room camera={camera} mood="dream" floor="#8a3a5a" wall="#ff9ec4" stripe="#ffffff" width={9} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <Label text={banner} position={[0, 2.45, -2.92]} width={1.9} fg="#ffffff" bg="#e0447a" />
    {[
      [-2.3, "#ffd23f"],
      [-1.9, "#7fd3ff"],
      [2.3, "#3ccf6e"],
      [2.7, "#ffffff"],
    ].map(([x, c], i) => (
      <Balloon key={i} position={[x as number, 0, -2.5]} color={c as string} f={f + i * 5} />
    ))}
    <PartyCake position={CAKE} eaten={eaten} />
    <Lamp position={[0, 2.5, -1.5]} color="#ffd6ec" />
  </Room>
);

// Airport gate: white and blue, big window, the gate desk.
const DESK: Vec3 = [0.3, 0, -1.6];
const AGENT_AT: [number, number] = [1.2, -1.5];
const LUNA_G: [number, number] = [-0.65, -0.9];
const GateSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera }) => (
  <Room camera={camera} mood="daylight" floor="#d8e2ec" wall="#e6f4ff" stripe="#2f6bff" width={9} depth={6} wallPattern="panel" floorPattern="tile">
    <Window position={[-0.6, 1.7, -2.94]} size={[2.4, 1.3]} sky="#8fd0ff" />
    <GateDesk position={DESK} text={"GATE 7\nPERU"} />
    <Plant position={[-2.9, 0, -2.4]} />
    <Lamp position={[0.6, 2.6, -1.8]} color="#ffffff" />
  </Room>
);

// Inside the freezer: icy blue.
const FreezerSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="cold" floor="#cfe0f2" wall="#cfe9ff" stripe="#ffffff" width={4} depth={4} wallPattern="tile" floorPattern="tile">
    <FreezerShelves position={[0, 0, -1.4]} />
    <PeasBag position={[-0.15, 0.635, -1.25]} />
    <Passport position={[0.25, 0.635, -1.2]} rotationY={-0.25} />
    <Frost position={[0, 0, -1.2]} f={f} />
  </Room>
);

// Inside her head: a green room where every door says EXIT.
const BOW: Vec3 = [-1.75, 0, -1.25];
const BEA_E: [number, number] = [1.3, -1.3];
const BALLOON_E: Vec3 = [0.95, 0, -1.22];
const LUNA_E: [number, number] = [-0.55, -1.55];
const ExitSet: React.FC<{ camera: CameraShot; f: number; inside?: number; spin?: number; truth?: number; fly?: number; popped?: number; plans?: number }> = ({
  camera,
  f,
  inside,
  spin = 0,
  truth,
  fly = 0,
  popped = 0,
  plans,
}) => (
  <Room camera={camera} mood="daylight" floor="#1f5a3a" wall="#3f9a4a" stripe="#ffffff" width={9} depth={6} wallPattern="panel" floorPattern="wood">
    {inside !== undefined && <Label text="INSIDE LUNA" position={[0, 2.75, -2.92]} width={1.4} fg="#ffffff" bg="#13235e" appear={inside} />}
    {[-2.6, 0, 2.6].map((x) => (
      <Door key={x} position={[x, 0, -2.94]} color="#e6ecf2" glow="#fff6d8" sign="EXIT" />
    ))}
    <ZodiacBadge sign="sagittarius" position={[-3.6, 2.5, -2.92]} size={0.45} bg="#7a9a3a" fg="#ffffff" />
    <Compass position={[-1.3, 1.6, -2.9]} spin={spin} size={0.45} />
    <BlankCalendar position={[1.3, 1.6, -2.9]} />
    {plans !== undefined && <Label text="PLANS" position={[1.3, 1.99, -2.84]} width={0.5} fg="#ffffff" bg="#e0262f" border={false} appear={plans} />}
    <BowStand position={BOW} fly={fly} range={2.25} />
    {truth !== undefined && <Label text="TRUTH" position={[BOW[0], 1.68, BOW[2] + 0.05]} width={0.55} fg="#ffffff" bg="#e0262f" appear={truth} />}
    <Balloon position={BALLOON_E} color="#ff6fa8" f={f} popped={popped} />
  </Room>
);

// Night bus: dark with warm orange lights.
const SEAT_BUS: Vec3 = [0.55, 0, -1.9];
const LUNA_BUS: [number, number] = [0.55, -1.6];
const BusSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="night" floor="#2a1a10" wall="#3a1a0a" stripe="#ff8c42" width={6} depth={6} wallPattern="panel" floorPattern="concrete">
    {[-1.6, 0, 1.6].map((x) => (
      <Window key={x} position={[x, 1.55, -2.94]} size={[1.2, 0.7]} sky="#0a1430" />
    ))}
    {[-1.6, 0, 1.6].map((x, i) => (
      <Halo key={x} position={[x + ((f * 0.04 + i) % 1.2) - 0.6, 1.55, -2.9]} size={0.4} color="#ffb347" strength={0.6} />
    ))}
    <BusSeat position={SEAT_BUS} />
    <BusSeat position={[-0.55, 0, -1.9]} />
    <BusSeat position={[0.55, 0, -2.7]} />
    <BusSeat position={[-0.55, 0, -2.7]} />
    {[-1.0, 1.0].map((x) => (
      <Halo key={x} position={[x, 2.6, -1.5]} size={0.7} color="#ff8c42" strength={0.45} />
    ))}
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
const brunch = at(BrunchSet, "warm");
const bedroom = at(BedroomSet, "daylight");
const bedroomNight = at(BedroomSet, "night");
const mapRoom = at(MapSet, "warm");
const party = at(PartySet, "dream");
const gate = at(GateSet, "daylight");
const freezer = at(FreezerSet, "cold");
const exitRoom = at(ExitSet, "daylight");
const bus = at(BusSet, "night");

// ---------- shots ----------

const brunchPups = (f: number, luna: Partial<PuppetPose> = {}, bea: Partial<PuppetPose> = {}, maya: Partial<PuppetPose> = {}): PuppetPlacement[] => [
  pup("luna", LUNA, LUNA_B, { ...SIT, expression: "excited", lookX: 0.6, bob: breathe(f), ...luna }),
  pup("bea", BEA, BEA_B, { ...SIT, expression: "neutral", lookX: -0.6, bob: breathe(f + 6), ...bea }),
  pup("maya", MAYA, MAYA_B, { ...SIT, expression: "neutral", lookX: -0.3, bob: breathe(f + 11), ...maya }),
];

// Hook: brunch under the SAGITTARIUS sign; Luna is booking on her phone.
const Hook: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 2.7], [0.0, 1.3, 2.35], f / 55), target: [0.0, 1.3, -1.6], fov: 60 };
  return brunch(cam, f, brunchPups(f, { hold: PHONE_R, armR: [10 + Math.sin(f) * 4, -78], armL: [60, -40], lookX: 0.2 }, { expression: "excited" }), { badge: f + 20 });
};

// Macro: she drops the phone on the table: PERU, BOOKED.
const Booked: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PHONE_AT[0] + 0.05, 1.3, PHONE_AT[2] + 0.4], [PHONE_AT[0] + 0.03, 1.15, PHONE_AT[2] + 0.3], f / 47), target: PHONE_AT, fov: 46 };
  return brunch(cam, f, brunchPups(f), { badge: 99, phone: f > 6 ? "PERU\nBOOKED" : "PERU?" });
};

// Mid-sentence: she talks to Bea and Maya, arms everywhere.
const MidSentence: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.25, 1.6], [0.25, 1.25, 1.35], f / 36), target: [0.0, 1.0, -1.4], fov: 56 };
  return brunch(cam, f, brunchPups(f, { armL: [110 + Math.sin(f / 2) * 25, -30], armR: [90 + Math.cos(f / 2) * 20, -30], headTilt: Math.sin(f / 4) * 8 }, { lookX: -0.8 }, { lookX: -0.6 }), { phone: "PERU\nBOOKED" });
};

// Gag: her elbow knocks the syrup over and it floods the phone.
const Syrup: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PHONE_AT[0] + 0.15, 1.35, PHONE_AT[2] + 0.55], [PHONE_AT[0] + 0.12, 1.25, PHONE_AT[2] + 0.45], f / 51), target: [PHONE_AT[0] - 0.05, 0.7, PHONE_AT[2]], fov: 50 };
  return brunch(cam, f, brunchPups(f, { expression: f > 14 ? "shocked" : "excited" }), { phone: "PERU\nBOOKED", spill: ramp(f, 4, 40) });
};

// That's Luna: low angle, her name pops.
const LunaName: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.45, 0.6, 0.6], [-0.5, 0.62, 0.35], f / 39), target: [-1.0, 1.4, -2.2], fov: 56 };
  return brunch(cam, f, brunchPups(f, { expression: "smug", ...HANDS_HIPS, lookX: 0.2 }), { name: f - 3, phone: "PERU\nBOOKED", spill: 1 });
};

const Traits: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.3, 1.6], [-0.45, 1.3, 1.3], f / 45), target: [-0.45, 1.35, -2.0], fov: 56 };
  return brunch(cam, f, brunchPups(f, { expression: "excited", armL: [120, -20], armR: [100 + Math.sin(f / 2) * 20, -30], headTilt: Math.sin(f / 4) * 6 }), { name: 99, traits: f, phone: "PERU\nBOOKED", spill: 1 });
};

// "Your bangs were a mistake": close on Luna, pointing at Bea.
const LunaBangs: React.FC = () => {
  const f = useShotFrame();
  return brunch(close(LUNA_B[0], LUNA_B[1], f / 42, 0.25, 0.95, 2.1), f, brunchPups(f, { expression: "smug", armR: [110, -10], armL: [40, -100], lookX: 0.8 }));
};

const LoveYou: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.25, 2.0], [0.0, 1.25, 1.75], f / 37), target: [0.0, 0.95, -1.3], fov: 62 };
  return brunch(cam, f, brunchPups(f, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8 }, { expression: "shocked", armR: [160, -150] }, { expression: "shocked", lookX: 0.6 }));
};

// Bea touches her bangs.
const BeaTouch: React.FC = () => {
  const f = useShotFrame();
  return brunch(close(BEA_B[0], BEA_B[1], f / 50, -0.25, 0.95, 2.1), f, brunchPups(f, {}, { expression: "skeptical", reachR: [255, -770 + Math.sin(f / 3) * 12], frontR: true, lookX: -0.4, headTilt: -6 }));
};

// Luna, already ordering pancakes.
const Pancakes: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.5, 0.9], [-0.25, 1.45, 0.65], f / 53), target: [-0.4, 0.85, -1.2], fov: 54 };
  return brunch(cam, f, brunchPups(f, { expression: "excited", armR: [150, -20], armL: [40, -100], lookX: -0.6 }, { expression: "skeptical", armR: [165, -150] }));
};

// The bedroom: the suitcase is always packed.
const SuitcaseShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.35, 1.6], [0.45, 1.35, 1.3], (f + 6) / 48), target: [0.5, 1.0, -2.0], fov: 56 };
  return bedroom(cam, f, [pup("luna", LUNA, LUNA_ROOM, { expression: "smug", ...HANDS_HIPS, lookX: 0.7, bob: breathe(f) })], { packed: f - 8 });
};

// She sleeps in her hiking boots (lying on the bed: a rotated billboard, not a placed puppet).
const Boots: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.9, 0.6], [-0.2, 1.8, 0.4], f / 45), target: [-0.75, 0.6, -2.0], fov: 56 };
  return bedroom(cam, f, [], { boots: f - 10 }, {}, (
    <group position={[-0.2, 0.7, -1.95]} rotation={[0, 0, Math.PI / 2]}>
      <PuppetBillboard id="luna" look={LUNA} at={[0, 0]} pose={{ expression: "neutral", blink: true, armL: [10, 0], armR: [10, 0] }} />
    </group>
  ));
};

// The map wall: thirty pins.
const MapWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.6, 1.8], [-0.25, 1.6, 1.5], (f + 6) / 43), target: [-0.2, 1.55, -2.8], fov: 58 };
  return mapRoom(cam, f, [pup("luna", LUNA, LUNA_MAP, { expression: "smug", armR: [130, -10], armL: [40, -100], lookX: 0.8, bob: breathe(f) })], { pins: ramp(f, 0, 36) * 30, count: f - 6 });
};

// Macro: DENTISTS 0.
const Dentists: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.3, 1.15, -0.9], [1.35, 1.1, -1.15], f / 45), target: [1.6, 1.05, -2.85], fov: 50 };
  return mapRoom(cam, f, [], { count: 99, dentists: f - 4 });
};

// The goodbye party.
const PartyWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.5, 2.4], [0.05, 1.45, 2.1], (f + 6) / 42), target: [0.0, 1.3, -1.8], fov: 58 };
  return party(cam, f, [
    pup("luna", LUNA, LUNA_P, { expression: "excited", ...ARMS_UP, bob: breathe(f) }),
    pup("bea", BEA, BEA_P, { expression: "neutral", lookX: -0.6, bob: breathe(f + 4) }),
    pup("maya", MAYA, MAYA_P, { expression: "neutral", lookX: -0.7, bob: breathe(f + 8) }),
  ]);
};

// Everyone cries (except Luna).
const Cries: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.15, 1.2], [0.0, 1.15, 0.95], f / 47), target: [0.0, 1.0, -1.5], fov: 54 };
  return party(cam, f, [
    pup("bea", BEA, BEA_P, { expression: "shocked", armL: [150, -150], armR: [150, -150], blink: true, headTilt: Math.sin(f / 3) * 5 }),
    pup("maya", MAYA, MAYA_P, { expression: "shocked", armL: [150, -150], blink: true, headTilt: -Math.sin(f / 3) * 5 }),
  ], {}, {}, (
    <>
      <Tears position={[BEA_P[0], EYES_Y, BEA_P[1]]} f={f} />
      <Tears position={[MAYA_P[0], EYES_Y, MAYA_P[1]]} f={f + 5} />
    </>
  ));
};

// The gate: Luna waves, the agent behind the desk.
const GateWave: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.45, 2.6], [0.2, 1.45, 2.3], (f + 6) / 50), target: [0.25, 1.15, -1.8], fov: 64 };
  return gate(cam, f, [
    pup("luna", LUNA, LUNA_G, { expression: "excited", armR: [160 + Math.sin(f / 2) * 15, -30], armL: [40, -100], bob: breathe(f) }),
    pup("agent", AGENT, AGENT_AT, { expression: "neutral", lookX: -0.6, bob: breathe(f + 5) }),
  ]);
};

const Happiest: React.FC = () => {
  const f = useShotFrame();
  return gate(close(LUNA_G[0], LUNA_G[1], f / 40, 0.25), f, [pup("luna", LUNA, LUNA_G, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8 })]);
};

// The agent holds out her hand.
const AgentHand: React.FC = () => {
  const f = useShotFrame();
  const reach = ramp(f, 8, 20);
  const cam: CameraShot = { position: lerp3([0.6, 1.35, 1.2], [0.65, 1.35, 0.95], f / 36), target: [1.25, 1.05, -1.5], fov: 56 };
  return gate(cam, f, [
    pup("agent", AGENT, AGENT_AT, { expression: "neutral", armL: [10 + reach * 80, -reach * 20], lookX: -0.6 }),
    pup("luna", LUNA, LUNA_G, { expression: "excited", ...ARMS_UP }),
  ]);
};

const HandOut: React.FC = () => {
  const f = useShotFrame();
  return gate(close(AGENT_AT[0], AGENT_AT[1], f / 35, -0.3, 1.1, 2.0), f, [pup("agent", AGENT, AGENT_AT, { expression: "smug", armL: [90, -20], lookX: -0.7 })]);
};

// "Passport, please."
const PassportPlease: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.0, 1.2, 0.5], [-0.95, 1.2, 0.3], f / 33), target: [1.2, 1.05, -1.5], fov: 50 };
  return gate(cam, f, [
    pup("agent", AGENT, AGENT_AT, { expression: "smug", armL: [90, -20], lookX: -0.7 }),
    pup("luna", LUNA, LUNA_G, { view: "back", expression: "neutral" }),
  ]);
};

// She pats her pockets.
const Pockets: React.FC = () => {
  const f = useShotFrame();
  return gate(close(LUNA_G[0], LUNA_G[1], f / 43, -0.25, 0.95, 2.1), f, [
    pup("luna", LUNA, LUNA_G, { expression: "shocked", armL: [25 + Math.abs(Math.sin(f / 2)) * 15, 40], armR: [25 + Math.abs(Math.cos(f / 2)) * 15, 40], lookX: Math.sin(f / 5) }),
  ]);
};

// Gag: she turns the bag upside down; the clothes explode out.
const BagFlip: React.FC = () => {
  const f = useShotFrame();
  const hand: Vec3 = [LUNA_G[0] + 0.35, 0.9, LUNA_G[1] + 0.05];
  const cam: CameraShot = { position: lerp3([-0.4, 1.3, 1.5], [-0.42, 1.3, 1.3], f / 31), target: [-0.5, 1.0, -1.0], fov: 56 };
  return gate(cam, f, [
    pup("luna", LUNA, LUNA_G, { expression: "shocked", hold: BAG_R, armR: [150, -20], armL: [120, -40], itemTilt: 180 }),
    pup("agent", AGENT, AGENT_AT, { expression: "skeptical", armL: [90, -20], lookX: -0.7 }),
  ], {}, {}, <ClothesBurst position={hand} t={Easing.out(Easing.quad)(ramp(f, 3, 22))} />);
};

// Inside the freezer: the passport next to the peas.
const Freezer: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.0, 0.9], [0.0, 0.95, 0.6], (f + 6) / 50), target: [0.05, 0.75, -1.4], fov: 56 };
  return freezer(cam, f, [], {}, { flash: 0.6 * (1 - ramp(f, 0, 8)) });
};

const Peas: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.05, -0.35], [0.1, 1.0, -0.5], f / 33), target: [0.1, 0.66, -1.22], fov: 50 };
  return freezer(cam, f, []);
};

// Push into Luna's face at the gate, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 78));
  const cam: CameraShot = { position: lerp3([LUNA_G[0] + 0.1, 1.15, 1.0], [LUNA_G[0] + 0.02, 1.05, -0.65], p), target: [LUNA_G[0], 1.02, LUNA_G[1]], fov: 38 };
  return gate(cam, f, [pup("luna", LUNA, LUNA_G, { expression: "shocked", blink: false })], {}, { truth: 0.3, flash: ramp(f, 72, 86) });
};

// Inside her head: every door says EXIT.
const ExitWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.6, 2.7], [0.1, 1.55, 2.35], (f + 6) / 39), target: [0.0, 1.4, -2.0], fov: 60 };
  return exitRoom(cam, f, [pup("luna", LUNA, LUNA_E, { expression: "excited", ...ARMS_UP, bob: breathe(f) })], { inside: f - 4, spin: f * 0.3 }, { flash: 1 - ramp(f, 0, 10) });
};

const ExitDoors: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([2.0, 1.7, -0.6], [1.7, 1.7, -0.7], f / 23), target: [-0.5, 1.6, -2.9], fov: 52 };
  return exitRoom(cam, f, [], { spin: f * 0.3 });
};

// The compass with no north.
const CompassShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.1, 1.65, -0.9], [-1.15, 1.62, -1.15], f / 38), target: [-1.3, 1.6, -2.9], fov: 48 };
  return exitRoom(cam, f, [], { spin: f * 0.25 });
};

const NoNorth: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.4, 0.6], [-0.65, 1.4, 0.35], f / 40), target: [-1.0, 1.4, -2.6], fov: 54 };
  return exitRoom(cam, f, [pup("luna", LUNA, LUNA_E, { expression: "smug", armL: [140, -20], lookX: -0.7, headTilt: Math.sin(f / 4) * 10 })], { spin: f * 0.6 });
};

// The bow and arrow labelled TRUTH.
const Bow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.2, 1.3, 0.4], [-1.25, 1.3, 0.15], f / 47), target: [-1.6, 1.2, -1.3], fov: 52 };
  return exitRoom(cam, f, [], { truth: f - 20 });
};

// The arrow flies across the room.
const ArrowFly: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.3, 1.7], [-0.3, 1.3, 1.5], f / 26), target: [-0.2, 1.15, -1.3], fov: 60 };
  return exitRoom(cam, f, [pup("bea", BEA, BEA_E, { expression: "neutral", lookX: -0.8 })], { truth: 99, fly: Easing.in(Easing.quad)(ramp(f, 2, 26)) });
};

// Gag: it pops the balloon next to Bea; she grabs her bangs.
const Pop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.0, 1.25, 0.6], [1.05, 1.25, 0.4], f / 24), target: [1.1, 1.15, -1.3], fov: 52 };
  return exitRoom(cam, f, [pup("bea", BEA, BEA_E, { expression: "shocked", armR: [165, -150], armL: [150, -150], headTilt: -8 })], { truth: 99, fly: 1, popped: ramp(f, 0, 10) }, { flash: 0.3 * (1 - ramp(f, 0, 5)) });
};

// The calendar marked PLANS.
const CalendarShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.1, 1.65, -0.8], [1.15, 1.62, -1.05], f / 46), target: [1.3, 1.6, -2.9], fov: 50 };
  return exitRoom(cam, f, [], { plans: f - 4, popped: 1 });
};

// Completely blank: Luna shrugs.
const Blank: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.4, 0.8], [0.6, 1.4, 0.55], f / 30), target: [0.9, 1.35, -2.6], fov: 56 };
  return exitRoom(cam, f, [pup("luna", LUNA, [0.4, -1.5], { expression: "smug", armL: [120, 60], armR: [120, 60], lookX: 0.6 })], { plans: 99, popped: 1 });
};

// The night bus home.
const Bus: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.2, 1.4], [0.05, 1.2, 1.15], (f + 6) / 46), target: [0.3, 0.95, -2.0], fov: 56 };
  return bus(cam, f, [pup("luna", LUNA, LUNA_BUS, { ...SIT, expression: "neutral", armL: [20, 10], armR: [20, 10], lookX: -0.8, bob: breathe(f) + Math.sin(f / 2) * 3 })]);
};

// The party is still going.
const StillGoing: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.45, 2.3], [0.0, 1.45, 2.0], f / 37), target: [0.1, 1.2, -1.8], fov: 58 };
  return party(cam, f, [
    pup("bea", BEA, BEA_P, { expression: "excited", ...ARMS_UP, bob: Math.abs(Math.sin(f / 3)) * 20 }),
    pup("maya", MAYA, MAYA_P, { expression: "excited", armL: [150 + Math.sin(f / 2) * 15, -20], armR: [60, -40], bob: Math.abs(Math.cos(f / 3)) * 20 }),
  ], { banner: "BON VOYAGE LUNA" });
};

// "You're back? We still have cake!"
const MayaBack: React.FC = () => {
  const f = useShotFrame();
  return party(close(MAYA_P[0], MAYA_P[1], f / 50, 0.25), f, [pup("maya", MAYA, MAYA_P, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8, lookX: -0.6 })]);
};

// Everyone cheers.
const Cheers: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.4, 2.2], [0.0, 1.4, 1.9], f / 33), target: [0.0, 1.2, -1.6], fov: 58 };
  return party(cam, f, [
    pup("luna", LUNA, [-0.05, -1.0], { expression: "excited", ...ARMS_UP, bob: Math.abs(Math.sin(f / 3)) * 15 }),
    pup("bea", BEA, BEA_P, { expression: "excited", ...ARMS_UP }),
    pup("maya", MAYA, MAYA_P, { expression: "excited", ...ARMS_UP }),
  ]);
};

// Half the cake is gone; Luna looks very pleased.
const HalfCake: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.0, 1.4, 0.5], [1.05, 1.35, 0.3], f / 33), target: [1.25, 0.95, -1.8], fov: 54 };
  return party(cam, f, [pup("luna", LUNA, [0.95, -1.3], { expression: "smug", ...HANDS_HIPS, headTilt: 8, lookX: 0.6 })], { eaten: ramp(f, 0, 12) });
};

// That night: sitting on the bed, the laptop glowing.
const NightBook: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.2, 1.3], [-0.1, 1.2, 1.05], (f + 6) / 44), target: [-0.1, 0.85, -2.0], fov: 56 };
  return bedroomNight(cam, f, [pup("luna", LUNA, LUNA_BEDSIDE, { ...SIT, expression: "smug", armR: [80 + Math.sin(f) * 5, -40], armL: [40, -60], lookX: 0.8, bob: breathe(f) })], {
    night: true,
    laptop: "BOOK\nFLIGHT",
  });
};

// Macro: ICELAND, BOOKED; the suitcase waits by the door.
const Iceland: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([NIGHTSTAND[0], 0.92, NIGHTSTAND[2] + 0.65], [NIGHTSTAND[0], 0.95, NIGHTSTAND[2] + 0.9], f / 43), target: [NIGHTSTAND[0], 0.64, NIGHTSTAND[2]], fov: 50 };
  return bedroomNight(cam, f, [], { night: true, laptop: f > 8 ? "ICELAND\nBOOKED" : "BOOK\nFLIGHT" }, { flash: f > 8 ? 0.25 * (1 - ramp(f, 8, 14)) : 0 });
};

const SHOTS: Shot[] = [
  [0, 55, Hook, false],
  [55, 102, Booked, false],
  [102, 138, MidSentence, false],
  [138, 189, Syrup, false],
  [189, 228, LunaName, false],
  [228, 273, Traits, false],
  [273, 315, LunaBangs, false],
  [315, 352, LoveYou, false],
  [352, 402, BeaTouch, false],
  [402, 455, Pancakes, false],
  [455, 503, SuitcaseShot, true],
  [503, 548, Boots, false],
  [548, 591, MapWide, true],
  [591, 636, Dentists, false],
  [636, 678, PartyWide, true],
  [678, 725, Cries, false],
  [725, 775, GateWave, true],
  [775, 815, Happiest, false],
  [815, 851, AgentHand, false],
  [851, 886, HandOut, false],
  [886, 919, PassportPlease, false],
  [919, 962, Pockets, false],
  [962, 993, BagFlip, false],
  [993, 1043, Freezer, true],
  [1043, 1076, Peas, false],
  [1076, 1162, HeadPush, false],
  [1162, 1201, ExitWide, true],
  [1201, 1224, ExitDoors, false],
  [1224, 1262, CompassShot, false],
  [1262, 1302, NoNorth, false],
  [1302, 1349, Bow, false],
  [1349, 1375, ArrowFly, false],
  [1375, 1399, Pop, false],
  [1399, 1445, CalendarShot, false],
  [1445, 1475, Blank, false],
  [1475, 1521, Bus, true],
  [1521, 1558, StillGoing, true],
  [1558, 1608, MayaBack, false],
  [1608, 1641, Cheers, false],
  [1641, 1674, HalfCake, false],
  [1674, 1718, NightBook, true],
  [1718, TIMING.totalFrames, Iceland, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  // One-shots sit on words; the gaps between words stay clear for the voice.
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 455 },
  { at: 4, src: sfx("chime"), volume: 0.1 },
  { at: 22, src: sfx("pop"), volume: 0.16 },
  { at: 62, src: sfx("button"), volume: 0.18 },
  { at: 145, src: sfx("near-miss"), volume: 0.1 },
  { at: 150, src: sfx("paper"), volume: 0.1 },
  { at: 192, src: sfx("pop"), volume: 0.16 },
  ...[230, 242, 254].map((at) => ({ at, src: sfx("pop"), volume: 0.12 })),
  { at: 296, src: sfx("sting"), volume: 0.12 },
  { at: 355, src: sfx("tick"), volume: 0.12 },
  { at: 455, src: sfx("whoosh"), volume: 0.12 },
  { at: 466, src: sfx("pop"), volume: 0.14 },
  { at: 515, src: sfx("pop"), volume: 0.13 },
  { at: 548, src: sfx("hum"), volume: 0.025, until: 725 },
  ...Array.from({ length: 10 }, (_, k) => ({ at: 552 + k * 3, src: sfx("tick"), volume: 0.08 })),
  { at: 597, src: sfx("stamp"), volume: 0.14 },
  { at: 640, src: sfx("chime"), volume: 0.12 },
  { at: 725, src: sfx("ambience"), volume: 0.03, until: 993 },
  { at: 728, src: sfx("chime"), volume: 0.1 },
  // The twist: the hand, the passport, the search.
  { at: 840, src: sfx("riser"), volume: 0.06 },
  { at: 888, src: sfx("sting"), volume: 0.22 },
  ...[925, 940, 955].map((at) => ({ at, src: sfx("paper"), volume: 0.1 })),
  { at: 968, src: sfx("boom"), volume: 0.18 },
  { at: 996, src: sfx("door"), volume: 0.16 },
  { at: 1046, src: sfx("chime"), volume: 0.1 },
  { at: 1110, src: sfx("whoosh"), volume: 0.13 },
  { at: 1162, src: sfx("hum"), volume: 0.03, until: 1475 },
  { at: 1166, src: sfx("pop"), volume: 0.16 },
  { at: 1203, src: sfx("door"), volume: 0.14 },
  { at: 1236, src: sfx("reel-spin"), volume: 0.03, until: 1300 },
  { at: 1328, src: sfx("pop"), volume: 0.14 },
  { at: 1352, src: sfx("whoosh"), volume: 0.16 },
  { at: 1377, src: sfx("boom"), volume: 0.2 },
  { at: 1408, src: sfx("pop"), volume: 0.14 },
  { at: 1475, src: sfx("ambience"), volume: 0.03, until: 1674 },
  { at: 1560, src: sfx("pop"), volume: 0.16 },
  ...[1612, 1618, 1624].map((at) => ({ at, src: sfx("pop"), volume: 0.12 })),
  { at: 1645, src: sfx("paper"), volume: 0.1 },
  { at: 1728, src: sfx("button"), volume: 0.16 },
  { at: 1732, src: sfx("chime"), volume: 0.14 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 815, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 815, to: 1076, volume: 0.14 },
  { src: MUSIC_FILES.mystery, from: 1076, to: 1475, volume: 0.15 },
  { src: MUSIC_FILES.lounge, from: 1475, to: TIMING.totalFrames, volume: 0.13 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
