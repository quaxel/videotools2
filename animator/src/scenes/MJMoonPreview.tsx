import React from "react";
import { AbsoluteFill } from "remotion";
import { CameraShot, pup, PuppetLook, Shot, ShotList, Stage, useShotFrame } from "../engine";
import { MOON_BG, MoonDust, MoonMode, MoonSet, moonLight } from "../videos/what-if-moon-jump/MoonSet";

const SUIT: PuppetLook = { skin: "#f0c8a8", hair: "#2a1e16", outfit: "#f1eee7", pants: "#f1eee7", shoes: "#e8e4dc", sleeves: "#f1eee7", gloves: "#ece8e0", bulk: 3.2, space: {} };
const CDR: PuppetLook = { ...SUIT, skin: "#e8b898", space: { stripe: "#c8302c" } };

const view = (mode: MoonMode, camera: CameraShot, air: number, lie = 0) => () => {
  const f = useShotFrame();
  return (
    <Stage
      set={<MoonSet camera={camera} frame={f} mode={mode}><MoonDust at={[0, 0, 0]} frame={f} seed={3} /></MoonSet>}
      camera={camera}
      bg={MOON_BG[mode]}
      blur={2}
      light={moonLight(mode)}
      puppets={[
        pup("duke", SUIT, [0, 0], { view: lie ? "side" : "front", facing: 1, expression: "shocked", air, lie }),
        pup("young", CDR, [1.3, 0.5], { view: "front", expression: "happy" }),
      ]}
    />
  );
};

const HOOK: CameraShot = { position: [0.5, 1.0, 4.2], target: [0.1, 1.2, -0.5], fov: 40 };
const SHOTS: Shot[] = [
  [0, 10, view("golden", HOOK, 500), false],
  [10, 20, view("earth", { position: [0.6, 0.6, 4.4], target: [0.3, 1.6, -1], fov: 42 }, 120), false],
  [20, 30, view("shadow", { position: [-2.6, 1.0, 3.2], target: [0.2, 0.7, 0], fov: 40 }, 300, 0.4), false],
  [30, 40, view("golden", { position: [-0.6, 1.6, 2.2], target: [-2.1, 1.9, -5.2], fov: 40 }, 0), false],
];
export const MJMoonPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
