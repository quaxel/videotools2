import React from "react";
import { AbsoluteFill } from "remotion";
import {
  CameraShot,
  DOCK,
  FIRE,
  lakeLight,
  LakeSet,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  ramp,
  Sfx,
  sfx,
  Shot,
  ShotList,
  SoundTrack,
  Stage,
  useShotFrame,
} from "../engine";

// Five-second tour of LakeSet: wide establishing shot, two friends at the campfire, low angle from the dock.

const MAYA: PuppetLook = { skin: "#f6d2b0", hair: "#3a1f14", outfit: "#e0262f", pattern: "#ffd23f", long: true };
const DEV: PuppetLook = { skin: "#c98a5e", hair: "#1d1a1a", outfit: "#2a9d8f", cap: "#f4d35e" };

const BG = moodBackground("dusk");

const Wide: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 50);
  // Trucks left to right so the mountain layers slide apart.
  const camera: CameraShot = { position: lerp3([-1.6, 1.8, 8.6], [-0.2, 1.6, 7.6], p), target: lerp3([-1.2, 1.2, -4], [-0.5, 1.2, -4], p), fov: 40 };
  const cast: PuppetPlacement[] = [
    { id: "maya", look: MAYA, pose: { expression: "excited" }, at: [FIRE[0] - 0.45, FIRE[2] - 0.25] },
    { id: "dev", look: DEV, pose: { expression: "neutral" }, at: [FIRE[0] + 0.45, FIRE[2] - 0.25] },
  ];
  return <Stage set={<LakeSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast} light={lakeLight(f)} />;
};

const Fireside: React.FC = () => {
  const f = useShotFrame() + 50;
  const p = ramp(f, 50, 100);
  const camera: CameraShot = { position: lerp3([FIRE[0] + 0.35, 1.2, 5.0], [FIRE[0] - 0.35, 1.15, 4.6], p), target: lerp3([FIRE[0] + 0.1, 0.85, 0.6], [FIRE[0] - 0.1, 0.85, 0.6], p), fov: 38 };
  const cast: PuppetPlacement[] = [
    { id: "maya", look: MAYA, pose: { expression: "excited", armR: [120, -30], mouthOpen: 0.4 }, at: [FIRE[0] - 0.45, FIRE[2] - 0.25] },
    { id: "dev", look: DEV, pose: { expression: "smug", lookX: -0.6 }, at: [FIRE[0] + 0.45, FIRE[2] - 0.25] },
  ];
  return <Stage set={<LakeSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast} light={lakeLight(f)} />;
};

const DockLow: React.FC = () => {
  const f = useShotFrame() + 100;
  const p = ramp(f, 100, 150);
  const camera: CameraShot = { position: lerp3([DOCK.x + 0.5, 0.3, 0.9], [DOCK.x - 0.5, 0.35, 0.3], p), target: lerp3([DOCK.x + 0.2, 1.4, -6], [DOCK.x - 0.2, 1.4, -6], p), fov: 40 };
  const cast: PuppetPlacement[] = [{ id: "maya", look: MAYA, pose: { expression: "neutral", view: "back" }, at: [DOCK.x, DOCK.end + 0.6] }];
  return <Stage set={<LakeSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast} light={lakeLight(f)} />;
};

const SHOTS: Shot[] = [
  [0, 50, Wide, false],
  [50, 100, Fireside, false],
  [100, 150, DockLow, true],
];

// One still of the campfire shot for comparing puppet lighting: `lit` lights the puppets from the set's lights,
// otherwise they get the flat mood tint like every other video.
export const LakeLitStill: React.FC<{ lit: boolean }> = ({ lit }) => {
  const f = 75;
  const camera: CameraShot = { position: [FIRE[0], 1.15, 4.3], target: [FIRE[0], 0.85, 0.6], fov: 38 };
  const cast: PuppetPlacement[] = [
    { id: "maya", look: MAYA, pose: { expression: "excited", armR: [120, -30], mouthOpen: 0.4 }, at: [FIRE[0] - 0.45, FIRE[2] - 0.25] },
    { id: "dev", look: DEV, pose: { expression: "smug", lookX: -0.6 }, at: [FIRE[0] + 0.45, FIRE[2] - 0.25] },
  ];
  return <Stage set={<LakeSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast} energy={0} light={lit ? lakeLight(f) : undefined} />;
};

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.35, until: 150 },
  { at: 96, src: sfx("whoosh"), volume: 0.5 },
];
const MUSIC: MusicCue[] = [{ src: MUSIC_FILES.lounge, from: 0, to: 150, volume: 0.45 }];

export const LakePreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={150} />
  </AbsoluteFill>
);
