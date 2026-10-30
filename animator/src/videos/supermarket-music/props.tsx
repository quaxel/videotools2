import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Why Supermarkets Play Slow Music".

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";
const PRODUCT_COLORS = ["#e0262f", "#ffd23f", "#1d4fa8", "#3fae5a", "#ff9f1c", "#9b5de5", "#f28482", "#2a9d8f"];

// Two rows of shelving running along z (an aisle), stocked with coloured boxes. Aisle centre at x = 0.
export const AisleShelves: React.FC<{ z0: number; length: number; halfWidth?: number; color?: string }> = ({ z0, length, halfWidth = 0.9, color = "#d8e0ea" }) => {
  const units = Math.round(length / 1.2);
  return (
    <group>
      {[-1, 1].map((side) =>
        Array.from({ length: units }, (_, u) => {
          const z = z0 - u * 1.2 - 0.6;
          return (
            <group key={`${side}${u}`} position={[side * (halfWidth + 0.2), 0, z]}>
              <InkBox size={[0.4, 1.9, 1.18]} position={[side * 0.12, 0.95, 0]} color={color} ink={0.01} />
              {[0.15, 0.6, 1.05, 1.5].map((y, r) => (
                <group key={y}>
                  <InkBox size={[0.42, 0.04, 1.18]} position={[0, y, 0]} color="#9aa0a6" ink={0.006} shadows={false} />
                  {Array.from({ length: 5 }, (_, k) => {
                    const c = PRODUCT_COLORS[(u * 7 + r * 3 + k + (side > 0 ? 2 : 0)) % PRODUCT_COLORS.length];
                    const h = 0.22 + ((k + r) % 3) * 0.05;
                    return <InkBox key={k} size={[0.16, h, 0.18]} position={[-side * 0.05, y + 0.02 + h / 2, -0.44 + k * 0.22]} color={c} ink={0.006} shadows={false} />;
                  })}
                </group>
              ))}
            </group>
          );
        }),
      )}
    </group>
  );
};

// Ceiling speaker hanging on a wire, with music notes drifting out (`f` animates them).
export const CeilingSpeaker: React.FC<{ position: Vec3; f: number; tempo?: number; color?: string }> = ({ position, f, tempo = 0.5, color = "#ffffff" }) => {
  const noteTex = useMemo(
    () =>
      canvasTexture(128, 128, (ctx) => {
        ctx.fillStyle = color;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(44, 96, 26, 18, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(62, 18, 12, 80);
        ctx.strokeRect(62, 18, 12, 80);
        ctx.fillRect(62, 18, 46, 14);
        ctx.strokeRect(62, 18, 46, 14);
      }),
    [color],
  );
  return (
    <group position={position}>
      <InkCylinder radius={0.008} height={0.6} position={[0, 0.35, 0]} color="#2c3a40" ink={0} />
      <InkCylinder radius={0.18} height={0.1} position={[0, 0, 0]} color="#f2f2f2" />
      <mesh position={[0, -0.051, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 32]} />
        <meshBasicMaterial color="#2c3a40" />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => {
        const age = ((f * (0.006 + tempo * 0.02) + i / 4) % 1);
        return (
          <mesh key={i} position={[Math.sin(i * 2.3 + age * 4) * 0.25, -0.1 - age * 0.6, 0.1 + i * 0.03]} rotation={[0, 0, Math.sin(age * 6) * 0.3]}>
            <planeGeometry args={[0.14, 0.14]} />
            <meshBasicMaterial map={noteTex} transparent opacity={1 - age} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// Shopping cart facing +x. `fill` 0..1 heaps boxes in the basket; `tip` 0..1 rolls it onto its side.
export const Cart: React.FC<{ position: Vec3; fill?: number; tip?: number; rotationY?: number }> = ({ position, fill = 0, tip = 0, rotationY = 0 }) => {
  const n = Math.round(fill * 12);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group rotation={[tip * 1.3, 0, 0]} position={[0, 0, 0]}>
        {/* basket frame */}
        <InkBox size={[0.7, 0.04, 0.45]} position={[0, 0.5, 0]} color="#c9ced3" ink={0.005} />
        {[-0.225, 0.225].map((z) => (
          <InkBox key={z} size={[0.7, 0.36, 0.02]} position={[0, 0.68, z]} color="#c9ced3" ink={0.005} />
        ))}
        <InkBox size={[0.02, 0.36, 0.45]} position={[0.35, 0.68, 0]} color="#c9ced3" ink={0.005} />
        <InkBox size={[0.02, 0.36, 0.45]} position={[-0.35, 0.68, 0]} color="#c9ced3" ink={0.005} />
        <InkBox size={[0.04, 0.04, 0.5]} position={[-0.42, 0.9, 0]} color="#e0262f" ink={0.005} />
        {[-0.3, 0.3].map((x) =>
          [-0.18, 0.18].map((z) => (
            <group key={`${x}${z}`}>
              <InkBox size={[0.02, 0.45, 0.02]} position={[x, 0.27, z]} color="#9aa0a6" ink={0.004} />
              <InkCylinder radius={0.05} height={0.03} position={[x, 0.05, z]} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" ink={0.004} />
            </group>
          )),
        )}
        {Array.from({ length: n }, (_, i) => {
          const c = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
          const h = 0.18 + (i % 3) * 0.06;
          return <InkBox key={i} size={[0.14, h, 0.12]} position={[-0.24 + (i % 4) * 0.16, 0.55 + Math.floor(i / 4) * 0.13 + h / 2, -0.12 + ((i * 5) % 3) * 0.12]} rotation={[0, (i % 3) * 0.3, (i % 2) * 0.15]} color={c} ink={0.005} />;
        })}
      </group>
    </group>
  );
};

// Cereal boxes tumbling off a shelf onto the floor along +z, by t 0..1.
export const BoxAvalanche: React.FC<{ origin: Vec3; t: number; count?: number }> = ({ origin, t, count = 10 }) => (
  <group>
    {Array.from({ length: count }, (_, i) => {
      const age = Math.max(0, Math.min(1, t * 1.6 - i * 0.06));
      if (age <= 0) return null;
      const y = Math.max(0.12, origin[1] + 0.2 * age - origin[1] * age * age * 1.4);
      return (
        <InkBox
          key={i}
          size={[0.18, 0.26, 0.08]}
          position={[origin[0] - age * (0.3 + (i % 3) * 0.12), y, origin[2] + (i - count / 2) * 0.12 + age * 0.3]}
          rotation={[age * (i % 2 ? 2 : -2), i, age * 3]}
          color={PRODUCT_COLORS[i % PRODUCT_COLORS.length]}
          ink={0.006}
        />
      );
    })}
  </group>
);

export const MilkCarton: React.FC<{ position: Vec3; scale?: number }> = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.16, 0.26, 0.16]} position={[0, 0.13, 0]} color="#ffffff" />
    <mesh position={[0, 0.3, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.115, 0.08, 4]} />
      <meshToonMaterial color="#ffffff" gradientMap={toonRamp} />
    </mesh>
    <Label text="MILK" position={[0, 0.14, 0.082]} width={0.14} fg="#ffffff" bg="#1d4fa8" border={false} />
  </group>
);

// Big rotary dial on a wall panel. `value` 0 = FAST (right), 1 = SLOW (left).
export const TempoDial: React.FC<{ position: Vec3; value: number; scale?: number }> = ({ position, value, scale = 1 }) => {
  const angle = interpolateAngle(value);
  return (
    <group position={position} scale={scale}>
      <InkBox size={[0.9, 0.9, 0.06]} position={[0, 0, -0.03]} color="#1d1a2a" />
      <Label text="TEMPO" position={[0, 0.34, 0.005]} width={0.5} fg="#1d1a2a" bg="#5ad1ff" />
      <Label text="SLOW" position={[-0.28, -0.32, 0.005]} width={0.26} fg="#ffffff" bg="#1d4fa8" />
      <Label text="FAST" position={[0.28, -0.32, 0.005]} width={0.26} fg="#ffffff" bg="#e0262f" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = interpolateAngle(i / 8);
        return <InkBox key={i} size={[0.015, 0.05, 0.01]} position={[Math.sin(a) * 0.3, Math.cos(a) * 0.3 - 0.02, 0.01]} rotation={[0, 0, -a]} color="#ffffff" ink={0} shadows={false} />;
      })}
      <group position={[0, -0.02, 0.03]} rotation={[0, 0, -angle]}>
        <InkCylinder radius={0.2} height={0.08} rotation={[Math.PI / 2, 0, 0]} color="#c9ced3" />
        <InkBox size={[0.04, 0.17, 0.02]} position={[0, 0.1, 0.05]} color="#e0262f" ink={0.004} />
      </group>
    </group>
  );
};
// value 1 (slow) points up-left, value 0 (fast) points up-right.
const interpolateAngle = (v: number) => (0.5 - v) * 2.4;

// Metronome with a swinging arm; `bpm` sets the label and swing speed.
export const Metronome: React.FC<{ position: Vec3; bpm: number; f: number; scale?: number; color?: string }> = ({ position, bpm, f, scale = 1, color = "#8a4f24" }) => {
  const swing = Math.sin((f / 30) * Math.PI * (bpm / 60)) * 0.5;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.2, 0.5, 4]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <group position={[0, 0.08, 0.12]} rotation={[0, 0, swing]}>
        <InkBox size={[0.015, 0.5, 0.01]} position={[0, 0.25, 0]} color="#c9ced3" ink={0.003} />
        <InkBox size={[0.06, 0.05, 0.02]} position={[0, 0.38, 0]} color="#ffd23f" ink={0.004} />
      </group>
      <Label text={`${bpm} BPM`} position={[0, 0.1, 0.17]} width={0.3} fg="#ffffff" bg={bpm < 80 ? "#1d4fa8" : "#e0262f"} />
    </group>
  );
};

const bottleLabel = (flag: "FR" | "DE") =>
  canvasTexture(128, 128, (ctx) => {
    const cols = flag === "FR" ? ["#1d4fa8", "#ffffff", "#e0262f"] : ["#1d1a1a", "#e0262f", "#ffcc00"];
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      if (flag === "FR") ctx.fillRect(i * 43, 0, 43, 128);
      else ctx.fillRect(0, i * 43, 128, 43);
    });
  });

// A wine bottle standing up, labelled with a French or German flag.
export const Bottle: React.FC<{ position: Vec3; flag: "FR" | "DE"; glow?: boolean }> = ({ position, flag, glow }) => {
  const tex = useMemo(() => bottleLabel(flag), [flag]);
  return (
    <group position={position}>
      <InkCylinder radius={0.045} height={0.22} position={[0, 0.11, 0]} color={flag === "FR" ? "#2f5a2a" : "#6b4a1a"} ink={0.005} />
      <InkCylinder radius={0.016} height={0.1} position={[0, 0.27, 0]} color={flag === "FR" ? "#2f5a2a" : "#6b4a1a"} ink={0.004} />
      <mesh position={[0, 0.11, 0.047]}>
        <planeGeometry args={[0.07, 0.08]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {glow && <Halo position={[0, 0.15, 0.06]} size={0.35} color="#fff4c2" strength={0.5} />}
    </group>
  );
};

// Shelf of wine: French on the left half, German on the right. `taken` hides bottles bought.
export const WineShelf: React.FC<{ position: Vec3; width?: number; highlight?: "FR" | "DE"; color?: string }> = ({ position, width = 1.6, highlight, color = "#5a3d7a" }) => (
  <group position={position}>
    <InkBox size={[width, 1.7, 0.36]} position={[0, 0.85, -0.12]} color={color} />
    {[0.25, 0.75, 1.25].map((y) => (
      <group key={y}>
        <InkBox size={[width, 0.03, 0.4]} position={[0, y, 0.02]} color="#c99a6b" ink={0.005} shadows={false} />
        {Array.from({ length: 8 }, (_, k) => {
          const flag = k < 4 ? "FR" : "DE";
          return <Bottle key={k} position={[-width / 2 + 0.12 + k * ((width - 0.24) / 7), y + 0.02, 0.08]} flag={flag} glow={highlight === flag} />;
        })}
      </group>
    ))}
  </group>
);

// Boombox with a flag front panel and notes; plays only when `on`.
export const FlagSpeaker: React.FC<{ position: Vec3; flag: "FR" | "DE"; on: boolean; f: number; label: string }> = ({ position, flag, on, f, label }) => {
  const tex = useMemo(() => bottleLabel(flag), [flag]);
  const pulse = on ? 1 + Math.abs(Math.sin(f / (flag === "FR" ? 5 : 3))) * 0.08 : 1;
  return (
    <group position={position}>
      <InkBox size={[0.7, 0.42, 0.25]} position={[0, 0.21, 0]} color="#2c3a40" />
      <mesh position={[0, 0.21, 0.13]}>
        <planeGeometry args={[0.6, 0.32]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={on ? "#ffffff" : "#555555"} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.21, 0.135]} scale={pulse}>
          <circleGeometry args={[0.09, 24]} />
          <meshBasicMaterial color="#1d1a1a" transparent opacity={0.85} />
        </mesh>
      ))}
      <Label text={label} position={[0, 0.56, 0]} width={0.62} fg="#ffffff" bg={on ? "#ff4fd8" : "#5a4a6a"} />
      {on && <Halo position={[0, 0.25, 0.2]} size={1.1} color="#ff9fe0" strength={0.35} />}
    </group>
  );
};

// Checkout: a counter with a moving belt; `t` slides the products toward the register.
export const CheckoutBelt: React.FC<{ position: Vec3; t: number; items?: number }> = ({ position, t, items = 14 }) => (
  <group position={position}>
    <InkBox size={[2.4, 0.6, 0.6]} position={[0, 0.3, 0]} color="#d62828" />
    <InkBox size={[2.3, 0.03, 0.46]} position={[0, 0.615, 0]} color="#1d1a1a" ink={0.004} />
    {Array.from({ length: 10 }, (_, i) => (
      <InkBox key={`s${i}`} size={[0.02, 0.005, 0.44]} position={[-1.1 + ((i * 0.23 + t * 1.5) % 2.3), 0.633, 0]} color="#3a3a3a" ink={0} shadows={false} />
    ))}
    {Array.from({ length: items }, (_, i) => {
      const x = -1.05 + i * 0.15 + t * 0.6;
      if (x > 1.05) return null;
      const c = PRODUCT_COLORS[(i * 3) % PRODUCT_COLORS.length];
      const h = 0.12 + (i % 3) * 0.05;
      return <InkBox key={i} size={[0.12, h, 0.12]} position={[x, 0.63 + h / 2, ((i * 7) % 3) * 0.1 - 0.1]} rotation={[0, i * 0.4, 0]} color={c} ink={0.005} />;
    })}
    <InkBox size={[0.4, 0.3, 0.35]} position={[1.0, 0.78, -0.05]} color="#2c3a40" />
    <mesh position={[1.0, 0.85, 0.13]}>
      <planeGeometry args={[0.3, 0.12]} />
      <meshBasicMaterial color="#39ff7a" toneMapped={false} />
    </mesh>
  </group>
);

// Clipboard survey card standing on an easel.
export const Clipboard: React.FC<{ position: Vec3; text: string; rotation?: Vec3; width?: number }> = ({ position, text, rotation = [0, 0, 0], width = 0.5 }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[width + 0.08, width * 1.25, 0.03]} position={[0, 0, -0.02]} color="#a0662e" />
    <InkBox size={[width * 0.4, 0.06, 0.03]} position={[0, width * 0.6, 0]} color="#c9ced3" ink={0.004} />
    <Label text={text} position={[0, 0.02, 0.001]} width={width} fg={INK} bg="#fffdf4" />
  </group>
);

// Produce stand: angled crates of fruit.
export const ProduceStand: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 2.2 }) => {
  const fruit = ["#e0262f", "#ff9f1c", "#ffd23f", "#3fae5a", "#9b5de5"];
  return (
    <group position={position}>
      <InkBox size={[width, 0.7, 0.8]} position={[0, 0.35, 0]} color="#8a5a3a" />
      {fruit.map((c, k) => {
        const x = -width / 2 + (k + 0.5) * (width / fruit.length);
        return (
          <group key={c} position={[x, 0.72, 0]} rotation={[0.35, 0, 0]}>
            <InkBox size={[width / fruit.length - 0.04, 0.08, 0.7]} position={[0, 0, 0]} color="#c99a6b" ink={0.005} shadows={false} />
            {Array.from({ length: 6 }, (_, i) => (
              <mesh key={i} position={[((i % 3) - 1) * 0.12, 0.08, ((Math.floor(i / 3) - 0.5) * 0.24)]}>
                <sphereGeometry args={[0.065, 12, 10]} />
                <meshToonMaterial color={c} gradientMap={toonRamp} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

// Glass sliding doors; `open` 0..1 slides the panels apart.
export const SlidingDoors: React.FC<{ position: Vec3; open: number }> = ({ position, open }) => (
  <group position={position}>
    <InkBox size={[2.4, 0.2, 0.15]} position={[0, 2.3, 0]} color="#2c3a40" />
    {[-1, 1].map((s) => (
      <group key={s} position={[s * (0.5 + open * 0.9), 1.1, 0.04]}>
        <mesh>
          <boxGeometry args={[0.98, 2.2, 0.04]} />
          <meshBasicMaterial color="#bfe6ff" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <InkBox size={[0.98, 0.06, 0.05]} position={[0, -1.07, 0]} color="#c9ced3" ink={0.004} />
        <InkBox size={[0.04, 2.2, 0.05]} position={[s * -0.47, 0, 0]} color="#c9ced3" ink={0.004} />
      </group>
    ))}
  </group>
);
