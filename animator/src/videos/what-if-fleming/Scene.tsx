import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  Chair,
  Door,
  faceChange,
  foleyCues,
  frameSpot,
  Halo,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  jump,
  Label,
  Lamp,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
} from "../../engine";
import {
  Bench,
  Bottle,
  Bunsen,
  Calendar,
  Cot,
  Cottage,
  CultureVessel,
  Deckchair,
  DishStack,
  FamilyTree,
  Flask,
  Incubator,
  LondonWindow,
  Microscope,
  MouseCage,
  Outdoors,
  PenCrate,
  PetriDish,
  RoundTree,
  Tent,
  TubeRack,
  Vial,
  WallClock,
} from "./props";
import TIMING_JSON from "./timing.json";

// "What if Fleming had cleaned up his lab?": St Mary's Hospital, London, 1928. Fleming leaves his staphylococcus dishes
// on the bench, not in the warm incubator, and goes on holiday; on 3 September a blue-green mould has cleared the germs
// round it. Penicillin; Oxford makes it work in 1940; over two million doses by D-Day. What if he had tidied up?
// Sets: the lab in five lights (Room + props.tsx), a Suffolk garden and a D-Day beach (Outdoors), the truth room,
// Oxford 1940, a grey lab, a ward and a living room.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-fleming";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ASPECT = 9 / 16;

// ---------- cast ----------

const FLEMING: PuppetLook = { skin: "#f0c8a8", hair: "#8a8070", outfit: "#f2f0ea", vest: "#3a3a4a" };
const FLEMING_OUT: PuppetLook = { skin: "#f0c8a8", hair: "#8a8070", outfit: "#4a4a56", hat: "#2e2e34" };
const FLEMING_HOLS: PuppetLook = { skin: "#f0c8a8", hair: "#8a8070", outfit: "#ece2c8", hat: "#e0c070", suspenders: "#7a4a2a" };
const PRYCE: PuppetLook = { skin: "#f4d0b0", hair: "#2a1e16", outfit: "#6a6a72" };
const OXFORD: PuppetLook = { skin: "#f4d4b8", hair: "#d8b060", outfit: "#f4f2ec", glasses: true };
const CHAIN: PuppetLook = { skin: "#ecc4a4", hair: "#1a1410", outfit: "#f4f2ec", beard: "#1a1410" };
const MEDIC: PuppetLook = { skin: "#e8b898", hair: "#5a3a1e", outfit: "#6a6e3e" };
const SOLDIER: PuppetLook = { skin: "#f0c8a8", hair: "#c89a5a", outfit: "#7a7a48", kerchief: "#f4f0e6" };
const SCIENTIST: PuppetLook = { skin: "#e8c0a0", hair: "#2a1e16", outfit: "#7a7e86", long: true };
const NURSE: PuppetLook = { skin: "#f4d0b0", hair: "#6a3a1e", outfit: "#f4f2ec", apron: "#ffffff", long: true, skirt: true };
const PATIENT_A: PuppetLook = { skin: "#e8b898", hair: "#3a2a1e", outfit: "#9ab8d8" };
const PATIENT_B: PuppetLook = { skin: "#d8a888", hair: "#1a1410", outfit: "#9ab8d8", long: true };
const GRANDMA: PuppetLook = { skin: "#f0c8a8", hair: "#e8e8e8", outfit: "#c86a7a", long: true, skirt: true };
const GRANDSON: PuppetLook = { skin: "#f4d0b0", hair: "#6a3a1e", outfit: "#e8b830" };

// ---------- the lab at St Mary's (shots 1, 2, 4, 5, 9) ----------

type LabLight = "day" | "teal" | "dusk" | "morning" | "dream";
const LAB_MOOD = { day: "warm", teal: "daylight", dusk: "dusk", morning: "daylight", dream: "dream" } as const;
const LAB_WALL = { day: "#a8b48a", teal: "#5e8e80", dusk: "#8a4a3a", morning: "#e6d8b8", dream: "#6a4a8a" };
const LAB_FLOOR = { day: "#6a4a2e", teal: "#4a5a50", dusk: "#4a2a22", morning: "#7a6248", dream: "#3a2a4a" };

const BENCH_Z = -0.35;
const TOP = 0.55;
const HERO: Vec3 = [0.3, TOP, -0.22]; // the dish that gets the mould
const FLEMING_AT: [number, number] = [0.15, -0.95];
const INC_AT: Vec3 = [-1.95, 0, -1.45];

const Lab: React.FC<{
  camera: CameraShot;
  frame: number;
  light: LabLight;
  door?: number;
  hero?: { lid?: number; mould?: number; clear?: number } | null;
  incubator?: { position?: Vec3; rotationY?: number; open?: number; glow?: number; halo?: boolean; label?: boolean; dishes?: number; children?: React.ReactNode };
  bench?: boolean;
  children?: React.ReactNode;
}> = ({ camera, frame, light, door = 0, hero = {}, incubator = {}, bench = true, children }) => (
  <Room camera={camera} mood={LAB_MOOD[light]} floor={LAB_FLOOR[light]} wall={LAB_WALL[light]} wallPattern="plaster" floorPattern="wood" width={6.4} depth={4}>
    <LondonWindow position={[0.55, 1.55, -1.95]} size={[0.9, 1.3]} dusk={light === "dusk" ? 1 : 0} />
    <Shelf position={[-1.15, 1.25, -1.9]} width={1.0} rows={3} color="#6a4426" seed={3} />
    <Door position={[1.55, 0, -1.94]} open={door} color="#6a4a2e" frame="#e8dcc0" />
    {bench && (
      <>
        <Bench position={[0, 0, BENCH_Z]} size={[2.4, TOP, 0.62]} />
        <DishStack position={[-0.85, TOP, -0.3]} count={6} seed={3} />
        <DishStack position={[-0.62, TOP, -0.45]} count={4} seed={5} />
        <DishStack position={[0.72, TOP, -0.2]} count={3} seed={7} />
        <Microscope position={[0.86, TOP, -0.5]} />
        <TubeRack position={[-0.3, TOP, -0.5]} n={5} />
        <Bottle position={[-0.04, TOP, -0.58]} />
        <Bottle position={[0.1, TOP, -0.6]} color="#e0eeec" h={0.13} />
        <Bunsen position={[1.02, TOP, -0.22]} frame={frame} lit={light !== "dusk"} />
        <InkBox size={[0.24, 0.006, 0.3]} position={[-0.05, TOP + 0.003, -0.2]} rotation={[0, 0.25, 0]} color="#f0e8d4" ink={0.002} />
        <InkBox size={[0.22, 0.006, 0.28]} position={[-0.12, TOP + 0.009, -0.16]} rotation={[0, -0.15, 0]} color="#e8dcc0" ink={0.002} />
        {hero && <PetriDish position={HERO} seed={21} colonies={1} lid={hero.lid ?? 0} mould={hero.mould ?? 0} clear={hero.clear ?? 0} />}
      </>
    )}
    <Incubator position={incubator.position ?? INC_AT} rotationY={incubator.rotationY ?? 0.15} open={incubator.open ?? 0} glow={incubator.glow ?? (light === "dusk" ? 1 : 0.6)} dishes={incubator.dishes ?? 6} halo={incubator.halo ?? true} label={incubator.label ?? true}>
      {incubator.children}
    </Incubator>
    {children}
  </Room>
);

const labLight = (light: LabLight) =>
  light === "dusk"
    ? { tint: "#ffb890", tintAmount: 0.1, shadow: 0.3, points: [{ position: [INC_AT[0] + 0.3, 0.9, INC_AT[2] + 0.6] as Vec3, color: "#ff9a4a", strength: 1.6, range: 3 }] }
    : light === "dream"
      ? { tint: "#d8b8ff", tintAmount: 0.1, shadow: 0.25, points: [{ position: [0.0, 0.9, -0.7] as Vec3, color: "#ffa050", strength: 1.6, range: 2.4 }] }
      : { tint: "#fff0d8", tintAmount: 0.06, shadow: 0.2, distant: [{ direction: [0.2, 0.4, -1] as Vec3, color: "#fff2d8", strength: 0.9 }] };

// ---------- 1. Hook: along the cluttered bench onto Fleming, who grabs his hat ----------

const S1_END: CameraShot = { position: [0.35, 1.25, 2.55], target: [0.1, 0.92, -0.7], fov: 40 };
const HAT_ON = 132;
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..155
  const camera = beatPath(
    [
      { at: 0, position: [-1.35, 0.88, 0.95], target: [0.2, 0.68, -0.4], fov: 42 },
      { at: 60, position: [-0.6, 0.95, 1.4], target: [0.2, 0.75, -0.5], fov: 41 },
      { at: 154, ...S1_END },
    ],
    f,
  );
  const hatLift = ease(f, HAT_ON - 16, HAT_ON) - ease(f, HAT_ON, HAT_ON + 10);
  return (
    <Stage
      set={<Lab camera={camera} frame={f} light="day" />}
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.2}
      puppets={[
        {
          id: "fleming",
          look: f >= HAT_ON ? { ...FLEMING, hat: "#2e2e34" } : FLEMING,
          at: FLEMING_AT,
          pose: {
            view: "front",
            ...faceChange([[0, "thinking"], [60, "neutral"], [118, "happy"]], f),
            reachR: f < 100 ? [120 + Math.sin(f * 0.12) * 25, -520 - Math.abs(Math.sin(f * 0.09)) * 30] : [mix(130, 60, hatLift), mix(-560, -930, hatLift)],
            handR: "open",
            frontR: true,
            reachL: [-130, -520],
            handL: "open",
            frontL: true,
            lookX: f < 100 ? -0.3 : 0.2,
          },
        },
      ]}
      light={labLight("day")}
      foreground={<DishStack position={frameSpot(S1_END, ASPECT, -0.78, -0.9, 0.9)} count={3} seed={11} />}
    />
  );
};

// ---------- 2. London, 1928: Fleming at the microscope holds up a dish of germs ----------

const S2_END: CameraShot = { position: [0.3, 1.22, 1.95], target: [0.12, 1.05, -0.9], fov: 40 };
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..116
  const camera = beatPath(
    [
      { at: 0, position: [0.55, 1.95, 2.25], target: [0.35, 1.2, -1.2], fov: 40 },
      { at: 115, ...S2_END },
    ],
    f,
  );
  const lift = ease(f, 60, 76); // "grows the germs"
  const reach: [number, number] = [mix(110, 130, lift), mix(-520, -690, lift)];
  const hand = handWorld(FLEMING_AT, reach, camera);
  return (
    <Stage
      set={
        <Lab camera={camera} frame={f + 200} light="teal" hero={null}>
          <Calendar position={[-0.35, 1.78, -1.93]} text="1928" />
          <group userData={{ ghost: true }}><PetriDish position={[hand[0], hand[1] - 0.02, hand[2] + 0.06]} rotation={[1.1, 0, 0]} seed={5} colonies={1} lidOn={false} /></group>
        </Lab>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={[
        {
          id: "fleming",
          look: FLEMING,
          at: FLEMING_AT,
          pose: {
            view: "front",
            ...faceChange([[0, "thinking"], [70, "determined"]], f),
            reachR: reach,
            handR: "open",
            frontR: true,
            reachL: [-130, -520],
            handL: "open",
            frontL: true,
            lookX: f < 60 ? -0.6 : 0.5,
            headTilt: f > 76 ? 6 : 0,
          },
        },
      ]}
      light={labLight("teal")}
      foreground={<Bottle position={frameSpot(S2_END, ASPECT, 0.82, -0.86, 0.85)} h={0.22} />}
    />
  );
};

// ---------- 3. That August: holiday in a Suffolk garden ----------

const S3_END: CameraShot = { position: [0.35, 1.0, 2.6], target: [0.0, 0.85, -0.5], fov: 40 };
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..48
  const camera = beatPath(
    [
      { at: 0, position: [-0.6, 1.05, 2.5], target: [-0.25, 0.85, -0.5], fov: 40 },
      { at: 47, ...S3_END },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Outdoors camera={camera} ground="#6aa04a" haze="#e8f0f2">
          <Cottage position={[-0.6, 0, -6.5]} scale={0.9} />
          <RoundTree position={[2.2, 0, -4.5]} scale={1.1} />
          <RoundTree position={[-2.8, 0, -5.5]} scale={1.3} color="#3e7a34" />
          <RoundTree position={[3.6, 0, -9]} scale={1.4} color="#5a9a44" />
          <group userData={{ ghost: true }}>
            <Deckchair position={[0, 0, -0.62]} />
          </group>
          <InkBox size={[0.36, 0.3, 0.36]} position={[0.55, 0.15, -0.3]} color="#8a6a3a" ink={0.008} />
          <InkCylinder radius={0.04} height={0.06} position={[0.55, 0.33, -0.3]} color="#f4f0e6" ink={0.003} />
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[-1.5 + i * 0.9 + Math.sin(f * 0.05 + i) * 0.1, 2.6 + Math.sin(f * 0.13 + i * 2) * 0.08, -3 - i]} rotation={[0, 0, Math.sin(f * 0.6 + i) * 0.4]}>
              <planeGeometry args={[0.07, 0.02]} />
              <meshBasicMaterial color="#2a2a2a" />
            </mesh>
          ))}
        </Outdoors>
      }
      camera={camera}
      bg="#7fb3ea"
      blur={2.0}
      puppets={[
        {
          id: "fleming",
          look: FLEMING_HOLS,
          at: [0, -0.4],
          pose: { sit: true, view: "front", ...faceChange([[0, "happy"]], f), reachR: [150, -560], handR: "open", reachL: [-120, -470], lookX: 0.4, headTilt: -5 + Math.sin(f * 0.1) * 2 },
        },
      ]}
      light={{ tint: "#fff4e0", shadow: 0.16, distant: [{ direction: [-0.4, 0.85, 0.45], color: "#fff0c8", strength: 1.2 }] }}
      foreground={<RoundTree position={frameSpot(S3_END, ASPECT, 0.95, -0.95, 1.1)} scale={0.25} color="#3e7a34" />}
    />
  );
};

// ---------- 4. Dusk: the door bangs shut, the lid slides off the dish; the warm incubator stands empty-handed ----------

const BANG = 28;
const S4_END: CameraShot = { position: [-2.1, 1.15, 1.3], target: [-2.0, 0.72, -1.35], fov: 40 };
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..93
  const camera = beatPath(
    [
      { at: 0, position: [-0.05, 0.98, 0.75], target: [0.75, 0.68, -1.0], fov: 40 },
      { at: 30, position: [-0.15, 1.0, 0.8], target: [0.55, 0.66, -0.9], fov: 40 },
      { at: 92, ...S4_END },
    ],
    f,
  );
  const door = f < BANG ? mix(0.55, 0, ease(f, 14, BANG)) : 0;
  const lid = ease(f, BANG + 2, BANG + 12) * 0.13;
  return (
    <Stage
      set={<Lab camera={camera} frame={f} light="dusk" door={door} hero={{ lid }} />}
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.2}
      puppets={[]}
      light={labLight("dusk")}
    />
  );
};

// ---------- 5. September third: Fleming is back; "That's funny."; down onto the mouldy dish ----------

const S5: React.FC = () => {
  const f = useShotFrame(); // 0..212
  const camera = beatPath(
    [
      { at: 0, position: [0.55, 1.3, 2.75], target: [0.35, 0.95, -0.7], fov: 40 },
      { at: 72, position: [0.42, 1.18, 1.65], target: [0.35, 0.86, -0.6], fov: 41 },
      { at: 211, position: [0.36, 1.0, 0.95], target: [0.36, 0.9, -0.9], fov: 42 },
    ],
    f,
  );
  const FL: [number, number] = [0.62, -0.95];
  const w = stroll(f, 0, 34, [1.3, -1.35], FL);
  const clear = ease(f, 150, 196);
  const pick = ease(f, 44, 58);
  const reachL: [number, number] = [mix(-120, -250, pick), mix(-480, -545, pick)];
  const hand = handWorld(FL, reachL, camera);
  const dishAt: Vec3 = [mix(HERO[0], hand[0], pick), mix(HERO[1], hand[1] - 0.02, pick), mix(HERO[2], hand[2] + 0.07, pick)];
  const dropped = f >= 38;
  return (
    <Stage
      set={
        <Lab camera={camera} frame={f} light="morning" door={f < 12 ? 0.6 : mix(0.6, 0, ease(f, 12, 30))} hero={f < 44 ? { lid: 0.13, mould: 1, clear: 0.25 } : null}>
          {f >= 44 && (
            <group userData={{ ghost: true }}>
              <PetriDish position={dishAt} rotation={[1.15 * pick, 0, 0]} radius={mix(0.09, 0.13, pick)} seed={21} colonies={1} mould={1} clear={0.25 + clear * 0.75} lidOn={false} />
            </group>
          )}
          {dropped && <InkBox size={[0.42, 0.3, 0.12]} position={[1.0, 0.15, -1.05]} color="#5a3a22" ink={0.006} />}
        </Lab>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={f < 90 ? 2.2 : 1.6}
      puppets={[
        {
          id: "fleming",
          look: FLEMING_OUT,
          at: w.at,
          pose:
            f < 34
              ? { ...w.pose, ...faceChange([[0, "happy"]], f), hold: { item: "briefcase", hand: "R" } }
              : {
                  view: "front",
                  ...faceChange([[34, "neutral"], [42, "confused"], [70, "thinking"], [120, "excited"]], f),
                  hold: dropped ? undefined : { item: "briefcase", hand: "R" },
                  reachL,
                  handL: "open",
                  frontL: true,
                  reachR: [130, mix(-520, -560, ease(f, 60, 80))],
                  handR: f > 60 ? "point" : "open",
                  lookX: -0.5,
                  headTilt: f > 50 ? -8 : 0,
                },
        },
        {
          id: "pryce",
          look: PRYCE,
          at: [-0.04, -1.15],
          pose: { view: "front", ...faceChange([[0, "happy"], [44, "confused"], [150, "excited"]], f), gesture: f < 30 ? "wave" : undefined, lookX: 0.8, lean: 6 * ease(f, 44, 56) },
        },
      ]}
      light={labLight("morning")}
    />
  );
};

// ---------- 6. You see: the mould kills the germs on a giant dish; PENICILLIN; Fleming's flask foams over ----------

const FOAM = 160;
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..195
  const camera = beatPath(
    [
      { at: 0, position: [-0.3, 1.85, 1.0], target: [-0.3, 0.5, -0.45], fov: 42 },
      { at: 70, position: [-0.2, 1.62, 1.35], target: [-0.18, 0.55, -0.4], fov: 42 },
      { at: 116, position: [0.05, 1.3, 1.6], target: [0.1, 0.7, -0.15], fov: 42 },
      { at: 194, position: [0.12, 1.32, 1.95], target: [0.1, 0.7, -0.2], fov: 42 },
    ],
    f,
  );
  const kill = ease(f, 40, 100);
  const foam = ease(f, FOAM, FOAM + 14);
  const cork = ease(f, FOAM + 8, FOAM + 22);
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#1e2440" wall="#2e3a6a" wallPattern="plain" floorPattern="concrete" width={6} depth={4}>
          <InkCylinder radius={0.32} height={0.5} position={[-0.3, 0.25, -0.45]} color="#4a5a8a" ink={0.012} />
          <PetriDish position={[-0.3, 0.5, -0.45]} radius={0.42} seed={9} colonies={1} mould={0.6 + kill * 0.4} clear={kill} lidOn={false} />
          <InkBox size={[0.32, 0.55, 0.32]} position={[0.22, 0.275, 0.1]} color="#5a6a9a" ink={0.01} />
          <group userData={{ ghost: true }}>
            <Flask position={[0.22, 0.55, 0.1]} scale={1.1} foam={foam} cork={cork} frame={f} liquid="#f0c040" />
          </group>
          <Label text="PENICILLIN" position={[0.22, 0.36, 0.265]} width={0.3} appear={f - 116} bg="#f4e8b0" />
          <pointLight position={[0, 2.2, 1.0]} color="#b8c8ff" intensity={2.2} distance={6} />
          <Halo position={[-0.3, 0.55, -0.9]} size={1.6} color="#7ac8b8" strength={0.25 * kill} />
          <Burst kind="sparks" at={[0.22, 0.9, 0.1]} frame={f - FOAM - 9} count={10} size={0.4} speed={1.0} colors={["#fff8e0", "#ffe090"]} seed={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.8}
      puppets={[]}
      light={{ tint: "#c8d4ff", tintAmount: 0.1, shadow: 0.3, points: [{ position: [0, 2.2, 1.0], color: "#b8c8ff", strength: 1.5, range: 5 }] }}
    />
  );
};

// ---------- 7. Oxford, 1940: culture vessels, a tiny vial, "It works!" ----------

const WORKS = 124;
const S7_END: CameraShot = { position: [0.1, 1.25, 2.3], target: [0.0, 0.98, -0.9], fov: 40 };
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..148
  const camera = beatPath(
    [
      { at: 0, position: [-0.55, 1.4, 2.7], target: [-0.65, 1.15, -1.6], fov: 40 },
      { at: 96, position: [0.05, 1.15, 1.75], target: [0.05, 0.85, -0.6], fov: 40 },
      { at: 147, ...S7_END },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#2e3a2a" wall="#3e5a44" wallPattern="panel" floorPattern="wood" width={6} depth={4}>
          {[0.75, 1.15, 1.55].map((y, r) => (
            <group key={y}>
              <InkBox size={[1.5, 0.04, 0.35]} position={[-0.95, y, -1.8]} color="#4a2e18" ink={0.008} />
              {[0, 1, 2, 3].map((k) => (
                <CultureVessel key={k} position={[-1.5 + k * 0.36, y + 0.02, -1.78]} rotation={[0, (k + r) % 2 ? 0.1 : -0.08, 0]} />
              ))}
            </group>
          ))}
          <Calendar position={[0.5, 1.78, -1.93]} text="1940" />
          <Bench position={[0, 0, -0.3]} size={[1.8, TOP, 0.6]} color="#5a3418" />
          <MouseCage position={[-0.42, TOP, -0.35]} frame={f} scatter={ease(f, WORKS + 2, WORKS + 12)} />
          <Vial position={[0.15, TOP, -0.12]} glow={ease(f, 80, 96)} />
          <CultureVessel position={[0.55, TOP, -0.4]} />
          <Lamp position={[-0.75, TOP, -0.5]} />
          <pointLight position={[-0.6, 1.0, -0.2]} color="#ffd080" intensity={1.6} distance={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={2.2}
      puppets={[
        {
          id: "oxford",
          look: OXFORD,
          at: [-0.18, -0.85],
          pose: {
            view: "front",
            ...faceChange([[0, "thinking"], [WORKS - 4, "excited"]], f),
            ...(f >= WORKS ? jump(f, WORKS, 200, 22) : {}),
            reachR: f < WORKS ? [110, -520] : [160, -900],
            reachL: f < WORKS ? [-110, -520] : [-160, -900],
            handR: "open",
            handL: "open",
            frontR: f < WORKS,
            frontL: f < WORKS,
            lookX: f < WORKS ? 0.4 : 0,
          },
        },
        {
          id: "chain",
          look: CHAIN,
          at: [0.5, -1.15],
          pose: { view: "front", ...faceChange([[0, "skeptical"], [WORKS + 4, "happy"]], f), gesture: f > WORKS + 4 ? "clap" : "armsCrossed", lookX: -0.6 },
        },
      ]}
      light={{ tint: "#ffe0b0", tintAmount: 0.1, shadow: 0.25, points: [{ position: [-0.6, 1.0, -0.2], color: "#ffd080", strength: 1.4, range: 2.6 }] }}
    />
  );
};

// ---------- 8. D-Day: crates of PENICILLIN stacked up at a field hospital; the tally board counts over two million ----------

const DROP = 46;
const S8_END: CameraShot = { position: [0.15, 1.35, 2.3], target: [0.12, 1.1, -1.0], fov: 40 };
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..152
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 0.62, 2.0], target: [-0.1, 0.55, -0.6], fov: 40 },
      { at: 70, position: [0.15, 1.05, 2.35], target: [0.0, 0.85, -0.8], fov: 40 },
      { at: 151, ...S8_END },
    ],
    f,
  );
  const MEDIC_AT: [number, number] = [-0.32, -0.8];
  const carry = handWorld(MEDIC_AT, [150, -580], camera);
  const put = ease(f, 18, DROP);
  const topCrate: Vec3 = [mix(carry[0], 0.22, put), mix(carry[1] - 0.36, 0.72, put), mix(carry[2], -1.2, put)];
  return (
    <Stage
      set={
        <Outdoors camera={camera} ground="#a8a898" haze="#e4e8e0" hills={["#a8b4b8", "#8a9a8a", "#9aa88a"]} sun={[-5, 8, 4]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -20]}>
            <planeGeometry args={[80, 24]} />
            <meshBasicMaterial color="#5a8aa8" />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[Math.sin(f * 0.03 + i) * 0.6, 0.03, -8.4 - i * 1.5]}>
              <planeGeometry args={[40, 0.08]} />
              <meshBasicMaterial color="#e8f0f2" />
            </mesh>
          ))}
          <Tent position={[-0.2, 0, -0.6]} width={4} depth={2.4} />
          <PenCrate position={[0.22, 0, -1.2]} label={false} />
          <PenCrate position={[0.22, 0.36, -1.2]} rotation={[0, 0.06, 0]} label={false} />
          <group userData={{ ghost: true }}>
            <PenCrate position={topCrate} rotation={[0, -0.05, 0]} label={f >= DROP} />
          </group>
          <InkBox size={[1.08, 0.6, 0.03]} position={[0.2, 1.62, -1.76]} color="#3a3a2a" ink={0.008} />
          <Label text={"BY D-DAY\n2,000,000+ DOSES"} position={[0.2, 1.62, -1.74]} width={0.98} count={ease(f, 84, 112)} appear={f - 76} bg="#f4ead0" />
          <Cot position={[1.2, 0, -0.85]} rotationY={Math.PI / 2} />
          <Burst kind="dust" at={[0.22, 0.72, -1.0]} frame={f - DROP} count={10} size={0.6} seed={2} />
        </Outdoors>
      }
      camera={camera}
      bg="#7fb3ea"
      blur={2.0}
      puppets={[
        {
          id: "medic",
          look: MEDIC,
          at: MEDIC_AT,
          pose: { view: "front", ...faceChange([[0, "determined"], [DROP + 6, "happy"]], f), reachR: f < DROP ? [150, -580] : [140, -520], handR: "open", reachL: f < DROP ? [60, -580] : [-130, -520], frontL: f < DROP, lookX: 0.6 },
        },
        {
          id: "soldier",
          look: SOLDIER,
          at: [0.72, -0.45],
          pose: { sit: true, view: "front", ...faceChange([[0, "sad"], [96, "happy"]], f), gesture: f > 100 ? "wave" : undefined, lookX: -0.5 },
        },
      ]}
      light={{ tint: "#fff4e0", shadow: 0.16, distant: [{ direction: [-0.4, 0.85, 0.45], color: "#fff0c8", strength: 1.15 }] }}
    />
  );
};

// ---------- 9. What if he'd tidied them into the incubator? The germs grow first; the mould does nothing ----------

const SHUT = 50;
const INC9: Vec3 = [0.15, 0, -1.3];
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..189
  const camera = beatPath(
    [
      { at: 0, position: [0.05, 1.3, 2.5], target: [0.05, 0.95, -1.0], fov: 40 },
      { at: 56, position: [0.12, 1.28, 2.0], target: [0.12, 0.95, -1.1], fov: 40 },
      { at: 188, position: [0.02, 1.15, 2.0], target: [0.04, 0.88, -1.1], fov: 42 },
    ],
    f,
  );
  const FL_AT: [number, number] = [-0.38, -0.72];
  const hand = handWorld(FL_AT, [150, -560], camera);
  const put = ease(f, 14, 30);
  const stack: Vec3 = [mix(hand[0], INC9[0] - 0.1, put), mix(hand[1] - 0.04, 0.56, put), mix(hand[2], INC9[2] + 0.05, put)];
  const open = (f < 34 ? 1 : 1 - ease(f, 38, SHUT)) * 0.6;
  const grow = ease(f, 96, 128);
  const fizzle = ease(f, 150, 176);
  return (
    <>
      <Stage
        set={
          <Lab
            camera={camera}
            frame={f}
            light="dream"
            bench={false}
            incubator={{
              position: INC9,
              rotationY: 0,
              open,
              glow: 0.3, halo: false, label: false,
              dishes: 0,
              children: (
                <>
                  <PetriDish position={[0.04, 0.87, 0.06]} rotation={[0.8, 0, 0]} radius={0.17} seed={21} colonies={0.6 + grow * 0.4} overgrow={grow} mould={0.32 - fizzle * 0.14} />
                  <PetriDish position={[-0.18, 0.865, -0.05]} radius={0.07} seed={22} colonies={1} overgrow={grow} />
                </>
              ),
            }}
          >
            <group userData={{ ghost: true }}>
              {f > 4 && f < 34 && <DishStack position={stack} count={4} seed={13} radius={0.07} />}
              {f >= 34 && <DishStack position={[INC9[0] - 0.1, 0.565, INC9[2] + 0.05]} count={4} seed={13} radius={0.07} />}
            </group>
            <Bench position={[-1.6, 0, -1.4]} size={[1.2, TOP, 0.6]} />
          </Lab>
        }
        camera={camera}
        bg={moodBackground("dream")}
        blur={2.0}
        puppets={
          true
            ? [
                {
                  id: "fleming",
                  look: FLEMING,
                  at: FL_AT,
                  crop: false,
                  pose: {
                    view: "front",
                    ...faceChange([[0, "neutral"], [SHUT - 6, "determined"], [SHUT + 6, "smug"], [100, "worried"], [150, "sad"]], f),
                    reachR: [f < SHUT ? mix(150, 260, ease(f, 22, 32)) : mix(260, 130, ease(f, SHUT, SHUT + 10)), -560],
                    handR: "open",
                    frontR: true,
                    lean: 14 * (ease(f, 34, 40) - ease(f, SHUT, SHUT + 6)),
                    lookX: f > 80 ? 0.9 : 0.6,
                  },
                },
              ]
            : []
        }
        light={labLight("dream")}
      />
      <Headline f={f} text="WHAT IF HE'D TIDIED UP?" at={6} out={84} />
    </>
  );
};

// ---------- 10. Maybe someone else finds it, but the clock runs out ----------

const S10_END: CameraShot = { position: [0.2, 1.3, 1.6], target: [0.25, 1.22, -1.9], fov: 40 };
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..83
  const camera = beatPath(
    [
      { at: 0, position: [-0.25, 1.2, 2.3], target: [-0.1, 0.95, -0.9], fov: 40 },
      { at: 82, ...S10_END },
    ],
    f,
  );
  const lift = ease(f, 10, 24);
  const AT: [number, number] = [-0.15, -0.9];
  const hand = handWorld(AT, [120, mix(-520, -700, lift)], camera);
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#5a5e66" wall="#8a9098" wallPattern="tile" floorPattern="concrete" width={6} depth={4}>
          <Bench position={[0, 0, -0.35]} size={[1.8, TOP, 0.6]} color="#5a5a62" />
          <Microscope position={[-0.55, TOP, -0.45]} />
          <Bottle position={[0.55, TOP, -0.5]} color="#4a5a6a" />
          <WallClock position={[0.42, 1.6, -1.94]} minutes={f * f * 0.25} size={0.3} />
          <Shelf position={[-1.3, 1.2, -1.9]} width={0.9} rows={3} color="#4a4a52" seed={8} />
          <group userData={{ ghost: true }}><PetriDish position={[hand[0], hand[1] - 0.02, hand[2] + 0.06]} rotation={[1.1, 0, 0]} seed={31} colonies={1} mould={1} clear={1} lidOn={false} /></group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={2.2}
      puppets={[
        {
          id: "scientist",
          look: SCIENTIST,
          at: AT,
          pose: { view: "front", ...faceChange([[0, "excited"], [54, "worried"]], f), reachR: [120, mix(-520, -700, lift)], handR: "open", frontR: true, lookX: f < 54 ? 0.3 : 0.8, headTilt: f > 54 ? 8 : 0 },
        },
      ]}
      light={{ tint: "#e8eef8", tintAmount: 0.06, shadow: 0.2 }}
    />
  );
};

// ---------- 11. Hundreds of millions of lives: a sunny ward, patients sitting up ----------

const S11_END: CameraShot = { position: [0.55, 1.2, 2.35], target: [0.45, 0.92, -0.8], fov: 40 };
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..152
  const camera = beatPath(
    [
      { at: 0, position: [-0.75, 1.2, 2.35], target: [-0.65, 0.92, -0.8], fov: 40 },
      { at: 151, ...S11_END },
    ],
    f,
  );
  const NURSE_AT: [number, number] = [0.15, -0.45];
  const give = ease(f, 70, 90);
  const cup = handWorld(NURSE_AT, [mix(110, 170, give), -600], camera);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#c8bca0" wall="#f4ecd0" wallPattern="plaster" floorPattern="tile" width={7} depth={4} sun={{ x: 0.2, color: "#fff4c8", bars: 6 }}>
          <Window position={[-0.75, 1.6, -1.95]} size={[0.8, 1.1]} sky="#bfe4ff" />
          <Window position={[0.85, 1.6, -1.95]} size={[0.8, 1.1]} sky="#bfe4ff" />
          <Cot position={[-0.65, 0, -1.05]} rotationY={Math.PI / 2} color="#f2f0ea" />
          <Cot position={[1.05, 0, -1.05]} rotationY={Math.PI / 2} color="#f2f0ea" />
          <group userData={{ ghost: true }}>
            <InkCylinder radius={0.035} height={0.08} position={[cup[0], cup[1] + 0.02, cup[2] + 0.03]} color="#f4f0e6" ink={0.003} />
          </group>
          <InkBox size={[0.4, 0.75, 0.32]} position={[2.0, 0.375, -1.7]} color="#e8e4dc" ink={0.008} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2.2}
      puppets={[
        { id: "patientA", look: PATIENT_A, at: [-0.7, -0.6], pose: { sit: true, view: "front", ...faceChange([[0, "happy"]], f), gesture: f > 40 && f < 110 ? "wave" : undefined, lookX: 0.6 } },
        {
          id: "nurse",
          look: NURSE,
          at: NURSE_AT,
          pose: { view: "front", ...faceChange([[0, "neutral"], [70, "happy"]], f), reachR: [mix(110, 170, give), -600], handR: "open", frontR: true, lookX: 0.7 },
        },
        { id: "patientB", look: PATIENT_B, at: [0.85, -0.6], pose: { sit: true, view: "front", ...faceChange([[0, "neutral"], [86, "happy"]], f), reachL: [-170, mix(-480, -600, give)], handL: "open", lookX: -0.6 } },
      ]}
      light={{ tint: "#fff8e8", shadow: 0.16, distant: [{ direction: [0.2, 0.6, -1], color: "#fff4d0", strength: 1.0 }] }}
    />
  );
};

// ---------- 12. Someone in your family tree ----------

const S12_END: CameraShot = { position: [0.0, 1.35, 0.95], target: [0.0, 1.45, -1.9], fov: 40 };
const S12: React.FC = () => {
  const f = useShotFrame(); // 0..127
  const camera = beatPath(
    [
      { at: 0, position: [0.35, 1.05, 1.6], target: [0.05, 0.9, -1.2], fov: 40 },
      { at: 126, ...S12_END },
    ],
    f,
  );
  const glow = ease(f, 30, 60);
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#4a3a4a" wall="#6a6a9a" wallPattern="wallpaper" floorPattern="wood" width={6} depth={4}>
          <FamilyTree position={[0.0, 1.78, -1.93]} scale={0.68} glow={glow} />
          <Chair position={[-0.95, 0, -1.4]} color="#7a3a3a" />
          <Lamp position={[1.0, 0.0, -1.6]} />
          <pointLight position={[0.0, 2.0, -0.6]} color="#ffc890" intensity={1.6} distance={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.2}
      puppets={[
        { id: "grandma", look: GRANDMA, at: [-0.33, -1.25], pose: { view: "front", ...faceChange([[0, "neutral"], [40, "happy"]], f), reachL: [-120, -520], reachR: [80, -560], handR: "open", lookX: 0.5, headTilt: 4 } },
        { id: "grandson", look: GRANDSON, at: [0.33, -1.2], pose: { view: "front", ...faceChange([[0, "thinking"], [32, "excited"], [70, "happy"]], f), gesture: f > 28 && f < 90 ? "point" : undefined, lookX: -0.4 } },
      ]}
      light={{ tint: "#ffd8b8", tintAmount: 0.1, shadow: 0.22, points: [{ position: [0.0, 2.0, -0.6], color: "#ffc890", strength: 1.4, range: 4 }] }}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 155, S1, false],
  [155, 271, S2, "dip"],
  [271, 319, S3, "dip"],
  [319, 412, S4, "dip"],
  [412, 624, S5, "dissolve"],
  [624, 819, S6, "dip"],
  [819, 967, S7, "dip"],
  [967, 1119, S8, "dip"],
  [1119, 1308, S9, "dip"],
  [1308, 1391, S10, "dip"],
  [1391, 1543, S11, "dip"],
  [1543, TIMING.totalFrames, S12, "dip"],
];

const SFX: Sfx[] = [
  // the lab, day
  { at: 0, src: sfx("tick"), volume: 0.08, until: 155 },
  { at: 40, src: sfx("clink"), volume: 0.3, space: "room" },
  { at: 92, src: sfx("clink"), volume: 0.24, space: "room" },
  { at: HAT_ON - 6, src: sfx("whoosh"), volume: 0.4 },
  // microscope corner: a motor car going by outside
  { at: 155, src: sfx("engine"), volume: 0.05, until: 271 },
  { at: 155 + 62, src: sfx("clink"), volume: 0.3, space: "room" },
  // holiday
  { at: 271, src: sfx("wind"), volume: 0.12, until: 319 },
  { at: 271, src: sfx("crickets"), volume: 0.06, until: 319 },
  // dusk: the door bangs, the lid slides; the incubator hums
  { at: 319 + 14, src: sfx("creak"), volume: 0.34, space: "room" },
  { at: 319 + BANG, src: sfx("door"), volume: 0.5, space: "room", hit: 0.25 },
  ...foleyCues("scrape", [319 + BANG + 3], 0.22, { space: "room" }),
  { at: 319 + 40, src: sfx("hum"), volume: 0.12, until: 412 },
  // September third
  { at: 404, src: sfx("door"), volume: 0.55, space: "room" },
  { at: 412 + 82, src: sfx("clink"), volume: 0.22, space: "room" },
  { at: 584, src: sfx("riser"), volume: 0.1, until: 624 },
  // the pivot
  { at: 624 + 8, src: sfx("sting"), volume: 0.28 },
  { at: 624, src: sfx("hum"), volume: 0.08, until: 819 },
  { at: 624 + 44, src: sfx("slime"), volume: 0.42, space: "room" },
  { at: 624 + 116, src: sfx("pop"), volume: 0.88 },
  { at: 624 + FOAM, src: sfx("hiss"), volume: 0.2, space: "room" },
  { at: 624 + FOAM + 9, src: sfx("pop"), volume: 0.5, space: "room" },
  // Oxford
  { at: 819, src: sfx("tick"), volume: 0.07, until: 967 },
  { at: 819 + 84, src: sfx("chime"), volume: 0.2 },
  { at: 819 + WORKS + 6, src: sfx("squeak"), volume: 0.72, space: "room" },
  // D-Day
  { at: 967, src: sfx("wind"), volume: 0.14, until: 1119 },
  { at: 967, src: sfx("tank"), volume: 0.05, until: 1119 },
  ...foleyCues("thud", [967 + DROP], 0.55, { space: "outdoor" }),
  { at: 967 + 76, src: sfx("pop"), volume: 0.4 },
  { at: 967 + 84, src: sfx("credit-blip"), volume: 0.18, until: 967 + 112 },
  // what if
  { at: 1119 + 24, src: sfx("clink"), volume: 0.28, space: "room" },
  { at: 1119 + SHUT, src: sfx("door"), volume: 0.75, space: "room", hit: 0.2 },
  { at: 1119 + 60, src: sfx("hum"), volume: 0.06, until: 1308 },
  // the clock runs out
  { at: 1308, src: sfx("tick"), volume: 0.2, until: 1391 },
  { at: 1308 + 12, src: sfx("clink"), volume: 0.26, space: "room" },
  // the ward
  { at: 1391, src: sfx("ambience"), volume: 0.06, until: 1543 },
  { at: 1391 + 88, src: sfx("clink"), volume: 0.4, space: "room" },
  // the family tree
  { at: 1543 + 30, src: sfx("chime"), volume: 0.18 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 412, volume: 0.26 },
  { src: MUSIC_FILES.mystery, from: 412, to: 819, volume: 0.32 },
  { src: MUSIC_FILES.tension, from: 819, to: 1119, volume: 0.3 },
  { src: MUSIC_FILES.mystery, from: 1119, to: 1391, volume: 0.32 },
  { src: MUSIC_FILES.lounge, from: 1391, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
