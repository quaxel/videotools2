import React from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- the world map (equirectangular, left edge = 180 W) ----------

type Poly = [number, number][];
const LAND: Poly[] = [
  // North America (with the Yucatan)
  [[-168, 66], [-140, 70], [-95, 72], [-80, 63], [-62, 58], [-55, 50], [-66, 44], [-76, 35], [-81, 25], [-81, 30], [-90, 29], [-97, 26], [-97, 21], [-91, 18.5], [-90, 21.5], [-87, 21.5], [-88, 16], [-83, 9], [-79, 8], [-90, 14], [-105, 20], [-112, 31], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  [[-55, 60], [-42, 60], [-20, 70], [-20, 82], [-60, 82], [-72, 77]],
  // South America
  [[-80, 8], [-72, 12], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -42], [-68, -55], [-75, -50], [-72, -30], [-70, -18], [-81, -5]],
  // Europe
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [5, 52], [10, 55], [5, 58], [10, 63], [20, 70], [30, 70], [40, 66], [45, 45], [28, 41], [25, 36], [15, 38], [10, 44], [3, 42]],
  [[-6, 50], [2, 51], [-2, 58], [-6, 57]],
  // Africa
  [[-17, 21], [-10, 30], [-6, 36], [10, 37], [32, 31], [35, 28], [43, 12], [51, 12], [40, -5], [40, -15], [35, -25], [20, -35], [17, -28], [12, -15], [9, -2], [9, 4], [-8, 4], [-17, 14]],
  [[44, -16], [50, -14], [47, -25], [44, -24]],
  // Asia
  [[30, 70], [60, 75], [100, 78], [140, 72], [170, 68], [180, 66], [180, 62], [160, 58], [140, 54], [130, 42], [122, 40], [120, 30], [110, 20], [105, 10], [100, 13], [98, 8], [92, 22], [80, 15], [77, 8], [72, 20], [60, 25], [57, 26], [50, 30], [48, 29], [55, 22], [45, 13], [35, 28], [36, 36], [28, 41], [45, 45], [40, 66]],
  [[130, 31], [141, 36], [142, 44], [138, 40]],
  [[95, 5], [105, -6], [118, -8], [120, 0], [110, 2]],
  // Australia
  [[114, -22], [130, -12], [137, -12], [145, -15], [153, -27], [150, -37], [140, -38], [132, -32], [115, -34]],
  // Antarctica
  [[-180, -72], [180, -72], [180, -90], [-180, -90]],
];

// Hydrocarbon-rich sedimentary basins, drawn after the kind of map Kaiho & Oshima made (illustrative, not their data):
// [lon, lat, rx, ry]. The Gulf of Mexico / Yucatan is the first.
export const OILY: [number, number, number, number][] = [
  [-92, 22, 9, 6],
  [-112, 52, 6, 9],
  [-100, 32, 5, 5],
  [-67, 8, 6, 4],
  [3, 57, 5, 3],
  [48, 28, 10, 7],
  [73, 62, 12, 8],
  [52, 43, 5, 4],
  [5, 28, 8, 5],
  [-152, 70, 9, 2.5],
  [108, 36, 6, 4],
  [-40, -22, 4, 3],
  [5, 3, 4, 3],
  [122, -20, 4, 3],
];

const drawWorld = (ctx: CanvasRenderingContext2D, W: number, H: number, oily: boolean, ocean = "#3a7cc8", land = "#9cc870") => {
  const X = (lon: number) => ((lon + 180) / 360) * W;
  const Y = (lat: number) => ((90 - lat) / 180) * H;
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);
  // faint graticule
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = W / 1024;
  for (let lon = -180; lon <= 180; lon += 30) {
    ctx.beginPath();
    ctx.moveTo(X(lon), 0);
    ctx.lineTo(X(lon), H);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    ctx.moveTo(0, Y(lat));
    ctx.lineTo(W, Y(lat));
    ctx.stroke();
  }
  ctx.fillStyle = land;
  ctx.strokeStyle = "#1e3a20";
  ctx.lineWidth = W / 700;
  for (const p of LAND) {
    ctx.beginPath();
    p.forEach(([lon, lat], i) => (i ? ctx.lineTo(X(lon), Y(lat)) : ctx.moveTo(X(lon), Y(lat))));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // paler deserts / ice for some painted variety
  ctx.fillStyle = "rgba(240,220,160,0.55)";
  for (const [lon, lat, rx, ry] of [[15, 23, 18, 7], [45, 24, 8, 6], [133, -25, 9, 6], [-110, 36, 6, 5]] as const) {
    ctx.beginPath();
    ctx.ellipse(X(lon), Y(lat), (rx / 360) * W, (ry / 180) * H, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f4f8fc";
  ctx.fillRect(0, Y(-74), W, H - Y(-74));
  if (!oily) return;
  // the oily rock: solid dark brown with a lighter hatch and a thick ink rim, so it reads against land and sea
  for (const [lon, lat, rx, ry] of OILY) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(X(lon), Y(lat), (rx / 360) * W, (ry / 180) * H, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#2a1a12";
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = "rgba(200,140,80,0.6)";
    ctx.lineWidth = W / 500;
    for (let k = -H; k < W + H; k += W / 160) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k - H, H);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(X(lon), Y(lat), (rx / 360) * W, (ry / 180) * H, 0.2, 0, Math.PI * 2);
    ctx.strokeStyle = "#0e0806";
    ctx.lineWidth = W / 400;
    ctx.stroke();
  }
};

export const worldTexture = (oily: boolean) => canvasTexture(2048, 1024, (ctx) => drawWorld(ctx, 2048, 1024, oily));

// Turn the globe so longitude `lon` faces +z (the camera).
export const faceLon = (lon: number) => (-(lon + 90) * Math.PI) / 180;

// A sphere with the world painted on, ink rim; `spin` radians about y, `tilt` toward the camera.
export const Earth: React.FC<{ position: Vec3; radius: number; spin: number; tilt?: number; oily?: boolean; atmosphere?: boolean }> = ({ position, radius, spin, tilt = 0.25, oily = false, atmosphere = false }) => {
  const tex = useOwned(() => worldTexture(oily), [oily]);
  return (
    <group position={position} rotation={[tilt, 0, 0]}>
      <mesh rotation={[0, spin, 0]}>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      <mesh scale={1.02}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {atmosphere && (
        <mesh scale={1.08}>
          <sphereGeometry args={[radius, 48, 32]} />
          <meshBasicMaterial color="#7ab8ff" transparent opacity={0.18} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// A point on the globe's surface (before tilt) for lon/lat with the globe turned by `spin`.
export const globePoint = (centre: Vec3, radius: number, lon: number, lat: number, spin: number, tilt = 0.25, out = 1): Vec3 => {
  const phi = ((lon + 180) / 360) * Math.PI * 2;
  const theta = ((90 - lat) / 180) * Math.PI;
  const r = radius * out;
  let v = new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
  v = v.applyAxisAngle(new THREE.Vector3(0, 1, 0), spin).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
  return [centre[0] + v.x, centre[1] + v.y, centre[2] + v.z];
};

// A desk globe on a brass meridian ring and a wooden stand.
export const DeskGlobe: React.FC<{ position: Vec3; radius: number; spin: number }> = ({ position, radius, spin }) => (
  <group position={position}>
    <Earth position={[0, 0, 0]} radius={radius} spin={spin} tilt={0.18} oily />
    <mesh rotation={[0, 0, 0.0]}>
      <torusGeometry args={[radius * 1.07, radius * 0.025, 10, 64, Math.PI * 1.25]} />
      <meshToonMaterial color="#c8a040" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={radius * 0.06} height={radius * 0.5} position={[0, -radius * 1.3, 0]} color="#7a4a2a" ink={0.012} />
    <InkCylinder radius={radius * 0.55} height={radius * 0.1} position={[0, -radius * 1.55, 0]} color="#6a3e22" ink={0.014} />
  </group>
);

// A flat world map on a monitor (the 2017 lab).
export const MapMonitor: React.FC<{ position: Vec3; width: number; reveal: number }> = ({ position, width, reveal }) => {
  const plain = useOwned(() => worldTexture(false));
  const oily = useOwned(() => worldTexture(true));
  const h = width / 2;
  return (
    <group position={position}>
      <InkBox size={[width + 0.08, h + 0.08, 0.05]} position={[0, 0, -0.03]} color="#2a2a30" ink={0.01} />
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={plain} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial map={oily} toneMapped={false} transparent opacity={reveal} />
      </mesh>
      <InkBox size={[0.06, 0.25, 0.06]} position={[0, -h / 2 - 0.14, -0.03]} color="#2a2a30" ink={0.008} />
      <InkBox size={[0.3, 0.03, 0.18]} position={[0, -h / 2 - 0.27, -0.03]} color="#2a2a30" ink={0.008} />
    </group>
  );
};

// ---------- space ----------

export const Stars: React.FC<{ count?: number; radius?: number }> = ({ count = 400, radius = 120 }) => {
  const geo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = rand(i) * 2 - 1;
      const a = rand(i + 999) * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      p.set([Math.cos(a) * s * radius, u * radius, Math.sin(a) * s * radius], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={0.5} sizeAttenuation fog={false} toneMapped={false} />
    </points>
  );
};

// A lumpy grey space rock with craters and an ink rim; `heat` 0..1 adds an orange glow tail (entering the air).
export const Asteroid: React.FC<{ position: Vec3; size: number; spin: number; heat?: number; dir?: Vec3 }> = ({ position, size, spin, heat = 0, dir = [-1, -0.5, -0.3] }) => {
  const geo = useOwned(() => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const k = 1 + (Math.sin(v.x * 3.1) * Math.cos(v.y * 2.3) * 0.12 + Math.sin(v.z * 4.7 + v.y) * 0.07);
      v.multiplyScalar(k);
      v.y *= 0.85;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
  const back = new THREE.Vector3(...dir).normalize().multiplyScalar(-1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), back);
  return (
    <group position={position}>
      <group rotation={[spin * 0.7, spin, 0]} scale={size}>
        <mesh geometry={geo}>
          <meshToonMaterial color="#8a7e74" gradientMap={toonRamp} />
        </mesh>
        <mesh geometry={geo} scale={1.05}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
        {[[0.6, 0.5, 0.55, 0.22], [-0.4, 0.7, 0.5, 0.16], [0.1, -0.3, 0.9, 0.2]].map(([x, y, z, r], i) => (
          <mesh key={i} position={[x, y, z]} onUpdate={(m) => m.lookAt(0, 0, 0)}>
            <circleGeometry args={[r, 14]} />
            <meshBasicMaterial color="#5e544c" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {heat > 0 && (
        <group quaternion={q} userData={{ ghost: true }}>
          <mesh position={[0, size * 2.2, 0]}>
            <coneGeometry args={[size * 1.2, size * 4.5, 16, 1, true]} />
            <meshBasicMaterial color="#ff9a40" transparent opacity={0.75 * heat} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, size * 1.2, 0]}>
            <coneGeometry args={[size * 1.05, size * 2.4, 16, 1, true]} />
            <meshBasicMaterial color="#fff2b0" transparent opacity={0.85 * heat} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------- the cut-away seabed ----------

export const SEA = { top: 0, water: 1.1, lime: 0.7, sulfur: 0.55, oil: 0.6, width: 7, depth: 7 };
const yOf = { lime: -SEA.water, sulfur: -SEA.water - SEA.lime, oil: -SEA.water - SEA.lime - SEA.sulfur, rock: -SEA.water - SEA.lime - SEA.sulfur - SEA.oil };

const strataTex = (kind: "lime" | "sulfur" | "oil" | "rock") =>
  canvasTexture(512, 128, (ctx) => {
    const base = { lime: "#e8dcb8", sulfur: "#f2d040", oil: "#2a1a14", rock: "#7a6a5e" }[kind];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 90; i++) {
      const x = rand(i + kind.length * 50) * 512;
      const y = rand(i + 300 + kind.length) * 128;
      if (kind === "oil") {
        ctx.fillStyle = i % 3 ? "rgba(90,60,40,0.7)" : "rgba(160,120,80,0.5)";
        ctx.beginPath();
        ctx.ellipse(x, y, 6 + rand(i) * 16, 4 + rand(i + 3) * 8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === "sulfur") {
        ctx.fillStyle = i % 2 ? "rgba(255,250,160,0.8)" : "rgba(200,150,20,0.5)";
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 6, y);
        ctx.lineTo(x, y + 8);
        ctx.lineTo(x - 6, y);
        ctx.fill();
      } else {
        ctx.fillStyle = i % 2 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
        ctx.fillRect(x, y, 10 + rand(i) * 40, 2 + rand(i + 1) * 3);
      }
    }
  });

export const Seabed: React.FC<{ frame: number }> = ({ frame }) => {
  const lime = useOwned(() => strataTex("lime"));
  const sulfur = useOwned(() => strataTex("sulfur"));
  const oil = useOwned(() => strataTex("oil"));
  const rock = useOwned(() => strataTex("rock"));
  const W = SEA.width;
  const D = SEA.depth;
  const layer = (y: number, h: number, map: THREE.Texture, color = "#ffffff") => (
    <group position={[0, y - h / 2, -D / 2]}>
      <mesh receiveShadow>
        <boxGeometry args={[W, h, D]} />
        <meshToonMaterial color={color} map={map} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
  return (
    <group>
      {/* water: a see-through turquoise slab over the strata, its surface rippling */}
      <mesh position={[0, -SEA.water / 2, -D / 2]}>
        <boxGeometry args={[W, SEA.water, D]} />
        <meshBasicMaterial color="#3ac0c8" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.002, -D / 2 - 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 60 + D]} />
        <meshToonMaterial color="#48b8c4" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[((rand(i) * 8 + frame * 0.006) % 8) - 4, 0.004, -0.4 - rand(i + 4) * 6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4 + rand(i + 9) * 0.6, 0.03]} />
          <meshBasicMaterial color="#e8ffff" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      ))}
      {/* the front edge of the water as an ink line, so the cut reads */}
      <InkBox size={[W, 0.012, 0.012]} position={[0, 0, 0.003]} color="#e8ffff" ink={0.004} />
      {layer(yOf.lime, SEA.lime, lime)}
      {layer(yOf.sulfur, SEA.sulfur, sulfur)}
      {layer(yOf.oil, SEA.oil, oil)}
      {layer(yOf.rock, 4, rock)}
      {/* the sea floor: sand, a little weed, fish */}
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i} position={[-3 + i * 0.75, -SEA.water, -0.4 - rand(i) * 2]}>
          <mesh position={[0, 0.12 + Math.sin(frame * 0.08 + i) * 0.01, 0]} rotation={[0, 0, Math.sin(frame * 0.06 + i) * 0.15]}>
            <coneGeometry args={[0.03, 0.24 + rand(i + 3) * 0.2, 5]} />
            <meshToonMaterial color="#3a8a4a" gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      {[0, 1, 2].map((i) => (
        <Fish key={i} position={[((frame * (0.012 + i * 0.004) + i * 2.4) % 7) - 3.5, -0.35 - i * 0.22, -0.3 - i * 0.4]} color={["#f2884a", "#f2d04a", "#e85a7a"][i]} frame={frame + i * 9} />
      ))}
      {/* the cut faces get an ink line between layers */}
      {[yOf.lime, yOf.sulfur, yOf.oil, yOf.rock].map((y, i) => (
        <InkBox key={i} size={[W, 0.014, 0.014]} position={[0, y, 0.004]} color={INK} ink={0} />
      ))}
    </group>
  );
};
export const SEA_Y = yOf;

const Fish: React.FC<{ position: Vec3; color: string; frame: number }> = ({ position, color, frame }) => (
  <group position={position} rotation={[0, 0, Math.sin(frame * 0.3) * 0.08]}>
    <mesh scale={[1.6, 0.9, 0.6]}>
      <sphereGeometry args={[0.06, 12, 8]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[-0.11, 0, 0]} rotation={[0, 0, Math.PI / 2 + Math.sin(frame * 0.5) * 0.3]}>
      <coneGeometry args={[0.05, 0.08, 3]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0.06, 0.015, 0.035]}>
      <sphereGeometry args={[0.012, 8, 6]} />
      <meshBasicMaterial color={INK} />
    </mesh>
  </group>
);

// ---------- small creatures and props ----------

// A little bird (an avian dinosaur: these survived).
export const Bird: React.FC<{ position: Vec3; scale?: number; hop?: number; frame: number }> = ({ position, scale = 1, hop = 0, frame }) => (
  <group position={[position[0], position[1] + hop, position[2]]} scale={scale}>
    <mesh position={[0, 0.09, 0]} scale={[1, 0.9, 1.2]}>
      <sphereGeometry args={[0.07, 14, 10]} />
      <meshToonMaterial color="#d8603a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.17, 0.04]}>
      <sphereGeometry args={[0.05, 14, 10]} />
      <meshToonMaterial color="#e8783a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.165, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.015, 0.04, 6]} />
      <meshToonMaterial color="#f2c040" gradientMap={toonRamp} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.028, 0.185, 0.075]}>
        <sphereGeometry args={[0.011, 8, 6]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    ))}
    <mesh position={[0, 0.1, -0.09]} rotation={[-0.9 + Math.sin(frame * 0.4) * 0.15, 0, 0]}>
      <coneGeometry args={[0.03, 0.09, 4]} />
      <meshToonMaterial color="#8a3a2a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.09, 0]} scale={[1.08, 1.0, 1.28]}>
      <sphereGeometry args={[0.07, 14, 10]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {[-1, 1].map((s) => (
      <InkBox key={`l${s}`} size={[0.01, 0.05, 0.01]} position={[s * 0.025, 0.025, 0]} color="#e8a040" ink={0.003} />
    ))}
  </group>
);

// A fallen log with frost on top (the figures stand on it).
export const Log: React.FC<{ position: Vec3; length: number; frost?: boolean }> = ({ position, length, frost }) => (
  <group position={position}>
    <InkCylinder radius={0.13} height={length} position={[0, 0.13, 0]} rotation={[0, 0, Math.PI / 2]} color="#6a4a32" ink={0.012} />
    {frost && <InkBox size={[length * 0.95, 0.03, 0.14]} position={[0, 0.26, 0]} color="#eef2f6" ink={0.006} />}
  </group>
);

// A big red button on a pedestal under a hinged glass lid.
export const RerunButton: React.FC<{ position: Vec3; press: number; pop: number; lid: number }> = ({ position, press, pop, lid }) => (
  <group position={position}>
    <InkBox size={[0.34, 0.9, 0.34]} position={[0, 0.45, 0]} color="#3a3a44" ink={0.012} />
    <InkBox size={[0.4, 0.05, 0.4]} position={[0, 0.925, 0]} color="#c8a040" ink={0.008} />
    <group position={[0, 0.95 - press * 0.03 + pop * 0.5, pop * 0.25]} rotation={[pop * 4, 0, pop * 3]}>
      <InkCylinder radius={0.11} height={0.07} position={[0, 0.035, 0]} color="#d8202a" ink={0.008} />
    </group>
    <group position={[0, 0.95, -0.17]} rotation={[-lid * 1.6, 0, 0]}>
      <mesh position={[0, 0.07, 0.17]}>
        <boxGeometry args={[0.32, 0.14, 0.32]} />
        <meshBasicMaterial color="#cfefff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  </group>
);

// A glass dome over a tabletop diorama.
export const GlassDome: React.FC<{ position: Vec3; radius: number }> = ({ position, radius }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh>
      <sphereGeometry args={[radius, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color="#e8f0ff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <ringGeometry args={[radius - 0.01, radius + 0.02, 48]} />
      <meshBasicMaterial color={INK} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// A sofa: seat top at the puppets' hip height.
export const Sofa: React.FC<{ position: Vec3; width: number; color: string }> = ({ position, width, color }) => (
  <group position={position}>
    <InkBox size={[width, 0.3, 0.75]} position={[0, 0.15, 0]} color={color} ink={0.012} />
    <InkBox size={[width, 0.6, 0.2]} position={[0, 0.55, -0.3]} color={color} ink={0.012} />
    <InkBox size={[0.18, 0.45, 0.75]} position={[-width / 2 + 0.09, 0.38, 0]} color={color} ink={0.012} />
    <InkBox size={[0.18, 0.45, 0.75]} position={[width / 2 - 0.09, 0.38, 0]} color={color} ink={0.012} />
    <InkBox size={[width - 0.4, 0.06, 0.6]} position={[0, 0.32, 0.04]} color={new THREE.Color(color).offsetHSL(0, 0, 0.08).getStyle()} ink={0.006} />
  </group>
);
