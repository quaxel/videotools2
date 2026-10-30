import React, { useMemo } from "react";
import * as THREE from "three";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { makeBillTexture, makeDisplayTexture, makeReelTexture, makeSignTexture, STOPS } from "./textures";

type Vec3 = [number, number, number];

const STEP = (Math.PI * 2) / STOPS.length;

// Reel rotation that puts `stop` on the payline. `offset` in stops: +1 leaves the
// symbol one click above the line ("one click short").
export const reelAngleFor = (stop: number, offset = 0) => -STEP * (stop + 0.5) - STEP * offset;

// A stick-figure arm segment between two points, in the puppets' ink colour.
const InkLimb: React.FC<{ from: Vec3; to: Vec3 }> = ({ from, to }) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[0.009, 0.009, dir.length(), 12]} />
      <meshBasicMaterial color="#161212" />
    </mesh>
  );
};

const Reel: React.FC<{ x: number; angle: number; texture: THREE.Texture }> = ({ x, angle, texture }) => (
  <group position={[x, 1.2, 0.04]} rotation={[angle, 0, 0]}>
    <mesh rotation={[0, 0, -Math.PI / 2]}>
      <cylinderGeometry args={[0.3, 0.3, 0.2, 64]} />
      <meshToonMaterial map={texture} gradientMap={toonRamp} />
    </mesh>
  </group>
);

export const SlotMachine: React.FC<{
  position?: Vec3;
  rotationY?: number;
  reels: [number, number, number];
  sign?: string;
  frame: number;
  credits?: number;
  bill?: number; // 0 = bill held out in front of the slot, 1 = fully swallowed
  door?: number; // service door: undefined = not drawn, 0 = locked shut, 1 = swung open
  keyTurn?: number; // undefined = no key; 0..1 = key in the lock, turning
  shake?: number; // 0..1 jolt after the player smacks it
}> = ({ position = [0, 0, 0], rotationY = 0, reels, sign = "LUCKY 7s", frame, credits = 0, bill, door, keyTurn, shake = 0 }) => {
  const reelTexture = useMemo(makeReelTexture, []);
  const signTexture = useMemo(() => makeSignTexture(sign), [sign]);
  const creditTexture = useMemo(() => makeDisplayTexture("CREDITS", String(credits)), [credits]);
  const billTexture = useMemo(makeBillTexture, []);
  const bulbs = useMemo(() => {
    const out: Vec3[] = [];
    for (let i = 0; i <= 12; i++) out.push([-0.5 + i / 12, 2.13, 0.26]);
    for (let i = 1; i < 5; i++) out.push([-0.5, 2.13 - i * 0.1, 0.26], [0.5, 2.13 - i * 0.1, 0.26]);
    return out;
  }, []);

  return (
    <group
      position={[position[0] + Math.sin(frame * 2.7) * 0.02 * shake, position[1], position[2]]}
      rotation={[0, rotationY, Math.sin(frame * 3.1) * 0.02 * shake]}
    >
      {/* Service door over the lower cabinet, hinged on its left edge */}
      {door !== undefined && (
      <group position={[-0.5, 0.475, 0.46]} rotation={[0, -door * 1.9, 0]}>
        <InkBox size={[1.0, 0.86, 0.03]} position={[0.5, -0.02, 0]} color="#b00d27" />
        <InkCylinder radius={0.025} height={0.03} position={[0.88, 0.02, 0.02]} rotation={[Math.PI / 2, 0, 0]} color="#e8b04a" ink={0.006} />
        {keyTurn !== undefined && (
          <group position={[0.88, 0.02, 0.05]} rotation={[0, 0, (-keyTurn * Math.PI) / 2]}>
            <InkBox size={[0.012, 0.05, 0.05]} position={[0, 0, 0]} color="#ffcc33" ink={0.004} />
            <InkBox size={[0.07, 0.06, 0.012]} position={[0, 0, 0.04]} color="#ffcc33" ink={0.004} />
          </group>
        )}
      </group>
      )}
      {/* Cabinet */}
      <InkBox size={[1.0, 0.95, 0.7]} position={[0, 0.475, 0]} color="#c8102e" />
      <InkBox size={[0.14, 0.5, 0.7]} position={[-0.43, 1.2, 0]} color="#c8102e" />
      <InkBox size={[0.14, 0.5, 0.7]} position={[0.43, 1.2, 0]} color="#c8102e" />
      <InkBox size={[1.0, 0.2, 0.7]} position={[0, 1.55, 0]} color="#c8102e" />
      <InkBox size={[0.72, 0.5, 0.05]} position={[0, 1.2, -0.3]} color="#2b1810" ink={0} />
      {/* Dark lining hides the red underside of the cabinet seen from low angles */}
      <InkBox size={[0.73, 0.04, 0.66]} position={[0, 1.465, 0]} color="#2b1810" ink={0} />

      {/* Reels and the window around them */}
      {reels.map((a, i) => (
        <Reel key={i} x={(i - 1) * 0.24} angle={a} texture={reelTexture} />
      ))}
      <InkBox size={[0.8, 0.035, 0.04]} position={[0, 1.462, 0.36]} color="#e8b04a" ink={0.008} />
      <InkBox size={[0.8, 0.035, 0.04]} position={[0, 0.938, 0.36]} color="#e8b04a" ink={0.008} />
      <InkBox size={[0.035, 0.56, 0.04]} position={[-0.383, 1.2, 0.36]} color="#e8b04a" ink={0.008} />
      <InkBox size={[0.035, 0.56, 0.04]} position={[0.383, 1.2, 0.36]} color="#e8b04a" ink={0.008} />
      <InkBox size={[0.74, 0.012, 0.01]} position={[0, 1.2, 0.35]} color="#ff2a2a" emissive="#c00000" ink={0} />

      {/* Button deck */}
      <InkBox size={[1.0, 0.07, 0.3]} position={[0, 0.96, 0.46]} rotation={[0.22, 0, 0]} color="#3a1a1a" />
      <InkCylinder radius={0.06} height={0.04} position={[0.28, 1.0, 0.48]} rotation={[0.22, 0, 0]} color="#ff3b30" emissive="#5a0000" />
      <InkBox size={[0.14, 0.03, 0.08]} position={[-0.26, 0.995, 0.47]} rotation={[0.22, 0, 0]} color="#ffcc33" ink={0.008} />
      <InkBox size={[0.14, 0.03, 0.08]} position={[-0.06, 0.995, 0.47]} rotation={[0.22, 0, 0]} color="#ff9f1c" ink={0.008} />

      {/* Credit meter and bill acceptor on the lower cabinet */}
      <mesh position={[-0.12, 0.78, 0.352]}>
        <planeGeometry args={[0.5, 0.14]} />
        <meshBasicMaterial map={creditTexture} toneMapped={false} />
      </mesh>
      <InkBox size={[0.22, 0.2, 0.12]} position={[0.32, 0.6, 0.39]} color="#1e1a1a" />
      <InkBox size={[0.17, 0.014, 0.01]} position={[0.32, 0.66, 0.452]} color="#39ff7a" emissive="#1aa84a" ink={0} />
      {bill !== undefined && bill < 1 && (
        <mesh position={[0.32, 0.662, 0.62 - bill * 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.16, 0.07]} />
          <meshBasicMaterial map={billTexture} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* A cartoon hand pinches the bill's back edge and lets go near the slot */}
      {bill !== undefined && bill < 0.8 && (
        <group>
          <InkLimb from={[0.36, 0.662, 0.665 - bill * 0.24]} to={[0.62, 0.42, 1.25]} />
          <mesh position={[0.36, 0.662, 0.665 - bill * 0.24]}>
            <sphereGeometry args={[0.028, 20, 20]} />
            <meshBasicMaterial color="#161212" />
          </mesh>
        </group>
      )}

      {/* Top sign with chasing bulbs */}
      <InkBox size={[1.04, 0.46, 0.5]} position={[0, 1.9, 0]} color="#8f0d15" />
      <mesh position={[0, 1.9, 0.252]}>
        <planeGeometry args={[0.96, 0.394]} />
        <meshBasicMaterial map={signTexture} toneMapped={false} />
      </mesh>
      {bulbs.map((p, i) => {
        const on = (i + Math.floor(frame / 4)) % 3 !== 0;
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshBasicMaterial color={on ? "#fff3b0" : "#7a5a20"} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};
