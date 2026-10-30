import React from "react";
import * as THREE from "three";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Your Aries Friend Has One Button".

const INK = "#161212";

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; opacity?: number }> = ({ position, radius, color, glow, opacity = 1 }) => (
  <mesh position={position} castShadow={!glow && opacity === 1}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? (
      <meshBasicMaterial color={color} toneMapped={false} />
    ) : (
      <meshToonMaterial color={color} gradientMap={toonRamp} transparent={opacity < 1} opacity={opacity} />
    )}
  </mesh>
);

// Glass shower cubicle with a shower head; `steam` 0..1 fogs it with puffs.
export const Shower: React.FC<{ position: Vec3; f: number; steam?: number }> = ({ position, f, steam = 1 }) => (
  <group position={position}>
    <InkBox size={[1.1, 0.1, 1.0]} position={[0, 0.05, 0]} color="#e8f6f5" />
    <mesh position={[0, 1.15, 0.5]}>
      <planeGeometry args={[1.1, 2.1]} />
      <meshBasicMaterial color="#bdf2ee" transparent opacity={0.22} />
    </mesh>
    <InkBox size={[0.04, 2.2, 0.04]} position={[0.55, 1.1, 0.5]} color="#c9ced3" ink={0.004} />
    <InkBox size={[0.04, 2.2, 0.04]} position={[-0.55, 1.1, 0.5]} color="#c9ced3" ink={0.004} />
    <InkBox size={[0.04, 0.5, 0.04]} position={[0, 2.0, -0.45]} color="#c9ced3" ink={0.004} />
    <InkCylinder radius={0.12} height={0.04} position={[0, 1.75, -0.35]} color="#c9ced3" ink={0.006} />
    {Array.from({ length: 7 }, (_, i) => {
      const t = ((f * 0.012 + i / 7) % 1);
      return <Ball key={i} position={[Math.sin(i * 2.3) * 0.4, 0.9 + t * 1.3, 0.3 + Math.cos(i) * 0.15]} radius={0.12 + t * 0.12} color="#ffffff" opacity={0.35 * steam * (1 - t)} />;
    })}
  </group>
);

// Bakery oven: `open` 0..1 swings the door down, `shake` jiggles the body, `glow` lights the window.
export const Oven: React.FC<{ position: Vec3; open?: number; shake?: number; glow?: number }> = ({ position, open = 0, shake = 0, glow = 0.3 }) => (
  <group position={[position[0] + Math.sin(shake * 40) * 0.015 * Math.min(1, shake), position[1], position[2]]}>
    <InkBox size={[0.9, 0.95, 0.7]} position={[0, 0.475, 0]} color="#c9ced3" />
    <InkBox size={[0.9, 0.12, 0.7]} position={[0, 1.01, 0]} color="#3a3a44" />
    {[-0.25, 0, 0.25].map((x) => (
      <InkCylinder key={x} radius={0.04} height={0.03} position={[x, 1.01, 0.36]} rotation={[Math.PI / 2, 0, 0]} color="#e0262f" ink={0.004} />
    ))}
    <group position={[0, 0.12, 0.36]} rotation={[open * 1.45, 0, 0]}>
      <InkBox size={[0.8, 0.65, 0.04]} position={[0, 0.33, 0]} color="#e6ecf2" />
      <mesh position={[0, 0.36, 0.025]}>
        <planeGeometry args={[0.55, 0.32]} />
        <meshBasicMaterial color={glow > 0.6 ? "#ff7a1a" : "#2a1a14"} toneMapped={false} />
      </mesh>
      <InkBox size={[0.5, 0.04, 0.05]} position={[0, 0.6, 0.05]} color="#3a3a44" ink={0.004} />
    </group>
  </group>
);

// Black smoke puffs billowing from a point; `amount` 0..1 grows them.
export const Smoke: React.FC<{ position: Vec3; f: number; amount: number; spread?: number }> = ({ position, f, amount, spread = 1 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: 14 }, (_, i) => {
      const t = (f * 0.02 + i / 14) % 1;
      const r = (0.12 + t * 0.35) * amount * spread;
      return <Ball key={i} position={[Math.sin(i * 1.7) * t * 1.2 * spread, t * 1.6, Math.cos(i * 2.1) * t * 0.5]} radius={Math.max(0.001, r)} color={i % 3 ? "#2b2b30" : "#46464d"} />;
    })}
  </group>
);

// Ceiling smoke alarm with a flashing light.
export const Alarm: React.FC<{ position: Vec3; f: number; on?: boolean }> = ({ position, f, on = true }) => (
  <group position={position}>
    <InkCylinder radius={0.16} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#f7f7f2" />
    <Ball position={[0, 0, 0.06]} radius={0.05} color={on && f % 10 < 5 ? "#ff2a2a" : "#5a1010"} glow={on && f % 10 < 5} />
  </group>
);

// A thick instruction book, cover facing +z.
export const Manual: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.3, 0.4, 0.08]} color="#1d4fa8" ink={0.006} />
    <InkBox size={[0.28, 0.38, 0.07]} position={[0.012, 0, 0]} color="#fffaf0" ink={0} />
    <Label text="MANUAL" position={[0, 0.06, 0.045]} width={0.26} fg="#ffffff" bg="#1d4fa8" border={false} />
    <Label text="OVEN" position={[0, -0.08, 0.045]} width={0.16} fg="#1d4fa8" bg="#ffd23f" border={false} />
  </group>
);

// Giant GO button on a pedestal; `press` 0..1 pushes it in, `pop` lifts it out of its socket.
export const GoButton: React.FC<{ position: Vec3; press?: number; pop?: number; scale?: number }> = ({ position, press = 0, pop = 0, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[0.7, 0.8, 0.7]} position={[0, 0.4, 0]} color="#3a3a44" />
    <InkCylinder radius={0.32} height={0.06} position={[0, 0.83, 0]} color="#c9ced3" />
    <group position={[0, 0.92 - press * 0.07 + pop * 0.45, 0]} rotation={[pop * 0.6, 0, pop * 0.4]}>
      <InkCylinder radius={0.26} height={0.14} color="#e0262f" />
      <mesh position={[0, 0.071, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 32]} />
        <meshBasicMaterial color="#ff6b6b" toneMapped={false} transparent opacity={0.55} />
      </mesh>
      <Label text="GO" position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} width={0.28} fg="#ffffff" bg="#e0262f" border={false} />
    </group>
    <Label text="GO" position={[0, 0.5, 0.36]} width={0.5} fg="#ffffff" bg="#e0262f" />
  </group>
);

// Round wall dial with a red needle (0..1 of a half turn), optionally sealed in a plastic box.
export const PatienceDial: React.FC<{ position: Vec3; needle?: number; wrapped?: boolean }> = ({ position, needle = 0, wrapped = true }) => (
  <group position={position}>
    <InkCylinder radius={0.38} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#fff6dc" />
    {Array.from({ length: 9 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 8) * Math.PI;
      return <InkBox key={i} size={[0.012, 0.06, 0.01]} position={[Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0.03]} rotation={[0, 0, -a]} color={INK} ink={0} />;
    })}
    <group position={[0, 0, 0.045]} rotation={[0, 0, Math.PI / 2 - needle * Math.PI]}>
      <InkBox size={[0.03, 0.26, 0.02]} position={[0, 0.12, 0]} color="#d62828" ink={0.004} />
    </group>
    <Ball position={[0, 0, 0.05]} radius={0.035} color={INK} />
    {wrapped && (
      <>
        <mesh position={[0, 0, 0.09]}>
          <boxGeometry args={[0.9, 0.9, 0.14]} />
          <meshBasicMaterial color="#e8fbff" transparent opacity={0.28} />
        </mesh>
        {[-0.32, 0.25].map((x, i) => (
          <mesh key={x} position={[x, 0.25 - i * 0.5, 0.165]} rotation={[0, 0, 0.7]}>
            <planeGeometry args={[0.04, 0.3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
        ))}
        <Label text="NEW" position={[0.3, 0.33, 0.17]} width={0.18} fg="#ffffff" bg="#3fae5a" />
      </>
    )}
  </group>
);

// Wall socket and a plug lying loose on the floor below it, joined by a slack cable.
export const LoosePlug: React.FC<{ socket: Vec3; plug: Vec3 }> = ({ socket, plug }) => {
  const mid: Vec3 = [(socket[0] + plug[0]) / 2, 0.02, (socket[2] + plug[2]) / 2 + 0.2];
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...socket).setY(socket[1] - 0.6), new THREE.Vector3(...mid), new THREE.Vector3(...plug)]);
  return (
    <group>
      <InkBox size={[0.18, 0.22, 0.03]} position={socket} color="#f7f7f2" />
      {[-0.035, 0.035].map((x) => (
        <InkBox key={x} size={[0.02, 0.05, 0.01]} position={[socket[0] + x, socket[1], socket[2] + 0.02]} color={INK} ink={0} />
      ))}
      <mesh>
        <tubeGeometry args={[curve, 24, 0.015, 8, false]} />
        <meshToonMaterial color="#2b2b30" gradientMap={toonRamp} />
      </mesh>
      <group position={plug} rotation={[0, 0.4, 0]}>
        <InkBox size={[0.12, 0.07, 0.09]} color="#f7f7f2" ink={0.005} />
        {[-0.025, 0.025].map((x) => (
          <InkBox key={x} size={[0.012, 0.012, 0.06]} position={[x, 0, 0.07]} color="#e8b04a" ink={0} />
        ))}
      </group>
    </group>
  );
};

// Hanging punching bag; `swing` in radians.
export const PunchingBag: React.FC<{ position: Vec3; swing?: number }> = ({ position, swing = 0 }) => (
  <group position={position}>
    <InkBox size={[0.04, 0.04, 0.04]} position={[0, 0, 0]} color="#3a3a44" ink={0.004} />
    <group rotation={[0, 0, swing]}>
      <InkBox size={[0.015, 0.45, 0.015]} position={[0, -0.22, 0]} color="#3a3a44" ink={0} />
      <InkCylinder radius={0.2} height={0.85} position={[0, -0.88, 0]} color="#e0262f" />
      <InkCylinder radius={0.205} height={0.06} position={[0, -0.6, 0]} color={INK} ink={0} />
    </group>
  </group>
);

// Cakes and buns on a bakery display.
export const CakeDisplay: React.FC<{ position: Vec3; burnt?: boolean }> = ({ position, burnt }) => (
  <group position={position}>
    {[-0.54, -0.18, 0.18, 0.54].map((x, i) => (
      <group key={x} position={[x, 0, 0]}>
        <InkCylinder radius={0.13} height={0.12} position={[0, 0.06, 0]} color={burnt ? "#2b2b30" : ["#ff8fc8", "#ffd23f", "#f7f2e6", "#ff8fc8"][i]} ink={0.005} />
        <InkCylinder radius={0.135} height={0.025} position={[0, 0.13, 0]} color={burnt ? "#3a3a44" : "#ffffff"} ink={0.004} />
        {!burnt && <Ball position={[0, 0.17, 0]} radius={0.025} color="#e0262f" />}
      </group>
    ))}
  </group>
);

// Exercise mat.
export const Mat: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#4f7dff" }) => <InkBox size={[1.6, 0.04, 1.0]} position={position} color={color} ink={0.006} />;

// Dizzy stars circling a point.
export const DizzyStars: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position} userData={{ ghost: true }}>
    {[0, 1, 2].map((i) => {
      const a = f / 6 + (i * Math.PI * 2) / 3;
      return <Ball key={i} position={[Math.cos(a) * 0.2, Math.sin(a * 2) * 0.03, Math.sin(a) * 0.12]} radius={0.035} color="#ffd23f" glow />;
    })}
  </group>
);
