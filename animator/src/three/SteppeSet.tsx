import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo, Label } from "./kit";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { SkyDome } from "./sky";
import { Hills } from "./FarmyardSet";
import { Haze } from "./LakeSet";
import { Blob, useOwned } from "./BalloonSets";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// The open Mongolian steppe, built from photo references (guide/references/mongol-steppe.md): flat short grass to the
// horizon (tan and olive patches, no trees), low round bare ridges fading in layers, a big sky. A dirt post road runs
// along x at z = ROAD.z (riders gallop along it in profile; truck the camera sideways). Modes give the colour
// families: dawn (orange), day (blue sky, yellow-green), dusk (violet), night (deep blue, stars, moon), sunset (pink),
// desert (ochre gravel instead of grass). Props: `Ger`, `YamHouse`, `HitchRail`, `MilePost`, `Goat`, `Torch`.
// Light puppets with `steppeLight(mode)`.

type Vec3 = [number, number, number];
export type SteppeMode = "dawn" | "day" | "dusk" | "night" | "sunset" | "desert";
export const ROAD = { z: 0, half: 0.55 };

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Look = {
  sky: [number, string][];
  glow: string;
  sun: Vec3;
  disc?: string;
  moon?: boolean;
  stars?: boolean;
  fog: string;
  ground: { base: string; blades: string[]; patch: [string, string] };
  ridges: [string, string, string];
  haze: string;
  ambient: [number, string];
  key: [number, string];
  hemi: [string, string, number];
  road: string;
  clouds?: string;
};

const LOOKS: Record<SteppeMode, Look> = {
  dawn: {
    sky: [[-0.1, "#f6c890"], [0.0, "#ffd29a"], [0.06, "#f6b07a"], [0.14, "#d88a7a"], [0.3, "#8a7aa8"], [0.6, "#4a5a9a"], [1.0, "#2a3a7a"]],
    glow: "#fff0c0",
    sun: [-30, 3.2, -60],
    disc: "#fff2c8",
    fog: "#f0c09a",
    ground: { base: "#a89a58", blades: ["#c8a868", "#8a8a48", "#b89a5a", "#6e7a3e"], patch: ["rgba(90,80,40,0.3)", "rgba(255,200,140,0.22)"] },
    ridges: ["#b89aa8", "#9a7a98", "#7a6a7a"],
    haze: "#ffd2b0",
    ambient: [1.0, "#ffe0c0"],
    key: [2.6, "#ffb070"],
    hemi: ["#ffd8b0", "#6a5a3a", 0.5],
    road: "#b08a5a",
    clouds: "#ffc0a0",
  },
  day: {
    sky: [[-0.1, "#e8f0f2"], [0.0, "#d6e8f4"], [0.08, "#a8cdf0"], [0.16, "#78ace6"], [0.32, "#4a88d8"], [0.6, "#2e6ec8"], [1.0, "#2258b0"]],
    glow: "#fff6dc",
    sun: [-6, 9, 5],
    fog: "#d8e6ee",
    ground: { base: "#9aa856", blades: ["#c2ad70", "#7a9440", "#a8bc62", "#647e36"], patch: ["rgba(70,90,30,0.3)", "rgba(230,215,140,0.25)"] },
    ridges: ["#a8b4c8", "#8a9ab0", "#8a9a6a"],
    haze: "#e6eef4",
    ambient: [1.2, "#ffffff"],
    key: [2.5, "#fff4e0"],
    hemi: ["#cfe4ff", "#6a7a3a", 0.6],
    road: "#b8986a",
    clouds: "#ffffff",
  },
  dusk: {
    sky: [[-0.1, "#e8a0a8"], [0.0, "#f0a8a0"], [0.06, "#c888a8"], [0.16, "#8a68a8"], [0.32, "#5a4a8a"], [0.6, "#3a3070"], [1.0, "#241e52"]],
    glow: "#ffd0b0",
    sun: [40, 2.0, -70],
    disc: "#ffd8b8",
    fog: "#b888a8",
    ground: { base: "#7a7a5a", blades: ["#9a8a6a", "#5e6a44", "#8a8a5a", "#4e5a3a"], patch: ["rgba(50,40,60,0.3)", "rgba(220,170,180,0.18)"] },
    ridges: ["#9a7aa8", "#7a5a90", "#5a4a6a"],
    haze: "#d8a0b8",
    ambient: [0.9, "#e0c8f0"],
    key: [2.0, "#ffa890"],
    hemi: ["#c8a8e0", "#3a3448", 0.5],
    road: "#8a6a5a",
    clouds: "#f0b0c0",
  },
  night: {
    sky: [[-0.1, "#2a3a6a"], [0.0, "#2e4478"], [0.08, "#22346a"], [0.2, "#182858"], [0.45, "#101c44"], [1.0, "#0a1232"]],
    glow: "#c8d8ff",
    sun: [25, 30, -60],
    moon: true,
    stars: true,
    fog: "#1a2850",
    ground: { base: "#3a4a5a", blades: ["#4a5a6a", "#2e3e4e", "#55687a", "#26323e"], patch: ["rgba(10,20,40,0.35)", "rgba(120,150,200,0.12)"] },
    ridges: ["#2a3a66", "#22305a", "#1a2648"],
    haze: "#3a5080",
    ambient: [0.7, "#8aa0e0"],
    key: [1.1, "#a8c0ff"],
    hemi: ["#5a70b0", "#101828", 0.45],
    road: "#4a4a5a",
  },
  sunset: {
    sky: [[-0.1, "#ffb0a0"], [0.0, "#ffb898"], [0.06, "#f89aa0"], [0.14, "#e080a8"], [0.3, "#a868a8"], [0.6, "#6a4a90"], [1.0, "#3a2e6a"]],
    glow: "#ffe0b0",
    sun: [-45, 2.6, -70],
    disc: "#ffe6c0",
    fog: "#f0a0a0",
    ground: { base: "#9a8a5a", blades: ["#c89a78", "#7a7a48", "#b88a6a", "#5e6a3e"], patch: ["rgba(80,50,50,0.28)", "rgba(255,190,170,0.22)"] },
    ridges: ["#c890a8", "#a07098", "#784e78"],
    haze: "#ffc0b8",
    ambient: [1.0, "#ffd8d0"],
    key: [2.4, "#ff9a80"],
    hemi: ["#ffc0c8", "#5a3a3a", 0.5],
    road: "#a8786a",
    clouds: "#ffb8b0",
  },
  desert: {
    sky: [[-0.1, "#f4e4c8"], [0.0, "#eedcc0"], [0.08, "#d0d8e0"], [0.18, "#98b8d8"], [0.36, "#6a98c8"], [1.0, "#3a6aa8"]],
    glow: "#fff4d8",
    sun: [-6, 9, 5],
    fog: "#ecd8b8",
    ground: { base: "#c89a58", blades: ["#a8803e", "#d8b070", "#b88a48", "#8a6a3a"], patch: ["rgba(120,80,30,0.28)", "rgba(255,230,180,0.25)"] },
    ridges: ["#d0b098", "#b8907a", "#a07858"],
    haze: "#f4e0c4",
    ambient: [1.3, "#fff4e0"],
    key: [2.6, "#fff0d0"],
    hemi: ["#ffeccc", "#8a6a3a", 0.6],
    road: "#a87a48",
  },
};

export const steppeBg = (mode: SteppeMode) => LOOKS[mode].fog;

// Low sun at dawn, dusk and sunset lights the puppets from the side; by day a warm white key; at night a cool moon.
export const steppeLight = (mode: SteppeMode, lantern?: Vec3, frame = 0): PuppetLight => {
  const L = LOOKS[mode];
  const dir = new THREE.Vector3(...L.sun).normalize();
  const strength = mode === "night" ? 0.6 : mode === "day" || mode === "desert" ? 1.1 : 1.6;
  return {
    tint: mode === "night" ? "#c8d6ff" : "#fff2e0",
    shadow: mode === "night" ? 0.2 : 0.14,
    distant: [{ direction: [dir.x, Math.max(0.2, dir.y), Math.max(0.15, dir.z)], color: L.key[1], strength }],
    points: lantern ? [{ position: lantern, color: "#ffb05a", strength: 2.4 * (0.92 + 0.08 * Math.sin(frame * 0.5)), range: 2.4 }] : [],
  };
};

// ---------- ground ----------

const groundCanvas = (L: Look, mode: SteppeMode) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = L.ground.base;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = i % 2 ? L.ground.patch[0] : L.ground.patch[1];
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 1024, 30 + rand(i + 9) * 60, 18 + rand(i + 11) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const n = mode === "desert" ? 2500 : 9000;
    for (let i = 0; i < n; i++) {
      const x = rand(i) * 1024;
      const y = rand(i + 7000) * 1024;
      ctx.strokeStyle = L.ground.blades[Math.floor(rand(i + 900) * 4)];
      ctx.lineWidth = 2 + rand(i + 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 8, y - 6 - rand(i + 4) * 9);
      ctx.stroke();
    }
    if (mode === "desert") {
      // gravel
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = rand(i + 50) > 0.5 ? "rgba(110,70,30,0.55)" : "rgba(250,225,180,0.6)";
        ctx.beginPath();
        ctx.arc(rand(i + 3000) * 1024, rand(i + 3100) * 1024, 1.5 + rand(i + 3200) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

const patchCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    for (let i = 0; i < 26; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const dark = rand(i + 70) > 0.5;
      g.addColorStop(0, dark ? "rgba(40,40,20,0.28)" : "rgba(255,240,190,0.2)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(rand(i) * 512, rand(i + 20) * 512);
      ctx.scale(60 + rand(i + 40) * 90, 40 + rand(i + 41) * 60);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

// A rutted dirt road: two wheel ruts and hoof-churned middle, soft edges.
const roadCanvas = (color: string) =>
  canvasTexture(1024, 128, (ctx) => {
    ctx.clearRect(0, 0, 1024, 128);
    const c = new THREE.Color(color);
    const rgb = (k: number, a: number) => `rgba(${Math.round(c.r * 255 * k)},${Math.round(c.g * 255 * k)},${Math.round(c.b * 255 * k)},${a})`;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, rgb(1, 0));
    g.addColorStop(0.18, rgb(1, 0.95));
    g.addColorStop(0.82, rgb(1, 0.95));
    g.addColorStop(1, rgb(1, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 128);
    for (const y of [38, 90]) {
      ctx.fillStyle = rgb(0.78, 0.6);
      ctx.fillRect(0, y - 4, 1024, 8);
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? rgb(0.75, 0.5) : rgb(1.2, 0.45);
      ctx.beginPath();
      ctx.ellipse(rand(i + 1) * 1024, 24 + rand(i + 2) * 80, 3 + rand(i + 3) * 5, 2 + rand(i + 4) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const Tufts: React.FC<{ L: Look; mode: SteppeMode; clear: [number, number, number][]; area: [number, number, number, number] }> = ({ L, mode, clear, area }) => {
  const [x0, x1, z0, z1] = area;
  const mesh = useOwned(() => {
    const blade = new THREE.ConeGeometry(0.012, 0.1, 3);
    blade.translate(0, 0.05, 0);
    const pos: number[] = [];
    [-0.35, 0, 0.35].forEach((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.translate((k - 1) * 0.012, 0, (k % 2) * 0.01);
      pos.push(...(b.toNonIndexed().attributes.position.array as Float32Array));
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    merged.computeVertexNormals();
    const count = Math.round(((mode === "desert" ? 600 : 3200) * ((x1 - x0) * (z1 - z0))) / 182);
    const m = new THREE.InstancedMesh(merged, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; n < count && i < count * 4; i++) {
      const x = x0 + rand(i * 3 + 1) * (x1 - x0);
      const z = z0 + rand(i * 3 + 2) * (z1 - z0);
      if (Math.abs(z - ROAD.z) < ROAD.half) continue;
      if (clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
      o.position.set(x, 0, z);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.7 + rand(i * 7) * 0.9;
      o.scale.set(k, k * (0.8 + rand(i * 11) * 0.6), k);
      o.updateMatrix();
      m.setMatrixAt(n, o.matrix);
      m.setColorAt(n, c.set(L.ground.blades[Math.floor(rand(i * 13) * 4)]));
      n++;
    }
    m.count = n;
    m.receiveShadow = true;
    return {
      mesh: m,
      dispose: () => {
        merged.dispose();
        blade.dispose();
        (m.material as THREE.Material).dispose();
        m.dispose();
      },
    };
  }, [mode, x0, x1, z0, z1]);
  return <primitive object={mesh.mesh} />;
};

// ---------- sky details ----------

const Stars: React.FC = () => {
  const geo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = rand(i) * Math.PI * 2;
      const y = 0.08 + rand(i + 99) * 0.9;
      const r = Math.sqrt(1 - y * y);
      p.push(Math.cos(a) * r * 260, y * 260, Math.sin(a) * r * 260);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial color="#fff8e0" size={2.2} sizeAttenuation={false} fog={false} toneMapped={false} />
    </points>
  );
};

// Long flat streaks of cloud (the steppe's big skies), riding with the camera.
const Clouds: React.FC<{ color: string; frame: number }> = ({ color, frame }) => (
  <>
    {Array.from({ length: 7 }, (_, i) => {
      const a = -0.9 + i * 0.32 + frame * 0.0002;
      const y = 22 + rand(i + 4) * 45;
      return (
        <mesh key={i} position={[Math.sin(a) * 200, y, -Math.cos(a) * 200]} rotation={[0, -a, 0]} scale={[40 + rand(i) * 50, 3 + rand(i + 2) * 3, 1]}>
          <circleGeometry args={[1, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      );
    })}
  </>
);

// ---------- the set ----------

export const SteppeSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode: SteppeMode;
  road?: boolean;
  clear?: [number, number, number][];
  area?: [number, number, number, number]; // x0, x1, z0, z1 of the grass tufts
  children?: React.ReactNode;
}> = ({ camera, frame, mode, road = true, clear = [], area = [-7, 7, -7, 6], children }) => {
  const L = LOOKS[mode];
  const camX = camera.position[0];
  const ground = useOwned(() => {
    const t = groundCanvas(L, mode);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 15);
    t.anisotropy = 8;
    return t;
  }, [mode]);
  const patches = useOwned(() => {
    const t = patchCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2.2);
    return t;
  });
  const roadTex = useOwned(() => {
    const t = roadCanvas(L.road);
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(8, 1);
    return t;
  }, [mode]);
  const sunDir = new THREE.Vector3(...L.sun).normalize();
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[L.fog]} />
      <fog attach="fog" args={[L.fog, 30, 110]} />
      <ambientLight intensity={L.ambient[0]} color={L.ambient[1]} />
      <hemisphereLight args={L.hemi} />
      <directionalLight
        position={sunDir.clone().multiplyScalar(12).toArray()}
        intensity={L.key[0]}
        color={L.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />

      <group position={camera.position}>
        <SkyDome sun={L.sun} stops={L.sky} glow={L.glow} />
        {L.disc && (
          <mesh position={sunDir.clone().multiplyScalar(270).toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
            <circleGeometry args={[9, 48]} />
            <meshBasicMaterial color={L.disc} fog={false} toneMapped={false} depthWrite={false} />
          </mesh>
        )}
        {L.moon && (
          <mesh position={sunDir.clone().multiplyScalar(270).toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
            <circleGeometry args={[7, 48]} />
            <meshBasicMaterial color="#f4f0dc" fog={false} toneMapped={false} depthWrite={false} />
          </mesh>
        )}
        {L.stars && <Stars />}
        {L.clouds && <Clouds color={L.clouds} frame={frame} />}
      </group>

      <Hills z={-90} shift={camX * 0.85} width={360} low={3} high={9} color={L.ridges[0]} seed={3} />
      <Haze z={-80} color={L.haze} />
      <Hills z={-60} shift={camX * 0.6} width={260} low={1.5} high={5.5} color={L.ridges[1]} seed={7} />
      <Haze z={-52} color={L.haze} />
      <Hills z={-36} shift={camX * 0.3} width={200} low={0.3} high={2.2} color={L.ridges[2]} seed={11} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -15]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={ground} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -15]}>
        <planeGeometry args={[120, 80]} />
        <meshBasicMaterial map={patches} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {road && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, ROAD.z]}>
          <planeGeometry args={[120, ROAD.half * 2.6]} />
          <meshBasicMaterial map={roadTex} transparent depthWrite={false} toneMapped={mode === "night"} />
        </mesh>
      )}
      <Tufts L={L} mode={mode} clear={clear} area={area} />
      {children}
    </>
  );
};

// ---------- props ----------

const INK = "#1d1712";

// A cone with an ink hull (the kit has boxes and cylinders only).
const InkCone: React.FC<{ radius: number; height: number; position?: Vec3; color: string; ink?: number; segments?: number }> = ({ radius, height, position = [0, 0, 0], color, ink = 0.02, segments = 32 }) => (
  <group position={position}>
    <mesh castShadow receiveShadow>
      <coneGeometry args={[radius, height, segments]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh scale={[1 + ink / radius, 1 + ink / height, 1 + ink / radius]}>
      <coneGeometry args={[radius, height, segments]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// A ger: white felt drum, low cone roof, rope bands, an orange-red door facing +z, a stovepipe. Radius `r`.
export const Ger: React.FC<{ position: Vec3; rotationY?: number; r?: number; door?: string; smoke?: boolean }> = ({ position, rotationY = 0, r = 1.25, door = "#d0582a" }) => {
  const wall = r * 0.72;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkCylinder radius={r} height={wall} position={[0, wall / 2, 0]} color="#efe8d8" ink={0.02} />
      <InkCone radius={r * 1.06} height={r * 0.5} position={[0, wall + r * 0.25, 0]} color="#e6dcc8" />
      {/* rope bands round the wall and roof */}
      {[0.22, 0.6].map((k) => (
        <InkCylinder key={k} radius={r + 0.012} height={0.03} position={[0, wall * k, 0]} color="#6a4a32" ink={0} />
      ))}
      <InkCylinder radius={r * 0.16} height={0.06} position={[0, wall + r * 0.48, 0]} color="#c84a2a" ink={0.01} />
      <InkCylinder radius={0.04} height={0.4} position={[r * 0.08, wall + r * 0.6, 0]} color="#3a3430" ink={0.008} />
      {/* door with a painted frame */}
      <InkBox size={[0.56, 0.84, 0.06]} position={[0, 0.42, r - 0.01]} color="#e8a838" ink={0.012} />
      <InkBox size={[0.42, 0.72, 0.07]} position={[0, 0.39, r + 0.005]} color={door} ink={0.008} />
      <InkBox size={[0.3, 0.025, 0.02]} position={[0, 0.5, r + 0.045]} color="#f2c84a" ink={0} />
      <InkBox size={[0.3, 0.025, 0.02]} position={[0, 0.28, r + 0.045]} color="#f2c84a" ink={0} />
    </group>
  );
};

// The yam post house (our reading of Polo): a long timber hall with a low tiled roof, red posts, a door, a sign board
// and a banner pole. Front faces +z; `w` wide.
export const YamHouse: React.FC<{ position: Vec3; w?: number; sign?: string; frame?: number; lit?: number }> = ({ position, w = 3.6, sign = "YAM", frame = 0, lit = 0 }) => {
  const d = 1.5;
  const h = 1.45;
  return (
    <group position={position}>
      <InkBox size={[w, h, d]} position={[0, h / 2, 0]} color="#c89a62" ink={0.02} />
      {/* plank lines */}
      {[0.35, 0.7, 1.05].map((y) => (
        <InkBox key={y} size={[w + 0.01, 0.02, 0.02]} position={[0, y, d / 2 + 0.005]} color="#8a6038" ink={0} />
      ))}
      {/* roof: two slabs with an overhang */}
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[w + 0.7, 0.1, d * 0.72]} position={[0, h + 0.25, s * d * 0.3]} rotation={[s * 0.5, 0, 0]} color="#4a6a6a" ink={0.018} />
      ))}
      <InkBox size={[w + 0.8, 0.12, 0.14]} position={[0, h + 0.44, 0]} color="#3a5454" ink={0.014} />
      {/* red posts along the front veranda */}
      {Array.from({ length: 5 }, (_, i) => (
        <InkCylinder key={i} radius={0.05} height={h + 0.05} position={[-w / 2 + 0.15 + (i * (w - 0.3)) / 4, (h + 0.05) / 2, d / 2 + 0.3]} color="#b8382a" ink={0.01} />
      ))}
      <InkBox size={[w + 0.3, 0.08, 0.12]} position={[0, h + 0.05, d / 2 + 0.3]} color="#8a2a20" ink={0.01} />
      {/* door and two windows (lit at night) */}
      <InkBox size={[0.6, 0.98, 0.04]} position={[0.2, 0.49, d / 2 + 0.01]} color="#6a3a22" ink={0.01} />
      {[-1.1, 1.1].map((x) => (
        <group key={x}>
          <InkBox size={[0.5, 0.36, 0.04]} position={[x, 0.85, d / 2 + 0.01]} color="#4a2a18" ink={0.008} />
          <mesh position={[x, 0.85, d / 2 + 0.035]}>
            <planeGeometry args={[0.42, 0.28]} />
            <meshBasicMaterial color={lit > 0 ? "#ffc062" : "#2a1a12"} toneMapped={false} />
          </mesh>
          {lit > 0 && <Halo position={[x, 0.85, d / 2 + 0.1]} size={1.0} color="#ffb347" strength={0.5 * lit * (0.9 + 0.1 * Math.sin(frame * 0.4 + x))} />}
        </group>
      ))}
      <Label text={sign} position={[-0.75, h + 0.2, d / 2 + 0.4]} width={0.8} bg="#f2d070" />
      {/* banner pole with a red pennant */}
      <InkCylinder radius={0.03} height={3.0} position={[w / 2 + 0.4, 1.5, d / 2]} color="#5a3a22" ink={0.008} />
      <group position={[w / 2 + 0.43, 2.75, d / 2]} rotation={[0, Math.sin(frame * 0.08) * 0.25, 0]}>
        <InkBox size={[0.6, 0.32, 0.02]} position={[0.3, 0, 0]} rotation={[0, 0, Math.sin(frame * 0.15) * 0.05]} color="#c8302a" ink={0.008} />
      </group>
    </group>
  );
};

// A hitching rail: two posts and a pole, `len` long along x.
export const HitchRail: React.FC<{ position: Vec3; len?: number }> = ({ position, len = 2.4 }) => (
  <group position={position}>
    {[-1, 1].map((s) => (
      <InkCylinder key={s} radius={0.045} height={0.95} position={[(s * len) / 2, 0.475, 0]} color="#7a5032" ink={0.01} />
    ))}
    <InkCylinder radius={0.03} height={len + 0.1} position={[0, 0.9, 0]} color="#8a5a38" ink={0.008} rotation={[0, 0, Math.PI / 2]} />
  </group>
);

// A wooden mile post with a painted board.
export const MilePost: React.FC<{ position: Vec3; text: string; appear?: number; rotationY?: number }> = ({ position, text, appear, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.1, 1.3, 0.1]} position={[0, 0.65, 0]} color="#7a5032" ink={0.01} />
    <Label text={text} position={[0, 1.2, 0.06]} width={0.62} appear={appear} bg="#f6e6c0" />
  </group>
);

// A small goat (white or brown), facing +x. `chew` wags the jaw; `butt` 0..1 lunges the head forward and down.
export const Goat: React.FC<{ position: Vec3; rotationY?: number; coat?: string; chew?: number; butt?: number; hop?: number }> = ({ position, rotationY = 0, coat = "#f2ece0", chew = 0, butt = 0, hop = 0 }) => (
  <group position={[position[0], position[1] + hop, position[2]]} rotation={[0, rotationY, 0]}>
    {[[0.16, 0.07], [0.16, -0.07], [-0.16, 0.07], [-0.16, -0.07]].map(([x, z], i) => (
      <InkCylinder key={i} radius={0.025} height={0.28} position={[x + butt * 0.04 * Math.sign(x), 0.14, z]} color="#5a4a3a" ink={0.006} />
    ))}
    <Blob position={[0, 0.36, 0]} scale={[0.26, 0.14, 0.13]} color={coat} ink={0.05} />
    <group position={[0.24 + butt * 0.12, 0.46 - butt * 0.12, 0]} rotation={[0, 0, 0.5 - butt * 1.1]}>
      <Blob position={[0.03, 0.06, 0]} scale={[0.06, 0.1, 0.06]} color={coat} ink={0.06} />
      <group position={[0.08, 0.14, 0]} rotation={[0, 0, -0.9 + butt * 0.6]}>
        <Blob position={[0.06, 0, 0]} scale={[0.1, 0.055, 0.055]} color={coat} ink={0.06} />
        <InkBox size={[0.04, 0.05 + chew * 0.02, 0.03]} position={[0.14, -0.05 - chew * 0.02, 0]} color="#e8e0d0" ink={0.004} />
        {/* horns and ears */}
        {[-1, 1].map((k) => (
          <group key={k}>
            <mesh position={[-0.02, 0.07, k * 0.03]} rotation={[k * 0.2, 0, 0.7]}>
              <coneGeometry args={[0.015, 0.1, 6]} />
              <meshToonMaterial color="#8a7a60" gradientMap={toonRamp} />
            </mesh>
            <mesh position={[0.0, 0.0, k * 0.065]} rotation={[k * 1.2, 0, 0.3]}>
              <coneGeometry args={[0.02, 0.07, 6]} />
              <meshToonMaterial color={coat} gradientMap={toonRamp} />
            </mesh>
            <mesh position={[0.08, 0.02, k * 0.045]}>
              <sphereGeometry args={[0.009, 6, 6]} />
              <meshBasicMaterial color="#161212" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
    <Blob position={[-0.27, 0.44, 0]} scale={[0.04, 0.05, 0.03]} color={coat} ink={0.05} />
  </group>
);

// A torch on a pole (night), with a flickering point light.
export const Torch: React.FC<{ position: Vec3; frame: number; seed?: number }> = ({ position, frame, seed = 0 }) => {
  const fl = 0.85 + 0.15 * Math.sin(frame * 0.7 + seed) * Math.sin(frame * 0.31 + seed * 2);
  return (
    <group position={position} userData={{ ghost: true }}>
      <InkCylinder radius={0.03} height={1.5} position={[0, 0.75, 0]} color="#4a3020" ink={0.008} />
      <InkCylinder radius={0.06} height={0.12} position={[0, 1.52, 0]} color="#2a2018" ink={0.008} />
      <mesh position={[0, 1.66, 0]} scale={[1, 1.4 + 0.2 * fl, 1]}>
        <coneGeometry args={[0.07, 0.2, 10]} />
        <meshBasicMaterial color="#ffb040" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.64, 0.01]} scale={[1, 1.2 * fl, 1]}>
        <coneGeometry args={[0.035, 0.13, 8]} />
        <meshBasicMaterial color="#fff2b0" toneMapped={false} />
      </mesh>
      <Halo position={[0, 1.66, 0.05]} size={1.2} color="#ffa040" strength={0.6 * fl} />
      <pointLight position={[0, 1.7, 0.1]} intensity={4 * fl} distance={5} decay={1.5} color="#ffa850" />
    </group>
  );
};
