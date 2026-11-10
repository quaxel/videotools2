import React from "react";
import {
  beatPath,
  BlenderModel,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  frameSpot,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  Lamp,
  moodBackground,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  Stage,
  Timing,
  useFinalFrame,
  useShotFrame,
  Vec3,
  Video,
  Window,
  CameraRig,
} from "../../engine";
import { BURROW, cretLight, CretaceousSet, CRET_BG, Cycad, DustCloud, Fern } from "./CretaceousSet";
import { Asteroid, Bird, DeskGlobe, Earth, faceLon, GlassDome, globePoint, Log, MapMonitor, RerunButton, Seabed, SEA_Y, Sofa, Stars } from "./props";
import TIMING_JSON from "./timing.json";

// "What if the dinosaur-killing asteroid had hit somewhere else?" (Kaiho & Oshima 2017). Sets: CretaceousSet (this
// folder, guide/references/cretaceous-floodplain.md) in six moods, a space set, the cut-away seabed, and Room
// interiors (the 2017 lab, the globe room, the museum hall, a living room). The T. rex, the long-neck and the little
// mammal are sand3d models (../videos/what-if-asteroid/sand3d/).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-asteroid";
export const timing = TIMING;

const ASPECT = 9 / 16;
const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const TREX = "videos/what-if-asteroid/models/trex.glb";
const SAURO = "videos/what-if-asteroid/models/sauropod.glb";
const MAMMAL = "videos/what-if-asteroid/models/mammal.glb";

// The jaw of a talking model, from the speaker's word spans: opens and closes on each word, a little differently.
const jawFor = (speaker: string, final: number, max: number) => {
  const words = TIMING.words[speaker] ?? [];
  for (let i = 0; i < words.length; i++) {
    const [a, b] = words[i];
    if (final >= a && final < b + 2) {
      const p = (final - a) / Math.max(3, b - a + 2);
      return max * Math.sin(Math.min(1, p) * Math.PI) * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7)));
    }
  }
  return 0;
};

// The little mammal at `at`; `peek` 0 (down in the hole) .. 1 (out on the mound). Drawn ~3x real size (format_note).
const Mammal: React.FC<{ at: Vec3; yaw?: number; scale?: number; head?: number; jaw?: number; tail?: number }> = ({ at, yaw = 0, scale = 3, head = 0, jaw = 0, tail = 0 }) => (
  <BlenderModel src={MAMMAL} position={at} rotation={[0, yaw, 0]} scale={scale} ink={0.004} joints={{ head, jaw, tail }} />
);

const Trex: React.FC<{ at: Vec3; yaw?: number; scale?: number; head?: number; jaw?: number; tail?: number; legL?: number; legR?: number; armL?: number; armR?: number; roll?: number; pitch?: number }> = ({
  at,
  yaw = 0,
  scale = 1,
  head = 0,
  jaw = 0,
  tail = 0,
  legL = 0,
  legR = 0,
  armL = 0,
  armR = 0,
  roll = 0,
  pitch = 0,
}) => <BlenderModel src={TREX} position={at} rotation={[pitch, yaw, roll]} scale={scale} ink={0.02 * scale} joints={{ head, jaw, tail, leg_L: legL, leg_R: legR, arm_L: armL, arm_R: armR }} />;

const Sauro: React.FC<{ at: Vec3; yaw?: number; scale?: number; neck?: number; jaw?: number; tail?: number; roll?: number }> = ({ at, yaw = 0, scale = 1, neck = 0, jaw = 0, tail = 0, roll = 0 }) => (
  <BlenderModel src={SAURO} position={at} rotation={[0, yaw, roll]} scale={scale} ink={0.02 * scale} joints={{ neck, jaw, tail }} />
);

// ---------- cast (puppets) ----------

const KAIHO: PuppetLook = { skin: "#f0d0b0", hair: "#b8b8b8", outfit: "#f6f6f2", glasses: true };
const OSHIMA: PuppetLook = { skin: "#f2d4b4", hair: "#1a1614", outfit: "#2a3a5a" };
const CRITIC: PuppetLook = { skin: "#f0c8a8", hair: "#6a4428", outfit: "#7a8a5a", beard: "#6a4428", vest: "#c8a060" };
const VIEWER: PuppetLook = { skin: "#d8a47a", hair: "#2a1a10", outfit: "#e86a4a" };

// ---------- 1. Hook (0-100): one push through the ferns onto the T. rex; the mammal pops up, the foot stomps, it ducks ----------

const S1: React.FC = () => {
  const f = useShotFrame(); // 0..100
  const camera = beatPath(
    [
      { at: 0, position: [-1.2, 1.15, 6.6], target: [0.3, 1.5, -1.5], fov: 42 },
      { at: 60, position: [-0.7, 1.25, 5.0], target: [0.4, 1.55, -1.6], fov: 42 },
      { at: 99, position: [-0.45, 1.3, 4.35], target: [0.45, 1.6, -1.6], fov: 42 },
    ],
    f,
  );
  const stomp = 58;
  const lift = f < stomp ? ease(f, 40, stomp - 6) * 14 - ease(f, stomp - 6, stomp) * 14 : 0;
  const peek = f < 18 ? 0 : f < stomp + 2 ? ease(f, 18, 30) : 1 - ease(f, stomp + 2, stomp + 9);
  const fg = frameSpot({ position: [-1.2, 1.15, 6.6], target: [0.3, 1.5, -1.5], fov: 42 }, ASPECT, -0.9, -0.85, 1.6);
  return (
    <>
      <Stage
        set={
          <CretaceousSet camera={camera} frame={f} mode="day" streak={f > 64 ? 0.05 + (f - 64) * 0.002 : null}>
            <Trex at={[0.7, 0, -1.6]} yaw={-1.0} head={f > 70 ? -8 * ease(f, 70, 90) : 4} jaw={f > 20 && f < 40 ? 10 * Math.sin(((f - 20) / 20) * Math.PI) : 0} tail={Math.sin(f * 0.06) * 8} legL={-lift} />
            <Mammal at={[BURROW[0], -0.36 + peek * 0.4, BURROW[2] + 0.12]} yaw={0.4} head={peek > 0.5 ? -10 + Math.sin(f * 0.4) * 6 : 0} tail={Math.sin(f * 0.3) * 20} />
            <Burst kind="dust" at={[0.35, 0.02, -1.4]} frame={f - stomp} count={12} size={0.7} seed={3} />
          </CretaceousSet>
        }
        camera={camera}
        bg={CRET_BG.day}
        blur={2.0}
        light={cretLight("day")}
        foreground={<Fern position={fg} size={0.9} mode="day" seed={41} sway={Math.sin(f * 0.05)} />}
      />
      <Headline f={f} text="WHAT IF IT HIT ELSEWHERE?" at={8} out={96} />
    </>
  );
};

// ---------- 2. Space (100-251): the rock heads for what is now Mexico ----------

const EARTH_C: Vec3 = [0, -3.2, -2];
const EARTH_R = 3.2;
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..151
  const spin = faceLon(-92) + 0.35 - ease(f, 0, 150) * 0.35;
  const target = globePoint(EARTH_C, EARTH_R, -89, 21, spin, 0.25, 1.0);
  const start: Vec3 = [2.6, 2.6, 1.0];
  const p = ease(f, 0, 145);
  const rock: Vec3 = [mix(start[0], target[0] + 0.25, p), mix(start[1], target[1] + 0.35, p), mix(start[2], target[2] + 0.2, p)];
  const camera = beatPath(
    [
      { at: 0, position: [3.4, 3.2, 4.6], target: [2.2, 2.2, 0.6], fov: 40 },
      { at: 70, position: [2.0, 2.6, 6.6], target: [mix(0.9, target[0], 0.5), mix(1.0, target[1], 0.5), mix(0.0, target[2], 0.5)], fov: 40 },
      { at: 150, position: [target[0] + 0.7, target[1] + 2.2, target[2] + 5.8], target: [target[0], target[1] - 0.2, target[2]], fov: 40 },
    ],
    f,
  );
  const mex = globePoint(EARTH_C, EARTH_R, -100, 27, spin, 0.25, 1.06);
  return (
    <>
      <Stage
        set={
          <>
            <CameraRig {...camera} />
            <color attach="background" args={["#05070f"]} />
            <ambientLight intensity={0.6} color="#c8d8ff" />
            <directionalLight position={[6, 4, 5]} intensity={2.6} color="#fff6e8" />
            <group position={camera.position}>
              <Stars />
            </group>
            <Earth position={EARTH_C} radius={EARTH_R} spin={spin} atmosphere />
            <Asteroid position={rock} size={0.32} spin={f * 0.03} heat={ease(f, 110, 150)} dir={[target[0] - start[0], target[1] - start[1], target[2] - start[2]]} />
            {f < 128 && <Label text="6+ MILES WIDE" position={[rock[0] - 0.95, rock[1] + 0.05, rock[2]]} width={1.1} appear={f - 52} />}
            <Label text="MEXICO" position={mex} width={0.8} appear={f - 132} />
          </>
        }
        camera={camera}
        bg="#05070f"
        blur={1.2}
      />
      <Headline f={f} text="66 MILLION YEARS AGO" at={3} out={44} />
    </>
  );
};

// ---------- 3. The shore, flash (251-315): the T. rex looks up, "Why is the sky so bright?" ----------

const S3: React.FC = () => {
  const f = useShotFrame(); // 0..64
  const final = useFinalFrame();
  const camera = beatPath(
    [
      { at: 0, position: [-1.3, 0.8, 5.6], target: [0.2, 1.8, -1.0], fov: 44 },
      { at: 63, position: [-1.1, 1.3, 5.3], target: [0.0, 2.6, -1.2], fov: 44 },
    ],
    f,
  );
  const fl = ease(f, 40, 64);
  return (
    <Stage
      set={
        <CretaceousSet camera={camera} frame={f + 300} mode="flash" streak={0.2 + f * 0.009}>
          <Trex at={[0.9, 0, -1.2]} yaw={-0.75} head={-22} jaw={jawFor("dino", final, 30)} armL={-20 + Math.sin(f * 0.5) * 10} armR={-25} tail={Math.sin(f * 0.1) * 6} />
        </CretaceousSet>
      }
      camera={camera}
      bg={CRET_BG.flash}
      blur={1.8}
      flash={fl * 0.55}
      light={cretLight("flash", 0.5 + fl * 0.5)}
      foreground={<Fern position={frameSpot({ position: [-1.3, 0.8, 5.6], target: [0.2, 1.8, -1.0], fov: 44 }, ASPECT, 0.85, -0.95, 1.6)} size={0.7} mode="flash" seed={13} />}
    />
  );
};

// ---------- 4. The cut-away seabed (315-428): shallow sea, sulfur, oil; the fireball hits ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..113
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 1.4, 4.6], target: [0.0, -0.3, -0.5], fov: 44 },
      { at: 40, position: [0.1, -0.2, 4.6], target: [0.0, -1.6, -0.4], fov: 44 },
      { at: 80, position: [0.0, -1.0, 7.0], target: [0.0, -2.3, -0.5], fov: 44 },
      { at: 112, position: [0.0, -0.8, 6.8], target: [0.0, -2.05, -0.5], fov: 44 },
    ],
    f,
  );
  const hit = 104;
  const fb = ease(f, 86, hit);
  const rock: Vec3 = [mix(3.5, 0.3, fb), mix(5.5, 0.1, fb), mix(-6, -2.5, fb)];
  return (
    <Stage
      set={
        <>
          <CameraRig {...camera} />
          <color attach="background" args={["#9cd8e8"]} />
          <fog attach="fog" args={["#bfe6ee", 14, 60]} />
          <ambientLight intensity={1.1} color="#fff8ec" />
          <hemisphereLight args={["#e8f8ff", "#3a5a5a", 0.6]} />
          <directionalLight position={[-3, 6, 5]} intensity={2.2} color="#fff2d8" />
          <group position={camera.position}>
            <mesh>
              <sphereGeometry args={[200, 32, 16]} />
              <meshBasicMaterial color="#9cd0f0" side={2} fog={false} />
            </mesh>
          </group>
          <Seabed frame={f} />
          <Label text="SHALLOW SEA" position={[0.0, -0.55, 0.05]} width={1.2} appear={f - 17} />
          <Label text="SULFUR" position={[0.0, SEA_Y.sulfur - 0.27, 0.05]} width={1.0} appear={f - 60} />
          <Label text="OIL" position={[0.0, SEA_Y.oil - 0.22, 0.05]} width={0.8} appear={f - 82} />
          {f >= 86 && f < hit + 2 && <Asteroid position={rock} size={0.35} spin={f * 0.05} heat={1} dir={[-3.2, -5.4, 3.5]} />}
          <Burst kind="sparks" at={[0.3, 0.1, -2.5]} frame={f - hit} count={30} size={1.4} speed={1.6} seed={7} />
          <Burst kind="dust" at={[0.3, 0.02, -2.5]} frame={f - hit} count={18} size={1.6} seed={8} colors={["#e8ffff", "#9ae0e8"]} />
        </>
      }
      camera={camera}
      bg="#9cd8e8"
      blur={1.2}
      flash={f >= hit ? Math.min(0.5, (f - hit) / 5) : 0}
    />
  );
};

// ---------- 5. The pivot (428-661): dust and sulfur fly up, soot from burning oil, the sun dims ----------

const S5: React.FC = () => {
  const f = useShotFrame(); // 0..233
  const camera = beatPath(
    [
      { at: 0, position: [-1.4, 1.0, 5.4], target: [0.2, 1.4, -4], fov: 46 },
      { at: 90, position: [-0.9, 1.5, 5.0], target: [0.4, 3.0, -8], fov: 46 },
      { at: 150, position: [-0.4, 1.8, 4.6], target: [0.8, 3.4, -10], fov: 46 },
      { at: 232, position: [-0.4, 2.0, 4.4], target: [-1.0, 3.5, -10], fov: 46 },
    ],
    f,
  );
  const dust = ease(f, 26, 120);
  const sulfur = ease(f, 55, 140);
  const dim = ease(f, 165, 225);
  return (
    <Stage
      set={
        <CretaceousSet camera={camera} frame={f + 500} mode="dark" sunDim={dim} fires={ease(f, 112, 150)} burrow={false}>
          <Trex at={[0.3, 0, -3.4]} yaw={Math.PI + 0.3} head={-14} tail={Math.sin(f * 0.05) * 5} />
          <DustCloud position={[3.5, 1.5 + dust * 5, -22]} t={dust} size={12} color="#b89a78" seed={1} />
          <DustCloud position={[-6, 1 + dust * 3.5, -24]} t={dust * 0.9} size={10} color="#a88a68" seed={5} />
          <DustCloud position={[-1, 5 + sulfur * 4, -26]} t={sulfur} size={9} color="#c8b050" seed={9} />
        </CretaceousSet>
      }
      camera={camera}
      bg={CRET_BG.dark}
      blur={1.6}
      flash={Math.max(0, 1 - f / 12) * 0.45}
      truth={0.15 + dim * 0.4}
      light={cretLight("dark")}
      foreground={<Fern position={frameSpot({ position: [-1.4, 1.0, 5.4], target: [0.2, 1.4, -4], fov: 46 }, ASPECT, -0.85, -0.9, 1.5)} size={0.8} mode="dark" seed={23} />}
    />
  );
};

// ---------- 6. Cold (661-826): plants droop, the long-neck lies down, the T. rex shivers, three figures topple ----------

const FIG_X = [0.55, 0.85, 1.15, 1.45];
const TOPPLE = [800, 808, 816].map((t) => t - 661);
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..165
  const camera = beatPath(
    [
      { at: 0, position: [-0.2, 1.8, 8.4], target: [0.3, 1.6, -3.5], fov: 42 },
      { at: 42, position: [-0.2, 1.8, 7.0], target: [0.2, 1.6, -3.2], fov: 42 },
      { at: 80, position: [0.6, 1.6, 5.2], target: [0.9, 1.4, -2.6], fov: 42 },
      { at: 112, position: [0.8, 1.15, 4.2], target: [0.95, 0.7, -1.0], fov: 42 },
      { at: 164, position: [0.9, 1.0, 3.7], target: [1.0, 0.58, -1.0], fov: 42 },
    ],
    f,
  );
  const shiver = Math.sin(f * 1.7) * 1.5 * (0.6 + 0.4 * Math.sin(f * 0.13));
  const lie = ease(f, 30, 60);
  const tlie = ease(f, 82, 112);
  return (
    <Stage
      set={
        <CretaceousSet camera={camera} frame={f + 800} mode="cold" burrow={false}>
          <Sauro at={[-0.6, -lie * 0.55, -5.0]} yaw={0.7} scale={0.9} neck={lie * 38} tail={-lie * 10} />
          <Trex at={[1.6, -tlie * 0.8, -2.6]} yaw={-0.3} pitch={tlie * 0.12} head={-18 + tlie * 40 + shiver} armL={-30 + shiver * 4} armR={-35 - shiver * 3} tail={shiver * 2 - 6} roll={shiver * 0.006} />
          <Log position={[1.0, 0, 0.5]} length={1.4} frost />
          {FIG_X.slice(0, 3).map((x, i) => {
            const t = f - TOPPLE[i];
            const fall = t > 0 ? Math.min(1, (t / 9) ** 2) : 0;
            const src = [SAURO, TREX, SAURO][i];
            const sc = [0.11, 0.13, 0.09][i];
            return <BlenderModel key={i} src={src} position={[x, 0.27, 0.5 + fall * 0.08]} rotation={[t < 0 ? Math.sin(f * 0.9 + i) * 0.02 : 0, -0.3 + i * 0.3, fall * 1.45 * (i === 1 ? 1 : -1)]} scale={sc} ink={0.003} />;
          })}
          {TOPPLE.map((t, i) => (
            <Burst key={i} kind="dust" at={[FIG_X[i], 0.28, 0.7]} frame={f - t - 8} count={8} size={0.25} seed={40 + i} colors={["#eef2f6", "#dce4ec"]} />
          ))}
          <Bird position={[FIG_X[3], 0.27, 0.5]} frame={f} scale={1.3} hop={f > 140 ? Math.abs(Math.sin((f - 140) * 0.35)) * 0.06 : 0} />
        </CretaceousSet>
      }
      camera={camera}
      bg={CRET_BG.cold}
      blur={1.6}
      truth={0.35}
      light={cretLight("cold")}
      foreground={<Fern position={frameSpot({ position: [-0.6, 1.7, 8.0], target: [-0.2, 1.6, -3.5], fov: 42 }, ASPECT, -0.9, -0.9, 1.8)} size={0.7} mode="cold" seed={51} />}
    />
  );
};

// ---------- 7. The 2017 lab (826-944): two scientists at the map ----------

const S7: React.FC = () => {
  const f = useShotFrame(); // 0..118
  const camera = beatPath(
    [
      { at: 0, position: [-0.5, 1.4, 4.9], target: [0.05, 1.3, -0.8], fov: 40 },
      { at: 117, position: [-0.2, 1.35, 3.9], target: [0.08, 1.3, -0.9], fov: 40 },
    ],
    f,
  );
  const reveal = ease(f, 68, 98);
  const cast: PuppetPlacement[] = [
    { id: "kaiho", look: KAIHO, at: [-0.6, -0.85], pose: { ...faceChange([[0, "thinking"], [70, "excited"]], f), gesture: f > 66 ? "point" : "chin", lookX: 0.7 } },
    { id: "oshima", look: OSHIMA, at: [0.65, -0.85], pose: { ...faceChange([[0, "neutral"], [74, "happy"]], f), reachL: [-60, -470], reachR: [70, -470], handL: "open", handR: "open", lookX: -0.4 } },
  ];
  return (
    <>
      <Stage
        set={
          <Room camera={camera} mood="office" floor="#a8845a" wall="#efe2c4" wallPattern="panel" floorPattern="wood" width={6} depth={5} stripe="#c8a070">
            <InkBox size={[1.9, 0.06, 0.7]} position={[0.05, 0.72, -0.4]} color="#b88a5a" ink={0.01} />
            <InkBox size={[0.06, 0.7, 0.6]} position={[-0.85, 0.36, -0.4]} color="#9a7048" ink={0.008} />
            <InkBox size={[0.06, 0.7, 0.6]} position={[0.95, 0.36, -0.4]} color="#9a7048" ink={0.008} />
            <MapMonitor position={[0.05, 1.95, -1.9]} width={1.3} reveal={reveal} />
            <InkBox size={[0.42, 0.02, 0.3]} position={[-0.6, 0.76, -0.2]} color="#f6f2e8" ink={0.004} />
            <InkBox size={[0.3, 0.02, 0.22]} position={[0.62, 0.765, -0.15]} color="#f0e8d0" ink={0.004} />
            <Shelf position={[-1.9, 0, -2.3]} width={1.1} rows={4} seed={3} />
            <Window position={[1.7, 1.55, -2.45]} size={[1.0, 0.9]} sky="#bfe0f4" />
            <Lamp position={[0.0, 2.6, -0.4]} />
          </Room>
        }
        camera={camera}
        bg={moodBackground("office")}
        blur={1.6}
        puppets={cast}
        foreground={<InkCylinder radius={0.1} height={0.5} position={frameSpot({ position: [-0.5, 1.4, 4.9], target: [0.05, 1.3, -0.8], fov: 40 }, ASPECT, -0.95, -0.9, 1.6)} color="#3a5a3a" ink={0.008} />}
      />
      <Headline f={f} text="2017" at={8} out={112} />
    </>
  );
};

// ---------- 8. The globe (944-1215): the oily rock shaded, 13 % against the other 87 % ----------

const GLOBE: Vec3 = [0, 1.25, -0.6];
const GR = 0.62;
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..271
  const final = f + 944;
  // Americas first (Yucatan), then round past Africa to the Middle East and Siberia, back toward the Americas
  const spin = faceLon(-80) - ease(final, 960, 1100) * 1.9 + ease(final, 1110, 1200) * 0.9;
  const camera = beatPath(
    [
      { at: 0, position: [0.35, 1.45, 4.3], target: [0, 1.35, -0.6], fov: 40 },
      { at: 140, position: [0.2, 1.45, 3.75], target: [0, 1.4, -0.6], fov: 40 },
      { at: 270, position: [0.05, 1.45, 3.45], target: [0, 1.4, -0.6], fov: 40 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Room camera={camera} mood="night" floor="#2a3450" wall="#24345a" wallPattern="wallpaper" floorPattern="carpet" width={6} depth={5}>
          <InkBox size={[1.3, 0.42, 0.7]} position={[0, 0.21, -0.6]} color="#5a3a24" ink={0.012} />
          <DeskGlobe position={GLOBE} radius={GR} spin={spin} />
          <Label text={"OILY ROCK\n13%"} position={[-0.3, 2.12, -0.62]} width={0.5} bg="#4a2e1c" fg="#fff6dc" appear={final - 1018} />
          <Label key={final >= 1192 ? "m" : "o"} text={final >= 1192 ? "OTHER 87%\nMILDER" : "OTHER\n87%"} position={[0.3, 2.12, -0.62]} width={0.5} bg="#bfe0f4" appear={final >= 1192 ? final - 1192 : final - 1124} />
          <pointLight position={[0.8, 2.4, 1.6]} intensity={1.6} color="#fff2d8" distance={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.4}
    />
  );
};

// ---------- 9. The museum hall (1215-1374): the what-if diorama with live dinosaurs; the critic and the RERUN button ----------

const S9: React.FC = () => {
  const f = useShotFrame(); // 0..159
  const camera = beatPath(
    [
      { at: 0, position: [-0.85, 1.4, 2.2], target: [-0.75, 0.95, -0.5], fov: 40 },
      { at: 48, position: [-0.55, 1.4, 2.4], target: [-0.45, 0.95, -0.5], fov: 40 },
      { at: 100, position: [0.35, 1.3, 2.9], target: [0.35, 1.0, -0.4], fov: 40 },
      { at: 158, position: [0.45, 1.25, 2.6], target: [0.45, 1.0, -0.4], fov: 40 },
    ],
    f,
  );
  const SLAP = 1352 - 1215;
  const t = f - SLAP;
  const press = t >= 0 && t < 6 ? 1 : 0;
  const pop = t > 2 ? ease(t, 2, 24) : 0;
  const reach: [number, number] = t < -14 ? [-120, -560] : t < 0 ? [-260, -560 - (t + 14) * -8] : [-220, -470];
  const cast: PuppetPlacement[] = [
    {
      id: "critic",
      look: CRITIC,
      at: [0.75, -0.55],
      pose: {
        ...faceChange([[0, "skeptical"], [70, "determined"], [SLAP + 3, "shocked"], [SLAP + 30, "awkward"]], f),
        reachL: reach,
        handL: t < 0 ? "open" : "open",
        frontL: true,
        lookX: -0.7,
        ...(f < 70 ? { gesture: "armsCrossed" as const } : {}),
      },
    },
  ];
  const dioramaY = 0.8;
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#7a3a2a" wall="#c87a3a" wallPattern="panel" floorPattern="tile" width={7} depth={5} stripe="#8a3a2a">
          {/* the diorama table with a purple-lit what-if world under glass */}
          <InkBox size={[1.0, dioramaY, 0.8]} position={[-0.75, dioramaY / 2, -0.55]} color="#4a2a3a" ink={0.012} />
          <InkBox size={[0.96, 0.04, 0.76]} position={[-0.75, dioramaY + 0.02, -0.55]} color="#8a6ab8" ink={0.006} />
          <group position={[-0.75, dioramaY + 0.04, -0.55]}>
            <Fern position={[-0.3, 0, -0.2]} size={0.18} mode="dream" seed={3} />
            <Fern position={[0.32, 0, 0.12]} size={0.15} mode="dream" seed={8} />
            <Cycad position={[0.25, 0, -0.22]} size={0.16} mode="dream" seed={5} />
            <Sauro at={[0.12, 0, -0.1]} yaw={-0.6} scale={0.085} neck={-10 + Math.sin(f * 0.12) * 8} jaw={Math.abs(Math.sin(f * 0.25)) * 18} tail={Math.sin(f * 0.08) * 10} />
            <Trex at={[-0.15, 0, 0.12]} yaw={0.5} scale={0.1} head={Math.sin(f * 0.1) * 6} tail={Math.sin(f * 0.07) * 12} jaw={f > 20 && f < 40 ? 20 : 4} armL={Math.sin(f * 0.3) * 30} />
            <pointLight position={[0, 0.5, 0.2]} intensity={1.2} color="#d8a8ff" distance={1.4} />
          </group>
          <GlassDome position={[-0.75, dioramaY + 0.04, -0.55]} radius={0.44} />
          <RerunButton position={[0.25, 0, -0.25]} press={press} pop={pop} lid={1} />
          <InkBox size={[0.03, 0.45, 0.03]} position={[0.25, 1.15, -0.4]} color="#3a3a44" ink={0.004} />
          <Label text="RERUN" position={[0.25, 1.38, -0.38]} width={0.4} appear={f - 128} />
          <Burst kind="sparks" at={[0.25, 1.0, -0.25]} frame={t - 3} count={14} size={0.4} seed={11} />
          <Lamp position={[-0.75, 2.6, -0.55]} color="#e8c8ff" />
          <Window position={[1.9, 1.6, -2.45]} size={[0.9, 1.0]} sky="#f2c890" />
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={1.6}
      puppets={cast}
      foreground={<InkCylinder radius={0.04} height={0.9} position={[-1.35, 0.45, 1.1]} color="#c8a040" ink={0.006} />}
    />
  );
};

// ---------- 10. The burrow in the cold (1374-1516): tiny furry survivors; "Is it safe yet?" ----------

const S10: React.FC = () => {
  const f = useShotFrame(); // 0..142
  const final = useFinalFrame();
  const camera = beatPath(
    [
      { at: 0, position: [BURROW[0] + 0.6, 1.3, BURROW[2] + 3.4], target: [BURROW[0], 0.12, BURROW[2] - 0.1], fov: 40 },
      { at: 141, position: [BURROW[0] + 0.3, 1.0, BURROW[2] + 2.5], target: [BURROW[0], 0.12, BURROW[2] - 0.05], fov: 40 },
    ],
    f,
  );
  const peek = ease(f, 6, 22);
  const clump = 1500 - 1374;
  const shake = f > clump + 4 && f < clump + 22 ? Math.sin((f - clump) * 1.3) * 18 : 0;
  const clumpY = f < clump ? 1.2 : Math.max(BURROW[1] + 0.33, 1.2 - ((f - clump) / 4) ** 2 * 0.9);
  return (
    <Stage
      set={
        <CretaceousSet camera={camera} frame={f + 1400} mode="cold">
          <Mammal at={[BURROW[0], -0.3 + peek * 0.32, BURROW[2] + 0.12]} yaw={0.1} scale={2.2} jaw={jawFor("mammal", final, 25)} head={f < 100 ? -8 + Math.sin(f * 0.15) * 6 : -16} tail={shake} />
          <Mammal at={[BURROW[0] - 0.36, 0, BURROW[2] - 0.3]} yaw={0.7} scale={2.0} head={ease(f, 40, 50) * -10} tail={Math.sin(f * 0.2) * 10} />
          <Mammal at={[BURROW[0] + 0.36, 0, BURROW[2] - 0.4]} yaw={-0.8} scale={1.8} head={Math.sin(f * 0.11) * 8} />
          {f > clump - 30 && clumpY > BURROW[1] + 0.34 && (
            <mesh position={[BURROW[0] + 0.02, clumpY, BURROW[2] + 0.2]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshToonMaterial color="#f4f8fc" />
            </mesh>
          )}
          <Burst kind="dust" at={[BURROW[0], 0.35, BURROW[2] + 0.22]} frame={f - clump - 4} count={10} size={0.2} seed={61} colors={["#ffffff", "#e8eef4"]} />
        </CretaceousSet>
      }
      camera={camera}
      bg={CRET_BG.cold}
      blur={2.0}
      truth={0.25}
      light={cretLight("cold")}
      foreground={<Fern position={[BURROW[0] - 0.75, 0, BURROW[2] + 2.0]} size={0.45} mode="cold" seed={71} />}
    />
  );
};

// ---------- 11. The green new world (1516-1625): the mammals get the planet, grow and spread ----------

const RUNNERS = [
  { x0: -1.0, z: -1.2, v: 0.012, s: 2.2 },
  { x0: 1.0, z: -1.6, v: -0.012, s: 2.4 },
  { x0: -0.6, z: -3.2, v: 0.01, s: 2.6 },
  { x0: 1.2, z: -3.6, v: -0.01, s: 2.4 },
];
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..109
  const camera = beatPath(
    [
      { at: 0, position: [-0.7, 0.85, 3.8], target: [-0.6, 0.35, 0.0], fov: 42 },
      { at: 66, position: [-0.3, 1.4, 3.6], target: [0.0, 0.6, -1.0], fov: 42 },
      { at: 108, position: [0.0, 2.5, 4.6], target: [0.2, 0.6, -2.0], fov: 44 },
    ],
    f,
  );
  const grow = ease(f, 66, 90);
  const spread = f - 93;
  return (
    <Stage
      set={
        <CretaceousSet camera={camera} frame={f + 1520} mode="green">
          <Mammal at={[-0.3, 0, 0.2]} yaw={0.9} scale={2.2} head={Math.sin(f * 0.2) * 10} tail={Math.sin(f * 0.25) * 20} />
          {/* "They grew": a much bigger cousin trots in */}
          <Mammal at={[mix(0.5, 0.15, ease(f, 50, 95)), 0, mix(-2.6, -2.0, ease(f, 50, 95))]} yaw={-0.9} scale={2.4 + grow * 3.6} head={Math.sin(f * 0.15) * 8} tail={Math.sin(f * 0.3) * 18} />
          {/* "They spread": more of them scurry across the valley */}
          {RUNNERS.map((r, i) => {
            const t = spread + i * 4;
            if (t < 0) return null;
            const up = ease(t, 0, 6);
            const x = r.x0 + r.v * Math.max(0, t - 6) * 2;
            return <Mammal key={i} at={[x, -0.25 * (1 - up) + Math.abs(Math.sin(t * 0.6 + i)) * 0.02, r.z]} yaw={r.v > 0 ? Math.PI / 2 - 0.4 : -Math.PI / 2 + 0.4} scale={r.s} tail={Math.sin(t * 0.5) * 20} />;
          })}
          <Bird position={[1.6, 0, 0.6]} frame={f} hop={Math.abs(Math.sin(f * 0.25)) * 0.05} />
        </CretaceousSet>
      }
      camera={camera}
      bg={CRET_BG.green}
      blur={1.6}
      light={cretLight("green")}
      foreground={<Fern position={frameSpot({ position: [-0.7, 0.85, 3.8], target: [-0.6, 0.35, 0.0], fov: 42 }, ASPECT, -0.88, -0.9, 1.3)} size={0.5} mode="green" seed={81} />}
    />
  );
};

// ---------- 12. The living room (1625-1796): one of their descendants is watching this video ----------

const S12: React.FC = () => {
  const f = useShotFrame(); // 0..171
  const camera = beatPath(
    [
      { at: 0, position: [-0.9, 1.3, 4.4], target: [-0.1, 0.85, -0.5], fov: 40 },
      { at: 40, position: [-0.6, 1.22, 3.6], target: [0.0, 0.85, -0.5], fov: 40 },
      { at: 170, position: [-0.35, 1.12, 2.8], target: [0.05, 0.82, -0.5], fov: 40 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    {
      id: "viewer",
      look: VIEWER,
      at: [0.05, -0.75],
      pose: {
        sit: true,
        hold: { item: "phone", hand: "R" },
        armR: [10, -78],
        ...faceChange([[0, "neutral"], [40, "excited"], [63, "worried"], [110, "happy"]], f),
        lookX: f > 63 && f < 105 ? 0.6 : 0,
        headTilt: ease(f, 106, 118) * 6,
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="night" floor="#4a3a3a" wall="#2e5a62" wallPattern="wallpaper" floorPattern="carpet" width={6} depth={5} stripe="#1e4a52">
          <Sofa position={[0.05, 0, -1.0]} width={1.6} color="#d88a4a" />
          <InkBox size={[0.8, 0.36, 0.45]} position={[0.1, 0.18, 0.15]} color="#8a5a3a" ink={0.01} />
          <Trex at={[0.25, 0.36, 0.15]} yaw={-0.4} scale={0.07} head={Math.sin(f * 0.08) * 6} />
          <Window position={[-1.6, 1.5, -2.45]} size={[1.0, 1.0]} sky="#1a2a4a" />
          <Shelf position={[1.6, 0, -2.3]} width={0.9} rows={3} seed={9} />
          <group position={[-1.05, 0, -1.2]}>
            <InkCylinder radius={0.03} height={1.4} position={[0, 0.7, 0]} color="#2a2a2a" ink={0.006} />
            <InkCylinder radius={0.2} height={0.3} position={[0, 1.45, 0]} color="#f2d8a0" ink={0.008} emissive="#a8783a" />
            <pointLight position={[0, 1.4, 0.2]} intensity={1.8} color="#ffc878" distance={4} />
          </group>
        </Room>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#ffd8a8", tintAmount: 0.08, shadow: 0.25, points: [{ position: [-1.05, 1.4, -1.0], color: "#ffc878", strength: 1.6, range: 3 }] }}
      foreground={<InkCylinder radius={0.22} height={0.32} position={frameSpot({ position: [-0.9, 1.3, 4.4], target: [-0.1, 0.85, -0.5], fov: 40 }, ASPECT, 0.92, 0.85, 1.4)} color="#f2d8a0" ink={0.01} />}
    />
  );
};

// [from, to, shot, transition in]
const SHOTS: Shot[] = [
  [0, 100, S1, false],
  [100, 251, S2, "dip"],
  [251, 315, S3, "dip"],
  [315, 428, S4, "dip"],
  [428, 661, S5, "dip"],
  [661, 826, S6, "dip"],
  [826, 944, S7, "dip"],
  [944, 1215, S8, "dip"],
  [1215, 1374, S9, "dip"],
  [1374, 1516, S10, "dip"],
  [1516, 1625, S11, "dissolve"],
  [1625, TIMING.totalFrames, S12, "dip"],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  // 1. the valley: wind, the stomp, the mammal's squeak
  { at: 0, src: sfx("wind"), volume: 0.06, until: 251 },
  ...foleyCues("thud", [58], 0.7, { space: "outdoor" }),
  { at: 22, src: sfx("squeak"), volume: 0.6, space: "outdoor" },
  { at: 68, src: sfx("whoosh"), volume: 0.55, space: "far" },
  // 2. space: the rock tumbles in, the tag pops, heating up
  { at: 100 + 52, src: sfx("pop"), volume: 0.95 },
  { at: 100 + 132, src: sfx("pop"), volume: 0.72 },
  // 3. the flash: a rising roar of air, the dinosaur grumbles
  { at: 251, src: sfx("rumble"), volume: 0.12, until: 315 },
  { at: 296, src: sfx("roar"), volume: 0.12, space: "outdoor" },
  // 4. the seabed: water, the labels, the impact
  { at: 315, src: sfx("river"), volume: 0.05, until: 410 },
  { at: 315 + 17, src: sfx("pop"), volume: 0.8 },
  { at: 315 + 60, src: sfx("pop"), volume: 0.8 },
  { at: 315 + 82, src: sfx("pop"), volume: 0.85 },
  { at: 315 + 88, src: sfx("whoosh"), volume: 0.42, space: "outdoor" },
  { at: 315 + 104, src: sfx("boom"), volume: 0.42, space: "outdoor", hit: 0.7 },
  // 5. the pivot: sting, rumble, fires crackle, wind
  { at: 428, src: sfx("sting"), volume: 0.3 },
  { at: 430, src: sfx("rumble"), volume: 0.1, until: 560 },
  { at: 548, src: sfx("crackle"), volume: 0.08, until: 661 },
  { at: 560, src: sfx("wind"), volume: 0.08, until: 661 },
  // 6. cold: wind, the long-neck sighs down, the figures topple, the bird
  { at: 661, src: sfx("wind"), volume: 0.1, until: 826 },
  ...foleyCues("thud", [661 + 60], 0.35, { space: "outdoor" }),
  ...foleyCues("thud", TOPPLE.map((t) => 661 + t + 8), 0.55, { space: "outdoor" }),
  { at: 661 + 141, src: sfx("squeak"), volume: 0.16, space: "outdoor" },
  // 7. the lab: a mouse click, the map comes up
  { at: 826, src: sfx("hum"), volume: 0.05, until: 944 },
  { at: 826 + 66, src: sfx("button"), volume: 0.38, space: "room" },
  { at: 826 + 70, src: sfx("credit-blip"), volume: 0.34, space: "room" },
  // 8. the globe: it turns, the cards pop
  { at: 944 + 16, src: sfx("creak"), volume: 0.12, space: "room" },
  { at: 1018, src: sfx("pop"), volume: 0.58, space: "room" },
  { at: 1124, src: sfx("pop"), volume: 1.0, space: "room" },
  { at: 1192, src: sfx("pop"), volume: 1.0, space: "room" },
  // 9. the museum: the diorama munching, the slap, the button pops off
  ...foleyCues("munch", [1225, 1238, 1250], 0.5, { space: "room" }),
  { at: 1215 + 128, src: sfx("pop"), volume: 0.3, space: "hall" },
  { at: 1352, src: sfx("button"), volume: 0.55, space: "hall" },
  { at: 1356, src: sfx("clang"), volume: 0.28, space: "hall" },
  // 10. the burrow: wind, squeaks, the frost clump
  { at: 1374, src: sfx("wind"), volume: 0.07, until: 1516 },
  { at: 1384, src: sfx("squeak"), volume: 0.46, space: "outdoor" },
  { at: 1504, src: sfx("plop"), volume: 1.0, space: "outdoor" },
  // 11. green: birdsong-ish crickets and the scurry
  { at: 1516, src: sfx("crickets"), volume: 0.07, until: 1625 },
  { at: 1596, src: sfx("steps"), volume: 0.06, until: 1625 },
  // 12. the living room: a phone notification
  { at: 1664, src: sfx("notif"), volume: 0.2, space: "room" },
];

const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 315, volume: 0.2 },
  { src: "music/tension.wav", from: 315, to: 826, volume: 0.24 },
  { src: "music/mystery.wav", from: 826, to: 1374, volume: 0.24 },
  { src: "music/lounge.wav", from: 1374, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;

