import React from "react";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "A Cancer Remembers Everything".

const INK = "#161212";

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3; opacity?: number }> = ({ position, radius, color, glow, scale = [1, 1, 1], opacity }) => (
  <mesh position={position} scale={scale} castShadow={!glow && opacity === undefined}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow || opacity !== undefined ? (
      <meshBasicMaterial color={color} toneMapped={false} transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined} />
    ) : (
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    )}
  </mesh>
);

// Round table on one pedestal with a cloth.
export const RoundTable: React.FC<{ position: Vec3; radius?: number; height?: number; cloth?: string }> = ({ position, radius = 0.45, height = 0.58, cloth = "#fff6dc" }) => (
  <group position={position}>
    <InkCylinder radius={0.22} height={0.04} position={[0, 0.02, 0]} color="#3a2a20" ink={0.005} />
    <InkCylinder radius={0.05} height={height} position={[0, height / 2, 0]} color="#3a2a20" ink={0.005} />
    <InkCylinder radius={radius} height={0.05} position={[0, height, 0]} color={cloth} />
    <InkCylinder radius={radius + 0.01} height={0.14} position={[0, height - 0.07, 0]} color={cloth} ink={0.004} />
  </group>
);

// Birthday cake with candles; `lit` 0..1 scales the flames.
export const Cake: React.FC<{ position: Vec3; lit?: number; candles?: number }> = ({ position, lit = 1, candles = 5 }) => (
  <group position={position}>
    <InkCylinder radius={0.2} height={0.02} position={[0, 0.01, 0]} color="#ffffff" ink={0.004} />
    <InkCylinder radius={0.16} height={0.14} position={[0, 0.09, 0]} color="#ff8fc8" />
    <InkCylinder radius={0.165} height={0.03} position={[0, 0.17, 0]} color="#fff3e6" ink={0.003} />
    {Array.from({ length: candles }, (_, i) => {
      const a = (i / candles) * Math.PI * 2;
      return (
        <group key={i} position={[Math.cos(a) * 0.09, 0.22, Math.sin(a) * 0.09]}>
          <InkBox size={[0.015, 0.07, 0.015]} color={i % 2 ? "#4f7dff" : "#ffd23f"} ink={0.002} />
          {lit > 0.01 && <Ball position={[0, 0.05, 0]} radius={0.016 * lit} scale={[1, 1.6, 1]} color="#ffb000" glow />}
        </group>
      );
    })}
  </group>
);

// A balloon on a string, bobbing with `f`.
export const Balloon: React.FC<{ position: Vec3; color: string; f: number; phase?: number }> = ({ position, color, f, phase = 0 }) => (
  <group position={[position[0] + Math.sin(f / 20 + phase) * 0.04, position[1] + Math.sin(f / 14 + phase) * 0.05, position[2]]}>
    <Ball position={[0, 0, 0]} radius={0.17} scale={[1, 1.2, 1]} color={color} />
    <InkBox size={[0.006, 0.7, 0.006]} position={[0, -0.55, 0]} color={INK} ink={0} />
  </group>
);

// Couch, seat top at 0.36 m.
export const Couch: React.FC<{ position: Vec3; color?: string; width?: number }> = ({ position, color = "#4f7dff", width = 1.8 }) => (
  <group position={position}>
    <InkBox size={[width, 0.3, 0.75]} position={[0, 0.2, 0]} color={color} />
    <InkBox size={[width - 0.3, 0.08, 0.6]} position={[0, 0.38, 0.05]} color={color} />
    <InkBox size={[width, 0.6, 0.22]} position={[0, 0.65, -0.28]} color={color} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.18, 0.5, 0.75]} position={[s * (width / 2 - 0.09), 0.4, 0]} color={color} />
    ))}
  </group>
);

// TV on a low stand, facing +z; the picture is a kit Screen placed by the caller.
export const TvStand: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.5 }) => (
  <group position={position}>
    <InkBox size={[width + 0.3, 0.45, 0.45]} position={[0, 0.225, 0]} color="#3a2a20" />
    <InkBox size={[width, width * 0.6, 0.08]} position={[0, 0.45 + width * 0.3 + 0.05, -0.1]} color="#1d1a1a" />
  </group>
);

// Tissue box; `out` pulls a tissue up.
export const TissueBox: React.FC<{ position: Vec3; out?: number; scale?: number; color?: string }> = ({ position, out = 0.5, scale = 1, color = "#7b2cbf" }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.26, 0.14, 0.14]} position={[0, 0.07, 0]} color={color} />
    <InkBox size={[0.12, 0.012, 0.05]} position={[0, 0.145, 0]} color="#3a1a5a" ink={0} />
    <Ball position={[0, 0.16 + out * 0.08, 0]} radius={0.05} scale={[1.2, 0.6 + out * 1.2, 0.5]} color="#ffffff" />
  </group>
);

// A pile of used tissues on the floor (soft: never a collision).
export const TissuePile: React.FC<{ position: Vec3; count?: number; spread?: number; scatter?: number }> = ({ position, count = 14, spread = 0.6, scatter = 0 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const r = spread * (0.2 + ((i * 37) % 10) / 12);
      const a = i * 2.4;
      return <Ball key={i} position={[Math.cos(a) * r * (1 + scatter), 0.06 + (i % 3) * 0.04 + scatter * 0.3 * Math.abs(Math.sin(i)), Math.sin(a) * r * 0.5 * (1 + scatter)]} radius={0.08} scale={[1, 0.7, 1]} color={i % 4 ? "#ffffff" : "#e8f6ff"} />;
    })}
  </group>
);

// Kitchen stove with a soup pot; steam rises with `f`.
export const Stove: React.FC<{ position: Vec3; f: number; color?: string }> = ({ position, f, color = "#fff6dc" }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.86, 0.6]} position={[0, 0.43, 0]} color={color} />
    <InkBox size={[0.6, 0.3, 0.02]} position={[0, 0.4, 0.31]} color="#1d1a1a" />
    <InkCylinder radius={0.22} height={0.26} position={[0, 0.99, 0]} color="#e0262f" />
    <InkCylinder radius={0.2} height={0.01} position={[0, 1.125, 0]} color="#f4a261" ink={0} />
    <group userData={{ ghost: true }}>
      {Array.from({ length: 5 }, (_, i) => {
        const t = (f * 0.02 + i / 5) % 1;
        return <Ball key={i} position={[Math.sin(i * 2 + t * 3) * 0.08, 1.2 + t * 0.6, 0]} radius={0.05 + t * 0.06} color="#ffffff" opacity={0.5 * (1 - t)} />;
      })}
    </group>
  </group>
);

// Soup bowl; `tear` 0..1 drops a tear from above into it.
export const SoupBowl: React.FC<{ position: Vec3; tear?: number; scale?: number }> = ({ position, tear = -1, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.07, 0]} rotation={[Math.PI, 0, 0]} castShadow>
      <sphereGeometry args={[0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color="#ffffff" gradientMap={toonRamp} side={2} />
    </mesh>
    <InkCylinder radius={0.13} height={0.01} position={[0, 0.06, 0]} color="#f4a261" ink={0} />
    <Ball position={[0.04, 0.07, 0.02]} radius={0.02} color="#3fae5a" />
    <Ball position={[-0.05, 0.07, -0.01]} radius={0.018} color="#e8590c" />
    {tear >= 0 && tear < 1 && <Ball position={[0, 0.5 - tear * 0.44, 0]} radius={0.025} scale={[1, 1.4, 1]} color="#7fd3ff" glow />}
    {tear >= 1 && <InkCylinder radius={0.02 + (tear - 1) * 0.08} height={0.004} position={[0, 0.067, 0]} color="#7fd3ff" ink={0} />}
  </group>
);

// Hallway closet in the back wall: frame, two doors that swing out with `open`, a bulge with `bulge`.
export const Closet: React.FC<{ position: Vec3; open?: number; bulge?: number; color?: string }> = ({ position, open = 0, bulge = 0, color = "#d9a066" }) => (
  <group position={position}>
    <InkBox size={[1.3, 2.1, 0.08]} position={[0, 1.05, 0]} color="#5a3a20" />
    <InkBox size={[1.14, 1.98, 0.04]} position={[0, 1.02, 0.02]} color="#2a1a10" ink={0} />
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.57, 0, 0.06]} rotation={[0, s * open * 1.9, 0]}>
        <InkBox size={[0.56, 1.96, 0.05]} position={[-s * 0.28, 1.02, bulge * 0.03]} color={color} />
        <Ball position={[-s * 0.5, 1.0, 0.04]} radius={0.025} color="#e8b04a" />
      </group>
    ))}
  </group>
);

// A cardboard box with a date written on its side.
export const DateBox: React.FC<{ position: Vec3; rotation?: Vec3; date?: string; size?: number; color?: string }> = ({ position, rotation = [0, 0, 0], date, size = 0.32, color = "#c98b4e" }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkBox size={[size, size * 0.75, size * 0.8]} color={color} ink={0.004} />
    <InkBox size={[size * 0.12, size * 0.76, size * 0.81]} color="#a0703a" ink={0} />
    {date && <Label text={date} position={[0, 0, size * 0.41]} width={size * 0.85} fg={INK} bg="#fff6dc" border={false} />}
  </group>
);

// A big crab shell dome with one tiny door in front and a sign over it.
export const CrabShell: React.FC<{ position: Vec3; door?: number; f: number }> = ({ position, door = 0, f }) => (
  <group position={position}>
    <mesh position={[0, 0, 0]} scale={[1.6, 1.15, 1]} castShadow>
      <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color="#ff6b5a" gradientMap={toonRamp} />
    </mesh>
    {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
      <Ball key={x} position={[x, 0.55 + (i % 2) * 0.2, 0.62 - Math.abs(x) * 0.1]} radius={0.12} color="#ffb38a" />
    ))}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 1.75, 0.35, 0.3]} rotation={[0, 0, s * (0.3 + Math.sin(f / 10 + s) * 0.08)]}>
        <InkBox size={[0.45, 0.12, 0.12]} position={[s * 0.2, 0, 0]} color="#ff6b5a" />
        <Ball position={[s * 0.5, 0.08, 0]} radius={0.16} scale={[1, 0.8, 0.7]} color="#ff6b5a" />
      </group>
    ))}
    {/* tiny door */}
    <InkBox size={[0.3, 0.46, 0.04]} position={[0, 0.23, 0.98]} color="#5a2a1e" />
    <group position={[-0.13, 0, 1.01]} rotation={[0, -door * 1.6, 0]}>
      <InkBox size={[0.26, 0.42, 0.03]} position={[0.13, 0.22, 0]} color="#ffd23f" />
      <Ball position={[0.22, 0.22, 0.03]} radius={0.018} color={INK} />
    </group>
  </group>
);

// FEELINGS cabinet: a tall chest of drawers whose drawers stick out (`out` 0..1 each), stuffed with letters and photos.
export const FeelingsCabinet: React.FC<{ position: Vec3; out: number[]; color?: string }> = ({ position, out, color = "#4f7dff" }) => (
  <group position={position}>
    <InkBox size={[1.5, 2.2, 0.6]} position={[0, 1.1, 0]} color={color} />
    {out.map((o, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const y = 0.32 + row * 0.5;
      const x = col ? 0.35 : -0.35;
      const z = 0.3 + o * 0.28;
      return (
        <group key={i} position={[x, y, z]}>
          <InkBox size={[0.62, 0.4, 0.5]} position={[0, 0, -0.22]} color="#ffd23f" />
          <InkBox size={[0.12, 0.04, 0.04]} position={[0, 0, 0.05]} color={INK} ink={0} />
          {o > 0.1 &&
            [0, 1, 2].map((k) => (
              <InkBox key={k} size={[0.16, 0.2, 0.01]} position={[-0.18 + k * 0.17, 0.2 + (k % 2) * 0.04, -0.2 + k * 0.03]} rotation={[0.3, 0, (k - 1) * 0.3]} color={["#ffffff", "#ff8fc8", "#cfe9ff"][k]} ink={0.002} />
            ))}
        </group>
      );
    })}
  </group>
);

// A tally counter display on a little stand: big digits on white.
export const TearCounter: React.FC<{ position: Vec3; value: number; flip?: number }> = ({ position, value, flip = 0 }) => (
  <group position={position}>
    <InkBox size={[0.7, 0.42, 0.16]} position={[0, 0, 0]} color="#2b2b30" />
    <InkBox size={[0.07, 0.12, 0.07]} position={[0.26, 0.26 - flip * 0.05, 0]} color="#e0262f" ink={0.004} />
    <Label text={String(value)} position={[0, -0.01, 0.085 + flip * 0.01]} rotation={[flip * -0.6, 0, 0]} width={0.46} fg={INK} bg="#ffffff" />
  </group>
);

// Tears flying sideways from a face (cartoon sobbing).
export const TearSpray: React.FC<{ position: Vec3; f: number; amount?: number }> = ({ position, f, amount = 1 }) => (
  <group position={position} userData={{ ghost: true }}>
    {[-1, 1].flatMap((s) =>
      [0, 1, 2].map((i) => {
        const t = (f * 0.06 + i / 3) % 1;
        return <Ball key={`${s}${i}`} position={[s * (0.12 + t * 0.3), -t * t * 0.3, 0.05]} radius={0.028 * amount} scale={[1, 1.3, 1]} color="#7fd3ff" glow />;
      }),
    )}
  </group>
);

// Little hearts floating up (feels loved).
export const Hearts: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position} userData={{ ghost: true }}>
    {[0, 1, 2, 3].map((i) => {
      const t = (f * 0.02 + i / 4) % 1;
      return <Label key={i} text="♥" position={[Math.sin(i * 2.1) * 0.35, t * 0.7, 0.05 * i]} width={0.16 * (1 - t * 0.5)} fg="#e0262f" bg="#ffffff" border={false} />;
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
