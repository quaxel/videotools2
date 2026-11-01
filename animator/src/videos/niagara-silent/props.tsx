import React from "react";
import { InkBox, InkCylinder, toonRamp } from "../../engine";
import { Blob } from "../../three/BalloonSets";

type Vec3 = [number, number, number];

// Props for "The Day Niagara Falls Went Silent".

// A chestnut horse in the inked cel style, built facing +x, hooves on y = 0. `phase` drives a trot (diagonal leg
// pairs), `rear` 0..1 lifts it onto its hind legs, `run` scales the stride. Saddle top at HORSE.saddle.
export const HORSE = { saddle: 1.24 };
const COAT = "#a8623a";
const DARK = "#3a2418";

const Leg: React.FC<{ at: Vec3; swing: number; bend: number; color?: string }> = ({ at, swing, bend, color = COAT }) => (
  <group position={at} rotation={[0, 0, swing]}>
    <InkCylinder radius={0.065} height={0.42} position={[0, -0.21, 0]} color={color} ink={0.012} />
    <group position={[0, -0.42, 0]} rotation={[0, 0, bend]}>
      <InkCylinder radius={0.045} height={0.36} position={[0, -0.18, 0]} color={color} ink={0.012} />
      <InkBox size={[0.13, 0.08, 0.11]} position={[0.02, -0.38, 0]} color={DARK} ink={0.01} />
    </group>
  </group>
);

export const Horse: React.FC<{ phase: number; rear?: number; run?: number; saddle?: string }> = ({ phase, rear = 0, run = 1, saddle = "#7a2a22" }) => {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const bob = Math.abs(c) * 0.04 * run;
  const leg = (p: number) => Math.sin(phase + p) * 0.45 * run;
  const knee = (p: number) => Math.max(0, Math.sin(phase + p + 0.8)) * 0.9 * run;
  return (
    // rear: pivot round the hind hooves
    <group position={[-0.45, 0, 0]} rotation={[0, 0, rear * 0.75]}>
      <group position={[0.45, bob, 0]}>
        {/* legs: front pair at x 0.38, hind pair at x -0.42; diagonal pairs move together */}
        <Leg at={[0.38, 0.84, 0.12]} swing={leg(0) - rear * 1.2} bend={-knee(0) - rear * 1.2} />
        <Leg at={[0.38, 0.84, -0.12]} swing={leg(Math.PI) - rear * 0.9} bend={-knee(Math.PI) - rear * 1.4} color="#965632" />
        <Leg at={[-0.42, 0.84, 0.12]} swing={leg(Math.PI) * 0.8 - rear * 0.75} bend={knee(Math.PI) * 0.6} />
        <Leg at={[-0.42, 0.84, -0.12]} swing={leg(0) * 0.8 - rear * 0.75} bend={knee(0) * 0.6} color="#965632" />
        {/* barrel, chest and rump */}
        <Blob position={[0, 0.98, 0]} scale={[0.62, 0.27, 0.24]} color={COAT} ink={0.05} />
        <Blob position={[0.36, 1.0, 0]} scale={[0.26, 0.28, 0.23]} color={COAT} ink={0.05} />
        <Blob position={[-0.4, 1.02, 0]} scale={[0.28, 0.27, 0.25]} color={COAT} ink={0.05} />
        {/* neck and head */}
        <group position={[0.5, 1.12, 0]} rotation={[0, 0, -0.75 + s * 0.05 * run + rear * 0.3]}>
          <Blob position={[0, 0.26, 0]} scale={[0.14, 0.3, 0.13]} color={COAT} ink={0.05} />
          {/* mane */}
          <Blob position={[-0.1, 0.28, 0]} scale={[0.06, 0.28, 0.06]} color={DARK} ink={0.03} detail={0} />
          <group position={[0.02, 0.55, 0]} rotation={[0, 0, -0.95]}>
            <Blob position={[0.12, 0, 0]} scale={[0.26, 0.11, 0.1]} color={COAT} ink={0.05} />
            <Blob position={[0.32, -0.02, 0]} scale={[0.09, 0.08, 0.085]} color="#c8906a" ink={0.04} />
            {/* blaze, eye and ears */}
            <InkBox size={[0.2, 0.02, 0.05]} position={[0.2, 0.1, 0]} color="#f4ece0" ink={0} />
            {[-1, 1].map((k) => (
              <mesh key={k} position={[0.06, 0.05, k * 0.09]}>
                <sphereGeometry args={[0.022, 8, 6]} />
                <meshBasicMaterial color="#161212" />
              </mesh>
            ))}
            {[-1, 1].map((k) => (
              <mesh key={`e${k}`} position={[-0.08, 0.13, k * 0.05]} rotation={[0, 0, 0.3]}>
                <coneGeometry args={[0.035, 0.12, 6]} />
                <meshToonMaterial color={COAT} gradientMap={toonRamp} />
              </mesh>
            ))}
          </group>
        </group>
        {/* tail */}
        <group position={[-0.66, 1.06, 0]} rotation={[0, 0, 0.6 + Math.sin(phase * 0.5) * 0.25 * run]}>
          <Blob position={[0, -0.25, 0]} scale={[0.07, 0.3, 0.06]} color={DARK} ink={0.03} detail={0} />
        </group>
        {/* saddle blanket and saddle */}
        <InkBox size={[0.5, 0.05, 0.52]} position={[-0.02, 1.22, 0]} color="#3a5a7a" ink={0.012} />
        <InkBox size={[0.36, 0.08, 0.34]} position={[-0.02, 1.27, 0]} color={saddle} ink={0.012} />
      </group>
    </group>
  );
};

// A brass pocket watch lying face up, its hands sweeping round `hours` hours (lid open behind it).
export const PocketWatch: React.FC<{ position: Vec3; hours: number; scale?: number; rotation?: Vec3 }> = ({ position, hours, scale = 1, rotation = [0, 0, 0] }) => {
  const r = 0.14;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <InkCylinder radius={r} height={0.04} position={[0, 0.02, 0]} color="#d8a838" ink={0.008} />
      <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.88, 40]} />
        <meshToonMaterial color="#fbf6e6" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <InkBox key={i} size={[0.008, 0.002, i % 3 ? 0.014 : 0.026]} position={[Math.sin(a) * r * 0.74, 0.044, -Math.cos(a) * r * 0.74]} rotation={[0, -a, 0]} color="#161212" ink={0} />;
      })}
      {/* hour hand and minute hand */}
      <group position={[0, 0.047, 0]} rotation={[0, -(hours / 12) * Math.PI * 2, 0]}>
        <InkBox size={[0.012, 0.003, 0.07]} position={[0, 0, -0.035]} color="#161212" ink={0} />
      </group>
      <group position={[0, 0.05, 0]} rotation={[0, -hours * Math.PI * 2, 0]}>
        <InkBox size={[0.008, 0.003, 0.105]} position={[0, 0, -0.052]} color="#8a1a14" ink={0} />
      </group>
      {/* bow and crown, the open lid standing behind */}
      <InkCylinder radius={0.018} height={0.04} position={[0, 0.02, -r - 0.015]} rotation={[Math.PI / 2, 0, 0]} color="#d8a838" ink={0.004} />
      <mesh position={[0, 0.03, -r - 0.05]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.03, 0.006, 6, 20]} />
        <meshToonMaterial color="#d8a838" gradientMap={toonRamp} />
      </mesh>
      <group position={[0, 0.04, -r]} rotation={[-1.9, 0, 0]}>
        <InkCylinder radius={r} height={0.02} position={[0, 0, r]} rotation={[0, 0, 0]} color="#e8b848" ink={0.006} />
      </group>
    </group>
  );
};

// An old flintlock musket (drawn about 1.5x so it reads), rusty barrel, dark wood stock. Origin at the middle,
// lying along +x.
export const Musket: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1.5 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.014} height={0.95} position={[0.22, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} color="#8a4a2a" ink={0.006} />
    <InkBox size={[0.62, 0.05, 0.035]} position={[-0.03, 0, 0]} color="#5a3420" ink={0.008} />
    <InkBox size={[0.26, 0.1, 0.04]} position={[-0.42, -0.03, 0]} rotation={[0, 0, 0.18]} color="#4a2a18" ink={0.008} />
    <InkBox size={[0.06, 0.05, 0.05]} position={[-0.2, 0.04, 0]} color="#6a6a64" ink={0.005} />
    {/* rust blotches */}
    {[0.1, 0.35, 0.55].map((x) => (
      <Blob key={x} position={[x, 0.02, 0.01]} scale={[0.03, 0.018, 0.018]} color="#b0582a" ink={0} detail={0} />
    ))}
  </group>
);

// A small silver fish stranded in a puddle, flopping: `t` frames since it started.
export const Fish: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => {
  const hop = Math.max(0, Math.sin(t * 0.32)) * 0.22;
  const flip = Math.sin(t * 0.32) * 0.9;
  return (
    <group position={[position[0], position[1] + hop, position[2]]} rotation={[flip, t * 0.05, Math.sin(t * 0.64) * 0.4]}>
      <Blob position={[0, 0.05, 0]} scale={[0.16, 0.06, 0.035]} color="#b8c8d0" ink={0.02} />
      <mesh position={[-0.18, 0.05, 0]} rotation={[0, 0, Math.PI / 2 + Math.sin(t * 0.9) * 0.4]}>
        <coneGeometry args={[0.06, 0.08, 3]} />
        <meshToonMaterial color="#8aa0b0" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0.1, 0.07, 0.03]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshBasicMaterial color="#161212" />
      </mesh>
    </group>
  );
};

// A lantern hanging by a door: dark frame, warm glass and a point light.
export const Lantern: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[0.16, 0.24, 0.16]} color="#2a2018" ink={0.006} />
    <mesh>
      <sphereGeometry args={[0.07, 12, 10]} />
      <meshBasicMaterial color="#ffe0a0" toneMapped={false} />
    </mesh>
    <pointLight color="#ffb05a" intensity={3 * (0.9 + 0.1 * Math.sin(frame * 0.5))} distance={7} decay={1.5} />
  </group>
);

// A wide-brimmed hat tumbling through the air (ghost).
export const FlyingHat: React.FC<{ position: Vec3; spin: number; color?: string }> = ({ position, spin, color = "#2e2620" }) => (
  <group position={position} rotation={[spin, spin * 0.6, spin * 0.3]} userData={{ ghost: true }}>
    <InkCylinder radius={0.2} height={0.02} color={color} ink={0.008} />
    <InkCylinder radius={0.1} height={0.1} position={[0, 0.06, 0]} color={color} ink={0.008} />
  </group>
);

// A falling drop of water.
export const Drop: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh scale={[1, 1.4, 1]}>
      <sphereGeometry args={[0.03, 10, 8]} />
      <meshToonMaterial color="#9ad0f0" gradientMap={toonRamp} />
    </mesh>
  </group>
);

