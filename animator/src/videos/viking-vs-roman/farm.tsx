import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { canvasTexture, Foliage, InkBox, InkCylinder, SmokePlume, toonRamp, Vec3 } from "../../engine";

// Bjorn's farm pieces, built from guide/references/viking-farm-denmark.md: the boat-shaped longhouse with bowed walls,
// leaning outer posts and a thick thatched roof; woven wattle fences; a wattle barn; hens, sheep, trees, fields and
// the fjord in the distance.

const INK = "#2a241d";
export const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export const useOwnedTex = (make: () => THREE.Texture) => {
  const t = useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => t.dispose(), [t]);
  return t;
};
const useOwnedGeo = (make: () => THREE.BufferGeometry, deps: unknown[] = []) => {
  const g = useMemo(make, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => g.dispose(), [g]);
  return g;
};

// A mesh with its toon material and a back-face ink hull (the hull: the same geometry pushed out along its normals).
const Inked: React.FC<{ geometry: THREE.BufferGeometry; color?: string; map?: THREE.Texture; ink?: number; shadows?: boolean; vertexColors?: boolean }> = ({
  geometry,
  color = "#ffffff",
  map,
  ink = 0.014,
  shadows = true,
  vertexColors,
}) => {
  const hull = useMemo(() => {
    const h = geometry.clone();
    const p = h.attributes.position;
    const n = h.attributes.normal;
    if (n) for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * ink, p.getY(i) + n.getY(i) * ink, p.getZ(i) + n.getZ(i) * ink);
    return h;
  }, [geometry, ink]);
  React.useEffect(() => () => hull.dispose(), [hull]);
  return (
    <group>
      <mesh geometry={geometry} castShadow={shadows} receiveShadow={shadows}>
        <meshToonMaterial color={color} map={map} gradientMap={toonRamp} vertexColors={vertexColors} side={THREE.DoubleSide} />
      </mesh>
      {ink > 0 && (
        <mesh geometry={hull}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

// ---------- textures ----------

export const thatchCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#a08a58";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 46; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(92,78,50,0.2)" : "rgba(204,184,128,0.2)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 3) * 512, rand(i + 5) * 512, 50 + rand(i + 7) * 90, 18 + rand(i + 8) * 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // reed ends running down the slope (v), in courses
    for (let i = 0; i < 3200; i++) {
      const x = rand(i * 2 + 1) * 512;
      const y = rand(i * 2 + 2) * 512;
      ctx.strokeStyle = rand(i + 9) > 0.55 ? "rgba(66,54,34,0.3)" : "rgba(226,206,150,0.28)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i) - 0.5) * 3, y + 16 + rand(i + 1) * 18);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = "rgba(60,48,30,0.16)";
      ctx.fillRect(0, y, 512, 6);
    }
  });

// Oak planks with clay daub in the gaps (horizontal courses along u).
const wallCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#6a5240";
    ctx.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 6; r++) {
      const y = r * 43;
      ctx.fillStyle = r % 2 ? "#735a46" : "#654c3a";
      ctx.fillRect(0, y + 2, 512, 39);
      ctx.fillStyle = "rgba(196,176,140,0.55)"; // daub in the joint
      ctx.fillRect(0, y + 40, 512, 4);
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = `rgba(40,30,22,${0.15 + rand(r * 30 + i) * 0.2})`;
        ctx.lineWidth = 1.5;
        const yy = y + 6 + rand(r * 50 + i) * 32;
        ctx.beginPath();
        ctx.moveTo(rand(i + r) * 512, yy);
        ctx.lineTo(rand(i + r) * 512 + 60 + rand(i) * 120, yy + (rand(i + 2) - 0.5) * 3);
        ctx.stroke();
      }
    }
    // weathering streaks below the eaves
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "rgba(30,24,18,0.12)";
      ctx.fillRect(rand(i + 70) * 512, 0, 3 + rand(i) * 6, 60 + rand(i + 3) * 120);
    }
  });

const wattleCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#8c7458";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = rand(i) > 0.5 ? "rgba(60,46,32,0.3)" : "rgba(180,160,120,0.3)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const y = rand(i + 4) * 256;
      ctx.moveTo(0, y);
      ctx.lineTo(256, y + (rand(i + 5) - 0.5) * 10);
      ctx.stroke();
    }
  });

const barkCanvas = (birch: boolean) =>
  canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = birch ? "#e8e2d4" : "#6e5a46";
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < (birch ? 26 : 40); i++) {
      ctx.fillStyle = birch ? "rgba(40,36,32,0.75)" : "rgba(40,30,22,0.35)";
      const y = rand(i + 2) * 256;
      if (birch) ctx.fillRect(rand(i) * 110, y, 8 + rand(i + 3) * 26, 2 + rand(i + 4) * 4);
      else ctx.fillRect(rand(i) * 128, 0, 2 + rand(i + 3) * 4, 256);
    }
  });

const fieldCanvas = (gold: boolean) =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = gold ? "#b9a25e" : "#6c5a40";
    ctx.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 10) {
      ctx.fillStyle = gold ? "rgba(140,120,60,0.45)" : "rgba(90,74,52,0.6)";
      ctx.fillRect(0, y, 512, 4);
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = gold ? "rgba(220,200,130,0.35)" : "rgba(120,140,70,0.25)";
      ctx.fillRect(rand(i) * 512, rand(i + 1) * 256, 2, 2);
    }
  });

// ---------- the longhouse ----------

export type LonghouseSpec = { length: number; endW: number; midW: number; wall: number; ridge: number };
export const LONGHOUSE: LonghouseSpec = { length: 13, endW: 3.2, midW: 4.6, wall: 1.25, ridge: 3.2 };

// Half-width of the bowed house at t (-1..1 along its length).
const halfW = (s: LonghouseSpec, t: number) => (s.endW + (s.midW - s.endW) * (1 - t * t)) / 2;

// The roof: a loft of cross sections along the length; the eave line follows the bowed walls with an overhang, the
// ridge sags a little toward the ends and the ends are hipped. u runs round the section (eave to eave), v along it.
const roofGeometry = (s: LonghouseSpec) => {
  const N = 48;
  const M = 16;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = -1 - 0.06 + (i / N) * 2.12;
    const tt = Math.max(-1, Math.min(1, t));
    const hip = Math.abs(t) < 0.8 ? 1 : Math.max(0.0, Math.cos(((Math.abs(t) - 0.8) / 0.26) * (Math.PI / 2)));
    const w = halfW(s, tt) + 0.45; // eave overhang
    const eaveY = s.wall - 0.25;
    const ridgeY = eaveY + (s.ridge - eaveY) * (1 - 0.08 * tt * tt);
    const x = (t * s.length) / 2;
    for (let j = 0; j <= M; j++) {
      const a = j / M; // 0 left eave .. 1 right eave
      const side = a * 2 - 1;
      // slightly convex slopes (a rounded, heavy thatch)
      const prof = Math.pow(1 - Math.abs(side), 0.78);
      const y = eaveY + (ridgeY - eaveY) * prof * hip;
      const z = side * w * (0.35 + 0.65 * Math.max(hip, Math.abs(side) > 0.98 ? hip : hip)) * (hip < 1 ? 0.55 + 0.45 * hip : 1);
      pos.push(x, y, z);
      uv.push(a * 3, (i / N) * 8);
    }
  }
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = a + M + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// One bowed long wall as a strip (u along the length, v up).
const wallGeometry = (s: LonghouseSpec, side: 1 | -1) => {
  const N = 40;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const t = -1 + (i / N) * 2;
    const x = (t * s.length) / 2;
    const z = side * halfW(s, t);
    pos.push(x, 0, z, x, s.wall, z);
    uv.push((i / N) * 6, 0, (i / N) * 6, 1);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

export const Longhouse: React.FC<{ position: Vec3; rotationY?: number; frame: number; spec?: LonghouseSpec }> = ({ position, rotationY = 0, frame, spec = LONGHOUSE }) => {
  const thatch = useOwnedTex(() => {
    const t = thatchCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const planks = useOwnedTex(() => {
    const t = wallCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const roof = useOwnedGeo(() => roofGeometry(spec), [spec]);
  const wallL = useOwnedGeo(() => wallGeometry(spec, 1), [spec]);
  const wallR = useOwnedGeo(() => wallGeometry(spec, -1), [spec]);
  const posts = useMemo(() => Array.from({ length: 11 }, (_, i) => -0.86 + (i / 10) * 1.72), []);
  const doorT = 0.52; // doors in the long side near the end (Fyrkat: diagonally opposite)
  const front = 1;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Inked geometry={wallL} map={planks} ink={0.02} />
      <Inked geometry={wallR} map={planks} ink={0.02} />
      {/* gable end walls (straight, under the hips) */}
      {[-1, 1].map((e) => (
        <InkBox key={e} size={[0.14, spec.wall, spec.endW]} position={[(e * spec.length) / 2, spec.wall / 2, 0]} color="#ffffff" map={planks} />
      ))}
      {/* leaning outer posts along the long walls, footed in the ground a little out from the wall */}
      {[-1, 1].map((side) =>
        posts.map((t, i) => {
          const x = (t * spec.length) / 2;
          const z = side * (halfW(spec, t) + 0.32);
          return (
            <group key={`${side}${i}`} position={[x, 0, z]} rotation={[side * 0.26, 0, 0]}>
              <InkCylinder radius={0.075} height={1.45} position={[0, 0.66, 0]} color="#5e4734" />
            </group>
          );
        }),
      )}
      {/* door with a porch in the front long side */}
      <group position={[(doorT * spec.length) / 2, 0, front * (halfW(spec, doorT) + 0.02)]}>
        <InkBox size={[0.72, 0.98, 0.05]} position={[0, 0.49, 0.02]} color="#2e241c" />
        <InkBox size={[0.08, 1.08, 0.08]} position={[-0.42, 0.54, 0.05]} color="#4e3a2a" />
        <InkBox size={[0.08, 1.08, 0.08]} position={[0.42, 0.54, 0.05]} color="#4e3a2a" />
        <InkBox size={[0.96, 0.1, 0.1]} position={[0, 1.06, 0.05]} color="#4e3a2a" />
        {/* a warm glow from the hearth inside */}
        <mesh position={[0, 0.45, 0.05]}>
          <planeGeometry args={[0.5, 0.7]} />
          <meshBasicMaterial color="#ff9a48" transparent opacity={0.35} toneMapped={false} />
        </mesh>
        {/* worn threshold stone */}
        <InkBox size={[0.9, 0.06, 0.4]} position={[0, 0.03, 0.26]} color="#8a8478" />
      </group>
      <Inked geometry={roof} map={thatch} ink={0.03} />
      {/* ridge turf cap */}
      <mesh position={[0, spec.ridge - 0.06, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, spec.length * 0.62, 12]} />
        <meshToonMaterial color="#6f7a46" gradientMap={toonRamp} />
      </mesh>
      {/* smoke hole and its smoke */}
      <InkBox size={[0.5, 0.16, 0.4]} position={[-0.6, spec.ridge - 0.02, 0.2]} color="#3a3026" />
      <SmokePlume position={[-0.6, spec.ridge + 0.2, 0.2]} world={[position[0] - 0.6, position[2]]} frame={frame} size={0.22} rise={2.6} wind={0.9} period={84} puffs={8} />
    </group>
  );
};

// ---------- wattle fence ----------

// Stakes every ~0.32 m with withies woven in and out between them, merged into one mesh per run.
const wattleGeometry = (a: [number, number], b: [number, number], h: number, seed: number) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / 0.32));
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i <= n; i++) {
    const sh = h + 0.06 + rand(seed + i) * 0.1;
    const c = new THREE.CylinderGeometry(0.022, 0.028, sh, 6);
    c.translate(0, sh / 2, 0);
    c.rotateZ((rand(seed + i * 3) - 0.5) * 0.06);
    c.translate((i / n) * len, 0, 0);
    geos.push(c);
  }
  const rows = Math.round(h / 0.055);
  for (let r = 0; r < rows; r++) {
    const y = 0.05 + r * 0.055;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= n * 4; k++) {
      const x = (k / (n * 4)) * len;
      const z = Math.sin(((k / 4) * Math.PI) + r * Math.PI) * 0.03;
      pts.push(new THREE.Vector3(x, y + (rand(seed + r * 7 + k) - 0.5) * 0.008, z));
    }
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 6, 0.018, 5, false);
    geos.push(tube.toNonIndexed());
  }
  const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
  geos.forEach((g) => g.dispose());
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  merged.rotateY(-ang);
  merged.translate(a[0], 0, a[1]);
  merged.computeVertexNormals();
  return merged;
};

export const WattleFence: React.FC<{ a: [number, number]; b: [number, number]; h?: number; seed?: number }> = ({ a, b, h = 0.82, seed = 1 }) => {
  const tex = useOwnedTex(() => {
    const t = wattleCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const geo = useOwnedGeo(() => wattleGeometry(a, b, h, seed), [a[0], a[1], b[0], b[1], h, seed]);
  return <Inked geometry={geo} map={tex} ink={0.008} />;
};

// ---------- barn, pen, trees, life ----------

export const Barn: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => {
  const thatch = useOwnedTex(() => {
    const t = thatchCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const spec: LonghouseSpec = { length: 4.2, endW: 2.4, midW: 2.6, wall: 1.0, ridge: 2.3 };
  const roof = useOwnedGeo(() => roofGeometry(spec));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <WattleFence a={[-2.1, 1.2]} b={[2.1, 1.25]} h={1.0} seed={21} />
      <WattleFence a={[-2.1, -1.2]} b={[2.1, -1.25]} h={1.0} seed={23} />
      <WattleFence a={[-2.1, -1.2]} b={[-2.1, 1.2]} h={1.0} seed={25} />
      <WattleFence a={[2.1, 1.25]} b={[2.1, -1.25]} h={1.0} seed={27} />
      <Inked geometry={roof} map={thatch} ink={0.025} />
    </group>
  );
};

export const Tree: React.FC<{ position: Vec3; kind: "oak" | "birch"; scale?: number; seed?: number }> = ({ position, kind, scale = 1, seed = 1 }) => {
  const bark = useOwnedTex(() => barkCanvas(kind === "birch"));
  const h = kind === "birch" ? 3.4 : 2.6;
  const crowns =
    kind === "birch"
      ? [[0, h, 0, 1.1], [0.35, h - 0.6, 0.2, 0.8], [-0.4, h - 0.4, -0.1, 0.85], [0.1, h + 0.6, 0, 0.75]]
      : [[0, h + 0.3, 0, 1.6], [1.0, h, 0.2, 1.2], [-1.0, h + 0.1, -0.2, 1.25], [0.3, h + 1.1, 0.1, 1.15], [-0.4, h - 0.3, 0.6, 1.0]];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[kind === "birch" ? 0.09 : 0.22, kind === "birch" ? 0.13 : 0.32, h, 10]} />
        <meshToonMaterial map={bark} gradientMap={toonRamp} />
      </mesh>
      {crowns.map(([x, y, z, s], i) => (
        <Foliage key={i} position={[x, y, z]} size={s} color={kind === "birch" ? (i % 2 ? "#7f9a48" : "#90a858") : i % 2 ? "#566f36" : "#62803e"} seed={seed * 10 + i} />
      ))}
    </group>
  );
};

// A hen: cream body, dark tail, red comb; she pecks on her own rhythm.
export const Hen: React.FC<{ position: Vec3; rotationY?: number; frame: number; seed?: number }> = ({ position, rotationY = 0, frame, seed = 1 }) => {
  const p = (frame + seed * 37) % 90;
  const peck = p < 14 ? Math.sin((p / 14) * Math.PI) : 0;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={0.6}>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.85, 1.3]} castShadow>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshToonMaterial color="#efe3c6" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.3, -0.16]} rotation={[-0.6, 0, 0]} castShadow>
        <coneGeometry args={[0.08, 0.2, 8]} />
        <meshToonMaterial color="#3a332c" gradientMap={toonRamp} />
      </mesh>
      <group position={[0, 0.3 - peck * 0.14, 0.14 + peck * 0.06]} rotation={[peck * 0.9, 0, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.07, 14, 10]} />
          <meshToonMaterial color="#efe3c6" gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, 0.07, 0]} scale={[0.4, 1, 1]}>
          <sphereGeometry args={[0.04, 10, 8]} />
          <meshToonMaterial color="#c8302a" gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, -0.01, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.018, 0.05, 6]} />
          <meshToonMaterial color="#e0a83a" gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0.045, 0.015, 0.04]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        <mesh position={[-0.045, 0.015, 0.04]}>
          <sphereGeometry args={[0.012, 6, 6]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      </group>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.1, 5]} />
          <meshToonMaterial color="#d8a040" gradientMap={toonRamp} />
        </mesh>
      ))}
    </group>
  );
};

// A woolly sheep: a clump of off-white puffs, a dark face, short legs; it grazes and lifts its head.
export const Sheep: React.FC<{ position: Vec3; rotationY?: number; frame: number; seed?: number }> = ({ position, rotationY = 0, frame, seed = 1 }) => {
  const graze = 0.5 + 0.5 * Math.sin((frame + seed * 50) / 40);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={0.75}>
      {[[0, 0.42, 0, 0.26], [0.16, 0.44, 0.12, 0.2], [-0.16, 0.44, 0.1, 0.2], [0.12, 0.4, -0.16, 0.21], [-0.12, 0.42, -0.15, 0.2], [0, 0.56, 0, 0.2]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[r, 14, 10]} />
          <meshToonMaterial color={i % 2 ? "#e6dfcf" : "#ddd5c2"} gradientMap={toonRamp} />
        </mesh>
      ))}
      <group position={[0, 0.42 - graze * 0.18, 0.32]} rotation={[graze * 0.7, 0, 0]}>
        <mesh scale={[0.8, 0.9, 1.2]} castShadow>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshToonMaterial color="#3a322c" gradientMap={toonRamp} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.1, 0.04, -0.02]} rotation={[0, 0, s * 1.1]} scale={[1, 0.4, 0.6]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshToonMaterial color="#3a322c" gradientMap={toonRamp} />
          </mesh>
        ))}
      </group>
      {[[-0.12, 0.12], [0.12, 0.12], [-0.12, -0.14], [0.12, -0.14]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]}>
          <cylinderGeometry args={[0.03, 0.03, 0.24, 6]} />
          <meshToonMaterial color="#3a322c" gradientMap={toonRamp} />
        </mesh>
      ))}
    </group>
  );
};

// A line between two stakes with a cloth hung over it, swaying in the wind.
export const ClothLine: React.FC<{ a: Vec3; b: Vec3; frame: number }> = ({ a, b, frame }) => {
  const mid: Vec3 = [(a[0] + b[0]) / 2, 1.05, (a[2] + b[2]) / 2];
  const ang = Math.atan2(b[2] - a[2], b[0] - a[0]);
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const sway = Math.sin(frame / 18) * 0.18 + Math.sin(frame / 7) * 0.05;
  return (
    <group>
      {[a, b].map((p, i) => (
        <InkCylinder key={i} radius={0.025} height={1.15} position={[p[0], 0.57, p[2]]} color="#6e5844" />
      ))}
      <group position={mid} rotation={[0, -ang, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, len, 4]} />
          <meshBasicMaterial color="#cbb88a" />
        </mesh>
        <group rotation={[sway, 0, 0]}>
          <mesh position={[-0.15, -0.26, 0]} castShadow>
            <planeGeometry args={[0.5, 0.5, 4, 4]} />
            <meshToonMaterial color="#c9a650" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.32, -0.2, 0]} castShadow>
            <planeGeometry args={[0.3, 0.38]} />
            <meshToonMaterial color="#8c5a48" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// A wooden bucket of water with a trembling surface.
export const Bucket: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position}>
    <mesh position={[0, 0.13, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.11, 0.26, 18, 1, true]} />
      <meshToonMaterial color="#8a6a48" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    {[0.05, 0.21].map((y) => (
      <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.122 + (0.21 - y) * 0.06, 0.008, 4, 24]} />
        <meshToonMaterial color="#3a332c" gradientMap={toonRamp} />
      </mesh>
    ))}
    <mesh position={[0, 0.22 + Math.sin(frame / 5) * 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.122, 24]} />
      <meshToonMaterial color="#7d9ea2" gradientMap={toonRamp} emissive="#223038" />
    </mesh>
  </group>
);

// Strips of field beyond the yard and the fjord on the horizon.
export const Fields: React.FC<{ camX: number }> = ({ camX }) => {
  const gold = useOwnedTex(() => {
    const t = fieldCanvas(true);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  });
  const plough = useOwnedTex(() => {
    const t = fieldCanvas(false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0.06]} position={[6, 0.004, -15]} receiveShadow>
        <planeGeometry args={[14, 5]} />
        <meshToonMaterial map={gold} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.05]} position={[-9, 0.004, -17]} receiveShadow>
        <planeGeometry args={[12, 4.5]} />
        <meshToonMaterial map={plough} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.02]} position={[-1, 0.005, -21]} receiveShadow>
        <planeGeometry args={[10, 3.5]} />
        <meshToonMaterial map={gold} gradientMap={toonRamp} />
      </mesh>
      {/* the fjord: a grey-blue band with soft light on it, and the far shore */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[camX * 0.2, 0.02, -34]}>
        <planeGeometry args={[160, 9]} />
        <meshBasicMaterial color="#9fb7c2" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[camX * 0.2 - 6, 0.025, -33]}>
        <planeGeometry args={[30, 0.25]} />
        <meshBasicMaterial color="#e4ecee" transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Scattered field stones and small flowers in the grass.
export const Scatter: React.FC<{ clear: (x: number, z: number) => boolean }> = ({ clear }) => {
  const items = useMemo(() => {
    const out: { p: Vec3; k: "stone" | "flower"; s: number; c: string }[] = [];
    for (let i = 0; i < 260; i++) {
      const x = -6 + rand(i * 7 + 3) * 12;
      const z = -8 + rand(i * 7 + 4) * 11;
      if (!clear(x, z)) continue;
      const stone = rand(i + 99) > 0.8;
      out.push({ p: [x, 0, z], k: stone ? "stone" : "flower", s: stone ? 0.05 + rand(i) * 0.08 : 0.022, c: stone ? "#8c877c" : ["#f2e6a0", "#ffffff", "#c9a0d8", "#f0c040"][i % 4] });
    }
    return out;
  }, [clear]);
  return (
    <group>
      {items.map((it, i) =>
        it.k === "stone" ? (
          <mesh key={i} position={[it.p[0], it.s * 0.4, it.p[2]]} scale={[1.3, 0.7, 1]} castShadow receiveShadow>
            <dodecahedronGeometry args={[it.s, 0]} />
            <meshToonMaterial color={it.c} gradientMap={toonRamp} />
          </mesh>
        ) : (
          <mesh key={i} position={[it.p[0], 0.08, it.p[2]]}>
            <sphereGeometry args={[it.s, 6, 4]} />
            <meshToonMaterial color={it.c} gradientMap={toonRamp} emissive="#222" />
          </mesh>
        ),
      )}
    </group>
  );
};
