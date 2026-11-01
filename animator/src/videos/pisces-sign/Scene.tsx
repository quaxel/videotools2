import React from "react";
import { Easing } from "remotion";
import * as THREE from "three";
import {
  Board,
  CameraRig,
  CameraShot,
  Chair,
  Door,
  faceChange,
  Halo,
  InkBox,
  jump,
  Label,
  Lamp,
  lerp3,
  moodBackground,
  moveChange,
  MUSIC_FILES,
  MusicCue,
  Plant,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  toonRamp,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import {
  AisleRunner,
  Ball,
  Bed,
  BowChair,
  BucketStand,
  CafeCounter,
  Chalkboard,
  Chandelier,
  CouplePhoto,
  Crib,
  DialStub,
  DizzyStars,
  Dog,
  DreamTank,
  DressForm,
  DriftBubbles,
  EspressoMachine,
  FairyLights,
  Flood,
  FlowerArch,
  FlowerCooler,
  GlassDoor,
  Grinder,
  HangingPlant,
  HeartBurst,
  ImpactStar,
  LunchBag,
  MugShelf,
  MusicNotes,
  PaperRolls,
  PastryCase,
  PendantBulb,
  Planter,
  RealityDial,
  RecordPlayer,
  Register,
  Railing,
  Ring,
  Rooftops,
  Rose,
  SadSpeaker,
  SideTable,
  SkyPlane,
  Splashes,
  TANK,
  Tears,
  TearsTap,
  ThoughtCloud,
  TipJar,
  Tissues,
  TissuePile,
  WallPipe,
  WeddingCake,
  WrapCounter,
} from "./props";
import { anticipate, settle } from "../../engine/motion";
import TIMING_JSON from "./timing.json";

// "A Pisces Already Planned the Wedding" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "pisces-sign";
export const timing = TIMING;

// ---------- cast (every woman has long hair: build every female look through `woman`) ----------

const woman = (look: Omit<PuppetLook, "long">): PuppetLook => ({ ...look, long: true });
const man = (look: Omit<PuppetLook, "long">): PuppetLook => ({ ...look });

const MILA_LOOK = { skin: "#f3d2b3", hair: "#e8c15a", outfit: "#a56fe0", pattern: "#ffd6f0" };
const MILA = woman(MILA_LOOK);
const MILA_BRIDE = woman({ ...MILA_LOOK, outfit: "#ffffff", pattern: "#ffc2dc" });
const SARA = woman({ skin: "#8d5524", hair: "#1d1a1a", outfit: "#1fb5b0", glasses: true });
const SAM = man({ skin: "#d9a47e", hair: "#3a2a20", outfit: "#6b4429" });
const SAM_GROOM = man({ skin: "#d9a47e", hair: "#3a2a20", outfit: "#13235e" });
const WIFE = woman({ skin: "#c68642", hair: "#1d1a1a", outfit: "#e0262f" });
const FLORIST = woman({ skin: "#fbe9d6", hair: "#a8541e", outfit: "#2f8a3a" });
const FLORIST_GROOM = woman({ skin: "#fbe9d6", hair: "#a8541e", outfit: "#13235e" });
// Café customers (one woman, one man) at the back.
const CUSTOMERS: PuppetLook[] = [woman({ skin: "#e0ac69", hair: "#5a3a2a", outfit: "#4f7dff" }), man({ skin: "#f1c9a5", hair: "#8a5a3a", outfit: "#3fae5a" })];

const K = 1.3 / 1060; // metres per puppet unit

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.08, ty = 0.92, d = 1.85): CameraShot => ({
  position: lerp3([px + dx, y, pz + d], [px + dx * 0.8, y - 0.03, pz + d - 0.3], p),
  target: [px, ty, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// Hand point in world space for a reach (puppet standing at `at`).
const handAt = (at: [number, number], reach: [number, number], dz = 0.12): Vec3 => [at[0] + reach[0] * K, -reach[1] * K, at[1] + dz];

// ---------- lights (strong sources only) ----------

const bulbLight: PuppetLight = { points: [{ position: [0.1, 2.0, -0.9], color: "#ffd9a0", strength: 1.6, range: 3.2 }] };
const chandelierLight: PuppetLight = { points: [{ position: [0, 2.3, -1.0], color: "#fff0e0", strength: 1.4, range: 3.4 }] };
const lampLight: PuppetLight = { points: [{ position: [1.4, 1.4, -1.6], color: "#ffe0b0", strength: 1.3, range: 2.6 }] };
const sunsetBack: PuppetLight = { distant: [{ direction: [0.35, 0.25, -1], color: "#ffb0a0", strength: 1.7 }] };
const morningSun: PuppetLight = { distant: [{ direction: [-0.8, 0.5, 0.4], color: "#fff4e0", strength: 1.5 }] };
const tankLight: PuppetLight = { points: [{ position: [-0.3, 2.1, -1.6], color: "#bff4f8", strength: 1.3, range: 3.0 }] };
const windowDay: PuppetLight = { distant: [{ direction: [0.7, 0.6, 0.5], color: "#f4fff0", strength: 1.3 }] };

// ---------- locations ----------

// The coffee shop counter: brown wood, espresso machine, chalkboard, bulbs, the PISCES badge, the wife's photo.
const SAM_AT: [number, number] = [0.1, -1.6];
const MILA_CAFE: [number, number] = [0.15, -0.2];
const WIFE_AT: [number, number] = [0.5, -1.62];
const BACK_DOOR_X = 1.9;
const PHOTO_AT: Vec3 = [-0.78, 0.8, -0.9];
const CafeSet: React.FC<{ camera: CameraShot; f: number; badge?: number; door?: number; customers?: boolean; children?: React.ReactNode }> = ({ camera, f, badge = 99, door = 0, customers = true, children }) => (
  <Room camera={camera} mood="warm" floor="#7a4a2a" wall="#a8542e" stripe="#3d2416" width={8} depth={6} wallPattern="brick" floorPattern="wood">
    <CafeCounter position={[0, 0, -1.0]} width={2.6} />
    <PastryCase position={[0.85, 0.655, -1.02]} width={0.7} />
    <Register position={[-0.45, 0.65, -1.05]} />
    <CouplePhoto position={PHOTO_AT} rotation={[-0.1, 0.2, 0]} size={0.2} />
    <TipJar position={[-1.05, 0.65, -0.9]} />
    {/* back counter */}
    <InkBox size={[2.8, 0.9, 0.5]} position={[-0.2, 0.45, -2.6]} color="#5a3420" />
    <InkBox size={[2.86, 0.05, 0.54]} position={[-0.2, 0.925, -2.6]} color="#b07a45" />
    <EspressoMachine position={[-0.35, 0.95, -2.6]} f={f} />
    <Grinder position={[0.45, 0.95, -2.6]} />
    <Chalkboard position={[-0.35, 2.05, -2.92]} width={1.4} height={0.8} />
    <MugShelf position={[1.0, 1.55, -2.85]} width={1.0} />
    <Door position={[BACK_DOOR_X, 0, -2.94]} open={door} color="#3d2416" glow={door > 0.05 ? "#ffe6b0" : undefined} sign="STAFF" />
    <ZodiacBadge sign="pisces" position={[-1.75, 2.15, -2.9]} size={0.62} bg="#7b3fd0" fg="#ffffff" appear={badge} />
    <Label text="PISCES" position={[-1.75, 1.62, -2.92]} width={0.75} fg="#ffffff" bg="#7b3fd0" appear={badge - 4} />
    {[-0.9, -0.2, 0.5, 1.2].map((x, i) => (
      <PendantBulb key={x} position={[x, 2.4 - (i % 2) * 0.15, -1.0]} drop={0.6} />
    ))}
    <Plant position={[-2.8, 0, -2.5]} />
    <Shelf position={[2.9, 0, -2.6]} width={0.9} rows={3} color="#5a3420" seed={5} />
    {/* a café table with two customers at the back left */}
    <InkCylinder3 position={[-2.3, 0, -1.4]} />
    {customers && <Chair position={[-2.75, 0, -1.4]} rotationY={Math.PI / 2} color="#e0262f" />}
    {customers && <Chair position={[-1.85, 0, -1.4]} rotationY={-Math.PI / 2} color="#e0262f" />}
    {children}
  </Room>
);
// Small round café table.
const InkCylinder3: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.6, 0.03, 0.6]} position={[0, 0.72, 0]} color="#f2e8d8" ink={0.004} />
    <InkBox size={[0.05, 0.7, 0.05]} position={[0, 0.36, 0]} color="#2a2f3a" ink={0.003} />
    <InkBox size={[0.36, 0.02, 0.36]} position={[0, 0.01, 0]} color="#2a2f3a" ink={0.003} />
  </group>
);
const customerPups = (f: number): PuppetPlacement[] => [
  pup("c0", CUSTOMERS[0], [-2.72, -1.4], { expression: "happy", sit: true, view: "side", facing: 1, hold: { item: "cup", hand: "R" }, headTilt: Math.sin(f * 0.07) * 5 }),
  pup("c1", CUSTOMERS[1], [-1.88, -1.4], { expression: "neutral", sit: true, view: "side", facing: -1, hold: { item: "phone", hand: "L" } }),
];

// The dream wedding hall: hot pink, flower arch with the PISCES badge, aisle with bow chairs, chandeliers, fairy lights.
const ARCH_Z = -2.3;
const MILA_ALTAR: [number, number] = [-0.32, -1.9];
const GROOM_ALTAR: [number, number] = [0.32, -1.9];
const WeddingSet: React.FC<{ camera: CameraShot; f: number; badge?: number; cribs?: number; dress?: boolean; song?: number; dog?: number; dogTag?: number; children?: React.ReactNode }> = ({
  camera,
  f,
  badge = 99,
  cribs,
  dress,
  song,
  dog,
  dogTag,
  children,
}) => (
  <Room camera={camera} mood="dream" floor="#c43c78" wall="#e8458f" stripe="#ffd6e6" width={8} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <FlowerArch position={[0, 0, ARCH_Z]} radius={0.95} f={f} />
    <ZodiacBadge sign="pisces" position={[0, 2.5, ARCH_Z + 0.08]} size={0.42} bg="#7b3fd0" fg="#ffffff" appear={badge} />
    <AisleRunner z0={ARCH_Z + 0.3} z1={2.5} width={0.9} />
    {[-1, 1].map((s) =>
      [-1.0, -0.3, 0.4].map((z, r) => (
        <group key={`${s}${r}`}>
          <BowChair position={[s * 0.75, 0, z]} />
          <BowChair position={[s * 1.25, 0, z]} bow={false} />
        </group>
      )),
    )}
    <Chandelier position={[-1.1, 2.6, -1.2]} f={f} />
    <Chandelier position={[1.1, 2.6, -1.2]} f={f + 30} />
    <FairyLights from={[-3.5, 2.9, -2.9]} to={[0, 2.85, ARCH_Z]} sag={0.35} f={f} />
    <FairyLights from={[0, 2.85, ARCH_Z]} to={[3.5, 2.9, -2.9]} sag={0.35} f={f + 7} />
    <FairyLights from={[-3.5, 2.7, -2.92]} to={[3.5, 2.7, -2.92]} sag={0.25} count={30} f={f + 3} />
    <WeddingCake position={[2.2, 0, -2.4]} />
    {cribs !== undefined &&
      [-0.85, 0, 0.85].map((x, i) => (
        <group key={x}>
          <Crib position={[x, 0, -1.25]} color={["#7fd3ff", "#ffd23f", "#9ff0b0"][i]} f={f + i * 20} />
          <Label text={["LUNA", "RIVER", "SKY"][i]} position={[x, 0.98, -1.04]} width={0.48} fg="#ffffff" bg="#7b3fd0" appear={cribs - i * 9} />
        </group>
      ))}
    {dress && (
      <>
        <DressForm position={[-1.0, 0, -1.55]} f={f} />
        <Label text="THE DRESS" position={[-1.0, 1.55, -1.5]} width={0.6} fg="#ffffff" bg="#7b3fd0" />
      </>
    )}
    {song !== undefined && (
      <>
        <InkBox size={[0.6, 0.7, 0.45]} position={[0.9, 0.35, -1.55]} color="#fff6fc" ink={0.006} />
        <RecordPlayer position={[0.9, 0.7, -1.55]} f={f} />
        <MusicNotes position={[0.9, 0.9, -1.4]} f={f} count={5} color="#7b3fd0" spread={0.4} />
        <Label text="OUR SONG" position={[0.9, 1.45, -1.5]} width={0.6} fg="#ffffff" bg="#7b3fd0" appear={song} />
      </>
    )}
    {dog !== undefined && <Dog position={[0.0, 0, -1.2]} f={f} bow tag={dogTag !== undefined ? "BISCUIT" : undefined} tagAppear={dogTag} hop={Math.max(0, Math.sin(f * 0.3)) * 0.04 * (dog > 0 ? 1 : 0)} />}
    {children}
  </Room>
);

// Mila's room: violet, the bed, a chair she apologises to, a side table with tissues, a mood board, a lamp, a window.
const BED_AT: Vec3 = [-1.55, 0, -1.8];
const CHAIR_AT: Vec3 = [0.35, 0, -1.55];
const MILA_ROOM: [number, number] = [0.6, -1.0];
const RoomSet: React.FC<{ camera: CameraShot; f: number; name?: number; traits?: number; night?: boolean; chairKick?: number; tissues?: number; children?: React.ReactNode }> = ({
  camera,
  f,
  name,
  traits,
  night,
  chairKick = 0,
  tissues = 0,
  children,
}) => (
  <Room camera={camera} mood={night ? "night" : "dream"} floor="#4a1f8a" wall={night ? "#5a2aa8" : "#8a4fd0"} stripe="#ffd6f0" width={8} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <Bed position={BED_AT} color="#ff5fa8" sheet="#ffd6f0" />
    <group position={[CHAIR_AT[0] + chairKick * 0.12, 0, CHAIR_AT[2] - chairKick * 0.05]} rotation={[0, chairKick * 0.25, 0]}>
      <Chair position={[0, 0, 0]} color="#ffd23f" />
    </group>
    <SideTable position={[-0.6, 0, -2.4]} />
    <Tissues position={[-0.6, 0.545, -2.4]} f={f} />
    <Lamp position={[1.4, 0, -2.5]} on color="#ffe0b0" />
    <Board position={[0.6, 1.75, -2.92]} cards={["DRESS", "SONG", "DOG", "SAM"]} width={1.1} height={0.75} color="#ffd6f0" />
    <Window position={[2.3, 1.65, -2.94]} size={[0.9, 1.0]} sky={night ? "#1b1a5e" : "#7fd3ff"} />
    <Shelf position={[-2.9, 0, -2.6]} width={0.8} rows={3} color="#5a2a8a" seed={6} />
    {tissues > 0 && <TissuePile x={-1.0} z={-1.3} count={Math.round(4 + tissues * 8)} spread={0.7} />}
    {name !== undefined && <Label text="MILA" position={[-1.4, 2.35, -2.9]} width={0.7} fg="#ffffff" bg="#e0267f" appear={name} />}
    {traits !== undefined &&
      ["DREAMY", "KIND"].map((t, i) => <Label key={t} text={t} position={[-1.4, 1.95 - i * 0.3, -2.9]} width={0.7} fg="#5a2a8a" bg="#ffd6f0" appear={traits - i * 14} />)}
    {children}
  </Room>
);

// The balcony at sunset: magenta-red sky, layered rooftops with parallax, railing with planters, string lights.
const MILA_BALC: [number, number] = [0.05, -0.55];
const BalconySet: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode }> = ({ camera, f, children }) => {
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#e0306a"]} />
      <fog attach="fog" args={["#e04a7a", 12, 30]} />
      <ambientLight intensity={1.3} color="#ffe0ea" />
      <hemisphereLight args={["#ffb0c8", "#3b2a4f", 0.5]} />
      <directionalLight position={[1, 3, -5]} intensity={1.6} color="#ffc0a0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-3} />
      <directionalLight position={[2, 4, 4]} intensity={0.9} color="#ffe6f0" />
      <group position={[camX, 0, 0]}>
        <SkyPlane stops={["#4a1f7a", "#b02a8a", "#e0306a", "#ff6a7a", "#ffb08a"]} position={[0, 4, -24]} size={[70, 26]} />
        <mesh position={[1.6, 0.9, -23]}>
          <circleGeometry args={[1.4, 40]} />
          <meshBasicMaterial color="#ffe0a0" fog={false} toneMapped={false} />
        </mesh>
        <Halo position={[1.6, 0.9, -22.8]} size={7} color="#ffb08a" strength={0.35} />
      </group>
      <Rooftops z={-20} shift={camX * 0.7} color="#8a2a6a" seed={3} base={-3} />
      <Rooftops z={-14} shift={camX * 0.35} color="#5a1f5a" seed={11} base={-3.2} windows="#ffd27a" />
      <Rooftops z={-9} shift={0} color="#3b1a42" seed={23} base={-3.5} windows="#ffe6a0" />
      {/* the balcony slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow>
        <planeGeometry args={[6, 3.6]} />
        <meshToonMaterial color="#8a4a3a" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-3 + i * 0.5 + 0.25, 0.002, 0.5]}>
          <planeGeometry args={[0.012, 3.6]} />
          <meshBasicMaterial color="#5a2a24" />
        </mesh>
      ))}
      <InkBox size={[6, 0.16, 0.2]} position={[0, -0.08, -1.25]} color="#c9a0a0" ink={0.006} />
      <Railing z={-1.2} from={-2.5} to={2.5} height={1.0} />
      <Planter position={[-0.85, 1.03, -1.2]} width={0.6} flowers="#ff5fa8" seed={2} />
      <Planter position={[0.95, 1.03, -1.2]} width={0.5} flowers="#ffd23f" seed={7} />
      <Planter position={[-2.0, 0, -0.9]} width={0.5} flowers="#ffffff" seed={4} />
      <Plant position={[2.1, 0, -0.85]} scale={1.3} />
      <FairyLightsBalc f={f} />
      <Chair position={[1.25, 0, -0.5]} rotationY={-0.5} color="#2a2440" />
      {children}
    </>
  );
};
const FairyLightsBalc: React.FC<{ f: number }> = ({ f }) => (
  <group>
    {Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      const x = -2.5 + t * 5;
      const y = 2.15 - Math.sin(((t * 2) % 1) * Math.PI) * 0.22;
      const tw = 0.8 + 0.2 * Math.sin(f * 0.2 + i);
      return <Ball key={i} position={[x, y, -1.0]} radius={0.022 * tw} color="#ffe1a8" glow />;
    })}
  </group>
);

// Street outside the café on a blue morning: the café front with its glass door, a window, an A-frame sign, a tree.
const DOOR_X = 0.0;
const StreetFront: React.FC<{ camera: CameraShot; f: number; wobble?: number; smudge?: number; day?: string; children?: React.ReactNode }> = ({ camera, f, wobble = 0, smudge = 0, day, children }) => {
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#4f8ae0"]} />
      <fog attach="fog" args={["#6a9ae8", 12, 30]} />
      <ambientLight intensity={1.5} color="#e8f0ff" />
      <hemisphereLight args={["#bfe0ff", "#2a3a5a", 0.5]} />
      <directionalLight position={[-3, 5, 3]} intensity={1.8} color="#fff4e0" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-3} />
      <group position={[camX, 0, 0]}>
        <SkyPlane stops={["#1f5fd0", "#4f8ae0", "#9fc8ff"]} position={[0, 6, -20]} size={[60, 30]} />
      </group>
      {/* pavement outside (z > 0) and the café floor inside (z < 0) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshToonMaterial color="#7a90b8" gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -2]} receiveShadow>
        <planeGeometry args={[6, 4]} />
        <meshToonMaterial color="#7a4a2a" gradientMap={toonRamp} />
      </mesh>
      {/* facade: blue-painted shopfront, door in the middle, big window on the right, sign band */}
      <InkBox size={[2.0, 3.0, 0.14]} position={[-1.5, 1.5, 0]} color="#1f4fa8" ink={0.008} />
      <InkBox size={[0.4, 3.0, 0.14]} position={[0.7, 1.5, 0]} color="#1f4fa8" ink={0.008} />
      <InkBox size={[1.4, 0.4, 0.14]} position={[1.6, 0.2, 0]} color="#1f4fa8" ink={0.008} />
      <InkBox size={[1.4, 0.7, 0.14]} position={[1.6, 2.65, 0]} color="#1f4fa8" ink={0.008} />
      <InkBox size={[1.0, 0.7, 0.14]} position={[DOOR_X, 2.65, 0]} color="#1f4fa8" ink={0.008} />
      <InkBox size={[2.0, 3.0, 0.14]} position={[3.3, 1.5, 0]} color="#1f4fa8" ink={0.008} />
      <Label text="COFFEE" position={[-1.5, 2.55, 0.08]} width={1.1} fg="#ffffff" bg="#13235e" />
      <ZodiacBadge sign="pisces" position={[-1.5, 1.7, 0.09]} size={0.5} bg="#7b3fd0" fg="#ffffff" />
      {/* the shop window */}
      <mesh position={[1.6, 1.4, 0]}>
        <planeGeometry args={[1.4, 2.0]} />
        <meshBasicMaterial color="#bcd9e8" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <InkBox size={[1.44, 0.05, 0.1]} position={[1.6, 2.38, 0]} color="#1e2124" ink={0.003} />
      <mesh position={[1.4, 1.6, 0.004]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[0.07, 1.5]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <GlassDoor position={[DOOR_X, 0, 0]} wobble={wobble} smudge={smudge} f={f} side="out" />
      {/* inside glimpsed through the glass: counter and a warm bulb */}
      <InkBox size={[2.4, 0.62, 0.6]} position={[0.6, 0.31, -2.4]} color="#6b4429" />
      <PendantBulb position={[0.4, 2.3, -2.0]} drop={0.5} />
      {/* outside: A-frame chalk sign, a tree in a planter, a bike rack */}
      <group position={[-0.95, 0, 0.75]} rotation={[0, 0.3, 0]}>
        <InkBox size={[0.5, 0.75, 0.04]} position={[0, 0.4, 0.12]} rotation={[-0.25, 0, 0]} color="#2b2b28" ink={0.005} />
        <InkBox size={[0.5, 0.75, 0.04]} position={[0, 0.4, -0.12]} rotation={[0.25, 0, 0]} color="#2b2b28" ink={0.005} />
        {day && <Label text={day} position={[0, 0.48, 0.16]} rotation={[-0.25, 0, 0]} width={0.42} fg="#ffffff" bg="#2b2b28" border={false} />}
      </group>
      <group position={[2.6, 0, 0.9]}>
        <InkBox size={[0.5, 0.4, 0.5]} position={[0, 0.2, 0]} color="#5a6a8a" ink={0.005} />
        <InkBox size={[0.08, 1.4, 0.08]} position={[0, 1.0, 0]} color="#6b4429" ink={0.004} />
        <Ball position={[0, 1.9, 0]} radius={0.5} color="#3fae5a" />
        <Ball position={[0.25, 1.65, 0.2]} radius={0.32} color="#2f8a3a" />
      </group>
      {children}
    </>
  );
};

// Inside her head: a deep-teal flooded room. The DAYDREAMS tank in the middle; a blue gauge corner (the REALITY dial
// fell off the pipe and lies on the floor), a violet corner with the TEARS tap, a magenta corner with the speaker.
const TANK_AT: Vec3 = [-0.4, 0, -2.0];
const STUB_AT: Vec3 = [1.55, 1.35, -2.86];
const DIAL_FLOOR: Vec3 = [1.45, 0.07, -1.55];
const TAP_AT: Vec3 = [2.75, 1.05, -2.86];
const SPEAKER_AT: Vec3 = [-2.65, 0, -2.45];
const MILA_HEAD: [number, number] = [0.75, -1.05];
const HeadSet: React.FC<{ camera: CameraShot; f: number; label?: number; over?: number; flood?: number; dialLabel?: number; tapLabel?: number; tapTurn?: number; songLabel?: number; children?: React.ReactNode }> = ({
  camera,
  f,
  label,
  over = 1,
  flood = 1,
  dialLabel,
  tapLabel,
  tapTurn = 0,
  songLabel,
  children,
}) => (
  <Room camera={camera} mood="cold" floor="#123a4a" wall="#0e6670" stripe="#4fc3c8" width={8} depth={6} wallPattern="tile" floorPattern="concrete">
    {/* coloured corner panels: blue gauge wall, violet tap wall, magenta speaker wall */}
    <InkBox size={[1.3, 2.6, 0.03]} position={[1.55, 1.3, -2.93]} color="#2350d8" ink={0} />
    <InkBox size={[1.3, 2.6, 0.03]} position={[2.95, 1.3, -2.93]} color="#7a2fd0" ink={0} />
    <InkBox size={[1.4, 2.6, 0.03]} position={[-2.75, 1.3, -2.93]} color="#c41f8a" ink={0} />
    <WallPipe from={0.8} to={3.6} y={1.35} z={-2.86} />
    <WallPipe from={0.8} to={3.6} y={2.3} z={-2.86} color="#4a6a66" r={0.035} />
    <DialStub position={[STUB_AT[0], STUB_AT[1] - 0.2, STUB_AT[2]]} />
    <RealityDial position={DIAL_FLOOR} fallen={1} f={f} label={dialLabel} scale={0.9} />
    <InkBox size={[0.04, 1.35, 0.04]} position={[TAP_AT[0], 0.67, TAP_AT[2]]} color="#5f7470" ink={0.003} />
    <TearsTap position={TAP_AT} f={f} turn={tapTurn} label={tapLabel} />
    <Flood x={TAP_AT[0]} z={TAP_AT[2] + 0.45} w={0.8} d={0.6} grow={1} f={f} seed={5} />
    <Splashes x={TAP_AT[0]} z={TAP_AT[2] + 0.2} width={0.05} f={f} count={1} seed={3} />
    <SadSpeaker position={SPEAKER_AT} f={f} label={songLabel} />
    <Halo position={[SPEAKER_AT[0], 1.3, -2.85]} size={2.2} color="#ff2fa0" strength={0.22 + 0.1 * Math.max(0, Math.sin(f * 0.45))} />
    <Halo position={[TAP_AT[0], 1.6, -2.85]} size={1.8} color="#a05fff" strength={0.2} />
    <DreamTank position={TANK_AT} f={f} over={over} label={label} />
    <Halo position={[TANK_AT[0], 1.2, TANK_AT[2] + 0.45]} size={3} color="#4fc3c8" strength={0.18} />
    <Flood x={TANK_AT[0]} z={TANK_AT[2] + 1.1} w={3.6} d={1.8} grow={flood} f={f} />
    <DriftBubbles center={[0, 0, -0.6]} f={f} count={16} w={3.5} h={2.8} />
    {children}
  </Room>
);

// The flower shop: leaf green, tiered bucket stands, the wrapping counter, paper rolls, hanging plants, the cooler.
const FLORIST_AT: [number, number] = [0.25, -1.75];
const MILA_SHOP: [number, number] = [0.3, -0.45];
const FlowerSet: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode }> = ({ camera, f, children }) => (
  <Room camera={camera} mood="daylight" floor="#6a7a6a" wall="#2f9a3a" stripe="#bfe8a0" width={8} depth={6} wallPattern="panel" floorPattern="concrete" sun={{ x: -1.6, color: "#f4ffe0", bars: 4 }}>
    <WrapCounter position={[0.25, 0, -1.15]} width={1.8} />
    <PaperRolls position={[0.25, 1.7, -2.85]} width={1.4} />
    <BucketStand position={[-2.0, 0, -1.5]} tiers={3} width={1.3} />
    <BucketStand position={[-1.9, 0, -0.2]} tiers={1} width={0.9} seed={3} />
    <FlowerCooler position={[2.4, 0, -2.6]} width={1.3} />
    {[-1.2, -0.2, 0.9, 1.7].map((x, i) => (
      <HangingPlant key={x} position={[x, 2.4 - (i % 2) * 0.2, -1.8 + (i % 2) * 0.5]} f={f} drop={0.5} />
    ))}
    <Label text="FLOWERS" position={[0.25, 2.55, -2.9]} width={1.2} fg="#ffffff" bg="#e0267f" />
    <Plant position={[1.5, 0, -1.6]} scale={1.2} />
    <Plant position={[-3.0, 0, -2.4]} scale={1.4} />
    {children}
  </Room>
);

// ---------- stage wrappers ----------

type Extra<T> = Partial<Omit<T, "camera" | "f">>;
const cafe = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof CafeSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} light={bulbLight} {...grade} set={<CafeSet camera={camera} f={f} {...extra} />} />
);
const wedding = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof WeddingSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} light={chandelierLight} {...grade} set={<WeddingSet camera={camera} f={f} {...extra} />} />
);
const room = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof RoomSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground(extra.night ? "night" : "dream")} camera={camera} puppets={puppets} light={lampLight} {...grade} set={<RoomSet camera={camera} f={f} {...extra} />} />
);
const balcony = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof BalconySet>> = {}, grade: Grade = {}) => (
  <Stage bg="#e0306a" camera={camera} puppets={puppets} light={sunsetBack} {...grade} set={<BalconySet camera={camera} f={f} {...extra} />} />
);
const street = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof StreetFront>> = {}, grade: Grade = {}) => (
  <Stage bg="#4f8ae0" camera={camera} puppets={puppets} light={morningSun} {...grade} set={<StreetFront camera={camera} f={f} {...extra} />} />
);
const head = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof HeadSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} light={tankLight} {...grade} set={<HeadSet camera={camera} f={f} {...extra} />} />
);
const shop = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof FlowerSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} light={windowDay} {...grade} set={<FlowerSet camera={camera} f={f} {...extra} />} />
);

// Sam's name tag on his apron (world space, in front of his chest).
const NameTag: React.FC<{ at: [number, number]; appear?: number; scale?: number }> = ({ at, appear, scale = 1 }) => (
  <group userData={{ ghost: true }}>
    <Label text="SAM" position={[at[0] + 0.07, 0.66, at[1] + 0.13]} width={0.13 * scale} fg="#3d2416" bg="#fff6dc" appear={appear} />
  </group>
);
const samPose = (f: number, pose: Partial<PuppetPose> = {}): PuppetPose => ({ expression: "happy", headTilt: Math.sin(f * 0.05) * 4, ...pose });

// ---------- shots ----------

// Hook: over Mila's shoulder at the counter; Sam smiles and hands her the cup. Badge on the wall, the photo by the till.
const HookOTS: React.FC = () => {
  const f = useShotFrame();
  const give = Easing.out(Easing.back(1.4))(ramp(f, 4, 16));
  const cam: CameraShot = { position: lerp3([0.55, 1.2, 0.85], [0.45, 1.17, 0.65], f / 44), target: [-0.1, 1.15, -1.8], fov: 46 };
  return cafe(
    cam,
    f,
    [
      pup("mila", MILA, MILA_CAFE, { expression: "happy", view: "back", reachL: [-60, -620], frontL: false }),
      pup("sam", SAM, SAM_AT, samPose(f, { ...faceChange([[0, "neutral"], [12, "happy"]], f), reachR: [80 + give * 90, -560 - give * 40], frontR: true, handR: "open", lookX: 0.3 })),
      ...customerPups(f),
    ],
    {
      badge: f - 2,
      children: (
        <group userData={{ ghost: true }}>
          <NameTag at={SAM_AT} />
          <Ball position={[SAM_AT[0] + (80 + give * 90) * K, (560 + give * 40) * K - 0.03, SAM_AT[1] + 0.2 + give * 0.25]} radius={0.05} color="#f2e8d8" scale={[1, 1.2, 1]} />
        </group>
      ),
    },
  );
};

// One smile: Mila close-up, hearts burst; the PISCES badge behind her.
const HookHearts: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_CAFE;
  const cam: CameraShot = { position: lerp3([at[0] - 0.55, 1.05, at[1] + 1.3], [at[0] - 0.5, 1.03, at[1] + 1.05], f / 22), target: [at[0] - 0.6, 1.2, at[1] - 2.2], fov: 40 };
  return cafe(
    cam,
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "happy"], [6, "excited"]], f), hold: { item: "cup", hand: "R" }, lookX: 0.5, headTilt: 8 + settle(f - 6, 1.5, 0.35) * 6 })],
    { badge: 99, children: <HeartBurst position={[at[0] + 0.05, 1.12, at[1] + 0.2]} t={f - 4} count={7} spread={0.45} /> },
  );
};

// ...and planned the wedding: the dream altar, Mila in white, Sam in a suit, the badge on the arch.
const DreamAltar: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.25, 1.2], [0.0, 1.2, 0.6], Easing.out(Easing.cubic)(f / 30)), target: [0, 1.25, ARCH_Z], fov: 50 };
  return wedding(
    cam,
    f,
    [
      pup("mila", MILA_BRIDE, MILA_ALTAR, { ...moveChange([[0, "excited"], [10, "happy", "cheer"]], f), lookX: 0.6 }),
      pup("sam", SAM_GROOM, GROOM_ALTAR, { expression: "happy", lookX: -0.6 }),
    ],
    { badge: f - 1, children: <HeartBurst position={[0, 1.25, -1.7]} t={f} count={6} spread={0.6} /> },
    { flash: 1 - ramp(f, 0, 6) },
  );
};

// It was the barista: Sam waves, name tag.
const BaristaWave: React.FC = () => {
  const f = useShotFrame();
  return cafe(close(SAM_AT[0], SAM_AT[1], f / 30, 0.25, 1.1, 0.92, 1.9), f, [pup("sam", SAM, SAM_AT, samPose(f, { ...moveChange([[0, "happy"], [4, "happy", "wave"]], f) }))], {
    children: <NameTag at={SAM_AT} />,
  });
};

// Three children: three cribs with their names pop in the dream hall.
const Cribs: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.45, 1.4], [0.3, 1.4, 1.2], Easing.inOut(Easing.quad)(f / 52)), target: [0, 0.75, -1.3], fov: 50 };
  return wedding(cam, f, [pup("mila", MILA_BRIDE, [-0.15, -2.05], { ...moveChange([[0, "happy"], [20, "excited", "clap"]], f), lookX: 0 })], { cribs: f - 4 });
};

// That's Mila: her violet room, name and traits.
const RoomIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.3, 1.6], [-0.1, 1.25, 1.2], f / 50), target: [-0.3, 1.2, -1.8], fov: 50 };
  return room(cam, f, [pup("mila", MILA, [-0.25, -1.3], { ...moveChange([[0, "neutral"], [6, "happy", "wave"], [32, "happy"]], f), lookX: 0 })], { name: f - 3, traits: f - 18 });
};

// Mostly in her head: on the bed, hugging a pillow, a thought cloud with Sam and a heart.
const InHerHead: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-1.55, -1.3];
  const cam: CameraShot = { position: lerp3([-1.0, 1.15, 0.5], [-1.1, 1.12, 0.25], f / 44), target: [-1.5, 0.95, -1.6], fov: 46 };
  return room(
    cam,
    f,
    [pup("mila", MILA, at, { expression: "happy", sit: true, blink: f % 50 > 30, headTilt: 10 + Math.sin(f * 0.1) * 6, reachL: [-60, -480], reachR: [60, -480], frontL: true, frontR: true, handL: "open", handR: "open" })],
    {
      children: (
        <>
          <Ball position={[at[0], 0.6, at[1] + 0.16]} radius={0.12} color="#ffffff" scale={[1.3, 0.8, 0.5]} />
          <ThoughtCloud position={[at[0] + 0.45, 1.5, at[1] + 0.1]} appear={f - 6} size={0.5}>
            <ZodiacBadge sign="pisces" position={[-0.1, 0, 0]} size={0.16} bg="#7b3fd0" fg="#ffffff" />
            <Label text="SAM" position={[0.1, 0, 0]} width={0.16} fg="#ffffff" bg="#e0267f" />
          </ThoughtCloud>
        </>
      ),
    },
  );
};

// She cries at sunsets: on the balcony, tears streaming, the sun going down behind her.
const SunsetCry: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_BALC;
  const cam: CameraShot = { position: lerp3([at[0] - 0.75, 1.0, at[1] + 1.9], [at[0] + 0.35, 1.02, at[1] + 1.7], Easing.inOut(Easing.quad)(f / 46)), target: [at[0], 1.05, at[1] - 1.5], fov: 44 };
  return balcony(
    cam,
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "happy"], [10, "sad"]], f), reachL: [-50, -560], reachR: [50, -560], frontL: true, frontR: true, handL: "fist", handR: "fist", slump: 0.3, headTilt: -6 })],
    { children: <Tears at={[at[0], 1.0, at[1] + 0.12]} f={f} amount={ramp(f, 10, 18)} /> },
  );
};

// She says sorry to furniture: walks into the chair, it skids; she bows to it.
const SorryChair: React.FC = () => {
  const f = useShotFrame();
  const hit = 14;
  const w = stroll(f, 0, hit, [1.4, -1.55], [0.8, -1.55]);
  const kick = f < hit ? 0 : Math.min(1, (f - hit) / 4) - settle(f - hit - 4, 2, 0.5) * 0.1;
  const bow = Easing.inOut(Easing.quad)(ramp(f, hit + 8, hit + 16)) * (1 - ramp(f, hit + 30, hit + 38));
  const cam: CameraShot = { position: lerp3([0.6, 1.0, 0.6], [0.7, 0.98, 0.4], f / 44), target: [0.55, 0.75, -1.55], fov: 46 };
  return room(
    cam,
    f,
    [
      pup("mila", MILA, w.at, {
        ...(f < hit ? { expression: "happy" as const, ...w.pose } : faceChange([[hit, "shocked"], [hit + 8, "awkward"]], f)),
        view: "side",
        facing: -1,
        lean: f >= hit && f < hit + 6 ? 10 : 0,
        bend: bow * 0.7,
        reachL: f >= hit + 8 ? [-60, -500] : undefined,
        reachR: f >= hit + 8 ? [-40, -520] : undefined,
        frontL: true,
        handL: "open",
        handR: "open",
      }),
    ],
    {
      chairKick: Math.max(0, kick),
      children: f >= hit + 10 ? <Label text="SORRY!" position={[0.65, 1.55, -1.45]} width={0.38} fg="#ffffff" bg="#e0267f" appear={f - hit - 10} /> : undefined,
    },
  );
};

// She's picked the dress, the song, and the dog.
const PickedDress: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.55, 1.2, 0.2], [-0.65, 1.15, -0.15], f / 30), target: [-1.0, 0.95, -1.55], fov: 46 };
  return wedding(cam, f, [], { dress: true });
};
const PickedSongDog: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.inOut(Easing.cubic)(ramp(f, 14, 30));
  const cam: CameraShot = { position: lerp3([0.85, 1.1, 0.0], [0.05, 0.7, 0.1], p), target: lerp3([0.9, 0.95, -1.55], [0.0, 0.4, -1.2], p), fov: 46 };
  return wedding(cam, f, [], { song: f - 2, dog: 1 });
};

// Sara: you don't even know his name (low angle, arms crossed).
const SaraLow: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [1.0, -1.1];
  const cam: CameraShot = { position: lerp3([0.75, 0.55, 0.65], [0.8, 0.57, 0.45], f / 40), target: [1.0, 1.15, -1.3], fov: 50 };
  return room(cam, f, [pup("sara", SARA, at, { ...moveChange([[0, "skeptical", "armsCrossed"], [36, "skeptical", "point"]], f), lookX: -0.6 })]);
};
// Mila on the bed with the mood board, not listening.
const MilaBoard: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-0.2, -2.1];
  const cam: CameraShot = { position: lerp3([0.25, 1.4, 0.4], [0.3, 1.38, 0.1], f / 38), target: [0.3, 1.35, -2.9], fov: 48 };
  return room(cam, f, [
    pup("mila", MILA, at, { ...moveChange([[0, "happy"], [10, "excited", "point"]], f), lookX: 0.8 }),
    pup("sara", SARA, [1.15, -1.5], { expression: "bored", gesture: "armsCrossed", lookX: -0.8 }),
  ]);
};

// His name tag says Sam: macro on the tag.
const TagMacro: React.FC = () => {
  const f = useShotFrame();
  const at = SAM_AT;
  const cam: CameraShot = { position: lerp3([at[0] + 0.15, 0.72, at[1] + 0.85], [at[0] + 0.1, 0.7, at[1] + 0.55], f / 45), target: [at[0] + 0.07, 0.68, at[1]], fov: 40 };
  return cafe(cam, f, [pup("sam", SAM, at, samPose(f, { reachR: [70, -560], frontR: true, handR: "fist" }))], { children: <NameTag at={at} appear={f - 6} /> });
};
// It's literally fate: Mila close-up, hands clasped, hearts.
const Fate: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-0.25, -1.3];
  return room(
    close(at[0], at[1], f / 45, -0.2, 1.08, 0.95),
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "happy"], [14, "excited"]], f), reachL: [-20, -640], reachR: [20, -640], frontL: true, frontR: true, handL: "fist", handR: "fist", headTilt: 10 })],
    { children: <HeartBurst position={[at[0], 1.15, at[1] + 0.2]} t={f - 12} count={5} spread={0.4} /> },
  );
};

// Every morning: the café front on a blue morning, Mila strolls up to the door; the A-frame shows the day.
const MorningWalk: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 34, [-2.2, 0.55], [-0.35, 0.55]);
  const cam: CameraShot = { position: lerp3([-1.5, 1.25, 3.4], [-0.6, 1.22, 3.2], f / 42), target: [-0.6, 1.0, 0], fov: 46 };
  return street(cam, f, [pup("mila", MILA, w.at, { expression: "excited", ...w.pose })], { day: f < 21 ? "MONDAY" : "TUESDAY" });
};
// ...and every morning he smiles.
const MorningSmile: React.FC = () => {
  const f = useShotFrame();
  return cafe(close(SAM_AT[0], SAM_AT[1], f / 32, -0.25, 1.1, 0.95, 2.0), f, [pup("sam", SAM, SAM_AT, samPose(f, { ...faceChange([[0, "neutral"], [6, "happy"]], f), lookX: -0.3 }))], { children: <NameTag at={SAM_AT} /> });
};
const MorningSwoon: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_CAFE;
  const cam: CameraShot = { position: lerp3([at[0] + 0.4, 1.1, at[1] + 1.4], [at[0] + 0.35, 1.08, at[1] + 1.15], f / 30), target: [at[0], 0.95, at[1]], fov: 42 };
  return cafe(cam, f, [pup("mila", MILA, at, { expression: "happy", hold: { item: "cup", hand: "R" }, headTilt: 14 + Math.sin(f * 0.15) * 4, lean: -6 + Math.sin(f * 0.1) * 4, blink: f > 14 && f < 26 })], {
    children: <HeartBurst position={[at[0], 1.15, at[1] + 0.2]} t={f} count={4} spread={0.3} />,
  });
};

// Twist: a woman walks in through the staff door, behind the counter (low angle from the customer side).
const WifeEnters: React.FC = () => {
  const f = useShotFrame();
  const door = Easing.out(Easing.back(1.4))(ramp(f, 0, 8));
  const w = stroll(f, 6, 34, [BACK_DOOR_X, -2.45], WIFE_AT);
  const cam: CameraShot = { position: lerp3([0.95, 0.75, 0.9], [1.0, 0.77, 0.7], f / 64), target: [0.9, 1.15, -2.0], fov: 52 };
  return cafe(
    cam,
    f,
    [
      pup("wife", WIFE, w.at, { expression: "happy", ...w.pose }),
      pup("sam", SAM, SAM_AT, samPose(f, { lookX: 0.8, ...faceChange([[0, "happy"], [30, "excited"]], f) })),
    ],
    { door, children: <NameTag at={SAM_AT} /> },
  );
};
// She kisses the barista: heart pop between them.
const Kiss: React.FC = () => {
  const f = useShotFrame();
  const lean = Easing.inOut(Easing.quad)(ramp(f, 6, 14)) * (1 - ramp(f, 30, 38));
  const cam: CameraShot = { position: lerp3([0.3, 1.15, 0.45], [0.3, 1.12, 0.2], f / 44), target: [0.3, 1.0, -1.6], fov: 44 };
  return cafe(
    cam,
    f,
    [
      pup("sam", SAM, SAM_AT, { ...faceChange([[0, "happy"], [14, "awkward"]], f), view: "side", facing: 1, lean: lean * 6 }),
      pup("wife", WIFE, [WIFE_AT[0] - 0.05, WIFE_AT[1]], { expression: "happy", view: "side", facing: -1, lean: -lean * 14, blink: lean > 0.6 }),
    ],
    { children: <>{f > 12 && <HeartBurst position={[0.28, 1.12, -1.45]} t={f - 12} count={3} spread={0.15} />}<NameTag at={SAM_AT} /></> },
  );
};
// ...and she's wearing a ring: macro on her hand.
const WIFE_RING_REACH: [number, number] = [-20, -760];
const RingMacro: React.FC = () => {
  const f = useShotFrame();
  const at = WIFE_AT;
  const h = handAt(at, WIFE_RING_REACH, 0.14);
  const cam: CameraShot = { position: lerp3([h[0] + 0.12, h[1] + 0.03, h[2] + 0.7], [h[0] + 0.08, h[1] + 0.02, h[2] + 0.45], f / 38), target: [h[0], h[1], h[2]], fov: 40 };
  return cafe(
    cam,
    f,
    [pup("wife", WIFE, at, { expression: "smug", reachR: WIFE_RING_REACH, frontR: true, handR: "open", headTilt: 6 })],
    { children: <Ring position={[h[0] + 0.01, h[1] - 0.01, h[2] + 0.03]} f={f} size={1.5} sparkle={ramp(f, 4, 10)} />, customers: false },
    { blur: 4 },
  );
};
// Babe, you forgot your lunch again.
const LUNCH_REACH: [number, number] = [-210, -560];
const Lunch: React.FC = () => {
  const f = useShotFrame();
  const at = WIFE_AT;
  const give = Easing.out(Easing.back(1.6))(ramp(f, 2, 12));
  const reach: [number, number] = [LUNCH_REACH[0] * give + 40 * (1 - give), LUNCH_REACH[1]];
  const h = handAt(at, reach, 0.14);
  const cam: CameraShot = { position: lerp3([0.45, 1.1, 0.6], [0.4, 1.08, 0.35], f / 50), target: [0.3, 0.95, -1.6], fov: 46 };
  return cafe(
    cam,
    f,
    [
      pup("wife", WIFE, at, { expression: "happy", reachR: reach, frontR: true, handR: "fist", lookX: -0.7 }),
      pup("sam", SAM, SAM_AT, samPose(f, { ...faceChange([[0, "awkward"], [20, "happy"]], f), lookX: 0.7 })),
    ],
    { children: <><LunchBag position={[h[0], h[1] + 0.02, h[2] + 0.02]} /><NameTag at={SAM_AT} /></> },
  );
};
// Mila's face falls.
const MilaShock: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_CAFE;
  return cafe(
    close(at[0], at[1], f / 24, 0.2, 1.08, 0.95, 1.6),
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "happy"], [4, "shocked"], [16, "sad"]], f), hold: { item: "cup", hand: "R" }, itemTilt: ramp(f, 4, 10) * 60, slump: ramp(f, 14, 22) * 0.6 })],
    {},
  );
};

// Gag: from the street, Mila walks sadly to the glass door and smacks into it.
const DOOR_HIT = 52;
const DoorSmack: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, DOOR_HIT, [DOOR_X + 0.05, -2.2], [DOOR_X + 0.05, -0.22]);
  const t = f - DOOR_HIT;
  const hit = t >= 0;
  const wobble = hit ? settle(t, 3, 0.25) : 0;
  const cam: CameraShot = { position: lerp3([DOOR_X + 0.35, 1.05, 2.0], [DOOR_X + 0.3, 1.03, 1.75], f / 50), target: [DOOR_X, 0.95, -0.6], fov: 48 };
  return street(
    cam,
    f,
    [
      pup("mila", MILA, w.at, {
        ...(hit ? faceChange([[DOOR_HIT, "shocked"], [DOOR_HIT + 10, "confused"]], f) : { expression: "sad" as const, ...w.pose }),
        squash: hit ? Math.max(0, settle(t, 2.5, 0.4)) * 0.35 : 0,
        lean: hit ? -settle(t, 1.5, 0.5) * 8 : 0,
        crouch: hit ? Easing.in(Easing.quad)(ramp(f, DOOR_HIT + 8, DOOR_HIT + 20)) * 0.6 : 0,
      }),
    ],
    {
      wobble,
      smudge: hit ? Math.min(1, t / 3) : 0,
      children: (
        <>
          <ImpactStar position={[DOOR_X + 0.05, 1.0, 0.05]} t={t} size={0.3} />
          {t > 8 && <DizzyStars center={[DOOR_X + 0.05, 1.17 - ramp(f, DOOR_HIT + 8, DOOR_HIT + 20) * 0.2, -0.22]} f={f} />}
        </>
      ),
    },
  );
};

// So what's going on inside a Pisces? Push into her dazed face through the glass, white flash into the head.
const PushIn: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [DOOR_X + 0.05, -0.22];
  const p = Easing.in(Easing.cubic)(ramp(f, 6, 66));
  const y = 0.98 - 0.2;
  const cam: CameraShot = { position: lerp3([at[0] + 0.1, y + 0.05, 1.6], [at[0] + 0.02, y, 0.15], p), target: [at[0], y, at[1]], fov: 40 };
  return street(
    cam,
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "confused"], [26, "thinking"]], f), crouch: 0.6, lookX: 0 })],
    { smudge: 1, children: <DizzyStars center={[at[0], 0.97, at[1]]} f={f} /> },
    { flash: ramp(f, 63, 75) },
  );
};

// The DAYDREAMS tank: wide, the label pops on.
const TankWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 1.8], [-0.35, 1.38, 1.4], f / 56), target: [-0.4, 1.3, -2.0], fov: 52 };
  return head(cam, f, [pup("mila", MILA, MILA_HEAD, { ...moveChange([[0, "happy"], [18, "excited", "point"]], f), lookX: -0.9 })], { label: f - 10, flood: 0.55 }, { flash: 1 - ramp(f, 0, 10) });
};
// It's huge, and always overflowing: low on the sheets pouring down the front glass and splashing.
const Overflow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 0.35, -0.6], [0.25, 0.4, -0.85], f / 30), target: [-0.4, 1.2, -1.6], fov: 54 };
  return head(cam, f, [], { label: 99, flood: 0.65 + ramp(f, 0, 30) * 0.1 });
};
// The flood reaches her feet: she hops, shocked, splashing.
const FeetFlood: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_HEAD;
  const j = jump(f, 8, 150, 22);
  const cam: CameraShot = { position: lerp3([at[0] + 0.25, 0.75, at[1] + 1.6], [at[0] + 0.2, 0.8, at[1] + 1.35], f / 36), target: [at[0], 0.65, at[1]], fov: 46 };
  return head(
    cam,
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "worried"], [8, "shocked"]], f), ...j, lookX: -0.5 })],
    { label: 99, flood: 0.75 + ramp(f, 0, 36) * 0.3, children: <Splashes x={at[0]} z={at[1] + 0.1} width={0.35} f={f} count={3} seed={9} /> },
  );
};

// Next to it, a dial labelled REALITY: the broken stub on the blue wall, then the dial on the wet floor.
const DialStubShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([STUB_AT[0] - 0.3, 1.35, -1.3], [STUB_AT[0] - 0.2, 1.3, -1.6], f / 40), target: [STUB_AT[0], 1.25, STUB_AT[2]], fov: 46 };
  return head(cam, f, [pup("mila", MILA, [0.95, -2.2], { ...moveChange([[0, "confused", "scratchHead"]], f), lookX: 0.9 })], { label: 99 });
};
// Top-down on the fallen dial in the water.
const DialFloor: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([DIAL_FLOOR[0] + 0.05, 1.5, DIAL_FLOOR[2] + 0.55], [DIAL_FLOOR[0] + 0.03, 1.25, DIAL_FLOOR[2] + 0.45], f / 56), target: [DIAL_FLOOR[0], 0.05, DIAL_FLOOR[2] - 0.05], fov: 46 };
  return head(cam, f, [], { label: 99, dialLabel: f - 6, children: <Flood x={DIAL_FLOOR[0]} z={DIAL_FLOOR[2]} w={1.4} d={1.1} grow={1} f={f} seed={12} /> });
};

// A tap marked TEARS that nobody can close: Mila twists the handle, it spins and spins.
const MILA_TAP: [number, number] = [2.45, -2.25];
const TapTwist: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_TAP;
  const reach: [number, number] = [(TAP_AT[0] - at[0]) / K - 20, -(TAP_AT[1] + 0.15) / K + Math.sin(f * 0.6) * 12];
  const cam: CameraShot = { position: lerp3([2.05, 1.3, -0.9], [2.15, 1.25, -1.15], f / 38), target: [2.6, 1.0, -2.6], fov: 48 };
  return head(
    cam,
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "determined"], [22, "angry"]], f), reachR: reach, frontR: true, handR: "fist", lean: 6 + Math.sin(f * 0.6) * 3 })],
    { label: 99, tapLabel: f - 4, tapTurn: f * 0.35 },
  );
};
const TapMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([TAP_AT[0] - 0.15, 0.9, -1.85], [TAP_AT[0] - 0.12, 0.85, -2.05], f / 30), target: [TAP_AT[0], 0.75, TAP_AT[2]], fov: 46 };
  return head(cam, f, [], { label: 99, tapLabel: 99, tapTurn: f * 0.35 });
};

// And a speaker playing SAD SONGS on repeat (magenta corner); Mila sways sadly to it.
const SpeakerShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.85, 1.1, -0.6], [-2.0, 1.08, -0.9], f / 32), target: [-2.65, 0.85, -2.45], fov: 50 };
  return head(cam, f, [], { label: 99, songLabel: f - 4 });
};
const SadSway: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-1.8, -1.7];
  const cam: CameraShot = { position: lerp3([-1.5, 1.15, 0.2], [-1.6, 1.12, -0.05], f / 32), target: [-2.1, 0.95, -2.0], fov: 46 };
  return head(cam, f, [pup("mila", MILA, at, { expression: "sad", headTilt: Math.sin(f * 0.12) * 10, lean: Math.sin(f * 0.12) * 5, slump: 0.6, lookX: -0.4 })], {
    label: 99,
    songLabel: 99,
    children: <Tears at={[at[0], 1.0 - 0.03, at[1] + 0.12]} f={f} amount={1} />,
  });
};

// One evening: crying on the bed at night, a pile of tissues.
const NightCry: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-1.55, -1.3];
  const cam: CameraShot = { position: lerp3([-1.1, 2.2, -0.3], [-1.15, 2.05, -0.5], f / 46), target: [-1.4, 0.4, -1.5], fov: 50 };
  return room(
    cam,
    f,
    [pup("mila", MILA, at, { expression: "sad", sit: true, reachL: [-40, -800], frontL: true, handL: "open", headTilt: -8 + Math.sin(f * 0.3) * 4, slump: 0.6 })],
    { night: true, tissues: ramp(f, 0, 46), children: <Tears at={[at[0], 0.75, at[1] + 0.12]} f={f} amount={1} /> },
  );
};
// Then feels completely fine: she springs up, cheers.
const Fine: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-0.6, -1.2];
  const j = jump(f, 4, 180, 24);
  const cam: CameraShot = { position: lerp3([-0.4, 1.2, 1.4], [-0.45, 1.15, 1.1], f / 46), target: [-0.6, 1.0, -1.5], fov: 48 };
  return room(cam, f, [pup("mila", MILA, at, { ...moveChange([[0, "neutral"], [6, "excited", "cheer"], [34, "happy", "wave"]], f), ...j })], { tissues: 1 }, { flash: 1 - ramp(f, 0, 6) });
};

// The next morning: the flower shop; Mila walks in.
const ShopEnter: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 32, [-1.0, 0.6], MILA_SHOP);
  const cam: CameraShot = { position: lerp3([0.6, 1.45, 2.4], [0.45, 1.4, 2.1], f / 38), target: [0.0, 1.0, -1.6], fov: 50 };
  return shop(cam, f, [pup("mila", MILA, w.at, { expression: "happy", ...w.pose }), pup("florist", FLORIST, FLORIST_AT, { expression: "neutral", lookX: -0.6 })]);
};
const FloristIntro: React.FC = () => {
  const f = useShotFrame();
  return shop(close(FLORIST_AT[0], FLORIST_AT[1], f / 34, 0.2, 1.1, 0.95, 1.9), f, [pup("florist", FLORIST, FLORIST_AT, { ...moveChange([[0, "neutral"], [8, "happy", "wave"]], f) })]);
};
// The florist hands her a rose and smiles (Mila's back, over the shoulder).
const ROSE_REACH: [number, number] = [70, -620];
const RoseHand: React.FC = () => {
  const f = useShotFrame();
  const give = anticipate(ramp(f, 2, 16), 0.1, 0.08);
  const reach: [number, number] = [ROSE_REACH[0], ROSE_REACH[1] - 60 * (1 - give)];
  const h = handAt(FLORIST_AT, reach, 0.14 + give * 0.4);
  const cam: CameraShot = { position: lerp3([0.65, 1.2, 0.5], [0.6, 1.17, 0.3], f / 32), target: [0.15, 1.1, -1.8], fov: 46 };
  return shop(
    cam,
    f,
    [
      pup("florist", FLORIST, FLORIST_AT, { ...faceChange([[0, "neutral"], [12, "happy"]], f), reachR: reach, frontR: true, handR: "fist" }),
      pup("mila", MILA, MILA_SHOP, { expression: "happy", view: "back" }),
    ],
    { children: <Rose position={[h[0], h[1] + 0.05, h[2]]} tilt={-0.2} /> },
  );
};
const FloristSmile: React.FC = () => {
  const f = useShotFrame();
  return shop(close(FLORIST_AT[0], FLORIST_AT[1], f / 26, -0.25, 1.1, 0.95, 1.7), f, [pup("florist", FLORIST, FLORIST_AT, { ...faceChange([[0, "neutral"], [4, "happy"]], f), headTilt: 8, lookX: 0.2 })]);
};
// Mila has already named their dog: hearts, and a thought cloud with the dog.
const MILA_ROSE_REACH: [number, number] = [-40, -640];
const DogThought: React.FC = () => {
  const f = useShotFrame();
  const at = MILA_SHOP;
  const h = handAt(at, MILA_ROSE_REACH, 0.14);
  return shop(
    close(at[0], at[1], f / 34, 0.15, 1.15, 1.05, 2.0),
    f,
    [pup("mila", MILA, at, { ...faceChange([[0, "happy"], [6, "excited"]], f), reachL: MILA_ROSE_REACH, frontL: true, handL: "fist", headTilt: 10 })],
    {
      children: (
        <>
          <Rose position={[h[0], h[1] + 0.05, h[2]]} tilt={0.15} />
          <HeartBurst position={[at[0] - 0.1, 1.15, at[1] + 0.2]} t={f} count={4} spread={0.3} />
          <ThoughtCloud position={[at[0] + 0.32, 1.42, at[1] + 0.15]} appear={f - 4} size={0.42} tail={-1}>
            <Dog position={[0, -0.13, 0]} f={f} scale={0.55} bow />
          </ThoughtCloud>
        </>
      ),
    },
  );
};
// Back at the dream altar: the florist this time, and the dog with his name tag.
const FinalAltar: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.15, 0.6], [0.0, 1.25, 1.3], Easing.inOut(Easing.cubic)(f / 36)), target: [0, 1.0, ARCH_Z], fov: 50 };
  return wedding(
    cam,
    f,
    [
      pup("mila", MILA_BRIDE, MILA_ALTAR, { ...moveChange([[0, "excited", "cheer"]], f), lookX: 0.6 }),
      pup("florist", FLORIST_GROOM, GROOM_ALTAR, { expression: "happy", lookX: -0.6 }),
    ],
    { dog: 1, dogTag: f - 6, badge: 99 },
    { flash: 1 - ramp(f, 0, 6) },
  );
};

const SHOTS: Shot[] = [
  [0, 45, HookOTS, false],
  [45, 61, HookHearts, false],
  [61, 85, DreamAltar, true],
  [85, 118, BaristaWave, true],
  [118, 169, Cribs, true],
  [169, 218, RoomIntro, true],
  [218, 259, InHerHead, false],
  [259, 308, SunsetCry, true],
  [308, 351, SorryChair, true],
  [351, 381, PickedDress, true],
  [381, 421, PickedSongDog, false],
  [421, 462, SaraLow, true],
  [462, 501, MilaBoard, false],
  [501, 546, TagMacro, true],
  [546, 593, Fate, true],
  [593, 636, MorningWalk, true],
  [636, 668, MorningSmile, true],
  [668, 701, MorningSwoon, false],
  [701, 762, WifeEnters, false],
  [762, 806, Kiss, false],
  [806, 829, RingMacro, false],
  [829, 862, Lunch, false],
  [862, 885, MilaShock, false],
  [885, 960, DoorSmack, true],
  [960, 1035, PushIn, false],
  [1035, 1094, TankWide, true],
  [1094, 1133, Overflow, false],
  [1133, 1166, FeetFlood, false],
  [1166, 1201, DialStubShot, false],
  [1201, 1265, DialFloor, false],
  [1265, 1305, TapTwist, false],
  [1305, 1335, TapMacro, false],
  [1335, 1370, SpeakerShot, false],
  [1370, 1400, SadSway, false],
  [1400, 1447, NightCry, true],
  [1447, 1496, Fine, false],
  [1496, 1534, ShopEnter, true],
  [1534, 1571, FloristIntro, false],
  [1571, 1608, RoseHand, false],
  [1608, 1631, FloristSmile, false],
  [1631, 1668, DogThought, false],
  [1668, TIMING.totalFrames, FinalAltar, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.09, until: 61 },
  { at: 2, src: sfx("pop"), volume: 0.3 },
  { at: 10, src: sfx("card"), volume: 0.2 },
  { at: 49, src: sfx("chime"), volume: 0.3 },
  { at: 61, src: sfx("whoosh"), volume: 0.25 },
  { at: 85, src: sfx("ambience"), volume: 0.08, until: 118 },
  ...[122, 131, 140].map((at) => ({ at, src: sfx("pop"), volume: 0.25 })),
  { at: 172, src: sfx("pop"), volume: 0.3 },
  { at: 187, src: sfx("pop"), volume: 0.22 },
  { at: 201, src: sfx("pop"), volume: 0.22 },
  { at: 224, src: sfx("chime"), volume: 0.2 },
  { at: 270, src: sfx("near-miss"), volume: 0.15 },
  { at: 322, src: sfx("stamp"), volume: 0.3 },
  { at: 323, src: sfx("drawer"), volume: 0.2 },
  { at: 332, src: sfx("pop"), volume: 0.2 },
  { at: 383, src: sfx("pop"), volume: 0.25 },
  { at: 507, src: sfx("pop"), volume: 0.25 },
  { at: 560, src: sfx("chime"), volume: 0.25 },
  { at: 593, src: sfx("ambience"), volume: 0.1, until: 636 },
  { at: 614, src: sfx("paper"), volume: 0.15 },
  { at: 642, src: sfx("chime"), volume: 0.2 },
  { at: 701, src: sfx("door"), volume: 0.35 },
  { at: 734, src: sfx("riser"), volume: 0.12 },
  { at: 762, src: sfx("sting"), volume: 0.3 },
  { at: 776, src: sfx("pop"), volume: 0.2 },
  { at: 810, src: sfx("chime"), volume: 0.3 },
  { at: 832, src: sfx("paper"), volume: 0.25 },
  { at: 866, src: sfx("near-miss"), volume: 0.2 },
  { at: 885, src: sfx("ambience"), volume: 0.1, until: 1035 },
  { at: 885 + DOOR_HIT, src: sfx("boom"), volume: 0.5 },
  { at: 885 + DOOR_HIT + 1, src: sfx("stamp"), volume: 0.3 },
  { at: 885 + DOOR_HIT + 12, src: sfx("tick"), volume: 0.15 },
  { at: 1008, src: sfx("riser"), volume: 0.12 },
  { at: 1035, src: sfx("whoosh"), volume: 0.3 },
  { at: 1035, src: sfx("hum"), volume: 0.06, until: 1400 },
  { at: 1045, src: sfx("pop"), volume: 0.3 },
  { at: 1094, src: sfx("reel-spin"), volume: 0.06, until: 1166 },
  { at: 1141, src: sfx("boom"), volume: 0.15 },
  { at: 1172, src: sfx("tick"), volume: 0.2 },
  { at: 1207, src: sfx("pop"), volume: 0.25 },
  { at: 1269, src: sfx("pop"), volume: 0.25 },
  ...[1273, 1283, 1293, 1310, 1320].map((at) => ({ at, src: sfx("button"), volume: 0.15 })),
  { at: 1339, src: sfx("pop"), volume: 0.25 },
  { at: 1400, src: sfx("near-miss"), volume: 0.15 },
  { at: 1451, src: sfx("boom"), volume: 0.2 },
  { at: 1453, src: sfx("chime"), volume: 0.25 },
  { at: 1496, src: sfx("door"), volume: 0.25 },
  { at: 1496, src: sfx("ambience"), volume: 0.08, until: 1668 },
  { at: 1577, src: sfx("paper"), volume: 0.2 },
  { at: 1635, src: sfx("pop"), volume: 0.25 },
  { at: 1668, src: sfx("whoosh"), volume: 0.25 },
  { at: 1674, src: sfx("pop"), volume: 0.25 },
  { at: 1676, src: sfx("chime"), volume: 0.3 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 421, volume: 0.12 },
  { src: MUSIC_FILES.lounge, from: 421, to: 701, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 701, to: 960, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 960, to: 1400, volume: 0.13 },
  { src: MUSIC_FILES.lounge, from: 1400, to: 1496, volume: 0.12 },
  { src: MUSIC_FILES.upbeat, from: 1496, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
