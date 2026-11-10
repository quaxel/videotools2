import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Haze, InkCylinder, Pine, PuppetLight, Ridge, Rock, SkyDome, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// A Late Cretaceous floodplain, 66 million years ago (guide/references/cretaceous-floodplain.md). Metres, y = 0 the
// ground. The camera looks toward -z: ferns and cycads in front (z > -4), the hero clearing round the origin, a lazy
// river from z -7 to -10, conifers on both banks and beyond, hazy hills from z -26 on.
// One set, re-lit by mode: `day` (warm, gold horizon), `flash` (the fireball blows the sky white-yellow), `dark` (dust
// and soot: brown-grey sky, a dim red sun, fires on the far bank), `cold` (blue-grey, frost, falling ash-snow, brown
// drooping ferns), `dream` (the purple what-if), `green` (fresh Paleocene green after the recovery).

export type CretMode = "day" | "flash" | "dark" | "cold" | "dream" | "green";

const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Look = {
  sky: [number, string][];
  glow: string;
  sun: Vec3;
  sunColor: string;
  sunSize: number;
  fog: [string, number, number];
  amb: [number, string];
  hemi: [string, string, number];
  key: [number, string];
  ground: string;
  litter: string;
  river: string;
  fern: string;
  fernDark: string;
  conifer: string;
  trunk: string;
  hills: [string, string, string];
  haze: string;
  droop: number;
};

const LOOKS: Record<CretMode, Look> = {
  day: {
    sky: [[-0.1, "#fbe6b8"], [0.0, "#f6dca6"], [0.06, "#d8e2c8"], [0.16, "#9cc8e8"], [0.36, "#5c9ad8"], [1.0, "#2e66b8"]],
    glow: "#fff2c8", sun: [-6, 5, -9], sunColor: "#fff4d0", sunSize: 8,
    fog: ["#e8dcb8", 22, 80], amb: [1.05, "#fff4e0"], hemi: ["#ffeccc", "#5a6a3a", 0.6], key: [2.5, "#ffe6b8"],
    ground: "#b8925a", litter: "#8a6a3a", river: "#4aa0a8", fern: "#5f9a48", fernDark: "#3f7a34", conifer: "#2f5a3a", trunk: "#6a4a2e",
    hills: ["#b8c4a8", "#8aa47a", "#5f8a50"], haze: "#efe4c4", droop: 0,
  },
  flash: {
    sky: [[-0.1, "#fff8e0"], [0.0, "#fff4d0"], [0.12, "#fff0b8"], [0.3, "#ffe08a"], [0.6, "#ffc860"], [1.0, "#f8a850"]],
    glow: "#ffffff", sun: [3, 9, -6], sunColor: "#ffffff", sunSize: 22,
    fog: ["#fff0c8", 18, 70], amb: [1.35, "#fff6dc"], hemi: ["#fff8e0", "#8a7a4a", 0.8], key: [3.2, "#fff4d8"],
    ground: "#c8a468", litter: "#9a7a48", river: "#8ad0c8", fern: "#7aae4e", fernDark: "#5a8a3a", conifer: "#4a7040", trunk: "#7a5a3a",
    hills: ["#f0e0b0", "#d8c890", "#b0b070"], haze: "#fff4d0", droop: 0,
  },
  dark: {
    sky: [[-0.1, "#7a5a48"], [0.0, "#6a4c3e"], [0.08, "#5a4038"], [0.2, "#463432"], [0.45, "#342828"], [1.0, "#221c1e"]],
    glow: "#c8603a", sun: [-5, 4, -9], sunColor: "#d8583a", sunSize: 6,
    fog: ["#6a5040", 12, 50], amb: [0.95, "#e8c8b0"], hemi: ["#b89880", "#2a2020", 0.7], key: [1.6, "#e8906a"],
    ground: "#7a6048", litter: "#4a3a2c", river: "#4a5a58", fern: "#6a7a40", fernDark: "#4a5a30", conifer: "#2a3a2a", trunk: "#4a3424",
    hills: ["#6a5248", "#544240", "#3e3432"], haze: "#6a5044", droop: 0.35,
  },
  cold: {
    sky: [[-0.1, "#c8d0d8"], [0.0, "#b8c2cc"], [0.1, "#98a4b4"], [0.3, "#76849a"], [1.0, "#4a566c"]],
    glow: "#dce4ec", sun: [-5, 4, -9], sunColor: "#c8ccd8", sunSize: 4,
    fog: ["#a8b4c0", 9, 40], amb: [0.95, "#d8e4f0"], hemi: ["#c8d8ec", "#3a4048", 0.7], key: [1.0, "#dce6f4"],
    ground: "#c8d0d8", litter: "#8a8e96", river: "#8aa0b0", fern: "#8a7a5a", fernDark: "#6a5a40", conifer: "#4a5048", trunk: "#4a3e34",
    hills: ["#9aa4b4", "#7e8a9c", "#626e80"], haze: "#c0cad4", droop: 0.45,
  },
  dream: {
    sky: [[-0.1, "#f8d8f0"], [0.0, "#f0c8ec"], [0.1, "#d0a8ec"], [0.3, "#9a7ad8"], [1.0, "#4a3a9a"]],
    glow: "#fff0fa", sun: [-6, 5, -9], sunColor: "#fff0f8", sunSize: 8,
    fog: ["#d8c0e8", 18, 70], amb: [1.05, "#f4e0ff"], hemi: ["#e8c8ff", "#5a4870", 0.7], key: [2.2, "#ffe0f4"],
    ground: "#b88aa0", litter: "#8a6080", river: "#7a8ad8", fern: "#6a9a7a", fernDark: "#4a7a64", conifer: "#3a4a6a", trunk: "#5a3a4a",
    hills: ["#c8a8d8", "#a488c0", "#7e66a4"], haze: "#ead4f2", droop: 0,
  },
  green: {
    sky: [[-0.1, "#e8f6e0"], [0.0, "#dcf0e0"], [0.08, "#b8e0f0"], [0.2, "#84c4ec"], [0.4, "#4a9ce0"], [1.0, "#2a6ec4"]],
    glow: "#fffbe0", sun: [-6, 8, -9], sunColor: "#fffbe8", sunSize: 8,
    fog: ["#d8eedc", 22, 80], amb: [1.15, "#ffffff"], hemi: ["#d8f4d0", "#4a7a3a", 0.7], key: [2.4, "#fff8e4"],
    ground: "#7aa04a", litter: "#5a8a3a", river: "#48b0c0", fern: "#58b048", fernDark: "#3a8a34", conifer: "#2e6a40", trunk: "#6a4a2e",
    hills: ["#a8d0b0", "#7ab07a", "#4e9050"], haze: "#e4f4e0", droop: 0,
  },
};

export const CRET_BG: Record<CretMode, string> = {
  day: "#d8e2c8",
  flash: "#fff0b8",
  dark: "#5a4038",
  cold: "#98a4b4",
  dream: "#d0a8ec",
  green: "#b8e0f0",
};

export const cretLight = (mode: CretMode, flash = 0): PuppetLight => {
  const L = LOOKS[mode];
  const sun = L.sun;
  const base: PuppetLight = { tint: L.amb[1], tintAmount: mode === "cold" ? 0.14 : 0.08, shadow: mode === "dark" ? 0.3 : 0.18, distant: [{ direction: [sun[0] / 10, Math.max(0.3, sun[1] / 10), 0.5], color: L.key[1], strength: mode === "dark" ? 0.9 : mode === "cold" ? 0.6 : 1.3 }] };
  if (flash > 0) base.distant = [...(base.distant ?? []), { direction: [0.3, 0.9, -0.4], color: "#ffffff", strength: 2.5 * flash }];
  return base;
};

// ---------- plants ----------

// One fern frond: a long flattened leaf from the crown, arching out and down.
const Frond: React.FC<{ len: number; yaw: number; pitch: number; color: string }> = ({ len, yaw, pitch, color }) => (
  <group rotation={[0, yaw, 0]}>
    <group rotation={[0, 0, -pitch]}>
      <mesh position={[len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.22]} castShadow>
        <coneGeometry args={[len * 0.13, len, 6]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1.12, 1.03, 0.4]}>
        <coneGeometry args={[len * 0.13, len, 6]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  </group>
);

export const Fern: React.FC<{ position: Vec3; size?: number; mode: CretMode; seed?: number; sway?: number }> = ({ position, size = 1, mode, seed = 0, sway = 0 }) => {
  const L = LOOKS[mode];
  const n = 8;
  return (
    <group position={position} scale={size} rotation={[sway * 0.04, rand(seed) * 6, sway * 0.03]}>
      {Array.from({ length: n }, (_, i) => {
        const up = i % 2 === 0;
        const pitch = (up ? -0.75 : -0.35) + L.droop * 1.0 + rand(seed + i) * 0.2;
        return <Frond key={i} len={0.7 + rand(seed + i * 3) * 0.3} yaw={(i / n) * Math.PI * 2 + rand(seed + i * 7) * 0.4} pitch={pitch} color={i % 3 === 0 ? L.fernDark : L.fern} />;
      })}
    </group>
  );
};

export const Cycad: React.FC<{ position: Vec3; size?: number; mode: CretMode; seed?: number }> = ({ position, size = 1, mode, seed = 0 }) => {
  const L = LOOKS[mode];
  return (
    <group position={position} scale={size}>
      <InkCylinder radius={0.16} height={0.7} position={[0, 0.35, 0]} color={L.trunk} ink={0.014} />
      <group position={[0, 0.72, 0]}>
        {Array.from({ length: 9 }, (_, i) => (
          <Frond key={i} len={0.75 + rand(seed + i) * 0.2} yaw={(i / 9) * Math.PI * 2 + rand(seed + i) * 0.3} pitch={-0.55 + L.droop * 0.9} color={i % 2 ? L.fern : L.fernDark} />
        ))}
      </group>
    </group>
  );
};

// A tall conifer (araucaria-like): a straight trunk and tiers of flat crowns.
export const Conifer: React.FC<{ position: Vec3; size?: number; mode: CretMode; seed?: number }> = ({ position, size = 1, mode, seed = 0 }) => {
  const L = LOOKS[mode];
  const tiers = 4;
  return (
    <group position={position} scale={size}>
      <InkCylinder radius={0.14} height={4.2} position={[0, 2.1, 0]} color={L.trunk} ink={0.02} />
      {Array.from({ length: tiers }, (_, i) => {
        const y = 2.0 + i * 0.75;
        const r = (1.2 - i * 0.22) * (0.9 + rand(seed + i) * 0.2);
        return (
          <group key={i} position={[0, y - L.droop * 0.15 * i, 0]}>
            <mesh castShadow scale={[1, 0.28, 1]}>
              <sphereGeometry args={[r, 12, 8]} />
              <meshToonMaterial color={i % 2 ? L.conifer : L.fernDark} gradientMap={toonRamp} />
            </mesh>
            <mesh scale={[1.04, 0.3, 1.04]}>
              <sphereGeometry args={[r, 12, 8]} />
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- weather ----------

const Snow: React.FC<{ frame: number; camera: CameraShot; count?: number }> = ({ frame, camera, count = 260 }) => {
  const geo = useOwned(() => new THREE.SphereGeometry(0.025, 6, 4));
  const mat = useOwned(() => new THREE.MeshBasicMaterial({ color: "#f4f6fa", fog: false }));
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const [cx, , cz] = camera.position;
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = cx + (rand(i) - 0.5) * 9 + Math.sin(frame * 0.03 + i) * 0.15;
      const z = cz - 3.2 - rand(i + 300) * 9;
      const fall = (rand(i + 700) * 5 + frame * (0.012 + rand(i + 900) * 0.01)) % 5;
      o.position.set(x, 4.5 - fall, z);
      o.scale.setScalar(0.7 + rand(i + 50) * 0.8);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group userData={{ ghost: true }}>
      <instancedMesh ref={ref} args={[geo, mat, count]} />
    </group>
  );
};

// A billowing cel cloud of dust or soot: lumps that swell over `t` (0..1).
export const DustCloud: React.FC<{ position: Vec3; t: number; size: number; color: string; seed?: number }> = ({ position, t, size, color, seed = 0 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rand(seed + i);
      const r = size * (0.25 + rand(seed + i * 3) * 0.35) * (0.4 + 0.6 * t);
      const p: Vec3 = [Math.cos(a) * size * 0.45 * t, (rand(seed + i * 5) - 0.3) * size * 0.4 * t + i * 0.02 * size, Math.sin(a) * size * 0.2];
      return (
        <group key={i} position={p}>
          <mesh>
            <sphereGeometry args={[Math.max(0.01, r), 14, 10]} />
            <meshToonMaterial color={i % 3 === 0 ? new THREE.Color(color).multiplyScalar(0.8) : color} gradientMap={toonRamp} />
          </mesh>
          <mesh scale={1.05}>
            <sphereGeometry args={[Math.max(0.01, r), 14, 10]} />
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// ---------- the set ----------

export const BURROW: Vec3 = [-0.9, 0, 0.6];

export const CretaceousSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode: CretMode;
  sunDim?: number; // 0..1 dark mode: how far the sun has faded
  streak?: number | null; // 0..1 a fireball crossing the sky (null: none)
  burrow?: boolean;
  fires?: number; // 0..1 the far-bank fires grow in
  children?: React.ReactNode;
}> = ({ camera, frame, mode, sunDim = 0, streak = null, burrow = true, fires = 0, children }) => {
  const L = LOOKS[mode];
  const camX = camera.position[0];
  const ground = useOwned(
    () => {
      const t = canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 260; i++) {
          ctx.fillStyle = i % 3 ? "rgba(70,50,30,0.10)" : "rgba(255,250,235,0.14)";
          ctx.beginPath();
          ctx.ellipse(rand(i) * 512, rand(i + 99) * 512, 6 + rand(i + 7) * 30, 3 + rand(i + 13) * 12, rand(i + 17) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // leaf litter and twigs
        for (let i = 0; i < 160; i++) {
          ctx.strokeStyle = "rgba(60,40,20,0.22)";
          ctx.lineWidth = 2;
          const x = rand(i + 400) * 512;
          const y = rand(i + 500) * 512;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rand(i + 600) - 0.5) * 30, y + (rand(i + 700) - 0.5) * 12);
          ctx.stroke();
        }
      });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(14, 12);
      return t;
    },
  );
  const fernSpots = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const x = (rand(i + 3) - 0.5) * 12;
        const z = 2.2 - rand(i + 11) * 8.5;
        return { x, z, s: 0.6 + rand(i + 21) * 0.6, seed: i * 7 };
      }).filter((p) => !(Math.abs(p.x - 0.4) < 1.6 && p.z > -3.2 && p.z < 1.5) && !(Math.abs(p.x - BURROW[0]) < 1.0 && p.z > BURROW[2] - 0.6 && p.z < BURROW[2] + 3.2)),
    [],
  );
  const sunPos = new THREE.Vector3(...L.sun).normalize().multiplyScalar(260);
  const sunCol = mode === "dark" ? new THREE.Color(L.sunColor).lerp(new THREE.Color("#3a2a28"), sunDim * 0.8) : new THREE.Color(L.sunColor);
  const sway = Math.sin(frame * 0.05) * (mode === "cold" ? 0.3 : 1);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[CRET_BG[mode]]} />
      <fog attach="fog" args={L.fog} />
      <ambientLight intensity={L.amb[0] * (mode === "dark" ? 1 - sunDim * 0.35 : 1)} color={L.amb[1]} />
      <hemisphereLight args={[L.hemi[0], L.hemi[1], L.hemi[2]]} />
      <directionalLight
        position={[L.sun[0], Math.max(4, L.sun[1]), L.sun[2] + 14]}
        intensity={L.key[0] * (mode === "dark" ? 1 - sunDim * 0.6 : 1)}
        color={L.key[1]}
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
        <SkyDome sun={L.sun} stops={L.sky} glow={L.glow} />
        <mesh position={sunPos.toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[L.sunSize * (mode === "dark" ? 1 - sunDim * 0.3 : 1), 48]} />
          <meshBasicMaterial color={sunCol} fog={false} toneMapped={false} depthWrite={false} transparent opacity={mode === "cold" ? 0.5 : 1} />
        </mesh>
        {streak !== null && <Fireball p={streak} />}
      </group>

      <Ridge z={-60} shift={camX * 0.7} width={260} low={4} high={14} peaks={8} color={L.hills[0]} seed={4} />
      <Haze z={-50} color={L.haze} />
      <Ridge z={-40} shift={camX * 0.4} width={180} low={2} high={7} peaks={10} color={L.hills[1]} seed={9} />
      <Haze z={-34} color={L.haze} />
      <Ridge z={-28} shift={-camX * 0.1} width={120} low={0.8} high={3} peaks={14} color={L.hills[2]} seed={15} />

      {/* ground and river */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[90, 70]} />
        <meshToonMaterial color={L.ground} gradientMap={toonRamp} map={ground} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -8.6]}>
        <planeGeometry args={[90, 3.0]} />
        <meshToonMaterial color={L.river} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={`rip${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[((rand(i) * 20 + frame * 0.01 * (mode === "cold" ? 0 : 1)) % 20) - 10, 0.015, -7.4 - rand(i + 5) * 2.4]}>
          <planeGeometry args={[0.6 + rand(i + 9) * 0.8, 0.04]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={mode === "cold" ? 0.25 : 0.45} depthWrite={false} />
        </mesh>
      ))}

      {/* conifers on both banks */}
      {Array.from({ length: 16 }, (_, i) => {
        const near = i < 7;
        const x = near ? -9 + i * 3 + rand(i) * 1.2 : -16 + (i - 7) * 4 + rand(i) * 1.5;
        const z = near ? -5.4 - rand(i + 3) * 1.2 : -12 - rand(i + 3) * 4;
        if (near && Math.abs(x - 0.5) < 2.2) return null;
        return <Conifer key={`c${i}`} position={[x, 0, z]} size={0.9 + rand(i + 8) * 0.5} mode={mode} seed={i} />;
      })}
      {Array.from({ length: 30 }, (_, i) => (
        <Pine key={`p${i}`} position={[-24 + i * 1.6 + rand(i) * 0.8, 0, -18 - rand(i + 40) * 3]} scale={1.4 + rand(i + 20) * 1.2} color={L.conifer} ink={0} />
      ))}

      {/* undergrowth */}
      {fernSpots.map((p, i) => (i % 4 === 3 ? <Cycad key={`y${i}`} position={[p.x, 0, p.z]} size={p.s} mode={mode} seed={p.seed} /> : <Fern key={`f${i}`} position={[p.x, 0, p.z]} size={p.s} mode={mode} seed={p.seed} sway={sway * (1 + (i % 3) * 0.3)} />))}
      <Rock position={[1.9, 0.05, 1.2]} size={0.28} color={mode === "cold" ? "#9aa0aa" : "#8a7a68"} seed={2} />
      <Rock position={[-2.2, 0.05, -1.4]} size={0.4} color={mode === "cold" ? "#9aa0aa" : "#7a6a5a"} seed={5} />

      {/* the burrow: a mound with a dark hole */}
      {burrow && (
        <group position={BURROW}>
          <mesh scale={[1, 0.32, 1]} receiveShadow castShadow>
            <sphereGeometry args={[0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color={mode === "cold" ? "#b8bcc4" : L.litter} gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0, 0.085, 0.12]} rotation={[-1.1, 0, 0]}>
            <circleGeometry args={[0.1, 20]} />
            <meshBasicMaterial color="#1a1210" />
          </mesh>
        </group>
      )}

      {fires > 0 && <FarFires frame={frame} grow={fires} />}
      {mode === "cold" && <Snow frame={frame} camera={camera} />}
      {mode === "dark" && <Snow frame={frame * 0.6} camera={camera} count={120} />}
      {children}
    </>
  );
};

// The fireball: a white-hot head with a long orange tail, crossing the dome from upper right toward lower left.
const Fireball: React.FC<{ p: number }> = ({ p }) => {
  const dir = new THREE.Vector3(1, 0.55, -1.2).normalize();
  const to = new THREE.Vector3(-0.6, 0.12, -1).normalize();
  const at = dir.clone().lerp(to, p).normalize().multiplyScalar(200);
  const tail = dir.clone().sub(to).normalize();
  const len = 30 + p * 40;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tail);
  return (
    <group position={at.toArray()}>
      <mesh>
        <sphereGeometry args={[3.2 + p * 2, 16, 12]} />
        <meshBasicMaterial color="#fffbe8" fog={false} toneMapped={false} />
      </mesh>
      <mesh quaternion={q} position={tail.clone().multiplyScalar(len / 2).toArray()}>
        <coneGeometry args={[3.2 + p * 2, len, 16, 1, true]} />
        <meshBasicMaterial color="#ffb050" fog={false} toneMapped={false} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh quaternion={q} position={tail.clone().multiplyScalar(len * 0.3).toArray()}>
        <coneGeometry args={[2.2 + p * 1.5, len * 0.6, 16, 1, true]} />
        <meshBasicMaterial color="#fff2c0" fog={false} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
};

// Burning forest on the far bank: flickering orange glows under dark soot plumes.
const FarFires: React.FC<{ frame: number; grow: number }> = ({ frame, grow }) => (
  <group userData={{ ghost: true }}>
    {[-7, -3.5, 2.5, 6.5].map((x, i) => {
      const fl = 0.8 + 0.2 * Math.sin(frame * 0.4 + i * 2) * Math.sin(frame * 0.17 + i);
      return (
        <group key={i} position={[x, 0, -11.5 - (i % 2) * 2]} scale={Math.max(0.001, Math.min(1, grow * 1.6 - i * 0.15))}>
          <mesh position={[0, 0.5 * fl, 0]}>
            <coneGeometry args={[0.7, 1.4 * fl, 8]} />
            <meshBasicMaterial color={i % 2 ? "#ff8a30" : "#ffb040"} toneMapped={false} fog={false} />
          </mesh>
          {Array.from({ length: 5 }, (_, k) => {
            const t = ((frame * 0.008 + k / 5 + i * 0.13) % 1);
            return (
              <mesh key={k} position={[Math.sin(k + i) * 0.4 + t * 1.5, 1.3 + t * 6, 0]}>
                <sphereGeometry args={[0.5 + t * 1.6, 10, 8]} />
                <meshToonMaterial color="#2a2222" gradientMap={toonRamp} transparent opacity={0.85 * (1 - t * 0.6)} />
              </mesh>
            );
          })}
        </group>
      );
    })}
  </group>
);
