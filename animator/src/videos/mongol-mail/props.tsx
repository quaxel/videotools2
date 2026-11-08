import React from "react";
import * as THREE from "three";
import { InkBox, InkCylinder, Label, toonRamp } from "../../engine";
import { Blob } from "../../three/BalloonSets";

type Vec3 = [number, number, number];

// Props for "The Mongol Mail That Never Stopped".

// A row of brass bells hanging from a belt, centred at `position`, running along x (seen side-on on a rider).
// `ring` 0..1 swings them. Drawn about 2x real size so they read on a phone.
export const BellBelt: React.FC<{ position: Vec3; ring?: number; frame?: number; n?: number; span?: number }> = ({ position, ring = 0, frame = 0, n = 5, span = 0.3 }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[span + 0.06, 0.035, 0.03]} position={[0, 0.02, 0]} color="#6a3a1a" ink={0.006} />
    {Array.from({ length: n }, (_, i) => {
      const x = -span / 2 + (i * span) / (n - 1);
      const sw = Math.sin(frame * 0.9 + i * 1.7) * 0.5 * ring;
      return (
        <group key={i} position={[x, 0, 0.02]} rotation={[0, 0, sw]}>
          <mesh position={[0, -0.04, 0]}>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshToonMaterial color="#e8b83a" gradientMap={toonRamp} emissive="#3a2a00" />
          </mesh>
          <mesh position={[0, -0.04, 0]} scale={1.22}>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshBasicMaterial color="#1d1712" side={THREE.BackSide} />
          </mesh>
          <InkBox size={[0.03, 0.006, 0.006]} position={[0, -0.058, 0.024]} color="#1d1712" ink={0} />
        </group>
      );
    })}
  </group>
);

// The paiza: a tall rounded iron tablet with a ring at the top, silver lines and a falcon. Face toward +z.
// Drawn 2x real size (about 0.4 m) so it reads.
export const Paiza: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; shine?: number }> = ({ position, rotation = [0, 0, 0], scale = 1, shine = 0 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.16, 0.36, 0.02]} position={[0, 0, 0]} color="#3a3a44" ink={0.008} />
    <InkCylinder radius={0.08} height={0.02} position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} color="#3a3a44" ink={0.008} />
    <InkCylinder radius={0.08} height={0.02} position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]} color="#3a3a44" ink={0.008} />
    {/* ring */}
    <mesh position={[0, 0.29, 0]}>
      <torusGeometry args={[0.035, 0.01, 8, 20]} />
      <meshToonMaterial color="#c8c8d0" gradientMap={toonRamp} />
    </mesh>
    {/* silver border and falcon */}
    <InkBox size={[0.13, 0.008, 0.004]} position={[0, 0.2, 0.012]} color="#e6e6f0" ink={0} />
    <InkBox size={[0.13, 0.008, 0.004]} position={[0, -0.2, 0.012]} color="#e6e6f0" ink={0} />
    <group position={[0, 0.07, 0.014]}>
      <Blob position={[0, 0, 0]} scale={[0.022, 0.04, 0.006]} color="#eceaf2" ink={0.15} />
      <Blob position={[0, 0.045, 0]} scale={[0.016, 0.016, 0.006]} color="#eceaf2" ink={0.15} />
      {[-1, 1].map((k) => (
        <Blob key={k} position={[k * 0.04, 0.01, 0]} rotation={[0, 0, k * 0.5]} scale={[0.045, 0.014, 0.005]} color="#eceaf2" ink={0.12} />
      ))}
      <InkBox size={[0.02, 0.025, 0.004]} position={[0, -0.05, 0]} color="#eceaf2" ink={0} />
    </group>
    {/* vertical lines of script */}
    {[-0.04, 0, 0.04].map((x) => (
      <InkBox key={x} size={[0.01, 0.1, 0.004]} position={[x, -0.1, 0.012]} color="#d8d8e4" ink={0} />
    ))}
    {shine > 0 && (
      <mesh position={[0.03, 0.1, 0.02]}>
        <circleGeometry args={[0.03 + 0.02 * shine, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8 * shine} toneMapped={false} depthWrite={false} />
      </mesh>
    )}
  </group>
);

// A red lacquered letter tube with brass caps, along x.
export const LetterTube: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <InkCylinder radius={0.035} height={0.32} rotation={[0, 0, Math.PI / 2]} color="#c8302a" ink={0.006} />
    {[-1, 1].map((s) => (
      <InkCylinder key={s} radius={0.04} height={0.04} position={[s * 0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#e8b83a" ink={0.006} />
    ))}
    <InkBox size={[0.02, 0.075, 0.075]} position={[0, 0, 0]} color="#e8b83a" ink={0} />
  </group>
);

// A saddle on a wall peg (tack room), facing +z.
export const PeggedSaddle: React.FC<{ position: Vec3; color?: string; cloth?: string }> = ({ position, color = "#8a3a22", cloth = "#3a6a8a" }) => (
  <group position={position}>
    <InkCylinder radius={0.03} height={0.3} position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]} color="#5a3a22" ink={0.006} />
    <InkBox size={[0.5, 0.36, 0.04]} position={[0, -0.12, 0.2]} color={cloth} ink={0.01} />
    <Blob position={[0, 0.03, 0.26]} scale={[0.2, 0.08, 0.13]} color={color} ink={0.06} />
    <InkBox size={[0.04, 0.12, 0.04]} position={[0.14, 0.08, 0.26]} color={color} ink={0.006} />
    <InkBox size={[0.04, 0.3, 0.02]} position={[-0.12, -0.18, 0.3]} color="#3a2418" ink={0.004} />
    <InkCylinder radius={0.035} height={0.02} position={[-0.12, -0.34, 0.3]} color="#c8c8d0" ink={0.004} />
  </group>
);

// A wicker basket of peaches with a tag (the fruit from the capital), facing +z.
export const FruitBasket: React.FC<{ position: Vec3; tag?: string; appear?: number; taken?: number }> = ({ position, tag, appear, taken = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.22} height={0.18} position={[0, 0.09, 0]} color="#c89a50" ink={0.01} />
    {[0.04, 0.1, 0.16].map((y) => (
      <InkCylinder key={y} radius={0.223} height={0.012} position={[0, y, 0]} color="#8a6030" ink={0} />
    ))}
    {Array.from({ length: 7 - taken }, (_, i) => {
      const a = i * 0.9;
      const r = i === 0 ? 0 : 0.12;
      return <Blob key={i} position={[Math.cos(a) * r, 0.2 + (i === 0 ? 0.06 : 0), Math.sin(a) * r * 0.8]} scale={[0.065, 0.06, 0.065]} color={i % 2 ? "#f08a5a" : "#f4a868"} ink={0.08} />;
    })}
    <InkBox size={[0.08, 0.02, 0.04]} position={[0.02, 0.32, 0]} color="#4a8a3a" ink={0.004} />
    {tag && <Label text={tag} position={[0, 0.06, 0.25]} width={0.5} appear={appear} bg="#f6e6c0" />}
  </group>
);

export const Peach: React.FC<{ position: Vec3; bitten?: boolean }> = ({ position, bitten }) => (
  <group position={position} userData={{ ghost: true }}>
    <Blob position={[0, 0, 0]} scale={[0.065, 0.06, 0.065]} color="#f4a868" ink={0.08} />
    {bitten && <Blob position={[0.04, 0.02, 0.03]} scale={[0.035, 0.035, 0.035]} color="#ffe0a0" ink={0} />}
  </group>
);

// A low writing table with an ink pot and a slip of paper (the clerk's log), facing +z.
export const LogTable: React.FC<{ position: Vec3; slip?: string; appear?: number }> = ({ position, slip, appear }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.05, 0.5]} position={[0, 0.45, 0]} color="#8a4a2a" ink={0.012} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.05, 0.45, 0.05]} position={[sx * 0.38, 0.225, sz * 0.2]} color="#5a2e1a" ink={0.006} />))}
    <InkCylinder radius={0.04} height={0.06} position={[0.3, 0.505, -0.1]} color="#1d1712" ink={0.004} />
    <InkBox size={[0.3, 0.004, 0.2]} position={[-0.05, 0.477, 0.04]} color="#f4ecd8" ink={0.003} />
    {slip && <Label text={slip} position={[-0.05, 0.62, 0.2]} rotation={[-0.25, 0, 0]} width={0.5} appear={appear} bg="#f4ecd8" />}
  </group>
);
