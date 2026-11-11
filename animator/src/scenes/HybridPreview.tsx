import React from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import { CameraShot, handWorld, Shot, ShotList, Stage, useShotFrame } from "../engine";
import { PuppetLook, PuppetPose } from "../puppet/Puppet";
import { PIANO_SEAT, SaloonSet, saloonLight } from "../videos/olcu/props";

// The default puppet: 2D card head and body, 3D arms and legs; here the hands reach world points (pose.worldR /
// worldL). Two shots, the camera swinging round each: a man drinking a glass of water, and the pianist playing the
// real keys of the saloon piano.

export const HYBRID_FRAMES = 150;
const DRINKER: PuppetLook = { skin: "#d9a07a", hair: "#2a2018", outfit: "#3d7fc4", pattern: "#bfe0ff", pants: "#2a2a34" };
const PIANIST: PuppetLook = { skin: "#f0c8a0", hair: "#3a2414", outfit: "#f2ece0", vest: "#a02a2a", suspenders: "#2a2a2a", hat: "#3a2a1a", hatStyle: "bowler", beard: "#3a2414" };
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

const Glass: React.FC<{ at: THREE.Vector3; yaw: number; tilt: number; fill: number }> = ({ at, yaw, tilt, fill }) => {
  const H = 0.12;
  const f = Math.max(0.02, fill);
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <group rotation={[tilt, 0, 0]}>
        <mesh position={[0, -H / 2 + (H * f) / 2, 0]}>
          <cylinderGeometry args={[0.033, 0.029, H * f, 20]} />
          <meshBasicMaterial color="#5ab8e8" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.037, 0.031, H, 24, 1, true]} />
          <meshBasicMaterial color="#dff3fb" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.04, 0.034, H + 0.004, 24, 1, true]} />
          <meshBasicMaterial color="#161212" side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  );
};

const Drink: React.FC = () => {
  const f = useShotFrame();
  const a = -0.9 + 1.8 * smooth(f / 75);
  const AT: [number, number] = [0, 1.0];
  const camera: CameraShot = { position: [Math.sin(a) * 2.2, 1.15, AT[1] + Math.cos(a) * 2.2], target: [0, 0.68, AT[1]], fov: 40 };
  const t = f - 6;
  const up = t < 14 ? smooth(t / 14) : t < 54 ? 1 : 1 - smooth((t - 54) / 14);
  const drink = smooth((t - 14) / 40);
  const base: PuppetPose = { expression: up > 0.5 ? "happy" : "neutral", headTilt: 0, face: up > 0.5 ? { lid: 0.6 } : undefined, frontR: true, handR: "fist" };
  // where the lips are on the card right now (the card turns to the camera), and the way to the camera
  const lips = new THREE.Vector3(...handWorld(AT, [14, -690], camera));
  const toCam = new THREE.Vector3(camera.position[0] - AT[0], 0, camera.position[2] - AT[1]).normalize();
  const yaw = Math.atan2(toCam.x, toCam.z);
  const tilt = -(0.35 + 0.95 * drink) * up;
  // the glass centre: in front of the lips, its rim at the lips
  const atLips = lips.clone().add(toCam.clone().multiplyScalar(0.05 + 0.05 * Math.sin(-tilt))).add(new THREE.Vector3(0, -0.055 * Math.cos(tilt), 0));
  const rest = new THREE.Vector3(...handWorld(AT, [170, -400], camera)).add(toCam.clone().multiplyScalar(0.06));
  const glass = rest.clone().lerp(atLips, up);
  return (
    <Stage
      set={
        <SaloonSet camera={camera}>
          <Glass at={glass} yaw={yaw} tilt={tilt} fill={0.85 - 0.7 * drink} />
        </SaloonSet>
      }
      camera={camera}
      bg="#2a140c"
      light={saloonLight()}
      puppets={[{ id: "drinker", look: DRINKER, at: AT, pose: { ...base, worldR: [glass.x, glass.y - 0.005, glass.z] } }]}
    />
  );
};

// Keys: the saloon upright's keyboard runs along z at x -2.68 (front edge), 0.56 m up, centred on z -1.0.
const Piano: React.FC = () => {
  const f = useShotFrame();
  const a = 0.2 + 0.9 * smooth(f / 75);
  const camera: CameraShot = { position: [-2.3 + Math.sin(a) * 1.9, 1.15, -1.0 + Math.cos(a) * 1.9], target: [-2.5, 0.7, -1.0], fov: 40 };
  const key = (k: number, side: number): [number, number, number] => {
    const period = 6 + k * 1.3;
    const c = ((f + k * 3) / period) % 1;
    const lift = (c < 0.2 ? 1 - c / 0.2 : smooth((c - 0.2) / 0.8)) * 0.05;
    const z = -1.0 + side * 0.13 + Math.sin(f / (17 + k * 5) + k) * 0.07;
    return [-2.66, 0.585 + lift, z];
  };
  // profile: worldR moves the near hand (toward the camera, +z), worldL the far one
  const pose: PuppetPose = { expression: "happy", sit: true, view: "side", facing: -1, headTilt: 5 * Math.sin(f / 7), handL: "open", handR: "open", worldR: key(2, 1), worldL: key(1, -1) };
  return (
    <Stage
      set={<SaloonSet camera={camera} />}
      camera={camera}
      bg="#2a140c"
      light={saloonLight()}
      puppets={[{ id: "pianist", look: PIANIST, at: PIANO_SEAT, pose }]}
    />
  );
};

const SHOTS: Shot[] = [
  [0, 75, Drink, false],
  [75, 150, Piano, false],
];

export const HybridPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
