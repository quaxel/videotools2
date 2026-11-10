import React from "react";
import * as THREE from "three";
import {
  beatPath,
  Burst,
  CameraRig,
  CameraShot,
  Chair,
  faceChange,
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
  Pine,
  PuppetLook,
  PuppetPlacement,
  ramp,
  Ridge,
  Room,
  Screen,
  Sfx,
  sfx,
  Shelf,
  Shot,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
} from "../../engine";
import {
  Calendar,
  Coin,
  Console,
  Earth,
  Envelope,
  LaunchBoard,
  LaunchPanel,
  Mast,
  Padlock,
  Paper,
  RedPhone,
  RedStar,
  Rocket,
  RocketCrate,
  RubberStamp,
  Satellite,
  Scope,
  Sheet,
  WallClock,
  WorldMap,
} from "./props";
import TIMING_JSON from "./timing.json";

// "What if Petrov had reported the launch?": Serpukhov-15, just after midnight on 26 September 1983. The Oko
// satellites reported one, then five American missiles; Lieutenant Colonel Stanislav Petrov judged a real first
// strike would be hundreds, ground radar showed nothing, and he reported a system fault. Sunlight glinting off high
// clouds had fooled the satellite. Sets: Room interiors (the command hall in three lights, his desk, a Kremlin
// office, the truth room, the chain of desks, the launch panel, the commander's office, his flat), a night forest at
// the bunker gate and an orbit shot of the satellite over the Earth.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-petrov";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ASPECT = 9 / 16;

// ---------- cast ----------

const PETROV: PuppetLook = { skin: "#f0c8a8", hair: "#3a2a1e", outfit: "#4a5a6e" };
const OLD_PETROV: PuppetLook = { skin: "#ecc0a0", hair: "#d4d4d4", outfit: "#7a5a44", vest: "#4a3a2e" };
const OFFICER: PuppetLook = { skin: "#f4d0b0", hair: "#d8b060", outfit: "#5a6a3a" };
const OPERATOR: PuppetLook = { skin: "#f0c8a8", hair: "#6a3a1e", outfit: "#4a6a4a", long: true };
const GENERAL: PuppetLook = { skin: "#e8b898", hair: "#b8b8b8", outfit: "#2e4a32", chain: "#e8b04a", beard: "#b8b8b8" };
const COMMANDER: PuppetLook = { skin: "#e8c0a0", hair: "#7a7a7a", outfit: "#5a5e66", glasses: true };

// ---------- the command hall (shots 1, 5, 7) ----------

const PETROV_AT: [number, number] = [0, -1.0]; // seated behind the centre console
const OPERATOR_AT: [number, number] = [1.35, -1.25];
const Hall: React.FC<{ camera: CameraShot; frame: number; alarm?: boolean; dim?: boolean; children?: React.ReactNode }> = ({ camera, frame, alarm = false, dim = false, children }) => (
  <Room
    camera={camera}
    mood={alarm ? "alarm" : dim ? "night" : "cold"}
    floor={alarm ? "#4a2a28" : "#2e3a36"}
    wall={alarm ? "#7a3a34" : dim ? "#28503a" : "#2f5d55"}
    wallPattern="panel"
    floorPattern="tile"
    width={7}
    depth={6}
  >
    <LaunchBoard position={[0, 2.25, -2.92]} on={alarm} frame={frame} width={1.15} />
    <WorldMap position={[-1.85, 1.85, -2.93]} size={[1.3, 0.75]} tracks={alarm ? 5 : 0} />
    {/* the row of consoles: Petrov's in the middle, the operator's to the right */}
    <Console position={[PETROV_AT[0], 0, PETROV_AT[1] + 0.45]} width={1.2} frame={frame} alarm={alarm} />
    <Chair position={[PETROV_AT[0], 0, PETROV_AT[1] - 0.22]} color="#3a4a5a" />
    <Console position={[OPERATOR_AT[0], 0, OPERATOR_AT[1] + 0.45]} width={1.0} frame={frame + 9} alarm={alarm} />
    <Chair position={[OPERATOR_AT[0], 0, OPERATOR_AT[1] - 0.22]} color="#3a4a5a" />
    <Console position={[-1.45, 0, -1.25 + 0.45]} width={1.0} frame={frame + 17} alarm={alarm} />
    {/* tall equipment racks against the side walls */}
    {[-3.0, 3.0].map((x, i) => (
      <group key={x} position={[x, 0, -1.6]}>
        <InkBox size={[0.6, 2.1, 0.6]} position={[0, 1.05, 0]} color={alarm ? "#5a3a36" : "#46564f"} ink={0.012} />
        {Array.from({ length: 5 }, (_, k) => (
          <mesh key={k} position={[i ? -0.31 : 0.31, 0.6 + k * 0.3, 0]} rotation={[0, i ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <circleGeometry args={[0.025, 10]} />
            <meshBasicMaterial color={Math.floor(frame / (11 + k * 3) + k) % 2 ? (alarm ? "#ff3b30" : "#4dff9a") : "#2a302e"} toneMapped={false} />
          </mesh>
        ))}
      </group>
    ))}
    {alarm && <pointLight position={[0, 2.3, -2.2]} color="#ff3b30" intensity={Math.floor(frame / 6) % 2 === 0 ? 4 : 1.2} distance={6} />}
    {children}
  </Room>
);

const hallLight = (alarm: boolean, frame: number) =>
  alarm
    ? { tint: "#ffb0a0", tintAmount: 0.1, shadow: 0.25, points: [{ position: [0, 2.3, -2.4] as [number, number, number], color: "#ff4a3a", strength: Math.floor(frame / 6) % 2 === 0 ? 2.4 : 0.9, range: 5 }] }
    : { tint: "#c8f0e0", tintAmount: 0.08, shadow: 0.2, points: [{ position: [0, 0.8, -0.3] as [number, number, number], color: "#7affc0", strength: 1.2, range: 2.2 }] };

// ---------- 1. Hook: the camera glides over the consoles onto Petrov under the LAUNCH board ----------

const S1_END: CameraShot = { position: [0.15, 1.3, 1.75], target: [0.0, 1.2, -2.0], fov: 42 };
const PanelEdge: React.FC<{ position: Vec3; alarm?: boolean }> = ({ position, alarm }) => (
  <group position={position}>
    <InkBox size={[0.2, 0.13, 0.2]} color={alarm ? "#6a3a36" : "#5a6a64"} ink={0.008} />
    <mesh position={[0.06, 0.112, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.025, 10]} />
      <meshBasicMaterial color={alarm ? "#ff3b30" : "#ffd24a"} toneMapped={false} />
    </mesh>
  </group>
);
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..183
  const start: CameraShot = { position: [0.9, 1.85, 3.7], target: [0.0, 1.45, -2.0], fov: 44 };
  const camera = beatPath(
    [
      { at: 0, ...start },
      { at: 80, position: [0.45, 1.5, 2.6], target: [0.0, 1.25, -2.0], fov: 42 },
      { at: 182, ...S1_END },
    ],
    f,
  );
  const board = f > 112 && f < 140; // "missiles were coming": the board lights for a moment
  return (
    <Stage
      set={<Hall camera={camera} frame={f} alarm={board} />}
      camera={camera}
      bg={moodBackground(board ? "alarm" : "cold")}
      blur={2.2}
      puppets={[
        {
          id: "petrov",
          look: PETROV,
          at: PETROV_AT,
          pose: { sit: true, view: "front", ...faceChange([[0, "thinking"], [112, "worried"], [150, "skeptical"]], f), reachR: [110, -520], reachL: [-110, -520], handR: "open", handL: "open", frontR: true, frontL: true, headTilt: f > 150 ? -6 : 0 },
        },
        { id: "operator", look: OPERATOR, at: OPERATOR_AT, pose: { sit: true, view: "front", expression: "neutral", reachR: [100, -520], reachL: [-100, -520], frontR: true, frontL: true, lookX: -0.5 } },
      ]}
      light={hallLight(board, f)}
      foreground={<PanelEdge position={frameSpot(S1_END, ASPECT, -0.8, -0.85, 0.8)} />}
    />
  );
};

// ---------- 2. The bunker gate in the night forest outside Moscow ----------

const Forest: React.FC<{ camera: CameraShot; frame: number }> = ({ camera, frame }) => {
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#0a1430"]} />
      <fog attach="fog" args={["#0e1a3a", 8, 30]} />
      <ambientLight intensity={1.4} color="#8fa8ff" />
      <directionalLight position={[-4, 6, -6]} intensity={1.4} color="#c8d6ff" castShadow shadow-mapSize={[2048, 2048]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshToonMaterial color="#1e3426" />
      </mesh>
      {/* moon and stars */}
      <mesh position={[-3 + camX * 0.9, 7.5, -24]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color="#f4f0d8" fog={false} toneMapped={false} />
      </mesh>
      <Halo position={[-3 + camX * 0.9, 7.5, -24.1]} size={5} color="#c8d6ff" strength={0.35} />
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[((i * 37) % 30) - 15 + camX * 0.9, 4 + ((i * 53) % 9), -25]}>
          <circleGeometry args={[0.04 + (i % 3) * 0.02, 6]} />
          <meshBasicMaterial color="#e8eeff" fog={false} transparent opacity={0.4 + 0.6 * Math.abs(Math.sin(frame * 0.05 + i))} />
        </mesh>
      ))}
      <Ridge z={-20} shift={camX * 0.55} width={60} low={1.5} high={3.5} peaks={5} color="#1a2a48" seed={3} />
      <Ridge z={-14} width={50} low={1} high={2.2} peaks={7} color="#16283a" seed={8} />
      {/* the fence, the gate with the red star, the bunker entrance and the mast */}
      {Array.from({ length: 14 }, (_, i) => {
        const x = -6.5 + i;
        if (Math.abs(x + 0.5) < 1.2) return null;
        return (
          <group key={i} position={[x, 0, -3.5]}>
            <InkBox size={[0.08, 2.0, 0.08]} position={[0, 1.0, 0]} color="#4a5260" ink={0.006} />
            <InkBox size={[1.0, 0.03, 0.02]} position={[0.5, 1.7, 0]} color="#6a7280" ink={0} />
            <InkBox size={[1.0, 0.03, 0.02]} position={[0.5, 1.1, 0]} color="#6a7280" ink={0} />
            <InkBox size={[1.0, 0.03, 0.02]} position={[0.5, 0.5, 0]} color="#6a7280" ink={0} />
          </group>
        );
      })}
      {[-1, 1].map((s) => (
        <group key={s}>
          <InkBox size={[0.3, 2.4, 0.3]} position={[-0.0 + s * 1.15, 1.2, -3.5]} color="#7a8088" ink={0.01} />
          <InkBox size={[1.0, 1.9, 0.06]} position={[s * 0.55, 0.95, -3.5]} color="#3e5a46" ink={0.01} />
          <RedStar position={[s * 0.55, 1.15, -3.46]} size={0.22} />
        </group>
      ))}
      <group position={[0.4, 0, -9]}>
        <InkBox size={[4.2, 1.6, 2.2]} position={[0, 0.8, 0]} color="#5a6066" ink={0.014} />
        <InkBox size={[1.2, 1.1, 0.1]} position={[0, 0.55, 1.12]} color="#1a1e22" ink={0.008} />
        <mesh position={[0.9, 1.3, 1.12]}>
          <circleGeometry args={[0.07, 12]} />
          <meshBasicMaterial color="#ffd27a" toneMapped={false} />
        </mesh>
        <pointLight position={[0.9, 1.3, 1.6]} color="#ffd27a" intensity={2.4} distance={4} />
      </group>
      <Mast position={[3.2, 0, -12]} height={7} frame={frame} />
      {[
        [-4.5, -6, 1.5],
        [-3.0, -8, 1.8],
        [-6.0, -10, 2.0],
        [4.8, -6.5, 1.6],
        [6.0, -9, 2.0],
        [-2.2, -12, 2.2],
        [1.8, -14, 2.4],
        [-5.5, -2.0, 1.4],
        [5.6, -1.5, 1.3],
      ].map(([x, z, s], i) => (
        <Pine key={i} position={[x, 0, z]} scale={s} color="#1e4a3a" />
      ))}
    </>
  );
};

const S2_END: CameraShot = { position: [0.1, 1.6, 3.2], target: [0.1, 1.2, -5], fov: 46 };
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..130
  const start: CameraShot = { position: [-0.6, 4.2, 6.5], target: [0.3, 1.6, -8], fov: 46 };
  const camera = beatPath(
    [
      { at: 0, ...start },
      { at: 72, position: [-0.3, 2.6, 4.6], target: [0.2, 1.4, -6], fov: 46 },
      { at: 129, ...S2_END },
    ],
    f,
  );
  return (
    <Stage
      set={<Forest camera={camera} frame={f} />}
      camera={camera}
      bg="#0a1430"
      blur={2.0}
      puppets={[]}
      light={{ tint: "#a8b8ff", tintAmount: 0.1, shadow: 0.3 }}
      foreground={<Pine position={[frameSpot(S2_END, ASPECT, 0.95, -0.3, 2.2)[0], 0, frameSpot(S2_END, ASPECT, 0.95, -0.3, 2.2)[2]]} scale={0.9} color="#16382c" />}
    />
  );
};

// ---------- 3. Petrov on watch at his desk: lamp, logbook, a glass of tea ----------

const S3: React.FC = () => {
  const f = useShotFrame(); // 0..95
  const start: CameraShot = { position: [-1.0, 1.25, 2.4], target: [-0.1, 0.85, -0.6], fov: 40 };
  const camera = beatPath(
    [
      { at: 0, ...start },
      { at: 94, position: [-0.15, 1.2, 2.25], target: [0.1, 0.85, -0.6], fov: 40 },
    ],
    f,
  );
  const sip = ease(f, 52, 66) - ease(f, 76, 90);
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#4a3220" wall="#8a6236" wallPattern="wallpaper" floorPattern="wood" width={6} depth={4}>
          <InkBox size={[1.4, 0.06, 0.6]} position={[0.1, 0.45, -0.05]} color="#6a4426" ink={0.01} />
          <InkBox size={[1.4, 0.42, 0.04]} position={[0.1, 0.21, 0.24]} color="#5a3a20" ink={0.008} />
          <Chair position={[0.1, 0, -0.75]} color="#5a3a24" />
          <Lamp position={[0.65, 0.48, -0.15]} />
          <InkBox size={[0.36, 0.04, 0.26]} position={[-0.3, 0.5, 0.0]} rotation={[0, 0.15, 0]} color="#2a4a3a" ink={0.005} />
          <InkBox size={[0.32, 0.01, 0.22]} position={[-0.3, 0.525, 0.0]} rotation={[0, 0.15, 0]} color="#f0e8d4" ink={0.002} />
          <WallClock position={[-0.9, 1.8, -1.93]} minutes={12 + f * 0.05} />
          <Shelf position={[1.6, 1.2, -1.9]} width={1.0} rows={3} color="#5a3a20" seed={4} />
          <WorldMap position={[0.1, 1.75, -1.93]} size={[1.0, 0.56]} />
          <pointLight position={[0.65, 0.95, 0.05]} color="#ffc070" intensity={2.6} distance={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.4}
      puppets={[
        {
          id: "petrov",
          look: PETROV,
          at: [0.1, -0.53],
          pose: {
            sit: true,
            view: "front",
            ...faceChange([[0, "neutral"], [40, "thinking"]], f),
            hold: { item: "cup", hand: "R" },
            reachR: [mix(150, 60, sip), mix(-500, -720, sip)],
            frontR: true,
            reachL: [-120, -500],
            handL: "open",
            frontL: true,
            lookX: f < 40 ? -0.4 : 0.2,
          },
        },
      ]}
      light={{ tint: "#ffd0a0", tintAmount: 0.1, shadow: 0.25, points: [{ position: [0.65, 0.95, 0.05], color: "#ffc070", strength: 2.0, range: 2.5 }] }}
      foreground={<InkCylinder radius={0.18} height={0.9} position={frameSpot(start, ASPECT, -0.85, -0.7, 1.1)} color="#5a3a20" ink={0.006} />}
    />
  );
};

// ---------- 4. The Kremlin: a general reads of the airliner and stares at the map ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..114
  const camera = beatPath(
    [
      { at: 0, position: [0.95, 1.5, -0.55], target: [0.95, 1.5, -1.95], fov: 40 },
      { at: 56, position: [0.4, 1.3, 1.5], target: [0.0, 0.95, -0.6], fov: 40 },
      { at: 113, position: [0.35, 1.4, 2.4], target: [-0.45, 0.9, -1.4], fov: 42 },
    ],
    f,
  );
  const turn = f > 66;
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#7a2a22" wall="#9a6a32" wallPattern="panel" floorPattern="carpet" width={6} depth={4}>
          <Desk2 />
          <Paper position={[0.95, 1.5, -1.93]} rotation={[0, 0, 0.04]} size={0.42} masthead="PRAVDA" lines={["KOREAN", "AIRLINER", "SHOT DOWN"]} />
          <WorldMap position={[-0.75, 1.6, -1.93]} size={[1.3, 0.74]} tracks={ramp(f, 72, 90) > 0 ? 3 : 0} />
          <RedStar position={[0.95, 2.2, -1.93]} size={0.16} />
          <Window position={[2.0, 1.55, -1.95]} size={[0.8, 1.2]} sky="#2a2448" />
          <Lamp position={[-0.6, 0.48, -0.15]} color="#a8ffb8" />
          <pointLight position={[-0.6, 1.0, -0.1]} color="#ffe0a0" intensity={0.9} distance={3} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={2.2}
      puppets={[
        {
          id: "general",
          look: GENERAL,
          at: [-0.25, -0.45],
          pose: turn
            ? { sit: true, view: "side", facing: -1, ...faceChange([[66, "worried"]], f), lookX: -0.6 }
            : { sit: true, view: "front", ...faceChange([[0, "skeptical"], [40, "angry"]], f), reachR: [140, -470], reachL: [-140, -470], frontR: true, frontL: true, handR: "open", handL: "open", headTilt: 8 },
        },
      ]}
      light={{ tint: "#ffe0a0", tintAmount: 0.1, shadow: 0.25, points: [{ position: [-0.5, 0.95, 0.1], color: "#ffe0a0", strength: 1.6, range: 2.5 }] }}
    />
  );
};
const Desk2: React.FC = () => (
  <>
    <InkBox size={[1.5, 0.06, 0.7]} position={[0.1, 0.45, 0.0]} color="#5a3418" ink={0.01} />
    <InkBox size={[1.5, 0.42, 0.04]} position={[0.1, 0.21, 0.33]} color="#4a2a14" ink={0.008} />
    <InkBox size={[1.1, 0.012, 0.5]} position={[0.1, 0.485, 0.0]} color="#2e5a3a" ink={0} />
  </>
);

// ---------- 5. The alarm: the siren, the board, one, two, five missiles; the officer's tea flies; the red phone ----------

const SIREN = 8;
const COUNTS = [
  { at: 38, n: "1" },
  { at: 68, n: "2" },
  { at: 92, n: "5" },
];
const PHONE = 176;
const S5_END: CameraShot = { position: [-0.1, 1.2, 1.8], target: [-0.05, 0.95, -1.0], fov: 48 };
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..260
  const camera = beatPath(
    [
      { at: 0, position: [0.45, 0.95, 2.2], target: [0.25, 1.35, -2.9], fov: 50 },
      { at: 96, position: [0.2, 1.45, 2.2], target: [0.15, 0.95, -2.9], fov: 50 },
      { at: 150, position: [0.35, 1.3, 2.1], target: [0.35, 1.0, -1.0], fov: 48 },
      { at: 259, ...S5_END },
    ],
    f,
  );
  const count = [...COUNTS].reverse().find((c) => f >= c.at);
  const OFF_AT: [number, number] = [0.8, -0.2];
  const tilt = ease(f, SIREN + 4, SIREN + 12);
  const cupHand = handWorld(OFF_AT, [150, -620], camera);
  const lift = ease(f, PHONE, PHONE + 10);
  return (
    <Stage
      set={
        <Hall camera={camera} frame={f} alarm={f >= SIREN}>
          {count && <Screen position={[0, 1.55, -2.88]} size={[0.5, 0.3]} text={count.n} glow="#ff5a4a" bg="#2a0806" appear={f - count.at} />}
          <RedPhone position={[-0.35, 0.47, PETROV_AT[1] + 0.4]} lift={lift} rotationY={0.2} />
          <Burst kind="confetti" at={cupHand} frame={f - SIREN - 9} count={14} size={0.35} speed={1.4} colors={["#c87a2a", "#a85a1a", "#e8a050"]} seed={4} />
        </Hall>
      }
      camera={camera}
      bg={moodBackground(f >= SIREN ? "alarm" : "cold")}
      blur={2.2}
      puppets={[
        {
          id: "petrov",
          look: PETROV,
          at: PETROV_AT,
          pose:
            f < PHONE
              ? { sit: true, view: "front", ...faceChange([[0, "thinking"], [SIREN + 2, "shocked"], [100, "worried"]], f), reachR: [110, -520], reachL: [-110, -520], frontR: true, frontL: true, lookX: f > 100 ? 0.6 : 0 }
              : { sit: true, view: "front", ...faceChange([[PHONE, "worried"], [PHONE + 40, "thinking"]], f), reachL: [-150, mix(-500, -760, lift)], handL: "fist", frontL: true, reachR: [110, -520], frontR: true, lookX: 0.3, headTilt: -6 },
        },
        {
          id: "officer",
          look: OFFICER,
          at: OFF_AT,
          pose: {
            ...faceChange([[0, "neutral"], [SIREN + 1, "shocked"], [108, "worried"]], f),
            ...(f >= SIREN + 2 ? jump(f, SIREN + 2, 200, 26) : {}),
            hold: f < SIREN + 14 ? { item: "cup", hand: "R" } : undefined,
            itemTilt: tilt * 170,
            reachR: [150, -620],
            frontR: true,
            ...(f > 104 && f < 170 ? { gesture: "point" as const, lookX: -0.8 } : { lookX: -0.4 }),
          },
        },
      ]}
      light={hallLight(f >= SIREN, f)}
      foreground={<PanelEdge position={frameSpot(S5_END, ASPECT, 0.8, -0.85, 0.75)} alarm={f >= SIREN} />}
    />
  );
};

// ---------- 6. You see: five rockets on a stand, a crate of HUNDREDS, and the ground radar with nothing on it ----------

const S6: React.FC = () => {
  const f = useShotFrame(); // 0..180
  const camera = beatPath(
    [
      { at: 0, position: [0.3, 0.85, 2.3], target: [0.0, 0.35, 0.5], fov: 42 },
      { at: 62, position: [0.2, 0.9, 2.15], target: [0.0, 0.38, 0.5], fov: 42 },
      { at: 100, position: [0.05, 1.45, 2.1], target: [0.0, 0.3, -0.5], fov: 42 },
      { at: 179, position: [-0.05, 1.4, 1.45], target: [0.0, 1.2, -1.9], fov: 42 },
    ],
    f,
  );
  const crate = ease(f, 86, 104);
  return (
    <Stage
      set={
        <Room camera={camera} mood="neon" floor="#2a1640" wall="#3e1e62" wallPattern="plain" floorPattern="concrete" width={7} depth={4}>
          {/* five rockets on a low stand */}
          <InkBox size={[0.9, 0.2, 0.35]} position={[0, 0.1, 0.5]} color="#5a4a6a" ink={0.01} />
          {[0, 1, 2, 3, 4].map((k) => (
            <group key={k} position={[-0.32 + k * 0.16, 0.2 + Math.max(0, Math.sin(Math.min(1, Math.max(0, (f - 48 - k * 3) / 8)) * Math.PI)) * 0.08, 0.5]}>
              <Rocket position={[0, 0, 0]} scale={0.4} nose={f >= 48 + k * 3 ? "#ff2a1e" : "#6a5a7a"} color={f >= 48 + k * 3 ? "#f4f0e6" : "#9a90a8"} />
            </group>
          ))}
          <Label text="5" position={[0, 0.1, 0.68]} rotation={[-ease(f, 82, 90) * Math.PI * 0.5, 0, 0]} width={0.24} appear={f - 52} />
          {/* the crate of hundreds rises behind them */}
          <group position={[0, -0.6 * (1 - crate), -0.5]} scale={0.75}>
            <RocketCrate position={[0, 0, 0]} fill={1} />
            {/* the sign on its stick folds face-down once it is said, before the camera rises past it */}
            <group position={[0, 0.6, -0.1]} rotation={[ease(f, 110, 120) * Math.PI * 0.5, 0, 0]}>
              <InkBox size={[0.03, 0.5, 0.03]} position={[0, 0.25, 0]} color="#4a3a2a" ink={0.004} />
              <Label text="HUNDREDS" position={[0, 0.55, 0.02]} width={0.9} appear={f - 92} />
            </group>
          </group>
          {/* the ground radar on the wall, nothing on it */}
          <Scope position={[0, 1.45, -1.9]} sweep={f * 0.09} label={f >= 140 ? "GROUND RADAR" : undefined} readout={f > 148 ? "NO CONTACT" : undefined} radius={0.28} />
          <pointLight position={[0, 2.2, 1.0]} color="#d8b8ff" intensity={2.2} distance={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("neon")}
      blur={1.8}
      puppets={[]}
    />
  );
};

// ---------- 7. "False alarm. Report a system fault." Then he waits; the clock runs; "Still nothing, sir." ----------

const S7_END: CameraShot = { position: [0.25, 1.35, 1.7], target: [0.7, 1.2, -1.6], fov: 42 };
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..145
  const start: CameraShot = { position: [-0.55, 1.15, 1.75], target: [0.0, 0.95, -1.2], fov: 42 };
  const camera = beatPath(
    [
      { at: 0, ...start },
      { at: 60, position: [-0.3, 1.2, 1.65], target: [0.2, 1.0, -1.2], fov: 42 },
      { at: 144, ...S7_END },
    ],
    f,
  );
  const minutes = 18 + ease(f, 60, 118) * 14;
  return (
    <Stage
      set={
        <Hall camera={camera} frame={f + 300} dim>
          <WallClock position={[1.15, 2.1, -2.9]} minutes={minutes} size={0.24} />
          <Scope position={[1.05, 1.2, -2.55]} sweep={f * 0.1} readout="NO CONTACT" radius={0.26} />
          <RedPhone position={[-0.35, 0.47, PETROV_AT[1] + 0.4]} lift={1 - ease(f, 48, 58)} rotationY={0.2} />
        </Hall>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={2.2}
      puppets={[
        {
          id: "petrov",
          look: PETROV,
          at: PETROV_AT,
          pose: {
            sit: true,
            view: "front",
            ...faceChange([[0, "determined"], [60, "worried"], [125, "thinking"]], f),
            reachL: [-150, f < 50 ? -760 : -520],
            handL: "fist",
            frontL: true,
            reachR: f > 70 && f < 115 ? [60, -700] : [110, -520],
            frontR: true,
            lookX: f > 70 ? 0.7 : 0,
          },
        },
        { id: "officer", look: OFFICER, at: [0.5, -1.75], pose: { view: f < 110 ? "back" : "front", ...faceChange([[0, "worried"], [112, "confused"]], f), lookX: -0.7 } },
      ]}
      light={{ tint: "#b0ffd0", tintAmount: 0.1, shadow: 0.25, points: [{ position: [0.9, 1.2, -2.2], color: "#4dff9a", strength: 1.8, range: 3 }] }}
      foreground={<PanelEdge position={frameSpot(S7_END, ASPECT, -0.8, -0.85, 0.75)} />}
    />
  );
};

// ---------- 8. In orbit: the satellite over the Earth; sunlight glints off high clouds ----------

const S8: React.FC = () => {
  const f = useShotFrame(); // 0..104
  const camera = beatPath(
    [
      { at: 0, position: [-1.8, 0.6, 4.0], target: [0.0, -0.6, -2.0], fov: 44 },
      { at: 103, position: [0.9, 0.3, 3.6], target: [0.6, -1.4, -3.0], fov: 44 },
    ],
    f,
  );
  const glint = ease(f, 26, 40) * (0.85 + 0.15 * Math.sin(f * 0.6)) - ease(f, 90, 104) * 0.3;
  return (
    <Stage
      set={
        <>
          <CameraRig {...camera} />
          <color attach="background" args={["#05060f"]} />
          <ambientLight intensity={0.8} color="#a8b8ff" />
          <directionalLight position={[6, 3, 2]} intensity={2.6} color="#fff4dc" />
          {Array.from({ length: 70 }, (_, i) => (
            <mesh key={i} position={[((i * 47) % 40) - 20, ((i * 29) % 22) - 4, -18 - (i % 5)]}>
              <circleGeometry args={[0.03 + (i % 3) * 0.02, 6]} />
              <meshBasicMaterial color="#e8eeff" />
            </mesh>
          ))}
          <Earth position={[0, -7.6, -5]} radius={6.4} spin={0.6 + f * 0.0015} glint={glint} glintAt={[0.6, 6.2, 3.5]} />
          <Satellite position={[-0.35 + f * 0.004, 0.3, 0.4]} rotation={[0.3, 0.6 + f * 0.003, 0.25]} scale={0.32} />
          <mesh position={[9, 4, -16]}>
            <circleGeometry args={[0.8, 24]} />
            <meshBasicMaterial color={new THREE.Color(3, 2.8, 2.2)} toneMapped={false} />
          </mesh>
          <Halo position={[9, 4, -16.1]} size={6} color="#fff4c8" strength={0.6} />
        </>
      }
      camera={camera}
      bg="#05060f"
      blur={1.4}
      puppets={[]}
    />
  );
};

// ---------- 9. What if: the WARNING climbs a staircase of desks to the KREMLIN ----------

const STEPS: [number, number, number][] = [
  [-0.9, 0.0, 0.6],
  [-0.2, 0.55, -0.2],
  [0.5, 1.1, -1.0],
  [1.2, 1.65, -1.8],
];
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..110
  const camera = beatPath(
    [
      { at: 0, position: [-0.9, 1.5, 3.4], target: [-0.7, 0.55, 0.5], fov: 44 },
      { at: 60, position: [-0.4, 2.0, 3.6], target: [0.0, 1.2, -0.4], fov: 44 },
      { at: 109, position: [0.7, 2.7, 3.0], target: [1.1, 2.2, -1.7], fov: 44 },
    ],
    f,
  );
  // the envelope hops from desk to desk on "climbed to the Kremlin"
  const hop = Math.min(3, Math.max(0, (f - 58) / 14));
  const k = Math.floor(hop);
  const t = hop - k;
  const a = STEPS[k];
  const b = STEPS[Math.min(3, k + 1)];
  const env: [number, number, number] = [mix(a[0], b[0], t), mix(a[1], b[1], t) + 0.62 + Math.sin(t * Math.PI) * 0.3, mix(a[2], b[2], t)];
  return (
    <>
    <Stage
      set={
        <Room camera={camera} mood="dream" floor="#4a1e4a" wall="#7a2e72" wallPattern="wallpaper" floorPattern="carpet" width={8} depth={5}>
          {STEPS.map(([x, y, z], i) => (
            <group key={i} position={[x, y, z]}>
              <InkBox size={[0.6, y + 0.45, 0.6]} position={[0, -(y + 0.45) / 2 + 0.45, 0]} color={["#8a5a7a", "#7a4a6a", "#6a3a5a", "#5a2a4a"][i]} ink={0.012} />
              <RedPhone position={[0.25, 0.45, 0.1]} lift={i === k && t < 0.3 && f > 58 ? 0.6 : 0} />
            </group>
          ))}
          <group position={[STEPS[3][0], STEPS[3][1] + 0.45, STEPS[3][2] - 0.3]}>
            <InkBox size={[0.5, 0.9, 0.5]} position={[0, 0.45, 0]} color="#b8282a" ink={0.012} />
            <mesh position={[0, 1.12, 0]}>
              <coneGeometry args={[0.32, 0.5, 4]} />
              <meshToonMaterial color="#2e6a4a" gradientMap={undefined} />
            </mesh>
            <RedStar position={[0, 1.55, 0.02]} size={0.14} glow />
            <Label text="KREMLIN" position={[0, 0.45, 0.26]} width={0.48} bg="#f0d890" fg="#5a1010" />
          </group>
          {f > 4 && <Envelope position={f < 58 ? [STEPS[0][0], STEPS[0][1] + 0.62, STEPS[0][2]] : env} rotation={[0, 0, Math.sin(f * 0.3) * 0.1]} glow={1} />}
          <pointLight position={[1.2, 3.2, -0.8]} color="#ffb0e0" intensity={2.4} distance={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dream")}
      blur={1.8}
      puppets={[]}
      foreground={<RedPhone position={[-1.25, 0.9, 2.2]} rotationY={0.4} />}
    />
    <Headline f={f} text="WHAT IF HE'D REPORTED AN ATTACK?" at={16} out={96} />
    </>
  );
};

// ---------- 10. Would they have fired? The launch button under glass, held by three CHECK padlocks ----------

const LOCKS = [44, 52, 60];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..123
  const camera = beatPath(
    [
      { at: 0, position: [-0.9, 1.55, 2.9], target: [-0.2, 1.0, -0.6], fov: 42 },
      { at: 46, position: [-0.25, 1.6, 2.2], target: [0.15, 0.95, -0.6], fov: 42 },
      { at: 122, position: [0.25, 1.45, 1.75], target: [0.25, 0.95, -0.6], fov: 42 },
    ],
    f,
  );
  const reach = ease(f, 6, 34) - ease(f, 70, 88);
  const dim = ease(f, 92, 118);
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#3a2018" wall="#8a4422" wallPattern="panel" floorPattern="concrete" width={6} depth={4}>
          <LaunchPanel position={[0.25, 0, -0.6]} cover={reach * 0.4} lit={dim < 0.6} />
          {LOCKS.map((at, i) => (
            <Padlock key={i} position={[-0.05 + i * 0.3, 1.5, -0.86]} label="CHECK" shut={ease(f, at + 4, at + 10)} scale={f >= at ? Math.min(1, 0.5 + (f - at) * 0.1) : 0} />
          ))}
          {[-0.05, 0.25, 0.55].map((x, i) => (
            <InkBox key={i} size={[0.02, 0.6, 0.02]} position={[x, 1.2, -0.88]} color="#b8bcc4" ink={0.003} />
          ))}
          <pointLight position={[0.3, 2.2, 0.6]} color="#ffb070" intensity={2.6 * (1 - dim * 0.7)} distance={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      blur={2.0}
      puppets={[
        {
          id: "general",
          look: GENERAL,
          at: [-0.75, -0.35],
          pose: { view: "side", facing: 1, ...faceChange([[0, "determined"], [62, "worried"], [96, "sad"]], f), reachR: [mix(120, 330, reach), mix(-480, -640, reach)], handR: "open", lean: reach * 8 },
        },
      ]}
      light={{ tint: "#ffc890", tintAmount: 0.1, shadow: 0.3, points: [{ position: [0.3, 2.2, 0.6], color: "#ffb070", strength: 1.8 * (1 - dim * 0.6), range: 4 }] }}
      foreground={<InkBox size={[0.3, 1.4, 0.3]} position={[1.35, 0.7, 1.2]} color="#4a2a18" ink={0.008} />}
    />
  );
};

// ---------- 11. His reward: an empty medal box; the commander stamps REPRIMAND; the file goes SECRET until 1998 ----------

const SLAM = 66;
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..181
  const start: CameraShot = { position: [-0.9, 1.35, 2.6], target: [-0.35, 0.75, -0.3], fov: 40 };
  const camera = beatPath(
    [
      { at: 0, ...start },
      { at: SLAM, position: [-0.4, 1.3, 2.4], target: [-0.1, 0.75, -0.3], fov: 40 },
      { at: 118, position: [0.4, 1.35, 2.5], target: [0.6, 0.95, -0.9], fov: 40 },
      { at: 180, position: [0.9, 1.45, 2.5], target: [1.15, 1.3, -1.3], fov: 40 },
    ],
    f,
  );
  const lift = f < SLAM - 10 ? 1 : f < SLAM ? 1 - ease(f, SLAM - 6, SLAM) : ease(f, SLAM + 8, SLAM + 18);
  const jolt = f >= SLAM && f < SLAM + 10 ? Math.sin(((f - SLAM) / 10) * Math.PI) * 0.06 : 0;
  const boxShut = ease(f, 40, 48);
  const file = ease(f, 120, 140);
  return (
    <Stage
      set={
        <Room camera={camera} mood="office" floor="#8a8270" wall="#d8d0b4" wallPattern="panel" floorPattern="tile" width={6} depth={4}>
          <InkBox size={[1.3, 0.06, 0.7]} position={[-0.3, 0.45, -0.3]} color="#6a5a44" ink={0.01} />
          <InkBox size={[1.3, 0.42, 0.04]} position={[-0.3, 0.21, 0.04]} color="#5a4a36" ink={0.008} />
          <Sheet position={[-0.08, 0.483, -0.12]} stamped={f >= SLAM} lift={jolt * 0.5} />
          <Sheet position={[-0.62, 0.483, -0.28]} rotation={[0, 0.3, 0]} lift={jolt} />
          <RubberStamp position={[-0.08, 0.49, -0.07]} lift={lift * 0.8} />
          {/* the empty medal box snaps shut */}
          <group position={[0.24, 0.48, -0.25]}>
            <InkBox size={[0.18, 0.05, 0.14]} position={[0, 0.025, 0]} color="#7a1a24" ink={0.005} />
            <InkBox size={[0.17, 0.01, 0.13]} position={[0, 0.052, 0]} color="#f0e0c8" ink={0} />
            <group position={[0, 0.05, -0.07]} rotation={[-(1 - boxShut) * 1.6, 0, 0]}>
              <InkBox size={[0.18, 0.04, 0.14]} position={[0, 0.02, 0.07]} color="#7a1a24" ink={0.005} />
            </group>
          </group>
          {/* the file cabinet and the calendar */}
          <group position={[1.2, 0, -1.5]}>
            <InkBox size={[0.6, 1.3, 0.55]} position={[0, 0.65, 0]} color="#6a7262" ink={0.012} />
            <InkBox size={[0.5, 0.3, 0.5]} position={[0, 1.0, 0.25 + 0.3 * (1 - file) * ramp(f, 100, 120)]} color="#7a8272" ink={0.008} />
            <Label text="SECRET" position={[0, 0.62, 0.29]} width={0.46} bg="#c4241c" fg="#fff4e0" border={false} appear={f - 128} />
          </group>
          <Calendar position={[1.2, 1.85, -1.93]} year={f > 150 ? "1998" : "1983"} appear={f > 150 ? f - 150 : undefined} />
          <Lamp position={[-0.85, 0.48, -0.5]} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("office")}
      blur={2.2}
      puppets={[
        {
          id: "commander",
          look: COMMANDER,
          at: [-0.3, -0.85],
          pose: { sit: true, view: "front", ...faceChange([[0, "bored"], [SLAM - 8, "angry"], [SLAM + 30, "smug"]], f), reachR: [130, f < SLAM + 18 ? mix(-560, -720, lift) : -520], handR: "fist", frontR: true, reachL: [-120, -500], frontL: true, handL: "open" },
        },
        {
          id: "petrov",
          look: PETROV,
          at: [0.55, -0.75],
          pose: {
            ...faceChange([[0, "awkward"], [SLAM + 1, "shocked"], [SLAM + 24, "sad"]], f),
            ...(f >= SLAM + 1 ? jump(f, SLAM + 1, 90, 20) : {}),
            gesture: f > SLAM + 30 ? "armsCrossed" : undefined,
            lookX: -0.7,
          },
        },
      ]}
      light={{ tint: "#fff4dc", tintAmount: 0.06, shadow: 0.2 }}
      foreground={<InkBox size={[0.08, 1.1, 0.08]} position={frameSpot(start, ASPECT, -0.85, -0.5, 1.0)} color="#4a3a2a" ink={0.006} />}
    />
  );
};

// ---------- 12. Dawn: old Petrov at his window flips a coin, fumbles it, catches it ----------

const S12_END: CameraShot = { position: [-0.15, 1.2, 2.15], target: [0.15, 1.0, -0.8], fov: 40 };
const S12: React.FC = () => {
  const f = useShotFrame(); // 0..135
  const start: CameraShot = { position: [-0.7, 1.3, 3.1], target: [0.0, 1.05, -0.8], fov: 40 };
  const camera = beatPath(
    [
      { at: 0, ...start },
      { at: 134, ...S12_END },
    ],
    f,
  );
  const AT: [number, number] = [0.15, -0.6];
  const hand = handWorld(AT, [140, -540], camera);
  // two flights: a toss that he fumbles off his palm, then a little hop he catches
  const fl = (a: number, b: number, h: number) => {
    const p = ramp(f, a, b);
    return p > 0 && p < 1 ? Math.sin(p * Math.PI) * h : 0;
  };
  const up = fl(20, 46, 0.55) + fl(48, 62, 0.15);
  const spin = ease(f, 20, 46) * Math.PI * 8 + ease(f, 48, 62) * Math.PI * 2;
  const dawn = ease(f, 70, 130);
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#6a4430" wall="#c88a76" wallPattern="wallpaper" floorPattern="wood" width={6} depth={4}>
          <Window position={[0.6, 1.5, -1.95]} size={[1.1, 1.3]} sky={"#" + new THREE.Color("#e88a8a").lerp(new THREE.Color("#ffc890"), dawn).getHexString()} />
          <Halo position={[0.6, 1.4, -1.9]} size={1.6 + dawn} color="#ffd0a0" strength={0.3 + dawn * 0.4} />
          {[-1, 1].map((s) => (
            <InkBox key={s} size={[0.3, 1.6, 0.05]} position={[0.6 + s * 0.75, 1.45, -1.88]} color="#8a2a3a" ink={0.006} />
          ))}
          <Shelf position={[-1.5, 1.2, -1.9]} width={1.0} rows={3} color="#6a4430" seed={7} />
          <InkBox size={[0.5, 0.5, 0.5]} position={[-0.75, 0.25, -0.9]} color="#5a3a26" ink={0.01} />
          <group userData={{ ghost: true }}>
            <Coin position={[hand[0], hand[1] + 0.05 + up, hand[2] + 0.02]} spin={spin} />
          </group>
          <pointLight position={[0.6, 1.6, -1.2]} color="#ffc890" intensity={1.6 + dawn * 2} distance={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={2.2}
      puppets={[
        {
          id: "petrov",
          look: OLD_PETROV,
          at: AT,
          pose: {
            ...faceChange([[0, "thinking"], [46, "worried"], [62, "smug"], [96, "happy"]], f),
            reachR: f > 44 && f < 50 ? [170, -500] : [140, -540],
            handR: "open",
            frontR: true,
            lookX: f < 62 ? 0.6 : 0.2,
            headTilt: f > 96 ? 5 : 0,
          },
        },
      ]}
      light={{ tint: "#ffd0b0", tintAmount: 0.1, shadow: 0.25, distant: [{ direction: [0.4, 0.3, -1], color: "#ffc890", strength: 1.2 + dawn }] }}
      foreground={<InkBox size={[0.12, 1.2, 0.04]} position={frameSpot(S12_END, ASPECT, 0.92, 0.1, 0.65)} color="#8a2a3a" ink={0.006} />}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 183, S1, false],
  [183, 313, S2, "dip"],
  [313, 408, S3, "dip"],
  [408, 522, S4, "dip"],
  [522, 782, S5, "dip"],
  [782, 962, S6, "dip"],
  [962, 1107, S7, "dip"],
  [1107, 1211, S8, "dip"],
  [1211, 1321, S9, "dip"],
  [1321, 1444, S10, "dip"],
  [1444, 1625, S11, "dip"],
  [1625, TIMING.totalFrames, S12, "dip"],
];

const SFX: Sfx[] = [
  // the hall
  { at: 0, src: sfx("hum"), volume: 0.14, until: 183 },
  { at: 0, src: sfx("morse"), volume: 0.05, until: 183 },
  // the gate
  { at: 183, src: sfx("wind"), volume: 0.14, until: 313 },
  { at: 183, src: sfx("crickets"), volume: 0.1, until: 313 },
  // the desk
  { at: 313, src: sfx("tick"), volume: 0.12, until: 408 },
  { at: 313 + 52, src: sfx("clink"), volume: 0.42, space: "room" },
  // the Kremlin
  { at: 408 + 4, src: sfx("paper"), volume: 0.45, space: "room" },
  // the alarm
  { at: 522, src: sfx("hum"), volume: 0.12, until: 782 },
  { at: 522 + SIREN, src: sfx("riser"), volume: 0.1, until: 522 + 168 },
  { at: 522 + SIREN, src: sfx("sting"), volume: 0.25, hit: 0.4 },
  ...COUNTS.map((c, i) => ({ at: 522 + c.at, src: sfx(i === 2 ? "notif" : "credit-blip"), volume: i === 2 ? 0.22 : 0.25, space: "room" as const })),
  { at: 522 + SIREN + 26, src: sfx("splash"), volume: 0.08, space: "room" },
  { at: 522 + PHONE + 2, src: sfx("clink"), volume: 0.36, space: "room" },
  // the truth room
  ...[0, 1, 2, 3, 4].map((k) => ({ at: 782 + 50 + k * 3, src: sfx((["pop", "button", "pop", "button", "pop"] as const)[k]), volume: 0.4 })),
  { at: 782 + 90, src: sfx("drawer"), volume: 0.75 },
  { at: 782 + 117, src: sfx("hum"), volume: 0.1, until: 962 },
  { at: 782 + 148, src: sfx("credit-blip"), volume: 0.4 },
  // the wait
  { at: 962, src: sfx("hum"), volume: 0.06, until: 1107 },
  { at: 962 + 58, src: sfx("button"), volume: 0.7, space: "room" },
  { at: 962 + 60, src: sfx("tick"), volume: 0.18, until: 962 + 118 },
  // orbit
  { at: 1107, src: sfx("hum"), volume: 0.08, until: 1211 },
  { at: 1107 + 26, src: sfx("whoosh"), volume: 0.25 },
  // the chain
  ...[0, 1, 2].map((k) => ({ at: 1211 + 58 + k * 14, src: sfx((["whoosh", "card", "whoosh"] as const)[k]), volume: [0.22, 0.6, 0.22][k], space: "room" as const })),
  { at: 1211 + 100, src: sfx("chime"), volume: 0.25 },
  // the launch panel
  ...LOCKS.map((at, i) => ({ at: 1321 + at + 6, src: sfx((["bolt", "clang", "bolt"] as const)[i]), volume: [0.45, 0.35, 0.4][i], space: "room" as const })),
  { at: 1321 + 92, src: sfx("tape-stop"), volume: 0.2 },
  // the reprimand
  { at: 1444 + 46, src: sfx("drawer"), volume: 0.25, space: "room" },
  { at: 1444 + SLAM, src: sfx("stamp"), volume: 0.9, space: "room", hit: 0.35 },
  { at: 1444 + SLAM + 2, src: sfx("paper"), volume: 0.2, space: "room" },
  { at: 1444 + 124, src: sfx("drawer"), volume: 0.3, space: "room" },
  { at: 1444 + 150, src: sfx("pop"), volume: 0.4 },
  // the coin
  { at: 1625 + 20, src: sfx("clink"), volume: 0.3, space: "room" },
  { at: 1625 + 47, src: sfx("credit-blip"), volume: 0.35, space: "room" },
  { at: 1625 + 62, src: sfx("pop"), volume: 0.5, space: "room" },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.mystery, from: 0, to: 522, volume: 0.34 },
  { src: MUSIC_FILES.tension, from: 522, to: 1107, volume: 0.34 },
  { src: MUSIC_FILES.mystery, from: 1107, to: 1444, volume: 0.32 },
  { src: MUSIC_FILES.lounge, from: 1444, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
