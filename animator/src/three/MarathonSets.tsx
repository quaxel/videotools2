import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture } from "./kit";
import { Haze } from "./LakeSet";
import { Hills } from "./FarmyardSet";
import { SkyDome } from "./sky";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// The 1904 St. Louis Olympic marathon, built from photo references (guide/references/st-louis-1904-marathon.md):
// - RoadSet: a pale rutted dirt road running away along -z (x within ±ROAD.half, floor y = 0) between dry grass
//   verges, a post-and-rail fence on the right, telegraph poles on the left, big oaks, a farm far off, hazy hills
//   under a bleached summer sky.
// - StadiumSet: Francis Field — a cinder track running along x (z within ±TRACK.half) with a chalk finish line and a
//   finish tape at x = 0, a long low wooden grandstand packed with a painted crowd behind it, bunting on the rail, an
//   officials' table and a chalk results board on the infield (+z).
// - Automobile: an open 1904 touring car (no brand) with spoked wheels, brass lamps and two benches; puppets ride in
//   it with `carSeat`. DustTrail: warm cel dust clouds rolling up behind it.
// Light puppets with `summerLight()`: a hard, high white-yellow sun.

type Vec3 = [number, number, number];
const INK = "#161212";
const K = 1.3 / 1060; // metres per puppet unit

export const ROAD = { half: 1.5 };
export const TRACK = { half: 1.1 };
export const HOT_SUN: Vec3 = [-4, 10, 6];
const HOT_SKY: [number, string][] = [
  [-0.1, "#f2ead8"],
  [0.0, "#f0e8d6"],
  [0.07, "#dfe4e0"],
  [0.16, "#b9d3ea"],
  [0.35, "#8ab8e6"],
  [0.7, "#5f9ad8"],
  [1.0, "#4a86cc"],
];

export const summerLight = (): PuppetLight => ({
  tint: "#fff4e0",
  shadow: 0.16,
  distant: [{ direction: [-0.4, 0.85, 0.45], color: "#fff0c8", strength: 1.25 }],
});

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const repeat = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  t.anisotropy = 8;
  return t;
};

// ---------- shared outdoor pieces ----------

const Sky: React.FC<{ camera: CameraShot }> = ({ camera }) => (
  <group position={camera.position}>
    <SkyDome sun={HOT_SUN} stops={HOT_SKY} glow="#fffbe8" />
  </group>
);

const Lights: React.FC = () => (
  <>
    <ambientLight intensity={1.25} color="#fffaf0" />
    <hemisphereLight args={["#e8f0ff", "#9a8a5a", 0.6]} />
    <directionalLight
      position={HOT_SUN}
      intensity={2.8}
      color="#fff4dc"
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-12}
      shadow-camera-right={12}
      shadow-camera-top={12}
      shadow-camera-bottom={-12}
      shadow-camera-near={0.5}
      shadow-camera-far={50}
    />
  </>
);

const dryGrassCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#b9a95e";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rand(i + 5) > 0.5 ? "rgba(140,140,70,0.35)" : "rgba(220,200,130,0.3)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 300) * 1024, 40 + rand(i + 9) * 70, 20 + rand(i + 4) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9000; i++) {
      const x = rand(i) * 1024;
      const y = rand(i + 7000) * 1024;
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.7 ? "#d8c486" : v > 0.4 ? "#9c9a52" : v > 0.15 ? "#c4b06a" : "#7f8a42";
      ctx.lineWidth = 2 + rand(i + 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 8, y - 7 - rand(i + 4) * 10);
      ctx.stroke();
    }
  });

// Instanced dry tufts scattered over a rectangle, kept off `keepOff(x, z)`.
const Tufts: React.FC<{ x0: number; x1: number; z0: number; z1: number; count: number; keepOff: (x: number, z: number) => boolean; seed: number }> = ({
  x0,
  x1,
  z0,
  z1,
  count,
  keepOff,
  seed,
}) => {
  const mesh = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.014, 0.14, 3);
    blade.translate(0, 0.07, 0);
    const pos: number[] = [];
    [-0.35, 0, 0.35].forEach((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.translate((k - 1) * 0.014, 0, (k % 2) * 0.01);
      pos.push(...(b.toNonIndexed().attributes.position.array as Float32Array));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    const m = new THREE.InstancedMesh(g, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; n < count && i < count * 4; i++) {
      const x = x0 + rand(seed + i * 3 + 1) * (x1 - x0);
      const z = z0 + rand(seed + i * 3 + 2) * (z1 - z0);
      if (keepOff(x, z)) continue;
      o.position.set(x, 0, z);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.7 + rand(i * 7) * 1.0;
      o.scale.set(k, k, k);
      o.updateMatrix();
      m.setMatrixAt(n, o.matrix);
      const v = rand(i * 13 + seed);
      m.setColorAt(n, c.set(v > 0.6 ? "#c8b46a" : v > 0.3 ? "#a6a058" : "#8c9448"));
      n++;
    }
    m.count = n;
    return m;
  }, [x0, x1, z0, z1, count, keepOff, seed]);
  return <primitive object={mesh} />;
};

// A broad oak: a trunk and a cluster of inked toon blobs.
const Oak: React.FC<{ position: Vec3; scale?: number; seed?: number }> = ({ position, scale = 1, seed = 0 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.22} height={2.2} position={[0, 1.1, 0]} color="#5e4632" ink={0.02} />
    {Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + seed;
      const r = i === 0 ? 0 : 0.9 + rand(seed + i) * 0.4;
      const s = 1.0 + rand(seed + i + 9) * 0.5;
      return (
        <group key={i} position={[Math.cos(a) * r, 2.9 + rand(seed + i * 3) * 0.8, Math.sin(a) * r * 0.7]}>
          <mesh scale={s} castShadow>
            <sphereGeometry args={[1, 14, 10]} />
            <meshToonMaterial color={rand(seed + i * 5) > 0.5 ? "#5f7a3a" : "#6e8a44"} gradientMap={toonRamp} />
          </mesh>
          <mesh scale={s * 1.04}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// ---------- dust ----------

// Inked cel dust clouds rolling up behind something moving along `path(frame)` (e.g. a car's rear axle): a puff is
// dropped every `every` frames, swells, drifts up and fades over `life` frames. Warm tan, like the road.
export const DustTrail: React.FC<{ frame: number; path: (frame: number) => Vec3 | null; every?: number; life?: number; size?: number }> = ({
  frame,
  path,
  every = 3,
  life = 42,
  size = 0.5,
}) => {
  const puffs: React.ReactNode[] = [];
  for (let age = frame % every; age < life; age += every) {
    const born = frame - age;
    const at = path(born);
    if (!at) continue;
    const t = age / life;
    const s = size * (0.35 + 1.2 * Math.sqrt(t)) * (1 - t * 0.25);
    const seed = Math.floor(born);
    const col = new THREE.Color("#dcc7a2").lerp(new THREE.Color("#efe4cc"), t);
    puffs.push(
      <group key={born} position={[at[0] + (rand(seed) - 0.5) * 0.5, at[1] + 0.15 + t * 0.9 * size * 3, at[2] + (rand(seed + 1) - 0.5) * 0.3]} scale={s}>
        <mesh>
          <sphereGeometry args={[1, 12, 10]} />
          <meshToonMaterial color={col} gradientMap={toonRamp} transparent opacity={1 - t ** 2} />
        </mesh>
        {t < 0.6 && (
          <mesh scale={1.06}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color="#8a6e4e" side={THREE.BackSide} transparent opacity={(1 - t / 0.6) * 0.8} />
          </mesh>
        )}
      </group>,
    );
  }
  return <group userData={{ ghost: true }}>{puffs}</group>;
};

// ---------- the car ----------

// One big wooden-spoked wheel with a thin black tyre; `turn` radians.
const Wheel: React.FC<{ position: Vec3; turn: number; r?: number }> = ({ position, turn, r = 0.33 }) => (
  <group position={position} rotation={[turn, 0, 0]}>
    {/* tyre and felloe lie in the wheel's plane (y-z), the axle runs along x */}
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[r, 0.045, 10, 36]} />
        <meshToonMaterial color="#1e1c1e" gradientMap={toonRamp} />
      </mesh>
      <mesh>
        <torusGeometry args={[r - 0.05, 0.018, 6, 36]} />
        <meshToonMaterial color="#c8a06a" gradientMap={toonRamp} />
      </mesh>
    </group>
    {Array.from({ length: 10 }, (_, i) => (
      <mesh key={i} rotation={[(i / 10) * Math.PI * 2, 0, 0]} position={[0, 0, 0]}>
        <boxGeometry args={[0.025, (r - 0.05) * 2, 0.028]} />
        <meshToonMaterial color="#d8b07a" gradientMap={toonRamp} />
      </mesh>
    ))}
    <InkCylinder radius={0.06} height={0.1} rotation={[0, 0, Math.PI / 2]} color="#d8a84a" ink={0.008} />
  </group>
);

export const CAR = { seatY: 0.62, front: [0.26, 0.28] as [number, number], rear: [0, -0.62] as [number, number], halfLength: 1.25 };

// Where a puppet sits on a bench of the car standing at `at` facing `heading` (0 = toward +z): its floor position
// and the `air` (puppet units) that lifts its hips onto the cushion. Spread { sit: true, air } into the pose.
export const carSeat = (at: [number, number], heading: number, seat: [number, number]) => {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  return {
    at: [at[0] + seat[0] * c + seat[1] * s, at[1] - seat[0] * s + seat[1] * c] as [number, number],
    air: (CAR.seatY - 0.34) / K,
  };
};

// A 1904 open touring car: deep red body with brass radiator and lamps, an open tonneau with two tufted benches, a
// raked steering column, curved mudguards and running boards. `roll` metres travelled turns the wheels; `bump`
// lurches the body; `steam` 0..1 blows steam out of the hood (the breakdown).
export const Automobile: React.FC<{ position: Vec3; heading?: number; roll?: number; bump?: number; steam?: number; frame?: number; color?: string }> = ({
  position,
  heading = 0,
  roll = 0,
  bump = 0,
  steam = 0,
  frame = 0,
  color = "#9a2a2a",
}) => {
  const turn = roll / 0.33;
  const shake = steam > 0 ? Math.sin(frame * 2.3) * 0.012 * steam : 0;
  return (
    <group position={position} rotation={[0, heading, 0]}>
      {[-1, 1].flatMap((sx) => [0.82, -0.82].map((z) => <Wheel key={`${sx}${z}`} position={[sx * 0.66, 0.33, z]} turn={turn} />))}
      <group position={[shake, bump, 0]} rotation={[bump * 0.6, 0, shake * 2]}>
        {/* chassis, running boards and mudguards */}
        <InkBox size={[1.05, 0.08, 2.3]} position={[0, 0.36, 0]} color="#2a2420" ink={0.012} />
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <InkBox size={[0.22, 0.04, 1.0]} position={[sx * 0.62, 0.3, 0]} color="#2a2420" ink={0.008} />
            {[0.82, -0.82].map((z) => (
              <group key={z} position={[sx * 0.66, 0.33, z]}>
                {[-0.9, -0.3, 0.3, 0.9].map((a) => (
                  <InkBox key={a} size={[0.2, 0.03, 0.24]} position={[0, Math.cos(a) * 0.43, Math.sin(a) * 0.43]} rotation={[-a, 0, 0]} color="#1e1c1e" ink={0.006} />
                ))}
              </group>
            ))}
          </group>
        ))}
        {/* hood, brass radiator and lamps */}
        <InkBox size={[0.82, 0.4, 0.62]} position={[0, 0.6, 0.86]} color={color} ink={0.015} />
        <InkBox size={[0.86, 0.48, 0.06]} position={[0, 0.62, 1.19]} color="#d8a84a" ink={0.012} />
        <mesh position={[0, 0.62, 1.225]}>
          <planeGeometry args={[0.66, 0.36]} />
          <meshBasicMaterial color="#4a3a22" />
        </mesh>
        {[-1, 1].map((sx) => (
          <group key={sx} position={[sx * 0.5, 0.88, 1.14]}>
            <InkCylinder radius={0.09} height={0.14} rotation={[Math.PI / 2, 0, 0]} color="#d8a84a" ink={0.008} />
            <mesh position={[0, 0, 0.075]}>
              <circleGeometry args={[0.07, 20]} />
              <meshBasicMaterial color="#fff6d0" />
            </mesh>
          </group>
        ))}
        {/* open tonneau: low sides, a high back */}
        {[-1, 1].map((sx) => (
          <InkBox key={sx} size={[0.06, 0.36, 1.6]} position={[sx * 0.5, 0.58, -0.25]} color={color} ink={0.012} />
        ))}
        <InkBox size={[1.06, 0.62, 0.08]} position={[0, 0.7, -1.06]} color={color} ink={0.012} />
        <InkBox size={[1.0, 0.3, 0.06]} position={[0, 0.55, 0.53]} color={color} ink={0.01} />
        {/* tufted leather benches */}
        {[CAR.front[1], CAR.rear[1]].map((z) => (
          <group key={z}>
            <InkBox size={[0.9, 0.1, 0.4]} position={[0, CAR.seatY - 0.05, z]} color="#4a2e22" ink={0.01} />
            <InkBox size={[0.9, 0.38, 0.1]} position={[0, CAR.seatY + 0.16, z - 0.2]} rotation={[-0.15, 0, 0]} color="#5a3828" ink={0.01} />
          </group>
        ))}
        {/* steering column and wheel */}
        <InkCylinder radius={0.02} height={0.6} position={[-0.26, 0.82, 0.6]} rotation={[-0.75, 0, 0]} color="#2a2420" ink={0.006} />
        <mesh position={[-0.26, 1.04, 0.42]} rotation={[0.85, 0, 0]}>
          <torusGeometry args={[0.15, 0.018, 8, 24]} />
          <meshToonMaterial color="#3a2a1e" gradientMap={toonRamp} />
        </mesh>
        {/* steam from the hood when it breaks down */}
        {steam > 0 && (
          <group position={[0, 0.85, 0.9]} userData={{ ghost: true }}>
            {Array.from({ length: 8 }, (_, i) => {
              const t = ((frame * 1.6 + i * 9) % 40) / 40;
              const s = (0.08 + t * 0.32) * steam;
              return (
                <group key={i} position={[(rand(i) - 0.5) * 0.4 + Math.sin(t * 5 + i) * 0.1, t * 1.1, (rand(i + 3) - 0.5) * 0.3]} scale={s}>
                  <mesh>
                    <sphereGeometry args={[1, 12, 10]} />
                    <meshToonMaterial color="#f4f4f2" gradientMap={toonRamp} transparent opacity={1 - t * t} />
                  </mesh>
                  <mesh scale={1.07}>
                    <sphereGeometry args={[1, 12, 10]} />
                    <meshBasicMaterial color="#8a8a96" side={THREE.BackSide} transparent opacity={(1 - t) * 0.7} />
                  </mesh>
                </group>
              );
            })}
          </group>
        )}
      </group>
    </group>
  );
};

// ---------- the road ----------

const roadCanvas = () =>
  canvasTexture(512, 1024, (ctx) => {
    ctx.fillStyle = "#d9c3a0";
    ctx.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(190,164,124,0.5)" : "rgba(236,220,190,0.45)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 1) * 512, rand(i + 2) * 1024, 30 + rand(i + 3) * 60, 40 + rand(i + 4) * 90, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // two wheel ruts
    for (const x of [150, 362]) {
      ctx.fillStyle = "rgba(150,120,86,0.55)";
      ctx.fillRect(x - 18, 0, 36, 1024);
      ctx.fillStyle = "rgba(120,92,64,0.5)";
      ctx.fillRect(x - 6, 0, 12, 1024);
    }
    // pebbles and hoof prints
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = rand(i + 50) > 0.6 ? "#a08a6a" : "#ece0c6";
      ctx.beginPath();
      ctx.arc(rand(i + 60) * 512, rand(i + 70) * 1024, 1.5 + rand(i + 80) * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(130,104,74,0.5)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 30; i++) {
      const x = 230 + (rand(i + 90) - 0.5) * 80;
      const y = rand(i + 91) * 1024;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  });

const roadKeepOff = (x: number) => Math.abs(x) < ROAD.half + 0.1;

export const RoadSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const camX = camera.position[0];
  const road = useMemo(() => repeat(roadCanvas(), 1, 14), []);
  const grass = useMemo(() => repeat(dryGrassCanvas(), 14, 18), []);
  const keepOff = useMemo(() => (x: number) => roadKeepOff(x), []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#e8e4d4"]} />
      <fog attach="fog" args={["#efe6d2", 22, 85]} />
      <Lights />
      <Sky camera={camera} />
      <Hills z={-75} shift={camX * 0.8} width={340} low={4} high={10} color="#c6ccc8" seed={4} />
      <Haze z={-66} color="#f4ecd8" />
      <Hills z={-50} shift={camX * 0.5} width={240} low={2} high={6} color="#a8b48a" seed={8} />
      <Haze z={-44} color="#f2ead4" />
      {/* ground: verges and the road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -30]} receiveShadow>
        <planeGeometry args={[ROAD.half * 2, 80]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={road} />
      </mesh>
      <Tufts x0={-9} x1={9} z0={-30} z1={8} count={2600} keepOff={keepOff as (x: number, z: number) => boolean} seed={11} />
      {/* post-and-rail fence on the right */}
      {Array.from({ length: 16 }, (_, i) => {
        const z = 8 - i * 3;
        return (
          <group key={i}>
            <InkBox size={[0.1, 1.0, 0.1]} position={[ROAD.half + 1.0, 0.5, z]} color="#8e7c62" ink={0.008} />
            {[0.45, 0.85].map((y) => (
              <InkBox key={y} size={[0.06, 0.08, 3.0]} position={[ROAD.half + 1.0, y, z - 1.5]} rotation={[0, 0, (rand(i + y * 10) - 0.5) * 0.05]} color="#a39886" ink={0.006} />
            ))}
          </group>
        );
      })}
      {/* telegraph poles with cross-arms and sagging wires on the left */}
      {Array.from({ length: 8 }, (_, i) => {
        const z = 6 - i * 9;
        return (
          <group key={i} position={[-ROAD.half - 1.2, 0, z]}>
            <InkCylinder radius={0.08} height={5.2} position={[0, 2.6, 0]} color="#6e5a44" ink={0.01} />
            <InkBox size={[1.2, 0.1, 0.1]} position={[0, 4.8, 0]} color="#6e5a44" ink={0.008} />
          </group>
        );
      })}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[-ROAD.half - 1.2 + x, 4.7, -28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 72, 4]} />
          <meshBasicMaterial color="#3a3530" />
        </mesh>
      ))}
      <Oak position={[5.5, 0, -6]} scale={1.2} seed={1} />
      <Oak position={[-6.5, 0, -14]} scale={1.4} seed={2} />
      <Oak position={[7.5, 0, -22]} scale={1.3} seed={3} />
      <Oak position={[-5, 0, 2]} scale={1.1} seed={4} />
      {/* a white farmhouse and a red barn far off */}
      <group position={[14, 0, -40]}>
        <InkBox size={[4, 3, 3]} position={[0, 1.5, 0]} color="#efe8da" ink={0.03} />
        <InkBox size={[4.4, 0.2, 3.4]} position={[0, 3.3, 0]} rotation={[0, 0, 0]} color="#5a4a40" ink={0.02} />
        <InkBox size={[5, 4, 4]} position={[7, 2, -2]} color="#9a3a2a" ink={0.03} />
      </group>
      {/* heat haze low over the road far away */}
      <Haze z={-26} color="#f6eedc" />
      {children}
    </>
  );
};

// ---------- the stadium ----------

const cinderCanvas = () =>
  canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = "#a8644a";
    ctx.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(140,78,56,0.6)" : "rgba(196,128,96,0.5)";
      ctx.fillRect(rand(i + 1) * 1024, rand(i + 2) * 256, 2 + rand(i + 3) * 3, 2);
    }
    // chalk lane lines along the track
    ctx.fillStyle = "rgba(245,240,226,0.85)";
    ctx.fillRect(0, 6, 1024, 6);
    ctx.fillRect(0, 244, 1024, 6);
  });

// A painted crowd for one grandstand row, in the puppets' cel style: seated people with round faces (eyes and a
// mouth), bodies, ink outlines and period hats — men in dark suits with white collars and straw boaters or bowlers,
// women in white or pastel blouses with long hair and wide hats. `cheer` draws open mouths, raised mitten hands and
// a few waved hats. One tile is CROWD_TILE metres wide and the row's height tall (same pixels per metre both ways,
// so faces stay round); it repeats along the row with a different seed and offset per row.
const CROWD_H = 0.78; // metres, the strip's height
const CROWD_TILE = (2048 / 512) * CROWD_H;
const crowdCanvas = (seed: number, cheer: boolean) =>
  canvasTexture(2048, 512, (ctx) => {
    ctx.clearRect(0, 0, 2048, 512);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const n = 6;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(170 + i * (2048 / n) + (rand(seed + i) - 0.5) * 30, 512);
      ctx.scale(1.6, 1.6);
      ctx.translate(0, -512);
      const x = 0;
      const lift = (rand(seed + i * 19) - 0.5) * 24;
      const woman = rand(seed + i * 3) > 0.6;
      const suit = ["#2e2e36", "#4a3e34", "#3a4458", "#5a4a3a"][Math.floor(rand(seed + i * 5) * 4)];
      const blouse = ["#f6f2ea", "#e8d8e6", "#dde6f0", "#f2e6c8"][Math.floor(rand(seed + i * 23) * 4)];
      const body = woman ? blouse : suit;
      const skin = ["#f2cfae", "#e6b88e", "#d9a47c", "#f4d6b8", "#b07a52"][Math.floor(rand(seed + i * 7) * 5)];
      const hair = ["#2a1d16", "#5a3a24", "#7a4a2a", "#3a2a1e", "#9a7a50"][Math.floor(rand(seed + i * 29) * 5)];
      const hy = 300 + lift; // head centre
      const arms = cheer && rand(seed + i * 11) > 0.25;
      const ink = (w: number) => {
        ctx.strokeStyle = INK;
        ctx.lineWidth = w;
      };
      // long hair behind the head
      if (woman) {
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.ellipse(x, hy + 20, 50, 62, 0, 0, Math.PI * 2);
        ctx.fill();
        ink(5);
        ctx.stroke();
      }
      // raised arms behind the body
      if (arms) {
        const wave = Math.sin(seed + i) * 10;
        for (const sx of [-1, 1]) {
          ink(20);
          ctx.beginPath();
          ctx.moveTo(x + sx * 34, hy + 90);
          ctx.lineTo(x + sx * (62 + wave), hy - 40);
          ctx.stroke();
          ctx.strokeStyle = body;
          ctx.lineWidth = 12;
          ctx.stroke();
          ctx.fillStyle = skin;
          ctx.beginPath();
          ctx.arc(x + sx * (62 + wave), hy - 52, 14, 0, Math.PI * 2);
          ctx.fill();
          ink(4);
          ctx.stroke();
        }
      }
      // body (seated: shoulders down to the bench)
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x - 52, 512);
      ctx.quadraticCurveTo(x - 58, hy + 70, x - 30, hy + 50);
      ctx.lineTo(x + 30, hy + 50);
      ctx.quadraticCurveTo(x + 58, hy + 70, x + 52, 512);
      ctx.closePath();
      ctx.fill();
      ink(5);
      ctx.stroke();
      // white collar / shirt front for the men
      if (!woman) {
        ctx.fillStyle = "#f6f4ee";
        ctx.beginPath();
        ctx.moveTo(x - 14, hy + 52);
        ctx.lineTo(x, hy + 90);
        ctx.lineTo(x + 14, hy + 52);
        ctx.fill();
        ink(3);
        ctx.stroke();
      }
      // arms down in the lap when calm
      if (!arms) {
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(x - 22, 470, 12, 0, Math.PI * 2);
        ctx.arc(x + 22, 470, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      // head
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(x, hy, 40, 0, Math.PI * 2);
      ctx.fill();
      ink(5);
      ctx.stroke();
      // a soft cel shadow on the right of the face
      ctx.fillStyle = "rgba(74,32,56,0.12)";
      ctx.beginPath();
      ctx.arc(x + 10, hy + 4, 34, -1.2, 1.6);
      ctx.fill();
      // eyes: white with a pupil looking toward the track
      const look = (rand(seed + i * 37) - 0.5) * 4;
      for (const sx of [-1, 1]) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + sx * 14, hy - 2, 9, 0, Math.PI * 2);
        ctx.fill();
        ink(3);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(x + sx * 14 + look, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // mouth: a smile, or an open cheering mouth
      if (cheer) {
        ctx.fillStyle = "#7a2a2a";
        ctx.beginPath();
        ctx.ellipse(x, hy + 20, 11, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ink(3);
        ctx.stroke();
      } else {
        ink(4);
        ctx.beginPath();
        ctx.arc(x, hy + 12, 10, 0.3, Math.PI - 0.3);
        ctx.stroke();
      }
      // hats
      const boater = rand(seed + i * 13) > 0.45;
      const hatless = !woman && rand(seed + i * 41) > 0.85;
      if (woman) {
        ctx.fillStyle = ["#e8c8d0", "#f0e2b0", "#d8e0ea", "#ffffff"][i % 4];
        ctx.beginPath();
        ctx.ellipse(x, hy - 32, 64, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ink(4);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, hy - 40, 32, 18, 0, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ["#c0392b", "#7a5aa8", "#e88aa0"][i % 3];
        ctx.beginPath();
        ctx.arc(x + 20, hy - 46, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (!hatless) {
        ctx.fillStyle = boater ? "#e6cc84" : "#22222a";
        ctx.beginPath();
        ctx.ellipse(x, hy - 30, boater ? 52 : 44, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ink(4);
        ctx.stroke();
        ctx.beginPath();
        if (boater) ctx.rect(x - 32, hy - 58, 64, 28);
        else ctx.ellipse(x, hy - 34, 32, 30, 0, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        if (boater) {
          ctx.fillStyle = "#2a3a6a";
          ctx.fillRect(x - 31, hy - 40, 62, 8);
        }
      } else {
        ctx.fillStyle = hair;
        ctx.beginPath();
        ctx.ellipse(x, hy - 26, 36, 18, 0, Math.PI, 0);
        ctx.fill();
        ink(4);
        ctx.stroke();
      }
      // a hat waved overhead
      if (cheer && !woman && rand(seed + i * 17) > 0.72) {
        ctx.fillStyle = "#e6cc84";
        ctx.beginPath();
        ctx.ellipse(x + 64, hy - 80, 40, 9, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ink(4);
        ctx.stroke();
      }
      ctx.restore();
    }
  });

// The grandstand: stepped wooden benches rising away from the track, a row of seated spectators on each (drawn in
// front of the next bench up, so their bodies show). `cheer` 0..1: open mouths, arms up and bouncing.
const Grandstand: React.FC<{ frame: number; cheer: number }> = ({ frame, cheer }) => {
  const rows = 6;
  const tiles = (cheer: boolean) =>
    Array.from({ length: rows }, (_, r) => {
      const t = crowdCanvas(r * 31 + 3, cheer);
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.set(30 / CROWD_TILE, 1);
      t.offset.set(rand(r * 7) , 0);
      t.anisotropy = 8;
      return t;
    });
  const calm = useMemo(() => tiles(false), []);
  const loud = useMemo(() => tiles(true), []);
  return (
    <group position={[0, 0, -TRACK.half - 1.4]}>
      {Array.from({ length: rows }, (_, r) => {
        const seat = 0.35 + r * 0.42; // bench top
        const z = -r * 0.62;
        const bob = cheer * Math.max(0, Math.sin(frame * 0.55 + r * 1.3)) * 0.06;
        return (
          <group key={r}>
            <InkBox size={[30, seat, 0.62]} position={[0, seat / 2, z]} color={r % 2 ? "#8a6a4a" : "#7e6044"} ink={0.015} />
            <mesh position={[0, seat + CROWD_H / 2 - 0.03 + bob, z + 0.12]}>
              <planeGeometry args={[30, CROWD_H]} />
              <meshBasicMaterial map={cheer > 0.3 ? loud[r] : calm[r]} transparent alphaTest={0.05} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
      {/* a back wall behind the top row */}
      <InkBox size={[30, 3.4, 0.2]} position={[0, 1.7, -rows * 0.62 - 0.2]} color="#7a5c40" ink={0.015} />
      {/* rail with red, white and blue bunting */}
      <InkBox size={[30, 0.08, 0.08]} position={[0, 0.95, 0.42]} color="#efe8da" ink={0.008} />
      {Array.from({ length: 40 }, (_, i) => (
        <mesh key={i} position={[-15 + i * 0.75 + 0.37, 0.78, 0.45]} rotation={[0, 0, Math.PI]}>
          <circleGeometry args={[0.3, 16, 0, Math.PI]} />
          <meshToonMaterial color={["#c0392b", "#f4f0e6", "#2c4a8a"][i % 3]} gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <InkBox size={[30, 0.9, 0.08]} position={[0, 0.45, 0.4]} color="#efe8da" ink={0.01} />
    </group>
  );
};

// The chalk results board on an easel: "MARATHON" and the first finisher; `dq` 0..1 strikes the name through and
// chalks DISQUALIFIED next to it, letter by letter.
const boardCanvas = (dq: number) =>
  canvasTexture(512, 384, (ctx) => {
    ctx.fillStyle = "#24302a";
    ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let i = 0; i < 40; i++) ctx.fillRect(rand(i) * 512, rand(i + 9) * 384, 60, 6);
    ctx.fillStyle = "#f4f2ea";
    ctx.font = "bold 46px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("MARATHON", 256, 64);
    ctx.fillRect(120, 80, 272, 4);
    ctx.textAlign = "left";
    ctx.font = "bold 54px Georgia, serif";
    ctx.fillText("1.  F. LORZ", 60, 170);
    if (dq > 0) {
      ctx.strokeStyle = "#f4f2ea";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(52, 152);
      ctx.lineTo(52 + 330 * Math.min(1, dq * 3), 152);
      ctx.stroke();
      const word = "DISQUALIFIED";
      const n = Math.floor(Math.max(0, dq * 1.4 - 0.3) * word.length);
      ctx.fillStyle = "#ffe08a";
      ctx.font = "bold 50px Georgia, serif";
      ctx.save();
      ctx.translate(26, 272);
      ctx.rotate(-0.06);
      ctx.fillText(word.slice(0, Math.min(word.length, n)), 0, 0);
      ctx.restore();
    }
  });

export const BOARD: Vec3 = [2.6, 0, 1.9];

const ResultsBoard: React.FC<{ dq: number }> = ({ dq }) => {
  const step = Math.round(dq * 24) / 24;
  const tex = useMemo(() => boardCanvas(step), [step]);
  return (
    <group position={BOARD} rotation={[0, -0.55, 0]} scale={0.8}>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.06, 1.8, 0.06]} position={[s * 0.55, 0.9, 0.06]} rotation={[-0.12, 0, s * -0.08]} color="#8a6a4a" ink={0.008} />
      ))}
      <InkBox size={[0.06, 1.7, 0.06]} position={[0, 0.85, -0.3]} rotation={[0.25, 0, 0]} color="#8a6a4a" ink={0.008} />
      <InkBox size={[1.32, 1.0, 0.05]} position={[0, 1.3, 0.12]} rotation={[-0.12, 0, 0]} color="#7a5a3a" ink={0.012} />
      <mesh position={[0, 1.3, 0.15]} rotation={[-0.12, 0, 0]}>
        <planeGeometry args={[1.22, 0.9]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// The finish: posts either side of the track at x = 0 with a white tape; `tape` 0..1 = how far it has snapped (the
// two halves swing down and trail).
const Finish: React.FC<{ tape: number }> = ({ tape }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <planeGeometry args={[0.12, TRACK.half * 2]} />
      <meshBasicMaterial color="#f8f4ea" />
    </mesh>
    {[-1, 1].map((s) => (
      <group key={s}>
        <InkBox size={[0.08, 1.2, 0.08]} position={[0, 0.6, s * (TRACK.half + 0.1)]} color="#efe8da" ink={0.008} />
        <group position={[0, 1.0, s * (TRACK.half + 0.1)]} rotation={[s * tape * 1.3, 0, 0]}>
          <InkBox size={[0.02, 0.03, TRACK.half + 0.1]} position={[0, 0, -s * (TRACK.half + 0.1) / 2]} color="#ffffff" ink={0.004} />
        </group>
      </group>
    ))}
  </group>
);

export const StadiumSet: React.FC<{ camera: CameraShot; frame: number; cheer?: number; tape?: number; dq?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  cheer = 0,
  tape = 0,
  dq = 0,
  children,
}) => {
  const cinder = useMemo(() => repeat(cinderCanvas(), 8, 1), []);
  const grass = useMemo(() => repeat(dryGrassCanvas(), 14, 10), []);
  const keepOff = useMemo(() => (_x: number, z: number) => z < TRACK.half + 0.2 || (Math.abs(_x - BOARD[0]) < 1 && Math.abs(z - BOARD[2]) < 1), []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#e8e4d4"]} />
      <fog attach="fog" args={["#efe6d2", 25, 90]} />
      <Lights />
      <Sky camera={camera} />
      <Hills z={-60} width={300} low={2} high={6} color="#a8b48a" seed={6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 10]} receiveShadow>
        <planeGeometry args={[80, 30]} />
        <meshToonMaterial color="#d8e0a0" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
        <planeGeometry args={[40, TRACK.half * 2]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={cinder} />
      </mesh>
      <Tufts x0={-10} x1={10} z0={TRACK.half} z1={8} count={1600} keepOff={keepOff} seed={21} />
      <Grandstand frame={frame} cheer={cheer} />
      <Finish tape={tape} />
      {/* officials' table */}
      <group position={[-4.6, 0, 3.4]} rotation={[0, 0.4, 0]}>
        <InkBox size={[1.4, 0.08, 0.6]} position={[0, 0.72, 0]} color="#8a6a4a" ink={0.01} />
        {[-0.6, 0.6].flatMap((x) => [-0.24, 0.24].map((z) => <InkBox key={`${x}${z}`} size={[0.06, 0.72, 0.06]} position={[x, 0.36, z]} color="#6e5236" ink={0.006} />))}
        <InkBox size={[1.44, 0.3, 0.02]} position={[0, 0.6, 0.31]} color="#f4f0e6" ink={0.006} />
      </group>
      <ResultsBoard dq={dq} />
      {children}
    </>
  );
};
