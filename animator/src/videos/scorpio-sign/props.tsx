import React from "react";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "A Scorpio Already Knows".
// Parts that touch are kept 1-2 cm apart (or fully inside one another) so no two faces are coplanar.

const INK = "#161212";

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale = [1, 1, 1] }) => (
  <mesh position={position} scale={scale} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// Bar stool, seat top at 0.34 m (seated puppets sit at HIP_HEIGHT).
export const Stool: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#e8b04a" }) => (
  <group position={position}>
    <InkCylinder radius={0.03} height={0.3} position={[0, 0.15, 0]} color="#3a3a44" ink={0.004} />
    <InkCylinder radius={0.16} height={0.03} position={[0, 0.015, 0]} color="#3a3a44" ink={0.004} />
    <InkCylinder radius={0.17} height={0.04} position={[0, 0.32, 0]} color={color} />
  </group>
);

// Open notebook lying flat with a page heading and a scribble; `scrawl` 0..1 writes the lines.
export const Notebook: React.FC<{ position: Vec3; rotationY?: number; heading?: string; scrawl?: number; scale?: number }> = ({ position, rotationY = 0, heading = "TOM", scrawl = 1, scale = 1 }) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
    <InkBox size={[0.36, 0.02, 0.26]} position={[0, 0.01, 0]} color="#13235e" ink={0.003} />
    <InkBox size={[0.34, 0.012, 0.24]} position={[0, 0.026, 0]} color="#fff6dc" ink={0} />
    <InkBox size={[0.006, 0.014, 0.24]} position={[0, 0.034, 0]} color="#c9ced3" ink={0} />
    <Label text={heading} position={[-0.085, 0.045, -0.07]} rotation={[-Math.PI / 2, 0, 0]} width={0.12} fg="#e0262f" bg="#fff6dc" border={false} />
    {[0, 1, 2, 3].map((i) => (
      <InkBox key={i} size={[0.12 * Math.min(1, Math.max(0, scrawl * 4 - i)), 0.002, 0.006]} position={[-0.085, 0.036, -0.02 + i * 0.035]} color={INK} ink={0} />
    ))}
    <InkBox size={[0.012, 0.012, 0.16]} position={[0.1 + scrawl * 0.02, 0.05, 0.02]} rotation={[0, 0.5, 0]} color="#e0262f" ink={0.002} />
  </group>
);

// A wine glass; `fill` 0..1.
export const WineGlass: React.FC<{ position: Vec3; fill?: number }> = ({ position, fill = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.045} height={0.01} position={[0, 0.005, 0]} color="#e8f6ff" ink={0.002} />
    <InkCylinder radius={0.008} height={0.1} position={[0, 0.06, 0]} color="#e8f6ff" ink={0.002} />
    <mesh position={[0, 0.16, 0]}>
      <cylinderGeometry args={[0.055, 0.035, 0.12, 20, 1, true]} />
      <meshBasicMaterial color="#e8f6ff" transparent opacity={0.45} side={2} depthWrite={false} />
    </mesh>
    {fill > 0.02 && <InkCylinder radius={0.033 + fill * 0.018} height={0.1 * fill} position={[0, 0.105 + 0.05 * fill, 0]} color="#7a1e3a" ink={0} />}
  </group>
);

// Wine bottle; `tip` 0..1 tilts it to pour, with a stream when tipped.
export const WineBottle: React.FC<{ position: Vec3; tip?: number }> = ({ position, tip = 0 }) => (
  <group position={position} rotation={[0, 0, tip * 1.9]}>
    <InkCylinder radius={0.05} height={0.24} position={[0, 0.12, 0]} color="#2d4a2a" />
    <InkCylinder radius={0.018} height={0.1} position={[0, 0.29, 0]} color="#2d4a2a" ink={0.003} />
    <InkBox size={[0.07, 0.08, 0.012]} position={[0, 0.12, 0.052]} color="#fff6dc" ink={0.002} />
  </group>
);

// Vase of flowers.
export const Flowers: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.06} height={0.16} position={[0, 0.08, 0]} color="#4f7dff" ink={0.003} />
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return (
        <group key={i}>
          <InkBox size={[0.008, 0.16, 0.008]} position={[Math.cos(a) * 0.03, 0.22, Math.sin(a) * 0.03]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]} color="#3fae5a" ink={0} />
          <Ball position={[Math.cos(a) * 0.06, 0.31, Math.sin(a) * 0.06]} radius={0.035} color={["#e0262f", "#ffd23f", "#ff8fc8", "#f77f00", "#ffffff"][i]} />
        </group>
      );
    })}
  </group>
);

// Giant phone standing upright (screen faces +z); the screen content is a caller-placed kit Screen.
export const BigPhone: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[1.0, 1.9, 0.1]} position={[0, 0.95, 0]} color="#1d1a1a" />
    <InkBox size={[0.22, 0.04, 0.02]} position={[0, 1.82, 0.06]} color="#3a3a44" ink={0} />
  </group>
);

// Couch. Seat top at 0.34 m; arms and back sit 1 cm proud of the base so no faces are coplanar.
export const Couch: React.FC<{ position: Vec3; color?: string; width?: number }> = ({ position, color = "#e8590c", width = 2.0 }) => (
  <group position={position}>
    <InkBox size={[width - 0.36, 0.26, 0.7]} position={[0, 0.17, 0.02]} color={color} />
    <InkBox size={[width - 0.4, 0.08, 0.6]} position={[0, 0.3, 0.06]} color={color} />
    <InkBox size={[width - 0.04, 0.62, 0.2]} position={[0, 0.5, -0.33]} color={color} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.18, 0.5, 0.78]} position={[s * (width / 2 - 0.09), 0.25, 0]} color={color} />
    ))}
  </group>
);

// Tall closet with one door hinged on its right (it swings out to the right); `open` 0..1.
export const Closet: React.FC<{ position: Vec3; open?: number; color?: string }> = ({ position, open = 0, color = "#8a5a3a" }) => (
  <group position={position}>
    <InkBox size={[0.9, 2.0, 0.55]} position={[0, 1.0, 0]} color={color} />
    <InkBox size={[0.8, 1.88, 0.02]} position={[0, 1.0, 0.262]} color="#2a1a10" ink={0} />
    {/* The door swings out to the right, away from whoever walks in, so it never counts as a collision. */}
    <group position={[0.4, 0, 0.3]} rotation={[0, open * 1.8, 0]} userData={{ ghost: true }}>
      <InkBox size={[0.8, 1.88, 0.04]} position={[-0.4, 1.0, 0]} color={color} />
      <Ball position={[-0.72, 1.0, 0.03]} radius={0.025} color="#e8b04a" />
    </group>
  </group>
);

// Coats tumbling out of a closet over Tom; `t` 0..1.
export const CoatRain: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 8 }, (_, i) => {
      const p = Math.min(1, Math.max(0, t * 1.6 - i * 0.08));
      const y = 1.9 - p * (1.25 + (i % 3) * 0.12);
      return <InkBox key={i} size={[0.36, 0.5, 0.08]} position={[((i * 37) % 7) / 7 * 0.5 - 0.25, y, 0.05 + (i % 3) * 0.06]} rotation={[0.2 * (i % 2), 0, (i - 4) * 0.25 * p]} color={["#13235e", "#7a1e3a", "#3fae5a", "#c9a26b", "#4f7dff"][i % 5]} ink={0.004} />;
    })}
  </group>
);

// Corkboard with photos (labelled SUSPECT) joined by red string. `pins` = how many photos are up.
const PHOTOS: Vec3[] = [
  [-0.75, 0.42, 0],
  [0.05, 0.5, 0],
  [0.78, 0.36, 0],
  [-0.55, -0.32, 0],
  [0.32, -0.25, 0],
  [0.9, -0.42, 0],
];
const STRINGS: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [3, 4],
  [2, 5],
  [4, 5],
];
export const Corkboard: React.FC<{ position: Vec3; pins?: number; suspect?: number; newPhoto?: number; newText?: string }> = ({ position, pins = 6, suspect = 99, newPhoto = -1, newText = "NEW COWORKER" }) => (
  <group position={position}>
    <InkBox size={[2.4, 1.5, 0.05]} color="#a0703a" />
    {STRINGS.filter(([a, b]) => a < pins && b < pins).map(([a, b], i) => {
      const [x1, y1] = PHOTOS[a];
      const [x2, y2] = PHOTOS[b];
      const len = Math.hypot(x2 - x1, y2 - y1);
      return <InkBox key={i} size={[len, 0.012, 0.006]} position={[(x1 + x2) / 2, (y1 + y2) / 2 + 0.12, 0.06]} rotation={[0, 0, Math.atan2(y2 - y1, x2 - x1)]} color="#e0262f" ink={0} />;
    })}
    {PHOTOS.slice(0, pins).map((p, i) => (
      <group key={i} position={[p[0], p[1], 0.035]}>
        <InkBox size={[0.34, 0.4, 0.01]} color="#ffffff" ink={0.002} />
        <InkBox size={[0.28, 0.24, 0.006]} position={[0, 0.04, 0.012]} color={["#c9ced3", "#e8c15a", "#a0442a", "#7b2cbf", "#3a2a20", "#2a9d8f"][i]} ink={0} />
        <Ball position={[0, 0.06, 0.018]} radius={0.05} scale={[1, 1, 0.2]} color="#f6dcc4" />
        <Label text="SUSPECT" position={[0, -0.13, 0.02]} width={0.26} fg="#ffffff" bg="#e0262f" border={false} appear={suspect - i * 4} />
        <Ball position={[0, 0.16, 0.03]} radius={0.022} color="#e0262f" />
      </group>
    ))}
    {newPhoto >= 0 && (
      <group position={[-0.05, -0.05, 0.05 + Math.max(0, 1 - newPhoto) * 0.6]}>
        <InkBox size={[0.4, 0.46, 0.01]} color="#ffffff" ink={0.002} />
        <InkBox size={[0.32, 0.28, 0.006]} position={[0, 0.05, 0.012]} color="#4f7dff" ink={0} />
        <Ball position={[0, 0.07, 0.018]} radius={0.06} scale={[1, 1, 0.2]} color="#c68642" />
        <Label text={newText} position={[0, -0.16, 0.02]} width={0.36} fg="#ffffff" bg="#13235e" border={false} />
        <Ball position={[0, 0.19, 0.03]} radius={0.025} color="#e0262f" />
      </group>
    )}
  </group>
);

// Filing cabinet with three drawers; the top one (EVIDENCE) shoots out with `out` 0..1.
export const FilingCabinet: React.FC<{ position: Vec3; out?: number }> = ({ position, out = 0 }) => (
  <group position={position}>
    <InkBox size={[0.7, 1.4, 0.65]} position={[0, 0.7, 0]} color="#8a8f98" />
    {[0, 1, 2].map((i) => {
      const o = i === 2 ? out : 0;
      return (
        <group key={i} position={[0, 0.25 + i * 0.44, 0.02 + o * 0.5]}>
          <InkBox size={[0.62, 0.38, 0.64]} color="#a8adb5" ink={0.003} />
          <InkBox size={[0.18, 0.04, 0.04]} position={[0, 0.02, 0.34]} color={INK} ink={0} />
          {i === 2 && <Label text="EVIDENCE" position={[0, 0.12, 0.335]} width={0.4} fg="#ffffff" bg="#e0262f" />}
        </group>
      );
    })}
  </group>
);

// Papers bursting out of a drawer; `t` 0..1.
export const PaperBurst: React.FC<{ position: Vec3; t: number }> = ({ position, t }) =>
  t <= 0 ? null : (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const up = Math.sin(Math.min(1, t) * Math.PI * 0.9) * (0.6 + (i % 3) * 0.2);
        return <InkBox key={i} size={[0.2, 0.26, 0.004]} position={[Math.cos(a) * t * 0.7, up, 0.2 + Math.sin(a) * t * 0.4]} rotation={[i * 0.6 * t, i * 0.9 * t, i * 0.4]} color={i % 3 ? "#ffffff" : "#fff6dc"} ink={0.002} />;
      })}
    </group>
  );

// Giant padlock with an empty keyhole and a SECRETS tag.
export const Padlock: React.FC<{ position: Vec3; scale?: number; label?: string; appear?: number; shake?: number }> = ({ position, scale = 1, label = "SECRETS", appear, shake = 0 }) => (
  <group position={position} scale={scale} rotation={[0, 0, shake * 0.06]}>
    <group position={[0, 0.3, 0]}>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.06, 0.26, 0.06]} position={[s * 0.15, 0, 0]} color="#c9ced3" ink={0.005} />
      ))}
      <InkBox size={[0.36, 0.06, 0.06]} position={[0, 0.13, 0]} color="#c9ced3" ink={0.005} />
    </group>
    <InkBox size={[0.5, 0.42, 0.16]} color="#e8b04a" />
    <InkCylinder radius={0.04} height={0.02} position={[0, -0.08, 0.085]} rotation={[Math.PI / 2, 0, 0]} color={INK} ink={0} />
    <InkBox size={[0.025, 0.07, 0.02]} position={[0, -0.13, 0.085]} color={INK} ink={0} />
    <Label text={label} position={[0, 0.08, 0.095]} width={0.4} fg="#ffffff" bg="#13235e" appear={appear} />
  </group>
);

// Wall counter with flip digits; `flip` 0..1 jolts it.
export const DayCounter: React.FC<{ position: Vec3; value: number; flip?: number }> = ({ position, value, flip = 0 }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.6, 0.18]} color="#2b2b30" />
    <InkBox size={[0.08, 0.14, 0.08]} position={[0.32, 0.36 - flip * 0.06, 0]} color="#e0262f" ink={0.004} />
    <Label text={String(value)} position={[0, -0.02, 0.1 + flip * 0.01]} rotation={[flip * -0.6, 0, 0]} width={0.4} fg={INK} bg="#ffffff" />
  </group>
);
