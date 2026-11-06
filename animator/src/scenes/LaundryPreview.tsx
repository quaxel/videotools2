import React from "react";
import { useCurrentFrame } from "remotion";
import { BlenderModel, CameraShot, InkBox, InkCylinder, lerp3, moodBackground, Plant, ramp, Room, Stage, Window } from "../engine";
import { easeOut } from "../engine/motion";

// A washing machine (sand3d, guide/sand3d/washer.py → public/models/preview/washer.glb) against the back wall of a
// tiled laundry room. The soap drawer slides shut, the dial turns, the drum spins up with the laundry tumbling and
// the machine shaking on its feet, spins down, and the door swings open. The camera pushes in on the porthole.
export const LAUNDRY_FRAMES = 180;

const DEPTH = 4; // back wall at z = -2
const AT: [number, number, number] = [0, 0, -DEPTH / 2 + 0.32];

// Drum speed in degrees a frame: up from 40, flat out 70-115, down to rest at 140. Its angle is the running sum.
const drumSpeed = (f: number) => 22 * Math.min(ramp(f, 40, 70), 1 - ramp(f, 115, 140));
const drumAngle = (f: number) => {
  let a = 0;
  for (let i = 0; i < f; i++) a += drumSpeed(i);
  return -a;
};

export const LaundryPreview: React.FC = () => {
  const f = useCurrentFrame();
  const speed = drumSpeed(f) / 22;
  const shake = speed * speed * 0.006; // the machine walks a little when the drum is flat out
  const position: [number, number, number] = [AT[0] + Math.sin(f * 2.1) * shake, AT[1], AT[2] + Math.sin(f * 1.7 + 1) * shake * 0.6];
  const push = easeOut(ramp(f, 0, 150));
  const camera: CameraShot = {
    position: lerp3([0.75, 1.25, 0.7], [0.15, 0.95, 0.05], push),
    target: lerp3([0, 0.55, AT[2]], [-0.08, 0.45, AT[2]], push),
    fov: 44,
  };
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#e4ddd0" wall="#cfe7ee" wallPattern="tile" floorPattern="tile" width={5} depth={DEPTH}>
          <BlenderModel
            src="models/preview/washer.glb"
            position={position}
            rotation={[0, Math.sin(f * 2.5) * shake * 2, 0]}
            joints={{
              drawer_slide: 0.15 * (1 - easeOut(ramp(f, 4, 18))),
              dial_turn: -110 * easeOut(ramp(f, 22, 36)),
              drum_spin: drumAngle(f),
              door_hinge: 105 * easeOut(ramp(f, 145, 172)),
            }}
          />
          {/* A laundry basket beside it, a window above, a plant in the corner. */}
          <group position={[0.68, 0, AT[2] + 0.3]}>
            <InkCylinder radius={0.22} height={0.34} position={[0, 0.17, 0]} color="#f2b630" />
            <InkBox size={[0.3, 0.08, 0.26]} position={[0, 0.36, 0]} rotation={[0, 0.3, 0.15]} color="#e04646" />
            <InkBox size={[0.24, 0.06, 0.22]} position={[0.04, 0.41, -0.02]} rotation={[0, -0.4, -0.1]} color="#4f7dff" />
          </group>
          <Window position={[0.15, 1.65, -DEPTH / 2 + 0.04]} size={[0.9, 0.7]} />
          <InkBox size={[1.2, 0.04, 0.24]} position={[-0.9, 1.25, -DEPTH / 2 + 0.12]} color="#ffffff" />
          <InkBox size={[0.16, 0.24, 0.12]} position={[-1.2, 1.39, -DEPTH / 2 + 0.12]} color="#2a9d8f" />
          <InkBox size={[0.14, 0.2, 0.12]} position={[-0.98, 1.37, -DEPTH / 2 + 0.12]} color="#9b5de5" />
          <Plant position={[-1.1, 0, AT[2] + 0.15]} scale={0.9} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      energy={0}
    />
  );
};
