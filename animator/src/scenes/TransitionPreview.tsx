import React from "react";
import { useVideoConfig } from "remotion";
import { CameraShot, FIRE, Foliage, frameSpot, lakeLight, LakeSet, lerp3, moodBackground, PuppetLook, PuppetPlacement, ramp, Shot, ShotList, Stage, useShotFrame } from "../engine";

// Check of the dissolve and dip transitions and foreground framing: a wide of the lake, the fireside fading in over
// it with a leafy clump in the bottom-right corner in front of the lens, then a dip through cream back to the wide.

const MAYA: PuppetLook = { skin: "#f6d2b0", hair: "#3a1f14", outfit: "#e0262f", pattern: "#ffd23f", long: true };
const BG = moodBackground("dusk");
const cast: PuppetPlacement[] = [{ id: "maya", look: MAYA, pose: { expression: "excited" }, at: [FIRE[0] - 0.45, FIRE[2] - 0.25] }];

const fireCam = (p: number): CameraShot => ({ position: lerp3([FIRE[0] + 0.6, 1.2, 4.6], [FIRE[0] - 0.4, 1.15, 4.2], p), target: [FIRE[0], 0.85, 0.6], fov: 38 });

const Wide: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([-1.6, 1.8, 8.6], [-0.2, 1.6, 7.6], ramp(f, 0, 60)), target: [-0.8, 1.2, -4], fov: 40 };
  return <Stage set={<LakeSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast} light={lakeLight(f)} />;
};

const Fireside: React.FC = () => {
  const f = useShotFrame();
  const { width, height } = useVideoConfig();
  const camera = fireCam(ramp(f, 0, 60));
  const leaf = frameSpot(fireCam(0), width / height, 0.75, -0.75, 1.8);
  return (
    <Stage
      set={<LakeSet camera={camera} frame={f + 60} />}
      camera={camera}
      bg={BG}
      puppets={cast}
      light={lakeLight(f + 60)}
      blur={2}
      foreground={<Foliage position={leaf} size={0.4} />}
    />
  );
};

const SHOTS: Shot[] = [
  [0, 60, Wide, false],
  [60, 120, Fireside, "dissolve"],
  [120, 180, Wide, "dip"],
];

export const TransitionPreview: React.FC = () => <ShotList shots={SHOTS} />;
