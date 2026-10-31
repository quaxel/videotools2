import React from "react";
import { AbsoluteFill } from "remotion";
import { Automobile, CameraShot, carSeat, CAR, DustTrail, moodBackground, RoadSet, Shot, ShotList, Stage, StadiumSet, summerLight, useShotFrame } from "../engine";
import { DRIVER, FAN_M, FAN_W, HICKS, LORZ, OFFICIAL, TRAINER_A, TRAINER_B } from "../videos/olympic-car/cast";

// Four looks at the 1904 marathon sets and cast: the road with the car, the car close, the finish, the board.
const BG = moodBackground("daylight");

const Road: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [1.2, 1.3, 6.5], target: [0, 1.0, -2], fov: 46 };
  const carZ = -6 + f * 0.05;
  return (
    <Stage
      set={
        <RoadSet camera={camera} frame={f}>
          <Automobile position={[0.55, 0, carZ]} roll={carZ} frame={f} />
          <DustTrail frame={f} path={(g) => [0.55, 0, -6 + g * 0.05 - 1.1]} />
        </RoadSet>
      }
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "sad" }, at: [-0.6, 2.2] }]}
      light={summerLight()}
    />
  );
};

const Car: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [2.4, 1.5, 3.2], target: [0, 0.8, 0], fov: 40 };
  const d = carSeat([0, 0], 0, [-0.26, CAR.front[1]]);
  const l = carSeat([0, 0], 0, [0.26, CAR.front[1]]);
  return (
    <Stage
      set={
        <RoadSet camera={camera} frame={f}>
          <Automobile position={[0, 0, 0]} frame={f} steam={0.8} />
        </RoadSet>
      }
      camera={camera}
      bg={BG}
      puppets={[
        { id: "driver", look: DRIVER, pose: { expression: "neutral", sit: true, air: d.air }, at: d.at },
        { id: "lorz", look: LORZ, pose: { expression: "smug", sit: true, air: l.air, gesture: "wave" }, at: l.at },
      ]}
      light={summerLight()}
    />
  );
};

const Finish: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [1.8, 1.2, 4.6], target: [0, 1.0, -0.5], fov: 46 };
  return (
    <Stage
      set={<StadiumSet camera={camera} frame={f} cheer={1} tape={0.6} />}
      camera={camera}
      bg={BG}
      puppets={[
        { id: "lorz", look: LORZ, pose: { expression: "excited", gesture: "cheer" }, at: [0.4, 0.2] },
        { id: "off", look: OFFICIAL, pose: { expression: "skeptical" }, at: [-1.2, 1.8] },
        { id: "fm", look: FAN_M, pose: { expression: "happy", gesture: "cheer" }, at: [2.3, -1.0] },
        { id: "fw", look: FAN_W, pose: { expression: "happy", gesture: "clap" }, at: [-2.2, -1.0] },
      ]}
      light={summerLight()}
    />
  );
};

const Board: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [0.4, 1.4, 4.4], target: [0.6, 1.0, 1.0], fov: 42 };
  return (
    <Stage
      set={<StadiumSet camera={camera} frame={f} dq={1} />}
      camera={camera}
      bg={BG}
      puppets={[
        { id: "hicks", look: HICKS, pose: { expression: "bored", slump: 1 }, at: [-0.3, 0.3] },
        { id: "ta", look: TRAINER_A, pose: { expression: "worried" }, at: [-0.85, 0.35] },
        { id: "tb", look: TRAINER_B, pose: { expression: "worried" }, at: [0.25, 0.35] },
      ]}
      light={summerLight()}
    />
  );
};

const SHOTS: Shot[] = [
  [0, 30, Road, false],
  [30, 60, Car, false],
  [60, 90, Finish, false],
  [90, 120, Board, false],
];

export const MarathonPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
