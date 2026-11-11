import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { CameraRig, CameraShot, canvasTexture, cardTilt, Hills, InkBox, InkCylinder, livenPose, PuppetPlacement, PuppetPose, SkyDome, toonRamp, useShotFrame, useSpeech, Vec3 } from "../../engine";
import { turnToCamera } from "../../puppet/PuppetBillboard";
import { useOwned } from "../../three/BalloonSets";
import { useOwnedTex } from "../dog-nose/sets";

// Props for "The Cosmic Static Trapped in Pigeon Poop" (Holmdel, New Jersey, 1964-65; Princeton 1965; Stockholm 1978).
// The horn antenna is drawn at about 0.75 of real size against the puppets; the pigeons and the oscilloscope up to 1.5x
// (plan.json format_note). References: guide/references/holmdel-horn-1964.md.

const INK = "#161212";
const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// smooth value noise, a pure function of t (for the hiss traces)
const noise = (t: number, seed: number) => {
  const i = Math.floor(t);
  const u = t - i;
  const s = u * u * (3 - 2 * u);
  return rnd(i, seed) * (1 - s) + rnd(i + 1, seed) * s;
};
export const hiss = (x: number, f: number, seed = 1) => (rnd(Math.floor(x * 90) + Math.floor(f) * 131, seed) - 0.5) * 0.7 + (noise(x * 14 + f * 0.9, seed + 3) - 0.5) * 0.6;


// Toon pieces with an ink hull (the kit's cel look): a ball, a capsule, a box with the old RBox call shape.
const Ball: React.FC<{ position: Vec3; radius: number; color: string; scale?: Vec3; ink?: number; glow?: boolean; map?: THREE.Texture; rough?: number }> = ({ position, radius, color, scale = [1, 1, 1], ink = 1, glow, map }) => (
  <group position={position} scale={scale}>
    <mesh>
      <sphereGeometry args={[radius, 20, 14]} />
      {glow ? <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.15)} toneMapped={false} /> : <meshToonMaterial color={color} map={map ?? null} gradientMap={toonRamp} />}
    </mesh>
    {ink > 0 && !glow && radius > 0.015 && (
      <mesh>
        <sphereGeometry args={[radius + 0.006 * ink, 20, 14]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);
const Cap: React.FC<{ a: Vec3; b: Vec3; r: number; color: string; ink?: number }> = ({ a, b, r, color, ink = 0 }) => {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = Math.max(0.0001, va.distanceTo(vb));
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <group position={mid.toArray() as Vec3} quaternion={q}>
      <mesh>
        <capsuleGeometry args={[r, len, 6, 12]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <mesh>
        <capsuleGeometry args={[r + Math.max(0.003, ink), len, 6, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
const RBox: React.FC<{ size: Vec3; position?: Vec3; rotation?: Vec3; color: string; radius?: number }> = ({ size, position, rotation, color }) => (
  <InkBox size={size} position={position} rotation={rotation} color={color} ink={0.008} />
);

// ---------- slabs: flat plates of any convex outline, with a thickness and an ink hull ----------

const V = THREE.Vector3;
type Mat = { color: string; map?: THREE.Texture | null };

// A convex polygon `pts` (in order) given a thickness along its normal (toward `out`, or the winding normal). Face groups:
// 0 = the outer face, 1 = the inner face, 2 = the rim.
const slabGeometry = (pts: Vec3[], thick: number, grow = 0, out?: Vec3) => {
  const P = pts.map((p) => new V(...p));
  const c = P.reduce((a, b) => a.add(b), new V()).multiplyScalar(1 / P.length);
  let n = new V().subVectors(P[1], P[0]).cross(new V().subVectors(P[2], P[0])).normalize();
  if (out && n.dot(new V(...out)) < 0) n = n.negate();
  // the winding seen from +n is counter-clockwise when (P1-P0)x(P2-P0) points along n
  const ccw = new V().subVectors(P[1], P[0]).cross(new V().subVectors(P[2], P[0])).dot(n) > 0;
  const ring = ccw ? P : [...P].reverse();
  const g = ring.map((p) => (grow > 0 ? p.clone().add(p.clone().sub(c).normalize().multiplyScalar(grow)) : p.clone()));
  const top = g.map((p) => p.clone().addScaledVector(n, thick / 2 + grow));
  const bot = g.map((p) => p.clone().addScaledVector(n, -thick / 2 - grow));
  // UVs from the first edge's direction
  const ex = new V().subVectors(ring[1], ring[0]).normalize();
  const ey = new V().crossVectors(n, ex).normalize();
  const us = ring.map((p) => p.clone().sub(ring[0]).dot(ex));
  const vs = ring.map((p) => p.clone().sub(ring[0]).dot(ey));
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const uv = (k: number): [number, number] => [(us[k] - u0) / (u1 - u0 || 1), (vs[k] - v0) / (v1 - v0 || 1)];
  const pos: number[] = [];
  const uvs: number[] = [];
  const geo = new THREE.BufferGeometry();
  const N = g.length;
  let start = 0;
  // outer face (fan, ccw from +n)
  for (let k = 1; k < N - 1; k++) {
    for (const j of [0, k, k + 1]) {
      pos.push(...top[j].toArray());
      uvs.push(...uv(j));
    }
  }
  geo.addGroup(start, (N - 2) * 3, 0);
  start += (N - 2) * 3;
  // inner face (reversed)
  for (let k = 1; k < N - 1; k++) {
    for (const j of [0, k + 1, k]) {
      pos.push(...bot[j].toArray());
      uvs.push(...uv(j));
    }
  }
  geo.addGroup(start, (N - 2) * 3, 1);
  start += (N - 2) * 3;
  for (let k = 0; k < N; k++) {
    const j = (k + 1) % N;
    for (const p of [bot[k], bot[j], top[j], bot[k], top[j], top[k]]) {
      pos.push(...p.toArray());
      uvs.push(0, 0);
    }
  }
  geo.addGroup(start, N * 6, 2);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
};

export const Slab: React.FC<{ pts: Vec3[]; thick?: number; outer: Mat; inner?: Mat; ink?: number; out?: Vec3; shadows?: boolean }> = ({ pts, thick = 0.04, outer, inner, ink = 0.012, out, shadows = true }) => {
  const key = JSON.stringify([pts, thick, out]);
  const geo = useOwned(() => slabGeometry(pts, thick, 0, out), [key]);
  const hull = useOwned(() => slabGeometry(pts, thick, ink, out), [key, ink]);
  const inn = inner ?? outer;
  return (
    <group>
      <mesh geometry={geo} castShadow={shadows} receiveShadow={shadows}>
        <meshToonMaterial attach="material-0" color={outer.color} map={outer.map ?? null} gradientMap={toonRamp} />
        <meshToonMaterial attach="material-1" color={inn.color} map={inn.map ?? null} gradientMap={toonRamp} />
        <meshToonMaterial attach="material-2" color={outer.color} gradientMap={toonRamp} />
      </mesh>
      {ink > 0 && (
        <mesh geometry={hull}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

// A stick between two points (steel members, spokes, rails).
export const Stick: React.FC<{ a: Vec3; b: Vec3; r: number; color: string; ink?: number }> = ({ a, b, r, color, ink = 0.006 }) => {
  const d = new V(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(0.001, d.length());
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), d.clone().normalize()));
  return <InkCylinder radius={r} height={len} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} color={color} ink={ink} />;
};

// ---------- the horn antenna ----------

// Weathered riveted aluminium panels with seams and a diagonal brace pattern (outside), dark grey-green metal (inside).
const panelCanvas = (inside: boolean, seed: number) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = inside ? "#8a9a98" : "#aab2bc";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < (inside ? 0 : 26); i++) {
      ctx.fillStyle = inside ? `rgba(40,56,50,${0.08 + rnd(i, seed) * 0.12})` : `rgba(${110 + rnd(i, seed) * 40},${118 + rnd(i, seed) * 40},${130},${0.1 + rnd(i + 3, seed) * 0.12})`;
      ctx.fillRect(rnd(i + 5, seed) * 512, rnd(i + 9, seed) * 512, 40 + rnd(i + 2, seed) * 120, 20 + rnd(i + 4, seed) * 70);
    }
    // panel seams and rivet rows
    ctx.strokeStyle = inside ? "rgba(40,52,56,0.4)" : "rgba(80,88,98,0.7)";
    ctx.lineWidth = inside ? 3 : 5;
    for (let k = 0; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 128, 0);
      ctx.lineTo(k * 128, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, k * 128);
      ctx.lineTo(512, k * 128);
      ctx.stroke();
    }
    ctx.fillStyle = inside ? "rgba(30,40,36,0.5)" : "rgba(90,96,106,0.7)";
    for (let k = 0; k <= 4; k++) for (let j = 0; j < 32; j++) {
      ctx.fillRect(k * 128 - 9, j * 16 + 4, 3, 3);
      ctx.fillRect(j * 16 + 4, k * 128 - 9, 3, 3);
    }
    if (!inside) {
      // streaks of weather down the panels
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(120,110,96,${0.08 + rnd(i, seed + 7) * 0.1})`;
        ctx.fillRect(rnd(i + 1, seed + 7) * 512, 0, 3 + rnd(i, seed + 2) * 5, 200 + rnd(i + 4, seed) * 300);
      }
    }
  });

// White droppings splattered on a dark floor plate (transparent around them).
const droppingsCanvas = (seed: number) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    for (let i = 0; i < 150; i++) {
      const x = 256 + (rnd(i, seed) - 0.5) * 470 * Math.sqrt(rnd(i + 1, seed));
      const y = 256 + (rnd(i + 2, seed) - 0.5) * 470 * Math.sqrt(rnd(i + 3, seed));
      const r = 4 + rnd(i + 4, seed) * 13;
      ctx.fillStyle = rnd(i + 5, seed) > 0.25 ? "rgba(248,246,236,0.95)" : "rgba(190,186,170,0.9)";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.6 + rnd(i + 6, seed) * 0.5), rnd(i + 7, seed) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(60,64,50,0.8)";
      ctx.beginPath();
      ctx.arc(x + r * 0.2, y - r * 0.1, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Horn geometry (local frame): the horn axis runs along +x from the apex (x = 0) to the reflector end; the square
// aperture opens toward +z (perpendicular to the axis), the reflector curves round behind it.
export const HORN = { L: 6.4, a0: 0.32, a1: 1.55, wheelX: 4.3, wheelR: 2.1, axisY: 2.6, deck: 0.45 } as const;
const halfAt = (x: number) => HORN.a0 + ((HORN.a1 - HORN.a0) * x) / HORN.L;
// World offsets that put the aperture's centre at the local origin of `HornAntenna` with `centre="mouth"`.
export const MOUTH_X = HORN.L + HORN.a1; // aperture centre along the axis
export const LIP_Y = HORN.axisY - HORN.a1; // the mouth floor (lower lip) height at elevation 0

const Horn: React.FC<{ dirt?: number; throat?: number }> = ({ dirt = 0, throat = 0 }) => {
  const { L, a0, a1 } = HORN;
  const outerTex = useOwnedTex(() => panelCanvas(false, 3));
  const innerTex = useOwnedTex(() => panelCanvas(true, 5));
  const poo = useOwnedTex(() => droppingsCanvas(4));
  const out: Mat = { color: "#ffffff", map: outerTex };
  const inn: Mat = { color: "#ffffff", map: innerTex };
  const PI = 0.03; // the horn's ink: heavier than the wheel's so the horn is the shape you notice
  // the reflector: a quarter circle in x-z about C = (L, a1), radius 2 a1, extruded along y
  const R = 2 * a1;
  const arc = Array.from({ length: 11 }, (_, i) => {
    const t = (i / 10) * (Math.PI / 2);
    return [L + R * Math.sin(t), a1 - R * Math.cos(t)] as [number, number];
  });
  const sector = (y: number): Vec3[] => [[L, y, a1], ...arc.map(([x, z]) => [x, y, z] as Vec3)];
  return (
    <group>
      {/* the pyramid: top, bottom, back, front */}
      <Slab pts={[[0, a0, -a0], [L, a1, -a1], [L, a1, a1], [0, a0, a0]]} outer={out} inner={inn} out={[0, 1, 0]} ink={PI} />
      <Slab pts={[[0, -a0, -a0], [L, -a1, -a1], [L, -a1, a1], [0, -a0, a0]]} outer={out} inner={inn} out={[0, -1, 0]} ink={PI} />
      <Slab pts={[[0, -a0, -a0], [L, -a1, -a1], [L, a1, -a1], [0, a0, -a0]]} outer={out} inner={inn} out={[0, 0, -1]} ink={PI} />
      <Slab pts={[[0, -a0, a0], [L, -a1, a1], [L, a1, a1], [0, a0, a0]]} outer={out} inner={inn} out={[0, 0, 1]} ink={PI} />
      {/* the end: two quarter-disc plates and the curved reflector */}
      <Slab pts={sector(a1)} outer={out} inner={inn} out={[0, 1, 0]} ink={PI} />
      <Slab pts={sector(-a1)} outer={out} inner={inn} out={[0, -1, 0]} ink={PI} />
      {arc.slice(0, -1).map(([x, z], i) => {
        const [x2, z2] = arc[i + 1];
        return <Slab key={i} pts={[[x, -a1, z], [x2, -a1, z2], [x2, a1, z2], [x, a1, z]]} outer={out} inner={inn} out={[x + x2 - 2 * L, 0, z + z2 - 2 * a1]} ink={0.008} />;
      })}
      {/* a faint glow from the receiver at the throat, so the walls read as a tunnel narrowing away */}
      {throat > 0 && (
        <group>
          <pointLight position={[1.2, 0, 0]} color="#ffd890" intensity={6 * throat} distance={7} decay={1.2} />
          <mesh position={[0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[a0 * 1.9, a0 * 1.9]} />
            <meshBasicMaterial color={new THREE.Color("#ffd890").multiplyScalar(1.4 * throat)} toneMapped={false} />
          </mesh>
        </group>
      )}
      {/* the aperture's rim: a broad aluminium flange round the square mouth */}
      <InkBox size={[2 * a1 + 0.16, 0.09, 0.09]} position={[L + a1, -a1 - 0.02, a1 + 0.02]} color="#dfe4e8" ink={0.014} />
      <InkBox size={[2 * a1 + 0.16, 0.09, 0.09]} position={[L + a1, a1 + 0.02, a1 + 0.02]} color="#dfe4e8" ink={0.014} />
      <InkBox size={[0.09, 2 * a1 + 0.1, 0.09]} position={[L - 0.02, 0, a1 + 0.02]} color="#dfe4e8" ink={0.014} />
      <InkBox size={[0.09, 2 * a1 + 0.1, 0.09]} position={[L + 2 * a1 + 0.02, 0, a1 + 0.02]} color="#dfe4e8" ink={0.014} />
      {/* droppings on the mouth floor (fade with `dirt`) */}
      {dirt > 0.01 && (
        <mesh position={[L + a1 * 0.55, -a1 + 0.025, a1 * 0.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[a1 * 1.7, a1 * 1.7]} />
          <meshBasicMaterial map={poo} transparent opacity={dirt} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* outside bracing: diagonals along the side and top panels */}
      {[0, 1, 2, 3].map((k) => {
        const x0 = 0.6 + k * 1.45;
        const x1 = x0 + 1.45;
        const h0 = halfAt(x0) + 0.05;
        const h1 = halfAt(x1) + 0.05;
        return (
          <group key={k}>
            <Stick a={[x0, -h0, h0]} b={[x1, h1, h1]} r={0.03} color="#9aa2ac" />
            <Stick a={[x0, h0, -h0]} b={[x1, h1, h1]} r={0.03} color="#9aa2ac" />
            <Stick a={[x0, h0, h0]} b={[x1, -h1, h1]} r={0.025} color="#9aa2ac" />
          </group>
        );
      })}
      {/* ribs round the horn at the panel joints */}
      {[1.6, 3.2, 5.6].map((x) => {
        const h = halfAt(x) + 0.03;
        return (
          <group key={x}>
            {[
              [[x, -h, h], [x, h, h]],
              [[x, h, h], [x, h, -h]],
              [[x, h, -h], [x, -h, -h]],
              [[x, -h, -h], [x, -h, h]],
            ].map(([a, b], i) => <Stick key={i} a={a as Vec3} b={b as Vec3} r={0.035} color="#8a929c" />)}
          </group>
        );
      })}
    </group>
  );
};

// The spoked elevation wheel round the horn, in the y-z plane at x = 0 of its group.
const Wheel: React.FC = () => {
  const { wheelR: R } = HORN;
  const h = halfAt(HORN.wheelX) + 0.04;
  const rim = useOwned(() => new THREE.TorusGeometry(R, 0.045, 8, 72), []);
  const rimInk = useOwned(() => new THREE.TorusGeometry(R, 0.056, 8, 72), []);
  return (
    <group>
      <mesh geometry={rim} rotation={[0, Math.PI / 2, 0]} castShadow>
        <meshToonMaterial color="#7e868e" gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={rimInk} rotation={[0, Math.PI / 2, 0]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        const tip: Vec3 = [0, Math.cos(a) * R, Math.sin(a) * R];
        // spokes run from the horn's square to the rim
        const s = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
        const base: Vec3 = [0, (Math.cos(a) * h) / s, (Math.sin(a) * h) / s];
        return <Stick key={i} a={base} b={tip} r={0.014} color="#7e868e" ink={0.003} />;
      })}
    </group>
  );
};

// White board cab on a steel stilt frame at the apex end, with one square window (lit at night) and a stair.
const cabCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#eef0ea";
    ctx.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 16; k++) {
      ctx.fillStyle = `rgba(120,124,118,${0.25 + rnd(k) * 0.2})`;
      ctx.fillRect(k * 32, 0, 3, 512);
      ctx.fillStyle = `rgba(150,140,120,${0.05 + rnd(k + 3) * 0.08})`;
      ctx.fillRect(k * 32 + 6, rnd(k + 5) * 300, 20, 120 + rnd(k) * 200);
    }
  });

const Cab: React.FC<{ windowGlow?: number }> = ({ windowGlow = 0 }) => {
  const tex = useOwnedTex(() => cabCanvas());
  const floorY = 1.75;
  const H = 1.7;
  const W = 1.7;
  return (
    <group position={[-0.75, 0, 0]}>
      <InkBox size={[W, H, W]} position={[0, floorY + H / 2, 0]} color="#ffffff" map={tex} ink={0.02} />
      <InkBox size={[W + 0.14, 0.08, W + 0.14]} position={[0, floorY + H + 0.04, 0]} color="#6a6e74" ink={0.012} />
      {/* window on the front (+z) face */}
      <InkBox size={[0.42, 0.42, 0.03]} position={[0.1, floorY + 1.05, W / 2 + 0.01]} color={windowGlow > 0 ? "#ffd98a" : "#3a4654"} emissive={windowGlow > 0 ? "#ffb84a" : undefined} ink={0.012} />
      {/* stilts and braces down to the deck */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Stick key={`${sx}${sz}`} a={[sx * 0.7, HORN.deck, sz * 0.7]} b={[sx * 0.7, floorY, sz * 0.7]} r={0.045} color="#7a3a2a" />))}
      <Stick a={[-0.7, HORN.deck, 0.7]} b={[0.7, floorY, 0.7]} r={0.03} color="#7a3a2a" />
      <Stick a={[0.7, HORN.deck, -0.7]} b={[-0.7, floorY, -0.7]} r={0.03} color="#7a3a2a" />
      <InkBox size={[W + 0.3, 0.06, W + 0.3]} position={[0, floorY - 0.03, 0]} color="#7a3a2a" ink={0.01} />
      {/* stair up the front to a landing */}
      {Array.from({ length: 7 }, (_, i) => (
        <InkBox key={i} size={[0.5, 0.04, 0.2]} position={[-0.45 + i * 0.0, HORN.deck + 0.18 + i * 0.19, W / 2 + 1.25 - i * 0.17]} color="#8a8e94" ink={0.006} />
      ))}
      <Stick a={[-0.2, HORN.deck, W / 2 + 1.35]} b={[-0.2, floorY + 0.5, W / 2 + 0.1]} r={0.018} color="#c84a3a" />
    </group>
  );
};

// The whole antenna on its platform. `az` turns it on its track (radians about y), `elev` swings the aperture up
// from the horizon about the horn's axis. `centre`: "track" puts the turntable centre at the origin, "mouth" puts the
// aperture's lower lip centre at the origin (for close shots on the mouth).
export const HornAntenna: React.FC<{ az?: number; elev?: number; dirt?: number; windowGlow?: number; throat?: number; position?: Vec3; centre?: "track" | "mouth" }> = ({ az = 0, elev = 0, dirt = 0, windowGlow = 0, throat = 0, position = [0, 0, 0], centre = "track" }) => {
  const { axisY, deck, wheelX, wheelR } = HORN;
  const trackX = 4.2;
  const shift: Vec3 = centre === "mouth" ? [-MOUTH_X, 0, -HORN.a1] : [-trackX, 0, 0];
  const deckTex = useOwnedTex(() =>
    canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#6e6a66";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(40,36,34,0.6)";
      ctx.lineWidth = 2;
      for (let k = 0; k < 256; k += 12) {
        ctx.beginPath();
        ctx.moveTo(k, 0);
        ctx.lineTo(k, 256);
        ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(140,80,50,${0.1 + rnd(i) * 0.15})`;
        ctx.fillRect(rnd(i + 1) * 256, rnd(i + 2) * 256, 10 + rnd(i + 3) * 40, 6 + rnd(i + 4) * 20);
      }
    }),
  );
  return (
    <group position={position} rotation={[0, az, 0]}>
      <group position={shift}>
        {/* the turntable: a low steel deck on wheels round a circular rail */}
        <InkBox size={[11.2, deck - 0.12, 4.6]} position={[3.9, (deck - 0.12) / 2 + 0.12, 0]} color="#ffffff" map={deckTex} ink={0.02} />
        {[-1, 1].map((s) => (
          <InkBox key={s} size={[11.2, 0.12, 0.2]} position={[3.9, 0.06, s * 2.2]} color="#4a4644" ink={0.01} />
        ))}
        {/* railing along the front edge of the deck */}
        {Array.from({ length: 6 }, (_, i) => (
          <Stick key={i} a={[-1.4 + i * 0.95, deck, 2.25]} b={[-1.4 + i * 0.95, deck + 0.75, 2.25]} r={0.018} color="#c8ccd0" ink={0.004} />
        ))}
        <Stick a={[-1.4, deck + 0.75, 2.25]} b={[3.35, deck + 0.75, 2.25]} r={0.02} color="#c8ccd0" ink={0.004} />
        <Stick a={[-1.4, deck + 0.4, 2.25]} b={[3.35, deck + 0.4, 2.25]} r={0.016} color="#c8ccd0" ink={0.004} />
        {/* roller trucks under the wheel and two A-frames holding the axle */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <InkBox size={[0.5, 0.22, 0.4]} position={[wheelX, deck + 0.11, s * 0.75]} color="#5a5a60" ink={0.01} />
            <Stick a={[wheelX - 1.0, deck, s * (wheelR + 0.15)]} b={[wheelX, axisY - 0.4, s * (wheelR + 0.15)]} r={0.05} color="#8a3e2c" />
            <Stick a={[wheelX + 1.0, deck, s * (wheelR + 0.15)]} b={[wheelX, axisY - 0.4, s * (wheelR + 0.15)]} r={0.05} color="#8a3e2c" />
          </group>
        ))}
        <Cab windowGlow={windowGlow} />
        {/* the horn and its wheel swing together about the axis */}
        <group position={[0, axisY, 0]} rotation={[-elev, 0, 0]}>
          <Horn dirt={dirt} throat={throat} />
          <group position={[wheelX, 0, 0]}>
            <Wheel />
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------- the hilltop: sky, gravel, grass, trees, far hills ----------

const groundCanvas = (night: boolean) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = night ? "#2e3a3a" : "#8a9a58";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1400; i++) {
      const v = rnd(i, 8);
      ctx.fillStyle = night ? `rgba(${30 + v * 30},${50 + v * 30},${50 + v * 20},0.6)` : v > 0.6 ? "rgba(120,140,70,0.55)" : v > 0.3 ? "rgba(96,116,58,0.5)" : "rgba(160,150,100,0.45)";
      ctx.fillRect(rnd(i + 1, 8) * 1024, rnd(i + 2, 8) * 1024, 4 + rnd(i + 3, 8) * 10, 2 + rnd(i + 4, 8) * 3);
    }
  });
const gravelCanvas = (night: boolean) =>
  canvasTexture(512, 512, (ctx) => {
    const g = ctx.createRadialGradient(256, 256, 60, 256, 256, 256);
    g.addColorStop(0, night ? "rgba(70,74,90,1)" : "rgba(196,184,160,1)");
    g.addColorStop(0.8, night ? "rgba(70,74,90,0.9)" : "rgba(196,184,160,0.92)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i++) {
      const r = Math.hypot(rnd(i + 1, 2) - 0.5, rnd(i + 2, 2) - 0.5);
      if (r > 0.44) continue;
      const v = rnd(i, 2);
      ctx.fillStyle = night ? `rgba(${40 + v * 50},${44 + v * 50},${60 + v * 50},0.7)` : v > 0.5 ? "rgba(150,138,118,0.7)" : "rgba(226,218,198,0.7)";
      ctx.fillRect(rnd(i + 1, 2) * 512, rnd(i + 2, 2) * 512, 2 + v * 3, 2 + v * 2);
    }
  });
// A painted strip of autumn woods (fall 1964): round crowns in greens, ochres and rust.
const woodsCanvas = (seed: number, night: boolean) =>
  canvasTexture(2048, 320, (ctx) => {
    ctx.clearRect(0, 0, 2048, 320);
    const cols = night ? ["#1e2a3a", "#243246", "#1a2434", "#2a2e44"] : ["#5e7a3a", "#7a8a3a", "#b0892e", "#a8582a", "#4e6a36", "#c49a3a"];
    for (let i = 0; i < 90; i++) {
      const x = rnd(i, seed) * 2048;
      const h = 90 + rnd(i + 1, seed) * 150;
      const w = 50 + rnd(i + 2, seed) * 70;
      ctx.fillStyle = night ? "#141a24" : "#4a3a2a";
      ctx.fillRect(x - 4, 320 - h * 0.5, 8, h * 0.5);
      ctx.fillStyle = cols[Math.floor(rnd(i + 3, seed) * cols.length)];
      ctx.beginPath();
      ctx.ellipse(x, 320 - h * 0.62, w, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.ellipse(x - w * 0.3, 320 - h * 0.72, w * 0.45, h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = night ? "#121822" : "#3e4a2a";
    ctx.fillRect(0, 300, 2048, 20);
  });

export type HillMode = "day" | "dusk" | "night" | "overcast" | "glow";
const SKIES: Record<HillMode, [number, string][]> = {
  day: [
    [-0.1, "#e8f0f2"],
    [0.0, "#dfeaf2"],
    [0.1, "#b2d2ee"],
    [0.25, "#78ade6"],
    [0.6, "#3f82d6"],
    [1.0, "#2a66c0"],
  ],
  dusk: [
    [-0.1, "#f8c890"],
    [0.0, "#ffb070"],
    [0.08, "#f49460"],
    [0.18, "#c8708a"],
    [0.4, "#6a5a9a"],
    [1.0, "#2e3a78"],
  ],
  night: [
    [-0.1, "#2a2a4a"],
    [0.0, "#3a2e5a"],
    [0.08, "#2a2a58"],
    [0.25, "#1a1e44"],
    [1.0, "#0c1030"],
  ],
  overcast: [
    [-0.1, "#d8dcd4"],
    [0.0, "#d0d4cc"],
    [0.2, "#b8bcb8"],
    [0.6, "#9aa0a4"],
    [1.0, "#8a9096"],
  ],
  glow: [
    [-0.1, "#2a1830"],
    [0.0, "#2e1a36"],
    [0.1, "#22163a"],
    [0.3, "#161236"],
    [1.0, "#0a0a24"],
  ],
};
const SUNS: Record<HillMode, Vec3> = { day: [-6, 9, 5], dusk: [-9, 1.6, -4], night: [4, 6, -8], overcast: [-4, 8, 3], glow: [4, 6, -8] };

export const hillLight = (mode: HillMode) =>
  mode === "day"
    ? { tint: "#fff4e0", tintAmount: 0.06, shadow: 0.18, distant: [{ direction: [-0.6, 0.8, 0.5] as Vec3, color: "#fff2dc", strength: 1.0 }] }
    : mode === "dusk"
      ? { tint: "#ffc890", tintAmount: 0.14, shadow: 0.3, distant: [{ direction: [-0.9, 0.25, -0.2] as Vec3, color: "#ffa860", strength: 1.6 }] }
      : mode === "night" || mode === "glow"
        ? { tint: mode === "glow" ? "#d08ab0" : "#8a8ad0", tintAmount: 0.16, shadow: 0.42, distant: [{ direction: [0.4, 0.6, -0.6] as Vec3, color: "#a8b0ff", strength: 0.8 }] }
        : { tint: "#e8ece4", tintAmount: 0.08, shadow: 0.2, distant: [{ direction: [-0.4, 0.8, 0.4] as Vec3, color: "#f0f2ea", strength: 0.7 }] };

// Stars for the night sky (a fixed field on the dome; `twinkle` from the frame).
const Stars: React.FC<{ frame: number; count?: number }> = ({ frame, count = 240 }) => {
  const pts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const az = rnd(i, 21) * Math.PI * 2;
        const el = 0.12 + Math.asin(rnd(i + 1, 21)) * 0.9;
        return [Math.cos(el) * Math.sin(az) * 250, Math.sin(el) * 250, Math.cos(el) * Math.cos(az) * 250, 0.4 + rnd(i + 2, 21) * 0.9] as const;
      }),
    [count],
  );
  return (
    <group>
      {pts.map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[s * (0.85 + 0.15 * Math.sin(frame * 0.2 + i)), 6]} />
          <meshBasicMaterial color="#fff6dc" fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

// The hilltop clearing with the antenna. Children are drawn in the set.
export const HillSet: React.FC<{ camera: CameraShot; frame: number; mode: HillMode; skyline?: number; children?: React.ReactNode }> = ({ camera, frame, mode, skyline = 0, children }) => {
  const night = mode === "night" || mode === "glow";
  const camX = camera.position[0];
  const grass = useOwnedTex(() => {
    const t = groundCanvas(night);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 8);
    return t;
  }, [night]);
  const gravel = useOwnedTex(() => gravelCanvas(night), [night]);
  const woods = useOwnedTex(() => woodsCanvas(3, night), [night]);
  const woods2 = useOwnedTex(() => woodsCanvas(11, night), [night]);
  const fog = mode === "day" ? "#d8e6f0" : mode === "dusk" ? "#f0b088" : mode === "night" ? "#1c1e3a" : mode === "glow" ? "#3a1a3a" : "#c8ccc6";
  const key = mode === "day" ? { i: 2.4, c: "#fff4e0", p: [-6, 9, 5] } : mode === "dusk" ? { i: 2.0, c: "#ffb070", p: [-9, 3.5, -2] } : night ? { i: mode === "glow" ? 1.5 : 0.7, c: mode === "glow" ? "#ffa8c8" : "#9aa4ff", p: mode === "glow" ? [6, 6, 8] : [5, 8, -6] } : { i: 1.3, c: "#eef0ea", p: [-4, 9, 3] };
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[fog]} />
      <fog attach="fog" args={[fog, 30, 110]} />
      <ambientLight intensity={night ? 0.55 : mode === "dusk" ? 0.85 : 1.1} color={night ? "#6a6ab0" : mode === "dusk" ? "#ffd8c0" : "#ffffff"} />
      <hemisphereLight args={[night ? "#40489a" : "#cfe4ff", night ? "#1a2020" : "#6a7a3a", night ? 0.35 : 0.55]} />
      <directionalLight
        position={key.p as Vec3}
        intensity={key.i}
        color={key.c}
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
      <group position={camera.position}>
        <SkyDome sun={SUNS[mode]} stops={SKIES[mode]} glow={mode === "dusk" ? "#fff0b0" : night ? "#30305a" : "#fff6dc"} />
        {night && <Stars frame={frame} count={mode === "glow" ? 120 : 240} />}
        {mode === "glow" && <CmbSky frame={frame} />}
      </group>
      <Hills z={-70} shift={camX * 0.7} width={320} low={3} high={8} color={night ? "#20244a" : mode === "dusk" ? "#8a6a8a" : "#8aa0b4"} seed={4} flat />
      <Hills z={-45} shift={camX * 0.4} width={220} low={1.5} high={4.5} color={night ? "#1a1e3a" : mode === "dusk" ? "#6a5a6a" : "#6f8a5a"} seed={7} />
      {skyline > 0 && <Skyline z={-38} glow={skyline} frame={frame} />}
      <mesh position={[camX * 0.15, 3.2, -26]}>
        <planeGeometry args={[80, 9]} />
        <meshBasicMaterial map={woods} transparent fog={false} toneMapped={false} depthWrite={false} color={night ? "#ffffff" : mode === "dusk" ? "#ffd0b0" : "#ffffff"} />
      </mesh>
      <mesh position={[-camX * 0.05 + 6, 2.4, -17]}>
        <planeGeometry args={[50, 6.5]} />
        <meshBasicMaterial map={woods2} transparent fog={false} toneMapped={false} depthWrite={false} color={mode === "dusk" ? "#ffd0b0" : "#ffffff"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[17, 13]} />
        <meshBasicMaterial map={gravel} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {children}
    </>
  );
};

// A far city skyline at night on the horizon (New York, 1964: towers and a spire, lit windows), with a glow above it.
export const Skyline: React.FC<{ z: number; glow?: number; frame: number }> = ({ z, glow = 1 }) => {
  const tex = useOwnedTex(() =>
    canvasTexture(2048, 512, (ctx) => {
      ctx.clearRect(0, 0, 2048, 512);
      const g = ctx.createLinearGradient(0, 160, 0, 512);
      g.addColorStop(0, "rgba(255,170,90,0)");
      g.addColorStop(1, "rgba(255,170,90,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 160, 2048, 352);
      let x = 560;
      let i = 0;
      while (x < 1500) {
        const w = 24 + rnd(i, 31) * 50;
        const tall = i === 9 ? 330 : i === 14 ? 290 : 60 + rnd(i + 1, 31) * 170;
        ctx.fillStyle = "#1a1630";
        ctx.fillRect(x, 512 - tall, w, tall);
        if (i === 9 || i === 14) {
          // two spire towers
          ctx.beginPath();
          ctx.moveTo(x, 512 - tall);
          ctx.lineTo(x + w / 2, 512 - tall - 70);
          ctx.lineTo(x + w, 512 - tall);
          ctx.fill();
        }
        for (let r = 0; r < tall / 14; r++) for (let c = 0; c < w / 9; c++) {
          if (rnd(i * 97 + r * 13 + c, 5) > 0.62) {
            ctx.fillStyle = rnd(r + c, i) > 0.5 ? "#ffd27a" : "#ffe9b0";
            ctx.fillRect(x + 3 + c * 9, 512 - tall + 6 + r * 14, 4, 6);
          }
        }
        x += w + 2 + rnd(i + 3, 31) * 8;
        i++;
      }
    }),
  );
  return (
    <mesh position={[0, 9.6, z]}>
      <planeGeometry args={[80, 20]} />
      <meshBasicMaterial map={tex} transparent opacity={glow} fog={false} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

// ---------- the pigeons ----------

const neckCanvas = () =>
  canvasTexture(64, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#58c89a");
    g.addColorStop(0.35, "#4aa8d8");
    g.addColorStop(0.7, "#a45fc8");
    g.addColorStop(1, "#c46aa8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 128);
  });

// A plump grey city pigeon (after eagle-vision's Pigeon), facing +z, plus open wings: `flap` 0 = folded, 1 = spread and
// beating (`beat` is the wing phase), `peck` 0..1 dips the head to the floor, `walk` the stride phase, `look` turns the
// head, `air` lifts it off its perch. Puffs its chest with `coo`.
export const Pigeon: React.FC<{ position: Vec3; f: number; rotationY?: number; scale?: number; walk?: number; look?: number; cock?: number; peck?: number; flap?: number; beat?: number; coo?: number; tilt?: number }> = ({
  position,
  f,
  rotationY = 0,
  scale = 1,
  walk = 0,
  look = 0,
  cock = 0,
  peck = 0,
  flap = 0,
  beat = 0,
  coo = 0,
  tilt = 0,
}) => {
  const neckTex = useOwnedTex(() => neckCanvas());
  const ph = walk * 0.6;
  const bob = walk ? Math.sin(ph * 2) * 0.018 : Math.sin(f * 0.1) * 0.003;
  const head = walk ? Math.sin(ph) * 0.03 : 0;
  const puff = 1 + coo * 0.12;
  const wingA = flap * (0.5 + 0.9 * Math.sin(beat));
  const legsUp = flap > 0.5;
  return (
    <group position={position} rotation={[tilt, rotationY, 0]} scale={scale}>
      <group position={[0, 0.17 + bob * 0.5, 0]}>
        <Ball position={[0, 0.02, -0.02]} radius={0.09} color="#8e9ab4" scale={[1, 0.95, 1.55]} rough={0.8} />
        <Ball position={[0, 0.0, 0.06]} radius={0.078} color="#b0bcd4" scale={[1.05 * puff, puff, puff]} rough={0.8} />
        <Ball position={[0, 0.105, 0.095]} radius={0.062} color="#ffffff" map={neckTex} scale={[1.05 * puff, 0.95 * puff, puff]} rough={0.3} />
        <group position={[0, 0.18 + bob - peck * 0.2, 0.13 + head + peck * 0.08]} rotation={[peck * 1.1, look, cock]}>
          <Ball position={[0, 0, 0]} radius={0.05} color="#8490ac" rough={0.8} />
          <Ball position={[0, -0.005, 0.05]} radius={0.03} color="#8490ac" rough={0.8} />
          <Cap a={[0, -0.005, 0.07]} b={[0, -0.018, 0.115]} r={0.014} color="#e9d3bd" ink={0} />
          <Ball position={[0, 0.003, 0.068]} radius={0.012} color="#ffffff" scale={[1.2, 0.8, 0.8]} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Ball position={[s * 0.034, 0.014, 0.03]} radius={0.017} color="#ff8a1a" glow />
              <Ball position={[s * 0.039, 0.014, 0.042]} radius={0.009} color={INK} />
              <Ball position={[s * 0.04, 0.019, 0.05]} radius={0.003} color="#ffffff" glow />
            </group>
          ))}
        </group>
        {/* wings: folded at rest, spread for flight */}
        {[-1, 1].map((s) =>
          flap < 0.05 ? (
            <group key={s}>
              <Ball position={[s * 0.07, 0.03, -0.035]} radius={0.085} color="#76829e" scale={[0.45, 0.85, 1.7]} rough={0.8} />
              <Ball position={[s * 0.1, 0.045, -0.03]} radius={0.04} color="#3c4252" scale={[0.3, 0.4, 1.7]} rough={0.8} />
              <Ball position={[s * 0.09, 0.0, -0.155]} radius={0.03} color="#5a6274" scale={[0.35, 0.3, 1.9]} rough={0.8} />
            </group>
          ) : (
            <group key={s} position={[s * 0.06, 0.06, -0.02]} rotation={[0, 0, s * wingA]}>
              <Ball position={[s * 0.13, 0, 0]} radius={0.11} color="#8490ac" scale={[1.4, 0.18, 0.75]} rough={0.8} />
              <Ball position={[s * 0.28, 0, -0.02]} radius={0.1} color="#76829e" scale={[1.2, 0.14, 0.7]} rough={0.8} />
              <Ball position={[s * 0.2, 0.012, -0.05]} radius={0.04} color="#3c4252" scale={[1.6, 0.3, 0.4]} rough={0.8} />
              <Ball position={[s * 0.4, -0.005, -0.04]} radius={0.07} color="#4a5060" scale={[1.0, 0.12, 0.6]} rough={0.8} />
            </group>
          ),
        )}
        <RBox size={[0.09, 0.016, 0.16]} position={[0, 0.0, -0.2]} rotation={[0.15 - flap * 0.3, 0, 0]} color="#6f7888" radius={0.008} />
        <RBox size={[0.09, 0.017, 0.035]} position={[0, 0.0 + flap * 0.02, -0.275]} rotation={[0.15 - flap * 0.3, 0, 0]} color="#2c303c" radius={0.008} />
      </group>
      {[-1, 1].map((s) => {
        const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * (walk ? 0.07 : 0);
        const lift = walk ? Math.max(0, Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 0.03 : 0;
        return (
          <group key={s} position={[s * 0.035, legsUp ? 0.08 : 0, sw]} rotation={[legsUp ? -0.9 : 0, 0, 0]}>
            <Cap a={[0, 0.16, 0]} b={[0, 0.02 + lift, 0.01]} r={0.009} color="#e8808a" ink={0} />
            {[-1, 0, 1].map((k) => (
              <Cap key={k} a={[0, 0.02 + lift, 0.01]} b={[k * 0.018, 0.005 + lift, 0.05]} r={0.006} color="#e8808a" ink={0} />
            ))}
          </group>
        );
      })}
    </group>
  );
};

// A loose twig nest in a corner.
export const Nest: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    {Array.from({ length: 22 }, (_, i) => {
      const a = (i / 22) * Math.PI * 2 + rnd(i, 4);
      const r = 0.16 + rnd(i + 1, 4) * 0.05;
      return (
        <Stick key={i} a={[Math.cos(a) * r, 0.03 + rnd(i + 2, 4) * 0.05, Math.sin(a) * r]} b={[Math.cos(a + 1.1) * r, 0.02 + rnd(i + 3, 4) * 0.05, Math.sin(a + 1.1) * r]} r={0.008} color={rnd(i, 9) > 0.5 ? "#8a6a3e" : "#a8865a"} ink={0.003} />
      );
    })}
    <Ball position={[0, 0.02, 0]} radius={0.16} color="#6a5032" scale={[1, 0.22, 1]} ink={0.6} />
    <Ball position={[0.03, 0.06, 0.02]} radius={0.035} color="#f6f2e6" scale={[1, 1.25, 1]} />
  </group>
);

// ---------- instruments ----------

// A trace ribbon (a jagged line drawn with thickness), updated every frame from `ys` over x in [-w/2, w/2].
const Trace: React.FC<{ width: number; height: number; f: number; seed?: number; amp?: number; color?: string; glow?: number; points?: number; base?: number }> = ({ width, height, f, seed = 1, amp = 1, color = "#9cff7a", glow = 1.8, points = 90, base = 0 }) => {
  const geo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < points - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    return g;
  }, [points]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const th = height * 0.035;
  for (let i = 0; i < points; i++) {
    const u = i / (points - 1);
    const x = (u - 0.5) * width;
    const y = (base + hiss(u, f, seed) * amp) * height * 0.5;
    pos.setXYZ(i * 2, x, y + th, 0);
    pos.setXYZ(i * 2 + 1, x, y - th, 0);
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(glow), [color, glow]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={c} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

const scopeGrid = () =>
  canvasTexture(256, 200, (ctx) => {
    const g = ctx.createRadialGradient(128, 100, 10, 128, 100, 150);
    g.addColorStop(0, "#1e4a2a");
    g.addColorStop(1, "#0a1a10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 200);
    ctx.strokeStyle = "rgba(120,220,140,0.35)";
    ctx.lineWidth = 2;
    for (let k = 1; k < 8; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 32, 0);
      ctx.lineTo(k * 32, 200);
      ctx.stroke();
    }
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(0, k * 33);
      ctx.lineTo(256, k * 33);
      ctx.stroke();
    }
  });

// A 1960s oscilloscope: a grey steel case, a round-cornered green screen with a graticule and the hissing trace, knobs
// and a small needle meter. Origin on the bottom centre, screen toward +z.
export const Oscilloscope: React.FC<{ position: Vec3; f: number; rotationY?: number; scale?: number; amp?: number; on?: number }> = ({ position, f, rotationY = 0, scale = 1, amp = 1, on = 1 }) => {
  const grid = useOwnedTex(() => scopeGrid());
  const W = 0.36;
  const H = 0.3;
  const D = 0.4;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <RBox size={[W, H, D]} position={[0, H / 2, 0]} color="#8a9096" radius={0.02} />
      <InkBox size={[W + 0.01, 0.025, D + 0.01]} position={[0, H - 0.01, 0]} color="#5a6066" ink={0.004} />
      {/* screen bezel and glass */}
      <RBox size={[0.22, 0.18, 0.02]} position={[-0.05, H * 0.55, D / 2 + 0.005]} color="#2a2e32" radius={0.02} />
      <mesh position={[-0.05, H * 0.55, D / 2 + 0.017]}>
        <planeGeometry args={[0.19, 0.15]} />
        <meshBasicMaterial map={grid} toneMapped={false} color={on > 0 ? "#ffffff" : "#556055"} />
      </mesh>
      {on > 0 && (
        <group position={[-0.05, H * 0.55, D / 2 + 0.02]}>
          <Trace width={0.18} height={0.14} f={f} amp={amp} seed={3} />
        </group>
      )}
      {/* knobs */}
      {[0, 1, 2].map((k) => (
        <group key={k} position={[0.12, H * 0.78 - k * 0.075, D / 2 + 0.012]}>
          <InkCylinder radius={0.018} height={0.02} rotation={[Math.PI / 2, 0, 0]} color={k === 1 ? "#c8302a" : "#1e1e22"} ink={0.003} />
        </group>
      ))}
      {/* a small needle meter */}
      <InkBox size={[0.1, 0.06, 0.01]} position={[-0.05, 0.045, D / 2 + 0.006]} color="#f2ecd8" ink={0.003} />
      <group position={[-0.05, 0.02, D / 2 + 0.013]} rotation={[0, 0, 0.35 + 0.08 * hiss(0.3, f, 9)]}>
        <mesh position={[0, 0.025, 0]}>
          <planeGeometry args={[0.004, 0.05]} />
          <meshBasicMaterial color="#c8302a" />
        </mesh>
      </group>
      {/* handle on top, cable out the back */}
      <Stick a={[-0.1, H, 0]} b={[-0.1, H + 0.05, 0]} r={0.008} color="#2a2a2e" ink={0.002} />
      <Stick a={[0.1, H, 0]} b={[0.1, H + 0.05, 0]} r={0.008} color="#2a2a2e" ink={0.002} />
      <Stick a={[-0.1, H + 0.05, 0]} b={[0.1, H + 0.05, 0]} r={0.008} color="#2a2a2e" ink={0.002} />
    </group>
  );
};

// A strip-chart recorder: a paper roll scrolling down past a pen that scribbles the hiss. `on` > 0 moves the paper.
export const ChartRecorder: React.FC<{ position: Vec3; f: number; scale?: number; amp?: number; label?: React.ReactNode }> = ({ position, f, scale = 1, amp = 1 }) => {
  const W = 0.36;
  const H = 0.42;
  const paper = useOwnedTex(() =>
    canvasTexture(256, 512, (ctx) => {
      ctx.fillStyle = "#f6f2e2";
      ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = "rgba(200,90,80,0.35)";
      ctx.lineWidth = 1;
      for (let k = 0; k < 256; k += 16) {
        ctx.beginPath();
        ctx.moveTo(k, 0);
        ctx.lineTo(k, 512);
        ctx.stroke();
      }
      for (let k = 0; k < 512; k += 16) {
        ctx.beginPath();
        ctx.moveTo(0, k);
        ctx.lineTo(256, k);
        ctx.stroke();
      }
    }),
  );
  // the ink line already drawn: a vertical trace scrolled down the paper
  const pts = 70;
  const geo = useOwned(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < pts - 1; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    return g;
  }, []);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ph = (H * 0.8) / pts;
  for (let i = 0; i < pts; i++) {
    const y = H * 0.4 - i * ph; // from the pen (top) down
    const x = hiss(0, Math.floor(f) - i, 5) * W * 0.18 * amp;
    pos.setXYZ(i * 2, x - 0.003, y, 0);
    pos.setXYZ(i * 2 + 1, x + 0.003, y, 0);
  }
  pos.needsUpdate = true;
  geo.computeBoundingSphere();
  const penX = hiss(0, Math.floor(f), 5) * W * 0.18 * amp;
  return (
    <group position={position} scale={scale}>
      <RBox size={[W + 0.06, H + 0.08, 0.16]} position={[0, 0, -0.08]} color="#6e7a6a" radius={0.02} />
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[W, H * 0.84]} />
        <meshBasicMaterial map={paper} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 0.006]}>
        <mesh geometry={geo}>
          <meshBasicMaterial color="#1a2a8a" side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* the pen arm */}
      <InkBox size={[W, 0.02, 0.02]} position={[0, H * 0.4 + 0.03, 0.02]} color="#3a3e40" ink={0.003} />
      <InkBox size={[0.02, 0.05, 0.02]} position={[penX, H * 0.4 + 0.005, 0.025]} color="#c8302a" ink={0.003} />
    </group>
  );
};

// A big needle meter with a cream face and a red needle jittering about `value` (0..1 across the scale).
export const NoiseMeter: React.FC<{ position: Vec3; f: number; value?: number; scale?: number; text?: string }> = ({ position, f, value = 0.6, scale = 1, text = "NOISE" }) => {
  const face = useOwnedTex(
    () =>
      canvasTexture(256, 192, (ctx) => {
        ctx.fillStyle = "#f4ecd4";
        ctx.fillRect(0, 0, 256, 192);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(128, 170, 120, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI * (1.18 + 0.064 * k);
          ctx.lineWidth = k % 5 ? 3 : 6;
          ctx.beginPath();
          ctx.moveTo(128 + Math.cos(a) * 120, 170 + Math.sin(a) * 120);
          ctx.lineTo(128 + Math.cos(a) * (k % 5 ? 104 : 96), 170 + Math.sin(a) * (k % 5 ? 104 : 96));
          ctx.stroke();
        }
        ctx.fillStyle = "#c8302a";
        ctx.fillRect(128 + 60, 58, 50, 8);
        ctx.fillStyle = INK;
        ctx.font = "900 40px Arial Black, Arial";
        ctx.textAlign = "center";
        ctx.fillText(text, 128, 150);
      }),
    [text],
  );
  const a = Math.PI * (0.18 + 0.64 * (1 - value)) - Math.PI / 2 + 0.04 * hiss(0.5, f, 2);
  return (
    <group position={position} scale={scale}>
      <RBox size={[0.34, 0.27, 0.08]} position={[0, 0, -0.04]} color="#2e3236" radius={0.02} />
      <mesh position={[0, 0.005, 0.002]}>
        <planeGeometry args={[0.3, 0.225]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <group position={[0, -0.095, 0.008]} rotation={[0, 0, a]}>
        <mesh position={[0, 0.07, 0]}>
          <planeGeometry args={[0.007, 0.14]} />
          <meshBasicMaterial color="#c8302a" />
        </mesh>
      </group>
      <Ball position={[0, -0.095, 0.01]} radius={0.012} color="#1e1e22" ink={0} />
    </group>
  );
};

// A grey 19-inch equipment rack with panels, dials, switches and glowing pilot lamps.
export const Rack: React.FC<{ position: Vec3; f: number; height?: number; seed?: number; rotationY?: number }> = ({ position, f, height = 1.5, seed = 1, rotationY = 0 }) => {
  const panels = Math.round(height / 0.22);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[0.58, height, 0.5]} position={[0, height / 2, 0]} color="#7c8686" ink={0.012} />
      {Array.from({ length: panels }, (_, k) => {
        const y = 0.14 + k * 0.22;
        const v = rnd(k, seed);
        return (
          <group key={k} position={[0, y, 0.255]}>
            <InkBox size={[0.52, 0.19, 0.012]} color={v > 0.5 ? "#9aa4a4" : "#8a9494"} ink={0.003} />
            {v > 0.3 &&
              [0, 1, 2].map((j) => (
                <InkCylinder key={j} radius={0.018} height={0.02} position={[-0.17 + j * 0.12, 0.0, 0.012]} rotation={[Math.PI / 2, 0, 0]} color="#1e1e22" ink={0.002} />
              ))}
            {v <= 0.3 && <InkBox size={[0.2, 0.1, 0.01]} position={[-0.08, 0, 0.012]} color="#f2ecd4" ink={0.002} />}
            <mesh position={[0.2, 0.04, 0.012]}>
              <circleGeometry args={[0.012, 10]} />
              <meshBasicMaterial color={new THREE.Color(rnd(k + 2, seed) > 0.5 ? "#ff5a3a" : "#ffd24a").multiplyScalar(1.2 + 0.4 * Math.sin(f * 0.07 + k))} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- tools and small props ----------

export const Bucket: React.FC<{ position: Vec3; rotation?: Vec3; water?: number }> = ({ position, rotation = [0, 0, 0], water = 1 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={0.13} height={0.26} position={[0, 0.13, 0]} color="#9aa0a6" ink={0.008} />
    {water > 0 && (
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 20]} />
        <meshToonMaterial color="#b8d8e4" gradientMap={toonRamp} />
      </mesh>
    )}
    <mesh position={[0, 0.27, 0]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.13, 0.006, 6, 20, Math.PI]} />
      <meshBasicMaterial color={INK} />
    </mesh>
  </group>
);

// A long-handled scrub brush (origin at the grip, the head at -y `len` away).
export const ScrubBrush: React.FC<{ position: Vec3; rotation?: Vec3; len?: number }> = ({ position, rotation = [0, 0, 0], len = 0.9 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={0.014} height={len} position={[0, -len / 2, 0]} color="#c89a5a" ink={0.004} />
    <InkBox size={[0.24, 0.05, 0.08]} position={[0, -len, 0]} color="#6a3e22" ink={0.005} />
    {[-0.09, -0.03, 0.03, 0.09].map((x) => (
      <InkBox key={x} size={[0.04, 0.04, 0.07]} position={[x, -len - 0.04, 0]} color="#e0c890" ink={0.002} />
    ))}
  </group>
);

export const Broom: React.FC<{ position: Vec3; rotation?: Vec3; len?: number }> = ({ position, rotation = [0, 0, 0], len = 1.0 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={0.014} height={len} position={[0, -len / 2, 0]} color="#b8884a" ink={0.004} />
    <Cap a={[0, -len, 0]} b={[0, -len - 0.22, 0]} r={0.08} color="#d8b860" ink={0.006} />
  </group>
);

// A steel flashlight with a beam cone (additive), pointing along +y of its group.
export const Flashlight: React.FC<{ position: Vec3; rotation?: Vec3; beam?: number; length?: number }> = ({ position, rotation = [0, 0, 0], beam = 1, length = 2.2 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={0.025} height={0.18} position={[0, 0.0, 0]} color="#6a6e74" ink={0.004} />
    <InkCylinder radius={0.035} height={0.05} position={[0, 0.1, 0]} color="#8a8e94" ink={0.004} />
    {beam > 0 && (
      <mesh position={[0, 0.12 + length / 2, 0]}>
        <coneGeometry args={[0.26, length, 24, 1, true]} />
        <meshBasicMaterial color="#fff2c0" transparent opacity={0.07 * beam} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    )}
  </group>
);

// A slatted wooden pigeon box with a handle; `open` lifts the lid.
export const PigeonBox: React.FC<{ position: Vec3; rotation?: Vec3; open?: number }> = ({ position, rotation = [0, 0, 0], open = 0 }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.42, 0.26, 0.28]} position={[0, 0.13, 0]} color="#c8a06a" ink={0.008} />
    {[-0.12, -0.04, 0.04, 0.12].map((x) => (
      <InkBox key={x} size={[0.02, 0.18, 0.01]} position={[x, 0.13, 0.145]} color="#3a2a1a" ink={0} />
    ))}
    <group position={[0, 0.26, -0.14]} rotation={[-open * 1.2, 0, 0]}>
      <InkBox size={[0.44, 0.025, 0.3]} position={[0, 0.012, 0.15]} color="#b08a56" ink={0.006} />
    </group>
    <Stick a={[-0.08, 0.27, 0]} b={[-0.08, 0.33, 0]} r={0.008} color="#3a2a1a" ink={0.002} />
    <Stick a={[0.08, 0.27, 0]} b={[0.08, 0.33, 0]} r={0.008} color="#3a2a1a" ink={0.002} />
    <Stick a={[-0.08, 0.33, 0]} b={[0.08, 0.33, 0]} r={0.008} color="#3a2a1a" ink={0.002} />
  </group>
);

// A black 1960s desk telephone (rotary dial); `handset` false leaves the cradle empty.
export const DeskPhone: React.FC<{ position: Vec3; rotationY?: number; handset?: boolean }> = ({ position, rotationY = 0, handset = true }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[0.2, 0.1, 0.22]} position={[0, 0.05, 0]} color="#1e1e22" radius={0.03} />
    <InkCylinder radius={0.05} height={0.012} position={[0, 0.095, 0.06]} rotation={[0.5, 0, 0]} color="#e8e4d8" ink={0.003} />
    <InkBox size={[0.03, 0.04, 0.03]} position={[-0.075, 0.115, -0.05]} color="#1e1e22" ink={0.003} />
    <InkBox size={[0.03, 0.04, 0.03]} position={[0.075, 0.115, -0.05]} color="#1e1e22" ink={0.003} />
    {handset && <Handset position={[0, 0.15, -0.05]} rotation={[0, 0, Math.PI / 2]} />}
  </group>
);
// The handset alone (along its local y: earpiece at +y, mouthpiece at -y), to hold at `handWorld`.
export const Handset: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <RBox size={[0.035, 0.2, 0.035]} position={[0, 0, 0]} color="#1e1e22" radius={0.012} />
    <RBox size={[0.05, 0.05, 0.05]} position={[0.012, 0.1, 0]} color="#1e1e22" radius={0.018} />
    <RBox size={[0.05, 0.05, 0.05]} position={[0.012, -0.1, 0]} color="#1e1e22" radius={0.018} />
  </group>
);

// A wall calendar with a big day number (flip with `appear` on the frame the page changes).
export const WallCalendar: React.FC<{ position: Vec3; month: string; day: string; flip?: number }> = ({ position, month, day, flip = 1 }) => {
  const tex = useOwnedTex(
    () =>
      canvasTexture(256, 320, (ctx) => {
        ctx.fillStyle = "#fbf6e8";
        ctx.fillRect(0, 0, 256, 320);
        ctx.fillStyle = "#b8302a";
        ctx.fillRect(0, 0, 256, 80);
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 54px Arial Black, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(month, 128, 42);
        ctx.fillStyle = INK;
        ctx.font = `900 ${day.length > 3 ? 78 : 120}px Arial Black, Arial`;
        ctx.fillText(day, 128, 205);
      }),
    [month, day],
  );
  return (
    <group position={position}>
      <InkBox size={[0.3, 0.38, 0.012]} position={[0, 0, -0.008]} color="#3a2a1e" ink={0.004} />
      <group rotation={[(1 - flip) * -1.4, 0, 0]} position={[0, 0.18, 0]}>
        <mesh position={[0, -0.18, 0.002]}>
          <planeGeometry args={[0.27, 0.34]} />
          <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

// A tall thermometer on a board: the red column at `level` (0..1), the scale painted on.
export const Thermometer: React.FC<{ position: Vec3; level: number; height?: number }> = ({ position, level, height = 1.2 }) => (
  <group position={position}>
    <InkBox size={[0.26, height + 0.2, 0.04]} position={[0, height / 2, -0.03]} color="#e8eef6" ink={0.012} />
    {Array.from({ length: 11 }, (_, k) => (
      <InkBox key={k} size={[k % 5 ? 0.05 : 0.09, 0.012, 0.005]} position={[0.07, 0.12 + (k / 10) * (height - 0.2), 0]} color={INK} ink={0} />
    ))}
    <InkCylinder radius={0.03} height={height - 0.1} position={[0, height / 2 + 0.05, 0.01]} color="#f8fbff" ink={0.006} />
    <InkCylinder radius={0.018} height={Math.max(0.02, level * (height - 0.2))} position={[0, 0.1 + (Math.max(0.02, level * (height - 0.2))) / 2, 0.03]} color="#e03030" ink={0} />
    <Ball position={[0, 0.08, 0.02]} radius={0.07} color="#e03030" ink={0.01} />
  </group>
);

// The "universe" box for the pivot: a cutaway room whose side walls slide apart with `stretch` (0..1) while its glow
// cools from white-hot to a dim red-brown (`cool` 0..1). Origin on its floor centre.
export const UniverseBox: React.FC<{ position: Vec3; stretch: number; cool: number; f: number }> = ({ position, stretch, cool, f }) => {
  const w = 0.9 + stretch * 1.2;
  const hot = new THREE.Color("#fff2b0").lerp(new THREE.Color("#ff8a2a"), Math.min(1, cool * 1.6)).lerp(new THREE.Color("#6a1e2a"), Math.min(1, Math.max(0, cool * 1.6 - 0.6)));
  const k = 1.0 - cool * 0.55;
  return (
    <group position={position}>
      <InkBox size={[w + 0.2, 0.08, 0.9]} position={[0, 0.04, 0]} color="#3a4a7a" ink={0.012} />
      <InkBox size={[w + 0.2, 0.9, 0.06]} position={[0, 0.5, -0.45]} color="#2a3460" ink={0.012} />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.06, 0.9, 0.9]} position={[s * (w / 2 + 0.07), 0.5, 0]} color="#4a5a8a" ink={0.012} />
      ))}
      {/* the glow: the inside of the box lit like a furnace, a soft halo spilling out */}
      <mesh position={[0, 0.5, -0.41]}>
        <planeGeometry args={[w, 0.84]} />
        <meshBasicMaterial color={hot.clone().multiplyScalar(0.7 + 0.5 * k)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.84]} />
        <meshBasicMaterial color={hot.clone().multiplyScalar(0.5 + 0.3 * k)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.5, 0.3]} color={hot} intensity={3 * k} distance={3} />
      {Array.from({ length: 26 }, (_, i) => {
        const x = (rnd(i, 3) - 0.5) * (w - 0.1);
        const y = 0.15 + ((rnd(i + 1, 3) + f * 0.004 * (1 + rnd(i, 7))) % 1) * 0.7;
        return (
          <mesh key={i} position={[x, y, 0.05 + rnd(i + 2, 3) * 0.2]}>
            <circleGeometry args={[0.012 + rnd(i + 3, 3) * 0.012, 6]} />
            <meshBasicMaterial color={hot.clone().multiplyScalar(k)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// A model horn antenna on a small turntable (for the truth room and the Princeton bench), aperture toward +z at az 0.
export const ModelHorn: React.FC<{ position: Vec3; az?: number; scale?: number }> = ({ position, az = 0, scale = 1 }) => {
  const c: Mat = { color: "#c8ced4" };
  const d: Mat = { color: "#4a5450" };
  return (
    <group position={position} scale={scale}>
      <InkCylinder radius={0.22} height={0.05} position={[0, 0.025, 0]} color="#5a5e66" ink={0.008} />
      <group rotation={[0, az, 0]}>
        <group position={[-0.25, 0.26, 0]}>
          <Slab pts={[[0, 0.03, -0.03], [0.4, 0.12, -0.12], [0.4, 0.12, 0.12], [0, 0.03, 0.03]]} outer={c} inner={d} out={[0, 1, 0]} thick={0.01} ink={0.005} />
          <Slab pts={[[0, -0.03, -0.03], [0.4, -0.12, -0.12], [0.4, -0.12, 0.12], [0, -0.03, 0.03]]} outer={c} inner={d} out={[0, -1, 0]} thick={0.01} ink={0.005} />
          <Slab pts={[[0, -0.03, -0.03], [0.4, -0.12, -0.12], [0.4, 0.12, -0.12], [0, 0.03, -0.03]]} outer={c} inner={d} out={[0, 0, -1]} thick={0.01} ink={0.005} />
          <Slab pts={[[0, -0.03, 0.03], [0.4, -0.12, 0.12], [0.4, 0.12, 0.12], [0, 0.03, 0.03]]} outer={c} inner={d} out={[0, 0, 1]} thick={0.01} ink={0.005} />
          <Slab pts={[[0.4, -0.12, -0.12], [0.62, -0.12, 0.12], [0.62, 0.12, 0.12], [0.4, 0.12, -0.12]]} outer={c} inner={d} out={[1, 0, -1]} thick={0.01} ink={0.005} />
        </group>
        <Stick a={[0, 0.05, 0]} b={[0, 0.16, 0]} r={0.02} color="#5a5e66" ink={0.004} />
      </group>
    </group>
  );
};

// ---------- costume overlays: narrow ties, white bow ties, collar points ----------
// The kit has no tie, so these ride on the card like xray-hand's CostumeOverlays: the same live pose Stage draws, the
// card's yaw and lean-back tilt, the chest point moved with the body.

const K = 1.3 / 1060;
const rot = (p: [number, number], deg: number, c: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};
const bodyPoint = (pose: PuppetPose, pt: [number, number]): { p: [number, number]; roll: number } => {
  const air = pose.air ?? 0;
  const bob = pose.bob ?? 0;
  const crouch = Math.max(0, Math.min(1, pose.crouch ?? 0));
  const bend = Math.max(0, Math.min(1, pose.bend ?? 0));
  const slump = pose.slump ?? 0;
  const k = 1 - 0.55 * bend;
  const lean = pose.lean ?? 0;
  let p: [number, number] = [pt[0], pt[1] + slump * 20 + (pt[1] < -280 ? (-280 - pt[1]) * (1 - k) * 0.6 : 0)];
  p = rot(p, lean, [0, -280]);
  p = [p[0], p[1] + bob + crouch * 150 - air];
  return { p, roll: lean };
};

export type Overlay = { tie?: string; bow?: boolean; collar?: string };

export const CostumeOverlays: React.FC<{ cast: PuppetPlacement[]; looks: Record<string, Overlay>; energy?: number }> = ({ cast, looks, energy = 1 }) => {
  const f = useShotFrame();
  const speech = useSpeech();
  const camera = useThree((s) => s.camera);
  return (
    <group userData={{ ghost: true, audit: false }}>
      {cast
        .filter((p) => looks[p.id])
        .map((p) => {
          const o = looks[p.id];
          const said = speech(p.id);
          const pose0 = said === null ? p.pose : { ...p.pose, mouthOpen: said.mouth, viseme: said.viseme };
          const live = livenPose(pose0, p.at, p.id, f, energy, said);
          const [x, z] = live.at;
          const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
          const pose = turnToCamera(live.pose, yaw);
          if ((pose.lie ?? 0) > 0 || pose.view === "back" || pose.view === "side" || pose.sit || (pose.seat ?? 0) > 0.3) return null;
          const tilt = cardTilt([camera.position.x, camera.position.y, camera.position.z], live.at);
          const neck = bodyPoint(pose, [0, -585]);
          const air = (pose.air ?? 0) * K;
          return (
            <group key={p.id} position={[x, 0, z]}>
              <group rotation={[0, yaw, 0]}>
                <group rotation={[-tilt, 0, 0]}>
                  <group position={[neck.p[0] * K, -neck.p[1] * K + air * 0, 0.04]} rotation={[0, 0, (-neck.roll * Math.PI) / 180]}>
                    {o.collar &&
                      [-1, 1].map((sx) => (
                        <mesh key={sx} position={[sx * 0.04, -0.012, 0.001]} rotation={[0, 0, sx * 0.55]}>
                          <planeGeometry args={[0.05, 0.035]} />
                          <meshToonMaterial color={o.collar} gradientMap={toonRamp} />
                        </mesh>
                      ))}
                    {o.tie && (
                      <group position={[0, -0.02, 0.003]}>
                        <mesh position={[0, -0.008, 0]}>
                          <planeGeometry args={[0.03, 0.026]} />
                          <meshBasicMaterial color={o.tie} />
                        </mesh>
                        <mesh position={[0, -0.1, 0]}>
                          <planeGeometry args={[0.026, 0.17]} />
                          <meshBasicMaterial color={o.tie} />
                        </mesh>
                        <mesh position={[0, -0.188, 0]} rotation={[0, 0, Math.PI / 4]}>
                          <planeGeometry args={[0.0185, 0.0185]} />
                          <meshBasicMaterial color={o.tie} />
                        </mesh>
                      </group>
                    )}
                    {o.bow && (
                      <group position={[0, -0.02, 0.004]}>
                        {[-1, 1].map((sx) => (
                          <mesh key={sx} position={[sx * 0.026, 0, 0]} rotation={[0, 0, sx * -0.2]}>
                            <circleGeometry args={[0.024, 3]} />
                            <meshBasicMaterial color="#fbfbf6" />
                          </mesh>
                        ))}
                        <mesh>
                          <circleGeometry args={[0.012, 10]} />
                          <meshBasicMaterial color="#e8e8e0" />
                        </mesh>
                      </group>
                    )}
                  </group>
                </group>
              </group>
            </group>
          );
        })}
    </group>
  );
};

// ---------- inside the horn: a tunnel of riveted plates narrowing away along -z to the glowing throat ----------

export const TUNNEL = { near: 3, far: -7, w0: 1.6, h0: 3.0, w1: 0.32, h1: 0.62 } as const;
export const tunnelHalf = (z: number) => TUNNEL.w1 + ((TUNNEL.w0 - TUNNEL.w1) * (z - TUNNEL.far)) / (TUNNEL.near - TUNNEL.far);
export const tunnelTop = (z: number) => TUNNEL.h1 + ((TUNNEL.h0 - TUNNEL.h1) * (z - TUNNEL.far)) / (TUNNEL.near - TUNNEL.far);

export const InsideHornSet: React.FC<{ camera: CameraShot; frame: number; bright?: number; dirt?: number; dusk?: boolean; children?: React.ReactNode }> = ({ camera, frame, bright = 0, dirt = 1, dusk = false, children }) => {
  const { near, far, w0, h0, w1, h1 } = TUNNEL;
  const tex = useOwnedTex(() => {
    const t = panelCanvas(true, 9);
    return t;
  });
  const floorTex = useOwnedTex(() => panelCanvas(true, 13));
  const poo = useOwnedTex(() => droppingsCanvas(8));
  const pooFine = useOwnedTex(() => {
    const t = droppingsCanvas(12);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.5, 3);
    return t;
  });
  const m: Mat = { color: bright > 0.5 ? "#e4ecee" : "#ffffff", map: tex };
  const fm: Mat = { color: "#ffffff", map: floorTex };
  const bg = bright > 0.5 ? "#c8d4d4" : dusk ? "#1a1416" : "#0e1a1a";
  const haze = useOwnedTex(() =>
    canvasTexture(256, 256, (ctx) => {
      const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
      g.addColorStop(0, "rgba(255,226,160,0.9)");
      g.addColorStop(0.35, "rgba(255,200,120,0.35)");
      g.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }),
  );
  if (dusk) {
    return (
      <>
        <CameraRig {...camera} />
        <color attach="background" args={[bg]} />
        <ambientLight intensity={0.45} color="#c8c0c8" />
        <hemisphereLight args={["#e8d8d0", "#2a2428", 0.4]} />
        {/* low dusk sun pouring in through the mouth behind the camera */}
        <directionalLight position={[2.5, 1.2, 8]} intensity={1.25} color="#ffd8b8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
        <pointLight position={[0.6, 0.8, near + 0.4]} color="#ffd0b0" intensity={1.6} distance={8} decay={1.1} />
        <Slab pts={[[-w0, 0, near], [w0, 0, near], [w1, 0, far], [-w1, 0, far]]} outer={fm} out={[0, -1, 0]} thick={0.06} />
        <Slab pts={[[-w0, h0, near], [w0, h0, near], [w1, h1, far], [-w1, h1, far]]} outer={m} out={[0, 1, 0]} thick={0.06} />
        <Slab pts={[[-w0, 0, near], [-w0, h0, near], [-w1, h1, far], [-w1, 0, far]]} outer={m} out={[-1, 0, 0]} thick={0.06} />
        <Slab pts={[[w0, 0, near], [w0, h0, near], [w1, h1, far], [w1, 0, far]]} outer={m} out={[1, 0, 0]} thick={0.06} />
        {[1.6, 0, -1.6, -3.2, -4.8].map((z) => {
          const w = tunnelHalf(z) - 0.03;
          const h = tunnelTop(z) - 0.03;
          return (
            <group key={z}>
              <Stick a={[-w, 0.02, z]} b={[-w, h, z]} r={0.03} color="#5a5450" ink={0.005} />
              <Stick a={[w, 0.02, z]} b={[w, h, z]} r={0.03} color="#5a5450" ink={0.005} />
              <Stick a={[-w, h, z]} b={[w, h, z]} r={0.03} color="#5a5450" ink={0.005} />
            </group>
          );
        })}
        {/* the throat: a faint warm glow and haze where the walls meet, so the eye goes down the horn */}
        <mesh position={[0, h1 / 2, far + 0.05]}>
          <planeGeometry args={[w1 * 1.8, h1 * 0.9]} />
          <meshBasicMaterial color={new THREE.Color("#ffd890").multiplyScalar(1.05 + 0.08 * Math.sin(frame * 0.07))} toneMapped={false} />
        </mesh>
        <mesh position={[0, h1 / 2, far + 0.4]}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial map={haze} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <pointLight position={[0, h1 / 2, far + 0.8]} color="#ffcf88" intensity={2.2} distance={5} decay={1.3} />
        {dirt > 0.01 && (
          <mesh position={[0, 0.035, 1.2]} rotation={[-Math.PI / 2, 0, 0.4]}>
            <planeGeometry args={[2.6, 3.2]} />
            <meshBasicMaterial map={pooFine} transparent opacity={dirt * 0.9} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
        {children}
      </>
    );
  }
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.25 + bright * 0.9} color={bright > 0.5 ? "#f4fbff" : "#6a9a90"} />
      <hemisphereLight args={[bright > 0.5 ? "#ffffff" : "#5a8a80", "#202a28", 0.25 + bright * 0.5]} />
      <directionalLight position={[1.5, 4, 6]} intensity={0.35 + bright * 1.4} color={bright > 0.5 ? "#fffaf0" : "#9ac8c0"} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0004} />
      {/* the mouth behind the camera lets in the day */}
      <pointLight position={[0, 2.2, near + 0.5]} color={bright > 0.5 ? "#ffffff" : "#d8f0e8"} intensity={1.5 + bright * 2.5} distance={10} decay={1.1} />
      <Slab pts={[[-w0, 0, near], [w0, 0, near], [w1, 0, far], [-w1, 0, far]]} outer={fm} out={[0, -1, 0]} thick={0.06} />
      <Slab pts={[[-w0, h0, near], [w0, h0, near], [w1, h1, far], [-w1, h1, far]]} outer={m} out={[0, 1, 0]} thick={0.06} />
      <Slab pts={[[-w0, 0, near], [-w0, h0, near], [-w1, h1, far], [-w1, 0, far]]} outer={m} out={[-1, 0, 0]} thick={0.06} />
      <Slab pts={[[w0, 0, near], [w0, h0, near], [w1, h1, far], [w1, 0, far]]} outer={m} out={[1, 0, 0]} thick={0.06} />
      {/* ribs round the tunnel every 1.6 m */}
      {[1.6, 0, -1.6, -3.2, -4.8].map((z) => {
        const w = tunnelHalf(z) - 0.03;
        const h = tunnelTop(z) - 0.03;
        return (
          <group key={z}>
            <Stick a={[-w, 0.02, z]} b={[-w, h, z]} r={0.03} color="#5a6a66" ink={0.005} />
            <Stick a={[w, 0.02, z]} b={[w, h, z]} r={0.03} color="#5a6a66" ink={0.005} />
            <Stick a={[-w, h, z]} b={[w, h, z]} r={0.03} color="#5a6a66" ink={0.005} />
          </group>
        );
      })}
      {/* the throat: the receiver's glow at the far end */}
      <mesh position={[0, h1 / 2, far + 0.05]}>
        <planeGeometry args={[w1 * 1.8, h1 * 0.9]} />
        <meshBasicMaterial color={new THREE.Color("#ffd890").multiplyScalar(1.3)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, h1 / 2, far + 0.6]} color="#ffd890" intensity={2.5} distance={6} decay={1.2} />
      {dirt > 0.01 && (
        <mesh position={[0.4, 0.035, -1.2]} rotation={[-Math.PI / 2, 0, 0.4]}>
          <planeGeometry args={[2.0, 2.2]} />
          <meshBasicMaterial map={poo} transparent opacity={dirt} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {children}
    </>
  );
};

// A round desk clock on a little foot; `hours` turns the hands (1 = one full turn of the hour hand: 12 hours).
export const DeskClock: React.FC<{ position: Vec3; hours: number; scale?: number }> = ({ position, hours, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.08, 0.03, 0.06]} position={[0, 0.015, 0]} color="#3a3e40" ink={0.004} />
    <group position={[0, 0.12, 0]}>
      <InkCylinder radius={0.09} height={0.03} rotation={[Math.PI / 2, 0, 0]} color="#2e3236" ink={0.006} />
      <mesh position={[0, 0, 0.017]}>
        <circleGeometry args={[0.078, 32]} />
        <meshBasicMaterial color="#f4ecd4" toneMapped={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, k) => (
        <mesh key={k} position={[Math.sin((k / 12) * Math.PI * 2) * 0.064, Math.cos((k / 12) * Math.PI * 2) * 0.064, 0.019]}>
          <circleGeometry args={[k % 3 ? 0.004 : 0.007, 8]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
      <group position={[0, 0, 0.021]} rotation={[0, 0, -hours * Math.PI * 2]}>
        <mesh position={[0, 0.02, 0]}>
          <planeGeometry args={[0.008, 0.045]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      </group>
      <group position={[0, 0, 0.022]} rotation={[0, 0, -hours * Math.PI * 24]}>
        <mesh position={[0, 0.03, 0]}>
          <planeGeometry args={[0.005, 0.062]} />
          <meshBasicMaterial color="#c8302a" />
        </mesh>
      </group>
    </group>
  </group>
);

// A faint mottled microwave glow over the whole night sky (the cosmic background drawn as soft warm and cool blotches,
// like the famous all-sky maps), on a dome that rides with the camera.
const CmbSky: React.FC<{ frame: number }> = ({ frame }) => {
  const tex = useOwnedTex(() => {
    const t = canvasTexture(1024, 512, (ctx) => {
      ctx.clearRect(0, 0, 1024, 512);
      for (let i = 0; i < 1400; i++) {
        const x = rnd(i, 41) * 1024;
        const y = rnd(i + 1, 41) * 512;
        const r = 6 + rnd(i + 2, 41) * 16;
        const v = rnd(i + 3, 41);
        const c = v > 0.6 ? "255,150,80" : v > 0.3 ? "255,90,90" : "90,140,255";
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${c},0.2)`);
        g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
  return (
    <mesh rotation={[0, frame * 0.0004, 0]} renderOrder={-9}>
      <sphereGeometry args={[260, 48, 24]} />
      <meshBasicMaterial map={tex} transparent side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
};

// The pivot's "early universe": a glowing patch on a stretching grid. `stretch` 0..1 widens the grid cells (space
// stretching), `cool` 0..1 runs the patch through white, yellow, orange, deep red to almost dark. Origin at the grid's
// bottom centre, facing +z.
const COOL_STOPS = ["#fff4d0", "#ffe070", "#ff9a30", "#c8302a", "#4a1420"];
export const coolColor = (cool: number) => {
  const t = Math.min(0.9999, Math.max(0, cool)) * (COOL_STOPS.length - 1);
  const i = Math.floor(t);
  return new THREE.Color(COOL_STOPS[i]).lerp(new THREE.Color(COOL_STOPS[i + 1]), t - i);
};
export const CoolingPatch: React.FC<{ position: Vec3; stretch: number; cool: number; f: number }> = ({ position, stretch, cool, f }) => {
  const s = 1 + 1.2 * stretch;
  const grid = useOwnedTex(() => {
    const t = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = "#16204a";
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = "rgba(150,190,255,0.55)";
      ctx.lineWidth = 4;
      for (let k = 0; k <= 8; k++) {
        ctx.beginPath();
        ctx.moveTo(k * 64, 0);
        ctx.lineTo(k * 64, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, k * 64);
        ctx.lineTo(512, k * 64);
        ctx.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  // the grid board keeps its size; its cells widen as space stretches (fewer, bigger squares)
  grid.repeat.set(1.6 / s, 1.6 / s);
  grid.offset.set(0.5 - 0.8 / s, 0.5 - 0.8 / s);
  const c = coolColor(cool);
  const glow = 1 - 0.75 * cool;
  const r = 0.13 + 0.1 * stretch;
  return (
    <group position={position}>
      <InkBox size={[1.5, 1.1, 0.04]} position={[0, 0.55, -0.03]} color="#ffffff" map={grid} ink={0.012} />
      <group position={[0, 0.55, 0.06]}>
        <mesh>
          <circleGeometry args={[r * 1.7, 40]} />
          <meshBasicMaterial color={c.clone().multiplyScalar(0.8)} transparent opacity={0.35 * glow + 0.1} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[r * (1 + 0.03 * Math.sin(f * 0.2)), 40]} />
          <meshBasicMaterial color={c.clone().multiplyScalar(0.85)} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.005]}>
          <ringGeometry args={[r, r + 0.012, 40]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      </group>
    </group>
  );
};

// Foreground pieces for frame corners (small, at >= 1.1 m from the lens).
export const PaperRolls: React.FC = () => (
  <group>
    <InkBox size={[0.3, 0.04, 0.2]} position={[0, -0.02, 0]} color="#5a4a3a" ink={0.005} />
    {[-0.08, 0.0, 0.08].map((x, i) => (
      <InkCylinder key={x} radius={0.035} height={0.22} position={[x, 0.035 + (i === 1 ? 0.06 : 0), 0]} rotation={[0, 0, Math.PI / 2]} color="#f2ecd8" ink={0.004} />
    ))}
  </group>
);
export const BookStack: React.FC = () => (
  <group>
    {["#7a2a2a", "#2a4a6a", "#4a5a2a"].map((c, i) => (
      <InkBox key={c} size={[0.24 - i * 0.02, 0.05, 0.17]} position={[0, 0.025 + i * 0.052, 0]} rotation={[0, 0.12 * i, 0]} color={c} ink={0.004} />
    ))}
  </group>
);
export const Vase: React.FC = () => (
  <group>
    <InkCylinder radius={0.06} height={0.2} position={[0, 0.1, 0]} color="#e8dcc0" ink={0.005} />
    {[-0.04, 0, 0.04].map((x, i) => (
      <group key={x}>
        <InkCylinder radius={0.005} height={0.18} position={[x * 0.6, 0.28, 0]} rotation={[0, 0, -x * 3]} color="#3a6a2a" ink={0} />
        <Ball position={[x * 1.4, 0.37 + (i === 1 ? 0.03 : 0), 0]} radius={0.035} color={i === 1 ? "#f4f0e8" : "#e8c040"} />
      </group>
    ))}
  </group>
);
