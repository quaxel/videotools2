import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import {
  CameraShot,
  lerp3,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  Sfx,
  sfx,
  Shot,
  ShotList,
  SoundTrack,
  Stage,
  useShotFrame,
} from "../engine";
import { BeachLaunchSet, dawnLight, DANGLE, PineForestSet } from "../three/BalloonSets";

// Two sample shots for the balloon-bomb Short: the launch at dawn on the Japanese coast (the hook's balloon rising)
// and the empty balloon hanging in an Oregon pine, its bomb dangling over the needles.

const SOLDIER = (hair: string, skin: string): PuppetLook => ({ skin, hair, outfit: "#8a7a4e" });
const BG_DAWN = "#3a4478";
const BG_FOREST = "#7fb3ea";

const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

const Launch: React.FC = () => {
  const f = useShotFrame();
  // The crew lets go; the balloon lifts slowly, then faster as it catches the breeze.
  const lift = interpolate(f, [0, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ringY = 1.0 + 8 * lift * lift;
  const p = ease(f, 0, 120);
  const camera: CameraShot = { position: lerp3([1.6, 0.55, 7.6], [0.6, 1.8, 13.5], p), target: lerp3([0, 3.6, 0], [0, 9.5, -1], p), fov: 52 - 2 * p };
  const cast: PuppetPlacement[] = [
    { id: "kenji", look: SOLDIER("#1a1614", "#e8c098"), pose: { expression: "excited", view: "back", armL: [150, -25], armR: [140, -30] }, at: [-1.1, 1.6] },
    { id: "taro", look: SOLDIER("#221a16", "#dcb088"), pose: { expression: "shocked", view: "side", facing: -1, armR: [120, -20] }, at: [1.25, 1.3] },
    { id: "hiro", look: SOLDIER("#161212", "#e4b890"), pose: { expression: "neutral", view: "back", armR: [150, -25] }, at: [0.15, 2.6] },
  ];
  return <Stage set={<BeachLaunchSet camera={camera} frame={f} balloon={ringY} />} camera={camera} bg={BG_DAWN} puppets={cast} light={dawnLight()} />;
};

const Forest: React.FC = () => {
  const f = useShotFrame();
  // From a macro on the bomb, crane back and up to find the paper hanging in the pine.
  const p = ease(f, 0, 120);
  const camera: CameraShot = {
    position: lerp3([DANGLE[0] + 0.7, 0.75, 2.3], [2.7, 2.1, 11.0], p),
    target: lerp3([DANGLE[0], 0.7, DANGLE[2]], [0.2, 3.4, -0.4], p),
    fov: 42,
  };
  return <Stage set={<PineForestSet camera={camera} frame={f + 200} />} camera={camera} bg={BG_FOREST} />;
};

const SHOTS: Shot[] = [
  [0, 120, Launch, false],
  [120, 240, Forest, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("wind"), volume: 0.35, until: 120 },
  { at: 112, src: sfx("whoosh"), volume: 0.45 },
  { at: 120, src: sfx("wind"), volume: 0.2, until: 240 },
];
const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 120, volume: 0.35 },
  { src: MUSIC_FILES.mystery, from: 120, to: 240, volume: 0.4 },
];

export const BalloonPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={240} />
  </AbsoluteFill>
);
