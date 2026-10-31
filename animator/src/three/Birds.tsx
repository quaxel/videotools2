import React, { useMemo } from "react";
import * as THREE from "three";
import { toonRamp } from "./toon";

// Large soaring birds for sky shots: inked cel turkey vultures (built from photo references, see
// guide/references/kentucky-farmyard-1876.md) that circle a thermal, bank into the turn and teeter.
// Flat bird sprites on a plain sky read badly; these are real 3D shapes, so they turn and foreshorten.

type Vec3 = [number, number, number];
const INK = "#161212";

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// One turkey vulture wing (left-to-right along +x, forward = +z): a long broad wing ending in five spread
// "fingers". `under` is the silvery rear half of the underside, `ink` the black outline shape.
const wingShapes = () => {
  const outline = new THREE.Shape();
  outline.moveTo(0, 0.13);
  outline.quadraticCurveTo(0.45, 0.16, 0.86, 0.06);
  const fingers: [number, number][] = [];
  for (let k = 0; k < 5; k++) {
    const y = 0.05 - k * 0.055;
    fingers.push([1.02 - k * 0.025, y], [0.86 - k * 0.012, y - 0.03]);
  }
  fingers.forEach(([x, y]) => outline.lineTo(x, y));
  outline.quadraticCurveTo(0.45, -0.24, 0, -0.17);
  outline.closePath();
  const under = new THREE.Shape();
  under.moveTo(0.02, -0.02);
  under.quadraticCurveTo(0.45, -0.01, 0.84, -0.04);
  fingers.slice(2).forEach(([x, y]) => under.lineTo(x - 0.01, y));
  under.quadraticCurveTo(0.45, -0.23, 0.02, -0.16);
  under.closePath();
  return { outline, under };
};

const Vulture: React.FC<{ frame: number; seed: number; span: number }> = ({ frame, seed, span }) => {
  const g = useMemo(() => {
    const { outline, under } = wingShapes();
    return { wing: new THREE.ShapeGeometry(outline, 8), under: new THREE.ShapeGeometry(under, 8) };
  }, []);
  // glide with the wings held in a V, a slow deep flap now and then, and the vulture's side-to-side teeter
  const flapPhase = (frame + seed * 37) % 150;
  const flap = flapPhase < 24 ? Math.sin((flapPhase / 24) * Math.PI * 2) * 0.35 : 0;
  const dihedral = 0.22 + flap;
  const wing = (side: 1 | -1) => (
    <group rotation={[0, 0, side * dihedral]} scale={[side, 1, 1]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={g.wing} scale={[1.04, 1.12, 1]} position={[-0.01, 0, -0.004]}>
          <meshBasicMaterial color={INK} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={g.wing}>
          <meshToonMaterial color="#2a221e" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={g.under} position={[0, 0, 0.004]}>
          <meshBasicMaterial color="#a9a49c" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
  return (
    <group scale={span / 2}>
      {wing(1)}
      {wing(-1)}
      <mesh scale={[0.1, 0.08, 0.3]} position={[0, -0.01, 0]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshToonMaterial color="#231c18" gradientMap={toonRamp} />
      </mesh>
      <mesh scale={[0.11, 0.09, 0.32]} position={[0, -0.01, 0]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {/* small bare red head and pale bill */}
      <mesh position={[0, -0.005, 0.32]} scale={0.055}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial color="#c4483a" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, -0.01, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.022, 0.06, 8]} />
        <meshToonMaterial color="#efe6d0" gradientMap={toonRamp} />
      </mesh>
      {/* long tail */}
      <mesh position={[0, -0.01, -0.36]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-0.07, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.09, -0.2), new THREE.Vector2(-0.09, -0.2)])]} />
        <meshToonMaterial color="#2a221e" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Vultures circling on a thermal around `centre`, each banking into the turn and teetering; `fade` 0..1 shows
// them (they shrink and drift up out of sight as it falls).
export const Vultures: React.FC<{ frame: number; centre: Vec3; radius?: number; count?: number; size?: number; fade?: number }> = ({
  frame,
  centre,
  radius = 6,
  count = 4,
  size = 1.8,
  fade = 1,
}) => {
  if (fade <= 0) return null;
  return (
    <group position={[centre[0], centre[1] + (1 - fade) * 6, centre[2]]} scale={0.3 + 0.7 * fade} userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const w = 0.012 + i * 0.0025;
        const a = frame * w + (i * Math.PI * 2) / count;
        const r = radius * (0.55 + rand(i) * 0.5);
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const y = (rand(i + 4) - 0.5) * 3 + Math.sin(frame * 0.02 + i) * 0.4;
        const heading = -a; // flying counter-clockwise round the thermal
        const bank = 0.35 + Math.sin(frame * 0.07 + i * 2) * 0.14; // leaning into the turn, with the teeter
        return (
          <group key={i} position={[x, y, z]} rotation={[0, heading, 0]}>
            <group rotation={[0.05, 0, bank]}>
              <Vulture frame={frame} seed={i} span={size * (0.85 + rand(i + 9) * 0.3)} />
            </group>
          </group>
        );
      })}
    </group>
  );
};

