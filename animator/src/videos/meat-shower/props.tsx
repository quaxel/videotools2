import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "../../engine";
import { canvasTexture } from "../../three/kit";
import { toonRamp } from "../../three/toon";

const INK = "#161212";

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- the meat ----------

// The top of a raw cut, painted flat: deep red meat with darker grain, white marbling, a cream fat rim along one
// edge and two wet highlights. The canvas spans the lump's -1..1 outline.
const meatCanvas = (seed: number) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#c7303f";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "#9c1f2c";
    ctx.lineWidth = 6;
    for (let i = 0; i < 9; i++) {
      const y = 14 + i * 28 + (rand(seed + i) - 0.5) * 14;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.bezierCurveTo(80, y - 18, 150, y + 18, 200, y - 6);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f7e4dc";
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const x = 30 + rand(seed + i * 3) * 120;
      const y = 50 + rand(seed + i * 5) * 150;
      ctx.lineWidth = 4 + rand(seed + i) * 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 20, y - 25, x + 40, y + 10, x + 55, y - 18);
      ctx.stroke();
    }
    // fat cap on the right edge
    ctx.fillStyle = "#f4e6c8";
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(196, 0);
    ctx.bezierCurveTo(176, 70, 214, 150, 186, 256);
    ctx.lineTo(256, 256);
    ctx.fill();
    ctx.strokeStyle = "#e3c9a0";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(196, 0);
    ctx.bezierCurveTo(176, 70, 214, 150, 186, 256);
    ctx.stroke();
    // wet shine
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.ellipse(70, 70, 20, 8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(110, 160, 10, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });

// One piece of the "meat": a flat, rounded raw cut (about 2 inches across), red on top with marbling and a fat
// rim, darker red on the cut sides, inked round the edge so it reads at a glance even when small.
const MeatLump: React.FC<{ size: number; seed: number }> = ({ size, seed }) => {
  const { geo, top } = useMemo(() => {
    // A torn, uneven cut: a kidney-ish outline with a nick on one side and lumpy edges.
    const n = 11;
    const pts: [number, number][] = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const nick = i === 3 ? 0.55 : 1;
      const r = (0.7 + rand(seed * 17 + i) * 0.42) * nick;
      return [Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.9];
    });
    const shape = new THREE.Shape();
    const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number];
    const m0 = mid(pts[n - 1], pts[0]);
    shape.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(pts[i], pts[(i + 1) % n]);
      shape.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.09, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -0.08);
    g.rotateX(-Math.PI / 2); // lie flat: the painted cap faces up
    const t = meatCanvas(seed);
    t.repeat.set(1 / 2.8, 1 / 2.1);
    t.offset.set(0.5, 0.5);
    return { geo: g, top: t };
  }, [seed]);
  return (
    <group scale={size}>
      <mesh geometry={geo} castShadow>
        <meshToonMaterial attach="material-0" color="#ffffff" map={top} gradientMap={toonRamp} />
        <meshToonMaterial attach="material-1" color="#a3303a" gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={geo} scale={1.12}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// A flake that drifts down "like a large snowflake" from `from` to `to`, landing on frame `land` (shot frames):
// it rocks and tumbles on the way, lands with a small squash and then lies still. Hidden before `land - fall`.
export const FallingFlake: React.FC<{ f: number; from: Vec3; to: Vec3; land: number; fall?: number; size?: number; seed?: number }> = ({
  f,
  from,
  to,
  land,
  fall = 40,
  size = 0.03,
  seed = 1,
}) => {
  const t = (f - (land - fall)) / fall;
  if (t < 0) return null;
  if (t >= 1) {
    const dt = f - land;
    const sq = dt < 8 ? 0.35 * Math.exp(-dt / 2.5) * Math.cos(dt * 0.9) : 0;
    return (
      <group position={[to[0], to[1] + size * 0.16, to[2]]} rotation={[0, rand(seed) * 6, 0]} scale={[1 + sq, 1 - sq, 1 + sq]}>
        <MeatLump size={size} seed={seed} />
      </group>
    );
  }
  const e = t ** 1.15;
  const sway = Math.sin(t * 9 + seed) * size * 2.5 * (1 - t);
  return (
    <group
      position={[from[0] + (to[0] - from[0]) * e + sway, from[1] + (to[1] - from[1]) * e + size * 0.32, from[2] + (to[2] - from[2]) * e]}
      rotation={[Math.sin(t * 7 + seed) * 0.9, t * 6 + seed, Math.cos(t * 6 + seed) * 0.7]}
    >
      <MeatLump size={size} seed={seed} />
    </group>
  );
};

// A piece already lying on the grass or stuck on a fence rail.
export const LyingFlake: React.FC<{ at: Vec3; size?: number; seed?: number; tilt?: number }> = ({ at, size = 0.03, seed = 1, tilt = 0 }) => (
  <group position={[at[0], at[1] + size * 0.16, at[2]]} rotation={[tilt, rand(seed) * 6, 0]}>
    <MeatLump size={size} seed={seed} />
  </group>
);

// ---------- the stirring paddle ----------

// A long wooden paddle from the hand down into the kettle.
export const Paddle: React.FC<{ hand: Vec3; blade: Vec3 }> = ({ hand, blade }) => {
  const a = new THREE.Vector3(...hand);
  const b = new THREE.Vector3(...blade);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const len = dir.length() + 0.12;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return (
    <group position={mid.toArray()} quaternion={q} userData={{ ghost: true }}>
      <mesh>
        <cylinderGeometry args={[0.016, 0.016, len, 10]} />
        <meshToonMaterial color="#b08a5e" gradientMap={toonRamp} />
      </mesh>
      <mesh scale={1.35}>
        <cylinderGeometry args={[0.016, 0.016, len, 10]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, len / 2 - 0.05, 0]}>
        <boxGeometry args={[0.08, 0.16, 0.018]} />
        <meshToonMaterial color="#a07a50" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// ---------- the kettle splash ----------

// A piece dropping into the soap: tan droplets thrown up and out under gravity, and a ring spreading on the
// brew. `f` is shot frames, `at` the frame it hits, `centre` the brew surface.
export const SoapSplash: React.FC<{ f: number; at: number; centre: Vec3 }> = ({ f, at, centre }) => {
  const t = f - at;
  if (t < 0 || t > 30) return null;
  return (
    <group position={centre} userData={{ ghost: true }}>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + rand(i) * 0.4;
        const v = 0.018 + rand(i + 3) * 0.02;
        const up = 0.05 + rand(i + 7) * 0.04;
        const x = Math.cos(a) * v * t;
        const z = Math.sin(a) * v * t;
        const y = up * t - 0.0042 * t * t;
        if (y < -0.02) return null;
        return (
          <mesh key={i} position={[x, y, z]} scale={0.03 * (1 - t / 34)}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color={i % 3 ? "#e6d39c" : "#f6ecc8"} gradientMap={toonRamp} />
          </mesh>
        );
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={0.04 + t * 0.012}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#fff4d6" transparent opacity={Math.max(0, 1 - t / 20)} depthWrite={false} />
      </mesh>
    </group>
  );
};
