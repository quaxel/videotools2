import React from "react";
import { AbsoluteFill } from "remotion";
import {
  Automobile,
  Burst,
  CameraShot,
  CAR,
  carSeat,
  drinkFrom,
  hammerSwing,
  handWorld,
  moodBackground,
  pianoPlay,
  PUPPET_HEIGHT,
  PuppetLook,
  RoadSet,
  Shot,
  ShotList,
  Stage,
  steer,
  summerLight,
  useShotFrame,
} from "../engine";
import { PIANO_KEYS, PIANO_SEAT, SaloonSet, saloonLight } from "../videos/olcu/props";
import { ANVIL, ANVIL_TOP, FORGE_BG, ForgeSet, forgeLight, Hammer, SMITH_AT } from "../videos/endless-feast/sets";

// The tool motions of puppet/tools.ts in real 3D sets, with the post look: a pianist in the saloon, a smith at the
// anvil, a driver steering with a passenger drinking, a man drinking a glass of water at the bar. 60 frames each.

export const TOOL_STAGE_FRAMES = 240;
const U = 1060 / PUPPET_HEIGHT; // puppet units per metre

const PIANIST: PuppetLook = { skin: "#f0c8a0", hair: "#3a2414", outfit: "#f2ece0", vest: "#a02a2a", suspenders: "#2a2a2a", hat: "#3a2a1a", hatStyle: "bowler", beard: "#3a2414" };
const SMITH: PuppetLook = { skin: "#c8946a", hair: "#2a1e16", outfit: "#d8c8a8", apron: "#5a3a22", stubble: "#2a1e16", build: "broad", pants: "#3a3a40" };
const DRIVER: PuppetLook = { skin: "#e9b48a", hair: "#4a2e1e", outfit: "#5a6a4a", cap: "#3a3a3a", glasses: true };
const RIDER: PuppetLook = { skin: "#f2c9a4", hair: "#b5562a", outfit: "#e8b923", pattern: "#fff6b0", long: true };
const DRINKER: PuppetLook = { skin: "#d9a07a", hair: "#2a2018", outfit: "#3d7fc4", pattern: "#bfe0ff", pants: "#2a2a34" };

const Piano: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [-1.0 - f * 0.004, 1.2, 1.5 - f * 0.006], target: [-2.55, 0.75, -1.0], fov: 40 };
  return (
    <Stage
      set={<SaloonSet camera={camera} />}
      camera={camera}
      bg="#2a140c"
      light={saloonLight()}
      puppets={[{ id: "pianist", look: PIANIST, at: PIANO_SEAT, pose: { expression: "happy", sit: true, view: "side", facing: -1, ...pianoPlay(f, { keys: PIANO_KEYS, view: "side", facing: -1, energy: 1.2 }) } }]}
    />
  );
};

const BLOWS = [14, 30, 46];
const Forge: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [0.45 + f * 0.003, 1.45, 3.1], target: [0.6, 0.85, -0.2], fov: 40 };
  const strike: [number, number] = [(ANVIL[0] - 0.05 - SMITH_AT[0]) * U, -(ANVIL_TOP + 0.03) * U];
  const swing = hammerSwing(f, { blows: BLOWS, strike, hand: "R", handle: 0.34 * U, view: "side", facing: -1, other: [strike[0] + 90, strike[1] - 20] });
  return (
    <Stage
      set={
        <ForgeSet camera={camera} frame={f}>
          <Hammer position={handWorld(SMITH_AT, swing.grip, camera)} rotation={[0, 0, swing.roll]} />
          {BLOWS.map((b, i) => (
            <Burst key={b} kind="sparks" at={[ANVIL[0] - 0.05, ANVIL_TOP + 0.06, ANVIL[2] + 0.04]} frame={f - b} count={12} size={0.5} seed={i + 1} />
          ))}
        </ForgeSet>
      }
      camera={camera}
      bg={FORGE_BG}
      light={forgeLight(f)}
      blur={4}
      puppets={[{ id: "smith", look: SMITH, at: SMITH_AT, pose: { expression: "determined", view: "side", facing: -1, ...swing.pose } }]}
    />
  );
};

const Car: React.FC = () => {
  const f = useShotFrame();
  const z = f * 0.06;
  const camera: CameraShot = { position: [1.2, 1.45, z + 2.6], target: [0, 0.95, z + 0.2], fov: 40 };
  const d = carSeat([0, z], 0, [-0.26, CAR.front[1]]);
  const p = carSeat([0, z], 0, [0.26, CAR.front[1]]);
  const wheel = steer(f, { wheel: [0, -1.04 * U + d.air], r: 0.15 * U, flat: 0.65, turn: 0.35 * Math.sin(f / 14) });
  const drink = drinkFrom(f, { start: 4, sip: 34 });
  return (
    <Stage
      set={
        <RoadSet camera={camera} frame={f}>
          <Automobile position={[0, 0, z]} roll={z} frame={f} steer={wheel.wheelAngle} />
        </RoadSet>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      light={summerLight()}
      puppets={[
        { id: "driver", look: DRIVER, at: d.at, pose: { expression: "determined", sit: true, air: d.air, ...wheel.pose } },
        { id: "rider", look: RIDER, at: p.at, pose: { expression: "happy", sit: true, air: p.air, ...drink.pose } },
      ]}
    />
  );
};

const Drink: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [0.6 + f * 0.003, 1.15, 2.5], target: [0.1, 0.85, 0], fov: 38 };
  const drink = drinkFrom(f, { start: 6, sip: 36, view: "side", facing: 1 });
  return (
    <Stage
      set={<SaloonSet camera={camera} />}
      camera={camera}
      bg="#2a140c"
      light={saloonLight()}
      puppets={[{ id: "drinker", look: DRINKER, at: [0, 0], pose: { expression: "happy", view: "side", facing: 1, ...drink.pose } }]}
    />
  );
};

const SHOTS: Shot[] = [
  [0, 60, Piano, false],
  [60, 120, Forge, false],
  [120, 180, Car, false],
  [180, 240, Drink, false],
];

export const ToolStage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
