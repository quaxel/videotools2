import React from "react";
import { Halo, InkBox, InkCylinder, Label, Screen, Vec3 } from "../../engine";

// Props for "Why Prices Always End in 9".

const FACE: Vec3 = [Math.PI / 2, 0, 0];
const ROLL: Vec3 = [0, 0, Math.PI / 2];

// A dangling paper price tag on a string; `swing` rocks it.
export const Tag: React.FC<{ position: Vec3; text: string; width?: number; swing?: number; bg?: string; fg?: string; appear?: number }> = ({ position, text, width = 0.26, swing = 0, bg = "#fffdf4", fg = "#e0262f", appear }) => (
  <group position={position} rotation={[0, 0, swing]}>
    <InkBox size={[0.005, 0.12, 0.005]} position={[0, 0.06, 0]} color="#161212" ink={0} />
    <Label text={text} position={[0, -width / 8, 0.01]} width={width} bg={bg} fg={fg} appear={appear} />
  </group>
);

// A jacket on a hanger (a coloured block with sleeves).
const Jacket: React.FC<{ position: Vec3; color: string }> = ({ position, color }) => (
  <group position={position}>
    <InkCylinder radius={0.012} height={0.3} position={[0, 0.05, 0]} rotation={ROLL} color="#9aa0a6" ink={0} />
    <InkBox size={[0.34, 0.5, 0.08]} position={[0, -0.22, 0]} color={color} ink={0.006} />
    <InkBox size={[0.08, 0.42, 0.07]} position={[-0.2, -0.2, 0]} rotation={[0, 0, 0.12]} color={color} ink={0.006} />
    <InkBox size={[0.08, 0.42, 0.07]} position={[0.2, -0.2, 0]} rotation={[0, 0, -0.12]} color={color} ink={0.006} />
  </group>
);

// A clothes rail with jackets and their price tags; `taken` hides the jacket at that index.
export const ClothesRack: React.FC<{ position: Vec3; prices: string[]; colors: string[]; taken?: number }> = ({ position, prices, colors, taken }) => (
  <group position={position}>
    <InkCylinder radius={0.02} height={1.6} position={[-0.95, 0.8, 0]} color="#2c3a40" />
    <InkCylinder radius={0.02} height={1.6} position={[0.95, 0.8, 0]} color="#2c3a40" />
    <InkCylinder radius={0.018} height={1.9} position={[0, 1.6, 0]} rotation={ROLL} color="#9aa0a6" />
    {prices.map((p, i) => {
      const x = -0.66 + i * (1.32 / Math.max(1, prices.length - 1));
      return (
        taken !== i && (
          <group key={i}>
            <Jacket position={[x, 1.55, 0]} color={colors[i % colors.length]} />
            <Tag position={[x + 0.12, 1.05, 0.06]} text={p} />
          </group>
        )
      );
    })}
  </group>
);

// A pricing gun; `fire` 0..1 squeezes the trigger.
export const PriceGun: React.FC<{ position: Vec3; rotation?: Vec3; fire?: number; scale?: number }> = ({ position, rotation = [0, 0, 0], fire = 0, scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkBox size={[0.26, 0.1, 0.06]} position={[0, 0.05, 0]} color="#ff9f1c" />
    <InkBox size={[0.06, 0.16, 0.05]} position={[0.07, -0.07, 0]} rotation={[0, 0, -0.2]} color="#ff9f1c" />
    <InkBox size={[0.03, 0.08, 0.03]} position={[0.0, -0.04 + fire * 0.02, 0]} rotation={[0, 0, 0.3 - fire * 0.3]} color="#2c3a40" />
    <InkCylinder radius={0.03} height={0.04} position={[-0.1, 0.05, 0]} rotation={FACE} color="#e8ecf0" />
  </group>
);

// A sticker flying from `from` to `to` over frames since it was fired; it sticks at the end.
export const FlyingSticker: React.FC<{ from: Vec3; to: Vec3; t: number; text: string }> = ({ from, to, t, text }) => {
  if (t < 0) return null;
  const p = Math.min(1, t / 6);
  const pos: Vec3 = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p + Math.sin(p * Math.PI) * 0.08, from[2] + (to[2] - from[2]) * p];
  return <Label text={text} position={pos} rotation={[0, 0, p < 1 ? t * 0.8 : -0.15]} width={0.2} bg="#fffdf4" fg="#e0262f" />;
};

// Giant price digits on the wall; `spot` lights the leftmost digit, `dim` 0..1 fades the rest.
export const BigPrice: React.FC<{ position: Vec3; text: string; spot?: number; dim?: number; width?: number }> = ({ position, text, spot = 0, dim = 0, width = 1.6 }) => {
  const chars = text.split("");
  const w = width / chars.length;
  return (
    <group position={position}>
      {chars.map((c, i) => {
        const lead = i === 1 || (i === 0 && c !== "$");
        const off = !lead && dim > 0 ? dim : 0;
        return (
          <group key={i}>
            <Label text={c} position={[-width / 2 + w * (i + 0.5), 0, lead ? 0.02 : 0]} width={w * 1.8} border={false} bg={off > 0.5 ? "#1b2a5e" : lead && spot > 0.5 ? "#ffd23f" : "#fffdf4"} fg={off > 0.5 ? "#3d4f8a" : "#161212"} />
          </group>
        );
      })}
      {spot > 0 && <Halo position={[-width / 2 + w * 1.5, 0, 0.05]} size={w * 3} color="#ffd23f" strength={0.7 * spot} />}
    </group>
  );
};

// A big cartoon eye; `look` -1..1 moves the pupil left to right.
export const Eye: React.FC<{ position: Vec3; look: number; size?: number }> = ({ position, look, size = 0.4 }) => (
  <group position={position}>
    <InkCylinder radius={size} height={0.04} rotation={FACE} color="#fffdf4" />
    <InkCylinder radius={size * 0.38} height={0.05} position={[look * size * 0.5, 0, 0.01]} rotation={FACE} color="#1d4fa8" ink={0.004} />
    <InkCylinder radius={size * 0.18} height={0.06} position={[look * size * 0.5, 0, 0.02]} rotation={FACE} color="#161212" ink={0} />
  </group>
);

// A dress on a stand with a price tag.
export const DressStand: React.FC<{ position: Vec3; color: string; price: string; glow?: boolean }> = ({ position, color, price, glow = false }) => (
  <group position={position}>
    <InkCylinder radius={0.12} height={0.03} position={[0, 0.015, 0]} color="#2c3a40" />
    <InkCylinder radius={0.015} height={0.8} position={[0, 0.4, 0]} color="#2c3a40" />
    <mesh position={[0, 0.95, 0]}>
      <coneGeometry args={[0.28, 0.6, 24]} />
      <meshToonMaterial color={color} />
    </mesh>
    <InkBox size={[0.22, 0.28, 0.14]} position={[0, 1.36, 0]} color={color} ink={0.006} />
    <InkCylinder radius={0.05} height={0.08} position={[0, 1.54, 0]} color="#e8ecf0" />
    <Label text={price} position={[0, 1.78, 0.02]} width={0.36} bg={glow ? "#ffd23f" : "#fffdf4"} fg="#e0262f" />
    {glow && <Halo position={[0, 1.78, 0.04]} size={0.6} color="#ffd23f" strength={0.6} />}
  </group>
);

// A stack of order boxes `n` high; `topple` 0..1 tips it over to the right.
export const OrderStack: React.FC<{ position: Vec3; n: number; topple?: number }> = ({ position, n, topple = 0 }) => (
  <group position={position}>
    {Array.from({ length: n }, (_, i) => (
      <group key={i} position={[topple * i * 0.12, 0, topple * i * 0.04]} rotation={[0, 0, -topple * (0.4 + i * 0.12)]}>
        <InkBox size={[0.3, 0.18, 0.24]} position={[0, 0.09 + i * 0.18 * (1 - topple * 0.6), 0]} color={i % 2 ? "#c9a26b" : "#b8915c"} ink={0.006} />
      </group>
    ))}
  </group>
);

// A simple cartoon car, nose to +x.
export const Car: React.FC<{ position: Vec3; color: string; rotationY?: number }> = ({ position, color, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[1.5, 0.36, 0.7]} position={[0, 0.36, 0]} color={color} />
    <InkBox size={[0.8, 0.3, 0.64]} position={[-0.1, 0.68, 0]} color={color} />
    <InkBox size={[0.36, 0.22, 0.66]} position={[0.12, 0.68, 0]} color="#bfe6ff" ink={0.004} />
    {[-0.5, 0.5].map((x) =>
      [-0.36, 0.36].map((z) => <InkCylinder key={`${x}${z}`} radius={0.17} height={0.1} position={[x, 0.17, z]} rotation={FACE} color="#1d1a1a" />),
    )}
    <InkBox size={[0.04, 0.08, 0.2]} position={[0.75, 0.4, 0.2]} color="#ffd23f" ink={0.003} />
  </group>
);

// The odometer: a dashboard screen whose miles roll from `from` by `p` (0..1) of `span`.
export const Odometer: React.FC<{ position: Vec3; miles: number }> = ({ position, miles }) => (
  <group position={position}>
    <InkBox size={[1.5, 0.75, 0.2]} position={[0, 0, -0.06]} color="#1d1a1a" />
    <Screen position={[0, 0.06, 0.05]} size={[1.25, 0.42]} text={Math.floor(miles).toLocaleString("en-US")} glow="#ff9ad5" bg="#14062b" />
    <Label text="MILES" position={[0, -0.27, 0.06]} width={0.36} bg="#1d1a1a" fg="#ffffff" border={false} />
  </group>
);

// An auction podium with a gavel; `slam` 0..1 brings the gavel down.
export const Podium: React.FC<{ position: Vec3; slam?: number; sign: string }> = ({ position, slam = 0, sign }) => (
  <group position={position}>
    <InkBox size={[0.7, 0.62, 0.45]} position={[0, 0.31, 0]} color="#8a5a3a" />
    <Label text={sign} position={[0, 0.42, 0.23]} width={0.6} bg="#ffd23f" />
    <group position={[0.2, 0.66 + (1 - slam) * 0.18, 0.05]} rotation={[0, 0, (1 - slam) * 0.8]}>
      <InkCylinder radius={0.012} height={0.26} position={[0.12, 0.0, 0]} rotation={ROLL} color="#6b3e1f" ink={0.003} />
      <InkCylinder radius={0.04} height={0.12} position={[0, 0, 0]} color="#6b3e1f" />
    </group>
  </group>
);
