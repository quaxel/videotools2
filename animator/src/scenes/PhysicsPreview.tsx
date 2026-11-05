import React from "react";
import { AbsoluteFill } from "remotion";
import {
  Burst, CameraShot, impactCues, lerp3, moodBackground, PhysicsSim, ramp, SimImpact, Room, Sfx, Shot, ShotList, Shower, simImpacts, Simulation, SoundTrack,
  Stage, useShotFrame,
} from "../engine";
import SIM_JSON from "./physics-preview.json";

// Baked physics and particles together: a ball thrown into a crate pyramid with tin cans on top (Rapier, baked by
// scripts/physics.mjs from physics-preview.mjs). Every hard landing on the floor kicks up dust, the ball's hit pops
// stars, and confetti rains at the end.

const SIM = SIM_JSON as unknown as PhysicsSim;
const BG = moodBackground("warm");
// Hard landings on the floor (dust) and the ball's first hit (stars): the frames a scene also puts its sounds on.
const LANDINGS = simImpacts(SIM).filter((h) => h.other === "floor" && h.speed >= 2);
const HIT = simImpacts(SIM, "ball")[0] as SimImpact | undefined;

const Pyramid: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([0.9, 1.3, 5.4], [0.6, 1.15, 4.9], ramp(f, 0, 150)), target: [0.5, 0.5, 0], fov: 46 };
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#9a7550" wall="#d9c3a0" wallPattern="brick" floorPattern="concrete" width={8} depth={6}>
          <Simulation sim={SIM} frame={f} />
          {LANDINGS.map((h, i) => (
            <Burst key={i} kind="dust" at={[h.at[0], 0.02, h.at[2]]} frame={f - h.frame} seed={i + 1} size={0.5 + h.speed * 0.15} />
          ))}
          {HIT && <Burst kind="stars" at={HIT.at} frame={f - HIT.frame} />}
          {HIT && <Burst kind="sparks" at={HIT.at} frame={f - HIT.frame} count={24} seed={3} />}
          <Shower area={[-0.9, -0.8, 1.9, 1.2]} top={2.2} frame={f - 70} frames={50} />
        </Room>
      }
      camera={camera}
      bg={BG}
    />
  );
};

const SHOTS: Shot[] = [[0, 150, Pyramid, false]];

// Every hit at least 1.5 m/s gets a wooden knock, louder the faster it lands, a different take each time; the ball's
// first hit also jolts the camera. The cans are too light to knock.
const SFX: Sfx[] = impactCues(SIM, 0, (h) =>
  h.speed < 1.5 || h.body.startsWith("can") ? null : { name: "thud", volume: Math.min(0.9, 0.12 * h.speed), space: "room", hit: h === HIT ? 0.5 : undefined },
);

export const PhysicsPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={[]} captions={[]} total={150} />
  </AbsoluteFill>
);
