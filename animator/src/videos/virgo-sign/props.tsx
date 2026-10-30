import React from "react";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "A Virgo Will Fix Your Life Uninvited".

const INK = "#161212";

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale = [1, 1, 1] }) => (
  <mesh position={position} scale={scale} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// Handheld label maker with a strip of tape coming out (`strip` 0..1).
export const LabelMaker: React.FC<{ position: Vec3; rotation?: Vec3; strip?: number; text?: string; scale?: number }> = ({ position, rotation = [0, 0, 0], strip = 0, text = "PARTY", scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.16, 0.1, 0.05]} color="#3fae5a" ink={0.003} />
    <InkBox size={[0.1, 0.035, 0.01]} position={[0, 0.015, 0.03]} color="#cfe9ff" ink={0} />
    {[-0.04, 0, 0.04].map((x) => (
      <InkBox key={x} size={[0.025, 0.015, 0.01]} position={[x, -0.025, 0.03]} color="#ffffff" ink={0} />
    ))}
    {strip > 0.02 && <Label text={text} position={[0.08 + strip * 0.12, 0.0, 0.0]} width={0.24 * strip} fg={INK} bg="#ffffff" />}
  </group>
);

// Spice rack: three shelves of jars, each with a letter.
export const SpiceRack: React.FC<{ position: Vec3; letters?: string[] }> = ({ position, letters = "ABCDEFGHIJKL".split("") }) => (
  <group position={position}>
    {[0, 1, 2].map((r) => (
      <InkBox key={r} size={[1.3, 0.04, 0.22]} position={[0, r * 0.32, 0]} color="#8a4a1e" ink={0.004} />
    ))}
    {letters.map((l, i) => {
      const r = Math.floor(i / 4);
      const x = -0.48 + (i % 4) * 0.32;
      return (
        <group key={l} position={[x, r * 0.32 + 0.13, 0.02]}>
          <InkCylinder radius={0.07} height={0.2} color={["#d62828", "#e8b04a", "#3fae5a", "#7a4a2e"][i % 4]} ink={0.003} />
          <InkCylinder radius={0.072} height={0.04} position={[0, 0.11, 0]} color={INK} ink={0} />
          <Label text={l} position={[0, 0, 0.075]} width={0.1} fg={INK} bg="#ffffff" border={false} />
        </group>
      );
    })}
  </group>
);

// Wardrobe with shirts hanging in rainbow order; `open` 0..1 swings the doors.
const RAINBOW = ["#e0262f", "#f77f00", "#ffd23f", "#3fae5a", "#00b4d8", "#4f7dff", "#7b2cbf", "#ff8fc8"];
export const RainbowCloset: React.FC<{ position: Vec3; open?: number }> = ({ position, open = 1 }) => (
  <group position={position}>
    <InkBox size={[1.8, 2.1, 0.08]} position={[0, 1.05, -0.3]} color="#f7f2ff" />
    <InkBox size={[1.8, 0.08, 0.6]} position={[0, 2.06, 0]} color="#f7f2ff" />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.08, 2.1, 0.6]} position={[s * 0.9, 1.05, 0]} color="#f7f2ff" />
    ))}
    <InkCylinder radius={0.015} height={1.7} position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} color="#c9ced3" ink={0} />
    {RAINBOW.map((c, i) => (
      <group key={c} position={[-0.7 + i * 0.2, 1.4, 0]}>
        <InkBox size={[0.14, 0.7, 0.36]} color={c} ink={0.003} />
        <InkBox size={[0.02, 0.08, 0.02]} position={[0, 0.39, 0]} color="#c9ced3" ink={0} />
      </group>
    ))}
    {[-1, 1].map((s) => (
      <group key={`d${s}`} position={[s * 0.9, 0, 0.3]} rotation={[0, s * open * 1.9, 0]}>
        <InkBox size={[0.88, 2.0, 0.04]} position={[-s * 0.44, 1.05, 0]} color="#ffffff" />
      </group>
    ))}
  </group>
);

// A kitchen jar (or box) with a label on its front.
export const Jar: React.FC<{ position: Vec3; text: string; color?: string; tag?: number }> = ({ position, text, color = "#cfe9ff", tag = 1 }) => (
  <group position={position}>
    <InkCylinder radius={0.09} height={0.24} position={[0, 0.12, 0]} color={color} ink={0.003} />
    <InkCylinder radius={0.095} height={0.04} position={[0, 0.26, 0]} color="#e8b04a" ink={0.003} />
    {tag > 0.01 && <Label text={text} position={[0, 0.12, 0.095]} width={0.17 * Math.min(1, tag)} fg={INK} bg="#ffffff" />}
  </group>
);

// Picture frame on the wall, tilted by `tilt` radians; a little landscape inside.
export const PictureFrame: React.FC<{ position: Vec3; tilt?: number; size?: [number, number] }> = ({ position, tilt = 0, size = [0.8, 0.6] }) => (
  <group position={position} rotation={[0, 0, tilt]}>
    <InkBox size={[size[0], size[1], 0.05]} color="#c9a227" />
    <InkBox size={[size[0] - 0.12, size[1] - 0.12, 0.02]} position={[0, 0, 0.025]} color="#9fd8ff" ink={0} />
    <InkBox size={[size[0] - 0.12, (size[1] - 0.12) * 0.4, 0.02]} position={[0, -(size[1] - 0.12) * 0.3, 0.03]} color="#3fae5a" ink={0} />
    <Ball position={[size[0] * 0.22, size[1] * 0.15, 0.04]} radius={0.05} color="#ffd23f" glow />
  </group>
);

// Half-circle protractor overlay with a red "2°" wedge.
export const Protractor: React.FC<{ position: Vec3; appear?: number }> = ({ position, appear = 1 }) => {
  const s = Math.max(0.001, Math.min(1, appear));
  return (
    <group position={position} scale={s} userData={{ ghost: true }}>
      <mesh>
        <circleGeometry args={[0.55, 40, 0, Math.PI]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => {
        const a = (i / 12) * Math.PI;
        return <InkBox key={i} size={[0.008, 0.06, 0.004]} position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.01]} rotation={[0, 0, a - Math.PI / 2]} color={INK} ink={0} />;
      })}
      <InkBox size={[1.1, 0.012, 0.004]} position={[0, 0, 0.01]} color={INK} ink={0} />
      <InkBox size={[0.55, 0.014, 0.004]} position={[-0.27, 0.01, 0.012]} rotation={[0, 0, -0.035]} color="#e0262f" ink={0} />
    </group>
  );
};

// Tall bookshelf that tips forward about its front bottom edge (`tip` 0..1 = flat on its face).
export const Bookshelf: React.FC<{ position: Vec3; tip?: number; color?: string }> = ({ position, tip = 0, color = "#5a1e2e" }) => (
  <group position={[position[0], position[1], position[2] + 0.18]} rotation={[tip * (Math.PI / 2) * 0.92, 0, 0]}>
    <group position={[0, 0, -0.18]}>
      <InkBox size={[1.0, 2.0, 0.36]} position={[0, 1.0, 0]} color={color} />
      {[0, 1, 2, 3].map((r) => (
        <group key={r} position={[0, 0.3 + r * 0.46, 0.1]}>
          {Array.from({ length: 6 }, (_, i) => (
            <InkBox key={i} size={[0.1, 0.3 - (i % 3) * 0.03, 0.22]} position={[-0.32 + i * 0.13, 0.15, 0]} rotation={[0, 0, (i % 4 === 3 ? 0.15 : 0)]} color={RAINBOW[(i + r * 2) % RAINBOW.length]} ink={0.003} />
          ))}
        </group>
      ))}
    </group>
  </group>
);

// Couch, seat top at 0.36 m.
export const Couch: React.FC<{ position: Vec3; color?: string; width?: number }> = ({ position, color = "#7a1e3a", width = 1.8 }) => (
  <group position={position}>
    <InkBox size={[width, 0.3, 0.75]} position={[0, 0.2, 0]} color={color} />
    <InkBox size={[width - 0.3, 0.08, 0.6]} position={[0, 0.38, 0.05]} color={color} />
    <InkBox size={[width, 0.6, 0.22]} position={[0, 0.65, -0.28]} color={color} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.18, 0.5, 0.75]} position={[s * (width / 2 - 0.09), 0.4, 0]} color={color} />
    ))}
  </group>
);

// A giant rubber stamp hovering over the desk; `lift` 0..1 raises it, `shake` jitters.
export const BigStamp: React.FC<{ position: Vec3; lift?: number; shake?: number; text?: string }> = ({ position, lift = 1, shake = 0, text = "WRONG" }) => (
  <group position={[position[0] + shake * 0.02, position[1] + lift * 0.5, position[2]]} rotation={[0, 0, shake * 0.04]}>
    <InkBox size={[0.7, 0.16, 0.45]} position={[0, 0, 0]} color="#d62828" />
    <InkCylinder radius={0.07} height={0.4} position={[0, 0.28, 0]} color="#3a2a20" ink={0.004} />
    <Ball position={[0, 0.55, 0]} radius={0.14} color="#3a2a20" />
    <Label text={text} position={[0, 0, 0.23]} width={0.55} fg="#ffffff" bg="#d62828" />
  </group>
);

// Long yellow ruler on the wall with tick marks.
export const Ruler: React.FC<{ position: Vec3; length?: number; tilt?: number }> = ({ position, length = 1.8, tilt = 0 }) => (
  <group position={position} rotation={[0, 0, tilt]}>
    <InkBox size={[length, 0.16, 0.03]} color="#ffd23f" />
    {Array.from({ length: Math.floor(length / 0.1) + 1 }, (_, i) => (
      <InkBox key={i} size={[0.008, i % 5 === 0 ? 0.08 : 0.04, 0.004]} position={[-length / 2 + i * 0.1, 0.06 - (i % 5 === 0 ? 0.02 : 0), 0.018]} color={INK} ink={0} />
    ))}
  </group>
);

// Clipboard with a list that scrolls forever (`scroll` in items).
export const Clipboard: React.FC<{ position: Vec3; scroll?: number; scale?: number }> = ({ position, scroll = 0, scale = 1 }) => {
  const items = ["FRAME", "SPICES", "SOCKS", "MEL'S BOYFRIEND", "FONTS", "CRUMBS", "TAXES", "TONE", "CABLES", "SHOES"];
  const off = scroll % 1;
  const first = Math.floor(scroll);
  return (
    <group position={position} scale={scale}>
      <InkBox size={[0.8, 1.05, 0.04]} color="#a0703a" />
      <InkBox size={[0.7, 0.88, 0.01]} position={[0, -0.04, 0.025]} color="#ffffff" ink={0} />
      <InkBox size={[0.3, 0.1, 0.05]} position={[0, 0.5, 0.02]} color="#c9ced3" ink={0.004} />
      {[0, 1, 2, 3, 4].map((k) => {
        const y = 0.28 - (k - off) * 0.17;
        if (y < -0.4 || y > 0.33) return null;
        return <Label key={first + k} text={`□ ${items[(first + k) % items.length]}`} position={[0, y, 0.035]} width={0.6} fg={INK} bg="#ffffff" border={false} />;
      })}
    </group>
  );
};

// Desk drawer that slides out (`out` 0..1) with a tiny note inside.
export const NoteDrawer: React.FC<{ position: Vec3; out?: number; note?: string }> = ({ position, out = 0, note = "I'M TIRED" }) => (
  <group position={[position[0], position[1], position[2] + out * 0.35]}>
    <InkBox size={[0.6, 0.18, 0.5]} color="#8a8f98" />
    <InkBox size={[0.14, 0.03, 0.03]} position={[0, 0, 0.26]} color={INK} ink={0} />
    {out > 0.3 && <Label text={note} position={[0.05, 0.1, 0.05]} rotation={[-1.2, 0, 0.1]} width={0.2} fg={INK} bg="#fff6dc" />}
  </group>
);

// Musical notes drifting (fade with `amount`).
export const Notes: React.FC<{ position: Vec3; f: number; amount?: number }> = ({ position, f, amount = 1 }) =>
  amount < 0.02 ? null : (
    <group position={position} userData={{ ghost: true }} scale={amount}>
      {[0, 1, 2, 3].map((i) => {
        const t = (f * 0.015 + i / 4) % 1;
        return <Label key={i} text="♪" position={[Math.sin(i * 2.3 + t * 3) * 0.6, t * 0.9, i * 0.05]} width={0.16} fg="#ffffff" bg="#7b2cbf" border={false} />;
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
