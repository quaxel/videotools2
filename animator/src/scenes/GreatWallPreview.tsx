import React from "react";
import { AbsoluteFill } from "remotion";
import {
  CameraShot,
  GreatWallSet,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  ShotList,
  SoundTrack,
  Stage,
  stroll,
  useShotFrame,
  wallLight,
} from "../engine";

// Five-second tour of GreatWallSet: two friends walking along the wall toward us at golden hour, chatting and
// pointing, then stopping to look at the wall snaking over the ridges.

const ELIF: PuppetLook = { skin: "#f6d2b0", hair: "#3a1f14", outfit: "#e8590c", pattern: "#ffd23f", long: true };
const CAN: PuppetLook = { skin: "#e0a878", hair: "#1d1a1a", outfit: "#4f7dff", pattern: "#e8ecf4", cap: "#d62828" };

const BG = moodBackground("golden");

// Both walk side by side from z0 to z1 between frames a and b (shot frames).
const pair = (f: number, a: number, b: number, z0: number, z1: number, elif: Partial<PuppetPose>, can: Partial<PuppetPose>): PuppetPlacement[] => {
  const we = stroll(f, a, b - a, [-0.45, z0], [-0.45, z1]);
  const wc = stroll(f, a + 3, b - a, [0.45, z0 - 0.15], [0.45, z1 - 0.15]);
  return [
    { id: "elif", look: ELIF, pose: { expression: "excited", ...elif, ...we.pose } as PuppetPose, at: we.at },
    { id: "can", look: CAN, pose: { expression: "neutral", ...can, ...wc.pose } as PuppetPose, at: wc.at },
  ];
};

const Wide: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 50);
  const camera: CameraShot = { position: lerp3([-1.0, 2.5, 8.6], [0.8, 2.3, 7.8], p), target: lerp3([-0.4, 1.6, -10], [0.3, 1.6, -10], p), fov: 44 };
  return <Stage set={<GreatWallSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={pair(f, -10, 70, -3.6, -1.0, {}, { lookX: -0.4 })} light={wallLight()} />;
};

const Walk: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 50);
  // Backing away in front of them as they walk.
  const camera: CameraShot = { position: lerp3([0.25, 1.25, 3.4], [0.05, 1.2, 4.6], p), target: lerp3([0.05, 1.0, -2.0], [0.0, 1.0, -0.8], p), fov: 38 };
  return (
    <Stage
      set={<GreatWallSet camera={camera} frame={f + 50} />}
      camera={camera}
      bg={BG}
      puppets={pair(f, -10, 55, -1.4, 0.9, { expression: "excited", headTilt: -6, lookX: 0.5 }, { expression: "excited", armR: [150, -20], lookX: -0.3 })}
      light={wallLight()}
    />
  );
};

const View: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 50);
  // Behind them, looking out to the left over the ranges, trucking sideways so the layers slide apart.
  const camera: CameraShot = { position: lerp3([1.15, 1.8, 4.8], [0.55, 1.85, 4.5], p), target: lerp3([-5.0, -2.2, -18], [-6.0, -2.2, -18], p), fov: 44 };
  const cast: PuppetPlacement[] = [
    { id: "elif", look: ELIF, pose: { expression: "neutral", view: "back", headTilt: -5 }, at: [-0.6, 1.25] },
    { id: "can", look: CAN, pose: { expression: "neutral", view: "back", armL: [40, -60] }, at: [0.15, 1.4] },
  ];
  return <Stage set={<GreatWallSet camera={camera} frame={f + 100} />} camera={camera} bg={BG} puppets={cast} light={wallLight()} energy={0.3} />;
};

const SHOTS: Shot[] = [
  [0, 50, Wide, false],
  [50, 100, Walk, false],
  [100, 150, View, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.3, until: 150 },
  { at: 96, src: sfx("whoosh"), volume: 0.45 },
];
const MUSIC: MusicCue[] = [{ src: MUSIC_FILES.upbeat, from: 0, to: 150, volume: 0.4 }];

export const GreatWallPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={150} />
  </AbsoluteFill>
);
