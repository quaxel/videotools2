import React from "react";
import { Easing } from "remotion";
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
import { Blanket, BreadBasket, ComfortDial, Couch, DizzyStars, FloorBolt, Fork, Frost, Fry, GrudgeCounter, HangingSign, NameCard, Padlock, PerfumeBottle, Plate, RoundTable, SushiBar, VaultDoor } from "./props";
import TIMING_JSON from "./timing.json";

// "Never Touch a Taurus's Fries" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "taurus-sign";
export const timing = TIMING;

// ---------- cast ----------

const ELLA: PuppetLook = { skin: "#f6dcc4", hair: "#6b3a1e", outfit: "#f2e6d0", long: true };
const ZOE: PuppetLook = { skin: "#fbe9d6", hair: "#e8c15a", outfit: "#2a9d8f", long: true };
const PRIYA: PuppetLook = { skin: "#a86b45", hair: "#1d1a1a", outfit: "#f77f00", long: true };
const WAITER: PuppetLook = { skin: "#fff3e6", hair: "#c0392b", outfit: "#1d1a1a", lanyard: "#ffffff", long: true };
const COUSIN: PuppetLook = { skin: "#8d5a3b", hair: "#1d1a1a", outfit: "#ff8fc8", long: true };
const EXTRAS: PuppetLook[] = [
  { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#4f7dff", long: true },
  { skin: "#6b4423", hair: "#1d1a1a", outfit: "#9b5de5", long: true },
  { skin: "#fbe9d6", hair: "#a0442a", outfit: "#3fae5a", long: true },
];

const HOLD: [number, number] = [10, -78];
const CROSSED = { armL: [40, -110] as [number, number], armR: [40, -110] as [number, number] };
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2): CameraShot => ({
  position: lerp3([px + dx, 1.08, pz + 1.85], [px + dx * 0.8, 1.05, pz + 1.55], p),
  target: [px, 0.92, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// Restaurant: warm red at dinner, cold blue when the plan changes, brown at dessert.
const TABLE_AT: Vec3 = [0, 0, -1.3];
const ELLA_AT: [number, number] = [0, -1.85];
const ZOE_AT: [number, number] = [-0.72, -1.45];
const PRIYA_CHAIR: [number, number] = [0.72, -1.45];
const FRIES_AT: Vec3 = [-0.22, 0.61, -1.42];
const PASTA_AT: Vec3 = [0.14, 0.61, -1.5];
const DOOR_X = -2.5;
const TOP = 0.61;
type RestMode = "dinner" | "cold" | "dessert";
const REST_MOOD = { dinner: "warm", cold: "cold", dessert: "warm" } as const;
const RestaurantSet: React.FC<{
  camera: CameraShot;
  f: number;
  mode?: RestMode;
  taurus?: number;
  fries?: number;
  priyaChair?: boolean;
  nameCard?: number;
  door?: number;
  frost?: number;
  dish?: "pasta" | "cake";
  bread?: boolean;
  reserved?: number;
  children?: React.ReactNode;
}> = ({ camera, f, mode = "dinner", taurus, fries = 8, priyaChair = true, nameCard, door = 0, frost = 0, dish = "pasta", bread = false, reserved, children }) => (
  <Room
    camera={camera}
    mood={REST_MOOD[mode]}
    floor={mode === "dinner" ? "#5a1e1e" : mode === "cold" ? "#26324a" : "#3a2418"}
    wall={mode === "dinner" ? "#c0392b" : mode === "cold" ? "#4a6fa5" : "#7a4a2e"}
    stripe={mode === "cold" ? "#dff6ff" : "#ffd23f"}
    width={9}
    depth={6}
    wallPattern="wallpaper"
    floorPattern="tile"
    sun={mode === "dinner" ? { x: 1.6, color: "#ffe0c2", bars: 3 } : undefined}
  >
    {taurus !== undefined && <ZodiacBadge sign="taurus" position={[0, 2.45, -2.92]} size={0.75} bg="#ffd23f" fg="#7a1e1e" appear={taurus} />}
    {taurus !== undefined && <Label text="TAURUS" position={[0, 1.85, -2.94]} width={1.1} fg="#ffffff" bg="#13235e" appear={taurus - 4} />}
    <Door position={[DOOR_X, 0, -2.94]} open={door} color="#ffd23f" glow="#1b2a5e" />
    <Window position={[1.9, 1.6, -2.94]} size={[1.2, 1.0]} sky={mode === "dessert" ? "#2a1a40" : "#1b2a5e"} />
    <Lamp position={[0, 2.2, -1.3]} color={mode === "cold" ? "#cfe9ff" : "#ffd27a"} />
    <Plant position={[3.0, 0, -2.5]} />
    <Shelf position={[-3.4, 0, -2.6]} width={0.9} rows={3} color="#5a2a1e" seed={4} />
    <RoundTable position={TABLE_AT} cloth={mode === "cold" ? "#dff6ff" : "#fff6dc"} />
    <Chair position={[ELLA_AT[0], 0, ELLA_AT[1]]} color="#7a1e1e" />
    {mode !== "dessert" && <Chair position={[ZOE_AT[0], 0, ZOE_AT[1]]} color="#7a1e1e" />}
    {priyaChair && <Chair position={[PRIYA_CHAIR[0], 0, PRIYA_CHAIR[1]]} color="#7a1e1e" />}
    {fries > 0 && <Plate position={FRIES_AT} dish="fries" fries={fries} />}
    <Plate position={PASTA_AT} dish={dish} />
    {nameCard !== undefined && <NameCard position={[0.42, TOP, -1.2]} text="PRIYA" appear={nameCard} />}
    {reserved !== undefined && <NameCard position={[-0.05, TOP, -0.98]} text="ELLA" appear={reserved} />}
    {bread && <BreadBasket position={[0.25, TOP, -1.08]} />}
    {frost > 0 && <Frost position={[0, 0, -1.4]} f={f} amount={frost} />}
    {children}
  </Room>
);

// Ella's living room: deep green velvet.
const COUCH_AT: Vec3 = [0, 0, -2.1];
const ELLA_COUCH: [number, number] = [0, -2.02];
const LivingSet: React.FC<{ camera: CameraShot; f: number; name?: number; traits?: number; velvet?: number; heavy?: number }> = ({ camera, name, traits, velvet, heavy }) => (
  <Room camera={camera} mood="daylight" floor="#3a5a3a" wall="#2d6a4f" stripe="#e8c15a" width={8} depth={6} wallPattern="panel" floorPattern="carpet" sun={{ x: -2.0, color: "#f2ffe6", bars: 4 }}>
    <Couch position={COUCH_AT} color="#14532d" width={1.9} />
    <Blanket position={[ELLA_COUCH[0], 0.45, ELLA_COUCH[1] + 0.28]} />
    <Lamp position={[1.5, 2.2, -2.2]} color="#ffe6a8" />
    <Plant position={[-1.6, 0, -2.5]} scale={1.2} />
    <Window position={[2.4, 1.7, -2.94]} size={[1.0, 1.1]} sky="#cfe9ff" blinds />
    {name !== undefined && <Label text="ELLA" position={[-0.55, 2.35, -2.92]} width={0.7} fg="#ffffff" bg="#13235e" appear={name} />}
    {traits !== undefined &&
      ["CALM", "LOYAL", "COMFY"].map((t, i) => (
        <Label key={t} text={t} position={[0.6, 2.45 - i * 0.32, -2.9]} width={0.62} fg="#13235e" bg="#ffd23f" appear={traits - i * 14} />
      ))}
    {velvet !== undefined && <Label text="VELVET" position={[-0.6, 1.25, -2.15]} width={0.55} fg="#ffffff" bg="#7b2cbf" appear={velvet} />}
    {heavy !== undefined && <Label text={"VERY\nHEAVY"} position={[-0.6, 1.05, -1.5]} width={0.45} fg="#ffffff" bg="#e0262f" appear={heavy} />}
  </Room>
);

// Bathroom: lilac dream, one perfume bottle on the shelf.
const SINK_AT: Vec3 = [0.2, 0, -2.5];
const BOTTLE_AT: Vec3 = [-0.2, 0.9, -2.4];
const BathSet: React.FC<{ camera: CameraShot; f: number; years?: number; spray?: number }> = ({ camera, f, years, spray = 0 }) => (
  <Room camera={camera} mood="dream" floor="#e0c3ff" wall="#b48ae0" stripe="#ffffff" width={8} depth={6} wallPattern="tile" floorPattern="tile">
    <Counter position={SINK_AT} size={[1.4, 0.85, 0.5]} color="#f7f2ff" top="#c9ced3" />
    <InkBox size={[1.0, 0.9, 0.04]} position={[SINK_AT[0], 1.75, -2.96]} color="#e8f6ff" />
    <PerfumeBottle position={BOTTLE_AT} />
    {years !== undefined && <Label text={"12 YEARS\nSAME ONE"} position={[BOTTLE_AT[0], 1.48, -2.9]} width={0.6} fg="#ffffff" bg="#7b2cbf" appear={years} />}
    {spray > 0 && (
      <group userData={{ ghost: true }}>
        {Array.from({ length: 8 }, (_, i) => {
          const t = ((f * 0.03 + i / 8) % 1) * spray;
          return (
            <mesh key={i} position={[BOTTLE_AT[0] + 0.1 + t * 0.6, 1.15 + Math.sin(i * 2) * 0.12, BOTTLE_AT[2] + 0.3 + t * 0.3]}>
              <sphereGeometry args={[0.03 + t * 0.06, 10, 8]} />
              <meshBasicMaterial color="#f3e0ff" transparent opacity={0.6 * (1 - t)} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    )}
    <Plant position={[2.4, 0, -2.5]} scale={0.8} />
  </Room>
);

// Planning corner: orange, the corkboard plan.
const PlanSet: React.FC<{ camera: CameraShot; f: number; night?: number }> = ({ camera, night }) => (
  <Room camera={camera} mood="golden" floor="#8a4a1e" wall="#f4a261" stripe="#ffffff" width={8} depth={6} wallPattern="brick" floorPattern="wood" sun={{ x: 1.8, color: "#ffe6a8", bars: 5 }}>
    <Board position={[0.4, 1.75, -2.92]} cards={["MY TABLE", "MY PASTA", "MY CHAIR", "NO CHANGES"]} width={1.6} height={0.9} />
    {night !== undefined && <Label text="GIRLS' NIGHT" position={[0.4, 2.5, -2.9]} width={1.3} fg="#ffffff" bg="#e0262f" appear={night} />}
    <Desk position={[1.9, 0, -2.2]} size={[1.0, 0.72, 0.6]} color="#fff6dc" />
    <Shelf position={[-2.6, 0, -2.6]} width={1.0} rows={4} color="#8a4a1e" seed={3} />
  </Room>
);

// Street outside the restaurant: night blue.
const STREET_DOOR_X = 1.4;
const StreetSet: React.FC<{ camera: CameraShot; f: number; door?: number }> = ({ camera, f, door = 0 }) => (
  <Room camera={camera} mood="night" floor="#2a3040" wall="#1b2a5e" stripe="#ffd23f" width={12} depth={6} wallPattern="brick" floorPattern="concrete">
    <Door position={[STREET_DOOR_X, 0, -2.94]} open={door} color="#c0392b" glow="#ffb36b" sign="PASTA PLACE" />
    <HangingSign position={[STREET_DOOR_X + 0.75, 2.2, -2.85]} text="OPEN" swing={Math.sin(f / 8) * 0.08} />
    <Window position={[-0.4, 1.4, -2.94]} size={[1.3, 1.0]} sky="#ffb36b" />
    <Window position={[-2.6, 1.6, -2.94]} size={[1.0, 1.0]} sky="#3a4a7a" blinds />
    <Lamp position={[-1.5, 2.6, -2.6]} color="#ffd27a" />
  </Room>
);

// The bank vault inside her head: gold.
const VAULT_AT: Vec3 = [0, 1.45, -2.86];
const LOCK_AT: Vec3 = [0, 1.45, -2.66];
const DIAL_AT: Vec3 = [-2.0, 1.75, -2.9];
const COUNTER_AT: Vec3 = [2.05, 1.75, -2.85];
const SIGN_AT: Vec3 = [0.55, 0, -1.95];
const BOLTS: Vec3[] = [
  [0.6, 0, -0.9],
  [1.9, 0, -0.8],
  [1.3, 0, -1.9],
  [-0.4, 0, -0.35],
];
const ELLA_VAULT: [number, number] = [-0.4, -1.0];
const VaultSet: React.FC<{
  camera: CameraShot;
  f: number;
  shut?: number;
  spin?: number;
  inside?: number;
  plans?: number;
  comfort?: number;
  needle?: number;
  moving?: number;
  boltTurn?: number;
  grudges?: number;
  value?: number;
  flip?: number;
  photo?: number;
}> = ({ camera, shut = 1, spin = 0, inside, plans, comfort, needle = 1, moving, boltTurn = 0, grudges, value = 31, flip = 0, photo }) => (
  <Room camera={camera} mood="golden" floor="#5a4410" wall="#c9a227" stripe="#13235e" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
    {inside !== undefined && <Label text="INSIDE ELLA" position={[0, 2.85, -2.92]} width={1.4} fg="#ffffff" bg="#13235e" appear={inside} />}
    <ZodiacBadge sign="taurus" position={[-2.0, 2.75, -2.92]} size={0.5} bg="#13235e" fg="#ffd23f" />
    <VaultDoor position={VAULT_AT} spin={spin} />
    <Padlock position={LOCK_AT} shut={shut} scale={1.5} appear={plans} />
    <ComfortDial position={DIAL_AT} needle={needle} />
    {comfort !== undefined && <Label text="COMFORT" position={[DIAL_AT[0], DIAL_AT[1] + 0.62, -2.9]} width={0.8} fg="#ffffff" bg="#13235e" appear={comfort} />}
    {BOLTS.map((b, i) => (
      <FloorBolt key={i} position={b} turn={boltTurn + i} />
    ))}
    <InkBox size={[0.08, 1.1, 0.08]} position={[SIGN_AT[0], 0.55, SIGN_AT[2]]} color="#3a3a44" ink={0.004} />
    <FloorBolt position={SIGN_AT} />
    {moving !== undefined && <Label text={"NOT\nMOVING"} position={[SIGN_AT[0], 1.25, SIGN_AT[2] + 0.06]} width={0.6} fg="#ffffff" bg="#e0262f" appear={moving} />}
    <GrudgeCounter position={COUNTER_AT} value={value} flip={flip} />
    {grudges !== undefined && <Label text="GRUDGES" position={[COUNTER_AT[0], COUNTER_AT[1] + 0.45, -2.88]} width={0.85} fg="#ffffff" bg="#13235e" appear={grudges} />}
    {photo !== undefined && <Label text={"#31\nFRY THIEF"} position={[COUNTER_AT[0] - 0.95, COUNTER_AT[1] + 0.05, -2.86]} width={0.6} fg="#13235e" bg="#ffd23f" appear={photo} />}
    <Couch position={[ELLA_VAULT[0], 0, ELLA_VAULT[1] - 0.08]} color="#7b2cbf" width={1.0} />
  </Room>
);

// New sushi place: neon white and cyan, Priya alone.
const SushiSet: React.FC<{ camera: CameraShot; f: number; alone?: number }> = ({ camera, f, alone }) => (
  <Room camera={camera} mood="neon" floor="#d8f0ee" wall="#e8f6ff" stripe="#00b4d8" width={9} depth={6} wallPattern="tile" floorPattern="tile">
    <SushiBar position={[0, 0, -2.3]} f={f} width={4.0} />
    <Screen position={[0, 2.0, -2.9]} size={[1.4, 0.45]} text="NEW! SUSHI" glow="#00b4d8" bg="#0a1020" />
    {[-1.4, -0.7, 0, 0.7, 1.4].map((x) => (
      <InkCylinder key={x} radius={0.17} height={0.34} position={[x, 0.17, -1.55]} color="#00b4d8" />
    ))}
    {alone !== undefined && <Label text="ALONE" position={[0.9, 1.55, -2.85]} width={0.7} fg="#ffffff" bg="#e0262f" appear={alone} />}
  </Room>
);

// ---------- stage wrappers ----------

const rest = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof RestaurantSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground(REST_MOOD[extra.mode ?? "dinner"])} camera={camera} puppets={puppets} {...grade} set={<RestaurantSet camera={camera} f={f} {...extra} />} />
);
const living = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof LivingSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} {...grade} set={<LivingSet camera={camera} f={f} {...extra} />} />
);
const bath = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof BathSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} {...grade} set={<BathSet camera={camera} f={f} {...extra} />} />
);
const plan = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof PlanSet>> = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<PlanSet camera={camera} f={f} {...extra} />} />
);
const street = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof StreetSet>> = {}) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} set={<StreetSet camera={camera} f={f} {...extra} />} />
);
const vault = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof VaultSet>> = {}, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} {...grade} set={<VaultSet camera={camera} f={f} {...extra} />} />
);
const sushi = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof SushiSet>> = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<SushiSet camera={camera} f={f} {...extra} />} />
);

// Seated cast at the table.
const ellaSeat = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup("ella", ELLA, ELLA_AT, { sit: true, expression: "neutral", bob: breathe(f) * 0.4, ...pose });
const zoeSeat = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup("zoe", ZOE, ZOE_AT, { sit: true, expression: "excited", bob: breathe(f + 9) * 0.4, ...pose });

// ---------- shots ----------

// Hook: Zoe lifts a fry off Ella's plate under the TAURUS sign; Ella turns her head.
const HookFry: React.FC = () => {
  const f = useShotFrame();
  const lift = ramp(f, 6, 20);
  const cam: CameraShot = { position: lerp3([-0.3, 1.0, 1.1], [-0.32, 1.02, 0.8], f / 50), target: [-0.35, 1.2, -1.8], fov: 50 };
  return rest(cam, f, [ellaSeat(f, { expression: f > 22 ? "skeptical" : "neutral", lookX: f > 22 ? -1 : 0, ...CROSSED }), zoeSeat(f, { expression: "smug", armL: [20 + lift * 90, -60 - lift * 40], lookX: 0.6 })], { taurus: f - 2, fries: 7 }, {});
};

// Top-down macro: the fry leaves the plate.
const FryTop: React.FC = () => {
  const f = useShotFrame();
  const up = Easing.out(Easing.cubic)(ramp(f, 2, 16));
  const cam: CameraShot = { position: lerp3([FRIES_AT[0] + 0.03, 1.45, FRIES_AT[2] + 0.15], [FRIES_AT[0], 1.2, FRIES_AT[2] + 0.1], f / 40), target: [FRIES_AT[0], TOP, FRIES_AT[2]], fov: 46 };
  return rest(cam, f, [], {
    fries: 6,
    children: <Fry position={[FRIES_AT[0] - 0.05 - up * 0.25, TOP + 0.04 + up * 0.35, FRIES_AT[2] + 0.02]} rotation={[Math.PI / 2 - up * 1.2, 0, 0.4]} />,
  });
};

// Over Zoe's shoulder: Ella's slow, deadly stare.
const GlareOTS: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.9, 1.35, 0.9], [-0.85, 1.32, 0.65], f / 45), target: [ELLA_AT[0], 0.95, ELLA_AT[1]], fov: 34 };
  return rest(cam, f, [pup("zoe", ZOE, [-0.78, -0.6], { view: "back", expression: "smug" }), ellaSeat(f, { expression: "skeptical", lookX: -0.8, headTilt: -6, blink: false, ...CROSSED })], { fries: 6 });
};

const GlareClose: React.FC = () => {
  const f = useShotFrame();
  return rest(close(ELLA_AT[0], ELLA_AT[1], f / 40, 0.25), f, [ellaSeat(f, { expression: "skeptical", lookX: -0.9, headTilt: -8 + ramp(f, 0, 30) * 4, blink: false, ...CROSSED })], { fries: 6 }, { blur: 6 });
};

// Living room: Ella on her velvet couch under the giant blanket.
const CouchWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.35, 1.6], [0.3, 1.3, 1.2], (f + 8) / 50), target: [0, 1.3, -2.0], fov: 52 };
  return living(cam, f, [pup("ella", ELLA, ELLA_COUCH, { sit: true, expression: "smug", headTilt: Math.sin(f / 12) * 4, bob: breathe(f) * 0.4, armL: [20, -60], armR: [20, -60] })], { name: f - 4, traits: f - 22 });
};

// Low angle: velvet and the blanket that weighs more than you.
const CouchLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 0.35, -0.2], [-0.35, 0.38, -0.45], f / 40), target: [0.15, 0.95, -2.0], fov: 52 };
  return living(cam, f, [pup("ella", ELLA, ELLA_COUCH, { sit: true, expression: "smug", blink: f > 20 && f < 26, bob: breathe(f) * 0.4 })], { velvet: f - 4 });
};

// Zoe tries to lift the blanket corner and buckles.
const BlanketLift: React.FC = () => {
  const f = useShotFrame();
  const strain = ramp(f, 4, 20);
  const cam: CameraShot = { position: lerp3([0.45, 1.15, 1.0], [0.4, 1.12, 0.7], f / 44), target: [0.15, 0.85, -1.8], fov: 48 };
  return living(cam, f, [
    pup("ella", ELLA, ELLA_COUCH, { sit: true, expression: "neutral", bob: breathe(f) * 0.4 }),
    pup("zoe", ZOE, [0.55, -1.4], { expression: strain > 0.5 ? "shocked" : "excited", armL: [30 + strain * 20, -20], armR: [30 + strain * 20, -20], headTilt: strain * 12, bob: -strain * 6, lookX: -0.8 }),
  ], { heavy: f - 10 });
};

// Bathroom: the same perfume, macro, then Ella sprays.
const PerfumeMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([BOTTLE_AT[0] + 0.12, 1.3, -0.7], [BOTTLE_AT[0] + 0.08, 1.28, -1.0], (f + 8) / 40), target: [BOTTLE_AT[0], 1.25, BOTTLE_AT[2]], fov: 42 };
  return bath(cam, f, [], { years: f - 6 });
};

const PerfumeSpray: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.25, 0.4], [0.8, 1.2, 0.1], f / 40), target: [0.1, 1.1, -1.9], fov: 46 };
  return bath(cam, f, [pup("ella", ELLA, [0.45, -1.7], { expression: "smug", armR: [70, -50], armL: [20, -60], lookX: -0.6, headTilt: 8, bob: breathe(f) })], { years: 99, spray: ramp(f, 4, 10) });
};

// Planning corner: girls' night plan on the corkboard.
const PlanBoard: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.0, 1.4], [-0.25, 1.02, 1.0], (f + 8) / 55), target: [0.1, 1.35, -2.4], fov: 52 };
  return plan(cam, f, [pup("ella", ELLA, [-0.4, -1.7], { expression: "smug", armR: [110, -10], armL: [20, -40], lookX: 0.9, bob: breathe(f) })], { night: f - 4 });
};

// Her table: name card ELLA, Priya's empty chair with its own card (the seed).
const TableSet: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.5, 0.7], [0.75, 1.45, 0.35], f / 40), target: [0.1, 0.65, -1.35], fov: 46 };
  return rest(cam, f, [], { fries: 8, reserved: f - 2, nameCard: f - 14 });
};

// Top-down macro: her pasta.
const PastaTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PASTA_AT[0] + 0.02, 1.4, PASTA_AT[2] + 0.12], [PASTA_AT[0], 1.15, PASTA_AT[2] + 0.08], f / 35), target: [PASTA_AT[0], TOP, PASTA_AT[2]], fov: 44 };
  return rest(cam, f, [], { fries: 8, reserved: 99 });
};

// Her chair: Ella sinks in, happy; Zoe beside her.
const ChairSit: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 1.0], [0.1, 1.25, 0.6], f / 40), target: [-0.25, 0.9, -1.7], fov: 46 };
  return rest(cam, f, [ellaSeat(f, { expression: "smug", headTilt: 6, armL: [20, -60], armR: [20, -60] }), zoeSeat(f, { lookX: 0.5 })], { fries: 8, nameCard: 99, reserved: 99 });
};

// Street at night: Priya sprints to the door.
const PriyaRun: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [-2.4, -1.4], [STREET_DOOR_X - 0.75, -1.4]);
  const cam: CameraShot = { position: [w.at[0] + 0.5, 0.8, 1.4], target: [w.at[0] + 0.25, 1.1, -1.8], fov: 50 };
  return street(cam, f, [pup("priya", PRIYA, w.at, { expression: "excited", ...w.pose, bob: (w.pose.bob ?? 0) - Math.abs(Math.sin(f / 3)) * 6 })], { door: ramp(f, 30, 38) });
};

// Inside: the door bursts open, Priya arms up.
const PRIYA_IN: [number, number] = [-1.75, -1.6];
const DoorBurst: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 16, [DOOR_X, -2.55], PRIYA_IN);
  const cam: CameraShot = { position: lerp3([-0.3, 1.2, 1.4], [-0.45, 1.2, 1.05], f / 50), target: [-1.4, 1.1, -1.9], fov: 52 };
  return rest(cam, f, [pup("priya", PRIYA, w.at, { expression: "excited", ...w.pose, ...(f > 20 ? ARMS_UP : {}) }), ellaSeat(f, { lookX: -1 }), zoeSeat(f, { expression: "shocked", lookX: -1 })], {
    door: Easing.out(Easing.back(2))(ramp(f, 0, 6)),
    nameCard: 99,
  });
};

const PriyaClose: React.FC = () => {
  const f = useShotFrame();
  return rest(close(PRIYA_IN[0], PRIYA_IN[1], f / 45, 0.3), f, [pup("priya", PRIYA, PRIYA_IN, { expression: "excited", armL: [150, -20], armR: [120 + Math.sin(f / 3) * 15, -20], hold: { item: "phone", hand: "R" }, headTilt: Math.sin(f / 5) * 6 })], { door: 1, nameCard: 99 }, { blur: 6 });
};

// Macro: the fork freezes in midair, then stabs the table (gag).
const FORK_AT: Vec3 = [0.12, 0.88, -1.62];
const ForkFreeze: React.FC = () => {
  const f = useShotFrame();
  const stab = Easing.in(Easing.cubic)(ramp(f, 28, 33));
  const cold = ramp(f, 10, 26);
  const cam: CameraShot = { position: lerp3([0.35, 1.0, -0.5], [0.3, 0.98, -0.75], f / 45), target: [0.05, 0.85, -1.7], fov: 42 };
  const fork: Vec3 = [FORK_AT[0], FORK_AT[1] - stab * 0.22, FORK_AT[2] + stab * 0.08];
  return rest(cam, f, [ellaSeat(f, { expression: "skeptical", armR: [50, -60], blink: false, lookX: -0.7, mouthOpen: 0 })], {
    mode: cold > 0.5 ? "cold" : "dinner",
    door: 1,
    nameCard: 99,
    frost: cold,
    children: <Fork position={fork} rotation={[0, 0, stab * Math.PI]} scale={1.3 * squash(f, 33, 0.2)[1]} />,
  }, { truth: cold * 0.6 });
};

// The room goes cold: wide, frost rising, everyone frozen.
const ColdWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.6, 2.4], [0.05, 1.55, 2.05], f / 40), target: [-0.4, 1.0, -1.6], fov: 50 };
  return rest(cam, f, [ellaSeat(f, { expression: "skeptical", ...CROSSED, lookX: -1 }), zoeSeat(f, { expression: "shocked", lookX: 0.6 }), pup("priya", PRIYA, PRIYA_IN, { expression: "shocked", lookX: 1, hold: { item: "phone", hand: "R" }, armR: HOLD })], {
    mode: "cold",
    door: 1,
    nameCard: 99,
    frost: 1,
    children: <Fork position={[FORK_AT[0], FORK_AT[1] - 0.22, FORK_AT[2] + 0.08]} rotation={[0, 0, Math.PI]} scale={1.3} />,
  }, { truth: 0.5 });
};

const EllaRefuse: React.FC = () => {
  const f = useShotFrame();
  return rest(close(ELLA_AT[0], ELLA_AT[1], f / 60, -0.25), f, [ellaSeat(f, { expression: "skeptical", ...CROSSED, headTilt: -5, lookX: -0.5 })], { mode: "cold", door: 1, nameCard: 99, frost: 0.6 }, { truth: 0.4, blur: 6 });
};

// Zoe stands behind Ella's chair, pleading.
const ZOE_PULL: [number, number] = [0.5, -2.08];
const ZoePlead: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 1.25, 1.1], [0.1, 1.2, 0.75], f / 50), target: [0.25, 0.95, -1.95], fov: 44 };
  return rest(cam, f, [ellaSeat(f, { expression: "skeptical", ...CROSSED }), pup("zoe", ZOE, ZOE_PULL, { expression: "excited", armL: [100, -40], armR: [60, -60], headTilt: Math.sin(f / 4) * 8, lookX: -0.6 })], { mode: "cold", door: 1, frost: 0.4, priyaChair: false }, { truth: 0.3 });
};

// Gag: Zoe yanks the chair; it does not budge; she falls flat (high angle).
const ChairYank: React.FC = () => {
  const f = useShotFrame();
  const pull = [4, 12, 20].some((h) => f >= h && f < h + 5);
  const cam: CameraShot = { position: lerp3([0.9, 1.4, 0.4], [0.8, 1.35, 0.15], f / 30), target: [0.25, 0.8, -1.95], fov: 44 };
  return rest(cam, f, [ellaSeat(f, { expression: "smug", ...CROSSED }), pup("zoe", ZOE, ZOE_PULL, { expression: pull ? "shocked" : "excited", armL: pull ? [70, 0] : [60, -40], armR: pull ? [70, 0] : [60, -40], headTilt: pull ? 14 : 0, lookX: -1 })], { mode: "cold", door: 1, frost: 0.3, priyaChair: false }, { truth: 0.3 });
};

const ZOE_FLOOR: Vec3 = [1.15, 0.2, -0.75];
const ZoeFalls: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 0, 8));
  const cam: CameraShot = { position: lerp3([0.08, 2.3, 1.7], [0.1, 2.2, 1.45], f / 40), target: [0.45, 0.25, -1.1], fov: 52 };
  return rest(cam, f, [ellaSeat(f, { expression: "smug", ...CROSSED, lookX: 0.6 })], {
    mode: "cold",
    door: 1,
    frost: 0.2,
    priyaChair: false,
    children: (
      <>
        <group position={ZOE_FLOOR} rotation={[0, 0, (fall * Math.PI) / 2]} scale={squash(f, 8, 0.2)}>
          <PuppetBillboard id="zoe" look={ZOE} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false }} />
        </group>
        {f > 8 && <DizzyStars position={[ZOE_FLOOR[0] - 0.98, 0.3, ZOE_FLOOR[2] + 0.1]} f={f} />}
      </>
    ),
  }, { truth: 0.3 });
};

// Push into Ella's face, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 32));
  const cam: CameraShot = { position: lerp3([0.05, 1.05, 0.0], [0.02, 0.98, -1.45], p), target: [0, 0.95, -1.9], fov: 38 };
  return rest(cam, f, [ellaSeat(f, { expression: "neutral", lookX: 0, blink: false })], { mode: "cold", door: 1 }, { flash: ramp(f, 24, 32), truth: 0.3 });
};

// The vault inside her head.
const VaultWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.9, 3.8], [0.2, 1.8, 3.3], (f + 8) / 50), target: [0, 1.4, -1.8], fov: 52 };
  return vault(cam, f, { inside: f - 4, shut: 0 }, [pup("ella", ELLA, ELLA_VAULT, { sit: true, expression: "smug", armL: [20, -60], armR: [20, -60], bob: breathe(f) * 0.4 })], { flash: 1 - ramp(f, 0, 10) });
};

// Low angle: the padlock PLANS slams shut on the vault door.
const PadlockSlam: React.FC = () => {
  const f = useShotFrame();
  const shut = Easing.in(Easing.cubic)(ramp(f, 22, 28));
  const cam: CameraShot = { position: lerp3([0.25, 0.55, 0.2], [0.2, 0.6, -0.15], f / 40), target: [LOCK_AT[0], 1.55, LOCK_AT[2]], fov: 50 };
  return vault(cam, f, { shut, plans: f - 28, spin: shut * 1.2 }, [], {});
};

// The COMFORT dial, needle buzzing against MAX.
const DialShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.4, 1.85, 0.4], [-1.65, 1.85, -0.1], f / 55), target: [DIAL_AT[0], 1.9, -2.9], fov: 42 };
  return vault(cam, f, { plans: 99, comfort: f - 4, needle: 0.98 + Math.sin(f * 1.3) * 0.02 });
};

// Macro on the dial: someone tries to turn it down, it snaps back.
const DialMacro: React.FC = () => {
  const f = useShotFrame();
  const tug = f > 6 && f < 18 ? Math.sin(((f - 6) / 12) * Math.PI) * 0.25 : 0;
  const cam: CameraShot = { position: lerp3([DIAL_AT[0] + 0.3, 1.8, -1.6], [DIAL_AT[0] + 0.2, 1.78, -1.95], f / 35), target: [DIAL_AT[0], 1.75, -2.9], fov: 40 };
  return vault(cam, f, { plans: 99, comfort: 99, needle: 1 - tug });
};

// High angle: the bolted floor and the NOT MOVING sign.
const BoltsHigh: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 2.6, 1.6], [0.7, 2.5, 1.3], f / 45), target: [0.9, 0.5, -1.4], fov: 50 };
  return vault(cam, f, { plans: 99, comfort: 99, moving: f - 8, boltTurn: Math.min(f, 12) * 0.08 });
};

// Ella pats the sign, smug, on her vault couch.
const SignPat: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.2, 1.6], [-0.1, 1.15, 1.3], f / 40), target: [0.02, 1.0, -1.5], fov: 54 };
  return vault(cam, f, { plans: 99, comfort: 99, moving: 99 }, [pup("ella", ELLA, ELLA_VAULT, { sit: true, expression: "smug", armL: [20, -60], armR: [20, -60], headTilt: Math.sin(f / 8) * 5, bob: breathe(f) * 0.4 })]);
};

// The GRUDGES counter in the corner.
const CounterShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.3, 1.8, 0.3], [1.55, 1.85, -0.2], f / 45), target: [COUNTER_AT[0], 1.95, -2.9], fov: 42 };
  return vault(cam, f, { plans: 99, comfort: 99, grudges: f - 49 });
};

// Macro: 31, Ella tries to push it down, it won't move.
const CounterMacro: React.FC = () => {
  const f = useShotFrame();
  const press = [8, 18].some((h) => f >= h && f < h + 4) ? 1 : 0;
  const cam: CameraShot = { position: lerp3([COUNTER_AT[0] - 0.2, 1.9, -0.9], [COUNTER_AT[0] - 0.12, 1.88, -1.2], f / 40), target: [COUNTER_AT[0], 1.85, -2.85], fov: 42 };
  return vault(cam, f, { plans: 99, comfort: 99, grudges: 99, flip: press * 0.3 });
};

// Number 31: back to the opening, Zoe still holding the fry.
const ThiefTag: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.3, 0.6], [-0.5, 1.25, 0.25], f / 40), target: [ZOE_AT[0], 1.1, ZOE_AT[1]], fov: 44 };
  return rest(cam, f, [zoeSeat(f, { expression: "shocked", armL: [110, -100], lookX: 0.6 }), ellaSeat(f, { expression: "skeptical", ...CROSSED, lookX: -1 })], {
    fries: 6,
    children: (
      <>
        <Fry position={[ZOE_AT[0] - 0.2, 1.0, ZOE_AT[1] + 0.12]} rotation={[0, 0, 0.3]} />
        <Label text="#31" position={[ZOE_AT[0], 1.55, ZOE_AT[1]]} width={0.45} fg="#ffffff" bg="#e0262f" appear={f - 4} />
      </>
    ),
  });
};

const ThiefCounter: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([COUNTER_AT[0] - 0.5, 1.9, 0.6], [COUNTER_AT[0] - 0.48, 1.88, 0.3], f / 40), target: [COUNTER_AT[0] - 0.45, 1.85, -2.85], fov: 48 };
  return vault(cam, f, { plans: 99, comfort: 99, grudges: 99, photo: f - 4 });
};

// The sushi place: Priya alone with the conveyor.
const SushiAlone: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.45, 1.15, 0.6], [0.35, 1.15, 0.3], f / 40), target: [0.0, 1.05, -1.8], fov: 48 };
  return sushi(cam, f, [pup("priya", PRIYA, [0.0, -1.55], { sit: true, expression: "skeptical", lookX: 0.6, headTilt: -6, bob: breathe(f) * 0.4, armR: [30, -70] })], { alone: f - 8 });
};

// Dessert: the waiter sets down cake, Ella beams.
const WAITER_AT: [number, number] = [0.85, -1.6];
const Dessert: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 1.3], [0.15, 1.25, 0.95], f / 40), target: [0.3, 0.9, -1.6], fov: 48 };
  return rest(cam, f, [ellaSeat(f, { expression: "excited", ...ARMS_UP }), pup("waiter", WAITER, WAITER_AT, { expression: "neutral", armL: [40, -60], lookX: -0.6, bob: breathe(f + 5) })], { mode: "dessert", fries: 0, priyaChair: false, dish: "cake" });
};

// The cousin reaches for the bread basket; Ella's eyes slide over.
const COUSIN_AT: [number, number] = [PRIYA_CHAIR[0], PRIYA_CHAIR[1]];
const BreadReach: React.FC = () => {
  const f = useShotFrame();
  const reach = ramp(f, 4, 22);
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.0], [0.05, 1.3, 0.7], f / 50), target: [0.3, 0.85, -1.5], fov: 46 };
  return rest(cam, f, [
    pup("cousin", COUSIN, COUSIN_AT, { sit: true, expression: "excited", armR: [30 + reach * 50, -40], lookX: -0.6, bob: breathe(f) * 0.4 }),
    ellaSeat(f, { expression: f > 20 ? "skeptical" : "excited", lookX: f > 20 ? 1 : 0, blink: false }),
  ], { mode: "dessert", fries: 0, dish: "cake", bread: true });
};

// The counter clicks to 32.
const Click32: React.FC = () => {
  const f = useShotFrame();
  const flip = f >= 26 && f < 32 ? 1 : 0;
  const cam: CameraShot = { position: lerp3([COUNTER_AT[0] - 0.35, 1.95, -0.6], [COUNTER_AT[0] - 0.2, 1.92, -1.1], Easing.out(Easing.cubic)(ramp(f, 0, 40))), target: [COUNTER_AT[0], 1.85, -2.85], fov: 42 };
  return vault(cam, f, { plans: 99, comfort: 99, grudges: 99, value: f >= 28 ? 32 : 31, flip: flip * 0.4 });
};

const SHOTS: Shot[] = [
  [0, 32, HookFry, false],
  [32, 60, FryTop, false],
  [60, 88, GlareOTS, false],
  [88, 115, GlareClose, false],
  [115, 213, CouchWide, true],
  [213, 251, CouchLow, false],
  [251, 305, BlanketLift, false],
  [305, 337, PerfumeMacro, true],
  [337, 371, PerfumeSpray, false],
  [371, 453, PlanBoard, true],
  [453, 490, TableSet, true],
  [490, 527, PastaTop, false],
  [527, 557, ChairSit, false],
  [557, 600, PriyaRun, true],
  [600, 640, DoorBurst, true],
  [640, 689, PriyaClose, false],
  [689, 731, ForkFreeze, false],
  [731, 768, ColdWide, false],
  [768, 844, EllaRefuse, false],
  [844, 898, ZoePlead, false],
  [898, 947, ChairYank, false],
  [947, 981, ZoeFalls, false],
  [981, 1018, HeadPush, false],
  [1018, 1082, VaultWide, true],
  [1082, 1141, PadlockSlam, false],
  [1141, 1199, DialShot, false],
  [1199, 1235, DialMacro, false],
  [1235, 1285, BoltsHigh, false],
  [1285, 1329, SignPat, false],
  [1329, 1415, CounterShot, false],
  [1415, 1477, CounterMacro, false],
  [1477, 1523, ThiefTag, true],
  [1523, 1551, ThiefCounter, true],
  [1551, 1611, SushiAlone, true],
  [1611, 1651, Dessert, true],
  [1651, 1716, BreadReach, false],
  [1716, TIMING.totalFrames, Click32, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.12, until: 115 },
  { at: 2, src: sfx("pop"), volume: 0.55 },
  { at: 6, src: sfx("pop"), volume: 0.45 },
  { at: 34, src: sfx("whoosh"), volume: 0.35 },
  { at: 62, src: sfx("tape-stop"), volume: 0.3 },
  { at: 119, src: sfx("pop"), volume: 0.5 },
  ...[137, 151, 165].map((at) => ({ at, src: sfx("pop"), volume: 0.45 })),
  { at: 217, src: sfx("pop"), volume: 0.45 },
  { at: 261, src: sfx("pop"), volume: 0.45 },
  { at: 270, src: sfx("near-miss"), volume: 0.3 },
  { at: 311, src: sfx("pop"), volume: 0.45 },
  { at: 341, src: sfx("whoosh"), volume: 0.3 },
  { at: 375, src: sfx("pop"), volume: 0.5 },
  { at: 380, src: sfx("paper"), volume: 0.35 },
  { at: 453, src: sfx("ambience"), volume: 0.15, until: 557 },
  { at: 455, src: sfx("pop"), volume: 0.45 },
  { at: 467, src: sfx("pop"), volume: 0.45 },
  { at: 494, src: sfx("chime"), volume: 0.3 },
  // The twist: footsteps, riser ending on the door, sting on it.
  ...[560, 568, 576, 584, 592].map((at) => ({ at, src: sfx("tick"), volume: 0.35 })),
  { at: 554, src: sfx("riser"), volume: 0.25 },
  { at: 600, src: sfx("door"), volume: 0.55 },
  { at: 601, src: sfx("boom"), volume: 0.55 },
  { at: 602, src: sfx("sting"), volume: 0.4 },
  { at: 600, src: sfx("ambience"), volume: 0.18, until: 689 },
  { at: 699, src: sfx("tape-stop"), volume: 0.45 },
  { at: 705, src: sfx("whoosh"), volume: 0.35 },
  { at: 722, src: sfx("boom"), volume: 0.5 },
  { at: 731, src: sfx("hum"), volume: 0.2, until: 898 },
  ...[902, 910, 918].map((at) => ({ at, src: sfx("drawer"), volume: 0.4 })),
  { at: 955, src: sfx("boom"), volume: 0.6 },
  { at: 960, src: sfx("chime"), volume: 0.3 },
  { at: 985, src: sfx("whoosh"), volume: 0.45 },
  { at: 1002, src: sfx("riser"), volume: 0.15 },
  { at: 1018, src: sfx("hum"), volume: 0.18, until: 1477 },
  { at: 1022, src: sfx("pop"), volume: 0.5 },
  { at: 1110, src: sfx("stamp"), volume: 0.7 },
  { at: 1112, src: sfx("pop"), volume: 0.4 },
  { at: 1145, src: sfx("pop"), volume: 0.45 },
  ...[1150, 1160, 1170, 1180, 1190].map((at) => ({ at, src: sfx("tick"), volume: 0.25 })),
  { at: 1205, src: sfx("bill-whirr"), volume: 0.35 },
  { at: 1217, src: sfx("reel-stop"), volume: 0.45 },
  { at: 1235, src: sfx("bill-whirr"), volume: 0.35 },
  { at: 1243, src: sfx("pop"), volume: 0.5 },
  { at: 1290, src: sfx("button"), volume: 0.35 },
  { at: 1378, src: sfx("pop"), volume: 0.5 },
  ...[1423, 1433].map((at) => ({ at, src: sfx("button"), volume: 0.6 })),
  { at: 1440, src: sfx("near-miss"), volume: 0.3 },
  { at: 1477, src: sfx("ambience"), volume: 0.12, until: 1523 },
  { at: 1481, src: sfx("pop"), volume: 0.5 },
  { at: 1527, src: sfx("pop"), volume: 0.5 },
  { at: 1529, src: sfx("paper"), volume: 0.35 },
  { at: 1551, src: sfx("hum"), volume: 0.15, until: 1611 },
  { at: 1559, src: sfx("pop"), volume: 0.45 },
  { at: 1572, src: sfx("near-miss"), volume: 0.3 },
  { at: 1611, src: sfx("ambience"), volume: 0.15, until: 1716 },
  { at: 1616, src: sfx("chime"), volume: 0.35 },
  { at: 1676, src: sfx("tick"), volume: 0.35 },
  { at: 1716, src: sfx("hum"), volume: 0.15, until: TIMING.totalFrames },
  { at: 1742, src: sfx("stamp"), volume: 0.6 },
  { at: 1744, src: sfx("credit-blip"), volume: 0.4 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 557, volume: 0.16 },
  { src: MUSIC_FILES.tension, from: 557, to: 981, volume: 0.21 },
  { src: MUSIC_FILES.mystery, from: 981, to: 1477, volume: 0.22 },
  { src: MUSIC_FILES.lounge, from: 1477, to: TIMING.totalFrames, volume: 0.18 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
