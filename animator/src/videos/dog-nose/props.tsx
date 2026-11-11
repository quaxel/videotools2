import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, toonRamp, Vec3 } from "../../engine";
import { rnd } from "../pisces-sign/props";
import { Ball, Cyl, RBox, soft } from "../../three/primitives";

// Props and characters for "You Wake Up With a Dog's Nose": scent ribbons and the smells at their ends, the dogs
// (Rocky the deadpan judge, Max, Bella), the sock monster, feed cards, wheelie bins.

const INK = "#161212";
const FONT = "'Arial Black', Impact, sans-serif";
const V = THREE.Vector3;

export const ease = (p: number) => {
  const q = Math.min(1, Math.max(0, p));
  return q * q * (3 - 2 * q);
};
// x mod 1, positive for negative frames too (shots run at negative frames while they whip in)
export const frac = (x: number) => x - Math.floor(x);
const glow = (c: string, k: number) => new THREE.Color(c).multiplyScalar(k);

// Frees a geometry made for one frame when the next one replaces it.
const useFrameGeometry = (make: () => THREE.BufferGeometry, deps: unknown[]) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, deps);
  useEffect(() => () => g.dispose(), [g]);
  return g;
};

// ---------- soft shapes ----------

// RBox, Cyl, soft and Ball moved to the kit (src/three/primitives.tsx); re-exported here for older imports.
export { Ball, Cyl, RBox, soft } from "../../three/primitives";

// ---------- capsules ----------

// A smooth capsule from `a` to `b` with an ink hull: limbs, socks, bones, brows.
export const Cap: React.FC<{ a: Vec3; b: Vec3; r: number; color: string; ink?: number; emissive?: string; glowK?: number }> = ({ a, b, r, color, ink = 0, emissive, glowK = 0 }) => {
  const va = new V(...a);
  const vb = new V(...b);
  const len = Math.max(0.0001, va.distanceTo(vb));
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new V(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <group position={mid.toArray()} quaternion={q}>
      <mesh castShadow>
        <capsuleGeometry args={[r, len, 8, 18]} />
        {soft(color, 0.6, emissive, glowK)}
      </mesh>
      {ink > 0 && (
        <mesh>
          <capsuleGeometry args={[r + ink, len, 6, 14]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

// ---------- scent ribbons ----------

// A tapered tube along a curve, built with parallel-transport frames so it never twists. `r(t)` gives the radius.
const tube = (curve: THREE.Curve<THREE.Vector3>, t1: number, n: number, radial: number, r: (t: number) => number) => {
  const pos: number[] = [];
  const idx: number[] = [];
  let normal = new V(0, 1, 0);
  const T0 = curve.getTangentAt(0);
  if (Math.abs(T0.dot(normal)) > 0.9) normal = new V(1, 0, 0);
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * t1;
    const p = curve.getPointAt(t);
    const T = curve.getTangentAt(t);
    normal = normal.sub(T.clone().multiplyScalar(normal.dot(T))).normalize();
    const B = new V().crossVectors(T, normal);
    const rad = r(i / n);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const d = normal.clone().multiplyScalar(Math.cos(a)).add(B.clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + d.x * rad, p.y + d.y * rad, p.z + d.z * rad);
    }
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// A flowing scent ribbon: an inked, glowing tube that wiggles, swells in waves running from the source toward the
// end, and carries sparkles. `grow` 0..1 draws it out from the first point. Smells: coffee brown, pizza orange,
// socks green, chicken gold.
export const ScentRibbon: React.FC<{
  points: Vec3[];
  f: number;
  color: string;
  radius?: number;
  wobble?: number;
  grow?: number;
  seed?: number;
  glowK?: number;
  sparkles?: number;
  speed?: number;
}> = ({ points, f, color, radius = 0.05, wobble = 0.08, grow = 1, seed = 0, glowK = 0.55, sparkles = 7, speed = 1 }) => {
  const g1 = Math.max(0.02, Math.min(1, grow));
  const key = points.flat().join(",");
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        points.map((p, i) => {
          const w = i === 0 ? 0 : wobble;
          return new V(p[0] + Math.sin(f * 0.07 * speed + i * 1.9 + seed) * w, p[1] + Math.sin(f * 0.09 * speed + i * 2.3 + seed * 2) * w, p[2] + Math.cos(f * 0.06 * speed + i * 1.3 + seed) * w * 0.6);
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, f, wobble, seed, speed],
  );
  const env = (t: number) => Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)), 0.55);
  const wave = (t: number) => 1 + 0.32 * Math.sin(t * 22 * g1 - f * 0.32 * speed + seed);
  const body = useFrameGeometry(() => tube(curve, g1, 90, 12, (t) => radius * env(t) * wave(t)), [curve, g1, radius]);
  const hull = useFrameGeometry(() => tube(curve, g1, 90, 12, (t) => radius * env(t) * wave(t) * 1.7 + 0.004), [curve, g1, radius]);
  return (
    <group userData={{ ghost: true }}>
      <mesh geometry={body}>
        <meshStandardMaterial color={color} roughness={0.35} emissive={color} emissiveIntensity={glowK} transparent opacity={0.92} />
      </mesh>
      {/* soft glow shell round it */}
      <mesh geometry={hull}>
        <meshBasicMaterial color={glow(color, 1.1)} toneMapped={false} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
      </mesh>
      {Array.from({ length: sparkles }, (_, k) => {
        const t = frac(f * 0.012 * speed + k / sparkles + rnd(k + seed * 7) * 0.1) * g1;
        const p = curve.getPointAt(Math.min(1, t));
        const s = 0.5 + 0.5 * Math.sin(f * 0.4 + k * 2);
        return <Ball key={k} position={[p.x + (rnd(k + 3) - 0.5) * radius * 2.4, p.y + (rnd(k + 9) - 0.5) * radius * 2.4, p.z]} radius={radius * (0.22 + 0.25 * s)} color={glow("#fffbe8", 1.6).getStyle()} glow />;
      })}
    </group>
  );
};

// Little stink lines: wavy inked strokes rising from a point (socks, trash).
export const StinkLines: React.FC<{ at: Vec3; f: number; color?: string; count?: number; height?: number; spread?: number }> = ({ at, f, color = "#8fdc3a", count = 3, height = 0.45, spread = 0.22 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, k) => {
      const x = at[0] + (k - (count - 1) / 2) * spread;
      const pts: Vec3[] = [0, 0.33, 0.66, 1].map((u) => [x + Math.sin(u * 6 + f * 0.15 + k) * 0.04, at[1] + u * height, at[2] + (k % 2) * 0.03]);
      return <ScentRibbon key={k} points={pts} f={f} color={color} radius={0.016} wobble={0.015} seed={k * 3} sparkles={0} glowK={0.35} grow={frac(f * 0.02 + k * 0.3) * 0.5 + 0.6} />;
    })}
  </group>
);

// ---------- the smells ----------

export const CoffeeMug: React.FC<{ position: Vec3; scale?: number; rotation?: Vec3 }> = ({ position, scale = 1, rotation = [0, 0, 0] }) => (
  <group position={position} scale={scale} rotation={rotation}>
    <InkCylinder radius={0.06} height={0.12} position={[0, 0.06, 0]} color="#f4f1ea" ink={0.006} />
    <InkCylinder radius={0.052} height={0.01} position={[0, 0.115, 0]} color="#5a3216" ink={0} />
    <mesh position={[0.065, 0.065, 0]} rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[0.03, 0.01, 8, 16, Math.PI]} />
      <meshToonMaterial color="#f4f1ea" gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.12, 0.025, 0.002]} position={[0, 0.06, 0.061]} color="#e0533a" ink={0} />
  </group>
);

export const PizzaSlice: React.FC<{ position: Vec3; scale?: number; rotation?: Vec3; bite?: boolean }> = ({ position, scale = 1, rotation = [0, 0, 0], bite }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.2);
    s.lineTo(-0.11, -0.05);
    s.quadraticCurveTo(0, -0.09, 0.11, -0.05);
    s.lineTo(0, 0.2);
    return s;
  }, []);
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh castShadow>
        <extrudeGeometry args={[shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3 }]} />
        <meshStandardMaterial color="#ffc23d" roughness={0.35} />
      </mesh>
      {/* cheese drips over the sides */}
      {[[-0.07, 0.0], [0.075, 0.02], [-0.03, -0.06]].map(([x, y], i) => (
        <Ball key={i} position={[x, y, 0.04]} radius={0.016} color="#ffd75a" scale={[1, 1.8, 0.6]} rough={0.3} />
      ))}
      {/* crust */}
      <Cap a={[-0.115, -0.06, 0.02]} b={[0.115, -0.06, 0.02]} r={0.03} color="#d9893a" />
      {[-0.08, -0.02, 0.05, 0.09].map((x) => (
        <Ball key={x} position={[x, -0.055, 0.045]} radius={0.014} color="#e8a050" rough={0.5} />
      ))}
      {[
        [-0.03, 0.0],
        [0.04, -0.02],
        [0.0, 0.08],
        [-0.05, -0.04],
      ].map(([x, y], i) => (
        <Ball key={i} position={[x, y, 0.04]} radius={0.024} color="#c8302a" rough={0.3} scale={[1, 1, 0.45]} />
      ))}
      {bite && <Ball position={[0.0, 0.2, 0.01]} radius={0.04} color="#ffc23d" scale={[1, 1, 0.5]} />}
    </group>
  );
};

// A drumstick: a plump crispy meat end, a long pale bone and two big knobs, so it reads in silhouette.
// `gold` makes it the glowing hero of the chase.
export const Drumstick: React.FC<{ position: Vec3; scale?: number; rotation?: Vec3; gold?: boolean; f?: number }> = ({ position, scale = 1, rotation = [0, 0, 0], gold, f = 0 }) => {
  const meat = gold ? "#d9862a" : "#c9741f";
  const k = gold ? 0.28 + 0.08 * Math.sin(f * 0.3) : 0;
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 0.12, 0]} scale={[1, 1.3, 1]} castShadow>
        <sphereGeometry args={[0.12, 32, 24]} />
        <meshStandardMaterial color={meat} roughness={0.45} emissive={gold ? "#ff9a00" : "#000"} emissiveIntensity={k} />
      </mesh>
      {/* glossy highlights on the skin */}
      <Ball position={[-0.05, 0.19, 0.08]} radius={0.025} color={gold ? "#fff6c8" : "#f2c08a"} rough={0.2} scale={[1, 1.6, 0.6]} />
      {gold && (
        <mesh position={[0, 0.12, 0]} scale={[1.25, 1.55, 1.25]}>
          <sphereGeometry args={[0.12, 20, 16]} />
          <meshBasicMaterial color={glow("#ffb000", 1.0)} toneMapped={false} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      <Cap a={[0, -0.0, 0]} b={[0, -0.26, 0]} r={0.032} color="#ffffff" />
      <Ball position={[-0.036, -0.29, 0]} radius={0.044} color="#ffffff" rough={0.4} />
      <Ball position={[0.036, -0.29, 0]} radius={0.044} color="#ffffff" rough={0.4} />
    </group>
  );
};

// A sock: ribbed cuff, leg, a rounded heel and a foot ending in a round toe, with a stripe band and coloured
// heel/toe patches. Lies along +x from `at` (the cuff end), turned by `dir`, the leg tipped up by `tilt`.
export const Sock: React.FC<{ at: Vec3; color: string; dir?: number; tilt?: number; leg?: number; stripe?: string }> = ({ at, color, dir = 0, tilt = 1.2, leg = 0.18, stripe }) => {
  const patch = new THREE.Color(color).multiplyScalar(0.82).getStyle();
  const r = 0.045;
  return (
    <group position={at} rotation={[0, dir, 0]} scale={[1, 0.62, 1.25]}>
      {/* knit fabric lies flat: the whole sock is squashed. The leg rises from the heel toward the cuff */}
      <group rotation={[0, 0, Math.PI / 2 - tilt]}>
        <Cap a={[0, 0, 0]} b={[0, leg, 0]} r={r} color={color} />
        {stripe && <Cap a={[0, leg * 0.55, 0]} b={[0, leg * 0.68, 0]} r={r + 0.003} color={stripe} />}
        <mesh position={[0, leg + 0.02, 0]}>
          <torusGeometry args={[r * 0.92, r * 0.34, 10, 20]} />
          {soft(color, 0.95)}
        </mesh>
        <mesh position={[0, leg + 0.025, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[r * 0.6, 16]} />
          <meshBasicMaterial color="#2a1f1a" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Ball position={[-0.012, -0.004, 0]} radius={r * 1.02} color={patch} rough={0.95} scale={[1, 0.8, 1]} />
      <Cap a={[0, 0, 0]} b={[0.13, -0.008, 0]} r={r * 0.95} color={color} />
      <Ball position={[0.15, -0.008, 0]} radius={r * 0.98} color={patch} rough={0.95} scale={[1.15, 0.75, 1]} />
    </group>
  );
};

const SOCK_COLORS: [string, string | undefined][] = [
  ["#f2f2ea", "#e0533a"],
  ["#3b3f4a", undefined],
  ["#f2f2ea", "#2f6fd8"],
  ["#d84a8c", "#ffd23f"],
  ["#c8c0ae", undefined],
  ["#5a8a3a", "#f2f2ea"],
  ["#f2f2ea", undefined],
  ["#e8b04a", "#3b3f4a"],
];

// A heap of dirty socks round a point on the floor, with grubby green tint and flies.
export const SockPile: React.FC<{ position: Vec3; f: number; count?: number; flies?: boolean }> = ({ position, f, count = 14, flies = true }) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => {
      const a = rnd(i + 2) * Math.PI * 2;
      const d = Math.sqrt(rnd(i + 30)) * 0.26;
      const h = Math.max(0.0, 0.1 - d * 0.3) * rnd(i + 60) + 0.03;
      const [c, s] = SOCK_COLORS[i % SOCK_COLORS.length];
      return <Sock key={i} at={[Math.cos(a) * d, h, Math.sin(a) * d]} color={c} stripe={s} dir={rnd(i + 5) * 6.3} tilt={0.5 + rnd(i + 8) * 0.9} leg={0.2} />;
    })}
    {/* grime under the pile */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <circleGeometry args={[0.36, 32]} />
      <meshBasicMaterial color="#6f8a2a" transparent opacity={0.35} depthWrite={false} />
    </mesh>
    {flies &&
      Array.from({ length: 4 }, (_, k) => {
        const a = f * (0.11 + k * 0.02) + k * 1.6;
        return (
          <group key={k} position={[Math.cos(a) * (0.25 + k * 0.04), 0.35 + Math.sin(f * 0.21 + k) * 0.08 + k * 0.05, Math.sin(a) * (0.2 + k * 0.03)]} userData={{ ghost: true }}>
            <Ball position={[0, 0, 0]} radius={0.012} color={INK} ink={1} />
            <Ball position={[0.01, 0.012, 0]} radius={0.01} color="#dfe8ff" scale={[1.4, 0.5, 1]} opacity={0.7} />
            <Ball position={[-0.01, 0.012, 0]} radius={0.01} color="#dfe8ff" scale={[1.4, 0.5, 1]} opacity={0.7} />
          </group>
        );
      })}
  </group>
);

// The sock monster: a big slimy green sock that climbs out of the pile (`rise` 0..1), opens its cuff into a mouth
// of fangs (`roar` 0..1), googly eyes jiggling, little sock arms waving and slime dripping.
export const SockMonster: React.FC<{ position: Vec3; f: number; rise: number; roar?: number; lunge?: number; rotationY?: number }> = ({ position, f, rise, roar = 0, lunge = 0, rotationY = 0 }) => {
  const G = "#58b02c";
  const D = "#3a7a1c";
  const up = -0.62 + ease(rise) * 0.62;
  const sway = Math.sin(f * 0.18) * 0.12 * rise;
  const jig = (k: number) => [Math.sin(f * 0.9 + k) * 0.008, Math.cos(f * 1.1 + k * 2) * 0.008] as const;
  const mouth = 0.02 + roar * 0.09;
  return (
    <group position={[position[0], position[1] + up, position[2] + lunge * 0.35]} rotation={[lunge * 0.35, rotationY, sway]} userData={{ ghost: true }}>
      {/* leg of the sock = the body */}
      <Cap a={[0, 0.05, 0]} b={[0, 0.5, 0.02]} r={0.14} color={G} ink={0.01} />
      {/* foot curling out at the bottom */}
      <Cap a={[0, 0.06, 0]} b={[0.2, 0.0, 0.08]} r={0.12} color={G} ink={0.01} />
      {/* sock stripes round the leg, a heel bump at the back and a toe seam */}
      {[0.36, 0.44].map((y) => (
        <mesh key={y} position={[0, y, 0.016]} rotation={[0.04, 0, 0]}>
          <torusGeometry args={[0.142, 0.018, 10, 32]} />
          {soft("#e0453a", 0.8)}
        </mesh>
      ))}
      <Ball position={[-0.05, 0.08, -0.1]} radius={0.1} color={D} rough={0.8} />
      <mesh position={[0.29, 0.0, 0.11]} rotation={[0, 1.2, 0]}>
        <torusGeometry args={[0.1, 0.012, 8, 24]} />
        {soft(D, 0.8)}
      </mesh>
      {/* spots */}
      {[
        [0.11, 0.3, 0.08],
        [-0.12, 0.2, 0.06],
        [0.05, 0.12, 0.13],
        [-0.06, 0.42, 0.11],
      ].map((p, i) => (
        <Ball key={i} position={p as Vec3} radius={0.028 + (i % 2) * 0.012} color={D} ink={1} scale={[1, 1, 0.4]} />
      ))}
      {/* ribbed cuff round the top: the rim of the mouth */}
      {[0.56, 0.6, 0.64].map((y, i) => (
        <mesh key={y} position={[0, y, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.135 + i * 0.006, 0.022, 10, 32]} />
          {soft(i === 1 ? "#e0453a" : "#78c83e", 0.8)}
        </mesh>
      ))}
      {/* mouth: dark oval in the cuff with fangs */}
      <group position={[0, 0.5, 0.15]}>
        <Ball position={[0, 0, 0]} radius={0.1} color="#2a0b14" scale={[1.05, (mouth / 0.1) * 1.1 + 0.1, 0.25]} />
        <Ball position={[0, -mouth * 0.5, 0.012]} radius={0.04} color="#e0447a" scale={[1.2, 0.5 * (0.3 + roar), 0.3]} ink={1} />
        {[-0.06, -0.02, 0.02, 0.06].map((x, i) => (
          <group key={i}>
            <mesh position={[x, mouth * 0.95 - 0.012, 0.02]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.016, 0.045, 8]} />
              <meshToonMaterial color="#fffdf2" gradientMap={toonRamp} />
            </mesh>
            {i % 2 === 0 && (
              <mesh position={[x + 0.02, -mouth * 0.95 + 0.012, 0.02]}>
                <coneGeometry args={[0.013, 0.035, 8]} />
                <meshToonMaterial color="#fffdf2" gradientMap={toonRamp} />
              </mesh>
            )}
          </group>
        ))}
      </group>
      {/* googly eyes on stalks above the cuff */}
      {[-1, 1].map((s, k) => {
        const [jx, jy] = jig(k);
        const top: Vec3 = [s * 0.1, 0.82 + Math.sin(f * 0.25 + k) * 0.02, 0.04];
        return (
          <group key={s}>
            <Cap a={[s * 0.06, 0.6, 0.02]} b={top} r={0.025} color={G} ink={0.006} />
            <Ball position={top} radius={0.075 - k * 0.012} color="#ffffff" />
            <Ball position={[top[0] + jx + s * 0.01, top[1] + jy, top[2] + 0.06 - k * 0.01]} radius={0.032} color={INK} ink={1} />
            <Ball position={[top[0] + jx + s * 0.01 + 0.012, top[1] + jy + 0.012, top[2] + 0.088 - k * 0.01]} radius={0.009} color="#ffffff" glow />
          </group>
        );
      })}
      {/* sock arms */}
      {[-1, 1].map((s) => {
        const wave = Math.sin(f * 0.35 + s) * 0.08 + roar * 0.12;
        return <Cap key={s} a={[s * 0.13, 0.36, 0.03]} b={[s * (0.3 + roar * 0.05), 0.5 + wave, 0.12 + lunge * 0.1]} r={0.04} color={G} ink={0.007} />;
      })}
      {/* slime drips off the chin */}
      {Array.from({ length: 4 }, (_, k) => {
        const t = frac(f * 0.03 + k * 0.27);
        return <Ball key={k} position={[-0.07 + k * 0.05, 0.42 - t * 0.35, 0.16]} radius={0.016 * (1 - t * 0.5)} color="#8ad84a" scale={[1, 1.5, 1]} />;
      })}
    </group>
  );
};

// ---------- dogs ----------

// Soft fur: fine light and dark strokes, multiplied by the fur colour. One shared texture for every dog.
let furTex: THREE.Texture | null = null;
const fur = () =>
  (furTex ??= (() => {
    const t = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1400; i++) {
        const x = rnd(i) * 256;
        const y = rnd(i + 3000) * 256;
        ctx.strokeStyle = rnd(i + 7) > 0.5 ? "rgba(255,250,235,0.22)" : "rgba(90,60,40,0.1)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd(i + 9) - 0.5) * 4, y + 6 + rnd(i + 11) * 5);
        ctx.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    return t;
  })());

export type Breed = "rocky" | "max" | "bella" | "buddy";
const BREEDS: Record<Breed, { fur: string; light: string; ear: string; collar: string; fluffy?: boolean; bow?: string; build: number }> = {
  rocky: { fur: "#a8703f", light: "#f1d8ae", ear: "#5e3a20", collar: "#b8282f", build: 1.15 },
  max: { fur: "#f5f2ec", light: "#ffffff", ear: "#e6e0d6", collar: "#2f6fd8", fluffy: true, build: 0.9 },
  bella: { fur: "#f0bf6a", light: "#fbe2b0", ear: "#d8943a", collar: "#ff4fa3", bow: "#ff4fa3", build: 1 },
  buddy: { fur: "#e8a548", light: "#f8d89a", ear: "#c97f2a", collar: "#d8232a", build: 1.05 },
};

export type DogPose = {
  lid?: number; // 0 eyes wide .. 1 shut; 0.5 is the deadpan half-lid
  brow?: number; // -1 sad/up-in .. 0 flat .. 1 angry/down-in
  lookX?: number; // pupils -1..1
  lookY?: number;
  turn?: number; // head turn, radians (+ toward screen left)
  tilt?: number; // head tilt, radians
  nod?: number; // head pitch, radians (+ looks down)
  sniff?: number; // 0..1 nose twitch amount
  wag?: number; // 0..1 tail wag amount
  mouth?: number; // 0..1 open
  tongue?: boolean;
  earUp?: number; // 0 floppy .. 1 perked
};

// A seated cartoon dog facing +z, ~0.8 m to the top of the head. Fully 3D and inked, built from balls and
// capsules. Rocky is the stocky deadpan judge; Max a white poodle with pom-poms; Bella a golden with a pink bow.
export const Dog: React.FC<{ position: Vec3; f: number; breed?: Breed; pose?: DogPose; rotationY?: number; scale?: number; tag?: string }> = ({
  position,
  f,
  breed = "rocky",
  pose = {},
  rotationY = 0,
  scale = 1,
  tag,
}) => {
  const b = BREEDS[breed];
  const { lid = 0.15, brow = 0, lookX = 0, lookY = 0, turn = 0, tilt = 0, nod = 0, sniff = 0, wag = 0.4, mouth = 0, tongue = false, earUp = 0 } = pose;
  const w = b.build;
  const breath = Math.sin(f * 0.12) * 0.006;
  const sn = sniff * (Math.sin(f * 1.7) > 0.3 ? 1 : 0);
  const tailA = Math.sin(f * (0.5 + wag * 0.4)) * (0.25 + wag * 0.9);
  // eyelid cap: rotation tips the top half-sphere from behind the eye (open) over its front (shut)
  const lidRot = -Math.PI / 2 + Math.min(1, Math.max(0, lid)) * Math.PI * 0.98;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* body, sitting upright */}
      <Ball position={[0, 0.3 + breath, -0.06]} radius={0.21} color={b.fur} scale={[w, 1.25, 1.05]} map={fur()} rough={0.75} />
      <Ball position={[0, 0.36 + breath, 0.1]} radius={0.13} color={b.light} scale={[w * 1.05, 1.25, 0.8]} map={fur()} rough={0.75} />
      {/* haunches and hind paws */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Ball position={[s * 0.16 * w, 0.14, -0.06]} radius={0.13} color={b.fur} scale={[0.8, 0.95, 1.3]} map={fur()} rough={0.75} />
          <Ball position={[s * 0.18 * w, 0.035, 0.12]} radius={0.055} color={b.fur} scale={[1, 0.65, 1.6]} />
          <Cap a={[s * 0.085 * w, 0.32, 0.13]} b={[s * 0.09 * w, 0.06, 0.17]} r={0.045 * w} color={b.fur} />
          <Ball position={[s * 0.09 * w, 0.035, 0.2]} radius={0.058} color={b.light} scale={[1, 0.65, 1.3]} />
        </group>
      ))}
      {/* tail */}
      <group position={[0, 0.12, -0.27]} rotation={[0.9, 0, tailA]}>
        <Cap a={[0, 0, 0]} b={[0, 0.2, 0]} r={b.fluffy ? 0.025 : 0.03} color={b.fur} />
        {b.fluffy && <Ball position={[0, 0.22, 0]} radius={0.07} color={b.fur} />}
      </group>
      {/* collar and tag */}
      <mesh position={[0, 0.49, 0.03]} rotation={[1.35, 0, 0]}>
        <torusGeometry args={[0.145 * w, 0.022, 8, 28]} />
        <meshToonMaterial color={b.collar} gradientMap={toonRamp} />
      </mesh>
      <group position={[0, 0.42, 0.18]} rotation={[0, 0, Math.sin(f * 0.15) * 0.15]}>
        <InkCylinder radius={0.035} height={0.008} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} color="#f2c12e" ink={0.004} />
        {tag && <TagText text={tag} />}
      </group>
      {/* head */}
      <group position={[0, 0.68 + breath * 1.5, 0.08]} rotation={[nod, turn, tilt]}>
        <Ball position={[0, 0, 0]} radius={0.17} color={b.fur} scale={[1.12 * Math.sqrt(w), 0.95, 1]} map={fur()} rough={0.75} />
        {b.fluffy && [[-0.06, 0.15], [0.06, 0.15], [0, 0.19]].map(([x, y], i) => <Ball key={i} position={[x, y, -0.02]} radius={0.08} color={b.fur} />)}
        {/* jowls and muzzle */}
        {[-1, 1].map((s) => (
          <Ball key={s} position={[s * 0.075, -0.075, 0.1]} radius={0.075 * Math.sqrt(w)} color={b.light} scale={[1, 0.85, 1]} />
        ))}
        <Ball position={[0, -0.045, 0.14]} radius={0.085} color={b.light} scale={[1.15, 0.8, 1]} map={fur()} rough={0.75} />
        {/* nose, twitching while it sniffs */}
        <Ball position={[0, -0.015 + sn * 0.006, 0.232]} radius={0.033} color="#231a1c" rough={0.32} scale={[1.35 + sn * 0.15, 0.95 - sn * 0.12, 0.9]} />
        <Ball position={[-0.012, 0.0, 0.258]} radius={0.008} color="#ffffff" glow />
        {/* mouth: a flat line (deadpan) that can open with a tongue */}
        {mouth > 0.05 ? (
          <group position={[0, -0.11, 0.17]}>
            <Ball position={[0, 0, 0]} radius={0.05} color="#3a0f16" scale={[1.2, mouth, 0.4]} />
            {tongue && <Ball position={[0, -0.03 * mouth - 0.02, 0.02]} radius={0.03} color="#ff6f8f" scale={[1, 1.5, 0.5]} />}
          </group>
        ) : (
          <Cap a={[-0.045, -0.088, 0.212]} b={[0.045, -0.084, 0.215]} r={0.006} color={INK} ink={0} />
        )}
        {/* eyes with lids and brows */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.074, 0.04, 0.135]}>
            <Ball position={[0, 0, 0]} radius={0.052} color="#fff8ec" rough={0.25} />
            <Ball position={[lookX * 0.016, lookY * 0.012, 0.036]} radius={0.026} color="#3a2414" rough={0.2} />
            <Ball position={[lookX * 0.016, lookY * 0.012, 0.046]} radius={0.016} color={INK} rough={0.2} />
            <Ball position={[lookX * 0.016 + 0.01, lookY * 0.012 + 0.011, 0.062]} radius={0.007} color="#ffffff" glow />
            <group rotation={[lidRot, 0, 0]}>
              <mesh>
                <sphereGeometry args={[0.056, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshToonMaterial color={b.fur} gradientMap={toonRamp} side={THREE.DoubleSide} />
              </mesh>
              {/* lid rim */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.056, 0.0025, 6, 28]} />
                <meshBasicMaterial color="#3a2414" />
              </mesh>
            </group>
            <Cap a={[-s * 0.038, 0.058 - brow * 0.012, 0.04]} b={[s * 0.038, 0.058 - brow * 0.012, 0.04]} r={0.01} color={breed === "max" ? "#b8b0a2" : "#3a2414"} ink={0} />
          </group>
        ))}
        {/* ears */}
        {[-1, 1].map((s) => {
          const flop = (1 - earUp) * 0.5 + Math.sin(f * 0.2 + s) * 0.04 + sn * 0.05;
          return (
            <group key={s} position={[s * 0.15 * Math.sqrt(w), 0.08, -0.01]} rotation={[0, 0, s * (0.25 + flop) + (earUp > 0.5 ? -s * 0.9 : 0)]}>
              <Ball position={[0, -0.07, 0]} radius={b.fluffy ? 0.08 : 0.065} color={b.ear} scale={[0.6, 1.35, 0.7]} />
            </group>
          );
        })}
        {b.bow && (
          <group position={[0.13, 0.13, 0.02]} rotation={[0, 0, -0.3]}>
            <Ball position={[-0.04, 0, 0]} radius={0.035} color={b.bow} scale={[1.3, 0.85, 0.5]} />
            <Ball position={[0.04, 0, 0]} radius={0.035} color={b.bow} scale={[1.3, 0.85, 0.5]} />
            <Ball position={[0, 0, 0.01]} radius={0.018} color="#ffd1ea" />
          </group>
        )}
      </group>
    </group>
  );
};

const TagText: React.FC<{ text: string }> = ({ text }) => {
  const tex = useMemo(
    () =>
      canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = INK;
        ctx.font = `900 84px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 64, 70);
      }),
    [text],
  );
  return (
    <mesh position={[0, 0, 0.006]}>
      <planeGeometry args={[0.06, 0.06]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
};

// A human-sized black dog nose, for the gag of "you" with a dog's nose. Place it on the face.
export const DogNoseProp: React.FC<{ position: Vec3; f: number; sniff?: number; scale?: number }> = ({ position, f, sniff = 0, scale = 1 }) => {
  const sn = sniff * (Math.sin(f * 1.7) > 0.2 ? 1 : 0);
  return (
    <group position={position} scale={scale} userData={{ ghost: true }}>
      <Ball position={[0, 0, 0]} radius={0.065} color="#231a1c" rough={0.12} scale={[1.35 + sn * 0.18, 0.9 - sn * 0.12, 0.8]} />
      {[-1, 1].map((s) => (
        <Ball key={s} position={[s * 0.025, -0.012, 0.035]} radius={0.012} color="#050505" ink={1} scale={[1.2, 0.8, 0.5]} />
      ))}
      <Ball position={[-0.02, 0.02, 0.036]} radius={0.012} color="#ffffff" glow />
    </group>
  );
};

// ---------- feed cards ----------

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};
const paw = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: string) => {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.25, s * 0.42, s * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  [
    [-0.42, -0.2],
    [-0.15, -0.45],
    [0.15, -0.45],
    [0.42, -0.2],
  ].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, s * 0.15, s * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
  });
};
const AVATAR: Record<Breed, [string, string, string]> = {
  rocky: ["#a8703f", "#f1d8ae", "#5e3a20"],
  max: ["#f5f2ec", "#ffffff", "#d8d0c2"],
  bella: ["#f0bf6a", "#fbe2b0", "#d8943a"],
  buddy: ["#e8a548", "#f8d89a", "#c97f2a"],
};
const dogFace = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, breed: Breed, ring: string) => {
  const [fur, light, ear] = AVATAR[breed];
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#bfe6ff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  const ell = (x: number, y: number, rx: number, ry: number, c: string, rot = 0) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  ell(cx - r * 0.55, cy - r * 0.05, r * 0.22, r * 0.45, ear, 0.35);
  ell(cx + r * 0.55, cy - r * 0.05, r * 0.22, r * 0.45, ear, -0.35);
  ell(cx, cy + r * 0.05, r * 0.55, r * 0.5, fur);
  if (breed === "max") [-0.3, 0, 0.3].forEach((dx) => ell(cx + dx * r, cy - r * 0.45, r * 0.22, r * 0.2, fur));
  ell(cx, cy + r * 0.28, r * 0.32, r * 0.22, light);
  ell(cx, cy + r * 0.16, r * 0.11, r * 0.08, INK);
  ctx.fillStyle = INK;
  [-1, 1].forEach((s) => {
    ctx.beginPath();
    ctx.arc(cx + s * r * 0.2, cy - r * 0.05, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  });
  if (breed === "rocky") {
    ctx.fillStyle = fur;
    [-1, 1].forEach((s) => ctx.fillRect(cx + s * r * 0.2 - r * 0.09, cy - r * 0.13, r * 0.18, r * 0.07)); // half lids
  }
  if (breed === "bella") ell(cx + r * 0.45, cy - r * 0.42, r * 0.16, r * 0.1, "#ff4fa3");
  ctx.restore();
};

// A notification card from the dog feed: avatar, name, message and a paw "like" count. Pops in at `appear`.
export const FeedCard: React.FC<{ position: Vec3; breed: Breed; name: string; text: string; likes?: string; appear: number; width?: number; rotation?: Vec3; accent?: string; badge?: string }> = ({
  position,
  breed,
  name,
  text,
  likes = "",
  appear,
  width = 0.7,
  rotation = [0, 0, 0],
  accent = "#ff3d7f",
  badge,
}) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 384, (ctx) => {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        roundRect(ctx, 22, 30, 990, 340, 70);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 16;
        roundRect(ctx, 12, 12, 990, 340, 70);
        ctx.fill();
        ctx.stroke();
        dogFace(ctx, 170, 182, 105, breed, accent);
        ctx.fillStyle = INK;
        ctx.textBaseline = "middle";
        ctx.font = `900 92px ${FONT}`;
        ctx.fillText(name, 320, 120);
        ctx.fillStyle = "#3a3f55";
        ctx.font = `900 64px ${FONT}`;
        ctx.fillText(text, 320, 225);
        if (likes) {
          paw(ctx, 340, 300, 46, accent);
          ctx.fillStyle = accent;
          ctx.font = `900 54px ${FONT}`;
          ctx.fillText(likes, 385, 305);
        }
      }),
    [breed, name, text, likes, accent],
  );
  if (appear < 0) return null;
  const s = appear < 6 ? (appear / 6) * 1.18 : 1 + 0.18 * Math.exp(-(appear - 6) / 3) * Math.cos((appear - 6) * 0.9);
  const bob = Math.sin(appear * 0.12) * 0.012;
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={rotation} scale={Math.max(0.001, s)} userData={{ ghost: true }}>
      <mesh>
        <planeGeometry args={[width, width * 0.375]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
      {badge && <Badge position={[width * 0.46, width * 0.15, 0.01]} text={badge} size={width * 0.2} appear={appear - 8} />}
      {appear < 5 && (
        <mesh position={[0, 0, 0.003]}>
          <planeGeometry args={[width * 0.96, width * 0.34]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={1 - appear / 5} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// A red round notification badge with a count.
export const Badge: React.FC<{ position: Vec3; text: string; size?: number; appear?: number; color?: string }> = ({ position, text, size = 0.16, appear = 99, color = "#ff2a3d" }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(128, 128, 124, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(128, 128, 108, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${text.length > 2 ? 90 : 130}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 128, 136);
      }),
    [text, color],
  );
  if (appear < 0) return null;
  const s = appear < 5 ? (appear / 5) * 1.3 : 1 + 0.3 * Math.exp(-(appear - 5) / 3) * Math.cos((appear - 5) * 1.1);
  return (
    <mesh position={position} scale={Math.max(0.001, s)}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
};

// ---------- street furniture ----------

// A wheelie bin: tall body, hinged lid (`lid` 0..1 open, flipping back), two wheels at the back, handle.
export const WheelieBin: React.FC<{ position: Vec3; color?: string; lid?: number; rotationY?: number; f?: number; shake?: number }> = ({ position, color = "#2f8a4a", lid = 0, rotationY = 0, f = 0, shake = 0 }) => {
  const wob = shake * Math.sin(f * 2.2) * 0.06;
  return (
    <group position={position} rotation={[0, rotationY, wob]}>
      <RBox size={[0.5, 0.86, 0.56]} position={[0, 0.47, 0]} color={color} radius={0.07} rough={0.45} />
      {/* ribs */}
      {[-0.17, 0.17].map((x) => (
        <RBox key={x} size={[0.05, 0.7, 0.03]} position={[x, 0.45, 0.285]} color={color} radius={0.012} rough={0.45} />
      ))}
      <RBox size={[0.54, 0.06, 0.6]} position={[0, 0.88, 0.0]} color={color} radius={0.025} rough={0.45} />
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.09} h={0.06} position={[s * 0.27, 0.09, -0.25]} rotation={[0, 0, Math.PI / 2]} color="#1d1d22" rough={0.6} />
      ))}
      <Cyl r={0.02} h={0.5} position={[0, 0.9, -0.31]} rotation={[0, 0, Math.PI / 2]} color="#1d1d22" />
      {/* lid hinged at the back edge */}
      <group position={[0, 0.92, -0.3]} rotation={[-ease(lid) * 2.0, 0, 0]}>
        <RBox size={[0.58, 0.05, 0.64]} position={[0, 0.025, 0.32]} color={color} radius={0.022} rough={0.45} />
        <RBox size={[0.2, 0.04, 0.04]} position={[0, 0.0, 0.64]} color="#1d1d22" radius={0.012} />
      </group>
    </group>
  );
};

export const Hydrant: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <Cyl r={0.11} h={0.5} position={[0, 0.25, 0]} color="#e0262f" rough={0.35} />
    <Ball position={[0, 0.52, 0]} radius={0.12} color="#e0262f" scale={[1, 0.7, 1]} rough={0.35} />
    <Cyl r={0.04} h={0.08} position={[0, 0.62, 0]} color="#e0262f" rough={0.35} />
    {[-1, 1].map((s) => (
      <Cyl key={s} r={0.045} h={0.1} position={[s * 0.14, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} color="#f2c12e" rough={0.35} />
    ))}
    <Cyl r={0.15} h={0.05} position={[0, 0.025, 0]} color="#b81d26" rough={0.35} />
  </group>
);

export const Mailbox: React.FC<{ position: Vec3; color?: string; flag?: boolean }> = ({ position, color = "#2f6fd8", flag = true }) => (
  <group position={position}>
    <RBox size={[0.07, 1.0, 0.07]} position={[0, 0.5, 0]} color="#7a5a3a" radius={0.015} />
    <RBox size={[0.22, 0.2, 0.42]} position={[0, 1.08, 0]} color={color} radius={0.03} rough={0.4} />
    <Cyl r={0.11} h={0.42} position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]} color={color} rough={0.4} />
    {flag && <RBox size={[0.02, 0.18, 0.07]} position={[0.12, 1.22, -0.08]} color="#e0262f" radius={0.008} />}
  </group>
);

// A puff of scent bursting into the frame (a door opening onto the street): concentric ribbons blasted at the lens.
export const ScentBlast: React.FC<{ origin: Vec3; f: number; t: number; colors?: string[] }> = ({ origin, f, t, colors = ["#7fd6ff", "#ff7aa8", "#ffd23f", "#9b6bff", "#7fd63a"] }) => {
  if (t < 0) return null;
  const p = ease(t / 18);
  return (
    <group userData={{ ghost: true }}>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2 + 0.4;
        const pts: Vec3[] = [0, 0.33, 0.66, 1].map((u) => [origin[0] + Math.cos(a + u * 1.6) * (0.05 + u * 0.7), origin[1] + Math.sin(a + u * 1.6) * (0.05 + u * 0.6), origin[2] + u * 2.4]);
        return <ScentRibbon key={c} points={pts} f={f} color={c} radius={0.05 + i * 0.005} wobble={0.05} grow={p} seed={i * 2} sparkles={3} glowK={0.7} />;
      })}
    </group>
  );
};
