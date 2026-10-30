import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, Screen, toonRamp, Vec3 } from "../../engine";

// Props for "Why Printer Ink Costs More Than Champagne".

const INK = "#161212";
const FACE: Vec3 = [Math.PI / 2, 0, 0];

// A sheet of paper; `cat` draws the cat poster on it.
const Sheet: React.FC<{ position: Vec3; rotation?: Vec3; size?: [number, number]; cat?: boolean }> = ({ position, rotation = [0, 0, 0], size = [0.21, 0.3], cat = false }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 360, (ctx) => {
        ctx.fillStyle = "#fffdf4";
        ctx.fillRect(0, 0, 256, 360);
        if (!cat) {
          ctx.fillStyle = "#9aa0a6";
          for (let y = 40; y < 330; y += 34) ctx.fillRect(28, y, 200 - (y % 3) * 30, 12);
          return;
        }
        ctx.fillStyle = "#ff9f1c";
        ctx.beginPath();
        ctx.arc(128, 190, 92, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(48, 140);
        ctx.lineTo(70, 50);
        ctx.lineTo(110, 110);
        ctx.moveTo(208, 140);
        ctx.lineTo(186, 50);
        ctx.lineTo(146, 110);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(95, 180, 14, 0, Math.PI * 2);
        ctx.arc(161, 180, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(122, 214, 12, 10);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.strokeRect(4, 4, 248, 352);
      }),
    [cat],
  );
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshToonMaterial map={tex} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

// A home inkjet printer sitting at `position` (bottom centre), facing +z.
// `out` 0..1 slides a sheet out of the front; `poster` flies the cat poster out (frames since launch);
// `blink` shows the red LOW INK light (frame count drives the blink); `spray` 0..1 sprays ink from the head.
export const Printer: React.FC<{ position: Vec3; f: number; out?: number; poster?: number; posterStop?: number; blink?: boolean; sticker?: boolean; spray?: number; scale?: number; lid?: number }> = ({
  position,
  f,
  out = 0,
  poster,
  posterStop = 9,
  blink = false,
  sticker = false,
  spray = 0,
  scale = 1,
  lid = 0,
}) => {
  const on = blink && Math.floor(f / 6) % 2 === 0;
  return (
    <group position={position} scale={scale}>
      <InkBox size={[0.62, 0.22, 0.42]} position={[0, 0.11, 0]} color="#e8ecf0" />
      <group position={[0, 0.22, -0.21]} rotation={[-lid * 1.2, 0, 0]}>
        <InkBox size={[0.6, 0.04, 0.42]} position={[0, 0.02, 0.21]} color="#2c3a40" />
      </group>
      <InkBox size={[0.46, 0.03, 0.06]} position={[0, 0.07, 0.22]} color="#2c3a40" ink={0.004} />
      <InkBox size={[0.4, 0.24, 0.02]} position={[0, 0.34, -0.2]} rotation={[-0.35, 0, 0]} color="#c9ced3" ink={0.004} />
      {out > 0 && <Sheet position={[0, 0.075, 0.22 + out * 0.18]} rotation={[-Math.PI / 2, 0, 0]} />}
      {poster !== undefined && poster >= 0 && (
        // flies out and sticks flat at `posterStop` (local z), e.g. on a face
        <Sheet
          cat
          size={[0.36, 0.5]}
          position={[0, 0.12 + Math.min(poster, 5) * 0.025, Math.min(0.25 + poster * 0.16, posterStop)]}
          rotation={0.25 + poster * 0.16 >= posterStop ? [0, 0, 0.12] : [Math.max(0, 1.2 - poster * 0.2), 0, Math.sin(poster * 0.6) * 0.2]}
        />
      )}
      {/* status light */}
      <InkCylinder radius={0.022} height={0.02} position={[0.24, 0.16, 0.215]} rotation={FACE} color={on ? "#ff3b30" : "#5a1a1a"} emissive={on ? "#ff3b30" : undefined} ink={0.002} />
      {on && <Halo position={[0.24, 0.16, 0.24]} size={0.22} color="#ff3b30" strength={0.8} />}
      {blink && <Label text="LOW INK" position={[0.0, 0.5, 0.05]} width={0.4} bg="#e0262f" fg="#ffffff" appear={on ? 20 : 20} />}
      {sticker && <Label text="STARTER INK" position={[-0.14, 0.15, 0.215]} width={0.26} bg="#ffd23f" />}
      {spray > 0 &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI - Math.PI / 2;
          const r = spray * (0.25 + (i % 4) * 0.08);
          return <InkCylinder key={i} radius={0.018} height={0.02} position={[Math.sin(a) * r, 0.24 + Math.cos(a) * r * 0.8, 0.22 + r * 0.6]} rotation={FACE} color={["#1d4fa8", "#e0267a", "#ffd23f"][i % 3]} ink={0} />;
        })}
    </group>
  );
};

// A boxed printer with a price tag and the STARTER INK sticker (the seed).
export const PrinterBox: React.FC<{ position: Vec3; tag?: string }> = ({ position, tag = "$49" }) => (
  <group position={position}>
    <InkBox size={[0.7, 0.5, 0.5]} position={[0, 0.25, 0]} color="#4f9dde" />
    <Label text="PRINTER" position={[0, 0.36, 0.252]} width={0.5} bg="#ffffff" fg="#1d4fa8" />
    <Label text="STARTER INK" position={[0.12, 0.16, 0.252]} width={0.32} bg="#ffd23f" />
    <Label text={tag} position={[-0.22, 0.14, 0.26]} rotation={[0, 0, 0.15]} width={0.22} bg="#e0262f" fg="#ffffff" />
  </group>
);

// An ink cartridge, standing; `chip` 0..1 lights the gold chip and shows its label.
export const Cartridge: React.FC<{ position: Vec3; color?: string; scale?: number; chip?: number; rotation?: Vec3; tag?: string }> = ({ position, color = "#1d4fa8", scale = 1, chip = 0, rotation = [0, 0, 0], tag }) => (
  <group position={position} scale={scale} rotation={rotation}>
    <InkBox size={[0.12, 0.16, 0.1]} position={[0, 0.08, 0]} color="#2c3a40" />
    <InkBox size={[0.122, 0.05, 0.102]} position={[0, 0.12, 0]} color={color} ink={0.003} />
    <InkBox size={[0.05, 0.04, 0.006]} position={[0, 0.05, 0.052]} color="#e8b04a" emissive={chip > 0.5 ? "#c88a10" : undefined} ink={0.002} />
    {chip > 0.5 && <Halo position={[0, 0.05, 0.06]} size={0.12} color="#ffd23f" strength={0.7} />}
    {tag && <Label text={tag} position={[0, -0.03, 0.06]} width={0.12} bg="#ffffff" />}
  </group>
);

// A store shelf of cartridges with price tags.
export const CartridgeShelf: React.FC<{ position: Vec3; width?: number; taken?: number }> = ({ position, width = 1.8, taken = 0 }) => {
  const cols = Math.round(width / 0.26);
  return (
    <group position={position}>
      <InkBox size={[width + 0.1, 1.9, 0.4]} position={[0, 0.95, -0.12]} color="#264653" ink={0.01} />
      {[0.25, 0.75, 1.25].map((y, r) => (
        <group key={y}>
          <InkBox size={[width, 0.03, 0.42]} position={[0, y, 0]} color="#9aa0a6" ink={0.004} shadows={false} />
          <InkBox size={[width, 0.06, 0.01]} position={[0, y - 0.02, 0.21]} color="#ffd23f" ink={0} shadows={false} />
          {Array.from({ length: cols }, (_, k) =>
            r === 1 && k >= cols / 2 - 1 && k < cols / 2 - 1 + taken ? null : (
              <Cartridge key={k} position={[-width / 2 + 0.13 + k * 0.26, y + 0.015, 0]} scale={1.6} color={["#1d4fa8", "#e0267a", "#ffd23f", "#9b5de5"][(k + r) % 4]} />
            ),
          )}
        </group>
      ))}
      <Label text="INK $34" position={[0, 0.69, 0.22]} width={0.36} bg="#ffffff" fg="#e0262f" />
    </group>
  );
};

// A champagne bottle with a foil neck.
export const Champagne: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.07} height={0.26} position={[0, 0.13, 0]} color="#1f5c3a" />
    <InkCylinder radius={0.03} height={0.12} position={[0, 0.31, 0]} color="#1f5c3a" />
    <InkCylinder radius={0.034} height={0.06} position={[0, 0.36, 0]} color="#e8b04a" />
    <InkBox size={[0.1, 0.07, 0.01]} position={[0, 0.13, 0.07]} color="#fffdf4" ink={0.002} />
  </group>
);

// A champagne flute; `fill` 0..1 of `liquid`.
export const Flute: React.FC<{ position: Vec3; fill: number; liquid: string }> = ({ position, fill, liquid }) => (
  <group position={position}>
    <InkCylinder radius={0.035} height={0.008} position={[0, 0.004, 0]} color="#dfe9f2" ink={0.002} />
    <InkCylinder radius={0.005} height={0.09} position={[0, 0.05, 0]} color="#dfe9f2" ink={0.001} />
    <mesh position={[0, 0.17, 0]}>
      <cylinderGeometry args={[0.032, 0.022, 0.16, 20, 1, true]} />
      <meshBasicMaterial color="#dfe9f2" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {fill > 0 && (
      <mesh position={[0, 0.09 + 0.08 * fill, 0]}>
        <cylinderGeometry args={[0.022 + 0.01 * fill, 0.022, 0.16 * fill, 20]} />
        <meshToonMaterial color={liquid} gradientMap={toonRamp} />
      </mesh>
    )}
  </group>
);

// Two clear tanks: ink that reached the paper and ink burned on cleaning; `level` 0..1 fills them to their shares.
export const InkTanks: React.FC<{ position: Vec3; level: number }> = ({ position, level }) => (
  <group position={position}>
    {[
      { x: -0.32, share: 0.25, color: "#1d4fa8", label: "ON PAPER" },
      { x: 0.32, share: 0.75, color: "#e0267a", label: "CLEANING" },
    ].map((t) => (
      <group key={t.label} position={[t.x, 0, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.9, 28, 1, true]} />
          <meshBasicMaterial color="#cfe9ff" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <InkCylinder radius={0.17} height={0.04} position={[0, 0.02, 0]} color="#2c3a40" />
        {level > 0 && <InkCylinder radius={0.15} height={0.9 * t.share * level} position={[0, 0.04 + 0.45 * t.share * level, 0]} color={t.color} ink={0.004} />}
        <Label text={t.label} position={[0, 1.02, 0]} width={0.42} bg="#ffffff" />
      </group>
    ))}
  </group>
);

// A TV studio camera on a tripod, pointing at -z.
export const TvCamera: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {[-0.3, 0.3].map((a) => (
      <InkBox key={a} size={[0.03, 1.2, 0.03]} position={[Math.sin(a) * 0.25, 0.6, Math.cos(a) * 0.1]} rotation={[0, 0, a]} color="#2c3a40" />
    ))}
    <InkBox size={[0.26, 0.24, 0.4]} position={[0, 1.25, 0]} color="#1d1a1a" />
    <InkCylinder radius={0.08} height={0.14} position={[0, 1.25, -0.26]} rotation={FACE} color="#3a3f45" />
  </group>
);

// The register screen at checkout, counting up the total.
export const Register: React.FC<{ position: Vec3; total: string; appear?: number; count?: number }> = ({ position, total, appear, count }) => (
  <group position={position}>
    <InkBox size={[0.4, 0.22, 0.32]} position={[0, 0.11, 0]} color="#2c3a40" />
    <InkCylinder radius={0.02} height={0.3} position={[0, 0.37, -0.05]} color="#2c3a40" />
    <Screen position={[0, 0.62, -0.05]} size={[0.6, 0.3]} text={total} glow="#4dff9a" bg="#06140c" appear={appear} count={count} />
  </group>
);
