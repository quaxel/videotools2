import React from "react";
import { AbsoluteFill } from "remotion";
import { CameraShot, lerp3, PuppetLook, PuppetPlacement, ramp, Shot, ShotList, Stage, useShotFrame, wide } from "../engine";
import { CoffeeMug, HOUSTON, HOUSTON_CAM, HOUSTON_REVERSE, HoustonSet, houstonLight, MUG } from "../videos/what-if-moon-jump/HoustonSet";
import { MUNICH_CAM, MunichSet, munichLight } from "../videos/what-if-moon-jump/MunichSet";

// Preview of the what-if-moon-jump sets: Houston Mission Control (push-in on the two seated controllers while the TV
// plays the fall, then the reverse view over the console toward the TV wall), then the Munich high-jump fan at dusk
// (a sideways truck while the bar gets knocked onto the mat).

const LOOK: PuppetLook = { skin: "#e8c0a0", hair: "#3a2a1e", outfit: "#f4f2ec", pants: "#3a3a44" };

const controllers = (f: number): PuppetPlacement[] =>
  HOUSTON.seats.map(([x, z], i) => ({
    id: `ctl${i}`,
    look: LOOK,
    at: [x, z] as [number, number],
    pose: { sit: true, expression: f > 60 ? "shocked" : "neutral", lookX: i ? -0.4 : 0.4 },
  }));

const HoustonPush: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 80);
  const camera: CameraShot = {
    position: lerp3([HOUSTON_CAM.position[0], HOUSTON_CAM.position[1], HOUSTON_CAM.position[2] + 1.2], HOUSTON_CAM.position, p),
    target: HOUSTON_CAM.target,
    fov: HOUSTON_CAM.fov,
  };
  const tv = ramp(f, 5, 70);
  const tip = ramp(f, 50, 72);
  return (
    <Stage
      set={
        <HoustonSet camera={camera} frame={f} tv={tv}>
          <CoffeeMug position={MUG} tip={tip} frame={f} />
        </HoustonSet>
      }
      camera={camera}
      bg="#0b1416"
      puppets={controllers(f)}
      light={houstonLight(f)}
      blur={2}
    />
  );
};

const HoustonReverse: React.FC = () => {
  const f = useShotFrame() + 80;
  const p = ramp(f, 80, 120);
  const camera: CameraShot = {
    position: lerp3(HOUSTON_REVERSE.position, [0, 1.3, 2.0], p),
    target: HOUSTON_REVERSE.target,
    fov: HOUSTON_REVERSE.fov,
  };
  const tv = ramp(f, 80, 110);
  return (
    <Stage
      set={
        <HoustonSet camera={camera} frame={f} tv={tv}>
          <CoffeeMug position={MUG} tip={1} frame={f} />
        </HoustonSet>
      }
      camera={camera}
      bg="#0b1416"
      puppets={controllers(f).map((c) => ({ ...c, pose: { ...c.pose, view: "back" as const } }))}
      light={houstonLight(f)}
    />
  );
};

const Munich: React.FC = () => {
  const f = useShotFrame() + 120;
  const p = ramp(f, 120, 240);
  // Trucks right to left while easing in from a wide view (as scenes frame with `wide`) to the authored camera.
  const far = wide(MUNICH_CAM, 1.6);
  const camera: CameraShot = {
    position: lerp3([far.position[0] + 0.8, far.position[1], far.position[2]], [MUNICH_CAM.position[0] - 0.4, MUNICH_CAM.position[1], MUNICH_CAM.position[2]], p),
    target: lerp3([0.2, 1.1, 0], [-0.1, 1.0, 0], p),
    fov: MUNICH_CAM.fov,
  };
  const bar = ramp(f, 160, 215);
  const jumper: PuppetPlacement[] = [{ id: "jumper", look: LOOK, at: [0.35, 0.7], pose: { expression: "determined", lookX: -0.6 } }];
  return <Stage set={<MunichSet camera={camera} frame={f} bar={bar} />} camera={camera} bg="#e06a6e" puppets={jumper} light={munichLight(f)} blur={2} />;
};

const SHOTS: Shot[] = [
  [0, 80, HoustonPush, false],
  [80, 120, HoustonReverse, false],
  [120, 240, Munich, false],
];

export const MJHoustonPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
