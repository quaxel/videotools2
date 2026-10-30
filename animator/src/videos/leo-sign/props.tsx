import React from "react";
import * as THREE from "three";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Your Leo Friend Is Never Off Stage".

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale }) => (
  <mesh position={position} scale={scale} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// Wedding arch: two white posts and a curve of flowers.
export const FlowerArch: React.FC<{ position: Vec3; width?: number; color?: string }> = ({ position, width = 1.6, color = "#ffffff" }) => (
  <group position={position}>
    {[-1, 1].map((s) => (
      <InkCylinder key={s} radius={0.05} height={2.0} position={[(s * width) / 2, 1.0, 0]} color={color} ink={0.004} />
    ))}
    {Array.from({ length: 15 }, (_, i) => {
      const a = (i / 14) * Math.PI;
      return (
        <Ball
          key={i}
          position={[(-Math.cos(a) * width) / 2, 2.0 + Math.sin(a) * 0.5, 0]}
          radius={0.1 + (i % 3) * 0.02}
          color={["#ffffff", "#ffd1dc", "#f2c14e"][i % 3]}
        />
      );
    })}
  </group>
);

// A ring light on a stand; glows when on.
export const RingLight: React.FC<{ position: Vec3; on?: number; rotationY?: number }> = ({ position, on = 1, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkCylinder radius={0.02} height={1.5} position={[0, 0.75, 0]} color="#2a2a30" ink={0.003} />
    {[-1, 0, 1].map((k) => (
      <InkBox key={k} size={[0.03, 0.03, 0.4]} position={[Math.sin((k * 2 * Math.PI) / 3) * 0.12, 0.02, Math.cos((k * 2 * Math.PI) / 3) * 0.12]} rotation={[0, (k * 2 * Math.PI) / 3, 0]} color="#2a2a30" ink={0.003} />
    ))}
    <mesh position={[0, 1.65, 0]}>
      <torusGeometry args={[0.24, 0.035, 12, 40]} />
      {on > 0.5 ? <meshBasicMaterial color="#fff8e8" toneMapped={false} /> : <meshToonMaterial color="#cfd3da" gradientMap={toonRamp} />}
    </mesh>
  </group>
);

// A trumpet held out level, bell toward +x (flip with `dir`). `shine` adds a glint on the bell.
export const Trumpet: React.FC<{ position: Vec3; dir?: 1 | -1; scale?: number; shine?: number }> = ({ position, dir = 1, scale = 1, shine = 0 }) => (
  <group position={position} scale={[dir * scale, scale, scale]}>
    <InkCylinder radius={0.015} height={0.5} position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#e8b923" ink={0.003} />
    <InkBox size={[0.18, 0.06, 0.03]} position={[0.02, 0.05, 0]} color="#d4a017" ink={0.003} />
    {[-0.04, 0.02, 0.08].map((x) => (
      <InkCylinder key={x} radius={0.012} height={0.06} position={[x, 0.1, 0]} color="#f2d16b" ink={0.002} />
    ))}
    <mesh position={[0.42, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
      <coneGeometry args={[0.12, 0.2, 24, 1, true]} />
      <meshToonMaterial color="#f2c14e" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    {shine > 0 && (
      <mesh position={[0.53, 0.04, 0.06]}>
        <circleGeometry args={[0.012 + shine * 0.012, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={shine} toneMapped={false} />
      </mesh>
    )}
  </group>
);

// Microphone on a stand.
export const MicStand: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.14} height={0.03} position={[0, 0.015, 0]} color="#1d1a1a" ink={0.003} />
    <InkCylinder radius={0.015} height={1.35} position={[0, 0.68, 0]} color="#3a3a44" ink={0.003} />
    <Ball position={[0, 1.4, 0.03]} radius={0.045} color="#2a2a30" />
  </group>
);

// Red velvet stage curtain: a row of folds.
export const Curtain: React.FC<{ position: Vec3; width: number; height?: number; color?: string; open?: number }> = ({ position, width, height = 3, color = "#9b1c31", open = 0 }) => {
  const n = 10;
  const half = width / 2;
  return (
    <group position={position} userData={{ ghost: true }}>
      {[-1, 1].map((side) =>
        Array.from({ length: n / 2 }, (_, i) => {
          const x = side * (half - (i + 0.5) * (half / (n / 2)) * (1 - open * 0.7));
          return <InkCylinder key={`${side}${i}`} radius={(half / n) * 1.05} height={height} position={[x, height / 2, (i % 2) * 0.04]} color={i % 2 ? color : "#7a1226"} ink={0.004} />;
        }),
      )}
      <InkBox size={[width + 0.2, 0.35, 0.12]} position={[0, height + 0.05, 0.05]} color="#7a1226" />
      <InkBox size={[width + 0.2, 0.05, 0.13]} position={[0, height - 0.12, 0.06]} color="#f2c14e" ink={0.003} />
    </group>
  );
};

// A cone of light from `from` down to a pool on the floor at `to` (ghost, additive).
export const SpotBeam: React.FC<{ from: Vec3; to: Vec3; radius?: number; on?: number; color?: string }> = ({ from, to, radius = 0.55, on = 1, color = "#fff2c0" }) => {
  if (on <= 0) return null;
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().sub(b).normalize());
  return (
    <group userData={{ ghost: true }}>
      <mesh position={mid.toArray()} quaternion={q}>
        <coneGeometry args={[radius, len, 32, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.22 * on} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[to[0], 0.01, to[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5 * on} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

// A theater spotlight on a yoke, aimed by `aim` (radians around y) and `tilt` (down).
export const SpotLamp: React.FC<{ position: Vec3; aim?: number; tilt?: number; on?: number; scale?: number }> = ({ position, aim = 0, tilt = 0.6, on = 1, scale = 1 }) => (
  <group position={position} scale={scale} rotation={[0, aim, 0]}>
    <InkBox size={[0.06, 0.4, 0.06]} position={[0, -0.2, 0]} color="#2a2a30" ink={0.003} />
    <group rotation={[tilt, 0, 0]}>
      <InkCylinder radius={0.16} height={0.42} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" />
      <mesh position={[0, 0, 0.215]}>
        <circleGeometry args={[0.13, 24]} />
        <meshBasicMaterial color={on > 0.5 ? "#fff6c8" : "#3a3a44"} toneMapped={false} />
      </mesh>
    </group>
  </group>
);

// Applause meter: a half-dial green-yellow-red with a needle; `level` 0..1.
export const ApplauseMeter: React.FC<{ position: Vec3; level: number; size?: number }> = ({ position, level, size = 0.6 }) => {
  const zones = ["#3ccf6e", "#ffd23f", "#e0262f"];
  return (
    <group position={position}>
      <InkBox size={[size * 2.3, size * 1.35, 0.06]} position={[0, size * 0.45, -0.04]} color="#1d1a1a" />
      {zones.map((c, i) => (
        <mesh key={c} position={[0, 0, 0]}>
          <ringGeometry args={[size * 0.55, size, 24, 1, Math.PI - ((i + 1) * Math.PI) / 3, Math.PI / 3]} />
          <meshBasicMaterial color={c} toneMapped={false} />
        </mesh>
      ))}
      <group position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 2 - level * Math.PI]}>
        <InkBox size={[0.025, size * 0.95, 0.02]} position={[0, size * 0.47, 0]} color="#ffffff" ink={0.002} />
      </group>
      <Ball position={[0, 0, 0.03]} radius={0.05} color="#ffffff" />
    </group>
  );
};

// Dressing-room mirror with bulbs around it.
export const VanityMirror: React.FC<{ position: Vec3; size?: [number, number]; tint?: string; lit?: number }> = ({ position, size = [0.8, 1.0], tint = "#cfe6f2", lit = 1 }) => {
  const [w, h] = size;
  const bulbs: Vec3[] = [];
  for (let i = 0; i < 4; i++) {
    bulbs.push([-w / 2 - 0.06, -h / 2 + (i + 0.5) * (h / 4), 0.04], [w / 2 + 0.06, -h / 2 + (i + 0.5) * (h / 4), 0.04]);
  }
  for (let i = 0; i < 3; i++) bulbs.push([-w / 2 + (i + 0.5) * (w / 3), h / 2 + 0.06, 0.04]);
  return (
    <group position={position}>
      <InkBox size={[w + 0.24, h + 0.24, 0.05]} position={[0, 0, 0]} color="#c9962b" />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>
      <mesh position={[-w * 0.2, h * 0.15, 0.032]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[0.05, h * 0.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {bulbs.map((p, i) => (
        <Ball key={i} position={p} radius={0.035} color={lit > 0.5 ? "#fff6c8" : "#8a8a80"} glow={lit > 0.5} />
      ))}
    </group>
  );
};

// A big red heart with a beating `beat` scale.
const heartShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.3, -0.55, -0.1, -0.5, 0.2);
  s.bezierCurveTo(-0.45, 0.5, -0.05, 0.5, 0, 0.25);
  s.bezierCurveTo(0.05, 0.5, 0.45, 0.5, 0.5, 0.2);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.3, 0, -0.5);
  return s;
})();
export const BigHeart: React.FC<{ position: Vec3; size?: number; beat?: number }> = ({ position, size = 1, beat = 1 }) => (
  <group position={position} scale={size * beat}>
    <mesh castShadow>
      <extrudeGeometry args={[heartShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }]} />
      <meshToonMaterial color="#e0262f" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A bar tab: a long white receipt that unrolls down from a clip; `unroll` 0..1.
export const BarTab: React.FC<{ position: Vec3; unroll: number; length?: number }> = ({ position, unroll, length = 1.6 }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[0.3, 0.06, 0.05]} position={[0, 0, 0]} color="#c9962b" ink={0.003} />
    <InkBox size={[0.24, Math.max(0.02, unroll * length), 0.01]} position={[0, -Math.max(0.02, unroll * length) / 2 - 0.03, 0]} color="#fbfbf4" ink={0.002} />
    {Array.from({ length: Math.floor(unroll * length * 10) }, (_, i) => (
      <InkBox key={i} size={[0.16 - (i % 3) * 0.03, 0.012, 0.012]} position={[-0.02, -0.08 - i * 0.1, 0.006]} color="#4a4a50" ink={0} />
    ))}
  </group>
);

// Tray of drinks (cocktail glasses) on a small round bar table.
export const DrinksTable: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.3} height={0.03} position={[0, 0.9, 0]} color="#7a1226" ink={0.004} />
    <InkCylinder radius={0.03} height={0.88} position={[0, 0.45, 0]} color="#c9962b" ink={0.003} />
    <InkCylinder radius={0.16} height={0.02} position={[0, 0.01, 0]} color="#c9962b" ink={0.003} />
    {[-0.16, -0.05, 0.06, 0.17].map((x, i) => (
      <group key={x} position={[x, 0.92, (i % 2) * 0.1 - 0.05]}>
        <InkCylinder radius={0.006} height={0.1} position={[0, 0.05, 0]} color="#e8f4ff" ink={0.002} />
        <mesh position={[0, 0.14, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.08, 16]} />
          <meshToonMaterial color={["#ff8fc8", "#ffd23f", "#4dd2ff", "#3ccf6e"][i]} gradientMap={toonRamp} />
        </mesh>
      </group>
    ))}
  </group>
);

// Three-tier wedding cake on a table; `splat` 0..1 squashes the top tiers and flicks cream around.
export const CakeTable: React.FC<{ position: Vec3; splat?: number }> = ({ position, splat = 0 }) => {
  const squash = 1 - splat * 0.55;
  return (
    <group position={position}>
      <InkBox size={[1.3, 0.05, 0.7]} position={[0, 0.75, 0]} color="#ffd1dc" />
      <InkBox size={[1.32, 0.5, 0.02]} position={[0, 0.5, 0.35]} color="#ffb3c7" ink={0.003} />
      {[-0.55, 0.55].map((x) => (
        <InkBox key={x} size={[0.05, 0.75, 0.05]} position={[x, 0.375, 0]} color="#f2c14e" ink={0.003} />
      ))}
      <group position={[0, 0.775, 0]} scale={[1 + splat * 0.15, squash, 1 + splat * 0.15]}>
        <InkCylinder radius={0.3} height={0.2} position={[0, 0.1, 0]} color="#fffaf0" />
        <InkCylinder radius={0.22} height={0.18} position={[0, 0.29, 0]} color="#fffaf0" />
        <InkCylinder radius={0.14} height={0.16} position={[0, 0.46, 0]} color="#fffaf0" />
        {[0.2, 0.38, 0.54].map((y, i) => (
          <InkCylinder key={y} radius={[0.305, 0.225, 0.145][i]} height={0.025} position={[0, y, 0]} color="#ff8fc8" ink={0.002} />
        ))}
        {splat < 0.5 && <Ball position={[0, 0.6, 0]} radius={0.05} color="#f2c14e" />}
      </group>
      {splat > 0 &&
        Array.from({ length: 10 }, (_, i) => (
          <Ball key={i} position={[Math.cos(i * 1.7) * (0.3 + splat * 0.35), 0.8 + (i % 3) * 0.08 * splat, Math.sin(i * 1.7) * 0.25 + 0.1]} radius={0.04} color="#fffaf0" scale={[1.4, 0.6, 1]} />
        ))}
    </group>
  );
};

// The bride's train: a long white fan of fabric on the floor (ghost; puppets step on it).
export const DressTrain: React.FC<{ position: Vec3; length?: number; rotationY?: number }> = ({ position, length = 1.3, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]} userData={{ ghost: true }}>
    <mesh position={[0, 0.012, length / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[length / 2, 24, 0, Math.PI]} />
      <meshToonMaterial color="#ffffff" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <InkBox size={[0.3, 0.02, length * 0.6]} position={[0, 0.012, length * 0.25]} color="#fbfbf4" ink={0.002} />
  </group>
);

// Disco ball hanging from the ceiling, turning with `f`.
export const DiscoBall: React.FC<{ position: Vec3; f: number; lit?: number }> = ({ position, f, lit = 1 }) => (
  <group position={position}>
    <InkCylinder radius={0.008} height={0.5} position={[0, 0.45, 0]} color="#c9ced3" ink={0} />
    <group rotation={[0, f * 0.05, 0]}>
      <mesh>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshToonMaterial color={lit > 0.5 ? "#e8eef7" : "#5a5a70"} gradientMap={toonRamp} />
      </mesh>
    </group>
  </group>
);

// Photographer's camera, held up at face height (place it in front of the puppet's head).
export const PhotoCamera: React.FC<{ position: Vec3; flash?: number }> = ({ position, flash = 0 }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[0.2, 0.13, 0.08]} position={[0, 0, 0]} color="#1d1a1a" />
    <InkCylinder radius={0.05} height={0.08} position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]} color="#3a3a44" ink={0.003} />
    <InkBox size={[0.07, 0.04, 0.05]} position={[-0.05, 0.085, 0]} color="#3a3a44" ink={0.003} />
    {flash > 0 && (
      <mesh position={[-0.05, 0.085, 0.03]}>
        <circleGeometry args={[0.06 + flash * 0.25, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={flash} toneMapped={false} />
      </mesh>
    )}
  </group>
);

// A label on a post, standing on the floor (e.g. the SPOTLIGHT switch box).
export const SwitchBox: React.FC<{ position: Vec3; on: number; label: string }> = ({ position, on, label }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.7, 0.18]} position={[0, 1.2, 0]} color="#2c2c34" />
    <InkBox size={[0.08, 0.85, 0.08]} position={[0, 0.42, 0]} color="#2c2c34" ink={0.003} />
    <group position={[0, 1.2, 0.1]} rotation={[(0.5 - on) * 1.4, 0, 0]}>
      <InkBox size={[0.07, 0.32, 0.07]} position={[0, 0.16, 0]} color={on > 0.5 ? "#3ccf6e" : "#e04646"} ink={0.003} />
      <Ball position={[0, 0.34, 0]} radius={0.06} color="#e0262f" />
    </group>
    <Label text={label} position={[0, 1.7, 0.1]} width={0.75} fg="#ffffff" bg="#e0262f" />
  </group>
);
