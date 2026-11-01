import React from "react";
import * as THREE from "three";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Your Sagittarius Friend Is Always Leaving".
// Parts that touch sit at least 1 cm apart (no coplanar faces), so nothing flickers.

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale }) => (
  <mesh position={position} scale={scale} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// Round brunch table: a pancake stack, a syrup bottle and two plates.
export const BrunchTable: React.FC<{ position: Vec3; bottle?: boolean }> = ({ position, bottle = true }) => (
  <group position={position}>
    <InkCylinder radius={0.45} height={0.04} position={[0, 0.66, 0]} color="#fff6dc" />
    <InkCylinder radius={0.04} height={0.62} position={[0, 0.32, 0]} color="#3a3a44" ink={0.004} />
    <InkCylinder radius={0.2} height={0.03} position={[0, 0.015, 0]} color="#3a3a44" ink={0.004} />
    {[-0.22, 0.22].map((x) => (
      <InkCylinder key={x} radius={0.11} height={0.012} position={[x, 0.695, 0.14]} color="#ffffff" ink={0.003} />
    ))}
    {[0, 1, 2, 3].map((i) => (
      <InkCylinder key={i} radius={0.08} height={0.028} position={[-0.22, 0.725 + i * 0.03, 0.14]} color={i % 2 ? "#d9a05b" : "#e8b46f"} ink={0.002} />
    ))}
    <InkBox size={[0.035, 0.012, 0.035]} position={[-0.22, 0.85, 0.14]} color="#fff6c8" ink={0} />
    {bottle && <InkCylinder radius={0.035} height={0.14} position={[0.05, 0.755, -0.12]} color="#8a4a1a" ink={0.003} />}
    {bottle && <InkCylinder radius={0.015} height={0.04} position={[0.05, 0.85, -0.12]} color="#e04646" ink={0.002} />}
  </group>
);

// A knocked-over syrup bottle on the table top (y = 0) with a puddle spreading toward +x by `amount` (ghost).
export const SyrupSpill: React.FC<{ position: Vec3; amount: number }> = ({ position, amount }) => (
  <group position={position} userData={{ ghost: true }}>
    <group position={[-0.12, 0.045, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <InkCylinder radius={0.035} height={0.14} position={[0, 0, 0]} color="#8a4a1a" ink={0.003} />
      <InkCylinder radius={0.015} height={0.04} position={[0, 0.09, 0]} color="#e04646" ink={0.002} />
    </group>
    {amount > 0 &&
      [0, 1, 2, 3].map((k) => (
        <mesh key={k} position={[-0.02 + k * 0.06 * amount, 0.026 + k * 0.004, Math.sin(k * 1.7) * 0.03]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 1, 1]}>
          <circleGeometry args={[0.04 + amount * 0.04, 20]} />
          <meshBasicMaterial color="#a8541a" />
        </mesh>
      ))}
  </group>
);

// A phone lying flat with a screen message (ghost so it never counts as a set object).
export const FlatPhone: React.FC<{ position: Vec3; text: string; rotationY?: number }> = ({ position, text, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]} userData={{ ghost: true }}>
    <InkBox size={[0.1, 0.012, 0.18]} position={[0, 0.006, 0]} color="#1d1a1a" ink={0.002} />
    <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Label text={text} position={[0, 0, 0]} width={0.085} fg="#ffffff" bg="#2f6bff" border={false} />
    </group>
  </group>
);

// Hard-shell suitcase standing up, strapped shut, with stickers.
export const Suitcase: React.FC<{ position: Vec3; color?: string; rotationY?: number }> = ({ position, color = "#e76f51", rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.5, 0.68, 0.26]} position={[0, 0.39, 0]} color={color} />
    <InkBox size={[0.06, 0.7, 0.28]} position={[-0.12, 0.39, 0]} color="#1d1a1a" ink={0.002} />
    <InkBox size={[0.06, 0.7, 0.28]} position={[0.12, 0.39, 0]} color="#1d1a1a" ink={0.002} />
    <InkBox size={[0.2, 0.04, 0.05]} position={[0, 0.76, 0]} color="#1d1a1a" ink={0.002} />
    {[[-0.2, 0.55, "#ffd23f"], [0.2, 0.25, "#3ccf6e"], [0.19, 0.6, "#7fd3ff"]].map(([x, y, c], i) => (
      <mesh key={i} position={[x as number, y as number, 0.15]}>
        <circleGeometry args={[0.045, 16]} />
        <meshBasicMaterial color={c as string} />
      </mesh>
    ))}
    {[-0.18, 0.18].map((x) => (
      <InkCylinder key={x} radius={0.03} height={0.03} position={[x, 0.03, 0.08]} rotation={[0, 0, Math.PI / 2]} color="#1d1a1a" ink={0.002} />
    ))}
  </group>
);

// A single bed with headboard, mattress, pillow and blanket (ghost: Luna lies on it).
export const Bed: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#ffd23f" }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[1.9, 0.3, 0.95]} position={[0, 0.15, 0]} color="#8a5a3a" />
    <InkBox size={[1.84, 0.16, 0.9]} position={[0, 0.39, 0]} color="#ffffff" />
    <InkBox size={[1.2, 0.04, 0.92]} position={[0.3, 0.49, 0]} color={color} ink={0.003} />
    <InkBox size={[0.45, 0.1, 0.6]} position={[-0.65, 0.53, 0]} color="#f2f2ec" ink={0.003} />
    <InkBox size={[0.08, 0.9, 1.0]} position={[-0.98, 0.45, 0]} color="#8a5a3a" />
  </group>
);

// World map board: ocean, blob continents, pins.
const CONTINENTS: [number, number, number, number][] = [
  [-0.85, 0.25, 0.42, 0.3],
  [-0.6, -0.3, 0.22, 0.36],
  [0.05, 0.3, 0.26, 0.2],
  [0.15, -0.15, 0.24, 0.36],
  [0.7, 0.25, 0.5, 0.32],
  [0.9, -0.45, 0.22, 0.14],
];
export const WorldMap: React.FC<{ position: Vec3; pins?: number }> = ({ position, pins = 30 }) => (
  <group position={position}>
    <InkBox size={[2.6, 1.5, 0.05]} position={[0, 0, 0]} color="#7fb8e0" />
    <InkBox size={[2.74, 1.64, 0.03]} position={[0, 0, -0.03]} color="#6b4423" ink={0.003} />
    {CONTINENTS.map(([x, y, w, h], i) => (
      <mesh key={i} position={[x, y, 0.036]} scale={[w, h, 1]}>
        <circleGeometry args={[1, 24]} />
        <meshToonMaterial color="#e9d8a6" gradientMap={toonRamp} />
      </mesh>
    ))}
    {Array.from({ length: Math.max(0, Math.min(30, Math.floor(pins))) }, (_, i) => {
      const [cx, cy, w, h] = CONTINENTS[i % CONTINENTS.length];
      const a = i * 2.39;
      const r = 0.25 + ((i * 37) % 60) / 100;
      return <Ball key={i} position={[cx + Math.cos(a) * w * r * 0.8, cy + Math.sin(a) * h * r * 0.8, 0.07]} radius={0.025} color="#e0262f" />;
    })}
  </group>
);

// A party balloon on a string; `popped` 0..1 bursts it into shreds.
export const Balloon: React.FC<{ position: Vec3; color: string; f: number; popped?: number }> = ({ position, color, f, popped = 0 }) => (
  <group position={position} rotation={[0, 0, Math.sin(f / 9) * 0.06]} userData={{ ghost: true }}>
    <InkBox size={[0.006, 0.9, 0.006]} position={[0, 0.45, 0]} color="#ffffff" ink={0} />
    {popped <= 0 ? (
      <Ball position={[0, 1.05, 0]} radius={0.15} color={color} scale={[1, 1.2, 1]} />
    ) : (
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <InkBox key={i} size={[0.05, 0.03, 0.01]} position={[Math.cos(a) * popped * 0.4, 1.05 + Math.sin(a) * popped * 0.4 - popped * popped * 0.3, 0.02]} rotation={[0, 0, a + popped * 5]} color={color} ink={0} />;
      })
    )}
  </group>
);

// Tears: drops falling from a pair of eyes at `position` (ghost).
export const Tears: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position} userData={{ ghost: true }}>
    {[-0.09, 0.09].map((x) =>
      [0, 1, 2].map((k) => {
        const t = ((f + k * 7) % 20) / 20;
        return <Ball key={`${x}${k}`} position={[x + Math.sign(x) * t * 0.04, -t * 0.35, 0.05]} radius={0.018} color="#7fd3ff" glow scale={[0.8, 1.2, 0.8]} />;
      }),
    )}
  </group>
);

// Party cake on a small table; `eaten` 0..1 removes a wedge.
export const PartyCake: React.FC<{ position: Vec3; eaten?: number }> = ({ position, eaten = 0 }) => (
  <group position={position}>
    <InkBox size={[1.0, 0.05, 0.6]} position={[0, 0.72, 0]} color="#ffffff" />
    {[-0.42, 0.42].map((x) => (
      <InkBox key={x} size={[0.05, 0.7, 0.05]} position={[x, 0.35, 0]} color="#e0447a" ink={0.003} />
    ))}
    <mesh position={[0, 0.855, 0]} rotation={[0, eaten * Math.PI, 0]} castShadow>
      <cylinderGeometry args={[0.25, 0.25, 0.2, 32, 1, false, 0, Math.PI * 2 * (1 - eaten * 0.5)]} />
      <meshToonMaterial color="#fffaf0" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <InkCylinder radius={0.255} height={0.04} position={[0, 0.88, 0]} color="#7b2cbf" ink={0} />
    {eaten < 0.5 && <Ball position={[0, 0.99, 0]} radius={0.04} color="#e0262f" />}
  </group>
);

// Gate desk with a boarding screen on a post.
export const GateDesk: React.FC<{ position: Vec3; text: string }> = ({ position, text }) => (
  <group position={position}>
    <InkBox size={[1.3, 0.8, 0.5]} position={[0, 0.4, 0]} color="#2f6bff" />
    <InkBox size={[1.36, 0.05, 0.56]} position={[0, 0.825, 0]} color="#e6ecf2" ink={0.003} />
    <InkBox size={[0.06, 0.9, 0.06]} position={[-0.85, 0.45, 0]} color="#3a3a44" ink={0.003} />
    <InkBox size={[0.7, 0.42, 0.06]} position={[-0.85, 1.12, 0]} color="#1d1a1a" />
    <group position={[-0.85, 1.12, 0.045]}>
      <Label text={text} position={[0, 0, 0]} width={0.6} fg="#ffd23f" bg="#14102a" border={false} />
    </group>
  </group>
);

// Clothes bursting out of an upside-down bag (ghost).
export const ClothesBurst: React.FC<{ position: Vec3; t: number }> = ({ position, t }) =>
  t <= 0 ? null : (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.3;
        const r = t * (0.35 + (i % 3) * 0.12);
        return (
          <InkBox
            key={i}
            size={[0.16, 0.11, 0.02]}
            position={[Math.cos(a) * r, Math.sin(a) * r * 0.8 - t * t * 0.5, 0.05 + (i % 4) * 0.03]}
            rotation={[0, 0, a + t * 4]}
            color={["#ff8fc8", "#ffd23f", "#7fd3ff", "#3ccf6e", "#ffffff"][i % 5]}
            ink={0.002}
          />
        );
      })}
    </group>
  );

// Inside the freezer: wire shelves, frost, a bag of peas and the passport.
export const FreezerShelves: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {[0.6, 1.3].map((y) => (
      <group key={y}>
        <InkBox size={[2.6, 0.03, 1.2]} position={[0, y, 0]} color="#e6f4ff" ink={0.002} />
        {Array.from({ length: 9 }, (_, i) => (
          <InkBox key={i} size={[0.012, 0.012, 1.18]} position={[-1.2 + i * 0.3, y + 0.025, 0]} color="#ffffff" ink={0} />
        ))}
      </group>
    ))}
    {[[-0.9, 0.7], [0.8, 0.7], [-0.4, 1.4], [0.9, 1.4]].map(([x, y], i) => (
      <InkBox key={i} size={[0.36, 0.22, 0.3]} position={[x, y + 0.11, -0.2]} color={["#cfd8e3", "#e0262f", "#ffd23f", "#cfd8e3"][i]} />
    ))}
  </group>
);

export const PeasBag: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.36, 0.1, 0.26]} position={[0, 0.05, 0]} color="#3ccf6e" />
    <group position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Label text="PEAS" position={[0, 0, 0]} width={0.2} fg="#ffffff" bg="#1f7a3a" border={false} />
    </group>
  </group>
);

export const Passport: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.13, 0.025, 0.18]} position={[0, 0.0125, 0]} color="#13235e" />
    <group position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <Label text="PASSPORT" position={[0, 0, 0]} width={0.11} fg="#f2c14e" bg="#13235e" border={false} />
    </group>
  </group>
);

// Frost crystals scattered over an area (ghost).
export const Frost: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 18 }, (_, i) => (
      <mesh key={i} position={[Math.sin(i * 2.4) * 1.2, 0.3 + ((i * 0.37) % 1.4) + Math.sin(f / 20 + i) * 0.02, Math.cos(i * 1.3) * 0.4]} rotation={[0, 0, i]}>
        <planeGeometry args={[0.03, 0.03]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

// Wall compass with E, S and W only; the needle never settles.
export const Compass: React.FC<{ position: Vec3; spin: number; size?: number }> = ({ position, spin, size = 0.5 }) => (
  <group position={position}>
    <InkCylinder radius={size} height={0.06} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color="#f2c14e" />
    <InkCylinder radius={size * 0.88} height={0.02} position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]} color="#fffaf0" ink={0} />
    {(
      [
        ["?", 0],
        ["E", -Math.PI / 2],
        ["S", Math.PI],
        ["W", Math.PI / 2],
      ] as [string, number][]
    ).map(([t, a]) => (
      <Label key={t} text={t} position={[-Math.sin(a) * size * 0.68, Math.cos(a) * size * 0.68, 0.06]} width={size * 0.3} fg={t === "?" ? "#e0262f" : "#13235e"} bg="#fffaf0" border={false} />
    ))}
    <group position={[0, 0, 0.075]} rotation={[0, 0, spin]}>
      <InkBox size={[0.05, size * 0.6, 0.015]} position={[0, size * 0.3, 0]} color="#e0262f" ink={0.002} />
      <InkBox size={[0.05, size * 0.6, 0.015]} position={[0, -size * 0.3, 0]} color="#13235e" ink={0.002} />
    </group>
    <Ball position={[0, 0, 0.09]} radius={0.035} color="#1d1a1a" />
  </group>
);

// Bow on a stand with an arrow nocked; `fly` 0..1 sends the arrow along +x by `range` metres.
export const BowStand: React.FC<{ position: Vec3; fly?: number; range?: number }> = ({ position, fly = 0, range = 2.5 }) => (
  <group position={position}>
    <InkBox size={[0.06, 1.0, 0.06]} position={[0, 0.5, 0]} color="#6b4423" ink={0.003} />
    <InkBox size={[0.4, 0.04, 0.3]} position={[0, 0.02, 0]} color="#6b4423" ink={0.003} />
    <group position={[0, 1.15, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.38, 0.025, 10, 32, Math.PI]} />
        <meshToonMaterial color="#8a5a3a" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.008, 0.76, 0.008]} position={[-0.02 - (1 - fly) * 0.12, 0, 0]} color="#ffffff" ink={0} />
    </group>
    <group position={[0.1 + fly * range, 1.15, 0.02]} userData={{ ghost: true }}>
      <InkCylinder radius={0.012} height={0.7} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#c9962b" ink={0.002} />
      <mesh position={[0.39, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.035, 0.08, 12]} />
        <meshToonMaterial color="#c9ced3" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.1, 0.06, 0.01]} position={[-0.32, 0, 0]} color="#e0262f" ink={0} />
    </group>
  </group>
);

// Wall calendar: PLANS header and an empty grid.
export const BlankCalendar: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[1.1, 1.0, 0.04]} position={[0, 0, 0]} color="#ffffff" />
    <InkBox size={[1.1, 0.22, 0.02]} position={[0, 0.39, 0.035]} color="#e0262f" ink={0} />
    {Array.from({ length: 6 }, (_, i) => (
      <InkBox key={`v${i}`} size={[0.008, 0.72, 0.01]} position={[-0.45 + i * 0.18, -0.1, 0.03]} color="#c9ced3" ink={0} />
    ))}
    {Array.from({ length: 5 }, (_, i) => (
      <InkBox key={`h${i}`} size={[0.98, 0.008, 0.01]} position={[0, 0.25 - i * 0.18, 0.03]} color="#c9ced3" ink={0} />
    ))}
    <InkBox size={[0.06, 0.06, 0.04]} position={[-0.3, 0.52, 0.0]} color="#3a3a44" ink={0.002} />
    <InkBox size={[0.06, 0.06, 0.04]} position={[0.3, 0.52, 0.0]} color="#3a3a44" ink={0.002} />
  </group>
);

// Bus seats: a row of paired seats facing +z (ghost: Luna sits in front of one).
export const BusSeat: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#e76f51" }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[0.9, 0.12, 0.45]} position={[0, 0.28, 0]} color={color} />
    <InkBox size={[0.9, 0.7, 0.12]} position={[0, 0.66, -0.2]} color={color} />
    <InkBox size={[0.08, 0.22, 0.08]} position={[-0.35, 0.11, 0]} color="#3a3a44" ink={0.002} />
    <InkBox size={[0.08, 0.22, 0.08]} position={[0.35, 0.11, 0]} color="#3a3a44" ink={0.002} />
  </group>
);

// A phone held up in a hand, screen toward the camera (ghost; place it at the hand).
export const PhoneScreen: React.FC<{ position: Vec3; text: string; size?: number }> = ({ position, text, size = 1 }) => (
  <group position={position} scale={size} userData={{ ghost: true }}>
    <InkBox size={[0.12, 0.22, 0.015]} position={[0, 0, 0]} color="#1d1a1a" ink={0.002} />
    <group position={[0, 0, 0.016]}>
      <Label text={text} position={[0, 0, 0]} width={0.1} fg="#ffffff" bg="#2f6bff" border={false} />
    </group>
  </group>
);

// Laptop open on a surface (ghost): base plus a tilted screen with a message.
export const Laptop: React.FC<{ position: Vec3; text: string; rotationY?: number }> = ({ position, text, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]} userData={{ ghost: true }}>
    <InkBox size={[0.34, 0.02, 0.24]} position={[0, 0.01, 0]} color="#c9ced3" ink={0.002} />
    <group position={[0, 0.02, -0.12]} rotation={[-0.25, 0, 0]}>
      <InkBox size={[0.34, 0.24, 0.015]} position={[0, 0.12, 0]} color="#3a3a44" ink={0.002} />
      <group position={[0, 0.12, 0.012]}>
        <Label text={text} position={[0, 0, 0]} width={0.28} fg="#ffffff" bg="#2f6bff" border={false} />
      </group>
    </group>
  </group>
);
