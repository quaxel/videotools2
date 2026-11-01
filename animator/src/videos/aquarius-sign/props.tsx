import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "An Aquarius Quits When It Gets Cool".
// Parts that touch are kept 1-2 cm apart (or fully inside one another) so no two faces are coplanar.

const INK = "#161212";
const FONT = "'Arial Black', Impact, sans-serif";

export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// A cel ball with an ink outline.
export const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3; ink?: number }> = ({ position, radius, color, glow, scale = [1, 1, 1], ink = 1.07 }) => (
  <group position={position} scale={scale}>
    <mesh castShadow={!glow}>
      <sphereGeometry args={[radius, 20, 16]} />
      {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
    </mesh>
    {!glow && ink > 1 && (
      <mesh scale={ink}>
        <sphereGeometry args={[radius, 20, 16]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// ---------- street (protest / yellow day) ----------

// A city building front: a coloured facade with window rows, a cornice, a shopfront and an optional striped awning.
export const Facade: React.FC<{ x: number; z: number; w: number; h: number; color: string; trim?: string; awning?: string; seed?: number; shop?: string }> = ({
  x,
  z,
  w,
  h,
  color,
  trim = "#fff6dc",
  awning,
  seed = 0,
  shop,
}) => {
  const cols = Math.max(2, Math.round(w / 0.75));
  const rows = Math.max(2, Math.floor((h - 1.4) / 0.9));
  return (
    <group position={[x, 0, z]}>
      <InkBox size={[w, h, 0.4]} position={[0, h / 2, -0.2]} color={color} ink={0.008} />
      <InkBox size={[w + 0.12, 0.14, 0.5]} position={[0, h - 0.07, -0.18]} color={trim} ink={0.006} />
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const lit = rnd(seed + r * 7 + c) > 0.7;
          return (
            <group key={`${r}-${c}`} position={[-w / 2 + (c + 0.5) * (w / cols), 1.75 + r * 0.9, 0.012]}>
              <InkBox size={[0.36, 0.52, 0.02]} position={[0, 0, 0]} color={trim} ink={0.004} />
              <InkBox size={[0.28, 0.44, 0.02]} position={[0, 0, 0.012]} color={lit ? "#ffe6a8" : "#5a7a9a"} ink={0} />
              <InkBox size={[0.42, 0.05, 0.08]} position={[0, -0.3, 0.03]} color={trim} ink={0.003} />
            </group>
          );
        }),
      )}
      {/* Shopfront: dark glass and a sign band */}
      <InkBox size={[w * 0.8, 0.95, 0.03]} position={[0, 0.55, 0.012]} color="#2a3550" ink={0.004} />
      <InkBox size={[0.04, 0.95, 0.05]} position={[0, 0.55, 0.03]} color={trim} ink={0.003} />
      {shop && <Label text={shop} position={[0, 1.2, 0.04]} width={Math.min(1.2, w * 0.6)} fg="#13235e" bg={trim} />}
      {awning && (
        <group position={[0, 1.13, 0.22]} rotation={[0.45, 0, 0]}>
          {Array.from({ length: 8 }, (_, i) => (
            <InkBox key={i} size={[(w * 0.86) / 8 + 0.002, 0.02, 0.5]} position={[-w * 0.43 + ((i + 0.5) * w * 0.86) / 8, 0, 0]} color={i % 2 ? "#fff6dc" : awning} ink={i === 0 ? 0.004 : 0} />
          ))}
        </group>
      )}
    </group>
  );
};

// Street lamp: a dark pole with a bracket and a lantern.
export const Lamppost: React.FC<{ position: Vec3; lit?: boolean }> = ({ position, lit }) => (
  <group position={position}>
    <InkCylinder radius={0.04} height={2.6} position={[0, 1.3, 0]} color="#2a2f3a" ink={0.006} />
    <InkCylinder radius={0.09} height={0.12} position={[0, 0.06, 0]} color="#2a2f3a" ink={0.006} />
    <InkBox size={[0.36, 0.035, 0.035]} position={[0.16, 2.55, 0]} color="#2a2f3a" ink={0.004} />
    <InkBox size={[0.14, 0.2, 0.14]} position={[0.32, 2.42, 0]} color={lit ? "#ffe6a8" : "#cfd8e0"} ink={0.006} />
  </group>
);

// Metal crowd barrier: two rails, vertical bars and splayed feet. Front at z = 0.
export const Barrier: React.FC<{ position: Vec3; width?: number; rotationY?: number; color?: string }> = ({ position, width = 1.6, rotationY = 0, color = "#c9ced3" }) => {
  const bars = Math.round(width / 0.14);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[0.12, 0.98].map((y) => (
        <InkCylinder key={y} radius={0.018} height={width} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} color={color} ink={0.004} />
      ))}
      {Array.from({ length: bars - 1 }, (_, i) => (
        <InkCylinder key={i} radius={0.008} height={0.86} position={[-width / 2 + ((i + 1) * width) / bars, 0.55, 0]} color={color} ink={0.003} />
      ))}
      {[-1, 1].map((s) => (
        <group key={s} position={[(s * width) / 2, 0, 0]}>
          <InkCylinder radius={0.02} height={1.0} position={[0, 0.5, 0]} color={color} ink={0.004} />
          <InkBox size={[0.04, 0.03, 0.5]} position={[0, 0.015, 0]} color="#7a8088" ink={0.003} />
        </group>
      ))}
    </group>
  );
};

// A placard on a stick: a white card with a slogan (and optionally the zodiac badge drawn by the scene). Faces +z.
export const Placard: React.FC<{ position: Vec3; text: string; bg?: string; fg?: string; tilt?: number; width?: number; stick?: number }> = ({
  position,
  text,
  bg = "#fff6dc",
  fg = "#e0262f",
  tilt = 0,
  width = 0.55,
  stick = 0.9,
}) => {
  const lines = text.split("\n").length;
  const h = (width / 4) * lines + 0.08;
  return (
    <group position={position} rotation={[0, 0, tilt]} userData={{ ghost: true }}>
      <InkBox size={[0.03, stick, 0.03]} position={[0, stick / 2, -0.03]} color="#a8784a" ink={0.004} />
      <InkBox size={[width + 0.06, h, 0.02]} position={[0, stick + h / 2 - 0.05, 0]} color={bg} ink={0.005} />
      <Label text={text} position={[0, stick + h / 2 - 0.05, 0.012]} width={width} fg={fg} bg={bg} border={false} />
    </group>
  );
};

// A long cloth banner stretched between two poles, sagging a little; text on it. Faces +z.
export const Banner: React.FC<{ x: number; z: number; width: number; y?: number; text: string; color?: string; fg?: string; f?: number }> = ({ x, z, width, y = 1.85, text, color = "#e0262f", fg = "#ffffff", f = 0 }) => {
  const ripple = Math.sin(f * 0.12) * 0.03;
  return (
    <group position={[x, 0, z]} userData={{ ghost: true }}>
      {[-1, 1].map((s) => (
        <InkCylinder key={s} radius={0.02} height={y + 0.35} position={[(s * width) / 2, (y + 0.35) / 2, -0.02]} color="#a8784a" ink={0.004} />
      ))}
      <group position={[0, y, 0]} rotation={[ripple, 0, 0]}>
        <InkBox size={[width - 0.04, 0.42, 0.012]} position={[0, 0, 0]} color={color} ink={0.004} />
        <Label text={text} position={[0, 0, 0.009]} width={Math.min(width * 0.9, text.length * 0.13)} fg={fg} bg={color} border={false} />
      </group>
    </group>
  );
};

// A flag on a pole, the cloth waving in three strips.
export const Flag: React.FC<{ position: Vec3; color: string; f: number; height?: number; stripe?: string }> = ({ position, color, f, height = 2.3, stripe }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkCylinder radius={0.015} height={height} position={[0, height / 2, 0]} color="#a8784a" ink={0.003} />
    {[0, 1, 2].map((i) => (
      <group key={i} position={[0.02 + i * 0.16, height - 0.2, 0]} rotation={[0, Math.sin(f * 0.18 - i * 0.9) * 0.35, 0]}>
        <InkBox size={[0.17, 0.34, 0.01]} position={[0.08, 0, 0]} color={stripe && i === 1 ? stripe : color} ink={0.003} />
      </group>
    ))}
  </group>
);

// Café table with two chairs for the sunny street.
export const CafeTable: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#ffd23f" }) => (
  <group position={position}>
    <InkCylinder radius={0.3} height={0.03} position={[0, 0.72, 0]} color="#ffffff" ink={0.004} />
    <InkCylinder radius={0.025} height={0.7} position={[0, 0.36, 0]} color="#2a2f3a" ink={0.003} />
    <InkCylinder radius={0.18} height={0.02} position={[0, 0.01, 0]} color="#2a2f3a" ink={0.003} />
    <InkCylinder radius={0.03} height={0.08} position={[0.06, 0.78, 0.04]} color={color} ink={0.003} />
  </group>
);

// Ring light on a tripod: a glowing white ring (influencer kit). Faces +z.
export const RingLight: React.FC<{ position: Vec3; on?: number; height?: number }> = ({ position, on = 1, height = 1.45 }) => (
  <group position={position} userData={{ ghost: true }}>
    {[-1, 0, 1].map((s) => (
      <InkBox key={s} size={[0.02, 0.9, 0.02]} position={[s * 0.12, 0.42, s === 0 ? -0.12 : 0.06]} rotation={[s === 0 ? -0.25 : 0.12, 0, s * 0.25]} color="#2a2f3a" ink={0.003} />
    ))}
    <InkCylinder radius={0.014} height={height - 0.8} position={[0, 0.8 + (height - 0.8) / 2, 0]} color="#2a2f3a" ink={0.003} />
    <mesh position={[0, height + 0.18, 0]}>
      <torusGeometry args={[0.2, 0.035, 12, 40]} />
      <meshBasicMaterial color={on > 0.5 ? "#ffffff" : "#cfd8e0"} toneMapped={false} />
    </mesh>
    <mesh position={[0, height + 0.18, -0.005]}>
      <torusGeometry args={[0.2, 0.048, 12, 40]} />
      <meshBasicMaterial color={INK} />
    </mesh>
    {on > 0.5 && <Halo position={[0, height + 0.18, 0.03]} size={0.9} color="#ffffff" strength={0.45 * on} />}
  </group>
);

// ---------- bedroom ----------

export const Bed: React.FC<{ position: Vec3; color?: string; sheet?: string }> = ({ position, color = "#5a3a7a", sheet = "#ffd23f" }) => (
  <group position={position}>
    <InkBox size={[1.0, 0.25, 1.9]} position={[0, 0.25, 0]} color="#8a5a3a" />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.06, 0.14, 0.06]} position={[sx * 0.44, 0.07, sz * 0.88]} color="#6b4a2e" ink={0.003} />))}
    <InkBox size={[0.96, 0.14, 1.84]} position={[0, 0.44, 0]} color="#fff6dc" ink={0.004} />
    <InkBox size={[0.98, 0.06, 1.2]} position={[0, 0.53, 0.32]} color={sheet} ink={0.004} />
    <InkBox size={[0.6, 0.12, 0.3]} position={[0, 0.57, -0.72]} color="#ffffff" ink={0.004} />
    <InkBox size={[1.0, 0.7, 0.06]} position={[0, 0.55, -0.96]} color={color} />
  </group>
);

// Desk globe on a stand, spinning; a label card on the base.
export const Globe: React.FC<{ position: Vec3; spin?: number; label?: string; scale?: number }> = ({ position, spin = 0, label, scale = 1 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 256, (ctx) => {
        ctx.fillStyle = "#4f9de0";
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = "#5fbf5a";
        [
          [80, 80, 60, 40],
          [120, 160, 40, 55],
          [260, 70, 70, 45],
          [280, 150, 40, 50],
          [400, 90, 60, 35],
          [430, 180, 30, 25],
        ].forEach(([x, y, rx, ry]) => {
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
          ctx.fill();
        });
      }),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <InkCylinder radius={0.08} height={0.03} position={[0, 0.015, 0]} color="#d4a63a" ink={0.003} />
      <InkCylinder radius={0.012} height={0.12} position={[0, 0.09, 0]} color="#d4a63a" ink={0.003} />
      <group position={[0, 0.27, 0]} rotation={[0, 0, 0.4]}>
        <mesh rotation={[0, spin, 0]} castShadow>
          <sphereGeometry args={[0.15, 28, 20]} />
          <meshToonMaterial map={tex} gradientMap={toonRamp} />
        </mesh>
        <mesh scale={1.06}>
          <sphereGeometry args={[0.15, 28, 20]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
      {label && <Label text={label} position={[0, 0.07, 0.1]} width={0.3} fg="#ffffff" bg="#5a2a8a" />}
    </group>
  );
};

// Lava lamp: a tapered glass with blobs drifting up and down.
export const LavaLamp: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position}>
    <InkCylinder radius={0.06} height={0.1} position={[0, 0.05, 0]} color="#c0c8d0" ink={0.003} />
    <mesh position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.035, 0.055, 0.3, 24]} />
      <meshBasicMaterial color="#ff4fd8" transparent opacity={0.55} toneMapped={false} />
    </mesh>
    {[0, 1, 2].map((i) => (
      <Ball key={i} position={[0, 0.14 + ((Math.sin(f * 0.04 + i * 2.1) + 1) / 2) * 0.2, 0]} radius={0.022 + i * 0.006} color="#ffd23f" glow />
    ))}
    <InkCylinder radius={0.035} height={0.05} position={[0, 0.425, 0]} color="#c0c8d0" ink={0.003} />
    <Halo position={[0, 0.25, 0.05]} size={0.5} color="#ff4fd8" strength={0.35} />
  </group>
);

// A window onto the street with people outside, and two curtains that close (`close` 0..1). Faces +z.
export const CurtainWindow: React.FC<{ position: Vec3; close?: number; f?: number; people?: boolean }> = ({ position, close = 0, f = 0, people = true }) => (
  <group position={position}>
    <InkBox size={[1.12, 1.22, 0.06]} position={[0, 0, 0]} color="#fff6dc" ink={0.006} />
    <InkBox size={[1.0, 1.1, 0.02]} position={[0, 0, 0.025]} color="#9fd8ff" ink={0} />
    {/* Outside: rooftops and three waving neighbours as simple heads and arms */}
    <InkBox size={[1.0, 0.3, 0.01]} position={[0, -0.4, 0.04]} color="#c9a26b" ink={0} />
    {people &&
      [-0.3, 0.0, 0.3].map((x, i) => (
        <group key={x} position={[x, -0.18, 0.045]}>
          <Ball position={[0, 0.12, 0]} radius={0.06} color={["#f1c9a5", "#8d5524", "#e0ac69"][i]} />
          <InkBox size={[0.13, 0.15, 0.01]} position={[0, -0.02, 0]} color={["#3fae5a", "#e0262f", "#4f7dff"][i]} ink={0.003} />
          <InkBox size={[0.025, 0.12, 0.01]} position={[0.08, 0.12, 0.003]} rotation={[0, 0, -0.4 + Math.sin(f * 0.4 + i) * 0.4]} color={["#f1c9a5", "#8d5524", "#e0ac69"][i]} ink={0.003} />
        </group>
      ))}
    <InkBox size={[1.0, 0.03, 0.03]} position={[0, 0, 0.07]} color="#fff6dc" ink={0.003} />
    <InkBox size={[0.03, 1.1, 0.03]} position={[0, 0, 0.07]} color="#fff6dc" ink={0.003} />
    <InkCylinder radius={0.015} height={1.5} position={[0, 0.68, 0.14]} rotation={[0, 0, Math.PI / 2]} color="#d4a63a" ink={0.003} />
    {[-1, 1].map((s) => {
      const w = 0.22 + 0.36 * close;
      return (
        <group key={s} position={[s * (0.72 - w / 2), -0.02, 0.16 + (s > 0 ? 0.012 : 0)]}>
          {Array.from({ length: 4 }, (_, i) => (
            <InkBox key={i} size={[w / 4 + 0.004, 1.38, 0.03]} position={[-w / 2 + (i + 0.5) * (w / 4), 0, i % 2 ? 0.02 : 0]} color={i % 2 ? "#7a3aa8" : "#9b5de5"} ink={i === 0 ? 0.004 : 0} />
          ))}
        </group>
      );
    })}
  </group>
);

// A poster on the wall (no glow), a few words on it.
export const Poster: React.FC<{ position: Vec3; text: string; bg: string; fg: string; width?: number; rotation?: Vec3 }> = ({ position, text, bg, fg, width = 0.5, rotation = [0, 0, 0] }) => {
  const lines = text.split("\n").length;
  const h = (width / 4) * lines + 0.25;
  return (
    <group position={position} rotation={rotation}>
      <InkBox size={[width + 0.06, h, 0.01]} position={[0, 0, 0]} color={bg} ink={0.004} />
      <Ball position={[0, h * 0.18, 0.012]} radius={0.06} color={fg} />
      <Label text={text} position={[0, -h * 0.22, 0.008]} width={width} fg={fg} bg={bg} border={false} />
    </group>
  );
};

// ---------- bathroom ----------

// White roll-top tub on four claw feet, full of amber kombucha with the cream culture floating on top. Long axis x.
export const ClawTub: React.FC<{ position: Vec3; fill?: number; bubble?: number; f?: number; scale?: Vec3 }> = ({ position, fill = 1, bubble = 0, f = 0, scale = [1, 1, 1] }) => (
  <group position={position} scale={scale}>
    {/* Body: a rounded box made from a box plus two half-cylinder ends */}
    <InkBox size={[1.1, 0.42, 0.66]} position={[0, 0.42, 0]} color="#f6f6f2" />
    {[-1, 1].map((s) => (
      <InkCylinder key={s} radius={0.33} height={0.42} position={[s * 0.55, 0.42, 0]} color="#f6f6f2" />
    ))}
    {/* Roll-top rim */}
    <InkBox size={[1.14, 0.05, 0.72]} position={[0, 0.655, 0]} color="#ffffff" ink={0.008} />
    {[-1, 1].map((s) => (
      <InkCylinder key={s} radius={0.36} height={0.05} position={[s * 0.55, 0.655, 0]} color="#ffffff" ink={0.008} />
    ))}
    {/* The tea, brim-full above the rim, the culture discs and bubbles */}
    <group position={[0, 0.695 + 0.0 * fill, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.08, 0.62]} />
        <meshToonMaterial color="#a8641e" gradientMap={toonRamp} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.54, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.31, 32, s > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI]} />
          <meshToonMaterial color="#a8641e" gradientMap={toonRamp} />
        </mesh>
      ))}
      {[
        [-0.35, 0.0, 0.2],
        [0.2, 0.05, 0.24],
        [0.62, -0.05, 0.14],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.006 + i * 0.002, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]}>
          <circleGeometry args={[r, 24]} />
          <meshToonMaterial color="#e8d9b0" gradientMap={toonRamp} />
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const t = ((f * (0.6 + bubble) + i * 9) % 30) / 30;
        return <Ball key={i} position={[-0.7 + rnd(i) * 1.4, 0.012 + t * 0.02 * (1 + bubble * 4), -0.22 + rnd(i + 3) * 0.44]} radius={0.015 + rnd(i + 5) * 0.015 * (1 + bubble)} color="#d49a4a" ink={1.15} />;
      })}
    </group>
    {/* Chrome taps at the right end */}
    <InkCylinder radius={0.02} height={0.3} position={[0.82, 0.8, -0.12]} color="#c9ced3" ink={0.004} />
    <InkBox size={[0.16, 0.03, 0.03]} position={[0.76, 0.94, -0.12]} color="#c9ced3" ink={0.004} />
    {[-0.08, 0.08].map((dz) => (
      <Ball key={dz} position={[0.86, 0.9, -0.12 + dz]} radius={0.03} color="#e0262f" />
    ))}
    {/* Claw feet */}
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * 0.62, 0, sz * 0.22]}>
          <InkCylinder radius={0.035} height={0.22} position={[0, 0.11, 0]} color="#d4a63a" ink={0.004} />
          <Ball position={[0, 0.03, 0.02]} radius={0.045} color="#d4a63a" scale={[1.2, 0.7, 1.4]} />
        </group>
      )),
    )}
  </group>
);

// A big glass brewing jar of amber tea, cloth over the mouth tied with string, the culture floating at the top.
export const BrewJar: React.FC<{ position: Vec3; scale?: number; cloth?: string }> = ({ position, scale = 1, cloth = "#fff6dc" }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.11} height={0.3} position={[0, 0.15, 0]} color="#b8742a" ink={0.006} />
    <mesh position={[0, 0.15, 0]}>
      <cylinderGeometry args={[0.118, 0.118, 0.32, 28]} />
      <meshBasicMaterial color="#e8fff6" transparent opacity={0.22} depthWrite={false} />
    </mesh>
    <InkCylinder radius={0.105} height={0.03} position={[0, 0.27, 0]} color="#e8d9b0" ink={0} />
    <InkCylinder radius={0.075} height={0.05} position={[0, 0.335, 0]} color="#e8fff6" ink={0.004} />
    <InkCylinder radius={0.09} height={0.035} position={[0, 0.37, 0]} color={cloth} ink={0.004} />
    <InkCylinder radius={0.079} height={0.012} position={[0, 0.345, 0]} color="#c0392b" ink={0} />
  </group>
);

// A flip-top bottle of kombucha.
export const Bottle: React.FC<{ position: Vec3; color?: string; label?: string }> = ({ position, color = "#a8641e" }) => (
  <group position={position}>
    <InkCylinder radius={0.035} height={0.18} position={[0, 0.09, 0]} color={color} ink={0.004} />
    <InkCylinder radius={0.016} height={0.07} position={[0, 0.215, 0]} color={color} ink={0.003} />
    <InkCylinder radius={0.019} height={0.02} position={[0, 0.255, 0]} color="#ffffff" ink={0.003} />
    <InkCylinder radius={0.0355} height={0.06} position={[0, 0.09, 0]} color="#fff6dc" ink={0} />
  </group>
);

// Wall mirror cabinet with a bare bulb above it.
export const MirrorCabinet: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.55, 0.65, 0.12]} position={[0, 0, 0.06]} color="#fff6dc" ink={0.006} />
    <InkBox size={[0.47, 0.57, 0.01]} position={[0, 0, 0.125]} color="#bfe3f0" ink={0} />
    <mesh position={[-0.1, 0.1, 0.132]} rotation={[0, 0, 0.6]}>
      <planeGeometry args={[0.05, 0.3]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} toneMapped={false} />
    </mesh>
    <InkCylinder radius={0.012} height={0.12} position={[0, 0.42, 0.06]} rotation={[Math.PI / 2, 0, 0]} color="#2a2f3a" ink={0.003} />
    <Ball position={[0, 0.42, 0.14]} radius={0.05} color="#fff1c0" glow />
    <Halo position={[0, 0.42, 0.18]} size={0.8} color="#ffe6a8" strength={0.5} />
  </group>
);

// Towel on a chrome rail.
export const TowelRail: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#e0262f" }) => (
  <group position={position}>
    <InkCylinder radius={0.012} height={0.6} position={[0, 0, 0.06]} rotation={[0, 0, Math.PI / 2]} color="#c9ced3" ink={0.003} />
    <InkBox size={[0.4, 0.5, 0.03]} position={[0, -0.24, 0.075]} color={color} ink={0.005} />
    <InkBox size={[0.4, 0.05, 0.032]} position={[0, -0.4, 0.077]} color="#ffffff" ink={0} />
  </group>
);

// One sandal with a wool sock in it, toe toward +z: cork sole, two straps, a striped sock with a cuff.
export const SockSandal: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; sock?: string }> = ({ position, rotation = [0, 0, 0], scale = 1, sock = "#c0392b" }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkBox size={[0.11, 0.025, 0.27]} position={[0, 0.0125, 0]} color="#8a5a3a" ink={0.004} />
    <InkBox size={[0.105, 0.012, 0.26]} position={[0, 0.031, 0]} color="#c99a6b" ink={0} />
    {/* sock foot and leg */}
    <InkBox size={[0.085, 0.06, 0.22]} position={[0, 0.07, 0.0]} color={sock} ink={0.004} />
    <InkBox size={[0.085, 0.16, 0.08]} position={[0, 0.17, -0.07]} color={sock} ink={0.004} />
    {[0.13, 0.19].map((y) => (
      <InkBox key={y} size={[0.087, 0.02, 0.082]} position={[0, y, -0.07]} color="#fff6dc" ink={0} />
    ))}
    <InkBox size={[0.09, 0.03, 0.085]} position={[0, 0.255, -0.07]} color="#fff6dc" ink={0.003} />
    {/* straps */}
    {[0.05, -0.04].map((z) => (
      <InkBox key={z} size={[0.12, 0.022, 0.035]} position={[0, 0.095, z]} color="#5a3a2a" ink={0.003} />
    ))}
  </group>
);

// Kombucha foam blast out of the tub: a column of inked foam blobs shoots up, splats across the ceiling, spreads,
// drips back down, with amber droplets flying out. `t` = frames since the blast; `ceiling` = the ceiling height.
export const FoamBlast: React.FC<{ position: Vec3; t: number; ceiling?: number; width?: number }> = ({ position, t, ceiling = 2.6, width = 1.6 }) => {
  if (t < 0) return null;
  const up = Math.min(1, t / 6); // column reaches the ceiling in 6 frames
  const top = ceiling - position[1];
  const spread = Math.min(1, Math.max(0, (t - 4) / 14));
  const blobs: { p: Vec3; r: number; k: number }[] = [];
  // Column
  for (let i = 0; i < 14; i++) {
    const y = (i / 13) * top * up;
    const w = 1 - Math.min(1, Math.max(0, (t - 16) / 24)) * (1 - i / 13); // the lower column thins out later
    blobs.push({ p: [(rnd(i) - 0.5) * 0.25, y, (rnd(i + 2) - 0.5) * 0.2], r: (0.16 + rnd(i + 4) * 0.08) * (0.6 + 0.4 * up) * w, k: i });
  }
  // Ceiling splat spreading outward
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rnd(i + 30);
    const d = spread * (width / 2) * (0.4 + rnd(i + 31) * 0.6);
    blobs.push({ p: [Math.cos(a) * d * 1.3, top - 0.1 - rnd(i + 32) * 0.08, Math.sin(a) * d * 0.5], r: (0.14 + rnd(i + 33) * 0.1) * Math.min(1, spread * 2 + 0.2), k: 100 + i });
  }
  // Drips falling from the ceiling, and a foam pile around the tub
  const drips = Array.from({ length: 9 }, (_, i) => {
    const start = 14 + rnd(i + 60) * 20;
    const dt = t - start;
    if (dt < 0) return null;
    const x = (rnd(i + 61) - 0.5) * width;
    const y = top - 0.15 - dt * dt * 0.004;
    if (y < 0.05 - position[1]) return null;
    return { p: [x, y, (rnd(i + 62) - 0.5) * 0.4] as Vec3, r: 0.035 + rnd(i + 63) * 0.025 };
  }).filter(Boolean) as { p: Vec3; r: number }[];
  const droplets = Array.from({ length: 26 }, (_, i) => {
    const dt = t - rnd(i + 80) * 4;
    if (dt < 0 || dt > 30) return null;
    const a = rnd(i + 81) * Math.PI * 2;
    const v = 0.05 + rnd(i + 82) * 0.05;
    return { p: [Math.cos(a) * v * dt, 0.3 + dt * 0.09 - dt * dt * 0.006, Math.sin(a) * v * dt * 0.6 + 0.05] as Vec3, r: 0.02 + rnd(i + 83) * 0.015 };
  }).filter(Boolean) as { p: Vec3; r: number }[];
  return (
    <group position={position} userData={{ ghost: true }}>
      {blobs.map(({ p, r, k }) =>
        r > 0.01 ? (
          <group key={k} position={p}>
            <mesh scale={r * 1.12}>
              <sphereGeometry args={[1, 18, 14]} />
              <meshBasicMaterial color={INK} side={THREE.BackSide} />
            </mesh>
            <mesh scale={r}>
              <sphereGeometry args={[1, 18, 14]} />
              <meshToonMaterial color={k % 3 === 0 ? "#f3e2b8" : "#fff4dc"} gradientMap={toonRamp} />
            </mesh>
            <mesh position={[-r * 0.35, r * 0.35, r * 0.75]} scale={r * 0.25}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
          </group>
        ) : null,
      )}
      {drips.map(({ p, r }, i) => (
        <Ball key={`d${i}`} position={p} radius={r} color="#f3e2b8" scale={[1, 1.5, 1]} />
      ))}
      {droplets.map(({ p, r }, i) => (
        <Ball key={`a${i}`} position={p} radius={r} color="#c0782a" />
      ))}
    </group>
  );
};

// A low foam layer on the floor round the tub after the blast.
export const FoamPile: React.FC<{ x: number; z: number; w: number; d: number; grow?: number }> = ({ x, z, w, d, grow = 1 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: 16 }, (_, i) => (
      <Ball key={i} position={[x + (rnd(i + 200) - 0.5) * w, 0.02, z + (rnd(i + 201) - 0.5) * d]} radius={(0.08 + rnd(i + 202) * 0.06) * grow} color={i % 3 ? "#fff4dc" : "#f3e2b8"} scale={[1.3, 0.6, 1]} />
    ))}
  </group>
);

// ---------- laundromat ----------

// Front-loading washer: a steel box, a control strip on top and a round porthole with tumbling washing. Faces +z.
export const Washer: React.FC<{ position: Vec3; f?: number; spin?: number; color?: string; big?: boolean }> = ({ position, f = 0, spin = 1, color = "#e8eef0", big }) => {
  const s = big ? 1.12 : 1;
  return (
    <group position={position} scale={s}>
      <InkBox size={[0.6, 0.85, 0.6]} position={[0, 0.425, 0]} color={color} ink={0.008} />
      <InkBox size={[0.56, 0.12, 0.02]} position={[0, 0.77, 0.305]} color="#2a3550" ink={0.003} />
      <InkBox size={[0.08, 0.05, 0.01]} position={[0.16, 0.77, 0.318]} color="#7fffd4" ink={0} emissive="#3fae8a" />
      {[-0.18, -0.06].map((x) => (
        <InkCylinder key={x} radius={0.022} height={0.02} position={[x, 0.77, 0.318]} rotation={[Math.PI / 2, 0, 0]} color="#c9ced3" ink={0.002} />
      ))}
      <InkCylinder radius={0.22} height={0.04} position={[0, 0.38, 0.31]} rotation={[Math.PI / 2, 0, 0]} color="#b4bcc4" ink={0.006} />
      <mesh position={[0, 0.38, 0.332]}>
        <circleGeometry args={[0.17, 32]} />
        <meshBasicMaterial color="#5fbfd0" toneMapped={false} />
      </mesh>
      <group position={[0, 0.38, 0.334]} rotation={[0, 0, f * 0.25 * spin]}>
        {["#e0262f", "#ffd23f", "#ffffff", "#4f7dff"].map((c, i) => (
          <mesh key={c} position={[Math.cos(i * 1.6) * 0.08, Math.sin(i * 1.6) * 0.08 - 0.03, 0.001 * i]}>
            <circleGeometry args={[0.05, 12]} />
            <meshBasicMaterial color={c} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[-0.06, 0.44, 0.34]} rotation={[0, 0, 0.7]}>
        <planeGeometry args={[0.03, 0.14]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
};

// A stack of two big dryers on the back wall.
export const DryerStack: React.FC<{ position: Vec3; f?: number }> = ({ position, f = 0 }) => (
  <group position={position}>
    {[0, 1].map((r) => (
      <group key={r} position={[0, r * 0.82, 0]}>
        <InkBox size={[0.72, 0.8, 0.55]} position={[0, 0.4, 0]} color="#d0d8dc" ink={0.008} />
        <InkCylinder radius={0.26} height={0.04} position={[0, 0.4, 0.28]} rotation={[Math.PI / 2, 0, 0]} color="#8a9099" ink={0.006} />
        <mesh position={[0, 0.4, 0.302]}>
          <circleGeometry args={[0.21, 32]} />
          <meshBasicMaterial color="#2a3550" toneMapped={false} />
        </mesh>
        <group position={[0, 0.4, 0.304]} rotation={[0, 0, -f * 0.18 - r]}>
          {["#ff8fc8", "#3fae5a", "#ffd23f"].map((c, i) => (
            <mesh key={c} position={[Math.cos(i * 2.1) * 0.1, Math.sin(i * 2.1) * 0.1, 0.001 * i]}>
              <circleGeometry args={[0.06, 12]} />
              <meshBasicMaterial color={c} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    ))}
  </group>
);

// Fluorescent tube fitting hanging under the ceiling: a long white glowing bar with a halo.
export const FluoTube: React.FC<{ position: Vec3; length?: number; on?: number }> = ({ position, length = 1.4, on = 1 }) => (
  <group position={position}>
    <InkBox size={[length + 0.08, 0.05, 0.16]} position={[0, 0.04, 0]} color="#c9ced3" ink={0.004} />
    {[-0.04, 0.04].map((z) => (
      <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, length, 12]} />
        <meshBasicMaterial color={on > 0.5 ? "#f2fff8" : "#a8b0b8"} toneMapped={false} />
      </mesh>
    ))}
    {on > 0.5 && <Halo position={[0, -0.02, 0.05]} size={length * 1.2} color="#d8fff0" strength={0.3} />}
  </group>
);

// Folding table with a steel top on four legs (top at 0.85 m).
export const FoldTable: React.FC<{ position: Vec3; size?: [number, number] }> = ({ position, size = [1.4, 0.6] }) => (
  <group position={position}>
    <InkBox size={[size[0], 0.05, size[1]]} position={[0, 0.85, 0]} color="#c9ced3" />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.05, 0.83, 0.05]} position={[sx * (size[0] / 2 - 0.06), 0.415, sz * (size[1] / 2 - 0.06)]} color="#7a8088" ink={0.003} />))}
    <InkBox size={[size[0] - 0.2, 0.03, size[1] - 0.15]} position={[0, 0.25, 0]} color="#7a8088" ink={0.003} />
  </group>
);

// Wire laundry cart on castors.
export const LaundryCart: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#f77f00" }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.35, 0.38]} position={[0, 0.55, 0]} color={color} ink={0.005} />
    <InkBox size={[0.46, 0.06, 0.34]} position={[0, 0.74, 0]} color="#ffffff" ink={0.003} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkCylinder key={`${sx}${sz}`} radius={0.012} height={0.36} position={[sx * 0.22, 0.2, sz * 0.16]} color="#7a8088" ink={0.002} />))}
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <Ball key={`w${sx}${sz}`} position={[sx * 0.22, 0.03, sz * 0.16]} radius={0.03} color="#2a2f3a" />))}
    <InkCylinder radius={0.012} height={0.5} position={[0, 1.0, -0.19]} rotation={[0, 0, Math.PI / 2]} color="#7a8088" ink={0.002} />
    {[-1, 1].map((s) => (
      <InkCylinder key={s} radius={0.012} height={0.3} position={[s * 0.24, 0.87, -0.19]} color="#7a8088" ink={0.002} />
    ))}
  </group>
);

// Plastic stacking chair (seat 0.45 m).
export const PlasticChair: React.FC<{ position: Vec3; color?: string; rotationY?: number }> = ({ position, color = "#f77f00", rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.42, 0.04, 0.4]} position={[0, 0.43, 0]} color={color} ink={0.004} />
    <InkBox size={[0.42, 0.38, 0.04]} position={[0, 0.66, -0.19]} rotation={[-0.1, 0, 0]} color={color} ink={0.004} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkCylinder key={`${sx}${sz}`} radius={0.013} height={0.42} position={[sx * 0.18, 0.21, sz * 0.17]} color="#7a8088" ink={0.002} />))}
  </group>
);

// Guitar held across the body (world space, faces +z). Body at the strumming hand, neck up to the left.
export const Guitar: React.FC<{ position: Vec3; tilt?: number; color?: string; scale?: number }> = ({ position, tilt = 0.6, color = "#e0262f", scale = 1 }) => (
  <group position={position} rotation={[0, 0, tilt]} scale={scale} userData={{ ghost: true }}>
    <Ball position={[0, -0.04, 0]} radius={0.14} color={color} scale={[1, 1.1, 0.35]} />
    <Ball position={[0, 0.12, 0]} radius={0.1} color={color} scale={[1, 1, 0.35]} />
    <mesh position={[0, 0.02, 0.05]}>
      <circleGeometry args={[0.04, 20]} />
      <meshBasicMaterial color={INK} />
    </mesh>
    <InkBox size={[0.04, 0.42, 0.025]} position={[0, 0.38, 0.02]} color="#6b4a2e" ink={0.003} />
    <InkBox size={[0.06, 0.09, 0.03]} position={[0, 0.62, 0.02]} color="#2a1d14" ink={0.003} />
    <InkBox size={[0.1, 0.02, 0.02]} position={[0, -0.13, 0.05]} color="#2a1d14" ink={0} />
  </group>
);

// Upturned buckets as a drum kit, with a laundry basket seat.
export const BucketDrums: React.FC<{ position: Vec3; hit?: number }> = ({ position, hit = 0 }) => (
  <group position={position}>
    {[
      [-0.25, 0.0, "#4f7dff", 0.3],
      [0.25, 0.0, "#ffd23f", 0.3],
      [0.0, 0.1, "#e0262f", 0.22],
    ].map(([x, z, c, h], i) => (
      <group key={i} position={[x as number, 0, (z as number) + 0.25]} scale={[1, i === 0 ? 1 - hit * 0.08 : 1, 1]}>
        <mesh position={[0, (h as number) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.16, h as number, 24]} />
          <meshToonMaterial color={c as string} gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, (h as number) / 2, 0]}>
          <cylinderGeometry args={[0.14, 0.17, (h as number) + 0.01, 24]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
    ))}
  </group>
);

// Drumstick held in a hand (world space).
export const Stick: React.FC<{ position: Vec3; angle: number }> = ({ position, angle }) => (
  <group position={position} rotation={[0, 0, angle]} userData={{ ghost: true }}>
    <InkBox size={[0.02, 0.3, 0.02]} position={[0, 0.13, 0.02]} color="#e8c89a" ink={0.003} />
  </group>
);

// Washboard held up (world space, faces +z).
export const Washboard: React.FC<{ position: Vec3; tilt?: number }> = ({ position, tilt = 0 }) => (
  <group position={position} rotation={[0, 0, tilt]} userData={{ ghost: true }}>
    <InkBox size={[0.24, 0.38, 0.02]} position={[0, 0, 0]} color="#c99a6b" ink={0.004} />
    <InkBox size={[0.18, 0.24, 0.01]} position={[0, -0.03, 0.015]} color="#c9ced3" ink={0.002} />
    {Array.from({ length: 7 }, (_, i) => (
      <InkBox key={i} size={[0.18, 0.012, 0.012]} position={[0, -0.13 + i * 0.033, 0.022]} color="#8a9099" ink={0} />
    ))}
  </group>
);

// Floating music notes (ghost), drifting up from `position`; `f` drives them.
export const MusicNotes: React.FC<{ position: Vec3; f: number; count?: number; color?: string; spread?: number }> = ({ position, f, count = 5, color = "#13235e", spread = 0.5 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const t = ((f + i * 13) % 50) / 50;
      const x = (rnd(i) - 0.5) * spread + Math.sin(t * 6 + i) * 0.05;
      const y = t * 0.6;
      const s = Math.min(1, t * 5) * (1 - Math.max(0, (t - 0.8) / 0.2));
      return (
        <group key={i} position={[x, y, 0.02 * i]} scale={s}>
          <mesh position={[0, 0, 0]} scale={[1.25, 1, 1]}>
            <circleGeometry args={[0.03, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh position={[0.032, 0.07, 0]}>
            <planeGeometry args={[0.012, 0.14]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0.06, 0.12, 0]} rotation={[0, 0, -0.5]}>
              <planeGeometry args={[0.06, 0.02]} />
              <meshBasicMaterial color={color} />
            </mesh>
          )}
        </group>
      );
    })}
  </group>
);

// A phone held in a hand, its screen toward the camera (world space). `flying` spins it.
export const HeldPhone: React.FC<{ position: Vec3; rot?: Vec3; screen?: string; scale?: number }> = ({ position, rot = [0, 0, 0], screen = "#ff8fc8", scale = 1 }) => (
  <group position={position} rotation={rot} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.075, 0.14, 0.012]} position={[0, 0, 0]} color="#1d1a1a" ink={0.003} />
    <mesh position={[0, 0, 0.0075]}>
      <planeGeometry args={[0.064, 0.122]} />
      <meshBasicMaterial color={screen} toneMapped={false} />
    </mesh>
    <mesh position={[0.02, 0.04, 0.008]}>
      <circleGeometry args={[0.008, 12]} />
      <meshBasicMaterial color="#e0262f" toneMapped={false} />
    </mesh>
  </group>
);

// ---------- viral video (pink) ----------

// Giant phone standing upright (screen faces +z) playing the laundromat video; a view counter and hearts.
export const ViralPhone: React.FC<{ position: Vec3; views: number; f: number; scale?: number; hearts?: number }> = ({ position, views, f, scale = 1, hearts = 1 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 768, (ctx) => {
        // The laundromat clip: turquoise wall, washer portholes, three band members.
        ctx.fillStyle = "#7fe0d8";
        ctx.fillRect(0, 0, 512, 768);
        ctx.fillStyle = "#1fb5b0";
        ctx.fillRect(0, 300, 512, 40);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = "#e8eef0";
          ctx.fillRect(20 + i * 125, 360, 110, 160);
          ctx.fillStyle = "#2a3550";
          ctx.beginPath();
          ctx.arc(75 + i * 125, 450, 38, 0, Math.PI * 2);
          ctx.fill();
        }
        const fig = (x: number, hair: string, body: string) => {
          ctx.fillStyle = body;
          ctx.fillRect(x - 40, 520, 80, 150);
          ctx.fillStyle = hair;
          ctx.beginPath();
          ctx.arc(x, 470, 52, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f1c9a5";
          ctx.beginPath();
          ctx.arc(x, 480, 38, 0, Math.PI * 2);
          ctx.fill();
        };
        fig(110, "#1d1a1a", "#1fb5b0");
        fig(256, "#d8dce8", "#d9a12a");
        fig(400, "#c0392b", "#b5552a");
        ctx.fillStyle = "#e0262f";
        ctx.fillRect(220, 690, 30, 50);
        ctx.fillRect(262, 690, 30, 50);
        ctx.fillStyle = "#16121288";
        ctx.fillRect(0, 690, 512, 78);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 54px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("#SOCKSANDALS", 256, 750);
      }),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <InkBox size={[1.0, 1.9, 0.1]} position={[0, 0.95, 0]} color="#1d1a1a" />
      <mesh position={[0, 1.02, 0.052]}>
        <planeGeometry args={[0.9, 1.35]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <InkBox size={[0.22, 0.04, 0.02]} position={[0, 1.82, 0.06]} color="#3a3a44" ink={0} />
      <Label text={"1,000,000\nVIEWS"} count={views} position={[0, 1.45, 0.06]} width={0.8} fg="#ffffff" bg="#e0267f" />
      {/* Hearts floating up the right edge */}
      {hearts > 0 &&
        Array.from({ length: 6 }, (_, i) => {
          const t = ((f * 1.3 + i * 11) % 66) / 66;
          return (
            <group key={i} position={[0.36 + Math.sin(t * 8 + i) * 0.05, 0.55 + t * 1.1, 0.07 + i * 0.002]} scale={(0.5 + rnd(i) * 0.5) * Math.min(1, t * 6) * (1 - t * 0.5)}>
              <Heart />
            </group>
          );
        })}
    </group>
  );
};

// A flat cartoon heart (red, ink outline), facing +z.
export const Heart: React.FC<{ color?: string }> = ({ color = "#ff2f6e" }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.07);
    s.bezierCurveTo(-0.1, 0.0, -0.08, 0.08, 0, 0.04);
    s.bezierCurveTo(0.08, 0.08, 0.1, 0.0, 0, -0.07);
    return s;
  }, []);
  return (
    <group>
      <mesh scale={1.18} position={[0, 0.0, -0.001]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---------- lab in her head ----------

// Telescope: cast-iron pier, a mount head, a long tube aimed by `yaw`/`pitch`, a counterweight, finder and eyepiece.
// Tube points along local -x (away from the eyepiece end at +x).
export const Telescope: React.FC<{ position: Vec3; yaw?: number; pitch?: number; scale?: number }> = ({ position, yaw = 0, pitch = 0.45, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.2} height={0.08} position={[0, 0.04, 0]} color="#2a3550" ink={0.006} />
    <mesh position={[0, 0.55, 0]} castShadow>
      <cylinderGeometry args={[0.07, 0.13, 1.0, 24]} />
      <meshToonMaterial color="#3a5a8a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.078, 0.138, 1.01, 24]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <group position={[0, 1.1, 0]} rotation={[0, yaw, 0]}>
      <InkBox size={[0.16, 0.14, 0.16]} position={[0, 0, 0]} color="#2a3550" ink={0.005} />
      {/* counterweight bar down the back */}
      <InkCylinder radius={0.018} height={0.4} position={[0, -0.08, 0.2]} rotation={[Math.PI / 2 - 0.5, 0, 0]} color="#c9ced3" ink={0.003} />
      <InkCylinder radius={0.07} height={0.08} position={[0, -0.18, 0.34]} rotation={[Math.PI / 2 - 0.5, 0, 0]} color="#2a3550" ink={0.004} />
      <group position={[0, 0.12, 0]} rotation={[0, 0, -pitch]}>
        <InkCylinder radius={0.075} height={1.3} position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#f2f4ff" ink={0.007} />
        <InkCylinder radius={0.088} height={0.18} position={[-1.0, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#3a5a8a" ink={0.006} />
        {[-0.1, -0.6].map((x) => (
          <InkCylinder key={x} radius={0.08} height={0.03} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#d4a63a" ink={0.003} />
        ))}
        <InkCylinder radius={0.025} height={0.35} position={[-0.25, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} color="#3a5a8a" ink={0.003} />
        <InkCylinder radius={0.022} height={0.1} position={[0.33, 0.03, 0]} rotation={[0, 0, Math.PI / 2 + 0.5]} color="#2a3550" ink={0.003} />
      </group>
    </group>
  </group>
);

// The back wall of the dome: steel ribs and a slit open onto a starry sky. Faces +z.
export const DomeSlit: React.FC<{ position: Vec3; f?: number; width?: number }> = ({ position, f = 0, width = 1.0 }) => (
  <group position={position}>
    <InkBox size={[width + 0.16, 2.6, 0.05]} position={[0, 0, 0]} color="#8a9ab0" ink={0.006} />
    <InkBox size={[width, 2.5, 0.02]} position={[0, 0, 0.03]} color="#0a1430" ink={0} />
    {Array.from({ length: 22 }, (_, i) => (
      <mesh key={i} position={[(rnd(i + 40) - 0.5) * width * 0.9, (rnd(i + 41) - 0.5) * 2.3, 0.045]}>
        <circleGeometry args={[0.008 + rnd(i + 42) * 0.012 * (0.7 + 0.3 * Math.sin(f * 0.2 + i)), 8]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    ))}
    <mesh position={[width * 0.2, 0.7, 0.046]}>
      <circleGeometry args={[0.1, 24]} />
      <meshBasicMaterial color="#ffe6a8" toneMapped={false} />
    </mesh>
  </group>
);

// A steel strongbox with a big padlock and a FEELINGS label. `shake` rattles it. Faces +z.
export const StrongBox: React.FC<{ position: Vec3; shake?: number; scale?: number }> = ({ position, shake = 0, scale = 1 }) => (
  <group position={position} rotation={[0, 0, Math.sin(shake * 2.2) * 0.04 * Math.min(1, shake)]} scale={scale}>
    <InkBox size={[0.6, 0.42, 0.42]} position={[0, 0.21, 0]} color="#5b6b7a" />
    <InkBox size={[0.62, 0.08, 0.44]} position={[0, 0.44, 0]} color="#7a8a9a" ink={0.008} />
    {[-0.24, 0.24].map((x) => (
      <InkBox key={x} size={[0.05, 0.4, 0.02]} position={[x, 0.22, 0.215]} color="#3a4a5a" ink={0.003} />
    ))}
    <Label text="FEELINGS" position={[0, 0.3, 0.222]} width={0.4} fg="#ffffff" bg="#e0267f" />
    {/* Padlock */}
    <group position={[0, 0.1, 0.24]}>
      <mesh position={[0, 0.07, 0]}>
        <torusGeometry args={[0.045, 0.012, 10, 24, Math.PI]} />
        <meshToonMaterial color="#c9ced3" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.12, 0.1, 0.04]} position={[0, 0.02, 0]} color="#d4a63a" ink={0.004} />
      <mesh position={[0, 0.015, 0.022]}>
        <circleGeometry args={[0.012, 12]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  </group>
);

// A key hanging on a wall hook with a tag (LATER). `swing` in radians. Faces +z.
export const KeyOnHook: React.FC<{ position: Vec3; swing?: number; tag?: string }> = ({ position, swing = 0, tag = "LATER" }) => (
  <group position={position}>
    <InkBox size={[0.06, 0.06, 0.04]} position={[0, 0, 0.02]} color="#3a4a5a" ink={0.003} />
    <InkCylinder radius={0.008} height={0.06} position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]} color="#c9ced3" ink={0.002} />
    <group position={[0, -0.01, 0.08]} rotation={[0, 0, swing]}>
      <mesh position={[0, -0.05, 0]}>
        <torusGeometry args={[0.03, 0.008, 8, 20]} />
        <meshToonMaterial color="#d4a63a" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.016, 0.14, 0.01]} position={[0, -0.15, 0]} color="#d4a63a" ink={0.003} />
      <InkBox size={[0.04, 0.014, 0.01]} position={[0.02, -0.2, 0]} color="#d4a63a" ink={0.002} />
      <InkBox size={[0.03, 0.014, 0.01]} position={[0.016, -0.17, 0]} color="#d4a63a" ink={0.002} />
      <Label text={tag} position={[-0.05, -0.12, 0.012]} rotation={[0, 0, -0.15]} width={0.26} fg="#13235e" bg="#ffd23f" />
    </group>
  </group>
);

// A big knife switch on a steel panel: two copper blades on a handle, `flip` 0 up (ON) .. 1 down (OFF). The blades
// always swing on the camera side of the panel (rotation about x from 0.15 to PI - 0.15). Faces +z.
export const KnifeSwitch: React.FC<{ position: Vec3; flip?: number; label?: string; scale?: number }> = ({ position, flip = 0, label = "IF POPULAR,\nSTOP", scale = 1 }) => {
  const a = 0.15 + flip * (Math.PI - 0.3);
  return (
    <group position={position} scale={scale}>
      <InkBox size={[0.7, 1.3, 0.06]} position={[0, 0.05, 0]} color="#5b6b7a" />
      {[-1, 1].map((sx) => [-1, 1].map((sy) => <Ball key={`${sx}${sy}`} position={[sx * 0.3, sy * 0.52, 0.035]} radius={0.015} color="#c9ced3" />))}
      <Label text={label} position={[0, 0.52, 0.035]} width={0.6} fg="#ffffff" bg="#e0262f" />
      {/* Jaws top and bottom, the hinge block in the middle */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.09, 0, 0.06]}>
          <InkBox size={[0.04, 0.06, 0.06]} position={[0, 0.2, 0]} color="#3a2a20" ink={0.003} />
          <InkBox size={[0.04, 0.06, 0.06]} position={[0, -0.42, 0]} color="#3a2a20" ink={0.003} />
          <InkBox size={[0.04, 0.05, 0.06]} position={[0, -0.1, 0]} color="#3a2a20" ink={0.003} />
        </group>
      ))}
      <group position={[0, -0.1, 0.1]} rotation={[a, 0, 0]}>
        {[-1, 1].map((s) => (
          <InkBox key={s} size={[0.02, 0.3, 0.025]} position={[s * 0.09, 0.15, 0]} color="#d4783a" ink={0.003} />
        ))}
        <InkBox size={[0.22, 0.03, 0.03]} position={[0, 0.28, 0]} color="#2a1d14" ink={0.003} />
        <InkCylinder radius={0.03} height={0.14} position={[0, 0.36, 0]} color="#e0262f" ink={0.004} />
      </group>
    </group>
  );
};

// Electric sparks bursting from a point (ghost); `t` = frames since the flip.
export const Sparks: React.FC<{ position: Vec3; t: number; count?: number }> = ({ position, t, count = 18 }) => {
  if (t < 0 || t > 16) return null;
  return (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const a = rnd(i + 70) * Math.PI * 2;
        const v = 0.02 + rnd(i + 71) * 0.03;
        const p: Vec3 = [Math.cos(a) * v * t, Math.sin(a) * v * t - t * t * 0.0015, 0.06];
        return (
          <mesh key={i} position={p} rotation={[0, 0, a]}>
            <planeGeometry args={[0.05 * (1 - t / 16), 0.012]} />
            <meshBasicMaterial color={i % 2 ? "#ffd23f" : "#ffffff"} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// Flashing red alarm beacon on a wall (dome + glow).
export const Beacon: React.FC<{ position: Vec3; on: number }> = ({ position, on }) => (
  <group position={position}>
    <InkBox size={[0.16, 0.05, 0.1]} position={[0, -0.03, 0.05]} color="#2a2f3a" ink={0.003} />
    <Ball position={[0, 0.04, 0.05]} radius={0.07} color={on > 0.5 ? "#ff3b30" : "#8a2020"} glow={on > 0.5} />
    {on > 0.5 && <Halo position={[0, 0.04, 0.12]} size={1.4} color="#ff3b30" strength={0.6} />}
  </group>
);

// Lab bench with a couple of gauges and flasks.
export const LabBench: React.FC<{ position: Vec3; f?: number }> = ({ position, f = 0 }) => (
  <group position={position}>
    <InkBox size={[1.2, 0.06, 0.55]} position={[0, 0.85, 0]} color="#c9ced3" />
    <InkBox size={[1.15, 0.8, 0.5]} position={[0, 0.41, -0.01]} color="#3a5a8a" />
    {[-0.4, -0.2, 0.0].map((x, i) => (
      <group key={x} position={[x, 0.88, 0.05]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.025, 0.05, 0.14, 16]} />
          <meshBasicMaterial color={["#7fffd4", "#ff8fc8", "#ffd23f"][i]} transparent opacity={0.8} toneMapped={false} />
        </mesh>
        <Ball position={[0, 0.15 + ((f * 0.05 + i) % 1) * 0.08, 0]} radius={0.01} color="#ffffff" glow />
      </group>
    ))}
    {/* round gauge */}
    <group position={[0.35, 1.05, 0.0]}>
      <InkCylinder radius={0.12} height={0.04} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color="#fff6dc" ink={0.005} />
      <InkBox size={[0.01, 0.1, 0.01]} position={[0, 0.03, 0.03]} rotation={[0, 0, Math.sin(f * 0.1) * 0.6]} color="#e0262f" ink={0} />
      <InkBox size={[0.04, 0.12, 0.04]} position={[0, -0.14, 0]} color="#5b6b7a" ink={0.003} />
    </group>
  </group>
);

// ---------- apiary ----------

// A box hive: stand, stacked boxes, a telescoping lid and an entrance slot. Faces +z.
export const BoxHive: React.FC<{ position: Vec3; color?: string; boxes?: number; scale?: number; rotationY?: number }> = ({ position, color = "#fff6dc", boxes = 2, scale = 1, rotationY = 0 }) => (
  <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.05, 0.22, 0.05]} position={[sx * 0.2, 0.11, sz * 0.18]} color="#8a5a3a" ink={0.003} />))}
    <InkBox size={[0.54, 0.04, 0.5]} position={[0, 0.24, 0]} color="#a8784a" ink={0.004} />
    {Array.from({ length: boxes }, (_, i) => (
      <group key={i} position={[0, 0.26 + i * 0.25, 0]}>
        <InkBox size={[0.48, 0.24, 0.44]} position={[0, 0.12, 0]} color={color} ink={0.005} />
        <InkBox size={[0.12, 0.02, 0.02]} position={[0, 0.17, 0.225]} color="#8a5a3a" ink={0.002} />
      </group>
    ))}
    <InkBox size={[0.56, 0.07, 0.52]} position={[0, 0.3 + boxes * 0.25, 0]} color="#c9ced3" ink={0.005} />
    <InkBox size={[0.24, 0.025, 0.02]} position={[0, 0.29, 0.222]} color={INK} ink={0} />
  </group>
);

// Bees (ghost): small striped dots buzzing in loops round `center`.
export const Bees: React.FC<{ center: Vec3; f: number; count?: number; radius?: number; seed?: number }> = ({ center, f, count = 8, radius = 0.35, seed = 0 }) => (
  <group position={center} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const sp = 0.08 + rnd(i + seed) * 0.08;
      const a = f * sp + rnd(i + seed + 1) * 6.28;
      const r = radius * (0.5 + rnd(i + seed + 2) * 0.5);
      const p: Vec3 = [Math.cos(a) * r, Math.sin(a * 1.7) * r * 0.4 + rnd(i + seed + 3) * 0.2, Math.sin(a) * r * 0.5];
      return (
        <group key={i} position={p} rotation={[0, 0, Math.cos(a) * 0.5]}>
          <mesh scale={[1.4, 1, 1]}>
            <circleGeometry args={[0.022, 12]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <mesh scale={[1.3, 0.85, 1]} position={[0, 0, 0.001]}>
            <circleGeometry args={[0.019, 12]} />
            <meshBasicMaterial color="#ffd23f" toneMapped={false} />
          </mesh>
          <mesh position={[0.004, 0, 0.002]}>
            <planeGeometry args={[0.008, 0.032]} />
            <meshBasicMaterial color={INK} />
          </mesh>
          <mesh position={[-0.006, 0.02, 0.003]} rotation={[0, 0, Math.sin(f * 2.5 + i) * 0.6]}>
            <circleGeometry args={[0.013, 10]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.75} toneMapped={false} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// Beekeeper hat with a veil, worn on a front-facing puppet's head (world: x, z of the puppet, y of the head top).
export const BeeHat: React.FC<{ at: [number, number]; y: number; dx?: number; tilt?: number }> = ({ at, y, dx = 0, tilt = 0 }) => (
  <group position={[at[0] + dx, y, at[1] + 0.03]} rotation={[0.12, 0, tilt]} userData={{ ghost: true }}>
    <InkCylinder radius={0.26} height={0.02} position={[0, 0, 0]} color="#fff6dc" ink={0.006} />
    <mesh position={[0, 0.07, 0]}>
      <sphereGeometry args={[0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color="#fff6dc" gradientMap={toonRamp} />
    </mesh>
    {/* the veil drops from the brim at the sides and back only, so the face stays clear */}
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.25, -0.13, -0.04]} rotation={[0, s * 0.3, 0]}>
        <planeGeometry args={[0.04, 0.26]} />
        <meshBasicMaterial color="#2a2a2a" transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    ))}
  </group>
);

// A songbook held open in front of the chest (world space, faces +z).
export const Songbook: React.FC<{ position: Vec3; tilt?: number }> = ({ position, tilt = 0 }) => (
  <group position={position} rotation={[-0.25, 0, tilt]} userData={{ ghost: true }}>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.07, 0, 0]} rotation={[0, -s * 0.25, 0]}>
        <InkBox size={[0.14, 0.18, 0.01]} position={[0, 0, 0]} color="#7a1e2a" ink={0.003} />
        <InkBox size={[0.12, 0.16, 0.004]} position={[0, 0, 0.007]} color="#fff6dc" ink={0} />
        {[0.04, 0.0, -0.04].map((y) => (
          <InkBox key={y} size={[0.1, 0.006, 0.002]} position={[0, y, 0.0095]} color="#3a2a20" ink={0} />
        ))}
      </group>
    ))}
  </group>
);

// A meadow: grass tufts and small flowers scattered over an area (no collision: ghost).
export const Meadow: React.FC<{ x: number; z: number; w: number; d: number; count?: number; seed?: number }> = ({ x, z, w, d, count = 60, seed = 0 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const px = x + (rnd(i + seed) - 0.5) * w;
      const pz = z + (rnd(i + seed + 1) - 0.5) * d;
      const flower = rnd(i + seed + 2) > 0.65;
      return (
        <group key={i} position={[px, 0, pz]}>
          {[-1, 0, 1].map((k) => (
            <mesh key={k} position={[k * 0.025, 0.06, 0]} rotation={[0, 0, k * 0.35]}>
              <planeGeometry args={[0.02, 0.12 + rnd(i + k) * 0.05]} />
              <meshBasicMaterial color={k === 0 ? "#5a9a3a" : "#7fb348"} side={THREE.DoubleSide} />
            </mesh>
          ))}
          {flower && (
            <mesh position={[0, 0.14, 0.003]}>
              <circleGeometry args={[0.025, 10]} />
              <meshBasicMaterial color={["#ffffff", "#ffd23f", "#ff8fc8", "#9b5de5"][i % 4]} toneMapped={false} />
            </mesh>
          )}
        </group>
      );
    })}
  </group>
);

// Wooden shed with a door and a small window.
export const Shed: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#8a5a3a" }) => (
  <group position={position}>
    <InkBox size={[1.6, 1.5, 1.2]} position={[0, 0.75, 0]} color={color} />
    <group position={[0, 1.5, 0]}>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.95, 0.06, 1.35]} position={[s * 0.42, 0.25, 0]} rotation={[0, 0, -s * 0.55]} color="#5a3a2a" ink={0.006} />
      ))}
    </group>
    <InkBox size={[0.5, 1.0, 0.03]} position={[-0.3, 0.5, 0.61]} color="#6b4a2e" ink={0.004} />
    <InkBox size={[0.36, 0.3, 0.03]} position={[0.4, 0.95, 0.61]} color="#ffe6a8" ink={0.004} />
    {Array.from({ length: 6 }, (_, i) => (
      <InkBox key={i} size={[0.012, 1.4, 0.01]} position={[-0.75 + i * 0.3, 0.72, 0.605]} color="#6b4a2e" ink={0} />
    ))}
  </group>
);

// Post-and-rail fence along x.
export const Fence: React.FC<{ position: Vec3; length: number; color?: string }> = ({ position, length, color = "#c99a6b" }) => {
  const posts = Math.round(length / 0.8) + 1;
  return (
    <group position={position}>
      {Array.from({ length: posts }, (_, i) => (
        <InkBox key={i} size={[0.06, 0.8, 0.06]} position={[-length / 2 + i * (length / (posts - 1)), 0.4, 0]} color={color} ink={0.004} />
      ))}
      {[0.35, 0.65].map((y) => (
        <InkBox key={y} size={[length, 0.05, 0.03]} position={[0, y, 0.045]} color={color} ink={0.004} />
      ))}
    </group>
  );
};

// A sky backdrop plane with a vertical gradient.
export const SkyPlane: React.FC<{ stops: string[]; position: Vec3; size: [number, number] }> = ({ stops, position, size }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 1024);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stops.join("|")],
  );
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} fog={false} toneMapped={false} />
    </mesh>
  );
};
