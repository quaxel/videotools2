import React from "react";
import { Easing } from "remotion";
import * as THREE from "three";
import {
  breathe,
  CameraRig,
  CameraShot,
  canvasTexture,
  Chair,
  Desk,
  Door,
  faceChange,
  Halo,
  Haze,
  InkBox,
  jump,
  Label,
  lerp3,
  moodBackground,
  moveChange,
  MUSIC_FILES,
  MusicCue,
  Pine,
  Plant,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Ridge,
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
  ZodiacBadge,
} from "../../engine";
import {
  Ball,
  Banner,
  Barrier,
  Beacon,
  Bed,
  BeeHat,
  Bees,
  BoxHive,
  BrewJar,
  Bottle,
  BucketDrums,
  CafeTable,
  ClawTub,
  CurtainWindow,
  DomeSlit,
  DryerStack,
  Facade,
  Fence,
  Flag,
  FluoTube,
  FoamBlast,
  FoamPile,
  FoldTable,
  Globe,
  Guitar,
  HeldPhone,
  KeyOnHook,
  KnifeSwitch,
  LabBench,
  Lamppost,
  LaundryCart,
  LavaLamp,
  Meadow,
  MirrorCabinet,
  MusicNotes,
  Placard,
  Poster,
  RingLight,
  Shed,
  SkyPlane,
  SockSandal,
  Songbook,
  Sparks,
  Stick,
  StrongBox,
  Telescope,
  TowelRail,
  ViralPhone,
  Washboard,
  Washer,
} from "./props";
import { anticipate, settle } from "../../engine/motion";
import TIMING_JSON from "./timing.json";

// "An Aquarius Quits When It Gets Cool" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "aquarius-sign";
export const timing = TIMING;

// ---------- cast (every woman has long hair: build every female look through `woman`) ----------

const woman = (look: Omit<PuppetLook, "long">): PuppetLook => ({ ...look, long: true });
const man = (look: Omit<PuppetLook, "long">): PuppetLook => ({ ...look });

const IRIS_LOOK = { skin: "#f1c9a5", hair: "#d8dce8", outfit: "#d9a12a", pattern: "#3fae5a" };
const IRIS = woman(IRIS_LOOK);
const IRIS_BEE = woman({ ...IRIS_LOOK, outfit: "#f6f2e6", pattern: undefined });
const JUNE = woman({ skin: "#8d5524", hair: "#1d1a1a", outfit: "#1fb5b0" });
const ADA = woman({ skin: "#fbe9d6", hair: "#c0392b", outfit: "#b5552a", glasses: true });
const BROOKE = woman({ skin: "#f3d2b3", hair: "#f2d36b", outfit: "#ff2f8e", chain: "#ffd23f" });
// The five fans in the laundromat (four women, one man).
const FANS: PuppetLook[] = [
  woman({ skin: "#e0ac69", hair: "#5a3a2a", outfit: "#4f7dff" }),
  woman({ skin: "#c68642", hair: "#1d1a1a", outfit: "#9b5de5" }),
  man({ skin: "#f1c9a5", hair: "#8a5a3a", outfit: "#3fae5a", cap: "#e0262f" }),
  woman({ skin: "#fbe9d6", hair: "#e8c15a", outfit: "#e0262f" }),
  woman({ skin: "#8d5524", hair: "#3a2a20", outfit: "#ff8fc8", glasses: true }),
];
const FANS_BEE = FANS.map((l) => ({ ...l, outfit: "#f6f2e6", pattern: undefined, cap: undefined }));
// Protesters.
const PROTEST: PuppetLook[] = [
  woman({ skin: "#c68642", hair: "#1d1a1a", outfit: "#e0262f" }),
  man({ skin: "#e0ac69", hair: "#3a2a20", outfit: "#13235e" }),
  woman({ skin: "#fbe9d6", hair: "#a8541e", outfit: "#ffd23f" }),
  woman({ skin: "#8d5524", hair: "#3a2a20", outfit: "#3fae5a" }),
];
// The city dressed like Iris (silver hair, mustard thrift outfit with the green print).
const CLONES: PuppetLook[] = [
  woman({ ...IRIS_LOOK, skin: "#8d5524" }),
  man({ ...IRIS_LOOK, skin: "#e0ac69" }),
  woman({ ...IRIS_LOOK, skin: "#fbe9d6" }),
  woman({ ...IRIS_LOOK, skin: "#c68642" }),
  man({ ...IRIS_LOOK, skin: "#f3d2b3" }),
  woman({ ...IRIS_LOOK, skin: "#e0ac69" }),
];

const K = 1.3 / 1060; // metres per puppet unit

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2, y = 1.08, ty = 0.92): CameraShot => ({
  position: lerp3([px + dx, y, pz + 1.85], [px + dx * 0.8, y - 0.03, pz + 1.55], p),
  target: [px, ty, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- lights (strong sources only) ----------

const bulbLight: PuppetLight = { points: [{ position: [1.5, 1.95, -2.7], color: "#ffd9a0", strength: 1.8, range: 3.0 }] };
const tubeLight: PuppetLight = { distant: [{ direction: [0.1, 1, 0.5], color: "#e6fff4", strength: 1.3 }] };
const ringLightOn = (pos: Vec3, s = 2.2): PuppetLight => ({ points: [{ position: pos, color: "#ffffff", strength: s, range: 2.2 }] });
const sunLow: PuppetLight = { distant: [{ direction: [0.8, 0.45, 0.4], color: "#ffd27a", strength: 1.5 }] };
const labLight = (alarm = 0): PuppetLight => ({
  points: [
    { position: [0.1, 1.3, -1.6], color: "#bfe3ff", strength: 1.0, range: 1.8 },
    ...(alarm > 0 ? [{ position: [1.0, 2.2, -2.8] as Vec3, color: "#ff3b30", strength: 2.4 * alarm, range: 3.5 }] : []),
  ],
});

// ---------- locations ----------

// The street: outdoors, facades at the back, a pavement strip and the road. `protest` red banners and placards,
// otherwise a sunny day with yellow awnings and café tables.
const STREET_BACK = -3.4;
const StreetSet: React.FC<{ camera: CameraShot; f: number; protest?: boolean; badge?: number; children?: React.ReactNode }> = ({ camera, f, protest, badge, children }) => {
  const camX = camera.position[0];
  const sky = protest ? ["#6fb0e8", "#a8d4f5", "#e8f4ff"] : ["#ffc94a", "#ffe08a", "#fff4c8"];
  const facades = protest
    ? ["#d9b48a", "#c98a6a", "#e8d0a8", "#b97a5a", "#d9b48a"]
    : ["#f2d16b", "#e8b84a", "#fff0b0", "#f2c84a", "#e8d080"];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[sky[1]]} />
      <fog attach="fog" args={[sky[1], 9, 26]} />
      <ambientLight intensity={protest ? 1.7 : 1.6} color={protest ? "#ffffff" : "#fff2d0"} />
      <hemisphereLight args={[protest ? "#ffffff" : "#ffe6a8", "#5a4a3a", 0.5]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={protest ? 2.2 : 2.6}
        color={protest ? "#fffaf0" : "#ffd27a"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
      />
      <group position={[camX * 0.9, 0, 0]}>
        <SkyPlane stops={sky} position={[0, 8, -22]} size={[60, 30]} />
      </group>
      {/* Far towers drift with the camera a little (parallax) */}
      <group position={[camX * 0.45, 0, 0]}>
        {[-4.5, -2.6, -0.4, 1.8, 4.0].map((x, i) => (
          <InkBox key={x} size={[1.6, 7 + (i % 3) * 1.5, 1]} position={[x, (7 + (i % 3) * 1.5) / 2, -12]} color={protest ? "#9ab0c8" : "#f2d88a"} ink={0.01} />
        ))}
      </group>
      {/* Road, kerb and pavement */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshToonMaterial color={protest ? "#5a5f6a" : "#6a6560"} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, STREET_BACK + 0.8]} receiveShadow>
        <planeGeometry args={[30, 1.6]} />
        <meshToonMaterial color={protest ? "#c9c2b0" : "#e8dcc0"} gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[30, 0.03, 0.12]} position={[0, 0.012, STREET_BACK + 1.6]} color="#e8e4da" ink={0.003} />
      {[-6, -3.5, -1, 1.5, 4, 6.5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, 0.4]}>
          <planeGeometry args={[1.2, 0.1]} />
          <meshBasicMaterial color="#f2f0e8" />
        </mesh>
      ))}
      {/* Facades */}
      {facades.map((c, i) => (
        <Facade
          key={i}
          x={-4.4 + i * 2.2}
          z={STREET_BACK}
          w={2.15}
          h={4.6 + (i % 2) * 0.9}
          color={c}
          seed={i * 3}
          awning={protest ? (i % 2 ? "#e0262f" : undefined) : "#ffd23f"}
          
        />
      ))}
      <Lamppost position={[-2.2, 0, STREET_BACK + 0.6]} />
      <Lamppost position={[2.4, 0, STREET_BACK + 0.6]} />
      {protest ? (
        <>
          <Barrier position={[-2.6, 0, STREET_BACK + 1.25]} width={1.6} />
          <Barrier position={[2.7, 0, STREET_BACK + 1.25]} width={1.6} />
          <Banner x={0.1} z={STREET_BACK + 1.0} width={2.6} y={2.15} text="SAVE THE BEES" f={f} />
          <Flag position={[-1.5, 0, STREET_BACK + 1.0]} color="#e0262f" stripe="#ffffff" f={f} height={2.6} />
          <Flag position={[1.75, 0, STREET_BACK + 1.05]} color="#ffd23f" stripe="#e0262f" f={f + 20} height={2.5} />
          {badge !== undefined && <></>}
        </>
      ) : (
        <>
          <CafeTable position={[-1.9, 0, STREET_BACK + 0.85]} />
          <CafeTable position={[2.1, 0, STREET_BACK + 0.85]} color="#e0262f" />
          <Plant position={[-0.9, 0, STREET_BACK + 0.5]} />
          <Plant position={[1.1, 0, STREET_BACK + 0.5]} scale={1.2} />
        </>
      )}
      {children}
    </>
  );
};

// Iris's AQUARIUS placard: a tall card with the sign's badge over its name, on a stick held in both hands.
const IRIS_PROTEST: [number, number] = [0.05, -1.1];
const PLACARD_GRIP = 830; // units above the feet for the upper hand
const AquariusPlacard: React.FC<{ at: [number, number]; badge?: number; f: number; dx?: number }> = ({ at, badge, f, dx = 0.12 }) => {
  const bob = Math.sin(f * 0.35) * 0.04;
  const x = at[0] + dx;
  const y = PLACARD_GRIP * K - 0.45 + bob;
  return (
    <group position={[x, y, at[1] + 0.12]} userData={{ ghost: true }}>
      <InkBox size={[0.035, 1.05, 0.035]} position={[0, 0.52, -0.03]} color="#a8784a" ink={0.004} />
      <InkBox size={[0.72, 0.72, 0.025]} position={[0, 1.3, 0]} color="#fff6dc" ink={0.006} />
      <ZodiacBadge sign="aquarius" position={[0, 1.42, 0.016]} size={0.4} bg="#1f6fd0" fg="#ffffff" appear={badge} />
      <Label text="AQUARIUS" position={[0, 1.07, 0.016]} width={0.62} fg="#ffffff" bg="#e0262f" appear={badge === undefined ? undefined : badge - 4} />
    </group>
  );
};
// Iris holding it: both hands up on the stick.
const placardHands = (dx = 0.12): Partial<PuppetPose> => ({
  reachR: [dx / K, -PLACARD_GRIP],
  reachL: [dx / K - 10, -PLACARD_GRIP + 140],
  frontL: true,
  frontR: true,
  handL: "fist",
  handR: "fist",
});

// The phone screen in Iris's hand, drawn large enough to read (world space, faces +z).
const PhoneText: React.FC<{ position: Vec3; lines: [string, boolean][]; stamp?: string; appear?: number; scale?: number; tilt?: number; badge?: boolean }> = ({ position, lines, stamp, appear = 99, scale = 1, tilt = 0, badge }) => {
  const tex = React.useMemo(
    () =>
      canvasTexture(400, 760, (ctx) => {
        ctx.fillStyle = "#fff0f6";
        ctx.fillRect(0, 0, 400, 760);
        ctx.fillStyle = "#13235e";
        ctx.fillRect(0, 0, 400, 90);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 44px 'Arial Black', Impact, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("IRIS", 200, 62);
        lines.forEach(([t, me], i) => {
          const y = 150 + i * 150;
          ctx.fillStyle = me ? "#4f7dff" : "#ffffff";
          ctx.strokeStyle = "#13235e";
          ctx.lineWidth = 6;
          const x = me ? 120 : 20;
          ctx.beginPath();
          ctx.roundRect(x, y, 260, 110, 30);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = me ? "#ffffff" : "#13235e";
          ctx.font = "900 40px 'Arial Black', Impact, sans-serif";
          const parts = t.split("\n");
          parts.forEach((p, k) => ctx.fillText(p, x + 130, y + 50 + k * 44 - (parts.length - 1) * 18));
        });
      }),
    [lines.map((l) => l[0]).join("|")],
  );
  return (
    <group position={position} rotation={[0, 0, tilt]} scale={scale} userData={{ ghost: true }}>
      <InkBox size={[0.22, 0.4, 0.02]} position={[0, 0, 0]} color="#1d1a1a" ink={0.004} />
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.19, 0.36]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {badge && <ZodiacBadge sign="aquarius" position={[-0.06, 0.145, 0.014]} size={0.075} bg="#1f6fd0" fg="#ffffff" />}
      {stamp && <Label text={stamp} position={[0.0, -0.13, 0.02]} rotation={[0, 0, 0.12]} width={0.2} fg="#ffffff" bg="#e0262f" appear={appear} />}
    </group>
  );
};

// Iris's bedroom: purple, a desk with the globe and a lava lamp, the window with curtains, a toy UFO.
const IRIS_ROOM: [number, number] = [0.15, -1.3];
const GLOBE_AT: Vec3 = [-0.45, 0.81, -2.25];
const RoomSet: React.FC<{ camera: CameraShot; f: number; name?: number; traits?: number; curtains?: number; humanity?: number; globeSpin?: number; children?: React.ReactNode }> = ({
  camera,
  f,
  name,
  traits,
  curtains = 0,
  humanity,
  globeSpin = 0,
  children,
}) => (
  <Room camera={camera} mood="dream" floor="#3a1d5a" wall="#7a3aa8" stripe="#ffd23f" width={8} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <Bed position={[-2.2, 0, -1.9]} />
    <Desk position={[-0.4, 0, -2.3]} size={[1.2, 0.75, 0.55]} color="#c99a6b" />
    <Globe position={GLOBE_AT} spin={globeSpin} label={humanity !== undefined ? "HUMANITY" : undefined} />
    <LavaLamp position={[0.0, 0.81, -2.35]} f={f} />
    <CurtainWindow position={[1.25, 1.5, -2.92]} close={curtains} f={f} />
    <Poster position={[2.0, 2.25, -2.94]} text="NO LABELS" bg="#ffd23f" fg="#5a2a8a" />
    <Poster position={[-2.1, 1.85, -2.94]} text={"QUESTION\nEVERYTHING"} bg="#3fae5a" fg="#ffffff" width={0.55} />
    <Shelf position={[2.6, 0, -2.75]} width={0.9} rows={4} color="#5a3a7a" seed={9} />
    {/* A toy flying saucer hanging from the ceiling */}
    <group position={[-0.9, 2.25 + Math.sin(f * 0.08) * 0.03, -1.9]} rotation={[0.15, f * 0.05, 0]}>
      <InkBox size={[0.004, 0.5, 0.004]} position={[0, 0.3, 0]} color="#ffffff" ink={0} />
      <Ball position={[0, 0, 0]} radius={0.16} color="#c9ced3" scale={[1, 0.3, 1]} />
      <Ball position={[0, 0.05, 0]} radius={0.07} color="#7fffd4" glow />
    </group>
    {name !== undefined && <Label text="IRIS" position={[0.15, 2.3, -2.9]} width={0.7} fg="#ffffff" bg="#e0267f" appear={name} />}
    {traits !== undefined &&
      ["BRILLIANT", "REBELLIOUS", "SLIGHTLY ALIEN"].map((t, i) => (
        <Label key={t} text={t} position={[-0.85, 1.95 - i * 0.3, -2.9]} width={0.95} fg="#5a2a8a" bg="#7fffd4" appear={traits - i * 16} />
      ))}
    {children}
  </Room>
);

// The bathroom: green tiles, the claw-foot tub full of kombucha, jars, a bulb over the mirror. Ceiling at 2.6.
const TUB: Vec3 = [-0.1, 0, -2.15];
const IRIS_BATH: [number, number] = [1.15, -1.65];
const CEIL = 2.6;
const BathSet: React.FC<{ camera: CameraShot; f: number; bubble?: number; blast?: number; pile?: number; tag?: number; mat?: boolean; children?: React.ReactNode }> = ({
  camera,
  f,
  bubble = 0,
  blast = -1,
  pile = 0,
  tag,
  mat = true,
  children,
}) => (
  <Room camera={camera} mood="warm" floor="#e8dcc0" wall="#3c8a5a" stripe="#a8641e" width={7} depth={6} wallPattern="tile" floorPattern="tile">
    {/* Ceiling, so the foam has somewhere to hit */}
    <mesh position={[0, CEIL, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[7, 6]} />
      <meshToonMaterial color="#f2ead2" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <group position={TUB} scale={squash(f, 6, bubble > 0.8 ? 0.15 : 0)}>
      <ClawTub position={[0, 0, 0]} f={f} bubble={bubble} />
    </group>
    {/* Brewing jars and bottles along the back wall */}
    {[-2.4, -2.05, -1.7].map((x, i) => (
      <BrewJar key={x} position={[x, 0, -2.75]} scale={1.3 - i * 0.12} cloth={["#fff6dc", "#ffd23f", "#ff8fc8"][i]} />
    ))}
    <InkBox size={[1.0, 0.04, 0.22]} position={[-2.0, 1.1, -2.88]} color="#c99a6b" ink={0.004} />
    {[-2.35, -2.15, -1.95, -1.75, -1.55].map((x, i) => (
      <Bottle key={x} position={[x, 1.12, -2.86]} color={i % 2 ? "#a8641e" : "#c0782a"} />
    ))}
    <Label text="KOMBUCHA" position={[-2.0, 1.55, -2.93]} width={0.7} fg="#ffffff" bg="#a8641e" />
    <MirrorCabinet position={[1.5, 1.45, -2.95]} />
    <pointLight position={[1.5, 1.9, -2.6]} intensity={2.2} distance={4} color="#ffd9a0" />
    <TowelRail position={[2.6, 1.3, -2.95]} />
    <Plant position={[2.7, 0, -2.5]} />
    {/* Bath mat with her socks-in-sandals */}
    {mat && (
      <>
        <InkBox size={[0.7, 0.012, 0.45]} position={[0.1, 0.006, -1.45]} color="#ff8fc8" ink={0.003} />
        <SockSandal position={[-0.02, 0.012, -1.45]} rotation={[0, 0.15, 0]} />
        <SockSandal position={[0.2, 0.012, -1.42]} rotation={[0, -0.1, 0]} />
        {tag !== undefined && <Label text="ON PURPOSE" position={[0.1, 0.36, -1.52]} width={0.42} fg="#ffffff" bg="#13235e" appear={tag} />}
      </>
    )}
    <FoamBlast position={[TUB[0], 0.7, TUB[2]]} t={blast} ceiling={CEIL} width={2.4} />
    {pile > 0 && <FoamPile x={TUB[0]} z={TUB[2] + 0.55} w={2.2} d={0.5} grow={pile} />}
    {children}
  </Room>
);

// The laundromat: turquoise stripe, washers along the back, stacked dryers, tubes under a ceiling, five chairs.
const L_IRIS: [number, number] = [0.05, -1.75];
const L_JUNE: [number, number] = [-0.85, -1.95];
const L_ADA: [number, number] = [0.9, -1.85];
const SEATS: [number, number][] = [
  [-1.0, 0.1],
  [-0.5, 0.25],
  [0.0, 0.1],
  [0.5, 0.25],
  [1.0, 0.1],
];
const L_DOOR_X = 2.55;
const LaundroSet: React.FC<{ camera: CameraShot; f: number; door?: number; chairs?: boolean; guitarOnFloor?: boolean; children?: React.ReactNode }> = ({ camera, f, door = 0, chairs = true, guitarOnFloor, children }) => (
  <Room camera={camera} mood="office" floor="#d8e8e4" wall="#f2f8f6" stripe="#1fb5b0" width={8} depth={6} wallPattern="tile" floorPattern="tile">
    <mesh position={[0, 2.75, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[8, 6]} />
      <meshToonMaterial color="#e8f0ee" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    {[-2.4, 0, 2.0].map((x) => (
      <FluoTube key={x} position={[x, 2.66, -1.2]} />
    ))}
    {[-2.4, 0, 2.0].map((x) => (
      <FluoTube key={`b${x}`} position={[x, 2.66, -2.5]} />
    ))}
    {[-2.95, -2.3, -1.65, -1.0, -0.35, 0.3, 0.95, 1.6].map((x, i) => (
      <Washer key={x} position={[x, 0, -2.62]} f={f + i * 7} spin={i % 3 === 0 ? 0 : 1} />
    ))}
    <DryerStack position={[-3.1, 0, -1.4]} f={f} />
    {[-1.95, -0.6, 0.75].map((x, i) => (
      <Label key={x} text={["WASH 3", "NO DYE", "DRY 6"][i]} position={[x, 1.25, -2.94]} width={0.45} fg="#13235e" bg="#ffffff" />
    ))}
    <Label text="LAUNDROMAT" position={[-0.4, 1.95, -2.94]} width={1.2} fg="#ffffff" bg="#1fb5b0" />
    <Door position={[L_DOOR_X, 0, -2.94]} open={door} color="#1fb5b0" glow={door > 0.05 ? "#fff6dc" : undefined} />
    <LaundryCart position={[-2.1, 0, -0.9]} />
    <FoldTable position={[3.0, 0, -0.6]} size={[0.6, 1.2]} />
    {/* Band kit: June's buckets and a laundry basket stool, an amp with the band name */}
    <InkBox size={[0.42, 0.33, 0.32]} position={[L_JUNE[0], 0.165, L_JUNE[1] - 0.05]} color="#4f7dff" ink={0.006} />
    <BucketDrums position={[L_JUNE[0], 0, L_JUNE[1] + 0.12]} hit={Math.max(0, Math.sin(f * 0.6))} />
    <InkBox size={[0.45, 0.5, 0.3]} position={[1.6, 0.25, -2.0]} color="#2a2f3a" />
    <Label text="THE SCOBYS" position={[1.6, 0.32, -1.84]} width={0.42} fg="#ffd23f" bg="#2a2f3a" />
    {chairs && SEATS.map(([x, z], i) => <Chair key={i} position={[x, 0, z]} rotationY={Math.PI} color={["#f77f00", "#ffd23f", "#f77f00", "#ff8fc8", "#f77f00"][i]} />)}
    {guitarOnFloor && (
      <group rotation={[0, 0, 0]}>
        <Guitar position={[L_IRIS[0] - 0.1, 0.08, L_IRIS[1] + 0.25]} tilt={1.45} />
      </group>
    )}
    {children}
  </Room>
);

// The viral video: a pink studio with the giant phone and a ring light.
const PHONE_AT: Vec3 = [-0.25, 0, -2.4];
const B_STUDIO: [number, number] = [0.75, -1.5];
const RING_AT: Vec3 = [1.25, 0, -0.9];
const PinkSet: React.FC<{ camera: CameraShot; f: number; views?: number; ring?: boolean; children?: React.ReactNode }> = ({ camera, f, views = 1, ring = true, children }) => (
  <Room camera={camera} mood="neon" floor="#a8125e" wall="#ff8fc8" stripe="#ffffff" width={8} depth={6} wallPattern="panel" floorPattern="carpet">
    <ViralPhone position={PHONE_AT} views={views} f={f} scale={1.15} />
    {ring && <RingLight position={RING_AT} />}
    {[-2.2, 2.3].map((x, i) => (
      <group key={x} position={[x, 1.7 + Math.sin(f * 0.07 + i) * 0.05, -2.8]}>
        <Ball position={[0, 0, 0]} radius={0.25} color={i ? "#ffd23f" : "#ffffff"} />
      </group>
    ))}
    <Label text="#TRENDING" position={[1.3, 2.3, -2.94]} width={0.9} fg="#ffffff" bg="#e0267f" />
    <Plant position={[-2.6, 0, -2.4]} />
    {children}
  </Room>
);

// Inside her head: a steel-blue lab with a telescope under the dome slit, a strongbox, a key on a far hook, a switch.
const SCOPE_AT: Vec3 = [-0.6, 0, -1.9];
const BOX_AT: Vec3 = [0.35, 0.88, -2.35];
const KEY_AT: Vec3 = [2.55, 2.05, -2.94];
const SWITCH_AT: Vec3 = [1.45, 1.35, -2.92];
const PEOPLE: [number, number][] = [
  [1.15, -1.25],
  [1.65, -1.45],
  [2.15, -1.2],
];
const LabSet: React.FC<{ camera: CameraShot; f: number; flip?: number; shake?: number; keySwing?: number; alarm?: number; spark?: number; children?: React.ReactNode }> = ({
  camera,
  f,
  flip = 0,
  shake = 0,
  keySwing = 0,
  alarm = 0,
  spark = -1,
  children,
}) => (
  <Room camera={camera} mood="cold" floor="#2a3a5a" wall="#3a5a8a" stripe="#8a9ab0" width={8} depth={6} wallPattern="panel" floorPattern="concrete">
    <DomeSlit position={[-1.55, 1.75, -2.95]} f={f} />
    {/* Steel ribs */}
    {[-3.2, -0.5, 2.0, 3.4].map((x) => (
      <InkBox key={x} size={[0.12, 3.2, 0.12]} position={[x, 1.6, -2.88]} color="#8a9ab0" ink={0.006} />
    ))}
    <Telescope position={SCOPE_AT} yaw={-0.75} pitch={0.5} />
    <LabBench position={[0.35, 0, -2.4]} f={f} />
    <group position={[BOX_AT[0] - 0.35, 0, 0]}>
      <StrongBox position={[0.35, BOX_AT[1], BOX_AT[2]]} shake={shake} scale={0.85} />
    </group>
    <KeyOnHook position={KEY_AT} swing={keySwing} />
    <KnifeSwitch position={SWITCH_AT} flip={flip} />
    <Sparks position={[SWITCH_AT[0], SWITCH_AT[1] - 0.1, SWITCH_AT[2] + 0.15]} t={spark} />
    <Beacon position={[SWITCH_AT[0], 2.35, -2.92]} on={alarm > 0 && Math.floor(f / 4) % 2 === 0 ? 1 : 0} />
    {alarm > 0 && <Halo position={[0, 1.4, -2.7]} size={6} color="#ff3b30" strength={0.25 * alarm * (Math.floor(f / 4) % 2 ? 0.4 : 1)} />}
    {children}
  </Room>
);

// The apiary at golden hour: sky, parallax ridges, a meadow, pastel hives, a shed and a fence, bees everywhere.
const HIVES: { x: number; z: number; c: string; n: number }[] = [
  { x: -2.3, z: -2.6, c: "#fff6dc", n: 3 },
  { x: -1.4, z: -2.8, c: "#ffd23f", n: 2 },
  { x: 1.3, z: -2.7, c: "#9fd8ff", n: 3 },
  { x: 2.2, z: -2.5, c: "#bfe8c0", n: 2 },
];
const BIG_HIVE: Vec3 = [0.3, 0, -1.25];
const IRIS_HIVE: [number, number] = [0.3, -1.85];
const ApiarySet: React.FC<{ camera: CameraShot; f: number; bigHive?: boolean; children?: React.ReactNode }> = ({ camera, f, bigHive, children }) => {
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#ffb35a"]} />
      <fog attach="fog" args={["#ffb38a", 10, 30]} />
      <ambientLight intensity={1.4} color="#ffe0c0" />
      <hemisphereLight args={["#ffd27a", "#4a3a20", 0.6]} />
      <directionalLight position={[3, 4, 4]} intensity={2.4} color="#ffd27a" castShadow shadow-mapSize={[4096, 4096]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-4} />
      <group position={[camX, 0, 0]}>
        <SkyPlane stops={["#6a4a9a", "#ff9a5c", "#ffd08a", "#fff0c0"]} position={[0, 7, -24]} size={[70, 30]} />
        <mesh position={[2.5, 3.2, -23]}>
          <circleGeometry args={[1.1, 32]} />
          <meshBasicMaterial color="#fff4c8" fog={false} toneMapped={false} />
        </mesh>
      </group>
      <Ridge z={-20} shift={camX * 0.55} width={60} low={1.5} high={4.5} peaks={6} color="#c9787a" seed={7} />
      <Haze z={-18.6} color="#ffb38a" />
      <Ridge z={-16} shift={0} width={60} low={0.8} high={2.6} peaks={9} color="#8a8a4a" seed={17} />
      <Haze z={-15.2} color="#ffc89a" />
      <Ridge z={-13.5} shift={-camX * 1.1} width={64} low={0.3} high={1.2} peaks={14} color="#5a7a3a" seed={31} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshToonMaterial color="#7fb348" gradientMap={toonRamp} />
      </mesh>
      <Meadow x={0} z={-1.5} w={7} d={4} count={110} />
      <Shed position={[-2.9, 0, -4.4]} />
      <Fence position={[0.8, 0, -3.6]} length={5} />
      <Pine position={[3.4, 0, -4.5]} scale={1.2} />
      <Pine position={[-4.6, 0, -5]} scale={1.4} />
      <Pine position={[4.4, 0, -5.5]} scale={1.1} />
      {HIVES.map((h, i) => (
        <group key={i}>
          <BoxHive position={[h.x, 0, h.z]} color={h.c} boxes={h.n} />
          <Bees center={[h.x, 0.45, h.z + 0.35]} f={f} count={6} radius={0.3} seed={i * 10} />
        </group>
      ))}
      {bigHive && (
        <>
          <BoxHive position={BIG_HIVE} color="#ffd23f" boxes={1} scale={1.2} />
          <Bees center={[BIG_HIVE[0], 0.9, BIG_HIVE[2] + 0.2]} f={f} count={12} radius={0.55} seed={77} />
        </>
      )}
      {children}
    </>
  );
};

// ---------- stage wrappers ----------

type Extra<T> = Partial<Omit<T, "camera" | "f">>;
const street = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof StreetSet>> = {}, grade: Grade = {}, light?: PuppetLight) => (
  <Stage bg={extra.protest ? "#a8d4f5" : "#ffe08a"} camera={camera} puppets={puppets} light={light ?? (extra.protest ? undefined : sunLow)} {...grade} set={<StreetSet camera={camera} f={f} {...extra} />} />
);
const room = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof RoomSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} {...grade} set={<RoomSet camera={camera} f={f} {...extra} />} />
);
const bath = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof BathSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} light={bulbLight} {...grade} set={<BathSet camera={camera} f={f} {...extra} />} />
);
const laundro = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof LaundroSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} light={tubeLight} {...grade} set={<LaundroSet camera={camera} f={f} {...extra} />} />
);
const pink = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof PinkSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} light={ringLightOn([RING_AT[0], 1.6, RING_AT[2]])} {...grade} set={<PinkSet camera={camera} f={f} {...extra} />} />
);
const lab = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof LabSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} light={labLight(extra.alarm ?? 0)} {...grade} set={<LabSet camera={camera} f={f} {...extra} />} />
);
const apiary = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Extra<React.ComponentProps<typeof ApiarySet>> = {}, grade: Grade = {}) => (
  <Stage bg="#ffb35a" camera={camera} puppets={puppets} light={sunLow} {...grade} set={<ApiarySet camera={camera} f={f} {...extra} />} />
);

// ---------- shots ----------

// Protesters with placards along the barrier line; Brooke at the far edge filming herself (the seed).
const PROTESTERS: [number, number][] = [
  [-1.05, -1.75],
  [-0.55, -2.15],
  [0.75, -2.05],
  [1.25, -1.7],
];
const B_PROTEST: [number, number] = [0.62, -0.45];
const SLOGANS = ["NO!", "WE\nCARE", "CHANGE\nNOW", "BEES\nFIRST"];
const protestCrowd = (f: number): PuppetPlacement[] =>
  PROTESTERS.map((at, i) =>
    pup(`p${i}`, PROTEST[i], at, {
      expression: i % 2 ? "angry" : "determined",
      reachR: [70, -820 + Math.sin(f * 0.35 + i) * 25],
      frontR: true,
      handR: "fist",
      armL: [30 + Math.sin(f * 0.35 + i) * 30, -40],
      bob: Math.abs(Math.sin(f * 0.18 + i)) * -10,
      mouthOpen: 0.5 + 0.4 * Math.sin(f * 0.5 + i),
    }),
  );
const protestPlacards = (f: number) =>
  PROTESTERS.map((at, i) => <Placard key={i} position={[at[0] + 70 * K, (820 - Math.sin(f * 0.35 + i) * 25) * K - 0.45, at[1] + 0.1]} text={SLOGANS[i]} width={0.42} stick={0.9} tilt={(i % 2 ? -1 : 1) * 0.06} />);
const brookeSelfie = (f: number, at: [number, number], pose: Partial<PuppetPose> = {}): PuppetPlacement =>
  pup("brooke", BROOKE, at, { expression: "excited", hold: { item: "phone", hand: "R" }, armR: [135, -70], headTilt: 8 + Math.sin(f * 0.2) * 4, lookX: 0.6, ...pose });

// Hook: a low angle on the protest; Iris chanting under her AQUARIUS placard.
const ProtestLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 0.55, 1.55], [0.3, 0.6, 1.2], f / 52), target: [0.15, 1.35, -1.6], fov: 58 };
  return street(
    cam,
    f,
    [
      pup("iris", IRIS, IRIS_PROTEST, { expression: "determined", ...placardHands(), mouthOpen: 0.4 + 0.4 * Math.sin(f * 0.5), bob: Math.abs(Math.sin(f * 0.35)) * -12 }),
      ...protestCrowd(f),
      brookeSelfie(f, B_PROTEST),
    ],
    {
      protest: true,
      children: (
        <>
          <AquariusPlacard at={IRIS_PROTEST} badge={f - 2} f={f} />
          {protestPlacards(f)}
        </>
      ),
    },
  );
};

// Three days later: her phone, the reply, the badge on the placard behind her.
const ReplyPhone: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_PROTEST;
  const cam: CameraShot = { position: lerp3([at[0] - 0.14, 1.02, at[1] + 1.7], [at[0] - 0.15, 1.0, at[1] + 1.48], f / 40), target: [at[0] - 0.15, 0.98, at[1]], fov: 46 };
  const hand: [number, number] = [-200, -760];
  return street(
    cam,
    f,
    [pup("iris", IRIS, at, { ...faceChange([[0, "determined"], [10, "neutral"]], f), reachL: hand, frontL: true, handL: "open", lookX: -0.3, headTilt: -8, reachR: [0.12 / K, -PLACARD_GRIP], frontR: true, handR: "fist" })],
    {
      protest: true,
      children: (
        <>
          <AquariusPlacard at={at} f={f} />
          <PhoneText badge position={[at[0] + hand[0] * K - 0.02, -hand[1] * K + 0.08, at[1] + 0.24]} lines={[["U OK??", false], ["SORRY JUST\nSAW THIS", true]]} stamp="3 DAYS LATER" appear={f - 12} scale={0.95} tilt={0.1} />
        </>
      ),
    },
  );
};

// That's Iris: her purple room.
const RoomIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.25, 1.5], [0.05, 1.22, 1.15], f / 44), target: [0.0, 1.2, -1.8], fov: 50 };
  return room(cam, f, [pup("iris", IRIS, IRIS_ROOM, { ...moveChange([[0, "neutral"], [6, "happy", "wave"], [30, "smug", "handsOnHips"]], f), lookX: 0 })], { name: f - 4 });
};

// Low angle: brilliant, rebellious, slightly alien (the toy saucer turns overhead).
const TraitsLow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.35, 0.4, 1.6], [-0.3, 0.42, 1.3], f / 48), target: [-0.25, 1.5, -1.8], fov: 60 };
  return room(cam, f, [pup("iris", IRIS, IRIS_ROOM, { ...moveChange([[0, "smug", "handsOnHips"], [24, "excited", "cheer"]], f), lookX: 0.4 })], { name: 99, traits: f - 4 });
};

// The bathroom: she stirs the kombucha in the tub with a long ladle.
const ladle = (at: [number, number], f: number) => {
  const sx = Math.sin(f * 0.25) * 0.12;
  const hand: [number, number] = [(-0.45 + sx) / K, -560];
  return { hand, el: <Ladle from={[at[0] + hand[0] * K, -hand[1] * K, at[1] + 0.06]} to={[TUB[0] + 0.45 + sx * 1.5, 0.72, TUB[2] + 0.1]} /> };
};
const Ladle: React.FC<{ from: Vec3; to: Vec3 }> = ({ from, to }) => {
  const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = d.length();
  const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group userData={{ ghost: true }}>
      <group position={mid} rotation={[e.x, e.y, e.z]}>
        <InkBox size={[0.025, len, 0.025]} position={[0, 0, 0]} color="#c99a6b" ink={0.003} />
      </group>
      <Ball position={to} radius={0.06} color="#c9ced3" scale={[1, 0.5, 1]} />
    </group>
  );
};
const BathWide: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_BATH;
  const l = ladle(at, f);
  const cam: CameraShot = { position: lerp3([0.75, 1.45, 1.35], [0.65, 1.42, 1.05], f / 42), target: [0.6, 0.9, -2.0], fov: 52 };
  return bath(cam, f, [pup("iris", IRIS, at, { expression: "happy", reachL: l.hand, frontL: true, handL: "fist", lookX: -0.8, bend: 0.15, headTilt: -6 })], { children: l.el, mat: false });
};

// Top-down on the tub: the floating culture, bubbling.
const TubTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([TUB[0] + 0.05, 2.35, TUB[2] + 0.12], [TUB[0] + 0.05, 2.15, TUB[2] + 0.1], f / 18), target: [TUB[0], 0.7, TUB[2]], fov: 54 };
  return bath(cam, f, [], { bubble: 0.3, mat: false });
};

// Macro: wool socks in sandals on the bath mat. ON PURPOSE.
const SockMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 0.7, -0.3], [0.22, 0.65, -0.55], f / 49), target: [0.1, 0.2, -1.45], fov: 46 };
  return bath(cam, f, [], { tag: f - 22 });
};

// Low angle: Iris, smug, hands on hips, in her matching socks.
const SmugBath: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.9, -1.35];
  const cam: CameraShot = { position: lerp3([0.55, 0.35, 0.4], [0.6, 0.38, 0.15], f / 36), target: [0.85, 1.05, -1.4], fov: 56 };
  return bath(cam, f, [pup("iris", IRIS, at, { ...moveChange([[0, "smug", "handsOnHips"], [18, "happy", "point"]], f), lookX: -0.5 })]);
};

// She hugs the globe labelled HUMANITY.
const GlobeHug: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-0.45, -1.75];
  const hy = 640;
  const lift = Easing.out(Easing.back(1.5))(ramp(f, 2, 12));
  const cam: CameraShot = { position: lerp3([-0.3, 1.15, 0.6], [-0.33, 1.12, 0.35], f / 36), target: [-0.45, 0.95, -1.8], fov: 46 };
  return room(
    cam,
    f,
    [pup("iris", IRIS, at, { ...faceChange([[0, "neutral"], [8, "happy"]], f), reachL: [-80, -hy * lift - 420 * (1 - lift)], reachR: [80, -hy * lift - 420 * (1 - lift)], frontL: true, frontR: true, handL: "open", handR: "open", headTilt: Math.sin(f / 6) * 6, blink: f > 14 && f < 30 })],
    {
      humanity: 1,
      globeSpin: f * 0.08,
      children: (
        <group position={[at[0], 0, at[1] + 0.16]} userData={{ ghost: true }}>
          <Globe position={[0, (hy * lift + 420 * (1 - lift)) * K - 0.27, 0]} spin={f * 0.08} label="HUMANITY" />
        </group>
      ),
    },
  );
};

// Gag: the neighbours wave through the window; she snaps the curtains shut.
const Curtains: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [1.6, -2.15];
  const shut = Easing.in(Easing.cubic)(ramp(f, 30, 38));
  const yank = f >= 26 && f < 40;
  const cam: CameraShot = { position: lerp3([0.55, 1.55, 1.0], [0.65, 1.52, 0.7], f / 59), target: [1.2, 1.35, -2.6], fov: 46 };
  return room(
    cam,
    f,
    [
      pup("iris", IRIS, at, {
        ...faceChange([[0, "happy"], [14, "skeptical"], [40, "smug"]], f),
        view: "back",
        armL: yank ? [150 - shut * 60, -10] : [20, -10],
        armR: yank ? [150 - shut * 60, -10] : [20, -10],
        bob: yank ? -8 : 0,
      }),
    ],
    { curtains: shut, humanity: 1 },
  );
};

// The laundromat: the band plays (camera behind the five fans).
const fanSeat = (f: number, i: number, pose: Partial<PuppetPose> = {}): PuppetPlacement => pup(`fan${i}`, FANS[i], SEATS[i], { sit: true, expression: "neutral", bob: breathe(f + i * 7) * 0.4, ...pose });
const strum = (f: number) => Math.sin(f * 0.9);
const irisGuitarPose = (f: number, pose: Partial<PuppetPose> = {}): PuppetPose => ({
  expression: "excited",
  reachR: [40, -470 + strum(f) * 30],
  reachL: [-150, -600],
  frontL: true,
  frontR: true,
  handL: "fist",
  handR: "fist",
  bob: Math.abs(Math.sin(f * 0.3)) * -14,
  headTilt: Math.sin(f * 0.3) * 10,
  ...pose,
});
const irisGuitar = (at: [number, number], f: number) => <Guitar position={[at[0] - 0.02, 0.57, at[1] + 0.1]} tilt={0.9} />;
const juneDrum = (f: number): PuppetPlacement => {
  const a = Math.sin(f * 0.6);
  return pup("june", JUNE, L_JUNE, { expression: "happy", sit: true, reachL: [-110, -400 + a * 40], reachR: [110, -400 - a * 40], frontL: true, frontR: true, handL: "fist", handR: "fist", headTilt: a * 6 });
};
const juneSticks = (f: number) => {
  const a = Math.sin(f * 0.6);
  return (
    <>
      <Stick position={[L_JUNE[0] - 110 * K, (400 - a * 40) * K, L_JUNE[1] + 0.12]} angle={-0.9} />
      <Stick position={[L_JUNE[0] + 110 * K, (400 + a * 40) * K, L_JUNE[1] + 0.12]} angle={0.9} />
    </>
  );
};
const adaBoard = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement =>
  pup("ada", ADA, L_ADA, { expression: "determined", reachL: [-40, -560], reachR: [60, -500 + Math.sin(f * 1.2) * 50], frontL: true, frontR: true, handL: "fist", handR: "open", ...pose });
const adaWashboard = (f: number) => <Washboard position={[L_ADA[0], 0.62, L_ADA[1] + 0.1]} tilt={0.1} />;
const BandWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 2.05, 2.1], [0.05, 2.0, 1.8], f / 40), target: [0.0, 0.85, -1.8], fov: 54 };
  return laundro(
    cam,
    f,
    [pup("iris", IRIS, L_IRIS, irisGuitarPose(f)), juneDrum(f), adaBoard(f), ...SEATS.map((_, i) => fanSeat(f, i, { view: "back" }))],
    { children: <>{irisGuitar(L_IRIS, f)}{juneSticks(f)}{adaWashboard(f)}<MusicNotes position={[0.0, 1.4, -1.6]} f={f} count={6} spread={1.6} /></> },
  );
};

// Reverse: the five fans on plastic chairs (seen from the stage).
const AudienceFive: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.25, -2.05], [0.1, 1.22, -1.8], f / 43), target: [0.0, 0.7, 0.2], fov: 58 };
  return laundro(cam, f, SEATS.map((_, i) => fanSeat(f, i, { expression: i === 2 ? "bored" : "neutral", lookX: Math.sin(f * 0.1 + i) * 0.5 })));
};

// Nobody understands her: five confused faces.
const AudienceConfused: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.1, -1.75], [-0.08, 1.08, -1.5], f / 36), target: [0.0, 0.72, 0.2], fov: 56 };
  return laundro(
    cam,
    f,
    SEATS.map((_, i) => fanSeat(f, i, { ...moveChange([[0, "neutral"], [4 + i * 3, "confused", i % 2 ? "scratchHead" : "shrug"]], f) })),
  );
};

// And Iris is thrilled: a jump with the guitar.
const IrisThrilled: React.FC = () => {
  const f = useShotFrame();
  const at = L_IRIS;
  const j = jump(f, 0, 200, 28);
  const air = ((j.air as number) ?? 0) * K;
  return laundro(
    close(at[0], at[1], f / 29, 0.15, 1.08, 0.92),
    f,
    [pup("iris", IRIS, at, irisGuitarPose(f, { ...j, expression: "excited" }))],
    { children: <group position={[0, air, 0]}>{irisGuitar(at, f)}</group> },
  );
};

// Twist: Brooke walks in, phone up, ring light on her shoulder rig.
const BrookeEnters: React.FC = () => {
  const f = useShotFrame();
  const door = Easing.out(Easing.back(1.4))(ramp(f, 0, 8));
  const w = stroll(f, 6, 30, [L_DOOR_X, -2.55], [1.85, -1.1]);
  const cam: CameraShot = { position: lerp3([1.2, 1.25, 1.2], [1.35, 1.22, 0.9], f / 48), target: [2.0, 1.0, -1.7], fov: 50 };
  return laundro(
    cam,
    f,
    [pup("brooke", BROOKE, w.at, { ...faceChange([[0, "excited"], [30, "happy"]], f), ...w.pose, hold: { item: "phone", hand: "R" }, armR: [120, -60] }), adaBoard(f, { lookX: 0.9 })],
    { door, children: adaWashboard(f) },
  );
};

// Over Brooke's shoulder: her phone filming the band.
const OverShoulder: React.FC = () => {
  const f = useShotFrame();
  const b: [number, number] = [1.85, -1.1];
  const cam: CameraShot = { position: lerp3([2.15, 1.25, -0.25], [2.05, 1.22, -0.4], f / 33), target: [0.0, 1.0, -1.8], fov: 50 };
  return laundro(
    cam,
    f,
    [pup("brooke", BROOKE, b, { expression: "excited", view: "back", armR: [110, -40], armL: [20, -10] }), pup("iris", IRIS, L_IRIS, irisGuitarPose(f)), juneDrum(f), adaBoard(f)],
    { children: <>{irisGuitar(L_IRIS, f)}{juneSticks(f)}{adaWashboard(f)}<HeldPhone position={[b[0] - 0.12, 1.05, b[1] - 0.12]} screen="#7fe0d8" scale={1.4} /></> },
  );
};

// By morning: the video on the giant phone, the counter racing up.
const ViralWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 1.6], [0.0, 1.3, 1.2], f / 47), target: [-0.1, 1.15, -2.3], fov: 52 };
  return pink(cam, f, [pup("brooke", BROOKE, B_STUDIO, { ...moveChange([[0, "excited"], [16, "excited", "cheer"]], f), lookX: -0.8 })], { views: Easing.in(Easing.cubic)(ramp(f, 4, 47)) * 0.6 });
};
const ViewsMacro: React.FC = () => {
  const f = useShotFrame();
  const scale = 1.15;
  const y = 1.45 * scale;
  const cam: CameraShot = { position: lerp3([PHONE_AT[0] + 0.05, y - 0.05, -0.25], [PHONE_AT[0] + 0.03, y - 0.06, -0.45], f / 25), target: [PHONE_AT[0], y - 0.1, PHONE_AT[2]], fov: 46 };
  return pink(cam, f, [], { views: 0.6 + 0.4 * Easing.out(Easing.cubic)(ramp(f, 0, 14)) });
};

// Brooke to her own camera: socks with sandals are so in.
const BrookeSelfie: React.FC = () => {
  const f = useShotFrame();
  const at = B_STUDIO;
  return pink(
    close(at[0], at[1], f / 62, -0.2, 1.1, 0.95),
    f,
    [pup("brooke", BROOKE, at, { ...faceChange([[0, "excited"], [30, "happy"], [44, "excited"]], f), hold: { item: "phone", hand: "R" }, armR: [130, -75], headTilt: 10 + Math.sin(f * 0.25) * 6, lookX: 0.3, armL: f > 34 ? [150, -30] : [30, -20] })],
  );
};

// The whole city dresses like Iris (sunny street, yellow).
const CLONE_SPOTS: [number, number][] = [
  [-1.6, -1.9],
  [-0.9, -1.4],
  [-0.3, -2.1],
  [0.55, -1.6],
  [1.2, -2.0],
  [1.8, -1.3],
];
const cloneWalk = (f: number, i: number, speed = 1): PuppetPlacement => {
  const dir = i % 2 ? -1 : 1;
  const x0 = CLONE_SPOTS[i][0];
  const w = stroll(f + 400, 0, 2000, [x0 - dir * 5, CLONE_SPOTS[i][1]], [x0 + dir * 5, CLONE_SPOTS[i][1]]);
  const x = x0 + dir * (f - 20) * 0.012 * speed;
  return pup(`c${i}`, CLONES[i], [x, CLONE_SPOTS[i][1]], { expression: i % 3 === 0 ? "smug" : "happy", ...w.pose, view: "side", facing: dir as 1 | -1 });
};
const StreetClones: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.45, 2.4], [0.2, 1.45, 2.2], f / 39), target: [0.0, 1.05, -1.8], fov: 54 };
  return street(cam, f, CLONE_SPOTS.map((_, i) => cloneWalk(f, i)), {}, { flash: 0 });
};
const StreetTruck: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.2, 1.2, 1.2], [-0.2, 1.2, 1.1], f / 38), target: lerp3([1.0, 1.0, -1.8], [-0.4, 1.0, -1.8], f / 38), fov: 50 };
  return street(cam, f, [
    ...CLONE_SPOTS.map((_, i) => cloneWalk(f + 39, i)),
    pup("brooke", BROOKE, [0.1, -0.9], { expression: "excited", hold: { item: "phone", hand: "R" }, armR: [135, -70], headTilt: 8 }),
  ]);
};

// Iris among them, shocked.
const IRIS_STREET: [number, number] = [0.05, -1.0];
const IrisShocked: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_STREET;
  return street(close(at[0], at[1], f / 26, 0.25, 1.1, 0.95), f, [
    pup("iris", IRIS, at, { ...faceChange([[0, "neutral"], [6, "shocked"]], f), lookX: Math.sin(f * 0.4) > 0 ? 0.9 : -0.9 }),
    cloneWalk(f, 3),
    cloneWalk(f, 1),
  ]);
};
// Then she looks at her socks: tilt down to the sandals at her feet.
const SocksDown: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_STREET;
  const p = Easing.inOut(Easing.cubic)(ramp(f, 4, 30));
  const cam: CameraShot = { position: lerp3([at[0] + 0.1, 1.2, at[1] + 1.4], [at[0] + 0.12, 0.8, at[1] + 1.05], p), target: lerp3([at[0], 1.0, at[1]], [at[0], 0.15, at[1] + 0.25], p), fov: 46 };
  return street(
    cam,
    f,
    [pup("iris", IRIS, at, { ...faceChange([[0, "shocked"], [20, "sad"], [44, "disgusted"]], f), headTilt: -4, slump: ramp(f, 10, 30) * 0.7 })],
    {
      children: (
        <>
          <SockSandal position={[at[0] - 0.09, 0.0, at[1] + 0.32]} rotation={[0, 0.1, 0]} />
          <SockSandal position={[at[0] + 0.11, 0.0, at[1] + 0.34]} rotation={[0, -0.1, 0]} />
          {/* other people's sandals stepping past */}
          <SockSandal position={[at[0] - 0.55 + f * 0.01, 0.0, at[1] + 0.5]} rotation={[0, Math.PI / 2, 0]} sock="#c0392b" />
          <SockSandal position={[at[0] + 0.7 - f * 0.012, 0.0, at[1] + 0.62]} rotation={[0, -Math.PI / 2, 0]} sock="#c0392b" />
        </>
      ),
    },
  );
};

// What's going on inside? Push into her eyes.
const PushIn: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_STREET;
  const p = Easing.in(Easing.cubic)(ramp(f, 10, 62));
  const cam: CameraShot = { position: lerp3([at[0] + 0.1, 1.05, at[1] + 1.8], [at[0] + 0.02, 0.99, at[1] + 0.25], p), target: [at[0], 0.97, at[1]], fov: 40 };
  return street(cam, f, [pup("iris", IRIS, at, { ...faceChange([[0, "disgusted"], [18, "thinking"]], f), lookX: 0, gesture: "chin" })], {}, { flash: ramp(f, 52, 64) });
};

// The lab: the telescope aims out of the slit, away from the people waving behind it.
const IRIS_SCOPE: [number, number] = [0.05, -1.45];
const peopleWave = (f: number): PuppetPlacement[] =>
  PEOPLE.map((at, i) => pup(["june", "ada", "brooke"][i], [JUNE, ADA, BROOKE][i], at, { ...moveChange([[0, "happy", "wave"], [40 + i * 4, "sad"]], f), lookX: -0.9 }));
const LabWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.55, 2.2], [0.35, 1.5, 1.85], f / 39), target: [0.1, 1.2, -1.8], fov: 56 };
  return lab(cam, f, [pup("iris", IRIS, IRIS_SCOPE, { expression: "thinking", view: "side", facing: -1, bend: 0.2, armL: [70, -60], armR: [70, -60] }), ...peopleWave(f)], {}, { flash: 1 - ramp(f, 0, 10) });
};
const Eyepiece: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.75, 1.15, 0.2], [0.65, 1.12, -0.05], f / 43), target: [-0.3, 1.1, -1.7], fov: 50 };
  return lab(cam, f, [pup("iris", IRIS, IRIS_SCOPE, { ...faceChange([[0, "thinking"], [16, "happy"]], f), view: "side", facing: -1, bend: 0.2, armL: [70, -60], armR: [70, -60] }), ...peopleWave(f + 39)]);
};

// The FEELINGS box, locked; it rattles once.
const BoxMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([BOX_AT[0] + 0.12, 1.35, -1.05], [BOX_AT[0] + 0.08, 1.3, -1.3], f / 58), target: [BOX_AT[0], BOX_AT[1] + 0.2, BOX_AT[2]], fov: 44 };
  const shake = f > 24 && f < 44 ? (f - 24) * (1 - (f - 24) / 20) * 0.6 : 0;
  return lab(cam, f, [], { shake });
};
// The key on the far hook: LATER.
const KeyMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([KEY_AT[0] - 0.4, 1.9, -1.75], [KEY_AT[0] - 0.3, 1.88, -2.0], f / 31), target: [KEY_AT[0], KEY_AT[1] - 0.15, KEY_AT[2]], fov: 44 };
  return lab(cam, f, [], { keySwing: settle(f, 1.2, 0.25) * 0.35 });
};

// The big switch: IF POPULAR, STOP.
const SwitchWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.05, 1.25, 0.6], [1.15, 1.25, 0.25], f / 47), target: [SWITCH_AT[0], 1.25, SWITCH_AT[2]], fov: 50 };
  return lab(cam, f, [pup("iris", IRIS, [0.85, -2.0], { ...moveChange([[0, "thinking"], [18, "determined", "point"]], f), lookX: 1 })]);
};
const SwitchMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([SWITCH_AT[0] - 0.1, 1.6, -1.25], [SWITCH_AT[0] - 0.05, 1.58, -1.5], f / 30), target: [SWITCH_AT[0], 1.55, SWITCH_AT[2]], fov: 48 };
  return lab(cam, f, []);
};
// That switch just flipped: it slams down, sparks, the alarm goes red.
const Flip: React.FC = () => {
  const f = useShotFrame();
  const hit = 8;
  const flip = f < hit ? -anticipate(0) - 0.03 * Math.sin((f / hit) * Math.PI) : Math.min(1, Easing.in(Easing.quad)(ramp(f, hit, hit + 5))) - (f > hit + 5 ? settle(f - hit - 5, 3, 0.4) * 0.06 : 0);
  const cam: CameraShot = { position: lerp3([SWITCH_AT[0] + 0.2, 1.5, -1.0], [SWITCH_AT[0] + 0.15, 1.48, -1.25], f / 34), target: [SWITCH_AT[0], 1.45, SWITCH_AT[2]], fov: 52 };
  return lab(cam, f, [], { flip: Math.max(0, flip), spark: f - hit - 4, alarm: f > hit + 4 ? 1 : 0 });
};

// Back at the laundromat: Iris flings her sandals; one smacks the phone out of Brooke's hand.
const B_LAUNDRO: [number, number] = [1.75, -0.65];
const SANDAL_FROM: Vec3 = [L_IRIS[0] + 0.15, 1.0, L_IRIS[1] + 0.1];
const PHONE_AT_B: Vec3 = [B_LAUNDRO[0] + 0.05, 1.05, B_LAUNDRO[1] + 0.1];
const ThrowSandals: React.FC = () => {
  const f = useShotFrame();
  const at = L_IRIS;
  // wind-up, throw at 14, follow-through
  const wind = ramp(f, 2, 12);
  const thr = Easing.out(Easing.cubic)(ramp(f, 12, 17));
  const shoulder = 40 + wind * 120 - thr * 190;
  const t = (f - 15) / 12;
  const cam: CameraShot = { position: lerp3([0.6, 1.2, 0.6], [0.75, 1.18, 0.35], f / 27), target: [0.3, 1.0, -1.5], fov: 50 };
  return laundro(
    cam,
    f,
    [
      pup("iris", IRIS, at, { ...faceChange([[0, "angry"], [16, "determined"]], f), view: "side", facing: 1, armR: [shoulder, -30 + wind * -40], armL: [30 + thr * 30, -20], lean: -wind * 10 + thr * 18, handR: "fist", hold: f < 15 ? undefined : undefined }),
      adaBoard(f, { expression: "worried", lookX: -0.8 }),
    ],
    {
      guitarOnFloor: true,
      children: (
        <>
          {f < 15 && <SockSandal position={[at[0] + 0.05 - wind * 0.12, 1.05 + wind * 0.15, at[1] + 0.08]} rotation={[wind * 2, 0, 0.5]} scale={0.9} />}
          {t >= 0 && t <= 1.3 && (
            <group userData={{ ghost: true }}>
              <SockSandal position={lerp3(SANDAL_FROM, [B_LAUNDRO[0] - 0.3, 1.15, B_LAUNDRO[1]], Math.min(1, t))} rotation={[f * 0.6, f * 0.3, 0]} scale={0.9} />
            </group>
          )}
          {juneSticks(f)}
          {adaWashboard(f)}
        </>
      ),
    },
  );
};
const SandalHit: React.FC = () => {
  const f = useShotFrame();
  const hit = 6;
  const t = f - hit;
  const sandal: Vec3 = t < 0 ? lerp3([B_LAUNDRO[0] - 0.6, 1.15, B_LAUNDRO[1]], PHONE_AT_B, (f + 6) / 12) : [PHONE_AT_B[0] - t * 0.02, PHONE_AT_B[1] + t * 0.02 - t * t * 0.004, PHONE_AT_B[2] + 0.05];
  const phone: Vec3 = t < 0 ? PHONE_AT_B : [PHONE_AT_B[0] + t * 0.03, PHONE_AT_B[1] + t * 0.05 - t * t * 0.0035, PHONE_AT_B[2] + t * 0.01];
  const walk = stroll(f, 12, 26, L_IRIS, [2.15, -1.4]);
  const cam: CameraShot = { position: lerp3([1.0, 1.25, 1.2], [1.1, 1.22, 0.95], f / 44), target: [1.2, 1.0, -1.3], fov: 54 };
  return laundro(
    cam,
    f,
    [
      pup("brooke", BROOKE, B_LAUNDRO, { ...faceChange([[0, "excited"], [hit, "shocked"]], f), armR: t < 0 ? [120, -60] : [150, -20], armL: t < 0 ? [20, -10] : [150, -20], headTilt: t >= 0 ? -settle(t, 2.5, 0.35) * 12 : 0, lookX: -0.6 }),
      pup("iris", IRIS, walk.at, { expression: "determined", ...walk.pose }),
      pup("ada", ADA, L_ADA, { ...moveChange([[0, "worried"], [hit + 2, "shocked", "facepalm"]], f) }),
      pup("june", JUNE, L_JUNE, { ...faceChange([[0, "worried"], [hit + 4, "shocked"]], f), sit: true }),
    ],
    {
      guitarOnFloor: true,
      children: (
        <>
          <group userData={{ ghost: true }}>
            {phone[1] > 0.02 && <HeldPhone position={phone} rot={[t > 0 ? t * 0.5 : 0, 0, t > 0 ? t * 0.4 : 0]} screen="#7fe0d8" scale={1.3} />}
            {sandal[1] > 0.05 && <SockSandal position={sandal} rotation={[f * 0.6, f * 0.3, 0]} scale={0.9} />}
          </group>
          {t >= 0 && t < 10 && <Halo position={[PHONE_AT_B[0], PHONE_AT_B[1], PHONE_AT_B[2] + 0.1]} size={0.6 * (1 - t / 10)} color="#ffffff" strength={0.8} />}
        </>
      ),
    },
  );
};

// Back home: the tub bubbles and swells; then it explodes, foam hits the ceiling.
const TubBubble: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.25, 0.3], [0.25, 1.2, 0.0], f / 32), target: [TUB[0], 0.75, TUB[2]], fov: 50 };
  const shake = Math.sin(f * 2.3) * 0.01 * ramp(f, 10, 32);
  return bath({ ...cam, position: [cam.position[0] + shake, cam.position[1], cam.position[2]] }, f, [], { bubble: 0.5 + ramp(f, 0, 32) * 1.5, mat: false });
};
const Explode: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.35, 1.6], [0.35, 1.4, 1.75], f / 33), target: [TUB[0], 1.45, TUB[2]], fov: 62 };
  return bath(cam, f, [], { blast: f - 2, bubble: 2, pile: ramp(f, 10, 30), mat: false });
};

// By Friday: the apiary; Iris in a white suit and veil hat among the hives.
const IRIS_APIARY: [number, number] = [0.0, -1.6];
const HAT_Y = 1.24;
const ApiaryWide: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [-0.6, -1.7], IRIS_APIARY);
  const cam: CameraShot = { position: lerp3([-1.0, 1.35, 1.6], [0.2, 1.4, 1.4], Easing.inOut(Easing.quad)(f / 40)), target: [0.0, 1.0, -2.0], fov: 54 };
  return apiary(cam, f, [pup("iris", IRIS_BEE, w.at, { expression: "happy", ...w.pose })], { children: <BeeHat at={w.at} y={HAT_Y + ((w.pose.bob as number) ?? 0) * -K} /> });
};
// Medieval choir: she sings from a songbook, notes rise.
const songPose = (f: number, k = 0): Partial<PuppetPose> => ({ reachL: [-70, -560], reachR: [70, -560], frontL: true, frontR: true, handL: "open", handR: "open", mouthOpen: 0.45 + 0.35 * Math.sin(f * 0.18 + k), headTilt: Math.sin(f * 0.1 + k) * 8 });
const Choir: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_APIARY;
  return apiary(close(at[0], at[1], f / 41, 0.2, 1.1, 0.98), f, [pup("iris", IRIS_BEE, at, { expression: "happy", blink: true, ...songPose(f) })], {
    children: (
      <>
        <BeeHat at={at} y={HAT_Y} />
        <Songbook position={[at[0], 560 * K, at[1] + 0.12]} />
        <MusicNotes position={[at[0] + 0.15, 1.25, at[1] + 0.1]} f={f} count={5} spread={0.4} color="#5a2a8a" />
        <Bees center={[at[0], 1.15, at[1] + 0.2]} f={f} count={5} radius={0.35} seed={3} />
      </>
    ),
  });
};

// Her five fans follow her, in veil hats, singing too.
const FAN_APIARY: [number, number][] = [
  [-1.25, -1.25],
  [-0.7, -0.95],
  [0.55, -0.95],
  [1.1, -1.25],
  [1.6, -1.6],
];
const FansArrive: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.4, 2.3], [0.0, 1.38, 1.95], f / 43), target: [0.0, 0.95, -1.4], fov: 56 };
  const fans = FAN_APIARY.map((to, i) => {
    const w = stroll(f, i * 3, 24, [to[0] + (to[0] < 0 ? -2.2 : 2.2), to[1] + 0.3], to);
    return { at: w.at, p: pup(`fan${i}`, FANS_BEE[i], w.at, { expression: "happy", ...w.pose, ...(f > i * 3 + 24 ? songPose(f, i) : {}) }) };
  });
  return apiary(cam, f, [pup("iris", IRIS_BEE, IRIS_APIARY, { ...faceChange([[0, "happy"], [20, "worried"]], f), ...songPose(f), lookX: Math.sin(f * 0.15) }), ...fans.map((x) => x.p)], {
    children: (
      <>
        <BeeHat at={IRIS_APIARY} y={HAT_Y} />
        <Songbook position={[IRIS_APIARY[0], 560 * K, IRIS_APIARY[1] + 0.12]} />
        {fans.map((x, i) => (
          <BeeHat key={i} at={x.at} y={HAT_Y} />
        ))}
      </>
    ),
  });
};
// So does the influencer: Brooke walks in filming, with her ring light.
const BrookeFollows: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 22, [2.4, -0.6], [1.1, -0.75]);
  const cam: CameraShot = { position: lerp3([0.0, 1.2, 1.1], [0.15, 1.18, 0.85], f / 33), target: [0.6, 1.0, -1.3], fov: 50 };
  return apiary(cam, f, [
    pup("iris", IRIS_BEE, IRIS_APIARY, { ...faceChange([[0, "worried"], [16, "disgusted"]], f), lookX: 1 }),
    pup("brooke", BROOKE, w.at, { ...faceChange([[0, "excited"]], f), ...w.pose, hold: { item: "phone", hand: "R" }, armR: [130, -70] }),
  ], { children: <BeeHat at={IRIS_APIARY} y={HAT_Y} /> });
};

// You text Iris: the phone. She replies from a beehive.
const TextMacro: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_HIVE;
  const cam: CameraShot = { position: lerp3([at[0] - 0.13, 1.0, at[1] + 1.25], [at[0] - 0.14, 0.98, at[1] + 1.05], f / 28), target: [at[0] - 0.15, 0.95, at[1]], fov: 44 };
  return apiary(cam, f, [pup("iris", IRIS_BEE, at, { expression: "neutral", reachL: [-150, -650], frontL: true, handL: "open", lookX: -0.6, headTilt: -6 })], {
    bigHive: true,
    children: (
      <>
        <BeeHat at={at} y={HAT_Y} />
        <PhoneText position={[at[0] - 150 * K - 0.06, 650 * K + 0.06, at[1] + 0.3]} lines={[["U ALIVE??", false], ["BUSY.\nBEES.", true]]} appear={f - 10} scale={0.7} />
      </>
    ),
  });
};
const HiveFinal: React.FC = () => {
  const f = useShotFrame();
  const at = IRIS_HIVE;
  const cam: CameraShot = { position: lerp3([0.0, 1.3, 1.5], [0.25, 1.2, 0.9], Easing.inOut(Easing.cubic)(f / 58)), target: [0.3, 0.95, -1.5], fov: 50 };
  return apiary(
    cam,
    f,
    [pup("iris", IRIS_BEE, at, { ...moveChange([[0, "neutral"], [20, "smug", "wave"]], f), lookX: 0 })],
    { bigHive: true, children: <BeeHat at={at} y={HAT_Y} /> },
  );
};

const SHOTS: Shot[] = [
  [0, 52, ProtestLow, false],
  [52, 92, ReplyPhone, false],
  [92, 136, RoomIntro, true],
  [136, 184, TraitsLow, false],
  [184, 226, BathWide, true],
  [226, 244, TubTop, false],
  [244, 293, SockMacro, false],
  [293, 329, SmugBath, false],
  [329, 365, GlobeHug, true],
  [365, 424, Curtains, false],
  [424, 464, BandWide, true],
  [464, 507, AudienceFive, false],
  [507, 543, AudienceConfused, false],
  [543, 572, IrisThrilled, false],
  [572, 620, BrookeEnters, false],
  [620, 653, OverShoulder, false],
  [653, 700, ViralWide, true],
  [700, 725, ViewsMacro, false],
  [725, 787, BrookeSelfie, false],
  [787, 826, StreetClones, true],
  [826, 864, StreetTruck, false],
  [864, 890, IrisShocked, false],
  [890, 952, SocksDown, false],
  [952, 1016, PushIn, false],
  [1016, 1055, LabWide, true],
  [1055, 1098, Eyepiece, false],
  [1098, 1156, BoxMacro, false],
  [1156, 1187, KeyMacro, false],
  [1187, 1234, SwitchWide, false],
  [1234, 1264, SwitchMacro, false],
  [1264, 1298, Flip, false],
  [1298, 1325, ThrowSandals, true],
  [1325, 1369, SandalHit, false],
  [1369, 1401, TubBubble, true],
  [1401, 1434, Explode, false],
  [1434, 1474, ApiaryWide, true],
  [1474, 1515, Choir, false],
  [1515, 1558, FansArrive, false],
  [1558, 1591, BrookeFollows, false],
  [1591, 1619, TextMacro, false],
  [1619, TIMING.totalFrames, HiveFinal, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.1, until: 92 },
  { at: 2, src: sfx("pop"), volume: 0.35 },
  { at: 64, src: sfx("credit-blip"), volume: 0.3 },
  { at: 66, src: sfx("pop"), volume: 0.25 },
  { at: 96, src: sfx("pop"), volume: 0.3 },
  ...[140, 156, 172].map((at) => ({ at, src: sfx("pop"), volume: 0.25 })),
  { at: 184, src: sfx("hum"), volume: 0.05, until: 329 },
  { at: 226, src: sfx("paper"), volume: 0.15 },
  { at: 266, src: sfx("pop"), volume: 0.3 },
  { at: 331, src: sfx("whoosh"), volume: 0.15 },
  { at: 395, src: sfx("whoosh"), volume: 0.3 },
  { at: 401, src: sfx("stamp"), volume: 0.25 },
  { at: 424, src: sfx("hum"), volume: 0.06, until: 653 },
  ...[430, 440, 450, 460, 470, 480, 490, 500].map((at) => ({ at, src: sfx("tick"), volume: 0.12 })),
  { at: 543, src: sfx("whoosh"), volume: 0.2 },
  { at: 562, src: sfx("boom"), volume: 0.2 },
  { at: 572, src: sfx("door"), volume: 0.35 },
  { at: 600, src: sfx("riser"), volume: 0.12 },
  { at: 620, src: sfx("sting"), volume: 0.3 },
  { at: 624, src: sfx("button"), volume: 0.25 },
  ...[660, 672, 684, 694].map((at) => ({ at, src: sfx("credit-blip"), volume: 0.2 })),
  { at: 700, src: sfx("chime"), volume: 0.3 },
  { at: 708, src: sfx("pop"), volume: 0.25 },
  { at: 787, src: sfx("ambience"), volume: 0.08, until: 952 },
  { at: 870, src: sfx("near-miss"), volume: 0.15 },
  { at: 1000, src: sfx("riser"), volume: 0.1 },
  { at: 1016, src: sfx("whoosh"), volume: 0.3 },
  { at: 1016, src: sfx("hum"), volume: 0.07, until: 1298 },
  { at: 1122, src: sfx("drawer"), volume: 0.25 },
  { at: 1160, src: sfx("tick"), volume: 0.2 },
  { at: 1250, src: sfx("button"), volume: 0.2 },
  { at: 1272, src: sfx("stamp"), volume: 0.45 },
  { at: 1276, src: sfx("boom"), volume: 0.3 },
  ...[1278, 1286, 1294].map((at) => ({ at, src: sfx("near-miss"), volume: 0.1 })),
  { at: 1313, src: sfx("whoosh"), volume: 0.3 },
  { at: 1331, src: sfx("stamp"), volume: 0.35 },
  { at: 1333, src: sfx("tape-stop"), volume: 0.2 },
  { at: 1350, src: sfx("door"), volume: 0.25 },
  { at: 1369, src: sfx("reel-spin"), volume: 0.1, until: 1403 },
  { at: 1403, src: sfx("boom"), volume: 0.5 },
  { at: 1405, src: sfx("whoosh"), volume: 0.3 },
  { at: 1434, src: sfx("ambience"), volume: 0.09, until: TIMING.totalFrames },
  { at: 1434, src: sfx("hum"), volume: 0.05, until: TIMING.totalFrames },
  { at: 1478, src: sfx("chime"), volume: 0.25 },
  { at: 1600, src: sfx("credit-blip"), volume: 0.3 },
  { at: 1602, src: sfx("pop"), volume: 0.25 },
  { at: 1640, src: sfx("chime"), volume: 0.25 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 572, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 572, to: 653, volume: 0.13 },
  { src: MUSIC_FILES.upbeat, from: 653, to: 952, volume: 0.12 },
  { src: MUSIC_FILES.mystery, from: 952, to: 1298, volume: 0.13 },
  { src: MUSIC_FILES.tension, from: 1298, to: 1434, volume: 0.12 },
  { src: MUSIC_FILES.lounge, from: 1434, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
