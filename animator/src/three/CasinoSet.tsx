import React, { useMemo } from "react";
import * as THREE from "three";
import { InkCylinder, toonRamp } from "./toon";
import { makeCarpetTexture } from "./textures";
import { HIP_HEIGHT } from "../puppet/PuppetBillboard";
import { reelAngleFor, SlotMachine } from "./SlotMachine";

type Vec3 = [number, number, number];

// The camera rig lives in the engine; re-exported here for the sets that import it from this file.
export { CameraRig } from "../engine/stage";
export type { CameraShot } from "../engine/stage";
import { CameraRig, CameraShot } from "../engine/stage";

const Stool: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <InkCylinder radius={0.22} height={0.03} position={[0, 0.015, 0]} color="#9aa0a6" />
    <InkCylinder radius={0.03} height={HIP_HEIGHT - 0.1} position={[0, (HIP_HEIGHT - 0.1) / 2, 0]} color="#c9ced3" ink={0.01} />
    <InkCylinder radius={0.2} height={0.1} position={[0, HIP_HEIGHT - 0.05, 0]} color="#d11f2f" />
  </group>
);

// Stools sit to the left of each machine at the puppets' hip height.
export const seatOf = (machineX: number): [number, number] => [machineX - 0.32, 0.92];

// Neighbour machines rest on fixed, non-winning reel positions.
const IDLE: [number, number, number][] = [
  [reelAngleFor(2), reelAngleFor(4), reelAngleFor(10)],
  [reelAngleFor(8), reelAngleFor(1), reelAngleFor(6)],
  [reelAngleFor(4), reelAngleFor(0), reelAngleFor(2)],
  [reelAngleFor(10), reelAngleFor(6), reelAngleFor(8)],
];

export const CasinoSet: React.FC<{
  frame: number;
  camera: CameraShot;
  heroReels: [number, number, number];
  // The machine one to the right (x = 1.15), where the player moves next.
  nextReels?: [number, number, number];
  nextCredits?: number;
  nextBill?: number;
  heroShake?: number;
  nextDoor?: number;
  nextKey?: number;
  night?: boolean; // after hours: cold, dim light instead of the warm casino glow
}> = ({ frame, camera, heroReels, nextReels = IDLE[1], nextCredits = 0, nextBill, heroShake, nextDoor, nextKey, night = false }) => {
  const carpet = useMemo(makeCarpetTexture, []);
  const bokeh = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: -6 + (i * 0.47) % 12,
        y: 2.3 + ((i * 7) % 5) * 0.22,
        c: ["#ffb347", "#ff6f61", "#ffd23f", "#f9e79f"][i % 4],
      })),
    [],
  );

  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[night ? "#070b1c" : "#1c0a0f"]} />
      <fog attach="fog" args={[night ? "#070b1c" : "#1c0a0f", 3, night ? 8 : 11]} />
      <ambientLight intensity={night ? 0.9 : 1.5} color={night ? "#8fa8ff" : "#ffe2c4"} />
      <directionalLight
        position={[-2, 4, 5]}
        intensity={night ? 1.4 : 2.6}
        color={night ? "#b9c8ff" : "#fff1dc"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <pointLight position={[0, 2.6, 1.6]} intensity={night ? 4 : 6} distance={6} color={night ? "#5a7dff" : "#ffb070"} />

      {/* Floor and back wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshToonMaterial map={carpet} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 3, -3.2]}>
        <planeGeometry args={[30, 6]} />
        <meshToonMaterial color="#3a1219" gradientMap={toonRamp} />
      </mesh>
      {bokeh.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, -3.1]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color={b.c} toneMapped={false} />
        </mesh>
      ))}

      {/* Front row: hero machine in the middle */}
      <SlotMachine frame={frame} reels={heroReels} shake={heroShake} />
      <SlotMachine frame={frame + 2} position={[-1.15, 0, 0]} reels={IDLE[0]} sign="GOLD RUSH" />
      <SlotMachine frame={frame + 5} position={[1.15, 0, 0]} reels={nextReels} credits={nextCredits} bill={nextBill} door={nextDoor} keyTurn={nextKey} />
      <SlotMachine frame={frame + 1} position={[-2.3, 0, 0]} reels={IDLE[2]} />
      <SlotMachine frame={frame + 3} position={[2.3, 0, 0]} reels={IDLE[3]} sign="GOLD RUSH" />
      {[-2.3, -1.15, 0, 1.15, 2.3].map((mx) => (
        <Stool key={mx} x={seatOf(mx)[0]} z={seatOf(mx)[1]} />
      ))}

      {/* Back row facing the camera, deeper in the fog */}
      {[-2.9, -1.75, -0.6, 0.55, 1.7, 2.85].map((x, i) => (
        <SlotMachine key={x} frame={frame + i} position={[x, 0, -2.2]} reels={IDLE[i % 4]} sign={i % 2 ? "LUCKY 7s" : "GOLD RUSH"} />
      ))}
    </>
  );
};
