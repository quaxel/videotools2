import React, { useMemo } from "react";
import * as THREE from "three";
import {
  CameraRig,
  CameraShot,
  canvasTexture,
  GodRays,
  Halo,
  Hills,
  InkBox,
  InkCylinder,
  Label,
  PuppetLight,
  SkyDome,
  toonRamp,
} from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { Candlestick, flicker } from "../../three/ThroneRoomSet";

// Sets for "Why 'You Deserve It' Picks the Wrong Box" (guide/references/casket-hall.md): a medieval stone hall with
// the three caskets (one room, nine lighting moods), the tournament lists, and a modern gift aisle; plus the props
// (caskets and their insides, the I DESERVE IT gauge, the VICTORY pump and its balloon, the trophy).

type Vec3 = [number, number, number];
const INK = "#161212";
const SERIF = "Georgia, 'Times New Roman', serif";

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const repeat = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
};

// ---------- the hall ----------

export type HallMode = "warm" | "dusk" | "day" | "ember" | "sick" | "dust" | "truth" | "dream" | "jewel";

type HallLook = {
  bg: string;
  fog: [number, number];
  ambient: [number, string];
  hemi: [string, string, number];
  key: [number, string, Vec3];
  sky: string;
  candles: number;
  rays?: { color: string; strength: number };
  wall: string; // multiplies the stone texture
  hang: string; // the wall hanging
};

export const HALL: Record<HallMode, HallLook> = {
  warm: { bg: "#2a1408", fog: [7, 18], ambient: [1.0, "#ffd2a0"], hemi: ["#ffbf88", "#3a1e10", 0.55], key: [1.2, "#ffc080", [-3, 5, 4]], sky: "#ffd9a0", candles: 1, rays: { color: "#ffd9a0", strength: 0.05 }, wall: "#ffe6c8", hang: "#9a1f24" },
  dusk: { bg: "#120c26", fog: [5, 15], ambient: [0.6, "#9a8ae0"], hemi: ["#7a6ad0", "#1a1430", 0.45], key: [1.3, "#a8a0ff", [3, 4.5, -6]], sky: "#4a3a9a", candles: 0.9, rays: { color: "#b0a8ff", strength: 0.06 }, wall: "#b8b0e8", hang: "#5a2a6a" },
  day: { bg: "#8ab4c4", fog: [8, 22], ambient: [1.0, "#e0f2ff"], hemi: ["#d8ecff", "#4a5a60", 0.5], key: [1.7, "#eaf6ff", [3, 5, -5]], sky: "#c8ecff", candles: 0, wall: "#b8d0d8", hang: "#2a5a7a" },
  ember: { bg: "#2a0606", fog: [5, 14], ambient: [0.8, "#ff8a70"], hemi: ["#ff6a50", "#2a0a08", 0.5], key: [1.3, "#ff6a48", [-3, 4, 4]], sky: "#ff8a5a", candles: 1, wall: "#ffb8a8", hang: "#b0141a" },
  sick: { bg: "#0c1a0a", fog: [4, 13], ambient: [0.75, "#b8e890"], hemi: ["#9ad870", "#10200a", 0.45], key: [1.0, "#c8f0a0", [2.5, 4.5, -5]], sky: "#7aa850", candles: 0.4, wall: "#c8e0a8", hang: "#3a5a2a" },
  dust: { bg: "#2a1a0a", fog: [5, 14], ambient: [0.85, "#e0b080"], hemi: ["#d8a068", "#2a1a0e", 0.5], key: [1.1, "#e8a868", [-3, 4.5, 3]], sky: "#c88a50", candles: 0.8, wall: "#e8c8a0", hang: "#6a3a1a" },
  truth: { bg: "#06101e", fog: [5, 15], ambient: [0.7, "#7fb0ff"], hemi: ["#5a90e0", "#0a1428", 0.5], key: [1.4, "#9fc6ff", [3, 5, 2]], sky: "#2a5aa8", candles: 0, rays: { color: "#9fc8ff", strength: 0.05 }, wall: "#a8c4f0", hang: "#1a3a7a" },
  dream: { bg: "#1e0a26", fog: [5, 15], ambient: [0.8, "#e090ff"], hemi: ["#c070f0", "#1a0a24", 0.5], key: [1.3, "#f0a0ff", [-3, 5, 3]], sky: "#a050d0", candles: 0.5, wall: "#e0b8f0", hang: "#7a1a8a" },
  jewel: { bg: "#2a0a1a", fog: [6, 16], ambient: [1.0, "#ffb0d0"], hemi: ["#ff98c8", "#2a0a18", 0.5], key: [1.6, "#ffc0e0", [3, 5, -4]], sky: "#ffb0d8", candles: 0.8, rays: { color: "#ffc8e8", strength: 0.06 }, wall: "#ffd0e0", hang: "#a01a5a" },
};
export const hallBg = (mode: HallMode) => HALL[mode].bg;

// Fixed places in the hall. The caskets stand on a low trestle table along x; the knight sits on a stool at its left
// end (facing +x), the emperor stands behind it, the woman waits in the right back corner.
export const TABLE = { x: 0, z: -0.4, top: 0.42, w: 2.1, d: 0.72 };
export const CASKET_X = { gold: -0.66, silver: 0.02, lead: 0.7 };
export const CASKET = { w: 0.46, d: 0.32, h: 0.25, lid: 0.12 };
export const KNIGHT_AT: [number, number] = [-1.28, -0.32];
export const EMPEROR_AT: [number, number] = [0.05, -1.35];
export const WOMAN_AT: [number, number] = [2.55, -2.1];
export const GAUGE_AT: Vec3 = [-1.72, 0, -1.05];
export const HALL_CANDLES: Vec3[] = [[-2.55, 0, -1.6], [1.75, 0, -1.55], [3.35, 0, -2.4], [-3.4, 0, 1.0]];
const BACK_Z = -3.2;
const SIDE_X = 4.2;
const WALL_H = 5.2;
const WINDOWS: [number, number][] = [[-2.45, 2.9], [2.45, 2.9]];

export const hallLight = (mode: HallMode, frame: number, near: Vec3[] = []): PuppetLight => {
  const m = HALL[mode];
  const dir = new THREE.Vector3(...m.key[2]).normalize().toArray() as Vec3;
  return {
    tint: m.ambient[1],
    tintAmount: mode === "warm" || mode === "day" ? undefined : 0.12,
    shadow: mode === "day" ? 0.14 : 0.24,
    points: m.candles > 0 ? near.slice(0, 2).map((c, i) => ({ position: [c[0], 1.52, c[2]] as Vec3, color: "#ffa850", strength: 2.4 * m.candles * flicker(frame * 0.5, i + c[0]), range: 2.6 })) : [],
    distant: [{ direction: dir, color: m.key[1], strength: mode === "day" ? 0.9 : 0.6 }],
  };
};

// Ashlar: courses of cream-grey blocks with dark mortar, chipped corners, soot streaks and a darker foot.
const ashlarCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#5e5446";
    ctx.fillRect(0, 0, 1024, 1024);
    const rows = 8;
    const h = 1024 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -((r * 97) % 140);
      let k = 0;
      while (x < 1024) {
        const w = 150 + rand(r * 31 + k) * 120;
        const tone = 0.86 + rand(r * 13 + k * 7) * 0.16;
        const base = [206, 194, 170].map((v) => Math.round(v * tone));
        ctx.fillStyle = `rgb(${base.join(",")})`;
        const rr = 10;
        ctx.beginPath();
        ctx.roundRect(x + 5, r * h + 5, w - 10, h - 10, rr);
        ctx.fill();
        // painted shading: lighter top edge, darker bottom edge
        ctx.fillStyle = "rgba(255,248,230,0.25)";
        ctx.fillRect(x + 10, r * h + 7, w - 20, 7);
        ctx.fillStyle = "rgba(60,40,20,0.18)";
        ctx.fillRect(x + 8, r * h + h - 18, w - 16, 10);
        // chips and pits
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = "rgba(70,55,40,0.22)";
          ctx.beginPath();
          ctx.arc(x + 12 + rand(r * 5 + k * 3 + c) * (w - 24), r * h + 14 + rand(r * 7 + k + c * 11) * (h - 28), 2 + rand(c + k) * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        x += w;
        k++;
      }
    }
    // soot streaks rising and a damp foot
    for (let s = 0; s < 5; s++) {
      const sx = rand(s * 17) * 1024;
      const g = ctx.createLinearGradient(0, 1024, 0, 300);
      g.addColorStop(0, "rgba(30,20,10,0.0)");
      g.addColorStop(0.5, "rgba(30,20,10,0.12)");
      g.addColorStop(1, "rgba(30,20,10,0)");
      ctx.fillStyle = g;
      ctx.fillRect(sx - 40, 300, 80, 724);
    }
    const foot = ctx.createLinearGradient(0, 1024, 0, 820);
    foot.addColorStop(0, "rgba(40,30,20,0.35)");
    foot.addColorStop(1, "rgba(40,30,20,0)");
    ctx.fillStyle = foot;
    ctx.fillRect(0, 820, 1024, 204);
  });

// Flagstones: irregular slabs with worn centres and straw rushes scattered on top.
const flagCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#3e382e";
    ctx.fillRect(0, 0, 1024, 1024);
    const n = 5;
    const s = 1024 / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const tone = 0.82 + rand(i * 9 + j * 5) * 0.2;
        ctx.fillStyle = `rgb(${[150, 140, 122].map((v) => Math.round(v * tone)).join(",")})`;
        const jx = (rand(i + j * 3) - 0.5) * 18;
        const jy = (rand(i * 2 + j) - 0.5) * 18;
        ctx.beginPath();
        ctx.roundRect(i * s + 6 + jx * 0.3, j * s + 6 + jy * 0.3, s - 12, s - 12, 18);
        ctx.fill();
        const g = ctx.createRadialGradient(i * s + s / 2, j * s + s / 2, 5, i * s + s / 2, j * s + s / 2, s * 0.6);
        g.addColorStop(0, "rgba(255,245,220,0.14)");
        g.addColorStop(1, "rgba(0,0,0,0.12)");
        ctx.fillStyle = g;
        ctx.fillRect(i * s, j * s, s, s);
      }
    ctx.strokeStyle = "rgba(214,184,96,0.55)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 90; k++) {
      const x = rand(k * 3) * 1024;
      const y = rand(k * 5 + 1) * 1024;
      const a = rand(k * 7) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34);
      ctx.stroke();
    }
  });

// The long wall hanging: a woven field with a gold border and a lozenge diaper (no heraldry).
const hangingCanvas = () =>
  canvasTexture(512, 1024, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 1024);
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 6;
    for (let y = -512; y < 1024; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + 512);
      ctx.moveTo(512, y);
      ctx.lineTo(0, y + 512);
      ctx.stroke();
    }
    ctx.fillStyle = "#e0b040";
    for (let y = 48; y < 1024; y += 96)
      for (let x = 0; x <= 512; x += 96) {
        ctx.beginPath();
        ctx.arc(x + ((y / 96) % 2 ? 48 : 0), y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.lineWidth = 34;
    ctx.strokeStyle = "#e0b040";
    ctx.strokeRect(17, 17, 478, 990);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#5a3a10";
    ctx.strokeRect(40, 40, 432, 944);
  });

// A pointed lancet window opening: a shape with a two-centred arch.
const lancetShape = (w: number, h: number) => {
  const s = new THREE.Shape();
  const r = w * 0.85;
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, h);
  s.absarc(-w / 2 + r, h, r, Math.PI, Math.PI - Math.acos(1 - w / (2 * r)) + 0.0001, true);
  s.lineTo(0, h + Math.sqrt(r * r - (r - w / 2) * (r - w / 2)));
  s.absarc(w / 2 - r, h, r, Math.acos(1 - w / (2 * r)), 0, true);
  s.lineTo(w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
};

const Lancet: React.FC<{ x: number; y: number; sky: string; glow: number }> = ({ x, y, sky, glow }) => {
  const outer = useOwned(() => new THREE.ShapeGeometry(lancetShape(1.0, 1.5), 24));
  const inner = useOwned(() => new THREE.ShapeGeometry(lancetShape(0.72, 1.4), 24));
  return (
    <group position={[x, y - 1.0, BACK_Z + 0.02]}>
      <mesh geometry={outer} position={[0, -0.05, 0]}>
        <meshToonMaterial color="#8a7e68" gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={inner} position={[0, 0, 0.01]}>
        <meshBasicMaterial color={sky} toneMapped={false} />
      </mesh>
      {/* lead cames: a lozenge lattice */}
      {[-0.18, 0, 0.18].map((gx) => (
        <InkBox key={gx} size={[0.018, 1.9, 0.02]} position={[gx, 1.0, 0.03]} color="#2a2420" ink={0} />
      ))}
      {[0.35, 0.75, 1.15, 1.55].map((gy) => (
        <InkBox key={gy} size={[0.72, 0.018, 0.02]} position={[0, gy, 0.03]} color="#2a2420" ink={0} />
      ))}
      <InkBox size={[1.12, 0.12, 0.3]} position={[0, -0.06, 0.12]} color="#a89a80" ink={0.01} />
      {glow > 0 && <Halo position={[0, 1.0, 0.1]} size={2.6} color={sky} strength={glow} />}
    </group>
  );
};

// A torch in an iron bracket on a wall (facing +z from the wall plane at its origin).
const WallTorch: React.FC<{ position: Vec3; rotationY?: number; frame: number; lit: number; seed: number }> = ({ position, rotationY = 0, frame, lit, seed }) => {
  const k = flicker(frame * 0.7, seed);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[0.08, 0.2, 0.04]} position={[0, 0, 0.02]} color="#2a2622" ink={0.006} />
      <InkBox size={[0.03, 0.03, 0.22]} position={[0, 0, 0.13]} color="#2a2622" ink={0.004} />
      <InkCylinder radius={0.035} height={0.42} position={[0, 0.12, 0.24]} rotation={[0.25, 0, 0]} color="#5a3a22" ink={0.006} />
      {lit > 0 && (
        <group position={[0, 0.36, 0.3]} userData={{ ghost: true }}>
          <mesh scale={[0.06, 0.14 * k, 0.06]} position={[0, 0.06 * k, 0]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshBasicMaterial color="#ffb040" toneMapped={false} />
          </mesh>
          <mesh scale={[0.032, 0.08 * k, 0.032]} position={[0, 0.03, 0.02]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#fff2b0" toneMapped={false} />
          </mesh>
          <Halo position={[0, 0.06, 0.05]} size={1.4 * lit} color="#ff9a40" strength={0.55 * lit * k} />
          <pointLight intensity={3.5 * lit * k} distance={4.5} color="#ff9a48" />
        </group>
      )}
    </group>
  );
};

// The roof: tie beams with arched braces, lost in shadow above.
const Roof: React.FC = () => (
  <group>
    {[-2.4, 0, 2.4].map((z) => (
      <group key={z} position={[0, 0, z - 0.4]}>
        <InkBox size={[SIDE_X * 2, 0.26, 0.26]} position={[0, 4.4, 0]} color="#4a3020" ink={0.012} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (SIDE_X - 1.1), 4.4, 0]} rotation={[0, 0, s > 0 ? 0 : Math.PI / 2]}>
            <torusGeometry args={[1.1, 0.1, 8, 20, Math.PI / 2]} />
            <meshToonMaterial color="#3e2818" gradientMap={toonRamp} />
          </mesh>
        ))}
        <InkBox size={[0.2, 1.2, 0.2]} position={[0, 5.0, 0]} color="#3e2818" ink={0.01} />
      </group>
    ))}
  </group>
);

// Trestle table with a linen cloth hanging over the front edge.
const Trestle: React.FC = () => (
  <group position={[TABLE.x, 0, TABLE.z]}>
    <InkBox size={[TABLE.w, 0.06, TABLE.d]} position={[0, TABLE.top - 0.03, 0]} color="#6a4428" ink={0.012} />
    <InkBox size={[TABLE.w + 0.04, 0.012, TABLE.d + 0.04]} position={[0, TABLE.top + 0.004, 0]} color="#efe4c8" ink={0.006} />
    <InkBox size={[TABLE.w + 0.04, 0.16, 0.01]} position={[0, TABLE.top - 0.07, TABLE.d / 2 + 0.02]} color="#e8dcbc" ink={0.006} />
    {[-0.8, 0.8].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        <InkBox size={[0.07, TABLE.top - 0.06, 0.07]} position={[0, (TABLE.top - 0.06) / 2, 0.22]} rotation={[0.18, 0, 0]} color="#5a3820" ink={0.008} />
        <InkBox size={[0.07, TABLE.top - 0.06, 0.07]} position={[0, (TABLE.top - 0.06) / 2, -0.22]} rotation={[-0.18, 0, 0]} color="#5a3820" ink={0.008} />
      </group>
    ))}
  </group>
);

export const Stool: React.FC<{ position: Vec3; tip?: number }> = ({ position, tip = 0 }) => (
  <group position={position} rotation={[0, 0, tip]}>
    <InkCylinder radius={0.17} height={0.06} position={[0, 0.31, 0]} color="#7a4e2c" ink={0.008} />
    {[0, 2.1, 4.2].map((a) => (
      <InkCylinder key={a} radius={0.022} height={0.32} position={[Math.cos(a) * 0.1, 0.15, Math.sin(a) * 0.1]} rotation={[Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]} color="#5a3820" ink={0.006} />
    ))}
  </group>
);

export const HallSet: React.FC<{ camera: CameraShot; frame: number; mode: HallMode; table?: boolean; stool?: boolean; children?: React.ReactNode }> = ({ camera, frame, mode, table = true, stool = true, children }) => {
  const m = HALL[mode];
  const floor = useOwned(() => repeat(flagCanvas(), 4, 4));
  const backTex = useOwned(() => repeat(ashlarCanvas(), 3, 2));
  const sideTex = useOwned(() => repeat(ashlarCanvas(), 3, 2));
  const hang = useOwned(() => hangingCanvas());
  const sway = Math.sin(frame * 0.035) * 0.015;
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshToonMaterial color={m.wall} gradientMap={toonRamp} map={floor} />
      </mesh>
      {/* walls */}
      <mesh position={[0, WALL_H / 2, BACK_Z]} receiveShadow>
        <planeGeometry args={[SIDE_X * 2, WALL_H]} />
        <meshToonMaterial color={m.wall} gradientMap={toonRamp} map={backTex} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * SIDE_X, WALL_H / 2, 0.8]} rotation={[0, -s * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[8, WALL_H]} />
          <meshToonMaterial color={m.wall} gradientMap={toonRamp} map={sideTex} />
        </mesh>
      ))}
      {/* a stone plinth along the walls */}
      <InkBox size={[SIDE_X * 2, 0.16, 0.14]} position={[0, 0.08, BACK_Z + 0.07]} color="#7a6e5a" ink={0.008} />
      <Roof />
      {WINDOWS.map(([x, y]) => (
        <Lancet key={x} x={x} y={y} sky={m.sky} glow={mode === "day" ? 0.25 : 0.14} />
      ))}
      {m.rays && (
        <group userData={{ ghost: true }}>
          {WINDOWS.map(([x, y], i) => (
            <GodRays key={x} center={[x, y - 0.25, BACK_Z + 0.05]} size={[0.72, 1.6]} panes={[3, 3]} bar={0.02} sun={[x < 0 ? 0.55 : -0.55, -0.6, 1]} color={m.rays!.color} strength={m.rays!.strength} frame={frame} seed={i + 2} motes={30} />
          ))}
        </group>
      )}
      {/* the wall hanging behind the emperor */}
      <group position={[0, 2.35, BACK_Z + 0.06]} rotation={[sway, 0, 0]}>
        <InkCylinder radius={0.03} height={1.9} position={[0, 1.55, 0.04]} rotation={[0, 0, Math.PI / 2]} color="#3a2a1a" ink={0.006} />
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[1.6, 3.0]} />
          <meshToonMaterial color={m.hang} gradientMap={toonRamp} map={hang} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* heavy oak door with iron straps, back left */}
      <group position={[-3.35, 0, BACK_Z + 0.04]}>
        <InkBox size={[1.2, 2.3, 0.08]} position={[0, 1.15, 0]} color="#5a3a22" ink={0.012} />
        {[0.5, 1.2, 1.9].map((y) => (
          <InkBox key={y} size={[1.0, 0.06, 0.03]} position={[0.05, y, 0.05]} color="#2a2622" ink={0.004} />
        ))}
        <mesh position={[0.4, 1.15, 0.07]}>
          <torusGeometry args={[0.07, 0.015, 8, 20]} />
          <meshToonMaterial color="#2a2622" gradientMap={toonRamp} />
        </mesh>
      </group>
      <WallTorch position={[-1.35, 2.2, BACK_Z]} frame={frame} lit={m.candles} seed={1} />
      <WallTorch position={[1.35, 2.2, BACK_Z]} frame={frame} lit={m.candles} seed={3} />
      <WallTorch position={[SIDE_X, 2.1, -1.2]} rotationY={-Math.PI / 2} frame={frame} lit={m.candles} seed={5} />
      <WallTorch position={[-SIDE_X, 2.1, -0.6]} rotationY={Math.PI / 2} frame={frame} lit={m.candles} seed={7} />
      {HALL_CANDLES.map((c, i) => (
        <Candlestick key={i} position={c} frame={frame} lit={m.candles} seed={i * 2.1} height={1.5} />
      ))}
      {table && <Trestle />}
      {stool && <Stool position={[KNIGHT_AT[0], 0, KNIGHT_AT[1] - 0.05]} />}
      {children}
    </>
  );
};

// ---------- caskets ----------

const plateCanvas = (lines: string[], bg: string, fg: string, big = false) =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 14;
    ctx.strokeRect(22, 22, 980, 468);
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const longest = Math.max(...lines.map((l) => l.length));
    let size = big ? 250 : Math.min(150, Math.floor(1500 / Math.max(5, longest)));
    ctx.font = `900 ${size}px ${SERIF}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > 900) size = Math.floor((size * 900) / widest);
    ctx.font = `900 ${size}px ${SERIF}`;
    const lh = Math.min(size * 1.15, 440 / lines.length);
    lines.forEach((l, i) => ctx.fillText(l, 512, 256 + (i - (lines.length - 1) / 2) * lh));
  });

// A flat engraved plate (2:1) facing +z.
export const Plate: React.FC<{ lines: string[]; position: Vec3; width: number; bg: string; fg: string; big?: boolean; rotation?: Vec3 }> = ({ lines, position, width, bg, fg, big, rotation = [0, 0, 0] }) => {
  const key = lines.join("|") + bg + fg + (big ? "b" : "");
  const tex = useOwned(() => plateCanvas(lines, bg, fg, big), [key]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, width / 2]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

export type CasketKind = "gold" | "silver" | "lead";
const METAL: Record<CasketKind, { body: string; trim: string; plate: string; ink: string; name: string; inscription: string[] }> = {
  gold: { body: "#e8b838", trim: "#b8801a", plate: "#fff0b8", ink: "#5a3a08", name: "GOLD", inscription: ["WHOSO CHOOSETH ME", "SHALL FIND THAT", "HE DESERVETH"] },
  silver: { body: "#c8ccd4", trim: "#8a909c", plate: "#f2f4f8", ink: "#2a3040", name: "SILVER", inscription: ["SHALL FIND THAT", "HIS NATURE DESIRETH"] },
  lead: { body: "#6a6e74", trim: "#4a4e54", plate: "#b8bcc0", ink: "#1a1c20", name: "LEAD", inscription: ["GOD HATH DISPOSED", "FOR HIM"] },
};

const lidGeo = () => {
  // a half-cylinder dome along x
  const g = new THREE.CylinderGeometry(1, 1, 1, 28, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  return g;
};

// One casket: body on the table at its origin (bottom centre), a domed lid hinged at the back (`open` 0..1 lifts it
// back ~110°), a name plate on the front, the inscription across the lid's front slope, gems on gold. `inside` is
// drawn inside the open box (its floor at y = 0.04). `shake` rattles it (0..1).
export const Casket: React.FC<{ kind: CasketKind; position: Vec3; open?: number; shake?: number; frame?: number; inside?: React.ReactNode; scale?: number; plate?: boolean }> = ({ kind, position, open = 0, shake = 0, frame = 0, inside, scale = 1, plate = true }) => {
  const c = METAL[kind];
  const { w, d, h, lid } = CASKET;
  const geo = useOwned(lidGeo);
  const r = Math.sin(frame * 1.7) * 0.04 * shake;
  const t = 0.022;
  return (
    <group position={position} scale={scale} rotation={[0, 0, r]}>
      {/* feet */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.03), 0.015, sz * (d / 2 - 0.03)]}>
          <sphereGeometry args={[0.028, 12, 8]} />
          <meshToonMaterial color={c.trim} gradientMap={toonRamp} />
        </mesh>
      ))}
      {/* body: four walls and a floor so it can be looked into */}
      <InkBox size={[w, 0.03, d]} position={[0, 0.045, 0]} color={c.trim} ink={0.008} />
      <InkBox size={[w, h, t]} position={[0, 0.03 + h / 2, d / 2 - t / 2]} color={c.body} ink={0.01} />
      <InkBox size={[w, h, t]} position={[0, 0.03 + h / 2, -d / 2 + t / 2]} color={c.body} ink={0.01} />
      <InkBox size={[t, h, d]} position={[-w / 2 + t / 2, 0.03 + h / 2, 0]} color={c.body} ink={0.01} />
      <InkBox size={[t, h, d]} position={[w / 2 - t / 2, 0.03 + h / 2, 0]} color={c.body} ink={0.01} />
      {/* trim bands */}
      <InkBox size={[w + 0.02, 0.03, d + 0.02]} position={[0, 0.045, 0]} color={c.trim} ink={0.006} />
      <InkBox size={[w + 0.02, 0.025, d + 0.02]} position={[0, 0.03 + h - 0.012, 0]} color={c.trim} ink={0.006} />
      {plate && <Plate lines={[c.name]} position={[0, 0.03 + h * 0.5, d / 2 + 0.003]} width={w * 0.62} bg={c.plate} fg={c.ink} big />}
      {kind === "gold" &&
        [-0.17, 0.17].map((x, i) => (
          <mesh key={x} position={[x, 0.03 + h * 0.5, d / 2 + 0.01]}>
            <octahedronGeometry args={[0.028, 0]} />
            <meshToonMaterial color={i ? "#d8203a" : "#2a8ad8"} gradientMap={toonRamp} emissive={i ? "#5a0010" : "#002a5a"} />
          </mesh>
        ))}
      <group position={[0, 0.03 + h, 0]}>{inside}</group>
      {/* lid hinged at the back edge */}
      <group position={[0, 0.03 + h, -d / 2]} rotation={[-open * 1.95, 0, 0]}>
        <group position={[0, 0, d / 2]}>
          <mesh geometry={geo} scale={[w + 0.016, lid, d / 2 + 0.008]}>
            <meshToonMaterial color={c.body} gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={geo} scale={[w + 0.032, lid + 0.012, d / 2 + 0.02]}>
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
          <InkBox size={[0.05, 0.03, 0.03]} position={[0, -0.005, d / 2 + 0.01]} color={c.trim} ink={0.004} />
          {kind === "gold" && <mesh position={[0, lid + 0.01, 0]}><sphereGeometry args={[0.035, 14, 10]} /><meshToonMaterial color="#d8203a" gradientMap={toonRamp} emissive="#4a0010" /></mesh>}
        </group>
      </group>
    </group>
  );
};

// The inscription as a standing carved board behind/above a casket (readable in a close shot): one line each.
export const Inscription: React.FC<{ kind: CasketKind; position: Vec3; width?: number; appear?: number[] }> = ({ kind, position, width = 0.62, appear }) => {
  const c = METAL[kind];
  const lines = c.inscription;
  const h = width / 4;
  return (
    <group position={position}>
      <InkBox size={[width + 0.06, h * lines.length + 0.06, 0.03]} position={[0, -((lines.length - 1) * h) / 2, -0.02]} color={c.trim} ink={0.008} />
      {lines.map((l, i) => {
        const a = appear ? appear[i] ?? 999 : 999;
        return <Label key={l} text={l} position={[0, -i * h, 0]} width={width} fg={c.ink} bg={c.plate} border={false} appear={a < 0 ? -1 : a} />;
      })}
    </group>
  );
};

// ---------- what is inside ----------

export const Skull: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; jaw?: number }> = ({ position, rotation = [0, 0, 0], scale = 1, jaw = 0 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh scale={[0.085, 0.09, 0.095]} castShadow>
      <sphereGeometry args={[1, 24, 18]} />
      <meshToonMaterial color="#efe6cc" gradientMap={toonRamp} emissive="#4a4436" />
    </mesh>
    <mesh scale={[0.092, 0.097, 0.102]}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.034, 0.005, 0.078]} scale={[0.026, 0.03, 0.012]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color="#1a1410" />
      </mesh>
    ))}
    <mesh position={[0, -0.03, 0.088]} scale={[0.01, 0.014, 0.006]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color="#1a1410" />
    </mesh>
    <group position={[0, -0.062, 0.02]} rotation={[jaw * 0.4, 0, 0]}>
      <InkBox size={[0.11, 0.035, 0.09]} position={[0, -0.015, 0.02]} color="#e6dcc0" ink={0.006} />
      {[-0.03, -0.01, 0.01, 0.03].map((x) => (
        <InkBox key={x} size={[0.014, 0.014, 0.01]} position={[x, 0.006, 0.066]} color="#fffaf0" ink={0.002} />
      ))}
    </group>
  </group>
);

export const Bone: React.FC<{ position: Vec3; rotation?: Vec3; length?: number }> = ({ position, rotation = [0, 0, 0], length = 0.2 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={0.014} height={length} rotation={[0, 0, Math.PI / 2]} color="#ece2c6" ink={0.005} />
    {[-1, 1].map((s) =>
      [-1, 1].map((t) => (
        <mesh key={`${s}${t}`} position={[(s * length) / 2, t * 0.014, 0]}>
          <sphereGeometry args={[0.022, 12, 8]} />
          <meshToonMaterial color="#ece2c6" gradientMap={toonRamp} />
        </mesh>
      )),
    )}
  </group>
);

// A pile of bones in the open casket (floor at y = 0 relative, the casket's top rim at CASKET.h below the group).
export const BonePile: React.FC<{ rise?: number }> = ({ rise = 0 }) => (
  <group position={[0, -0.12 + rise * 0.1, 0]}>
    <Bone position={[-0.06, 0.04, 0.03]} rotation={[0.2, 0.4, 0.1]} length={0.24} />
    <Bone position={[0.08, 0.06, -0.04]} rotation={[-0.1, -0.7, 0.2]} length={0.2} />
    <Bone position={[0.0, 0.09, 0.0]} rotation={[0.3, 1.2, -0.1]} length={0.22} />
    <Bone position={[-0.1, 0.1, -0.06]} rotation={[0, 0.2, 0.5]} length={0.16} />
  </group>
);

// Earth heaped in the silver casket, with `worms` wriggling out of it; `out` 0..1 brings one worm over the rim.
export const EarthAndWorms: React.FC<{ frame: number; rise?: number }> = ({ frame, rise = 1 }) => {
  const worms = [
    [-0.1, 0.05, 0.4],
    [0.08, -0.06, 1.6],
    [0.12, 0.07, 2.7],
    [-0.04, -0.08, 3.9],
  ];
  return (
    <group position={[0, -0.05 + rise * 0.04, 0]}>
      <mesh scale={[0.2, 0.06, 0.13]}>
        <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color="#5a3a22" gradientMap={toonRamp} />
      </mesh>
      {[[-0.08, 0.04], [0.06, -0.03], [0.1, 0.05], [-0.02, -0.06]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.035, z]} scale={0.022 + (i % 2) * 0.01}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshToonMaterial color="#4a2e1a" gradientMap={toonRamp} />
        </mesh>
      ))}
      {worms.map(([x, z, ph], i) => (
        <Worm key={i} position={[x, 0.03, z]} frame={frame + ph * 20} length={0.1 * rise} seed={i} />
      ))}
    </group>
  );
};

export const Worm: React.FC<{ position: Vec3; frame: number; length?: number; seed?: number; rotation?: Vec3 }> = ({ position, frame, length = 0.1, seed = 0, rotation = [0, 0, 0] }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      pts.push(new THREE.Vector3(Math.sin(u * 5 + frame * 0.25 + seed) * 0.018, u * length, Math.cos(u * 4 + frame * 0.2 + seed) * 0.012));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.011, 8, false);
  }, [frame, length, seed]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  if (length < 0.01) return null;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo}>
        <meshToonMaterial color="#e88a8a" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[Math.sin(5 + frame * 0.25 + seed) * 0.018, length, Math.cos(4 + frame * 0.2 + seed) * 0.012]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshToonMaterial color="#e88a8a" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// Fine gold and precious stones heaped in the lead casket, glowing as the lid opens (`glow` 0..1).
export const Treasure: React.FC<{ frame: number; glow: number }> = ({ frame, glow }) => {
  const gems: [number, number, number, string][] = [
    [-0.12, 0.05, 0.04, "#d8203a"],
    [0.1, 0.06, -0.03, "#2a9ad8"],
    [0.0, 0.08, 0.05, "#3ac860"],
    [-0.05, 0.07, -0.06, "#bfefff"],
    [0.14, 0.05, 0.07, "#a040d8"],
    [-0.15, 0.06, -0.05, "#ffd040"],
  ];
  return (
    <group position={[0, -0.03, 0]}>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[(rand(i) - 0.5) * 0.34, 0.03 + rand(i + 9) * 0.05, (rand(i + 4) - 0.5) * 0.2]} rotation={[rand(i + 2) * 3, 0, rand(i + 6) * 3]}>
          <cylinderGeometry args={[0.024, 0.024, 0.006, 16]} />
          <meshToonMaterial color="#f2c030" gradientMap={toonRamp} emissive="#5a3a00" />
        </mesh>
      ))}
      {gems.map(([x, y, z, col], i) => (
        <group key={i} position={[x, y + 0.02, z]} rotation={[0, frame * 0.03 + i, 0]}>
          <mesh scale={[1, 1.25, 1]}>
            <octahedronGeometry args={[0.034, 0]} />
            <meshToonMaterial color={col} gradientMap={toonRamp} emissive={col} emissiveIntensity={0.15 + glow * 0.3} />
          </mesh>
        </group>
      ))}
      {glow > 0 && (
        <group userData={{ ghost: true }}>
          <Halo position={[0, 0.16, 0.1]} size={0.7 * glow} color="#ffe6f2" strength={0.22 * glow * (0.85 + 0.15 * Math.sin(frame * 0.3))} />
          <pointLight position={[0, 0.3, 0.15]} intensity={1.0 * glow} distance={1.6} color="#ffd8f0" />
        </group>
      )}
    </group>
  );
};

// ---------- mechanism props ----------

const gaugeFace = (label: string, accent: string) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#fbf4e0";
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    // green → yellow → red arc
    const seg = (a0: number, a1: number, col: string) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.arc(256, 280, 175, a0, a1);
      ctx.stroke();
    };
    seg(Math.PI * 1.0, Math.PI * 1.4, "#5ab060");
    seg(Math.PI * 1.4, Math.PI * 1.65, "#f0c040");
    seg(Math.PI * 1.65, Math.PI * 2.0, accent);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 140, 280 + Math.sin(a) * 140);
      ctx.lineTo(256 + Math.cos(a) * 205, 280 + Math.sin(a) * 205);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = label.split("\n");
    let size = 64;
    ctx.font = `900 ${size}px Arial Black, Impact, sans-serif`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > 330) size = Math.floor((size * 330) / widest);
    ctx.font = `900 ${size}px Arial Black, Impact, sans-serif`;
    lines.forEach((l, i) => ctx.fillText(l, 256, 360 + i * size * 1.05));
    ctx.lineWidth = 16;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.arc(256, 256, 246, 0, Math.PI * 2);
    ctx.stroke();
  });

// A big brass gauge on a post: `value` 0..1 swings the needle from the green (left) to the red (right). `top` puts
// the face centre at that height; `post` false hangs it on a board instead.
export const Gauge: React.FC<{ position: Vec3; value: number; label: string; size?: number; top?: number; post?: boolean; accent?: string; rotationY?: number; glow?: number }> = ({ position, value, label, size = 0.44, top = 1.3, post = true, accent = "#d82a2a", rotationY = 0, glow = 0 }) => {
  const tex = useOwned(() => gaugeFace(label, accent), [label, accent]);
  const a = Math.PI / 2 - Math.max(-0.05, Math.min(1.08, value)) * Math.PI;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {post && (
        <>
          <InkCylinder radius={0.16} height={0.06} position={[0, 0.03, 0]} color="#6a4a2a" ink={0.008} />
          <InkCylinder radius={0.035} height={top - size / 2} position={[0, (top - size / 2) / 2, 0]} color="#b8862a" ink={0.006} />
        </>
      )}
      <group position={[0, top, 0]}>
        <InkCylinder radius={size / 2 + 0.03} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#c8962a" ink={0.01} />
        <mesh position={[0, 0, 0.032]}>
          <circleGeometry args={[size / 2, 40]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        {/* needle pivots a little below the centre (the arc's centre on the face) */}
        <group position={[0, -size * 0.047, 0.04]} rotation={[0, 0, a]}>
          <InkBox size={[0.016, size * 0.4, 0.008]} position={[0, size * 0.2, 0]} color="#1a1a1a" ink={0} />
          <mesh>
            <circleGeometry args={[0.022, 16]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
        {glow > 0 && <Halo position={[size * 0.3, size * 0.12, 0.06]} size={size * 1.4} color={accent} strength={0.5 * glow} />}
      </group>
    </group>
  );
};

// A brass hand pump with a T-handle: `press` 0..1 pushes the plunger down. Label on the barrel.
export const Pump: React.FC<{ position: Vec3; press: number; label?: string; scale?: number }> = ({ position, press, label = "VICTORY", scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.34, 0.03, 0.16]} position={[0, 0.015, 0]} color="#4a3a2a" ink={0.008} />
    <InkCylinder radius={0.06} height={0.62} position={[0, 0.34, 0]} color="#d8a838" ink={0.01} />
    <group position={[0, 0.69 - press * 0.3, 0]}>
      <InkCylinder radius={0.012} height={0.34} position={[0, 0.0, 0]} color="#8a8a8a" ink={0.005} />
      <InkCylinder radius={0.022} height={0.4} position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]} color="#7a3a22" ink={0.006} />
      <InkCylinder radius={0.008} height={0.16} position={[0, 0.26, 0]} color="#5a3a22" ink={0.003} />
      <Label text={label} position={[0, 0.38, 0.01]} width={0.3} />
    </group>
  </group>
);

// The balloon the pump fills: a sphere `r` metres round on a short neck, label on its face; `pop` 0..1 bursts it.
export const Balloon: React.FC<{ position: Vec3; r: number; label?: string; pop?: number; color?: string; squashX?: number }> = ({ position, r, label = "I DESERVE IT", pop = 0, color = "#e83a3a", squashX = 1 }) => {
  if (pop >= 1 || r < 0.02) return null;
  const s = 1 + pop * 0.35;
  return (
    <group position={position} scale={[s * squashX, s, s]} userData={{ ghost: true }}>
      <mesh scale={[r, r * 1.08, r]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} transparent opacity={1 - pop} />
      </mesh>
      <mesh scale={[r + 0.012, r * 1.08 + 0.012, r + 0.012]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} transparent opacity={1 - pop} />
      </mesh>
      <mesh position={[-r * 0.38, r * 0.45, r * 0.78]} scale={[r * 0.16, r * 0.24, 0.01]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6 * (1 - pop)} />
      </mesh>
      {r > 0.12 && pop < 0.3 && <Label text={label} position={[0, 0, r * 1.02]} width={r * 1.25} border={false} bg="#fff6dc" />}
      <InkCylinder radius={0.03} height={0.06} position={[0, -r * 1.08 - 0.02, 0]} color={color} ink={0.006} />
    </group>
  );
};

// The rubber hose from pump to balloon (a curve through `points`).
export const Hose: React.FC<{ points: Vec3[] }> = ({ points }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 40, 0.016, 8, false), [JSON.stringify(points)]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshToonMaterial color="#3a3a3a" gradientMap={toonRamp} />
    </mesh>
  );
};

// A lever on a quadrant: `down` 0..1 pulls it from up to down. Its label hangs on the quadrant.
export const Lever: React.FC<{ position: Vec3; down: number; label: string }> = ({ position, down, label }) => (
  <group position={position}>
    <InkBox size={[0.36, 0.5, 0.08]} position={[0, 0.25, 0]} color="#5a4a3a" ink={0.01} />
    <group position={[0, 0.42, 0.06]} rotation={[0, 0, 0.9 - down * 1.8]}>
      <InkCylinder radius={0.018} height={0.42} position={[0, 0.21, 0]} color="#9a9a9a" ink={0.006} />
      <mesh position={[0, 0.43, 0]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshToonMaterial color="#d82a2a" gradientMap={toonRamp} />
      </mesh>
    </group>
    <Label text={label} position={[0, 0.14, 0.05]} width={0.34} />
  </group>
);

// The study: an open book on a lectern with a dated slip.
export const StudyBook: React.FC<{ position: Vec3; rotationY?: number; label?: string }> = ({ position, rotationY = 0, label = "STUDY, 2014" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkCylinder radius={0.04} height={0.95} position={[0, 0.475, 0]} color="#5a3a22" ink={0.008} />
    <InkBox size={[0.36, 0.04, 0.28]} position={[0, 0.98, 0]} rotation={[0.5, 0, 0]} color="#5a3a22" ink={0.008} />
    <InkBox size={[0.16, 0.012, 0.24]} position={[-0.085, 1.01, 0.01]} rotation={[0.5, 0, 0.08]} color="#f6efdc" ink={0.004} />
    <InkBox size={[0.16, 0.012, 0.24]} position={[0.085, 1.01, 0.01]} rotation={[0.5, 0, -0.08]} color="#f6efdc" ink={0.004} />
    <InkCylinder radius={0.008} height={0.2} position={[0.14, 1.1, -0.05]} color="#5a3a22" ink={0.003} />
    <Label text={label} position={[0.14, 1.28, -0.04]} width={0.32} rotation={[-0.1, 0, 0]} />
  </group>
);

// The tournament trophy: a gold two-handled cup. `dent` squashes it after the slam.
export const Trophy: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.06} height={0.025} position={[0, 0.012, 0]} color="#b8801a" ink={0.006} />
    <InkCylinder radius={0.016} height={0.1} position={[0, 0.07, 0]} color="#e8b838" ink={0.005} />
    <mesh position={[0, 0.25, 0]} rotation={[Math.PI, 0, 0]} scale={[0.075, 0.13, 0.075]}>
      <sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <meshToonMaterial color="#f0c040" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.25, 0]} rotation={[Math.PI, 0, 0]} scale={[0.082, 0.137, 0.082]}>
      <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.085, 0.2, 0]} rotation={[0, 0, s * 0.2]}>
        <torusGeometry args={[0.035, 0.009, 8, 20, Math.PI * 1.3]} />
        <meshToonMaterial color="#e8b838" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// ---------- the tournament lists ----------

const grassCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#6e9c42";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) {
      const x = rand(i) * 512;
      const y = rand(i + 7) * 512;
      ctx.strokeStyle = rand(i + 3) > 0.5 ? "rgba(140,190,80,0.6)" : "rgba(60,100,40,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 1) - 0.5) * 6, y - 8 - rand(i + 2) * 8);
      ctx.stroke();
    }
  });

const sandCanvas = () =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#c8a46c";
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(255,240,200,0.18)" : "rgba(100,70,40,0.16)";
      ctx.beginPath();
      ctx.arc(rand(i + 1) * 1024, rand(i + 2) * 512, 2 + rand(i + 3) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    // hoof prints along the riding line
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = "rgba(90,60,30,0.35)";
      ctx.beginPath();
      ctx.ellipse(i * 13, 250 + Math.sin(i) * 40, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // churned mud patches
    for (let i = 0; i < 8; i++) {
      const g = ctx.createRadialGradient(rand(i * 5) * 1024, 200 + rand(i * 3) * 120, 5, rand(i * 5) * 1024, 200 + rand(i * 3) * 120, 90);
      g.addColorStop(0, "rgba(90,62,36,0.55)");
      g.addColorStop(1, "rgba(90,62,36,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1024, 512);
    }
  });

const stripeCanvas = (a: string, b: string, n = 8) =>
  canvasTexture(512, 256, (ctx) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? b : a;
      ctx.fillRect((i * 512) / n, 0, 512 / n + 1, 256);
    }
  });

export const LISTS = { tilt: -0.9, near: 0.4, far: -2.4 };

const Pennant: React.FC<{ position: Vec3; color: string; frame: number; seed: number; h?: number }> = ({ position, color, frame, seed, h = 0.6 }) => {
  const wave = Math.sin(frame * 0.18 + seed) * 0.25;
  return (
    <group position={position}>
      <InkCylinder radius={0.015} height={h} position={[0, h / 2, 0]} color="#5a3a22" ink={0.004} />
      <group position={[0, h - 0.06, 0]} rotation={[0, wave, 0]}>
        <mesh position={[0.18, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.07, 0.36, 3]} />
          <meshToonMaterial color={color} gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

const Pavilion: React.FC<{ position: Vec3; a: string; b: string; frame: number; seed: number; r?: number }> = ({ position, a, b, frame, seed, r = 1.1 }) => {
  const tex = useOwned(() => repeat(stripeCanvas(a, b, 10), 1, 1), [a, b]);
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[r, r * 1.04, 1.6, 30, 1, true]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <coneGeometry args={[r * 1.12, 1.1, 30]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <torusGeometry args={[r * 1.1, 0.03, 6, 30]} />
        <meshToonMaterial color={b} gradientMap={toonRamp} />
      </mesh>
      {/* the open flap */}
      <mesh position={[0, 0.7, r * 0.99]}>
        <planeGeometry args={[0.6, 1.4]} />
        <meshBasicMaterial color="#2a1a14" />
      </mesh>
      <Pennant position={[0, 2.6, 0]} color={b} frame={frame} seed={seed} />
    </group>
  );
};

// A small spectator figure in the stand (body, head, waving arm), so the crowd reacts.
const Spectator: React.FC<{ position: Vec3; color: string; skin: string; frame: number; seed: number; cheer: number }> = ({ position, color, skin, frame, seed, cheer }) => {
  const bob = Math.abs(Math.sin(frame * 0.25 + seed)) * 0.05 * cheer;
  const arm = 0.4 + cheer * (1.6 + Math.sin(frame * 0.4 + seed) * 0.5);
  return (
    <group position={[position[0], position[1] + bob, position[2]]}>
      <mesh position={[0, 0.22, 0]} scale={[0.13, 0.22, 0.1]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.5, 0]} scale={0.085}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshToonMaterial color={skin} gradientMap={toonRamp} />
      </mesh>
      <group position={[0.11, 0.34, 0]} rotation={[0, 0, arm]}>
        <InkCylinder radius={0.022} height={0.2} position={[0, -0.1, 0]} color={color} ink={0.004} />
      </group>
    </group>
  );
};

const Stand: React.FC<{ position: Vec3; frame: number; cheer: number }> = ({ position, frame, cheer }) => {
  const awn = useOwned(() => repeat(stripeCanvas("#d8322a", "#f6efe0", 12), 1, 1));
  const cols = ["#2a5aa8", "#c8302a", "#e0b040", "#3a8a4a", "#7a3a8a", "#e07a2a"];
  const skins = ["#f0c8a8", "#d8a47a", "#c8906a", "#f2d2b4"];
  return (
    <group position={position}>
      {[0, 1, 2].map((t) => (
        <InkBox key={t} size={[4.4, 0.08, 0.5]} position={[0, 0.45 + t * 0.45, -t * 0.5]} color="#8a6a44" ink={0.01} />
      ))}
      <InkBox size={[4.4, 0.5, 0.06]} position={[0, 0.25, 0.27]} color="#2a5aa8" ink={0.01} />
      {Array.from({ length: 18 }, (_, i) => {
        const t = i % 3;
        const x = -1.9 + Math.floor(i / 3) * 0.75 + (t % 2) * 0.3;
        return <Spectator key={i} position={[x, 0.49 + t * 0.45, -t * 0.5]} color={cols[i % 6]} skin={skins[i % 4]} frame={frame} seed={i * 1.7} cheer={cheer} />;
      })}
      {[-2.1, 2.1].map((x) => (
        <InkCylinder key={x} radius={0.04} height={2.6} position={[x, 1.3, -1.1]} color="#5a3a22" ink={0.006} />
      ))}
      <mesh position={[0, 2.6, -0.6]} rotation={[0.35, 0, 0]}>
        <planeGeometry args={[4.6, 1.4]} />
        <meshToonMaterial map={awn} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Tree: React.FC<{ position: Vec3; s?: number; seed?: number }> = ({ position, s = 1, seed = 0 }) => (
  <group position={position} scale={s}>
    <InkCylinder radius={0.12} height={1.4} position={[0, 0.7, 0]} color="#6a4a2a" ink={0.01} />
    {[[0, 1.9, 0, 0.9], [-0.5, 1.6, 0.1, 0.6], [0.55, 1.65, -0.1, 0.65], [0.1, 2.4, 0, 0.6]].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]} scale={r * (0.92 + rand(seed + i) * 0.16)}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshToonMaterial color={i % 2 ? "#4a8a3a" : "#5a9a42"} gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

const CastleWall: React.FC<{ z: number; shift: number }> = ({ z, shift }) => (
  <group position={[shift, 0, z]}>
    <InkBox size={[40, 3.2, 1]} position={[0, 1.6, 0]} color="#b8ac92" ink={0.03} />
    {Array.from({ length: 40 }, (_, i) => (
      <InkBox key={i} size={[0.5, 0.5, 1]} position={[-19.5 + i, 3.45, 0]} color="#b8ac92" ink={0.02} />
    ))}
    {[-9, -2, 6, 13].map((x) => (
      <group key={x} position={[x, 0, 0.4]}>
        <InkCylinder radius={1.3} height={5.2} position={[0, 2.6, 0]} color="#c4b89e" ink={0.03} />
        <mesh position={[0, 5.9, 0]}>
          <coneGeometry args={[1.5, 1.6, 20]} />
          <meshToonMaterial color="#3a4a7a" gradientMap={toonRamp} />
        </mesh>
      </group>
    ))}
  </group>
);

export const listsLight = (): PuppetLight => ({ shadow: 0.14, distant: [{ direction: [0.6, 0.7, 0.5], color: "#fff2d8", strength: 1.0 }] });
export const LISTS_BG = "#9ccaf0";
const LISTS_SUN: Vec3 = [6, 8, 5];

// The lists at midday: sand strip along x (z from LISTS.far to LISTS.near) with the tilt barrier at LISTS.tilt, grass
// around, striped pavilions, a stand of spectators (`cheer` 0..1), trees, the castle wall beyond, hills, sky dome.
export const ListsSet: React.FC<{ camera: CameraShot; frame: number; cheer?: number; children?: React.ReactNode }> = ({ camera, frame, cheer = 0.3, children }) => {
  const camX = camera.position[0];
  const grass = useOwned(() => repeat(grassCanvas(), 30, 24));
  const sand = useOwned(() => repeat(sandCanvas(), 3, 1));
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[LISTS_BG]} />
      <fog attach="fog" args={["#cfe2ee", 25, 80]} />
      <ambientLight intensity={1.25} color="#ffffff" />
      <hemisphereLight args={["#d0e6ff", "#6a7a3a", 0.6]} />
      <directionalLight
        position={LISTS_SUN}
        intensity={2.4}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <group position={camera.position}>
        <SkyDome sun={LISTS_SUN} />
      </group>
      <Hills z={-60} shift={camX * 0.6} width={240} low={4} high={11} color="#8aa4bc" seed={4} flat />
      <Hills z={-40} shift={camX * 0.3} width={180} low={1.5} high={5} color="#7f9a6a" seed={8} />
      <CastleWall z={-24} shift={camX * 0.15} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, (LISTS.near + LISTS.far) / 2]} receiveShadow>
        <planeGeometry args={[30, LISTS.near - LISTS.far]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={sand} />
      </mesh>
      {/* the tilt: green planks between red-and-white posts */}
      {Array.from({ length: 16 }, (_, i) => {
        const x = -9 + i * 1.2;
        return (
          <group key={i} position={[x, 0, LISTS.tilt]}>
            <InkCylinder radius={0.05} height={1.15} position={[0, 0.575, 0]} color={i % 2 ? "#f2ece0" : "#c83a2a"} ink={0.008} />
            <InkBox size={[1.2, 0.18, 0.05]} position={[0.6, 0.92, 0]} color="#2e7a4a" ink={0.008} />
            <InkBox size={[1.2, 0.12, 0.05]} position={[0.6, 0.45, 0]} color="#2e7a4a" ink={0.008} />
          </group>
        );
      })}
      <Pavilion position={[-4.5, 0, -6.5]} a="#f6efe0" b="#c8302a" frame={frame} seed={1} />
      <Pavilion position={[-1.6, 0, -8.0]} a="#f6efe0" b="#2a5aa8" frame={frame} seed={2} r={1.3} />
      <Pavilion position={[5.6, 0, -7.2]} a="#e0b040" b="#3a7a3a" frame={frame} seed={3} />
      <Stand position={[2.2, 0, -4.4]} frame={frame} cheer={cheer} />
      <Tree position={[-7, 0, -11]} s={1.6} seed={1} />
      <Tree position={[-2.8, 0, -13]} s={1.9} seed={4} />
      <Tree position={[8.5, 0, -10]} s={1.7} seed={7} />
      <Tree position={[11, 0, -14]} s={2.0} seed={9} />
      {[-6, -3, 0.5, 4, 7].map((x, i) => (
        <Pennant key={x} position={[x, 0, LISTS.far - 0.4]} color={["#c8302a", "#2a5aa8", "#e0b040", "#3a8a4a", "#7a3a8a"][i]} frame={frame} seed={i * 2} h={1.6} />
      ))}
      {children}
    </>
  );
};

// A churned mud puddle on the sand.
export const MudPuddle: React.FC<{ position: Vec3; r?: number }> = ({ position, r = 0.7 }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} scale={[r, r * 0.65, 1]}>
      <circleGeometry args={[1, 32]} />
      <meshToonMaterial color="#5a3e24" gradientMap={toonRamp} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, 0.01, -0.05]} scale={[r * 0.6, r * 0.35, 1]}>
      <circleGeometry args={[1, 24]} />
      <meshBasicMaterial color="#7a5a38" transparent opacity={0.6} />
    </mesh>
  </group>
);

// A jousting lance: a tapered striped shaft with a vamplate, pointing +x from its grip.
export const Lance: React.FC<{ position: Vec3; rotation?: Vec3; length?: number; broken?: boolean }> = ({ position, rotation = [0, 0, 0], length = 2.4, broken = false }) => {
  const L = broken ? length * 0.45 : length;
  return (
    <group position={position} rotation={rotation} userData={{ ghost: true }}>
      <mesh position={[L / 2 - 0.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.04, L, 16]} />
        <meshToonMaterial color="#f2ece0" gradientMap={toonRamp} />
      </mesh>
      {[0.2, 0.6, 1.0, 1.4, 1.8].filter((x) => x < L - 0.4).map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.036 - x * 0.008, 0.038 - x * 0.008, 0.16, 16]} />
          <meshToonMaterial color="#c8302a" gradientMap={toonRamp} />
        </mesh>
      ))}
      <mesh position={[-0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.11, 0.18, 20, 1, true]} />
        <meshToonMaterial color="#a8acb4" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ---------- the modern gift aisle ----------

const BOX_COLS = ["#e83a6a", "#2a9ad8", "#f0a020", "#7a3ac8", "#3ab870", "#e85a2a", "#f2f2f2", "#1a3a8a"];

const GiftBox: React.FC<{ position: Vec3; size: Vec3; color: string; ribbon?: string }> = ({ position, size, color, ribbon = "#ffffff" }) => (
  <group position={position}>
    <InkBox size={size} position={[0, size[1] / 2, 0]} color={color} ink={0.006} />
    <InkBox size={[size[0] * 0.14, size[1] + 0.004, size[2] + 0.004]} position={[0, size[1] / 2, 0]} color={ribbon} ink={0} />
  </group>
);

export const AISLE = { shelfZ: -0.9, hero: [0.0, 1.12, -0.72] as Vec3 };

// The hero box: shiny gold with a bow, YOU DESERVE IT on its face and a price tag hanging off the shelf edge.
export const HeroBox: React.FC<{ position: Vec3; frame: number; glint?: number }> = ({ position, frame, glint = 1 }) => (
  <group position={position}>
    <InkBox size={[0.42, 0.3, 0.3]} position={[0, 0.15, 0]} color="#f0c030" ink={0.01} />
    <InkBox size={[0.06, 0.304, 0.304]} position={[0, 0.15, 0]} color="#c8202a" ink={0} />
    <mesh position={[-0.05, 0.33, 0]} rotation={[0, 0, 0.6]}>
      <torusGeometry args={[0.05, 0.016, 8, 20]} />
      <meshToonMaterial color="#c8202a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0.05, 0.33, 0]} rotation={[0, 0, -0.6]}>
      <torusGeometry args={[0.05, 0.016, 8, 20]} />
      <meshToonMaterial color="#c8202a" gradientMap={toonRamp} />
    </mesh>
    <Label text={"YOU\nDESERVE IT"} position={[0, 0.16, 0.16]} width={0.3} bg="#fff6dc" />
    <Halo position={[0.14, 0.27, 0.17]} size={0.22} color="#ffffff" strength={0.5 * glint * (0.6 + 0.4 * Math.sin(frame * 0.2))} />
  </group>
);

export const AisleSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const z = AISLE.shelfZ;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#e8f4f6"]} />
      <fog attach="fog" args={["#e8f4f6", 6, 16]} />
      <ambientLight intensity={1.7} color="#f4fbff" />
      <hemisphereLight args={["#ffffff", "#a8b4b8", 0.6]} />
      <directionalLight position={[1.5, 5, 3]} intensity={1.6} color="#ffffff" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
      {/* floor tiles */}
      {Array.from({ length: 14 }, (_, i) =>
        Array.from({ length: 10 }, (_, j) => (
          <mesh key={`${i}-${j}`} rotation={[-Math.PI / 2, 0, 0]} position={[-3.5 + i * 0.5 + 0.25, 0.001, -2 + j * 0.5 + 0.25]} receiveShadow>
            <planeGeometry args={[0.49, 0.49]} />
            <meshToonMaterial color={(i + j) % 2 ? "#e4e8ea" : "#d4dadc"} gradientMap={toonRamp} />
          </mesh>
        )),
      )}
      <mesh position={[0, 1.8, -1.6]}>
        <planeGeometry args={[10, 3.6]} />
        <meshToonMaterial color="#cfe6ea" gradientMap={toonRamp} />
      </mesh>
      {/* shelving bay */}
      <InkBox size={[3.4, 2.2, 0.06]} position={[0, 1.1, z - 0.22]} color="#f6f8f8" ink={0.01} />
      {[-1.7, 1.7, 0].map((x) => (
        <InkBox key={x} size={[0.05, 2.2, 0.5]} position={[x, 1.1, z]} color="#e8ecec" ink={0.008} />
      ))}
      {[0.12, 0.55, 1.1, 1.65].map((y) => (
        <group key={y}>
          <InkBox size={[3.4, 0.03, 0.46]} position={[0, y, z]} color="#f2f4f4" ink={0.008} />
          <InkBox size={[3.4, 0.05, 0.012]} position={[0, y - 0.01, z + 0.235]} color="#f2c81a" ink={0.004} />
        </group>
      ))}
      {[0.135, 0.565, 1.115, 1.665].map((y, r) =>
        Array.from({ length: 9 }, (_, i) => {
          const x = -1.55 + i * 0.38;
          if (r === 2 && Math.abs(x - AISLE.hero[0]) < 0.3) return null;
          const h = 0.18 + rand(r * 11 + i) * 0.18;
          return <GiftBox key={`${r}-${i}`} position={[x, y, z]} size={[0.28, h, 0.26]} color={BOX_COLS[(i + r * 3) % 8]} ribbon={r % 2 ? "#f2c81a" : "#ffffff"} />;
        }),
      )}
      {/* fluorescent tubes */}
      {[-1, 0.2, 1.4].map((x) => (
        <group key={x} position={[x, 2.9, 0.4]}>
          <InkBox size={[1.0, 0.05, 0.16]} position={[0, 0, 0]} color="#f8fcff" ink={0.006} emissive="#c8e8f0" />
          <Halo position={[0, -0.08, 0.05]} size={1.4} color="#e8faff" strength={0.25} />
        </group>
      ))}
      {children}
    </>
  );
};
