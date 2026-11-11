import React from "react";
import { AbsoluteFill } from "remotion";
import { CameraShot, ease, lerp3, moodBackground, ramp, Shot, ShotList, Stage, useShotFrame } from "../engine";
import { labLight, TruthLabSet } from "../videos/what-if-moon-jump/TruthLabSet";
import { PackShopSet, shopLight } from "../videos/what-if-moon-jump/PackShopSet";

// Preview of the what-if-moon-jump pivot sets: frames 0-119 the truth lab (the scale's needle drops from EARTH to
// 1/6, then the pack on the post tips over and lands), frames 120-239 the pack shop (the shell cracks, then the air
// rushes out, the O2 gauge drops and the warning light flashes).

const Lab: React.FC = () => {
  const f = useShotFrame();
  const p = ease(f, 0, 119);
  const camera: CameraShot = { position: lerp3([-0.05, 1.15, 3.4], [0.06, 1.13, 3.3], p), target: lerp3([-0.05, 0.82, 0], [0.06, 0.8, 0], p), fov: 40 };
  return (
    <Stage
      set={<TruthLabSet camera={camera} frame={f} needle={ramp(f, 5, 55)} tip={ramp(f, 60, 108)} />}
      camera={camera}
      bg={moodBackground("cold")}
      light={labLight(f)}
    />
  );
};

const Shop: React.FC = () => {
  const s = useShotFrame();
  const f = s + 120;
  const p = ease(s, 0, 119);
  const leak = ramp(f, 180, 230);
  const camera: CameraShot = { position: lerp3([0.3, 1.1, 2.2], [0.27, 1.09, 2.12], p), target: [0, 0.95, 0], fov: 38 };
  return (
    <Stage
      set={<PackShopSet camera={camera} frame={f} crack={ramp(f, 135, 175)} leak={leak} />}
      camera={camera}
      bg={moodBackground("warm")}
      light={shopLight(f, leak)}
    />
  );
};

const SHOTS: Shot[] = [
  [0, 120, Lab, false],
  [120, 240, Shop, false],
];

export const MJLabPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
