import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Why Airlines Sell Your Seat Twice".

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";

// A boarding pass lying flat (top-down shots) or standing (rotation given by the caller).
export const BoardingPass: React.FC<{ position: Vec3; rotation?: Vec3; name: string; seat?: string; stamp?: number; width?: number }> = ({
  position,
  rotation = [-Math.PI / 2, 0, 0],
  name,
  seat = "14C",
  stamp = 0,
  width = 0.5,
}) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 440, (ctx) => {
        ctx.fillStyle = "#fffdf4";
        ctx.fillRect(0, 0, 1024, 440);
        ctx.fillStyle = "#1d4fa8";
        ctx.fillRect(0, 0, 1024, 96);
        ctx.fillStyle = "#fff";
        ctx.font = `900 60px ${BLOCK_FONT}`;
        ctx.fillText("BOARDING PASS", 40, 70);
        ctx.fillStyle = INK;
        ctx.font = `900 54px ${BLOCK_FONT}`;
        ctx.fillText(name, 40, 190);
        ctx.font = `900 40px ${BLOCK_FONT}`;
        ctx.fillStyle = "#666";
        ctx.fillText("SEAT", 640, 170);
        ctx.fillStyle = "#e0262f";
        ctx.font = `900 150px ${BLOCK_FONT}`;
        ctx.fillText(seat, 600, 330);
        ctx.setLineDash([18, 14]);
        ctx.strokeStyle = "#999";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(560, 110);
        ctx.lineTo(560, 430);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = INK;
          ctx.fillRect(40 + i * 15, 300, i % 3 ? 6 : 10, 100);
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 1010, 426);
      }),
    [name, seat],
  );
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, width * 0.43]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {stamp > 0 && (
        <group position={[0.02, -0.01, 0.004]} rotation={[0, 0, -0.18]} scale={1 + (1 - stamp) * 0.8}>
          <Label text="SOLD TWICE" position={[0, 0, 0]} width={width * 0.62} fg="#e0262f" bg="#fffdf4" />
        </group>
      )}
    </group>
  );
};

export const Bed: React.FC<{ position: Vec3; blanket?: string }> = ({ position, blanket = "#6c5ce7" }) => (
  <group position={position}>
    <InkBox size={[1.2, 0.35, 2.0]} position={[0, 0.18, 0]} color="#8a5a3a" />
    <InkBox size={[1.2, 0.9, 0.1]} position={[0, 0.45, -1.0]} color="#8a5a3a" />
    <InkBox size={[0.6, 0.14, 0.35]} position={[0, 0.42, -0.75]} color="#fffaf0" />
    {/* blanket comes up to the sleeper's chest; the puppet stands just behind it */}
    <InkBox size={[1.24, 0.36, 1.2]} position={[0, 0.55, 0.3]} color={blanket} />
  </group>
);

// Bedside alarm clock; `jump` 0..1 sends it flying off the nightstand after the snooze slap.
export const AlarmClock: React.FC<{ position: Vec3; time: string; jump?: number; frame: number; squash?: Vec3 }> = ({ position, time, jump = 0, frame, squash = [1, 1, 1] }) => {
  const face = useMemo(
    () =>
      canvasTexture(512, 256, (ctx) => {
        ctx.fillStyle = "#120606";
        ctx.fillRect(0, 0, 512, 256);
        ctx.fillStyle = "#ff3b30";
        ctx.shadowColor = "#ff3b30";
        ctx.shadowBlur = 20;
        ctx.font = `bold 170px Courier New, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(time, 256, 136);
      }),
    [time],
  );
  const ring = jump === 0 ? Math.sin(frame * 2.2) * 0.04 : 0;
  const up = jump * 0.9 - jump * jump * 0.75;
  return (
    <group position={[position[0] + jump * 0.7, position[1] + up * 0.6, position[2] - jump * 0.3]} rotation={[jump * 1.5, 0, ring - jump * 3]} scale={squash}>
      <InkBox size={[0.34, 0.2, 0.16]} position={[0, 0.1, 0]} color="#e04646" />
      <mesh position={[0, 0.1, 0.082]}>
        <planeGeometry args={[0.28, 0.14]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <InkBox size={[0.18, 0.04, 0.08]} position={[0, 0.22, 0]} color="#f2b630" />
      <Label text="SNOOZE" position={[0, 0.246, 0]} rotation={[-Math.PI / 2, 0, 0]} width={0.16} />
    </group>
  );
};

// A stick arm coming down from above the frame and slapping at `target`; `reach` 0..1.
export const SlapHand: React.FC<{ target: Vec3; reach: number }> = ({ target, reach }) => {
  const [x, y, z] = target;
  const handY = y + 0.9 * (1 - reach);
  return (
    <group>
      <mesh position={[x - 0.2, handY + 0.45, z + 0.15]} rotation={[0, 0, -0.42]}>
        <cylinderGeometry args={[0.018, 0.018, 1.0, 10]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh position={[x, handY + 0.04, z]}>
        <sphereGeometry args={[0.06, 18, 18]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
};

// Fridge with an opening door and a milk carton labelled as the seat. `appear` pops the EXPIRED label (Label's `appear`).
export const Fridge: React.FC<{ position: Vec3; open: number; expired: boolean; appear?: number }> = ({ position, open, expired, appear }) => (
  <group position={position}>
    {/* Hollow cabinet: back, sides, top and bottom, so the shelves show when the door is open */}
    <InkBox size={[1.0, 1.9, 0.06]} position={[0, 0.95, -0.32]} color="#fff6d6" />
    <InkBox size={[0.07, 1.9, 0.7]} position={[-0.465, 0.95, 0]} color="#eef2f4" />
    <InkBox size={[0.07, 1.9, 0.7]} position={[0.465, 0.95, 0]} color="#eef2f4" />
    <InkBox size={[1.0, 0.08, 0.7]} position={[0, 1.86, 0]} color="#eef2f4" />
    <InkBox size={[1.0, 0.12, 0.7]} position={[0, 0.06, 0]} color="#eef2f4" />
    <pointLight position={[0, 1.6, 0.1]} intensity={1.5} distance={1.5} color="#fffbe8" />
    {[0.55, 1.05, 1.5].map((y) => (
      <InkBox key={y} size={[0.86, 0.02, 0.55]} position={[0, y, 0.05]} color="#dfe8ee" ink={0.004} />
    ))}
    <group position={[-0.5, 0, 0.36]} rotation={[0, -open * 1.9, 0]}>
      <InkBox size={[1.0, 1.9, 0.06]} position={[0.5, 0.95, 0]} color="#dfe6ea" />
      <InkBox size={[0.04, 0.5, 0.06]} position={[0.9, 1.1, 0.06]} color="#9aa7b4" ink={0.004} />
    </group>
    <MilkCarton position={[0, 1.06, 0.1]} expired={expired} appear={appear} />
    <InkBox size={[0.18, 0.22, 0.14]} position={[0.3, 1.17, 0.05]} color="#f2b630" />
    <InkCylinder radius={0.07} height={0.26} position={[-0.3, 1.19, 0.05]} color="#e04646" />
  </group>
);

export const MilkCarton: React.FC<{ position: Vec3; expired: boolean; appear?: number }> = ({ position, expired, appear }) => (
  <group position={position}>
    <InkBox size={[0.3, 0.42, 0.24]} position={[0, 0.21, 0]} color="#ffffff" />
    <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.2, 0.16, 4]} />
      <meshToonMaterial color="#ffffff" gradientMap={toonRamp} />
    </mesh>
    <Label text={"SEAT\n14C"} position={[0, 0.26, 0.122]} width={0.24} fg="#1d4fa8" bg="#ffffff" border={false} />
    <Label
      text={expired ? "EXPIRED" : "FRESH UNTIL\nTAKEOFF"}
      position={[0, 0.07, 0.123]}
      width={0.27}
      fg={expired ? "#ffffff" : "#e0262f"}
      bg={expired ? "#e0262f" : "#ffffff"}
      appear={expired ? appear : undefined}
    />
  </group>
);

// Low-poly airliner, nose toward +x. `t` 0..1 rolls it down the runway and lifts it off.
export const Plane: React.FC<{ position: Vec3; t: number; scale?: number }> = ({ position, t, scale = 1 }) => {
  const x = -2.5 + t * 6;
  const lift = Math.max(0, t - 0.45) ** 2 * 3.5;
  const pitch = Math.min(0.25, Math.max(0, t - 0.45) * 0.8);
  return (
    <group position={[position[0] + x, position[1] + lift, position[2]]} rotation={[0, 0, pitch]} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.22, 2.0, 8, 24]} />
        <meshToonMaterial color="#f4f6f8" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.7, 0.04, 2.4]} position={[0.1, -0.05, 0]} color="#1d4fa8" ink={0.01} />
      <InkBox size={[0.4, 0.5, 0.04]} position={[-1.05, 0.35, 0]} color="#1d4fa8" ink={0.01} />
      <InkBox size={[0.3, 0.04, 0.9]} position={[-1.05, 0.06, 0]} color="#1d4fa8" ink={0.01} />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-0.75 + i * 0.18, 0.06, 0.215]}>
          <circleGeometry args={[0.035, 12]} />
          <meshBasicMaterial color={i === 5 ? "#ffd23f" : "#2b3b55"} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

export const Runway: React.FC = () => (
  <group>
    <InkBox size={[30, 0.02, 2.4]} position={[0, 0.01, -1.5]} color="#2a2f3a" ink={0} />
    {Array.from({ length: 14 }, (_, i) => (
      <InkBox key={i} size={[0.8, 0.01, 0.08]} position={[-13 + i * 2, 0.025, -1.5]} color="#ffffff" ink={0} />
    ))}
    {Array.from({ length: 30 }, (_, i) => (
      <mesh key={`l${i}`} position={[-14 + i, 0.05, i % 2 ? -0.25 : -2.75]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={i % 3 ? "#ffd27a" : "#5ad1ff"} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

// Rows of airline seats seen from the aisle; occupied rows are drawn by the puppets placed on them.
export const SeatRows: React.FC<{ rows: number; z0: number; color?: string }> = ({ rows, z0, color = "#1d4fa8" }) => (
  <group>
    {Array.from({ length: rows }, (_, r) =>
      [-0.95, -0.5, 0.5, 0.95].map((x) => (
        <group key={`${r}${x}`} position={[x, 0, z0 - r * 0.9]}>
          <InkBox size={[0.42, 0.08, 0.42]} position={[0, 0.34, 0]} color={color} />
          <InkBox size={[0.42, 0.42, 0.08]} position={[0, 0.58, -0.2]} color={color} />
          <InkBox size={[0.3, 0.08, 0.05]} position={[0, 0.76, -0.2]} color="#ffffff" ink={0.004} />
        </group>
      )),
    )}
  </group>
);

// 100 x 100 dots, `red` of them red: "nine in ten thousand".
export const DotGrid: React.FC<{ position: Vec3; size: number; red: number }> = ({ position, size, red }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1000, 1000, (ctx) => {
        ctx.fillStyle = "#0b1730";
        ctx.fillRect(0, 0, 1000, 1000);
        const hot = new Set([1234, 2871, 3302, 4519, 5050, 6127, 7488, 8216, 9603].slice(0, red));
        for (let i = 0; i < 10000; i++) {
          const x = (i % 100) * 10 + 5;
          const y = Math.floor(i / 100) * 10 + 5;
          ctx.fillStyle = hot.has(i) ? "#ff2a2a" : "#8fb3ff";
          ctx.beginPath();
          ctx.arc(x, y, hot.has(i) ? 6 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [red],
  );
  return (
    <group position={position}>
      <InkBox size={[size + 0.08, size + 0.08, 0.04]} position={[0, 0, -0.025]} color="#22262b" />
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Tickets shooting out of a printer slot at `origin` toward +z and up, `count` visible by `t` (0..1).
export const TicketStream: React.FC<{ origin: Vec3; t: number; count?: number }> = ({ origin, t, count = 16 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 128, (ctx) => {
        ctx.fillStyle = "#fffdf4";
        ctx.fillRect(0, 0, 256, 128);
        ctx.fillStyle = "#1d4fa8";
        ctx.fillRect(0, 0, 256, 34);
        ctx.fillStyle = "#e0262f";
        ctx.font = `900 60px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("14C", 128, 104);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, 248, 120);
      }),
    [],
  );
  return (
    <group position={origin}>
      {Array.from({ length: count }, (_, i) => {
        const age = t * (count + 6) - i;
        if (age <= 0) return null;
        const a = Math.min(age, 6) / 6;
        const spread = ((i * 53) % 11) / 10 - 0.5;
        return (
          <mesh key={i} position={[spread * 1.2 * a, 0.9 * a - 0.5 * a * a + 0.1, 1.2 * a]} rotation={[a * 4 + i, a * 3, spread * 2]}>
            <planeGeometry args={[0.2, 0.1]} />
            <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Printer: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.3, 0.4]} position={[0, 0.15, 0]} color="#dfe6ea" />
    <InkBox size={[0.36, 0.02, 0.05]} position={[0, 0.26, 0.2]} color="#161616" ink={0} />
  </group>
);
