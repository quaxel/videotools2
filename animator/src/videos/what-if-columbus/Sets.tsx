import React from "react";
import * as THREE from "three";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, Halo, InkBox, InkCylinder, PuppetLight, SkyDome, toonRamp, Vec3 } from "../../engine";
import { Blob, Cord, tiled, useOwned } from "../../three/BalloonSets";

// The open Atlantic in 1492 for what-if-columbus (notes: guide/references/atlantic-1492.md).
// SeaSet: a cel-shaded swell around the camera (surface y = `level`), a dome sky that rides with the camera, the sun
// or the moon, foam flecks drifting on the swell. Modes set sky, water and light. Ships (the sand3d nao and caravel)
// ride the swell with `Ship`. DeckSet: the Santa María's waist (deck y = 0) with its far bulwark and hull side, the
// mainmast, shrouds, barrels and rope, inside a SeaSet whose surface lies 1.6 m below the deck.

export type SeaMode = "golden" | "noon" | "dusk" | "teal" | "night" | "violet" | "dawn" | "morning";
type SeaMood = {
  stops: [number, string][];
  sun: Vec3;
  glow: string;
  bg: string;
  fog: [string, number, number];
  ambient: [number, string];
  hemi: [string, string, number];
  key: [number, string];
  water: string;
  foam: string;
  moon?: boolean;
};

export const SEA: Record<SeaMode, SeaMood> = {
  golden: {
    stops: [[-0.1, "#ffe2a8"], [0.0, "#ffd890"], [0.05, "#f8c27a"], [0.14, "#9cc0e0"], [0.35, "#5f94d0"], [1.0, "#3a6cb8"]],
    sun: [6, 1.6, -10],
    glow: "#fff2c0",
    bg: "#9cc0e0",
    fog: ["#f2d8a8", 40, 170],
    ambient: [1.15, "#fff0d8"],
    hemi: ["#ffe8c0", "#2a4a6a", 0.6],
    key: [2.4, "#ffd890"],
    water: "#2e6e9a",
    foam: "#fff0d0",
  },
  noon: {
    stops: [[-0.1, "#e8f2f6"], [0.0, "#d8ecf6"], [0.08, "#a8d0f0"], [0.2, "#6aa8e6"], [0.5, "#3c80d6"], [1.0, "#2462bc"]],
    sun: [-4, 9, 6],
    glow: "#fffbe8",
    bg: "#a8d0f0",
    fog: ["#d0e6f2", 40, 170],
    ambient: [1.2, "#ffffff"],
    hemi: ["#d8ecff", "#2a5070", 0.6],
    key: [2.4, "#fff6e4"],
    water: "#245e94",
    foam: "#f4fbff",
  },
  dusk: {
    stops: [[-0.1, "#ffb878"], [0.0, "#ff9a60"], [0.06, "#f07a58"], [0.16, "#b86a7a"], [0.35, "#6a5a96"], [1.0, "#2e3470"]],
    sun: [-8, 0.9, -10],
    glow: "#ffd8a0",
    bg: "#c06a6a",
    fog: ["#e89070", 35, 150],
    ambient: [1.0, "#ffd0b0"],
    hemi: ["#ffb890", "#2a2440", 0.55],
    key: [2.2, "#ffa860"],
    water: "#3a4870",
    foam: "#ffd0b0",
  },
  teal: {
    stops: [[-0.1, "#e8f6f2"], [0.0, "#d4f0ea"], [0.1, "#9cdcd8"], [0.25, "#62b8d0"], [0.6, "#3a90c4"], [1.0, "#2a70b0"]],
    sun: [-5, 8, 7],
    glow: "#fffbe8",
    bg: "#9cdcd8",
    fog: ["#c8ece6", 30, 150],
    ambient: [1.25, "#f4fff8"],
    hemi: ["#d8fff4", "#1a5a5a", 0.6],
    key: [2.3, "#fff8e8"],
    water: "#1f7a7c",
    foam: "#e8fff8",
  },
  night: {
    stops: [[-0.1, "#2a3a6a"], [0.0, "#34467e"], [0.1, "#26346a"], [0.3, "#1a2456"], [1.0, "#0c1236"]],
    sun: [-7, 4.5, -10],
    glow: "#e8eeff",
    bg: "#1a2456",
    fog: ["#22305e", 30, 140],
    ambient: [0.85, "#8a9ad0"],
    hemi: ["#7080c8", "#10142a", 0.5],
    key: [1.2, "#c8d4ff"],
    water: "#1e2c56",
    foam: "#b8c8f0",
    moon: true,
  },
  violet: {
    stops: [[-0.1, "#f0c8f0"], [0.0, "#e0b0ea"], [0.08, "#b890e0"], [0.22, "#8a6ad0"], [0.5, "#5a48b0"], [1.0, "#382c88"]],
    sun: [5, 3, -10],
    glow: "#ffe8ff",
    bg: "#8a6ad0",
    fog: ["#c8a0e0", 35, 150],
    ambient: [1.2, "#f0d8ff"],
    hemi: ["#e8c8ff", "#2a1a4a", 0.6],
    key: [2.0, "#ffd0f4"],
    water: "#4a3a8e",
    foam: "#f4e0ff",
  },
  dawn: {
    stops: [[-0.1, "#ffd8c0"], [0.0, "#ffc0b0"], [0.05, "#f8a0a8"], [0.15, "#c890b8"], [0.35, "#7a84c4"], [1.0, "#3a4c9a"]],
    sun: [7, 0.7, -10],
    glow: "#fff0d8",
    bg: "#c890b8",
    fog: ["#f0b8b8", 35, 150],
    ambient: [1.1, "#ffe0e0"],
    hemi: ["#ffd0d0", "#2a2a4a", 0.6],
    key: [2.0, "#ffc0a0"],
    water: "#4a5a8a",
    foam: "#ffe4e4",
  },
  morning: {
    stops: [[-0.1, "#f4f6e8"], [0.0, "#e4f2ec"], [0.08, "#b8e0ee"], [0.2, "#7cc0ea"], [0.5, "#4a98dc"], [1.0, "#2a74c4"]],
    sun: [-5, 7, 8],
    glow: "#fffbe0",
    bg: "#b8e0ee",
    fog: ["#d8eef0", 40, 170],
    ambient: [1.25, "#fffff4"],
    hemi: ["#e8fff0", "#2a6050", 0.6],
    key: [2.5, "#fff6dc"],
    water: "#1e7088",
    foam: "#f4fffc",
  },
};
export const seaBg = (mode: SeaMode) => SEA[mode].bg;

// How puppets are lit at sea: the low sun or the moon as a directional light, a lantern if near.
export const seaLight = (mode: SeaMode, lantern?: { position: Vec3; strength?: number }): PuppetLight => {
  const points = lantern ? [{ position: lantern.position, color: "#ffb05a", strength: lantern.strength ?? 2.2, range: 2.4 }] : [];
  switch (mode) {
    case "golden":
      return { tint: "#fff0d8", shadow: 0.16, points, distant: [{ direction: [0.5, 0.25, -0.8], color: "#ffd080", strength: 1.3 }] };
    case "dusk":
      return { tint: "#ffd8c0", shadow: 0.2, points, distant: [{ direction: [-0.8, 0.15, -0.5], color: "#ff9a50", strength: 1.6 }] };
    case "night":
      return { tint: "#a8b4e0", tintAmount: 0.08, shadow: 0.28, points, distant: [{ direction: [-0.6, 0.45, -0.6], color: "#c8d4ff", strength: 0.9 }] };
    case "violet":
      return { tint: "#f0d8ff", shadow: 0.16, points, distant: [{ direction: [0.4, 0.4, -0.8], color: "#ffc8f0", strength: 1.0 }] };
    case "dawn":
      return { tint: "#ffe0e0", shadow: 0.16, points, distant: [{ direction: [0.6, 0.15, -0.7], color: "#ffb090", strength: 1.3 }] };
    default:
      return { tint: "#fffaf0", shadow: 0.14, points, distant: [{ direction: [-0.5, 0.75, 0.45], color: "#fff4dc", strength: 1.1 }] };
  }
};

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Height of the swell at (x, z) on `frame` (relative to the set's level). `chop` scales it.
export const seaY = (x: number, z: number, frame: number, chop = 1) =>
  chop *
  (0.16 * Math.sin(x * 0.21 + z * 0.13 + frame * 0.045) +
    0.09 * Math.sin(-x * 0.37 + z * 0.29 + frame * 0.062 + 1.3) +
    0.05 * Math.sin(x * 0.83 - z * 0.61 + frame * 0.09 + 2.1) +
    0.025 * Math.sin(x * 1.9 + z * 1.4 - frame * 0.13));

const SeaWater: React.FC<{ frame: number; m: SeaMood; cx: number; cz: number; level: number; chop: number }> = ({ frame, m, cx, cz, level, chop }) => {
  const N = 110;
  const SIZE = 180;
  const geo = useOwned(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
    g.rotateX(-Math.PI / 2);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  });
  // the grid snaps to whole cells so the waves stay put in the world as the camera moves
  const cell = SIZE / N;
  const ox = Math.round(cx / cell) * cell;
  const oz = Math.round(cz / cell) * cell - SIZE * 0.3;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  const base = new THREE.Color(m.water);
  const crest = base.clone().lerp(new THREE.Color(m.foam), 0.35);
  const trough = base.clone().multiplyScalar(0.7);
  const c = new THREE.Color();
  const g0 = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  g0.rotateX(-Math.PI / 2);
  const rest = g0.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = rest.getX(i) + ox;
    const z = rest.getZ(i) + oz;
    const d = Math.hypot(x - cx, z - cz);
    const k = chop * Math.max(0.15, 1 - d / 90);
    const y = seaY(x, z, frame, k);
    pos.setXYZ(i, rest.getX(i), y, rest.getZ(i));
    c.copy(base);
    if (y > 0.1 * k) c.lerp(crest, Math.min(1, (y - 0.1 * k) / (0.15 * k + 0.01)));
    else if (y < -0.08 * k) c.lerp(trough, Math.min(1, (-y - 0.08 * k) / (0.15 * k + 0.01)));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  g0.dispose();
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeVertexNormals();

  const COUNT = 420;
  const foam = useOwned(() => new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8, depthWrite: false }), COUNT));
  const o = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    const span = 70;
    const x = cx + (((rand(i) * span + frame * 0.01 * (0.5 + rand(i + 9))) % span) - span / 2);
    const z = cz - 4 - rand(i + 300) * 60 + 10;
    const life = 90 + rand(i + 5) * 80;
    const age = (frame + rand(i + 6) * life) % life;
    const a = Math.sin((age / life) * Math.PI);
    const sx = (0.06 + rand(i + 7) * 0.12) * (0.4 + a);
    const sz = (0.04 + rand(i + 8) * 0.06) * (0.4 + a);
    o.position.set(x, level + seaY(x, z, frame, chop) + 0.015, z);
    o.rotation.set(-Math.PI / 2, 0, rand(i + 3) * 0.6);
    o.scale.set(sx * 3, sz * 3, 1);
    o.updateMatrix();
    foam.setMatrixAt(i, o.matrix);
  }
  foam.instanceMatrix.needsUpdate = true;
  (foam.material as THREE.MeshBasicMaterial).color.set(m.foam);
  return (
    <group userData={{ ghost: true, noInk: true }}>
      <mesh geometry={geo} position={[ox, level, oz]} receiveShadow>
        <meshToonMaterial color="#ffffff" vertexColors gradientMap={toonRamp} />
      </mesh>
      <primitive object={foam} />
    </group>
  );
};

const SeaSky: React.FC<{ camera: CameraShot; m: SeaMood }> = ({ camera, m }) => {
  const dir = new THREE.Vector3(...m.sun).normalize();
  const stars = useOwned(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 320; i++) {
      const a = rand(i) * Math.PI * 2;
      const e = 0.1 + rand(i + 300) * 0.85;
      p.push(Math.cos(a) * Math.cos(e) * 280, Math.sin(e) * 280, Math.sin(a) * Math.cos(e) * 280);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  });
  const disc = dir.clone().multiplyScalar(270);
  return (
    <group position={camera.position}>
      <SkyDome sun={m.sun} stops={m.stops} glow={m.glow} />
      <mesh position={disc.toArray()} onUpdate={(o) => o.lookAt(0, 0, 0)}>
        <circleGeometry args={[m.moon ? 8 : 11, 48]} />
        <meshBasicMaterial color={m.moon ? "#f6f2de" : "#fff6dc"} fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      {m.moon && (
        <>
          <mesh position={disc.clone().multiplyScalar(0.99).toArray()} onUpdate={(o) => o.lookAt(0, 0, 0)}>
            <circleGeometry args={[22, 48]} />
            <meshBasicMaterial color="#c8d4ff" transparent opacity={0.16} fog={false} toneMapped={false} depthWrite={false} />
          </mesh>
          <points geometry={stars}>
            <pointsMaterial color="#ffffff" size={1.7} sizeAttenuation={false} fog={false} toneMapped={false} depthWrite={false} />
          </points>
        </>
      )}
    </group>
  );
};

export const SeaSet: React.FC<{ camera: CameraShot; frame: number; mode: SeaMode; level?: number; chop?: number; roll?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode,
  level = 0,
  chop = 1,
  roll = 0,
  children,
}) => {
  const m = SEA[mode];
  const sun = new THREE.Vector3(...m.sun).normalize().multiplyScalar(30);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <ambientLight intensity={m.ambient[0]} color={m.ambient[1]} />
      <hemisphereLight args={[m.hemi[0], m.hemi[1], m.hemi[2]]} />
      <directionalLight
        position={[sun.x, Math.max(6, sun.y), sun.z]}
        intensity={m.key[0]}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
      />
      <directionalLight position={[2, 4, 10]} intensity={0.45} color={m.hemi[0]} />
      <SeaSky camera={camera} m={m} />
      {/* the horizon rolls a little round the camera: the ship is moving */}
      <group position={[camera.position[0], 0, camera.position[2]]} rotation={[0, 0, roll]}>
        <group position={[-camera.position[0], 0, -camera.position[2]]}>
          <SeaWater frame={frame} m={m} cx={camera.position[0]} cz={camera.position[2]} level={level} chop={chop} />
        </group>
      </group>
      {children}
    </>
  );
};

// ---------- ships ----------

export const NAO = "videos/what-if-columbus/models/nao.glb";
export const CARAVEL = "videos/what-if-columbus/models/caravel.glb";
const WATERLINE = 0.45;

// A ship riding the swell: `at` [x, z], `heading` (0 = bow toward +z, -PI/2 = sailing toward -x), `turn` extra yaw.
export const Ship: React.FC<{ kind: "nao" | "caravel"; at: [number, number]; heading: number; frame: number; scale?: number; level?: number; chop?: number; phase?: number }> = ({
  kind,
  at,
  heading,
  frame,
  scale = 1,
  level = 0,
  chop = 1,
  phase = 0,
}) => {
  const [x, z] = at;
  const L = (kind === "nao" ? 2.0 : 1.7) * scale;
  const fx = Math.sin(heading) * L;
  const fz = Math.cos(heading) * L;
  const f = frame + phase;
  const bow = seaY(x + fx, z + fz, f, chop);
  const stern = seaY(x - fx, z - fz, f, chop);
  const mid = seaY(x, z, f, chop);
  const pitch = Math.atan2(stern - bow, 2 * L) * 0.8;
  const roll = 0.035 * Math.sin(f * 0.05 + x) + 0.02 * Math.sin(f * 0.083 + 1);
  return (
    <group position={[x, level + mid - WATERLINE * scale + 0.03, z]} rotation={[0, heading, 0]}>
      <group rotation={[pitch, 0, roll]}>
        <BlenderModel src={kind === "nao" ? NAO : CARAVEL} scale={scale} ink={0.018 * scale} />
      </group>
    </group>
  );
};

// A ship's wake: foam flecks streaming behind it.
export const Wake: React.FC<{ at: [number, number]; heading: number; frame: number; length?: number; level?: number; scale?: number }> = ({ at, heading, frame, length = 6, level = 0, scale = 1 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: 22 }, (_, i) => {
      const t = ((i / 22 + frame * 0.006) % 1) * length;
      const side = i % 2 ? 1 : -1;
      const spread = 0.35 * scale + t * 0.18;
      const bx = at[0] - Math.sin(heading) * (2 * scale + t) + Math.cos(heading) * side * spread;
      const bz = at[1] - Math.cos(heading) * (2 * scale + t) - Math.sin(heading) * side * spread;
      const s = (0.18 + rand(i) * 0.12) * scale * (1 - t / length);
      return (
        <mesh key={i} position={[bx, level + seaY(bx, bz, frame) + 0.03, bz]} rotation={[-Math.PI / 2, 0, rand(i + 2)]} scale={[s * 1.6, s, 1]}>
          <circleGeometry args={[1, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.75} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

// ---------- islands ----------

const coneMat = (color: string) => <meshToonMaterial color={color} gradientMap={toonRamp} />;

// The volcanic Canary peak with green lower slopes and a pale cap, far off (place 40-70 m away).
export const CanaryPeak: React.FC<{ position: Vec3; size?: number }> = ({ position, size = 1 }) => (
  <group position={position} scale={size}>
    <mesh position={[0, 4, 0]}>
      <coneGeometry args={[22, 8, 9]} />
      {coneMat("#5a7a4a")}
    </mesh>
    <mesh position={[1.5, 10, -1]}>
      <coneGeometry args={[11, 14, 9]} />
      {coneMat("#8a6a52")}
    </mesh>
    <mesh position={[1.5, 16.2, -1]}>
      <coneGeometry args={[3.2, 2.6, 9]} />
      {coneMat("#f2ece0")}
    </mesh>
    <mesh position={[-14, 2.5, 4]}>
      <coneGeometry args={[10, 5, 8]} />
      {coneMat("#6a8a52")}
    </mesh>
  </group>
);

// A palm: a leaning trunk and a crown of drooping fronds.
export const Palm: React.FC<{ position: Vec3; height?: number; lean?: number; sway?: number; seed?: number }> = ({ position, height = 3, lean = 0.2, sway = 0, seed = 1 }) => (
  <group position={position} rotation={[0, rand(seed) * 6, lean]}>
    <InkCylinder radius={0.09} height={height} position={[0, height / 2, 0]} color="#8a6a44" ink={0.02} />
    <group position={[0, height, 0]} rotation={[0, 0, sway * 0.08]}>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
          <InkBox size={[0.22, 0.04, 1.3]} position={[0, -0.18, 0.6]} rotation={[0.45 + rand(seed + i) * 0.2, 0, 0]} color={i % 2 ? "#3a8a3a" : "#2e7a34"} ink={0.015} />
        </group>
      ))}
    </group>
  </group>
);

// A low green island with a sand rim and palms (the Bahamas landfall), far off.
export const GreenIsland: React.FC<{ position: Vec3; width?: number; frame?: number }> = ({ position, width = 40, frame = 0 }) => (
  <group position={position}>
    <mesh scale={[width / 2, 1.6, 6]} position={[0, -0.4, 0]}>
      <sphereGeometry args={[1, 28, 12]} />
      {coneMat("#e8d8a8")}
    </mesh>
    <mesh scale={[width / 2.3, 2.6, 5]} position={[0, 0, -0.6]}>
      <sphereGeometry args={[1, 28, 12]} />
      {coneMat("#3f8a48")}
    </mesh>
    {Array.from({ length: 9 }, (_, i) => (
      <Palm key={i} position={[(i / 8 - 0.5) * width * 0.8, 1.2 + rand(i) * 0.8, 2.6 + rand(i + 4)]} height={2.8 + rand(i + 1) * 1.6} lean={(rand(i + 2) - 0.5) * 0.5} sway={Math.sin(frame * 0.05 + i)} seed={i + 3} />
    ))}
  </group>
);

// The pale cliff on the horizon in the moonlight (what Rodrigo de Triana saw).
export const MoonCliff: React.FC<{ position: Vec3; width?: number; glow?: number }> = ({ position, width = 24, glow = 1 }) => (
  <group position={position}>
    <InkBox size={[width, 3.2, 3]} position={[0, 1.2, 0]} color="#d8dcf0" ink={0.08} emissive={glow > 0 ? "#2a3060" : undefined} />
    <mesh scale={[width / 2.1, 2.2, 3]} position={[0, 2.6, -1.2]}>
      <sphereGeometry args={[1, 24, 10]} />
      {coneMat("#2a3458")}
    </mesh>
  </group>
);

// ---------- the deck (the Santa María's waist) ----------

export const DECK = { far: -1.35, near: 2.6, rail: 0.82, mast: [0.95, -0.55] as [number, number], water: -1.7 };

const plankCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#c09a68";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++) {
      const y = i * 64;
      ctx.fillStyle = i % 2 ? "rgba(140,100,60,0.25)" : "rgba(220,190,140,0.18)";
      ctx.fillRect(0, y, 512, 64);
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(0, y, 512, 4);
      for (let k = 0; k < 2; k++) {
        const x = (rand(i * 3 + k) * 512) | 0;
        ctx.fillRect(x, y, 3, 64);
      }
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = "rgba(90,60,30,0.18)";
        ctx.beginPath();
        ctx.ellipse(rand(i * 9 + k) * 512, y + 32, 30 + rand(k) * 40, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let k = 0; k < 14; k++) {
      ctx.fillStyle = "rgba(60,40,20,0.12)";
      ctx.beginPath();
      ctx.arc(rand(k + 50) * 512, rand(k + 60) * 512, 10 + rand(k + 70) * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const hullCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#6a4428";
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "rgba(40,24,12,0.3)" : "rgba(140,100,60,0.18)";
      ctx.fillRect(0, i * 32, 512, 32);
      ctx.fillStyle = "#2a1a0e";
      ctx.fillRect(0, i * 32, 512, 3);
    }
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = "#2a1a0e";
      ctx.beginPath();
      ctx.arc(rand(k) * 512, rand(k + 9) * 256, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

export const Barrel: React.FC<{ position: Vec3; color?: string; h?: number }> = ({ position, color = "#8a6440", h = 0.55 }) => (
  <group position={position}>
    <InkCylinder radius={0.2} height={h} position={[0, h / 2, 0]} color={color} ink={0.012} />
    {[0.12, h - 0.12].map((y) => (
      <InkCylinder key={y} radius={0.205} height={0.04} position={[0, y, 0]} color="#3a3530" ink={0} />
    ))}
  </group>
);

export const RopeCoil: React.FC<{ position: Vec3; size?: number }> = ({ position, size = 1 }) => (
  <group position={position} scale={size}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[0, 0.03 + i * 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2 - i * 0.03, 0.025, 8, 24]} />
        <meshToonMaterial color="#b89a68" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

export const DeckSet: React.FC<{ camera: CameraShot; frame: number; mode: SeaMode; roll?: number; sail?: number; children?: React.ReactNode; hull?: boolean }> = ({
  camera,
  frame,
  mode,
  roll = 0,
  sail = 1,
  children,
  hull = true,
}) => {
  const planks = useOwned(() => tiled(plankCanvas(), 3, 2));
  const hullTex = useOwned(() => tiled(hullCanvas(), 3, 1));
  const W = 7;
  const [mx, mz] = DECK.mast;
  return (
    <SeaSet camera={camera} frame={frame} mode={mode} level={DECK.water} roll={roll} chop={0.9}>
      {/* deck planks */}
      <InkBox size={[W, 0.1, DECK.near - DECK.far]} position={[0, -0.05, (DECK.near + DECK.far) / 2]} color="#ffffff" map={planks} ink={0} />
      {/* far bulwark: planked inside, a capping rail, scupper holes, stanchions */}
      <InkBox size={[W, DECK.rail, 0.12]} position={[0, DECK.rail / 2, DECK.far]} color="#ffffff" map={hullTex} ink={0.015} />
      <InkBox size={[W + 0.1, 0.08, 0.2]} position={[0, DECK.rail + 0.04, DECK.far]} color="#7a5232" ink={0.012} />
      {Array.from({ length: 8 }, (_, i) => (
        <InkBox key={i} size={[0.08, DECK.rail, 0.08]} position={[-W / 2 + 0.4 + i * 0.88, DECK.rail / 2, DECK.far + 0.09]} color="#5a3a24" ink={0.008} />
      ))}
      {/* the hull's outer face below the rail, down into the sea (seen from outside in the clues shot) */}
      {hull && <InkBox size={[W, 2.6, 0.1]} position={[0, DECK.rail - 1.3, DECK.far - 0.12]} color="#ffffff" map={hullTex} ink={0.015} />}
      {hull && <InkBox size={[W + 0.04, 0.12, 0.05]} position={[0, DECK.rail - 0.35, DECK.far - 0.19]} color="#c8a060" ink={0.008} />}
      {/* mainmast with iron bands, a yard and the bellied main course high above, shrouds down to the rail */}
      <InkCylinder radius={0.13} height={9} position={[mx, 4.5, mz]} color="#7a5232" ink={0.015} />
      {[0.6, 1.2, 1.8].map((y) => (
        <InkCylinder key={y} radius={0.135} height={0.05} position={[mx, y, mz]} color="#2a2420" ink={0} />
      ))}
      <InkCylinder radius={0.07} height={5.2} position={[mx, 6.25, mz - 0.18]} rotation={[0, 0, Math.PI / 2]} color="#6a4428" ink={0.012} />
      <group position={[mx, 4.9, mz - 0.25]} rotation={[0.05 * sail + 0.02 * Math.sin(frame * 0.06), 0, 0]}>
        <InkBox size={[4.6, 2.6, 0.06]} position={[0, 0, -0.08 * sail]} color="#f2e6c8" ink={0.02} />
        <InkBox size={[0.42, 1.7, 0.02]} position={[0, -0.05, 0.0]} color="#b8282a" ink={0} />
        <InkBox size={[2.0, 0.32, 0.02]} position={[0, 0.25, 0.0]} color="#b8282a" ink={0} />
      </group>
      {[-1.4, -0.6, 0.3, 1.1].map((dx, i) => (
        <Cord key={i} a={[mx + dx * 1.3, DECK.rail + 0.06, DECK.far]} b={[mx + dx * 0.08, 7.6, mz]} width={0.022} color="#3a2a1c" />
      ))}
      {/* hatch grating, barrels, a coiled rope, a bucket */}
      <InkBox size={[0.9, 0.08, 0.7]} position={[-0.9, 0.04, 0.2]} color="#8a6440" ink={0.01} />
      <Barrel position={[-2.3, 0, -0.95]} />
      <Barrel position={[-1.85, 0, -1.0]} color="#946c46" />
      <Barrel position={[-2.1, 0.55, -0.98]} color="#8a6440" h={0.5} />
      <RopeCoil position={[2.0, 0, -0.85]} />
      {children}
    </SeaSet>
  );
};

// ---------- the crow's nest (the Pinta's main top at night) ----------

// The lookout stands on the nest floor at y = 0; the mast runs down to the deck far below and up to the masthead.
export const CrowsNest: React.FC<{ frame: number }> = ({ frame }) => (
  <group userData={{ ghost: true }}>
    <InkCylinder radius={0.11} height={16} position={[0, -7.6, -0.25]} color="#6a4428" ink={0.015} />
    <InkCylinder radius={0.08} height={2.4} position={[0, 1.1, -0.25]} color="#6a4428" ink={0.012} />
    {/* floor and a waist-high rim of staves; open on the camera side so the lookout's body shows */}
    <InkCylinder radius={0.5} height={0.06} position={[0, -0.03, 0]} color="#5a3a24" ink={0.012} />
    {Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * Math.PI * 2;
      if (Math.cos(a) > 0.55) return null;
      return <InkBox key={i} size={[0.2, 0.46, 0.05]} position={[Math.sin(a) * 0.5, 0.23, Math.cos(a) * 0.5]} rotation={[0, a, 0]} color={i % 2 ? "#6a4428" : "#5e3c22"} ink={0.01} />;
    })}
    <mesh position={[0, 0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.5, 0.03, 8, 32, Math.PI * 1.6]} />
      <meshToonMaterial color="#3a2a1c" gradientMap={toonRamp} />
    </mesh>
    {/* shrouds: a ladder of rope (ratlines) climbing from below to the rim */}
    {[-1, 1].map((s) =>
      [0, 1, 2].map((k) => <Cord key={`${s}${k}`} a={[s * (1.8 + k * 0.3), -6, -0.6 + k * 0.4]} b={[s * 0.42, 0.0, -0.1 + k * 0.08]} width={0.02} color="#2a2018" />),
    )}
    {Array.from({ length: 9 }, (_, i) => {
      const t = i / 9;
      const y = -6 * (1 - t) - 0.2;
      const x = 1.9 * (1 - t) + 0.42 * t;
      return <Cord key={`r${i}`} a={[x - 0.02, y, -0.55 + t * 0.45]} b={[x + 0.6 * (1 - t), y, -0.15 + t * 0.05]} width={0.014} color="#2a2018" />;
    })}
    {/* a pennant streaming from the masthead */}
    <InkBox size={[0.02, 0.18, 0.7]} position={[0, 2.25, -0.25 - 0.35]} rotation={[0.08 * Math.sin(frame * 0.2), 0.1 * Math.sin(frame * 0.13), 0]} color="#2a7a4a" ink={0.006} />
  </group>
);

export { Blob, Halo };
