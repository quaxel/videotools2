import React, { useMemo } from "react";
import * as THREE from "three";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, PuppetLight, rand, SkyDome, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// The Descartes highlands, Apollo 16, April 1972 (guide/references/lunar-surface-apollo16.md). Metres, y = 0 the
// ground at the jump spot (the origin). The camera mostly looks toward -z: the flag at FLAG, the lunar module behind
// on the left at LM, the rover on the right at ROVER, gentle grey hills (Stone Mountain) from z -14 on, a black sky
// with Earth high in it. One set, re-lit by mode:
//   golden  low warm sun from behind-left, long black shadows (the hook, the jump, the loop)
//   earth   looking toward a big blue Earth, a cold blue rim (Young bouncing)
//   shadow  in the LM's shadow: cold blue-grey, the sun a thin rim (the backward tip and fall)
//   neutral high white sun, plain grey (helping him up)
//   dream   the purple what-if: violet sky full of stars, magenta ground
//   pale    bright pale blue-white, Earth high (loping and skipping)

export type MoonMode = "golden" | "earth" | "shadow" | "neutral" | "dream" | "pale";

const INK = "#161212";
export const FLAG: Vec3 = [0.75, 0, -0.7];
export const LM: Vec3 = [-2.1, 0, -5.2];
export const ROVER: Vec3 = [2.6, 0, -3.4];
export const MOON_G = 1.62; // m/s²

type Look = {
  sky: [number, string][];
  glow: string;
  sun: Vec3; // direction toward the sun
  key: [number, string];
  amb: [number, string];
  hemi: [string, string, number];
  ground: string;
  speck: string;
  hills: [string, string];
  earth: Vec3; // direction of Earth in the sky
  earthSize: number;
  stars: number;
  fog: string;
};

const BLACK_SKY: [number, string][] = [[-0.1, "#0a0a0e"], [0.0, "#07070a"], [0.3, "#040406"], [1.0, "#020203"]];

const LOOKS: Record<MoonMode, Look> = {
  golden: {
    sky: BLACK_SKY, glow: "#3a2a18", sun: [-0.85, 0.32, 0.42], key: [2.9, "#fff0d8"], amb: [0.45, "#c8c4c0"], hemi: ["#e0dcd4", "#34322e", 0.35],
    ground: "#9a978f", speck: "#66625c", hills: ["#86837c", "#a09c94"], earth: [-0.2, 0.44, -0.88], earthSize: 13, stars: 0.25, fog: "#0a0a0c",
  },
  earth: {
    sky: [[-0.1, "#0c1220"], [0.0, "#0a1020"], [0.25, "#060a14"], [1.0, "#03050a"]], glow: "#1a3a6a", sun: [0.9, 0.35, 0.3], key: [1.9, "#e8eef8"], amb: [0.4, "#a8bcd8"], hemi: ["#9ab8e8", "#2a3040", 0.45],
    ground: "#8a909a", speck: "#5a6068", hills: ["#6a7280", "#8890a0"], earth: [-0.05, 0.42, -0.9], earthSize: 26, stars: 0.6, fog: "#0a0e18",
  },
  shadow: {
    sky: BLACK_SKY, glow: "#101828", sun: [0.85, 0.3, -0.45], key: [1.1, "#c8d4f0"], amb: [0.55, "#8a9ac0"], hemi: ["#8aa0d0", "#1e2230", 0.55],
    ground: "#727a8a", speck: "#4a5060", hills: ["#5a6274", "#727a8c"], earth: [0.4, 0.66, -0.64], earthSize: 13, stars: 0.4, fog: "#06080e",
  },
  neutral: {
    sky: BLACK_SKY, glow: "#202020", sun: [-0.5, 0.62, 0.6], key: [2.5, "#fff8ee"], amb: [0.5, "#d0d0d0"], hemi: ["#e0e0e0", "#383838", 0.4],
    ground: "#9c9a96", speck: "#66645f", hills: ["#86847f", "#a2a09a"], earth: [-0.3, 0.58, -0.76], earthSize: 14, stars: 0.25, fog: "#08080a",
  },
  dream: {
    sky: [[-0.1, "#f0a8e0"], [0.0, "#d888d8"], [0.08, "#9a5ac8"], [0.25, "#5a2a9a"], [0.55, "#2a1460"], [1.0, "#140a34"]], glow: "#ffd0f4", sun: [-0.6, 0.4, -0.7], key: [2.6, "#ffd8f4"], amb: [0.7, "#e8c8ff"], hemi: ["#e8b8ff", "#4a2a6a", 0.6],
    ground: "#b88ab8", speck: "#7a4a8a", hills: ["#8a5aa8", "#a874c0"], earth: [0.35, 0.5, -0.8], earthSize: 18, stars: 1, fog: "#2a1460",
  },
  pale: {
    sky: [[-0.1, "#1e1a24"], [0.0, "#16141c"], [0.2, "#0c0a10"], [1.0, "#050406"]], glow: "#4a3a5a", sun: [-0.55, 0.7, 0.45], key: [2.9, "#fff0fa"], amb: [0.62, "#ece0f0"], hemi: ["#f0e4f4", "#46404c", 0.5],
    ground: "#b6acb8", speck: "#7c7280", hills: ["#a096a6", "#bcb2c0"], earth: [-0.25, 0.36, -0.9], earthSize: 17, stars: 0.3, fog: "#0c1018",
  },
};

export const MOON_BG: Record<MoonMode, string> = {
  golden: "#07070a",
  earth: "#0a1020",
  shadow: "#07070a",
  neutral: "#07070a",
  dream: "#5a2a9a",
  pale: "#141c2a",
};

// Puppets on the Moon: the sun is the only strong light (a hard, warm or white key from its side), Earth a faint blue rim.
export const moonLight = (mode: MoonMode): PuppetLight => {
  const L = LOOKS[mode];
  const d: Vec3 = [L.sun[0], Math.max(0.25, L.sun[1]), L.sun[2]];
  const base: PuppetLight = {
    tint: L.amb[1],
    tintAmount: mode === "dream" ? 0.16 : mode === "shadow" ? 0.14 : 0.06,
    shadow: mode === "shadow" ? 0.34 : 0.24,
    distant: [{ direction: d, color: L.key[1], strength: mode === "shadow" ? 0.7 : 1.6 }],
  };
  if (mode === "earth" || mode === "shadow") base.distant!.push({ direction: [L.earth[0], L.earth[1], L.earth[2]], color: "#7ab0ff", strength: 0.9 });
  return base;
};

// Height of the ground: flat round the action (r < 7 m), gently rolling further out, rising into hills far off.
const groundY = (x: number, z: number) => {
  const r = Math.hypot(x, z + 1);
  const k = Math.min(1, Math.max(0, (r - 7) / 10));
  const roll = Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17) * 0.9 + Math.sin(x * 0.07 - z * 0.05) * 1.6;
  return k * k * roll;
};

// A shallow crater: a dark bowl decal and a raised rim.
const Crater: React.FC<{ position: Vec3; r: number; ground: string; speck: string }> = ({ position, r, ground, speck }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <circleGeometry args={[r, 32]} />
      <meshToonMaterial color={speck} gradientMap={toonRamp} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[r * 0.18, 0.009, -r * 0.12]}>
      <circleGeometry args={[r * 0.72, 32]} />
      <meshToonMaterial color={ground} gradientMap={toonRamp} transparent opacity={0.55} polygonOffset polygonOffsetFactor={-3} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 0.18]}>
      <torusGeometry args={[r, r * 0.16, 8, 40]} />
      <meshToonMaterial color={ground} gradientMap={toonRamp} />
    </mesh>
  </group>
);

export const MoonRock: React.FC<{ position: Vec3; size: number; color: string; seed: number }> = ({ position, size, color, seed }) => (
  <group position={position} rotation={[rand(seed) * 0.6, rand(seed, 2) * 6, rand(seed, 3) * 0.5]} scale={[1, 0.62 + rand(seed, 4) * 0.25, 0.9]}>
    <mesh castShadow receiveShadow>
      <dodecahedronGeometry args={[size, 1]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh scale={1.06}>
      <dodecahedronGeometry args={[size, 1]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// Earth: blue oceans, green-brown land, swirling white cloud, the night side dark; it faces the camera's dome centre.
const Earth: React.FC<{ dir: Vec3; size: number; sun: Vec3 }> = ({ dir, size, sun }) => {
  const tex = useOwned(() => {
    const t = canvasTexture(512, 256, (ctx) => {
      ctx.fillStyle = "#2a6ad0";
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#4aa060";
      for (const [x, y, w, h] of [[60, 70, 90, 70], [120, 140, 60, 80], [250, 60, 110, 60], [280, 120, 60, 90], [400, 80, 80, 50], [420, 170, 50, 40]]) {
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#c8a870";
      ctx.beginPath();
      ctx.ellipse(300, 100, 30, 20, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineCap = "round";
      for (let i = 0; i < 26; i++) {
        ctx.lineWidth = 6 + rand(i, 7) * 10;
        ctx.beginPath();
        const x = rand(i, 8) * 512;
        const y = rand(i, 9) * 256;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 40, y - 20 + rand(i, 10) * 40, x + 90 + rand(i, 11) * 60, y + (rand(i, 12) - 0.5) * 30);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 14);
      ctx.fillRect(0, 242, 512, 14);
    });
    return t;
  }, []);
  const p = new THREE.Vector3(...dir).normalize().multiplyScalar(220);
  const s = new THREE.Vector3(...sun).normalize();
  return (
    <group position={p.toArray()}>
      <mesh rotation={[0.3, 2.2, 0.2]}>
        <sphereGeometry args={[size, 48, 32]} />
        <meshLambertMaterial map={tex} emissive="#0a1830" fog={false} />
      </mesh>
      {/* atmosphere halo */}
      <mesh>
        <sphereGeometry args={[size * 1.07, 32, 24]} />
        <meshBasicMaterial color="#7ab8ff" transparent opacity={0.18} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <directionalLight position={s.clone().multiplyScalar(-300 + 600).toArray()} intensity={0} />
    </group>
  );
};

const Stars: React.FC<{ amount: number; frame: number }> = ({ amount, frame }) => {
  const geo = useOwned(() => {
    const n = 420;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand(i, 21) * 2 - 1;
      const th = rand(i, 22) * Math.PI * 2;
      const y = 0.05 + Math.abs(u) * 0.95;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(th) * r * 250, y * 250, Math.sin(th) * r * 250], i * 3);
      const c = new THREE.Color().setHSL(0.55 + rand(i, 23) * 0.4, 0.6, 0.85);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  if (amount <= 0) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial size={amount > 0.8 ? 2.6 + Math.sin(frame * 0.1) * 0.3 : 1.6} sizeAttenuation={false} vertexColors transparent opacity={amount} fog={false} depthWrite={false} />
    </points>
  );
};

// The flag: stripes and a canton, held out stiff by a rod along its top, ripples set in it (no air to move it).
export const MoonFlag: React.FC<{ position: Vec3; yaw?: number; dusty?: boolean }> = ({ position, yaw = 0.35 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(256, 160, (ctx) => {
        for (let i = 0; i < 13; i++) {
          ctx.fillStyle = i % 2 ? "#f4f0e8" : "#c8302c";
          ctx.fillRect(0, (i * 160) / 13, 256, 160 / 13 + 1);
        }
        ctx.fillStyle = "#2a3a7a";
        ctx.fillRect(0, 0, 110, 86);
        ctx.fillStyle = "#f4f0e8";
        for (let r = 0; r < 7; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) ctx.fillRect(8 + c * 13, 6 + r * 11.5, 4, 4);
      }),
    [],
  );
  const geo = useOwned(() => {
    const g = new THREE.PlaneGeometry(0.95, 0.6, 24, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + 0.475;
      const y = p.getY(i);
      p.setZ(i, Math.sin(x * 9) * 0.035 * (x / 0.95) + Math.sin(x * 4 + 1) * 0.02 + (0.3 - y) * x * 0.06);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.016, 1.7, 8]} />
        <meshToonMaterial color="#d8d6d0" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0.48, 1.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, 0.98, 8]} />
        <meshToonMaterial color="#d8d6d0" gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={geo} position={[0.485, 1.31, 0]} castShadow>
        <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// The rover: an open aluminium frame, four mesh wheels with gold fenders, two seats, the umbrella dish on its mast.
const Rover: React.FC<{ position: Vec3; yaw: number }> = ({ position, yaw }) => {
  const box = (p: Vec3, s: Vec3, c: string, k?: string) => (
    <group key={k ?? p.join(",")} position={p}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={s} />
        <meshToonMaterial color={c} gradientMap={toonRamp} />
      </mesh>
      <mesh scale={[1 + 0.03 / s[0], 1 + 0.03 / s[1], 1 + 0.03 / s[2]]}>
        <boxGeometry args={s} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
  return (
    <group position={position} rotation={[0, yaw, 0]} scale={0.78}>
      {box([0, 0.55, 0], [1.3, 0.1, 2.4], "#a8acb0", "deck")}
      {box([0, 0.75, -0.2], [1.0, 0.3, 0.5], "#d8d8d4", "seats")}
      {box([0, 0.82, -1.0], [0.6, 0.4, 0.3], "#8a8e94", "console")}
      {box([0, 0.75, 0.95], [1.0, 0.35, 0.45], "#c9c4b8", "pallet")}
      {[[-0.75, -0.85], [0.75, -0.85], [-0.75, 0.85], [0.75, 0.85]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.4, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.3, 0.1, 10, 24]} />
            <meshToonMaterial color="#4a4c50" gradientMap={toonRamp} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.16, 16]} />
            <meshToonMaterial color="#8a8e94" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}>
            <cylinderGeometry args={[0.46, 0.46, 0.26, 20, 1, true, -1.1, 2.2]} />
            <meshToonMaterial color="#c98a3a" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh position={[-0.45, 1.3, 0.6]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 6]} />
        <meshToonMaterial color="#b8bcc0" gradientMap={toonRamp} />
      </mesh>
      <group position={[-0.45, 1.85, 0.6]} rotation={[-0.5, 0, 0.3]}>
        <mesh castShadow>
          <coneGeometry args={[0.45, 0.22, 16, 1, true]} />
          <meshToonMaterial color="#efeee8" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0.4, 1.0, -1.25]}>
        <boxGeometry args={[0.18, 0.14, 0.2]} />
        <meshToonMaterial color="#e8e4dc" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// Bootprints and tracks round the action, as a decal over the ground.
const Prints: React.FC<{ ground: string }> = () => {
  const tex = useOwned(
    () =>
      canvasTexture(1024, 1024, (ctx) => {
        ctx.clearRect(0, 0, 1024, 1024);
        // rover tracks: two chevron bands sweeping across
        for (const off of [0, 70]) {
          ctx.save();
          ctx.translate(620 + off, 0);
          ctx.rotate(0.35);
          for (let y = -200; y < 1300; y += 14) {
            ctx.strokeStyle = "rgba(40,36,32,0.28)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-18, y);
            ctx.lineTo(0, y + 8);
            ctx.lineTo(18, y);
            ctx.stroke();
          }
          ctx.restore();
        }
        // bootprints wandering round the centre
        for (let i = 0; i < 140; i++) {
          const a = rand(i, 30) * Math.PI * 2;
          const r = 60 + rand(i, 31) * 420;
          const x = 512 + Math.cos(a) * r;
          const y = 512 + Math.sin(a) * r;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rand(i, 32) * 6);
          ctx.fillStyle = "rgba(30,28,26,0.30)";
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(30,28,26,0.35)";
          ctx.lineWidth = 2;
          for (let k = -14; k < 16; k += 5) {
            ctx.beginPath();
            ctx.moveTo(-8, k);
            ctx.lineTo(8, k);
            ctx.stroke();
          }
          ctx.restore();
        }
      }),
    [],
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -1]}>
      <planeGeometry args={[12, 12]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
};

// Hills far off: smooth flattened domes (Stone Mountain and its neighbours), no jagged peaks.
const Hills: React.FC<{ colors: [string, string]; camX: number }> = ({ colors, camX }) => (
  <group>
    {[
      [-34, -60, 46, 7.5, 0],
      [8, -70, 60, 11, 0],
      [44, -58, 40, 6.5, 1],
      [-10, -40, 30, 3.2, 1],
      [26, -36, 24, 2.6, 1],
    ].map(([x, z, r, h, c], i) => (
      <mesh key={i} position={[x + camX * (c ? 0.15 : 0.35), -0.4, z]} scale={[1, h / r, 0.6]} receiveShadow>
        <sphereGeometry args={[r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color={colors[c]} gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// Kicked-up dust in vacuum: each grain flies a clean parabola and drops straight back, no puffs, no drift.
// `frame` = frames since the kick (negative hides it); `slow` stretches time (the hang time reads on a phone).
export const MoonDust: React.FC<{ at: Vec3; frame: number; count?: number; speed?: number; spread?: number; up?: number; color?: string; seed?: number; slow?: number; dir?: [number, number] }> = ({
  at,
  frame,
  count = 70,
  speed = 1.4,
  spread = 1,
  up = 1,
  color = "#b4ac9e",
  seed = 1,
  slow = 1,
  dir = [0, 0],
}) => {
  if (frame < 0) return null;
  const t = frame / 30 / slow;
  return (
    <group position={at} userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i, seed) * Math.PI * 2;
        const v = speed * (0.4 + rand(i, seed + 1) * 0.8);
        const vy = v * up * (0.5 + rand(i, seed + 2) * 0.9);
        const vx = Math.cos(a) * v * spread * 0.7 + dir[0];
        const vz = Math.sin(a) * v * spread * 0.5 + dir[1];
        const land = (2 * vy) / MOON_G;
        const tt = Math.min(t, land);
        const y = vy * tt - 0.5 * MOON_G * tt * tt;
        const s = 0.007 + rand(i, seed + 3) * 0.012;
        const settled = t >= land;
        return (
          <mesh key={i} position={[vx * tt, Math.max(0.004, y), vz * tt]} scale={settled ? [1.6, 0.25, 1.6] : [1, 1, 1]}>
            <sphereGeometry args={[s, 6, 4]} />
            <meshToonMaterial color={color} gradientMap={toonRamp} />
          </mesh>
        );
      })}
    </group>
  );
};

export const MoonSet: React.FC<{ camera: CameraShot; frame: number; mode: MoonMode; lm?: boolean; rover?: boolean; flag?: boolean; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode,
  lm = true,
  rover = true,
  flag = true,
  children,
}) => {
  const L = LOOKS[mode];
  const camX = camera.position[0];
  const groundTex = useOwned(() => {
    const t = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 900; i++) {
        const d = rand(i, 40);
        ctx.fillStyle = d < 0.6 ? `rgba(60,56,52,${0.05 + rand(i, 41) * 0.12})` : `rgba(255,255,250,${0.08 + rand(i, 42) * 0.14})`;
        ctx.beginPath();
        ctx.ellipse(rand(i, 43) * 512, rand(i, 44) * 512, 1 + rand(i, 45) * 9, 1 + rand(i, 46) * 6, rand(i, 47) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // tiny craterlets: a dark crescent and a light rim
      for (let i = 0; i < 40; i++) {
        const x = rand(i, 50) * 512;
        const y = rand(i, 51) * 512;
        const r = 4 + rand(i, 52) * 16;
        ctx.strokeStyle = "rgba(50,46,42,0.32)";
        ctx.lineWidth = 2 + r * 0.15;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,250,0.35)";
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 1.95, Math.PI * 0.85);
        ctx.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 26);
    return t;
  }, []);
  const groundGeo = useOwned(() => {
    const g = new THREE.PlaneGeometry(140, 140, 120, 120);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i) - 20));
    g.translate(0, 0, -20);
    g.computeVertexNormals();
    return g;
  }, []);
  const rocks = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const x = (rand(i, 60) - 0.5) * 22;
        const z = 3 - rand(i, 61) * 24;
        const near = Math.abs(x) < 1.6 && z > -1.6 && z < 2.6;
        const s = 0.04 + Math.pow(rand(i, 62), 3) * 0.32;
        return near ? null : { x, z, s, seed: i };
      }).filter(Boolean) as { x: number; z: number; s: number; seed: number }[],
    [],
  );
  const sunDir = new THREE.Vector3(...L.sun).normalize();
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[MOON_BG[mode]]} />
      <fog attach="fog" args={[L.fog, 40, 160]} />
      <ambientLight intensity={L.amb[0]} color={L.amb[1]} />
      <hemisphereLight args={[L.hemi[0], L.hemi[1], L.hemi[2]]} />
      <directionalLight
        position={sunDir.clone().multiplyScalar(20).toArray()}
        intensity={L.key[0]}
        color={L.key[1]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />

      <group position={camera.position}>
        <SkyDome sun={L.sun} stops={L.sky} glow={L.glow} />
        <Stars amount={L.stars} frame={frame} />
        <Earth dir={L.earth} size={L.earthSize} sun={L.sun} />
      </group>

      <Hills colors={L.hills} camX={camX} />
      <mesh geometry={groundGeo} receiveShadow>
        <meshToonMaterial color={L.ground} map={groundTex} gradientMap={toonRamp} />
      </mesh>
      <Prints ground={L.ground} />
      {[
        [-3.6, -2.4, 1.1],
        [3.4, -7.5, 1.8],
        [-1.0, -9.5, 0.9],
        [1.8, 1.8, 0.45],
        [-5.5, -11, 2.4],
        [6.5, -3, 1.2],
      ].map(([x, z, r], i) => (
        <Crater key={i} position={[x, 0, z]} r={r} ground={L.ground} speck={L.speck} />
      ))}
      {rocks.map((r) => (
        <MoonRock key={r.seed} position={[r.x, r.s * 0.3, r.z]} size={r.s} color={rand(r.seed, 63) > 0.5 ? L.ground : L.hills[0]} seed={r.seed} />
      ))}

      {lm && <BlenderModel src="videos/what-if-moon-jump/models/lm.glb" position={LM} rotation={[0, 0.45, 0]} scale={1} heads={false} />}
      {rover && <Rover position={ROVER} yaw={-0.6} />}
      {flag && <MoonFlag position={FLAG} />}
      {children}
    </>
  );
};
