import React from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { useOwned } from "./BalloonSets";
import { GodRays } from "./godrays";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { rand } from "../engine/helpers";

// A palace throne room built from references (guide/references/throne-room.md): Iznik-style tile dado round cream
// plaster walls, a canopied throne on a two-step dais, tall arched grilled windows, a checker of big stone floor tiles
// (0.5 m: the guards measure their sticks against them), a heavy double door with an iron bolt, tall brass
// candlesticks, a stone bench along the right wall and the Queen's jewel stand. Floor y = 0, back wall z = -3,
// side walls x = ±4.5. `mode` gives one room five colour moods.

type Vec3 = [number, number, number];
const INK = "#161212";

export type ThroneMode = "candle" | "night" | "corner" | "dawn" | "day";

type ModeLook = {
  bg: string;
  fog: [number, number];
  ambient: [number, string];
  hemi: [string, string, number];
  key: [number, string, Vec3]; // intensity, colour, position (the light through the windows)
  sky: string; // in the window panes
  candles: number; // 0 out .. 1 full
  rays?: { color: string; strength: number };
};

export const THRONE: Record<ThroneMode, ModeLook> = {
  candle: { bg: "#2a1008", fog: [7, 18], ambient: [0.9, "#ffcfa0"], hemi: ["#ffb880", "#3a1a10", 0.5], key: [1.0, "#ffb070", [-3, 5, 4]], sky: "#1a2350", candles: 1 },
  night: { bg: "#070b1c", fog: [6, 16], ambient: [0.55, "#7f98ff"], hemi: ["#5a74d0", "#141a30", 0.45], key: [1.5, "#9fb6ff", [2.5, 4.5, -6]], sky: "#1c2c6a", candles: 0.8, rays: { color: "#9fb8ff", strength: 0.05 } },
  corner: { bg: "#03100f", fog: [3, 11], ambient: [0.35, "#5ad0c8"], hemi: ["#3a9a98", "#061414", 0.35], key: [0.7, "#7fe0d8", [2.5, 4.5, -6]], sky: "#16404a", candles: 0.35 },
  dawn: { bg: "#3a2208", fog: [8, 20], ambient: [1.25, "#ffe0b0"], hemi: ["#ffd8a0", "#5a3a20", 0.55], key: [2.8, "#ffc878", [3.5, 3.2, -6]], sky: "#ffd890", candles: 0, rays: { color: "#ffe2a6", strength: 0.045 } },
  day: { bg: "#d8e8f0", fog: [10, 24], ambient: [1.8, "#ffffff"], hemi: ["#ffffff", "#8a8070", 0.6], key: [2.4, "#fffaf0", [3, 5, -4]], sky: "#bfe6ff", candles: 0 },
};
export const throneBg = (mode: ThroneMode) => THRONE[mode].bg;

// Fixed places in the room.
export const DAIS = { x: 0, z: -2.3, top: 0.24 }; // the throne seat front is at z ≈ -2.05
export const WINDOWS: [number, number][] = [[-2.2, 2.6], [2.2, 2.6]]; // x, centre y on the back wall
export const DOOR = { x: -3.4, z: -3 };
export const CANDLES: Vec3[] = [[-1.35, 0, -1.55], [1.35, 0, -1.55], [-3.3, 0, 2.7], [3.3, 0, 2.7]];
export const CANDLE_TOP = 1.42; // flame height of a candlestick
export const STAND: Vec3 = [1.95, 0, -1.9]; // the jewel stand
export const BENCH = { x: 3.95, z0: -2.2, z1: 2.4, h: 0.4 };
export const TILE = 0.5; // floor tile size

export const flicker = (t: number, seed: number) =>
  0.82 + 0.1 * Math.sin(t * 0.9 + seed) + 0.05 * Math.sin(t * 2.3 + seed * 1.7) + 0.03 * Math.sin(t * 5.1 + seed * 0.3);

// How the puppets are lit: the nearest candles as flickering warm points, the windows as a cold (moon) or golden
// (sun) side light. Pass the candles that stand near the shot's puppets.
export const throneLight = (mode: ThroneMode, frame: number, near: Vec3[] = []): PuppetLight => {
  const m = THRONE[mode];
  const dir = new THREE.Vector3(...m.key[2]).normalize().toArray() as Vec3;
  return {
    tint: m.ambient[1],
    tintAmount: mode === "night" || mode === "corner" ? 0.14 : undefined,
    shadow: mode === "dawn" || mode === "day" ? 0.15 : 0.28,
    points: m.candles > 0 ? near.slice(0, 2).map((c, i) => ({ position: [c[0], CANDLE_TOP + 0.1, c[2]] as Vec3, color: "#ffa850", strength: 2.6 * m.candles * flicker(frame * 0.5, i + c[0]), range: 2.4 })) : [],
    distant: [{ direction: dir, color: m.key[1], strength: mode === "dawn" ? 1.4 : mode === "day" ? 0.8 : 0.6 }],
  };
};

// ---------- surfaces ----------

// One Iznik-style tile: a cobalt ogival medallion with a turquoise heart on white, quarter medallions in the corners.
const tileCanvas = (dark: boolean) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = dark ? "#cfd8d2" : "#eef3ee";
    ctx.fillRect(0, 0, 256, 256);
    const ogee = (cx: number, cy: number, w: number, h: number, fill: string) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - h);
      ctx.bezierCurveTo(cx + w * 0.2, cy - h * 0.55, cx + w, cy - h * 0.35, cx + w, cy);
      ctx.bezierCurveTo(cx + w, cy + h * 0.35, cx + w * 0.2, cy + h * 0.55, cx, cy + h);
      ctx.bezierCurveTo(cx - w * 0.2, cy + h * 0.55, cx - w, cy + h * 0.35, cx - w, cy);
      ctx.bezierCurveTo(cx - w, cy - h * 0.35, cx - w * 0.2, cy - h * 0.55, cx, cy - h);
      ctx.fillStyle = fill;
      ctx.fill();
    };
    ogee(128, 128, 70, 104, "#1f3f9a");
    ogee(128, 128, 46, 72, "#2aa59a");
    ogee(128, 128, 18, 30, "#c8302e");
    for (const [x, y] of [[0, 0], [256, 0], [0, 256], [256, 256]]) ogee(x, y, 44, 60, "#2aa59a");
    ctx.strokeStyle = "#9fb0aa";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 256, 256);
  });

// Two-by-two checker of big stone tiles with grout and a faint mottle.
const floorCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? "#8a8070" : "#cfc6b2";
        ctx.fillRect(i * 256, j * 256, 256, 256);
      }
    for (let k = 0; k < 220; k++) {
      ctx.fillStyle = `rgba(${rand(k) > 0.5 ? "255,255,255" : "0,0,0"},0.05)`;
      ctx.beginPath();
      ctx.arc(rand(k + 3) * 512, rand(k + 7) * 512, 6 + rand(k + 11) * 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#4a443a";
    ctx.lineWidth = 6;
    for (const v of [0, 256, 512]) {
      ctx.beginPath();
      ctx.moveTo(v, 0);
      ctx.lineTo(v, 512);
      ctx.moveTo(0, v);
      ctx.lineTo(512, v);
      ctx.stroke();
    }
  });

const repeat = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
};

const DADO = 1.8;
const WALL_H = 4.6;

// A wall of tile dado, a cobalt border and cream plaster, facing +z, centred at x = 0 (rotate/position the group).
const Wall: React.FC<{ width: number; tex: THREE.Texture }> = ({ width, tex }) => (
  <group>
    <InkBox size={[width, WALL_H, 0.12]} position={[0, WALL_H / 2, -0.06]} color="#e6dcc4" ink={0} />
    <mesh position={[0, DADO / 2, 0.005]} receiveShadow>
      <planeGeometry args={[width, DADO]} />
      <meshToonMaterial map={tex} gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[width, 0.12, 0.05]} position={[0, DADO + 0.06, 0.02]} color="#1f3f9a" ink={0.006} />
    <InkBox size={[width, 0.05, 0.04]} position={[0, DADO + 0.15, 0.02]} color="#e0b040" ink={0.004} />
    <InkBox size={[width, 0.14, 0.06]} position={[0, 0.07, 0.03]} color="#5a5248" ink={0.006} />
  </group>
);

// ---------- props ----------

// Tall brass candlestick with a fat candle; `lit` 0..1 (0 = out, a thin wisp of smoke instead of the flame).
export const Candlestick: React.FC<{ position: Vec3; frame: number; lit?: number; seed?: number; height?: number }> = ({ position, frame, lit = 1, seed = 0, height = CANDLE_TOP }) => {
  const k = flicker(frame * 0.6, seed);
  const sway = Math.sin(frame * 0.31 + seed) * 0.08;
  return (
    <group position={position}>
      <InkCylinder radius={0.16} height={0.05} position={[0, 0.025, 0]} color="#b88a2a" ink={0.008} />
      <InkCylinder radius={0.025} height={height - 0.3} position={[0, (height - 0.3) / 2, 0]} color="#d8a838" ink={0.006} />
      <InkCylinder radius={0.08} height={0.03} position={[0, height - 0.3, 0]} color="#d8a838" ink={0.006} />
      <InkCylinder radius={0.045} height={0.22} position={[0, height - 0.18, 0]} color="#f2ead2" ink={0.006} />
      {lit > 0 && (
        <group userData={{ ghost: true }}>
          <mesh position={[0, height - 0.02 + 0.04 * k, 0]} rotation={[0, 0, sway]} scale={[0.028, 0.07 * k, 0.028]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#ffe6a0" toneMapped={false} />
          </mesh>
          <mesh position={[0, height - 0.03 + 0.03 * k, 0.01]} scale={[0.014, 0.035 * k, 0.014]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          <Halo position={[0, height + 0.02, 0.02]} size={0.9 * lit} color="#ffb060" strength={0.5 * lit * k} />
          <pointLight position={[0, height + 0.1, 0.1]} intensity={4.5 * lit * k} distance={4} color="#ffa850" />
        </group>
      )}
    </group>
  );
};

// The canopied throne on its two-step dais.
const Throne: React.FC = () => (
  <group position={[DAIS.x, 0, DAIS.z]}>
    <InkBox size={[2.6, 0.12, 1.4]} position={[0, 0.06, 0]} color="#8a7a66" ink={0.01} />
    <InkBox size={[1.9, 0.12, 1.05]} position={[0, 0.18, -0.1]} color="#a89a84" ink={0.01} />
    {/* seat, back, arms */}
    <InkBox size={[0.8, 0.22, 0.6]} position={[0, 0.35, -0.1]} color="#c8962a" ink={0.012} />
    <InkBox size={[0.72, 0.08, 0.52]} position={[0, 0.5, -0.08]} color="#9a1f24" ink={0.008} />
    <InkBox size={[0.84, 1.2, 0.12]} position={[0, 0.95, -0.42]} color="#c8962a" ink={0.012} />
    <InkBox size={[0.6, 0.9, 0.04]} position={[0, 0.98, -0.35]} color="#9a1f24" ink={0.006} />
    {[-0.42, 0.42].map((x) => (
      <InkBox key={x} size={[0.1, 0.3, 0.6]} position={[x, 0.6, -0.1]} color="#c8962a" ink={0.01} />
    ))}
    <mesh position={[0, 1.62, -0.42]}>
      <sphereGeometry args={[0.1, 16, 12]} />
      <meshToonMaterial color="#e8b84a" gradientMap={toonRamp} />
    </mesh>
    {/* canopy on four gilded posts */}
    {[[-0.85, -0.6], [0.85, -0.6], [-0.85, 0.42], [0.85, 0.42]].map(([x, z]) => (
      <InkCylinder key={`${x}${z}`} radius={0.04} height={2.5} position={[x, 0.24 + 1.25, z]} color="#d8a838" ink={0.008} />
    ))}
    <InkBox size={[1.9, 0.18, 1.2]} position={[0, 2.82, -0.09]} color="#9a1f24" ink={0.012} />
    <InkBox size={[1.94, 0.06, 1.24]} position={[0, 2.72, -0.09]} color="#e0b040" ink={0.006} />
    <mesh position={[0, 2.9, -0.09]} scale={[0.95, 0.55, 0.62]}>
      <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color="#b02a2a" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.03} height={0.3} position={[0, 3.5, -0.09]} color="#e0b040" ink={0.006} />
    {/* fringe of the canopy */}
    {Array.from({ length: 13 }, (_, i) => (
      <InkBox key={i} size={[0.1, 0.14, 0.02]} position={[-0.9 + i * 0.15, 2.63, 0.52]} color="#e0b040" ink={0.004} />
    ))}
  </group>
);

// Tall arched window with an iron grille; the panes show the sky of the mode.
const ArchWindow: React.FC<{ x: number; y: number; sky: string; glow: number }> = ({ x, y, sky, glow }) => (
  <group position={[x, y, -2.98]}>
    <InkBox size={[1.12, 1.62, 0.08]} position={[0, -0.06, 0]} color="#d8ccb0" ink={0.01} />
    <mesh position={[0, 0.74, 0]} scale={[0.56, 0.5, 1]}>
      <circleGeometry args={[1, 32, 0, Math.PI]} />
      <meshToonMaterial color="#d8ccb0" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, -0.06, 0.045]}>
      <planeGeometry args={[0.9, 1.5]} />
      <meshBasicMaterial color={sky} toneMapped={false} />
    </mesh>
    <mesh position={[0, 0.69, 0.045]} scale={[0.45, 0.42, 1]}>
      <circleGeometry args={[1, 32, 0, Math.PI]} />
      <meshBasicMaterial color={sky} toneMapped={false} />
    </mesh>
    {[-0.3, -0.1, 0.1, 0.3].map((gx) => (
      <InkBox key={gx} size={[0.025, 1.9, 0.025]} position={[gx, 0.05, 0.07]} color="#2a2420" ink={0} />
    ))}
    {[-0.6, -0.2, 0.2, 0.6].map((gy) => (
      <InkBox key={gy} size={[0.92, 0.025, 0.025]} position={[0, gy, 0.07]} color="#2a2420" ink={0} />
    ))}
    {glow > 0 && <Halo position={[0, 0.1, 0.1]} size={2.4} color={sky} strength={glow} />}
  </group>
);

// Heavy double door in a tiled arch; `bolt` 0..1 slides the iron bar home across both leaves.
export const PalaceDoor: React.FC<{ bolt?: number }> = ({ bolt = 1 }) => (
  <group position={[DOOR.x, 0, DOOR.z + 0.02]}>
    <InkBox size={[1.7, 2.7, 0.1]} position={[0, 1.35, 0]} color="#1f3f9a" ink={0.012} />
    {[-0.36, 0.36].map((x) => (
      <group key={x}>
        <InkBox size={[0.7, 2.45, 0.08]} position={[x, 1.24, 0.08]} color="#5a3420" ink={0.012} />
        {[0.5, 1.2, 1.9].map((y) => (
          <InkBox key={y} size={[0.7, 0.06, 0.02]} position={[x, y, 0.13]} color="#2a2420" ink={0} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[x - 0.24 + (i % 3) * 0.24, 0.35 + Math.floor(i / 3) * 0.6, 0.135]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshToonMaterial color="#3a3430" gradientMap={toonRamp} />
          </mesh>
        ))}
      </group>
    ))}
    {/* the bolt: two brackets on the door, the bar slides from the left one into the right */}
    {[-0.5, 0.25].map((x) => (
      <InkBox key={x} size={[0.1, 0.16, 0.07]} position={[x, 1.2, 0.16]} color="#2a2826" ink={0.006} />
    ))}
    <InkBox size={[0.9, 0.08, 0.05]} position={[-0.72 + bolt * 0.5, 1.2, 0.2]} color="#4a4844" ink={0.008} />
    <InkCylinder radius={0.035} height={0.12} position={[-0.72 + bolt * 0.5, 1.29, 0.2]} color="#4a4844" ink={0.006} />
  </group>
);

// The Queen's jewel stand: a gilded column, a purple velvet cushion, the necklace on it or not.
export const JewelStand: React.FC<{ position?: Vec3; necklace?: boolean; frame?: number }> = ({ position = STAND, necklace = false, frame = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.2} height={0.08} position={[0, 0.04, 0]} color="#c8962a" ink={0.008} />
    <InkCylinder radius={0.07} height={0.85} position={[0, 0.48, 0]} color="#e0b040" ink={0.008} />
    <InkBox size={[0.42, 0.05, 0.42]} position={[0, 0.92, 0]} color="#c8962a" ink={0.008} />
    <mesh position={[0, 0.99, 0]} scale={[0.2, 0.07, 0.2]}>
      <sphereGeometry args={[1, 24, 12]} />
      <meshToonMaterial color="#5a2a8a" gradientMap={toonRamp} />
    </mesh>
    {/* the dent where the necklace lay */}
    <mesh position={[0, 1.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.07, 0.1, 32]} />
      <meshBasicMaterial color="#3a1a5a" transparent opacity={necklace ? 0 : 0.7} />
    </mesh>
    {necklace && <Necklace position={[0, 1.06, 0]} frame={frame} />}
  </group>
);

// A gold chain of beads with a big red jewel. Lies flat (`hang` 0) or hangs from its top (`hang` 1).
export const Necklace: React.FC<{ position: Vec3; rotation?: Vec3; frame?: number; hang?: number; scale?: number }> = ({ position, rotation = [0, 0, 0], frame = 0, hang = 0, scale = 1 }) => {
  const n = 18;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const flat: Vec3 = [Math.sin(a) * 0.09, 0.012, Math.cos(a) * 0.085];
        const hung: Vec3 = [Math.sin(a) * 0.07, -0.11 + Math.cos(a) * 0.11, 0];
        const p = flat.map((v, k) => v + (hung[k] - v) * hang) as Vec3;
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.014, 10, 8]} />
            <meshToonMaterial color="#f2c230" gradientMap={toonRamp} emissive="#3a2a00" />
          </mesh>
        );
      })}
      <group position={[0, 0.02 - 0.24 * hang, 0.09 * (1 - hang)]}>
        <mesh scale={[0.034, 0.042, 0.02]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshToonMaterial color="#d81030" gradientMap={toonRamp} emissive="#400010" />
        </mesh>
        <Halo position={[0, 0, 0.03]} size={0.18} color="#ff6070" strength={0.25 + 0.1 * Math.sin(frame * 0.3)} />
      </group>
    </group>
  );
};

// A hanging red banner with a gold crown emblem.
const Banner: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 3.0, -2.93]}>
    <InkCylinder radius={0.025} height={0.9} position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} color="#e0b040" ink={0.006} />
    <InkBox size={[0.7, 1.6, 0.02]} position={[0, 0.02, 0]} color="#9a1f24" ink={0.008} />
    <mesh position={[0, -0.85, 0.0]} rotation={[0, 0, Math.PI / 4]}>
      <planeGeometry args={[0.495, 0.495]} />
      <meshToonMaterial color="#9a1f24" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.2, 0.015]}>
      <circleGeometry args={[0.18, 5]} />
      <meshBasicMaterial color="#e0b040" />
    </mesh>
  </group>
);

const Bench: React.FC = () => (
  <group position={[BENCH.x, 0, (BENCH.z0 + BENCH.z1) / 2]}>
    <InkBox size={[0.5, BENCH.h, BENCH.z1 - BENCH.z0]} position={[0, BENCH.h / 2, 0]} color="#a89a84" ink={0.01} />
  </group>
);

// ---------- the set ----------

export const ThroneRoomSet: React.FC<{ camera: CameraShot; frame: number; mode: ThroneMode; bolt?: number; necklace?: boolean; candles?: number[]; rays?: boolean; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode,
  bolt = 1,
  necklace = false,
  candles,
  rays = true,
  children,
}) => {
  const m = THRONE[mode];
  const floorTex = useOwned(() => repeat(floorCanvas(), 20 / (TILE * 2), 20 / (TILE * 2)));
  const backTex = useOwned(() => repeat(tileCanvas(false), 9 / 0.3, DADO / 0.3));
  const sideTex = useOwned(() => repeat(tileCanvas(false), 7 / 0.3, DADO / 0.3));
  const lit = (i: number) => (candles ? candles[i] ?? 0 : m.candles);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={[m.bg, m.fog[0], m.fog[1]]} />
      <ambientLight intensity={m.ambient[0]} color={m.ambient[1]} />
      <hemisphereLight args={[m.hemi[0], m.hemi[1], m.hemi[2]]} />
      <directionalLight
        position={m.key[2]}
        intensity={m.key[0]}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={floorTex} />
      </mesh>
      {/* red carpet runner from the dais toward the doors of the hall */}
      <InkBox size={[1.1, 0.012, 5.2]} position={[0, 0.006, 0.6]} color="#9a1f24" ink={0} />
      <InkBox size={[1.16, 0.01, 5.2]} position={[0, 0.004, 0.6]} color="#e0b040" ink={0} />
      <group position={[0, 0, -3]}>
        <Wall width={9} tex={backTex} />
      </group>
      <group position={[-4.5, 0, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <Wall width={7} tex={sideTex} />
      </group>
      <group position={[4.5, 0, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
        <Wall width={7} tex={sideTex} />
      </group>
      {WINDOWS.map(([x, y]) => (
        <ArchWindow key={x} x={x} y={y} sky={m.sky} glow={mode === "dawn" ? 0.3 : mode === "night" ? 0.18 : 0.08} />
      ))}
      {m.rays && rays && (
        <group userData={{ ghost: true }}>
          {WINDOWS.map(([x, y], i) => (
            <GodRays key={x} center={[x, y - 0.06, -2.93]} size={[0.9, 1.5]} panes={[4, 4]} bar={0.03} sun={mode === "dawn" ? [-0.75, -0.42, 1] : [-0.5, -0.6, 1]} color={m.rays!.color} strength={m.rays!.strength} frame={frame} seed={i + 1} motes={mode === "dawn" ? 40 : 20} />
          ))}
        </group>
      )}
      <Banner x={-1.0} />
      <Banner x={1.0} />
      <Banner x={-3.0} />
      <Banner x={3.2} />
      <Throne />
      <PalaceDoor bolt={bolt} />
      <JewelStand necklace={necklace} frame={frame} />
      <Bench />
      {CANDLES.map((c, i) => (
        <Candlestick key={i} position={c} frame={frame} lit={lit(i)} seed={i * 2.3} />
      ))}
      {children}
    </>
  );
};

export const INK_COLOR = INK;
