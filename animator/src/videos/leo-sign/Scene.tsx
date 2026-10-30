import React from "react";
import { Easing } from "remotion";
import * as THREE from "three";
import {
  breathe,
  CameraShot,
  Chair,
  Counter,
  Halo,
  Label,
  Lamp,
  lerp3,
  LightPool,
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
import { ApplauseMeter, BarTab, BigHeart, CakeTable, Curtain, DiscoBall, DressTrain, DrinksTable, FlowerArch, MicStand, PhotoCamera, RingLight, SpotBeam, SpotLamp, SwitchBox, Trumpet, VanityMirror } from "./props";
import TIMING_JSON from "./timing.json";

// "Your Leo Friend Is Never Off Stage" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "leo-sign";
export const timing = TIMING;

// ---------- cast ----------

const SOFIA: PuppetLook = { skin: "#e9b48a", hair: "#b5562a", outfit: "#e8b923", pattern: "#fff6b0", long: true };
const CHLOE: PuppetLook = { skin: "#f6dcc4", hair: "#3a2418", outfit: "#ffffff", long: true };
const MIA: PuppetLook = { skin: "#8d5a3b", hair: "#f2d16b", outfit: "#b79ce8", long: true };
const AVA: PuppetLook = { skin: "#f3d2b3", hair: "#1d1a1a", outfit: "#2a2a30", glasses: true, long: true };
const TRUMPETER: PuppetLook = { skin: "#6b4423", hair: "#1d1a1a", outfit: "#7a1226" };

const WINE_R = { item: "wine", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
const HANDS_HIPS = { armL: [40, -100] as [number, number], armR: [40, -100] as [number, number] };
const CLAP = (f: number) => ({ armL: [70, -110 + Math.sin(f / 1.5) * 25] as [number, number], armR: [70, -110 + Math.sin(f / 1.5) * 25] as [number, number] });

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.02, d = 1.85): CameraShot => ({
  position: lerp3([px + dx, y, pz + d], [px + dx * 0.8, y - 0.02, pz + d - 0.25], p),
  target: [px, y - 0.12, pz],
  fov: 36,
});

const mixHex = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t))).getHexString();

type Grade = { blur?: number; truth?: number; flash?: number };

// Twinkling gold glints around a point (ghost).
const Sparkles: React.FC<{ at: Vec3; f: number; n?: number; spread?: number }> = ({ at, f, n = 10, spread = 0.35 }) => (
  <group position={at} userData={{ ghost: true }}>
    {Array.from({ length: n }, (_, i) => {
      const tw = Math.max(0, Math.sin(f / 3 + i * 1.9));
      return (
        <mesh key={i} position={[Math.sin(i * 2.4) * spread, Math.cos(i * 1.3) * spread * 1.4, 0.12 + (i % 3) * 0.04]} rotation={[0, 0, Math.PI / 4]} scale={0.3 + tw}>
          <planeGeometry args={[0.04, 0.04]} />
          <meshBasicMaterial color="#fff6b0" transparent opacity={tw} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

// ---------- locations ----------

// Wedding entrance: white and cream, gold only as trim, the LEO sign on the wall.
const SOFIA_IN: [number, number] = [-0.45, -1.3];
const CHLOE_IN: [number, number] = [0.75, -1.6];
const EntranceSet: React.FC<{ camera: CameraShot; f: number; badge?: number; you?: number; name?: number; traits?: number }> = ({ camera, badge, you, name, traits }) => (
  <Room camera={camera} mood="warm" floor="#e9e2d6" wall="#fffaf0" stripe="#e8b923" width={9} depth={6} wallPattern="plaster" floorPattern="tile" sun={{ x: 1.6, color: "#fff2c0", bars: 4 }}>
    {badge !== undefined && <ZodiacBadge sign="leo" position={[-1.3, 2.45, -2.92]} size={0.7} bg="#e8b923" fg="#7a1226" appear={badge} />}
    {badge !== undefined && <Label text="LEO" position={[1.3, 2.45, -2.94]} width={1.0} fg="#ffffff" bg="#7a1226" appear={badge - 4} />}
    {you !== undefined && <Label text="YOU" position={[CHLOE_IN[0] + 0.3, 1.5, CHLOE_IN[1] - 0.05]} width={0.5} fg="#ffffff" bg="#2f6bff" appear={you} />}
    {name !== undefined && <Label text="SOFIA" position={[-1.6, 1.95, -2.92]} width={0.75} fg="#7a1226" bg="#e8b923" appear={name} />}
    {traits !== undefined &&
      ["GENEROUS", "LOUD", "GLOWING"].map((t, i) => (
        <Label key={t} text={t} position={[0.3, 2.0 - i * 0.34, -2.9]} width={0.95} fg="#ffffff" bg="#7a1226" appear={traits - i * 13} />
      ))}
    <FlowerArch position={[0, 0, -2.55]} width={1.6} />
    <Label text={"WELCOME\nTO OUR WEDDING"} position={[-2.4, 1.1, -2.5]} width={0.85} fg="#7a1226" bg="#ffffff" />
    <Counter position={[2.6, 0, -2.3]} size={[1.2, 0.8, 0.5]} color="#ffffff" top="#e8b923" />
    <Plant position={[-3.2, 0, -2.4]} />
    <Plant position={[3.4, 0, -1.6]} />
    <Lamp position={[0, 2.6, -1.4]} color="#fff2c0" />
  </Room>
);

// Ceremony: pastel blue, the arch, guests standing, Sofia's ring light in the front row.
const ARCH_Z = -2.35;
const CHLOE_ARCH: [number, number] = [-0.3, -2.0];
const TRUMP_ARCH: [number, number] = [1.0, -2.05];
const SOFIA_ROW: [number, number] = [-0.8, -0.95];
const RING: Vec3 = [-1.35, 0, -1.15];
const AisleSet: React.FC<{ camera: CameraShot; f: number; ring?: number }> = ({ camera, ring = 0 }) => (
  <Room camera={camera} mood="daylight" floor="#f2efe8" wall="#bfe0f5" stripe="#ffffff" width={9} depth={6} wallPattern="panel" floorPattern="wood" sun={{ x: -1.6, color: "#ffffff", bars: 5 }}>
    <FlowerArch position={[0, 0, ARCH_Z]} width={1.7} />
    <Window position={[-2.6, 1.7, -2.94]} size={[1.0, 1.2]} sky="#e6f4ff" />
    <Window position={[2.6, 1.7, -2.94]} size={[1.0, 1.2]} sky="#e6f4ff" />
    {[-2.4, -3.1, 2.4, 3.1].map((x) => [0.2, 0.9].map((z) => <Chair key={`${x}${z}`} position={[x, 0, z]} rotationY={Math.PI} color="#ffffff" />))}
    <InkRunner />
    <RingLight position={RING} on={ring} rotationY={0.5} />
    {ring > 0.5 && <Halo position={[RING[0], 1.65, RING[2] + 0.05]} size={1.6} color="#fff8e8" strength={0.7} />}
    {ring > 0.5 && <LightPool x={RING[0] + 0.4} z={RING[2] - 1.4} color="#fff8e8" strength={0.4} />}
  </Room>
);
// Aisle runner (a white strip down the middle).
const InkRunner: React.FC = () => (
  <mesh position={[0, 0.006, 0.0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ ghost: true }}>
    <planeGeometry args={[0.8, 4.6]} />
    <meshBasicMaterial color="#ffffff" />
  </mesh>
);

// Trumpet close-up: teal wall, brass trumpet, Sofia leaning into the bell.
const TRUMP_AT: [number, number] = [0.7, -1.3];
const SOFIA_BELL: [number, number] = [-0.38, -1.3];
const BELL: Vec3 = [0.02, 1.0, -1.22];
const TrumpetSet: React.FC<{ camera: CameraShot; f: number; shine?: number; honk?: number }> = ({ camera, shine = 0, honk }) => (
  <Room camera={camera} mood="golden" floor="#4a2a1a" wall="#1f6f78" stripe="#f2c14e" width={8} depth={6} wallPattern="panel" floorPattern="wood">
    <group userData={{ ghost: true }}>
      <Trumpet position={[TRUMP_AT[0] - 0.12, 1.0, TRUMP_AT[1] + 0.08]} dir={-1} scale={1.4} shine={shine} />
    </group>
    {honk !== undefined && <Label text="HONK!" position={[-0.1, 1.45, -1.1]} width={0.6} fg="#7a1226" bg="#f2c14e" appear={honk} />}
    <FlowerArch position={[0, 0, -2.6]} width={1.7} />
    <Lamp position={[-0.8, 2.4, -1.8]} color="#ffd27a" />
  </Room>
);

// Toast stage: burgundy, curtain, mic, a slideshow that is all Sofia.
const SOFIA_MIC: [number, number] = [0.0, -1.35];
const ToastSet: React.FC<{ camera: CameraShot; f: number; slide?: number; winning?: number }> = ({ camera, f, slide, winning }) => (
  <Room camera={camera} mood="warm" floor="#4a1420" wall="#7a1226" stripe="#e8b923" width={9} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <Curtain position={[0, 0, -2.75]} width={4.6} height={2.8} open={0.45} />
    <Screen position={[0, 1.85, -2.6]} size={[1.3, 0.8]} text={slide !== undefined && slide > 20 ? "ALL ABOUT\nME" : "CHLOE\n& SAM"} glow="#ffd23f" bg="#2a0a12" />
    <group userData={{ ghost: true }}>
      <MicStand position={[SOFIA_MIC[0] + 0.2, 0, SOFIA_MIC[1] + 0.35]} />
    </group>
    {winning !== undefined && <Label text="WINNING" position={[-0.6, 2.05, -1.9]} width={0.9} fg="#7a1226" bg="#e8b923" appear={winning} />}
    {[-1.8, 1.8].map((x) => (
      <Lamp key={x} position={[x, 2.5, -1.6]} color="#ffd27a" />
    ))}
    <LightPool x={0} z={-2.4} color="#ffe6a8" strength={0.25 + Math.sin(f / 5) * 0.03} />
  </Room>
);

// Dance floor: night purple; the room lights fade with `lights`, the one spotlight follows the bride.
const SPOT_LAMP: Vec3 = [0.3, 2.85, -0.4];
const CHLOE_DANCE: [number, number] = [0.45, -1.45];
const SOFIA_DARK: [number, number] = [-0.85, -1.2];
const TRAIN_AT: Vec3 = [CHLOE_DANCE[0] - 0.1, 0, CHLOE_DANCE[1] + 0.05];
const DanceSet: React.FC<{ camera: CameraShot; f: number; lights?: number; spot?: number; spotAt?: [number, number]; banner?: number; ever?: number }> = ({
  camera,
  f,
  lights = 0,
  spot = 0,
  spotAt = CHLOE_DANCE,
  banner,
  ever,
}) => (
  <Room
    camera={camera}
    mood="night"
    floor={mixHex("#120a22", "#3a2a5a", lights)}
    wall={mixHex("#1a0f30", "#6a3fa0", lights)}
    stripe={mixHex("#2a1a40", "#ff8fc8", lights)}
    width={9}
    depth={6}
    wallPattern="panel"
    floorPattern="tile"
  >
    <DiscoBall position={[-0.9, 2.55, -1.6]} f={f} lit={lights} />
    {lights > 0.05 &&
      [-2.4, -1.2, 1.2, 2.4].map((x, i) => <Halo key={x} position={[x, 2.2, -2.9]} size={1.2} color={["#ff8fc8", "#7fd3ff", "#ffd23f", "#b79ce8"][i]} strength={0.6 * lights} />)}
    <Label text="FIRST DANCE" position={[0.2, 2.45, -2.92]} width={1.3} fg="#ffffff" bg={mixHex("#2a1a40", "#7b2cbf", lights)} appear={banner ?? 99} />
    {ever !== undefined && <Label text={"FIRST TIME\nEVER"} position={[SOFIA_DARK[0] + 0.25, 1.45, SOFIA_DARK[1] - 0.3]} width={0.75} fg="#ffffff" bg="#13235e" appear={ever} />}
    <SpotLamp position={SPOT_LAMP} aim={Math.atan2(spotAt[0] - SPOT_LAMP[0], spotAt[1] - SPOT_LAMP[2])} tilt={0.9} on={spot} scale={0.8} />
    <SpotBeam from={[SPOT_LAMP[0], SPOT_LAMP[1] - 0.1, SPOT_LAMP[2]]} to={[spotAt[0], 0, spotAt[1]]} radius={0.5} on={spot} />
    <DressTrain position={TRAIN_AT} length={1.2} rotationY={-Math.PI / 2} />
    <Counter position={[3.0, 0, -2.2]} size={[1.4, 0.95, 0.5]} color="#2a1a40" top="#e8b923" />
  </Room>
);

// Inside her head: a red velvet theater.
const SOFIA_STAGE: [number, number] = [-0.25, -1.6];
const SWITCH_AT: Vec3 = [1.3, 0, -0.9];
const THEATER_LAMP: Vec3 = [1.6, 2.7, 0.3];
const TheaterSet: React.FC<{ camera: CameraShot; f: number; inside?: number; on?: number; aimAt?: [number, number]; onlyMe?: number }> = ({ camera, inside, on = 0, aimAt = SOFIA_STAGE, onlyMe }) => (
  <Room camera={camera} mood="alarm" floor="#3a1a10" wall="#5a0a14" stripe="#e8b923" width={9} depth={6} wallPattern="panel" floorPattern="wood">
    <Curtain position={[0, 0, -2.75]} width={5.2} height={2.9} open={0.55} />
    {inside !== undefined && <Label text="INSIDE SOFIA" position={[0, 2.62, -2.55]} width={1.45} fg="#ffffff" bg="#13235e" appear={inside} />}
    <ZodiacBadge sign="leo" position={[-2.3, 2.4, -2.6]} size={0.5} bg="#e8b923" fg="#7a1226" />
    <InkStageEdge />
    <SwitchBox position={SWITCH_AT} on={on} label="SPOTLIGHT" />
    <SpotLamp position={THEATER_LAMP} aim={Math.atan2(aimAt[0] - THEATER_LAMP[0], aimAt[1] - THEATER_LAMP[2])} tilt={0.75} on={on} />
    <SpotBeam from={[THEATER_LAMP[0], THEATER_LAMP[1] - 0.1, THEATER_LAMP[2]]} to={[aimAt[0], 0, aimAt[1]]} radius={0.5} on={on} />
    {onlyMe !== undefined && <Label text="ONLY POINTS AT HER" position={[-0.3, 2.25, -2.5]} width={1.5} fg="#7a1226" bg="#e8b923" appear={onlyMe} />}
  </Room>
);
// Gold strip marking the edge of the stage (ghost, flat on the floor).
const InkStageEdge: React.FC = () => (
  <mesh position={[0, 0.008, -0.9]} rotation={[-Math.PI / 2, 0, 0]} userData={{ ghost: true }}>
    <planeGeometry args={[5.2, 0.08]} />
    <meshBasicMaterial color="#e8b923" />
  </mesh>
);

// Backstage: warm dressing room; applause meter, MAIN / BACKUP mirrors, the GENEROUS heart, the bar.
const METER: Vec3 = [-1.0, 1.75, -2.9];
const MIRROR_MAIN: Vec3 = [0.55, 1.45, -2.9];
const MIRROR_BACKUP: Vec3 = [1.85, 1.45, -2.9];
const HEART: Vec3 = [-2.6, 1.4, -2.75];
const BAR: Vec3 = [2.9, 0, -1.6];
const SOFIA_METER: [number, number] = [-0.6, -1.9];
const SOFIA_MIRROR: [number, number] = [1.2, -2.05];
const SOFIA_HEART: [number, number] = [-1.75, -2.1];
const SOFIA_BAR: [number, number] = [2.15, -1.55];
const BackstageSet: React.FC<{ camera: CameraShot; f: number; level?: number; main?: number; backup?: number; beat?: number; generous?: number; tab?: number; pays?: number }> = ({
  camera,
  f,
  level = 0.7,
  main,
  backup,
  beat = 1,
  generous,
  tab = 0,
  pays,
}) => (
  <Room camera={camera} mood="golden" floor="#3a2a4a" wall="#ff8c42" stripe="#7a1226" width={9} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <ApplauseMeter position={METER} level={level + Math.sin(f / 2) * 0.02} size={0.42} />
    <Label text="APPLAUSE" position={[METER[0], METER[1] + 0.62, METER[2] + 0.02]} width={0.85} fg="#ffffff" bg="#e0262f" />
    <VanityMirror position={MIRROR_MAIN} size={[0.75, 0.95]} />
    <VanityMirror position={MIRROR_BACKUP} size={[0.75, 0.95]} tint="#d8ecf5" />
    {main !== undefined && <Label text="MAIN" position={[MIRROR_MAIN[0], MIRROR_MAIN[1] + 0.72, MIRROR_MAIN[2] + 0.03]} width={0.6} fg="#ffffff" bg="#7a1226" appear={main} />}
    {backup !== undefined && <Label text="BACKUP" position={[MIRROR_BACKUP[0], MIRROR_BACKUP[1] + 0.72, MIRROR_BACKUP[2] + 0.03]} width={0.75} fg="#ffffff" bg="#13235e" appear={backup} />}
    <BigHeart position={HEART} size={1.0} beat={beat} />
    {generous !== undefined && <Label text="GENEROUS" position={[HEART[0], HEART[1] - 0.75, HEART[2] + 0.25]} width={0.95} fg="#ffffff" bg="#7a1226" appear={generous} />}
    <DrinksTable position={BAR} />
    <BarTab position={[BAR[0] - 0.05, 0.9, BAR[2] + 0.3]} unroll={tab} length={0.85} />
    {pays !== undefined && <Label text={"SOFIA\nPAYS"} position={[BAR[0] - 0.3, 1.35, BAR[2] - 0.3]} width={0.5} fg="#7a1226" bg="#e8b923" appear={pays} />}
    <Shelf position={[3.3, 0, -2.6]} width={0.9} rows={3} color="#7a1226" seed={6} />
    <Lamp position={[0.5, 2.6, -1.8]} color="#ffd27a" />
  </Room>
);

// Cake table: pink, a three-tier cake, JUST MARRIED.
const CAKE: Vec3 = [0.1, 0, -1.8];
const AVA_AT: [number, number] = [0.8, -1.0];
const CHLOE_CAKE: [number, number] = [-0.7, -1.3];
const CakeSet: React.FC<{ camera: CameraShot; f: number; splat?: number; best?: number }> = ({ camera, splat = 0, best }) => (
  <Room camera={camera} mood="dream" floor="#8a3a5a" wall="#ff9ec4" stripe="#ffffff" width={9} depth={6} wallPattern="wallpaper" floorPattern="carpet" sun={{ x: -1.4, color: "#ffe0f0", bars: 4 }}>
    <group userData={{ ghost: true }}>
      <CakeTable position={CAKE} splat={splat} />
    </group>
    <Label text="JUST MARRIED" position={[0.1, 2.7, -2.92]} width={1.5} fg="#ffffff" bg="#e0447a" />
    {best !== undefined && <Label text={"BEST PHOTO\nOF THE NIGHT"} position={[0.1, 2.0, -2.9]} width={1.2} fg="#7a1226" bg="#e8b923" appear={best} />}
    {[-2.4, 2.5].map((x) => (
      <group key={x}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[x + (i - 1) * 0.22, 2.0 + (i % 2) * 0.2, -2.7]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <meshBasicMaterial color={["#ffffff", "#e8b923", "#ff6fa8"][i]} />
          </mesh>
        ))}
      </group>
    ))}
    <Plant position={[-3.3, 0, -2.3]} />
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
const entrance = at(EntranceSet, "warm");
const aisle = at(AisleSet, "daylight");
const trumpet = at(TrumpetSet, "golden");
const toast = at(ToastSet, "warm");
const dance = at(DanceSet, "night");
const theater = at(TheaterSet, "alarm");
const backstage = at(BackstageSet, "golden");
const cake = at(CakeSet, "dream");

// ---------- shots ----------

// Hook: Sofia sweeps in under the LEO sign in gold sequins; the bride in white is upstaged.
const Hook: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [-1.15, -0.9], SOFIA_IN);
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 2.7], [0.0, 1.35, 2.35], f / 47), target: [0.0, 1.35, -1.6], fov: 60 };
  return entrance(cam, f, [
    pup("sofia", SOFIA, w.at, { expression: "smug", ...w.pose, ...(f > 30 ? ARMS_UP : {}), bob: breathe(f) }),
    pup("chloe", CHLOE, CHLOE_IN, { expression: f > 20 ? "skeptical" : "neutral", lookX: -0.7, bob: breathe(f + 9) }),
  ], { badge: f + 20 }, {}, <Sparkles at={[w.at[0], 0.8, w.at[1]]} f={f} />);
};

// Low angle on the sequins, glinting.
const Sequins: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 0.4, 0.4], [-0.25, 0.45, 0.15], f / 50), target: [SOFIA_IN[0], 1.0, SOFIA_IN[1]], fov: 50 };
  return entrance(cam, f, [pup("sofia", SOFIA, SOFIA_IN, { expression: "smug", armL: [150, -20], armR: [60, -110], headTilt: 10, bob: breathe(f) })], { badge: 99 }, {}, <Sparkles at={[SOFIA_IN[0], 0.9, SOFIA_IN[1]]} f={f} n={16} spread={0.45} />);
};

// "You are": the bride, labelled YOU.
const BrideYou: React.FC = () => {
  const f = useShotFrame();
  return entrance(close(CHLOE_IN[0], CHLOE_IN[1], f / 35, -0.2, 1.15, 2.2), f, [
    pup("chloe", CHLOE, CHLOE_IN, { expression: "skeptical", armL: [20, -20], lookX: -0.6, headTilt: -6 }),
  ], { you: f - 3 });
};

const SofiaName: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 1.5], [-0.65, 1.3, 1.25], f / 33), target: [-0.9, 1.4, -2.0], fov: 56 };
  return entrance(cam, f, [pup("sofia", SOFIA, SOFIA_IN, { expression: "smug", ...HANDS_HIPS, headTilt: 8, bob: breathe(f) })], { name: f - 3 });
};

// Generous, loud, glowing: she hands out drinks; Mia squints at the glow.
const MIA_IN: [number, number] = [0.85, -1.1];
const Traits: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.35, 2.0], [0.2, 1.35, 1.7], f / 53), target: [0.2, 1.3, -1.8], fov: 56 };
  return entrance(cam, f, [
    pup("sofia", SOFIA, SOFIA_IN, { expression: "excited", hold: WINE_R, armR: HOLD, armL: [110 + Math.sin(f / 2) * 25, -30], headTilt: Math.sin(f / 4) * 6, bob: breathe(f) }),
    pup("mia", MIA, MIA_IN, { expression: f > 25 ? "skeptical" : "excited", armL: f > 25 ? [140, -60] : [0, 0], lookX: -0.7, bob: breathe(f + 5) }),
  ], { name: 99, traits: f }, {}, <Sparkles at={[SOFIA_IN[0], 0.8, SOFIA_IN[1]]} f={f} />);
};

// Ceremony wide: guests from behind, the bride at the arch, Sofia setting up a ring light.
const guests = (f: number): PuppetPlacement[] => [
  pup("mia", MIA, [0.55, -0.55], { view: "back", expression: "neutral", bob: breathe(f + 3) }),
  pup("ava", AVA, [1.35, -0.35], { view: "back", expression: "neutral", bob: breathe(f + 11) }),
];
const AisleWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.6, 3.2], [-0.05, 1.55, 2.9], (f + 6) / 45), target: [-0.1, 1.15, -1.7], fov: 60 };
  return aisle(cam, f, [
    pup("chloe", CHLOE, CHLOE_ARCH, { expression: "excited", bob: breathe(f) }),
    pup("trumpeter", TRUMPETER, TRUMP_ARCH, { expression: "neutral", armR: [100, -60], armL: [80, -70], bob: breathe(f + 4) }),
    pup("sofia", SOFIA, SOFIA_ROW, { expression: "excited", armL: [120, -30], armR: [80, -40], lookX: -0.8, bob: breathe(f + 7) }),
    ...guests(f),
  ], { ring: f > 30 ? 1 : 0 });
};

// The ring light clicks on; everyone squints.
const RingOn: React.FC = () => {
  const f = useShotFrame();
  const on = f >= 6 ? 1 : 0;
  const cam: CameraShot = { position: lerp3([-0.75, 1.4, 1.4], [-0.8, 1.4, 1.15], f / 37), target: [-1.0, 1.3, -1.0], fov: 56 };
  return aisle(cam, f, [
    pup("sofia", SOFIA, SOFIA_ROW, { expression: "smug", ...HANDS_HIPS, headTilt: 10, lookX: -0.3 }),
    pup("mia", MIA, [-0.45, -1.35], { expression: on ? "shocked" : "neutral", armL: on ? [140, -70] : [0, 0], armR: on ? [140, -70] : [0, 0], lookX: -0.6 }),
  ], { ring: on }, { flash: on ? 0.5 * (1 - ramp(f, 6, 14)) : 0 });
};

// The vows at the arch; the trumpeter plays, Sofia drifts toward him.
const Vows: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 22, SOFIA_ROW, [0.45, -1.7]);
  const cam: CameraShot = { position: lerp3([0.3, 1.35, 1.9], [0.35, 1.35, 1.65], f / 27), target: [0.3, 1.2, -2.0], fov: 56 };
  return aisle(cam, f, [
    pup("chloe", CHLOE, CHLOE_ARCH, { expression: "excited", armL: [40, -60], armR: [40, -60], lookX: 0.3 }),
    pup("trumpeter", TRUMPETER, TRUMP_ARCH, { expression: "neutral", armR: [100, -60], armL: [80, -70], headTilt: Math.sin(f / 3) * 4 }),
    pup("sofia", SOFIA, w.at, { expression: "smug", ...w.pose }),
  ], { ring: 1 });
};

// Gag: she checks her hair in the shiny bell of the trumpet.
const BellMirror: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 1.15, 1.4], [0.15, 1.12, 1.15], f / 27), target: [0.15, 1.0, -1.3], fov: 58 };
  return trumpet(cam, f, [
    pup("sofia", SOFIA, SOFIA_BELL, { expression: "smug", armL: [160, -60 + Math.sin(f / 2) * 25], armR: [150, -50], headTilt: 14, lookX: 0.9 }),
    pup("trumpeter", TRUMPETER, TRUMP_AT, { expression: "skeptical", armR: [95, -55], armL: [80, -70], lookX: -0.8 }),
  ], { shine: 0.5 + Math.max(0, Math.sin(f / 3)) * 0.5 });
};

// Honk: the trumpeter blows, she jumps.
const Honk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.2, 2.0], [0.1, 1.2, 1.8], f / 20), target: [0.1, 1.05, -1.3], fov: 56 };
  return trumpet(cam, f, [
    pup("sofia", SOFIA, [SOFIA_BELL[0] - ramp(f, 2, 6) * 0.15, SOFIA_BELL[1]], { expression: "shocked", ...ARMS_UP, bob: -squash(f, 2, 0.6)[1] * 40 + 40, headTilt: -10 }),
    pup("trumpeter", TRUMPETER, TRUMP_AT, { expression: "smug", armR: [95, -55], armL: [80, -70], lookX: -0.8 }),
  ], { shine: 1, honk: f - 1 }, { flash: 0 });
};

// The toast: Sofia at the mic, glass up.
const ToastWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.45, 2.5], [0.15, 1.4, 2.1], (f + 6) / 40), target: [0.0, 1.35, -2.0], fov: 56 };
  return toast(cam, f, [pup("sofia", SOFIA, SOFIA_MIC, { expression: "excited", hold: WINE_R, armR: [120, -20], armL: [90 + Math.sin(f / 3) * 20, -30], bob: breathe(f) })], { slide: f - 10 }, {}, <Sparkles at={[SOFIA_MIC[0], 0.8, SOFIA_MIC[1]]} f={f} n={6} />);
};

// The slideshow flips to ALL ABOUT ME; she points at it.
const Slides: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.6, 0.9], [-0.55, 1.65, 0.65], f / 40), target: [0.0, 1.75, -2.6], fov: 52 };
  return toast(cam, f, [pup("sofia", SOFIA, SOFIA_MIC, { expression: "smug", hold: WINE_R, armR: HOLD, armL: [150, -10], lookX: 0.4 })], { slide: 99 });
};

const ToastClose: React.FC = () => {
  const f = useShotFrame();
  return toast(close(SOFIA_MIC[0], SOFIA_MIC[1], f / 49, 0.25, 1.1, 2.0), f, [
    pup("sofia", SOFIA, SOFIA_MIC, { expression: "excited", hold: WINE_R, armR: HOLD, armL: [100 + Math.sin(f / 2) * 25, -30], headTilt: Math.sin(f / 5) * 6 }),
  ], { slide: 99 }, { blur: 5 });
};

// Reaction: the bride and Mia at their table.
const TABLE_GUESTS: [number, number][] = [[-0.35, 0.3], [0.35, 0.3]];
const BrideFace: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.2, 3.1], [0.0, 1.2, 2.85], f / 45), target: [0.0, 1.0, 0.0], fov: 56 };
  return toast(cam, f, [
    pup("chloe", CHLOE, TABLE_GUESTS[0], { expression: "skeptical", lookX: 0.4, headTilt: -8 }),
    pup("mia", MIA, TABLE_GUESTS[1], { expression: f > 20 ? "shocked" : "skeptical", lookX: -0.3, armL: f > 20 ? [120, -40] : [0, 0] }),
  ], { slide: 99 });
};

// "Me!": low angle, arms up, glass high.
const MeLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 0.35, 0.1], [-0.12, 0.38, -0.1], f / 21), target: [SOFIA_MIC[0], 1.1, SOFIA_MIC[1]], fov: 54 };
  return toast(cam, f, [pup("sofia", SOFIA, SOFIA_MIC, { expression: "excited", hold: WINE_R, ...ARMS_UP, headTilt: 10 })], { slide: 99 }, {}, <Sparkles at={[SOFIA_MIC[0], 1.0, SOFIA_MIC[1]]} f={f} n={14} spread={0.5} />);
};

// The crowd claps in the front row; Sofia behind them at the mic.
const Crowd: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 3.0], [0.05, 1.3, 2.7], f / 37), target: [0.0, 1.05, -0.5], fov: 62 };
  return toast(cam, f, [
    pup("sofia", SOFIA, SOFIA_MIC, { expression: "excited", ...ARMS_UP }),
    pup("mia", MIA, [-0.5, 0.5], { expression: "excited", ...CLAP(f) }),
    pup("ava", AVA, [0.0, 0.65], { expression: "excited", ...CLAP(f + 2) }),
    pup("trumpeter", TRUMPETER, [0.5, 0.5], { expression: "excited", ...CLAP(f + 4) }),
  ], { slide: 99 });
};

// Sofia bows; WINNING.
const Winning: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.3, 1.6], [-0.55, 1.3, 1.35], f / 29), target: [-0.4, 1.35, -2.0], fov: 54 };
  return toast(cam, f, [pup("sofia", SOFIA, SOFIA_MIC, { expression: "smug", hold: WINE_R, armR: [150, -20], armL: [60, -110], headTilt: 6 + Math.sin(f / 3) * 6 })], { slide: 99, winning: f - 6 }, {}, <Sparkles at={[SOFIA_MIC[0], 0.9, SOFIA_MIC[1]]} f={f} n={12} />);
};

// The dance floor: the room lights fade down; Sofia waits for her moment.
const LightsDown: React.FC = () => {
  const f = useShotFrame();
  const lights = 1 - ramp(f, 4, 28);
  const cam: CameraShot = { position: lerp3([0.0, 1.5, 2.6], [-0.05, 1.45, 2.3], f / 33), target: [-0.1, 1.2, -1.8], fov: 58 };
  return dance(cam, f, [
    pup("sofia", SOFIA, SOFIA_DARK, { expression: "excited", ...ARMS_UP, bob: breathe(f) }),
    pup("chloe", CHLOE, CHLOE_DANCE, { expression: "neutral", bob: breathe(f + 6) }),
  ], { lights }, { truth: (1 - lights) * 0.3 });
};

const FirstDance: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.55, 1.55, 1.4], [-0.55, 1.55, 1.15], f / 27), target: [-0.45, 1.6, -2.9], fov: 58 };
  return dance(cam, f, [pup("sofia", SOFIA, SOFIA_DARK, { expression: "smug", ...HANDS_HIPS })], { banner: f - 2 }, { truth: 0.3 });
};

// Macro: the spotlight clunks on.
const SpotOn: React.FC = () => {
  const f = useShotFrame();
  const on = f >= 8 ? 1 : 0;
  const cam: CameraShot = { position: lerp3([SPOT_LAMP[0] - 0.6, 2.3, SPOT_LAMP[2] + 1.6], [SPOT_LAMP[0] - 0.55, 2.35, SPOT_LAMP[2] + 1.35], f / 46), target: [SPOT_LAMP[0], 2.5, SPOT_LAMP[2] - 0.3], fov: 48 };
  return dance(cam, f, [], { spot: on, banner: 99 }, { truth: 0.3, flash: on ? 0.4 * (1 - ramp(f, 8, 14)) : 0 });
};

// It lands on the bride, not on Sofia.
const SpotBride: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.5, 2.3], [-0.15, 1.45, 2.05], f / 32), target: [-0.1, 1.0, -1.4], fov: 56 };
  return dance(cam, f, [
    pup("sofia", SOFIA, SOFIA_DARK, { expression: f > 8 ? "shocked" : "excited", ...(f > 8 ? HANDS_HIPS : ARMS_UP), lookX: 0.8 }),
    pup("chloe", CHLOE, CHLOE_DANCE, { expression: "excited", armL: [40, -60], armR: [40, -60] }),
  ], { spot: 1, banner: 99 }, { truth: 0.3 });
};

// Close: Sofia in the dark, for the first time ever.
const SofiaDark: React.FC = () => {
  const f = useShotFrame();
  return dance(close(SOFIA_DARK[0], SOFIA_DARK[1], f / 45, 0.2, 1.05, 1.9), f, [
    pup("sofia", SOFIA, SOFIA_DARK, { expression: "shocked", armL: [20, -30], armR: [20, -30], lookX: 0.9, blink: f % 40 < 3 }),
  ], { spot: 1 }, { truth: 0.6, blur: 4 });
};

// High angle: the bride in the pool of light, Sofia small in the dark.
const FirstTime: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 3.0, 1.0], [-0.3, 2.9, 0.8], f / 32), target: [-0.2, 0.4, -1.4], fov: 54 };
  return dance(cam, f, [
    pup("sofia", SOFIA, SOFIA_DARK, { expression: "skeptical", armL: [10, -10], armR: [10, -10], lookX: 0.8 }),
    pup("chloe", CHLOE, CHLOE_DANCE, { expression: "excited", armL: [40, -60], armR: [40, -60] }),
  ], { spot: 1, ever: f - 3 }, { truth: 0.4 });
};

// "Excuse me?"
const ExcuseMe: React.FC = () => {
  const f = useShotFrame();
  return dance(close(SOFIA_DARK[0], SOFIA_DARK[1], f / 29, -0.25, 1.05, 2.0), f, [
    pup("sofia", SOFIA, SOFIA_DARK, { expression: "skeptical", armR: [150, -40], armL: [40, -100], headTilt: -12, lookX: 0.6 }),
  ], { spot: 1 }, { truth: 0.5 });
};

// Gag: she taps the edge of the spotlight like a broken mic.
const TapBeam: React.FC = () => {
  const f = useShotFrame();
  const tap = Math.max(0, Math.sin(f / 2.2));
  const cam: CameraShot = { position: lerp3([-0.6, 0.55, 0.6], [-0.55, 0.58, 0.4], f / 30), target: [0.0, 1.15, -1.4], fov: 56 };
  return dance(cam, f, [
    pup("sofia", SOFIA, [CHLOE_DANCE[0] - 0.85, CHLOE_DANCE[1] + 0.1], { expression: "skeptical", armR: [110 + tap * 25, -40 - tap * 30], armL: [40, -100], lookX: 0.8 }),
    pup("chloe", CHLOE, CHLOE_DANCE, { expression: "neutral", lookX: -0.7 }),
  ], { spot: 1 }, { truth: 0.4 });
};

// Push into her face, flash into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 56));
  const cam: CameraShot = { position: lerp3([SOFIA_DARK[0] + 0.1, 1.1, 0.8], [SOFIA_DARK[0] + 0.02, 1.04, -0.95], p), target: [SOFIA_DARK[0], 1.02, SOFIA_DARK[1]], fov: 38 };
  return dance(cam, f, [pup("sofia", SOFIA, SOFIA_DARK, { expression: "neutral", lookX: 0, blink: false })], { spot: 1 }, { flash: ramp(f, 48, 60), truth: 0.4 });
};

// Inside her head: the red velvet theater.
const TheaterWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.6, 2.9], [0.1, 1.55, 2.5], (f + 6) / 35), target: [0.1, 1.3, -1.6], fov: 58 };
  return theater(cam, f, [pup("sofia", SOFIA, SOFIA_STAGE, { expression: "smug", ...ARMS_UP, bob: breathe(f) })], { inside: f - 4 }, { flash: 1 - ramp(f, 0, 10) });
};

// Macro: the switch marked SPOTLIGHT flips.
const SwitchFlip: React.FC = () => {
  const f = useShotFrame();
  const on = Easing.out(Easing.back(2))(ramp(f, 22, 30));
  const cam: CameraShot = { position: lerp3([SWITCH_AT[0] - 0.35, 1.45, SWITCH_AT[2] + 2.1], [SWITCH_AT[0] - 0.3, 1.45, SWITCH_AT[2] + 1.8], f / 64), target: [SWITCH_AT[0], 1.4, SWITCH_AT[2]], fov: 50 };
  return theater(cam, f, [], { on: on, inside: 99 });
};

// It only points one way: it swings off and snaps back onto her.
const OneWay: React.FC = () => {
  const f = useShotFrame();
  const away = Math.sin(ramp(f, 4, 24) * Math.PI) * 1.4;
  const aimAt: [number, number] = [SOFIA_STAGE[0] + away, SOFIA_STAGE[1] + away * 0.2];
  const cam: CameraShot = { position: lerp3([-0.2, 1.7, 2.3], [-0.2, 1.65, 2.0], f / 48), target: [0.0, 1.2, -1.5], fov: 56 };
  return theater(cam, f, [pup("sofia", SOFIA, SOFIA_STAGE, { expression: f > 24 ? "smug" : "shocked", ...(f > 24 ? ARMS_UP : HANDS_HIPS), lookX: 0.3 })], { on: 1, aimAt, onlyMe: f - 26, inside: 99 });
};

// Backstage: the applause meter.
const BackstageWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.5, 1.7], [-0.25, 1.5, 1.45], (f + 6) / 26), target: [-0.4, 1.4, -2.6], fov: 56 };
  return backstage(cam, f, [pup("sofia", SOFIA, SOFIA_METER, { expression: "excited", ...CLAP(f), lookX: -0.6, bob: breathe(f) })], { level: 0.55 });
};

// Macro: the needle must stay in the red; she pumps her arms to keep it there.
const MeterRed: React.FC = () => {
  const f = useShotFrame();
  const level = 0.55 + ramp(f, 2, 22) * 0.38 - Math.max(0, Math.sin(f / 4)) * 0.06;
  const cam: CameraShot = { position: lerp3([METER[0] + 0.25, 1.75, METER[2] + 1.6], [METER[0] + 0.2, 1.75, METER[2] + 1.35], f / 44), target: [METER[0] + 0.15, 1.65, METER[2]], fov: 44 };
  return backstage(cam, f, [pup("sofia", SOFIA, SOFIA_METER, { expression: "shocked", armL: [150 + Math.sin(f / 1.5) * 20, -20], armR: [150 - Math.sin(f / 1.5) * 20, -20], lookX: -0.8 })], { level });
};

// The MAIN mirror.
const MirrorMain: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 1.2, 0.6], [0.8, 1.2, 0.35], f / 56), target: [0.9, 1.3, -2.9], fov: 58 };
  return backstage(cam, f, [pup("sofia", SOFIA, SOFIA_MIRROR, { expression: "smug", view: "side", facing: -1, armL: [150, -60], armR: [150, -60] })], { main: f - 32 });
};

// And the BACKUP.
const MirrorBackup: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.3, 1.2, 0.5], [1.5, 1.2, 0.3], f / 34), target: [1.55, 1.3, -2.9], fov: 58 };
  return backstage(cam, f, [pup("sofia", SOFIA, SOFIA_MIRROR, { expression: "excited", view: "side", facing: 1, armL: [150, -60], armR: [150, -60] })], { main: 99, backup: f - 14 });
};

// The big beating heart.
const HeartWide: React.FC = () => {
  const f = useShotFrame();
  const beat = 1 + Math.max(0, Math.sin(f / 4)) ** 4 * 0.12;
  const cam: CameraShot = { position: lerp3([-1.8, 1.25, 1.0], [-1.95, 1.25, 0.75], f / 41), target: [-2.2, 1.2, HEART[2]], fov: 56 };
  return backstage(cam, f, [pup("sofia", SOFIA, SOFIA_HEART, { expression: "excited", armL: [120, -40], armR: [120, -40], lookX: -0.6, bob: breathe(f) })], { beat });
};

// Low angle: GENEROUS.
const Generous: React.FC = () => {
  const f = useShotFrame();
  const beat = 1 + Math.max(0, Math.sin(f / 4)) ** 4 * 0.12;
  const cam: CameraShot = { position: lerp3([-2.2, 0.5, -0.6], [-2.25, 0.55, -0.85], f / 34), target: [HEART[0], 1.2, HEART[2]], fov: 50 };
  return backstage(cam, f, [], { beat, generous: f - 3 });
};

// Love big: she throws her arms wide at the bar.
const LoveBig: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.6, 1.35, 1.0], [1.7, 1.35, 0.75], f / 39), target: [2.3, 1.15, -1.8], fov: 54 };
  return backstage(cam, f, [pup("sofia", SOFIA, SOFIA_BAR, { expression: "excited", armL: [100, 0], armR: [100, 0], headTilt: Math.sin(f / 4) * 8, bob: breathe(f) })], { tab: ramp(f, 20, 39) * 0.3 });
};

// Macro: the bar tab unrolls all the way to the floor. SOFIA PAYS.
const TabRoll: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([BAR[0] - 0.9, 1.0, BAR[2] + 1.4], [BAR[0] - 0.85, 0.9, BAR[2] + 1.2], f / 38), target: [BAR[0] - 0.05, 0.85, BAR[2] + 0.3], fov: 48 };
  return backstage(cam, f, [], { tab: 0.3 + ramp(f, 0, 26) * 0.7, pays: f - 10 });
};

// Back on the dance floor: she walks out of the dark into the light.
const SOFIA_DANCE: [number, number] = [-0.25, -1.3];
const WalkIn: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 40, SOFIA_DARK, SOFIA_DANCE);
  const spotX = Math.min(1, ramp(f, 30, 50));
  const spotAt: [number, number] = [CHLOE_DANCE[0] + (SOFIA_DANCE[0] - CHLOE_DANCE[0]) * spotX * 0.5, CHLOE_DANCE[1]];
  const cam: CameraShot = { position: lerp3([0.1, 1.5, 2.4], [0.0, 1.45, 2.1], (f + 6) / 54), target: [-0.1, 1.0, -1.4], fov: 56 };
  return dance(cam, f, [
    pup("sofia", SOFIA, w.at, { expression: "excited", ...w.pose }),
    pup("chloe", CHLOE, CHLOE_DANCE, { expression: "excited", armL: [80, -40], armR: [80, -40], lookX: -0.6 }),
  ], { spot: 1, spotAt, lights: 0.15 }, { truth: 0.2 });
};

// Both of them in the beam; Sofia glows again.
const Together: React.FC = () => {
  const f = useShotFrame();
  const mid: [number, number] = [(SOFIA_DANCE[0] + CHLOE_DANCE[0]) / 2, CHLOE_DANCE[1]];
  const cam: CameraShot = { position: lerp3([0.0, 1.2, 1.6], [0.05, 1.2, 1.35], f / 43), target: [0.1, 1.05, -1.4], fov: 52 };
  return dance(cam, f, [
    pup("sofia", SOFIA, SOFIA_DANCE, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8, bob: breathe(f) }),
    pup("chloe", CHLOE, CHLOE_DANCE, { expression: "skeptical", armL: [80, -40], armR: [80, -40], lookX: -0.6 }),
  ], { spot: 1, spotAt: mid, lights: 0.15 }, { truth: 0.15 }, <Sparkles at={[SOFIA_DANCE[0], 0.8, SOFIA_DANCE[1]]} f={f} />);
};

// Low macro: her heel catches the train.
const TripTrain: React.FC = () => {
  const f = useShotFrame();
  const x = SOFIA_DANCE[0] + 0.1 + f * 0.012;
  const cam: CameraShot = { position: lerp3([0.2, 0.25, 0.3], [0.22, 0.27, 0.15], f / 21), target: [0.05, 0.5, -1.25], fov: 52 };
  return dance(cam, f, [
    pup("sofia", SOFIA, [x, -1.2], { expression: f > 10 ? "shocked" : "excited", view: "side", facing: 1, headTilt: f > 10 ? 25 : 0, legSwing: 20, ...(f > 10 ? ARMS_UP : {}) }),
  ], { spot: 1, spotAt: [0.1, -1.4], lights: 0.15 }, { truth: 0.15 });
};

// She falls face first into the cake (a fallen puppet is a rotated group, not a placed puppet).
const Fall: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 2, 14));
  const splat = ramp(f, 13, 16);
  const cam: CameraShot = { position: lerp3([1.2, 1.25, 0.8], [1.3, 1.2, 0.6], f / 34), target: [-0.2, 0.85, -1.7], fov: 54 };
  return cake(cam, f, [pup("chloe", CHLOE, CHLOE_CAKE, { expression: f > 14 ? "shocked" : "neutral", ...(f > 14 ? ARMS_UP : {}), lookX: 0.8 })], { splat }, { flash: 0 }, (
    <group position={[CAKE[0] - 0.75 + fall * 0.35, 0.05 + fall * 0.95, CAKE[2] + 0.38]} rotation={[0, 0, (-fall * Math.PI) / 2.3]} scale={squash(f, 14, 0.25)}>
      <PuppetBillboard id="sofia" look={SOFIA} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false }} />
    </group>
  ));
};

// High angle: she is lying in the cake.
const Splat: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.25, 1.35, 0.4], [1.2, 1.3, 0.3], f / 13), target: [0.35, 0.95, -1.6], fov: 54 };
  return cake(cam, f, [], { splat: 1 }, {}, (
    <group position={[CAKE[0] - 0.4, 1.0, CAKE[2] + 0.38]} rotation={[0, 0, -Math.PI / 2.3]} scale={squash(f, 0, 0.2)}>
      <PuppetBillboard id="sofia" look={SOFIA} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false }} />
    </group>
  ));
};

// The photographer: flash.
const Photographer: React.FC = () => {
  const f = useShotFrame();
  const flash = f >= 14 && f < 20 ? 1 - (f - 14) / 6 : 0;
  return cake(close(AVA_AT[0], AVA_AT[1], f / 32, -0.3, 1.0, 1.9), f, [
    pup("ava", AVA, AVA_AT, { expression: "excited", armL: [150, -150], armR: [150, -150], lookX: -0.4 }),
  ], { splat: 1 }, { flash: flash * 0.6 }, <PhotoCamera position={[AVA_AT[0], 1.03, AVA_AT[1] + 0.12]} flash={flash} />);
};

// Loop: the photo. Sofia sits up in the cake, covered in cream, beaming; the bride laughing.
const BestPhoto: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 1.3, 1.8], [0.05, 1.35, 2.3], f / 54), target: [0.05, 1.15, -1.6], fov: 58 };
  const cream = [[-0.06, 1.08], [0.08, 1.15], [0.02, 0.95], [-0.1, 0.7], [0.12, 0.6]];
  return cake(cam, f, [
    pup("chloe", CHLOE, CHLOE_CAKE, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8 }),
    pup("ava", AVA, AVA_AT, { expression: "excited", armL: [150, -150], armR: [150, -150], lookX: -0.4 }),
  ], { splat: 1, best: f - 8 }, { flash: Math.max(0, 1 - f / 8) * 0.7 }, (
    <>
      <group position={[CAKE[0] - 0.05, 0.62, CAKE[2] + 0.05]} scale={0.85}>
        <PuppetBillboard id="sofia" look={SOFIA} at={[0, 0]} pose={{ expression: "smug", ...ARMS_UP }} />
      </group>
      <group userData={{ ghost: true }}>
        {cream.map(([x, y], i) => (
          <mesh key={i} position={[CAKE[0] - 0.05 + x, 0.62 + y * 0.85, CAKE[2] + 0.12]} scale={[1.3, 0.8, 0.5]}>
            <sphereGeometry args={[0.05, 12, 10]} />
            <meshBasicMaterial color="#fffaf0" />
          </mesh>
        ))}
      </group>
      <PhotoCamera position={[AVA_AT[0], 1.03, AVA_AT[1] + 0.12]} />
      <Sparkles at={[CAKE[0], 1.3, CAKE[2] + 0.2]} f={f} n={12} spread={0.5} />
    </>
  ));
};

const SHOTS: Shot[] = [
  [0, 47, Hook, false],
  [47, 97, Sequins, false],
  [97, 132, BrideYou, false],
  [132, 165, SofiaName, false],
  [165, 218, Traits, false],
  [218, 257, AisleWide, true],
  [257, 294, RingOn, false],
  [294, 321, Vows, false],
  [321, 348, BellMirror, false],
  [348, 368, Honk, false],
  [368, 408, ToastWide, true],
  [408, 448, Slides, false],
  [448, 497, ToastClose, false],
  [497, 542, BrideFace, false],
  [542, 563, MeLow, false],
  [563, 600, Crowd, false],
  [600, 629, Winning, false],
  [629, 662, LightsDown, true],
  [662, 689, FirstDance, false],
  [689, 735, SpotOn, false],
  [735, 767, SpotBride, false],
  [767, 812, SofiaDark, false],
  [812, 844, FirstTime, false],
  [844, 873, ExcuseMe, false],
  [873, 903, TapBeam, false],
  [903, 963, HeadPush, false],
  [963, 998, TheaterWide, true],
  [998, 1062, SwitchFlip, false],
  [1062, 1110, OneWay, false],
  [1110, 1136, BackstageWide, true],
  [1136, 1180, MeterRed, false],
  [1180, 1236, MirrorMain, false],
  [1236, 1270, MirrorBackup, false],
  [1270, 1311, HeartWide, false],
  [1311, 1345, Generous, false],
  [1345, 1384, LoveBig, false],
  [1384, 1422, TabRoll, false],
  [1422, 1476, WalkIn, true],
  [1476, 1519, Together, false],
  [1519, 1540, TripTrain, false],
  [1540, 1574, Fall, false],
  [1574, 1587, Splat, false],
  [1587, 1619, Photographer, false],
  [1619, TIMING.totalFrames, BestPhoto, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  // One-shots sit on words; the gaps between words stay clear for the voice.
  { at: 0, src: sfx("ambience"), volume: 0.03, until: 368 },
  { at: 2, src: sfx("chime"), volume: 0.12 },
  { at: 20, src: sfx("pop"), volume: 0.2 },
  { at: 100, src: sfx("pop"), volume: 0.18 },
  { at: 135, src: sfx("pop"), volume: 0.18 },
  ...[168, 181, 194].map((at) => ({ at, src: sfx("pop"), volume: 0.14 })),
  { at: 263, src: sfx("button"), volume: 0.22 },
  { at: 330, src: sfx("chime"), volume: 0.1 },
  { at: 350, src: sfx("tape-stop"), volume: 0.14 },
  { at: 351, src: sfx("boom"), volume: 0.18 },
  { at: 368, src: sfx("hum"), volume: 0.03, until: 629 },
  { at: 430, src: sfx("card"), volume: 0.15 },
  { at: 545, src: sfx("sting"), volume: 0.18 },
  ...[566, 574, 582, 590].map((at) => ({ at, src: sfx("pop"), volume: 0.1 })),
  { at: 607, src: sfx("chime"), volume: 0.12 },
  // The twist: lights down, one heavy clunk, the spotlight finds the bride.
  { at: 636, src: sfx("tape-stop"), volume: 0.16 },
  { at: 665, src: sfx("pop"), volume: 0.16 },
  { at: 697, src: sfx("stamp"), volume: 0.3 },
  { at: 738, src: sfx("sting"), volume: 0.24 },
  { at: 775, src: sfx("near-miss"), volume: 0.1 },
  { at: 815, src: sfx("pop"), volume: 0.16 },
  ...[878, 884, 890].map((at) => ({ at, src: sfx("tick"), volume: 0.16 })),
  { at: 930, src: sfx("whoosh"), volume: 0.14 },
  { at: 945, src: sfx("riser"), volume: 0.06 },
  { at: 963, src: sfx("hum"), volume: 0.035, until: 1110 },
  { at: 967, src: sfx("pop"), volume: 0.2 },
  { at: 1021, src: sfx("button"), volume: 0.26 },
  { at: 1068, src: sfx("whoosh"), volume: 0.14 },
  { at: 1088, src: sfx("stamp"), volume: 0.16 },
  { at: 1110, src: sfx("ambience"), volume: 0.03, until: 1422 },
  ...[1140, 1150, 1160].map((at) => ({ at, src: sfx("credit-blip"), volume: 0.12 })),
  { at: 1216, src: sfx("pop"), volume: 0.18 },
  { at: 1254, src: sfx("pop"), volume: 0.18 },
  { at: 1314, src: sfx("chime"), volume: 0.12 },
  { at: 1390, src: sfx("paper"), volume: 0.16 },
  { at: 1430, src: sfx("whoosh"), volume: 0.12 },
  { at: 1532, src: sfx("near-miss"), volume: 0.12 },
  { at: 1555, src: sfx("boom"), volume: 0.24 },
  { at: 1576, src: sfx("pop"), volume: 0.18 },
  { at: 1601, src: sfx("button"), volume: 0.2 },
  { at: 1621, src: sfx("chime"), volume: 0.16 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 629, volume: 0.13 },
  { src: MUSIC_FILES.tension, from: 629, to: 903, volume: 0.156 },
  { src: MUSIC_FILES.mystery, from: 903, to: 1422, volume: 0.169 },
  { src: MUSIC_FILES.lounge, from: 1422, to: TIMING.totalFrames, volume: 0.143 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
