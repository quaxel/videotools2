import React from "react";
import * as THREE from "three";
import { Halo, InkBox, InkCylinder, Label, rand, toonRamp, Vec3 } from "../../engine";

// Props for "The Melted Candy Bar That Invented the Microwave" (1945-1967). Magnetron, candy bar, popcorn and the
// water molecule are drawn about 2x real size (plan.json format_note).

const INK = "#161212";

// An inked toon sphere (optionally squashed with `scale`).
export const Ball: React.FC<{ position: Vec3; radius: number; color: string; scale?: Vec3; ink?: number; emissive?: string }> = ({
  position,
  radius,
  color,
  scale = [1, 1, 1],
  ink = 0.012,
  emissive,
}) => (
  <group position={position} scale={scale}>
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 20, 14]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} emissive={emissive ?? "#000"} />
    </mesh>
    {ink > 0 && (
      <mesh>
        <sphereGeometry args={[radius + ink, 20, 14]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// A stick between two points (bonds, drips, strings).
export const Stick: React.FC<{ a: Vec3; b: Vec3; radius: number; color: string; ink?: number }> = ({ a, b, radius, color, ink = 0.006 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(0.001, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return <InkCylinder radius={radius} height={len} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} color={color} ink={ink} />;
};

// ---------- the radar lab ----------

// The cavity magnetron of a 1940s radar set: a finned copper block between the poles of a big red horseshoe magnet,
// an output stub on top whose tip glows when it runs. Base on the bench top at `position`.
export const Magnetron: React.FC<{ position: Vec3; glow?: number; frame?: number; label?: boolean; scale?: number; labelY?: number }> = ({
  position,
  glow = 1,
  frame = 0,
  label = true,
  scale = 1,
  labelY = -0.07,
}) => {
  const flick = glow * (0.85 + 0.15 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37));
  return (
    <group position={position} scale={scale}>
      {/* steel foot */}
      <InkBox size={[0.36, 0.04, 0.24]} position={[0, 0.02, 0]} color="#5a6268" ink={0.006} />
      {/* horseshoe magnet: two poles and the bridge behind */}
      <InkBox size={[0.07, 0.3, 0.16]} position={[-0.13, 0.19, 0]} color="#c8322a" ink={0.008} />
      <InkBox size={[0.07, 0.3, 0.16]} position={[0.13, 0.19, 0]} color="#c8322a" ink={0.008} />
      <InkBox size={[0.33, 0.07, 0.16]} position={[0, 0.375, 0]} color="#c8322a" ink={0.008} />
      <InkBox size={[0.075, 0.04, 0.165]} position={[-0.13, 0.06, 0]} color="#d8dcd8" ink={0.004} />
      <InkBox size={[0.075, 0.04, 0.165]} position={[0.13, 0.06, 0]} color="#d8dcd8" ink={0.004} />
      {/* copper anode block with cooling fins, axis toward the camera */}
      <InkCylinder radius={0.075} height={0.12} position={[0, 0.19, 0.0]} rotation={[Math.PI / 2, 0, 0]} color="#c87a3a" ink={0.006} />
      {[-0.045, -0.015, 0.015, 0.045].map((z) => (
        <InkCylinder key={z} radius={0.095} height={0.008} position={[0, 0.19, z]} rotation={[Math.PI / 2, 0, 0]} color="#e09a5a" ink={0.003} />
      ))}
      <InkCylinder radius={0.03} height={0.02} position={[0, 0.19, 0.07]} rotation={[Math.PI / 2, 0, 0]} color="#8a4a20" ink={0.003} />
      {/* output stub and its glowing tip */}
      <InkCylinder radius={0.012} height={0.12} position={[0.0, 0.32, 0.09]} color="#d8b070" ink={0.004} />
      <mesh position={[0.0, 0.39, 0.09]}>
        <sphereGeometry args={[0.022, 16, 12]} />
        <meshBasicMaterial color={new THREE.Color("#ffb060").multiplyScalar(0.6 + 1.6 * flick)} toneMapped={false} />
      </mesh>
      <Halo position={[0, 0.39, 0.1]} size={0.35} color="#ff9a40" strength={0.35 * flick} />
      {/* cable off the back */}
      <InkCylinder radius={0.012} height={0.3} position={[0.2, 0.08, -0.08]} rotation={[0, 0, Math.PI / 2]} color="#2a2a2a" ink={0.003} />
      {label && <Label text="MAGNETRON" position={[0, labelY, 0.13]} width={0.36} bg="#f0ead8" />}
    </group>
  );
};

// A grey steel lab bench; top at `top`.
export const SteelBench: React.FC<{ position: Vec3; size?: Vec3; color?: string }> = ({ position, size = [2.2, 0.62, 0.6], color = "#6e7a7c" }) => {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <InkBox size={[w, 0.05, d]} position={[0, h - 0.025, 0]} color={color} ink={0.01} />
      <InkBox size={[w - 0.06, 0.03, d - 0.04]} position={[0, h - 0.065, 0]} color="#4a5456" ink={0.005} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.05, h - 0.05, 0.05]} position={[sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06)]} color="#3e4648" ink={0.005} />),
      )}
      <InkBox size={[w - 0.12, 0.03, d - 0.12]} position={[0, 0.18, 0]} color="#4a5456" ink={0.005} />
    </group>
  );
};

// A cable spool / coil standing on the floor (foreground piece).
export const CableSpool: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.22} height={0.03} position={[0, 0.015, 0]} color="#8a6a40" ink={0.006} />
    <InkCylinder radius={0.13} height={0.24} position={[0, 0.15, 0]} color="#2a2a2e" ink={0.006} />
    <InkCylinder radius={0.22} height={0.03} position={[0, 0.285, 0]} color="#8a6a40" ink={0.006} />
  </group>
);

// ---------- candy bar and chocolate ----------

// A plain-wrapped chocolate bar, sagging as it melts (`melt` 0..1), with brown strings dripping off its end.
export const CandyBar: React.FC<{ position: Vec3; rotation?: Vec3; melt?: number; frame?: number; scale?: number }> = ({ position, rotation = [0, 0, 0], melt = 0, frame = 0, scale = 1 }) => {
  const sag = melt * 0.035;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* wrapper: cream paper with a plain red band, no brand */}
      <InkBox size={[0.07, 0.028, 0.2]} position={[0, 0, 0.04]} color="#f0e6cc" ink={0.004} />
      <InkBox size={[0.072, 0.03, 0.04]} position={[0, 0, 0.04]} color="#c8322a" ink={0} />
      {/* the bare chocolate end, sagging */}
      <InkBox size={[0.064, 0.024, 0.1]} position={[0, -sag * 0.5, -0.1]} rotation={[-melt * 0.5, 0, 0]} color="#5a3018" ink={0.004} />
      {[0, 1, 2].map((i) => {
        const len = melt * (0.06 + 0.05 * i) * (0.9 + 0.1 * Math.sin(frame * 0.07 + i * 2));
        if (len < 0.005) return null;
        const x = -0.02 + i * 0.02;
        const top: Vec3 = [x, -0.012 - sag, -0.14];
        const bot: Vec3 = [x, -0.012 - sag - len, -0.145];
        return (
          <group key={i}>
            <Stick a={top} b={bot} radius={0.006 + 0.002 * i} color="#4a2410" ink={0.003} />
            <Ball position={bot} radius={0.011 + 0.003 * i} color="#4a2410" scale={[1, 1.3, 1]} ink={0.003} />
          </group>
        );
      })}
    </group>
  );
};

// A dark chocolate stain spreading on a pocket (a soft blob on the puppet's coat, in front of the card).
export const Stain: React.FC<{ position: Vec3; size: number }> = ({ position, size }) =>
  size < 0.005 ? null : (
    <mesh position={position}>
      <circleGeometry args={[size, 24]} />
      <meshBasicMaterial color="#4a2410" transparent opacity={0.92} depthWrite={false} />
    </mesh>
  );

// ---------- popcorn ----------

// A brown paper bag of corn kernels, open at the top; `puff` swells it (popcorn pushing up).
export const KernelBag: React.FC<{ position: Vec3; rotation?: Vec3; puff?: number }> = ({ position, rotation = [0, 0, 0], puff = 0 }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.13 + puff * 0.02, 0.17, 0.09 + puff * 0.02]} position={[0, 0.085, 0]} color="#c89a5a" ink={0.005} />
    <InkBox size={[0.135, 0.03, 0.095]} position={[0, 0.17, 0]} rotation={[0.25, 0, 0]} color="#d8aa6a" ink={0.004} />
    {[0, 1, 2, 3].map((i) => (
      <Ball key={i} position={[-0.04 + i * 0.026, 0.17 + puff * 0.03, 0.01 * Math.sin(i * 3)]} radius={0.012 + puff * 0.012} color={puff > 0.3 ? "#fff6dc" : "#f0b030"} ink={0.003} />
    ))}
  </group>
);

// Popcorn flying out of a source: each kernel pops at its own frame, flies on a ballistic arc and lands on `floor`
// (or on a table top if it lands within `table`), where it stays. `frame` = frames since the first pop.
export const PopcornBurst: React.FC<{
  origin: Vec3;
  frame: number;
  count?: number;
  seed?: number;
  floor?: number;
  table?: { y: number; x: [number, number]; z: [number, number] };
  spread?: number;
}> = ({ origin, frame, count = 26, seed = 1, floor = 0, table, spread = 1 }) => {
  if (frame < 0) return null;
  const g = -9.8 / 900; // m per frame²
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const t0 = Math.floor(rand(i, seed) * 28);
        const t = frame - t0;
        if (t < 0) return null;
        const vx = (rand(i, seed + 1) - 0.5) * 0.06 * spread;
        const vy = 0.03 + rand(i, seed + 2) * 0.04;
        const vz = (rand(i, seed + 3) - 0.2) * 0.03 * spread;
        // solve landing
        let tl = Infinity;
        const landAt = (y: number) => {
          const a = 0.5 * g;
          const b = vy;
          const c = origin[1] - y;
          const disc = b * b - 4 * a * c;
          if (disc < 0) return Infinity;
          return (-b - Math.sqrt(disc)) / (2 * a);
        };
        const tf = landAt(floor);
        tl = tf;
        if (table) {
          const tt = landAt(table.y);
          const x = origin[0] + vx * tt;
          const z = origin[2] + vz * tt;
          if (tt > 0 && x > table.x[0] && x < table.x[1] && z > table.z[0] && z < table.z[1]) tl = tt;
        }
        const tc = Math.min(t, tl);
        const p: Vec3 = [origin[0] + vx * tc, origin[1] + vy * tc + 0.5 * g * tc * tc, origin[2] + vz * tc];
        const landed = t >= tl;
        const r = 0.016 + rand(i, seed + 4) * 0.008;
        const spin = landed ? tl * 0.3 : tc * 0.3;
        return (
          <group key={i} position={[p[0], p[1] + (landed ? r * 0.7 : 0), p[2]]} rotation={[spin, spin * 0.7, 0]}>
            <Ball position={[0, 0, 0]} radius={r} color="#fff6dc" ink={0.003} />
            <Ball position={[r * 0.8, r * 0.3, 0]} radius={r * 0.75} color="#fff8e4" ink={0.003} />
            <Ball position={[-r * 0.5, r * 0.6, r * 0.3]} radius={r * 0.65} color="#fff2d0" ink={0.003} />
            <Ball position={[0, -r * 0.7, 0]} radius={r * 0.4} color="#f0b030" ink={0.002} />
          </group>
        );
      })}
    </group>
  );
};

// ---------- the egg ----------

// A tin kettle with the lid off and an egg sitting in its mouth; `shake` 0..1 rattles it, `burst` 0..1 the egg gone.
export const Kettle: React.FC<{ position: Vec3; shake?: number; burst?: number; frame?: number }> = ({ position, shake = 0, burst = 0, frame = 0 }) => {
  const j = shake * (1 - burst);
  const dx = Math.sin(frame * 2.3) * 0.006 * j;
  const rz = Math.sin(frame * 1.7) * 0.06 * j;
  return (
    <group position={[position[0] + dx, position[1], position[2]]} rotation={[0, 0, rz]}>
      <InkCylinder radius={0.1} height={0.13} position={[0, 0.065, 0]} color="#a8b0b4" ink={0.006} />
      <InkCylinder radius={0.07} height={0.02} position={[0, 0.14, 0]} color="#8a9296" ink={0.004} />
      <Stick a={[0.08, 0.06, 0]} b={[0.18, 0.15, 0]} radius={0.014} color="#a8b0b4" />
      <Stick a={[-0.09, 0.12, 0]} b={[-0.12, 0.05, 0]} radius={0.01} color="#2a2a2a" />
      {burst < 0.5 && <Ball position={[0, 0.17 + j * 0.01 * Math.abs(Math.sin(frame * 3.1)), 0]} radius={0.045} color="#f4ecdc" scale={[1, 1.3, 1]} ink={0.004} />}
      {burst >= 0.5 && (
        <>
          <Ball position={[0, 0.15, 0]} radius={0.05} color="#f4c020" scale={[1.4, 0.4, 1.4]} ink={0.004} />
          <Ball position={[0.03, 0.155, 0.02]} radius={0.04} color="#fff8ee" scale={[1.5, 0.35, 1.2]} ink={0.003} />
        </>
      )}
    </group>
  );
};

// The egg bursting: yolk and white blobs and shell bits fly out from `at` and splat flat where they land (`floor`).
export const EggBurst: React.FC<{ at: Vec3; frame: number; floor: number; seed?: number }> = ({ at, frame, floor, seed = 3 }) => {
  if (frame < 0) return null;
  const g = -9.8 / 900;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: 16 }, (_, i) => {
        const kind = i < 5 ? "yolk" : i < 11 ? "white" : "shell";
        const vx = (rand(i, seed) - 0.5) * 0.07;
        const vy = 0.02 + rand(i, seed + 1) * 0.04;
        const vz = (rand(i, seed + 2) - 0.3) * 0.05;
        const a = 0.5 * g;
        const c = at[1] - floor;
        const tl = (-vy - Math.sqrt(vy * vy - 4 * a * c)) / (2 * a);
        const t = Math.min(frame, tl);
        const landed = frame >= tl;
        const p: Vec3 = [at[0] + vx * t, landed ? floor + 0.004 : at[1] + vy * t + a * t * t, at[2] + vz * t];
        const r = kind === "shell" ? 0.014 : 0.018 + rand(i, seed + 3) * 0.014;
        const col = kind === "yolk" ? "#f4c020" : kind === "white" ? "#fffaf0" : "#efe4d0";
        const sc: Vec3 = landed && kind !== "shell" ? [1.8, 0.25, 1.6] : kind === "shell" ? [1, 0.4, 1.2] : [1, 1, 1];
        return <Ball key={i} position={p} radius={r} color={col} scale={sc} ink={0.003} />;
      })}
    </group>
  );
};

// ---------- the truth room ----------

// A ball-and-stick water molecule: red oxygen, two white hydrogens at 104.5°, rocking about `angle` (radians).
export const WaterMolecule: React.FC<{ position: Vec3; angle?: number; size?: number; tilt?: number }> = ({ position, angle = 0, size = 0.2, tilt = 0 }) => {
  const half = ((104.5 / 2) * Math.PI) / 180;
  const L = size * 1.4;
  const H1: Vec3 = [-Math.sin(half) * L, -Math.cos(half) * L, 0];
  const H2: Vec3 = [Math.sin(half) * L, -Math.cos(half) * L, 0];
  return (
    <group position={position} rotation={[tilt, 0, angle]}>
      <Stick a={[0, 0, 0]} b={H1} radius={size * 0.12} color="#e8e4d8" ink={0.006} />
      <Stick a={[0, 0, 0]} b={H2} radius={size * 0.12} color="#e8e4d8" ink={0.006} />
      <Ball position={[0, 0, 0]} radius={size} color="#d8322a" ink={0.012} />
      <Ball position={H1} radius={size * 0.6} color="#f4f2ec" ink={0.01} />
      <Ball position={H2} radius={size * 0.6} color="#f4f2ec" ink={0.01} />
    </group>
  );
};

// A big cutaway soup bowl: the front half removed so the broth inside shows; `heat` 0..1 warms the broth colour.
export const CutawayBowl: React.FC<{ position: Vec3; radius?: number; heat?: number }> = ({ position, radius = 0.55, heat = 0 }) => {
  const broth = new THREE.Color("#c89a4a").lerp(new THREE.Color("#e8803a"), heat);
  return (
    <group position={position}>
      <mesh rotation={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[radius, 40, 20, Math.PI, Math.PI, Math.PI / 2, Math.PI / 2]} />
        <meshToonMaterial color="#f0ece0" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius + 0.012, 40, 20, Math.PI, Math.PI, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {/* the cut face: broth in a half disc */}
      <mesh position={[0, -0.01, 0.002]}>
        <circleGeometry args={[radius * 0.96, 40, Math.PI, Math.PI]} />
        <meshToonMaterial color={broth} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.96, 40, 0, Math.PI]} />
        <meshToonMaterial color={broth.clone().offsetHSL(0, 0, 0.06)} gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[radius * 2.04, 0.012, 0.012]} position={[0, -0.005, 0.004]} color={INK} ink={0} />
    </group>
  );
};

// Steam wisps rising from a point (place-less loop: give it the video frame).
export const Steam: React.FC<{ position: Vec3; frame: number; amount?: number; count?: number; height?: number }> = ({ position, frame, amount = 1, count = 5, height = 0.6 }) =>
  amount < 0.02 ? null : (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const p = ((frame * 0.012 + i / count) % 1 + 1) % 1;
        const x = Math.sin(p * 6 + i * 2.1) * 0.08 + (i - count / 2) * 0.08;
        return (
          <mesh key={i} position={[x, p * height, 0]}>
            <sphereGeometry args={[0.04 + p * 0.07, 12, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={amount * 0.5 * Math.sin(p * Math.PI)} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );

// A tall wall thermometer with a red column (`level` 0..1) and a label above.
export const BigThermometer: React.FC<{ position: Vec3; level: number; label?: string; appear?: number }> = ({ position, level, label = "HEAT", appear }) => (
  <group position={position}>
    <InkBox size={[0.2, 0.95, 0.04]} position={[0, 0, 0]} color="#d8c8a0" ink={0.008} />
    <InkCylinder radius={0.03} height={0.74} position={[0, 0.04, 0.035]} color="#f4f4f0" ink={0.005} />
    <Ball position={[0, -0.36, 0.035]} radius={0.06} color="#d8282a" ink={0.006} />
    <InkCylinder radius={0.019} height={0.03 + level * 0.66} position={[0, -0.32 + (0.03 + level * 0.66) / 2, 0.05]} color="#d8282a" ink={0} />
    {Array.from({ length: 8 }, (_, i) => (
      <InkBox key={i} size={[0.05, 0.008, 0.005]} position={[0.07, -0.27 + i * 0.085, 0.025]} color="#2a2a2a" ink={0} shadows={false} />
    ))}
    <Label text={label} position={[0, 0.6, 0.03]} width={0.3} appear={appear} bg="#f4e0b0" />
  </group>
);

// An unlit gas ring on a small stand, labelled.
export const ColdBurner: React.FC<{ position: Vec3; label?: string; appear?: number }> = ({ position, label = "NO FLAME", appear }) => (
  <group position={position}>
    <InkCylinder radius={0.16} height={0.04} position={[0, 0.02, 0]} color="#3a3a42" ink={0.006} />
    <InkCylinder radius={0.11} height={0.02} position={[0, 0.05, 0]} color="#2a2a30" ink={0.004} />
    <Label text={label} position={[0, 0.03, 0.2]} width={0.36} appear={appear} bg="#f4ecdc" />
  </group>
);

// ---------- the patent office ----------

// A patent form lying on the desk, tilted up toward the camera; `stamped` 0..1 shows the red FILED mark.
export const PatentForm: React.FC<{ position: Vec3; rotation?: Vec3; stamped?: number; dateAppear?: number }> = ({ position, rotation = [-1.15, 0, 0], stamped = 0, dateAppear }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.42, 0.54, 0.006]} position={[0, 0, 0]} color="#f6f0e0" ink={0.003} />
    <Label text="PATENT" position={[0, 0.19, 0.005]} width={0.3} bg="#f6f0e0" border={false} />
    {Array.from({ length: 4 }, (_, i) => (
      <InkBox key={i} size={[0.3, 0.008, 0.002]} position={[0, 0.08 - i * 0.04, 0.005]} color="#8a8070" ink={0} shadows={false} />
    ))}
    {stamped > 0.01 && (
      <group position={[0, -0.16, 0.007]} scale={0.6 + 0.4 * stamped} rotation={[0, 0, -0.08]}>
        <Label text={"FILED\nOCT 8 1945"} position={[0, 0, 0]} width={0.32} fg="#c8322a" bg="#f6f0e0" appear={dateAppear} />
      </group>
    )}
  </group>
);

// A wooden-handled rubber stamp; `lift` 0..1 above the desk.
export const HandStamp: React.FC<{ position: Vec3; lift: number }> = ({ position, lift }) => (
  <group position={[position[0], position[1] + lift * 0.22, position[2]]}>
    <InkBox size={[0.12, 0.03, 0.08]} position={[0, 0.015, 0]} color="#2a2a2a" ink={0.004} />
    <InkBox size={[0.1, 0.03, 0.07]} position={[0, 0.045, 0]} color="#8a5a2a" ink={0.004} />
    <InkCylinder radius={0.018} height={0.08} position={[0, 0.1, 0]} color="#6a4220" ink={0.004} />
    <Ball position={[0, 0.16, 0]} radius={0.035} color="#6a4220" ink={0.004} />
  </group>
);

// An oak office desk.
export const OakDesk: React.FC<{ position: Vec3; size?: Vec3 }> = ({ position, size = [1.4, 0.62, 0.65] }) => {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <InkBox size={[w, 0.05, d]} position={[0, h - 0.025, 0]} color="#8a5a30" ink={0.01} />
      <InkBox size={[0.4, h - 0.05, d - 0.06]} position={[-w / 2 + 0.22, (h - 0.05) / 2, 0]} color="#7a4a26" ink={0.008} />
      <InkBox size={[0.4, h - 0.05, d - 0.06]} position={[w / 2 - 0.22, (h - 0.05) / 2, 0]} color="#7a4a26" ink={0.008} />
      {[0.15, 0.32].map((y) => (
        <group key={y}>
          <InkBox size={[0.3, 0.012, 0.01]} position={[-w / 2 + 0.22, h - y, d / 2 - 0.025]} color="#5a3418" ink={0} />
          <InkBox size={[0.3, 0.012, 0.01]} position={[w / 2 - 0.22, h - y, d / 2 - 0.025]} color="#5a3418" ink={0} />
        </group>
      ))}
    </group>
  );
};

// A green-shaded banker's desk lamp.
export const DeskLamp: React.FC<{ position: Vec3; on?: number; color?: string }> = ({ position, on = 1, color = "#2a6a3a" }) => (
  <group position={position}>
    <InkCylinder radius={0.06} height={0.02} position={[0, 0.01, 0]} color="#c8a040" ink={0.004} />
    <InkCylinder radius={0.01} height={0.22} position={[0, 0.12, 0]} color="#c8a040" ink={0.003} />
    <InkBox size={[0.24, 0.07, 0.1]} position={[0, 0.25, 0.02]} rotation={[0.15, 0, 0]} color={color} ink={0.005} />
    <mesh position={[0, 0.215, 0.03]}>
      <planeGeometry args={[0.2, 0.02]} />
      <meshBasicMaterial color={new THREE.Color("#fff0b0").multiplyScalar(0.5 + on)} toneMapped={false} />
    </mesh>
    {on > 0 && <Halo position={[0, 0.2, 0.05]} size={0.6} color="#ffd890" strength={0.3 * on} />}
  </group>
);

// A stack of books with a title on the front of the top one.
export const BookStack: React.FC<{ position: Vec3; titles?: string[]; rotationY?: number }> = ({ position, titles = [], rotationY = 0 }) => {
  const cols = ["#7a2a22", "#2a4a6a", "#3a5a2a", "#8a6a2a", "#4a2a4a"];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: Math.max(3, titles.length) }, (_, i) => (
        <group key={i} position={[(rand(i, 4) - 0.5) * 0.03, 0.025 + i * 0.05, 0]} rotation={[0, (rand(i, 5) - 0.5) * 0.2, 0]}>
          <InkBox size={[0.3, 0.045, 0.22]} position={[0, 0, 0]} color={cols[i % cols.length]} ink={0.004} />
          {titles[i] && <Label text={titles[i]} position={[0, 0, 0.112]} width={0.26} bg={cols[i % cols.length]} fg="#f4e8c8" border={false} />}
        </group>
      ))}
    </group>
  );
};

// An open book lying on a table; `page` 0..1 turns the right page over.
export const OpenBook: React.FC<{ position: Vec3; rotation?: Vec3; page?: number }> = ({ position, rotation = [0, 0, 0], page = 0 }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.18, 0.012, 0.24]} position={[-0.09, 0.006, 0]} rotation={[0, 0, 0.06]} color="#f6efda" ink={0.003} />
    <InkBox size={[0.18, 0.012, 0.24]} position={[0.09, 0.006, 0]} rotation={[0, 0, -0.06]} color="#f6efda" ink={0.003} />
    {Array.from({ length: 5 }, (_, i) => (
      <InkBox key={i} size={[0.13, 0.002, 0.008]} position={[-0.09, 0.014, -0.08 + i * 0.04]} color="#8a8070" ink={0} shadows={false} />
    ))}
    <group position={[0, 0.014, 0]} rotation={[0, 0, page * Math.PI * 0.96]}>
      <InkBox size={[0.17, 0.003, 0.23]} position={[0.085, 0, 0]} color="#fbf5e4" ink={0.002} />
    </group>
  </group>
);

// A night window: dark blue sky, a moon, panes.
export const NightWindow: React.FC<{ position: Vec3; size?: [number, number] }> = ({ position, size = [0.8, 1.0] }) => (
  <group position={position}>
    <InkBox size={[size[0] + 0.1, size[1] + 0.1, 0.05]} position={[0, 0, -0.01]} color="#5a3a22" ink={0.008} />
    <mesh position={[0, 0, 0.018]}>
      <planeGeometry args={size} />
      <meshBasicMaterial color="#1a2448" toneMapped={false} />
    </mesh>
    <mesh position={[size[0] * 0.22, size[1] * 0.25, 0.02]}>
      <circleGeometry args={[0.07, 24]} />
      <meshBasicMaterial color="#f4ecc8" toneMapped={false} />
    </mesh>
    {[...Array(9)].map((_, i) => (
      <mesh key={i} position={[(rand(i, 9) - 0.5) * size[0] * 0.9, (rand(i, 10) - 0.5) * size[1] * 0.9, 0.019]}>
        <circleGeometry args={[0.006, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    ))}
    <InkBox size={[0.03, size[1], 0.03]} position={[0, 0, 0.03]} color="#5a3a22" ink={0} />
    <InkBox size={[size[0], 0.03, 0.03]} position={[0, 0, 0.03]} color="#5a3a22" ink={0} />
  </group>
);

// ---------- the factory ----------

// A wall counter board: a black panel with white digits; `count` 0..1 counts it up.
export const CounterBoard: React.FC<{ position: Vec3; text: string; count?: number; appear?: number; width?: number }> = ({ position, text, count, appear, width = 0.9 }) => (
  <group position={position}>
    <InkBox size={[width + 0.08, width * 0.25 * text.split("\n").length + 0.08, 0.04]} position={[0, 0, -0.03]} color="#2a2a2e" ink={0.008} />
    <Label text={text} position={[0, 0, 0.0]} width={width} count={count} appear={appear} bg="#1a1a1e" fg="#f4ecd0" border={false} />
  </group>
);

// ---------- the 1947 kitchen ----------

// The first microwave oven: a steel cabinet about 6 ft tall (drawn to the puppets' scale), a small door with a window,
// dials, a water pipe at the back; `hum` makes the window glow.
export const FirstOven: React.FC<{ position: Vec3; height?: number; hum?: number; frame?: number; labels?: boolean }> = ({ position, height = 1.5, hum = 0, frame = 0, labels = true }) => (
  <group position={position}>
    <InkBox size={[0.7, height, 0.62]} position={[0, height / 2, 0]} color="#9aa4a8" ink={0.012} />
    <InkBox size={[0.6, 0.04, 0.6]} position={[0, height + 0.012, 0.02]} color="#7a8488" ink={0.006} />
    {/* door */}
    <InkBox size={[0.5, 0.4, 0.03]} position={[0, height * 0.6, 0.32]} color="#b8c0c4" ink={0.006} />
    <mesh position={[0, height * 0.6, 0.337]}>
      <planeGeometry args={[0.36, 0.26]} />
      <meshBasicMaterial color={new THREE.Color("#1a2a2a").lerp(new THREE.Color("#ffd890"), hum * (0.8 + 0.2 * Math.sin(frame * 0.4)))} toneMapped={false} />
    </mesh>
    <InkBox size={[0.06, 0.12, 0.04]} position={[0.2, height * 0.6, 0.35]} color="#2a2a2a" ink={0.004} />
    {/* control panel */}
    <InkBox size={[0.56, 0.22, 0.02]} position={[0, height * 0.32, 0.32]} color="#3a4246" ink={0.004} />
    {[-0.16, 0, 0.16].map((x) => (
      <InkCylinder key={x} radius={0.035} height={0.03} position={[x, height * 0.32, 0.34]} rotation={[Math.PI / 2, 0, 0]} color="#e8e0d0" ink={0.004} />
    ))}
    {/* vents */}
    {[0, 1, 2, 3].map((i) => (
      <InkBox key={i} size={[0.5, 0.012, 0.01]} position={[0, 0.15 + i * 0.04, 0.315]} color="#5a6468" ink={0} />
    ))}
    {/* water pipe */}
    <InkCylinder radius={0.025} height={height + 0.6} position={[0.3, (height + 0.6) / 2, -0.33]} color="#b87a3a" ink={0.004} />
    {labels && <Label text="FIRST OVEN" position={[0, height * 0.84, 0.32]} width={0.5} bg="#f0ead8" />}
  </group>
);

// A height mark on the wall: a tick and "6 FT".
export const HeightMark: React.FC<{ position: Vec3; text?: string; appear?: number }> = ({ position, text = "6 FT", appear }) => (
  <group position={position}>
    <InkBox size={[0.22, 0.02, 0.01]} position={[0, 0, 0]} color="#161212" ink={0} />
    <Label text={text} position={[0, 0.09, 0.005]} width={0.24} appear={appear} bg="#fff6dc" />
  </group>
);

// A big platform scale: an iron deck the oven stands on and a round dial on a post with a needle (`needle` 0..1 of
// a turn), and a reading card under the dial.
export const PlatformScale: React.FC<{ position: Vec3; needle: number; reading?: string; appear?: number }> = ({ position, needle, reading = "750 LB", appear }) => (
  <group position={position}>
    <InkBox size={[0.92, 0.1, 0.8]} position={[0, 0.05, 0]} color="#3a4a52" ink={0.01} />
    <InkBox size={[0.86, 0.02, 0.74]} position={[0, 0.11, 0]} color="#5a6a72" ink={0.004} />
    <InkBox size={[0.06, 0.62, 0.06]} position={[0.58, 0.31, 0.3]} color="#3a4a52" ink={0.006} />
    <group position={[0.58, 0.72, 0.31]}>
      <InkCylinder radius={0.17} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#c8a040" ink={0.006} />
      <mesh position={[0, 0, 0.027]}>
        <circleGeometry args={[0.145, 40]} />
        <meshBasicMaterial color="#fff6dc" toneMapped={false} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.12, Math.cos((i / 12) * Math.PI * 2) * 0.12, 0.029]} rotation={[0, 0, -(i / 12) * Math.PI * 2]}>
          <planeGeometry args={[0.008, 0.03]} />
          <meshBasicMaterial color="#161212" />
        </mesh>
      ))}
      <group position={[0, 0, 0.032]} rotation={[0, 0, -needle * Math.PI * 2]}>
        <mesh position={[0, 0.055, 0]}>
          <planeGeometry args={[0.014, 0.11]} />
          <meshBasicMaterial color="#d62828" />
        </mesh>
      </group>
      <Ball position={[0, 0, 0.034]} radius={0.015} color="#161212" ink={0} />
    </group>
    <Label text={reading} position={[0.58, 0.47, 0.335]} width={0.3} appear={appear} bg="#161212" fg="#fff6dc" />
  </group>
);

// A soup pot.
export const Pot: React.FC<{ position: Vec3; color?: string; r?: number }> = ({ position, color = "#9aa4a8", r = 0.14 }) => (
  <group position={position}>
    <InkCylinder radius={r} height={r * 1.3} position={[0, r * 0.65, 0]} color={color} ink={0.006} />
    <InkCylinder radius={r * 1.05} height={0.02} position={[0, r * 1.32, 0]} color="#6a7478" ink={0.004} />
    <Stick a={[-r, r * 1.0, 0]} b={[-r - 0.06, r * 1.05, 0]} radius={0.012} color="#2a2a2a" />
    <Stick a={[r, r * 1.0, 0]} b={[r + 0.06, r * 1.05, 0]} radius={0.012} color="#2a2a2a" />
  </group>
);

// ---------- the 1967 kitchen ----------

// A 1967 countertop microwave: wood-grain cabinet, a window door and a dial panel on the right.
export const CountertopOven: React.FC<{ position: Vec3; on?: number; frame?: number }> = ({ position, on = 0, frame = 0 }) => (
  <group position={position}>
    <InkBox size={[0.56, 0.34, 0.38]} position={[0, 0.17, 0]} color="#8a5a32" ink={0.008} />
    <InkBox size={[0.36, 0.26, 0.02]} position={[-0.08, 0.17, 0.195]} color="#c8c0b0" ink={0.004} />
    <mesh position={[-0.08, 0.17, 0.207]}>
      <planeGeometry args={[0.28, 0.18]} />
      <meshBasicMaterial color={new THREE.Color("#2a2a2a").lerp(new THREE.Color("#ffe0a0"), on * (0.85 + 0.15 * Math.sin(frame * 0.5)))} toneMapped={false} />
    </mesh>
    <InkBox size={[0.13, 0.26, 0.02]} position={[0.2, 0.17, 0.195]} color="#d8d0c0" ink={0.004} />
    {[0.24, 0.12].map((y) => (
      <InkCylinder key={y} radius={0.03} height={0.025} position={[0.2, y, 0.21]} rotation={[Math.PI / 2, 0, 0]} color="#3a3a3a" ink={0.003} />
    ))}
  </group>
);

// A price tag hanging off a string from `hook`.
export const HangTag: React.FC<{ hook: Vec3; text: string; appear?: number; swing?: number; drop?: number }> = ({ hook, text, appear, swing = 0, drop = 0.1 }) => (
  <group position={hook} rotation={[0, 0, swing]}>
    <Stick a={[0, 0, 0]} b={[0, -drop, 0]} radius={0.003} color="#f4f0e6" ink={0.002} />
    <Label text={text} position={[0, -drop - 0.06, 0.005]} width={0.26} appear={appear} bg="#fff2a8" />
  </group>
);

// Pastel kitchen cabinets along the back wall: base units with a counter top at `top`, wall units above.
export const Cabinets: React.FC<{ position: Vec3; width?: number; top?: number; color?: string; counter?: string }> = ({ position, width = 3, top = 0.62, color = "#8fd0c4", counter = "#f4ecd8" }) => {
  const n = Math.round(width / 0.5);
  return (
    <group position={position}>
      <InkBox size={[width, top - 0.04, 0.55]} position={[0, (top - 0.04) / 2, 0]} color={color} ink={0.01} />
      <InkBox size={[width + 0.04, 0.04, 0.6]} position={[0, top - 0.02, 0.02]} color={counter} ink={0.006} />
      {Array.from({ length: n }, (_, i) => (
        <group key={i}>
          <InkBox size={[0.44, top - 0.14, 0.02]} position={[-width / 2 + 0.25 + i * 0.5, (top - 0.04) / 2, 0.285]} color={color} ink={0.004} />
          <InkBox size={[0.08, 0.02, 0.02]} position={[-width / 2 + 0.25 + i * 0.5, top - 0.14, 0.3]} color="#e8e0d0" ink={0.002} />
          <InkBox size={[0.44, 0.5, 0.32]} position={[-width / 2 + 0.25 + i * 0.5, top + 0.9, -0.1]} color={color} ink={0.006} />
        </group>
      ))}
    </group>
  );
};

// ---------- the living room ----------

// A present-day microwave glowing on a shelf; `on` lights the cavity.
export const ModernMicrowave: React.FC<{ position: Vec3; on?: number; frame?: number }> = ({ position, on = 1, frame = 0 }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.3, 0.36]} position={[0, 0.15, 0]} color="#2a2a30" ink={0.008} />
    <mesh position={[-0.06, 0.15, 0.182]}>
      <planeGeometry args={[0.32, 0.2]} />
      <meshBasicMaterial color={new THREE.Color("#3a2a1a").lerp(new THREE.Color("#ffd080"), on * (0.9 + 0.1 * Math.sin(frame * 0.6)))} toneMapped={false} />
    </mesh>
    <mesh position={[0.18, 0.22, 0.182]}>
      <planeGeometry args={[0.08, 0.03]} />
      <meshBasicMaterial color="#5aff9a" toneMapped={false} />
    </mesh>
    {on > 0 && <Halo position={[-0.06, 0.15, 0.2]} size={0.7} color="#ffc070" strength={0.25 * on} />}
  </group>
);

// A bowl heaped with popcorn.
export const PopcornBowl: React.FC<{ position: Vec3; seed?: number }> = ({ position, seed = 2 }) => (
  <group position={position}>
    <mesh castShadow>
      <sphereGeometry args={[0.13, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      <meshToonMaterial color="#c8322a" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <mesh>
      <sphereGeometry args={[0.138, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {Array.from({ length: 14 }, (_, i) => {
      const a = rand(i, seed) * Math.PI * 2;
      const r = rand(i, seed + 1) * 0.1;
      return <Ball key={i} position={[Math.cos(a) * r, 0.01 + (0.1 - r) * 0.5, Math.sin(a) * r]} radius={0.025} color="#fff6dc" ink={0.003} />;
    })}
  </group>
);

// A low coffee table.
export const CoffeeTable: React.FC<{ position: Vec3; size?: Vec3; color?: string }> = ({ position, size = [1.0, 0.36, 0.5], color = "#6a4a3a" }) => {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <InkBox size={[w, 0.04, d]} position={[0, h - 0.02, 0]} color={color} ink={0.008} />
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, h - 0.04, 0.04]} position={[sx * (w / 2 - 0.05), (h - 0.04) / 2, sz * (d / 2 - 0.05)]} color="#3a2a20" ink={0.004} />))}
    </group>
  );
};

// A plump sofa facing the camera, seat top at HIP_HEIGHT (0.34 m): seat a puppet at its front edge (z + 0.32).
export const Settee: React.FC<{ position: Vec3; width?: number; color?: string }> = ({ position, width = 1.6, color = "#a8506a" }) => (
  <group position={position}>
    <InkBox size={[width, 0.28, 0.6]} position={[0, 0.14, 0]} color={color} ink={0.01} />
    <InkBox size={[width, 0.5, 0.16]} position={[0, 0.45, -0.24]} color={color} ink={0.01} />
    <InkBox size={[0.16, 0.42, 0.62]} position={[-width / 2 + 0.08, 0.21, 0.0]} color={color} ink={0.008} />
    <InkBox size={[0.16, 0.42, 0.62]} position={[width / 2 - 0.08, 0.21, 0.0]} color={color} ink={0.008} />
    <InkBox size={[width - 0.34, 0.06, 0.5]} position={[0, 0.31, 0.03]} color="#c06a84" ink={0.005} />
  </group>
);
