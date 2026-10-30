import React from "react";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Never Touch a Taurus's Fries".

const INK = "#161212";

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale = [1, 1, 1] }) => (
  <mesh position={position} scale={scale} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// Round restaurant table on one pedestal with a cloth.
export const RoundTable: React.FC<{ position: Vec3; radius?: number; height?: number; cloth?: string; scale?: Vec3 }> = ({ position, radius = 0.45, height = 0.58, cloth = "#fff6dc", scale = [1, 1, 1] }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.22} height={0.04} position={[0, 0.02, 0]} color="#3a2a20" ink={0.005} />
    <InkCylinder radius={0.05} height={height} position={[0, height / 2, 0]} color="#3a2a20" ink={0.005} />
    <InkCylinder radius={radius} height={0.05} position={[0, height, 0]} color={cloth} />
    <InkCylinder radius={radius + 0.01} height={0.14} position={[0, height - 0.07, 0]} color={cloth} ink={0.004} />
  </group>
);

// A plate on a table top: fries, pasta, a cake slice or crumbs.
export type Dish = "fries" | "pasta" | "cake" | "empty";
export const Plate: React.FC<{ position: Vec3; dish: Dish; fries?: number }> = ({ position, dish, fries = 9 }) => (
  <group position={position}>
    <InkCylinder radius={0.15} height={0.02} position={[0, 0.01, 0]} color="#ffffff" ink={0.004} />
    {dish === "fries" &&
      Array.from({ length: fries }, (_, i) => (
        <InkBox key={i} size={[0.018, 0.018, 0.16]} position={[Math.sin(i * 2.1) * 0.06, 0.03 + (i % 3) * 0.012, Math.cos(i * 1.3) * 0.04]} rotation={[0, i * 0.7, 0.1 * (i % 2)]} color="#ffc93c" ink={0.002} />
      ))}
    {dish === "pasta" && (
      <>
        <Ball position={[0, 0.04, 0]} radius={0.1} scale={[1, 0.45, 1]} color="#f4d27a" />
        <Ball position={[0.02, 0.07, 0.01]} radius={0.04} color="#d62828" />
        <Ball position={[-0.04, 0.075, -0.02]} radius={0.015} color="#3fae5a" />
      </>
    )}
    {dish === "cake" && (
      <>
        <InkBox size={[0.14, 0.1, 0.1]} position={[0, 0.07, 0]} color="#7a4a2e" ink={0.004} />
        <InkBox size={[0.14, 0.025, 0.1]} position={[0, 0.13, 0]} color="#fff3e6" ink={0.003} />
        <Ball position={[0, 0.16, 0]} radius={0.025} color="#e0262f" />
      </>
    )}
  </group>
);

// A single fry, held or flying.
export const Fry: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkBox size={[0.025, 0.15, 0.025]} color="#ffc93c" ink={0.003} />
  </group>
);

// A fork, tines up along +y.
export const Fork: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.02, 0.16, 0.012]} position={[0, -0.04, 0]} color="#c9ced3" ink={0.003} />
    <InkBox size={[0.06, 0.02, 0.012]} position={[0, 0.05, 0]} color="#c9ced3" ink={0.003} />
    {[-0.022, -0.007, 0.007, 0.022].map((x) => (
      <InkBox key={x} size={[0.008, 0.07, 0.01]} position={[x, 0.09, 0]} color="#c9ced3" ink={0.002} />
    ))}
    <Ball position={[0, 0.14, 0]} radius={0.03} scale={[1, 0.6, 1]} color="#f4d27a" />
  </group>
);

// Velvet couch, seat top at 0.36 m.
export const Couch: React.FC<{ position: Vec3; color?: string; width?: number }> = ({ position, color = "#1f7a4d", width = 1.8 }) => (
  <group position={position}>
    <InkBox size={[width, 0.3, 0.75]} position={[0, 0.2, 0]} color={color} />
    <InkBox size={[width - 0.3, 0.08, 0.6]} position={[0, 0.38, 0.05]} color={color} />
    <InkBox size={[width, 0.6, 0.22]} position={[0, 0.65, -0.28]} color={color} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.18, 0.5, 0.75]} position={[s * (width / 2 - 0.09), 0.4, 0]} color={color} />
    ))}
    {[-1, 1].map((s) => (
      <InkBox key={`l${s}`} size={[0.05, 0.06, 0.05]} position={[s * (width / 2 - 0.06), 0.03, 0.3]} color="#3a2a20" ink={0} />
    ))}
  </group>
);

// A huge puffy blanket draped over a seated lap.
export const Blanket: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#e8c15a" }) => (
  <group position={position} userData={{ ghost: true }}>
    {[-0.2, 0, 0.2].map((x, i) => (
      <Ball key={x} position={[x, 0.04 * (i === 1 ? 1.3 : 1), 0]} radius={0.13} scale={[1.1, 0.7, 0.9]} color={i === 1 ? color : "#f2d27a"} />
    ))}
    <Ball position={[0, -0.08, 0.06]} radius={0.2} scale={[1.6, 0.55, 0.7]} color={color} />
  </group>
);

// Kettlebell-style weight tag: a big weight on the floor.
export const Weight: React.FC<{ position: Vec3; text: string }> = ({ position, text }) => (
  <group position={position}>
    <InkCylinder radius={0.18} height={0.22} position={[0, 0.11, 0]} color="#2b2b30" />
    <Label text={text} position={[0, 0.12, 0.19]} width={0.3} fg="#ffffff" bg="#e0262f" />
  </group>
);

// Bathroom cabinet with a mirror and one perfume bottle on its shelf.
export const PerfumeBottle: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.14, 0.16, 0.08]} position={[0, 0.08, 0]} color="#c77dff" />
    <InkBox size={[0.1, 0.12, 0.085]} position={[0, 0.08, 0]} color="#e0c3ff" ink={0} />
    <InkCylinder radius={0.02} height={0.04} position={[0, 0.18, 0]} color="#e8b04a" ink={0.003} />
    <Ball position={[0, 0.23, 0]} radius={0.035} color="#e8b04a" />
  </group>
);

// Restaurant entrance door frame on the back wall is the kit Door; this is a hanging OPEN sign.
export const HangingSign: React.FC<{ position: Vec3; text: string; swing?: number; bg?: string }> = ({ position, text, swing = 0, bg = "#3fae5a" }) => (
  <group position={position} rotation={[0, 0, swing]}>
    <InkBox size={[0.01, 0.2, 0.01]} position={[0, -0.1, 0]} color={INK} ink={0} />
    <Label text={text} position={[0, -0.28, 0]} width={0.55} fg="#ffffff" bg={bg} />
  </group>
);

// Round steel vault door on the back wall; `open` 0..1 swings it.
export const VaultDoor: React.FC<{ position: Vec3; spin?: number }> = ({ position, spin = 0 }) => (
  <group position={position}>
    <InkCylinder radius={1.05} height={0.12} rotation={[Math.PI / 2, 0, 0]} color="#8a8f98" />
    <InkCylinder radius={0.9} height={0.14} position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} color="#c9ced3" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return <InkCylinder key={i} radius={0.05} height={0.06} position={[Math.cos(a) * 0.97, Math.sin(a) * 0.97, 0.06]} rotation={[Math.PI / 2, 0, 0]} color="#e8b04a" ink={0.004} />;
    })}
    <group position={[0, 0, 0.14]} rotation={[0, 0, spin]}>
      <InkCylinder radius={0.08} height={0.08} rotation={[Math.PI / 2, 0, 0]} color="#e8b04a" ink={0.005} />
      {[0, 1, 2].map((i) => (
        <InkBox key={i} size={[0.62, 0.04, 0.04]} position={[0, 0, 0.03]} rotation={[0, 0, (i * Math.PI) / 3]} color="#e8b04a" ink={0.004} />
      ))}
    </group>
  </group>
);

// Giant padlock; `shut` 0..1 drops the shackle into the body.
export const Padlock: React.FC<{ position: Vec3; shut?: number; scale?: number; label?: string; appear?: number }> = ({ position, shut = 1, scale = 1, label = "PLANS", appear }) => (
  <group position={position} scale={scale}>
    <group position={[0, 0.3 + (1 - shut) * 0.14, 0]}>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.06, 0.26, 0.06]} position={[s * 0.15, 0, 0]} color="#c9ced3" ink={0.005} />
      ))}
      <InkBox size={[0.36, 0.06, 0.06]} position={[0, 0.13, 0]} color="#c9ced3" ink={0.005} />
    </group>
    <InkBox size={[0.5, 0.42, 0.16]} position={[0, 0, 0]} color="#e8b04a" />
    <InkCylinder radius={0.035} height={0.02} position={[0, -0.08, 0.085]} rotation={[Math.PI / 2, 0, 0]} color={INK} ink={0} />
    <Label text={label} position={[0, 0.07, 0.09]} width={0.42} fg="#ffffff" bg="#13235e" appear={appear} />
  </group>
);

// Big round gauge with a needle (0..1 over a half turn) and a red MAX zone.
export const ComfortDial: React.FC<{ position: Vec3; needle?: number }> = ({ position, needle = 1 }) => (
  <group position={position}>
    <InkCylinder radius={0.42} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#fff6dc" />
    {Array.from({ length: 9 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 8) * Math.PI;
      return <InkBox key={i} size={[0.014, 0.07, 0.01]} position={[Math.sin(a) * 0.33, Math.cos(a) * 0.33, 0.035]} rotation={[0, 0, -a]} color={i >= 7 ? "#e0262f" : INK} ink={0} />;
    })}
    <Label text="MAX" position={[0.27, 0.12, 0.04]} width={0.16} fg="#ffffff" bg="#e0262f" border={false} />
    <group position={[0, 0, 0.05]} rotation={[0, 0, Math.PI / 2 - needle * Math.PI]}>
      <InkBox size={[0.035, 0.3, 0.02]} position={[0, 0.14, 0]} color="#d62828" ink={0.004} />
    </group>
    <Ball position={[0, 0, 0.06]} radius={0.04} color={INK} />
  </group>
);

// A giant hex bolt sunk in the floor.
export const FloorBolt: React.FC<{ position: Vec3; turn?: number }> = ({ position, turn = 0 }) => (
  <group position={position} rotation={[0, turn, 0]}>
    <InkCylinder radius={0.2} height={0.04} position={[0, 0.02, 0]} color="#8a8f98" ink={0.005} />
    <mesh position={[0, 0.1, 0]} castShadow>
      <cylinderGeometry args={[0.13, 0.13, 0.14, 6]} />
      <meshToonMaterial color="#c9ced3" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// Mechanical tally counter on the wall: `value` shown on white flip digits, `flip` 0..1 jolts it.
export const GrudgeCounter: React.FC<{ position: Vec3; value: number; flip?: number; scale?: number }> = ({ position, value, flip = 0, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.95, 0.62, 0.2]} position={[0, 0, 0]} color="#2b2b30" />
    <InkBox size={[0.08, 0.14, 0.08]} position={[0.32, 0.36 - flip * 0.06, 0]} color="#e0262f" ink={0.004} />
    <Label text={String(value)} position={[0, -0.02, 0.105 + flip * 0.01]} rotation={[flip * -0.6, 0, 0]} width={0.62} fg={INK} bg="#ffffff" />
  </group>
);

// Sushi bar counter with a conveyor of little plates; `f` moves them.
export const SushiBar: React.FC<{ position: Vec3; f: number; width?: number }> = ({ position, f, width = 3.2 }) => (
  <group position={position}>
    <InkBox size={[width, 0.6, 0.6]} position={[0, 0.3, 0]} color="#f7f7f2" />
    <InkBox size={[width + 0.08, 0.05, 0.68]} position={[0, 0.625, 0]} color="#2a9d8f" />
    {Array.from({ length: 9 }, (_, i) => {
      const x = (((i / 9 + f * 0.004) % 1) - 0.5) * width * 0.95;
      return (
        <group key={i} position={[x, 0.66, 0.08]}>
          <InkCylinder radius={0.08} height={0.02} color={["#e0262f", "#4f7dff", "#ffd23f"][i % 3]} ink={0.003} />
          <InkBox size={[0.1, 0.04, 0.05]} position={[0, 0.03, 0]} color="#ffffff" ink={0.003} />
          <InkBox size={[0.1, 0.02, 0.05]} position={[0, 0.06, 0]} color={i % 2 ? "#ff7a5a" : "#ffb38a"} ink={0.003} />
        </group>
      );
    })}
  </group>
);

// Wicker bread basket with rolls.
export const BreadBasket: React.FC<{ position: Vec3; rolls?: number }> = ({ position, rolls = 4 }) => (
  <group position={position}>
    <InkCylinder radius={0.16} height={0.08} position={[0, 0.04, 0]} color="#a0703a" ink={0.004} />
    {Array.from({ length: rolls }, (_, i) => (
      <Ball key={i} position={[Math.sin(i * 1.6) * 0.07, 0.1, Math.cos(i * 1.6) * 0.05]} radius={0.055} scale={[1.2, 0.8, 1]} color="#d99a4e" />
    ))}
  </group>
);

// Name card standing on a table.
export const NameCard: React.FC<{ position: Vec3; text: string; appear?: number }> = ({ position, text, appear }) => (
  <group position={position}>
    <Label text={text} position={[0, 0.06, 0]} rotation={[-0.25, 0, 0]} width={0.26} fg={INK} bg="#ffffff" appear={appear} />
  </group>
);

// Rising cold frost puffs (the room goes cold).
export const Frost: React.FC<{ position: Vec3; f: number; amount: number }> = ({ position, f, amount }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 10 }, (_, i) => {
      const t = (f * 0.015 + i / 10) % 1;
      return (
        <mesh key={i} position={[Math.sin(i * 2.3) * 1.4, t * 1.8, Math.cos(i * 1.7) * 0.6]}>
          <sphereGeometry args={[Math.max(0.001, (0.08 + t * 0.12) * amount), 12, 10]} />
          <meshBasicMaterial color="#dff6ff" transparent opacity={0.45 * (1 - t)} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

// Dizzy stars circling a point.
export const DizzyStars: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position} userData={{ ghost: true }}>
    {[0, 1, 2].map((i) => {
      const a = f / 6 + (i * Math.PI * 2) / 3;
      return <Ball key={i} position={[Math.cos(a) * 0.2, Math.sin(a * 2) * 0.03, Math.sin(a) * 0.12]} radius={0.035} color="#ffd23f" glow />;
    })}
  </group>
);
