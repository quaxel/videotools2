import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo, Label } from "./kit";
import { Haze } from "./LakeSet";
import { Hills } from "./FarmyardSet";
import { Blob, useOwned } from "./BalloonSets";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { SkyDome } from "./sky";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { rand } from "../engine/helpers";

// The Ghost Army's world, built from references (guide/references/ghost-army.md): an open French field between
// hedgerows (bocage) with poplars, haystacks and a village steeple on the far ridge; inflatable rubber Shermans that
// can swell, wobble and sag; the sonic half-track with its square speaker array; a compressor cart, a spoof-radio set
// and the props for the tent, barn and map room. `GhostFieldSet` takes a time of day (`FieldMode`) so one field gives
// five colour moods. Floor y = 0; the field is clear between x ±6 and z -8..6.

type Vec3 = [number, number, number];
const INK = "#161212";
export const OD = "#5d6532"; // olive drab
const OD_DARK = "#454b24";

const ease = (p: number) => p * p * (3 - 2 * p);

// ---------- time of day ----------

export type FieldMode = "dawn" | "noon" | "dusk" | "night" | "sunrise";

type ModeLook = {
  sky: [number, string][];
  sun: Vec3; // direction toward the sun (or moon)
  disc: string;
  glow: string;
  fog: string;
  bg: string;
  key: [number, string];
  ambient: [number, string];
  hemi: [string, string, number];
  hills: [string, string, string, string];
  haze: string;
  grass: string;
};

export const FIELD: Record<FieldMode, ModeLook> = {
  dawn: {
    sky: [[-0.1, "#f2c48a"], [0.0, "#ffcf8a"], [0.05, "#f7a660"], [0.14, "#d88a7a"], [0.3, "#8a7aa8"], [0.6, "#4c5e9a"], [1, "#2e3f7a"]],
    sun: [-7, 2.2, 3],
    disc: "#fff2c0",
    glow: "#ffe0a0",
    fog: "#e8b88a",
    bg: "#c88a6a",
    key: [2.8, "#ffc890"],
    ambient: [1.15, "#ffd8b8"],
    hemi: ["#ffd0a0", "#4a5a2a", 0.5],
    hills: ["#c8a0a0", "#a88a8e", "#7a7a5a", "#6a7a40"],
    haze: "#f4c8a0",
    grass: "#8a9a4a",
  },
  noon: {
    sky: [[-0.1, "#e8f0f2"], [0.0, "#dbe9f3"], [0.08, "#b6d5f1"], [0.16, "#7fb3ea"], [0.32, "#4f8fdc"], [0.6, "#3274cc"], [1, "#245fb8"]],
    sun: [-6, 9, 5],
    disc: "#fffdf0",
    glow: "#fff6dc",
    fog: "#cfe0ee",
    bg: "#a9cdf0",
    key: [2.5, "#fff4e0"],
    ambient: [1.15, "#ffffff"],
    hemi: ["#cfe4ff", "#5a7a3a", 0.6],
    hills: ["#9fb4c8", "#7f98a6", "#7f9a6a", "#86a44e"],
    haze: "#e6eef4",
    grass: "#7f9e48",
  },
  dusk: {
    sky: [[-0.1, "#f0a0a0"], [0.0, "#ff9a7a"], [0.06, "#e8708a"], [0.16, "#b0589a"], [0.32, "#6a4a9a"], [0.6, "#3a3478"], [1, "#221e52"]],
    sun: [7, 0.8, -9],
    disc: "#ffd0a0",
    glow: "#ffb08a",
    fog: "#b07898",
    bg: "#6a4a8a",
    key: [2.0, "#ff9a7a"],
    ambient: [0.8, "#d8b0e8"],
    hemi: ["#d090c0", "#3a3a3a", 0.5],
    hills: ["#9a6a9a", "#7a5888", "#5a4a6a", "#4a5040"],
    haze: "#e090a8",
    grass: "#6a7a48",
  },
  night: {
    sky: [[-0.1, "#24305a"], [0.0, "#2a3866"], [0.1, "#1e2a52"], [0.3, "#141e40"], [0.6, "#0c1430"], [1, "#080e24"]],
    sun: [5, 6, -9],
    disc: "#f4f0dc",
    glow: "#8a9ac8",
    fog: "#18224a",
    bg: "#0c1430",
    key: [1.9, "#9ab0ff"],
    ambient: [0.95, "#7a90d8"],
    hemi: ["#6a7ac0", "#182030", 0.6],
    hills: ["#1c2850", "#18224a", "#141c3a", "#101830"],
    haze: "#2a3a6a",
    grass: "#3a4a4a",
  },
  sunrise: {
    sky: [[-0.1, "#ffd8c8"], [0.0, "#ffc8b0"], [0.06, "#ffb0a8"], [0.16, "#f0a0b8"], [0.32, "#c8a0d0"], [0.6, "#8aa0d8"], [1, "#6a8ad0"]],
    sun: [4, 1.4, -10],
    disc: "#fff4e0",
    glow: "#ffe0d0",
    fog: "#f0c8c0",
    bg: "#e8b0b0",
    key: [2.4, "#ffd0b8"],
    ambient: [1.0, "#ffe4e0"],
    hemi: ["#ffd8e0", "#5a6a3a", 0.5],
    hills: ["#d8b0c0", "#b89aae", "#8a8a70", "#7a8a4a"],
    haze: "#ffd8d0",
    grass: "#8aa050",
  },
};

export const fieldBg = (mode: FieldMode) => FIELD[mode].bg;

// How the puppets are lit: the low sun (or moon) as a coloured side light and rim; noon is a plain white key.
export const fieldLight = (mode: FieldMode, flare = 0): PuppetLight => {
  const m = FIELD[mode];
  const dir = new THREE.Vector3(...m.sun).normalize().toArray() as Vec3;
  const strength = mode === "noon" ? 0.9 : mode === "night" ? 0.6 : 1.5;
  return {
    tint: mode === "night" ? "#b8c4ff" : "#fff6ee",
    tintAmount: mode === "night" ? 0.12 : undefined,
    shadow: mode === "night" ? 0.25 : 0.15,
    distant: [{ direction: dir, color: m.key[1], strength }],
    points: flare > 0 ? [{ position: [0, 6, -4], color: "#fff0c0", strength: 2.4 * flare, range: 14 }] : [],
  };
};

// ---------- ground ----------

const grassCanvas = (base: string) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 80; i++) {
      const v = rand(i + 50);
      ctx.fillStyle = v > 0.6 ? "rgba(60,90,40,0.3)" : v > 0.3 ? "rgba(200,190,110,0.22)" : "rgba(150,190,90,0.3)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 1024, 30 + rand(i + 9) * 60, 18 + rand(i + 11) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9000; i++) {
      const x = rand(i) * 1024;
      const y = rand(i + 7000) * 1024;
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.82 ? "rgba(220,210,140,0.7)" : v > 0.5 ? "rgba(70,110,50,0.8)" : v > 0.22 ? "rgba(170,200,110,0.7)" : "rgba(50,90,40,0.8)";
      ctx.lineWidth = 2 + rand(i + 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 8, y - 7 - rand(i + 4) * 10);
      ctx.stroke();
    }
    // tank track ruts and a few wild flowers
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rand(i + 3300) > 0.5 ? "rgba(255,240,180,0.9)" : "rgba(220,90,80,0.85)";
      ctx.beginPath();
      ctx.arc(rand(i + 3000) * 1024, rand(i + 3100) * 1024, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const patchCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    for (let i = 0; i < 26; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const dark = rand(i + 70) > 0.5;
      g.addColorStop(0, dark ? "rgba(40,70,30,0.3)" : "rgba(240,230,160,0.2)");
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

// Instanced grass tufts over the near field.
const Tufts: React.FC<{ tint: string }> = ({ tint }) => {
  const mesh = useOwned(() => {
    const blade = new THREE.ConeGeometry(0.013, 0.13, 3);
    blade.translate(0, 0.065, 0);
    const pos: number[] = [];
    [-0.35, 0, 0.35].forEach((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.translate((k - 1) * 0.013, 0, (k % 2) * 0.01);
      pos.push(...(b.toNonIndexed().attributes.position.array as Float32Array));
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    merged.computeVertexNormals();
    const count = 3200;
    const m = new THREE.InstancedMesh(merged, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const base = new THREE.Color(tint);
    for (let i = 0; i < count; i++) {
      o.position.set(-7 + rand(i * 3 + 1) * 14, 0, -9 + rand(i * 3 + 2) * 17);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.7 + rand(i * 7) * 1.0;
      o.scale.set(k, k * (0.8 + rand(i * 11) * 0.7), k);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const v = rand(i * 13);
      m.setColorAt(i, c.copy(base).multiplyScalar(v > 0.7 ? 1.15 : v > 0.35 ? 0.85 : 1.0));
    }
    m.receiveShadow = true;
    return m;
  }, [tint]);
  return <primitive object={mesh} />;
};

// A hedgerow: a wall of dark round bushes from a to b, with a few trees standing out of it.
export const Hedgerow: React.FC<{ a: [number, number]; b: [number, number]; seed?: number; color?: string; tall?: number }> = ({ a, b, seed = 0, color = "#3e5a30", tall = 1 }) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / 0.9));
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const x = a[0] + (b[0] - a[0]) * t + (rand(seed + i) - 0.5) * 0.3;
        const z = a[1] + (b[1] - a[1]) * t + (rand(seed + i + 40) - 0.5) * 0.3;
        const s = (0.75 + rand(seed + i * 3) * 0.5) * tall;
        const shade = rand(seed + i * 7);
        const col = shade > 0.66 ? color : shade > 0.33 ? "#4a6a36" : "#355028";
        const tree = rand(seed + i * 11) > 0.84;
        return (
          <group key={i}>
            <Blob position={[x, 0.55 * s, z]} scale={[0.75 * s, 0.7 * s, 0.6 * s]} color={col} ink={0.04} />
            {tree && (
              <>
                <InkCylinder radius={0.09} height={2.4 * s} position={[x, 1.2 * s, z]} color="#5a4a3a" ink={0.01} />
                <Blob position={[x, 2.6 * s, z]} scale={[1.1 * s, 0.95 * s, 0.9 * s]} color="#456a34" ink={0.04} />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

// A Lombardy poplar: a tall narrow column of foliage on a short trunk.
const Poplar: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#4a6a34" }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.1} height={0.8} position={[0, 0.4, 0]} color="#5a4a3a" ink={0.01} />
    <Blob position={[0, 2.6, 0]} scale={[0.6, 2.2, 0.6]} color={color} ink={0.05} />
  </group>
);

const Haystack: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <Blob position={[0, 0.45, 0]} scale={[0.7, 0.75, 0.7]} color="#d8b860" ink={0.04} />
    <Blob position={[0, 1.05, 0]} scale={[0.35, 0.3, 0.35]} color="#c8a850" ink={0.06} />
  </group>
);

// The village on the far ridge: a cluster of roofs round a church with a pointed steeple (the observation post).
const Village: React.FC<{ position: Vec3; color: string; roof: string }> = ({ position, color, roof }) => (
  <group position={position}>
    {[-3.2, -2, -0.8, 1.6, 2.8, 4].map((x, i) => (
      <group key={i} position={[x, 0, (i % 2) * 0.8]}>
        <InkBox size={[1, 0.9 + rand(i) * 0.4, 0.9]} position={[0, 0.5, 0]} color={color} ink={0.02} shadows={false} />
        <mesh position={[0, 1.15 + rand(i) * 0.2, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[0.8, 0.6, 4]} />
          <meshToonMaterial color={roof} gradientMap={toonRamp} />
        </mesh>
      </group>
    ))}
    <InkBox size={[1.2, 1.4, 2]} position={[0.4, 0.7, -0.4]} color={color} ink={0.02} shadows={false} />
    <InkBox size={[0.8, 3.2, 0.8]} position={[0.4, 1.6, 0.6]} color={color} ink={0.02} shadows={false} />
    <mesh position={[0.4, 4.0, 0.6]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.62, 1.8, 4]} />
      <meshToonMaterial color={roof} gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.05, 0.5, 0.05]} position={[0.4, 5.1, 0.6]} color={roof} ink={0} shadows={false} />
    <InkBox size={[0.3, 0.05, 0.05]} position={[0.4, 5.15, 0.6]} color={roof} ink={0} shadows={false} />
  </group>
);

// ---------- the field ----------

export const GhostFieldSet: React.FC<{ camera: CameraShot; frame: number; mode: FieldMode; flare?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode,
  flare = 0,
  children,
}) => {
  const m = FIELD[mode];
  const camX = camera.position[0];
  const grass = useOwned(() => {
    const t = grassCanvas(m.grass);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 16);
    t.anisotropy = 8;
    return t;
  }, [m.grass]);
  const patches = useOwned(() => {
    const t = patchCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2.4);
    return t;
  }, []);
  const stars = useOwned(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = rand(i) * Math.PI * 2;
      const h = 0.12 + rand(i + 500) * 0.85;
      const r = Math.sqrt(1 - h * h);
      p.push(Math.cos(a) * r * 250, h * 250, Math.sin(a) * r * 250);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  const sunPos = new THREE.Vector3(...m.sun).normalize().multiplyScalar(280).toArray() as Vec3;
  const night = mode === "night";
  // a flare drifting down on its parachute over the decoy field
  const flareY = 4.4 - ((((frame * 0.01) % 1.5) + 1.5) % 1.5);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={[m.fog, night ? 14 : 22, night ? 60 : 95]} />
      <ambientLight intensity={m.ambient[0]} color={m.ambient[1]} />
      <hemisphereLight args={m.hemi} />
      <directionalLight
        position={new THREE.Vector3(...m.sun).normalize().multiplyScalar(14).toArray() as Vec3}
        intensity={m.key[0]}
        color={m.key[1]}
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
      {flare > 0 && <pointLight position={[1.2, flareY - 0.5, -2]} intensity={30 * flare} distance={18} color="#fff0c0" />}

      {/* Sky dome, sun or moon and stars ride with the camera; hills slide at their own shares (parallax) */}
      <group position={camera.position}>
        <SkyDome sun={m.sun} stops={m.sky} glow={m.glow} />
        <mesh position={sunPos} onUpdate={(o) => o.lookAt(0, 0, 0)}>
          <circleGeometry args={[night ? 6 : 9, 48]} />
          <meshBasicMaterial color={m.disc} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
        {night && (
          <points geometry={stars}>
            <pointsMaterial color="#e8eeff" size={1.3} sizeAttenuation={false} fog={false} toneMapped={false} depthWrite={false} />
          </points>
        )}
      </group>
      <Hills z={-80} shift={camX * 0.8} width={340} low={5} high={12} color={m.hills[0]} seed={4} />
      <Haze z={-70} color={m.haze} />
      <Hills z={-52} shift={camX * 0.55} width={260} low={3} high={8} color={m.hills[1]} seed={8} />
      <group position={[camX * 0.55 - 10, 3.4, -50]} scale={1.4}>
        <Village position={[0, 0, 0]} color={m.hills[1]} roof={m.hills[0]} />
      </group>
      <Hills z={-36} shift={camX * 0.3} width={200} low={1.2} high={4} color={m.hills[2]} seed={11} />
      <Haze z={-32} color={m.haze} />
      <Hills z={-24} shift={-camX * 0.15} width={140} low={0.3} high={1.8} color={m.hills[3]} seed={15} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[90, 70]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -10]}>
        <planeGeometry args={[90, 70]} />
        <meshBasicMaterial map={patches} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <Tufts tint={m.grass} />

      {/* Bocage: hedgerows round the field, poplars behind, haystacks in the next field */}
      <Hedgerow a={[-14, -10]} b={[14, -10]} seed={3} />
      <Hedgerow a={[-7.5, -9.5]} b={[-7.5, 7]} seed={21} />
      <Hedgerow a={[7.5, -9.5]} b={[7.5, 7]} seed={47} />
      {Array.from({ length: 9 }, (_, i) => (
        <Poplar key={i} position={[-12 + i * 3 + rand(i) * 0.6, 0, -15 - rand(i + 9) * 1.5]} scale={0.9 + rand(i + 3) * 0.4} />
      ))}
      <Haystack position={[-4.5, 0, -13]} />
      <Haystack position={[-2.8, 0, -13.6]} scale={0.8} />
      <Haystack position={[5.2, 0, -12.5]} scale={0.9} />
      {flare > 0 && (
        <group userData={{ ghost: true }}>
          <Halo position={[1.2, flareY, -2]} size={2.2 * flare} color="#fff4c8" strength={0.9} />
          <mesh position={[1.2, flareY, -2]}>
            <sphereGeometry args={[0.08, 12, 8]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      )}
      {children}
    </>
  );
};

// ---------- inflatable Sherman ----------

// Rounded toon box with an ink outline: the puffy rubber panels of a decoy (or, with a small radius, steel).
export const Puffy: React.FC<{ size: Vec3; radius: number; position?: Vec3; rotation?: Vec3; color: string; ink?: number }> = ({
  size,
  radius,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  ink = 0.018,
}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, Math.min(...size) / 2 - 0.001)), [size[0], size[1], size[2], radius]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      {ink > 0 && (
        <mesh geometry={geo} scale={[1 + (ink * 2) / size[0], 1 + (ink * 2) / size[1], 1 + (ink * 2) / size[2]]}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

const starCanvas = (text?: string) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#f2f0e4";
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 44 : 110;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    if (text) {
      ctx.font = "900 40px Arial Black, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, 128, 250);
    }
  });

// A painted white star decal; `paint` 0..1 grows it in (an artist painting it on).
export const StarDecal: React.FC<{ position: Vec3; rotation?: Vec3; size: number; paint?: number }> = ({ position, rotation = [0, 0, 0], size, paint = 1 }) => {
  const tex = useOwned(() => starCanvas(), []);
  if (paint <= 0.01) return null;
  return (
    <mesh position={position} rotation={rotation} scale={[paint, paint, 1]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
};

export const TANK = { length: 3.4, width: 1.8, height: 1.55, turretY: 1.3, barrel: 1.6 };

// An M4 Sherman, front toward +x, origin on the ground under its centre. As a decoy (`real` false) it is puffy olive
// rubber with seams, a fill valve and a hose stub; `inflate` 0..1 swells it up from a flat heap, `wobble` = frames
// since a slap (jelly wobble), `droop` 0..1 bends the barrel down, `turret` yaws the turret (radians).
// `real` makes it steel: hard edges, dark track links, exhaust.
export const Sherman: React.FC<{
  frame: number;
  position?: Vec3;
  rotationY?: number;
  inflate?: number;
  wobble?: number;
  droop?: number;
  turret?: number;
  real?: boolean;
  star?: number;
  branches?: boolean;
}> = ({ frame, position = [0, 0, 0], rotationY = 0, inflate = 1, wobble, droop = 0, turret = 0, real = false, star = 1, branches = false }) => {
  const r = real ? 0.04 : 0.16;
  const body = real ? "#5e6640" : OD;
  const dark = real ? "#2a2c20" : OD_DARK;
  // swelling: overshoots a little, wrinkles as it fills
  const p = Math.min(1, Math.max(0, inflate));
  const swell = p >= 1 ? 1 : 0.06 + 0.94 * (1 - Math.pow(1 - p, 3)) + Math.sin(p * 20) * 0.03 * (1 - p);
  let sx = 1 + (1 - swell) * 0.25;
  let sy = swell;
  let sz = 1 + (1 - swell) * 0.2;
  if (wobble !== undefined && wobble >= 0) {
    const w = Math.sin(wobble * 0.75) * Math.exp(-wobble / 14) * 0.12;
    sy *= 1 - w;
    sx *= 1 + w * 0.6;
    sz *= 1 + w * 0.6;
  }
  const t = frame / 30;
  const idle = real ? Math.sin(t * 40) * 0.006 : 0; // engine shake
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group scale={[sx, sy, sz]} position={[0, idle, 0]}>
        {/* tracks: a long rounded pod each side with road wheels */}
        {[-1, 1].map((s) => (
          <group key={s} position={[0, 0, s * 0.7]}>
            <Puffy size={[3.4, 0.62, 0.42]} radius={real ? 0.08 : 0.2} position={[0, 0.33, 0]} color={dark} />
            {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
              <InkCylinder key={x} radius={0.19} height={0.08} position={[x, 0.26, s * 0.22]} rotation={[Math.PI / 2, 0, 0]} color={real ? "#3a3c2c" : "#5a6036"} ink={0.012} />
            ))}
            {real &&
              Array.from({ length: 22 }, (_, i) => (
                <InkBox key={i} size={[0.06, 0.04, 0.44]} position={[-1.6 + i * 0.152 - ((frame * 0.03) % 0.152), 0.64, 0]} color="#1e1e18" ink={0} />
              ))}
          </group>
        ))}
        {/* upper hull and sloped glacis */}
        <Puffy size={[3.0, 0.55, 1.62]} radius={r} position={[-0.15, 0.86, 0]} color={body} />
        <Puffy size={[0.8, 0.5, 1.6]} radius={r} position={[1.25, 0.82, 0]} rotation={[0, 0, -0.55]} color={body} />
        {/* turret */}
        <group position={[-0.25, TANK.turretY, 0]} rotation={[0, turret, 0]}>
          <Blob position={[0, 0, 0]} scale={[0.72, real ? 0.3 : 0.34, 0.62]} color={body} ink={0.04} detail={3} />
          <Puffy size={[0.3, 0.32, 0.5]} radius={real ? 0.04 : 0.12} position={[0.7, -0.02, 0]} color={dark} />
          <InkCylinder radius={0.11} height={0.12} position={[-0.15, 0.32, 0.18]} color={dark} ink={0.01} />
          <group position={[0.82, 0, 0]} rotation={[0, 0, -droop * 0.3]}>
            {/* the barrel, made of short pieces so a droop bends it like a soft tube */}
            {Array.from({ length: 6 }, (_, i) => {
              const seg = TANK.barrel / 6;
              const bend = -droop * 0.12 * i;
              let x = 0;
              let y = 0;
              for (let k = 0; k < i; k++) {
                x += Math.cos(-droop * 0.12 * k) * seg;
                y += Math.sin(-droop * 0.12 * k) * seg;
              }
              return (
                <InkCylinder
                  key={i}
                  radius={real ? 0.055 : 0.07}
                  height={seg + 0.02}
                  position={[x + Math.cos(bend) * seg * 0.5, y + Math.sin(bend) * seg * 0.5, 0]}
                  rotation={[0, 0, bend - Math.PI / 2]}
                  color={body}
                  ink={0.012}
                />
              );
            })}
          </group>
        </group>
        {/* white stars on the sides and turret */}
        {[-1, 1].map((s) => (
          <StarDecal key={s} position={[-0.25, 0.86, s * 0.825]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} size={0.5} paint={star} />
        ))}
        {!real && (
          <>
            {/* seams of the rubber panels and the fill valve with its hose stub on the back deck */}
            {[-0.9, 0.2].map((x) => (
              <InkBox key={x} size={[0.02, 0.5, 1.66]} position={[x, 0.87, 0]} color="#3a4020" ink={0} />
            ))}
            <InkBox size={[2.9, 0.02, 0.02]} position={[-0.15, 1.1, 0.82]} color="#3a4020" ink={0} />
            <InkBox size={[2.9, 0.02, 0.02]} position={[-0.15, 1.1, -0.82]} color="#3a4020" ink={0} />
            <InkCylinder radius={0.05} height={0.12} position={[-1.45, 1.16, 0.4]} color="#2a2a22" ink={0.01} />
          </>
        )}
        {branches && (
          <group userData={{ ghost: true }}>
            <Blob position={[-1, 1.15, 0.6]} scale={[0.45, 0.25, 0.35]} color="#4a6a34" ink={0.05} />
            <Blob position={[0.6, 1.0, -0.7]} scale={[0.5, 0.3, 0.3]} color="#3e5a30" ink={0.05} />
            <Blob position={[-1.5, 0.9, -0.5]} scale={[0.35, 0.3, 0.4]} color="#557a3c" ink={0.05} />
          </group>
        )}
      </group>
    </group>
  );
};

// ---------- compressor, hose ----------

// A two-wheel compressor cart: a little engine with a spinning flywheel and an air tank; `run` 0..1 shakes it.
export const Compressor: React.FC<{ frame: number; position: Vec3; rotationY?: number; run?: number; label?: boolean }> = ({ frame, position, rotationY = 0, run = 1, label = true }) => {
  const shake = Math.sin(frame * 2.4) * 0.008 * run;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, shake, 0]}>
        <InkCylinder radius={0.18} height={0.62} position={[0, 0.42, -0.05]} rotation={[0, 0, Math.PI / 2]} color="#8a2a22" ink={0.012} />
        <InkBox size={[0.4, 0.3, 0.3]} position={[0, 0.72, 0.05]} color="#3a3a34" ink={0.012} />
        <InkBox size={[0.08, 0.2, 0.2]} position={[0, 0.94, 0.05]} color="#5a5a52" ink={0.01} />
        <group position={[0.26, 0.72, 0.05]} rotation={[frame * 0.5 * run, 0, 0]}>
          <InkCylinder radius={0.14} height={0.04} rotation={[0, 0, Math.PI / 2]} color="#6a6a62" ink={0.01} />
          <InkBox size={[0.05, 0.26, 0.03]} position={[0.03, 0, 0]} color="#c8c0a8" ink={0} />
        </group>
      </group>
      {[-1, 1].map((s) => (
        <InkCylinder key={s} radius={0.17} height={0.06} position={[s * 0.36, 0.17, -0.05]} rotation={[0, 0, Math.PI / 2]} color="#222" ink={0.01} />
      ))}
      <InkBox size={[0.06, 0.06, 0.6]} position={[0, 0.2, 0.35]} color="#3a3a34" ink={0.008} />
      {label && <Label text="AIR COMPRESSOR" position={[0, 1.22, 0.1]} width={0.78} />}
    </group>
  );
};

// A rubber hose along a list of points (a smooth tube); `pulse` makes bulges run along it.
export const Hose: React.FC<{ points: Vec3[]; frame?: number; color?: string; radius?: number }> = ({ points, frame = 0, color = "#1e1e1a", radius = 0.035 }) => {
  const key = points.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(";");
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 48, radius, 8, false), [key, radius]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [key]);
  return (
    <group>
      <mesh geometry={geo} castShadow>
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      {/* air pulses travelling toward the tank */}
      {[0, 0.33, 0.66].map((o) => {
        const u = (((frame * 0.03 + o) % 1) + 1) % 1;
        const p = curve.getPointAt(u);
        return (
          <mesh key={o} position={p}>
            <sphereGeometry args={[radius * 1.7, 10, 8]} />
            <meshToonMaterial color={color} gradientMap={toonRamp} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- sonic half-track ----------

// An M3 half-track, front toward +x: wheels up front, tracks behind, a canvas-topped cab and, on the bed, the big
// square speaker array (3x3 horn cells) aimed along `aim` (radians, 0 = to the left side, -z... +z). `blast` 0..1
// pumps the speaker cones.
export const SoundTruck: React.FC<{ frame: number; position?: Vec3; rotationY?: number; aim?: number; blast?: number; label?: boolean }> = ({
  frame,
  position = [0, 0, 0],
  rotationY = 0,
  aim = 0,
  blast = 0,
  label = true,
}) => {
  const pump = blast * (0.5 + 0.5 * Math.sin(frame * 1.7)) * 0.04;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* chassis */}
      <InkBox size={[3.6, 0.3, 1.5]} position={[0, 0.55, 0]} color={OD_DARK} ink={0.015} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <InkCylinder radius={0.32} height={0.2} position={[1.15, 0.32, s * 0.7]} rotation={[Math.PI / 2, 0, 0]} color="#222" ink={0.012} />
          <InkCylinder radius={0.14} height={0.22} position={[1.15, 0.32, s * 0.7]} rotation={[Math.PI / 2, 0, 0]} color={OD} ink={0} />
          <Puffy size={[1.7, 0.55, 0.34]} radius={0.12} position={[-0.75, 0.3, s * 0.66]} color="#2a2c22" />
        </group>
      ))}
      {/* hood with a white star, cab with a canvas top */}
      <InkBox size={[0.95, 0.5, 1.2]} position={[1.25, 0.95, 0]} color={OD} ink={0.015} />
      <StarDecal position={[1.25, 1.205, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} size={0.55} />
      <InkBox size={[0.06, 0.4, 1.3]} position={[1.75, 0.95, 0]} color="#3a3c2c" ink={0.008} />
      <InkBox size={[0.7, 0.6, 1.5]} position={[0.45, 1.0, 0]} color={OD} ink={0.015} />
      <InkBox size={[0.06, 0.32, 1.3]} position={[0.82, 1.42, 0]} color="#8ab0c8" ink={0.008} />
      <Puffy size={[0.75, 0.22, 1.55]} radius={0.08} position={[0.42, 1.65, 0]} color="#8a8a62" />
      {/* bed walls */}
      <InkBox size={[2.2, 0.55, 0.06]} position={[-0.75, 0.98, 0.72]} color={OD} ink={0.012} />
      <InkBox size={[2.2, 0.55, 0.06]} position={[-0.75, 0.98, -0.72]} color={OD} ink={0.012} />
      <InkBox size={[0.06, 0.55, 1.5]} position={[-1.83, 0.98, 0]} color={OD} ink={0.012} />
      <StarDecal position={[-0.75, 0.98, 0.756]} size={0.42} />
      {/* speaker array on a turntable */}
      <InkCylinder radius={0.3} height={0.2} position={[-0.8, 1.3, 0]} color="#3a3a34" ink={0.01} />
      <group position={[-0.8, 2.15, 0]} rotation={[0, aim, 0]}>
        <InkBox size={[1.35, 1.35, 0.5]} color="#2e3022" ink={0.02} />
        {[-1, 0, 1].map((r) =>
          [-1, 0, 1].map((c) => (
            <group key={`${r}${c}`} position={[c * 0.42, r * 0.42, 0.26]}>
              <InkBox size={[0.38, 0.38, 0.04]} color="#1a1a16" ink={0} />
              <mesh position={[0, 0, 0.03 + pump]}>
                <circleGeometry args={[0.13, 20]} />
                <meshToonMaterial color="#6a6a5a" gradientMap={toonRamp} />
              </mesh>
              <mesh position={[0, 0, 0.035 + pump]}>
                <circleGeometry args={[0.045, 12]} />
                <meshBasicMaterial color="#1a1a16" />
              </mesh>
            </group>
          )),
        )}
        {label && <Label text="BATTLE SOUNDS" position={[0, 0.95, 0.1]} width={1.1} />}
        {blast > 0 && <SoundRings frame={frame} position={[0, 0, 0.35]} strength={blast} />}
      </group>
    </group>
  );
};

// Expanding rings of sound flying out of a speaker along +z (local).
export const SoundRings: React.FC<{ frame: number; position: Vec3; strength?: number; color?: string }> = ({ frame, position, strength = 1, color = "#fff2c8" }) => (
  <group position={position} userData={{ ghost: true }}>
    {[0, 1, 2, 3].map((k) => {
      const u = ((((frame + k * 7) % 28) + 28) % 28) / 28;
      const s = 0.5 + u * 2.4;
      return (
        <mesh key={k} position={[0, 0, u * 3.2]} scale={[s, s, 1]}>
          <ringGeometry args={[0.42, 0.5, 48]} />
          <meshBasicMaterial color={color} transparent opacity={(1 - u) * 0.75 * strength} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

// ---------- interiors' props ----------

// A field radio set on a table: dials, a meter, a green dial lamp that flickers with the code, a Morse key (`tap`
// 0..1 presses it) and headphones lying on top.
export const RadioSet: React.FC<{ frame: number; position: Vec3; tap?: number; label?: boolean }> = ({ frame, position, tap = 0, label = true }) => (
  <group position={position}>
    <InkBox size={[1.4, 0.06, 0.8]} position={[0, 0.74, 0]} color="#7a5a3a" ink={0.012} />
    {[-0.62, 0.62].map((x) => (
      <InkBox key={x} size={[0.06, 0.74, 0.06]} position={[x, 0.37, 0.3]} color="#5a4028" ink={0.008} />
    ))}
    {[-0.62, 0.62].map((x) => (
      <InkBox key={`b${x}`} size={[0.06, 0.74, 0.06]} position={[x, 0.37, -0.3]} color="#5a4028" ink={0.008} />
    ))}
    <InkBox size={[0.9, 0.55, 0.45]} position={[0, 1.05, -0.12]} color="#4a5038" ink={0.015} />
    <InkBox size={[0.8, 0.42, 0.02]} position={[0, 1.06, 0.115]} color="#2a2c22" ink={0} />
    {[-0.28, 0, 0.28].map((x, i) => (
      <group key={x} position={[x, 0.96, 0.13]}>
        <InkCylinder radius={0.06} height={0.04} rotation={[Math.PI / 2, 0, 0]} color="#1a1a16" ink={0.006} />
        <InkBox size={[0.012, 0.05, 0.01]} position={[0, 0.02, 0.025]} rotation={[0, 0, Math.sin(frame * 0.07 + i) * 0.6]} color="#e8e0c8" ink={0} />
      </group>
    ))}
    <mesh position={[-0.2, 1.18, 0.13]}>
      <planeGeometry args={[0.3, 0.12]} />
      <meshBasicMaterial color="#e8e0b0" toneMapped={false} />
    </mesh>
    <InkBox size={[0.006, 0.1, 0.004]} position={[-0.2 + Math.sin(frame * 0.3) * 0.1, 1.18, 0.135]} color="#222" ink={0} />
    <mesh position={[0.24, 1.18, 0.13]}>
      <circleGeometry args={[0.045, 16]} />
      <meshBasicMaterial color={tap > 0.5 ? "#8aff9a" : "#2a6a3a"} toneMapped={false} />
    </mesh>
    {tap > 0.5 && <Halo position={[0.24, 1.18, 0.16]} size={0.4} color="#6aff8a" strength={0.7} />}
    {/* Morse key: a brass lever on a black base, drawn large */}
    <group position={[-0.48, 0.78, 0.25]} scale={1.6}>
      <InkBox size={[0.16, 0.025, 0.09]} position={[0, 0.012, 0]} color="#1a1a16" ink={0.005} />
      <group position={[-0.05, 0.04, 0]} rotation={[0, 0, -0.08 - tap * 0.12]}>
        <InkBox size={[0.16, 0.012, 0.025]} position={[0.07, 0, 0]} color="#c8a040" ink={0.004} />
        <InkCylinder radius={0.022} height={0.018} position={[0.15, 0.012, 0]} color="#1a1a16" ink={0.004} />
      </group>
    </group>
    {/* headphones */}
    <group position={[0.45, 0.82, 0.2]} rotation={[-Math.PI / 2, 0, 0.3]}>
      <mesh>
        <torusGeometry args={[0.1, 0.012, 6, 20, Math.PI]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      {[-1, 1].map((s) => (
        <InkCylinder key={s} radius={0.045} height={0.03} position={[s * 0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color="#2a2a26" ink={0.004} />
      ))}
    </group>
    {label && <Label text="FAKE RADIO" position={[-0.3, 1.55, -0.1]} width={0.8} />}
  </group>
);

// A wooden crate with stencilled text on its front.
export const Crate: React.FC<{ position: Vec3; text?: string; size?: Vec3; rotationY?: number }> = ({ position, text, size = [0.8, 0.55, 0.55], rotationY = 0 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(512, 352, (ctx) => {
        ctx.fillStyle = "#a8844e";
        ctx.fillRect(0, 0, 512, 352);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? "#9a7846" : "#b08c56";
          ctx.fillRect(0, i * 88 + 4, 512, 80);
        }
        ctx.strokeStyle = "#6a5030";
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 498, 338);
        if (text) {
          ctx.fillStyle = "#2a2a1e";
          ctx.font = "900 64px Arial Black, sans-serif";
          ctx.textAlign = "center";
          text.split("\n").forEach((l, i, a) => ctx.fillText(l, 256, 190 + (i - (a.length - 1) / 2) * 76));
        }
      }),
    [text],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={size} position={[0, size[1] / 2, 0]} color="#ffffff" ink={0.012} map={tex} />
    </group>
  );
};

// A red ink stamp mark that slams onto a surface: `appear` = frames since it hit (negative hides it).
export const StampMark: React.FC<{ position: Vec3; rotation?: Vec3; text: string; appear: number; width?: number }> = ({ position, rotation = [0, 0, 0], text, appear, width = 0.6 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(512, 160, (ctx) => {
        ctx.clearRect(0, 0, 512, 160);
        ctx.strokeStyle = "#c8262a";
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, 492, 140);
        ctx.fillStyle = "#c8262a";
        ctx.font = "900 92px Arial Black, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 256, 86);
      }),
    [text],
  );
  if (appear < 0) return null;
  const s = 1 + Math.max(0, 1 - appear / 4) * 0.4;
  return (
    <mesh position={position} rotation={rotation} scale={[s, s, 1]}>
      <planeGeometry args={[width, width * 0.3125]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
    </mesh>
  );
};

// A rubber stamp in a hand: handle and red pad; `down` 0..1 lowers it.
export const RubberStamp: React.FC<{ position: Vec3; down: number }> = ({ position, down }) => (
  <group position={[position[0], position[1] + (1 - down) * 0.35, position[2]]}>
    <InkBox size={[0.22, 0.05, 0.12]} position={[0, 0.025, 0]} color="#c8262a" ink={0.006} />
    <InkBox size={[0.18, 0.05, 0.1]} position={[0, 0.075, 0]} color="#5a3a24" ink={0.006} />
    <InkCylinder radius={0.03} height={0.14} position={[0, 0.17, 0]} color="#5a3a24" ink={0.006} />
    <mesh position={[0, 0.27, 0]}>
      <sphereGeometry args={[0.055, 14, 10]} />
      <meshToonMaterial color="#3a2a1a" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// The enemy's map table: a painted map of fields and a river, and wooden tank markers that pop up one after another
// (`markers` 0..1 of them shown).
export const MapTable: React.FC<{ position: Vec3; markers: number }> = ({ position, markers }) => {
  const tex = useOwned(
    () =>
      canvasTexture(1024, 640, (ctx) => {
        ctx.fillStyle = "#e8dcb8";
        ctx.fillRect(0, 0, 1024, 640);
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = rand(i) > 0.5 ? "rgba(150,170,100,0.45)" : "rgba(190,180,120,0.45)";
          ctx.fillRect(rand(i + 1) * 960, rand(i + 2) * 600, 60 + rand(i + 3) * 90, 40 + rand(i + 4) * 70);
        }
        ctx.strokeStyle = "#4a7ab0";
        ctx.lineWidth = 26;
        ctx.beginPath();
        ctx.moveTo(-10, 120);
        ctx.bezierCurveTo(300, 260, 600, 60, 1040, 300);
        ctx.stroke();
        ctx.strokeStyle = "rgba(60,50,40,0.5)";
        ctx.lineWidth = 3;
        for (let k = 0; k < 8; k++) {
          ctx.beginPath();
          ctx.moveTo(k * 140, 0);
          ctx.lineTo(k * 140, 640);
          ctx.stroke();
        }
      }),
    [],
  );
  const n = 24;
  return (
    <group position={position}>
      <InkBox size={[1.9, 0.08, 1.2]} position={[0, 0.78, 0]} color="#5a3a24" ink={0.015} />
      {[-0.85, 0.85].map((x) =>
        [-0.5, 0.5].map((z) => <InkBox key={`${x}${z}`} size={[0.08, 0.78, 0.08]} position={[x, 0.39, z]} color="#4a2e1c" ink={0.008} />),
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.823, 0]}>
        <planeGeometry args={[1.8, 1.12]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: n }, (_, i) => {
        const shown = markers * n - i;
        if (shown <= 0) return null;
        const pop = Math.min(1, shown * 1.5);
        const x = -0.75 + (i % 8) * 0.2 + rand(i) * 0.04;
        const z = -0.35 + Math.floor(i / 8) * 0.22 + rand(i + 9) * 0.04;
        return (
          <group key={i} position={[x, 0.83, z]} scale={pop}>
            <InkBox size={[0.11, 0.05, 0.07]} position={[0, 0.025, 0]} color="#3a6a3a" ink={0.005} />
            <InkBox size={[0.06, 0.03, 0.05]} position={[0, 0.065, 0]} color="#3a6a3a" ink={0.005} />
          </group>
        );
      })}
    </group>
  );
};

// A painter's easel with a canvas showing a decoy design; `paint` 0..1 fills it in.
export const Easel: React.FC<{ position: Vec3; rotationY?: number; paint?: number }> = ({ position, rotationY = 0, paint = 1 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(512, 400, (ctx) => {
        ctx.fillStyle = "#f4ecd8";
        ctx.fillRect(0, 0, 512, 400);
        ctx.fillStyle = "#5d6532";
        ctx.strokeStyle = "#1a1a16";
        ctx.lineWidth = 8;
        // a Sherman in side view
        ctx.beginPath();
        ctx.roundRect(70, 200, 380, 90, 40);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(110, 140, 300, 70, 20);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(240, 130, 90, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(320, 118, 160, 18);
        ctx.strokeRect(320, 118, 160, 18);
        ctx.fillStyle = "#f2f0e4";
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? 14 : 34;
          const a = -Math.PI / 2 + (k * Math.PI) / 5;
          ctx.lineTo(250 + Math.cos(a) * r, 176 + Math.sin(a) * r);
        }
        ctx.fill();
        ctx.fillStyle = "#2a2a22";
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.arc(110 + k * 60, 260, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [],
  );
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-0.28, 0.28].map((x) => (
        <InkBox key={x} size={[0.05, 1.7, 0.05]} position={[x, 0.85, 0]} rotation={[0.12, 0, x > 0 ? -0.08 : 0.08]} color="#8a6038" ink={0.008} />
      ))}
      <InkBox size={[0.05, 1.6, 0.05]} position={[0, 0.8, -0.3]} rotation={[-0.3, 0, 0]} color="#8a6038" ink={0.008} />
      <InkBox size={[0.7, 0.05, 0.1]} position={[0, 0.82, 0.1]} color="#8a6038" ink={0.008} />
      <group position={[0, 1.15, 0.11]} rotation={[-0.12, 0, 0]}>
        <InkBox size={[0.82, 0.64, 0.03]} color="#f4ecd8" ink={0.01} />
        <mesh position={[-0.4 + 0.4 * paint, 0, 0.017]} scale={[paint, 1, 1]}>
          <planeGeometry args={[0.8, 0.62]} />
          <meshBasicMaterial map={tex} />
        </mesh>
      </group>
    </group>
  );
};

// Paint pots on the floor.
export const PaintPots: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {[["#f2f0e4", 0], ["#5d6532", 0.28], ["#3e4a2a", 0.56]].map(([c, x], i) => (
      <group key={i} position={[x as number, 0, (i % 2) * 0.12]}>
        <InkCylinder radius={0.1} height={0.18} position={[0, 0.09, 0]} color="#8a8a80" ink={0.008} />
        <mesh position={[0, 0.182, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.09, 20]} />
          <meshBasicMaterial color={c as string} />
        </mesh>
      </group>
    ))}
  </group>
);

// Field binoculars, drawn at 1.5x so they read on a phone; held in front of a face.
export const Binoculars: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1.5 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.045, 0, 0]}>
        <InkCylinder radius={0.032} height={0.12} rotation={[Math.PI / 2, 0, 0]} color="#2a2a26" ink={0.006} />
        <mesh position={[0, 0, 0.061]}>
          <circleGeometry args={[0.026, 16]} />
          <meshBasicMaterial color="#8ab4d8" />
        </mesh>
      </group>
    ))}
    <InkBox size={[0.05, 0.03, 0.05]} color="#3a3a34" ink={0.004} />
  </group>
);
