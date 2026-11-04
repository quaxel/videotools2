import React from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, Label, toonRamp } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// Props for "The King's Sticks": the plain wooden stick (drawn ~1.6x thick so it reads on a phone), a knife and its
// shavings, the woodshed's log pile, stump and axe, the measuring board with an hourglass, and the rack of untouched
// sticks.

type Vec3 = [number, number, number];

export const STICK = 0.6; // every stick's length
export const SHORT = STICK - 0.075; // the shaved stick, drawn ~3x the real inch (plan.json format_note)
const WOOD = "#d9b27a";
const GRAIN = "#8a5a2a";

// A plain stick along its local y axis, centred. `shaved` marks the cut end (top) pale and squared.
export const Stick: React.FC<{ position: Vec3; rotation?: Vec3; length?: number; shaved?: boolean; radius?: number }> = ({ position, rotation = [0, 0, 0], length = STICK, shaved = false, radius = 0.022 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={radius} height={length} color={WOOD} ink={0.006} />
    {/* end grain and a knot */}
    <mesh position={[0, -length / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius * 0.9, 20]} />
      <meshBasicMaterial color={GRAIN} />
    </mesh>
    <mesh position={[0, length / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius * 0.9, 20]} />
      <meshBasicMaterial color={shaved ? "#f6e2b8" : GRAIN} />
    </mesh>
    <mesh position={[radius * 0.98, length * 0.12, 0]} scale={[0.3, 1, 0.6]}>
      <sphereGeometry args={[radius * 0.6, 10, 8]} />
      <meshToonMaterial color={GRAIN} gradientMap={toonRamp} />
    </mesh>
    {shaved && (
      <mesh position={[0, length / 2 - 0.012, 0]}>
        <cylinderGeometry args={[radius * 1.02, radius * 1.02, 0.024, 20, 1, true]} />
        <meshToonMaterial color="#f6e2b8" gradientMap={toonRamp} />
      </mesh>
    )}
  </group>
);

// A stick held in a puppet's hand: `hand` is the world point (handWorld), `cam` the camera position. The stick stands
// a little in front of the card so the drawing never hides it; `grip` is how far up the stick the hand holds it.
export const HeldStick: React.FC<{ hand: Vec3; cam: Vec3; tilt?: number; length?: number; grip?: number; shaved?: boolean }> = ({ hand, cam, tilt = 0, length = STICK, grip = 0.72, shaved }) => {
  const d = new THREE.Vector3(cam[0] - hand[0], 0, cam[2] - hand[2]).normalize();
  const yaw = Math.atan2(d.x, d.z);
  const up = length * (0.5 - grip);
  const p: Vec3 = [hand[0] + d.x * 0.04 - Math.sin(tilt) * up * Math.cos(yaw), hand[1] + Math.cos(tilt) * up, hand[2] + d.z * 0.04 + Math.sin(tilt) * up * Math.sin(yaw)];
  return (
    <group userData={{ ghost: true }}>
      <Stick position={p} rotation={[0, yaw, tilt]} length={length} shaved={shaved} />
    </group>
  );
};

// A small knife: steel blade, wooden handle; points along +x.
export const Knife: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.1, 0.022, 0.012]} position={[-0.05, 0, 0]} color="#5a3420" ink={0.004} />
    <mesh position={[0.06, 0.002, 0]}>
      <boxGeometry args={[0.12, 0.02, 0.003]} />
      <meshToonMaterial color="#d8dee4" gradientMap={toonRamp} emissive="#222" />
    </mesh>
  </group>
);

// Curly wood shavings lying in a little pile (`n` of them, seeded).
export const Shavings: React.FC<{ position: Vec3; n?: number; spread?: number; seed?: number }> = ({ position, n = 14, spread = 0.12, seed = 1 }) => {
  const r = (i: number) => {
    const s = Math.sin((i + seed * 31) * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  return (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[(r(i) - 0.5) * spread, 0.006 + r(i + 50) * 0.01, (r(i + 9) - 0.5) * spread]} rotation={[Math.PI / 2, r(i + 3) * 6, r(i + 4) * 6]}>
          <torusGeometry args={[0.012 + r(i + 7) * 0.008, 0.0035, 6, 14, Math.PI * 1.4]} />
          <meshToonMaterial color={i % 3 ? "#f2d9a8" : "#e2c08a"} gradientMap={toonRamp} />
        </mesh>
      ))}
    </group>
  );
};

// A shaving curling off the blade and falling: `t` frames since the stroke, from `at`.
export const FallingCurl: React.FC<{ at: Vec3; t: number; seed?: number }> = ({ at, t, seed = 0 }) => {
  if (t < 0 || t > 40) return null;
  const s = t / 30;
  return (
    <mesh position={[at[0] + s * 0.06 * Math.cos(seed), Math.max(0.01, at[1] - 4.9 * s * s * 0.5), at[2] + s * 0.05 * Math.sin(seed)]} rotation={[t * 0.3 + seed, t * 0.2, 0]}>
      <torusGeometry args={[0.014, 0.004, 6, 14, Math.PI * 1.4]} />
      <meshToonMaterial color="#f2d9a8" gradientMap={toonRamp} />
    </mesh>
  );
};

// ---------- woodshed ----------

export const LogPile: React.FC<{ position: Vec3; rows?: number; width?: number }> = ({ position, rows = 5, width = 1.6 }) => (
  <group position={position}>
    {Array.from({ length: rows }, (_, row) => {
      const n = rows - Math.floor(row / 2) + 2;
      return Array.from({ length: n }, (_, i) => (
        <InkCylinder
          key={`${row}-${i}`}
          radius={0.11}
          height={width * (0.9 + ((i * 7 + row) % 3) * 0.05)}
          position={[(i - (n - 1) / 2) * 0.23 + (row % 2) * 0.11, 0.11 + row * 0.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color={(i + row) % 2 ? "#8a5a32" : "#9a6a3a"}
          ink={0.008}
        />
      ));
    })}
  </group>
);

// A chopping stump with an axe; `chop` 0..1 is the axe's swing (0 resting in the stump, 1 raised).
export const StumpAxe: React.FC<{ position: Vec3; chop?: number }> = ({ position, chop = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.24} height={0.42} position={[0, 0.21, 0]} color="#7a5230" ink={0.01} />
    <mesh position={[0, 0.422, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.06, 0.2, 24]} />
      <meshBasicMaterial color="#c89a62" />
    </mesh>
    <group position={[0.05, 0.42, 0]} rotation={[0, 0, 0.5 + chop * 1.6]} userData={{ ghost: true }}>
      <InkCylinder radius={0.018} height={0.7} position={[0, 0.35, 0]} color="#b08050" ink={0.005} />
      <InkBox size={[0.16, 0.12, 0.03]} position={[-0.06, 0.66, 0]} color="#8a9098" ink={0.006} />
    </group>
  </group>
);

// A bundle of identical sticks tied with twine, standing (or lying with `lying`).
export const Bundle: React.FC<{ position: Vec3; count?: number; lying?: boolean; rotationY?: number }> = ({ position, count = 12, lying = false, rotationY = 0 }) => (
  <group position={position} rotation={lying ? [0, rotationY, Math.PI / 2] : [0, rotationY, 0]}>
    {Array.from({ length: count }, (_, i) => {
      const a = i * 2.4;
      const rr = 0.03 + (i % 3) * 0.022;
      return <Stick key={i} position={[Math.cos(a) * rr, STICK / 2, Math.sin(a) * rr]} />;
    })}
    {[0.18, 0.42].map((y) => (
      <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.008, 6, 24]} />
        <meshToonMaterial color="#c8a868" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// ---------- the measuring bench ----------

// A board with an inch scale (tick marks only, no numbers to be cut by the frame), for a stick lying along it (x from -0.35 to +0.35).
export const RulerBoard: React.FC<{ position: Vec3 }> = ({ position }) => {
  const tex = useOwned(() =>
    canvasTexture(1024, 160, (ctx) => {
      ctx.fillStyle = "#f2e2b8";
      ctx.fillRect(0, 0, 1024, 160);
      ctx.fillStyle = "#2a1e14";
      for (let i = 0; i <= 28; i++) {
        const x = 32 + i * (960 / 28);
        ctx.fillRect(x - 2, 0, 4, i % 4 === 0 ? 70 : 38);
      }
    }),
  );
  return (
    <group position={position}>
      <InkBox size={[0.84, 0.03, 0.14]} position={[0, 0.015, 0]} color="#ffffff" ink={0.006} map={tex} />
    </group>
  );
};

// An hourglass whose sand runs down with `p` (0..1); `flip` turns it over.
export const Hourglass: React.FC<{ position: Vec3; p: number; flip?: number }> = ({ position, p, flip = 0 }) => (
  <group position={position}>
    <group position={[0, 0.13, 0]} rotation={[0, 0, flip * Math.PI]}>
      {[-0.13, 0.13].map((y) => (
        <InkCylinder key={y} radius={0.07} height={0.02} position={[0, y, 0]} color="#7a4a24" ink={0.005} />
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, s * 0.06, 0]} rotation={[s > 0 ? Math.PI : 0, 0, 0]}>
          <coneGeometry args={[0.055, 0.12, 20, 1, true]} />
          <meshBasicMaterial color="#cfe8f0" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.03 + (1 - p) * 0.03, 0]} scale={[1 - p * 0.6, Math.max(0.05, 1 - p), 1 - p * 0.6]}>
        <coneGeometry args={[0.045, 0.06, 16]} />
        <meshToonMaterial color="#e8c070" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, -0.12 + p * 0.025, 0]} scale={[Math.max(0.1, p), Math.max(0.1, p), Math.max(0.1, p)]}>
        <coneGeometry args={[0.05, 0.05, 16]} />
        <meshToonMaterial color="#e8c070" gradientMap={toonRamp} />
      </mesh>
      <InkCylinder radius={0.003} height={0.12} position={[0, 0, 0]} color="#e8c070" ink={0} />
    </group>
  </group>
);

// A wall rack holding `count` sticks upright; `label` on a card above.
export const StickRack: React.FC<{ position: Vec3; count?: number; label?: string; appear?: number; countUp?: number }> = ({ position, count = 11, label, appear, countUp }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.06, 0.12]} position={[0, 0.06, 0]} color="#6a4428" ink={0.008} />
    <InkBox size={[0.9, 0.05, 0.08]} position={[0, 0.5, -0.02]} color="#6a4428" ink={0.008} />
    {Array.from({ length: count }, (_, i) => (
      <Stick key={i} position={[-0.38 + i * (0.76 / (count - 1)), 0.09 + STICK / 2, 0.01]} />
    ))}
    {label && <Label text={label} position={[0, 0.92, 0.04]} width={0.52} appear={appear} count={countUp} />}
  </group>
);
