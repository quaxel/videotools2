import React from "react";
import * as THREE from "three";
import { Halo, InkBox, InkCylinder, Label, Vec3 } from "../../engine";

// Props for "Why Airports Make You Walk Farther".

const FACE: Vec3 = [Math.PI / 2, 0, 0];
const CASE_COLORS = ["#e0262f", "#1d4fa8", "#3fae5a", "#ffd23f", "#9b5de5", "#ff9f1c"];

// A hard-shell suitcase standing up, facing +z.
export const Suitcase: React.FC<{ position: Vec3; color: string; rotation?: Vec3; scale?: number }> = ({ position, color, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkBox size={[0.36, 0.5, 0.2]} position={[0, 0.25, 0]} color={color} />
    <InkBox size={[0.3, 0.02, 0.21]} position={[0, 0.34, 0]} color="#161212" ink={0} shadows={false} />
    <InkBox size={[0.12, 0.04, 0.04]} position={[0, 0.52, 0]} color="#2c3a40" ink={0.003} />
  </group>
);

// A long airport corridor running into the distance along -z, gate signs on the side wall and ceiling lights.
// `z0` is its near end; `length` metres long. The STAFF ONLY door sits on the right wall at `doorZ`.
export const Corridor: React.FC<{ z0: number; length: number; doorZ: number; door?: number }> = ({ z0, length, doorZ, door = 0 }) => (
  <group>
    {[-1.4, 1.4].map((x) => (
      <InkBox key={x} size={[0.1, 2.8, length]} position={[x, 1.4, z0 - length / 2]} color="#5ec4b6" ink={0.004} />
    ))}
    <InkBox size={[2.9, 0.08, length]} position={[0, 2.8, z0 - length / 2]} color="#f4f7fa" ink={0} />
    {Array.from({ length: Math.floor(length / 3) }, (_, i) => (
      <group key={i}>
        <mesh position={[0, 2.75, z0 - 1.5 - i * 3]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 0.3]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <Label text={`GATE ${String.fromCharCode(65 + (i % 3))}${i + 2}`} position={[-1.34, 2.1, z0 - 1.2 - i * 3]} rotation={[0, Math.PI / 2, 0]} width={0.8} fg="#ffffff" bg="#1d4fa8" />
      </group>
    ))}
    {/* moving-walkway strip on the floor */}
    <InkBox size={[0.9, 0.04, length]} position={[0.5, 0.02, z0 - length / 2]} color="#3a3f45" ink={0} />
    <group position={[1.34, 0, doorZ]} rotation={[0, -Math.PI / 2, 0]}>
      <InkBox size={[1.0, 2.1, 0.06]} position={[0, 1.05, 0]} color="#c9ced3" />
      {/* the control room glow behind the door */}
      <mesh position={[0, 0.98, 0.035]}>
        <planeGeometry args={[0.84, 1.96]} />
        <meshBasicMaterial color="#2f5fb0" toneMapped={false} />
      </mesh>
      {door > 0.05 && <Halo position={[0, 1.0, 0.1]} size={1.6} color="#5a8dff" strength={0.5 * door} />}
      <group position={[-0.42, 0, 0.04]} rotation={[0, door * 1.5, 0]}>
        <InkBox size={[0.84, 1.96, 0.05]} position={[0.42, 0.98, 0]} color="#e0262f" />
      </group>
      <Label text="STAFF ONLY" position={[0, 2.3, 0.05]} width={0.8} fg="#ffffff" bg="#161212" />
    </group>
  </group>
);

// A baggage carousel: an oval belt with suitcases riding it (`t` in metres travelled); `drop` index slides off.
export const Carousel: React.FC<{ position: Vec3; t: number; count?: number; bonk?: number }> = ({ position, t, count = 6, bonk }) => {
  const R = 0.55;
  const L = 1.6;
  const loop = 2 * L + 2 * Math.PI * R;
  const at = (s: number): [number, number, number] => {
    const u = ((s % loop) + loop) % loop;
    if (u < L) return [-L / 2 + u, R, 0];
    if (u < L + Math.PI * R) {
      const a = (u - L) / R;
      return [L / 2 + Math.sin(a) * R, Math.cos(a) * R, a];
    }
    if (u < 2 * L + Math.PI * R) return [L / 2 - (u - L - Math.PI * R), -R, Math.PI];
    const a = (u - 2 * L - Math.PI * R) / R;
    return [-L / 2 - Math.sin(a) * R, -Math.cos(a) * R, Math.PI + a];
  };
  return (
    <group position={position}>
      <InkBox size={[L + 2 * R + 0.3, 0.4, 2 * R + 0.3]} position={[0, 0.2, 0]} color="#9aa0a6" />
      <InkBox size={[L + 2 * R, 0.04, 2 * R]} position={[0, 0.42, 0]} color="#2c3a40" ink={0} />
      {Array.from({ length: count }, (_, i) => {
        const [x, z] = at(t + (i * loop) / count);
        const off = bonk !== undefined && bonk >= 0 && i === 0;
        const k = off ? Math.min(bonk, 14) : 0;
        return (
          // the bag that slides off may pass through a passenger: not a collider
          <group key={i} userData={off ? { ghost: true } : undefined}>
          <Suitcase
            color={CASE_COLORS[i % CASE_COLORS.length]}
            position={off ? [x + k * 0.03, 0.44 + k * 0.02 - k * k * 0.004, z + k * 0.07] : [x, 0.44, z]}
            rotation={[off ? k * 0.15 : -1.2, 0, 0]}
            scale={0.8}
          />
          </group>
        );
      })}
    </group>
  );
};

// A complaint box on a stand; `burst` (frames since) sprays letters out of the slot.
export const ComplaintBox: React.FC<{ position: Vec3; burst?: number; label?: string }> = ({ position, burst, label = "COMPLAINTS" }) => (
  <group position={position}>
    <InkBox size={[0.06, 0.9, 0.06]} position={[0, 0.45, 0]} color="#2c3a40" />
    <InkBox size={[0.6, 0.5, 0.4]} position={[0, 1.15, 0]} color="#e0262f" />
    <InkBox size={[0.3, 0.03, 0.02]} position={[0, 1.36, 0.2]} color="#161212" ink={0} />
    <Label text={label} position={[0, 1.12, 0.205]} width={0.52} bg="#ffffff" />
    {burst !== undefined &&
      burst >= 0 &&
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const k = Math.min(burst, 26);
        const v = 0.012 + (i % 4) * 0.004;
        return (
          <mesh key={i} position={[Math.cos(a) * v * k, 1.42 + 0.03 * k - 0.0011 * k * k, 0.2 + Math.abs(Math.sin(a)) * v * k]} rotation={[k * 0.2 + i, k * 0.1, i]}>
            <planeGeometry args={[0.12, 0.08]} />
            <meshToonMaterial color="#fffdf4" side={THREE.DoubleSide} />
          </mesh>
        );
      })}
  </group>
);

// The airport map board: terminal, belts and a gate marker that `drag` (0..1) slides to the far end.
export const MapBoard: React.FC<{ position: Vec3; drag: number; route?: number }> = ({ position, drag, route = 0 }) => {
  const gx = -0.55 + drag * 1.1;
  return (
    <group position={position}>
      <InkBox size={[1.5, 1.0, 0.05]} color="#0b1a3a" />
      <InkBox size={[1.3, 0.12, 0.01]} position={[0, -0.15, 0.03]} color="#3d4f8a" ink={0} />
      <Label text="BAGS" position={[-0.5, 0.22, 0.03]} width={0.36} bg="#ffd23f" />
      <InkBox size={[Math.max(0.01, Math.abs(gx + 0.5) * route), 0.03, 0.01]} position={[-0.5 + (gx + 0.5) * route * 0.5, -0.15, 0.04]} color="#ff3b30" ink={0} />
      <group position={[gx, -0.15, 0.05]}>
        <InkCylinder radius={0.07} height={0.03} rotation={FACE} color="#ff3b30" />
        <Halo position={[0, 0, 0.02]} size={0.3} color="#ff3b30" strength={0.6} />
        <Label text="YOUR GATE" position={[0, 0.16, 0.01]} width={0.4} bg="#ffffff" />
      </group>
    </group>
  );
};

// A pair of hotel elevator doors with tall mirrors either side; `open` 0..1 slides the doors.
export const MirrorElevators: React.FC<{ position: Vec3; open?: number }> = ({ position, open = 0 }) => (
  <group position={position}>
    <InkBox size={[1.2, 2.3, 0.08]} position={[0, 1.15, 0]} color="#e8b04a" />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.5, 2.0, 0.04]} position={[s * (0.25 + open * 0.45), 1.0, 0.05]} color="#c9ced3" ink={0.004} />
    ))}
    {[-1, 1].map((s) => (
      <group key={`m${s}`} position={[s * 1.05, 1.15, 0.03]}>
        <InkBox size={[0.6, 1.7, 0.04]} color="#e8b04a" />
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.5, 1.6]} />
          <meshBasicMaterial color="#d8f0ff" toneMapped={false} />
        </mesh>
        <InkBox size={[0.04, 1.4, 0.005]} position={[-0.12, 0.05, 0.03]} rotation={[0, 0, 0.25]} color="#ffffff" ink={0} shadows={false} />
        <Label text="MIRROR" position={[0, 0.98, 0.03]} width={0.4} bg="#ffffff" />
      </group>
    ))}
  </group>
);
